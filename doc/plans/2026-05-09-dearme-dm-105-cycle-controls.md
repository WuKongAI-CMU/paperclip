# DM-105: Polsia-Style Cycle Controls Over Existing DearMe Substrate

Date: 2026-05-09
Branch: `codex/dearme-dm-105-cycle-controls`
Scope: DearMe paid-beta workbench, Chief of Staff brief surface.

## Decision

Add customer-facing cycle controls to the DearMe Chief of Staff composer.

The product goal is to make the next private growth loop selectable without
turning DearMe into an agent console. Users should feel the Polsia-style rhythm:
choose the next loop, watch private work get prepared, then review the decisions
that represent them.

## Reuse

- Polsia: reuse the visible cycle ritual and "work starts now" product feeling.
  The user picks a loop and the team begins preparing reviewable work.
- Naive/Paperclip: reuse the existing Chief of Staff message route, issue
  creation, assignee lookup, activity log, and wakeup path. No new scheduler,
  runtime, worker, auth, or API family is introduced.
- Lindy baseline: reuse the preset action-card interaction pattern and bounded
  review-loop mindset. Do not import Lindy workflow runtime, Relay/GraphQL, or
  graph-builder machinery.

## Implementation Boundary

Touched:

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `docs/dearme/BUILD-STATE.md`

Not touched:

- Server routes
- Shared validators
- Database schema
- Agent runtime
- Billing
- Publishing or channel connectors

## Product Behavior

The Chief of Staff panel now shows five cycle controls:

- Focus the week
- Prepare content batch
- Scout opportunities
- Refresh public proof
- Write weekly letter

Selecting a control pre-fills the existing Chief of Staff brief with a safe,
private-work instruction and the matching existing intent. Sending the brief
continues through the existing private work route and approval boundaries.

## Guardrails

- No public action is executed from the control.
- No spend, publish, send, deploy, or public claim bypasses approval.
- The UI does not expose Paperclip, OpenClaw, provider, adapter, issue queue, or
  setup-payload language.
- The controls do not claim hard pause/resume semantics because no backend pause
  contract exists yet.

## Verification

- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 1 file, 19 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Playwright smoke on `http://127.0.0.1:3100/DEAA/dearme` passed for desktop
  `1440x1100` and mobile `390x844`: cycle controls rendered, horizontal
  overflow was `0`, console/page errors were empty, and the Chief of Staff
  composer did not expose Paperclip/OpenClaw/provider/adapter/setup_payload
  language.

Not run:

- Full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build`; this was a
  narrow customer-facing UI slice that reuses the existing private-work route.
