# Codex Course Correction — 2026-05-16

Issued by: PM+architect (Claude session)
Read this before your next slice. **This file overrides §3 of `CODEX-HANDOFF-TOKEN.md` until Peter unblocks the 7 reserved items.**

---

## What you've done well (acknowledged)

- 73 PRs today, 97 ledger entries total. CI green throughout.
- P0 + P1 backlog is essentially **done**: Dockerfile, docker-compose, migration boot, structured logging + redaction, rate-limit, security headers, CORS prod-mode, session-cookie hardening, Stripe idempotency stress tests, Sentry, voice-sample UI, voice-calibration loop, slow-query log, SSE reconnect, weekly-letter cron, support-SLA cron, standing-loop audit.
- Discipline is exemplary: atomic commits, self-merge only on green, ledger maintained, doctrine respected (no Bedrock, no substrate leakage, no force-push).

**Result**: DearMe is now a deployable, monitored, hardened application. Architecture-wise, you are done with launch prep.

---

## What you've drifted into (this stops now)

The last ~30 PRs (#67 through #96) are the same shape: re-wording one of these 5 internal CLI commands —

```
pnpm dearme:status
pnpm dearme:goal-audit
pnpm dearme:release-gate
pnpm dearme:next-proof
pnpm dearme:proof
pnpm dearme:daily-summary
```

Adding `live confirmation label`, `human-help queue pointer`, `owner-facts wording`, `local-day formatting`, `regression scan-clean` …

**This is a low-value cleanup loop.** It does not move:
- the number of `dearme.app` visitors
- the conversion to signup
- the conversion to $29 paid
- the retention of paid customers

It moves the wording of internal operator commands that only Peter reads. After 30 PRs of this, the marginal value per additional PR is ~zero.

**No more wording-only PRs against these 6 commands.** If a PR's diff is mostly label / message / wording changes to those CLIs, do NOT ship it. Close it. Pick something else.

---

## Why you drifted

Looking at the pattern: the 7 reserved P-items (DNS / Vercel / Neon / Stripe Atlas / 3 owner facts / card / design partners) are all owned by Peter. You correctly identified that you can't deploy without them. So you retreated to the safest work available: polishing the CLI commands that surface those blockers.

**That was the right intent. But the action was wrong.** When all unblocking work needs a human, you should:

1. Pick from the **product-visible P2 backlog** (below) — work that compounds when launch unblocks
2. Cap polishing PRs hard (max 5 since this file lands)
3. Pause cleanly, with a daily Plain status, until Peter unblocks

---

## New backlog (replaces §3 P2 in CODEX-HANDOFF-TOKEN.md)

Every item below must, by its own DoD, move at least one of:
- (a) increase landing → signup conversion
- (b) increase signup → first-cycle-completed
- (c) increase first-cycle → $29 paid
- (d) increase paid → next-month-renewal

If a PR's DoD does not name one of (a)/(b)/(c)/(d), it's the wrong PR.

### Wave A — customer-facing surface (start here)

- [ ] **DM-LANDING-COPY-V2** — Re-write hero, sub-hero, "what it does", and CTA from a reader's perspective. Peter's `INDEX.md` § 1 positioning sentence stays as anchor, but the rest is fresh. Read it aloud — if it sounds like a doc, redo it. Add 3 concrete proof artifacts above the fold (sample weekly letter excerpt, sample voice profile excerpt, sample opportunity card). Lighthouse stays green. Mobile-first. PR description names which of (a)/(b) it moves.

- [ ] **DM-ONBOARDING-FRICTION-AUDIT** — Run the full landing → signup → first-cycle path 10 times in headless playwright with intentionally-realistic user input (typos, browser back button, mobile, slow network, tab-switch mid-form). List every friction point. Ship ONE PR that fixes the top 3 frictions (could be: faster preview, better empty states, clearer error messages, autofocus, copy in voice). Don't fix everything — fix the top 3 and move on.

- [ ] **DM-PRICING-PAGE-V2** — `/pricing` today is bare. Add: invite waitlist signup (collects email, fires PostHog event `pricing_waitlist_joined`), FAQ accordion (5 questions from Plain inbox patterns or anticipated objections), 3-day-trial CTA, "see the product first" link back to landing. No fake testimonials. PR description names which of (a)/(b)/(c) it moves.

- [ ] **DM-FAQ-FROM-OBJECTIONS** — Write a real FAQ page from the 10 most likely objections of the ICP (solo operator, $29/mo, AI doing outbound on their account). Don't dodge the hard ones (LinkedIn safety, voice drift, what happens if I cancel, can I export). Each answer is 2-3 sentences max. Read like a human, not a lawyer.

- [ ] **DM-ABOUT-FOUNDER** — `/about` page with Peter's actual story. Why DearMe exists, what problem it solved for him personally, who it's NOT for. This is the trust page. Should NOT mention Bedrock, OpenClaw, Paperclip, or any substrate.

### Wave B — conversion infrastructure (after Wave A)

- [ ] **DM-AB-LANDING-HERO** — 3 hero variants behind PostHog feature flag. Variant 1 = current. Variant 2 = "before/after" framing. Variant 3 = "your weekly letter samples" lead. Auto-pick winner after 200 visitors per variant.

- [ ] **DM-ANALYTICS-FUNNEL** — PostHog dashboard JSON in `docs/dearme/ops/posthog-funnel.json`. Funnel events: `landing_viewed` → `landing_cta_submitted` → `signup_started` → `signup_completed` → `first_cycle_started` → `first_cycle_completed` → `pricing_viewed` → `checkout_started` → `checkout_completed`. Conversion target percentages baked in. PR description: target conversion at each step.

- [ ] **DM-REFERRAL-UI** — `/dearme/refer` page where a paid user mints + copies their referral code (existing `dearme-referral` service). Share-to buttons (X, LinkedIn, copy link). Email template ("a friend invited you to DearMe — 30% off your first month"). PR description: target % of paid users who mint a code.

- [ ] **DM-EXIT-INTENT-WAITLIST** — When a landing visitor moves cursor to leave, soft modal "want a 5-minute preview emailed to you?" → captures email → Loops `dearme_landing_exit` event. No dark patterns; one-tap dismiss. PR description: target email capture rate from exits.

### Wave C — retention infrastructure (after Wave B + first 10 paid customers)

- [ ] **DM-WEEKLY-LETTER-QUALITY** — Take 10 sample weekly letters from real (or peter-dogfooded) customers. Grade each on: voice match, specificity, actionability, length. Ship ONE PR that improves the worst dimension. Don't over-engineer; this is iterative.

- [ ] **DM-PUBLIC-DOGFOOD-FEED** — When Peter opts in to `dearme-public-feed`, his account's published content (X posts, deployed sites) appears on a public `/feed` page. This becomes the "see DearMe in action" marketing surface. No customer feed appears without opt-in.

- [ ] **DM-OPPORTUNITY-REPLY-INGEST** — When a customer's outbound DM gets a reply, capture it (LinkedIn partner webhook or email reply hook) and surface in Decisions Needed. This is the "DearMe noticed someone replied to your DM" moment — high emotional value, drives retention.

- [ ] **DM-CHURN-SAVE-EMAIL** — When `customer.subscription.deleted` webhook fires, Loops sends a "we'll miss you — what didn't work?" with a single reply-to-this-email CTA. Replies route to Plain. Track save rate.

- [ ] **DM-IMPORT-EXISTING-VOICE** — If a new user has a LinkedIn/Twitter/personal-blog URL, fetch their last 20 posts as voice samples on signup. Reduces time-to-first-good-output. Bedrock-free; use the existing fetch dispatcher.

---

## Hard caps on polishing

Until Peter unblocks the 7 reserved items:
- **Max 5 wording-only PRs** total against status / goal-audit / release-gate / next-proof / proof / daily-summary (in aggregate, not 5 per command).
- If you exceed 5, **stop and wait**.
- The 5 budget counts toward fixing genuine bugs surfaced by users or CI — not preference-tuning.

---

## Wait-state behavior (when no Wave A/B/C item is shippable)

If you literally have nothing in Wave A/B/C that you can ship without Peter's input:

1. Write a Plain message titled "Codex idle — waiting on Peter (YYYY-MM-DD)":
   ```
   Codex idle. Waiting on:
   - DNS for dearme.app
   - Vercel project link
   - Postgres on Neon
   - Stripe Atlas live keys
   - 3 owner facts: DEARME_LINKEDIN_DM_MESSAGES_URL, DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN, DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT
   - Peter's first $29 dogfood purchase
   - List of 5 design-partner contacts

   When you've unblocked any of these, send me the value and I'll resume.
   ```

2. **Sleep**. Do not ship more polishing PRs to fill the silence.

3. Wake every 6 hours, re-pull, re-read this file, re-read `CODEX-STOP-SIGNAL.md`. If still nothing shippable in Wave A/B/C, sleep again.

This is the right behavior. Silence is not failure. Polishing the CLI for the 31st time **is** failure.

---

## Doctrine reminders (unchanged)

All §5 doctrine in `CODEX-HANDOFF-TOKEN.md` still applies:
- No Bedrock, no substrate language, additive migrations, approval gates, no live network in tests, etc.

What this document ADDS:
- 11. **Every PR must move (a)/(b)/(c)/(d).** If you can't say which, don't ship.
- 12. **Max 5 polishing PRs until Peter unblocks.**
- 13. **Sleep on empty queue is correct.** Polishing to fill silence is wrong.

---

## End of correction

Pick the next item from Wave A. Ship it. Update the ledger. If the ledger ever shows 3 consecutive PRs that don't move (a)/(b)/(c)/(d), you've drifted again — re-read this file.
