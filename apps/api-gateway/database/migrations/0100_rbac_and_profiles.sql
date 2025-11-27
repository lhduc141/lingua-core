-- USERS
CREATE TABLE IF NOT EXISTS users (
                                     user_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username       text UNIQUE NOT NULL,
    email          citext UNIQUE NOT NULL,
    is_admin       boolean NOT NULL DEFAULT false,
    is_active      boolean NOT NULL DEFAULT true,
    last_login_at  timestamptz,
    deleted_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
    );

-- ACCOUNTS (auth identities)
CREATE TABLE IF NOT EXISTS accounts (
                                        account_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider             text NOT NULL,                       -- e.g., password, google, apple
    provider_account_id  text NOT NULL,
    email_login          citext,
    password             text,                                -- hashed if provider=password
    email_verified_at    timestamptz,
    is_active            boolean NOT NULL DEFAULT true,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
    );

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
                                        profile_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    full_name    text,
    dob          date,
    gender       text,         -- keep flexible; could be enum later
    phone        text,
    level_note   text,
    goal_note    text,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
    );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
