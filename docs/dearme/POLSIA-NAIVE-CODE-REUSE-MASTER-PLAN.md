# Polsia x Naive code reuse master plan

Date: 2026-05-09
Owner: DearMe product architect thread
Status: active execution plan
Governing rule: `REBRAND-AND-PROVENANCE.md`

This is the engineering map for aggressive DearMe reuse.

The intent is not to make future agents cautious or slow. It is to make reuse
unambiguous so implementation can move faster:

1. Directly integrate code that is already in this tree, owned by us, or
   available under a license/provenance path we can preserve.
2. Use Paperclip/Naive as the substrate donor: auth, companies, agents, issues,
   routines, approvals, documents, activity logs, adapters, plugins, MCP, and
   execution workspaces.
3. Use Polsia as the product-mechanism donor: first-run shock, autonomous
   chief-of-staff posture, model-routing economics, live proof surfaces,
   outbound loops, spend controls, and always-moving cycles.
4. Reimplement donor prompt text, customer-specific examples, and branded copy
   in DearMe voice. Do not put donor names or substrate language into paid-beta
   UI.

## Reuse Doctrine

| Source class | Reuse mode | How to implement |
|---|---|---|
| DearMe code already in this repo | Direct integration | Extend existing routes, services, validators, tests, and UI in place. |
| Paperclip/Naive OSS substrate already inherited | Direct integration | Configure and wrap existing kernel services instead of rebuilding them. Preserve licenses where source files are imported from OSS. |
| Local internal assistant baseline | Direct integration where its own repo guidance allows | Port into DearMe modules with DearMe names and tests. Follow `REBRAND-AND-PROVENANCE.md` for public framing. |
| Polsia product mechanics | Mechanism port | Implement equivalent DearMe workflows, state machines, routing tables, and proof surfaces. Rewrite prompts and examples for personal-brand use. |
| Public catalogs/templates/examples | Pattern import | Convert to DearMe seed configs, fixtures, or tests only after checking provenance and product fit. |

The practical rule: **reuse the code and mechanism, not the donor identity**.

## Bucket A - Already Inherited Via Paperclip

These are physically in the DearMe tree and should be used before creating new
abstractions.

| Capability | Current path | DearMe use |
|---|---|---|
| Company-scoped data model | `packages/db/src/schema/*.ts` | Store Brand OS, voice, outputs, opportunities, budgets, approvals. |
| Express API routes | `server/src/routes/*.ts` | Add DearMe product endpoints behind the existing API shape. |
| Services layer | `server/src/services/*.ts` | Keep orchestration in services, not UI-only state. |
| Agent adapters | `packages/adapters/*` | Run CEO/direct agents and worker agents through existing adapters. |
| Plugin SDK/runtime | `packages/plugins/sdk/*`, `server/src/services/plugin-*.ts` | Package DearMe workers as plugins instead of hardcoding every role. |
| MCP server | `packages/mcp-server/*` | Keep tools backstage; expose product actions in DearMe language. |
| Routines | `packages/db/src/schema/routines.ts`, `server/src/services/cron.ts` | Implement always-moving Brand OS cycles. |
| Heartbeat state | `packages/db/src/schema/heartbeat_runs.ts`, `server/src/services/heartbeat.ts` | Track long-running autonomous work with durable status. |
| Execution workspaces | `server/src/services/execution-workspaces.ts` | Build sites/assets in isolated issue-sized workspaces. |
| Approvals | `packages/db/src/schema/approvals.ts`, `issue_approvals.ts` | Gate send/deploy/spend/sensitive actions without exposing machinery. |
| Cost and finance events | finance/cost schema and services | Attribute model/tool spend and enforce budget limits. |
| Activity logs/documents | schema + services | Show visible proof, weekly reports, and handoff packages. |

Zero-rewrite equivalents:

| Donor mechanism | Existing DearMe/Paperclip primitive |
|---|---|
| Two-tier agents: local CEO plus remote workers | `claude-local`, `openclaw-gateway`, and adapter registry. |
| Durable per-run tracking | `heartbeat_runs` plus heartbeat service. |
| Per-execution workspace | `execution-workspaces.ts`. |
| Always-moving cycles | `routines.ts` plus `cron.ts`. |
| Approval score and review trail | `issue_approvals.ts`, `approval_comments.ts`. |

## Bucket B - Polsia Mechanism Ports

Polsia's value for DearMe is product behavior. These are implementation targets,
not a prompt warehouse.

| Mechanism | DearMe target | Integration action | Ticket |
|---|---|---|---|
| First-run shock sequence | `server/src/routes/dearme.ts`, `server/src/services/dearme-workbench.ts`, new identity/brand services | Make the first session produce personal proof before the user finishes setup. | DM-138 |
| Autonomous CEO/reporting posture | `packages/plugins/dearme-reporting/`, report/handoff services | Maintain a non-empty queue, summarize work plainly, and choose tomorrow's next step. | DM-139 |
| Voice-gated short-form content | `packages/plugins/dearme-content-producer/`, voice services | Draft posts only when they match the user's voice profile and attribution rules. | DM-140 |
| Opportunity hunter | `packages/db/src/schema/opportunities.ts`, `packages/plugins/dearme-opportunity-hunter/` | Add an opportunity state machine for podcasts, clients, sponsors, jobs, and partnerships. | DM-141 |
| Six-hour work cycle | existing routines/cron services | Add a DearMe routine type that plans, executes, reviews, and reports. | DM-142 |
| Model routing economics | `packages/dearme-ai-proxy/`, agent metadata | Route by task complexity and record spend without model/provider setup UI. | DM-143 |
| Minimal MCP/tool set | `packages/mcp-server/*`, DearMe tool registry | Keep only the tools that matter for paid-beta proof. | DM-144 |
| OpenAI/Anthropic-compatible AI proxy | `packages/dearme-ai-proxy/` | Add provider-compatible endpoints, DearMe API keys, and cost attribution. | DM-145 |
| Workspace-mounted skills | `execution-workspaces.ts`, DearMe plugin packages | Mount DearMe build skills into isolated workspaces. | DM-146 |
| Brand-site builder constraints | `packages/plugins/dearme-brand-site-builder/` | Build one deployable personal-brand site with strict resource and stack limits. | DM-147 |
| Meta ads/autothrottle | `packages/plugins/dearme-meta-ads/` | Add budget tiers, emergency pause, creative pipeline, and error states. | DM-148 |
| Emergency pause intent | `server/src/services/dearme-workbench.ts` | Detect stop/pause language and pause active routines/spend immediately. | DM-149 |
| Best-agent routing | `server/src/services/dearme-agent-routing.ts` | Route by aggregate task outcomes and approval scores. | DM-150 |
| Live proof feed | `server/src/routes/live.ts`, DearMe live page | Show public/private proof sections without exposing substrate terms. | DM-151 |
| Post-build brand review | `packages/plugins/dearme-reporting/` | Run async review after site/content generation and create remediation issues. | DM-152 |
| Default score on silence | approvals service | Auto-close low-risk approval feedback with default score. | DM-153 |
| CEO/direct plus workers/remote | adapter templates/config | Configure DearMe role templates and heartbeat cadence. | DM-154 |
| Prompt/tool cache economics | AI proxy cost/cache layer | Add cache markers and measure cache-read tokens through cost events. | DM-155 |
| Five-touch outbound sequence | opportunity hunter templates | Generate multi-touch opportunity sequences for personal-brand goals. | DM-156 |
| Company PATCH mass-assignment fix | `server/src/routes/companies.ts` | Strict allow-list board edits and move finance/admin fields behind governed endpoints. | DM-S01 |

## Bucket C - Naive/Paperclip Extras

Use Naive and Paperclip to avoid rebuilding substrate:

| Asset | Reuse mode | Target |
|---|---|---|
| Existing Paperclip routes/services/schema | Direct integration | Keep DearMe as a thin product layer over the kernel. |
| Existing adapter and gateway code | Direct integration | Configure local/direct and worker/remote roles. |
| Existing plugin examples | Direct integration/reference | Start each DearMe role plugin from the SDK shape already present. |
| Public role/template catalog patterns | Pattern import | Convert the strongest role shapes into DearMe-specific seed templates. |
| Example deliverable structure | Pattern import | Use as acceptance-test expectations for DearMe reports, not as shipped text. |

## Plugin Strategy

DearMe-specific workers should be plugins unless there is a clear reason to keep
them in core services.

Recommended package layout:

```text
packages/plugins/
  dearme-identity-researcher/
  dearme-audience-graph/
  dearme-voice-profile/
  dearme-brand-site-builder/
  dearme-content-producer/
  dearme-opportunity-hunter/
  dearme-reporting/
  dearme-meta-ads/
  dearme-personal-brand-bundle/
```

Plugin reuse map:

| Plugin | Reuses | Adds |
|---|---|---|
| identity-researcher | tool dispatch, memory, documents | profile enrichment, first proof package, confidence evidence |
| audience-graph | plugin DB, routines | follower/target graph, overlap ranking, DM target lists |
| voice-profile | plugin DB, LLM tools | voice extraction, Voice Gate, draft scoring |
| brand-site-builder | adapters, workspaces, tools | DearMe build constraints and personal-brand site outputs |
| content-producer | routines, OAuth tools | voice-gated post drafts and scheduled publishing proposals |
| opportunity-hunter | plugin DB, email tools | opportunity states and outreach sequences |
| reporting | routines, documents, inbox | short executive updates and weekly Dear me reports |
| meta-ads | external APIs, cost ledger | budget tiers, pause control, creative generation |

## Sprint Order

### Sprint 0 - Make the foundation executable

1. DM-S01: fix company mass assignment before paid beta. (✅ done)
2. DM-142: configure DearMe cycle routine. (✅ seed + runtime provisioning done)
3. DM-146: verify execution-workspace skill mounting. (✅ runtime adapter skill projection done)
4. DM-154: configure CEO/direct and worker/remote role templates. (✅ Brand OS apply template config done)
5. Keep `REBRAND-AND-PROVENANCE.md` aligned with reuse docs.

#### Sprint 0 seed corpus (landed 2026-05-09)

The new package `@paperclipai/dearme-agent-prompts`
(`packages/plugins/dearme-agent-prompts/`) holds the typed seed material
that Sprint 1 / 2 / 3 / 4 plugins import rather than re-deriving. Concrete
files are listed in `REUSE-IMPLEMENTATION-LEDGER.md` under "Physical Port
Manifest". Schema slice for DM-141 (`packages/db/src/schema/opportunities.ts`)
is also in place; the migration is generated when DM-141 implementation
work begins. None of this contains donor brand names, customer-specific
examples, or substrate language; all rules are restated for the
personal-brand growth-team domain.

DM-142 now has an executable seed contract in
`packages/plugins/dearme-agent-prompts/src/state-machines/dearme-cycle.ts`:
the six-hour growth-cycle managed routine declaration, customer-safe cycle
issue renderer, and tests are in place. Runtime provisioning is also wired in
`server/src/services/dearme-brand-blueprint-apply.ts`: approved Brand OS
blueprints create the high-priority six-hour routine, chief-of-staff assignee,
`0 */6 * * *` trigger, and customer-safe routine description through the
existing routines service. DM-146 also projects DearMe skills into runtime
execution configs, and DM-154 now provisions the Naive-style two-tier team
template: chief-of-staff as the direct/local lead on a 2-hour heartbeat cadence,
with all teammate roles configured as worker/remote lanes on 8-hour cadence.
The remaining Sprint 0 upkeep is keeping provenance/rebrand docs aligned before
moving into Sprint 1's first-run proof sequence.

### Sprint 1 - Aha moment

1. DM-138: first-run personal proof sequence.
2. DM-139: autonomous reporting agent.
3. DM-140: Voice Gate and content producer.

### Sprint 2 - Work keeps moving

1. DM-141: opportunity hunter.
2. DM-149: emergency pause intent.
3. DM-153: default approval score on silence.

### Sprint 3 - Moat and economics

1. DM-143: model routing.
2. DM-145: AI proxy.
3. DM-155: cache economics.

### Sprint 4 - Growth loops

1. DM-148: meta ads/autothrottle.
2. DM-150: best-agent routing.
3. DM-151: live proof feed.
4. DM-152: post-build brand review.
5. DM-156: five-touch outbound sequence.

## Acceptance Standard For Every Ticket

Each ticket must end with:

1. One coherent slice in the relevant service/plugin/UI path.
2. A test or smoke proof tied to the behavior.
3. No donor names, adapter IDs, provider setup, or Paperclip language in
   customer-facing DearMe surfaces.
4. A Lore commit that records constraints, rejected alternatives, verification,
   and known gaps.

## Current Next Slice

DM-S01 is the next non-negotiable engineering slice after this doc cleanup:
lock down `PATCH /api/companies/:id` with a strict allow-list and move
finance/admin fields to governed board-only paths.
