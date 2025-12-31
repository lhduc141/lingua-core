# ============================================================
# LINGUAPANDA - PRODUCTION DOCKERFILE (FIXED & PROD-SAFE)
# ============================================================

# STAGE 1: DEPENDENCIES
FROM node:20-alpine AS deps
WORKDIR /app

# Required for Prisma on Alpine
RUN apk add --no-cache libc6-compat openssl

# Copy lockfiles
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod


# STAGE 2: BUILDER
FROM node:20-alpine AS builder
WORKDIR /app

# Build tools for native deps + Prisma
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++

# Copy lockfiles
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install full deps (incl. dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build arg: service name (required)
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

RUN if [ -z "$SERVICE_NAME" ]; then \
      echo "ERROR: SERVICE_NAME is required"; exit 1; \
    fi

# Generate Prisma Client ONCE (build-time)
RUN pnpm exec prisma generate

# Build target service
RUN pnpm build ${SERVICE_NAME}


# STAGE 3: RUNNER
FROM node:20-alpine AS runner
WORKDIR /app

# Runtime deps only
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    dumb-init \
    tzdata

# Timezone
ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Runtime env
ARG SERVICE_NAME
ARG SERVICE_PORT=3000
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${SERVICE_PORT}
ENV NODE_ENV=production

# Copy production node_modules
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema + generated client
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy built output
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${SERVICE_NAME} ./dist

# Switch to non-root
USER nodejs

EXPOSE ${SERVICE_PORT}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

LABEL maintainer="Linguapanda Team"
