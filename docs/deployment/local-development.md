# Local Development Setup

This guide walks a new engineer through setting up Flux entirely on their local machine — from zero to a running application in under 30 minutes.

---

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| Docker Desktop | 24.x | [docker.com](https://docker.com) |
| Docker Compose | v2.x | Included with Docker Desktop |
| Git | 2.x | [git-scm.com](https://git-scm.com) |
| FFmpeg (optional) | 6.x | Required only for running the worker locally without Docker |
| AWS CLI | 2.x | [aws.amazon.com/cli](https://aws.amazon.com/cli) |
| Terraform | 1.6+ | [terraform.io](https://terraform.io) |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/MasirJafri1/distributed-video-processing-platform.git
cd "distributed-video-processing-platform"
```

---

## Step 2: AWS Setup

The platform requires real AWS services (S3, SQS, API Gateway, CloudFront). There is no full local mock — the services are too complex to emulate reliably with LocalStack for a portfolio setup.

### 2.1 Create AWS Account and IAM User

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Create an IAM user `Flux-dev` with programmatic access
3. Attach policies: `AmazonS3FullAccess`, `AmazonSQSFullAccess`, `CloudFrontFullAccess`, `AmazonAPIGatewayAdministrator`, `AmazonEC2FullAccess`
4. Save the Access Key ID and Secret Access Key

```bash
aws configure
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: ap-south-1
# Default output format: json
```

### 2.2 Generate CloudFront Key Pair

```bash
# Create keys directory
mkdir -p infra/keys

# Generate 2048-bit RSA key pair
openssl genrsa -out infra/keys/cloudfront-private.pem 2048
openssl rsa -pubout -in infra/keys/cloudfront-private.pem -out infra/keys/cloudfront-public.pem
```

> ⚠️ Never commit `cloudfront-private.pem` to git. It is in `.gitignore`.

### 2.3 Provision AWS Infrastructure with Terraform

```bash
cd infra/terraform/environments/dev

# Initialise providers
terraform init

# Preview changes (inspect carefully)
terraform plan

# Apply (~5-10 minutes)
terraform apply

# Save output values — you'll need them for .env
terraform output -json
```

**Expected outputs**:
```json
{
  "elastic_ip": "13.x.x.x",
  "websocket_endpoint": "wss://abc123.execute-api.ap-south-1.amazonaws.com/production",
  "cloudfront_domain": "d1abc2def3.cloudfront.net",
  "cloudfront_key_pair_id": "APKAIEXAMPLEKPID"
}
```

---

## Step 3: Configure Environment Variables

Copy the example `.env` file:

```bash
cp infra/docker/.env.example infra/docker/.env
```

Edit `infra/docker/.env` with your actual values:

```bash
# ---- Database ----
POSTGRES_USER=admin
POSTGRES_PASSWORD=ChooseAStrongPassword123!
POSTGRES_DB=video_platform

# ---- Redis ----
REDIS_PASSWORD=AnotherStrongPassword456!

# ---- CloudFront (from terraform output) ----
CLOUDFRONT_DOMAIN=d1abc2def3.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=APKAIEXAMPLEKPID
CLOUDFRONT_PRIVATE_KEY_PATH=/app/keys/cloudfront-private.pem
COOKIE_EXPIRY_HOURS=2

# ---- AWS Resources (from terraform output / AWS Console) ----
AWS_REGION=ap-south-1
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-video-processing
RAW_BUCKET_NAME=Flux-dev-masir-raw-videos
PROCESSED_BUCKET_NAME=Flux-dev-masir-processed-videos
THUMBNAIL_BUCKET_NAME=Flux-dev-masir-thumbnails

# ---- WebSocket (from terraform output) ----
websocket_endpoint=wss://abc123.execute-api.ap-south-1.amazonaws.com/production
WEBSOCKET_API_ENDPOINT=https://abc123.execute-api.ap-south-1.amazonaws.com/production

# ---- Frontend Build Args ----
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=wss://abc123.execute-api.ap-south-1.amazonaws.com/production
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=https://d1abc2def3.cloudfront.net
```

---

## Step 4: Run with Docker Compose

```bash
cd infra/docker

# Build and start all services
docker compose up -d --build

# View logs (follow mode)
docker compose logs -f

# View logs for a specific service
docker compose logs -f upload-service
docker compose logs -f transcoder-worker
```

**Expected startup order** (health-check gated):
1. `postgres` → `redis` → `upload-service` → `frontend` → `nginx`
2. `transcoder-worker` starts after `postgres`

**Verify services are up**:
```bash
docker compose ps
# NAME                STATUS          PORTS
# upload-service      healthy         0.0.0.0:3000->3000/tcp
# frontend            running         0.0.0.0:3001->3001/tcp
# nginx               running         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# postgres            running         0.0.0.0:5432->5432/tcp
# redis               running         0.0.0.0:6379->6379/tcp
# transcoder-worker   running
```

**Test the API**:
```bash
curl http://localhost:3000/health
# { "status": "healthy" }

curl http://localhost:3000/videos
# []
```

**Access the frontend**: Open [http://localhost:3001](http://localhost:3001)

---

## Step 5: Run Services Individually (Without Docker)

For faster development iteration, run services directly with Node.js:

### Upload Service

```bash
cd backend/upload-service

# Install dependencies
npm install

# Run database migrations
npx Fluxa migrate deploy
npx Fluxa generate

# Start development server (hot-reload)
npm run dev
# Server running on port 3000
```

### Frontend

```bash
cd frontend/web

# Install dependencies
npm install

# Create .env.local for Next.js
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=wss://abc123.execute-api.ap-south-1.amazonaws.com/production
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=https://d1abc2def3.cloudfront.net
EOF

# Start Next.js dev server
npm run dev
# Frontend running on http://localhost:3001
```

### Transcoder Worker

```bash
cd workers/transcoder-worker

# Install dependencies
npm install

# Ensure FFmpeg is installed on your system
ffmpeg -version

# Run database migrations
npx Fluxa migrate deploy
npx Fluxa generate

# Start the worker
npm run dev
# Worker started — polling SQS...
```

---

## Step 6: Database Management

### Connect to PostgreSQL

```bash
# Via Docker
docker exec -it postgres psql -U admin -d video_platform

# List tables
\dt

# View videos
SELECT id, "fileName", status, "createdAt" FROM "Video" ORDER BY "createdAt" DESC;

# View WebSocket connections
SELECT * FROM "WebSocketConnection";
```

### Run Fluxa Migrations

```bash
# Generate new migration after schema change (development only)
cd backend/upload-service
npx Fluxa migrate dev --name add_video_description

# Apply pending migrations (production/staging)
npx Fluxa migrate deploy

# Reset database (DANGER: deletes all data)
npx Fluxa migrate reset
```

### View Fluxa Schema

```bash
# Open Fluxa Studio (browser-based GUI)
npx Fluxa studio
# Opens at http://localhost:5555
```

---

## Step 7: Testing an Upload End-to-End

### Via cURL

```bash
# 1. Get presigned URL
RESPONSE=$(curl -s -X POST http://localhost:3000/upload/url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","contentType":"video/mp4"}')

echo $RESPONSE | jq .

# Extract values
VIDEO_ID=$(echo $RESPONSE | jq -r '.videoId')
UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')
KEY=$(echo $RESPONSE | jq -r '.key')

# 2. Upload to S3 (requires a test video file)
curl -X POST "$UPLOAD_URL" \
  -F "key=$KEY" \
  -F "Content-Type=video/mp4" \
  -F "file=@/path/to/test.mp4"

# 3. Watch worker logs as it processes
docker compose logs -f transcoder-worker

# 4. Check video status
curl http://localhost:3000/videos/$VIDEO_ID | jq .status
```

---

## Troubleshooting

### Docker container fails to start

```bash
# View container-specific error logs
docker compose logs upload-service

# Rebuild without cache
docker compose build --no-cache upload-service
docker compose up -d upload-service
```

### PostgreSQL connection refused

```bash
# Check if postgres is healthy
docker compose ps postgres

# Restart postgres
docker compose restart postgres

# Check postgres logs
docker compose logs postgres
```

### Worker not picking up jobs

```bash
# Verify SQS URL and credentials
docker compose logs transcoder-worker

# Test SQS connectivity manually
aws sqs get-queue-attributes \
  --queue-url $SQS_QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages
```

### Fluxa client not generated

```bash
cd backend/upload-service
npx Fluxa generate

# Or in Docker:
docker compose exec upload-service npx Fluxa generate
```

### CloudFront signed cookies not working

1. Verify `CLOUDFRONT_PRIVATE_KEY_PATH` points to the correct file inside the container
2. Check that the key pair ID matches the one in your CloudFront key group
3. Test cookie generation manually:
   ```bash
   curl -c cookies.txt http://localhost:3000/videos/{videoId}/playback-cookies
   cat cookies.txt
   ```

---

## Common Development Commands

```bash
# Restart a specific service
docker compose restart upload-service

# Rebuild and restart after code changes
docker compose up -d --build upload-service

# Stop all services
docker compose down

# Stop and remove volumes (DANGER: deletes database data)
docker compose down -v

# Execute command in running container
docker compose exec upload-service sh

# View real-time resource usage
docker stats

# Prune unused images
docker image prune -f
```
