# DM-111 DearMe Action Card Primitive

Date: 2026-05-09
Branch: `codex/dearme-dm-111-action-card-primitive`
Status: Implemented
Type: UI primitive extraction

## Objective

Create the first reusable DearMe-owned action-card primitive and replace one
inline live-feed rendering path inside `DearMeOnboarding`. This is the smallest
safe code slice after the DM-110 Polsia/Naive/Lindy reuse spine.

## Donor Reuse Decisions

- Polsia: preserve the visible product choreography. The user sees a team
  moving through a growth cycle and can open the right decision directly from
  the feed.
- Naive/Paperclip: keep the existing execution truth. The component consumes
  projected work-stream fields, approval ids, issue references, output ids, and
  review-loop state. No new runtime, table, queue, or workflow editor was added.
- Lindy: adapt the interaction grammar only. DearMe reuses the action-card idea
  of status badges, compact context chips, next-action copy, and a primary
  action zone without importing Lindy code, app shell, GraphQL assumptions, or
  donor vocabulary.

## Implementation

- Added `ui/src/components/dearme/DearMeActionCard.tsx`.
- Added focused component coverage in
  `ui/src/components/dearme/DearMeActionCard.test.tsx`.
- Replaced the live team feed card body in
  `ui/src/pages/DearMeOnboarding.tsx` with the new primitive.
- Added an onboarding test assertion that the live feed now renders
  `data-dearme-surface="action-card"` cards.
- Updated DearMe architecture/reuse docs so the remaining gap is precise:
  Work Ready, Decisions Needed, private output, paused, retry, and Voice &
  Memory cards still need the shared primitive.

## Acceptance Criteria

- Live-feed approval items still open the DearMe approval decision surface.
- Live-feed prepared-output items still open the DearMe prepared-work review
  surface.
- The customer-facing UI path still avoids Paperclip/OpenClaw/provider/setup
  payload language.
- The new card remains presentational and does not add a new data contract.

## Verification

Passed on 2026-05-09:

```sh
pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx
pnpm -r typecheck
git diff --check
rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx
```

Results:

- Vitest passed: 2 files, 24 tests.
- Workspace typecheck passed.
- `git diff --check` passed.
- The customer-path substrate-language scan returned no matches.

## Next Slice

Reuse `DearMeActionCard` for one of the remaining inline review surfaces, most
likely Work Ready or Decisions Needed, before adding retry/regenerate in-flight
states.
