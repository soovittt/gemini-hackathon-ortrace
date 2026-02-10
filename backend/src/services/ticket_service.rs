//! Ticket service - handles feedback ticket lifecycle and video uploads
//! Evolved from recording_service.rs to support project-based widget submissions

use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::{
    CreateJobRequest, FeedbackTicket, FeedbackType, TicketPriority, TicketStatus, TicketWithDetails,
};
use crate::services::{QueueService, StorageService};

/// Ticket service for managing feedback tickets
pub struct TicketService {
    db: PgPool,
    storage: Arc<StorageService>,
    queue: Arc<QueueService>,
}

/// Query parameters for listing tickets
#[derive(Debug, Clone)]
pub struct TicketListQuery {
    pub project_id: Option<Uuid>,
    pub feedback_type: Option<FeedbackType>,
    pub ticket_status: Option<TicketStatus>,
    pub priority: Option<TicketPriority>,
    pub search: Option<String>,
    pub page: i32,
    pub per_page: i32,
}

impl TicketService {
    pub fn new(db: PgPool, storage: Arc<StorageService>, queue: Arc<QueueService>) -> Self {
        Self { db, storage, queue }
    }

    /// Create a new ticket from widget submission
    #[allow(clippy::too_many_arguments)]
    pub async fn create_from_widget(
        &self,
        project_id: Uuid,
        customer_id: Uuid,
        feedback_type: FeedbackType,
        task_description: Option<&str>,
        submitter_email: Option<&str>,
        submitter_name: Option<&str>,
        page_url: Option<&str>,
        browser_info: Option<serde_json::Value>,
    ) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            INSERT INTO recordings (
                project_id, customer_id, feedback_type, task_description,
                submitter_email, submitter_name, page_url, browser_info,
                status, session_status, ticket_status, priority
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'recording', 'open', 'open', 'neutral')
            RETURNING *
            "#,
        )
        .bind(project_id)
        .bind(customer_id)
        .bind(feedback_type)
        .bind(task_description)
        .bind(submitter_email)
        .bind(submitter_name)
        .bind(page_url)
        .bind(sqlx::types::Json(
            browser_info.unwrap_or(serde_json::json!({})),
        ))
        .fetch_one(&self.db)
        .await?;

        Ok(ticket)
    }

    /// Upload video for a ticket
    pub async fn upload_video(
        &self,
        ticket_id: Uuid,
        customer_id: Uuid,
        video_data: Vec<u8>,
        duration_seconds: i32,
    ) -> Result<FeedbackTicket> {
        // Verify ownership
        let ticket = self.get_owned(ticket_id, customer_id).await?;
        let project_id = ticket
            .project_id
            .unwrap_or(ticket.session_id.unwrap_or(Uuid::nil()));

        // Upload to storage
        let storage_path = format!("recordings/{}/{}.webm", project_id, ticket_id);
        self.storage
            .upload(&storage_path, &video_data)
            .await
            .map_err(|e| AppError::internal(format!("Failed to upload video: {}", e)))?;

        let video_size = video_data.len() as i64;

        // Update ticket status
        sqlx::query(
            r#"
            UPDATE recordings SET
                video_storage_path = $1,
                video_size_bytes = $2,
                duration_seconds = $3,
                status = 'uploading',
                recorded_at = $4
            WHERE id = $5
            "#,
        )
        .bind(&storage_path)
        .bind(video_size)
        .bind(duration_seconds)
        .bind(Utc::now())
        .bind(ticket_id)
        .execute(&self.db)
        .await?;

        // Create analysis job
        let job_request = CreateJobRequest {
            video_storage_path: storage_path,
            video_size_bytes: video_size,
            prompt: None,
            user_id: Some(customer_id),
            recording_id: Some(ticket_id),
        };

        let job_id = self
            .queue
            .enqueue(job_request)
            .await
            .map_err(|e| AppError::internal(format!("Failed to create analysis job: {}", e)))?;

        // Link job and update status
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings SET
                analysis_job_id = $1,
                status = 'processing'
            WHERE id = $2
            RETURNING *
            "#,
        )
        .bind(job_id)
        .bind(ticket_id)
        .fetch_one(&self.db)
        .await?;

        Ok(ticket)
    }

    /// Get ticket by ID
    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<FeedbackTicket>> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>("SELECT * FROM recordings WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;
        Ok(ticket)
    }

    /// Get ticket owned by customer
    pub async fn get_owned(&self, id: Uuid, customer_id: Uuid) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            "SELECT * FROM recordings WHERE id = $1 AND customer_id = $2",
        )
        .bind(id)
        .bind(customer_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;
        Ok(ticket)
    }

    /// List tickets for internal user. When query.project_id is set, only tickets for that project are returned.
    pub async fn list_for_owner(
        &self,
        owner_id: Uuid,
        query: TicketListQuery,
    ) -> Result<(Vec<TicketWithDetails>, i64)> {
        let offset = ((query.page - 1) * query.per_page) as i64;
        let limit = query.per_page as i64;

        let tickets = sqlx::query_as::<_, TicketWithDetails>(
            r#"
            SELECT r.*,
                   p.name as project_name,
                   u.name as customer_name,
                   a.name as assignee_name,
                   rp.confidence as ai_confidence,
                   (SELECT COUNT(*) FROM issues i JOIN reports rp2 ON i.report_id = rp2.id WHERE rp2.recording_id = r.id) as issues_count
            FROM recordings r
            LEFT JOIN projects p ON r.project_id = p.id
            LEFT JOIN users u ON r.customer_id = u.id
            LEFT JOIN users a ON r.assignee_id = a.id
            LEFT JOIN reports rp ON rp.recording_id = r.id
            WHERE (p.owner_id = $1 OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $1))
            AND ($2::uuid IS NULL OR r.project_id = $2)
            AND ($3::varchar IS NULL OR r.feedback_type = $3)
            AND ($4::varchar IS NULL OR r.ticket_status = $4)
            AND ($5::varchar IS NULL OR r.priority = $5)
            AND ($6::varchar IS NULL OR r.task_description ILIKE '%' || $6 || '%')
            ORDER BY r.created_at DESC
            LIMIT $7 OFFSET $8
            "#,
        )
        .bind(owner_id)
        .bind(query.project_id)
        .bind(query.feedback_type.map(|f| f.to_string()))
        .bind(query.ticket_status.map(|s| s.to_string()))
        .bind(query.priority.map(|p| p.to_string()))
        .bind(&query.search)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.db)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM recordings r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE (p.owner_id = $1 OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $1))
            AND ($2::uuid IS NULL OR r.project_id = $2)
            AND ($3::varchar IS NULL OR r.feedback_type = $3)
            AND ($4::varchar IS NULL OR r.ticket_status = $4)
            AND ($5::varchar IS NULL OR r.priority = $5)
            AND ($6::varchar IS NULL OR r.task_description ILIKE '%' || $6 || '%')
            "#,
        )
        .bind(owner_id)
        .bind(query.project_id)
        .bind(query.feedback_type.map(|f| f.to_string()))
        .bind(query.ticket_status.map(|s| s.to_string()))
        .bind(query.priority.map(|p| p.to_string()))
        .bind(&query.search)
        .fetch_one(&self.db)
        .await?;

        Ok((tickets, total))
    }

    /// Update ticket status
    pub async fn update_status(
        &self,
        id: Uuid,
        owner_id: Uuid,
        ticket_status: TicketStatus,
    ) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings r SET
                ticket_status = $1,
                updated_at = NOW()
            WHERE r.id = $2 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $3)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $3)
            )
            RETURNING r.*
            "#,
        )
        .bind(ticket_status)
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        Ok(ticket)
    }

    /// Update ticket priority
    pub async fn update_priority(
        &self,
        id: Uuid,
        owner_id: Uuid,
        priority: TicketPriority,
    ) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings r SET
                priority = $1,
                updated_at = NOW()
            WHERE r.id = $2 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $3)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $3)
            )
            RETURNING r.*
            "#,
        )
        .bind(priority)
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        Ok(ticket)
    }

    /// Update ticket assignee
    pub async fn update_assignee(
        &self,
        id: Uuid,
        owner_id: Uuid,
        assignee_id: Option<Uuid>,
    ) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings r SET
                assignee_id = $1,
                updated_at = NOW()
            WHERE r.id = $2 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $3)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $3)
            )
            RETURNING r.*
            "#,
        )
        .bind(assignee_id)
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        Ok(ticket)
    }

    /// Close a ticket (resolve)
    pub async fn close(&self, id: Uuid, owner_id: Uuid) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings r SET
                session_status = 'closed',
                ticket_status = 'resolved',
                closed_at = $1,
                closed_reason = 'resolved'
            WHERE r.id = $2 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $3)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $3)
            )
            RETURNING r.*
            "#,
        )
        .bind(Utc::now())
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        Ok(ticket)
    }

    /// Reopen a ticket
    pub async fn reopen(&self, id: Uuid, owner_id: Uuid) -> Result<FeedbackTicket> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            UPDATE recordings r SET
                session_status = 'open',
                ticket_status = 'open',
                closed_at = NULL,
                closed_reason = NULL
            WHERE r.id = $1 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $2)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $2)
            )
            RETURNING r.*
            "#,
        )
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        Ok(ticket)
    }

    /// Delete a ticket
    pub async fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<()> {
        let ticket = sqlx::query_as::<_, FeedbackTicket>(
            r#"
            SELECT r.* FROM recordings r
            WHERE r.id = $1 AND (
                r.project_id IN (SELECT id FROM projects WHERE owner_id = $2)
                OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $2)
            )
            "#,
        )
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

        // Delete from storage if video exists
        if let Some(path) = &ticket.video_storage_path {
            let _ = self.storage.delete(path).await;
        }

        // Delete from database
        sqlx::query("DELETE FROM recordings WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(())
    }

    /// Mark ticket as analyzed (called by worker)
    pub async fn mark_analyzed(&self, ticket_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE recordings SET status = 'analyzed' WHERE id = $1")
            .bind(ticket_id)
            .execute(&self.db)
            .await?;
        Ok(())
    }

    /// Mark ticket as failed (called by worker)
    pub async fn mark_failed(&self, ticket_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE recordings SET status = 'failed' WHERE id = $1")
            .bind(ticket_id)
            .execute(&self.db)
            .await?;
        Ok(())
    }

    /// Generate video URL for a ticket
    pub async fn get_video_url(&self, ticket: &FeedbackTicket) -> Result<Option<String>> {
        if ticket.video_storage_path.is_some() {
            Ok(Some(format!("/api/v1/tickets/{}/video", ticket.id)))
        } else {
            Ok(None)
        }
    }

    /// Get overview stats for a project owner
    pub async fn get_overview_stats(&self, owner_id: Uuid) -> Result<OverviewStats> {
        let row = sqlx::query_as::<_, OverviewStatsRow>(
            r#"
            SELECT
                COUNT(*) FILTER (WHERE r.feedback_type = 'feedback') as feedback_count,
                COUNT(*) FILTER (WHERE r.feedback_type = 'bug') as bug_count,
                COUNT(*) FILTER (WHERE r.feedback_type = 'idea') as idea_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'open') as open_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'in_qa') as in_qa_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'todo') as todo_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'backlog') as backlog_count,
                COUNT(*) FILTER (WHERE r.ticket_status = 'resolved') as resolved_count,
                COUNT(*) as total_count
            FROM recordings r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE p.owner_id = $1 OR r.session_id IN (SELECT id FROM sessions WHERE owner_id = $1)
            "#,
        )
        .bind(owner_id)
        .fetch_one(&self.db)
        .await?;

        let total = row.total_count.max(1) as f64;
        Ok(OverviewStats {
            feedback_count: row.feedback_count,
            bug_count: row.bug_count,
            idea_count: row.idea_count,
            open_count: row.open_count,
            open_pct: (row.open_count as f64 / total * 100.0).round() as i64,
            in_progress_count: row.in_progress_count,
            in_progress_pct: (row.in_progress_count as f64 / total * 100.0).round() as i64,
            in_qa_count: row.in_qa_count,
            in_qa_pct: (row.in_qa_count as f64 / total * 100.0).round() as i64,
            todo_count: row.todo_count,
            todo_pct: (row.todo_count as f64 / total * 100.0).round() as i64,
            backlog_count: row.backlog_count,
            backlog_pct: (row.backlog_count as f64 / total * 100.0).round() as i64,
            resolved_count: row.resolved_count,
            resolved_pct: (row.resolved_count as f64 / total * 100.0).round() as i64,
            total_count: row.total_count,
        })
    }
}

#[derive(Debug, sqlx::FromRow)]
struct OverviewStatsRow {
    feedback_count: i64,
    bug_count: i64,
    idea_count: i64,
    open_count: i64,
    in_progress_count: i64,
    in_qa_count: i64,
    todo_count: i64,
    backlog_count: i64,
    resolved_count: i64,
    total_count: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct OverviewStats {
    pub feedback_count: i64,
    pub bug_count: i64,
    pub idea_count: i64,
    pub open_count: i64,
    pub open_pct: i64,
    pub in_progress_count: i64,
    pub in_progress_pct: i64,
    pub in_qa_count: i64,
    pub in_qa_pct: i64,
    pub todo_count: i64,
    pub todo_pct: i64,
    pub backlog_count: i64,
    pub backlog_pct: i64,
    pub resolved_count: i64,
    pub resolved_pct: i64,
    pub total_count: i64,
}
