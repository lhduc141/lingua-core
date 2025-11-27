-- ==========================
-- MIGRATION: Convert some tables from UUID to INTEGER IDs
-- ==========================

BEGIN;

-- ===================================
-- Dictionary
-- ===================================
DROP TABLE IF EXISTS dict_relations CASCADE;
DROP TABLE IF EXISTS dict_examples CASCADE;
DROP TABLE IF EXISTS dict_forms CASCADE;
DROP TABLE IF EXISTS dict_senses CASCADE;
DROP TABLE IF EXISTS dict_entries CASCADE;

CREATE TABLE dict_entries (
                              entry_id     BIGSERIAL PRIMARY KEY,
                              lang         TEXT NOT NULL,
                              headword     TEXT NOT NULL,
                              pos          TEXT,
                              ipa          TEXT,
                              audio_url    TEXT,
                              created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                              updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dict_senses (
                             sense_id     BIGSERIAL PRIMARY KEY,
                             entry_id     BIGINT NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
                             "order"      INT NOT NULL DEFAULT 1,
                             short_def    TEXT NOT NULL,
                             created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                             updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dict_examples (
                               example_id   BIGSERIAL PRIMARY KEY,
                               sense_id     BIGINT NOT NULL REFERENCES dict_senses(sense_id) ON DELETE CASCADE,
                               locale       TEXT NOT NULL,
                               example      TEXT NOT NULL,
                               translation  TEXT,
                               created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                               updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dict_forms (
                            form_id      BIGSERIAL PRIMARY KEY,
                            entry_id     BIGINT NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
                            form         TEXT NOT NULL,
                            morph_tag    TEXT,
                            is_lemma     BOOLEAN NOT NULL DEFAULT false,
                            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dict_relations (
                                relation_id    BIGSERIAL PRIMARY KEY,
                                from_entry_id  BIGINT NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
                                to_entry_id    BIGINT NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
                                kind           TEXT NOT NULL,
                                created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                                updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                                CHECK (from_entry_id <> to_entry_id)
);

CREATE UNIQUE INDEX ux_dict_relations_unique ON dict_relations (from_entry_id, to_entry_id, kind);

-- ===================================
-- CMS Content
-- ===================================
DROP TABLE IF EXISTS lesson_questions CASCADE;
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS topics CASCADE;

CREATE TABLE topics (
                        topic_id     BIGSERIAL PRIMARY KEY,
                        level_hint   TEXT,
                        status       TEXT NOT NULL,
                        author_id    UUID,
                        reviewer_id  UUID,
                        published_at TIMESTAMPTZ,
                        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lessons (
                         lesson_id    BIGSERIAL PRIMARY KEY,
                         topic_id     BIGINT REFERENCES topics(topic_id) ON DELETE CASCADE,
                         version      INT NOT NULL DEFAULT 1,
                         status       TEXT NOT NULL,
                         author_id    UUID,
                         reviewer_id  UUID,
                         published_at TIMESTAMPTZ,
                         created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                         updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
                           question_id  BIGSERIAL PRIMARY KEY,
                           skill        TEXT NOT NULL,
                           type         TEXT NOT NULL,
                           difficulty   INT,
                           version      INT NOT NULL DEFAULT 1,
                           exam_kind    TEXT,
                           status       TEXT NOT NULL,
                           author_id    UUID,
                           reviewer_id  UUID,
                           published_at TIMESTAMPTZ,
                           source_tag   TEXT,
                           time_limit_sec INT,
                           max_score    INT,
                           created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                           updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_questions (
                                  lesson_id    BIGINT REFERENCES lessons(lesson_id) ON DELETE CASCADE,
                                  question_id  BIGINT REFERENCES questions(question_id) ON DELETE CASCADE,
                                  position     INT,
                                  PRIMARY KEY (lesson_id, question_id)
);

CREATE TABLE question_options (
                                  option_id    BIGSERIAL PRIMARY KEY,
                                  question_id  BIGINT REFERENCES questions(question_id) ON DELETE CASCADE,
                                  weight       INT,
                                  is_correct   BOOLEAN,
                                  position     INT,
                                  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                                  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================================
-- Exams
-- ===================================
DROP TABLE IF EXISTS exam_section_questions CASCADE;
DROP TABLE IF EXISTS exam_sections CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS exam_cycles CASCADE;

CREATE TABLE exams (
                       exam_id       BIGSERIAL PRIMARY KEY,
                       title         TEXT NOT NULL,
                       cycle_id      BIGINT,
                       status        TEXT NOT NULL,
                       description   TEXT,
                       category      TEXT NOT NULL,
                       level         TEXT,
                       time_strategy JSONB,
                       scoring_scheme JSONB,
                       proctoring_rules JSONB,
                       created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                       updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_sections (
                               section_id    BIGSERIAL PRIMARY KEY,
                               exam_id       BIGINT REFERENCES exams(exam_id) ON DELETE CASCADE,
                               name          TEXT,
                               position      INT,
                               duration_minutes INT,
                               standalone    BOOLEAN DEFAULT false,
                               created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                               updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_section_questions (
                                        id            BIGSERIAL PRIMARY KEY,
                                        exam_section_id BIGINT REFERENCES exam_sections(section_id) ON DELETE CASCADE,
                                        question_id   BIGINT REFERENCES questions(question_id),
                                        question_version INT,
                                        position      INT,
                                        group_key     TEXT,
                                        passage_asset_id BIGINT,
                                        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_cycles (
                             cycle_id      BIGSERIAL PRIMARY KEY,
                             label         TEXT,
                             kind          TEXT,
                             start_date    DATE,
                             end_date      DATE,
                             notes         TEXT
);

COMMIT;
