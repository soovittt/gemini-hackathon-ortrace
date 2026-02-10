//! Authentication middleware

use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::{IntoResponse, Response},
    Extension,
};

use crate::error::AppError;
use crate::state::ReadyAppState;

/// Extract and validate JWT token from Authorization header
pub async fn auth_middleware(
    State(ready): State<ReadyAppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let state = ready.get().await.ok_or(AppError::ServiceUnavailable)?;
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => &h[7..],
        _ => return Err(AppError::unauthorized()),
    };

    let claims = state.auth.validate_access_token(token)?;

    let user = state
        .auth
        .find_user_by_id(&claims.sub)
        .await?
        .ok_or_else(AppError::unauthorized)?;

    // Add user to request extensions
    request.extensions_mut().insert(user);

    Ok(next.run(request).await)
}

/// Optional auth - doesn't fail if no token, but adds user if valid
#[allow(dead_code)] // Reserved for future public endpoints that optionally use auth
pub async fn optional_auth_middleware(
    State(ready): State<ReadyAppState>,
    mut request: Request,
    next: Next,
) -> Response {
    let state = match ready.get().await {
        Some(s) => s,
        None => {
            return (axum::http::StatusCode::SERVICE_UNAVAILABLE, "starting up").into_response()
        }
    };
    if let Some(auth_header) = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
    {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            if let Ok(claims) = state.auth.validate_access_token(token) {
                if let Ok(Some(user)) = state.auth.find_user_by_id(&claims.sub).await {
                    request.extensions_mut().insert(user);
                }
            }
        }
    }

    next.run(request).await
}

/// Require internal user role
#[allow(dead_code)] // Reserved for future route-specific middleware
pub async fn internal_only_middleware(
    Extension(user): Extension<crate::models::User>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if !user.is_internal() {
        return Err(AppError::forbidden());
    }
    Ok(next.run(request).await)
}

/// Require completed onboarding for customers
#[allow(dead_code)] // Reserved for future route protection
pub async fn onboarding_required_middleware(
    Extension(user): Extension<crate::models::User>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if user.is_customer() && !user.onboarding_completed {
        return Err(AppError::BadRequest(
            "Please complete onboarding first".to_string(),
        ));
    }
    Ok(next.run(request).await)
}
