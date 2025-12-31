-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('local', 'google');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('draft', 'reviewed', 'published', 'archived');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('mcq_single', 'mcq_multi', 'fill_blank', 'translation', 'short_answer', 'ordering', 'matching', 'cloze_bank', 'dictation');

-- CreateEnum
CREATE TYPE "exam_kind" AS ENUM ('ielts', 'toeic', 'generic');

-- CreateEnum
CREATE TYPE "exam_cycle_kind" AS ENUM ('ielts_speaking', 'custom');

-- CreateEnum
CREATE TYPE "exam_category" AS ENUM ('ielts', 'generic');

-- CreateEnum
CREATE TYPE "assessment_ref_type" AS ENUM ('exam', 'exam_section', 'lesson', 'topic');

-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('draft', 'in_progress', 'submitted', 'scored', 'canceled');

-- CreateEnum
CREATE TYPE "attempt_modality" AS ENUM ('reading', 'listening', 'speaking', 'writing', 'vocab', 'grammar');

-- CreateEnum
CREATE TYPE "grading_status" AS ENUM ('pending', 'auto_scored', 'human_reviewed');

-- CreateEnum
CREATE TYPE "ai_call_status" AS ENUM ('pending', 'success', 'error');

-- CreateEnum
CREATE TYPE "plan_item_status" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "study_session_status" AS ENUM ('planned', 'in_progress', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('scheduled', 'sent', 'failed', 'canceled');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT,
    "email" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "account_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL DEFAULT 'local',
    "provider_account_id" TEXT,
    "email_login" TEXT,
    "password" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "profile_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT,
    "dob" DATE,
    "gender" TEXT,
    "phone" TEXT,
    "level_note" TEXT,
    "goal_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "assessment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ref_type" "assessment_ref_type" NOT NULL,
    "ref_id" UUID NOT NULL,
    "kind" TEXT,
    "status" "assessment_status" NOT NULL DEFAULT 'draft',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" DECIMAL,
    "display_locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "attempt_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "section_position" INTEGER,
    "modality" "attempt_modality",
    "submitted_at" TIMESTAMP(3),
    "score" DECIMAL,
    "correct" BOOLEAN,
    "input_asset_id" UUID,
    "transcript_asset_id" UUID,
    "output_asset_id" UUID,
    "grading_status" "grading_status" NOT NULL DEFAULT 'pending',
    "manual_override_score" DECIMAL,
    "rater_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "attempt_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "option_id" UUID,
    "text_answer" TEXT,
    "numeric_answer" DECIMAL,
    "json_answer" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("attempt_id","position")
);

-- CreateTable
CREATE TABLE "prompts" (
    "prompt_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "template" TEXT NOT NULL,
    "variables_json" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("prompt_id")
);

-- CreateTable
CREATE TABLE "attempt_ai_calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "version" TEXT,
    "prompt_id" UUID,
    "system_prompt_id" UUID,
    "input_hash" TEXT,
    "status" "ai_call_status" NOT NULL DEFAULT 'pending',
    "error_json" JSONB,
    "retried_of_call_id" UUID,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "cost_usd" DECIMAL,
    "latency_ms" INTEGER,
    "guardrail_flags" JSONB,
    "output_schema_version" INTEGER,
    "temperature" DECIMAL,
    "seed" INTEGER,
    "tool_calls_json" JSONB,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attempt_ai_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "eval_type" TEXT,
    "framework" TEXT,
    "criteria_json" JSONB,
    "overall_score" DECIMAL,
    "evidence_json" JSONB,
    "rubric_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attempt_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_dimensions" (
    "eval_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_eval_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "score" DECIMAL,
    "evidence_json" JSONB,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "eval_dimensions_pkey" PRIMARY KEY ("eval_id")
);

-- CreateTable
CREATE TABLE "topics" (
    "topic_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "level_hint" TEXT,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "author_id" UUID,
    "reviewer_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("topic_id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "lesson_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "author_id" UUID,
    "reviewer_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("lesson_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "question_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skill" TEXT,
    "type" "question_type" NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "exam_kind" "exam_kind" NOT NULL DEFAULT 'generic',
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "author_id" UUID,
    "reviewer_id" UUID,
    "published_at" TIMESTAMP(3),
    "source_tag" TEXT,
    "time_limit_sec" INTEGER,
    "max_score" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "lesson_questions" (
    "lesson_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("lesson_id","question_id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "option_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "weight" INTEGER DEFAULT 0,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("option_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "asset_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" TEXT,
    "owner_id" UUID,
    "kind" TEXT,
    "url" TEXT,
    "mime_type" TEXT,
    "duration_ms" INTEGER,
    "size_bytes" INTEGER,
    "waveform_json" JSONB,
    "transcript" TEXT,
    "meta_json" JSONB,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "question_payloads" (
    "question_id" UUID NOT NULL,
    "schema_version" INTEGER DEFAULT 1,
    "config_json" JSONB,
    "answer_keys_json" JSONB,
    "scoring_json" JSONB,
    "validation_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_payloads_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "question_tags" (
    "question_id" UUID NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("question_id","tag")
);

-- CreateTable
CREATE TABLE "topic_translations" (
    "topic_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "topic_translations_pkey" PRIMARY KEY ("topic_id","locale")
);

-- CreateTable
CREATE TABLE "lesson_translations" (
    "lesson_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content_json" JSONB,
    "schema_version" INTEGER DEFAULT 1,

    CONSTRAINT "lesson_translations_pkey" PRIMARY KEY ("lesson_id","locale")
);

-- CreateTable
CREATE TABLE "question_translations" (
    "question_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "stem_text" TEXT,
    "content_json" JSONB,
    "schema_version" INTEGER DEFAULT 1,

    CONSTRAINT "question_translations_pkey" PRIMARY KEY ("question_id","locale")
);

-- CreateTable
CREATE TABLE "option_translations" (
    "option_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "option_text" TEXT,
    "explanation" TEXT,

    CONSTRAINT "option_translations_pkey" PRIMARY KEY ("option_id","locale")
);

-- CreateTable
CREATE TABLE "exam_cycles" (
    "cycle_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "kind" "exam_cycle_kind" NOT NULL DEFAULT 'custom',
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exam_cycles_pkey" PRIMARY KEY ("cycle_id")
);

-- CreateTable
CREATE TABLE "exams" (
    "exam_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "cycle_id" UUID,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "category" "exam_category" NOT NULL DEFAULT 'generic',
    "level" TEXT,
    "time_strategy" JSONB,
    "scoring_scheme" JSONB,
    "proctoring_rules" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("exam_id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "section_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "standalone" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("section_id")
);

-- CreateTable
CREATE TABLE "exam_section_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_section_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_version" INTEGER,
    "position" INTEGER NOT NULL,
    "group_key" TEXT,
    "passage_asset_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exam_section_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_availabilities" (
    "availability_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "dow" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "weight" DECIMAL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_availabilities_pkey" PRIMARY KEY ("availability_id")
);

-- CreateTable
CREATE TABLE "learning_plan_items" (
    "item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "parent_item_id" UUID,
    "title" TEXT NOT NULL,
    "item_type" TEXT,
    "ref_type" TEXT,
    "ref_id" UUID,
    "target_level" TEXT,
    "due_date" DATE,
    "due_window_days" INTEGER,
    "position" INTEGER,
    "status" "plan_item_status" NOT NULL DEFAULT 'pending',
    "auto_generated" BOOLEAN NOT NULL DEFAULT true,
    "source_assessment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "learning_plan_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "plan_item_id" UUID,
    "status" "study_session_status" NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "type" TEXT,
    "payload_json" JSONB,
    "priority" INTEGER DEFAULT 0,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "status" "notification_status" NOT NULL DEFAULT 'scheduled',
    "error_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "assessment_reports" (
    "report_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT,
    "framework" TEXT,
    "overall_band" TEXT,
    "cefr" TEXT,
    "cefr_confidence" DECIMAL,
    "strengths_json" JSONB,
    "weaknesses_json" JSONB,
    "plan_json" JSONB,
    "rubric_version" TEXT,
    "display_locale" TEXT,
    "explanations_asset_id" UUID,
    "report_version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "band_scores" (
    "band_score_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "skill" TEXT,
    "criterion" TEXT,
    "score_numeric" DECIMAL,
    "score_band" TEXT,
    "evidence_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "band_scores_pkey" PRIMARY KEY ("band_score_id")
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "criterion_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "framework" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("criterion_id")
);

-- CreateTable
CREATE TABLE "dict_entries" (
    "entry_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lang" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "pos" TEXT,
    "ipa" TEXT,
    "audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_entries_pkey" PRIMARY KEY ("entry_id")
);

-- CreateTable
CREATE TABLE "dict_senses" (
    "sense_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "order" INTEGER,
    "short_def" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_senses_pkey" PRIMARY KEY ("sense_id")
);

-- CreateTable
CREATE TABLE "dict_examples" (
    "example_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sense_id" UUID NOT NULL,
    "locale" TEXT,
    "example" TEXT,
    "translation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_examples_pkey" PRIMARY KEY ("example_id")
);

-- CreateTable
CREATE TABLE "dict_forms" (
    "form_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "form" TEXT NOT NULL,
    "morph_tag" TEXT,
    "is_lemma" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_forms_pkey" PRIMARY KEY ("form_id")
);

-- CreateTable
CREATE TABLE "dict_relations" (
    "relation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_entry_id" UUID NOT NULL,
    "to_entry_id" UUID NOT NULL,
    "kind" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_relations_pkey" PRIMARY KEY ("relation_id")
);

-- CreateTable
CREATE TABLE "ai_cache" (
    "cache_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_type" TEXT,
    "owner_id" UUID,
    "kind" TEXT,
    "locale" TEXT,
    "prompt_hash" TEXT,
    "input_json" JSONB,
    "output_json" JSONB,
    "version" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("cache_id")
);

-- CreateTable
CREATE TABLE "srs_collections" (
    "collection_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER,
    "visibility" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "srs_collections_pkey" PRIMARY KEY ("collection_id")
);

-- CreateTable
CREATE TABLE "srs_cards" (
    "card_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ref_type" TEXT,
    "ref_id" UUID,
    "note" TEXT,
    "ease" DECIMAL DEFAULT 2.5,
    "interval_days" INTEGER,
    "due_at" TIMESTAMP(3),
    "last_review_at" TIMESTAMP(3),
    "stats_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "srs_cards_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "srs_collection_cards" (
    "collection_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "srs_collection_cards_pkey" PRIMARY KEY ("collection_id","card_id")
);

-- CreateTable
CREATE TABLE "srs_reviews" (
    "review_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "card_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grade" INTEGER,
    "response_ms" INTEGER,
    "next_interval_days" INTEGER,
    "ease_after" DECIMAL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "srs_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_input_asset_id_fkey" FOREIGN KEY ("input_asset_id") REFERENCES "assets"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_transcript_asset_id_fkey" FOREIGN KEY ("transcript_asset_id") REFERENCES "assets"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_output_asset_id_fkey" FOREIGN KEY ("output_asset_id") REFERENCES "assets"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("attempt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("option_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_ai_calls" ADD CONSTRAINT "attempt_ai_calls_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("attempt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_ai_calls" ADD CONSTRAINT "attempt_ai_calls_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("prompt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_evaluations" ADD CONSTRAINT "attempt_evaluations_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("attempt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_dimensions" ADD CONSTRAINT "eval_dimensions_attempt_eval_id_fkey" FOREIGN KEY ("attempt_eval_id") REFERENCES "attempt_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("topic_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("lesson_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_payloads" ADD CONSTRAINT "question_payloads_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_translations" ADD CONSTRAINT "topic_translations_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("topic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_translations" ADD CONSTRAINT "lesson_translations_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("lesson_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_translations" ADD CONSTRAINT "question_translations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_translations" ADD CONSTRAINT "option_translations_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("option_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "exam_cycles"("cycle_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("exam_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_questions" ADD CONSTRAINT "exam_section_questions_exam_section_id_fkey" FOREIGN KEY ("exam_section_id") REFERENCES "exam_sections"("section_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_questions" ADD CONSTRAINT "exam_section_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_section_questions" ADD CONSTRAINT "exam_section_questions_passage_asset_id_fkey" FOREIGN KEY ("passage_asset_id") REFERENCES "assets"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_availabilities" ADD CONSTRAINT "user_availabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "learning_plan_items"("item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_items" ADD CONSTRAINT "learning_plan_items_source_assessment_id_fkey" FOREIGN KEY ("source_assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "learning_plan_items"("item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_explanations_asset_id_fkey" FOREIGN KEY ("explanations_asset_id") REFERENCES "assets"("asset_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "band_scores" ADD CONSTRAINT "band_scores_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_senses" ADD CONSTRAINT "dict_senses_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_examples" ADD CONSTRAINT "dict_examples_sense_id_fkey" FOREIGN KEY ("sense_id") REFERENCES "dict_senses"("sense_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_forms" ADD CONSTRAINT "dict_forms_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_relations" ADD CONSTRAINT "dict_relations_from_entry_id_fkey" FOREIGN KEY ("from_entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_relations" ADD CONSTRAINT "dict_relations_to_entry_id_fkey" FOREIGN KEY ("to_entry_id") REFERENCES "dict_entries"("entry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_collections" ADD CONSTRAINT "srs_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_collections" ADD CONSTRAINT "srs_collections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "srs_collections"("collection_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_collection_cards" ADD CONSTRAINT "srs_collection_cards_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "srs_collections"("collection_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_collection_cards" ADD CONSTRAINT "srs_collection_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "srs_cards"("card_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_reviews" ADD CONSTRAINT "srs_reviews_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "srs_cards"("card_id") ON DELETE RESTRICT ON UPDATE CASCADE;
