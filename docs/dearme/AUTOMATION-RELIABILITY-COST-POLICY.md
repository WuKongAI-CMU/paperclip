# DearMe Automation Reliability And Cost Policy

Date: 2026-05-09
Ticket: DM-129
Status: Implemented as policy plus initial customer-facing workbench panel

## Decision

DearMe should automate aggressively for low-risk private work, but it must make
automation understandable, bounded, and stoppable before deeper autonomous
cycles ship. DM-129 implements that boundary as a policy document plus a
customer-facing `Team operating policy` panel in the current DearMe workbench.

The policy is:

```text
High automation by default.
Hard approval for reputation, money, external channels, and sensitive material.
Hard stop for budget breach and repeated execution failure.
Customer-safe explanation for every stop, retry, and cost signal.
```

This is a product and runtime boundary. DearMe sells the feeling that a personal
brand team is working in the background, but the user must never feel that the
system is spending, publishing, sending, or retrying blindly.

## Donor Split

### Polsia: Product Choreography And Cost Packaging

Reuse:

- Async execution feeling: start work immediately, return quickly, and show
  progress while the real work continues.
- Cycle language: plan, work, summarize, report.
- Task/cycle cost attribution: every model call should belong to a readable
  work unit, not a hidden provider ledger.
- Credit/cycle packaging: users understand "cycles" and "prepared moves" better
  than raw token ledgers.

Evidence:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`
  records task metadata and subscription headers for cost attribution.
- The same source records async `202` responses with background execution and
  inline cost persistence.
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/13-PRODUCTION-API-RESPONSES-DEEP-DIVE.md`
  records production cost shape and starter-tier execution economics.

Reject:

- Do not copy Polsia's process-local timer model as DearMe's reliability
  mechanism. It is useful product choreography, but brittle infrastructure.
- Do not expose raw public feeds for personal-brand work by default.
- Do not copy the company-factory frame; DearMe is personal reputation work.

### Naive/Paperclip: Runtime And Budget Substrate

Reuse:

- Budget preflight before wakeup, not after cost is incurred.
- `cost_events` for provider/model/token cost.
- `finance_events` for business-level billing and credits.
- `heartbeat_runs` for execution status, usage, result, log, and retry state.
- `agent_wakeup_requests` for queued/skipped/coalesced automation requests.
- Existing approvals for budget override and risky actions.
- Existing workbench projection before adding new tables or runtime services.

Evidence:

- `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md` identifies
  `enqueueWakeup` as the scheduling entry and budget guard.
- `server/src/services/budgets.ts` already exposes `getInvocationBlock`.
- `server/src/services/heartbeat.ts` already writes skipped wakeup requests
  with `reason: "budget.blocked"` before invoking work.
- `ui/src/api/costs.ts` already exposes cost, finance, window spend, and quota
  APIs.
- `server/src/services/dearme-workbench.ts` already projects DearMe agent cost
  totals into the customer-safe workbench.

Reject:

- Do not create a parallel DearMe automation runtime while Paperclip already
  has wakeups, routines, heartbeat runs, budgets, approvals, and cost ledgers.
- Do not show Paperclip, adapter, provider, model, cost event, finance event,
  heartbeat, issue, or wakeup language to paid-beta users.
- Do not start with per-tenant VM provisioning for DearMe P0 unless content,
  opportunity, portfolio, and report loops require isolated execution later.

### Lindy: Routing, Failure Memory, And Premium Interaction Pattern

Reuse:

- Rule-based cheap/expensive routing before calling a model.
- Max-turn budgets by task complexity.
- Consecutive-failure circuit breaker.
- Save a learning after a recovery succeeds.
- Track status, retry count, duration, tool calls, and failure summary as
  analytics, then project that into product-safe language.

Evidence:

- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`
  uses zero-cost rule classification, cheap default routing, and max-turn
  budgets.
- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`
  stops repeated tool failures after three consecutive failures and records a
  recovery learning after success.
- `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/convex/schema.ts`
  logs build attempts with status, model, tool calls, duration, errors, and
  retry count.

Reject:

- Do not transplant the Python service.
- Do not expose Lindy/Ralph/dashboard vocabulary.
- Do not replace DearMe's existing output review and workbench services.

## User-Facing Automation Contract

DearMe should describe automation in four customer-safe states:

| State | Meaning | User wording |
| --- | --- | --- |
| Working | Private, low-risk work is running or queued. | "Your team is preparing work." |
| Ready | A concrete artifact is ready for review. | "Ready for your call." |
| Needs approval | Reputation, send, publish, deploy, spend, or sensitive material is involved. | "Approve what represents you." |
| Paused | Budget, repeated failure, missing source, or user hold stopped work. | "Paused before wasting spend or risking your reputation." |

Avoid:

- "heartbeat"
- "wakeup"
- "cost event"
- "finance event"
- "adapter"
- "provider"
- "model routing"
- "issue"
- "work product"
- "runtime"
- "Ralph"
- "Polsia"
- "Naive"
- "Lindy"

## Automation Decision Matrix

| Work type | Default | Stop condition | User action |
| --- | --- | --- | --- |
| Research, summarization, source review prep | Auto-run | Budget hard stop, repeated failures, missing source permission | Review prepared source or accept memory |
| Voice profile extraction | Auto-run after samples | Too little source material, repeated low confidence, budget hard stop | Add samples or approve draft profile |
| Content draft generation | Auto-run | Budget hard stop, repeated failures, voice gate failure | Approve, edit, request changes, regenerate |
| Opportunity scouting | Auto-run | Sensitive source required, budget hard stop, repeated low-quality results | Approve outreach target or refine direction |
| Outreach draft | Draft automatically | External send, sensitive claim, budget hard stop | Approve/send manually or request changes |
| Public post or profile update | Prepare only | Any publish action | Approve before publishing |
| Portfolio/site update | Prepare preview | Deploy/public change | Approve deploy or keep private |
| Paid usage/spend increase | Never auto-increase | Budget threshold or trial/credit exhaustion | Approve budget change |
| Retry after failure | Auto-retry within policy | Three related failures or known bad input | Show pause reason and recommended next move |
| Memory update from accepted output | Auto-save low-risk preference/proof | Sensitive personal data or conflict with existing memory | Confirm, edit, or reject |

## Runtime Policy

### 1. Preflight Before Work

Before any scheduled, on-demand, or continuation work starts, DearMe must rely
on the existing Paperclip budget preflight path:

1. Resolve company, agent, issue/project context.
2. Ask `budgetService.getInvocationBlock`.
3. If blocked, write a skipped wakeup/request record.
4. Surface a DearMe-safe pause state.
5. Do not invoke the adapter or create new spend.

This is the Naive/Paperclip rule that matters most: prevent cost before it is
created.

### 2. Cost Attribution

Every DearMe automation unit should carry readable attribution:

- `cycle`: onboarding, daily, weekly, opportunity, content, portfolio.
- `role`: Chief of Staff, Voice Editor, Content Producer, Opportunity Scout,
  Portfolio Builder, Growth Analyst.
- `artifact`: post, outreach draft, proof card, report, voice profile,
  opportunity list.
- `risk`: private, approval_required, public, spend.

Implementation should first project this from existing rows:

- `heartbeat_runs.contextSnapshot`
- `cost_events`
- `finance_events`
- output handoff/review rows
- routines and routine runs
- approvals

Only add schema if the projection cannot answer paid-beta questions after one
real usage pass.

### 3. Model Routing

DearMe should adapt Lindy's router idea into a TypeScript policy later:

- cheap model for classification, formatting, extraction, summaries, status,
  memory normalization, and routine report scaffolding.
- stronger model for positioning, voice-sensitive writing, opportunity
  reasoning, multi-source synthesis, and final user-facing drafts.
- override path for tests and local development.
- max turn/work budget per task family.

Do not surface model names in paid-beta UI. The UI should show:

- "Fast private pass"
- "Deep strategy pass"
- "Voice check"
- "Final review pass"

### 4. Retry And Circuit Breaker

DearMe should adapt Lindy's consecutive-failure breaker:

- Track related failures by company, role, cycle, artifact, and error family.
- Allow automatic retry for transient infrastructure failures.
- Stop after three related failures or one deterministic validation failure.
- Convert the stop into a customer-safe pause reason.
- Save a learning after recovery succeeds.

The user should see:

```text
Paused after repeated attempts. Your team stopped before wasting more spend.
Recommended next move: add one clearer source or change the direction.
```

The user should not see stack traces, tool names, provider names, or retry
internals.

### 5. Approval Gates

Approval is required for:

- publish
- send
- deploy
- spend increase
- public claims
- sensitive personal material
- channel connection changes
- destructive changes

Approval is not required for:

- private drafts
- private source summaries
- private memory suggestions
- private report drafts
- private opportunity research
- private portfolio previews

### 6. Coalescing

DearMe should prefer coalescing duplicate background work over starting
parallel runs. Existing routine/wakeup coalescing is already better than a new
queue for P0.

Customer wording:

```text
Folded into existing work so your team does not create duplicate decisions.
```

### 7. Cost Presentation

Paid-beta UI should show cost as:

- monthly guardrail
- remaining credit
- cycles used
- work prepared
- pauses caused by guardrails

It should not lead with raw token accounting. Raw cost/provider/model details
remain internal operator diagnostics.

## Architecture Placement

This policy is not a new subsystem. It is a projection and enforcement contract
over existing substrate:

```text
DearMe UI
  -> customer-safe automation/cost projection
  -> DearMe workbench service
  -> Paperclip budget, wakeup, heartbeat, routine, approval, cost, finance rows
```

The current DM-129 UI derives its first policy signals from the existing
workbench response, paid-beta state, review-loop attempts, decision queues, and
spend checkpoints. If future autonomous jobs need stronger server-owned state,
the next implementation should add the smallest useful projection first:

```ts
type DearMeAutomationPolicyView = {
  automationMode: "working" | "ready" | "needs_approval" | "paused";
  monthlyGuardrailCents: number | null;
  monthSpendCents: number;
  remainingCreditCents: number | null;
  cyclesUsedThisMonth: number;
  activePrivateWorkCount: number;
  pendingDecisionCount: number;
  pausedReasons: Array<{
    kind: "budget" | "repeated_failure" | "missing_source" | "user_hold";
    title: string;
    summary: string;
    recommendedAction: string;
  }>;
  guardrails: Array<{
    title: string;
    summary: string;
    status: "ok" | "warning" | "blocked";
  }>;
};
```

This type is a read model first. It should not create a new database table in
the first implementation.

## Implementation Status And Follow-Up Queue

### Completed In DM-129

Completed:

- Added this policy document.
- Added a DearMe-native `Team operating policy` panel to the workbench.
- Kept backend routes, database tables, budget services, model routing, and
  runtime services unchanged.
- Used existing workbench and paid-beta data instead of creating a second
  automation contract.

### Future DM-129A: Backend Automation Policy Projection

Scope:

- Extend `server/src/services/dearme-workbench.ts`.
- Extend shared DearMe types/validators.
- Add focused service tests.
- Expose a customer-safe `automationPolicy`/`guardrails` object in the existing
  workbench response.

Must reuse:

- existing `cost_events` aggregation
- existing budget state
- existing routine/wakeup statuses
- existing approval counts
- existing output review counts

Do not add:

- a new runtime
- a new scheduler
- a new database table
- raw provider/model language

Only start this when the current client-side policy panel needs state that the
existing workbench response cannot derive.

### Future DM-129B: Automation And Cost UI Deepening

Scope:

- Add a compact guardrail/status module to the DearMe Home Cockpit.
- Show monthly guardrail, remaining credit, private work running, decisions
  waiting, and pause reasons.
- Keep it visually secondary to Work Ready and the team work stream.

Only start this after the current Team operating policy panel proves useful in
real workbench use.

### Future DM-129C: Routing And Circuit-Breaker Service

Scope:

- Add a TypeScript model-routing policy inspired by Lindy.
- Add related-failure grouping and stop-after-three policy.
- Feed recovery learnings into existing memory/report surfaces.

Only start this after DM-129A proves a server-owned projection is useful.

## Acceptance

DM-129 is accepted when:

- Polsia, Naive/Paperclip, and Lindy reuse are explicitly mapped.
- DearMe has a clear auto-run/approval/stop policy.
- The current implementation surfaces the policy in DearMe language.
- Future implementation slices are projections over existing substrate, not a
  new runtime by default.
- Cost and reliability language stays customer-safe.
- Future workers know exactly which donor ideas to copy, adapt, and reject.

## Non-Goals

- No backend route, database, scheduler, budget service, or runtime contract
  changes in this slice.
- No payment provider integration.
- No new scheduler.
- No per-tenant VM.
- No public feed.
- No direct Lindy/Polsia/Naive UI import.
- No raw runtime terminology in customer-facing DearMe surfaces.
