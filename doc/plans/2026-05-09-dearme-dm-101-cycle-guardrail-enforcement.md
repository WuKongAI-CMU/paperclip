# DM-101 - DearMe Cycle Guardrail Enforcement

Date: 2026-05-09
Branch: `codex/dearme-dm-101-cycle-guardrail-enforcement`
Base: `codex/dearme-dm-100-integrated` at `efafc054`

## Intent

Extend the DM-100 paid-beta cycle guardrail from Brand OS apply requests to
output review actions that start more private work.

This keeps DearMe's Polsia-style automation loop high-output while reusing the
existing Naive/Paperclip finance, cost, and wakeup substrate instead of adding a
second DearMe-specific usage system.

## Donor Reuse

- Polsia: preserve the visible loop where the user reviews prepared work and
  sends the team back into motion.
- Naive/Paperclip: reuse paid-beta finance events, current-month cost summary,
  route authz, output review, activity log, and issue wakeup rails.
- Lindy: preserve the action-needed decision pattern: approve prepared work or
  ask the system to revise/regenerate from the same review card.

## Scope

- Add one reusable server helper:
  `describeDearMePrivateCycleBlocker(access)`.
- Use the helper before Brand OS apply requests.
- Use the helper before output review actions that wake more private work:
  `request_changes`, `regenerate`, and `not_useful`.
- Keep `approve` available without a paid-beta guardrail check because it does
  not queue a private regeneration cycle.

## Files

- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/routes/dearme.ts`
- `server/src/__tests__/dearme-paid-beta-access.test.ts`
- `server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `docs/dearme/BUILD-STATE.md`
- `doc/plans/2026-05-08-dearme-dm-merge-queue.md`

## Verification

- `pnpm exec vitest server/src/__tests__/dearme-paid-beta-access.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run --maxWorkers=1`
  passed: 2 files, 34 tests.

## Release Notes

This is a narrow backend guardrail slice. It does not add new UI, schema,
dependencies, migrations, or billing primitives.

Before release promotion, rerun the broader DearMe and workspace verification
set from the coordinator branch.
