# DM-005A: DearMe Integration Baseline And Product Spine

Date: 2026-05-08

## Worker Brief

Create the recoverable DearMe baseline required before product implementation
workers start. The goal is not to clean up the whole repository. The goal is to
identify and preserve the minimum DearMe source-of-truth docs and product spine
that future isolated worktrees can safely build on.

## Starting Evidence

The active checkout is `/Users/peter/dearme` on branch `dearme`.

Observed state:

- The tree has broad inherited Paperclip edits plus DearMe-specific untracked
  files.
- `git ls-files` does not yet list the new DearMe product spine paths checked
  for this ticket.
- The two initial continuous-development plan files are untracked.
- The most recent commits are:
  - `b124fc8f Import DearMe architecture / product spec docs (19 files)`
  - `00463e06 DearMe fork baseline (paperclipai/paperclip @ d6d7a7ce)`

This means a clean worktree from `HEAD` is not enough for implementation tickets
that depend on the current DearMe UI/server/shared spine.

## Required Reading

Read these first, in this order:

1. `AGENTS.md`
2. `docs/dearme/README.md`
3. `docs/dearme/INTEGRATED-ARCHITECTURE.md`
4. `docs/dearme/WORKTREE-INTEGRATION-PLAN.md`
5. `docs/dearme/POLSIA-NAIVE-REUSE-PLAN.md`
6. `docs/dearme/LINDY-ASSISTANT-REUSE-PLAN.md`
7. `docs/dearme/REBRAND-AND-PROVENANCE.md`
8. `docs/dearme/BUILD-STATE.md`
9. `doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md`

## Donor Grounding

This ticket does not implement donor-derived features. It preserves the baseline
that allows donor-derived implementation tickets to be safe.

Still record the donor split in the handoff:

- Naive/Paperclip: hidden substrate and execution kernel.
- Polsia: product rhythm, onboarding speed, reporting ceremony, visible team
  loop.
- Lindy: action-card, transcript/work-stream, knowledge-base, and constrained
  workflow interaction patterns.
- DearMe: customer-facing brand, voice, opportunity, proof, portfolio, reports,
  and safety semantics.

## Write Scope

Allowed:

- `doc/plans/2026-05-08-dearme-*.md`
- DearMe source-of-truth docs under `docs/dearme/`
- DearMe product spine files that are already present in the dirty integration
  tree and are required by `DM-001` through `DM-003`, including focused tests.

Expected spine candidates:

- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/validators/dearme.test.ts`
- `server/src/routes/dearme.ts`
- `server/src/services/dearme-brand-blueprints.ts`
- `server/src/services/dearme-brand-blueprint-apply.ts`
- `server/src/services/dearme-output-handoff.ts`
- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/services/dearme-workbench.ts`
- `server/src/__tests__/dearme-*.test.ts`
- `ui/src/api/dearme.ts`
- `ui/src/api/dearme.test.ts`
- `ui/src/components/DearMeSidebar.tsx`
- `ui/src/components/DearMeSidebar.test.tsx`
- `ui/src/lib/dearme-brand-blueprint.ts`
- `ui/src/lib/dearme-brand-blueprint.test.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`

Only include additional paths if they are necessary to make the DearMe spine
compile or route correctly. Name each extra path in the handoff.

## Protected Scope

Do not:

- Broad-revert, bulk-clean, or reformat the mixed checkout.
- Stage unrelated Paperclip substrate edits just because they are dirty.
- Use `git add -A`, `git add .`, or any broad staging command.
- Rename product concepts or rewrite customer-facing copy outside the baseline
  grouping need.
- Pull in Lindy/Polsia/Naive code directly in this ticket.
- Change runtime behavior unless needed to make the selected spine internally
  consistent.

## Acceptance Criteria

- A reviewer can identify the selected DearMe baseline paths without scanning
  the entire dirty tree.
- The baseline includes all source-of-truth docs needed by future workers.
- The baseline includes the minimum shared/server/UI DearMe spine needed by
  `DM-001` through `DM-003`.
- No unrelated broad cleanup or substrate rewrite is included.
- Future workers can create an isolated worktree from the baseline ref and find
  the DearMe docs, route/service/API/page/test paths named in their tickets.
- Handoff states which files were intentionally left out and why.

## Verification Commands

Run evidence-gathering first:

```bash
git status --short --branch
git ls-files docs/dearme/INTEGRATED-ARCHITECTURE.md docs/dearme/WORKTREE-INTEGRATION-PLAN.md packages/shared/src/validators/dearme.ts server/src/routes/dearme.ts server/src/services/dearme-output-handoff.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx
```

Run focused checks after grouping or any consistency edits:

```bash
pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run
pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run
pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run
```

If the grouping touches shared/server/UI exports broadly, also run:

```bash
pnpm -r typecheck
```

## Stop Rules

Stop and report if:

- The current tree contains conflicting versions of the same DearMe spine path.
- The DearMe spine depends on broad unrelated Paperclip edits that cannot be
  separated safely.
- Required source-of-truth docs are missing or contradictory.
- Focused tests cannot run because dependencies are absent or the checkout is
  structurally inconsistent before edits.

## Handoff Requirements

Return:

- Selected baseline strategy.
- Exact files included.
- Exact files intentionally excluded.
- Verification commands and exact pass/fail result.
- Any dependency on broader Paperclip substrate changes.
- Next ticket readiness verdict for `DM-001`.
