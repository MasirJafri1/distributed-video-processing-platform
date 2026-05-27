FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"

RUN npx prisma generate

EXPOSE 3000

RUN adduser -D appuser

RUN chown -R appuser:appuser /app

USER appuser

CMD ["npm", "start"]