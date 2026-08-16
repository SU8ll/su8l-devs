# ── SU8L DEVs Bot ────────────────────────────────────────────────────────────
# Build context is the repo ROOT (workspace). See docker-compose.yml.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY bot/package.json bot/package.json
COPY web/package.json web/package.json
RUN npm ci --include=dev

COPY bot bot
RUN npm run build -w @su8l/bot

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/bot/dist bot/dist
COPY --from=build /app/bot/package.json bot/package.json
WORKDIR /app/bot
EXPOSE 4001
CMD ["node", "dist/index.js"]
