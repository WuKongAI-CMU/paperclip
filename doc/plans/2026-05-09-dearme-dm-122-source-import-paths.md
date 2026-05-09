# DM-122 - Voice & Memory Source Import Paths

Date: 2026-05-09
Branch: `codex/dearme-dm-122-source-import-paths`

## Goal

Make DearMe's Voice & Memory source intake feel closer to a reusable assistant
knowledge flow without importing a generic workflow builder or adding a new
memory backend.

Users should be able to add a source as one of three typed private paths:

- `paste`: direct source text or note.
- `link`: private reference link plus the useful memory from it.
- `import_note`: a description of a file, transcript, profile, or backlog item
  the team should fold into the next growth cycle.

## Donor Reuse

- Polsia: the product interpretation is that the visible growth team is learning
  from sources and will use them in future cycles. The user sees progress and
  prepared work, not a technical source manager.
- Naive/Paperclip: source truth stays on the existing company-scoped
  `activity_log`, workbench projection, and routine memory-context refresh.
  There is no new table, crawler, upload store, or parallel knowledge engine.
- Lindy/internal assistant baseline: reuse the compact action-card/source-card
  pattern and validation-aware source form behavior, translated into DearMe's
  Voice & Memory language.

## Implementation

- Extend the shared DearMe memory contract with `sourceInputMode`.
- Validate `link` sources as explicit `http`/`https` URLs in the shared schema so
  server routes and UI callers share the same boundary.
- Persist the source path in DearMe memory activity details.
- Project the source path back into workbench memory cards, defaulting older
  records to `paste`.
- Add a three-option source-path control to the Voice & Memory panel.
- Keep all customer-facing copy in DearMe language and avoid donor/runtime
  terms.

## Rejected

- Rejected a new DearMe memory table while the activity log still supports the
  needed source history and active-source projection.
- Rejected scrape/fetch/upload/connect behavior in this slice; `link` stores a
  private reference, it does not crawl.
- Rejected importing Lindy/assistant workflow-builder UI wholesale.
- Rejected exposing Paperclip, provider, adapter, MCP, setup payload, or workflow
  terminology in the customer surface.

## Verification

Completed verification in this branch:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 6 files, 84 tests.
- `pnpm run typecheck` passed across the workspace.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  agent-runtime, routine, cost_event, anthropic, or claude language.
- Playwright render smoke for
  `http://127.0.0.1:3100/DEAA/dearme` passed on desktop and 390px mobile:
  Source path controls rendered, `Source link` switched the source input to
  `type="url"`, no Vite overlay appeared, no console errors or warnings were
  emitted, forbidden substrate terms were absent from the page body, and mobile
  scroll width stayed at 390px.
