# DM-114 Private Work Action Card Reuse

Date: 2026-05-09
Branch: `codex/dearme-dm-114-private-work-action-card`
Status: Implemented
Type: UI primitive reuse

## Objective

Reuse the DearMe-owned `DearMeActionCard` primitive for the Private Work output
surface. This keeps generated private reports, drafts, voice guidance,
opportunity work, and portfolio work on the same customer-facing action grammar
as Live Team Feed, Decisions Needed, and Work Ready.

## Donor Reuse Decisions

- Polsia: preserve the visible team-output ceremony. The user sees work that is
  ready for a decision, not raw implementation tasks.
- Naive/Paperclip: continue routing through the existing output focus path,
  issue references, output status, review loop projection, private references,
  and output details. No new schema, queue, or runtime was added.
- Lindy: adapt the card grammar: semantic status badges, compact action zone,
  stable children slot, and one primary action. Do not copy donor app shell,
  GraphQL/Relay assumptions, workflow-builder concepts, or donor copy.

## Implementation

- Replaced Private Work output cards with `DearMeActionCard`.
- Preserved preview text, next-step copy, details, footer private-reference
  count, and existing `onOpenOutput(output)` behavior.
- Added output kind as a status badge so the shared card still communicates the
  prepared surface type.
- Added an onboarding test assertion that the Private Work section renders
  action-card surfaces while keeping the existing navigation assertion intact.

## Acceptance Criteria

- The private-work review action still opens the existing DearMe decision route.
- Private Work cards expose the shared action-card DOM surface.
- Output status, review loop state, output kind, preview, next step, details,
  and private references are preserved.
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

Reuse `DearMeActionCard` for Voice & Memory source cards next, then add
paused/retry variants after the main review surfaces share one primitive.
