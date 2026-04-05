# Engineering Standards

## Required checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run smoke`

## Code standards

- prefer strict TypeScript and pure functions at module boundaries
- write tests for contracts and risky branching logic
- keep shared packages dependency-light
- add health endpoints to every long-running process

## Secrets and configuration

- commit only examples such as `.env.example`
- local secrets live in untracked `.env.local` files
- CI and production secrets live in the deployment platform secret store
- never hard-code tokens, private URLs, or credentials in source or docs

## Review bar

- every PR describes user impact, rollback risk, and follow-up work
- infra or schema changes include a migration or rollout note
- avoid mixing refactor-only edits with behavior changes unless the refactor is required
