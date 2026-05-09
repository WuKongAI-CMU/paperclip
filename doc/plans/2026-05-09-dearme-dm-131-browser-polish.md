# DearMe DM-131 Browser Polish For The Team Workbench

Date: 2026-05-09
Status: implemented

## Why

DM-130 made the first-screen DearMe workbench read like a personal brand team,
but it still needed live rendered proof. The goal of this slice was to verify
the new hierarchy in desktop and mobile browser contexts, then fix any visible
layout issue without widening the product contract.

## Donor Evidence

- Lindy: compact home/workbench cards should carry dense status without
  creating empty framed containers.
- Littlebird: mobile product shells need readable first-view hierarchy and no
  horizontal overflow.
- Polsia: visible momentum should make "work happened while I was away" clear
  in the first viewport.
- Naive/Paperclip: the existing workbench projection remains the hidden data
  substrate.

## Implementation Slice

- Attempt the Browser-plugin path first.
- Fall back to repo Playwright if the in-app browser backend is unavailable.
- Verify page identity, meaningful content, framework overlays, console health,
  desktop/mobile screenshots, and one navigation interaction.
- Fix only the layout issue proven by browser evidence.

## Acceptance

- Desktop and mobile browser checks pass on the live local DearMe app.
- The first-screen focus panel has no stretched empty work card.
- No new backend route, schema, runtime service, dependency, donor component,
  or donor product language is added.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- Playwright desktop `1440x1000` on `/dearme`
- Playwright mobile `390x844` on `/dearme`
- Playwright interaction: sidebar `Decisions` link to
  `/DEAA/dearme?view=decisions`
- Screenshot evidence in `/tmp/dearme-dm131-*.png`
