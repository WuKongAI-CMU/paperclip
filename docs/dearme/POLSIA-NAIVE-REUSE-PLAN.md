# Polsia / Naive Reuse Plan

> Goal: make DearMe a maximum-reuse product, not a greenfield rebuild.
> Decision date: 2026-05-07.
> 2026-05-09 update: this doc is the **strategic posture**. The
> mechanism-by-mechanism integration directive (every donor mechanism mapped
> to a dearme path with PR ticket) lives in
> [`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`](POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md).
> The verbatim production evidence behind each mechanism lives in
> [`POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`](POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md).
> When this doc and the master plan disagree, **the master plan is the
> ticket source of truth** (DM-S01 + DM-138-159).

DearMe should be built as:

```
Polsia product choreography
  + Naive/Paperclip control plane
  + DearMe-first operator core cannibalized from OK Partner
  + DearMe personal-brand overlay
```

The product model is: **treat the person as a brand and a one-person company**.
That makes Polsia and Naive more reusable than they first appear. A person's
brand has goals, documents, workers, tasks, cycles, deliverables, channels,
costs, reports, and public assets, just like a small company.

## 1. Reuse Posture

Default to copying or adapting. Build new code only when the domain semantics
are genuinely DearMe-specific.

| Source | Reuse level | Rule |
|---|---|---|
| Paperclip OSS | Direct reuse | Keep auth, companies, agents, issues, routines, heartbeats, adapters, approvals, workspaces, cost events |
| Naive private overlay pattern | Rebuild small overlay | Implement the missing cloud pieces: blueprint orchestrator, credits, channels, app/site provisioning, templates |
| Polsia product layer | Adapt aggressively | Reuse CEO/chat, cycle engine, live progress, deliverables, reports, Twitter/content, cold outreach, personal-brand fork spec |
| OK Partner | Cannibalize and reshape | Reuse deliverables, memory, channel actions, provider jobs, credit ledger, and setup-blueprint flow, but rename, merge, or replace OK Partner boundaries when DearMe benefits |
| DearMe | Thin overlay | Add Brand OS, voice profile, voice gate, personal-brand templates, opportunity scoring, portfolio semantics, Dear me reports |

## Current Implementation Status - 2026-05-09

The current DearMe branch has moved beyond architecture-only planning.

The 2026-05-09 Polsia/Naive comparison in
`docs/dearme/POLSIA-NAIVE-COMPARISON.md` confirms the split: Polsia is the
product choreography and customer trust reference; Naive/Paperclip is the
execution, approval, budget, and worker substrate. DearMe should not pick one
donor wholesale or copy either product surface directly.

Already implemented:

- `brand_blueprint` exists as a typed DearMe contract rather than a raw
  `setup_payload` copy.
- DearMe routes and workbench services project from existing Paperclip/Naive
  primitives: companies, agents, issues, routines, approvals, documents, work
  products, activity records, and finance events.
- DM-106 through DM-109 added visible review-loop state, feedback handoff,
  cycle-aware team progress, and actionable live-feed review buttons without
  adding a parallel runtime.
- DM-111 through DM-117 moved the main work cards onto a shared DearMe action
  primitive and added a normalized retry/continue/direction entrypoint that
  reuses the existing focused review route plus a thin DearMe `/continue`
  wrapper over the existing output handoff/review/wakeup path.
- DM-118 and DM-119 project routine/spend cadence, ready work, decisions, and
  Voice & Memory signals into visible DearMe progress and weekly report
  digests without adding a parallel DearMe runtime or report store.
- Polsia's key product lesson is now represented in the product shell: the user
  sees a team moving through a growth cycle and can open the prepared decision
  directly from the work stream.

Still not maximized:

- DM-118 now projects Naive/Paperclip routine runs and DearMe-agent cost events
  into DearMe-safe progress context as cycle check-ins and spend checkpoints.
  The deeper budget/credit UI is still not complete, but the live workbench no
  longer needs a parallel DearMe progress table to show routine and spend
  lineage.
- DM-119 now turns the weekly Dear me report into a Polsia-style review digest
  backed by those same workbench projections: what changed, what needs the
  user's call, what the team learned, and what the next cycle should push.
- Lindy-style reusable action cards have started landing as the live-feed,
  Decisions Needed, Work Ready, Private Work, and Voice & Memory source
  `DearMeActionCard` surfaces; DM-116 adds shared paused, retry, blocked, and
  decision-needed attention grammar to the same primitive and wires current
  review-loop/status projections into the main work cards; DM-117 adds the
  normalized retry/continue/direction entrypoint on top of the same surface.
- Voice & Memory still needs richer source import and management before it can
  feel like a durable Brand OS, not just generated text.

Next reuse priority:

```text
Polsia = keep visible growth-cycle motion.
Naive/Paperclip = keep execution, approval, document, routine, and cost truth.
Lindy = extract reusable web action-card and action-needed patterns.
DearMe = translate all of that into personal-brand language.
```

If a slice is blocked by a product-experience question, bias toward Polsia. If
it is blocked by a work-state, spend, approval, or worker-isolation question,
bias toward Naive/Paperclip.

## 2. Polsia Reuse

Polsia should be treated as the product and automation template.

Directly adapt:

- CEO / Chat -> Chief of Staff / Manager
- company operating cycle -> personal-brand growth cycle
- task queue -> growth work queue
- live progress / `send_reply` -> DearMe live progress
- reports -> Dear me weekly report
- company documents -> Brand OS documents
- Twitter agent -> voice-matched content producer
- Cold Outreach agent -> opportunity scout
- Engineering / site builder -> portfolio and lead-magnet builder
- Data / Monitoring -> growth analyst
- personal-brand fork spec: `companies -> brands`, `company_documents -> brand_documents`, `leads -> opportunities`, `company site -> portfolio site`

Do not blindly copy:

- org-chart-first UI
- 22-MCP sprawl
- shared platform social identity
- default Meta Ads
- Stripe Connect / revenue-share billing in P0
- heavy per-customer app factory unless the deliverable is a portfolio, lead
  magnet, or simple customer-owned app asset

## 3. Naive / Paperclip Reuse

Naive's strongest lesson is that the product should not rebuild the agent
platform. It should wrap Paperclip with a thin cloud/product overlay.

Directly reuse from Paperclip:

- `companies` as the tenant/workspace primitive
- Better Auth user/session/account schema
- `agents` and `reportsTo` for team structure
- `issues` as task/work items
- `routines`, wakeups, and heartbeat runs as the execution loop
- `approvals` and issue approvals for consequence gates
- `cost_events` and budget policy for credits and usage
- adapters, especially gateway/remote execution boundaries
- execution workspaces and task sessions

Rebuild the Naive private overlay in our own names:

- `setup_payload` -> `brand_blueprint`
- `/api/apps` -> portfolio / lead-magnet / generated asset provisioning
- credits / trial / plan / usage debits
- channels and external account status
- onboarding checklist
- template catalog for archetypes, agents, cycles, and generated site assets
- per-user or per-brand worker provisioning when isolation becomes necessary

Important: keep `brand_blueprint` as a typed, versioned object with audit trail.
Do not rely only on hidden HTML comments, even if Naive used that trick.

## 4. Compatibility Layer

To maximize speed, DearMe should start with a compatibility layer instead of
renaming the whole platform. This is a default implementation tactic, not a
product constraint. If OK Partner names, tables, routes, or UI boundaries make
DearMe feel worse, change them.

| Product concept | Internal backing | Notes |
|---|---|---|
| Brand workspace | Paperclip `company` + DearMe brand profile | Keep `company` in kernel, expose `brand` in UI/API copy |
| Brand documents | Paperclip documents / work products / memory facts tagged as Brand OS | Match Polsia document types with DearMe labels |
| Growth work | Paperclip issues + OK deliverables | Group by content, opportunity, portfolio, report |
| Growth cycles | Paperclip routines / wakeups | Use Polsia-style planning/execution/review cadence |
| Team roles | Paperclip agents from DearMe templates | Map Manager, Content, Outreach, Portfolio, Analyst roles |
| Opportunities | OK channel actions + DearMe opportunity overlay | Replace CRM leads with podcasts, clients, jobs, collabs, gigs |
| Portfolio/site | OK provisioning jobs + app/site rails | Use Vercel/Supabase only for generated customer assets |
| Credits | Paperclip cost events + OK credit ledger | Show user credits and budget, not raw token accounting |

P0 paid beta access should be ledger-derived: a board operator records a manual
customer payment as a DearMe credit purchase in `finance_events`, and the product
shows trial versus paid status, lifetime paid value, and remaining customer
credit from that ledger. This keeps Stripe Connect and a new billing table out of
P0 while still giving the app a real paid-access proof path.

This keeps the low-level runtime stable while allowing Polsia-style product
semantics above it. The low-level runtime should stay stable because stability is
useful, not because OK Partner compatibility is sacred.

## 5. `brand_blueprint` Orchestrator

The `brand_blueprint` is the DearMe version of Naive's `setup_payload` and the
main bridge from onboarding to autonomous execution.

Minimum apply flow:

1. Create or update the Brand Profile.
2. Create Voice Profile and seed Brand OS documents.
3. Install DearMe agent templates.
4. Create content, opportunity, portfolio, and report cycles.
5. Create initial Paperclip issues.
6. Create initial deliverable placeholders.
7. Configure channel-action gates.
8. Configure credits and budget policy.
9. Provision portfolio/lead-magnet asset only if needed.
10. Enqueue the first Chief of Staff and specialist wakeups.

The preview/apply/execute flow should be adapted from OK Partner setup blueprint
instead of written from scratch.

## 6. P0 Reuse Build Order

Build in this order to get the highest Polsia/Naive leverage fastest:

1. **Compatibility types**
   - `BrandWorkspace`, `BrandProfile`, `BrandDocument`, `GrowthCycle`,
     `GrowthDeliverable`, `Opportunity`.
2. **Blueprint orchestrator**
   - Adapt OK Partner setup-blueprint preview/apply/execute into
     `brand_blueprint`.
3. **Agent templates**
   - Fork Polsia Manager, Twitter, Cold Outreach, Reporting, Research, Browser,
     Data, and site-builder prompts into DearMe terms.
4. **Live progress**
   - Implement Polsia-style progress events on top of Paperclip live events.
5. **Deliverables**
   - Content drafts, opportunity briefs, portfolio updates, weekly report.
6. **Voice gate**
   - The main DearMe-specific quality gate.
7. **Credits and budget**
   - Surface Paperclip/OK cost events as customer-friendly credits.
   - Use manual DearMe paid-beta credit purchases for P0 access before adding a
     hosted checkout or Stripe Connect flow.
8. **Generated portfolio**
   - Use app/site provisioning only for portfolio, lead magnet, or media kit.

## 7. P0 Non-Goals

Do not spend early implementation time on:

- a new auth stack
- a new scheduler
- a new approval system
- a new billing ledger
- a separate channel-action framework
- full OAuth publishing for every channel
- Stripe Connect
- ads
- a public marketplace
- a generic app factory
- a second OK Partner-branded product surface

## 8. Success Criteria

DearMe is using Polsia and Naive well when a new user can:

1. Finish onboarding.
2. Get a generated `brand_blueprint`.
3. Automatically receive a DearMe team, growth cycles, and first tasks.
4. Watch live progress without managing agents.
5. Review content, opportunity, and portfolio deliverables.
6. Approve or reject one batch of risky actions.
7. Receive a weekly Dear me report.

If those happen through Paperclip/OK shared primitives rather than new
DearMe-only platform code, the reuse strategy is working.
