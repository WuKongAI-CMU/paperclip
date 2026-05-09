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
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx --maxWorkers=1`
  passed: 3 files, 48 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser/Playwright mobile `390x844` and desktop `1440x1000` on a live focused
  approval decision passed with focused-surface bottom padding, an
  `approval-review` action group, phone-first button classes, no horizontal
  overflow, no framework overlay, no customer-visible donor/runtime terms, and
  empty console error/warn logs; screenshots:
  `/tmp/dearme-dm133-mobile-approval-review.png` and
  `/tmp/dearme-dm133-desktop-approval-review.png`.
- Prepared-work focused controls are covered by component tests. The current
  local runtime dataset has no `workReady` outputs, so the browser pass could
  not honestly exercise a live `prepared-work-review` detail without mutating
  seed data.
