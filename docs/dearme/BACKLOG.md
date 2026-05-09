# DearMe — Complete Backlog

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.
>
> **2026-05-09 superseded for ticket scheduling**: active ticket roadmap is
> `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md` (DM-S01 + DM-138-159) plus
> `REUSE-IMPLEMENTATION-LEDGER.md` (DM-127-137 done, DM-138-159 pending).
> The estimates / ticket numbers below are pre-fork and obsolete; keep this
> doc only as historical context for the V1 plan that preceded the
> Paperclip fork.

Architect-view of every item needed to ship a 1:1 Polsia clone fork-tuned for personal brands. Estimates assume 1 senior full-stack engineer.

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · `[Lh]` = hours

---

## DONE (Day 1 + Day 2)

| Item | Files |
|---|---|
| ✅ Repo init + git + .gitignore | — |
| ✅ package.json (16 deps) + .env.example + render.yaml | — |
| ✅ 9 idempotent migrations (~22 tables) | `migrations/001-009` |
| ✅ migrate.js with --down rollback | `migrate.js` |
| ✅ lib/db.js (PG pool max 20) | `lib/db.js` |
| ✅ lib/ai.js (dual-protocol routing + cost ledger) | `lib/ai.js` |
| ✅ lib/auth.js (bcrypt + requireAuth + requireBrandOwner) | `lib/auth.js` |
| ✅ lib/sse.js (in-process pub/sub) | `lib/sse.js` |
| ✅ routes/auth.js (signup/login/logout/me + auto-trial) | `routes/auth.js` |
| ✅ routes/brands.js (CRUD + slug + 16-field PATCH) | `routes/brands.js` |
| ✅ routes/conversations.js (list/create/messages/SSE) | `routes/conversations.js` |
| ✅ routes/tasks.js (list/create/approve/reject/score/move) | `routes/tasks.js` |
| ✅ routes/proxy-openai.js (THE MOAT — auth + cost ledger) | `routes/proxy-openai.js` |
| ✅ routes/proxy-ai.js (Anthropic + X-Subscription-ID) | `routes/proxy-ai.js` |
| ✅ services/seed-agents.js (11 platform agent prompts forked) | `services/seed-agents.js` |
| ✅ 12 Polsia reference prompts stashed | `prompts/polsia-reference/*.md` |
| ✅ 8 starter SKILL.md copied from bencera | `skills/*/SKILL.md` |
| ✅ public/index.html dark placeholder | — |
| ✅ Boot verified: /health=200, /api/tasks=401 | — |

---

## REMAINING BACKEND ROUTES (15 stubs → real)

| Module | Endpoints | LOC | Hours | Blocks |
|---|---|---|---|---|
| ⬜ onboarding.js | POST /start, /step, /complete, /generate-documents, /ingest-twitter, /ingest-linkedin, /finalize | ~600 | 12 | voice-extractor, document generator |
| ⬜ agents.js | GET list, GET /:id, PATCH /:id, POST custom (factory), GET /:id/metrics, POST /find-best | ~400 | 8 | agent runtime |
| ⬜ cycles.js | GET list, GET /:id, POST /plan, POST /:id/review | ~300 | 6 | cycle-scheduler |
| ⬜ documents.js | GET all, GET /:type, PUT /:type, POST /generate-all (auto LLM) | ~250 | 5 | onboarding |
| ⬜ memory.js | GET /search (vector), GET/PUT /layer/:n, POST /save-conversation | ~400 | 8 | embedding service |
| ⬜ reports.js | GET list, POST, GET /:id, GET /search (full-text + vector) | ~300 | 6 | — |
| ⬜ opportunities.js | GET list, POST, PATCH /:id (status), GET /pipeline (kanban) | ~350 | 7 | — |
| ⬜ milestones.js | GET list, POST, POST /:id/broadcast (queue), webhook from broadcast | ~250 | 5 | broadcast-publisher |
| ⬜ voice.js | POST /extract, POST /match, POST /score, GET /profile | ~400 | 8 | voice-extractor + voice-matcher |
| ⬜ dashboard.js | GET /overview (counts + recent), GET /links, POST /links, DELETE /links/:id | ~250 | 5 | — |
| ⬜ subscription.js | GET, POST /checkout, POST /portal, POST /cancel | ~300 | 6 | Stripe Connect setup |
| ⬜ webhooks-stripe.js | checkout.completed, subscription.updated, payment_failed, payment_succeeded, customer.subscription.deleted | ~400 | 8 | Stripe verifier |
| ⬜ proxy-email.js | POST /send (Postmark wrapper), GET /inbox, webhook inbound | ~400 | 8 | Postmark domain auth |
| ⬜ proxy-r2.js | POST /upload (multipart), GET /signed-url, DELETE /:key | ~250 | 5 | Cloudflare R2 bucket |
| ⬜ live.js | GET /stream (cross-brand SSE), GET /feed (paginated milestones) | ~250 | 5 | broadcast-publisher |

**Subtotal: ~5,000 LOC / 100 hours / ~12 days**

---

## REMAINING MIGRATIONS (010-018)

| # | Tables | LOC | Hours |
|---|---|---|---|
| ⬜ 010 | voice_scores (every send logged: text, score, voice_profile_id, agent_id, sent) | 50 | 1 |
| ⬜ 011 | oauth_connections (twitter/linkedin/stripe/github tokens, encrypted) | 80 | 2 |
| ⬜ 012 | site_credentials (AES-encrypted browser auth) | 50 | 1 |
| ⬜ 013 | recurring_tasks + workflows + workflow_runs | 150 | 3 |
| ⬜ 014 | feature_flags + audit_log + analytics_events | 120 | 3 |
| ⬜ 015 | workspace_executions (track /tmp paths, gc) | 80 | 2 |
| ⬜ 016 | agent_metrics (daily aggregation per agent) | 50 | 1 |
| ⬜ 017 | site_pages (generated portfolio HTML cache) | 80 | 2 |
| ⬜ 018 | public_dashboard_cache + email_messages + contacts | 150 | 3 |

**Subtotal: ~810 LOC / 18 hours / ~2.5 days**

---

## MCP SERVERS (9 active + 5 nice-to-have)

Stdio transport, ~500-1500 LOC each, mounted per-agent via `agent_tools` table.

| MCP server | Tools | LOC | Hours | Priority |
|---|---|---|---|---|
| ⬜ tasks | 12 (create_task_proposal, approve, start, complete, block, fail, get_available, get_details, edit, request_approval, reorder, move-to-top) | 800 | 16 | P0 |
| ⬜ reports | 7 (create, query, search, get_latest, get_by_date, get, save_analytics) | 600 | 12 | P0 |
| ⬜ memory | 3 (search_memory across 3 layers, read_memory, update_memory) + embedding helper | 700 | 14 | P0 |
| ⬜ dashboard | 4 (set_mood, add_link, get_dashboard, log_action) — emits SSE dashboard_action | 400 | 8 | P0 |
| ⬜ send_reply | 1 (send_reply pushes assistant message into conversation, broadcasts via SSE) | 200 | 4 | P0 |
| ⬜ documents | 3 (get_all, get_by_type, update) | 200 | 4 | P1 |
| ⬜ capabilities | 6 (list_modules, list_mcp, list_agents, get_agent_capabilities, find_best_agent, get_brand_state) | 400 | 8 | P1 |
| ⬜ brand_infra | 13 (Polsia's polsia_infra equivalent — create_instance, push, deploy, logs, status, query_db, env_vars, etc) | 1500 | 30 | P1 |
| ⬜ voice_profile (NEW) | 4 (extract_signatures, match_voice, score_post, regenerate_profile) | 600 | 12 | P0 ⭐ moat |
| ⬜ twitter | 4 (post_tweet, post_to_shared, get_account, schedule_thread) | 400 | 8 | P1 |
| ⬜ postmark | 2 (send_email, send_with_template) | 200 | 4 | P1 |
| ⬜ hunter_io | 2 (find_email, verify_email) | 150 | 3 | P2 |
| ⬜ browserbase | 9 (session_create, navigate, screenshot, click, fill, extract, get_page, evaluate, close) | 600 | 12 | P2 |
| ⬜ stripe | 3 (create_subscription_link, create_payment_link, get_subscription_status) | 300 | 6 | P1 |

**Subtotal: ~7,050 LOC / 141 hours / ~18 days**

---

## AGENT RUNTIME (the heart)

| Module | Description | LOC | Hours | Priority |
|---|---|---|---|---|
| ⬜ agents/runtime.js | Spawn workspace, clone repo, run claude-code subprocess or @anthropic-ai/claude-agent-sdk, mount MCP servers from agent_tools table, capture stdout to executions.logs JSONB | 1200 | 24 | P0 |
| ⬜ agents/workspace.js | mkdtemp /tmp/dearme-workspaces/{brand}/{agent}/{exec}/ + git clone --depth=1 + cleanup on success/failure | 250 | 5 | P0 |
| ⬜ agents/task-worker.js | Poll tasks WHERE status='todo' every 30s, lock task, dispatch to runtime, handle complete/fail/block/timeout, retry with exponential backoff | 600 | 12 | P0 |
| ⬜ agents/cycle-planner.js | Build CEO context (docs+memory+recent) → call LLM with planning prompt → create_cycle + 3-8 task proposals | 500 | 10 | P0 |
| ⬜ agents/cycle-reviewer.js | Aggregate cycle's executions → LLM summarize → store on cycles.review_summary + send email | 400 | 8 | P0 |
| ⬜ agents/dispatcher.js | Route task by tag → suggested_agent_id + complexity → model picker (1-3 Haiku, 4-6 Sonnet, 7-10 Opus) | 200 | 4 | P0 |
| ⬜ agents/find-best.js | search executions where similar prompt + completed → best avg_score | 200 | 4 | P1 |

**Subtotal: ~3,350 LOC / 67 hours / ~9 days**

---

## SERVICES (background workers)

| Module | LOC | Hours | Priority |
|---|---|---|---|
| ⬜ services/voice-extractor.js (Twitter/LinkedIn scrape → embedding + signature_phrases + forbidden_phrases + tone) | 500 | 10 | P0 ⭐ |
| ⬜ services/voice-matcher.js (score(text, voice_profile_id) → 0-1) | 200 | 4 | P0 ⭐ |
| ⬜ services/cycle-scheduler.js (replace stub, every 6h trigger per brand) | 200 | 4 | P0 |
| ⬜ services/memory-curator.js (replace stub: dedup L1, promote L1→L3 if confidence>0.9) | 400 | 8 | P1 |
| ⬜ services/broadcast-publisher.js (read personal_milestones WHERE !broadcasted → tweet via shared @brandinpublic, Twitter API rate-limit aware) | 400 | 8 | P0 |
| ⬜ services/onboarding-orchestrator.js (drive 8 steps + spawn document generation jobs) | 500 | 10 | P0 |
| ⬜ services/portfolio-deployer.js (render 6 pages → write to public/{slug}/ or upload to R2) | 400 | 8 | P1 |
| ⬜ services/email-inbound.js (Postmark webhook → match thread_id → route to Support/Cold Outreach reply) | 300 | 6 | P1 |
| ⬜ services/embedding.js (OpenAI ada-002 helper + cache) | 100 | 2 | P0 |
| ⬜ services/document-generator.js (LLM 5 brand_documents from prompt templates) | 400 | 8 | P0 |
| ⬜ services/budget-guard.js (per-brand monthly_budget_usd cap; refuse AI proxy when exceeded) | 200 | 4 | P0 |
| ⬜ services/workspace-gc.js (delete /tmp workspaces > 24h old, every hour) | 100 | 2 | P1 |
| ⬜ services/audit-logger.js (write to audit_log on every state change) | 200 | 4 | P2 |

**Subtotal: ~3,900 LOC / 78 hours / ~10 days**

---

## INTEGRATION TESTS (must-have before launch)

| Test | LOC | Hours |
|---|---|---|
| ⬜ signup → /me → create brand → onboarding 8 steps → portfolio site live | 300 | 6 |
| ⬜ AI proxy: customer key → /chat/completions → executions row + cost match | 200 | 4 |
| ⬜ task lifecycle: create suggested → approve → in_progress → complete → score | 200 | 4 |
| ⬜ cycle: 23:30 plan → 12-6AM execute → 06:00 review → email sent | 300 | 6 |
| ⬜ voice match: ingest 100 posts → extract → score new post (own > 0.7, others < 0.3) | 250 | 5 |
| ⬜ SSE: 2 clients connect → broadcast → both receive | 150 | 3 |
| ⬜ Stripe webhook signature verify + subscription state update | 200 | 4 |
| ⬜ Budget cap: hit monthly_budget_usd → AI proxy 429 with retry_after | 100 | 2 |

**Subtotal: ~1,700 LOC / 34 hours / ~4.5 days**

---

## BACKEND TOTAL

| Bucket | LOC | Hours | Days |
|---|---|---|---|
| Routes (15) | 5,000 | 100 | 12 |
| Migrations (9 more) | 810 | 18 | 2.5 |
| MCP servers (14) | 7,050 | 141 | 18 |
| Agent runtime (7) | 3,350 | 67 | 9 |
| Services (13) | 3,900 | 78 | 10 |
| Integration tests | 1,700 | 34 | 4.5 |
| **Total** | **~21,800** | **~438** | **~56 days (8 weeks 1-person)** |

→ Frontend + Infra + Legal + Content + GTM 在 BACKLOG-PART-2.md

---

## CRITICAL PATH (what blocks what)

```
Day 1-2 ✅ schema + auth + AI proxy + SSE bus
   ↓
Day 3-5  voice-extractor + voice-matcher + onboarding routes (CRITICAL — moat)
   ↓
Day 6-8  agent runtime + workspace manager + task worker
   ↓
Day 9-12 5 P0 MCP servers (tasks/reports/memory/dashboard/send_reply)
   ↓
Day 13-15 cycle planner + reviewer + scheduler (the autonomous loop)
   ↓
Day 16-18 document generator + portfolio deployer + 6-page templates
   ↓
Day 19-22 Stripe + Postmark + Twitter integration + broadcast publisher
   ↓
Day 23-26 frontend SPA (see BACKLOG-PART-2)
   ↓
Day 27-30 polish + integration tests + soft launch with 5 design partners
```

**Realistic 1-person timeline: 8-10 weeks to MVP. 2 senior: 4-5 weeks. 3 senior: 3 weeks.**

→ see `BACKLOG-PART-2.md` for frontend + infrastructure + legal + content + GTM
