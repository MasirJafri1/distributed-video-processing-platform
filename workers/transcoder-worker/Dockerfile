FROM node:22-bullseye

RUN apt-get update && \
    apt-get install -y ffmpeg

WORKDIR /app

ENV NODE_ENV=production

# Create appuser first so we can copy files as this user
RUN useradd -m appuser

# Copy dependencies and install
COPY --chown=appuser:appuser package*.json ./
RUN npm ci

# Generate Prisma client
COPY --chown=appuser:appuser prisma ./prisma
ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"
RUN npx prisma generate

# Copy source files (excluding temp/ and output/ via .dockerignore)
COPY --chown=appuser:appuser . .

# Create empty temp and output folders and set correct ownership
RUN mkdir -p temp output && chown -R appuser:appuser temp output

USER appuser

CMD ["npm", "start"]