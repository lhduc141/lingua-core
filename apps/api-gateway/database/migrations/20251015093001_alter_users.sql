-- ============================================
-- Migration: 20251015093001_alter_users.sql
-- Purpose  : Đổi tên cột email → primary_email, cho phép NULL, bỏ is_admin
-- Author   : linguapanda
-- ============================================

-- 1) Đổi tên cột email thành primary_email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
ALTER TABLE "users"
    RENAME COLUMN "email" TO "primary_email";
END IF;
END$$;

-- 2) Cho phép NULL cho primary_email
ALTER TABLE "users"
    ALTER COLUMN "primary_email" DROP NOT NULL;

-- 3) Bỏ cột is_admin nếu tồn tại
ALTER TABLE "users"
DROP COLUMN IF EXISTS "is_admin";

-- 4) (Tuỳ chọn) Thêm unique index cho username
-- CREATE UNIQUE INDEX IF NOT EXISTS "users_username_uk" ON "users" ("username");
