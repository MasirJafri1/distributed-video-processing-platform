FROM node:22-bullseye

RUN apt-get update && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p temp output

CMD ["npm", "start"]