-- ============================================
-- Migration: 20251015093002_alter_accounts.sql
-- Purpose  : Chuẩn hoá accounts: ENUM provider, nullable fields, email_verified_at, unique index
-- Author   : linguapanda
-- ============================================

-- 0) Tạo ENUM cho provider nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'accounts_provider_enum'
  ) THEN
CREATE TYPE accounts_provider_enum AS ENUM ('local', 'google');
END IF;
END$$;

-- 1) Chuyển provider sang ENUM
ALTER TABLE "accounts"
ALTER COLUMN "provider" TYPE accounts_provider_enum
USING "provider"::accounts_provider_enum;

-- 2) Đặt NOT NULL cho provider
ALTER TABLE "accounts"
    ALTER COLUMN "provider" SET NOT NULL;

-- 3) Cho phép NULL cho provider_account_id (local không dùng)
ALTER TABLE "accounts"
    ALTER COLUMN "provider_account_id" DROP NOT NULL;

-- 4) Cho phép NULL cho email_login (google không dùng)
ALTER TABLE "accounts"
    ALTER COLUMN "email_login" DROP NOT NULL;

-- 5) Cho phép NULL cho password (google không dùng)
ALTER TABLE "accounts"
    ALTER COLUMN "password" DROP NOT NULL;

-- 6) Đặt mặc định is_active = true
ALTER TABLE "accounts"
    ALTER COLUMN "is_active" SET DEFAULT true;

-- 7) Thêm cột email_verified_at
ALTER TABLE "accounts"
    ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ NULL;

-- 8) Thêm partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_local_email_login_uk"
    ON "accounts" ("provider", "email_login")
    WHERE "provider" = 'local' AND "email_login" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_google_provider_id_uk"
    ON "accounts" ("provider", "provider_account_id")
    WHERE "provider" = 'google' AND "provider_account_id" IS NOT NULL;
