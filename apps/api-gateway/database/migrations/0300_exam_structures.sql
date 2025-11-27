-- EXAM CYCLES (administrative windows)
CREATE TABLE IF NOT EXISTS exam_cycles (
                                           cycle_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label      text NOT NULL,
    kind       text, -- e.g., 'IELTS', 'Generic'
    start_date date,
    end_date   date,
    notes      text
    );

-- EXAMS
CREATE TABLE IF NOT EXISTS exams (
                                     exam_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title            text NOT NULL,
    cycle_id         uuid REFERENCES exam_cycles(cycle_id) ON DELETE RESTRICT,
    status           text NOT NULL DEFAULT 'draft',
    description      text,
    category         text,          -- 'IELTS' | 'Generic'
    level            text,          -- CEFR level hint
    time_strategy    jsonb,         -- section timing policy
    scoring_scheme   jsonb,         -- convert raw -> band
    proctoring_rules jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
    );

-- EXAM SECTIONS
CREATE TABLE IF NOT EXISTS exam_sections (
                                             section_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id          uuid NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    name             text NOT NULL,
    position         integer NOT NULL,
    duration_minutes integer,       -- nullable if standalone=true
    standalone       boolean NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
    );

-- SECTION → QUESTIONS mapping (by version)
CREATE TABLE IF NOT EXISTS exam_section_questions (
                                                      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_section_id    uuid NOT NULL REFERENCES exam_sections(section_id) ON DELETE CASCADE,
    question_id        uuid NOT NULL REFERENCES questions(question_id) ON DELETE RESTRICT,
    question_version   integer NOT NULL DEFAULT 1,
    position           integer NOT NULL,
    group_key          text,                    -- grouping inside section
    passage_asset_id   uuid REFERENCES assets(asset_id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_esq_section ON exam_section_questions(exam_section_id, position);
