FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create appuser first so we can copy files as this user
RUN adduser -D appuser

RUN apk add --no-cache openssl

# Copy dependencies and install
COPY --chown=appuser:appuser package*.json ./
RUN npm ci

# Generate Prisma client
COPY --chown=appuser:appuser prisma ./prisma
ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"
RUN npx prisma generate

# Copy source files
COPY --chown=appuser:appuser . .

EXPOSE 3000

USER appuser

CMD ["npm", "start"]