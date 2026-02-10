//! Integration test helpers
//!
//! This module provides shared utilities for integration tests that require
//! a real PostgreSQL database. Tests using `#[sqlx::test]` will automatically
//! create a temporary test database and run migrations.
//!
//! ## Usage
//!
//! ```rust,ignore
//! use sqlx::PgPool;
//!
//! #[sqlx::test(migrations = "./migrations")]
//! async fn test_something(pool: PgPool) {
//!     let helpers = integration_helpers::TestContext::new(pool);
//!     // ... use helpers to set up test data ...
//! }
//! ```
//!
//! ## Requirements
//!
//! - `DATABASE_URL` env var must point to a PostgreSQL instance
//! - The `sqlx` CLI or `sqlx::test` macro handles creating/dropping test databases

#[allow(dead_code)]
pub struct TestContext {
    pub pool: sqlx::PgPool,
}

#[allow(dead_code)]
impl TestContext {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }

    /// Create a test user and return their UUID
    pub async fn create_test_user(&self, email: &str, role: &str) -> uuid::Uuid {
        sqlx::query_scalar::<_, uuid::Uuid>(
            r#"
            INSERT INTO users (email, role, onboarding_completed, quota_limit, quota_used)
            VALUES ($1, $2, TRUE, 100, 0)
            RETURNING id
            "#,
        )
        .bind(email)
        .bind(role)
        .fetch_one(&self.pool)
        .await
        .expect("Failed to create test user")
    }

    /// Create a test session owned by the given user
    pub async fn create_test_session(
        &self,
        owner_id: uuid::Uuid,
        name: &str,
        share_token: &str,
    ) -> uuid::Uuid {
        sqlx::query_scalar::<_, uuid::Uuid>(
            r#"
            INSERT INTO sessions (owner_id, name, type, share_token, questions)
            VALUES ($1, $2, 'feedback', $3, '["Q1?"]'::jsonb)
            RETURNING id
            "#,
        )
        .bind(owner_id)
        .bind(name)
        .bind(share_token)
        .fetch_one(&self.pool)
        .await
        .expect("Failed to create test session")
    }
}
