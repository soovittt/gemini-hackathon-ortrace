//! Widget controller - public API for end-user widget submissions
//! Identified by project_id in the URL path, no authentication required.

use axum::{
    extract::{multipart::Multipart, Path, State},
    http::StatusCode,
    response::Json,
};
use uuid::Uuid;

use crate::dto::{
    ApiResponse, WidgetConfigQuery, WidgetConfigResponse, WidgetSubmitRequest, WidgetSubmitResponse,
};
use crate::error::{AppError, Result};
use crate::models::Project;
use crate::state::ReadyAppState;

/// Look up an active project by ID or return 404
async fn resolve_project(state: &crate::state::AppState, project_id: Uuid) -> Result<Project> {
    state
        .projects
        .get_active(project_id)
        .await?
        .ok_or_else(|| AppError::not_found("Project not found or inactive"))
}

/// GET /api/v1/widget/:project_id/config - Get widget configuration by project ID
pub async fn get_widget_config(
    State(ready): State<ReadyAppState>,
    Path(project_id): Path<Uuid>,
) -> Result<Json<ApiResponse<WidgetConfigResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let project = resolve_project(&state, project_id).await?;

    let require_auth = project.require_auth();
    let response = WidgetConfigResponse {
        project_id: project.id,
        project_name: project.name,
        domain: project.domain,
        require_auth,
    };

    Ok(Json(ApiResponse::success(response)))
}

/// GET /api/v1/widget/config?domain=... - Get widget configuration by domain
pub async fn get_widget_config_by_domain(
    State(ready): State<ReadyAppState>,
    axum::extract::Query(params): axum::extract::Query<WidgetConfigQuery>,
) -> Result<Json<ApiResponse<WidgetConfigResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let project = state
        .projects
        .get_by_domain(&params.domain)
        .await?
        .ok_or_else(|| AppError::not_found("No active project found for this domain"))?;

    let require_auth = project.require_auth();
    let response = WidgetConfigResponse {
        project_id: project.id,
        project_name: project.name,
        domain: project.domain,
        require_auth,
    };

    Ok(Json(ApiResponse::success(response)))
}

/// POST /api/v1/widget/:project_id/submit - Submit feedback from widget
pub async fn submit_feedback(
    State(ready): State<ReadyAppState>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<WidgetSubmitRequest>,
) -> Result<(StatusCode, Json<ApiResponse<WidgetSubmitResponse>>)> {
    let state = ready.get_or_unavailable().await?;
    let project = resolve_project(&state, project_id).await?;

    // Create or find an anonymous customer user for this submission
    let customer_id = get_or_create_anonymous_user(&state, req.submitter_email.as_deref()).await?;

    let ticket = state
        .tickets
        .create_from_widget(
            project.id,
            customer_id,
            req.feedback_type,
            Some(&req.description),
            req.submitter_email.as_deref(),
            req.submitter_name.as_deref(),
            req.page_url.as_deref(),
            req.browser_info,
        )
        .await?;

    let response = WidgetSubmitResponse {
        ticket_id: ticket.id,
        message: "Feedback submitted successfully".to_string(),
    };

    Ok((StatusCode::CREATED, Json(ApiResponse::success(response))))
}

/// POST /api/v1/widget/:project_id/tickets/:id/upload - Upload video for a widget ticket
pub async fn upload_widget_video(
    State(ready): State<ReadyAppState>,
    Path((project_id, ticket_id)): Path<(Uuid, Uuid)>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<WidgetSubmitResponse>>> {
    let state = ready.get_or_unavailable().await?;
    // Verify the project is active
    let _project = resolve_project(&state, project_id).await?;

    let mut video_data: Option<Vec<u8>> = None;
    let mut duration_seconds: i32 = 0;

    while let Ok(Some(field)) = multipart.next_field().await {
        match field.name().unwrap_or("") {
            "video" => {
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::bad_request(format!("Error reading video: {}", e)))?;
                video_data = Some(bytes.to_vec());
            }
            "duration" => {
                if let Ok(text) = field.text().await {
                    duration_seconds = text.parse().unwrap_or(0);
                }
            }
            _ => {}
        }
    }

    let video = video_data.ok_or_else(|| AppError::bad_request("Missing video file"))?;

    const MAX_SIZE_MB: f64 = 50.0;
    let size_mb = video.len() as f64 / (1024.0 * 1024.0);
    if size_mb > MAX_SIZE_MB {
        return Err(AppError::bad_request(format!(
            "Video too large ({:.1}MB). Max: {}MB",
            size_mb, MAX_SIZE_MB
        )));
    }

    // Get ticket to find its customer_id
    let ticket = state
        .tickets
        .get_by_id(ticket_id)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

    let _updated = state
        .tickets
        .upload_video(ticket_id, ticket.customer_id, video, duration_seconds)
        .await?;

    let response = WidgetSubmitResponse {
        ticket_id,
        message: "Video uploaded and processing started".to_string(),
    };

    Ok(Json(ApiResponse::success(response)))
}

/// Get or create an anonymous user for widget submissions
async fn get_or_create_anonymous_user(
    state: &crate::state::AppState,
    email: Option<&str>,
) -> Result<Uuid> {
    if let Some(email) = email {
        // Check if user exists
        if let Some(user) = state.auth.find_user_by_email(email).await? {
            return Ok(user.id);
        }
    }

    // Create a new anonymous customer
    let id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO users (email, role, onboarding_completed)
        VALUES ($1, 'customer', true)
        RETURNING id
        "#,
    )
    .bind(email)
    .fetch_one(&state.db)
    .await?;

    Ok(id)
}
