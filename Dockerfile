# LINGUAPANDA - PRODUCTION DOCKERFILE

# STAGE 1: DEPENDENCIES
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

# STAGE 2: BUILDER
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .

RUN npx prisma generate --schema=./prisma/schema.prisma --force && \
    echo "✅ Prisma client generated" && \
    ls -la node_modules/.prisma/

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

RUN if [ -z "$SERVICE_NAME" ]; then \
      echo "ERROR: SERVICE_NAME required"; exit 1; \
    fi

RUN pnpm build ${SERVICE_NAME}

# STAGE 3: RUNNER
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache wget dumb-init tzdata

ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

ARG SERVICE_NAME
ARG SERVICE_PORT=3000
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${SERVICE_PORT}
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package.json
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy Prisma schema
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Generate Prisma Client fresh for api-gateway
RUN if [ "$SERVICE_NAME" = "api-gateway" ]; then \
      echo "📦 Generating Prisma client for ${SERVICE_NAME}..."; \
      npx prisma generate --schema=./prisma/schema.prisma --force && \
      chown -R nodejs:nodejs ./node_modules/.prisma && \
      echo "✅ Prisma client generated"; \
    else \
      echo "ℹ️  Skipping Prisma for ${SERVICE_NAME}"; \
    fi

# Copy built app
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${SERVICE_NAME} ./dist

USER nodejs
EXPOSE ${SERVICE_PORT}

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

LABEL maintainer="Linguapanda Team"