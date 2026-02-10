//! Health check controller

use axum::{extract::State, http::StatusCode, response::Json};
use serde::Serialize;

use crate::state::ReadyAppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub version: &'static str,
}

/// GET /health - Health check endpoint (returns 503 until DB and services are ready)
pub async fn health(State(ready): State<ReadyAppState>) -> (StatusCode, Json<HealthResponse>) {
    let (status, status_str) = match ready.get().await {
        Some(_) => (StatusCode::OK, "ok"),
        None => (StatusCode::SERVICE_UNAVAILABLE, "starting"),
    };
    (
        status,
        Json(HealthResponse {
            status: status_str,
            service: "ortrace-api",
            version: env!("CARGO_PKG_VERSION"),
        }),
    )
}
