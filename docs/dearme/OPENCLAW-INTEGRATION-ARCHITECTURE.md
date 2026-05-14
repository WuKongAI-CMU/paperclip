# OpenClaw Integration Architecture

> **STATUS: P1+ design, dormant in P0 paid beta (2026-05-14).** OpenClaw runtime is deferred to P1 per [`P0-SCOPE-CUT-2026-05-13.md`](P0-SCOPE-CUT-2026-05-13.md). The contract below remains canonical for the deferred wire-up — code stays in tree, tests stay green, no runtime calls into it during P0. Read this for the target state; read the scope-cut for what P0 actually wires.
>
> **Canonical, runtime-affecting (P1+).** This document supersedes any older "DearMe is a standalone Express app on Fly.io" framing. DearMe ships as an **OpenClaw plugin** that runs on the user's device. Everything below is the contract between the two.
>
> Last updated: 2026-05-09 (post `DEARME_ROLE_REGISTRY` lock).

---

## 1. Why OpenClaw is the substrate

OpenClaw (`github.com/openclaw/openclaw`, MIT) is a local-first, single-user agent runtime. It already solves five problems we previously had open:

| DearMe open problem (pre-OpenClaw) | OpenClaw answer |
|---|---|
| Where does the user actually talk to the team? Web app + iOS Shortcut was a thin story. | 24+ messaging channels (iMessage / WhatsApp / Telegram / Slack / Discord / Signal / SMS / Voice) with one config. Multi-account and per-channel bindings out of the box. |
| Voice gate is mandatory but we had no voice capture path. | Voice Wake + Talk Mode + Whisper / Deepgram / ElevenLabs skills shipped. We pipe transcripts straight into Chief of Staff. |
| Browser Agent (DM-151) needed a sandbox we hadn't designed. | Per-session sandboxed workspaces (`agents.defaults.sandbox`) with Docker isolation. Browser Agent runs as a sandboxed non-main session. |
| 6h cycle engine needed a cron we hadn't built. | OpenClaw Gateway has cron + webhooks built in (see `automation/cron-jobs`). Health Monitor and Reporting bind to cron. |
| Gmail inbound needed CASA-audit OAuth ($15K + 3 months). | OpenClaw's Gmail integration uses Pub/Sub push and avoids restricted scopes. We piggy-back on that. |

Two more capabilities are gravy: **multi-agent isolation** (agentDir + auth-profiles per agent — useful for multi-tenant later) and **ClawHub** (skill registry — useful for distribution).

What OpenClaw is **not** doing for us:

- Outbound publishing to X / LinkedIn / Newsletter / Meta — DearMe ships those tools.
- Personal site hosting (`dearme.app/<handle>`) — DearMe cloud owns it.
- Voice fingerprint scoring — DearMe cloud (`packages/dearme-ai-proxy` + voice service).
- The 12 prompts, state machines, proxy tools, and the registry — DearMe IP, ported into the SKILL.md generator.

---

## 2. Topology

```
┌────────────────────────── User device (laptop / phone via OpenClaw mobile) ──────────────────────────┐
│                                                                                                       │
│   ┌──────────── OpenClaw Gateway (~/.openclaw) ──────────────┐    ┌── Channels (per-user OAuth) ──┐  │
│   │                                                          │◀──▶│ iMessage  Telegram  WhatsApp  │  │
│   │   pi-agent-core runtime                                  │    │ Slack    Discord    Signal    │  │
│   │   ├─ session lane / queue                                │    │ Voice    Email      SMS       │  │
│   │   ├─ workspace ~/.openclaw/workspace                     │    └────────────────────────────────┘  │
│   │   ├─ bootstrap injects: AGENTS / SOUL / IDENTITY / USER  │                                       │
│   │   └─ skills load (workspace > agent > managed > bundled) │    ┌── Hardware ──┐                  │
│   │                                                          │◀──▶│ Voice Wake   │                  │
│   │   DearMe plugin (id: "dearme")                           │    │ Microphone   │                  │
│   │   ├─ generated/skills/dearme-<role> × 12  (from registry)│    │ Notifications│                  │
│   │   ├─ generated/bootstrap/AGENTS/SOUL/IDENTITY/USER       │    └──────────────┘                  │
│   │   └─ outbound channel tools (X / LinkedIn / Newsletter / │                                       │
│   │       Meta) — DearMe-owned                               │                                       │
│   └──────────────────────────────┬───────────────────────────┘                                       │
└──────────────────────────────────┼───────────────────────────────────────────────────────────────────┘
                                    │ HTTPS, dm_sk_* + X-DearMe-Task / X-Subscription-ID
                                    ▼
┌──────────────────────── DearMe cloud (single AWS account, MIT-friendly) ──────────────────────────┐
│                                                                                                    │
│   api.dearme.app                                                                                   │
│   ├─ /v1/proxy/*           → dearme-ai-proxy (6 OpenAI fns, dual-protocol cost attribution)        │
│   ├─ /v1/voice/*           → voice fingerprint capture + scoring                                   │
│   ├─ /v1/opportunities/*   → Hunter.io-verified leads, 8-state lifecycle                          │
│   ├─ /v1/site/*            → dearme.app/<handle> static site host                                  │
│   ├─ /v1/billing/*         → Stripe + per-user $ caps                                              │
│   └─ /v1/audit/*           → execution logs, voice-gate scores, approval events                    │
│                                                                                                    │
│   packages/db (Drizzle, 75+ inherited tables + opportunities)                                      │
│                                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The principle: **state lives at the edge (OpenClaw workspace), money + voice + identity live in the cloud (DearMe API).** The cloud never holds raw conversation transcripts unless the user opts in.

---

## 3. The contract

### 3.1 What DearMe ships

`packages/plugins/dearme-openclaw/` is an OpenClaw-loadable plugin:

```
dearme-openclaw/
├── openclaw.plugin.json     ← id="dearme", configSchema (apiKey, handle, defaults)
├── src/
│   ├── skill-generator.ts   ← DEARME_ROLE_REGISTRY → 12 SKILL.md (pure)
│   ├── bootstrap.ts         ← AGENTS.md / SOUL.md / IDENTITY.md / USER.md (templates)
│   ├── cli/generate-skills.ts
│   └── index.ts
├── generated/
│   ├── skills/dearme-<role>/SKILL.md  × 12   ← committed; what OpenClaw loads
│   └── bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md
└── package.json
```

The plugin manifest's `skills: ["./generated/skills"]` points OpenClaw at the 12 generated SKILL.md files.

### 3.2 What OpenClaw expects

From the OpenClaw concept docs (read-only; we conform to them):

- **Workspace files**: OpenClaw injects `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `BOOTSTRAP.md` from `<workspace>/` into the system prompt on first turn of each session. We seed 4 of those during install (everything except `TOOLS.md` — user-maintained — and `BOOTSTRAP.md` — first-run ritual is DearMe DM-138).
- **Skill folders**: OpenClaw loads `<plugin-root>/skills/` (we use `generated/skills/`) at the same low-precedence path as `extraDirs`. User-edited workspace skills override us, which is correct — DearMe ships defaults; user customization wins.
- **Plugin config**: OpenClaw exposes `configSchema` fields in its UI; users supply `apiKey`, `handle`, `defaults.dailyLetterChannel`, `defaults.voiceGate.minScore`, `defaults.budget.dailyUsdCap`. We never ship hardcoded keys.
- **Tool surface**: OpenClaw plugin tools register via `api.runtime.tools.register(...)`. DearMe ships outbound publishing/sending tools (post_x, send_linkedin_dm, send_telegram_message, send_imessage, send_email, deploy_site, create_meta_campaign) here. OAuth-backed tools call into DearMe cloud with the user's `dm_sk_*` key and per-channel OAuth token; Telegram/iMessage sends route through the approved launch handoff and OpenClaw gateway with the same voice-gated audit wrapper.
- **Hooks**: We use `agent:bootstrap` to optionally inject the freshest `IDENTITY.md` from cloud (after onboarding) without restarting OpenClaw.

### 3.3 What the user does once

1. Install OpenClaw (`brew install openclaw` or `OpenClaw.app`).
2. `openclaw plugin add @paperclipai/dearme-openclaw`.
3. Pair the channels they actually use (one OpenClaw command each).
4. Open `dearme.app/onboard`, paste the device pairing code, OAuth one platform (LinkedIn or X), let DearMe run the 0–30s identity dossier and 3–5min site-live aha moment.
5. From here on, talk to "Chief" on whichever channel they prefer.

OAuth for outbound platforms (X publish, LinkedIn DM, Meta ads spend) is **just-in-time, per user**: when Chief of Staff queues the first publish, the publish tool prompts the user to OAuth that specific platform with their own account. No shared accounts. (See `PRODUCT-ARCHITECTURE.md` §10 for the `channel_connections` schema.)

---

## 4. How the 12 roles map onto OpenClaw

OpenClaw's mental model is "one agent with many skills." DearMe inverts that slightly: **the user is the one OpenClaw agent; the 12 DearMe roles are skills it consults.** Chief of Staff is the conversational front-of-house; the other 11 are routed to via `find_best_agent` (the proxy tool the registry already declares).

| Registry role | OpenClaw skill folder | Bound to OpenClaw mechanism |
|---|---|---|
| `chief-of-staff` | `dearme-chief-of-staff` | Default conversational shell. |
| `reporting` | `dearme-reporting` | Cron (daily 06:00 user-tz) → writes 200-word letter → sends via configured `dailyLetterChannel`. |
| `content-producer` | `dearme-content-producer` | Triggered by Chief of Staff or by user voice/text intent ("draft a public post"). Voice-gate blocks publish below threshold. |
| `opportunity-hunter` | `dearme-opportunity-hunter` | Triggered for outreach intents. Calls DearMe cloud `/opportunities/*` (Hunter.io verified). |
| `brand-site-builder` | `dearme-brand-site-builder` | Triggered for site updates. Deploys to `dearme.app/<handle>` via cloud `/site/*`. |
| `ads-manager` | `dearme-ads-manager` | Default off. Triggered only on explicit user intent. Hard-stop at `defaults.budget.dailyUsdCap`. |
| `research-agent` | `dearme-research-agent` | Triggered for "look this up" intents. Always saves a report. |
| `audience-care` | `dearme-audience-care` | Triggered by inbound channel events (Audience replied to your post). |
| `data-analyst` | `dearme-data-analyst` | Triggered for metrics intents. Reads cloud `/audit/*`. |
| `health-monitor` | `dearme-health-monitor` | Cron (every 6h) → snapshots state → enqueues for Chief. |
| `chat` | `dearme-chat` | Used as the inner conversational substrate by Chief of Staff. |
| `browser-agent` | `dearme-browser-agent` | Runs in a sandboxed non-main OpenClaw session (Docker). |

The SKILL.md generator (`src/skill-generator.ts`) emits this routing as a `## Routing` section per file so OpenClaw's multi-agent router has one-line guidance per skill.

---

## 5. What OpenClaw saves us from building

This is the operational benefit, line item by line item:

| Capability | Without OpenClaw | With OpenClaw | Saved |
|---|---|---|---|
| Per-user OS auth on Mac/iOS/Android | Build & maintain Electron + iOS app + Android app | Use OpenClaw Desktop / OpenClaw iOS / OpenClaw Android | ~6 eng-weeks/year |
| 24+ messaging channels | Build 24 individual integrations (Discord bot, WhatsApp Cloud, etc.) | One config, one OAuth per channel | ~12 eng-weeks |
| Voice capture + wake word | Hardware integration + Whisper API plumbing | Voice Wake + Talk Mode skills shipped | ~3 eng-weeks |
| Sandboxed browser tool | Custom Docker image + lifecycle | `agents.defaults.sandbox.mode: "non-main"` | ~2 eng-weeks |
| Cron + webhooks for cycle engine | Build a job queue (BullMQ + Redis) | OpenClaw Gateway cron + webhooks | ~1 eng-week + infra |
| Gmail inbound (no CASA) | $15K audit + 3-month review | Use OpenClaw Gmail Pub/Sub path | $15K + 3 months |
| Multi-tenant agent isolation | Build session lanes + auth profiles | `agents.list[]` + per-agent `agentDir` | ~3 eng-weeks (when we go multi-tenant) |

**Net: ~27 eng-weeks and ~$15K of audit cost avoided** by treating OpenClaw as the substrate.

---

## 6. What we still own end-to-end

This is what makes DearMe a product separate from "OpenClaw with some skills":

1. **The 12 prompts and the registry.** Verbatim production-tuned, owned in `packages/plugins/dearme-agent-prompts/`. SSOT.
2. **The voice fingerprint and the voice gate.** Cloud service. Nothing OpenClaw ships scores style — that's our differentiator.
3. **The outbound publishing tools.** `post_x`, `send_linkedin_dm`, `send_email` (Resend/SES, not Gmail send), `deploy_site`, `create_meta_campaign`. DearMe-owned.
4. **The personal site host.** `dearme.app/<handle>`. DearMe cloud.
5. **The opportunities database + Hunter.io verification.** DearMe cloud.
6. **The AI proxy contract** (`@paperclipai/dearme-ai-proxy`). 6 functions, dual-protocol cost attribution, `dm_sk_*` keys.
7. **The 4 doctrine rules** (verbatim port runtime / original surface UI / useful first / registry-is-law). Encoded in `bootstrap/AGENTS.md`.
8. **The DM-138 aha moment.** First-run experience. Distinct from OpenClaw's `BOOTSTRAP.md` ritual.

---

## 7. Migration impact on prior decisions

What we change because of OpenClaw:

| Prior decision | New decision | Why |
|---|---|---|
| **Workbench is the primary UI.** | Workbench is the *secondary* UI for batch approvals + audit + Live feed. **Conversation lives on whichever channel the user picked in OpenClaw.** | OpenClaw already lives where the user is. We don't pull them into a new tab. |
| **Per-tenant Fly.io VM (Naive style).** | Rejected, again. Each user runs their own OpenClaw on their own device. Cloud is stateless. | Naive's per-tenant VM was rejected on cost; OpenClaw moves it onto user hardware for free. |
| **Build our own plugin SDK.** | Use OpenClaw's plugin shape (`openclaw.plugin.json`) for the user-facing surface. Keep our internal Paperclip plugin SDK only for cloud-side server plugins. | Two plugin shapes is fine: cloud SDK (server-side) + OpenClaw plugin (client-side). |
| **Build our own sandbox.** | Use OpenClaw `agents.defaults.sandbox`. | They have it. |
| **Build cron.** | Use OpenClaw Gateway cron. | Same. |
| **Build voice clone capture.** | Use OpenClaw voice skills + ship our own scoring. | Capture is solved; scoring is our IP. |
| **Build iOS/Android.** | Defer indefinitely. OpenClaw mobile apps cover us. | One less platform team to staff. |

What we keep:

- The `DEARME_ROLE_REGISTRY` — unchanged. SSOT remains.
- The 12 prompts — unchanged. Skill bodies wrap them, don't replace.
- The AI proxy contract — unchanged. OpenClaw plugin tools call it.
- The 4 doctrine rules — unchanged. Embedded in `bootstrap/AGENTS.md`.

---

## 8. Build order (delta from `INDEX.md` §5)

Aligning the existing roadmap with OpenClaw integration:

| Sprint | Window | Delivers | New tickets |
|---|---|---|---|
| 0 (done) | — | Registry, AI proxy contract, OpenClaw plugin scaffold + 12 generated skills | DM-S01, DM-141 schema, registry, ai-proxy contract, **DM-S05 (this work)** |
| 1 | days 1–7 | DM-138 aha moment runs through OpenClaw plugin path. Chief of Staff routes the first conversation. | DM-138, DM-139, **DM-170** (DearMe cloud `/voice/score`), **DM-171** (OpenClaw plugin install flow) |
| 2 | days 8–14 | Content Producer publishes via DearMe-owned `post_x` tool, gated by voice score. | DM-140, DM-142, DM-146, **DM-172** (post_x tool), **DM-173A** (X OAuth callback persistence proof) |
| 3 | days 15–21 | Opportunity Hunter outreach loop running. Audience Care responding inbound on whichever channel the user chose. | DM-141 runtime, DM-149, DM-150, **DM-174** (Resend/SES bridge), **DM-175** (channel_connections table) |
| 4 | days 22–35 | Site live, Ads optional, paid beta. | DM-147, DM-148, DM-153, DM-154 |

DM-S05 (this commit) and the four DM-170 series are the new tickets to pull into the next sprint.

---

## 9. Acceptance criteria for the integration scaffold (DM-S05)

This commit ships:

- [x] `packages/plugins/dearme-openclaw/` package with `openclaw.plugin.json`, skill generator, bootstrap files.
- [x] 12 SKILL.md files generated from `DEARME_ROLE_REGISTRY` and committed under `generated/skills/`.
- [x] 4 bootstrap files (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`) generated and committed under `generated/bootstrap/`.
- [x] 12 unit tests verifying generator output is deterministic + carries the verbatim production strings (Twitter 280-char, Hunter.io verification, < 200-word letter, etc).
- [x] Typecheck green (added `noUncheckedIndexedAccess` fixes to `dearme-agent-prompts` state machines).
- [x] Wire-up doc (this file).
- [x] `INDEX.md` and `PRODUCT-ARCHITECTURE.md` updated to reflect the OpenClaw substrate.
- [x] `REUSE-IMPLEMENTATION-LEDGER.md` updated with DM-S05 + the four DM-170 series.

This commit does **not** ship:

- A running OpenClaw plugin loader (next: DM-171).
- Real outbound tool implementations (next: DM-172, DM-174).
- The voice-score endpoint (next: DM-170).
- The DearMe onboarding flow (next: DM-138).

---

## 10. Defaults, not founder questions

This integration should not make the founder or the paid-beta user carry
architecture choices. The default path is fixed:

1. **Fork now, upstream later.** Build against the current OpenClaw fork until
   DearMe's contracts stabilize. Upstream reusable patches only after the
   paid-beta path is proven.
2. **Private npm/direct install first.** Ship `@paperclipai/dearme-openclaw`
   through a private/direct install path. ClawHub discovery waits until the
   plugin, onboarding, and outbound tools are paid-beta-stable.
3. **DearMe cloud stays cloud in v1.** Self-hosted DearMe-in-Gateway is a later
   enterprise/privacy SKU, not a v1 branch.
4. **One user, one team.** Agency-of-one multi-client mode stays out of v1.
   OpenClaw's multi-agent capability is useful substrate, but the first product
   experience is one person's growth team.
5. **Concern budget is four gates.** The runtime waits only for publish, send,
   deploy, and spend. Research, drafting, staging, reporting, memory updates,
   previews, and queue refills run autonomously on defaults.

---

## 11. Source of truth for this integration

- **Plugin manifest**: `packages/plugins/dearme-openclaw/openclaw.plugin.json`
- **Skill generator**: `packages/plugins/dearme-openclaw/src/skill-generator.ts`
- **Bootstrap files**: `packages/plugins/dearme-openclaw/src/bootstrap.ts`
- **Generated skills**: `packages/plugins/dearme-openclaw/generated/skills/dearme-<role>/SKILL.md`
- **Tests**: `packages/plugins/dearme-openclaw/src/index.test.ts`
- **Role registry (parent SSOT)**: `packages/plugins/dearme-agent-prompts/src/registry.ts`
- **OpenClaw contract docs (read-only reference)**: `openclaw/docs/concepts/{architecture,agent,agent-loop,multi-agent,oauth}.md`, `openclaw/docs/tools/skills.md`

To regenerate skills after editing the registry:

```bash
pnpm --filter @paperclipai/dearme-openclaw run generate-skills
pnpm --filter @paperclipai/dearme-openclaw test
git diff packages/plugins/dearme-openclaw/generated/
```

If `generated/` diff is unexpected, the registry was edited — review with care.
