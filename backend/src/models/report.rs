//! Report and Issue domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Report outcome enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ReportOutcome {
    Success,
    Partial,
    Failed,
}

/// Question analysis item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionAnalysis {
    pub question: String,
    pub answer: String,
    pub observations: Vec<String>,
    pub confidence: i32,
    pub timestamp: Option<String>,
}

/// Parse question_analysis from DB (array or single string from Gemini) into Vec<QuestionAnalysis>.
pub fn question_analysis_from_value(value: &serde_json::Value) -> Vec<QuestionAnalysis> {
    match value {
        serde_json::Value::Array(arr) => {
            let mut list = Vec::with_capacity(arr.len());
            for v in arr {
                if let Ok(q) = serde_json::from_value(v.clone()) {
                    list.push(q);
                }
            }
            list
        }
        serde_json::Value::String(s) => vec![QuestionAnalysis {
            question: String::new(),
            answer: s.clone(),
            observations: Vec::new(),
            confidence: 0,
            timestamp: None,
        }],
        _ => Vec::new(),
    }
}

/// Report database model. question_analysis is raw JSON so we accept string or array from Gemini.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Report {
    pub id: Uuid,
    pub recording_id: Uuid,
    pub outcome: Option<ReportOutcome>,
    pub confidence: Option<i32>,
    pub overview: Option<String>,
    pub task_completion_rate: Option<i32>,
    pub total_hesitation_time: Option<i32>,
    pub retries_count: Option<i32>,
    pub abandonment_point: Option<String>,
    pub question_analysis: sqlx::types::Json<serde_json::Value>,
    pub suggested_actions: sqlx::types::Json<Vec<String>>,
    /// Possible solutions to address the issues (raw JSON: array or string from Gemini).
    pub possible_solutions: sqlx::types::Json<serde_json::Value>,
    pub raw_analysis: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Issue severity enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum IssueSeverity {
    Critical,
    High,
    Medium,
    Low,
}

impl std::fmt::Display for IssueSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IssueSeverity::Critical => write!(f, "critical"),
            IssueSeverity::High => write!(f, "high"),
            IssueSeverity::Medium => write!(f, "medium"),
            IssueSeverity::Low => write!(f, "low"),
        }
    }
}

/// Issue tag (for categorization)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)] // Reserved for future issue categorization
pub enum IssueTag {
    Infra,
    Ux,
    Cloud,
    Ml,
    Ai,
    Frontend,
    Backend,
    Api,
    Security,
    Performance,
}

/// Evidence item (screenshot or timestamp reference)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    #[serde(rename = "type")]
    pub evidence_type: String, // "screenshot" or "timestamp"
    pub value: String,
    pub description: Option<String>,
}

/// Parse JSONB array or string (Gemini can return either) into Vec<Evidence>.
pub fn evidence_from_value(value: &serde_json::Value) -> Vec<Evidence> {
    match value {
        serde_json::Value::Array(arr) => {
            let mut list = Vec::with_capacity(arr.len());
            for v in arr {
                if let Ok(e) = serde_json::from_value(v.clone()) {
                    list.push(e);
                }
            }
            list
        }
        serde_json::Value::String(s) => vec![Evidence {
            evidence_type: "observation".to_string(),
            value: s.clone(),
            description: None,
        }],
        _ => Vec::new(),
    }
}

/// Parse JSONB array or string into Vec<String> (for tags, impact, reproduction_steps, screenshots).
pub fn string_array_from_value(value: &serde_json::Value) -> Vec<String> {
    match value {
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => Vec::new(),
    }
}

/// Issue database model. JSONB fields are raw Value so we accept string or array from Gemini.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Issue {
    pub id: Uuid,
    pub report_id: Uuid,
    pub title: String,
    pub severity: IssueSeverity,
    pub tags: sqlx::types::Json<serde_json::Value>,
    pub observed_behavior: Option<String>,
    pub expected_behavior: Option<String>,
    pub evidence: sqlx::types::Json<serde_json::Value>,
    pub screenshots: sqlx::types::Json<serde_json::Value>,
    pub impact: sqlx::types::Json<serde_json::Value>,
    pub reproduction_steps: sqlx::types::Json<serde_json::Value>,
    pub confidence: Option<i32>,
    pub external_ticket_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn report_outcome_serialization() {
        assert_eq!(
            serde_json::to_string(&ReportOutcome::Success).unwrap(),
            "\"success\""
        );
        assert_eq!(
            serde_json::to_string(&ReportOutcome::Partial).unwrap(),
            "\"partial\""
        );
        assert_eq!(
            serde_json::to_string(&ReportOutcome::Failed).unwrap(),
            "\"failed\""
        );
    }

    #[test]
    fn report_outcome_deserialization() {
        assert_eq!(
            serde_json::from_str::<ReportOutcome>("\"success\"").unwrap(),
            ReportOutcome::Success
        );
        assert_eq!(
            serde_json::from_str::<ReportOutcome>("\"partial\"").unwrap(),
            ReportOutcome::Partial
        );
        assert_eq!(
            serde_json::from_str::<ReportOutcome>("\"failed\"").unwrap(),
            ReportOutcome::Failed
        );
    }

    #[test]
    fn issue_severity_display() {
        assert_eq!(IssueSeverity::Critical.to_string(), "critical");
        assert_eq!(IssueSeverity::High.to_string(), "high");
        assert_eq!(IssueSeverity::Medium.to_string(), "medium");
        assert_eq!(IssueSeverity::Low.to_string(), "low");
    }

    #[test]
    fn issue_severity_serialization() {
        assert_eq!(
            serde_json::to_string(&IssueSeverity::Critical).unwrap(),
            "\"critical\""
        );
        assert_eq!(
            serde_json::to_string(&IssueSeverity::Low).unwrap(),
            "\"low\""
        );
    }

    #[test]
    fn issue_severity_deserialization() {
        assert_eq!(
            serde_json::from_str::<IssueSeverity>("\"critical\"").unwrap(),
            IssueSeverity::Critical
        );
        assert_eq!(
            serde_json::from_str::<IssueSeverity>("\"high\"").unwrap(),
            IssueSeverity::High
        );
    }

    #[test]
    fn issue_tag_serialization() {
        assert_eq!(serde_json::to_string(&IssueTag::Ux).unwrap(), "\"ux\"");
        assert_eq!(
            serde_json::to_string(&IssueTag::Frontend).unwrap(),
            "\"frontend\""
        );
        assert_eq!(
            serde_json::to_string(&IssueTag::Security).unwrap(),
            "\"security\""
        );
    }

    #[test]
    fn evidence_serialization_roundtrip() {
        let evidence = Evidence {
            evidence_type: "timestamp".to_string(),
            value: "0:15".to_string(),
            description: Some("User hesitated".to_string()),
        };
        let json = serde_json::to_string(&evidence).unwrap();
        assert!(json.contains("\"type\":\"timestamp\""));
        let deserialized: Evidence = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.evidence_type, "timestamp");
        assert_eq!(deserialized.value, "0:15");
        assert_eq!(deserialized.description, Some("User hesitated".to_string()));
    }

    #[test]
    fn question_analysis_serialization_roundtrip() {
        let qa = QuestionAnalysis {
            question: "Did the user complete the task?".to_string(),
            answer: "Yes".to_string(),
            observations: vec!["Observation 1".to_string()],
            confidence: 85,
            timestamp: Some("1:30".to_string()),
        };
        let json = serde_json::to_string(&qa).unwrap();
        let deserialized: QuestionAnalysis = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.question, qa.question);
        assert_eq!(deserialized.confidence, 85);
        assert_eq!(deserialized.observations.len(), 1);
    }
}
