//! Router configuration

use axum::{
    extract::DefaultBodyLimit,
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::controllers;
use crate::middleware::auth_middleware;
use crate::state::ReadyAppState;

/// Create the application router
pub fn create_router(ready: ReadyAppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(controllers::health))
        .route(
            "/api/v1/widget/config",
            get(controllers::get_widget_config_by_domain),
        )
        .route(
            "/api/v1/widget/:project_id/config",
            get(controllers::get_widget_config),
        )
        .route(
            "/api/v1/widget/:project_id/submit",
            post(controllers::submit_feedback),
        )
        .route(
            "/api/v1/widget/:project_id/tickets/:id/upload",
            post(controllers::upload_widget_video),
        )
        .nest("/api/v1", authenticated_routes(ready.clone()))
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(ready)
}

fn authenticated_routes(ready: ReadyAppState) -> Router<ReadyAppState> {
    Router::new()
        .nest("/auth", auth_routes(ready.clone()))
        .nest("/projects", project_routes(ready.clone()))
        .nest("/tickets", ticket_routes(ready.clone()))
}

/// Authentication routes
fn auth_routes(ready: ReadyAppState) -> Router<ReadyAppState> {
    let public_routes = Router::new()
        .route("/register", post(controllers::register))
        .route("/login", post(controllers::login))
        .route("/google", post(controllers::google_auth))
        .route("/google/start", get(controllers::google_start))
        .route("/google/callback", get(controllers::google_callback))
        .route("/refresh", post(controllers::refresh_token));

    let protected_routes = Router::new()
        .route("/me", get(controllers::get_current_user))
        .route("/onboarding", post(controllers::complete_onboarding))
        .route_layer(middleware::from_fn_with_state(ready, auth_middleware));

    public_routes.merge(protected_routes)
}

/// Project routes (internal users only)
fn project_routes(ready: ReadyAppState) -> Router<ReadyAppState> {
    Router::new()
        .route("/", post(controllers::create_project))
        .route("/", get(controllers::list_projects))
        .route("/:id", get(controllers::get_project))
        .route("/:id", put(controllers::update_project))
        .route("/:id", delete(controllers::delete_project))
        .route_layer(middleware::from_fn_with_state(ready, auth_middleware))
}

/// Ticket routes (internal users + chat)
fn ticket_routes(ready: ReadyAppState) -> Router<ReadyAppState> {
    Router::new()
        .route("/overview", get(controllers::get_overview))
        .route("/", get(controllers::list_tickets))
        .route("/:id", get(controllers::get_ticket))
        .route("/:id", put(controllers::update_ticket))
        .route("/:id/close", post(controllers::close_ticket))
        .route("/:id/reopen", post(controllers::reopen_ticket))
        .route("/:id", delete(controllers::delete_ticket))
        .route("/:id/video", get(controllers::get_video))
        .route("/:id/report", get(controllers::get_report))
        // Chat messages
        .route("/:id/messages", get(controllers::get_messages))
        .route("/:id/messages", post(controllers::send_message))
        .route(
            "/:ticket_id/messages/:message_id",
            put(controllers::edit_message),
        )
        .route(
            "/:ticket_id/messages/:message_id",
            delete(controllers::delete_message),
        )
        .route_layer(middleware::from_fn_with_state(ready, auth_middleware))
}
