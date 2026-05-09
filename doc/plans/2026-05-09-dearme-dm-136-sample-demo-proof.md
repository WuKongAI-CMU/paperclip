# DM-136 - First-Run Sample Demo Proof

Date: 2026-05-09
Status: implemented and verified

## Objective

Make the DearMe first-run surface prove the personal brand team package before a
visitor enters their own positioning answer.

The user should not land on an empty form or an abstract dashboard. They should
immediately see the kind of private work the team prepares: voice profile,
starter posts, one opportunity lead, one portfolio proof card, one first growth
plan, and the launch boundary that lets the team move hard without making the
first screen feel like a risk memo.

## Reuse Decision

- Reuse the existing shared first-cycle preview generator.
- Reuse the existing first-cycle result cards and approval-boundary rendering.
- Do not add a demo backend route, a second fixture contract, or a parallel
  runtime.
- Keep donor names and raw runtime terms out of the customer-facing UI.

## Implementation

- Add a private sample preview built from the shared first-cycle contract.
- Render the sample package before the user enters positioning.
- Refactor generated and sample previews through the same proof-package
  component.
- Replace the sample package after the user starts their own first cycle.
- Add focused component coverage for sample visibility and preview replacement.
- Recalibrate the first-run copy so the user feels autonomous private progress
  first, with launch boundaries only for public/outbound/spend/page changes.

## Verification Plan

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx` passed.
- `git diff --check` passed.
- Desktop and mobile Playwright checks on `http://127.0.0.1:3100/DEAA/dearme` passed.

## Stop Rules

- Stop if the sample proof leaks donor/runtime terms.
- Stop if the sample calls the preview API before user input.
- Stop if generated first-cycle preview no longer replaces the sample.
- Stop if the browser surface overflows horizontally on mobile.
