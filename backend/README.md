# Video Analyzer API

A REST API for analyzing videos using Google Gemini AI with async job processing, persistent storage, and PostgreSQL-based queue.

## Features

- ✅ Async job processing (PostgreSQL-based queue)
- ✅ Persistent storage (Local filesystem or GCS)
- ✅ Database-backed job tracking
- ✅ Background worker for processing

## Quick Start

### Prerequisites

- Rust (latest stable)
- Google Gemini API Key ([Get it here](https://aistudio.google.com/app/apikey))

### Setup

```bash
# One command setup (creates .env, gets database connection, etc.)
./setup.sh

# Edit .env and add your GEMINI_API_KEY
# Then run:
cargo run
```

Server starts at `http://localhost:3000`

**Why Gemini API Key?** The app uses Google's Gemini AI to analyze videos. The API key authenticates your requests to Gemini's API service. Get it free from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## API Reference

### Create Analysis Job

```bash
POST /api/v1/analyze
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -F "video=@video.mp4" \
  -F "prompt=Describe what's happening in this video"
```

**Response:**
```json
{
  "success": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Job Status

```bash
GET /api/v1/jobs/{job_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "started_at": "2024-01-01T00:00:01Z",
    "completed_at": "2024-01-01T00:00:05Z"
  }
}
```

### Get Job Result

```bash
GET /api/v1/jobs/{job_id}/result
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "analysis": "The video shows a person opening a can of soda...",
    "error": null,
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:00:05Z"
  }
}
```

---

## Configuration

**Variable names are the same for local (.env) and production (GitHub Actions / Cloud Run); only the values differ.** Use the same names in `.env` and in GitHub Variables/Secrets.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Gemini API key ([Get it here](https://aistudio.google.com/app/apikey)) |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | No | Auto from Terraform | PostgreSQL connection string (dev database) |
| `STORAGE_TYPE` | No | `gcs` when Terraform dev bucket exists | Storage backend: `local` or `gcs` (dev and prod use GCS) |
| `STORAGE_PATH` | No | `./storage` | Local storage path (when `STORAGE_TYPE=local` only) |
| `GCS_BUCKET` | Yes* | From Terraform `storage_bucket_name` or `dev_storage_bucket_name` | GCS bucket name (when `STORAGE_TYPE=gcs`) |
| `GCP_PROJECT_ID` | Yes* | From Terraform `project_id` | GCP project ID (when `STORAGE_TYPE=gcs`) |
| `FRONTEND_URL` | No | `http://localhost:8080` (dev) / `https://app.ortrace.com` (prod) | Frontend origin for OAuth and CORS |
| `API_URL` | No | `http://localhost:3000` (dev) / Cloud Run URL (prod) | Backend API URL (for OAuth redirects) |

*Required when using GCS storage. Run `./setup.sh` after `terraform apply` to fill dev bucket and project ID.

---

## Infrastructure

### Local Development

- **Database**: Cloud SQL PostgreSQL (dev instance with public IP, when Terraform applied)
- **Storage**: GCS dev bucket (same as prod; created by Terraform when `create_dev_database` is true). Run `gcloud auth application-default login` so the app can access the bucket.
- **Queue**: PostgreSQL-based

### Production (GCP)

Infrastructure is managed via Terraform. See `terraform/README.md` for details.

- **Database**: Cloud SQL PostgreSQL (private IP)
- **Storage**: Cloud Storage (GCS)
- **Queue**: PostgreSQL-based
- **Compute**: Cloud Run

---

## Database Access

### Development Database Connection

To view and manage the database tables visually using a database client (TablePlus, pgAdmin, DBeaver, etc.):

**Connection Details:**
- **Host:** `34.134.133.199`
- **Port:** `5432`
- **Database:** `video_analyzer_dev`
- **Username:** `app_user`
- **Password:** *(Contact Sovit for password)*

**Recommended Database Clients:**
- [TablePlus](https://tableplus.com/) (macOS, Windows, Linux) - Simple and intuitive
- [pgAdmin](https://www.pgadmin.org/) (Cross-platform) - Full-featured PostgreSQL tool
- [DBeaver](https://dbeaver.io/) (Cross-platform) - Universal database tool

**Note:** The `users` table is currently empty as authentication is not yet implemented. All jobs are created with `user_id = NULL` for now.

---

## Deployment

### Deploy Infrastructure (One Time)

```bash
cd terraform
terraform init
terraform apply
```

### Deploy API to Google Cloud Run (recommended)

1. **Infrastructure (one time):** In `terraform/`, run `terraform init` and `terraform apply` (see `terraform/README.md`). Ensure `secrets.auto.tfvars` has `jwt_secret`, `jwt_refresh_secret`, `gemini_api_key`, and Google OAuth credentials.

2. **Secrets (first time only):** If deploy fails with "Secret ... not found", run `GEMINI_API_KEY=your-key ./scripts/set-secrets.sh`.

3. **Deploy:** Build runs on GCP (Cloud Build), then deploys to Cloud Run (~5–10 min first time):
   ```bash
   ./scripts/deploy.sh
   ```
   **CI/CD:** Pushes to `main` run Backend CI; on success, the API is deployed. Config uses the **same variable names as .env** (only values differ for prod). Add **Variables**: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_ENV_NAME`, `GCP_CLOUD_SQL_CONNECTION`, `GCS_BUCKET`, `GCP_SERVICE_ACCOUNT_EMAIL`, `FRONTEND_URL`, `API_URL`. Add **Secrets**: `GCP_SA_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Easiest: run `./scripts/fill-env-github-from-terraform.sh` then `set -a && source .env.github && set +a && ./scripts/set-github-secrets.sh`.

4. **Get the production API URL:**
   ```bash
   cd terraform && terraform output cloud_run_url
   ```
   Use this URL as the API base URL in your frontend (e.g. `VITE_API_URL` or `NEXT_PUBLIC_API_URL`).

5. **OAuth redirects:** Set `api_url` in `secrets.auto.tfvars` to the `cloud_run_url` value and run `terraform apply` again so the backend uses the correct API URL for redirects.

The Cloud Run service gets all secrets from Secret Manager (DATABASE_URL, GEMINI_API_KEY, JWT_*, GOOGLE_*); no .env in production.

---

## Supported Formats

- MP4, MOV, AVI, WebM, MKV
- Maximum file size: 20MB

---

## License

MIT
