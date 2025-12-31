/*
  Warnings:

  - You are about to drop the column `owner_id` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `owner_type` on the `assets` table. All the data in the column will be lost.
  - The `card_type` column on the `srs_cards` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `due_today` on the `srs_collections` table. All the data in the column will be lost.
  - Added the required column `kind` to the `assets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "srs_card_type" AS ENUM ('dictionary', 'custom');

-- CreateEnum
CREATE TYPE "asset_kind" AS ENUM ('audio', 'image', 'video', 'document');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "assessment_ref_type" ADD VALUE 'placement_test';
ALTER TYPE "assessment_ref_type" ADD VALUE 'practice_session';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "question_type" ADD VALUE 'essay';
ALTER TYPE "question_type" ADD VALUE 'speaking';

-- AlterTable
ALTER TABLE "assets" DROP COLUMN "owner_id",
DROP COLUMN "owner_type",
DROP COLUMN "kind",
ADD COLUMN     "kind" "asset_kind" NOT NULL;

-- AlterTable
ALTER TABLE "dict_entries" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "learning_plan_items" ADD COLUMN     "generated_at" TIMESTAMP(3),
ADD COLUMN     "plan_cycle" INTEGER;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "cefr_level" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "prerequisites" JSONB,
ADD COLUMN     "skill_id" UUID,
ADD COLUMN     "theory_content" JSONB,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "passage_id" UUID;

-- AlterTable
ALTER TABLE "srs_cards" DROP COLUMN "card_type",
ADD COLUMN     "card_type" "srs_card_type" NOT NULL DEFAULT 'dictionary';

-- AlterTable
ALTER TABLE "srs_collections" DROP COLUMN "due_today";

-- CreateTable
CREATE TABLE "skills" (
    "skill_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "passages" (
    "passage_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "word_count" INTEGER,
    "cefr_level" TEXT,
    "topic" TEXT,
    "source_tag" TEXT,
    "audio_url" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "passages_pkey" PRIMARY KEY ("passage_id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "skill_id" UUID NOT NULL,
    "cefr_level" TEXT,
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "practice_session_questions" (
    "session_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "practice_session_questions_pkey" PRIMARY KEY ("session_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "passages_cefr_level_idx" ON "passages"("cefr_level");

-- CreateIndex
CREATE INDEX "passages_topic_idx" ON "passages"("topic");

-- CreateIndex
CREATE INDEX "practice_sessions_skill_id_idx" ON "practice_sessions"("skill_id");

-- CreateIndex
CREATE INDEX "practice_sessions_cefr_level_idx" ON "practice_sessions"("cefr_level");

-- CreateIndex
CREATE INDEX "learning_plan_items_user_id_plan_cycle_idx" ON "learning_plan_items"("user_id", "plan_cycle");

-- CreateIndex
CREATE INDEX "lessons_skill_id_idx" ON "lessons"("skill_id");

-- CreateIndex
CREATE INDEX "lessons_cefr_level_idx" ON "lessons"("cefr_level");

-- CreateIndex
CREATE INDEX "questions_passage_id_idx" ON "questions"("passage_id");

-- CreateIndex
CREATE INDEX "srs_cards_user_id_card_type_idx" ON "srs_cards"("user_id", "card_type");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("skill_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session_questions" ADD CONSTRAINT "practice_session_questions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session_questions" ADD CONSTRAINT "practice_session_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("skill_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "passages"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;
