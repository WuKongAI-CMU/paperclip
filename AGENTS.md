# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

This checkout is currently being used to build **DearMe**: a personal brand
growth team product implemented as a thin product layer over the inherited
Paperclip operator control plane.

Paperclip remains the kernel: auth, companies, agents, issues, routines,
approvals, documents, activity logs, finance events, adapters, plugins, and
execution workspaces. DearMe owns the customer-facing product semantics: Brand
OS, voice profile, Voice Gate, personal-brand outputs, Work Ready, batch
decisions, paid-beta access, and weekly Dear me reports.

For Paperclip-kernel work, the V1 implementation target is still defined in
`doc/SPEC-implementation.md`. For DearMe product work, the current operating
contract is `docs/AGENT_RUN_COMPANY_OPERATING_CONTRACT.md`, and the current
default instruction mode is agent-run company. The current execution source of
truth is `docs/dearme/README.md`. No Symphony runtime is active in this
checkout; use ordinary repo evidence and explicit owner direction instead of
background coordination loops.

## 2. Read This First

For DearMe product or rebrand work, read in this order:

1. `docs/AGENT_RUN_COMPANY_OPERATING_CONTRACT.md`
2. `docs/NEEDS_HUMAN_HELP.md`
3. `docs/dearme/README.md`
4. `docs/dearme/INDEX.md`
5. `docs/dearme/TRI-SUBSTRATE-ARCHITECTURE.md`
6. `docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md`
7. `docs/dearme/PRODUCT-ARCHITECTURE.md`
8. `docs/dearme/POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`
9. `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
10. `docs/dearme/REBRAND-AND-PROVENANCE.md`
11. `docs/dearme/BUILD-STATE.md`

`docs/dearme/BUILD-STATE.md` and
`docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` are append-only coordination logs:
read the newest section plus issue-relevant matches, not the whole file by
default. Older architecture/reuse docs such as
`docs/dearme/INTEGRATED-ARCHITECTURE.md`,
`docs/dearme/WORKTREE-INTEGRATION-PLAN.md`, and
`docs/dearme/POLSIA-NAIVE-REUSE-PLAN.md` are historical references only. If
they conflict with `docs/dearme/INDEX.md`,
`docs/dearme/TRI-SUBSTRATE-ARCHITECTURE.md`, or the code, the current canonical
surface wins.

For Paperclip-kernel work, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `packages/adapters/`: agent adapter implementations (Claude, Codex, Cursor, etc.)
- `packages/adapter-utils/`: shared adapter utilities
- `packages/plugins/`: plugin system packages
- `doc/`: operational and product docs
- `docs/dearme/`: DearMe product, positioning, reuse, provenance, integration,
  and build-state docs

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Launch gates for irreversible external actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Preserve DearMe product invariants on customer-facing paths.
- Follow `docs/AGENT_RUN_COMPANY_OPERATING_CONTRACT.md` as the default
  operating contract
- Treat agents as the company's product-development and product-operations
  owners
- Treat Peter as Human Support, not as the day-to-day product manager
- Team visible, machinery hidden
- Internal team work is autonomous by default
- Public/send/deploy/spend/sensitive actions require one final launch decision
- Do not turn drafts, private proof, reports, profile work, or internal team
  progress into approval, privacy, or review ceremonies
- Customer-facing copy should lead with work, proof, launch calls, and autonomous
  momentum; avoid making `approval`, `privacy`, `care`, or `safety` the product
  promise unless the surface is the actual final external-action decision.
- Do not expose adapter IDs, provider names, model-provider setup, Paperclip,
  OK Partner, setup-payload, or raw control-plane language to paid-beta users

5. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

6. Keep repo plan docs dated and centralized.
When you are creating a plan file in the repository itself, new plan documents belong in `doc/plans/` and should use `YYYY-MM-DD-slug.md` filenames. This does not replace Paperclip issue planning: if a Paperclip issue asks for a plan, update the issue `plan` document per the `paperclip` skill instead of creating a repo markdown file.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Default local/agent test path:

```sh
pnpm test
```

This is the cheap default and only runs the Vitest suite. Browser suites stay opt-in:

```sh
pnpm test:e2e
pnpm test:release-smoke
```

Run the browser suites only when your change touches them or when you are explicitly verifying CI/release flows.

For normal issue work, run the smallest relevant verification first. Do not default to repo-wide typecheck/build/test on every heartbeat when a narrower check is enough to prove the change.

Run this full check before claiming repo work done in a PR-ready hand-off, or when the change scope is broad enough that targeted checks are not sufficient:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Pull Request Requirements

When creating a pull request (via `gh pr create` or any other method), you **must** read and fill in every section of [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Do not craft ad-hoc PR bodies — use the template as the structure for your PR description. Required sections:

- **Thinking Path** — trace reasoning from project context to this change (see `CONTRIBUTING.md` for examples)
- **What Changed** — bullet list of concrete changes
- **Verification** — how a reviewer can confirm it works
- **Risks** — what could go wrong
- **Model Used** — the AI model that produced or assisted with the change (provider, exact model ID, context window, capabilities). Write "None — human-authored" if no AI was used.
- **Checklist** — all items checked

## 11. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
5. PR description follows the [PR template](.github/PULL_REQUEST_TEMPLATE.md) with all sections filled in (including Model Used)

## 11. Fork-Specific: HenkDz/paperclip

This is a fork of `paperclipai/paperclip` with QoL patches and an **external-only** Hermes adapter story on branch `feat/externalize-hermes-adapter` ([tree](https://github.com/HenkDz/paperclip/tree/feat/externalize-hermes-adapter)).

### Branch Strategy

- `feat/externalize-hermes-adapter` → core has **no** `hermes-paperclip-adapter` dependency and **no** built-in `hermes_local` registration. Install Hermes via the Adapter Plugin manager (`@henkey/hermes-paperclip-adapter` or a `file:` path).
- Older fork branches may still document built-in Hermes; treat this file as authoritative for the externalize branch.

### Hermes (plugin only)

- Register through **Board → Adapter manager** (same as Droid). Type remains `hermes_local` once the package is loaded.
- UI uses generic **config-schema** + **ui-parser.js** from the package — no Hermes imports in `server/` or `ui/` source.
- Optional: `file:` entry in `~/.paperclip/adapter-plugins.json` for local dev of the adapter repo.

### Local Dev

- Fork runs on port 3101+ (auto-detects if 3100 is taken by upstream instance)
- `npx vite build` hangs on NTFS — use `node node_modules/vite/bin/vite.js build` instead
- Server startup from NTFS takes 30-60s — don't assume failure immediately
- Kill ALL paperclip processes before starting: `pkill -f "paperclip"; pkill -f "tsx.*index.ts"`
- Vite cache survives `rm -rf dist` — delete both: `rm -rf ui/dist ui/node_modules/.vite`

### Fork QoL Patches (not in upstream)

These are local modifications in the fork's UI. If re-copying source, these must be re-applied:

1. **stderr_group** — amber accordion for MCP init noise in `RunTranscriptView.tsx`
2. **tool_group** — accordion for consecutive non-terminal tools (write, read, search, browser)
3. **Dashboard excerpt** — `LatestRunCard` strips markdown, shows first 3 lines/280 chars

### Plugin System

PR #2218 (`feat/external-adapter-phase1`) adds external adapter support. See root `AGENTS.md` for full details.

- Adapters can be loaded as external plugins via `~/.paperclip/adapter-plugins.json`
- The plugin-loader should have ZERO hardcoded adapter imports — pure dynamic loading
- `createServerAdapter()` must include ALL optional fields (especially `detectModel`)
- Built-in UI adapters can shadow external plugin parsers — remove built-in when fully externalizing
- Reference external adapters: Hermes (`@henkey/hermes-paperclip-adapter` or `file:`) and Droid (npm)
