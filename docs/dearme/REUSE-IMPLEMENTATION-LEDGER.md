# DearMe Reuse Implementation Ledger

Date: 2026-05-11
Owner: DearMe coordinator thread

## Purpose

This ledger is the current coordination artifact for reuse-first DearMe work.
It answers three questions before another worker starts building:

1. Which donor source should guide the feature?
2. What DearMe implementation already exists?
3. What is the next bounded ticket that increases reuse without restarting the
   product?

## Latest Symphony Worker Boundary - 2026-05-11

- DEA-61 makes the provider smoke harness operator-usable by adding local
  `--env-file` loading, a `--print-env-template` bootstrap, and ignore rules
  for `.dearme-provider-smoke.env`. Real provider credentials should now feed
  the existing smoke gate from that local file or host env, while production
  deploy remains disabled by default and LinkedIn/Meta live smokes still need
  both `--live` and `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1`.
- DEA-60 adds an internal provider smoke harness on top of the existing
  `ChannelDispatch` implementations instead of adding another connector or
  settings surface. `pnpm dearme:provider-smoke -- --check` now tells the
  coordinator which live values are missing; safe preview site receipt smokes
  can run directly, production site smoke verifies the returned URL content
  once host env is enabled, and LinkedIn DM / Meta campaign smokes require both
  `--live` and `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1`. Keep future live proof
  on this harness unless the provider contract itself changes.
- DEA-59 / DM-176B/DM-178B put provider dispatch config on the default app handoff
  path instead of leaving it as a constructor-only test seam. LinkedIn partner
  endpoint env now decides whether the direct `send_linkedin_dm` dispatcher is
  registered; Meta Graph API base URL env can be passed into the paid-ad
  dispatcher for live smoke/tooling. Neither env bridge bypasses approval,
  `channel_connections`, credential validation, or per-tool payload checks.
- DEA-58 reuses the existing Work Ready / Decisions Needed / first proof pack
  choreography and Lindy-style action-card grammar to make the next decision
  and proof lane explicit in the customer cockpit. The cut stays on the
  current DearMe shell and output-handoff contract; it does not add a new
  dashboard, runtime queue, or settings surface.
- DM-178 closes the fifth outbound tool dispatch seam by adding
  `dearme-meta-campaign-dispatch.ts` instead of replaying Polsia's larger
  12-tool ads surface. The coordinator cut reuses the shared wrapper,
  `channel_connections`, and credential resolver; requires a stored Meta ads
  credential with `ads_management`; enforces the existing test/ramp/scale daily
  budget tiers plus the 7-day learning-window rule; creates a paused Meta
  campaign receipt; and leaves live customer claims gated on a real Meta
  OAuth/Marketing API smoke. Future ads work should extend from this dispatcher
  and the existing Ads Manager state machine, not add another ad dashboard or
  credential store.
- DM-176A closes the cloud-side partner dispatch seam for LinkedIn DM without
  importing browser automation, cookie scraping, or a guessed LinkedIn private
  API. The coordinator cut adds `dearme-linkedin-dm-dispatch.ts`, reuses the
  shared channel credential resolver, requires a stored partner credential with
  `send_dm` capability, and only registers the direct dispatcher when a partner
  `messagesUrl` is configured so the existing OpenClaw gateway fallback is not
  shadowed by an unconfigured path. Live LinkedIn delivery remains a partner
  endpoint + credential smoke, not a new connector/settings surface.
- DEA-51 is coordinator-absorbed as the DM-173B X OAuth start + callback
  exchange path. Symphony worker head `29e9e983` proved the useful token/profile
  exchange direction, but the coordinator cut keeps the stronger current-head
  boundary: approved retry `oauthStartUrl`, PKCE start state, browser GET
  callback, POST callback seam, same-origin return guard, opaque credential
  storage, focused tests, and docs. Do not replay the worker's duplicate
  `dearme-x-oauth.ts` service name.
- DEA-43 is coordinator-absorbed as the DM-145F-B fetch transport proof. The
  current branch keeps the worker's useful fetch-transport direction, but on the
  narrower existing executor seam: explicit endpoint/key config, routed DearMe
  model selection, Anthropic `x-api-key` plus version headers, and no SDK/UI
  expansion. Future runtime tickets should consume this seam instead of
  replaying the worker's older base-url/bearer-header patch.
- Symphony worker lanes now have an explicit coordinator watchdog boundary in
  `.symphony/WORKFLOW.md`: bounded `turn_timeout_ms` / `stall_timeout_ms`
  values, a first-turn instruction to hand off on context compaction or
  no-diff narrow inspection, and a coordinator expectation that large-context
  runs end in patch/no-code/blocker evidence rather than open-ended donor
  research. This keeps implementation workers absorbable while the persistent
  Goal thread owns architecture and product direction.
- DM-CH-02 adds the narrow approved-next-move gateway dispatch boundary by
  deriving a `ChannelDispatch` trace context from `CallOutboundInput`, while
  reusing `channel_connections` and the `openclaw_gateway` adapter execute path.
  The bridge fails closed when gateway config is absent instead of inventing a
  second credential store or a customer dispatch surface. The runtime config
  bridge is the existing `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` env
  pair used by the smoke tooling; keep any later config source on that same
  shape rather than adding a second secret store or UI.
- DEA-36 turns the first proof pack into one launch-ready next step by reusing
  the existing output handoff, `dearme_output_next_move` approval payload,
  private receipt activity, Workbench projection, and onboarding proof-pack
  surface. Keep this as the launch-readiness path; do not add a second launch
  queue, first-run contract, runtime dashboard, or direct send/publish surface.
- DEA-34 now closes the missing issuance half of DM-145C with a dedicated
  admin route at `POST /agents/:id/keys/dearme-proxy`. The route reuses the
  existing `agent_api_keys` table and `agentService.createApiKey(...,
  { prefix: "dm_sk_" })`, while the normal `POST /agents/:id/keys` route
  stays on the default `pcp_*` family. This keeps prefix selection out of the
  public/admin payload shape and preserves the current revocation/storage
  model.
- DM-145D closes the onboarding gap by issuing the proxy credential during the
  DearMe apply flow, storing the token in a backstage company secret, and
  binding it only to the Chief of Staff agent through `adapterConfig.env`.
- No customer-facing key-management surface or second auth store was
  introduced.
- DM-145B is now anchored on the existing `agent_api_keys` substrate rather
  than a second DearMe key store. The proxy runtime should resolve `dm_sk_*`
  bearer tokens to authenticated company/agent context from that table, then
  ignore spoofable company/agent headers on the normal path.
- `agentService.createApiKey()` now has a conservative `pcp_` / `dm_sk_`
  prefix option so the current `pcp_*` agent-key family remains the default
  while DM-145 can mint `dm_sk_*` keys later without a parallel generator.
- Remaining follow-up for the reuse lane: keep later proxy calls on the same
  agent-key storage and revocation path.
- DEA-42 is coordinator-absorbed as the DM-145F proxy executor boundary. The
  current head already carries the stronger fixture executor set in
  `server/src/services/dearme-ai-proxy-executors.ts`, default app wiring via
  `createDearMeAiProxyRouteOptions()`, and route/service tests, so do not
  replay the duplicate executor-wrapper worker tip. Future DM-145 runtime work
  should consume this boundary plus the settled routing, cache economics, auth,
  and `dm_sk_*` issuance helpers.

DearMe should maximize reuse, but "reuse" means adapting the strongest proven
primitive into the DearMe product surface. It does not mean importing a whole
foreign UI, exposing donor terms to customers, or replacing the working
Paperclip/Naive substrate with an unverified parallel runtime.

## Current Decision

DearMe remains:

```text
Polsia choreography
+ Naive/Paperclip substrate
+ Lindy interaction patterns
+ DearMe personal-brand product shell
```

The right reuse split is:

- Polsia: product rhythm, onboarding compression, visible AI-team momentum,
  cycle/report/approval choreography, cost-aware autonomous loop patterns.
- Naive/Paperclip: auth, tenancy, agents, issues, routines, approvals,
  documents, work products, activity, cost events, adapters, and app/site
  provisioning ideas.
- Lindy: premium web interaction patterns, action cards, pending-review
  surfaces, knowledge/source management, slide-out detail panels, prompt input,
  and model routing/circuit-breaker ideas.
- Littlebird: web shell/onboarding/product polish reference when we need a
  broader customer-facing shell pass.
- Symphony: development factory and cooperation spine only; not the DearMe
  product runtime.

## Latest Symphony Absorption - 2026-05-11

- DEA-43 is coordinator-absorbed as the DM-145F-B fetch-transport proof at
  `60440508`. Symphony proved the direction, and the coordinator kept the final
  cut on the endpoint-based executor, routed model boundary, Anthropic
  `x-api-key`/version headers, and route/service tests. Both DEA-43 worker heads
  are recorded in `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony
  patrols treat the lane as reviewed_absorbed rather than replayable work.
- DEA-42 is coordinator-absorbed as the DM-145F executor-boundary slice at
  `31e9d683`. Symphony produced the worker proof, but the coordinator kept the
  final cut on the existing route-options service, fixture executors, default
  app mount, and route/service tests. The worker tip is recorded in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so the remaining Symphony
  workspace is reviewed_absorbed rather than a fresh implementation lane.
- DEA-36 is coordinator-absorbed as the DM-147 launch-ready next-step slice.
  Symphony provided the proof-pack summary/output-handoff refinement in worker
  handoffs `47b31e0f`, `63ec69b6`, and useful follow-on `dbe46539` grammar,
  and the coordinator kept the final cut on the existing receipt, Workbench,
  shared contract fixture, and onboarding projection paths. Customer-facing
  copy says one launch-ready next step/brief and the shared proof-pack sentence
  is reused across ready work, decisions, output review loops, and report
  digest text; the internal `execution_handoff_prepared` kind stays backstage.
- DEA-31 is coordinator-absorbed as the DM-155 prompt-cache economics contract.
  The worker proved the narrow cache-accounting shape; the coordinator kept the
  final cut at the proxy package boundary with a `./cache-economics` subpath,
  prompt-cache breakpoint helper, provider usage normalizer, cache economics
  summary, and `CostLedgerEvent` builder. This advances the remaining
  moat/economics lane without touching HTTP runtime, DB schema, UI, or
  customer-facing provider/model language. Future DM-145 runtime code should
  call these helpers instead of copying Anthropic/OpenAI usage parsing inline.
- DEA-30 is coordinator-absorbed as the DM-143A proxy model-routing contract at
  `3af18fc4`. The proxy package now exposes a customer-contract-facing
  `./model-routing` subpath and root exports for complexity `1-10` to
  `fast` / `balanced` / `deep` model rows, while reusing the canonical
  prompt-package `MODEL_ROUTING_TABLE` and `pickModelForComplexity()` instead
  of duplicating thresholds. The coordinator closed Linear `DEA-30` only after
  rerunning proxy tests/typecheck and recording the durable handoff artifact.
- DEA-28 is coordinator-absorbed as the DM-153 silence-default review slice at
  `d451d051`. It adapts the Polsia score-7 default into DearMe's current output
  review contract instead of adding a scheduler or second approval system:
  `silenceDefault` can only resolve private review as approve, writes a
  customer-safe "kept moving after no response" receipt plus memory feedback,
  and deliberately skips next-move approvals, issue approvals, launch handoffs,
  public posts, sends, deploys, and spend. Future autonomy work should reuse
  this explicit marker pattern for private learning defaults and must not infer
  silence as approval for external actions. Follow-up `86c65876` carries the
  explicit private `7/10` score and launch-boundary reminder through the shared
  contract, server projection, and DearMe UI.
- DEA-27 is coordinator-absorbed as the DM-149 emergency pause intent slice at
  `70ef7f59`. Customer stop, pause, hold, not now, and do-not-send/publish/
  deploy/spend notes now short-circuit approved launch handoffs before outbound
  dispatch, then project a paused private handoff through the existing receipt,
  Workbench progress, and handoff panel. This is the right trust/autonomy
  direction: DearMe feels more independent because it can keep working, but the
  user has an immediate human stop handle without seeing a control plane.
- DEA-26 is coordinator-absorbed as the connect-channel handoff receipt slice at
  `2b8aa781`. It turns the existing `launchHandoff` publish gate into a
  customer-safe private receipt and Workbench progress next step when X is not
  connected, while reusing the current receipt service, activity projection, and
  handoff panel. Do not create a separate launch queue, runtime dashboard, or
  dispatch surface for this gap.
- DEA-25 is coordinator-absorbed as the approved launch handoff executor across
  `45a9ad64` and `12277c95`. The useful worker output was the content-packet
  `launchHandoff` shape; the coordinator completed the missing approved-payload
  consumer so final approval can call the existing outbound wrapper with
  `preapprovedApprovalId`. Keep future launch work on this path: content draft
  packet -> private approval -> next-move approval payload -> outbound wrapper
  gate. Do not reopen a parallel publisher, direct X sender, or second approval
  channel.
- With DEA-25, DEA-26, DEA-27, DEA-28, DEA-30, and DEA-31 absorbed, the
  launch-handoff, trust-stop, private-silence autonomy, proxy
  model-routing-contract, and prompt-cache-contract lanes have enough proof to
  stop adding writers on those surfaces. The next useful product worker should
  be a disjoint autonomy/quality slice, a read-only browser smoke/QA pass
  against the now-paused/defaulted handoff paths, or the DM-145 HTTP proxy
  runtime that consumes the settled routing/cache contracts. Do not add another
  writer to launch, connect-channel, pause, silence-default review, proxy
  model-routing, or prompt-cache accounting unless a regression appears.
- DEA-23 hardens the Symphony development factory after the DEA-21 cleanup
  miss: worker terminal handoff now exports committed changes as durable
  `format-patch`, `git bundle`, and JSON summary artifacts under
  `/private/tmp/dearme-symphony-workspaces/_handoffs`. Treat a worker-local hash
  alone as insufficient for changed-file lanes; coordinator absorption should
  use the artifact paths printed by `pnpm dearme:symphony-handoff -- --issue
  DEA-123 .` when the per-ticket workspace may be cleaned.
- DEA-21 is coordinator-absorbed as the Private Site Host Smoke slice. The
  first-cycle preview now carries a handle-safe `dearme.app/<handle>` private
  preview route through the shared contract, server proof documents, apply
  artifacts, and onboarding proof card. This keeps the aha moment concrete
  without claiming public deploy or adding another site runtime; the route stays
  behind the existing deploy approval boundary. Symphony had already marked the
  worker lane Done and cleaned its workspace before coordinator absorption, so
  this pass recovered the inspected patch onto current main and fixed the
  explicit-handle preservation gap in the memory-enriched service path.
- DEA-44 extends that same boundary: the approved private-site handoff now
  turns the `dearme.app/<handle>` proof route into an existing `deploy_site`
  dispatch attempt when the launch handoff is approved, and falls back to a
  safe `needs_connection`/pending-style receipt when the required config or
  channel connection is absent. Keep using the outbound wrapper and approval
  receipt surfaces rather than introducing a separate deploy lane.
- Symphony worker startup now includes `pnpm dearme:symphony-preflight -- .`
  as both workspace-creation and Codex bootstrap evidence. This keeps the
  DEA-19 `.git/index.lock` failure mode from recurring after a worker has
  already produced a useful patch: future lanes should stop before
  implementation if Git metadata is locked, stale, dirty, or unwritable.
- A briefly opened overlapping `DEA-22` launch-decision ticket was closed as
  duplicate of `DEA-21`; keep that pattern for the next lanes too: one product
  writer on a customer-facing surface, with extra Codex help limited to
  read-only review, QA, or disjoint infrastructure work.
- DEA-20 is absorbed as a no-code OpenClaw Chief pairing smoke: the existing
  plugin package already proves the manifest, generated skills, bootstrap
  files, required config, and outbound approval-gate bindings. This keeps
  OpenClaw as backstage install/pairing substrate and avoids competing with the
  Opportunity Hunter shortlist or first-run onboarding surface.
- DEA-19 is coordinator-absorbed as the Opportunity Hunter private shortlist
  slice. The first-cycle proof package now carries five private targets with
  fit reasons, relevance scores, outreach angles, and draft first messages
  while preserving `opportunityLead` as a compatibility alias for the first
  lead. Keep this path additive: do not reopen a separate single-lead surface,
  do not add another opportunity dashboard, and do not bypass `send_email`.
- DEA-19 also exposed a Symphony infrastructure wrinkle: the worker produced a
  valid patch but could not create `.git/index.lock` inside its temporary
  workspace. For now, treat this as a coordinator-absorption fallback case; the
  product lane is sound, but worker workspace Git writability should be fixed
  before relying on worker-created commits for every changed-file lane.
- DEA-17 is absorbed locally on the coordinator branch at `08137399`: the
  default DearMe first glance now centers one private result, one next decision
  or review action, and one first-cycle start/continue CTA. The coordinator
  absorbed the useful worker simplification but did not cherry-pick the worker
  commit because it lacked the required OmX coauthor trailer. Keep this as the
  current rule for first-run aha work: one product-surface writer, plus
  read-only review or narrow browser/harness lanes only.
- DEA-18 is coordinator-absorbed as the browser-level proof lane for the first
  private outcome. The blocker was harness/environmental: embedded PostgreSQL
  failed during e2e webServer boot before browser execution on this host. The
  harness now prefers an isolated throwaway external PostgreSQL database when
  available, preserves embedded PostgreSQL fallback, and tears down generated
  `paperclip_e2e_%` databases after the run. This keeps the fix proof-only and
  avoids redesigning onboarding or adding another visible work queue.
- The current worktree inventory has no unabsorbed queue: 117 DearMe
  worktrees, 0 `not_in_current`, 0 dirty, 0 prunable, and 113
  `reviewed_absorbed`. Remaining old worktrees are audit/owner-confirmation
  cleanup, not replay candidates.
- Remote publication of `08137399` is blocked by GitHub auth for
  `paperclipai/paperclip` under credential `WuKongAI-CMU`; Symphony workers can
  still start from the local coordinator checkout.
- DEA-16 / DM-171A closed as a no-code install-proof lane: the existing
  `@paperclipai/dearme-openclaw` package already proves the plugin scaffold is
  coherent from the current coordinator head. The manifest points OpenClaw at
  `./generated/skills`, all 12 generated skill folders contain `SKILL.md`, the
  four bootstrap files are present, and the config schema requires `apiKey` plus
  `handle`. This finishes the plugin-install proof portion of DM-171; the
  customer onboarding bridge is already represented by the existing first-run
  surface and does not require a second setup wizard.
- DEA-15 / DM-183BZ closed as a no-code proof lane: the existing
  first-cycle start, private handoff, Workbench projection, and DearMe
  onboarding surfaces already produce a sample/demo package with Chief of Staff
  private work plus a focused review decision card. The useful coordination
  lesson is that first-cycle aha proof lanes do not need more writers once the
  path is test-proven; they need terminal evidence, one coordinator absorption
  point, and then the next single bounded product lane.
- DM-183BY adds a Symphony terminal handoff guard: worker lanes must leave a
  local commit, explicit no-code evidence, or a blocker/patch handoff before a
  terminal claim is acceptable. This keeps Linear state from becoming a proxy
  for integration truth and protects the coordinator from cleaned workspaces
  with no absorbable artifact.
- DEA-13 closed as a no-code proof lane: the existing first-cycle start,
  private handoff, Chief of Staff brief, and focused decision surfaces already
  produce the intended private-run path. The worker left explicit no-code plus
  API-smoke evidence, and the coordinator reran focused route/UI coverage on
  the current head.
- DEA-12 was marked Done in Linear/Symphony without leaving an absorbable
  branch or live workspace on the coordination head, so the coordinator
  recovered the useful Voice Gate slice directly: the current scorer now passes
  concrete first-person private work at the default floor, remembers accepted
  same-voice samples for a bounded continuity boost, and blocks hidden process
  language without echoing model/fingerprint/runtime/provider/adapter/queue or
  donor terms into customer-facing scoring reasons.
- DEA-11 / DM-183BO is absorbed on the current coordination head as a
  browser/API proof rather than a stale workspace replay. The smoke follows the
  real approval path from prepared output review to final launch-call approval,
  then verifies the private handoff panel and `work=` / `artifact=` brief
  navigation without exposing hidden substrate terms.
- DM-183BV makes Symphony the cooperation spine for future DearMe work while
  keeping it backstage. The live product contract is the typed work-event
  projection in shared/server code: `action`, `customerSummary`,
  `artifactTarget`, `decisionNeed`, and `traceRefs` let Symphony-style work
  become DearMe decision cards without exposing queue, run, model, provider, or
  worker machinery.
- DM-084, DM-086, DM-095, both DM-097 heads, DM-098, and DM-101 are now
  recorded as exact-head reviewed absorptions. Their useful product value maps
  to current paid-beta guardrails, donor-reuse docs, Work Ready review, typed
  work events, product-copy leak guards, and private-cycle route blockers.
- DM-048 route/auth safety head
  `e9ff182462daed1076112700985056c39984ac55` is recorded as absorbed by the
  current DearMe route error boundary for auth, access, and validation failures.
- DM-049 approval-preflight head
  `235a5d04bb1c8ac81cc1ef03509e2e65712217ae` is recorded as absorbed by the
  current Brand OS approval validator and approval-service preflight, so
  malformed DearMe approvals stay pending before mutation.
- DM-050 profile-selection copy head
  `08068692545c9f17e44c5133f23e06f0a6e29efb` is recorded as absorbed by the
  current onboarding profile guard and regression coverage, keeping missing
  profile copy DearMe-owned instead of company-owned.
- DM-051 and DM-052 approval-surface heads are recorded as absorbed by the
  current shared DearMe approval helper, structured approval payload rendering,
  product-owned ApprovalDetail breadcrumbs, and DearMe approval-card decision
  routing.
- DM-053 through DM-057 approval routing/action heads are recorded as absorbed
  by the current inbox, activity, issue-detail, approvals-list, and
  approval-detail flows, so DearMe approval decisions return to DearMe-owned
  surfaces while generic approval behavior stays shared. DM-053's remaining
  inbox-search gap is closed by matching DearMe approval rows on product labels
  instead of raw DearMe approval type identifiers.
- DM-058 error-boundary hardening head
  `1926aa9ec4550509535e53041ec1773803e7ebfd` is recorded as absorbed by the
  current DearMe-only internal error sanitizer and regression coverage for
  inherited substrate names, model/token wording, execution routes, API key
  wording, and decision routes.
- DM-059 through DM-063 approval error/rejection heads are recorded as absorbed
  by the current shared DearMe approval helpers. The remaining live code delta
  centralizes reject-success navigation in `approvalRejectedHref`, so both the
  approval list and inbox return DearMe rejections to the DearMe decision
  surface while generic approvals stay on the shared route.
- DM-064 through DM-078 issue-chat, activity-history, issue-sidebar, and
  markdown-reference heads
  are recorded as absorbed by the current DearMe run/transcript projection,
  work-history surface, activity-event projection, scheduled follow-up card,
  generic-control hiding boundaries, read-only state controls, and raw
  reference-link suppression. Linked runs, transcript placeholders, activity
  history, scheduled follow-ups, workspace cards, tree/live indicators,
  identifiers, related-work/plugin/subtask entries, properties controls, state
  controls, and issue-reference markdown now stay on DearMe-owned language and
  keep raw run routes, agent links, model-profile details, liveness substrate
  failures, cost summaries, monitor metadata, raw issue identifiers, and
  generic operator controls behind the product boundary.
- DM-083 output-feedback-learning head
  `1eba64eab3e819abe1aa0d643d5199369442d2f6` is recorded as absorbed by the
  current review-feedback learning path: review comments save as
  `review_feedback` Voice & Memory activity, project through customer-safe
  `feedbackTrace`, and render as `Review preferences`.
- DM-084 review-learning-summary head
  `344b913d8f6e422054da3c61865abb41f3591a59` is recorded as absorbed by the
  evolved review preference and feedback trace surface, without restoring the
  stale separate review-learning service shape.
- DM-085 review-preferences head
  `02042e9c29136413d5066702796705176724032f` is recorded as absorbed because
  current refreshed private work carries last-feedback context and shows saved
  review notes as next-draft guidance before anything public happens.
- DM-086 donor-reuse-architecture head
  `fc584f31326d35397a45e2ef4bafbb4e75d45136` is recorded as absorbed by the
  current integrated architecture and reuse ledger: Polsia choreography,
  Naive/Paperclip substrate, Lindy interaction grammar, and Symphony
  development factory stay in their product-fit lanes.
- DM-087 work-event-contract head
  `aea19d9057dca08ed91e4d6f0ee7716306e39252` is recorded as absorbed by the
  current team-progress event projection and DM-183BV's current-contract port:
  `workStream` items now carry `action`, `customerSummary`, `artifactTarget`,
  `decisionNeed`, and `traceRefs` while preserving the evolved cycle stage,
  source label, cost impact, review loop, run ledger, and final approval gate.
- DM-088 Lindy/workstream UI heads
  `ff5a745f611ab6475b81877e6d6863a2faf98d4b` and
  `0ed881448c0a5b32004dfd6ed81307969bf69cd6` are recorded as absorbed by the
  current decision-first team progress surface: `TeamWorkstreamPanel`,
  `Team progress map`, `Private progress letter`, `See progress`, and
  `Review work`.
- DM-089 Voice & Memory source-ingestion head
  `b13a17c9cac6950898e3a1f70ec1a872f2532e4c` is recorded as absorbed by the
  current typed source paths for paste, private link, and import note, plus
  source review queues, private source shortcuts, and source mutation APIs.
- DM-043 memory-label safety head
  `f3b3f7420c556aa6103c32c4b31654bd515edce6` is recorded as absorbed by the
  current Voice & Memory context normalization path, without restoring the
  stale `dearme-voice-memory-grounding` service.
- DM-044 and DM-045 customer-safe projection heads are recorded as absorbed by
  the current Workbench memory/output projection and regression coverage, so
  DearMe keeps the customer-safe mapper in the live workbench path instead of
  adding a second projection service.
- DM-046 and DM-047 source/action error heads are recorded as absorbed by the
  current DearMe onboarding error boundaries for source mutations, Brand OS
  preview/start, and focused review actions.
- DM-031 output-card team-attribution head
  `061078fe0611710e78dcb09b53851134ebdd4aa4` is recorded as absorbed because
  current private-work cards already show customer-safe prepared-by team
  attribution on the evolved Work Ready and focused review surfaces.
- DM-032 internal-work-id route head
  `b0412ed2000435ff3cc8ce1b0a82911a9ee6eddd` is recorded as absorbed because
  DearMe-generated decision links now focus prepared work through `work=` while
  preserving legacy `issue=` parsing for old handoffs.
- DM-033 artifact-link head
  `c55177c1db83779c2742baed6711afb20e9a7132` is recorded as absorbed because
  current focused-work links canonicalize through `artifact=` and keep legacy
  `output=` parsing readable.
- DM-034 work-card action-label head
  `82af6bdd3dc9c4447507a4f5f085d19221b47a41` is recorded as absorbed because
  current prepared-work cards keep compact `Review`/`Open` controls with
  artifact-specific accessible labels and missing-context guidance.
- DM-035, DM-036, DM-041, and DM-042 heads are recorded as absorbed by the
  current customer-safe review-copy and error-boundary surface: review counts
  are customer-owned, panels speak as prepared DearMe work, default decision
  notes read naturally, and inherited provider/adapter/runtime failures stay
  behind DearMe guidance.
- DM-037 loop-copy-cleanup head
  `2bac3955a70d5416be2f8d3d08a54f22ebf1b225` is recorded as absorbed because
  the old Brand OS/work loop phrases are gone from the current customer path,
  and the remaining policy panel now says `Stops repeat work` with repeated
  `path`s instead of stale loops.
- DM-038 team-progress-copy head
  `3630c1353ac014f3c8f713b623b4c2075f3b0f6a` is recorded as absorbed because
  the visible growth-map surface already uses customer-owned team progress
  language while internal workstream contracts remain backstage.
- DM-040 missing-source-context head
  `d555d9c1b60c3c126eb00781068dbff7ab6dfe3f` is recorded as absorbed because
  focused Work Ready review filters blank source evidence and gives a Voice &
  Memory missing-context empty state on the current review route.
- DM-028 source-reference-briefs head
  `dd3f3503b00793e2da8acedcf8bba8d87ee01baf` is absorbed by adapting its
  private reference-link grounding onto the current `dearme-memory-brief.ts`
  activity-log memory path. Assignment briefs now include valid http/https
  source links as private reference lines and suppress non-web links from the
  worker context.
- DM-039 output-scoped-memory-brief head
  `ad7275f9c7362118594205bb761748933ba9e441` is absorbed by routing DearMe
  issue origin fingerprints into the hidden Voice & Memory assignment brief,
  so each private worker starts from memory sources prioritized for the output
  it is drafting.
- DM-022 workstream-proof-feed head
  `86a3078d6b5079b5b228792f78a8257f72478f9f` is recorded as absorbed because
  the current `Live proof feed` already turns team progress into proof through
  DearMe action cards, proof-pack summaries, and inline review routing.
- DM-027 preserve-output-focus head
  `4aa7e0975b162421b69515d2935b77cc507bee44` is recorded as absorbed because
  the current focused review route preserves output identity through
  artifact-aware parsing and output-aware batch, report, live-feed, and
  prepared-work actions.
- DM-029 first-cycle-copy head
  `9b7994ccee1f641a32d95282be4a35e3b8573119` is recorded as absorbed because
  current first-cycle copy already uses `Working rhythm` and
  `First private work`, with tests guarding against stale machinery/operations
  copy.
- DM-030 review-boundary-cards head
  `11145f2d569c95e4035290d8ef2b83f3d5c672c2` is recorded as absorbed because
  current focused decision, batch, Work Ready, and output-detail surfaces
  already expose launch boundaries, review handoff cards, and in-place
  prepared-work review controls.
- DM-026 team-proof-feed-refresh head
  `98fe35fdc00ed61a5dacab198af3276e34e77aa5` is recorded as absorbed because
  the current `Live proof feed` already carries the worker's readable progress
  value through customer-safe action cards, proof-pack summaries, inline review
  controls, and `/dearme` review routing.
- DM-026 unify-workstream-review head
  `8ad8eac6578e9fbf778ac0f081bfcb192d150e37` is recorded as absorbed because
  the current BUILD-STATE, reuse ledger, absorption ledger, and Symphony
  worktree summary already make integration state explicit without replaying a
  stale merge-queue document.
- DM-021 live-events head `71f954430914ac8682d830e27d615002afe29152`
  is recorded as absorbed because the current `LiveUpdatesProvider` already
  refreshes the Workbench, outputs, Brand OS, and paid-beta queries on DearMe
  product events. Voice & Memory is now projected inside the Workbench memory
  surface, so the stale standalone `voice-memory` query path is not replayed.
- DM-021 source-restore head `1b0309ae16d7687371637259a1d3ac08cdcb87da`
  is recorded as absorbed because current Voice & Memory already exposes the
  retired-source restore path through the Workbench memory contract,
  activity-log server route, API client, onboarding UI, and tests.
- DM-023 output-card source-context head
  `0d8c71b9da2e57816696a813b93be3d23ec05adf` is recorded as absorbed because
  current prepared-work cards use the richer `OutputSourceEvidenceList` /
  `sourceEvidence` path with card and focused-work coverage.
- DM-020 seed-brief head `ac6eeecf6ab2634ef4b6667c6da79e7cb86b5eb6`
  is absorbed by adapting its "approved Brand OS should immediately become
  reviewable private work" intent onto the current approval-apply and output
  handoff path. Auto-draft approvals now seed starter-posts,
  opportunity-list, portfolio-update, and weekly-report documents from the
  existing first-cycle preview; disabled auto-draft approvals still only queue
  the work lanes.
- DM-020 work-ready cockpit head `49762397fe4bada59266fb0d60c45e0bc5d02045`
  is recorded as absorbed because current Work Ready ordering and the new
  seed-brief documents carry the durable user-facing value without replaying
  the stale cockpit branch.
- DM-019 `5e7eb23bec5cfbea6db915ce629d30a4f955e1db` is absorbed by adapting
  its source-grounded-draft intent onto the current activity-log Voice & Memory
  path. DearMe now uses one customer-safe memory renderer for routine refresh,
  hidden heartbeat assignment briefs, and output-card `sourceEvidence`, rather
  than replaying the stale worker branch's separate `reviewContext` and
  `dearme-voice-memory-grounding.ts` model.
- DEA-9 / DM-183AS proves the current packet-backed review loop can repeat:
  the existing output continuation route records another-pass intent, the same
  report document bridge accepts fresh private work, and the focused review path
  shows customer-safe `Feedback applied` receipts without adding a second
  review schema or runtime UI.
- This keeps Polsia-style "the work remembers me" momentum visible in the
  product while preserving the Naive/Paperclip substrate and Symphony as a
  development-coordination layer only.

## Latest Polsia vs Naive Read - 2026-05-09

The refreshed comparison is captured in
`docs/dearme/POLSIA-NAIVE-COMPARISON.md`.

Conclusion:

- Polsia wins the customer-visible layer: onboarding compression, immediate
  wow, visible team motion, cycle/report rhythm, and high-leverage decisions.
- Naive/Paperclip wins the execution layer: tenancy, issue ownership,
  heartbeats, approval gates, worker isolation, app/site rails, cost events,
  and budget preflight.
- DearMe should keep a Polsia-style personal brand growth team on top of a
  Naive/Paperclip-style substrate. Do not turn the product into either a
  company factory or an agent admin console.

Working rule:

- For product-demo and aha-loop questions, start from Polsia.
- For execution-state, approval, budget, isolation, and scheduling questions,
  start from Naive/Paperclip.
- Bias toward autonomy for private work: research, planning, sample output,
  drafting, reporting, previews, and memory updates should move without asking.
  Keep explicit gates for the few actions that actually publish, send, deploy,
  spend, or materially represent the user.

## Donor Evidence

| Donor | Local evidence | What to reuse | What not to reuse |
| --- | --- | --- | --- |
| Polsia | `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/08-POLSIA-WEAKNESSES.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/CYCLE_ENGINE.md`; `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/polsia-internal-docs/AGENT_PROMPTS.md` | 90-second wow, live work stream, mood/status choreography, manager loop, cycle/report model, personal-brand fork vocabulary, async execution + cost attribution patterns | Its visual style, raw public personal data feed, company-factory framing, shared social identity, or fragile in-process scheduling as the only reliability mechanism |
| Naive/Paperclip | `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`; `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`; `/Users/peter/naive-research-2026-05-05/FINAL-FINDINGS.md`; `/Users/peter/naive-research-2026-05-05/NAIVE-CATALOG-SUMMARY.md`; `/Users/peter/naive-research-2026-05-05/naive-default-agent-prompts/ceo/AGENTS.md` | Existing Paperclip kernel, setup_payload idea adapted as `brand_blueprint`, CEO/worker split as an internal model, cost/budget rails, template catalog, app/site provisioning options | Exposed Paperclip UI language, raw issue/agent/admin controls, private endpoint names, or a direct Naive UI copy before source quality is proven |
| Lindy frontend | `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/agentUI/ActionCard.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/KnowledgeBase/components/KnowledgeBaseEditor.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/modals/LindyPendingApprovalModal.tsx`; `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx` | Action-card grammar, review modal shape, source/knowledge UI pattern, side-panel detail pattern, polished prompt/composer behavior | Relay/GraphQL shell, Lindy brand copy, generic agent-builder/editor surfaces, full app routing |
| Lindy internal tool | `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/router.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/src/omni_dash/agent/executor.py`; `/Users/peter/lindy-extraction/06_omni_dash_internal_tool/convex/schema.ts` | Rule-based model routing, max-turn budgets, tool execution wrapper, consecutive-failure circuit breaker, learning after recovery, lightweight state schema ideas | Python service transplant, dashboard-specific vocabulary, Ralph naming, or replacing DearMe/Paperclip services |
| Littlebird | `/Users/peter/research/littlebird-2026-04-23/recovered-source/src` | Customer web shell, onboarding/product polish patterns, lightweight account/product flow references | Becoming the primary runtime or overfitting DearMe to a different product category |
| Symphony | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`; `.symphony/WORKFLOW.md`; `/Users/peter/symphony` | Isolated worker loop, bounded tickets, worktree discipline, evidence-based handoff | Product runtime, DearMe user-facing workflow, or a reason to skip coordinator integration |

## Implemented Reuse Map

| DearMe area | Current implementation evidence | Donor reuse status | Next gap |
| --- | --- | --- | --- |
| Product shell | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/components/DearMeSidebar.tsx`; `ui/src/components/Layout.tsx` | DearMe-owned shell already hides inherited Paperclip chrome on the customer path. DM-130 adapts Polsia's "work happened while I was away" choreography, Lindy's two-rail home composition, and Littlebird's focused step/task-row discipline into the first workbench surface. DM-131 browser-polished the focus grid so the live desktop/mobile shell keeps the current work card compact and readable. DM-132 adds a DearMe-specific mobile nav so the phone shell routes users to Home, Decisions, Work Ready, Voice, and More without showing generic workspace destinations. DM-133 makes focused decision actions mobile-safe. DM-134 adds a Brand Team Run Ledger so the first product surface records what the team tried, prepared, learned, and needs from the user. DM-135 renders the first-run generated package with its approval boundary, proving that one positioning answer can produce useful team work without exposing runtime machinery. DM-136 reuses the same first-cycle contract for a private sample package so the shell proves the team output before personal input; the integration update adds a visible `autonomyPlan` so sample and generated proof both say "Autopilot until launch" and wait only at the four launch gates. DM-138A changes the CTA from read-only preview into a private first-cycle start. DM-138B makes the Polsia-style proof sequence first-class in the preview response and renders identity dossier, audience map, and private site proof from that contract. DM-138C hydrates the same proof cards from prepared documents and work products through the DearMe output handoff. DM-138D now writes those output-handoff artifacts during first-cycle start, so the returned proof package can be source-labelled immediately from real private documents. DM-138E browser-smoked the live paid-beta path and kept the surface free of donor/runtime vocabulary. DM-139/DM-140 now share a private cycle output packet that turns prepared outputs into a voice-scored content draft and Dear me report through the same output handoff, projects that packet into the workbench/report read model, and renders the Dear me letter plus workbench card surfaces as one private proof-pack language system. DEA-7 carries that Voice Gate result into focused work, work cards, and proof-pack cards as a customer-safe Voice check, so the user can see why private work is ready without seeing provider/runtime fields. The live Symphony-aligned `DEAAAAAAAAA` browser proof now confirms the packet-backed aha loop across workbench, Dear me letter, and focused review on desktop and mobile without hidden donor/runtime terms. DM-141 adds `?view=opportunities` as a focused opportunity command center that reuses the same workbench, prepared-output, and launch-call approval model for private opportunity drafts. DM-183AK adds a first-screen payoff strip that points to the existing first-cycle input instead of creating another setup flow. DM-183AR makes review-memory receipts visible on the existing Work Ready / focused review path. DEA-9 now browser-smokes the repeatable loop: another-pass feedback, fresh private report work, and focused `Feedback applied` receipts on the same DearMe surface. | Next bounded product gap is to turn the now-proven private proof loop into a tighter launch-ready handoff, not to create a second first-run contract or runtime UI. |
| Brand OS / `brand_blueprint` | `packages/shared/src/validators/dearme.ts`; `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/routes/dearme.ts` | Naive `setup_payload` pattern has been adapted into a typed DearMe contract and approval-gated apply flow. DM-136 adds the shared first-cycle `autonomyPlan` and `DEARME_FIRST_CYCLE_CONCERN_GATES`, making the four launch decisions a code-level contract instead of a copy convention. DM-138A consumes that same preview request/response for first-cycle start and does not add another first-run payload. DM-138B adds `proofSequence` to the same response, so UI and private issue creation share the 0-30s / 60-120s / 3-5min proof order. DM-138C reuses the existing output handoff to populate that sequence from real prepared artifacts and rejects plain progress notes as proof. DM-138D adds `prepareFirstCycleProofOutputs(...)`, creating/updating the known output fingerprints and markdown docs before the start route returns the preview. DM-138E reopens stale proof issues to `in_review` and makes output projection prefer the newest issue per fingerprint, so old cancelled review history cannot suppress the current proof package. DM-183I replays the output-scoped Voice & Memory ordering idea into the current apply path so private draft issues receive context ordered by output type without changing schema or UI. DM-183V replays the DM-029 copy residue so the Brand OS preview talks about rhythm and first private work instead of cycles and operations. | Keep extending this contract only when P0 surfaces need it; next product value should come from autonomous reporting/content generation, not more first-cycle schema. |
| Workbench projection | `server/src/services/dearme-workbench.ts`; `server/src/__tests__/dearme-workbench.test.ts`; `server/src/routes/dearme.ts`; `ui/src/api/dearme.ts`; `ui/src/pages/DearMeOnboarding.tsx` | Naive/Paperclip tables remain the substrate for team, work, decisions, progress, reports, and memory projections. DM-179 exposes that projection as the initial `sync` frame on the DearMe live workbench stream, then forwards typed `dearme-sse-bus` events by company. DM-181 consumes the same stream in the customer workbench by updating the existing React Query cache on `sync` and invalidating it on broader runtime events. DM-182 folds OpenClaw lifecycle / stream passthroughs into that same invalidation path. DM-138A emits first-cycle `task_created`, `thinking_stream`, and `agent_completed` events through the same bus so the onboarding start path lands in the existing live workbench refresh lane. DM-139/DM-140 now detects packet-backed output handoff documents/work products and projects the same private packet through Work Ready, Decisions, report digest, work stream, run ledger, and action graph without adding shared schema fields. The UI consumes that report projection directly and translates internal packet wording into proof pack language across report, ready-work, decisions, live feed, run ledger, action graph, Voice & Memory, focused detail surfaces, and the proof pack continuity ribbon. DEA-7 now also projects the latest worker lifecycle event into a customer-safe `Live team pulse` using the same EventSource listener, so private Symphony/OpenClaw motion feels active without adding another runtime UI. DEA-7 browser proof confirmed that one real generated packet now reaches the existing projection, letter, and focused review route. | Do not add a second runtime; let Symphony worker output keep feeding the existing packet-backed event consumer and customer UI first. |
| Action graph and work stream | `docs/dearme/ACTION-GRAPH-ARCHITECTURE.md`; `packages/shared/src/validators/dearme.ts`; `ui/src/components/dearme/DearMeActionCard.tsx` | Polsia cycle/report choreography plus Lindy action-card grammar are already converging into customer-safe work cards. DM-133 makes focused decision/detail actions mobile-safe without changing the hidden approval/output-review substrate. DM-134 adds a typed `runLedger` read model derived from the existing workbench stream, with latest memory as a fallback, without adding another event table. DM-183AA reuses the existing live-feed `workStream` fields to explain why each visible state matters, giving DM-088-style progress clarity without restoring its stale replacement component. | Use the ledger as the customer-facing progress spine before adding notification or report surfaces. |
| Output review and decisions | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `ui/src/api/dearme.ts`; `server/src/routes/dearme.ts`; `server/src/services/dearme-output-handoff.ts`; `server/src/services/heartbeat.ts`; `server/src/__tests__/dearme-output-handoff.test.ts`; `server/src/__tests__/dearme-output-regeneration-brief.test.ts`; `server/src/__tests__/heartbeat-task-markdown.test.ts`; `tests/e2e/dearme-private-handoff.spec.ts` | Lindy pending-action shape and Polsia "small number of high-leverage calls" are reused in Work Ready / Decisions Needed. DM-128 now lets focused prepared work be approved, revised, regenerated, or redirected inside the DearMe decision surface while Naive/Paperclip remains the hidden output review substrate. DM-139/DM-140 adds `prepareCycleOutputPacket(...)`, which reuses output handoff, documents, work products, and Voice Gate so content drafts and the Dear me report stay coupled to the same private evidence packet. DEA-7 adds `dearMeContentDraftPacketSchema`, `persistContentDraftPacket(...)`, and the company-scoped `content-draft-packets` route/API client, letting Symphony content workers save private review packets into the same handoff table, then renders parsed `voiceGate` results without exposing provider metadata. The rerun-key follow-up makes `packetId` mandatory, so worker retries update the same private review work product instead of stacking duplicates. DM-141 routes `opportunity_drafts` through the same private review lane with a focused opportunity view, so opportunity work changes presentation and filtering, not the approval substrate. DM-183F replays the useful DM-031/DM-032 residue by showing card-level prepared-by team attribution and switching generated DearMe decision links to `work=` while preserving legacy `issue=` deep-link parsing. DM-183J absorbs the DM-035/DM-036/DM-041/DM-042 UI residue by renaming the private review surface, naturalizing default decision notes, and keeping internal failure terms out of customer-visible errors. DM-183K adds a typed feedback-applied trace from existing review comments, documents, and work products, then renders it in the focused prepared-work panel without adding a new review runtime. DM-183N replays the still-useful DM-015 detail-ordering idea so private-work cards and focused review use the existing output `details` contract to surface content channel/audience/hook/body/proof/boundary, opportunity target/relevance/message, portfolio proof/copy, and report decisions before the user opens raw work. DM-183T absorbs residual DM-027 output-focus routing by carrying existing batch, report, and live-feed output ids through the DearMe decision route, and by letting reviewable live-feed work use the in-place prepared-work review controls instead of raw issue navigation. DM-183U canonicalizes generated focused-work links to `artifact=` while preserving legacy `output=` parsing for old review handoffs. DM-183AJ turns an approved private output into one final `dearme_output_next_move` approval and carries the original artifact id through decisions, batches, stream, and graph so the customer still makes the launch call before anything external happens. DM-183AV locks the `choose_new_direction` / `not_useful` path with a cache write-through regression so redirected private work stays fresh while the output refetch is pending. DM-183AZ records both exact DM-006 output-detail review workspace heads as absorbed/adapted into the current `details`, `sourceEvidence`, work-product Voice Gate, focused review controls, review handoff, and feedback trace path instead of reviving the stale `reviewContext` schema. DM-183BA records both exact DM-007 review-feedback heads as absorbed/adapted into the current review-feedback memory rows, output feedback traces, review handoff, and workbench projection instead of reviving the stale review-feedback service. DM-183BB now feeds the latest non-approval review decision and previous private draft context into the hidden heartbeat task markdown as a regeneration brief, while reusing stale-feedback and retry-cap loop semantics so the next autonomous pass starts from live critique without replaying already-applied feedback or exposing a new runtime or customer-facing queue. DEA-9 tightens stale review-state handling so fresh private work after the latest feedback returns the output to customer review and preserves the `Feedback applied` receipt. DEA-11 / DM-183BO proves the full private-launch handoff in browser: prepared output approval creates the launch-call approval, final approval records the private handoff, and the customer opens the brief through DearMe `work=` / `artifact=` routing rather than raw issue navigation. DEA-35 reuses the existing first-cycle preview, output-handoff detail extraction, and shared `opportunities.signals` / `notes` shape to add verification status, contact records, source signals, fit reasons, and first messages to the five-item shortlist without a new dashboard, send path, or migration; the shared schema keeps sample `.example` contacts pending by rejecting verified contact evidence on reserved demo domains. | Watch whether repeated review loops need richer server-owned failure history after real usage; extend the packet before adding new review surfaces. |
| Output review and decisions - shared approval entry points | `packages/shared/src/constants.ts`; `ui/src/lib/dearmeApprovals.ts`; `ui/src/components/ApprovalCard.tsx`; `ui/src/pages/ApprovalDetail.tsx`; `ui/src/pages/Approvals.tsx`; `ui/src/pages/Inbox.tsx` | DM-183O absorbs the still-useful Symphony approval/profile UI residue by registering `dearme_output_next_move` in the shared approval type contract and routing DearMe approval cards, detail pages, approval lists, and inbox rows back to `/dearme?view=decisions&approval=...`, while hiding requester identity, raw approval IDs, linked issues, and full-payload controls for DearMe types. DM-183AJ makes that shared type live from the output-review service instead of leaving it as a UI-only route target. | Add new DearMe approval types to the shared helper before exposing them through generic approval or inbox surfaces. |
| Voice & Memory source review | `server/src/services/dearme-workbench.ts`; `server/src/routes/dearme.ts`; `ui/src/api/dearme.ts`; `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx`; `server/src/services/dearme-memory-context.ts` | Lindy KnowledgeBase/source-management and slide-out detail patterns are now adapted: private sources become review cards, selected sources open a detail surface, reviewed facts save through the existing memory path, and not-useful sources use the existing retire path. DM-183H reuses that same evidence path in focused Work Ready review: blank source evidence is filtered, missing context becomes an explicit Voice & Memory empty state, and the review action remains addressable with stable accessible labels. DM-183W adds a capped retired-source projection and restore action over the same activity-log memory path, so users can bring back a private source without a new memory table or settings surface. DM-183Z absorbs the useful DM-043 label-safety residue by normalizing Voice & Memory routine context before it guides private DearMe work, without adding a new memory service. DM-183AG adapts the old DM-019 confirmation boundary to the current source-review UI, so retiring a private source is deliberate while the backend archive/restore contract stays unchanged. DM-183AH replays the useful DM-085 review-preference idea as a derived Review preferences strip from existing `review_feedback` memory. DM-183AM adapts DM-089 into current local source-quality guardrails so weak private drafts stay out of create/update calls. DM-183AN adapts DM-091 into selected-source team previews on the same form, so private material immediately names the DearMe role and output it improves without adding another source workflow. DM-183AQ adapts the old DM-016 private-source traceability intent onto the current `sourceInputMode`/`sourceLabel` model: valid source-review links render as openable private-source shortcuts without fetching or adding schema. DM-183AY records the exact DM-005 source-management worker and integration heads as absorbed/adapted into the current `/memory-updates` plus activity-log source lifecycle, covering guided create, source links, revision, retire, restore, work previews, and refresh instead of preserving the old `dearme-voice-memory` API. DM-183BA keeps review preferences derived from the current `review_feedback` memory rows instead of restoring a second voice-memory service path. | Watch whether reviewers need richer source history after repeated use; do not add backend shape until the current detail surface proves insufficient. |
| Voice & Memory saved-source work paths | `ui/src/pages/DearMeOnboarding.tsx`; `ui/src/pages/DearMeOnboarding.test.tsx` | DM-183AO adapts the useful DM-092 source-to-work result onto the current saved Voice & Memory cards. Saved private sources now show `Feeds work`, the customer-facing DearMe role that will use the source, and the visible work it improves, while staying derived from current memory kinds. DM-183AQ also renders valid saved source-link rows as `Open private source` shortcuts over the same memory rows instead of reviving the stale `referenceUrl` field. | Keep this as a display projection over existing memory rows until repeated usage proves a need for richer source lineage. |
| Weekly report and rituals | `server/src/services/dearme-brand-blueprint-apply.ts`; `server/src/services/dearme-workbench.ts`; `server/src/services/dearme-output-handoff.ts` | Polsia report/cycle ritual is adapted into DearMe weekly report and daily team work language. DM-139/DM-140 now writes the Dear me report from the same private cycle packet as content drafts, with voice-fit and next-decision provenance carried in documents and work products, makes the report digest point back to the same review packet, and renders the visible report as a one-pass proof pack review. DEA-7 makes the companion content packet independently persistable while keeping report/content review tied to the same proof and launch boundary. | Let real cycle usage decide whether the report needs richer history; keep the first report surface packet-backed. |
| Cost and reliability | `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md`; `ui/src/pages/DearMeOnboarding.tsx`; current workbench/cycle projections; Naive cost-event docs; Lindy router/executor evidence | DM-129 adapts Polsia task/subscription attribution, Naive pre-invocation budget rails, and Lindy routing/circuit-breaker behavior into a DearMe policy plus a customer-safe workbench panel. | Add backend policy facts only when future autonomous jobs need state that cannot be derived from the current workbench and paid-beta status. |
| Generated portfolio/site | Existing brand blueprint and optional generated asset layer docs | Naive app/site provisioning remains optional P1/P2, not P0. Polsia personal-brand fork recommends Brand Site Builder, but DearMe first needs review-quality content and proof. | Start only after content/voice/opportunity loop is credible. |
| Development factory | `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`; `.symphony/WORKFLOW.md`; `scripts/dearme-worktree-status.mjs`; `/Users/peter/symphony`; `/private/tmp/dearme-symphony-workspaces` | Symphony-style worker queue is now the cooperation spine for bounded tickets. DM-183 turns the local worktree inventory into a ticket-aware coordinator report with purpose labels and next-action buckets. DM-183B adds `patch_equivalent` so cherry-pick-equivalent worker heads can be closed only after owner confirmation instead of replayed as fresh product slices; the current live audit found 0 such branches, so `not_in_current` still means content review is required. DM-183C folds real Symphony workspace repos into the same report, detects DEA tickets, and separates active or absorbed `symphony` lanes from stale worker branches. DM-183E adds `subject_matched` for stale worker tips whose commit subject already appears in current head: these remain `not_in_current`, but workers should inspect only residual diff before replay or closure. DM-183AP adds `reviewed_absorbed` from `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` for exact branch/head worker tips that the coordinator already compared and found absorbed; these are not replay candidates, but still require owner confirmation before closing. DM-183AT extends that ledger to the exact DM-014 through DM-019 heads after matching their useful mobile shell, output-detail, source-traceability, source-archive, and confirmation lessons to current DearMe surfaces. The follow-up DM-020 pass records the exact seed-brief and work-ready cockpit heads after adapting approved-Brand-OS seed docs into the current output handoff and confirming current Work Ready ordering covers the cockpit value. DM-183AV adds the exact DM-024 and DM-025 output-review heads after matching their status-refresh and cache-write-through lessons to the current review surface. DM-183AW adds the exact DM-022 source-refresh head after adapting its stale-context lesson onto current Voice & Memory source mutations. DM-183AY adds both exact DM-005 source-management heads after matching their initial private-source idea to the current activity-log source lifecycle. DM-183AZ adds both exact DM-006 output-detail review workspace heads after matching the old decision-desk concept to the current prepared-work review evidence and launch-boundary controls. DM-183BA adds both exact DM-007 review-feedback heads after matching the old review-feedback service concept to the current review-memory loop. `AGENTS.md` now points DearMe product workers to `.symphony/WORKFLOW.md` before the architecture docs so the active queue, Linear scope, and workspace discipline stay first-class. The real daemon now routes by Linear team `DEA` plus `assignee: me`, because DearMe has no Linear Project. The `DEA-7` Symphony workspace now reports `in_current` with the action `absorbed Symphony lane; keep as audit trail or close after owner confirmation`; future coordinator integration should keep consuming issue-scoped Symphony lanes rather than spawning parallel content runtimes. The latest coordinator pass absorbed the opportunity workbench and generated-skill wrapper hardening as small product-facing increments, which is the preferred Symphony loop shape. DM-183AQ follows that shape by taking one useful stale worker intent, rejecting its obsolete schema, and landing only the current-product traceability slice. DEA-9 now has current-branch browser smoke evidence for the repeatable packet review-memory loop. DEA-11 exposed the right micro-adjustment: worker lanes must start on the live coordinator head and final proof must follow the complete approval sequence before marking Linear Done. The coordinator absorbed the private handoff proof on current head instead of trusting the stale workspace diff. DM-183BV closes the remaining local residual queue by exact-head reviewed absorption and makes the shared/server work-event contract the handoff surface between Symphony workers and DearMe product UI. DM-183BW hardens the live Symphony `after_create` hook so new worker workspaces reuse Peter's user-local `pnpm` or `corepack pnpm` instead of attempting a global `corepack enable` symlink; the first affected lane, `DEA-12`, recovered from retrying to running without creating another worktree queue. | Workers must use Linear issue scope, `AGENTS.md`, this ledger, `BUILD-STATE.md`, `.symphony/WORKFLOW.md`, and `pnpm dearme:worktrees -- --summary-only --skip-dirty` before selecting old tickets. Do not replay DM-005, DM-006, DM-007, DM-014 through DM-020, DM-022, DM-024, DM-025, DM-084, DM-086, DM-095, DM-097, DM-098, or DM-101 from the exact ledger heads unless the evidence is wrong or the branch advanced. Start future work from Symphony/Linear on the live coordinator head instead of stale local branches. |

Coordinator note: DM-183BJ adds the exact DM-021 live-events and source-restore
heads plus the exact DM-023 source-context head to the reviewed absorption
ledger. Treat those heads as no-replay candidates unless they advance; the code
change in this pass is the review-freshness fix that stops stale
`changes_requested` work products from hiding newer private work.

Coordinator note: DM-183BM absorbs the exact DM-028 and DM-039 worker heads
into the current hidden assignment brief path. Keep future Voice & Memory
worker-grounding changes in `dearme-memory-brief.ts` plus Heartbeat origin
fingerprint routing rather than restoring the older `dearme-voice-memory`
source model.

Coordinator note: DM-183BL adds the exact DM-022, DM-027, DM-029, and DM-030
worker heads to the reviewed absorption ledger. Keep future proof-feed,
focused-route, first-cycle-copy, and launch-boundary improvements on the
current Live proof feed, artifact-aware focused route, Working rhythm / First
private work copy, and in-place prepared-work review controls rather than
restoring the older workstream, `output=`-only, or compact boundary-card
branches.

Coordinator note: DM-183BK adds both exact DM-026 worker heads to the reviewed
absorption ledger. Keep future proof-feed improvements on the current Live
proof feed/action-card surface rather than restoring the older workstream
sections or merge-queue doc.

Coordinator note: DM-183O extends the Output review and decisions boundary into
shared UI entry points, so DearMe approval cards, detail pages, approval lists,
and inbox rows return to the DearMe decisions surface instead of exposing raw
approval/issue chrome.

Coordinator note: DEA-8 verified the live first-cycle proof handoff without a
code change. Do not reopen this as another first-run schema or runtime task:
`prepareFirstCycleProofOutputs(...)`, `prepareCycleOutputPacket(...)`, output
handoff, and workbench projection already carry the paid-beta proof pack.

Coordinator note: DEA-10 / DM-183AS-A is now absorbed as the narrow review
receipt API/cache proof under the broader DEA-9 repeatable packet smoke. The
useful reuse is the existing output continuation response, shared output schema,
React Query output cache, and focused prepared-work review UI; do not create a
second review receipt route, schema, or runtime surface for this loop.

Coordinator note: DEA-9 / DM-183AS is now backed by an external-Postgres
Playwright smoke that repeats the packet-backed review-memory loop on the
current Work Ready / focused review path. Keep the next Symphony lane on
review/integration or launch-handoff hardening; do not add broader agents just
to rediscover this path.

Coordinator note: DEA-11 / DM-183CA is the next active launch-handoff lane.
It should harden the existing final approval, `dearme_output_next_move`, output
handoff, Workbench projection, and private launch brief path into a
customer-ready next step. DM-095 remains a useful Work Ready summary-actions
candidate, but should stay deferred until DEA-9 leaves review because it can
touch the same focused review surface.

Coordinator note: DEA-36 tightened the first-cycle proof pack into one
customer-ready next step by reusing the existing output handoff, Workbench
projection, and onboarding proof-pack surface. Keep later launch-handoff work
on this same path; do not split it into a second first-run contract, queue, or
runtime dashboard.

Coordinator note: DM-011 is now absorbed into the current final-approval path.
Approving a DearMe next move records a customer-safe launch receipt, prepares a
launch-ready brief, hides the stale prepared-work decision, and leaves a
Workbench trace that says the final approval was captured without claiming that
anything was published, sent, deployed, or spent.

Coordinator note: DM-012 is now absorbed as the visible private-handoff surface
after final approval. The Workbench reads the existing
`execution_handoff_prepared` progress item and shows a compact customer-safe
panel with the artifact, next step, and private brief link; keep this on the
current workbench/read-model path instead of adding a separate execution queue.

Coordinator note: DM-013 is now absorbed as the typed handoff-readiness UI
contract. The current shared schema/export and Workbench panel cover
`private_handoff_ready`, next-step copy, and DearMe-owned brief routing, so do
not replay the old branch as a new route, runtime surface, or customer-facing
execution queue.

Coordinator note: DM-183M extends the Output review and decisions boundary into
server responses and approval preflight, so DearMe auth, validation, and stale
Brand OS approval failures stay product-safe before state changes.

Coordinator note: DM-183AB absorbs the DM-046/DM-047 worker residue as
regression coverage only. The current production page already routes Voice &
Memory, Brand OS, decision, and focused-work mutation failures through the
DearMe customer-safe error helper, so the useful replay is locking those paths
without adding another error layer.

Coordinator note: DM-183AC removes X-first defaults from bootstrap/profile and
Content Producer prompt rails. Keep `post_x`, tweet-shaped payload fields, and
OAuth platform naming unchanged until a dedicated outbound-contract migration
exists.

Coordinator note: DM-183AD closes the current workbench projection gap found
while absorbing DM-044/DM-045. The current service already owns Voice & Memory
projection, but review feedback traces now need to stay on the same
customer-safe path as output titles, summaries, evidence, and review handoffs.

Coordinator note: DM-183AE removes customer-facing CEO, board-update, and
owner-email wording from the Chief of Staff and Reporting prompts while keeping
proxy tool names and `ceo_*` report type identifiers stable. Treat those
identifiers as internal compatibility surfaces until a dedicated contract
migration exists.

Coordinator note: DM-183AF absorbed the useful DM-020/DM-022 worker residue as
frontstage ordering and language. The follow-up DM-020 seed-brief absorption
now also adapts the exact first-week seed-brief branch into the current Brand
OS approval-apply path and output handoff. Keep the current workbench stream
and review runtime intact; do not replay the stale work-ready cockpit or older
service/schema branches.

Coordinator note: DM-183AG adapts the useful DM-019 retire-confirmation lesson
to the current Voice & Memory source projection. Retire remains a soft,
restoreable private-history action; keep it separate from any future hard-delete
or data-export boundary.

Coordinator note: DM-183AH absorbs the useful DM-085 review-preference residue
by deriving a small Review preferences strip from current `review_feedback`
Voice & Memory rows. Keep this derived from existing memory until repeated
review usage proves the need for editable preference storage.

Coordinator note: DM-183AI absorbs the safe remainder of DM-014 as a current
output-preview fallback. The DearMe mobile shell exception was already absorbed
by `DearMeMobileNav`; keep this slice limited to stale prepared-work readability
unless mobile screenshots prove a new obstruction.

Coordinator note: DM-183AJ makes `dearme_output_next_move` executable from the
current output-review path. Keep the final launch/send/deploy/spend call in the
existing approval substrate and carry `outputId` through projections instead of
adding another launch queue, worker runtime, or customer-facing Symphony surface.

Coordinator note: DM-183BC records both exact DM-010 worker/integration heads
as absorbed by the current final-move approval gate. Future work should extend
`dearme_output_next_move` semantics in place instead of replaying the historical
approval-ready handoff branches.

Coordinator note: DM-183AK pulls the first payoff above the workbench without
moving the underlying first-cycle contract. Keep future first-screen work
focused on showing immediate payoff and routing to existing private-work inputs
before adding new onboarding forms.

Coordinator note: DM-183AM absorbs the useful part of DM-089 into the current
Voice & Memory source guide form. Keep source-quality guardrails at the product
boundary while the backend contract remains compatible with existing memory
updates.

Coordinator note: DM-183AN absorbs the useful part of DM-091 into the current
Source guide form. Keep source previews role/outcome based and do not fork a
second source workflow, worker, or knowledge-base runtime.

Coordinator note: DM-183AO absorbs the useful part of DM-092 into current saved
Voice & Memory source cards. Keep source-to-work hints derived from memory
kinds and customer-facing roles; do not add a second Work Ready source runtime
or expose Symphony as product UI.

Coordinator note: DM-183AP makes reviewed worker absorption explicit in
`docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`. Future Symphony workers should
not replay DM-096, DM-098, DM-099, DM-100, or DM-101 from those exact heads
unless the ledger evidence is wrong or the branch head has advanced.

Coordinator note: DM-183AT extends the reviewed-absorption ledger to DM-014,
DM-015, DM-016, DM-017, DM-018, and DM-019. Treat those exact old heads as
already absorbed by current DearMe surfaces; review again only if a branch head
advances or if the cited product evidence proves wrong.

Coordinator note: DM-183BG adds the matching DM-014 through DM-018 integration
branch heads to the same reviewed-absorption ledger. Those branches are
historical integration baselines for work already present in the current
mobile shell, output detail, source traceability, Brand OS apply gate, and
source archive surfaces; do not replay them as fresh product patches.

Coordinator note: DM-183AV extends the reviewed-absorption ledger to DM-024 and
DM-025. Treat those exact output-review/cache worker heads as absorbed by the
current output status service and DearMe review cache write-through; keep the
first-class Voice & Memory source-management donor lane separate.

Coordinator note: DM-183AW absorbs the useful DM-022 source-refresh lesson into
the current Voice & Memory mutation path. Source create, revise, retire, and
restore now refresh source-grounded Workbench, output-review, and activity
queries together; do not replay the stale panel-level source-refresh patch.

Coordinator note: DM-183AX applies the Symphony-side design review as a UI-only
Voice & Memory pass. Keep source state visible with active, role-backed labels
before adding richer source history or another source-management surface.

Coordinator note: DM-183AY records both exact DM-005 source-management heads as
absorbed by the current activity-log Voice & Memory lifecycle. Do not replay
the stale `dearme-voice-memory` service endpoint unless the current memory
update/workbench path proves insufficient in real use.

Coordinator note: DM-183AZ records both exact DM-006 output-detail review heads
as absorbed by the current packet-backed prepared-work review surface. Do not
reintroduce the stale `reviewContext` schema unless repeated real review usage
proves `details`, `sourceEvidence`, work-product Voice Gate, review handoff,
and feedback trace are not enough.

Coordinator note: DM-183BA records both exact DM-007 review-feedback heads as
absorbed by the current output-review memory loop. Do not restore the stale
`dearme-review-feedback` / `dearme-voice-memory` service path unless the
current `review_feedback` memory rows, feedback trace, review handoff, and
Review preferences projection prove insufficient in real review loops.

Coordinator note: DM-183BV ports the reusable DM-087/DM-097 work-event shape
onto the current shared/server workStream projection. Keep using this event
metadata as the Symphony-to-product handoff contract; do not add a customer
queue, runtime dashboard, or parallel event table for the same job.

Coordinator note: DEA-19 is now the single active Symphony product lane after
the DEA-18 browser-proof absorption was recorded in Linear and landed in the
coordinator checkout. The lane should reuse the existing Opportunity Hunter
registry prompt, opportunity state machine, opportunities schema, and current
output/workbench projection patterns to produce 5 private targets with fit
reasons, outreach angles, and draft first messages. Do not use it to touch the
Playwright/browser proof, redesign onboarding, add another first-run contract,
or expose hidden substrate terms.

## Recently Completed

### DM-183BV: Work Event Contract Port

Donor/worktree:

- DM-087 `codex/dearme-dm-087-work-event-contract` at
  `aea19d9057dca08ed91e4d6f0ee7716306e39252`
- DM-097 `codex/dearme-dm-097-event-stream-interrupt-foundation` at
  `71c2e1c0022363ad171fdb38e7d4ce17cdc9f069`

Decision:

- Port the reusable work-event idea onto the current DearMe workbench stream
  instead of cherry-picking stale worker branches.
- Keep `cycleStage`, `sourceLabel`, `costImpact`, `reviewLoop`, the run ledger,
  and the final `dearme_output_next_move` launch approval gate authoritative.
- Keep Symphony as the development/cooperation spine only. The product surface
  speaks in DearMe team work, decisions, private handoff, and launch-call terms.

Implementation:

- `packages/shared/src/validators/dearme.ts` adds the event vocabulary and
  stream fields `action`, `customerSummary`, `artifactTarget`, `decisionNeed`,
  and `traceRefs`.
- `server/src/services/dearme-workbench.ts` derives those fields from current
  work, decision, and progress items without adding a new event table, queue,
  dashboard, or customer-visible runtime.
- `ui/src/pages/DearMeOnboarding.test.tsx` keeps the private handoff proof
  customer-safe with hidden-term coverage on the handoff panel.

Coordination rule:

- Future Codex agents should enter through a fresh Linear `DEA` issue and a
  Symphony workspace on the current coordinator head. Do not reopen exact
  absorbed worktree heads unless the ledger evidence is proven wrong.

### DM-183BA: Review Outcome Memory Baseline Absorption

Goal: keep Symphony and future workers from replaying the obsolete DM-007
review-feedback baseline now that current output review already carries user
decisions into memory, review traces, and the Voice & Memory preference strip.

Donor grounding:

- Symphony: exact branch/head absorption keeps stale worker and integration
  branches out of fresh issue execution.
- Lindy: review feedback should be visible as a learned preference and applied
  trace, not as a separate backend memory surface.
- Polsia/Naive: reuse the existing output handoff, activity log, and review
  decision path before adding another review-feedback service.

Implementation:

- Reviewed DM-007 worker head
  `d1bf8431b0027747a9a384a307848324dc99741f` and integration head
  `3d419f55b6664f41ebb36452eb88fc6027f5d51a`.
- Added both exact heads to
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Kept review learning on current `review_feedback` memory rows, output
  feedback traces, review handoffs, workbench projection, and Review
  preferences UI instead of restoring the old `dearme-review-feedback.ts` and
  `dearme-voice-memory.ts` path.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `git show --stat --oneline --no-renames d1bf8431b0027747a9a384a307848324dc99741f`
  and `git show --stat --oneline --no-renames 3d419f55b6664f41ebb36452eb88fc6027f5d51a`
  confirmed the old review-feedback memory scope.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current path carries `review_feedback` memory, feedback traces, review
  handoff, workbench projection, and Review preferences.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --ticket=DM-007 --skip-dirty --limit=20`
  initially showed the worker and integration heads as `not_in_current`, which
  is why this absorption entry was needed.
- `pnpm run dearme:worktrees -- --ticket=DM-007 --skip-dirty --limit=20`
  passed after the ledger update and showed both DM-007 worktrees as
  `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed with
  `reviewed_absorbed: 20`, `not_in_current: 93`, and `dirty: 0`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/BUILD-STATE.md`
  passed.

### DM-183AZ: Output Review Workspace Baseline Absorption

Goal: keep Symphony and future workers from replaying the obsolete DM-006
decision-desk baseline now that current prepared-work review owns richer source,
voice, handoff, and launch-boundary evidence.

Donor grounding:

- Symphony: exact branch/head absorption keeps stale worktrees out of fresh
  issue execution.
- Lindy: review work should give the user one high-leverage decision surface,
  not a separate workspace model.
- Polsia/Naive: reuse the existing packet, handoff, and approval boundary before
  adding another review context schema.

Implementation:

- Reviewed DM-006 worker head
  `cc35837647b0213dfebc84a65a0e51148f48c3ec` and integration head
  `44b7bfd69f93465d206561506259ac62eed80784`.
- Added both exact heads to
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Kept current output review on `details`, `sourceEvidence`, work-product
  Voice Gate, focused prepared-work controls, review handoff, and feedback
  trace instead of restoring the old `reviewContext` API shape.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `git show --stat --oneline --no-renames cc35837647b0213dfebc84a65a0e51148f48c3ec`
  and `git show --stat --oneline --no-renames 44b7bfd69f93465d206561506259ac62eed80784`
  confirmed the old output-detail review workspace scope.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current path carries output details, source evidence, Voice Gate, review
  handoff, focused review controls, and feedback traces.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --ticket=DM-006 --skip-dirty --limit=20`
  passed and showed both DM-006 worktrees as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed with
  `reviewed_absorbed: 18`, `not_in_current: 95`, and `dirty: 0`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/BUILD-STATE.md`
  passed.

### DM-183AY: Source Management Baseline Absorption

Goal: keep Symphony and future workers from replaying the obsolete DM-005 source
management baseline now that current Voice & Memory owns a richer source
lifecycle.

Donor grounding:

- Symphony: exact branch/head absorption keeps stale worktrees out of fresh
  issue execution.
- Lindy: private sources should remain live working context, not a hidden
  backend object list.
- Naive/Paperclip: reuse the existing activity log, workbench, and memory
  context refresh path before adding another source store.

Implementation:

- Reviewed DM-005 worker head
  `acaa7842c05ffb4339f4f4739d1c6455204ce447` and integration head
  `77e7d403913ef4381c41e8aefcdd9bd16592f6d2`.
- Added both exact heads to
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Kept current Voice & Memory source management on `memory-updates`,
  workbench projection, and existing UI source guide behavior instead of
  restoring `server/src/services/dearme-voice-memory.ts`.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `git show --stat --oneline --no-renames acaa7842` and
  `git show --stat --oneline --no-renames 77e7d403` confirmed the old source
  management scope.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current path covers create, revise, retire, restore, source links, and
  refresh behavior.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed with
  `reviewed_absorbed: 16`, `not_in_current: 97`, and `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=40`
  passed and listed both DM-005 heads.
- `pnpm run dearme:worktrees -- --ticket=DM-005 --skip-dirty --limit=20`
  passed and showed both DM-005 worktrees as `reviewed_absorbed`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AX: Voice & Memory Active Source State Labels

Goal: make private sources feel like active team context instead of saved
archive rows.

Donor grounding:

- Lindy: source cards should show operational state at a glance.
- Polsia: visible momentum matters; the user should see which source is already
  shaping the next private pass.
- Symphony: use sidecar review output as a bounded UI patch, not a new runtime.

Implementation:

- Replaced the generic saved-source callout label with "Already in use" or the
  specific DearMe role that will use the just-saved source next.
- Added "Selected for next pass" to the selected source-review card.
- Kept the patch inside `VoiceMemoryPanel` and existing tests.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AW: Source Change Review Refresh Absorption

Goal: make private source changes immediately affect the source-grounded
review surfaces that the user sees next, while keeping Symphony worker reuse
exact-head scoped.

Donor grounding:

- Symphony: record the exact stale worker head so future workers choose fresh
  DEA issue work before replaying old branches.
- Lindy: treat source management as live working context, not an archival list.
- Naive/Paperclip: keep source-grounded review data server-derived and refreshed
  through existing React Query surfaces.

Implementation:

- Added DM-022 to `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with the exact
  `/private/tmp/dearme-dm-022-source-change-refresh` head.
- Added a shared Voice & Memory dependent-surface refresh path for source
  create, revise, retire, and restore.
- Locked the guided source-save flow so Workbench and private outputs refetch
  after a Voice & Memory source changes.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed and showed an active DEA
  worker running.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and reports
  `reviewed_absorbed: 14`, with `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=25`
  passed and listed DM-022 with the other reviewed entries.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AV: Output Direction Cache Absorption

Goal: keep Symphony workers from replaying stale output-review branches when
the current DearMe review surface already owns the status refresh and cache
write-through behavior.

Donor grounding:

- Symphony: record exact old branch heads as reviewed absorption so workers
  choose current DEA issue work before stale replay.
- Lindy: preserve the pending-review interaction shape while keeping the
  decision local and immediate.
- Naive/Paperclip: keep output review on the existing hidden issue/work-product
  substrate.

Implementation:

- Added DM-024 and DM-025 to
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with exact branch/head records.
- Locked `choose_new_direction` / `not_useful` on focused private output so the
  returned output updates the React Query cache while the output refetch is
  still pending.
- Left first-class `/voice-memory` source management as a separate Symphony
  donor candidate instead of mixing it into review-cache absorption.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and reports
  `reviewed_absorbed: 13`, with `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=25`
  passed and listed DM-024 and DM-025 with the other reviewed entries.
- `git diff --check -- ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AT: Early Voice/Review Worktree Absorption

Goal: keep Symphony workers focused on the current DEA-9 repeatable proof loop
instead of rediscovering older Voice, Memory, output, and mobile-shell worker
branches that the product already absorbed through newer surfaces.

Donor grounding:

- Symphony: keep one cooperation spine with explicit branch/head absorption
  records.
- Polsia: preserve product momentum by moving stale replay noise out of the
  visible-value lane.
- Naive/Paperclip: keep closure owner-confirmed and exact-head scoped.

Implementation:

- Added DM-014 through DM-019 to
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with exact heads and current
  evidence files.
- Recorded that the current DearMe mobile shell, output detail ordering,
  private-source links, source revise flow, archive/restore flow, and retire
  confirmation already cover those old worker intents.
- Left the active product lane on DEA-9 / DM-183AS rather than creating another
  runtime, queue, or review surface.

Verification:

- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and reports
  `reviewed_absorbed: 11`, with `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=20`
  passed and listed DM-014 through DM-019 plus the prior reviewed entries.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AP: Reviewed Worktree Absorption Ledger

Goal: reduce Symphony coordination noise by separating old worker tips that
still need product review from old tips the coordinator already compared and
found absorbed into the current DearMe surface.

Donor grounding:

- Symphony: keep the worktree inventory as the shared cooperation spine.
- Naive/Paperclip: preserve explicit owner-confirmation boundaries before
  closing worker lanes.
- Polsia: keep product momentum focused on new visible value, not stale replay.

Implementation:

- Added `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with exact branch/head
  evidence for five reviewed stale worker branches.
- Added `reviewed_absorbed` classification to `scripts/dearme-worktree-status.mjs`.
- Added node test coverage for reviewed absorption, status parsing, summary
  counts, and exact branch/head matching.

Verification:

- `pnpm run test:dearme-worktrees` passed: 13 node tests.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and reports
  `reviewed_absorbed: 5`, with `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=20`
  passed and listed DM-096, DM-098, DM-099, DM-100, and DM-101 as reviewed.
- `git diff --check -- scripts/dearme-worktree-status.mjs scripts/dearme-worktree-status.test.mjs docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AO: Saved Source Work Paths

Goal: make already-saved private sources continue to feel like delegated work by
showing which DearMe role will use the source and what visible work improves.

Donor grounding:

- Polsia: keep source value connected to work momentum after the initial setup.
- Lindy: reuse lightweight source-card explanation instead of raw knowledge-base
  management.
- Symphony: absorb the old DM-092 worker result as a narrow candidate slice on
  the current coordination branch.

Implementation:

- Added memory-kind-to-work-path copy for every current Voice & Memory kind.
- Rendered a `Feeds work` callout on saved source cards using the existing
  `DearMeActionCard` callout primitive.
- Added onboarding regression coverage for voice sample, proof point, and
  review-feedback source paths.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 62 tests.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AN: Voice & Memory Team Preview

Goal: make each private source feel like immediate team momentum by showing
which DearMe role will use it and what customer-facing output improves.

Donor grounding:

- Polsia: reuse visible team choreography so input feels like delegated work,
  not setup taxonomy.
- Lindy: reuse source-to-workbench feedback discipline while keeping source
  intake simple.
- Symphony DM-091: reuse the team-preview intent, but adapt it to the current
  source guide/source path/source review spine.

Completed:

- Added a selected-source `Team preview` for all seven current source guides:
  writing sample, proof point, source link, correction, forbidden phrase,
  audience note, and offer note.
- Kept the existing Voice & Memory mutation, source plan, and source review
  queue untouched.
- Locked default writing-sample, forbidden-phrase, and source-link previews in
  the onboarding regression suite.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 62 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx
  ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md
  docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed writing-sample, source-link, and forbidden-phrase previews switch
  in the real UI with no horizontal overflow, no same-origin request failures,
  no console/page errors, and no hidden substrate terms.

### DM-183AM: Voice & Memory Source Guardrails

Goal: keep weak private source drafts out of the mutation path without adding a
new source table, runtime, or internal control surface.

Donor grounding:

- Lindy: reuse guided source intake discipline so private memory has enough
  context before it becomes reusable team material.
- Naive/Paperclip: keep the existing activity-log Voice & Memory mutation path
  and source labels; validate at the DearMe product boundary.
- Symphony DM-089: reuse the local validation intent, but adapt it to the
  current source guide/source path UI instead of replaying the old form.

Completed:

- Added local limits for source title, source reference, memory body minimum,
  and memory body maximum before create/update runs.
- Added customer-safe guidance that private memory needs at least 20 characters
  and stays private copy, not public output.
- Locked short-source, oversized-title, oversized-body, and
  oversized-reference regressions in the onboarding suite.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 62 tests.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed the short-source guard stays local with no mutation request, no
  horizontal overflow, and no console/page errors.

### DM-183AL: First Payoff CTA Rail

Goal: make the first-screen aha path feel like one clear action rail instead
of another explanatory panel.

Donor grounding:

- Polsia: keep the immediate input-to-private-proof loop as the first customer
  promise.
- Lindy: reuse compact review-card rhythm so the user sees the next decision
  before reading the rest of the workbench.
- Naive/Paperclip: keep the existing first-cycle, paid-beta, and approval
  machinery hidden under the customer-facing shell.

Completed:

- Rebuilt the `First payoff` surface from DearMe shell primitives rather than a
  bespoke card grid.
- Preserved the same one-sentence CTA, trial preview CTA, and focus behavior on
  the existing first-cycle input.
- Locked the surface primitive, three payoff cards, and one-answer/no-public
  action promise in the focused onboarding regression test.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed desktop and mobile render the rail as a focus surface with three
  payoff cards, no horizontal overflow, no console/page errors, and no
  same-origin request failures.

### DM-183AK: First Payoff Strip

Goal: make the first visible screen explain the payoff before the user has to
understand the whole DearMe team board.

Donor grounding:

- Polsia: reuse the immediate aha loop, where one small input quickly becomes
  visible private work.
- Lindy: reuse compact action-card clarity and a single obvious review path.
- Naive/Paperclip: keep the existing first-cycle preview/start, paid-beta, and
  approval substrates hidden under the product surface.

Completed:

- Added a `First payoff` strip after the hero that summarizes the path from one
  known-for sentence to a private proof pack and final launch call.
- The strip CTA focuses the current 90-second first-cycle input instead of
  introducing another form, route, or API.
- Regression coverage now locks the strip copy, ordering before the team board,
  focus behavior, and trial-state CTA language.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

### DM-183AJ: Final Move Approval Gate

Goal: after private work is approved as useful, keep the external move waiting
for one explicit final approval.

Donor grounding:

- DM-010: reuse the durable lesson that output approval and launch approval are
  two different customer decisions.
- Polsia: keep the number of visible calls small and high-leverage.
- Naive/Paperclip: reuse `approvals`, `issueApprovals`, issues, documents, and
  work products instead of creating a parallel DearMe launch queue.

Completed:

- `reviewOutput(... approve ...)` now creates a single pending
  `dearme_output_next_move` approval for content, opportunity, portfolio, and
  report outputs.
- Workbench decisions now carry `outputId`, project final approvals into the
  same batch/work-stream/action-graph surfaces, and hide duplicate raw output
  review decisions while the final approval is pending.
- DearMe focused decision routing can match approval decisions by artifact id.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

### DM-183AI: Stale Prepared Work Preview

Goal: keep prepared private work readable when an older or still-syncing payload
has not attached document, update, or work-product previews yet.

Donor grounding:

- DM-014: reuse the product lesson that stale prepared-output payloads should
  remain reviewable instead of blanking or implying no work exists.
- Polsia: keep the review surface simple and autonomous; show the best available
  private-work signal without exposing runtime state.
- Naive/Paperclip/OpenClaw: keep the current output contract and avoid adding a
  second compatibility schema for old `reviewContext` payloads.

Completed:

- Updated `outputPreview(...)` to use document previews, latest updates, work
  product summaries, then the output summary as a final customer-readable
  fallback.
- Added a focused UI regression proving Private Work stays readable and does not
  show the misleading first-draft waiting copy while private artifacts sync.
- Left the current DearMe-specific mobile navigation untouched because the
  active layout already routes `/dearme` through `DearMeMobileNav`.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AH: Review Feedback Preferences

Goal: make owner review notes feel like persistent drafting preferences without
adding another memory backend.

Donor grounding:

- DM-085: reuse the product lesson that review feedback should guide the next
  draft, not its stale `reviewLearning` schema.
- Lindy: make learned preferences scannable and compact near source management.
- Naive/Paperclip/OpenClaw: keep the current activity-log Voice & Memory rows as
  the source of truth.

Completed:

- Added a Review preferences section to Voice & Memory when active
  `review_feedback` rows exist.
- Kept preference rendering derived from `visibleLatestMemory`, so archive and
  restore behavior continue to control whether feedback is active.
- Updated the workbench UI regression fixture to prove review notes render as
  next-draft guidance without leaking hidden substrate terms.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AG: Retire Source Confirmation

Goal: make retiring a private Voice & Memory source feel like a deliberate
DearMe trust-boundary action while preserving the current archive/restore
contract.

Donor grounding:

- DM-019: reuse the product-owned confirmation boundary, not its stale component
  wiring.
- Lindy: keep source management compact and reviewable.
- Naive/Paperclip/OpenClaw: keep the existing memory archive mutation and
  private-history projection backstage.

Completed:

- Added a DearMe-owned confirmation dialog before a saved source can be retired.
- Kept the existing source card, archive mutation, retired-source list, and
  restore path unchanged after confirmation.
- Updated UI regressions so the archive mutation is not called until the
  confirmation action runs, including the customer-safe error path.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AF: Live Proof Feed and Prepared Work Ordering

Goal: make the current DearMe workbench feel more like proof is arriving from
an autonomous team, while avoiding a stale DM-020/DM-022 service/schema replay.

Donor grounding:

- Polsia: preserve the live proof-feed / work-happened-while-away choreography.
- Lindy: keep reviewable action cards and inline decisions as the scan pattern.
- Naive/Paperclip/OpenClaw: keep the existing workbench stream, outputs, review,
  and Voice & Memory contracts backstage.
- Symphony: use worker branches as candidate evidence, not wholesale merges.

Completed:

- Renamed the current live team feed to a live proof feed and grounded its helper
  copy in prepared, updated, or held work that waits for the user's call.
- Kept Private Work ahead of the 90-second first-cycle form after the main team
  board so reviewable work stays ahead of setup.
- Added UI regression coverage for the new proof-feed label and prepared-work
  ordering.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

### DM-183AE: User-Facing Leadership Prompts

Goal: make DearMe's leadership/reporting workers sound like a private Chief
and Dear-me letter loop instead of a CEO/board-update product, without changing
the runtime contract they rely on.

Donor grounding:

- Symphony: sidecar prompt audit identified the lowest-risk copy layer and the
  generated skill mirrors that had to be regenerated.
- Polsia: preserve the daily monitor/review/queue/report rhythm and simple
  progress-letter ritual.
- Naive/Paperclip/OpenClaw: keep tool names, report type identifiers, and the
  generated skill pipeline stable while the product language improves.

Completed:

- Reframed Chief of Staff as DearMe's private Chief writing the Dear-me letter,
  while keeping queue-management, reporting order, and `ceo_daily_summary`
  compatibility intact.
- Reframed Reporting as a DearMe letter sender rather than CEO board update,
  while keeping the three required tool calls and `ceo_cycle_summary` intact.
- Regenerated the OpenClaw skill wrappers from source and added prompt
  regression assertions for the new product language plus the preserved report
  type contracts.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `rg -n "You are the CEO|CEO Briefing|Email owner|board update" packages/plugins/dearme-agent-prompts/src/prompts/chief-of-staff.ts packages/plugins/dearme-agent-prompts/src/prompts/reporting.ts packages/plugins/dearme-openclaw/generated/skills/dearme-chief-of-staff/SKILL.md packages/plugins/dearme-openclaw/generated/skills/dearme-reporting/SKILL.md`
  returned no matches.
- `git diff --check -- packages/plugins/dearme-agent-prompts/src/prompts/chief-of-staff.ts packages/plugins/dearme-agent-prompts/src/prompts/reporting.ts packages/plugins/dearme-agent-prompts/src/index.test.ts packages/plugins/dearme-openclaw/generated/skills/dearme-chief-of-staff/SKILL.md packages/plugins/dearme-openclaw/generated/skills/dearme-reporting/SKILL.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AD: Workbench Projection Trace Coverage

Goal: keep the current DearMe workbench response customer-safe even when nested
review feedback traces contain Symphony/OpenClaw/Paperclip/provider language.

Donor grounding:

- DM-044/DM-045: keep the projection boundary and hidden-substrate regression
  idea, not the retired service/file layout.
- Symphony: treat worker output as evidence to map onto the current workbench
  response contract.
- Paperclip/OpenClaw: preserve the internal substrate while keeping the paid
  beta workbench framed as DearMe team progress.

Completed:

- Projected output review feedback trace headline, summary, user feedback, and
  changes through the shared DearMe workbench projection helper.
- Added fast unit coverage for helper text and deeply nested output payloads.
- Left routes, schemas, activity storage, and embedded Postgres service flow
  unchanged.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts --run`
  passed: 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

### DM-183AC: Channel-Neutral Prompt Rails

Goal: keep DearMe's first-run team instructions from implying a fixed X or
LinkedIn-first public surface before the user connects their own channels.

Donor grounding:

- Symphony: sidecar review identified the lowest-risk language layer while the
  coordinator kept implementation local.
- Polsia: preserve a simple autonomous public-work loop without channel setup
  becoming the product surface.
- Naive/Paperclip: keep tool contracts and approval gates stable while product
  copy improves.

Completed:

- Replaced bootstrap X/LinkedIn defaults with connected-channel language for
  public publishing and profile setup.
- Updated Content Producer's channel preferences and launch-boundary wording so
  generated skill prompts no longer seed a LinkedIn/X default.
- Synchronized generated OpenClaw bootstrap and skill files from source.
- Left `post_x`, tweet-shaped payload fields, OAuth platform docs, and outbound
  tool bindings unchanged because those are contract surfaces.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed: 26 tests.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 18 tests.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `git diff --check -- packages/plugins/dearme-openclaw/src/bootstrap.ts packages/plugins/dearme-openclaw/generated/bootstrap/AGENTS.md packages/plugins/dearme-openclaw/generated/bootstrap/USER.md packages/plugins/dearme-openclaw/generated/bootstrap/SOUL.md packages/plugins/dearme-openclaw/generated/skills/dearme-content-producer/SKILL.md packages/plugins/dearme-openclaw/src/index.test.ts packages/plugins/dearme-agent-prompts/src/prompts/content-producer.ts packages/plugins/dearme-agent-prompts/src/index.test.ts docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AB: Mutation Error Coverage

Goal: lock the customer-safe error boundary for the DearMe page's highest-risk
mutation paths without changing the already-current runtime flow.

Donor grounding:

- DM-046/DM-047: keep the source/action mutation failure cases, not the stale
  component offsets or older button copy.
- Symphony: treat worker branches as regression evidence to replay onto the
  current architecture.
- Polsia/Lindy: keep failures framed as team or private-work issues instead of
  provider, workspace, or route failures.

Completed:

- Added Voice & Memory save, retire, and restore failure regressions.
- Added Brand OS preview/start failure regressions.
- Added focused private-work review failure regression coverage.
- Left production code unchanged because the current page already uses the
  shared DearMe customer-safe error helper on those paths.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 58 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183AA: Live Feed State Guidance

Goal: make the live team feed easier to scan by explaining what each state means
for the user's next move.

Donor grounding:

- DM-088: keep the state-explanation idea, not the stale replacement component.
- Polsia: preserve visible team momentum and quick status comprehension.
- Lindy: continue using action-card grammar instead of bespoke feed cards.
- Symphony: use worker branches as evidence to absorb into the current
  architecture.

Completed:

- Added state guidance derived from the existing live-feed item kind/status,
  including review-ready, in-motion, recorded, memory, report, blocked, and
  cancelled states.
- Rendered that guidance inside the current `DearMeActionCard` next-action
  surface, keeping customer language small and decision-oriented.
- Left the workbench schema, route shape, query cache, and runtime event layer
  unchanged.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183Z: Memory Context Term Safety

Goal: keep Voice & Memory updates from reintroducing donor/runtime vocabulary
when they become future DearMe routine guidance.

Donor grounding:

- DM-043: reuse the customer-safe memory-label idea without importing the stale
  voice-memory service shape.
- Symphony: treat old worker branches as evidence to inspect and absorb, not as
  raw merge targets.
- Naive/Paperclip: keep using the existing activity-log memory path and routine
  refresh flow.

Completed:

- Added a customer-safe normalization pass for Voice & Memory titles, bodies,
  and source labels before they are rendered into DearMe routine descriptions.
- Updated the existing routine-context regression so a proof point that contains
  substrate, provider, route, credential, and runtime terms refreshes into
  DearMe-owned wording.
- Kept schema, routes, UI, and memory persistence unchanged.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
  passed: 4 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-memory-context.ts server/src/__tests__/dearme-memory-context.test.ts docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183Y: Launch Boundary Cards

Goal: make public-action caution visible while users scan prepared private work,
before they open a focused decision panel.

Donor grounding:

- DM-030: reuse the review-boundary card idea without depending on the old
  `reviewContext.approvalBoundary` shape.
- Polsia: keep the control surface simple; the user sees what is safe and what
  waits for review in place.
- Naive/Paperclip: reuse existing output detail contracts rather than adding
  a parallel card-specific field.

Completed:

- Added a `Launch boundary` strip to ready private work cards when
  `approval_gate` or `deploy_gate` detail text is present.
- Kept the existing detail grid intact so focused review and first-week detail
  coverage continue to use the same source payload.
- Added UI coverage for the launch boundary strip on a prepared content card.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183X: Team Progress Map Copy

Goal: keep the growth map customer-owned by removing the last visible workstream
label from the DearMe page.

Donor grounding:

- DM-038: reuse the product-facing team progress copy direction without
  replaying stale component edits.
- Polsia: keep the surface compact and legible; the user sees progress, not
  implementation lanes.
- Symphony: treat old worker output as reusable source material, then absorb the
  smallest current-safe slice into the coordinator branch.

Completed:

- Renamed the visible growth-map heading from `Team work stream` to `Team
  progress map`.
- Kept `workbench` and `workStream` as internal route/schema vocabulary for this
  slice instead of starting a broad contract migration.
- Added a regression assertion that the retired customer-facing phrase stays out
  of the page.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

### DM-183W: Retired Voice & Memory Restore

Goal: let users recover a retired private source while keeping Voice & Memory
maintenance inside the existing DearMe workbench.

Donor grounding:

- Lindy: source management should stay reviewable and reversible without
  sending users to a separate settings surface.
- Polsia: the workbench should preserve personal-brand continuity rather than
  making a bad retire action feel permanent.
- Naive/Paperclip: reuse the current activity-log memory substrate, memory
  update result shape, and routine refresh path.
- Symphony: absorb the branch as a bounded maintenance slice in the current
  coordinator branch.

Completed:

- Added `memory.archived` to the DearMe workbench contract and projection.
- Added an owner-only restore route that reconstructs the last saved private
  source from activity history and writes a fresh memory update.
- Added a `Retired sources` workbench section with a `Restore` action and UI
  mutation wiring.
- Added route, embedded workbench, and UI coverage for restore behavior.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 93 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md packages/shared/src/validators/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/routes/dearme.ts server/src/services/dearme-workbench.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183V: Brand OS Preview Copy Cleanup

Goal: keep the Brand OS preview customer-owned by describing the first pass as
private work and working rhythm rather than internal operations.

Donor grounding:

- Lindy: assistant work surfaces should stay outcome-oriented and review-first.
- Polsia: the onboarding proof should feel like a personal-brand rhythm, not a
  backend cycle table.
- Naive/Paperclip: reuse the current preview payload and execution plan; do not
  rename stable operation fields or API contracts.
- Symphony: absorb the old DM-029 worktree as a scoped copy slice inside the
  current integration branch.

Completed:

- The empty Brand OS preview now says the user can see first private work,
  budget, memory seeds, and launch boundaries before anything starts.
- Preview metrics and sections now say `Rhythm`, `Working rhythm`, and `First
  private work`.
- Tests now lock out `First operations` and `machinery hidden` from the visible
  preview surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 52 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183U: Artifact Links For Focused Private Work

Goal: keep Symphony-driven review entrypoints customer-safe by naming prepared
work as artifacts in generated DearMe links while preserving old review
handoffs.

Donor grounding:

- Lindy: customer action links should describe the thing being reviewed, not
  leak internal output mechanics.
- Polsia: the live work stream should feel like a polished product rhythm, even
  when it is carrying exact prepared-work context.
- Naive/Paperclip: reuse the existing output id and focused review parser; do
  not add a second route, table, or review surface.
- Symphony: use the integration branch as the coordination spine and absorb the
  stale worker residue as a scoped route cleanup.

Completed:

- Generated DearMe decision links now use `artifact=` for prepared-work focus.
- Legacy `output=` links still parse, so older handoffs keep opening the exact
  private work item.
- Updated work-ready, continue, batch, Dear me letter, opportunity, and first
  proof-pack route assertions to the canonical artifact link.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183T: Exact Output Focus From Review Entrypoints

Goal: preserve the exact prepared-output context from stale worker review
entrypoints without adding another DearMe route or review surface.

Donor grounding:

- Lindy: pending-action cards should let the user make the next call in place
  when the work is already reviewable.
- Polsia: the work stream should keep high-leverage launch calls in the user's
  current rhythm instead of sending them into a raw task view.
- Naive/Paperclip/Symphony: reuse current output handoff ids, batch decision ids,
  and live stream payloads; do not expose hidden runtime or worker machinery.

Completed:

- Batch decision cards now open the focused DearMe decision route with the
  prepared output selected.
- The Dear me letter carries its report output id into the same focused decision
  route.
- Reviewable live-feed work renders the existing prepared-work review controls
  directly in the feed, while in-motion items still deep-link to the exact output
  when useful.
- Preserved approval-first routing for approval-backed live-feed items and kept
  raw issue URLs out of the DearMe surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

### DM-183S: Decision-First Live Team Feed

Goal: carry forward DM-088's decision-first team progress value without
reverting the newer DearMe workbench architecture.

Donor grounding:

- Polsia: progress should show the customer what needs a call before showing
  background motion.
- Lindy: operational feeds should group actionable work instead of presenting
  a flat event list.
- Naive/Paperclip/Symphony: reuse the current workbench stream projection,
  action cards, review-loop labels, and DearMe decision routing; do not add a
  second feed contract or expose hidden work machinery.

Completed:

- Grouped the existing live team feed into `Needs your call`, `In motion`, and
  `Recent updates`.
- Added counts for calls waiting and private work in motion in the live-feed
  header.
- Preserved current proof-pack continuity, growth map, run ledger, Work Ready,
  and Decisions Needed surfaces instead of replaying the stale DM-088 component
  shape.
- Added focused page coverage for the new grouping and kept raw issue/approval
  routes hidden from the DearMe surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DEA-8: Live Proof Pack Handoff v0

Goal: prove the first-run DearMe aha moment with real prepared proof flowing
through the existing handoff and workbench path, without adding a parallel
first-run contract.

Donor grounding:

- Polsia: the first session should show concrete team progress quickly.
- Naive/Paperclip: reuse documents, output records, approval gates, and the
  workbench read model as the hidden execution substrate.
- Lindy: keep proof cards and review actions compact and customer-readable.

Completed:

- Absorbed the useful docs-only Symphony handoff from Linear `DEA-8` without
  merging the worker checkout's unrelated file deletions.
- Verified the existing first-cycle start path prepares source-labelled
  identity, audience, content, opportunity, private-site, and report proof.
- Confirmed `/outputs` returns all six ready-for-review output kinds and
  `/workbench` projects them into Work Ready, Decisions, batch decisions,
  recent progress, stream, ledger, and output surfaces.
- Recorded the verification in `docs/dearme/BUILD-STATE.md`; no code or schema
  changes were needed.

Verification:

- Linear `DEA-8` Symphony completion comment
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- DEA-8 focused DearMe Vitest target
- DEA-8 local API health check and shell API smoke against `/first-cycle/start`,
  `/outputs`, and `/workbench`

### DM-183R: DearMe Live Refresh Invalidation

Goal: make DearMe's visible work stay current when background decisions,
reviews, comments, and output activity arrive over the existing live-update
channel.

Donor grounding:

- Polsia: the customer should see progress appear without manual refresh or
  admin navigation.
- Lindy: decisions and comments are operational signals that should update the
  active customer context quickly.
- Naive/Paperclip/Symphony: reuse live updates, query invalidation, activity
  payloads, and DearMe workbench projection; do not add a second realtime
  channel.

Completed:

- Added DearMe product activity detection for activity actions and metadata.
- DearMe product activity invalidates workbench, brand blueprint, outputs, and
  paid-beta access queries.
- DearMe approval decisions now refresh the DearMe product surface while still
  preserving generic approval invalidations.
- Broad issue comment/update events refresh only the DearMe workbench so the
  server projection decides whether the comment is customer-visible.
- Heartbeat and agent status events also refresh the DearMe workbench so the
  customer surface catches durable progress changes.

Verified:

- `pnpm exec vitest run ui/src/context/LiveUpdatesProvider.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DM-183Q: Review Feedback Memory Loop

Goal: make negative or corrective review decisions become future DearMe memory
so the next private pass learns from what the customer rejected.

Donor grounding:

- Polsia: the growth loop should keep learning from the owner without manual
  process management.
- Lindy: rejection and revision are still structured signals, not terminal
  failures.
- Naive/Paperclip/Symphony: reuse activity log, routine refresh, workbench
  memory projection, and existing review route; do not add a new customer
  workflow.

Completed:

- Added `review_feedback` to the shared DearMe memory kind contract and UI/
  workbench labels.
- The DearMe review route now records review feedback memory when the owner
  requests changes, asks for another pass, or says prepared work is not useful.
- The memory body captures the output title, customer note, and continuation
  intent in customer-safe language.
- Review feedback refreshes existing DearMe growth-cycle routine context.
- Approved outputs remain quiet so the memory stream does not fill with
  redundant successful decisions.

Verified:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

### DM-183P: DearMe Approval Entry Routes

Goal: keep every approval entry point that can surface a DearMe decision inside
the DearMe decisions surface, while leaving generic approvals untouched.

Donor grounding:

- Polsia: decisions should feel like a small number of product moves, not an
  admin approval list.
- Lindy: users should land directly in the context where a decision can be made
  or corrected.
- Naive/Paperclip/Symphony: keep the durable approval/comment/activity
  substrate backstage; DearMe owns routing, copy, and error translation.

Completed:

- Added `approvalDetailHref(...)` plus DearMe-only approval action error
  filtering to the shared DearMe approval helper.
- Routed DearMe approval activity rows and linked comment-thread approvals to
  `/dearme?view=decisions&approval=...`.
- Routed issue-detail linked approvals, approval list cards, inbox rows, and
  inbox keyboard navigation through the same helper.
- Kept generic approvals on `/approvals/:id` and preserved generic raw error
  behavior.
- After DearMe reject/approve actions, kept users on the DearMe decision
  surface with short product-safe completion wording.

Verified:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ActivityRow.test.tsx ui/src/components/CommentThread.test.tsx ui/src/pages/Inbox.test.tsx ui/src/pages/IssueDetail.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`

### DM-183O: DearMe Approval/Profile UI Boundaries

Goal: keep shared UI approval/profile entry points inside the DearMe product
surface when the underlying approval is a DearMe decision.

Donor grounding:

- Polsia: the customer should see a small number of high-leverage decisions,
  not a generic admin approval queue.
- Lindy: pending-review actions should route to the action context where the
  user can decide quickly.
- Naive/Paperclip/Symphony: keep approvals, inbox rows, and hidden execution
  failure terms as backstage substrate; DearMe translates the entry point and
  error language.

Completed:

- Added a shared DearMe approval-type helper for decision links and approved
  redirects.
- Registered `dearme_output_next_move` in the shared approval type contract so
  tests no longer need to cast DearMe output decisions around the validator.
- Routed DearMe approvals from approval cards, detail pages, lists, and inbox
  rows back to `/dearme?view=decisions&approval=...`.
- Hid requester identity, raw IDs, linked issues, and full payload controls for
  DearMe approval detail pages.
- Replaced inherited missing-company wording on the DearMe page with a DearMe
  profile prompt.
- Expanded customer-safe error filtering for model/key/token/orchestration
  failure strings on the DearMe action path.

Verified:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/Inbox.test.tsx --maxWorkers=1`
- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/Inbox.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`

### DM-183N: Scannable First-Week Output Details

Goal: make first-week private work cards show the concrete value inside
content, opportunity, portfolio, and report outputs without introducing another
output contract.

Donor grounding:

- Polsia: the first pass should show useful work immediately, not hide the
  proof behind a generic card.
- Lindy: keep detail fields in the existing action-card/review grammar.
- Naive/Paperclip/Symphony: reuse output handoff `details`; do not add a new
  runtime, route, schema, or worker-facing product surface.

Completed:

- Added output-kind detail ordering in the DearMe UI for Brand OS, voice
  profile, content drafts, opportunity drafts, portfolio updates, and weekly
  reports.
- Made private-work cards and focused prepared-work review consume the same
  ordered detail selection.
- Added regression coverage proving a content draft with shuffled detail order
  still shows channel, audience, hook, draft body, proof, and launch boundary.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check`
- `.symphony/bin/dearme-symphony status`

### DM-183M: DearMe Server Safe Boundaries

Goal: make DearMe server failures match the customer-safe product boundary so
the UI does not receive raw board, company, auth, validation, or access-control
wording, and stale approvals cannot look approved before they fail.

Donor grounding:

- Polsia: the customer surface should explain the next product step, not expose
  internal control-plane labels.
- Lindy: approval/review failures should stay short and actionable.
- Naive/Paperclip/Symphony: keep authz, company access, validation, and
  approval payload shape as the hidden substrate; DearMe translates or
  preflights the error before it reaches the customer path.

Completed:

- Added a DearMe route error boundary that converts Zod failures and common
  access failures into product-safe messages.
- Preserved unknown server errors and non-DearMe route behavior by keeping the
  boundary inside `dearmeRoutes(...)`.
- Added Brand OS approval preflight before approval mutation, keeping malformed
  legacy payload approvals pending with a customer-safe refresh message.
- Added route, approval-service, and embedded apply regression coverage for
  company-access, owner-account, validation, and stale-payload failures.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/approvals-service.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/server typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183L: Visible Learning Loop

Goal: make the operating rhythm read as a full autonomous loop by showing
learning as an explicit customer-visible stage, not only as words in the Growth
cycle heading.

Donor grounding:

- Polsia: plan/work/review/learn should feel like a compounding growth rhythm,
  not a one-pass task board.
- Lindy: keep the learning signal inside the existing action-card grammar
  instead of adding a separate admin-style memory panel.
- Naive/Paperclip/Symphony: reuse Voice & Memory, source review, report
  learnings, and the existing action graph; do not expose runtime or worker
  details.

Completed:

- Added a Learn card to the Growth cycle panel using existing workbench facts.
- Derived the visible signal from current memory, pending source review, report
  learnings, and action-graph memory nodes.
- Updated regression coverage so the paid-beta shell proves the visible
  learning loop stays present.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183K: Feedback-Applied Review Trace

Goal: make repeated private revisions feel trustworthy by showing the user what
changed after their last feedback, while still reusing the existing output
handoff and review-comment substrate.

Donor grounding:

- Polsia: keep review momentum visible and compress "the team listened" into a
  single high-confidence card.
- Lindy: use a compact action-card pattern for applied feedback instead of a
  new modal or task detail surface.
- Naive/Paperclip/Symphony: reuse comments, documents, work products, and
  worker-updated outputs; do not expose provider, issue, runtime, or worker
  metadata to customers.

Completed:

- Added a strict `feedbackTrace` schema on DearMe output review loops with
  headline, summary, optional user feedback, and 1-4 customer-safe changes.
- Built feedback traces in `dearme-output-handoff` when fresh private work
  lands after a request-changes, not-useful, or new-direction decision.
- Rendered the trace as a focused prepared-work card labeled "Feedback
  applied", including the user's prior note and the latest private changes.
- Tightened live-pulse and team-board copy so customer-facing strings do not
  translate hidden terms into other hidden terms such as workbench/workspace.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `.symphony/bin/dearme-symphony status`
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
- `git diff --check`

### DM-183J: Customer-Safe Review Copy and Error Boundaries

Goal: absorb the useful DM-035/DM-036/DM-041/DM-042 UI residue as one
customer-facing DearMe review pass without replaying stale branch history.

Donor grounding:

- Polsia: make prepared work feel ready for the user's decision, not like a
  generic artifact inventory.
- Lindy: keep review decisions short, action-oriented, and written in the
  user's voice.
- Naive/Paperclip/OpenClaw/Symphony: keep inherited service failures behind a
  product-safe DearMe boundary on the customer path.

Completed:

- Renamed the private work review header and count copy away from generic
  "surfaces" language.
- Rewrote default approval, rejection, revision, regeneration, and new-direction
  notes so recorded decisions read naturally as DearMe review outcomes.
- Added panel/action error sanitization and regression coverage so internal
  provider/runtime/adapter failures do not leak through the DearMe UI.

### DEA-7: Proof Pack Continuity, Rerun Key, and Live Pulse

Goal: let real Symphony content workers retry safely while making the customer
see one continuous private proof pack instead of disconnected artifacts.

Donor grounding:

- Polsia: keep the daily product surface centered on one visible momentum loop,
  not scattered task telemetry.
- Naive/Paperclip: reuse issue work products, output handoff, route validation,
  and the existing workbench projection instead of adding another content
  runtime table.
- OpenClaw/Symphony: workers provide packet ids as stable rerun keys; the
  customer sees proof-pack continuity and live private-team motion, not runtime
  ids, provider fields, or orchestration names.

Completed:

- Made content `packetId` mandatory and reused the existing `externalId` update
  path so a worker retry with the same packet id updates the same private
  review work product.
- Added the workbench `Proof pack continuity` ribbon that connects Voice &
  Memory, Work Ready, the Dear me letter, and launch calls from the same
  private proof pack.
- Added a compact current-proof-pack row inside that ribbon, making the path
  from proof pack to next move to launch call visible before users inspect the
  supporting cards.
- Added a `Live team pulse` projection from existing workbench SSE events so
  worker progress becomes visible customer momentum without exposing Symphony,
  OpenClaw, runtime, provider, or model terms.
- Renamed the opportunity workbench surface from packet wording to lead
  batches, opportunity drafts, and launch calls so the scout lane stays in the
  same customer language system.
- Extended route/service/UI tests to cover missing packet ids, retry updates,
  hidden-term-free continuity copy, hidden-term-free live pulse copy, and
  packet-free opportunity copy.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme?view=opportunities`
- `.symphony/bin/dearme-symphony status`

### DM-138A: First-Cycle Start Bridge

Goal: turn the first positioning answer into private work immediately while
preserving the existing first-cycle proof contract.

Donor grounding:

- Polsia: compress the first session into visible momentum and a "First 5
  minutes" proof timeline.
- Naive/Paperclip: reuse company access, board checks, issues, activity logs,
  wakeups, and the existing workbench stream instead of a new first-run runtime.
- OpenClaw: keep worker execution backstage; the customer sees Team progress,
  not runtime setup or adapter terms.

Completed:

- Added `POST /api/dearme/companies/:companyId/first-cycle/start`, which
  consumes the existing preview schema and returns the existing
  `DearMeFirstCyclePreviewResponse`.
- The start route creates a private first-cycle issue, records a
  `dearme.first_cycle_started` activity event, emits customer-safe workbench
  stream frames, and wakes the chief-of-staff lane.
- The onboarding CTA now calls `startFirstCycle(...)` rather than the read-only
  preview route.
- The proof package now shows the first-run proof order: 0-30s identity
  dossier, 60-120s audience map, and 3-5min private site proof.
- Trial/private-cycle lock users still receive the existing blocker response;
  no public send, deploy, spend, or sensitive external action is triggered.

Verification:

- `pnpm exec vitest run ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/api/dearme.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx server/src/routes/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts doc/plans/2026-05-08-dearme-symphony-operating-loop.md docs/dearme/POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

### DM-138B: First-Run Proof Sequence Contract

Goal: make the first-run personal proof sequence part of the single shared
preview response instead of a UI-only timeline or a second payload.

Donor grounding:

- Polsia: preserve the first-session shock with visible 0-30s, 60-120s, and
  3-5min progress.
- Naive/Paperclip: keep a typed shared contract and hidden issue/workbench
  substrate instead of adding another runtime surface.
- OpenClaw: leave worker orchestration backstage; customer surfaces only show
  identity, audience, and private proof work.

Completed:

- Added `proofSequence` to `DearMeFirstCyclePreviewResponse` with exactly
  three windows: identity dossier, audience map, and private site proof.
- Updated the first-cycle preview builder to derive the sequence from the
  same positioning, audience, proof, and offer fields already used by starter
  posts, opportunity lead, and portfolio proof card.
- Updated `POST /api/dearme/companies/:companyId/first-cycle/start` to create
  the private work issue from `proofSequence`, keeping coordinator work order
  aligned with the UI.
- Updated the onboarding proof package to render `proofSequence` directly for
  sample and generated first-run proof.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 86 tests.

Follow-up:

- DM-138C now attaches prepared output handoff artifacts to this contract. The
  remaining gap is an end-to-end worker/browser proof, not a new payload shape.

### DM-138C: First-Run Proof Hydration

Goal: make the existing first-run proof sequence reuse prepared worker output
without adding another customer contract.

Donor grounding:

- Polsia: keep the first-session sequence visible and fast.
- Naive/Paperclip: reuse durable documents and work products as the hidden
  source of truth for prepared proof.
- DearMe product shell: keep the customer surface on identity, audience, and
  private proof cards, not runtime machinery.

Completed:

- `previewFirstCycle(...)` now asks the DearMe output handoff for prepared
  outputs and hydrates `proofSequence` from matching documents/work products.
- Brand OS / voice, content, opportunity, portfolio, and report outputs map
  into the existing 0-30s, 60-120s, and 3-5min windows.
- The implementation keeps the single
  `DearMeFirstCyclePreviewResponse.proofSequence` contract for UI, start route,
  and coordinator work order.
- Progress comments alone no longer count as first-run proof; the hydrator only
  trusts prepared documents or work products.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 36 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- `git diff --check` passed for the service/test/docs slice.

Remaining gap:

- DM-138D now writes first-cycle proof outputs through the same output handoff
  path that hydrates the preview. The remaining live check is `DEA-5` /
  `DM-138E`: run the same first-cycle path through Symphony where available
  and browser-smoke the customer package.

### DM-138D: Start-Route Proof Output Write

Goal: make first-cycle start prepare the private proof artifacts itself, then
return the same source-labelled `proofSequence` contract to the customer shell.

Donor grounding:

- Polsia: preserve the first-session identity/audience/private-site proof
  sequence as the visible aha path.
- Naive/Paperclip: reuse the private issue, activity log, and live event
  substrate as the hidden work order.
- Symphony: keep this as a bounded integration proof, now followed by `DEA-5`
  for the live worker/browser smoke.

Completed:

- Added `prepareFirstCycleProofOutputs(...)` to the Brand Blueprint service.
- Reused the existing Brand Blueprint output handoff fingerprints and document
  service to write Brand OS, Voice Profile, approval gates, starter posts,
  opportunity list, portfolio update, and Dear me report docs during
  first-cycle start.
- Made the write idempotent: repeated starts update the same five output issues
  instead of creating duplicate proof packages.
- Kept route propagation covered so the prepared labels still flow into the
  private issue description, activity-log `artifactOrder`, and
  `task_created` event payload.

Verification:

- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 37 tests.

### DM-139 / DM-140: Shared Cycle Output Packet

Goal: move autonomous reporting and voice-gated content production forward by
reusing the existing output handoff path, not by creating a second report or
content runtime.

Donor grounding:

- Polsia: the cycle should end with a plain private report and a small number
  of high-leverage next decisions.
- Naive/Paperclip: issues, documents, work products, and service projections
  are the durable hidden source of truth.
- DearMe product shell: the user sees content, a Dear me report, voice fit,
  and review choices; not provider, runtime, or worker machinery.

Completed:

- Added `prepareCycleOutputPacket(...)` to the DearMe output handoff service.
- The packet reads the current Brand OS, voice profile, content draft,
  opportunity, portfolio, and report outputs, scores the draft with the
  existing Voice Gate, and writes synchronized `content-drafts` and
  `dear-me-report` documents.
- The content and report issues are reopened to `in_review` and receive primary
  `dearme-cycle-output` work products, so later workbench/report surfaces have
  one shared server-side packet to project.
- First-cycle start now invokes the packet after writing the first proof
  outputs, giving the initial aha path a voice-scored content artifact and a
  private report from the same evidence.
- The DearMe workbench now detects the same packet through output handoff text
  and projects it into Work Ready, Decisions, report digest, work stream, run
  ledger, and action graph nodes as one private review surface.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 9 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed: 43 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 12 tests.

### DM-S01: Company PATCH Mass-Assignment Hardening

Goal: close the inherited Paperclip mass-assignment exposure before any
paid-beta gate opens.

Donor grounding:

- Naive security probe (recorded in
  `naive-research-2026-05-05/SECURITY-FINDINGS.md`) showed
  `PATCH /api/companies/:id` accepted `budgetMonthlyCents`,
  `spentMonthlyCents`, `requireBoardApprovalForNewAgents`,
  `attachmentMaxBytes`, and `status` without an allow-list.
- Paperclip OSS has the same shape upstream, so DearMe inherits the bug
  through the fork.

Acceptance:

- `updateCompanySchema` is `.strict()` and only accepts safe self-service
  fields (`name`, `description`, `feedbackDataSharingEnabled`,
  `feedbackDataSharingTermsVersion`, `brandColor`, `logoAssetId`).
- `updateCompanyGovernanceSchema` is `.strict()` and accepts
  `status`, `budgetMonthlyCents`, `attachmentMaxBytes`, and
  `requireBoardApprovalForNewAgents` only.
- `PATCH /api/companies/:companyId/governance` enforces `assertBoard(req)`
  and routes budget changes through `budgets.upsertPolicy(...)`.
- `spentMonthlyCents` is no longer mutable through any company PATCH path
  (must be aggregated from `cost_events`).
- Unit tests in `packages/shared/src/validators/company.test.ts` cover
  the rejected attack vectors and the accepted safe fields.

### DM-136: First-Run Sample Demo Proof

Goal: make DearMe's first-run surface understandable before the visitor enters
their own positioning answer.

Donor grounding:

- Polsia first-wow packaging: a user should see visible work immediately.
- Naive/Paperclip hidden substrate: reuse the typed first-cycle preview
  generator and the same public-action boundary contract.
- Lindy review grammar: separate prepared private work from the user's launch
  decision without making caution the first product emotion.
- Littlebird web ergonomics: keep the sample package compact inside the current
  shell.

Completed:

- Added a sample first-cycle package for Maya Chen that includes a Voice
  Profile, Voice Gate, starter posts, opportunity lead, portfolio proof card,
  first growth plan, and launch boundary.
- Refactored first-cycle rendering so the sample state and generated user state
  share the same proof-package component.
- Added UI coverage proving the sample renders without a backend preview call
  and is replaced after the user starts their own first cycle.
- Added `POLSIA-NAIVE-PM-ANALYSIS.md` as the PM/product-architect layer above
  the existing architecture comparison and implementation reuse plan.

### DM-136 Integration Update: First-Run Autopilot Plan Contract

Goal: make the sample proof, generated proof, shared API contract, and product
doctrine all say the same thing: DearMe keeps working privately and waits only
before launch actions.

Donor grounding:

- Polsia: visible autonomy first; the team should look like it is already
  moving, not waiting for setup.
- Naive/Paperclip: use the existing typed preview response and approval
  boundary instead of creating another first-run runtime.
- Lindy: present the few user decisions as reviewable launch calls after the
  work is prepared.

Completed:

- Added `autonomyPlan` to `DearMeFirstCyclePreviewResponse`.
- Exported `DEARME_FIRST_CYCLE_CONCERN_GATES` so the first-cycle UX and tests
  share the exact four launch gates: publish, send, public-site change, spend.
- Rendered the autonomy plan inside the first-cycle proof package for both
  sample and generated states.
- Removed first-run sensitive-proof blocking language from the customer launch
  boundary; sensitive/public-claim risk remains a policy check, not a fifth
  first-run concern screen.
- Documented the update in `BUILD-STATE.md`, `INDEX.md`, `README.md`, and
  `PRODUCT-ARCHITECTURE.md`.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts`
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx`
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- Playwright browser check on `http://127.0.0.1:3100/DEAA/dearme`

### DM-181: Live Workbench UI Consumer

Goal: make the existing workbench feel alive after the server-side live stream
exists, without adding a customer-visible runtime console.

Donor grounding:

- Polsia live-work choreography: the surface should show that the team moved.
- Naive/Paperclip hidden substrate: reuse the existing workbench projection and
  React Query cache instead of adding another state tree.
- Lindy review grammar: keep the customer focused on updated work and
  decisions, not event plumbing.

Completed:

- Added `dearmeApi.openWorkbenchEvents(companyId)` for the company-scoped
  workbench stream.
- Subscribed the DearMe workbench page to `sync` and runtime-update events.
- Applied `sync` frames directly to the workbench query cache and debounced the
  broader runtime events into a normal query invalidation.
- Added UI coverage proving a live `sync` frame updates the rendered headline
  and summary, and that the stream closes on unmount.

### DM-182: OpenClaw Passthrough Workbench Refresh

Goal: let OpenClaw execution progress update the same customer-safe Team
workbench without exposing a runtime console or forcing a second subscription.

Completed:

- Added `openclaw_lifecycle` and `openclaw_stream` to the existing DearMe
  workbench refresh event set.
- Added UI coverage proving a lifecycle passthrough invalidates and refetches
  the workbench projection, so execution movement lands as Team progress.

### DM-180: Approval Resolver API Boundary

Goal: expose the existing cloud approval resolver through the DearMe API so
OpenClaw/outbound paths and the customer workbench use the same decision
record, issue link, and audit trail.

Completed:

- Added shared validators for approval resolve requests and route responses.
- Added `POST /api/dearme/companies/:companyId/approvals/resolve` with company
  access checks, cross-company issue rejection, issue identifier normalization,
  and activity-log recording.
- Updated the resolver to persist both user and agent attribution on
  `approvals` and `issue_approvals`.
- Updated the outbound tool wrapper to call the resolver through the same
  attribution-aware input shape.

### DM-183: Symphony Worktree Status Contract

Goal: make the many local Symphony-style worktrees usable as a reuse queue
without encouraging blind branch merges.

Donor grounding:

- Symphony: isolated worker discipline and evidence-based handoff.
- Naive/Paperclip: keep git worktree state as the substrate fact source.
- DearMe product architecture: coordinator owns merge/replay decisions; old
  worker branches are candidates, not product truth.

Completed:

- Added ticket extraction, purpose classification, and coordinator next-action
  annotations to `scripts/dearme-worktree-status.mjs`.
- Added filters for status, ticket, dirty-only, limits, summary-only, and
  skip-dirty runs.
- Added `pnpm test:dearme-worktrees` with focused Node coverage for parsing,
  filtering, summary buckets, ticket extraction, and `pnpm --` argument
  handling.
- Verified that the current local inventory is 116 records: 1 current, 2
  absorbed, 113 not in current, 19 integration-style, and 96 worker-style.
- Verified that no active DM-138 worktree exists, so the next DM-138 product
  slice should start fresh from the current integration head.

### DM-183H: Focused Work Context and Action Labels

Goal: replay the still-useful DM-034/DM-040 UI residue without merging stale
worker history.

Donor grounding:

- Lindy: action cards should keep compact controls while retaining clear
  accessible context.
- Polsia: prepared work should explain missing ingredients before any public
  move.
- Naive/Paperclip: reuse existing output source evidence and review routes; no
  new schema, endpoint, or table.
- Symphony: consume candidate worktrees as scoped slices.

Completed:

- Added artifact-specific accessible labels to prepared-work card actions while
  preserving visible `Review`/`Open`.
- Focused prepared work now filters blank source rows and shows a Voice &
  Memory empty state when context is missing.
- Customer-facing bootstrap instructions use team-routing/workspace language
  instead of proxy/runtime wording.

### DM-135: First-Run Sample Team Proof

Goal: make the first DearMe run prove the team shape before a customer connects
real channels or trusts deeper automation.

Donor grounding:

- Polsia first-wow choreography: multiple lanes should visibly move from one
  user direction.
- Naive/Paperclip hidden substrate: reuse the existing first-cycle preview
  contract, route, service, and UI API instead of adding another runtime.
- Lindy review grammar: show what is prepared and what remains approval-gated
  before external action.
- Littlebird web ergonomics: keep the proof package compact enough for the
  customer shell.

Completed:

- Confirmed the existing preview contract already returns a Voice Profile, three
  starter posts, one opportunity lead, one portfolio proof card, and one first
  growth plan.
- Rendered the preview's approval boundary and blocked public actions next to
  the generated first-run package.
- Added focused UI coverage for the approval boundary.
- Verified the slice on desktop and mobile browser viewports without
  donor/runtime language leaking into the customer path.
- After integration, reran full workspace typecheck, test, and build gates.

### DM-134: Brand Team Run Ledger

Goal: turn Polsia-style live progress into a DearMe-safe record of what the
team tried, prepared, learned, and needs from the user.

Donor grounding:

- Polsia live work stream and "work happened while I was away" packaging.
- Naive/Paperclip workbench projection as the hidden source of truth.
- Lindy action-card grammar and review-first status surfaces.
- Littlebird compact mobile shell discipline.

Completed:

- Added a customer-safe `Brand Team Run Ledger` panel to the workbench.
- The ledger has Tried, Prepared, Learned, and Needs your call buckets.
- Added a shared `runLedger` workbench contract and server-side projection.
- Entries are derived from the existing workbench stream, with latest Voice &
  Memory as a learned fallback when the stream does not already include one.
- No backend route, database table, worker, donor dependency, or raw runtime
  surface was added.

### DM-133: Mobile Decision Detail Polish

Goal: make focused review/decision details feel production-ready on phone
after DM-132 made the bottom navigation product-safe.

Donor grounding:

- Lindy detail-surface pattern: review actions stay inside the focused item.
- Littlebird mobile ergonomics: full-width phone actions and stable bottom
  spacing.
- Polsia decision rhythm: keep the user close to the few calls that matter.
- Naive/Paperclip hidden substrate: existing approval and output-review paths
  stay unchanged.

Completed:

- Focused decision surfaces now reserve mobile bottom padding above the DearMe
  bottom nav.
- Approval-review and prepared-work-review controls now render as stable mobile
  action groups.
- Focused decision buttons become full width on phone and compact again on
  larger screens.
- Existing review, approval, continuation, route, API, and desktop behavior
  remain unchanged.

### DM-132: Mobile Shell Navigation Polish

Goal: make the DearMe mobile shell/navigation fold feel product-owned after
DM-131 proved the first-screen focus content in a live browser.

Donor grounding:

- Polsia first-wow hierarchy: keep users near decisions and ready work.
- Naive/Paperclip hidden substrate: reuse the existing layout shell and sidebar
  drawer while keeping inherited workspace chrome out of the customer path.
- Lindy compact app-navigation rhythm: short repeat actions for current work,
  decisions, and voice review.
- Littlebird mobile ergonomics: short labels, stable tap targets, safe-area
  padding, and no first-viewport collision.

Completed:

- Added a DearMe-specific mobile bottom nav with Home, Decisions, Work Ready,
  Voice, and More.
- Wired More to open the full DearMe sidebar drawer.
- Kept the generic mobile bottom nav disabled on DearMe routes.
- Playwright mobile `390x844` passed with DearMe nav count `1`, generic
  nav count `0`, empty console error/warn logs, and a working More-to-menu
  interaction.
- Playwright desktop `1440x1000` passed with no mobile/generic bottom nav
  rendered.

### DM-131: Browser Polish For The DearMe Team Workbench

Goal: verify and tune the DearMe first-screen workbench in a live browser after
DM-130 made the team focus explicit.

Donor grounding:

- Lindy dense home/workbench rhythm: compact current-work cards should scan as
  content, not empty containers.
- Littlebird mobile ergonomics: the first-screen hierarchy must wrap without
  horizontal overflow.
- Polsia visible momentum: "work happened while I was away" must read clearly
  in the first viewport.
- Naive/Paperclip remains the hidden workbench projection; no new data path was
  added.

Completed:

- Attempted the Browser-plugin validation path first; the current session had
  no in-app browser backend, so the rendered pass used repo Playwright.
- Fixed the focus grid's default stretch behavior so the "While you were away"
  card stays top-aligned instead of filling the right status column's height.
- Desktop `1440x1000` and mobile `390x844` browser checks passed with no
  framework overlay, no console error/warn logs, no horizontal overflow, and a
  working Decisions navigation.

### DM-130: Web Shell Polish From Lindy And Littlebird

Goal: make the customer web shell lead with a premium personal-brand team
surface instead of an admin-console summary.

Donor grounding:

- Polsia first-screen hierarchy and "work happened while I was away"
  choreography.
- Naive/Paperclip workbench projection as the hidden runtime/data substrate.
- Lindy two-column home dashboard composition and compact assistant status
  cards.
- Littlebird onboarding/task-row discipline: one clear current step plus
  compact supporting work rows.

Completed:

- Added `Today's operating focus` above the team summary.
- The new surface shows "While you were away", next private move, team focus,
  decisions waiting, work ready, weekly letter, and voice-profile confidence.
- The surface reads existing workbench data only; no backend route, database
  table, runtime service, or new API was added.
- Focused DearMe onboarding tests assert the new hierarchy and customer-safe
  copy.

### DM-129: Automation Reliability And Cost Policy

Goal: define and surface the rules for when DearMe can keep private work
moving, when it must ask, when it must stop trying, and how spend is shown.

Donor grounding:

- Polsia `task`/subscription attribution, async 202 execution, and repeated
  build-cycle pattern.
- Naive/Paperclip cost events, pre-invocation budget blocks, work/run/document
  review state, and CEO/worker split as hidden architecture.
- Lindy `router.py` and `executor.py` for rule-based effort routing,
  max-turn budgets, consecutive-failure circuit breaking, and recovery
  learning.

Completed:

- Added `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md` as the accepted
  DM-129 policy.
- Added a DearMe-native `Team operating policy` workbench panel that derives
  from existing workbench, review-loop, spend checkpoint, and paid-beta state.
- The customer surface now explains private run permission, ask-first gates,
  stale-loop stops, and spend visibility without exposing donor/runtime terms.
- No backend route, database table, model-routing service, budget-service
  rewrite, or donor service transplant was added.

### DM-128: Focused Decision Review Drawer

Goal: make Work Ready and Decisions Needed feel like polished review work, not
a broad dashboard jump.

Donor grounding:

- Polsia approval-queue choreography for a small number of high-leverage calls.
- Naive/Paperclip output review and continuation flow as the hidden substrate.
- Lindy `ActionCard.tsx`, `LindyPendingApprovalModal.tsx`, and
  `ResizableSlideOutPanel.tsx` as interaction references.

Completed:

- Focused Work Ready and batch decision surfaces now show direct prepared-work
  review controls.
- Users can approve, request changes, prepare another pass, or choose a new
  direction without seeing raw issue or approval routes.
- Focused work/action cards remain highlighted in Work Ready, Private Work,
  and Decisions Needed while the detail surface is open.
- No new backend route, database table, drawer API, Relay/GraphQL shell, or
  donor-branded UI was added.

### DM-127: Voice & Memory Source Detail Drawer

Goal: make source review feel like a polished Lindy-style source management
surface while keeping the current Paperclip-backed memory model.

Donor grounding:

- Lindy `KnowledgeBaseEditor.tsx` and `KnowledgeBaseTile.tsx` for source list
  and configure/edit behavior.
- Lindy `ResizableSlideOutPanel.tsx` for focused source detail.
- Current DearMe `sourceReviewQueue` and DM-125 direct source focus behavior.

Expected write scope:

- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/components/dearme/*` only if extracting a reusable panel/card
- Existing DearMe UI tests

Protected scope:

- No new backend route, crawler, importer, database table, or workflow runtime.
- No Relay/GraphQL/Lindy brand import.

Completed:

- `Review source` and `Prepare fact` both select the source, prefill the
  reviewed fact form, and open a source detail surface.
- The detail surface lets the user edit in the existing form, save the reviewed
  fact, close the detail, or mark the source not useful through the existing
  retire path.
- No new backend route, crawler, importer, database table, or workflow runtime
  was added.
- Focused DearMe onboarding tests cover the selected detail, save, and dismiss
  paths.

## Current Worker Queue

### DM-137: Aha-First Home Composition

Goal: make the first DearMe web experience feel more like a Polsia-style team
already working and less like a cautious setup dashboard.

Donor grounding:

- Polsia first-screen momentum, visible work stream, and "work happened while I
  was away" proof loop.
- Naive/Paperclip hidden workbench, output, approval, and cost substrate.
- Lindy polished home/action-card composition.
- Littlebird web ergonomics for a compact, credible customer shell.

Acceptance:

- The first viewport shows visible team motion, ready work, and decisions
  without exposing machinery or asking the user to configure agents.
- Sample proof, first-cycle generation, Work Ready, and Decisions Needed read
  as one coherent product loop.
- Private work feels autonomous by default; only external/public/spend actions
  are visibly gated.
- No customer-facing donor/runtime terms appear in the DearMe paid-beta path.
- The surface is polished enough for founder dogfood screenshots.

## Coordination Rules

- Symphony is the default cooperation spine for DearMe work from 2026-05-10
  forward. Use Linear team `DEA` and `.symphony/WORKFLOW.md` for active worker
  lanes.
- The main DearMe checkout is the coordinator/integration surface. Use it to
  update this ledger and `BUILD-STATE.md`, integrate reviewed worker slices,
  and verify the product branch.
- Worker tickets must cite donor paths used, adapted, and rejected.
- Workers must start from the Symphony-selected source branch/workspace, not a
  stale DM-001/DM-103 brief or an old local worker branch.
- Product-code workers should use isolated Symphony workspaces. Create ad hoc
  local worktrees only when Symphony is blocked or the task explicitly needs a
  local integration lane.
- Do not expose Paperclip, OpenClaw, OK Partner, provider, adapter, model,
  GraphQL, Relay, MCP, setup payload, control-plane, workflow-builder,
  issue/document/work-product, or agent-runtime terms in customer-facing
  DearMe UI.

## Pending Reuse Roadmap (DM-S01, DM-138 - DM-159)

Source of truth: `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`. Do not branch
ticket numbers from anywhere else. Ordering follows the sprint plan in that
doc.

### Physical Port Manifest — Sprint 0 seed corpus (landed 2026-05-09)

To unblock DM-138 / DM-139 / DM-140 / DM-141 / DM-145 / DM-148 without
forcing each ticket to re-derive Polsia/Naive mechanics, the seed corpus
is now physically present in the repo. Ticket implementations should
`import` from these locations rather than restating the rules in a new
plugin's prompt or service code.

Package: `packages/plugins/dearme-agent-prompts/` (`@paperclipai/dearme-agent-prompts`)

State machines (typed constants, drop-in for plugin services):

| File | Used by ticket | What it defines |
|---|---|---|
| `state-machines/opportunity-state.ts` | DM-141 | 8-state opportunity lifecycle + forward-only transition guard + `OPPORTUNITY_KINDS` |
| `state-machines/meta-ads.ts` | DM-148 | 5-state ad error machine + 4-tier performance rules + `AD_LEARNING_PHASE_DAYS` |
| `state-machines/budget-tier.ts` | DM-148 | 3 daily-budget tiers (`starter`/`growth`/`scale`) + `pickBudgetTier()` |
| `state-machines/mood-face-library.ts` | DM-138/DM-139 | 16-face curated mood library + `getMoodFace()` |
| `state-machines/model-routing.ts` | DM-143/DM-145 | complexity 1-10 → fast/balanced/deep model rows + `pickModelForComplexity()` |
| `state-machines/sse-events.ts` | DM-138/DM-139/DM-140 | 7 SSE event-type names, dashboard action subtypes, `MoodUpdatePayload` |
| `state-machines/dearme-cycle.ts` | DM-142 | Six-hour growth-cycle managed routine seed + issue renderer |

Prompts (12 production-seeded prompts; plugins extend or adapt them with
company-, voice-, task-, and DearMe boundary context):

| File | Source chars | Used by ticket | What it captures |
|---|---|---|---|
| `prompts/chief-of-staff.ts` | 5,021 | DM-139 | 4-step MONITOR→REVIEW→QUEUE→REPORT loop, "queue ≥ 3" rule, Day-1 WHY anchor, complexity 1-10 routing, tag selection table |
| `prompts/reporting.ts` | 1,821 | DM-139 | 3-tool ordered call (`send_personalized_company_update` → `send_inbox_message` → `create_report`), strict email format, <200-word cap |
| `prompts/content-producer.ts` | 1,994 | DM-140 / DEA-7 | Adapted into DearMe's private content-draft role: reads Brand OS, voice profile, reports, and channels; stages draft packets with Voice Gate and approval boundary; never publishes, sends, schedules, connects accounts, spends, or deploys |
| `prompts/opportunity-hunter.ts` | 1,589 | DM-141 | 4-step daily workflow, lead state machine (`pending → contacted → replied → responded → meeting → dead`), Hunter.io verify, 50-125 word emails, 5-day follow-up |
| `prompts/brand-site-builder.ts` | 3,857 | DM-147 | web-only constraint, Render 512MB cap, push-after-every-change rule, `.claude/skills/` registry, JS-only forecasting, C1 first-build standards |
| `prompts/ads-manager.ts` | 17,470 | DM-148 | 5 tools, "0-active verify before create" CRITICAL rule, "memory is hint" doctrine, 7-day learning phase, 4 perf tiers, 5 error states, Sora 2 UGC template, full Meta policy guardrails, moderation/rate-limit/partial-upload recovery flows |
| `prompts/research-agent.ts` | 1,013 | new role | Save-as-deliverable rule, Executive-Summary format |
| `prompts/audience-care.ts` | 1,530 | new role | Plain-text emails, length-matching rule, in/out portfolio escalation matrix |
| `prompts/data-analyst.ts` | 1,178 | new role | Schema-first query rule, NULL handling, correlation/causation discipline |
| `prompts/health-monitor.ts` | 4,578 | new role | Snapshot-not-decision rule, Day 1 502-tolerance, dedup-against-backlog rule, snapshot template |
| `prompts/chat.ts` | 4,365 | new role | Push-back-on-vague-tasks, `find_best_agent` routing, platform-tenant security boundary, recurring-task management, bug-vs-feature classification |
| `prompts/browser-agent.ts` | 3,263 | new role | Site-tier system (1 / 1.5 / 2 / 3), tier blockers, persistent-login flow vs Sapiom flow, "stay on one toolset" rule |

Total: roughly 50,679 chars of production-seeded runtime instructions. Most
remain verbatim mechanical brand substitutions (`Polsia` → `DearMe`,
`polsia.com`/`polsia.app` → `dearme.app`, `polsia_*` → `dearme_*`);
`content-producer` is now intentionally adapted to DearMe's private,
approval-gated draft boundary.

Templates (renderable seeds for outbound and ad creative):

| File | Used by ticket | What it provides |
|---|---|---|
| `templates/sora-ugc-video.ts` | DM-148 | UGC selfie video prompt template + `renderSoraUgcVideoPrompt()` |
| `templates/outbound-5-touch.ts` | DM-156 / DM-141 | 5-touch sequence (day 1/3/6/10/14), per-touch intent + don't list |

Schema slice landed for DM-141:

| File | Migration | Notes |
|---|---|---|
| `packages/db/src/schema/opportunities.ts` | not yet generated (DM-141 owns) | Drizzle table + types + indexes (`company_state`, `company_kind`, unique `company_contact_email`) |

### Tri-Substrate Runtime — server-side wiring of voice-gate / approvals / channel-connections / work-loop / SSE / outbound-tool wrapper (NEW 2026-05-09, DM-S07)

DM-S06 shipped the typed contracts. DM-S07 wires them into the running cloud as 6 dependency-injected services in `server/src/services/`. The lynchpin is `dearme-outbound-tool-wrapper.ts::callOutbound` — one function that runs every outbound tool through the same 5-step pipeline (voice-gate → approval → OAuth lookup → dispatch → audit). This is the **proof of life** that the tri-substrate contract actually composes; per-channel impls now plug into a single typed dispatch slot.

| File | Used by | What it defines |
|---|---|---|
| `server/src/services/dearme-sse-bus.ts` | DM-S07 / DM-179 | Process-local typed `EventEmitter` keyed on `companyId`. Cross-tenant isolation enforced on every emit. Listener throws are swallowed and logged. Singleton + test-only setter. Backs the DearMe live workbench HTTP stream. |
| `server/src/routes/dearme.ts` | DM-179 | `GET /api/dearme/companies/:companyId/events` enforces company access, emits a `sync` workbench snapshot, then streams scoped `dearme-sse-bus` events as SSE frames. |
| `server/src/services/dearme-channel-connections.ts` | DM-S07 / DM-173A / DM-175 | Drizzle service over `channel_connections`. `getActive(companyId, userId, channel)`, `markUsed(id)`, `markNeedsReauth(id, error)`, `upsertActive(input)`. Encrypted blob is opaque here; per-channel dispatch code decrypts on dispatch. |
| `server/src/services/dearme-x-oauth-connection.ts` | DEA-51 / DM-173B | Config-gated X OAuth start + PKCE callback exchange service. Generates authorize URLs, keeps code verifier server-side, exchanges callback codes for tokens, loads the X profile, encrypts credentials, and returns the active `x` connection payload for the shared route/persistence seam. Accepts both the `DEARME_X_OAUTH_*` env names and the shorter `DEARME_X_*` aliases used by worker tickets, while constraining browser return URLs to the configured DearMe callback origin. |
| `server/src/services/dearme-channel-credential.ts` | DM-172B / DM-174 / DM-176A | Shared secret-provider envelope resolver for per-channel dispatchers. Keeps `channel_connections.encryptedCredential` opaque to the generic channel service and resolves local-encrypted material only inside the tool-specific dispatch boundary; external secret providers remain fail-closed for this DearMe channel path until explicitly enabled. |
| `server/src/services/dearme-x-post-dispatch.ts` | DEA-52 / DM-172B | Default approved `post_x` dispatcher. Resolves the opaque X credential through the server secret-provider registry, validates provider/access token/expiry/`tweet.write`, validates the tweet payload, calls X API v2 `POST /2/tweets`, maps delivered ids to `https://x.com/i/web/status/*`, and returns provider auth failures as wrapper reauth errors without exposing access tokens. |
| `server/src/services/dearme-linkedin-dm-dispatch.ts` | DM-176A | Optional approved `send_linkedin_dm` dispatcher. Resolves the opaque LinkedIn channel credential through the server secret-provider registry, validates a partner/provider credential with `send_dm` capability, validates recipient/body/subject bounds, calls a configured partner messages endpoint with the wrapper idempotency key, and returns provider auth failures as wrapper reauth errors without exposing tokens. Browser automation and guessed private APIs are intentionally out of scope. |
| `server/src/services/dearme-linkedin-dm-dispatch-config.ts` | DM-176B | Env bridge for default approved `send_linkedin_dm` dispatch. It maps `DEARME_LINKEDIN_DM_MESSAGES_URL` and partner endpoint aliases into dispatcher config so the direct path is only registered when operator config exists. |
| `server/src/services/dearme-send-email-dispatch.ts` | DM-174 | Default approved `send_email` dispatcher for the `resend` channel. Resolves the opaque Resend credential through the server secret-provider registry, validates provider/API key/from email/expiry and plain-text email payload shape, calls Resend `POST /emails` with the wrapper idempotency key, maps delivered email ids to receipts, and returns sanitized auth failures as wrapper reauth errors without exposing API keys or provider details in customer prompts. HTML is fail-closed until sanitizer support lands. `ses` remains fail-closed until the binding can resolve an `ses` credential. |
| `server/src/services/dearme-deploy-site-dispatch.ts` | DM-177B/DM-177C | Default approved `deploy_site` dispatcher for the `dearme-cloud` channel. It keeps the existing approval/wrapper/audit path, validates lowercase safe handles and bounded artifact refs, rejects custom domains in this slice, emits stable idempotent preview receipts at `dearme.app/<handle>?preview=*`, and fails production deploys closed unless the DearMe-owned host is explicitly configured. |
| `server/src/services/dearme-deploy-site-dispatch-config.ts` | DM-177C | Env bridge for default approved `deploy_site` dispatch. It maps DearMe site host env into the dispatcher config so production receipts can be enabled by operator intent without reopening OpenClaw gateway fallback or custom-domain automation. |
| `server/src/services/dearme-meta-campaign-dispatch.ts` | DM-178 | Default approved `create_meta_campaign` dispatcher for the `meta_ads` channel. It keeps the existing spend approval/wrapper/audit path, resolves the opaque Meta ads credential through the shared secret-provider registry, requires `ads_management`, normalizes ad account ids, validates campaign refs/budget tier/learning window, creates a paused Meta campaign receipt, and returns provider auth failures as wrapper reauth errors without exposing tokens. |
| `server/src/services/dearme-meta-campaign-dispatch-config.ts` | DM-178B | Env bridge for default approved `create_meta_campaign` dispatch. It maps DearMe Meta Graph API base URL env into the dispatcher config so live smoke can target the intended Graph version/base without a customer-facing connector surface. |
| `server/src/services/dearme-voice-gate.ts` | DM-S07 / DM-170 | `dearMeVoiceGateService({ scorer? })`. Default scorer is the deterministic stub: 5 negative phrase rules (`ai_disclaimer`, `hype_word`, `stale_template`, `press_release_voice`, `punctuation_storm`), per-artifact length floor/ceiling, `concrete_evidence` reward. The DM-170 route now exposes this scorer; the real fingerprint model lands by replacing `scorer`. |
| `server/src/routes/dearme-voice-gate.ts` | DM-170 | Root `POST /v1/voice/score` route over the shared proxy contract. Requires `Authorization: Bearer dm_sk_*`, validates `VoiceGateScoreRequest`, and returns `VoiceGateScoreResponse` from the existing cloud-side voice gate service. |
| `server/src/services/dearme-work-loop.ts` | DM-S07 / DM-179 / DM-180 | `transition({ companyId, issueId, from, to, role, reason, openclawSessionId?, agentId? })` — validates via `canTransitionWorkLoop`, mirrors the new 8-state into `issues.status`, writes `activity_log`, emits `work_loop_transition` SSE. Plus `legalNext(from)`. |
| `server/src/services/dearme-approval-resolver.ts` | DM-S07 / DM-180 | Wraps the pure `resolveApproval` with two Drizzle reads (past approved count for the (channel, gate) pair, today's `cost_events` total) + writes the decision into `approvals`/`issue_approvals` with user/agent attribution + emits `approval_pending` or `approval_resolved`. DM-180 exposes this through the company-scoped DearMe route after normalizing issue identifiers. Stores gate in `approvals.type = "dearme.gate.<gate>"`. |
| `server/src/services/dearme-outbound-tool-wrapper.ts` | DM-S07 / DM-172 / DM-174 / DM-176 / DM-177 / DM-178 | **The lynchpin.** `callOutbound(input)` runs: voice-gate (if required) → approval-resolver → channel_connections lookup → injected per-tool `ChannelDispatch` → audit (`cost_events` insert if paid + `channel_action_fired` SSE + work-loop `deliver → audit` transition). Returns one of `{delivered, pending, needs_oauth, rejected, errored}` matching `OutboundToolResult`. Per-channel impls (DM-172/174/176/177/178) plug in as `ChannelDispatch` entries, never touching the wrapper. The wrapper also derives provider idempotency keys from tool + approval/run + payload hash and keeps customer-facing connection prompts on product labels such as "email". |
| `server/src/services/dearme-outbound-tool-wrapper.test.ts` | DM-S07 | 15 tests covering happy path, rejected gate (work-loop `gate → review`), pending (no dispatch), missing OAuth, auth-error → sanitized `markNeedsReauth`, stable/different idempotency keys, customer-safe email connection labels, missing voice-gate input, voice-gate-skipped tools (`deploy_site`), `cost_events` write on `paid=true`, missing dispatcher, and approved launch delivery edges. |
| `server/src/services/dearme-x-post-dispatch.test.ts` | DEA-52 / DM-172B | Tests prove local encrypted credential resolution, successful X request construction, delivered id/url mapping, provider auth failure → reauth without token exposure, expired/underscoped credentials fail before posting, invalid or malformed tweet payloads fail before credential resolution, and network failures stay inside the dispatch result. |
| `server/src/services/dearme-linkedin-dm-dispatch.test.ts` | DM-176A | Tests prove local encrypted credential resolution, successful partner request construction, missing endpoint fail-closed without secret resolution, provider auth failure → reauth without token exposure, expired/missing-capability credentials fail before sending, malformed DM payloads fail before credential resolution, and incomplete partner responses fail closed. |
| `server/src/services/dearme-linkedin-dm-dispatch-config.test.ts` | DM-176B | Tests prove absent LinkedIn partner config stays null, the preferred DearMe endpoint env is trimmed, and partner/legacy endpoint aliases map to the same dispatcher config. |
| `server/src/services/dearme-send-email-dispatch.test.ts` | DM-174 | Tests prove local encrypted credential resolution, successful Resend request construction, auth failure → reauth without key/status-text exposure, unsupported SES/malformed/HTML payloads rejected before credential resolution, expired/incomplete credentials fail before sending, incomplete provider responses fail closed, and network failures stay inside a sanitized dispatch result. |
| `server/src/services/dearme-deploy-site-dispatch.test.ts` | DM-177B/DM-177C | Tests prove stable preview deploy receipts, customer-safe payload validation, custom-domain rejection, production fail-closed behavior by default, explicit production opt-in behavior, and binding mismatch errors. |
| `server/src/services/dearme-deploy-site-dispatch-config.test.ts` | DM-177C | Tests prove absent config stays null, host env aliases are trimmed, production opt-in is explicit, the default DearMe host can be enabled by flag, and false/malformed flags keep production disabled. |
| `server/src/services/dearme-meta-campaign-dispatch.test.ts` | DM-178 | Tests prove local encrypted credential resolution, successful Meta campaign request construction, non-HTTPS Graph API URLs fail before credential resolution, auth failure → reauth without token/provider-message exposure, expired/underscoped/malformed credentials fail before sending, malformed campaign payloads fail before credential resolution, incomplete provider responses fail closed, and network failures stay inside the dispatch result. |
| `server/src/services/dearme-meta-campaign-dispatch-config.test.ts` | DM-178B | Tests prove absent Meta Graph config stays null, the preferred DearMe Graph env is trimmed, and smoke-tooling aliases map to the same dispatcher config. |
| `server/src/services/dearme-voice-gate.test.ts` | DM-S07 | 6 tests pinning the stub scorer's deterministic rules. |
| `server/src/services/dearme-sse-bus.test.ts` | DM-S07 | 5 tests on cross-tenant isolation, listener fault containment, missing-companyId guard, unsubscribe. |

After this slice, all five outbound tools (`post_x`, `send_email`,
`send_linkedin_dm`, `deploy_site`, and `create_meta_campaign`) use the same
small-file `ChannelDispatch` shape. Provider endpoint/base-url config is now
resolved at app startup and injected into the default approved launch handoff.
LinkedIn DM is still gated on a configured partner endpoint and credential;
Meta ads is gated on a real Meta OAuth/Marketing API credential smoke; no
browser automation or customer-visible connector surface was added.

```ts
const linkedInConfig = resolveDearMeLinkedInDmDispatchConfigFromEnv(env);
const metaConfig = resolveDearMeMetaCampaignDispatchConfigFromEnv(env);

const channelDispatch = {
  post_x: createDearMeXPostDispatch(),
  ...(linkedInConfig
    ? { send_linkedin_dm: createDearMeLinkedInDmDispatch(linkedInConfig) }
    : {}),
  send_email: createDearMeSendEmailDispatch(),
  deploy_site: createDearMeDeploySiteDispatch(siteConfig),
  create_meta_campaign: createDearMeMetaCampaignDispatch(metaConfig ?? {}),
};
```

Provider-config verification (2026-05-11):

```
pnpm exec vitest run server/src/services/dearme-linkedin-dm-dispatch-config.test.ts server/src/services/dearme-meta-campaign-dispatch-config.test.ts server/src/services/dearme-linkedin-dm-dispatch.test.ts server/src/services/dearme-meta-campaign-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts --maxWorkers=1   43/43 pass
pnpm --filter @paperclipai/server typecheck                                                                                                                                    pass
```

Verification (2026-05-09):

```
pnpm --filter @paperclipai/server typecheck                          pass
cd server && npx vitest run src/services/dearme-{sse-bus,voice-gate,outbound-tool-wrapper}.test.ts   20/20 pass
pnpm --filter @paperclipai/dearme-agent-prompts test                 25/25 pass
pnpm --filter @paperclipai/dearme-ai-proxy test                       6/6  pass
pnpm --filter @paperclipai/dearme-openclaw test                      16/16 pass
```

Total tests after DM-S07: **67 green**, up from 47 pre-DM-S07.

### Tri-Substrate Integration — work-loop / approvals / outbound tools / channel_connections / voice-gate (NEW 2026-05-09, DM-S06)

DearMe is the integration of three substrates: **OpenClaw** (edge runtime — channels / voice / sandbox / cron), **Naive/Paperclip** (cloud durable state — issues / heartbeats / approvals / cost ledger), **Polsia** (verbatim choreography — 12 prompts / 6 fns / 4 gates / 5-stage cycle). DM-S06 ships the glue artifacts that make the three actually compose.

| File | Used by | What it defines |
|---|---|---|
| `packages/plugins/dearme-agent-prompts/src/state-machines/work-loop.ts` | DM-S06 / DM-179 / DM-180 | 8-state unified work loop (`intake → triage → work → gate → deliver → audit → review → archive`) with explicit per-state substrate bindings (`WORK_LOOP_SUBSTRATE_BINDINGS`). Maps to Polsia 5-stage cycle via `WORK_LOOP_TO_CYCLE_STAGE`. Pure transition validator (`canTransitionWorkLoop`). |
| `packages/plugins/dearme-agent-prompts/src/state-machines/approval-gates.ts` | DM-S06 / DM-180 | 4 gates (`publish` / `send` / `deploy` / `spend`) with `APPROVAL_GATE_CONFIG` (auto-approve threshold, voice-gate-required flag, default TTL). Pure resolver `resolveApproval(req, ctx)` that hard-rejects spend over cap, hard-rejects below voice floor, auto-approves after configured threshold. |
| `packages/plugins/dearme-agent-prompts/src/state-machines/sse-events.ts` | DM-S06 / DM-179 | Upgraded from 7 v1 events → 15 events covering all three substrates: v1 baseline + `work_loop_transition` + 4 approval/voice events + `channel_action_fired` + `cost_recorded` + 2 OpenClaw passthroughs. Every event carries cross-substrate scope (`companyId/issueId/executionId/agentId/openclawSessionId/workLoopState`). |
| `packages/plugins/dearme-agent-prompts/src/registry.ts` | DM-S06 | `DEARME_ROLE_REGISTRY` extended: each entry now declares `substrate: { openclaw, naive, polsia }`. New helper `getSubstrateDistribution()`. `validateRegistry()` checks all three substrate enums. |
| `packages/dearme-ai-proxy/src/voice-gate.ts` | DM-S06 / DM-170 | Voice-gate wire: `POST /v1/voice/score`, `VoiceGateScoreRequest`/`VoiceGateScoreResponse` types, 8 `VOICE_GATE_ARTIFACT_KINDS`, default floor 92, `buildVoiceGateUrl()` helper. |
| `packages/db/src/schema/channel_connections.ts` | DM-S06 / DM-175 | Per-user OAuth schema. 7 channels (`x` / `linkedin` / `resend` / `ses` / `meta_ads` / `buffer` / `stripe`), 5 statuses (`pending` / `active` / `needs_reauth` / `revoked` / `suspended`), encrypted credential blob, scopes, expiresAt, lastUsedAt, lastError. Unique on `(companyId, userId, channel, externalAccountId)`. |
| `packages/plugins/dearme-openclaw/src/tools/types.ts` | DM-S06 / DM-172 / DM-174 / DM-176 / DM-177 / DM-178 | 5 outbound tool TypeScript interfaces: `post_x` / `send_linkedin_dm` / `send_email` / `deploy_site` / `create_meta_campaign`. Each has typed input + delivered output + envelope (`OutboundToolEnvelope`) + 5-outcome result (`delivered` / `pending` / `needs_oauth` / `rejected` / `errored`). `DEARME_OUTBOUND_TOOL_BINDINGS` maps each to `(gate, channel, voiceGateRequired)`. |
| `docs/dearme/TRI-SUBSTRATE-ARCHITECTURE.md` | DM-S06 | New canonical doc. Layer-ownership matrix, work-loop, SSE bucket, approval gates, outbound tool contract, per-role substrate map, doctrine. **Add to canonical reading list.** |

This commit unblocks all the next-up tickets that wire each substrate to the others:

| Ticket | What it enables |
|---|---|
| DM-170 | Cloud `/v1/voice/score` endpoint — Express route is shipped over the deterministic scorer; trained fingerprint model and persisted key issuer remain |
| DM-171 | OpenClaw plugin install + onboarding bridge |
| DM-172 | `post_x` impl using the typed envelope. Server dispatcher shipped; live external smoke remains credential-dependent. |
| DM-173A | Per-user X OAuth callback persistence proof writing into `channel_connections`. |
| DM-173B | Approved X next-step fallback now returns a DearMe-owned `oauthStartUrl`; `GET /v1/channels/:companyId/x/start` starts the PKCE flow and stays 503 when OAuth config is absent, and the browser callback exchanges the X code, loads the profile, encrypts credentials, and writes an active `x` row when config is present. DM-172B consumes that active row for approved X posting. |
| DM-174 | `send_email` via Resend/SES (avoids Gmail CASA cost). Resend plain-text dispatcher is shipped on the canonical wrapper path; HTML and SES remain future work because HTML needs sanitizer support and the current `send_email` binding resolves `channel_connections.channel = "resend"`. |
| DM-176/177/178 | LinkedIn DM partner endpoint/credential live smoke / remaining deploy_site live host/custom-domain smoke / Meta OAuth-Marketing API live smoke |
| DM-179 | DearMe live workbench SSE route — shipped as `GET /api/dearme/companies/:companyId/events`; future work can add upstream OpenClaw passthrough events behind the same stream |
| DM-180 | **Shipped.** Approval resolver wire through `POST /api/dearme/companies/:companyId/approvals/resolve`, with issue normalization + `approvals`/`issue_approvals` attribution. ✅ |

Verification (2026-05-09):

```
pnpm --filter @paperclipai/dearme-agent-prompts exec vitest run     25/25 pass
pnpm --filter @paperclipai/dearme-ai-proxy exec vitest run           6/6  pass
pnpm --filter @paperclipai/dearme-openclaw exec vitest run          16/16 pass
pnpm --filter @paperclipai/dearme-openclaw exec tsc --noEmit         pass
pnpm --filter @paperclipai/db typecheck                              pass
```

Total tests after this slice: **47 green**, up from 31 pre-DM-S06.

### OpenClaw Plugin Scaffold — `@paperclipai/dearme-openclaw` (NEW 2026-05-09, DM-S05)

| File | Used by ticket | What it defines |
|---|---|---|
| `openclaw.plugin.json` | DM-S05 / DM-171 | OpenClaw plugin manifest. `id="dearme"`, configSchema (`apiKey: dm_sk_*`, `handle`, `defaults.{dailyLetterChannel,voiceGate.minScore,budget.dailyUsdCap}`), points OpenClaw at `./generated/skills`. |
| `src/skill-generator.ts` | DM-S05 | Pure function: `DEARME_ROLE_REGISTRY → SkillFile[]`. Emits 12 SKILL.md with YAML frontmatter (name, description, openclaw metadata, proxy tools, state machines, complexity, tier) and a body that embeds the verbatim production prompt and routing hints. |
| `src/bootstrap.ts` | DM-S05 / DM-138 / DM-183H | Templates for `AGENTS.md` (operating instructions encoding the 4 doctrine rules), `SOUL.md` (persona — never sycophantic, never AI-disclaimy), `IDENTITY.md` (team name, conversational lead), `USER.md` (stub forces onboarding ritual). Injected into OpenClaw workspace on first-run; current bootstrap language points workers at team routing instead of proxy/runtime phrasing. |
| `src/cli/generate-skills.ts` | DM-S05 | CLI: writes `generated/skills/dearme-<role>/SKILL.md` × 12 + `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md`. Run after registry edits. |
| `src/index.test.ts` | DM-S05 | 12 tests: 1 skill per registry entry, unique folders, well-formed YAML, **verbatim prompt embed** (asserts production strings like `"Rate limit:** 2/day"`, `280`, `"verify with Hunter.io"`, `"Under 200 words total"`), routing/tier/source-of-truth sections present, bootstrap files anchor the 4 doctrines. |
| `generated/skills/dearme-<role>/SKILL.md` × 12 | DM-S05 | Generator output, committed to git so registry edits show as a reviewable diff. What OpenClaw actually loads. |
| `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md` | DM-S05 / DM-171 | Generator output. Plugin install copies these into `~/.openclaw/workspace/`. |

This is the package that turns `DEARME_ROLE_REGISTRY` into a runnable OpenClaw plugin. **No prompt is duplicated** — every SKILL.md embeds the registry's `prompt` field by reference (string copy at generation time, not by paraphrase).

Ledger of what changed because of this package:

- `packages/plugins/dearme-agent-prompts/src/state-machines/budget-tier.ts` and `.../model-routing.ts` got `noUncheckedIndexedAccess`-safe fallbacks (no behavior change; type-system tightening required by the new package's stricter tsconfig).
- New canonical doc `docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md` captures the full layer-ownership contract.
- `INDEX.md` and `PRODUCT-ARCHITECTURE.md` updated to reflect OpenClaw as the substrate (architecture diagram redrawn; new §9.5).

Verification (2026-05-09):

```
pnpm --filter @paperclipai/dearme-openclaw exec tsc --noEmit             pass
pnpm --filter @paperclipai/dearme-openclaw exec vitest run               12/12 pass
pnpm --filter @paperclipai/dearme-agent-prompts exec vitest run          21/21 pass  (regression check)
```

Next-up tickets unlocked by this scaffold:

| Ticket | Slice | Owner package |
|---|---|---|
| DM-170 | DearMe cloud `/v1/voice/score` endpoint (route shipped; trained fingerprint scoring next) | server |
| DM-171 | OpenClaw plugin install flow + onboarding bridge (paste device pairing code at `dearme.app/onboard`) | server + dearme-openclaw |
| DM-172 | `post_x` outbound tool (X publish), voice-gate-blocked below threshold | dearme-openclaw |
| DM-173A/DM-173B | Per-user X OAuth start + callback exchange (just-in-time, on first publish) | server (`channel_connections`, X OAuth service) |
| DM-174 | `send_email` outbound tool via Resend/SES (Resend shipped; SES needs dynamic channel binding) | server + dearme-openclaw |
| DM-175 | `channel_connections` Drizzle table + encrypted token storage | packages/db |

### AI Proxy Contract Package — `@paperclipai/dearme-ai-proxy` (NEW 2026-05-09)

| File | Used by ticket | What it defines |
|---|---|---|
| `src/functions.ts` | DM-145 | 6 production-verified OpenAI native function definitions (`create_task`, `search_memory`, `get_company_documents`, `create_report`, `web_search`, `content_generate`) ported verbatim from research-captured `buildToolDefinitions()` |
| `src/contract.ts` | DM-145 / DM-143 / DM-155 | `dm_sk_*` API key prefix, dual-protocol cost-attribution headers (`task` for OpenAI, `X-Subscription-ID` for Anthropic), `agent/run` endpoint shape, `CostLedgerEvent`, `AgentRunRequest`/`AgentRunResponse` types |
| `src/model-routing.ts` | DM-143A | Proxy-owned export surface for the canonical prompt-package complexity `1-10` model routing table and helpers; no duplicated thresholds |

The package still only owns the contract. The HTTP server implementation now
mounts the proxy skeleton under the same base path; later DM-145 slices still
own durable key issuance/revocation, stronger tenant binding, live provider
execution, and the `agent/run` runtime.

### DM-145A Runtime Surface — `server/src/routes/dearme-ai-proxy.ts`

| File | Used by ticket | What it defines |
|---|---|---|
| `server/src/routes/dearme-ai-proxy.ts` | DM-145A / DM-145E | `POST /api/proxy/ai/v1/chat/completions`, `POST /api/proxy/ai/v1/messages`, and `POST /api/proxy/ai/agent/run` mounted under the shared contract base path, `dm_sk_*` auth at the route boundary, shared routing through `resolveDearMeProxyModelRouting`, prompt-cache normalization through `normalizeDearMeProxyUsage` / `buildDearMeCostLedgerEvent`, and `cost_events` writes into the existing schema shape |
| `server/src/app.ts` | DM-145A | Mounts the DearMe proxy router at `DM_PROXY_BASE_URL_DEFAULT` so the proxy routes are reachable without changing the voice-gate mount |

The mounted skeleton fails closed with `503` unless provider execution is
injected, so the product path cannot silently return synthetic proxy output.
All three proxy surfaces share the same key lookup, company/agent resolution,
and ledger writer. Do not add a parallel auth store or a second proxy cost
path.

DM-145F extends the same injected executor seam with a small fetch transport
mode for OpenAI-compatible `/chat/completions` and Anthropic-compatible
`/messages` responses. Keep later runtime work on this seam and preserve the
existing fail-closed behavior when the endpoint or key is absent.

Latest focused verification (2026-05-10):

```
pnpm --filter @paperclipai/dearme-ai-proxy test -- src/index.test.ts 8/8 pass
pnpm --filter @paperclipai/dearme-ai-proxy typecheck                  pass
```

Lineage and compliance posture documented per-package in README and
governed by `REBRAND-AND-PROVENANCE.md` (which applies to customer-facing
UI, not server-side runtime artifacts the user never sees).



### Sprint 0 - Foundation executable

| Ticket | Slice | Donor mechanism | Path | Status |
|---|---|---|---|---|
| DM-S01 | Mass-assignment fix on `PATCH /api/companies/:id` | Naive security finding | `packages/shared/src/validators/company.ts`, `server/src/routes/companies.ts` | ✅ done (schema split + board-only governance route + tests) |
| DM-142 | Six-hour DearMe cycle routine seed + approval-time provisioning | Polsia cycle every_6_hours | `packages/plugins/dearme-agent-prompts/src/state-machines/dearme-cycle.ts`, `server/src/services/dearme-brand-blueprint-apply.ts` | ✅ done (seed + routine/trigger provisioning + tests) |
| DM-146 | Mount DearMe build skills into execution workspaces | Polsia per-execution `.claude/skills/` | `server/src/services/heartbeat.ts`, adapter skill injection services | ✅ done (runtime skills projected into execution-run adapter config + focused test) |
| DM-154 | Configure CEO/direct + worker/remote role templates with 2h/8h heartbeat | Naive two-tier agent split | `packages/shared/src/validators/dearme.ts`, `server/src/services/dearme-brand-blueprint-apply.ts` | ✅ done (Brand OS team template now provisions direct/local chief-of-staff on 2h cadence plus worker/remote teammates on 8h cadence) |
| DM-183D | Customer-safe workbench projection for donor/substrate output | Polsia simple customer surface over private execution machinery | `server/src/services/dearme-workbench.ts`, `server/src/__tests__/dearme-workbench.test.ts` | ✅ done (work products from OpenClaw/Symphony/Paperclip/provider/runtime/model logs are projected into DearMe language before the workbench response) |

### Sprint 1 - Aha moment

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-138 | First-run personal proof sequence (DM-138A start bridge, DM-138B proof-sequence contract, DM-138C proof hydration, DM-138D proof-output write, and DM-138E live browser/API smoke shipped locally) | Polsia 5-min onboarding shock | `server/src/routes/dearme.ts`, DearMe worker/plugin layer |
| DM-139 | Autonomous Reporting plugin (queue-always-non-empty, plain-prose updates, next-step driver) | Polsia CEO 4-step prompt | `packages/plugins/dearme-reporting/` |
| DM-140 | Voice Gate + Content Producer plugin (voice-match score, attribution link rule, rate cap) | Polsia Twitter agent rules | `packages/plugins/dearme-content-producer/` |
| DM-183AQ | Private source link traceability on current Voice & Memory contract | DM-016 source-reference intent, adapted without stale `referenceUrl` schema replay | `ui/src/pages/DearMeOnboarding.tsx` |
| DM-183AR | Work Ready inline review actions plus review receipts | DM-093/DM-097 in-place review pattern, current output handoff review-loop receipts | `ui/src/pages/DearMeOnboarding.tsx`, `server/src/services/dearme-output-handoff.ts` |
| DM-183AS-A | Review receipt API/cache proof while output refresh is pending | Existing output continuation response, shared DearMe output schema, React Query output cache, focused prepared-work review controls | `ui/src/pages/DearMeOnboarding.test.tsx` |

### Sprint 2 - Work keeps moving

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-141 | Opportunity Hunter plugin + opportunities schema + 6-state machine | Polsia Cold Outreach + Naive 5-touch deliverable | new `packages/db/src/schema/opportunities.ts`, `packages/plugins/dearme-opportunity-hunter/` |
| DM-183BV | Work-event metadata on the current workStream | DM-087/DM-097 work-event contract, adapted without stale branch replay | `packages/shared/src/validators/dearme.ts`, `server/src/services/dearme-workbench.ts` |
| DM-149 | Emergency pause intent in chief-of-staff messaging | Polsia `pause_ads()` highest-priority pattern | `server/src/services/dearme-workbench.ts` |
| DM-153 | Default approval score on silence + private review feedback wiring | Polsia score-7 default | `packages/shared/src/validators/dearme.ts`, `server/src/services/dearme-output-handoff.ts`, `server/src/routes/dearme.ts` |

### Sprint 3 - Moat and economics

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-143 | Complexity-based model routing in proxy + agent metadata | Polsia complexity 1-3 / 4-6 / 7-10 routing | `packages/dearme-ai-proxy/src/model-routing.ts` |
| DM-145 | AI proxy: OpenAI/Anthropic-compatible endpoints + `dm_sk_` keys + cost-ledger fields (`task` + `X-Subscription-ID`) | Polsia dual-protocol proxy | new `packages/dearme-ai-proxy/` |
| DM-155 | Anthropic prompt-cache economics (target ~90% cache-read ratio) | Naive cache utilization measurement | proxy cost/cache layer |
| DM-144 | Lock MCP set to the proven minimum (audit + remove unused) | Polsia 9-of-22 active MCP | `packages/mcp-server/*`, tool registry |

### Sprint 4 - Growth loops

| Ticket | Slice | Donor mechanism | Path |
|---|---|---|---|
| DM-147 | Brand Site Builder plugin with constraint prompt (web-only/single-Express/512MB/push-every-change) | Polsia Engineering agent constraints | `packages/plugins/dearme-brand-site-builder/` |
| DM-148 | Meta Ads/autothrottle plugin (budget tiers, 5-error states, UGC video pipeline) | Polsia Meta Ads Manager | `packages/plugins/dearme-meta-ads/` |
| DM-150 | Best-agent cross-tenant routing service | Polsia `find_best_agent` | `server/src/services/dearme-agent-routing.ts` |
| DM-151 | Live proof feed (public + private sections; no substrate terms) | Polsia `/live` 13-section feed | new `server/src/routes/live.ts` + DearMe live page |
| DM-152 | Post-build brand-similarity review (async; remediation via issues, not pre-build block) | Polsia `trademark_post_build_review` | `packages/plugins/dearme-reporting/` |
| DM-156 | Five-touch outbound sequence template wired into Opportunity Hunter | Naive deliverable example | opportunity hunter templates |

### DearMe-original tickets without donor mechanism

These have no donor mechanism — they are DearMe-original capabilities that
sit alongside the ports above.

| Ticket | Slice | Path |
|---|---|---|
| DM-157 | Audience Graph plugin (cross-platform follower index, overlap ranking, DM-target list) | new `packages/plugins/dearme-audience-graph/` |
| DM-158 | Voice Profile plugin (extraction, signature/forbidden phrases, Voice Gate hook) | new `packages/plugins/dearme-voice-profile/` |
| DM-159 | Per-customer attribution beacon (footer auto-injection on personal-brand sites) | new `packages/dearme-beacon/` |

### Out of scope (explicitly rejected)

| Item | Why we skip |
|---|---|
| Per-tenant Fly.io VM | Cost overrun at idle. Reuse `execution-workspaces` instead. |
| Worker recursive sub-spawn | Too much complexity for personal-brand surface. |
| `setTimeout` self-rescheduling | Already supplanted by `heartbeat_runs`. Don't reintroduce fragility. |
| Parallel app-factory templates | DearMe ships personal-brand sites only; no generic generator. |
| Public marketing claims of compliance we have not earned | FTC unfair-claim risk. Earn -> claim. |

## Not Complete Yet

DearMe is not release-ready just because these reuse decisions are documented.
DM-138A moved the first-cycle CTA from read-only proof into a durable private
start path, DM-138B made the proof order a shared response contract, DM-138C
hydrates that contract from prepared documents and work products, and DM-138D
now writes those proof outputs during first-cycle start through the existing
issue/document handoff. DM-138E live-smoked the same path, fixed stale
cancelled output history so current proof issues project as `ready_for_review`,
and kept the customer surface free of donor/runtime vocabulary.

DM-S01, DM-138A-E, DM-139 / DM-140, DEA-7, DEA-8, DEA-9, DEA-11, DEA-12, and
DEA-13 have landed, been recovered, or been verified on the current
coordination head. The next non-negotiable slice should build on the existing
first-cycle/private-handoff proof instead of adding another customer-facing
runtime contract.
