# DearMe Worktree Integration Plan

Date: 2026-05-07

Purpose: stabilize the current mixed DearMe/Paperclip worktree and define the
next safe implementation slice. This is an integration plan, not a product
redesign.

## Executive Decision

Treat the current checkout as an active integration branch, not as a clean
feature branch.

Do not broad-revert, bulk-rename, or run cleanup over the tree. Preserve the
DearMe product spine, verify risky substrate changes before relying on them, and
move forward through small reviewable slices.

The next implementation target is:

> DearMe customer web shell isolation.

That means the user should enter a premium DearMe product surface and stop
seeing Paperclip operator navigation, raw issues, raw approvals, agents,
workspaces, plugins, adapters, costs, or instance settings as the primary UI.

2026-05-07 update: the customer shell isolation slice is now implemented and
verified in the current tree. The next safe product slice is output-level review
and regeneration, followed by Team Work Stream and Voice & Memory. Keep using
this file as the dirty-tree integration plan, but treat the implementation
target below as a completed milestone rather than the current blocker.

## Reuse-First Integration Decision

The donor split is now locked for implementation sequencing:

- Naive/Paperclip is the technical substrate. Reuse the current Paperclip
  kernel and DearMe projections rather than building a new backend, auth stack,
  scheduler, approval engine, billing ledger, or agent runtime.
- Polsia is product choreography. Reuse the onboarding speed, visible team
  momentum, cycle/report ritual, and proof loop, not its visual design or
  company-factory framing.
- Lindy is the strongest direct web-code donor. Reuse interaction patterns from
  local source-level files, not the whole app shell.
- DearMe owns customer vocabulary, premium visual design, Brand OS, voice
  profile, opportunity semantics, portfolio semantics, and approval-first
  reputation safety.

Concrete donor paths for the next web slices:

- Lindy ActionCard and action-needed patterns:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/thoughts/ActionCardContent.tsx`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`.
- Lindy transcript/block patterns:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/Transcript.tsx`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/BlockResponses.tsx`,
  `/Users/peter/lindy-extraction/02_mongodb_schemas/Block.ts`,
  `/Users/peter/lindy-extraction/07_architecture/transcriptV2-source.md`.
- Lindy Voice & Memory donor:
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/components/KnowledgeBaseEditor.tsx`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/hooks/useManageEntries.ts`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/hooks/useUploadNewEntry.ts`,
  `/Users/peter/lindy-extraction/02_mongodb_schemas/KnowledgeBaseDataSource.ts`.
- Lindy typed/realtime contracts:
  `/Users/peter/lindy-extraction/03_backend_route_schemas`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/lib/realtime/frontendWsClient.ts`,
  `/Users/peter/lindy-extraction/01_frontend_source/src/hooks/useRealtimeChannel.ts`.
- Naive/Paperclip runtime donor:
  `/Users/peter/naive-research-2026-05-05/paperclipai/paperclip-full`,
  `/Users/peter/naive-research-2026-05-05/session-fetches/extracted-setup_payload.json`,
  `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`.
- Polsia product donor:
  `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`,
  `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/03-MARKETING-STRATEGY.md`,
  `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/15-PERSONAL-BRAND-FORK-SPEC.md`.

Implementation rule: each new DearMe slice must name which donor path was used
as direct source, interaction reference, product choreography, or rejected
reference. If no donor applies, the slice should say why new DearMe code is
needed.

## Current Dirty Tree Shape

The worktree currently contains a large mixed delta:

- 277 dirty files
- 218 tracked modified files
- 59 untracked files
- 93 test files changed or added
- 23 DearMe docs files changed or added

High-level buckets:

- `docs/dearme/*`: DearMe product architecture, positioning, reuse,
  provenance, and build-state docs.
- `packages/shared/src/validators/dearme.*`: DearMe contract and validation
  spine.
- `server/src/routes/dearme.ts`: DearMe product API route.
- `server/src/services/dearme-*.ts`: DearMe Brand OS, workbench, output
  handoff, paid-beta, and approval-backed services.
- `ui/src/api/dearme.ts`, `ui/src/lib/dearme-brand-blueprint.ts`, and
  `ui/src/pages/DearMeOnboarding.*`: current DearMe UI/API product spine.
- `*-copy.test.ts` and rebrand/copy tests: migration guardrails around
  Paperclip-to-DearMe copy language and kernel behavior.
- Broad `cli/`, `server/`, `packages/`, and `ui/` churn: potentially useful,
  but not safe to treat as DearMe-only without focused review.

## Preserve / Verify / Defer

Preserve:

- Current DearMe docs, including this file, `INTEGRATED-ARCHITECTURE.md`,
  `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`, `POLSIA-NAIVE-REUSE-PLAN.md`,
  `LINDY-ASSISTANT-REUSE-PLAN.md`, `REBRAND-AND-PROVENANCE.md`, and
  `BUILD-STATE.md`.
- Current DearMe shared validator, server route, server services, UI API, and
  DearMe onboarding/workbench UI files.
- New DearMe tests and copy/rebrand tests when they guard the product shell or
  prevent user-facing substrate leaks.

Verify before expanding:

- `server/src/app.ts`, route registration, authz, private-hostname guard,
  middleware, startup banner, and worktree config.
- CLI auth/deployment/secret checks.
- Adapter/plugin/runtime-loader changes.
- Finance, approvals, execution workspaces, heartbeat, environments, and
  liveness services.
- Any changed UI page or component that is not directly part of DearMe's
  customer shell.

Defer:

- Dedicated DearMe database schema unless the existing Paperclip tables block
  product correctness.
- Social/email/calendar publishing connectors until the work stream, ActionCard,
  approval queue, and review surfaces work inside DearMe.
- Naive-style per-tenant VM and generated app/site provisioning until the core
  web product is usable.
- Wholesale Lindy frontend porting. Use its patterns; do not import the whole
  Relay/GraphQL application shape into DearMe.

## Completed Slice: DearMe Customer Web Shell Isolation

Goal: make DearMe feel like the product, not a Paperclip board with a DearMe
page inside it.

Original leak addressed by this slice:

- `ui/src/App.tsx` mounted `/:companyPrefix/dearme`, but the same customer
  shell also exposed inherited routes for issues, routines, agents, projects,
  workspaces, goals, approvals, costs, activity, skills, plugins, org, company
  settings, and instance settings.
- `ui/src/components/Sidebar.tsx` was still an operator navigation surface:
  New Issue, Issues, Routines, Goals, Workspaces, Projects, Agents, Company,
  Skills, Costs, Activity, and Settings.
- `ui/src/pages/DearMeOnboarding.tsx` still opened raw approvals and issues for
  some review actions.

Implementation target:

- Add or adapt a DearMe customer shell for `/dearme` and
  `/:companyPrefix/dearme`.
- Customer navigation should be product vocabulary only:
  - Home
  - Work Ready
  - Decisions
  - Voice & Memory
  - Brand OS
  - Content
  - Opportunities
  - Portfolio
  - Reports
- Hide Paperclip operator surfaces from the customer shell.
- Keep the underlying Paperclip routes available only behind an explicit
  operator/admin surface if they are still needed for internal work.
- Keep review/open actions inside DearMe through inline panels or DearMe-owned
  review routes. Do not send customers to raw `/issues/*` or `/approvals/*`.

Acceptance criteria:

- DearMe customer path has no visible `Paperclip`, `issue`, `routine`, `agent`,
  `workspace`, `adapter`, `plugin`, `provider`, `setup_payload`, or raw
  operator navigation language.
- DearMe still uses the existing DearMe API and Paperclip substrate underneath.
- Internal operator routes are not deleted; they are simply not the customer
  shell.
- Existing DearMe onboarding/workbench behavior still works.

Focused test targets:

- `ui/src/components/Sidebar.test.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- route-level tests around `ui/src/App.tsx`
- `ui/src/api/dearme.test.ts`
- `packages/shared/src/validators/dearme.test.ts`
- `server/src/__tests__/dearme-*.test.ts`

Completed on 2026-05-07:

- Added `ui/src/components/DearMeSidebar.tsx`.
- Switched `ui/src/components/Layout.tsx` to use the DearMe customer sidebar on
  DearMe routes.
- Hid inherited CompanyRail, PropertiesPanel, MobileBottomNav, and new
  issue/project/goal/agent dialogs on DearMe routes.
- Routed DearMe review/open actions back into `/dearme?view=decisions` instead
  of raw issue/approval pages.
- Verified with focused UI tests and UI typecheck.

## Completed Slice: DearMe-Owned Decision Detail Panels

Goal: make `/dearme?view=decisions&approval=...` and
`/dearme?view=decisions&issue=...` render useful inline decision detail instead
of only landing on the general workbench.

Implementation target:

- Parse DearMe workbench query params for decision focus.
- Show the selected approval/output in a DearMe-owned panel.
- Keep approve, reject, edit, regenerate, and review-copy actions inside DearMe.
- Continue hiding raw substrate ids unless they are needed for internal debug.

Focused test targets:

- `ui/src/pages/DearMeOnboarding.test.tsx`
- focused DearMe route/query test if a helper is extracted
- existing approval and output route/service tests

Completed on 2026-05-07:

- Parsed focused DearMe decision query params inside the DearMe page.
- Added focused decision, batch, work-item, and output panels using existing
  DearMe workbench/output data.
- Kept focused review URLs inside `/dearme?view=decisions` instead of exposing
  raw approval or issue routes.
- Fixed DearMe sidebar active state for focused decision URLs with extra query
  params.
- Verified with focused UI tests and UI typecheck.

## Completed Slice: DearMe ActionCard Review Actions

Goal: turn the focused panels from read-only summaries into DearMe-native
decision cards.

Implementation target:

- Add DearMe-owned approve/reject/edit/regenerate action controls for focused
  decisions and outputs.
- Reuse existing approval APIs and review/update services where possible; do not
  create a second approval system.
- Adapt Lindy's ActionCard interaction pattern for compact, reviewable product
  actions without importing Lindy's Relay/GraphQL application shell.
- Keep public/send/deploy/spend actions batch-gated and private by default.

Focused test targets:

- `ui/src/pages/DearMeOnboarding.test.tsx`
- existing approval route/service tests
- existing DearMe output handoff/review tests

Completed on 2026-05-07:

- Added approve, request-changes, and reject controls to the focused DearMe
  approval panel.
- Reused `approvalsApi.approve`, `approvalsApi.requestRevision`, and
  `approvalsApi.reject` instead of creating a second approval system.
- Added a DearMe decision-note field and default notes for approve, request
  revision, and reject actions.
- Kept approval decisions inside `/dearme?view=decisions&approval=...` and
  strengthened tests against raw `/approvals/*` leakage.
- Fixed duplicate role-key rendering in DearMe team cards found during local
  browser smoke.
- Verified with focused UI tests, UI typecheck, diff hygiene, and local browser
  smoke.

## Next Slice: DearMe Output Review And Regeneration Actions

Goal: turn focused private outputs into actionable DearMe review cards.

Implementation target:

- Add DearMe-owned actions for private outputs: approve as useful, request
  changes, regenerate draft, and mark as not useful.
- Reuse existing output handoff/review/update services where possible; do not
  create a parallel output review system.
- Keep user-facing labels as posts, reports, proof cards, opportunities, and
  portfolio updates, not issue/document/work-product internals.
- Preserve approval gates for public/send/deploy/spend moves.

Focused test targets:

- `ui/src/pages/DearMeOnboarding.test.tsx`
- `ui/src/api/dearme.test.ts`
- `server/src/__tests__/dearme-output-handoff.test.ts`
- existing approval route/service tests if output review creates approval
  updates

Donor grounding:

- Product behavior: Polsia's fast visible cycle and report/output loop.
- UI interaction: Lindy's ActionCard, action-needed modal, and form-builder
  patterns.
- Backend substrate: existing DearMe output handoff plus Paperclip approvals,
  issues, documents, and work products.
- Explicit non-goal: do not create a second output-review runtime or a Lindy
  style workflow editor.

Acceptance criteria:

- Focused output panels expose approve/useful, request changes, regenerate, and
  not-useful actions inside `/dearme`.
- User notes feed future regeneration or review context through the existing
  DearMe/Paperclip services.
- Customer-facing labels say post, report, proof card, opportunity, portfolio
  update, or draft; they do not say raw issue, document id, work product id,
  adapter, provider, or model.
- Public/send/deploy/spend moves remain separate approval-gated decisions.
- Tests prove raw `/issues/*` and `/approvals/*` are not needed for this review
  loop.

## Lindy Reuse Notes

Use Lindy for interaction patterns, not wholesale code import.

Reusable patterns from `/Users/peter/lindy-extraction`:

- Transcript grouping and event dispatch:
  `01_frontend_source/src/layouts/sections/SubTaskViewSection/sections/TaskTranscriptContentSection/TaskTranscriptContentSection.tsx`
  and related task transcript event components.
- ActionCard state machine:
  `TaskEventActionCall`, `useActionCardForm`, default action forms, email form,
  calendar form, memory form, and form-builder pattern.
- Knowledge base management:
  `KnowledgeBaseEditor`, `useManageEntries`, and `useUploadNewEntry`.
- Schema vocabulary:
  `02_mongodb_schemas/Block.ts`, `StateGraph.ts`, and `AgentDefinition.ts`.

DearMe adaptation:

- Work stream entries become visible work by DearMe roles: Chief of Staff,
  Voice Editor, Content Producer, Opportunity Scout, Portfolio Builder, Growth
  Analyst.
- ActionCards become DearMe decisions: approve post, edit outreach, accept
  opportunity, update proof card, refine voice rule, publish portfolio change.
- Knowledge Base becomes Voice & Memory / Brand OS source ingestion.

## Polsia And Naive Reuse Boundaries

Polsia is the product choreography source:

- fast onboarding
- visible AI team momentum
- live progress
- cycles
- deliverables
- reports
- "work happened while I was away" feeling

Do not copy Polsia's visual style directly into DearMe. DearMe needs a more
premium personal-brand UI.

Naive/Paperclip is the technical substrate:

- auth and workspace/company primitives
- agents, issues, routines, heartbeats
- live events, activity logs, work products
- approvals, budgets, costs, credits
- adapters, plugins, execution workspaces
- `setup_payload` pattern adapted as `brand_blueprint`

DearMe must hide those substrate nouns from paid-beta users unless the surface
is explicitly internal/operator-only.

## Commit And Review Queue

When it is time to commit, split the current tree into reviewable groups:

1. Docs and architecture lock.
2. DearMe product spine: validator, server route/services, UI API, and DearMe
   page/workbench.
3. DearMe customer shell isolation and UI tests.
4. Copy/rebrand guard tests.
5. Kernel/CLI/runtime changes only after targeted verification.

Do not use `git add -A` or broad staging. Stage by explicit path group.

## Stop Rules

Stop and report instead of forcing through if:

- a route or shell change requires deleting internal Paperclip operator
  functionality;
- a test failure points to auth, permissions, execution workspaces, adapters, or
  database migration behavior outside the DearMe shell;
- a proposed change needs a full rebase or broad conflict resolution while
  another Codex is still actively editing the same checkout.

Otherwise continue with the next smallest verified slice.
