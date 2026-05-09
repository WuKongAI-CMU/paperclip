# DM-118 Routine And Spend Progress Projection

Date: 2026-05-09
Branch: `codex/dearme-dm-118-routine-cost-progress`

## Intent

Increase DearMe's reuse of the Naive/Paperclip substrate by projecting existing
routine and cost lineage into the DearMe workbench instead of inventing a new
progress system.

The product goal is Polsia-style visible motion: the user should see that their
personal brand team completed a cycle check-in and that spend is being tracked
behind the scenes, without seeing provider names, model names, raw routine rows,
or runtime machinery.

## Donor Reuse

- Polsia: visible growth-cycle motion and the feeling that the team worked while
  the user was away.
- Naive/Paperclip: `routines`, `routine_runs`, `cost_events`, existing agents,
  existing issues, and existing workbench projection.
- Lindy: action-card and action-needed grammar remains the customer-facing web
  pattern; this slice feeds that pattern with richer substrate progress.

## Files Touched

- `packages/shared/src/validators/dearme.ts`
  - added `cycle_check_in` and `spend_checkpoint` progress kinds.
- `server/src/services/dearme-workbench.ts`
  - reads routine runs and DearMe-agent cost events from existing substrate
    tables;
  - maps them into DearMe-safe progress and work-stream cards.
- `server/src/__tests__/dearme-workbench.test.ts`
  - seeds routine and cost rows;
  - proves the workbench shows cycle/spend progress without leaking raw runtime,
    provider, or model vocabulary.
- `ui/src/pages/DearMeOnboarding.test.tsx`
  - extends the workbench mock with cycle/spend progress;
  - proves the DearMe web shell renders those cards without surfacing hidden
    substrate language.
- `docs/dearme/BUILD-STATE.md`
  - records the implementation, verification, and next reuse step.
- `docs/dearme/POLSIA-NAIVE-REUSE-PLAN.md`
  - marks routine/cost progress projection as implemented for DM-118.
- `docs/dearme/INTEGRATED-ARCHITECTURE.md`
  - updates the architecture status so future slices do not re-open this as a
    missing basic visibility layer.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts`
  - passed: 2 files, 15 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx`
  - passed: 1 file, 25 tests.
- `pnpm -r typecheck`
  - passed.
- `pnpm build`
  - passed with existing Vite MarkdownEditor dynamic/static import warning and
    chunk-size warnings.
- `git diff --check`
  - passed.

## Next Reuse Step

Use the same projection rule for the richer weekly report/progress loop:
Paperclip/Naive remains the execution truth, Polsia defines the customer rhythm,
Lindy shapes the web card/knowledge interaction, and DearMe owns the language.
