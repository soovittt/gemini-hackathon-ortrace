//! Storage service abstraction (GCS)

use anyhow::{Context, Result};
use async_trait::async_trait;

use crate::config::{Config, StorageConfig, StorageType};

#[async_trait]
pub trait StorageBackend: Send + Sync {
    async fn upload(&self, path: &str, data: &[u8]) -> Result<String>;
    async fn download(&self, path: &str) -> Result<Vec<u8>>;
    async fn delete(&self, path: &str) -> Result<()>;
    #[allow(dead_code)] // Useful for production file management
    async fn exists(&self, path: &str) -> Result<bool>;
    #[allow(dead_code)] // Useful for secure file access in production
    async fn get_signed_url(&self, path: &str, expires_in_secs: u64) -> Result<String>;
}

pub struct StorageService {
    backend: Box<dyn StorageBackend>,
}

impl StorageService {
    pub fn new(config: &Config) -> Result<Self> {
        let backend: Box<dyn StorageBackend> = match &config.storage_type {
            StorageType::Gcs => {
                let gcs_storage = GcsStorage::new(&config.storage_config)?;
                Box::new(gcs_storage)
            }
            StorageType::Local => {
                let local_storage = LocalStorage::new(&config.storage_config)?;
                Box::new(local_storage)
            }
        };

        Ok(Self { backend })
    }

    pub async fn upload(&self, path: &str, data: &[u8]) -> Result<String> {
        self.backend.upload(path, data).await
    }

    pub async fn download(&self, path: &str) -> Result<Vec<u8>> {
        self.backend.download(path).await
    }

    pub async fn delete(&self, path: &str) -> Result<()> {
        self.backend.delete(path).await
    }

    #[allow(dead_code)] // Useful for production file management
    pub async fn exists(&self, path: &str) -> Result<bool> {
        self.backend.exists(path).await
    }

    #[allow(dead_code)] // Useful for secure file access in production
    pub async fn get_signed_url(&self, path: &str, expires_in_secs: u64) -> Result<String> {
        self.backend.get_signed_url(path, expires_in_secs).await
    }
}

// ============================================================================
// GCS Storage Backend
// ============================================================================

struct GcsStorage {
    bucket: String,
    #[allow(dead_code)]
    project_id: String,
    client: reqwest::Client,
}

impl GcsStorage {
    fn new(config: &StorageConfig) -> Result<Self> {
        let StorageConfig::Gcs { bucket, project_id } = config else {
            anyhow::bail!("Invalid storage config for GcsStorage");
        };

        Ok(Self {
            bucket: bucket.clone(),
            project_id: project_id.clone(),
            client: reqwest::Client::new(),
        })
    }

    fn object_url(&self, path: &str) -> String {
        format!(
            "https://storage.googleapis.com/storage/v1/b/{}/o/{}",
            self.bucket,
            urlencoding::encode(path)
        )
    }

    fn upload_url(&self, path: &str) -> String {
        format!(
            "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}",
            self.bucket,
            urlencoding::encode(path)
        )
    }

    async fn get_access_token(&self) -> Result<String> {
        // Try metadata service (when running on GCP)
        let metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

        let response = self
            .client
            .get(metadata_url)
            .header("Metadata-Flavor", "Google")
            .send()
            .await;

        if let Ok(resp) = response {
            if resp.status().is_success() {
                let json: serde_json::Value = resp.json().await?;
                if let Some(token) = json.get("access_token").and_then(|t| t.as_str()) {
                    return Ok(token.to_string());
                }
            }
        }

        // Fallback: try gcloud CLI
        let output = tokio::process::Command::new("gcloud")
            .args(["auth", "print-access-token"])
            .output()
            .await;

        if let Ok(output) = output {
            if output.status.success() {
                let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !token.is_empty() {
                    return Ok(token);
                }
            }
        }

        anyhow::bail!("GCS authentication not configured")
    }
}

#[async_trait]
impl StorageBackend for GcsStorage {
    async fn upload(&self, path: &str, data: &[u8]) -> Result<String> {
        let url = self.upload_url(path);
        let token = self.get_access_token().await?;

        self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/octet-stream")
            .body(data.to_vec())
            .send()
            .await
            .context("Failed to upload to GCS")?
            .error_for_status()
            .context("GCS upload failed")?;

        Ok(path.to_string())
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>> {
        let url = format!("{}?alt=media", self.object_url(path));
        let token = self.get_access_token().await?;

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .context("Failed to download from GCS")?
            .error_for_status()
            .context("GCS download failed")?;

        let bytes = response.bytes().await.context("Failed to read response")?;
        Ok(bytes.to_vec())
    }

    async fn delete(&self, path: &str) -> Result<()> {
        let url = self.object_url(path);
        let token = self.get_access_token().await?;

        self.client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .context("Failed to delete from GCS")?
            .error_for_status()
            .context("GCS delete failed")?;

        Ok(())
    }

    async fn exists(&self, path: &str) -> Result<bool> {
        let url = self.object_url(path);
        let token = self.get_access_token().await?;

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await?;

        Ok(response.status().is_success())
    }

    async fn get_signed_url(&self, path: &str, _expires_in_secs: u64) -> Result<String> {
        // For GCS, we'd use signed URLs in production
        // For now, return the authenticated download URL
        Ok(format!(
            "https://storage.googleapis.com/{}/{}",
            self.bucket, path
        ))
    }
}

// ============================================================================
// Local Storage Backend (for development/testing)
// ============================================================================

use std::path::PathBuf;
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

struct LocalStorage {
    base_path: PathBuf,
}

impl LocalStorage {
    fn new(config: &StorageConfig) -> Result<Self> {
        let path = match config {
            StorageConfig::Local { path } => path.clone(),
            _ => "./storage".to_string(),
        };

        let base_path = PathBuf::from(path);
        Ok(Self { base_path })
    }
}

#[async_trait]
impl StorageBackend for LocalStorage {
    async fn upload(&self, path: &str, data: &[u8]) -> Result<String> {
        let full_path = self.base_path.join(path);

        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent)
                .await
                .context("Failed to create storage directory")?;
        }

        let mut file = fs::File::create(&full_path)
            .await
            .context("Failed to create file")?;
        file.write_all(data).await.context("Failed to write file")?;

        Ok(path.to_string())
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>> {
        let full_path = self.base_path.join(path);
        let mut file = fs::File::open(&full_path)
            .await
            .with_context(|| format!("Failed to open file: {}", path))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .await
            .context("Failed to read file")?;

        Ok(buffer)
    }

    async fn delete(&self, path: &str) -> Result<()> {
        let full_path = self.base_path.join(path);
        fs::remove_file(&full_path)
            .await
            .with_context(|| format!("Failed to delete file: {}", path))?;
        Ok(())
    }

    async fn exists(&self, path: &str) -> Result<bool> {
        let full_path = self.base_path.join(path);
        Ok(full_path.exists())
    }

    async fn get_signed_url(&self, path: &str, _expires_in_secs: u64) -> Result<String> {
        // For local storage, just return a local file URL
        Ok(format!("/storage/{}", path))
    }
}
