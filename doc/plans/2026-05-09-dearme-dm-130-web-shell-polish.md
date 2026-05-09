# DearMe DM-130 Web Shell Polish From Lindy And Littlebird

Date: 2026-05-09
Status: implemented

## Why

DearMe's customer path already has the right Work Ready, Decisions Needed,
Voice & Memory, policy, and report mechanics. The first screen still needed to
feel more like a personal brand growth team and less like a control-plane
summary.

## Donor Evidence

- Polsia: visible team momentum, "work happened while I was away" packaging,
  and a small number of high-leverage user decisions.
- Naive/Paperclip: existing workbench projection for live work, decisions,
  reports, memory, and team state.
- Lindy: two-rail home dashboard composition and compact assistant status
  cards.
- Littlebird: focused onboarding/task-row anatomy that makes one current step
  clear without turning the product into a settings dashboard.

## Implementation Slice

- Add a DearMe-owned first-screen focus panel above the current team summary.
- Derive the panel from the existing workbench response only.
- Keep all donor/runtime vocabulary out of the customer-facing UI.
- Update the reuse ledger and build state so the next worker starts from the
  integrated shell rather than reopening the UI-source comparison.

## Acceptance

- First screen leads with team motion and prepared decisions.
- No new backend route, table, runtime, or external dependency is introduced.
- Focused UI tests cover the new hierarchy and customer-safe copy.
- Broader verification passes before merge.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm -r typecheck`
- `pnpm build`
- `git diff --check`
- Customer-surface hidden-term scan over touched DearMe UI paths.
