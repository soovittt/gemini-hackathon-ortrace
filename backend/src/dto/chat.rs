//! Chat message DTOs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ============================================================================
// Request DTOs
// ============================================================================

/// Send a chat message
#[derive(Debug, Deserialize, Validate)]
pub struct SendMessageRequest {
    #[validate(length(
        min = 1,
        max = 5000,
        message = "Message must be between 1 and 5000 characters"
    ))]
    pub message: String,
}

/// Edit a chat message
#[derive(Debug, Deserialize, Validate)]
pub struct EditMessageRequest {
    #[validate(length(
        min = 1,
        max = 5000,
        message = "Message must be between 1 and 5000 characters"
    ))]
    pub message: String,
}

// ============================================================================
// Response DTOs
// ============================================================================

/// Chat message response
#[derive(Debug, Serialize, Clone)]
pub struct ChatMessageResponse {
    pub id: Uuid,
    pub recording_id: Uuid,
    pub sender_type: String, // "system", "team", "user"
    pub sender_name: String,
    pub sender_role: Option<String>,
    pub message: String,
    pub sent_at: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub is_own: bool, // Whether this message was sent by the current user
}
