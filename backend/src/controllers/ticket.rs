//! Ticket controller

use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json, Response},
    Extension,
};
use uuid::Uuid;

use crate::dto::{
    ApiResponse, MessageResponse, PaginatedResponse, TicketDetailResponse, TicketListItem,
    TicketListQueryParams, UpdateTicketRequest,
};
use crate::error::{AppError, Result};
use crate::models::User;
use crate::services::TicketListQuery;
use crate::state::ReadyAppState;

/// GET /api/v1/tickets - List tickets for internal user.
/// Query params: project_id (optional, restricts to that project), feedback_type, ticket_status, priority, search, page, per_page.
pub async fn list_tickets(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Query(query): Query<TicketListQueryParams>,
) -> Result<Json<ApiResponse<PaginatedResponse<TicketListItem>>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    let service_query = TicketListQuery {
        project_id: query.project_id,
        feedback_type: query.feedback_type,
        ticket_status: query.ticket_status,
        priority: query.priority,
        search: query.search.clone(),
        page: query.page,
        per_page: query.per_page,
    };

    let (tickets, total) = state.tickets.list_for_owner(user.id, service_query).await?;

    let items: Vec<TicketListItem> = tickets
        .into_iter()
        .map(TicketListItem::from_details)
        .collect();

    let response = PaginatedResponse::new(items, total, query.page, query.per_page);
    Ok(Json(ApiResponse::success(response)))
}

/// GET /api/v1/tickets/:id - Get ticket details
pub async fn get_ticket(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<TicketDetailResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let ticket = state
        .tickets
        .get_by_id(id)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

    // Check access: either owner of project or customer who submitted
    if !user.is_internal() && ticket.customer_id != user.id {
        return Err(AppError::forbidden());
    }

    let video_url = state.tickets.get_video_url(&ticket).await?;

    // Get project name if available
    let project_name = if let Some(project_id) = ticket.project_id {
        state.projects.get_by_id(project_id).await?.map(|p| p.name)
    } else {
        None
    };

    // Get assignee name if available
    let assignee_name = if let Some(assignee_id) = ticket.assignee_id {
        state
            .auth
            .find_user_by_id(&assignee_id)
            .await?
            .and_then(|u| u.name)
    } else {
        None
    };

    let ai_confidence: Option<i32> =
        sqlx::query_scalar("SELECT confidence FROM reports WHERE recording_id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await?;

    let response = TicketDetailResponse {
        id: ticket.id,
        project_id: ticket.project_id,
        project_name,
        feedback_type: ticket.feedback_type,
        ticket_status: ticket.ticket_status,
        priority: ticket.priority,
        task_description: ticket.task_description,
        submitter_name: ticket.submitter_name,
        submitter_email: ticket.submitter_email,
        assignee_id: ticket.assignee_id,
        assignee_name,
        category: ticket.category,
        page_url: ticket.page_url,
        browser_info: ticket.browser_info.0,
        video_url,
        duration_seconds: ticket.duration_seconds,
        status: ticket.status,
        ai_confidence,
        due_date: ticket.due_date,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
    };

    Ok(Json(ApiResponse::success(response)))
}

/// PUT /api/v1/tickets/:id - Update a ticket (status, priority, assignee)
pub async fn update_ticket(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTicketRequest>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    if let Some(status) = req.ticket_status {
        state.tickets.update_status(id, user.id, status).await?;
    }
    if let Some(priority) = req.priority {
        state.tickets.update_priority(id, user.id, priority).await?;
    }
    if req.assignee_id.is_some() {
        state
            .tickets
            .update_assignee(id, user.id, req.assignee_id)
            .await?;
    }

    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Ticket updated",
    ))))
}

/// POST /api/v1/tickets/:id/close - Close a ticket
pub async fn close_ticket(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    state.tickets.close(id, user.id).await?;
    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Ticket closed",
    ))))
}

/// POST /api/v1/tickets/:id/reopen - Reopen a ticket
pub async fn reopen_ticket(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    state.tickets.reopen(id, user.id).await?;
    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Ticket reopened",
    ))))
}

/// DELETE /api/v1/tickets/:id - Delete a ticket
pub async fn delete_ticket(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    state.tickets.delete(id, user.id).await?;
    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Ticket deleted",
    ))))
}

/// GET /api/v1/tickets/:id/video - Stream video file
pub async fn get_video(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Response> {
    let state = ready.get_or_unavailable().await?;
    let ticket = state
        .tickets
        .get_by_id(id)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

    if !user.is_internal() && ticket.customer_id != user.id {
        return Err(AppError::forbidden());
    }

    let path = ticket
        .video_storage_path
        .ok_or_else(|| AppError::not_found("Video not found"))?;

    let data = state
        .storage
        .download(&path)
        .await
        .map_err(|e| AppError::internal(format!("Failed to download video: {}", e)))?;

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "video/webm"),
            (header::CONTENT_DISPOSITION, "inline"),
        ],
        data,
    )
        .into_response())
}

/// GET /api/v1/tickets/:id/report - Get analysis report for a ticket
pub async fn get_report(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<crate::dto::ReportResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let ticket = state
        .tickets
        .get_by_id(id)
        .await?
        .ok_or_else(|| AppError::not_found("Ticket not found"))?;

    if !user.is_internal() && ticket.customer_id != user.id {
        return Err(AppError::forbidden());
    }

    let report =
        sqlx::query_as::<_, crate::models::Report>("SELECT * FROM reports WHERE recording_id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| {
                AppError::not_found("Report not found - analysis may still be processing")
            })?;

    let issues = sqlx::query_as::<_, crate::models::Issue>(
        "SELECT * FROM issues WHERE report_id = $1 ORDER BY severity, created_at",
    )
    .bind(report.id)
    .fetch_all(&state.db)
    .await?;

    let response = build_report_response(report, issues, &ticket);
    Ok(Json(ApiResponse::success(response)))
}

/// GET /api/v1/tickets/overview - Get overview stats
pub async fn get_overview(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
) -> Result<Json<ApiResponse<crate::services::OverviewStats>>> {
    let state = ready.get_or_unavailable().await?;
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }

    let stats = state.tickets.get_overview_stats(user.id).await?;
    Ok(Json(ApiResponse::success(stats)))
}

fn build_report_response(
    report: crate::models::Report,
    issues: Vec<crate::models::Issue>,
    _ticket: &crate::models::FeedbackTicket,
) -> crate::dto::ReportResponse {
    use crate::dto::ticket::*;
    use crate::models::ReportOutcome;

    let outcome = report.outcome.unwrap_or(ReportOutcome::Partial);

    ReportResponse {
        id: report.id,
        recording_id: report.recording_id,
        executive_summary: ExecutiveSummary {
            outcome,
            confidence: report.confidence.unwrap_or(0),
            overview: report.overview.unwrap_or_default(),
        },
        metrics: ReportMetrics {
            task_completion_rate: report.task_completion_rate.unwrap_or(0),
            total_hesitation_time: report.total_hesitation_time.unwrap_or(0),
            retries_count: report.retries_count.unwrap_or(0),
            abandonment_point: report.abandonment_point,
        },
        issues: issues
            .into_iter()
            .map(|i| IssueResponse {
                id: i.id,
                title: i.title,
                severity: i.severity,
                tags: crate::models::report::string_array_from_value(&i.tags.0),
                observed_behavior: i.observed_behavior,
                expected_behavior: i.expected_behavior,
                evidence: crate::models::report::evidence_from_value(&i.evidence.0),
                screenshots: crate::models::report::string_array_from_value(&i.screenshots.0),
                impact: crate::models::report::string_array_from_value(&i.impact.0),
                reproduction_steps: crate::models::report::string_array_from_value(
                    &i.reproduction_steps.0,
                ),
                confidence: i.confidence,
                external_ticket_url: i.external_ticket_url,
            })
            .collect(),
        question_analysis: crate::models::report::question_analysis_from_value(
            &report.question_analysis.0,
        ),
        suggested_actions: report.suggested_actions.0,
        possible_solutions: crate::models::report::string_array_from_value(
            &report.possible_solutions.0,
        ),
    }
}
