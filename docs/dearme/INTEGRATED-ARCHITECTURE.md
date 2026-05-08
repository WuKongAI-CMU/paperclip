# DearMe Integrated Architecture

Date: 2026-05-07

Scope: integrated product and technical architecture after reviewing the live
DearMe repo, local Naive/Paperclip materials, Polsia recon materials, and the
local internal assistant baseline under `/Users/peter/lindy-extraction`.

## Executive Decision

DearMe is a web-first personal brand growth team, not an agent dashboard, not a
Paperclip admin console, not a generic writing tool, and not a workflow builder.

The locked architecture is:

```text
DearMe Web Product =
  DearMe premium personal-brand product shell
  + Lindy-style work stream, action cards, and knowledge UI patterns
  + Polsia-style product choreography and visible momentum
  + Naive/Paperclip runtime substrate
  + existing DearMe/OK Partner operator mechanics
```

This is the important split:

- Use Naive/Paperclip for the backend/control-plane substrate.
- Use Polsia for the customer feeling: a team is working while the user is away.
- Use Lindy baseline code for web interaction patterns: transcript/work stream,
  action cards, forms, knowledge base, and bounded workflow concepts.
- Build a DearMe-original customer UI shell because neither Polsia UI nor the
  currently exposed Paperclip shell is the right premium personal-brand product.

## Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────┐
│ Public marketing / demo                                             │
│ - personal brand growth team positioning                            │
│ - sample live team feed, proof examples, founder dogfood             │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ DearMe Web Product Shell                                            │
│ /dearme customer path                                                │
│                                                                      │
│ Surfaces:                                                            │
│ - Home Cockpit                                                       │
│ - Team Work Stream                                                   │
│ - Work Ready                                                         │
│ - Decisions Needed                                                   │
│ - Voice & Memory                                                     │
│ - Brand OS                                                           │
│ - Content Pipeline                                                   │
│ - Opportunities                                                      │
│ - Portfolio / Proof                                                  │
│ - Weekly Dear me Report                                              │
│                                                                      │
│ Rule: team visible, machinery hidden.                                │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ DearMe Product API / Read Models                                    │
│ /api/dearme/*                                                       │
│                                                                      │
│ Current spine:                                                       │
│ - first-cycle preview                                                │
│ - brand_blueprint preview                                            │
│ - brand_blueprint approval request                                   │
│ - workbench projection                                               │
│ - output handoff projection                                          │
│ - paid-beta access projection                                        │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ DearMe Orchestration Layer                                          │
│                                                                      │
│ - brand_blueprint apply                                              │
│ - fixed personal-brand team roles                                    │
│ - cycle templates                                                    │
│ - voice gate                                                         │
│ - approval gate mapping                                              │
│ - hidden workflow/action graph concepts                              │
│ - future model router and circuit breaker                            │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ Paperclip / Naive Runtime Kernel                                    │
│                                                                      │
│ Reused substrate:                                                    │
│ - auth and company tenancy                                           │
│ - agents                                                             │
│ - issues                                                             │
│ - routines                                                           │
│ - approvals                                                          │
│ - documents and work products                                        │
│ - activity log                                                       │
│ - finance events / credits                                           │
│ - adapters / plugins                                                 │
│ - execution workspaces                                               │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ Optional Generated Asset Layer                                      │
│                                                                      │
│ Later, not P0 core:                                                   │
│ - personal site / portfolio deploy                                   │
│ - lead magnet / landing page                                         │
│ - Vercel/Supabase provisioning if generated apps become a product     │
└────────────────────────────────────────────────────────────────────┘
```

## Current Evidence From The Repo

The DearMe product layer already exists. It is not only a plan.

- `packages/shared/src/validators/dearme.ts` defines the first DearMe domain
  contract: Brand Blueprint versioning, brand channels, fixed team roles, risk
  gates, operation order, output kinds, output detail kinds, workbench decision
  kinds, batch actions, progress kinds, and Voice Gate statuses.
- `server/src/routes/dearme.ts` exposes company-scoped DearMe routes for
  workbench, outputs, paid-beta access, First Cycle preview, Brand Blueprint
  preview, and Brand Blueprint apply requests.
- `server/src/services/dearme-brand-blueprint-apply.ts` already turns an
  approved Brand Blueprint into DearMe agents, documents, routines, draft
  operation issues, gated operations, and a weekly report document.
- `server/src/services/dearme-workbench.ts` already projects team members,
  active work, Work Ready, Decisions Needed, batch decisions, progress, and the
  weekly report from existing Paperclip tables.
- `ui/src/pages/DearMeOnboarding.tsx` already implements the 90-second First
  Cycle prompt, private preparation copy, team workbench, approval gate, and
  review surfaces.

The customer shell has started to catch up with the product spine:

- `ui/src/components/DearMeSidebar.tsx` now provides the DearMe customer
  navigation vocabulary.
- `ui/src/components/Layout.tsx` detects DearMe routes and hides the inherited
  CompanyRail, PropertiesPanel, MobileBottomNav, and create dialogs from the
  customer path.
- `ui/src/pages/DearMeOnboarding.tsx` routes focused review actions back into
  `/dearme?view=decisions` instead of raw issue or approval pages.

The critical current gap has moved. It is no longer "does DearMe have a product
shell at all?" It is:

- output-level review and regeneration actions are still behind approval-level
  actions;
- Team Work Stream is still a projection of prepared work, not a full
  block/event stream;
- Voice & Memory ingestion is not yet a Lindy-style source management surface;
- product-copy leakage still needs repeated passes because the same checkout
  preserves Paperclip compatibility identifiers below the waterline.

That means the next architecture priority is not "more agents." It is turning
prepared work into reviewable, regeneratable, learnable DearMe artifacts while
keeping the Paperclip control plane hidden from paid-beta users.

## Reuse-First Architecture Refresh

This pass reconciles the local donor evidence from Polsia, Naive/Paperclip,
Lindy, and the current DearMe implementation.

### Source Reality

| Source | Local evidence | Reuse verdict |
| --- | --- | --- |
| Polsia | `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`, `03-MARKETING-STRATEGY.md`, `07-BUSINESS-CENTRIC-ARCHITECTURE.md`, `11-CLONE-SPEC-PART1-WHAT-TO-BUILD.md`, `14-AGENT-PROMPTS-AND-WORKSPACE-DEEP-DIVE.md`, `15-PERSONAL-BRAND-FORK-SPEC.md` | Copy choreography and proof loops. Do not copy visual style, company-factory framing, raw public personal data, Meta Ads V1, or MCP/control-plane language. |
| Naive/Paperclip | `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`, `DEEP-CODE-PATHS.md`, `REPLICATION-PLAN.md`, `session-fetches/extracted-setup_payload.json`, `paperclipai/paperclip-full` | Reuse Paperclip OSS substrate and Naive's declarative setup pattern. Do not treat Naive's private cloud overlay or compiled frontend bundle as a maintainable source base. |
| Lindy | `/Users/peter/lindy-extraction/01_frontend_source`, `02_mongodb_schemas`, `03_backend_route_schemas`, `04_graphql`, `06_omni_dash_internal_tool`, `07_architecture` | Strongest direct web-code donor. Copy/adapt interaction grammar, contracts, and workflow patterns into DearMe terms. Do not import the whole Relay/GraphQL app shell. |
| DearMe current repo | `packages/shared/src/validators/dearme.ts`, `server/src/routes/dearme.ts`, `server/src/services/dearme-*.ts`, `ui/src/pages/DearMeOnboarding.tsx`, `ui/src/components/DearMeSidebar.tsx` | Product spine already exists. Continue projecting existing Paperclip primitives into DearMe-safe read models instead of building parallel systems. |

### Canonical Reuse Rules

1. Paperclip/Naive below the waterline.
   - Reuse auth, tenancy, agents, issues, routines, approvals, documents, work
     products, activity, finance events, adapters, and execution workspaces.
   - Build DearMe overlay routes and read models on top of those primitives.
   - Keep Naive frontend bundles as behavioral/reference assets only.

2. Polsia in the rhythm.
   - Keep one-question onboarding and a visible first cycle.
   - Make the user see a team working quickly.
   - Convert the public live-feed lesson into a private default work stream and
     optional redacted proof/demo surface.
   - Track opportunities, replies, proof shipped, and revenue-adjacent outcomes
     rather than vanity-only metrics.

3. Lindy in the interaction grammar.
   - Use blockized work events, action cards, pending-approval modals,
     transcript grouping, prompt/attachment input, realtime channels, execution
     traces, and knowledge-base source management as the primary web donors.
   - Port patterns component-by-component into DearMe's existing React/Vite
     shell instead of taking Lindy's full app architecture.

4. DearMe in the visible product.
   - Customer language is Brand OS, Voice & Memory, Work Ready, Decisions,
     Opportunities, Portfolio, and Dear me reports.
   - Substrate language is allowed only in internal/operator/debug surfaces.
   - Every feature must answer: what donor was checked, what was reused, and why
     any new code was necessary.

### Required Architecture Constraints

- `brand_blueprint` is the DearMe form of Naive `setup_payload`: schema checked,
  idempotently applied, approval-backed, and safe to re-run.
- Runtime work remains Paperclip-driven until the projection model breaks; add
  DearMe-specific tables only for voice samples/history, durable work-stream
  events, opportunity state, artifact feedback, portfolio deploy state, or
  public proof feeds.
- Budget/cost gates must happen before expensive wakeups or generation loops,
  not only after artifacts exist.
- Work-stream events should converge on a Lindy-style block model:
  role, action, artifact, status, user decision, trace reference, and safe public
  summary.
- Every external action remains approval-gated by default: publish, send,
  deploy, spend, public claims, sensitive personal material, channel changes,
  and destructive changes.
- The product must remain web-first. Mobile matters as responsive web, not as a
  native app detour.

## What To Reuse From Each Donor

| Area | Source | Reuse mode | DearMe adaptation |
| --- | --- | --- | --- |
| Auth and tenancy | Paperclip/Naive | Direct reuse | Keep company/workspace internally; present it as the user's brand workspace. |
| Agents | Paperclip agents + Lindy AgentDefinition pattern | Direct substrate plus fixed-role templates | Expose only DearMe team roles, not arbitrary agent management in the customer path. |
| Tasks and work | Paperclip issues | Direct reuse | Show as Active Work, Work Ready, and Decisions Needed. Avoid customer-facing "issues." |
| Scheduled cycles | Paperclip routines + Polsia daily/weekly rhythm + Lindy StateGraph concept | Reuse substrate, adapt choreography | Daily/weekly growth loops compile into routines and hidden action graphs. |
| Live progress | Paperclip activity/run data + Lindy Block/transcript patterns + Polsia live feed | Adapt aggressively | Build Team Work Stream with human-readable role actions and artifacts. |
| Approvals | Paperclip approvals + Lindy action-needed cards | Direct reuse plus product UI | Batch decisions for publish, send, deploy, spend, claims, sensitive material, channels, and destructive changes. |
| Documents and work products | Paperclip documents/work products + Naive deliverable model | Direct reuse | Output cards for content, opportunity, portfolio, Brand OS, voice profile, and report artifacts. |
| Credits and paid access | Paperclip finance events + Naive/OK Partner credit posture | Direct reuse plus simpler product surface | Prefer cycles/paid-beta access over exposing raw internal credit plumbing early. |
| Brand OS | DearMe | Own | `brand_blueprint` is the DearMe replacement for Naive `setup_payload`. |
| Voice and memory | DearMe + Lindy knowledge/memory UI patterns | Mostly own, reuse UX/contracts | Voice samples, forbidden phrases, approved phrasing, proof, preferences, and learning loops. |
| Frontend work stream | Lindy transcriptV2 and ActionCard patterns | Copy/adapt/rebrand patterns | Build DearMe Work Stream, not a generic conversation transcript. |
| Knowledge ingestion | Lindy KnowledgeBase patterns | Copy/adapt/rebrand patterns | Voice & Memory import: text, files, website, profile links, proof snippets. |
| App/site provisioning | Naive app provisioning pattern | Later optional reuse | Use only when portfolio/site publishing becomes a core paid plan feature. |
| Connectors | Lindy connector strategy + OK Partner channel actions | Later staged reuse | P0 should draft/export. Real OAuth/publish/send is P1+ and approval-gated. |

## Naive/Paperclip Decision

Naive is valuable because it proves that a thin product overlay can monetize a
Paperclip substrate. The local Naive archive shows:

- Paperclip OSS and published packages are available as true source or typed
  dist artifacts.
- The Naive private cloud overlay is only partially available as beautified
  bundle material.
- The full private service backend and private database schema are not available.
- The most important Naive product abstraction is a declarative setup payload:
  one spec creates team, apps, tasks, loops, and initial work.

DearMe should therefore not wait for, or depend on, a full Naive private
frontend clone. The correct reuse is:

```text
Naive setup_payload -> DearMe brand_blueprint
Naive company/team/app spec -> DearMe Brand OS/team/cycle/output spec
Naive per-tenant runtime idea -> optional later isolation for heavy automation
Naive app provisioning -> optional later portfolio/site generation
Paperclip OSS kernel -> immediate runtime substrate
```

Do not use Naive UI as the main customer frontend unless a clean, source-level,
license-clear version becomes available. Use the product lessons and substrate,
not the partial private bundle, as the stable base.

## Polsia Decision

Polsia should influence choreography, not UI implementation.

Reuse:

- fast onboarding and immediate motion
- role-based team presentation
- live work feed as trust asset
- daily/weekly cycle ritual
- "work happened while I was away" emotional loop
- reports and visible deliverables
- founder dogfood/public proof flywheel

Do not reuse:

- Polsia's visual style as the DearMe design system
- company-factory framing
- raw public live feed for private personal-brand work
- broad autonomous external actions by default
- MCP/control-plane language

DearMe handles personal identity and reputation. That makes approval and voice
safety premium features, not friction.

## Lindy Baseline Decision

The Lindy/internal assistant baseline is the strongest frontend and workflow
donor. It fills the gap that Naive does not fill cleanly.

Reuse/adapt these patterns first:

- `transcriptV2` display/data split for DearMe Team Work Stream.
- `Block` tokens as inspiration for product-safe work events.
- `ActionCard`, action-needed cards, and form-builder patterns for Decisions
  Needed and approval review.
- KnowledgeBase setup/import patterns for Voice & Memory.
- AgentDefinition schema ideas for fixed DearMe role definitions.
- StateGraph schema ideas for hidden cycle/action graphs.
- Model router idea for routing simple vs complex DearMe work.
- Tool executor and 3-strike circuit breaker idea for stopping repeated failed
  automation and surfacing a decision instead of burning credits.

Do not reuse:

- full no-code workflow editor as a P0 feature
- broad arbitrary agent creation
- donor names, assets, logos, marketplace language, or internal product copy
- donor backend assumptions where Paperclip already has the runtime primitive

The Lindy baseline should improve DearMe's web experience, not turn DearMe into
Lindy.

## Target Web Information Architecture

P0 should stay web-only and customer-first.

Recommended customer route structure:

```text
/dearme
  Home Cockpit
  Team Work Stream
  Work Ready
  Decisions Needed
  Weekly Dear me Report

/dearme/brand
  Brand OS
  positioning
  audience
  offers
  proof

/dearme/voice
  Voice Profile
  samples
  forbidden phrases
  approved phrases
  voice gate history

/dearme/content
  content drafts
  channel queues
  voice match
  approval state

/dearme/opportunities
  opportunity leads
  outreach drafts
  relevance reasons
  follow-up state

/dearme/portfolio
  bio
  proof cards
  case-study drafts
  public-site updates

/dearme/reports
  daily letters
  weekly Dear me reports
  memory updates
  next bets
```

These routes can start as tabs or sections inside one page. The important rule is
that the customer path should not expose the Paperclip navigation model.

Backstage/operator routes can continue to exist for development and internal
control-plane work, but they should not be the paid-beta default experience.

## Customer Shell Requirements

The customer shell should replace the current control-plane-first navigation
with a DearMe-first shell.

Required visible elements:

- team roster with role, current focus, state, and latest artifact
- work stream grouped by role and artifact, not raw logs
- Work Ready cards with output details and next decision
- batch decision cards
- Voice & Memory panel
- Brand OS panel
- weekly report preview
- private/prepared/approval-gated state indicators

Hidden or backstage by default:

- agents
- issues
- routines
- workspaces
- adapters
- providers
- model names
- plugin internals
- execution logs
- setup payload language
- Paperclip/OpenClaw/OK Partner provenance

## Automation Model

DearMe's automation should be high by default, but bounded.

The product loop:

```text
onboarding intent
  -> Brand OS / brand_blueprint
  -> create fixed growth team
  -> run first cycle
  -> prepare private work
  -> voice gate
  -> risk gate
  -> batch approval
  -> report
  -> update memory
  -> next cycle
```

The execution loop:

```text
routine or user trigger
  -> gather memory, proof, voice, goals, relationships
  -> run bounded role workflow
  -> produce artifact
  -> project artifact into Work Ready
  -> create approval only for risky external actions
  -> log product-safe progress event
  -> learn from approve/edit/reject feedback
```

Low-risk work should run automatically:

- research
- summarization
- private drafts
- private portfolio suggestions
- voice scoring
- report drafting
- memory extraction
- opportunity ranking

Risky work remains approval-gated:

- publish social content
- send email or DM
- deploy or modify public pages
- spend money
- make public claims
- use sensitive personal material
- connect or change channels
- destructive changes

## Data Model Strategy

Do not add new tables until the projection model breaks.

Keep using Paperclip tables for:

- users/auth/company access
- agents
- issues
- routines
- approvals
- documents
- work products
- activity logs
- finance events
- adapter/plugin/workspace internals

DearMe-specific tables or durable records become justified for:

- voice samples and score history
- brand profile version history
- work stream events if activity/comments become too lossy
- opportunity records and relationship state
- artifact feedback and learning memory
- portfolio deploy state
- public demo/anonymized proof feed

Until then, continue the current pattern: product read models project from the
kernel, then parse into DearMe-safe contracts.

## Build Order From Here

1. DearMe customer shell isolation
   - Make `/dearme` feel like the product, not one tab inside a control plane.
   - Hide or separate Paperclip admin navigation from paid-beta users.

2. Team Work Stream
   - Adapt Lindy `transcriptV2` and Block concepts into a DearMe work stream.
   - Use product-safe event names and collapse internal trace detail.

3. Voice & Memory
   - Adapt Lindy KnowledgeBase patterns for writing samples, proof, website,
     profile links, preferences, and forbidden phrases.
   - Persist the minimum DearMe-owned records needed for learning.

4. Decision Cards
   - Adapt Lindy action-card/form patterns for batch review, edit, approve,
     reject, regenerate, and "make it more like me."

5. First Cycle polish
   - Keep the one-question 90-second WOW path.
   - Make output cards feel premium and concrete.

6. Structured outputs and weekly report
   - Strengthen content, opportunity, portfolio, and weekly-report artifacts
     before adding external publishing connectors.

7. Reliability and cost controls
   - Port model routing concepts into the DearMe server layer.
   - Add a circuit breaker for repeated generation/tool failures.
   - Surface failures as "needs review" decisions.

8. Portfolio/site generation
   - Reuse Naive app provisioning only when generated public assets become a
     paid-plan feature.

9. Real channel connectors
   - Start with draft/export.
   - Add OAuth/publish/send only after the approval and voice gate loop is solid.

## Non-Goals

- Do not build a second auth system.
- Do not build a second scheduler.
- Do not build a second task engine.
- Do not build a second approval engine.
- Do not build a second billing ledger.
- Do not expose a workflow editor in P0.
- Do not make the customer manage agents.
- Do not make Supabase the core app backend unless generated customer apps need
  it later.
- Do not use Polsia UI as the DearMe visual system.
- Do not depend on Naive private frontend bundle as the primary UI source.

## Product Acceptance Criteria

The integrated architecture is working when:

- A user lands on `/dearme` and sees a personal brand team working, not an admin
  console.
- The first session starts from "What do you want to become known for?"
- Within roughly 90 seconds the user sees a voice profile draft, starter posts,
  one opportunity lead, one proof card, and a first plan.
- The team work stream shows what each role is doing and what artifact will be
  produced.
- Work Ready and Decisions Needed are backed by real server read models, not
  only mock UI.
- Voice & Memory accepts samples/proof/preferences and updates future outputs.
- Public/send/deploy/spend/sensitive actions are approval-gated.
- Weekly Dear me reports explain what happened, what changed, and what should
  happen next.
- Customer-facing UI does not expose Paperclip, OpenClaw, OK Partner, adapters,
  providers, raw issues, raw routines, workspaces, model names, MCP, or setup
  payload language.
- Desktop and mobile web both feel intentionally designed for a premium
  personal-brand product.

## Final Architecture Lock

DearMe should not copy one donor wholesale.

The right system is:

```text
Paperclip/Naive below the waterline.
Polsia in the product rhythm.
Lindy in the web interaction grammar.
DearMe in the brand, voice, customer language, and premium product shell.
```

That maximizes reuse without making DearMe look like a patched admin console or
a clone of any donor product.
