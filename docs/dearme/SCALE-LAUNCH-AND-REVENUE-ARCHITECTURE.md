# DearMe Scale-Launch and Revenue Architecture

Date: 2026-05-14
Owner: PM + product architect
Status: **canonical** — every scale/revenue capability maps to *reuse* (donor or third-party) or *bounded build*. New build justifies why no reuse fits.

## Doctrine: "站在巨人的肩膀上"

This doc enforces three rules:

1. **Reuse over build.** Each capability lands in one of three buckets:
   - **R1 — Donor code** already vendored (polsia / naive / clawdbob / openclaw / claude-code-source / lindy)
   - **R2 — Third-party** integrated via API (Stripe, PostHog, Plain, etc.)
   - **B — Bounded build** only when R1/R2 don't fit
2. **One capability, one owner.** No parallel systems for the same thing (no second auth, second scheduler, second billing — already locked in `INTEGRATED-ARCHITECTURE.md` §"Non-Goals").
3. **Each new build slice is a `dm-*` ticket** with the same shape as `dm-cb-*`: bounded, with tests, with a doctrine constraint that names what NOT to touch.

## Capability matrix

### Acquisition (top of funnel)

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Public landing page | Polsia choreography + DearMe-original visual | B (dm-landing, **shipped this round**) | `ui/src/pages/DearMeLanding.tsx` |
| SEO content surface | Static site generator on the same Vite shell + sitemap + RSS | B (dm-seo) | `ui/src/pages/blog/` |
| Founder-dogfood proof feed | Polsia public-feed pattern, opt-in only | B (dm-public-feed) | server route `/v1/public-proof` |
| Referral program | Stripe Coupons + referral codes table | R2 + thin B (dm-referral) | `server/src/services/dearme-referral.ts` |
| LinkedIn / X founder content | DearMe's own X/LinkedIn dispatchers eat their own dogfood | R1 (existing dispatchers) | already shipped |
| Paid ads | Existing Meta dispatcher; Reddit/X later | R1 (existing `dearme-meta-campaign-dispatch`) | already shipped |

### Activation (signup → aha moment)

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Signup / login | Paperclip auth (already in repo) | R1 | `server/src/auth/` |
| Google OAuth | `better-auth` Google provider (already in `server/package.json`) | R2 (config only, **dm-google-oauth**) | `server/src/auth/google.ts` |
| One-question first cycle | Existing `previewFirstCycle` | R1 | already shipped |
| 5-minute aha proof | Existing `pnpm dearme:aha-proof` | R1 | already shipped |
| Phone-reachable private site | Existing `deploy_site` + GitHub Pages | R1 | already shipped |

### Monetization (payment + recurring revenue)

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Self-serve checkout | Stripe Checkout Sessions | R2 (**dm-checkout, in flight**) | `dearme-stripe-checkout` |
| Recurring billing | Stripe Subscriptions | R2 (dm-subscriptions) | extend `dearme-stripe-checkout` |
| Plan tiers (Free trial / Beta / Pro) | Stripe Prices + DearMe access tier table | R2 + thin B (dm-tiers) | `server/src/services/dearme-tiers.ts` |
| Refunds / disputes | Stripe Dashboard + webhook for `charge.refunded` | R2 (dm-refunds) | extend webhook handler |
| Cancellation flow | Stripe Customer Portal | R2 (dm-cancel) | one route + redirect |
| Tax / VAT | Stripe Tax | R2 (config only) | config |
| Invoicing | Stripe Invoices | R2 (config only) | config |
| Reseller / partner take rate | Stripe Connect (clawdbob's GMV moat is the reference) | R2 + thin B (dm-connect, *later*) | `server/src/services/dearme-stripe-connect.ts` |

### Per-customer cost control

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Per-customer USD cap | DB-backed cap state + wrapper enforcement | B (**dm-cost-caps, in flight**) | `dearme-cost-caps` |
| LLM-call cost attribution | Existing dual-protocol headers (`X-DearMe-Task`, `X-Subscription-ID`) | R1 | already shipped |
| Soft-warning email | Existing Resend dispatcher | R1 | already shipped |
| Auto-pause on hard cap | New service hooks into work-loop | B (dm-auto-pause) | `server/src/services/dearme-auto-pause.ts` |

### Voice quality (the differentiator)

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Profile-token deterministic scorer | Existing | R1 | already shipped |
| Real embedding scorer | Voyage AI embeddings behind existing seam | R2 (**dm-voice-live, in flight**) | `dearme-voice-voyage-scorer` |
| Sample import (writing samples / proof / links) | Lindy KnowledgeBase pattern | R1 (already absorbed) | `ui/src/components/dearme/VoiceMemory*` |
| Drift detection alerts | Existing voice-gate review-loop | R1 | already shipped |

### Customer support + retention

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| In-app support inbox | **Plain** (free under 100 conversations) — webhook receives, in-app component renders | R2 + thin B (dm-support-inbox) | `server/src/services/dearme-support.ts` |
| Status page | **Better Stack** (free tier) — public.dearme.app/status | R2 (config only) | DNS + uptime monitors |
| Public docs | **Mintlify** or static MD in `docs/` served via Vite | R2 or thin B (dm-docs-site) | `ui/src/pages/docs/` |
| Lifecycle email (onboarding / dunning) | **Loops** or **Customer.io** — DearMe pushes events, they send | R2 (dm-lifecycle-email) | `server/src/services/dearme-lifecycle.ts` |
| Weekly Dear-me report (retention) | Existing | R1 | already shipped |
| Empty-week recovery | Existing support-recovery proof | R1 | already shipped |

### Analytics + experimentation

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Product analytics | **PostHog Cloud** free tier (1M events/mo) or self-host | R2 (dm-posthog) | `ui/src/lib/analytics.ts` |
| Funnel / cohort | PostHog built-in | R2 | dashboard config |
| A/B test infra | PostHog Feature Flags | R2 | dashboard + flag wrapper |
| Pricing experiments | PostHog flags + Stripe Prices | R2 | config |

### Compliance + safety at scale

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| Audit log | Paperclip `activity_log` | R1 | already shipped |
| GDPR data export | New API on top of existing tables | B (dm-gdpr-export) | `server/src/routes/dearme-gdpr.ts` |
| GDPR data deletion | Tombstone pattern on Paperclip schema | B (dm-gdpr-delete) | same route |
| LinkedIn account-warmup limits | Frequency cap in dispatcher | B (dm-linkedin-warmup) | extend `dearme-linkedin-dm-dispatch` |
| CAN-SPAM unsubscribe footer | Auto-append in `send_email` dispatcher | B (dm-canspam) | extend `dearme-send-email-dispatch` |
| ToS / Privacy / Acceptable-Use | Static pages | B (dm-legal-pages) | `ui/src/pages/legal/` |
| Bedrock cost-guard | Hard-block in repo policy + lockdown deny-list | R1 (already shipped + dm-cb-01 deny-list) | already shipped |

### Distribution channels for DearMe itself

| Capability | Pattern | Bucket | Owner |
|---|---|---|---|
| OpenClaw plugin distribution | Publish to OpenClaw plugin registry | R1 (`openclaw.plugin.json` exists) | one-time submit |
| Public API for power users | Use existing `dm_sk_*` keys + a thin OpenAPI doc | B (dm-public-api) | extend existing routes |
| MCP servers for external IDEs | Already shipped: voice, runtime-files, web-search, workbench | R1 (this round) | already shipped |
| Mobile-web only (no native) | Existing responsive UI | R1 | already shipped |

## Net-new tickets (after the 4 in-flight)

Sorted by revenue impact, with reuse explicit:

| ID | Title | Bucket | Effort | Revenue lift |
|---|---|---|---|---|
| **dm-google-oauth** | Google login for paying users | R2 config | 0.5 day | unlocks frictionless signup |
| **dm-tiers** | Free trial / Beta / Pro plan tiers | R2 + thin B | 1 day | enables price discrimination |
| **dm-subscriptions** | Stripe recurring + cancellation portal | R2 | 1 day | converts checkout → MRR |
| **dm-support-inbox** | Plain integration (free tier) | R2 + thin B | 1 day | reduces churn, frees Peter |
| **dm-lifecycle-email** | Loops integration for onboarding + dunning | R2 | 1 day | activates trial → paid |
| **dm-posthog** | Product analytics + flags | R2 | 0.5 day | data for next decisions |
| **dm-auto-pause** | Hard-cap auto-pause + customer email | B | 0.5 day | prevents Bedrock-style incidents |
| **dm-linkedin-warmup** | LinkedIn frequency cap + warmup ramp | B | 0.5 day | prevents customer LinkedIn bans |
| **dm-canspam** | Email unsubscribe footer + suppress-list | B | 0.5 day | legal requirement |
| **dm-legal-pages** | ToS / Privacy / AUP / DPA | B | 0.5 day | legal requirement for $$ |
| **dm-referral** | Referral code + 20% off | R2 thin B | 1 day | viral growth coefficient |
| **dm-gdpr-export+delete** | Data export + tombstone | B | 1 day | EU users |
| **dm-status-page** | Better Stack uptime + status | R2 config | 0.25 day | trust |
| **dm-docs-site** | Public docs at docs.dearme.app | B thin | 1 day | reduce support load |
| **dm-public-feed** | Opt-in public proof feed | B | 1 day | founder-dogfood flywheel |

**Total to ship-ready-at-scale beyond Bundle A/B/C: ~11 dev-days of bounded slices, almost all R2-thin.**

Most slices ship in parallel via subagent worktrees following the same pattern as `dm-cb-*`.

## Non-goals (don't reinvent)

- ❌ Don't build our own analytics (use PostHog)
- ❌ Don't build our own support inbox (use Plain)
- ❌ Don't build our own status page (use Better Stack)
- ❌ Don't build our own lifecycle email engine (use Loops/Customer.io)
- ❌ Don't build a second auth (Paperclip / better-auth in repo)
- ❌ Don't build a second scheduler (Paperclip routines)
- ❌ Don't build a second billing ledger (Stripe + Paperclip finance_events)
- ❌ Don't build a no-code workflow editor in P0 (locked in `INTEGRATED-ARCHITECTURE.md`)
- ❌ Don't add `@aws-sdk/client-bedrock` anywhere (post-2026-05-02 incident)
- ❌ Don't expose substrate language in customer surfaces (Paperclip / OpenClaw / Symphony / role names internal)

## Revenue math (sanity check)

| Lever | Math | Assumed |
|---|---|---|
| ARPU | $29/mo Beta → $79/mo Pro | per `project-intern-pricing-oauth-2026-04-05` memory |
| Activation (trial → paid) | 12-18% (Polsia 7.6% engineered self-select is the floor) | post Loops lifecycle |
| Monthly churn | 6-9% post Voyage voice scorer | drift control |
| Steady-state customers for $50K MRR | ~700 at $79 ARPU | mid-range churn |
| Customer cost (LLM + Voyage + Resend + Stripe) | ~$8-12/mo per active user | with cost-caps + cache |
| Gross margin | ~85-87% before infra | typical SaaS |

The math works if (a) Voyage voice scorer ships, (b) cost caps prevent outliers, (c) Loops drives activation. All three are in the slices listed.

## Next moves (this session)

1. **In flight (4 codex agents):** dm-checkout, dm-voice-live, dm-cost-caps, dm-landing.
2. **After they merge:** dispatch dm-google-oauth, dm-tiers, dm-subscriptions, dm-support-inbox, dm-lifecycle-email in the next wave (all R2-thin, parallelizable).
3. **Wave 3:** dm-posthog, dm-auto-pause, dm-linkedin-warmup, dm-canspam, dm-legal-pages, dm-referral, dm-gdpr, dm-status-page, dm-docs-site, dm-public-feed.
4. **Owner-facts gate (Peter only):** LinkedIn endpoint + recipient, iMessage recipient.
