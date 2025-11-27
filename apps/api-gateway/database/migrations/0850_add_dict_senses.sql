-- Add missing table: dict_senses

SET search_path TO public;

CREATE TABLE IF NOT EXISTS dict_senses (
                                           sense_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id    uuid NOT NULL REFERENCES dict_entries(entry_id) ON DELETE CASCADE,
    "order"     integer NOT NULL DEFAULT 1,
    short_def   text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
    );

-- Optional index for faster lookups by entry_id
CREATE INDEX IF NOT EXISTS idx_dict_senses_entry ON dict_senses(entry_id);
