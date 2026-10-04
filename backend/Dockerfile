# syntax=docker/dockerfile:1
# Multi-stage: `migrate` (dev deps, jalanin node-pg-migrate sekali per deploy)
# dan `runtime` (prod deps saja, non-root). Build target dipilih di compose.

FROM node:20-slim AS deps-full
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- one-shot job: apply migrasi DB ---------------------------------------
FROM node:20-slim AS migrate
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps-full /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
# migration seed-admin-user require ../src/utils/passwordPolicy
COPY src/utils/passwordPolicy.js ./src/utils/passwordPolicy.js
USER node
CMD ["npm", "run", "migrate:up"]

# --- API runtime ----------------------------------------------------------
FROM node:20-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
# pg_dump untuk tombol "Backup Data" di Settings (Admin). Versinya HARUS >= versi
# server DB (compose: postgres:16), makanya diambil dari repo PGDG - paket default
# Debian bookworm cuma postgresql-client-15 dan akan ditolak server 16.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-16 \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps-prod /app/node_modules ./node_modules
COPY package.json app.js server.js ./
COPY src ./src
# Folder upload avatar: mount volume ke /app/uploads biar persisten.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
