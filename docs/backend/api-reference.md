# API Reference

Complete API documentation for the Flux Upload Service. All endpoints are served over HTTPS at `https://video-processing-api.masir-projects.me`.

---

## Base Information

| Property | Value |
|---|---|
| Base URL | `https://video-processing-api.masir-projects.me` |
| Protocol | HTTPS (TLS 1.2+) |
| Content-Type | `application/json` |
| Authentication | None (planned: JWT) |
| Rate Limit | 100 requests / 15 minutes per IP |
| CORS | Credentials allowed; reflects request origin |

---

## Authentication

Currently, no authentication is required for API endpoints. CloudFront video delivery is secured via signed cookies. Future versions should add JWT bearer token authentication.

---

## Common Error Responses

| Status | Description |
|---|---|
| `400 Bad Request` | Missing or invalid request parameters |
| `404 Not Found` | Resource not found |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server-side error |

---

## Endpoints

---

### `GET /health`

Health check endpoint. Used by Docker healthcheck and external monitoring.

**Request**

```http
GET /health HTTP/1.1
Host: video-processing-api.masir-projects.me
```

**Response** `200 OK`

```json
{
  "status": "healthy"
}
```

---

### `POST /upload/url`

Generate a pre-signed S3 POST URL and create a video record. The browser uses the returned `uploadUrl` and `fields` to upload the video file directly to S3.

**Request**

```http
POST /upload/url HTTP/1.1
Host: video-processing-api.masir-projects.me
Content-Type: application/json

{
  "fileName": "my-conference-talk.mp4",
  "contentType": "video/mp4"
}
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `fileName` | `string` | Yes | Original filename of the video to upload |
| `contentType` | `string` | Yes | MIME type. One of: `video/mp4`, `video/quicktime`, `video/x-msvideo` |

**Response** `200 OK`

```json
{
  "videoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "uploadUrl": "https://Flux-dev-masir-raw-videos.s3.ap-south-1.amazonaws.com/",
  "fields": {
    "key": "raw/a1b2c3d4-...-my-conference-talk.mp4",
    "Content-Type": "video/mp4",
    "Policy": "eyJleHBpcmF0aW9uIjoiMjAyNS0wNi0xMFQxMzowMDowMFoiLCJjb25kaXRpb25...",
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": "ASIAXXX.../20250610/ap-south-1/s3/aws4_request",
    "X-Amz-Date": "20250610T120000Z",
    "X-Amz-Security-Token": "IQoJb3JpZ2luX2VjEA...",
    "X-Amz-Signature": "abc123def456..."
  },
  "key": "raw/a1b2c3d4-...-my-conference-talk.mp4"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `videoId` | `string` | UUID that identifies this video for all future API calls |
| `uploadUrl` | `string` | S3 endpoint URL for the multipart POST upload |
| `fields` | `object` | Form fields that must be included in the browser's FormData upload |
| `key` | `string` | S3 object key where the video will be stored |

**Error Responses**

| Status | Body | Cause |
|---|---|---|
| `400` | `{ "message": "fileName and contentType required" }` | Missing fields |
| `400` | `{ "message": "Unsupported file type" }` | contentType not in allowlist |
| `500` | `{ "message": "Failed to generate upload URL" }` | S3 SDK error |

**How to use the presigned URL**

```javascript
// Step 1: Get presigned URL
const { uploadUrl, fields, videoId } = await fetch('/upload/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileName: file.name, contentType: file.type }),
}).then(r => r.json());

// Step 2: Upload directly to S3
const formData = new FormData();
Object.entries(fields).forEach(([key, val]) => formData.append(key, val));
formData.append('file', file);  // ← MUST be last

await fetch(uploadUrl, { method: 'POST', body: formData });
// S3 returns 204 No Content on success

// Step 3: Use videoId for subsequent calls
console.log('Video ID:', videoId);
```

---

### `GET /videos`

Retrieve all videos ordered by creation date (newest first). Response is Redis-cached for 60 seconds.

**Request**

```http
GET /videos HTTP/1.1
Host: video-processing-api.masir-projects.me
```

**Response** `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "fileName": "my-conference-talk.mp4",
    "originalS3Key": "raw/a1b2c3d4-...-my-conference-talk.mp4",
    "status": "COMPLETED",
    "thumbnailUrl": "https://cdn.masir-projects.me/thumbnails/a1b2c3d4-....jpg",
    "thumbnailKey": "thumbnails/a1b2c3d4-....jpg",
    "masterPlaylistKey": "hls/a1b2c3d4-.../master.m3u8",
    "hlsMasterUrl": "hls/a1b2c3d4-.../360p/index.m3u8",
    "processedVideoUrl": null,
    "createdAt": "2025-06-10T12:00:00.000Z",
    "updatedAt": "2025-06-10T12:05:30.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "fileName": "product-demo.mp4",
    "originalS3Key": "raw/b2c3d4e5-...-product-demo.mp4",
    "status": "UPLOADED",
    "thumbnailUrl": null,
    "thumbnailKey": null,
    "masterPlaylistKey": null,
    "hlsMasterUrl": null,
    "processedVideoUrl": null,
    "createdAt": "2025-06-10T12:04:00.000Z",
    "updatedAt": "2025-06-10T12:04:00.000Z"
  }
]
```

**Video Status Values**

| Status | Description |
|---|---|
| `UPLOADED` | Video record created; file may still be uploading or awaiting processing |
| `COMPLETED` | All HLS variants and thumbnail generated; video is playable |
| `FAILED` | Processing failed (not currently auto-set by worker) |

---

### `GET /videos/:id`

Retrieve a single video by ID, including computed CloudFront playback URLs.

**Request**

```http
GET /videos/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: video-processing-api.masir-projects.me
```

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The UUID of the video |

**Response** `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fileName": "my-conference-talk.mp4",
  "originalS3Key": "raw/a1b2c3d4-...-my-conference-talk.mp4",
  "status": "COMPLETED",
  "playbackUrl": "https://cdn.masir-projects.me/hls/a1b2c3d4-.../master.m3u8",
  "thumbnailUrl": "https://cdn.masir-projects.me/thumbnails/a1b2c3d4-....jpg",
  "masterPlaylistKey": "hls/a1b2c3d4-.../master.m3u8",
  "hlsMasterUrl": "hls/a1b2c3d4-.../360p/index.m3u8",
  "thumbnailKey": "thumbnails/a1b2c3d4-....jpg",
  "createdAt": "2025-06-10T12:00:00.000Z",
  "updatedAt": "2025-06-10T12:05:30.000Z"
}
```

**Additional Response Fields**

| Field | Type | Description |
|---|---|---|
| `playbackUrl` | `string` | Full CloudFront URL to the HLS master playlist. Use this with HLS.js. |
| `thumbnailUrl` | `string` | Full CloudFront URL to the video thumbnail JPEG. |

> ⚠️ These computed fields are NOT stored in the database — they are derived at request time from `masterPlaylistKey` and `thumbnailKey`.

**Error Responses**

| Status | Body | Cause |
|---|---|---|
| `404` | `{ "message": "Video not found" }` | No video with that UUID exists |

---

### `GET /videos/:id/playback-cookies`

Issue CloudFront signed cookies for a video. Must be called before attempting HLS playback. Sets three `Set-Cookie` response headers that the browser automatically stores and sends with CloudFront requests.

**Request**

```http
GET /videos/a1b2c3d4-e5f6-7890-abcd-ef1234567890/playback-cookies HTTP/1.1
Host: video-processing-api.masir-projects.me
```

> ⚠️ **Important**: This request must be made with `credentials: "include"` (or `withCredentials: true`) to allow the browser to store the Set-Cookie response headers across origins.

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | The UUID of the video |

**Response Headers** (on success)

```
Set-Cookie: CloudFront-Policy=eyJTdGF0ZW1lbnQiOlt7...}; Path=/; Secure; SameSite=None; Max-Age=7200; Domain=.masir-projects.me
Set-Cookie: CloudFront-Signature=abc123def456...; Path=/; Secure; SameSite=None; Max-Age=7200; Domain=.masir-projects.me
Set-Cookie: CloudFront-Key-Pair-Id=APKAIEXAMPLE123; Path=/; Secure; SameSite=None; Max-Age=7200; Domain=.masir-projects.me
```

**Response Body** `200 OK`

```json
{
  "message": "Cookies set",
  "cloudfrontDomain": "cdn.masir-projects.me",
  "videoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Cookie Properties**

| Property | Value | Explanation |
|---|---|---|
| `Path` | `/` | Cookies apply to all paths |
| `Secure` | (flag) | HTTPS only |
| `SameSite` | `None` | Required for cross-origin cookie sending |
| `Max-Age` | `7200` | 2-hour expiry (configurable via `COOKIE_EXPIRY_HOURS`) |
| `Domain` | `.masir-projects.me` | Shared across all subdomains |

**Error Responses**

| Status | Body | Cause |
|---|---|---|
| `404` | `{ "message": "Video not found" }` | Video doesn't exist |
| `400` | `{ "message": "Video is not ready for playback" }` | Status is not COMPLETED/PROCESSED |
| `500` | `{ "message": "Failed to generate playback cookies" }` | CloudFront signing not configured |

**Usage Example**

```javascript
// Request cookies (must include credentials)
await fetch(`/videos/${videoId}/playback-cookies`, {
  credentials: 'include',  // Essential!
});

// After this, the browser automatically sends CloudFront-* cookies
// with every HLS request to cdn.masir-projects.me

// Initialize HLS.js with the playback URL
const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = true; } });
hls.loadSource(video.playbackUrl);
hls.attachMedia(videoElement);
```

---

### `POST /websocket/connect`

Register a WebSocket connection. Called automatically by API Gateway when a browser connects via WSS. Not intended for direct client calls.

**Request** (from API Gateway)

```http
POST /websocket/connect HTTP/1.1
Host: video-processing-api.masir-projects.me
x-connection-id: Abc123XyZ==
Content-Type: application/json

{}
```

**Request Sources**

| Source | Field |
|---|---|
| `req.body.connectionId` | Direct call |
| `req.body.requestContext.connectionId` | Lambda-style API GW integration |
| `req.headers["x-connection-id"]` | HTTP_PROXY integration (current) |

**Response** `200 OK`

```json
{
  "success": true
}
```

**Error Responses**

| Status | Body | Cause |
|---|---|---|
| `400` | `{ "error": "connectionId is required" }` | No connection ID provided |

---

### `POST /websocket/disconnect`

Remove a WebSocket connection record. Called automatically by API Gateway on disconnect.

**Request** (from API Gateway)

```http
POST /websocket/disconnect HTTP/1.1
Host: video-processing-api.masir-projects.me
x-connection-id: Abc123XyZ==
Content-Type: application/json

{}
```

**Response** `200 OK`

```json
{
  "success": true
}
```

---

## WebSocket API

The WebSocket endpoint is provided by AWS API Gateway (not the Upload Service).

**Endpoint**: `wss://{api-id}.execute-api.ap-south-1.amazonaws.com/production`

### Connection

```javascript
const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);
ws.onopen = () => console.log("Connected");
```

### Incoming Message Format

```json
{
  "type": "VIDEO_COMPLETED",
  "video": {
    "id": "a1b2c3d4-...",
    "status": "COMPLETED"
  }
}
```

### Message Types

| Type | Payload | Trigger |
|---|---|---|
| `VIDEO_COMPLETED` | `{ id, status: "COMPLETED" }` | Worker completes processing |

### Connection Lifecycle

```javascript
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log("WebSocket connected");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "VIDEO_COMPLETED") {
    // Refresh video and request playback cookies
    handleVideoReady(data.video.id);
  }
};

ws.onclose = (event) => {
  console.log("WebSocket closed:", event.code);
  // Implement reconnection logic here
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

---

## Rate Limiting

| Layer | Limit | Response |
|---|---|---|
| Nginx | 10 req/s per IP, burst 20 | `503 Service Unavailable` |
| Express | 100 req / 15 min per IP | `429 Too Many Requests` |

```json
{
  "message": "Too many requests"
}
```

---

## CORS Policy

| Header | Value |
|---|---|
| `Access-Control-Allow-Origin` | Reflects request `Origin` header |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Methods` | `GET, POST, PUT` |
