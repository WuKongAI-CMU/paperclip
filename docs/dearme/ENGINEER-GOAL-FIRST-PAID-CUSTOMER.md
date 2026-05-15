# Engineer Goal — First Paid Customer

Date: 2026-05-15
Owner: Peter (one-line directive) + engineer (execution)
Status: **handoff** — architecture + code is in tree. This Goal turns it into production revenue.

---

## The Goal (one sentence)

**Take DearMe from "code in tree" to "first $29 paid via dearme.app" in 14 days.**

This is not a coding goal. The code already exists. This is a **deployment + integration + configuration + first-customer goal**.

---

## Why this Goal exists

Over the last few rounds we shipped:

- **Architecture:** `INDEX.md`, `INTEGRATED-ARCHITECTURE.md`, `CLAWDBOB-ABSORPTION-PLAN.md`, `SCALE-LAUNCH-AND-REVENUE-ARCHITECTURE.md`, `LITTLEBIRD-COMPETITOR-AUDIT.md`
- **Code (~16 slices, 130+ tests):** dm-cb-01/02/03/04/05, dm-checkout, dm-voice-live, dm-cost-caps, dm-landing, dm-google-oauth, dm-tiers, dm-subscriptions, dm-lifecycle-email, dm-posthog, dm-legal-and-canspam, dm-linkedin-warmup, dm-auto-pause, dm-referral, dm-gdpr, dm-support-inbox, dm-public-feed
- **DB:** migrations 0079-0086

Everything is on branch `codex/dearme-dm-136-sample-demo-proof`. All tests green. None of it is **deployed, configured, or earning**. That's what this Goal fixes.

---

## Definition of Done (verifiable, ordered)

The Goal is complete when ALL of these are true and witnessed:

1. **`dearme.app` resolves to the merged code.** Public HTTPS landing page renders the hero positioning sentence, the single-question input, and the 3 legal-page footer links.
2. **One real customer has paid $29 through hosted Stripe Checkout**, with the webhook successfully:
   - recording the receipt in `finance_events`
   - opening `dearme_paid_beta_access`
   - pushing `dearme_first_payment` to Loops
3. **That customer's first cycle ran end-to-end**:
   - first-cycle preview produced (`previewFirstCycle`)
   - voice profile token written (`dearme_voice_profiles`)
   - at least one prepared output landed in their workbench (`Work Ready`)
4. **Cost-cap + auto-pause is real:** the customer's `dearme_cost_caps` row exists with the tier defaults from DM-TIERS, and a deliberate over-cap test triggers `auto-pause` + email (verify on staging or with a low test cap).
5. **PostHog dashboard shows the funnel:** `landing_viewed → landing_cta_submitted → first_cycle_started → dearme_first_payment` events from real traffic, not synthetic.

Verification command after each step:

```bash
pnpm dearme:status              # locally
pnpm dearme:goal-audit -- --check
curl https://dearme.app | grep "DearMe is a private AI growth team"   # landing live
```

---

## Sprint plan (14 days, ~6 working days of actual work)

### Day 1 — DNS + deploy pipeline

- Configure `dearme.app` DNS at the registrar to point at the chosen host (Vercel / Netlify / Render — pick one)
- Set up the build pipeline:
  - `pnpm build` for ui + server
  - Deploy via the chosen platform's CLI or GitHub integration
- Confirm `https://dearme.app` returns a 200 with the landing page HTML

### Day 2 — Database + migrations on prod

- Provision Postgres (Neon / Supabase / Railway)
- Run `pnpm db:migrate` against the prod connection string
- Confirm migrations 0001–0086 applied (`SELECT tag FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;` returns `0086_dearme_public_feed`)

### Day 3 — Provider credentials configured

For each provider, get a live API key and set the env var on prod:

| Provider | Env var | Where it goes | Cost |
|---|---|---|---|
| Stripe | `DEARME_STRIPE_SECRET_KEY` + `DEARME_STRIPE_WEBHOOK_SECRET` + `DEARME_STRIPE_PRICE_BETA` | Subscription mode product at $29/mo | free until activity |
| Voyage AI | `DEARME_VOICE_VOYAGE_API_KEY` + `DEARME_VOICE_SEMANTIC_SCORER=voyage` | enables real voice scoring | ~$0.05/1M tokens |
| Resend | `DEARME_EMAIL_RESEND_API_KEY` + domain DNS | transactional email | free under 100/day |
| Loops | `DEARME_LOOPS_API_KEY` | lifecycle email | free under 1k contacts |
| PostHog | `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` + `DEARME_POSTHOG_KEY` | product analytics | free under 1M events/mo |
| Google OAuth | `DEARME_GOOGLE_OAUTH_CLIENT_ID` + `DEARME_GOOGLE_OAUTH_CLIENT_SECRET` | self-serve signin | free |
| Plain | `DEARME_PLAIN_API_KEY` + `DEARME_PLAIN_WEBHOOK_SECRET` | support inbox | free under 100 convos |

Configure Stripe webhook endpoint to point at `https://api.dearme.app/v1/dearme/checkout/webhook`.

### Day 4 — Owner-supplied facts (Peter)

Capture the 3 facts that block live channel delivery:

```bash
pnpm dearme:next-proof -- --target linkedin_dm        # captures LinkedIn endpoint + recipient
pnpm dearme:next-proof -- --target openclaw_messages  # captures iMessage recipient
```

Then run the guarded smokes once:

```bash
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm dearme:provider-smoke -- --target linkedin_dm --live
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm dearme:provider-smoke -- --target openclaw_messages --live
```

This step requires Peter's input. Engineer cannot self-supply these.

### Day 5 — Founder dogfood

Peter is customer #0 — sign up at `dearme.app`, run through first cycle, pay $29 with own card. Verify webhook→access→workbench loop. This is the real DoD step 2-3 above.

### Day 6 — First external customer + buffer

- Pick 3-5 design partners from Peter's network. Send personal invite with the URL.
- Watch PostHog funnel. Fix anything broken.
- Hit DoD step 5.

Days 7-14: buffer + iteration based on real customer feedback.

---

## Explicit non-goals (DON'T do these)

These would all be reasonable but are NOT in scope:

- ❌ **Don't add new features.** All code is already shipped. If a feature is missing, it's because we decided not to ship it yet. Adding more code delays revenue.
- ❌ **Don't add Bedrock or any AWS LLM SDK.** Voyage handles embeddings. Anthropic via DearMe proxy handles generation. (See `project-aws-bedrock-incident-2026-05-02` memory.)
- ❌ **Don't refactor the substrate.** Paperclip is below the waterline; do not re-architect.
- ❌ **Don't build your own analytics/support/status page/email-sequencer.** Use PostHog, Plain, Better Stack, Loops as listed.
- ❌ **Don't open-source DearMe.** Repo is private; consume OpenClaw OSS but never publish Intern/DearMe code.
- ❌ **Don't expose substrate names** (`Paperclip`, `OpenClaw`, `Symphony`, `Bedrock`, `dm_sk_`) in any customer-facing surface. The existing tests catch some of these — keep them passing.
- ❌ **Don't skip approval gates.** The 4-gate model (publish / send / deploy / spend) stays.

---

## What Peter must provide (the unblockers)

The engineer cannot deliver this Goal without:

1. **DNS control** of `dearme.app` (or delegated subdomain)
2. **Hosting account credentials** for the chosen platform
3. **Postgres connection string** (or auth to provision)
4. **Stripe Atlas / Stripe account** with bank attached for payouts
5. **The 3 owner-approved facts** (LinkedIn endpoint + URN, iMessage recipient)
6. **Credit card** to make the founder-dogfood $29 purchase
7. **List of 3-5 design partners** to invite as customers #1-#5

If any of (1)-(6) are missing on Day 1, the Goal can't start. Peter should pre-provision these before handoff.

---

## How the engineer reports progress

Daily, in the same channel:

- DoD checkbox status (1–5)
- Today's blocker
- Tomorrow's plan
- Anything that needs Peter

When all 5 DoD items are met, the engineer pings Peter with the verification commands' output as proof. Peter accepts → Goal complete.

---

## Why this Goal works

1. **Bounded.** 14 days, 5 measurable outcomes, no scope creep.
2. **Reuse-first.** Every external dep is a third-party service we're paying to NOT build (站在巨人的肩膀上).
3. **Forces revenue path.** The first paid customer is the DoD, not an intermediate metric.
4. **Splits Peter vs engineer roles cleanly.** Peter provides facts + credentials + 5 customers. Engineer provides deployment + integration + verification.
5. **Survives the 4 non-goals.** No bedrock, no open-source, no refactor, no new features.

If the engineer wants to extend after this Goal completes, they should propose the next bounded Goal (e.g., "5 → 50 paid customers in 30 days") with the same template.
