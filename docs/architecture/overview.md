# Architecture Overview

## Executive Summary

**Flux** is a cloud-native distributed video processing and adaptive streaming platform built on AWS. It enables users to upload raw video files, automatically transcode them into multiple HLS (HTTP Live Streaming) quality variants, and deliver them globally via a CloudFront CDN — all in real time, with live WebSocket status updates pushed to the browser.

The platform is built using the **event-driven worker pattern**: a lightweight upload service offloads all compute-intensive FFmpeg transcoding to a dedicated background worker that consumes jobs from an SQS queue, ensuring the API layer remains fast and non-blocking regardless of video size or transcoding load.

---

## Problem Statement

Traditional video hosting architectures suffer from several critical failure modes:

| Problem | Impact |
|---|---|
| Synchronous transcoding in the API layer | API timeouts for large files; poor user experience |
| Single quality bitrate streaming | Rebuffering on poor network connections |
| Direct S3 public access | Security exposure; no token-based access control |
| No real-time status | Users have no feedback during long processing jobs |
| Manual infrastructure | Inconsistent environments, slow provisioning |

Flux solves all of the above with a purpose-built architecture.

---

## System Goals

| Goal | Implementation |
|---|---|
| **Scalable upload ingestion** | Pre-signed S3 POST — browser uploads directly to S3, bypassing the API server |
| **Non-blocking transcoding** | SQS decouples upload from processing; worker runs independently |
| **Adaptive bitrate streaming (ABR)** | FFmpeg generates 360p / 480p / 720p HLS variants with a master playlist |
| **Secure video delivery** | CloudFront + OAC + signed cookies; S3 bucket is fully private |
| **Real-time progress** | API Gateway WebSocket pushes `VIDEO_COMPLETED` events to all connected browsers |
| **Reproducible infrastructure** | Terraform provisions all AWS resources; GitHub Actions deploys the application |

---

## Non-Goals

- **Multi-tenant isolation** — all videos share the same processing queue and storage; no per-tenant namespacing is currently implemented.
- **4K / 1080p transcoding** — the current preset supports up to 720p. This is a deliberate cost/complexity tradeoff.
- **DRM (Widevine / FairPlay)** — signed cookies provide session-level access control, not per-device hardware DRM.
- **Live streaming** — the pipeline is VOD (Video on Demand) only; the HLS playlist type is `VOD`, not `LIVE` or `EVENT`.
- **Video editing / clipping** — the platform is upload-and-stream only.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser\nNext.js + HLS.js"]
    end

    subgraph "Edge Layer (AWS)"
        CF["CloudFront CDN\n+ Signed Cookies\n+ OAC"]
        APIGW["API Gateway\nWebSocket"]
    end

    subgraph "Application Layer (EC2 t3.small)"
        NGINX["Nginx Reverse Proxy\nTLS Termination"]
        API["Upload Service\nNode.js / Express"]
        FE["Frontend\nNext.js SSR"]
        WORKER["Transcoder Worker\nNode.js + FFmpeg"]
        PG["PostgreSQL 16"]
        REDIS["Redis 7"]
    end

    subgraph "Storage (AWS S3)"
        RAW["Raw Videos Bucket\n(7-day lifecycle)"]
        PROC["Processed Videos Bucket\n(private, versioned)"]
        THUMB["Thumbnails Bucket\n(private, versioned)"]
    end

    subgraph "Messaging (AWS)"
        SQS["SQS Queue\n(visibility=300s, DLQ after 3)"]
    end

    Browser -->|"HTTPS"| NGINX
    NGINX --> API
    NGINX --> FE
    Browser -->|"WSS"| APIGW
    APIGW -->|"HTTP POST /websocket/connect"| API

    Browser -->|"Presigned POST (direct)"| RAW
    RAW -->|"S3 Event Notification"| SQS
    SQS -->|"Long Poll"| WORKER
    WORKER -->|"GetObject"| RAW
    WORKER -->|"PutObject (HLS + Thumb)"| PROC
    WORKER -->|"PutObject (Thumb)"| THUMB
    WORKER --> PG
    WORKER -->|"PostToConnection"| APIGW

    API --> PG
    API --> REDIS
    Browser -->|"HLS playback + cookies"| CF
    CF -->|"OAC SigV4"| PROC
    CF -->|"OAC SigV4"| THUMB
```

---

## Design Principles

### 1. Browser-to-S3 Direct Upload
The browser uploads raw video **directly** to S3 using a pre-signed POST URL. The API server is never a data pipe — it only generates the URL and metadata record. This means:
- The API never handles large binary payloads
- Upload speed is limited only by the user's network and S3 throughput
- The API remains at O(1) memory regardless of file size

### 2. Event-Driven Decoupling via SQS
S3 automatically fires an event notification to SQS when the upload completes. The transcoder worker polls SQS independently. This means:
- The API does not call the worker directly (no coupling)
- If the worker restarts, messages are re-queued and retried
- Worker can be horizontally scaled by simply launching more replicas

### 3. Defense-in-Depth for Video Delivery
Processed videos **never have public S3 access**. Access flows exclusively through CloudFront, enforced by:
- **OAC (Origin Access Control)** — CloudFront signs requests to S3 using SigV4. The bucket policy only allows `s3:GetObject` from the CloudFront distribution's ARN.
- **Signed Cookies** — the API generates a wildcard-scoped cookie (`hls/videoId/*`) valid for 2 hours. HLS.js attaches cookies automatically on every segment fetch.

### 4. Stateless Worker
The transcoder worker holds no persistent state. All inputs come from S3, all outputs go to S3, and all status updates go to PostgreSQL. This means a crashed worker can be replaced with zero data loss.

### 5. Infrastructure as Code
Every AWS resource is defined in Terraform under `infra/terraform/modules/`. There are no click-ops resources. State is managed locally (future: S3 backend with DynamoDB lock).

---

## Technical Challenges

| Challenge | Solution |
|---|---|
| FFmpeg CPU saturation on large files | `ultrafast` preset + `-threads 0` (use all CPU cores) |
| CloudFront CORS for credentialed cookie requests | Custom `ResponseHeadersPolicy` whitelisting `CloudFront-*` cookies and specific origins |
| WebSocket connection persistence across HTTP restarts | Connection IDs stored in PostgreSQL; connections are re-established on page load |
| SQS message ID extraction from raw S3 events | Worker parses `Records[0].s3.object.key`, URL-decodes it, and extracts the UUID prefix |
| CloudFront signed cookie key management | RSA key pair generated offline; public key uploaded to CloudFront key group via Terraform; private key mounted as volume |

---

## Key Architectural Decisions

### ADR-001: SQS over SNS for Worker Trigger
**Decision**: Use S3 → SQS event notification (not SNS → Lambda).

**Rationale**: SQS provides at-least-once delivery with visibility timeout and a DLQ, giving the worker time to process large files without message re-delivery. Lambda cold starts and 15-minute timeouts are insufficient for transcoding jobs that may run 5–20 minutes.

### ADR-002: EC2 over ECS/Fargate
**Decision**: Deploy all services on a single EC2 `t3.small` using Docker Compose.

**Rationale**: For a portfolio/MVP workload, ECS adds operational overhead (task definitions, service discovery, ALB target groups). Docker Compose on EC2 provides the same container isolation at 1/10th the complexity. The architecture is designed to migrate to ECS with minimal changes.

### ADR-003: CloudFront Signed Cookies over Signed URLs
**Decision**: Use signed cookies (`CloudFront-Policy`, `CloudFront-Signature`, `CloudFront-Key-Pair-Id`) instead of per-object signed URLs.

**Rationale**: HLS playback requires hundreds of requests (master playlist + variant playlists + individual `.ts` segments). Generating and embedding a signed URL in every segment reference is impractical. A single cookie set covers the entire `hls/videoId/*` namespace.

### ADR-004: PostgreSQL over DynamoDB
**Decision**: Use PostgreSQL (via Fluxa) for video metadata.

**Rationale**: Video metadata has strong relational structure and the query patterns (find by ID, list with ordering) map cleanly to SQL. PostgreSQL is also the most operator-familiar database. DynamoDB would add unnecessary complexity for the current scale.

### ADR-005: Redis for Video List Cache
**Decision**: Cache the `GET /videos` response in Redis with a 60-second TTL.

**Rationale**: The video list is read on every page load and is expensive to compute from PostgreSQL (full table scan + sort). Redis invalidation is triggered explicitly when a new video is marked `COMPLETED`, so the cache is always consistent within 60 seconds.

---

## End-to-End Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (Next.js)
    participant API as Upload Service
    participant S3_RAW as S3 Raw Bucket
    participant SQS as SQS Queue
    participant WORKER as Transcoder Worker
    participant S3_PROC as S3 Processed Bucket
    participant PG as PostgreSQL
    participant CF as CloudFront
    participant WS as API Gateway WebSocket

    User->>FE: Select & upload video file
    FE->>API: POST /upload/url { fileName, contentType }
    API->>S3_RAW: createPresignedPost (expires 1hr, max 500MB)
    API->>PG: INSERT video { id, status: UPLOADED }
    API-->>FE: { videoId, uploadUrl, fields }
    FE->>S3_RAW: multipart POST (direct browser upload)
    S3_RAW->>SQS: s3:ObjectCreated event (raw/ prefix)

    Note over WORKER: Polling SQS every 5 seconds
    WORKER->>SQS: ReceiveMessage (long poll, max 10 msgs)
    SQS-->>WORKER: Message { s3Key, videoId }
    WORKER->>S3_RAW: GetObject (stream to /app/temp/input.mp4)
    WORKER->>WORKER: FFmpeg: screenshot at 10% → thumbnail.jpg
    WORKER->>S3_PROC: PutObject thumbnails/videoId.jpg
    WORKER->>WORKER: FFmpeg: transcode 360p @ 800k HLS
    WORKER->>WORKER: FFmpeg: transcode 480p @ 1400k HLS
    WORKER->>WORKER: FFmpeg: transcode 720p @ 2800k HLS
    WORKER->>WORKER: Write master.m3u8
    WORKER->>S3_PROC: PutObject hls/videoId/360p/*
    WORKER->>S3_PROC: PutObject hls/videoId/480p/*
    WORKER->>S3_PROC: PutObject hls/videoId/720p/*
    WORKER->>S3_PROC: PutObject hls/videoId/master.m3u8
    WORKER->>PG: UPDATE video SET status=COMPLETED, masterPlaylistKey=...
    WORKER->>PG: DELETE FROM redis cache "videos"
    WORKER->>WS: PostToConnection (VIDEO_COMPLETED event)
    WORKER->>WORKER: Cleanup temp files
    WORKER->>SQS: DeleteMessage

    FE->>WS: wss:// connection open
    WS-->>FE: VIDEO_COMPLETED { id, status }
    FE->>API: GET /videos/:id/playback-cookies
    API->>API: generatePlaybackCookies (wildcard hls/videoId/*)
    API-->>FE: Set-Cookie: CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id
    FE->>CF: GET hls/videoId/master.m3u8 (with cookies)
    CF->>S3_PROC: GetObject (OAC SigV4)
    S3_PROC-->>CF: master.m3u8
    CF-->>FE: master.m3u8
    FE->>CF: HLS.js streams segments adaptively
```
