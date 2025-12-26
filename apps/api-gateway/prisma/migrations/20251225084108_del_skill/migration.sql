/*
  Warnings:

  - You are about to drop the column `skill_id` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `skill_id` on the `practice_sessions` table. All the data in the column will be lost.
  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `skillName` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skillName` to the `practice_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "skill_name" AS ENUM ('reading', 'writing', 'speaking');

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_skill_id_fkey";

-- DropIndex
DROP INDEX "lessons_skill_id_idx";

-- DropIndex
DROP INDEX "practice_sessions_skill_id_idx";

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "skill_id",
ADD COLUMN     "skillName" "skill_name" NOT NULL;

-- AlterTable
ALTER TABLE "practice_sessions" DROP COLUMN "skill_id",
ADD COLUMN     "skillName" "skill_name" NOT NULL;

-- DropTable
DROP TABLE "skills";

-- CreateIndex
CREATE INDEX "lessons_skillName_idx" ON "lessons"("skillName");

-- CreateIndex
CREATE INDEX "practice_sessions_skillName_idx" ON "practice_sessions"("skillName");
