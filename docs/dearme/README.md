# DearMe

> Your personal brand growth team. A private AI team that turns one person's
> work, voice, proof, and relationships into content, opportunities, portfolio
> updates, outreach, and Dear me reports.

**Current architecture lock:** [`INTEGRATED-ARCHITECTURE.md`](INTEGRATED-ARCHITECTURE.md)

**Product surface summary:** [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md)

**Current positioning, roadmap, and code architecture plan:** [`PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`](PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md)

**Current dirty-tree integration plan:** [`WORKTREE-INTEGRATION-PLAN.md`](WORKTREE-INTEGRATION-PLAN.md)

**Current baseline spine manifest:** [`BASELINE-SPINE-MANIFEST.md`](BASELINE-SPINE-MANIFEST.md)

**Marketing packaging guide:** [`POLSIA-MARKETING-PACKAGING-GUIDE.md`](POLSIA-MARKETING-PACKAGING-GUIDE.md)

**Polsia / Naive comparison:** [`POLSIA-NAIVE-COMPARISON.md`](POLSIA-NAIVE-COMPARISON.md)

**Polsia / Naive reuse contract:** [`POLSIA-NAIVE-REUSE-PLAN.md`](POLSIA-NAIVE-REUSE-PLAN.md)

**Polsia / Naive mechanism deep-dive (verbatim production evidence):** [`POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`](POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md)

**Polsia / Naive code reuse master plan (architect's integration directive, DM-S01 + DM-138-159 ticket roadmap):** [`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`](POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md)

**Polsia / Naive PM analysis (aggressive playbook + 5-min aha-moment design contract):** [`POLSIA-NAIVE-PM-ANALYSIS.md`](POLSIA-NAIVE-PM-ANALYSIS.md)

**Agency Agents role-library reference:** [`AGENCY-AGENTS-REFERENCE.md`](AGENCY-AGENTS-REFERENCE.md)

**Lindy / internal assistant baseline reuse plan:** [`LINDY-ASSISTANT-REUSE-PLAN.md`](LINDY-ASSISTANT-REUSE-PLAN.md)

**Action graph projection:** [`ACTION-GRAPH-ARCHITECTURE.md`](ACTION-GRAPH-ARCHITECTURE.md)

**Rebrand / provenance (required for competitor-informed work):** [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md)

**Status:** Product architecture locked. DearMe is the product north star.
Implementation should reuse Paperclip/Naive primitives, adapt Polsia's
automation choreography, and reshape OK Partner-derived source material only
when it makes DearMe easier to use.

**Current consolidation:** `INTEGRATED-ARCHITECTURE.md` is the current product
and technical architecture lock. `PRODUCT-ARCHITECTURE.md` is the product-surface
summary. `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md` is the execution plan.
`WORKTREE-INTEGRATION-PLAN.md` governs the current dirty-tree integration queue.
Older comparison, architecture, and backlog files remain useful research/source
material, but they do not override the current product lock or the
rebrand/provenance rules.

## What this is

DearMe gives one person a small AI growth team that turns their work,
experience, ideas, offer, side projects, and proof into public-facing assets and
opportunities.

The product treats the person as a brand and a one-person company. Their
reputation is the distribution layer; their consulting, career, creator, founder,
or side-business goal is the operating target.

It is not a journal, companion app, generic writing assistant, or agent admin
console. It should feel like a managed growth team:

- **Chief of Staff** keeps the user-facing conversation simple.
- **Brand Strategist** maintains positioning, audience, offer, and narrative.
- **Voice Editor** keeps output sounding like the user.
- **Content Producer** creates and repurposes posts, articles, newsletters, and scripts.
- **Opportunity Scout** finds clients, jobs, collaborations, podcasts, and communities.
- **Portfolio Builder** maintains the personal site, bio, case studies, and media kit.
- **Growth Analyst** writes weekly reports and recommends the next cycle.

The Polsia-shaped comparison:

- **Polsia:** "I help you build and run a company."
- **DearMe:** "I help you operate the marketing and opportunities around one person."

The local research archives that informed this design are listed at the bottom
of this file. Treat them as private source material for product judgment, not as
public provenance or copy-ready implementation material.

## Canonical reading order

1. [`INTEGRATED-ARCHITECTURE.md`](INTEGRATED-ARCHITECTURE.md)
   - current integrated architecture across DearMe, Lindy baseline, Polsia, Naive/Paperclip, and OK Partner-derived mechanics.
2. [`WORKTREE-INTEGRATION-PLAN.md`](WORKTREE-INTEGRATION-PLAN.md)
   - current dirty-tree integration plan, preservation policy, and next safe implementation slice.
3. [`BASELINE-SPINE-MANIFEST.md`](BASELINE-SPINE-MANIFEST.md)
   - current recoverable baseline branch, product spine, and branch hygiene rules.
4. [`PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`](PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md)
   - current product positioning, roadmap, P0 acceptance, and code architecture.
5. [`POLSIA-MARKETING-PACKAGING-GUIDE.md`](POLSIA-MARKETING-PACKAGING-GUIDE.md)
   - product packaging rule: sell a personal brand growth team, not AI features.
6. [`POLSIA-NAIVE-COMPARISON.md`](POLSIA-NAIVE-COMPARISON.md)
   - donor comparison: Polsia for visible choreography, Naive/Paperclip for
     backstage work and approval substrate.
7. [`POLSIA-NAIVE-REUSE-PLAN.md`](POLSIA-NAIVE-REUSE-PLAN.md)
   - reuse contract: Polsia choreography plus Naive/Paperclip control plane.
8. [`LINDY-ASSISTANT-REUSE-PLAN.md`](LINDY-ASSISTANT-REUSE-PLAN.md)
   - frontend/workflow reuse plan for work stream, action cards, knowledge UI, hidden action graphs, router, and executor patterns.
9. [`ACTION-GRAPH-ARCHITECTURE.md`](ACTION-GRAPH-ARCHITECTURE.md)
   - current bridge that projects Polsia choreography over Naive/Paperclip rows
     and prepares a Lindy-style premium work stream without a new runtime.
10. [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md)
   - governance for competitor-informed work, donor-source language, and assets.
11. [`BUILD-STATE.md`](BUILD-STATE.md)
   - current slice inventory and verification history.
12. [`AGENCY-AGENTS-REFERENCE.md`](AGENCY-AGENTS-REFERENCE.md)
   - optional OSS role-library reference for DearMe team-member definitions and
     deliverable standards.

Historical docs such as `V4-ARCHITECTURE.md`, `COMPARISON-FINAL.md`, and
`POLSIA-VS-DEARME*.md` are superseded when they recommend clone/verbatim-copy
postures, public donor narratives, or product surfaces that conflict with the
current docs above.

## Architecture

DearMe should reuse the proven substrate instead of rebuilding it, but OK Partner
is not a product architecture that must be preserved:

- Maximum-reuse rule: copy Naive/Paperclip control-plane primitives and Polsia
  operating choreography wherever they fit; add DearMe-only code only for Brand
  OS, voice, personal-brand templates, opportunities, portfolio semantics, and
  reports.
- OK Partner-derived operator core: identity, execution, deliverables, memory,
  approvals, secrets, credits, channel actions, and generated sites.
- DearMe-first rule: rename, merge, delete, or rewrite OK Partner routes, tables,
  contracts, and screens when the OK Partner shape makes DearMe worse.
- Paperclip control plane: auth, workspaces, agents, issues, routines, live
  events, work products, cost events, budgets, adapters, plugins.
- Action graph projection: expose the current DearMe loop as customer-safe
  cycle, role, work, artifact, decision, memory, guardrail, and report nodes
  over existing Naive/Paperclip rows before adding any new runtime or tables.
- Naive-style onboarding/provisioning: `brand_blueprint` as the DearMe version
  of `setup_payload`, adapted from the OK Partner setup-blueprint flow where it
  is still useful.
- Polsia-style choreography: Chief of Staff chat, high-automation cycles, live
  progress, deliverables, reports, cost attribution, and background execution.
- DearMe overlay: Brand OS, voice profile, voice gate, content pipeline,
  opportunity pipeline, portfolio site state, and growth reports.

See [`INTEGRATED-ARCHITECTURE.md`](INTEGRATED-ARCHITECTURE.md) for the current
cross-donor architecture lock, [`WORKTREE-INTEGRATION-PLAN.md`](WORKTREE-INTEGRATION-PLAN.md)
for the current dirty-tree integration queue, [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md)
for the product surface summary, [`PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`](PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md)
for the current positioning, feature roadmap, and code-architecture execution
plan, [`POLSIA-NAIVE-COMPARISON.md`](POLSIA-NAIVE-COMPARISON.md) for the donor
comparison matrix, [`POLSIA-NAIVE-REUSE-PLAN.md`](POLSIA-NAIVE-REUSE-PLAN.md)
for the implementation-level reuse contract, [`LINDY-ASSISTANT-REUSE-PLAN.md`](LINDY-ASSISTANT-REUSE-PLAN.md)
for frontend/workflow reuse candidates, [`ACTION-GRAPH-ARCHITECTURE.md`](ACTION-GRAPH-ARCHITECTURE.md)
for the current projection bridge, and [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md)
for the governance layer that wins over older max-reuse notes.

## Current repo layout

DearMe should be implemented as the first product on the Paperclip fork already
present in this repo. OK Partner code and contracts are source material, not a
boundary to protect:

```
server/             Express API and orchestration services
ui/                 React + Vite board UI
packages/db/        Drizzle schema and migrations
packages/shared/    shared types, validators, API constants
packages/adapters/  local / remote / gateway agent adapters
packages/plugins/   plugin SDK and example plugins
docs/dearme/        DearMe product, architecture, and backlog docs
skills/             Paperclip workflow skills
```

DearMe-first product code should focus on:

- voice profile plugin
- brand blueprint schema and validator, adapted from or replacing OK Partner
  setup blueprint
- DearMe archetype templates
- Chief of Staff / specialist prompts
- product shell copy and navigation
- content / opportunity / portfolio work-product views
- channel connectors and batch decision UX

## Differentiation from Polsia

| | Polsia | DearMe |
|---|---|---|
| Customer | "founder with idea" | "person whose public presence creates opportunity" |
| Output | company SaaS app | personal brand assets and growth opportunities |
| Voice | shared dark-humor template | **client's own voice** (cloned from 100 real posts) |
| CRM | leads -> meeting -> customer | opportunities: clients, jobs, podcasts, collaborations |
| Channels | platform-owned execution rails | customer-owned OAuth and batch-approved actions |
| Site | company app / landing page | personal site, portfolio, bio, case studies, /now |

## Run locally

Use the Paperclip development path from the root `AGENTS.md`:

```bash
pnpm install
pnpm dev
```

This starts the API and UI through the Paperclip dev server, normally at
`http://localhost:3100` unless the port is already occupied.

## Build order

P0 should be built in this order:

1. DearMe-first operator core extraction: setup blueprint, deliverables, memory,
   channel actions, approvals, credits, and provider jobs from OK Partner where
   useful.
2. Brand blueprint schema and onboarding output.
3. Voice profile plugin: extract, score, regenerate, history.
4. DearMe archetype templates and first-cycle task generation.
5. Chief of Staff chat copy and hidden specialist routing.
6. Content pipeline, opportunity pipeline, and portfolio work products.
7. Live progress and weekly "Dear me" growth report.
8. Batch decision gates for publish, send, deploy, and spend.
9. Credits, budget display, and plan/usage surface.

## Recon source

Private source material used for product and architecture judgment:

- `~/Desktop/polsia-recon-2026-05-05/final-summary/` - Polsia product and
  operating-model research summaries
- `~/Desktop/polsia-recon-2026-05-05/expanded/` - private Polsia research
  archive for offline reference
- `~/naive-research-2026-05-05/` - Paperclip/Naive architecture and replication
  notes
- `https://github.com/msitarzewski/agency-agents.git` snapshot
  `783f6a72bfd7f3135700ac273c619d92821b419a` - MIT role-library reference for
  internal DearMe team member definitions and deliverable standards
- `~/OK Partner/docs/SHARED-OPERATOR-CORE.md` - shared-core product decision
- `~/OK Partner/docs/SETUP-BLUEPRINT.md` - setup-blueprint contract to adapt
- local Paperclip fork source in this repo
