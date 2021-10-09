FROM node:16-alpine

WORKDIR /app

COPY ./src ./src
COPY ./package.json .
COPY ./package-lock.json .

RUN npm i --prod

RUN adduser -S guidelinebot

USER guidelinebot

ENTRYPOINT [ "node", "./src/index.js" ]
