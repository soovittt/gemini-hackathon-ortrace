//! Widget DTOs - public API for end-user widget submissions

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::FeedbackType;

// ============================================================================
// Request DTOs
// ============================================================================

/// Widget config query parameters
#[derive(Debug, Deserialize)]
pub struct WidgetConfigQuery {
    pub domain: String,
}

/// Widget feedback submission request
#[derive(Debug, Deserialize, Validate)]
pub struct WidgetSubmitRequest {
    pub feedback_type: FeedbackType,
    #[validate(length(
        min = 1,
        max = 5000,
        message = "Description must be between 1 and 5000 characters"
    ))]
    pub description: String,
    pub submitter_email: Option<String>,
    pub submitter_name: Option<String>,
    pub page_url: Option<String>,
    pub browser_info: Option<serde_json::Value>,
}

// ============================================================================
// Response DTOs
// ============================================================================

/// Widget submit response
#[derive(Debug, Serialize)]
pub struct WidgetSubmitResponse {
    pub ticket_id: Uuid,
    pub message: String,
}

/// Widget config response (returned to widget on init)
#[derive(Debug, Serialize)]
pub struct WidgetConfigResponse {
    pub project_id: Uuid,
    pub project_name: String,
    pub domain: Option<String>,
    /// Whether users must be authenticated before submitting.
    /// When true, the widget should not ask for name/email.
    pub require_auth: bool,
}
