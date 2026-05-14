# DearMe Architect Worktree Absorption Audit - 2026-05-14

## Decision

The 16 remaining `architect-*` worktrees were reviewed against the current
DearMe product head. None should be merged wholesale.

The useful product direction is now captured on the current main product line:
first-wow proof, Voice & Memory, launch-boundary approvals, proof-cycle
readouts, OpenClaw message proof, provider smoke, worktree status, and current
build-state evidence. The old architect branches are therefore treated as
reviewed/no-replay inputs, not active development lanes.

Future implementation should start from `/Users/peter/dearme` on the current
product branch, using this audit only as context. Do not reopen these worktrees
as parallel product sources unless their branch head changes.

## Absorption Map

| Worktree branch | Review result | Current product decision |
| --- | --- | --- |
| `architect-r2/apply-doc-audit` | Reviewed, no replay | The branch performs broad documentation deletion and relocation. Current build-state, reuse ledger, proof docs, and status scripts still rely on the existing doc graph, so the safe absorption is the audit decision itself rather than wholesale doc churn. |
| `architect-r3/approval-architecture` | Absorbed as current contract | Its four-gate idea maps to the current DearMe boundary: internal work proceeds autonomously; publishing, sending, deploying, spending, sensitive claims, and public claims stay behind the launch call. Current validators, approval receipts, workbench, and first-wow proof already carry that contract. |
| `architect-r3/brand-os-data-mapping` | Captured, no schema replay | The branch maps Brand OS objects onto Drizzle primitives, but the current P0 is first-wow proof and live-provider proof. Replaying a large schema-first plan before real-user proof would add internal surface. Keep the mapping as future schema context only. |
| `architect/consultant-wedge-pack` | Partially absorbed | The commercial wedge is consistent with the current product: DearMe sells a concrete personal-brand growth team with a 5-minute proof moment. Its 7-day consultant demo/pricing docs are useful packaging input, but the current first-wow proof is the live integration truth. |
| `architect-r4/cycle-engine` | Captured, no engine replay | The cycle-engine plan is directionally right, but current code already exposes proof cycles, next-pass readouts, status proof, and workbench continuity. A future engine should build on the current workbench/proof data instead of replaying this standalone architecture branch. |
| `architect-r2/engagement-inbox-stub` | Reviewed, no replay | The code adds an empty route stub. DearMe needs real feedback learning and live receipts, not another empty endpoint. Current review actions, Voice & Memory, output handoff, and proof receipts are the accepted feedback surface until a real inbox provider is connected. |
| `architect-r4/memory-provenance` | Absorbed as current contract | The durable-memory direction is now implemented in the shared first-cycle contract as the Voice & Memory plan, including accepted memory signals and rejected raw-source categories. |
| `architect-r4/multi-tenant-flow` | Captured, no architecture replay | The company bootstrap, typed `companyId`, cost cap, tenant isolation, suspension, deletion/export, and health-heartbeat decisions are valuable for paid operation, but the branch is doc-only. Implementation should start from the current authz, budget, company, proxy, and proof code when multi-tenant activation becomes the active product slice. |
| `architect/onboarding-split-plan` | Captured, no replay | Splitting the large onboarding file is useful maintenance work, but it is not the next commercial blocker. Keep it as a refactor candidate after first-wow/live-provider/integration proof stays green. |
| `architect-r2/opportunities-roi` | Captured, no stale DB replay | ROI columns and weekly read paths are commercially useful, but the branch includes migration/snapshot churn and a stale service slice. The product should add ROI reporting from the current schema and current first-cycle opportunity shortlist, not replay this branch wholesale. |
| `architect-r2/role-archetype-activation` | Captured, no registry replay | Per-archetype activation fits the long-term product, but current first-wow proof already activates a concrete team and deliverables. Revisit only when role activation changes visible user value in onboarding or work-ready output. |
| `architect-r3/role-canonicalization` | Captured, no replay | The canonical role registry idea is useful cleanup, but current user value comes from proof, drafts, opportunities, portfolio, memory, and launch decisions. Do not spend the next slice on role taxonomy alone. |
| `architect/schema-inheritance-markers` | Reviewed, no replay | The branch annotates many schema files with inherited-status markers. It is broad internal churn with little direct product value and high conflict risk. Current status docs and ledger provide the needed audit trail. |
| `architect/scope-cut-proposal` | Reviewed, selectively rejected | The branch proposes deferring OpenClaw and AI-proxy runtime work. Current product direction already has OpenClaw message-contract proof and local no-send proof as active launch blockers, so this scope cut is obsolete except for the general warning against exposing raw substrate complexity. |
| `architect-r4/upstream-fork-policy` | Absorbed as reuse policy | The policy matches the current product rule: reuse external platforms and open-source mechanisms when they help, adapt them into DearMe-native UX, and keep donor/provider identities backstage. Current Claude Code source reuse and Polsia/OpenClaw proof work follow this rule. |
| `architect-r3/voice-gate-architecture` | Partially absorbed | The semantic scoring architecture remains a future improvement. Current DearMe already has voice-gate checks, review-loop language, first-cycle Voice & Memory, and launch-boundary protection. A future semantic scorer should extend those contracts, not replace them. |

## Current Evidence

- First-wow proof is green and includes a Voice & Memory plan:
  `scripts/dearme-aha-proof.ts`,
  `scripts/dearme-aha-proof.test.ts`,
  `packages/shared/src/validators/dearme.ts`.
- Launch boundaries are in the shared DearMe contract:
  `packages/shared/src/validators/dearme.ts`,
  `server/src/services/dearme-approval-receipts.ts`,
  `server/src/services/dearme-workbench.ts`,
  `ui/src/pages/DearMeOnboarding.tsx`.
- Reuse has a concrete current-head proof:
  `docs/dearme/CLAUDE-CODE-SOURCE-REUSE-AUDIT.md`,
  `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`.
- Worktree cleanup is machine-readable through:
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`,
  `scripts/dearme-worktree-status.mjs`.

## Next Implementation Bias

The next product work should not reopen these architect branches. The strongest
commercial next slices are:

1. Turn captured ROI direction into a current-head revenue/proof report that
   uses the existing first-cycle opportunity shortlist and receipts.
2. Implement paid multi-tenant activation from the current authz, company,
   budget, proxy, and proof code when account/payment closure becomes active.
3. Connect a real engagement/support feedback source only when it returns real
   review signals, not an empty inbox.
4. Add semantic voice scoring only as an extension of the current Voice &
   Memory and launch-boundary contracts.
5. Split onboarding only when the refactor directly improves velocity for a
   product slice already being implemented.
