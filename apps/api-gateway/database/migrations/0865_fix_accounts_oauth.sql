SET search_path TO public;

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS provider_account_id text NOT NULL,
    ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_provider_provider_account_id
    ON accounts(provider, provider_account_id);
