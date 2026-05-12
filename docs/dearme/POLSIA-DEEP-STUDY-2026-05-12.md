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

The runtime logs show real execution evidence: task ids, execution ids, live
events, tool calls, reports, partial external sends, deploy activity, costs,
durations, and completion records. They also show rough edges: stale public
task snapshots, shared-account limits, and summary-layer overclaims.

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
- The first cycle produces private proof, starter work, visible work trail, and
  launch boundaries.
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
