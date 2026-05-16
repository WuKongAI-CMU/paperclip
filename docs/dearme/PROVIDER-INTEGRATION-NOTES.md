# Provider Integration Notes

Date: 2026-05-15
Audience: engineer plugging in the 7 third-party providers DearMe depends on.

For each: signup URL, dashboard URL, free tier limit, gotcha, env var, where the code uses it.

---

## 1. Stripe (payments)

- **Signup:** https://stripe.com / https://stripe.com/atlas (entity + bank in one)
- **Dashboard:** https://dashboard.stripe.com
- **API keys:** https://dashboard.stripe.com/apikeys
- **Webhook setup:** https://dashboard.stripe.com/webhooks
- **Free tier:** No SaaS fee; takes 2.9% + 30¢ per successful charge
- **Gotcha:** Test mode (`sk_test_*`) is a different env from live mode (`sk_live_*`). Use test in staging, live in prod. The webhook signing secret is per-endpoint per-mode — they're different strings.
- **Env:** `DEARME_STRIPE_SECRET_KEY`, `DEARME_STRIPE_WEBHOOK_SECRET`, `DEARME_STRIPE_PRICE_BETA`
- **Code:** `server/src/services/dearme-stripe-checkout.ts` (call sites + webhook)
- **What to set up:**
  1. Live mode toggle on
  2. Create Product "DearMe Beta" → Recurring → $29 USD / month → save the `price_*`
  3. Webhook endpoint `https://dearme.app/v1/dearme/checkout/webhook`, events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
  4. Enable Customer Portal in Settings → Billing → Customer Portal
  5. (Later) Enable Stripe Tax to auto-collect VAT / sales tax

---

## 2. Voyage AI (embeddings — voice fingerprint)

- **Signup:** https://www.voyageai.com / dashboard at https://dash.voyageai.com
- **API keys:** https://dash.voyageai.com/api-keys
- **Free tier:** $0.05 per 1M tokens for `voyage-3-lite`. Effectively free at our scale (< $10/month even at 1000 active users).
- **Gotcha:** API key starts with `pa-` not `sk-`. Don't confuse with Stripe.
- **Env:** `DEARME_VOICE_VOYAGE_API_KEY`, `DEARME_VOICE_SEMANTIC_SCORER=voyage`
- **Code:** `server/src/services/dearme-voice-voyage-scorer.ts`
- **What to set up:** create a key, paste it, set the scorer flag, redeploy. Done.

---

## 3. Resend (transactional email)

- **Signup:** https://resend.com
- **Dashboard:** https://resend.com/emails
- **Free tier:** 100/day, 3000/month
- **Gotcha:** Domain verification needs 4 DNS records (SPF, DKIM, MX, DMARC). Email sends from unverified domains land in spam.
- **Env:** `DEARME_EMAIL_RESEND_API_KEY`, `DEARME_EMAIL_FROM=team@dearme.app`, `DEARME_EMAIL_REPLY_TO=peter@dearme.app`
- **Code:** `server/src/services/dearme-send-email-dispatch.ts`
- **What to set up:**
  1. Add domain `dearme.app`
  2. Drop the 4 DNS records into your DNS panel
  3. Wait 5-10 min, click "Verify"
  4. Create API key (key starts `re_`)
  5. Send yourself a test email from the dashboard

---

## 4. Loops (lifecycle email)

- **Signup:** https://loops.so
- **Dashboard:** https://app.loops.so
- **API keys:** https://app.loops.so/settings/api
- **Free tier:** 1000 contacts
- **Gotcha:** Loops uses **event-based** triggers. Pre-create your event names in Loops *before* DearMe pushes them, or events go to a "pending" bucket and never fire.
- **Env:** `DEARME_LOOPS_API_KEY`
- **Code:** `server/src/services/dearme-lifecycle.ts`
- **What to set up:**
  1. Create API key
  2. Pre-register these event names under "Events":
     - `dearme_signup`
     - `dearme_first_payment`
     - `dearme_renewal`
     - `dearme_cancelled`
     - `dearme_trial_ending`
  3. (Later) Set up a 5-email welcome sequence on `dearme_signup`

---

## 5. PostHog (analytics + feature flags)

- **Signup:** https://posthog.com
- **Dashboard:** https://us.posthog.com (or EU)
- **API keys:** project settings → "Project API Key" (`phc_*`)
- **Free tier:** 1M events/month
- **Gotcha:** The browser key (`VITE_POSTHOG_KEY`) is exposed publicly in the bundle — that's normal for PostHog. Don't put a *secret* key in `VITE_*`. For server-side captures, use the same `phc_*` (it's the project key, not a secret).
- **Env:** `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `DEARME_POSTHOG_KEY`
- **Code:** `ui/src/lib/analytics.ts` (browser), `server/src/services/dearme-analytics.ts` (server)
- **What to set up:**
  1. Create project "DearMe Prod"
  2. Copy the project API key
  3. Create dashboard with these events: `landing_viewed`, `landing_cta_submitted`, `first_cycle_started`, `dearme_first_payment`
  4. Configure a funnel visualization

---

## 5a. Sentry (error monitoring)

- **Signup:** https://sentry.io
- **Free tier:** enough for launch error monitoring
- **Gotcha:** Browser DSNs are public. Keep `SENTRY_AUTH_TOKEN` only in CI secrets for source-map upload.
- **Env:** `DEARME_SENTRY_DSN`, `VITE_DEARME_SENTRY_DSN`, `DEARME_SENTRY_ENVIRONMENT`, `VITE_DEARME_SENTRY_ENVIRONMENT`
- **CI vars/secrets:** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- **Code:** `server/src/sentry.ts`, `ui/src/lib/sentry.ts`, `ui/vite.config.ts`
- **What to set up:**
  1. Create project "DearMe Prod"
  2. Copy the server and browser DSN into env
  3. Create an auth token that can upload source maps
  4. Set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` in GitHub Actions

---

## 6. Google OAuth (self-serve signin)

- **Console:** https://console.cloud.google.com/apis/credentials
- **Free:** unlimited at our scale
- **Gotcha:** Production OAuth needs verification by Google if you request sensitive scopes. `openid email profile` is fine without verification.
- **Env:** `DEARME_GOOGLE_OAUTH_CLIENT_ID`, `DEARME_GOOGLE_OAUTH_CLIENT_SECRET`
- **Code:** `server/src/auth/better-auth.ts` (Google provider config)
- **What to set up:**
  1. Create new OAuth 2.0 client (type: web)
  2. Authorized JavaScript origin: `https://dearme.app`
  3. Authorized redirect URI: `https://dearme.app/api/auth/callback/google`
  4. Add `dearme.app` to OAuth consent screen → Authorized domains
  5. App name "DearMe", user support email, scopes `openid email profile`

---

## 7. Plain (support inbox)

- **Signup:** https://plain.com
- **Dashboard:** https://app.plain.com
- **API keys:** https://app.plain.com/settings/api-keys
- **Free tier:** 100 conversations/month
- **Gotcha:** Plain has a GraphQL API plus webhooks. We use GraphQL for creates + REST-style webhook for inbound. Webhook signature uses HMAC-SHA256 — match the secret exactly.
- **Env:** `DEARME_PLAIN_API_KEY`, `DEARME_PLAIN_WEBHOOK_SECRET`
- **Code:** `server/src/services/dearme-support.ts`
- **What to set up:**
  1. Create workspace "DearMe"
  2. Create API key with `customer:read,write` + `thread:read,write`
  3. Configure webhook → `https://dearme.app/v1/dearme/support/webhook`, events: `thread.message_received`, `thread.priority_changed`
  4. Copy the webhook signing secret

---

## Health-check / status page (Better Stack — optional)

- **Signup:** https://betterstack.com
- **Free tier:** 10 monitors, 1 status page
- **Set up:**
  1. Monitor: HTTP `https://dearme.app/readyz`, check every 1 min, expect 200
  2. Status page: subdomain `status.dearme.app`, attach the monitor
- **DNS:** CNAME `status` → `<betterstack-hash>.betteruptime.com`

---

## What you do NOT need to set up

These third-party slots in the architecture have NOT shipped yet — don't try to wire them on Day 1:

- ❌ Stripe Connect (reseller / GMV-share) — clawdbob has it, DearMe doesn't yet
- ❌ Sentry — recommended for week 2, not Day 1
- ❌ Cloudflare Workers / edge functions — Vercel covers what we need
- ❌ DataDog / NewRelic — PostHog + Vercel logs are enough at <1000 users
- ❌ Segment / Rudderstack — PostHog ingests directly
- ❌ Twilio / Telnyx — DearMe uses iMessage via OpenClaw gateway, not SMS
- ❌ Crisp / Intercom — Plain is the chosen support tool

---

## Quick cost projection at 50 paid customers

| Provider | Monthly cost | Free-tier headroom |
|---|---|---|
| Stripe | $43.50 (2.9%+30¢ × 50 × $29 ≈ 5% effective) | n/a |
| Voyage | ~$2 | ~99% headroom |
| Resend | $20 (paid tier — > 3000/mo) | upgrade required |
| Loops | $49 (50-1000 contact paid tier) | upgrade at 100+ |
| PostHog | $0 | 1M events; we'd use ~50k |
| Google OAuth | $0 | unlimited |
| Plain | $0 (under 100 convos) | upgrade at 100+ |
| Vercel | $20 (Pro tier) | needed for SSR concurrency |
| Neon | $19 (Pro tier) | needed for prod-grade |
| **Total fixed** | **~$155/mo** | |
| **At 50 × $29 MRR = $1450** | | **~89% gross margin** |

That's roughly the architecture's revenue math. Validate against real PostHog data after 5 customers.
