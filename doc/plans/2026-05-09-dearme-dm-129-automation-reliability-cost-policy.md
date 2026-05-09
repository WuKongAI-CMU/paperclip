# DearMe DM-129 Automation Reliability And Cost Policy

Date: 2026-05-09
Status: implemented

## Why

DearMe is moving toward longer private cycles. Before adding more autonomous
jobs, the product needs a clear policy for when the team can keep working,
when it must ask, when it must stop, and how spend is shown without exposing
the substrate.

## Donor Evidence

- Polsia source dive: task/subscription cost attribution, async 202 execution,
  and repeated business-build cycles.
- Naive/Paperclip research: pre-invocation budget blocks, cost event ledger,
  durable work/run/document review state, and CEO/worker split.
- Lindy internal tool: rule-based model routing, max-turn budgets, consecutive
  failure breaker, and recovery learning.

## Implementation Slice

- Add `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md` as the DM-129 policy.
- Add a DearMe workbench "Team operating policy" panel that derives policy
  state from existing workbench and paid-beta data.
- Keep backend contracts unchanged for this slice.
- Update the reuse ledger and build state so the next queue item starts from
  this policy instead of reopening earlier donor-comparison work.

## Acceptance

- Product rules define can-run, must-ask, stop-trying, and spend-display cases.
- Customer UI shows the policy in DearMe language.
- No raw donor/runtime/vendor terms are introduced to customer-facing UI.
- Focused onboarding tests cover the new policy surface.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm -r typecheck`
- `pnpm build`
- `git diff --check`
- Customer-surface hidden-term scan over touched DearMe UI/shared paths.
