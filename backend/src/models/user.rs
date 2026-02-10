//! User domain model

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// User role enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Internal,
    Customer,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Internal => write!(f, "internal"),
            UserRole::Customer => write!(f, "customer"),
        }
    }
}

/// User database model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: Option<String>,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub password_hash: Option<String>,
    pub google_id: Option<String>,
    pub avatar_url: Option<String>,
    pub role: UserRole,
    pub onboarding_completed: bool,
    pub refresh_token_hash: Option<String>,
    pub quota_limit: i32,
    pub quota_used: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    /// Check if user is internal (admin/team member)
    pub fn is_internal(&self) -> bool {
        self.role == UserRole::Internal
    }

    /// Check if user is a customer
    pub fn is_customer(&self) -> bool {
        self.role == UserRole::Customer
    }

    /// Check if user needs onboarding
    #[allow(dead_code)] // Useful helper method, may be used in future
    pub fn needs_onboarding(&self) -> bool {
        self.is_customer() && !self.onboarding_completed
    }
}

/// Minimal user info for JWT claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserClaims {
    pub sub: Uuid, // user id
    pub email: String,
    pub role: UserRole,
    pub exp: i64, // expiration timestamp
    pub iat: i64, // issued at timestamp
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn make_user(role: UserRole, onboarding_completed: bool) -> User {
        User {
            id: Uuid::new_v4(),
            email: Some("test@example.com".to_string()),
            name: Some("Test User".to_string()),
            company_name: None,
            password_hash: None,
            google_id: None,
            avatar_url: None,
            role,
            onboarding_completed,
            refresh_token_hash: None,
            quota_limit: 10,
            quota_used: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn user_role_display_internal() {
        assert_eq!(UserRole::Internal.to_string(), "internal");
    }

    #[test]
    fn user_role_display_customer() {
        assert_eq!(UserRole::Customer.to_string(), "customer");
    }

    #[test]
    fn user_role_serialization() {
        let json = serde_json::to_string(&UserRole::Internal).unwrap();
        assert_eq!(json, "\"internal\"");
        let json = serde_json::to_string(&UserRole::Customer).unwrap();
        assert_eq!(json, "\"customer\"");
    }

    #[test]
    fn user_role_deserialization() {
        let role: UserRole = serde_json::from_str("\"internal\"").unwrap();
        assert_eq!(role, UserRole::Internal);
        let role: UserRole = serde_json::from_str("\"customer\"").unwrap();
        assert_eq!(role, UserRole::Customer);
    }

    #[test]
    fn internal_user_is_internal() {
        let user = make_user(UserRole::Internal, true);
        assert!(user.is_internal());
        assert!(!user.is_customer());
    }

    #[test]
    fn customer_user_is_customer() {
        let user = make_user(UserRole::Customer, false);
        assert!(user.is_customer());
        assert!(!user.is_internal());
    }

    #[test]
    fn customer_needs_onboarding_when_not_completed() {
        let user = make_user(UserRole::Customer, false);
        assert!(user.needs_onboarding());
    }

    #[test]
    fn customer_does_not_need_onboarding_when_completed() {
        let user = make_user(UserRole::Customer, true);
        assert!(!user.needs_onboarding());
    }

    #[test]
    fn internal_user_never_needs_onboarding() {
        let user = make_user(UserRole::Internal, false);
        assert!(!user.needs_onboarding());
    }

    #[test]
    fn user_claims_serialization_roundtrip() {
        let claims = UserClaims {
            sub: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: UserRole::Internal,
            exp: 1234567890,
            iat: 1234567800,
        };
        let json = serde_json::to_string(&claims).unwrap();
        let deserialized: UserClaims = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.sub, claims.sub);
        assert_eq!(deserialized.email, claims.email);
        assert_eq!(deserialized.role, claims.role);
        assert_eq!(deserialized.exp, claims.exp);
        assert_eq!(deserialized.iat, claims.iat);
    }
}
