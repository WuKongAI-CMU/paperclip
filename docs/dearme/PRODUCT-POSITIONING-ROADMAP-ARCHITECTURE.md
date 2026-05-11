# DearMe Product Positioning, Roadmap, and Code Architecture

> Current execution plan for turning DearMe from a repurposed operator runtime
> into a paid-beta product. Decision date: 2026-05-07.

Related packaging source:
[`POLSIA-MARKETING-PACKAGING-GUIDE.md`](POLSIA-MARKETING-PACKAGING-GUIDE.md).

Current architecture sources:
[`INDEX.md`](INDEX.md),
[`TRI-SUBSTRATE-ARCHITECTURE.md`](TRI-SUBSTRATE-ARCHITECTURE.md),
[`OPENCLAW-INTEGRATION-ARCHITECTURE.md`](OPENCLAW-INTEGRATION-ARCHITECTURE.md),
and [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md). The older
`INTEGRATED-ARCHITECTURE.md` file is reference/history, not the current
implementation entrypoint.

## 1. Product Positioning

DearMe is a personal brand growth team for one person whose reputation creates
economic opportunity.

The product should feel like a lightweight growth agency that lives inside the
customer's work loop. It learns the customer's identity, voice, proof, goals,
offers, and constraints, then keeps producing private work that can become
public assets, relationship opportunities, and weekly progress.

Primary category:

> Personal brand growth team.

Plain-language promise:

> DearMe turns your work, voice, and proof into posts, pages, outreach, and
> opportunities while you live your actual life. Your team prepares the moves.
> You approve what represents you.

Product north star:

> Every returning user should feel: my team worked while I was away, and now I
> only need to make a few high-leverage decisions.

The product is not:

- an AI journal
- a second brain
- a generic content writer
- a social scheduling tool
- an agent management console
- a company-builder clone

The customer should never feel that they are configuring agents, adapters,
providers, or a control plane. They should feel that a team is doing useful work
for them while asking for approval before reputation-sensitive actions.

Interface rule:

> Team visible, machinery hidden.

The user can see team members, work in progress, finished artifacts, and
decisions needed. They should not see agent configuration, model providers,
adapter names, setup payloads, technical logs, or a control-plane dashboard on
the customer path.

## 2. Paid-Beta Beachhead

The first paid-beta buyer should be a revenue-driven solo expert:

- consultant
- coach
- freelancer
- independent operator
- fractional executive
- indie founder selling expertise
- creator with a concrete paid offer

This group is better for paid beta than the broad "everyone needs a brand"
market because they can connect DearMe's work to calls, leads, deals,
partnerships, subscribers, or paid opportunities. They also usually have enough
raw proof for a useful first week: past projects, client wins, talks, posts,
case studies, GitHub work, testimonials, proposals, or a niche point of view.

Secondary expansion segments:

- career promoters who want interviews, speaking, or advisor opportunities
- job hunters who need a portfolio and outreach system
- side hustlers who need consistency while time-constrained
- creators who need content and opportunity cadence

Do not let the first product spread equally across every archetype. The paid
beta should prove that DearMe can help one revenue-linked person generate useful
growth work every week.

## 3. Customer Job

The core job is not "write posts." The core job is:

> Turn my existing proof and point of view into a repeatable public growth loop.

That loop is:

```text
Import proof and goals
  -> build Brand OS
  -> create first growth plan
  -> draft content, opportunities, portfolio updates, and reports
  -> batch review risky actions
  -> publish/send/deploy only after approval
  -> record outcomes and memory
  -> improve next week's work
```

P0 retention rule:

> If a paid-beta customer has no reviewable content, opportunity, portfolio, or
> report artifact within seven days, the product failed.

P0 first-session rule:

> Within 90 seconds of answering "What do you want to become known for?", the
> user should see a draft Voice Profile, three starter posts, one opportunity
> lead, one portfolio proof card, and one first growth plan.

## 4. Product Pillars

### Brand OS

Brand OS is the durable customer model. It includes positioning, goals,
audiences, proof points, offers, preferred channels, constraints, voice samples,
approval gates, and budget policy.

In current code this begins as a typed `brand_blueprint`, then becomes agents,
routines, issues, and issue documents after approval.

### Voice Gate

Voice is the DearMe-specific moat. Every outbound or public-facing artifact
should eventually carry a visible voice score, forbidden-phrase check, proof
alignment check, and approval status.

P0 can start with voice samples and guidance. P1 should add score history and
regeneration loops.

### Private Work Loop

DearMe should draft privately by default. The useful surfaces are content
drafts, opportunity drafts, portfolio updates, Brand OS, voice profile, and the
weekly report.

The current output handoff service already projects these from issues,
documents, work products, and agent updates.

### Team Workbench

The first product screen should be a team workbench, not a dashboard. It should
answer:

- what my AI team did while I was away
- what each role is doing now
- which work is ready
- which decisions need me
- what the current Dear me report says

The workbench should group product surfaces around `Work Ready` and `Decisions
Needed`, not around internal agents, issues, routines, workspaces, costs, or
providers.

### Batch Decisions

Approval is a gate, not the product. DearMe should ask for batches:

- approve these 3 posts
- send these 5 outreach drafts
- deploy this portfolio update
- use this proof claim publicly

Avoid one approval dialog per micro-action.

### Weekly Dear Me Report

The report is the retention artifact. It should explain what work happened,
what changed, what needs review, what signals appeared, what cost was used, and
what DearMe will do next.

## 5. Current Code Reality

DearMe already has more than product copy. The current implementation contains a
usable P0 spine:

| Area | Current files | What exists |
|---|---|---|
| Shared contract | `packages/shared/src/validators/dearme.ts` | Brand blueprint schema, first-cycle preview contract, Voice Gate v0 evaluator, team roles, gates, operation order, paid-beta status, output contracts, workbench batch-decision contract |
| Browser form helpers | `ui/src/lib/dearme-brand-blueprint.ts` | Form state, defaults, line splitting, monthly budget conversion, preview/apply payload builders |
| API client | `ui/src/api/dearme.ts` | Outputs, paid-beta access, payment record, first-cycle preview, blueprint preview with voice gate, blueprint apply-request calls |
| Product page | `ui/src/pages/DearMeOnboarding.tsx` | Team Workbench with batch decisions, 90-second First Cycle panel, Voice Gate v0, Brand OS form, paid beta panel, private work panel, preview/request approval flow |
| API routes | `server/src/routes/dearme.ts` | Company-scoped outputs, paid-beta ledger, first-cycle preview, blueprint preview, blueprint approval request |
| Blueprint preview | `server/src/services/dearme-brand-blueprints.ts` | Creates First Cycle preview, typed blueprint, summary, execution plan, Voice Gate v0 result, warnings, and approval payload |
| Blueprint apply | `server/src/services/dearme-brand-blueprint-apply.ts` | Creates DearMe agents, routines, issues, Brand OS docs, Voice Profile, Approval Gates, and weekly report doc |
| Output projection | `server/src/services/dearme-output-handoff.ts` | Converts blueprint-origin issues/documents/work products/comments into DearMe output cards |
| Workbench projection | `server/src/services/dearme-workbench.ts` | Projects team, active work, ready work, decisions, batch decisions, recent progress, and weekly report from existing artifacts |
| Paid beta | `server/src/services/dearme-paid-beta-access.ts` | Derives trial/active state and credit balance from finance events |

This means the architecture should not restart from a greenfield DearMe schema.
The next work should harden the product seams around this spine.

## 6. Architecture Decision

Keep DearMe as a thin product layer over the existing Paperclip operator kernel,
but add DearMe-owned product seams where customer meaning depends on them.

Keep in the shared kernel:

- auth and company membership
- agents
- issues
- routines and wakeups
- approvals
- issue documents
- work products
- activity logs
- finance events
- adapters and execution workspaces

Own in DearMe:

- Brand OS contract
- voice profile and voice gate
- product output read model
- content/opportunity/portfolio/report semantics
- paid-beta entitlement rules
- customer-facing copy and navigation
- batch decision UX
- archetype defaults

Do not create a second scheduler, auth model, billing ledger, approval system,
or task engine for P0.

## 7. Data Model Posture

Current state:

- `brand_blueprint` is generated from a typed seed.
- Approval payload stores the planned Brand OS and execution plan.
- Applying the approval creates agents, routines, issues, and documents.
- Output cards are projected from issue fingerprints and attached artifacts.
- Paid-beta access is derived from finance events with biller
  `dearme_paid_beta`.

This is good enough for paid-beta proof.

Add DearMe tables only when the existing artifacts become insufficient:

| Need | Keep projected for now | Add table when |
|---|---|---|
| Brand profile | Approval payload + Brand OS document | The UI needs editable profile history independent of issues |
| Voice profile | Voice Profile document + samples | Scoring, retraining, embeddings, or score history are implemented |
| Opportunity pipeline | Draft issue/document/work product | Contacts, statuses, replies, and attribution need structured tracking |
| Portfolio state | Portfolio draft issue/work product | Public deploy state, domains, pages, or analytics are real |
| Weekly reports | Attached issue document | Reports need search, email delivery, or longitudinal analytics |
| Entitlements | Finance event projection | Hosted checkout, plan changes, refunds, or metered credits become real |

## 8. Feature Roadmap

### P0: Paid Beta Credibility

Goal: one customer can pay, seed Brand OS, approve the work loop, and receive
private outputs that look like DearMe work rather than an agent console.

Acceptance:

- customer can record or show paid-beta access
- paid-beta trial can preview Brand OS but cannot start the private work loop
- customer can preview Brand OS from onboarding inputs
- customer can request approval for Brand OS apply
- approval apply creates DearMe team, routines, issues, documents, and report
- first screen shows the team working, work ready, decisions needed, and the
  daily/weekly Dear me report before any internal runtime surface
- 90-second first cycle produces visible starter artifacts from one positioning
  question
- first-cycle and Brand OS previews show Voice Gate v0 readiness before public
  actions can be approved
- decisions are grouped into reviewable batches before the user falls back to
  individual approval or issue review
- `/dearme` shows Brand OS, Voice Profile, Content drafts, Opportunity drafts,
  Portfolio update, and Weekly report output surfaces
- first content operation can auto-start privately
- public/send/deploy/spend/sensitive actions remain approval-gated
- no visible OK Partner, setup payload, provider, adapter, or Paperclip product
  language leaks in the paid-beta path

### P0.5: First-Week Value

Goal: a paid-beta customer has at least one useful artifact within seven days.

Acceptance:

- first content batch includes channel, audience, hook, body, proof used, and
  approval gate
- first opportunity list includes target, why relevant, score, outreach angle,
  and draft message
- first portfolio update includes page/section, proof source, proposed copy,
  and deploy gate
- weekly report references actual artifacts and decisions
- private output cards link to the issue/document where work is reviewable

### P1: Voice and Channel Execution

Goal: DearMe becomes meaningfully better than a generic AI writer.

Acceptance:

- voice samples are stored as a retrainable profile
- drafts show Voice Gate score, forbidden phrase hits, proof alignment, and
  channel-fit status
- low-score drafts regenerate before review
- LinkedIn/X/email assisted-publish or customer-owned send path exists
- channel writes require batch approval
- channel outcomes can be recorded back into the weekly report

### P1.5: Portfolio and Opportunity System

Goal: DearMe produces visible proof and measurable opportunities.

Acceptance:

- portfolio draft can become a public or preview site update
- proof library drives claims and case studies
- opportunity records have status, source, rationale, and next action
- weekly report shows opportunity movement and portfolio/page changes
- custom domain or deploy state is visible only when real

### P2: Growth OS

Goal: DearMe becomes a durable operating system, not a setup wizard.

Acceptance:

- recurring cycles adapt from outcomes
- analytics inform content and opportunity bets
- budget/cost per useful deliverable is visible
- multi-channel campaigns can be planned without agent-console exposure
- hosted checkout and plan management replace manual paid-beta access

## 9. Next Implementation Slices

### Slice A: Product Entitlement Gate

Status: implemented on 2026-05-07.

Add a small DearMe entitlement read helper that converts paid-beta status into
customer-facing gating copy and route/UI states. Keep the backing source as
finance events.

Files likely touched:

- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/routes/dearme.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `packages/shared/src/validators/dearme.ts`

### Slice B: Team Workbench Read Model

Status: implemented on 2026-05-07 as a projection over existing artifacts.

Make the applied Brand OS, team roles, active work, ready outputs, and pending
decisions readable from one DearMe workbench. The page should feel like "my AI
team today", not like a control-plane dashboard.

Start with projections over created Brand OS issue documents, output handoffs,
approval requests, and activity. Add tables later only if editing/versioning or
longitudinal reporting becomes awkward.

Files likely touched:

- `server/src/services/dearme-brand-blueprint-apply.ts`
- `server/src/services/dearme-output-handoff.ts`
- `server/src/routes/dearme.ts`
- `ui/src/pages/DearMeOnboarding.tsx`

### Slice C: 90-Second First Cycle

Status: implemented on 2026-05-07 as a deterministic preview before deep
configuration.

Replace setup-heavy onboarding with one positioning question:

> What do you want to become known for?

Then generate starter Voice Profile, starter posts, an opportunity lead,
portfolio proof card, and first growth plan before asking for deep
configuration.

Files touched:

- `packages/shared/src/validators/dearme.ts`
- `server/src/services/dearme-brand-blueprints.ts`
- `server/src/routes/dearme.ts`
- `ui/src/api/dearme.ts`
- `ui/src/pages/DearMeOnboarding.tsx`

### Slice D: Voice Gate v0

Status: implemented on 2026-05-07 as a deterministic readiness gate in First
Cycle and Brand OS preview.

Add deterministic voice readiness and draft-quality checks before adding
embeddings or an LLM scorer.

P0 checks:

- enough samples
- forbidden phrase hits
- generic launch-copy phrases
- proof claim presence
- channel-specific length constraints

### Slice E: Work Ready and Batch Decisions

Status: implemented on 2026-05-07 as a workbench read-model and UI batch
review surface over existing approvals and output issues.

Project risky follow-up actions and reviewable artifacts into one DearMe
decision list:

- publish
- send
- deploy
- spend
- use sensitive material
- make public claim

This should sit above the existing approval system instead of replacing it.
Tighten operation instructions and tests so content, opportunity, portfolio, and
weekly report outputs have consistent fields before any heavy new infrastructure.

Files touched:

- `packages/shared/src/validators/dearme.ts`
- `server/src/services/dearme-workbench.ts`
- `ui/src/pages/DearMeOnboarding.tsx`

### Slice F: Structured Output Details

Status: implemented on 2026-05-07 as a read-model/UI improvement over existing
documents, prepared work, and progress comments.

Make every Work Ready card answer "what exactly am I reviewing?" before the
user opens the underlying issue. The output handoff should expose structured
fields for the paid-beta loop:

- content: channel, audience, hook, draft body, proof used, approval gate
- opportunities: target, why relevant, relevance score, outreach angle, draft
  message, approval gate
- portfolio: page or section, proof source, proposed copy, deploy gate
- weekly report: completed work, decisions needed, next bets, report reference

This remains a projection over existing output documents and review work; add a
durable table only when users need editing, scoring, history, or analytics over
individual fields.

Files touched:

- `packages/shared/src/validators/dearme.ts`
- `server/src/services/dearme-output-handoff.ts`
- `ui/src/pages/DearMeOnboarding.tsx`

## 10. Code Architecture Guardrails

Use these rules while implementing:

- Reuse the shared kernel unless a product meaning is impossible to express.
- Keep DearMe APIs company-scoped until there is a real separate brand tenant.
- Keep `brand_blueprint` typed and versioned.
- Use projections before adding tables.
- Add DearMe-owned tables only for durable state that must be queried,
  versioned, scored, or reported independently.
- Never expose adapter IDs, provider names, Paperclip, OK Partner, setup
  payloads, or raw approval internals on the customer path.
- Treat voice, proof, opportunity status, portfolio state, and report history as
  product data, not generic issue comments, once they need first-class UX.
- Prefer private draft generation plus batch approval over autonomous external
  writes.

## 11. Open Product Questions

These should be answered by paid-beta usage, not by abstract planning:

- Does the first buyer care more about leads, authority, job/career leverage, or
  content consistency?
- Is the weekly report enough to prove value, or does the user need a daily
  "Dear me" letter?
- Which first channel matters most: LinkedIn, X, newsletter, email, portfolio,
  or direct outreach?
- How much can DearMe draft automatically before the customer feels reputation
  risk?
- Is manual paid-beta payment acceptable for the first cohort, or does checkout
  become a trust requirement?

## 12. Current Recommendation

Ship the paid-beta around the solo expert wedge.

Do not build broad archetype complexity yet. Make one customer path excellent:

1. pay or activate paid beta
2. seed Brand OS
3. approve team/cycles
4. receive private content, opportunity, portfolio, and report artifacts
5. batch-approve what can become public
6. see next week's plan and budget

The code already has the right skeleton. The next value is not another large
architecture rewrite. It is productizing the existing DearMe spine into a clear
paid-beta loop with voice, proof, outputs, decisions, and weekly reporting.
