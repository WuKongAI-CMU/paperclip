# DearMe Fork Note

This repo is a fork of paperclipai/paperclip (MIT) at commit d6d7a7ce
("Add routine revision history and restore flow #5285", 2026-05-05).

## Topology
- `upstream` remote = github.com/paperclipai/paperclip.git (read-only,
  for periodic merges)
- No `origin` remote (we don't push to GitHub per Peter's instruction)
- All DearMe work happens on the `dearme` branch
- The `master` branch tracks upstream untouched

## DearMe additions (planned)
1. packages/dearme-voice-plugin/ — voice profile MCP plugin
2. companies/ archetype templates × 5 (job_hunter / side_hustle /
   current_opc / career_promoter / build_in_public)
3. Naive-style cloud overlay (Better-Auth + Stripe + dm_sk_ keys)
4. UI rebrand audit (1,165 files reference "paperclip", ~10K occurrences)
5. "Dear me, day N" letter motif (override Reporting agent prompt)

## To merge upstream later
```
git fetch upstream
git checkout master && git pull upstream master
git checkout dearme && git rebase master   # or merge if conflict-heavy
```

## Setup
```
pnpm install   (52s, 1.4GB node_modules)
pnpm -r build  (build all packages — needed before plugin-sdk bin works)
pnpm dev       (dev server)
```

## Baseline state captured
- Date: 2026-05-06
- Upstream commit: d6d7a7ce
- Our branch: dearme @ same commit (0 changes ahead)
- Install verified: pnpm install exit 0, 1.4GB deps
- node v22.16.0, pnpm 9.15.4
