# DearMe Architecture-First Reuse Execution Plan

Date: 2026-05-08

## Mandate

DearMe is now treated as an always-on product build owned by the agent system.
The operating rule is architecture first, then iterative implementation. The
implementation rule is maximum practical reuse from Polsia, Naive/Paperclip,
and Lindy before writing new product code.

This does not mean uncontrolled work in the dirty integration checkout. It means
the lead thread keeps the architecture, queue, and acceptance criteria stable,
then assigns bounded slices to isolated workers only after the baseline is safe.

## Current Verdict

The DearMe architecture is already coherent:

- Naive/Paperclip is the hidden execution substrate.
- Polsia contributes the product rhythm, onboarding speed, live work loop, and
  reporting ceremony.
- Lindy contributes the strongest web interaction grammar for action cards,
  transcript/work-stream patterns, knowledge-base management, and constrained
  workflow execution.
- DearMe owns the customer language: Brand OS, voice, proof, opportunities,
  portfolio, weekly reports, and approval-first reputation safety.

The immediate blocker is not product direction. The immediate blocker is that
the current `/Users/peter/dearme` checkout is a mixed integration tree with many
DearMe files still untracked. Isolated implementation workers need a selected
base ref that already contains the DearMe product spine and source-of-truth
docs. Until that exists, implementation tickets must not start from a clean
Paperclip-only base.

## Hard Gates Before Product-Code Workers

1. The selected base must contain the DearMe source-of-truth docs:
   `docs/dearme/README.md`, `INTEGRATED-ARCHITECTURE.md`,
   `WORKTREE-INTEGRATION-PLAN.md`, `POLSIA-NAIVE-REUSE-PLAN.md`,
   `LINDY-ASSISTANT-REUSE-PLAN.md`, `REBRAND-AND-PROVENANCE.md`, and
   `BUILD-STATE.md`.
2. The selected base must contain the DearMe spine needed by the first product
   tickets: shared validators, DearMe server route/services, DearMe UI API
   client, DearMe shell/page components, and focused tests.
3. Each ticket must name donor paths used, adapted, or rejected.
4. Workers must use isolated disposable worktrees. Do not implement directly in
   the dirty integration checkout.
5. Customer-facing DearMe surfaces must not expose Paperclip, OpenClaw, OK
   Partner, adapter/provider/model, raw issue, raw document, raw work-product,
   setup-payload, MCP, or approval-route language.
6. Public, send, deploy, spend, or reputation-sensitive actions stay
   approval-gated.
7. No new dependencies without an explicit product/engineering reason and a
   written rejection of existing local alternatives.

## Reuse Map

### Output Review And Regeneration

Use for `DM-001`.

- Lindy direct interaction references:
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/thoughts/ActionCardContent.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`
- Polsia choreography references:
  - `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
  - `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/15-PERSONAL-BRAND-FORK-SPEC.md`
- Naive/Paperclip substrate:
  - issues, comments, documents, work products, approvals, cost events, and
    company-scoped routes from the inherited repo.

DearMe implementation should not import Lindy UI wholesale. Reuse the action
card pattern: compact stateful action controls, optional notes, queued/complete
states, and customer-native labels.

### Team Work Stream

Use for `DM-002`.

- Lindy direct interaction references:
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/Transcript.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/BlockResponses.tsx`
  - `/Users/peter/lindy-extraction/02_mongodb_schemas/Block.ts`
  - `/Users/peter/lindy-extraction/07_architecture/transcriptV2-source.md`
- Polsia choreography references:
  - live thinking stream, mood/status feed, work-happened-while-away loop, and
    progress-to-report rhythm from Polsia onboarding and personal-brand docs.
- Naive/Paperclip substrate:
  - activity logs, runs, issue updates, comments, routine wakeups, and company
    scoped projections.

DearMe implementation should present visible brand-team work, not raw task logs.

### Voice And Memory

Use for `DM-003`.

- Lindy direct interaction references:
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/components/KnowledgeBaseEditor.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/hooks/useManageEntries.ts`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/hooks/useUploadNewEntry.ts`
  - `/Users/peter/lindy-extraction/02_mongodb_schemas/KnowledgeBaseDataSource.ts`
- Polsia choreography references:
  - fast onboarding input, voice/profile draft, starter posts, proof cards, and
    weekly report loop.
- Naive/Paperclip substrate:
  - company documents, comments, issue context, routines, and any existing
    memory/read-model primitives.

DearMe implementation should make Voice Gate part of output review, not a
generic settings panel.

### Reliability, Cost, And Worker Discipline

Use for later execution-hardening tickets.

- Lindy references:
  - `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`
  - `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`
- Naive/Paperclip substrate:
  - budgets, cost events, agent assignments, issue checkout semantics, routines,
    adapter runtime boundaries, and execution workspaces.

DearMe should expose trust, progress, and safe decisions. It should not expose
model routing, provider selection, adapter internals, or raw worker mechanics to
paid-beta users.

## Execution Queue

### A0: DM-005A Integration Baseline

Run first in the current state.

Goal: turn the existing mixed DearMe integration tree into a recoverable base
that isolated workers can use. This is architecture work because it selects the
source of truth for all future implementation.

Output: a tracked baseline branch or PR-ready grouping containing the DearMe
source-of-truth docs and product spine needed by `DM-001` through `DM-003`.

### A1: DM-001 Output Review And Regeneration

Start only after A0 produces a safe base. Implement the review/regeneration loop
inside `/dearme` using the existing DearMe output handoff and Paperclip
substrate.

### A2: DM-002 Team Work Stream

Turn the static work-stream projection into credible DearMe-native work events.

### A3: DM-003 Voice And Memory

Add source ingestion and management for voice samples, links, examples, uploads,
and memory signals.

### A4: DM-004 Product-Copy Leakage Cleanup

Patrol paid-beta surfaces for inherited substrate terminology and replace it
with DearMe-native language.

## Immediate Action

Use `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md` as the
next worker brief. `DM-001` remains valid, but it is blocked on a selected
DearMe baseline.
