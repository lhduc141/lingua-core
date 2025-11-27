-- ASSESSMENTS (a test session or a graded unit)
CREATE TABLE IF NOT EXISTS assessments (
                                           assessment_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ref_type        text NOT NULL,            -- 'exam' | 'lesson' | 'placement' | …
    ref_id          uuid NOT NULL,            -- points to exams/lessons/etc
    kind            text NOT NULL,            -- 'mock', 'practice', 'placement'
    status          text NOT NULL DEFAULT 'pending', -- pending/ongoing/completed
    started_at      timestamptz,
    completed_at    timestamptz,
    score           numeric(7,3),
    display_locale  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_ref ON assessments(ref_type, ref_id);

-- ATTEMPTS (per question)
CREATE TABLE IF NOT EXISTS attempts (
                                        attempt_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assessment_id        uuid NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    question_id          uuid NOT NULL REFERENCES questions(question_id) ON DELETE RESTRICT,
    section_position     integer,           -- order within section
    modality             text,              -- text/audio/speech/etc
    submitted_at         timestamptz,
    score                numeric(7,3),
    correct              boolean,
    input_asset_id       uuid REFERENCES assets(asset_id) ON DELETE SET NULL,
    transcript_asset_id  uuid REFERENCES assets(asset_id) ON DELETE SET NULL,
    output_asset_id      uuid REFERENCES assets(asset_id) ON DELETE SET NULL, -- AI feedback audio/text asset
    grading_status       text NOT NULL DEFAULT 'pending', -- pending/auto_graded/manual_required/complete
    manual_override_score numeric(7,3),
    rater_id             uuid REFERENCES users(user_id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_q ON attempts(question_id);

-- ATTEMPT ANSWERS (MCQ / structured answers)
CREATE TABLE IF NOT EXISTS attempt_answers (
                                               attempt_id     uuid NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
    position       integer NOT NULL DEFAULT 1,
    option_id      uuid REFERENCES question_options(option_id) ON DELETE SET NULL,
    text_answer    text,
    numeric_answer numeric(12,4),
    json_answer    jsonb,
    PRIMARY KEY (attempt_id, position)
    );
CREATE INDEX IF NOT EXISTS idx_attempt_answers_json ON attempt_answers USING GIN (json_answer);

-- PROMPTS (prompt templates)
CREATE TABLE IF NOT EXISTS prompts (
                                       prompt_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    version        integer NOT NULL DEFAULT 1,
    template       text NOT NULL,
    variables_json jsonb NOT NULL DEFAULT '[]',
    created_by     uuid REFERENCES users(user_id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
    );

-- ATTEMPT AI CALLS (LLM/tool traces)
CREATE TABLE IF NOT EXISTS attempt_ai_calls (
                                                id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id         uuid NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
    provider           text NOT NULL,
    model              text NOT NULL,
    version            text,
    prompt_id          uuid REFERENCES prompts(prompt_id) ON DELETE SET NULL,
    input_hash         text,
    status             text NOT NULL, -- success/error/rate_limited/…
    error_json         jsonb,
    retried_of_call_id uuid REFERENCES attempt_ai_calls(id) ON DELETE SET NULL,
    prompt_tokens      integer,
    completion_tokens  integer,
    cost_usd           numeric(12,6),
    latency_ms         integer,
    guardrail_flags    jsonb,
    output_schema_version integer,
    system_prompt_id   uuid,
    temperature        numeric(4,3),
    seed               bigint,
    tool_calls_json    jsonb,
    trace_id           text,
    created_at         timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_ai_calls_attempt ON attempt_ai_calls(attempt_id);
CREATE INDEX IF NOT EXISTS idx_ai_calls_error_gin ON attempt_ai_calls USING GIN (error_json, guardrail_flags, tool_calls_json);

-- ATTEMPT EVALUATIONS (rubrics)
CREATE TABLE IF NOT EXISTS attempt_evaluations (
                                                   id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id       uuid NOT NULL REFERENCES attempts(attempt_id) ON DELETE CASCADE,
    eval_type        text NOT NULL,         -- 'auto' | 'human'
    framework        text NOT NULL,         -- 'IELTS' | 'CEFR' | 'Custom'
    criteria_json    jsonb NOT NULL DEFAULT '[]',
    overall_score    numeric(7,3),
    evidence_json    jsonb,
    rubric_version   text,
    created_at       timestamptz NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS eval_dimensions (
                                               eval_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_eval_id  uuid NOT NULL REFERENCES attempt_evaluations(id) ON DELETE CASCADE,
    name             text NOT NULL,
    score            numeric(7,3),
    evidence_json    jsonb,
    position         integer NOT NULL DEFAULT 1
    );
