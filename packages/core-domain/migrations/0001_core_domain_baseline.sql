CREATE TABLE users (
  id TEXT PRIMARY KEY,
  external_ref TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  hard_currency_balance BIGINT NOT NULL DEFAULT 0 CHECK (hard_currency_balance >= 0),
  soft_currency_balance BIGINT NOT NULL DEFAULT 0 CHECK (soft_currency_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE account_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gml', 'telegram', 'email')),
  provider_account_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'linked', 'revoked')),
  linked_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at < ends_at)
);

CREATE TABLE season_progressions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  last_granted_reward_level INTEGER NOT NULL DEFAULT 0 CHECK (last_granted_reward_level >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, profile_id),
  CHECK (last_granted_reward_level <= level)
);

CREATE TABLE reward_definitions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('currency', 'cosmetic', 'entitlement')),
  entitlement_sku TEXT NULL,
  currency_amount BIGINT NULL CHECK (currency_amount IS NULL OR currency_amount > 0),
  payload_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, level),
  CHECK (
    (reward_type = 'entitlement' AND entitlement_sku IS NOT NULL)
    OR reward_type <> 'entitlement'
  )
);

CREATE TABLE entitlements (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'reward', 'admin_grant', 'support_compensation')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired', 'revoked')),
  source_ledger_entry_id TEXT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_from < valid_until)
);

CREATE TABLE payment_ledger_entries (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  source_type TEXT NOT NULL CHECK (source_type IN ('payment', 'reward', 'admin_adjustment', 'refund')),
  source_ref TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'posted', 'reversed')),
  entitlement_id TEXT NULL REFERENCES entitlements(id) ON DELETE SET NULL,
  metadata_json JSONB NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entitlements
ADD CONSTRAINT entitlements_source_ledger_entry_fk
FOREIGN KEY (source_ledger_entry_id) REFERENCES payment_ledger_entries(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX entitlements_one_active_per_sku_idx
ON entitlements (profile_id, sku)
WHERE status = 'active';

CREATE UNIQUE INDEX payment_ledger_entries_source_ref_idx
ON payment_ledger_entries (source_type, source_ref);
