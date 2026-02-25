/*
  Warnings:

  - You are about to drop the column `variants` on the `dict_entries` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cat_session_id]` on the table `assessments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "onboarding_surveys_user_id_key";

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "cat_session_id" UUID;

-- AlterTable
ALTER TABLE "dict_entries" DROP COLUMN "variants";

-- AlterTable
ALTER TABLE "onboarding_surveys" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "passages" ADD COLUMN     "status" "content_status" NOT NULL DEFAULT 'published',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "title" SET DEFAULT 'Untitled';

-- AlterTable
ALTER TABLE "question_translations" ADD COLUMN     "explanation" TEXT;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "irt_difficulty" DECIMAL(4,2),
ADD COLUMN     "irt_discrimination" DECIMAL(4,2),
ADD COLUMN     "irt_guessing" DECIMAL(3,2),
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_vocabulary" ALTER COLUMN "status" SET DEFAULT 'new';

-- CreateTable
CREATE TABLE "word_forms" (
    "form_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "form" TEXT NOT NULL,
    "pos" TEXT NOT NULL,

    CONSTRAINT "word_forms_pkey" PRIMARY KEY ("form_id")
);

-- CreateTable
CREATE TABLE "cat_sessions" (
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

    CONSTRAINT "cat_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "placement_attempts" (
    "attempt_id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

    CONSTRAINT "placement_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateIndex
CREATE INDEX "word_forms_form_idx" ON "word_forms"("form");

-- CreateIndex
CREATE UNIQUE INDEX "word_forms_form_key" ON "word_forms"("form");

-- CreateIndex
CREATE INDEX "cat_sessions_user_id_status_idx" ON "cat_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "cat_sessions_user_id_completed_at_idx" ON "cat_sessions"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "placement_attempts_session_id_question_order_idx" ON "placement_attempts"("session_id", "question_order");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_cat_session_id_key" ON "assessments"("cat_session_id");

-- CreateIndex
CREATE INDEX "questions_source_tag_irt_difficulty_idx" ON "questions"("source_tag", "irt_difficulty");

-- CreateIndex
CREATE INDEX "questions_irt_difficulty_usage_count_idx" ON "questions"("irt_difficulty", "usage_count");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_cat_session_id_fkey" FOREIGN KEY ("cat_session_id") REFERENCES "cat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_forms" ADD CONSTRAINT "word_forms_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_sessions" ADD CONSTRAINT "cat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cat_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;
