# DearMe DM Merge Queue

Date: 2026-05-08
Integration owner: lead Codex thread
Base commit: `6b322408456318c237834a1ef5ceb08447ec7213`

## Purpose

This document converts the current DearMe worker output into a safe sequential
merge queue. The `/private/tmp/dearme-dm-*` worktrees are not independent
parallel branches anymore; they form a mostly linear stack over the baseline.

Do not merge them blindly in parallel.

## Live Worktree Scan

All listed worktrees were inspected read-only on 2026-05-08.

| Queue | Worktree | Branch | Head | Dirty | Files changed vs `6b322408` | Verdict |
| --- | --- | --- | --- | ---: | ---: | --- |
| 1 | `/private/tmp/dearme-dm-001-output-review-regeneration` | `codex/dearme-dm-001-output-review` | `29b87bd8` | 0 | 11 | Integrated into `codex/dearme-dm-001-integrated` at `d53b6115` |
| 2 | `/private/tmp/dearme-dm-002-team-work-stream` | `codex/dearme-dm-002-team-work-stream` | `7b95a2d5` | 0 | 16 | Integrated into `codex/dearme-dm-002-integrated` at `80128431` |
| 3 | `/private/tmp/dearme-dm-003-voice-memory-sources` | `codex/dearme-dm-003-voice-memory-sources` | `876ec6b3` | 0 | 24 | Integrated into `codex/dearme-dm-003-integrated` at `c5b11039` |
| 4 | `/private/tmp/dearme-dm-004-product-copy-leakage-cleanup` | `codex/dearme-dm-004-product-copy-leakage-cleanup` | `f402d94e` | 0 | 26 | Integrated into `codex/dearme-dm-004-integrated` at `484fe995` |
| 5 | `/private/tmp/dearme-dm-005-voice-memory-source-management` | `codex/dearme-dm-005-voice-memory-source-management` | `acaa7842` | 0 | 27 | Integrated into `codex/dearme-dm-005-integrated` at `77e7d403` |
| 6 | `/private/tmp/dearme-dm-006-output-detail-review-workspace` | `codex/dearme-dm-006-output-detail-review-workspace` | `cc358376` | 0 | 28 | Integrated into `codex/dearme-dm-006-integrated` at `44b7bfd6` |
| 7 | `/private/tmp/dearme-dm-007-review-outcome-memory-feedback` | `codex/dearme-dm-007-review-outcome-memory-feedback` | `d1bf8431` | 0 | 30 | Integrated into `codex/dearme-dm-007-integrated` at `3d419f55` |
| 8 | `/private/tmp/dearme-dm-008-feedback-aware-regeneration-brief` | `codex/dearme-dm-008-feedback-aware-regeneration-brief` | `9b1d1f3f` | 0 | 34 | Integrated into `codex/dearme-dm-008-integrated` at `b58827c2` |
| 9 | `/private/tmp/dearme-dm-009-feedback-applied-review-trace` | `codex/dearme-dm-009-feedback-applied-review-trace` | `aeac3696` | 0 | 35 | Integrated into `codex/dearme-dm-009-integrated` at `52190ed3` |
| 10 | `/private/tmp/dearme-dm-010-approval-ready-handoff` | `codex/dearme-dm-010-approval-ready-handoff` | `47b2c581` | 0 | 11 over DM-009 source | Integrated into `codex/dearme-dm-010-integrated` at `73224495` |
| 11 | `/private/tmp/dearme-dm-011-execution-receipt` | `codex/dearme-dm-011-execution-receipt` | `3194402b` | 0 | 8 over DM-010 source | Integrated into `codex/dearme-dm-011-integrated` at `b04a2c1d` |
| 12 | `/private/tmp/dearme-dm-012-private-execution-handoff` | `codex/dearme-dm-012-private-execution-handoff` | `17f75810` | 0 | 7 over DM-011 source | Integrated into `codex/dearme-dm-012-integrated` at `b6bfffb4` |
| 13 | `/private/tmp/dearme-dm-013-handoff-brief-surface` | `codex/dearme-dm-013-handoff-brief-surface` | `2673975d` | 0 | 10 over DM-012 source | Integrated into `codex/dearme-dm-013-integrated` at `39480533` |
| 14 | `/private/tmp/dearme-dm-014-mobile-nav-safe-area` | `codex/dearme-dm-014-mobile-nav-safe-area` | `65d7a599` | 0 | 6 over DM-013 source | Integrated into `codex/dearme-dm-014-integrated` at `75458d80` |
| 15 | `/private/tmp/dearme-dm-015-first-week-output-details` | `codex/dearme-dm-015-first-week-output-details` | `f9267e58` | 0 | 6 over DM-014 source | Integrated into `codex/dearme-dm-015-integrated` at `5a09b4d3` |
| 16 | `/private/tmp/dearme-dm-016-voice-memory-reference-links` | `codex/dearme-dm-016-voice-memory-reference-links` | `ae4fef73` | 0 | 12 over DM-015 source | Integrated into `codex/dearme-dm-016-integrated` at `16fa8fb8` |
| 17 | `/private/tmp/dearme-dm-017-voice-memory-source-editing` | `codex/dearme-dm-017-voice-memory-source-editing` | `ae4fef73 + dirty diff` | 12 modified | 12 over DM-016 source | Integrated into `codex/dearme-dm-017-integrated` at `feaaa66a`; hardened at `20290812` |
| 18 | `/private/tmp/dearme-dm-018-voice-memory-source-archive` | `codex/dearme-dm-018-voice-memory-source-archive` | `c151fe69 + dirty diff` | 12 modified | 12 over DM-017 source | Integrated into `codex/dearme-dm-018-integrated` at `94c3b4c6` |
| 19 | `/tmp/dearme-dm-019-archive-confirm-dialog` | `codex/dearme-dm-019-archive-confirm-dialog` | `98fa9796` | 0 | 2 over DM-018 integrated | Committed at `98fa9796c3e8` |

## Stack Shape

The branch graph shows a linear stack:

1. `29b87bd8 Complete DearMe private output feedback loop`
2. `7b95a2d5 Make DearMe team updates part of the customer work stream`
3. `876ec6b3 Show DearMe what its Voice and Memory is learning from`
4. `f402d94e Keep DearMe paid-beta language on the product surface`
5. `acaa7842 Let DearMe learn from private sources without exposing the substrate`
6. `cc358376 Make output review feel like a DearMe decision desk`
7. `d1bf8431 Make review decisions feed DearMe memory`
8. `9b1d1f3f Carry review feedback into DearMe regeneration briefs`
9. `aeac3696 Show applied feedback in DearMe review decisions`
10. `47b2c581 Make useful DearMe outputs wait for final approval`
11. `3194402b Keep approved DearMe next moves visible after final approval`
12. `17f75810 Keep DearMe execution handoffs private after final approval`
13. `2673975d Keep private DearMe handoffs visible after final approval`
14. `65d7a599 Keep DearMe mobile review work unobstructed`
15. `f9267e58 Make first-week DearMe outputs scannable`
16. `ae4fef73 Make DearMe private sources traceable without fetching them`
17. `ae4fef73 + dirty worktree Let DearMe users revise private Voice & Memory sources`
18. `c151fe69 + dirty worktree Archive stale DearMe Voice & Memory sources`
19. `98fa9796 Make Voice Memory archiving feel native to DearMe`

DM-010 was normalized from a dirty handoff into committed worker patch
`47b2c581`, then replayed onto integrated DM-009 baseline `52190ed3`.
The only replay conflict was `docs/dearme/BUILD-STATE.md`, which stayed
lead-owned and out of the clean integration commit.

DM-011 was replayed from source top commit `3194402b` onto integrated DM-010
baseline `73224495` as `b04a2c1d`. The only replay conflict was
`docs/dearme/BUILD-STATE.md`, which stayed lead-owned and out of the clean
integration commit.

DM-012 was replayed from source top commit `17f75810` onto integrated DM-011
baseline `b04a2c1d` as `b6bfffb4`. The replay conflicts were
`docs/dearme/BUILD-STATE.md`, `server/src/services/dearme-approval-receipts.ts`,
and `server/src/services/dearme-output-handoff.ts`; BUILD-STATE stayed
lead-owned, approval receipts kept the linked-issue-id hardening plus the
private handoff behavior, and the duplicate output-handoff import-order hunk
was dropped.

DM-013 was replayed from source top commit `2673975d` onto integrated DM-012
baseline `b6bfffb4` as `39480533`. The only replay conflict was
`docs/dearme/BUILD-STATE.md`, which stayed lead-owned and out of the clean
integration commit.

DM-014 was replayed from source top commit `65d7a599` onto integrated DM-013
baseline `39480533` as `75458d80`. The only replay conflict was
`docs/dearme/BUILD-STATE.md`, which stayed lead-owned and out of the clean
integration commit.

DM-015 was replayed from source top commit `f9267e58` onto integrated DM-014
baseline `75458d80` as `5a09b4d3`. The only replay conflict was
`docs/dearme/BUILD-STATE.md`, which stayed lead-owned and out of the clean
integration commit. The worker's architecture-plan and Symphony-plan hunks were
also excluded from the clean code commit so the lead thread can keep one
coherent queue document.

DM-016 was replayed from source top commit `ae4fef73` onto integrated DM-015
baseline `5a09b4d3` as `16fa8fb8`. The replay conflicts were lead-owned docs:
`docs/dearme/BUILD-STATE.md`,
`doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md`, and
`doc/plans/2026-05-08-dearme-symphony-operating-loop.md`. Those worker doc
hunks were excluded from the clean code commit so this merge queue remains the
single coherent state surface.

DM-017 had no distinct source commit: its source worktree pointed at DM-016
source commit `ae4fef73` but contained a 12-file dirty diff. That dirty diff was
applied onto integrated DM-016 baseline `16fa8fb8` and committed as `feaaa66a`,
then hardened in the same integration branch as `20290812`. The dirty diff was
treated as implementation material only; lead-owned docs stayed in the main
checkout.

DM-018 was applied from a dirty worker diff on top of source head `c151fe69`.
The diff was replayed onto the hardened DM-017 baseline `20290812` and committed
as `94c3b4c6`. The dirty diff was treated as implementation material only;
lead-owned docs stayed in the main checkout.

## Merge Rules

1. Use a clean disposable integration worktree, not `/Users/peter/dearme`.
2. Start from `6b322408456318c237834a1ef5ceb08447ec7213` unless a newer
   approved baseline ref is created.
3. Integrate DM branches in stack order. Do not skip ahead to DM-009 unless the
   goal is to review the whole stack at once.
4. For each queue item:
   - inspect changed files,
   - run its ticket-specific focused tests,
   - scan customer-facing surfaces for Paperclip/OpenClaw/provider/adapter leaks,
   - record verification in a handoff packet,
   - only then advance to the next queue item.
5. Treat `docs/dearme/BUILD-STATE.md` and `docs/dearme/INTEGRATED-ARCHITECTURE.md`
   as high-conflict files. Keep one lead-owned final edit rather than accepting
   every worker's duplicated state-note hunk.
6. Resolve all conflicts toward the product rule: team visible, machinery
   hidden; UI speaks DearMe, API translates, kernel executes.

## DM-001 Readiness

DM-001 is the next integration candidate and has now passed its focused
readiness gates in its own worktree.

Readiness facts:

- Worktree is clean.
- Branch is one commit over baseline.
- Diff is scoped to 11 DearMe spine files.
- Focused tests pass in the main checkout and in the DM-001 worktree.
- UI tests assert output review stays inside `/dearme` and does not require raw
  `/issues/*` or `/approvals/*` navigation.
- Server route tests assert wake/regeneration internals are not exposed in the
  customer response.
- Service tests assert output payloads strip provider/setup/Paperclip/OpenClaw
  internals even when the underlying work product metadata contains them.
- User-facing output action labels are product-native: `Useful`,
  `Needs changes`, `Regenerate`, and `Not useful`.

Verified commands:

- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed in `/private/tmp/dearme-dm-001-output-review-regeneration`, 13 tests.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed in `/private/tmp/dearme-dm-001-output-review-regeneration`, 20 tests.
- `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed in `/private/tmp/dearme-dm-001-output-review-regeneration`, 22 tests.

Integration verdict:

- DM-001 was replayed onto clean disposable worktree
  `/tmp/dearme-dm-001-integrate`.
- The integration branch is `codex/dearme-dm-001-integrated`.
- Integration commit is
  `d53b6115 Keep DearMe output review inside the product surface`.
- `docs/dearme/BUILD-STATE.md` was intentionally dropped from the replay so
  the main checkout remains the lead-owned state surface.
- DM-002 has now been replayed onto `d53b6115` and committed as the next
  successor baseline.

Integration verification:

- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 13 tests.
- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 20 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 22 tests.
- `git diff --check` passed across the 10 integrated files.
- Not run yet: full `pnpm test:run`, `pnpm -r typecheck`, or `pnpm build`.

## DM-002 Integration

DM-002 was replayed onto the integrated DM-001 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-002-integrate`.
- Branch: `codex/dearme-dm-002-integrated`.
- Base: `d53b6115 Keep DearMe output review inside the product surface`.
- Worker commit replayed: `7b95a2d5 Make DearMe team updates part of the
  customer work stream`.
- Integration commit:
  `80128431 Show DearMe team updates in the customer work stream`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.

Product behavior added:

- DearMe-origin agent comments can now appear as `team_update` cards in the
  customer work stream.
- Work stream items now carry explicit product-facing `kind` values:
  `decision`, `prepared_work`, `team_update`, or `progress`.
- Team updates map internal issue/work-product context into customer-facing
  role, summary, artifact, and output metadata.
- UI language moves the stream toward "Team work stream" instead of a generic
  dashboard feed.

Verification:

- In `/tmp/dearme-dm-002-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-002-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 28 tests.
- In `/tmp/dearme-dm-002-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/api/dearme.test.ts --run`
  passed, 28 tests.
- In `/tmp/dearme-dm-002-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` passed across the 9 integrated files.
- Forbidden-copy scan showed substrate words only in test fixtures/assertions,
  not in the changed runtime service/UI path.
- Not run yet: full `pnpm test:run`, full `pnpm build`, browser smoke.

Completed next integration step:

- Treat `80128431` as the next candidate baseline for DM-003.
- Replay DM-003 onto `80128431` in a new clean disposable worktree.
- Completed below as DM-003 integration commit `c5b11039`.

## DM-003 Integration

DM-003 was replayed onto the integrated DM-002 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-003-integrate`.
- Branch: `codex/dearme-dm-003-integrated`.
- Base: `80128431 Show DearMe team updates in the customer work stream`.
- Worker commit replayed: `876ec6b3 Show DearMe what its Voice and Memory is
  learning from`.
- Integration commit:
  `c5b11039 Show DearMe voice and memory sources from existing work`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.

Product behavior added:

- DearMe now has a Voice & Memory panel backed by existing Brand OS documents,
  voice samples, proof sources, approval boundaries, team updates, and agents.
- The implementation reuses the current document/comment/agent substrate and
  avoids adding a separate voice-memory table.
- Team update summaries are redacted before being shown as customer-visible
  memory sources, keeping provider, adapter, setup, issue, and runtime language
  backstage.
- The UI refreshes Voice & Memory after Brand OS apply, output review, and
  approval decisions.

Verification:

- In `/tmp/dearme-dm-003-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-003-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-voice-memory.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 29 tests.
- In `/tmp/dearme-dm-003-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/api/dearme.test.ts --run`
  passed, 31 tests.
- In `/tmp/dearme-dm-003-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` passed across the integrated DM-003 file set.
- Forbidden-copy scan showed substrate words only in test fixtures, redaction
  constants, and internal route code that strips `wakeIssue`, not in the
  changed customer UI path.
- Not run yet: full `pnpm test:run`, full `pnpm build`, browser smoke.

Next integration step:

- Treat `c5b11039` as the next candidate baseline for DM-004.
- Replay DM-004 onto `c5b11039` in a new clean disposable worktree.

## DM-004 Integration

DM-004 was replayed onto the integrated DM-003 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-004-integrate`.
- Branch: `codex/dearme-dm-004-integrated`.
- Base: `c5b11039 Show DearMe voice and memory sources from existing work`.
- Worker commit replayed:
  `f402d94e Keep DearMe paid-beta language on the product surface`.
- Integration commit:
  `484fe995 Keep DearMe paid-beta language on the product surface`.
- The worker's older `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.
- The DM-003 Voice & Memory redaction service stayed unchanged in the
  integration branch.

Product behavior added:

- Visible DearMe copy now prefers private work, private drafts, Brand OS, Voice
  Profile, approval boundaries, and team updates.
- Output review, workbench progress, onboarding preview, first-cycle work, and
  generated worker instructions no longer use customer-facing document,
  artifact, workspace, or issue-comment language.
- Internal route, schema, database, issue, document, and Paperclip-compatible
  contracts were intentionally preserved.

Verification:

- In `/tmp/dearme-dm-004-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 14 tests.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 18 tests.
- `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 1 test and confirmed the DM-003 redaction assertions still hold.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 14
  tests.
- In `/tmp/dearme-dm-004-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-path forbidden-copy scan returned no matches across the touched
  production/test files.
- Redaction scan matched only the intended Voice & Memory redaction constants
  and negative test fixtures.
- Not run yet: full `pnpm test:run`, full `pnpm build`, browser smoke.

Next integration step:

- Treat `484fe995` as the next candidate baseline for DM-005.
- Replay DM-005 onto `484fe995` in a new clean disposable worktree.

## DM-005 Integration

DM-005 was replayed onto the integrated DM-004 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-005-integrate`.
- Branch: `codex/dearme-dm-005-integrated`.
- Base: `484fe995 Keep DearMe paid-beta language on the product surface`.
- Worker commit replayed:
  `acaa7842 Let DearMe learn from private sources without exposing the substrate`.
- Integration commit:
  `77e7d403 Let DearMe learn from private sources without exposing the substrate`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.

Product behavior added:

- DearMe paid-beta users can add private Voice & Memory sources from `/dearme`
  as voice samples, proof sources, or approval boundaries.
- The API is board-gated and returns only product-safe `source` and refreshed
  `voiceMemory` payloads; it intentionally does not return `documentId`.
- Managed sources persist through the existing Brand OS issue document
  substrate with generated keys, avoiding a new Voice & Memory table.
- The UI updates the Voice & Memory panel query cache after each source is
  added, keeping the product surface current without exposing issue/document
  mechanics.

Integration hardening:

- Managed-source key parsing now requires exact generated key patterns such as
  `voice-sample-<8hex>` so legacy prefix collisions are not misclassified.
- Shared validation rejects whitespace-only source bodies.
- The Voice & Memory service test asserts legacy-prefix documents do not appear
  in customer Voice & Memory JSON.

Verification:

- In `/tmp/dearme-dm-005-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 21 tests.
- `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 25 tests.
- In `/tmp/dearme-dm-005-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-copy forbidden-term scan returned no matches for stale private
  draft/document/workspace/issue language in the targeted product surface.

Next integration step:

- Treat `77e7d403` as the candidate baseline for DM-006.
- Replayed DM-006 onto `77e7d403` in a new clean disposable worktree.
- Completed below as DM-006 integration commit `44b7bfd6`.

## DM-006 Integration

DM-006 was replayed onto the integrated DM-005 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-006-integrate`.
- Branch: `codex/dearme-dm-006-integrated`.
- Base: `77e7d403 Let DearMe learn from private sources without exposing the
  substrate`.
- Worker commit replayed: `cc358376 Make output review feel like a DearMe
  decision desk`.
- Integration commit:
  `44b7bfd6 Make output review feel like a DearMe decision desk`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.

Product behavior added:

- Every DearMe output now carries a strict `reviewContext` projection.
- The focused output panel now behaves like a DearMe decision desk: private
  draft, Voice Gate, Voice & Memory context, approval boundary, and review
  prompt are visible before the customer decides.
- Review context is derived from the existing output handoff substrate:
  details, prepared work, private source documents, and team updates.
- The implementation reuses the current output review path rather than adding a
  separate review table or detail endpoint.

Verification:

- In `/tmp/dearme-dm-006-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 21 tests.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 15 tests.
- `pnpm exec vitest ui/src/api/dearme.test.ts --run` passed, 10 tests.
- `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- In `/tmp/dearme-dm-006-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-copy forbidden-term scan returned matches only in negative test
  assertions, not in touched production DearMe surfaces.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `44b7bfd6` as the next candidate baseline for DM-007.
- Replay DM-007 onto `44b7bfd6` in a new clean disposable worktree.

## DM-007 Integration

DM-007 was replayed onto the integrated DM-006 baseline and verified in a
clean disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-007-integrate`.
- Branch: `codex/dearme-dm-007-integrated`.
- Base: `44b7bfd6 Make output review feel like a DearMe decision desk`.
- Worker commit replayed: `d1bf8431 Make review decisions feed DearMe
  memory`.
- Integration commit:
  `3d419f55 Make review decisions feed DearMe memory`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.
- Only the top DM-007 commit was replayed; earlier worker history duplicates
  already integrated DM-001 through DM-006 slices.

Product behavior added:

- Customer review outcomes now feed the Workbench work stream and Voice &
  Memory as customer-safe learning updates.
- The path reuses existing issue comments and DearMe read models; it adds no
  new table, route family, migration, or dependency.
- Only explicit `DearMe decision:` comments with known DearMe phrases are
  projected; ordinary scratch notes stay hidden.
- Review notes are redacted for substrate, provider, runtime, setup, route, and
  issue identifiers before being surfaced.

Verification:

- In `/tmp/dearme-dm-007-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests.
- `pnpm -r typecheck` passed.
- `git diff --cached --check && git diff --check` passed.
- Customer-copy forbidden substrate scan returned no matches in staged
  Workbench and Voice & Memory service additions.
- Verifier subagent returned PASS. Residual risks: redaction is heuristic, and
  existing Workbench response shape still carries internal IDs such as
  `issueId` and `relatedOutputId`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `3d419f55` as the next candidate baseline for DM-008.
- Replay DM-008 onto `3d419f55` in a clean disposable worktree.
- Keep using Polsia for product choreography, Lindy for action-card/review
  interaction grammar, and the Naive/Paperclip substrate for hidden persistence
  and wakeups.

## DM-008 Integration

DM-008 was replayed onto the integrated DM-007 baseline and verified in a
clean disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-008-integrate`.
- Branch: `codex/dearme-dm-008-integrated`.
- Base: `3d419f55 Make review decisions feed DearMe memory`.
- Worker commit replayed:
  `9b1d1f3f Carry review feedback into DearMe regeneration briefs`.
- Integration commit:
  `b58827c2 Carry review feedback into DearMe regeneration briefs`.
- The worker's `docs/dearme/BUILD-STATE.md` hunk was dropped so the main
  checkout remains the lead-owned state surface.
- Only the top DM-008 commit was replayed; earlier worker history duplicates
  already integrated DM-001 through DM-007 slices.

Product behavior added:

- Customer requests for changes, regeneration, or not-useful decisions now
  become a compact DearMe regeneration brief for the next private assignment.
- The brief is synthesized from the existing DearMe decision comment, latest
  issue document, and latest prepared work summary.
- Approved work does not create a regeneration brief.
- The path reuses existing issue comments, issue documents, prepared work
  summaries, and heartbeat assignment markdown; it adds no new table, route,
  migration, UI surface, or dependency.

Integration hardening:

- Regeneration briefs redact substrate, provider, model, runtime, setup,
  route, ticket, issue, approval, and UUID-shaped details from user notes and
  previous draft context.
- The customer-facing review comment remains product-owned; raw review comment
  bodies are not passed through as the worker assignment.
- The only forbidden-substrate scan match in staged production additions was
  the intended `MCP` redaction pattern.

Verification:

- In `/tmp/dearme-dm-008-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- `pnpm exec vitest server/src/__tests__/heartbeat-comment-wake-batching.test.ts --run`
  passed, 9 tests.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm -r typecheck` passed.
- `git diff --cached --check && git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `b58827c2` as the next candidate baseline for DM-009.
- Replay DM-009 onto `b58827c2` in a clean disposable worktree.
- Keep using Polsia for visible iteration choreography, Lindy for
  action-card/result traces, and the Naive/Paperclip substrate for hidden
  persistence, prepared work, and wakeups.

## DM-009 Integration

DM-009 was replayed onto the integrated DM-008 baseline and verified in a
clean disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-009-integrate`.
- Branch: `codex/dearme-dm-009-integrated`.
- Base: `b58827c2 Carry review feedback into DearMe regeneration briefs`.
- Worker commit replayed:
  `aeac3696 Show applied feedback in DearMe review decisions`.
- Integration commit:
  `52190ed3 Show applied feedback in DearMe review decisions`.
- The only merge conflict was `docs/dearme/BUILD-STATE.md`; it was resolved by
  keeping the lead-owned state file out of the clean integration commit.
- The integration added redaction hardening on top of the worker slice before
  committing, so customer-facing feedback traces do not pass through
  substrate, provider, runtime, setup, route, ticket, issue, approval, or
  UUID-shaped details from previous review notes.

Product behavior added:

- When a customer requests changes, regeneration, or marks output not useful,
  a later refreshed private draft can now show a compact `Feedback applied`
  trace in the DearMe decision desk.
- The trace explains what the user asked for, what changed, and that the draft
  remains private until approval.
- The read model reuses existing DearMe decision comments, fresh private
  documents, and latest work-stream updates; it adds no new route, table,
  migration, workflow, or dependency.
- The UI renders the trace inside the focused output review panel, borrowing
  Lindy-style action/result grammar while keeping the underlying
  Naive/Paperclip issue/comment/document substrate hidden.

Verification:

- In `/tmp/dearme-dm-009-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 15 tests.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 5 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- `pnpm -r typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `52190ed3` as the next candidate baseline.
- Replay the normalized DM-010 worker patch onto `52190ed3` in a clean
  disposable worktree.
- Keep the final-action approval boundary explicit: useful private work is not
  permission to publish, send, deploy, or spend.

## DM-010 Integration

DM-010 was replayed onto the integrated DM-009 baseline and verified in a clean
disposable worktree.

Integration facts:

- Worktree: `/tmp/dearme-dm-010-integrate`.
- Branch: `codex/dearme-dm-010-integrated`.
- Base: `52190ed3 Show applied feedback in DearMe review decisions`.
- Worker commit replayed:
  `47b2c581 Make useful DearMe outputs wait for final approval`.
- Integration commit:
  `73224495 Make approved DearMe outputs wait for final approval`.
- The only replay conflict was `docs/dearme/BUILD-STATE.md`; it was resolved by
  keeping the lead-owned state file out of the clean integration commit.
- The integration preserved DM-009's `feedbackTrace` and private-detail
  redaction path before committing.

Product behavior added:

- When a customer marks a private DearMe output as useful, DearMe now creates an
  idempotent `dearme_output_next_move` approval for the downstream move.
- The next move maps prepared work into an explicit final gate: publish social,
  send outreach, deploy portfolio proof, or spend/start the next private cycle.
- The Workbench projects that pending approval as the focused final decision
  and suppresses the duplicate private-output review decision while the final
  approval is pending.
- The UI labels the approval as a DearMe next move, shows `Ready for final
  approval`, and keeps public/send/deploy/spend actions blocked until the user
  explicitly approves.
- The slice reuses existing approvals, issue-approval links, output review
  state, Work Ready projection, batch grouping, and approval payload rendering.
  It adds no new table, migration, external connector, or publishing route.

Verification:

- In `/tmp/dearme-dm-010-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 16 tests.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 5 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 2 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- `pnpm exec vitest ui/src/components/ApprovalPayload.test.tsx --run`
  passed, 3 tests.
- `pnpm -r typecheck` passed.
- The staged customer-surface leak scan returned no added Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/runtime/setup route-language matches in the
  changed runtime service/UI paths.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `73224495` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-011-execution-receipt` against this baseline
  before replaying anything.
- Do not implement real channel publishing, email sending, deployment, or spend
  automation until the execution adapter and trust boundary are reviewed as a
  separate slice.

## DM-011 Integration

DM-011 was replayed onto the integrated DM-010 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree: `/private/tmp/dearme-dm-011-execution-receipt`, clean at
  `3194402b Keep approved DearMe next moves visible after final approval`.
- Clean worktree: `/tmp/dearme-dm-011-integrate`.
- Branch: `codex/dearme-dm-011-integrated`.
- Base: `73224495 Make approved DearMe outputs wait for final approval`.
- Integration commit: `b04a2c1d Keep DearMe final approvals visible`.
- The only replay conflict was `docs/dearme/BUILD-STATE.md`; it was resolved by
  keeping the lead-owned state file out of the clean integration commit.

Product behavior added:

- Final DearMe next-move approvals now record a customer-safe receipt through
  the existing approval route after the approval is newly applied.
- The receipt logs `dearme.next_move_approved` activity and a DearMe-native
  issue comment with external execution status `not_run_yet`.
- The Workbench projects the receipt as `next_move_approved` progress and a
  work-stream item, then suppresses the duplicate private-output review
  decision after final approval.
- No real publish, send, deploy, or spend path runs in this slice.

Integration hardening:

- `server/src/services/dearme-output-handoff.ts` now imports the shared
  `DEARME_NEXT_MOVE_APPROVAL_TYPE` constant from the receipt helper instead of
  carrying a duplicate private constant.
- Receipt issue comments prefer real linked issue ids over a possibly stale
  issue id embedded in the approval payload.
- `docs/dearme/BUILD-STATE.md` was excluded from the clean integration commit.

Verification:

- In `/tmp/dearme-dm-011-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- `pnpm exec vitest server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 21 tests.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 16
  tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- The staged customer-surface leak scan returned no added Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/runtime/setup route-language matches in changed
  runtime service/UI paths.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `b04a2c1d` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-012-private-execution-handoff` against this
  baseline before replaying anything.
- Keep real external execution out of scope until adapter and approval
  boundaries are separately reviewed.

## DM-012 Integration

DM-012 was replayed onto the integrated DM-011 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-012-private-execution-handoff`, clean
  at `17f75810 Keep DearMe execution handoffs private after final approval`.
- Clean worktree `/tmp/dearme-dm-012-integrate`.
- Branch `codex/dearme-dm-012-integrated`.
- Base `b04a2c1d Keep DearMe final approvals visible`.
- Integration commit `b6bfffb4 Show private DearMe execution handoffs`.
- Full integration commit:
  `b6bfffb45c558c852d27ce3b5f85d4801e0a7027`.
- BUILD-STATE excluded; the output-handoff duplicate import-order diff was
  dropped.

Product behavior:

- Final approval receipt now also records a private execution handoff.
- The approval route logs `dearme.private_execution_handoff_prepared` and a
  DearMe-native issue comment.
- Workbench projects an `execution_handoff_prepared` progress/work-stream item.
- The handoff is non-actionable and `needsApproval: false`; no external
  publish, send, deploy, or spend path was added.

Integration hardening:

- Preserved DM-011 linked issue id preference.
- Avoided extra output-handoff churn.
- Reused approval, activity, issue comment, and Workbench surfaces; no table,
  migration, route, connector, dependency, or real external execution path was
  added.

Verification:

- In `/tmp/dearme-dm-012-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm exec vitest server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 21 tests.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- Staged runtime leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/
  provider/adapter/runtime/setup route-language matches.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `b6bfffb4` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-013-handoff-brief-surface` before replaying
  anything.
- Keep real external execution out of scope until adapter and trust boundaries
  are separately reviewed.

## DM-013 Integration

DM-013 was replayed onto the integrated DM-012 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-013-handoff-brief-surface`, clean at
  `2673975d Keep private DearMe handoffs visible after final approval`.
- Clean worktree `/tmp/dearme-dm-013-integrate`.
- Branch `codex/dearme-dm-013-integrated`.
- Base `b6bfffb4 Show private DearMe execution handoffs`.
- Integration commit `39480533 Surface private handoff readiness in DearMe`.
- Full integration commit:
  `39480533a8a26db86858cc053edd0ec8f77ff04c`.
- BUILD-STATE excluded.

Product behavior:

- Workbench progress can now carry `private_handoff_ready` readiness and a
  customer-safe `nextStep`.
- DearMe renders a compact private handoff panel when recent progress includes
  a ready execution handoff.
- The panel shows handoff title, summary, next step, artifact type, and an
  `External action not run` badge.
- The panel opens the existing DearMe decision/brief view instead of adding a
  new route.
- No new route, table, dependency, connector, or external action was added.

Integration hardening:

- Reused the DM-012 activity and Workbench projection instead of adding new
  persistence.
- Kept the handoff linked to existing issue/decision navigation.
- Runtime leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/provider/
  adapter/runtime/setup route-language matches in changed runtime paths.

Verification:

- In `/tmp/dearme-dm-013-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 35 tests.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `39480533` as the next candidate baseline.
- Replay `/private/tmp/dearme-dm-014-mobile-nav-safe-area` before DM-015.
- DM-016 has since diverged from DM-015 and must be inspected as its own queue
  item after DM-015.

## DM-014 Integration

DM-014 was replayed onto the integrated DM-013 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-014-mobile-nav-safe-area`, clean at
  `65d7a599 Keep DearMe mobile review work unobstructed`.
- Clean worktree `/tmp/dearme-dm-014-integrate`.
- Branch `codex/dearme-dm-014-integrated`.
- Base `39480533 Surface private handoff readiness in DearMe`.
- Integration commit `75458d80 Keep DearMe mobile work unobstructed`.
- Full integration commit:
  `75458d807fc7ff3e35a51a860b1d8d6171e814b9`.
- BUILD-STATE excluded.

Product behavior:

- `/dearme` mobile routes no longer render the inherited fixed mobile bottom
  navigation that can cross through customer review work.
- Standard non-DearMe mobile company routes still render the existing mobile
  bottom navigation.
- DearMe mobile content now uses a smaller bottom safe-area reserve.
- Stale prepared outputs without `reviewContext` still render as private work
  needing review through a conservative customer-safe fallback.

Integration hardening:

- Kept the patch scoped to the existing Layout shell and DearMe output review
  surface.
- Added no route, table, backend path, dependency, connector, or external
  action.
- Runtime UI leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/
  provider/adapter/runtime/setup route-language matches.

Verification:

- In `/tmp/dearme-dm-014-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm exec vitest ui/src/components/Layout.test.tsx --run` passed, 8 tests.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 18
  tests.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Next integration step:

- Treat `75458d80` as the next candidate baseline.
- Replay `/private/tmp/dearme-dm-015-first-week-output-details`.
- DM-016 has since diverged from DM-015 and must be inspected as its own queue
  item after DM-015.

## DM-015 Integration

DM-015 was replayed onto the integrated DM-014 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-015-first-week-output-details`, clean
  at `f9267e58 Make first-week DearMe outputs scannable`.
- Clean worktree `/tmp/dearme-dm-015-integrate`.
- Branch `codex/dearme-dm-015-integrated`.
- Base `75458d80 Keep DearMe mobile work unobstructed`.
- Integration commit `5a09b4d3 Make first-week DearMe outputs scannable`.
- Full integration commit:
  `5a09b4d34612bc69aa950c4ad97b4ff9c4e1194c`.
- BUILD-STATE excluded.
- Worker updates to the architecture-plan and Symphony-plan docs were excluded
  from the clean code commit; this merge queue remains the lead-owned status
  surface.

Product behavior:

- First-week Work Ready cards now show value-specific details before the user
  opens focused review.
- Content draft cards prioritize channel, audience, hook, draft body, proof
  used, and approval gate.
- Opportunity draft cards prioritize target, why relevant, relevance score,
  outreach angle, draft message, and approval gate.
- Portfolio update cards prioritize page/section, proof source, proposed copy,
  and deploy gate.
- Weekly report cards prioritize completed work, decisions needed, next bets,
  and report reference.
- Focused review uses the same detail ordering as the cards.

Integration hardening:

- Reused the existing DearMe output detail schema and Work Ready card surface.
- Added no backend route, table, migration, dependency, connector, scraper,
  external fetch, or external action.
- Runtime UI leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/
  provider/adapter/runtime/setup route-language matches.

Verification:

- In `/tmp/dearme-dm-015-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-015-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 19
  tests.
- In `/tmp/dearme-dm-015-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" doc ui packages server docs` returned no
  conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
  returned no staged lead-owned doc hunks.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Next integration step:

- Treat `5a09b4d3` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-016-voice-memory-reference-links` before
  replaying anything; DM-016 now has distinct head `ae4fef73`.

## DM-016 Integration

DM-016 was replayed onto the integrated DM-015 baseline and verified in a clean
disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-016-voice-memory-reference-links`,
  clean at `ae4fef73 Make DearMe private sources traceable without fetching
  them`.
- Clean worktree `/tmp/dearme-dm-016-integrate`.
- Branch `codex/dearme-dm-016-integrated`.
- Base `5a09b4d3 Make first-week DearMe outputs scannable`.
- Integration commit `16fa8fb8 Keep DearMe source references private and
  traceable`.
- Full integration commit:
  `16fa8fb804baae650f76da19792279761a4e8e7c`.
- BUILD-STATE, architecture-plan, and Symphony-plan worker hunks were excluded
  from the clean commit; this merge queue remains the lead-owned status
  surface.

Product behavior:

- Voice & Memory source entries can now include an optional private
  `referenceUrl`.
- The shared contract accepts trimmed `http://` and `https://` URLs, treats an
  empty field as absent, and rejects non-HTTP schemes.
- The server stores the reference as a line inside the existing managed-source
  document, projects it back into the source response, and filters that line
  out of the customer summary text.
- The `/dearme` Voice & Memory form can submit a reference link and source cards
  render it as a private `Reference` link.

Integration hardening:

- Reused the existing DearMe voice-memory document storage, shared validators,
  API client, and `/dearme` UI surface.
- Added no migration, table, dependency, background worker, uploader, scraper,
  external fetch, connector, public publishing path, or external action.
- Staged diff leak scan found no added user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/setup route-language matches. A broader source
  scan only matched existing sanitizer patterns that intentionally filter those
  words.

Verification:

- In `/tmp/dearme-dm-016-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 29 tests.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 24 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --cached --check` and `git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" doc ui packages server docs` returned no
  conflict markers.
- `git diff --cached -- docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
  returned no staged lead-owned doc hunks.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Residual risk:

- Reference links are stored and rendered as private provenance only. Do not
  fetch, summarize, publish, or use them for external action without a separate
  trust-boundary review.

Next integration step:

- Historical DM-016 handoff: `16fa8fb8` was the next candidate baseline.
- DM-017 later proved to contain a dirty worker diff despite sharing DM-016's
  source head; see `DM-017 Integration` below.

## DM-017 Integration

DM-017 was applied as a dirty worker diff onto the integrated DM-016 baseline
and verified in a clean disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-017-voice-memory-source-editing`,
  branch `codex/dearme-dm-017-voice-memory-source-editing`.
- Source head `ae4fef73`, same as DM-016 source, with 12 modified files in the
  worktree.
- Clean worktree `/tmp/dearme-dm-017-integrate`.
- Branch `codex/dearme-dm-017-integrated`.
- Base `16fa8fb8 Keep DearMe source references private and traceable`.
- Integration commit `feaaa66a Let DearMe users revise private voice memory
  sources`.
- Full integration commit:
  `feaaa66a391520dbb96b5cd9ac116b3c15480485`.

Product behavior:

- Editable managed Voice & Memory sources now expose their private body to the
  DearMe UI for review and correction.
- The `/dearme` Voice & Memory form supports edit, save changes, and cancel
  states while reusing the existing add-source form shape.
- The API client can update a source through a DearMe-native request and result
  contract.
- The server updates managed private sources through the existing
  document-revision path, logs `dearme.voice_memory_source_updated`, and
  returns the refreshed source list.

Integration hardening:

- Reused the existing company-scoped DearMe route, Voice & Memory document
  storage, shared validators, UI API client, and `/dearme` page.
- Added no migration, table, dependency, upload system, scraper, external
  fetch, connector, public publishing path, or real external action.
- The source edit path remains private memory maintenance; it does not publish,
  send, deploy, spend, or alter any external channel.
- Staged diff leak checks found no added user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/setup route-language matches. A broader runtime
  scan only matched existing sanitizer patterns that intentionally filter those
  words.

Verification:

- In `/tmp/dearme-dm-017-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 31 tests.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 26 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --cached --check` and `git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" packages server ui` returned no conflict
  markers.
- `git diff --cached -- package.json pnpm-lock.yaml '**/package.json'`
  returned no dependency changes.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Residual risk:

- Source edits are audited through document revisions, but the UI only exposes
  the current editable body. A later product pass may want explicit revision
  history if design partners ask for it.
- This remains private memory maintenance. Do not wire edited source bodies to
  public publishing or external actions without a separate approval-boundary
  review.

Follow-up hardening:

- Continued in `/tmp/dearme-dm-017-integrate` on
  `codex/dearme-dm-017-integrated`.
- Fixed the DearMe Brand OS approval apply path: `approvalService.approve()`
  now invokes the existing Brand OS apply service when a
  `dearme_brand_blueprint_apply` approval is actually applied.
- Tightened generated first-operation briefs so weekly reports must update the
  attached `dear-me-report` document as the durable report surface and DearMe
  customer work cannot modify repository source, app configuration, or local
  runtime files.
- Isolated Tailnet fallback tests from host-installed `tailscale` binaries.
- Committed as `20290812 Apply DearMe Brand OS approvals through the gate`.
- Verification passed:
  `pnpm exec vitest cli/src/__tests__/network-bind.test.ts cli/src/__tests__/onboard.test.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts --run`,
  `pnpm --filter @paperclipai/server typecheck`, full `pnpm test:run`,
  `git diff --check`, `git diff --cached --check`, conflict-marker scan, and
  dependency diff check.

Next integration step:

- Historical DM-017 handoff: `20290812` was the current candidate baseline.
- DM-018 later proved to contain a dirty worker diff; see `DM-018 Integration`
  below.

## DM-018 Integration

DM-018 was applied as a dirty worker diff onto the hardened DM-017 baseline and
verified in a clean disposable worktree.

Integration facts:

- Source worktree `/private/tmp/dearme-dm-018-voice-memory-source-archive`,
  branch `codex/dearme-dm-018-voice-memory-source-archive`.
- Source head `c151fe69` with 12 modified implementation/test files in the
  worktree.
- Clean worktree `/tmp/dearme-dm-018-integrate`.
- Branch `codex/dearme-dm-018-integrated`.
- Base `20290812 Apply DearMe Brand OS approvals through the gate`.
- Integration commit `94c3b4c6 Archive stale DearMe Voice & Memory sources
  without deleting history`.

Product behavior:

- Paid-beta users can archive editable managed private Voice & Memory sources
  from `/dearme`.
- Archiving writes a hidden document revision with `Status: archived` instead
  of hard-deleting source history.
- Archived sources disappear from `GET /voice-memory`, source counts, and the
  customer source card list.
- The archive response returns only `archivedSourceId` and refreshed
  Voice & Memory projection to the customer API path.
- The UI adds an archive affordance plus confirmation copy before removing a
  source from active memory.

Integration hardening:

- Reused the existing shared DearMe validators, company-scoped DearMe route,
  document-backed Voice & Memory storage, UI API client, and `/dearme` page.
- Added no migration, table, dependency, upload system, scraper, external
  fetch, connector, public publishing path, or external action.
- The archive path remains private memory maintenance; it does not publish,
  send, deploy, spend, or alter any external channel.
- Added-line leak checks found no new user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/setup route-language matches.

Verification:

- In `/tmp/dearme-dm-018-integrate`, `pnpm install --frozen-lockfile --offline`
  passed with the known local plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 33 tests.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed after a targeted rerun of the Voice & Memory suite cleared a transient
  embedded Postgres setup failure.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Full `pnpm test:run` passed and exited 0.
- `git diff --cached --check`, `git diff --check`, conflict-marker scan, and
  dependency diff check passed.

Not run:

- Browser visual smoke for the archive confirmation UI.

Residual risk:

- The UI originally used the browser confirmation dialog for the archive
  affordance. DM-019 replaced it with a DearMe-native dialog.

## DM-019 Archive Confirmation Dialog

DM-019 was created as a bounded follow-up polish slice on top of the integrated
DM-018 baseline and committed in a clean disposable worktree.

Integration facts:

- Clean worktree `/tmp/dearme-dm-019-archive-confirm-dialog`.
- Branch `codex/dearme-dm-019-archive-confirm-dialog`.
- Base `94c3b4c6 Archive stale DearMe Voice & Memory sources without deleting
  history`.
- Commit `98fa9796c3e8 Make Voice Memory archiving feel native to DearMe`.

Product behavior:

- Paid-beta users now see a DearMe-native `Archive private source?` dialog
  before archiving an editable managed private Voice & Memory source.
- `Keep source` closes the dialog without archiving.
- `Archive source` runs the existing archive mutation and removes the source
  from the active Voice & Memory projection.
- The dialog explains the source is retained in private history instead of
  being hard-deleted.

Integration hardening:

- Reused the existing `/dearme` page, UI API path, document-backed archive
  mutation, and shared dialog primitives.
- Added no backend change, migration, table, dependency, connector, external
  action, publishing path, sending path, deployment path, or spend path.

Verification:

- `pnpm install --frozen-lockfile --offline` passed with the known local plugin
  SDK dev-bin warnings.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 21
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed with existing non-blocking Vite
  chunking warnings.
- Browser verification on `http://127.0.0.1:3101/DEAAAAAAA/dearme` passed:
  temporary source add, dialog open, `Keep source` preservation, `Archive
  source` removal, and API confirmation.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- `rg -n "window\\.confirm"` on the touched DearMe page/test files returned no
  matches.

Next integration step:

- Treat `98fa9796c3e8` as the current candidate baseline.
- Assign the next bounded slice from this baseline. Preferred choices: remaining
  product-copy leakage cleanup, a stronger Work Ready / Decisions Needed
  cockpit, or deeper Voice Profile scoring and review.
