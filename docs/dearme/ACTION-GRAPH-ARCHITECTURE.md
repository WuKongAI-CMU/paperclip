# DearMe Action Graph Architecture

Date: 2026-05-09

## Decision

DearMe should expose a customer-safe action graph as a projection over the
existing Paperclip/Naive substrate, not as a new runtime, new database graph, or
agent-control UI.

The action graph is the bridge between the products Peter wants to reuse:

- Polsia gives the visible product choreography: cycle, roles, tasks,
  deliverables, approvals, memory, and report ritual.
- Naive/Paperclip gives the working substrate: companies, agents, issues,
  approvals, documents, work products, activity rows, and workbench routes.
- Lindy gives the web interaction pattern: action cards, transcript blocks,
  pending-action states, retry/regenerate flows, and knowledge/memory UI.

DearMe owns the customer language. Users should see a personal brand growth
team, prepared work, decisions, memory, and reports. They should not see raw
issues, adapters, providers, model plumbing, setup payloads, or a generic agent
graph.

## Current Implementation

The first action graph slice is implemented as a read projection:

- Shared contract:
  - `packages/shared/src/validators/dearme.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/validators/index.ts`
- Server projection:
  - `server/src/services/dearme-workbench.ts`
- Focused coverage:
  - `packages/shared/src/validators/dearme.test.ts`
  - `server/src/__tests__/dearme-workbench.test.ts`
  - `ui/src/pages/DearMeOnboarding.test.tsx`
- Customer shell refinement:
  - `ui/src/pages/DearMeOnboarding.tsx`

The workbench response now includes `actionGraph` with:

- `cycle` node: the current weekly growth loop.
- `role` nodes: visible DearMe team members.
- `work_item` nodes: active or review-ready work lanes.
- `artifact` nodes: posts, opportunities, proof cards, portfolio updates, and
  reports.
- `decision` nodes: user calls needed before work moves forward.
- `guardrail` nodes: approval gates around public/send/deploy/spend/sensitive
  moves.
- `memory_signal` nodes: recent voice, proof, preference, and correction memory.
- `report` nodes: weekly Dear me report outputs.

Edges describe customer-safe relationships:

- `owns`: cycle or role owns a lane.
- `produces`: work produces an artifact.
- `requires_decision`: artifact or work waits for the user.
- `blocks`: guardrail prevents risky action.
- `learns_from`: the cycle updates from memory.
- `reports`: the cycle rolls up into a report.

## Reuse Boundary

### Reused From Polsia

Use the choreography, not the company-factory framing:

- A loop that visibly moves through planning, work, review, learning, and
  reporting.
- Role-based team language instead of raw workflow machinery.
- Approval checkpoints that make automation feel trusted, not reckless.
- Daily/weekly report ritual so the user feels work happened while they were
  away.

### Reused From Naive/Paperclip

Reuse existing rows and invariants before adding DearMe tables:

- Companies remain the tenancy boundary.
- Agents remain the worker identity layer.
- Issues remain the private work lanes.
- Approvals remain the governed-action boundary.
- Documents and work products remain the output storage layer.
- Activity rows remain the progress/event source.

The action graph must stay a projection until a concrete product need proves
that a persisted graph is necessary.

### Adapted From Lindy

Adapt the interaction patterns, not the whole shell:

- Action-card blocks for work ready and decisions needed.
- Pending-action states that explain what is waiting on the user.
- Retry/regenerate/request-changes language for output review.
- Knowledge/memory source management as the next Voice & Memory surface.

The current customer UI already moves in this direction by adding clearer
decision context and next-step copy to Work Ready and Decisions Needed. The
paid-beta shell now renders the typed `actionGraph` directly as a premium Team
work stream, while keeping raw graph ids, issue ids, approval ids, providers,
adapters, and runtime language out of the user-facing surface.

## Non-Goals

- Do not import Polsia or Lindy branding, copy, or visual system.
- Do not expose Paperclip, Naive, adapter, provider, model, issue, approval
  route, setup payload, or work-product jargon to paid-beta users.
- Do not add action graph tables until the projection model fails.
- Do not let graph visibility imply hidden posting, sending, deploying, or
  spending. Risky moves remain approval-gated.
- Do not turn DearMe into an agent dashboard. Team visible, machinery hidden.

## Next Worker Tickets

### DM-103: Premium Work Stream From Action Graph

Status: implemented in the DearMe onboarding/workbench shell on 2026-05-09.

`workbench.actionGraph` now renders as a Lindy-style stream of customer-safe
action cards:

- cycle card
- role cards
- artifact cards
- decision cards
- memory update cards
- weekly report card

Acceptance covered: the first screen makes the Polsia-style "my team is
working" feeling visible without exposing substrate language.

### DM-104: Voice & Memory Source Surface

Use Lindy's knowledge/memory management patterns to let the user add and manage:

- writing samples
- proof points
- links
- corrections
- forbidden phrases
- audience and offer notes

Acceptance: Voice Gate gets real source material without becoming a settings
page.

### DM-105: Polsia-Style Cycle Controls

Add customer-safe controls around the weekly growth loop:

- start next cycle
- pause private work
- focus this week on content, opportunity, portfolio, or voice
- approve a batch
- request changes
- regenerate privately

Acceptance: the user controls direction and approvals while the inherited
Naive/Paperclip substrate continues to execute the private work.
