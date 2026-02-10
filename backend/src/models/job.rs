//! Analysis job model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Job status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JobStatus::Pending => write!(f, "pending"),
            JobStatus::Processing => write!(f, "processing"),
            JobStatus::Completed => write!(f, "completed"),
            JobStatus::Failed => write!(f, "failed"),
        }
    }
}

/// Analysis job database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisJob {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub recording_id: Option<Uuid>,
    pub status: JobStatus,
    pub video_storage_path: String,
    pub video_size_bytes: i64,
    pub prompt: Option<String>,
    pub analysis_result: Option<String>,
    pub error_message: Option<String>,
    pub retry_count: i32,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create a new job
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateJobRequest {
    pub video_storage_path: String,
    pub video_size_bytes: i64,
    pub prompt: Option<String>,
    pub user_id: Option<Uuid>,
    pub recording_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn job_status_display() {
        assert_eq!(JobStatus::Pending.to_string(), "pending");
        assert_eq!(JobStatus::Processing.to_string(), "processing");
        assert_eq!(JobStatus::Completed.to_string(), "completed");
        assert_eq!(JobStatus::Failed.to_string(), "failed");
    }

    #[test]
    fn job_status_serialization() {
        assert_eq!(
            serde_json::to_string(&JobStatus::Pending).unwrap(),
            "\"pending\""
        );
        assert_eq!(
            serde_json::to_string(&JobStatus::Processing).unwrap(),
            "\"processing\""
        );
        assert_eq!(
            serde_json::to_string(&JobStatus::Completed).unwrap(),
            "\"completed\""
        );
        assert_eq!(
            serde_json::to_string(&JobStatus::Failed).unwrap(),
            "\"failed\""
        );
    }

    #[test]
    fn job_status_deserialization() {
        assert_eq!(
            serde_json::from_str::<JobStatus>("\"pending\"").unwrap(),
            JobStatus::Pending
        );
        assert_eq!(
            serde_json::from_str::<JobStatus>("\"failed\"").unwrap(),
            JobStatus::Failed
        );
    }

    #[test]
    fn create_job_request_serialization_roundtrip() {
        let user_id = Uuid::new_v4();
        let recording_id = Uuid::new_v4();
        let req = CreateJobRequest {
            video_storage_path: "recordings/session1/vid.webm".to_string(),
            video_size_bytes: 1024000,
            prompt: Some("Analyze this video".to_string()),
            user_id: Some(user_id),
            recording_id: Some(recording_id),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: CreateJobRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(
            deserialized.video_storage_path,
            "recordings/session1/vid.webm"
        );
        assert_eq!(deserialized.video_size_bytes, 1024000);
        assert_eq!(deserialized.prompt, Some("Analyze this video".to_string()));
        assert_eq!(deserialized.user_id, Some(user_id));
        assert_eq!(deserialized.recording_id, Some(recording_id));
    }

    #[test]
    fn create_job_request_with_none_fields() {
        let req = CreateJobRequest {
            video_storage_path: "test.webm".to_string(),
            video_size_bytes: 500,
            prompt: None,
            user_id: None,
            recording_id: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: CreateJobRequest = serde_json::from_str(&json).unwrap();
        assert!(deserialized.prompt.is_none());
        assert!(deserialized.user_id.is_none());
        assert!(deserialized.recording_id.is_none());
    }
}
