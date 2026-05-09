# DM-127: Voice & Memory Source Detail Drawer

Date: 2026-05-09

## Goal

Make pending Voice & Memory source review feel like a focused source-management
surface instead of a broad panel jump, while keeping the existing DearMe memory
contract and Paperclip-backed substrate unchanged.

## Work Completed

- Added a selected source detail surface to `ui/src/pages/DearMeOnboarding.tsx`.
- Reused the existing `sourceReviewQueue`, Voice & Memory form, memory update
  mutation, and source archive mutation.
- Preserved DM-125 behavior: `Review source` still focuses the exact pending
  source card and pre-fills the proposed fact.
- Extended the UI test suite so the detail surface is visible, can submit the
  reviewed fact, and can dismiss the source through the existing retire path.
- Updated `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` and
  `docs/dearme/BUILD-STATE.md`.

## Donor Evidence Used

- Lindy `KnowledgeBaseEditor.tsx`: source list plus configure/edit behavior.
- Lindy `ResizableSlideOutPanel.tsx`: focused right-side detail shape.
- Current DearMe `sourceReviewQueue`: source review cards and proposed fact
  fields.
- Existing DearMe memory routes: reviewed facts remain normal Voice & Memory
  updates and not-useful sources use the existing retire path.

## Rejected

- No new backend route, database table, crawler, importer, or alternate memory
  runtime.
- No Lindy Relay/GraphQL shell, brand copy, or broad app routing import.
- No whole-page source review route while the current workbench surface can
  handle the interaction safely.

## Verification

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 31 tests.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed with the existing Vite dynamic/static import and chunk
  size warnings only.
- `git diff --check` passed.
- Customer-surface hidden-term scan over DearMe onboarding UI/shared paths
  found no substrate terms.

## Next

DM-128 should apply the same focused review pattern to Work Ready and Decisions
Needed so review, request changes, regenerate, and not-useful actions are
available from the prepared item.
