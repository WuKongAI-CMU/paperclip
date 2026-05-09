# DM-125: Direct Source Review Focus

Date: 2026-05-09
Branch: `codex/dearme-dm-125-source-review-focus`

## Intent

Make a source-review decision feel like a direct high-leverage action instead
of a loose jump to the Voice & Memory panel.

DM-124 promoted source reviews into Decisions, but the `Review source` action
only scrolled to the broader Voice & Memory surface. That preserved reuse but
left the user to find the exact pending source again. DM-125 keeps the same
substrate and makes the action land on the specific review card with the
proposed fact already prefilled.

## Reuse

- Polsia pattern: a visible workstream should collapse into one concrete user
  call, not a technical dashboard.
- Lindy pattern: action-needed cards should open the exact prepared item.
- Naive/Paperclip substrate: no new backend, route, source table, importer, or
  agent runtime. Reuse the existing DearMe workbench memory queue and Voice &
  Memory form.

## Scope

- Wire Decisions `Review source` to the exact `sourceReviewQueue` item.
- Scroll to that source review card instead of only the outer Voice & Memory
  panel.
- Prefill the existing Voice & Memory fact form from the selected review item.
- Add a small visual focus ring on the selected source review card.
- Extend the existing UI test to lock the direct-focus behavior.

## Out Of Scope

- No crawler, upload pipeline, import job, new API route, new database table, or
  external connector.
- No auto-save and no public action.
- No user-facing Paperclip, provider, adapter, setup payload, agent runtime, or
  workflow-builder language.

## Verification

Completed:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 30 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed with existing Vite MarkdownEditor dynamic/static import
  and large-chunk warnings.
- `git diff --check` passed.
- Customer-surface substrate scan over the touched UI files passed with no
  donor/runtime/provider terminology leaks.
- `pnpm test:run` did not pass under full-suite concurrency because
  `DearMeOnboarding.test.tsx` hit the existing 5s first-test timeout and then
  cascaded failures inside that file. The same file passed standalone.

Not run:

- Manual browser visual smoke. This slice changes a small focus/prefill
  interaction covered by the focused UI test.
