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

Status: integrated at `484fe995`.

Patrol paid-beta surfaces for inherited substrate terminology and replace it
with DearMe-native language.

### A5: DM-005 Voice & Memory Source Management

Status: integrated at `77e7d403`.

Let paid-beta users add and manage private voice samples, proof sources,
approval boundaries, and source freshness from `/dearme` without exposing
document, issue, or control-plane mechanics. Start from the latest verified
DM-004 branch and reuse Lindy knowledge-base management patterns, Polsia
voice/proof intake, and the existing Naive/Paperclip document substrate.

### A6: DM-006 Output Detail Review Workspace

Status: integrated at `44b7bfd6`.

Make output review feel like a DearMe decision desk: richer review context,
clearer details, editable decision notes, and product-native next actions
without exposing raw document, issue, approval route, provider, adapter, or
runtime mechanics. Start from the latest verified DM-005 branch and reuse Lindy
action-card/transcript patterns, Polsia decision choreography, and the existing
Naive/Paperclip output-review substrate.

Completed the first review-workspace slice by adding a shared `reviewContext`
contract to every output, deriving draft preview, Voice Gate, Voice & Memory
context, approval boundary, and review prompt from the existing output handoff,
and rendering that context in the focused `/dearme` output panel without
exposing hidden issue/document/work-product/provider/model mechanics.

### A7: DM-007 Review Outcome Memory Feedback Loop

Status: integrated at `3d419f55`.

Close the loop after the customer reviews prepared work. Approval, needs
changes, regenerate, and not useful decisions should feed summarized judgement
back into Voice & Memory and the team work stream so the next private draft
learns from the customer's call.

Reuse Lindy transcript/action-result patterns for compact decision summaries,
Polsia voice/proof iteration framing for what the team learns from review, and
the existing Naive/Paperclip issue comments, activity log, and output review
wakeups for persistence. The customer should see learning and momentum, not
issue comments, approval routes, provider/model routing, raw document ids, or
worker mechanics.

Completed by replaying `d1bf8431` onto the verified DM-006 baseline
`44b7bfd6` as `3d419f55`. Review outcomes now feed the Workbench work stream
and Voice & Memory through sanitized DearMe decision comments, reusing existing
issue comments and read models without adding a new route, table, migration, or
dependency.

### A8: DM-008 Feedback-Aware Regeneration Brief

Status: integrated at `b58827c2`.

Use the now-integrated review feedback memory to prepare better regeneration
and revision briefs. When the customer asks for changes or regeneration, the
next draft should carry the user's last decision, relevant Voice & Memory
signals, and a clear DearMe-owned brief for what to fix.

Reuse Lindy action-result/retry patterns for compact feedback application,
Polsia's visible iteration loop for showing that the team learned from the
customer's call, and the existing Naive/Paperclip issue-comment and output
handoff substrate for persistence. Start from `3d419f55`, not from the dirty
`/Users/peter/dearme` checkout.

Completed by replaying `9b1d1f3f` onto the verified DM-007 baseline
`3d419f55` as `b58827c2`. Review feedback now becomes a sanitized DearMe
regeneration brief for the next private assignment. The slice reuses existing
DearMe decision comments, issue documents, prepared work summaries, and
heartbeat assignment markdown; it adds no route, table, migration, UI surface,
or dependency.

### A9: DM-009 Applied Feedback Review Trace

Status: integrated at `52190ed3`.

Show the customer that their last review decision was actually applied. After a
regenerated or revised draft returns to review, the DearMe decision desk should
make the feedback loop legible: what the user asked for, what changed, and
where the next draft still needs their judgement.

Reuse Lindy action-card/result grammar for "feedback applied" traces, Polsia's
visible iteration loop for momentum, and the existing Naive/Paperclip
review-output substrate for persistence. Start from `b58827c2`, not from the
dirty `/Users/peter/dearme` checkout.

Completed by replaying `aeac3696` onto the verified DM-008 baseline
`b58827c2` as `52190ed3`. The DearMe decision desk now shows a customer-safe
`Feedback applied` trace after refreshed private work lands, derived from
existing review feedback, fresh private documents, and latest team updates. The
slice reuses the existing output handoff and review-comment substrate; it adds
no table, migration, route, workflow, or dependency.

### A10: DM-010 Approval-Ready Handoff

Status: completed in `/tmp/dearme-dm-010-integrate` at `73224495`.

DM-010 was normalized from dirty handoff work into committed worker patch
`47b2c581`, then replayed onto the verified DM-009 integration baseline
`52190ed3` as `73224495`.

Completed behavior: when a customer marks private DearMe output as useful,
DearMe now creates an idempotent next-move approval for the downstream action.
The Workbench projects that pending approval as the focused final decision,
suppresses the duplicate private-output review decision while the final
approval is pending, and labels the UI as `Ready for final approval`.

This preserves the trust boundary: useful private work is not permission to
publish, send, deploy, or spend. The slice reuses existing approvals,
issue-approval links, output handoff review state, Work Ready projection,
batch grouping, and approval payload rendering; it adds no new table,
migration, route family, workflow, dependency, or real external execution.

### A11: DM-011 Approved Next Move Execution Receipt

Status: completed in `/tmp/dearme-dm-011-integrate` at `b04a2c1d`.

After a customer gives final approval on a DearMe next move, DearMe should show
a trustworthy execution receipt or next private handoff in the customer
workbench. The receipt should make clear what was approved, what action is now
allowed, whether anything external actually happened, and what DearMe will do
next.

Reuse the existing approval service, activity log, issue comments, and
Workbench stream before adding any new persistence. Do not implement real
channel publishing, email sending, deployment, or spend automation until the
corresponding execution adapter has a separately reviewed trust boundary.

Completed by replaying `3194402b` onto the verified DM-010 baseline
`73224495` as `b04a2c1d`. Final DearMe next-move approvals now create a
customer-safe receipt in the existing approval/activity/issue-comment surfaces,
project that receipt into the Workbench as `next_move_approved`, and suppress
duplicate private-output review decisions after final approval. The receipt
explicitly says external execution is `not_run_yet`; this slice still runs no
real publish, send, deploy, or spend action.

### A12: DM-012 Private Execution Handoff

Status: completed in `/tmp/dearme-dm-012-integrate` at `b6bfffb4`.

After the final approval receipt is visible, DearMe should prepare the
channel-, deployment-, or spend-specific private execution handoff without
running the external action. The handoff should turn the approved next move
into a draft, preflight, checklist, or execution packet that the product can
review and display while keeping the real external write boundary separately
gated.

Reuse existing approvals, activity logs, issue comments, workbench projection,
and DearMe output/decision surfaces before adding any new persistence. Do not
run real social posting, email sending, portfolio deployment, or spend
automation in this slice.

Completed by replaying `17f75810` onto the verified DM-011 baseline
`b04a2c1d` as `b6bfffb4`. Final approval receipts now also prepare a private
execution handoff through the existing activity log, issue comments, and
Workbench stream. The handoff is visible as `execution_handoff_prepared`, is
not another customer approval, and still runs no external publish, send,
deploy, or spend action. The slice adds no route, table, migration, connector,
or dependency.

### A13: DM-013 Handoff Brief Surface

Status: completed in `/tmp/dearme-dm-013-integrate` at `39480533`.

Make the private execution handoff easier to review from the DearMe product
surface. The customer should see a concise handoff brief: what is ready, what
channel or surface it targets, why it is safe to keep private, and what remains
outside this slice. It should feel like a team handoff, not an internal issue,
approval route, worker packet, or provider execution log.

Start from `b6bfffb4`, inspect
`/private/tmp/dearme-dm-013-handoff-brief-surface`, and reuse the already
integrated Workbench, approval receipt, issue-comment, and decision-desk
surfaces before adding any new model or UI structure.

Completed by replaying `2673975d` onto the verified DM-012 baseline
`b6bfffb4` as `39480533`. The Workbench contract can now mark a private
execution handoff as `private_handoff_ready` with a customer-safe next step, and
the DearMe UI shows a compact handoff panel with title, summary, artifact,
next step, `External action not run`, and a link into the existing DearMe
decision/brief view. The slice reuses the DM-012 activity and Workbench
projection; it adds no route, table, migration, connector, dependency, or real
external execution.

### A14: DM-014 Mobile Nav Safe Area

Status: completed in `/tmp/dearme-dm-014-integrate` at `75458d80`.

Fix the known mobile visual polish risk where the bottom nav can cross through
content in full-page mobile captures. The DearMe paid-beta shell should keep
the bottom navigation usable without covering workbench decisions, handoff
briefs, or approval cards.

Start from `39480533`, inspect
`/private/tmp/dearme-dm-014-mobile-nav-safe-area`, and keep the patch scoped to
customer-shell layout and tests unless the worker diff proves a broader
dependency. Preserve the product rule: web-focused, team visible, machinery
hidden.

Completed by replaying `65d7a599` onto the verified DM-013 baseline
`39480533` as `75458d80`. DearMe mobile routes now hide the inherited fixed
mobile bottom navigation and use a smaller bottom safe-area reserve, while
standard company mobile routes keep the existing nav. The slice also adds a
customer-safe fallback for stale prepared outputs that lack `reviewContext`, so
older private work still opens as reviewable DearMe work. No backend route,
table, migration, connector, dependency, or external action was added.

### A15: DM-015 First Week Output Details

Status: completed in `/tmp/dearme-dm-015-integrate` at `5a09b4d3`.

Make the first-week DearMe output cards more useful and reviewable without
turning the web product into an operator console. The customer should see
specific content, opportunity, portfolio, and report details that help them
decide what to approve next.

Start from `75458d80`, inspect
`/private/tmp/dearme-dm-015-first-week-output-details`, and keep the patch
inside the existing output-detail contract and Work Ready cards unless the
worker diff proves a broader dependency.

Completed by replaying `f9267e58` onto the verified DM-014 baseline
`75458d80` as `5a09b4d3`. First-week Work Ready cards and the focused output
review now share a DearMe-specific detail priority order, making content,
opportunity, portfolio, and weekly report outputs scannable before approval.
The slice reuses the existing output detail schema and DearMe UI surface; it
adds no route, table, migration, dependency, connector, external execution, or
automation path.

### A16: DM-016 Voice & Memory Reference Links

Status: completed in `/tmp/dearme-dm-016-integrate` at `16fa8fb8`.

Let a paid-beta user attach a private source reference link to Voice & Memory
entries without turning DearMe into a scraper, uploader, or public publishing
system. The link should help trace where a voice sample, proof note, or memory
came from while staying private and non-fetching.

Start from `5a09b4d3`, inspect
`/private/tmp/dearme-dm-016-voice-memory-reference-links`, and keep the patch
inside shared validators, the existing DearMe voice-memory service, API tests,
and `/dearme` UI unless the worker diff proves a broader dependency. Do not add
a migration, dependency, background worker, upload path, external fetch, or
public action.

Completed by replaying `ae4fef73` onto the verified DM-015 baseline
`5a09b4d3` as `16fa8fb8`. Voice & Memory sources now accept an optional private
HTTP(S) reference link through the existing shared contract, document-backed
voice-memory service, API client, and `/dearme` form/card surface. The link is
stored as provenance, projected privately, and filtered out of the source
summary text. The slice adds no migration, table, dependency, background
worker, uploader, scraper, external fetch, connector, public publishing path,
or external action.

### A17: DM-017 Voice & Memory Source Editing

Status: completed in `/tmp/dearme-dm-017-integrate` at `feaaa66a`.

`/private/tmp/dearme-dm-017-voice-memory-source-editing` pointed at the same
source commit as DM-016 (`ae4fef73`) but carried a 12-file dirty implementation
diff. That dirty diff was applied onto the verified DM-016 baseline `16fa8fb8`
and committed as `feaaa66a`.

Completed behavior: paid-beta users can revise editable managed private Voice &
Memory sources from `/dearme`. The slice reuses the existing shared DearMe
contract, company-scoped API, document-backed Voice & Memory storage, and
source form/card UI. Source edits create a new document revision and activity
entry, then return the refreshed private source list. It adds no migration,
table, dependency, upload path, scraper, external fetch, connector, public
publishing path, or external action.

Follow-up hardening in the same integration branch:

- `20290812 Apply DearMe Brand OS approvals through the gate`.
- Fixes the Brand OS apply approval path so approval decisions invoke the
  existing DearMe apply service instead of only marking the approval approved.
- Tightens generated first-operation briefs around attached weekly report
  documents and customer-work boundaries.
- Verification passed: focused vitest, server typecheck, full `pnpm test:run`,
  diff hygiene, conflict-marker scan, and dependency diff check.

### A18: DM-018 Voice & Memory Source Archive

Status: completed in `/tmp/dearme-dm-018-integrate` at `94c3b4c6`.

`/private/tmp/dearme-dm-018-voice-memory-source-archive` carried a 12-file
dirty implementation/test diff on source head `c151fe69`. That dirty diff was
applied onto the hardened DM-017 baseline `20290812` and committed as
`94c3b4c6`.

Completed behavior: paid-beta users can archive editable managed private Voice
& Memory sources from `/dearme`. Archiving writes a hidden document revision
with `Status: archived`, filters the source out of active Voice & Memory
projection, counts, and cards, and returns only `archivedSourceId` plus
refreshed Voice & Memory to the customer API path. The slice reuses the
existing shared DearMe contract, company-scoped API, document-backed Voice &
Memory storage, UI API client, and source card UI. It adds no migration, table,
dependency, uploader, scraper, external fetch, connector, public publishing
path, or external action.

Verification passed: focused shared/UI/server vitest, shared/server/UI
typechecks, full `pnpm test:run`, diff hygiene, conflict-marker scan, and
dependency diff check.

Follow-up: archive confirmation originally used browser `confirm()`. DM-019
replaced it with a DearMe-native confirmation dialog.

### A19: DM-019 Archive Confirmation Dialog

Status: completed in `/tmp/dearme-dm-019-archive-confirm-dialog` at
`98fa9796c3e8`.

Completed behavior: the Voice & Memory source archive flow no longer uses the
browser confirmation dialog. It now opens a DearMe-native `Archive private
source?` dialog, explains that DearMe stops using the source while retaining it
in private history, lets the user keep the source, and runs the existing
document-backed archive mutation only after `Archive source`.

Reuse decision: this slice reused the existing `/dearme` page, the existing
document-backed archive mutation from DM-018, the existing UI API path, and the
shared Radix dialog primitives already present in the web app. It added no
backend change, migration, table, dependency, connector, external action,
publishing path, sending path, deployment path, or spend path.

Verification passed: focused DearMe page vitest, UI typecheck, UI build, diff
hygiene, `window.confirm` scan on touched files, and browser/API verification
against `http://127.0.0.1:3101/DEAAAAAAA/dearme`.

## Immediate Action

Use `98fa9796c3e8` as the current clean candidate baseline. The next small
product slice should be either:

- remaining product-copy leakage cleanup; or
- a stronger Work Ready / Decisions Needed cockpit; or
- deeper Voice Profile scoring and review.
