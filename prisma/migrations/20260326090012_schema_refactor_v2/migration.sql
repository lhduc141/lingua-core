/*
  Warnings:

  - The primary key for the `collocations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `collocationId` on the `collocations` table. All the data in the column will be lost.
  - You are about to drop the column `auto_generated` on the `learning_plan_items` table. All the data in the column will be lost.
  - You are about to drop the column `due_window_days` on the `learning_plan_items` table. All the data in the column will be lost.
  - You are about to drop the column `source_assessment_id` on the `learning_plan_items` table. All the data in the column will be lost.
  - You are about to drop the column `target_level` on the `learning_plan_items` table. All the data in the column will be lost.
  - You are about to drop the column `author_id` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `published_at` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `reviewer_id` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `skillName` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `topic_id` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `audio_url` on the `passages` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `passages` table. All the data in the column will be lost.
  - You are about to drop the column `author_id` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `exam_kind` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `published_at` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `reviewer_id` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `assessment_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_ai_calls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_evaluations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `band_scores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cat_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eval_dimensions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_section_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `placement_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `practice_session_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `practice_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rubric_criteria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_cards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_collection_cards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_collections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `study_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `topic_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `topics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `skill_name` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "exercise_type" AS ENUM ('lesson', 'placement_test', 'question_set');

-- CreateEnum
CREATE TYPE "exercise_status" AS ENUM ('draft', 'in_progress', 'submitted', 'scored', 'canceled');

-- DropForeignKey
ALTER TABLE "assessment_reports" DROP CONSTRAINT "assessment_reports_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_reports" DROP CONSTRAINT "assessment_reports_explanations_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_reports" DROP CONSTRAINT "assessment_reports_user_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_cat_session_id_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_ai_calls" DROP CONSTRAINT "attempt_ai_calls_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_ai_calls" DROP CONSTRAINT "attempt_ai_calls_prompt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_option_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_evaluations" DROP CONSTRAINT "attempt_evaluations_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_input_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_output_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_question_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_transcript_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "band_scores" DROP CONSTRAINT "band_scores_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "cat_sessions" DROP CONSTRAINT "cat_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "eval_dimensions" DROP CONSTRAINT "eval_dimensions_attempt_eval_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_section_questions" DROP CONSTRAINT "exam_section_questions_exam_section_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_section_questions" DROP CONSTRAINT "exam_section_questions_passage_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_section_questions" DROP CONSTRAINT "exam_section_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_sections" DROP CONSTRAINT "exam_sections_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_cycle_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_plan_items" DROP CONSTRAINT "learning_plan_items_source_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_translations" DROP CONSTRAINT "lesson_translations_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "placement_attempts" DROP CONSTRAINT "placement_attempts_question_id_fkey";

-- DropForeignKey
ALTER TABLE "placement_attempts" DROP CONSTRAINT "placement_attempts_session_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_session_questions" DROP CONSTRAINT "practice_session_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_session_questions" DROP CONSTRAINT "practice_session_questions_session_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "question_tags" DROP CONSTRAINT "question_tags_question_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_cards" DROP CONSTRAINT "srs_cards_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_cards" DROP CONSTRAINT "srs_cards_user_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_collection_cards" DROP CONSTRAINT "srs_collection_cards_card_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_collection_cards" DROP CONSTRAINT "srs_collection_cards_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_collections" DROP CONSTRAINT "srs_collections_user_id_fkey";

-- DropForeignKey
ALTER TABLE "srs_reviews" DROP CONSTRAINT "srs_reviews_card_id_fkey";

-- DropForeignKey
ALTER TABLE "study_sessions" DROP CONSTRAINT "study_sessions_plan_item_id_fkey";

-- DropForeignKey
ALTER TABLE "study_sessions" DROP CONSTRAINT "study_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "topic_translations" DROP CONSTRAINT "topic_translations_topic_id_fkey";

-- DropIndex
DROP INDEX "lessons_skillName_idx";

-- AlterTable
ALTER TABLE "collocations" DROP CONSTRAINT "collocations_pkey",
DROP COLUMN "collocationId",
ADD COLUMN     "collocation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "collocations_pkey" PRIMARY KEY ("collocation_id");

-- AlterTable
ALTER TABLE "learning_plan_items" DROP COLUMN "auto_generated",
DROP COLUMN "due_window_days",
DROP COLUMN "source_assessment_id",
DROP COLUMN "target_level",
ADD COLUMN     "source_record_id" UUID;

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "author_id",
DROP COLUMN "published_at",
DROP COLUMN "reviewer_id",
DROP COLUMN "skillName",
DROP COLUMN "topic_id",
DROP COLUMN "version",
ADD COLUMN     "skill_name" "skill_name" NOT NULL;

-- AlterTable
ALTER TABLE "passages" DROP COLUMN "audio_url",
DROP COLUMN "image_url";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "author_id",
DROP COLUMN "exam_kind",
DROP COLUMN "published_at",
DROP COLUMN "reviewer_id",
DROP COLUMN "version";

-- DropTable
DROP TABLE "assessment_reports";

-- DropTable
DROP TABLE "assessments";

-- DropTable
DROP TABLE "assets";

-- DropTable
DROP TABLE "attempt_ai_calls";

-- DropTable
DROP TABLE "attempt_answers";

-- DropTable
DROP TABLE "attempt_evaluations";

-- DropTable
DROP TABLE "attempts";

-- DropTable
DROP TABLE "band_scores";

-- DropTable
DROP TABLE "cat_sessions";

-- DropTable
DROP TABLE "eval_dimensions";

-- DropTable
DROP TABLE "exam_cycles";

-- DropTable
DROP TABLE "exam_section_questions";

-- DropTable
DROP TABLE "exam_sections";

-- DropTable
DROP TABLE "exams";

-- DropTable
DROP TABLE "lesson_translations";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "placement_attempts";

-- DropTable
DROP TABLE "practice_session_questions";

-- DropTable
DROP TABLE "practice_sessions";

-- DropTable
DROP TABLE "prompts";

-- DropTable
DROP TABLE "question_tags";

-- DropTable
DROP TABLE "rubric_criteria";

-- DropTable
DROP TABLE "srs_cards";

-- DropTable
DROP TABLE "srs_collection_cards";

-- DropTable
DROP TABLE "srs_collections";

-- DropTable
DROP TABLE "srs_reviews";

-- DropTable
DROP TABLE "study_sessions";

-- DropTable
DROP TABLE "topic_translations";

-- DropTable
DROP TABLE "topics";

-- DropEnum
DROP TYPE "assessment_ref_type";

-- DropEnum
DROP TYPE "assessment_status";

-- DropEnum
DROP TYPE "asset_kind";

-- DropEnum
DROP TYPE "attempt_modality";

-- DropEnum
DROP TYPE "exam_category";

-- DropEnum
DROP TYPE "exam_cycle_kind";

-- DropEnum
DROP TYPE "exam_kind";

-- DropEnum
DROP TYPE "notification_channel";

-- DropEnum
DROP TYPE "notification_status";

-- DropEnum
DROP TYPE "srs_card_type";

-- DropEnum
DROP TYPE "study_session_status";

-- CreateTable
CREATE TABLE "exercise_records" (
    "exercise_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ref_type" "exercise_type" NOT NULL,
    "ref_id" UUID NOT NULL,
    "status" "exercise_status" NOT NULL DEFAULT 'draft',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" DECIMAL,
    "placement_session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exercise_records_pkey" PRIMARY KEY ("exercise_record_id")
);

-- CreateTable
CREATE TABLE "answers" (
    "answer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exercise_record_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "score" DECIMAL,
    "correct" BOOLEAN,
    "grading_status" "grading_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "answer_details" (
    "answer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "option_id" UUID,
    "text_answer" TEXT,
    "json_answer" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "answer_details_pkey" PRIMARY KEY ("answer_id","position")
);

-- CreateTable
CREATE TABLE "answer_ai_calls" (
    "answer_ai_call_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "answer_id" UUID NOT NULL,
    "status" "ai_call_status" NOT NULL DEFAULT 'pending',
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "answer_ai_calls_pkey" PRIMARY KEY ("answer_ai_call_id")
);

-- CreateTable
CREATE TABLE "answer_evaluations" (
    "answer_eval_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "answer_id" UUID NOT NULL,
    "criteria_json" JSONB,
    "overall_score" DECIMAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "answer_evaluations_pkey" PRIMARY KEY ("answer_eval_id")
);

-- CreateTable
CREATE TABLE "eval_criteria" (
    "eval_criteria_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "answer_eval_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "score" DECIMAL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "eval_criteria_pkey" PRIMARY KEY ("eval_criteria_id")
);

-- CreateTable
CREATE TABLE "placement_sessions" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "current_question" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "theta_estimate" DECIMAL(4,2) NOT NULL DEFAULT 0.0,
    "theta_history" JSONB NOT NULL,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "final_theta" DECIMAL(4,2),
    "cefr_level" TEXT,
    "confidence" DECIMAL(3,2),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "placement_answers" (
    "answer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_order" INTEGER NOT NULL,
    "difficulty" DECIMAL(4,2) NOT NULL,
    "user_answer" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "response_time_ms" INTEGER,
    "theta_before" DECIMAL(4,2) NOT NULL,
    "theta_after" DECIMAL(4,2) NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "question_sets" (
    "question_set_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "skill_name" "skill_name" NOT NULL,
    "cefr_level" TEXT,
    "estimated_minutes" INTEGER,
    "lesson_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("question_set_id")
);

-- CreateTable
CREATE TABLE "question_set_items" (
    "question_set_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "question_set_items_pkey" PRIMARY KEY ("question_set_id","question_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_records_placement_session_id_key" ON "exercise_records"("placement_session_id");

-- CreateIndex
CREATE INDEX "placement_sessions_user_id_status_idx" ON "placement_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "placement_sessions_user_id_completed_at_idx" ON "placement_sessions"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "placement_answers_session_id_question_order_idx" ON "placement_answers"("session_id", "question_order");

-- CreateIndex
CREATE INDEX "question_sets_skill_name_idx" ON "question_sets"("skill_name");

-- CreateIndex
CREATE INDEX "question_sets_cefr_level_idx" ON "question_sets"("cefr_level");

-- CreateIndex
CREATE INDEX "question_sets_lesson_id_idx" ON "question_sets"("lesson_id");

-- CreateIndex
CREATE INDEX "lessons_skill_name_idx" ON "lessons"("skill_name");

-- AddForeignKey
ALTER TABLE "exercise_records" ADD CONSTRAINT "exercise_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_records" ADD CONSTRAINT "exercise_records_placement_session_id_fkey" FOREIGN KEY ("placement_session_id") REFERENCES "placement_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_exercise_record_id_fkey" FOREIGN KEY ("exercise_record_id") REFERENCES "exercise_records"("exercise_record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_details" ADD CONSTRAINT "answer_details_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("answer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_details" ADD CONSTRAINT "answer_details_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("option_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_ai_calls" ADD CONSTRAINT "answer_ai_calls_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("answer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("answer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_criteria" ADD CONSTRAINT "eval_criteria_answer_eval_id_fkey" FOREIGN KEY ("answer_eval_id") REFERENCES "answer_evaluations"("answer_eval_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "exercise_records"("exercise_record_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_sessions" ADD CONSTRAINT "placement_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_answers" ADD CONSTRAINT "placement_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "placement_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_answers" ADD CONSTRAINT "placement_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("lesson_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_set_items" ADD CONSTRAINT "question_set_items_question_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "question_sets"("question_set_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_set_items" ADD CONSTRAINT "question_set_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;
