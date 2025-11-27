-- 20251007_dict_soft_delete_partial_unique.sql
-- Mục tiêu:
-- 1) ALTER deleted_at -> NULLABLE
-- 2) Drop unique (nếu tồn tại)
-- 3) Tạo partial unique index (WHERE deleted_at IS NULL)

BEGIN;

-- 1) Cho phép deleted_at NULL
ALTER TABLE dict_entries    ALTER COLUMN deleted_at DROP NOT NULL;
ALTER TABLE dict_forms      ALTER COLUMN deleted_at DROP NOT NULL;
ALTER TABLE dict_senses     ALTER COLUMN deleted_at DROP NOT NULL;
ALTER TABLE dict_examples   ALTER COLUMN deleted_at DROP NOT NULL;
ALTER TABLE dict_relations  ALTER COLUMN deleted_at DROP NOT NULL;

-- 2) Gỡ unique/idx cũ nếu có
-- Lưu ý: tuỳ môi trường, UNIQUE có thể là constraint (…_key) hoặc index custom.
-- Ta cố gắng drop cả constraint lẫn index dự phòng.

-- dict_entries: unique (lang, headword)
DO $$
BEGIN
  -- nếu là UNIQUE CONSTRAINT
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'dict_entries'
    AND    c.conname = 'dict_entries_lang_headword_key'
  ) THEN
ALTER TABLE dict_entries DROP CONSTRAINT dict_entries_lang_headword_key;
END IF;

  -- nếu là UNIQUE INDEX đặt tên khác
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dict_entries_lang_headword_unique') THEN
DROP INDEX dict_entries_lang_headword_unique;
END IF;
END$$;

-- dict_forms: ví dụ unique (entry_id, form)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'dict_forms'
    AND    c.conname = 'dict_forms_entry_id_form_key'
  ) THEN
ALTER TABLE dict_forms DROP CONSTRAINT dict_forms_entry_id_form_key;
END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dict_forms_entry_id_form_unique') THEN
DROP INDEX dict_forms_entry_id_form_unique;
END IF;
END$$;

-- dict_senses: ví dụ unique (entry_id, "order")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'dict_senses'
    AND    c.conname = 'dict_senses_entry_id_order_key'
  ) THEN
ALTER TABLE dict_senses DROP CONSTRAINT dict_senses_entry_id_order_key;
END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dict_senses_entry_id_order_unique') THEN
DROP INDEX dict_senses_entry_id_order_unique;
END IF;
END$$;

-- dict_examples: ví dụ unique (sense_id, example)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'dict_examples'
    AND    c.conname = 'dict_examples_sense_id_example_key'
  ) THEN
ALTER TABLE dict_examples DROP CONSTRAINT dict_examples_sense_id_example_key;
END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dict_examples_sense_id_example_unique') THEN
DROP INDEX dict_examples_sense_id_example_unique;
END IF;
END$$;

-- dict_relations: ví dụ unique (from_entry_id, to_entry_id, kind)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'dict_relations'
    AND    c.conname = 'dict_relations_from_to_kind_key'
  ) THEN
ALTER TABLE dict_relations DROP CONSTRAINT dict_relations_from_to_kind_key;
END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dict_relations_from_to_kind_unique') THEN
DROP INDEX dict_relations_from_to_kind_unique;
END IF;
END$$;

-- 3) Tạo partial unique indexes (unique khi deleted_at IS NULL)

-- dict_entries: (lang, headword)
CREATE UNIQUE INDEX IF NOT EXISTS dict_entries_lang_headword_unique_active
    ON dict_entries (lang, headword)
    WHERE deleted_at IS NULL;

-- dict_forms: (entry_id, form)
CREATE UNIQUE INDEX IF NOT EXISTS dict_forms_entry_id_form_unique_active
    ON dict_forms (entry_id, form)
    WHERE deleted_at IS NULL;

-- dict_senses: (entry_id, "order")
CREATE UNIQUE INDEX IF NOT EXISTS dict_senses_entry_id_order_unique_active
    ON dict_senses (entry_id, "order")
    WHERE deleted_at IS NULL;

-- dict_examples: (sense_id, example)
CREATE UNIQUE INDEX IF NOT EXISTS dict_examples_sense_id_example_unique_active
    ON dict_examples (sense_id, example)
    WHERE deleted_at IS NULL;

-- dict_relations: (from_entry_id, to_entry_id, kind)
CREATE UNIQUE INDEX IF NOT EXISTS dict_relations_from_to_kind_unique_active
    ON dict_relations (from_entry_id, to_entry_id, kind)
    WHERE deleted_at IS NULL;

COMMIT;
