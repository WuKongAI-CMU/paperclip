# DearMe v3 — Unified Architecture

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.

> Re-architected after positioning lock: **DearMe is the AI marketing department for one-person companies (OPCs).** 100% Polsia clone, OPC-positioned, voice-cloned.

---

## 0. Thesis (the entire product in 80 words)

Every OPC founder faces the same trap: **1 person can't both build the product AND market it, but can't afford a $3K-10K/mo agency.** DearMe solves this by giving every OPC its own 12-AI-specialist marketing team — for $29/mo. The team writes, pitches, posts, and reports back daily, all in the founder's own voice. Polsia proved the autonomous-workforce architecture for companies. We bring that same architecture to the only client who truly can't be 2 people: the OPC founder.

---

## 1. The 3 framings that define DearMe

| Lens | What it tells us |
|---|---|
| **Polsia clone** | Architecture is solved. 22 MCP servers, 12 agents, every-6h cycles, dual-protocol AI proxy, per-customer Render auto-provision, Stripe Connect 20%. **Don't reinvent any of it.** |
| **AI marketing agency** | Each customer is a "client account". Manager = Account Manager. 12 agents = 12 agency roles. Cycles = campaign sprints. Voice profile = brand book. |
| **OPC operator** | Customer is one person who IS the company. Personal brand = company brand. Founder face = product face. We market the human, which markets the business. |

**The three lenses converge:** OPC founder hires DearMe (agency framing) → DearMe runs Polsia-architecture autonomously → Customer's voice + opportunities + site update daily → Customer gets seen → Customer earns.

---

## 2. Customer segments (TAM map)

Three layers in the OPC funnel — **all valid customers**:

```
                              ┌─────────────────────────┐
                              │  Post-OPC (V2 expansion) │
                              │  $50K+ MRR, scale ready  │
                              │  Adds: hiring CRM, ads   │
                              └────────────▲────────────┘
                                            │
            ┌──────────────────────────────┴────────────────────┐
            │  Current OPC (Archetype B + part of D)              │
            │  Solo consultants, course creators, indie founders, │
            │  freelancers, paid newsletter operators             │
            │  $3K-50K MRR · The CORE buyer · highest LTV         │
            └──────────────────────▲──────────────────────────────┘
                                    │
   ┌────────────────────────────────┴─────────────────────────────┐
   │  Pre-OPC (Archetype A + C + part of D)                        │
   │  Job hunters · Career builders · Side-project nights/weekends │
   │  $0 MRR but high intent — building the brand to leap          │
   └───────────────────────────────────────────────────────────────┘
```

**Why all three:**
- **Pre-OPC = volume.** Cheap acquisition. Trial converters. Some never become OPC but stay subscribed for "career visibility".
- **Current OPC = revenue.** Pay $29-99 happily because real agency is $3-10K. Highest retention. Best case studies.
- **Post-OPC = expansion.** When MRR hits $50K, they upgrade to Pro/Enterprise + add brands.

---

## 3. The 12-agent agency team (mapping to real agency roles)

| # | Agency role | DearMe agent | Verbatim Polsia? |
|---|---|---|---|
| 1 | **Account Manager** (talks to client, books work) | Manager (id 51, ex-CEO) | ✅ rename only |
| 2 | **Brand Strategist** (defines brand voice + positioning) | Manager + Onboarding | ✅ |
| 3 | **Voice Director** (ensures all output sounds like client) | ⭐ voice_profile MCP | NEW — our moat |
| 4 | **Senior Copywriter** (Twitter/LinkedIn/email) | Twitter (id 53) + Cold Outreach (id 54) | ✅ + voice gate |
| 5 | **Web Designer** (maintains client site) | Brand Site Builder (id 30, ex-Engineering) | ✅ rename role |
| 6 | **Media Buyer** (paid ads) | Meta Ads Manager (id 52) | ✅ |
| 7 | **PR / Outreach** (booking podcasts, speaking, partnerships) | Cold Outreach (id 54, "Opportunity Hunter") | ✅ rename role |
| 8 | **Research Analyst** (audience, competitors, trends) | Research (id 29) | ✅ |
| 9 | **Field Researcher** (browser-based scraping/posting) | Browser (id 42) | ✅ |
| 10 | **Performance Analyst** (metrics, conversion) | Data (id 33) + Monitoring (id 37) | ✅ |
| 11 | **Account Reporter** (daily/weekly client letters) | Reporting (id 35) | ✅ + "Dear me, day N" format |
| 12 | **Inbound CSR** (customer's inbox triage + replies) | Support (id 32) + Chat (id 38) | ✅ |
| 13 | **Onboarding specialist** (gets new client live) | Onboarding (id 39) | ✅ |

**Total: 12 specialist agents + 1 onboarding bootstrap = exact Polsia roster, framed as agency staff.**

---

## 4. The agency operations clock (cycle engine)

A real marketing agency has weekly client check-ins, daily standups, and quarterly campaigns. DearMe does the same on autopilot:

```
Every 6 hours per client:
   ┌─ Phase 1 (planning, ~5 min)
   │    Account Manager builds brief from:
   │      - Client's voice profile + brand documents
   │      - Last 7 days of campaign results
   │      - Inbox / DMs / replies
   │      - Open opportunities
   │    → 3-8 deliverables planned
   │
   ├─ Phase 2 (execution, 4-6 hours)
   │    Specialists pick up their deliverables in parallel:
   │      - Copywriter drafts 1-2 voice-matched tweets
   │      - Web Designer refreshes /now and 1 other page
   │      - PR Outreach sends 2 cold pitches
   │      - Researcher finds 5 podcast targets
   │      - Performance Analyst pulls metrics
   │    Every output passes voice gate (≥0.7) before client-facing send.
   │
   └─ Phase 3 (account report, ~5 min)
        Account Reporter compiles + sends "Dear me, day N" letter at 06:00.
        Highlights, misses, tomorrow's plan. <200 words.
```

**Agency parallel:** Polsia's cycle engine is exactly an agency's weekly campaign meeting + daily standups, compressed to every 6h and run by AI.

---

## 5. The 4 brand assets we build for every client

Standard agency deliverables, on auto-update:

| Asset | What it is | Update frequency | Generated by |
|---|---|---|---|
| **Brand Book** | 5 markdown documents (personal_pitch / expertise_areas / portfolio_highlights / voice_profile / target_audience) | manual edit only after Day-1 | Onboarding + LLM |
| **Voice Profile** | Embedding + signature_phrases + forbidden_phrases + tone | re-trained on demand or 30-day decay | voice-extractor service |
| **Personal Site** | 6 pages at `{slug}.dearme.app` (hero / about / work / services-or-writing / now / contact) | 1 page per cycle (every 6h) | Brand Site Builder agent |
| **Outbound Channels** | Twitter feed + cold email pipeline + Meta Ads + Opportunity pipeline | continuous, voice-gated | Twitter / Cold Outreach / Meta Ads / Opportunity Hunter agents |

**These 4 assets ARE the product.** Everything else (mood faces, dashboard, /live feed) is texture.

---

## 6. The "agency-grade brief" loop (how a client interacts)

Real agency: client emails brief → agency does work → sends deck → client approves/edits → agency ships.

DearMe: same but in chat, with much faster turnaround:

```
1. Client opens chat: "Hey, can we push my consulting offer this week?"
2. Manager: "Got it. I'll prep:
              - 2 LinkedIn posts about the offer (voice-matched)
              - 5 cold pitches to ideal-client orgs (Researcher will find)
              - Update /services page with the offer (Web Designer)
              - 1 testimonial harvest from past clients (you'll need to forward)
              Run starts at 19:10. Daily letter tomorrow 06:00."
3. Client: "go"
4. (6h later) Specialists ship. Each draft posted to chat with voice score.
   Client 1-clicks approve or edits inline.
5. (6 AM next day) Daily letter:
   "Dear me, day 47. Yesterday I shipped:
    ✓ 2 LinkedIn posts (voice 0.91 + 0.87) — 47 + 23 likes, 4 reply DMs
    ✓ 5 cold pitches sent — 1 read 3x (interested signal)
    ✓ /services page updated with the new offer — 12 page visits
    Tomorrow I'll: follow up on the 1 hot pitch, draft 2 more targeting…"
```

**This loop = 90% of all marketing-agency work** compressed into chat + voice-gated drafts + 6h cycle.

---

(Part 1 ends — continued in V3-ARCHITECTURE-PART-2.md: technical architecture, schema, MCP, AI proxy, deploy)
