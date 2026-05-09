# Assistant baseline reuse plan (DearMe)

Historical filename: `LINDY-ASSISTANT-REUSE-PLAN.md`.

Date: 2026-05-07
Scope: Use the local internal assistant baseline archive for DearMe architecture and P0 implementation.

**Governance:** All implementation must follow [`REBRAND-AND-PROVENANCE.md`](REBRAND-AND-PROVENANCE.md). The local baseline archive under `/Users/peter/lindy-extraction` is **internal baseline code** for **direct reuse** (see its `README.md`). Do **not** narrate it as competitor extraction — DearMe **shipping** codepaths stay independently authored with rebranding, logo/asset replacement, and licensing hygiene.

**对内口径：** 不说「提取 / 抓取」；说 **内部可直接复用的代码基线**；上架前 **改名 + 换 logo/带识别度图片**。

## Decision

Use the **internal assistant baseline** (`/Users/peter/lindy-extraction`) as the workflow-discipline donor for DearMe.

DearMe should not become a generic no-code workflow builder. DearMe should stay a personal brand growth team. The **internal baseline archive** supplies strong primitives for keeping assistant work reliable, bounded, visible, and monetizable.

Updated product formula:

```text
DearMe =
  Polsia product theater
  + Naive/Paperclip runtime substrate
  + constrained workflow / action model (internal baseline patterns)
  + OK Partner approvals, memory, deliverables, and channel actions
  + DearMe personal-brand layer
```

## Implementation Status - 2026-05-09

DearMe is already adapting the internal assistant baseline in small,
product-safe slices instead of importing the whole app shell.

Already adapted:

- DM-106 made review-loop state visible without a new runtime.
- DM-107 carried review feedback into the next prepared draft, matching the
  assistant-loop idea that user decisions should teach the next action.
- DM-108 turned the live feed into a cycle-aware work stream, matching the
  transcript/action-stream lesson.
- DM-109 made feed cards actionable by routing directly to the focused DearMe
  review surface.
- DM-111 through DM-115 moved Live Team Feed, Decisions Needed, Work Ready,
  Private Work, and Voice & Memory source cards onto the shared
  `DearMeActionCard` primitive.
- DM-116 added product-safe decision-needed, paused, retry, and blocked
  attention variants to that primitive and wired existing review-loop/status
  data into the main work cards.
- DM-117 added the normalized retry/continue/direction entrypoint on the
  DearMe-owned action-card path, reusing the existing focused review surface
  and a thin DearMe `/continue` wrapper over the existing output handoff path
  instead of importing workflow-builder controls.
- DM-120 adapted the knowledge-source setup lesson into a typed Voice & Memory
  source coverage plan that shows missing, partial, and ready source categories
  from existing DearMe memory activity rows.

Still missing:

- richer source import and management actions that keep knowledge UI useful
  without turning DearMe into a generic workflow builder.

Next direct reuse target:

```text
Add richer Voice & Memory source edit/archive/import actions on the DearMe-owned ActionCard path.

Use the internal baseline knowledge source, ActionCard, and action-needed
patterns as source material. Do not port the whole Relay/GraphQL transcript
app, no-code editor, marketplace, donor copy, or donor visual brand.
```

## Local Archive

Primary archive:

- `/Users/peter/lindy-extraction`

Useful source groups:

- `01_frontend_source/` - frontend TS/React baseline (**rename & replace visuals before ship**).
- `02_mongodb_schemas/` - Zod schemas for agents, graphs, blocks, memory, triggers, and execution records.
- `03_backend_route_schemas/` - REST contract schemas.
- `04_graphql/` - Relay operations and generated TypeScript types.
- `05_production_prompts/` - prompt reference material (**rewrite** for DearMe).
- `06_omni_dash_internal_tool/` - small working assistant tool with routing, execution, memory, and feedback code.
- `07_architecture/` - subsystem source dumps for editor, transcript, knowledge base, billing, and related UI.
- `13_intelligence_summary/` - architecture synthesis notes.

This tree does **not** include closed hosted backends (resolver engine, workflow executor wiring, server-side prompt assembly, auth, billing, full MCP server). Reuse stays at contracts, frontend patterns, schemas, assistant-loop logic, and product architecture.

## Lessons from the internal baseline

The strongest lesson from this baseline is not "more agents." It is constrained autonomy.

Prefer trigger → filter → action → AI-step workflows instead of open-ended agents. For DearMe, the visible AI team should read as **roles**, while execution stays bounded cycles and action graphs.

DearMe should therefore run:

```text
trigger
  -> gather memory/proof/context
  -> update brand blueprint
  -> draft content/opportunity/portfolio work
  -> voice and risk review
  -> approval gate
  -> report
  -> learn from edits and decisions
```

This protects DearMe from becoming an unreliable swarm while preserving the Polsia-style feeling that a team is actively working.

## Direct Reuse Candidates

### 1. Model router

Source:

- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`

Reuse:

- Port the rule-based model routing logic into DearMe's TypeScript server/runtime layer.
- Use cheap/fast models for simple status, lookup, rewrite, and formatting work.
- Escalate to stronger models for strategy, opportunity research, content planning, multi-step cycle generation, and final voice-sensitive outputs.

DearMe adaptation:

- Rename tiers to user-safe/internal names such as `fast`, `balanced`, `premium`.
- Replace donor-specific / Omni-specific regex categories with DearMe categories:
  - simple: status, summarize current plan, list drafts, small rewrite
  - medium: generate post variants, refresh proof card, classify opportunity
  - complex: weekly strategy, voice profile extraction, positioning, outreach strategy, portfolio narrative
- Keep raw model names backstage.

Why it matters:

- This is one of the easiest cost-control wins.
- It fits DearMe's paid-beta economics better than sending every task to the strongest model.

### 2. Tool executor and 3-strike circuit breaker

Source:

- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`

Reuse:

- Port the executor shape: tool registry -> execute tool -> parse error -> track consecutive failures -> stop retrying after repeated failures -> save learning.

DearMe adaptation:

- Track failures by DearMe work type:
  - content_generation
  - voice_profile
  - opportunity_search
  - portfolio_generation
  - connector_action
  - publish_or_send_action
- After repeated failures, stop the loop and create a visible "needs review" decision instead of burning credits silently.
- Save the failure pattern into DearMe memory so the next cycle avoids the same mistake.

Why it matters:

- This makes high automation safer without overusing approval prompts.
- It gives DearMe a reliability primitive that is more valuable than another agent role.

### 3. Learnings, feedback, and preference tables

Source:

- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/convex/schema.ts`

Reuse:

- Recreate the schema idea in DearMe's existing database layer, not necessarily Convex.

DearMe adaptation:

- `learnings` -> `brand_learnings`
  - voice rules, positioning rules, audience lessons, failed angle patterns, successful hooks
- `user_preferences` -> `brand_preferences`
  - preferred channels, tone, forbidden phrases, publication comfort level, opportunity preferences
- `dashboard_logs` -> `growth_cycle_logs`
  - prompts, model tier, work type, status, duration, retries, artifact count
- `feedback` -> `artifact_feedback`
  - edit, reject, approve, make-more-like-me, too-generic, too-salesy, too-personal

Why it matters:

- DearMe needs memory that improves from corrections, not only stored chat history.
- This is directly aligned with voice profile and "Dear me" weekly report loops.

### 4. Agent definition schema

Source:

- `/Users/peter/lindy-extraction/02_mongodb_schemas/AgentDefinition.ts`

Reuse:

- Use the schema as a blueprint for DearMe team member definitions.

DearMe adaptation:

- Do not expose arbitrary agent creation in P0.
- Define fixed DearMe roles:
  - Chief of Staff
  - Brand Strategist
  - Voice Editor
  - Content Producer
  - Opportunity Scout
  - Portfolio Builder
  - Growth Analyst
- Keep fields equivalent to:
  - name
  - description
  - instructions
  - tools
  - memories
  - knowledge sources
  - model tier
  - ask-for-confirmation
  - execution credit limit
  - enabled

Why it matters:

- It lets DearMe show a team while keeping execution deterministic.

### 5. State graph schema

Source:

- `/Users/peter/lindy-extraction/02_mongodb_schemas/StateGraph.ts`

Reuse:

- Use the action graph model as a hidden implementation structure for DearMe cycles.

DearMe adaptation:

- Avoid showing a full ReactFlow workflow builder in P0.
- Compile DearMe cycle templates into hidden graphs:
  - first-cycle graph
  - daily content graph
  - weekly report graph
  - opportunity scout graph
  - portfolio proof graph
- Support action configuration, references to prior node output, premium/action metadata, and confirmation requirements.

Why it matters:

- This gives DearMe reliable automation without asking users to become workflow designers.

### 6. Block/event primitive

Source:

- `/Users/peter/lindy-extraction/02_mongodb_schemas/Block.ts`
- `/Users/peter/lindy-extraction/07_architecture/transcriptV2-source.md`

Reuse:

- Use the baseline **block** primitive for DearMe's work stream and "team worked while I was away" surface.

DearMe adaptation:

- Translate raw block tokens into user-safe product events:
  - `agent.talk` -> team update
  - `action.call` -> working on artifact
  - `action.result` -> artifact ready
  - `action_needed.oauth` -> connection needed
  - `action_needed.paused` -> decision needed
  - `execution.trace` -> backstage detail, collapsed by default
  - `framework_error` -> human-safe issue state
- Keep internal traces available for debugging but never lead with them in the product UI.

Why it matters:

- This is the missing bridge between Naive runtime events and Polsia-style visible momentum.

### 7. Transcript UI structure

Source:

- `/Users/peter/lindy-extraction/07_architecture/transcriptV2-source.md`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/`

Reuse:

- Copy the architecture of block handlers, response wrappers, grouped executions, avatars, loading indicators, and action trace cards.

DearMe adaptation:

- Build a DearMe Work Stream, not a generic chat transcript.
- Default grouping should be by role and artifact:
  - "Voice Editor checked 3 drafts"
  - "Opportunity Scout found 5 openings"
  - "Portfolio Builder prepared 1 proof card"
- Keep verbose traces behind a details panel.

Why it matters:

- DearMe's P0 depends on users seeing the team work.
- The baseline transcript/event rendering model is mature enough to adapt faster than greenfield design.

### 8. Knowledge base ingestion UI

Source:

- `/Users/peter/lindy-extraction/07_architecture/knowledge-base-source.md`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/`

Reuse:

- Adapt the source selection, text/file setup, entry list, and KB modal patterns.

DearMe adaptation:

- Rename to Voice & Memory.
- Sources should be:
  - writing samples
  - website/profile URLs
  - resume/bio
  - shipped work/proof
  - notes
  - customer/audience descriptions
  - approved posts
- Make imports optional; onboarding must still work from one sentence.

Why it matters:

- DearMe needs a credible way to learn voice and proof without starting from a blank chat box.

### 9. Pipedream-style integration strategy

Source:

- `/Users/peter/lindy-extraction/04_graphql/summary.md`
- `/Users/peter/lindy-extraction/13_intelligence_summary/lindy-intelligence-memory.md`

Reuse:

- Reuse the lesson, not necessarily the exact implementation: do not hand-build every integration.

DearMe adaptation:

- Use a connector platform such as Pipedream, Composio, Arcade, or similar after current docs/licensing/pricing are verified.
- P0 can start with draft/export flows; real publish/send connectors can come after the visible team loop works.

Why it matters:

- Industry pattern from this baseline: hand-building hundreds of integrations early is usually a trap.
- DearMe should prioritize visible work quality before full connector breadth.

## Prompt Reuse

Source:

- `/Users/peter/lindy-extraction/05_production_prompts/`

Reuse:

- Use the prompt materials as internal references for structure, not as user-facing product copy.
- Especially useful patterns:
  - person research
  - communication style extraction
  - daily briefing
  - meeting/context prep
  - reply predictability
  - channel-specific drafting

DearMe adaptation:

- Convert into DearMe-specific prompt modules:
  - voice_profile_extractor
  - brand_blueprint_builder
  - content_angle_generator
  - opportunity_researcher
  - outreach_draft_writer
  - weekly_dear_me_reporter
- Remove donor-specific product wording, workspace assumptions, channel names, and internal names.

## What Not To Copy For P0

Do not copy the baseline's full workflow editor into DearMe P0.

Reasons:

- DearMe users are buying a growth team, not a workflow builder.
- ReactFlow-style graph editing will make the product feel technical.
- P0 should hide the graph and show prepared work plus decisions.

Do not copy broad OAuth scopes by default.

Reasons:

- DearMe handles personal reputation.
- Approval-first trust is a product feature.
- Draft/export is enough for early value.

Do not copy the baseline's pricing complexity early.

Reasons:

- DearMe's first paid beta should sell cycles and outcomes.
- Credits can exist backstage for cost control, but user-facing pricing should stay understandable.

Do not expose donor-platform names (including Paperclip, OpenClaw, Naive, adapter, raw model IDs, GraphQL, MCP, or setup blueprint jargon) in the **product UI**.

## DearMe P0 changes implied by baseline patterns

1. Add hidden cycle graphs.
2. Add a DearMe work block/event model.
3. Add role-based team definitions backed by fixed cycle responsibilities.
4. Add model-tier routing.
5. Add tool failure circuit breakers.
6. Add learning and feedback tables.
7. Add Voice & Memory ingestion modeled after KB setup.
8. Add approval-needed events as first-class work stream blocks.
9. Add cycle logs for cost, duration, retries, artifacts, and user decisions.
10. Defer visual workflow editing until P2 or later.

## Recommended Build Order

1. Port model router logic into the server.
2. Add DearMe work event/block contract.
3. Add fixed team role definitions.
4. Add first-cycle hidden graph template.
5. Render Work Stream from blocks/events.
6. Add Voice & Memory ingestion surface.
7. Add failure circuit breaker and learning writes.
8. Connect approval queue to work stream events.
9. Add weekly report generation from cycle logs, decisions, and learnings.
10. Add connector platform evaluation before implementing real publish/send.

## Open Questions

- Whether to keep DearMe's hidden graph model in existing Paperclip issue/run tables or add dedicated DearMe cycle tables.
- Whether to port `omni_dash` patterns into TypeScript directly or preserve a small Python worker boundary.
- Whether early P0 should use connector-platform draft/export only, or include one real channel such as email/newsletter.
- Whether pricing should expose credits at all, or only show weekly cycles and fair-use limits.

## Acceptance Criteria

Baseline reuse is successful when:

- DearMe visibly feels like a working team, not a graph editor.
- User actions are reduced to approving, editing, rejecting, or redirecting prepared work.
- The runtime is cheaper because simple tasks route to cheaper models.
- Repeated tool failures stop automatically and create useful learnings.
- Voice and memory improve from user corrections.
- Work stream events are understandable without exposing internal runtime terminology.
- DearMe can later add a workflow editor without changing its P0 user promise.
