# LINGUAPANDA - PRODUCTION DOCKERFILE (MONOREPO, PRISMA ONLY FOR api-gateway)

# STAGE 1: DEPENDENCIES (prod only)
FROM node:20-alpine AS deps
WORKDIR /app

# Helpful for native modules on Alpine (safe to have)
RUN apk add --no-cache libc6-compat openssl

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable && corepack prepare pnpm@latest --activate

# Production deps only
RUN pnpm install --frozen-lockfile --prod


# STAGE 2: BUILDER (full deps + build)
FROM node:20-alpine AS builder
WORKDIR /app

# Build tools (needed for some native deps during install/build)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable && corepack prepare pnpm@latest --activate

# Full deps (incl dev deps)
RUN pnpm install --frozen-lockfile

COPY . .

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

RUN if [ -z "$SERVICE_NAME" ]; then \
      echo "ERROR: SERVICE_NAME is required"; exit 1; \
    fi

# Prisma is only relevant for api-gateway (DB service)
RUN if [ "$SERVICE_NAME" = "api-gateway" ]; then \
      pnpm exec prisma generate && echo "Prisma client generated"; \
    else \
      echo "Skipping Prisma generate for ${SERVICE_NAME}"; \
    fi

# Build the target service
RUN pnpm build ${SERVICE_NAME}


# STAGE 3: RUNNER (prod runtime)
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    dumb-init \
    tzdata

ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

ARG SERVICE_NAME
ARG SERVICE_PORT=3000

ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${SERVICE_PORT}
ENV NODE_ENV=production

# Copy production dependencies
RUN if [ "$SERVICE_NAME" = "api-gateway" ]; then \
      echo "Using node_modules from builder (includes Prisma client)"; \
    else \
      echo "Using node_modules from deps (prod-only)"; \
    fi

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules_builder

RUN if [ "$SERVICE_NAME" = "api-gateway" ]; then \
      rm -rf ./node_modules && mv ./node_modules_builder ./node_modules; \
    else \
      rm -rf ./node_modules_builder; \
    fi

# Copy package.json (optional but nice for tooling/metadata)
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy Prisma schema (harmless even if ai-service doesn't use it)
# ai-service doesn't use DB, and your project doesn't have node_modules/.prisma anyway (JS-only prisma client)
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copy built app
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${SERVICE_NAME} ./dist

USER nodejs

EXPOSE ${SERVICE_PORT}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

LABEL maintainer="Linguapanda Team"
