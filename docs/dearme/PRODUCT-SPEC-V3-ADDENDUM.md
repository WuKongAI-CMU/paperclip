> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only.

# Product Spec v3 Addendum — OPC funnel + side-hustle archetype

> Updates `PRODUCT-SPEC.md` after positioning lock: DearMe = AI marketing dept for OPCs, serving the **full OPC funnel** (Pre-OPC → Side-hustle → Current OPC → Post-OPC).

---

## 0. Replace §1 thesis with this

**DearMe is the AI marketing department for one-person companies.**

12 specialists. One client. You. $29/month — for what real agencies charge $3,000.

We serve everyone in the OPC funnel:

```
Post-OPC          $50K+ MRR  → V2: scale, hire, multi-brand
Current OPC       $3-50K MRR → core: Marcus, full-time solo
⭐ Side-hustle    $0-3K MRR  → biggest: 45% of working adults
Pre-OPC           $0 MRR     → high-intent: students, career builders
```

We do **outbound** marketing only. Not assistant. Not life-organizer. Not company-builder.
We **market you to the world**, in your voice, every day.

---

## 1. Five archetypes (expanded from 4 — adds Side Hustler)

### Archetype A — The Pre-OPC Job Hunter
**Yuna, 22, recent grad, no MRR.** Building portfolio to land first job.
**Site:** `yuna.dearme.app` — hero / about / projects / writing / now / contact
**AI does:** ship 1 LinkedIn post/day, send 5 cold pitches/wk, polish portfolio
**Day-30:** first onsite interview · **Day-60:** offer

### Archetype B — The Current OPC
**Marcus, 34, design consultant, $200K/yr.** Full-time solo, needs marketing.
**Site:** `marcus.dearme.app` — hero / services / case-studies / pricing(Stripe)/ about / contact
**AI does:** 1-2 voice-matched tweets/day, pitch 5 agencies/wk, run Meta ads, book calls
**Day-30:** first $5K retainer · **Day-60:** 3 active retainers

### ⭐ Archetype C — The Side Hustler (NEW — biggest TAM)
**Aki, 29, FAANG eng + Gumroad creator, $800/mo side revenue.** Full-time job + side gig. **No time for marketing.**
**Site:** `aki.dearme.app` — hero / work-side / shop / writing / now / contact
**AI does:**
- Posts to Twitter while she's in standup (voice-matched, scheduled)
- Drafts replies to Gumroad customer DMs (she 1-click approves at lunch)
- Updates `/shop` page when new template ships
- Cold-pitches her template to 3 niche newsletters/wk for cross-promotion
- Generates Stripe payment links for new digital products on autopilot
**Day-30:** $1.2K MRR (50% growth) · **Day-90:** $3K MRR · **Day-365:** quits, becomes Marcus

**Side hustler subtypes covered:**
- Weekend freelancer (eng / design / writing)
- Gumroad / Etsy / Shopify creator (templates, courses, physical goods)
- Side newsletter operator (Substack / Beehiiv)
- Indie maker / micro-SaaS builder (`build-in-public`)
- Side YouTube / podcast creator
- Side coach / educator

### Archetype D — The Career Promoter (was C)
**Elena, 38, senior PM, eyeing VP / advisor / founder leap.** Pre-OPC pivot.
**Site:** authority-flavored — hero / expertise / writing / talks / now / contact
**AI does:** ghostwrite 2-3 LinkedIn posts/wk, pitch 8 podcasts/wk, curate /writing
**Day-30:** first podcast booked · **Day-90:** first paid speaking offer

### Archetype E — The Post-OPC Scaler (was D Polymath, V2 expansion)
**Ravi, 27, indie maker → broke $50K MRR → now scaling.**
**Site:** maker-flavored, multi-brand toggle
**AI does:** manages 3 brands, hires custom agents, runs ad campaigns, broadcasts wins
**Day-30:** activates Pro tier · **Day-90:** $80K MRR with 3 product lines

---

## 2. Side-hustle UX — what's different vs full-time OPC

The Side Hustler is the **most time-constrained** customer. Product must respect that.

| Feature | Full-time OPC (Marcus) | Side Hustler (Aki) |
|---|---|---|
| **Daily time investment** | 30-60 min reviewing | **<5 min/day** (lunch break, commute) |
| **Approval mode default** | autonomous | **supervised** (drafts queued, approve in batch) |
| **Posting schedule** | continuous | **time-windowed** (post Mon-Fri 8am, Sat 10am) |
| **Daily letter timing** | 06:00 (before work) | **06:00 still — but designed to read in 2 min** |
| **Voice gate threshold** | 0.7 default | 0.7 default (don't lower — protect their voice) |
| **Cycle frequency** | every 6h | **every 12h** (less batch, less noise) |
| **Inbox triage** | Support agent auto-replies | **drafts only** — human approves all |
| **Stripe integration** | full Connect (consulting fees) | **payment links only** (digital products) |
| **Meta Ads** | enabled | **disabled by default** (avoid burning side-rev) |

**Settings UI gets a "Side Hustle Mode" toggle** that flips these defaults atomically.

---

## 3. New onboarding screen (insert at Step 6)

After "What are you trying to do?" question (Step 6 in PRODUCT-SPEC §3):

**If user picks `solo_business`:**
- → Sub-question: "Full-time or side hustle?"
- ◯ Full-time (current OPC)
- ◯ Side hustle (employed + side gig)
- ◯ Pre-OPC (still in job, building toward solo)

→ Shapes which archetype defaults apply (cycle frequency, autonomy, ads on/off).

---

## 4. Side-hustle messaging — landing copy variants

```
Hero variant 1 (broad):
  "DearMe — The AI marketing dept for one-person companies.
   $29/mo. For what real agencies charge $3,000."

Hero variant 2 (side-hustle landing):
  "Got a side hustle? You also have a full-time job.
   We market your side gig 24/7 — in your voice.
   $29/mo."

Hero variant 3 (job hunter landing):
  "Looking for a job? Build a portfolio that markets you
   while you sleep. Recruiters find you instead.
   $29/mo, 3-day free trial."

Hero variant 4 (current OPC landing):
  "Solo consultant making $200K and stuck?
   You don't need another tool. You need a marketing dept.
   We're it. $29/mo."
```

Each landing variant = different SEO + paid ad target. PostHog A/B test by archetype.

---

## 5. Pricing — re-tiered for the funnel

| Tier | $/mo | Best fit | Why |
|---|---|---|---|
| Trial | 0 (3 days) | Anyone curious | Try before commit |
| Starter | **$29** | Pre-OPC + Side hustler | Most accessible — won't break student / employee budget |
| Pro | **$99** | Current OPC | Custom domain, 75 tasks, hide attribution = needs of full-time solo |
| Enterprise | custom | Post-OPC, multi-brand | When MRR > $50K |

Stripe Connect 20% take rate kicks in only when customer collects revenue through us — natural alignment with **Side Hustler → Current OPC** transition.

---

## 6. North-star metric, refined

**Number of clients with ≥1 voice-matched outbound shipped per week.**

Per archetype, "outbound shipped" looks like:
- Pre-OPC (Yuna): 1 LinkedIn post + 5 cold pitches
- Side Hustler (Aki): 3 tweets + 2 customer-DM replies + 1 cross-promo pitch
- Current OPC (Marcus): 5 tweets + 5 cold emails + 1 ad creative refresh
- Career Promoter (Elena): 2 LinkedIn posts + 3 podcast pitches
- Post-OPC (Ravi): 10+ across 3 brands

**One unified metric. Different weights per archetype, but every customer has the same fundamental contract: at least 1 voice-matched outbound this week.**

If a customer goes 7 days with 0 outbounds shipped, that's a P0 retention bug.

---

## 7. What this adds to the build (delta vs v3 architecture)

**Code:** ~0 LOC — settings flag + onboarding sub-question + landing variants. Maybe +200 LOC for "Side Hustle Mode" toggle in settings UI and routes/settings.js.

**Schema:** add `brands.work_mode TEXT CHECK (work_mode IN ('full_time','side_hustle','pre_opc'))`. 1 migration column.

**Prompts:** Manager + Reporting + Twitter agent prompts get a conditional branch:
```
If brand.work_mode = 'side_hustle':
  - Cycle frequency 12h (not 6h)
  - Default autonomy = supervised
  - Daily letter under 100 words (vs 200) — they read fast
  - Post during commute hours (8am, 12pm, 5pm local)
```

**Templates:** archetype C/Side Hustler 6-page template variant added to `templates/side_hustle/`.

Total: ~3-4 hours engineering + 1 migration + 4 prompt edits + 1 template variant.

---

## 8. The full 5-archetype funnel (unified table)

| | Pre-OPC | Side Hustle | Current OPC | Career Promoter | Post-OPC |
|---|---|---|---|---|---|
| MRR | $0 | $0-3K | $3-50K | $0 (W2 income) | $50K+ |
| TAM | Large (millions) | **Largest (45% of workers)** | Medium | Medium | Small |
| Time/day | 1h+ | **<5 min** | 30-60 min | 30 min | 1h+ |
| Pricing fit | Starter $29 | Starter $29 | Pro $99 | Pro $99 | Enterprise |
| Activation metric | Day-30 interview | Day-30 +30% MRR | Day-30 first retainer | Day-30 first podcast | Day-30 Pro upgrade |
| LTV | Medium (churns when employed) | High (sticks while side-gig grows) | Highest | High | Highest |
| Hero copy | "Recruiters find you" | "Market your side gig 24/7" | "Stop being your own marketing dept" | "Build authority" | "Scale without hiring" |

**Side Hustle = highest TAM × highest stickiness. The strategic sweet spot.**

---

## 9. PM doctrine — what changes

> **Doctrine update:** DearMe's TAM is the OPC funnel, with Side Hustlers as the largest entry point. Default product behavior caters to the time-poor side hustler; full-time OPC unlocks more autonomy and channels. Pre-OPC and Post-OPC are bookends.

End of v3 addendum.
