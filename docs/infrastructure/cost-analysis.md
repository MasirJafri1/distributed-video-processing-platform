# Cost Analysis

This document provides service-by-service cost estimates for Flux running in AWS `ap-south-1` (Mumbai). Estimates reflect the development/portfolio workload (low traffic, ~1–10 uploads/day).

---

> **Disclaimer**: All prices are approximate estimates based on AWS public pricing as of 2024–2025. Actual costs depend on usage patterns, reserved instance purchasing, and AWS pricing changes. Use the [AWS Pricing Calculator](https://calculator.aws.amazon.com) for precise estimates.

---

## Monthly Cost Summary

| Service | Component | Monthly Estimate |
|---|---|---|
| EC2 | t3.small on-demand | $15.18 |
| EBS | 30 GB gp2 | $3.00 |
| Elastic IP | Associated with running instance | $0.00 |
| S3 | Storage (raw + processed + thumbnails) | $2–15 |
| S3 | Requests (PUT + GET) | $0.50–5 |
| SQS | Messages | ~$0.00 (free tier) |
| CloudFront | Data transfer + requests | $2–20 |
| API Gateway | WebSocket connections + messages | ~$0.00 (free tier) |
| CloudWatch | Log ingestion + dashboards | $1–5 |
| ACM | Certificate | $0.00 |
| Let's Encrypt | Certificate | $0.00 |
| **Total** | | **~$24–63/month** |

---

## Service-by-Service Breakdown

### EC2

| Specification | Value |
|---|---|
| Instance type | `t3.small` |
| vCPU | 2 (burstable) |
| RAM | 2 GB |
| Region | ap-south-1 |
| On-demand price | $0.0208/hour |

| Cost Component | Calculation | Monthly Cost |
|---|---|---|
| EC2 instance (24x7) | $0.0208 × 720 hrs | **$14.98** |
| EBS gp2 30 GB | $0.10/GB × 30 | **$3.00** |
| Elastic IP | $0.00 (when associated) | **$0.00** |

**Reserved Instance savings**: A 1-year reserved instance for `t3.small` in ap-south-1 costs ~$9.37/month (38% savings). A 3-year reserved instance costs ~$6.64/month (56% savings).

---

### S3

**Pricing (ap-south-1)**:
- Storage: $0.023/GB/month
- PUT/COPY/POST/LIST: $0.005/1,000 requests
- GET/SELECT: $0.0004/1,000 requests
- S3 → CloudFront: **Free**

**Assumptions** (low-traffic development):
- 10 uploads/day × 50 MB average = 500 MB raw per day → 15 GB raw accumulated (but 7-day lifecycle means max ~3.5 GB at any time)
- 10 videos × 150 MB processed HLS artifacts = 1.5 GB processed per day → grows linearly
- After 1 month: ~45 GB processed + thumbnails

| Cost Component | Calculation | Monthly Cost |
|---|---|---|
| Raw bucket storage (max ~3.5 GB) | $0.023 × 3.5 | **$0.08** |
| Processed bucket (growing ~45 GB/month) | $0.023 × 45 | **$1.04** |
| Thumbnails bucket (~0.5 GB) | $0.023 × 0.5 | **$0.01** |
| PUT requests (uploads + segments) | 10 videos × 50 segments × 3 variants = 1,500 puts/day × 30 = 45,000 | **$0.23** |
| GET requests (CloudFront cache misses) | Minimal at low traffic | **$0.10** |
| **S3 Total** | | **~$1.50–$2/month** |

**At scale (1,000 uploads/day)**:
- Storage: ~$50–200/month
- Requests: ~$20–50/month

---

### CloudFront

**Pricing (ap-south-1, edge locations)**:
- Data transfer out: $0.085/GB (first 10 TB)
- HTTPS requests: $0.0100/10,000

**Assumptions** (development workload):
- 50 views/day × 10 minutes × 720 Kbps (average) = 50 × 54 MB = 2.7 GB/day = 81 GB/month

| Cost Component | Calculation | Monthly Cost |
|---|---|---|
| Data transfer (81 GB) | $0.085 × 81 | **$6.89** |
| HTTPS requests (segments) | 50 views × 100 segments × 30 days = 150,000 requests | **$0.15** |
| **CloudFront Total** | | **~$7/month** |

**At scale (5,000 views/day)**:
- Data transfer: ~$700/month → consider S3 Transfer Acceleration or edge caching strategies

---

### SQS

**Free Tier**: First 1 million requests/month free.

At 10 uploads/day:
- 10 messages sent (S3 events) + 10 messages received × 3 polls + 10 deletes = ~50 requests/day
- Monthly: ~1,500 requests — well within free tier

**At 100,000 uploads/month**: Still within the 1M free tier for the main queue. DLQ adds minimal cost.

| Cost Component | Monthly Cost |
|---|---|
| < 1M requests | **$0.00** (Free Tier) |

---

### API Gateway WebSocket

**Free Tier**: 1 million connection minutes/month + 1 million messages/month free for 12 months.

At 50 concurrent users with average 5-minute sessions:
- Connection minutes: 50 × 5 × 30 = 7,500 minutes/month
- Messages: 50 uploads × 10 users listening = 500 messages/month

Both well within free tier. After free tier:
- Connection minutes: $0.000250/minute
- Messages: $1.00/million

| Cost Component | Monthly Cost |
|---|---|
| Dev workload | **~$0.00** (Free Tier) |

---

### CloudWatch

| Cost Component | Calculation | Monthly Cost |
|---|---|---|
| Custom metrics (WorkerProcessingTime) | $0.30/metric × 1 = | **$0.30** |
| Log ingestion (~1 GB/month) | $0.50/GB × 1 | **$0.50** |
| Dashboard (1 dashboard) | $3.00/dashboard/month | **$3.00** |
| Log storage (7-day retention) | Minimal | **~$0.10** |
| **CloudWatch Total** | | **~$4/month** |

---

## Cost Optimization Strategies

### 1. EC2 Reserved Instances
Switch from on-demand to 1-year reserved instance:
- **Savings**: ~38% ($14.98 → ~$9.20/month)
- **Commitment**: 1 year (pay monthly or upfront)

### 2. S3 Intelligent Tiering
For processed videos not accessed in 30+ days, S3 Intelligent Tiering automatically moves objects to lower-cost tiers:
- Frequent access: $0.023/GB
- Infrequent access (30+ days): $0.0125/GB
- Archive (90+ days): $0.004/GB

**Potential savings**: 40–80% on storage costs for old videos.

### 3. CloudFront Caching
HLS segments are highly cacheable (content doesn't change after upload). The `.ts` segment files should be cached for maximum TTL (1 year) at CloudFront edges. The `.m3u8` playlists should also be cached (they don't change for VOD content).

Current CloudFront cache behavior does not set explicit `Cache-Control` headers — the worker should set `Cache-Control: max-age=31536000, immutable` on `.ts` segments and `Cache-Control: max-age=3600` on `.m3u8` files.

### 4. EC2 Spot Instances for Transcoding
Worker could be migrated to a separate EC2 Spot instance (70–90% cheaper than on-demand). Spot interruptions are handled by the SQS retry mechanism — if the worker is interrupted, the message becomes visible again after 300 seconds.

### 5. S3 Lifecycle for Processed Videos
Implement a lifecycle rule to delete processed HLS artifacts after 90 days (assuming old videos are archived or no longer needed). This prevents unbounded storage growth.

### 6. CloudFront Price Class
Currently using `PriceClass_100` (US, EU, Asia). If users are exclusively in India:
- Switching to regional origins and using CloudFront only for India-region POPs can reduce transfer costs.
- Alternatively, serve direct from S3 for development/testing (with presigned URLs, not cookies).

---

## Scaling Cost Projections

| Monthly Uploads | EC2 | S3 | CloudFront | Total |
|---|---|---|---|---|
| 300 (dev) | $15 | $2 | $7 | **~$24** |
| 3,000 (early prod) | $15 | $15 | $50 | **~$80** |
| 30,000 (growth) | $50 (t3.large) | $100 | $450 | **~$600** |
| 300,000 (scale) | $500+ (EC2 cluster or ECS) | $800 | $4,000+ | **$5,000+** |

At the 30,000+ upload scale, architecture changes are warranted:
- Multiple EC2 workers (Auto Scaling Group)
- RDS for PostgreSQL (Multi-AZ)
- ElastiCache for Redis (Multi-AZ)
- Potentially AWS Elemental MediaConvert instead of self-managed FFmpeg

---

## Free Tier Utilisation

AWS Free Tier provides 12 months of:

| Service | Free Tier | Usage |
|---|---|---|
| EC2 | 750 hrs/month t2.micro (not t3.small) | **Not applicable** |
| S3 | 5 GB storage + 20,000 GET + 2,000 PUT | Quickly exceeded |
| CloudFront | 1 TB data out + 10M requests | ~13 months of dev usage |
| API Gateway | 1M WebSocket messages | Unlimited for dev |
| SQS | 1M requests | Unlimited for dev |
| CloudWatch | 5 GB logs + 3 dashboards + 10 custom metrics | Exceeded with custom metric |

> **Recommendation**: Use the `t2.micro` (free tier eligible) for initial development. It runs the same Docker Compose stack but with 1 vCPU and 1 GB RAM — sufficient for development/testing but insufficient for transcoding production-quality large files.
