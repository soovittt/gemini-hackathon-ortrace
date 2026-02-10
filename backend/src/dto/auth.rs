//! Authentication DTOs

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::models::UserRole;

// ============================================================================
// Request DTOs
// ============================================================================

/// Email/password registration request
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email address"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub name: Option<String>,
    pub role: Option<UserRole>,
}

/// Email/password login request
#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Invalid email address"))]
    pub email: String,
    pub password: String,
}

/// Google OAuth callback request
#[allow(dead_code)] // Reserved for future Google OAuth implementation
#[derive(Debug, Deserialize)]
pub struct GoogleAuthRequest {
    pub code: String,
    pub redirect_uri: String,
}

/// Google OAuth token exchange (for frontend-initiated flow)
#[derive(Debug, Deserialize)]
pub struct GoogleTokenRequest {
    pub id_token: String,
}

/// Refresh token request
#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

/// Customer onboarding completion request
#[derive(Debug, Deserialize, Validate)]
pub struct CompleteOnboardingRequest {
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    pub company_name: Option<String>,
}

// ============================================================================
// Response DTOs
// ============================================================================

/// Authentication response with tokens
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserResponse,
}

impl AuthResponse {
    pub fn new(
        access_token: String,
        refresh_token: String,
        expires_in: i64,
        user: UserResponse,
    ) -> Self {
        Self {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in,
            user,
        }
    }
}

/// User data response (safe to send to client)
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: Option<String>,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub avatar_url: Option<String>,
    pub role: UserRole,
    pub onboarding_completed: bool,
}

impl From<crate::models::User> for UserResponse {
    fn from(user: crate::models::User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            name: user.name,
            company_name: user.company_name,
            avatar_url: user.avatar_url,
            role: user.role,
            onboarding_completed: user.onboarding_completed,
        }
    }
}

/// Google OAuth URL response
#[allow(dead_code)] // Reserved for future Google OAuth implementation
#[derive(Debug, Serialize)]
pub struct GoogleAuthUrlResponse {
    pub url: String,
}

/// Token validation response
#[allow(dead_code)] // Reserved for future token validation endpoint
#[derive(Debug, Serialize)]
pub struct TokenValidationResponse {
    pub valid: bool,
    pub user: Option<UserResponse>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn make_user() -> crate::models::User {
        crate::models::User {
            id: Uuid::new_v4(),
            email: Some("test@example.com".to_string()),
            name: Some("Test User".to_string()),
            company_name: Some("Test Corp".to_string()),
            password_hash: Some("hashed".to_string()),
            google_id: None,
            avatar_url: Some("https://example.com/avatar.png".to_string()),
            role: UserRole::Internal,
            onboarding_completed: true,
            refresh_token_hash: None,
            quota_limit: 10,
            quota_used: 3,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn user_response_from_user_maps_all_fields() {
        let user = make_user();
        let user_id = user.id;
        let resp = UserResponse::from(user);
        assert_eq!(resp.id, user_id);
        assert_eq!(resp.email, Some("test@example.com".to_string()));
        assert_eq!(resp.name, Some("Test User".to_string()));
        assert_eq!(resp.company_name, Some("Test Corp".to_string()));
        assert_eq!(
            resp.avatar_url,
            Some("https://example.com/avatar.png".to_string())
        );
        assert_eq!(resp.role, UserRole::Internal);
        assert!(resp.onboarding_completed);
    }

    #[test]
    fn user_response_excludes_sensitive_fields() {
        let user = make_user();
        let resp = UserResponse::from(user);
        let json = serde_json::to_value(&resp).unwrap();
        assert!(json.get("password_hash").is_none());
        assert!(json.get("refresh_token_hash").is_none());
        assert!(json.get("quota_limit").is_none());
        assert!(json.get("quota_used").is_none());
    }

    #[test]
    fn auth_response_new_sets_bearer_type() {
        let user = make_user();
        let resp = AuthResponse::new(
            "access123".to_string(),
            "refresh456".to_string(),
            3600,
            UserResponse::from(user),
        );
        assert_eq!(resp.token_type, "Bearer");
        assert_eq!(resp.access_token, "access123");
        assert_eq!(resp.refresh_token, "refresh456");
        assert_eq!(resp.expires_in, 3600);
    }

    #[test]
    fn auth_response_serialization() {
        let user = make_user();
        let resp = AuthResponse::new(
            "at".to_string(),
            "rt".to_string(),
            3600,
            UserResponse::from(user),
        );
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["token_type"], "Bearer");
        assert_eq!(json["access_token"], "at");
        assert_eq!(json["refresh_token"], "rt");
        assert_eq!(json["expires_in"], 3600);
        assert!(json["user"].is_object());
    }

    #[test]
    fn register_request_deserialization() {
        let json = r#"{"email":"a@b.com","password":"12345678","name":"Alice","role":"customer"}"#;
        let req: RegisterRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.email, "a@b.com");
        assert_eq!(req.password, "12345678");
        assert_eq!(req.name, Some("Alice".to_string()));
        assert_eq!(req.role, Some(UserRole::Customer));
    }

    #[test]
    fn register_request_optional_fields() {
        let json = r#"{"email":"a@b.com","password":"12345678"}"#;
        let req: RegisterRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.role.is_none());
    }

    #[test]
    fn login_request_deserialization() {
        let json = r#"{"email":"a@b.com","password":"secret"}"#;
        let req: LoginRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.email, "a@b.com");
        assert_eq!(req.password, "secret");
    }

    #[test]
    fn refresh_token_request_deserialization() {
        let json = r#"{"refresh_token":"tok123"}"#;
        let req: RefreshTokenRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.refresh_token, "tok123");
    }

    #[test]
    fn complete_onboarding_request_deserialization() {
        let json = r#"{"name":"Alice","company_name":"Acme"}"#;
        let req: CompleteOnboardingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name, "Alice");
        assert_eq!(req.company_name, Some("Acme".to_string()));
    }
}
