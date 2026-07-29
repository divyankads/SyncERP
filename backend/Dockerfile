# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install build tools needed for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDeps – not needed here since we use server.js)
RUN npm ci --omit=dev

# Copy application source
COPY . .

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache sqlite

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy from build stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server.js    ./server.js
COPY --from=base /app/db.js        ./db.js
COPY --from=base /app/package.json ./package.json

# Create data directory for SQLite DB (mounted as volume in production)
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Run as non-root
USER appuser

EXPOSE 5001

ENV NODE_ENV=production \
    PORT=5001 \
    DB_PATH=/app/data/syncerp.db

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "server.js"]
