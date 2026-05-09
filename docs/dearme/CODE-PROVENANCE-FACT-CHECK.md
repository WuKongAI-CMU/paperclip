# DearMe code provenance — fact check

Date: 2026-05-09
Scope: settles the recurring "DearMe is a 95% Polsia clone" claim with
evidence from the actual repository state. Pairs with
`REBRAND-AND-PROVENANCE.md` (governance) and supersedes the engineering
implications in `POLSIA-VS-DEARME.md`, `POLSIA-VS-DEARME-PART-2.md`, and
`COMPARISON-FINAL.md`.

简体中文摘要：**DearMe 代码 95% 同源的对象是 Paperclip（即 Naive 的 OSS 上游），不是
Polsia。** 之前文档里的 "95% identical Polsia fork" 是产品形态层面的概念图谱比喻，
不是代码事实。请按本文事实做工程决策。

---

## 1. The claim being checked

> "DearMe is a Polsia clone. Code-level overlap >95%. The four innovations
> (voice MCP, voice tables, voice gate, letter motif) are all bolt-ons to
> a Polsia-shaped runtime."
>
> — `POLSIA-VS-DEARME.md` §12, `COMPARISON-FINAL.md` §12,
> `POLSIA-VS-DEARME-PART-2.md` §16-17

This is **wrong as a code-level statement** and only roughly true as a
product-shape analogy. The historical docs were written before the
Paperclip pivot (`PAPERCLIP-EVALUATION.md`, 2026-05-07) and were never
re-grounded after the fork base changed.

---

## 2. The actual fork base

`FORK-NOTE.md` and `package.json` are the source of truth:

```
This repo is a fork of paperclipai/paperclip (MIT) at commit d6d7a7ce
("Add routine revision history and restore flow #5285", 2026-05-05).
```

```
package.json → "name": "paperclip"
git remote     upstream = github.com/paperclipai/paperclip.git (read-only)
git branch     master tracks upstream untouched; all DearMe work on `dearme`
```

**Naive runs the same OSS** (`naive-research-2026-05-05/EVERYTHING.md`
"9 大架构事实" §1, and `paperclipai-server-2026.428.0/` npm dist
extracted from Naive prod). Therefore:

> DearMe and Naive share an upstream. DearMe and Polsia do not.

---

## 3. Hard numbers — DearMe code vs Polsia code

Measured 2026-05-09 against
`/Users/peter/Desktop/polsia-recon-2026-05-05/expanded/instances/foundros/`
(largest available real Polsia per-customer source) and
`/Users/peter/OK Partner/third_party/polsia-engine-starter-template/`.

| Dimension | DearMe (this repo) | Polsia per-customer (foundros) | Ratio |
|---|---|---|---|
| Language | TypeScript ESM, strict | JavaScript CommonJS | different |
| Repo shape | pnpm monorepo: `cli/` `server/` `ui/` `packages/{db,shared,mcp-server,plugins,adapters,adapter-utils}` | single Express app: `server.js` + `routes/` + `lib/` + `services/` | different |
| ORM | Drizzle + embedded-postgres | raw `pg.Pool`, no ORM | different |
| Server LOC (TS in `server/src` + `packages/db/src` + `packages/shared/src`) | **205,309** | **5,236** in `server.js`; **5,882** total instance | **35× difference** |
| DB schema files (`packages/db/src/schema/*.ts`) | **75** drizzle pgTable schemas | — | — |
| DB tables (Polsia foundros migrations) | — | **13** (`agents`, `agent_executions`, `tasks`, `subscriptions`, `payments`, `orchestration_runs`, `agent_messages`, `autoresearch_state`, `autoresearch_runs`, `business_builds`, `build_cycles`, `outreach_records`, `autopilot_content`) | **5.7×** |
| Route files | **37** (`issues / approvals / heartbeat / routines / costs / environments / execution-workspaces / plugins / goals / dashboard / agents / activity / ...`) | **14** (`alerts / brokers / chat / dashboard / listings / messages / payments / properties / referrals / research / scraper / auth / analytics`) — note: foundros routes are real-estate broker domain, not platform abstractions | abstraction mismatch |
| Scheduling | `heartbeat_runs` table-backed wakeup queue + reaper + retry chain (35+ status-machine columns: `processPid`, `livenessState`, `continuationAttempt`, `retryOfRunId`, `processLossRetryCount`, `scheduledRetryAt`, …) | in-process `setTimeout(intervalMs)` self-rescheduling | different model |
| Work unit | `issues` table with atomic checkout, `blockedByIssueIds` DAG, parent tree, `executionRunId`, `assigneeAgentId` | direct `agent_executions` row inserts; no issue / approval concept | missing |
| Approval gate | `approvals` + `issue_approvals` + `issue_execution_decisions` first-class | none | missing |
| Adapter system | plugin-based (`@paperclipai/adapter-{claude-local,codex-local,cursor-local,gemini-local,openclaw-gateway,opencode-local,pi-local,acpx-local}`) | client SDKs in customer instance call `polsia.com/ai/openai/v1` or `/api/proxy/ai` directly with non-standard `task` field for cost ledger | different mechanism |
| Cost model | `cost_events` table, 5 indexes (`provider/biller/billingType/model + heartbeatRunId`), `budget_policies`, `budget_incidents` | inline `UPDATE agent_executions SET cost_usd=…`; ledger lives on `polsia.com` HQ (we have no source for that) | different |
| Multi-tenancy | `companies` first-class + `company_memberships` + `company_secrets` + `company_skills` + `company_user_sidebar_preferences` | one Render service per customer; one customer per instance; HQ does the multi-tenant fan-out (we don't have HQ source) | different model |
| Tests | Vitest + Playwright e2e + `multiuser-authenticated` suite | single-file `verify-*.js` node scripts | different |
| Storybook / UI dist | `@paperclipai/ui` Storybook + dashboard | `public/` static assets | different |

**Verbatim code overlap between DearMe and any Polsia source we have:
effectively zero.** Different language, different ORM, different
abstractions, different schedulers, different schema. Greppable shared
strings (e.g. `gemini-2.0-flash-lite`, `Bearer`, `pgvector`) are
ubiquitous infrastructure, not lineage.

---

## 4. Hard numbers — DearMe code vs Paperclip / Naive

| Dimension | DearMe | Paperclip OSS upstream | Naive prod build (`paperclipai-server-2026.428.0`) |
|---|---|---|---|
| Fork base | `paperclipai/paperclip @ d6d7a7ce` | itself | same upstream, packaged as npm dist |
| Language | TS ESM | TS ESM | TS ESM (compiled dist) |
| Schema files | 75 drizzle tables | ~75 (master branch tracks upstream untouched) | same |
| Routes | 37 | ~37 (1:1 minus `dearme.ts`) | same set, some endpoints disabled (`routines / costs / environments / skills / llms / access / plugins / adapters` return 404 in Naive prod, see `naive-research/ARCHITECTURE.md` §"OSS 有但 Naïve 关掉的") |
| Heartbeat semantics | identical | identical | identical |
| Issue / approval / cost model | identical | identical | identical |

**DearMe-specific deltas (in this repo today):**

- One added route file: `server/src/routes/dearme.ts`
- 41 commits on `dearme` branch (verified via `git log --oneline | wc -l`)
  touching mobile nav, chief-of-staff guardrails, voice-memory sources,
  weekly-report polish, action-graph cadence, etc.
- No new top-level packages added yet (`packages/dearme-voice-plugin/`
  from `FORK-NOTE.md` "DearMe additions (planned)" is still planned, not
  built — verify before claiming otherwise).

The 95% number is real **between DearMe and Paperclip/Naive**, not
between DearMe and Polsia.

---

## 5. What the historical "95% Polsia" docs actually meant

`POLSIA-VS-DEARME.md` and friends were written when the plan was to
**hand-roll** a Polsia-shaped Express+pg backend and bolt voice on top.
"95% identical" was a **product-spec contract**: same 14 stack
choices, same 12 agent roster, same 16 onboarding steps, same 4
pricing tiers, same 3-layer service topology, same Stripe Connect 20%.

After `PAPERCLIP-EVALUATION.md` (2026-05-07) we pivoted to fork
Paperclip instead. That pivot **invalidated the code-overlap claim** but
**preserved the product-shape claim** (Paperclip happens to also model
multi-company + agent + cycle + cost + approval, so the user-visible
shape can still be Polsia-like even though the code lineage isn't).

So the correct restatement is:

| Layer | What "95% same as Polsia" means |
|---|---|
| Stack choices (Node / Postgres / pgvector / LLM proxy / Render / Postmark / R2 / Stripe Connect) | True — same building blocks, but that's also true of Naive, Lindy, and a dozen other agent products |
| Product-spec contract (12 agents / 16 onboarding steps / 4 pricing tiers / 20% take rate / cycle rhythm) | True as design target, partially implemented |
| Source code lineage | **False.** Lineage is `paperclipai/paperclip → dearme branch`. Polsia source is reference material, not upstream |
| Verbatim file/function overlap | **Zero** with Polsia. **>95%** with Paperclip/Naive |

---

## 6. Operational implications

When making engineering decisions, do **not** treat any of these as code
truth:

- "Just port `runBuildCycle()` from Polsia" — that 340-line function
  lives in a single CommonJS server.js and does not map cleanly onto
  Paperclip's heartbeat-run + issue + approval substrate. Adapt the
  *idea* (4-step plan→generate→exec→summarize), not the code.
- "We have 76 Polsia tables" — we have 75 Paperclip tables. The
  Polsia-document table list (`brand_documents`, `voice_profiles`,
  `voice_match_history`, `voice_signature_index`, `personal_milestones`)
  is mostly **planned**, not present in `packages/db/src/schema/`. Audit
  before claiming otherwise.
- "AI proxy lock-in via `POLSIA_API_KEY` injection" — Paperclip uses an
  adapter plugin system instead. The proxy/lock-in moat needs to be
  rebuilt on adapter primitives if we want it; it is not for-free.
- "Stripe Connect 20% take is identical" — pricing/billing surface is
  not yet wired. Naive uses pass-through cost (`billingType: api`); the
  Polsia 20%-take model is a separate engineering project on top of
  Paperclip.

When making **product** or **positioning** decisions, the historical
docs are still useful as the design target (per `POLSIA-NAIVE-REUSE-PLAN.md`
and `POLSIA-NAIVE-COMPARISON.md`). Just translate them through the
"reuse Polsia-style choreography on Paperclip-style substrate" rule.

---

## 7. TL;DR

> **DearMe is a fork of Paperclip (≈ Naive's OSS upstream).** DearMe and
> Polsia share product DNA but **not source code**. Code-level overlap
> with Polsia is effectively zero; code-level overlap with
> Paperclip/Naive is >95%. The "95% identical Polsia fork" line in
> `POLSIA-VS-DEARME.md` is a pre-pivot product-spec analogy and should
> not drive code decisions.

Canonical precedence (from `REBRAND-AND-PROVENANCE.md` §"Canonical
precedence") still applies. This file is the engineering-evidence
addendum for that precedence chain.
