# DearMe DM-020 Work Ready Cockpit Ticket

Date: 2026-05-08
Owner: Codex implementation loop
Status: implemented on `codex/dearme-baseline-2026-05-08`

## Current Truth

The shared checkout at `/Users/peter/dearme` is now the implementation base for
DM-020.

- Branch: `codex/dearme-baseline-2026-05-08`
- Implementation base: `9e0a93ba61b6e8d63129bdbf472db815263131cd`
- Shared checkout state before DM-020: clean except for the DM-020 files changed
  in this slice
- Implementation path: `/Users/peter/dearme`

The earlier disposable-worktree bootstrap guidance is superseded by the clean
shared checkout state recorded above.

## Product Decision

DM-020 should make the first DearMe product screen feel like a premium personal
brand growth team has prepared useful work and is waiting for the customer's
high-leverage decisions.

This is the next highest-value product slice because DearMe already has a
working spine for Brand OS, Voice and Memory, prepared outputs, review feedback,
approval handoff, source references, editing, and archive confirmation. The
remaining weakness is hierarchy and product theater: the user should not have
to understand the control plane to feel that a team worked for them.

The rule is:

> Work ready first, decisions second, machinery never.

## Reuse Formula

DearMe should not wait for a complete proprietary Naive front-end drop.

Use the donors this way:

- Polsia: product choreography, fast motion, visible work rhythm, daily/weekly
  report ceremony, and the feeling that work happened while the user was away
- Naive/Paperclip: hidden runtime substrate, auth/company scope, issues,
  approvals, documents, work products, activity, cost events, routes, services,
  and tests
- Lindy: decision card behavior, transcript/work-stream layout, composer
  ergonomics, knowledge-base intake, modal/drawer polish, and assistant UI
  pacing
- Littlebird: web shell, progressive onboarding, task queue/list anatomy,
  assistant message list, and simple trust-heavy account/product surfaces
- DearMe: Brand OS, Voice Gate, Voice and Memory, Work Ready, Decisions Needed,
  portfolio/proof/opportunity language, weekly Dear me report, and customer
  safety vocabulary

## Donor Evidence

### Polsia

Use as product choreography reference:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/03-MARKETING-STRATEGY.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/07-BUSINESS-CENTRIC-ARCHITECTURE.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/15-PERSONAL-BRAND-FORK-SPEC.md`

Adapt:

- first-minute momentum
- role-based team activity
- live work feed
- daily/weekly report rhythm
- public-proof feeling without exposing private data

Avoid:

- Polsia visual style
- company-factory framing
- public raw live feed for private personal-brand work
- raw MCP/control-plane language
- "AI runs everything" promises that would damage trust for personal identity

### Naive / Paperclip

Use as hidden substrate reference:

- `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`
- `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`
- `/Users/peter/naive-research-2026-05-05/paperclipai/paperclip`
- `/Users/peter/dearme/server/src/routes/dearme.ts`
- `/Users/peter/dearme/server/src/services/dearme-workbench.ts`
- `/Users/peter/dearme/server/src/services/dearme-output-handoff.ts`
- `/Users/peter/dearme/server/src/services/dearme-approval-receipts.ts`
- `/Users/peter/dearme/packages/shared/src/validators/dearme.ts`
- `/Users/peter/dearme/ui/src/api/dearme.ts`

Adapt:

- workbench read models
- output handoff state
- review decisions
- approval receipt state
- source references
- company-scoped route and test patterns

Avoid:

- direct customer exposure of issues, approvals, documents, adapters,
  providers, model routing, setup payloads, or raw runtime logs
- waiting for unverified private Naive UI code before improving DearMe

### Lindy

Use as premium interaction reference:

- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/dataLayer/Transcript.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcriptV2/displayLayer/TranscriptWrapper.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptStarters.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/KbModal.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`
- `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`

Adapt:

- action cards with visible status, risk, primary action, secondary action, and
  optional note
- transcript/work-stream container that respects scroll position
- prompt/composer ergonomics for later Chief of Staff input
- knowledge source intake behavior for Voice and Memory
- right-side inspector/drawer for decision detail

Avoid:

- direct imports from Lindy packages
- Relay/GraphQL/generated API coupling
- Lindy template marketplace IA
- Lindy product language

### Littlebird

Use as web-shell and simple-product reference:

- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/onboarding-v2/onboarding.tsx`
- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/onboarding-v2/onboarding-step.tsx`
- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/todos/todos.tsx`
- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/components/blocks/Message/MessageList/MessageList.tsx`
- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/hummingbird/hummingbird-chat.tsx`
- `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/subscription/subscription.tsx`

Adapt:

- progressive reveal
- work queue/list anatomy
- assistant message list rhythm
- simple account/product state surfaces

Avoid:

- Electron/runtime assumptions
- raw Littlebird product copy
- unrelated subscription mechanics

## Scope

DM-020 is a web-first product shell slice.

Preferred write scope:

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `ui/src/components/DearMeShell.tsx`
- `ui/src/components/DearMeShell.test.tsx`

Optional only if needed:

- `ui/src/lib/dearme-ui-adapters.ts`
- `ui/src/lib/dearme-ui-adapters.test.ts`

Do not change server, shared validators, database, migrations, billing,
approval services, adapter runtime, or provider configuration unless the worker
first proves the UI slice is impossible without that change. If the backend
shape is insufficient, stop and propose a follow-up `DM-020A` backend projection
ticket instead of expanding scope silently.

## Required UX Outcome

The first `/dearme` screen should prioritize:

1. Work ready: the best prepared outputs and proof/opportunity assets the team
   has already produced
2. Decisions needed: what the customer can approve, edit, reject, or ask to
   regenerate
3. Team work stream: role-based visible work, written in customer-safe language
4. Voice and Memory snapshot: what the team is using to protect the user's
   voice and proof
5. Weekly Dear me strip: what changed, what is next, and what is learning

The user should understand in ten seconds:

- a team worked while I was away
- useful work is ready
- the system knows my voice and sources
- I only need to make a few decisions
- nothing public happens without my approval

## Component Direction

Prefer DearMe-owned components that adapt donor behavior:

- `DearMeWorkReadyCard`
- `DearMeDecisionCard`
- `DearMeDecisionInspector`
- `DearMeTeamFeed`
- `DearMeVoiceMemorySnapshot`
- `DearMeWeeklyLetterStrip`

Exact names can change if local naming patterns suggest better names, but the
result should reduce the monolithic page pressure in `DearMeOnboarding.tsx`.

Use existing `DearMeShell` primitives where possible:

- `DearMePageShell`
- `DearMeHero`
- `DearMePanel`
- `DearMeWorkbenchSectionHeader`
- `DearMeCockpitGrid`
- `DearMeMetricStrip`
- `DearMeFocusSurface`
- `DearMeEvidenceGrid`
- `DearMeWorkbenchCard`

Add new shell primitives only when existing ones cannot express the hierarchy.

## Interaction Requirements

Decision cards should expose product-native state:

- prepared
- waiting for approval
- needs changes
- regenerating
- approved
- archived
- blocked

Each decision card should show:

- role responsible
- artifact type
- why it matters
- Voice Gate or source confidence when available
- primary action
- secondary actions
- last customer note or learning when available

Team feed entries should show:

- team role
- current action
- artifact being prepared
- status
- whether a customer decision is needed

Do not display:

- Paperclip
- OpenClaw
- OK Partner
- setup payload
- raw issue ids as primary labels
- raw approval route names
- adapter/provider/model names
- MCP/plugin/runtime internals

## Implementation Guidance

1. Start by reading current `/dearme` UI state in the worker worktree:

   ```sh
   sed -n '1,260p' ui/src/pages/DearMeOnboarding.tsx
   sed -n '1,260p' ui/src/components/DearMeShell.tsx
   sed -n '1,220p' ui/src/pages/DearMeOnboarding.test.tsx
   ```

2. Identify the current `Work Ready`, `Decisions needed`, `workStream`,
   `focusedDecision`, `VoiceMemoryPanel`, and `VoiceGatePanel` sections.

3. Extract component boundaries before changing copy or behavior.

4. Reorder the page hierarchy toward Work Ready and Decisions Needed. Do not
   delete existing route/focus logic if it is already working.

5. Adapt Lindy `ActionCard` behavior into DearMe cards, but keep all code local
   and product-native. Do not add a Lindy dependency.

6. Adapt Lindy `TranscriptWrapper` scroll behavior only if the current work
   stream is long enough to need it. Otherwise leave auto-scroll for a later
   slice.

7. Adapt Littlebird todo/work-queue anatomy for compact decision rows and
   mobile-safe scanning.

8. Keep the API shape unchanged unless impossible.

9. Update tests to assert product behavior rather than internal implementation
   details.

## Acceptance Criteria

DM-020 is complete when all are true:

- `/dearme` first screen reads as a premium personal brand growth-team cockpit,
  not an admin console
- Work Ready and Decisions Needed are the dominant visible surfaces
- decision cards support approve/edit/reject/regenerate-oriented language
- team feed entries are role-based and outcome-oriented
- Voice and Memory appears as trust context, not settings debt
- weekly Dear me report is visible as a ritual, not buried metadata
- no customer-facing UI leaks substrate terms
- mobile layout keeps bottom navigation from covering review work
- the slice reuses existing API/read-model data instead of adding backend scope
  without proof

## Implementation Update

DM-020 was implemented by reshaping the existing DearMe workbench read model in
`ui/src/pages/DearMeOnboarding.tsx` without changing server, shared validators,
database, migrations, billing, approval services, adapter runtime, or provider
configuration.

Completed behavior:

- Work Ready now leads the cockpit and opens the focused DearMe decision route
  with both the target issue and prepared output.
- Decisions Needed follows as the second dominant surface with approve, request
  changes, reject, and regenerate-oriented language.
- Weekly Dear me and Voice and Memory moved into trust/ritual context after the
  primary action surfaces.
- Team activity and live feed remain visible, role-based, and customer-safe.
- The previous "My AI team today" framing was replaced with "Your brand team
  today" to keep the product language personal-brand native.
- Tests assert the new page order, route handoff, and customer-facing language.

Verification evidence:

- `pnpm exec vitest ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx --run`
- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm --filter @paperclipai/ui build`
- `git diff --check`
- DearMe UI copy leak scan for substrate terms returned no matches.
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` passed at
  desktop and mobile widths: required cockpit labels were present, the Work
  Ready -> Decisions -> Weekly Dear me -> Voice/Memory order held, and no
  substrate terms appeared.

## Verification Commands

Run from `/Users/peter/dearme`.

Install if needed:

```sh
pnpm install --frozen-lockfile --offline
```

Focused tests:

```sh
pnpm exec vitest ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx --run
```

Typecheck/build:

```sh
pnpm --filter @paperclipai/ui typecheck
pnpm --filter @paperclipai/ui build
```

Copy leak scan:

```sh
rg -n "Paperclip|OpenClaw|OK Partner|setup_payload|setup payload|MCP|adapter|provider|model provider|raw issue|raw approval" ui/src/pages/DearMeOnboarding.tsx ui/src/components/DearMeShell.tsx
```

Whitespace:

```sh
git diff --check
```

Browser verification:

- Start the app on an available local port.
- Open `/DEAAAAAAA/dearme`.
- Verify desktop and mobile widths.
- Confirm the first screen shows Work Ready, Decisions Needed, team feed, Voice
  and Memory context, and weekly Dear me report without hidden substrate
  language.

## Stop Rules

Stop and report instead of forcing through if:

- `98fa9796c3e879cd89ad74d48c193cd4b035dd94` is not reachable locally
- the worker discovers that `/private/tmp/dearme-dm-019-source-grounded-drafts`
  contains overlapping product work that should be integrated before DM-020
- the UI slice requires server/shared/database changes beyond the optional
  scope
- donor code requires importing Lindy or Littlebird packages instead of
  adapting local behavior
- the change starts to become a broad redesign of all DearMe UI instead of the
  Work Ready cockpit slice

## Required Handoff Packet

At completion, the worker must report:

- worktree path
- branch
- commit hash
- changed files
- donor patterns reused or intentionally rejected
- tests and builds run
- browser verification evidence
- copy leak scan result
- remaining risks
- exact next recommended slice

## Recommended Next Slice After DM-020

If DM-020 lands cleanly, the next slice should be one of:

1. Chief of Staff composer using Lindy prompt ergonomics
2. deeper Voice Profile scoring and Voice Gate review
3. source-grounded draft provenance, if the existing DM-019 source-grounded
   branch is clean and non-overlapping
