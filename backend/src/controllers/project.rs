//! Project controller

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Extension,
};
use uuid::Uuid;

use crate::dto::{
    ApiResponse, CreateProjectRequest, MessageResponse, ProjectListItem, ProjectResponse,
    UpdateProjectRequest,
};
use crate::error::{AppError, Result};
use crate::models::User;
use crate::state::ReadyAppState;

/// POST /api/v1/projects - Create a new project
pub async fn create_project(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ApiResponse<ProjectResponse>>)> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    let project = state
        .projects
        .create(
            user.id,
            &req.name,
            &req.domain,
            req.require_auth.unwrap_or(false),
            req.is_active.unwrap_or(true),
            req.analysis_questions.clone(),
        )
        .await?;
    let response = ProjectResponse::from_project(project, 0);

    Ok((StatusCode::CREATED, Json(ApiResponse::success(response))))
}

/// GET /api/v1/projects - List projects for current user
pub async fn list_projects(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
) -> Result<Json<ApiResponse<Vec<ProjectListItem>>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    let projects = state.projects.list(user.id).await?;
    let items: Vec<ProjectListItem> = futures::future::join_all(projects.into_iter().map(|p| {
        let state = state.clone();
        async move {
            let ticket_count = state.projects.count_tickets(p.id).await.unwrap_or(0);
            let require_auth = p.require_auth();
            let analysis_questions = p.analysis_questions();
            ProjectListItem {
                id: p.id,
                name: p.name,
                domain: p.domain,
                is_active: p.is_active,
                require_auth,
                analysis_questions,
                created_at: p.created_at,
                ticket_count,
            }
        }
    }))
    .await;

    Ok(Json(ApiResponse::success(items)))
}

/// GET /api/v1/projects/:id - Get project by ID
pub async fn get_project(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<ProjectResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    let project = state.projects.get_owned(id, user.id).await?;
    let ticket_count = state.projects.count_tickets(id).await.unwrap_or(0);
    let response = ProjectResponse::from_project(project, ticket_count);

    Ok(Json(ApiResponse::success(response)))
}

/// PUT /api/v1/projects/:id - Update a project
pub async fn update_project(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProjectRequest>,
) -> Result<Json<ApiResponse<ProjectResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    tracing::info!(
        project_id = %id,
        has_name = req.name.is_some(),
        has_domain = req.domain.is_some(),
        is_active = ?req.is_active,
        require_auth = ?req.require_auth,
        has_analysis_questions = req.analysis_questions.is_some(),
        "PUT /projects/:id - update request received"
    );
    if let Some(ref aq) = req.analysis_questions {
        tracing::debug!(
            bug_count = aq.bug.len(),
            feedback_count = aq.feedback.len(),
            idea_count = aq.idea.len(),
            "analysis_questions payload"
        );
    }

    let project = state
        .projects
        .update(
            id,
            user.id,
            req.name.as_deref(),
            req.domain.as_deref(),
            req.is_active,
            req.require_auth,
            req.analysis_questions.clone(),
        )
        .await?;
    let ticket_count = state.projects.count_tickets(id).await.unwrap_or(0);
    let response = ProjectResponse::from_project(project, ticket_count);

    Ok(Json(ApiResponse::success(response)))
}

/// DELETE /api/v1/projects/:id - Delete a project
pub async fn delete_project(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    state.projects.delete(id, user.id).await?;
    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Project deleted",
    ))))
}
