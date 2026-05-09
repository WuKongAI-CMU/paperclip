# DearMe Branch Integration Checkpoint

Date: 2026-05-09
Branch: `codex/dearme-branch-integration-checkpoint`
Base branch: `codex/dearme-baseline-2026-05-08`
Baseline head at checkpoint start: `2411d12505359ea213c6e0142224eb7581573924`

## Purpose

This checkpoint answers the local branch-hygiene question before more product
work starts. It is a coordination slice, not a feature slice.

DearMe now has a recoverable baseline branch that includes the current
Polsia/Naive comparison and the DM-105 cycle-control work. The remaining problem
is branch interpretation: many old `codex/dearme-dm-*` worker branches are not
merged by Git ancestry even though their product content may already have been
replayed into the baseline through later integration commits.

Future agents should not treat "not merged by ancestry" as proof that a branch
must be merged.

## Current Confirmed State

- Current clean baseline branch: `codex/dearme-baseline-2026-05-08`.
- Current baseline head before this doc-only checkpoint:
  `2411d12505359ea213c6e0142224eb7581573924`
  (`Lock Polsia and Naive donor split`).
- `codex/dearme-polsia-naive-comparison` points at the same commit as the
  baseline, so the latest comparison doc is already integrated locally.
- The previously partial baseline spine is now tracked. The files called out in
  the old warning are present in `git ls-files`:
  - `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md`
  - `server/src/services/dearme-memory-context.ts`
  - `server/src/__tests__/dearme-brand-blueprints.test.ts`
  - `server/src/__tests__/dearme-memory-context.test.ts`
  - `ui/src/components/DearMeShell.tsx`
  - `ui/src/components/DearMeShell.test.tsx`
- The only configured remote is `upstream` at
  `https://github.com/paperclipai/paperclip.git`, which is the inherited
  Paperclip remote. Do not push DearMe branches there unless Peter explicitly
  asks for it.

## Merged-By-Ancestry Set

From the current baseline head, Git reports these branches as merged:

- `codex/dearme-baseline-2026-05-08`
- `codex/dearme-chief-guardrail-integration`
- `codex/dearme-dm-103-premium-work-stream`
- `codex/dearme-dm-104-voice-memory-sources`
- `codex/dearme-dm-105-cycle-controls`
- `codex/dearme-polnaive-lindy-loop`
- `codex/dearme-polsia-naive-comparison`
- `dearme`
- `master`

This is the set that can be treated as integrated by ref ancestry.

## Unmerged Branch Interpretation

There are many older `codex/dearme-dm-*` branches that are not merged by
ancestry. The correct default is:

1. Do not blindly merge them.
2. Do not delete them just because their names look old.
3. Treat them as historical worker refs unless a content-equivalence check shows
   a real delta that the current baseline is missing.
4. If a branch appears valuable, compare it against the current baseline by
   file and behavior, not only by commit graph.
5. If the branch only contains work already represented in `BUILD-STATE.md` and
   current source files, leave it alone or retire it only after a separate
   explicit cleanup pass.

## Safe Next Integration Rule

New DearMe product work should start from the current baseline branch head, then
use an issue-sized branch or disposable worktree:

```bash
git switch codex/dearme-baseline-2026-05-08
git switch -c codex/dearme-dm-106-<short-slice>
```

For source changes, use an isolated worktree if the slice touches shared
server/UI contracts or overlaps with other active branches. Docs-only slices can
use a branch from the clean baseline.

After a slice passes focused verification:

1. Keep the commit coherent and Lore-formatted.
2. Fast-forward or merge the reviewed branch back into
   `codex/dearme-baseline-2026-05-08` locally.
3. Add a `BUILD-STATE.md` entry with exact verification evidence.
4. Do not push unless a DearMe-owned remote exists or Peter explicitly approves
   pushing to the current remote.

## Next Product Slice Candidate

The next bounded product slice should build on the current Polsia/Naive split:

- Polsia surface: make the cycle feel like a visible growth-team ritual.
- Naive/Paperclip substrate: keep work routing, approvals, and event state in
  existing rows and services.
- DearMe product move: turn cycle-control briefs into a visible work-stream
  event or review card so the user sees that the Chief of Staff instruction
  changed the team's next work, not just a composer state.

Suggested ticket name: `DM-106: Chief Of Staff Brief To Work-Stream Event`.

## Verification Performed

```bash
git status --short --branch
git log --oneline --decorate -5
git branch --merged HEAD --format='%(refname:short)' | sort
git branch --no-merged HEAD --format='%(refname:short) %(objectname:short) %(subject)' | sort
git ls-files docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md server/src/services/dearme-memory-context.ts server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx
git remote -v
```
