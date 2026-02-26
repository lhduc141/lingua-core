/*
  Warnings:

  - You are about to drop the `assessment_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_ai_calls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_evaluations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `band_scores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cat_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `collocations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dict_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dict_examples` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dict_senses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eval_dimensions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_section_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `learning_plan_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lesson_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lessons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `onboarding_surveys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `option_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `passages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `placement_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `practice_session_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `practice_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_payloads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rubric_criteria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_cards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_collection_cards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_collections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `srs_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `study_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `topic_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `topics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_availabilities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_vocabulary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `word_forms` table. If the table is not empty, all the data it contains will be lost.

*/
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
ALTER TABLE "collocations" DROP CONSTRAINT "collocations_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "collocations" DROP CONSTRAINT "collocations_sense_id_fkey";

-- DropForeignKey
ALTER TABLE "dict_examples" DROP CONSTRAINT "dict_examples_sense_id_fkey";

-- DropForeignKey
ALTER TABLE "dict_senses" DROP CONSTRAINT "dict_senses_entry_id_fkey";

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
ALTER TABLE "learning_plan_items" DROP CONSTRAINT "learning_plan_items_parent_item_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_plan_items" DROP CONSTRAINT "learning_plan_items_source_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_plan_items" DROP CONSTRAINT "learning_plan_items_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_questions" DROP CONSTRAINT "lesson_questions_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_questions" DROP CONSTRAINT "lesson_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "lesson_translations" DROP CONSTRAINT "lesson_translations_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_surveys" DROP CONSTRAINT "onboarding_surveys_user_id_fkey";

-- DropForeignKey
ALTER TABLE "option_translations" DROP CONSTRAINT "option_translations_option_id_fkey";

-- DropForeignKey
ALTER TABLE "placement_attempts" DROP CONSTRAINT "placement_attempts_question_id_fkey";

-- DropForeignKey
ALTER TABLE "placement_attempts" DROP CONSTRAINT "placement_attempts_session_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_session_questions" DROP CONSTRAINT "practice_session_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_session_questions" DROP CONSTRAINT "practice_session_questions_session_id_fkey";

-- DropForeignKey
ALTER TABLE "question_options" DROP CONSTRAINT "question_options_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_payloads" DROP CONSTRAINT "question_payloads_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_tags" DROP CONSTRAINT "question_tags_question_id_fkey";

-- DropForeignKey
ALTER TABLE "question_translations" DROP CONSTRAINT "question_translations_question_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_passage_id_fkey";

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

-- DropForeignKey
ALTER TABLE "user_availabilities" DROP CONSTRAINT "user_availabilities_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_vocabulary" DROP CONSTRAINT "user_vocabulary_entry_id_fkey";

-- DropForeignKey
ALTER TABLE "user_vocabulary" DROP CONSTRAINT "user_vocabulary_user_id_fkey";

-- DropForeignKey
ALTER TABLE "word_forms" DROP CONSTRAINT "word_forms_entry_id_fkey";

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
DROP TABLE "collocations";

-- DropTable
DROP TABLE "dict_entries";

-- DropTable
DROP TABLE "dict_examples";

-- DropTable
DROP TABLE "dict_senses";

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
DROP TABLE "learning_plan_items";

-- DropTable
DROP TABLE "lesson_questions";

-- DropTable
DROP TABLE "lesson_translations";

-- DropTable
DROP TABLE "lessons";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "onboarding_surveys";

-- DropTable
DROP TABLE "option_translations";

-- DropTable
DROP TABLE "passages";

-- DropTable
DROP TABLE "placement_attempts";

-- DropTable
DROP TABLE "practice_session_questions";

-- DropTable
DROP TABLE "practice_sessions";

-- DropTable
DROP TABLE "prompts";

-- DropTable
DROP TABLE "question_options";

-- DropTable
DROP TABLE "question_payloads";

-- DropTable
DROP TABLE "question_tags";

-- DropTable
DROP TABLE "question_translations";

-- DropTable
DROP TABLE "questions";

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

-- DropTable
DROP TABLE "user_availabilities";

-- DropTable
DROP TABLE "user_vocabulary";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "word_forms";

-- DropEnum
DROP TYPE "ai_call_status";

-- DropEnum
DROP TYPE "assessment_ref_type";

-- DropEnum
DROP TYPE "assessment_status";

-- DropEnum
DROP TYPE "asset_kind";

-- DropEnum
DROP TYPE "attempt_modality";

-- DropEnum
DROP TYPE "content_status";

-- DropEnum
DROP TYPE "exam_category";

-- DropEnum
DROP TYPE "exam_cycle_kind";

-- DropEnum
DROP TYPE "exam_kind";

-- DropEnum
DROP TYPE "grading_status";

-- DropEnum
DROP TYPE "notification_channel";

-- DropEnum
DROP TYPE "notification_status";

-- DropEnum
DROP TYPE "plan_item_status";

-- DropEnum
DROP TYPE "question_type";

-- DropEnum
DROP TYPE "skill_name";

-- DropEnum
DROP TYPE "srs_card_type";

-- DropEnum
DROP TYPE "study_session_status";
