# DM-128 Focused Decision Review Drawer

Date: 2026-05-09

## Ticket

DM-128: Focused Decision Review Drawer.

## Goal

Make Work Ready and Decisions Needed feel like polished DearMe review work
rather than a broad dashboard jump. The user should be able to approve prepared
work, request changes, ask for another pass, or choose a new direction from the
focused DearMe decision surface.

## Base Branch / Worktree

- Repo: `/Users/peter/dearme`
- Branch: `codex/dearme-dm-128-focused-decision-drawer`

## Required Docs

- `docs/dearme/README.md`
- `docs/dearme/INTEGRATED-ARCHITECTURE.md`
- `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/POLSIA-NAIVE-REUSE-PLAN.md`
- `docs/dearme/LINDY-ASSISTANT-REUSE-PLAN.md`

## Donor Paths

- Polsia:
  `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
- Polsia:
  `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`
- Naive/Paperclip:
  `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`
- Naive/Paperclip:
  `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`
- Lindy:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`
- Lindy:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`
- Lindy:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`

## Reuse Decision

- Polsia is the customer-visible choreography donor: a small number of obvious,
  high-leverage calls replaces an operator dashboard.
- Naive/Paperclip is the hidden substrate donor: DearMe should reuse existing
  output ids, review loop state, continuation intents, and approval boundaries.
- Lindy is the interaction donor: focused action cards, pending review controls,
  and detail-panel behavior are adapted into DearMe-native UI without importing
  Lindy routing, Relay/GraphQL, or brand language.

## Write Scope

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `ui/src/components/DearMeShell.tsx`
- `ui/src/components/dearme/DearMeActionCard.tsx`
- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
- `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`

## Protected Scope

- No new backend route, database table, drawer API, runtime, or worker.
- No raw issue, approval, donor, provider, adapter, setup-payload, or
  control-plane language in the paid-beta DearMe surface.
- No Lindy Relay/GraphQL shell, Lindy brand language, or full UI transplant.

## Acceptance

- Focused Work Ready items expose approve, request changes, prepare another
  pass, and choose new direction actions.
- Focused batch prepared work exposes the same actions when its batch decision
  carries an output decision id.
- Focused Work Ready, Private Work, and Decisions Needed cards remain visually
  linked to the selected prepared work or batch decision.
- Approval boundaries remain clear before anything public, external, spendful,
  or representative of the user ships.

## Implementation Result

- Added `FocusedPreparedWorkReviewControls` to reuse the existing DearMe output
  review path from the focused decision surface.
- Added batch output-id resolution for batch decisions that carry
  `output:<id>` decision ids.
- Added focused card support to the DearMe shell and action card components.
- Added focused UI tests for Work Ready prepared work, explicit output drawer
  routing, batch prepared work, approval focus, and private-work focus.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm -r typecheck`
- `pnpm build`
- `git diff --check`
- Customer-surface hidden-term scan over touched DearMe UI/shared paths

## Next

DM-129 should adapt Lindy router/executor and Naive/Paperclip cost rails into a
DearMe automation reliability and cost policy before more autonomous jobs are
added.
