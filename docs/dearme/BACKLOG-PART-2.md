> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine and the typed `DEARME_ROLE_REGISTRY`. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only. Current backlog lives in [`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`](POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md) and [`REUSE-IMPLEMENTATION-LEDGER.md`](REUSE-IMPLEMENTATION-LEDGER.md).

# DearMe — Backlog Part 2: Frontend + Infra + Legal + Content + GTM

> Backend backlog in `BACKLOG.md`. This file covers everything that isn't server-side code.

---

## FRONTEND SPA (Vite + React 19 + Tailwind + shadcn/ui)

Architecture: single SPA, served from `public/` by Express, talks to `/api/*` + SSE.

### Pages / routes

| Route | Component | LOC | Hours | Priority |
|---|---|---|---|---|
| ⬜ `/` | LandingPage (hero + 3 features + pricing + signup CTA + demo video) | 600 | 12 | P0 |
| ⬜ `/login` `/signup` | AuthForm (email+password, Google OAuth V2) | 300 | 6 | P0 |
| ⬜ `/onboarding` | OnboardingWizard (8 steps + progress bar + resume) | 1200 | 24 | P0 |
| ⬜ `/dashboard/{slug}` | DashboardLayout (sidebar + chat + activity feed) | 800 | 16 | P0 |
| ⬜ `/dashboard/{slug}/chat` | ChatPanel (SSE consumer + mood face render + send_reply stream) | 700 | 14 | P0 |
| ⬜ `/dashboard/{slug}/tasks` | TaskQueue (drag reorder + filter + score modal) | 600 | 12 | P0 |
| ⬜ `/dashboard/{slug}/cycles` | CycleTimeline (calendar + per-cycle stats + replay) | 500 | 10 | P1 |
| ⬜ `/dashboard/{slug}/memory` | MemoryViewer (3-layer tabs + search + L2 editor) | 400 | 8 | P1 |
| ⬜ `/dashboard/{slug}/documents` | DocumentEditor (5 tabs + markdown live preview) | 400 | 8 | P0 |
| ⬜ `/dashboard/{slug}/opportunities` | OpportunitiesKanban (6 columns + drag) | 600 | 12 | P0 |
| ⬜ `/dashboard/{slug}/milestones` | MilestonesList + BroadcastPreview modal | 400 | 8 | P1 |
| ⬜ `/dashboard/{slug}/settings` | SettingsPanel (cycle config / budget / pause / delete) | 500 | 10 | P0 |
| ⬜ `/dashboard/{slug}/billing` | BillingPanel (Stripe portal redirect + invoices) | 300 | 6 | P0 |
| ⬜ `/u/{slug}` | PublicBrandDashboard (Polsia equivalent of polsia.com/{slug}) | 600 | 12 | P1 |
| ⬜ `/live` | LiveFeed (cross-brand SSE + filters by goal type) | 500 | 10 | P1 |
| ⬜ `/pricing` | PricingPage (4 tiers + add-ons + FAQ) | 300 | 6 | P0 |
| ⬜ `/docs` | DocsHub (markdown rendered, sidebar nav) | 400 | 8 | P2 |
| ⬜ Generated portfolio site `slug.ourdomain.app` | 6 pages: index/about/writing/speaking/contact/now | 1200 | 24 | P0 |

### Shared components

| Component | LOC | Hours |
|---|---|---|
| ⬜ MoodFace renderer (ASCII art + accent_color + animation) | 200 | 4 |
| ⬜ SSEClient hook (auto-reconnect + heartbeat + replay missed) | 300 | 6 |
| ⬜ TaskCard (priority + complexity + score + drag handle) | 200 | 4 |
| ⬜ MarkdownEditor (Tiptap or simple textarea + preview) | 300 | 6 |
| ⬜ AvatarRing + AgentBadge | 100 | 2 |
| ⬜ Toast / Banner / Modal primitives | 200 | 4 |
| ⬜ Charts (recharts: cycle metrics, cost over time, follower growth) | 400 | 8 |
| ⬜ Onboarding step transitions (motion) | 200 | 4 |

### Design system (Polsia-style premium dark)

| Item | Hours |
|---|---|
| ⬜ Tailwind config + tokens (Polsia visual recon: bg #0a0a0a, accent #ff8c00, mono font Space Mono / Geist Mono) | 4 |
| ⬜ shadcn/ui setup + customize 12 primitives (button/dialog/dropdown/input/select/...) | 8 |
| ⬜ Frontend-design SKILL.md compliance (no Inter/Roboto, use Space Mono / Syne / Clash Display) | 2 |
| ⬜ Accessibility pass (focus ring + ARIA + screen reader) | 8 |

**Frontend total: ~10,500 LOC / 232 hours / ~30 days (1 person)**

---

## INFRASTRUCTURE

### Cloud accounts (open Day 0)

| Service | Role | Lead | $/mo (100 users) | Status |
|---|---|---|---|---|
| ⬜ Render | hosting (web + workers + PG branch) | instant | $200-500 | — |
| ⬜ Neon Postgres + pgvector | main DB (prod + staging branches) | instant | $100-300 | — |
| ⬜ Upstash Redis | rate limit (express-rate-limit) + future SSE multi-instance | instant | $20-50 | — |
| ⬜ Cloudflare R2 | file storage | instant | $20-50 | — |
| ⬜ Cloudflare DNS + wildcard SSL `*.ourdomain.app` | per-customer subdomain | instant | $0 (in plan) | — |
| ⬜ Postmark | transactional + inbound email + customer email | 1-3 day domain auth | $100-200 | — |
| ⬜ Stripe + Stripe Connect Platform | subs + future marketplace | **2-4 wk审核** ⚠️ | 2.9% + 30¢ | — |
| ⬜ Sentry | error tracking | instant | $0 (free tier) | — |
| ⬜ PostHog | product analytics + funnel | instant | $0 (free tier) | — |
| ⬜ Twitter API v2 elevated | shared @brandinpublic broadcast | **1-2 wk审核** | $100-200 | — |
| ⬜ LinkedIn Marketing API | V2 (B2B brands) | weeks审核 | $0 | — |
| ⬜ Hunter.io | email verify (Cold Outreach replacement) | instant | $50 | — |
| ⬜ Browserbase | headless Chrome (Browser agent) | instant | $200-500 | — |
| ⬜ OpenAI API key | embeddings (ada-002) + utility | instant | $20-50 | — |
| ⬜ Sapiom OR direct Anthropic | LLM upstream | days | $500-2K | — |
| ⬜ Domain (ourdomain.app + .com redirect) | brand | instant | $20/yr | — |
| ⬜ Mercury / Brex business banking | Stripe payouts | 1 wk | $0 | — |

**Total infra cost (100 users, MVP): $1,200-3,400/month + Stripe %.**

### Deploy config

| Item | Hours |
|---|---|
| ⬜ Render Blueprint (web service + Postgres + Redis) | 2 |
| ⬜ Per-customer subdomain routing (`*.ourdomain.app` → main service, dispatch by Host header) | 4 |
| ⬜ DKIM/SPF/DMARC for `ourdomain.app` + customer subdomains | 4 |
| ⬜ wildcard SSL automation (Cloudflare or Let's Encrypt) | 2 |
| ⬜ GitHub Actions CI: lint + test + migrate-dry-run + deploy on main merge | 6 |
| ⬜ Staging branch on Neon + auto-promote PRs | 2 |
| ⬜ Sentry source maps + release tagging | 2 |
| ⬜ PostHog event taxonomy (signup / onboard_step / first_cycle / first_paid) | 4 |
| ⬜ Status page (better-stack or upptime.js) | 2 |
| ⬜ Backup cron (Neon PITR + weekly R2 dump) | 2 |
| ⬜ Worktree GC for /tmp/dearme-workspaces (cron) | 2 |

**Infra total: 32 hours / 4 days.**

---

## SECURITY HARDENING

| Item | Hours |
|---|---|
| ⬜ HSTS + CSP + X-Frame-Options DENY | 2 |
| ⬜ CSRF (or strict SameSite=Lax verified) | 2 |
| ⬜ Rate limit per route (login 5/min, signup 3/hr, AI proxy 1000/hr per brand) | 3 |
| ⬜ Webhook signature verify (Stripe + Postmark + Twitter HMAC) | 4 |
| ⬜ AES-256 encrypt site_credentials.password_encrypted (libsodium) | 4 |
| ⬜ OAuth token encryption (oauth_connections.access_token / refresh_token) | 3 |
| ⬜ SQL parameterized everywhere (audit pass on all routes) | 3 |
| ⬜ Audit log on state changes (writes to audit_log table) | 2 |
| ⬜ Per-customer Render isolation (each brand = own service) | 4 |
| ⬜ Bug bounty + security@ourdomain.app | 1 |
| ⬜ Secrets rotation runbook (quarterly Anthropic + Stripe) | 1 |

**Security total: 29 hours / 4 days.**

---

## LEGAL / COMPLIANCE

| Item | Lead time | Cost | Hours self |
|---|---|---|---|
| ⬜ Delaware C-corp (Atlas / Clerky) | 1-2 wk | $200-500 | 2 |
| ⬜ EIN (IRS form SS-4) | 1-2 wk | $0 | 1 |
| ⬜ Mercury / Brex business bank | 1 wk | $0 | 2 |
| ⬜ Privacy Policy + ToS (termly.io $30/mo or attorney $500-3K) | 1-2 wk | $30-3K | 4 |
| ⬜ DPA template for customers (GDPR processor agreement) | 1 wk | $500 attorney review | 2 |
| ⬜ Cookie consent banner (cookiebot or self-built) | — | $0-50/mo | 2 |
| ⬜ AI disclosure pattern (EU AI Act — "AI generated" footer in cold emails / tweets) | — | $0 | 2 |
| ⬜ Trademark search + registration (USPTO TEAS) | 6-12 mo | $250-700 | 2 |
| ⬜ Stripe Connect Platform application | **2-4 wk审核** ⚠️ | $0 | 4 |
| ⬜ Twitter API v2 elevated application | 1-2 wk | $100-200/mo | 1 |
| ⬜ AUP (Acceptable Use Policy) — block illegal industries from Stripe Connect V2 | 1 wk | $0 | 2 |
| ⬜ Customer KYC flow (when V2 Stripe Connect added) | — | $0 | V2 |

**Legal total: 24 hours self + waiting + ~$1-5K attorney + 2-4 wk Stripe blocker.**

**KEY:** Stripe Connect审核 **must be Day 0 submitted** if we ever want platform marketplace fees. V1 (subscription only) doesn't need Connect — saves the blocker.

---

## CONTENT / SEED DATA (no AI = stupid agents)

| Item | LOC/items | Hours |
|---|---|---|
| ⬜ 100 Layer 3 platform memory seeds (technical/UX/marketing/infra patterns) | 100 entries | 8 |
| ⬜ 50 platform skills (markdown 4-section format) | 50 files | 16 |
| ⬜ 11 forked agent prompts polished + tested | 11 files | 8 |
| ⬜ Document generation prompts (5 brand_documents × goal type) | 5 prompts | 4 |
| ⬜ Twitter post examples per voice tone (casual / professional / academic / irreverent) | 40 examples | 4 |
| ⬜ 6-page portfolio template per industry (tech / design / coaching / writing / consulting) | 30 HTML files | 24 |
| ⬜ Onboarding email sequences (welcome / day 1 / week 1 / day 30) | 4 emails | 4 |
| ⬜ Brand identity guidelines (colors / fonts / voice) | 1 doc | 4 |
| ⬜ Demo video script + recording + edit | — | 12 |
| ⬜ Landing page copy (hero / features / pricing / FAQ / testimonials) | — | 8 |
| ⬜ Documentation (getting started / API ref / Stripe Connect setup / OAuth flow) | 20 pages | 24 |

**Content total: 116 hours / 15 days.**

---

## GTM / DISTRIBUTION (12 weeks pre-launch + post)

| Phase | Item | Hours |
|---|---|---|
| Pre-launch wk 1-12 | Founder Twitter dogfood (1 post/day, 10K followers target) | ongoing |
| Pre-launch wk 1-12 | Founder LinkedIn weekly post | ongoing |
| Pre-launch wk 4-12 | Substack build journey newsletter (subs target 1K) | ongoing |
| Pre-launch wk 8-12 | Recruit 5 design partners (free trial in exchange for case study) | 20 |
| Pre-launch wk 10-12 | 1 deep blog post: "How I cloned a $7.92M ARR product in 8 weeks" | 16 |
| Launch day | Product Hunt launch (booked hunters + email blast) | 8 |
| Launch day | HN Show HN (don't use shadowbanned wukongai account!) | 4 |
| Launch day | Twitter mega-thread + tag @bencera + @anthropic | 4 |
| Launch wk +1 | 5 case study blog posts | 24 |
| Post-launch | @brandinpublic shared broadcast goes live | 8 |
| Post-launch ongoing | Cold outreach 100 solo experts | 40 |
| Post-launch ongoing | 3 podcast appearances/month (founder) | ongoing |
| Post-launch | Referral program ($10 credit / 20% off first month) | 8 |
| Post-launch | Affiliate program (V2) | V2 |

**GTM total: ~140 hours pre-launch + ongoing founder time.**

---

## OPERATIONS / DAY 30+

| Item | Hours |
|---|---|
| ⬜ /ops-hub admin (suspend / refund / impersonate brand for support) | 16 |
| ⬜ Customer support inbox (Postmark inbound → support@ → Slack/email triage) | 8 |
| ⬜ Billing reconciliation cron (Stripe webhook gaps detection) | 8 |
| ⬜ Anomaly detection (sudden cost spike per brand → alert) | 8 |
| ⬜ Migration playbook ("How to migrate from Polsia") V2 | 8 |
| ⬜ Incident runbook (Anthropic outage / Sapiom down / DB issue) | 4 |
| ⬜ On-call rotation + PagerDuty | 4 |
| ⬜ Quarterly secrets rotation runbook | 2 |

**Ops total: 58 hours / 8 days.**

---

## EVERYTHING TOTAL

| Bucket | Hours | Days (1p) | Cost |
|---|---|---|---|
| Backend (BACKLOG.md) | 438 | 56 | — |
| Frontend SPA | 232 | 30 | — |
| Infrastructure | 32 | 4 | $1.2-3.4K/mo |
| Security | 29 | 4 | — |
| Legal / Compliance | 24 self + 2-4 wk wait | — | $1-5K attorney |
| Content / Seed | 116 | 15 | — |
| GTM | 140 + ongoing | 18 | $5-15K marketing |
| Operations | 58 | 8 | — |
| **Total** | **~1,069 hours** | **~135 days (1p)** | **$80-230K** for 6mo runway |

**Realistic team timing:**
- 1 senior solo: **6-9 months** to MVP launch (tight)
- 2 seniors split FE/BE: **3-4 months** to MVP
- 3 seniors (BE / FE / DevOps+infra): **2-3 months** to MVP

**Critical-path blockers:**
1. ⛔ Voice extractor + matcher (the moat — Day 3-5, blocks everything personal-brand specific)
2. ⛔ Agent runtime + workspace manager (Day 6-8, blocks all autonomous behavior)
3. ⛔ 5 P0 MCP servers (Day 9-12, blocks agent capabilities)
4. ⛔ Stripe审核 (2-4 wk; only blocks marketplace V2, not V1 subscription)
5. ⛔ Twitter API elevated (1-2 wk; blocks shared @brandinpublic broadcast — important but not blocking launch)

---

## NEXT 3 ITEMS (immediately actionable)

1. **routes/onboarding.js + services/voice-extractor.js + services/voice-matcher.js** (~12 hours, the moat)
2. **agents/runtime.js + agents/workspace.js + agents/task-worker.js** (~41 hours, the engine)
3. **5 P0 MCP servers: tasks / reports / memory / dashboard / send_reply** (~54 hours, the agent capabilities)

After these (~107 hours / 13 working days), platform is *functional* end-to-end. Everything else is polish + business.
