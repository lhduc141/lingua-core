-- ASSESSMENT REPORTS
CREATE TABLE IF NOT EXISTS assessment_reports (
                                                  report_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id       uuid NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    kind                text NOT NULL,            -- 'placement' | 'exam' | 'lesson'
    framework           text NOT NULL,            -- 'CEFR' | 'IELTS' | …
    overall_band        numeric(4,2),
    cefr                text,                     -- A1..C2
    cefr_confidence     numeric(4,3),
    strengths_json      jsonb NOT NULL DEFAULT '[]',
    weaknesses_json     jsonb NOT NULL DEFAULT '[]',
    plan_json           jsonb NOT NULL DEFAULT '[]',
    rubric_version      text,
    display_locale      text,
    explanations_asset_id uuid REFERENCES assets(asset_id) ON DELETE SET NULL,
    report_version      integer NOT NULL DEFAULT 1,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_reports_user ON assessment_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_framework ON assessment_reports(framework, kind);

-- BAND SCORES (per skill/criterion)
CREATE TABLE IF NOT EXISTS band_scores (
                                           band_score_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id  uuid NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    skill          text NOT NULL,
    criterion      text,
    score_numeric  numeric(7,3),
    score_band     numeric(4,2),
    evidence_json  jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
    );

-- RUBRIC CRITERIA (reference/master data)
CREATE TABLE IF NOT EXISTS rubric_criteria (
                                               criterion_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    framework     text NOT NULL,
    version       text NOT NULL,
    name          text NOT NULL,
    description   text
    );
CREATE UNIQUE INDEX IF NOT EXISTS uq_rubric_criteria ON rubric_criteria(framework, version, name);
