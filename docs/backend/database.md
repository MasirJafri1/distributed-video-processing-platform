# Database

This document describes Flux's database schema, data model, query patterns, indexing strategy, and lifecycle of a `Video` record from creation to completion.

---

## Overview

Flux uses **PostgreSQL 16** as its primary data store, accessed via **Fluxa ORM**. Two separate Fluxa schemas exist:

| Schema Location | Models | Used By |
|---|---|---|
| `backend/upload-service/Fluxa/schema.Fluxa` | `Video`, `WebSocketConnection` | Upload Service |
| `workers/transcoder-worker/Fluxa/schema.Fluxa` | `Video` | Transcoder Worker |

Both schemas define identical `Video` models. The worker schema omits `WebSocketConnection` because the worker never directly manages WebSocket connections.

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    Video {
        String id PK "UUID (generated at presign time)"
        String fileName "Original uploaded filename"
        String originalS3Key "raw/{videoId}-{fileName}"
        String status "UPLOADED | COMPLETED | FAILED"
        String thumbnailUrl "deprecated - use thumbnailKey"
        String processedVideoUrl "deprecated"
        String hlsMasterUrl "hls/{videoId}/360p/index.m3u8"
        String masterPlaylistKey "hls/{videoId}/master.m3u8"
        String thumbnailKey "thumbnails/{videoId}.jpg"
        DateTime createdAt "auto-set on creation"
        DateTime updatedAt "auto-updated on any change"
    }

    WebSocketConnection {
        String id PK "API Gateway connectionId"
        DateTime connectedAt "auto-set on creation"
    }

    Video ||--o{ WebSocketConnection : "no FK — conceptual only"
```

**Note**: There is no foreign key relationship between `Video` and `WebSocketConnection`. WebSocket connections are broadcast to ALL connections regardless of which video triggered the event.

---

## Schema

### `Video` Table

```Fluxa
model Video {
  id                String   @id
  fileName          String
  originalS3Key     String

  status            String

  thumbnailUrl      String?
  processedVideoUrl String?
  hlsMasterUrl      String?
  masterPlaylistKey String?
  thumbnailKey      String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `TEXT` | No | UUID generated client-side before S3 presign |
| `fileName` | `TEXT` | No | Original filename from the browser (`demo-reel.mp4`) |
| `originalS3Key` | `TEXT` | No | Full S3 object key: `raw/{id}-{fileName}` |
| `status` | `TEXT` | No | Video lifecycle state (see below) |
| `thumbnailUrl` | `TEXT` | Yes | ⚠️ Deprecated field — was intended to store full CDN URL |
| `processedVideoUrl` | `TEXT` | Yes | ⚠️ Deprecated — not used in current pipeline |
| `hlsMasterUrl` | `TEXT` | Yes | Set to `hls/{videoId}/360p/index.m3u8` (360p variant, not master) |
| `masterPlaylistKey` | `TEXT` | Yes | `hls/{videoId}/master.m3u8` — the true master playlist key |
| `thumbnailKey` | `TEXT` | Yes | `thumbnails/{videoId}.jpg` — S3 key, prepended with CDN domain at runtime |
| `createdAt` | `TIMESTAMP` | No | Auto-set by Fluxa |
| `updatedAt` | `TIMESTAMP` | No | Auto-updated by Fluxa on any write |

### `WebSocketConnection` Table

```Fluxa
model WebSocketConnection {
  id          String   @id
  connectedAt DateTime @default(now())
}
```

| Column | Type | Description |
|---|---|---|
| `id` | `TEXT` | API Gateway connection ID (e.g., `Abc123XyZ==`) |
| `connectedAt` | `TIMESTAMP` | When the connection was registered |

---

## Video Lifecycle

```mermaid
stateDiagram-v2
    [*] --> UPLOADED: POST /upload/url\n(DB record created)
    UPLOADED --> COMPLETED: Worker finishes all processing
    UPLOADED --> FAILED: (manual update; not auto-implemented)
    COMPLETED --> [*]: Video playable via CloudFront
    FAILED --> [*]: Error state — requires manual intervention
```

### Status Values

| Status | Set By | Meaning |
|---|---|---|
| `UPLOADED` | Upload Service | Video record created; file is being uploaded or awaiting processing |
| `COMPLETED` | Transcoder Worker | All HLS variants + thumbnail generated and uploaded to S3 |
| `FAILED` | Not automatically set | Intended for worker failures; currently workers throw but don't update status |

**Known gap**: The worker currently does not update the video status to `FAILED` when processing fails. The video remains in `UPLOADED` status indefinitely. This means:
- The pipeline tracker UI shows "pending" forever for failed videos
- There is no automated alerting for stuck videos
- Manual DLQ inspection is required

**Recommended fix**: Wrap the job in a try/catch at the top level and update status to `FAILED` before rethrowing:

```js
} catch (error) {
  await Fluxa.video.update({
    where: { id: videoId },
    data: { status: "FAILED" },
  });
  throw error;
}
```

---

## Query Patterns

### Upload Service

```js
// 1. Create a new video record
await Fluxa.video.create({
  data: { id, fileName, originalS3Key, status: "UPLOADED" }
});

// 2. List all videos (ordered by newest first)
const videos = await Fluxa.video.findMany({
  orderBy: { createdAt: "desc" },
});

// 3. Fetch a single video
const video = await Fluxa.video.findUnique({
  where: { id },
});
```

### Transcoder Worker

```js
// Update video after successful processing
await Fluxa.video.update({
  where: { id: videoId },
  data: {
    status: "COMPLETED",
    masterPlaylistKey,      // "hls/{videoId}/master.m3u8"
    hlsMasterUrl,           // "hls/{videoId}/360p/index.m3u8"
    thumbnailKey,           // "thumbnails/{videoId}.jpg"
  },
});
```

### WebSocket Service (Upload Service)

```js
// Register new connection
await Fluxa.webSocketConnection.create({ data: { id: connectionId } });

// Remove connection on disconnect
await Fluxa.webSocketConnection.deleteMany({ where: { id: connectionId } });

// Get all connections for broadcast
const connections = await Fluxa.webSocketConnection.findMany();
```

---

## Indexing Strategy

The current schema defines no explicit indexes beyond the primary keys. Fluxa automatically creates the `@id` index on both tables.

**Current implicit indexes**:
| Table | Index | Type |
|---|---|---|
| `Video` | `id` (PK) | B-tree, unique |
| `WebSocketConnection` | `id` (PK) | B-tree, unique |

**Recommended additional indexes**:

```Fluxa
model Video {
  id        String   @id
  status    String   @map("status")
  createdAt DateTime @default(now())

  @@index([createdAt(sort: Desc)])   // For orderBy: { createdAt: "desc" }
  @@index([status])                   // For WHERE status = 'UPLOADED' queries (future)
}
```

At low video counts (< 10,000 rows), a sequential scan on `findMany()` is fast enough. At scale, the `createdAt` index would significantly improve list query performance.

---

## Fluxa Configuration

### Binary Targets

The transcoder worker schema specifies binary targets explicitly:

```Fluxa
generator client {
  provider      = "Fluxa-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

This is required because the worker runs inside a Debian-based Docker container (`debian-openssl-3.0.x`) but is developed on macOS/Windows (`native`). Without explicit targets, the Fluxa query engine binary might not match the container's OS.

### Connection Pooling

Both services use a singleton Fluxa client:

```js
// db/Fluxa.js
import { FluxaClient } from "@Fluxa/client";
const Fluxa = new FluxaClient();
export default Fluxa;
```

Fluxa's default connection pool is 10 connections. For a single-instance deployment this is more than adequate.

---

## Database Connectivity

```yaml
# docker-compose.yml
upload-service:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

transcoder-worker:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

Both services connect to the same PostgreSQL container using Docker DNS (`postgres` resolves to the container IP on the Docker bridge network).

---

## Migrations

Fluxa manages schema migrations:

```bash
# Create a migration (development)
cd backend/upload-service
npx Fluxa migrate dev --name init

# Apply migrations in production (CI/CD or deployment script)
npx Fluxa migrate deploy

# Regenerate Fluxa client after schema changes
npx Fluxa generate
```

Migration files are stored in:
- `backend/upload-service/Fluxa/migrations/`
- `workers/transcoder-worker/Fluxa/migrations/`

**Current state**: The upload service migration directory contains the baseline migration creating both `Video` and `WebSocketConnection` tables.

---

## Future Scaling Considerations

| Concern | Current Approach | Production Upgrade |
|---|---|---|
| Single-instance PostgreSQL | Docker container on EC2 | Amazon RDS PostgreSQL (Multi-AZ, automated backups) |
| No connection pooling proxy | Direct Fluxa connections | PgBouncer or RDS Proxy |
| No read replicas | Single writer | RDS Read Replica for `findMany` queries |
| Backup | PostgreSQL data on EBS (host snapshot) | RDS automated daily backups with PITR |
| Video count scaling | Sequential scan on list | Add `createdAt` index; consider pagination |

### Pagination Implementation (Future)

```js
// Current: fetch ALL videos (no limit)
const videos = await Fluxa.video.findMany({ orderBy: { createdAt: "desc" } });

// Recommended: cursor-based pagination
const videos = await Fluxa.video.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: "desc" },
});
```
