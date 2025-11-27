ALTER TABLE dict_examples ADD COLUMN IF NOT EXISTS example TEXT;
-- Nếu bạn đã có dữ liệu, backfill tùy ý
