# DearMe - Product Architecture

> Canonical PM architecture after the Polsia / Naive / OK Partner review.
> Decision date: 2026-05-07.

Current positioning, feature roadmap, and code-architecture execution plan:
[`PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`](PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md).
Marketing packaging direction:
[`POLSIA-MARKETING-PACKAGING-GUIDE.md`](POLSIA-MARKETING-PACKAGING-GUIDE.md).

## 1. Product Lock

DearMe is a **personal brand growth team**.

It is not a journal, not a companion app, not a generic writing assistant, and not
an agent admin console. DearMe gives one person a small AI growth team that keeps
turning their work, experience, ideas, and proof into public-facing assets and
opportunities.

The operating model is: **treat the person as a brand and a one-person company**.
The person's reputation is the distribution layer; their offer, side project,
career goal, consulting practice, content, portfolio, and relationships are the
business surface DearMe operates.

This is why maximum reuse from Polsia and Naive makes sense. Polsia already
models a company as a set of goals, agents, tasks, cycles, documents, reports,
channels, and costs. DearMe should reuse that operating shape, but rename the
domain from company operations to one-person brand and opportunity operations.

The Polsia-shaped promise is:

> Wake up to a personal brand team working for you.

The product should feel like a managed growth team, not like a tool the user has
to operate. The user talks to one Chief of Staff surface; the system plans,
routes, executes, reports, and remembers in the background.

The interface rule is: **team visible, machinery hidden**. Users should see
what the Chief of Staff, Voice Editor, Content Producer, Opportunity Scout,
Portfolio Builder, and Growth Analyst prepared; they should not manage agents,
providers, adapters, workspaces, setup payloads, or technical logs.

## 2. Source Architecture Decision

DearMe is the product north star. OK Partner is not an architecture that must be
preserved. It is source material and a partially implemented operator substrate
that DearMe can cannibalize, rename, collapse, or rewrite when that makes the
product easier to use. An SMB OK Partner overlay can return later only if it does
not tax the DearMe product.

The architecture is one platform with product overlays:

| Source | What to reuse | DearMe decision |
|---|---|---|
| Polsia | CEO-style chat, task queue, live progress, cycles, reports, cost attribution | Copy the automation choreography and user-facing momentum |
| Naive / Paperclip | Better Auth, companies, agents, issues, routines, heartbeats, adapters, cost ledger, setup payload pattern | Use Paperclip as the runtime kernel and keep DearMe as a thin cloud/product overlay |
| OK Partner | Operator mechanics: identity, execution, deliverables, memory, approvals, secrets, credits, channel actions, generated sites | Reuse or refactor these mechanics aggressively; do not preserve OK Partner labels, routes, or module boundaries for their own sake |
| DearMe | Brand OS, voice gate, personal-brand templates, opportunity scoring, portfolio semantics, weekly growth reports | Own the product shape, UX, copy, onboarding, and default automation level |

This means DearMe should avoid rebuilding auth, scheduling, issues, approvals,
billing, channel writes, provider rails, app/site provisioning, or live progress
when Paperclip/Naive/OK Partner already has the useful mechanism. It does not
mean DearMe should preserve OK Partner's API names, table names, routes, product
screens, or approval-heavy UX.

Maximum reuse posture:

- Reuse Naive/Paperclip for the control plane: auth, companies, agents, issues,
  routines, heartbeats, adapters, workspaces, cost ledger, and setup-payload
  style provisioning.
- Reuse Polsia for product choreography: CEO chat, live progress, cycle engine,
  task routing, reports, cost attribution, Twitter/content flow, cold outreach
  flow, and personal-brand fork patterns.
- Cannibalize OK Partner for the generic operator layer: deliverables, memory
  facts, approval policy, channel-action boundaries, credits, provider jobs, and
  generated app/site rails.
- Add DearMe code only where the semantics are truly new: Brand OS, voice gate,
  personal-brand templates, opportunity scoring, portfolio semantics, and Dear me
  reports.
- Product fit beats compatibility. If an OK Partner abstraction makes DearMe feel
  like an operator console instead of a personal growth team, change the
  abstraction.

The implementation-level reuse contract is
[`POLSIA-NAIVE-REUSE-PLAN.md`](POLSIA-NAIVE-REUSE-PLAN.md). That document is the
source of truth for what to copy directly, what to adapt, and what to defer.

Supabase is not the platform auth/database answer. Platform identity and
workspace data should stay in the Paperclip/Postgres/Better Auth stack.
Supabase is useful only when generated customer apps need a managed full-stack
backend.

## 3. Primary Buyer

DearMe serves people whose personal reputation is tied to economic opportunity.
The buyer can be an employee, creator, consultant, founder, or side hustler, but
the product treats them as an owner of a small economic engine.

The first wedge is not "everyone with a story." The first wedge is:

| Segment | Desired outcome | Why DearMe is valuable |
|---|---|---|
| Consultant / coach / freelancer | More qualified leads and booked calls | Personal trust drives buying decisions |
| Creator / solo expert | More audience, subscribers, and paid opportunities | Output consistency is the bottleneck |
| Founder / indie hacker | Build in public, find users, attract partners | Public presence compounds distribution |
| Job hunter / career promoter | Better portfolio, LinkedIn, applications, interviews | Their story must become proof |
| Serious side hustler | Grow while time-constrained | They need cycles, not another dashboard |

Common pattern: the person already has raw material, but it is scattered across
work history, posts, projects, notes, calls, resumes, websites, GitHub, DMs,
products, services, and side-project proof. DearMe turns that material into a
repeatable growth system.

## 4. Core Job

DearMe's job is to run this loop:

```
Ingest -> Brand OS -> Growth plan -> Daily/weekly cycles
       -> Deliverables -> Channel actions -> Report -> Memory
       -> next better cycle
```

The loop must produce visible outputs every week:

- published or ready-to-publish content
- portfolio / site improvements
- opportunity lists
- outreach drafts
- tailored pitches
- case studies
- weekly reports
- voice and positioning refinements

If a customer has zero useful deliverables in seven days, that is a P0 retention
bug.

## 5. Product Surfaces

DearMe should expose the few surfaces a customer naturally expects from a growth
team.

| Surface | Purpose | Notes |
|---|---|---|
| Home Cockpit | What happened, what is ready, what needs a decision | First screen after onboarding |
| Chief of Staff Chat | Single conversational control surface | No visible agent management |
| Content Pipeline | Ideas, drafts, scheduled, published, repurposed | Platform-aware but voice-first |
| Opportunities | Leads, jobs, collaborations, podcasts, communities, investors | Outcome depends on archetype |
| Portfolio | Personal site, bio, case studies, resume, media kit | Generated and maintained over time |
| Voice & Memory | Voice profile, stories, proof, preferences, forbidden phrases | DearMe's product moat |
| Cycles | Daily / weekly / monthly recurring growth work | Batch review for risky actions |
| Reports | Weekly growth report and daily "Dear me" letter | Should show business/career outcomes |
| Channels | LinkedIn, X/Twitter, email, GitHub, website, newsletter, calendar | Customer-owned accounts only |
| Billing / Credits | Usage, cost, plan, credits, budget | Must be transparent and boring |

P0 billing is manual paid-beta access on the shared finance ledger. A board
operator can record a customer payment as a DearMe credit purchase; the customer
surface should show whether the workspace is still in trial or paid beta, how
much has been paid, the remaining credit balance, and the latest payment receipt.
This proves paid access without adding a second ledger or exposing Stripe Connect
before DearMe needs it.

The UI should not lead with org charts, MCP servers, adapters, approvals, or
infrastructure. Those are backstage.

## 6. AI Team

The team is a product metaphor and routing model. Users do not manage it.

| Role | User-facing job | Runtime responsibility |
|---|---|---|
| Chief of Staff | Talks to the user, decides what should happen next | Clarity gate, task routing, reports |
| Brand Strategist | Positioning, audience, offer, narrative | Maintains Brand OS |
| Voice Editor | Keeps output sounding like the user | Voice extraction, scoring, feedback |
| Content Producer | Posts, threads, newsletters, scripts, articles | Multi-platform drafts and repurposing |
| Opportunity Scout | Finds clients, jobs, podcasts, communities, partners | Research and outreach prep |
| Portfolio Builder | Site, bio, case studies, resume, media kit | Generated site/app work |
| Growth Analyst | Reviews performance and recommends next cycles | Metrics, attribution, weekly report |

Implementation can map these roles onto Paperclip agents, routines, issues,
skills, and adapters. The product contract is one team, one customer, one public
presence.

## 7. Brand OS

Onboarding produces a structured Brand OS. This is the main domain object above
the Paperclip control plane.

Required objects:

| Object | Contents | Why it matters |
|---|---|---|
| Brand Profile | Name, slug, goals, archetype, CTA, constraints | Replaces generic "company" framing |
| Voice Profile | Tone, examples, embeddings, signature phrases, forbidden phrases | Prevents generic AI output |
| Audience Map | Who should see the user and why | Drives channel and opportunity choices |
| Proof Library | Projects, wins, case studies, credentials, testimonials | Turns claims into evidence |
| Content Pillars | 3-5 durable topics | Prevents random posting |
| Opportunity Pipeline | People, companies, jobs, podcasts, communities, status | Makes growth measurable |
| Portfolio Site | Pages, sections, domain, deploy state | Public proof surface |
| Growth Plan | Current weekly plan, recurring cycles, budget, gates | Execution contract |

These objects can live as overlay tables, documents, work products, or template
metadata depending on the implementation phase. They must be visible to the
agents and to the reporting system.

## 8. Automation Policy

DearMe should copy Polsia's high-automation feel. Approval is not the center of
the product.

Automatic by default:

- research
- summaries
- voice extraction
- draft creation
- content repurposing
- opportunity list generation
- portfolio drafts
- reports
- internal memory updates
- low-risk site preview builds

Batch-gated:

- publish a social post
- send an email or DM
- update a public website
- spend money
- make a price / contract / employment claim
- use sensitive personal material in public
- connect or change a customer-owned channel
- destructive data changes

The default decision UX is a batch review:

> Publish these 3 posts, send these 5 outreach emails, and deploy this site
> update?

The product should avoid one approval dialog per micro-action.

## 9. Technical Architecture

DearMe should use the Naive/Paperclip substrate, Polsia product choreography, and
the parts of OK Partner that make DearMe more useful. OK Partner is a donor
codebase and substrate candidate, not a preservation target.

### 9.0 Aggressive-Reuse Doctrine (added 2026-05-09)

The faster the role mechanics, voice rules, state machines, tool sequences,
and rate limits land in this repo, the faster DearMe can ship. Server-side
runtime artifacts (system prompts, function definitions, OpenAI tool
shapes, complexity thresholds, ad-tier tables, lead state machines) are not
customer-facing brand surfaces. The `REBRAND-AND-PROVENANCE.md` rules
about donor naming and substrate language apply to the **paid-beta UI** —
not to internal runtime files the user never sees.

Therefore the standing rule is: **port the production-verified artifact
verbatim, replace brand identifiers mechanically, preserve everything else
(numbers, thresholds, voice rules, format rules, error states, recovery
flows)**. Paraphrasing loses information; the original wording is what
made the production system work.

Concrete implementations of this doctrine:

| Source | DearMe location | Substitution policy |
|---|---|---|
| 12 production agent prompts (50,405 chars total) | `packages/plugins/dearme-agent-prompts/src/prompts/*.ts` | `Polsia` → `DearMe`, `polsia.com`/`polsia.app` → `dearme.app`, `polsia_*` namespaces → `dearme_*`. Voice rules, format rules, state machines, thresholds, rate limits, tool sequences preserved verbatim. |
| 6 OpenAI native function definitions (line 1031 of captured runloop server.js) | `packages/dearme-ai-proxy/src/functions.ts` | Tool names, descriptions, parameter shapes, `required` lists preserved verbatim. |
| Dual-protocol AI proxy contract (`lib/dearme-ai.js` shape) | `packages/dearme-ai-proxy/src/contract.ts` | Cost-attribution side-channels (`task` field on OpenAI, `X-Subscription-ID` header on Anthropic), `agent/run` endpoint shape, complexity-based routing all preserved; api key prefix rebranded to `dm_sk_`. |
| 8-state opportunity lifecycle, 5 ad error states, 4 ad performance tiers, 3 budget tiers, 16 mood faces, 7 SSE event types, complexity 1-10 routing table | `packages/plugins/dearme-agent-prompts/src/state-machines/*.ts` | Field names, transition rules, threshold numbers preserved verbatim; class names rebranded. |
| Sora 2 UGC video creative template, 5-touch outbound sequence template | `packages/plugins/dearme-agent-prompts/src/templates/*.ts` | Verbatim port. |
| `opportunities` table schema | `packages/db/src/schema/opportunities.ts` | Column shapes adapted to Drizzle, business semantics preserved. |

This doctrine is the reason the runtime layer is built around plugin-
imported seed material rather than per-plugin re-derivation.

### 9.1 Topology

```
dearme.ai marketing site
  -> DearMe app shell
      -> DearMe-first Operator Core
          - Paperclip control plane
          - auth / workspace membership
          - agents / issues / routines
          - heartbeats / live events
          - work products / approvals
          - cost events / budgets
          - adapters / plugins
          - OK Partner-derived contracts where useful
          - deliverables / memory facts / channel actions
          - setup blueprint preview/apply/execute
          - credits / proxy usage / provider evidence
      -> DearMe growth overlay
          - Brand OS
          - voice profile + voice gate
          - content pipeline
          - opportunity pipeline
          - portfolio site state
          - weekly growth reports
      -> worker runtime
          - Chief of Staff direct runs
          - specialist worker runs
          - per-task workspace
          - provider adapters
      -> generated assets
          - personal site / portfolio
          - newsletter / landing page / lead magnet
          - optional Vercel + Supabase app assets
```

Reuse rules:

- Use Paperclip for the control plane instead of rebuilding auth, companies,
  agents, tasks, routines, live events, approvals, cost tracking, and adapters.
- Use OK Partner as a source for deliverables, memory, cycles, approval policy,
  channel-action boundaries, credits, provider jobs, and generated app/site
  rails. Rename or reshape it when DearMe benefits.
- Use the Naive `setup_payload` idea as DearMe `brand_blueprint`: a structured
  onboarding result that creates the Brand OS, agents, cycles, first tasks,
  channels, and app/site assets.
- Use Polsia's choreography: CEO chat, live progress, cycle engine, deliverables,
  cost attribution, and reports.
- Do not copy Polsia's org-chart-first UX, 22-MCP sprawl, shared social identity,
  or from-zero company-builder positioning.
- Do not expose Paperclip, OK Partner, setup blueprints, provider evidence, MCP,
  or adapters as product concepts. Users should see DearMe, Brand OS, work,
  decisions, channels, credits, and reports.

### 9.2 Concrete package topology (as of 2026-05-09)

The Sprint 0 seed corpus and AI proxy contract are in this repo. Plugin
runtime implementation (DM-138 - DM-148) consumes them rather than
re-deriving the same material.

```
packages/
├── db/                                ← Drizzle schema, 75+ tables, MIT-inherited
│   └── schema/
│       ├── opportunities.ts (NEW)     ← DM-141 schema slice; 8-state lead
│       └── ... (74 inherited tables)
├── shared/                            ← validators, types
├── plugin-sdk/                        ← Paperclip plugin SDK (manifest, worker, UI)
├── adapters/                          ← 8 LLM-runtime adapters (claude-local, openclaw, ...)
├── mcp-server/                        ← MCP host
├── dearme-ai-proxy/                   ← NEW (DM-145 contract)
│   └── src/
│       ├── functions.ts               ← 6 production-verified OpenAI tool defs
│       ├── contract.ts                ← dm_sk_ keys, dual-protocol headers,
│       │                                  agent/run shape, CostLedgerEvent
│       └── index.test.ts              ← 4/4 contract tests pass
├── plugins/
│   ├── dearme-agent-prompts/          ← NEW (Sprint 0 弹药库)
│   │   └── src/
│   │       ├── prompts/               ← 12 verbatim role prompts (50K chars)
│   │       │   ├── chief-of-staff.ts
│   │       │   ├── reporting.ts
│   │       │   ├── content-producer.ts
│   │       │   ├── opportunity-hunter.ts
│   │       │   ├── brand-site-builder.ts
│   │       │   ├── ads-manager.ts     ← 17K-char Meta Ads, 5 error states,
│   │       │   │                          4 perf tiers, learning-phase rule,
│   │       │   │                          Sora 2 template, Meta policy rules
│   │       │   ├── research-agent.ts
│   │       │   ├── audience-care.ts
│   │       │   ├── data-analyst.ts
│   │       │   ├── health-monitor.ts
│   │       │   ├── chat.ts
│   │       │   └── browser-agent.ts
│   │       ├── state-machines/
│   │       │   ├── opportunity-state.ts (8 states + transition guard)
│   │       │   ├── meta-ads.ts         (5 error / 4 perf tiers / 7d learning)
│   │       │   ├── budget-tier.ts      (3 tiers + picker)
│   │       │   ├── mood-face-library.ts (16 faces + accent colors)
│   │       │   ├── model-routing.ts    (1-10 → fast/balanced/deep)
│   │       │   └── sse-events.ts       (7 event types + payload shapes)
│   │       └── templates/
│   │           ├── sora-ugc-video.ts   (UGC video creative)
│   │           └── outbound-5-touch.ts (day 1/3/6/10/14 sequence)
│   └── (DM-138 ~ DM-148 to be added: identity-researcher, reporting,
│        content-producer, opportunity-hunter, brand-site-builder,
│        meta-ads, audience-graph, voice-profile)
└── ...
server/
└── src/
    ├── routes/
    │   ├── dearme.ts                   ← DearMe-only routes
    │   └── companies.ts                 ← DM-S01 hardened
    └── services/
        ├── dearme-workbench.ts          ← first-run + cycle dispatcher
        └── plugin-managed-routines.ts  ← used to declare 6h cycle in plugin manifests
```

### 9.3 Sprint timeline (after aggressive port)

The seed corpus eliminates 12 prompt re-derivations × ~3K chars each
plus the proxy contract. Sprint timelines compress accordingly:

| Sprint | What unlocks | Original estimate | After aggressive port |
|---|---|---|---|
| Sprint 1 | First-run shock + Dear-me letter + Voice-gated content | 2-3 weeks | **5-7 days** |
| Sprint 2 | Outbound + emergency pause + default approval | 1-2 weeks | **3-5 days** |
| Sprint 3 | AI proxy runtime + cache economics + MCP audit | 2-3 weeks | **5-7 days** |
| Sprint 4 | Brand site builder + Meta Ads + live feed + 5-touch | 3-4 weeks | **1-2 weeks** |
| **MVP paid-beta internal dogfood** | aha demo + Dear-me letter + first outbound | 3-4 weeks | **2 weeks** |
| **Full paid-beta open** | all 4 sprints | 8-12 weeks | **4-5 weeks** |

The compression comes from: state machines, prompts, and proxy contract
already imported and tested. Each plugin ticket starts at ~70%
completion instead of 0%.

### 9.4 Role registry (single typed source of truth, added 2026-05-09)

The 12 DearMe roles are not specified in scattered docs or per-plugin
prompt files. They live in **one** typed export:

```
packages/plugins/dearme-agent-prompts/src/registry.ts
  └── DEARME_ROLE_REGISTRY: ReadonlyArray<DearMeRoleSpec>
```

Each entry pins:

| Field | Meaning |
|---|---|
| `role` | canonical slug (e.g. `chief-of-staff`); used as routing tag and plugin id suffix |
| `displayName` | user-facing name (translated copy) |
| `prompt` | string ref to verbatim production prompt in `./prompts/` |
| `promptSourceChars` | computed `prompt.length`; never drifts |
| `complexityRange` | 1-10 input the AI proxy sees for routine work |
| `defaultTier` | `fast` / `balanced` / `deep` — the proxy's default pick |
| `stateMachines` | which `./state-machines/` modules this role's plugin runtime depends on |
| `templates` | which `./templates/` modules this role uses |
| `proxyTools` | subset of the 6 proxy `function`s this role may call |
| `pluginPackage` | `@paperclipai/dearme-<role>` — the plugin npm pkg that owns runtime |
| `ticket` | `DM-NNN` ticket that owns implementation |
| `status` | `shipped` / `in-progress` / `planned` |
| `group` | `leadership` / `growth` / `build` / `ops` / `intelligence` / `interface` for UI clustering |
| `description` | one-sentence PM copy |

**Rules of the registry:**

1. **Server, plugins, UI all read from the registry.** No service hardcodes a role list. No plugin restates its own prompt. The workbench renders the team by iterating `DEARME_ROLE_REGISTRY` grouped by `group`.
2. **Adding a role** requires (a) a registry entry, (b) a plugin package under `packages/plugins/dearme-<role>/`, and (c) a ticket. None of those three are optional.
3. **Changing a prompt** is a runtime-port mechanical-substitution change only (e.g. brand swap). Real divergence requires a ticket and a `_lineage.ts` annotation explaining the deviation.
4. **`validateRegistry()`** is the runtime guard: 1-10 complexity bounds, valid pkg prefix, valid ticket id, non-empty prompt. Tests assert it returns `{ ok: true }`.

This makes the team **mechanically extensible**: any future "add a role" / "change a tier" / "swap a state machine" is a single-file diff with a typed surface, not a multi-doc reconciliation.

The product surface, ticket assignments, and read-this-first orientation
all live in [`INDEX.md`](INDEX.md), which derives its team table from
this registry.

## 10. Operator Core vs DearMe Product Layer

DearMe should stay thin only where thinness improves speed and quality. If the OK
Partner overlay shape leaks into user experience or slows the product, DearMe
should reshape the core around personal-brand workflows. The useful boundary is
mechanics versus product semantics, not OK Partner versus DearMe.

| Layer | Owns | Should not own |
|---|---|---|
| DearMe-first Operator Core | auth, workspace, membership, agents, issues, routines, heartbeats, live events, deliverables, memory facts, approvals, secrets, provider evidence, credits, channel actions, generated sites/apps | user-facing OK Partner concepts, infrastructure-first navigation, duplicate product surfaces |
| DearMe Product Layer | Brand Profile, Voice Profile, Audience Map, Proof Library, Content Pillars, Opportunity Pipeline, Portfolio semantics, voice gate, personal-brand reports, onboarding, default automation policy | scheduler, task engine, billing ledger, provider adapter framework, raw auth, raw channel write policy unless the existing version blocks DearMe usability |
| Optional SMB Overlay | reviews, rebooking, quote follow-up, local business lead capture, service-provider workflows | any constraint on DearMe's first product, UX, naming, or architecture |

The product loop maps directly onto the shared operator loop:

```
Onboard -> Operate -> Deliver -> Decide -> Act -> Remember -> Review
Brand import -> weekly growth cycle -> work product -> batch gate
             -> channel action -> Brand OS memory -> Dear me report
```

This is how DearMe keeps Polsia-level automation without becoming a complex
agent console.

## 11. Polsia Function Mapping

| Polsia function | DearMe equivalent | Implementation path |
|---|---|---|
| CEO / Chat | Chief of Staff | One conversational surface that creates work, routes tasks, and explains progress |
| Task system | Growth work queue | Paperclip issues grouped by content, opportunity, portfolio, and report loops |
| `send_reply` / SSE | Live progress | Plain-language progress events, heartbeat, reconnect, final deliverable links |
| Cycle engine | Weekly growth cycles | Routines/wakeups that plan, execute, review, and write memory |
| Company documents | Brand OS | Brand profile, voice profile, proof library, audience map, content pillars |
| Reports | Dear me report | Weekly outcome report with deliverables, decisions, cost, and next plan |
| Twitter / cold outreach agents | Content Producer / Opportunity Scout | Draft-first channel work with voice gate and consequence gate |
| AI proxy / cost tracking | Credits and usage ledger | Paperclip/OK cost events surfaced as plan, credits, and useful-output cost |
| Customer app provisioning | Portfolio / lead magnet provisioning | Use generated site/app rails only when a public asset is part of the deliverable |
| Stripe Connect / revenue share | Later funnel monetization | Not P0 unless DearMe directly helps the user sell and attribute revenue |

The useful Polsia primitive is momentum: a customer should feel work happening
without managing agents. The heavy Polsia primitive to defer is per-customer app
factory, Stripe Connect, and a large MCP surface.

## 12. Data Model

DearMe should add domain tables only where the shared core does not already have
the concept.

| Domain object | Shared-core mapping | DearMe overlay data |
|---|---|---|
| Customer workspace | Paperclip company / membership | Brand slug, archetype, public goal |
| Team roles | Paperclip agents | DearMe role presets and prompts |
| Work queue | Paperclip issues / routines / wakeups | Growth loop labels and archetype templates |
| Deliverables | OK Partner deliverables / work products | content draft, opportunity brief, portfolio update, weekly report |
| Memory | OK Partner memory facts / Paperclip documents | voice rules, proof items, preference facts, forbidden material |
| Channels | OK Partner channels / channel actions / secrets | LinkedIn, X, email, website, newsletter, booking links |
| Billing | Paperclip cost events / OK credit ledger | credits, budget, cost per useful deliverable |
| Sites/apps | OK provisioning jobs | portfolio, lead magnet, media kit, optional Supabase-backed app |

The first implementation should adapt, rename, or replace OK Partner's setup
blueprint and channel-action contracts into DearMe names rather than protecting
parallel OK Partner contracts.

## 13. Brand Blueprint

The onboarding output should be a machine-readable `brand_blueprint`.

Minimum shape:

```json
{
  "brand": {
    "slug": "alex",
    "archetype": "consultant",
    "goal": "book 3 qualified AI workflow consulting calls per month",
    "primary_cta": "book_call"
  },
  "voice_profile": {
    "sources": ["linkedin", "website", "resume"],
    "tone": ["direct", "practical", "slightly informal"],
    "forbidden_phrases": ["synergy", "thrilled to announce"]
  },
  "audience": [
    { "name": "B2B SaaS founders", "reason": "buy AI workflow consulting" }
  ],
  "content_pillars": ["workflow automation", "operator case studies", "AI cost control"],
  "team": ["chief_of_staff", "brand_strategist", "voice_editor", "content_producer", "opportunity_scout", "portfolio_builder", "growth_analyst"],
  "cycles": [
    { "name": "weekly_content", "cadence": "weekly", "outputs": ["3 LinkedIn drafts", "1 newsletter outline"] },
    { "name": "opportunity_scan", "cadence": "weekly", "outputs": ["20 leads", "5 outreach drafts"] }
  ],
  "assets": [
    { "kind": "portfolio_site", "pages": ["home", "about", "case-studies", "writing", "now", "contact"] }
  ],
  "gates": ["publish_social", "send_email", "deploy_public_site", "spend_money"]
}
```

The blueprint is the bridge between product onboarding and execution. It should
be stored, versioned, and re-generated when the customer's goal changes.

## 14. MVP Boundaries

### P0 - Paid beta

P0 proves a customer can wake up to useful growth work.

Required:

- onboarding into Brand OS
- `brand_blueprint` preview/apply flow adapted from or replacing OK Partner setup
  blueprint
- Chief of Staff chat
- voice profile from at least one source or identity interview
- content pipeline with voice scores
- opportunity scout with draft-only outreach
- generated portfolio/site draft
- weekly growth report
- cycles, routines, live progress, and deliverables through the shared core
- batch approvals for publish/send/deploy
- cost tracking and plan/credits
- channel-action policy for read-only sync vs consequence-gated writes

Not P0:

- fully autonomous social posting
- ads
- multi-brand teams
- public marketplace
- complex CRM
- full app factory
- revenue-share billing

### P1 - Real channel execution

- LinkedIn / X OAuth or assisted publishing
- email send via customer-owned account
- calendar / booking integration
- custom domain and portfolio deploy
- better opportunity attribution
- lightweight analytics for content and portfolio traffic
- optional service-pro / side-business loops from OK Partner

### P2 - Scale and monetization

- ads
- newsletter monetization
- paid community / course / consulting funnels
- team handoff
- agency-style managed workflows
- multi-brand workspaces
- broader app/lead-magnet generation

## 15. Metrics

North-star:

> At least one voice-matched, user-approved public growth output per customer per
> week.

Supporting metrics:

- time to first useful deliverable
- weekly approved outputs
- weekly published outputs
- opportunity replies / booked calls / interviews
- portfolio visits and CTA clicks
- content consistency streak
- voice match score distribution
- approval batch acceptance rate
- cost per useful deliverable

Avoid optimizing for raw agent activity. The user pays for outcomes and visible
momentum, not token volume.

## 16. Positioning

Primary landing-page line:

> Your personal brand growth team.

Supporting copy:

> DearMe learns your voice, builds your public presence, creates content, finds
> opportunities, maintains your portfolio, and reports progress every week.

Anti-positioning:

- not "AI journal"
- not "second brain"
- not "write better posts"
- not "manage AI agents"
- not "build a company from zero"

DearMe should be sold like a lightweight growth agency for one person.
