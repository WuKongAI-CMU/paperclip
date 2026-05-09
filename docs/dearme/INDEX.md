# DearMe — North Star Index

> **The single document a new contributor (or future you) reads first.** Every other doc in this folder is supporting material. If something here conflicts with an older doc, **this wins.**

Last updated: 2026-05-09 (post `d111b9ce` aggressive runtime port)

---

## 1. The product in one sentence

**DearMe is a private AI growth team for one person.** It turns a single human's work, voice, proof, and relationships into shipped content, real opportunities (clients/jobs/podcasts/sponsorships), a live personal site, paid ads when worth it, and a 200-word "Dear me" letter every day.

### Aha moment (≤ 5 minutes from signup)

1. **0–30s** — Identity dossier appears (LinkedIn + GitHub + public posts pulled and synthesized, voice fingerprinted).
2. **60–120s** — Audience map and 5 outbound shortlist appear, three of them with verified emails.
3. **3–5min** — A live `dearme.app/<handle>` personal site is reachable from the user's phone.

If we ship that, we have a product. Everything else is amplification.

### Who pays

Solo operator with a public-facing professional surface — consultant, indie founder, candidate-on-market, creator-with-offer, agency-of-one — willing to spend `$X/month` to have a small AI team **run their growth without them**, in their voice, with weekly proof of work.

---

## 2. The team (12 roles, runtime-locked)

These are not "prompts in a doc" — they are typed entries in `DEARME_ROLE_REGISTRY` (`packages/plugins/dearme-agent-prompts/src/registry.ts`), each pinned to a verbatim production-verified system prompt, the state machines it depends on, the proxy tools it can call, the plugin package that owns its runtime, and the ticket that owns its build.

| # | Role | Group | Plugin package | Ticket | What it does |
|---|------|-------|----------------|--------|--------------|
| 1 | **Chief of Staff** | leadership | `dearme-chief-of-staff` | DM-139 | Always-on team lead. Monitors → reviews → keeps queue ≥ 3 → writes Dear-me letter. |
| 2 | **Reporting** | leadership | `dearme-reporting` | DM-139 | Sends the conversational, < 200-word, 3-tool daily letter. |
| 3 | **Content Producer** | growth | `dearme-content-producer` | DM-140 | Twitter/X 2/day, 280-char, dark-humor, attribution-link gated. |
| 4 | **Opportunity Hunter** | growth | `dearme-opportunity-hunter` | DM-141 | Finds + outreaches via 5-touch sequence, 8-state lifecycle, Hunter.io verified emails. |
| 5 | **Brand Site Builder** | build | `dearme-brand-site-builder` | DM-147 | Personal site: write code → fix → deploy. Push after every change. 512MB. |
| 6 | **Ads Manager** | growth | `dearme-ads-manager` | DM-148 | Meta ads end-to-end: 5 tools, 7-day learning, 4 perf tiers, Sora 2 UGC creative. |
| 7 | **Research** | intelligence | `dearme-research-agent` | DM-138 | Web search + synthesis; every task ends with a saved report. |
| 8 | **Audience Care** | ops | `dearme-audience-care` | DM-149 | Inbound replies + escalation matrix. Plain-text, length-matched. |
| 9 | **Data Analyst** | intelligence | `dearme-data-analyst` | DM-153 | Schema-first SQL/BI; correlation-vs-causation discipline. |
| 10 | **Health Monitor** | ops | `dearme-health-monitor` | DM-150 | Periodic factual snapshots; reports never recommends; dedupes against backlog. |
| 11 | **Chat** | interface | `dearme-chat` | DM-138 | User-facing cofounder chat; routes via `find_best_agent`; manages recurring tasks. |
| 12 | **Browser** | build | `dearme-browser-agent` | DM-151 | Web automation respecting 4-tier site policy. |

> **All 12 prompts are already shipped** in the runtime corpus. None of them are "planned content" — they are the verbatim production strings DearMe will execute at first run. What's still planned is the plugin runtime that wires each one to the work loop. See ticket column.

---

## 3. The architecture in one diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ ui/  React + Vite — workbench, voice gate, work products, /live     │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ SSE + REST
┌──────────────────────▼──────────────────────────────────────────────┐
│ server/  Express — routes (~41), services (~100), plugin host       │
│   • routines + heartbeat + execution_workspaces (Paperclip)         │
│   • cycle engine (every 6h) → CEO direct → Worker remote            │
└─────┬────────────────────────────────┬────────────────────┬─────────┘
      │ Drizzle                        │ plugin SDK          │ proxy
┌─────▼─────────┐   ┌──────────────────▼──────────────┐   ┌──▼──────────┐
│ packages/db   │   │ packages/plugins/               │   │ dearme-ai-  │
│  75+ tables   │   │  dearme-agent-prompts ★ SSOT    │   │  proxy      │
│  +opportunity │   │  dearme-<role> × 12 (ticketed)  │   │  dm_sk_…    │
└───────────────┘   └─────────────────────────────────┘   │  6 fns      │
                                                          │  dual-proto │
                                                          └─────────────┘
```

★ = the typed registry shipped this round. It is the single runtime source of truth for the team.

### Layer responsibilities

- **`packages/db`** — Drizzle schema. 75+ tables inherited from Paperclip + `opportunities` (DM-141 slice already landed).
- **`packages/plugins/dearme-agent-prompts`** — typed seed corpus: 12 prompts + 6 state machines + 2 templates + the **role registry** (`DEARME_ROLE_REGISTRY`) that pins everything together. **No runtime; pure data.**
- **`packages/dearme-ai-proxy`** — wire contract for the LLM proxy: `dm_sk_` keys, dual-protocol cost-attribution headers (`X-DearMe-Task` for OpenAI, `X-Subscription-ID` for Anthropic), 6 OpenAI native function definitions ported verbatim. **No runtime yet; just the contract.**
- **`packages/plugins/dearme-<role>`** — one per role, future: each registers a managed routine + worker that imports its prompt + state machines + proxy tools from the registry. Build order in §6.
- **`server/`** — host. Reads `DEARME_ROLE_REGISTRY` at boot, mounts each plugin, runs the every-6-hour cycle, surfaces SSE to UI, gates approvals.
- **`ui/`** — workbench-style surface (Lindy/Naive lineage), live event feed, voice-gate, batch approvals.

---

## 4. The doctrine (don't relitigate)

These four rules make the rest of the docs internally consistent. If any older doc contradicts them, that doc is stale.

1. **Aggressive verbatim port for runtime artifacts.** Server-side prompts, OpenAI function definitions, state machines, wire contracts, templates — port byte-for-byte from research with mechanical brand substitution (`Polsia → DearMe`, `polsia.com → dearme.app`). They are not customer-facing UI; they are mechanism. (See `PRODUCT-ARCHITECTURE.md` §9.0.)
2. **Customer-facing surface is original.** Marketing, brand identity, screen copy, public site, public language, support voice — all DearMe-original. No donor logos, wordmarks, or distinctive imagery.
3. **Useful first, autonomous first.** Don't gate the aha moment on consent screens, throat-clearing, or compliance theater. Approval gates exist where money or public action happens (publish / send / deploy / spend). Everywhere else, the team works.
4. **The registry is law.** If the registry says a role exists, it exists. If it doesn't, it doesn't. New roles require a registry entry + a ticket + a plugin package — not a new prompt file dropped in.

---

## 5. What's shipped vs. what's left

### Shipped (as of `d111b9ce` 2026-05-09)
- **DM-S01** — company mass-assignment vulnerability fixed + 92 shared tests green.
- **`opportunities` schema slice** — Drizzle table + 8-state machine + indexes (DM-141 schema landed; runtime pending).
- **`@paperclipai/dearme-agent-prompts`** — 12 verbatim prompts, 6 state machines, 2 templates, role registry, 21 tests green.
- **`@paperclipai/dearme-ai-proxy`** — 6 OpenAI function definitions, wire contract, `dm_sk_` API key prefix, 4 tests green.
- **Documentation lock** — `PRODUCT-ARCHITECTURE.md` (§9 aggressive-reuse doctrine), `REUSE-IMPLEMENTATION-LEDGER.md` (Physical Port Manifest), this `INDEX.md`.

### Next ticket (start here)

**DM-138 — First-run personal proof sequence (Identity Researcher; 0–30s dossier, 60–120s audience, 3–5min site live).**

This is the aha moment. Once it ships, you can DM the URL to one real person and see if they say "wait, you actually built me one?" That's the only product question that matters right now.

DM-138 reuses:
- `RESEARCH_AGENT_PROMPT` (registry id `research-agent`) for the dossier
- `CHAT_PROMPT` (registry id `chat`) for the conversational shell
- `dearme-ai-proxy` `web_search` + `create_report` for the proxy contract
- `BRAND_SITE_BUILDER_PROMPT` (registry id `brand-site-builder`) staged for the 3–5min site step

### Roadmap (compressed by aggressive port)

| Sprint | Window | Deliverable | Tickets |
|--------|--------|-------------|---------|
| 0 | done | Foundation, registry, contracts | DM-S01, DM-141 schema, registry, ai-proxy contract |
| 1 | days 1–7 | First-run aha moment live | DM-138, DM-139 |
| 2 | days 8–14 | Voice + content loop running | DM-140, DM-142, DM-146 |
| 3 | days 15–21 | Outbound + opportunity loop | DM-141 runtime, DM-149, DM-150 |
| 4 | days 22–35 | Site live + ads option + first paid beta | DM-147, DM-148, DM-153, DM-154 |

Total to first paid-beta surface: **~4–5 weeks** vs. the original 8–12 with paraphrased re-derivation.

---

## 6. Where to read more (canonical only)

The four docs below are the only ones that affect runtime decisions. Everything else in this folder is research / history / packaging.

| Doc | Use |
|-----|-----|
| **`INDEX.md`** (this) | The 5-minute orientation. |
| **`PRODUCT-ARCHITECTURE.md`** | Surface, packages, doctrine, sprint timing. |
| **`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`** | Ticket-level work breakdown. |
| **`REUSE-IMPLEMENTATION-LEDGER.md`** | What is actually built and verified. |

Plus governance:

- **`REBRAND-AND-PROVENANCE.md`** — what's safe to port, what isn't.

### Reference / research (read on demand, not by default)

`POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`, `POLSIA-NAIVE-PM-ANALYSIS.md`, `POLSIA-NAIVE-COMPARISON.md`, `POLSIA-NAIVE-REUSE-PLAN.md`, `POLSIA-MARKETING-PACKAGING-GUIDE.md`, `LINDY-ASSISTANT-REUSE-PLAN.md`, `ACTION-GRAPH-ARCHITECTURE.md`, `INTEGRATED-ARCHITECTURE.md`, `AGENCY-AGENTS-REFERENCE.md`, `BUILD-STATE.md`, `BASELINE-SPINE-MANIFEST.md`, `CODE-PROVENANCE-FACT-CHECK.md`, `2026-05-09-WRAP-UP-RETROSPECTIVE.md`.

### Superseded (do not follow as guidance)

Banner-marked at the top of each file:

`BACKLOG.md`, `BACKLOG-PART-2.md`, `COMPARISON-FINAL.md`, `POLSIA-VS-DEARME.md`, `POLSIA-VS-DEARME-PART-2.md`, `V3-ARCHITECTURE.md`, `V3-ARCHITECTURE-PART-2.md`, `V3-ARCHITECTURE-PART-3.md`, `V4-ARCHITECTURE.md`, `V4-ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-3.md`, `PRODUCT-SPEC.md`, `PRODUCT-SPEC-PART-2.md`, `PRODUCT-SPEC-PART-3.md`, `PRODUCT-SPEC-V3-ADDENDUM.md`, `PAPERCLIP-EVALUATION.md`, `WEB-UI-REUSE-ARCHITECTURE.md`, `WORKTREE-INTEGRATION-PLAN.md`, `AUTOMATION-RELIABILITY-COST-POLICY.md`.

These contain useful history but pre-date the runtime-port doctrine. Treat them as archives.

---

## 7. Repo entry points (for new contributors)

```bash
pnpm install
pnpm dev                                          # API + UI
pnpm --filter @paperclipai/dearme-agent-prompts test
pnpm --filter @paperclipai/dearme-ai-proxy test
pnpm --filter @paperclipai/db typecheck
```

To add a role: add it to `DEARME_ROLE_REGISTRY`, ship a plugin package under `packages/plugins/dearme-<role>/`, register a routine in the server.

To add a state machine: drop it in `packages/plugins/dearme-agent-prompts/src/state-machines/`, export it, reference it from the registry's `stateMachines` field.

To change a prompt: don't, except for mechanical brand substitution. Open a ticket if real divergence is needed; runtime-port doctrine governs.
