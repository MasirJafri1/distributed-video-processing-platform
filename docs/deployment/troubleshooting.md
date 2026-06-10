# Troubleshooting Guide

Real-world issues encountered during Flux development and operation, with root cause analysis and resolution steps.

---

## Issue Index

| # | Issue | Category |
|---|---|---|
| 1 | [Terraform Provider Authentication Failure](#1-terraform-provider-authentication-failure) | Infrastructure |
| 2 | [S3 NoSuchKey on Worker Download](#2-s3-nosuchkey-on-worker-download) | Storage |
| 3 | [CloudFront 403 Forbidden on HLS Playback](#3-cloudfront-403-forbidden-on-hls-playback) | CDN |
| 4 | [Signed Cookie Not Working / Browser Ignores Cookies](#4-signed-cookie-not-working) | Security |
| 5 | [Docker Permission Denied](#5-docker-permission-denied) | Docker |
| 6 | [Fluxa Migration Fails](#6-Fluxa-migration-fails) | Database |
| 7 | [FFmpeg Transcoding Failure](#7-ffmpeg-transcoding-failure) | Worker |
| 8 | [CORS Error on Video Upload](#8-cors-error-on-video-upload) | API |
| 9 | [EC2 Restart / Service Not Coming Back](#9-ec2-restart-service-not-coming-back) | Infrastructure |
| 10 | [SQS Message Stuck / DLQ Accumulation](#10-sqs-message-stuck--dlq-accumulation) | Queue |
| 11 | [Redis Authentication Error](#11-redis-authentication-error) | Cache |
| 12 | [Rate Limit 429 on Large Upload](#12-rate-limit-429-on-large-upload) | API |
| 13 | [WebSocket Connection Drops Immediately](#13-websocket-connection-drops-immediately) | WebSocket |
| 14 | [CloudFront Returns Stale Content](#14-cloudfront-returns-stale-content) | CDN |

---

## 1. Terraform Provider Authentication Failure

### Symptoms
```
Error: error configuring S3 Backend: no valid credential sources found
Error: Error building AWS Provider: error configuring Terraform AWS Provider: no valid credential sources found
```

### Root Cause

Terraform cannot find valid AWS credentials. This happens when:
- `aws configure` has not been run
- The IAM user's access keys are expired or missing
- The `~/.aws/credentials` file is missing or malformed

### Resolution

```bash
# Verify AWS credentials are configured
aws configure list

# Test credentials
aws sts get-caller-identity

# If not configured, re-run
aws configure
# Enter your Access Key ID, Secret Access Key, region (ap-south-1)
```

### Prevention

- Use IAM user with appropriate permissions for Terraform applies
- Set up a `.aws/credentials` profile specifically for this project: `aws configure --profile Flux`
- Use `AWS_PROFILE=Flux terraform apply`

---

## 2. S3 NoSuchKey on Worker Download

### Symptoms

Worker logs:
```
{"level":"error","msg":"NoSuchKey: The specified key does not exist.","s3Key":"raw/a1b2c3d4-my-video.mp4"}
Video processing failed
```

### Root Cause

Several possible causes:
1. The SQS message was processed before S3 finished writing the object (eventual consistency — rare with newer S3 versions)
2. The S3 key was URL-encoded in the SQS event but the worker decoded it incorrectly
3. The object was deleted by the 7-day lifecycle before the worker processed it
4. The worker is pointing to the wrong `RAW_BUCKET_NAME`

### Resolution

```bash
# 1. Verify the key exists in S3
aws s3 ls s3://Flux-dev-masir-raw-videos/raw/ --region ap-south-1

# 2. Check the exact key from the SQS message
# Look at worker logs for the s3Key value

# 3. Test manual download
aws s3 cp s3://Flux-dev-masir-raw-videos/raw/a1b2c3d4-my-video.mp4 /tmp/test.mp4

# 4. Verify environment variable
docker compose exec transcoder-worker env | grep RAW_BUCKET_NAME

# 5. Check for URL encoding issues
# The worker does: decodeURIComponent(record.s3.object.key)
# If the filename contains spaces/special chars, this could fail
```

### Prevention

- Enforce filename sanitization (alphanumeric + hyphen/underscore only) in the upload controller
- Add retry logic in the worker for transient S3 errors

---

## 3. CloudFront 403 Forbidden on HLS Playback

### Symptoms

HLS.js console:
```
Error loading media: File could not be played
XMLHttpRequest error: 403
GET https://cdn.masir-projects.me/hls/a1b2c3d4-..../master.m3u8 403 Forbidden
```

### Root Cause

**Most common causes** (in order of likelihood):
1. **Missing or expired signed cookies** — cookies were never requested or have expired
2. **Wrong cookie domain** — cookies set on the wrong domain and not sent to CloudFront
3. **S3 bucket policy not updated** — bucket doesn't allow CloudFront OAC access
4. **Mismatched key pair ID** — `CLOUDFRONT_KEY_PAIR_ID` doesn't match the key in the CloudFront key group
5. **Cookie resource mismatch** — cookie resource pattern doesn't match the requested URL

### Resolution

```bash
# Step 1: Verify cookies are being set
# In browser DevTools → Application → Cookies → check for CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id

# Step 2: Verify cookies are being sent with CloudFront requests
# DevTools → Network → select an HLS request → Request Headers → check for Cookie header

# Step 3: Test cookie issuance
curl -c cookies.txt -I https://video-processing-api.masir-projects.me/videos/{videoId}/playback-cookies
cat cookies.txt  # Should show 3 CloudFront-* cookies

# Step 4: Verify S3 bucket policy
aws s3api get-bucket-policy --bucket Flux-dev-masir-processed-videos | jq .

# Step 5: Check CloudFront key group configuration
aws cloudfront list-key-groups  # Find your key group
# Verify the key pair ID matches CLOUDFRONT_KEY_PAIR_ID in .env

# Step 6: Test direct CloudFront access with cookies
curl -b cookies.txt "https://cdn.masir-projects.me/hls/{videoId}/master.m3u8"
```

**Cookie domain issue**: If the API is at `api.domain.com` and sets cookies for `.domain.com`, CloudFront at `cdn.domain.com` should receive them. Verify `COOKIE_DOMAIN=.masir-projects.me` (note leading dot).

### Prevention

- Always request playback cookies before initializing HLS.js
- Include cookie expiry UI feedback
- Add automatic cookie refresh 5 minutes before expiry

---

## 4. Signed Cookie Not Working

### Symptoms

- API returns 200 with `Set-Cookie` headers
- Browser doesn't store cookies OR doesn't send them to CloudFront
- DevTools shows cookies present but CloudFront still returns 403

### Root Cause

`SameSite=None; Secure` cookies require HTTPS. In local development with HTTP:
- Browsers refuse to store `SameSite=None; Secure` cookies over HTTP

OR:

The cookie `Domain` attribute is too specific (missing leading dot):
```
# Wrong: Domain=cdn.masir-projects.me
# Correct: Domain=.masir-projects.me
```

### Resolution

```bash
# Check cookie attributes in browser DevTools
# Application → Cookies → CloudFront-Policy
# Look for: SameSite=None, Secure, Domain=.masir-projects.me

# For local development: use NEXT_PUBLIC_USE_HLS_PROXY=true
# which routes HLS through the backend instead of direct CloudFront
```

**Local development workaround**: The frontend supports an HLS proxy mode where HLS requests are routed through the backend (which has backend access to S3/CloudFront). Set `NEXT_PUBLIC_USE_HLS_PROXY=true` in your local `.env.local`.

---

## 5. Docker Permission Denied

### Symptoms

```
Got permission denied while trying to connect to the Docker daemon socket
permission denied: /var/run/docker.sock
```

### Root Cause

The current user is not in the `docker` group.

### Resolution

```bash
# Add user to docker group
sudo usermod -aG docker ubuntu

# Apply group change (requires logout/login or)
newgrp docker

# Verify
docker ps
```

### Prevention

Include this step in the initial server setup script.

---

## 6. Fluxa Migration Fails

### Symptoms

```
Error: P1001: Can't reach database server at `postgres`:`5432`
Error: P3006: Migration `20250101_init` failed to apply cleanly to the shadow database
```

### Root Cause

- **P1001**: PostgreSQL is not running or the `DATABASE_URL` is wrong
- **P3006**: Migration file has SQL errors, or a previous failed migration left the schema in a broken state

### Resolution

```bash
# Check if postgres is running
docker compose ps postgres
docker compose logs postgres

# Verify DATABASE_URL is correct
docker compose exec upload-service env | grep DATABASE_URL

# For P3006: reset and re-apply (DANGER in production)
docker compose exec upload-service npx Fluxa migrate reset

# Apply migrations cleanly
docker compose exec upload-service npx Fluxa migrate deploy

# Verify migration status
docker compose exec upload-service npx Fluxa migrate status
```

### Prevention

- Always test migrations in a local environment before applying to production
- Use `Fluxa migrate dev` in development, `Fluxa migrate deploy` in production
- Never manually edit migration SQL files

---

## 7. FFmpeg Transcoding Failure

### Symptoms

Worker logs:
```
{"level":"error","msg":"ffmpeg exited with code 1: Invalid data found when processing input"}
{"level":"error","msg":"ffmpeg exited with code 1: No such file or directory"}
```

### Root Cause

1. **"Invalid data"**: The input video file is corrupted, truncated (incomplete upload), or in an unsupported format
2. **"No such file"**: The temp directory was not created, or the `inputPath` is wrong
3. **FFmpeg not installed**: Worker container doesn't have FFmpeg in its PATH

### Resolution

```bash
# Check if FFmpeg is available in the worker container
docker compose exec transcoder-worker which ffmpeg
docker compose exec transcoder-worker ffmpeg -version

# Test FFmpeg manually on the input file
docker compose exec transcoder-worker ffprobe /app/temp/input.mp4

# Check if temp directories exist
docker compose exec transcoder-worker ls -la /app/temp/

# For corrupted uploads: check if the S3 file is intact
aws s3 cp s3://Flux-dev-masir-raw-videos/raw/{key} /tmp/test.mp4
ffprobe /tmp/test.mp4
```

**Dockerfile check**: Ensure the worker Dockerfile installs FFmpeg:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
```

### Prevention

- Add pre-flight video validation before transcoding: `ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets inputfile`
- Validate file size > 0 before starting transcoding
- Set `UPLOAD_MAX_SIZE` enforcement on the S3 pre-signed POST condition

---

## 8. CORS Error on Video Upload

### Symptoms

Browser console:
```
Access to XMLHttpRequest at 'https://...s3.amazonaws.com/' from origin 'http://localhost:3001' has been blocked by CORS policy
```

### Root Cause

The S3 bucket's CORS configuration doesn't allow requests from the browser's origin. The raw-videos bucket CORS allows `allowed_origins = ["*"]` but S3 evaluates CORS only when an `Origin` header is present in the request.

### Resolution

```bash
# Check S3 bucket CORS configuration
aws s3api get-bucket-cors --bucket Flux-dev-masir-raw-videos

# Expected:
# {
#   "CORSRules": [{
#     "AllowedHeaders": ["*"],
#     "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
#     "AllowedOrigins": ["*"],
#     "ExposeHeaders": ["ETag"],
#     "MaxAgeSeconds": 3000
#   }]
# }

# Apply CORS via Terraform (it should already be configured)
terraform apply -target=module.s3
```

For the Upload API CORS:
```bash
# Check Express CORS settings
# The API uses cors({ origin: true, credentials: true })
# This should work for all origins

# Test with curl
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/upload/url \
     -v
# Look for Access-Control-Allow-Origin in response headers
```

---

## 9. EC2 Restart / Service Not Coming Back

### Symptoms

After `sudo reboot` or AWS stop/start of the instance, services are not running. `docker compose ps` shows all containers as `Exit 0`.

### Root Cause

Docker services need to be configured with a restart policy, and Docker itself needs to be set to start on boot.

### Resolution

```bash
# Verify Docker starts on boot
sudo systemctl is-enabled docker
# Should return "enabled"
# If not:
sudo systemctl enable docker

# Check if containers have restart policy
docker inspect upload-service | jq '.[].HostConfig.RestartPolicy'
# Should be: { "Name": "unless-stopped", "MaximumRetryCount": 0 }

# If not set, containers won't auto-restart on reboot
# Solution: always use docker compose up -d (which sets unless-stopped by default)

# Manually start after reboot
cd /home/ubuntu/distributed-video-processing-platform/infra/docker
docker compose up -d

# Run Fluxa migrations after DB restart
docker compose exec upload-service npx Fluxa migrate deploy
```

### Prevention

- Ensure `docker.service` is enabled: `sudo systemctl enable docker`
- Use `docker compose up -d` (not `docker compose start`) — the `-d` flag with `up` implies `restart: unless-stopped`
- Set up a startup script or systemd service that runs `docker compose up -d` on boot

---

## 10. SQS Message Stuck / DLQ Accumulation

### Symptoms

- CloudWatch shows DLQ messages increasing
- Videos stuck in `UPLOADED` status
- Worker logs show repeated failures

### Root Cause

1. **Worker crash during processing**: Message becomes visible after visibility timeout (300s) and is retried
2. **Corrupted video file**: FFmpeg fails consistently → message moves to DLQ after 3 attempts
3. **Database connection failure**: Worker cannot update status
4. **S3 permissions error**: Worker cannot upload to processed bucket

### Resolution

```bash
# Check DLQ message count
aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-dlq \
  --attribute-names ApproximateNumberOfMessages

# Receive DLQ messages to inspect them
aws sqs receive-message \
  --queue-url https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-dlq \
  --max-number-of-messages 1 | jq .

# Replay a DLQ message back to the main queue (after fixing the bug)
aws sqs send-message \
  --queue-url https://sqs.ap-south-1.amazonaws.com/123456789012/Flux-dev-video-processing \
  --message-body "$(aws sqs receive-message --queue-url {dlq-url} | jq -r '.Messages[0].Body')"

# Delete the DLQ message after replaying
aws sqs delete-message \
  --queue-url {dlq-url} \
  --receipt-handle {receipt-handle}
```

---

## 11. Redis Authentication Error

### Symptoms

```
{"level":"error","msg":"NOAUTH Authentication required"}
Error: ReplyError: NOAUTH Authentication required.
```

### Root Cause

The `REDIS_URL` is missing the password, or the password doesn't match the `--requirepass` value.

### Resolution

```bash
# Check Redis URL format
# Correct: redis://:password@redis:6379
# Wrong:   redis://redis:6379 (missing password)

docker compose exec upload-service env | grep REDIS_URL

# Test Redis connection manually
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
# Should respond: PONG

# If password mismatch, update .env REDIS_PASSWORD and restart
docker compose restart upload-service transcoder-worker redis
```

---

## 12. Rate Limit 429 on Large Upload

### Symptoms

Browser shows:
```
POST /upload/url
Status: 429 Too Many Requests
{"message": "Too many requests"}
```

This happens on large multi-part uploads or rapid upload attempts.

### Root Cause

The Express rate limiter (`100 requests / 15 minutes per IP`) counts the pre-flight OPTIONS request AND the actual POST. The Nginx rate limiter also fires (`10 req/s burst=20`).

### Resolution

The upload pre-signed URL request is a single API call. Multiple 429s would indicate the user is submitting the upload form repeatedly. The rate limit is intentional.

For legitimate high-throughput use cases:
```js
// Increase the window in backend/upload-service/src/index.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,  // Increase from 100 to 500
  message: "Too many requests",
});
```

For Nginx (for upload endpoint specifically):
```nginx
# Nginx rate limit with higher burst for the upload URL endpoint
location /upload/ {
  limit_req zone=general burst=50 nodelay;
  proxy_pass http://upload-service:3000;
}
```

---

## 13. WebSocket Connection Drops Immediately

### Symptoms

Browser console:
```
WebSocket connection to 'wss://...execute-api.amazonaws.com/production' failed
WebSocket is closed before the connection is established.
```

### Root Cause

1. API Gateway cannot reach the backend `$connect` integration URL
2. The backend `POST /websocket/connect` returns non-200
3. API Gateway WebSocket stage is not deployed

### Resolution

```bash
# Verify the WebSocket stage is deployed
aws apigatewayv2 get-stages \
  --api-id {api-id} \
  --region ap-south-1

# Test the connect integration manually
curl -X POST https://video-processing-api.masir-projects.me/websocket/connect \
  -H "x-connection-id: test123" \
  -H "Content-Type: application/json"

# Check API Gateway logs in CloudWatch
# API GW → Your API → Stages → production → Logs/Tracing → Enable execution logging
```

---

## 14. CloudFront Returns Stale Content

### Symptoms

After a worker uploads new HLS segments, the browser still gets old (or empty) content from CloudFront.

### Root Cause

CloudFront caches objects based on `Cache-Control` headers. If no headers are set, CloudFront uses its default TTL (usually 24 hours or the distribution-level default).

### Resolution

```bash
# Create a cache invalidation for a specific video
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/hls/${VIDEO_ID}/*"

# Invalidate all (emergency only — expensive)
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths "/*"
```

### Prevention

Set appropriate `Cache-Control` headers when uploading to S3 in the worker:

```js
// In s3.service.js uploadFile()
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  Body: fileStream,
  ContentType: contentType,
  CacheControl: key.endsWith(".ts")
    ? "max-age=31536000, immutable"  // Segments never change
    : "max-age=3600",               // Playlists cached 1 hour
});
```
