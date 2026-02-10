//! PostgreSQL-based job queue service

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{AnalysisJob, CreateJobRequest, JobStatus};

pub struct QueueService {
    pool: PgPool,
}

impl QueueService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new job and return its ID
    pub async fn enqueue(&self, request: CreateJobRequest) -> Result<Uuid> {
        let job_id = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO analysis_jobs (user_id, recording_id, status, video_storage_path, video_size_bytes, prompt)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            "#,
        )
        .bind(request.user_id)
        .bind(request.recording_id)
        .bind(JobStatus::Pending)
        .bind(&request.video_storage_path)
        .bind(request.video_size_bytes)
        .bind(&request.prompt)
        .fetch_one(&self.pool)
        .await
        .context("Failed to create job")?;

        Ok(job_id)
    }

    /// Dequeue the next pending job (for workers)
    pub async fn dequeue(&self) -> Result<Option<AnalysisJob>> {
        let job = sqlx::query_as::<_, AnalysisJob>(
            r#"
            UPDATE analysis_jobs
            SET status = $1, started_at = $2
            WHERE id = (
                SELECT id FROM analysis_jobs
                WHERE status = $3
                ORDER BY created_at ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
            "#,
        )
        .bind(JobStatus::Processing)
        .bind(Utc::now())
        .bind(JobStatus::Pending)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to dequeue job")?;

        Ok(job)
    }

    /// Get job by ID
    #[allow(dead_code)] // Useful for admin/debugging endpoints
    pub async fn get_job(&self, job_id: Uuid) -> Result<Option<AnalysisJob>> {
        let job = sqlx::query_as::<_, AnalysisJob>("SELECT * FROM analysis_jobs WHERE id = $1")
            .bind(job_id)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to get job")?;

        Ok(job)
    }

    /// Get job by recording ID
    #[allow(dead_code)] // Useful for admin/debugging endpoints
    pub async fn get_job_by_recording(&self, recording_id: Uuid) -> Result<Option<AnalysisJob>> {
        let job = sqlx::query_as::<_, AnalysisJob>(
            "SELECT * FROM analysis_jobs WHERE recording_id = $1 ORDER BY created_at DESC LIMIT 1",
        )
        .bind(recording_id)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to get job")?;

        Ok(job)
    }

    /// Mark job as completed with result
    pub async fn complete_job(&self, job_id: Uuid, result: String) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE analysis_jobs
            SET status = $1, analysis_result = $2, completed_at = $3
            WHERE id = $4
            "#,
        )
        .bind(JobStatus::Completed)
        .bind(&result)
        .bind(Utc::now())
        .bind(job_id)
        .execute(&self.pool)
        .await
        .context("Failed to complete job")?;

        Ok(())
    }

    /// Mark job as failed with error message
    pub async fn fail_job(&self, job_id: Uuid, error: String) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE analysis_jobs
            SET status = $1, error_message = $2, completed_at = $3, retry_count = retry_count + 1
            WHERE id = $4
            "#,
        )
        .bind(JobStatus::Failed)
        .bind(&error)
        .bind(Utc::now())
        .bind(job_id)
        .execute(&self.pool)
        .await
        .context("Failed to fail job")?;

        Ok(())
    }

    /// Reset a failed job back to pending for retry
    #[allow(dead_code)] // Useful for admin retry functionality
    pub async fn retry_job(&self, job_id: Uuid) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE analysis_jobs
            SET status = $1, error_message = NULL, started_at = NULL
            WHERE id = $2 AND status = $3
            "#,
        )
        .bind(JobStatus::Pending)
        .bind(job_id)
        .bind(JobStatus::Failed)
        .execute(&self.pool)
        .await
        .context("Failed to retry job")?;

        Ok(())
    }
}
