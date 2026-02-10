//! Ortrace API - Video Analysis Platform
//!
//! A REST API for analyzing user session recordings using Google Gemini AI

mod config;
mod controllers;
mod dto;
mod error;
mod middleware;
mod models;
mod router;
mod services;
mod state;

use anyhow::Context;
use sqlx::PgPool;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::services::Worker;
use crate::state::{AppState, ReadyAppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load .env from project root (Cargo.toml directory) so it works regardless of process cwd.
    // If GOOGLE_* vars are already set (e.g. empty from shell), dotenv won't override — so we
    // force them from the file when still empty after load.
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    if env_path.exists() {
        match dotenv::from_path(env_path.as_path()) {
            Ok(_) => tracing::info!("Loaded .env from {}", env_path.display()),
            Err(e) => tracing::warn!("Failed to load .env from {}: {}", env_path.display(), e),
        }
        // Dotenv doesn't override existing env vars; if GOOGLE_* were empty in the environment,
        // they stay empty. Force from file when still missing.
        // Force Google OAuth vars from file when missing (dotenv doesn't override existing vars).
        let need_google = std::env::var("GOOGLE_CLIENT_ID")
            .unwrap_or_default()
            .is_empty()
            || std::env::var("GOOGLE_CLIENT_SECRET")
                .unwrap_or_default()
                .is_empty();
        if need_google {
            if let Ok(s) = std::fs::read_to_string(env_path.as_path()) {
                for line in s.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') {
                        continue;
                    }
                    if let Some((k, v)) = line.split_once('=') {
                        let k = k.trim();
                        let v = v
                            .trim()
                            .trim_matches('"')
                            .trim_matches('\'')
                            .split('#')
                            .next()
                            .unwrap_or("")
                            .trim();
                        if (k == "GOOGLE_CLIENT_ID" || k == "GOOGLE_CLIENT_SECRET") && !v.is_empty()
                        {
                            std::env::set_var(k, v);
                        }
                    }
                }
            }
        }
    } else {
        dotenv::dotenv().ok();
    }

    // Load configuration (fail fast before binding)
    let config = config::Config::from_env()?;

    if config.google_client_id.is_empty() || config.google_client_secret.is_empty() {
        tracing::warn!(
            "Google OAuth not configured (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing or empty). \
            Sign in with Google will return 500."
        );
    } else {
        tracing::info!("Google OAuth configured");
    }

    // Bind immediately so Cloud Run sees the container listening on PORT
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Listening on http://{}", addr);

    let ready = ReadyAppState::new();

    // Initialize DB, migrations, and state in background (handlers return 503 until ready)
    let ready_clone = ready.clone();
    let config_clone = config.clone();
    tokio::spawn(async move {
        if let Err(e) = init_and_set_state(ready_clone, config_clone).await {
            tracing::error!("Startup failed: {}", e);
        }
    });

    let app = router::create_router(ready);
    tracing::info!("API Routes: GET /health, POST /api/v1/auth/register, ...");

    axum::serve(listener, app).await?;
    Ok(())
}

async fn init_and_set_state(ready: ReadyAppState, config: config::Config) -> anyhow::Result<()> {
    tracing::info!("Connecting to database...");
    let db_pool = PgPool::connect(&config.database_url)
        .await
        .context("Failed to connect to database")?;

    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .context("Failed to run migrations")?;

    tracing::info!("Initializing services...");
    let state = Arc::new(AppState::new(config.clone(), db_pool).await?);
    ready.set(state.clone()).await;

    let worker = Worker::new(state);
    tokio::spawn(async move {
        if let Err(e) = worker.start().await {
            tracing::error!("Worker error: {}", e);
        }
    });

    tracing::info!("Startup complete");
    Ok(())
}
