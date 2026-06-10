# EC2 Deployment

This document explains how Flux is deployed and managed on the AWS EC2 instance (`t3.small`, Ubuntu 22.04) using Docker Compose.

---

## Server Overview

| Property | Value |
|---|---|
| Instance type | `t3.small` (2 vCPU, 2 GB RAM) |
| OS | Ubuntu 22.04 LTS |
| Region | `ap-south-1` (Mumbai) |
| Elastic IP | `13.126.158.139` |
| SSH Key | `video-platform-key.pem` |
| Project path | `/home/ubuntu/distributed-video-processing-platform` |

---

## Connecting to the Server

```bash
ssh -i "video-platform-key.pem" ubuntu@13.126.158.139

# Or using the configured SSH alias
ssh -i ~/.ssh/video-platform-key.pem ubuntu@video-processing-api.masir-projects.me
```

---

## Initial Server Setup (One-Time)

This section is for reference — the server has already been configured. Run these only when setting up a fresh EC2 instance.

### Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Install Required Tools

```bash
# Install FFmpeg (for local testing; worker uses it in Docker)
sudo apt install -y ffmpeg

# Install git
sudo apt install -y git

# Install Certbot (for Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

### Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/MasirJafri1/distributed-video-processing-platform.git
cd distributed-video-processing-platform
```

### Configure Environment

```bash
cd infra/docker
cp .env.example .env
nano .env  # Fill in all values
```

### Copy CloudFront Private Key

```bash
# Create keys directory
mkdir -p /home/ubuntu/distributed-video-processing-platform/infra/keys

# Copy key from local machine
scp -i video-platform-key.pem \
  infra/keys/cloudfront-private.pem \
  ubuntu@13.126.158.139:/home/ubuntu/distributed-video-processing-platform/infra/keys/
```

### Issue TLS Certificate (Let's Encrypt)

```bash
# Issue certificate (HTTP-01 challenge)
# Note: DNS must already point to this server
sudo certbot --nginx -d video-processing-api.masir-projects.me -d video-processing.masir-projects.me

# Verify renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker compose -f /home/ubuntu/distributed-video-processing-platform/infra/docker/docker-compose.yml restart nginx" | sudo crontab -
```

---

## Deployment Process

### Automated Deployment (GitHub Actions)

Deployments trigger automatically on every push to `main`. See [github-actions.md](./github-actions.md).

The deployment script runs on the EC2 instance:

```bash
set -e
git config --global --add safe.directory '*'
cd /home/ubuntu/distributed-video-processing-platform
git fetch origin main
git reset --hard origin/main
cd infra/docker
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose up -d --build
docker compose restart nginx
docker image prune -f
```

### Manual Deployment

```bash
# SSH to server
ssh -i video-platform-key.pem ubuntu@13.126.158.139

# Pull latest code
cd /home/ubuntu/distributed-video-processing-platform
git fetch origin main
git reset --hard origin/main

# Rebuild and restart
cd infra/docker
docker compose up -d --build
docker compose restart nginx

# Clean up old images
docker image prune -f
```

---

## Container Management

### Check Service Status

```bash
cd infra/docker

# View all containers and health status
docker compose ps

# View resource usage
docker stats
```

### View Logs

```bash
# All services (follow)
docker compose logs -f

# Specific service
docker compose logs -f upload-service
docker compose logs -f transcoder-worker
docker compose logs -f nginx
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 upload-service
```

### Restart Services

```bash
# Restart a single service (without rebuild)
docker compose restart upload-service

# Restart all services
docker compose restart

# Stop and start a service (full reset)
docker compose stop transcoder-worker
docker compose start transcoder-worker
```

### Scaling the Worker

```bash
# Run 2 worker instances (if the server has enough CPU/RAM)
docker compose up -d --scale transcoder-worker=2

# Return to 1 instance
docker compose up -d --scale transcoder-worker=1
```

---

## Environment Variables

All environment variables are stored in `infra/docker/.env`. This file is:
- NOT committed to git
- Read by Docker Compose for all services
- Contains database credentials, AWS keys, and CloudFront signing configuration

```bash
# View current .env (as root)
cat infra/docker/.env

# Edit .env
nano infra/docker/.env

# After editing .env, restart affected services
docker compose up -d
```

---

## Database Management

### Run Fluxa Migrations

```bash
# Apply migrations to production database
docker compose exec upload-service npx Fluxa migrate deploy

# Check migration status
docker compose exec upload-service npx Fluxa migrate status
```

### Direct PostgreSQL Access

```bash
# Connect to PostgreSQL container
docker compose exec postgres psql -U admin -d video_platform

# Or from host (port 5432 is mapped)
psql -h localhost -U admin -d video_platform
```

### Manual Backup

```bash
# Create a database dump
docker compose exec postgres pg_dump -U admin video_platform > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T postgres psql -U admin video_platform < backup_20250610.sql
```

---

## Rollback

### Quick Rollback (Previous Git Commit)

```bash
# SSH to server
ssh -i video-platform-key.pem ubuntu@13.126.158.139

cd /home/ubuntu/distributed-video-processing-platform

# Find the previous commit hash
git log --oneline -5

# Reset to previous commit
git reset --hard <previous-commit-hash>

# Rebuild
cd infra/docker
docker compose up -d --build
```

### Rollback via GitHub

1. In GitHub, create a revert of the bad commit
2. Push to main — GitHub Actions triggers automatic redeployment
3. Or manually: `git revert HEAD && git push origin main`

---

## Disk Management

The EC2 instance has 30 GB EBS. Monitor disk usage:

```bash
# Check disk usage
df -h

# Check Docker's disk usage
docker system df

# Clean up stopped containers, unused images, build cache
docker system prune -af

# Clean up unused volumes (DANGER: may delete postgres_data if stopped)
docker volume prune  # Only run if postgres container is running
```

**Expected disk usage breakdown**:
- OS + Docker: ~8 GB
- Docker images: ~3-5 GB
- `postgres_data` volume: grows with videos
- FFmpeg temp files: 200-400 MB during active transcoding (cleaned up automatically)

---

## Monitoring on the Server

```bash
# CPU and memory
top
htop  # Install: sudo apt install htop

# Check if any process is maxing CPU (transcoding)
ps aux --sort=-%cpu | head -10

# Network connections
ss -tlnp

# Check Nginx logs on host
sudo tail -f /var/log/nginx/access.log

# Docker container memory
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## Startup Order and Dependencies

After a server reboot, Docker services restart automatically because of Docker's `--restart` policy (set via Docker Compose):

```yaml
# Docker Compose default restart policy for all services
restart: unless-stopped  # implied when using docker compose up -d
```

**Startup verification checklist**:

```bash
# 1. Verify postgres is running
docker compose ps postgres

# 2. Verify redis is running  
docker compose ps redis

# 3. Verify upload-service is healthy
curl http://localhost:3000/health

# 4. Verify nginx is serving HTTPS
curl -I https://video-processing-api.masir-projects.me/health

# 5. Verify frontend is accessible
curl -I https://video-processing.masir-projects.me

# 6. Verify worker is polling SQS
docker compose logs transcoder-worker | grep "Polling\|Worker started"
```

---

## Troubleshooting

### Container keeps restarting

```bash
# Check restart count and reason
docker compose ps
docker compose logs --tail=50 <service-name>

# Common causes:
# - Missing environment variable → service crashes on startup
# - Database not ready → check postgres health
# - Port conflict → another process on same port
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
docker compose ps upload-service
docker compose logs upload-service

# Restart backend
docker compose restart upload-service
docker compose restart nginx
```

### Out of disk space

```bash
# Emergency cleanup
docker system prune -af
docker volume prune --filter "label!=keep"

# Check what's using space
du -sh /var/lib/docker/*
```

### Certificate expired

```bash
# Manual renewal
sudo certbot renew

# Restart nginx to pick up new cert
docker compose restart nginx
```
