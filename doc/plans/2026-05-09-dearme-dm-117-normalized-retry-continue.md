# DM-117 Normalized Retry Continue Entrypoint

Date: 2026-05-09

## Goal

Make DearMe's retry, continue, and new-direction states feel like one managed
personal-brand team loop, not scattered task controls.

## Reuse posture

- Polsia: reuse the visible-momentum choreography. Cards should show what the
  team needs next and open directly to the next decision.
- Naive/Paperclip: reuse the existing focused decision route, output handoff
  service, issue wakeup, activity logs, and review-loop state behind a thin
  DearMe continuation API.
- Internal assistant baseline: reuse the action-card, paused-action-needed,
  retry, and continue grammar; do not import its workflow editor or runtime.

## Scope

- Add a review-entry intent to the existing DearMe decision route.
- Add a thin DearMe `/continue` product entrypoint that normalizes retry,
  revision, and new-direction intent before calling the existing handoff path.
- Map review-loop states into customer-safe labels:
  review, continue revision, track next pass, give new direction, add clearer
  direction, and see progress.
- Route Work Ready, Live Team Feed, and Private Work card actions through the
  existing focused DearMe surface.
- Add focus guidance for revision, regeneration, and not-useful states.
- Keep the underlying review handoff service, wakeup queue, and activity-log
  behavior unchanged.

## Out of scope

- New execution routes or raw job controls.
- New database tables.
- New workflow editor or raw execution controls.
- Automatic publish, send, deploy, spend, or public-claim actions.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/api/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 5 files, 74 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed with the existing MarkdownEditor dynamic/static import
  warning and chunk-size warnings.
- `git diff --check` passed.
- Hidden-substrate language scan on touched UI/test files returned only benign
  opportunity-copy `jobs` matches, not runtime job controls.
