FROM node:18 as deps

WORKDIR /app

COPY ./package*.json .

RUN npm ci --omit=dev


FROM gcr.io/distroless/nodejs:18

WORKDIR /app

COPY --from=deps /app/ .
COPY ./src ./src

CMD [ "./src/index.js" ]
