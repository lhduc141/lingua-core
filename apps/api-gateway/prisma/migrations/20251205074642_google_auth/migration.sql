/*
  Warnings:

  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[googleSub]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleName]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleAvatarUrl]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `googleSub` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_fkey";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "current_refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "current_refresh_token_hash" TEXT,
ADD COLUMN     "googleAvatarUrl" TEXT,
ADD COLUMN     "googleName" TEXT,
ADD COLUMN     "googleSub" TEXT NOT NULL;

-- DropTable
DROP TABLE "accounts";

-- CreateIndex
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleName_key" ON "users"("googleName");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleAvatarUrl_key" ON "users"("googleAvatarUrl");
