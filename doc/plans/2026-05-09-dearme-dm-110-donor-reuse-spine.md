# DM-110 Donor Reuse Spine

Date: 2026-05-09
Branch: `codex/dearme-dm-110-donor-reuse-spine`
Status: architecture integration complete
Type: docs / coordination

## Objective

Make the next DearMe implementation lane reuse Polsia, Naive/Paperclip, and the
internal assistant baseline more deliberately.

This is not a new product direction. It is an integration checkpoint after
DM-106 through DM-109:

- DearMe already has review-loop state, review feedback handoff, cycle-aware
  progress, and actionable feed items.
- The next slice should stop adding inline UI behavior inside
  `DearMeOnboarding` and extract a reusable DearMe action-card spine.
- The implementation should keep using Naive/Paperclip execution truth and
  translate it into DearMe customer language.

## Donor Evidence

### Polsia

Use for product choreography:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/03-MARKETING-STRATEGY.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/15-PERSONAL-BRAND-FORK-SPEC.md`

Reuse decision:

- Keep the visible team motion, growth-cycle cadence, progress stream, and
  "work happened while I was away" proof loop.
- Do not copy the company-factory UI, public personal-data feed, MCP/control
  plane language, or Polsia visual style.

### Naive / Paperclip

Use for execution substrate:

- `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`
- `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`
- `/Users/peter/naive-research-2026-05-05/PAPERCLIP-API-INDEX.md`
- `/Users/peter/naive-research-2026-05-05/session-fetches/extracted-setup_payload.json`

Reuse decision:

- Keep issues, routines, approvals, documents, work products, activity records,
  finance/cost records, and company tenancy as the execution source of truth.
- Keep `brand_blueprint` as DearMe's typed replacement for `setup_payload`.
- Next substrate gap: project routine telemetry and cost lineage into
  customer-safe progress cards only where it improves trust.

### Internal assistant baseline

Use for direct web interaction patterns:

- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/PausedOnActionNeededComponents.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/hooks/useRetryFailedConversation.ts`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/hooks/useRetryConversationFromExecution.ts`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/memories/KnowledgeBaseModal.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/memories/KnowledgeBaseTile.tsx`

Reuse decision:

- Copy the interaction grammar: action cards, action-needed states, retry,
  continue, knowledge sources, and transcript/block separation.
- Do not port the app shell, Relay/GraphQL stack, no-code editor, marketplace,
  donor copy, logos, or visual brand.

## Current DearMe Evidence

Existing implementation already to reuse:

- `packages/shared/src/validators/dearme.ts`
- `server/src/routes/dearme.ts`
- `server/src/services/dearme-workbench.ts`
- `server/src/services/dearme-output-handoff.ts`
- `server/src/services/dearme-memory-context.ts`
- `server/src/services/dearme-brand-blueprint-apply.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/components/ApprovalCard.tsx`
- `ui/src/components/IssueThreadInteractionCard.tsx`
- `ui/src/lib/runRetryState.ts`
- `ui/src/components/transcript/useLiveRunTranscripts.ts`

## Next Worker Ticket

```text
DM-111 DearMe ActionCard Primitive
```

### Goal

Create one reusable DearMe action-card component and replace the first inline
feed/review rendering path with it.

### Suggested write scope

- `ui/src/components/dearme/DearMeActionCard.tsx` (new)
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `packages/shared/src/validators/dearme.ts` only if current state fields are
  insufficient
- `server/src/services/dearme-workbench.ts` only if action state needs a missing
  projection field

### Acceptance Criteria

- Live feed cards, action-needed cards, review-ready cards, private-work cards,
  retry/continue-ready cards, and report-ready cards share one DearMe-owned
  action-card primitive.
- Buttons still route to the existing DearMe review surfaces introduced by
  DM-109.
- Customer-facing UI does not expose Paperclip, OpenClaw, adapter, provider,
  setup payload, raw issue, or runtime language.
- No new runtime, table, dependency, or workflow editor is introduced.
- The component can later be reused for Voice & Memory source cards and Work
  Ready decision cards.

### Verification

Run at minimum:

```bash
pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1
pnpm -r typecheck
git diff --check
rg -n "Paperclip|OpenClaw|adapter|provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme packages/shared/src/validators/dearme.ts server/src/services/dearme-workbench.ts
```

## Stop Rules

- Stop if `DearMeOnboarding.tsx` has diverged enough that extracting a shared
  component would become a broad redesign.
- Stop if the worker needs to introduce a new database table or runtime queue;
  that belongs in a separate architecture ticket.
- Stop if donor code import would carry unrenamed visual assets, product names,
  or app-shell assumptions.

## Handoff

This ticket is safe for a Symphony-style isolated worker after this branch is
merged. The worker should treat this file plus
`docs/dearme/INTEGRATED-ARCHITECTURE.md` and
`docs/dearme/LINDY-ASSISTANT-REUSE-PLAN.md` as the source of truth.
