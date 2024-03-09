FROM node:20 as deps

WORKDIR /app

COPY ./package*.json .

RUN npm ci --omit=dev


FROM gcr.io/distroless/nodejs20-debian11:nonroot

WORKDIR /app

COPY --from=deps /app/ .
COPY ./src ./src

CMD [ "./src/index.js" ]
