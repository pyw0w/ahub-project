# AHub Platform

Engineering foundation for the AHub platform: backend API, Telegram Mini App/web shell, and shared contracts inside a modular monolith workspace.

## Repository Layout

- `apps/api` - HTTP entrypoint, health checks, and future backend composition root
- `apps/web` - frontend shell for the Telegram Mini App and web cabinet
- `packages/shared` - shared contracts and pure cross-cutting types
- `packages/core-domain` - core bounded context contracts and baseline storage invariants
- `docs/architecture` - architectural decisions and boundaries
- `docs/engineering` - workflow, config strategy, and team standards

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run lint
npm run typecheck
npm test
npm run smoke
```

## Workflow

- branch from `main` using the naming rules in `docs/engineering/workflow.md`
- open a PR early
- do not merge unless CI is green and review is complete

## Health Checks

- API health: `GET /healthz`
- API readiness: `GET /readyz`

## Configuration

Use `.env.example` as the source of truth for required keys. Keep real secrets out of git and inject them through local `.env.local` or the deployment platform.
