# DM-108 Cycle Timeline Feed

Date: 2026-05-09

Status: Implemented

## Objective

Make DearMe's live team feed feel like a visible personal-brand growth team
without adding another runtime, queue, table, or dashboard layer.

The feed should answer:

- what part of the cycle this is in,
- who is doing the work,
- what artifact exists or is being prepared,
- where the signal came from,
- whether money or approval is involved,
- what the user should do next.

## Reuse Decisions

- Polsia: reuse the product choreography of visible cycles, role-based work,
  decisions, memory, and reports.
- Naive/Paperclip: reuse existing issues, work products, documents, approvals,
  activity log, and memory projection as the durable source of truth.
- Lindy: reuse the action-card pattern of status, trace/source context, paused
  or action-needed states, and a concrete next action.

## Implementation

- Extend the shared workbench stream contract with `kind`, `cycleStage`,
  `sourceLabel`, `costImpact`, and `nextAction`.
- Project existing DearMe/Paperclip substrate objects into the richer customer
  timeline in `dearme-workbench`.
- Render stage, kind, source, cost, approval state, and a next-action panel in
  the DearMe live team feed.
- Replace remaining customer-visible "loop" language with growth-cycle, review
  pass, and review-path language while keeping compatibility fields and ids
  stable.
- Keep substrate language out of the customer UI.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 6 files, 64 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- `rg -n "brand loop|team loop|Weekly growth loop|Review loop|work loop|current loop|growth loop|private loop|learning loop|progress loop|paused this loop|brand growth loop|operating loop" ui/src/pages/DearMeOnboarding.tsx server/src/services/dearme-workbench.ts server/src/services/dearme-output-handoff.ts packages/shared/src/validators/dearme.ts ui/src/pages/DearMeOnboarding.test.tsx server/src/__tests__ packages/shared/src/validators/dearme.test.ts`
  returned no matches.
