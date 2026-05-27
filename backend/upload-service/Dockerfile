FROM node:22-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV DATABASE_URL="postgresql://admin:password@postgres:5432/video_platform"

RUN npx prisma generate

EXPOSE 3000

RUN adduser -D appuser

USER appuser

CMD ["npm", "start"]