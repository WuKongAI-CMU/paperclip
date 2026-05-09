# DM-109 Actionable Live Feed

Date: 2026-05-09
Branch: `codex/dearme-dm-109-actionable-feed`
Status: implemented

## Objective

Make the DearMe live team feed behave like a real action surface. When the
team says a decision is ready, the user should be able to review it from the
feed card directly, without navigating through internal issue or approval
surfaces.

## Reuse Decisions

- Polsia product choreography: keep the live feed as the visible proof that an
  AI team is moving the user's personal brand forward.
- Naive/Paperclip substrate: reuse existing approvals, issue references,
  prepared-output ids, and DearMe decision routes. Do not add a DearMe-only
  task table, queue, or runtime.
- Lindy interaction pattern: adapt the action-card/inspector loop. A card
  describes the work and exposes one clear next action that opens the focused
  review surface.

## Implementation

- Extended the shared DearMe workbench stream contract with `approvalId` so
  approval-backed feed items can route to the existing DearMe approval focus.
- Projected `approvalId` from the server workbench service for decision stream
  items and set it to `null` for work/progress items.
- Added action buttons to live feed cards:
  - `Review now` for approval or user-review items.
  - `Open prepared work` for prepared artifacts.
  - `Open private work` / `Open work` for issue-backed work.
- Routed actions through existing DearMe decision helpers:
  - approval-backed feed item -> `?view=decisions&approval=...`
  - output-backed feed item -> `?view=decisions&issue=...&output=...`
  - issue-backed feed item -> `?view=decisions&issue=...`
- Added UI coverage for both output-backed feed decisions and approval-backed
  feed decisions.

## Acceptance Criteria

- A feed card with prepared content opens the focused prepared-output review
  surface.
- A feed card with a pending approval opens the focused DearMe approval
  surface.
- No customer-facing Paperclip, OpenClaw, adapter, provider, setup payload, or
  raw admin language is introduced.
- No new runtime/dependency is added.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 4 files, 61 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx server/src/services/dearme-workbench.ts packages/shared/src/validators/dearme.ts`
  returned no matches.
