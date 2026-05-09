# Architecture Part 2 — Data model + MCP + Subsystems

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.

> Continues from `ARCHITECTURE.md`. Tables / MCP tools / subsystem mechanics.

---

## 4. Data model — 76 tables grouped

100% Polsia schema with 4 renames. Field types verbatim (BIGINT IDENTITY / TEXT / TIMESTAMPTZ / JSONB / vector(1536)).

| Group | Tables | Polsia? | Notes |
|---|---|---|---|
| **Auth + tenancy** | users, brands*, user_sessions | rename companies→brands | brands.brand_type ∈ personal/team/anonymous |
| **Agents** | agents, agent_tools, agent_metrics, agent_factory_templates | ✅ verbatim | brand_id NULL = platform agent |
| **Tasks** | tasks, executions, recurring_tasks, workflows, workflow_runs | ✅ verbatim | 8-tag CHECK + complexity 1-10 + score 1-10 |
| **Cycles** | cycles, cycle_metrics | ✅ verbatim | every_6_hours default |
| **Chat** | conversations, messages | ✅ verbatim | auto-save to memory every 20 messages |
| **Documents** | brand_documents* | rename, 5 types | personal_pitch / expertise_areas / portfolio_highlights / voice_profile_doc / target_audience |
| **Memory** | memory_layer1, memory_layer2, memory_layer3 | ✅ verbatim | 15K+3K+15K tokens, ivfflat |
| **Knowledge** | skills, learnings | ✅ verbatim | platform-wide promotion at confidence>0.9 |
| **Reports** | reports | ✅ verbatim | report_type 7 values + tags GIN |
| **Email + CRM** | email_messages, contacts, opportunities* | rename leads→opportunities | 7-state flow |
| **Personal** | voice_profiles ⭐, personal_milestones ⭐ | NEW | our differentiator |
| **Site** | brand_links, site_pages, site_credentials | mostly verbatim | site_pages caches generated HTML |
| **Browser** | site_credentials, browser_contexts | ✅ verbatim | AES-256 encrypted |
| **Dashboard** | dashboard_links, dashboard_actions_log | ✅ verbatim | mood updates ring buffer |
| **Subscription** | subscriptions, referrals, instant_task_credits | ✅ verbatim | 4 tier: trial/starter/pro/enterprise |
| **Stripe Connect** | stripe_connect_accounts, stripe_payment_intents, stripe_invoices | ✅ verbatim | 20% application_fee_percent |
| **Meta Ads** | meta_ads_campaigns, meta_ads_creatives, meta_ads_metrics, meta_ads_state | ✅ verbatim | 5-state machine |
| **Twitter** | twitter_oauth, twitter_posts, twitter_quota_log, shared_broadcasts | ✅ verbatim | per-brand 1/day + global 50/day cap |
| **Infra** | instances, render_services, github_repos, neon_namespaces, postmark_servers | ✅ verbatim | per-customer provisioning state |
| **Ops** | feature_flags, audit_log, analytics_events, error_log, billing_events | ✅ verbatim | tenant-isolated |
| **Voice (NEW)** | voice_profiles, voice_match_history, voice_signature_index | ⭐ ours | every send scored, history retained |

**Total: ~76 tables.** Migrations 001-009 done (~22 tables). Migrations 010-026 needed for the rest.

---

## 5. AI Proxy — the moat (verbatim Polsia)

```
                ┌─────────────────────────────────────────┐
                │  Customer's Render service (Layer B)     │
                │  ENV:                                    │
                │    POLSIA_API_KEY = <32-byte random>     │
                │    OPENAI_BASE_URL = ourdomain.app/ai/.. │
                │    POLSIA_API_URL = ourdomain.app/api/.. │
                │  Code:                                   │
                │    openai.chat.completions.create({      │
                │      model, messages, task: 'cust-X-Y'   │
                │    })                                    │
                └────────────────┬────────────────────────┘
                                 │ HTTPS
                ┌────────────────▼─────────────────────────────┐
                │  Layer A /ai/openai/v1/chat/completions      │
                │  1. Auth: Bearer POLSIA_API_KEY → brand_id    │
                │  2. Budget gate: monthly_budget_usd check    │
                │  3. Voice gate (if outbound content): ≥0.7    │
                │  4. Forward to upstream (Sapiom/direct)       │
                │  5. Log to executions: brand_id, model,       │
                │     input_tokens, output_tokens, cost_usd,    │
                │     task metadata, request_id                 │
                │  6. Return upstream response verbatim         │
                └──────────────────────────────────────────────┘
                                 │
                ┌────────────────▼─────────────┐
                │  Sapiom OR Anthropic OR      │
                │  OpenAI direct (model picker │
                │  decides upstream)           │
                └──────────────────────────────┘
```

**Why this is the moat:**
- Every customer site's AI feature flows through us → we see prompts, route models, mark up cost
- Customer can never switch provider without rewriting their Render service env config
- We see usage per `task` metadata field → fine-grained billing per feature
- `X-Subscription-ID` header lets us track per-end-user attribution (when customer charges THEIR users)

---

## 6. 22 MCP servers (9 active per debug logs + 13 spec'd for V2)

| # | Server | Active P0 | Tools | LOC |
|---|---|---|---|---|
| 1 | tasks | ✅ | 12 (create_proposal, approve, start, complete, block, fail, get_available, get_details, edit, request_approval, reorder, move_to_top) | 800 |
| 2 | reports | ✅ | 7 (create, query, search, get_latest, get_by_date, get, save_analytics) | 600 |
| 3 | memory | ✅ | 3 (search across L1/L2/L3, read_layer, update_layer) | 700 |
| 4 | dashboard | ✅ | 4 (set_mood, add_link, get_dashboard, log_action) | 400 |
| 5 | send_reply | ✅ | 1 (send_reply pushes assistant msg + SSE broadcast) | 200 |
| 6 | documents | ✅ | 3 (get_all, get_by_type, update) | 200 |
| 7 | capabilities | ✅ | 6 (list_modules, list_mcp, list_agents, get_agent_caps, find_best_agent, get_brand_state) | 400 |
| 8 | polsia_infra → brand_infra | ✅ | 13 (create_instance, push_to_remote, push_to_prod, get_status, get_logs, get_preview, query_db, list_instances, delete_instance, get_env_vars, update_env_vars, rename_instance, resume_service) | 1500 |
| 9 | polsia_support → brand_support | ✅ | 2 (report_platform_bug, suggest_feature) | 200 |
| 10 | **voice_profile** ⭐ NEW | ✅ | 4 (extract_signatures, match_voice, score_post, regenerate_profile) | 600 |
| 11 | twitter | ⬜ | 4 (post_tweet, post_to_shared, get_account, schedule_thread) | 400 |
| 12 | meta_ads | ⬜ | 12 (create_campaign, create_adset, create_ad, upload_video, create_video_creative, activate, save_ad, update_metrics, add_captions, get_account, list_campaigns, get_insights) | 1500 |
| 13 | stripe | ⬜ | 5 (create_subscription_link, create_payment_link, get_status, sync_subscriber_status, refund) | 500 |
| 14 | github | ⬜ | 7 (read_file, write_file, create_branch, create_commit, create_pr, search_code, list_files) | 600 |
| 15 | github_publish | ⬜ | 1 (request_publish — user OAuth) | 100 |
| 16 | render | ⬜ | 5 (list_services, get_service, deploy_service, get_metrics, list_databases) | 400 |
| 17 | postmark | ⬜ | 2 (send_email, send_with_template) | 200 |
| 18 | company_email → brand_email | ⬜ | 5 (get_inbox, send, get_thread, add_contact, get_contacts) | 500 |
| 19 | hunter_io | ⬜ | 2 (find_email, verify_email) | 150 |
| 20 | browserbase | ⬜ | 9 (session_create, navigate, screenshot, click, fill, extract, get_page, evaluate, close) | 600 |
| 21 | browser_auth | ⬜ | 11 (get_site_tier, get_email, generate_password, get_creds, save_creds, check_inbox, verify_creds, list_creds, get_or_create_context, list_contexts, delete_context) | 600 |
| 22 | cycle_planning | ⬜ | 4 (get_context, create_plan, update_plan, submit_review) | 500 |
| 23 | learnings | ⬜ | 5 (create, query, search, get_recent, get_by_tags) | 500 |
| 24 | scripts | ⬜ | 3 (list, run, get_output) | 300 |
| 25 | agent_factory | ⬜ | 5 (list_mcp_tools, get_tool_details, create_agent, list_created_agents, get_template) | 500 |

**Total MCP: ~13K LOC across 25 servers (Polsia ships 22; we add voice_profile + brand_infra is rename of polsia_infra; brand_email rename of company_email; brand_support rename of polsia_support).**

---

## 7. Cycle Engine (verbatim Polsia)

```
Every 6h trigger (cron 0 */6 * * * per brand timezone):

  ┌─ Phase 1: Plan (CEO agent runs once)
  │    1. Build context: brand documents + memory L1/L2/L3 + recent reports
  │       + recent tasks (last 7d) + open issues
  │    2. LLM with planning prompt → JSON {tasks: [3-8 items], reasoning}
  │    3. INSERT into cycles + INSERT 3-8 tasks (status='todo', queue_position)
  │    4. SSE: type=cycle_started
  │
  ├─ Phase 2: Execute (task workers pick up sequentially per agent)
  │    For each task in priority + queue_position order:
  │      a. Lock task: status='in_progress', started_at=NOW()
  │      b. Spawn workspace: /tmp/workspaces/{brand}/{agent}/{exec}/
  │      c. git clone customer repo, mount agent's MCP servers
  │      d. claude-code subprocess with system prompt + task description
  │      e. Stream thinking → SSE; capture tool_calls, logs, mood updates
  │      f. On completion: status='completed', completion_summary set,
  │         cost_usd ledger updated, score=NULL (set by user later)
  │      g. On failure: retry 3x exp backoff, then status='failed'
  │      h. Cleanup workspace
  │    Time-budget: 4-6 hours total; tasks beyond budget spill to next cycle
  │
  └─ Phase 3: Review (CEO agent runs once at +6h or when all tasks done)
       1. Aggregate: accomplished, failed, blocked tasks
       2. LLM summarize → cycles.review_summary
       3. Send daily email via Reporting agent (Manager voice, ≤200 words)
       4. cycles_completed++ on brands
       5. SSE: type=cycle_completed
```

---

## 8. Voice Profile subsystem (our differentiator)

```
Onboarding step 4: "Connect your Twitter / LinkedIn / upload resume"

  ┌─ services/voice-extractor.js
  │    1. Pull 50-200 sample posts via Twitter API (or LinkedIn scrape, or PDF parse)
  │    2. Compute embedding (avg of all post embeddings via OpenAI ada-002)
  │    3. LLM extract: signature_phrases (top 20 recurring distinctive phrases),
  │       forbidden_phrases (corporate-speak the user never uses),
  │       tone (casual / professional / academic / irreverent),
  │       avg_post_length
  │    4. INSERT into voice_profiles for brand
  │
  ├─ MCP voice_profile tools (mounted on Twitter, Cold Outreach, Chat, Onboarding)
  │    extract_signatures({ sample_posts[] }) → signatures + forbidden + tone
  │    match_voice({ text, voice_profile_id }) → score 0..1
  │    score_post({ post_text, voice_profile_id }) → { score, suggestions[], pass }
  │    regenerate_profile({ brand_id }) → re-runs extractor with latest content
  │
  └─ Voice gate (every outbound flow):
       Twitter agent draft → score_post → if score < 0.7:
                                              re-prompt with voice context
                                              max 3 retries, then escalate to user
       Cold Outreach email → same gate
       Site copy generation → same gate
       Chat replies (when speaking AS the user) → same gate
       voice_match_history table records every score (audit trail)
```

**Why this is the differentiator:** Polsia speaks in a generic "dark humor / no emojis" voice across all 89K companies. Our customers' content sounds like *them* — defensible long-term moat because every customer's profile is unique.

---

## 9. Onboarding 16-step flow (verbatim Polsia + Step 4 voice ingest)

```
Step  Polsia                              DearMe (this fork)
────  ──────────────────────────────────  ──────────────────────────────────
 1    Landing page                        same
 2    Signup (email+pw or Google)         same
 3    Company name + slug                 Brand name + slug (defaults to user.name)
 4    Company description                 ⭐ Connect Twitter/LinkedIn OR upload resume PDF
                                          → voice-extractor runs, builds voice_profile
 5    Industry select                     Goal select (job_hunting / solo_business
                                          / career_promotion / portfolio / personal_branding)
 6    Stage select                        Audience select (recruiters / clients / peers
                                          / investors / customers)
 7    Website (optional)                  same — extract pitch from existing site
 8    Goal select                         Primary CTA (book_call / hire_me / read_writing
                                          / subscribe / buy_service)
 9    LLM generate 5 documents (30-60s)   same, 5 doc types renamed
10    Document review (editable)          same
11    Seed agents (8-10s, animation)      Seed 12 platform agents
12    Approve 3-5 starter tasks           same
13    Auto-provision (60-90s)             same — Render + GitHub + Neon + Postmark + Stripe
14    Subscription                        same — 4 tier
15    UI tour                             same
16    Welcome chat from Manager            same — opens with WHY + first cycle preview
```

---

## 10. Stripe Connect Platform (V1 enabled — required for "personal site selling stuff")

- Day 0 submission. 2-4 week审核 = critical path.
- **20% application_fee_percent** on every customer-collected charge.
- Customer signs up via OAuth → Stripe Express account → linked to `brands.stripe_connect_account_id`.
- AUP forbids: illegal industries / regulated services without license / chargeback-prone categories.
- KYC during sign-up (Stripe Express handles UI).
- Payouts 2-day rolling.

---

## 11. Per-customer auto-provision pipeline

```
Onboarding step 13 (60-90s):
  1. Render API: POST /v1/services
       template: from _engine-starter-template fork (1 click via Render Blueprint or fork+deploy)
       env: POLSIA_API_KEY (32-byte random) + OPENAI_BASE_URL=ourdomain/ai/openai/v1
            + DATABASE_URL (Neon namespace) + POSTMARK_SERVER_TOKEN + STRIPE_*
     → service_id, default_url
  2. GitHub API: POST /repos
       fork from dearme-org/_engine-starter-template
       grant Render webhook deploy access
     → repo_url, default_branch
  3. Neon API: create branch from prod template
       schema includes the customer's app tables
     → connection_string
  4. Postmark: create server + signed sending domain ({slug}@ourdomain.app)
       DKIM auto-config via Cloudflare DNS API
     → server_token, inbound_webhook_url
  5. Stripe: create Connect Express account for customer
     → connect_account_id (kept inactive until KYC complete)
  6. INSERT into instances table (one row per customer service)
  7. Trigger first deploy → poll /health until 200 (≤90s)
  8. Render auto-deploys → site live at {slug}.ourdomain.app

  Failure modes:
    - Render quota exhausted → escalate to platform support
    - GitHub rate limit → exponential backoff, surface progress in onboarding UI
    - Neon branch creation fails → fall back to schema in main DB namespace
    - Postmark domain DKIM pending → portfolio site goes live without email; retry 4h
```

---

## 12. Shared Twitter broadcast (`@brandinpublic`)

- Single elevated Twitter API account.
- `services/broadcast-publisher.js` cron every 30 min.
- Reads `personal_milestones WHERE !broadcasted AND broadcast_consent`.
- Picks top N by engagement potential (follower count + milestone type weighted).
- Posts: "Sarah Chen just got 3 speaking offers from one Twitter thread → sarahchen.ourdomain.app"
- Cap: 1 broadcast per brand per week + 50/day total (Twitter rate limit safety).
- Tracks reach + engagement back to `personal_milestones.broadcast_reach`.

---

## 13. Tech stack lock-in (verbatim Polsia)

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node 18+ CommonJS | matches all 5 customer instances |
| Web | Express 4 | foundros + bencera + runloop all use 4 |
| DB | Neon Postgres + pgvector ivfflat | embeddings + branching |
| Session | connect-pg-simple | no Redis dependency for session |
| Cron | node-cron | in-process, single tenant |
| Queue | none V1 (cron + setImmediate); BullMQ + Redis V2 if scale | Polsia uses none |
| LLM SDK | openai + @anthropic-ai/sdk + @anthropic-ai/claude-agent-sdk | dual-protocol |
| MCP | @modelcontextprotocol/sdk stdio transport | spawned per execution |
| Frontend | Vite + React 19 + Tailwind + shadcn/ui | matches Polsia SPA bundle |
| Hosting | Render Web Service (main + per-customer) | matches Polsia |
| Email | Postmark inbound + outbound | matches Polsia |
| Files | Cloudflare R2 | matches Polsia |
| Payments | Stripe + Stripe Connect | matches Polsia |
| Browser | Browserbase | matches Polsia |
| Email lookup | Hunter.io | matches Polsia |
| Errors | Sentry | matches Polsia |
| Analytics | PostHog | matches Polsia |

**Zero novel stack choices. Every dep is something Polsia validated at 89K customers.**

---

(continued in ARCHITECTURE-PART-3.md: build sequencing, file map, environment, naming, GTM hooks)
