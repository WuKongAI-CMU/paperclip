# DM-106 Review Loop State

Date: 2026-05-09
Branch: codex/dearme-dm-106-review-loop-state-v2

## Intent

Make DearMe's prepared work feel like a bounded AI-team review loop without
adding a new DearMe runtime, table, or workflow engine.

The product goal is that a customer can immediately see what the team prepared,
how many feedback attempts have happened, what the current loop state is, and
what the next high-leverage decision should be.

## Reuse Path

- Polsia: reuse the product choreography of visible work, live team state, and
  customer-readable progress instead of exposing a technical agent dashboard.
- Naive / Paperclip: reuse existing issues, issue comments, issue work products,
  output handoff, and workbench response contracts as the state substrate.
- Lindy: reuse the bounded action-card feedback loop pattern: approve, request
  changes, regenerate, mark not useful, then pause after too many retries.

## Scope

- Add a shared `reviewLoop` contract for DearMe outputs, workbench work items,
  decisions, and work-stream events.
- Project review-loop state from existing customer decision comments.
- Show review-loop badges and next-step guidance in the paid-beta UI.
- Surface accepted Chief of Staff briefs as private work in the workbench while
  keeping raw origin kinds, issue ids, and substrate names out of customer copy.
- Keep regeneration queued on the existing assignee and issue path.

## Non-goals

- No new database tables.
- No new agent runtime.
- No external publish, send, deploy, or spend action.
- No automatic posting.
- No customer-facing Paperclip, provider, setup-payload, or origin-kind language.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 4 files, 37 tests.
- `pnpm run typecheck` passed across the workspace.
- `git diff --check` passed.
- Rendered smoke passed on desktop and mobile through Playwright fallback after
  the Browser plugin backend could not provide stable DOM/screenshot evidence.

## Remaining Gaps

- A regenerated artifact still depends on the existing worker loop consuming the
  queued issue; this slice only makes the customer-visible loop state coherent.
- Retry limits are projected from existing review comments; a future connector
  can add durable workflow events only if comment projection stops being enough.
