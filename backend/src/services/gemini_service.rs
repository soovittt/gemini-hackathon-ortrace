//! Google Gemini AI service for video analysis

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::config::Config;

// ============================================================================
// API Types
// ============================================================================

#[derive(Serialize)]
struct Request {
    contents: Vec<Content>,
    generation_config: GenerationConfig,
}

#[derive(Serialize, Deserialize)]
struct Content {
    #[serde(skip_serializing_if = "Option::is_none")]
    role: Option<String>,
    parts: Vec<Part>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Part {
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    inline_data: Option<InlineData>,
}

#[derive(Serialize, Deserialize)]
struct InlineData {
    mime_type: String,
    data: String,
}

#[derive(Serialize)]
struct GenerationConfig {
    temperature: f32,
    top_p: f32,
    top_k: i32,
    max_output_tokens: i32,
}

#[derive(Deserialize)]
struct Response {
    candidates: Vec<Candidate>,
}

#[derive(Deserialize)]
struct Candidate {
    content: Content,
}

// ============================================================================
// Service
// ============================================================================

const MODEL: &str = "gemini-2.0-flash-lite";
const MAX_SIZE_MB: f64 = 20.0;

/// Gemini AI service for video analysis
#[derive(Clone)]
pub struct GeminiService {
    api_key: String,
}

impl GeminiService {
    /// Create new service instance
    pub async fn new(config: &Config) -> Result<Self> {
        Ok(Self {
            api_key: config.gemini_api_key.clone(),
        })
    }

    /// Analyze a video file with custom prompt
    pub async fn analyze(&self, path: &Path, prompt: &str) -> Result<String> {
        // Read and validate file
        let bytes =
            fs::read(path).with_context(|| format!("Failed to read: {}", path.display()))?;

        let size_mb = bytes.len() as f64 / (1024.0 * 1024.0);
        if size_mb > MAX_SIZE_MB {
            anyhow::bail!("Video too large ({:.1}MB). Max: {}MB", size_mb, MAX_SIZE_MB);
        }

        // Encode and analyze
        #[allow(deprecated)]
        let base64_data = base64::encode(&bytes);
        let mime = Self::mime_type(path);

        self.call_api(&base64_data, &mime, prompt).await
    }

    /// Analyze video bytes directly
    #[allow(dead_code)] // Alternative API for direct byte analysis
    pub async fn analyze_bytes(
        &self,
        bytes: &[u8],
        mime_type: &str,
        prompt: &str,
    ) -> Result<String> {
        let size_mb = bytes.len() as f64 / (1024.0 * 1024.0);
        if size_mb > MAX_SIZE_MB {
            anyhow::bail!("Video too large ({:.1}MB). Max: {}MB", size_mb, MAX_SIZE_MB);
        }

        #[allow(deprecated)]
        let base64_data = base64::encode(bytes);
        self.call_api(&base64_data, mime_type, prompt).await
    }

    /// Call Gemini API
    async fn call_api(&self, data: &str, mime: &str, prompt: &str) -> Result<String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}",
            key = self.api_key,
        );

        let request = Request {
            contents: vec![Content {
                role: Some("user".to_string()),
                parts: vec![
                    Part {
                        text: Some(prompt.to_string()),
                        inline_data: None,
                    },
                    Part {
                        text: None,
                        inline_data: Some(InlineData {
                            mime_type: mime.to_string(),
                            data: data.to_string(),
                        }),
                    },
                ],
            }],
            generation_config: GenerationConfig {
                temperature: 0.4,
                top_p: 0.95,
                top_k: 40,
                max_output_tokens: 8192,
            },
        };

        let response = reqwest::Client::new()
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .context("Request failed")?;

        if !response.status().is_success() {
            let err = response.text().await.unwrap_or_default();
            anyhow::bail!("API error: {}", err);
        }

        let result: Response = response.json().await.context("Parse error")?;

        result
            .candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .and_then(|p| p.text.clone())
            .context("No response text")
    }

    /// Detect MIME type from extension
    fn mime_type(path: &Path) -> String {
        match path.extension().and_then(|e| e.to_str()) {
            Some("mp4") => "video/mp4",
            Some("mov") => "video/quicktime",
            Some("avi") => "video/x-msvideo",
            Some("webm") => "video/webm",
            Some("mkv") => "video/x-matroska",
            _ => "video/mp4",
        }
        .to_string()
    }

    /// Build analysis prompt for a session's configuration
    #[allow(dead_code)]
    pub fn build_analysis_prompt(
        primary_goals: &[String],
        questions: &[String],
        custom_questions: &[(String, String)], // (question, severity)
    ) -> String {
        let mut prompt = String::from(
            "You are an expert UX researcher analyzing a screen recording of a user session. \
            Analyze the video carefully and provide a detailed report.\n\n",
        );

        if !primary_goals.is_empty() {
            prompt.push_str("## Primary Goals to Analyze:\n");
            for goal in primary_goals {
                prompt.push_str(&format!("- {}\n", goal));
            }
            prompt.push('\n');
        }

        if !questions.is_empty() || !custom_questions.is_empty() {
            prompt.push_str("## Questions to Answer:\n");
            for q in questions {
                prompt.push_str(&format!("- {}\n", q));
            }
            for (q, severity) in custom_questions {
                prompt.push_str(&format!("- {} [{}]\n", q, severity));
            }
            prompt.push('\n');
        }

        prompt.push_str(
            "## Required Output Format (JSON):\n\
            Provide your analysis as a JSON object with the following structure:\n\
            ```json\n\
            {\n\
              \"outcome\": \"success|partial|failed\",\n\
              \"confidence\": 0-100,\n\
              \"overview\": \"Executive summary of the session\",\n\
              \"metrics\": {\n\
                \"task_completion_rate\": 0-100,\n\
                \"total_hesitation_time\": seconds,\n\
                \"retries_count\": number,\n\
                \"abandonment_point\": \"description or null\"\n\
              },\n\
              \"issues\": [\n\
                {\n\
                  \"title\": \"Issue title\",\n\
                  \"severity\": \"critical|high|medium|low\",\n\
                  \"tags\": [\"ux\", \"frontend\", etc.],\n\
                  \"observed_behavior\": \"What happened\",\n\
                  \"expected_behavior\": \"What should happen\",\n\
                  \"evidence\": [{\"type\": \"timestamp\", \"value\": \"MM:SS\", \"description\": \"...\"}],\n\
                  \"impact\": [\"Impact 1\", \"Impact 2\"],\n\
                  \"reproduction_steps\": [\"Step 1\", \"Step 2\"],\n\
                  \"confidence\": 0-100\n\
                }\n\
              ],\n\
              \"question_analysis\": [\n\
                {\n\
                  \"question\": \"The question\",\n\
                  \"answer\": \"Your answer\",\n\
                  \"observations\": [\"Observation 1\", \"Observation 2\"],\n\
                  \"confidence\": 0-100,\n\
                  \"timestamp\": \"MM:SS or null\"\n\
                }\n\
              ],\n\
              \"suggested_actions\": [\"Action 1\", \"Action 2\"]\n\
            }\n\
            ```\n\
            \n\
            Be thorough, specific, and actionable in your analysis."
        );

        prompt
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn mime_type_mp4() {
        assert_eq!(
            GeminiService::mime_type(Path::new("video.mp4")),
            "video/mp4"
        );
    }

    #[test]
    fn mime_type_webm() {
        assert_eq!(
            GeminiService::mime_type(Path::new("recording.webm")),
            "video/webm"
        );
    }

    #[test]
    fn mime_type_mov() {
        assert_eq!(
            GeminiService::mime_type(Path::new("clip.mov")),
            "video/quicktime"
        );
    }

    #[test]
    fn mime_type_avi() {
        assert_eq!(
            GeminiService::mime_type(Path::new("old.avi")),
            "video/x-msvideo"
        );
    }

    #[test]
    fn mime_type_mkv() {
        assert_eq!(
            GeminiService::mime_type(Path::new("movie.mkv")),
            "video/x-matroska"
        );
    }

    #[test]
    fn mime_type_unknown_defaults_to_mp4() {
        assert_eq!(GeminiService::mime_type(Path::new("file.xyz")), "video/mp4");
        assert_eq!(GeminiService::mime_type(Path::new("noext")), "video/mp4");
    }

    #[test]
    fn build_prompt_empty_inputs() {
        let prompt = GeminiService::build_analysis_prompt(&[], &[], &[]);
        assert!(prompt.contains("expert UX researcher"));
        assert!(prompt.contains("## Required Output Format"));
        assert!(!prompt.contains("## Primary Goals"));
        assert!(!prompt.contains("## Questions to Answer"));
    }

    #[test]
    fn build_prompt_with_goals() {
        let goals = vec![
            "Check onboarding flow".to_string(),
            "Test payment".to_string(),
        ];
        let prompt = GeminiService::build_analysis_prompt(&goals, &[], &[]);
        assert!(prompt.contains("## Primary Goals to Analyze:"));
        assert!(prompt.contains("- Check onboarding flow"));
        assert!(prompt.contains("- Test payment"));
    }

    #[test]
    fn build_prompt_with_questions() {
        let questions = vec!["Did the user complete checkout?".to_string()];
        let prompt = GeminiService::build_analysis_prompt(&[], &questions, &[]);
        assert!(prompt.contains("## Questions to Answer:"));
        assert!(prompt.contains("- Did the user complete checkout?"));
    }

    #[test]
    fn build_prompt_with_custom_questions() {
        let custom = vec![("Is the button visible?".to_string(), "high".to_string())];
        let prompt = GeminiService::build_analysis_prompt(&[], &[], &custom);
        assert!(prompt.contains("## Questions to Answer:"));
        assert!(prompt.contains("- Is the button visible? [high]"));
    }

    #[test]
    fn build_prompt_with_all_inputs() {
        let goals = vec!["Goal 1".to_string()];
        let questions = vec!["Q1?".to_string()];
        let custom = vec![("CQ1?".to_string(), "medium".to_string())];
        let prompt = GeminiService::build_analysis_prompt(&goals, &questions, &custom);
        assert!(prompt.contains("## Primary Goals to Analyze:"));
        assert!(prompt.contains("## Questions to Answer:"));
        assert!(prompt.contains("- Goal 1"));
        assert!(prompt.contains("- Q1?"));
        assert!(prompt.contains("- CQ1? [medium]"));
        assert!(prompt.contains("## Required Output Format"));
    }

    #[test]
    fn build_prompt_contains_json_schema() {
        let prompt = GeminiService::build_analysis_prompt(&[], &[], &[]);
        assert!(prompt.contains("\"outcome\""));
        assert!(prompt.contains("\"issues\""));
        assert!(prompt.contains("\"question_analysis\""));
        assert!(prompt.contains("\"suggested_actions\""));
    }
}
