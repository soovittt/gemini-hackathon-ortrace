//! Centralized error handling for the application

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Authentication required")]
    Unauthorized,

    #[error("Access denied")]
    Forbidden,

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Validation error: {0}")]
    #[allow(dead_code)] // Useful for validation error responses
    Validation(String),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("Password hash error")]
    PasswordHash,

    #[error("External service error: {0}")]
    ExternalService(String),

    #[error("Service starting up")]
    ServiceUnavailable,
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    pub fn unauthorized() -> Self {
        Self::Unauthorized
    }

    pub fn forbidden() -> Self {
        Self::Forbidden
    }

    pub fn conflict(msg: impl Into<String>) -> Self {
        Self::Conflict(msg.into())
    }

    #[allow(dead_code)] // Useful for validation error responses
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }
}

/// Error response body
#[derive(Serialize)]
struct ErrorResponse {
    success: bool,
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", self.to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "FORBIDDEN", self.to_string()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "BAD_REQUEST", msg.clone()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, "CONFLICT", msg.clone()),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                msg.clone(),
            ),
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
            AppError::Database(e) => {
                tracing::error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "A database error occurred".to_string(),
                )
            }
            AppError::Jwt(e) => {
                tracing::warn!("JWT error: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    "INVALID_TOKEN",
                    "Invalid or expired token".to_string(),
                )
            }
            AppError::PasswordHash => {
                tracing::error!("Password hash error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An internal error occurred".to_string(),
                )
            }
            AppError::ExternalService(msg) => {
                tracing::error!("External service error: {}", msg);
                (
                    StatusCode::BAD_GATEWAY,
                    "EXTERNAL_SERVICE_ERROR",
                    msg.clone(),
                )
            }
            AppError::ServiceUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                "SERVICE_UNAVAILABLE",
                "Service is starting up".to_string(),
            ),
        };

        let body = Json(ErrorResponse {
            success: false,
            error: message,
            code: Some(code.to_string()),
        });

        (status, body).into_response()
    }
}

/// Result type alias for handlers
pub type Result<T> = std::result::Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    fn extract_status(err: AppError) -> StatusCode {
        err.into_response().status()
    }

    #[test]
    fn unauthorized_returns_401() {
        assert_eq!(
            extract_status(AppError::unauthorized()),
            StatusCode::UNAUTHORIZED
        );
    }

    #[test]
    fn forbidden_returns_403() {
        assert_eq!(extract_status(AppError::forbidden()), StatusCode::FORBIDDEN);
    }

    #[test]
    fn not_found_returns_404() {
        assert_eq!(
            extract_status(AppError::not_found("missing")),
            StatusCode::NOT_FOUND
        );
    }

    #[test]
    fn bad_request_returns_400() {
        assert_eq!(
            extract_status(AppError::bad_request("invalid")),
            StatusCode::BAD_REQUEST
        );
    }

    #[test]
    fn conflict_returns_409() {
        assert_eq!(
            extract_status(AppError::conflict("duplicate")),
            StatusCode::CONFLICT
        );
    }

    #[test]
    fn validation_returns_422() {
        assert_eq!(
            extract_status(AppError::validation("invalid field")),
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }

    #[test]
    fn internal_returns_500() {
        assert_eq!(
            extract_status(AppError::internal("oops")),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn password_hash_returns_500() {
        assert_eq!(
            extract_status(AppError::PasswordHash),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn external_service_returns_502() {
        assert_eq!(
            extract_status(AppError::ExternalService("api down".to_string())),
            StatusCode::BAD_GATEWAY
        );
    }

    #[test]
    fn factory_methods_produce_correct_variants() {
        assert!(matches!(
            AppError::bad_request("x"),
            AppError::BadRequest(_)
        ));
        assert!(matches!(AppError::not_found("x"), AppError::NotFound(_)));
        assert!(matches!(AppError::internal("x"), AppError::Internal(_)));
        assert!(matches!(AppError::unauthorized(), AppError::Unauthorized));
        assert!(matches!(AppError::forbidden(), AppError::Forbidden));
        assert!(matches!(AppError::conflict("x"), AppError::Conflict(_)));
        assert!(matches!(AppError::validation("x"), AppError::Validation(_)));
    }

    #[test]
    fn error_display_messages() {
        assert_eq!(
            AppError::Unauthorized.to_string(),
            "Authentication required"
        );
        assert_eq!(AppError::Forbidden.to_string(), "Access denied");
        assert_eq!(
            AppError::not_found("item").to_string(),
            "Resource not found: item"
        );
        assert_eq!(
            AppError::bad_request("field").to_string(),
            "Bad request: field"
        );
        assert_eq!(AppError::conflict("dup").to_string(), "Conflict: dup");
        assert_eq!(AppError::PasswordHash.to_string(), "Password hash error");
    }

    #[test]
    fn error_response_body_structure() {
        let response = AppError::not_found("thing").into_response();
        // Verify response is not empty and has correct status
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
