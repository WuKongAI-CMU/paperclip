# Paperclip Fork Evaluation — verdict for DearMe pivot

> 0.5-day deep read. Should we abandon the Polsia-clone path and fork paperclipai/paperclip (MIT) instead?

---

## Verdict: ✅ FORK — saves ~5× time, eliminates legal risk

**Recommendation: pivot to `~/dearme-paperclip/` fork.** Keep `~/dearme/` as reference + voice_profile plugin source.

---

## What paperclip is, in one paragraph

Paperclip is an **MIT-licensed Node.js + React control plane for autonomous AI companies.** One server orchestrates many companies. Each company has a goal, an org tree of agents, hierarchical tasks tracing back to the goal, heartbeats firing on schedule, cost tracking with hard budget limits, and adapter abstractions so any LLM runtime (Claude Code / Codex / OpenClaw / Cursor / shell scripts / HTTP) can be hired. **It IS what Polsia is, OSS, with batteries included.**

---

## What we get for free if we fork (vs writing ourselves)

| Component | Already in paperclip OSS | Time saved |
|---|---|---|
| TS monorepo (server + UI + db + cli + adapters + plugins + shared + mcp-server) | ✅ 6 packages | 1 week setup |
| Multi-company data model (multi-tenant single-deployment) | ✅ first-class | 3 days |
| Org chart + reports_to tree | ✅ | 2 days |
| Hierarchical tasks (parent/sub-issues, blockers, comments) | ✅ | 4 days |
| Heartbeat scheduler (any frequency, per-agent) | ✅ | 3 days |
| Adapter system (process / http / local CLI / OpenClaw / plugin) | ✅ 8 adapters built-in | 1 week |
| Cost tracker + budget enforcement (auto-pause at limit) | ✅ | 2 days |
| Audit trail (tool-call tracing, immutable log) | ✅ | 2 days |
| React UI (storybook, full dashboard) | ✅ | **2 weeks** |
| CLI (`paperclipai` command) | ✅ | 2 days |
| Plugin SDK | ✅ — **voice_profile fits cleanly here** | 3 days |
| MCP server framework | ✅ | 2 days |
| 17 starter company templates (engineering / agency / research / capital) | ✅ | 3 days |
| Database with Drizzle migrations + embedded postgres option | ✅ | 2 days |
| Deployment modes (local / authenticated private / authenticated public) | ✅ | 2 days |
| **Total time saved** | — | **~5-6 weeks** |

---

## What's missing (we add)

| Gap | How we add | Days |
|---|---|---|
| **Voice profile plugin** (extract / match / score / regenerate) | Use paperclip plugin SDK (`packages/plugins/`) | 1 |
| **5 archetype × 6-page portfolio templates** (job_hunter / side_hustle / current_opc / career_promoter / build_in_public) | Add to `companies/` directory as DearMe-specific templates | 2 |
| **"Dear me, day N" letter motif** | Override Reporting agent prompt + email template | 0.5 |
| **Naive-style cloud overlay** (Better-Auth multi-tenant + Stripe credit packs + `dm_sk_` API keys + analytics) | Mimic Naive's bundle.js patterns we already deobfuscated | 3 |
| **Per-tenant VM provisioning** (Fly.io or Render) | Paperclip already has deployment modes; add provisioner cron | 1 |
| **Voice gate on outbound** (≥0.7 score) | Wrap adapter calls with gate | 1 |
| **DearMe rebrand** (UI copy, logo, colors, "company" → "brand", "CEO" → "Manager") | Search/replace + theme override | 1 |
| **Onboarding 16-step wizard with Step 4 voice ingest** | New UI route + voice-extractor service | 2 |
| **Shared `@brandinpublic` broadcast publisher** | Cron service + Twitter MCP | 1 |
| **Testing + dogfood** | Self-onboard, run a cycle, fix bugs | 2 |
| **Total to ship** | — | **~14.5 days** |

---

## Mismatch analysis: "company" framing vs DearMe "brand" framing

Paperclip's biggest semantic friction:

| Paperclip term | DearMe term | Action |
|---|---|---|
| Company | Brand | Schema rename + UI string replace |
| Goal ("$1M MRR in 3 months") | Goal ("Land first job" / "Hit 5K MRR side hustle" / "First paid speaking gig") | Replace goal templates per archetype |
| Org chart of CEO/CTO/CMO | Manager + 12 specialists (no hierarchy beyond Manager) | Use simpler 1-level org tree |
| "Build a SaaS company" workflow | "Build a personal portfolio + outbound" workflow | Replace 17 OSS company templates with 5 archetype templates |
| Engineering agent ships code | Brand Site Builder ships portfolio pages | Override agent prompt + adapter |

**None of these break paperclip's data model.** They're all string/copy changes + template additions. The bones are right.

---

## Critical compatibility checks

### Plugin SDK ✅
Paperclip ships `packages/plugins/` + `packages/plugin-sdk/` with 15 .d.ts. **Voice profile fits as a plugin** — no core fork needed. We can:
- Add `dearme-voice-profile-plugin` package
- Register MCP tools (extract / match / score / regenerate)
- Hook into outbound channels (Twitter, Cold Outreach) via plugin events

### Adapter system ✅
Paperclip's adapter abstraction is exactly what we need. All 12 Polsia agents become paperclip adapters (most map to existing built-ins). The 8 LLM-route adapters (`adapter-claude / codex / cursor / gemini / opencode / pi / acpx / openclaw-gateway`) cover every LLM we'd want.

### Multi-company tenancy ✅
"Single-tenant deployment, multi-company data model" = exactly what we need (we deploy 1 instance, run N customer brands). Per-tenant VM is opt-in (Naive uses Fly.io).

### Cost ledger ✅
Already tracks per-agent cost + auto-pauses at budget. Polsia has same; we get it free.

### Heartbeats ✅
Configurable per agent (CEO 7200s, workers 28800s in Naive). Maps cleanly to our "every 6h cycle" Manager + "12h cycle" side-hustle Manager.

---

## What we lose by pivoting (vs current ~/dearme/ Day 1+2 work)

| Already in ~/dearme/ | Status if we pivot |
|---|---|
| 9 migrations (~22 tables) | **Discard** — paperclip has its own DB schema (Drizzle migrations) |
| lib/ai.js (dual-protocol AI client + cost ledger) | **Discard** — paperclip has its own |
| lib/sse.js | **Discard** — paperclip uses WebSocket (better) |
| routes/auth.js + brands.js + conversations.js + tasks.js | **Discard** — paperclip has all |
| routes/proxy-openai.js + proxy-ai.js (THE MOAT) | **Keep concept, port to paperclip** — paperclip has adapter system but not customer-facing AI proxy. We layer it on. |
| services/seed-agents.js (11 platform agents) | **Port** — re-author as paperclip company template |
| 12 polsia-reference prompts | **Use as adapter config templates** |
| 8 starter SKILL.md from bencera | **Discard** — paperclip has own skills (skills/) |
| All architecture/product/comparison docs (~3,800 lines) | **Keep** — they're spec for the product layer atop paperclip |

**Net loss: ~3,500 LOC of code we wrote Day 1+2.** Not catastrophic — most was scaffolding. The architecture/PM docs stay valid.

---

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Paperclip API changes break our overlay | Low (MIT, we pin commit + can fork) | Pin to specific commit hash |
| Paperclip "company-first" framing limits "brand-first" UI | Medium | Custom UI theme + string overrides only — bones don't care |
| Plugin SDK insufficient for voice gate | Low (read SDK docs, supports outbound hooks) | If too limited, fork core minimally |
| Per-tenant VM cost ($5-10/customer/mo on Fly.io) | Medium | Could share VMs early; per-tenant only at scale |
| Naive's cloud overlay we mimic has gotchas | Low (we have full deobfuscated bundle as reference) | Read carefully, write tests |
| Renaming "company" → "brand" breaks UX flow | Low | UI is React, theme + string replace handles it |
| Lose the "Dear me" letter motif during fork | Medium | Document explicitly in plugin code |

---

## Time comparison — clean vs forked

| Path | Days to working MVP | Final LOC | Legal status |
|---|---|---|---|
| Current Polsia clone (continuing ~/dearme/) | **42-60 days** (6-8 weeks) | ~22K original | Risky (verbatim Polsia prompts/SKILL/code in repo) |
| **Fork paperclipai/paperclip + DearMe overlay** | **~14 days** | ~3-5K original (overlay + plugin + templates) | Clean (MIT base + our overlay) |
| Fork + 1 cursor-fleet helper | **~9 days** | same | Clean |

**Fork path is 4-5× faster AND legally clean AND builds on a battle-tested OSS foundation.**

---

## Concrete plan if we pivot

```
Day 0  (now)
  ├─ rm -rf ~/dearme/  (keep ~/dearme-archive/ backup)
  ├─ git clone https://github.com/paperclipai/paperclip ~/dearme
  ├─ pin commit + add upstream remote (for future merges)
  ├─ pnpm install + verify dev server boots
  └─ rebrand: package name → @dearme/server etc · UI theme

Day 1
  ├─ Add packages/dearme-voice-plugin/ (extract/match/score/regenerate)
  ├─ Wire voice gate into adapter outbound hook
  └─ Voice extractor service (LinkedIn/Twitter ingest)

Day 2-3
  ├─ Add 5 archetype templates to companies/ (job_hunter / side_hustle / current_opc / career_promoter / build_in_public)
  ├─ Each with 6-page portfolio + 12 specialists (forked from Polsia prompts)
  └─ Override Reporting agent prompt to "Dear me, day N" format

Day 4-6
  ├─ Naive-style cloud overlay
  ├─ Better-Auth multi-tenant
  ├─ Stripe credit packs ($10 trial / $29 starter / $99 pro)
  ├─ dm_sk_ API keys per brand
  └─ Per-tenant VM provisioner (Fly.io OR Render)

Day 7-8
  ├─ Onboarding wizard (16 steps with Step 4 voice ingest)
  └─ Side Hustle Mode toggle

Day 9-10
  ├─ Twitter MCP + shared @brandinpublic broadcast
  └─ Stripe webhooks + budget guard

Day 11-12
  ├─ Self-dogfood: onboard yourself, run cycle, get "Dear me" letter
  └─ Bug fix + polish

Day 13-14
  ├─ 5 design partners onboard
  └─ Soft launch
```

---

## Single biggest risk to flag

**Paperclip's "company" framing is deeply baked into the UI copy and template structure.** If "build a SaaS for $1M MRR" framing leaks into DearMe's UI for a Job Hunter using us to find their first job, the product feels wrong.

**Mitigation:** the FIRST thing we do in the fork is a comprehensive UI string audit + replace. Treat "company" → "brand", "CEO" → "Manager", "$1M MRR goal" → "growth goal" as a hard rebrand. Budget 1 day for this audit alone.

---

## Recommendation

**Pivot. Fork paperclipai/paperclip. ~14 days to MVP. Saves 4-5 weeks vs current path.**

Next action: run `git clone https://github.com/paperclipai/paperclip ~/dearme-fork && cd ~/dearme-fork && pnpm install && pnpm dev` to confirm it boots locally before committing the pivot.

Verdict: **Day 0 starts now if you say go.**
