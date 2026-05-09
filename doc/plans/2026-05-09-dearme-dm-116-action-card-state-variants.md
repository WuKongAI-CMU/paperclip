# DM-116 DearMe Action Card State Variants

Date: 2026-05-09

## Purpose

Turn paused and retry states into first-class DearMe-owned card grammar before
wiring more work-stream projections onto the product surface.

This keeps the Polsia lesson visible: the user sees a team pausing, continuing,
or taking another pass inside a coherent growth cockpit. It also keeps the
Naive/Paperclip execution substrate hidden behind DearMe language.

## Scope

- Extend `DearMeActionCard` with a reusable attention notice for:
  - `decision_needed`
  - `paused`
  - `retry`
  - `blocked`
- Preserve the current badges, chips, callout, footer, and action API.
- Translate existing review-loop and status data into attention notices for
  Work Ready, Decisions Needed, Live Team Feed, and Private Work cards.
- Add component coverage for paused and retry variants.
- Update durable DearMe build and architecture notes.

## Out Of Scope

- No new runtime state, route, mutation, database table, or workflow editor.
- No new server projection contract.
- No donor runtime, GraphQL, relay, workflow-builder, provider, or setup copy.

## Verification

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx`
- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
- `pnpm -r typecheck`
- `git diff --check`
- Forbidden-token scan across the DearMe action-card and onboarding source/test
  paths touched by this slice.

## Next Slice

Add a normalized retry/continue entrypoint that uses the existing DearMe review
routes and keeps raw job controls out of the customer surface.
