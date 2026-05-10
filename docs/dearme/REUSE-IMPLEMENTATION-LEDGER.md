# DearMe Reuse Implementation Ledger

Date: 2026-05-10
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

## Latest Polsia vs Naive Read - 2026-05-09

The refreshed comparison is captured in
`docs/dearme/POLSIA-NAIVE-COMPARISON.md`.

Conclusion:

- Polsia wins the customer-visible layer: onboarding compression, immediate
  wow, visible team motion, cycle/report rhythm, and high-leverage decisions.
- Naive/Paperclip wins the execution layer: tenancy, issue ownership,
  heartbeats, approval gates, worker isolation, app/site rails, cost events,
  and budget preflight.
- DearMe should keep a Polsia-style personal brand growth team on top of a
  Naive/Paperclip-style substrate. Do not turn the product into either a
  company factory or an agent admin console.

Working rule:

- For product-demo and aha-loop questions, start from Polsia.
- For execution-state, approval, budget, isolation, and scheduling questions,
  start from Naive/Paperclip.
- Bias toward autonomy for private work: research, planning, sample output,
  drafting, reporting, previews, and memory updates should move without asking.
  Keep explicit gates for the few actions that actually publish, send, deploy,
  spend, or materially represent the user.

## Donor Evidence

| Donor | Local evidence | What to reuse | What not to reuse |
| --- | --- | --- | --- |
| Polsia | `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/08-POLSIA-WEAKNESSES.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/CYCLE_ENGINE.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/AGENT_PROMPTS.md` | 90-second wow, live work stream, mood/status choreography, manager loop, cycle/report model, personal-brand fork vocabulary, async execution + cost attribution patterns | Its visual style, raw public personal data feed, company-factory framing, shared social identity, or fragile in-process scheduling as the only reliability mechanism |
| Naive/Paperclip | `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`; `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`; `/Users/peter/naive-research-2026-05-05/FINAL-FINDINGS.md`; `/Users/peter/naive-research-2026-05-05/NAIVE-CATALOG-SUMMARY.md`; `/Users/peter/naive-research-2026-05-05/naive-default-agent-prompts/ceo/AGENTS.md` | Existing Paperclip kernel, setup_payload idea adapted as `brand_blueprint`, CEO/worker split as an internal model, cost/budget rails, template catalog, app/site provisioning options | Exposed Paperclip UI language, raw issue/agent/admin controls, private endpoint names, or a direct Naive UI copy before source quality is proven |
| Lindy frontend | `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/components/KnowledgeBaseEditor.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx` | Action-card grammar, review modal shape, source/knowledge UI pattern, side-panel detail pattern, polished prompt/composer behavior | Relay/GraphQL shell, Lindy brand copy, generic agent-builder/editor surfaces, full app routing |
| Lindy internal tool | `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/convex/schema.ts` | Rule-based model routing, max-turn budgets, tool execution wrapper, consecutive-failure circuit breaker, learning after recovery, lightweight state schema ideas | Python service transplant, dashboard-specific vocabulary, Ralph naming, or replacing DearMe/Paperclip services |
| Littlebird | `/Users/peter/research/littlebird-2026-04-23/recovered-source/src` | Customer web shell, onboarding/product polish patterns, lightweight account/product flow references | Becoming the primary runtime or overfitting DearMe to a different product category |
| Symphony | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`; `.symphony/WORKFLOW.md`; `/Users/peter/symphony` | Isolated worker loop, bounded tickets, worktree discipline, evidence-based handoff | Product runtime, DearMe user-facing workflow, or a reason to skip coordinator integration |

## Implemented Reuse Map

| DearMe area | Current implementation evidence | Donor reuse status | Next gap |
| --- | --- | --- | --- |
| Product shell | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/components/DearMeSidebar.tsx`; `ui/src/components/Layout.tsx` | DearMe-owned shell already hides inherited Paperclip chrome on the customer path. DM-130 adapts Polsia's "work happened while I was away" choreography, Lindy's two-rail home composition, and Littlebird's focused step/task-row discipline into the first workbench surface. DM-131 browser-polished the focus grid so the live desktop/mobile shell keeps the current work card compact and readable. DM-132 adds a DearMe-specific mobile nav so the phone shell routes users to Home, Decisions, Work Ready, Voice, and More without showing generic workspace destinations. DM-133 makes focused decision actions mobile-safe. DM-134 adds a Brand Team Run Ledger so the first product surface records what the team tried, prepared, learned, and needs from the user. DM-135 renders the first-run generated package with its approval boundary, proving that one positioning answer can produce useful team work without exposing runtime machinery. DM-136 reuses the same first-cycle contract for a private sample package so the shell proves the team output before personal input; the integration update adds a visible `autonomyPlan` so sample and generated proof both say "Autopilot until launch" and wait only at the four launch gates. DM-138A changes the CTA from read-only preview into a private first-cycle start. DM-138B makes the Polsia-style proof sequence first-class in the preview response and renders identity dossier, audience map, and private site proof from that contract. DM-138C hydrates the same proof cards from prepared documents and work products through the DearMe output handoff. DM-138D now writes those output-handoff artifacts during first-cycle start, so the returned proof package can be source-labelled immediately from real private documents. DM-138E browser-smoked the live paid-beta path and kept the surface free of donor/runtime vocabulary. DM-139/DM-140 now share a private cycle output packet that turns prepared outputs into a voice-scored content draft and Dear me report through the same output handoff, projects that packet into the workbench/report read model, and renders the Dear me letter plus workbench card surfaces as one private proof-pack language system. DEA-7 carries that Voice Gate result into focused work, work cards, and proof-pack cards as a customer-safe Voice check, so the user can see why private work is ready without seeing provider/runtime fields. The live Symphony-aligned `DEAAAAAAAAA` browser proof now confirms the packet-backed aha loop across workbench, Dear me letter, and focused review on desktop and mobile without hidden donor/runtime terms. DM-141 adds `?view=opportunities` as a focused opportunity command center that reuses the same workbench, prepared-output, and launch-call approval model for private opportunity drafts. | Next high-value product gap is letting real Symphony content workers produce fresh packets repeatedly and watching whether review history needs richer failure context; do not create a second first-run contract or runtime UI. |
| Brand OS / `brand_blueprint` | `packages/shared/src/validators/dearme.ts`; `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/routes/dearme.ts` | Naive `setup_payload` pattern has been adapted into a typed DearMe contract and approval-gated apply flow. DM-136 adds the shared first-cycle `autonomyPlan` and `DEARME_FIRST_CYCLE_CONCERN_GATES`, making the four launch decisions a code-level contract instead of a copy convention. DM-138A consumes that same preview request/response for first-cycle start and does not add another first-run payload. DM-138B adds `proofSequence` to the same response, so UI and private issue creation share the 0-30s / 60-120s / 3-5min proof order. DM-138C reuses the existing output handoff to populate that sequence from real prepared artifacts and rejects plain progress notes as proof. DM-138D adds `prepareFirstCycleProofOutputs(...)`, creating/updating the known output fingerprints and markdown docs before the start route returns the preview. DM-138E reopens stale proof issues to `in_review` and makes output projection prefer the newest issue per fingerprint, so old cancelled review history cannot suppress the current proof package. | Keep extending this contract only when P0 surfaces need it; next product value should come from autonomous reporting/content generation, not more first-cycle schema. |
| Workbench projection | `server/src/services/dearme-workbench.ts`; `server/src/__tests__/dearme-workbench.test.ts`; `server/src/routes/dearme.ts`; `ui/src/api/dearme.ts`; `ui/src/pages/DearMeOnboarding.tsx` | Naive/Paperclip tables remain the substrate for team, work, decisions, progress, reports, and memory projections. DM-179 exposes that projection as the initial `sync` frame on the DearMe live workbench stream, then forwards typed `dearme-sse-bus` events by company. DM-181 consumes the same stream in the customer workbench by updating the existing React Query cache on `sync` and invalidating it on broader runtime events. DM-182 folds OpenClaw lifecycle / stream passthroughs into that same invalidation path. DM-138A emits first-cycle `task_created`, `thinking_stream`, and `agent_completed` events through the same bus so the onboarding start path lands in the existing live workbench refresh lane. DM-139/DM-140 now detects packet-backed output handoff documents/work products and projects the same private packet through Work Ready, Decisions, report digest, work stream, run ledger, and action graph without adding shared schema fields. The UI consumes that report projection directly and translates internal packet wording into proof pack language across report, ready-work, decisions, live feed, run ledger, action graph, Voice & Memory, focused detail surfaces, and the proof pack continuity ribbon. DEA-7 now also projects the latest worker lifecycle event into a customer-safe `Live team pulse` using the same EventSource listener, so private Symphony/OpenClaw motion feels active without adding another runtime UI. DEA-7 browser proof confirmed that one real generated packet now reaches the existing projection, letter, and focused review route. | Do not add a second runtime; let Symphony worker output keep feeding the existing packet-backed event consumer and customer UI first. |
| Action graph and work stream | `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`; `packages/shared/src/validators/dearme.ts`; `ui/src/components/dearme/DearMeActionCard.tsx` | Polsia cycle/report choreography plus Lindy action-card grammar are already converging into customer-safe work cards. DM-133 makes focused decision/detail actions mobile-safe without changing the hidden approval/output-review substrate. DM-134 adds a typed `runLedger` read model derived from the existing workbench stream, with latest memory as a fallback, without adding another event table. | Use the ledger as the customer-facing progress spine before adding notification or report surfaces. |
| Output review and decisions | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `ui/src/api/dearme.ts`; `server/src/routes/dearme.ts`; `server/src/services/dearme-output-handoff.ts`; `server/src/__tests__/dearme-output-handoff.test.ts` | Lindy pending-action shape and Polsia "small number of high-leverage calls" are reused in Work Ready / Decisions Needed. DM-128 now lets focused prepared work be approved, revised, regenerated, or redirected inside the DearMe decision surface while Naive/Paperclip remains the hidden output review substrate. DM-139/DM-140 adds `prepareCycleOutputPacket(...)`, which reuses output handoff, documents, work products, and Voice Gate so content drafts and the Dear me report stay coupled to the same private evidence packet. DEA-7 adds `dearMeContentDraftPacketSchema`, `persistContentDraftPacket(...)`, and the company-scoped `content-draft-packets` route/API client, letting Symphony content workers save private review packets into the same handoff table, then renders parsed `voiceGate` results without exposing provider metadata. The rerun-key follow-up makes `packetId` mandatory, so worker retries update the same private review work product instead of stacking duplicates. DM-141 routes `opportunity_drafts` through the same private review lane with a focused opportunity view, so opportunity work changes presentation and filtering, not the approval substrate. DM-183F replays the useful DM-031/DM-032 residue by showing card-level prepared-by team attribution and switching generated DearMe decision links to `work=` while preserving legacy `issue=` deep-link parsing. | Watch whether repeated review loops need richer server-owned failure history after real usage; extend the packet before adding new review surfaces. |
| Voice & Memory source review | `server/src/services/dearme-workbench.ts`; `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx` | Lindy KnowledgeBase/source-management and slide-out detail patterns are now adapted: private sources become review cards, selected sources open a detail surface, reviewed facts save through the existing memory path, and not-useful sources use the existing retire path. | Watch whether reviewers need richer source history after repeated use; do not add backend shape until the current detail surface proves insufficient. |
| Weekly report and rituals | `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/services/dearme-workbench.ts`; `server/src/services/dearme-output-handoff.ts` | Polsia report/cycle ritual is adapted into DearMe weekly report and daily team work language. DM-139/DM-140 now writes the Dear me report from the same private cycle packet as content drafts, with voice-fit and next-decision provenance carried in documents and work products, makes the report digest point back to the same review packet, and renders the visible report as a one-pass proof pack review. DEA-7 makes the companion content packet independently persistable while keeping report/content review tied to the same proof and launch boundary. | Let real cycle usage decide whether the report needs richer history; keep the first report surface packet-backed. |
| Cost and reliability | `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md`; `ui/src/pages/DearMeOnboarding.tsx`; current workbench/cycle projections; Naive cost-event docs; Lindy router/executor evidence | DM-129 adapts Polsia task/subscription attribution, Naive pre-invocation budget rails, and Lindy routing/circuit-breaker behavior into a DearMe policy plus a customer-safe workbench panel. | Add backend policy facts only when future autonomous jobs need state that cannot be derived from the current workbench and paid-beta status. |
| Generated portfolio/site | Existing brand blueprint and optional generated asset layer docs | Naive app/site provisioning remains optional P1/P2, not P0. Polsia personal-brand fork recommends Brand Site Builder, but DearMe first needs review-quality content and proof. | Start only after content/voice/opportunity loop is credible. |
| Development factory | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`; `.symphony/WORKFLOW.md`; `scripts/dearme-worktree-status.mjs`; `/Users/peter/symphony`; `/private/tmp/dearme-symphony-workspaces` | Symphony-style worker queue is now the cooperation spine for bounded tickets. DM-183 turns the local worktree inventory into a ticket-aware coordinator report with purpose labels and next-action buckets. DM-183B adds `patch_equivalent` so cherry-pick-equivalent worker heads can be closed only after owner confirmation instead of replayed as fresh product slices; the current live audit found 0 such branches, so `not_in_current` still means content review is required. DM-183C folds real Symphony workspace repos into the same report, detects DEA tickets, and separates active or absorbed `symphony` lanes from stale worker branches. DM-183E adds `subject_matched` for stale worker tips whose commit subject already appears in current head: these remain `not_in_current`, but workers should inspect only residual diff before replay or closure. `AGENTS.md` now points DearMe product workers to `.symphony/WORKFLOW.md` before the architecture docs so the active queue, Linear scope, and workspace discipline stay first-class. The real daemon now routes by Linear team `DEA` plus `assignee: me`, because DearMe has no Linear Project. The `DEA-7` Symphony workspace now reports `in_current` with the action `absorbed Symphony lane; keep as audit trail or close after owner confirmation`; future coordinator integration should keep consuming issue-scoped Symphony lanes rather than spawning parallel content runtimes. The latest coordinator pass absorbed the opportunity workbench and generated-skill wrapper hardening as small product-facing increments, which is the preferred Symphony loop shape. | Workers must use Linear issue scope, `AGENTS.md`, this ledger, `BUILD-STATE.md`, `.symphony/WORKFLOW.md`, and `pnpm dearme:worktrees -- --summary-only --skip-dirty` before selecting old tickets. |

## Recently Completed

### DEA-7: Proof Pack Continuity, Rerun Key, and Live Pulse

Goal: let real Symphony content workers retry safely while making the customer
see one continuous private proof pack instead of disconnected artifacts.

Donor grounding:

- Polsia: keep the daily product surface centered on one visible momentum loop,
  not scattered task telemetry.
- Naive/Paperclip: reuse issue work products, output handoff, route validation,
  and the existing workbench projection instead of adding another content
  runtime table.
- OpenClaw/Symphony: workers provide packet ids as stable rerun keys; the
  customer sees proof-pack continuity and live private-team motion, not runtime
  ids, provider fields, or orchestration names.

Completed:

- Made content `packetId` mandatory and reused the existing `externalId` update
  path so a worker retry with the same packet id updates the same private
  review work product.
- Added the workbench `Proof pack continuity` ribbon that connects Voice &
  Memory, Work Ready, the Dear me letter, and launch calls from the same
  private proof pack.
- Added a compact current-proof-pack row inside that ribbon, making the path
  from proof pack to next move to launch call visible before users inspect the
  supporting cards.
- Added a `Live team pulse` projection from existing workbench SSE events so
  worker progress becomes visible customer momentum without exposing Symphony,
  OpenClaw, runtime, provider, or model terms.
- Renamed the opportunity workbench surface from packet wording to lead
  batches, opportunity drafts, and launch calls so the scout lane stays in the
  same customer language system.
- Extended route/service/UI tests to cover missing packet ids, retry updates,
  hidden-term-free continuity copy, hidden-term-free live pulse copy, and
  packet-free opportunity copy.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme?view=opportunities`
- `.symphony/bin/dearme-symphony status`

### DM-138A: First-Cycle Start Bridge

Goal: turn the first positioning answer into private work immediately while
preserving the existing first-cycle proof contract.

Donor grounding:

- Polsia: compress the first session into visible momentum and a "First 5
  minutes" proof timeline.
- Naive/Paperclip: reuse company access, board checks, issues, activity logs,
  wakeups, and the existing workbench stream instead of a new first-run runtime.
- OpenClaw: keep worker execution backstage; the customer sees Team progress,
  not runtime setup or adapter terms.

Completed:

- Added `POST /api/dearme/companies/:companyId/first-cycle/start`, which
  consumes the existing preview schema and returns the existing
  `DearMeFirstCyclePreviewResponse`.
- The start route creates a private first-cycle issue, records a
  `dearme.first_cycle_started` activity event, emits customer-safe workbench
  stream frames, and wakes the chief-of-staff lane.
- The onboarding CTA now calls `startFirstCycle(...)` rather than the read-only
  preview route.
- The proof package now shows the first-run proof order: 0-30s identity
  dossier, 60-120s audience map, and 3-5min private site proof.
- Trial/private-cycle lock users still receive the existing blocker response;
  no public send, deploy, spend, or sensitive external action is triggered.

Verification:

- `pnpm exec vitest run ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/api/dearme.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx server/src/routes/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts doc/plans/2026-05-08-dearme-symphony-operating-loop.md docs/dearme/POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

### DM-138B: First-Run Proof Sequence Contract

Goal: make the first-run personal proof sequence part of the single shared
preview response instead of a UI-only timeline or a second payload.

Donor grounding:

- Polsia: preserve the first-session shock with visible 0-30s, 60-120s, and
  3-5min progress.
- Naive/Paperclip: keep a typed shared contract and hidden issue/workbench
  substrate instead of adding another runtime surface.
- OpenClaw: leave worker orchestration backstage; customer surfaces only show
  identity, audience, and private proof work.

Completed:

- Added `proofSequence` to `DearMeFirstCyclePreviewResponse` with exactly
  three windows: identity dossier, audience map, and private site proof.
- Updated the first-cycle preview builder to derive the sequence from the
  same positioning, audience, proof, and offer fields already used by starter
  posts, opportunity lead, and portfolio proof card.
- Updated `POST /api/dearme/companies/:companyId/first-cycle/start` to create
  the private work issue from `proofSequence`, keeping coordinator work order
  aligned with the UI.
- Updated the onboarding proof package to render `proofSequence` directly for
  sample and generated first-run proof.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 86 tests.

Follow-up:

- DM-138C now attaches prepared output handoff artifacts to this contract. The
  remaining gap is an end-to-end worker/browser proof, not a new payload shape.

### DM-138C: First-Run Proof Hydration

Goal: make the existing first-run proof sequence reuse prepared worker output
without adding another customer contract.

Donor grounding:

- Polsia: keep the first-session sequence visible and fast.
- Naive/Paperclip: reuse durable documents and work products as the hidden
  source of truth for prepared proof.
- DearMe product shell: keep the customer surface on identity, audience, and
  private proof cards, not runtime machinery.

Completed:

- `previewFirstCycle(...)` now asks the DearMe output handoff for prepared
  outputs and hydrates `proofSequence` from matching documents/work products.
- Brand OS / voice, content, opportunity, portfolio, and report outputs map
  into the existing 0-30s, 60-120s, and 3-5min windows.
- The implementation keeps the single
  `DearMeFirstCyclePreviewResponse.proofSequence` contract for UI, start route,
  and coordinator work order.
- Progress comments alone no longer count as first-run proof; the hydrator only
  trusts prepared documents or work products.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 36 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- `git diff --check` passed for the service/test/docs slice.

Remaining gap:

- DM-138D now writes first-cycle proof outputs through the same output handoff
  path that hydrates the preview. The remaining live check is `DEA-5` /
  `DM-138E`: run the same first-cycle path through Symphony where available
  and browser-smoke the customer package.

### DM-138D: Start-Route Proof Output Write

Goal: make first-cycle start prepare the private proof artifacts itself, then
return the same source-labelled `proofSequence` contract to the customer shell.

Donor grounding:

- Polsia: preserve the first-session identity/audience/private-site proof
  sequence as the visible aha path.
- Naive/Paperclip: reuse the private issue, activity log, and live event
  substrate as the hidden work order.
- Symphony: keep this as a bounded integration proof, now followed by `DEA-5`
  for the live worker/browser smoke.

Completed:

- Added `prepareFirstCycleProofOutputs(...)` to the Brand Blueprint service.
- Reused the existing Brand Blueprint output handoff fingerprints and document
  service to write Brand OS, Voice Profile, approval gates, starter posts,
  opportunity list, portfolio update, and Dear me report docs during
  first-cycle start.
- Made the write idempotent: repeated starts update the same five output issues
  instead of creating duplicate proof packages.
- Kept route propagation covered so the prepared labels still flow into the
  private issue description, activity-log `artifactOrder`, and
  `task_created` event payload.

Verification:

- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 37 tests.

### DM-139 / DM-140: Shared Cycle Output Packet

Goal: move autonomous reporting and voice-gated content production forward by
reusing the existing output handoff path, not by creating a second report or
content runtime.

Donor grounding:

- Polsia: the cycle should end with a plain private report and a small number
  of high-leverage next decisions.
- Naive/Paperclip: issues, documents, work products, and service projections
  are the durable hidden source of truth.
- DearMe product shell: the user sees content, a Dear me report, voice fit,
  and review choices; not provider, runtime, or worker machinery.

Completed:

- Added `prepareCycleOutputPacket(...)` to the DearMe output handoff service.
- The packet reads the current Brand OS, voice profile, content draft,
  opportunity, portfolio, and report outputs, scores the draft with the
  existing Voice Gate, and writes synchronized `content-drafts` and
  `dear-me-report` documents.
- The content and report issues are reopened to `in_review` and receive primary
  `dearme-cycle-output` work products, so later workbench/report surfaces have
  one shared server-side packet to project.
- First-cycle start now invokes the packet after writing the first proof
  outputs, giving the initial aha path a voice-scored content artifact and a
  private report from the same evidence.
- The DearMe workbench now detects the same packet through output handoff text
  and projects it into Work Ready, Decisions, report digest, work stream, run
  ledger, and action graph nodes as one private review surface.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 9 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed: 43 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 12 tests.

### DM-S01: Company PATCH Mass-Assignment Hardening

Goal: close the inherited Paperclip mass-assignment exposure before any
paid-beta gate opens.

Donor grounding:

- Naive security probe (recorded in
  `naive-research-2026-05-05/SECURITY-FINDINGS.md`) showed
  `PATCH /api/companies/:id` accepted `budgetMonthlyCents`,
  `spentMonthlyCents`, `requireBoardApprovalForNewAgents`,
  `attachmentMaxBytes`, and `status` without an allow-list.
- Paperclip OSS has the same shape upstream, so DearMe inherits the bug
  through the fork.

Acceptance:

- `updateCompanySchema` is `.strict()` and only accepts safe self-service
  fields (`name`, `description`, `feedbackDataSharingEnabled`,
  `feedbackDataSharingTermsVersion`, `brandColor`, `logoAssetId`).
- `updateCompanyGovernanceSchema` is `.strict()` and accepts
  `status`, `budgetMonthlyCents`, `attachmentMaxBytes`, and
  `requireBoardApprovalForNewAgents` only.
- `PATCH /api/companies/:companyId/governance` enforces `assertBoard(req)`
  and routes budget changes through `budgets.upsertPolicy(...)`.
- `spentMonthlyCents` is no longer mutable through any company PATCH path
  (must be aggregated from `cost_events`).
- Unit tests in `packages/shared/src/validators/company.test.ts` cover
  the rejected attack vectors and the accepted safe fields.

### DM-136: First-Run Sample Demo Proof

Goal: make DearMe's first-run surface understandable before the visitor enters
their own positioning answer.

Donor grounding:

- Polsia first-wow packaging: a user should see visible work immediately.
- Naive/Paperclip hidden substrate: reuse the typed first-cycle preview
  generator and the same public-action boundary contract.
- Lindy review grammar: separate prepared private work from the user's launch
  decision without making caution the first product emotion.
- Littlebird web ergonomics: keep the sample package compact inside the current
  shell.

Completed:

- Added a sample first-cycle package for Maya Chen that includes a Voice
  Profile, Voice Gate, starter posts, opportunity lead, portfolio proof card,
  first growth plan, and launch boundary.
- Refactored first-cycle rendering so the sample state and generated user state
  share the same proof-package component.
- Added UI coverage proving the sample renders without a backend preview call
  and is replaced after the user starts their own first cycle.
- Added `POLSIA-NAIVE-PM-ANALYSIS.md` as the PM/product-architect layer above
  the existing architecture comparison and implementation reuse plan.

### DM-136 Integration Update: First-Run Autopilot Plan Contract

Goal: make the sample proof, generated proof, shared API contract, and product
doctrine all say the same thing: DearMe keeps working privately and waits only
before launch actions.

Donor grounding:

- Polsia: visible autonomy first; the team should look like it is already
  moving, not waiting for setup.
- Naive/Paperclip: use the existing typed preview response and approval
  boundary instead of creating another first-run runtime.
- Lindy: present the few user decisions as reviewable launch calls after the
  work is prepared.

Completed:

- Added `autonomyPlan` to `DearMeFirstCyclePreviewResponse`.
- Exported `DEARME_FIRST_CYCLE_CONCERN_GATES` so the first-cycle UX and tests
  share the exact four launch gates: publish, send, public-site change, spend.
- Rendered the autonomy plan inside the first-cycle proof package for both
  sample and generated states.
- Removed first-run sensitive-proof blocking language from the customer launch
  boundary; sensitive/public-claim risk remains a policy check, not a fifth
  first-run concern screen.
- Documented the update in `BUILD-STATE.md`, `INDEX.md`, `README.md`, and
  `PRODUCT-ARCHITECTURE.md`.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx`
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- Playwright browser check on `http://127.0.0.1:3100/DEAA/dearme`

### DM-181: Live Workbench UI Consumer

Goal: make the existing workbench feel alive after the server-side live stream
exists, without adding a customer-visible runtime console.

Donor grounding:

- Polsia live-work choreography: the surface should show that the team moved.
- Naive/Paperclip hidden substrate: reuse the existing workbench projection and
  React Query cache instead of adding another state tree.
- Lindy review grammar: keep the customer focused on updated work and
  decisions, not event plumbing.

Completed:

- Added `dearmeApi.openWorkbenchEvents(companyId)` for the company-scoped
  workbench stream.
- Subscribed the DearMe workbench page to `sync` and runtime-update events.
- Applied `sync` frames directly to the workbench query cache and debounced the
  broader runtime events into a normal query invalidation.
- Added UI coverage proving a live `sync` frame updates the rendered headline
  and summary, and that the stream closes on unmount.

### DM-182: OpenClaw Passthrough Workbench Refresh

Goal: let OpenClaw execution progress update the same customer-safe Team
workbench without exposing a runtime console or forcing a second subscription.

Completed:

- Added `openclaw_lifecycle` and `openclaw_stream` to the existing DearMe
  workbench refresh event set.
- Added UI coverage proving a lifecycle passthrough invalidates and refetches
  the workbench projection, so execution movement lands as Team progress.

### DM-180: Approval Resolver API Boundary

Goal: expose the existing cloud approval resolver through the DearMe API so
OpenClaw/outbound paths and the customer workbench use the same decision
record, issue link, and audit trail.

Completed:

- Added shared validators for approval resolve requests and route responses.
- Added `POST /api/dearme/companies/:companyId/approvals/resolve` with company
  access checks, cross-company issue rejection, issue identifier normalization,
  and activity-log recording.
- Updated the resolver to persist both user and agent attribution on
  `approvals` and `issue_approvals`.
- Updated the outbound tool wrapper to call the resolver through the same
  attribution-aware input shape.

### DM-183: Symphony Worktree Status Contract

Goal: make the many local Symphony-style worktrees usable as a reuse queue
without encouraging blind branch merges.

Donor grounding:

- Symphony: isolated worker discipline and evidence-based handoff.
- Naive/Paperclip: keep git worktree state as the substrate fact source.
- DearMe product architecture: coordinator owns merge/replay decisions; old
  worker branches are candidates, not product truth.

Completed:

- Added ticket extraction, purpose classification, and coordinator next-action
  annotations to `scripts/dearme-worktree-status.mjs`.
- Added filters for status, ticket, dirty-only, limits, summary-only, and
  skip-dirty runs.
- Added `pnpm test:dearme-worktrees` with focused Node coverage for parsing,
  filtering, summary buckets, ticket extraction, and `pnpm --` argument
  handling.
- Verified that the current local inventory is 116 records: 1 current, 2
  absorbed, 113 not in current, 19 integration-style, and 96 worker-style.
- Verified that no active DM-138 worktree exists, so the next DM-138 product
  slice should start fresh from the current integration head.

### DM-135: First-Run Sample Team Proof

Goal: make the first DearMe run prove the team shape before a customer connects
real channels or trusts deeper automation.

Donor grounding:

- Polsia first-wow choreography: multiple lanes should visibly move from one
  user direction.
- Naive/Paperclip hidden substrate: reuse the existing first-cycle preview
  contract, route, service, and UI API instead of adding another runtime.
- Lindy review grammar: show what is prepared and what remains approval-gated
  before external action.
- Littlebird web ergonomics: keep the proof package compact enough for the
  customer shell.

Completed:

- Confirmed the existing preview contract already returns a Voice Profile, three
  starter posts, one opportunity lead, one portfolio proof card, and one first
  growth plan.
- Rendered the preview's approval boundary and blocked public actions next to
  the generated first-run package.
- Added focused UI coverage for the approval boundary.
- Verified the slice on desktop and mobile browser viewports without
  donor/runtime language leaking into the customer path.
- After integration, reran full workspace typecheck, test, and build gates.

### DM-134: Brand Team Run Ledger

Goal: turn Polsia-style live progress into a DearMe-safe record of what the
team tried, prepared, learned, and needs from the user.

Donor grounding:

- Polsia live work stream and "work happened while I was away" packaging.
- Naive/Paperclip workbench projection as the hidden source of truth.
- Lindy action-card grammar and review-first status surfaces.
- Littlebird compact mobile shell discipline.

Completed:

- Added a customer-safe `Brand Team Run Ledger` panel to the workbench.
- The ledger has Tried, Prepared, Learned, and Needs your call buckets.
- Added a shared `runLedger` workbench contract and server-side projection.
- Entries are derived from the existing workbench stream, with latest Voice &
  Memory as a learned fallback when the stream does not already include one.
- No backend route, database table, worker, donor dependency, or raw runtime
  surface was added.

### DM-133: Mobile Decision Detail Polish

Goal: make focused review/decision details feel production-ready on phone
after DM-132 made the bottom navigation product-safe.

Donor grounding:

- Lindy detail-surface pattern: review actions stay inside the focused item.
- Littlebird mobile ergonomics: full-width phone actions and stable bottom
  spacing.
- Polsia decision rhythm: keep the user close to the few calls that matter.
- Naive/Paperclip hidden substrate: existing approval and output-review paths
  stay unchanged.

Completed:

- Focused decision surfaces now reserve mobile bottom padding above the DearMe
  bottom nav.
- Approval-review and prepared-work-review controls now render as stable mobile
  action groups.
- Focused decision buttons become full width on phone and compact again on
  larger screens.
- Existing review, approval, continuation, route, API, and desktop behavior
  remain unchanged.

### DM-132: Mobile Shell Navigation Polish

Goal: make the DearMe mobile shell/navigation fold feel product-owned after
DM-131 proved the first-screen focus content in a live browser.

Donor grounding:

- Polsia first-wow hierarchy: keep users near decisions and ready work.
- Naive/Paperclip hidden substrate: reuse the existing layout shell and sidebar
  drawer while keeping inherited workspace chrome out of the customer path.
- Lindy compact app-navigation rhythm: short repeat actions for current work,
  decisions, and voice review.
- Littlebird mobile ergonomics: short labels, stable tap targets, safe-area
  padding, and no first-viewport collision.

Completed:

- Added a DearMe-specific mobile bottom nav with Home, Decisions, Work Ready,
  Voice, and More.
- Wired More to open the full DearMe sidebar drawer.
- Kept the generic mobile bottom nav disabled on DearMe routes.
- Playwright mobile `390x844` passed with DearMe nav count `1`, generic
  nav count `0`, empty console error/warn logs, and a working More-to-menu
  interaction.
- Playwright desktop `1440x1000` passed with no mobile/generic bottom nav
  rendered.

### DM-131: Browser Polish For The DearMe Team Workbench

Goal: verify and tune the DearMe first-screen workbench in a live browser after
DM-130 made the team focus explicit.

Donor grounding:

- Lindy dense home/workbench rhythm: compact current-work cards should scan as
  content, not empty containers.
- Littlebird mobile ergonomics: the first-screen hierarchy must wrap without
  horizontal overflow.
- Polsia visible momentum: "work happened while I was away" must read clearly
  in the first viewport.
- Naive/Paperclip remains the hidden workbench projection; no new data path was
  added.

Completed:

- Attempted the Browser-plugin validation path first; the current session had
  no in-app browser backend, so the rendered pass used repo Playwright.
- Fixed the focus grid's default stretch behavior so the "While you were away"
  card stays top-aligned instead of filling the right status column's height.
- Desktop `1440x1000` and mobile `390x844` browser checks passed with no
  framework overlay, no console error/warn logs, no horizontal overflow, and a
  working Decisions navigation.

### DM-130: Web Shell Polish From Lindy And Littlebird

Goal: make the customer web shell lead with a premium personal-brand team
surface instead of an admin-console summary.

Donor grounding:

- Polsia first-screen hierarchy and "work happened while I was away"
  choreography.
- Naive/Paperclip workbench projection as the hidden runtime/data substrate.
- Lindy two-column home dashboard composition and compact assistant status
  cards.
- Littlebird onboarding/task-row discipline: one clear current step plus
  compact supporting work rows.

Completed:

- Added `Today's operating focus` above the team summary.
- The new surface shows "While you were away", next private move, team focus,
  decisions waiting, work ready, weekly letter, and voice-profile confidence.
- The surface reads existing workbench data only; no backend route, database
  table, runtime service, or new API was added.
- Focused DearMe onboarding tests assert the new hierarchy and customer-safe
  copy.

### DM-129: Automation Reliability And Cost Policy

Goal: define and surface the rules for when DearMe can keep private work
moving, when it must ask, when it must stop trying, and how spend is shown.

Donor grounding:

- Polsia `task`/subscription attribution, async 202 execution, and repeated
  build-cycle pattern.
- Naive/Paperclip cost events, pre-invocation budget blocks, work/run/document
  review state, and CEO/worker split as hidden architecture.
- Lindy `router.py` and `executor.py` for rule-based effort routing,
  max-turn budgets, consecutive-failure circuit breaking, and recovery
  learning.

Completed:

- Added `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md` as the accepted
  DM-129 policy.
- Added a DearMe-native `Team operating policy` workbench panel that derives
  from existing workbench, review-loop, spend checkpoint, and paid-beta state.
- The customer surface now explains private run permission, ask-first gates,
  stale-loop stops, and spend visibility without exposing donor/runtime terms.
- No backend route, database table, model-routing service, budget-service
  rewrite, or donor service transplant was added.

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

### DM-137: Aha-First Home Composition

Goal: make the first DearMe web experience feel more like a Polsia-style team
already working and less like a cautious setup dashboard.

Donor grounding:

- Polsia first-screen momentum, visible work stream, and "work happened while I
  was away" proof loop.
- Naive/Paperclip hidden workbench, output, approval, and cost substrate.
- Lindy polished home/action-card composition.
- Littlebird web ergonomics for a compact, credible customer shell.

Acceptance:

- The first viewport shows visible team motion, ready work, and decisions
  without exposing machinery or asking the user to configure agents.
- Sample proof, first-cycle generation, Work Ready, and Decisions Needed read
  as one coherent product loop.
- Private work feels autonomous by default; only external/public/spend actions
  are visibly gated.
- No customer-facing donor/runtime terms appear in the DearMe paid-beta path.
- The surface is polished enough for founder dogfood screenshots.

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

## Pending Reuse Roadmap (DM-S01, DM-138 - DM-159)

Source of truth: `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`. Do not branch
ticket numbers from anywhere else. Ordering follows the sprint plan in that
doc.

### Physical Port Manifest — Sprint 0 seed corpus (landed 2026-05-09)

To unblock DM-138 / DM-139 / DM-140 / DM-141 / DM-145 / DM-148 without
forcing each ticket to re-derive Polsia/Naive mechanics, the seed corpus
is now physically present in the repo. Ticket implementations should
`import` from these locations rather than restating the rules in a new
plugin's prompt or service code.

Package: `packages/plugins/dearme-agent-prompts/` (`@paperclipai/dearme-agent-prompts`)

State machines (typed constants, drop-in for plugin services):

| File | Used by ticket | What it defines |
|---|---|---|
| `state-machines/opportunity-state.ts` | DM-141 | 8-state opportunity lifecycle + forward-only transition guard + `OPPORTUNITY_KINDS` |
| `state-machines/meta-ads.ts` | DM-148 | 5-state ad error machine + 4-tier performance rules + `AD_LEARNING_PHASE_DAYS` |
| `state-machines/budget-tier.ts` | DM-148 | 3 daily-budget tiers (`starter`/`growth`/`scale`) + `pickBudgetTier()` |
| `state-machines/mood-face-library.ts` | DM-138/DM-139 | 16-face curated mood library + `getMoodFace()` |
| `state-machines/model-routing.ts` | DM-143/DM-145 | complexity 1-10 → fast/balanced/deep model rows + `pickModelForComplexity()` |
| `state-machines/sse-events.ts` | DM-138/DM-139/DM-140 | 7 SSE event-type names, dashboard action subtypes, `MoodUpdatePayload` |
| `state-machines/dearme-cycle.ts` | DM-142 | Six-hour growth-cycle managed routine seed + issue renderer |

Prompts (12 production-seeded prompts; plugins extend or adapt them with
company-, voice-, task-, and DearMe boundary context):

| File | Source chars | Used by ticket | What it captures |
|---|---|---|---|
| `prompts/chief-of-staff.ts` | 5,021 | DM-139 | 4-step MONITOR→REVIEW→QUEUE→REPORT loop, "queue ≥ 3" rule, Day-1 WHY anchor, complexity 1-10 routing, tag selection table |
| `prompts/reporting.ts` | 1,821 | DM-139 | 3-tool ordered call (`send_personalized_company_update` → `send_inbox_message` → `create_report`), strict email format, <200-word cap |
| `prompts/content-producer.ts` | 1,994 | DM-140 / DEA-7 | Adapted into DearMe's private content-draft role: reads Brand OS, voice profile, reports, and channels; stages draft packets with Voice Gate and approval boundary; never publishes, sends, schedules, connects accounts, spends, or deploys |
| `prompts/opportunity-hunter.ts` | 1,589 | DM-141 | 4-step daily workflow, lead state machine (`pending → contacted → replied → responded → meeting → dead`), Hunter.io verify, 50-125 word emails, 5-day follow-up |
| `prompts/brand-site-builder.ts` | 3,857 | DM-147 | web-only constraint, Render 512MB cap, push-after-every-change rule, `.claude/skills/` registry, JS-only forecasting, C1 first-build standards |
| `prompts/ads-manager.ts` | 17,470 | DM-148 | 5 tools, "0-active verify before create" CRITICAL rule, "memory is hint" doctrine, 7-day learning phase, 4 perf tiers, 5 error states, Sora 2 UGC template, full Meta policy guardrails, moderation/rate-limit/partial-upload recovery flows |
| `prompts/research-agent.ts` | 1,013 | new role | Save-as-deliverable rule, Executive-Summary format |
| `prompts/audience-care.ts` | 1,530 | new role | Plain-text emails, length-matching rule, in/out portfolio escalation matrix |
| `prompts/data-analyst.ts` | 1,178 | new role | Schema-first query rule, NULL handling, correlation/causation discipline |
| `prompts/health-monitor.ts` | 4,578 | new role | Snapshot-not-decision rule, Day 1 502-tolerance, dedup-against-backlog rule, snapshot template |
| `prompts/chat.ts` | 4,365 | new role | Push-back-on-vague-tasks, `find_best_agent` routing, platform-tenant security boundary, recurring-task management, bug-vs-feature classification |
| `prompts/browser-agent.ts` | 3,263 | new role | Site-tier system (1 / 1.5 / 2 / 3), tier blockers, persistent-login flow vs Sapiom flow, "stay on one toolset" rule |

Total: roughly 50,679 chars of production-seeded runtime instructions. Most
remain verbatim mechanical brand substitutions (`Polsia` → `DearMe`,
`polsia.com`/`polsia.app` → `dearme.app`, `polsia_*` → `dearme_*`);
`content-producer` is now intentionally adapted to DearMe's private,
approval-gated draft boundary.

Templates (renderable seeds for outbound and ad creative):

| File | Used by ticket | What it provides |
|---|---|---|
| `templates/sora-ugc-video.ts` | DM-148 | UGC selfie video prompt template + `renderSoraUgcVideoPrompt()` |
| `templates/outbound-5-touch.ts` | DM-156 / DM-141 | 5-touch sequence (day 1/3/6/10/14), per-touch intent + don't list |

Schema slice landed for DM-141:

| File | Migration | Notes |
|---|---|---|
| `packages/db/src/schema/opportunities.ts` | not yet generated (DM-141 owns) | Drizzle table + types + indexes (`company_state`, `company_kind`, unique `company_contact_email`) |

### Tri-Substrate Runtime — server-side wiring of voice-gate / approvals / channel-connections / work-loop / SSE / outbound-tool wrapper (NEW 2026-05-09, DM-S07)

DM-S06 shipped the typed contracts. DM-S07 wires them into the running cloud as 6 dependency-injected services in `server/src/services/`. The lynchpin is `dearme-outbound-tool-wrapper.ts::callOutbound` — one function that runs every outbound tool through the same 5-step pipeline (voice-gate → approval → OAuth lookup → dispatch → audit). This is the **proof of life** that the tri-substrate contract actually composes; per-channel impls now plug into a single typed dispatch slot.

| File | Used by | What it defines |
|---|---|---|
| `server/src/services/dearme-sse-bus.ts` | DM-S07 / DM-179 | Process-local typed `EventEmitter` keyed on `companyId`. Cross-tenant isolation enforced on every emit. Listener throws are swallowed and logged. Singleton + test-only setter. Backs the DearMe live workbench HTTP stream. |
| `server/src/routes/dearme.ts` | DM-179 | `GET /api/dearme/companies/:companyId/events` enforces company access, emits a `sync` workbench snapshot, then streams scoped `dearme-sse-bus` events as SSE frames. |
| `server/src/services/dearme-channel-connections.ts` | DM-S07 / DM-173 / DM-175 | Drizzle service over `channel_connections`. `getActive(companyId, userId, channel)`, `markUsed(id)`, `markNeedsReauth(id, error)`, `upsertActive(input)`. Encrypted blob is opaque here; per-channel adapters decrypt on dispatch. |
| `server/src/services/dearme-voice-gate.ts` | DM-S07 / DM-170 | `dearMeVoiceGateService({ scorer? })`. Default scorer is the deterministic stub: 5 negative phrase rules (`ai_disclaimer`, `hype_word`, `stale_template`, `press_release_voice`, `punctuation_storm`), per-artifact length floor/ceiling, `concrete_evidence` reward. The DM-170 route now exposes this scorer; the real fingerprint model lands by replacing `scorer`. |
| `server/src/routes/dearme-voice-gate.ts` | DM-170 | Root `POST /v1/voice/score` route over the shared proxy contract. Requires `Authorization: Bearer dm_sk_*`, validates `VoiceGateScoreRequest`, and returns `VoiceGateScoreResponse` from the existing cloud-side voice gate service. |
| `server/src/services/dearme-work-loop.ts` | DM-S07 / DM-179 / DM-180 | `transition({ companyId, issueId, from, to, role, reason, openclawSessionId?, agentId? })` — validates via `canTransitionWorkLoop`, mirrors the new 8-state into `issues.status`, writes `activity_log`, emits `work_loop_transition` SSE. Plus `legalNext(from)`. |
| `server/src/services/dearme-approval-resolver.ts` | DM-S07 / DM-180 | Wraps the pure `resolveApproval` with two Drizzle reads (past approved count for the (channel, gate) pair, today's `cost_events` total) + writes the decision into `approvals`/`issue_approvals` with user/agent attribution + emits `approval_pending` or `approval_resolved`. DM-180 exposes this through the company-scoped DearMe route after normalizing issue identifiers. Stores gate in `approvals.type = "dearme.gate.<gate>"`. |
| `server/src/services/dearme-outbound-tool-wrapper.ts` | DM-S07 / DM-172 / DM-174 / DM-176 / DM-177 / DM-178 | **The lynchpin.** `callOutbound(input)` runs: voice-gate (if required) → approval-resolver → channel_connections lookup → injected per-tool `ChannelDispatch` → audit (`cost_events` insert if paid + `channel_action_fired` SSE + work-loop `deliver → audit` transition). Returns one of `{delivered, pending, needs_oauth, rejected, errored}` matching `OutboundToolResult`. Per-channel impls (DM-172/174/176/177/178) plug in as `ChannelDispatch` entries, never touching the wrapper. |
| `server/src/services/dearme-outbound-tool-wrapper.test.ts` | DM-S07 | 9 tests covering happy path, rejected gate (work-loop `gate → review`), pending (no dispatch), missing OAuth, auth-error → `markNeedsReauth`, missing voice-gate input, voice-gate-skipped tools (`deploy_site`), `cost_events` write on `paid=true`, missing dispatcher. |
| `server/src/services/dearme-voice-gate.test.ts` | DM-S07 | 6 tests pinning the stub scorer's deterministic rules. |
| `server/src/services/dearme-sse-bus.test.ts` | DM-S07 | 5 tests on cross-tenant isolation, listener fault containment, missing-companyId guard, unsubscribe. |

After this slice, every per-channel impl ticket is a 30–60 line file plus a `ChannelDispatch` registration:

```ts
// DM-172 (post_x impl) — illustrative shape
const channelDispatch = {
  post_x: async ({ encryptedCredential, payload }) => {
    const { token } = await decryptOAuth(encryptedCredential);
    const tweet = await xClient.postTweet(token, payload as PostXInput);
    return { kind: "delivered", externalId: tweet.id, externalUrl: tweet.url, paid: false };
  },
  // ...send_email, deploy_site, etc
};
```

Verification (2026-05-09):

```
pnpm --filter @paperclipai/server typecheck                          pass
cd server && npx vitest run src/services/dearme-{sse-bus,voice-gate,outbound-tool-wrapper}.test.ts   20/20 pass
pnpm --filter @paperclipai/dearme-agent-prompts test                 25/25 pass
pnpm --filter @paperclipai/dearme-ai-proxy test                       6/6  pass
pnpm --filter @paperclipai/dearme-openclaw test                      16/16 pass
```

Total tests after DM-S07: **67 green**, up from 47 pre-DM-S07.

### Tri-Substrate Integration — work-loop / approvals / outbound tools / channel_connections / voice-gate (NEW 2026-05-09, DM-S06)

DearMe is the integration of three substrates: **OpenClaw** (edge runtime — channels / voice / sandbox / cron), **Naive/Paperclip** (cloud durable state — issues / heartbeats / approvals / cost ledger), **Polsia** (verbatim choreography — 12 prompts / 6 fns / 4 gates / 5-stage cycle). DM-S06 ships the glue artifacts that make the three actually compose.

| File | Used by | What it defines |
|---|---|---|
| `packages/plugins/dearme-agent-prompts/src/state-machines/work-loop.ts` | DM-S06 / DM-179 / DM-180 | 8-state unified work loop (`intake → triage → work → gate → deliver → audit → review → archive`) with explicit per-state substrate bindings (`WORK_LOOP_SUBSTRATE_BINDINGS`). Maps to Polsia 5-stage cycle via `WORK_LOOP_TO_CYCLE_STAGE`. Pure transition validator (`canTransitionWorkLoop`). |
| `packages/plugins/dearme-agent-prompts/src/state-machines/approval-gates.ts` | DM-S06 / DM-180 | 4 gates (`publish` / `send` / `deploy` / `spend`) with `APPROVAL_GATE_CONFIG` (auto-approve threshold, voice-gate-required flag, default TTL). Pure resolver `resolveApproval(req, ctx)` that hard-rejects spend over cap, hard-rejects below voice floor, auto-approves after configured threshold. |
| `packages/plugins/dearme-agent-prompts/src/state-machines/sse-events.ts` | DM-S06 / DM-179 | Upgraded from 7 v1 events → 15 events covering all three substrates: v1 baseline + `work_loop_transition` + 4 approval/voice events + `channel_action_fired` + `cost_recorded` + 2 OpenClaw passthroughs. Every event carries cross-substrate scope (`companyId/issueId/executionId/agentId/openclawSessionId/workLoopState`). |
| `packages/plugins/dearme-agent-prompts/src/registry.ts` | DM-S06 | `DEARME_ROLE_REGISTRY` extended: each entry now declares `substrate: { openclaw, naive, polsia }`. New helper `getSubstrateDistribution()`. `validateRegistry()` checks all three substrate enums. |
| `packages/dearme-ai-proxy/src/voice-gate.ts` | DM-S06 / DM-170 | Voice-gate wire: `POST /v1/voice/score`, `VoiceGateScoreRequest`/`VoiceGateScoreResponse` types, 8 `VOICE_GATE_ARTIFACT_KINDS`, default floor 92, `buildVoiceGateUrl()` helper. |
| `packages/db/src/schema/channel_connections.ts` | DM-S06 / DM-175 | Per-user OAuth schema. 7 channels (`x` / `linkedin` / `resend` / `ses` / `meta_ads` / `buffer` / `stripe`), 5 statuses (`pending` / `active` / `needs_reauth` / `revoked` / `suspended`), encrypted credential blob, scopes, expiresAt, lastUsedAt, lastError. Unique on `(companyId, userId, channel, externalAccountId)`. |
| `packages/plugins/dearme-openclaw/src/tools/types.ts` | DM-S06 / DM-172 / DM-174 / DM-176 / DM-177 / DM-178 | 5 outbound tool TypeScript interfaces: `post_x` / `send_linkedin_dm` / `send_email` / `deploy_site` / `create_meta_campaign`. Each has typed input + delivered output + envelope (`OutboundToolEnvelope`) + 5-outcome result (`delivered` / `pending` / `needs_oauth` / `rejected` / `errored`). `DEARME_OUTBOUND_TOOL_BINDINGS` maps each to `(gate, channel, voiceGateRequired)`. |
| `docs/dearme/TRI-SUBSTRATE-ARCHITECTURE.md` | DM-S06 | New canonical doc. Layer-ownership matrix, work-loop, SSE bucket, approval gates, outbound tool contract, per-role substrate map, doctrine. **Add to canonical reading list.** |

This commit unblocks all the next-up tickets that wire each substrate to the others:

| Ticket | What it enables |
|---|---|
| DM-170 | Cloud `/v1/voice/score` endpoint — Express route is shipped over the deterministic scorer; trained fingerprint model and persisted key issuer remain |
| DM-171 | OpenClaw plugin install + onboarding bridge |
| DM-172 | `post_x` impl using the typed envelope |
| DM-173 | Per-user X OAuth callback writing into `channel_connections` |
| DM-174 | `send_email` via Resend/SES (avoids Gmail CASA cost) |
| DM-176/177/178 | LinkedIn DM / deploy_site / create_meta_campaign impls |
| DM-179 | DearMe live workbench SSE route — shipped as `GET /api/dearme/companies/:companyId/events`; future work can add upstream OpenClaw passthrough events behind the same stream |
| DM-180 | **Shipped.** Approval resolver wire through `POST /api/dearme/companies/:companyId/approvals/resolve`, with issue normalization + `approvals`/`issue_approvals` attribution. ✅ |

Verification (2026-05-09):

```
pnpm --filter @paperclipai/dearme-agent-prompts exec vitest run     25/25 pass
pnpm --filter @paperclipai/dearme-ai-proxy exec vitest run           6/6  pass
pnpm --filter @paperclipai/dearme-openclaw exec vitest run          16/16 pass
pnpm --filter @paperclipai/dearme-openclaw exec tsc --noEmit         pass
pnpm --filter @paperclipai/db typecheck                              pass
```

Total tests after this slice: **47 green**, up from 31 pre-DM-S06.

### OpenClaw Plugin Scaffold — `@paperclipai/dearme-openclaw` (NEW 2026-05-09, DM-S05)

| File | Used by ticket | What it defines |
|---|---|---|
| `openclaw.plugin.json` | DM-S05 / DM-171 | OpenClaw plugin manifest. `id="dearme"`, configSchema (`apiKey: dm_sk_*`, `handle`, `defaults.{dailyLetterChannel,voiceGate.minScore,budget.dailyUsdCap}`), points OpenClaw at `./generated/skills`. |
| `src/skill-generator.ts` | DM-S05 | Pure function: `DEARME_ROLE_REGISTRY → SkillFile[]`. Emits 12 SKILL.md with YAML frontmatter (name, description, openclaw metadata, proxy tools, state machines, complexity, tier) and a body that embeds the verbatim production prompt and routing hints. |
| `src/bootstrap.ts` | DM-S05 / DM-138 | Templates for `AGENTS.md` (operating instructions encoding the 4 doctrine rules), `SOUL.md` (persona — never sycophantic, never AI-disclaimy), `IDENTITY.md` (team name, conversational lead), `USER.md` (stub forces onboarding ritual). Injected into OpenClaw workspace on first-run. |
| `src/cli/generate-skills.ts` | DM-S05 | CLI: writes `generated/skills/dearme-<role>/SKILL.md` × 12 + `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md`. Run after registry edits. |
| `src/index.test.ts` | DM-S05 | 12 tests: 1 skill per registry entry, unique folders, well-formed YAML, **verbatim prompt embed** (asserts production strings like `"Rate limit:** 2/day"`, `280`, `"verify with Hunter.io"`, `"Under 200 words total"`), routing/tier/source-of-truth sections present, bootstrap files anchor the 4 doctrines. |
| `generated/skills/dearme-<role>/SKILL.md` × 12 | DM-S05 | Generator output, committed to git so registry edits show as a reviewable diff. What OpenClaw actually loads. |
| `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md` | DM-S05 / DM-171 | Generator output. Plugin install copies these into `~/.openclaw/workspace/`. |

This is the package that turns `DEARME_ROLE_REGISTRY` into a runnable OpenClaw plugin. **No prompt is duplicated** — every SKILL.md embeds the registry's `prompt` field by reference (string copy at generation time, not by paraphrase).

Ledger of what changed because of this package:

- `packages/plugins/dearme-agent-prompts/src/state-machines/budget-tier.ts` and `.../model-routing.ts` got `noUncheckedIndexedAccess`-safe fallbacks (no behavior change; type-system tightening required by the new package's stricter tsconfig).
- New canonical doc `docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md` captures the full layer-ownership contract.
- `INDEX.md` and `PRODUCT-ARCHITECTURE.md` updated to reflect OpenClaw as the substrate (architecture diagram redrawn; new §9.5).

Verification (2026-05-09):

```
pnpm --filter @paperclipai/dearme-openclaw exec tsc --noEmit             pass
pnpm --filter @paperclipai/dearme-openclaw exec vitest run               12/12 pass
pnpm --filter @paperclipai/dearme-agent-prompts exec vitest run          21/21 pass  (regression check)
```

Next-up tickets unlocked by this scaffold:

| Ticket | Slice | Owner package |
|---|---|---|
| DM-170 | DearMe cloud `/v1/voice/score` endpoint (route shipped; trained fingerprint scoring next) | server |
| DM-171 | OpenClaw plugin install flow + onboarding bridge (paste device pairing code at `dearme.app/onboard`) | server + dearme-openclaw |
| DM-172 | `post_x` outbound tool (X publish), voice-gate-blocked below threshold | dearme-openclaw |
| DM-173 | Per-user X OAuth flow (just-in-time, on first publish) | server (`channel_connections`) |
| DM-174 | `send_email` outbound tool via Resend/SES (avoid Gmail CASA cost) | dearme-openclaw |
| DM-175 | `channel_connections` Drizzle table + encrypted token storage | packages/db |

### AI Proxy Contract Package — `@paperclipai/dearme-ai-proxy` (NEW 2026-05-09)

| File | Used by ticket | What it defines |
|---|---|---|
| `src/functions.ts` | DM-145 | 6 production-verified OpenAI native function definitions (`create_task`, `search_memory`, `get_company_documents`, `create_report`, `web_search`, `content_generate`) ported verbatim from research-captured `buildToolDefinitions()` |
| `src/contract.ts` | DM-145 / DM-143 / DM-155 | `dm_sk_*` API key prefix, dual-protocol cost-attribution headers (`task` for OpenAI, `X-Subscription-ID` for Anthropic), `agent/run` endpoint shape, `CostLedgerEvent`, `AgentRunRequest`/`AgentRunResponse` types |

This package only owns the contract. The HTTP server implementation
(routes, model picker, cache layer, ledger writer) is delivered in DM-145.

Verification (2026-05-09):

```
pnpm --filter @paperclipai/dearme-agent-prompts run typecheck   pass
pnpm --filter @paperclipai/dearme-agent-prompts exec vitest run 16/16 pass
pnpm --filter @paperclipai/dearme-ai-proxy run typecheck        pass
pnpm --filter @paperclipai/dearme-ai-proxy exec vitest run      4/4 pass
pnpm --filter @paperclipai/db run typecheck                     pass
pnpm --filter @paperclipai/shared exec vitest run               92/92 pass
```

Lineage and compliance posture documented per-package in README and
governed by `REBRAND-AND-PROVENANCE.md` (which applies to customer-facing
UI, not server-side runtime artifacts the user never sees).



### Sprint 0 - Foundation executable

| Ticket | Slice | Donor mechanism | Path | Status |
|---|---|---|---|---|
| DM-S01 | Mass-assignment fix on `PATCH /api/companies/:id` | Naive security finding | `packages/shared/src/validators/company.ts`, `server/src/routes/companies.ts` | ✅ done (schema split + board-only governance route + tests) |
| DM-142 | Six-hour DearMe cycle routine seed + approval-time provisioning | Polsia cycle every_6_hours | `packages/plugins/dearme-agent-prompts/src/state-machines/dearme-cycle.ts`, `server/src/services/dearme-brand-blueprint-apply.ts` | ✅ done (seed + routine/trigger provisioning + tests) |
| DM-146 | Mount DearMe build skills into execution workspaces | Polsia per-execution `.claude/skills/` | `server/src/services/heartbeat.ts`, adapter skill injection services | ✅ done (runtime skills projected into execution-run adapter config + focused test) |
| DM-154 | Configure CEO/direct + worker/remote role templates with 2h/8h heartbeat | Naive two-tier agent split | `packages/shared/src/validators/dearme.ts`, `server/src/services/dearme-brand-blueprint-apply.ts` | ✅ done (Brand OS team template now provisions direct/local chief-of-staff on 2h cadence plus worker/remote teammates on 8h cadence) |
| DM-183D | Customer-safe workbench projection for donor/substrate output | Polsia simple customer surface over private execution machinery | `server/src/services/dearme-workbench.ts`, `server/src/__tests__/dearme-workbench.test.ts` | ✅ done (work products from OpenClaw/Symphony/Paperclip/provider/runtime/model logs are projected into DearMe language before the workbench response) |

### Sprint 1 - Aha moment

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-138 | First-run personal proof sequence (DM-138A start bridge, DM-138B proof-sequence contract, DM-138C proof hydration, DM-138D proof-output write, and DM-138E live browser/API smoke shipped locally) | Polsia 5-min onboarding shock | `server/src/routes/dearme.ts`, DearMe worker/plugin layer |
| DM-139 | Autonomous Reporting plugin (queue-always-non-empty, plain-prose updates, next-step driver) | Polsia CEO 4-step prompt | `packages/plugins/dearme-reporting/` |
| DM-140 | Voice Gate + Content Producer plugin (voice-match score, attribution link rule, rate cap) | Polsia Twitter agent rules | `packages/plugins/dearme-content-producer/` |

### Sprint 2 - Work keeps moving

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-141 | Opportunity Hunter plugin + opportunities schema + 6-state machine | Polsia Cold Outreach + Naive 5-touch deliverable | new `packages/db/src/schema/opportunities.ts`, `packages/plugins/dearme-opportunity-hunter/` |
| DM-149 | Emergency pause intent in chief-of-staff messaging | Polsia `pause_ads()` highest-priority pattern | `server/src/services/dearme-workbench.ts` |
| DM-153 | Default approval score on silence + cross-tenant feedback wiring | Polsia score-7 default | approvals service |

### Sprint 3 - Moat and economics

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-143 | Complexity-based model routing in proxy + agent metadata | Polsia complexity 1-3 / 4-6 / 7-10 routing | `packages/dearme-ai-proxy/` |
| DM-145 | AI proxy: OpenAI/Anthropic-compatible endpoints + `dm_sk_` keys + cost-ledger fields (`task` + `X-Subscription-ID`) | Polsia dual-protocol proxy | new `packages/dearme-ai-proxy/` |
| DM-155 | Anthropic prompt-cache economics (target ~90% cache-read ratio) | Naive cache utilization measurement | proxy cost/cache layer |
| DM-144 | Lock MCP set to the proven minimum (audit + remove unused) | Polsia 9-of-22 active MCP | `packages/mcp-server/*`, tool registry |

### Sprint 4 - Growth loops

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-147 | Brand Site Builder plugin with constraint prompt (web-only/single-Express/512MB/push-every-change) | Polsia Engineering agent constraints | `packages/plugins/dearme-brand-site-builder/` |
| DM-148 | Meta Ads/autothrottle plugin (budget tiers, 5-error states, UGC video pipeline) | Polsia Meta Ads Manager | `packages/plugins/dearme-meta-ads/` |
| DM-150 | Best-agent cross-tenant routing service | Polsia `find_best_agent` | `server/src/services/dearme-agent-routing.ts` |
| DM-151 | Live proof feed (public + private sections; no substrate terms) | Polsia `/live` 13-section feed | new `server/src/routes/live.ts` + DearMe live page |
| DM-152 | Post-build brand-similarity review (async; remediation via issues, not pre-build block) | Polsia `trademark_post_build_review` | `packages/plugins/dearme-reporting/` |
| DM-156 | Five-touch outbound sequence template wired into Opportunity Hunter | Naive deliverable example | opportunity hunter templates |

### DearMe-original tickets without donor mechanism

These have no donor mechanism — they are DearMe-original capabilities that
sit alongside the ports above.

| Ticket | Slice | Path |
|---|---|---|
| DM-157 | Audience Graph plugin (cross-platform follower index, overlap ranking, DM-target list) | new `packages/plugins/dearme-audience-graph/` |
| DM-158 | Voice Profile plugin (extraction, signature/forbidden phrases, Voice Gate hook) | new `packages/plugins/dearme-voice-profile/` |
| DM-159 | Per-customer attribution beacon (footer auto-injection on personal-brand sites) | new `packages/dearme-beacon/` |

### Out of scope (explicitly rejected)

| Item | Why we skip |
|---|---|
| Per-tenant Fly.io VM | Cost overrun at idle. Reuse `execution-workspaces` instead. |
| Worker recursive sub-spawn | Too much complexity for personal-brand surface. |
| `setTimeout` self-rescheduling | Already supplanted by `heartbeat_runs`. Don't reintroduce fragility. |
| Parallel app-factory templates | DearMe ships personal-brand sites only; no generic generator. |
| Public marketing claims of compliance we have not earned | FTC unfair-claim risk. Earn -> claim. |

## Not Complete Yet

DearMe is not release-ready just because these reuse decisions are documented.
DM-138A moved the first-cycle CTA from read-only proof into a durable private
start path, DM-138B made the proof order a shared response contract, DM-138C
hydrates that contract from prepared documents and work products, and DM-138D
now writes those proof outputs during first-cycle start through the existing
issue/document handoff. DM-138E live-smoked the same path, fixed stale
cancelled output history so current proof issues project as `ready_for_review`,
and kept the customer surface free of donor/runtime vocabulary.

DM-S01 and DM-138A-E have landed locally. The next non-negotiable slice is
DM-139 / DM-140: turn the first proof package into autonomous reporting plus
voice/content production that keeps the queue moving after the first aha,
without adding another customer-facing runtime contract.
