# DearMe Reuse Implementation Ledger

Date: 2026-05-09
Owner: DearMe coordinator thread

## Purpose

This ledger is the current coordination artifact for reuse-first DearMe work.
It answers three questions before another worker starts building:

1. Which donor source should guide the feature?
2. What DearMe implementation already exists?
3. What is the next bounded ticket that increases reuse without restarting the
   product?

DearMe should maximize reuse, but "reuse" means adapting the strongest proven
primitive into the DearMe product surface. It does not mean importing a whole
foreign UI, exposing donor terms to customers, or replacing the working
Paperclip/Naive substrate with an unverified parallel runtime.

## Current Decision

DearMe remains:

```text
Polsia choreography
+ Naive/Paperclip substrate
+ Lindy interaction patterns
+ DearMe personal-brand product shell
```

The right reuse split is:

- Polsia: product rhythm, onboarding compression, visible AI-team momentum,
  cycle/report/approval choreography, cost-aware autonomous loop patterns.
- Naive/Paperclip: auth, tenancy, agents, issues, routines, approvals,
  documents, work products, activity, cost events, adapters, and app/site
  provisioning ideas.
- Lindy: premium web interaction patterns, action cards, pending-review
  surfaces, knowledge/source management, slide-out detail panels, prompt input,
  and model routing/circuit-breaker ideas.
- Littlebird: web shell/onboarding/product polish reference when we need a
  broader customer-facing shell pass.
- Symphony: development factory pattern only; not the DearMe product runtime.

## Donor Evidence

| Donor | Local evidence | What to reuse | What not to reuse |
| --- | --- | --- | --- |
| Polsia | `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/15-PERSONAL-BRAND-FORK-SPEC.md` | 90-second wow, live work stream, mood/status choreography, manager loop, cycle/report model, personal-brand fork vocabulary, async execution + cost attribution patterns | Its visual style, raw public personal data feed, company-factory framing, or fragile in-process scheduling as the only reliability mechanism |
| Naive/Paperclip | `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`; `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`; `/Users/peter/naive-research-2026-05-05/npm-packages/` | Existing Paperclip kernel, setup_payload idea adapted as `brand_blueprint`, CEO/worker split as an internal model, cost/budget rails, app/site provisioning options | Exposed Paperclip UI language, raw issue/agent/admin controls, private endpoint names, or a direct Naive UI copy before source quality is proven |
| Lindy frontend | `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/components/KnowledgeBaseEditor.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx` | Action-card grammar, review modal shape, source/knowledge UI pattern, side-panel detail pattern, polished prompt/composer behavior | Relay/GraphQL shell, Lindy brand copy, generic agent-builder/editor surfaces, full app routing |
| Lindy internal tool | `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/convex/schema.ts` | Rule-based model routing, max-turn budgets, tool execution wrapper, consecutive-failure circuit breaker, learning after recovery, lightweight state schema ideas | Python service transplant, dashboard-specific vocabulary, Ralph naming, or replacing DearMe/Paperclip services |
| Littlebird | `/Users/peter/research/littlebird-2026-04-23/recovered-source/src` | Customer web shell, onboarding/product polish patterns, lightweight account/product flow references | Becoming the primary runtime or overfitting DearMe to a different product category |
| Symphony | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` | Isolated worker loop, bounded tickets, worktree discipline, evidence-based handoff | Product runtime, DearMe user-facing workflow, or a reason to skip coordinator integration |

## Implemented Reuse Map

| DearMe area | Current implementation evidence | Donor reuse status | Next gap |
| --- | --- | --- | --- |
| Product shell | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/components/DearMeSidebar.tsx`; `ui/src/components/Layout.tsx` | DearMe-owned shell already hides inherited Paperclip chrome on the customer path. Lindy and Littlebird remain visual/polish donors rather than wholesale imports. | Premium web polish pass after focused source and decision review behavior is usable. |
| Brand OS / `brand_blueprint` | `packages/shared/src/validators/dearme.ts`; `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/routes/dearme.ts` | Naive `setup_payload` pattern has been adapted into a typed DearMe contract and approval-gated apply flow. | Keep extending this contract only when P0 surfaces need it. |
| Workbench projection | `server/src/services/dearme-workbench.ts`; `server/src/__tests__/dearme-workbench.test.ts` | Naive/Paperclip tables remain the substrate for team, work, decisions, progress, reports, and memory projections. | Do not add a second runtime; enrich read models first. |
| Action graph and work stream | `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`; `packages/shared/src/validators/dearme.ts`; `ui/src/components/dearme/DearMeActionCard.tsx` | Polsia cycle/report choreography plus Lindy action-card grammar are already converging into customer-safe work cards. | Add richer detail panels instead of more tabs. |
| Output review and decisions | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `server/src/services/dearme-output-handoff.ts`; `server/src/__tests__/dearme-output-handoff.test.ts` | Lindy pending-action shape and Polsia "small number of high-leverage calls" are reused in Work Ready / Decisions Needed. DM-128 now lets focused prepared work be approved, revised, regenerated, or redirected inside the DearMe decision surface while Naive/Paperclip remains the hidden output review substrate. | Watch whether repeated review loops need richer history or policy cues; start DM-129 before adding more autonomous execution. |
| Voice & Memory source review | `server/src/services/dearme-workbench.ts`; `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx` | Lindy KnowledgeBase/source-management and slide-out detail patterns are now adapted: private sources become review cards, selected sources open a detail surface, reviewed facts save through the existing memory path, and not-useful sources use the existing retire path. | Watch whether reviewers need richer source history after repeated use; do not add backend shape until the current detail surface proves insufficient. |
| Weekly report and rituals | `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/services/dearme-workbench.ts` | Polsia report/cycle ritual is adapted into DearMe weekly report and daily team work language. | Add better report explanation and provenance after source drawer exists. |
| Cost and reliability | Current workbench/cycle projections; Naive cost-event docs; Lindy router/executor evidence | Partially reused. DearMe has cost/progress projection, but not a dedicated model router or circuit breaker policy yet. | DM-129 should adapt Lindy router/executor plus Naive cost attribution into a DearMe automation reliability policy before code. |
| Generated portfolio/site | Existing brand blueprint and optional generated asset layer docs | Naive app/site provisioning remains optional P1/P2, not P0. Polsia personal-brand fork recommends Brand Site Builder, but DearMe first needs review-quality content and proof. | Start only after content/voice/opportunity loop is credible. |
| Development factory | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` | Symphony-style worker queue is useful for bounded tickets after coordinator updates the queue. | Workers must use this ledger and `BUILD-STATE.md` before selecting old tickets. |

## Recently Completed

### DM-128: Focused Decision Review Drawer

Goal: make Work Ready and Decisions Needed feel like polished review work, not
a broad dashboard jump.

Donor grounding:

- Polsia approval-queue choreography for a small number of high-leverage calls.
- Naive/Paperclip output review and continuation flow as the hidden substrate.
- Lindy `ActionCard.tsx`, `LindyPendingApprovalModal.tsx`, and
  `ResizableSlideOutPanel.tsx` as interaction references.

Completed:

- Focused Work Ready and batch decision surfaces now show direct prepared-work
  review controls.
- Users can approve, request changes, prepare another pass, or choose a new
  direction without seeing raw issue or approval routes.
- Focused work/action cards remain highlighted in Work Ready, Private Work,
  and Decisions Needed while the detail surface is open.
- No new backend route, database table, drawer API, Relay/GraphQL shell, or
  donor-branded UI was added.

### DM-127: Voice & Memory Source Detail Drawer

Goal: make source review feel like a polished Lindy-style source management
surface while keeping the current Paperclip-backed memory model.

Donor grounding:

- Lindy `KnowledgeBaseEditor.tsx` and `KnowledgeBaseTile.tsx` for source list
  and configure/edit behavior.
- Lindy `ResizableSlideOutPanel.tsx` for focused source detail.
- Current DearMe `sourceReviewQueue` and DM-125 direct source focus behavior.

Expected write scope:

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/components/dearme/*` only if extracting a reusable panel/card
- Existing DearMe UI tests

Protected scope:

- No new backend route, crawler, importer, database table, or workflow runtime.
- No Relay/GraphQL/Lindy brand import.

Completed:

- `Review source` and `Prepare fact` both select the source, prefill the
  reviewed fact form, and open a source detail surface.
- The detail surface lets the user edit in the existing form, save the reviewed
  fact, close the detail, or mark the source not useful through the existing
  retire path.
- No new backend route, crawler, importer, database table, or workflow runtime
  was added.
- Focused DearMe onboarding tests cover the selected detail, save, and dismiss
  paths.

## Current Worker Queue

### DM-129: Automation Reliability And Cost Policy

Goal: turn Lindy/Naive cost and reliability primitives into a DearMe policy and
small implementation plan before adding more autonomous jobs.

Donor grounding:

- Lindy `router.py` for cheap/expensive model routing.
- Lindy `executor.py` for consecutive-failure circuit breaker and learning
  after recovery.
- Naive architecture docs for cost events, budget rails, CEO/worker split, and
  prompt-cache economics.
- Polsia source dive for `task`/subscription cost attribution and async 202
  execution.

Expected write scope:

- Docs first under `docs/dearme/`.
- Code only in a follow-up ticket after the policy is accepted by the repo
  architecture.

Acceptance:

- Defines when DearMe can auto-run, when it must ask, when it must stop
  retrying, and how cost attribution is shown to users.

### DM-130: Web Shell Polish From Lindy And Littlebird

Goal: improve the customer web shell after source/decision detail behavior is
usable.

Donor grounding:

- Lindy premium assistant UI surfaces.
- Littlebird customer web shell/onboarding patterns.
- Polsia first-screen "team is working" hierarchy.

Acceptance:

- First screen feels like a personal brand growth team, not an admin console.
- Desktop and mobile browser checks pass.

## Coordination Rules

- The coordinator thread updates this ledger and `BUILD-STATE.md`.
- Worker tickets must cite donor paths used, adapted, and rejected.
- Workers must start from the latest integrated DearMe branch/worktree, not a
  stale DM-001/DM-103 brief.
- Product-code workers should use isolated worktrees/branches.
- Do not expose Paperclip, OpenClaw, OK Partner, provider, adapter, model,
  GraphQL, Relay, MCP, setup payload, control-plane, workflow-builder,
  issue/document/work-product, or agent-runtime terms in customer-facing
  DearMe UI.

## Not Complete Yet

DearMe is not release-ready just because these reuse decisions are documented.
The next meaningful product gain is DM-129, because prepared-work review now
has a DearMe-native surface and the next risk is how autonomous work retries,
spends, pauses, and explains cost before it scales.
