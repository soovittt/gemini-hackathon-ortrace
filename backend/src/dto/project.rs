//! Project DTOs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::{AnalysisQuestions, Project};

// ============================================================================
// Request DTOs
// ============================================================================

/// Create project request
#[derive(Debug, Deserialize, Validate)]
pub struct CreateProjectRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "Name must be between 1 and 255 characters"
    ))]
    pub name: String,
    #[validate(length(
        min = 1,
        max = 512,
        message = "Domain must be between 1 and 512 characters"
    ))]
    pub domain: String,
    /// Whether users must be authenticated in the customer's app before submitting feedback.
    /// When true, name/email are not collected by the widget (assumed from session).
    pub require_auth: Option<bool>,
    pub is_active: Option<bool>,
    pub analysis_questions: Option<AnalysisQuestions>,
}

/// Update project request
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProjectRequest {
    #[validate(length(
        min = 1,
        max = 255,
        message = "Name must be between 1 and 255 characters"
    ))]
    pub name: Option<String>,
    #[validate(length(max = 512, message = "Domain must be at most 512 characters"))]
    pub domain: Option<String>,
    pub is_active: Option<bool>,
    /// Whether users must be authenticated in the customer's app before submitting feedback.
    pub require_auth: Option<bool>,
    pub analysis_questions: Option<AnalysisQuestions>,
}

// ============================================================================
// Response DTOs
// ============================================================================

/// Project response (full details)
#[derive(Debug, Serialize)]
pub struct ProjectResponse {
    pub id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub is_active: bool,
    pub require_auth: bool,
    pub analysis_questions: AnalysisQuestions,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub ticket_count: i64,
}

impl ProjectResponse {
    pub fn from_project(project: Project, ticket_count: i64) -> Self {
        let require_auth = project.require_auth();
        let analysis_questions = project.analysis_questions();
        Self {
            id: project.id,
            name: project.name,
            domain: project.domain,
            is_active: project.is_active,
            require_auth,
            analysis_questions,
            created_at: project.created_at,
            updated_at: project.updated_at,
            ticket_count,
        }
    }
}

/// Project list item
#[derive(Debug, Serialize)]
pub struct ProjectListItem {
    pub id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub is_active: bool,
    pub require_auth: bool,
    pub analysis_questions: AnalysisQuestions,
    pub created_at: DateTime<Utc>,
    pub ticket_count: i64,
}
