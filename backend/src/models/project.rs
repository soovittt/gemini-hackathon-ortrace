//! Project domain model

use crate::models::FeedbackType;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisQuestion {
    pub id: String,
    pub text: String,
    pub enabled: bool,
    pub is_custom: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisQuestions {
    pub bug: Vec<AnalysisQuestion>,
    pub feedback: Vec<AnalysisQuestion>,
    pub idea: Vec<AnalysisQuestion>,
}

impl Default for AnalysisQuestions {
    fn default() -> Self {
        Self {
            bug: vec![
                AnalysisQuestion {
                    id: "bug-blocked".to_string(),
                    text: "Is the user completely blocked from completing the task?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "bug-workarounds".to_string(),
                    text: "Did the user try alternative paths or workarounds?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "bug-user-error".to_string(),
                    text: "Is this likely a user error or a product bug?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
            ],
            feedback: vec![
                AnalysisQuestion {
                    id: "feedback-friction".to_string(),
                    text: "Where does the user experience friction in the flow?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "feedback-expectation".to_string(),
                    text: "What expectation did the user have that was not met?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "feedback-smoother".to_string(),
                    text: "What would make this experience feel smoother?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
            ],
            idea: vec![
                AnalysisQuestion {
                    id: "idea-problem".to_string(),
                    text: "What problem is the user trying to solve?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "idea-benefit".to_string(),
                    text: "What benefit would this feature provide?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
                AnalysisQuestion {
                    id: "idea-urgency".to_string(),
                    text: "How urgent is this request in their workflow?".to_string(),
                    enabled: true,
                    is_custom: false,
                },
            ],
        }
    }
}

impl AnalysisQuestions {
    pub fn enabled_for_type(&self, feedback_type: FeedbackType) -> Vec<String> {
        let list = match feedback_type {
            FeedbackType::Bug => &self.bug,
            FeedbackType::Feedback => &self.feedback,
            FeedbackType::Idea => &self.idea,
        };
        list.iter()
            .filter(|q| q.enabled)
            .map(|q| q.text.clone())
            .collect()
    }
}

/// Project database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub settings: sqlx::types::Json<serde_json::Value>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Project {
    /// Whether the widget should require the end-user to be authenticated
    /// in the customer's application before submitting feedback.
    /// When true, the widget does not ask for name/email.
    pub fn require_auth(&self) -> bool {
        self.settings
            .get("require_auth")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    }

    pub fn analysis_questions(&self) -> AnalysisQuestions {
        self.settings
            .get("analysis_questions")
            .and_then(|v| serde_json::from_value::<AnalysisQuestions>(v.clone()).ok())
            .unwrap_or_default()
    }
}
