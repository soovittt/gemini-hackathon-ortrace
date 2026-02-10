//! Authentication controller
//!
//! Redirect flow: GET /google/start → user at Google → GET /google/callback?code=... →
//! backend exchanges code, then redirects to frontend with JWT in fragment.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect, Response},
    Extension, Json,
};
use base64::Engine;
use rand::Rng;
use serde::Deserialize;

use crate::dto::{
    ApiResponse, AuthResponse, CompleteOnboardingRequest, GoogleTokenRequest, LoginRequest,
    RefreshTokenRequest, RegisterRequest, UserResponse,
};
use crate::error::{AppError, Result};
use crate::models::{User, UserRole};
use crate::state::ReadyAppState;

/// POST /api/v1/auth/register - Register with email/password
pub async fn register(
    State(ready): State<ReadyAppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<ApiResponse<AuthResponse>>)> {
    let state = ready.get_or_unavailable().await?;
    let role = req.role.unwrap_or(UserRole::Internal);

    let response = state
        .auth
        .register(&req.email, &req.password, req.name.as_deref(), role)
        .await?;

    Ok((StatusCode::CREATED, Json(ApiResponse::success(response))))
}

/// POST /api/v1/auth/login - Login with email/password
pub async fn login(
    State(ready): State<ReadyAppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let response = state.auth.login(&req.email, &req.password).await?;
    Ok(Json(ApiResponse::success(response)))
}

/// POST /api/v1/auth/google - Login/register with Google ID token
///
/// Request body: `{ "id_token": "<google_id_token>" }`
/// The frontend obtains the ID token from the Google Sign-In client (e.g. gapi or @react-oauth/google).
pub async fn google_auth(
    State(ready): State<ReadyAppState>,
    Json(req): Json<GoogleTokenRequest>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if state.config.google_client_id.is_empty() {
        return Err(AppError::internal(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID in the environment.",
        ));
    }
    if req.id_token.is_empty() {
        return Err(AppError::bad_request("id_token is required"));
    }

    // Verify the Google ID token
    let token_info = verify_google_token(&req.id_token, &state.config.google_client_id).await?;

    let response = state
        .auth
        .google_auth(
            &token_info.sub,
            &token_info.email,
            token_info.name.as_deref(),
            token_info.picture.as_deref(),
        )
        .await?;

    Ok(Json(ApiResponse::success(response)))
}

/// Query for GET /api/v1/auth/google/start — frontend can pass where to send the user after OAuth.
#[derive(Debug, serde::Deserialize)]
pub struct GoogleStartQuery {
    /// Where to redirect the browser after OAuth (e.g. https://app.ortrace.com/auth/callback). Must match FRONTEND_URL origin.
    pub redirect_uri: Option<String>,
}

/// GET /api/v1/auth/google/start - Redirect user to Google OAuth consent.
/// Frontend links here with ?redirect_uri=https://app.ortrace.com/auth/callback so the callback redirects there with tokens.
pub async fn google_start(
    State(ready): State<ReadyAppState>,
    Query(params): Query<GoogleStartQuery>,
) -> Result<Redirect> {
    let state = ready.get_or_unavailable().await?;
    if state.config.google_client_id.is_empty() || state.config.google_client_secret.is_empty() {
        return Err(AppError::internal(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        ));
    }
    let backend_redirect_uri = format!(
        "{}/api/v1/auth/google/callback",
        state.config.api_url.trim_end_matches('/')
    );
    tracing::info!(
        "Google OAuth redirect_uri sent to Google: {}",
        backend_redirect_uri
    );

    // Encode frontend callback URL in state so callback can redirect there (with tokens in fragment).
    let state_param = if let Some(ref uri) = params.redirect_uri {
        let uri = uri.trim();
        if uri.is_empty() {
            rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect::<String>()
        } else {
            let csrf: String = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let encoded = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(uri.as_bytes());
            format!("{}.{}", csrf, encoded)
        }
    } else {
        rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect::<String>()
    };

    let scope = urlencoding::encode("openid email profile");
    let redirect_uri_enc = urlencoding::encode(&backend_redirect_uri);
    let client_id_enc = urlencoding::encode(&state.config.google_client_id);
    let state_enc = urlencoding::encode(&state_param);
    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&access_type=offline",
        client_id_enc,
        redirect_uri_enc,
        scope,
        state_enc
    );
    Ok(Redirect::temporary(url.as_str()))
}

/// GET /api/v1/auth/google/callback - Google redirects here with ?code=...&state=...
/// Exchange code for tokens, create/link user, redirect to frontend with JWT in fragment.
#[derive(Debug, serde::Deserialize)]
pub struct GoogleCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn google_callback(
    State(ready): State<ReadyAppState>,
    Query(query): Query<GoogleCallbackQuery>,
) -> Response {
    let state = match ready.get_or_unavailable().await {
        Ok(s) => s,
        Err(_) => {
            return (axum::http::StatusCode::SERVICE_UNAVAILABLE, "starting up").into_response()
        }
    };
    let frontend_url = state.config.frontend_url.trim_end_matches('/');

    // Allowed redirect origins: frontend_url (e.g. https://app.ortrace.com) and production so prod works even if FRONTEND_URL was misconfigured.
    let allowed_origin = |u: &str| {
        !u.is_empty()
            && (u.starts_with(frontend_url) || u.starts_with("https://app.ortrace.com"))
    };

    // Resolve where to send the user with tokens: use redirect_uri from OAuth state if present and allowed.
    let success_redirect_base = query
        .state
        .as_deref()
        .and_then(|s| {
            let parts: Vec<&str> = s.splitn(2, '.').collect();
            if parts.len() != 2 {
                return None;
            }
            base64::engine::general_purpose::URL_SAFE_NO_PAD
                .decode(parts[1].as_bytes())
                .ok()
                .and_then(|b| String::from_utf8(b).ok())
        })
        .filter(|uri: &String| allowed_origin(uri.trim()))
        .unwrap_or_else(|| frontend_url.to_string());

    if let Some(err) = &query.error {
        tracing::warn!("Google OAuth callback error from Google: {}", err);
        let redirect = format!("{}/auth?error={}", frontend_url, urlencoding::encode(err));
        return Redirect::temporary(redirect.as_str()).into_response();
    }
    let code = match &query.code {
        Some(c) => c.clone(),
        None => {
            tracing::warn!("Google OAuth callback: missing code");
            let redirect = format!("{}/auth?error=missing_code", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    if state.config.google_client_id.is_empty() || state.config.google_client_secret.is_empty() {
        let redirect = format!("{}/auth?error=server_config", frontend_url);
        return Redirect::temporary(redirect.as_str()).into_response();
    }
    let redirect_uri = format!(
        "{}/api/v1/auth/google/callback",
        state.config.api_url.trim_end_matches('/')
    );
    // Exchange code for tokens
    let token_url = "https://oauth2.googleapis.com/token";
    let body = format!(
        "client_id={}&client_secret={}&code={}&redirect_uri={}&grant_type=authorization_code",
        urlencoding::encode(&state.config.google_client_id),
        urlencoding::encode(&state.config.google_client_secret),
        urlencoding::encode(&code),
        urlencoding::encode(&redirect_uri)
    );
    let client = reqwest::Client::new();
    let resp = match client
        .post(token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Google token exchange request failed: {}", e);
            let redirect = format!("{}/auth?error=exchange_failed", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {} {}", status, text);
        let redirect = format!("{}/auth?error=exchange_failed", frontend_url);
        return Redirect::temporary(redirect.as_str()).into_response();
    }
    #[derive(serde::Deserialize)]
    struct TokenResponse {
        id_token: Option<String>,
        #[allow(dead_code)]
        access_token: Option<String>,
    }
    let token_resp: TokenResponse = match resp.json().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Invalid token response: {}", e);
            let redirect = format!("{}/auth?error=invalid_response", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    let id_token = match token_resp.id_token {
        Some(t) => t,
        None => {
            let redirect = format!("{}/auth?error=no_id_token", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    let token_info = match verify_google_token(&id_token, &state.config.google_client_id).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Google OAuth: invalid id_token: {:?}", e);
            let redirect = format!("{}/auth?error=invalid_token", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    let auth_response = match state
        .auth
        .google_auth(
            &token_info.sub,
            &token_info.email,
            token_info.name.as_deref(),
            token_info.picture.as_deref(),
        )
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Google OAuth: auth_service.google_auth failed: {:?}", e);
            let redirect = format!("{}/auth?error=auth_failed", frontend_url);
            return Redirect::temporary(redirect.as_str()).into_response();
        }
    };
    let fragment = format!(
        "access_token={}&refresh_token={}&expires_in={}",
        urlencoding::encode(&auth_response.access_token),
        urlencoding::encode(&auth_response.refresh_token),
        auth_response.expires_in
    );
    let redirect_url = if success_redirect_base.ends_with("/auth/callback") {
        format!(
            "{}#{}",
            success_redirect_base.trim_end_matches('/'),
            fragment
        )
    } else {
        format!(
            "{}/auth/callback#{}",
            success_redirect_base.trim_end_matches('/'),
            fragment
        )
    };
    tracing::info!("Google OAuth success, redirecting to {}", redirect_url);
    Redirect::temporary(&redirect_url).into_response()
}

/// POST /api/v1/auth/refresh - Refresh access token
pub async fn refresh_token(
    State(ready): State<ReadyAppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Result<Json<ApiResponse<AuthResponse>>> {
    let state = ready.get_or_unavailable().await?;
    let response = state.auth.refresh_tokens(&req.refresh_token).await?;
    Ok(Json(ApiResponse::success(response)))
}

/// GET /api/v1/auth/me - Get current user info
pub async fn get_current_user(
    Extension(user): Extension<User>,
) -> Result<Json<ApiResponse<UserResponse>>> {
    Ok(Json(ApiResponse::success(UserResponse::from(user))))
}

/// POST /api/v1/auth/onboarding - Complete customer onboarding
pub async fn complete_onboarding(
    State(ready): State<ReadyAppState>,
    Extension(user): Extension<User>,
    Json(req): Json<CompleteOnboardingRequest>,
) -> Result<Json<ApiResponse<UserResponse>>> {
    let state = ready.get_or_unavailable().await?;
    if user.onboarding_completed {
        return Err(AppError::bad_request("Onboarding already completed"));
    }

    let response = state.auth.complete_onboarding(&user.id, req).await?;
    Ok(Json(ApiResponse::success(response)))
}

// ============================================================================
// Google Token Verification
// ============================================================================

/// Google tokeninfo returns email_verified as string "true"/"false"; accept both.
fn deserialize_email_verified<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(serde::Deserialize)]
    #[serde(untagged)]
    enum BoolOrString {
        Bool(bool),
        String(String),
    }
    match BoolOrString::deserialize(deserializer)? {
        BoolOrString::Bool(b) => Ok(b),
        BoolOrString::String(s) => Ok(s == "true"),
    }
}

#[derive(Debug, serde::Deserialize)]
struct GoogleTokenInfo {
    sub: String, // Google user ID
    email: String,
    #[serde(default, deserialize_with = "deserialize_email_verified")]
    email_verified: bool,
    name: Option<String>,
    picture: Option<String>,
    #[allow(dead_code)]
    aud: String, // Should match our client ID
}

async fn verify_google_token(id_token: &str, client_id: &str) -> Result<GoogleTokenInfo> {
    // Use Google's tokeninfo endpoint to verify the token (id_token must be query-encoded)
    let url = format!(
        "https://oauth2.googleapis.com/tokeninfo?id_token={}",
        urlencoding::encode(id_token)
    );

    let response = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::ExternalService(format!("Google API error: {}", e)))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .unwrap_or_else(|_| String::from("(could not read body)"));

    if !status.is_success() {
        tracing::error!("Google tokeninfo failed: status={}, body={}", status, body);
        return Err(AppError::unauthorized());
    }

    let token_info: GoogleTokenInfo = serde_json::from_str(&body).map_err(|e| {
        tracing::error!("Google tokeninfo parse error: {} body={}", e, body);
        AppError::ExternalService(format!("Invalid token response: {}", e))
    })?;

    // Verify the token was issued for our application (aud can be a string or array in OIDC)
    if token_info.aud != client_id {
        tracing::error!(
            "Google id_token audience mismatch: expected client_id={:?}, aud={:?}",
            client_id,
            token_info.aud
        );
        return Err(AppError::unauthorized());
    }

    if !token_info.email_verified {
        return Err(AppError::bad_request("Email not verified"));
    }

    Ok(token_info)
}
