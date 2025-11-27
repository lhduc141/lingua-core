-- DICTIONARY ENTRIES
CREATE TABLE IF NOT EXISTS dict_entries (
                                            entry_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lang       text NOT NULL,          -- 'en'
    headword   text NOT NULL,
    pos        text,                   -- noun/verb/adj...
    ipa        text,
    audio_url  text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
    );
CREATE UNIQUE INDEX IF NOT EXISTS uq_dict_headword ON dict_entries(lang, headword, COALESCE(pos,''));

-- SENSES
CREATE TABLE IF NOT EXISTS dict_senses (
                                           sense_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   uuid NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
    "order"    integer NOT NULL DEFAULT 1,
    short_def  text NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_senses_entry ON dict_senses(entry_id);

-- EXAMPLES
CREATE TABLE IF NOT EXISTS dict_examples (
                                             example_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sense_id     uuid NOT NULL REFERENCES dict_senses(sense_id) ON DELETE CASCADE,
    locale       text NOT NULL,        -- 'en-US', 'vi-VN'
    example      text NOT NULL,
    translation  text,
    created_at   timestamptz NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_examples_sense ON dict_examples(sense_id);

-- FORMS
CREATE TABLE IF NOT EXISTS dict_forms (
                                          form_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   uuid NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
    form       text NOT NULL,          -- inflected/spelling variants
    morph_tag  text,                   -- 'past', 'plural', …
    is_lemma   boolean NOT NULL DEFAULT false
    );
CREATE UNIQUE INDEX IF NOT EXISTS uq_forms ON dict_forms(entry_id, form);

-- RELATIONS (optional)
CREATE TABLE IF NOT EXISTS dict_relations (
                                              relation_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entry_id  uuid NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
    to_entry_id    uuid NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
    kind           text NOT NULL       -- synonym/antonym/derivation/phrase/related
    );
CREATE INDEX IF NOT EXISTS idx_relations_from ON dict_relations(from_entry_id, kind);

-- AI CACHE (RAG & various caches)
CREATE TABLE IF NOT EXISTS ai_cache (
                                        cache_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type    text NOT NULL,           -- 'user' | 'question' | 'dict_entry' | …
    owner_id      uuid,
    kind          text NOT NULL,           -- 'embedding' | 'explain' | 'suggest' | …
    locale        text,
    prompt_hash   text NOT NULL,
    input_json    jsonb NOT NULL DEFAULT '{}',
    output_json   jsonb NOT NULL DEFAULT '{}',
    version       text,
    expires_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
    );
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_cache ON ai_cache(owner_type, owner_id, kind, COALESCE(locale,''), prompt_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_exp ON ai_cache(expires_at);
