# DM-121 Voice & Memory Source Actions

Date: 2026-05-09
Branch: `codex/dearme-dm-121-memory-source-actions`

## Intent

Let users curate saved Voice & Memory sources without creating a separate
DearMe memory system.

The user should be able to revise a saved source, retire a stale source, and see
future private work use only the active memory set. This keeps DearMe feeling
like a managed personal-brand team that learns from the user, while the runtime
stays on the existing Paperclip substrate.

## Reuse Sources

- Polsia: visible learning and work-cycle choreography. Memory edits are part
  of the team getting smarter, not a settings/admin surface.
- Naive/Paperclip: existing company-scoped `activity_log` rows, workbench
  projection, activity feed invalidation, and routine memory context remain the
  durable source of truth. No new memory table was introduced.
- Lindy: editable memory/source-card interaction pattern, adapted as
  `Revise`, `Save source`, and `Retire source` on DearMe action cards instead
  of a generic workflow-builder or knowledge-base manager.

## Implementation

1. Extended the shared DearMe memory contract so saved sources retain full
   source body text and archive responses are typed.
2. Added PATCH and DELETE DearMe memory-source routes backed by `activity_log`
   events:
   - `dearme.memory_updated`
   - `dearme.memory_archived`
3. Updated workbench projection to show only the latest active revision per
   source and hide retired sources.
4. Updated routine memory-context refresh so revised sources replace stale
   source text and archived sources are removed from routine descriptions.
5. Added DearMe UI actions for saved sources:
   - revise a source into the existing add form,
   - save the revised source,
   - retire a stale source.
6. Added API, server, validator, and UI tests for revise/archive behavior.

## Rejected

- No separate DearMe memory table while `activity_log` can still express source
  history and active projection.
- No external connector, scrape, upload, publish, send, or deploy action in this
  slice.
- No approval gate for private source edits; no external or public side effect
  occurs.
- No donor/runtime language in the paid-beta customer surface.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 6 files, 82 tests.
- `pnpm -r typecheck` passed across the workspace.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  or agent-runtime language.
- Rendered `/dearme` locally at `http://127.0.0.1:3100/DEAA/dearme` with
  Playwright after the Browser plugin reported `Browser is not available: iab`.
  Verified Source coverage renders, `Add Boundaries` selects the constraint
  source type, `Revise` opens the saved source in edit mode, no framework error
  overlay appears, no console error/warn messages appear, the source-card badge
  layout does not overlap, and 390px mobile has no horizontal overflow.

## Remaining Gaps

- No public channel connectors were added.
- If memory history needs richer audit/query behavior later, revisit whether an
  explicit Voice & Memory source table is warranted.
