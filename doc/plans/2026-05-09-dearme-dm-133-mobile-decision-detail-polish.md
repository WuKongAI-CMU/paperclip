# DearMe DM-133 Mobile Decision Detail Polish

Date: 2026-05-09
Status: implemented

## Why

DM-132 made the DearMe mobile navigation product-owned. The next phone risk was
inside focused decision/detail states: approval and prepared-work actions could
wrap like desktop controls and sit too close to the bottom navigation.

## Donor Evidence

- Polsia: keep the user close to the few high-leverage calls instead of making
  them manage a broad work queue.
- Naive/Paperclip: keep the existing approval and output-review substrate; do
  not add a second DearMe runtime or review API.
- Lindy: keep review actions inside the focused detail surface.
- Littlebird: use full-width phone actions, stable spacing, and compact desktop
  recovery.

## Implementation Slice

- Added a focused decision surface class with mobile bottom padding.
- Added mobile action-group markers for approval review and prepared-work
  review controls.
- Made focused decision buttons full width on phone and compact on larger
  screens.
- Kept review actions, continuation intents, approval APIs, routing, and
  desktop behavior unchanged.

## Acceptance

- Focused decisions reserve enough mobile bottom space for the bottom nav.
- Prepared-work review and approval-review action groups render as stable
  phone stacks.
- Primary review buttons remain compact on desktop.
- No customer-facing donor/runtime terms appear in the DearMe paid-beta path.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Playwright mobile `390x844` on `/dearme?view=decisions` passed with no
  horizontal overflow, no framework overlay, and empty console error/warn
  logs; screenshot: `/tmp/dearme-dm133-mobile-decisions-after.png`.
- Playwright mobile `390x844` on a live focused approval decision passed with
  focused-surface bottom padding, an `approval-review` mobile action group,
  full-width phone buttons, no horizontal overflow, no framework overlay, and
  empty console error/warn logs; screenshot:
  `/tmp/dearme-dm133-mobile-review-now-after.png`.
