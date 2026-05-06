# Polsia vs DearMe — Final Comparison (v3 + Side Hustle)

> Canonical side-by-side after positioning lock and 5-archetype funnel addition. Supersedes earlier `POLSIA-VS-DEARME.md`.

---

## 0. The 1-line difference

> **Polsia builds and runs companies. DearMe markets people.**
> Architecture 95% identical. Customer + outcome 100% different.

---

## 1. Customer & TAM

| | Polsia | DearMe |
|---|---|---|
| **Buyer** | Founder with idea wanting to start a SaaS company | OPC founder + Side Hustler + Pre-OPC + Career builder + Post-OPC scaler |
| **Buyer state** | "I have an idea, need a product" | "I have a person (me), need distribution" |
| **TAM size** | Founders globally (~10M serious) | Working adults with side income or career mobility (~500M+) |
| **Largest entry segment** | Indie hackers / aspiring founders | **Side Hustlers (45% of workers)** |
| **Activation outcome** | First paying SaaS customer | First job offer / first retainer / first podcast / first $1K side-MRR |
| **Real-world equivalent** | Y Combinator-in-a-box | One-person ad/PR agency-in-a-box |

---

## 2. Architecture — what's literally the same

| Layer | Polsia | DearMe | Diff |
|---|---|---|---|
| Runtime | Node 18+ CommonJS | ✅ identical | 0 |
| Web framework | Express 4 | ✅ identical | 0 |
| Database | Neon Postgres + pgvector ivfflat | ✅ identical | 0 |
| Session | connect-pg-simple (no Redis) | ✅ identical | 0 |
| Cron | node-cron in-process | ✅ identical | 0 |
| LLM SDK | openai + @anthropic-ai/sdk + claude-agent-sdk | ✅ identical | 0 |
| MCP | @modelcontextprotocol/sdk stdio | ✅ identical | 0 |
| Frontend | Vite + React 19 + Tailwind + shadcn/ui | ✅ identical | 0 |
| Hosting | Render Web Service | ✅ identical | 0 |
| Email | Postmark | ✅ identical | 0 |
| Files | Cloudflare R2 | ✅ identical | 0 |
| Payments | Stripe + Connect | ✅ identical | 0 |
| Browser | Browserbase | ✅ identical | 0 |
| Errors / Analytics | Sentry / PostHog | ✅ identical | 0 |
| **Sum** | 14 stack choices | 14 stack choices | **0** |

**Zero novel stack choices.** Every dep is Polsia-validated at 89,572 customers.

---

## 3. Architecture — what's structurally identical

| | Polsia | DearMe | Diff |
|---|---|---|---|
| Service topology layers | 3 (HQ / per-customer / per-task) | ✅ identical | 0 |
| Database tables | 76 | ~80 | +4 (voice tables) |
| Agent roster | 12 platform | 12 platform | 0 (renames only) |
| MCP servers | 22 | 25 | +1 voice + 4 renames |
| AI proxy endpoints | 4 (OpenAI / Anthropic / email / R2) | 4 | 0 |
| Cycle frequency | every_6_hours default | ✅ identical | 0 |
| Memory layers | 3 (15K + 3K + 15K) | ✅ identical | 0 |
| Onboarding steps | 16 (~6 min) | 16 (~6 min) | 0 (Step 4 reframed) |
| Pricing tiers | 4 (trial/starter/pro/enterprise) | ✅ identical | 0 |
| Public surfaces | 4 (landing/live/public-dash/portfolio) | ✅ identical | 0 |
| Stripe Connect take rate | 20% | ✅ identical | 0 |
| Per-customer auto-provision (Render+GitHub+Neon+Postmark+Stripe) | ✅ | ✅ identical | 0 |
| **Structural identity** | — | — | **>95%** |

---

## 4. The 5 things DearMe adds (the entire delta)

| # | Item | LOC delta | Why |
|---|---|---|---|
| 1 | `voice_profile` MCP server (4 tools) | +600 | The moat: voice cloning |
| 2 | 3 new tables: `voice_profiles` / `voice_match_history` / `voice_signature_index` | +200 | Persist + audit voice scores |
| 3 | Voice gate (≥0.7) on every outbound (Twitter, Cold Outreach, Site copy, Chat-as-user) | +400 | Prevent AI slop |
| 4 | "Dear me" letter motif (Reporting agent prompt + 6 brand rituals) | +0 (prompt only) | Core product personality |
| 5 | Side Hustle Mode toggle + work_mode field + 4 prompt branches | +200 | Cater to time-poor 45% TAM |

**Total delta: +1,400 LOC over Polsia baseline. Architecture <5% changed.**

---

## 5. The 5 string renames (the only Polsia code-touches that aren't pure copy)

| # | Polsia | DearMe |
|---|---|---|
| 1 | Polsia | DearMe |
| 2 | company / companies | brand / brands |
| 3 | CEO (id 51 agent) | Manager |
| 4 | leads (table) | opportunities |
| 5 | polsia.app / polsia.com | dearme.app |

---

## 6. Customer-facing diff (what users see)

### Onboarding
| | Polsia | DearMe |
|---|---|---|
| First question | "What's your idea?" | "What should I call you?" |
| Step 4 critical input | Company description | **Connect Twitter/LinkedIn/Resume → voice profile generated** |
| Step 6 goal options | Idea / building MVP / early customers / scaling | job_hunting / side_hustle / solo_business / career_promotion / personal_branding |
| **Step 6 sub-question (DearMe only)** | — | After solo_business → **Full-time? Side hustle? Pre-OPC?** |
| Output artifact | New SaaS company at `acmecorp.polsia.app` | Personal portfolio site at `yourname.dearme.app` |

### Daily output
| | Polsia | DearMe |
|---|---|---|
| 06:00 email subject | "Day N Report" | **"Dear me, day N"** |
| Email body style | Structured (sections, bullets) | **Conversational letter, ≤200 words, voice-matched** |
| Greeting on dashboard | "Welcome back" | **"Dear me, here's what you missed"** |
| Mood faces | ~300 cold (`expr-coding`, `expr-debugging`) | + 30 warm (`expr-pleased-quietly`, `expr-tender`) |
| Task failure | silent in queue | **"Dear me, this didn't land" telegram** |
| Sunday | nothing special | **Weekly Sunday letter, 400 words, reflective** |
| Day-100 milestone | nothing | **"Dear me, 100 days in" retrospective** |
| 14 days no login | nothing | **"Are you OK?" letter sent automatically** |

### Voice
| | Polsia | DearMe |
|---|---|---|
| Twitter voice | shared dark-humor template across 89K | **per-customer cloned voice** |
| Email voice | "founder-to-founder" template | **client's own voice (>0.7 match required)** |
| Site copy voice | LLM default | **client's voice** |
| Voice score gate | none | **>0.7 to send autonomously; <0.5 fails fast** |
| Forbidden phrase blocking | none | **enforced hard block** ("synergy", "leverage", etc.) |

### Output pages
| | Polsia | DearMe |
|---|---|---|
| Site type | Company landing + features + pricing | **Personal portfolio (6 pages)** |
| Page list | hero / features / pricing / about / contact | hero / about / **work-or-services-or-shop** / writing / **/now** ⭐ / contact |
| `/now` page | not central | **highest-churn page, 1×/cycle auto-update** (Derek Sivers /now style) |
| Custom domain | Pro+ only | ✅ identical |
| Footer | "Built by Polsia" | "Built with DearMe" + `#builtwithdearme` |

### Public flywheel
| | Polsia | DearMe |
|---|---|---|
| Public profile URL | `polsia.com/{slug}` | `dearme.app/u/{slug}` |
| /live cross-customer feed | company milestones | **personal milestones** (gigs / deals / podcasts / followers) |
| Shared Twitter handle | `@polsia` | `@brandinpublic` |
| Marketing handle | `@polsiaHQ` | `@dearme` |

---

## 7. Pricing — identical numbers, different positioning

| | Polsia | DearMe |
|---|---|---|
| Trial | 3 days | ✅ identical |
| Starter | $29/mo | ✅ identical |
| Pro | $99/mo (inferred) | ✅ identical |
| Enterprise | custom | ✅ identical |
| +Brand/Company add-on | +$29 | ✅ identical |
| +Task pack (30) | +$29 | ✅ identical |
| Stripe Connect take | 20% | ✅ identical |
| Monthly budget cap | $49/mo | ✅ identical |
| Anchor framing | "AI co-founder" | **"Real agency = $3K-10K/mo. We're $29-99."** |

---

## 8. Business model — same engine, different framing

| | Polsia | DearMe |
|---|---|---|
| Revenue model | Subscription + Connect take rate | ✅ identical |
| Gross margin (LLM) | ~95% (gemini-flash-lite mostly) | ✅ identical |
| Stickiness driver | Per-customer Render service + auto-tasks | + voice profile = unswitchable |
| Moat | AI proxy lock-in (`POLSIA_API_KEY` injected into customer apps) | **AI proxy + voice profile (per-customer brand book)** |
| Reference customer cost | $0.99/exec × 50/mo = $49 | ✅ identical |

---

## 9. The 12 agents — identical roster, role-renamed

| Polsia agent | DearMe agent | Real-world agency role |
|---|---|---|
| CEO (id 51) | **Manager** | Account Manager |
| Engineering (id 30) | **Brand Site Builder** | Web Designer |
| Twitter (id 53) | Twitter | Senior Copywriter |
| Cold Outreach (id 54) | **Opportunity Hunter** | PR / Outreach |
| Meta Ads Manager (id 52) | Meta Ads Manager | Media Buyer |
| Research (id 29) | Research | Research Analyst |
| Browser (id 42) | Browser | Field Researcher |
| Data (id 33) | Data | Performance Analyst |
| Reporting (id 35) | **Reporting (DearMe-letter format)** | Account Reporter |
| Monitoring (id 37) | Monitoring | Performance Analyst |
| Support (id 32) | Support | Inbound CSR |
| Chat (id 38, hidden) | Chat | Account Manager (live) |
| Onboarding (id 39, transient) | Onboarding | Intake Specialist |

**12 platform agents = 12 agency roles.** No additions, no drops.

---

## 10. Anti-products (what neither is, and what each isn't)

|  | Polsia is NOT | DearMe is NOT |
|---|---|---|
| 1 | A no-code site builder | A no-code site builder |
| 2 | A linkedin-spam tool | A linkedin-spam tool |
| 3 | A founder coach | A career coach |
| 4 | An assistant (calendar/inbox/reminders) | An assistant (calendar/inbox/reminders) |
| 5 | A journaling app | A journaling app |
| 6 | (n/a) | A company-builder (we don't make SaaS for you) |

---

## 11. Engineering effort delta

| | Polsia (built over years) | DearMe (build new) | Delta |
|---|---|---|---|
| Total backend LOC | unknown (~30-50K) | ~22K (1:1 fork + 4 voice tables) | -30-60% (smaller scope V1) |
| Database tables | 76 | ~80 | +4 |
| MCP servers | 22 | 25 | +3 (1 new + 4 renames + 1 dropped twitter-read) |
| Agent prompts | 12 (own IP) | 12 (forked verbatim from Polsia recon) | 0 net new prompts to write |
| Onboarding flow | 16 steps | 16 steps | 0 |
| **Build timeline** | unknown | **6-12 wks (1-3 senior)** | — |
| **Capital** | unknown | **$80-230K for 6 mo runway** | — |

---

## 12. The honest assessment

**Architecture: DearMe is a Polsia clone. Code-level overlap >95%. The four innovations (voice MCP, voice tables, voice gate, letter motif) are all bolt-ons to a Polsia-shaped runtime.**

**Customer: DearMe and Polsia don't compete. Polsia is for "I want to build a company". DearMe is for "I want the world to find me". Different lifecycle stages. A Polsia customer might graduate to DearMe (their company is built; now they need personal-brand growth). A DearMe customer might graduate to Polsia (their personal brand is built; now they want to build a SaaS too).**

**Strategic position: We are not "the next Polsia". We are "Polsia's playbook applied to a different buyer". This is a strength — Polsia validated the architecture at 89K customers; we just point it at a different (and TAM-larger) market.**

**The 1-paragraph elevator pitch:**

> *DearMe is the AI marketing department for one-person companies. We took the architecture Polsia proved at 89,572 customers and pointed it at the 500M+ working adults with personal brands to grow. 12 AI specialists. One client. You. $29 a month — for what real agencies charge $3,000.*

---

## 13. Side-by-side at a glance

```
                  Polsia                     DearMe
                  ──────────────────         ──────────────────
Customer:         founder (with idea)         person (with skills)
Output:           a SaaS company              a personal site + outbound
Voice:            company brand               your own voice (cloned)
Daily letter:     "Day N Report"              "Dear me, day N"
Pricing:          $29-$99-custom              $29-$99-custom (identical)
Agents:           12                          12 (renamed roles)
MCP:              22                          25 (+ voice + renames)
TAM:              founders                    OPC funnel (much wider)
Take rate:        20% Connect                 20% Connect (identical)
Architecture:     proven at 89K               1:1 fork
The moat:         AI proxy + workflows        AI proxy + voice profile
The pitch:        AI builds your company      AI markets you
```

**Same engine. Different driver. Different destination.**

End of comparison.
