FROM node:22-bullseye

RUN apt-get update && \
    apt-get install -y ffmpeg

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"

RUN npx prisma generate

RUN mkdir -p temp output

RUN useradd -m appuser

RUN chown -R appuser:appuser /app

USER appuser

CMD ["npm", "start"]