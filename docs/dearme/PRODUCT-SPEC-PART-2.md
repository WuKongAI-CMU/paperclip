> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only.

# Product Spec Part 2 — 6-page templates × 4 archetypes + public surfaces

> Continues from `PRODUCT-SPEC.md`. Concrete page-by-page content per use case.

---

## 6. Six-page portfolio templates per archetype

Every customer site has the same 6-slot skeleton. Slot content varies by archetype.

### Skeleton (all archetypes)

```
slug.dearme.app/
├── /          (hero / "what I'm currently doing")
├── /about     (long-form bio)
├── /<slot-3>  (work / projects / case studies / expertise)
├── /<slot-4>  (writing / talks / pricing)
├── /now       (Derek-Sivers-style /now page)
└── /contact   (CTA + form / Calendly / book / payment link)
```

### Per-archetype variant

| | Archetype A — Job Hunter | Archetype B — Solo Business | Archetype C — Career Promoter | Archetype D — Polymath |
|---|---|---|---|---|
| **/** (hero) | Name + 1-line position pitch + CTA "Hire me" | Name + tagline + CTA "Book a call" | Name + thought-leadership pitch + CTA "Read writing" | Name + "shipping in public" + CTA "Talk to me" |
| **/about** | Story / education / values | Long bio + "how I work" | Career arc + 3 pivotal moments | Origin story + current obsessions |
| **/work** | Projects (GitHub-fed) | Case studies (3-5, with results) | Talks + advisor roles | Projects auto-fed from GitHub commits |
| **/writing** OR **/services** OR **/talks** OR **/pricing** | /writing (essays/blog) | /services + /pricing (with Stripe links) | /talks (slides + videos) | /writing (substack-fed) |
| **/now** | Currently learning / interviewing | Currently taking on (open slots) | Currently exploring (themes/projects) | Currently building (live commits) |
| **/contact** | Resume PDF + email + LinkedIn | Calendly + payment link + email | "Book a call" + "Press inquiries" | DM-friendly + email |

### Design tokens (uniform across archetypes)

| Token | Value | Source |
|---|---|---|
| Background | `#0a0a0a` (dark) or `#fafafa` (light) — user picks | Polsia visual recon |
| Accent | hex chosen by Site Builder, harmonized with voice tone | LLM picks #ff8c00, #6366f1, #1abc9c, etc. |
| Headline font | Cabinet Grotesk / Clash Display / Instrument Serif (per `frontend-design` SKILL.md) | Polsia |
| Body font | General Sans / Satoshi / Geist | Polsia |
| Mono font | Geist Mono / Space Mono | Polsia |
| Spacing scale | 4 / 8 / 16 / 32 / 64 / 128 | Polsia |
| Max-width | 720px (long-form) or 1080px (project grid) | Polsia |
| Animations | Reveal on scroll, no-frills, ≤200ms | per Frontend SKILL "no AI slop" |

**Templates live in `templates/{archetype}/{slot}.html` and are rendered server-side per cycle (Site Builder regenerates each slot independently).**

### Per-page autonomous behavior

| Slot | Cycle behavior |
|---|---|
| `/` | Refreshed when /now changes or major milestone fires |
| `/about` | Locked after Day-1; manual edit only (Manager won't auto-touch) |
| `/work` (or /projects) | Re-rendered when new commits / case studies pushed by user |
| `/writing` | Auto-pulled from substack / medium RSS / direct paste |
| `/now` | **Highest churn — 1× per cycle (every 6h) automatic update from current focus** |
| `/contact` | Locked after Day-1; only updated when user changes CTA |

---

## 7. Public surfaces

### `slug.dearme.app` — the customer's portfolio site

Static-rendered HTML stored in `site_pages` table, served directly by main service via subdomain dispatch (`Host` header → brand_id lookup).

- **No JS required** for default render (SEO + speed).
- **Optional small `<script>`** for visit tracking → counts feed dashboard analytics.
- **Custom domain (V1.5):** `yourname.com` → CNAME to `dearme.app`, DNS verify in MCP `brand_infra.verify_domain`.
- **DearMe attribution** at bottom (small): "Built with [DearMe](https://dearme.app)" — toggleable on Pro tier.

### `dearme.app/u/{slug}` — public progress dashboard

Polsia equivalent: `polsia.com/{slug}` shows agent activity to anyone.

DearMe version shows: **only what the user opted in to broadcast.** Not the inbox, not the cold email drafts. Just:
- Latest /now line
- Recent personal_milestones (consented broadcasts)
- Public posts (last 5)
- Public live status: "Currently working on X" (mood face + 1-line)

### `dearme.app/live` — cross-customer feed

Public SSE stream. Shows real-time `personal_milestones` broadcasts from any opted-in customer.

```
[14:23] Yuna · just got an interview at @stripe → yuna.dearme.app
[14:21] Marcus · closed a $3K retainer with @glowapp → marcus.dearme.app
[14:18] Elena · booked her first podcast on Lenny's pod → elena.dearme.app
[14:11] Ravi · shipped his 12th side project this year → ravi.dearme.app
```

**This is the GTM flywheel.** Every visitor to `dearme.app/live` sees real names + real outcomes + clickable links to real DearMe portfolios → 30%+ conversion to signup.

### `@brandinpublic` (or final shared handle) — Twitter broadcast

```
Yuna just landed her first tech interview, written about
her journey here →

yuna.dearme.app

#builtwithdearme
```

1 broadcast/brand/week max + 50/day platform total.

---

## 8. Pricing UX

```
┌──────────────────────────────────────────────────────────────┐
│  Trial          Starter       Pro            Enterprise      │
│  3 days free    $29/mo        $99/mo         custom          │
│                                                              │
│  ✓ 1 brand     ✓ 1 brand     ✓ 3 brands     ✓ unlimited    │
│  ✓ all agents  ✓ all agents  ✓ priority     ✓ dedicated AM │
│  ✓ 15 instant  ✓ 15 instant  ✓ 75 instant   ✓ unlimited    │
│  ✓ subdomain   ✓ subdomain   ✓ + custom     ✓ + custom +   │
│                              ✓ "Built with    ✓ white-label │
│                                DearMe"        ✓ SLA          │
│                                hidden                        │
└──────────────────────────────────────────────────────────────┘

Add-ons (any tier):
+ Brand:        +$29/mo each
+ Task pack:    +$29/mo for 30 instant tasks
+ Custom domain (Pro+ only): included
+ Stripe Connect (any tier): 20% take rate on customer-collected revenue
```

**Pricing copy on the page (DearMe-voiced):**

> "Dear me, this is what it costs. Trial is 3 days because that's enough to know if it works. After that, $29 covers everything until you outgrow it. We don't pay-walls features you'd notice."

---

## 9. The daily letter — exact format spec

Reporting agent runs at 06:00 customer TZ. Output saved as `report` row + emailed via Postmark + posted to chat.

**Subject:** `Dear me, day {N}` (where N = `cycles_completed`)

**Body (under 200 words, plain text + 1-2 markdown emphasis):**

```
Dear me,

Yesterday you shipped:
✓ {accomplishment 1 with link}
✓ {accomplishment 2 with link}

{If anything failed:}
A thing that didn't work: {failure with one-line explanation}.

{Status snapshot:} {1 sentence on visits / inbound / pipeline}.

Tomorrow I'll: {1-2 line plan, specific}.

— DearMe
```

**Hard rules (Manager prompt):**
- No headers (no "What Shipped" labels)
- No tables
- No bullet lists longer than 3
- Match the user's tone (use their `voice_profile.tone`)
- 2nd person addressing self ("Yesterday you shipped…") not 3rd
- "Tomorrow I'll" line must be **specific** — never vague ("keep building")
- "What shipped today" = ONLY this cycle's executions (not memory)
- One ask max (or none)
- Day 1 letter has special opener: WHY-now from user's onboarding answers

**Examples by archetype:**

```
Archetype A (Yuna, Job Hunter), Day 5:

Dear me, day 5

Yesterday you shipped:
✓ A new /writing page with your three best Substack drafts (yuna.dearme.app/writing)
✓ Cold emails to 4 hiring managers — 2 read, 0 replied yet

A thing that didn't work: the YC application essay we drafted scored 0.4 on voice. Your voice is more direct than this draft. We'll re-do today.

You're at 23 portfolio visits this week. 1 recruiter clicked through to your work page.

Tomorrow I'll: rewrite the YC essay in your actual voice, draft 2 more outreach emails to design-eng managers at seed-stage YC startups.

— DearMe
```

```
Archetype B (Marcus, Solo Business), Day 47:

Dear me, day 47

Yesterday you shipped:
✓ Updated /pricing — now leading with the $5K retainer instead of hourly (smart)
✓ Tweet: "shipped a tiny dashboard refactor today. cleaner state flow, half the code." → 47 likes, 3 reply DMs

That Glow founder we emailed Tuesday? They booked a call for Friday. Good signal.

Marcus, you're at 1,247 site visits this week (+18%). Pipeline: 2 active opportunities, 1 booked call.

Tomorrow I'll: case-study the Glow project for /work (need your before/after), draft 1 more outreach to a similar agency.

— DearMe
```

---

## 10. Mood face library — DearMe-warmed

Polsia ships ~300 expr-* faces with cold-startup vibes ("expr-coding", "expr-debugging"). DearMe inherits all but adds 30 warmer faces tuned to letter-to-self voice.

| New face_slug | face_name | Used when | Accent |
|---|---|---|---|
| `expr-puzzled-warmly` | "Hmm, dear me" | Stuck on ambiguous task | #ffd166 |
| `expr-pleased-quietly` | "That landed nicely" | Outbound got engagement | #06d6a0 |
| `expr-reflecting` | "Reflecting" | Daily letter generation | #118ab2 |
| `expr-cheering-self` | "You did it" | Milestone hit | #ef476f |
| `expr-soft-confidence` | "Confident" | High voice score draft | #ffd166 |
| `expr-tender` | "Tender" | Failure / low voice score | #b794f6 |
| `expr-patient` | "Patient" | Long-running task | #b8c0c8 |
| `expr-curious-warmly` | "Curious" | Research agent gathering | #ff8c00 |

ASCII art uses softer line characters (`╭ ─ ─ ─ ╮` rounded corners) vs Polsia's harsh `┌ ─ ─ ─ ┐`.

---

## 11. Anti-patterns — what DearMe is NOT

| Not | Why |
|---|---|
| ❌ A LinkedIn-style auto-poster spam machine | Voice profile gate (>0.7) prevents corporate AI slop |
| ❌ A "build me an app" / Polsia-clone-clone | Output is a personal site, not a SaaS app for the customer to sell |
| ❌ A journaling app | Voice goes outbound (tweets/emails/site) — DearMe writes TO the world AS you, not just to yourself |
| ❌ A no-code site builder | The site is generated and maintained by AI — user only edits when they want |
| ❌ A "be famous in 30 days" growth-hack | Realistic compounding — 90+ days to first paid speaking gig (per archetype C) |
| ❌ A mute, transactional dashboard | Mood faces + send_reply + SSE = it visibly thinks |

---

## 12. The unique-to-DearMe rituals (motif reinforcement)

| Ritual | Mechanic |
|---|---|
| **The opening "Dear me, …"** | Every dashboard visit, every email, every Manager chat reply opens this way |
| **Sunday letter** | Reporting agent's weekly summary is longer (400 words), more reflective. Subject: "Dear me, week N." |
| **Day-100 letter** | Special letter at cycles_completed=100. Recap: what changed, who you became. Subject: "Dear me, 100 days in." |
| **Failure telegrams** | When voice score <0.5 or a task fails 3x: "Dear me, this didn't land. Here's why." Honest, brief. |
| **The /now page** | Updates 1×/cycle automatically. The DearMe concept of "currently" is the brand product. |
| **`#builtwithdearme` footer** | Every public broadcast has this hashtag (Pro+ removable) |

These 6 rituals are **the brand**. They're also **the retention engine** — every customer gets touched by name, daily, in their voice.

---

## 13. Anti-Polsia divergences (recap, this is the entire spec of "DearMe ≠ Polsia")

| | Polsia | DearMe |
|---|---|---|
| Greeting | "Welcome back" | "Dear me, …" |
| Daily summary | Day-N report (structured) | Day-N letter (conversational, voice-matched) |
| Voice | Shared "dark humor" template across all 89K | Each customer's own voice (clone) |
| Output artifact | Customer's company SaaS app | Customer's personal portfolio site |
| Public dashboard | `polsia.com/{slug}` | `dearme.app/u/{slug}` (gentler) |
| /live feed | Company milestones | Personal milestones |
| Footer | "Built by Polsia" | "Built with DearMe" |
| Mood faces | ~300 cold | +30 warm DearMe-tuned |
| Onboarding | "What's your idea?" | "What should I call you?" + "Connect what you've got" |
| Hashtag | none / `@polsia` | `#builtwithdearme` |

**Everything else: 100% Polsia.**

---

(continued in PRODUCT-SPEC-PART-3.md: full onboarding screen copy, dashboard interactions, settings UI, support flows)
