# Polsia x Naive mechanism-level deep dive

Date: 2026-05-09
Scope: product and runtime mechanisms to port into DearMe
Governing rule: `REBRAND-AND-PROVENANCE.md`

This document keeps the useful donor analysis while removing ambiguity about
implementation. DearMe should move aggressively: integrate permitted code
directly, reuse proven runtime primitives, and port product mechanisms into
DearMe's personal-brand domain.

It intentionally does not preserve donor prompt text, customer-specific content,
or branded artifacts. Those inputs are research material. The implementation
surface is DearMe code, DearMe prompts, DearMe product language, and licensed or
owned code where provenance allows direct integration.

## Read This As An Engineering Reference

| Question | Answer |
|---|---|
| What can be used directly? | Paperclip/Naive OSS substrate, DearMe-owned code, and internal baseline code where its own repo guidance permits. |
| What should be ported as mechanisms? | Polsia-style product behavior: autonomous queue management, first-run proof, live feed, model routing, budget controls, and growth loops. |
| What must be rewritten? | Prompt prose, examples, customer content, public marketing copy, and any donor-branded surface. |
| What is the product principle? | Surprise the user with useful autonomous work before asking them to configure the system. |

## Core Product Pattern

The strongest shared pattern across the donor research is simple:

1. The user gives one small input.
2. The product immediately starts doing visible work.
3. The system creates a named, personal, inspectable asset.
4. The user sees a next-step queue that moves without them babysitting it.
5. Risky actions are held for approval, but private work continues.

DearMe should make this pattern feel like a personal Brand OS, not a developer
control plane.

## Mechanism Index

| # | Mechanism | What the user feels | DearMe port |
|---|---|---|---|
| M1 | First-run shock sequence | "It already knows what to build for me." | Use account/profile signals and public web research to generate a sample team package, launch boundary, and next queue inside onboarding. |
| M2 | Autonomous chief-of-staff loop | "The team keeps moving." | Keep the queue non-empty, summarize private progress, and pick tomorrow's work without asking for routine confirmation. |
| M3 | Voice-gated content agent | "It sounds like me." | Gate drafts through the user's voice profile before presenting post/email copy. |
| M4 | Opportunity hunter | "It finds real leverage for my brand." | Track opportunities through researched, drafted, sent, replied, confirmed, completed, declined, and dead states. |
| M5 | Six-hour cycle engine | "Work happens even when I am gone." | Configure routines to plan, execute, review, and report on a durable cadence. |
| M6 | Complexity-based model routing | "It is fast and cheap until hard work needs more power." | Add task complexity metadata and route models behind a DearMe AI proxy. |
| M7 | Minimal tool surface | "The product is focused." | Ship only the tools that produce Brand OS proof, not a broad agent catalog. |
| M8 | Multi-runtime AI proxy | "Everything is one product." | Hide provider differences behind OpenAI/Anthropic-compatible DearMe endpoints and cost ledgering. |
| M9 | Isolated execution workspaces | "Builds are real, inspectable, and recoverable." | Use existing execution workspaces for site/content/plugin work. |
| M10 | Constrained builder agent | "It ships instead of exploring forever." | Put stack, memory, deploy, and proof constraints into the brand-site builder. |
| M11 | Spend-controlled ads loop | "It can grow, but not run away." | Add budget tiers, pause controls, creative generation, and error states. |
| M12 | Emergency pause intent | "I can stop it instantly." | Detect pause/stop commands and pause active routines/spend first. |
| M13 | Best-agent routing | "The system learns which worker wins." | Route future work using aggregate outcomes and approval scores. |
| M14 | Live proof feed | "This is not theater." | Expose a DearMe proof feed with stats, activities, outputs, work in progress, and next actions. |
| M15 | Async brand review | "It improves after shipping." | Run brand/trademark/similarity review after generation and create remediation work. |
| M16 | Score on silence | "It does not get stuck." | Default low-risk feedback after a timeout and feed scores into routing. |
| M17 | CEO/direct plus worker/remote roles | "A resident lead coordinates specialists." | Configure direct lead agent and worker agents through inherited adapters. |
| M18 | Prompt/tool cache economics | "Autonomy is affordable." | Cache long-lived system/tool context and record cache-read savings. |
| M19 | Multi-touch outbound sequence | "It follows through." | Generate sequenced outreach for sponsorships, podcasts, clients, jobs, and partnerships. |
| M-S | Company update hardening | "The product can safely enter paid beta." | Strictly allow-list company PATCH fields and move finance/admin mutation to governed paths. |

## First-Run Shock Sequence

DearMe should make the first session feel alive before the user has configured
a team. The target sequence:

| Moment | DearMe behavior | Implementation anchor |
|---|---|---|
| Before submit | The form hints that Brand OS is already preparing market, audience, and proof work. | UI placeholder/preview copy in onboarding. |
| First seconds | The system creates a named sample team package and visible activity. | `server/src/services/dearme-workbench.ts`. |
| First minute | It generates a personal-brand thesis, audience hypothesis, launch boundary, and first outputs. | DearMe validators plus route payloads. |
| First handoff | It presents a concrete next queue, not a blank dashboard. | onboarding page and output handoff service. |
| After setup | Private work continues; send/deploy/spend waits for approval. | routines, approvals, and activity logs. |

Acceptance bar: a new user should understand "this is my personal brand team"
within one screen, before reading setup instructions.

## Autonomous Chief-Of-Staff Loop

DearMe's lead agent should behave like an operator:

1. Read current state.
2. Review only the current work window.
3. Keep at least three useful private tasks queued.
4. Send a short report with what changed and what happens next.
5. Avoid "waiting for you" phrasing for routine private work.

Risk boundary: public sending, deployment, budget spend, sensitive account data
collection, or account mutation remains gated through approvals.

## Voice And Content

DearMe content should not sound like a generic social scheduler. The voice
mechanism is:

1. Build a voice profile from user-approved examples and generated outputs.
2. Score every draft against that profile.
3. Reject or revise low-match drafts before presenting them.
4. Keep platform rules as data, not prompt-only behavior.

Targets:

- `packages/plugins/dearme-voice-profile/`
- `packages/plugins/dearme-content-producer/`
- `server/src/services/dearme-output-handoff.ts`
- onboarding tests that prove donor/substrate terms stay hidden.

## Opportunity Hunter

Opportunity work should be stateful. DearMe should not merely brainstorm leads.

Recommended states:

```text
pending -> researched -> drafted -> sent -> replied -> confirmed -> completed
                                      -> declined
                                      -> dead
```

Use cases:

- podcast guest slots
- client leads
- sponsorships
- job/career opportunities
- partnership introductions
- event/speaking opportunities

Each transition should create activity-log evidence and a next action.

## Runtime And Economics

The runtime moat is not another visible settings panel. It is a hidden economic
engine:

1. Agents emit task complexity and expected output class.
2. AI proxy routes to the cheapest adequate model/provider.
3. Cost events attribute spend by company, task, agent, and output.
4. Cache markers reduce repeated system/tool context spend.
5. Budget tiers and emergency pause stop runaway loops.

Targets:

- `packages/dearme-ai-proxy/`
- cost event schema/services
- budget incident services
- approval and pause hooks

## Live Proof Feed

Aha moment needs evidence. The live feed should show:

1. current stats
2. private work activity
3. generated outputs
4. queued tasks
5. draft posts/emails
6. brand-site status
7. opportunity state
8. spend/budget state
9. worker health
10. approval queue
11. recent decisions
12. next scheduled cycle
13. weekly report preview

This can be public, private, or demo-scoped per company, but it must speak
DearMe language and avoid substrate terms.

## Security Slice

DM-S01 stays ahead of growth work. Before paid beta, company updates must be
strictly allow-listed:

1. User-editable fields stay in `PATCH /api/companies/:id`.
2. Finance, tier, status, budget, and board-policy fields move to governed
   board-only mutation paths.
3. Spend fields come from cost aggregation, not arbitrary request bodies.
4. Tests cover rejected extra fields and accepted ordinary profile edits.

## Ticket Priority

1. DM-S01 - company PATCH hardening.
2. DM-120 - first-run proof sequence.
3. DM-121 - autonomous reporting loop.
4. DM-122 - Voice Gate and content producer.
5. DM-124/DM-136 - cycle and role-template configuration.
6. DM-127/DM-137 - AI proxy and cache economics.
7. DM-123/DM-138 - opportunity hunter and outbound sequence.
8. DM-130/DM-131 - ads loop and emergency pause.
9. DM-132/DM-133/DM-134 - routing, live feed, and post-build review.

## Execution Standard

Every implementation PR should state:

1. Which mechanism it ports.
2. Which existing Paperclip/Naive primitive it reuses.
3. Which customer-facing language is DearMe-original.
4. Which tests or runtime checks prove the slice.
5. Which next slice becomes easier because of the change.

This is how we keep the product aggressive without re-litigating reuse rules on
every heartbeat.
