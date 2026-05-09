# DM-100: DearMe Cycle Guardrails

Date: 2026-05-09
Branch: `codex/dearme-dm-100-cycle-guardrails`
Base: `50584914`

## Purpose

Reuse the existing Paperclip/Naive finance, cost, and budget substrate as a
DearMe customer-safe cycle guardrail.

This keeps the product promise high-automation by default while making paid beta
usage predictable before private cycles run.

## Reuse Decisions

- Reused existing paid-beta finance events instead of creating a second DearMe
  billing ledger.
- Reused `costService.summary(companyId, currentMonthWindow)` instead of
  creating a DearMe-specific cost query.
- Reused the existing Brand OS approval gate as the first hard-stop enforcement
  point when current-month private spend exhausts credit or reaches the monthly
  guardrail.
- Reused the existing Paid beta panel in the DearMe web surface instead of
  adding a separate billing console.

## Product Behavior

The user sees `Cycle guardrail`, not model cost plumbing.

The surface explains:

- whether private cycles can run,
- whether spend is close to the guardrail,
- whether more spend is paused for review,
- remaining paid beta credit,
- current-month private spend,
- monthly guardrail.

## Files Changed

- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/validators/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/validators/dearme.test.ts`
- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/routes/dearme.ts`
- `server/src/__tests__/dearme-paid-beta-access.test.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`

## Verification

- `pnpm exec vitest server/src/__tests__/dearme-paid-beta-access.test.ts packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  - Passed: 3 files, 64 tests.
- `pnpm --filter @paperclipai/shared typecheck`
  - Passed.
- `pnpm --filter @paperclipai/server typecheck`
  - Passed.
- `pnpm --filter @paperclipai/ui typecheck`
  - Passed.

## Remaining Gaps

- This slice adds the first hard-stop enforcement at Brand OS approval request
  time. Future private cycle execution endpoints should call the same guardrail
  before spending.
- The UI still records paid-beta payments manually. Stripe or another paid-access
  provider can be connected later without changing the customer-facing guardrail
  language.
