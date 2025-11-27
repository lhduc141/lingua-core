-- USER AVAILABILITIES (weekly recurring)
CREATE TABLE IF NOT EXISTS user_availabilities (
                                                   availability_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    dow             smallint NOT NULL CHECK (dow BETWEEN 0 AND 6), -- 0=Sun
    start_minute    integer NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
    end_minute      integer NOT NULL CHECK (end_minute BETWEEN 1 AND 1440 AND end_minute > start_minute),
    weight          integer NOT NULL DEFAULT 1
    );
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_availability ON user_availabilities(user_id, dow, start_minute, end_minute);

-- LEARNING PLAN ITEMS (tree)
CREATE TABLE IF NOT EXISTS learning_plan_items (
                                                   item_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parent_item_id       uuid REFERENCES learning_plan_items(item_id) ON DELETE SET NULL,
    title                text NOT NULL,
    item_type            text NOT NULL,           -- 'lesson' | 'exam' | 'srs' | 'project' ...
    ref_type             text,
    ref_id               uuid,
    target_level         text,
    due_date             date,
    due_window_days      integer,
    position             integer NOT NULL DEFAULT 1,
    status               text NOT NULL DEFAULT 'pending', -- pending/ongoing/done/skipped
    auto_generated       boolean NOT NULL DEFAULT true,
    source_assessment_id uuid REFERENCES assessments(assessment_id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_plan_user_status ON learning_plan_items(user_id, status);

-- STUDY SESSIONS
CREATE TABLE IF NOT EXISTS study_sessions (
                                              session_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    start_at    timestamptz NOT NULL,
    end_at      timestamptz,
    plan_item_id uuid REFERENCES learning_plan_items(item_id) ON DELETE SET NULL,
    status      text NOT NULL DEFAULT 'planned', -- planned/done/cancelled
    notes       text
    );
CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON study_sessions(user_id, start_at);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
                                             notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    channel         text NOT NULL,                 -- email/push/sms
    type            text NOT NULL,                 -- 'reminder' | 'report_ready' | ...
    payload_json    jsonb NOT NULL DEFAULT '{}',
    priority        smallint NOT NULL DEFAULT 0,
    scheduled_at    timestamptz,
    sent_at         timestamptz,
    status          text NOT NULL DEFAULT 'queued', -- queued/sent/failed/cancelled
    error_json      jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_schedule ON notifications(scheduled_at);
