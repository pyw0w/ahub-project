ALTER TABLE account_links RENAME TO account_links_legacy;

CREATE TABLE telegram_identities (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL UNIQUE,
  username TEXT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NULL,
  language_code TEXT NULL,
  last_auth_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE external_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('gml')),
  provider_account_id TEXT NOT NULL,
  display_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE account_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_identity_id TEXT NOT NULL REFERENCES telegram_identities(id) ON DELETE CASCADE,
  external_account_id TEXT NULL REFERENCES external_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'linked', 'conflict', 'temporarily_unavailable', 'revoked')
  ),
  failure_code TEXT NULL CHECK (
    failure_code IS NULL
    OR failure_code IN (
      'external_account_already_linked',
      'telegram_identity_claimed_by_another_user',
      'gml_temporarily_unavailable'
    )
  ),
  failure_message TEXT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  linked_at TIMESTAMPTZ NULL,
  resolved_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'linked' AND external_account_id IS NOT NULL AND linked_at IS NOT NULL)
    OR status <> 'linked'
  ),
  CHECK (
    (status = 'conflict' AND failure_code IS NOT NULL AND resolved_at IS NOT NULL)
    OR status <> 'conflict'
  ),
  CHECK (
    (status = 'temporarily_unavailable' AND failure_code = 'gml_temporarily_unavailable')
    OR status <> 'temporarily_unavailable'
  ),
  CHECK ((status = 'revoked' AND revoked_at IS NOT NULL) OR status <> 'revoked')
);

CREATE UNIQUE INDEX account_links_active_telegram_identity_idx
ON account_links (telegram_identity_id)
WHERE status IN ('pending', 'linked', 'temporarily_unavailable');

CREATE UNIQUE INDEX account_links_active_external_account_idx
ON account_links (external_account_id)
WHERE external_account_id IS NOT NULL AND status = 'linked';

CREATE INDEX account_links_user_status_requested_idx
ON account_links (user_id, status, requested_at DESC);
