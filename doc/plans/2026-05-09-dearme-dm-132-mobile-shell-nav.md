# DearMe DM-132 Mobile Shell Navigation Polish

Date: 2026-05-09
Status: implemented

## Why

DM-131 proved the first-screen DearMe workbench in desktop and mobile browser
contexts, but the mobile shell still needed a DearMe-owned navigation fold.
The product should feel like a personal brand team on a phone, not a generic
workspace app with inherited bottom navigation.

## Donor Evidence

- Polsia: keep the first-wow hierarchy visible and route users toward the few
  high-leverage decisions instead of exposing operations chrome.
- Naive/Paperclip: keep the existing layout/runtime substrate, but hide generic
  workspace navigation on the DearMe customer path.
- Lindy: use a compact app-navigation rhythm that gets users back to current
  work, decisions, and voice review quickly.
- Littlebird: preserve mobile ergonomics with short labels, stable tap targets,
  safe-area padding, and no first-viewport navigation collision.

## Implementation Slice

- Added a DearMe-specific mobile bottom navigation with Home, Decisions, Work
  Ready, Voice, and More.
- Wired the More action to open the existing DearMe sidebar drawer so secondary
  surfaces remain available without crowding the bottom bar.
- Kept the generic mobile bottom navigation disabled for DearMe routes.
- Kept backend routes, database tables, runtime services, route contracts, and
  dependencies unchanged.

## Acceptance

- DearMe mobile routes show customer-facing product navigation.
- Generic workspace mobile navigation does not render on the DearMe route.
- The mobile bottom bar does not expose donor/runtime language.
- The existing mobile content bottom padding still reserves room for the bottom
  navigation.
- Desktop DearMe layout remains unchanged.

## Verification

- `pnpm exec vitest run ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx --maxWorkers=1`
- `pnpm -r typecheck`
- `git diff --check`
- Customer-surface hidden-term scan over touched DearMe shell files.
- Browser plugin mobile `390x844` on `/dearme`: title
  `Team · DearMe · DearMe`, redirected URL `/DEAA/dearme`, DearMe mobile nav
  count `1`, generic nav count `0`, console error/warn logs empty, More opens
  the full DearMe menu.
- Browser plugin desktop `1280x720` on `/dearme`: mobile nav count `0`,
  generic nav count `0`, console error/warn logs empty.
