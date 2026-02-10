//! Project service - handles project CRUD

use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::{AnalysisQuestions, Project};

/// Project service for managing projects
pub struct ProjectService {
    db: PgPool,
}

impl ProjectService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// Create a new project
    pub async fn create(
        &self,
        owner_id: Uuid,
        name: &str,
        domain: &str,
        require_auth: bool,
        is_active: bool,
        analysis_questions: Option<AnalysisQuestions>,
    ) -> Result<Project> {
        let questions = analysis_questions.unwrap_or_default();
        let settings = serde_json::json!({
            "require_auth": require_auth,
            "analysis_questions": questions,
        });
        let normalized_domain = Self::normalize_domain(domain);

        let project = sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO projects (owner_id, name, domain, settings, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(owner_id)
        .bind(name)
        .bind(&normalized_domain)
        .bind(&settings)
        .bind(is_active)
        .fetch_one(&self.db)
        .await?;

        Ok(project)
    }

    /// Get a project by ID
    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Project>> {
        let project = sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;
        Ok(project)
    }

    /// Get an active project by ID (for widget access)
    pub async fn get_active(&self, id: Uuid) -> Result<Option<Project>> {
        let project = sqlx::query_as::<_, Project>(
            "SELECT * FROM projects WHERE id = $1 AND is_active = TRUE",
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await?;
        Ok(project)
    }

    /// Get an active project by domain (for widget auto-detection).
    /// Matches by exact domain or by host part (so localhost:8080/dummy matches project domain localhost:8080 or localhost:8080/dummy).
    pub async fn get_by_domain(&self, domain: &str) -> Result<Option<Project>> {
        let normalized = Self::normalize_domain(domain);
        let request_host = normalized.split('/').next().unwrap_or(&normalized);
        let project = sqlx::query_as::<_, Project>(
            r#"
            SELECT * FROM projects
            WHERE is_active = TRUE
              AND (
                domain = $1
                OR split_part(regexp_replace(regexp_replace(LOWER(TRIM(domain)), '^https?://', ''), '^www\\.', ''), '/', 1) = $2
              )
            ORDER BY CASE WHEN domain = $1 THEN 0 ELSE 1 END
            LIMIT 1
            "#,
        )
        .bind(&normalized)
        .bind(request_host)
        .fetch_optional(&self.db)
        .await?;

        Ok(project)
    }

    /// Get project by ID, verifying ownership
    pub async fn get_owned(&self, id: Uuid, owner_id: Uuid) -> Result<Project> {
        let project =
            sqlx::query_as::<_, Project>("SELECT * FROM projects WHERE id = $1 AND owner_id = $2")
                .bind(id)
                .bind(owner_id)
                .fetch_optional(&self.db)
                .await?
                .ok_or_else(|| AppError::not_found("Project not found"))?;
        Ok(project)
    }

    /// List projects for an owner
    pub async fn list(&self, owner_id: Uuid) -> Result<Vec<Project>> {
        let projects = sqlx::query_as::<_, Project>(
            "SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC",
        )
        .bind(owner_id)
        .fetch_all(&self.db)
        .await?;
        Ok(projects)
    }

    /// Update a project
    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        &self,
        id: Uuid,
        owner_id: Uuid,
        name: Option<&str>,
        domain: Option<&str>,
        is_active: Option<bool>,
        require_auth: Option<bool>,
        analysis_questions: Option<AnalysisQuestions>,
    ) -> Result<Project> {
        tracing::info!(%id, "project update: verifying ownership");
        // Verify ownership
        let existing = self.get_owned(id, owner_id).await?;

        let normalized_domain = domain.map(Self::normalize_domain);

        let settings = if require_auth.is_some() || analysis_questions.is_some() {
            let mut s = existing.settings.0.clone();
            if let Some(require_auth) = require_auth {
                s["require_auth"] = serde_json::Value::Bool(require_auth);
                tracing::debug!(%id, require_auth, "project update: set require_auth in settings");
            }
            if let Some(ref aq) = analysis_questions {
                match serde_json::to_value(aq) {
                    Ok(value) => {
                        s["analysis_questions"] = value;
                        tracing::info!(%id, "project update: merged analysis_questions into settings");
                    }
                    Err(e) => {
                        tracing::error!(%id, error = %e, "project update: failed to serialize analysis_questions, skipping");
                    }
                }
            } else {
                tracing::debug!(%id, "project update: no analysis_questions in request");
            }
            Some(s)
        } else {
            tracing::info!(%id, "project update: no require_auth or analysis_questions, keeping existing settings");
            None
        };

        let project = sqlx::query_as::<_, Project>(
            r#"
            UPDATE projects SET
                name = COALESCE($1, name),
                domain = COALESCE($2, domain),
                is_active = COALESCE($3, is_active),
                settings = COALESCE($4, settings),
                updated_at = NOW()
            WHERE id = $5 AND owner_id = $6
            RETURNING *
            "#,
        )
        .bind(name)
        .bind(normalized_domain.as_deref())
        .bind(is_active)
        .bind(settings)
        .bind(id)
        .bind(owner_id)
        .fetch_one(&self.db)
        .await?;

        Ok(project)
    }

    /// Delete a project
    pub async fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<()> {
        let result = sqlx::query("DELETE FROM projects WHERE id = $1 AND owner_id = $2")
            .bind(id)
            .bind(owner_id)
            .execute(&self.db)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::not_found("Project not found"));
        }

        Ok(())
    }

    /// Count tickets for a project
    pub async fn count_tickets(&self, project_id: Uuid) -> Result<i64> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM recordings WHERE project_id = $1")
                .bind(project_id)
                .fetch_one(&self.db)
                .await?;
        Ok(count)
    }

    fn normalize_domain(input: &str) -> String {
        let mut d = input.trim().to_lowercase();
        if let Some(rest) = d.strip_prefix("https://") {
            d = rest.to_string();
        } else if let Some(rest) = d.strip_prefix("http://") {
            d = rest.to_string();
        }
        if let Some(rest) = d.strip_prefix("www.") {
            d = rest.to_string();
        }
        // Keep path (e.g. localhost:8080/dummy) so project settings domain saves correctly
        d.trim_end_matches('.').to_string()
    }
}
