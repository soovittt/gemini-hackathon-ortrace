//! Chat service - handles chat messages between team and customers

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::{ChatMessageResponse, SendMessageRequest};
use crate::error::{AppError, Result};
use crate::models::UserRole;

/// Database model for chat messages
#[derive(Debug, sqlx::FromRow)]
struct ChatMessageRow {
    id: Uuid,
    recording_id: Uuid,
    sender_id: Uuid,
    sender_role: Option<String>,
    message: String,
    created_at: DateTime<Utc>,
    edited_at: Option<DateTime<Utc>>,
    // Joined fields
    sender_name: Option<String>,
    sender_user_role: String,
}

/// Chat service
pub struct ChatService {
    db: PgPool,
}

impl ChatService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// Get all messages for a ticket (recording)
    pub async fn get_messages(
        &self,
        recording_id: Uuid,
        current_user_id: Uuid,
    ) -> Result<Vec<ChatMessageResponse>> {
        let rows = sqlx::query_as::<_, ChatMessageRow>(
            r#"
            SELECT 
                cm.id,
                cm.recording_id,
                cm.sender_id,
                cm.sender_role,
                cm.message,
                cm.created_at,
                cm.edited_at,
                u.name as sender_name,
                u.role as sender_user_role
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.recording_id = $1
            ORDER BY cm.created_at ASC
            "#,
        )
        .bind(recording_id)
        .fetch_all(&self.db)
        .await?;

        let messages = rows
            .into_iter()
            .map(|row| {
                let sender_type = if row.sender_role.as_deref() == Some("system") {
                    "system".to_string()
                } else if row.sender_user_role == "internal" {
                    "team".to_string()
                } else {
                    "user".to_string()
                };

                ChatMessageResponse {
                    id: row.id,
                    recording_id: row.recording_id,
                    sender_type,
                    sender_name: row.sender_name.unwrap_or_else(|| "Unknown".to_string()),
                    sender_role: row.sender_role,
                    message: row.message,
                    sent_at: row.created_at,
                    edited_at: row.edited_at,
                    is_own: row.sender_id == current_user_id,
                }
            })
            .collect();

        Ok(messages)
    }

    /// Send a new message
    pub async fn send_message(
        &self,
        recording_id: Uuid,
        sender_id: Uuid,
        sender_role: UserRole,
        req: SendMessageRequest,
    ) -> Result<ChatMessageResponse> {
        // Get sender name
        let sender_name: Option<String> =
            sqlx::query_scalar("SELECT name FROM users WHERE id = $1")
                .bind(sender_id)
                .fetch_optional(&self.db)
                .await?
                .flatten();

        let row = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            r#"
            INSERT INTO chat_messages (recording_id, sender_id, sender_role, message)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
            "#,
        )
        .bind(recording_id)
        .bind(sender_id)
        .bind::<Option<String>>(None)
        .bind(&req.message)
        .fetch_one(&self.db)
        .await?;

        let sender_type = if sender_role == UserRole::Internal {
            "team".to_string()
        } else {
            "user".to_string()
        };

        Ok(ChatMessageResponse {
            id: row.0,
            recording_id,
            sender_type,
            sender_name: sender_name.unwrap_or_else(|| "Unknown".to_string()),
            sender_role: None,
            message: req.message,
            sent_at: row.1,
            edited_at: None,
            is_own: true,
        })
    }

    /// Create a system message (from Ortrace)
    #[allow(dead_code)]
    pub async fn create_system_message(
        &self,
        db: &PgPool,
        recording_id: Uuid,
        system_user_id: Uuid,
        message: &str,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO chat_messages (recording_id, sender_id, sender_role, message)
            VALUES ($1, $2, 'system', $3)
            "#,
        )
        .bind(recording_id)
        .bind(system_user_id)
        .bind(message)
        .execute(db)
        .await?;

        Ok(())
    }

    /// Edit a message (only own messages)
    pub async fn edit_message(
        &self,
        message_id: Uuid,
        sender_id: Uuid,
        new_message: &str,
    ) -> Result<()> {
        let result = sqlx::query(
            r#"
            UPDATE chat_messages
            SET message = $1, edited_at = NOW()
            WHERE id = $2 AND sender_id = $3
            "#,
        )
        .bind(new_message)
        .bind(message_id)
        .bind(sender_id)
        .execute(&self.db)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::not_found("Message not found or not owned by you"));
        }

        Ok(())
    }

    /// Delete a message (only own messages)
    pub async fn delete_message(&self, message_id: Uuid, sender_id: Uuid) -> Result<()> {
        let result = sqlx::query("DELETE FROM chat_messages WHERE id = $1 AND sender_id = $2")
            .bind(message_id)
            .bind(sender_id)
            .execute(&self.db)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::not_found("Message not found or not owned by you"));
        }

        Ok(())
    }

    /// Check if user has access to a ticket's chat
    pub async fn verify_access(
        &self,
        recording_id: Uuid,
        user_id: Uuid,
        user_role: UserRole,
    ) -> Result<()> {
        if user_role == UserRole::Internal {
            // Internal users can access any ticket in projects they own
            let exists: bool = sqlx::query_scalar(
                r#"
                SELECT EXISTS(
                    SELECT 1 FROM recordings r
                    LEFT JOIN projects p ON r.project_id = p.id
                    LEFT JOIN sessions s ON r.session_id = s.id
                    WHERE r.id = $1 AND (p.owner_id = $2 OR s.owner_id = $2)
                )
                "#,
            )
            .bind(recording_id)
            .bind(user_id)
            .fetch_one(&self.db)
            .await?;

            if !exists {
                return Err(AppError::forbidden());
            }
        } else {
            // Customers can only access their own tickets
            let exists: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM recordings WHERE id = $1 AND customer_id = $2)",
            )
            .bind(recording_id)
            .bind(user_id)
            .fetch_one(&self.db)
            .await?;

            if !exists {
                return Err(AppError::forbidden());
            }
        }

        Ok(())
    }
}
