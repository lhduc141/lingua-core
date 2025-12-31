-- CreateTable
CREATE TABLE "onboarding_surveys" (
    "survey_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "meta_json" JSONB,
    "planned_study_hours_per_week" INTEGER,
    "primary_focus_skills" JSONB,
    "target_deadline_date" DATE,
    "target_goal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_surveys_pkey" PRIMARY KEY ("survey_id")
);

-- CreateTable
CREATE TABLE "onboarding_survey_answers" (
    "answer_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "survey_id" UUID NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer_value" JSONB,
    "question_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "onboarding_survey_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_surveys_user_id_key" ON "onboarding_surveys"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding_surveys" ADD CONSTRAINT "onboarding_surveys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_survey_answers" ADD CONSTRAINT "onboarding_survey_answers_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "onboarding_surveys"("survey_id") ON DELETE RESTRICT ON UPDATE CASCADE;
