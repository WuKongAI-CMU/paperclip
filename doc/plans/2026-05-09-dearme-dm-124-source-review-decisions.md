# DM-124 Source Reviews And Output Evidence

Date: 2026-05-09

## Product Intent

Make DearMe feel more like a visible personal brand growth team by surfacing
private source reviews in the main Decisions surface and by showing the source
evidence behind prepared work, not only the finished artifact.

## Reuse Principle

- Reuse Naive/Paperclip-style substrate already present in DearMe:
  `sourceReviewQueue`, documents, prepared work products, output details, and
  shared validators.
- Reuse Polsia's product choreography: make hidden team work visible as a few
  high-leverage calls plus proof that work is ready.
- Reuse Lindy-style interaction shape: compact action-needed cards that move the
  user to a focused review surface without exposing the underlying machinery.

## Scope

- Add typed `sourceEvidence` to DearMe output items.
- Project output source evidence from existing details, documents, work
  products, approval boundaries, and latest team notes.
- Render source evidence on focused output and private work cards.
- Add source-review cards to `Decisions needed`.
- Count source reviews as waiting decisions in the summary and growth-cycle
  review stage.
- Link the action back to the existing Voice & Memory review form instead of
  adding a new backend, importer, crawler, or workflow builder.
- Add focused UI coverage for the source-review-only decision state.

## Non-Goals

- No new API route.
- No new database table.
- No separate output provenance store.
- No link crawling or public-source ingestion.
- No user-facing donor, runtime, provider, adapter, or control-plane language.
- No auto-publish, send, deploy, spend, or external action from source evidence.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 5 files, 77 tests.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed with exit code 0. The concurrent shard reported
  162 files passed and 1021 passed / 1 skipped tests; the serialized server
  shard completed all 81 suites.
- `pnpm build` passed with existing Vite MarkdownEditor dynamic/static import
  and large-chunk warnings.
- Customer-surface hidden-term scan passed with no matches.
- `git diff --check` passed.
