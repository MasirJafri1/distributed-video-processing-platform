FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN apk add --no-cache openssl

RUN npm ci

COPY prisma ./prisma

ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"

RUN npx prisma generate

COPY . .

EXPOSE 3000

RUN adduser -D appuser

RUN chown -R appuser:appuser /app

USER appuser

CMD ["npm", "start"]