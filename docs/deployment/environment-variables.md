# Environment Variables Reference

This document provides a complete reference for every environment variable used by Flux. Variables are set in `infra/docker/.env` and consumed by all services via Docker Compose.

---

## Security Classifications

| Classification | Meaning |
|---|---|
| 🔴 **Secret** | Must never be committed to git or logged. Rotate periodically. |
| 🟡 **Sensitive** | Not a cryptographic secret but contains infrastructure details. |
| 🟢 **Public** | Safe to commit. Embedded in build artifacts (e.g., Next.js public vars). |

---

## Database Variables

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `POSTGRES_USER` | Yes | 🟡 Sensitive | `admin` | PostgreSQL username. Used by the postgres container to create the database and by services to authenticate. |
| `POSTGRES_PASSWORD` | Yes | 🔴 Secret | `MyStr0ngP@ss!` | PostgreSQL password. Must be complex (16+ chars, mixed case, numbers, symbols). |
| `POSTGRES_DB` | Yes | 🟡 Sensitive | `video_platform` | Database name created on postgres startup and referenced in `DATABASE_URL`. |
| `DATABASE_URL` | Yes | 🔴 Secret | `postgresql://admin:password@postgres:5432/video_platform` | Full PostgreSQL connection string. Constructed by Docker Compose from the above variables. Not set in `.env` directly — composed inline. |

**How `DATABASE_URL` is constructed in `docker-compose.yml`**:
```yaml
environment:
  DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

---

## Redis Variables

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `REDIS_PASSWORD` | Yes | 🔴 Secret | `AnotherStr0ng#Pass` | Redis auth password. Set via `redis-server --requirepass` in the container command. |
| `REDIS_URL` | Yes | 🔴 Secret | `redis://:password@redis:6379` | Full Redis connection URL. Constructed from `REDIS_PASSWORD` by Docker Compose. |

**How `REDIS_URL` is constructed**:
```yaml
environment:
  REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

---

## CloudFront Variables

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `CLOUDFRONT_DOMAIN` | Yes | 🟡 Sensitive | `d1abc2def3.cloudfront.net` or `cdn.masir-projects.me` | CloudFront distribution domain. Used to construct playback URLs and cookie resource patterns. |
| `CLOUDFRONT_KEY_PAIR_ID` | Yes | 🟡 Sensitive | `APKAIEXAMPLEKPID` | ID of the CloudFront public key in the key group. Output by `terraform output cloudfront_key_pair_id`. |
| `CLOUDFRONT_PRIVATE_KEY_PATH` | Conditional | 🔴 Secret | `/app/keys/cloudfront-private.pem` | Filesystem path to the RSA private key inside the container. Used when the key is mounted as a file. |
| `CLOUDFRONT_PRIVATE_KEY` | Conditional | 🔴 Secret | `-----BEGIN RSA PRIVATE KEY-----\n...` | Inline PEM content with `\n` escaped as `\\n`. Used instead of `CLOUDFRONT_PRIVATE_KEY_PATH` for Docker/CI environments where file mounts are impractical. |
| `COOKIE_EXPIRY_HOURS` | No | 🟢 Public | `2` | Number of hours before signed cookies expire. Default: `2`. Increasing this reduces cookie refresh frequency but increases the window for cookie theft. |
| `COOKIE_DOMAIN` | No | 🟡 Sensitive | `.masir-projects.me` | Cookie domain scope (note leading dot for subdomain sharing). Default: `.masir-projects.me`. |

> ⚠️ Set **either** `CLOUDFRONT_PRIVATE_KEY_PATH` or `CLOUDFRONT_PRIVATE_KEY`, not both. The service checks `CLOUDFRONT_PRIVATE_KEY_PATH` first.

---

## AWS Resource Variables

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `AWS_REGION` | Yes | 🟡 Sensitive | `ap-south-1` | AWS region where all resources are provisioned. The EC2 IAM instance profile provides credentials automatically — no `AWS_ACCESS_KEY_ID` needed. |
| `SQS_QUEUE_URL` | Yes | 🟡 Sensitive | `https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-video-processing` | Full SQS queue URL. Used by both the worker (to poll) and was intended for the upload service (to publish). |
| `RAW_BUCKET_NAME` | Yes | 🟡 Sensitive | `Flux-dev-masir-raw-videos` | S3 bucket name for raw uploaded videos. Used by the upload service to generate pre-signed POST URLs and by the worker to download videos. |
| `PROCESSED_BUCKET_NAME` | Yes | 🟡 Sensitive | `Flux-dev-masir-processed-videos` | S3 bucket name for HLS artifacts (segments, playlists). Used by the worker to upload processed content. |
| `THUMBNAIL_BUCKET_NAME` | No | 🟡 Sensitive | `Flux-dev-masir-thumbnails` | S3 bucket name for thumbnails. Falls back to `PROCESSED_BUCKET_NAME` if not set. |

> **Note**: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are intentionally NOT in the environment variables. The EC2 IAM instance profile provides credentials automatically via the EC2 metadata service (IMDSv2). Never add long-lived credentials to `.env`.

---

## WebSocket Variables

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `websocket_endpoint` | Yes | 🟡 Sensitive | `wss://abc123.execute-api.ap-south-1.amazonaws.com/production` | WSS URL for browser WebSocket connections. Note: lowercase key is intentional (frontend build arg). |
| `WEBSOCKET_API_ENDPOINT` | Yes | 🟡 Sensitive | `https://abc123.execute-api.ap-south-1.amazonaws.com/production` | HTTPS management API endpoint used by the worker's `ApiGatewayManagementApiClient` to call `PostToConnection`. Note: **different protocol** from `websocket_endpoint` (https, not wss). |

---

## Frontend Build Arguments

These variables are injected at **Docker build time** as `ARG` values into the Next.js build. They are baked into the client-side JavaScript bundle and are **not secret**.

| Variable | Required | Classification | Example | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | 🟢 Public | `https://video-processing-api.masir-projects.me` | Base URL of the Upload Service REST API. Prefixed with `NEXT_PUBLIC_` so Next.js exposes it to browser-side code. |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Yes | 🟢 Public | `wss://abc123.execute-api.ap-south-1.amazonaws.com/production` | WebSocket endpoint URL for the frontend to connect to API Gateway. |
| `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` | Yes | 🟢 Public | `https://cdn.masir-projects.me` | CloudFront domain with `https://` prefix. Used by the frontend to construct playback URLs. |

**How build args are passed in `docker-compose.yml`**:
```yaml
frontend:
  build:
    context: ../../frontend/web
    args:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_WEBSOCKET_URL: ${NEXT_PUBLIC_WEBSOCKET_URL}
      NEXT_PUBLIC_CLOUDFRONT_DOMAIN: ${NEXT_PUBLIC_CLOUDFRONT_DOMAIN}
```

**Important**: Changing `NEXT_PUBLIC_*` variables requires a **full rebuild** of the frontend Docker image (`docker compose build frontend`) because they are embedded in the compiled JavaScript at build time, not at runtime.

---

## Internal/Derived Variables

These are set by Docker Compose directly, not from `.env`:

| Variable | Set By | Value |
|---|---|---|
| `DATABASE_URL` | Docker Compose inline | `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}` |
| `REDIS_URL` | Docker Compose inline | `redis://:${REDIS_PASSWORD}@redis:6379` |
| `API_URL` | Docker Compose (worker) | `http://upload-service:3000` |
| `PORT` | Docker Compose (frontend) | `3001` |

---

## Variable Lookup by Service

### Upload Service

```
CLOUDFRONT_DOMAIN, CLOUDFRONT_KEY_PAIR_ID, CLOUDFRONT_PRIVATE_KEY_PATH (or CLOUDFRONT_PRIVATE_KEY),
COOKIE_EXPIRY_HOURS, COOKIE_DOMAIN,
AWS_REGION, RAW_BUCKET_NAME, PROCESSED_BUCKET_NAME,
WEBSOCKET_API_ENDPOINT,
DATABASE_URL (derived), REDIS_URL (derived)
```

### Transcoder Worker

```
AWS_REGION, RAW_BUCKET_NAME, PROCESSED_BUCKET_NAME, THUMBNAIL_BUCKET_NAME,
SQS_QUEUE_URL, WEBSOCKET_API_ENDPOINT,
DATABASE_URL (derived), REDIS_URL (derived)
```

### PostgreSQL Container

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
```

### Redis Container

```
REDIS_PASSWORD (via command: redis-server --requirepass ${REDIS_PASSWORD})
```

### Frontend (Build Time)

```
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WEBSOCKET_URL, NEXT_PUBLIC_CLOUDFRONT_DOMAIN
```

---

## Complete `.env.example` File

```bash
# ============================================
# Production Secrets Template
# Rename to .env and fill in secure values
# ============================================

# ---- Database ----
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_db_password_here
POSTGRES_DB=video_platform

# ---- Redis ----
REDIS_PASSWORD=your_secure_redis_password_here

# ---- CloudFront ----
CLOUDFRONT_DOMAIN=your-cdn-domain.your-domain.com
CLOUDFRONT_KEY_PAIR_ID=your_key_pair_id_from_terraform
CLOUDFRONT_PRIVATE_KEY_PATH=/app/keys/cloudfront-private.pem
COOKIE_EXPIRY_HOURS=2
# CLOUDFRONT_PRIVATE_KEY=  # Alternative: inline PEM for CI/CD

# ---- AWS Resources ----
AWS_REGION=ap-south-1
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-video-processing
RAW_BUCKET_NAME=Flux-dev-masir-raw-videos
PROCESSED_BUCKET_NAME=Flux-dev-masir-processed-videos
THUMBNAIL_BUCKET_NAME=Flux-dev-masir-thumbnails

# ---- WebSocket ----
websocket_endpoint=wss://your-api-id.execute-api.ap-south-1.amazonaws.com/production
WEBSOCKET_API_ENDPOINT=https://your-api-id.execute-api.ap-south-1.amazonaws.com/production

# ---- Frontend Build Args ----
NEXT_PUBLIC_API_URL=https://your-api.your-domain.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-api-id.execute-api.ap-south-1.amazonaws.com/production
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=https://your-cdn-domain.your-domain.com
```

---

## Validating Variables at Startup

The upload service logs a warning if CloudFront signing is not configured:

```js
if (!privateKey || !KEY_PAIR_ID || !CLOUDFRONT_DOMAIN) {
  logger.warn("No CloudFront private key configured — signed cookies will not work");
}
```

For stricter validation at startup, consider adding:

```js
const REQUIRED_VARS = [
  "DATABASE_URL", "REDIS_URL", "AWS_REGION",
  "RAW_BUCKET_NAME", "PROCESSED_BUCKET_NAME",
  "CLOUDFRONT_DOMAIN", "CLOUDFRONT_KEY_PAIR_ID",
  "WEBSOCKET_API_ENDPOINT"
];

REQUIRED_VARS.forEach(varName => {
  if (!process.env[varName]) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```
