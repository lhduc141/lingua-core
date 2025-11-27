-- SRS COLLECTIONS
CREATE TABLE IF NOT EXISTS srs_collections (
                                               collection_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parent_id     uuid REFERENCES srs_collections(collection_id) ON DELETE SET NULL,
    name          text NOT NULL,
    description   text,
    position      integer NOT NULL DEFAULT 1,
    visibility    text NOT NULL DEFAULT 'private', -- private/shared/public
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
    );

-- SRS CARDS
CREATE TABLE IF NOT EXISTS srs_cards (
                                         card_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ref_type       text,                -- 'dict_entry' | 'lesson' | 'custom'
    ref_id         uuid,
    note           text,
    ease           numeric(5,2) NOT NULL DEFAULT 2.5,
    interval_days  integer NOT NULL DEFAULT 0,
    due_at         timestamptz,
    last_review_at timestamptz,
    stats_json     jsonb NOT NULL DEFAULT '{}',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_cards_user_due ON srs_cards(user_id, due_at);

-- COLLECTION↔CARDS
CREATE TABLE IF NOT EXISTS srs_collection_cards (
                                                    collection_id uuid NOT NULL REFERENCES srs_collections(collection_id) ON DELETE CASCADE,
    card_id       uuid NOT NULL REFERENCES srs_cards(card_id) ON DELETE CASCADE,
    position      integer NOT NULL DEFAULT 1,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, card_id)
    );

-- REVIEWS
CREATE TABLE IF NOT EXISTS srs_reviews (
                                           review_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id           uuid NOT NULL REFERENCES srs_cards(card_id) ON DELETE CASCADE,
    reviewed_at       timestamptz NOT NULL DEFAULT now(),
    grade             smallint NOT NULL,         -- 0..5 (SM-2 style)
    response_ms       integer,
    next_interval_days integer,
    ease_after        numeric(5,2),
    notes             text,
    created_at        timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_reviews_card_time ON srs_reviews(card_id, reviewed_at);
