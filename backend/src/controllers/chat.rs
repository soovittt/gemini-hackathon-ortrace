//! Chat controller

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    Extension,
};
use uuid::Uuid;

use crate::dto::{
    ApiResponse, ChatMessageResponse, EditMessageRequest, MessageResponse, SendMessageRequest,
};
use crate::error::Result;
use crate::models::User;
use crate::state::ReadyAppState;

/// GET /api/v1/recordings/:id/messages - Get chat messages for a recording
pub async fn get_messages(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(recording_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<ChatMessageResponse>>>> {
    let state = ready.get_or_unavailable().await?;
    // Verify access
    state
        .chat
        .verify_access(recording_id, user.id, user.role)
        .await?;

    // Get messages
    let messages = state.chat.get_messages(recording_id, user.id).await?;

    Ok(Json(ApiResponse::success(messages)))
}

/// POST /api/v1/recordings/:id/messages - Send a chat message
pub async fn send_message(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path(recording_id): Path<Uuid>,
    Json(req): Json<SendMessageRequest>,
) -> Result<(StatusCode, Json<ApiResponse<ChatMessageResponse>>)> {
    let state = ready.get_or_unavailable().await?;
    // Verify access
    state
        .chat
        .verify_access(recording_id, user.id, user.role)
        .await?;

    // Send message
    let message = state
        .chat
        .send_message(recording_id, user.id, user.role, req)
        .await?;

    Ok((StatusCode::CREATED, Json(ApiResponse::success(message))))
}

/// PUT /api/v1/recordings/:recording_id/messages/:message_id - Edit a message
pub async fn edit_message(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path((recording_id, message_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<EditMessageRequest>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    // Verify access to recording
    state
        .chat
        .verify_access(recording_id, user.id, user.role)
        .await?;

    // Edit message (service verifies ownership)
    state
        .chat
        .edit_message(message_id, user.id, &req.message)
        .await?;

    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Message updated",
    ))))
}

/// DELETE /api/v1/recordings/:recording_id/messages/:message_id - Delete a message
pub async fn delete_message(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Path((recording_id, message_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<MessageResponse>>> {
    let state = ready.get_or_unavailable().await?;
    // Verify access to recording
    state
        .chat
        .verify_access(recording_id, user.id, user.role)
        .await?;

    // Delete message (service verifies ownership)
    state.chat.delete_message(message_id, user.id).await?;

    Ok(Json(ApiResponse::success(MessageResponse::new(
        "Message deleted",
    ))))
}
