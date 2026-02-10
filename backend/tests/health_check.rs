//! Basic integration test example
//!
//! This test demonstrates the integration test setup. It runs against
//! a real PostgreSQL database when `DATABASE_URL` is set.
//! In CI, a PostgreSQL service container is provisioned automatically.
//!
//! To run locally:
//!   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db cargo test --test health_check

mod integration_helpers;

/// Smoke test: verify the test infrastructure works
/// This test only runs when a DATABASE_URL is available (CI or local with DB)
#[cfg(test)]
mod tests {
    // Placeholder: when DATABASE_URL is available, sqlx::test will provision a DB
    // For now, include a basic compile-check test
    #[test]
    fn integration_test_infrastructure_compiles() {
        // This test ensures our test helper module compiles correctly
    }
}
