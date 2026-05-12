# Polsia Deep Study - 2026-05-12

Owner: DearMe product architecture thread
Source archive: `/Users/peter/Desktop/polsia-recon-2026-05-05/`
Status: current mechanism study for DearMe reuse decisions

## Product Verdict

Polsia is not mainly an agent dashboard. Its strongest product is a singular
autonomous company operator that turns a small owner prompt into visible work:
documents, tasks, reports, live progress, generated assets, and a recurring
operating rhythm.

For DearMe, the useful port is the mechanism, not the identity:

1. One front-door manager voice.
2. Immediate useful private work.
3. Durable task and proof records.
4. A watchable live work stream.
5. Daily/weekly review and next decisions.
6. Public actions gated by explicit owner approval.

Do not turn this into more setup UI, a visible roster of agents, or a raw
runtime dashboard.

## Evidence Read

Primary archive material inspected:

- `expanded/final-summary/REAL_PRODUCTION_FACTS.md`
- `final-summary/15-PERSONAL-BRAND-FORK-SPEC.md`
- `final-summary/08-POLSIA-WEAKNESSES.md`
- `final-summary/14-AGENT-PROMPTS-AND-WORKSPACE-DEEP-DIVE.md`
- `final-summary/polsia-internal-docs/ONBOARDING_FLOW.md`
- `final-summary/polsia-internal-docs/CYCLE_ENGINE.md`
- `final-summary/polsia-internal-docs/TASK_SYSTEM.md`
- `final-summary/polsia-internal-docs/MEMORY_SYSTEM.md`
- `expanded/agent-prompts/POLSIA-MASTER-SYSTEM-PROMPT-FULL.md`
- `expanded/agent-prompts/12-agents-full.json`
- `expanded/agent-prompts/cycle-config.json`
- `expanded/sse-streams/full-cycle-300s.log`
- `expanded/sse-streams/full-cycle-PAID-15min.log`
- `expanded/sse-streams/onboarding-truecheck-50s.log`
- `expanded/api-responses/authenticated/_api_tasks_companyId_108221.json`
- `expanded/api-responses/authenticated/_api_documents_companyId_108221.json`
- `expanded/api-responses/authenticated/_api_agents_companyId_108221.json`
- `expanded/api-responses/authenticated/_api_cycle-config_companyId_108221.json`
- `expanded/api-responses/public-dashboard.json`
- `expanded/instances/podpersona/server.js`
- `expanded/instances/runloop/server.js`
- `/Users/peter/dearme-archive/prompts/polsia-reference/51-ceo.md`
- `/Users/peter/dearme-archive/prompts/polsia-reference/35-reporting.md`
- `/Users/peter/dearme-archive/prompts/polsia-reference/37-monitoring.md`
- `final-summary/tool-call-reference/REAL-TOOL-CALLS.md`
- `final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`
- `final-summary/13-PRODUCTION-API-RESPONSES-DEEP-DIVE.md`

The runtime logs show real execution evidence: task ids, execution ids, live
events, tool calls, reports, partial external sends, deploy activity, costs,
durations, and completion records. They also show rough edges: stale public
task snapshots, shared-account limits, and summary-layer overclaims.

## Second-Pass Production Findings

The deeper read changes the emphasis. Polsia's moat is not "many agents" or
the 22-MCP story. The strongest product mechanism is choreography: one user
prompt creates visible work, a starter queue, a live feed, a cycle report, and
economic control behind the scenes.

Concrete production evidence:

- The authenticated agent response exposes 12 role prompts, while the live
  cycle config shows 10 active customer-visible operators: Browser, CEO, Cold
  Outreach, Data, Engineering, Monitoring, Reporting, Research, Support, and
  Twitter. Chat and onboarding are hidden front-door/runtime roles.
- The TrueCheck task response creates five starter tasks immediately, with
  useful metadata on some tasks: source, tag, complexity, priority, and
  owner-requested state. It also shows a weakness: at least one generated task
  is missing tag, complexity, and executability metadata.
- The cost summary for the sample company records two executions, 13,865 input
  tokens, 917 output tokens, and `1.991114` dollars of model cost. That is the
  real reason Polsia hides model/provider choice from customers and routes by
  complexity.
- The public dashboard claims large proof numbers: ARR, active companies,
  total companies, completed tasks, messages, and emails. This is powerful
  marketing, but it should be treated as a proof surface only when backed by
  durable underlying receipts.
- The deeper architecture notes show the customer-app lock-in pattern:
  generated apps and skills call Polsia proxy endpoints for AI, email, storage,
  and payments. DearMe should port the cost/accounting idea, not Polsia's
  platform identity.

The practical runtime is smaller than the marketing surface. Most useful work
comes from a compact internal set: tasks, reports, live replies, dashboard
updates, infrastructure helpers, memory, and a cost-aware AI proxy. DearMe does
not need to expose a giant tool catalog to match the customer feeling.

## Third-Pass Operator Findings

The prompt and production-response read makes the product lesson more specific:
Polsia is a CEO loop with specialists, not a specialist chooser.

Reusable mechanisms:

- The CEO prompt keeps the user-facing loop simple: monitor current state,
  review what happened, maintain a useful queue, and report back. It aims to
  keep at least three useful tasks alive, so the product feels like it continues
  after the first response.
- Reporting is a product primitive, not an afterthought. The reporting prompt
  orders work through owner email, dashboard inbox, and report creation. DearMe
  should mirror the shape as a first-cycle report, private preview, and stored
  proof artifact.
- Monitoring and reporting are separate. Monitoring captures factual state only;
  reporting converts facts into owner-readable decisions. DearMe should avoid
  mixing telemetry, recommendations, and launch calls into one noisy surface.
- The real tool surface is compact: file/read/write/edit/search, task/report
  operations, dashboard updates, infra helpers, support/email/billing, and
  capability checks. The 22-MCP story is not the product surface to copy.
- Polsia workspaces are isolated per company, agent, and execution. DearMe should
  preserve Symphony/OpenClaw worker isolation backstage while showing only clean
  receipts and artifacts.

Current DearMe implementation response:

- The first-cycle preview now carries a shared `cycleReport` contract: what
  moved, what is ready, what is blocked, and what continues next.
- The public first-run landing, proof package, private preview, static aha proof
  export, and host-smoke manifest all read that same report instead of carrying
  a separate static queue list.
- This directly ports the useful Polsia CEO reporting mechanism without exposing
  raw agents, raw runtime events, or donor product language.

## Polsia Product Kernel

Polsia works because it compresses a founder's anxiety into a watchable
sequence:

1. "Tell me the idea."
2. "I understood it."
3. "I created the first useful documents."
4. "I made a queue."
5. "I am working now."
6. "Here is what moved, what is ready, and what I need from you."

For DearMe, the equivalent is not company creation. It is personal-brand
momentum:

1. "Tell me what you want to be known for."
2. "I understood your voice and audience."
3. "I prepared the first private proof pack."
4. "I created the next launch calls."
5. "I am working privately now."
6. "Here is what is ready to approve, what is blocked, and what changed."

That means the correct DearMe surface is a private brand workroom with a single
manager voice. The user should not have to manage agents, providers, worktrees,
MCP servers, or orchestration concerns.

## Reuse Decisions From Polsia

Port these mechanisms into DearMe:

- Front-door manager/chat: classify the user's ask, create or update the right
  work item, and route it backstage without asking the user to pick an agent.
- Strict task contract: every customer-visible task needs title, source,
  rationale, state, priority, complexity or effort, proof, and next owner call.
- Live proof feed: show customer-safe progress receipts every meaningful step,
  with completed, prepared, blocked, skipped, and needs-approval states.
- Cycle report: summarize "what moved, what is ready, what needs your call,
  what is next" on a repeating private work rhythm.
- Hidden routing economics: use complexity, risk, and channel sensitivity to
  pick provider/model/workspace internally while surfacing only outcomes and
  receipts.
- Durable brand memory: keep voice profile, personal pitch, audience map,
  portfolio proof, rejected phrases, and approval history as the actual lock-in.
- Isolated execution workspace: keep per-task worker state isolated, disposable,
  and receipt-backed before it updates the product workroom.

Reject these Polsia choices:

- Raw thinking streams or chain text as product proof.
- Donor identity, prompt copy, Sapiom language, or Polsia-style public claims in
  customer-facing DearMe UI.
- Shared outbound identity for social, email, or DMs.
- Auto-send, auto-post, auto-deploy, or auto-spend without an approval receipt.
- IP geolocation or professional-network enrichment without explicit consent
  and provenance.
- A large visible agent roster, provider picker, or setup dashboard before the
  first private work output.
- Public metrics that cannot be traced back to signed or durable receipts.

## DearMe Gap After The Polsia Read

DearMe is already pointed in the right direction:

- The product is a private brand team, not a control panel.
- OpenClaw, Paperclip/Naive, Symphony, provider adapters, and worktrees are
  correctly backstage.
- Private proof is usable: first-run, receipt trail, voice proof, approval
  boundary, release gate, and status command are now coherent.

The remaining gap is narrower than "build more Polsia." It is live delivery
proof and receipt polish:

- The workroom should feel more like Polsia's live work sequence, but with
  summarized receipts instead of raw thinking.
- Tasks should be stricter than Polsia's sample data: no generated task should
  be customer-visible without a route/tag, effort or complexity, proof field,
  and next decision.
- Public launch cannot be claimed until the real LinkedIn partner route,
  approved recipient, and iMessage/SMS proof recipient are supplied and guarded
  live smoke receipts exist.
- The next Symphony tickets should strengthen workroom receipts and live proof,
  not reopen setup, provider management, or agent-dashboard work.

## What To Reuse

### 1. Singular Manager Surface

Polsia speaks as one operator even though it routes work to many agents. DearMe
should keep the customer-facing surface as a private brand team led by one
manager. The user should see work, decisions, and receipts, not provider
choices, agent implementation, or queue administration.

DearMe mapping:

- Keep "team" language in product surfaces.
- Keep role names as customer-safe work labels, not setup controls.
- Keep Symphony, OpenClaw, Paperclip, models, adapters, and provider setup
  backstage.

### 2. First Wow Before Management

Polsia's onboarding power is not a long questionnaire. It quickly creates
company docs, tasks, live work, and a reachable artifact. DearMe's equivalent is
one small known-for input that produces a private brand cycle: voice read,
audience hypotheses, starter drafts, proof packaging, and a launch-call queue.

DearMe mapping:

- Keep the public first-run landing on one input plus private start.
- Keep "watch the team work live" close to the first action.
- Do not add another marketing shell or setup wizard before improving proof.

### 3. Task As Product Contract

Polsia tasks are more than todos. They carry title, context, rationale, source,
priority, complexity, routing, state, and owner visibility. DearMe should treat
each work item as a compact contract: what the team prepared, why it matters,
what proof exists, and what owner call is required.

DearMe mapping:

- Reuse the existing issue/workbench spine.
- Add or preserve customer-safe rationale and receipt fields.
- Keep public/send/deploy/spend decisions explicit and few.

### 4. Live Proof Stream

Polsia's strongest trust mechanism is visible work. The stream should prove
that something happened, but raw chain text and execution payloads are unsafe.
DearMe should expose summarized receipts, not raw reasoning or secrets.

DearMe mapping:

- Show durable receipt events with actor, action, artifact, status, timestamp,
  and next decision.
- Separate completed, prepared, blocked, skipped, and needs-approval work.
- Do not smooth partial failures into fake success.
- Do not expose raw prompts, raw internal reasoning, credentials, provider
  payloads, or internal execution metadata.

### 5. Operating Cycle

Polsia uses a recurring plan/work/review/report rhythm. DearMe should keep the
same feeling: the team keeps moving privately and returns with the next useful
decisions.

DearMe mapping:

- Preserve the six-hour private work routine already seeded in DearMe.
- Surface the rhythm as "what moved, what is ready, what needs your call."
- Do not expose cron, runtimes, worker orchestration, or provider logs.

### 6. Memory And Voice Lock-In

Polsia compounds through documents and memory. DearMe's stronger version is a
personal Brand OS: voice profile, personal pitch, expertise areas, portfolio
proof, audience map, rejection reasons, forbidden phrases, and launch rules.

DearMe mapping:

- Treat approvals/rejections as voice and launch-rule learning.
- Keep cross-user learnings aggregated and privacy-safe.
- Never mix private user memory into another customer surface.

### 7. Small Backstage Tool Set

The archive shows the practical runtime does not need a large visible tool
catalog. DearMe should keep a compact internal tool surface and route by task
complexity/cost backstage.

DearMe mapping:

- Keep OpenAI/Anthropic-compatible proxy and cost attribution backstage.
- Use complexity routing and budget rails internally.
- Avoid customer-facing provider selection unless a live channel genuinely
  requires account connection.

## What To Reject

- Raw chain-of-thought or raw SSE payloads as a customer proof stream.
- Shared social accounts or shared outbound identity.
- Auto-posting, auto-emailing, or auto-DMing without an approval record.
- IP geolocation, professional-network lookup, or enrichment without clear
  consent and provenance.
- Public dashboard claims that are not tied to durable underlying receipts.
- Split-brain surfaces where live events say done but task lists still say todo.
- Long setup, provider, or concern screens before private work has started.
- Donor names, donor UI identity, Sapiom branding, or substrate language in
  paid-beta UI.

## Current DearMe Comparison

DearMe is already strong in the substrate layer:

- Naive/Paperclip durable state, approvals, issues, routines, documents,
  cost/audit records, and workspaces are reused instead of rebuilt.
- OpenClaw is the edge runtime for channels, skills, and outbound tools.
- Symphony is the backstage coordinator for bounded worker tickets.

DearMe has reached the private Polsia-style proof bar:

- A cold user can start from one positioning input.
- The first cycle produces private proof, starter work, visible work trail, a
  first-cycle report, and launch boundaries.
- The product can be used for private/internal proof without live public sends.

DearMe has not yet reached the full public Polsia-equivalent live-delivery bar:

- Public launch remains blocked until live LinkedIn DM route/recipient facts and
  iMessage recipient proof exist.
- The correct next work is live receipt proof and workroom/receipt polish, not a
  new dashboard or setup surface.

## Architecture Decisions

1. Product surface: private brand workroom, not an agent console.
2. Manager model: one DearMe team voice, roles backstage.
3. Proof model: summarized receipts and artifacts, not raw runtime traces.
4. Task model: bounded work item plus rationale, proof, state, and launch call.
5. Approval model: public/send/deploy/spend/sensitive actions are the concern
   boundary; private drafting and research should proceed autonomously.
6. Runtime model: Symphony workers start from Linear issues and land one
   customer-facing slice at a time on the coordinator branch.
7. Provider model: no live action unless owner facts and guarded proof env are
   present.

## Next Product Moves

1. Close the remaining live proof facts:
   `DEARME_LINKEDIN_DM_MESSAGES_URL`,
   `DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN`, and
   `DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT`.
2. Strengthen the DearMe workroom around receipt trails: completed, prepared,
   blocked, skipped, and needs-approval.
3. Keep the current first-run copy/release-gate markers synchronized whenever
   acquisition copy changes.
4. Add richer task rationale and complexity/cost routing only where it improves
   customer proof or coordinator decisions.
5. Do not add another settings dashboard, setup flow, or visible provider
   management surface for the same public-launch blocker.

## Fourth-Pass Product Absorption - 2026-05-12

Evidence reviewed in this pass:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/REAL_PRODUCTION_FACTS.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/13-PRODUCTION-API-RESPONSES-DEEP-DIVE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/14-AGENT-PROMPTS-AND-WORKSPACE-DEEP-DIVE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/01-TECH-ARCHITECTURE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/02-ONBOARDING-FLOW.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/08-POLSIA-WEAKNESSES.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/polsia-internal-docs/UI_DESIGN.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/polsia-internal-docs/CYCLE_ENGINE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/polsia-internal-docs/TASK_SYSTEM.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/polsia-internal-docs/MEMORY_SYSTEM.md`
- `/Users/peter/dearme-archive/POLSIA-VS-DEARME.md`
- `/Users/peter/dearme-archive/POLSIA-VS-DEARME-PART-2.md`

The stronger conclusion is that Polsia's useful product is choreography, not
the visible count of agents or integrations. The production pattern is:

1. One manager/front-door voice, not an exposed agent catalog.
2. One idea/input moment, then the system starts work immediately.
3. A live work stream that makes the system feel active.
4. A queue and recurring cycle that keep work moving without more setup.
5. A manager report that turns work into decisions, next steps, and receipts.
6. Hidden routing by complexity, budget, and tool availability.

That maps cleanly to DearMe, but only if the machinery stays backstage. DearMe
should absorb the cadence and proof grammar while rejecting Polsia's risky
surfaces: raw thinking streams, shared outbound identity, provider setup
prominence, and live public claims without durable receipt proof.

Polsia production details that matter for DearMe architecture:

- The real active surface is smaller than the marketing/spec impression. One
  sample shows a compact active MCP/tool set, so DearMe should not build a
  visible "22 tools" dashboard.
- Recurrence is the product feel. The archive's cycle config points to a
  roughly six-hour autonomous routine with automatic model/intelligence
  selection. DearMe should keep the "keeps moving privately" rhythm and express
  it as "what moved, what is ready, what needs your call."
- The CEO/manager prompt is the important routing primitive. It keeps the queue
  alive, chooses cheap/mid/high effort by complexity, and writes reports. DearMe
  should keep Symphony as the backstage coordinator and make the customer see a
  chief-of-staff style product voice.
- Execution workspace isolation is worth keeping: company, agent, and execution
  run boundaries make work reproducible and durable. DearMe should continue to
  reuse the inherited workspace/issue/document substrate instead of inventing a
  second runtime.
- The onboarding win is speed to visible proof. DearMe should keep the first
  input and first-cycle proof path short; setup and provider questions should
  come only when a live channel cannot be proven without owner facts.

Current implementation response:

- DM-WOW-3G tightened the first proof pack and Work Ready copy into one path:
  review proof in Work Ready, make the launch call in Decisions, and let the
  private lane keep moving until approval.
- DM-WOW-3H added fast feedback note starters to focused review controls so the
  owner can say "voice feels off", "need stronger proof", or "keep it private"
  without typing a custom note.
- DM-WOW-3J added a launch handoff checklist to each private or delivered
  handoff state so the return report says what is ready, what to inspect, and
  why nothing public or external moves outside the launch boundary.
- Both changes reuse existing approval/output-review mutation paths. There is
  no new route, provider setup screen, workflow dashboard, backend state, or
  visible substrate surface.

Next absorption target:

1. Make receipt trails clearer across completed, prepared, blocked, skipped,
   and needs-approval states.
2. Keep the return-handoff summary focused on decisions and proof, not runtime
   internals.
3. Treat approval/rejection notes as future voice and launch-rule learning.
4. Leave live outbound proof blocked until approved LinkedIn and iMessage/SMS
   recipient facts are present.
