# Polsia vs DearMe — Comparison Part 2

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.
>
> 2026-05-09 fact check: agent / MCP / proxy / cycle / onboarding tables below
> describe a Polsia-shaped target, not the implemented code. DearMe forks
> `paperclipai/paperclip`; the code substrate is Paperclip/Naive, not Polsia.
> See `CODE-PROVENANCE-FACT-CHECK.md` for evidence.

> Continues `POLSIA-VS-DEARME.md`. Agents + MCP + proxy + cycles + onboarding + GTM.

---

## 4. Agent roster

| id | Polsia | DearMe |
|---|---|---|
| 29 | Research | ✅ identical |
| 30 | Engineering | 🟡 still "Engineering" by id, but primary work shifts to **Brand Site Builder** (6-page portfolio output) |
| 32 | Support | ✅ identical |
| 33 | Data | ✅ identical |
| 35 | Reporting | 🟡 daily letter format ("Dear me, day N") + voice match in user's voice |
| 37 | Monitoring | ✅ identical |
| 38 | Chat | 🟡 voice_profile MCP mounted (replies as user when needed) |
| 39 | Onboarding | 🟡 Step 4 voice ingest + Identity Researcher fallback |
| 42 | Browser | ✅ identical |
| 51 | CEO | 🟡 renamed **"Manager"** (less corporate, more personal-brand) |
| 52 | Meta Ads Manager | ✅ identical (kept; OPC users still need ads) |
| 53 | Twitter | 🟡 + voice_profile gate (≥0.7 score required to post) |
| 54 | Cold Outreach | 🟡 renamed contextually to "Opportunity Hunter"; status enum changed; + voice gate |

**Agent count: 12 Polsia → 12 DearMe (no add, no drop). All prompts forked verbatim with renames.**

---

## 5. MCP servers

| Polsia (22) | Active in production debug? | DearMe |
|---|---|---|
| tasks | ✅ P0 | ✅ identical |
| reports | ✅ P0 | ✅ identical |
| memory | ✅ P0 | ✅ identical |
| dashboard | ✅ P0 | ✅ identical |
| send_reply | ✅ P0 | ✅ identical |
| documents | 🟡 P1 | ✅ identical |
| capabilities | 🟡 P1 | ✅ identical |
| polsia_infra | ✅ P0 | 🟡 renamed `brand_infra` (13 tools verbatim) |
| polsia_support | ✅ P0 | 🟡 renamed `brand_support` (2 tools verbatim) |
| twitter | 🟡 P1 | ✅ identical |
| meta_ads | 🟡 P1 | ✅ identical (12 tools, 17.5K prompt) |
| stripe | 🟡 P1 | ✅ identical |
| github | 🟡 P1 | ✅ identical |
| github_publish | 🟡 P2 | ✅ identical |
| render | 🟡 P1 | ✅ identical |
| postmark | 🟡 P1 | ✅ identical |
| company_email | 🟡 P1 | 🟡 renamed `brand_email` |
| hunter_io | 🟡 P2 | ✅ identical |
| browserbase | 🟡 P2 | ✅ identical |
| browser_auth | 🟡 P2 | ✅ identical |
| cycle_planning | ✅ P0 | ✅ identical |
| learnings | 🟡 P1 | ✅ identical |
| scripts | 🟡 P1 | ✅ identical |
| agent_factory | 🟡 P1 | ✅ identical |
| (none) | — | ⭐ **voice_profile** (4 tools: extract_signatures / match_voice / score_post / regenerate_profile) |

**Total: 22 Polsia + 1 DearMe (`voice_profile`) + 4 renames = 25 MCP servers in our spec.**

---

## 6. AI proxy (the moat)

| Aspect | Polsia | DearMe |
|---|---|---|
| OpenAI-compat endpoint | `polsia.com/ai/openai/v1` | ✅ same shape, our domain |
| Anthropic-compat endpoint | `polsia.com/api/proxy/ai` | ✅ same shape |
| Email proxy | `polsia.com/api/proxy/email` | ✅ same shape |
| R2 proxy | `polsia.com/api/proxy/r2` | ✅ same shape |
| Auth | `Bearer POLSIA_API_KEY` (per-customer 32-byte) | ✅ identical name & flow |
| Cost ledger field | non-standard `task` field on completions | ✅ identical |
| Sub tracking header | `X-Subscription-ID` | ✅ identical |
| Customer code | `openai.chat.completions.create({ model, messages, task: 'agent-X' })` | ✅ identical pattern |
| Routing | 99% gemini-2.0-flash-lite, 1% sonnet/opus | ✅ identical |
| Per-execution log row | `executions` table + cost_usd | ✅ identical |
| ⭐ Voice gate before send | none | ⭐ DearMe inserts voice_match score check before forwarding outbound content |

**The moat is identical. The only NEW gate is voice scoring on outbound content.**

---

## 7. Cycle engine

| Aspect | Polsia | DearMe |
|---|---|---|
| Frequency | every_6_hours (default) | ✅ identical |
| Phase 1 trigger | 11:30 PM cron | ✅ identical |
| Phase 2 execution window | 12:00 AM - 6:00 AM | ✅ identical |
| Phase 3 review trigger | 06:00 AM cron | ✅ identical |
| CEO planning prompt → 3-8 tasks JSON | ✅ identical structure | ✅ identical |
| Per-task workspace | `/tmp/polsia-workspaces/{c}/{a}/{e}/` | 🟡 `/tmp/dearme-workspaces/...` |
| Per-task git clone --depth=1 | ✅ identical | ✅ identical |
| Per-task claude-code subprocess + MCP mount | ✅ identical | ✅ identical |
| `task` metadata field | `agent-{id}-cycle-{n}-step` | ✅ identical |
| Self-scheduling via setTimeout(intervalMs) | ✅ identical | ✅ identical |
| Cleanup workspace 24h GC | ✅ identical | ✅ identical |
| Daily summary email format | structured ("What Shipped" / "System Health" sections) | 🟡 **conversational letter format** ("Dear me, day N…") |
| Cycle review aggregator | LLM reads accomplished/failed/blocked → summary | ✅ identical |
| ⭐ Sunday letter | none | ⭐ weekly extended-format reflective letter |
| ⭐ Day-100 letter | none | ⭐ retrospective "100 days in" letter |

**Engine identical. Output framing diverges (letter motif).**

---

## 8. Memory subsystem

| Aspect | Polsia | DearMe |
|---|---|---|
| 3-layer architecture | L1 15K + L2 3K + L3 15K | ✅ identical |
| Embedding model | OpenAI text-embedding-ada-002 (1536d) | ✅ identical |
| Index | pgvector ivfflat | ✅ identical |
| Conversation auto-save trigger | every 20 messages | ✅ identical |
| L1 nightly curator (dedup + prune) | ✅ identical | ✅ identical |
| L1 → L3 promotion at confidence > 0.9 | ✅ identical | ✅ identical |
| L2 update permission | CEO-only | 🟡 Manager-only (rename) |
| L3 platform seed entries | ~100 patterns about company-building | 🟡 ~100 patterns about **personal branding** (different content, same shape) |

---

## 9. Onboarding flow

| Step # | Polsia | DearMe |
|---|---|---|
| 1 | Landing | 🟡 "Dear me, build me a place on the internet" copy |
| 2 | Signup (email+pw or Google) | ✅ identical |
| 3 | Company name | 🟡 "What should I call you?" (full name) |
| 4 | Company description (text) | 🟡 ⭐ **Voice ingest** (Twitter/LinkedIn/resume/paste) — the moat-loading step |
| 4b | (none) | ⭐ Identity Researcher 5-Q interview fallback |
| 5 | Industry select | 🟡 Goal select (job_hunting / solo_business / career_promotion / personal_branding / build_in_public) |
| 6 | Stage select | 🟡 Audience select (recruiters / clients / peers / investors / customers / community) |
| 7 | Website (optional) | ✅ identical |
| 8 | Goal select | 🟡 Primary CTA (book_call / hire_me / read_writing / subscribe / buy_service / talk_to_me) |
| 9 | LLM generate 5 docs (30-60s) | ✅ identical mechanic, doc types renamed |
| 10 | Doc review | ✅ identical |
| 11 | Seed agents | 🟡 + voice profile generation (15-30s) |
| 12 | Approve starter tasks | ✅ identical |
| 13 | Auto-provision (Render+GitHub+Neon+Postmark+Stripe, 60-90s) | ✅ identical |
| 14 | Subscription | ✅ identical |
| 15 | UI tour | ✅ identical |
| 16 | Welcome chat from CEO | 🟡 from "Manager", opens with "Dear me, …" |

**Total: 16 steps Polsia → 16 steps DearMe. Step 4 reframed as voice ingest (the entire moat).**

---

## 10. Pricing + business model

| Aspect | Polsia | DearMe |
|---|---|---|
| Trial | 3 days | ✅ identical |
| Starter | $29/mo | ✅ identical |
| Pro | $99/mo (inferred from 4-tier spec) | ✅ identical |
| Enterprise | custom | ✅ identical |
| Add-on extra brand/company | +$29 | ✅ identical |
| Add-on task pack (30) | +$29 | ✅ identical |
| Monthly budget cap per customer | $49/mo | ✅ identical |
| Stripe Connect 20% take rate on customer revenue | yes | ✅ identical |
| Instant tasks (Starter) | 15/mo | ✅ identical |
| Instant tasks (Pro) | 75/mo | ✅ identical |
| Custom domain | Pro+ only | ✅ identical |
| White-label / hide attribution | Pro+ | 🟡 toggleable; default footer says "Built with DearMe" |
| Referral | $10 credit / 20% off | ✅ identical |

**Identical pricing model + take-rate model.**

---

## 11. Public surfaces / GTM flywheel

| Surface | Polsia | DearMe |
|---|---|---|
| Customer site URL | `slug.polsia.app` | 🟡 `slug.dearme.app` |
| Public dashboard | `polsia.com/{slug}` | 🟡 `dearme.app/u/{slug}` |
| `/live` cross-customer feed | yes (89K customers) | ✅ identical mechanic |
| Shared Twitter handle | `@polsia` | 🟡 `@brandinpublic` |
| Marketing Twitter | `@polsiaHQ` | 🟡 `@dearme` (or `@dearmeai`) |
| Footer attribution | "Built by Polsia" | 🟡 "Built with DearMe" |
| Hashtag | none | ⭐ `#builtwithdearme` (broadcast cross-promo) |

---

## 12. Voice / content quality (the differentiator)

| Aspect | Polsia | DearMe |
|---|---|---|
| Twitter agent voice | shared "dark humor / no emojis / bitter > excited" template across all 89K | ⭐ per-customer cloned voice (signature_phrases + forbidden_phrases + tone) |
| Cold email voice | "founder-to-founder, direct" template | ⭐ user's own voice (>0.7 match required) |
| Site copy voice | LLM default voice | ⭐ user's voice |
| Voice score gate | none | ⭐ **>0.7 to send autonomously**; <0.7 escalates |
| Voice training data | none | ⭐ Twitter (200 tweets) + LinkedIn (10 posts) + resume + pasted samples |
| Voice retraining trigger | n/a | ⭐ user clicks "retrain" or 30-day decay |
| Voice match history audit | n/a | ⭐ every send scored + retained in `voice_match_history` |
| Forbidden phrases (corporate-speak the user never uses) | n/a | ⭐ enforced as hard block |

**This is the entire differentiation. Polsia's `brand_voice` document is a paragraph; DearMe's `voice_profile` is a measurable, enforceable identity layer.**

---

## 13. Daily user-facing rituals

| Ritual | Polsia | DearMe |
|---|---|---|
| Morning summary | "Day N report" structured email | ⭐ "Dear me, day N" letter (≤200 words, conversational, voice-matched) |
| Sunday recap | none confirmed | ⭐ weekly Sunday letter (extended format, ~400 words) |
| Day-100 milestone | none confirmed | ⭐ "Dear me, 100 days in" retrospective |
| Failure feedback | task fails silently in queue | ⭐ "Dear me, this didn't land" telegram (honest, brief) |
| `/now` page | optional (auto-generated like other pages) | ⭐ **highest-churn page** — 1×/cycle automatic update |
| Mood face library | ~300 cold-startup faces (`expr-coding`, `expr-debugging`) | 🟡 inherits all + adds 30 warm faces (`expr-pleased-quietly`, `expr-tender`) |
| Greeting on dashboard load | "Welcome back" | 🟡 "Dear me, here's what you missed." |

**Mechanically the cycle engine + Reporting agent are identical. Output framing is what makes DearMe.**

---

## 14. What Polsia has that DearMe explicitly drops

**Nothing.** Per Peter's mandate ("100% Polsia + voice profile add-on"), DearMe carries every Polsia feature including Meta Ads Manager / Sora 2 / Stripe Connect 20% / Agent Factory / Browser agent / per-customer Render service / GitHub repo per customer.

**The only "drops" are 5 strings:**
1. "Polsia" → "DearMe"
2. "company" terminology → "brand"
3. "CEO" agent name → "Manager"
4. "leads" → "opportunities"
5. "polsia.app" / "polsia.com" → "dearme.app"

---

## 15. What DearMe adds (4 things, total)

1. ⭐ `voice_profile` MCP server (4 tools)
2. ⭐ 3 new tables (`voice_profiles`, `voice_match_history`, `voice_signature_index`)
3. ⭐ Voice gate at every outbound (Twitter, Cold Outreach, Site copy, Chat-as-user)
4. ⭐ "Dear me" letter motif (Reporting agent format + 6 brand rituals)

**Code delta: ~+2,000 LOC over Polsia baseline.**

---

## 16. Total architectural delta — counting

| | Polsia | DearMe | Delta |
|---|---|---|---|
| Core stack components | 17 | 17 | 0 |
| Service topology layers | 3 | 3 | 0 |
| Database tables | 76 | ~80 | +4 |
| Agent roster | 12 | 12 | 0 (renames only) |
| MCP servers | 22 | 25 | +1 voice + 4 renames |
| AI proxy endpoints | 4 | 4 | 0 |
| Cycle engine phases | 3 | 3 | 0 |
| Memory layers | 3 | 3 | 0 |
| Onboarding steps | 16 | 16 | 0 |
| Pricing tiers | 4 | 4 | 0 |
| Public surfaces | 4 | 4 | 0 |
| Brand rituals | 0 | 6 | +6 |
| **Sum of identical structures** | — | — | **>95%** |
| **Sum of structural divergences** | — | — | **<5%** |

---

## 17. The honest one-line summary

> **DearMe = Polsia + voice profile + letter-to-self framing + 5 string renames.**

Engineering-wise, DearMe is a Polsia clone with one new MCP server, 4 new tables, and a Reporting agent prompt rewrite. Marketing-wise, DearMe targets individuals (job hunters / solopreneurs / career builders) instead of companies. Architecturally, the divergence is <5%.

This is the Polsia recon's best lesson: **don't over-engineer the differentiation.** The product wins with positioning + voice quality, not architecture novelty.

End of comparison.
