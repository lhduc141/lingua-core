-- TOPICS
CREATE TABLE IF NOT EXISTS topics (
                                      topic_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level_hint   text,                 -- e.g., A2, B1, etc.
    status       text NOT NULL DEFAULT 'draft',
    author_id    uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewer_id  uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    published_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
    );

-- LESSONS
CREATE TABLE IF NOT EXISTS lessons (
                                       lesson_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id     uuid NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    version      integer NOT NULL DEFAULT 1,
    status       text NOT NULL DEFAULT 'draft',
    author_id    uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewer_id  uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    published_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
    );

-- QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
                                         question_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    skill          text NOT NULL,                 -- vocab/grammar/reading/listening/speaking/writing
    type           text NOT NULL,                 -- mcq/fill_blank/recording/essay/…
    difficulty     text,                          -- easy/med/hard (free text for now)
    version        integer NOT NULL DEFAULT 1,
    exam_kind      text,                          -- ielts_toeic_generic …
    status         text NOT NULL DEFAULT 'draft',
    author_id      uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewer_id    uuid REFERENCES users(user_id) ON DELETE RESTRICT,
    published_at   timestamptz,
    source_tag     text,
    time_limit_sec integer,
    max_score      numeric(6,2),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
    );

-- LESSON_QUESTIONS (order questions in lessons)
CREATE TABLE IF NOT EXISTS lesson_questions (
                                                lesson_id   uuid NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    position    integer NOT NULL,
    PRIMARY KEY (lesson_id, question_id)
    );

-- QUESTION_OPTIONS
CREATE TABLE IF NOT EXISTS question_options (
                                                option_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    weight      numeric(6,3) NOT NULL DEFAULT 0,  -- partial credit
    is_correct  boolean NOT NULL DEFAULT false,
    position    integer NOT NULL DEFAULT 1,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
    );

-- ASSETS
CREATE TABLE IF NOT EXISTS assets (
                                      asset_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type     text NOT NULL,                            -- 'question' | 'lesson' | 'exam' | 'attempt' | …
    owner_id       uuid NOT NULL,
    kind           text NOT NULL,                            -- 'audio' | 'image' | 'video' | 'passage' | 'transcript' | 'recording'
    url            text NOT NULL,
    mime_type      text,
    duration_ms    integer,
    size_bytes     bigint,
    waveform_json  jsonb,                                    -- store downsampled waveform if needed
    transcript     text,
    meta_json      jsonb,
    checksum       text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_meta_gin ON assets USING GIN (meta_json);

-- QUESTION_PAYLOADS
CREATE TABLE IF NOT EXISTS question_payloads (
                                                 question_id          uuid PRIMARY KEY REFERENCES questions(question_id) ON DELETE CASCADE,
    schema_version       integer NOT NULL DEFAULT 1,
    config_json          jsonb NOT NULL DEFAULT '{}',
    answer_keys_json     jsonb NOT NULL DEFAULT '[]',
    scoring_json         jsonb NOT NULL DEFAULT '{}',
    validation_json      jsonb NOT NULL DEFAULT '{}',
    updated_at           timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_qpayloads_gin ON question_payloads USING GIN (config_json, scoring_json, validation_json);

-- QUESTION_TAGS
CREATE TABLE IF NOT EXISTS question_tags (
                                             question_id uuid NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    tag         text NOT NULL,
    PRIMARY KEY (question_id, tag)
    );

-- TRANSLATIONS
CREATE TABLE IF NOT EXISTS topic_translations (
                                                  topic_id     uuid NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    locale       text NOT NULL,
    title        text NOT NULL,
    description  text,
    PRIMARY KEY (topic_id, locale)
    );

CREATE TABLE IF NOT EXISTS lesson_translations (
                                                   lesson_id      uuid NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    locale         text NOT NULL,
    title          text NOT NULL,
    description    text,
    content_json   jsonb NOT NULL DEFAULT '{}',
    schema_version integer NOT NULL DEFAULT 1,
    PRIMARY KEY (lesson_id, locale)
    );

CREATE TABLE IF NOT EXISTS question_translations (
                                                     question_id    uuid NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    locale         text NOT NULL,
    stem_text      text,
    content_json   jsonb NOT NULL DEFAULT '{}',
    schema_version integer NOT NULL DEFAULT 1,
    PRIMARY KEY (question_id, locale)
    );

CREATE TABLE IF NOT EXISTS option_translations (
                                                   option_id    uuid NOT NULL REFERENCES question_options(option_id) ON DELETE CASCADE,
    locale       text NOT NULL,
    option_text  text,
    explanation  text,
    PRIMARY KEY (option_id, locale)
    );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_questions_skill_status ON questions(skill, status);
CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic_id);
