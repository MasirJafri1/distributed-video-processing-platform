FROM node:22-bullseye

RUN apt-get update && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"

RUN npx prisma generate

RUN mkdir -p temp output

RUN useradd -m appuser

USER appuser

CMD ["npm", "start"]