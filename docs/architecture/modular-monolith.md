# Modular Monolith Baseline

## Intent

AHub starts as a modular monolith so one team can move quickly without paying early distributed-systems cost. We separate by domain boundaries inside one deployable unit first, then extract only when operational pressure proves it.

## Repository shape

- `apps/api` contains the HTTP entrypoint and composition root.
- `apps/web` contains the Telegram Mini App and web cabinet shell.
- `packages/shared` contains cross-cutting contracts with no runtime side effects.
- future domain packages should follow `packages/<bounded-context>` and own their own tests.

## Backend module rules

- every bounded context owns its data model, service layer, and API contract mapping
- cross-module calls go through exported application services, not direct database access
- shared package stays narrow: types, schemas, and pure utilities only
- infrastructure concerns stay near the composition root until repeated patterns justify extraction

## Extraction trigger

Consider a service split only after one of these becomes true:

- independent scaling requirements appear
- deployment cadence for one module regularly blocks others
- data ownership boundaries are stable and audited
