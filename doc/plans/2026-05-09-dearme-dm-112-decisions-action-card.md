# DM-112 Decisions Needed Action Card Reuse

Date: 2026-05-09
Branch: `codex/dearme-dm-112-decisions-action-card`
Status: Implemented
Type: UI primitive reuse

## Objective

Reuse the DearMe-owned `DearMeActionCard` primitive from DM-111 for the
Decisions Needed surface. This keeps the action-needed experience consistent
before adding new paused, retry, or regenerate states.

## Donor Reuse Decisions

- Polsia: preserve the visible decision ceremony. The user sees the few
  high-leverage calls their team needs, not a task-management list.
- Naive/Paperclip: continue routing through the existing approval, issue, and
  batch decision projections. No new schema, queue, or runtime was added.
- Lindy: adapt the card grammar: status badges, compact chips, clear evidence,
  and one primary action. Do not copy donor app shell, GraphQL/Relay assumptions,
  workflow-builder concepts, or donor copy.

## Implementation

- Replaced Decisions Needed batch cards with `DearMeActionCard`.
- Replaced individual decision cards with `DearMeActionCard`.
- Preserved the existing evidence grid content, update footer, approval route,
  and batch route behavior.
- Added an onboarding test assertion that the Decisions Needed section renders
  action-card surfaces.

## Acceptance Criteria

- The "Approve" decision action still opens the DearMe approval focus route.
- The "Review posts" batch action still opens the DearMe decision route.
- Decisions Needed cards expose the shared action-card DOM surface.
- No customer-facing substrate language is introduced.

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

Reuse `DearMeActionCard` for Work Ready cards next, then add paused/retry
variants only after the shared card spine covers the main review surfaces.
