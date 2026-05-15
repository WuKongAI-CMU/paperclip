# DearMe Deploy Runbook

Date: 2026-05-15
Audience: engineer executing `ENGINEER-GOAL-FIRST-PAID-CUSTOMER.md`

Goal of this doc: give you a one-shot deploy path for `dearme.app` so you don't spend Day 1 picking a platform.

---

## Platform pick (one of)

| Option | Strength | Cost | Pick if |
|---|---|---|---|
| **Vercel (recommended)** | Best Vite + Express SSR ergonomics, edge functions, instant DNS | $0 hobby, $20/mo Pro | You want the fastest path |
| Render | Cleaner DB + cron + worker model | $7/mo web + $7/mo Postgres | You want one provider for app + DB |
| Fly.io | Cheapest at scale, edge by default | ~$3/mo idle | You want global edge, ok with more ops |

This runbook covers **Vercel**. The other two are similar in shape.

---

## Pre-flight (do once, ever)

1. **Buy / verify domain.** `dearme.app` registered with Cloudflare / Namecheap / wherever. Confirm you control the DNS panel.
2. **Stripe Atlas (if not done):** https://stripe.com/atlas — DearMe LLC with bank attached. Without this, you can hold $29 but cannot pay it out.
3. **Provision Postgres on Neon:** https://console.neon.tech → new project `dearme-prod` → copy connection string into `.env.production.local`.
4. **Verify your `.env.production.local`** with the validator:
   ```bash
   pnpm dearme:prod-ready
   ```
   Don't proceed until exit code 0.

---

## Day 1 — deploy frontend + backend to Vercel

```bash
npm i -g vercel
vercel login

# Link this repo to a new Vercel project
cd ~/dearme
vercel link --project dearme --yes

# Add env vars to Vercel from your local file
vercel env pull .env.production.local-pulled
# Or paste them via the dashboard at https://vercel.com/dashboard/project/dearme/settings/environment-variables

# Deploy preview, then prod
vercel               # preview URL
vercel --prod        # deploys to dearme.app once DNS points
```

### DNS records to add

```
A      @     76.76.21.21
CNAME  www   cname.vercel-dns.com
```

Vercel will guide you through SSL provisioning. Wait ~5 minutes for DNS propagation.

### Sanity checks

```bash
curl -sS https://dearme.app | grep -F "DearMe is a private AI growth team"
curl -sS https://dearme.app/healthz
curl -sS https://dearme.app/readyz
```

All three must return 200.

---

## Day 2 — Postgres + migrations

```bash
# Set DATABASE_URL to the Neon prod connection string (use the *pooled* one
# for serverless functions, *direct* for migrations).
export DATABASE_URL_DIRECT=postgres://...neon.tech/...?sslmode=require

# Apply all migrations
DATABASE_URL=$DATABASE_URL_DIRECT pnpm db:migrate

# Verify the highest migration applied
psql $DATABASE_URL_DIRECT -c "SELECT tag FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1;"
# Expected: 0086_dearme_public_feed
```

---

## Day 3 — Provider credentials

Run `pnpm dearme:prod-ready -- --json` after EACH provider configured. Stop when exit code is 0.

For each provider, the steps are:

1. **Stripe** — create the $29/mo recurring Price, copy the `price_*` id. Set up webhook endpoint at `https://dearme.app/v1/dearme/checkout/webhook`, copy the `whsec_*` to env.
2. **Voyage** — sign up at https://voyageai.com, create API key, set `DEARME_VOICE_VOYAGE_API_KEY` and `DEARME_VOICE_SEMANTIC_SCORER=voyage`.
3. **Resend** — sign up at https://resend.com, add `dearme.app` as a verified domain (drop 4 DNS records: SPF, DKIM, MX, DMARC), create API key.
4. **Loops** — sign up at https://loops.so, create API key, pre-register the 5 event names listed in `.env.production.example`.
5. **PostHog** — sign up at https://posthog.com, copy project key into both `VITE_POSTHOG_KEY` (browser) and `DEARME_POSTHOG_KEY` (server).
6. **Google OAuth** — at https://console.cloud.google.com/apis/credentials, create OAuth 2.0 client, add redirect URI `https://dearme.app/api/auth/callback/google`, copy client ID + secret.
7. **Plain** — sign up at https://plain.com, create API key, set webhook at `https://dearme.app/v1/dearme/support/webhook`.

Redeploy after env vars change: `vercel --prod`.

---

## Day 4 — Owner facts (Peter)

```bash
# Locally in the repo, capture the 3 facts:
pnpm dearme:next-proof -- --target linkedin_dm
pnpm dearme:next-proof -- --target openclaw_messages

# Then the guarded live smokes:
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm dearme:provider-smoke -- --target linkedin_dm --live
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm dearme:provider-smoke -- --target openclaw_messages --live

# Set on Vercel too:
vercel env add DEARME_LINKEDIN_DM_MESSAGES_URL production
vercel env add DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN production
vercel env add DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT production
vercel --prod  # redeploy
```

---

## Day 5 — Founder dogfood

1. Open `https://dearme.app` in an incognito window (you're a fresh user).
2. Answer the positioning question.
3. Sign up with Google OAuth.
4. Watch the first-cycle preview render.
5. Click "Upgrade to Beta" → Stripe Checkout opens.
6. Pay $29 with your card.
7. Land back on `dearme.app` → workbench shows the first prepared output.

Verify:

```bash
psql $DATABASE_URL -c "SELECT email, granted_at FROM dearme_paid_beta_access ORDER BY granted_at DESC LIMIT 1;"
psql $DATABASE_URL -c "SELECT event_kind, amount_usd_micros FROM finance_events ORDER BY created_at DESC LIMIT 1;"
```

Stripe Dashboard → Payments → first payment shows $29 → confirmation email lands in your inbox.

If any of these fail, fix the broken link before inviting customer #1.

---

## Day 6 — First 5 customers

Use the outreach templates in `OUTREACH-TEMPLATES.md`. Track in PostHog.

If 3 of 5 sign up and 1 of those 3 pays, the Goal is met — you've validated the funnel works at >0% conversion.

---

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `dearme.app` returns 404 | DNS not propagated | Wait 15min or `dig dearme.app` to confirm |
| Stripe webhook returns 400 | wrong `whsec_*` | Re-copy from dashboard |
| `/readyz` returns 503 | DB unreachable | Check Neon firewall + connection-pooler URL |
| Voice gate fails-closed | `DEARME_VOICE_VOYAGE_API_KEY` missing | Set it + redeploy |
| Customer Checkout succeeds but no access | webhook didn't fire | Check Stripe Dashboard → Webhooks → recent events; click "Resend" |
| Landing page shows substrate strings | leaked through a render | Check `DearMeLanding.test.tsx` — it should have caught it |
| `posthog-js` missing | `pnpm install` not run after merge | Re-run install + redeploy |

---

## Rollback

```bash
vercel rollback        # interactive — pick the previous deployment
```

For DB: migrations are additive only (doctrine). Rollback = leave the columns; new code just doesn't reference them.

---

## After the Goal completes

Next bounded Goal candidate: **"5 → 50 paid customers in 30 days"** — use the same template (one sentence + 5 DoD + 6-day sprint + non-goals + owner unblockers).

Track: weekly cohort retention, voice gate accept rate, support response p50, MRR.
