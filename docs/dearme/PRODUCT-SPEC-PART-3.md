> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only.

# Product Spec Part 3 — Screen-by-screen copy + edge cases

> Continues `PRODUCT-SPEC-PART-2.md`. Copy / interactions / edge handling. The rest of what a designer + dev need.

---

## 14. Onboarding — 16 screens with exact copy

### Screen 1 — Landing

```
H1: Dear me, build me a place on the internet.
H2: Your AI brand team. Writes, ships, and keeps showing up — in your voice.

[Start your DearMe →]

Trusted by ___ solo experts, builders, job hunters, and one-person companies.

(below fold) ┃ Three things DearMe does for you every day:
1. Builds + maintains your personal site (auto-updates)
2. Drafts content in your voice (tweets, emails, copy)
3. Sends you a daily letter — "Dear me, here's what happened"
```

### Screen 2 — Signup

```
Title: Sign in to DearMe
[ Continue with Google ]
[ Continue with email & password ]
   email:    [_______________________]
   password: [_______________________] (min 8 chars)

By signing up you agree to Terms + Privacy.
```

### Screen 3 — Name

```
Title: What should I call you?
   full name: [_______________________]
   (used in your daily letter and your site)

[Continue →]
```

### Screen 4 — Slug

```
Title: Pick your home on the internet.
   yourname → [yuna____________].dearme.app

(if taken) "yuna is taken — try yuna2 or yuna-c"
(suggestions auto-generated from name)

[Continue →]
```

### Screen 5 — Voice ingest (the critical step)

```
Title: Connect what you've already got.
       I'll learn how you write so everything I draft for
       you sounds like you.

[ Connect Twitter / X ]   ← OAuth 1.1, reads last 200 tweets
[ Connect LinkedIn ]      ← OAuth, reads About + recent posts
[ Upload resume PDF ]     ← parses skills + experience
[ Paste 3-5 of your writing samples ]   ← textarea, min 200 words

(if user picks none) → "I need at least one source to learn
  your voice. Pick one or do a 5-question interview instead."

[ Take the 5-question interview → ] (fallback)
```

### Screen 5b — Identity Researcher interview (fallback only)

```
Title: 5 questions, 3 minutes.

Q1. In one line, who are you?
    [_____________________________________]
    (e.g. "design engineer who's into building tools that feel personal")

Q2. What do you do well that you wish more people knew about?
    [_____________________________________]

Q3. Who's your audience? Who do you want to reach?
    [_____________________________________]
    (e.g. "early-stage founders who need design hires")

Q4. What's hard about your current situation?
    [_____________________________________]

Q5. Drop a link to anything you've made. (optional)
    [_____________________________________]
```

### Screen 6 — Goal

```
Title: What are you trying to do with this?
   ◯ Find a job
   ◯ Run a one-person business / consulting
   ◯ Build authority for my career (advisor / VP / next move)
   ◯ Ship in public (side projects, build community)
   ◯ Just want a clean personal site

[Continue →]
```

### Screen 7 — Audience

```
Title: Who do you want to be seen by?
   (pick any that apply)
   ☐ Recruiters & hiring managers
   ☐ Potential clients
   ☐ Industry peers
   ☐ Investors
   ☐ Customers
   ☐ A specific community ___________

[Continue →]
```

### Screen 8 — Existing site

```
Title: Got a site already?
   URL: [_____________________________________]
   (I'll read it and pull what's still useful)

[Skip] [Continue →]
```

### Screen 9 — Primary CTA

```
Title: When someone lands on your site, what do you want them to do?
   ◯ Book a call with me
   ◯ Hire me (read about me first)
   ◯ Read my writing
   ◯ Subscribe to my newsletter
   ◯ Buy a service ($)
   ◯ Just talk to me (DM-friendly)

(default selected based on goal from Screen 6)
[Continue →]
```

### Screen 10 — Generating brand documents

```
Title: Writing your brand documents…
[loader animation]

✓ Reading your samples...           (2s)
✓ Synthesizing your pitch...        (8s)
⠋ Listing your expertise areas...   (15s)
⠋ Drafting your portfolio overview...
⠋ Capturing your voice profile...
⠋ Defining your audience...

(when complete, Step 12)
```

### Screen 11 — Generating voice profile

```
Title: Learning your voice…
[loader]

✓ Read 187 of your tweets
✓ Pulled 5 LinkedIn posts
✓ Found 23 distinctive phrases
✓ Computing your tone signature

Drum roll. Almost there.
```

### Screen 12 — Document review (5 docs + voice signature)

```
Title: Take a look. Edit anything that's off.

Tabs: [Pitch] [Expertise] [Highlights] [Voice] [Audience]

(active tab) ─────────────────────────────────────────
## Pitch (markdown editable)
You're a design engineer who builds personal tools.
You care about software that feels personal — software
that knows you specifically. You've shipped...
[edit ↺]

[Looks right ✓ — continue]
```

### Screen 13 — Suggested first tasks

```
Title: I'll start working on these. Approve or skip.

☑ Build your /now page (high priority)
   "Currently learning Rust, looking for senior eng roles in
    NYC, reading 'Crafting Interpreters'."
   Estimated: 15 min · suggested by Site Builder

☑ Find 5 senior design eng job postings
   "I'll search for SF/NYC, Series-B+, and check fit"
   Estimated: 20 min · suggested by Research

☑ Draft your /about page
   "I'll pull from your LinkedIn About + your interview answers"
   Estimated: 30 min · suggested by Site Builder

☐ Send 1 first cold email
   "We'll start small to test your voice"
   Estimated: 10 min · suggested by Cold Outreach

[Looks good — let's go ✓]
```

### Screen 14 — Provisioning

```
Title: Setting up your home on the internet…
(progress UI, ~60-90s)

✓ Cloning your starter template
⠴ Spinning up your server on Render
⠴ Setting up your database
⠴ Configuring your email
⠴ Ready to deploy

(message at 75s mark) "This is the slowest step.
Hold tight, almost there."
```

### Screen 15 — Subscription

```
Title: Pick a plan.
       Trial is 3 days, then $29 unless you cancel.

[Trial — 3 days free]    [Starter $29/mo]    [Pro $99/mo]
                         (most pick this)

   ✓ 1 site             ✓ 1 site             ✓ 3 sites
   ✓ all agents         ✓ all agents         ✓ priority models
   ✓ 15 instant tasks   ✓ 15 instant tasks   ✓ 75 instant tasks
   ✓ subdomain          ✓ subdomain          ✓ + custom domain
                                              ✓ "Built with DearMe"
                                                hidden

[Card details (Stripe Checkout)] OR [Skip — start trial]
```

### Screen 16 — Welcome chat

```
(redirect to /dashboard/{slug})

Manager · expr-pleased-quietly · just now

Dear me,

Welcome. I'll be your manager.

Here's what I know about you so far:
You're {full_name}. You {goal}. You want to be seen by {audience}.

I've got 11 specialists ready to help you. They'll start
working in 6 hours — first cycle at {next_cycle_time}. I'll
send you a letter at 6 AM tomorrow about what they shipped.

Want to chat first? You can ask me anything. Or just close
this and check back tomorrow.

— DearMe

[ Type a message... ]
```

---

## 15. Dashboard — interactive surfaces

### Chat panel

```
┌────────────────────────────────────────────────────┐
│ Manager · expr-focused · 14:32                      │
│                                                     │
│ Dear me, your /now page is feeling stale. Want me   │
│ to refresh it from your last 3 GitHub commits?      │
│                                                     │
│ [Yes, refresh it ✓]    [Not now]                    │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ You · 14:33                                         │
│ Yes, but mention I'm specifically open to senior   │
│ design engineering roles now.                       │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ Manager · expr-thinking · 14:33                     │
│ Got it. Pulling commits...                          │
│ ⠋ Read 12 commits from last 7 days                  │
│ ⠴ Drafting /now copy in your voice                  │
└────────────────────────────────────────────────────┘
```

(SSE-driven; assistant message updates in place as agent thinks → drafts → finishes)

### Task approval inline

```
Twitter agent · expr-soft-confidence · 14:35

Drafted a tweet to push your /now update:

  "updating /now: shipped a session-tracking
  refactor in the dashboard. open to senior
  design eng roles in nyc/sf if anyone's
  hiring."

Voice match: 0.87 ✓

[Approve & send] [Edit] [Reject — tell me why]
```

If user rejects with "too casual for a job search", agent:
- Stores feedback in voice_match_history.notes
- Re-drafts with a slightly more formal pass
- New score: 0.81 (still in voice but different register)

### Drag-to-reorder task queue

Standard kanban — `queue_position` updates live via PATCH /api/tasks/reorder.

### Cycle replay

Click any past cycle → modal showing per-task execution timeline + thinking traces + cost breakdown + voice scores. Useful for debugging "why didn't the AI do X?".

---

## 16. Settings UI

```
Tabs:
  • General
  • Cycle config
  • Voice
  • Subscription
  • Connections
  • Domain
  • Privacy
  • Danger zone
```

### Cycle config

```
Frequency:           [Every 6 hours ▾]
                     options: every 6h / daily / weekdays / weekly
Cycle times:         07:10  13:10  19:10  01:10
                     (UTC offsets shown live)
Time zone:           America/New_York
Autonomy:            [Autonomous ▾]
                     options: autonomous / supervised / require approval
Tasks per cycle:     [Auto ▾]    or 1-8
Effective intelligence: [Standard ▾]
                     standard / high (uses more sonnet) / premium (more opus)
Monthly budget cap:  $49      [Slider 5-500]
Pause autonomous:    ☐ (until ____)
```

### Voice

```
Last trained:        2 days ago, from 187 tweets + 5 LinkedIn posts
Tone:                casual, curious, slightly self-aware
Avg length:          87 words

Signature phrases (top 10, edit any):
  ☑ "btw"          ☑ "shipping it"     ☑ "tbh"
  ☑ "tiny win"     ☐ "real talk"        ☑ "imho"
  ...

Forbidden phrases (will block draft if used):
  + "thrilled to announce"
  + "synergy"
  + "leverage"
  [+ add forbidden phrase]

Test box:
  Type a draft to see its voice score:
  [_______________________________________]
                                       Score: 0.__

[Re-train from latest content ↺]    [Add new sample]
```

### Connections

```
Twitter/X        Connected as @yunadev          [Disconnect]
LinkedIn         Connected                       [Disconnect]
GitHub           Connected as yunadev            [Disconnect]
Substack         Not connected                   [Connect →]
Stripe Connect   Not set up                      [Set up →]
                 (needed if you want to sell from your site)
Postmark email   yunadev@dearme.app  ✓ verified
Custom domain    Not set                         [Add yourname.com →]
```

### Danger zone

```
Pause site            (site shows "this person is paused" page)
Export everything     (all data as ZIP — JSON + markdown + media)
Delete brand          (irreversible after 14d grace period)
```

---

## 17. Edge cases — full handling matrix

| Edge case | What happens |
|---|---|
| **Voice profile too thin** (<20 sample posts) | Onboarding shows yellow warning. Voice gate threshold lowered to 0.5 for first 30 days. Identity Researcher interview triggered automatically. |
| **All voice samples are corporate-speak** (e.g. ChatGPT-like) | Onboarding refuses to complete; shows: "These samples don't sound distinctive. Try sharing 5 personal Slack/iMessage replies instead." |
| **Customer has 0 social presence at all** | Identity Researcher interview is the ONLY path. Voice profile built from 5 answers + tone inferred from interview style. |
| **Trial expires day 4** | Site goes private (404 with "this brand is paused"). Onboarding re-prompts to subscribe. Data retained 14 days. |
| **Payment fails (past_due)** | Day 1: email banner "card declined". Day 2: cycles paused. Day 3: site goes private. Day 4: subscription `suspended`. |
| **Customer hits monthly $49 budget cap** | AI proxy returns 429 with retry_after. Manager email: "Dear me, we burned through this month's budget. Cycles paused until {next_billing_date} or upgrade." |
| **Cold email reply received (Postmark webhook)** | Routed to Support agent → drafts reply → user approves → sent. Conversation appears in dashboard inbox. |
| **Voice score drops below 0.5 after 7 days** | Manager flags: "Dear me, my drafts aren't matching your voice as well lately. You posted 8 tweets last week — want me to retrain?" |
| **Customer deletes their connected Twitter account** | Voice profile preserved (cached embedding). Twitter agent disabled until re-connected. |
| **Render service for customer fails to deploy** | Provisioning stalls in Step 14. Falls back to: site rendered from main service (no per-customer Render). User unaware. |
| **Stripe Connect account suspended by Stripe** | Customer's payment links return 503. Manager surfaces: "Your Stripe account is on hold. They emailed you — check inbox." |
| **Customer adds a custom domain that fails CNAME verify** | Domain stays in `pending` state. brand_infra MCP polls every 4h. Email customer at 24h: "Your DNS isn't pointing to us yet. Here's how to fix it." |
| **Twitter API rate limit on shared @brandinpublic** | Broadcast queue with exponential backoff. Per-brand 1/wk cap protects against runaway. |
| **Customer goes 14 days without logging in** | "Are you OK?" letter sent: "Dear me, I've been working in the background. 47 visits this week, no replies to your last 3 outreach. Want me to try a different angle?" |

---

## 18. Support flows

### In-product help

- Floating "?" icon → opens DearMe Helper Chat (uses Chat agent, but with a system prompt enabling support context)
- "What did the AI do today?" → routes to recent execution log explanation
- "I don't like the tone" → routes to voice profile tuning flow

### Out-of-product

- `support@dearme.app` (Postmark inbound) → Support agent triages → either auto-replies or escalates to human queue
- Status page at `status.dearme.app`
- Docs at `dearme.app/docs`

---

## 19. The 30-day journey (what success looks like, archetype-agnostic)

```
Day 0:   sign up + onboard (~6 min) + voice profile built + first letter
Day 1:   first letter at 06:00. Site live. Day-1 cycle ran overnight.
Day 7:   first weekly Sunday letter ("Dear me, week 1"). 1-3 outbound results.
Day 14:  first @brandinpublic broadcast (if user opted in to milestone broadcast).
Day 21:  first opportunity moves to "engaged" status.
Day 30:  first paid outcome (job interview / consulting call / podcast invite / newsletter sub).

         If first paid outcome doesn't happen by Day 30:
         Manager letter: "Dear me, the first 30 days didn't land what we
         hoped. Here's what worked, here's what to change. Want to talk?"
```

**The Day-30 outcome is the activation metric. We optimize the entire system for it.**

---

## End of product spec

`PRODUCT-SPEC.md` (motif + archetypes + voice UX + dashboard + onboarding overview)
`PRODUCT-SPEC-PART-2.md` (6-page templates + public surfaces + pricing + daily letter format + mood faces + anti-patterns + rituals + Polsia divergence)
`PRODUCT-SPEC-PART-3.md` (16 onboarding screens copy + dashboard interactions + settings UI + edge case matrix + support + 30-day journey)

Total ~3,200 lines of architecture across:
- ARCHITECTURE.md / ARCHITECTURE-PART-2.md / ARCHITECTURE-PART-3.md (technical, 815 lines)
- PRODUCT-SPEC.md / PRODUCT-SPEC-PART-2.md / PRODUCT-SPEC-PART-3.md (user-facing, ~2,400 lines)
- BACKLOG.md / BACKLOG-PART-2.md (work breakdown)

This is the full product brief. Anyone reading these can build DearMe.
