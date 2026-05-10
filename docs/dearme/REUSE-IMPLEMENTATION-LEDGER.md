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
| Product shell | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/components/DearMeSidebar.tsx`; `ui/src/components/Layout.tsx` | DearMe-owned shell already hides inherited Paperclip chrome on the customer path. DM-130 adapts Polsia's "work happened while I was away" choreography, Lindy's two-rail home composition, and Littlebird's focused step/task-row discipline into the first workbench surface. DM-131 browser-polished the focus grid so the live desktop/mobile shell keeps the current work card compact and readable. DM-132 adds a DearMe-specific mobile nav so the phone shell routes users to Home, Decisions, Work Ready, Voice, and More without showing generic workspace destinations. DM-133 makes focused decision actions mobile-safe. DM-134 adds a Brand Team Run Ledger so the first product surface records what the team tried, prepared, learned, and needs from the user. DM-135 renders the first-run generated package with its approval boundary, proving that one positioning answer can produce useful team work without exposing runtime machinery. DM-136 reuses the same first-cycle contract for a private sample package so the shell proves the team output before personal input; the integration update adds a visible `autonomyPlan` so sample and generated proof both say "Autopilot until launch" and wait only at the four launch gates. DM-138A changes the CTA from read-only preview into a private first-cycle start. DM-138B makes the Polsia-style proof sequence first-class in the preview response and renders identity dossier, audience map, and private site proof from that contract. DM-138C hydrates the same proof cards from prepared documents and work products through the DearMe output handoff. DM-138D now writes those output-handoff artifacts during first-cycle start, so the returned proof package can be source-labelled immediately from real private documents. DM-138E browser-smoked the live paid-beta path and kept the surface free of donor/runtime vocabulary. DM-139/DM-140 now share a private cycle output packet that turns prepared outputs into a voice-scored content draft and Dear me report through the same output handoff, projects that packet into the workbench/report read model, and renders the Dear me letter plus workbench card surfaces as one private proof-pack language system. DEA-7 carries that Voice Gate result into focused work, work cards, and proof-pack cards as a customer-safe Voice check, so the user can see why private work is ready without seeing provider/runtime fields. The live Symphony-aligned `DEAAAAAAAAA` browser proof now confirms the packet-backed aha loop across workbench, Dear me letter, and focused review on desktop and mobile without hidden donor/runtime terms. DM-141 adds `?view=opportunities` as a focused opportunity command center that reuses the same workbench, prepared-output, and launch-call approval model for private opportunity drafts. DM-183AK adds a first-screen payoff strip that points to the existing first-cycle input instead of creating another setup flow. | Next high-value product gap is letting real Symphony content workers produce fresh packets repeatedly and watching whether review history needs richer failure context; do not create a second first-run contract or runtime UI. |
| Brand OS / `brand_blueprint` | `packages/shared/src/validators/dearme.ts`; `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/routes/dearme.ts` | Naive `setup_payload` pattern has been adapted into a typed DearMe contract and approval-gated apply flow. DM-136 adds the shared first-cycle `autonomyPlan` and `DEARME_FIRST_CYCLE_CONCERN_GATES`, making the four launch decisions a code-level contract instead of a copy convention. DM-138A consumes that same preview request/response for first-cycle start and does not add another first-run payload. DM-138B adds `proofSequence` to the same response, so UI and private issue creation share the 0-30s / 60-120s / 3-5min proof order. DM-138C reuses the existing output handoff to populate that sequence from real prepared artifacts and rejects plain progress notes as proof. DM-138D adds `prepareFirstCycleProofOutputs(...)`, creating/updating the known output fingerprints and markdown docs before the start route returns the preview. DM-138E reopens stale proof issues to `in_review` and makes output projection prefer the newest issue per fingerprint, so old cancelled review history cannot suppress the current proof package. DM-183I replays the output-scoped Voice & Memory ordering idea into the current apply path so private draft issues receive context ordered by output type without changing schema or UI. DM-183V replays the DM-029 copy residue so the Brand OS preview talks about rhythm and first private work instead of cycles and operations. | Keep extending this contract only when P0 surfaces need it; next product value should come from autonomous reporting/content generation, not more first-cycle schema. |
| Workbench projection | `server/src/services/dearme-workbench.ts`; `server/src/__tests__/dearme-workbench.test.ts`; `server/src/routes/dearme.ts`; `ui/src/api/dearme.ts`; `ui/src/pages/DearMeOnboarding.tsx` | Naive/Paperclip tables remain the substrate for team, work, decisions, progress, reports, and memory projections. DM-179 exposes that projection as the initial `sync` frame on the DearMe live workbench stream, then forwards typed `dearme-sse-bus` events by company. DM-181 consumes the same stream in the customer workbench by updating the existing React Query cache on `sync` and invalidating it on broader runtime events. DM-182 folds OpenClaw lifecycle / stream passthroughs into that same invalidation path. DM-138A emits first-cycle `task_created`, `thinking_stream`, and `agent_completed` events through the same bus so the onboarding start path lands in the existing live workbench refresh lane. DM-139/DM-140 now detects packet-backed output handoff documents/work products and projects the same private packet through Work Ready, Decisions, report digest, work stream, run ledger, and action graph without adding shared schema fields. The UI consumes that report projection directly and translates internal packet wording into proof pack language across report, ready-work, decisions, live feed, run ledger, action graph, Voice & Memory, focused detail surfaces, and the proof pack continuity ribbon. DEA-7 now also projects the latest worker lifecycle event into a customer-safe `Live team pulse` using the same EventSource listener, so private Symphony/OpenClaw motion feels active without adding another runtime UI. DEA-7 browser proof confirmed that one real generated packet now reaches the existing projection, letter, and focused review route. | Do not add a second runtime; let Symphony worker output keep feeding the existing packet-backed event consumer and customer UI first. |
| Action graph and work stream | `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`; `packages/shared/src/validators/dearme.ts`; `ui/src/components/dearme/DearMeActionCard.tsx` | Polsia cycle/report choreography plus Lindy action-card grammar are already converging into customer-safe work cards. DM-133 makes focused decision/detail actions mobile-safe without changing the hidden approval/output-review substrate. DM-134 adds a typed `runLedger` read model derived from the existing workbench stream, with latest memory as a fallback, without adding another event table. DM-183AA reuses the existing live-feed `workStream` fields to explain why each visible state matters, giving DM-088-style progress clarity without restoring its stale replacement component. | Use the ledger as the customer-facing progress spine before adding notification or report surfaces. |
| Output review and decisions | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `ui/src/api/dearme.ts`; `server/src/routes/dearme.ts`; `server/src/services/dearme-output-handoff.ts`; `server/src/__tests__/dearme-output-handoff.test.ts` | Lindy pending-action shape and Polsia "small number of high-leverage calls" are reused in Work Ready / Decisions Needed. DM-128 now lets focused prepared work be approved, revised, regenerated, or redirected inside the DearMe decision surface while Naive/Paperclip remains the hidden output review substrate. DM-139/DM-140 adds `prepareCycleOutputPacket(...)`, which reuses output handoff, documents, work products, and Voice Gate so content drafts and the Dear me report stay coupled to the same private evidence packet. DEA-7 adds `dearMeContentDraftPacketSchema`, `persistContentDraftPacket(...)`, and the company-scoped `content-draft-packets` route/API client, letting Symphony content workers save private review packets into the same handoff table, then renders parsed `voiceGate` results without exposing provider metadata. The rerun-key follow-up makes `packetId` mandatory, so worker retries update the same private review work product instead of stacking duplicates. DM-141 routes `opportunity_drafts` through the same private review lane with a focused opportunity view, so opportunity work changes presentation and filtering, not the approval substrate. DM-183F replays the useful DM-031/DM-032 residue by showing card-level prepared-by team attribution and switching generated DearMe decision links to `work=` while preserving legacy `issue=` deep-link parsing. DM-183J absorbs the DM-035/DM-036/DM-041/DM-042 UI residue by renaming the private review surface, naturalizing default decision notes, and keeping internal failure terms out of customer-visible errors. DM-183K adds a typed feedback-applied trace from existing review comments, documents, and work products, then renders it in the focused prepared-work panel without adding a new review runtime. DM-183N replays the still-useful DM-015 detail-ordering idea so private-work cards and focused review use the existing output `details` contract to surface content channel/audience/hook/body/proof/boundary, opportunity target/relevance/message, portfolio proof/copy, and report decisions before the user opens raw work. DM-183T absorbs residual DM-027 output-focus routing by carrying existing batch, report, and live-feed output ids through the DearMe decision route, and by letting reviewable live-feed work use the in-place prepared-work review controls instead of raw issue navigation. DM-183U canonicalizes generated focused-work links to `artifact=` while preserving legacy `output=` parsing for old review handoffs. DM-183AJ turns an approved private output into one final `dearme_output_next_move` approval and carries the original artifact id through decisions, batches, stream, and graph so the customer still makes the launch call before anything external happens. | Watch whether repeated review loops need richer server-owned failure history after real usage; extend the packet before adding new review surfaces. |
| Output review and decisions - shared approval entry points | `packages/shared/src/constants.ts`; `ui/src/lib/dearmeApprovals.ts`; `ui/src/components/ApprovalCard.tsx`; `ui/src/pages/ApprovalDetail.tsx`; `ui/src/pages/Approvals.tsx`; `ui/src/pages/Inbox.tsx` | DM-183O absorbs the still-useful Symphony approval/profile UI residue by registering `dearme_output_next_move` in the shared approval type contract and routing DearMe approval cards, detail pages, approval lists, and inbox rows back to `/dearme?view=decisions&approval=...`, while hiding requester identity, raw approval IDs, linked issues, and full-payload controls for DearMe types. DM-183AJ makes that shared type live from the output-review service instead of leaving it as a UI-only route target. | Add new DearMe approval types to the shared helper before exposing them through generic approval or inbox surfaces. |
| Voice & Memory source review | `server/src/services/dearme-workbench.ts`; `server/src/routes/dearme.ts`; `ui/src/api/dearme.ts`; `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `server/src/services/dearme-memory-context.ts` | Lindy KnowledgeBase/source-management and slide-out detail patterns are now adapted: private sources become review cards, selected sources open a detail surface, reviewed facts save through the existing memory path, and not-useful sources use the existing retire path. DM-183H reuses that same evidence path in focused Work Ready review: blank source evidence is filtered, missing context becomes an explicit Voice & Memory empty state, and the review action remains addressable with stable accessible labels. DM-183W adds a capped retired-source projection and restore action over the same activity-log memory path, so users can bring back a private source without a new memory table or settings surface. DM-183Z absorbs the useful DM-043 label-safety residue by normalizing Voice & Memory routine context before it guides private DearMe work, without adding a new memory service. DM-183AG adapts the old DM-019 confirmation boundary to the current source-review UI, so retiring a private source is deliberate while the backend archive/restore contract stays unchanged. DM-183AH replays the useful DM-085 review-preference idea as a derived Review preferences strip from existing `review_feedback` memory. | Watch whether reviewers need richer source history after repeated use; do not add backend shape until the current detail surface proves insufficient. |
| Weekly report and rituals | `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/services/dearme-workbench.ts`; `server/src/services/dearme-output-handoff.ts` | Polsia report/cycle ritual is adapted into DearMe weekly report and daily team work language. DM-139/DM-140 now writes the Dear me report from the same private cycle packet as content drafts, with voice-fit and next-decision provenance carried in documents and work products, makes the report digest point back to the same review packet, and renders the visible report as a one-pass proof pack review. DEA-7 makes the companion content packet independently persistable while keeping report/content review tied to the same proof and launch boundary. | Let real cycle usage decide whether the report needs richer history; keep the first report surface packet-backed. |
| Cost and reliability | `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md`; `ui/src/pages/DearMeOnboarding.tsx`; current workbench/cycle projections; Naive cost-event docs; Lindy router/executor evidence | DM-129 adapts Polsia task/subscription attribution, Naive pre-invocation budget rails, and Lindy routing/circuit-breaker behavior into a DearMe policy plus a customer-safe workbench panel. | Add backend policy facts only when future autonomous jobs need state that cannot be derived from the current workbench and paid-beta status. |
| Generated portfolio/site | Existing brand blueprint and optional generated asset layer docs | Naive app/site provisioning remains optional P1/P2, not P0. Polsia personal-brand fork recommends Brand Site Builder, but DearMe first needs review-quality content and proof. | Start only after content/voice/opportunity loop is credible. |
| Development factory | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`; `.symphony/WORKFLOW.md`; `scripts/dearme-worktree-status.mjs`; `/Users/peter/symphony`; `/private/tmp/dearme-symphony-workspaces` | Symphony-style worker queue is now the cooperation spine for bounded tickets. DM-183 turns the local worktree inventory into a ticket-aware coordinator report with purpose labels and next-action buckets. DM-183B adds `patch_equivalent` so cherry-pick-equivalent worker heads can be closed only after owner confirmation instead of replayed as fresh product slices; the current live audit found 0 such branches, so `not_in_current` still means content review is required. DM-183C folds real Symphony workspace repos into the same report, detects DEA tickets, and separates active or absorbed `symphony` lanes from stale worker branches. DM-183E adds `subject_matched` for stale worker tips whose commit subject already appears in current head: these remain `not_in_current`, but workers should inspect only residual diff before replay or closure. `AGENTS.md` now points DearMe product workers to `.symphony/WORKFLOW.md` before the architecture docs so the active queue, Linear scope, and workspace discipline stay first-class. The real daemon now routes by Linear team `DEA` plus `assignee: me`, because DearMe has no Linear Project. The `DEA-7` Symphony workspace now reports `in_current` with the action `absorbed Symphony lane; keep as audit trail or close after owner confirmation`; future coordinator integration should keep consuming issue-scoped Symphony lanes rather than spawning parallel content runtimes. The latest coordinator pass absorbed the opportunity workbench and generated-skill wrapper hardening as small product-facing increments, which is the preferred Symphony loop shape. | Workers must use Linear issue scope, `AGENTS.md`, this ledger, `BUILD-STATE.md`, `.symphony/WORKFLOW.md`, and `pnpm dearme:worktrees -- --summary-only --skip-dirty` before selecting old tickets. |

Coordinator note: DM-183O extends the Output review and decisions boundary into
shared UI entry points, so DearMe approval cards, detail pages, approval lists,
and inbox rows return to the DearMe decisions surface instead of exposing raw
approval/issue chrome.

Coordinator note: DEA-8 verified the live first-cycle proof handoff without a
code change. Do not reopen this as another first-run schema or runtime task:
`prepareFirstCycleProofOutputs(...)`, `prepareCycleOutputPacket(...)`, output
handoff, and workbench projection already carry the paid-beta proof pack.

Coordinator note: DM-183M extends the Output review and decisions boundary into
server responses and approval preflight, so DearMe auth, validation, and stale
Brand OS approval failures stay product-safe before state changes.

Coordinator note: DM-183AB absorbs the DM-046/DM-047 worker residue as
regression coverage only. The current production page already routes Voice &
Memory, Brand OS, decision, and focused-work mutation failures through the
DearMe customer-safe error helper, so the useful replay is locking those paths
without adding another error layer.

Coordinator note: DM-183AC removes X-first defaults from bootstrap/profile and
Content Producer prompt rails. Keep `post_x`, tweet-shaped payload fields, and
OAuth platform naming unchanged until a dedicated outbound-contract migration
exists.

Coordinator note: DM-183AD closes the current workbench projection gap found
while absorbing DM-044/DM-045. The current service already owns Voice & Memory
projection, but review feedback traces now need to stay on the same
customer-safe path as output titles, summaries, evidence, and review handoffs.

Coordinator note: DM-183AE removes customer-facing CEO, board-update, and
owner-email wording from the Chief of Staff and Reporting prompts while keeping
proxy tool names and `ceo_*` report type identifiers stable. Treat those
identifiers as internal compatibility surfaces until a dedicated contract
migration exists.

Coordinator note: DM-183AF absorbs the useful DM-020/DM-022 worker residue as
frontstage ordering and language only. Keep the current workbench stream and
review runtime intact; the customer surface should say "live proof feed" and
show prepared private work before setup/forms.

Coordinator note: DM-183AG adapts the useful DM-019 retire-confirmation lesson
to the current Voice & Memory source projection. Retire remains a soft,
restoreable private-history action; keep it separate from any future hard-delete
or data-export boundary.

Coordinator note: DM-183AH absorbs the useful DM-085 review-preference residue
by deriving a small Review preferences strip from current `review_feedback`
Voice & Memory rows. Keep this derived from existing memory until repeated
review usage proves the need for editable preference storage.

Coordinator note: DM-183AI absorbs the safe remainder of DM-014 as a current
output-preview fallback. The DearMe mobile shell exception was already absorbed
by `DearMeMobileNav`; keep this slice limited to stale prepared-work readability
unless mobile screenshots prove a new obstruction.

Coordinator note: DM-183AJ makes `dearme_output_next_move` executable from the
current output-review path. Keep the final launch/send/deploy/spend call in the
existing approval substrate and carry `outputId` through projections instead of
adding another launch queue, worker runtime, or customer-facing Symphony surface.

Coordinator note: DM-183AK pulls the first payoff above the workbench without
moving the underlying first-cycle contract. Keep future first-screen work
focused on showing immediate payoff and routing to existing private-work inputs
before adding new onboarding forms.

## Recently Completed

### DM-183AL: First Payoff CTA Rail

Goal: make the first-screen aha path feel like one clear action rail instead
of another explanatory panel.

Donor grounding:

- Polsia: keep the immediate input-to-private-proof loop as the first customer
  promise.
- Lindy: reuse compact review-card rhythm so the user sees the next decision
  before reading the rest of the workbench.
- Naive/Paperclip: keep the existing first-cycle, paid-beta, and approval
  machinery hidden under the customer-facing shell.

Completed:

- Rebuilt the `First payoff` surface from DearMe shell primitives rather than a
  bespoke card grid.
- Preserved the same one-sentence CTA, trial preview CTA, and focus behavior on
  the existing first-cycle input.
- Locked the surface primitive, three payoff cards, and one-answer/no-public
  action promise in the focused onboarding regression test.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed desktop and mobile render the rail as a focus surface with three
  payoff cards, no horizontal overflow, no console/page errors, and no
  same-origin request failures.

### DM-183AK: First Payoff Strip

Goal: make the first visible screen explain the payoff before the user has to
understand the whole DearMe team board.

Donor grounding:

- Polsia: reuse the immediate aha loop, where one small input quickly becomes
  visible private work.
- Lindy: reuse compact action-card clarity and a single obvious review path.
- Naive/Paperclip: keep the existing first-cycle preview/start, paid-beta, and
  approval substrates hidden under the product surface.

Completed:

- Added a `First payoff` strip after the hero that summarizes the path from one
  known-for sentence to a private proof pack and final launch call.
- The strip CTA focuses the current 90-second first-cycle input instead of
  introducing another form, route, or API.
- Regression coverage now locks the strip copy, ordering before the team board,
  focus behavior, and trial-state CTA language.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

### DM-183AJ: Final Move Approval Gate

Goal: after private work is approved as useful, keep the external move waiting
for one explicit final approval.

Donor grounding:

- DM-010: reuse the durable lesson that output approval and launch approval are
  two different customer decisions.
- Polsia: keep the number of visible calls small and high-leverage.
- Naive/Paperclip: reuse `approvals`, `issueApprovals`, issues, documents, and
  work products instead of creating a parallel DearMe launch queue.

Completed:

- `reviewOutput(... approve ...)` now creates a single pending
  `dearme_output_next_move` approval for content, opportunity, portfolio, and
  report outputs.
- Workbench decisions now carry `outputId`, project final approvals into the
  same batch/work-stream/action-graph surfaces, and hide duplicate raw output
  review decisions while the final approval is pending.
- DearMe focused decision routing can match approval decisions by artifact id.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

### DM-183AI: Stale Prepared Work Preview

Goal: keep prepared private work readable when an older or still-syncing payload
has not attached document, update, or work-product previews yet.

Donor grounding:

- DM-014: reuse the product lesson that stale prepared-output payloads should
  remain reviewable instead of blanking or implying no work exists.
- Polsia: keep the review surface simple and autonomous; show the best available
  private-work signal without exposing runtime state.
- Naive/Paperclip/OpenClaw: keep the current output contract and avoid adding a
  second compatibility schema for old `reviewContext` payloads.

Completed:

- Updated `outputPreview(...)` to use document previews, latest updates, work
  product summaries, then the output summary as a final customer-readable
  fallback.
- Added a focused UI regression proving Private Work stays readable and does not
  show the misleading first-draft waiting copy while private artifacts sync.
- Left the current DearMe-specific mobile navigation untouched because the
  active layout already routes `/dearme` through `DearMeMobileNav`.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AH: Review Feedback Preferences

Goal: make owner review notes feel like persistent drafting preferences without
adding another memory backend.

Donor grounding:

- DM-085: reuse the product lesson that review feedback should guide the next
  draft, not its stale `reviewLearning` schema.
- Lindy: make learned preferences scannable and compact near source management.
- Naive/Paperclip/OpenClaw: keep the current activity-log Voice & Memory rows as
  the source of truth.

Completed:

- Added a Review preferences section to Voice & Memory when active
  `review_feedback` rows exist.
- Kept preference rendering derived from `visibleLatestMemory`, so archive and
  restore behavior continue to control whether feedback is active.
- Updated the workbench UI regression fixture to prove review notes render as
  next-draft guidance without leaking hidden substrate terms.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AG: Retire Source Confirmation

Goal: make retiring a private Voice & Memory source feel like a deliberate
DearMe trust-boundary action while preserving the current archive/restore
contract.

Donor grounding:

- DM-019: reuse the product-owned confirmation boundary, not its stale component
  wiring.
- Lindy: keep source management compact and reviewable.
- Naive/Paperclip/OpenClaw: keep the existing memory archive mutation and
  private-history projection backstage.

Completed:

- Added a DearMe-owned confirmation dialog before a saved source can be retired.
- Kept the existing source card, archive mutation, retired-source list, and
  restore path unchanged after confirmation.
- Updated UI regressions so the archive mutation is not called until the
  confirmation action runs, including the customer-safe error path.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AF: Live Proof Feed and Prepared Work Ordering

Goal: make the current DearMe workbench feel more like proof is arriving from
an autonomous team, while avoiding a stale DM-020/DM-022 service/schema replay.

Donor grounding:

- Polsia: preserve the live proof-feed / work-happened-while-away choreography.
- Lindy: keep reviewable action cards and inline decisions as the scan pattern.
- Naive/Paperclip/OpenClaw: keep the existing workbench stream, outputs, review,
  and Voice & Memory contracts backstage.
- Symphony: use worker branches as candidate evidence, not wholesale merges.

Completed:

- Renamed the current live team feed to a live proof feed and grounded its helper
  copy in prepared, updated, or held work that waits for the user's call.
- Kept Private Work ahead of the 90-second first-cycle form after the main team
  board so reviewable work stays ahead of setup.
- Added UI regression coverage for the new proof-feed label and prepared-work
  ordering.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AE: User-Facing Leadership Prompts

Goal: make DearMe's leadership/reporting workers sound like a private Chief
and Dear-me letter loop instead of a CEO/board-update product, without changing
the runtime contract they rely on.

Donor grounding:

- Symphony: sidecar prompt audit identified the lowest-risk copy layer and the
  generated skill mirrors that had to be regenerated.
- Polsia: preserve the daily monitor/review/queue/report rhythm and simple
  progress-letter ritual.
- Naive/Paperclip/OpenClaw: keep tool names, report type identifiers, and the
  generated skill pipeline stable while the product language improves.

Completed:

- Reframed Chief of Staff as DearMe's private Chief writing the Dear-me letter,
  while keeping queue-management, reporting order, and `ceo_daily_summary`
  compatibility intact.
- Reframed Reporting as a DearMe letter sender rather than CEO board update,
  while keeping the three required tool calls and `ceo_cycle_summary` intact.
- Regenerated the OpenClaw skill wrappers from source and added prompt
  regression assertions for the new product language plus the preserved report
  type contracts.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `rg -n "You are the CEO|CEO Briefing|Email owner|board update" packages/plugins/dearme-agent-prompts/src/prompts/chief-of-staff.ts packages/plugins/dearme-agent-prompts/src/prompts/reporting.ts packages/plugins/dearme-openclaw/generated/skills/dearme-chief-of-staff/SKILL.md packages/plugins/dearme-openclaw/generated/skills/dearme-reporting/SKILL.md`
  returned no matches.
- `git diff --check -- packages/plugins/dearme-agent-prompts/src/prompts/chief-of-staff.ts packages/plugins/dearme-agent-prompts/src/prompts/reporting.ts packages/plugins/dearme-agent-prompts/src/index.test.ts packages/plugins/dearme-openclaw/generated/skills/dearme-chief-of-staff/SKILL.md packages/plugins/dearme-openclaw/generated/skills/dearme-reporting/SKILL.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AD: Workbench Projection Trace Coverage

Goal: keep the current DearMe workbench response customer-safe even when nested
review feedback traces contain Symphony/OpenClaw/Paperclip/provider language.

Donor grounding:

- DM-044/DM-045: keep the projection boundary and hidden-substrate regression
  idea, not the retired service/file layout.
- Symphony: treat worker output as evidence to map onto the current workbench
  response contract.
- Paperclip/OpenClaw: preserve the internal substrate while keeping the paid
  beta workbench framed as DearMe team progress.

Completed:

- Projected output review feedback trace headline, summary, user feedback, and
  changes through the shared DearMe workbench projection helper.
- Added fast unit coverage for helper text and deeply nested output payloads.
- Left routes, schemas, activity storage, and embedded Postgres service flow
  unchanged.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts --run`
  passed: 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

### DM-183AC: Channel-Neutral Prompt Rails

Goal: keep DearMe's first-run team instructions from implying a fixed X or
LinkedIn-first public surface before the user connects their own channels.

Donor grounding:

- Symphony: sidecar review identified the lowest-risk language layer while the
  coordinator kept implementation local.
- Polsia: preserve a simple autonomous public-work loop without channel setup
  becoming the product surface.
- Naive/Paperclip: keep tool contracts and approval gates stable while product
  copy improves.

Completed:

- Replaced bootstrap X/LinkedIn defaults with connected-channel language for
  public publishing and profile setup.
- Updated Content Producer's channel preferences and launch-boundary wording so
  generated skill prompts no longer seed a LinkedIn/X default.
- Synchronized generated OpenClaw bootstrap and skill files from source.
- Left `post_x`, tweet-shaped payload fields, OAuth platform docs, and outbound
  tool bindings unchanged because those are contract surfaces.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed: 26 tests.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 18 tests.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `git diff --check -- packages/plugins/dearme-openclaw/src/bootstrap.ts packages/plugins/dearme-openclaw/generated/bootstrap/AGENTS.md packages/plugins/dearme-openclaw/generated/bootstrap/USER.md packages/plugins/dearme-openclaw/generated/bootstrap/SOUL.md packages/plugins/dearme-openclaw/generated/skills/dearme-content-producer/SKILL.md packages/plugins/dearme-openclaw/src/index.test.ts packages/plugins/dearme-agent-prompts/src/prompts/content-producer.ts packages/plugins/dearme-agent-prompts/src/index.test.ts docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AB: Mutation Error Coverage

Goal: lock the customer-safe error boundary for the DearMe page's highest-risk
mutation paths without changing the already-current runtime flow.

Donor grounding:

- DM-046/DM-047: keep the source/action mutation failure cases, not the stale
  component offsets or older button copy.
- Symphony: treat worker branches as regression evidence to replay onto the
  current architecture.
- Polsia/Lindy: keep failures framed as team or private-work issues instead of
  provider, workspace, or route failures.

Completed:

- Added Voice & Memory save, retire, and restore failure regressions.
- Added Brand OS preview/start failure regressions.
- Added focused private-work review failure regression coverage.
- Left production code unchanged because the current page already uses the
  shared DearMe customer-safe error helper on those paths.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 58 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AA: Live Feed State Guidance

Goal: make the live team feed easier to scan by explaining what each state means
for the user's next move.

Donor grounding:

- DM-088: keep the state-explanation idea, not the stale replacement component.
- Polsia: preserve visible team momentum and quick status comprehension.
- Lindy: continue using action-card grammar instead of bespoke feed cards.
- Symphony: use worker branches as evidence to absorb into the current
  architecture.

Completed:

- Added state guidance derived from the existing live-feed item kind/status,
  including review-ready, in-motion, recorded, memory, report, blocked, and
  cancelled states.
- Rendered that guidance inside the current `DearMeActionCard` next-action
  surface, keeping customer language small and decision-oriented.
- Left the workbench schema, route shape, query cache, and runtime event layer
  unchanged.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183Z: Memory Context Term Safety

Goal: keep Voice & Memory updates from reintroducing donor/runtime vocabulary
when they become future DearMe routine guidance.

Donor grounding:

- DM-043: reuse the customer-safe memory-label idea without importing the stale
  voice-memory service shape.
- Symphony: treat old worker branches as evidence to inspect and absorb, not as
  raw merge targets.
- Naive/Paperclip: keep using the existing activity-log memory path and routine
  refresh flow.

Completed:

- Added a customer-safe normalization pass for Voice & Memory titles, bodies,
  and source labels before they are rendered into DearMe routine descriptions.
- Updated the existing routine-context regression so a proof point that contains
  substrate, provider, route, credential, and runtime terms refreshes into
  DearMe-owned wording.
- Kept schema, routes, UI, and memory persistence unchanged.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
  passed: 4 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-memory-context.ts server/src/__tests__/dearme-memory-context.test.ts docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183Y: Launch Boundary Cards

Goal: make public-action caution visible while users scan prepared private work,
before they open a focused decision panel.

Donor grounding:

- DM-030: reuse the review-boundary card idea without depending on the old
  `reviewContext.approvalBoundary` shape.
- Polsia: keep the control surface simple; the user sees what is safe and what
  waits for review in place.
- Naive/Paperclip: reuse existing output detail contracts rather than adding
  a parallel card-specific field.

Completed:

- Added a `Launch boundary` strip to ready private work cards when
  `approval_gate` or `deploy_gate` detail text is present.
- Kept the existing detail grid intact so focused review and first-week detail
  coverage continue to use the same source payload.
- Added UI coverage for the launch boundary strip on a prepared content card.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183X: Team Progress Map Copy

Goal: keep the growth map customer-owned by removing the last visible workstream
label from the DearMe page.

Donor grounding:

- DM-038: reuse the product-facing team progress copy direction without
  replaying stale component edits.
- Polsia: keep the surface compact and legible; the user sees progress, not
  implementation lanes.
- Symphony: treat old worker output as reusable source material, then absorb the
  smallest current-safe slice into the coordinator branch.

Completed:

- Renamed the visible growth-map heading from `Team work stream` to `Team
  progress map`.
- Kept `workbench` and `workStream` as internal route/schema vocabulary for this
  slice instead of starting a broad contract migration.
- Added a regression assertion that the retired customer-facing phrase stays out
  of the page.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183W: Retired Voice & Memory Restore

Goal: let users recover a retired private source while keeping Voice & Memory
maintenance inside the existing DearMe workbench.

Donor grounding:

- Lindy: source management should stay reviewable and reversible without
  sending users to a separate settings surface.
- Polsia: the workbench should preserve personal-brand continuity rather than
  making a bad retire action feel permanent.
- Naive/Paperclip: reuse the current activity-log memory substrate, memory
  update result shape, and routine refresh path.
- Symphony: absorb the branch as a bounded maintenance slice in the current
  coordinator branch.

Completed:

- Added `memory.archived` to the DearMe workbench contract and projection.
- Added an owner-only restore route that reconstructs the last saved private
  source from activity history and writes a fresh memory update.
- Added a `Retired sources` workbench section with a `Restore` action and UI
  mutation wiring.
- Added route, embedded workbench, and UI coverage for restore behavior.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 93 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md packages/shared/src/validators/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/routes/dearme.ts server/src/services/dearme-workbench.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183V: Brand OS Preview Copy Cleanup

Goal: keep the Brand OS preview customer-owned by describing the first pass as
private work and working rhythm rather than internal operations.

Donor grounding:

- Lindy: assistant work surfaces should stay outcome-oriented and review-first.
- Polsia: the onboarding proof should feel like a personal-brand rhythm, not a
  backend cycle table.
- Naive/Paperclip: reuse the current preview payload and execution plan; do not
  rename stable operation fields or API contracts.
- Symphony: absorb the old DM-029 worktree as a scoped copy slice inside the
  current integration branch.

Completed:

- The empty Brand OS preview now says the user can see first private work,
  budget, memory seeds, and launch boundaries before anything starts.
- Preview metrics and sections now say `Rhythm`, `Working rhythm`, and `First
  private work`.
- Tests now lock out `First operations` and `machinery hidden` from the visible
  preview surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 52 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183U: Artifact Links For Focused Private Work

Goal: keep Symphony-driven review entrypoints customer-safe by naming prepared
work as artifacts in generated DearMe links while preserving old review
handoffs.

Donor grounding:

- Lindy: customer action links should describe the thing being reviewed, not
  leak internal output mechanics.
- Polsia: the live work stream should feel like a polished product rhythm, even
  when it is carrying exact prepared-work context.
- Naive/Paperclip: reuse the existing output id and focused review parser; do
  not add a second route, table, or review surface.
- Symphony: use the integration branch as the coordination spine and absorb the
  stale worker residue as a scoped route cleanup.

Completed:

- Generated DearMe decision links now use `artifact=` for prepared-work focus.
- Legacy `output=` links still parse, so older handoffs keep opening the exact
  private work item.
- Updated work-ready, continue, batch, Dear me letter, opportunity, and first
  proof-pack route assertions to the canonical artifact link.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183T: Exact Output Focus From Review Entrypoints

Goal: preserve the exact prepared-output context from stale worker review
entrypoints without adding another DearMe route or review surface.

Donor grounding:

- Lindy: pending-action cards should let the user make the next call in place
  when the work is already reviewable.
- Polsia: the work stream should keep high-leverage launch calls in the user's
  current rhythm instead of sending them into a raw task view.
- Naive/Paperclip/Symphony: reuse current output handoff ids, batch decision ids,
  and live stream payloads; do not expose hidden runtime or worker machinery.

Completed:

- Batch decision cards now open the focused DearMe decision route with the
  prepared output selected.
- The Dear me letter carries its report output id into the same focused decision
  route.
- Reviewable live-feed work renders the existing prepared-work review controls
  directly in the feed, while in-motion items still deep-link to the exact output
  when useful.
- Preserved approval-first routing for approval-backed live-feed items and kept
  raw issue URLs out of the DearMe surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183S: Decision-First Live Team Feed

Goal: carry forward DM-088's decision-first team progress value without
reverting the newer DearMe workbench architecture.

Donor grounding:

- Polsia: progress should show the customer what needs a call before showing
  background motion.
- Lindy: operational feeds should group actionable work instead of presenting
  a flat event list.
- Naive/Paperclip/Symphony: reuse the current workbench stream projection,
  action cards, review-loop labels, and DearMe decision routing; do not add a
  second feed contract or expose hidden work machinery.

Completed:

- Grouped the existing live team feed into `Needs your call`, `In motion`, and
  `Recent updates`.
- Added counts for calls waiting and private work in motion in the live-feed
  header.
- Preserved current proof-pack continuity, growth map, run ledger, Work Ready,
  and Decisions Needed surfaces instead of replaying the stale DM-088 component
  shape.
- Added focused page coverage for the new grouping and kept raw issue/approval
  routes hidden from the DearMe surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DEA-8: Live Proof Pack Handoff v0

Goal: prove the first-run DearMe aha moment with real prepared proof flowing
through the existing handoff and workbench path, without adding a parallel
first-run contract.

Donor grounding:

- Polsia: the first session should show concrete team progress quickly.
- Naive/Paperclip: reuse documents, output records, approval gates, and the
  workbench read model as the hidden execution substrate.
- Lindy: keep proof cards and review actions compact and customer-readable.

Completed:

- Absorbed the useful docs-only Symphony handoff from Linear `DEA-8` without
  merging the worker checkout's unrelated file deletions.
- Verified the existing first-cycle start path prepares source-labelled
  identity, audience, content, opportunity, private-site, and report proof.
- Confirmed `/outputs` returns all six ready-for-review output kinds and
  `/workbench` projects them into Work Ready, Decisions, batch decisions,
  recent progress, stream, ledger, and output surfaces.
- Recorded the verification in `docs/dearme/BUILD-STATE.md`; no code or schema
  changes were needed.

Verification:

- Linear `DEA-8` Symphony completion comment
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- DEA-8 focused DearMe Vitest target
- DEA-8 local API health check and shell API smoke against `/first-cycle/start`,
  `/outputs`, and `/workbench`

### DM-183R: DearMe Live Refresh Invalidation

Goal: make DearMe's visible work stay current when background decisions,
reviews, comments, and output activity arrive over the existing live-update
channel.

Donor grounding:

- Polsia: the customer should see progress appear without manual refresh or
  admin navigation.
- Lindy: decisions and comments are operational signals that should update the
  active customer context quickly.
- Naive/Paperclip/Symphony: reuse live updates, query invalidation, activity
  payloads, and DearMe workbench projection; do not add a second realtime
  channel.

Completed:

- Added DearMe product activity detection for activity actions and metadata.
- DearMe product activity invalidates workbench, brand blueprint, outputs, and
  paid-beta access queries.
- DearMe approval decisions now refresh the DearMe product surface while still
  preserving generic approval invalidations.
- Broad issue comment/update events refresh only the DearMe workbench so the
  server projection decides whether the comment is customer-visible.
- Heartbeat and agent status events also refresh the DearMe workbench so the
  customer surface catches durable progress changes.

Verified:

- `pnpm exec vitest run ui/src/context/LiveUpdatesProvider.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DM-183Q: Review Feedback Memory Loop

Goal: make negative or corrective review decisions become future DearMe memory
so the next private pass learns from what the customer rejected.

Donor grounding:

- Polsia: the growth loop should keep learning from the owner without manual
  process management.
- Lindy: rejection and revision are still structured signals, not terminal
  failures.
- Naive/Paperclip/Symphony: reuse activity log, routine refresh, workbench
  memory projection, and existing review route; do not add a new customer
  workflow.

Completed:

- Added `review_feedback` to the shared DearMe memory kind contract and UI/
  workbench labels.
- The DearMe review route now records review feedback memory when the owner
  requests changes, asks for another pass, or says prepared work is not useful.
- The memory body captures the output title, customer note, and continuation
  intent in customer-safe language.
- Review feedback refreshes existing DearMe growth-cycle routine context.
- Approved outputs remain quiet so the memory stream does not fill with
  redundant successful decisions.

Verified:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

### DM-183P: DearMe Approval Entry Routes

Goal: keep every approval entry point that can surface a DearMe decision inside
the DearMe decisions surface, while leaving generic approvals untouched.

Donor grounding:

- Polsia: decisions should feel like a small number of product moves, not an
  admin approval list.
- Lindy: users should land directly in the context where a decision can be made
  or corrected.
- Naive/Paperclip/Symphony: keep the durable approval/comment/activity
  substrate backstage; DearMe owns routing, copy, and error translation.

Completed:

- Added `approvalDetailHref(...)` plus DearMe-only approval action error
  filtering to the shared DearMe approval helper.
- Routed DearMe approval activity rows and linked comment-thread approvals to
  `/dearme?view=decisions&approval=...`.
- Routed issue-detail linked approvals, approval list cards, inbox rows, and
  inbox keyboard navigation through the same helper.
- Kept generic approvals on `/approvals/:id` and preserved generic raw error
  behavior.
- After DearMe reject/approve actions, kept users on the DearMe decision
  surface with short product-safe completion wording.

Verified:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ActivityRow.test.tsx ui/src/components/CommentThread.test.tsx ui/src/pages/Inbox.test.tsx ui/src/pages/IssueDetail.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DM-183O: DearMe Approval/Profile UI Boundaries

Goal: keep shared UI approval/profile entry points inside the DearMe product
surface when the underlying approval is a DearMe decision.

Donor grounding:

- Polsia: the customer should see a small number of high-leverage decisions,
  not a generic admin approval queue.
- Lindy: pending-review actions should route to the action context where the
  user can decide quickly.
- Naive/Paperclip/Symphony: keep approvals, inbox rows, and hidden execution
  failure terms as backstage substrate; DearMe translates the entry point and
  error language.

Completed:

- Added a shared DearMe approval-type helper for decision links and approved
  redirects.
- Registered `dearme_output_next_move` in the shared approval type contract so
  tests no longer need to cast DearMe output decisions around the validator.
- Routed DearMe approvals from approval cards, detail pages, lists, and inbox
  rows back to `/dearme?view=decisions&approval=...`.
- Hid requester identity, raw IDs, linked issues, and full payload controls for
  DearMe approval detail pages.
- Replaced inherited missing-company wording on the DearMe page with a DearMe
  profile prompt.
- Expanded customer-safe error filtering for model/key/token/orchestration
  failure strings on the DearMe action path.

Verified:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/Inbox.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/Inbox.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`

### DM-183N: Scannable First-Week Output Details

Goal: make first-week private work cards show the concrete value inside
content, opportunity, portfolio, and report outputs without introducing another
output contract.

Donor grounding:

- Polsia: the first pass should show useful work immediately, not hide the
  proof behind a generic card.
- Lindy: keep detail fields in the existing action-card/review grammar.
- Naive/Paperclip/Symphony: reuse output handoff `details`; do not add a new
  runtime, route, schema, or worker-facing product surface.

Completed:

- Added output-kind detail ordering in the DearMe UI for Brand OS, voice
  profile, content drafts, opportunity drafts, portfolio updates, and weekly
  reports.
- Made private-work cards and focused prepared-work review consume the same
  ordered detail selection.
- Added regression coverage proving a content draft with shuffled detail order
  still shows channel, audience, hook, draft body, proof, and launch boundary.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`
- `.symphony/bin/dearme-symphony status`

### DM-183M: DearMe Server Safe Boundaries

Goal: make DearMe server failures match the customer-safe product boundary so
the UI does not receive raw board, company, auth, validation, or access-control
wording, and stale approvals cannot look approved before they fail.

Donor grounding:

- Polsia: the customer surface should explain the next product step, not expose
  internal control-plane labels.
- Lindy: approval/review failures should stay short and actionable.
- Naive/Paperclip/Symphony: keep authz, company access, validation, and
  approval payload shape as the hidden substrate; DearMe translates or
  preflights the error before it reaches the customer path.

Completed:

- Added a DearMe route error boundary that converts Zod failures and common
  access failures into product-safe messages.
- Preserved unknown server errors and non-DearMe route behavior by keeping the
  boundary inside `dearmeRoutes(...)`.
- Added Brand OS approval preflight before approval mutation, keeping malformed
  legacy payload approvals pending with a customer-safe refresh message.
- Added route, approval-service, and embedded apply regression coverage for
  company-access, owner-account, validation, and stale-payload failures.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/approvals-service.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/server typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183L: Visible Learning Loop

Goal: make the operating rhythm read as a full autonomous loop by showing
learning as an explicit customer-visible stage, not only as words in the Growth
cycle heading.

Donor grounding:

- Polsia: plan/work/review/learn should feel like a compounding growth rhythm,
  not a one-pass task board.
- Lindy: keep the learning signal inside the existing action-card grammar
  instead of adding a separate admin-style memory panel.
- Naive/Paperclip/Symphony: reuse Voice & Memory, source review, report
  learnings, and the existing action graph; do not expose runtime or worker
  details.

Completed:

- Added a Learn card to the Growth cycle panel using existing workbench facts.
- Derived the visible signal from current memory, pending source review, report
  learnings, and action-graph memory nodes.
- Updated regression coverage so the paid-beta shell proves the visible
  learning loop stays present.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183K: Feedback-Applied Review Trace

Goal: make repeated private revisions feel trustworthy by showing the user what
changed after their last feedback, while still reusing the existing output
handoff and review-comment substrate.

Donor grounding:

- Polsia: keep review momentum visible and compress "the team listened" into a
  single high-confidence card.
- Lindy: use a compact action-card pattern for applied feedback instead of a
  new modal or task detail surface.
- Naive/Paperclip/Symphony: reuse comments, documents, work products, and
  worker-updated outputs; do not expose provider, issue, runtime, or worker
  metadata to customers.

Completed:

- Added a strict `feedbackTrace` schema on DearMe output review loops with
  headline, summary, optional user feedback, and 1-4 customer-safe changes.
- Built feedback traces in `dearme-output-handoff` when fresh private work
  lands after a request-changes, not-useful, or new-direction decision.
- Rendered the trace as a focused prepared-work card labeled "Feedback
  applied", including the user's prior note and the latest private changes.
- Tightened live-pulse and team-board copy so customer-facing strings do not
  translate hidden terms into other hidden terms such as workbench/workspace.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183J: Customer-Safe Review Copy and Error Boundaries

Goal: absorb the useful DM-035/DM-036/DM-041/DM-042 UI residue as one
customer-facing DearMe review pass without replaying stale branch history.

Donor grounding:

- Polsia: make prepared work feel ready for the user's decision, not like a
  generic artifact inventory.
- Lindy: keep review decisions short, action-oriented, and written in the
  user's voice.
- Naive/Paperclip/OpenClaw/Symphony: keep inherited service failures behind a
  product-safe DearMe boundary on the customer path.

Completed:

- Renamed the private work review header and count copy away from generic
  "surfaces" language.
- Rewrote default approval, rejection, revision, regeneration, and new-direction
  notes so recorded decisions read naturally as DearMe review outcomes.
- Added panel/action error sanitization and regression coverage so internal
  provider/runtime/adapter failures do not leak through the DearMe UI.

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

### DM-183H: Focused Work Context and Action Labels

Goal: replay the still-useful DM-034/DM-040 UI residue without merging stale
worker history.

Donor grounding:

- Lindy: action cards should keep compact controls while retaining clear
  accessible context.
- Polsia: prepared work should explain missing ingredients before any public
  move.
- Naive/Paperclip: reuse existing output source evidence and review routes; no
  new schema, endpoint, or table.
- Symphony: consume candidate worktrees as scoped slices.

Completed:

- Added artifact-specific accessible labels to prepared-work card actions while
  preserving visible `Review`/`Open`.
- Focused prepared work now filters blank source rows and shows a Voice &
  Memory empty state when context is missing.
- Customer-facing bootstrap instructions use team-routing/workspace language
  instead of proxy/runtime wording.

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

- Symphony is the default cooperation spine for DearMe work from 2026-05-10
  forward. Use Linear team `DEA` and `.symphony/WORKFLOW.md` for active worker
  lanes.
- The main DearMe checkout is the coordinator/integration surface. Use it to
  update this ledger and `BUILD-STATE.md`, integrate reviewed worker slices,
  and verify the product branch.
- Worker tickets must cite donor paths used, adapted, and rejected.
- Workers must start from the Symphony-selected source branch/workspace, not a
  stale DM-001/DM-103 brief or an old local worker branch.
- Product-code workers should use isolated Symphony workspaces. Create ad hoc
  local worktrees only when Symphony is blocked or the task explicitly needs a
  local integration lane.
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
| `src/bootstrap.ts` | DM-S05 / DM-138 / DM-183H | Templates for `AGENTS.md` (operating instructions encoding the 4 doctrine rules), `SOUL.md` (persona — never sycophantic, never AI-disclaimy), `IDENTITY.md` (team name, conversational lead), `USER.md` (stub forces onboarding ritual). Injected into OpenClaw workspace on first-run; current bootstrap language points workers at team routing instead of proxy/runtime phrasing. |
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
