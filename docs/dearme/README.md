# DearMe

> A private AI growth team for one person. Turns a single human's work, voice,
> proof, and relationships into shipped content, opportunities, a live personal
> site, and a daily "Dear me" letter.

---

## Start here

**→ [`INDEX.md`](INDEX.md) — North-star index. Read first. 5 minutes.**

It pins:

- the product in one sentence + the ≤5min aha moment
- the 12 roles and which ticket / plugin owns each
- the architecture in one diagram
- the four doctrines that don't get re-litigated
- what's shipped vs. what's left
- where to read more

If anything in this folder contradicts `INDEX.md`, `INDEX.md` wins.

---

## Canonical docs (only these affect runtime decisions)

1. [`INDEX.md`](INDEX.md) — orientation
2. [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md) — surface, packages, doctrine, sprint timing
3. [`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`](POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md) — ticket-level work breakdown
4. [`REUSE-IMPLEMENTATION-LEDGER.md`](REUSE-IMPLEMENTATION-LEDGER.md) — what is actually built and verified
5. [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md) — what's safe to port, what isn't

## Runtime source of truth (code, not docs)

- [`packages/plugins/dearme-agent-prompts/src/registry.ts`](../../packages/plugins/dearme-agent-prompts/src/registry.ts) — `DEARME_ROLE_REGISTRY`. The 12 roles, pinned to prompts, state machines, proxy tools, plugin packages, and tickets. **Single typed source of truth.**
- [`packages/dearme-ai-proxy/src/contract.ts`](../../packages/dearme-ai-proxy/src/contract.ts) — wire contract: `dm_sk_` keys, dual-protocol cost-attribution headers, agent-run shape.
- [`packages/dearme-ai-proxy/src/functions.ts`](../../packages/dearme-ai-proxy/src/functions.ts) — 6 OpenAI native function definitions ported verbatim.

## Reference / research (read on demand)

These are not stale, but they are not the load-bearing docs. Use them when researching a specific decision: `POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`, `POLSIA-NAIVE-PM-ANALYSIS.md`, `POLSIA-NAIVE-COMPARISON.md`, `POLSIA-NAIVE-REUSE-PLAN.md`, `POLSIA-MARKETING-PACKAGING-GUIDE.md`, `LINDY-ASSISTANT-REUSE-PLAN.md`, `ACTION-GRAPH-ARCHITECTURE.md`, `INTEGRATED-ARCHITECTURE.md`, `AGENCY-AGENTS-REFERENCE.md`, `BUILD-STATE.md`, `BASELINE-SPINE-MANIFEST.md`, `CODE-PROVENANCE-FACT-CHECK.md`, `2026-05-09-WRAP-UP-RETROSPECTIVE.md`.

## Superseded (do not follow as guidance)

Banner-marked at the top of each file: `BACKLOG.md`, `BACKLOG-PART-2.md`, `COMPARISON-FINAL.md`, `POLSIA-VS-DEARME.md`, `POLSIA-VS-DEARME-PART-2.md`, `V3-ARCHITECTURE*.md`, `V4-ARCHITECTURE*.md`, `ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-3.md`, `PRODUCT-SPEC*.md`, `PAPERCLIP-EVALUATION.md`, `WEB-UI-REUSE-ARCHITECTURE.md`, `WORKTREE-INTEGRATION-PLAN.md`, `AUTOMATION-RELIABILITY-COST-POLICY.md`.

## Run locally

```bash
pnpm install
pnpm dev                                                 # API + UI
pnpm --filter @paperclipai/dearme-agent-prompts test     # 21 tests
pnpm --filter @paperclipai/dearme-ai-proxy test          # 4 tests
```

## Source material

Private references for product judgment (not provenance):

- `~/Desktop/polsia-recon-2026-05-05/` — Polsia research archive
- `~/naive-research-2026-05-05/` — Paperclip/Naive architecture notes
- `https://github.com/msitarzewski/agency-agents.git` @ `783f6a72` — MIT role-library reference
- local Paperclip fork (this repo)

See [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md) for the rules that govern what shipped DearMe code may and may not derive from.
