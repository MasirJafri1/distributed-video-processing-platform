# Container Diagram

This document breaks down the internal runtime components of Flux and explains every inter-container interaction. All containers run on a single EC2 `t3.small` instance using Docker Compose, sharing a single Docker bridge network.

---

## Container Diagram

```mermaid
graph TB
    subgraph "Browser (Client)"
        HLSjs["HLS.js Player"]
        WSJS["WebSocket Client"]
        FormUpload["Upload Form"]
    end

    subgraph "EC2 t3.small — Docker Compose Network"
        NGINX["nginx:latest\n(Port 80/443)\nReverse proxy + TLS"]

        subgraph "Application Containers"
            API["upload-service\n(Node.js/Express)\nPort 3000\nREST API"]
            FE["frontend\n(Next.js SSR)\nPort 3001"]
            WORKER["transcoder-worker\n(Node.js + FFmpeg)\nNo exposed port"]
        end

        subgraph "Data Layer"
            PG["postgres:16\nPort 5432\nVolume: postgres_data"]
            REDIS["redis:7-alpine\nPort 6379\nAuth password required"]
        end
    end

    subgraph "AWS — External Services"
        S3_RAW["S3: raw-videos\n(7-day lifecycle)"]
        S3_PROC["S3: processed-videos\n(versioned, private)"]
        S3_THUMB["S3: thumbnails\n(versioned, private)"]
        SQS["SQS Queue\n+ Dead Letter Queue"]
        APIGW["API Gateway\nWebSocket"]
        CF["CloudFront\n(OAC + Signed Cookies)"]
    end

    FormUpload -->|"POST /upload/url"| NGINX
    NGINX -->|"proxy_pass"| API
    HLSjs -->|"HLS segments\nSigned Cookies"| CF
    WSJS -->|"WSS connect/disconnect"| APIGW

    API -->|"SQL via Fluxa"| PG
    API -->|"GET/SET/DEL"| REDIS
    API -->|"createPresignedPost"| S3_RAW
    API -->|"PostToConnection"| APIGW
    APIGW -->|"HTTP POST /websocket/connect"| API

    FormUpload -->|"multipart POST\n(direct, presigned)"| S3_RAW
    S3_RAW -->|"s3:ObjectCreated event\n(raw/ prefix filter)"| SQS

    WORKER -->|"ReceiveMessage\nDeleteMessage"| SQS
    WORKER -->|"GetObject → /app/temp"| S3_RAW
    WORKER -->|"PutObject (HLS segments)"| S3_PROC
    WORKER -->|"PutObject (thumbnail)"| S3_THUMB
    WORKER -->|"UPDATE video status"| PG
    WORKER -->|"DEL videos cache"| REDIS
    WORKER -->|"PostToConnection"| APIGW

    CF -->|"SigV4 OAC"| S3_PROC
    CF -->|"SigV4 OAC"| S3_THUMB

    FE -.->|"depends_on"| API
    WORKER -.->|"depends_on"| PG
    NGINX -.->|"depends_on"| API
    NGINX -.->|"depends_on"| FE
    API -.->|"depends_on"| PG
    API -.->|"depends_on"| REDIS
```

---

## Container Details

### 1. Nginx (Reverse Proxy)

| Property | Value |
|---|---|
| Image | `nginx:latest` |
| Ports | `80:80`, `443:443` |
| Role | TLS termination, HTTP→HTTPS redirect, rate limiting, request routing |

**Responsibilities**:
- Terminates TLS using Let's Encrypt certificates mounted from `/etc/letsencrypt`
- Routes `video-processing-api.masir-projects.me` → `upload-service:3000`
- Routes `video-processing.masir-projects.me` → `frontend:3001`
- Enforces security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Applies rate limiting: `limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s`

**Interactions**:
- Receives all inbound HTTPS traffic from the internet
- Proxies to `upload-service` or `frontend` over plain HTTP within Docker network
- Serves Certbot ACME challenge files from `/var/www/certbot` (read-only volume)

---

### 2. Upload Service (Backend API)

| Property | Value |
|---|---|
| Runtime | Node.js 20 + Express |
| Port | `3000` (internal only; exposed via Nginx) |
| Database | PostgreSQL via Fluxa |
| Cache | Redis |

**Endpoints**:
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check for Docker healthcheck |
| `POST` | `/upload/url` | Generate pre-signed S3 POST URL + create DB record |
| `GET` | `/videos` | List all videos (Redis cached, 60s TTL) |
| `GET` | `/videos/:id` | Fetch single video with CloudFront playback URL |
| `GET` | `/videos/:id/playback-cookies` | Issue CloudFront signed cookies |
| `POST` | `/websocket/connect` | Called by API GW; store connection ID |
| `POST` | `/websocket/disconnect` | Called by API GW; remove connection ID |

**Middleware stack** (in order):
1. `express.json()` — body parsing
2. `cors()` — origin whitelisting with credentials support
3. `requestMiddleware` — structured request logging
4. `helmet()` — HTTP security headers
5. `rateLimit()` — 100 requests / 15 minutes per IP
6. Route handlers
7. `errorMiddleware` — catch-all error handler

**Key interactions**:
- PostgreSQL: creates video records on upload, fetches video details for playback
- Redis: caches video list at key `"videos"` with 60s expiry; deleted when worker marks video `COMPLETED`
- S3: generates pre-signed POST using `@aws-sdk/s3-presigned-post`
- CloudFront: generates RSA-signed cookies using `@aws-sdk/cloudfront-signer`
- API Gateway: broadcasts `VIDEO_COMPLETED` events via `PostToConnectionCommand`

---

### 3. Frontend (Next.js)

| Property | Value |
|---|---|
| Runtime | Next.js 14+ (App Router) |
| Port | `3001` |
| Build args | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEBSOCKET_URL`, `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` |

**Responsibilities**:
- Serves the video management UI (upload form, video library, video detail page)
- Communicates with the Upload Service REST API
- Opens a WebSocket connection to API Gateway for real-time updates
- Uses `HLS.js` to play adaptive bitrate video from CloudFront

**Key components**:
- `VideoPlayer.jsx` — wraps HLS.js, emits stats + log events
- `VideoDetailLayout.jsx` — video player + pipeline status + S3 Manifest Inspector
- `ManifestInspector.jsx` — fetches and syntax-highlights live HLS playlists from CloudFront
- `StatsForNerds.jsx` — live ABR quality/bitrate analytics overlay
- `HlsDebuggerConsole.jsx` — real-time HLS event log

**Environment at build time** (injected as Docker build args):
```
NEXT_PUBLIC_API_URL=https://video-processing-api.masir-projects.me
NEXT_PUBLIC_WEBSOCKET_URL=wss://{api-id}.execute-api.ap-south-1.amazonaws.com/production
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=https://cdn.masir-projects.me
```

---

### 4. Transcoder Worker

| Property | Value |
|---|---|
| Runtime | Node.js 20 + FFmpeg system binary |
| Exposed port | None |
| Volumes | `/app/temp` (ephemeral scratch space) |
| Replicas | 1 (configurable via `deploy.replicas`) |

**Processing pipeline** (per job):
1. Parse S3 event from SQS message body
2. Extract `videoId` from S3 key (`raw/{uuid}-{filename}`)
3. Create scratch directories: `/app/temp/360p`, `/app/temp/480p`, `/app/temp/720p`, `/app/temp/thumbnails`
4. Download raw video from S3 → `/app/temp/input.mp4`
5. Generate thumbnail at 10% timestamp (640×360 JPEG)
6. Upload thumbnail to `thumbnails/` bucket at `thumbnails/{videoId}.jpg`
7. Transcode three HLS variants in parallel-sequential:
   - 360p @ 800k, `-preset ultrafast`, `-threads 0`, 6-second segments
   - 480p @ 1400k (same settings)
   - 720p @ 2800k (same settings)
8. Write `master.m3u8` with `EXT-X-STREAM-INF` entries
9. Upload 360p, 480p, 720p directories to `hls/{videoId}/` in processed bucket
10. Upload `master.m3u8` to `hls/{videoId}/master.m3u8`
11. Update PostgreSQL: `status=COMPLETED`, `masterPlaylistKey`, `thumbnailKey`
12. Invalidate Redis `"videos"` cache
13. Broadcast `VIDEO_COMPLETED` to all WebSocket connections
14. Clean up all temp files
15. Delete SQS message

**Failure handling**: If any step throws, the error is logged and the message is NOT deleted from SQS. After 3 failed visibility timeouts (visibility = 300s each), SQS moves the message to the Dead Letter Queue.

---

### 5. PostgreSQL

| Property | Value |
|---|---|
| Image | `postgres:16` |
| Port | `5432` (internal Docker network only) |
| Volume | `postgres_data` (Docker named volume, survives container restart) |

**Schema** (two tables):

```sql
-- Video lifecycle record
CREATE TABLE "Video" (
    id                TEXT PRIMARY KEY,         -- UUID, set at presign time
    "fileName"        TEXT NOT NULL,
    "originalS3Key"   TEXT NOT NULL,
    status            TEXT NOT NULL,            -- UPLOADED | COMPLETED | FAILED
    "thumbnailUrl"    TEXT,
    "processedVideoUrl" TEXT,
    "hlsMasterUrl"    TEXT,                     -- 360p variant URL
    "masterPlaylistKey" TEXT,                   -- hls/{videoId}/master.m3u8
    "thumbnailKey"    TEXT,                     -- thumbnails/{videoId}.jpg
    "createdAt"       TIMESTAMP DEFAULT now(),
    "updatedAt"       TIMESTAMP
);

-- WebSocket connection tracking
CREATE TABLE "WebSocketConnection" (
    id           TEXT PRIMARY KEY,              -- API GW connectionId
    "connectedAt" TIMESTAMP DEFAULT now()
);
```

**Access pattern**: Both the Upload Service and the Transcoder Worker connect to the same database using Fluxa ORM with separate schema.Fluxa files (the worker schema does not include the `WebSocketConnection` model).

---

### 6. Redis

| Property | Value |
|---|---|
| Image | `redis:7-alpine` |
| Port | `6379` (internal Docker network only) |
| Auth | Password via `--requirepass ${REDIS_PASSWORD}` |

**Usage pattern**:
- `GET videos` → return cached JSON array of all videos (TTL: 60s)
- `SET videos <json>` → set after fresh PostgreSQL read
- `DEL videos` → invalidated by worker after marking a video `COMPLETED`

This is a **write-through invalidation** pattern (not write-through cache): the cache is populated lazily on first read and explicitly invalidated on write. This avoids stale data while keeping reads fast.

---

## Inter-Container Communication

```mermaid
graph LR
    subgraph "Docker Bridge Network (Flux_default)"
        NGINX["nginx\n:80/:443"]
        API["upload-service\n:3000"]
        FE["frontend\n:3001"]
        WORKER["transcoder-worker\n(no port)"]
        PG["postgres\n:5432"]
        REDIS["redis\n:6379"]
    end

    NGINX -->|"http://upload-service:3000"| API
    NGINX -->|"http://frontend:3001"| FE
    API -->|"DATABASE_URL\npostgresql://..@postgres:5432/..."| PG
    API -->|"REDIS_URL\nredis://:pwd@redis:6379"| REDIS
    WORKER -->|"DATABASE_URL"| PG
    WORKER -->|"REDIS_URL"| REDIS
    WORKER -->|"API_URL\nhttp://upload-service:3000"| API
```

All service-to-service communication inside Docker uses Docker DNS service names (e.g., `postgres`, `redis`, `upload-service`) which Docker resolves to container IPs on the bridge network. No external DNS is required for intra-container communication.

---

## Dependency Order

```mermaid
graph LR
    PG --> API
    REDIS --> API
    PG --> WORKER
    API --> FE
    API --> NGINX
    FE --> NGINX
```

Docker Compose `depends_on` ensures containers start in this order. Note that `depends_on` in Docker Compose only waits for the container to start, not for the service inside to be healthy. The Upload Service has an explicit healthcheck (`wget /health`) so dependent services wait for it to become healthy.
