# Polsia vs DearMe — Architecture Comparison

> Side-by-side audit. Where we copy verbatim, where we diverge, why.

Legend: ✅ identical · 🟡 minor change · ⭐ DearMe-only · ❌ DearMe drops

---

## 1. Stack lockdown

| Layer | Polsia | DearMe |
|---|---|---|
| Runtime | Node 18+ CommonJS | ✅ identical |
| Web framework | Express 4 | ✅ identical |
| DB | Neon Postgres + pgvector ivfflat | ✅ identical |
| Session | connect-pg-simple | ✅ identical (no Redis) |
| Cron | node-cron in-process | ✅ identical |
| Queue | none V1 (cron + setImmediate) | ✅ identical |
| LLM SDK | openai + @anthropic-ai/sdk + claude-agent-sdk | ✅ identical |
| MCP | @modelcontextprotocol/sdk stdio transport | ✅ identical |
| Frontend | Vite + React 19 + Tailwind + shadcn/ui | ✅ identical |
| Hosting | Render Web Service | ✅ identical |
| Email | Postmark | ✅ identical |
| Files | Cloudflare R2 | ✅ identical |
| Payments | Stripe + Connect | ✅ identical |
| Browser | Browserbase | ✅ identical |
| Email lookup | Hunter.io | ✅ identical |
| Errors | Sentry | ✅ identical |
| Analytics | PostHog | ✅ identical |

**Zero novel stack choices.** Every dep matches Polsia's verified production.

---

## 2. Service topology

| Layer | Polsia | DearMe |
|---|---|---|
| Main monolith | 1 Express + PG + cron | ✅ identical |
| Per-customer Render service | auto-provisioned via Render API | ✅ identical |
| Per-customer GitHub repo | auto-forked from `_engine-starter-template` | ✅ identical |
| Per-customer Neon DB namespace | auto-created branch | ✅ identical |
| Per-customer Postmark sender | auto-DKIM `{slug}@polsia.app` | 🟡 `{slug}@dearme.app` |
| Per-customer Stripe Connect Express | for marketplace fees | ✅ identical |
| Custom domain | V1.5 CNAME | ✅ identical |
| Workspace per execution | `/tmp/polsia-workspaces/{c}/{a}/{e}/` | 🟡 `/tmp/dearme-workspaces/...` |

**Same 3-layer architecture: platform main / per-customer Render / per-execution sandbox.**

---

## 3. Data model — table-by-table

### Auth + tenancy

| Polsia | DearMe | Notes |
|---|---|---|
| users | ✅ identical | |
| companies | 🟡 `brands` (rename) | brand_type ∈ personal/team/anonymous |
| user_sessions | ✅ identical | |

### Agents

| Polsia | DearMe |
|---|---|
| agents | ✅ identical (rename company_id → brand_id) |
| agent_tools | ✅ identical |
| agent_metrics | ✅ identical |
| agent_factory_templates | ✅ identical |

### Tasks + cycles

| Polsia | DearMe |
|---|---|
| tasks (8 tags, 4 priorities, 1-10 complexity, 1-10 score) | ✅ identical schema; tag enum changed |
| executions | ✅ identical |
| recurring_tasks | ✅ identical |
| workflows + workflow_runs | ✅ identical |
| cycles + cycle_metrics | ✅ identical |

**Tag enum diff:**
- Polsia: engineering / research / browser / growth / content / data / support / meta_ads
- DearMe: site_build / research / outreach / content / community / data / opportunity / engineering

### Memory + knowledge

| Polsia | DearMe |
|---|---|
| memory_layer1 (15K tokens domain, per company) | ✅ identical |
| memory_layer2 (3K tokens preferences, CEO-only) | ✅ identical |
| memory_layer3 (15K cross-company, platform-wide) | ✅ identical |
| skills (procedure markdown) | ✅ identical |
| learnings (facts + confidence) | ✅ identical |

### Documents

| Polsia | DearMe |
|---|---|
| company_documents (5 types) | 🟡 `brand_documents` (rename) |

**5 doc types renamed:**
| Polsia | DearMe |
|---|---|
| mission | personal_pitch |
| product_overview | expertise_areas |
| tech_notes | portfolio_highlights |
| brand_voice | voice_profile_doc |
| user_research | target_audience |

### Chat

| Polsia | DearMe |
|---|---|
| conversations | ✅ identical |
| messages | ✅ identical |

### Email + CRM

| Polsia | DearMe |
|---|---|
| email_messages | ✅ identical |
| contacts (7-state flow) | ✅ identical schema |
| leads | 🟡 `opportunities` (rename) |

**Status flow diff:**
- Polsia leads: pending → contacted → replied → responded → meeting → customer / dead
- DearMe opps: pending → contacted → engaged → confirmed → completed / declined / dead

### Reports + dashboard

| Polsia | DearMe |
|---|---|
| reports | ✅ identical |
| dashboard_links → brand_links | 🟡 rename |
| dashboard_actions_log (mood ring buffer) | ✅ identical |

### Subscription + billing

| Polsia | DearMe |
|---|---|
| subscriptions (4 tier: trial/starter/pro/enterprise) | ✅ identical |
| referrals | ✅ identical |
| stripe_connect_accounts | ✅ identical |
| stripe_payment_intents | ✅ identical |
| stripe_invoices | ✅ identical |

### Marketing channels

| Polsia | DearMe |
|---|---|
| meta_ads_campaigns + creatives + metrics + state | ✅ identical |
| twitter_oauth + twitter_posts + quota_log | ✅ identical |
| shared_broadcasts (`@polsia`) | 🟡 (`@brandinpublic`) |

### Per-customer infrastructure state

| Polsia | DearMe |
|---|---|
| instances + render_services + github_repos + neon_namespaces + postmark_servers | ✅ identical |

### Browser auth

| Polsia | DearMe |
|---|---|
| site_credentials (AES) | ✅ identical |
| browser_contexts | ✅ identical |

### Ops

| Polsia | DearMe |
|---|---|
| feature_flags + audit_log + analytics_events + error_log + billing_events | ✅ identical |

### ⭐ DearMe-only (NEW)

| Table | Purpose |
|---|---|
| ⭐ voice_profiles | per-brand voice signature (embedding + signatures + forbidden + tone) |
| ⭐ voice_match_history | every outbound scored, audit trail |
| ⭐ voice_signature_index | indexed phrases for fast match |
| ⭐ personal_milestones | pipeline for `@brandinpublic` flywheel (Polsia broadcasts company milestones from same `dashboard_actions_log`; we keep separate table) |

**Total: 76 tables Polsia → ~80 tables DearMe (+4 voice/personal).**

---

(continued in POLSIA-VS-DEARME-PART-2.md: agents + MCP + AI proxy + cycle + onboarding + GTM)
