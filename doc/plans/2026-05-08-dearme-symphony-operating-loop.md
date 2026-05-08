# DearMe Symphony-Style Development Loop

Date: 2026-05-08

## Purpose

Use this plan to start continuous DearMe development with a persistent Codex Goal as the product/engineering control thread and Symphony-style isolated workers as execution lanes.

Symphony is treated as an execution factory, not as the product brain. The DearMe product direction, build order, acceptance criteria, and merge decisions stay in this repo and in the long-running Goal thread.

## Starting State

- The active checkout at `/Users/peter/dearme` is a mixed DearMe integration tree on branch `dearme`.
- The current tree must not be used as an uncontrolled concurrent worker base.
- DearMe source-of-truth docs already identify the next safe product slices:
  - Output-level review and regeneration actions.
  - Team Work Stream.
  - Voice and Memory source management.
  - Product-copy leakage cleanup.

## Operating Split

### Goal Thread

Owns:

- DearMe product direction and build order.
- Ticket slicing and worker acceptance criteria.
- Architecture exceptions and donor reuse decisions.
- Final integration, review, and verification claims.

Does not own:

- Unbounded implementation inside one giant thread.
- Silent rewrites of inherited Paperclip substrate.
- Concurrent edits against the dirty integration checkout.

### Symphony-Style Worker

Owns exactly one bounded ticket at a time:

- Read the required DearMe docs and relevant donor paths.
- Work in an isolated disposable worktree.
- Stay inside the approved write scope.
- Run the ticket-specific verification.
- Return a PR-ready diff and evidence summary.

Does not own:

- Product strategy.
- Global architecture changes.
- Broad cleanup.
- User-facing copy rewrites outside the ticket.

## Startup Gates

Before assigning product-code tickets to workers:

1. Pick the approved base for isolated worktrees.
2. Preserve the current mixed integration tree; do not broad-revert or bulk-clean it.
3. Confirm each ticket has a write scope, protected scope, donor grounding, acceptance criteria, and verification command list.
4. Keep customer-facing DearMe surfaces free of raw Paperclip, OpenClaw, OK Partner, adapter, provider, model, issue, document, work product, and approval-route terminology unless explicitly intended for internal operator surfaces.
5. Keep public or externally visible moves approval-gated.

## First Execution Queue

### DM-005A: Integration Baseline And Product Spine

Goal: Convert the current mixed DearMe integration tree into a recoverable
baseline that isolated workers can use.

Worker brief:

- `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`

Guardrail: This is the first ticket in the current state because DearMe product
spine files are still untracked in the integration checkout. Do not start
product-code workers from a clean base that lacks the DearMe docs, routes,
services, UI API, pages, and tests they need.

### DM-001: Output Review And Regeneration Actions

Goal: Turn focused private DearMe outputs into actionable review cards.

Worker brief:

- `doc/plans/2026-05-08-dearme-dm-001-output-review-regeneration-ticket.md`

Primary source of truth:

- `docs/dearme/WORKTREE-INTEGRATION-PLAN.md`
- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/INTEGRATED-ARCHITECTURE.md`

Expected write scope:

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/api/dearme.ts`
- Existing DearMe output handoff and review services only if needed.
- Focused tests for the touched UI/API/server paths.

Acceptance:

- Output cards support approve useful, request changes, regenerate, and mark not useful.
- User notes feed regeneration or review context through existing DearMe services.
- Public publishing remains approval-gated.
- The customer journey does not require raw `/issues/*` or `/approvals/*` navigation.
- Customer-facing labels remain in DearMe language: posts, reports, proof cards, opportunities, portfolio.

Suggested verification:

- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
- `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
- Any existing approval route/service tests touched by the change.

### DM-002: Team Work Stream

Goal: Move the current Team Work Stream from a static projection toward a credible event stream while keeping the DearMe surface product-native.

Guardrail: Do not expose raw issue, agent, adapter, provider, or model mechanics to paid-beta users.

### DM-003: Voice And Memory Source Management

Goal: Add source ingestion and management for voice profile, examples, links, uploads, and memory signals.

Guardrail: Voice Gate remains part of output review, not an abstract settings panel.

### DM-004: Product-Copy Leakage Cleanup

Goal: Patrol paid-beta surfaces and replace inherited substrate terms with DearMe-native language.

Guardrail: This is copy and boundary cleanup only. Do not restructure components unless a proven bug requires it.

### DM-005: Integration Baseline And PR Grouping

Goal: Turn the current mixed integration tree into reviewable, recoverable chunks before broad parallelization.

Guardrail: Stage by explicit path only. Do not use `git add -A` or broad cleanup commands.

## Ticket Template

Each worker ticket should include:

```text
Ticket:
Goal:
Base branch/worktree:
Required docs to read:
Donor paths used/adapted/rejected:
Write scope:
Protected scope:
Acceptance criteria:
Verification commands:
Stop rules:
PR notes:
```

## Immediate Next Step

Start with DM-005A in the current checkout state. DM-001 remains the first
product-code ticket, but it is blocked until a DearMe baseline ref exists that
isolated workers can safely use. Keep this Goal thread as the coordinator, then
use Symphony or a Symphony-like Linear queue once the base and ticket template
are stable.
