# Polsia x Naive - PM / Product-Architect Analysis

Date: 2026-05-09
Scope: product, business, UX, moat, and flywheel comparison of Polsia and
Naive for DearMe product development. Pairs with
`POLSIA-NAIVE-COMPARISON.md` (architecture layer) and
`POLSIA-NAIVE-REUSE-PLAN.md` (implementation layer).

简体中文摘要：**Polsia 是 DearMe 产品层最应该学习的对象；Naive 是 DearMe
底盘层最应该学习的对象。** Polsia 的打法激进，但它真正解决了早期产品最难的事：
让用户在 5 分钟内被震到，感觉一个 autonomous team 已经替自己开工。Naive/Paperclip
解决的是另一件事：如何让长期运行、成本、任务、审批、交付物和隔离变成可维护的系统。

DearMe 的正确姿态不是把 Polsia “安全化”到无聊，而是把 Polsia 的强 aha moment、
默认自主、实时进度、社会证明和 founder-style urgency 拿过来，再用 Naive/Paperclip
的 issue / heartbeat / approval / cost ledger / workspace 底盘兜住长期执行。产品体验必须
先让用户觉得“它已经在帮我赢”，而不是先让用户学习一个控制台。

---

## Hard Verdict

1. **Polsia wins the product layer.** It understands that the first job is
   not explaining autonomy; it is producing visible proof before the user
   has time to lose interest.
2. **Naive wins the operating layer.** It has the better durable abstraction
   for tasks, costs, workspaces, agent handoffs, issue states, and long-lived
   execution.
3. **DearMe should not copy either product surface.** DearMe should feel like
   a personal brand growth team that already knows the user, not a startup
   generator and not an agent IDE.
4. **Be aggressive where the action is reversible or pre-authorized.** Research,
   drafts, voice analysis, content plans, opportunity maps, private previews,
   and internal team work should run with Polsia-level urgency.
5. **Do not turn approval into product friction.** For external/public/spend
   actions, use standing policies, batch approvals, limits, and one-click
   decision packages. The user should approve intent and boundaries, not
   babysit every step.

The product principle is simple: **好用、自主、震撼，先做出结果，再解释系统。**

---

## Evidence Base

Polsia evidence from `/Users/peter/Desktop/polsia-recon-2026-05-05/`:

- `final-summary/02-ONBOARDING-FLOW.md`: verified 5-minute onboarding with
  Google OAuth, one textarea, live SSE mood/thinking, company name in about
  90 seconds, market report in about 120 seconds, task creation in about
  240 seconds, and live app URL in about 300 seconds.
- `final-summary/03-MARKETING-STRATEGY.md`: founder-led proof, public live
  surface, aggressive conversion framing, and urgency-heavy packaging.
- `final-summary/08-POLSIA-WEAKNESSES.md`: activation is low but self-selecting;
  also records operational risks such as Sapiom concentration, shared outbound
  surfaces, no voice layer, and no real approval queue.
- `final-summary/REAL_PRODUCTION_FACTS.md` and production captures: public
  proof numbers, customer instances, Stripe/GMV story, and generated customer
  products.

Naive evidence from `/Users/peter/naive-research-2026-05-09/` and
`/Users/peter/naive-source-2026-05-09/`:

- `ARCHITECTURE-CHANGES-2026-05-09.md`: Naive moved beyond a hosted control
  plane into API/CLI/docs launch mode: `@usenaive-sdk/cli@0.3.0`, Mintlify
  docs, 144 docs URLs, 54 primitives, and a much larger Paperclip OSS delta.
- `usenaive-docs/getting-started/quickstart.mdx`: developer quickstart with
  API keys, SDK, CLI, MCP setup, config file, and primitive calls.
- `usenaive-docs/core/orchestration.mdx`: orchestration vocabulary around
  tasks, deliverables, handoffs, channels, loops, goals, and campaigns.
- `usenaive-docs/guides/platform-company.mdx`: company / employee API direction.
- `paperclip/doc/PRODUCT.md`: Paperclip as a control plane for autonomous AI
  companies: company as first-order object, employees/agents, adapters, issues,
  documents, activity logs, finance events, and output-first execution.
- Current catalog counts: 45 business templates with about 594k total installs;
  29 employee templates with about 414k total installs. Top categories cluster
  around YouTube, short-form content, SEO/GEO, ads, cold email, Shopify, and
  social growth.

---

## One-Line Comparison

**Polsia sells the feeling that an AI company just started working for you.**

**Naive sells the machinery for builders to operate an AI company.**

**DearMe should sell the feeling that a personal brand growth team already
understands you and is producing proof today.**

---

## Product Matrix

| Dimension | Polsia | Naive | DearMe decision |
|---|---|---|---|
| Buyer | Nontechnical founder with an idea | Technical builder / AI company operator | Person with a name, story, expertise, audience, or ambition |
| First aha | Company named, market researched, app live | CEO plan, agents, issues, cost ledger | Brand team produces voice read, proof package, content/opportunity plan, and private launch surface |
| Product metaphor | Auto-founding machine | Control plane / org chart | Personal brand growth team |
| Product emotion | Shock, speed, "it is alive" | Control, visibility, operator confidence | Shock first, control second |
| Best surface | Onboarding and social proof | Backstage execution | Customer-facing Brand OS over hidden control plane |
| Main weakness | Can feel reckless, generic, and hard to govern | Feels like work, setup, and infrastructure | Must avoid becoming either a toy or an operator dashboard |
| Reuse type | Choreography, conversion, wow, public proof | Durable state, tasks, cost, approvals, primitives | Combine Polsia's rhythm with Naive's substrate |

---

## Polsia PM Read

Polsia's strongest insight: **the product starts doing the job before it asks
the user to understand the product.**

The onboarding is not a questionnaire. It is a show:

- Google login plus one idea field.
- Rotating work banners before the user sees the system.
- SSE mood/thinking/tool stream that makes progress feel alive.
- Market research, company naming, tasks, and a live app URL inside minutes.
- Public `/live` surface that says "many companies are running right now."
- Founder-style urgency instead of enterprise caution.

The 7.6% activation number should not be read only as failure. It is also a
self-selection engine. Polsia burns through weak intent quickly and concentrates
attention on the users who want the magic badly enough.

For DearMe, this means the first session should not be:

- "Set up your workspace"
- "Pick your agents"
- "Configure your content calendar"
- "Approve each research step"

It should be:

- "Here is what your public voice sounds like."
- "Here are the three audience lanes we can win."
- "Here is a first proof package using your actual name and market."
- "Here is a private launch surface you can inspect."
- "Here is what the team will do in the next 72 hours unless you stop it."

Polsia's product lesson is not "ignore all risk." The lesson is: **risk should
not be the first thing the customer feels.** The first thing the customer feels
should be momentum.

---

## Naive PM Read

Naive's strongest insight: **autonomy needs durable operating objects.** It is
not enough to stream impressive text. Long-lived AI work needs a place to put
tasks, decisions, costs, handoffs, artifacts, and failure states.

Naive originally read as an agent-company control plane. The 2026-05-09 evidence
changes the read: Naive is now also trying to become a developer-facing primitive
platform through SDK, CLI, MCP, docs, and 54 primitives.

That matters for DearMe:

- The customer surface should not look like Naive.
- The internal execution substrate should borrow heavily from Naive/Paperclip.
- The primitive taxonomy is valuable internally, especially for repeatable
  content, research, outreach, review, scheduling, and deliverable generation.
- The catalog install data points to real demand categories: SEO/GEO, short
  video, YouTube, cold email, ads, social writing, ecommerce, and wrappers.

Naive's weakness is that the product often asks the user to admire the machine.
DearMe should hide the machine until the user wants control.

---

## What DearMe Should Take From Polsia

Take these aggressively:

1. **5-minute aha target.** The first run must create something concrete,
   personal, and inspectable before the user hits boredom.
2. **One primary input.** The user should be able to start from a name, URL,
   handle, bio, or messy paragraph.
3. **Live work stream.** Mood, research, drafting, audience discovery, and
   team activity should feel alive, not like a spinner.
4. **Pre-result framing.** Rotating banners and progressive milestones should
   make the product feel active immediately.
5. **Public proof loop.** DearMe needs social proof, but it should be opt-in,
   anonymized/redacted by default, and framed around outcomes rather than raw
   internal logs.
6. **Short activation window.** The first 72 hours should feel urgent. A long
   vague trial weakens the story.
7. **Founder-style product copy.** Speak in outcomes and motion, not policy
   disclaimers.
8. **Default autonomous preparation.** Research, drafts, private previews,
   voice models, opportunity scoring, and batch plans should run without
   interruption.

Most important: **DearMe should not ask the user to manage agents before the
user has seen the team produce.**

---

## What DearMe Should Take From Naive

Take these as hidden product infrastructure:

1. **Issue-sized work units.** Every meaningful output should map to a durable
   task, owner, state, proof, and next action.
2. **Heartbeat and run ledger.** The team should keep working across sessions,
   and the product should know what happened, why, and at what cost.
3. **Approval objects.** Use approvals as a decision package, not as a modal
   for every tiny action.
4. **Cost events.** Keep cost visible to the system and optionally visible to
   advanced users; do not lead with token accounting.
5. **Execution workspaces.** Isolate issue-sized work, preserve artifacts, and
   make proof inspectable.
6. **Role templates.** Naive's employee and business catalog is useful as a
   reference taxonomy, but DearMe roles should be phrased as a brand team:
   strategist, voice editor, audience scout, content operator, distribution
   producer, and analyst.
7. **API/CLI primitive direction.** Naive's 5/9 shift toward primitives is a
   signal: DearMe should define its own internal primitives now, even if they
   are not exposed to customers.

Naive is most useful when it is invisible.

---

## What DearMe Should Not Copy

Do not copy these because they weaken DearMe's product, not because we want a
timid product:

| Source | Do not copy | Product reason |
|---|---|---|
| Polsia | Generic startup generator framing | DearMe is for a person's public identity, not a disposable SaaS idea |
| Polsia | Shared platform social account as default | Personal brand trust depends on the user's name, voice, and channels |
| Polsia | Unbounded external actions | One bad public/send/spend action can destroy brand trust |
| Polsia | Generic company templates | DearMe must feel specific to the person and their market |
| Polsia | No voice/taste layer | Brand growth without voice memory becomes content spam |
| Polsia | Single backend choke point | Long-running teams need recoverable execution paths |
| Naive | Builder-first setup | DearMe customers should not start with keys, primitives, workers, or VM concepts |
| Naive | Raw issue / worker / setup-payload language in UI | It breaks the personal-team illusion |
| Naive | Template marketplace as customer surface | DearMe should sell outcomes, not agent inventory |
| Naive | Per-tenant VM as default P0 promise | Too expensive and operationally heavy for first paid beta |

The key distinction: **aggressive product motion is good; unbounded brand-risk
automation is not.** DearMe should run hard by default inside clear boundaries.

---

## DearMe's Aha Moment

The first-run promise should be closer to Polsia than Naive:

1. User gives one input: name, URL, handle, or rough paragraph.
2. DearMe immediately starts a visible brand-team run.
3. Within minutes, the user sees:
   - voice read
   - public-positioning diagnosis
   - audience lanes
   - content/opportunity plan
   - first polished sample outputs
   - private proof surface
   - next 72-hour action plan
4. The product says what it will do automatically next.
5. External/public/spend actions are bundled into one strong decision package:
   "Approve this 72-hour launch boundary."

This preserves the user feeling of autonomy:

- The team keeps working.
- The user does not micromanage.
- The product produces artifacts first.
- Approval is about boundaries, not chores.

---

## Business Model Read

Polsia teaches urgency:

- A short trial can work if the first proof is strong.
- Public proof can compound conversion.
- Usage should feel like the product is creating value while the user sleeps.
- The price can be simple if the perceived output is concrete.

Naive teaches monetization caution:

- Pure cost pass-through is transparent but makes the buyer think like an
  operator.
- Credit systems are good for builders, less good for personal-brand buyers.
- Template installs show demand but do not automatically create a premium brand.

DearMe should likely use:

- Paid beta / concierge-style entry early.
- Simple subscription with included team capacity.
- Optional add-ons for publishing volume, audience research, outbound campaigns,
  or human review.
- Outcome packaging around "weekly proof" and "72-hour launch momentum," not
  "agent credits."

---

## Moat And Flywheel

Polsia's moat is speed plus visible proof. Naive's moat is operating substrate
plus OSS gravity. DearMe needs a different moat:

1. **Voice memory.** The product learns what sounds like the person and what
   would embarrass them.
2. **Approval taste memory.** Every decision teaches the system what can run
   autonomously next time.
3. **Audience graph.** The system learns which communities, topics, formats,
   and timing patterns move attention.
4. **Outcome proof.** Weekly proof packages create retention and sales assets.
5. **Cross-customer trend layer.** DearMe can see which brand moves work across
   niches without exposing private data.

This is why DearMe should be more than Polsia-for-personal-brands. Polsia can
launch a generic company. DearMe should learn a person well enough to compound
their public identity.

---

## Product Doctrine For DearMe

Use this when making product decisions:

1. **Aha before architecture.** The customer should see proof before structure.
2. **Autonomy before configuration.** Default to useful work, not setup screens.
3. **Team before tools.** Show the brand team and its outputs, not substrate.
4. **Private by default, public by decision.** Prepare aggressively; publish
   intentionally.
5. **Batch decisions, not micro-approvals.** One boundary approval should unlock
   many bounded actions.
6. **Proof every cycle.** Every run ends with something inspectable.
7. **Make the product feel alive.** Streams, milestones, and next actions matter.
8. **Do not let compliance language become the product voice.** Trust controls
   belong in the mechanism, not the headline.

---

## Next DearMe Slices

1. **DM-136 sample/demo proof:** first-run sample proof package should feel like
   Polsia-level aha, not a static placeholder.
2. **DM-137 72-hour launch boundary:** design the first standing authorization
   package: what DearMe can do automatically, what requires explicit approval,
   and how the user sees the plan.
3. **DM-138 internal primitive taxonomy:** map Naive's primitive direction into
   DearMe-specific internal primitives: voice-read, audience-scan,
   proof-package, content-batch, distribution-plan, approval-package,
   weekly-report.
4. **DM-139 live proof surface:** create an opt-in/redacted public proof loop
   that gives Polsia-style social proof without exposing private brand work.

The immediate priority is still product feel: make the first DearMe run feel
alive, autonomous, and concrete.
