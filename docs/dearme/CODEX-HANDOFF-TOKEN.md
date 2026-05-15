# Codex Handoff Token — DearMe Autonomous Operator

Date issued: 2026-05-15
Issued by: Peter (one-line directive) via PM+architect Claude session
Target executor: Codex CLI in a Docker container, running long-lived
Stop condition: see §7

> **Hello Codex.** This is your standing brief. Read it once on boot. Re-read §3 every wake cycle to pick the next task. Everything you need is in this repo. Do not ping Peter except for the items in §4 — those are reserved.

---

## 1. Mission

Take DearMe from "architecture + code in tree" to **first $29 in the bank via dearme.app**, plus the steady-state operational tail (deployment, user system, overall arch hardening) so that a real human visiting dearme.app today can sign up, pay, and get a working private AI growth team.

You are not building from scratch. ~90% of code is already shipped. Your job is to **wire it all up, harden it, polish it, deploy it, and keep shipping** until the product is at $50K MRR or Peter pauses you.

---

## 2. Repo + auth

- Repo: `git@github.com:WuKongAI-CMU/paperclip.git`
- Working branch: `codex/dearme-dm-136-sample-demo-proof`
- Base for new feature branches: `ai/dm-<slice>-<short-slug>`
- PR target: `codex/dearme-dm-136-sample-demo-proof` (NOT `main`)
- Self-merge authorized after typecheck+test green (see auto-memory `feedback-internx-self-merge-authorized`)

Auth (Peter to provision on Day 1 of your run):
- GitHub deploy key with write to this repo (paste into `~/.ssh/id_dearme_codex`)
- Or a fine-scoped GitHub PAT (`repo` scope only) in `GH_TOKEN`

Workflow per slice:
1. `git fetch origin && git checkout -b ai/dm-<slug> origin/codex/dearme-dm-136-sample-demo-proof`
2. Implement (write code + tests)
3. `pnpm --filter <pkg> typecheck && pnpm --filter <pkg> test`
4. `git add` specific paths, `git commit -m "Add <feature> (DM-<slug>)"`
5. `git push -u origin ai/dm-<slug>`
6. `gh pr create --base codex/dearme-dm-136-sample-demo-proof --title "DM-<slug>: <one-line>" --body "..."`
7. If CI green: `gh pr merge --squash --delete-branch`
8. Append one line to `docs/dearme/CODEX-RUN-LEDGER.md` (create if missing) with date, SHA, slice, test count

**Doctrine reminder:** branches are cheap, atomic commits beat big ones, never amend a pushed commit, never force-push to the working branch.

---

## 3. Autonomous backlog (prioritized — pick the next OPEN item every wake cycle)

Mark items DONE in `docs/dearme/CODEX-RUN-LEDGER.md` as you finish them. Pick the next OPEN. When P0 is fully DONE, start P1. When P1 is fully DONE, start P2. Loop.

### P0 — must ship before any human customer signs up

- [ ] **DM-DOCKERFILE-SERVER** — Multi-stage Dockerfile for the Express server (Node 22 alpine, pnpm fetch + install, build, prune dev deps, copy `server/dist` + `ui/dist`). Binds `PORT`. Exposes 3000. Healthcheck hits `/healthz`. `docker build` succeeds locally. ~80 LoC.
- [ ] **DM-DOCKER-COMPOSE** — `docker-compose.yml` for local prod simulation: `dearme-server`, `dearme-postgres` (16-alpine with named volume), `dearme-caddy` (reverse proxy w/ self-signed cert on `dearme.local`). Migrations run automatically on `dearme-server` boot via an init container. `docker-compose up` brings the stack live, `curl https://dearme.local/healthz` returns 200.
- [ ] **DM-MIGRATION-BOOT** — Server entrypoint runs `drizzle-kit migrate` on startup against `DATABASE_URL` BEFORE accepting traffic. Fails closed if migration fails. Configurable with `DEARME_AUTO_MIGRATE=1` (default on).
- [ ] **DM-STRUCTURED-LOGGING** — Pino JSON logger across server. Redact `authorization`, `password`, `dm_sk_*`, `re_*`, `sk_live_*`, `whsec_*`, `phc_*`, email PII at log level (use `pino.redact`). Every request gets a `requestId`. Tests assert redaction.
- [ ] **DM-RATE-LIMIT** — `express-rate-limit` on public endpoints: `/v1/dearme/checkout/start` (5/min/IP), `/api/auth/signin/*` (10/min/IP), `/v1/email/unsubscribe` (30/min/IP). 429 with customer-safe body. Tests.
- [ ] **DM-SECURITY-HEADERS** — `helmet()` with prod-grade CSP (script-src self + posthog.com, connect-src self + posthog + voyage + stripe + loops), HSTS, X-Frame-Options DENY, no `unsafe-eval`. Tests assert headers present.
- [ ] **DM-CORS-PROD** — CORS allows only `https://dearme.app` + `https://www.dearme.app` + preview Vercel URLs in prod; `*` in dev. Tests.
- [ ] **DM-SESSION-COOKIE-HARDEN** — better-auth session cookie: `httpOnly`, `secure` in prod, `sameSite=lax`. Tests assert.
- [ ] **DM-STRIPE-IDEMPOTENCY-STRESS** — Add 3 new tests to `dearme-stripe-checkout.test.ts`: 10x identical webhook event in 100ms produces 1 grant. Out-of-order `invoice.paid` then `checkout.session.completed` still records access. Webhook with stripe-signature replay > 5min old → rejected.
- [ ] **DM-BEDROCK-LINT-GUARD** — ESLint or grep-based CI step that fails if `@aws-sdk/client-bedrock` is in any `package.json` or imported anywhere. Wire into `dearme-ci.yml`.
- [ ] **DM-EMPTY-STATES** — `Work Ready`, `Decisions Needed`, `Voice & Memory`, `Opportunities`, `Portfolio` all have customer-safe empty states with a CTA. Tests render each empty state without crashing.
- [ ] **DM-LOADING-STATES** — Skeleton loaders on first-cycle preview, workbench, and Decisions panel. Tests render the skeleton with `data-testid` selectors.
- [ ] **DM-ERROR-PAGES** — `/404` + `/500` static React pages with DearMe-original copy. Wire to Express error handler.
- [ ] **DM-FAVICON-OG** — Drop a DearMe-branded SVG favicon at `ui/public/favicon.svg` + a 1200×630 OG card placeholder PNG at `ui/public/og-image.png` (use a simple `<svg>` → PNG via sharp at build time; placeholder is fine for now).
- [ ] **DM-PRICING-PAGE** — `/pricing` static React route. ONE plan only: $29/mo Beta. Three-day free trial. "Request access" CTA in the current invite-only mode; later switches to Stripe Checkout when invite-gate lifts.
- [ ] **DM-ABOUT-FAQ** — `/about` (founder story) + `/faq` (10-15 Q&As pulled from Terms/Privacy/AUP + voice gate + cost cap + cancellation). DearMe-original copy.
- [ ] **DM-VOICE-SAMPLE-UI** — On first cycle, ask the user to paste 3 writing samples (text fields) or paste a URL (we fetch + extract). Each sample writes to `dearme_voice_profiles` via the existing service. Min 1, max 10. Tests.
- [ ] **DM-ONBOARDING-BUGBASH** — Full top-to-bottom run of landing → signup → first cycle in headless playwright. Catch any console error, any 4xx/5xx, any substrate language leak. Fix what breaks.

### P1 — pre-50-paying-customer hardening

- [ ] **DM-EMAIL-TEMPLATES** — Resend HTML templates for: welcome (Day 0), receipt (post-payment), trial-ending (Day 2 of trial), dunning (failed payment), cancellation confirm. DearMe voice. Mobile-responsive.
- [ ] **DM-PROD-SMOKE** — `pnpm dearme:prod-smoke` script that runs against `DEARME_PUBLIC_URL` and validates: landing 200 + hero text present, /healthz 200, /readyz 200, sample Stripe Checkout session creates, voice MCP server responds. Exit 1 on any failure. Wire into CI for the deploy preview URL.
- [ ] **DM-MOBILE-QA** — Playwright runs landing + onboarding + workbench at viewport 360×640 (iPhone SE), 390×844 (iPhone 14), 768×1024 (iPad). Tests assert no horizontal scroll, all CTAs are tappable (min 44×44px).
- [ ] **DM-BUNDLE-AUDIT** — `pnpm --filter @paperclipai/ui build` reports gzipped bundle size. Add `vite-bundle-analyzer`. Target: < 200KB initial. Fix worst offenders.
- [ ] **DM-LCP-AUDIT** — Lighthouse CI runs against the landing page in CI. Target: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- [ ] **DM-SENTRY** — `@sentry/node` for server + `@sentry/react` for ui. Env-gated. Source maps uploaded in CI. PII scrubbed (use Sentry's `beforeSend` + the same redaction list as DM-STRUCTURED-LOGGING).
- [ ] **DM-DB-BACKUP-SCRIPT** — `scripts/dearme-db-backup.sh` does `pg_dump` to a timestamped file in S3-compatible storage (Backblaze B2 / R2). Doc the env vars needed. Cron friendly.
- [ ] **DM-AUDIT-LOG-EXPORT** — Add a per-company GET that returns the last 90 days of `activity_log` rows for that company. Authed + assertCompanyAccess. JSON. Useful for trust + support.
- [ ] **DM-SLOW-QUERY-LOG** — Drizzle wrapper that logs any query > 200ms with the SQL fragment (redacted). Helps post-launch perf.

### P2 — first-50-to-500 customers

- [ ] **DM-AB-LANDING-COPY** — 3 landing-page hero variants behind PostHog feature flag. Track conversion to `landing_cta_submitted`. Pick winner after 200 visitors per variant.
- [ ] **DM-COHORT-DASHBOARD** — PostHog dashboard config (JSON file in `docs/dearme/ops/`) for the weekly cohort retention model: D1 retention, D7 retention, D28 retention.
- [ ] **DM-REFERRAL-UI** — `/dearme/refer` page where a paid user mints + copies their referral code. Pulls from `dearme_referral_codes` (already exists). Share buttons (X, LinkedIn, copy link). Tests.
- [ ] **DM-VOICE-CALIBRATION-LOOP** — When a user rejects 3+ Voice Gate scores in a row, auto-trigger a calibration session: ask for 5 more samples + clarify what was off. Improves voice profile.
- [ ] **DM-WORK-STREAM-SSE-RECONNECT** — Browser reconnects to `/v1/dearme/companies/:companyId/events` with exponential backoff after WiFi blips. Tests with a faked drop.
- [ ] **DM-CUSTOMER-DELETION-UX** — `/dearme/settings/danger` page with the GDPR-delete button + 7-day grace period. Renders the existing `dearme-gdpr` service.
- [ ] **DM-SUPPORT-RESPONSE-SLA** — Cron checks Plain inbox: if any thread > 24h without response, send a Loops event `dearme_support_overdue` (triggers an email to Peter).
- [ ] **DM-WEEKLY-LETTER-EMAIL** — Cron Sunday 18:00 user-local sends the weekly Dear Me letter via Resend. Pulls from existing `dearme-weekly-report` service.
- [ ] **DM-OPPORTUNITY-REPLY-INGEST** — When the user gets a reply to an outbound DearMe outreach, capture it (LinkedIn partner webhook / email reply hook) and surface in Decisions Needed.
- [ ] **DM-FOUNDER-DOGFOOD-PROOF** — Peter's own DearMe instance feeds the `dearme-public-feed` table on opt-in. Public marketing surface = the founder's own private brand team in action.

### Standing infinite work (do whenever idle)

- [ ] **autonomous-fix-loop:** run `pnpm dearme:status` weekly. If any gate that was green flips red, ship a slice to fix it. Otherwise pick the next P-tier item.
- [ ] **dependency-bump-loop:** weekly `pnpm outdated` → bump minor + patch versions in dependabot-style PRs. Major bumps wait for human review.
- [ ] **doc-freshness-loop:** when a slice ships, update INDEX.md "Shipped" section with one line + date.

---

## 4. RESERVED — Peter handles these (DO NOT touch)

These are blocked until Peter completes them. Do NOT try to do them yourself. When you hit one, queue the work that follows and pick a different P-item from §3 in the meantime.

| ID | Item | Why Peter |
|---|---|---|
| P-DNS | DNS records for `dearme.app` pointing at the chosen host | Registrar credentials |
| P-VERCEL | Vercel account, `vercel link` to repo, env vars set in dashboard | Personal credit card, account ownership |
| P-NEON | Provision Postgres on Neon, copy `DATABASE_URL` into Vercel env | Personal Neon account |
| P-STRIPE | Stripe Atlas account (LLC + bank), live API key, $29/mo Price, Webhook endpoint, Customer Portal enabled | Personal banking, ToS acceptance |
| P-VOYAGE | Voyage AI account, API key `pa-*` in Vercel env | Account ownership |
| P-RESEND | Resend account, domain `dearme.app` verified with 4 DNS records, API key | Account + DNS |
| P-LOOPS | Loops account, 5 event names pre-registered, API key | Account ownership |
| P-POSTHOG | PostHog Cloud project, project key in Vercel env | Account ownership |
| P-GOOGLE-OAUTH | Google Cloud OAuth client, redirect URI configured, client ID + secret in Vercel env | Account ownership |
| P-PLAIN | Plain account, workspace, API key, webhook secret in Vercel env | Account ownership |
| P-OWNER-FACTS | 3 owner-approved facts (LinkedIn endpoint + URN + iMessage recipient) | Owner approval required |
| P-CC-DOGFOOD | Peter pays $29 with his own card on Day 5 | Owner card |
| P-DESIGN-PARTNERS | 3-5 contacts for first outreach | Personal network |

When you finish all of §3 P0+P1 and ALL of §4 is still pending, you wait. Send a single Plain support thread to Peter every 24h: "Codex is idle. Reserved: [list of pending P-* items]. Picking next P2 item in the meantime."

---

## 5. Cross-cutting doctrine (NEVER violate)

These are the same rules from earlier docs but consolidated. If you find yourself wanting to violate one, stop and add to `CODEX-RUN-LEDGER.md` under "blocked":

1. **No Bedrock / no AWS LLM SDK.** Post-2026-05-02 incident. Use Voyage for embeddings + DearMe proxy for generation.
2. **No new top-level packages without justification.** The architecture is locked. New work fits into existing packages.
3. **No substrate language in customer surfaces.** Forbidden strings: `Paperclip`, `OpenClaw`, `Symphony`, `Bedrock`, `dm_sk_`, `Claude`, `GPT`, `Voyage`, model names. Tests enforce this; keep them passing.
4. **Migrations are additive only.** No DROP, no ALTER existing columns. New tables + nullable columns only. Renumber to the next free `NNNN_*.sql` slot.
5. **Approval gates stay.** publish / send / deploy / spend always require explicit approval. Don't auto-approve.
6. **No customer data in logs.** Even with redaction, prefer `userId` over `email`.
7. **Self-merge ok ONLY after CI green.** Read `feedback-internx-self-merge-authorized` if in doubt.
8. **One slice per PR.** No "while I'm here" cleanups in a feature PR.
9. **Tests grow monotonically.** If your PR drops the test count, revisit.
10. **No live network calls in tests.** Always stub fetch, DB, Stripe client, etc.

If a slice in §3 would force a violation, **skip it** and document why in `CODEX-RUN-LEDGER.md` under "deferred".

---

## 6. Daily report

Write one line per finished slice to `docs/dearme/CODEX-RUN-LEDGER.md`. Format:

```
2026-05-15 14:23  DM-DOCKERFILE-SERVER  ab12cd34  +3 tests  P0
```

End-of-day summary (UTC midnight): write a single short post to a Plain support thread titled "Codex daily — YYYY-MM-DD" with:
- Slices shipped today
- Slices blocked (and why)
- Open P-* reserved items still waiting on Peter
- Tomorrow's first slice

Plain thread settings: subject `Codex daily`, severity `low`. Peter checks once a day.

---

## 7. Stop conditions

You stop autonomously **only** if:

1. **All of §3 P0+P1+P2 is DONE** AND `pnpm dearme:goal-audit` says complete. (Unlikely for weeks.) Send a final "all caps shipped" Plain message.
2. **A change in `docs/dearme/CODEX-STOP-SIGNAL.md`** appears with the literal contents `STOP NOW`. Peter writes this when he wants to pause you. Reload this file on every wake.
3. **Three consecutive PRs fail CI** for the same reason and you cannot diagnose. Escalate to Peter via Plain with the failing CI log link. Wait for human.
4. **Repo write fails** (auth broken / org-level block). Escalate to Peter via Plain with the error.

Otherwise: never stop. Always have a slice in flight.

---

## 8. First-five-minutes-on-boot checklist

When your container first comes up:

```bash
# 1. Verify auth works
git fetch origin
gh auth status

# 2. Check the working branch is up-to-date
git checkout codex/dearme-dm-136-sample-demo-proof
git pull origin codex/dearme-dm-136-sample-demo-proof

# 3. Install deps once
pnpm install

# 4. Confirm baseline tests pass
pnpm --filter @paperclipai/dearme-openclaw test
pnpm --filter @paperclipai/dearme-mcp test
pnpm --filter @paperclipai/server test -- --run dearme  # if a test:run script exists

# 5. Read this token + the ledger
cat docs/dearme/CODEX-HANDOFF-TOKEN.md
cat docs/dearme/CODEX-RUN-LEDGER.md  # if exists; create empty if not

# 6. Pick the first OPEN P0 item from §3 and start
```

If step 4 fails: do NOT start shipping slices. Diagnose what changed. The baseline must be green before you add to it.

---

## 9. Canonical reading order (one-time, on boot)

After this token, read these in order:

1. `docs/dearme/INDEX.md` — north star, current state
2. `docs/dearme/INTEGRATED-ARCHITECTURE.md` — layer ownership + non-goals
3. `docs/dearme/SCALE-LAUNCH-AND-REVENUE-ARCHITECTURE.md` — capability matrix
4. `docs/dearme/ENGINEER-GOAL-FIRST-PAID-CUSTOMER.md` — the human-engineer version of this Goal
5. `docs/dearme/DEPLOY-RUNBOOK.md` — Vercel deploy path
6. `docs/dearme/PROVIDER-INTEGRATION-NOTES.md` — what each provider does
7. `docs/dearme/PRE-LAUNCH-CHECKLIST.md` — every box to tick before first outreach
8. `CLAUDE.md` (repo root) — broader doctrine if present

You don't need to memorize them. Bookmark them. Re-read on demand.

---

## 10. Promise back to Peter

When you boot, your first commit (after the readiness check passes) is creating `docs/dearme/CODEX-RUN-LEDGER.md` with a single line:

```
YYYY-MM-DD HH:MM  CODEX-BOOT  -  -  -  Container alive. Starting §3 P0-1.
```

That commit message: `Codex boot — beginning autonomous backlog from CODEX-HANDOFF-TOKEN`.

This proves to Peter you're alive without him having to log in to anything.

---

End of token. Now go ship.
