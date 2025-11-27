-- Bật các extension cần thiết
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- dùng gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- kiểu citext cho email
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- (tùy chọn) index hỗn hợp
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- (tùy chọn) hỗ trợ tìm kiếm mờ
