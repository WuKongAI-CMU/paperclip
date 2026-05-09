# DM-120 Voice & Memory Source Coverage

Date: 2026-05-09
Branch: `codex/dearme-dm-120-memory-source-coverage`

## Intent

Move Voice & Memory from a flat source list into a guided source-coverage
surface.

The user should be able to see which memory inputs DearMe already has, which
ones are weak, and which next source will make future personal-brand work safer
and more useful.

## Reuse Sources

- Lindy: knowledge-source tile/setup pattern, adapted as coverage and next
  setup action instead of a generic knowledge-base manager.
- Naive/Paperclip: existing company-scoped activity rows remain the source of
  truth for memory updates.
- Polsia: visible learning loop; the growth team should visibly get smarter as
  the user adds source material.

## Implementation

1. Extend the shared DearMe workbench memory contract with `sourcePlan`.
2. Build `sourcePlan` in the server from existing `dearme.memory_updated`
   activity rows.
3. Render Source coverage tiles in the `/dearme` Voice & Memory panel.
4. Let each coverage gap select the matching source type in the existing add
   form.
5. Keep source cards on the DearMe action-card path and update docs.

## Rejected

- No generic knowledge-base modal in the paid-beta cockpit.
- No crawler, upload/sync state machine, or workflow-builder surface.
- No new memory-source table until existing activity projection becomes lossy.
- No donor/runtime terms in user-facing copy.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 40 tests.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  or agent-runtime language.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.

## Stop Conditions

- Voice & Memory must remain a DearMe product surface, not a donor knowledge
  base clone.
- Public/send/deploy/spend moves must remain approval-gated.
- Any richer import/edit/archive action must be backed by a typed server
  contract before it becomes a visible control.
