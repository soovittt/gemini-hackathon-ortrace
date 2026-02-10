//! Ticket DTOs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{
    Evidence, FeedbackType, IssueSeverity, ProcessingStatus, QuestionAnalysis, ReportOutcome,
    TicketPriority, TicketStatus, TicketWithDetails,
};

// ============================================================================
// Request DTOs
// ============================================================================

/// Ticket list query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct TicketListQueryParams {
    /// When set, only tickets belonging to this project are returned.
    pub project_id: Option<Uuid>,
    pub feedback_type: Option<FeedbackType>,
    pub ticket_status: Option<TicketStatus>,
    pub priority: Option<TicketPriority>,
    pub search: Option<String>,
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    20
}

/// Update ticket request (status, priority, assignee)
#[derive(Debug, Deserialize)]
pub struct UpdateTicketRequest {
    pub ticket_status: Option<TicketStatus>,
    pub priority: Option<TicketPriority>,
    pub assignee_id: Option<Uuid>,
    #[allow(dead_code)]
    pub category: Option<String>,
}

// ============================================================================
// Response DTOs
// ============================================================================

/// Ticket list item
#[derive(Debug, Serialize)]
pub struct TicketListItem {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub feedback_type: FeedbackType,
    pub ticket_status: TicketStatus,
    pub priority: TicketPriority,
    pub task_description: Option<String>,
    pub submitter_name: Option<String>,
    pub submitter_email: Option<String>,
    pub customer_name: Option<String>,
    pub assignee_name: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub category: Option<String>,
    pub page_url: Option<String>,
    pub status: ProcessingStatus,
    pub duration_seconds: Option<i32>,
    pub issues_count: i64,
    pub ai_confidence: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl TicketListItem {
    pub fn from_details(t: TicketWithDetails) -> Self {
        Self {
            id: t.id,
            project_id: t.project_id,
            project_name: t.project_name,
            feedback_type: t.feedback_type,
            ticket_status: t.ticket_status,
            priority: t.priority,
            task_description: t.task_description,
            submitter_name: t.submitter_name,
            submitter_email: t.submitter_email,
            customer_name: t.customer_name,
            assignee_name: t.assignee_name,
            assignee_id: t.assignee_id,
            category: t.category,
            page_url: t.page_url,
            status: t.status,
            duration_seconds: t.duration_seconds,
            issues_count: t.issues_count,
            ai_confidence: t.ai_confidence,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}

/// Ticket detail response
#[derive(Debug, Serialize)]
pub struct TicketDetailResponse {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub feedback_type: FeedbackType,
    pub ticket_status: TicketStatus,
    pub priority: TicketPriority,
    pub task_description: Option<String>,
    pub submitter_name: Option<String>,
    pub submitter_email: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub assignee_name: Option<String>,
    pub category: Option<String>,
    pub page_url: Option<String>,
    pub browser_info: serde_json::Value,
    pub video_url: Option<String>,
    pub duration_seconds: Option<i32>,
    pub status: ProcessingStatus,
    pub ai_confidence: Option<i32>,
    pub due_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Full report response (for ticket detail)
#[derive(Debug, Serialize)]
pub struct ReportResponse {
    pub id: Uuid,
    pub recording_id: Uuid,
    pub executive_summary: ExecutiveSummary,
    pub metrics: ReportMetrics,
    pub issues: Vec<IssueResponse>,
    pub question_analysis: Vec<QuestionAnalysis>,
    pub suggested_actions: Vec<String>,
    /// Possible solutions to address the issues (from AI analysis).
    pub possible_solutions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ExecutiveSummary {
    pub outcome: ReportOutcome,
    pub confidence: i32,
    pub overview: String,
}

#[derive(Debug, Serialize)]
pub struct ReportMetrics {
    pub task_completion_rate: i32,
    pub total_hesitation_time: i32,
    pub retries_count: i32,
    pub abandonment_point: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct IssueResponse {
    pub id: Uuid,
    pub title: String,
    pub severity: IssueSeverity,
    pub tags: Vec<String>,
    pub observed_behavior: Option<String>,
    pub expected_behavior: Option<String>,
    pub evidence: Vec<Evidence>,
    pub screenshots: Vec<String>,
    pub impact: Vec<String>,
    pub reproduction_steps: Vec<String>,
    pub confidence: Option<i32>,
    pub external_ticket_url: Option<String>,
}
