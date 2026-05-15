# DearMe Pre-Launch Checklist

Date: 2026-05-15
Use: tick off every item before sending the first outreach DM.

This is the operational tail of `ENGINEER-GOAL-FIRST-PAID-CUSTOMER.md`. Each item is ≤2 minutes to check.

---

## Infra (engineer)

- [ ] `dearme.app` resolves over HTTPS with a valid cert
- [ ] `curl https://dearme.app/healthz` returns 200
- [ ] `curl https://dearme.app/readyz` returns 200
- [ ] `pnpm dearme:prod-ready` exits 0 against the prod env
- [ ] DB migrations through `0086_dearme_public_feed` are applied
- [ ] Vercel/Render/Fly auto-deploy is wired (push to `main` → prod)
- [ ] Better Stack (or equivalent) uptime monitor pings `/readyz` every 1m
- [ ] PostHog dashboard renders, project key is live
- [ ] Sentry / error tracking captures a deliberate test exception
- [ ] DB backups configured (Neon auto-backup or `pg_dump` cron)
- [ ] Logs are searchable (Vercel logs / Render logs / external sink)

## Stripe (engineer + Peter)

- [ ] Stripe account is live (not just test mode)
- [ ] Bank account verified; first payout will succeed
- [ ] Product "DearMe Beta" exists with $29/month recurring price
- [ ] Webhook endpoint configured at `/v1/dearme/checkout/webhook`, signing secret matches env
- [ ] Test purchase with Stripe test card `4242 4242 4242 4242` succeeds in test mode
- [ ] Real $29 purchase in live mode succeeds (Day 5 dogfood)
- [ ] Customer Portal is enabled in Stripe settings
- [ ] Refund policy documented in `Terms.tsx`

## Channels (engineer + Peter)

- [ ] Resend domain verified (4 DNS records green)
- [ ] One transactional email sent to your own inbox via Resend
- [ ] Loops API key works (test event `dearme_signup` lands in Loops dashboard)
- [ ] Google OAuth flow works end-to-end (sign in with a real Google account)
- [ ] Plain inbox works (send test ticket, replies route back)
- [ ] The 3 owner facts captured (`pnpm dearme:next-proof` ran successfully)
- [ ] LinkedIn DM smoke sent + received on Peter's alt account
- [ ] iMessage smoke sent + received on Peter's alt number

## Customer surface (Peter to eyeball)

- [ ] Landing hero has no typos, the positioning sentence reads right
- [ ] Single-question input has the right placeholder ("What do you want to be known for?")
- [ ] Submit triggers PostHog `landing_cta_submitted` event
- [ ] First-cycle preview loads in <8 seconds
- [ ] Voice profile is created with at least 1 sample
- [ ] Workbench shows the first "Work Ready" card
- [ ] Footer links: Terms / Privacy / Acceptable Use all resolve
- [ ] Mobile (Safari iOS) view doesn't break — hero, input, CTA all readable
- [ ] No substrate language anywhere ("Paperclip", "OpenClaw", "Symphony", "dm_sk_", "Bedrock")
- [ ] No model names exposed ("Claude", "GPT", "voyage-3-lite") — show "DearMe AI" if needed

## Compliance (one-time)

- [ ] Terms.tsx and Privacy.tsx have a real US business entity name (Peter's LLC)
- [ ] Privacy Policy lists actual subprocessors: Stripe, Resend, Voyage, Anthropic via proxy, PostHog, Plain
- [ ] CAN-SPAM unsubscribe footer renders on transactional + lifecycle email
- [ ] GDPR export endpoint returns valid JSON for a test company
- [ ] GDPR delete endpoint scrubs PII for a test company
- [ ] No customer data ever logged unredacted (search logs for `@gmail.com`, `@icloud.com`)

## Cost guard (one-time)

- [ ] `DEARME_DISABLE_BEDROCK=1` set in prod (post-2026-05-02 incident lock)
- [ ] No `@aws-sdk/client-bedrock` in the deployed bundle (search `pnpm-lock.yaml`)
- [ ] Per-customer cost-cap defaults from DM-TIERS apply at company creation
- [ ] Auto-pause email fires when a test customer is forced over their daily cap
- [ ] Voyage embeddings cost is monitored (Voyage dashboard alarm at $20/month)
- [ ] Stripe Tax is enabled (or you're filing manually)

## Outreach (Peter)

- [ ] Peter has paid $29 to himself (Day 5)
- [ ] Peter has read all 5 outreach templates
- [ ] First 5 design-partner names + LinkedIn / email gathered
- [ ] Outreach Day in calendar (Day 6)

## Day-1-of-real-customers monitoring (engineer)

- [ ] PostHog dashboard pinned: landing_viewed → cta_submitted → first_cycle_started → first_payment
- [ ] Plain inbox open, notifications on phone
- [ ] Stripe Dashboard tab pinned, payment alerts on
- [ ] Slack/Discord channel for "DearMe ops" exists for the first week
- [ ] Engineer is reachable within 2 hours during business hours of customers #1-5

---

## After every box is ticked

You may invite the first 5 customers. Not before.

Reminder: the engineer's Goal completes when DoD items 1-5 in `ENGINEER-GOAL-FIRST-PAID-CUSTOMER.md` are all witnessed. This checklist is the operational tail — it's NOT a substitute for the DoD.
