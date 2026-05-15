# clawdbob → DearMe Absorption Plan

Date: 2026-05-14
Owner: PM+architect thread
Status: **active** — bounded absorption tickets land in dearme/ as `dm-cb-*`.

## Why this exists

The 2026-05-14 product directive lists seven sources to integrate into DearMe:
**polsia, naive, clawdbob, openclaw, claude-code-source, lindy, littlebird**.

Six of seven are already audited and integrated (see INDEX.md §6). The two
deltas:

| Source | Status | Resolution |
|---|---|---|
| **clawdbob** | sibling product, **not yet absorbed** | this doc — bounded code lift into dearme/ |
| **littlebird** | closed-source competitor | UI/UX reference only — no code to absorb |

clawdbob is Peter's Polsia clone for non-technical SMBs ($29/mo, GMV-through-
Stripe-Connect moat). DearMe is the personal-brand-team variant for solo
operators. Both run on top of OpenClaw + Polsia choreography. They share
≥70% of substrate by intent. clawdbob has shipped pieces DearMe still lacks.
This plan picks the bounded, license-clean pieces and lifts them.

## What clawdbob has that DearMe doesn't

Surveyed `/Users/peter/clawdbob/src/` 2026-05-14 (203 source files):

| Module | LOC | Status in DearMe | Absorb? |
|---|---|---|---|
| `lockdown/` — `.claude/settings.json` + SKILL.md generator with bash deny-list, AI proxy moat enforcement | 208 | **missing** | **yes, first slice** |
| `mcp/_framework/` — MCPConnectionManager, transports (Stdio / InProcess / SdkControl), auth, OAuth port helpers, channel allowlist | ~22 files | **missing** (DearMe ships 0 MCP servers) | yes, second slice |
| `mcp/_template/` + `mcp/runtime-files/` — verbatim claude-code MCP server template + Bash/Read/Edit/Write/Glob/Grep tools | ~30 files | **missing** | yes, with runtime-files |
| `mcp/{dashboard,documents,capabilities,send_reply,learnings,polsia_support,web_search,cycle_planning,memory,reports,tasks}/` — 11 in-process MCP servers | mid | **missing** | tier 3 — per-server triage |
| `billing/` — Stripe Connect (20% GMV take rate), KYC webhook handling | mid | DearMe has paid-beta access via recorded receipts only; no Connect | tier 3 — wait until $29 self-serve is on the roadmap |
| `provisioning/` — auto GitHub repo + Render service + Vercel site provisioning per customer | mid | DearMe has `deploy_site` dispatcher (preview + configured production) | tier 4 — diverges by product (personal site vs. business site) |
| `runtime/` — Polsia agent execution lifecycle (claim → run → finalize) | high | DearMe runs on Paperclip routines/issues/work-products instead | **no** — substrate divergence is intentional |
| `sapiom/` — Sapiom upstream (MCP gateway, models, sandbox, browser, search) | high | DearMe routes through dearme-ai-proxy + OpenClaw gateway | **no** — substrate divergence is intentional |
| `sdk/` — Polsia agent SDK runner | high | DearMe uses OpenClaw plugin + Paperclip agents | **no** |
| `memory/` — agent memory store | mid | DearMe has Voice & Memory + dearme-voice-profile-store | **no** — already covered |
| `ops/`, `realtime/`, `routes/`, `storage/`, `util/` | mid | DearMe has Paperclip equivalents | **no** |

## Doctrine for the lift

These rules keep absorption from re-introducing the legacy paperclip-substrate-vs-clawdbob-substrate fork:

1. **clawdbob source files are read-only donors.** No edits to lifted files.
   Wrap behavior in sibling files when DearMe needs to diverge. (Same rule
   clawdbob applies to its `vendor/claude-code/` lift — see
   `clawdbob/src/mcp/README.md`.)
2. **License chain stays explicit.** clawdbob `lockdown/` and `mcp/_framework/`
   are derived from claude-code (Unlicense / public domain via
   `vendor/claude-code/VENDORED.md`). DearMe re-lifts MUST preserve the 2-line
   license header.
3. **Lift into `packages/plugins/dearme-*` or `server/src/services/dearme-*`**,
   not a parallel monolith. clawdbob is a Node/Express monolith (`server.js`,
   `src/` flat). DearMe is a pnpm monorepo with Drizzle + TypeScript. Lifts
   must be re-typed into the DearMe substrate.
4. **One bounded slice per PR.** Each slice answers: which DearMe role/gate is
   served? Which DearMe ticket? Which test proves it works?
5. **No `vendor/claude-code/` in DearMe.** DearMe already absorbed the relevant
   claude-code patterns through Lindy + OpenClaw. Re-lifting the full vendor
   tree would balloon the repo. Cherry-pick at the function level.

## Status (2026-05-14)

| Slice | Status | Tests |
|---|---|---|
| **dm-cb-01** lockdown into `dearme-openclaw` | **shipped** | 16/16 |
| **dm-cb-02** voice MCP server in `@paperclipai/dearme-mcp` | **shipped** | included in 20/20 |
| **dm-cb-03** runtime-files MCP server in `@paperclipai/dearme-mcp` | **shipped** | included in 20/20 |
| dm-cb-04+ | queued — see §"dm-cb-04 onward" | — |

## Slice plan (`dm-cb-*` ticket prefix)

### dm-cb-01 — `lockdown` into `@paperclipai/dearme-openclaw`  *(shipped 2026-05-14)*

**Why first:** DearMe's OpenClaw plugin runs on the user's device. Without a
lockdown layer, a sophisticated user could bypass `dearme-ai-proxy` by
`curl`ing OpenAI/Anthropic directly. The proxy is what attributes cost and
enforces the voice gate; bypass = unbillable usage + voice-drift risk.
clawdbob solved this exact problem.

**What lands:**

- `packages/plugins/dearme-openclaw/src/lockdown/` — TypeScript port of
  `clawdbob/src/lockdown/{index,settings-template,skill-template,verify,write}.js`,
  with DearMe-specific changes:
  - default deny-list adds `*curl*api.dearme.app*` removed (proxy must be
    callable), but `*curl*api.openai.com*`, `*curl*api.anthropic.com*`,
    `*curl*api.bedrock.*amazonaws.com*` kept
  - moat clause in `SKILL.md`: *"NEVER call LLM providers directly. ONLY use
    DearMe API endpoints at `https://api.dearme.app`."*
  - `_dearme.lockdown_version` namespace instead of `_polsia`
- `packages/plugins/dearme-openclaw/src/lockdown/__tests__/lockdown.test.ts`
  — port of `clawdbob/src/lockdown/__test__.js`
- Wired into the existing OpenClaw plugin bootstrap: regenerate
  `~/.openclaw/skills/dearme-*` SKILL.md tree with the moat clause; emit a
  `.claude/settings.json` alongside.

**Doesn't land yet:** the runtime enforcement that refuses to launch the agent
when `verify` returns `ok=false`. That belongs in OpenClaw core, not DearMe.

### dm-cb-02 — voice MCP server in `@paperclipai/dearme-mcp`  *(shipped 2026-05-14)*

**Why:** clawdbob lifted the claude-code MCP framework once. DearMe shipping
12 roles without any MCP servers means the per-role tool surface lives only
as TypeScript functions. To let DearMe roles expose tools that *external*
agents (and Peter's own Claude Code) can call, we need an MCP layer.

**What lands:**

- new package `@paperclipai/dearme-mcp-framework`
- `src/_framework/` — verbatim copy of `clawdbob/src/mcp/_framework/*`
  (preserving 2-line license headers); ~22 files
- one minimum-viable MCP server — `dearme-voice-mcp` — that exposes
  `/v1/voice/score` and the voice-profile-store as MCP tools. This lets
  external agents (Peter's OpenClaw, IDEs) consult DearMe's voice gate
  without round-tripping through the cloud HTTPS API.
- catalog stub `packages/plugins/dearme-mcp-framework/src/catalog.ts` listing
  the 1 server initially, with structure ready for the next 5-10.

**Doesn't land yet:** the 11 other clawdbob in-process MCP servers
(dashboard, documents, capabilities, send_reply, learnings, polsia_support,
web_search, cycle_planning, memory, reports, tasks). Each needs DearMe-side
triage — most of them assume Polsia-shape data not DearMe-shape data.

### dm-cb-03 — runtime-files MCP server in `@paperclipai/dearme-mcp`  *(shipped 2026-05-14)*

**Why:** if DearMe runs autonomous work on the user's device through
OpenClaw, it needs the same Bash/Read/Edit/Write/Glob/Grep tools clawdbob
gave Polsia agents. Today the work loop runs entirely server-side, which
means roles like Brand Site Builder cannot touch local files at all.

**What lands:**

- `packages/plugins/dearme-mcp-framework/src/runtime-files/` — verbatim copy
  of `clawdbob/src/mcp/runtime-files/*` with license headers preserved
- catalog entry `runtime_files`
- wired into the Brand Site Builder role's outbound tools list (already
  exists in `dearme-openclaw` plugin)

### dm-cb-04 onward — case-by-case

Per-MCP-server triage. Likely candidates after dm-cb-03:

- `mcp/documents` — DearMe has work_products; an MCP read surface is useful
- `mcp/learnings` — maps to Voice & Memory; potentially redundant
- `mcp/web_search` — DearMe research role currently has no first-class
  search tool

Tier 3 candidates (billing/Connect) wait for the $29 self-serve checkout
decision. Tier 4 (provisioning) waits for the personal-site-as-a-product
upgrade beyond `deploy_site`.

## What this absorption does NOT introduce

These are explicit non-goals to keep the lift small:

- **No second runtime.** clawdbob's `src/runtime/` and `src/sdk/` stay in
  clawdbob. DearMe keeps Paperclip routines/issues/work-products as the
  execution truth (see `INTEGRATED-ARCHITECTURE.md` §"Reuse-First").
- **No second voice/memory store.** clawdbob's `src/memory/` overlaps with
  `dearme-voice-profile-store` + Voice & Memory. We keep DearMe's.
- **No `vendor/claude-code/` mirror in DearMe.** Cherry-pick at function
  level, not directory level.
- **No clawdbob brand/copy in DearMe customer surfaces.** Lifted code is
  mechanism; the moat clause, deny-list, and MCP catalog entries get
  DearMe-original copy.
- **No shared monorepo with clawdbob yet.** That is a separate, larger
  architectural decision (extract `@wukongai/agent-substrate` shared package
  consumed by both products). Not in scope for this round; revisit after
  dm-cb-03 ships and the duplication cost is measurable.

## Verification

After dm-cb-01 ships:

```bash
pnpm --filter @paperclipai/dearme-openclaw test
# expect: existing 19 tests + lockdown tests still green

pnpm --filter @paperclipai/dearme-openclaw run generate-skills
# expect: 12 SKILL.md regenerated, each carrying the moat clause and
# referencing https://api.dearme.app
```

After dm-cb-02 ships:

```bash
pnpm --filter @paperclipai/dearme-mcp-framework test
pnpm --filter @paperclipai/dearme-mcp-framework run start-voice-mcp
# expect: stdio MCP server responds to tools/list with voice.score and
# voice.profile.get
```

## Where this fits in INDEX.md

INDEX.md §1-§4 do not change. §5 "Shipped" gains:

- `dm-cb-01` — OpenClaw lockdown moat ported from clawdbob

§6 "Where to read more" gains a one-line pointer to this file under
"governance / absorption".
