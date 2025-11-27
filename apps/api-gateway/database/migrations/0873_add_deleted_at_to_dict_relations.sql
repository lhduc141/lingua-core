-- 0861_add_deleted_at_to_dict_relations.sql
-- Purpose: Add soft delete column to dict_relations

ALTER TABLE IF EXISTS dict_relations
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

COMMENT ON COLUMN public.dict_relations.deleted_at IS 'Soft delete timestamp';
