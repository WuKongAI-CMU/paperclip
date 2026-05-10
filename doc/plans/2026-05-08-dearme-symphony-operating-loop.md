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
- 2026-05-10 coordinator update: DM-139/DM-140 now bridges the shared cycle
  output packet through output handoff, workbench/report projection, and the
  Dear me letter proof-pack review. DM-141 extends the same boundary across
  workbench cards, focused review, live feed, run ledger, action graph, and
  Voice & Memory. Follow-on workers should deepen this same packet-backed
  customer path instead of starting a second runtime or report surface. DEA-7
  extends the same lane with a persistable private content draft packet and
  customer-safe Voice check surfaces on prepared work/proof-pack cards.

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

1. `DM-130`: Web Shell Polish From Lindy And Littlebird.
2. Future `DM-129A`: Backend Automation Policy Projection, only if the current
   client-side policy panel needs server-owned facts that the workbench cannot
   derive.

Recently completed:

- `DM-129`: Automation Reliability And Cost Policy.
- `DM-128`: Focused Decision Review Drawer.
- `DM-127`: Voice & Memory Source Detail Drawer.

Do not restart stale DM-001, DM-103, or DM-104 briefs unless the coordinator
explicitly reopens them. They are now product history, not the active queue.

## Immediate Next Step

Start with `DM-130` in an isolated worker branch/worktree from the latest
integrated DearMe branch. Keep this Goal thread as the coordinator; use Symphony
or Symphony-like workers only for bounded tickets with explicit donor grounding,
write scope, protected scope, acceptance, and verification.

## Live Coordinator Addendum - 2026-05-10

Current local reality:

- `/Users/peter/dearme` is on `codex/dearme-dm-136-sample-demo-proof`, not the
  older `codex/dearme-baseline-2026-05-08` branch named above.
- A local Symphony setup now exists: `/Users/peter/symphony` plus the wrapper
  `/Users/peter/.local/bin/symphony`. DearMe also has local workflow files under
  `.symphony/`. The smoke log shows a local endpoint previously booted on
  `127.0.0.1:4101`. The real Linear workflow now routes by `team_key: DEA`
  plus `assignee: me`, because the DearMe Linear workspace has a DearMe team
  but no Linear Project. Use `.symphony/bin/dearme-symphony status` as the
  current source of truth for the daemon.
- Update: Symphony is now cloned at `/Users/peter/symphony`, built from the
  Elixir implementation, and exposed through `/Users/peter/.local/bin/symphony`
  via a `mise exec` wrapper so the required Erlang/Elixir runtime is always on
  PATH.
- DearMe workflow templates now live in `/Users/peter/dearme/.symphony/`:
  `WORKFLOW.md` is the real Linear-backed coordinator workflow, and
  `WORKFLOW.local-smoke.md` is a credential-free boot check.
- Local Symphony verification passed: `mix build`, `mix test` with 230 tests,
  `mix specs.check`, wrapper execution, and a smoke boot against
  `WORKFLOW.local-smoke.md` with `/api/v1/state` responding on port 4101.
- The Codex App Linear plugin is authenticated as `peter@wukongai.io` and can
  read/mutate the DearMe Linear workspace from this Codex thread. It confirmed
  the team `DearMe`, issue prefix `DEA`, project/workspace slug `dearme`, and
  the real team states: `Backlog`, `Todo`, `In Progress`, `In Review`, `Done`,
  `Canceled`, and `Duplicate`.
- The standalone Symphony daemon needs either a shell-visible `LINEAR_API_KEY`
  or the macOS Keychain token read by `.symphony/bin/dearme-symphony`; the Codex
  App plugin credential is not exported to external processes.
- OpenClaw remains the live substrate to verify for local orchestration, while
  DearMe remains the customer product shell.
- The older `DM-130` immediate-next-step above is historical. `DM-138A` has
  shipped the first-cycle start bridge on the active branch: one positioning
  answer now creates the private issue, logs activity, emits existing workbench
  stream events, wakes the chief-of-staff lane, and returns the existing
  first-cycle preview response as the customer proof package. `DM-138B` added
  `proofSequence` to that same response and aligned the UI plus private issue
  work order. `DM-138C` now hydrates that sequence from prepared DearMe output
  documents and work products without inventing a second first-run payload
  shape. `DM-138D` now writes output-handoff-compatible proof artifacts during
  first-cycle start and returns the same source-labelled proof sequence.
  `DM-138E` then live-smoked the paid-beta path, fixed stale cancelled proof
  history in the existing output handoff projection, and verified the customer
  page shows current `Ready for review` work without donor/runtime vocabulary.
  The active product next slice should move to DM-139 / DM-140 autonomous
  reporting and voice/content production; `DEA-5` can continue as the
  Symphony worker's independent handoff lane, but it should not create a second
  first-cycle contract.
- On macOS, `/tmp` is a symlink to `/private/tmp`; do not count those as two
  independent worktree roots or delete one side as a duplicate.
- The safe coordination default is still isolated worker worktrees plus this
  coordinator loop. Do not mechanically merge every old worktree; classify each
  branch against the current integration head and then decide whether it is
  already absorbed, obsolete, or worth a fresh integration slice.

Shared fact command for coordinators and workers:

```sh
pnpm dearme:worktrees
pnpm dearme:worktrees -- --json
pnpm dearme:worktrees -- --summary-only --skip-dirty
pnpm dearme:worktrees -- --status=patch-equivalent --skip-dirty
pnpm dearme:worktrees -- --not-in-current --ticket=DM-138 --limit=5 --skip-dirty
```

Use that command before opening new integration tickets. `in_current` means the
worktree head is an ancestor of the current integration branch.
`patch_equivalent` means the branch head is not an ancestor, but its right-side
patches are already present on the current coordinator head; close only after
owner confirmation. `not_in_current` means the branch needs content review, not
automatic merge. `prunable` means the worktree record points at a missing
checkout and should not be treated as active work until the owner confirms it
matters. Ticket filters are for finding candidate worker branches; an empty
result means start a fresh isolated worktree from the current coordinator head.

Latest live audit:

- `pnpm dearme:worktrees -- --json` previously reported 116 worktree records:
  1 current, 1 dirty, 2 `in_current`, and 113 `not_in_current`.
- DM-183 upgraded the worktree command into a coordinator report with ticket
  extraction, purpose labels, action buckets, summary-only mode, and focused
  filters for status/ticket/dirty/limit.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported the same 116
  records as 1 current, 2 absorbed, 0 patch-equivalent, 113 not in current, 19
  integration-style, and 96 worker-style checkouts.
- `pnpm dearme:worktrees -- --status=patch-equivalent --skip-dirty --limit=20`
  returned zero records in the latest audit, so no active worker checkout is
  currently safe to close as patch-equivalent without further review.
- `pnpm dearme:worktrees -- --not-in-current --ticket=DM-138 --limit=5
  --skip-dirty` returned zero records before DM-138B, so `DEA-5` / `DM-138E`
  should use a fresh isolated worktree from the current integration branch
  unless a newer coordinator audit finds an active branch.
- The stale `dearme-5a09-probe` worktree metadata was pruned after dry-run
  confirmed its gitdir pointed at a missing checkout.
- Local OpenClaw gateway was repaired from a stale temporary package path to the
  global OpenClaw 2026.4.27 install:
  `/Users/peter/.npm-global/lib/node_modules/openclaw/dist/index.js`.
- Verification after repair: launchd reported `ai.openclaw.gateway` running,
  `http://127.0.0.1:18789/health` returned `{"ok":true,"status":"live"}`, and
  port 18789 was listening. `openclaw status --json` still showed the websocket
  self-check as `timeout`, so treat the HTTP gateway as restored but keep worker
  mesh/Symphony runtime verification as an open coordination task.
- Symphony verification after `.symphony/` appeared: `command -v symphony`
  resolved to `/Users/peter/.local/bin/symphony`, `/Users/peter/symphony`
  exists, and `.symphony/logs/log/symphony.log.1` records a smoke endpoint on
  `127.0.0.1:4101`. No current listener was present on ports `4100` or `4101`,
  and no Symphony/Elixir process was active at the latest check.
- Runtime wrapper added at `.symphony/bin/dearme-symphony`. Use
  `.symphony/bin/dearme-symphony smoke` for credential-free boot checks and
  `.symphony/bin/dearme-symphony start|status|stop` for the real Linear-backed
  coordinator. `start` reads `LINEAR_API_KEY` from the environment first, then
  from the macOS Keychain service `dearme-linear-api-key`, and writes runtime
  state under `.symphony/run/`.
- The real `.symphony/WORKFLOW.md` now matches the confirmed DearMe Linear
  states above and uses `team_key: DEA` plus `assignee: me` rather than a
  Project slug. Credential-free smoke verification passed again on 2026-05-10.
  After assigning `DEA-5` to Peter, the real daemon on `127.0.0.1:4100` picked
  up `DEA-5`, created `/private/tmp/dearme-symphony-workspaces/DEA-5`, and
  started a Codex session for the live worker/browser smoke.
- DM-138C proof-source hydration verification passed with:
  `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  reporting 4 files and 88 tests passing. The customer-facing proof sequence can
  now show where prepared private artifacts came from without exposing substrate
  terms.
- DM-138D proof-output write verification passed with:
  `pnpm --filter @paperclipai/server typecheck` and
  `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  reporting 37 tests passing. This proves the local first-cycle start writes
  real output-handoff documents and returns hydrated proof; `DEA-5` remains the
  standalone Symphony/browser smoke.
- Linear connector update: `DEA-5` was created as
  `DM-138E: Live first-cycle Symphony worker/browser smoke`, so future
  collaboration should start from that Linear issue plus `.symphony/WORKFLOW.md`.
- Linear connector update: `DEA-6` and `DEA-7` now track the next Symphony
  lanes for DM-139 autonomous reporting and DM-140 voice-gated content. Their
  first shared server-side bridge is in the coordinator checkout:
  `prepareCycleOutputPacket(...)` reuses output handoff, documents, work
  products, and Voice Gate to keep content drafts and the Dear me report on one
  private evidence packet. Workers should extend that path instead of creating a
  second reporting/content runtime.
- Coordinator continuation: the same private packet is now projected through
  the DearMe workbench/report read model as one customer-safe review surface
  across Work Ready, Decisions, report digest, work stream, run ledger, and
  action graph. Future Symphony work should polish and consume that projection
  before adding any new reporting/content runtime.
- Latest worktree coordinator audit:
  `pnpm dearme:worktrees -- --summary-only --skip-dirty` still reports 116
  records: 1 current, 2 absorbed into current, 0 patch-equivalent, 113 not in
  current, 19 integration-style, and 96 worker-style checkouts. Continue
  reviewing `not_in_current` branches as candidate product slices; do not merge
  them mechanically.
