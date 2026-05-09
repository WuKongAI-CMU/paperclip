# DM-134: Brand Team Run Ledger

Date: 2026-05-09
Branch: `codex/dearme-dm-134-brand-team-run-ledger`

## Goal

Turn the existing DearMe workbench projection into a customer-safe run ledger:
what the brand team tried, prepared, learned, and needs from the user.

This is a reuse-first product slice, not a new runtime slice.

## Donor Grounding

- Polsia: visible team motion, live progress, cycle/report rhythm, and the
  "work happened while I was away" trust loop.
- Naive/Paperclip: existing workbench stream and memory projections as the
  hidden source of truth.
- Lindy: action-card grammar and review-first interaction surfaces.
- Littlebird: compact mobile-friendly shell discipline.

## Implementation Scope

- Add a typed `runLedger` entry schema to the shared DearMe workbench contract.
- Derive ledger entries in `server/src/services/dearme-workbench.ts` from the
  existing `workStream`, with latest Voice & Memory as a learned fallback when
  the stream does not already include one.
- Add a `BrandTeamRunLedgerPanel` to the DearMe customer workbench that consumes
  `workbench.runLedger` directly.
- Keep all entries customer-safe and product-language-first.
- Add focused shared, server, route, and UI test coverage for the ledger
  contract, derivation, transport, copy, ordering, and bucket markers.

## Protected Scope

- No new backend route.
- No new database table.
- No new runtime worker.
- No new donor dependency.
- No customer-facing donor/runtime terms.

## Acceptance

- The workbench shows a "Brand Team Run Ledger" panel.
- The ledger has Tried, Prepared, Learned, and Needs your call buckets.
- The panel is derived from existing workbench data only.
- Tests verify the customer-facing copy and bucket markers.
- Browser verification confirms mobile and desktop render without overflow,
  overlays, console errors, or hidden donor/runtime terms.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over the DearMe run-ledger files returned
  no matches.
- Browser-plugin check on `http://127.0.0.1:3100/dearme` passed with one
  ledger panel, one run-ledger grid, all four buckets, and 6 ledger entries.
- Playwright desktop `1440x1000` and mobile `390x844` passed on
  `/DEAA/dearme` with required ledger copy visible, no horizontal overflow, no
  framework overlay, no app console error/warn logs, and no customer-visible
  donor/runtime terms.
- Screenshot evidence: `/tmp/dearme-dm134-desktop-run-ledger.png` and
  `/tmp/dearme-dm134-mobile-run-ledger.png`.
