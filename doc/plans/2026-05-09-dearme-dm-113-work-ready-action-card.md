# DM-113 Work Ready Action Card Reuse

Date: 2026-05-09
Branch: `codex/dearme-dm-113-work-ready-action-card`
Status: Implemented
Type: UI primitive reuse

## Objective

Reuse the DearMe-owned `DearMeActionCard` primitive from DM-111/DM-112 for the
Work Ready surface. This keeps prepared outputs, live feed actions, and decision
cards on the same customer-facing action grammar before adding paused or retry
states.

## Donor Reuse Decisions

- Polsia: preserve the product ceremony. The user sees finished work from the
  team and a clear next decision, not an internal work queue.
- Naive/Paperclip: continue routing through existing work item targets, issue
  references, output status, and review loop projections. No new schema, queue,
  or runtime was added.
- Lindy: adapt the card grammar: semantic status badges, compact action zone,
  stable children slot, and one primary action. Do not copy donor app shell,
  GraphQL/Relay assumptions, workflow-builder concepts, or donor copy.

## Implementation

- Replaced Work Ready cards with `DearMeActionCard`.
- Preserved existing prepared-by, why-it-matters, next-step, and review handoff
  evidence.
- Preserved `workItemTarget(item)`, `onOpenWorkItem(item)`, disabled guards, and
  action labels.
- Added an onboarding test assertion that the Work Ready section renders
  action-card surfaces.

## Acceptance Criteria

- The prepared-work action still opens the existing DearMe work item route.
- Work Ready cards expose the shared action-card DOM surface.
- Output status, review loop state, output kind, evidence, and handoff text are
  preserved.
- No customer-facing substrate language is introduced.

## Verification

Run before hand-off:

```sh
pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx
pnpm -r typecheck
pnpm build
git diff --check
rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx
```

Result:

- Targeted Vitest passed: 2 files, 24 tests.
- Typecheck passed.
- Build passed with the existing Vite chunk-size/dynamic-import warnings.
- `git diff --check` passed.
- Customer-path substrate-language scan returned no matches.

## Next Slice

Reuse `DearMeActionCard` for private output cards or Voice & Memory source cards
next, then add paused/retry variants after the main review surfaces share one
primitive.
