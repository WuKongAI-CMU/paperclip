> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine and the typed `DEARME_ROLE_REGISTRY`. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only. Current product surface lives in [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md).

# DearMe — Product Specification (user-facing architecture)

> Companion to `ARCHITECTURE.md` (technical). This doc defines what the user sees, types, reads, and feels — Day 1 → Month 12.

---

## 1. The motif: "Dear me"

Every product surface uses the **letter-to-self** voice. The product name is the format.

**Daily Reporting agent email (06:00 user TZ):**

```
Subject: Dear me, day 7

Dear me,

Yesterday you shipped:
✓ A new /now page that finally says what you're working on (your brand voice score: 0.84)
✓ 1 cold email to the founder of Glow — they read it 3x. We're watching for a reply.

Status: 1,247 portfolio visits this week (+18%). 2 active opportunities in the pipeline.

Tomorrow I'll: refine your /writing page from your last 5 substack posts, draft 2 more outreach emails to similar founders.

— DearMe
```

**Dashboard greeting (every visit):**

> "Dear me, here's what you missed."

**Mood face copy in chat (extends Polsia 300-face library with DearMe-warm tones):**

> "Dear me, this is harder than I thought." (face: expr-puzzled, accent #ff8c00)
> "Dear me, that landed nicely." (face: expr-pleased, accent #ffd166)

---

## 2. Four user archetypes (4 use cases)

### Archetype A — The Job Hunter (Yuna, 22, recent grad)

**State at signup:** No website. Has LinkedIn. 1-2 GitHub repos. A resume PDF.
**Goal:** Land first full-time job. Recruiters need to see something.
**DearMe builds:** 6-page portfolio (hero / about / projects / writing / now / contact) at `yuna.dearme.app`.
**Daily AI work:**
- Brand Site Builder polishes one page per cycle
- Cold Outreach drafts intro emails to 2 hiring managers/day
- Twitter agent (V1.5) helps her start posting weekly
- Manager emails her weekly: "Dear me, applied to 3 jobs, 1 reply."
**Voice ingest:** From LinkedIn About + 1-2 Substack drafts she pastes in onboarding. If thin, falls back to Identity Researcher 5-question interview.
**Visible value at week 1:** Live portfolio + 5 outbound applications + 1 reply.
**Success metric:** Site shareable to recruiters within 24h.

### Archetype B — The Solo Business Owner (Marcus, 34, design consultant)

**State at signup:** Has a stale Squarespace from 2 years ago. Active on Twitter (~3K followers). Charges $200/hr but inconsistently.
**Goal:** Get 2-3 retainers. Stop project-hunting.
**DearMe builds:** 6-page commerce-flavored site (hero / services / case studies / pricing with Stripe Connect / about / contact) at `marcus.dearme.app` or his custom domain.
**Daily AI work:**
- Site Builder optimizes pricing copy + adds case studies from his repo of past work
- Opportunity Hunter tracks consulting inquiries, books calls via Calendly link
- Twitter agent ghostwrites 1 voice-matched tweet/day (>0.7 voice score)
- Cold Outreach pitches 2 agencies/day for retainer-style partnerships
- Meta Ads agent (after 30 days) tests $20/day campaigns to drive consultation bookings
**Voice ingest:** 200 historical tweets. Voice profile rich.
**Visible value at week 1:** Site live + 3 inbound DMs + 1 booked call.
**Success metric:** First $5K retainer signed within 60 days.

### Archetype C — The Career Promoter (Elena, 38, senior PM at Series-B startup)

**State at signup:** No website. Active LinkedIn. Has industry talks she gave 2-3 years ago. Wants to build authority for her next move (advisor / VP / found own thing).
**Goal:** Be known. Speaking gigs. Advisor offers.
**DearMe builds:** Authority-flavored site (hero / expertise / writing / talks / now / contact).
**Daily AI work:**
- Site Builder pulls from her LinkedIn posts → curated /writing
- Research agent finds podcasts in her niche; Cold Outreach drafts pitch emails
- Twitter agent helps her post 2-3x/week (she edits before send)
- Reporting agent's "Dear me" letter every Sunday with weekly summary
**Voice ingest:** LinkedIn long-form + her 3 conference talk transcripts.
**Visible value at week 1:** Public site + 1 podcast pitch sent.
**Success metric:** First paid speaking offer within 90 days.

### Archetype D — The Polymath (Ravi, 27, working full-time, side projects nights)

**State at signup:** GitHub portfolio + small Substack + 600 Twitter followers. Wants to find a co-founder OR get noticed by VCs.
**Goal:** Build in public. Compound visibility. Optionality.
**DearMe builds:** Build-in-public site (hero / projects / writing / now-shipping / talk-to-me / archive).
**Daily AI work:**
- Site Builder turns each commit into a /now line update
- Twitter agent shares shipping updates (his voice, witty)
- Manager: "Dear me, you shipped 2 things this week. 11 people clicked through."
- Personal_milestones broadcasts weekly to `@brandinpublic` (with consent)
**Voice ingest:** 500 tweets + 12 substack posts. Voice profile excellent.
**Visible value at week 1:** Live site auto-updating from GitHub + 1 broadcast tweet.
**Success metric:** 10 inbound interesting DMs/month within 90 days.

---

## 3. Onboarding — 16 screens, ~6 minutes

Each step has a single primary CTA + skip option (resumable from email link).

| # | Screen | Field / action | Default | Skip allowed |
|---|---|---|---|---|
| 1 | Landing | "Start your DearMe →" | — | n/a |
| 2 | Signup | Google OAuth or email+pw | — | no |
| 3 | "What should I call you?" | full_name (text) | from OAuth | no |
| 4 | "Pick your slug" | slug (text) | slugify(name) | no |
| 5 | **"Connect what you've got"** ⭐ | Twitter OAuth / LinkedIn OAuth / Resume upload (any 1+) | — | yes (will fall back to Step 5b) |
| 5b | (fallback) Identity interview | 5 questions: who-are-you / what-do-you-do / who-cares / why-now / proof | — | no |
| 6 | "What are you trying to do?" | growth_goal (radio): job_hunting / solo_business / career_promotion / personal_branding / build_in_public | — | no |
| 7 | "Who do you want to reach?" | audience (multi): recruiters / clients / peers / investors / customers / fans | — | yes |
| 8 | "Existing site?" | URL (optional, parsed for content) | — | yes |
| 9 | "Your CTA" | book_call / hire_me / read_writing / subscribe / buy_service / talk_to_me | inferred from goal | no |
| 10 | **Generating your brand documents…** | progress UI 30-60s | — | n/a |
| 11 | **Generating your voice profile…** | progress UI 15-30s with example match scores | — | n/a |
| 12 | "Review" — 5 brand docs + voice signature_phrases | editable | — | yes |
| 13 | "Suggested first tasks" — 3-5 starter | approve/reject each | — | n/a |
| 14 | **Provisioning your site…** | progress UI 60-90s (Render+GitHub+Neon+Postmark+Stripe) | — | n/a |
| 15 | "Pick a plan" | trial (3 days) → starter $29 → pro $99 → enterprise | trial | yes |
| 16 | Welcome chat from Manager | first message: "Dear me, ..." opener with first-cycle preview | — | n/a |

**Step 5 is the moat-loading step.** If user skips both connect AND interview, onboarding cannot complete (we cannot generate a voice profile from nothing).

---

## 4. Voice profile UX — what the user sees

After Step 11 finishes, user lands on Step 12 review showing:

```
┌──────────────────────────────────────────────────────────┐
│  Your voice signature                                     │
├──────────────────────────────────────────────────────────┤
│  Tone:               casual, curious, slightly self-aware │
│  Avg post length:    87 words                             │
│  Signature phrases:  "btw" · "shipping it" · "tbh" ·     │
│                      "tiny win" · "real talk"             │
│  Phrases you avoid:  "synergy" · "leverage" · "ROI" ·    │
│                      "thrilled to announce" · "kindly"    │
│                                                           │
│  Test it:                                                 │
│  Type a draft →  [I'm thrilled to announce_______ ]       │
│                  → Voice match: 0.12  ✗  Doesn't sound   │
│                                          like you         │
│                                                           │
│  Type a draft →  [shipped a tiny win today_______]        │
│                  → Voice match: 0.91  ✓  Sounds like you │
│                                                           │
│  [Looks right ✓]      [Re-train from more samples →]      │
└──────────────────────────────────────────────────────────┘
```

**Every outbound message** (tweet, cold email, page copy) is shown with its voice score before send (or pre-approved >0.7 in autonomous mode).

In the dashboard chat, when the agent drafts something:

```
Twitter agent · expr-thinking · 14:32

Drafted a tweet for you:

  "shipped a tiny dashboard refactor today. cleaner state
  flow, half the code. tbh i should have done this 3 weeks
  ago"

Voice match: 0.88  ✓
[Approve & send] [Edit] [Reject + tell me why]
```

---

## 5. Dashboard — daily layout

```
┌─────────┬──────────────────────────────────────────────────────────┐
│ DearMe  │  Dear me, here's what you missed.                         │
│         │  ────────────────────────────────────────────────────────│
│ ⌂ Home  │  ┌─────────────────┐  ┌─────────────────────────────┐ │
│ ✎ Chat  │  │ Live: Twitter   │  │ Today's plan (cycle #47)    │ │
│ ◇ Tasks │  │ agent thinking  │  │ • polish /now page          │ │
│ ⊙ Cycles│  │ "drafting tweet │  │ • draft 2 cold emails       │ │
│ ✦ Now   │  │ about the …"    │  │ • update /writing index     │ │
│ ⚑ Opps  │  │ ⠴ expr-focused  │  │                             │ │
│ ★ Mile  │  └─────────────────┘  └─────────────────────────────┘ │
│ 📄 Docs │  ┌─────────────────────────────────────────────────────┐ │
│ ⚙ Setts │  │ Recent voice scores                                  │ │
│ ✉ Plan  │  │ Tweet draft "shipped tiny…"      0.91  approved ✓   │ │
│         │  │ Cold email to Glow founder       0.74  approved ✓   │ │
│ {slug}  │  │ /now copy                        0.83  approved ✓   │ │
│ .dearme │  │ Tweet draft "I'm thrilled…"      0.12  rejected ✗   │ │
│ .app ↗  │  └─────────────────────────────────────────────────────┘ │
│         │  ┌─────────────────────────────────────────────────────┐ │
│  Day 7  │  │ Pipeline                                             │ │
│  Trial  │  │ pending (4)  →  contacted (2)  →  engaged (1)       │ │
│  ends   │  │                                  →  confirmed (0)   │ │
│  in 2d  │  └─────────────────────────────────────────────────────┘ │
└─────────┴──────────────────────────────────────────────────────────┘
```

**Left rail** = navigation. **Right pane** = today's surface. **Top header** = mood line. **All real-time** via SSE — Twitter draft appears as agent types.

(continued in PRODUCT-SPEC-PART-2.md: 6-page portfolio templates × 4 archetypes, public site rendering, /live feed, pricing UX, daily letter format spec)
