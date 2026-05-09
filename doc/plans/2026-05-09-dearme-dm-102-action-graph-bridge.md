# DM-102: DearMe Action Graph Projection Bridge

Date: 2026-05-09

## Goal

Expose the DearMe workbench as a typed, customer-safe action graph that reuses
Polsia choreography, Naive/Paperclip substrate rows, and Lindy-style action-card
interaction patterns without adding a new runtime or graph database.

## Status

Implemented on branch `codex/dearme-baseline-2026-05-08`.

This is a bridge slice. It gives the next worker a stable `workbench.actionGraph`
contract to render into a premium work stream, while the current customer shell
continues to use existing workbench fields.

## Donor Grounding

### Polsia

Reused as product choreography:

- visible cycle
- role-owned work
- deliverables/artifacts
- approvals and guardrails
- memory signals
- report ritual

Rejected:

- company-factory framing
- public live feed by default
- fully autonomous reputation-risk actions
- raw agent-control UI

### Naive/Paperclip

Reused as technical substrate:

- companies as tenancy boundary
- agents as team members
- issues as private work lanes
- approvals as governed-action gates
- output handoffs as artifacts
- memory update activity as memory signals
- weekly report outputs as report nodes

Rejected:

- new graph tables for this slice
- new orchestrator/runtime
- direct exposure of issues, approvals, adapters, providers, or model plumbing
  in the paid-beta surface

### Lindy

Adapted as web interaction model:

- action-card states
- pending action explanations
- request changes / regenerate / retry language
- transcript/block-style work stream for the next UI slice
- knowledge/memory source management as the next Voice & Memory slice

Rejected:

- importing the whole Lindy shell
- exposing an internal automation builder
- making DearMe feel like a workflow editor

## Write Scope Used

- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/validators/index.ts`
- `server/src/services/dearme-workbench.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `packages/shared/src/validators/dearme.test.ts`
- `server/src/__tests__/dearme-workbench.test.ts`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`
- `docs/dearme/README.md`
- `docs/dearme/BUILD-STATE.md`
- `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
- `doc/plans/2026-05-09-dearme-dm-102-action-graph-bridge.md`

## Protected Scope

- No database schema changes.
- No new routes.
- No new model/provider/adapter dependencies.
- No public posting, sending, deploying, or spending behavior.
- No import of external or donor UI assets.

## Acceptance

- Workbench responses include a validated `actionGraph`.
- The graph includes cycle, role, work item, artifact, decision, guardrail,
  memory signal, and report node kinds.
- The graph links the loop with owns, produces, requires decision, blocks,
  learns from, and reports relationships.
- The projection is built from existing workbench/read-model rows.
- The customer shell gains clearer Work Ready and Decisions Needed action-card
  language without exposing substrate terms.
- Focused shared, server, and UI tests pass.

## Verification

Run before handoff:

```sh
pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run --maxWorkers=1
pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run --maxWorkers=1
pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1
pnpm --filter @paperclipai/ui typecheck
pnpm --filter @paperclipai/server typecheck
git diff --check
```

## Next Tickets

### DM-103: Premium Work Stream From Action Graph

Render `workbench.actionGraph` directly in the paid-beta web shell as a polished
Lindy-style work stream:

- cycle status
- active roles
- work lanes
- artifacts produced
- decisions waiting
- guardrails protecting reputation-risk moves
- memory updates
- weekly report

### DM-104: Voice & Memory Source Management

Use Lindy knowledge/memory patterns to build a DearMe-native Voice & Memory
surface for writing samples, proof, links, corrections, and forbidden phrases.

### DM-105: Polsia-Style Cycle Controls

Add safe cycle controls over the existing workbench: start next cycle, pause,
focus the week, approve a batch, request changes, and regenerate privately.
