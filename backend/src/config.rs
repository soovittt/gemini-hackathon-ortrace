//! Application configuration

use anyhow::Context;

/// App configuration loaded from environment variables
#[derive(Clone)]
pub struct Config {
    // Server
    pub port: u16,
    #[allow(dead_code)]
    pub frontend_url: String,
    #[allow(dead_code)] // Reserved for future API URL configuration
    pub api_url: String,

    // Database
    pub database_url: String,

    // Storage
    pub storage_type: StorageType,
    pub storage_config: StorageConfig,

    // Gemini AI
    pub gemini_api_key: String,

    // JWT Authentication
    pub jwt_secret: String,
    pub jwt_refresh_secret: String,

    // Google OAuth
    pub google_client_id: String,
    #[allow(dead_code)] // Reserved for future Google OAuth implementation
    pub google_client_secret: String,
}

#[derive(Clone)]
pub enum StorageType {
    Local,
    Gcs,
}

#[derive(Clone)]
pub enum StorageConfig {
    Local { path: String },
    Gcs { bucket: String, project_id: String },
}

impl Config {
    /// Load config from environment with sensible defaults.
    /// Caller must load .env (e.g. in main) before calling this; we do not load .env here
    /// to avoid overwriting vars that main set from the project-root .env.
    pub fn from_env() -> anyhow::Result<Self> {
        let storage_type = match std::env::var("STORAGE_TYPE")
            .unwrap_or_else(|_| "gcs".to_string())
            .as_str()
        {
            "local" => StorageType::Local,
            _ => StorageType::Gcs,
        };

        let storage_config = match &storage_type {
            StorageType::Local => {
                let path =
                    std::env::var("STORAGE_PATH").unwrap_or_else(|_| "./storage".to_string());
                StorageConfig::Local { path }
            }
            StorageType::Gcs => {
                let bucket = std::env::var("GCS_BUCKET")
                    .context("GCS_BUCKET required when STORAGE_TYPE=gcs")?;
                let project_id = std::env::var("GCP_PROJECT_ID")
                    .context("GCP_PROJECT_ID required when STORAGE_TYPE=gcs")?;
                StorageConfig::Gcs { bucket, project_id }
            }
        };

        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080);

        Ok(Self {
            port,
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:8080".to_string()),
            api_url: std::env::var("API_URL")
                .unwrap_or_else(|_| format!("http://localhost:{}", port)),

            database_url: std::env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgresql://postgres:postgres@localhost:5432/video_analyzer".to_string()
            }),

            storage_type,
            storage_config,

            gemini_api_key: std::env::var("GEMINI_API_KEY")
                .or_else(|_| std::env::var("GOOGLE_API_KEY"))
                .context("GEMINI_API_KEY environment variable required")?,

            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "super-secret-jwt-key-change-in-production".to_string()),
            jwt_refresh_secret: std::env::var("JWT_REFRESH_SECRET")
                .unwrap_or_else(|_| "super-secret-refresh-key-change-in-production".to_string()),

            google_client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Mutex to prevent parallel env var tests from interfering
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn with_env_vars<F, R>(vars: &[(&str, &str)], f: F) -> R
    where
        F: FnOnce() -> R,
    {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        // Save current values
        let saved: Vec<(&str, Option<String>)> = vars
            .iter()
            .map(|(k, _)| (*k, std::env::var(k).ok()))
            .collect();

        // Set test values
        for (k, v) in vars {
            std::env::set_var(k, v);
        }

        let result = f();

        // Restore
        for (k, original) in &saved {
            match original {
                Some(v) => std::env::set_var(k, v),
                None => std::env::remove_var(k),
            }
        }

        result
    }

    #[test]
    fn config_defaults_port_8080() {
        with_env_vars(
            &[("GEMINI_API_KEY", "test-key"), ("STORAGE_TYPE", "local")],
            || {
                // Remove PORT if set
                std::env::remove_var("PORT");
                let config = Config::from_env().unwrap();
                assert_eq!(config.port, 8080);
            },
        );
    }

    #[test]
    fn config_custom_port() {
        with_env_vars(
            &[
                ("PORT", "8080"),
                ("GEMINI_API_KEY", "test-key"),
                ("STORAGE_TYPE", "local"),
            ],
            || {
                let config = Config::from_env().unwrap();
                assert_eq!(config.port, 8080);
            },
        );
    }

    #[test]
    fn config_local_storage() {
        with_env_vars(
            &[
                ("STORAGE_TYPE", "local"),
                ("STORAGE_PATH", "/tmp/test"),
                ("GEMINI_API_KEY", "test-key"),
            ],
            || {
                let config = Config::from_env().unwrap();
                assert!(matches!(config.storage_type, StorageType::Local));
                assert!(
                    matches!(config.storage_config, StorageConfig::Local { ref path } if path == "/tmp/test")
                );
            },
        );
    }

    #[test]
    fn config_local_storage_default_path() {
        with_env_vars(
            &[("STORAGE_TYPE", "local"), ("GEMINI_API_KEY", "test-key")],
            || {
                std::env::remove_var("STORAGE_PATH");
                let config = Config::from_env().unwrap();
                assert!(
                    matches!(config.storage_config, StorageConfig::Local { ref path } if path == "./storage")
                );
            },
        );
    }

    #[test]
    fn config_gcs_requires_bucket() {
        with_env_vars(
            &[("STORAGE_TYPE", "gcs"), ("GEMINI_API_KEY", "test-key")],
            || {
                std::env::remove_var("GCS_BUCKET");
                std::env::remove_var("GCP_PROJECT_ID");
                let result = Config::from_env();
                assert!(result.is_err());
            },
        );
    }

    #[test]
    fn config_jwt_defaults() {
        with_env_vars(
            &[("GEMINI_API_KEY", "test-key"), ("STORAGE_TYPE", "local")],
            || {
                std::env::remove_var("JWT_SECRET");
                std::env::remove_var("JWT_REFRESH_SECRET");
                let config = Config::from_env().unwrap();
                assert_eq!(
                    config.jwt_secret,
                    "super-secret-jwt-key-change-in-production"
                );
                assert_eq!(
                    config.jwt_refresh_secret,
                    "super-secret-refresh-key-change-in-production"
                );
            },
        );
    }

    #[test]
    fn config_requires_gemini_api_key() {
        with_env_vars(&[("STORAGE_TYPE", "local")], || {
            std::env::remove_var("GEMINI_API_KEY");
            std::env::remove_var("GOOGLE_API_KEY");
            let result = Config::from_env();
            assert!(result.is_err());
        });
    }

    #[test]
    fn config_accepts_google_api_key_as_fallback() {
        with_env_vars(
            &[
                ("GOOGLE_API_KEY", "fallback-key"),
                ("STORAGE_TYPE", "local"),
            ],
            || {
                std::env::remove_var("GEMINI_API_KEY");
                let config = Config::from_env().unwrap();
                assert_eq!(config.gemini_api_key, "fallback-key");
            },
        );
    }

    #[test]
    fn config_frontend_url_default() {
        with_env_vars(
            &[("GEMINI_API_KEY", "test-key"), ("STORAGE_TYPE", "local")],
            || {
                std::env::remove_var("FRONTEND_URL");
                let config = Config::from_env().unwrap();
                assert_eq!(config.frontend_url, "http://localhost:8080");
            },
        );
    }
}
