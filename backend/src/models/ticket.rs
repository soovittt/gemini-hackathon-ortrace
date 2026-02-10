//! Feedback ticket domain model (evolved from recording)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Feedback type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum FeedbackType {
    Bug,
    Feedback,
    Idea,
}

impl std::fmt::Display for FeedbackType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FeedbackType::Bug => write!(f, "bug"),
            FeedbackType::Feedback => write!(f, "feedback"),
            FeedbackType::Idea => write!(f, "idea"),
        }
    }
}

/// Ticket status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
    Open,
    InProgress,
    InQa,
    Todo,
    Backlog,
    Resolved,
}

impl std::fmt::Display for TicketStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TicketStatus::Open => write!(f, "open"),
            TicketStatus::InProgress => write!(f, "in_progress"),
            TicketStatus::InQa => write!(f, "in_qa"),
            TicketStatus::Todo => write!(f, "todo"),
            TicketStatus::Backlog => write!(f, "backlog"),
            TicketStatus::Resolved => write!(f, "resolved"),
        }
    }
}

/// Ticket priority enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum TicketPriority {
    Urgent,
    High,
    Neutral,
    Low,
}

impl std::fmt::Display for TicketPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TicketPriority::Urgent => write!(f, "urgent"),
            TicketPriority::High => write!(f, "high"),
            TicketPriority::Neutral => write!(f, "neutral"),
            TicketPriority::Low => write!(f, "low"),
        }
    }
}

/// Recording/processing status (unchanged from before)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ProcessingStatus {
    Pending,
    Recording,
    Uploading,
    Processing,
    Analyzed,
    Failed,
}

impl std::fmt::Display for ProcessingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessingStatus::Pending => write!(f, "pending"),
            ProcessingStatus::Recording => write!(f, "recording"),
            ProcessingStatus::Uploading => write!(f, "uploading"),
            ProcessingStatus::Processing => write!(f, "processing"),
            ProcessingStatus::Analyzed => write!(f, "analyzed"),
            ProcessingStatus::Failed => write!(f, "failed"),
        }
    }
}

/// Feedback ticket database model (evolved from Recording)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FeedbackTicket {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub session_id: Option<Uuid>,
    pub customer_id: Uuid,
    pub analysis_job_id: Option<Uuid>,
    pub video_storage_path: Option<String>,
    pub video_size_bytes: Option<i64>,
    pub duration_seconds: Option<i32>,
    pub task_description: Option<String>,
    pub prior_experience: Option<String>,
    pub status: ProcessingStatus,
    pub session_status: TicketSessionStatus,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_reason: Option<ClosedReason>,
    pub external_ticket_url: Option<String>,
    pub external_ticket_id: Option<String>,
    pub recorded_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // New project-based fields
    pub feedback_type: FeedbackType,
    pub ticket_status: TicketStatus,
    pub priority: TicketPriority,
    pub category: Option<String>,
    pub submitter_email: Option<String>,
    pub submitter_name: Option<String>,
    pub page_url: Option<String>,
    pub browser_info: sqlx::types::Json<serde_json::Value>,
    pub screenshot_url: Option<String>,
    pub assignee_id: Option<Uuid>,
    pub due_date: Option<DateTime<Utc>>,
}

/// Legacy session_status field (open/closed for backward compat)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum TicketSessionStatus {
    Open,
    Closed,
}

/// Closed reason enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "kebab-case")]
#[serde(rename_all = "kebab-case")]
pub enum ClosedReason {
    Resolved,
    NotRelevant,
}

/// Ticket with joined project and submitter info (for list views)
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct TicketWithDetails {
    // Ticket fields
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub customer_id: Uuid,
    pub analysis_job_id: Option<Uuid>,
    pub video_storage_path: Option<String>,
    pub video_size_bytes: Option<i64>,
    pub duration_seconds: Option<i32>,
    pub task_description: Option<String>,
    pub status: ProcessingStatus,
    pub ticket_status: TicketStatus,
    pub feedback_type: FeedbackType,
    pub priority: TicketPriority,
    pub category: Option<String>,
    pub submitter_email: Option<String>,
    pub submitter_name: Option<String>,
    pub page_url: Option<String>,
    pub browser_info: sqlx::types::Json<serde_json::Value>,
    pub assignee_id: Option<Uuid>,
    pub due_date: Option<DateTime<Utc>>,
    pub recorded_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub session_status: TicketSessionStatus,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_reason: Option<ClosedReason>,
    pub external_ticket_url: Option<String>,
    pub external_ticket_id: Option<String>,
    pub ai_confidence: Option<i32>,
    // Joined fields
    pub project_name: Option<String>,
    pub customer_name: Option<String>,
    pub assignee_name: Option<String>,
    pub issues_count: i64,
}
