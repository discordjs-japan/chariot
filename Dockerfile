FROM node:18 as deps

WORKDIR /app

COPY ./package*.json .

RUN npm ci --omit=dev


FROM gcr.io/distroless/nodejs18-debian11:nonroot

USER nonroot
WORKDIR /app

COPY --chown=nonroot:nonroot --from=deps /app/ .
COPY --chown=nonroot:nonroot ./src ./src

CMD [ "./src/index.js" ]
