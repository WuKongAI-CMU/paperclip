# DearMe

> Autonomous personal-brand workforce. Polsia architecture forked for solo experts.

**Status:** Day 1 scaffold. ~9 migrations. Express monolith. Stub routes.

## What this is

A 1:1 fork of Polsia (`polsia.com`, $7.92M ARR, 89,572 companies as of 2026-05) — same
architecture, different positioning:

- **Polsia:** "I help you build a company" → autonomous SaaS workforce.
- **DearMe:** "I help you grow your personal brand" → autonomous content + outreach +
  portfolio site for solo experts (consultants / coaches / course creators / freelancers).

The recon archive that drove this design is at `~/Desktop/polsia-recon-2026-05-05/`
(15 spec docs + real source code from 5 customer instances + 22 authenticated API responses).

## Architecture (verbatim from Polsia)

- Single Express + Postgres service (Render). No microservices.
- pg-session for auth (no Redis dependency).
- pgvector ivfflat for memory + voice embeddings.
- Dual-protocol AI proxy:
  - `/ai/openai/v1` — OpenAI-compatible (gemini-2.0-flash-lite for 99% of calls)
  - `/api/proxy/ai` — Anthropic-compatible (sonnet/opus for complexity 4-10)
- node-cron for scheduling (no BullMQ).
- Async agent execution: `setImmediate()` + return 202 + client polls.
- 11 platform agents (10 Polsia + new Brand Site Builder; we drop Meta Ads V1).
- 9 active MCP servers (verified from production debug; spec lists 22 but only 9 see real use).

## Repo layout

```
server.js           Express monolith entry
migrate.js          Idempotent migration runner
migrations/         001-009: users/brands/agents/voice/tasks/cycles/memory/opp/subs
lib/
  db.js             Postgres pool
  ai.js             Dual-protocol AI client + cost ledger
  auth.js           bcrypt + session middleware
routes/             20 route modules (auth.js real, others stubbed)
services/           cycle-scheduler.js + memory-curator.js (cron handlers)
mcp-servers/        9 MCP server implementations (TODO Day 2-5)
agents/             agent runtime + 11 prompt templates (TODO Day 3)
prompts/            Master system prompt + per-agent prompts
skills/             8 starter SKILL.md (copy from Polsia recon)
public/             SPA (React 19 + Vite, TODO Day 6+)
test/
```

## Differentiation from Polsia (5% delta)

| | Polsia | DearMe |
|---|---|---|
| Customer | "founder with idea" | "expert with audience but stuck on distribution" |
| Output | company SaaS app | personal portfolio site (6 pages) |
| Voice | shared dark-humor template | **client's own voice** (cloned from 100 real posts) |
| CRM | leads → meeting → customer | opportunities (speaking/podcast/consulting/collab) |
| Twitter | shared @polsia | client's own OAuth + shared @brandinpublic flywheel |
| Stripe Connect | 20% take rate (V1) | **0%** (V2 sliding scale only on paid newsletter/consulting) |

## Run locally

```bash
cp .env.example .env
# edit .env — set DATABASE_URL (Neon), OPENAI_API_KEY, etc.
npm install
npm run migrate
npm run dev
# → http://localhost:3000/health
```

## Day 1 checklist

- [x] Repo init + git
- [x] package.json + .env.example + .gitignore
- [x] Migrations 001-009 (users/brands/agents/voice/tasks/cycles/memory/opp/subs)
- [x] migrate.js (idempotent runner)
- [x] server.js skeleton with all 20 route mounts
- [x] lib/db.js + lib/ai.js (dual protocol) + lib/auth.js
- [x] routes/auth.js (real signup/login/logout/me)
- [x] 20 route stubs return 501
- [x] services/cycle-scheduler.js + services/memory-curator.js stubs
- [x] render.yaml
- [x] README

## Day 2 priorities

- routes/brands.js — CRUD
- routes/onboarding.js — 8-step flow + Twitter/LinkedIn voice ingest
- routes/conversations.js + SSE stream — real-time chat with Manager (ex-CEO) agent
- mcp-servers/{tasks,reports,memory,dashboard,send_reply}.js — 5 core MCP
- agents/runtime.js — Claude Agent SDK wrapper that spawns workspace per execution
- prompts/manager.md, brand-site-builder.md, twitter.md, cold-outreach.md, research.md

## Day 3-7

- Brand Site Builder runBuildCycle() — port foundros pattern (340 LOC reference)
- Voice profile ingest + match scoring (the moat differentiator)
- Stripe + Postmark + Twitter integration
- /live public dashboard SSE
- Frontend SPA (Vite + React 19 + Tailwind)
- Onboarding video + landing page

## Recon source

All design decisions trace back to:
- `~/Desktop/polsia-recon-2026-05-05/final-summary/` — 15 spec docs
- `~/Desktop/polsia-recon-2026-05-05/expanded/` — 65MB extracted artifacts
- `polsia-archive/instances/` — real source from 5 customer instances
- `polsia-archive/agent-prompts/12-agents-individual/` — verbatim system prompts
