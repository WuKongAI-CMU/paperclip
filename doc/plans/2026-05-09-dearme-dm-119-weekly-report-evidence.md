# DM-119 Weekly Report Evidence Digest

Date: 2026-05-09
Branch: `codex/dearme-dm-119-weekly-report-evidence`

## Intent

Make the weekly Dear me report feel like a Polsia-style cycle review while
still standing on DearMe's current Paperclip/Naive substrate and Lindy-inspired
web grammar.

The user should not just see a report document preview. They should see:

- what changed,
- what needs their call,
- what the team learned,
- what the next cycle should push.

## Reuse Sources

- Polsia: nightly/weekly review loop with accomplished work, blockers, and next
  priorities.
- Naive/Paperclip: work items, approvals, documents, activity, memory updates,
  routine-derived cycle check-ins, and spend checkpoints.
- Lindy: compact web evidence blocks that make action state scannable without
  showing raw workflow-builder machinery.

## Implementation

1. Extend the shared DearMe workbench report contract with:
   - `accomplished`
   - `decisions`
   - `learnings`
   - `nextBets`
2. Build those arrays in `dearme-workbench` from existing workbench state.
3. Render those sections inside the weekly Dear me panel.
4. Extend shared/server/UI tests to prove the digest exists and does not leak
   substrate vocabulary.
5. Update DearMe build-state and reuse docs.

## Verification

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 40 tests.
- `git diff --check` passed.
- Touched customer-surface scan for `Paperclip`, `OpenClaw`, `adapter`,
  `provider`, `model-provider`, `setup-payload`, `setup_payload`,
  `control-plane`, `raw issue`, `cost-event`, and `routine` passed; matches
  are internal service/test setup plus explicit no-leak assertions.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.

## Stop Conditions

- Do not introduce a new report table, new runtime event stream, new queue, or
  standalone DearMe execution path.
- Do not expose Paperclip, provider, routine, adapter, setup-payload, or raw
  cost-event language in the customer surface.
- Keep risky publish/send/deploy/spend moves approval-gated.
