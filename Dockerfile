# ========== BASE IMAGE ==========
FROM node:22-alpine AS base

# Bật corepack để dùng pnpm
RUN corepack enable

WORKDIR /app

# ========== INSTALL DEPENDENCIES (BUILDER) ==========
FROM base AS builder

# Copy file pnpm / workspace config từ root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json của api-gateway và libs
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY libs ./libs

# Cài dependencies (dùng pnpm workspace)
RUN pnpm install --frozen-lockfile

# Copy toàn bộ source vào image
COPY . .

# (Optional) Generate Prisma Client nếu dùng Prisma
# Bỏ qua dòng này nếu bạn chưa setup Prisma
RUN pnpm prisma generate

# Build NestJS (sẽ build tất cả apps, trong đó có api-gateway)
RUN pnpm build

# ========== RUNTIME IMAGE ==========
FROM base AS runtime

WORKDIR /app

# Copy node_modules & dist từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose port Nest API (thay 3001 nếu app dùng port khác)
EXPOSE 3001

# Lệnh chạy API Gateway
# Nếu app của bạn tên khác, chỉnh path lại:
#  dist/apps/<tên-app>/main.js
CMD ["node", "dist/apps/api-gateway/main.js"]
