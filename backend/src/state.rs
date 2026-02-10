//! Application state shared across all handlers

use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::config::Config;
use crate::services::{
    AuthService, ChatService, GeminiService, ProjectService, QueueService, StorageService,
    TicketService,
};

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub auth: Arc<AuthService>,
    pub projects: Arc<ProjectService>,
    pub tickets: Arc<TicketService>,
    pub chat: Arc<ChatService>,
    pub gemini: Arc<GeminiService>,
    pub storage: Arc<StorageService>,
    pub queue: Arc<QueueService>,
}

impl AppState {
    pub async fn new(config: Config, db: PgPool) -> anyhow::Result<Self> {
        let config = Arc::new(config);

        // Initialize services
        let storage = Arc::new(StorageService::new(&config)?);
        let queue = Arc::new(QueueService::new(db.clone()));
        let gemini = Arc::new(GeminiService::new(&config).await?);
        let auth = Arc::new(AuthService::new(config.clone(), db.clone()));
        let projects = Arc::new(ProjectService::new(db.clone()));
        let tickets = Arc::new(TicketService::new(
            db.clone(),
            storage.clone(),
            queue.clone(),
        ));
        let chat = Arc::new(ChatService::new(db.clone()));

        Ok(Self {
            db,
            config,
            auth,
            projects,
            tickets,
            chat,
            gemini,
            storage,
            queue,
        })
    }
}

/// Wrapper that holds app state once startup (DB connect + migrations) has completed.
/// Used so the server can bind and listen immediately; handlers return 503 until ready.
#[derive(Clone)]
pub struct ReadyAppState(pub Arc<RwLock<Option<Arc<AppState>>>>);

impl ReadyAppState {
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(None)))
    }

    pub async fn get(&self) -> Option<Arc<AppState>> {
        self.0.read().await.clone()
    }

    /// Get app state or return ServiceUnavailable for use in handlers.
    pub async fn get_or_unavailable(&self) -> Result<Arc<AppState>, crate::error::AppError> {
        self.get()
            .await
            .ok_or(crate::error::AppError::ServiceUnavailable)
    }

    pub async fn set(&self, state: Arc<AppState>) {
        *self.0.write().await = Some(state);
    }
}
