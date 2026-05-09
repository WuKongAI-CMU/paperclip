> **SUPERSEDED 2026-05-09.** Predates the runtime-port doctrine. Read [`INDEX.md`](INDEX.md) first; treat this file as historical research only.

# DearMe v3 — Architecture Part 2 (technical layer, agency-mapped)

> 2026-05-07 consolidation: historical source material only. Current direction
> is `README.md`, `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`,
> `POLSIA-NAIVE-REUSE-PLAN.md`, and `REBRAND-AND-PROVENANCE.md`. Do not follow
> clone/verbatim-copy instructions below when they conflict with those files.

> Continues `V3-ARCHITECTURE.md`. Same Polsia 100% clone, re-described through the agency lens.

---

## 7. Three-layer system (= agency operations stack)

```
Layer A — Agency HQ (our main service)
   This is where the "agency" lives. One Express monolith on Render.
   Holds:
     • Client roster (brands table)
     • Account managers' chat with each client
     • Voice profiles (each client's brand book)
     • Cycle scheduler (6h pulses)
     • Cross-client analytics + /live feed
     • AI proxy gateway (THE moat — every customer-app AI call routes here)

Layer B — Per-client studio (auto-provisioned)
   Each new client gets their own Render Web Service.
   Forked from `_engine-starter-template` with 8 baked-in SKILL.md files.
   Holds:
     • Their portfolio site code
     • Their per-client database namespace (Neon branch)
     • Their email server (Postmark sender)
     • Their Stripe Connect Express account (if commerce mode)
   Routes ALL its AI calls back to Layer A's /api/proxy/ai
   (env: POLSIA_API_KEY=<32-byte> → resolves to brand_id at proxy)

Layer C — Per-task workspace (sandboxed execution)
   Spawned per task in /tmp/dearme-workspaces/{brand}/{agent}/{exec}/
   git clone --depth=1 of client repo + claude-code subprocess
   Mounted MCP servers via stdio (per agent_tools row)
   Push back to remote on completion → triggers Render deploy
   Auto-cleanup after 24h
```

**Real agency parallel:**
- Layer A = the agency office where Account Managers live
- Layer B = each client's dedicated office floor (private workspace)
- Layer C = the conference room where one specialist works on one deliverable

---

## 8. Schema — agency-mapped table groupings

**~80 tables total. 76 verbatim from Polsia + 4 DearMe additions. Field types verbatim (BIGINT IDENTITY / TEXT / TIMESTAMPTZ / JSONB / vector(1536)).**

### Roster
| Polsia | DearMe | Agency role |
|---|---|---|
| users | ✅ | Agency owner / admin (you, the OPC owner of OPC owners) |
| companies | brands | The client account |
| user_sessions | ✅ | Login state |

### Staff
| Polsia | DearMe | Agency role |
|---|---|---|
| agents | ✅ | Specialist roster (12 platform staff + custom) |
| agent_tools | ✅ | Each specialist's tool permissions |
| agent_metrics | ✅ | Specialist performance review (daily) |
| agent_factory_templates | ✅ | Templates for hiring custom specialists |

### Client brand assets
| Polsia | DearMe | Agency role |
|---|---|---|
| company_documents | brand_documents (5 types renamed) | The brand book |
| (none) | ⭐ voice_profiles | The brand voice spec |
| dashboard_links | brand_links | Links the agency curates for client |

### Campaign system
| Polsia | DearMe | Agency role |
|---|---|---|
| tasks | ✅ | Each individual deliverable on a campaign |
| executions | ✅ | The actual production run of a deliverable |
| recurring_tasks | ✅ | Always-on retainer tasks |
| workflows + workflow_runs | ✅ | Multi-step campaigns |
| cycles + cycle_metrics | ✅ | The 6h sprint cycle |

### Knowledge layer
| Polsia | DearMe | Agency role |
|---|---|---|
| memory_layer1 | ✅ | Client's domain memory (15K tokens, per client) |
| memory_layer2 | ✅ | Client's preferences (3K, manager-curated) |
| memory_layer3 | ✅ | Cross-client patterns (15K, agency-wide playbook) |
| skills | ✅ | The agency's procedure library (50+ markdown) |
| learnings | ✅ | Insights captured during campaign execution |

### Pipeline
| Polsia | DearMe | Agency role |
|---|---|---|
| leads | opportunities (rename) | The PR / sales pipeline |
| ⭐ personal_milestones | personal_milestones | Wins worth broadcasting |
| ⭐ voice_match_history | voice_match_history | Every send's voice score (audit trail) |

### Comms
| Polsia | DearMe | Agency role |
|---|---|---|
| conversations + messages | ✅ | Account Manager chat thread |
| email_messages + contacts | ✅ | Outbound + inbound email |
| reports | ✅ | Reports the Reporter writes |

### Channels
| Polsia | DearMe | Agency role |
|---|---|---|
| twitter_oauth + twitter_posts + twitter_quota_log | ✅ | Twitter publishing channel |
| shared_broadcasts | ✅ | Cross-client `@brandinpublic` (case-study channel) |
| meta_ads_campaigns + creatives + metrics + state | ✅ | Paid media |
| postmark_servers + email_messages | ✅ | Email channel |
| site_pages + custom_domains | ✅ | Owned web channel |

### Infra (per-client)
| Polsia | DearMe | Agency role |
|---|---|---|
| instances + render_services + github_repos + neon_namespaces | ✅ | Each client's "studio" provisioning state |
| site_credentials + browser_contexts | ✅ | Field researcher's saved logins |

### Billing
| Polsia | DearMe | Agency role |
|---|---|---|
| subscriptions + referrals | ✅ | Retainer subscriptions |
| stripe_connect_accounts + payment_intents + invoices | ✅ | Pass-through commerce for client |

### Ops
| Polsia | DearMe | Agency role |
|---|---|---|
| feature_flags + audit_log + analytics_events + error_log | ✅ | Agency ops + audit |

---

## 9. AI proxy — agency-priced economics

This is the moat. **Same Polsia mechanism, agency-priced.**

```
Customer's per-client studio (Layer B):
  ENV:
    POLSIA_API_KEY = <32-byte random>
    OPENAI_BASE_URL = https://dearme.app/ai/openai/v1
    POLSIA_API_URL  = https://dearme.app/api/proxy/ai
  Code:
    openai.chat.completions.create({ model, messages, task: 'cust-X-Y' })
                                          │
                                          ▼  HTTPS
Agency HQ (Layer A) routes:
  /ai/openai/v1/chat/completions    OpenAI-compat
  /api/proxy/ai/messages            Anthropic-compat
  /api/proxy/email/send             Postmark wrapper
  /api/proxy/r2/upload              R2 wrapper

Each call:
  1. Auth: Bearer key → brand_id (per-client API key)
  2. Voice gate (if outbound content): voice_match.score ≥ 0.7
     → fail: re-prompt or escalate to human-approval queue
  3. Budget gate: brand.monthly_budget_usd not exceeded ($49 default)
     → fail: 429 retry_after
  4. Forward to upstream (Sapiom OR Anthropic OR OpenAI)
  5. Log to executions: brand_id, model, tokens, cost_usd, task metadata
  6. Return response verbatim
```

**Agency economics:**
- Upstream cost (gemini-2.0-flash-lite): ~$0.30 per 1M output tokens
- Per-client monthly LLM spend at $49 cap: ~50 cycles × ~7K tokens = ~350K tokens = ~$0.10 raw upstream
- Per-client revenue: $29-99
- **Gross margin: 99%+ on LLM. The agency's COGS is mostly Render hosting per-client (~$5-10/mo).**

---

## 10. The voice gate (the moat)

Before any outbound content leaves Layer A, it passes through `voice_profile` MCP:

```
Twitter agent drafts: "shipping a small dashboard refactor today.
                       cleaner state flow. tbh i should have done this
                       3 weeks ago."

→ MCP voice_profile.score_post({
     post_text: "...",
     voice_profile_id: brand.voice_profile_id
   })
→ Returns: { score: 0.88, signature_matches: 3, forbidden_hits: 0, pass: true }
→ AI proxy approves the send.

vs.

Twitter agent drafts: "I'm thrilled to announce a new product launch
                       that will leverage synergies in our user base."

→ score: 0.12, forbidden_hits: 4 ("thrilled to announce", "leverage",
                                    "synergies", "user base")
→ pass: false
→ Re-prompt with feedback: "Drop corporate-speak. Re-draft in user's
                             actual voice."
→ Max 3 retries. If still fail → escalate to chat for human approval.
```

**This is what makes DearMe content "sound like the client" — every send is gated.**

Mounted on: Twitter, Cold Outreach, Chat (when speaking AS user), Onboarding.

---

## 11. MCP servers — the agency's tool library (25 total)

### P0 (must ship in MVP)
| MCP | Tools | Agency role |
|---|---|---|
| tasks | 12 | Project management board |
| reports | 7 | Report writing tools |
| memory | 3 | Filing cabinet (3 layers) |
| dashboard | 4 | Mood + link management |
| send_reply | 1 | Real-time chat push |
| brand_infra | 13 | Studio provisioning (Render/Neon/GitHub/etc) |
| brand_support | 2 | Internal escalation |
| ⭐ voice_profile | 4 | Brand voice enforcement |
| documents | 3 | Brand book read/write |
| capabilities | 6 | Specialist directory |

### P1 (Week 5-8)
| MCP | Tools | Agency role |
|---|---|---|
| twitter | 4 | Publishing channel |
| postmark + brand_email | 7 | Email channel |
| stripe | 5 | Commerce |
| github | 7 | Code asset management |
| cycle_planning | 4 | Sprint planning |
| meta_ads | 12 | Paid media |
| learnings | 5 | Knowledge capture |
| scripts | 3 | Saved procedures |

### P2 (Week 9+)
| MCP | Tools | Agency role |
|---|---|---|
| browserbase | 9 | Field research |
| browser_auth | 11 | Saved client credentials |
| hunter_io | 2 | Email discovery |
| github_publish | 1 | Client-OAuth publishing |
| render | 5 | Direct Render ops |
| agent_factory | 5 | Custom specialist creation |

**25 MCP servers total. ~13K LOC across all (avg 500 LOC each).**

---

## 12. Per-client onboarding (16 steps, agency-flow)

A real agency's intake form mapped to DearMe screens:

| # | Real agency intake | DearMe screen |
|---|---|---|
| 1-2 | Lead lands on agency homepage | Landing + Signup |
| 3 | Client name | "What should I call you?" |
| 4 | Project URL handle | Pick `{slug}.dearme.app` |
| 5 | Discovery — past work + voice samples | ⭐ Connect Twitter/LinkedIn/Resume → voice extracted |
| 5b | (if no samples) Discovery interview | 5-question Identity Researcher fallback |
| 6 | Client goals | Goal select (job_hunting / solo_business / career_promotion / build_in_public / clean_personal_site) |
| 7 | Target audience | Multi-select audience |
| 8 | Existing site for reference | URL paste (parsed) |
| 9 | Primary call-to-action | book_call / hire_me / read_writing / subscribe / buy_service / talk_to_me |
| 10 | Brand book draft (~30-60s) | Generate 5 markdown brand_documents |
| 11 | Voice book draft (~15-30s) | Generate voice profile from samples |
| 12 | Client review of brand + voice | Editable docs + signature phrases preview |
| 13 | Sprint zero proposal (3-5 deliverables) | Approve starter tasks |
| 14 | Studio setup (~60-90s) | Provision Render + GitHub + Neon + Postmark + Stripe Connect |
| 15 | Retainer signing | Pick subscription tier (Trial/Starter/Pro) |
| 16 | Kickoff call | Welcome chat with Manager: "Dear me, …" |

**6 minutes. Replaces a 2-week real-agency onboarding.**

---

## 13. Pricing — agency-retainer reframed

| Tier | $/mo | Agency-equivalent | What's included |
|---|---|---|---|
| Trial | 0 (3 days) | Discovery call | Try the agency |
| Starter | $29 | Junior copywriter freelance | 1 client, 12 specialists, 15 instant tasks/mo, subdomain |
| Pro | $99 | Mid-tier solo agency retainer | 3 clients, priority models, 75 tasks/mo, custom domain, hide attribution |
| Enterprise | custom | Boutique agency exclusive | Unlimited clients, dedicated AM, SLA, white-label |
| +Brand | +$29 | Add a sub-brand | Stack |
| +Task pack | +$29 | Burst capacity | +30 instant tasks |
| **Stripe Connect** | 20% take rate | Agency gross margin on commerce | When client uses our Stripe to sell |

**Anchor: real boutique marketing agency retainers START at $3K/mo. We're $29/mo. 100× price reframe.**

---

(Part 2 ends — continued in V3-ARCHITECTURE-PART-3.md: archetype journeys, GTM, build sequence)
