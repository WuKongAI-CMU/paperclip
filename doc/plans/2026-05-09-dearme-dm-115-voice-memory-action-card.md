# DM-115 Voice & Memory Action Card Reuse

Date: 2026-05-09
Branch: `codex/dearme-dm-115-voice-memory-action-card`
Status: Implemented
Type: UI primitive reuse

## Objective

Reuse the DearMe-owned `DearMeActionCard` primitive for Voice & Memory source
cards. Saved source material should read as part of the same customer-facing
team cockpit as Live Team Feed, Decisions Needed, Work Ready, and Private Work,
without introducing new source actions in this slice.

## Donor Reuse Decisions

- Polsia: preserve visible accumulated work. The user should see memory and
  proof becoming useful team context, not raw storage records.
- Naive/Paperclip: continue using the existing Voice & Memory projection,
  source kind labels, source labels, just-saved state, and created-at
  timestamps. No new schema, route, mutation, or runtime path was added.
- Lindy: adapt the source/action card grammar: compact chips, semantic source
  type, body preview, and stable card surface. Do not copy donor app shell,
  GraphQL/Relay assumptions, workflow-builder concepts, or donor copy.

## Implementation

- Replaced latest Voice & Memory source cards with `DearMeActionCard`.
- Preserved source kind, title, body preview, just-saved chip, source-label
  chip, and created date.
- Kept the cards display-only. This slice does not add edit, archive, open,
  route, or mutation behavior.
- Added an onboarding test assertion that the Voice & Memory section renders
  action-card surfaces while keeping existing source-content assertions intact.

## Acceptance Criteria

- Voice & Memory source cards expose the shared action-card DOM surface.
- Existing source content remains visible.
- No new source-card click or mutation behavior is introduced.
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

Add paused/retry variants to `DearMeActionCard` before creating new review-card
primitives.
