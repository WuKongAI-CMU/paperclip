# DM-135: First-Run Sample Team Proof

Date: 2026-05-09
Branch: `codex/dearme-dm-135-first-run-sample-team-proof`

## Goal

Make the first DearMe run prove the team shape before a customer connects real
channels or trusts deeper automation.

The first-run package should show one positioning answer turning into a Voice
Profile, three starter posts, one opportunity lead, one portfolio proof card,
and one first growth plan, with the approval boundary visible in the same
result.

## Donor Grounding

- Polsia: visible team choreography and the feeling that multiple lanes are
  already moving.
- Naive/Paperclip: existing Brand OS preview, memory, route, and validation
  contracts stay hidden as the substrate.
- Lindy: review-before-action grammar; the user sees what is ready and what is
  held for a decision.
- Littlebird: compact first-run ergonomics that fit the web shell without a
  setup wizard.

## Implementation Scope

- Reuse the existing `previewFirstCycle` contract and route.
- Surface the generated first-run package in the DearMe onboarding/workbench
  page.
- Render the approval boundary from the response next to the generated package
  so the customer sees what cannot happen without approval.
- Keep donor names, provider IDs, local runtime terms, and raw orchestration
  language out of customer-facing copy.

## Protected Scope

- No new backend table.
- No new runtime worker.
- No new external dependency.
- No public publish/send/deploy/spend action.
- No customer-facing donor/runtime terms.

## Acceptance

- A single positioning answer can request a first-cycle preview.
- The preview renders the Voice Profile, three starter posts, opportunity lead,
  portfolio proof card, and first growth plan.
- The same result renders the approval boundary and blocked public actions.
- Focused UI coverage verifies the customer-visible package and boundary.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser-plugin check on `http://127.0.0.1:3100/DEAA/dearme` exercised the
  first-cycle preview and showed the generated package plus approval boundary.
- Playwright desktop `1440x1000` and mobile `390x844` passed on
  `/DEAA/dearme`: all first-run package sections and approval-boundary actions
  visible, no horizontal overflow, no framework overlay, no relevant console
  error/warn logs, and no customer-visible donor/runtime terms.
- Screenshot evidence:
  `/tmp/dearme-dm135-desktop-first-run-proof.png` and
  `/tmp/dearme-dm135-mobile-first-run-proof.png`.

## Handoff

DM-135 proves the first generated package after one positioning answer. The
next useful product slice is a polished sample/demo proof path that shows the
same team package before a visitor commits personal input or connects channels.
