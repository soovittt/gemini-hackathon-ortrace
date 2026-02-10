//! Background worker for processing analysis jobs

use anyhow::{Context, Result};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

use crate::state::AppState;

pub struct Worker {
    state: Arc<AppState>,
    poll_interval: Duration,
}

impl Worker {
    pub fn new(state: Arc<AppState>) -> Self {
        Self {
            state,
            poll_interval: Duration::from_secs(5),
        }
    }

    /// Start the worker loop
    pub async fn start(&self) -> Result<()> {
        tracing::info!("Worker started, polling for jobs...");

        loop {
            match self.process_next_job().await {
                Ok(processed) => {
                    if !processed {
                        sleep(self.poll_interval).await;
                    }
                }
                Err(e) => {
                    tracing::error!("Error processing job: {}", e);
                    sleep(self.poll_interval).await;
                }
            }
        }
    }

    /// Process the next available job
    async fn process_next_job(&self) -> Result<bool> {
        let job = match self.state.queue.dequeue().await? {
            Some(job) => job,
            None => return Ok(false),
        };

        tracing::info!("Processing job {}: {}", job.id, job.video_storage_path);

        // Download video from storage
        let video_data = match self.state.storage.download(&job.video_storage_path).await {
            Ok(data) => data,
            Err(e) => {
                tracing::error!("Failed to download video: {}", e);
                self.state
                    .queue
                    .fail_job(job.id, format!("Download failed: {}", e))
                    .await?;
                if let Some(recording_id) = job.recording_id {
                    self.state.tickets.mark_failed(recording_id).await?;
                }
                return Ok(true);
            }
        };

        // Save to temp file for analysis
        let temp_path = self.save_temp_file(&video_data).await?;

        // Build prompt based on ticket/project configuration
        let prompt = if let Some(recording_id) = job.recording_id {
            self.build_prompt_for_ticket(recording_id)
                .await
                .unwrap_or_else(|_| self.default_prompt())
        } else {
            job.prompt.clone().unwrap_or_else(|| self.default_prompt())
        };

        // Analyze with Gemini
        let analysis_result = match self.state.gemini.analyze(&temp_path, &prompt).await {
            Ok(result) => {
                let _ = tokio::fs::remove_file(&temp_path).await;
                result
            }
            Err(e) => {
                let _ = tokio::fs::remove_file(&temp_path).await;
                tracing::error!("Analysis failed: {}", e);
                self.state
                    .queue
                    .fail_job(job.id, format!("Analysis failed: {}", e))
                    .await?;
                if let Some(recording_id) = job.recording_id {
                    self.state.tickets.mark_failed(recording_id).await?;
                }
                return Ok(true);
            }
        };

        // Save result
        self.state
            .queue
            .complete_job(job.id, analysis_result.clone())
            .await?;

        // Update ticket status and create report
        if let Some(recording_id) = job.recording_id {
            self.state.tickets.mark_analyzed(recording_id).await?;
            // Parse analysis and create report/issues
            if let Err(e) = self
                .create_report_from_analysis(recording_id, &analysis_result)
                .await
            {
                tracing::warn!("Failed to parse analysis into report: {}", e);
            }
        }

        tracing::info!("Job {} completed successfully", job.id);
        Ok(true)
    }

    async fn build_prompt_for_ticket(&self, ticket_id: uuid::Uuid) -> Result<String> {
        let ticket = self
            .state
            .tickets
            .get_by_id(ticket_id)
            .await?
            .context("Ticket not found")?;

        let type_label = match ticket.feedback_type {
            crate::models::FeedbackType::Bug => "Bug",
            crate::models::FeedbackType::Feedback => "Feedback",
            crate::models::FeedbackType::Idea => "Idea",
        };

        // Context for the model based on submission type
        let feedback_context = match ticket.feedback_type {
            crate::models::FeedbackType::Bug => {
                "Focus on identifying bugs, errors, and unexpected behavior in the recording."
            }
            crate::models::FeedbackType::Feedback => {
                "Analyze the user experience, usability issues, and areas for improvement."
            }
            crate::models::FeedbackType::Idea => {
                "Analyze the feature request or suggestion shown in the recording."
            }
        };

        let description = ticket
            .task_description
            .unwrap_or_else(|| "No description provided".to_string());

        // Pull project-specific questions for this feedback type and include in prompt
        let question_block = if let Some(project_id) = ticket.project_id {
            if let Some(project) = self.state.projects.get_by_id(project_id).await? {
                let questions = project
                    .analysis_questions()
                    .enabled_for_type(ticket.feedback_type);
                if !questions.is_empty() {
                    format!(
                        "\n\nAnswer these questions in your analysis (include each in question_analysis):\n{}",
                        questions
                            .into_iter()
                            .map(|q| format!("- {}", q))
                            .collect::<Vec<_>>()
                            .join("\n")
                    )
                } else {
                    String::new()
                }
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        Ok(format!(
            "Analyze this screen recording. This submission type is: {}.\n\n\
             {}\n\n\
             User's description: {}\n\
             {}\n\n\
             Provide your analysis as a single JSON object with this exact structure (so it can be shown as text summary + top issues):\n\
             - outcome: \"success\" | \"partial\" | \"failed\"\n\
             - confidence: number 0-100 (overall confidence in the analysis)\n\
             - overview: 2-4 sentence summary written for a human reader. Say what the user did, what worked or didn't, and the main takeaway. Use clear, concrete language (e.g. \"The user filled the form but hesitated at the submit button\" not \"Some friction was observed\"). This is shown as the main analysis text.\n\
             - metrics: {{ task_completion_rate, total_hesitation_time, retries_count, abandonment_point }}\n\
             - issues: array of top issues, each with: title (short, for display as a pill), severity (\"critical\"|\"high\"|\"medium\"|\"low\"), tags, observed_behavior, expected_behavior, evidence, impact, reproduction_steps, confidence\n\
             - question_analysis: array of {{ question, answer, observations, confidence, timestamp }} for each question listed above\n\
             - suggested_actions: array of strings (recommended next steps)\n\
             - possible_solutions: array of strings (concrete solutions to address the issues found; e.g. \"Add a loading spinner on submit\", \"Group related settings under a section\")",
            type_label,
            feedback_context,
            description,
            question_block
        ))
    }

    fn default_prompt(&self) -> String {
        "Analyze this video recording of a user session. Identify any usability issues, \
        points of confusion, and areas for improvement. Provide your analysis as a structured \
        JSON report with issues, metrics, and recommendations."
            .to_string()
    }

    async fn save_temp_file(&self, data: &[u8]) -> Result<std::path::PathBuf> {
        let temp_file = tempfile::NamedTempFile::new()?;
        let path = temp_file.path().to_path_buf();

        tokio::fs::write(&path, data).await?;
        std::mem::forget(temp_file);

        Ok(path)
    }

    /// Try to extract a JSON object from Gemini output (raw JSON, ```json block, or first {...}).
    fn extract_analysis_json(analysis: &str) -> Option<serde_json::Value> {
        let trimmed = analysis.trim();
        // 1) Raw JSON
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
            return Some(v);
        }
        // 2) Markdown code block ```json ... ``` (allow ``` or ```\n at end)
        for start_marker in ["```json", "```JSON"] {
            if let Some(start) = trimmed.find(start_marker) {
                let after_start = trimmed[start + start_marker.len()..].trim_start();
                let end = after_start
                    .find("\n```")
                    .or_else(|| after_start.find("```"));
                let json_str = if let Some(e) = end {
                    after_start[..e].trim()
                } else {
                    after_start.trim()
                };
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                    return Some(v);
                }
            }
        }
        // 3) First outermost { ... } (brace-matched)
        let open = trimmed.find('{')?;
        let rest = &trimmed[open..];
        let mut depth = 0i32;
        let mut in_string = false;
        let mut escape = false;
        let mut quote = '\0';
        let mut end_byte = 0usize;
        for (i, c) in rest.char_indices() {
            if escape {
                escape = false;
                continue;
            }
            if in_string {
                if c == quote {
                    in_string = false;
                } else if c == '\\' {
                    escape = true;
                }
                continue;
            }
            match c {
                '"' | '\'' => {
                    in_string = true;
                    quote = c;
                }
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        end_byte = i + c.len_utf8();
                        break;
                    }
                }
                _ => {}
            }
        }
        if depth == 0 && end_byte > 0 {
            let json_str = rest.get(..end_byte)?;
            serde_json::from_str::<serde_json::Value>(json_str).ok()
        } else {
            None
        }
    }

    async fn create_report_from_analysis(
        &self,
        recording_id: uuid::Uuid,
        analysis: &str,
    ) -> Result<()> {
        // Try to parse the analysis as JSON (raw, or from markdown code block, or extract first {...})
        let parsed: serde_json::Value = Self::extract_analysis_json(analysis).ok_or_else(|| {
            let snippet = analysis.chars().take(400).collect::<String>();
            tracing::warn!(
                "Gemini response was not valid JSON. First 400 chars: {}",
                snippet
            );
            anyhow::anyhow!("Could not parse analysis as JSON")
        })?;

        // Create report in database
        let report_id = sqlx::query_scalar::<_, uuid::Uuid>(
            r#"
            INSERT INTO reports (
                recording_id, outcome, confidence, overview,
                task_completion_rate, total_hesitation_time, retries_count, abandonment_point,
                question_analysis, suggested_actions, possible_solutions, raw_analysis
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
            "#,
        )
        .bind(recording_id)
        .bind(parsed.get("outcome").and_then(|v| v.as_str()))
        .bind(
            parsed
                .get("confidence")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
        )
        .bind(parsed.get("overview").and_then(|v| v.as_str()))
        .bind(
            parsed
                .get("metrics")
                .and_then(|m| m.get("task_completion_rate"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
        )
        .bind(
            parsed
                .get("metrics")
                .and_then(|m| m.get("total_hesitation_time"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
        )
        .bind(
            parsed
                .get("metrics")
                .and_then(|m| m.get("retries_count"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
        )
        .bind(
            parsed
                .get("metrics")
                .and_then(|m| m.get("abandonment_point"))
                .and_then(|v| v.as_str()),
        )
        .bind(sqlx::types::Json(
            parsed
                .get("question_analysis")
                .cloned()
                .unwrap_or(serde_json::Value::Array(vec![])),
        ))
        .bind(sqlx::types::Json(
            parsed
                .get("suggested_actions")
                .cloned()
                .unwrap_or(serde_json::Value::Array(vec![])),
        ))
        .bind(sqlx::types::Json(
            parsed
                .get("possible_solutions")
                .cloned()
                .unwrap_or(serde_json::Value::Array(vec![])),
        ))
        .bind(analysis)
        .fetch_one(&self.state.db)
        .await?;

        // Create issues
        if let Some(issues) = parsed.get("issues").and_then(|v| v.as_array()) {
            for issue in issues {
                sqlx::query(
                    r#"
                    INSERT INTO issues (
                        report_id, title, severity, tags,
                        observed_behavior, expected_behavior,
                        evidence, screenshots, impact, reproduction_steps, confidence
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    "#,
                )
                .bind(report_id)
                .bind(
                    issue
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown Issue"),
                )
                .bind(
                    issue
                        .get("severity")
                        .and_then(|v| v.as_str())
                        .unwrap_or("medium"),
                )
                .bind(sqlx::types::Json(
                    issue
                        .get("tags")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(vec![])),
                ))
                .bind(issue.get("observed_behavior").and_then(|v| v.as_str()))
                .bind(issue.get("expected_behavior").and_then(|v| v.as_str()))
                .bind(sqlx::types::Json(
                    issue
                        .get("evidence")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(vec![])),
                ))
                .bind(sqlx::types::Json(
                    issue
                        .get("screenshots")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(vec![])),
                ))
                .bind(sqlx::types::Json(
                    issue
                        .get("impact")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(vec![])),
                ))
                .bind(sqlx::types::Json(
                    issue
                        .get("reproduction_steps")
                        .cloned()
                        .unwrap_or(serde_json::Value::Array(vec![])),
                ))
                .bind(
                    issue
                        .get("confidence")
                        .and_then(|v| v.as_i64())
                        .map(|v| v as i32),
                )
                .execute(&self.state.db)
                .await?;
            }
        }

        Ok(())
    }
}
