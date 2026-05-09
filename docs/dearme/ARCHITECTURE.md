> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine and the typed `DEARME_ROLE_REGISTRY`. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only. Current architecture lock is [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md).

# DearMe — Architecture (v2, 2026-05-06)

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.

> **Doctrine:** 100% Polsia clone + voice profile add-on. Default to Polsia patterns at every junction.
> Differentiation lives in (a) framing/copy, (b) 6-page portfolio templates, (c) voice profile MCP.

---

## 1. System topology

```
                    ┌─────────────────────────────────────┐
                    │  CUSTOMER's BROWSER                  │
                    │  ─ /dashboard/{slug}  (SSE stream)   │
                    │  ─ /chat / /tasks / /memory / /now   │
                    │  ─ /u/{slug}  (public dashboard)     │
                    │  ─ {slug}.ourdomain.app  (portfolio) │
                    └────────────┬─────────────────────────┘
                                 │
                ┌────────────────▼────────────────────────┐
                │  EXPRESS MONOLITH (main service)         │
                │  ┌─────────────────────────────────┐   │
                │  │ /api/auth, /api/brands, ...     │   │
                │  │ /api/conversations + SSE        │   │
                │  │ /api/onboarding (16 steps)      │   │
                │  │ /api/proxy/{ai,email,r2}  ⭐MOAT│   │
                │  │ /ai/openai/v1                   │   │
                │  │ /webhooks/{stripe,postmark}     │   │
                │  ├─────────────────────────────────┤   │
                │  │ Agent runtime                    │   │
                │  │  ─ claude-agent-sdk per task     │   │
                │  │  ─ /tmp workspace per execution  │   │
                │  │  ─ 22 MCP servers stdio child    │   │
                │  ├─────────────────────────────────┤   │
                │  │ Cron: 6h cycles / 06:00 review  │   │
                │  │       03:00 memory curation     │   │
                │  └─────────────────────────────────┘   │
                └─┬───────────────────────────────────────┘
                  │
           ┌──────▼──────────┐  ┌──────────────┐  ┌──────────┐
           │ Neon PG +       │  │ Upstash      │  │ Cloud-   │
           │ pgvector        │  │ Redis        │  │ flare R2 │
           │ (76 tables)     │  │ (rate limit) │  │ (files)  │
           └─────────────────┘  └──────────────┘  └──────────┘

         ┌────────────────── PER-CUSTOMER (auto-provisioned) ───────────────┐
         │  Render Web Service  ←  template fork from _engine-starter        │
         │    ↳ /tmp workspace + claude-code subprocess                      │
         │    ↳ env: POLSIA_API_KEY → routes back to main /api/proxy/ai     │
         │  GitHub repo per customer                                         │
         │  Neon DB namespace per customer                                   │
         │  Postmark sender + DKIM for {slug}@ourdomain.app                  │
         │  Stripe Connect Express account                                   │
         │  Custom domain (V1.5)                                             │
         └───────────────────────────────────────────────────────────────────┘

       ┌────────────────── EXTERNAL ──────────────────────────────────┐
       │  Sapiom / Anthropic / OpenAI (LLM upstream)                  │
       │  Postmark (email send/receive)                               │
       │  Stripe + Connect                                            │
       │  Twitter API v2 elevated (shared @brandinpublic + per-cust)  │
       │  Meta Marketing API (per-customer ad campaigns)              │
       │  Browserbase (headless Chrome for Browser agent)             │
       │  Hunter.io (email verification)                              │
       │  Sora 2 (Meta Ads UGC video generation)                      │
       │  GitHub API (per-customer repo creation)                     │
       │  Render API (per-customer service provisioning)              │
       └──────────────────────────────────────────────────────────────┘
```

---

## 2. Agent roster (13 = 12 Polsia + 1 ours)

| id | name | type | model tier | MCP servers | Polsia? |
|---|---|---|---|---|---|
| 29 | Research | execution | mostly Sonnet | tasks, reports, memory, send_reply, web_search | ✅ verbatim |
| 30 | Engineering | execution | Sonnet ↔ Opus by complexity | tasks, reports, polsia_infra, memory, send_reply, github, stripe | ✅ verbatim |
| 32 | Support | execution | Haiku | tasks, reports, memory, send_reply, postmark, company_email | ✅ verbatim |
| 33 | Data | execution | Sonnet | tasks, reports, memory, send_reply, polsia_infra | ✅ verbatim |
| 35 | Reporting | reporting | Haiku | tasks, reports, memory, send_reply, documents, postmark | ✅ verbatim |
| 37 | Monitoring | reporting | Haiku | tasks, reports, memory, send_reply, documents | ✅ verbatim |
| 38 | Chat | chat | Haiku ↔ Sonnet | tasks, reports, memory, dashboard, send_reply, documents, capabilities, voice_profile | ✅ verbatim |
| 39 | Onboarding | onboarding | Opus(once) | tasks, reports, dashboard, send_reply, documents, voice_profile | ✅ verbatim |
| 42 | Browser | execution | Sonnet | browserbase, browser_auth, tasks, reports, memory, send_reply | ✅ verbatim |
| 51 | CEO/Manager | ceo | Sonnet | ALL 22 MCP | ✅ rename only |
| 52 | Meta Ads Manager | execution | Sonnet | meta_ads, tasks, reports, memory, send_reply | ✅ verbatim |
| 53 | Twitter | execution | Haiku | twitter, tasks, reports, memory, send_reply, documents, voice_profile ⭐ | ✅ +voice gate |
| 54 | Cold Outreach | execution | Haiku ↔ Sonnet | postmark, hunter_io, tasks, reports, memory, send_reply, documents, voice_profile ⭐ | ✅ +voice gate |

**The voice_profile MCP is mounted on Twitter/Cold Outreach/Chat/Onboarding** — every customer-facing content flow passes through voice match.

---

## 3. Three architectural layers

```
Layer A — Platform main service (Express monolith)
   ├─ User-facing dashboard + chat + onboarding + auth
   ├─ AI proxy /ai/openai/v1 + /api/proxy/ai (MOAT)
   ├─ Cycle scheduler + memory curator + broadcast publisher (cron)
   └─ Auto-provisioner (Render+GitHub+Neon+Postmark+Stripe orchestration)

Layer B — Per-customer Render service (auto-provisioned)
   ├─ Forked from _engine-starter-template
   ├─ 8 .claude/skills/ (agent-sdk, frontend-design, neon-postgres, ...)
   ├─ Customer's own portfolio site code (lives in their repo)
   ├─ All AI calls route back to Layer A's /api/proxy/ai (POLSIA_API_KEY env)
   └─ Customer's own DB (Neon namespace), site, email, Stripe Connect

Layer C — Agent execution sandbox (per-task /tmp workspace)
   ├─ git clone --depth=1 customer repo into /tmp/workspaces/{brand}/{agent}/{exec}/
   ├─ Spawn claude-code or claude-agent-sdk with mounted MCP servers
   ├─ Stream thinking → SSE bus → customer browser
   ├─ Push code changes via push_to_remote MCP tool
   └─ Cleanup workspace on completion (24h GC for orphans)
```

---

(continued in ARCHITECTURE-PART-2.md: data model, MCP details, cycle/memory/voice subsystems, onboarding, deploy)
