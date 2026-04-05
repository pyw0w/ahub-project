# Core Domain Storage Foundation

## Scope

This module establishes the first persistent domain boundary for:

- user and profile ownership
- external account links for GML, Telegram, and email
- season progression and reward definitions
- entitlements as the source of access rights
- payment ledger entries as the source of billing events

## Design choices

- `users` and `profiles` stay split so auth providers can converge on one internal user while profile data remains product-facing.
- `account_links` is provider-centric and globally unique on `(provider, provider_account_id)` to prevent identity collisions.
- `season_progressions` uses one row per `(season, profile)` to keep progression updates idempotent.
- `reward_definitions` is immutable-by-level inside a season; uniqueness on `(season_id, level)` avoids ambiguous grants.
- `entitlements` is the access-rights source of truth. Only one active entitlement per `(profile, sku)` is allowed.
- `payment_ledger_entries` is append-only intent/history. External payment ids live in `source_ref` and remain unique within a `source_type`.

## Cross-module contract

- Auth should own provider verification and then create or update `users` plus `account_links`.
- Profile-facing APIs should read balances and entitlement state from this module only.
- Payments should create ledger entries first, then materialize or update entitlements from posted entries.
- Season reward claims should update `season_progressions`, create ledger entries for currency rewards, and create entitlements for access rewards.

## Migration note

The baseline migration is intentionally raw SQL because the repository has not standardized on an ORM yet. The schema stays portable and can be imported into Drizzle, Prisma, or handwritten repositories later without changing domain invariants.
