# DM-103: Premium Work Stream From Action Graph

Date: 2026-05-09

## Goal

Render the DearMe `workbench.actionGraph` in the paid-beta web shell as a
premium, customer-safe work stream. The product should feel like a small team is
moving the user's personal brand forward, without exposing the underlying
Paperclip/Naive machinery.

## Status

Implemented on branch `codex/dearme-dm-103-premium-work-stream`.

This slice uses the DM-102 action graph contract as the UI backbone. It does
not add routes, tables, jobs, providers, or a new runtime.

## Donor Grounding

### Polsia

Reused:

- visible cycle rhythm
- role-owned work
- decisions waiting on the user
- report ritual
- "my team is working" product feeling

Rejected:

- company-factory framing
- public live feed by default
- agent-control UI
- fully autonomous reputation-risk actions

### Naive/Paperclip

Reused:

- the existing workbench response and typed `actionGraph`
- projected team, work, decisions, memory, and report state
- approval boundary as the trust primitive

Rejected:

- exposing raw node ids, issue ids, approval ids, adapter names, providers, or
  runtime language in the paid-beta surface
- adding a persisted graph or alternate frontend route for this slice

### Lindy

Adapted:

- action-card workstream presentation
- stateful labels for working, waiting, ready, and learning
- decision cards that explain what waits on the user
- knowledge/memory/report blocks as visible team progress

Rejected:

- importing the whole Lindy shell
- exposing a workflow builder or automation transcript as the primary product

## Write Scope Used

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`
- `docs/dearme/BUILD-STATE.md`
- `doc/plans/2026-05-09-dearme-dm-103-premium-work-stream.md`

## Behavior Added

- The Growth cycle panel now includes a `Team work stream` section.
- The section renders customer-safe cards for:
  - growth cycle
  - team role
  - work item
  - prepared artifact
  - decision needed
  - approval guardrail
  - memory update
  - Dear me report
- Each card shows:
  - customer label
  - role when available
  - status badge
  - safe summary
  - next move
  - updated date
  - safe relationship labels
- The UI explicitly avoids exposing raw graph ids, issue ids, approval ids, or
  technical substrate language.

## Verification

Run and passed:

```sh
pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1
pnpm --filter @paperclipai/ui typecheck
git diff --check
```

Browser smoke:

- `http://127.0.0.1:3100/DEAA/dearme` rendered `Team work stream` and `Team visible`
  on desktop.
- Mobile viewport rendered the work stream without horizontal overflow.
- Visible page text did not include Paperclip/OpenClaw/provider/adapter language.

## Next Tickets

### DM-104: Voice & Memory Source Surface

Use Lindy's knowledge/memory management patterns to make writing samples, proof
points, links, corrections, forbidden phrases, audience notes, and offer notes
manageable in the DearMe web shell.

### DM-105: Polsia-Style Cycle Controls

Add safe cycle controls over the existing workbench: start next cycle, pause,
focus the week, approve a batch, request changes, and regenerate privately.
