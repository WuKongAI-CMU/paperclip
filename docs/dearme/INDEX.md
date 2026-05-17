# DearMe — North Star Index

> **The single document a new contributor (or future you) reads first.** Every other doc in this folder is supporting material. If something here conflicts with an older doc, **this wins.**

> **P0 carve-out (adopted 2026-05-14).** OpenClaw runtime and `dearme-ai-proxy` runtime are **deferred to P1**. Architecture and code stay in tree as dormant artifacts. P0 paid beta ships **web-only**: web inbound, browser MediaRecorder for voice capture, Paperclip routines/heartbeats for cron, web-first outbound (LinkedIn copy-to-clipboard, X via OAuth, email via Resend/SMTP). The §3 diagram below describes the **P1+ target state**; in P0 the OpenClaw layer is dormant and the proxy routes are unmounted. Full rationale, per-role verdict, code touchpoints, and revival criteria in [`P0-SCOPE-CUT-2026-05-13.md`](P0-SCOPE-CUT-2026-05-13.md).

Last updated: 2026-05-17 (post DM-PAID-FUNNEL-EVENTS)

---

## 1. The product in one sentence

**DearMe is a private AI growth team for one person.** It turns a single human's work, voice, proof, and relationships into shipped content, real opportunities (clients/jobs/podcasts/sponsorships), a live personal site, paid ads when worth it, and a 200-word "Dear me" letter every day.

### Aha moment (≤ 5 minutes from signup)

1. **0–30s** — Identity dossier appears (LinkedIn + GitHub + public posts pulled and synthesized, voice fingerprinted).
2. **60–120s** — Audience map and 5 outbound shortlist appear, three of them with verified emails.
3. **3–5min** — A live `dearme.app/<handle>` personal site is reachable from the user's phone.

If we ship that, we have a product. Everything else is amplification.

### Who pays

Solo operator with a public-facing professional surface — consultant, indie founder, candidate-on-market, creator-with-offer, agency-of-one — willing to spend `$X/month` to have a small AI team **run their growth without them**, in their voice, with weekly proof of work.

---

## 2. The team (12 roles, runtime-locked)

These are not "prompts in a doc" — they are typed entries in `DEARME_ROLE_REGISTRY` (`packages/plugins/dearme-agent-prompts/src/registry.ts`), each pinned to a verbatim production-verified system prompt, the state machines it depends on, the proxy tools it can call, the plugin package that owns its runtime, and the ticket that owns its build.

| # | Role | Group | Plugin package | Ticket | What it does |
|---|------|-------|----------------|--------|--------------|
| 1 | **Chief of Staff** | leadership | `dearme-chief-of-staff` | DM-139 | Always-on team lead. Monitors → reviews → keeps queue ≥ 3 → writes Dear-me letter. |
| 2 | **Reporting** | leadership | `dearme-reporting` | DM-139 | Sends the conversational, < 200-word, 3-tool daily letter. |
| 3 | **Content Producer** | growth | `dearme-content-producer` | DM-140 | Twitter/X 2/day, 280-char, dark-humor, attribution-link gated. |
| 4 | **Opportunity Hunter** | growth | `dearme-opportunity-hunter` | DM-141 | Finds + outreaches via 5-touch sequence, 8-state lifecycle, Hunter.io verified emails. |
| 5 | **Brand Site Builder** | build | `dearme-brand-site-builder` | DM-147 | Personal site: write code → fix → deploy. Push after every change. 512MB. |
| 6 | **Ads Manager** | growth | `dearme-ads-manager` | DM-148 | Meta ads end-to-end: 5 tools, 7-day learning, 4 perf tiers, Sora 2 UGC creative. |
| 7 | **Research** | intelligence | `dearme-research-agent` | DM-138 | Web search + synthesis; every task ends with a saved report. |
| 8 | **Audience Care** | ops | `dearme-audience-care` | DM-149 | Inbound replies + escalation matrix. Plain-text, length-matched. |
| 9 | **Data Analyst** | intelligence | `dearme-data-analyst` | DM-153 | Schema-first SQL/BI; correlation-vs-causation discipline. |
| 10 | **Health Monitor** | ops | `dearme-health-monitor` | DM-150 | Periodic factual snapshots; reports never recommends; dedupes against backlog. |
| 11 | **Chat** | interface | `dearme-chat` | DM-138 | User-facing cofounder chat; routes via `find_best_agent`; manages recurring tasks. |
| 12 | **Browser** | build | `dearme-browser-agent` | DM-151 | Web automation respecting 4-tier site policy. |

> **All 12 prompts are already shipped** in the runtime corpus. None of them are "planned content" — they are the verbatim production strings DearMe will execute at first run. What's still planned is the plugin runtime that wires each one to the work loop. See ticket column.

---

## 3. The architecture in one diagram

```
┌────────────── User device — OpenClaw runtime ──────────────┐
│ Channels (per-user OAuth):                                  │
│  iMessage  Telegram  WhatsApp  Slack  Discord  Signal       │
│  Voice Wake  Email (Pub/Sub)                                │
│                                                             │
│ ~/.openclaw                                                 │
│  ├─ workspace/{AGENTS,SOUL,IDENTITY,USER}.md  (DearMe seed) │
│  └─ skills/dearme-<role> × 12  (generated from registry)    │
│                                                             │
│ DearMe plugin (id: "dearme")  — outbound tools live here:   │
│   post_x, send_linkedin_dm, send_telegram_message,          │
│   send_imessage, send_email, deploy_site,                   │
│   create_meta_campaign                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS  dm_sk_*  +  X-DearMe-Task
                       ▼
┌─────────── DearMe cloud (api.dearme.app) ──────────────────┐
│ • dearme-ai-proxy        — 6 fns, dual-protocol attribution │
│ • voice fingerprint      — capture + score + scorer seam    │
│ • opportunities          — Hunter.io verified, 8-state SM   │
│ • site host              — dearme.app/<handle>              │
│ • billing                — Stripe + per-user $ caps         │
│ • audit                  — voice scores, approvals, runs    │
└─────────────────────────────────────────────────────────────┘
                       │ Drizzle
                       ▼
┌─── packages/db (Paperclip tables + DearMe additions) ───────┐
└─────────────────────────────────────────────────────────────┘

★ Source of truth for the 12 roles:
  packages/plugins/dearme-agent-prompts/src/registry.ts
  → packages/plugins/dearme-openclaw/generated/skills/  (mechanical)
```

★ = the typed registry shipped this round. It is the single runtime source of truth for the team. The OpenClaw plugin's SKILL.md tree is **generated**, not authored.

### Layer responsibilities

- **OpenClaw Gateway (user device)** — channel inbound, voice capture, sandbox, cron, session lanes. Loads the DearMe plugin and its 12 skills. _Not built by us; we conform to the contract documented in `openclaw/docs/concepts/`._
- **`packages/plugins/dearme-openclaw`** — OpenClaw plugin: registry → 12 SKILL.md generator, bootstrap files, outbound channel tool surface (post_x, send_linkedin_dm, send_telegram_message, send_imessage, send_email, deploy_site, create_meta_campaign). Ships generated skills under `generated/skills/`.
- **`packages/plugins/dearme-agent-prompts`** — typed seed corpus: 12 prompts + 6 state machines + 2 templates + the **role registry** (`DEARME_ROLE_REGISTRY`) that pins everything together. **No runtime; pure data.** Consumed by `dearme-openclaw` and by cloud worker plugins.
- **`packages/dearme-ai-proxy`** — wire contract for the LLM proxy: `dm_sk_` keys, dual-protocol cost-attribution headers (`X-DearMe-Task` for OpenAI, `X-Subscription-ID` for Anthropic), 6 OpenAI native function definitions ported verbatim.
- **`packages/db`** — Drizzle schema. 85 tables inherited from Paperclip + `opportunities` (DM-141), `channel_connections` (DM-175), and `dearme_voice_profiles` (DM-170C); migration `0078_simple_quicksilver.sql` backfills the current schema history.
- **`server/` (DearMe cloud)** — Express. Hosts AI proxy, voice scoring, voice profile persistence, opportunities, site host, billing, audit. Stateless w.r.t. the user transcript — durable product state lives in the Naive/Paperclip tables or at the OpenClaw edge.
- **`ui/`** — secondary workbench-style surface for batch approvals, audit, /live feed. Conversation lives on whichever channel the user picked in OpenClaw, not in this UI.

> **The big shift (DM-S05 / DM-S06):** DearMe is the integration of three substrates. **OpenClaw** runs on the user's device (channels, voice, sandbox, cron, skill loader). **Naive/Paperclip** runs in the cloud (85 Drizzle tables, durable execution, approvals, cost ledger). **Polsia** is verbatim choreography (12 prompts, 6 fns, 4 approval gates, 5-stage cycle). DearMe's own IP is the voice fingerprint, the personal site host, the opportunities database, the daily letter, and the wire that ties the three together. See `TRI-SUBSTRATE-ARCHITECTURE.md` for the full integration contract; see `OPENCLAW-INTEGRATION-ARCHITECTURE.md` for the OpenClaw layer specifically.

Use `pnpm dearme:openclaw-message-rehearsal -- --json` before starting the
OpenClaw live-send lane: it proves Telegram and iMessage share the existing
OpenClaw gateway contract without network access or credentials, while keeping
the live `openclaw_messages` smoke as the real completion gate.
For operator smoke on this Mac, `.dearme-proof.env` opts into local OpenClaw
config reuse so `dearme:provider-smoke` derives gateway URL/auth from
`~/.openclaw/openclaw.json` without copying or printing the token.

---

## 4. The doctrine (don't relitigate)

These four rules make the rest of the docs internally consistent. If any older doc contradicts them, that doc is stale.

1. **Aggressive verbatim port for runtime artifacts.** Server-side prompts, OpenAI function definitions, state machines, wire contracts, templates — port byte-for-byte from research with mechanical brand substitution (`Polsia → DearMe`, `polsia.com → dearme.app`). They are not customer-facing UI; they are mechanism. (See `PRODUCT-ARCHITECTURE.md` §9.0.)
2. **Customer-facing surface is original.** Marketing, brand identity, screen copy, public site, public language, support voice — all DearMe-original. No donor logos, wordmarks, or distinctive imagery.
3. **Useful first, autonomous first.** Don't gate the aha moment on consent screens, throat-clearing, or compliance theater. Approval gates exist where money or public action happens (publish / send / deploy / spend). Everywhere else, the team works. The concern budget is those four gates; any extra pause must be turned into a private draft, receipt, or batch decision.
4. **The registry is law.** If the registry says a role exists, it exists. If it doesn't, it doesn't. New roles require a registry entry + a ticket + a plugin package — not a new prompt file dropped in.

---

## 5. What's shipped vs. what's left

### Shipped (as of 2026-05-17)
- **DM-S01** — company mass-assignment vulnerability fixed + 92 shared tests green.
- **`opportunities` schema slice** (DM-141) — Drizzle table + 8-state machine + indexes.
- **`@paperclipai/dearme-agent-prompts`** — 12 verbatim prompts, 8 state machines (incl. work-loop + approval-gates), 2 templates, role registry **with `substrate` field**, 25 tests green.
- **`@paperclipai/dearme-ai-proxy`** — 6 OpenAI function definitions, wire contract, `dm_sk_` API key prefix, **voice-gate wire contract**, 6 tests green.
- **DM-S05** — `@paperclipai/dearme-openclaw` plugin: registry-driven skill generator, 12 SKILL.md generated, 4 bootstrap files (AGENTS/SOUL/IDENTITY/USER). DearMe is now an OpenClaw plugin.
- **DM-S06** — tri-substrate integration contracts: unified work-loop state machine (8 states), 4-gate approval resolver, 15-event SSE stream covering all three substrates, per-role substrate map, 7 outbound tool TS interfaces (post_x / send_linkedin_dm / send_telegram_message / send_imessage / send_email / deploy_site / create_meta_campaign), `channel_connections` Drizzle schema (DM-175), voice-gate wire contract.
- **DM-S07 (new)** — tri-substrate **runtime** in the cloud server: 6 dependency-injected services (`dearme-sse-bus`, `dearme-channel-connections`, `dearme-voice-gate`, `dearme-work-loop`, `dearme-approval-resolver`, `dearme-outbound-tool-wrapper`). The lynchpin `callOutbound()` runs every outbound tool through one typed pipeline (voice-gate → approval → OAuth → dispatch → audit). 20 server-side tests green (67 total across the four packages).
- **DM-136** — first-run proof loop contract: the shared preview response now includes an `autonomyPlan` that makes DearMe continue private work automatically and wait only for publish, send, public-site change, or spend. The onboarding shell renders the same contract for both sample proof and generated proof without exposing donor/runtime terms.
- **DM-138B** — first-run proof sequence contract: the same shared preview response now includes `proofSequence`, and both the onboarding proof cards and private first-cycle issue consume the same 0-30s identity dossier, 60-120s audience map, and 3-5min private site proof order.
- **DM-138C** — first-run proof hydration: `previewFirstCycle(...)` now reuses prepared DearMe output handoff records to hydrate the existing `proofSequence` with real documents and work products, while progress comments alone cannot count as proof.
- **DM-138D route proof smoke** — first-cycle start route coverage now proves prepared `proofSequence` content is returned to the customer contract and copied into the private issue, activity log, and live `task_created` payload; onboarding coverage proves the same package renders without exposing substrate terms.
- **DM-WOW-1A local aha proof gate** — `pnpm dearme:aha-proof -- --check` now proves the local private first-five-minute loop from the existing shared first-cycle preview contract. It checks one-sentence start, 0-30s / 60-120s / 3-5min proof order, five private starter drafts, recurring private work, minimum runnable team, launch boundaries, and customer-safe language without sends, public deploys, spend, or live model calls.
- **DM-WOW-1B phone-ready static private-site proof** — `pnpm dearme:aha-proof -- --export-site dist/dearme-private-proof` now renders the same first-cycle proof contract as a mobile-ready private site artifact plus `proof.json` and `host-smoke.json`. The static HTML shows the next private review, and the host-smoke manifest carries the continuation title, prepared next-cycle artifacts, owner roles, and approval boundaries. This gives the next host smoke a concrete artifact and recurring-work manifest without creating a second demo path or pretending production hosting is already live.
- **DM-WOW-2A customer-watchable first-five-minute stream** — the onboarding browser surface now reuses the same first-cycle preview/proof-sequence contract to show studying voice, finding likely audiences, drafting first moves, preparing private proof, and readying the launch call. The top focus card also projects the latest private-pass pulse from the DearMe event stream while hiding Symphony/OpenClaw/provider/model/setup/workbench language.
- **DM-WOW-3A recurring private-work proof** — the first-cycle preview response now carries a continuation plan with the next proof-backed draft, opportunity refresh, and private proof-page improvement. Onboarding and the private site preview render the same plan, and the aha proof gate now blocks if the first proof pack ends as a static demo.
- **DM-138E / DEA-8 live proof handoff** — the live paid-beta smoke proved the same first-cycle path returns identity, audience, private-site, content, opportunity, and report proof through output handoff and workbench projection without hidden donor/runtime terms.
- **DM-139 / DM-140 / DEA-7 packet-backed work** — private Dear me report and content draft packets now reuse output handoff, work products, Voice Gate, workbench projection, and focused review instead of creating a second report/content runtime.
- **DM-183AR review-memory surface** — Work Ready and focused review now preserve customer-safe review receipts through `feedbackTrace.receipts`, so repeated review decisions become visible product memory rather than raw queue history.
- **DEA-9 / DM-183AS repeatable review-memory proof** — the current branch browser/API smoke proves another-pass feedback, fresh private report work, and focused `Feedback applied` receipts on the same Work Ready path without hidden donor/runtime terms.
- **DEA-11 / DM-183BO private launch-handoff proof** — the current branch browser/API smoke proves a prepared output can be approved, converted into the final launch-call approval, accepted, and surfaced as a private handoff brief through DearMe `work=` / `artifact=` navigation without leaking hidden substrate terms or claiming external execution already happened.
- **DEA-47 approved X delivery receipts + DEA-51 DM-173B live connect path + DM-172B X dispatch** — the current branch browser/API and UI proof shows the approved `post_x` handoff path records either a delivered receipt or the existing customer-safe connection-needed receipt; the fallback now carries a DearMe-owned `oauthStartUrl` to `GET /v1/channels/:companyId/x/start`, which builds a PKCE X authorize URL when configured and stays 503 when config is missing. The browser callback consumes server-side state, exchanges the X code for tokens, loads the X profile, and persists an active `x` connection row with an opaque credential. Approved X publishing now has a server-side dispatcher that decrypts the stored credential, validates expiry/scope/payload, posts to X API v2, and maps auth failures back to reauth. Live external posting still needs a real credential smoke.
- **DM-174 live Resend/SES `send_email` dispatch** — approved `send_email` launch handoffs now run through the same voice-gate -> approval -> `channel_connections` -> per-tool dispatch -> audit wrapper as X. The dispatcher resolves the stored per-user provider credential through the secret-provider registry, validates sender/recipient/subject/plain-text body/expiry, calls Resend `POST /emails` or SES v2 `SendEmail` with provider idempotency/signing where applicable, maps auth failures back to reauth, and records delivered receipts from the provider email id. Customer prompts say "email"; provider names stay internal. HTML remains fail-closed until a sanitizer path is added. Live external email still needs a real Resend or SES credential smoke.
- **DM-176A/DM-176B `send_linkedin_dm` partner dispatch** — approved LinkedIn DM handoffs now have a DearMe-owned partner dispatcher and app-level env bridge for `DEARME_LINKEDIN_DM_MESSAGES_URL` / partner endpoint aliases. The dispatcher stays unregistered when no endpoint is configured, so gateway fallback is not shadowed by an empty direct path. Live customer use still needs a real approved partner endpoint + credential smoke.
- **DM-177B/DM-177C/DEA-60 `deploy_site` dispatch** — approved private-site proof handoffs now run through a DearMe-owned `deploy_site` dispatcher instead of needing OpenClaw gateway config. The dispatcher validates safe handles and bounded artifact refs, can emit custom-domain receipts only behind `DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS`, returns stable preview receipts at `dearme.app/<handle>?preview=*`, and keeps production deploy fail-closed unless the DearMe-owned host is explicitly enabled by env. The production smoke lane now also requires the exported `dist/dearme-private-proof/<handle>/index.html` packet plus its `host-smoke.json` expected-text/checksum manifest, so a generic dispatch receipt cannot be mistaken for phone-reachable Polsia-style proof.
- **DM-178/DM-178B `create_meta_campaign` dispatch** — approved paid-ad handoffs now run through a DearMe-owned Meta Ads dispatcher on the same approval/OAuth/audit wrapper path. The dispatcher validates the simplified campaign payload, enforces test/ramp/scale daily budget tiers, respects the 7-day learning window, creates a paused Meta campaign receipt, and maps provider auth failures to reconnect without exposing tokens. App startup can override the Graph API base URL from operator env for live smoke/tooling; live customer use still needs a real Meta OAuth/Marketing API smoke.
- **DEA-62 / DEA-63 / DM-170 Voice profile store + scorer seam** — the cloud Voice Gate scorer keeps accepted-sample continuity behind an injectable, serializable, bounded profile store and now persists that profile in `dearme_voice_profiles` on the default app/handoff paths. `DEARME_VOICE_SEMANTIC_SCORER=profile-token` wires an opt-in local scorer through the same service as a bounded match/drift signal without changing the `/v1/voice/score` contract or customer review surface; live model/embedding scoring should replace or wrap that seam.
- **Voice Gate soft-reject review loop** — failed drafts now return a customer-safe rewrite through the existing `/v1/voice/score` contract. The internal `profile_token_review_loop` voice-smoke target proves the local scorer blocks drift, does not learn the failed draft, and accepts the safe rewrite without adding a new settings surface, live model call, or public send.
- **DM-183BV Symphony cooperation spine** — the current branch now treats Symphony as the coordinator/worker cooperation center while keeping it backstage. Workbench stream items have a typed work-event contract (`action`, `customerSummary`, `artifactTarget`, `decisionNeed`, `traceRefs`) for customer-safe decision cards, the remaining DM-084, DM-086, DM-095, DM-097, DM-098, and DM-101 stale worktree heads are recorded as reviewed absorptions, and `pnpm dearme:worktrees -- --summary-only --skip-dirty --handoffs` gives the coordinator one view of worktree status plus latest durable Symphony handoff artifacts.
- **DEA-20 / Chief pairing smoke** — Symphony closed the OpenClaw Chief pairing lane as no-code evidence: the current OpenClaw plugin manifest, 12 generated skills, 4 bootstrap files, required config, and outbound approval-gate bindings already prove the backstage pairing surface without adding customer-visible substrate language.
- **DEA-21 / private site preview smoke** — the first-cycle proof package now carries a handle-safe `dearme.app/<handle>` private preview route through shared schema, server proof documents, apply/report artifacts, and onboarding UI while keeping public deploy behind the existing launch decision.
- **DM-FOUNDER-DOGFOOD-PROOF** — approved founder dogfood post/site deliveries now write opt-in public proof receipts, `/proof` shows the founder feed with loading/empty/error states, and marketing surfaces link to the proof page without exposing hidden provider or substrate language.
- **DM-DEPENDENCY-BUMP-PLAYWRIGHT** — `@playwright/test` now resolves to 1.60.0, Playwright-adjacent CI stayed green, and the screenshot helper no longer depends on a version-pinned pnpm store path.
- **DM-GOAL-AUDIT-OWNER-HANDOFF** — `pnpm dearme:goal-audit` now surfaces the exact reserved owner facts, item-specific capture setup, no-send check, and guarded live-proof commands when public launch is blocked on external proof facts.
- **DM-BACKLOG-LEDGER-AUDIT** — `pnpm dearme:backlog-audit -- --check` now verifies every P0/P1/P2 item in `CODEX-HANDOFF-TOKEN.md` has a `CODEX-RUN-LEDGER.md` entry, while keeping standing-loop work visible as ongoing.
- **DM-DEPENDENCY-LOOP-AUDIT** — `pnpm dearme:dependency-loop-audit -- --check` now separates autonomous patch and stable-minor dependency bumps from review-required major, prerelease, non-semver, and 0.x minor updates.
- **DM-STANDING-LOOP-AUDIT** — `pnpm dearme:standing-loop-audit -- --check` now combines backlog, dependency, and goal evidence into one next-action state that distinguishes code-owned work from Peter-owned live-proof blockers.
- **DM-HUMAN-HELP-PROOF-QUEUE-FRESHNESS** — `docs/NEEDS_HUMAN_HELP.md` now reflects the current owner-proof queue from the standing, status, goal, and payment readiness audits: private beta is sellable, public proof waits on three approved external facts, and hosted checkout waits on payment configuration.
- **DM-STANDING-LOOP-OWNER-PROOF-FACTS** — `pnpm dearme:standing-loop-audit -- --check` now carries the full owner-proof fact list from `dearme:goal-audit` while keeping the immediate OpenClaw message proof next action specific.
- **DM-STANDING-LOOP-HUMAN-HELP-QUEUE** — `pnpm dearme:standing-loop-audit -- --check` now points owner-proof, hosted-checkout, and Plain-delivery blocker sections at `docs/NEEDS_HUMAN_HELP.md`, where Peter has reply templates and safe follow-up commands.
- **DM-LANDING-COPY-V2** — the public landing page keeps the private growth-team anchor while adding reader-first support copy plus weekly-letter, voice-profile, and opportunity proof artifacts above the fold for stronger landing-to-signup and first-cycle intent.
- **DM-ONBOARDING-FRICTION-AUDIT** — the landing-to-first-cycle handoff now preserves the positioning answer through submit and browser-back, lets `/dearme?knownFor=...` reach a DearMe private beta bridge even when local health checks are unavailable, and replaces generic onboarding with a first-cycle bridge toward signup and paid beta completion.
- **DM-DEARME-CI-NODE24-ACTIONS** — DearMe CI now opts GitHub JavaScript actions into the Node 24 action runtime while keeping the app test runtime on Node 22, hardening the deployment gate ahead of GitHub's Node 20 action-runtime cutoff.
- **DM-GOAL-AUDIT-FULL-OWNER-PROOF-FACTS** — `pnpm dearme:goal-audit -- --check` now prints the full public-launch owner-proof fact queue while keeping the immediate OpenClaw message proof next action specific.
- **DM-GOAL-AUDIT-HOSTED-CHECKOUT-BLOCKERS** — `pnpm dearme:goal-audit -- --check` and `pnpm dearme:standing-loop-audit -- --check` now surface the hosted-checkout payment setup blockers for the first-$29 path alongside the public-launch proof facts, while keeping private-beta manual receipt sales marked operable.
- **DM-STATUS-HOSTED-CHECKOUT-BLOCKERS** — `pnpm dearme:status` now prints the hosted-checkout payment setup blockers next to commercial readiness, so the default operator view names the first-payment facts still needed before self-serve checkout can be claimed.
- **DM-STATUS-CHECKOUT-SECRET-REDACTION** — `pnpm dearme:status` now marks hosted-checkout receipt/webhook-secret blockers as sensitive while keeping first-payment setup facts visible in the default operator view.
- **DM-PAYMENT-READINESS-SECRET-REDACTION** — `pnpm dearme:payment-readiness` now marks hosted-checkout receipt/webhook-secret blockers as sensitive in operator output and Peter-facing support markdown.
- **DM-PAYMENT-READINESS-PLACEHOLDER-GUARD** — `pnpm dearme:payment-readiness` now fails hosted checkout closed when the payment link or receipt/webhook secret is still an obvious setup placeholder, without printing placeholder values.
- **DM-HUMAN-HELP-PAYMENT-SECRET-REDACTION** — `docs/NEEDS_HUMAN_HELP.md` now marks hosted-checkout receipt/webhook-secret blockers as sensitive, and the payment-readiness drift test keeps the Peter-facing queue aligned.
- **DM-HUMAN-HELP-PAYMENT-PLACEHOLDER-GUARD** — `docs/NEEDS_HUMAN_HELP.md` and generated payment-readiness support markdown now state placeholder setup values keep hosted checkout blocked and are not printed.
- **DM-PAYMENT-READINESS-29-OFFER-HANDOFF** — `pnpm dearme:payment-readiness` and `docs/NEEDS_HUMAN_HELP.md` now explicitly ask for the live $29/month DearMe hosted checkout link before self-serve checkout can be claimed.
- **DM-NEXT-PROOF-HUMAN-HELP-LIVE-LANES** — `pnpm dearme:next-proof -- --human-help-markdown` now regenerates the owner-proof queue with exact external proof env names, no-send-first wording, and separate guarded live commands for professional-network and OpenClaw message proof.
- **DM-OWNER-PROOF-FACT-LABELS** — `pnpm dearme:status` and shared owner-proof checklist text now use the same exact professional-network endpoint, professional-network smoke recipient, and iMessage/SMS smoke recipient labels as the Peter-facing live-proof handoff.
- **DM-DAILY-PLAIN-SUMMARY** — `pnpm dearme:daily-plain-summary` now builds the required daily Codex Plain update from the run ledger and standing-loop audit, posts it only when Plain credentials plus the Peter recipient email are configured, and skips without live network otherwise.
- **DM-DAILY-PLAIN-SUMMARY-LOCAL-DAY** — `pnpm dearme:daily-plain-summary` now defaults to the DearMe operating day instead of the UTC date, so evening ledger entries are included in the daily Plain update.
- **DM-DAILY-SUMMARY-HANDOFF-LOCAL-DAY** — `CODEX-HANDOFF-TOKEN.md` now tells operators to use the DearMe operating day for daily Plain summaries, matching the shipped summary command.
- **DM-DAILY-SUMMARY-HUMAN-HELP** — `pnpm dearme:daily-plain-summary -- --human-help-markdown` now regenerates the Peter-facing Plain daily-summary configuration request, and `docs/NEEDS_HUMAN_HELP.md` records the missing Plain API key plus recipient email.
- **DM-STANDING-LOOP-DAILY-PLAIN-FACTS** — `pnpm dearme:standing-loop-audit -- --check` now surfaces missing Plain daily-summary configuration alongside owner-proof and first-payment facts.
- **DM-DAILY-SUMMARY-PLAIN-FACTS** — `pnpm dearme:daily-plain-summary` now includes missing Plain delivery configuration in the generated daily body alongside owner-proof and first-payment facts.
- **DM-DAILY-SUMMARY-HUMAN-HELP-QUEUE** — `pnpm dearme:daily-plain-summary` now points blocker sections at `docs/NEEDS_HUMAN_HELP.md`, where Peter has reply templates and safe follow-up commands for owner-proof, checkout, and Plain-delivery facts.
- **DM-HUMAN-HELP-BLOCKER-FRESHNESS** — `docs/NEEDS_HUMAN_HELP.md` now carries the 2026-05-17 verified blocker state for external proof and hosted checkout: private beta remains sellable, public proof waits on three owner-approved facts, and self-serve checkout waits on the live $29/month payment link plus receipt/webhook secret.
- **DM-NEXT-PROOF-MISSING-RECEIPT-PREVIEW** — `pnpm dearme:next-proof -- --no-write --handoff-receipt-file <launch-proof-handoff-receipt.txt>` now previews the current owner-proof gaps even before the receipt file exists, while import mode still fails closed until the receipt is present.
- **DM-NEXT-PROOF-ALL-LIVE-LANE-GUARD** — `pnpm dearme:next-proof -- --target all` now prints target-specific guarded live commands for the public proof lanes instead of a broad `--target all --live` command that could mix owner-proof work with unrelated live lanes.
- **DM-NEXT-PROOF-BLOCKED-LIVE-COMMAND-GATE** — `pnpm dearme:next-proof` now keeps blocked live commands out of the immediate next-command list and labels them as available only after blocked facts are captured and the no-send check passes.
- **DM-NEXT-PROOF-OWNER-FACTS-LIVE-COMMAND-LABEL** — `pnpm dearme:next-proof` now uses owner-facts wording for blocked guarded live command sections, matching the proof/status/goal-audit guard language.
- **DM-STATUS-LIVE-COMMAND-GUARD** — `pnpm dearme:status` now labels live provider commands as guarded and marks blocked live commands as available only after blockers clear and the no-send check passes.
- **DM-STATUS-LIVE-CONFIRMATION-GUARD** — `pnpm dearme:status` now labels guarded live provider commands as available only after owner facts if needed, the no-send check passes, and explicit live confirmation is set, including the spend-bearing Meta campaign lane.
- **DM-STATUS-HUMAN-HELP-QUEUE** — `pnpm dearme:status` now points owner-proof and hosted-checkout blocker sections at `docs/NEEDS_HUMAN_HELP.md`, where Peter has reply templates and safe follow-up commands.
- **DM-RELEASE-GATE-LIVE-COMMAND-GUARD** — `pnpm dearme:release-gate` now labels guarded live proof commands as available only after required facts are present and the no-send check passes.
- **DM-RELEASE-GATE-OWNER-FACTS-LIVE-LABEL** — `pnpm dearme:release-gate` now uses owner-facts wording for blocked guarded live proof sections, matching the proof/status/goal-audit guard language.
- **DM-RELEASE-GATE-LIVE-CONFIRMATION-GUARD** — `pnpm dearme:release-gate` now labels guarded live proof handoff commands as available only after owner facts when needed, the no-send check passes, and explicit live confirmation is set.
- **DM-GOAL-AUDIT-LIVE-COMMAND-GUARD** — `pnpm dearme:goal-audit` now labels guarded live proof commands as available only after owner facts are present and the no-send check passes.
- **DM-GOAL-AUDIT-LIVE-CONFIRMATION-GUARD** — `pnpm dearme:goal-audit` now labels guarded live proof commands as available only after owner facts when needed, the no-send check passes, and explicit live confirmation is set.
- **DM-GOAL-AUDIT-HUMAN-HELP-QUEUE** — `pnpm dearme:goal-audit` now points owner-proof and hosted-checkout blocker sections at `docs/NEEDS_HUMAN_HELP.md`, where Peter has reply templates and safe follow-up commands.
- **DM-PRICING-PAGE-V2** — `/pricing` now turns the $29 beta offer into a paid-conversion page with a three-day trial CTA, product-preview link, email waitlist capture that fires `pricing_waitlist_joined`, and five objection-handling FAQ items without starting checkout before the invite gate clears.
- **DM-FAQ-FROM-OBJECTIONS** — `/faq` now handles the highest-risk beta objections in customer language: $29 fit, first-three-day value, approval-only sending, LinkedIn safety, voice drift, messy proof, data sharing, export, cancellation, and unacceptable use.
- **DM-ABOUT-FOUNDER** — `/about` now gives the founder story a sharper customer-zero trust frame: Peter is dogfooding public proof, writing cadence, and opportunity follow-up, with explicit boundaries against bulk outreach, hands-off posting, invented authority, and unreviewed public claims.
- **DM-ANALYTICS-FUNNEL** — `docs/dearme/ops/posthog-funnel.json` now defines the PostHog landing-to-payment dashboard with ordered funnel events, per-step conversion targets, a 200-visitor readout rule, and no-network validation coverage.
- **DM-REFERRAL-UI** — `/dearme/refer` now aligns the referral code, share surface, first-month discount copy, and copyable invite-email template around a 30% first-month offer for stronger paid-user referral activation.
- **DM-AB-LANDING-HERO** — `/landing` now runs the corrected three-way hero experiment: control, before/after proof framing, and weekly-letter-sample framing, with a PostHog experiment config that waits for 200 visitors per variant before auto-promoting a winner.
- **DM-EXIT-INTENT-WAITLIST** — `/landing` now opens a dismissible exit-intent preview request, validates work email before posting to a lifecycle endpoint, and tracks the exit funnel without storing email in analytics.
- **DM-IMPORT-EXISTING-VOICE** — `/dearme` first-cycle Voice & Memory can import an existing public writing/profile URL into a real private voice sample through a no-live-network-tested fetch/extract service, reducing signup stalls when the user has no pasted sample ready.
- **DM-FIRST-CYCLE-PAID-ASK** — `/dearme` now connects a generated first-cycle proof preview directly to the paid beta close kit, giving trial users a clear first-$29 ask once their proof pack is ready while keeping paid access receipt-gated.
- **DM-PAID-FUNNEL-EVENTS** — `/dearme` now records first-cycle completion, first-cycle paid-ask opens, and hosted-checkout starts so the first-cycle-to-$29 path is measurable without calling live payment systems in tests.
- **DM-CHURN-SAVE-EMAIL** — paid subscription cancellations now record the access cancellation and trigger a `dearme_churn_save` lifecycle event with non-PII churn metadata, giving the paid-to-renewal path a tested save-email hook.
- **DM-MANUAL-PAYMENT-LIFECYCLE** — manual private-beta payment recording can capture a receipt email and emit the same `dearme_first_payment` lifecycle event as hosted checkout without logging customer email, closing the manual first-$29 follow-up gap while self-serve checkout waits on owner setup.
- **DM-RENEWAL-PAYMENT-LIFECYCLE** — hosted renewal receipts now emit a tested `dearme_renewal_payment` lifecycle event only when a new renewal payment is recorded, while duplicate hosted checkout receipts no longer send duplicate first-payment follow-ups.
- **DM-CHECKOUT-RETURN-PAGES** — hosted checkout success and cancel URLs now land on customer-safe DearMe pages with paid-access, close-kit, and pricing CTAs instead of falling through to the generic app route after payment.
- **DM-CHECKOUT-RETURN-CONTEXT** — hosted checkout sessions now append a success `session_id` marker and cancel-state marker to return URLs, preserving existing query strings and fragments so support can reconcile first-payment returns without customer data in logs.
- **DM-CHECKOUT-RETURN-ANALYTICS** — checkout success and cancel return pages now fire a safe `checkout_return_viewed` event with only return status and marker booleans, so first-payment return behavior is measurable without sending receipt identifiers to analytics.
- **DM-CHECKOUT-RETURN-WORKROOM-HANDOFF** — checkout return CTAs now carry a safe success/cancel marker back to paid beta access, where the workroom explains receipt matching or preserves the close kit without exposing receipt identifiers.
- **DM-PRICING-TRIAL-START-ANALYTICS** — pricing-page trial CTAs now carry a safe pricing signup source into `/dearme` and fire `pricing_trial_started` with only CTA source and plan, making pricing-to-signup intent measurable before hosted payment is unblocked.
- **DM-SIGNUP-SOURCE-ENTRY-ANALYTICS** — `/dearme` now records a safe `signup_entry_viewed` event when pricing sends trial traffic into the workroom, so pricing-to-signup attribution survives the route handoff without customer identifiers.
- **DM-LANDING-SIGNUP-ENTRY-ANALYTICS** — `/dearme` now records safe landing-sourced signup entry analytics when a landing answer reaches the workroom, preserving landing-to-signup attribution without sending the answer text to analytics.
- **DM-LANDING-INVITE-MAILTO-PREFILL** — landing-sourced first-cycle handoff now pre-fills the private beta invite email with the visitor's direction, reducing signup friction without adding analytics payloads.
- **DM-PRICING-WAITLIST-LIFECYCLE** — `/pricing` waitlist submissions now post to a DearMe lifecycle-backed endpoint before showing success, so beta-seat intent can reach the signup lifecycle while keeping email out of analytics.
- **DM-PROFILE-INVITE-LIFECYCLE** — `/dearme` no-profile first-cycle bridge now captures private beta invite emails through a lifecycle-backed endpoint before showing success, preserving landing/direct source metadata without sending the landing answer to analytics.
- **DM-PRICING-WAITLIST-TRIAL-CTA** — successful `/pricing` waitlist capture now reveals a direct trial-preview CTA back into `/dearme?signup_source=pricing`, so captured beta-seat intent can continue into the first-cycle path immediately.
- **DM-LANDING-BRIEF-DRAFT-PERSIST** — landing-sourced first-cycle briefs now survive queryless `/dearme` navigation in session storage, so profile creation can still restore the first-cycle prompt and landing attribution without sending the brief to analytics.
- **DM-FIRST-CYCLE-SOURCE-ANALYTICS** — first-cycle preview/completion analytics now include only the safe signup source, preserving pricing/landing attribution through the first-cycle milestone without customer identifiers or brief text.
- **DM-PAID-ASK-SOURCE-ANALYTICS** — opening the paid-beta close kit from a first-cycle preview now records only checkout readiness and signup source, tying first-cycle-to-paid intent back to pricing/landing without customer data.
- **DM-CHECKOUT-START-SOURCE-ANALYTICS** — hosted checkout-start analytics now carry only the safe signup source alongside checkout readiness, preserving paid-conversion attribution without customer identifiers.
- **DM-CHECKOUT-RETURN-SOURCE-ANALYTICS** — checkout return analytics now accept only allowlisted return sources, preserving paid-return attribution while dropping arbitrary query text.
- **DM-CHECKOUT-SESSION-RETURN-SOURCE** — server-created hosted checkout sessions now stamp success and cancel return URLs with the paid source marker, connecting checkout starts to safe paid-return attribution without adding customer data.
- **DM-CHECKOUT-RETURN-WORKROOM-SOURCE** — checkout return CTAs now carry the allowlisted return source back into the workroom, where the return event is recorded without arbitrary query text or customer identifiers.
- **DM-CHECKOUT-PREFILL-EMAIL** — hosted checkout links now use the receipt email field to prefill checkout when valid, improving payment-to-receipt matching without sending the email to analytics.
- **DM-FIRST-CYCLE-CHECKOUT-HANDOFF** — first-cycle proof previews now show a direct hosted-checkout action when checkout is configured, reducing first-cycle-to-payment friction while keeping close-kit fallback and safe checkout-start analytics.
- **DM-CHECKOUT-RETURN-REFRESH-ACCESS** — checkout returns now include an in-panel refresh action so customers can re-check paid access after receipt sync without leaving the first-cycle workroom.
- **DM-CHECKOUT-CANCEL-RETRY** — cancelled checkout returns now show a direct checkout retry action when hosted checkout is configured, while successful returns keep the access-refresh path.
- **DM-CHECKOUT-SUCCESS-AUTO-REFRESH** — successful checkout returns now automatically re-check paid access once before leaving manual refresh as a fallback.
- **DM-CHECKOUT-SUCCESS-START-CYCLE** — successful checkout returns now move confirmed paid users straight into the first-cycle start path after paid access opens, instead of keeping them on receipt refresh.
- **DM-CHECKOUT-RETURN-ACCESS-OPENED-ANALYTICS** — successful checkout returns now record a safe paid-access-opened event once access is active, so receipt-to-first-cycle conversion is measurable without customer identifiers.
- **DM-FIRST-CYCLE-CHECKOUT-RETURN-SOURCE** — paid first-cycle analytics now preserve the allowlisted checkout return source when no signup source is present, keeping the receipt-to-work attribution path intact.
- **DM-CHECKOUT-RETURN-FIRST-CYCLE-CTA-ANALYTICS** — confirmed-paid checkout returns now record a safe first-cycle CTA click before focusing the work prompt, adding the missing handoff step between receipt open and first work started.
- **DM-MANUAL-PAYMENT-UI-ANALYTICS** — manual private-beta payment recording now emits a safe UI analytics event when paid access opens, preserving fallback first-$29 attribution without amount, receipt, or email payloads.
- **DM-PAID-RECEIPT-FIRST-CYCLE-ANALYTICS** — paid receipt CTAs now record a safe first-cycle click before focusing the work prompt, preserving paid-to-work attribution without amount, receipt, or email payloads.
- **DM-CHECKOUT-RETURN-REFRESH-ANALYTICS** — checkout return receipt-refresh clicks now record a safe retry event, making receipt-sync friction measurable without session, receipt, or email payloads.
- **DM-CHECKOUT-RETURN-AUTO-REFRESH-ANALYTICS** — successful checkout returns now record the automatic access-refresh attempt separately from manual retries, preserving receipt-sync attribution without session or customer payloads.
- **DM-FIRST-CYCLE-SUBMIT-ANALYTICS** — first-cycle form submits now record a safe attempt event before preview/work starts, making failed first-cycle starts measurable without known-for text or customer identifiers.
- **DM-FIRST-CYCLE-BLOCKED-SUBMIT-ANALYTICS** — first-cycle submits blocked by a missing known-for sentence now emit a safe validation event, making signup-to-first-cycle form friction measurable without sending the missing answer.
- **DM-FIRST-CYCLE-WORK-READY-ANALYTICS** — first-cycle start receipts now record a safe Work Ready open event, making started-work-to-review conversion measurable without proof text or customer identifiers.
- **DM-FIRST-CYCLE-PROOF-OPEN-ANALYTICS** — generated first-cycle proof page opens now record safe attribution, making proof-review conversion measurable without proof text or customer identifiers.
- **DM-FIRST-CYCLE-RECEIPT-DOWNLOAD-ANALYTICS** — first-cycle receipt downloads now record safe attribution, making offline paid-ask handoffs measurable without receipt text or customer identifiers.
- **DM-PAID-CLOSE-KIT-RECEIPT-CHECKOUT** — paid beta close-kit receipt downloads now include configured hosted checkout handoff and safe download attribution, making offline first-payment asks measurable without receipt text, checkout URL analytics, or customer identifiers.
- **DM-PRICING-WAITLIST-FRICTION-ANALYTICS** — pricing waitlist validation and delivery failures now record safe friction events, making pricing-to-trial signup loss measurable without email or customer identifiers.
- **DM-LANDING-FRICTION-ANALYTICS** — landing empty-start and exit waitlist failure states now record safe friction events, making landing-to-signup loss measurable without positioning text, email, or customer identifiers.
- **DM-PRICING-ACCESS-MAILTO-ANALYTICS** — pricing-page manual beta access requests now record a safe intent event, making invite-only first-payment handoffs measurable without email, mailto URLs, or customer identifiers.
- **DM-STATIC-INVITE-MAILTO-ANALYTICS** — landing, about, FAQ, and proof invite mailto clicks now record safe intent events, making non-pricing invite handoffs measurable without email, mailto URLs, or customer identifiers.
- **DM-PROOF-LIVE-COMMAND-GUARD** — `pnpm dearme:proof` now labels guarded live proof commands as available only after owner facts are present and the no-send check passes.
- **DM-PROOF-FOCUS-LIVE-COMMAND-GUARD** — `pnpm dearme:proof` now uses the same owner-facts-plus-no-send wording for live-focus commands and setup commands.
- **DM-PROOF-LIVE-CONFIRMATION-CHECKLIST** — `pnpm dearme:proof` now labels owner-proof checklist live commands as available only after owner facts when needed, the no-send check passes, and explicit live confirmation is set.
- **DM-PROOF-OLD-LIVE-LABEL-REGRESSION** — `pnpm test:dearme-proof` now keeps the old no-send-only live label regression without preserving the stale label in scan-visible test text.
- **DM-NEXT-PROOF-HUMAN-HELP-LIVE-COMMAND-GUARD** — `pnpm dearme:next-proof -- --human-help-markdown` now labels guarded live proof commands as available only after owner facts are present, the no-send check passes, and explicit live confirmation is set.
- **DM-NEXT-PROOF-LIVE-CONFIRMATION-LABELS** — `pnpm dearme:next-proof` now labels immediate guarded live command sections as available only after owner facts when needed, the no-send check passes, and explicit live confirmation is set.
- **Documentation lock** — `PRODUCT-ARCHITECTURE.md`, `TRI-SUBSTRATE-ARCHITECTURE.md` (the integration contract), `OPENCLAW-INTEGRATION-ARCHITECTURE.md`, `POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md`, `REUSE-IMPLEMENTATION-LEDGER.md`, this `INDEX.md`.

### Next ticket (start here)

**Coordinator next step — run new DearMe work only through Symphony/Linear.**

The stale local worktree queue is closed by exact-head reviewed absorptions.
Future collaboration should start from a Linear `DEA` issue and a Symphony
workspace on the current coordinator head, then land only one bounded
customer-facing slice at a time. The current product comparison against Polsia
and Naive is locked in `POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md`: DearMe is
strong on the Naive/Paperclip control-plane layer, weaker on Polsia's first
five-minute customer wow, and should prioritize a private first-wow loop plus a
customer-safe live work stream before adding another settings or runtime
surface. DM-172, Resend + SES DM-174,
partner-dispatch + endpoint-config half of DM-176, the preview + configured
production/custom-domain gate half of DM-177, and the Meta dispatcher + Graph-base-url
config half of DM-178 are now on the canonical `ChannelDispatch` path. The
next product-dispatch gap is live credential/provider smoke: Telegram or
iMessage through the configured OpenClaw gateway, SES or Resend email,
LinkedIn partner endpoint + credential, Meta OAuth/Marketing API, or the
remaining DM-177 live DNS/host deploy smoke. It is not another
connector/settings surface.
The internal `pnpm dearme:aha-proof -- --check` command is the first-wow proof
gate. It reuses the shared first-cycle preview contract and customer-language
guard to prove the local private 0-30s / 60-120s / 3-5min DearMe activation
loop, five private starter drafts, and the next private pass without sends,
public deploys, spend, or live model calls. Use it before claiming
Polsia-style first-five-minute readiness; the browser now shows that same loop
as a customer-watchable first-five-minute progress stream and recurring
private-work plan. The sample private-site proof is now served from the
GitHub Pages host
`https://wukongai-cmu.github.io/dearme-private-proof/peter-studio`; the
remaining product gap is backing that phone-reachable proof with live provider
execution. Use
`pnpm dearme:aha-proof -- --export-site dist/dearme-private-proof` to produce
the host-smoke artifact and handle-local `host-smoke.json`; do not create a
second demo packet or route.
The internal `pnpm dearme:status` command is the compact product/coordinator
answer for "can DearMe prove itself now?": first-wow aha proof, local no-send
proof, integration absorption proof, voice semantic/review-loop proof, and live provider
proof are separated so the coordinator does not have to read raw provider setup
or manual worktree triage every time. It reuses the same `dearme:aha-proof`
report plus the compact `dearme:worktrees -- --summary-json --skip-dirty
--handoffs` audit, so recurring private work and branch/Symphony absorption are
part of the main product verdict instead of living in side proofs. `pnpm dearme:aha-proof -- --export-site`
also writes the same proof as a phone-ready static private site artifact plus a
host-smoke manifest before real host smoke is available. When live provider
proof is blocked, the same status/setup output now prints that export command
before the provider smoke check so the phone-ready packet is not a hidden
coordinator step. The underlying
`pnpm dearme:proof -- --check` command is still the first detailed local proof
entrypoint for coordinators and Symphony workers. It composes the existing
provider and voice smoke lanes, prints one ignored `.dearme-proof.env`
bootstrap, and offers `pnpm dearme:proof -- --run-safe` for the no-send,
no-production-deploy, no-spend, no-live-model proof path.
`pnpm dearme:status` and `pnpm dearme:proof` automatically read
`.dearme-proof.env` when it exists, while explicit `--env-file` values still
win for temporary credential files. `pnpm dearme:next-proof` may create the
file or append only missing blank setup keys for the selected target, so
`env status: augmented` is a successful no-send setup step and not a signal to
overwrite local proof values. Drop to
`pnpm dearme:provider-smoke -- --check` for live provider credential work or
`pnpm dearme:voice-smoke -- --check` for scorer-specific calibration and review-loop work; do
not add another setup dashboard or dispatch path. Symphony worker bootstrap
also runs this command before worktree/handoff triage, so assigned DEA issues
should treat the proof readiness output as current evidence instead of
rebuilding provider or voice setup discovery.
The internal `pnpm dearme:goal-audit -- --check` command is the stronger
completion gate for the long-running product objective. It reuses the same
status/worktree evidence, runs `pnpm dearme:host-rehearsal` as a no-secret
loopback proof of the exported private-site packet, runs
`pnpm dearme:host-provider-audit` to check whether this machine has a deploy
provider login/token or an equivalent public HTTPS DearMe host, runs
`pnpm dearme:openclaw-message-rehearsal` to prove the shared Telegram/iMessage
gateway contract locally, and still blocks completion until live provider proof
is real. The production host leg is satisfied for the current sample packet by
GitHub Pages; custom-domain hosting remains a later host/provider concern.
Its JSON and text output also includes `promptToArtifactChecklist`, which maps
the original product/architecture prompt to concrete artifacts: reuse, worktree
absorption, Symphony coordination, architecture spine, first wow, autonomy, and
live provider truth. Use that checklist before marking the broad product goal
complete; local proxy proof or donor-substrate reuse alone does not satisfy the
Polsia-style live proof requirement.
Use it before marking the active coordinator goal complete; do not treat
loopback host proof as a substitute for a phone-reachable public HTTPS
`deploy_site_production` smoke, or the OpenClaw message rehearsal as a
substitute for a live `openclaw_messages` smoke.
Use `pnpm dearme:release-gate` when the question is release posture rather
than broad goal completion. The default `public-launch` target fails until the
full goal audit is complete. `pnpm dearme:release-gate -- --check --target
private-proof` answers the narrower "can a design partner use the private
proof?" question and can pass without live sends, public posting, paid spend, or
external campaign credentials. Keep that split explicit in Symphony updates:
private/internal proof ready is not a public launch claim.
Its JSON also carries `productComparison`, which is the current internal answer
to "where are we versus Polsia, Naive/Paperclip, and OpenClaw?": DearMe has
matched the Naive/Paperclip reuse layer, reached a private Polsia-style wow,
proved the OpenClaw message contract locally, and remains partial until live
external channel proof is supplied and verified.
Its JSON also carries `operatorHandoff`, which mirrors the owner-facing proof
handoff: approved facts to capture, the no-send check, guarded live commands,
and the live-confirmation safety boundary.
When the remaining blocker is `openclaw_messages`, `dearme:goal-audit` now
shows no-send setup first: run
`pnpm dearme:next-proof -- --target openclaw_messages`, then the targeted
`--check`, and only then use the guarded live command after the explicit
recipient/provider facts exist. If the proof env already exists, the setup
command appends the missing iMessage key instead of replacing current
OpenClaw/host proof values.
The internal `pnpm dearme:provider-smoke -- --check` command now owns that
operator proof checklist, including the OpenClaw gateway URL/token/auth plus
Telegram recipient/body and iMessage recipient proof requirements, and the
production site URL content smoke once host env is enabled. When
`DEARME_USE_LOCAL_OPENCLAW_CONFIG=1` is present in the ignored
`.dearme-proof.env`, the OpenClaw gateway URL/token/auth come from the existing
host-local config rather than another DearMe secret file; blank setup-template
keys are treated as missing, so they do not override that local fallback. The
production host lane requires the exported private proof artifact before it will run, and it now
reads the exported `host-smoke.json` manifest for expected text and validates
the local manifest, HTML, and proof JSON checksums before dispatch/fetch. A manual
`DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT` override remains a fallback for the host
page text, not a bypass for a configured manifest. The
next live step is real channel/provider delivery rather than another local
dispatch receipt. It now supports a local ignored
`.dearme-provider-smoke.env` file through `--env-file` plus a clean
`--print-env-template` bootstrap, and production host failures now report the
exact URL plus fetch/HTTP status evidence. It also supports targeted templates
and the `openclaw` / `openclaw_messages` group for the shared Telegram+iMessage
gateway smoke. Real credentials and custom-domain host smoke should enter the
proof lane there instead of through a new UI, connector store, or command-history
paste. Do not replace it with another settings page or dispatch path.
For DM-170, the route and deterministic scorer now also have the durable
profile-store boundary, DB backing store, persisted `dm_sk_*` key auth, and a
semantic scorer seam wired through a profile-token calibration scorer; the
remaining voice gap is real model/embedding calibration and live scoring smoke,
not another
`/v1/voice/score` route, voice-memory service, key store, or review surface.
The internal `pnpm dearme:voice-smoke -- --check` command now owns the local
voice proof lane: deterministic gate readiness plus opt-in
`DEARME_VOICE_SEMANTIC_SCORER=profile-token` match/drift proof. It can require
a customer-like local corpus with
`DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS=1`, custom seed texts, match text,
and drift text; successful runs print profile sample/token evidence plus
`corpus=custom`. The coordinator Mac keeps that non-secret scorer setup in the
ignored `.dearme-proof.env`, so `pnpm dearme:status` now reports local
no-send proof and voice semantic proof ready while live provider proof remains
blocked. This is not a live model smoke and should be replaced or wrapped by
the real embedding scorer behind the same seam when that provider is ready.
Reuse still means adapting Polsia choreography, Lindy action-card/source
patterns, and Naive/Paperclip substrate behind the DearMe product shell; do
not add another first-run contract, packet schema, runtime dashboard, queue
system, or customer-visible substrate surface.

### Roadmap (compressed by aggressive port + tri-substrate integration)

| Sprint | Window | Deliverable | Tickets |
|--------|--------|-------------|---------|
| 0 | done | Foundation, registry, contracts, OpenClaw plugin, tri-substrate integration **+ runtime** | DM-S01, DM-141 schema, registry, ai-proxy contract, **DM-S05**, **DM-S06** (contracts), **DM-S07** (runtime: 6 server services + lynchpin wrapper) |
| 1 | days 1–7 | First-run aha moment live through OpenClaw + Chief routes first conversation | DM-138, DM-139, **DM-170-live** voice-score model calibration on the shipped route/store/auth/scorer/profile-token seam, **DM-171A** plugin install proof complete, **DM-171B** onboarding bridge already surfaced in the existing first-run path, **DM-179** SSE Express route over `dearme-sse-bus` |
| 2 | days 8–14 | Voice + content loop publishing via DearMe-owned tools | DM-140, DM-142, DM-146, **DM-172** `post_x` `ChannelDispatch`, **DM-173A/DM-173B** X OAuth start + PKCE callback exchange around `channel_connections`, **DM-180** approval resolver Express route |
| 3 | days 15–21 | Outbound + opportunity + audience care running | DM-141 runtime, DM-149, DM-150, **DM-174** `send_email` `ChannelDispatch` (Resend shipped; SES future dynamic-channel route), **DM-176A/DM-176B** `send_linkedin_dm` partner `ChannelDispatch` + endpoint config gate shipped; live partner smoke still needed |
| 4 | days 22–35 | Site live + ads option + first paid beta | DM-147, DM-148, DM-153, DM-154, **DM-177B/DM-177C** preview + configured production `deploy_site` `ChannelDispatch` shipped, **DM-178/DM-178B** `create_meta_campaign` `ChannelDispatch` + Graph config gate shipped; remaining **DM-177** live host/custom-domain smoke plus live LinkedIn/Meta credential smoke |

Total to first paid-beta surface: **~4–5 weeks** vs. the original 8–12 with paraphrased re-derivation. OpenClaw integration removes ~27 eng-weeks of substrate work and ~$15K of Gmail CASA cost (see `OPENCLAW-INTEGRATION-ARCHITECTURE.md` §5).

---

## 6. Where to read more (canonical only)

The four docs below are the only ones that affect runtime decisions. Everything else in this folder is research / history / packaging.

| Doc | Use |
|-----|-----|
| **`INDEX.md`** (this) | The 5-minute orientation. |
| **`TRI-SUBSTRATE-ARCHITECTURE.md`** | Integration contract: OpenClaw + Naive + Polsia. Layer ownership, work loop, event stream, approval gates, voice gate, per-role map. |
| **`OPENCLAW-INTEGRATION-ARCHITECTURE.md`** | The runtime contract for OpenClaw specifically: how DearMe becomes an OpenClaw plugin. |
| **`PRODUCT-ARCHITECTURE.md`** | Surface, packages, doctrine, sprint timing. |
| **`POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md`** | Current product maturity and first-wow gap against Polsia and Naive. |
| **`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`** | Ticket-level work breakdown. |
| **`REUSE-IMPLEMENTATION-LEDGER.md`** | What is actually built and verified. |

Plus governance:

- **`REBRAND-AND-PROVENANCE.md`** — what's safe to port, what isn't.
- **`AUTOMATION-RELIABILITY-COST-POLICY.md`** — current cost, approval, retry,
  and stoppability boundary for autonomous work.
- **`CLAWDBOB-ABSORPTION-PLAN.md`** — bounded code-lift plan from the sibling
  clawdbob product into DearMe (`dm-cb-*` tickets). dm-cb-01 (OpenClaw
  lockdown moat), dm-cb-02 (voice MCP), dm-cb-03 (runtime-files MCP) all
  shipped 2026-05-14.
- **`LITTLEBIRD-COMPETITOR-AUDIT.md`** — read-only competitor calibration;
  records why no code absorption is possible/appropriate and what UX
  patterns DearMe already covers.
- **`SCALE-LAUNCH-AND-REVENUE-ARCHITECTURE.md`** — canonical capability
  matrix mapping every scale/revenue need to *reuse (donor or third-party)*
  or *bounded build*. ~15 net-new `dm-*` tickets, mostly thin R2 wrappers.
- **`ENGINEER-GOAL-FIRST-PAID-CUSTOMER.md`** — handoff Goal for the
  engineer who takes DearMe from "code in tree" to "first $29 paid". 14
  days, 5 verifiable DoD items, explicit non-goals, owner unblockers.
- **`DEPLOY-RUNBOOK.md`** — one-shot Vercel deploy path, DNS records,
  Day-1-to-6 step-by-step, rollback, common failure modes.
- **`PROVIDER-INTEGRATION-NOTES.md`** — per-provider signup URL, free
  tier, gotcha, env var, code location, cost projection.
- **`PRE-LAUNCH-CHECKLIST.md`** — operational tick-list of every infra +
  Stripe + channels + customer-surface + compliance item before the
  first outreach DM.
- **`OUTREACH-TEMPLATES.md`** — 5 outreach templates (LinkedIn DM,
  email, X, warm reply, cold-fit) plus what NOT to send and the post-
  signup follow-up template.
- **`.env.production.example`** (repo root) — every env var DearMe
  needs in prod with where-to-get URLs. Validate with
  `pnpm dearme:prod-ready`.

### Reference / research (read on demand, not by default)

`POLSIA-DEEP-STUDY-2026-05-12.md`, `POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`, `POLSIA-NAIVE-PM-ANALYSIS.md`, `POLSIA-NAIVE-COMPARISON.md`, `POLSIA-NAIVE-REUSE-PLAN.md`, `POLSIA-MARKETING-PACKAGING-GUIDE.md`, `LINDY-ASSISTANT-REUSE-PLAN.md`, `ACTION-GRAPH-ARCHITECTURE.md`, `INTEGRATED-ARCHITECTURE.md`, `AGENCY-AGENTS-REFERENCE.md`, `BUILD-STATE.md`, `BASELINE-SPINE-MANIFEST.md`, `CODE-PROVENANCE-FACT-CHECK.md`, `2026-05-09-WRAP-UP-RETROSPECTIVE.md`.

### Superseded (do not follow as guidance)

Banner-marked at the top of each file:

`BACKLOG.md`, `BACKLOG-PART-2.md`, `COMPARISON-FINAL.md`, `POLSIA-VS-DEARME.md`, `POLSIA-VS-DEARME-PART-2.md`, `V3-ARCHITECTURE.md`, `V3-ARCHITECTURE-PART-2.md`, `V3-ARCHITECTURE-PART-3.md`, `V4-ARCHITECTURE.md`, `V4-ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-3.md`, `PRODUCT-SPEC.md`, `PRODUCT-SPEC-PART-2.md`, `PRODUCT-SPEC-PART-3.md`, `PRODUCT-SPEC-V3-ADDENDUM.md`, `PAPERCLIP-EVALUATION.md`, `WEB-UI-REUSE-ARCHITECTURE.md`, `WORKTREE-INTEGRATION-PLAN.md`.

These contain useful history but pre-date the runtime-port doctrine. Treat them as archives.

---

## 7. Repo entry points (for new contributors)

```bash
pnpm install
pnpm dev                                                      # API + UI
pnpm --filter @paperclipai/dearme-agent-prompts test          # 25 — registry + state machines (work-loop, approvals, sse, opportunity, etc)
pnpm --filter @paperclipai/dearme-ai-proxy test               # 10 — wire contract + voice-gate
pnpm --filter @paperclipai/dearme-openclaw test               # 19 — skill generator + bootstrap + outbound tool contract
pnpm --filter @paperclipai/dearme-openclaw run generate-skills  # regenerate 12 SKILL.md from registry
pnpm --filter @paperclipai/db typecheck                       # Drizzle schema (incl. channel_connections + opportunities)
```

To add a role: add it to `DEARME_ROLE_REGISTRY`, regenerate skills (`pnpm --filter @paperclipai/dearme-openclaw run generate-skills`), and either implement its outbound tools in `dearme-openclaw` (if user-device) or its server worker (if cloud-side).

To add a state machine: drop it in `packages/plugins/dearme-agent-prompts/src/state-machines/`, export it, reference it from the registry's `stateMachines` field.

To change a prompt: don't, except for mechanical brand substitution. Open a ticket if real divergence is needed; runtime-port doctrine governs. After any prompt edit, regenerate skills and review the diff under `packages/plugins/dearme-openclaw/generated/`.
