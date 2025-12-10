# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy toàn bộ monorepo
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./
RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .

# Build dự án api-gateway trong monorepo
RUN pnpm build   # lệnh này chạy "nest build api-gateway" theo package.json

# ---------- RUN STAGE ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Copy runtime (dist + node_modules)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/apps/api-gateway/main.js"]
