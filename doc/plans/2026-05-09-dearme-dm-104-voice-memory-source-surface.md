# DM-104: Voice & Memory Source Surface

## Intent

Make Voice & Memory accept real source material in the DearMe workbench without
turning the product into a settings page.

## Architecture Boundary

- Polsia reuse: keep the surface choreographed as a personal growth team learning
  from the user.
- Naive/Paperclip reuse: keep the existing DearMe memory update contract,
  activity log storage, routine refresh, and workbench projection.
- Lindy reuse: use compact knowledge/source entry prompts instead of asking the
  user to configure a system.

Local evidence checked:

- `/Users/peter/lindy-extraction/13_intelligence_summary/lindy-intelligence-memory.md`
  describes Lindy's production pattern: web-only product, editable/prunable
  memory, workflow actions, and human-in-the-loop interruptions.
- `/Users/peter/lindy-extraction/04_graphql/summary.md` and
  `/Users/peter/lindy-extraction/04_graphql/all-127-operations.graphql` expose
  `FormBuilderKnowledgeBase`, `SetupDataSourceKb`, state-graph test runs, and
  authorization-needed interrupts. DearMe reused the source-entry and
  approval-gate shape, not Lindy's agent/workflow-builder UI.

## Behavior Added

- Voice & Memory now has a `Source guide` with seven entry paths:
  - writing sample
  - proof point
  - source link
  - correction
  - forbidden phrase
  - audience note
  - offer note
- Guide selection sets the existing memory kind and rewrites the form
  placeholders so the user can add source material quickly.
- Untitled submissions use the guide label as the memory title, avoiding
  "Untitled memory" for guided source entries.
- Link inputs remain private provenance labels in the existing `sourceLabel`
  field. This slice does not fetch, scrape, upload, publish, or execute links.

## Verification

Completed:

```sh
pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1
pnpm --filter @paperclipai/ui typecheck
git diff --check
```

Result: all passed on 2026-05-09.

Playwright fallback smoke also passed on
`http://127.0.0.1:3100/DEAA/dearme`:

- desktop `1440x1100`
- mobile `390x844`
- all seven source-guide paths rendered
- forbidden-phrase selection mapped to the existing `constraint` memory type
- no horizontal overflow
- no console errors or page errors
- no visible Paperclip/OpenClaw/provider/adapter/setup-payload language

## Next Ticket

DM-105: Polsia-style cycle controls over the existing workbench: start next
cycle, pause private work, focus the week, approve a batch, request changes, and
regenerate privately.
