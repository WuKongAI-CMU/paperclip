# DearMe Build State

Date: 2026-05-07

## Reuse-First Architecture Refresh - 2026-05-07

Docs-only integration pass:

- Spawned read-only subagents for Polsia, Naive/Paperclip, Lindy, and current
  DearMe repo state so the architecture update was grounded in local evidence
  instead of preference.
- Confirmed the reuse split:
  - Polsia is product choreography: fast onboarding, visible AI-team momentum,
    cycle/report ritual, proof loop, and "work happened while I was away"
    packaging.
  - Naive/Paperclip is the runtime substrate: auth, tenancy, agents, issues,
    routines, approvals, documents/work products, activity, finance events,
    adapters, execution workspaces, and `setup_payload` as the ancestor of
    `brand_blueprint`.
  - Lindy is the strongest direct web-code donor: ActionCard, pending approval,
    transcript/block rendering, realtime channels, route schemas, prompt/input,
    file attachment, and KnowledgeBase patterns can be copied/adapted into
    DearMe terms.
  - DearMe owns Brand OS, Voice & Memory, customer shell, premium visual design,
    output/review semantics, opportunity/portfolio language, and approval-first
    personal reputation safety.
- Updated `INTEGRATED-ARCHITECTURE.md` so the current gap is no longer described
  as "no DearMe shell." The shell exists; the active gaps are output-level
  review/regeneration, a real Team Work Stream, Voice & Memory ingestion,
  product-copy leakage cleanup, and continued projection over Paperclip
  primitives.
- Updated `WORKTREE-INTEGRATION-PLAN.md` with concrete donor paths for the next
  web slices and a rule that each new DearMe slice must identify the donor path
  it reused, adapted, or rejected.
- No implementation files were edited. No tests were run for this pass because
  it only changed docs.

## Current Slice

Worktree integration plan:

- Spawned parallel read-only subagents to inspect the dirty tree, DearMe
  customer shell leaks, Lindy frontend reuse candidates, and current doc
  authority chain.
- Confirmed the checkout is a large mixed delta, not a clean feature branch:
  277 dirty files, including 218 tracked modifications, 59 untracked files, and
  93 changed or added test files.
- Added `WORKTREE-INTEGRATION-PLAN.md` to define preservation policy, risky-file
  verification boundaries, commit/review grouping, stop rules, and the next safe
  implementation slice.
- Locked the next implementation target as DearMe customer web shell isolation:
  hide Paperclip operator navigation and raw issue/approval routes from the
  paid-beta customer shell before adding more agent capability.
- Captured Lindy's reusable web patterns for the next UI slice: transcript/work
  stream grouping, ActionCard state machine, typed forms, and knowledge-base
  management patterns.
- Clarified doc authority so `INTEGRATED-ARCHITECTURE.md` is the current
  architecture lock, `PRODUCT-ARCHITECTURE.md` is the product-surface summary,
  and older V4 docs are historical source material.
- This was docs-only integration work. It did not edit active implementation
  files or run app tests.

Agency Agents reference update:

- Reviewed `https://github.com/msitarzewski/agency-agents.git` at snapshot
  `783f6a72bfd7f3135700ac273c619d92821b419a`.
- Added `AGENCY-AGENTS-REFERENCE.md` as an external OSS role-library reference,
  not a DearMe runtime dependency.
- Captured the product judgment: use the repo to sharpen DearMe role cards,
  deliverable standards, proof gates, and opportunity/content formats; do not
  expose a broad agent catalog or installer surface to paid-beta users.
- Mapped relevant Agency roles to DearMe's small visible team: Chief of Staff,
  Brand Strategist, Voice Editor, Content Producer, Opportunity Scout,
  Portfolio Builder, Growth Analyst, and hidden proof/quality gates.
- Noted that the repo's conversion/install scripts are useful distribution
  examples but should not be run as part of DearMe product integration because
  they write into local tool configuration.
- No product functionality was added in this reference pass.

Integrated architecture update:

- Added `INTEGRATED-ARCHITECTURE.md` as the current cross-donor architecture
  lock for DearMe after reviewing the live DearMe repo, local Naive/Paperclip
  materials, Polsia recon, and the internal assistant baseline under
  `/Users/peter/lindy-extraction`.
- Updated root `AGENTS.md` and `docs/dearme/README.md` so future agents read the
  integrated architecture before older positioning, reuse, and historical
  comparison docs.
- Linked the integrated architecture from
  `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`.
- Locked the merged product formula: DearMe premium web shell + Lindy-style work
  stream/action cards/knowledge UI + Polsia-style visible team momentum +
  Naive/Paperclip runtime substrate + existing DearMe/OK Partner operator
  mechanics.
- Clarified the next architecture priority: isolate a DearMe customer web shell
  that hides Paperclip board/sidebar/admin surfaces before adding more agent
  capability.
- This was a dirty-tree-safe docs integration pass. It did not overwrite active
  implementation files or attempt to clean unrelated in-progress changes.

Consolidation update:

- Updated root `AGENTS.md` so future agents start from DearMe as the product
  shell over the inherited Paperclip operator kernel.
- Made `docs/dearme/README.md` the canonical DearMe entry point with a reading
  order for positioning, packaging, reuse, provenance, and current build state.
- Marked older Polsia comparison and V4 max-reuse architecture language as
  historical/superseded where it conflicted with provenance hygiene or the
  current DearMe product lock.
- Added the same superseded-source-material notice to older V2/V3/V4
  architecture, backlog, Polsia comparison, and Paperclip-evaluation docs so
  future agents do not treat clone/verbatim wording as current instruction.
- Expanded `REBRAND-AND-PROVENANCE.md` so Polsia/Naive/Paperclip/OK
  Partner-informed work follows one precedence rule: adapt product
  choreography and permitted primitives, ship DearMe-original code, prompts,
  assets, and customer-facing copy.
- No product functionality was added in this consolidation pass.

Earlier product implementation state:

Completed DearMe product packaging, paid-beta entitlement, Team Workbench
read-model, 90-second First Cycle, Voice Gate v0, and Work Ready / batch
decisions slices. Added structured output details so generated content,
opportunity, portfolio, and weekly-report work exposes reviewable fields instead
of only generic previews.

Product packaging details:

- Added `PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md` as the current execution
  plan for paid-beta positioning, roadmap, and code architecture.
- Linked `POLSIA-MARKETING-PACKAGING-GUIDE.md` from the DearMe README and
  product architecture docs so the packaging rule is discoverable.
- Locked the product category to `personal brand growth team`, not writing tool,
  CRM, agent dashboard, or generic operating system.
- Captured the product north star: every returning user should feel that their
  team worked while they were away and now only high-leverage decisions remain.
- Captured the interface rule: team visible, machinery hidden.
- Added the 90-second first-session rule: after one positioning question, the
  user should see a Voice Profile draft, starter posts, an opportunity lead, a
  portfolio proof card, and a first growth plan.
- Sharpened the paid-beta beachhead to revenue-driven solo experts before
  broader side-hustler, job-hunter, creator, and career-promoter expansion.
- Mapped the product loop to the live code spine: shared DearMe validators,
  `/dearme` routes, Brand Blueprint preview/apply services, output handoff,
  paid-beta finance-ledger access, UI API helpers, and the Brand OS page.
- Defined P0, P0.5, P1, P1.5, and P2 feature gates with acceptance criteria.
- Recut the next code slices around product packaging: product entitlement gate,
  team workbench read model, 90-second first cycle, voice gate v0, and Work
  Ready / batch decisions.
- Linked the new plan from `docs/dearme/README.md` and
  `docs/dearme/PRODUCT-ARCHITECTURE.md` so future product and architecture work
  starts from the same artifact.

Paid-beta entitlement details:

- Added a shared DearMe paid-beta entitlement contract derived from trial/active
  status.
- Trial entitlement can preview Brand OS but cannot request Brand OS approval or
  start private work.
- Active entitlement can request approval and start the private Brand OS work
  loop after approval.
- `server/src/services/dearme-paid-beta-access.ts` still derives access only
  from `finance_events` with the DearMe paid-beta biller.
- `server/src/routes/dearme.ts` now blocks Brand OS apply requests when the
  finance-derived entitlement does not allow them.
- `ui/src/pages/DearMeOnboarding.tsx` now uses one paid-beta access query for
  both the access panel and the header approval gate, with trial users seeing
  the required next action instead of a runnable private-work path.

Team Workbench read-model details:

- Added a shared Team Workbench contract for team members, active work,
  review-ready work, decisions needed, recent progress, and the weekly Dear me
  report.
- Added `server/src/services/dearme-workbench.ts`, which projects the workbench
  from existing DearMe agents, output handoffs, pending approvals, and activity
  logs instead of adding new tables.
- Added `/api/dearme/companies/:companyId/workbench` with the same
  company-scoped access boundary as the existing DearMe routes.
- Pending approval decisions are limited to `status = "pending"` so handled
  approvals do not remain in the user decision queue.
- The projection keeps the customer path free of provider, adapter,
  `setup_payload`, Paperclip, and other runtime/kernel language.
- `ui/src/pages/DearMeOnboarding.tsx` now opens with a dynamic "My AI team
  today" workbench: headline, summary metrics, team-at-work cards, approval
  gate, Dear me report, decisions needed, work ready, and "while you were away"
  progress.
- The existing output handoff panel remains available below the new first
  screen while the next slice consolidates Work Ready and batch decisions.

90-second First Cycle details:

- Added a shared First Cycle preview contract and deterministic helper that
  turns one positioning answer into starter DearMe artifacts.
- Added `/api/dearme/companies/:companyId/first-cycle/preview` with the same
  company-scoped access boundary as the existing DearMe routes.
- `ui/src/api/dearme.ts` now has a typed First Cycle preview client call.
- `ui/src/pages/DearMeOnboarding.tsx` now asks "What do you want to become
  known for?" before setup-heavy Brand OS inputs.
- The preview returns a Draft Voice Profile, three starter posts, one
  opportunity lead, one portfolio proof card, and one first growth plan.
- Every generated artifact is private prep by default and carries an approval
  gate before any publish, send, deploy, or public-claim action.
- The First Cycle path keeps customer output free of provider, adapter,
  `setup_payload`, MCP, Paperclip, OpenClaw, and other runtime/kernel language.

Voice Gate v0 details:

- Added a shared deterministic Voice Gate contract and evaluator before any
  embeddings, scorer, or regeneration loop.
- The evaluator checks voice sample readiness, banned phrasing, generic launch
  copy, proof-claim presence, and channel length constraints.
- First Cycle preview now includes `voiceGate` for the generated starter-post
  batch, so users see whether the private work is ready for review, needs voice
  review, or is blocked before public use.
- Brand OS preview now includes `voiceGate` for the positioning language before
  the user requests approval.
- `ui/src/pages/DearMeOnboarding.tsx` now renders Voice Gate v0 in both the
  90-second First Cycle result and the formal Brand OS preview.
- The Voice Gate keeps the product promise intact: DearMe prepares the move,
  shows the risk, and still requires approval before anything represents the
  user publicly.

Work Ready / batch decisions details:

- Added a shared `batchDecisions` workbench read-model with customer-facing
  action labels, risk gates, item counts, decision IDs, issue IDs, and approval
  IDs.
- `server/src/services/dearme-workbench.ts` now groups pending DearMe decisions
  by approval gate into reviewable batches such as content, outreach, portfolio,
  sensitive-material, public-claim, and general prepared-work decisions.
- The batch projection still uses existing outputs and approvals; it does not
  add a new table or bypass the approval system.
- `ui/src/pages/DearMeOnboarding.tsx` now shows Batch decisions above
  individual decisions, so the first screen feels like a prepared set of
  high-leverage moves instead of a list of micro-actions.
- Batch action buttons open the underlying approval or review issue, preserving
  the rule that DearMe prepares the move and the user approves what represents
  them.

Structured output details:

- Added a shared `details` contract for DearMe output items, including
  customer-facing detail kinds such as hook, draft body, target, outreach angle,
  proposed copy, completed work, decisions needed, and next bets.
- `server/src/services/dearme-output-handoff.ts` now projects those details from
  existing documents, prepared work, and progress comments without adding new
  tables or bypassing the approval system.
- Content, opportunity, portfolio, and weekly Dear me report outputs now carry
  enough structured context for a user to decide what needs review.
- `ui/src/pages/DearMeOnboarding.tsx` now shows the first structured details on
  each private-work card, keeping the Work Ready surface focused on approving
  prepared moves.
- The detail read-model keeps technical source values internal and does not
  render adapter/provider/kernel language on the customer path.

Verification:

- `rg -n "PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE|Current positioning|Product Positioning" docs/dearme/README.md docs/dearme/PRODUCT-ARCHITECTURE.md docs/dearme/PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`
  confirmed the README link and new plan heading.

## Output Review Loop - 2026-05-08

Implemented the focused private-work review loop:

- Added DearMe output review actions for approve, request changes, and
  regenerate.
- Reused the Paperclip issue/comment/work-product substrate instead of adding a
  parallel DearMe output store.
- Approval marks the existing issue done and marks the prepared work approved.
- Request changes and regenerate reopen the existing issue, record a customer
  decision comment, mark prepared work as changes requested, and queue a wakeup
  for the assigned worker when one exists.
- Added a DearMe customer route:
  `/api/dearme/companies/:companyId/outputs/:outputId/reviews`.
- Added focused-work UI actions in `DearMeOnboarding.tsx` so the user can
  approve, request changes, or regenerate prepared work without seeing issue
  routes or runtime internals.

Reuse notes:

- Naive/Paperclip reuse: company-scoped route auth, issue comments, issue
  status, work products, activity log, heartbeat/wakeup path, and existing
  React Query invalidation model.
- Lindy reuse: card-scoped action/retry pattern adapted into DearMe's focused
  private-work panel.
- Polsia reuse: product choreography stays visible as "your team prepares the
  moves"; the mechanics remain hidden.

Remaining gaps:

- Actual regeneration quality still depends on the assigned agent/runtime being
  connected and able to interpret the DearMe decision comment.
- The Team Work Stream still needs deeper live-feed polish so the user can see
  work progress before and after regeneration.
- Voice & Memory ingestion is still the next product-depth slice after this
  output review loop is verified.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 4 test files, 44 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "solo expert|Team Workbench Read Model|Code Architecture Guardrails|Current Code Reality|Paid-Beta Beachhead|Next Implementation Slices" docs/dearme/PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`
  confirmed the core positioning, architecture, and next-slice anchors.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed: 1 file, 12 tests.
- `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts --run`
  passed: 2 files, 15 tests.
- `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed: 2 files, 14 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused customer-path leak scan for `OK Partner`, `Paperclip`, `OpenClaw`,
  `adapter`, `provider`, `setup_payload`, `MCP`, `workspace`, `agent config`,
  and `model` returned no matches in the DearMe route/service/shared/UI files
  touched by this slice.
- `git diff --check` passed for tracked export diffs, and a focused trailing
  whitespace scan returned no matches across the DearMe product packaging,
  workbench, First Cycle route/service, shared contract, UI, test, and docs
  files touched by this slice.
- `curl -sS http://127.0.0.1:3100/api/health` returned local healthy status
  from the already-running DearMe dev server.
- Started the UI dev server on `http://127.0.0.1:5173/`; `curl -I` returned
  `HTTP/1.1 200 OK`.

## Previous Slice

Completed the fifty-sixth verified DearMe slice: CLI env-lab and worktree
helper copy now uses DearMe-facing instance/worktree language.

CLI env-lab and worktree helper copy details:

- Extended the CLI user-facing copy guard to cover `env-lab` and worktree
  helper source.
- Replaced env-lab instance option help with `DearMe instance id`.
- Replaced worktree-local helper descriptions, reseed/repair guard messages,
  worktree readiness outro, and destructive confirmation text with DearMe-facing
  wording.
- Preserved `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`, `.paperclip` paths,
  `paperclipai` commands, package names, lower-case temp/worktree prefixes, and
  internal `hasPaperclipConfig` compatibility fields.

CLI env-lab and worktree helper copy verification:

- Confirmed the expanded CLI copy guard failed before production edits because
  env-lab/worktree source still contained stale Paperclip instance/worktree
  phrases.
- `pnpm exec vitest cli/src/__tests__/cli-user-facing-copy.test.ts --run`
  passed: 1 file, 1 test.
- `pnpm exec vitest cli/src/__tests__/env-lab.test.ts --run` passed: 1 file,
  2 tests.
- `pnpm exec vitest cli/src/__tests__/worktree.test.ts --run` passed: 1 file,
  34 tests.
- Focused quoted-string scan for `Paperclip` in the env-lab/worktree slice
  returned only denylist assertions and existing test fixture names/titles.
- `pnpm --filter paperclipai typecheck` passed.
- `git diff --check` passed for the env-lab/worktree helper-copy slice files.

Completed the fifty-fifth verified DearMe slice: CLI feedback report and export
headings now use DearMe-facing branding.

CLI feedback branding details:

- Replaced the rendered feedback report heading with `DearMe Feedback Report`.
- Replaced the rendered feedback export heading with `DearMe Feedback Export`.
- Preserved feedback destination identifiers, archive structure, temp-file
  prefixes, and internal `paperclipai` package/command contracts.

CLI feedback branding verification:

- Confirmed `pnpm exec vitest cli/src/__tests__/feedback.test.ts --run` failed
  before production edits because rendered report/export headings still used
  `Paperclip Feedback Report` and `Paperclip Feedback Export`.
- `pnpm exec vitest cli/src/__tests__/feedback.test.ts --run` passed: 1 file,
  5 tests.
- Focused scan for the stale feedback headings returned only negative
  assertions in `cli/src/__tests__/feedback.test.ts`.
- `pnpm --filter paperclipai typecheck` passed.
- `git diff --check` passed for the feedback branding slice files.

Completed the fifty-fourth verified DearMe slice: CLI setup, run, API
connection, client command, and local runtime guidance now use DearMe-facing
language while preserving compatibility identifiers.

CLI customer-facing copy guard details:

- Added a focused CLI user-facing copy guard covering setup, run, API client,
  context, company import, local agent setup, routine maintenance, auth checks,
  and generated env-file comments.
- Replaced stale `Paperclip` copy in visible CLI errors, help text, prompts,
  and repair hints with DearMe-facing wording.
- Preserved the `paperclipai` command name, `@paperclipai/*` package names,
  `Paperclip*` internal types, `PAPERCLIP_*` environment variables,
  `.paperclip` state paths, and API compatibility identifiers.

CLI customer-facing copy guard verification:

- Confirmed the new CLI copy guard failed before production edits because the
  covered CLI source still contained stale `Paperclip` setup, run, API,
  skill-install, and import-selection copy.
- Confirmed the HTTP connection-copy regression failed before production edits
  because connection errors still said `Could not reach the Paperclip API.`
- `pnpm exec vitest cli/src/__tests__/cli-user-facing-copy.test.ts --run`
  passed: 1 file, 1 test.
- `pnpm exec vitest cli/src/__tests__/http.test.ts --run` passed: 1 file, 5
  tests.
- `pnpm --filter paperclipai typecheck` passed.
- Focused production scan for the guarded stale CLI phrases returned no matches
  in `cli/src/client`, `cli/src/index.ts`, `cli/src/commands`, `cli/src/checks`,
  or `cli/src/config`.
- `git diff --check` passed for the CLI copy-guard slice files.

Completed the fifty-third verified DearMe slice: built-in adapter
configuration docs, the remote gateway package label, and the Hermes API auth
guard now use DearMe-facing language.

Adapter configuration and Hermes auth polish details:

- Replaced exported built-in adapter configuration prose that named Paperclip
  with DearMe-facing runtime language.
- Renamed the gateway adapter package label from `OpenClaw Gateway` to
  `Remote Gateway` while preserving the `openclaw_gateway` adapter type and
  lower-level protocol fields.
- Replaced the Hermes auth prompt guard from `Paperclip API` wording to
  `DearMe API` wording.
- Preserved package names, adapter IDs, compatibility fields, `PAPERCLIP_*`
  environment variables, `paperclip*` payload keys, and gateway protocol header
  names.

Adapter configuration and Hermes auth polish verification:

- Confirmed the new adapter configuration copy test failed before production
  edits because exported docs still contained `Paperclip` and `OpenClaw`, and
  the gateway label was still `OpenClaw Gateway`.
- Confirmed the Hermes registry regression failed before production edits
  because the auth guard still used `Paperclip API` wording.
- `pnpm exec vitest
  server/src/__tests__/adapter-configuration-copy.test.ts --run` passed: 1
  file, 2 tests.
- `pnpm exec vitest server/src/__tests__/adapter-registry.test.ts --run`
  passed: 1 file, 17 tests.
- `pnpm --filter @paperclipai/adapter-acpx-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-claude-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-codex-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-cursor-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-gemini-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-opencode-local typecheck` passed.
- `pnpm --filter @paperclipai/adapter-openclaw-gateway typecheck` passed.
- `pnpm --filter @paperclipai/adapter-pi-local typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `Paperclip`, `OpenClaw`, `OK Partner`, `setup_payload`,
  and `setup payload` in the slice files returned only preserved compatibility
  header/test references and no stale adapter configuration prose.

Completed the fifty-second verified DearMe slice: agent-facing wake prompts,
runtime notes, task context, and skill-management labels now use DearMe-facing
language.

Agent prompt and runtime label polish details:

- Replaced the default agent prompt continuation sentence with DearMe wording.
- Replaced wake and resume prompt headings with `DearMe Wake Payload` and
  `DearMe Resume Delta`, including the resumed-session intro sentence.
- Replaced Cursor and Gemini runtime/API note headings with DearMe wording.
- Replaced heartbeat task-context markdown with `DearMe task context`.
- Replaced bundled skill management labels, read-only reasons, required reasons,
  missing-skill warnings, and skill-directory validation errors with DearMe
  runtime wording.
- Preserved package names, adapter types, `PAPERCLIP_*` environment variables,
  skill keys, API endpoint examples, and compatibility identifiers.

Agent prompt and runtime label polish verification:

- Confirmed the focused regressions failed before production edits on the stale
  Paperclip prompt headings, runtime notes, task-context label, and skill labels.
- `pnpm exec vitest packages/adapter-utils/src/server-utils.test.ts --run`
  passed: 1 file, 25 tests.
- `pnpm exec vitest server/src/__tests__/paperclip-skill-utils.test.ts --run`
  passed: 1 file, 3 tests.
- `pnpm exec vitest server/src/__tests__/cursor-local-execute.test.ts --run`
  passed: 1 file, 5 tests.
- `pnpm exec vitest server/src/__tests__/gemini-local-execute.test.ts --run`
  passed: 1 file, 6 tests.
- `pnpm exec vitest server/src/__tests__/codex-local-execute.test.ts --run`
  passed: 1 file, 13 tests.
- `pnpm exec vitest server/src/__tests__/claude-local-execute.test.ts --run`
  passed: 1 file, 15 tests.
- `pnpm exec vitest
  server/src/__tests__/heartbeat-comment-wake-batching.test.ts --run` passed:
  1 file, 9 tests.
- `pnpm exec vitest server/src/__tests__/openclaw-gateway-adapter.test.ts
  --run` passed: 1 file, 7 tests.
- `pnpm exec vitest server/src/__tests__/cursor-local-skill-sync.test.ts --run`
  passed: 1 file, 3 tests.
- `pnpm --filter @paperclipai/adapter-utils typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for old prompt/runtime/task/skill phrases returned only
  negative test assertions and no production matches.
- `git diff --check` on the slice files returned clean before this documentation
  update.

Completed the fifty-first verified DearMe slice: server-side environment,
adapter, hire-hook, and Brand OS operation helper messages now avoid visible
Paperclip product language.

Server helper copy polish details:

- Replaced the local environment probe summary with DearMe host wording.
- Replaced the hire-approved adapter payload instruction with a DearMe task
  assignment message.
- Replaced the HTTP adapter endpoint reachability hint with DearMe server host
  wording.
- Replaced the Brand OS operation boundary phrase that named Paperclip with a
  product-codebase maintenance boundary.
- Added focused regression coverage for the local probe summary, hire hook
  payload, HTTP environment probe hint, and Brand OS issue descriptions.
- Preserved adapter types, package names, environment driver behavior, HTTP
  probe behavior, Brand OS artifact creation, and approval idempotency.

Server helper copy polish verification:

- Confirmed the four focused regressions failed before the production edits on
  the stale `Paperclip` strings.
- `pnpm exec vitest server/src/__tests__/environment-probe.test.ts --run`
  passed: 1 file, 6 tests.
- `pnpm exec vitest server/src/__tests__/hire-hook.test.ts --run` passed: 1
  file, 5 tests.
- `pnpm exec vitest server/src/adapters/http/test.test.ts --run` passed: 1
  file, 1 test.
- `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-apply.test.ts
  --run` passed: 1 file, 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `Paperclip host`, `Paperclip server host`,
  `task in Paperclip`, `not a Paperclip`, `OpenClaw`, `OK Partner`,
  `pnpm paperclipai`, and `paperclip.ing` in the changed files returned only
  test-only negative assertions and legacy adapter-name fixtures.
- `git diff --check -- server/src/services/environment-probe.ts
  server/src/__tests__/environment-probe.test.ts server/src/services/hire-hook.ts
  server/src/__tests__/hire-hook.test.ts server/src/adapters/http/test.ts
  server/src/adapters/http/test.test.ts
  server/src/services/dearme-brand-blueprint-apply.ts
  server/src/__tests__/dearme-brand-blueprint-apply.test.ts` returned clean
  before this documentation update.

Completed the fiftieth verified DearMe slice: generated org chart SVGs now use
a DearMe-facing watermark wordmark.

Org chart watermark polish details:

- Replaced the visible `Paperclip` org chart SVG watermark wordmark with a
  DearMe badge and wordmark.
- Updated the renderer header comment to identify the DearMe org chart surface.
- Added focused SVG renderer regression coverage for the generated watermark.
- Preserved org chart layout, style themes, overlay behavior, and SVG output
  contract.

Org chart watermark polish verification:

- Confirmed the new renderer regression failed before the production edit on the
  stale `Paperclip` watermark wordmark.
- `pnpm exec vitest server/src/__tests__/org-chart-svg.test.ts --run` passed:
  1 file, 1 test.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `Paperclip`, `PAPERCLIP_LOGO`, `OpenClaw`, `OK Partner`,
  `pnpm paperclipai`, and `paperclip.ing` in
  `server/src/routes/org-chart-svg.ts` and
  `server/src/__tests__/org-chart-svg.test.ts` returned only the negative
  `Paperclip` assertion in the test.
- `git diff --check -- server/src/routes/org-chart-svg.ts
  server/src/__tests__/org-chart-svg.test.ts` returned clean before this
  documentation update.

Completed the forty-ninth verified DearMe slice: project and execution
workspace runtime-command errors now use DearMe-facing product language.

Workspace runtime error copy polish details:

- Replaced project-workspace missing-local-path responses that said
  `Paperclip can run workspace commands` with DearMe wording.
- Replaced execution-workspace missing-local-path responses and runtime
  operation errors with DearMe wording for workspace commands and local runtime
  service management.
- Added focused route regression coverage for the project and execution
  workspace 422 response bodies.
- Preserved workspace runtime authorization, endpoint paths, command execution,
  service start/stop behavior, and internal compatibility names.

Workspace runtime error copy polish verification:

- Confirmed the new route regressions failed before the production copy edit on
  the stale `Paperclip can run workspace commands` response text.
- `pnpm exec vitest server/src/__tests__/workspace-runtime-routes-authz.test.ts
  --run` passed: 1 file, 11 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `Paperclip can`, `before Paperclip`, `Paperclip`,
  `OpenClaw`, `OK Partner`, and `pnpm paperclipai` in
  `server/src/routes/projects.ts`, `server/src/routes/execution-workspaces.ts`,
  and the focused route test returned only negative `Paperclip` assertions in
  the test.
- `git diff --check -- server/src/routes/projects.ts
  server/src/routes/execution-workspaces.ts
  server/src/__tests__/workspace-runtime-routes-authz.test.ts` returned clean
  before this documentation update.

Completed the forty-eighth verified DearMe slice: the LLM configuration and
agent-icon reference documents now use DearMe-facing headings and workflow
language.

LLM reference copy polish details:

- Replaced the generated `agent-configuration.txt` heading with
  `# DearMe Agent Configuration Index`.
- Reworded the end-to-end hiring guidance from the legacy create-agent skill
  name to a local create-agent workflow description.
- Replaced the generated `agent-icons.txt` heading with
  `# DearMe Agent Icon Names`.
- Preserved the `/llms/...` endpoint paths, adapter reflection output, icon
  list, and permission checks.

LLM reference copy polish verification:

- Confirmed the widened route regression failed before the production copy edit
  on both old headings and the legacy create-agent skill reference.
- `pnpm exec vitest server/src/__tests__/llms-routes.test.ts --run` passed: 1
  file, 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `Paperclip`, `paperclip-create-agent`, `pnpm paperclipai`,
  `OpenClaw`, and `OK Partner` in `server/src/routes/llms.ts` and
  `server/src/__tests__/llms-routes.test.ts` returned only negative assertions
  in the test.
- `git diff --check -- server/src/routes/llms.ts
  server/src/__tests__/llms-routes.test.ts` returned clean before this
  documentation update.

Completed the forty-seventh verified DearMe slice: the server startup banner
now identifies DearMe directly and avoids the legacy package command in the
missing-agent-secret hint.

Startup banner copy polish details:

- Replaced the terminal banner identity block with a literal `DEARME` runtime
  header.
- Reworded the missing agent-JWT hint from the old package command to a local
  DearMe setup instruction.
- Added focused startup-banner regression coverage against the rendered console
  output.
- Preserved internal env/config compatibility names such as
  `PAPERCLIP_AGENT_JWT_SECRET` and the existing config path resolver.

Startup banner copy polish verification:

- Confirmed the new regression failed before the production edit because the
  rendered banner lacked `DEARME` and still printed
  `pnpm paperclipai onboard`.
- `pnpm exec vitest server/src/__tests__/startup-banner.test.ts --run` passed:
  1 file, 1 test.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for `pnpm paperclipai`, `paperclipai onboard`, `Paperclip`,
  `OpenClaw`, `OK Partner`, and `PAPERCLIP` in `server/src/startup-banner.ts`
  and the new startup-banner test returned no visible old package command; the
  remaining matches are internal env/config/test variable names and resolver
  imports.
- `git diff --check -- server/src/startup-banner.ts
  server/src/__tests__/startup-banner.test.ts` returned clean before this
  documentation update.

Completed the forty-sixth verified DearMe slice: the first-admin setup gate now
describes the local bootstrap action without exposing the legacy CLI package
name.

CloudAccessGate bootstrap copy polish details:

- Reworded the first-admin setup prompt so pending authenticated deployments
  tell the user to use a local setup command instead of showing
  `pnpm paperclipai auth bootstrap-ceo`.
- Kept the bootstrap status, invite polling, auth redirect, and no-access gate
  behavior unchanged.
- Tightened the existing CloudAccessGate regression to require the DearMe-safe
  bootstrap wording while rejecting visible `paperclipai` and `Paperclip`.

CloudAccessGate bootstrap copy polish verification:

- Confirmed the tightened regression failed before the production copy edit
  because the rendered gate still printed `pnpm paperclipai auth bootstrap-ceo`.
- `pnpm exec vitest ui/src/App.test.tsx --run` passed: 1 file, 3 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused scan for `pnpm paperclipai`, `paperclipai auth bootstrap-ceo`,
  `Paperclip`, `OpenClaw`, and `OK Partner` in `CloudAccessGate.tsx` and
  `App.test.tsx` returned only negative `Paperclip` assertions in
  `ui/src/App.test.tsx`.
- `git diff --check -- ui/src/components/CloudAccessGate.tsx
  ui/src/App.test.tsx` returned clean before this documentation update.

Completed the forty-fifth verified DearMe slice: company export README
content now uses DearMe-facing import guidance in both the UI preview generator
and the server export generator.

Company export README copy polish details:

- Replaced the visible legacy CLI import command in the UI export README
  preview with DearMe company-import-screen guidance.
- Replaced stale Paperclip links/branding and the legacy CLI command in the
  server-side exported README generator.
- Added focused server README coverage alongside the existing UI README
  coverage so both generators stay aligned.
- Left the `.paperclip.yaml` portability manifest/filter contract untouched.

Company export README copy polish verification:

- Confirmed the updated regressions failed before the production copy edits:
  the UI preview still printed the legacy CLI command, and the server README
  still printed Paperclip links plus the legacy CLI command.
- `pnpm exec vitest ui/src/pages/CompanyExport.test.ts
  server/src/__tests__/company-export-readme.test.ts --run` passed: 2 files, 2
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Focused scan for visible `Paperclip`, `paperclip.ing`, `pnpm paperclipai`,
  `paperclipai company import`, `OpenClaw`, and `OK Partner` in the touched
  README generator files returned only the internal `filterPaperclipYaml`
  helper name/usages in `ui/src/pages/CompanyExport.tsx`.
- `git diff --check -- ui/src/pages/CompanyExport.tsx
  ui/src/pages/CompanyExport.test.ts server/src/services/company-export-readme.ts
  server/src/__tests__/company-export-readme.test.ts docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the forty-fourth verified DearMe slice: server-generated onboarding
and private-hostname remediation copy no longer expose visible Paperclip,
OpenClaw, or `pnpm paperclipai` wording in the invite onboarding document and
hostname-block responses.

Server onboarding/remediation copy polish details:

- Reworded invite onboarding diagnostics, JSON guidance, text-document
  headings, pairing guidance, candidate-URL section titles, and private-mode
  fallback steps to use DearMe and remote teammate gateway language.
- Reworded private-hostname guard JSON/plain-text errors to describe the local
  hostname allowlist command without exposing the legacy package command.
- Preserved compatibility contract fields and paths that remain part of the
  current API shape, including `openclaw_gateway`, `x-openclaw-token`,
  `paperclipApiUrl`, and the invite skill endpoint path.
- Extended focused server regressions to reject visible `Paperclip`, visible
  `OpenClaw`, and `pnpm paperclipai` in the generated onboarding document and
  hostname-block remediation copy.

Server onboarding/remediation copy polish verification:

- Confirmed the extended regressions failed before the production copy edit on
  stale onboarding headings, diagnostics, and hostname remediation commands.
- `pnpm exec vitest server/src/__tests__/invite-onboarding-text.test.ts
  server/src/__tests__/private-hostname-guard.test.ts --run` passed: 2 files,
  9 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Broad focused-file scan for `Paperclip`, `OpenClaw`, `pnpm paperclipai`, and
  `paperclipai allowed-hostname` still reports internal compatibility symbols
  and separate gateway validation/log messages in `server/src/routes/access.ts`;
  the tested generated onboarding document and private-hostname guard copy are
  product-safe for this slice.
- `git diff --check -- server/src/routes/access.ts
  server/src/__tests__/invite-onboarding-text.test.ts
  server/src/middleware/private-hostname-guard.ts
  server/src/__tests__/private-hostname-guard.test.ts docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the forty-third verified DearMe slice: generated teammate invite
copy now describes the hostname allowlist step without exposing the legacy CLI
package name.

Company-settings invite snippet polish details:

- Reworded the no-candidate and unreachable-candidate connectivity guidance so
  the generated invite asks for a local hostname allowlist command instead of
  showing `pnpm paperclipai allowed-hostname <host>`.
- Preserved the remote teammate gateway contract keys, including
  `adapterType: "openclaw_gateway"` and the accepted gateway header names.
- Extended the focused CompanySettings regression to require product-safe
  hostname allowlist copy while rejecting `paperclipai` in the generated
  textarea.

Company-settings invite snippet polish verification:

- Confirmed the extended regression failed before the production copy edit
  because the generated textarea still showed
  `pnpm paperclipai allowed-hostname <host>`.
- `pnpm exec vitest ui/src/pages/CompanySettings.test.tsx --run` passed: 1
  file, 3 tests. The existing jsdom stderr still reports the unimplemented
  canvas `getContext()` path.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-command scan for `pnpm paperclipai`,
  `paperclipai allowed-hostname`, visible/quoted `Paperclip`, and `OK Partner`
  returned no matches in `ui/src/pages/CompanySettings.tsx`; the only broader
  `OpenClaw` match left in that file is the internal
  `createOpenClawInvitePrompt` API method call.
- `git diff --check -- ui/src/pages/CompanySettings.tsx
  ui/src/pages/CompanySettings.test.tsx docs/dearme/BUILD-STATE.md` returned
  clean before this documentation update.

Completed the forty-second verified DearMe slice: project execution-workspace
advanced settings now avoid the legacy substrate path in the worktree parent
placeholder.

Project-properties worktree-placeholder polish details:

- Reworded the visible worktree parent directory placeholder from
  `.paperclip/worktrees` to `.dearme/worktrees`.
- Kept the execution workspace policy keys and git-worktree behavior
  unchanged.
- Added a focused ProjectProperties regression that opens advanced checkout
  settings and asserts the placeholder is DearMe-safe.

Project-properties worktree-placeholder polish verification:

- Confirmed the new regression failed before the production copy edit because
  the advanced checkout settings did not render `.dearme/worktrees`.
- `pnpm exec vitest ui/src/components/ProjectProperties.test.tsx --run`
  passed: 1 file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for `.paperclip/worktrees`, visible/quoted
  `Paperclip`, `OpenClaw`, `OK Partner`, `Adapter type`, `adapter default`,
  and `configure adapter` returned no matches in
  `ui/src/components/ProjectProperties.tsx`.
- `git diff --check -- ui/src/components/ProjectProperties.tsx
  ui/src/components/ProjectProperties.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the forty-first verified DearMe slice: instance runner management now
uses run-method/runner-safe copy instead of adapter copy in the admin settings
surface.

Instance runner-management copy polish details:

- Reworded the instance settings sidebar item from `Adapters` to `Run methods`
  while preserving the existing `/instance/settings/adapters` route.
- Reworded the Adapter Manager page title, install action, alpha notice,
  external/built-in section headings, empty states, package path label, and
  remove/reload/reinstall controls to use run-method or runner copy.
- Preserved internal API/type/route names and the explicit
  `createServerAdapter()` package export contract.
- Added focused regressions for the Adapter Manager landing state and the
  instance settings sidebar label.

Instance runner-management copy polish verification:

- Confirmed the new Adapter Manager regression failed before the production
  copy edit because the page rendered `Adapters`, `Install Adapter`, `External
  adapters`, and related adapter empty states.
- Confirmed the new InstanceSidebar regression failed before the production
  copy edit because the sidebar rendered `Adapters`.
- `pnpm exec vitest ui/src/pages/AdapterManager.test.tsx --run` passed: 1
  file, 1 test.
- `pnpm exec vitest ui/src/components/InstanceSidebar.test.tsx --run` passed:
  1 file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused exact visible-string scan for old Adapter Manager/sidebar labels,
  visible/quoted `Paperclip`, `OpenClaw`, and `OK Partner` returned no matches
  in `ui/src/pages/AdapterManager.tsx` and
  `ui/src/components/InstanceSidebar.tsx`.
- `git diff --check -- ui/src/pages/AdapterManager.tsx
  ui/src/pages/AdapterManager.test.tsx ui/src/components/InstanceSidebar.tsx
  ui/src/components/InstanceSidebar.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the fortieth verified DearMe slice: imported-agent run-method
selection now uses runner-safe copy instead of adapter copy.

Company-import runner-copy polish details:

- Reworded the imported-agent picker section title from `Adapters` to `Run
  methods`.
- Reworded the per-agent configuration button from `configure adapter` to
  `configure runner`.
- Updated nearby touched-file comments so the picker is described as a
  run-method picker.
- Added a focused component regression for the import picker; the test mocks
  unused heavy child components so it stays scoped to this rendered panel.

Company-import runner-copy polish verification:

- Confirmed the new regression failed before the production copy edit because
  the picker rendered `Adapters` and `configure adapter`.
- `pnpm exec vitest ui/src/pages/CompanyImport.test.tsx --run` passed: 1 file,
  1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused exact visible-string scan for `Adapters`, `configure adapter`,
  `Adapter type`, `adapter default`, visible/quoted `Paperclip`, `OpenClaw`,
  and `OK Partner` returned no matches in `ui/src/pages/CompanyImport.tsx`.
- `git diff --check -- ui/src/pages/CompanyImport.tsx
  ui/src/pages/CompanyImport.test.tsx docs/dearme/BUILD-STATE.md` returned
  clean before this documentation update.

Completed the thirty-ninth verified DearMe slice: the invite UX lab agent
request preview now uses run-method copy instead of adapter-type copy.

Invite UX lab runner-copy polish details:

- Reworded the agent request preview field label from `Adapter type` to `Run
  method`.
- Left the disabled demo values intact so the fixture still previews the same
  runner choices.
- Extended the existing invite UX lab render regression to require `Run method`
  and reject the old adapter-type label.

Invite UX lab runner-copy polish verification:

- Confirmed the extended regression failed before the production edit because
  the lab preview still rendered `Adapter type`.
- `pnpm exec vitest ui/src/pages/InviteUxLab.test.tsx --run` passed: 1 file, 1
  test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for `Adapter type`, `adapter default`, `configure
  adapter`, visible/quoted `Paperclip`, `OpenClaw`, and `OK Partner` returned
  no matches in `ui/src/pages/InviteUxLab.tsx`.
- `git diff --check -- ui/src/pages/InviteUxLab.tsx
  ui/src/pages/InviteUxLab.test.tsx docs/dearme/BUILD-STATE.md` returned clean
  before this documentation update.

Completed the thirty-eighth verified DearMe slice: new-issue cheap model
override help now describes the customer-facing cheap model instead of adapter
defaults.

New-issue cheap-model copy polish details:

- Reworded the cheap lane hint from `adapter default` to `configured cheap
  model`.
- Kept the submitted payload semantics unchanged: cheap lane still sends
  `modelProfile: "cheap"` and lets runtime resolve the configured profile.
- Extended the new-issue dialog regression harness to cover adapter model
  profile loading and the opened assignee-options cheap lane.

New-issue cheap-model copy polish verification:

- Confirmed the new regression failed before the production edit because the
  cheap-lane hint rendered `adapter default claude-haiku-4-5`.
- `pnpm exec vitest ui/src/components/NewIssueDialog.test.tsx --run` passed: 1
  file, 7 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused exact stale-copy scan for `adapter default`, `Adapter type`,
  `configure adapter`, quoted/visible `Paperclip`, `OpenClaw`, and `OK
  Partner` returned no matches in `ui/src/components/NewIssueDialog.tsx`.
- `git diff --check -- ui/src/components/NewIssueDialog.tsx
  ui/src/components/NewIssueDialog.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the thirty-seventh verified DearMe slice: issue workspace cards now
use runner-safe copy for legacy adapter-managed workspace labels.

Issue-workspace runner-copy polish details:

- Reworded the defensive `adapter_managed` workspace label from `Adapter
  managed` to `Runner managed`.
- Kept the internal mode contract untouched; the change is limited to the
  rendered customer-facing label.
- Added a focused card regression for a legacy adapter-managed workspace so
  the header does not expose adapter terminology or the raw mode id.

Issue-workspace runner-copy polish verification:

- Confirmed the new regression failed before the production edit because the
  card rendered `Adapter managed`.
- `pnpm exec vitest ui/src/components/IssueWorkspaceCard.test.tsx --run`
  passed: 1 file, 3 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for `Adapter managed`, `Paperclip`, `OpenClaw`, and
  `OK Partner` returned no matches in
  `ui/src/components/IssueWorkspaceCard.tsx`.
- `git diff --check -- ui/src/components/IssueWorkspaceCard.tsx
  ui/src/components/IssueWorkspaceCard.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the thirty-sixth verified DearMe slice: the new-agent dialog now
uses execution-setting and run-method copy instead of adapter copy.

New-agent dialog runner-copy polish details:

- Reworded the CEO recommendation from configuring `adapters` to configuring
  `execution settings`.
- Reworded the advanced setup prompt from choosing an adapter type to choosing
  a run method.
- Updated nearby touched-file comments so the visible picker is described as a
  run-method grid rather than an adapter grid.
- Added a focused dialog regression that covers both the recommendation state
  and the advanced setup state.

New-agent dialog runner-copy polish verification:

- Confirmed the new regression failed before the production edit because the
  recommendation rendered `and adapters`.
- `pnpm exec vitest ui/src/components/NewAgentDialog.test.tsx --run` passed: 1
  file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for the old dialog adapter phrases, `Paperclip`,
  `OpenClaw`, and `OK Partner` returned no matches in
  `ui/src/components/NewAgentDialog.tsx`.
- `git diff --check -- ui/src/components/NewAgentDialog.tsx
  ui/src/components/NewAgentDialog.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the thirty-fifth verified DearMe slice: company environment support
copy now describes run methods and runners instead of adapters.

Company-environments runner-copy polish details:

- Reworded the page intro from remote-capable adapters to remote-capable run
  methods.
- Reworded the environment support explanation from adapter support and
  remote-managed adapters to run-method support and remote-managed runners.
- Reworded the support table caption and first column header from adapter
  language to run-method language.
- Extended the existing CompanyEnvironments regression to cover the support
  table and explanatory copy.

Company-environments runner-copy polish verification:

- Confirmed the extended regression failed before the production edit because
  the page rendered `remote-capable adapters`, `adapter support matrix`,
  `remote-managed adapters`, `Environment support by adapter`, and `Adapter`.
- `pnpm exec vitest ui/src/pages/CompanySettings.test.tsx --run` passed: 1
  file, 3 tests. The existing jsdom canvas `getContext()` warning still appears
  in the broader CompanySettings test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for old environment adapter phrases, `Paperclip`,
  `OpenClaw`, and `OK Partner` returned no matches in
  `ui/src/pages/CompanyEnvironments.tsx`.
- `git diff --check -- ui/src/pages/CompanyEnvironments.tsx
  ui/src/pages/CompanySettings.test.tsx docs/dearme/BUILD-STATE.md` returned
  clean before this documentation update.

Completed the thirty-fourth verified DearMe slice: onboarding first-agent setup
now presents runner selection and environment probing as run-method/runner copy
instead of adapter copy.

Onboarding runner-copy polish details:

- Reworded the first-agent setup field from `Adapter type` to `Run method`.
- Reworded the collapsed advanced selector from `More Agent Adapter Types` to
  `More run methods`.
- Reworded the live probe panel from `Adapter environment check` and adapter
  CLI wording to `Runner check` and selected-runner wording.
- Reworded the environment-test fallback error and Anthropic remediation hint
  away from adapter configuration language.
- Removed a touched-file source comment that still named the old local
  substrate host.
- Added a focused onboarding regression for the Step 2 setup labels.

Onboarding runner-copy polish verification:

- Confirmed the new regression failed before the production edit because Step 2
  rendered `Adapter type`, `More Agent Adapter Types`, `Adapter environment
  check`, and `adapter CLI`.
- `pnpm exec vitest ui/src/components/OnboardingWizard.test.tsx --run` passed:
  1 file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused stale-copy scan for old onboarding adapter labels, adapter probe
  wording, old fallback error text, `Paperclip`, `OpenClaw`, and `OK Partner`
  returned no matches in `ui/src/components/OnboardingWizard.tsx`.
- `git diff --check -- ui/src/components/OnboardingWizard.tsx
  ui/src/components/OnboardingWizard.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the thirty-third verified DearMe slice: agent property panels now
present the agent runner as a run method instead of a visible adapter field.

Agent-properties runner-copy polish details:

- Reworded the agent property row label from `Adapter` to `Run method`.
- Kept the value on the shared display label such as `Claude Code (local)`.
- Added a focused component regression so the panel does not expose adapter
  terminology or raw runner ids for the agent run method.

Agent-properties runner-copy polish verification:

- Confirmed the new regression failed before the production edit because the
  panel rendered `AdapterClaude Code (local)`.
- `pnpm exec vitest ui/src/components/AgentProperties.test.tsx --run` passed:
  1 file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for visible `Adapter` row labels,
  `claude_local`, `Paperclip`, `OpenClaw`, and `OK Partner` returned no matches
  in `ui/src/components/AgentProperties.tsx`.
- `git diff --check -- ui/src/components/AgentProperties.tsx
  ui/src/components/AgentProperties.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean before this documentation update.

Completed the thirty-second verified DearMe slice: inbox join-request rows now
present agent runner choices as run methods instead of visible adapter metadata
or raw adapter ids.

Inbox join-request runner-copy polish details:

- Reworded agent join-request inbox metadata from `adapter:` to `run method:`.
- Replaced the raw join-request adapter id with the shared display label such
  as `Claude Code (local)`.
- Exported the join-request row for a focused component regression covering the
  visible agent-request metadata.

Inbox join-request runner-copy polish verification:

- Confirmed the new regression failed before the production edit because the
  row rendered `adapter: claude_local`.
- `pnpm exec vitest ui/src/pages/Inbox.test.tsx --run` passed: 1 file, 9
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `adapter:`, raw
  `joinRequest.adapterType` rendering, `claude_local`, `Paperclip`,
  `OpenClaw`, and `OK Partner` returned no matches in `ui/src/pages/Inbox.tsx`.
- `git diff --check -- ui/src/pages/Inbox.tsx
  ui/src/pages/Inbox.test.tsx docs/dearme/BUILD-STATE.md` returned clean
  before this documentation update.

Completed the thirty-first verified DearMe slice: invite and join-request
surfaces now present agent runner choices as run methods instead of visible
adapter fields or raw adapter ids.

Invite/join-request runner-copy polish details:

- Reworded the agent invite form field from `Adapter type` to `Run method`.
- Kept invite runner choices on shared display labels such as `Claude Code
  (local)`.
- Replaced the join-request queue's raw adapter id badge with the shared
  run-method display label.
- Added focused regressions for the agent invite form and join-request queue so
  customer-visible text does not expose `Adapter type` or `claude_local`.

Invite/join-request runner-copy polish verification:

- `pnpm exec vitest ui/src/pages/InviteLanding.test.tsx
  ui/src/pages/JoinRequestQueue.test.tsx --run` passed: 2 files, 10 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `Adapter type`, raw join-request
  adapter rendering, visible `Adapter` labels, `Paperclip`, `OpenClaw`, and
  `OK Partner` returned no matches in the touched production files.
- `git diff --check -- ui/src/pages/InviteLanding.tsx
  ui/src/pages/InviteLanding.test.tsx ui/src/pages/JoinRequestQueue.tsx
  ui/src/pages/JoinRequestQueue.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean after this documentation update.

Completed the thirtieth verified DearMe slice: agent configuration and
run-method picker surfaces now avoid visible adapter terminology in form
headings, field labels, tooltips, model fallback messages, environment-test
errors, and picker descriptions.

Agent-configuration runner-copy polish details:

- Reworded the Agent Config section heading and type field from adapter language
  to `Run method`.
- Reworded agent-config help text so legacy cwd, model, thinking effort,
  permission, extra-arg, environment-variable, remote-payload, and
  max-turn-continuation hints use run-method or runner language.
- Reworded environment-test and model-loading fallback errors away from adapter
  wording.
- Reworded cheap-model fallback hints from adapter defaults to runner defaults.
- Reworded run-method picker descriptions for ACPX, process, HTTP, and external
  entries from adapter descriptions to runner descriptions.
- Added focused copy regressions for agent-config help text and picker
  descriptions.

Agent-configuration runner-copy polish verification:

- `pnpm exec vitest ui/src/components/agent-config-copy.test.ts
  ui/src/adapters/adapter-display-registry.test.ts --run` passed: 2 files, 3
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for old local-adapter help, adapter/model
  help, adapter permission/process/payload wording, old adapter environment
  and model errors, `Adapter type`, visible `Adapter` section labels, adapter
  default hints, and adapter picker descriptions returned no matches in the
  touched production files.
- `git diff --check -- ui/src/components/AgentConfigForm.tsx
  ui/src/components/agent-config-primitives.tsx
  ui/src/adapters/adapter-display-registry.ts
  ui/src/components/agent-config-copy.test.ts
  ui/src/adapters/adapter-display-registry.test.ts docs/dearme/BUILD-STATE.md`
  returned clean after this documentation update.

Completed the twenty-ninth verified DearMe slice: Agent Detail now uses
customer-safe run-method and runner language instead of exposing adapter labels,
raw adapter ids, OpenClaw management wording, or adapter-result labels in
invocation, instruction, skills, and run-detail surfaces.

Agent-detail runner-copy polish details:

- Replaced the invocation `Adapter:` row and raw adapter id with a `Run method:`
  row backed by the shared display labels.
- Reworded the non-local instruction-bundle message from local adapters to local
  runners.
- Reworded unsupported skill-management messages so remote gateway and generic
  runner cases do not expose OpenClaw or adapter wording.
- Reworded the skills summary label from `Adapter` to `Run method`.
- Replaced the run-detail raw adapter-type pill with the shared run-method
  display label.
- Reworded failure detail `adapter result JSON` to `runner result JSON`.
- Added focused regressions for the invocation card display and unsupported
  skills copy helpers.

Agent-detail runner-copy polish verification:

- `pnpm exec vitest ui/src/components/RunInvocationCard.test.tsx --run`
  passed: 1 file, 2 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `Adapter:`, old local-adapter
  instruction copy, OpenClaw skill-management phrases, generic adapter-direct
  skills copy, raw `adapterType.replace`, and `adapter result JSON` returned no
  matches in `ui/src/pages/AgentDetail.tsx`.
- `git diff --check -- ui/src/pages/AgentDetail.tsx
  ui/src/components/RunInvocationCard.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean after this documentation update.

Completed the twenty-eighth verified DearMe slice: workspace and run-history
surfaces now use customer-safe source and runner language instead of exposing
provider or adapter wording in the execution workspace, project workspace, and
run ledger views.

Workspace/runtime provider-copy polish details:

- Replaced the execution-workspace raw provider-type status pill with a
  humanized runner label.
- Reworded execution-workspace provider ref labels and placeholders to
  workspace source/ref language while preserving the internal `providerRef`
  contract.
- Reworded the project workspace `Remote provider` field to `Remote workspace
  source` while preserving the internal `remoteProvider` field.
- Reworded run-ledger `adapter_failed` stop reasons to visible `runner failed`
  copy while preserving the existing stop-reason contract.
- Added focused regressions for workspace labels and the rendered run-ledger
  stop reason.

Workspace/runtime provider-copy polish verification:

- `pnpm exec vitest ui/src/pages/workspace-copy.test.ts
  ui/src/components/IssueRunLedger.test.tsx --run` passed: 2 files, 15 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `Provider path / ref`, `Provider
  ref`, `Remote provider`, `provider ref`, `adapter failed`, and the old raw
  `workspace.providerType` status-pill render returned no matches in the
  touched production files.
- `git diff --check -- ui/src/pages/ExecutionWorkspaceDetail.tsx
  ui/src/pages/ProjectWorkspaceDetail.tsx ui/src/pages/workspace-copy.test.ts
  ui/src/components/IssueRunLedger.tsx
  ui/src/components/IssueRunLedger.test.tsx docs/dearme/BUILD-STATE.md`
  returned clean after this documentation update.

Completed the twenty-seventh verified DearMe slice: setup, admin, model, and
environment surfaces now avoid visible provider wording for OpenCode model
selection, sandbox environment setup, secret storage, and the accounting
explainer while preserving internal provider fields and sandbox capability
contracts.

Setup/admin provider-copy polish details:

- Reworded the OpenCode adapter display from `Local multi-provider agent` to
  broad model-support language.
- Reworded OpenCode model validation and empty model-selection hints from
  `provider/model` to `source/model` language.
- Reworded sandbox environment setup from provider/plugin/test-provider copy to
  runner plugin, sandbox source, and test-sandbox language.
- Reworded default secret-field help so it points to the DearMe secret store
  instead of a Paperclip secret-provider surface.
- Reworded accounting explanations from visible provider language to
  model-source quota and reporting language.
- Added focused adapter-display and company-environment regressions to guard
  the removed visible provider copy.

Setup/admin provider-copy polish verification:

- `pnpm exec vitest ui/src/pages/CompanySettings.test.tsx
  ui/src/adapters/adapter-display-registry.test.ts --run` passed: 2 files, 4
  tests. The existing jsdom canvas warning still appears in
  `CompanySettings.test.tsx`.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `Local multi-provider agent`,
  `provider/model format`, `Enter a provider/model manually`, secret-provider
  help, old accounting provider phrases, sandbox-provider copy, `Test
  provider`, and the old provider schema empty state returned no matches in
  the touched production files.
- `git diff --check -- ui/src/adapters/adapter-display-registry.ts
  ui/src/adapters/adapter-display-registry.test.ts
  ui/src/components/AccountingModelCard.tsx
  ui/src/components/AgentConfigForm.tsx ui/src/components/JsonSchemaForm.tsx
  ui/src/components/OnboardingWizard.tsx
  ui/src/pages/CompanyEnvironments.tsx
  ui/src/pages/CompanySettings.test.tsx ui/src/pages/NewAgent.tsx
  docs/dearme/BUILD-STATE.md` returned clean after this documentation update.

Completed the twenty-sixth verified DearMe slice: the Costs accounting surface
no longer exposes visible customer-facing provider wording in model-spend and
biller breakdowns while preserving the existing internal cost-provider
contracts.

Cost-surface provider-copy polish details:

- Reworded the main Costs tab from `Providers` to `Model spend`, keeping the
  internal tab value and query gating unchanged.
- Reworded the model-spend aggregate tab from `All providers` to `All model
  sources`.
- Reworded the budget control-plane description so subscription quota points to
  `Model spend` instead of `Providers`.
- Reworded biller cards from visible provider counts and `Upstream providers`
  headings to model-source language.
- Reworded model breakdown tooltip titles from provider-token/provider-cost
  language to model-source token and cost language.
- Added a focused Costs page regression that exercises the model-spend and
  biller tabs and guards the removed visible copy.

Cost-surface provider-copy polish verification:

- `pnpm exec vitest ui/src/pages/Costs.test.tsx --run` passed: 1 file, 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Focused production stale-copy scan for `All providers`, `Providers`,
  `Provider subscription quota`, `provider tokens`, `provider cost`, `Upstream
  providers`, and the old provider-count render fragment returned no matches in
  the touched production cost files.
- `git diff --check -- ui/src/pages/Costs.tsx ui/src/pages/Costs.test.tsx
  ui/src/components/ProviderQuotaCard.tsx
  ui/src/components/BillerSpendCard.tsx docs/dearme/BUILD-STATE.md` returned
  clean after this documentation update.

Completed the twenty-fifth verified DearMe slice: remaining visible provider
wording in the user profile usage card and issue run metadata now uses
product-safe model and runner language while preserving the existing billing and
runtime field contracts.

Provider-copy leakage polish details:

- Reworded the user profile usage card from `Provider mix` to `Model and spend
  mix`.
- Reworded the empty usage state from `No provider usage attributed yet.` to
  `No model usage attributed yet.`.
- Reworded user profile billing attribution from `Billed through ...` to
  `Billed via ...`, while keeping internal `topProviders`, `provider`, and
  `biller` response fields unchanged.
- Reworded comment thread run environment metadata from visible `Provider ...`
  copy to `Runner ...`, while keeping the runtime lease `provider` field
  unchanged.
- Added focused regressions for both surfaces so the rendered copy stays
  product-safe even though internal API and runtime contracts still carry
  provider-shaped field names.

Provider-copy leakage polish verification:

- `pnpm exec vitest ui/src/pages/UserProfile.test.tsx ui/src/components/CommentThread.test.tsx --run`
  passed: 2 files, 8 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm test:run` passed. The run included the UI shard at 141 files and 823
  tests passed, the parallel server shard at 148 files with 995 tests passed
  and 1 skipped, and the serialized server shard completed successfully.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed. Existing non-blocking Vite warnings remain for the mixed
  dynamic/static `MarkdownEditor` import and large output chunks.
- Focused stale-provider-copy scan for `Provider mix`, `No provider usage
  attributed yet`, `Billed through`, and the old comment-thread provider label
  returned no matches in the touched UI files.
- Rendered-string/domain scan for stale Paperclip/OpenClaw labels, old domains,
  old examples, gateway placeholders, and the removed provider phrases returned
  only `ui/src/components/IssueChatThread.tsx:42`, the known internal
  `PaperclipIssueRuntimeReassignment` type-import false positive.
- Final `git diff --check` returned clean after this documentation update.

Completed the twenty-fourth verified DearMe slice: visible teammate-invite and
hire-agent approval copy no longer exposes OpenClaw product labels or raw
adapter ids while preserving the existing gateway contract keys.

Product-label leakage polish details:

- Reworded the company settings invite controls from OpenClaw-specific labels
  to remote teammate invite language.
- Reworded the generated invite prompt to describe a remote teammate gateway
  while keeping the required compatibility fields such as
  `adapterType: "openclaw_gateway"` and
  `agentDefaultsPayload.headers["x-openclaw-token"]`.
- Replaced visible OpenClaw gateway adapter display labels with remote gateway
  wording and removed stale OpenClaw/Paperclip placeholders from the gateway
  config help.
- Replaced hire-agent approval payload display of raw `adapterType` values with
  customer-safe run-method labels such as `Local workspace` and `Remote
  gateway`.
- Generalized agent config help text that previously named specific local
  provider runtimes in visible tooltip copy.

Product-label leakage polish verification:

- `pnpm exec vitest ui/src/components/ApprovalPayload.test.tsx ui/src/pages/CompanySettings.test.tsx --run`
  passed: 2 files, 9 tests. The existing jsdom canvas warning still appears in
  `CompanySettings.test.tsx`.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm test:run` passed. The run included the UI shard at 140 files and 821
  tests passed, the parallel server shard at 148 files with 995 tests passed
  and 1 skipped, and the serialized server shard completed all 81 suites; the
  existing jsdom canvas warning and noisy server fixture logs remain
  non-blocking.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed. Existing non-blocking Vite warnings remain for the mixed
  dynamic/static `MarkdownEditor` import and large output chunks.
- Focused stale-copy scan for the removed OpenClaw invite phrases and adapter
  help copy returned no matches in UI tests.
- Final hygiene scans after ASCII placeholder normalization passed:
  `git diff --check` returned clean, the touched-file ASCII scan returned no
  matches, and the focused stale-copy UI test scan stayed empty.
- Rendered-string/domain scan for stale Paperclip/OpenClaw labels, old
  domains, old examples, and old gateway placeholders returned only
  `ui/src/components/IssueChatThread.tsx:42`, the known internal
  `PaperclipIssueRuntimeReassignment` type-import false positive.

Completed the twenty-third verified DearMe slice: issue-detail transcript
hydration no longer emits a cancelled-run `/heartbeat-runs/.../log` 404 for
terminal runs that explicitly have no stored output.

Cancelled-run log polish details:

- Updated `useLiveRunTranscripts` to skip persisted-log hydration only when a
  run is terminal, `hasStoredOutput` is explicitly `false`, and no positive
  `logBytes` or `lastOutputBytes` value is known.
- The skip marks the run hydrated so the issue thread does not hang on initial
  loading, but it does not permanently blacklist the run. If later metadata
  reports stored output, the hook will fetch the log normally.
- Kept the existing behavior for terminal runs with unknown metadata: they
  still try the log endpoint once and then stop retrying on a 404.

Cancelled-run log polish verification:

- `pnpm exec vitest ui/src/components/transcript/useLiveRunTranscripts.test.tsx --run`
  passed: 1 file, 8 tests. The new regression proves explicit
  `hasStoredOutput: false` terminal runs do not call `heartbeatsApi.log`, clear
  initial hydration, and fetch normally once positive output metadata appears.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- The Browser Use skill was installed, but the required Node REPL `js` tool was
  unavailable after tool discovery; Playwright was used as the browser fallback.
- Browser Review-click smoke on the fresh active-output company opened
  `/DEAAAAAAA/dearme`, clicked the `Content drafts` Review action, navigated to
  `/DEAAAAAAA/issues/DEAAAAAAA-3`, and rendered the issue reference, title
  `DearMe Draft: Draft first content batch`, and `CONTENT-BATCH-1` document.
- Browser diagnostics for that pass recorded zero same-origin failed responses,
  zero run-log failures, zero request failures, zero console errors, and zero
  resource console errors. Screenshot:
  `/tmp/dearme-run-log-404-issue-detail-1778153998760.png`.
- Server traffic during the Review-click pass fetched the content run log
  `c71567ae-b1c2-4102-97d0-17c83cad9065` successfully and did not request the
  cancelled recovery run log
  `9d83bca0-ffa2-40ac-9da0-1bcfa2dc78d6`.

The twenty-second verified DearMe slice remains intact: a fresh active paid-beta
customer now has real generated output visible on `/dearme`, with desktop,
mobile, and Review-click browser evidence.

Fresh active paid-beta lifecycle smoke:

- Started `pnpm dev` with local-trusted auth at `http://127.0.0.1:3100`,
  embedded PostgreSQL on port `54329`, and healthy `/api/health`.
- Created fresh fake customer company
  `ceb91b77-68a9-4075-b662-cfbe34e3ae93`,
  `DearMe Active Output Smoke 20260507112307`, issue prefix `DEAAAAAAA`.
- Recorded a manual paid-beta payment through the DearMe paid access route.
  Final access was `active`, amount `37500` cents, invoice
  `DACTIVE-20260507112307`, and the `/dearme` page rendered `Paid beta
  active`, `$375` lifetime paid, `$375` remaining credit, and `1` payment.
- Created Brand OS approval `0481af14-6da5-414a-ae32-1da7f10d4f05`, which
  seeded the DearMe Brand OS review plus voice, content, opportunity,
  portfolio, and weekly-report outputs.
- Manually invoked the content agent run
  `c71567ae-b1c2-4102-97d0-17c83cad9065`; recovery also queued bounded run
  `9d83bca0-ffa2-40ac-9da0-1bcfa2dc78d6` before the content output became
  reviewable.
- Final `GET /api/dearme/companies/ceb91b77-68a9-4075-b662-cfbe34e3ae93/outputs`
  returned six customer-visible output surfaces:
  `brand_os` ready for review with issue `DEAAAAAAA-1` and 2 docs,
  `voice_profile` ready for review with issue `DEAAAAAAA-1` and 1 doc,
  `content_drafts` ready for review with issue `DEAAAAAAA-3` and 1 doc,
  `opportunity_drafts` queued with issue `DEAAAAAAA-4`,
  `portfolio_update` queued with issue `DEAAAAAAA-5`, and `weekly_report`
  ready for review with issue `DEAAAAAAA-6` and 1 doc.
- Content output `DEAAAAAAA-3`, `0ce15bad-2067-45e9-8638-230590ff7d48`,
  showed document preview `Content Batch 1 Private Drafts These drafts are
  private and review ready...`; the issue API returned title
  `DearMe Draft: Draft first content batch`, status `in_progress`, and the
  attached `content-batch-1` document.
- Cleanup cancelled runs `9d83bca0-ffa2-40ac-9da0-1bcfa2dc78d6` and
  `c71567ae-b1c2-4102-97d0-17c83cad9065`, terminated all 7 fresh DearMe agents
  for the approval, and verified
  `GET /api/companies/ceb91b77-68a9-4075-b662-cfbe34e3ae93/live-runs?minCount=0&limit=100`
  returned `[]`.

Fresh active output browser verification:

- The Browser Use skill was installed, but the required Node REPL `js` tool was
  unavailable after tool discovery; Playwright was used as the browser fallback.
- Desktop browser `1440x1000` rendered `/DEAAAAAAA/dearme` with `Paid beta
  active`, `Private work ready`, and the `Content drafts` card in `Ready for
  review`.
- Clicking the `Content drafts` Review action navigated to
  `/DEAAAAAAA/issues/DEAAAAAAA-3` and rendered the issue title, issue
  reference, and `content-batch-1` document.
- Mobile browser `390x844` rendered the same active paid-beta state and private
  work cards.
- Screenshots:
  `/tmp/dearme-active-output-desktop-20260507112307-verified.png`,
  `/tmp/dearme-active-output-click-20260507112307.png`, and
  `/tmp/dearme-active-output-mobile-20260507112307.png`.
- This slice originally exposed one same-origin 404 after the Review click for
  cancelled recovery run
  `9d83bca0-ffa2-40ac-9da0-1bcfa2dc78d6`; the twenty-third slice fixed that
  issue-detail log hydration path and re-ran the Review-click browser check
  cleanly.

The twenty-first verified DearMe slice remains intact: generated Brand OS,
voice, draft, opportunity, portfolio, and report work now appears on `/dearme`
as customer-visible private work cards.

Generated-output handoff details:

- Added a shared DearMe output contract for output kind, status, issue link,
  customer-visible summary, preview text, public document metadata, and safe work
  product metadata. Provider/runtime internals are deliberately excluded from
  the response schema.
- Added `GET /api/dearme/companies/:companyId/outputs` behind existing company
  access checks. The endpoint reads DearMe Brand OS seeded issues, issue
  documents, work products, and latest agent-authored comments, then maps the
  six known operation outputs to `brand_os`, `voice_profile`, `content_drafts`,
  `opportunity_drafts`, `portfolio_update`, and `weekly_report`.
- The handoff service hides system-only issue documents, hidden issues, and
  non-DearMe issue origins. It validates the final payload with the shared
  schema before returning it to the UI.
- Added a `/dearme` `Private work ready` panel with loading, error, empty, and
  populated states. Output cards show status, summary, preview text, document
  count, and an Open action that navigates to the existing issue detail page.

Generated-output handoff verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx` passed: 5 files, 26 tests.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed: the parallel shard reported 148 files passed and 995
  tests passed with 1 skipped; the serialized shard completed 81 suites; the
  command exited 0.
- `pnpm build` passed. Existing non-blocking Vite warnings remain for the mixed
  dynamic/static `MarkdownEditor` import and large output chunks.
- `git diff --check` passed before this docs update.
- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`,
  embedded PostgreSQL on port `54329`, and healthy `/api/health`.
- The Browser Use skill was available, but the required Node REPL `js`
  execution tool was not exposed after tool discovery; Playwright was used as
  the browser fallback.
- API smoke against company `60334302-c360-4e9f-8e98-d6e42815217e`, issue prefix
  `DEAA`, returned 6 outputs with kinds `brand_os`, `voice_profile`,
  `content_drafts`, `opportunity_drafts`, `portfolio_update`, and
  `weekly_report`.
- Desktop browser `1440x1000` rendered `/DEAA/dearme` with `Private work ready`
  cards for Brand OS, Voice profile, Content drafts, Opportunity drafts,
  Portfolio updates, and Dear me report. Clicking Open navigated to
  `/DEAA/issues/DEAA-68` and rendered the issue detail/document surface.
- Mobile browser rendered the same private work cards and Open actions.
- Browser diagnostics recorded zero console events. Screenshots:
  `/tmp/dearme-output-handoff-desktop.png`,
  `/tmp/dearme-output-handoff-click.png`, and
  `/tmp/dearme-output-handoff-mobile.png`.

The twentieth verified DearMe slice remains intact: the weekly report reviewer
panel has rendered desktop/mobile browser evidence, including the attached
`dear-me-report` document, reviewer decision controls, and a non-mutating
Request changes check.

Weekly report reviewer rendered browser smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`,
  embedded PostgreSQL on port `54329`, and healthy `/api/health`.
- The Browser skill was installed, but the required Node REPL browser execution
  tool was unavailable after tool discovery; Playwright was used as the browser
  fallback.
- Reused live report issue `DEAA-109`,
  `e9d5c664-ca35-4f80-bbd3-9d300e084c7b`, at
  `http://127.0.0.1:3100/DEAA/issues/DEAA-109#document-dear-me-report`.
- API preflight confirmed status `in_review`, reviewer assignment
  `local-board`, document key `dear-me-report`, title `Dear me report`, latest
  revision number `4`, latest revision
  `f24609d6-1d68-43cc-bd3d-7b5669819b1a`, and body heading
  `# Dear me report: Report Review revise-1778144399`.
- Desktop browser `1440x1000` rendered the Documents section, `dear-me-report`
  pill, `Dear me report` title, report markdown body, `rev 4`, and reviewer
  controls `Accept draft`, `Request changes`, and `Reject draft`.
- The smoke clicked `Request changes`, filled `Revision notes` with
  `Tighten proof bullets before customer delivery.`, verified `Send changes`
  became enabled, and cancelled without submitting a reviewer mutation.
- Mobile browser `iPhone 13` rendered the same report document and reviewer
  controls.
- Browser diagnostics recorded zero console errors, zero page errors, and zero
  failed same-origin responses after constraining markdown issue-reference
  auto-linking to the active issue/company prefix. That keeps `DEAA-109`
  linkable while leaving report prose tokens such as `STAGE-2`, UUID fragments,
  and `REVISE-1778144399` as plain text instead of noisy `/api/issues/*` 404s.
- Screenshots:
  `/tmp/dearme-report-review-desktop-1778150823112.png`,
  `/tmp/dearme-report-review-desktop-request-changes-1778150823112.png`, and
  `/tmp/dearme-report-review-mobile-1778150823112.png`.

The nineteenth verified DearMe slice remains intact: DearMe now has a manual
paid-beta access path backed by the existing finance ledger.

Closed the host-dependent full-suite blocker exposed after this slice: the CLI
network-bind/onboard tests now mock `tailscale ip -4` instead of depending on
whether Peter's Mac currently has a Tailscale address. Production auto-detect
behavior remains unchanged.

Paid-beta access details:

- Added shared DearMe paid-beta contracts for the manual payment record and the
  visible access status: trial versus active, lifetime paid value, refunded
  value, net paid value, remaining customer credit, event count, latest payment
  date, latest receipt note, and latest invoice id.
- Added a DearMe paid-beta service that derives access from `finance_events`
  scoped to biller `dearme_paid_beta`, avoiding a second billing ledger or early
  Stripe Connect dependency.
- Added `GET /api/dearme/companies/:companyId/paid-beta/access` with company
  access checks and `POST /api/dearme/companies/:companyId/paid-beta/access-events`
  with company access, board-only write access, validation, finance-event
  creation, and `dearme.paid_beta_payment_recorded` activity logging.
- Added DearMe onboarding UI for paid beta status and manual payment recording.
  It shows customer-facing paid/trial state, lifetime paid, remaining credit,
  payment count, latest receipt date, explicit failure messages, and invalidates
  DearMe paid access, finance summary/events, and activity after recording a
  payment.
- Updated the product/reuse docs to lock the P0 contract: manual customer
  payment records unlock paid beta through the shared finance ledger, while
  Stripe Connect and hosted checkout stay out of P0.

Paid-beta verification:

- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-paid-beta-access.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run` passed: 5 files, 22 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed after fixing a type-only import syntax issue in `ui/src/api/dearme.ts`.
- `pnpm exec vitest cli/src/__tests__/network-bind.test.ts cli/src/__tests__/onboard.test.ts --run` passed: 2 files, 12 tests, with Tailscale probing isolated from host network state.
- `pnpm test:run` passed after the CLI test-harness cleanup.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Existing non-blocking Vite warnings remain for the mixed dynamic/static `MarkdownEditor` import and large output chunks.

Fake-customer paid-beta browser/API smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `GET /api/health` returned `status: ok`, `version: 0.3.1`, `deploymentMode: local_trusted`, `deploymentExposure: private`, `authReady: true`, and `bootstrapStatus: ready`.
- The Browser Use plugin path was unavailable for this pass because the Browser plugin tools were not exposed after tool discovery; Playwright was used as the browser fallback.
- Fresh fake customer company `8405bb27-ba0a-40a7-b4fd-c59238b4fe0d`, `DearMe Paid Journey 1778149599911`, issue prefix `DEAAAAAA`, loaded at `http://127.0.0.1:3100/DEAAAAAA/dearme`.
- Initial `GET /api/dearme/companies/8405bb27-ba0a-40a7-b4fd-c59238b4fe0d/paid-beta/access` returned `status: trial`, `netPaidCents: 0`, `remainingCreditCents: 0`, and `eventCount: 0`.
- Desktop browser `1440x1000` loaded the DearMe onboarding page, showed the Paid beta access panel in trial state, submitted `$375` with receipt note `Founding beta payment - browser smoke`, and rendered `Paid beta active`, `$375` lifetime paid, `$375` remaining credit, `1` payment, and receipt date `May 7, 2026`.
- Mobile browser `iPhone 13` loaded the same company page and rendered the paid-beta active state with `$375` lifetime paid and `$375` remaining credit.
- Final `GET /api/dearme/companies/8405bb27-ba0a-40a7-b4fd-c59238b4fe0d/paid-beta/access` returned `status: active`, `lifetimePaidCents: 37500`, `netPaidCents: 37500`, `remainingCreditCents: 37500`, `eventCount: 1`, `latestPaymentDescription: Founding beta payment - browser smoke`, and `latestExternalInvoiceId: DBETA-1778149599911`.
- `GET /api/companies/8405bb27-ba0a-40a7-b4fd-c59238b4fe0d/costs/finance-events?limit=5` returned finance event `bb777196-cfd0-4e21-b70f-21f4a9f218c8` with `biller: dearme_paid_beta`, `eventKind: credit_purchase`, `direction: credit`, `amountCents: 37500`, and invoice `DBETA-1778149599911`.
- `GET /api/companies/8405bb27-ba0a-40a7-b4fd-c59238b4fe0d/activity?limit=10` included `dearme.paid_beta_payment_recorded`.
- Browser diagnostics recorded zero console errors, zero page errors, and zero failed same-origin responses.
- Screenshots: `/tmp/dearme-paid-beta-desktop-before-1778149599911.png`, `/tmp/dearme-paid-beta-desktop-after-1778149599911.png`, and `/tmp/dearme-paid-beta-mobile-after-1778149599911.png`.

Clean-install/local-app verification:

- Isolated app root: `/tmp/dearme-clean-local.CNG6u6`, with `PAPERCLIP_HOME=/tmp/dearme-clean-local.CNG6u6/paperclip-home` and `PAPERCLIP_INSTANCE_ID=dearme-clean`.
- The first fully isolated `pnpm paperclipai onboard --yes --data-dir /tmp/dearme-clean-local.CNG6u6/paperclip-home` attempt failed before Paperclip startup because the temporary `HOME` did not contain pnpm's tool-cache path for `pnpm@9.15.4`. No Paperclip config had been written yet; this was a harness/pnpm shim issue, not an app startup failure.
- Re-running the same first-run app path through the repo-local CLI entrypoint with the same isolated Paperclip home completed onboarding, wrote `/tmp/dearme-clean-local.CNG6u6/paperclip-home/instances/dearme-clean/config.json`, created `.env`, set `PAPERCLIP_AGENT_JWT_SECRET`, created `secrets/master.key`, passed doctor 9/9, initialized embedded PostgreSQL at isolated port `54329`, applied 78 migrations, started local-trusted/private loopback server `127.0.0.1:3100`, and reported `Agent JWT set`.
- Clean instance health returned `{"status":"ok","version":"0.3.1","deploymentMode":"local_trusted","deploymentExposure":"private","authReady":true,"bootstrapStatus":"ready","bootstrapInviteActive":false,"features":{"companyDeletionEnabled":true}}`.
- Fresh clean-instance fake customer company `3ba953c0-380b-4326-8c83-380e37b46e16`, `DearMe Paid Journey 1778149943365`, issue prefix `DEA`, loaded at `http://127.0.0.1:3100/DEA/dearme`.
- The clean fake-customer journey moved paid-beta access from `trial` to `active` by recording `$375` with receipt note `Founding beta payment - browser smoke` and invoice `DBETA-1778149943365`.
- Final clean-instance access returned `lifetimePaidCents: 37500`, `netPaidCents: 37500`, `remainingCreditCents: 37500`, `eventCount: 1`, latest receipt note `Founding beta payment - browser smoke`, and latest invoice `DBETA-1778149943365`.
- The clean instance created finance event `858f27fa-1059-4503-818a-fc6be2fd17a8` with `biller: dearme_paid_beta`, `eventKind: credit_purchase`, `direction: credit`, `amountCents: 37500`, and invoice `DBETA-1778149943365`; activity included `dearme.paid_beta_payment_recorded`.
- Clean browser diagnostics recorded zero console errors, zero page errors, and zero failed same-origin responses. Screenshots: `/tmp/dearme-paid-beta-desktop-before-1778149943365.png`, `/tmp/dearme-paid-beta-desktop-after-1778149943365.png`, and `/tmp/dearme-paid-beta-mobile-after-1778149943365.png`.
- After stopping the first-run server, actual `pnpm paperclipai run --data-dir /tmp/dearme-clean-local.CNG6u6/paperclip-home --instance dearme-clean` was verified against the same isolated home. It passed doctor 9/9, reused the initialized embedded PostgreSQL cluster, reported migrations already applied, served `http://127.0.0.1:3100`, returned the same healthy `/api/health` payload, and shut down with no remaining listeners on `3100` or `54329`.

The eighteenth slice remains intact: runtime/admin DearMe product-label leakage
was reduced across patched UI surfaces, and the targeted rendered-string scan
still only found the internal `PaperclipIssueRuntimeReassignment` type import
false positive in the scanned production UI surface.

The sixteenth slice remains intact: generated content now has live API proof that an active-author reviewer revision wakes the same content agent, produces revised private output, and returns the issue to `in_review`.

Generated content reviewer revise live smoke:

- Fresh approval `6c370c67-4fe1-422d-a243-832f289003dd` created generated content issue `DEAA-112`, `73d7c704-383c-432a-8dce-29d235eb6b4f`, and content agent `b35fbd64-f5d5-48bf-b5aa-887297ca7e36`.
- The initial content run `8b8ed084-80c4-47d1-b833-b9cb6d42e831` succeeded, posted agent-authored draft comment `352bc4f6-987f-409a-9d2e-6deb41efdc9e`, and moved `DEAA-112` to `in_review` for reviewer `local-board`.
- Reviewer revision comment `562690a9-13b3-412a-8948-aba0228bb3a5` moved `DEAA-112` back to `todo`, assigned the same active content agent, and cleared the reviewer assignment.
- The revision assignment run `ac74d4b6-be19-4c49-a9a2-71108088462f` handled the reviewer note, updated the private draft artifact, and posted revised-output comment `f7f6a552-9012-41d4-94c1-e4d4d86b52da`.
- Bounded liveness continuations `c8925e4d-5a82-4194-b978-481bea82ad21` and `c1ff0a7c-c3a7-48f5-8dff-6c4a6c71d538` produced concrete in-review submission packets, after which recovery returned `DEAA-112` to `in_review`, cleared `assigneeAgentId`, and assigned reviewer `local-board`.
- Cleanup terminated all 7 fresh DearMe agents for the approval, left no company live runs, and left no matching `codex exec --json` child processes.

The fifteenth slice remains intact: the weekly report reviewer loop has live API proof for accept, reject, and revise against the `dear-me-report` document, and the attached-document prompt gives workers a shell-safe Authorization-header pattern for document PUT calls.

Weekly report reviewer live smoke:

- Accept reused already-reviewable report issue `DEAA-97`, `f5967bf6-c524-4c16-a509-63de9c8a1608`. The reviewer PATCH moved it from `in_review` to `done`, cleared both assignees, left `dear-me-report` at revision 2 with latest revision `c4dcef9e-b05a-4ee1-a2cd-0b9b129513ca`, and left no live runs behind.
- Reject created fresh approval `2ca6835f-7b46-4f19-99e5-dfa9abae3c63`, report issue `DEAA-103`, `f4dde237-c474-42c8-9285-0bf52315fa07`, and report run `2c13841c-f76b-4087-9039-0cf6d1c861bf`. The run advanced the attached report to revision 2 with latest revision `a058b864-7887-4685-bd92-13b1dd400ef7`; the reviewer PATCH then moved the issue to `cancelled`, cleared both assignees, created no extra document revision, and left no live runs behind.
- Revise created fresh approval `338871e5-ee1b-4f6e-be14-a05cc6bc7884`, report issue `DEAA-109`, `e9d5c664-ca35-4f80-bbd3-9d300e084c7b`, initial report run `81c0007d-50cf-41cf-9c2a-a70effaf66c5`, and revised report run `d8bdbbea-ee88-4391-af7b-b36d511aeb67`. The reviewer PATCH returned the issue to the same Growth Analyst, the revised run saw the revision request plus attached document context, advanced the report from revision 2 to revision 3, and returned the issue to `in_review` with reviewer `local-board`.
- That first revise smoke exposed a worker-shell rough edge: the worker's generated curl command split the Authorization header and relied on local-trusted fallback even though it still produced a new document revision. The task markdown now explicitly says to keep `Authorization: Bearer $PAPERCLIP_API_KEY` as one quoted header argument and provides a concrete `api_headers` curl pattern.
- After the prompt hardening, a second revision request on `DEAA-109` used run `de12633c-0fc0-45cf-8c2d-9112127e2f32`. The run prompt contained the shell-safe curl pattern, used base revision `00b6b665-adcf-4312-9c3a-10d312510df4`, completed one command execution with exit code 0, had zero Authorization/header failure matches, advanced the report to revision 4 with latest revision `f24609d6-1d68-43cc-bd3d-7b5669819b1a`, recorded `updatedByAgentId: 57ca1ac4-2c11-489a-8e32-53e66367c746`, returned `DEAA-109` to `in_review` for `local-board`, and left no live runs behind.

The fourteenth slice remains intact: the weekly report lane performs an actual private report document writeback, hands the result to review, and no longer misclassifies report approval wording as a blocker.

Heartbeat task context now includes attached issue documents, including document key, title, format, latest revision id, revision number, and current body. When an assignment asks for an attached-document update, the worker receives the exact Paperclip update protocol: use `$PAPERCLIP_API_URL`, send `$PAPERCLIP_API_KEY` authorization as one quoted header argument when present, call `PUT "$PAPERCLIP_API_URL/api/issues/<issueId>/documents/<documentKey>"`, pass `baseRevisionId`, and treat the attached document as the durable output instead of substituting a workspace file or issue comment.

DearMe-created Codex workers now keep the existing confined workspace boundary while allowing access back to the local Paperclip API: `--sandbox workspace-write -c sandbox_workspace_write.network_access=true --skip-git-repo-check`. A controlled Codex child probe proved that exact config can call `http://127.0.0.1:3100/api/health` without re-enabling sandbox bypass.

The liveness classifier now treats durable document revisions or work products as concrete progress when the run asks for review/approval, while preserving true external blockers and explicit `blocked` issue status. This prevents a weekly report run that updated the attached document and asked for approval before external sharing from being marked `blocked`.

A fresh live smoke proved the full report writeback path. Approval `b2bb8a9d-649c-48dc-b398-afac8efaeb62` created report issue `DEAA-97`; run `d33bd4d1-45d8-4398-9740-9d43f9064a16` succeeded with `exitCode: 0`, updated the attached `dear-me-report` document from revision 1 to revision 2, wrote latest revision `c4dcef9e-b05a-4ee1-a2cd-0b9b129513ca`, classified liveness as `advanced`, and handed the issue to reviewer `local-board` in `in_review` with no live runs left behind.

The thirteenth slice remains intact: the weekly report lane creates a concrete private report artifact instead of only seeding a scheduling task.

Brand OS apply attaches a `dear-me-report` markdown document to the weekly-report issue. The seeded document gives the Growth Analyst a customer-facing report workspace with sections for work completed, reviewable drafts/assets, decisions needed, outcomes/signals, budget/credits, and next bets. The report issue is titled `DearMe Draft: Draft weekly Dear me report`, and its instructions tell the worker to update the attached report document, cite issue/document evidence for concrete claims, and keep the report private.

The shared Brand Blueprint execution plan still keeps the stable operation id `schedule_weekly_report`, but the user-facing operation title and description now describe report drafting rather than scheduler setup. This keeps the existing approval payload shape and operation order intact while making the paid-beta promise, "Receive a weekly Dear me report", visible in the work queue and issue-document surface.

The twelfth slice remains intact: generated content that lands in `in_review` now has a controlled reviewer decision path for accept, assignable-author revise, unavailable-author revise blocking, and reject.

The issue detail page now renders a reviewer decision panel when an issue is `in_review` and the signed-in user is the assigned reviewer or a tree-control manager. Accept moves the issue to `done`, clears assignments, and records a private-use acceptance comment. Request changes requires reviewer notes, finds the latest assignable agent-authored draft comment, moves the issue back to `todo`, assigns that agent, clears the reviewer assignment, and records revision instructions. If the latest draft author is no longer assignable, the panel explains that the draft author is no longer available and disables the send action instead of submitting a PATCH that the API will reject. Reject moves the issue to `cancelled`, clears assignments, and records the rejection comment.

The review decision flow deliberately reuses the existing issue update route, issue comments, status transitions, cache merge/invalidation path, assignment-change wakeup, and assignable-agent guardrails. That means a revision request wakes the same content agent through the existing `todo` assignment dispatch path when that author can still receive work, instead of adding a DearMe-only review queue or scheduler.

The eleventh slice remains intact: liveness/recovery now stops as soon as the latest productive run leaves durable reviewable output, instead of queuing one extra low-value continuation first.

The recovery sweep checks every productive successful `in_progress` terminal run for durable reviewable output before it considers a stranded-work continuation retry. If the run created an assignee-authored issue comment, a non-continuation-summary issue document revision, or an issue work product, and an active company user can review it, the source issue moves directly to `in_review`, clears the agent assignment and execution locks through the existing issue service, assigns the reviewer, and records a system handoff comment. Productive runs without durable reviewable output still keep the existing bounded recovery behavior.

The tenth slice remains intact: Brand OS apply now gates first-operation auto-run so approving onboarding does not start the whole seeded team at once.

The onboarding `autoDraftEnabled` toggle is now persisted into the Brand OS approval payload. With auto-draft enabled, only `draft_content_batch` is created as `todo`, which is the status Paperclip recovery/assignment wakeups dispatch automatically. The Brand OS review issue plus voice, opportunity, portfolio, and report first-operation issues stay assigned but queued as `backlog`. With auto-draft disabled, all six seeded Brand OS work issues stay `backlog`.

A fresh live smoke after the auto-run gate proved the dispatch boundary end to end. Approval `36e61ca3-0a28-4599-804f-fe45420ea376` created Brand OS issues `DEAA-62` through `DEAA-67`. Only content issue `DEAA-64`, `73912f5e-0915-4e68-b8c6-74b09d5a39a3`, moved from `todo` to `in_progress` with run `9aab8711-c954-477f-b3cf-e7f487cd981a`. The Brand OS review, voice, opportunity, portfolio, and report issues stayed `backlog` and did not create live runs.

The ninth slice remains intact: productive continuation recovery now hands reviewable DearMe output to a human reviewer instead of blocking the source issue and creating a stranded-work recovery issue.

A fresh live smoke after the recovery patch proved the handoff end to end. Approval `bc3f2eab-e675-4b2c-960a-54ca7bd3b5c7` created content issue `DEAA-58`, `16a74ecf-886b-4b16-8230-771c15caff24`, assigned to content agent `d205fe83-0a08-46a8-96dd-eca2ec604147`. After a productive bounded retry posted reviewable issue output, recovery moved `DEAA-58` to `in_review`, cleared the agent assignment, assigned reviewer `local-board`, and created zero related stranded-recovery issues.

The earlier recovery sweep checked whether the latest bounded productive retry created durable reviewable output. The eleventh slice moved that check earlier so first productive output can hand off immediately instead of spending another run/comment proving the same thing.

A fresh live smoke after the earlier-stop patch proved the exact previously chatty loop now stops cleanly. Approval `a1229131-632d-49ce-a29f-453e640481e6` created Brand OS issues `DEAA-68` through `DEAA-73`. Only content issue `DEAA-70`, `6c994ac1-aa42-4a87-9761-41f46bffe686`, ran. Its single assignment run `6713c236-b81b-47b3-abe7-c2c96d1971fe` succeeded, posted assignee-authored issue output, and recovery moved the issue directly to `in_review` with reviewer `local-board`. No second run and no `issue.productive_terminal_continuation_recovery` run were created.

The eighth slice remains intact: `codex_local` issue wakes now include Paperclip task context, so seeded DearMe Codex workers receive the full issue description, DearMe operation boundary, content scope, and repo-source prohibition.

Before that slice, Paperclip heartbeat assembled detailed issue context into `context.paperclipTaskMarkdown`, but the Codex local adapter only sent wake summary/title sections. The adapter now inserts the task context before the heartbeat prompt and records `promptMetrics.taskContextChars`, matching the shape already used by the other local adapters.

The latest runtime smoke proved the content producer received the DearMe task context and produced customer-facing private content in the issue thread instead of silently spinning. That smoke exposed the recovery bug fixed in the later handoff slices: liveness/recovery incorrectly marked the productive content issue as stranded after two successful content runs and created a recovery issue.

The seventh slice remains intact: newly approved DearMe Brand OS apply requests now confine seeded Codex workers to agent-default workspaces and remove sandbox bypass from the DearMe runtime path.

New DearMe-created agents and first-operation issues now force `codex_local` to run with `dangerouslyBypassApprovalsAndSandbox: false`, pass `--sandbox workspace-write --skip-git-repo-check`, and set issue-level `assigneeAdapterOverrides.useProjectWorkspace: false`. The apply service also records `executionWorkspaceSettings.mode: agent_default` so isolated-workspace-enabled deployments persist the same execution boundary at the issue layer.

The sixth slice remains intact: newly approved DearMe Brand OS apply requests give draft agents an explicit DearMe operation boundary, and the first-content-batch issue describes personal-brand content output instead of leaving the worker to infer the product.

The earlier onboarded runtime smoke proved the local agent JWT path after `pnpm paperclipai onboard --yes`, and it proved DearMe-created `codex_local` agents can authenticate, call the local API, create documents/comments, and write private workspace artifacts. It also exposed why stronger operation boundaries were necessary: pre-guardrail first-operation agents could treat DearMe work as codebase maintenance, edit repo source/test files, generate generic message-writing copy, and continue no-op review loops.

The new draft issue instructions now say the operation is customer-facing DearMe personal-brand work, not Paperclip/DearMe codebase maintenance; outputs belong in the issue thread, attached documents, or agent workspace; and workers must not modify repository source, tests, package files, config, docs, or local product code while completing the operation.

The fifth slice remains intact: newly approved DearMe Brand OS apply requests seed runnable local agents through Paperclip's existing `codex_local` adapter instead of creating blank `process` agents.

This fixes the immediate runtime blocker for new approvals: the local runner no longer fails with `Process adapter missing command` when DearMe creates its first Brand OS work queue. DearMe-created agents now use the existing Codex local adapter defaults, cap heartbeat concurrency at one run per agent, and each generated first-operation issue carries the cheap model-profile override.

The fourth slice remains intact: a DearMe-native Brand OS approval ceremony plus the first browser-approved apply path.

The approval detail no longer exposes the Brand OS request as raw JSON. DearMe Brand OS approvals now render as a human review surface with the summary, growth team count, cycles, approval gates, memory seeds, monthly budget, voice state, review guidance, on-approval outcome, brand position, goals, audiences, proof, offers, channels, constraints, growth-team boundaries, first operations, and approval gates that remain active.

The approved state now uses DearMe language. After approval, the banner says DearMe created private Brand OS artifacts, recurring cycles, and the gated draft work queue. If there is no single linked issue to open, the CTA opens the work queue instead of falling back to a generic requesting-agent message.

## Reuse Evidence

- Paperclip reused for company route scoping, approvals, activity logging, issues, routines, documents, agents, local-trusted runtime, and the existing approval decision substrate.
- Paperclip's existing `@paperclipai/adapter-codex-local` defaults are now reused for DearMe team members instead of inventing a DearMe-specific process command.
- Existing issue-level `assigneeAdapterOverrides` are reused to keep DearMe first-operation runs on the cheap model profile.
- Existing Codex local sandbox arguments, Paperclip's agent-default workspace mode, and Codex config args are reused to keep DearMe customer operations out of the product repo while allowing network access back to the local Paperclip API.
- Existing Paperclip heartbeat task context, `context.paperclipTaskMarkdown`, is now reused by `codex_local` instead of constructing a DearMe-only prompt path.
- Existing issue comments remain the first customer-facing private artifact surface for draft content output.
- Existing recovery/liveness durable-output evidence is reused to distinguish reviewable productive continuation output from truly stranded work, stops the loop on the first reviewable output, and now treats durable document revisions with approval wording as progress.
- Existing company membership and issue review assignment paths are reused to hand productive output to a human instead of adding a DearMe-only review queue.
- Existing issue PATCH semantics, issue comments, status transitions, and cache merge/invalidation paths are reused for reviewer accept/revise/reject decisions.
- Existing assignment-change wakeups are reused for revise decisions by moving the issue back to `todo` and assigning the latest assignable draft authoring agent.
- Existing assignment-change wakeups are now live API-smoked for active generated-content revision: the reviewer PATCH reassigns the content issue to the same active author, the agent writes revised private output, and recovery hands the issue back to `in_review`.
- Existing issue-service assignable-agent guardrails are mirrored in the reviewer UI so terminated or pending-approval draft authors are blocked before submit.
- Existing `in_review` plus `assigneeUserId` state is reused as the reviewer gate; tree-control managers retain the existing override path.
- Existing issue documents are reused as the customer-facing weekly report surface; the report lane now seeds and updates a private `dear-me-report` document instead of adding a DearMe-only reporting endpoint.
- Existing issue document REST routes and `documentService` now carry the weekly report revision loop, with a shell-safe Authorization-header prompt pattern instead of a DearMe-only report submission endpoint or local-trusted fallback.
- Existing issue PATCH semantics, status transitions, assignment clearing, and assignment-change wakeups are now live API-smoked for weekly report accept, reject, and revise decisions.
- Existing Brand OS seeded issues, issue comments, issue documents, and work products are reused as the customer-visible generated-output handoff surface instead of adding a parallel DearMe artifact store.
- Existing company route scoping and access checks are reused for the output list endpoint.
- Existing issue detail routes are reused for customer Open/Review actions from `/dearme`.
- Existing agent `runtimeConfig.heartbeat.maxConcurrentRuns` is reused to keep each seeded DearMe agent to one active local run.
- Existing `backlog` issue status, assignment wakeup skip behavior, and recovery's `todo`/`in_progress` candidate filter are reused to keep non-selected DearMe first operations queued without adding a DearMe-only scheduler.
- Existing `finance_events`, company access checks, board-only write checks, and activity logging are reused for DearMe paid-beta access instead of adding a parallel billing ledger.
- DearMe Brand Blueprint validators, preview, and apply services from the previous slices were reused for ceremony rendering and browser approval.
- OK Partner/Naive/Polsia remain donor material for product choreography and operator mechanics; no incompatible UI substrate was copied into the React app.
- DearMe owns the user-facing language for Brand OS, growth team, voice profile, personal-brand cycles, private setup, and risky-operation gates.

## Implemented Files

Server/shared from previous Brand Blueprint slices:

- `packages/shared/src/validators/dearme.ts`
- `packages/shared/src/validators/dearme.test.ts`
- `packages/shared/src/constants.ts`
- `packages/shared/src/api.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/validators/index.ts`
- `server/src/services/dearme-brand-blueprints.ts`
- `server/src/services/dearme-brand-blueprint-apply.ts`
- `server/src/services/dearme-output-handoff.ts`
- `server/src/services/dearme-paid-beta-access.ts`
- `server/src/routes/dearme.ts`
- `server/src/app.ts`
- `server/src/routes/index.ts`
- `server/src/services/index.ts`
- `server/src/services/approvals.ts`
- `server/src/__tests__/approvals-service.test.ts`
- `server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
- `server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `server/src/__tests__/dearme-output-handoff.test.ts`
- `server/src/__tests__/dearme-paid-beta-access.test.ts`

Codex local task-context slice:

- `packages/adapters/codex-local/src/server/execute.ts`
- `server/src/__tests__/codex-local-execute.test.ts`

Productive-continuation recovery slice:

- `server/src/services/recovery/service.ts`
- `server/src/__tests__/heartbeat-process-recovery.test.ts`

Weekly report document-writeback and liveness slice:

- `server/src/services/heartbeat.ts`
- `server/src/services/dearme-brand-blueprint-apply.ts`
- `server/src/services/run-liveness.ts`
- `server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
- `server/src/__tests__/heartbeat-task-markdown.test.ts`
- `server/src/__tests__/run-liveness.test.ts`

Issue reviewer decision slice:

- `ui/src/pages/IssueDetail.tsx`
- `ui/src/pages/IssueDetail.test.tsx`

UI from the onboarding and approval ceremony slices:

- `ui/src/api/dearme.ts`
- `ui/src/api/dearme.test.ts`
- `ui/src/api/index.ts`
- `ui/src/lib/dearme-brand-blueprint.ts`
- `ui/src/lib/dearme-brand-blueprint.test.ts`
- `ui/src/lib/company-routes.ts`
- `ui/src/lib/company-routes.test.ts`
- `ui/src/lib/queryKeys.ts`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/pages/DearMeOnboarding.test.tsx`
- `ui/src/pages/ApprovalDetail.tsx`
- `ui/src/pages/ApprovalDetail.test.tsx`
- `ui/src/App.tsx`
- `ui/src/components/Sidebar.tsx`
- `ui/src/components/Sidebar.test.tsx`
- `ui/src/components/ApprovalPayload.tsx`
- `ui/src/components/ApprovalPayload.test.tsx`

CLI verification harness cleanup:

- `cli/src/__tests__/network-bind.test.ts`
- `cli/src/__tests__/onboard.test.ts`

## Verification

Focused generated-output handoff tests:

```sh
pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx
```

Result: passed, 5 files and 26 tests. The focused tests prove the shared output
contract, company-scoped output route, embedded-Postgres output mapping, provider
metadata stripping, API client path, and `/dearme` output panel navigation.

Full verification after the output handoff slice:

- `pnpm -r typecheck` passed.
- `pnpm test:run` passed; the parallel shard reported 148 files passed and 995
  tests passed with 1 skipped, the serialized shard completed 81 suites, and the
  command exited 0.
- `pnpm build` passed. Existing non-blocking Vite warnings remain for the mixed
  dynamic/static `MarkdownEditor` import and large output chunks.
- `git diff --check` passed before this docs update.

Runtime generated-output handoff smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`,
  embedded PostgreSQL on port `54329`, and healthy `/api/health`.
- Browser Use was listed, but the Node REPL `js` execution tool required by the
  Browser skill was not exposed after tool discovery, so Playwright was used as
  the browser fallback.
- `GET /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/outputs`
  returned 6 outputs for issue prefix `DEAA`: `brand_os`, `voice_profile`,
  `content_drafts`, `opportunity_drafts`, `portfolio_update`, and
  `weekly_report`.
- Desktop `/DEAA/dearme` rendered the `Private work ready` section with cards
  for Brand OS, Voice profile, Content drafts, Opportunity drafts, Portfolio
  updates, and Dear me report.
- Clicking Open navigated to `/DEAA/issues/DEAA-68` and rendered the issue
  detail/document surface. Mobile rendered the same private work cards.
- Browser diagnostics recorded zero console events. Screenshots:
  `/tmp/dearme-output-handoff-desktop.png`,
  `/tmp/dearme-output-handoff-click.png`, and
  `/tmp/dearme-output-handoff-mobile.png`.

Focused weekly report writeback and liveness tests:

```sh
pnpm exec vitest server/src/__tests__/run-liveness.test.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts server/src/__tests__/heartbeat-task-markdown.test.ts --run
```

Result: passed, 3 files and 17 tests. The focused tests prove DearMe-created Codex workers include network-enabled workspace sandbox args, heartbeat task markdown includes attached documents plus the exact update protocol, and durable document output with approval/review wording classifies as progress.

Server typecheck after the report writeback slice:

```sh
pnpm --filter @paperclipai/server typecheck
```

Result: passed.

Controlled Codex child network probe:

- Ran a bounded `codex exec` child with `--sandbox workspace-write -c sandbox_workspace_write.network_access=true --skip-git-repo-check`.
- The child reported workspace-write sandboxing with network access enabled and successfully called `http://127.0.0.1:3100/api/health`.

Runtime weekly report document-writeback smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `Agent JWT set`.
- The first report-writeback smoke, approval `df7a1333-c14a-4369-b395-110ca68a0680` and issue `DEAA-91`, proved the worker prompt contained attached documents, the exact PUT route, `$PAPERCLIP_API_URL`, and the network config. It updated `dear-me-report` to revision 2 but exposed the liveness false positive caused by approval wording.
- After the liveness fix, approval `b2bb8a9d-649c-48dc-b398-afac8efaeb62` created report issue `DEAA-97`; run `d33bd4d1-45d8-4398-9740-9d43f9064a16` succeeded, updated `dear-me-report` from revision 1 to revision 2, wrote latest revision `c4dcef9e-b05a-4ee1-a2cd-0b9b129513ca`, classified liveness as `advanced`, moved the issue to `in_review`, assigned reviewer `local-board`, cleared the agent assignment and run lock, and left `liveRunsAfter: []`.

Runtime weekly report reviewer smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, and `GET /api/health` returned `status: ok`, `deploymentMode: local_trusted`, `deploymentExposure: private`, `authReady: true`, and `bootstrapStatus: ready`.
- Accept reused report issue `DEAA-97`, `f5967bf6-c524-4c16-a509-63de9c8a1608`; the reviewer PATCH moved it to `done`, cleared `assigneeAgentId` and `assigneeUserId`, left latest report revision `c4dcef9e-b05a-4ee1-a2cd-0b9b129513ca`, and left no live runs.
- Reject used fresh approval `2ca6835f-7b46-4f19-99e5-dfa9abae3c63`, report issue `DEAA-103`, `f4dde237-c474-42c8-9285-0bf52315fa07`, and run `2c13841c-f76b-4087-9039-0cf6d1c861bf`; the run advanced `dear-me-report` to revision 2, the reviewer PATCH moved the issue to `cancelled`, cleared assignments, created no extra revision, and left no live runs.
- Revise used fresh approval `338871e5-ee1b-4f6e-be14-a05cc6bc7884`, report issue `DEAA-109`, `e9d5c664-ca35-4f80-bbd3-9d300e084c7b`, and report agent `57ca1ac4-2c11-489a-8e32-53e66367c746`; the reviewer PATCH returned the issue to that Growth Analyst and a revised run advanced the attached report from revision 2 to revision 3, then handed the issue back to `in_review`.
- The first revise run exposed a worker-shell rough edge: the generated curl command split the Authorization header and relied on local-trusted fallback. The prompt was hardened to require `Authorization: Bearer $PAPERCLIP_API_KEY` as one quoted header argument and to provide a concrete `api_headers` pattern.
- After hardening, second revise run `de12633c-0fc0-45cf-8c2d-9112127e2f32` included the shell-safe pattern, used base revision `00b6b665-adcf-4312-9c3a-10d312510df4`, had one completed command execution with exit code 0, had zero Authorization/header failure matches, advanced `dear-me-report` to revision 4 with latest revision `f24609d6-1d68-43cc-bd3d-7b5669819b1a`, recorded `updatedByAgentId: 57ca1ac4-2c11-489a-8e32-53e66367c746`, returned `DEAA-109` to `in_review` for `local-board`, and left no live runs.

Runtime generated content active-author revise smoke:

- `pnpm dev` was already running with local-trusted auth at `http://127.0.0.1:3100`; `GET /api/health` returned `status: ok`, `version: 0.3.1`, `deploymentMode: local_trusted`, `deploymentExposure: private`, `authReady: true`, and `bootstrapStatus: ready`.
- Fresh approval `6c370c67-4fe1-422d-a243-832f289003dd` created generated content issue `DEAA-112`, `73d7c704-383c-432a-8dce-29d235eb6b4f`, and active content agent `b35fbd64-f5d5-48bf-b5aa-887297ca7e36`.
- Initial assignment run `8b8ed084-80c4-47d1-b833-b9cb6d42e831` succeeded, posted draft comment `352bc4f6-987f-409a-9d2e-6deb41efdc9e`, and recovery handed `DEAA-112` to `in_review` with reviewer `local-board`.
- Reviewer revision comment `562690a9-13b3-412a-8948-aba0228bb3a5` reassigned `DEAA-112` to the same content agent through the existing issue PATCH path.
- Revision run `ac74d4b6-be19-4c49-a9a2-71108088462f` succeeded and posted revised-output comment `f7f6a552-9012-41d4-94c1-e4d4d86b52da`, confirming the reviewer request woke the correct generated-content author.
- Follow-up liveness runs `c8925e4d-5a82-4194-b978-481bea82ad21` and `c1ff0a7c-c3a7-48f5-8dff-6c4a6c71d538` created concrete in-review submission packets; final `DEAA-112` state was `status: in_review`, `assigneeAgentId: null`, `assigneeUserId: local-board`.
- Cleanup terminated all 7 fresh approval-scoped agents, `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?limit=100` returned `[]`, and `ps` showed no matching `codex exec --json` process for the fresh run ids or agent ids.

Focused weekly report prompt hardening regression:

```sh
pnpm exec vitest server/src/__tests__/heartbeat-task-markdown.test.ts --run
```

Result: passed, 1 file and 1 test. The test now asserts that the attached-document update protocol keeps the bearer token as one quoted curl header and uses `--data-binary @payload.json`.

Server typecheck after the prompt hardening:

```sh
pnpm --filter @paperclipai/server typecheck
```

Result: passed.

Focused approval ceremony tests:

```sh
pnpm exec vitest ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx --run
```

Result: passed, 2 files and 6 tests.

Focused runtime adapter test:

```sh
pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-apply.test.ts --run
```

Result: passed, 1 file and 1 test.

Focused DearMe regression suite:

```sh
pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/approvals-service.test.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/components/ApprovalPayload.test.tsx ui/src/api/dearme.test.ts ui/src/lib/dearme-brand-blueprint.test.ts ui/src/lib/company-routes.test.ts ui/src/components/Sidebar.test.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/ApprovalDetail.test.tsx --run
```

Result: passed, 11 files and 32 tests.

Typecheck:

```sh
pnpm --filter @paperclipai/ui typecheck
```

Result: passed.

Server typecheck:

```sh
pnpm --filter @paperclipai/server typecheck
```

Result: passed.

Focused Codex task-context adapter test:

```sh
pnpm exec vitest server/src/__tests__/codex-local-execute.test.ts --run
```

Result: passed, 1 file and 13 tests.

Focused productive-continuation recovery tests:

```sh
pnpm exec vitest server/src/__tests__/heartbeat-process-recovery.test.ts --run
```

Result: passed, 1 file and 39 tests.

```sh
pnpm exec vitest server/src/__tests__/heartbeat-process-recovery.test.ts --run -t "moves first productive continuation output"
```

Result: passed, 1 test and 38 skipped.

```sh
pnpm exec vitest server/src/__tests__/heartbeat-process-recovery.test.ts --run -t "productive"
```

Result: passed, 5 tests and 34 skipped.

Focused reviewer decision flow tests:

```sh
pnpm exec vitest ui/src/pages/IssueDetail.test.tsx --run
```

Result: passed, 1 file and 12 tests. The review cases cover accepting generated output, returning requested changes to the latest active draft author, blocking unavailable draft authors before submit, and rejecting generated output.

Review decision UI typecheck:

```sh
pnpm --filter @paperclipai/ui typecheck
```

Result: passed.

Runtime reviewer decision smoke:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `Agent JWT set`.
- `GET /api/health` returned `status: ok`, `version: 0.3.1`, `deploymentMode: local_trusted`, `deploymentExposure: private`, `authReady: true`, and `bootstrapStatus: ready`.
- Existing generated review issue `DEAA-57`, `9f2fc4c8-73a8-4da4-9c7a-71059292fd3c`, accepted successfully: final status `done`, assignments cleared, and acceptance comment recorded.
- Existing generated review issue `DEAA-58`, `16a74ecf-886b-4b16-8230-771c15caff24`, rejected successfully: final status `cancelled`, assignments cleared, and rejection comment recorded.
- Existing generated review issue `DEAA-59`, `780e6d31-c7be-4159-86b0-c5f528110f2c`, exposed the remaining revision-dispatch gap: the latest agent author `ec7a1f24-6342-41c5-a91d-514f65e33667` is already `terminated`, and the API correctly rejects reassignment with `409 Cannot assign work to terminated agents`.
- After the UI guard, a Playwright smoke loaded `DEAA-59` on desktop `1440x900` and mobile `390x844`, clicked `Request changes`, filled revision notes, showed `This draft author is no longer available for changes.`, kept `Send changes` disabled, sent zero PATCH requests, and recorded zero browser console errors.
- Screenshots: `/tmp/dearme-review-unavailable-desktop.png` and `/tmp/dearme-review-unavailable-mobile.png`.
- `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?minCount=0&limit=100` returned `[]` after the smoke.
- Remaining product gap: true revision dispatch for terminated generated authors still needs a DearMe role-handoff or worker-recreation slice; the reviewer UI guard prevents silent/failed reviewer submission without adding that broader runtime choreography.

Focused first-operation auto-run gate tests:

```sh
pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts --run
```

Result: passed, 2 files and 6 tests. The default auto-draft case now proves only `DearMe Draft: Draft first content batch` is `todo`; the Brand OS review issue and other first-operation issues remain assigned but `backlog`. The disabled auto-draft case proves all six seeded issues remain assigned but `backlog`.

Shared typecheck:

```sh
pnpm --filter @paperclipai/shared typecheck
```

Result: passed.

Server typecheck after the auto-run gate:

```sh
pnpm --filter @paperclipai/server typecheck
```

Result: passed.

Runtime:

- `pnpm dev` started with local-trusted auth.
- Port `3100` was busy, so the current checkout selected `http://127.0.0.1:3101`.
- Embedded PostgreSQL reused existing process `pid 68073` on port `54329`.
- `GET /api/health` returned `status: ok`, `authReady: true`, `bootstrapStatus: ready`, `deploymentMode: local_trusted`, and `deploymentExposure: private`.
- Company used for browser smoke: `60334302-c360-4e9f-8e98-d6e42815217e`, issue prefix `DEAA`.

Browser smoke:

- Chrome DevTools loaded `http://127.0.0.1:3101/DEAA/dearme`.
- Preview enabled `Request approval` and rendered the DearMe ceremony with 7 team members, 4 cycles, 8 approval gates, `$250` monthly budget, first operations, and approval-gated public/send/deploy/sensitive actions.
- `Request approval` navigated to `/DEAA/approvals/b9d605b6-4c62-40d5-bac2-960d25d9ffc1`.
- Approval detail rendered `Brand OS: Create Brand OS for DearMe Ceremony Smoke 20260507 0143`.
- Detail page showed `DearMe will create`, `Review before approving`, `On approval`, `Growth team`, `First operations`, `Approval gates that remain active`, and `$250.00`.
- Detail page did not expose the `See full request` raw JSON toggle for the DearMe approval.
- Approving navigated to `?resolved=approved`, status became `approved`, and the banner said: `DearMe created the private Brand OS artifacts, recurring cycles, and gated draft work queue.`
- `Open work queue` navigated to `/DEAA/issues`, where the new Brand OS review issue and draft work items were visible as `DEAA-13` through `DEAA-18`.
- Browser console warnings/errors: none observed. Chrome reported one accessibility issue for a form field without an `id` or `name`.

API smoke after browser approval:

- Approval id: `b9d605b6-4c62-40d5-bac2-960d25d9ffc1`.
- Approval type: `dearme_brand_blueprint_apply`.
- Approval status: `approved`.
- Activity log recorded `dearme.brand_blueprint_applied` for the approval.
- Apply artifacts recorded in activity details:
  - 7 agents
  - 6 issues
  - 4 active routines
  - 3 documents: `brand-os`, `voice-profile`, `approval-gates`
  - 4 gated operations: `sensitive_material`, `publish_social`, `send_email`, `deploy_public_site`
- `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs` returned `[]` after the smoke.

Runtime adapter smoke after the fix:

- `GET /api/health` returned `status: ok`, `authReady: true`, `bootstrapStatus: ready`, `deploymentMode: local_trusted`, and `deploymentExposure: private`.
- Created fresh Brand OS approval request through `POST /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/brand-blueprints/apply-requests`.
- Fresh approval id: `519caeef-3252-41b9-a11d-753b33ecf444`.
- `POST /api/approvals/519caeef-3252-41b9-a11d-753b33ecf444/approve` returned `status: approved`.
- Activity for the approval recorded `dearme.brand_blueprint_applied`; fresh activity contained zero `Process adapter missing command` failures.
- The approval seeded 7 fresh agents with `metadata.approvalId: 519caeef-3252-41b9-a11d-753b33ecf444`, `adapterType: codex_local`, `adapterConfig.model: gpt-5.3-codex`, `dangerouslyBypassApprovalsAndSandbox: true`, and `runtimeConfig.heartbeat.maxConcurrentRuns: 1`.
- The approval seeded 6 fresh Brand OS work issues, `DEAA-25` through `DEAA-30`; every issue had `assigneeAdapterOverrides.modelProfile: cheap`.
- Fresh runs started with `adapterType: codex_local`, proving the command path no longer reaches the blank process adapter.
- The smoke runs were intentionally stopped after adapter proof: all 7 fresh smoke agents were terminated, and `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?minCount=0&limit=100` returned `companyLiveRunCount: 0`.

Runtime completion smoke after onboarding:

- `pnpm paperclipai onboard --yes` created the missing default instance config, `.env`, `PAPERCLIP_AGENT_JWT_SECRET`, and `secrets/master.key`.
- The onboard-launched server selected `http://127.0.0.1:3102` and printed `Agent JWT set`.
- `GET /api/health` on `http://127.0.0.1:3102` returned `status: ok`, `deploymentMode: local_trusted`, `authReady: true`, and `bootstrapStatus: ready`.
- Created fresh Brand OS approval request through `POST /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/brand-blueprints/apply-requests`.
- Fresh approval id: `a3e02ffa-4230-4e05-9977-66ab79327642`.
- Display name: `DearMe Runtime Smoke 2026-05-07`.
- `POST /api/approvals/a3e02ffa-4230-4e05-9977-66ab79327642/approve` returned `status: approved` at `2026-05-07T06:09:32.308Z`.
- The approval seeded 7 fresh agents with `adapterType: codex_local`, `adapterConfig.model: gpt-5.3-codex`, `dangerouslyBypassApprovalsAndSandbox: true`, and `runtimeConfig.heartbeat.maxConcurrentRuns: 1`.
- The Brand OS review issue created three durable documents:
  - `Brand OS`: `1c3703c9-9a57-4115-93d0-156cb04935db`
  - `Voice Profile`: `631b3ebf-97fc-43b9-8ed4-d765136f9a78`
  - `Approval Gates`: `d147374f-1074-40ff-a77a-2305c123e28c`
- The Brand OS reviewer used the local API, loaded the DearMe documents, posted review comments, and marked the issue complete.
- The content producer wrote a private workspace artifact at `/Users/peter/.paperclip/instances/default/workspaces/ae648661-b11d-41ce-b973-ec9329b36134/dearme_first_content_batch.md`.
- The smoke also exposed runtime drift: one worker edited DearMe repo source/test files for an opportunity-list issue, the first content batch drifted into generic personal-message copy, and the Brand OS review path produced repeated no-op comments after completion.
- Cleanup after the drift: terminated the 7 fresh smoke agents, canceled 3 queued runs, and verified `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?minCount=0&limit=100` returned `{ count: 0, liveRuns: [] }`.

Post-smoke guardrail verification:

```sh
pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-apply.test.ts --run
```

Result: passed, 1 file and 1 test.

The focused test now asserts:

- DearMe-created agents set `adapterConfig.dangerouslyBypassApprovalsAndSandbox: false`.
- DearMe-created agents pass `adapterConfig.extraArgs: ["--sandbox", "workspace-write", "--skip-git-repo-check"]`.
- Every generated first-operation issue keeps `assigneeAdapterOverrides.modelProfile: cheap`.
- Every generated first-operation issue sets `assigneeAdapterOverrides.useProjectWorkspace: false`.
- Every generated first-operation issue carries issue adapter config with sandbox bypass disabled and the same Codex sandbox args.
- With isolated workspaces enabled, every generated first-operation issue persists `executionWorkspaceSettings.mode: agent_default`.

Runtime confinement smoke after the sandbox fix:

- `pnpm dev` started with local-trusted auth and selected `http://127.0.0.1:3101`.
- `GET /api/health` returned `status: ok`, `deploymentMode: local_trusted`, `authReady: true`, and `bootstrapStatus: ready`.
- Created fresh Brand OS approval request through `POST /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/brand-blueprints/apply-requests`.
- Fresh approval id: `d40f9acf-3fac-4be5-a660-6fb946b8db69`.
- Display name: `DearMe Confinement Smoke 2026-05-07`.
- `POST /api/approvals/d40f9acf-3fac-4be5-a660-6fb946b8db69/approve` returned `status: approved` at `2026-05-07T06:25:11.079Z`.
- The approval seeded 7 fresh agents with `adapterConfig.dangerouslyBypassApprovalsAndSandbox: false` and `adapterConfig.extraArgs: --sandbox workspace-write --skip-git-repo-check`.
- The approval seeded 6 fresh Brand OS work issues; every issue had `assigneeAdapterOverrides.modelProfile: cheap`, `assigneeAdapterOverrides.useProjectWorkspace: false`, issue adapter config with bypass disabled, and the same Codex sandbox args.
- Local smoke API showed `executionWorkspaceSettings.mode: null` because the local instance had isolated workspaces disabled; the focused test enabled that setting and proved `mode: agent_default` persists when the gate is on.
- The content-producer run `f7c40851-2222-409f-8201-d4a027aec3d7` executed from `/Users/peter/.paperclip/instances/default/workspaces/5d897f9d-f679-4999-8949-e18349f2f057` with `mode: agent_default` and `source: agent_home`.
- `ps` showed the child command using `codex exec --json --model gpt-5.3-codex-spark -c model_reasoning_effort="low" --sandbox workspace-write --skip-git-repo-check`.
- Other auto-started smoke runs also resolved to `/Users/peter/.paperclip/instances/default/workspaces/<agent-id>` with `mode: agent_default`; no run used `/Users/peter/dearme` as its execution workspace.
- `git status --short` before and after the content smoke had no diff, proving the smoke did not add new product-repo edits.
- The content run emitted only startup metadata and `adapter invocation`, then stayed silent for more than four minutes; it was canceled as a bounded-smoke blocker rather than left running.
- Cleanup after the confinement smoke: terminated the 7 fresh smoke agents, canceled the content run plus queued follow-up runs, verified the Codex child process was gone, and verified `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?minCount=0&limit=100` returned `0`.

Runtime task-context smoke after the Codex prompt fix:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `Agent JWT set`.
- `GET /api/health` returned `status: ok`, `deploymentMode: local_trusted`, `authReady: true`, and `bootstrapStatus: ready`.
- Created fresh Brand OS approval request through `POST /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/brand-blueprints/apply-requests`.
- Fresh approval id: `8398a7e3-cb33-4ce9-ba10-f4e9522a6f29`.
- Display name: `DearMe Task Context Smoke 20260507T064318Z`.
- `POST /api/approvals/8398a7e3-cb33-4ce9-ba10-f4e9522a6f29/approve` returned `status: approved` at `2026-05-07T06:43:18.457Z`.
- The approval seeded 7 fresh agents with `adapterType: codex_local`, `adapterConfig.model: gpt-5.3-codex`, `adapterConfig.dangerouslyBypassApprovalsAndSandbox: false`, `adapterConfig.extraArgs: --sandbox workspace-write --skip-git-repo-check`, and `runtimeConfig.heartbeat.maxConcurrentRuns: 1`.
- The approval seeded fresh Brand OS issues `DEAA-49` through `DEAA-55`; the content issue was `DEAA-51`, `5ce8b190-fad3-429e-85c6-a9ea55e00748`.
- The content-producer run `f495942d-823a-4b4f-b3bf-5c9f4459d4ea` succeeded from `/Users/peter/.paperclip/instances/default/workspaces/2fc10883-fba6-4a07-b4e5-ccaf70158403` using `codex exec --json --model gpt-5.3-codex-spark -c model_reasoning_effort="low" --sandbox workspace-write --skip-git-repo-check`.
- Its prompt metrics recorded `taskContextChars: 2562`, `promptContainsBoundary: true`, and `promptContainsContentScope: true`.
- It posted issue comment `e0774c5b-4dd3-4e8e-9f99-71416b1d081c` on `DEAA-51` with five draft items: three LinkedIn drafts and two newsletter drafts, each with approval-gate notes.
- The automatic continuation run `36a2aacc-fd11-40f4-bddd-3d89b51eb8ec` also succeeded and posted issue comment `865b7004-8e80-4647-a614-9374e6f7a5d4` with two LinkedIn drafts, two newsletter drafts, and three short voice samples.
- The content workspace did not create product-repo files; `git status --short` was unchanged before and after the smoke.
- Liveness then incorrectly moved productive `DEAA-51` to `blocked`, posted stranded-issue system comment `f6b7bc5b-7371-4cb7-8e54-600108ee7522`, and created recovery issue `DEAA-55`, `c1dd8b4d-5b43-4323-a0b8-d7075e767050`.
- The liveness behavior above now has a regression-tested code fix and a fresh live smoke proving repeated productive output moves to `in_review`.
- Cleanup after the smoke: canceled recovery run `17e619b2-b812-4532-8bb7-39578d56f3bf`, terminated the 7 fresh smoke agents, canceled 3 queued non-content runs, verified no `codex exec --json` child process remained, and verified live runs returned `0`.

Runtime recovery handoff smoke after the recovery patch:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `Agent JWT set`.
- `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/users/local-board/profile` returned `membershipRole: owner` and `membershipStatus: active`, proving a human reviewer was available.
- Fresh approval id: `bc3f2eab-e675-4b2c-960a-54ca7bd3b5c7`.
- The approval seeded Brand OS issues `DEAA-56` through `DEAA-61`; the content issue was `DEAA-58`, `16a74ecf-886b-4b16-8230-771c15caff24`.
- The content agent was `d205fe83-0a08-46a8-96dd-eca2ec604147`.
- The content lane produced customer-facing private drafts in issue comments, including LinkedIn and newsletter draft batches with DearMe Brand OS context, approval-gate notes, and content scope.
- Repeated liveness continuation remained too chatty and produced several continuation comments, but the patched recovery path stopped the loop by moving `DEAA-58` to `in_review`.
- Final `DEAA-58` state: `status: in_review`, `assigneeAgentId: null`, `assigneeUserId: local-board`.
- Related stranded-recovery issues for `DEAA-58`: `0`.
- Recovery posted system handoff comment `80528e6f-30be-4c1f-960e-9c3af8faf9a8`, citing output evidence `issue comment`, run `e4ca0166-e70c-4964-8043-73cab1e528cb`, and review owner `local-board`.
- Cleanup after the smoke: terminated all 7 fresh smoke agents, including the three approval-scoped idle agents that had already moved out of issue assignment; verified `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs?minCount=0&limit=100` returned `[]`; verified no `codex exec --json` child process remained.

Runtime auto-run gate smoke after the first-operation gate:

- `pnpm dev` started with local-trusted auth at `http://127.0.0.1:3100`, embedded PostgreSQL on port `54329`, and `Agent JWT set`.
- `GET /api/health` returned `status: ok`, `version: 0.3.1`, `deploymentMode: local_trusted`, `deploymentExposure: private`, `authReady: true`, and `bootstrapStatus: ready`.
- Fresh approval id: `36e61ca3-0a28-4599-804f-fe45420ea376`.
- Display name: `DearMe Auto Gate Smoke 2026-05-07T07-27-47-869Z`.
- `POST /api/dearme/companies/60334302-c360-4e9f-8e98-d6e42815217e/brand-blueprints/apply-requests` returned `201`.
- `POST /api/approvals/36e61ca3-0a28-4599-804f-fe45420ea376/approve` returned `200` with `status: approved`.
- The approval seeded 7 fresh agents with `adapterType: codex_local`, sandbox bypass disabled, `--sandbox workspace-write --skip-git-repo-check`, and `runtimeConfig.heartbeat.maxConcurrentRuns: 1`.
- The approval seeded Brand OS issues `DEAA-62` through `DEAA-67`.
- Initial gated status proof: `DEAA-64` was the only `todo` issue; `DEAA-62`, `DEAA-63`, `DEAA-65`, `DEAA-66`, and `DEAA-67` were `backlog`.
- Live dispatch proof: `DEAA-64` moved to `in_progress` with active run `9aab8711-c954-477f-b3cf-e7f487cd981a`, while every non-content seeded issue stayed `backlog` with `activeRunId: null`.
- The live run finished `succeeded` with `exitCode: 0` before cleanup.
- Cleanup after the smoke: terminated all 7 fresh smoke agents, cancelled and unassigned the six smoke issues, verified `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs` returned `0`, and verified no `codex exec --json` child process remained.
- `POST /api/approvals/a1229131-632d-49ce-a29f-453e640481e6/approve` returned `200` with `status: approved`.
- The approval seeded Brand OS issues `DEAA-68` through `DEAA-73`.
- Earlier-stop proof: content issue `DEAA-70` had exactly one heartbeat run, assignment run `6713c236-b81b-47b3-abe7-c2c96d1971fe`, from `issue.assigned_todo_liveness_dispatch`; it finished `succeeded` with `exitCode: 0`.
- Review handoff proof: recovery moved `DEAA-70` to `in_review`, cleared `assignee_agent_id`, assigned reviewer `local-board`, cleared execution locks, and wrote the handoff comment `Paperclip stopped automatic continuation because the latest run produced reviewable output.`
- No extra continuation proof: the heartbeat run history for `DEAA-70` contained no second run and no `issue.productive_terminal_continuation_recovery` run.
- Cleanup after the earlier-stop smoke: terminated all 7 fresh smoke agents, cancelled and unassigned `DEAA-68` through `DEAA-73`, verified `GET /api/companies/60334302-c360-4e9f-8e98-d6e42815217e/live-runs` returned `[]`, verified no `codex exec --json` child process remained, stopped the dev server, and verified no listener remained on port `3100`.

## UI Product-Label Leakage Slice - 2026-05-07

Seventeenth verified DearMe slice:

- Added a small UI product-label helper so visible DearMe account/workspace/team wording is not copied by hand across entry surfaces.
- Replaced visible `Paperclip` product labels with `DearMe` in auth, CLI approval, company-invite link copy, invite landing, first-admin/no-access gate copy, account-menu version/docs descriptions, dashboard empty state, breadcrumb-managed browser titles, `index.html` title metadata, the web manifest, the exported company README, company settings invite/onboarding snippets, new-agent skill help, profile avatar storage help, and company-import zip help.
- Left runtime/internal compatibility names untouched, including `paperclip.theme`, `PAPERCLIP_*` template markers, package names, helper identifiers, and `pnpm paperclipai ...` commands.
- Added focused regression coverage for auth entry product language, CLI approval product language, company-invite link copy, invite product language, account-menu version text, breadcrumb-managed browser titles, CloudAccessGate first-admin/no-access product language, and exported company README product language.

Verification:

- `rg -n '"Paperclip"|paperclip\.ing' ui/index.html ui/public/site.webmanifest ui/src/lib/product-labels.ts ui/src/pages/Auth.tsx ui/src/pages/InviteLanding.tsx ui/src/components/CloudAccessGate.tsx ui/src/components/SidebarAccountMenu.tsx ui/src/pages/Dashboard.tsx ui/src/context/BreadcrumbContext.tsx ui/src/pages/CliAuth.tsx ui/src/pages/CompanyInvites.tsx ui/src/pages/CompanyExport.tsx` returned no visible `"Paperclip"` string, stale docs URL, or exported README `paperclip.ing` link in the cleaned entry surfaces.
- `pnpm exec vitest ui/src/pages/CompanyExport.test.ts ui/src/pages/CompanyInvites.test.tsx ui/src/pages/CliAuth.test.tsx ui/src/context/BreadcrumbContext.test.tsx ui/src/App.test.tsx ui/src/pages/Auth.test.tsx ui/src/pages/InviteLanding.test.tsx ui/src/components/SidebarAccountMenu.test.tsx --run` passed: 8 files, 20 tests. Existing `InviteLanding.test.tsx` stderr still prints `No routes matched location "/"` for two redirect assertions.
- `rg -n '"Paperclip"|Paperclip|paperclip\.ing' ui/src/pages/CompanySettings.tsx ui/src/pages/NewAgent.tsx ui/src/pages/ProfileSettings.tsx ui/src/pages/CompanyImport.tsx` returned no matches.
- `pnpm exec vitest ui/src/pages/CompanySettings.test.tsx ui/src/pages/ProfileSettings.test.tsx --run` passed: 2 files, 3 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.

## Runtime/Admin UI Product-Label Leakage Slice - 2026-05-07

Eighteenth verified DearMe slice:

- Replaced visible `Paperclip` labels in routine toasts, routine history/secret guidance, routine variables help, run-ledger liveness/watchdog copy, workspace runtime controls, execution workspace close/provision copy, project workspace/runtime settings help, company environment host/path examples, account-feedback sharing dialogs, accounting/model card copy, JSON-schema secret provider help, company skill source labels, agent skill/runtime help, OpenClaw/Codex adapter field copy, design guide labels, invite UX lab fixtures, run-transcript UX lab copy, and plugin-runtime error text.
- Changed the account-menu documentation URL away from `docs.paperclip.ing`; it now defaults to `https://dearme.app/docs` and still supports `VITE_DOCS_URL`.
- Changed visible example-only placeholders/domains from the old product shape to DearMe examples: invite lab email/domain fixtures, company access/invite test fixtures, plugin/adapter placeholders, remote workspace path, OpenClaw API URL, claimed-key filename, and default fixed session key.
- Left internal compatibility identifiers untouched where they are not rendered product copy: package imports, localStorage keys, CSS class names, helper/type names, Lucide `Paperclip` icon identifiers, `.paperclip.yaml`, and real `pnpm paperclipai ...` CLI commands.

Verification:

- `pnpm exec vitest ui/src/components/SidebarAccountMenu.test.tsx ui/src/pages/InviteUxLab.test.tsx ui/src/components/IssueChatThread.test.tsx --run` passed: 3 files, 50 tests.
- `pnpm exec vitest ui/src/pages/CompanyExport.test.ts ui/src/pages/CompanyInvites.test.tsx ui/src/pages/CliAuth.test.tsx ui/src/context/BreadcrumbContext.test.tsx ui/src/App.test.tsx ui/src/pages/Auth.test.tsx ui/src/pages/InviteLanding.test.tsx ui/src/pages/CompanySettings.test.tsx ui/src/pages/ProfileSettings.test.tsx --run` passed: 9 files, 22 tests. Existing `InviteLanding.test.tsx` stderr still prints `No routes matched location "/"` for two redirect assertions.
- `pnpm exec vitest ui/src/pages/Routines.test.tsx ui/src/components/RoutineHistoryTab.test.tsx ui/src/components/IssueRunLedger.test.tsx --run` passed: 3 files, 24 tests. Existing Radix test-environment warnings still mention missing dialog title/description in the mocked routine dialog path.
- `pnpm exec vitest ui/src/components/WorkspaceRuntimeControls.test.tsx ui/src/components/RunInvocationCard.test.tsx ui/src/pages/IssueDetail.test.tsx ui/src/pages/CompanySettings.test.tsx --run` passed: 4 files, 27 tests.
- `pnpm exec vitest ui/src/pages/CompanyAccess.test.tsx ui/src/pages/CompanyInvites.test.tsx --run` passed: 2 files, 6 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Rendered-string/domain scan `rg -n '"[^"]*Paperclip|`[^`]*Paperclip|>[^<]*Paperclip|paperclip\.ing|paperclip\.local|paperclip\.example|/Users/paperclip|my-paperclip-adapter|@paperclipai/plugin-example|paperclip-claimed-api-key' ui/index.html ui/public/site.webmanifest ui/src --glob '!**/*.test.*' --glob '!**/fixtures/**'` returned only `ui/src/components/IssueChatThread.tsx:42`, a false positive from the internal `PaperclipIssueRuntimeReassignment` type import.
- Targeted old-domain/example scan `rg -n "paperclip\.local|paperclip\.example|/Users/paperclip|my-paperclip-adapter|@paperclipai/plugin-example|paperclip-claimed-api-key|docs\.paperclip\.ing" ui/src/pages/InviteUxLab.tsx ui/src/pages/PluginManager.tsx ui/src/pages/AdapterManager.tsx ui/src/pages/CompanyEnvironments.tsx ui/src/adapters/openclaw-gateway/config-fields.tsx ui/src/components/SidebarAccountMenu.tsx` returned no matches.
- `rg -n "Paperclip|paperclip\.local" ui/src/pages/CompanyAccess.test.tsx ui/src/pages/CompanyInvites.test.tsx` returned no matches after normalizing legacy test fixtures.

## Remote Gateway Runtime Copy Slice - 2026-05-07

Nineteenth verified DearMe slice:

- Replaced visible `OpenClaw gateway` runtime and validation copy with `remote gateway` wording in invite-join diagnostics, invite-prompt permission errors, gateway join persistence logs, gateway adapter execution errors, pairing guidance, and environment-test checks.
- Preserved internal compatibility identifiers and protocol terms, including `openclaw_gateway`, `x-openclaw-token`, `x-openclaw-auth`, error codes, adapter package paths, stdout prefixes, function names, and the exact lower-case `openclaw devices approve` command example.
- Added regression coverage for remote-gateway runtime guidance so exact stale OpenClaw gateway phrases cannot return in the touched route and adapter server surfaces.

Verification:

- Test-first guard failures were confirmed in `server/src/__tests__/adapter-configuration-copy.test.ts`, `server/src/__tests__/openclaw-gateway-adapter.test.ts`, and `server/src/__tests__/invite-accept-gateway-defaults.test.ts` before production copy changes.
- `pnpm exec vitest server/src/__tests__/adapter-configuration-copy.test.ts --run` passed: 1 file, 3 tests.
- `pnpm exec vitest server/src/__tests__/openclaw-gateway-adapter.test.ts --run` passed: 1 file, 7 tests.
- `pnpm exec vitest server/src/__tests__/invite-accept-gateway-defaults.test.ts --run` passed: 1 file, 7 tests.
- `rg -n '"[^"]*OpenClaw[^"]*"|`[^`]*OpenClaw[^`]*`' server/src/routes/access.ts packages/adapters/openclaw-gateway/src/server/execute.ts packages/adapters/openclaw-gateway/src/server/test.ts` returned no matches.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/adapter-openclaw-gateway typecheck` passed.
- `git diff --check` passed for the slice files.

## Runtime Recovery Copy Slice - 2026-05-07

Twentieth verified DearMe slice:

- Replaced generated recovery, liveness, stranded-work, continuation, external-service monitor, and productivity-review notices that still said `Paperclip` with DearMe-facing wording.
- Preserved recovery scheduling behavior, heartbeat recovery flow, issue liveness escalation logic, run state transitions, internal identifiers, and adapter/runtime contracts.
- Added a focused regression guard so the exact stale generated notice phrases cannot return in the recovery service, heartbeat service, or productivity review service.

Verification:

- Confirmed `server/src/__tests__/runtime-recovery-copy.test.ts` failed before production copy edits on the stale `Paperclip detected a harness-level issue graph liveness incident.` phrase.
- `pnpm exec vitest server/src/__tests__/runtime-recovery-copy.test.ts --run` passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/heartbeat-process-recovery.test.ts --run` passed: 1 file, 39 tests. Existing test-induced stderr still logs the mocked `heartbeat execution failed` continuation-recovery failure.
- `pnpm exec vitest server/src/__tests__/heartbeat-issue-liveness-escalation.test.ts --run` passed: 1 file, 9 tests. Existing PostgreSQL truncate notices still print during fixture cleanup.
- `rg -n 'Paperclip detected|Paperclip stopped|Paperclip automatically|Paperclip found|Paperclip exhausted|Paperclip cleared|Paperclip will wake|Paperclip session handoff|Paperclip could not find an invokable manager' server/src/services/recovery/service.ts server/src/services/heartbeat.ts server/src/services/productivity-review.ts` returned no matches.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check` passed for the slice files.

## Execution Workspace Close Copy Slice - 2026-05-07

Twenty-first verified DearMe slice:

- Replaced execution-workspace close-readiness and cleanup action descriptions that still said `Paperclip` with DearMe-facing wording.
- Preserved close-readiness behavior, git inspection, planned cleanup commands, worktree/branch command strings, destructive-close gating, runtime-service warnings, and internal compatibility identifiers.
- Added focused source-level copy coverage and strengthened the existing service behavior test so returned planned actions prove the DearMe-facing worktree cleanup wording.

Verification:

- Confirmed `server/src/__tests__/execution-workspaces-copy.test.ts` failed before production copy edits on the stale `Workspace has no local path, so Paperclip cannot inspect git status before close.` phrase.
- Confirmed `server/src/__tests__/execution-workspaces-service.test.ts` failed before production copy edits on stale `Paperclip will run git worktree cleanup...` and branch-delete action descriptions.
- `pnpm exec vitest server/src/__tests__/execution-workspaces-copy.test.ts --run` passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/execution-workspaces-service.test.ts --run` passed: 1 file, 7 tests.
- `rg -n 'Workspace has no local path, so Paperclip|so Paperclip cannot inspect git status before close|Paperclip will run git worktree cleanup|Paperclip will try to delete the runtime-created branch|Paperclip will archive this workspace but keep|Paperclip will remove the runtime-created directory' server/src/services/execution-workspaces.ts` returned no matches.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check` passed for the slice files.

## Adapter Skill Copy Slice - 2026-05-07

Twenty-second verified DearMe slice:

- Replaced user-facing adapter skill labels, missing-skill warnings, unsupported ACPX skill details, and external-skill provenance details that still said `Paperclip` with DearMe-facing wording.
- Preserved internal compatibility identifiers, runtime skill keys, adapter origins, package names, sync behavior, installation/link behavior, and the existing `paperclipSkillSync` config contract.
- Added focused source-level copy coverage for local adapter skill snapshot builders and strengthened skill-sync behavior assertions for Codex, Claude, ACPX, and the shared skill-entry contract.

Verification:

- Confirmed `server/src/__tests__/adapter-skill-copy.test.ts` failed before production edits on stale `Required by Paperclip` adapter skill source copy.
- Confirmed the focused skill-sync behavior tests failed before production edits on stale `Required by Paperclip`, `Installed outside Paperclip management...`, and `stored in Paperclip only` snapshot details.
- `pnpm exec vitest server/src/__tests__/adapter-skill-copy.test.ts --run` passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/codex-local-skill-sync.test.ts server/src/__tests__/claude-local-skill-sync.test.ts server/src/__tests__/acpx-local-skill-sync.test.ts server/src/__tests__/agent-skill-contract.test.ts --run` passed: 4 files, 13 tests.
- `pnpm exec vitest server/src/__tests__/adapter-skill-copy.test.ts server/src/__tests__/agent-skill-contract.test.ts server/src/__tests__/codex-local-skill-sync.test.ts server/src/__tests__/claude-local-skill-sync.test.ts server/src/__tests__/acpx-local-skill-sync.test.ts server/src/__tests__/gemini-local-skill-sync.test.ts server/src/__tests__/cursor-local-skill-sync.test.ts server/src/__tests__/pi-local-skill-sync.test.ts server/src/__tests__/opencode-local-skill-sync.test.ts packages/adapter-utils/src/server-utils.test.ts --run` passed: 10 files, 48 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/adapter-utils typecheck` passed.
- `pnpm --filter @paperclipai/adapter-codex-local --filter @paperclipai/adapter-claude-local --filter @paperclipai/adapter-acpx-local --filter @paperclipai/adapter-cursor-local --filter @paperclipai/adapter-gemini-local --filter @paperclipai/adapter-pi-local --filter @paperclipai/adapter-opencode-local typecheck` passed.
- `rg -n "Required by Paperclip|Managed by Paperclip|Paperclip skills directory|Paperclip cannot find this skill|Paperclip management|Paperclip-managed Claude prompt bundle|stored in Paperclip only|Paperclip skill integration contract" packages/adapters/acpx-local/src/server/skills.ts packages/adapters/claude-local/src/server/skills.ts packages/adapters/codex-local/src/server/skills.ts packages/adapters/cursor-local/src/server/skills.ts packages/adapters/gemini-local/src/server/skills.ts packages/adapters/opencode-local/src/server/skills.ts packages/adapters/pi-local/src/server/skills.ts` returned no matches.
- `git diff --check` passed for the slice files.

## Adapter Runtime Copy Slice - 2026-05-07

Twenty-third verified DearMe slice:

- Replaced visible adapter runtime/config copy that still said `Paperclip` in Codex managed-home logs, ACPX managed-home logs, ACPX runtime skill materialization prompts and command notes, ACPX state/working-directory config hints, Codex transient handoff headers, and Pi fresh-session logs.
- Preserved protocol headers, environment variable names, package identifiers, runtime skill keys, storage layout, command behavior, and compatibility identifiers.
- Added focused source-level copy coverage for adapter runtime logs/hints/prompts and strengthened existing Codex/ACPX execute behavior assertions.

Verification:

- Confirmed `server/src/__tests__/adapter-runtime-copy.test.ts` failed before production edits on stale `Paperclip execution workspaces`, `Defaults to Paperclip-managed...`, and related runtime/config source copy.
- Confirmed `server/src/__tests__/codex-local-execute.test.ts` and `server/src/__tests__/acpx-local-execute.test.ts` failed before production edits on stale `Using Paperclip-managed Codex home`, `Paperclip session handoff:`, and `Materialized 1 Paperclip skill(s)` runtime output.
- `pnpm exec vitest server/src/__tests__/adapter-runtime-copy.test.ts --run` passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/codex-local-execute.test.ts server/src/__tests__/acpx-local-execute.test.ts --run` passed: 2 files, 24 tests.
- `pnpm exec vitest server/src/__tests__/adapter-runtime-copy.test.ts server/src/__tests__/codex-local-execute.test.ts server/src/__tests__/acpx-local-execute.test.ts --run` passed: 3 files, 25 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/adapter-codex-local --filter @paperclipai/adapter-acpx-local --filter @paperclipai/adapter-pi-local typecheck` passed.
- `rg -n "Paperclip-managed|Paperclip has materialized|Paperclip skill\\(s\\)|Selected Paperclip skills|Paperclip execution workspaces|ACPX runtime embedded in Paperclip|Paperclip will start a fresh session|Paperclip session handoff:" packages/adapters/acpx-local/src/server/config-schema.ts packages/adapters/acpx-local/src/server/execute.ts packages/adapters/codex-local/src/server/codex-home.ts packages/adapters/codex-local/src/server/execute.ts packages/adapters/pi-local/src/server/execute.ts` returned no matches.
- `git diff --check` passed for the slice files.

## Backend Admin Copy Slice - 2026-05-07

Twenty-fourth verified DearMe slice:

- Replaced backend/admin/default copy that still said `Paperclip` in generated worktree env files, default local environment descriptions, adapter-plugin directory metadata, skill-source labels, bundled plugin example descriptions, Claude quota fallback errors, Codex fast-mode warnings, and routine import warnings.
- Preserved internal compatibility identifiers, package names, plugin keys, environment variable names, schema badges, `.paperclip.yaml` guidance, and real CLI/storage contracts.
- Added focused source-level copy coverage and strengthened existing environment-service and Codex-args behavior assertions so the returned/default strings prove the DearMe-facing wording.

Verification:

- Confirmed `server/src/__tests__/backend-admin-copy.test.ts` failed before production edits on stale `# Paperclip environment variables` source copy.
- Confirmed `server/src/__tests__/environment-service.test.ts` and `packages/adapters/codex-local/src/server/codex-args.test.ts` failed before production edits on stale default-environment and fast-mode warning copy.
- `pnpm exec vitest server/src/__tests__/backend-admin-copy.test.ts server/src/__tests__/environment-service.test.ts packages/adapters/codex-local/src/server/codex-args.test.ts --run` passed: 3 files, 10 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/adapter-codex-local --filter @paperclipai/adapter-claude-local typecheck` passed.
- `rg -n "# Paperclip environment variables|# Generated by Paperclip worktree repair|Default execution environment for Paperclip|Paperclip external adapter plugins|Paperclip bundled|Paperclip workspace|Paperclip dashboard|Paperclip plugin API surface|Paperclip could not load subscription quota data|Paperclip will ignore it for model|Paperclip will import the routine trigger" server/src/worktree-config.ts server/src/services/environments.ts server/src/services/adapter-plugin-store.ts server/src/services/company-skills.ts server/src/routes/plugins.ts packages/adapters/claude-local/src/server/quota.ts packages/adapters/codex-local/src/server/codex-args.ts server/src/services/company-portability.ts` returned no matches.
- `git diff --check` passed.
- `rg -n "[[:blank:]]$" server/src/__tests__/backend-admin-copy.test.ts server/src/__tests__/environment-service.test.ts packages/adapters/codex-local/src/server/codex-args.test.ts server/src/worktree-config.ts server/src/services/environments.ts server/src/services/adapter-plugin-store.ts server/src/services/company-skills.ts server/src/routes/plugins.ts packages/adapters/claude-local/src/server/quota.ts packages/adapters/codex-local/src/server/codex-args.ts server/src/services/company-portability.ts` returned no matches.

## Remote Gateway Onboarding Copy Slice - 2026-05-07

Twenty-fifth verified DearMe slice:

- Replaced remaining remote-gateway onboarding/runtime guidance that still said `Paperclip` or exposed the OpenClaw invite label in generated wake prompts, gateway environment-test hints, gateway onboarding docs, and the CEO onboarding asset.
- Preserved real protocol and compatibility terms, including `openclaw_gateway`, `x-openclaw-token`, `PAPERCLIP_*`, `X-Paperclip-Run-Id`, package paths, adapter names, API endpoints, and claimed-key file names.
- Strengthened the existing adapter configuration source guard and the live gateway payload test so generated remote-gateway wake text proves the DearMe-facing wording.

Verification:

- Confirmed `server/src/__tests__/adapter-configuration-copy.test.ts` failed before production edits on stale `Paperclip wake event for a cloud adapter.` source copy.
- Confirmed `server/src/__tests__/openclaw-gateway-adapter.test.ts` failed before production edits because the generated gateway payload still contained the stale wake-event line.
- `pnpm exec vitest server/src/__tests__/adapter-configuration-copy.test.ts server/src/__tests__/openclaw-gateway-adapter.test.ts --run` passed: 2 files, 10 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/adapter-openclaw-gateway typecheck` passed.
- `rg -n "Paperclip wake event for a cloud adapter|Verify network reachability and gateway URL from the Paperclip server host|Generate OpenClaw Invite Prompt|wait for Paperclip wake events" packages/adapters/openclaw-gateway/src/server/execute.ts packages/adapters/openclaw-gateway/src/server/test.ts packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md server/src/onboarding-assets/ceo/AGENTS.md` returned no matches.
- `git diff --check` passed.
- `rg -n "[[:blank:]]$" server/src/__tests__/adapter-configuration-copy.test.ts server/src/__tests__/openclaw-gateway-adapter.test.ts packages/adapters/openclaw-gateway/src/server/execute.ts packages/adapters/openclaw-gateway/src/server/test.ts packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md server/src/onboarding-assets/ceo/AGENTS.md` returned no matches.

## Plugin Loader Copy Slice - 2026-05-07

Twenty-sixth verified DearMe slice:

- Replaced plugin loader/runtime copy that still described installable packages, manifest validation, and event-bus routing as `Paperclip` plugin surfaces.
- Preserved compatibility contracts and internal identifiers, including `PaperclipPluginManifestV1`, `paperclipPlugin.manifest`, `paperclip-plugin-*`, and the legacy `~/.paperclip/plugins` managed directory.
- Added focused source-level coverage so plugin install/refresh errors stay DearMe-facing without hiding the real compatibility keys that plugin packages still depend on.

Verification:

- Confirmed `server/src/__tests__/plugin-loader-copy.test.ts` failed before production edits on stale `Naming convention for npm-published Paperclip plugins.` source copy.
- `pnpm exec vitest server/src/__tests__/plugin-loader-copy.test.ts --run` passed: 1 file, 1 test.
- `pnpm exec vitest server/src/__tests__/plugin-database.test.ts --run` passed: 1 file, 11 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `rg -n "Naming convention for npm-published Paperclip plugins|Packages matching this pattern are considered Paperclip plugins|Discover Paperclip plugins installed as npm packages|Returns null if the package is not a Paperclip plugin|Throws if the package is a Paperclip plugin but the manifest is invalid|Check whether a package name matches the Paperclip plugin naming convention|does not appear to be a Paperclip plugin \\(no manifest found\\)|no longer exposes a Paperclip manifest|if the package is not a Paperclip plugin|Paperclip plugin system" server/src/services/plugin-loader.ts server/src/services/plugin-event-bus.ts` returned no matches.
- `git diff --check` passed.
- `rg -n "[[:blank:]]+$" server/src/__tests__/plugin-loader-copy.test.ts server/src/services/plugin-loader.ts server/src/services/plugin-event-bus.ts` returned no matches.

## DearMe Customer Web Shell Isolation - 2026-05-07

Twenty-seventh verified DearMe slice:

- Added a DearMe-specific customer sidebar for `/dearme` with product vocabulary:
  Home, Decisions, Work Ready, Voice & Memory, Brand OS, Content, Opportunities,
  Portfolio, and Reports.
- Updated the shared `Layout` so DearMe routes use the DearMe shell instead of
  the inherited Paperclip/operator sidebar.
- Hid CompanyRail, PropertiesPanel, MobileBottomNav, and create issue/project/
  goal/agent dialogs on DearMe routes so the first customer surface no longer
  feels like an operator board.
- Kept the underlying Paperclip routes and runtime substrate intact for internal
  work; this slice only changes the DearMe customer shell.
- Changed DearMe review/open actions to route back into `/dearme?view=decisions`
  instead of sending customers to raw `/issues/*` or `/approvals/*`.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx ui/src/pages/DearMeOnboarding.test.tsx` passed: 3 files, 16 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DearMe-Owned Decision Detail Panels - 2026-05-07

Twenty-eighth verified DearMe slice:

- Added DearMe-side parsing for `/dearme?view=decisions&approval=...`,
  `/dearme?view=decisions&issue=...`, and
  `/dearme?view=decisions&issue=...&output=...`.
- Rendered focused decision/work panels inside the DearMe workbench instead of
  relying on raw issue or approval pages.
- Rendered focused private output detail from the existing DearMe outputs API,
  including preview, prepared detail fields, status, and private document count.
- Updated the DearMe sidebar active-state logic so focused decision URLs still
  keep the customer-facing Decisions nav item active.
- Kept the slice UI-only: no new API contract, no new database schema, no
  mutation of approval internals, and no deletion of Paperclip substrate routes.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx ui/src/pages/DearMeOnboarding.test.tsx` passed: 3 files, 19 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DearMe ActionCard Review Actions - 2026-05-07

Twenty-ninth verified DearMe slice:

- Turned focused DearMe approval panels into action cards with approve,
  request-changes, and reject controls.
- Reused the existing approvals API client and server approval gate contract;
  no new approval system, schema, route family, or runtime mutation path was
  introduced.
- Added a DearMe decision note field so the user's call travels through the
  existing approval `decisionNote` surface.
- Kept focused decision actions inside `/dearme?view=decisions&approval=...`
  and asserted that raw `/approvals/*` routes do not leak into the customer
  surface.
- Used the Lindy/InternX/Paperclip reuse read as interaction guidance: compact
  action card, per-item pending lock, and async decision affordances, but
  without importing Lindy's application shell.
- Fixed duplicate role-key rendering in DearMe team preview/workbench cards so
  local browser verification does not emit React key warnings when seed data
  repeats a role.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx ui/src/pages/DearMeOnboarding.test.tsx` passed: 3 files, 22 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Local browser smoke with `pnpm dev:server` + `pnpm --filter @paperclipai/ui
  dev` passed on `/dearme?view=decisions&approval=approval-ready`: title
  `Team · DearMe · DearMe`, DearMe and Personal brand team visible, health
  failure absent, duplicate-key console errors 0.

## Known Gaps

- The `Process adapter missing command` blocker is fixed for newly applied Brand OS approvals, not retroactively for old smoke data.
- Pre-fix DearMe issues `DEAA-13` through `DEAA-18` remain blocked/stale in the local dev database unless cleaned up or regenerated.
- The paid-beta "work happened while I was away" loop now produces customer-facing content through `codex_local`, and regression plus live-smoke coverage prove first reviewable output lands in `in_review` without an extra productive-terminal continuation.
- The agent JWT warning is resolved for the default local instance after `pnpm paperclipai onboard --yes`, but this depends on local instance config and should be covered by a clean setup/preflight pass.
- Runtime liveness after review handoff is regression-covered and live-verified for the first-output path, generated-content active-author revise path, and weekly report document-output path. Weekly report reviewer accept/revise/reject is now live API-smoked, including revise re-dispatch to the Growth Analyst and clean accept/reject closure.
- Generated content reviewer accept/reject has live API smoke coverage, the terminated-author revise guard has browser smoke coverage, and active-author revise now has live API smoke coverage proving the right content agent wakes and returns reviewable private output to `in_review`.
- Weekly report writeback and reviewer decisions are live-smoked through document revisions, review handoff, accept, reject, revise, and now rendered browser evidence for the report panel. The rendered pass uses the Playwright fallback because Browser Use tools were not exposed after tool discovery.
- Generated Brand OS, voice, content, opportunity, portfolio, and weekly-report outputs now have shared contract, route, service, UI, focused regression coverage, full test/typecheck/build coverage, desktop/mobile browser evidence on `/dearme`, and a fresh active paid-beta lifecycle smoke with company `ceb91b77-68a9-4075-b662-cfbe34e3ae93`.
- The fresh active output Review-click smoke no longer emits the cancelled
  recovery run log 404 after the issue-detail transcript hydration polish; the
  re-run recorded zero same-origin failures and zero console errors.
- Visible-label passes removed `Paperclip` from the main entry surfaces and the targeted runtime/admin/plugin/adapter/routine/workspace surfaces audited so far; the latest pass also removed OpenClaw labels from the teammate invite/gateway display surfaces and raw adapter ids from hire-agent approval payloads. Broad source still contains internal compatibility identifiers, package names, storage keys, CSS names, Lucide icon identifiers, `.paperclip.yaml`, exact gateway contract keys, and real `pnpm paperclipai ...` commands, so do not treat the whole codebase as product-copy clean yet.
- Browser smokes used available fallbacks rather than the Browser Use plugin because the required browser execution tool was not exposed after tool discovery. The latest paid-beta fake-customer, weekly report reviewer, and generated-output handoff passes used Playwright.
- The previous full-suite blocker from host Tailscale detection is fixed in `cli/src/__tests__/network-bind.test.ts` and `cli/src/__tests__/onboard.test.ts`; `pnpm test:run` is now green.
- Full `pnpm -r typecheck` and `pnpm build` are now green for the current tree. The build still emits existing non-blocking Vite warnings for `MarkdownEditor` chunking and large chunks.
- Paid-beta access now has focused contract/route/UI verification, full test/typecheck/build coverage, a desktop/mobile fake-customer browser/API journey, and clean-install/local-app verification against an isolated local home. The initial fully isolated `pnpm` onboarding attempt exposed only a pnpm tool-cache harness issue; the app first-run path and actual `pnpm paperclipai run` path both verified against the same isolated Paperclip home.
- The isolated `/tmp/dearme-clean-local.CNG6u6` home contains one smoke company/payment and can be deleted after the evidence is no longer needed.
- The clean mobile full-page screenshot shows the fixed bottom nav crossing through content at the captured viewport fold. The paid-beta panel itself rendered and functioned correctly, but this remains a visual polish risk for mobile full-page capture.
- The local dev database now contains smoke approvals `b9d605b6-4c62-40d5-bac2-960d25d9ffc1`, `84e4dcea-a30d-419c-a83b-9fc4c70c1d5a`, `915a7866-e53d-432f-bea7-d4587663850e`, `840cd202-540c-4a2c-a376-d2ea78eed338`, `4cbd056f-3f9d-47a4-a9d3-b4a76d737563`, `2df0e229-5caa-441b-90e9-4e7a1dc60d62`, `519caeef-3252-41b9-a11d-753b33ecf444`, `a3e02ffa-4230-4e05-9977-66ab79327642`, `d40f9acf-3fac-4be5-a660-6fb946b8db69`, `8398a7e3-cb33-4ce9-ba10-f4e9522a6f29`, `bc3f2eab-e675-4b2c-960a-54ca7bd3b5c7`, `36e61ca3-0a28-4599-804f-fe45420ea376`, `a1229131-632d-49ce-a29f-453e640481e6`, `df7a1333-c14a-4369-b395-110ca68a0680`, `b2bb8a9d-649c-48dc-b398-afac8efaeb62`, `2ca6835f-7b46-4f19-99e5-dfa9abae3c63`, `338871e5-ee1b-4f6e-be14-a05cc6bc7884`, `6c370c67-4fe1-422d-a243-832f289003dd`, and `0481af14-6da5-414a-ae32-1da7f10d4f05`.

## Next Slice

Make the runtime loop paid-beta credible now that Codex receives task context, produces content, updates the attached weekly report document, has live-verified review handoffs for content and report output, only auto-starts the content lane by default, has live-verified weekly report reviewer decisions, and now shows generated work on `/dearme`:

1. Continue reducing remaining product-copy leakage while preserving internal
   compatibility identifiers and real CLI/package names.
2. Re-run full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build` after the
   next implementation slice; all three are green for the current tree.
