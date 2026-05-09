# DearMe Baseline Spine Manifest

Date: 2026-05-08
Branch: `codex/dearme-baseline-2026-05-08`
Baseline commit candidate: `6b322408456318c237834a1ef5ceb08447ec7213`

## Purpose

This manifest defines the minimum DearMe product spine that future isolated
workers must preserve before implementing the next product tickets.

It is not a whole-repository cleanup plan. The active checkout is still a mixed
integration tree with broad Paperclip substrate edits, DearMe product edits, and
untracked files. Future workers should not infer scope by scanning the whole
dirty tree.

## Current Verdict

Status: `PARTIAL BASELINE`

`6b322408` is a recoverable DearMe product baseline candidate, but the active
checkout contains additional DearMe spine changes that are not yet part of that
commit. The most important untracked source-of-truth files are:

- `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md`
- `server/src/services/dearme-memory-context.ts`
- `server/src/__tests__/dearme-brand-blueprints.test.ts`
- `server/src/__tests__/dearme-memory-context.test.ts`
- `ui/src/components/DearMeShell.tsx`
- `ui/src/components/DearMeShell.test.tsx`

Until these files are deliberately included in a later baseline ref or an
explicit integration patch, `/Users/peter/dearme` must remain a coordination and
reference checkout, not a product-code worker base.

## Required Docs

These files define the current DearMe architecture and worker contract:

- `AGENTS.md`
- `docs/dearme/README.md`
- `docs/dearme/INTEGRATED-ARCHITECTURE.md`
- `docs/dearme/WORKTREE-INTEGRATION-PLAN.md`
- `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md`
- `docs/dearme/REBRAND-AND-PROVENANCE.md`
- `docs/dearme/BUILD-STATE.md`
- `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
- `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`

## Minimum Product Spine

### Shared Contracts

- `packages/shared/src/index.ts`
- `packages/shared/src/validators/index.ts`
- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/validators/dearme.test.ts`

### Server Route And Services

- `server/src/app.ts`
- `server/src/routes/dearme.ts`
- `server/src/services/index.ts`
- `server/src/services/dearme-brand-blueprints.ts`
- `server/src/services/dearme-brand-blueprint-apply.ts`
- `server/src/services/dearme-memory-context.ts`
- `server/src/services/dearme-output-handoff.ts`
- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/services/dearme-workbench.ts`

### Server Focused Tests

- `server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
- `server/src/__tests__/dearme-brand-blueprints.test.ts`
- `server/src/__tests__/dearme-memory-context.test.ts`
- `server/src/__tests__/dearme-output-handoff.test.ts`
- `server/src/__tests__/dearme-workbench.test.ts`

### UI Shell And API

- `ui/src/App.tsx`
- `ui/src/components/Layout.tsx`
- `ui/src/components/DearMeSidebar.tsx`
- `ui/src/components/DearMeShell.tsx`
- `ui/src/components/DearMeShell.test.tsx`
- `ui/src/api/dearme.ts`
- `ui/src/api/dearme.test.ts`
- `ui/src/lib/dearme-brand-blueprint.ts`
- `ui/src/lib/queryKeys.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`

## Dependency Notes

- `server/src/app.ts` mounts `server/src/routes/dearme.ts`.
- `server/src/routes/dearme.ts` depends on DearMe shared validators, DearMe
  services, and existing Paperclip access/activity/heartbeat primitives.
- `server/src/services/index.ts` must export the DearMe services used by the
  route.
- `packages/shared/src/validators/index.ts` and `packages/shared/src/index.ts`
  must keep the DearMe contracts reachable by server and UI imports.
- `ui/src/App.tsx` and `ui/src/components/Layout.tsx` are part of the shell
  closure because they expose the `/dearme` route and customer navigation.
- `ui/src/pages/DearMeOnboarding.tsx` depends on `ui/src/api/dearme.ts`,
  `ui/src/components/DearMeShell.tsx`, the shared DearMe contract, and existing
  query-key conventions.

## Excluded From This Spine

These are intentionally outside the minimum DearMe product spine unless a later
ticket proves they are required:

- broad adapter rewrites,
- CLI/onboarding/runtime copy cleanup outside DearMe route needs,
- unrelated Paperclip admin pages,
- deployment, infra, and host runtime files,
- donor repository source files from Polsia, Naive, Lindy, or Littlebird,
- generated build outputs,
- local smoke database artifacts.

## Worker Coordination Rules

1. Product-code workers must use isolated worktrees such as
   `/private/tmp/dearme-dm-*`, not the dirty `/Users/peter/dearme` checkout.
2. The lead Codex thread owns merge order, conflict resolution, and final
   verification claims.
3. Merge or replay DM branches sequentially. DM-001 through DM-010 overlap on
   the same shared/server/UI DearMe spine and are not safe for blind parallel
   merge.
4. Each worker handoff must include changed files, base commit, verification,
   forbidden-copy scan results, conflicts expected, intentionally omitted files,
   and next-ticket readiness.
5. Do not broad-stage, broad-clean, or run `git add -A` / `git add .` from the
   active checkout.
6. Resolve conflicts toward the product boundary: UI speaks DearMe, API
   translates, kernel executes, runtime machinery stays backstage.

## DM-001 Readiness

DM-001 is not blocked by missing tests: the focused baseline checks pass.

DM-001 is still blocked for unsupervised handoff until one of these is true:

- a new explicit baseline ref includes the untracked DearMe spine files named
  above, or
- the lead creates a disposable worktree from `6b322408` and applies only the
  selected manifest files as a reviewable patch.

Do not start DM-001 directly inside `/Users/peter/dearme`.
