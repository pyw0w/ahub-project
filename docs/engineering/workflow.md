# Delivery Workflow

## Branching

- `main` stays releasable
- feature work uses `feat/<ticket>-short-name`
- fixes use `fix/<ticket>-short-name`
- refactors use `chore/<ticket>-short-name`

## Pull requests

1. Open a PR as soon as the branch has a reviewable slice.
2. Link the task in the PR description.
3. CI must pass before merge: lint, typecheck, unit tests, smoke.
4. At least one reviewer approves before merge.
5. Use squash merge unless preserving granular commits matters for rollback.

## Main branch protection

Configure these GitHub repository rules:

- require pull requests before merging into `main`
- require the `verify` workflow to pass
- require at least one approving review
- dismiss stale approvals on new commits
- block force pushes to `main`
