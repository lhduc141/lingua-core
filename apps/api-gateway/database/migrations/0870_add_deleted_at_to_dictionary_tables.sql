-- 0870_add_deleted_at_to_dictionary_tables.sql

-- 1) dict_entries
ALTER TABLE IF EXISTS dict_entries
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) dict_forms
ALTER TABLE IF EXISTS dict_forms
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3) dict_senses
ALTER TABLE IF EXISTS dict_senses
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 4) dict_examples
ALTER TABLE IF EXISTS dict_examples
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
