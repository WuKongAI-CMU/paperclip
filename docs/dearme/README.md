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
2. [`TRI-SUBSTRATE-ARCHITECTURE.md`](TRI-SUBSTRATE-ARCHITECTURE.md) — integration contract: OpenClaw + Naive + Polsia
3. [`OPENCLAW-INTEGRATION-ARCHITECTURE.md`](OPENCLAW-INTEGRATION-ARCHITECTURE.md) — DearMe runs on OpenClaw; OpenClaw-specific contract
4. [`PRODUCT-ARCHITECTURE.md`](PRODUCT-ARCHITECTURE.md) — surface, packages, doctrine, sprint timing
5. [`POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`](POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md) — ticket-level work breakdown
6. [`REUSE-IMPLEMENTATION-LEDGER.md`](REUSE-IMPLEMENTATION-LEDGER.md) — what is actually built and verified
7. [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md) — what's safe to port, what isn't

## Runtime source of truth (code, not docs)

- [`packages/plugins/dearme-agent-prompts/src/registry.ts`](../../packages/plugins/dearme-agent-prompts/src/registry.ts) — `DEARME_ROLE_REGISTRY`. 12 roles × prompt × state machines × proxy tools × **substrate** × ticket × plugin package. **Single typed source of truth.**
- [`packages/plugins/dearme-agent-prompts/src/state-machines/`](../../packages/plugins/dearme-agent-prompts/src/state-machines/) — 8 state machines: opportunity, meta-ads, budget-tier, dearme-cycle, mood-face-library, model-routing, sse-events, **work-loop**, **approval-gates**.
- [`packages/plugins/dearme-openclaw/openclaw.plugin.json`](../../packages/plugins/dearme-openclaw/openclaw.plugin.json) — OpenClaw plugin manifest (config schema, skill folder, UI hints).
- [`packages/plugins/dearme-openclaw/src/skill-generator.ts`](../../packages/plugins/dearme-openclaw/src/skill-generator.ts) — pure registry-to-SKILL.md projection.
- [`packages/plugins/dearme-openclaw/src/tools/types.ts`](../../packages/plugins/dearme-openclaw/src/tools/types.ts) — 7 outbound tool interfaces (post_x / send_linkedin_dm / send_telegram_message / send_imessage / send_email / deploy_site / create_meta_campaign) + `(gate, channel, voiceGateRequired)` bindings.
- [`packages/plugins/dearme-openclaw/generated/skills/`](../../packages/plugins/dearme-openclaw/generated/skills/) — 12 generated SKILL.md files OpenClaw loads. Do not edit by hand.
- [`packages/shared/src/validators/dearme.ts`](../../packages/shared/src/validators/dearme.ts) — Brand OS and first-cycle preview contracts, including `autonomyPlan` and `DEARME_FIRST_CYCLE_CONCERN_GATES` for the launch-boundary-only first-run UX.
- [`packages/dearme-ai-proxy/src/contract.ts`](../../packages/dearme-ai-proxy/src/contract.ts) — wire contract: `dm_sk_` keys, dual-protocol cost-attribution headers, agent-run shape.
- [`packages/dearme-ai-proxy/src/functions.ts`](../../packages/dearme-ai-proxy/src/functions.ts) — 6 OpenAI native function definitions ported verbatim.
- [`packages/dearme-ai-proxy/src/voice-gate.ts`](../../packages/dearme-ai-proxy/src/voice-gate.ts) — voice-gate scoring wire (`POST /v1/voice/score`).
- [`packages/db/src/schema/channel_connections.ts`](../../packages/db/src/schema/channel_connections.ts) — per-user OAuth/API credentials and channel bindings, now with the DM-173A/DM-173B config-gated X start + PKCE callback exchange routes around active `x` rows, active `resend` rows for approved email dispatch, and Telegram/iMessage gateway channel ids for OpenClaw-backed message sends (DM-175). Approved `post_x`, `send_email`, `send_telegram_message`, and `send_imessage` delivery stay behind voice-gate/approval and dispatch through the shared outbound wrapper path.
- [`server/src/services/dearme-approved-launch-handoff.ts`](../../server/src/services/dearme-approved-launch-handoff.ts) — approved next-move to outbound-call boundary. Registers the default `ChannelDispatch` map: OpenClaw gateway message sends, X, email, LinkedIn partner DM, deploy-site, and Meta campaign dispatch.
- [`server/src/services/dearme-openclaw-gateway-dispatch.ts`](../../server/src/services/dearme-openclaw-gateway-dispatch.ts) + [`server/src/services/dearme-openclaw-gateway-dispatch-config.ts`](../../server/src/services/dearme-openclaw-gateway-dispatch-config.ts) — OpenClaw gateway bridge used by `send_telegram_message` / `send_imessage` and by the provider smoke harness.
- [`server/src/services/dearme-send-email-dispatch.ts`](../../server/src/services/dearme-send-email-dispatch.ts) — DM-174 Resend `send_email` dispatcher. It plugs into the same outbound wrapper as X, resolves the stored per-user credential through the server secret-provider registry, validates plain-text payload/expiry, calls Resend `POST /emails`, and maps provider auth failures back to reauth without customer-facing provider language.
- [`scripts/dearme-provider-smoke.ts`](../../scripts/dearme-provider-smoke.ts) — internal operator proof harness for live provider readiness and smoke execution, including Telegram/iMessage OpenClaw gateway message targets.
- [`packages/db/src/schema/opportunities.ts`](../../packages/db/src/schema/opportunities.ts) — opportunities lifecycle (DM-141).

## Reference / research (read on demand)

These are not stale, but they are not the load-bearing docs. Use them when researching a specific decision: `POLSIA-NAIVE-MECHANISMS-DEEP-DIVE.md`, `POLSIA-NAIVE-PM-ANALYSIS.md`, `POLSIA-NAIVE-COMPARISON.md`, `POLSIA-NAIVE-REUSE-PLAN.md`, `POLSIA-MARKETING-PACKAGING-GUIDE.md`, `LINDY-ASSISTANT-REUSE-PLAN.md`, `ACTION-GRAPH-ARCHITECTURE.md`, `INTEGRATED-ARCHITECTURE.md`, `AGENCY-AGENTS-REFERENCE.md`, `BUILD-STATE.md`, `BASELINE-SPINE-MANIFEST.md`, `CODE-PROVENANCE-FACT-CHECK.md`, `2026-05-09-WRAP-UP-RETROSPECTIVE.md`.

## Superseded (do not follow as guidance)

Banner-marked at the top of each file: `BACKLOG.md`, `BACKLOG-PART-2.md`, `COMPARISON-FINAL.md`, `POLSIA-VS-DEARME.md`, `POLSIA-VS-DEARME-PART-2.md`, `V3-ARCHITECTURE*.md`, `V4-ARCHITECTURE*.md`, `ARCHITECTURE-PART-2.md`, `ARCHITECTURE-PART-3.md`, `PRODUCT-SPEC*.md`, `PAPERCLIP-EVALUATION.md`, `WEB-UI-REUSE-ARCHITECTURE.md`, `WORKTREE-INTEGRATION-PLAN.md`, `AUTOMATION-RELIABILITY-COST-POLICY.md`.

## Run locally

```bash
pnpm install
pnpm dev                                                              # API + UI
pnpm --filter @paperclipai/dearme-agent-prompts test                  # 25 tests (registry, state machines, work-loop, approvals)
pnpm --filter @paperclipai/dearme-ai-proxy test                       # 10 tests (wire contract, voice-gate)
pnpm --filter @paperclipai/dearme-openclaw test                       # 19 tests (skills, bootstrap, outbound tools)
pnpm --filter @paperclipai/dearme-openclaw run generate-skills        # 12 SKILL.md from registry
pnpm --filter @paperclipai/db typecheck                               # Drizzle (channel_connections, opportunities)
```

## Source material

Private references for product judgment (not provenance):

- `~/Desktop/polsia-recon-2026-05-05/` — Polsia research archive
- `~/naive-research-2026-05-05/` — Paperclip/Naive architecture notes
- `https://github.com/msitarzewski/agency-agents.git` @ `783f6a72` — MIT role-library reference
- local Paperclip fork (this repo)

See [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md) for the rules that govern what shipped DearMe code may and may not derive from.
