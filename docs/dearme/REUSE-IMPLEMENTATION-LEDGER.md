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
| Symphony | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` | Isolated worker loop, bounded tickets, worktree discipline, evidence-based handoff | Product runtime, DearMe user-facing workflow, or a reason to skip coordinator integration |

## Implemented Reuse Map

| DearMe area | Current implementation evidence | Donor reuse status | Next gap |
| --- | --- | --- | --- |
| Product shell | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/components/DearMeSidebar.tsx`; `ui/src/components/Layout.tsx` | DearMe-owned shell already hides inherited Paperclip chrome on the customer path. DM-130 adapts Polsia's "work happened while I was away" choreography, Lindy's two-rail home composition, and Littlebird's focused step/task-row discipline into the first workbench surface. DM-131 browser-polished the focus grid so the live desktop/mobile shell keeps the current work card compact and readable. DM-132 adds a DearMe-specific mobile nav so the phone shell routes users to Home, Decisions, Work Ready, Voice, and More without showing generic workspace destinations. DM-133 makes focused decision actions mobile-safe. DM-134 adds a Brand Team Run Ledger so the first product surface records what the team tried, prepared, learned, and needs from the user. DM-135 renders the first-run generated package with its approval boundary, proving that one positioning answer can produce useful team work without exposing runtime machinery. DM-136 reuses the same first-cycle contract for a private sample package so the shell proves the team output before personal input. | Next shell work should polish the home/landing composition around sample proof and Work Ready decisions, not create a new runtime UI. |
| Brand OS / `brand_blueprint` | `packages/shared/src/validators/dearme.ts`; `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/routes/dearme.ts` | Naive `setup_payload` pattern has been adapted into a typed DearMe contract and approval-gated apply flow. | Keep extending this contract only when P0 surfaces need it. |
| Workbench projection | `server/src/services/dearme-workbench.ts`; `server/src/__tests__/dearme-workbench.test.ts` | Naive/Paperclip tables remain the substrate for team, work, decisions, progress, reports, and memory projections. | Do not add a second runtime; enrich read models first. |
| Action graph and work stream | `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`; `packages/shared/src/validators/dearme.ts`; `ui/src/components/dearme/DearMeActionCard.tsx` | Polsia cycle/report choreography plus Lindy action-card grammar are already converging into customer-safe work cards. DM-133 makes focused decision/detail actions mobile-safe without changing the hidden approval/output-review substrate. DM-134 adds a typed `runLedger` read model derived from the existing workbench stream, with latest memory as a fallback, without adding another event table. | Use the ledger as the customer-facing progress spine before adding notification or report surfaces. |
| Output review and decisions | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `server/src/services/dearme-output-handoff.ts`; `server/src/__tests__/dearme-output-handoff.test.ts` | Lindy pending-action shape and Polsia "small number of high-leverage calls" are reused in Work Ready / Decisions Needed. DM-128 now lets focused prepared work be approved, revised, regenerated, or redirected inside the DearMe decision surface while Naive/Paperclip remains the hidden output review substrate. | DM-129 added policy cues; watch whether repeated review loops need richer server-owned failure history after real usage. |
| Voice & Memory source review | `server/src/services/dearme-workbench.ts`; `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx` | Lindy KnowledgeBase/source-management and slide-out detail patterns are now adapted: private sources become review cards, selected sources open a detail surface, reviewed facts save through the existing memory path, and not-useful sources use the existing retire path. | Watch whether reviewers need richer source history after repeated use; do not add backend shape until the current detail surface proves insufficient. |
| Weekly report and rituals | `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/services/dearme-workbench.ts` | Polsia report/cycle ritual is adapted into DearMe weekly report and daily team work language. | Add better report explanation and provenance after source drawer exists. |
| Cost and reliability | `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md`; `ui/src/pages/DearMeOnboarding.tsx`; current workbench/cycle projections; Naive cost-event docs; Lindy router/executor evidence | DM-129 adapts Polsia task/subscription attribution, Naive pre-invocation budget rails, and Lindy routing/circuit-breaker behavior into a DearMe policy plus a customer-safe workbench panel. | Add backend policy facts only when future autonomous jobs need state that cannot be derived from the current workbench and paid-beta status. |
| Generated portfolio/site | Existing brand blueprint and optional generated asset layer docs | Naive app/site provisioning remains optional P1/P2, not P0. Polsia personal-brand fork recommends Brand Site Builder, but DearMe first needs review-quality content and proof. | Start only after content/voice/opportunity loop is credible. |
| Development factory | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` | Symphony-style worker queue is useful for bounded tickets after coordinator updates the queue. | Workers must use this ledger and `BUILD-STATE.md` before selecting old tickets. |

## Recently Completed

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

## Not Complete Yet

DearMe is not release-ready just because these reuse decisions are documented.
The next meaningful product gain is DM-137: turn the now-working sample and
generated first-cycle proof into an aha-first home composition. The product
should shock the user with visible autonomous work before it asks them to manage
settings, sources, or approvals.
