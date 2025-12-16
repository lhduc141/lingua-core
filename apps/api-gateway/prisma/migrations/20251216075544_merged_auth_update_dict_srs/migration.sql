/*
  Warnings:

  - You are about to drop the column `audio_url` on the `dict_entries` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `dict_examples` table. All the data in the column will be lost.
  - You are about to drop the column `meta_json` on the `onboarding_surveys` table. All the data in the column will be lost.
  - You are about to drop the column `ref_id` on the `srs_cards` table. All the data in the column will be lost.
  - You are about to drop the column `ref_type` on the `srs_cards` table. All the data in the column will be lost.
  - You are about to drop the column `stats_json` on the `srs_cards` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `srs_collection_cards` table. All the data in the column will be lost.
  - You are about to drop the column `parent_id` on the `srs_collections` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `srs_collections` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `srs_collections` table. All the data in the column will be lost.
  - You are about to drop the column `ease_after` on the `srs_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `next_interval_days` on the `srs_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `srs_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `googleAvatarUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleSub` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `ai_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dict_forms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dict_relations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `onboarding_survey_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[google_sub]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `example` on table `dict_examples` required. This step will fail if there are existing NULL values in that column.
  - Made the column `short_def` on table `dict_senses` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `primary_goal` to the `onboarding_surveys` table without a default value. This is not possible if the table is not empty.
  - Made the column `planned_study_hours_per_week` on table `onboarding_surveys` required. This step will fail if there are existing NULL values in that column.
  - Made the column `primary_focus_skills` on table `onboarding_surveys` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ease` on table `srs_cards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `interval_days` on table `srs_cards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `due_at` on table `srs_cards` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `new_ease` to the `srs_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_interval_days` to the `srs_reviews` table without a default value. This is not possible if the table is not empty.
  - Made the column `grade` on table `srs_reviews` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `google_sub` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "dict_forms" DROP CONSTRAINT "dict_forms_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "dict_relations" DROP CONSTRAINT "dict_relations_from_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "dict_relations" DROP CONSTRAINT "dict_relations_to_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_survey_answers" DROP CONSTRAINT "onboarding_survey_answers_survey_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_collections" DROP CONSTRAINT "srs_collections_parent_id_fkey";

-- DropIndex
DROP INDEX "users_googleSub_key";

-- AlterTable
ALTER TABLE "dict_entries" DROP COLUMN "audio_url",
ADD COLUMN     "cefrLevel" TEXT,
ADD COLUMN     "frequency" INTEGER,
ADD COLUMN     "is_common" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variants" JSONB;

-- AlterTable
ALTER TABLE "dict_examples" DROP COLUMN "locale",
ALTER COLUMN "example" SET NOT NULL;

-- AlterTable
ALTER TABLE "dict_senses" ADD COLUMN     "antonyms" JSONB,
ADD COLUMN     "synonyms" JSONB,
ADD COLUMN     "vi_def" TEXT,
ALTER COLUMN "short_def" SET NOT NULL;

-- AlterTable
ALTER TABLE "onboarding_surveys" DROP COLUMN "meta_json",
ADD COLUMN     "additional_context" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "previous_learning_experience" TEXT,
ADD COLUMN     "primary_goal" TEXT NOT NULL,
ADD COLUMN     "target_certification" TEXT,
ADD COLUMN     "target_score" TEXT,
ADD COLUMN     "years_studied" INTEGER,
ALTER COLUMN "planned_study_hours_per_week" SET NOT NULL,
ALTER COLUMN "primary_focus_skills" SET NOT NULL;

-- AlterTable
ALTER TABLE "srs_cards" DROP COLUMN "ref_id",
DROP COLUMN "ref_type",
DROP COLUMN "stats_json",
ADD COLUMN     "back" TEXT,
ADD COLUMN     "card_type" TEXT NOT NULL DEFAULT 'dictionary',
ADD COLUMN     "correct_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "entry_id" UUID,
ADD COLUMN     "front" TEXT,
ADD COLUMN     "total_reviews" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "ease" SET NOT NULL,
ALTER COLUMN "interval_days" SET NOT NULL,
ALTER COLUMN "interval_days" SET DEFAULT 0,
ALTER COLUMN "due_at" SET NOT NULL,
ALTER COLUMN "due_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "srs_collection_cards" DROP COLUMN "position",
ADD COLUMN     "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "srs_collections" DROP COLUMN "parent_id",
DROP COLUMN "position",
DROP COLUMN "visibility",
ADD COLUMN     "color" TEXT,
ADD COLUMN     "due_today" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_cards" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "srs_reviews" DROP COLUMN "ease_after",
DROP COLUMN "next_interval_days",
DROP COLUMN "notes",
ADD COLUMN     "new_ease" DECIMAL NOT NULL,
ADD COLUMN     "new_interval_days" INTEGER NOT NULL,
ALTER COLUMN "grade" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "googleAvatarUrl",
DROP COLUMN "googleName",
DROP COLUMN "googleSub",
ADD COLUMN     "dob" DATE,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "google_avatar_url" TEXT,
ADD COLUMN     "google_name" TEXT,
ADD COLUMN     "google_sub" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "ai_cache";

-- DropTable
DROP TABLE "dict_forms";

-- DropTable
DROP TABLE "dict_relations";

-- DropTable
DROP TABLE "onboarding_survey_answers";

-- DropTable
DROP TABLE "profiles";

-- DropEnum
DROP TYPE "auth_provider";

-- CreateTable
CREATE TABLE "collocations" (
    "collocationId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "phrase" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "vi_meaning" TEXT,
    "example" TEXT,
    "vi_example" TEXT,
    "frequency" INTEGER,
    "cefr_level" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collocations_pkey" PRIMARY KEY ("collocationId")
);

-- CreateTable
CREATE TABLE "user_vocabulary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "context" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collocations_phrase_idx" ON "collocations"("phrase");

-- CreateIndex
CREATE INDEX "collocations_entry_id_idx" ON "collocations"("entry_id");

-- CreateIndex
CREATE INDEX "collocations_sense_id_idx" ON "collocations"("sense_id");

-- CreateIndex
CREATE INDEX "collocations_cefr_level_idx" ON "collocations"("cefr_level");

-- CreateIndex
CREATE INDEX "user_vocabulary_user_id_status_idx" ON "user_vocabulary"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_vocabulary_user_id_added_at_idx" ON "user_vocabulary"("user_id", "added_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_vocabulary_user_id_entry_id_key" ON "user_vocabulary"("user_id", "entry_id");

-- CreateIndex
CREATE INDEX "dict_entries_headword_lang_idx" ON "dict_entries"("headword", "lang");

-- CreateIndex
CREATE INDEX "dict_entries_cefrLevel_idx" ON "dict_entries"("cefrLevel");

-- CreateIndex
CREATE INDEX "dict_entries_frequency_idx" ON "dict_entries"("frequency");

-- CreateIndex
CREATE INDEX "dict_examples_sense_id_idx" ON "dict_examples"("sense_id");

-- CreateIndex
CREATE INDEX "dict_senses_entry_id_order_idx" ON "dict_senses"("entry_id", "order");

-- CreateIndex
CREATE INDEX "onboarding_surveys_user_id_created_at_idx" ON "onboarding_surveys"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "srs_cards_user_id_due_at_idx" ON "srs_cards"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "srs_cards_user_id_card_type_idx" ON "srs_cards"("user_id", "card_type");

-- CreateIndex
CREATE INDEX "srs_cards_entry_id_idx" ON "srs_cards"("entry_id");

-- CreateIndex
CREATE INDEX "srs_collection_cards_card_id_idx" ON "srs_collection_cards"("card_id");

-- CreateIndex
CREATE INDEX "srs_collections_user_id_created_at_idx" ON "srs_collections"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "srs_reviews_card_id_reviewed_at_idx" ON "srs_reviews"("card_id", "reviewed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- AddForeignKey
ALTER TABLE "collocations" ADD CONSTRAINT "collocations_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collocations" ADD CONSTRAINT "collocations_sense_id_fkey" FOREIGN KEY ("sense_id") REFERENCES "dict_senses"("sense_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE SET NULL ON UPDATE CASCADE;
