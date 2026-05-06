# Architecture Part 3 — Build sequencing + file map + environment

> Continues from `ARCHITECTURE-PART-2.md`. Concrete what-to-do-when.

---

## 14. Final repo file map (when v1 ships)

```
dearme/
├── server.js                       Express monolith entry (300 LOC)
├── migrate.js                      idempotent runner with --down
├── package.json                    18 deps locked
├── render.yaml                     main service Blueprint
├── .env.example
├── .github/workflows/
│   ├── ci.yml                      lint + test + migrate-dry on PR
│   └── deploy.yml                  Render auto-deploy on main
│
├── lib/                            cross-cutting helpers
│   ├── db.js                       PG pool
│   ├── ai.js                       dual-protocol routing + cost ledger
│   ├── auth.js                     bcrypt + middleware
│   ├── sse.js                      in-process pub/sub bus
│   ├── embedding.js                ada-002 helper + cache
│   ├── crypto.js                   AES-256 for site_credentials + oauth tokens
│   ├── budget.js                   per-brand monthly cap gate
│   └── error.js                    uniform error response
│
├── migrations/                     001-026, idempotent
│   ├── 001 extensions + users + brands + sessions
│   ├── 002 agents + agent_tools
│   ├── 003 voice_profiles + brand_documents + brand_links
│   ├── 004 tasks + executions
│   ├── 005 cycles + cycle_metrics
│   ├── 006 memory L1/L2/L3 + skills + learnings
│   ├── 007 opportunities + personal_milestones
│   ├── 008 conversations + messages + reports
│   ├── 009 subscriptions + referrals
│   ├── 010 oauth_connections + site_credentials + browser_contexts
│   ├── 011 recurring_tasks + workflows + workflow_runs
│   ├── 012 instances + render_services + github_repos + neon_namespaces
│   ├── 013 stripe_connect + stripe_payment_intents + stripe_invoices
│   ├── 014 meta_ads_campaigns + meta_ads_creatives + meta_ads_metrics
│   ├── 015 twitter_oauth + twitter_posts + twitter_quota + shared_broadcasts
│   ├── 016 email_messages + contacts + postmark_servers
│   ├── 017 site_pages + custom_domains
│   ├── 018 dashboard_actions_log + agent_metrics
│   ├── 019 feature_flags + audit_log + analytics_events
│   ├── 020 voice_match_history + voice_signature_index
│   ├── 021 instant_task_credits + budget_events
│   ├── 022 agent_factory_templates + custom_agents
│   ├── 023 capabilities cache (search index)
│   ├── 024 platform memory L3 seeds (~100 entries)
│   ├── 025 platform skills seeds (~50 entries)
│   └── 026 indexes pass + perf
│
├── routes/                         REST + SSE + webhooks
│   ├── auth.js  brands.js  onboarding.js  conversations.js
│   ├── tasks.js  agents.js  cycles.js  documents.js  memory.js
│   ├── reports.js  opportunities.js  milestones.js  voice.js
│   ├── dashboard.js  subscription.js  workflows.js  recurring.js
│   ├── analytics.js  capabilities.js  settings.js
│   ├── proxy-ai.js     proxy-openai.js     proxy-email.js     proxy-r2.js
│   ├── webhooks-stripe.js  webhooks-postmark.js  webhooks-twitter.js
│   └── live.js         (cross-brand SSE feed)
│
├── mcp-servers/                    25 stdio MCP servers (one folder each)
│   ├── tasks/        reports/      memory/        dashboard/    send_reply/
│   ├── documents/    capabilities/ brand_infra/   brand_support/
│   ├── voice_profile/ ⭐
│   ├── twitter/      meta_ads/     stripe/        github/       github_publish/
│   ├── render/       postmark/     brand_email/   hunter_io/
│   ├── browserbase/  browser_auth/ cycle_planning/ learnings/   scripts/
│   └── agent_factory/
│
├── agents/                         agent runtime
│   ├── runtime.js                  Claude Agent SDK wrapper, spawn workspace, mount MCP
│   ├── workspace.js                /tmp clone+cleanup
│   ├── task-worker.js              30s poll loop
│   ├── cycle-planner.js            CEO planning prompt
│   ├── cycle-reviewer.js           CEO review prompt
│   ├── dispatcher.js               complexity → model router
│   └── find-best.js                cross-brand historical scoring
│
├── services/                       background workers + side effects
│   ├── seed-agents.js              ✅ done
│   ├── voice-extractor.js          ⭐ moat
│   ├── voice-matcher.js            ⭐ moat
│   ├── cycle-scheduler.js          (replace stub)
│   ├── memory-curator.js           (replace stub) nightly L1 dedup + L3 promotion
│   ├── broadcast-publisher.js      @brandinpublic cron
│   ├── onboarding-orchestrator.js  drives 16 steps
│   ├── customer-provisioner.js     Render + GitHub + Neon + Postmark + Stripe orchestrator
│   ├── portfolio-deployer.js       6-page render to public/{slug}/ or R2
│   ├── document-generator.js       LLM 5 brand_docs from prompt templates
│   ├── email-inbound.js            Postmark webhook → route
│   ├── budget-guard.js             per-brand cap enforcer
│   ├── workspace-gc.js             /tmp cleanup hourly
│   └── audit-logger.js             write to audit_log on state changes
│
├── prompts/                        verbatim system prompts
│   ├── manager.md  (CEO renamed)
│   ├── chat.md     (id 38)
│   ├── onboarding.md (id 39)
│   ├── engineering.md  research.md  twitter.md  cold-outreach.md
│   ├── browser.md  data.md  support.md  reporting.md  monitoring.md
│   ├── meta-ads.md (17.5K, full Sora 2 workflow)
│   ├── master-system.md (30K verbatim Polsia injected into every execution)
│   └── polsia-reference/   (12 files, our copy of Polsia originals)
│
├── skills/                         starter SKILL.md library
│   ├── agent-sdk/SKILL.md
│   ├── frontend-design/SKILL.md
│   ├── neon-postgres/SKILL.md
│   ├── render-infra/SKILL.md
│   ├── stripe-payments/SKILL.md
│   ├── email-proxy/SKILL.md
│   ├── r2-proxy/SKILL.md
│   ├── openai-proxy/SKILL.md
│   ├── voice-matching/SKILL.md       ⭐ ours
│   └── portfolio-page-patterns/SKILL.md ⭐ ours
│
├── templates/                      6-page portfolio HTML templates per goal
│   ├── job_hunting/        index about work projects writing contact
│   ├── solo_business/      index services case-studies pricing about contact
│   ├── career_promotion/   index expertise projects writing talks contact
│   ├── personal_branding/  index about writing speaking now contact
│   └── student/            index about projects gpa-courses writing contact
│
├── public/                         frontend SPA build artifacts
│   ├── index.html  app.js  app.css  assets/
│   └── (per-customer subdomain renders served from /sites/{slug}/)
│
├── _engine-starter-template/       per-customer Render service template
│   ├── server.js  migrate.js  package.json  render.yaml
│   ├── lib/  routes/  services/  public/
│   ├── .claude/skills/   (8 starter SKILL.md auto-injected)
│   └── README.md
│
├── frontend/                       Vite + React 19 source (compiled → public/)
│   ├── src/
│   │   ├── pages/        Landing Pricing Login Signup Onboarding/* Dashboard/* Public/*
│   │   ├── components/   ChatPanel TaskQueue MoodFace SSEClient ...
│   │   ├── hooks/        useSSE useAuth useBrand
│   │   └── lib/          api client, sse client, auth, brand context
│   ├── index.html  vite.config.js
│
├── test/                           integration + unit
│   ├── integration/  (signup→onboarding, ai-proxy, task-lifecycle, cycle, voice)
│   └── unit/         (auth, voice-matcher, cost-ledger, embedding, crypto)
│
├── ops/                            runbooks + scripts
│   ├── seed-platform-memory.js     L3 platform-wide patterns
│   ├── seed-platform-skills.js     50+ skills
│   ├── ops-hub/                    admin SPA
│   └── runbooks/                   incident playbooks
│
├── ARCHITECTURE.md                 ← you are here
├── ARCHITECTURE-PART-2.md
├── ARCHITECTURE-PART-3.md
├── BACKLOG.md  BACKLOG-PART-2.md
└── README.md
```

---

## 15. Build sequencing — 12 weeks 1-senior, 6 weeks 2-senior

### Week 0 — pre-launch infra + legal Day 0 critical path

- ⛔ Stripe Connect Platform application submitted (4 wk审核)
- ⛔ Twitter API v2 elevated application submitted (1-2 wk审核)
- ⛔ Meta Marketing API access requested (1-2 wk审核)
- LLC + EIN + Mercury bank
- Domain + Cloudflare DNS + wildcard SSL `*.ourdomain.app`
- Render + Neon + Upstash + Postmark accounts opened
- Privacy Policy + ToS draft (termly.io)

### Week 1-2 — schema + auth + AI proxy ✅ done

- ✅ migrations 001-009
- ✅ lib/db.js, lib/ai.js, lib/auth.js, lib/sse.js
- ✅ routes/auth.js, brands.js, conversations.js, tasks.js
- ✅ proxy-openai.js, proxy-ai.js
- ✅ services/seed-agents.js
- 🟡 migrations 010-026 (TODO Week 2)

### Week 3 — voice + onboarding (the moat)

- services/voice-extractor.js
- services/voice-matcher.js
- mcp-servers/voice_profile/
- routes/voice.js
- routes/onboarding.js (8-step flow + step 4 voice ingest)
- services/document-generator.js (5 brand_documents LLM)

### Week 4 — agent runtime

- agents/runtime.js (Claude Agent SDK wrapper)
- agents/workspace.js (/tmp clone+cleanup)
- agents/task-worker.js (30s poll loop)
- agents/dispatcher.js (complexity → model)
- prompts/master-system.md (30K verbatim) + 12 forked agent prompts

### Week 5 — 5 P0 MCP servers + cycle engine

- mcp-servers/tasks/ reports/ memory/ dashboard/ send_reply/
- agents/cycle-planner.js + cycle-reviewer.js
- services/cycle-scheduler.js (replace stub)
- routes/cycles.js + documents.js + memory.js + reports.js

### Week 6 — auto-provision pipeline + customer Render service

- services/customer-provisioner.js
- _engine-starter-template/ scaffold (50+ files)
- mcp-servers/brand_infra/ (13 tools — Render API + GitHub + Neon)
- migrations 010-018 (instances, oauth, github, neon, postmark)

### Week 7 — Stripe + Postmark + Twitter integration

- mcp-servers/stripe/ + postmark/ + brand_email/ + twitter/
- routes/subscription.js + webhooks-stripe.js + webhooks-postmark.js
- services/broadcast-publisher.js (@brandinpublic cron)

### Week 8 — Meta Ads + Browser + Hunter.io + Agent Factory

- mcp-servers/meta_ads/ (12 tools, 17.5K prompt)
- mcp-servers/browserbase/ + browser_auth/
- mcp-servers/hunter_io/
- mcp-servers/agent_factory/

### Week 9-10 — frontend SPA

- Onboarding wizard (8 steps)
- Dashboard layout + chat panel + task queue + cycles + memory + documents
- Public dashboard + /live cross-brand feed
- Settings + billing + opportunities + milestones

### Week 11 — content + portfolio templates + GTM prep

- 5 use-case × 6-page = 30 portfolio templates
- 100 platform memory L3 seeds
- 50 platform skills
- Demo video + landing page copy
- Documentation site

### Week 12 — polish + soft launch

- Integration tests pass
- 5 design partners onboarded
- /ops-hub admin
- Soft launch: HN + PH + Twitter (avoid wukongai shadowbanned account)
- @brandinpublic broadcast goes live

---

## 16. Environment variables (locked spec)

```bash
# Database
DATABASE_URL                        # Neon connection string

# Auth
SESSION_SECRET                      # 32-byte hex

# AI upstream
OPENAI_API_KEY                      # for ada-002 embeddings + utility
OPENAI_BASE_URL                     # Sapiom endpoint OR direct OpenAI
ANTHROPIC_API_KEY
ANTHROPIC_BASE_URL                  # optional Sapiom endpoint
SAPIOM_API_KEY                      # if using Sapiom (preferred for cost)

# Email
POSTMARK_SERVER_TOKEN
POSTMARK_INBOUND_WEBHOOK_SECRET

# Payments
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID

# Twitter (shared @brandinpublic)
TWITTER_BEARER_TOKEN
TWITTER_API_KEY
TWITTER_API_SECRET
TWITTER_OAUTH_CLIENT_ID
TWITTER_OAUTH_CLIENT_SECRET

# Meta Ads
META_APP_ID
META_APP_SECRET
META_BUSINESS_ID

# Browser
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID

# Discovery
HUNTER_IO_API_KEY

# Sora 2 (Meta Ads creative gen)
SORA_API_KEY

# Render API (for auto-provisioning)
RENDER_API_KEY
RENDER_OWNER_ID

# GitHub API
GITHUB_PAT                           # org-level token for repo creation
GITHUB_ORG                           # dearme-customers org

# Neon API
NEON_API_KEY
NEON_PROJECT_ID

# Cloudflare (DNS for {slug}.ourdomain.app)
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ZONE_ID

# Cloudflare R2
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_ENDPOINT

# Observability
SENTRY_DSN
POSTHOG_API_KEY

# Encryption keys (AES-256 for site_credentials + oauth tokens)
ENCRYPTION_KEY                       # 32-byte hex

# Public
PUBLIC_URL                           # https://ourdomain.app
NODE_ENV                             # production / development
PORT                                 # 3000

# Per-customer (auto-injected to their Render service):
#   POLSIA_API_KEY                   # 32-byte random, looked up by AI proxy
#   POLSIA_API_URL                   # https://ourdomain.app/api/proxy/ai
#   OPENAI_BASE_URL                  # https://ourdomain.app/ai/openai/v1
```

---

## 17. Naming — open question

**Working code name: `dearme`** (placeholder).

Candidate brands (from doc 07 brainstorm):
- **Beacon** — "Make your expertise visible"
- **Forge** — "Forge brand into revenue"
- **Salient** — "Stand out, sell more"
- **Pitched** — "AI pitches you, you sell"
- **Earshot** — "Be heard, get paid"
- **Persona** — "Your AI persona team"
- **Mainline** — "Pipeline your personal brand"

**Decision blocker only at launch (Week 11). Code stays `dearme` until then.**

---

## 18. Hard architectural rules (do not violate)

1. **No novel stack choices.** If Polsia uses X, we use X. If we don't have evidence Polsia uses Y, we don't use Y.
2. **Default to copy.** Every doc/code/prompt rewrite starts from a Polsia artifact. Edits limited to the 5 documented divergence points (renames + voice gate).
3. **Voice profile is the only NEW MCP server.** Don't add others.
4. **AI proxy is the moat — never compromise it.** Customer apps must route through us. POLSIA_API_KEY env injection is non-negotiable.
5. **Single Express + PG monolith.** No microservices. No GraphQL. No REST gateway.
6. **Per-customer Render service is the unit of isolation.** Don't merge tenants into shared service.
7. **Stripe Connect 20% take rate stays.** It's the business model. Don't dilute.
8. **node-cron + setImmediate, no BullMQ V1.** Polsia ran 89K customers without a queue.
9. **Session in PG, not Redis.** Keep dependency surface small.
10. **Document everything in markdown side-by-side with code.** Future you will thank you.

---

## 19. Open architectural questions (need Peter input)

1. **Brand name** — pick one of 7 candidates or new. Domain availability check needed.
2. **Twitter shared account handle** — `@brandinpublic` confirmed? `@buildersfeed`? Other?
3. **Default voice profile when user has zero social posts** — fall back to "Identity Researcher" agent that asks 5 questions and synthesizes a voice from answers? Or block onboarding?
4. **Free tier portfolio site URL** — `{slug}.ourdomain.app` (subdomain) or `ourdomain.app/{slug}` (path)? Polsia uses subdomain.
5. **Self-merging custom domain** — V1.5 vs V1? Affects Cloudflare API integration depth.
6. **OPC commerce mode** — when customer enables Stripe Connect, do we add a `/shop` page to their portfolio template? Or stay invisible (just give them payment link MCP)?

---

## 20. North Star metric

**Polsia north star: # of companies running cycles every 6h.**

**Ours: # of personal sites with ≥1 voice-matched outbound per week (tweet, email, page edit).**

The metric forces every system to ladder up to: real content, real frequency, real voice.

End of architecture spec.
