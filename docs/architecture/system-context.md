# System Context

## Purpose

This document describes the system boundaries of Flux — which external systems it interacts with, how users interact with it, and where the security perimeter lies. It is the entry-point document for any architect evaluating how Flux fits into a broader organisational technology landscape.

---

## System Context Diagram

```mermaid
C4Context
    title System Context — Flux Video Platform

    Person(user, "End User", "Uploads videos and streams content via web browser")

    System(Flux, "Flux Platform", "Distributed video processing and adaptive streaming platform")

    System_Ext(cloudfront, "AWS CloudFront", "Global CDN — serves HLS segments and thumbnails")
    System_Ext(s3, "AWS S3", "Object storage for raw uploads, HLS artifacts, thumbnails")
    System_Ext(sqs, "AWS SQS", "Message queue for transcoding jobs")
    System_Ext(apigw, "AWS API Gateway (WebSocket)", "Real-time push notifications")
    System_Ext(acm, "AWS ACM", "TLS certificate management (us-east-1 for CloudFront)")
    System_Ext(route53_like, "DNS (Namecheap/Route53)", "DNS resolution for custom domains")
    System_Ext(github, "GitHub Actions", "CI/CD — automated deployment on push to main")
    System_Ext(letsencrypt, "Let's Encrypt / Certbot", "TLS certificate for EC2 domain (API + Frontend)")

    Rel(user, Flux, "Upload video / stream video / receive status updates", "HTTPS / WSS")
    Rel(user, cloudfront, "Stream HLS segments", "HTTPS + Signed Cookies")
    Rel(Flux, s3, "Read raw video, Write HLS artifacts, Write thumbnails", "AWS SDK SigV4")
    Rel(Flux, sqs, "Publish / consume transcoding jobs", "AWS SDK SigV4")
    Rel(Flux, apigw, "Broadcast WebSocket events to clients", "AWS SDK SigV4")
    Rel(cloudfront, s3, "Fetch HLS artifacts", "OAC SigV4")
    Rel(github, Flux, "SSH deploy — git pull + docker compose up", "SSH / RSA")
    Rel(route53_like, Flux, "DNS A record pointing to EC2 Elastic IP", "DNS")
    Rel(letsencrypt, Flux, "Issue and renew TLS certs (ACME HTTP-01)", "HTTP")
    Rel(Flux, acm, "CloudFront distribution uses ACM cert for custom domain TLS", "ARN reference")
```

> **Note**: The C4Context syntax above is illustrative. Most Mermaid renderers support the `graph TD` form; the intent is identical.

---

## Simplified Mermaid Version

```mermaid
graph LR
    subgraph "Internet"
        User["End User\n(Browser)"]
        GitHub["GitHub Actions\n(CI/CD)"]
        LE["Let's Encrypt\n(ACME)"]
    end

    subgraph "AWS Edge"
        CF["CloudFront\nCDN"]
        APIGW["API Gateway\nWebSocket"]
    end

    subgraph "AWS Core (ap-south-1)"
        EC2["EC2 t3.small\n(Nginx + API + Worker + DB + Cache)"]
        S3["S3 Buckets\n(raw / processed / thumbnails)"]
        SQS["SQS + DLQ"]
        ACM["ACM Certificate\n(us-east-1)"]
    end

    User -->|"HTTPS upload\nHTTPS video management"| EC2
    User -->|"HLS streaming\n(Signed Cookies)"| CF
    User -->|"WSS real-time events"| APIGW
    GitHub -->|"SSH + git pull\ndocker compose up"| EC2
    LE -->|"HTTP-01 challenge"| EC2
    CF -->|"OAC SigV4"| S3
    APIGW -->|"HTTP POST"| EC2
    EC2 -->|"SDK PutObject/GetObject"| S3
    EC2 -->|"SDK SendMessage\nReceiveMessage"| SQS
    EC2 -->|"SDK PostToConnection"| APIGW
    SQS -->|"S3 Event Trigger"| SQS
    S3 -->|"Event Notification"| SQS
    ACM -.->|"Cert ARN referenced by"| CF
```

---

## External Systems

### AWS S3 (Three Buckets)

| Bucket | Role | Access Pattern | Lifecycle |
|---|---|---|---|
| `raw-videos` | Receives browser direct uploads via pre-signed POST | Write by browser, Read by worker | Objects auto-deleted after 7 days |
| `processed-videos` | Stores HLS artifacts (master + variant playlists + `.ts` segments) | Write by worker, Read by CloudFront (OAC) | Versioning enabled; no expiry |
| `thumbnails` | Stores JPEG thumbnails generated from video frame | Write by worker, Read by CloudFront | Versioning enabled; no expiry |

**Security model**: Both `processed-videos` and `thumbnails` have `BlockPublicAccess` fully enabled. No direct S3 URL ever reaches the browser. All access goes through CloudFront, and CloudFront authenticates to S3 using **OAC SigV4** — a more secure successor to OAI (Origin Access Identity).

---

### AWS SQS

The SQS queue acts as the decoupling layer between upload detection and transcoding. S3 fires `s3:ObjectCreated:*` events on the `raw/` prefix directly to SQS — no Lambda or SNS intermediate.

| Property | Value |
|---|---|
| Queue type | Standard (at-least-once delivery) |
| Visibility timeout | 300 seconds (5 minutes) |
| Dead Letter Queue | After 3 failed receive attempts |
| Max message retention | 4 days (default) |
| S3 trigger prefix filter | `raw/` |

---

### AWS CloudFront

A single CloudFront distribution serves both processed videos and thumbnails with two origins:

| Behavior | Origin | Auth |
|---|---|---|
| Default (`/*`) | processed-videos S3 | Signed cookies required, OAC SigV4 |
| `/thumbnails/*` | thumbnails S3 | No signed cookies required, OAC SigV4 |

- **Price class**: `PriceClass_100` (US, Europe, Asia — excludes South America, Australia for cost)
- **TLS**: ACM certificate provisioned in `us-east-1` (CloudFront requirement), SNI-only, TLS 1.2+
- **CORS**: Custom `ResponseHeadersPolicy` whitelists the frontend and API origins with `access_control_allow_credentials = true`

---

### AWS API Gateway WebSocket

A serverless WebSocket endpoint accepts connections from browsers. Connection lifecycle:

1. Browser connects → API GW fires `$connect` → HTTP POST to `upload-service/websocket/connect`
2. `upload-service` stores the `connectionId` in PostgreSQL `WebSocketConnection` table
3. Worker calls `PostToConnection` on API GW management API with `VIDEO_COMPLETED` payload
4. Browser disconnects → API GW fires `$disconnect` → connection record deleted

**Management endpoint**: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}` — the worker uses this URL to push messages via the SDK.

---

### GitHub Actions

A single workflow (`deploy.yml`) triggers on `push` to `main`. It SSHes into the EC2 instance and runs:

```bash
git fetch origin main
git reset --hard origin/main
cd infra/docker
docker compose up -d --build
docker compose restart nginx
docker image prune -f
```

**Secrets required**: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `PROJECT_PATH`

---

### Let's Encrypt / Certbot

TLS certificates for `video-processing-api.masir-projects.me` and `video-processing.masir-projects.me` are issued via Certbot ACME HTTP-01 challenge. Nginx serves the `.well-known/acme-challenge/` path from `/var/www/certbot`. Certificates are stored in `/etc/letsencrypt` and mounted read-only into the Nginx container.

---

## User Interactions

| Interaction | Flow |
|---|---|
| **Upload video** | Browser → POST `/upload/url` → API → S3 presigned POST (direct) |
| **View video list** | Browser → GET `/videos` → API → Redis (cache hit) or PostgreSQL |
| **Watch video** | Browser → GET `/videos/:id/playback-cookies` → API → cookies set → CloudFront HLS |
| **Live progress** | Browser opens WebSocket → API GW → PostgreSQL → receives `VIDEO_COMPLETED` event |
| **View pipeline status** | Browser polls GET `/videos/:id` every 7 seconds until status = `COMPLETED` |

---

## Security Boundaries

```mermaid
graph TB
    subgraph "Public Internet (Untrusted)"
        Browser
        GitHub
    end

    subgraph "TLS Boundary"
        NGINX["Nginx\n(TLS termination\nHSTS + CSP headers)"]
    end

    subgraph "Private Docker Network (Trusted)"
        API["upload-service:3000"]
        FE["frontend:3001"]
        WORKER["transcoder-worker"]
        PG["postgres:5432"]
        REDIS["redis:6379"]
    end

    subgraph "AWS IAM Boundary"
        S3
        SQS
        APIGW
    end

    subgraph "CloudFront Boundary"
        CF["CloudFront\n(Signed Cookies + OAC)"]
        S3_PROC["S3 processed-videos\n(Block all public access)"]
    end

    Browser -->|"HTTPS 443"| NGINX
    GitHub -->|"SSH 22"| EC2_HOST["EC2 (port 22 open)"]
    NGINX -->|"HTTP internal"| API
    NGINX -->|"HTTP internal"| FE
    API -.->|"Docker network"| PG
    API -.->|"Docker network"| REDIS
    WORKER -.->|"Docker network"| PG
    API -->|"IAM Role (SQS, S3, APIGW)"| SQS
    WORKER -->|"IAM Role (S3, SQS)"| S3
    WORKER -->|"IAM Role"| APIGW
    Browser -->|"HTTPS + Signed Cookies"| CF
    CF -->|"OAC SigV4 only"| S3_PROC
```

**Key security boundaries**:
- PostgreSQL and Redis are **not** exposed to the public internet (Docker internal network only)
- S3 processed bucket has all public access blocked; only CloudFront can read it
- The EC2 IAM role grants S3 and SQS access — no long-lived access keys in environment variables (IAM instance profile)
- Nginx enforces HSTS, X-Frame-Options, and X-Content-Type-Options on all responses
- Rate limiting: 100 requests per 15 minutes per IP (Express), 10 req/s with burst=20 (Nginx)
