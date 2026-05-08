# DM-001: DearMe Output Review And Regeneration Actions

Date: 2026-05-08

## Worker Brief

Implement the first bounded DearMe product-code ticket for output-level review and regeneration.

This ticket must make private DearMe outputs actionable inside `/dearme`: approve as useful, request changes, regenerate draft, and mark as not useful. Do not create a parallel review runtime. Reuse the existing DearMe output handoff, Paperclip issue/comment/update substrate, and approval-gated public action boundaries.

## Base And Worktree

The lead thread must choose the base ref before assignment. In the current
checkout state, this ticket is blocked by `DM-005A` until the DearMe source docs
and product spine are available from a recoverable baseline ref.

Do not work directly in `/Users/peter/dearme` while it is a mixed integration tree. Use an isolated disposable worktree after the base is chosen:

```bash
git worktree add /tmp/dearme-dm-001-output-review-regeneration <approved-base-ref>
cd /tmp/dearme-dm-001-output-review-regeneration
```

Stop immediately if the approved base is missing, dirty, or does not contain the DearMe source-of-truth docs listed below.

## Required Reading

Read these first, in this order:

1. `AGENTS.md`
2. `docs/dearme/README.md`
3. `docs/dearme/WORKTREE-INTEGRATION-PLAN.md`
4. `docs/dearme/BUILD-STATE.md`
5. `docs/dearme/INTEGRATED-ARCHITECTURE.md`
6. `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`

## Current Code Evidence

Relevant existing paths:

- `packages/shared/src/validators/dearme.ts`
  - Already defines `dearMeOutputReviewRequestSchema` and `dearMeOutputReviewResultSchema`.
  - `DEARME_OUTPUT_REVIEW_ACTIONS` currently includes `approve`, `request_changes`, and `regenerate`.
  - Add or otherwise account for the missing not-useful action required by this ticket.
- `server/src/services/dearme-output-handoff.ts`
  - Already lists DearMe outputs from issues, documents, work products, and latest issue comments.
  - Extend this service or add a closely adjacent service method only if needed.
- `server/src/routes/dearme.ts`
  - Currently exposes `GET /companies/:companyId/outputs`.
  - Add DearMe-owned review action endpoint here instead of sending users to raw issue or approval routes.
- `ui/src/api/dearme.ts`
  - Currently exposes `getOutputs`.
  - Add a typed output review/regeneration client call.
- `ui/src/pages/DearMeOnboarding.tsx`
  - `FocusedOutputPanel` currently displays focused output details but has no review action loop.
  - Output cards currently use `Review` / `Open`; keep review inside `/dearme`.

Focused existing tests:

- `packages/shared/src/validators/dearme.test.ts`
- `server/src/__tests__/dearme-output-handoff.test.ts`
- `ui/src/api/dearme.test.ts`
- `ui/src/pages/DearMeOnboarding.test.tsx`

## Expected Implementation Shape

Shared contract:

- Represent four user actions:
  - approve as useful
  - request changes
  - regenerate draft
  - mark as not useful
- Keep the request shape small: action plus optional decision note.
- Validate result payloads through existing DearMe schemas.

Server:

- Add a DearMe route under `/api/dearme/companies/:companyId/outputs/...`.
- Enforce existing company access checks.
- Record user notes as output review context through existing issue/comment/update mechanics.
- If regeneration is queued, return a queued-style result and avoid pretending new draft content already exists.
- Do not expose raw issue id, document id, work product id, provider, adapter, model, or approval route terminology in customer-facing response text.

UI/API:

- Add actions to the focused output panel and output review flow.
- Keep the interaction inside `/dearme`.
- Show product-native labels:
  - Useful
  - Needs changes
  - Regenerate
  - Not useful
- Include an optional note field for request changes, regeneration, and not useful.
- Invalidate/refetch DearMe output queries after action completion.
- Do not navigate to `/issues/*` or `/approvals/*` for this loop.

## Protected Scope

Do not:

- Rewrite the DearMe onboarding shell.
- Rework Team Work Stream, Voice and Memory, Brand OS, paid-beta access, or approval panels except where directly necessary.
- Rename route paths or product concepts outside this ticket.
- Introduce new dependencies.
- Import Lindy code wholesale.
- Change public approval behavior for publish/send/deploy/spend moves.

## Donor Grounding

Use donor products only as patterns:

- Polsia: fast visible output loop and review rhythm.
- Lindy: ActionCard-like action controls, note capture, and action-needed interaction.
- Paperclip substrate: issues, comments, documents, work products, and approvals.

Rejected for this ticket:

- A new workflow editor.
- A second output-review runtime.
- Exposing the underlying issue/document/work-product model directly to the customer.

## Acceptance Criteria

- Focused output panels expose approve/useful, request changes, regenerate, and not-useful actions inside `/dearme`.
- User notes feed future regeneration or review context through existing DearMe/Paperclip services.
- Public/send/deploy/spend moves remain approval-gated and separate from private output review.
- Customer-facing labels say post, report, proof card, opportunity, portfolio update, or draft.
- Customer-facing labels do not say raw issue, document id, work product id, adapter, provider, model, or approval route.
- Tests prove raw `/issues/*` and `/approvals/*` navigation is not needed for output review.

## Verification Commands

Run focused checks first:

```bash
pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run
pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run
pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run
```

If the implementation touches shared/server/UI typing broadly, also run:

```bash
pnpm -r typecheck
```

Before final handoff, run a forbidden-copy scan across touched DearMe surfaces:

```bash
rg -n "/issues/|/approvals/|document id|work product id|adapter|provider|model" packages/shared/src/validators/dearme.ts server/src/routes/dearme.ts server/src/services/dearme-output-handoff.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/api/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts
```

Any expected internal-only matches must be named and justified in the worker handoff.

## Stop Rules

Stop and report if:

- The selected base already contains a complete output review/regeneration implementation.
- The ticket requires broad rewrites outside the approved scope.
- The action model cannot support not useful without changing shared contracts beyond this slice.
- Existing tests show unrelated failures before edits.
- The implementation would require exposing raw issue, approval, document, work product, adapter, provider, or model language to paid-beta users.

## Handoff Requirements

Return:

- Changed files.
- Donor paths used, adapted, and rejected.
- Verification commands and exact pass/fail result.
- Any raw-copy scan matches with explanation.
- Remaining risks.
- PR notes matching `.github/PULL_REQUEST_TEMPLATE.md`.
