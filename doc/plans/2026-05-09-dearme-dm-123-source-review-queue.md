# DM-123 - Voice & Memory Source Review Queue

Date: 2026-05-09
Branch: `codex/dearme-dm-123-source-review-queue`

## Goal

Turn saved private source links and import notes into a reviewable DearMe queue
before they become durable Voice & Memory facts.

This continues the reuse-first path:

- link/import-note sources can be captured quickly,
- the user can review the proposed fact later,
- reviewed facts are stored through the existing Voice & Memory path,
- no crawler, upload backend, workflow builder, or new memory table is added.

## Donor Reuse

- Polsia: copy the product rhythm where a visible team prepares work and asks
  the user for a few high-leverage calls before continuing the cycle.
- Naive/Paperclip: keep source truth on existing company-scoped memory activity
  rows and the workbench projection contract.
- Lindy/internal assistant baseline: reuse compact source cards and prefilled
  review forms, translated into DearMe Voice & Memory language instead of a
  generic workflow-builder UI.

## Implementation

- Extend the shared DearMe workbench memory contract with `sourceReviewQueue`.
- Build review candidates from active memory items whose `sourceInputMode` is
  `link` or `import_note`.
- Hide a candidate when an equivalent pasted/reviewed fact already exists.
- Render a Source review section in the Voice & Memory panel.
- Let `Prepare fact` prefill the existing add form with the proposed kind,
  title, source, and body.
- Save reviewed facts as normal `paste` Voice & Memory updates.

## Rejected

- Rejected link crawling, source fetching, upload processing, or summarization
  jobs in this slice.
- Rejected adding a separate queue table before the activity-log projection
  proves insufficient.
- Rejected exposing Paperclip, provider, adapter, MCP, setup payload, or
  workflow terminology in the customer surface.

## Verification

Completed verification in this branch:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 45 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts`
  passed after the review-candidate type narrowing fix: 1 file, 2 tests.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed with exit code 0; the concurrent shard reported
  162 files passed and 1021 passed / 1 skipped tests before the serialized
  server shard completed all 81 suites.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  agent-runtime, routine, cost_event, anthropic, or claude language.
- `curl -I --max-time 5 http://127.0.0.1:3100/DEAA/dearme` returned
  `HTTP/1.1 200 OK`.
- Browser smoke opened `/DEAA/dearme` at
  `http://127.0.0.1:3100/DEAA/dearme`. Verified page title
  `Team · DearMe · DearMe`, DearMe content present, no console warn/error logs,
  and no forbidden substrate terms in the visible body. The current local seed
  has no pending source-review candidates, so the live browser route does not
  show `Source review`; that conditional UI is covered by the focused DearMe
  onboarding test.
- Mobile visual browser smoke was not run in this slice because the in-app
  browser surface did not expose viewport control and standalone Playwright was
  not installed; no new dependency was introduced for verification.
