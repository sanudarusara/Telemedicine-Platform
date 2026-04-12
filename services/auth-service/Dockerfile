# ═══════════════════════════════════════════════════════════════════════════════
# Auth Service - Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════

# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY auth-service/package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY --from=builder /app/node_modules ./node_modules

# Copy shared folder (needed for kafka topics/events)
COPY shared ../shared

# Copy application code
COPY auth-service .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
