# GitHub Actions CI/CD

This document explains the Flux deployment pipeline — how code changes are automatically deployed to the EC2 production server on every push to `main`.

---

## Workflow Architecture

```mermaid
graph LR
    Dev["Developer\nlocal commit"]
    Push["git push origin main"]
    GH["GitHub\n(main branch)"]
    GHA["GitHub Actions\nRuntime\n(ubuntu-latest)"]
    EC2["EC2 t3.small\n(Production)"]

    Dev --> Push --> GH
    GH -->|"on: push to main"| GHA
    GHA -->|"SSH appleboy/ssh-action"| EC2
    EC2 -->|"git pull + docker compose up"| EC2
```

---

## Workflow File

**Location**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to EC2

on:
  push:
    branches:
      - main          # Triggers on every push to main
  workflow_dispatch:  # Also allows manual trigger via GitHub UI

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            git config --global --add safe.directory '*'
            cd ${{ secrets.PROJECT_PATH }}
            git fetch origin main
            git reset --hard origin/main
            cd infra/docker
            export DOCKER_BUILDKIT=1
            export COMPOSE_DOCKER_CLI_BUILD=1
            docker compose up -d --build
            docker compose restart nginx
            docker image prune -f
```

---

## Workflow Steps Explained

### Step 1: Checkout Code (`actions/checkout@v4`)

Checks out the repository in the GitHub Actions runner. This is required for the runner to have access to the workflow file itself. In the current deployment model, the runner doesn't directly use the checked-out code (it SSHes to EC2 instead), but `checkout` is a best-practice step.

### Step 2: Deploy to EC2 (`appleboy/ssh-action@v1.0.3`)

The [appleboy/ssh-action](https://github.com/appleboy/ssh-action) is a community action that establishes an SSH connection and runs the deployment script.

**Parameters**:

| Parameter | Value | Description |
|---|---|---|
| `host` | `secrets.EC2_HOST` | EC2 public IP or domain name |
| `username` | `secrets.EC2_USER` | SSH username (typically `ubuntu`) |
| `key` | `secrets.EC2_SSH_KEY` | Private SSH key (PEM format, multi-line) |
| `script` | Deployment commands | Bash script executed on the EC2 instance |

---

## Deployment Script Breakdown

```bash
set -e  # Exit immediately on any error
```
If any command fails, the script stops immediately and GitHub Actions marks the job as failed. Without `set -e`, a failed `git fetch` might be silently ignored.

```bash
git config --global --add safe.directory '*'
```
Prevents Git's "dubious ownership" error that occurs when the git repo directory is owned by a different user than the one running the script.

```bash
cd ${{ secrets.PROJECT_PATH }}
git fetch origin main
git reset --hard origin/main
```
Pulls the latest code. `git reset --hard` is used instead of `git pull` to:
- Discard any local uncommitted changes on the server
- Ensure the server exactly matches the remote `main` branch
- Handle merge conflicts that would block `git pull`

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose up -d --build
```
- `DOCKER_BUILDKIT=1`: Enables BuildKit for faster, parallelised Docker layer builds
- `--build`: Rebuilds images even if they already exist (ensures code changes are picked up)
- `-d`: Detached mode (containers run in background)

```bash
docker compose restart nginx
```
Explicitly restarts Nginx after the other containers are up. This ensures Nginx picks up any new upstream container IPs if they changed after restart.

```bash
docker image prune -f
```
Removes dangling images (previous build artifacts). Without this, disk usage would grow with every deployment.

---

## GitHub Actions Secrets

Configure these secrets in GitHub repository Settings → Secrets and Variables → Actions:

| Secret Name | Example Value | Description |
|---|---|---|
| `EC2_HOST` | `13.126.158.139` | EC2 Elastic IP address |
| `EC2_USER` | `ubuntu` | SSH user |
| `EC2_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----\n...` | Full content of `video-platform-key.pem` |
| `PROJECT_PATH` | `/home/ubuntu/distributed-video-processing-platform` | Absolute path on EC2 |

### Adding EC2_SSH_KEY Secret

```bash
# Print the private key content (copy this into GitHub Secret)
cat video-platform-key.pem
```

The key must include the full `-----BEGIN ... KEY-----` header and footer with all line breaks preserved.

---

## Deployment Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GitHub
    participant GHA as GitHub Actions
    participant EC2

    Dev->>GitHub: git push origin main
    GitHub->>GHA: Trigger "Deploy to EC2" workflow
    GHA->>GHA: Checkout repository (actions/checkout@v4)
    GHA->>EC2: SSH connect (appleboy/ssh-action)
    EC2->>EC2: set -e
    EC2->>EC2: git fetch origin main
    EC2->>EC2: git reset --hard origin/main
    EC2->>EC2: docker compose up -d --build
    Note over EC2: All containers rebuild and restart
    EC2->>EC2: docker compose restart nginx
    EC2->>EC2: docker image prune -f
    EC2-->>GHA: Exit 0 (success) or non-zero (failure)
    GHA-->>GitHub: Job result (green ✅ or red ❌)
    GitHub-->>Dev: Email notification on failure
```

---

## Failure Handling

### Pipeline Failures

| Failure Scenario | Behaviour |
|---|---|
| `git reset` fails (no network) | `set -e` stops the script; containers remain on old code |
| Docker build fails | `set -e` stops; previous containers continue running |
| Docker compose up fails | Old containers may still be running (partially deployed) |
| SSH connection refused | GitHub Actions marks job as failed; no changes on server |

### Recovery from Failed Deployment

```bash
# Check what happened on the server
ssh -i video-platform-key.pem ubuntu@13.126.158.139

# View current container status
cd infra/docker && docker compose ps

# Check if services are healthy
curl http://localhost:3000/health

# If broken, manually roll back
git reset --hard <previous-good-commit>
docker compose up -d --build
```

### Zero-Downtime Deployment Limitation

The current deployment strategy causes **brief downtime** during container rebuilds. When `docker compose up -d --build` runs:
1. Old containers are stopped
2. New images are built
3. New containers start

The gap between steps 1 and 3 causes unavailability (~10-30 seconds for `upload-service`). For a production system, consider:
- **Blue-green deployment**: Run new containers before stopping old ones
- **Container health checks**: Docker waits for new containers to be healthy before stopping old ones
- **ALB + ECS rolling updates**: AWS native zero-downtime deployment

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| SSH private key in GitHub Secrets | GitHub encrypts secrets at rest; only exposed to workflow runs on `main` branch |
| EC2 SSH port open to `0.0.0.0/0` | GitHub Actions runners use dynamic IPs, making IP allowlisting impractical; consider SSM Session Manager as alternative |
| `git reset --hard` destroys local changes | EC2 `.env` file is outside git tracking (in `.gitignore`); CloudFront private key is outside git |
| Docker Hub pull rate limits | Using official images (`postgres:16`, `redis:7-alpine`, `nginx:latest`) — consider pinning to digest for reproducibility |

---

## Triggering a Manual Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Deploy to EC2** workflow
4. Click **Run workflow** → **Run workflow**

This is useful for:
- Redeploying without code changes (e.g., after updating `.env` on the server)
- Re-triggering a failed deployment
- Deploying a specific branch for testing

---

## Future Improvements

1. **Add a build/test job before deploy**: Run `npm run lint`, `npm run test`, and `npm run build` before deploying. Currently there are no tests.

2. **Docker image caching**: Cache Docker layers in GitHub Actions to speed up builds:
   ```yaml
   - name: Set up Docker Buildx
     uses: docker/setup-buildx-action@v3
   - name: Cache Docker layers
     uses: actions/cache@v3
     with:
       path: /tmp/.buildx-cache
       key: ${{ runner.os }}-buildx-${{ github.sha }}
   ```

3. **Deployment notifications**: Notify a Slack channel or send an email on deployment success/failure.

4. **Environment-specific workflows**: Add `deploy-staging.yml` and `deploy-prod.yml` triggered by different branches or tags.

5. **Smoke tests**: After deployment, automatically run health check HTTP requests to verify the deployment succeeded:
   ```yaml
   - name: Smoke test
     run: |
       sleep 10  # Wait for containers to be ready
       curl -f https://video-processing-api.masir-projects.me/health
   ```
