# LINGUAPANDA - PRODUCTION DOCKERFILE

# STAGE 1: DEPENDENCIES
# Purpose: Install production dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# STAGE 2: BUILDER
# Purpose: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install ALL dependencies (need devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy entire monorepo source
COPY . .

# Generate Prisma Client (required for api-gateway)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build argument: which service to build
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

# Validate SERVICE_NAME
RUN if [ -z "$SERVICE_NAME" ]; then \
      echo "ERROR: SERVICE_NAME build arg is required"; \
      exit 1; \
    fi

# Build the specific service
RUN echo "Building ${SERVICE_NAME}..." && \
    pnpm build ${SERVICE_NAME}

# Verify build output exists
RUN ls -la dist/apps/${SERVICE_NAME}/ || \
    (echo "ERROR: Build failed for ${SERVICE_NAME}" && exit 1)

# Display build info
RUN echo "Build successful for ${SERVICE_NAME}" && \
    echo "Output size: $(du -sh dist/apps/${SERVICE_NAME})" && \
    echo "Files:" && \
    ls -lh dist/apps/${SERVICE_NAME}/

# STAGE 3: RUNNER (Production)
# Purpose: Minimal runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    wget \
    dumb-init \
    tzdata

# Set timezone
ENV TZ=Asia/Ho_Chi_Minh
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Build arguments
ARG SERVICE_NAME
ARG SERVICE_PORT=3000
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${SERVICE_PORT}
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package.json for metadata
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy Prisma schema + generated client (for api-gateway)
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${SERVICE_NAME} ./dist

# Verify copied files
RUN echo "📦 Final image contents:" && \
    ls -lah ./dist/ && \
    echo "✅ All files copied successfully"

# Switch to non-root user for security
USER nodejs

# Expose port (documented, not enforced)
EXPOSE ${SERVICE_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start command
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# BUILD METADATA
LABEL maintainer="Linguapanda Team"
LABEL description="Production image for Linguapanda ${SERVICE_NAME}"
LABEL org.opencontainers.image.source="https://github.com/lhduc141/lingua-core"
