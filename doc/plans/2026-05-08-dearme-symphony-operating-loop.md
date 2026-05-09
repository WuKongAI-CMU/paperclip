# DearMe Symphony-Style Development Loop

Date: 2026-05-08

## Purpose

Use this plan to start continuous DearMe development with a persistent Codex Goal as the product/engineering control thread and Symphony-style isolated workers as execution lanes.

Symphony is treated as an execution factory, not as the product brain. The DearMe product direction, build order, acceptance criteria, and merge decisions stay in this repo and in the long-running Goal thread.

## Starting State

- The active checkout at `/Users/peter/dearme` is now a recoverable DearMe
  integration branch: `codex/dearme-baseline-2026-05-08`.
- The old mixed-tree warning still applies to broad parallel edits: use isolated
  worker branches/worktrees for new product-code tickets.
- DearMe source-of-truth docs already identify the next safe product slices:
  - Premium Work Stream rendered from the action graph.
  - Voice and Memory source management.
  - Product-copy leakage cleanup.
  - Polsia-style cycle controls over the existing workbench.

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

Current status: integrated. Use the current baseline branch as the product spine
for follow-on tickets unless a newer reviewed baseline exists.

Worker brief:

- `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`

Guardrail: This is the first ticket in the current state because DearMe product
spine files are still untracked in the integration checkout. Do not start
product-code workers from a clean base that lacks the DearMe docs, routes,
services, UI API, pages, and tests they need.

### DM-001: Output Review And Regeneration Actions

Goal: Turn focused private DearMe outputs into actionable review cards.

Current status: integrated enough for the paid-beta workbench path. Follow-on
work should deepen quality and UX rather than restart this ticket from the old
blocked state.

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

### DM-102: Action Graph Projection Bridge

Goal: Project the DearMe workbench into a typed customer-safe graph of cycle,
roles, work, artifacts, decisions, guardrails, memory, and reports.

Current status: implemented on the current baseline branch.

Worker brief:

- `doc/plans/2026-05-09-dearme-dm-102-action-graph-bridge.md`

Donor grounding:

- Polsia: cycle/task/report/memory/approval choreography.
- Naive/Paperclip: agents, issues, approvals, output handoffs, memory updates,
  and report outputs as the substrate rows.
- Lindy: action-card, pending-action, transcript/block, and retry/regenerate
  interaction model.

Guardrail: The graph is a projection, not a new runtime or new database model.
Do not expose graph or substrate terms to paid-beta users.

### DM-103: Premium Work Stream From Action Graph

Goal: Render `workbench.actionGraph` into a Lindy-style premium customer work
stream that makes Polsia-style momentum visible.

Guardrail: Team visible, machinery hidden. Do not expose raw graph ids, issue
ids, approval routes, adapters, providers, or model names.

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

## Current Coordinator Queue - 2026-05-09

The old first-execution queue above is historical. The current integrated branch
has already absorbed the DM-102 through DM-125 product spine. Workers must read:

- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/INTEGRATED-ARCHITECTURE.md`
- `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

Current bounded worker tickets:

1. `DM-128`: Focused Decision Review Drawer.
2. `DM-129`: Automation Reliability And Cost Policy.
3. `DM-130`: Web Shell Polish From Lindy And Littlebird.

Recently completed:

- `DM-127`: Voice & Memory Source Detail Drawer.

Do not restart stale DM-001, DM-103, or DM-104 briefs unless the coordinator
explicitly reopens them. They are now product history, not the active queue.

## Immediate Next Step

Start with `DM-128` in an isolated worker branch/worktree from the latest
integrated DearMe branch. Keep this Goal thread as the coordinator; use Symphony
or Symphony-like workers only for bounded tickets with explicit donor grounding,
write scope, protected scope, acceptance, and verification.
