# DearMe v3 — Architecture Part 3 (archetype journeys, GTM flywheel, build sequence)

> Continues `V3-ARCHITECTURE-PART-2.md`. Concrete user journeys + flywheel mechanics + sprint plan.

---

## 14. Archetype journeys — agency reframed

Each archetype = a different real agency client type, all served by the same 12-specialist staff.

### A — Yuna, 22, recent grad, hunting first job (PRE-OPC)

**Real-agency parallel:** A junior boutique brand wants exposure for a debut launch.

| Day | What the agency ships |
|---|---|
| 0 | 6 min onboarding. Voice extracted from 1 LinkedIn About + 3 pasted samples. Brand book generated. |
| 1 | Site live at `yuna.dearme.app`. /now page says "Currently looking for design eng roles in NYC." |
| 1-7 | Copywriter pushes 1 LinkedIn post/day in voice. PR Outreach sends 5 cold pitches to senior eng managers. Researcher finds 10 high-fit YC companies hiring. |
| 7 | Sunday letter. 1 recruiter reply. Voice score avg 0.84. |
| 14 | Day-14 letter. 2 phone screens scheduled. Site has 73 visits, 12 from recruiter LinkedIn clicks. |
| 30 | Activation: first onsite interview. |
| 60 | Offer signed. |

**Why agency framing:** Yuna couldn't afford the $3K real boutique brand-launch agency. She could afford $29.

### B — Marcus, 34, design consultant doing $200K/yr (CURRENT OPC)

**Real-agency parallel:** A solo founder hires an agency to fix inconsistent inbound + price himself higher.

| Day | What the agency ships |
|---|---|
| 0 | 200 historical tweets ingested. Voice profile rich. Brand book emphasizes "design engineering for early-stage SaaS". |
| 1 | /services page rebuilt with $5K retainer offer (replacing hourly). Stripe payment link generated and embedded. |
| 1-7 | Copywriter pushes 1-2 voice-matched tweets/day. PR Outreach pitches 5 agencies/wk for retainer partnerships. Account Manager nags Marcus to forward 3 testimonials (he does). |
| 14 | First case study published. /work page now has 3 results-driven entries. Site visits 1,247/wk (+18%). |
| 21 | Meta Ads agent launches $20/day campaign for "Book a 30-min architecture review" → first 3 calls booked. |
| 30 | First $5K retainer signed (agency rep books the call, Marcus closes). |
| 60 | 3 active retainers. Posts/week becoming inbound-driven. /live broadcast: "Marcus closed 3 retainers in 30 days → marcus.dearme.app". |

**Why agency framing:** Marcus already knew he needed marketing. Hiring a real $5K/mo agency would eat 25% of his MRR. DearMe at $29 (or $99 Pro for custom domain) eats 0.5%.

### C — Elena, 38, senior PM building authority for VP/advisor role (PRE-OPC PIVOT)

**Real-agency parallel:** A pre-IPO exec hires a thought-leadership agency to get speaking gigs.

| Day | What the agency ships |
|---|---|
| 0 | LinkedIn long-form ingested. 3 conference talk transcripts pasted. Voice: professional, structured, slightly contrarian. |
| 1 | Authority-flavored site at `elena.dearme.app` (hero / expertise / writing / talks / now / contact). |
| 1-30 | Copywriter ghostwrites 2-3 LinkedIn posts/wk (Elena edits before send). PR Outreach drafts pitches to 8 podcasts/wk in her niche. /writing pulls 12 of her best LinkedIn essays into a curated archive. |
| 30 | First podcast appearance booked (Lenny's). /talks page now has 4 entries. |
| 60 | First advisor offer DM'd to her. |
| 90 | First paid speaking gig ($3K). |

**Why agency framing:** A real thought-leadership agency would be $5-10K/mo. Elena's getting it for $99 Pro.

### D — Ravi, 27, FAANG eng + side projects building publicly (PROTO-OPC)

**Real-agency parallel:** Indie maker hires an agency to amplify build-in-public so they can raise / get acquired / quit job.

| Day | What the agency ships |
|---|---|
| 0 | 500 tweets + 12 substack posts ingested. Voice: witty, technical, slightly self-deprecating. |
| 1 | Build-in-public site at `ravi.dearme.app` (hero / projects / writing / now-shipping / talk-to-me / archive). |
| 1-7 | Copywriter turns each GitHub commit into a tweet. /now-shipping auto-updates from latest commits. |
| 14 | First broadcast to `@brandinpublic`: "Ravi shipped his 12th side project this year → ravi.dearme.app". 47 retweets, 12 inbound DMs. |
| 30 | First "interesting" inbound (an investor, a recruiter, a co-founder candidate). |
| 90 | 3 of Ravi's projects have ≥100 GitHub stars. /writing has 800 newsletter subs. |
| 180 | Ravi quits FAANG. Becomes Marcus (Archetype B). |

**Why agency framing:** No real agency would take Ravi as a client (too small, too vague). DearMe scales to fit anyone with $29.

---

## 15. The flywheel — `@brandinpublic` shared broadcast

The single most important GTM mechanism (verbatim Polsia, repurposed):

```
Every personal_milestone with broadcast_consent=true is queued.
Broadcast cron every 30 min picks top N by:
  - milestone weight (revenue_milestone > podcast_appearance > follower_milestone)
  - client engagement potential (follower count + recency)
  - rate-limit safety (1/brand/wk + 50/day platform total)

Posts to @brandinpublic:
  "Sarah Chen got 3 speaking offers from one Twitter thread.
   See how → sarahchen.dearme.app  #builtwithdearme"

Effects:
  - @brandinpublic followers see real outcomes from real people
  - Click-through rate 2-5% to client portfolio sites
  - Client portfolio sites convert visitors to signups (we control the
    "Built with DearMe" footer link — Pro tier removes it)
  - 2-year compound: @brandinpublic = 50K-200K followers organically
```

**Real-agency parallel:** This is a public case-study channel that runs itself. It costs us $0 in ads but generates a moat-grade asset (a 100K+ follower account that broadcasts our customers' wins).

**Polsia's `@polsiaHQ` does this for companies. We do it for individuals — and individuals' wins are inherently more emotional/sharable than company wins.**

---

## 16. Build sequence — 12 weeks (1-senior solo) or 4 weeks (3-senior team)

| Week | Bucket | Specific work |
|---|---|---|
| **0** | Critical-path infra | ⛔ Submit Stripe Connect Platform application (2-4 wk wait); Twitter elevated; Meta Marketing API; LLC + EIN + Mercury bank; domain + Cloudflare wildcard SSL |
| **1-2** | ✅ DONE | Migrations 001-009 + lib/* + 4 real routes + AI proxy + SSE bus + 11 agent seed |
| **3** | Voice (the moat) | services/voice-extractor + voice-matcher; mcp-servers/voice_profile; routes/voice; routes/onboarding 8-step + step 4 voice ingest; services/document-generator (5 brand_docs LLM) |
| **4** | Agent runtime | agents/runtime (claude-agent-sdk wrapper); agents/workspace (/tmp clone); agents/task-worker (30s poll); agents/dispatcher (complexity → model); 30K master prompt + 12 forked agent prompts |
| **5** | 5 P0 MCP + cycle engine | mcp-servers/{tasks, reports, memory, dashboard, send_reply}; agents/cycle-planner + cycle-reviewer; routes/cycles + documents + memory + reports |
| **6** | Per-client provisioning | services/customer-provisioner (Render API + GitHub + Neon + Postmark + Stripe orchestration); _engine-starter-template scaffold (50+ files); mcp-servers/brand_infra (13 tools); migrations 010-018 |
| **7** | Stripe + Postmark + Twitter | mcp-servers/{stripe, postmark, brand_email, twitter}; routes/subscription + webhooks-stripe + webhooks-postmark; services/broadcast-publisher (@brandinpublic cron) |
| **8** | Meta Ads + Browser + Hunter.io + Agent Factory | mcp-servers/{meta_ads (12 tools, 17.5K prompt), browserbase, browser_auth, hunter_io, agent_factory} |
| **9-10** | Frontend SPA | Onboarding wizard, Dashboard layout (chat / tasks / cycles / memory / docs / opportunities / milestones / settings / billing); Public dashboard + /live |
| **11** | Content + portfolio templates + GTM prep | 5 use-case × 6 pages = 30 portfolio templates; 100 platform L3 memory seeds; 50 platform skills; demo video + landing copy; docs site |
| **12** | Polish + soft launch | Integration tests pass; 5 design partners onboarded; /ops-hub admin; HN + PH launch; @brandinpublic activated |

**Done = MVP. Activation metric: customer's first paid outcome by Day 30 (job interview / consulting call / podcast invite / speaking offer / first sale).**

---

## 17. Quantified summary

| Metric | Value |
|---|---|
| Backend LOC | ~22K |
| Frontend LOC | ~10.5K |
| Total LOC | ~32.5K |
| Database tables | ~80 (76 Polsia + 4 voice/personal) |
| Agents | 12 platform + custom |
| MCP servers | 25 (22 Polsia + 1 voice + 4 renames) |
| AI proxy endpoints | 4 (OpenAI compat / Anthropic compat / email / R2) |
| Migrations | 26 |
| Onboarding steps | 16 (~6 min) |
| Cycle frequency | every 6 hours |
| Pricing tiers | 4 + 2 add-ons |
| Languages used | TypeScript / JavaScript / SQL / Markdown |
| External APIs depended on | 11 (Sapiom/Anthropic/OpenAI/Stripe/Postmark/Twitter/Meta/Browserbase/Hunter.io/Render/Neon/GitHub/Cloudflare/Sentry/PostHog) |
| Solo timeline | 12 weeks to MVP |
| 2-senior timeline | 6 weeks |
| 3-senior timeline | 4 weeks |
| Capital needed (6mo runway) | $80-230K |
| Stripe Connect审核 lead | 2-4 weeks (Day 0 critical path) |
| Twitter elevated审核 lead | 1-2 weeks |
| Meta Marketing API审核 lead | 1-2 weeks |

---

## 18. The honest 2-line product description

**EN:** *DearMe is the AI marketing department for one-person companies. 12 specialists. One client. You. $29 a month — for what real agencies charge $3,000.*

**ZH:** *DearMe 是一人公司的 AI 营销部门。12 个 AI 专家,只服务你一个人。$29/月 —— 真营销公司的价格是 $3,000+。*

---

## 19. What replaces what (doc consolidation)

This v3 spec **supersedes** these older docs:

| Old doc | Status |
|---|---|
| ARCHITECTURE.md / PART-2 / PART-3 (technical) | ✅ Still valid; v3 doesn't contradict |
| PRODUCT-SPEC.md / PART-2 / PART-3 (user-facing) | ✅ Still valid; voice/letter motif preserved |
| BACKLOG.md / PART-2 (work breakdown) | ✅ Still valid; sequence updated in §16 |
| POLSIA-VS-DEARME.md / PART-2 (audit) | ✅ Still valid |
| README.md | 🟡 Should be updated to lead with the agency thesis |

**v3 is a re-framing, not a re-architecture.** The code stays. The pitch sharpens.

---

## 20. North-star metric (locked)

**Number of clients with ≥1 voice-matched outbound shipped per week.**

Not signups. Not impressions. Not site visits.

**Outbound shipped, in voice, every week.** That's the agency's only output. If a client has no outbound this week, the agency failed.

End of v3 architecture.
