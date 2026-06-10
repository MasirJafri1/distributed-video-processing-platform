# Flux

**Cloud-Native Distributed Video Processing & Adaptive Streaming Platform**

[![Deploy to EC2](https://github.com/MasirJafri1/distributed-video-processing-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/MasirJafri1/distributed-video-processing-platform/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://video-processing.masir-projects.me)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is Flux?

Flux is a production-grade video platform that enables you to upload raw video files and stream them as adaptive HLS content delivered globally through AWS CloudFront. It demonstrates a full event-driven architecture with real-time status updates, signed cookie security, and Infrastructure as Code.

**Live Demo**: [https://video-processing.masir-projects.me](https://video-processing.masir-projects.me)

---

## Key Features

| Feature | Implementation |
|---|---|
| 📤 **Direct-to-S3 Upload** | Browser uploads directly to S3 via pre-signed POST URL (server never handles binary data) |
| ⚙️ **Asynchronous Transcoding** | SQS decouples upload detection from FFmpeg processing; worker runs independently |
| 🎬 **Adaptive Bitrate Streaming** | Three HLS variants: 360p / 480p / 720p with automatic quality switching via HLS.js |
| 🔒 **Signed Cookie Security** | CloudFront + OAC + RSA signed cookies; S3 buckets are fully private |
| ⚡ **Real-Time Status Updates** | AWS API Gateway WebSocket pushes `VIDEO_COMPLETED` events to all browsers |
| 🌍 **Global CDN Delivery** | CloudFront with OAC (Origin Access Control) — faster and more secure than OAI |
| 🏗️ **Infrastructure as Code** | All AWS resources provisioned via Terraform; zero click-ops |
| 🚀 **Automated CI/CD** | GitHub Actions deploys on every push to `main` |

---

## Architecture Overview

```
Browser → Nginx (TLS) → Express API → S3 (presigned POST)
                                  ↓
                              SQS Queue (S3 event)
                                  ↓
                         Transcoder Worker (FFmpeg)
                                  ↓
                         S3 (HLS artifacts) → CloudFront → Browser (HLS.js)
                                  ↓
                         WebSocket (API Gateway) → Browser (real-time update)
```

For detailed architecture diagrams, see [docs/architecture/overview.md](docs/architecture/overview.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, HLS.js, React |
| **Backend API** | Node.js, Express, Fluxa |
| **Worker** | Node.js, FFmpeg (fluent-ffmpeg) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Object Storage** | AWS S3 (3 buckets) |
| **Queue** | AWS SQS (Standard + DLQ) |
| **CDN** | AWS CloudFront (OAC + Signed Cookies) |
| **WebSocket** | AWS API Gateway (WebSocket) |
| **Compute** | AWS EC2 t3.small (Docker Compose) |
| **DNS/TLS** | Namecheap + Let's Encrypt |
| **IaC** | Terraform (modular) |
| **CI/CD** | GitHub Actions |
| **Monitoring** | AWS CloudWatch (custom metrics + dashboard) |

---

## Repository Structure

```
.
├── backend/
│   └── upload-service/          # Node.js REST API
│       ├── src/
│       │   ├── controllers/     # Route handlers
│       │   ├── services/        # Business logic (S3, cookies, WebSocket)
│       │   ├── middleware/       # Rate limiting, error handling
│       │   └── db/              # Fluxa client
│       └── Fluxa/              # Database schema + migrations
│
├── workers/
│   └── transcoder-worker/       # FFmpeg processing worker
│       ├── src/
│       │   ├── queue/           # SQS consumer
│       │   ├── processors/      # Job orchestration
│       │   └── services/        # S3, HLS, thumbnail, notification
│       └── Fluxa/              # Database schema + migrations
│
├── frontend/
│   └── web/                     # Next.js application
│       ├── app/                 # App Router pages
│       ├── components/
│       │   └── video/           # VideoPlayer, ManifestInspector, StatsForNerds
│       └── lib/                 # API client utilities
│
├── infra/
│   ├── docker/                  # Docker Compose + .env
│   ├── nginx/                   # nginx.conf
│   ├── keys/                    # CloudFront RSA key pair (gitignored)
│   └── terraform/
│       ├── environments/dev/    # Environment-specific config
│       └── modules/             # vpc, ec2, iam, s3, sqs, cloudfront, websocket, acm
│
├── docs/                        # 📚 Full documentation suite
│   ├── architecture/
│   ├── backend/
│   ├── frontend/
│   ├── infrastructure/
│   └── deployment/
│
└── .github/workflows/
    └── deploy.yml               # CI/CD pipeline
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS Account with CLI configured
- Terraform 1.6+

### 1. Clone and Setup

```bash
git clone https://github.com/MasirJafri1/distributed-video-processing-platform.git
cd distributed-video-processing-platform

# Provision AWS infrastructure
cd infra/terraform/environments/dev
terraform init && terraform apply

# Configure environment
cp infra/docker/.env.example infra/docker/.env
# Edit .env with your terraform outputs
```

### 2. Generate CloudFront Key Pair

```bash
mkdir -p infra/keys
openssl genrsa -out infra/keys/cloudfront-private.pem 2048
openssl rsa -pubout -in infra/keys/cloudfront-private.pem -out infra/keys/cloudfront-public.pem
```

### 3. Run

```bash
cd infra/docker
docker compose up -d --build

# Access frontend
open http://localhost:3001

# API health check
curl http://localhost:3000/health
```

For full setup instructions, see [docs/deployment/local-development.md](docs/deployment/local-development.md).

---

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](docs/architecture/overview.md) | System design, ADRs, end-to-end flow |
| [System Context](docs/architecture/system-context.md) | External systems and security boundaries |
| [Container Diagram](docs/architecture/container-diagram.md) | Per-container responsibilities and interactions |
| [Video Processing Pipeline](docs/architecture/video-processing-pipeline.md) | FFmpeg stages, HLS generation, failure handling |
| [AWS Services](docs/architecture/aws-services.md) | Per-service rationale, alternatives, and cost |
| [Scalability](docs/architecture/scalability.md) | Current limits and upgrade path |
| [Upload Service API](docs/backend/upload-service.md) | Complete API service documentation |
| [Transcoder Worker](docs/backend/transcoder-worker.md) | FFmpeg processing internals |
| [Database Schema](docs/backend/database.md) | ER diagram, query patterns, migrations |
| [WebSocket Flow](docs/backend/websocket-flow.md) | Real-time notification architecture |
| [API Reference](docs/backend/api-reference.md) | All endpoints with examples |
| [HLS & Adaptive Streaming](docs/frontend/hls-streaming.md) | HLS playlists, ABR algorithm, cookies |
| [Terraform Infrastructure](docs/infrastructure/terraform.md) | Module structure, dependency graph |
| [Networking](docs/infrastructure/networking.md) | VPC, security groups, DNS, TLS |
| [Security](docs/infrastructure/security.md) | OAC, signed cookies, IAM, risks |
| [Cost Analysis](docs/infrastructure/cost-analysis.md) | Service costs and optimization strategies |
| [Local Development](docs/deployment/local-development.md) | Getting started guide |
| [EC2 Deployment](docs/deployment/ec2-deployment.md) | Production server management |
| [GitHub Actions CI/CD](docs/deployment/github-actions.md) | Automated deployment pipeline |
| [Environment Variables](docs/deployment/environment-variables.md) | Complete variable reference |
| [Monitoring](docs/deployment/monitoring.md) | CloudWatch dashboards and alerts |
| [Troubleshooting](docs/deployment/troubleshooting.md) | 14 common issues with solutions |

---

## Key Design Decisions

### ADR-001: SQS over Lambda for Transcoding
FFmpeg transcoding takes 3–15 minutes for typical files. AWS Lambda has a 15-minute maximum execution time with no CPU guarantee. SQS + long-running EC2 worker provides better reliability and cost predictability.

### ADR-002: EC2 over ECS/Fargate
Docker Compose on EC2 provides identical container isolation at 1/10th the operational complexity of ECS for a single-instance deployment. The architecture is designed to migrate to ECS with minimal code changes.

### ADR-003: CloudFront Signed Cookies over Signed URLs
HLS playback makes 300+ requests per video session (master playlist + variant playlists + all segments). Signed cookies authenticate all requests with a single cookie set, making them ideal for HLS.

### ADR-004: OAC over Legacy OAI
CloudFront OAC (Origin Access Control) uses SigV4 signing and supports S3 SSE-KMS. OAI is deprecated. OAC is more secure and AWS's current recommendation.

---

## Author

**Masir Jafri** — Senior Full-Stack Engineer specializing in cloud-native architectures

- 🌐 [masirjafri.in](https://masirjafri.in)
- 📝 [masirjafri.hashnode.dev](https://masirjafri.hashnode.dev)
- 💼 [LinkedIn](https://linkedin.com/in/masirjafri)
- 🐙 [GitHub](https://github.com/MasirJafri1)
