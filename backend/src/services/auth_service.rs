//! Authentication service - handles JWT tokens, password hashing, and OAuth

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::Rng;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::config::Config;
use crate::dto::{AuthResponse, CompleteOnboardingRequest, UserResponse};
use crate::error::{AppError, Result as AppResult};
use crate::models::{User, UserClaims, UserRole};

/// Authentication service
pub struct AuthService {
    config: Arc<Config>,
    db: PgPool,
}

impl AuthService {
    pub fn new(config: Arc<Config>, db: PgPool) -> Self {
        Self { config, db }
    }

    // ========================================================================
    // Token Management
    // ========================================================================

    /// Generate access and refresh tokens for a user
    pub fn generate_tokens(&self, user: &User) -> AppResult<(String, String, i64)> {
        let now = Utc::now();
        let access_exp = now + Duration::hours(1);
        let refresh_exp = now + Duration::days(30);

        let access_claims = UserClaims {
            sub: user.id,
            email: user.email.clone().unwrap_or_default(),
            role: user.role,
            exp: access_exp.timestamp(),
            iat: now.timestamp(),
        };

        let refresh_claims = UserClaims {
            sub: user.id,
            email: user.email.clone().unwrap_or_default(),
            role: user.role,
            exp: refresh_exp.timestamp(),
            iat: now.timestamp(),
        };

        let access_token = encode(
            &Header::default(),
            &access_claims,
            &EncodingKey::from_secret(self.config.jwt_secret.as_bytes()),
        )?;

        let refresh_token = encode(
            &Header::default(),
            &refresh_claims,
            &EncodingKey::from_secret(self.config.jwt_refresh_secret.as_bytes()),
        )?;

        Ok((access_token, refresh_token, 3600)) // 1 hour in seconds
    }

    /// Validate an access token and return the claims
    pub fn validate_access_token(&self, token: &str) -> AppResult<UserClaims> {
        let token_data = decode::<UserClaims>(
            token,
            &DecodingKey::from_secret(self.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }

    /// Validate a refresh token and return the claims
    pub fn validate_refresh_token(&self, token: &str) -> AppResult<UserClaims> {
        let token_data = decode::<UserClaims>(
            token,
            &DecodingKey::from_secret(self.config.jwt_refresh_secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(token_data.claims)
    }

    // ========================================================================
    // Password Management
    // ========================================================================

    /// Hash a password
    pub fn hash_password(&self, password: &str) -> AppResult<String> {
        hash(password, DEFAULT_COST).map_err(|_| AppError::PasswordHash)
    }

    /// Verify a password against a hash
    pub fn verify_password(&self, password: &str, hash: &str) -> AppResult<bool> {
        verify(password, hash).map_err(|_| AppError::PasswordHash)
    }

    // ========================================================================
    // User Registration & Login
    // ========================================================================

    /// Register a new user with email/password
    pub async fn register(
        &self,
        email: &str,
        password: &str,
        name: Option<&str>,
        role: UserRole,
    ) -> AppResult<AuthResponse> {
        // Check if user already exists
        let existing = self.find_user_by_email(email).await?;
        if existing.is_some() {
            return Err(AppError::conflict("Email already registered"));
        }

        // Hash password
        let password_hash = self.hash_password(password)?;

        // Create user
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (email, password_hash, name, role, onboarding_completed)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(email)
        .bind(&password_hash)
        .bind(name)
        .bind(role)
        .bind(role == UserRole::Internal) // Internal users don't need onboarding
        .fetch_one(&self.db)
        .await?;

        // Generate tokens
        let (access_token, refresh_token, expires_in) = self.generate_tokens(&user)?;

        // Store refresh token hash
        self.store_refresh_token_hash(&user.id, &refresh_token)
            .await?;

        Ok(AuthResponse::new(
            access_token,
            refresh_token,
            expires_in,
            UserResponse::from(user),
        ))
    }

    /// Login with email/password
    pub async fn login(&self, email: &str, password: &str) -> AppResult<AuthResponse> {
        let user = self
            .find_user_by_email(email)
            .await?
            .ok_or_else(AppError::unauthorized)?;

        let password_hash = user
            .password_hash
            .as_ref()
            .ok_or_else(|| AppError::bad_request("Account uses Google login"))?;

        if !self.verify_password(password, password_hash)? {
            return Err(AppError::unauthorized());
        }

        let (access_token, refresh_token, expires_in) = self.generate_tokens(&user)?;
        self.store_refresh_token_hash(&user.id, &refresh_token)
            .await?;

        Ok(AuthResponse::new(
            access_token,
            refresh_token,
            expires_in,
            UserResponse::from(user),
        ))
    }

    /// Login or register with Google OAuth
    pub async fn google_auth(
        &self,
        google_id: &str,
        email: &str,
        name: Option<&str>,
        avatar_url: Option<&str>,
    ) -> AppResult<AuthResponse> {
        // Check if user exists by Google ID
        let user = if let Some(user) = self.find_user_by_google_id(google_id).await? {
            user
        } else if let Some(user) = self.find_user_by_email(email).await? {
            // Link Google account to existing email user
            self.link_google_account(&user.id, google_id, avatar_url)
                .await?;
            self.find_user_by_id(&user.id).await?.unwrap()
        } else {
            // Create new user
            sqlx::query_as::<_, User>(
                r#"
                INSERT INTO users (email, google_id, name, avatar_url, role, onboarding_completed)
                VALUES ($1, $2, $3, $4, 'customer', FALSE)
                RETURNING *
                "#,
            )
            .bind(email)
            .bind(google_id)
            .bind(name)
            .bind(avatar_url)
            .fetch_one(&self.db)
            .await?
        };

        let (access_token, refresh_token, expires_in) = self.generate_tokens(&user)?;
        self.store_refresh_token_hash(&user.id, &refresh_token)
            .await?;

        Ok(AuthResponse::new(
            access_token,
            refresh_token,
            expires_in,
            UserResponse::from(user),
        ))
    }

    /// Refresh access token using refresh token
    pub async fn refresh_tokens(&self, refresh_token: &str) -> AppResult<AuthResponse> {
        let claims = self.validate_refresh_token(refresh_token)?;

        let user = self
            .find_user_by_id(&claims.sub)
            .await?
            .ok_or_else(AppError::unauthorized)?;

        let (new_access_token, new_refresh_token, expires_in) = self.generate_tokens(&user)?;
        self.store_refresh_token_hash(&user.id, &new_refresh_token)
            .await?;

        Ok(AuthResponse::new(
            new_access_token,
            new_refresh_token,
            expires_in,
            UserResponse::from(user),
        ))
    }

    /// Complete customer onboarding
    pub async fn complete_onboarding(
        &self,
        user_id: &Uuid,
        data: CompleteOnboardingRequest,
    ) -> AppResult<UserResponse> {
        let user = sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET name = $1, company_name = $2, onboarding_completed = TRUE
            WHERE id = $3
            RETURNING *
            "#,
        )
        .bind(&data.name)
        .bind(&data.company_name)
        .bind(user_id)
        .fetch_one(&self.db)
        .await?;

        Ok(UserResponse::from(user))
    }

    // ========================================================================
    // User Queries
    // ========================================================================

    pub async fn find_user_by_id(&self, id: &Uuid) -> AppResult<Option<User>> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;
        Ok(user)
    }

    pub async fn find_user_by_email(&self, email: &str) -> AppResult<Option<User>> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.db)
            .await?;
        Ok(user)
    }

    pub async fn find_user_by_google_id(&self, google_id: &str) -> AppResult<Option<User>> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE google_id = $1")
            .bind(google_id)
            .fetch_optional(&self.db)
            .await?;
        Ok(user)
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    async fn store_refresh_token_hash(&self, user_id: &Uuid, token: &str) -> AppResult<()> {
        let hash = self.hash_password(token)?;
        sqlx::query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2")
            .bind(&hash)
            .bind(user_id)
            .execute(&self.db)
            .await?;
        Ok(())
    }

    async fn link_google_account(
        &self,
        user_id: &Uuid,
        google_id: &str,
        avatar_url: Option<&str>,
    ) -> AppResult<()> {
        sqlx::query(
            "UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3",
        )
        .bind(google_id)
        .bind(avatar_url)
        .bind(user_id)
        .execute(&self.db)
        .await?;
        Ok(())
    }

    /// Generate a random share token for sessions
    #[allow(dead_code)]
    pub fn generate_share_token() -> String {
        let mut rng = rand::thread_rng();
        let bytes: [u8; 32] = rng.gen();
        URL_SAFE_NO_PAD.encode(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Config, StorageConfig, StorageType};
    use chrono::Utc;
    use std::collections::HashSet;

    /// Create a test config with known JWT secrets
    fn test_config() -> Config {
        Config {
            port: 3000,
            frontend_url: "http://localhost:8080".to_string(),
            api_url: "http://localhost:3000".to_string(),
            database_url: "postgresql://fake:fake@localhost/fake".to_string(),
            storage_type: StorageType::Local,
            storage_config: StorageConfig::Local {
                path: "/tmp/test-storage".to_string(),
            },
            gemini_api_key: "test-key".to_string(),
            jwt_secret: "test-jwt-secret-for-unit-tests".to_string(),
            jwt_refresh_secret: "test-jwt-refresh-secret-for-unit-tests".to_string(),
            google_client_id: "test-client-id".to_string(),
            google_client_secret: "test-client-secret".to_string(),
        }
    }

    /// Create a test user
    fn test_user(role: UserRole) -> User {
        User {
            id: Uuid::new_v4(),
            email: Some("test@example.com".to_string()),
            name: Some("Test User".to_string()),
            company_name: None,
            password_hash: None,
            google_id: None,
            avatar_url: None,
            role,
            onboarding_completed: true,
            refresh_token_hash: None,
            quota_limit: 10,
            quota_used: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    /// Create an AuthService with a lazy (non-connecting) pool for pure-method tests.
    /// Requires a Tokio runtime context (use with #[tokio::test]).
    fn test_auth_service() -> AuthService {
        let config = Arc::new(test_config());
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgresql://fake:fake@localhost/fake")
            .expect("lazy pool creation should not fail");
        AuthService::new(config, pool)
    }

    // ===== Token Tests =====

    #[tokio::test]
    async fn generate_tokens_returns_valid_jwt_strings() {
        let svc = test_auth_service();
        let user = test_user(UserRole::Internal);
        let (access, refresh, expires_in) = svc.generate_tokens(&user).unwrap();
        assert!(!access.is_empty());
        assert!(!refresh.is_empty());
        assert_ne!(access, refresh);
        assert_eq!(expires_in, 3600);
    }

    #[tokio::test]
    async fn access_token_roundtrip() {
        let svc = test_auth_service();
        let user = test_user(UserRole::Internal);
        let (access, _refresh, _) = svc.generate_tokens(&user).unwrap();
        let claims = svc.validate_access_token(&access).unwrap();
        assert_eq!(claims.sub, user.id);
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.role, UserRole::Internal);
    }

    #[tokio::test]
    async fn refresh_token_roundtrip() {
        let svc = test_auth_service();
        let user = test_user(UserRole::Customer);
        let (_access, refresh, _) = svc.generate_tokens(&user).unwrap();
        let claims = svc.validate_refresh_token(&refresh).unwrap();
        assert_eq!(claims.sub, user.id);
        assert_eq!(claims.role, UserRole::Customer);
    }

    #[tokio::test]
    async fn access_token_cannot_be_validated_as_refresh() {
        let svc = test_auth_service();
        let user = test_user(UserRole::Internal);
        let (access, _refresh, _) = svc.generate_tokens(&user).unwrap();
        // Access token signed with jwt_secret should fail validation with jwt_refresh_secret
        assert!(svc.validate_refresh_token(&access).is_err());
    }

    #[tokio::test]
    async fn refresh_token_cannot_be_validated_as_access() {
        let svc = test_auth_service();
        let user = test_user(UserRole::Internal);
        let (_access, refresh, _) = svc.generate_tokens(&user).unwrap();
        assert!(svc.validate_access_token(&refresh).is_err());
    }

    #[tokio::test]
    async fn invalid_token_string_fails_validation() {
        let svc = test_auth_service();
        assert!(svc.validate_access_token("not-a-valid-jwt").is_err());
        assert!(svc.validate_refresh_token("garbage.token.here").is_err());
    }

    #[tokio::test]
    async fn token_contains_correct_user_email_even_when_none() {
        let svc = test_auth_service();
        let mut user = test_user(UserRole::Customer);
        user.email = None;
        let (access, _refresh, _) = svc.generate_tokens(&user).unwrap();
        let claims = svc.validate_access_token(&access).unwrap();
        assert_eq!(claims.email, ""); // unwrap_or_default gives empty string
    }

    // ===== Password Tests =====

    #[tokio::test]
    async fn hash_and_verify_password() {
        let svc = test_auth_service();
        let password = "secure_password_123!";
        let hashed = svc.hash_password(password).unwrap();
        assert_ne!(hashed, password);
        assert!(svc.verify_password(password, &hashed).unwrap());
    }

    #[tokio::test]
    async fn wrong_password_fails_verification() {
        let svc = test_auth_service();
        let hashed = svc.hash_password("correct_password").unwrap();
        assert!(!svc.verify_password("wrong_password", &hashed).unwrap());
    }

    #[tokio::test]
    async fn hash_is_different_each_time() {
        let svc = test_auth_service();
        let h1 = svc.hash_password("same_password").unwrap();
        let h2 = svc.hash_password("same_password").unwrap();
        assert_ne!(h1, h2); // bcrypt uses random salt
    }

    // ===== Share Token Tests =====

    #[test]
    fn generate_share_token_is_non_empty() {
        let token = AuthService::generate_share_token();
        assert!(!token.is_empty());
    }

    #[test]
    fn generate_share_token_is_url_safe() {
        let token = AuthService::generate_share_token();
        // URL-safe base64 only uses A-Z, a-z, 0-9, -, _
        assert!(token
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
    }

    #[test]
    fn generate_share_token_produces_unique_values() {
        let tokens: HashSet<String> = (0..100)
            .map(|_| AuthService::generate_share_token())
            .collect();
        assert_eq!(tokens.len(), 100);
    }
}
