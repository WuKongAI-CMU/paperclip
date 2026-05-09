# DearMe DM-107 Review Feedback Handoff

Date: 2026-05-09
Branch: `codex/dearme-dm-107-review-feedback-handoff`

## Objective

Make review feedback reusable by the next DearMe work loop instead of treating
it as a one-off button click.

## Donor Reuse

- Polsia: keep the work loop visible after the user makes a decision. The user
  should see that their note became part of the next cycle, not just that a
  button was clicked.
- Naive / Paperclip: reuse existing issue comments, issue status updates, work
  products, and output projection. Do not add a DearMe-only queue, runtime, or
  table for this slice.
- Lindy: reuse the action-card pattern: the system shows the captured user
  instruction, what it means, and the next private action.

## Implementation

- Extend `DearMeOutputReviewLoop` with nullable `reviewHandoff`.
- Build the handoff from the latest DearMe review decision comment.
- Hide handoff after approval, preserve it for request-changes, regenerate, not
  useful, and retry-limit states.
- Render a customer-safe Private handoff card in focused work and Work Ready
  surfaces.
- Add the missing Not useful decision button to the focused output panel.

## Verification Target

- Shared contract test covers the handoff shape.
- Server test proves a request-changes decision becomes a private handoff using
  existing issue comments.
- UI test proves the handoff renders without leaking substrate routes or names.
- Targeted tests, typecheck, and `git diff --check` pass before merge.
