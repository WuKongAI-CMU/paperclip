# Tri-Substrate Architecture

> **Canonical, runtime-affecting.** This document supersedes any older "DearMe is one stack" framing. DearMe is the integration of three substrates — OpenClaw at the edge, Naive/Paperclip in the cloud, Polsia choreography across both. Below is the contract between all three.
>
> Last updated: 2026-05-11 (DM-S06 + DM-179/180/181/182 + DM-170E semantic voice scorer seam + DEA-51 X OAuth connection proof + DM-172B X dispatch + DM-174 Resend/SES dispatch + DM-176A/DM-176B LinkedIn partner dispatch/config gate + DM-177B/DM-177C/DM-177E deploy dispatch/config gate + DM-178/DM-178B Meta campaign dispatch/config gate).

---

## 1. The three substrates, one sentence each

| Substrate | What it provides | What it does NOT provide |
|---|---|---|
| **OpenClaw (edge runtime)** | Where the user actually lives — 24+ messaging channels, voice wake, sandboxed sessions, cron, skill loader, multi-agent runtime. Runs on the user's laptop or phone. MIT. | Outbound publishing to social platforms, voice fingerprint scoring, opportunities database, personal site host, billing. |
| **Naive/Paperclip (cloud substrate)** | How durable state is stored and how long-running work is reliable — 85 Drizzle tables (issues / heartbeat_runs / approvals / cost_events / activity_log / routines / agents / documents / channel_connections), 42 server routes, 100+ services, plugin SDK, MCP server, two-tier agent (CEO direct + Workers remote). MIT-fork. | Voice, channels, sandboxes, the team's identity, the personal-brand product surface. |
| **Polsia (choreography)** | What each agent says and how the team moves — 12 production-tuned system prompts, 6 OpenAI native function definitions, 5-stage every-6h cycle, 4 approval gates (publish/send/deploy/spend), `find_best_agent` cross-role routing, the /live social-proof feed pattern, the 17K-char Meta Ads prompt, voice-gate doctrine. Research-extracted, ported verbatim. | Any runtime — Polsia ships as data, not as code we run. |

**The product (DearMe)** is what you get when you wire the three together with a single typed source of truth (`DEARME_ROLE_REGISTRY`) and DearMe-original IP that doesn't come from any of them: the voice fingerprint, the personal site host, the opportunities database, and the daily Dear-me letter as a product surface.

---

## 2. Layer ownership matrix

For every capability the product needs, exactly one substrate owns it. No overlaps, no orphans:

| Capability | Substrate | Concrete file / contract |
|---|---|---|
| Channel inbound (iMessage, Telegram, WhatsApp, Slack, Discord, Signal, Email, SMS, Voice) | OpenClaw | OpenClaw Gateway WS channels |
| Voice capture / wake word / talk mode | OpenClaw | OpenClaw voice skills (Whisper / Deepgram / ElevenLabs) |
| Browser tool sandbox (Docker, per-session workspaces) | OpenClaw | `agents.defaults.sandbox.mode: "non-main"` |
| Cron + webhooks | OpenClaw | OpenClaw Gateway cron |
| Skill loading + multi-agent routing primitives | OpenClaw | `~/.openclaw/workspace/skills/` + `find_best_agent` |
| Per-agent workspace files (AGENTS / SOUL / IDENTITY / USER) | OpenClaw | `packages/plugins/dearme-openclaw/src/bootstrap.ts` |
| Plugin manifest shape | OpenClaw | `packages/plugins/dearme-openclaw/openclaw.plugin.json` |
| Issue lifecycle + work products | Naive | `packages/db/src/schema/issues.ts` + `issue_work_products.ts` |
| Heartbeat runs (durable execution rows) | Naive | `packages/db/src/schema/heartbeat_runs.ts` + `heartbeat_run_events.ts` |
| Approvals (publish / send / deploy / spend) | Naive | `packages/db/src/schema/issue_approvals.ts` + `approval_comments.ts` |
| Cost ledger + budget cap enforcement | Naive | `packages/db/src/schema/cost_events.ts` + `budget_policies.ts` |
| Activity / audit log | Naive | `packages/db/src/schema/activity_log.ts` |
| Routines (recurring schedules) | Naive | `packages/db/src/schema/routines.ts` |
| Per-tenant secrets storage | Naive | `packages/db/src/schema/company_secrets.ts` |
| Channel OAuth tokens (per-user, just-in-time) | Naive | `packages/db/src/schema/channel_connections.ts` (DM-175; migration backfilled in 0078) |
| 12 system prompts | Polsia (verbatim) | `packages/plugins/dearme-agent-prompts/src/prompts/` |
| 6 OpenAI function definitions | Polsia (verbatim) | `packages/dearme-ai-proxy/src/functions.ts` |
| 8 state machines (opportunity / meta-ads / budget / cycle / mood / model-routing / sse / **work-loop** / **approval-gates**) | Polsia + DearMe | `packages/plugins/dearme-agent-prompts/src/state-machines/` |
| AI proxy wire contract (`dm_sk_*`, dual-protocol) | Polsia + DearMe | `packages/dearme-ai-proxy/src/contract.ts` |
| 4 approval gates (publish / send / deploy / spend) | Polsia + DearMe | `state-machines/approval-gates.ts` (resolver), Naive `issue_approvals` (storage) |
| Voice fingerprint capture + scoring | DearMe cloud + Naive/Paperclip persistence | `packages/dearme-ai-proxy/src/voice-gate.ts` (wire) + cloud `/v1/voice/score` + `dearme_voice_profiles` |
| Opportunities database + Hunter.io verification | DearMe cloud | `packages/db/src/schema/opportunities.ts` (table) + cloud `/v1/opportunities/*` |
| `dearme.app/<handle>` site host | DearMe cloud | server `/v1/site/*` |
| Stripe billing + per-user $ caps | DearMe cloud | server `/v1/billing/*` |
| 5 outbound publishing tools (post_x / send_linkedin_dm / send_email / deploy_site / create_meta_campaign) | DearMe (in OpenClaw plugin) | `packages/plugins/dearme-openclaw/src/tools/types.ts` |
| Tri-substrate event stream (15 SSE event types) | DearMe (cloud edge) | `packages/plugins/dearme-agent-prompts/src/state-machines/sse-events.ts` |
| `DEARME_ROLE_REGISTRY` — single typed source of truth | DearMe | `packages/plugins/dearme-agent-prompts/src/registry.ts` |

**Rule.** Adding a new capability requires picking exactly one column. If it spans multiple, decompose it until it doesn't.

---

## 3. Topology

```
┌──────────── User device — OpenClaw runtime ────────────┐
│                                                        │
│  Channels (per-user OAuth, OpenClaw-managed)           │
│   iMessage  Telegram  WhatsApp  Slack  Discord  Signal │
│   Voice Wake  Email Pub/Sub  SMS                       │
│                                                        │
│  ~/.openclaw                                           │
│   ├ workspace/{AGENTS,SOUL,IDENTITY,USER}.md           │
│   ├ workspace/skills/dearme-<role> × 12  (gen)         │
│   └ agents/<id>/sessions, agents/<id>/agent/auth-...   │
│                                                        │
│  DearMe plugin (id: "dearme")                          │
│   ├ outbound tool surface:                             │
│   │  post_x · send_linkedin_dm · send_email ·          │
│   │  deploy_site · create_meta_campaign                │
│   │  (each fires through the cloud edge below for      │
│   │   approval + audit + delivery; never direct)       │
│   └ generated/skills/* and generated/bootstrap/*       │
└────────────────────┬───────────────────────────────────┘
                     │ HTTPS  Authorization: Bearer dm_sk_*
                     │        X-DearMe-Task / X-Subscription-ID
                     │        X-DearMe-Correlation-Id
                     ▼
┌──────────── DearMe cloud edge — Express ───────────────┐
│                                                        │
│  /v1/proxy/*           dearme-ai-proxy (6 fns,         │
│                        dual-protocol attribution)      │
│  /v1/voice/score       voice fingerprint scoring       │
│  /v1/opportunities/*   Hunter.io-verified leads        │
│  /v1/site/*            dearme.app/<handle> host        │
│  /v1/channels/*        OAuth start + callback for each │
│                        channel; writes channel_conns   │
│  /api/dearme/.../approvals/resolve                     │
│                        gate resolver + decision audit  │
│  /api/dearme/companies/:companyId/events              │
│                        scoped live workbench stream    │
│                                                        │
│  Cycle engine (driven from OpenClaw cron via webhook)  │
│   plan → work → review → learn → report                │
│   maps onto work-loop 8-state                          │
│                                                        │
└─────────────────────┬──────────────────────────────────┘
                     │ Drizzle
                     ▼
┌──────────── Naive/Paperclip cloud DB ──────────────────┐
│                                                        │
│  85 tables (Paperclip-inherited + DearMe additions):   │
│    issues, heartbeat_runs, heartbeat_run_events,       │
│    issue_approvals, issue_work_products,               │
│    routines, agents, agent_runtime_state,              │
│    cost_events, finance_events, budget_policies,       │
│    activity_log, documents, document_revisions,        │
│    company_secrets, environments, environment_leases,  │
│    + opportunities (DM-141)                            │
│    + channel_connections (DM-175)                      │
│    + dearme_voice_profiles (DM-170C)                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 4. The unified work loop (8 states across all 3 substrates)

Every work item moves through eight named states, defined in `state-machines/work-loop.ts`. Each state's runtime is hosted by one substrate; the transition wire is the same regardless.

```
intake  →  triage  →  work  →  gate  →  deliver  →  audit  →  review  →  archive
   │                    │        │                                │
   └─→ archive  triage ─┘        └─→ review  (no-gate work products)
                                          (user rejected, etc)
```

Per-state substrate binding (from `WORK_LOOP_SUBSTRATE_BINDINGS`):

| State | OpenClaw | Naive | Polsia |
|---|---|---|---|
| **intake** | channel inbound (WS frame) | `issues.create (status=queued, originId=channel:<id>)` | `send_message` inbound trigger |
| **triage** | session-lane head + chief-of-staff agent run | chief-of-staff routine wakeup; `agent_runtime_state.lastRouted` | CEO 4-step workflow: classify → search_memory → choose specialist |
| **work** | `agent.run` on selected role's skill (sandbox if browser-agent) | `heartbeat_runs.start` + `heartbeat_run_events` stream | specialist agent runtime |
| **gate** | tool-call interception: outbound tool blocks until approval signal | `issue_approvals.create (kind=publish\|send\|deploy\|spend, status=pending)` | 4-gate review: publish, send, deploy, spend |
| **deliver** | outbound tool invocation (post_x / send_email / deploy_site / etc) | `issue_work_products.create` + `channel_connections.lastUsedAt` | verified-channel publish/send action |
| **audit** | stream `lifecycle:end` event surfaces back to OpenClaw client | `cost_events` + `activity_log` + `finance_events`; voice gate score on work_product | cost ledger + /live social-proof feed entry |
| **review** | `session.followup` — Chief inspects result, picks next move | `issue.transition`; decision recorded on `issue_execution_decisions` | CEO post-execution review + queue refill (≥ 3) |
| **archive** | session history rotate; skill snapshot refresh | `issue.status=closed`; cycle learning written to `documents` | cycle close; learning fed to next every-6h cycle |

Code: `packages/plugins/dearme-agent-prompts/src/state-machines/work-loop.ts`. Tests: `state-machines/work-loop.test.ts` (rolled into `index.test.ts`).

The Polsia 5-stage cycle (plan/work/review/learn/report) is a coarser rollup of the 8-state loop (`WORK_LOOP_TO_CYCLE_STAGE`), so the Chief of Staff can render the same in-flight item to the user in either vocabulary — fine-grained 8-state for ops, coarse-grained 5-stage for the Dear-me letter.

---

## 5. The unified event stream (15 SSE events)

`sse-events.ts` documents 15 event types covering all three substrates' notable lifecycle moments:

| Bucket | Events | What it is |
|---|---|---|
| Workbench v1 (Polsia /live + Naive activity_log) | `sync`, `thinking_stream`, `thinking_stream_delta`, `dashboard_action`, `task_created`, `task_updated`, `agent_completed` | Pre-existing live workbench feed. |
| Tri-substrate v2 (DM-S06) | `work_loop_transition`, `approval_pending`, `approval_resolved`, `voice_gate_scored`, `channel_action_fired`, `cost_recorded`, `openclaw_lifecycle`, `openclaw_stream` | New events that surface work-loop transitions, the 4 approval gates, voice-gate scoring, channel deliveries, cost ledger writes, and OpenClaw passthroughs. |

Every event carries `scope.{companyId, issueId, executionId, agentId, openclawSessionId, workLoopState}` so a single in-flight work item can be reconstructed across substrates by joining on any one of these.

DM-179 is the HTTP stream boundary for this: the cloud edge emits a `sync`
workbench snapshot first, then forwards typed `dearme-sse-bus` events scoped to
the company. DM-181 wires the customer workbench to that route: `sync` updates
replace the existing React Query workbench cache, while broader runtime events
invalidate the same cache so the read model remains the single source of truth.
DM-182 includes `openclaw_lifecycle` and `openclaw_stream` in that same UI
refresh set, so upstream OpenClaw passthroughs can update the Team workbench
without a second customer subscription or runtime console.
DM-180 adds the approval resolve HTTP boundary to the same route family, so
approval decisions, issue links, activity logs, and SSE emissions all come from
one resolver path instead of per-tool forks.

---

## 6. The 4 approval gates (the only places we wait)

`state-machines/approval-gates.ts` codifies the four binary checkpoints:

| Gate | Auto-approve threshold | Voice-gate required | Hard cap | Default TTL |
|---|---|---|---|---|
| **publish** | 5 prior approved on same channel | yes | — | 60 min |
| **send** | 5 prior approved on same channel | yes | — | 60 min |
| **deploy** | 1 prior approved (first deploy gates; same-domain re-deploys don't) | no | — | 30 min |
| **spend** | never auto-approves | no | `defaults.budget.dailyUsdCap` (default $5) | 15 min |

The runtime resolver (`resolveApproval(req, ctx)`) is a pure function. It is the only place in the codebase that decides pending / approved / rejected. The cloud's outbound-tool wrapper calls it before any `delivered` outcome.
DM-180 exposes that resolver through
`POST /api/dearme/companies/:companyId/approvals/resolve`; the route checks
company access, normalizes issue identifiers to issue IDs, preserves user/agent
attribution, and returns 202 for pending decisions or 200 for approved/rejected
decisions.

Mapping to substrate:
- **Polsia** named the 4 gates and the resolver semantics.
- **Naive** stores requests in `issue_approvals` and decisions in `approval_comments`.
- **OpenClaw** intercepts at tool-call time — the outbound tool wrapper holds while the cloud resolves.

Concern budget: these four gates are the whole v1 wait surface. Everything else
is autonomous by default: research, drafting, staging, memory updates, report
writing, queue refills, previews, and private analysis should move without a
permission prompt. If a new flow wants to stop the user, classify it as
publish/send/deploy/spend or redesign it as a private draft plus receipt.

---

## 7. Outbound tool contract (5 tools)

`packages/plugins/dearme-openclaw/src/tools/types.ts` declares the shape of every outbound tool. None of the 5 ship verbatim from any substrate — they are DearMe-original, but each binds cleanly to all three:

| Tool | Gate | Channel | Voice-gate | Substrate role |
|---|---|---|---|---|
| `post_x` | publish | x | yes | OpenClaw plugin → DearMe cloud → user's X OAuth (Naive `channel_connections`) |
| `send_linkedin_dm` | send | linkedin | yes | OpenClaw plugin → DearMe cloud → configured LinkedIn partner endpoint with user's active LinkedIn channel connection |
| `send_email` | send | resend / ses | yes | OpenClaw plugin → DearMe cloud → Resend or SES through the same approval/audit wrapper; Gmail stays out of scope to avoid CASA cost |
| `deploy_site` | deploy | dearme-cloud | no | OpenClaw plugin → DearMe cloud `/v1/site/*` (DearMe-owned host) |
| `create_meta_campaign` | spend | meta_ads | no | OpenClaw plugin → DearMe cloud → user's active Meta Ads channel connection → Meta Marketing API campaign shell |

Every tool returns one of: `delivered`, `pending`, `needs_oauth`, `rejected`, `errored`. The first is the only success state; the others are user-actionable.

---

## 8. Per-role substrate map

`registry.ts` now carries a `substrate: { openclaw, naive, polsia }` field on every role. Distribution after DM-S06:

| OpenClaw mechanism | Count | Roles |
|---|---|---|
| `session-shell` (user-facing conversational front) | 2 | chief-of-staff, chat |
| `cron-driven` (fires from OpenClaw Gateway cron) | 2 | reporting, health-monitor |
| `sandbox-non-main` (runs in Docker sandbox) | 1 | browser-agent |
| `skill-call` (routed via `find_best_agent`) | 7 | content-producer, opportunity-hunter, brand-site-builder, ads-manager, research-agent, audience-care, data-analyst |

| Naive table-of-record | Count | Roles |
|---|---|---|
| `routines` (recurring schedule) | 3 | chief-of-staff, reporting, health-monitor |
| `heartbeat_runs` (durable execution row) | 5 | content-producer, opportunity-hunter, brand-site-builder, ads-manager, browser-agent |
| `documents` (knowledge artifact) | 2 | research-agent, data-analyst |
| `issues` (one issue per work item) | 2 | audience-care, chat |

| Polsia cycle stage | Count | Roles |
|---|---|---|
| `plan` | 2 | chief-of-staff, chat |
| `work` | 6 | content-producer, opportunity-hunter, brand-site-builder, ads-manager, audience-care, browser-agent |
| `review` | 1 | health-monitor |
| `learn` | 2 | research-agent, data-analyst |
| `report` | 1 | reporting |

The fact that `work`-stage roles dominate (6 of 12) is intentional and matches the Polsia doctrine: the team should be doing work, not planning or reporting. Two `plan`-stage roles is correct (Chief of Staff for cycle planning, Chat for conversational planning); two `learn`-stage roles is the intelligence team; one `review` (health-monitor) and one `report` (reporting) are enough.

Programmatic access: `getSubstrateDistribution()` in `dearme-agent-prompts`.

---

## 9. Voice gate (DearMe IP, wired across all three)

`packages/dearme-ai-proxy/src/voice-gate.ts` declares the wire contract. Pipeline:

```
1. Onboarding (DM-138):  cloud crawls public corpus → trains fingerprint
                         → stores `users.voiceFingerprintId`

2. Drafting:             content-producer / opportunity-hunter / brand-site-builder
                         produce text via Polsia prompts

3. Pre-gate scoring:     cloud's outbound-tool wrapper calls
                         POST /v1/voice/score → { score, passed, floor, reasons, rewrite }

4. Persistence:          `issue_work_products.metadata.voiceGateScore` (Naive)

5. SSE emit:             `voice_gate_scored` event on unified stream

6. Approval resolve:     `resolveApproval()` checks `voiceGateRequired` for the gate;
                         rejects below floor

7. Delivery (or hold):   tool fires (or pends, or rewrites)
```

The artifact kinds (`x-tweet`, `linkedin-post`, `outbound-email`, etc.) let the cloud pick scoring heuristics per format. The default floor is 92; users can override via `defaults.voiceGate.minScore` in their OpenClaw plugin config.

---

## 10. What we save by integrating instead of building

| Capability | Without integration | With integration | Saved |
|---|---|---|---|
| Channel infrastructure (24+) | 12+ eng-weeks per channel × 24 | OpenClaw ships them all | ~50+ eng-weeks |
| Voice capture + wake | 3 eng-weeks + iOS/Android | OpenClaw voice skills | 6 eng-weeks |
| Sandbox + cron | 3 eng-weeks + infra | OpenClaw built-in | 3 eng-weeks |
| Gmail inbound (no CASA) | $15K + 3 months | OpenClaw Pub/Sub path | $15K + 3 mo |
| 12 production prompts | Iterate to convergence (months) | Verbatim from Polsia research | months |
| 6 OpenAI fns | Design + tune | Verbatim from Polsia research | weeks |
| Issue lifecycle / heartbeats | Build durable execution layer | Inherited from Naive/Paperclip fork | 8+ eng-weeks |
| Approvals system | Build state machine + UI | Inherited (`issue_approvals`) | 2 eng-weeks |
| Cost ledger | Build cost-event pipeline | Inherited (`cost_events`) | 2 eng-weeks |
| Plugin SDK (server-side) | Build from scratch | Inherited (Paperclip plugin SDK) | 4+ eng-weeks |

**Net: ~75+ eng-weeks and $15K of audit cost avoided** by treating all three as substrates and only building the DearMe-original layer (voice fingerprint, opportunities cloud, personal site host, the 5 outbound tools, the unified SSE).

---

## 11. What's still ours to build (DM-S06 → DM-S07 → next)

The integration only works if these glue artifacts ship:

| Ticket | Slice | Why it's the next critical path |
|---|---|---|
| DM-170 | Cloud `/v1/voice/score` endpoint | **Route + durable store + persisted key auth + semantic scorer seam shipped.** The Express contract route reuses the DM-S07 scorer, with accepted-sample continuity behind an injectable bounded profile store persisted in `dearme_voice_profiles`; `dm_sk_*` auth now requires an issued, unrevoked `agent_api_keys` row. A trained model or embedding scorer can now contribute bounded match/drift signals through `semanticScorer` without another route or review surface. Remaining impl connects and calibrates the live scorer. |
| DM-171 | OpenClaw plugin install flow + onboarding bridge | The bridge is already surfaced in the existing first-run path; keep the install proof and customer-facing first-run language aligned. |
| DM-172 | `post_x` outbound tool — `ChannelDispatch` impl | **Server dispatcher shipped.** Wrapper runs gate/approval/OAuth/audit; `dearme-x-post-dispatch.ts` decrypts the stored X credential, validates expiry/scope/payload, posts to X API v2, and maps auth failures back to reauth. Live external posting still needs a real credential smoke. |
| DM-173A | Per-user X OAuth callback persistence proof → writes `channel_connections` | Route + Drizzle upsert shipped. |
| DM-173B | X OAuth start URL + PKCE callback exchange | Wrapper now returns a DearMe-owned `oauthStartUrl`; `GET /v1/channels/:companyId/x/start` builds the X authorize URL when configured and stays fail-closed when config is absent. The browser callback exchanges the code, loads the profile, encrypts credentials, and writes an active `x` row with same-origin return handling. DM-172B consumes that row for approved X posting. |
| DM-174 | `send_email` `ChannelDispatch` (Resend/SES) | **Resend + SES dispatchers shipped in one wrapper path.** Wrapper runs gate/approval/OAuth/audit; `dearme-send-email-dispatch.ts` resolves the stored provider credential, validates plain-text payload and expiry, calls Resend `POST /emails` or SES v2 `SendEmail`, and maps auth failures back to reauth. HTML is fail-closed until sanitizer support lands. Live external email still needs a real credential smoke. |
| DM-175 | `channel_connections` Drizzle schema | **Shipped DM-S06; migration backfilled in 0078.** ✅ |
| DM-176A | `send_linkedin_dm` partner `ChannelDispatch` | **Server dispatcher shipped.** Wrapper runs gate/approval/OAuth/audit; `dearme-linkedin-dm-dispatch.ts` resolves the stored partner credential, requires `send_dm` capability, posts to a configured partner messages endpoint, and maps auth failures back to reauth. Live LinkedIn delivery still needs an approved partner endpoint + credential smoke. |
| DM-176B | LinkedIn partner endpoint config gate | **App config gate shipped.** App startup resolves DearMe LinkedIn partner endpoint env into the default approved launch handoff path; when absent, the direct dispatcher is not registered and existing fallback behavior is not shadowed. |
| DM-177B | Preview `deploy_site` `ChannelDispatch` | **Preview dispatcher shipped.** Approved private-site proof handoffs use `dearme-deploy-site-dispatch.ts` through the same wrapper/audit path, validate safe handles + artifact refs, keep custom domains behind the operator-only custom-domain flag, and return stable preview receipts at `dearme.app/<handle>?preview=*` without OpenClaw gateway config. |
| DM-177C/DM-177E | Configured production/custom-domain site host gate | **Production/custom-domain host config gate shipped.** App startup now resolves DearMe site host env into the default approved launch handoff path, so production URL receipts stay fail-closed by default and can be enabled explicitly for the DearMe-owned host or an operator-approved custom domain without adding a customer settings surface. |
| DM-177 | Public `deploy_site` live smoke | Brand Site Builder closes the public site loop once the configured DearMe host or custom-domain receipt serves expected live content. |
| DM-178 | `create_meta_campaign` `ChannelDispatch` | **Server dispatcher shipped.** Wrapper runs spend approval/OAuth/audit; `dearme-meta-campaign-dispatch.ts` resolves the stored Meta ads credential, requires `ads_management`, enforces test/ramp/scale budget tiers and the 7-day learning window, creates a paused Meta campaign receipt, and maps auth failures back to reauth. Live paid-ad delivery still needs a real Meta OAuth/Marketing API smoke. |
| DM-178B | Meta Graph API base-url config gate | **App config gate shipped.** App startup resolves DearMe Meta Graph env into the default approved launch handoff path so live smoke can target the intended Graph base/version without adding a customer connector surface. |
| DM-179 | Tri-substrate SSE Express route reading from `dearme-sse-bus` | **Shipped.** `GET /api/dearme/companies/:companyId/events` emits a workbench sync snapshot and scoped runtime events. ✅ |
| DM-182 | OpenClaw passthrough workbench refresh | **Shipped.** Customer workbench invalidates on `openclaw_lifecycle` / `openclaw_stream` through the same EventSource route. ✅ |
| DM-180 | Approval resolver Express route over `dearme-approval-resolver` service | **Shipped.** `POST /api/dearme/companies/:companyId/approvals/resolve` resolves through the shared service, normalizes issue refs, and persists actor attribution. ✅ |

The shipped subset now includes DM-175 channel_connections schema, DM-S06 contracts, **DM-S07 server services**, **DM-179 SSE route**, **DM-182 passthrough refresh**, **DM-180 approval route**, **DM-170 route + durable profile store + persisted key auth + semantic scorer seam**, **DM-172 X dispatch**, **DM-173A/DM-173B X OAuth persistence**, **DM-174 Resend + SES email dispatch**, **DM-176A/DM-176B LinkedIn partner dispatch + config gate**, **DM-177B preview deploy dispatch**, **DM-177C/DM-177E configured production/custom-domain host gate**, and **DM-178/DM-178B Meta campaign dispatch + config gate**. The remaining gaps are live-provider smokes, live public-site DNS/host smoke, and live DM-170 model/embedding calibration.

---

## 11b. The runtime — where DM-S06 contracts actually run (DM-S07)

The contracts in §4–§7 are wired into 6 dependency-injected services in
`server/src/services/`. Per-channel implementations plug into one typed
slot and never re-implement the gate / approval / audit pipeline.

| Service | File | Role |
|---|---|---|
| SSE bus | `dearme-sse-bus.ts` | Process-local typed `EventEmitter`; cross-tenant scoped; backs the DearMe live workbench SSE route. |
| SSE route | `server/src/routes/dearme.ts` | `GET /api/dearme/companies/:companyId/events`; enforces company access, emits an initial `sync` workbench snapshot, then forwards typed runtime events by company. |
| Channel connections | `dearme-channel-connections.ts` | Drizzle queries over `channel_connections`. `getActive` / `markUsed` / `markNeedsReauth` / `upsertActive`. |
| X connection routes | `server/src/routes/dearme-channel-connections.ts` + `server/src/services/dearme-x-oauth-connection.ts` | `GET /v1/channels/:companyId/x/start` redirects to X with PKCE; `GET /v1/channels/:companyId/x/callback` consumes server-side state, exchanges the X code, loads the profile, encrypts credentials, and persists an active per-user `x` row. `POST /v1/channels/:companyId/x/callback` remains the test/API seam around the same persistence path. |
| Channel credential resolver | `server/src/services/dearme-channel-credential.ts` | Shared secret-provider envelope resolver used by per-channel dispatchers. Keeps `channel_connections.encryptedCredential` opaque to the generic service and resolves material only at the provider-specific dispatch boundary. |
| X post dispatch | `server/src/services/dearme-x-post-dispatch.ts` | Default `post_x` dispatcher for approved launch handoffs. It consumes the existing opaque credential, validates `tweet.write`, posts to X API v2, maps delivered tweet ids to stable public URLs, and maps provider auth failures to reauth. |
| LinkedIn DM dispatch | `server/src/services/dearme-linkedin-dm-dispatch.ts` + `server/src/services/dearme-linkedin-dm-dispatch-config.ts` | Optional direct `send_linkedin_dm` dispatcher for approved launch handoffs when a partner messages endpoint is configured. It consumes the existing opaque LinkedIn channel credential, requires a partner/provider credential with `send_dm` capability, sends with the wrapper idempotency key, and maps provider auth failures to reauth. Browser automation and guessed private APIs stay out of this path. |
| Email dispatch | `server/src/services/dearme-send-email-dispatch.ts` | Default `send_email` dispatcher for approved launch handoffs. It consumes the resolved opaque `resend` or `ses` credential, validates sender/recipient/subject/plain-text body/expiry, posts to Resend `POST /emails` or SES v2 `SendEmail`, signs SES requests at the provider boundary, maps delivered email ids to receipts, and maps provider auth failures to reauth. HTML is fail-closed until sanitizer support lands. |
| Deploy site dispatch | `server/src/services/dearme-deploy-site-dispatch.ts` + `server/src/services/dearme-deploy-site-dispatch-config.ts` | Default `deploy_site` dispatcher for approved launch handoffs. It validates safe handles, artifact refs, and HTTPS custom-domain hosts, emits stable preview receipts, keeps custom-domain receipts behind an operator env flag, and keeps production/custom-domain receipts fail-closed unless DearMe host env explicitly opts in. |
| Meta campaign dispatch | `server/src/services/dearme-meta-campaign-dispatch.ts` + `server/src/services/dearme-meta-campaign-dispatch-config.ts` | Default `create_meta_campaign` dispatcher for approved paid-ad handoffs. It consumes the existing opaque `meta_ads` credential, requires `ads_management`, bounds campaign name/objective/creative/audience refs, enforces the product's test/ramp/scale daily budget tiers and 7-day learning window, creates a paused campaign receipt through Meta Marketing API, and maps provider auth failures to reauth. The Graph API base URL is operator-configurable for live smoke/tooling without a customer-facing connector surface. |
| Voice gate | `dearme-voice-gate.ts` + `dearme-voice-profile-store.ts` + `routes/dearme-voice-gate.ts` | `scoreVoice(req)` plus root `POST /v1/voice/score`. Default = deterministic scorer with phrase penalties, length floor/ceiling, evidence/shape rewards, same-fingerprint continuity from an injectable bounded profile store persisted in `dearme_voice_profiles` on the app/handoff paths, issued/unrevoked `dm_sk_*` auth through `agent_api_keys`, and an optional `semanticScorer` seam for trained match/drift signals. Next DM-170 impl connects and calibrates the live model behind that seam. |
| Work loop | `dearme-work-loop.ts` | `transition(...)` validates via `canTransitionWorkLoop`, mirrors state into `issues.status`, writes `activity_log`, emits `work_loop_transition` SSE. |
| Approval resolver | `dearme-approval-resolver.ts` + `server/src/routes/dearme.ts` | Wraps `resolveApproval` with past-approved + daily-spend lookups; writes `approvals` + `issue_approvals` with actor attribution; emits approval SSE; exposed by the DM-180 company-scoped resolve route. |
| **Outbound tool wrapper** | `dearme-outbound-tool-wrapper.ts` | The lynchpin. `callOutbound()` runs voice-gate → approval → OAuth → injected `ChannelDispatch` → audit (cost_event + SSE + work-loop transition). |

Adding or replacing an outbound channel after DM-S07 is a `ChannelDispatch`
registration. `post_x`, `send_email`, `send_linkedin_dm`, `deploy_site`, and
`create_meta_campaign` now use this exact slot:

```ts
const linkedInConfig = resolveDearMeLinkedInDmDispatchConfigFromEnv(env);
const metaConfig = resolveDearMeMetaCampaignDispatchConfigFromEnv(env);

channelDispatch: {
  ...defaultGatewayDispatch,
  post_x: createDearMeXPostDispatch(),
  send_email: createDearMeSendEmailDispatch(),
  deploy_site: createDearMeDeploySiteDispatch(siteConfig),
  ...(linkedInConfig
    ? { send_linkedin_dm: createDearMeLinkedInDmDispatch(linkedInConfig) }
    : {}),
  create_meta_campaign: createDearMeMetaCampaignDispatch(metaConfig ?? {}),
  ...overrides,
}
```

The wrapper is the only place that owns ordering. Per-channel impls
never re-implement gate / approval / audit. That's how the tri-substrate
contract enforces itself at runtime.

---

## 12. Doctrine

Five rules govern the integration. None of them are negotiable without a registry/contract change:

1. **Single typed source of truth.** The 12 roles live in one place: `DEARME_ROLE_REGISTRY`. Every substrate reads from it; nothing restates it.
2. **One owner per capability.** The matrix in §2 is exhaustive. If a feature can't be placed in exactly one column, decompose until it can.
3. **Verbatim port for runtime artifacts.** Polsia prompts and OpenAI function definitions are byte-for-byte. No paraphrase; mechanical brand substitution only.
4. **Voice gate before publish/send; spend cap before spend.** The two non-negotiable safeguards. Everything else, the team works.
5. **State at the edge, identity in the cloud.** OpenClaw workspace holds session state. DearMe cloud holds money + voice + opportunities + site host. Cloud is stateless w.r.t. the user's transcript unless they opt in.

---

## 13. Source of truth for this integration

- **Tri-substrate doc** (this file): `docs/dearme/TRI-SUBSTRATE-ARCHITECTURE.md`
- **OpenClaw integration**: `docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md`
- **Product architecture**: `docs/dearme/PRODUCT-ARCHITECTURE.md`
- **North star**: `docs/dearme/INDEX.md`
- **Role registry (SSOT)**: `packages/plugins/dearme-agent-prompts/src/registry.ts`
- **Work-loop state machine**: `packages/plugins/dearme-agent-prompts/src/state-machines/work-loop.ts`
- **Approval-gate resolver**: `packages/plugins/dearme-agent-prompts/src/state-machines/approval-gates.ts`
- **Unified SSE events**: `packages/plugins/dearme-agent-prompts/src/state-machines/sse-events.ts`
- **Outbound tool types**: `packages/plugins/dearme-openclaw/src/tools/types.ts`
- **Voice-gate wire**: `packages/dearme-ai-proxy/src/voice-gate.ts`
- **OpenClaw plugin manifest**: `packages/plugins/dearme-openclaw/openclaw.plugin.json`
- **Generated SKILL.md**: `packages/plugins/dearme-openclaw/generated/skills/dearme-<role>/SKILL.md`
- **Channel OAuth schema**: `packages/db/src/schema/channel_connections.ts`
- **Opportunities schema**: `packages/db/src/schema/opportunities.ts`
- **Runtime — SSE bus**: `server/src/services/dearme-sse-bus.ts`
- **Runtime — channel connections**: `server/src/services/dearme-channel-connections.ts`
- **Runtime — voice gate**: `server/src/services/dearme-voice-gate.ts`
- **Runtime — work loop**: `server/src/services/dearme-work-loop.ts`
- **Runtime — approval resolver**: `server/src/services/dearme-approval-resolver.ts`
- **Runtime — outbound tool wrapper (lynchpin)**: `server/src/services/dearme-outbound-tool-wrapper.ts`
- **Runtime — channel credential resolver**: `server/src/services/dearme-channel-credential.ts`
- **Runtime — X post dispatch**: `server/src/services/dearme-x-post-dispatch.ts`
- **Runtime — LinkedIn DM dispatch/config**: `server/src/services/dearme-linkedin-dm-dispatch.ts`, `server/src/services/dearme-linkedin-dm-dispatch-config.ts`
- **Runtime — email dispatch**: `server/src/services/dearme-send-email-dispatch.ts`
- **Runtime — deploy site dispatch/config**: `server/src/services/dearme-deploy-site-dispatch.ts`, `server/src/services/dearme-deploy-site-dispatch-config.ts`
- **Runtime — Meta campaign dispatch/config**: `server/src/services/dearme-meta-campaign-dispatch.ts`, `server/src/services/dearme-meta-campaign-dispatch-config.ts`
