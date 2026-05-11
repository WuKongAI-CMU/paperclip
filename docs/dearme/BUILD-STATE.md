# DearMe Build State

Date: 2026-05-11

## Symphony Dirty-Handoff File Count Cleanup - 2026-05-11

Product/architecture slice:

- `pnpm dearme:worktrees -- --summary-only --skip-dirty --handoffs` now derives
  dirty handoff file counts from the handoff `status` list when a dirty summary
  does not include `changedFiles`.
- This keeps active dirty Symphony lanes visible while avoiding the misleading
  `files=0` display for a dirty patch handoff that actually has status entries.
  The coordinator still treats latest dirty handoffs as active lane signals and
  does not replay or close them automatically.
- Latest handoff lines now also include compact `changes=` file names, so the
  coordinator can spot whether an active lane overlaps the current slice
  without opening the worker workspace or manually scanning handoff JSON.

Verification:

- `pnpm test:dearme-worktrees`
- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs`

## OpenClaw Readiness Noise Cleanup - 2026-05-11

Product/architecture slice:

- Human `pnpm dearme:provider-smoke -- --check --target openclaw` output now
  prints shared OpenClaw gateway blockers once, then leaves Telegram and
  iMessage rows to show only their per-channel recipient/body gaps.
- Readiness JSON and provider execution behavior stay unchanged. This is an
  operator-surface cleanup so the next real action remains obvious: add the
  shared gateway URL/auth once, then fill the two message smoke payloads.

Verification:

- `pnpm test:dearme-provider-smoke`
- `pnpm --silent dearme:provider-smoke -- --check --target openclaw`
- `pnpm --silent dearme:provider-smoke -- --check --target openclaw --json`
- `pnpm typecheck`

## OpenClaw Message Provider-Smoke Group - 2026-05-11

Product/architecture slice:

- `pnpm dearme:provider-smoke` now accepts `--target openclaw`,
  `--target openclaw_messages`, and `gateway-messages` as one shared OpenClaw
  gateway proof lane for Telegram plus iMessage/SMS.
- The OpenClaw message group keeps setup scoped to the common gateway
  URL/token/auth and the two message recipient/body variables; it does not pull
  LinkedIn, Meta, or deploy-site setup into the same operator checklist.
- Group readiness preserves the existing per-target result shape while printing
  one scoped env-template command, one scoped readiness recheck, and the two
  guarded live send commands.

Verification:

- `pnpm test:dearme-provider-smoke`
- `pnpm --silent dearme:provider-smoke -- --check --target openclaw`
- `pnpm --silent dearme:provider-smoke -- --print-env-template --target openclaw`
- `pnpm --silent dearme:provider-smoke -- --check --target openclaw --json`
- `pnpm typecheck`

## Provider Smoke Operator Next-Step Cleanup - 2026-05-11

Product/architecture slice:

- `pnpm dearme:provider-smoke -- --check` now turns blocked live provider
  readiness into concrete local operator commands: create the ignored
  `.dearme-provider-smoke.env`, re-run readiness with `--env-file`, and run the
  blocked target smoke command with the required live guard where needed.
- Targeted readiness checks such as `--check --target telegram` now narrow both
  the readiness output and the printed next command to the requested provider.
- Targeted template generation such as `--print-env-template --target telegram`
  now prints only the shared live guard plus the OpenClaw/Telegram variables
  needed for that proof.
- Kept JSON readiness stable and secret-free so automation can continue reading
  the original readiness shape while human operators get direct next steps.
- This keeps the remaining product proof gap bounded to real live provider
  credentials and host proof instead of another documentation lookup.

Verification:

- `pnpm test:dearme-provider-smoke` passed with 19 node:test tests.
- `pnpm --silent dearme:provider-smoke -- --check` prints the next setup
  commands for production site, LinkedIn, Telegram, iMessage, and Meta smokes.
- `pnpm --silent dearme:provider-smoke -- --check --target telegram` narrows the
  readiness and next command to the Telegram OpenClaw gateway smoke.
- `pnpm --silent dearme:provider-smoke -- --print-env-template --target telegram`
  prints the Telegram-only local env template.
- `pnpm --silent dearme:provider-smoke -- --check --json` still emits the
  readiness payload without operator commands or secret values.

## Symphony Historical Queue Default-Read Cleanup - 2026-05-11

Product/architecture slice:

- Removed the 2026-05-08 operating-loop plan from the default Symphony worker
  read list. Workers now start from the assigned Linear `DEA-*` issue, the
  bootstrap worktree/handoff evidence, and the current DearMe canonical docs.
- Kept the operating-loop plan available only for Symphony lifecycle,
  coordinator workflow, or handoff-rule changes, and marked its queue section
  as a historical snapshot instead of a current queue.
- This preserves the Goal-thread vs. worker split while reducing the chance
  that future workers replay old `DM-*` queue entries or old worktree
  integration plans.

Verification:

- Stale current-queue/current-entrypoint wording search returned no matches in
  the touched coordination files.
- `git diff --check -- .symphony/WORKFLOW.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs`
  passed with `not_in_current: 0` and latest-by-issue
  `dirty_patch_handoff: 0`.
- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs --ticket DEA-60`
  passed with the active Symphony lane still recorded as already absorbed in
  current head.

## Coordinator Handoff Signal Cleanup - 2026-05-11

Product/architecture slice:

- Updated the DearMe worktree/Symphony status summary to separate all historical
  handoff artifacts from the latest handoff per issue. This keeps older
  intermediate `dirty_patch_handoff` records from reading like active unmerged
  work when a later committed handoff already superseded them.
- Tightened canonical doc authority in the provenance and positioning docs:
  `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`, `INDEX.md`,
  `TRI-SUBSTRATE-ARCHITECTURE.md`, `OPENCLAW-INTEGRATION-ARCHITECTURE.md`, and
  `PRODUCT-ARCHITECTURE.md` are the current implementation sources; older
  `POLSIA-NAIVE-REUSE-PLAN.md` and `INTEGRATED-ARCHITECTURE.md` remain
  reference/history.

Verification:

- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs`
  reports `not_in_current: 0`. Historical handoffs still include 8
  `dirty_patch_handoff` artifacts, but latest-by-issue dirty handoffs are now
  reported separately.

## Symphony Prompt Entrypoint Alignment - 2026-05-11

Product/architecture slice:

- Aligned the live Symphony worker prompt with the same current DearMe doc
  chain as `AGENTS.md`, adding `INDEX.md`, tri-substrate architecture, OpenClaw
  integration, and the code-reuse master plan to the initial coordination
  surface.
- Clarified that `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` is
  lifecycle/process context, not the active ticket queue. Current work comes
  from the assigned Linear `DEA-*` issue and bootstrap worktree/handoff
  evidence.
- Updated the operating-loop plan's stale 2026-05-09 queue to point workers at
  Linear/Symphony, the current canonical docs, and the existing provider-smoke
  harness for the next live-proof gap instead of replaying historical DM
  queue entries.

Verification:

- `git diff --check -- .symphony/WORKFLOW.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## Coordination Entrypoint Cleanup - 2026-05-11

Product/architecture slice:

- Aligned `AGENTS.md` with the current DearMe doc authority chain: workers now
  enter through `README.md`, `INDEX.md`, Symphony workflow, tri-substrate
  architecture, OpenClaw integration, product architecture, the code-reuse
  master plan, reuse ledger, provenance, and targeted build-state reads.
- Removed superseded docs from the default must-read path. Historical docs such
  as `INTEGRATED-ARCHITECTURE.md`, `WORKTREE-INTEGRATION-PLAN.md`, and
  `POLSIA-NAIVE-REUSE-PLAN.md` remain reference material only; current
  `INDEX.md`, `TRI-SUBSTRATE-ARCHITECTURE.md`, and runtime code win on
  conflict.
- Updated `PRODUCT-ARCHITECTURE.md` so the implementation-level reuse contract
  points at `POLSIA-NAIVE-CODE-REUSE-MASTER-PLAN.md`; the older reuse plan is
  strategic posture, not the ticket source of truth.

Verification:

- `git diff --check -- AGENTS.md docs/dearme/PRODUCT-ARCHITECTURE.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs --ticket DEA-60`
  passed with `reviewed_absorbed: 1`, `not_in_current: 0`, and the latest
  DEA-60 handoff still an already-absorbed committed patch.

## DM-171E Voice & Memory Customer Text Reuse - 2026-05-11

Product/architecture slice:

- Removed the Voice & Memory brief's local hidden-language replacement table
  and routed assignment/routine memory text through the shared DearMe customer
  sanitizer.
- Unified the runtime customer phrase on `private pass`, matching the existing
  DearMe review language while preserving the hidden-language guard for
  workbench, issue route, execution route, provider, adapter, token, and API
  key terms.
- Kept the one Voice & Memory brief shape intact: active private sources,
  source evidence, review boundary, and output-kind ordering still flow through
  the same assignment/routine context path.

Verification:

- `pnpm exec vitest run packages/shared/src/dearme-customer-text.test.ts server/src/__tests__/dearme-memory-context.test.ts server/src/__tests__/heartbeat-dearme-voice-memory.test.ts --maxWorkers=1`
  passed: 3 files, 11 tests; 4 embedded-Postgres tests were skipped because
  the local Postgres init script exited with code 1.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-171D Shared Customer Text Contract - 2026-05-11

Product/architecture slice:

- Moved the DearMe customer-safe text sanitizer and hidden-language pattern
  into `@paperclipai/shared`, while keeping the old server service path as a
  compatibility re-export.
- Reused that same shared boundary in the DearMe UI live-pulse text and
  DearMe approval-error fallback, removing local frontend regex copies that
  could drift from the server-side Workbench, receipt, output-handoff, and
  Voice Gate behavior.
- Extended the shared hidden vocabulary for the product surface terms the UI
  was already guarding locally: OMX, Claude, Gemini, execution route, decision
  route, model-provider, and workspace source language. No new settings,
  runtime surface, or customer-visible implementation language was added.

Verification:

- `pnpm exec vitest run packages/shared/src/dearme-customer-text.test.ts ui/src/lib/dearmeApprovals.test.ts --maxWorkers=1`
  passed: 2 files, 8 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 74 tests.
- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-workbench-projection.test.ts server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 3 files, 35 tests.
- `pnpm --filter @paperclipai/shared typecheck`, `pnpm --filter @paperclipai/server typecheck`,
  and `pnpm --filter @paperclipai/ui typecheck` passed.

## DM-171C Unified Hidden-Language Boundary - 2026-05-11

Product/architecture slice:

- Promoted DearMe's customer-hidden vocabulary into one shared pattern next to
  the customer-safe text sanitizer.
- Rewired Voice Gate hidden-process scoring to use the shared pattern, so
  access/coordinator language such as API key, credential, worker, run id,
  raw control plane, admin, and fingerprint is caught without keeping a
  separate scorer-only regex.
- Rewired output handoff feedback/regeneration text through
  `dearMeCustomerSafeText` instead of dropping useful notes whenever they
  contained substrate words. Customer-visible feedback stays clean while the
  regeneration brief still carries the user's intent.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts --maxWorkers=1`
  passed: 1 file, 16 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed: 1 file, 2 tests; 12 embedded-Postgres tests were skipped because the
  local Postgres init script exited with code 1.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts --maxWorkers=1`
  passed: 1 file, 7 tests.

## DM-171B Customer-Safe Failure Language Tightening - 2026-05-11

Product/architecture slice:

- Extended the shared DearMe customer text sanitizer to cover access and
  coordination terms that can leak from failure paths: API key, credential,
  token, queue, worker, run id, and raw control plane.
- Reused the existing projection and approval-error fallback paths instead of
  adding another product copy layer. Workbench projections, delivery receipts,
  and DearMe approval actions now share the same backstage-language boundary.
- Added focused regressions so customer-visible DearMe surfaces do not expose
  the extra credential/coordinator vocabulary while generic non-DearMe approval
  errors remain untouched.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 2 files, 19 tests.
- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts --maxWorkers=1`
  passed: 1 file, 4 tests.

## DM-171A OpenClaw Plugin Dispatch Contract Cleanup - 2026-05-11

Product/architecture slice:

- Updated `@paperclipai/dearme-openclaw` package docs and package metadata so
  the plugin layer no longer claims outbound tools are unimplemented or
  future-ticket work. The package now describes the current split correctly:
  generated skills/bootstrap plus outbound tool contracts in the plugin,
  live channel senders in the shared cloud dispatch path.
- Tightened the outbound tool type comment around the same boundary. The
  plugin exports the canonical binding table; it should not grow a second
  plugin-side sender that duplicates voice gate, approval, channel credential,
  dispatch, audit, and receipt logic.
- Added a regression assertion to the plugin test suite so the README cannot
  drift back to the stale "does not implement outbound tools yet" wording.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw test`
  passed: 1 file, 19 tests.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck`
  passed.
- `git diff --check -- packages/plugins/dearme-openclaw/README.md packages/plugins/dearme-openclaw/src/tools/types.ts packages/plugins/dearme-openclaw/package.json packages/plugins/dearme-openclaw/src/index.test.ts`
  passed.

## DM-170F Profile-Token Semantic Scorer Wiring - 2026-05-11

Product/architecture slice:

- Added an opt-in `profile-token` semantic scorer that uses the existing
  accepted-sample voice profile as a calibrated local signal for the DM-170
  `semanticScorer` seam. It requires enough accepted samples and profile
  tokens before scoring, so the default first-run Voice Gate behavior remains
  unchanged.
- Wired the same env-resolved scorer through the root `/v1/voice/score` route,
  DearMe routes, output handoff, workbench, brand-blueprint, and approved
  launch handoff paths. Voice scoring now has one shared configured scorer
  boundary instead of per-entrypoint ad hoc construction.
- Kept the scorer behind `DEARME_VOICE_SEMANTIC_SCORER=profile-token` with no
  new dependency and no customer-facing setting. `DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES`
  and `DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS` tune the local calibration
  gate for host proof runs.
- This closes the non-provider DM-170 scorer wiring/calibration gap. The
  remaining production gap is live model/embedding calibration and live scoring
  smoke behind the same scorer seam.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-semantic-scorer.test.ts server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
  passed: 3 files, 28 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DM-170E Semantic Voice Scorer Seam - 2026-05-11

Product/architecture slice:

- Added a narrow `semanticScorer` injection point inside the existing Voice Gate
  service, so a trained voice model or embedding scorer can contribute a
  bounded semantic match/drift signal without replacing the `/v1/voice/score`
  route, persisted `dm_sk_*` auth, DB-backed profile store, or customer review
  surface.
- The default path stays deterministic and backwards-compatible. The semantic
  signal only exists when injected by the service owner, and it receives the
  normalized accepted-sample profile plus current draft signal tokens before
  any new draft is learned.
- Positive semantic matches can lift borderline drafts; confident semantic
  drift can block a draft before it teaches the profile. Failed drafts still do
  not update the voice profile.
- Customer-facing reason notes stay product-safe: they mention the approved
  voice profile, not model/provider/runtime/fingerprint machinery.
- This closes the DM-170 service seam for trained scoring. The remaining
  production gap is connecting and calibrating a real semantic model/embedding
  provider plus live scoring smoke, not another route, key store, profile
  table, or review UI.
- Reviewed active Symphony heads DEA-60 `59f24d22` and `723ccd4f` while this
  slice was in progress. They are older provider-smoke env-template/local-env
  helper cuts already superseded by the current coordinator implementation,
  which keeps the same helper plus stronger custom-domain and host-fetch
  evidence. Recorded them in `WORKTREE-ABSORPTION-LEDGER.json` instead of
  replaying the older cuts.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
  passed: 2 files, 23 tests.

## Symphony Coordination Hygiene - 2026-05-11

Product/architecture slice:

- Reviewed the late DEA-63 live replay heads `f3dd1046` and `7384cfa4` against
  the current coordinator head `262128a3`.
- Did not replay them because they would downgrade the current scoped
  company/user `dearme_voice_profiles` store into a single `fingerprint_id`
  / `snapshot_json` table and lose the tenant-safe continuity boundary.
- The follow-on `7384cfa4` only moved that stale simplified migration to
  `0079_dearme_voice_profiles` and cleaned duplicate imports so the replay
  branch could typecheck. Replaying it would add a second weaker migration
  after the current generated `0078_simple_quicksilver` migration.
- Recorded both heads in `WORKTREE-ABSORPTION-LEDGER.json` so Symphony/worktree
  status stays clean and future workers do not treat the older replay as a
  pending integration candidate.

Verification:

- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
  passed with `reviewed_absorbed: 117` and `not_in_current: 0`.

## DEA-63 / DM-170D Persisted Voice Gate API-Key Auth - 2026-05-11

Product/architecture slice:

- Extracted the DearMe `dm_sk_*` API-key check into shared server middleware
  so AI Proxy and Voice Gate now use the same persisted key lookup.
- Voice Gate no longer accepts a syntactically valid `dm_sk_*` bearer token by
  prefix alone. The route now requires an issued, unrevoked `agent_api_keys`
  row and binds the request to the existing agent/company actor shape.
- Kept the customer-facing Voice Gate contract unchanged: the public
  `/v1/voice/score` payload and response stay the same, with no new settings
  surface or connector concern.
- This closes the DM-170 key-issuance/revocation gap against the existing
  `dm_sk_*` issuer. DM-170E/DM-170F above closed the scorer seam and
  profile-token wiring follow-up; live model/embedding calibration remains.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-voice-gate-routes.test.ts server/src/__tests__/dearme-ai-proxy-routes.test.ts server/src/__tests__/agent-api-key-service.test.ts --maxWorkers=1`
  passed: 3 files, 28 tests.

## DEA-60 / DM-177E Custom-Domain Deploy Receipt Gate - 2026-05-11

Product/architecture slice:

- Extended the existing `deploy_site` dispatcher instead of adding a second
  site runtime. The default path still emits private DearMe handle previews;
  custom-domain receipts require `DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1`.
- Custom domains are normalized to HTTPS hostnames, reject paths, ports, auth,
  whitespace, and invalid DNS labels, and use the existing approval/wrapper/
  audit path before any receipt is emitted.
- `pnpm dearme:provider-smoke` now accepts
  `DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN`, includes it in the local env
  template, and verifies the returned custom-domain URL content when the
  domain gate is enabled.
- Remaining customer claim: live DNS/host proof. The code path is wired, but
  production/custom-domain delivery should still be claimed only after the
  smoke URL serves the expected page text.
- Reviewed Symphony DEA-63 follow-on head `de1a39c6` as already covered by the
  current durable Voice Gate store docs and scoped DB-store implementation, so
  the older-base docs-only head is recorded instead of replayed.

Verification:

- `pnpm test:dearme-provider-smoke`
  passed: 15 node:test checks.
- `pnpm exec vitest run server/src/services/dearme-deploy-site-dispatch-config.test.ts server/src/services/dearme-deploy-site-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 5 files, 49 tests.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck`
  passed.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty`
  passed after the absorption ledger update with `not_in_current: 0`.

## DEA-60 / DM-177D Production Host Smoke Evidence - 2026-05-11

Product/architecture slice:

- Tightened `pnpm dearme:provider-smoke` so production host smoke failures now
  report the exact URL being verified, the HTTP status when present, and the
  underlying fetch cause code when Node exposes one.
- A read-only probe with `DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1` now shows the
  next product blocker clearly: the dispatch path emits
  `https://dearme.app/dearme-smoke`, but the public host fetch fails with
  `UND_ERR_CONNECT_TIMEOUT`.
- This keeps DEA-60 pointed at the real aha blocker: make the DearMe-owned
  public host serve the smoke handle or configure the smoke env to the host
  that does, then rerun the same production target. No new connector store,
  settings surface, or dispatch path was introduced.
- The same slice also keeps custom-domain receipts fail-closed by default and
  unlocks them only with `DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1`, giving
  the live host proof a narrow operator path without opening DNS automation or
  customer settings.

Verification:

- `pnpm test:dearme-provider-smoke`
  passed: 15 node:test checks.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `pnpm exec vitest run server/src/services/dearme-deploy-site-dispatch-config.test.ts server/src/services/dearme-deploy-site-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 5 files, 49 tests.
- `DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1 pnpm --silent dearme:provider-smoke -- --target deploy_site_production --json`
  returned `errored` with reason
  `deploy-site-host-fetch-failed:fetch failed:UND_ERR_CONNECT_TIMEOUT` and
  external URL `https://dearme.app/dearme-smoke`.

## DEA-63 / DM-170C Durable Voice Profile Store + Migration Backfill - 2026-05-11

Product/architecture slice:

- Added the `dearme_voice_profiles` Drizzle table so accepted Voice Gate
  samples survive API restarts instead of staying only in memory.
- Wired the Express app, `/dearme` routes, approval launch handoff, output
  handoff, brand blueprint, workbench, and outbound wrapper through the same
  DB-backed `DearMeVoiceProfileStore`; the public `/v1/voice/score` contract
  and customer-facing review language stay unchanged.
- The store remains company/user scoped where that context exists and can
  derive company scope from internal `company:<id>:...` fingerprints for
  service-owned outputs.
- Profile rows use a `scope_key + fingerprint_id` unique boundary, so the same
  internal fingerprint can exist independently for global, company, and
  company-user scopes without cross-tenant overwrites.
- The persisted snapshot reuses the bounded DEA-62 profile shape
  (`acceptedSamples` plus capped token counts), so this is storage reuse rather
  than a second voice-memory system.
- Generated `0078_simple_quicksilver.sql`, which creates
  `dearme_voice_profiles` and also backfills earlier schema-only
  `channel_connections` and `opportunities` tables so migration history now
  matches the server features already depending on them.
- This is still the deterministic bounded profile store. DM-170E/DM-170F above
  closed the scorer seam and profile-token wiring follow-up; live
  model/embedding calibration remains.

Verification:

- `pnpm db:generate`
  passed and generated `0078_simple_quicksilver.sql`.
- `pnpm exec vitest run server/src/services/dearme-send-email-dispatch.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts server/src/services/dearme-voice-profile-store.test.ts --maxWorkers=1`
  passed: 5 files, 48 tests; 4 embedded Postgres DB-store tests skipped on
  this host because the embedded Postgres init script reported failure.
- `pnpm --filter @paperclipai/db typecheck`
  passed.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DEA-62 / DM-170 Voice Profile Store Boundary - 2026-05-11

Product/architecture slice:

- Moved the Voice Gate accepted-sample profile behind an injectable
  `DearMeVoiceProfileStore` instead of tying continuity to one private
  route-local `Map`.
- Kept the default store in-memory so current route wiring and tests keep the
  same behavior, while making the profile snapshot serializable
  (`acceptedSamples` plus token counts) for the durable store/model swap.
- Bounded stored signal tokens to the strongest 160 entries so repeated
  private approvals cannot grow an unbounded voice profile.
- Failed drafts still do not update the profile. Only drafts that pass the
  Voice Gate can teach the continuity scorer.
- Accepted sample counts are capped at 1,000 in the serialized snapshot, which
  keeps long-lived profiles bounded until the trained model takes over.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
  passed: 2 files, 18 tests.

## DEA-61 Provider Smoke Local Env Setup - 2026-05-11

Product/architecture slice:

- Added `--env-file <path>` to `pnpm dearme:provider-smoke` so the remaining
  provider proof can be driven from a local, untracked operator file instead
  of pasted shell history. Later env files override earlier values and the
  smoke command still merges from the process env for host-provided settings.
- Added `--print-env-template` for the exact local keys needed by the preview
  site receipt, production site host smoke, LinkedIn partner DM smoke, and
  Meta campaign smoke. The template keeps production deploy and live
  send/spend confirmation disabled by default.
- Added `.dearme-provider-smoke.env` ignore rules so the suggested local file
  is not staged with credentials. Readiness and result output continue to show
  missing key names, provider ids, and receipt URLs only, never token material.
- This preserves the current architecture boundary: provider credentials feed
  the existing smoke harness and `ChannelDispatch` path; no customer settings
  surface, connector store, or second runtime path was added.

Verification:

- `pnpm test:dearme-provider-smoke`
  passed: 12 node:test checks.
- `pnpm --silent dearme:provider-smoke -- --print-env-template`
  printed a clean dotenv-compatible template with live confirmation disabled.
- `pnpm --silent dearme:provider-smoke -- --check`
  passed and reported the same remaining live-provider blocks without running
  live sends.

## DEA-60 Provider Smoke Harness - 2026-05-11

Product/architecture slice:

- Added `pnpm dearme:provider-smoke -- --check` as the internal operator gate
  for the remaining live provider proof. It reports exactly which env values
  are missing for preview site receipts, production site host smoke,
  LinkedIn partner DM smoke, and Meta Marketing API campaign smoke.
- The command runs safe preview `deploy_site` receipt smoke without external
  send/spend side effects. When production deploy is explicitly enabled, the
  production target now GETs the returned site URL and verifies expected page
  text before claiming delivery. LinkedIn DM and Meta campaign smokes are live
  provider actions, so they require both `--live` and
  `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1` before dispatch.
- Credential JSON can be supplied directly or by `*_CREDENTIAL_JSON_FILE`, so
  operators do not need to paste tokens into command history. The result
  intentionally reports provider ids/URLs/receipt ids only, not token material.
- This keeps the remaining work bounded to real credential/provider smoke
  evidence; it does not create a customer settings surface, a second connector
  store, or a separate dispatch path.

Verification:

- `pnpm test:dearme-provider-smoke`
  passed: 9 node:test checks.
- `pnpm dearme:provider-smoke -- --check`
  passed and reported live-provider missing config without running live sends.

## DEA-59 / DM-176B / DM-178B Provider Dispatch Config Gates - 2026-05-11

Product/architecture slice:

- Added env bridges for the LinkedIn partner messages endpoint and the Meta
  Graph API base URL:
  `server/src/services/dearme-linkedin-dm-dispatch-config.ts` and
  `server/src/services/dearme-meta-campaign-dispatch-config.ts`.
- App startup now passes `DEARME_LINKEDIN_DM_MESSAGES_URL` /
  `DEARME_LINKEDIN_PARTNER_MESSAGES_URL` / `LINKEDIN_DM_MESSAGES_URL` and
  `DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL` /
  `DEARME_META_GRAPH_API_BASE_URL` / `META_GRAPH_API_BASE_URL` into the
  default approved launch handoff path.
- With no LinkedIn endpoint env, the direct LinkedIn DM dispatcher remains
  unregistered, so existing gateway fallback behavior is not shadowed by an
  unconfigured direct path. With no Meta Graph env, Meta keeps the dispatcher's
  built-in Graph API base URL.
- This does not open any public/send/spend path by env alone. Delivery still
  requires the existing approval wrapper, an active per-user channel
  connection, valid stored credentials, and the per-tool dispatcher checks.
- Remaining customer claims are live-provider proof, not app-wiring work:
  real LinkedIn partner endpoint + credential smoke, and real Meta
  OAuth/Marketing API smoke.

Verification:

- `pnpm exec vitest run server/src/services/dearme-linkedin-dm-dispatch-config.test.ts server/src/services/dearme-meta-campaign-dispatch-config.test.ts server/src/services/dearme-linkedin-dm-dispatch.test.ts server/src/services/dearme-meta-campaign-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts --maxWorkers=1`
  passed: 6 files, 43 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `git diff --check`
  passed.

## DM-177C Configured `deploy_site` Production Host Gate - 2026-05-11

Product/architecture slice:

- Added `server/src/services/dearme-deploy-site-dispatch-config.ts` so the
  default approved launch handoff path can read DearMe site host config from
  env instead of relying on a test-only constructor seam.
- The app now passes `DEARME_DEPLOY_SITE_BASE_URL` / `DEARME_SITE_BASE_URL` /
  `DEARME_PUBLIC_SITE_BASE_URL` and `DEARME_DEPLOY_SITE_ALLOW_PRODUCTION` /
  `DEARME_SITE_ALLOW_PRODUCTION` into the default `deploy_site`
  `ChannelDispatch`.
- With no env config, the existing preview path and production fail-closed
  behavior stay unchanged. With `DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=true`,
  approved production `deploy_site` handoffs can emit stable production URL
  receipts on the DearMe-owned host through the same approval/wrapper/audit
  pipeline.
- Custom-domain receipts remain rejected by default and now require the
  operator-only `DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS` flag. DNS automation
  and live host smoke stay separate DM-177 work.

Verification:

- `pnpm exec vitest run server/src/services/dearme-deploy-site-dispatch-config.test.ts server/src/services/dearme-deploy-site-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 5 files, 44 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DM-178 `create_meta_campaign` Dispatch Path - 2026-05-11

Product/architecture slice:

- Added a server-side Meta Ads dispatcher at
  `server/src/services/dearme-meta-campaign-dispatch.ts`.
- Approved `create_meta_campaign` launch handoffs now default to this direct
  dispatcher after the existing wrapper has completed approval and active
  `channel_connections` lookup on the `meta_ads` channel.
- The dispatcher resolves the stored Meta ads credential through the shared
  secret-provider envelope resolver, requires an `ads_management` grant,
  normalizes the ad account id, validates expiry/token type, bounds the
  simplified campaign payload, enforces the existing test/ramp/scale daily
  budget tiers, and preserves the 7-day learning-window rule from the Polsia
  Ads Manager substrate.
- The live request creates a paused Meta Marketing API campaign shell through
  the configured HTTPS Graph API base URL (defaulting to current `v25.0`),
  sends the wrapper idempotency key, maps
  `401`/`403` back to the wrapper reconnect path, and returns an Ads Manager
  campaign receipt without recording spend as cost until spend actually occurs.
- This closes the cloud-side dispatch seam for the fifth outbound tool in
  mocked tests. It still needs a real Meta OAuth/Marketing API credential
  smoke before claiming live paid-ad delivery for customers.

Verification:

- `pnpm exec vitest run server/src/services/dearme-meta-campaign-dispatch.test.ts server/src/services/dearme-linkedin-dm-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-x-post-dispatch.test.ts server/src/services/dearme-send-email-dispatch.test.ts server/src/services/dearme-deploy-site-dispatch.test.ts --maxWorkers=1`
  passed: 7 files, 56 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DM-176A Partner `send_linkedin_dm` Dispatch Path - 2026-05-11

Product/architecture slice:

- Added a narrow server-side LinkedIn DM dispatcher at
  `server/src/services/dearme-linkedin-dm-dispatch.ts`.
- Approved `send_linkedin_dm` launch handoffs can now use a direct dispatcher
  after the existing wrapper has completed voice-gate, approval, and active
  `channel_connections` lookup on the `linkedin` channel.
- The default approved launch handoff service only registers this direct
  LinkedIn dispatcher when a partner `messagesUrl` is explicitly configured.
  Without that endpoint, `send_linkedin_dm` continues to use the existing
  OpenClaw gateway dispatch map rather than being shadowed by an unconfigured
  direct path.
- The dispatcher is intentionally partner-contract based instead of browser
  automation or a guessed LinkedIn private API. It accepts only stored
  `linkedin_partner` / `hootsuite` credentials that declare the internal
  `send_dm` capability, validates expiry/token type, bounds recipient/body/
  subject fields, sends with provider idempotency, and maps `401`/`403` back
  to the wrapper's reconnect path without exposing tokens.
- This closes the cloud-side direct-dispatch seam for LinkedIn DM in mocked
  tests. It still needs a real approved partner endpoint + credential smoke
  before claiming live LinkedIn delivery for customers.

Verification:

- `pnpm exec vitest run server/src/services/dearme-linkedin-dm-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-x-post-dispatch.test.ts server/src/services/dearme-send-email-dispatch.test.ts server/src/services/dearme-deploy-site-dispatch.test.ts --maxWorkers=1`
  passed: 6 files, 48 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DM-177B Preview `deploy_site` Dispatch Path - 2026-05-11

Product/architecture slice:

- Added a narrow server-side DearMe cloud deploy dispatcher at
  `server/src/services/dearme-deploy-site-dispatch.ts`.
- Approved `deploy_site` launch handoffs now default to this direct dispatcher
  after the existing wrapper has completed approval resolution. The
  `dearme-cloud` channel remains outside per-user OAuth lookup, so the preview
  site proof no longer depends on an OpenClaw gateway URL just to record a
  DearMe-owned preview deployment receipt.
- The dispatcher validates the existing private-preview payload shape:
  lowercase safe handle, non-empty bounded `artifactRef`, `target:
  "preview" | "production"`, and no custom domain in this slice. Preview
  calls return a stable idempotent receipt at `dearme.app/<handle>?preview=*`.
- Production deploys stay fail-closed by default with
  `deploy-site-production-host-unconfigured`; production receipts require an
  explicit dispatcher config. This preserves the current product boundary:
  the first-cycle site proof can be audited now, but the real multi-tenant
  public host/custom-domain path is still a separate DM-177 host slice.
- Delivered Website preview receipts now name the result as a Website preview,
  preserve the safe preview URL through the Workbench projection, and label
  the onboarding link as `Open Website preview` instead of a generic result.
- The default approved launch handoff service now registers direct dispatchers
  for `post_x`, `send_email`, and `deploy_site`; remaining tools continue to
  use the gateway map until their per-tool dispatchers land.

Verification:

- `pnpm exec vitest run server/src/services/dearme-deploy-site-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/__tests__/dearme-approval-receipts.test.ts server/src/services/dearme-output-handoff.portfolio-launch.test.ts --maxWorkers=1`
  passed.
- `pnpm exec vitest run server/src/__tests__/dearme-approval-receipts.test.ts server/src/__tests__/dearme-workbench-projection.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 3 files, 92 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.

## DM-174 Live Resend `send_email` Dispatch Path - 2026-05-11

Product/architecture slice:

- Added a narrow server-side Resend email dispatcher at
  `server/src/services/dearme-send-email-dispatch.ts`.
- Approved `send_email` launch handoffs now default to this direct dispatcher
  after the existing wrapper has completed voice-gate, approval, and active
  `channel_connections` lookup on the `resend` channel.
- Added `server/src/services/dearme-channel-credential.ts` so X and email use
  the same secret-provider envelope resolution boundary instead of duplicating
  local-encrypted credential handling in each channel. DearMe channel dispatch
  keeps external secret providers fail-closed until explicitly enabled.
- The email dispatcher resolves the opaque per-user Resend credential through
  the server secret-provider registry, validates provider, API key, sender
  email, optional sender name, optional expiry, recipient, subject, plain-text
  body, and optional thread id, then calls Resend `POST /emails`. HTML email is
  intentionally fail-closed until a sanitizer path is added.
- Resend `401`/`403` responses map back to the wrapper's reauth path without
  exposing API keys. Successful responses map the Resend email id to the
  existing delivered receipt shape.
- The outbound wrapper now derives provider idempotency keys from
  tool + approval/run + payload hash, so one approved run can send multiple
  distinct emails without sharing the same provider key. Customer-facing
  connection prompts say "email"; Resend stays internal.
- SES remains behind the same approval/OAuth wrapper and still needs a real
  credential smoke before operator use. A follow-up slice added the dynamic
  `send_email` provider binding and direct SES dispatcher; this slice does not
  add a connector dashboard.
- This closes the approved-email send path in mocked tests. It still has not
  performed a live external send because no real Resend credential was used in
  this verification pass.

Verification:

- `pnpm exec vitest run server/src/services/dearme-send-email-dispatch.test.ts server/src/services/dearme-x-post-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts --maxWorkers=1`
  passed: 4 files, 35 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DM-174B Dynamic SES `send_email` Binding - 2026-05-11

Product/architecture slice:

- The outbound wrapper now resolves `send_email` payload
  `provider: "resend" | "ses"` before approval and channel lookup. Resend
  remains the default; SES payloads now look up `channel_connections` with
  `channel: "ses"` instead of being pinned to the default Resend row.
- `dearme-send-email-dispatch.ts` now supports an SES v2 `SendEmail` request
  with AWS Signature Version 4 headers, using the stored per-user SES
  credential payload. The dispatcher keeps HTML email fail-closed until the
  sanitizer path exists.
- The SES credential shape is intentionally small and opaque to the channel
  table: `{ provider: "ses", accessKeyId, secretAccessKey, sessionToken?,
  region, fromEmail, configurationSetName?, expiresAt? }`.
- Unsupported email providers fail before voice gate, approval, channel lookup,
  or credential resolution. Customer-facing reconnect copy still says
  "email"; provider names stay internal.
- This closes the SES channel split in mocked tests. Live SES sending still
  requires an active `ses` channel row with a real credential and a provider
  smoke run.

Verification:

- `pnpm exec vitest run server/src/services/dearme-send-email-dispatch.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/server typecheck`
  passed.

## DEA-52 DM-172B Live `post_x` Dispatch Path - 2026-05-11

Product/architecture slice:

- Added a narrow server-side X publish dispatcher at
  `server/src/services/dearme-x-post-dispatch.ts`.
- Approved `post_x` launch handoffs now default to this direct dispatcher after
  the existing wrapper has completed voice-gate, approval, and active
  `channel_connections` lookup. At the time of this slice, other outbound
  tools continued using the existing gateway dispatch map; DM-174 now gives
  `send_email` its own Resend dispatcher on the same wrapper slot.
- The dispatcher resolves the opaque per-user X credential through the server
  secret-provider registry, validates provider, access token, expiry, and
  `tweet.write` scope, validates tweet text/media payloads, then calls X API
  v2 `POST /2/tweets`.
- X `401`/`403` responses map back to the wrapper's reauth path without
  exposing access tokens. Successful responses map to the existing delivered
  receipt shape with `externalId` and a stable `https://x.com/i/web/status/*`
  URL.
- This closes the approved-X terminal publish seam in mocked tests. It still
  has not performed a live external post because no real X credential was used
  in this verification pass.

Verification:

- `pnpm exec vitest run server/src/services/dearme-x-post-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-x-oauth-connection.test.ts server/src/__tests__/dearme-channel-connections-routes.test.ts server/src/services/dearme-channel-connections.test.ts --maxWorkers=1`
  passed: 6 files, 38 tests.

## DEA-51 DM-173B X OAuth Start + Exchange Path - 2026-05-11

Product/architecture slice:

- The approved X next-step fallback now returns a DearMe-owned
  `oauthStartUrl` instead of only a connection-needed message, aligning the
  server outcome with the OpenClaw outbound tool contract.
- Added the live config-gated X OAuth connection service:
  `GET /v1/channels/:companyId/x/start` builds the X authorize URL with PKCE,
  keeps the verifier server-side, and redirects the user to X when
  `DEARME_X_OAUTH_CLIENT_ID` plus `DEARME_X_OAUTH_REDIRECT_URI` are present
  (the shorter `DEARME_X_CLIENT_ID` / `DEARME_X_REDIRECT_URI` aliases are
  accepted for worker-ticket compatibility).
  Missing config keeps the route fail-closed at 503 instead of pretending the
  channel is connected.
- Added browser callback completion through
  `GET /v1/channels/:companyId/x/callback`: it consumes the server-side state,
  exchanges the code at the X token endpoint, loads the X profile, encrypts the
  credential blob, and persists an active per-user `x` connection row.
- Return URLs are constrained to the configured DearMe callback origin so the
  browser path can return to Workbench without becoming an open redirect.
- The existing `POST /v1/channels/:companyId/x/callback` remains the test/API
  seam around the same persistence path. DM-172B now consumes this active row
  through the dedicated `post_x` dispatcher; this slice does not add a generic
  connector dashboard or a shared account path.
- OAuth state is currently in-memory for the private-beta route shape; a
  multi-instance deployment should move state into a durable session/secret
  substrate before opening this broadly.
- Symphony worker head `29e9e983` is recorded as reviewed_absorbed because the
  coordinator cut keeps the stronger start + callback + approved retry path
  while absorbing the worker's useful token/profile exchange direction.

Verification:

- `pnpm exec vitest run server/src/services/dearme-x-oauth-connection.test.ts server/src/__tests__/dearme-channel-connections-routes.test.ts server/src/services/dearme-channel-connections.test.ts --maxWorkers=1`
  passed: 3 files, 15 tests.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `git diff --check`
  passed.
- `pnpm dearme:worktrees -- --json --skip-dirty --status not_in_current`
  returned an empty set after the DEA-51 absorption entry.

## DEA-50 DM-173A X Callback Persistence Proof - 2026-05-10

Product/architecture slice:

- Added the narrow DearMe X connection callback contract at
  `POST /v1/channels/:companyId/x/callback`.
- The callback path validates the DearMe/X connection body, runs an injected
  exchange seam, and upserts an active per-user `x` row in
  `channel_connections` with opaque credential storage, scopes, expiry,
  external account id, display name, and refreshed timestamp.
- The route is proof-only. Live X token exchange remains config-gated behind
  the injected exchange seam; this ticket does not add a shared account path,
  a generic connector dashboard, or a direct publish implementation.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-channel-connections-routes.test.ts server/src/services/dearme-channel-connections.test.ts --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/server typecheck`
  passed.
- `git diff --check`
  passed.

## DEA-49 DM-171B Onboarding Bridge Absorbed - 2026-05-11

Product/architecture slice:

- Absorbed Symphony's DM-171B no-code bridge proof into the canonical DearMe
  docs, reuse ledger, and tri-substrate architecture table.
- The existing first-run onboarding path already opens with the team-ready
  state, keeps the proof-pack surface visible, and preserves the launch-call
  boundary for public/send/spend moves.
- The coordinator did not add a second setup wizard, second manifest, runtime
  dashboard, or customer-visible substrate surface.
- The worktree absorption ledger records Symphony worker head `1e308864` as
  reviewed_absorbed so patrols stop treating the equivalent worker note as an
  unintegrated branch.

Verification:

- `pnpm --filter @paperclipai/ui exec vitest run src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 73 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts
  server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed: 2 files, 16 tests.
- `pnpm run test:dearme-worktrees` passed: 13 node tests.
- `git diff --check` passed before and after the architecture-table absorption.

## DEA-47 Approved X Delivery Receipts Absorbed - 2026-05-11

Product/architecture slice:

- The approved X next-move path now has route-level proof through the existing
  approval route, the approved-launch handoff service, the outbound wrapper,
  the customer-safe receipt projection, and the Work Ready delivery receipt UI.
- A successful approved `post_x` handoff records a delivered receipt, while a
  missing X connection records the existing customer-safe connection-needed
  receipt and next step: `Connect X before DearMe can continue this approved
  next step.`
- This closes the proof loop without adding a second runtime, direct X API
  publishing, a new approval queue, or customer-visible substrate language.

Verification:

- `pnpm exec vitest run server/src/__tests__/approval-routes-idempotency.test.ts --maxWorkers=1`
  passed.
- `pnpm exec vitest run server/src/services/dearme-approved-launch-handoff.test.ts
  server/src/services/dearme-openclaw-gateway-dispatch.test.ts
  server/src/services/dearme-outbound-tool-wrapper.test.ts
  server/src/__tests__/dearme-approval-receipts.test.ts
  server/src/__tests__/dearme-workbench-projection.test.ts
  server/src/__tests__/approval-routes-idempotency.test.ts --maxWorkers=1`
  passed: 6 files, 46 tests.
- `pnpm --filter @paperclipai/ui exec vitest run src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "delivery receipt"`
  passed.
- `pnpm --filter @paperclipai/ui exec vitest run src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "shows a private sample team package"`
  passed.
- Browser smoke at `http://127.0.0.1:3100/DEAA/dearme` passed on desktop
  `1440x900` and mobile `390x844`: the page shows the sample approved X
  delivery receipt, the customer-safe X connection-needed next step, no hidden
  substrate terms, no console/page errors, and no horizontal overflow.
- `git diff --check` passed.

## DEA-43 DM-145F-B Fetch Transport Proof Absorbed - 2026-05-11

Product/architecture slice:

- Absorbed Symphony worker heads `56189784` and `60440508` for the DM-145F-B fetch transport
  proof into the current proxy executor boundary without adding provider SDKs,
  a live credential requirement, a new runtime surface, or customer-facing
  provider language.
- The coordinator cut keeps the existing executor factory and adds a narrow
  `fetch` mode for OpenAI-compatible and Anthropic-compatible HTTP endpoints.
  It sends the already-resolved `routing.model` rather than trusting the
  caller's request model, keeps Anthropic on `x-api-key` plus
  `anthropic-version`, and preserves the route's 503 fail-closed behavior when
  endpoint/key config is absent.
- Route-level tests now prove OpenAI and Anthropic fetch success through the
  existing normalization and cost rails, plus missing config/provider failure
  and malformed payload paths that do not write cost events.
- The worktree absorption ledger records worker heads `56189784` and `60440508` as
  reviewed_absorbed so Symphony patrols treat it as integrated rather than as
  a second active implementation lane.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-ai-proxy-routes.test.ts
  server/src/services/dearme-ai-proxy-executors.test.ts --maxWorkers=1`
  passed: 2 files, 25 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck` passed.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` passed after the
  absorption entry.
- `pnpm dearme:worktrees -- --json --status=not_in_current --skip-dirty`
  returned an empty not_in_current set after the absorption entry.
- `git diff --check` passed.

## DEA-42 DM-145F Proxy Executor Boundary Absorbed - 2026-05-11

Product/architecture slice:

- Reviewed Symphony worker handoff `31e9d683` for the DM-145F proxy executor
  boundary and kept the current coordinator cut as the source of truth. The
  live branch already carries the stronger fixture executor boundary in
  `server/src/services/dearme-ai-proxy-executors.ts`, route-option wiring
  through `createDearMeAiProxyRouteOptions()`, default app mounting, and
  route/service coverage.
- Did not replay the worker tip because it would add a duplicate
  `dearme-ai-proxy-executor.ts` wrapper and require all three handler
  functions unnecessarily. Future live-provider/runtime work should consume
  the settled executor boundary, routing, auth, cache, and key helpers instead
  of reopening another proxy abstraction.
- Linear `DEA-42` is Done with coordinator evidence, and the worktree
  absorption ledger now records the worker head as reviewed_absorbed so
  Symphony does not keep surfacing the same lane as new work.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-ai-proxy-routes.test.ts
  server/src/services/dearme-ai-proxy-executors.test.ts --maxWorkers=1`
  passed: 2 files, 15 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck` passed.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` passed after the
  absorption entry.
- `pnpm dearme:worktrees -- --json --status=not_in_current --skip-dirty`
  returned an empty not_in_current set after the absorption entry.
- `git diff --check` passed.

## Symphony Worker Watchdog Tightened - 2026-05-10

Coordination slice:

- Tightened `.symphony/WORKFLOW.md` so DearMe worker lanes now carry explicit
  `turn_timeout_ms` and `stall_timeout_ms` bounds in addition to the existing
  first-command fuse and single-lane first-cycle/proof rule.
- Strengthened the first-turn guard: context compaction, approaching the turn
  timeout, or completing the narrow inspection without a diff now means the
  worker should produce a terminal handoff artifact with a patch, no-code
  evidence, or blocker instead of continuing broad research.
- This keeps Symphony as the development factory and coordinator-reviewed
  evidence spine. It does not change customer runtime behavior or add another
  product surface.

Verification:

- `ruby -e "require 'yaml'; ..."` parsed `.symphony/WORKFLOW.md` frontmatter
  and confirmed `codex.turn_timeout_ms == 900000` plus
  `codex.stall_timeout_ms == 120000`.
- `pnpm test:dearme-symphony-preflight` passed: 4 node tests.
- `pnpm test:dearme-symphony-handoff` passed: 4 node tests.
- `git diff --check` passed.

## DEA-36 DM-147 Launch-Ready Next Step Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed Symphony worker handoffs `47b31e0f`, `63ec69b6`, and the useful
  `dbe46539` follow-on direction onto the coordinator branch, then tightened
  the remaining approval receipt, Workbench, shared fixture, and onboarding
  copy so the first proof pack reads as one launch-ready next step instead of a
  mechanical handoff.
- The slice reuses the existing output handoff, `dearme_output_next_move`
  approval payload, private receipt activity, Workbench projection, and
  onboarding proof-pack surface. No new launch dashboard, queue, runtime view,
  send path, or first-run contract was added.
- Customer-visible labels now converge on `Launch-ready next step`,
  `Launch-ready brief`, a shared proof-pack next-step sentence, and explicit
  approval-boundary copy. The internal `execution_handoff_prepared` progress
  kind remains a storage/read-model detail only.

Coordination state:

- Worker evidence is preserved under the DEA-36 handoff artifacts in
  `/private/tmp/dearme-symphony-workspaces/_handoffs/`, including the initial
  `47b31e0f` proof-pack handoff and later `dbe46539` grammar unification
  patch.
- Linear `DEA-36` tracks this as the single active Symphony implementation
  lane until coordinator verification and closeout.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-approval-receipts.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-workbench-projection.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-workbench.next-step.test.ts packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 148 tests and 16 embedded-Postgres-dependent tests skipped by
  the host probe.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `git diff --check` passed.
- The target customer-visible code/fixture scan found no remaining
  `Launch queue`, `approved handoff`, old generic review-launch sentence,
  `shared packet once`, or private execution-brief wording under `server/src`,
  `ui/src`, or `packages/shared/src`.

## DEA-34 DM-145C Proxy-Key Issuance Absorbed - 2026-05-10

Product/architecture slice:

- DearMe now has a fixed issuance path for proxy keys that reuses the
  existing agent API-key store and revocation model. `POST
  /agents/:id/keys/dearme-proxy` calls `agentService.createApiKey(...,
  { prefix: "dm_sk_" })` and keeps the normal `POST /agents/:id/keys`
  path on the default `pcp_*` family.
- The dedicated DearMe path is intentionally narrow: callers can choose the
  human-readable key name, but they cannot request arbitrary prefixes through
  the public/admin route. The service still rejects pending-approval and
  terminated agents before any token is minted.
- Reuse decision: keep a single `agent_api_keys` substrate for both `pcp_*`
  and `dm_sk_*` families. Do not add a second DearMe key store or a parallel
  auth model.
- DM-145D now closes the onboarding gap: DearMe onboarding issues the
  dedicated `dm_sk_*` credential for the Chief of Staff agent, stores it in a
  backstage company secret, and binds it through the agent adapter config
  without exposing key management to the customer.
- Customer-facing copy still stays DearMe-only; no generic key-management
  surface was added.

Verification:

- `pnpm exec vitest run server/src/__tests__/agent-api-key-service.test.ts
  server/src/__tests__/dearme-ai-proxy-routes.test.ts
  server/src/__tests__/agent-permissions-routes.test.ts
  server/src/__tests__/agent-cross-tenant-authz-routes.test.ts --maxWorkers=1`
  passed: 4 files, 54 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck` passed.
- `git diff --check` passed.

## DEA-33 DM-145B Proxy Auth Boundary Absorbed - 2026-05-10

Product/architecture slice:

- The DearMe proxy now treats the bearer token as the source of truth for
  cost attribution. `dm_sk_*` keys resolve to authenticated `companyId` and
  `agentId` through the existing `agent_api_keys` table pattern, and the proxy
  route no longer trusts `X-DearMe-Company-ID` / `X-DearMe-Agent-ID` headers on
  the normal path.
- The proxy route keeps the DEA-32 fail-closed posture: missing keys,
  malformed bearer tokens, revoked keys, and non-DearMe prefixes all reject
  before any provider call or ledger write.
- `agentService.createApiKey()` now accepts a narrowed optional token prefix
  (`pcp_` or `dm_sk_`) while
  preserving the default `pcp_*` family. That keeps the current agent API-key
  contract stable while opening a conservative path for DM-145 issuance.
- Reuse decision: keep the existing `agent_api_keys` storage and auth
  semantics. Do not add a second DearMe key store or a separate proxy runtime
  auth model.
- Later DM-145C/DM-145D slices closed the proxy-key issuance gap, so `dm_sk_*`
  keys are minted intentionally through the existing agent key store instead of
  only being accepted by the proxy/auth path.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-ai-proxy-routes.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts server/src/__tests__/agent-api-key-service.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck`
- `git diff --check`

## DEA-31 Prompt-Cache Economics Contract Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Symphony worker direction from `e820cdd3` while keeping the
  final implementation in `@paperclipai/dearme-ai-proxy`'s package boundary
  instead of adding server runtime, DB migration, or UI changes.
- The proxy package now exports a `./cache-economics` subpath plus root helpers
  for prompt-cache breakpoints, provider usage normalization, cache accounting
  summaries, and `CostLedgerEvent` construction.
- `markDearMePromptCacheBreakpoint()` creates Anthropic-compatible
  `cache_control` markers for stable prompt blocks; `normalizeDearMeProxyUsage()`
  accepts Anthropic cache-create/cache-read fields and OpenAI cached-token
  fields; `buildDearMeCostLedgerEvent()` maps the result onto the existing
  DearMe cost-ledger shape.
- Donor reuse: Naive/Paperclip cost-ledger fields remain the storage target,
  while Polsia-style steady-state economics are represented as a 90% cache-read
  ratio target. Future DM-145 runtime code should consume these helpers instead
  of re-parsing provider usage inline.
- Rejected: full HTTP proxy route, credential runtime, DB schema change,
  customer-facing cache/provider/model UI, or another cost-accounting model.

Coordination state:

- Symphony `DEA-31` produced the parallel worker proof; the coordinator compared
  it against the local package-boundary implementation and absorbed the contract
  without adding a second writer to the already-settled model-routing lane.
- Linear `DEA-31` was moved to `Done` only after coordinator absorption,
  verification, and a closeout comment. The next Symphony poll reported
  `running: []` and `retrying: []`.

Verification:

- `pnpm --filter @paperclipai/dearme-ai-proxy test -- src/index.test.ts`
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck`
- `git diff --check`

## DEA-30 Proxy Model Routing Contract Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Symphony worker patch for DM-143A at coordinator commit
  `3af18fc4`.
- `@paperclipai/dearme-ai-proxy` now exports a proxy-owned
  `./model-routing` subpath plus package-root helpers for complexity `1-10`
  to `fast`, `balanced`, or `deep` model routing.
- The proxy package reuses the canonical prompt-package
  `MODEL_ROUTING_TABLE` and `pickModelForComplexity()` instead of copying the
  Polsia-style thresholds. Future threshold edits should stay single-sourced in
  `@paperclipai/dearme-agent-prompts`.
- During absorption, the coordinator also landed `86c65876` as a DEA-28
  follow-up: quiet private-review progress now carries the explicit `7/10`
  default score through shared/server/UI while still reminding the user that
  public posts, sends, deploys, and spend wait for explicit approval.

Coordination state:

- Worker evidence was preserved under
  `/private/tmp/dearme-symphony-workspaces/_handoffs/DEA-30-d7cb4520fb1d..bd0dcd99be5c-2026-05-10T21-26-14-230Z.*`.
- Linear `DEA-30` was moved to `Done` only after coordinator absorption,
  verification, and the coordinator closeout comment.
- `.symphony/bin/dearme-symphony status` reported the daemon healthy with
  `running: []` and `retrying: []`.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  DearMe worktrees with `not_in_current: 0`, `dirty: 0`, and `prunable: 0`.

Verification:

- `pnpm --filter @paperclipai/dearme-ai-proxy test -- src/index.test.ts`
  passed with 8 tests.
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck` passed.
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 87 tests and 11 embedded-Postgres-dependent subtests skipped by
  the host probe.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.

## DEA-28 Silence Default Review Score Absorbed - 2026-05-10

Product/architecture slice:

- Coordinator-implemented the DM-153 silence-default review slice at commit
  `d451d051` after two Symphony worker retries consumed context without leaving
  an absorbable diff.
- DearMe private output reviews now accept an explicit `silenceDefault` marker
  that resolves only as a private approve signal with fixed score `7/10`.
- The default path records a customer-safe receipt and review memory feedback,
  then marks the private work approved for learning. It does not create
  `dearme_output_next_move` approvals, issue approvals, launch handoffs, public
  posts, outbound sends, deploys, or spend.
- The route memory projection reuses the existing review-feedback activity
  channel, so the product learns from silence without exposing Symphony,
  OpenClaw, Paperclip, provider, model, runtime, or queue language.
- Follow-up `86c65876` projects the private default score and approval boundary
  into the shared review-loop contract, server projection, and DearMe UI so the
  product can show progress without implying launch approval.

Coordination state:

- Linear `DEA-28` was moved to `Done` after coordinator implementation,
  verification, and a Linear closeout comment.
- No durable worker handoff artifact exists for this lane because the worker
  retries left no useful diff. The coordinator kept Symphony idle and absorbed
  the slice directly on the coordination branch.
- Symphony was idle after absorption: zero running workers and zero retries.

Verification:

- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts packages/shared/src/validators/dearme.test.ts`
  passed with 57 tests and 11 embedded-Postgres-dependent subtests skipped by
  the host probe.
- `git diff --check` passed.

## DEA-27 Emergency Pause Handoff Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Symphony worker patch for emergency pause intent on approved
  DearMe handoffs at coordinator commit `70ef7f59`.
- Final approval notes that say stop, pause, hold, not now, or do not send /
  publish / deploy / spend now short-circuit external dispatch before any
  outbound action runs.
- The pause state reuses the existing approval receipt, private handoff,
  Workbench progress, and team handoff panel surfaces. No new runtime,
  dashboard, queue, or second control plane was added.
- Customer-facing copy stays DearMe-native: the surface says the private handoff
  is paused until the customer resumes or approves a new direction, without
  exposing substrate language.

Coordination state:

- Worker evidence was preserved under
  `/private/tmp/dearme-symphony-workspaces/_handoffs/DEA-27-107da766288c..399dcd94d810-2026-05-10T20-54-16-488Z.*`.
- Coordinator absorbed the durable handoff patch after the worker workspace
  returned to a clean tree.
- Linear `DEA-27` was moved to `Done` only after coordinator absorption,
  verification, and the coordinator Linear handoff comment.
- Symphony was idle after absorption: zero running workers and zero retries.

Verification:

- `git diff --cached --check` passed before the product commit.
- `pnpm exec vitest run server/src/services/dearme-approved-launch-handoff.test.ts server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-approval-receipts.test.ts server/src/__tests__/dearme-workbench-projection.test.ts packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 110 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `.symphony/bin/dearme-symphony status` reported the daemon healthy with
  `running: []` and `retrying: []`.

## DEA-26 Connect-Channel Handoff Receipt Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Symphony worker patch for channel readiness on approved launch
  handoffs at coordinator commit `2b8aa781`.
- Private handoff receipts now read the existing `launchHandoff` publish gate
  from the approved next-move payload and surface the customer-safe next step:
  `Connect X before DearMe can continue this approved next step.`
- The Workbench projection reuses the existing `execution_handoff_prepared`
  progress item and the existing handoff panel. No launch queue, runtime
  dashboard, dispatch path, or second approval surface was added.
- Generic private handoff receipts remain unchanged when no launch handoff is
  present.

Coordination state:

- Worker evidence was preserved under
  `/private/tmp/dearme-symphony-workspaces/_handoffs/DEA-26-12277c95402b..4494284e289a-2026-05-10T20-21-31-830Z.*`.
- Linear `DEA-26` was moved to `Done` only after coordinator absorption and
  verification.
- Symphony was idle after absorption: zero running workers and zero retries.

Verification:

- `git diff --check HEAD~1..HEAD` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-approval-receipts.test.ts server/src/__tests__/dearme-workbench-projection.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 75 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-approval-receipts.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-workbench-projection.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 75 tests and 5 embedded-Postgres-dependent tests skipped on this
  host.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DEA-25 Approved Launch Handoff Executor Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the voice-gated content launch handoff lane across coordinator
  commits `45a9ad64` and `12277c95`.
- Content draft packets now carry `voiceFingerprintId` and store a
  `launchHandoff` in output metadata, then copy that same handoff into the
  next-move approval payload when the private draft is approved.
- The approved-launch handoff service consumes approved
  `dearme_output_next_move` payloads and calls the existing outbound wrapper
  with `preapprovedApprovalId`, avoiding a second approval gate.
- Missing X connection returns the existing `needs_oauth` outcome with
  `gate: "connect_channel"` and customer-safe connect-channel language. No
  channel action is dispatched without approval plus an active channel
  connection.

Coordination state:

- Worker evidence was preserved under
  `/private/tmp/dearme-symphony-workspaces/_handoffs/DEA-25-baa01a71..eb1130528bc9-2026-05-10T20-15-07-548Z.*`.
- A read-only Codex review correctly flagged that the worker-created handoff
  needed an approved-payload consumer. The coordinator added that consumer
  before marking the lane absorbed.

Verification:

- `git diff --check HEAD~1..HEAD` passed for both absorbed commits.
- `pnpm exec vitest run server/src/services/dearme-approved-launch-handoff.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/__tests__/approval-routes-idempotency.test.ts packages/shared/src/validators/dearme.test.ts`
  passed with 40 tests.
- `server/src/__tests__/dearme-output-handoff.test.ts` remained blocked by the
  known local embedded-Postgres initialization failure on this host.

## DEA-23 Symphony Durable Handoff Artifacts - 2026-05-10

Coordinator micro-tuning:

- Added a terminal handoff artifact script so Symphony workers preserve
  coordinator-absorbable patch evidence outside the per-ticket workspace before
  cleanup can remove the local Git object.
- Worker creation now records the coordinator source head in worker Git
  metadata; terminal handoff compares that base to `HEAD` and writes
  `format-patch`, `git bundle`, and JSON summary artifacts under
  `/private/tmp/dearme-symphony-workspaces/_handoffs`.
- Updated the Symphony worker contract so changed-file lanes report both the
  local commit hash and the durable artifact paths, no-code lanes prove `No file
  changes`, and dirty/blocker lanes leave a patch summary while staying
  non-terminal.

Verification:

- `pnpm test:dearme-symphony-handoff` passed with 4 tests.
- `pnpm test:dearme-symphony-preflight` passed with 4 tests.
- `pnpm dearme:symphony-handoff -- --help` passed.
- `git diff --check` passed.

## DEA-21 Private Site Host Smoke Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Symphony worker patch for the 3-5 minute private site proof
  without adding a second site runtime, deployment path, or public launch claim.
- The first-cycle preview now accepts an optional handle, normalizes it into a
  safe private site handle, and returns a concrete private route at
  `dearme.app/<handle>`.
- The service keeps that explicit handle while enriching the preview from
  existing memory, so API callers do not silently fall back to display name after
  memory hydration.
- The customer-facing proof package now shows that route inside the portfolio
  proof card with the launch boundary intact: the site remains private until
  one deploy decision is approved.
- Server proof documents and apply/report artifacts now carry the same private
  preview route so the Brand OS, first-cycle issues, and onboarding surface tell
  one story.
- DEA-44 is coordinator-absorbed as the approved private-site handoff boundary
  slice. Approved `portfolio_update` proof now reuses the existing `deploy_site`
  dispatch boundary from the private preview route, and missing config or
  connection still fails closed with a customer-safe receipt instead of a
  public deploy claim. Keep this on the existing approval and outbound wrapper
  path; do not add a second launch runtime or dashboard.

Coordination state:

- `DEA-21` was marked Done by Symphony before the coordinator could absorb a
  reachable worker commit. The worker workspace had already been cleaned, so
  this coordinator pass recovered the inspected patch onto the current main
  checkout and fixed the handle-preservation gap found during absorption.
- Do not add another product implementation agent on this same first-cycle
  surface; the next useful extra agent is read-only QA or a separate tooling
  lane.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 121 tests and 4 embedded-Postgres tests skipped on this host.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.

## DM-183CA Symphony Git Preflight - 2026-05-10

Coordinator micro-tuning:

- Added a worker Git readiness preflight so Symphony lanes fail before
  implementation when `.git/index.lock` is present, tracked files are already
  dirty, or the workspace Git metadata is not writable.
- Wired the preflight into `.symphony/WORKFLOW.md` after workspace dependency
  install and into Codex bootstrap evidence before the worker reads old
  worktrees or starts product analysis.
- Documented the guard in `.symphony/README.md` and exposed it as
  `pnpm dearme:symphony-preflight -- .` with focused Node tests.
- This addresses the DEA-19 handoff wrinkle without adding another product
  implementation lane while DEA-21 is active.

Verification:

- `pnpm test:dearme-symphony-preflight` passed with 4 tests.
- `git diff --check` passed.

## DEA-21 Private Site Host Smoke Active - 2026-05-10

Product/architecture slice:

- Linear `DEA-21` is the next single product implementation lane after
  `DEA-19` and `DEA-20` absorption.
- The lane targets the weakest remaining first-session aha window: turn the
  3-5 minute private site proof from a placeholder proof card into a concrete,
  handle-specific private site preview or host smoke.
- The intended customer-visible package should tie together page section, proof
  source, proposed copy, audience, CTA or offer, and deploy boundary while
  staying private behind `deploy_public_site`.
- Reuse is mandatory: start from the existing first-cycle preview,
  `portfolioProofCard`, proof sequence, Brand OS preview/apply, output handoff,
  Workbench projection, Brand Site Builder role, and deploy-gate contracts.
  Do not add a second site schema, runtime dashboard, queue, or public deploy
  path in this slice.

Coordination state:

- Symphony started `DEA-21` before the coordinator noticed it; a briefly opened
  overlapping `DEA-22` launch-decision ticket was closed as duplicate of
  `DEA-21`.
- `DEA-21` is the only active DearMe product writer lane.
- Use additional Codex help only for read-only architecture/product review or
  coordinator absorption while this ticket is active.
- Keep the DEA-19 opportunity shortlist and DEA-20 Chief pairing proof stable
  unless the first-cycle package naturally references their already-absorbed
  output.

Verification expectation:

- Worker should run the narrowest checks for touched files. If the likely shared
  + route + UI scope changes, expected baseline is
  `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`,
  relevant package typechecks, and `git diff --check`.
- Completion requires an absorbable worker commit, explicit no-code evidence,
  or a blocker/patch handoff with workspace path.

## DEA-20 Chief Pairing Smoke Absorbed - 2026-05-10

Product/architecture slice:

- Closed Linear `DEA-20` as a no-code Symphony proof lane: the existing
  `@paperclipai/dearme-openclaw` package already proves the backstage
  Chief/OpenClaw pairing assets are coherent enough for DearMe's resident-team
  promise.
- Kept the proof narrow: manifest, generated skills, bootstrap files, required
  config, and outbound approval gates were verified without touching the
  opportunity shortlist, onboarding proof package, Playwright e2e harness, or
  broad UI routes.
- Preserved the product boundary: OpenClaw remains an install/pairing substrate
  behind DearMe, not a customer-visible surface.

Coordination state:

- The worker reported no file changes and explicit no-code evidence; the
  workspace was already cleaned before coordinator inspection, so the
  coordinator reran the verification on the current checkout.
- Symphony is idle after `DEA-20`; the next ticket can start from the
  coordinator checkout.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw test` passed with 1 file and 18
  tests.
- Coordinator manifest/bootstrap smoke confirmed `openclaw.plugin.json`
  includes `./generated/skills`, 12 generated skill folders contain
  `SKILL.md`, `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md` are
  present, `configSchema.required` is `apiKey` plus `handle`, and outbound
  bindings still cover `publish`, `send`, `deploy`, and `spend` gates.
- Linear `DEA-20` is `Done` with no file changes.

## DEA-19 Opportunity Shortlist Absorbed - 2026-05-10

Product/architecture slice:

- Absorbed the Opportunity Hunter private-shortlist lane into the coordinator
  checkout after Symphony produced an implementation patch but could not write
  normal Git metadata in `/private/tmp/dearme-symphony-workspaces/DEA-19`.
- Expanded the first-cycle proof package from one opportunity lead to a
  five-target private shortlist with fit reasons, relevance scores, outreach
  angles, and draft first messages.
- Preserved the existing `opportunityLead` compatibility field by pointing it
  at the first shortlist item, avoiding a contract break for current server/UI
  paths.
- Kept every outreach item private and behind `send_email`; no send, public
  outreach, spend, deploy, new runtime, or customer-visible substrate surface
  was added.
- Reused the current Brand OS preview, first-week seed documents, report
  seeding, and onboarding proof package instead of introducing a separate
  opportunity dashboard.

Coordination state:

- Linear `DEA-19` remains the only active DearMe Symphony implementation lane
  while the coordinator finalizes absorption.
- Symphony worker output was useful, but the worker workspace could not create
  `.git/index.lock`; coordinator absorption is the right fallback for this
  lane.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 3 files and 120 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-workbench-projection.test.ts --maxWorkers=1`
  passed the projection file and skipped the embedded-Postgres-dependent
  output-handoff/workbench files on this host.
- `git diff --check` passed.

## DEA-18 Browser Proof Unblocked - 2026-05-10

Product/architecture slice:

- Closed the first-private-outcome browser proof as a harness/environment fix,
  not a DearMe product redesign.
- Root cause was local embedded PostgreSQL initialization failing before browser
  execution with `could not create shared memory segment`, while the current
  DearMe first-glance/private-handoff product path was already ready to smoke.
- Updated the Playwright e2e harness to prefer an isolated throwaway external
  PostgreSQL database when a reachable local admin database exists, keep
  embedded PostgreSQL as fallback, and drop the generated database during
  global teardown.
- Kept the proof local/private: e2e still boots a dedicated
  `local_trusted`/`private` throwaway Paperclip home and does not attach to the
  developer's active runtime state.

Verification:

- `pnpm exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/dearme-private-handoff.spec.ts --project=chromium`
  passed with 1 test.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- A cleanup query against local Postgres returned no remaining
  `paperclip_e2e_%` databases after teardown.

## DEA-19 Opportunity Hunter Lane Activation - 2026-05-10

Product/architecture slice:

- Promoted Linear `DEA-19` as the next non-overlapping DearMe value lane:
  Opportunity Hunter private shortlist without send.
- Started it only after the `DEA-18` browser-proof absorption landed in the
  coordinator checkout, keeping one active product implementation lane.
- Scoped `DEA-19` to the 60-120s aha moment: 5 named targets, fit reasons,
  outreach angles, and draft first messages, all private and behind a send
  approval boundary.
- Anchored the lane to existing Opportunity Hunter assets instead of a new
  runtime: `DEARME_ROLE_REGISTRY`, `opportunity-hunter.ts`,
  `opportunity-state.ts`, the `opportunities` schema, and current DearMe
  output/workbench projection patterns.

Coordination state:

- `DEA-18` is no longer a product-surface blocker after the coordinator harness
  absorption and browser proof pass.
- Symphony has one active issue, `DEA-19`, in
  `/private/tmp/dearme-symphony-workspaces/DEA-19`.
- The coordinator checkout owns the absorbed `DEA-18` e2e harness fix in
  `tests/e2e/playwright.config.ts`, `tests/e2e/playwright-database.ts`, and
  `tests/e2e/playwright.teardown.ts`.

Verification:

- This section is historical activation context. The lane later absorbed as
  `DEA-19 Opportunity Shortlist Absorbed` above; do not treat it as an active
  Symphony ticket.

## DEA-17 First-Glance Focus Absorption - 2026-05-10

Product/architecture slice:

- Absorbed the useful Symphony DEA-17 simplification through the coordinator
  branch as commit `08137399` instead of cherry-picking the worker commit,
  because the worker commit lacked the required OmX coauthor trailer.
- Tuned the default `/dearme` post-hero surface so the first product glance is
  one private result, one next decision/review action, and one first-cycle
  start/continue CTA.
- Deferred the broader First payoff strip below the team board and removed the
  separate visible live-pulse block from the first focus surface so it does not
  compete with the intended aha moment.
- Kept Symphony, Paperclip, OpenClaw, provider, adapter, model, setup payload,
  and raw runtime language out of the customer-facing surface.

Coordination state:

- Linear `DEA-17` has a coordinator absorption comment pointing to local commit
  `08137399`.
- Pushing `codex/dearme-dm-136-sample-demo-proof` to
  `paperclipai/paperclip` is blocked by GitHub auth:
  `Permission to paperclipai/paperclip.git denied to WuKongAI-CMU`.
- The DearMe worktree report found 117 worktrees: 1 current, 3 in current, 113
  reviewed absorbed, 0 not in current, 0 dirty, and 0 prunable.
- Opened Linear `DEA-18` as the only active Symphony lane for browser-level
  proof. Its scope is limited to reproducing and unblocking the
  Playwright/private-handoff embedded PostgreSQL blocker, not broad UI
  redesign.
- Added a coordinator guardrail comment to `DEA-18`: keep it as the single
  active browser proof lane, prefer harness/env/bootstrap fixes, leave
  onboarding/proof-pack/workbench copy alone unless required for the proof, and
  post a Linear blocker comment before making large speculative changes.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed with 66 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- `.symphony/bin/dearme-symphony status --json` reported `DEA-18` running in
  `/private/tmp/dearme-symphony-workspaces/DEA-18` from local head `08137399`.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported no
  unabsorbed or dirty DearMe worktrees.

Not run:

- Playwright private-handoff e2e is intentionally delegated to `DEA-18`; the
  previous worker handoff reported an embedded PostgreSQL initialization
  blocker in the throwaway webServer path.
- Remote push is not complete because the current GitHub credential lacks
  permission on `paperclipai/paperclip`.

## DM-171A OpenClaw Plugin Install Proof - 2026-05-10

Product/architecture slice:

- Closed DEA-16 as a no-code Symphony proof lane: the current
  `@paperclipai/dearme-openclaw` package already has a coherent plugin
  manifest, generated skill tree, bootstrap payloads, and explicit backstage
  setup schema.
- Kept DM-171A focused on installability evidence instead of expanding it into
  a customer-facing setup wizard, dashboard, browser smoke, or outbound channel
  implementation.
- Preserved the product boundary: OpenClaw remains the backstage install
  substrate, while DearMe's paid-beta surface stays in customer language.

Verification:

- Worker package smoke passed
  `pnpm --filter @paperclipai/dearme-openclaw test` with 1 file and 18 tests
  passed.
- Coordinator reran
  `pnpm --filter @paperclipai/dearme-openclaw test` on the current head and it
  passed with 1 file and 18 tests.
- Coordinator manifest smoke confirmed `openclaw.plugin.json` points to
  `./generated/skills`, 12 generated skill folders have `SKILL.md`,
  `generated/bootstrap/{AGENTS,SOUL,IDENTITY,USER}.md` are present, and
  `configSchema.required` is `apiKey` plus `handle`.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/INDEX.md packages/plugins/dearme-openclaw`
  passed after the docs absorption edit.
- Linear `DEA-16` is `Done` with no file changes and no blocker.

## DM-183BZ First-Cycle Sample Demo Proof Card - 2026-05-10

Product/architecture slice:

- Closed DEA-15 as a no-code proof lane: the current first-cycle start,
  private handoff, Workbench projection, and DearMe onboarding surfaces already
  show a concrete sample/demo package with Chief of Staff work and a focused
  review decision card.
- Kept the proof on the existing DEA-13 path instead of adding another
  first-run runtime contract, queue surface, or customer-visible machinery.
- Confirmed Symphony's current role for this lane: one implementation worker
  produced absorbable no-code evidence, while the coordinator kept the main
  branch as the integration truth.

Verification:

- Worker focused proof smoke passed:
  `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench-projection.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "first cycle|private handoff readiness|Focused decision|Chief of Staff brief|90-second first cycle|private sample team package"`
  with 2 test files passed, 1 filtered file skipped, and 13 matched tests
  passed.
- Worker projection smoke passed:
  `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts --maxWorkers=1 -t "keeps projected workbench text customer-safe|projects nested output payloads before the workbench response returns them"`
  with 1 file and 2 tests passed.
- Linear `DEA-15` is `Done` with no file changes and no blocker.

## DM-139A First-Cycle Chief Of Staff Private Run Proof - 2026-05-10

Product/architecture slice:

- Closed DEA-13 as a no-code proof lane: the current first-cycle start,
  private handoff, Chief of Staff brief, and focused decision surfaces already
  satisfy the intended private-run path without another runtime contract.
- Preserved the DearMe boundary: the proof stays in customer language around
  first private work, Chief of Staff preparation, focused review, and launch
  calls rather than exposing worker, queue, provider, model, or substrate terms.
- Treated the worker's Linear `Done` state as acceptable only because the final
  handoff explicitly reported no repository code changes plus focused test and
  API smoke evidence.

Verification:

- Worker no-code handoff reported direct API smoke with
  `handoffKind: execution_handoff_prepared`,
  `handoffReadiness: private_handoff_ready`,
  `outputId: ecd472d2-d12d-4463-befe-21b4680bcb45:content_drafts`,
  `approvalId: b08010da-8ef8-4558-a79a-cf0a226eb8f3`, and
  `companyId: 0989dc45-0c16-453f-a7d8-5d7f361a43df`.
- Coordinator reran
  `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "first cycle|private handoff readiness|Focused decision|Chief of Staff brief"`
  and it passed: 2 files, 12 matched tests.

## DM-183BY Symphony Terminal Handoff Guard - 2026-05-10

Product/architecture slice:

- Tightened the Symphony worker prompt after the DEA-12 recovery finding: a
  Linear terminal state is not enough unless the coordinator can absorb a local
  commit, explicit no-code evidence, or a blocker/patch handoff.
- Added a terminal handoff gate to `.symphony/WORKFLOW.md`: changed-file
  workers must run status/diff-check/focused verification, stage explicit
  paths, and create a local commit before claiming completion; blocked commits
  must leave workspace path, touched paths, patch summary, and failing command
  while keeping the issue non-terminal.
- Added the same guard to `.symphony/README.md` so DearMe keeps the main
  checkout as the integration truth and avoids cleaned workspaces with no
  absorbable artifact.
- Added the current concurrency rule for aha-proof work: while DEA-13 or a
  similar first-cycle private-run/launch-handoff ticket is active, keep the
  product implementation lane effectively single-lane and use extra Codex help
  only for read-only review.
- Confirmed the next product lane, DEA-13, had cloned from `4b917f75`; DEA-14
  then reached a terminal Linear state and its workspace was already cleaned,
  which is exactly why the coordinator now requires absorbable evidence instead
  of trusting terminal state alone.

Verification:

- `git diff --check -- .symphony/WORKFLOW.md .symphony/README.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- `.symphony/bin/dearme-symphony status --json` reported DEA-13 as the only
  running worker and `retrying: []`.
- `git -C /private/tmp/dearme-symphony-workspaces/DEA-13 log -1 --oneline`
  showed DEA-13 started from `4b917f75`.
- `/private/tmp/dearme-symphony-workspaces/DEA-14` was already missing after
  Linear terminal completion, so the useful coordination rule was landed from
  the coordinator checkout.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `not_in_current: 0` and `dirty: 0`.

## DM-183BX Voice Gate Scorer Recovery - 2026-05-10

Product/architecture slice:

- Audited the Symphony/Linear DEA-12 lane after it was marked Done and found
  that its worker workspace had been cleaned before any absorbable branch or
  commit landed on the coordination head.
- Ported the useful Voice Gate direction directly onto the current branch as a
  smaller, safer scorer: concrete first-person private work can pass the
  default `92` floor on the first request, while accepted same-voice samples
  give follow-up drafts a bounded continuity boost.
- Added a hidden-process-language penalty so private work that still names the
  backstage machinery gets blocked before customer review.
- Kept all customer-visible scoring notes in plain DearMe language; blocked
  reasons no longer echo hidden substrate terms such as model/fingerprint,
  runtime, provider, adapter, queue, admin, or donor names.
- Left DEA-13 queued until this recovery slice is committed, so Symphony does
  not spawn another overlapping Voice Gate lane from stale assumptions.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
  passed: 2 files, 14 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `.symphony/bin/dearme-symphony status --json` reported no active or retrying
  workers.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `not_in_current: 0` and `dirty: 0`.

## DM-183BW Symphony Worker Bootstrap Hardening - 2026-05-10

Product/architecture slice:

- Kept Symphony as the DearMe coordinator/worker cooperation spine, but fixed
  the worker workspace bootstrap so new Linear/Symphony lanes do not depend on
  a global `corepack enable` symlink under `/usr/local/bin`.
- Updated `.symphony/WORKFLOW.md` to prefer the existing user-local `pnpm`
  binary, fall back to `corepack pnpm`, and fail with an explicit missing-pnpm
  error only if neither path exists.
- Confirmed the live retrying `DEA-12` lane recovered from the bootstrap
  failure and moved from retrying to running in
  `/private/tmp/dearme-symphony-workspaces/DEA-12`.
- Product direction is unchanged: this only improves the backstage development
  factory. DearMe customer surfaces still speak in team work, decisions,
  private proof, handoff, and launch-call terms.

Verification:

- `git diff --check -- .symphony/WORKFLOW.md` passed.
- `bash -n .symphony/bin/dearme-symphony` passed.
- `.symphony/bin/dearme-symphony status --json` reported `DEA-12` running and
  `retrying: []` after the workflow fix.

## DM-183BV Symphony Work-Event Contract And Residual Worktree Closure - 2026-05-10

Product/architecture slice:

- Made Symphony the active cooperation spine for DearMe coordinator/worker
  collaboration while keeping Symphony, OpenClaw, Paperclip, Naive, Polsia,
  and Lindy as backstage primitives rather than paid-beta customer language.
- Promoted the DearMe workbench stream into a typed work-event contract:
  `action`, `customerSummary`, `artifactTarget`, `decisionNeed`, and
  `traceRefs` now travel from shared validators through the server projection
  so Symphony-style work can become customer-safe decision cards without
  exposing a queue, run id, model, provider, or worker surface.
- Added explicit shared exports for `DEARME_WORK_EVENT_ACTIONS` and
  `DEARME_WORK_EVENT_TRACE_KINDS` so future Symphony workers can reuse the
  same action/trace vocabulary instead of inventing parallel event shapes.
- Recorded exact-head reviewed absorptions for the last residual worktree
  group: DM-084 integration-base audit
  `f4d86752f00127cf9952fc2f1a2760a5baf7f8d9`, DM-086 donor-reuse
  integration `1e408791f3a3bc60fc043dd792bdf95e95b162d6`, DM-095 Work
  Ready summary actions `74775861b00ab26598549b3840e538860bddf845`,
  both DM-097 review/event-smoke heads
  `71c2e1c0022363ad171fdb38e7d4ce17cdc9f069` and
  `4a91c6098407c88493ce7da255b0337e2c8472f3`, DM-098 product-copy leakage
  `60b6fc517d2b463454ffaa98ccd0b7bc1aea8817`, and DM-101 baseline guardrail
  integration `0f6529b6937e806260640331660746779086c915`.
- Mapped DM-084 and DM-101 to the current paid-beta access/spend guardrails,
  private-cycle hard stops, regeneration blockers, and route tests.
- Mapped DM-086 to the current donor-reuse architecture and reuse ledger; it
  is docs-only historical queue context now that Symphony is the cooperation
  spine.
- Mapped DM-095 and both DM-097 heads to the current Work Ready/focused review
  path plus the new typed work-event contract, so review actions stay on the
  existing output-review mutation path.
- Mapped DM-098 to current invite/account/onboarding copy guards that keep
  Paperclip, OpenClaw, Symphony, provider, model, and workspace terms out of
  customer-visible surfaces.

Verification:

- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-workbench-projection.test.ts server/src/__tests__/dearme-paid-beta-access.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/CompanyInvites.test.tsx ui/src/pages/InviteLanding.test.tsx --maxWorkers=1`
  passed for the non-embedded-Postgres files; the embedded-Postgres
  workbench file kept the repo's existing host skip when Postgres init was
  unavailable.
- `pnpm --filter @paperclipai/shared typecheck`,
  `pnpm --filter @paperclipai/server typecheck`, and
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `not_in_current: 0`; the exact DM-084, DM-086, DM-095, DM-097, DM-098, and
  DM-101 heads now classify as `reviewed_absorbed`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  no active or retrying workers.
- `git diff --check -- packages/shared/src/index.ts packages/shared/src/validators/dearme.ts packages/shared/src/validators/index.ts packages/shared/src/validators/dearme.test.ts server/src/services/dearme-workbench.ts ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BU DM-083/089 Learning/Progress/Source Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-083 through DM-089 as
  learning, team-progress, donor-reuse, and Voice & Memory source-ingestion
  absorption work, not fresh replay targets.
- Recorded exact-head reviewed absorptions for DM-083, DM-084, DM-085,
  DM-086, DM-087, both DM-088 workers, and DM-089 in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Mapped DM-083 to the current review-feedback learning path: review comments
  save as `review_feedback` Voice & Memory activity, project through
  customer-safe `feedbackTrace`, and render as `Review preferences`.
- Mapped DM-084 to the current review-learning summary surface without
  restoring the stale separate review-learning service shape.
- Mapped DM-085 to the current next-draft guidance path: saved review feedback
  appears as future private-work guidance and refreshed work acknowledges the
  last feedback before anything public happens.
- Mapped DM-086 to the current donor-reuse architecture docs: Polsia supplies
  choreography, Naive/Paperclip supplies durable substrate, Lindy supplies
  interaction grammar, and Symphony remains the development factory.
- Mapped DM-087 to the current team-progress event projection:
  `team_progress` activity becomes `progress_recorded` workbench progress
  across activity, routine, and spend signals.
- Mapped both DM-088 workers to the current decision-first workstream surface:
  `TeamWorkstreamPanel`, `Team progress map`, `Private progress letter`,
  `See progress`, and `Review work` keep progress visible without exposing
  runtime machinery.
- Mapped DM-089 to the current Voice & Memory source path: paste, private
  link, and import-note inputs flow into source review queues, private source
  shortcuts, and source mutation APIs.
- Left the active DEA-11 Symphony workspace untouched; it remains a separate
  daemon-owned lane while the coordinator reduces stale worker replay pressure
  on the live branch.

Verification:

- `rg -n "dearMeReviewFeedbackMemoryTitle|dearMeReviewFeedbackMemoryBody|review-feedback|review_preferences|reviewPreferences|Review preferences|feedbackTrace|last feedback|review notes as next-draft guidance|review_feedback|reviewFeedback" packages/shared/src/validators/dearme.ts server/src/routes/dearme.ts server/src/services/dearme-workbench.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  confirmed the current review-feedback learning and preference surfaces are
  present.
- `rg -n "DearMeWorkbenchWorkEvent|workEvents|work events|workEvent|team_progress|progress_recorded|TeamWorkstreamPanel|Team progress map|Private progress letter|See progress|Review work" packages/shared/src/validators/dearme.ts server/src/services/dearme-workbench.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  confirmed the current work-event and progress surfaces are present.
- `rg -n "sourceInputMode|DEARME_MEMORY_SOURCE_INPUT_MODES|sourceReviewQueue|Source review|Source path|Source type|Voice & Memory source path|import_note|link|manual_note|recordMemoryUpdate|updateMemorySource|archiveMemorySource|restoreMemorySource" packages/shared/src/validators/dearme.ts server/src/routes/dearme.ts server/src/services/dearme-workbench.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  confirmed the current typed Voice & Memory source-ingestion path is present.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-workbench-projection.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed for 4 test files with 97 tests; the embedded-Postgres
  `server/src/__tests__/dearme-workbench.test.ts` file skipped 5 tests on this
  host after the repo's existing Postgres init guard reported code 1.
- `pnpm --filter @paperclipai/shared typecheck`,
  `pnpm --filter @paperclipai/server typecheck`, and
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=140`
  showed the exact DM-083 through DM-089 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 106`, `not_in_current: 7`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BT DM-064/078 Chat/Issue Surface Safety Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-064 through DM-078 as
  issue-chat, activity-history, issue-sidebar, and markdown-reference
  absorption work, not fresh replay targets.
- Recorded exact-head reviewed absorptions for DM-064 through DM-078 in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Mapped DM-064 to the current DearMe issue-chat run projection: linked runs
  render as DearMe team work updates, DearMe issues do not link customers to
  shared run routes, and generic issue-chat behavior stays unchanged.
- Mapped DM-065 to the current DearMe transcript projection: hidden run
  transcripts collapse to assistant-visible text and DearMe-owned placeholders
  instead of exposing tool, reasoning, run, or metadata surfaces.
- Mapped DM-066 to the current DearMe work-history surface: activity and run
  history hides raw run ids, agent links, model-profile details, liveness
  substrate failures, and issue cost summaries for DearMe issues.
- Mapped DM-067 to the current activity-event projection: DearMe activity rows
  use DearMe team language instead of agent ids, raw action names, run ids, or
  substrate details.
- Mapped DM-068 to the current issue-detail workspace boundary: DearMe issues
  do not show the generic workspace control card while generic issues still do.
- Mapped DM-069 to the current scheduled follow-up card: DearMe issues show
  product-owned review language and hide monitor notes, service names, attempt
  counts, and check-now wording.
- Mapped DM-070 to the current issue properties boundary: DearMe issues hide
  the generic properties panel, mobile drawer, and toolbar entries until a
  DearMe-owned settings surface exists.
- Mapped DM-071 to the current issue tree boundary: DearMe issues hide generic
  subissue pause and tree controls while generic issue tree behavior remains.
- Mapped DM-072 to the current live-indicator boundary: DearMe issues hide
  generic live-run indicators and child live markers.
- Mapped DM-073 to the current identifier boundary: DearMe issue headers do not
  expose raw issue identifiers while generic issue identifiers remain available.
- Mapped DM-074 to the current plugin-slot boundary: DearMe issues keep generic
  issue plugin surfaces out of the customer detail view.
- Mapped DM-075 to the current status/priority boundary: shared issue state
  controls are read-only on DearMe issues until DearMe-owned decision controls
  exist.
- Mapped DM-076 to the current subissue-list boundary: generic subtask surfaces
  and controls stay out of DearMe issue detail through the shared plugin gate.
- Mapped DM-077 to the current related-work boundary: DearMe issues hide
  related-work tabs and redirects while generic issue navigation remains.
- Mapped DM-078 to the current markdown-reference boundary: DearMe chat and
  document markdown do not link raw issue references while generic issue-link
  rendering remains available.
- Left the active DEA-11 Symphony workspace untouched; it remains stale against
  the current branch until closed and rebuilt from the live head.

Verification:

- `git log --oneline --max-count=80`
  showed the live same-subject commits `83e2bc13`, `bf608910`, `3f169c53`,
  `e484dc6c`, `9a9b833d`, `e4c4b589`, `c2586e6e`, `94f97de5`,
  `b56eed6f`, `207448a3`, `25a2fb17`, `d827cc22`, `1967900f`,
  `997c2f92`, `019bc63a`, and `b2e00db6` on the current branch.
- `rg -n "dearMeRunPlaceholderText|buildAssistantPartsFromTranscript|createHistoricalRunMessage|createHistoricalTranscriptMessage|createLiveRunMessage|hideRunSubstrateDetails|DearMe team|work update|work history|modelProfileForRun|runDurationLabel" ui/src/lib/issue-chat-messages.ts ui/src/lib/issue-chat-messages.test.ts ui/src/components/IssueChatThread.tsx ui/src/components/IssueChatThread.test.tsx ui/src/components/IssueRunLedger.tsx ui/src/components/IssueRunLedger.test.tsx ui/src/pages/IssueDetail.tsx ui/src/pages/IssueDetail.test.tsx`
  confirmed the current chat, transcript, and activity-history safety surfaces
  are present.
- `rg -n "formatDearMeActivityAction|hideSubstrateDetails=\\{hideRunSubstrateDetails\\}|Follow-up scheduled|Next review|DearMe will review this again automatically|Refresh now|IssueWorkspaceCard|showIssuePluginSurfaces|showIssueRelatedWorkTab|showProperties=\\{!isDearMeDetailIssue\\}|activePauseHold|canShowSubIssueControls|showIssueLiveRunIndicator|visibleLiveIssueIds|issueHeaderIdentifier|canEditIssueHeaderState|linkIssueReferences" ui/src/pages/IssueDetail.tsx ui/src/pages/IssueDetail.test.tsx ui/src/components/IssueMonitorActivityCard.tsx ui/src/components/IssueMonitorActivityCard.test.tsx ui/src/components/IssueChatThread.tsx ui/src/components/IssueChatThread.test.tsx ui/src/components/IssueDocumentsSection.tsx ui/src/components/IssueDocumentsSection.test.tsx`
  confirmed the current activity-event, workspace-card, follow-up-card,
  properties, tree, live-indicator, identifier, state, related-work, plugin,
  and markdown-reference boundaries are present.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm exec vitest run ui/src/lib/issue-chat-messages.test.ts ui/src/components/IssueChatThread.test.tsx ui/src/components/IssueRunLedger.test.tsx ui/src/components/IssueMonitorActivityCard.test.tsx ui/src/components/IssueDocumentsSection.test.tsx ui/src/pages/IssueDetail.test.tsx --maxWorkers=1`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=120`
  showed the exact DM-064 through DM-078 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 98`, `not_in_current: 15`, and `dirty: 0`.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BS DM-059/063 Approval Error/Reject Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-059 through DM-063 as
  a bounded approval error and route-safety absorption batch.
- Recorded exact-head reviewed absorptions for DM-059, DM-060, DM-061,
  DM-062, and DM-063 in `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Confirmed the current head already carries the useful DM-059 through DM-062
  behavior: approval detail actions, list/inbox approval failures, issue-detail
  approval failures, and comment-thread approval links all route through shared
  DearMe approval helpers while preserving generic approval behavior.
- Closed the residual DM-063 shape gap by centralizing post-rejection DearMe
  navigation in `approvalRejectedHref` and using it from both the approval list
  and inbox mutation success paths.
- Left the active DEA-11 Symphony workspace untouched; it remains a separate
  daemon-owned lane.

Verification:

- `rg -n "approvalDetailHref|approvalResolvedHref|approvalRejectedHref|approvalActionErrorMessage|approvalListActionErrorMessage|Failed to update the DearMe decision|Failed to post your note" ui/src/lib/dearmeApprovals.ts ui/src/lib/dearmeApprovals.test.ts ui/src/pages/ApprovalDetail.tsx ui/src/pages/ApprovalDetail.test.tsx ui/src/pages/Approvals.tsx ui/src/pages/Inbox.tsx ui/src/pages/Inbox.test.tsx ui/src/pages/IssueDetail.tsx ui/src/pages/IssueDetail.test.tsx ui/src/components/CommentThread.tsx ui/src/components/CommentThread.test.tsx`
  confirmed the shared approval helpers and customer-safe approval surfaces are
  present.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/pages/ApprovalDetail.test.tsx ui/src/pages/Inbox.test.tsx ui/src/pages/IssueDetail.test.tsx ui/src/components/CommentThread.test.tsx --maxWorkers=1`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=115`
  showed the exact DM-059 through DM-063 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 83`, `not_in_current: 30`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json ui/src/lib/dearmeApprovals.ts ui/src/lib/dearmeApprovals.test.ts ui/src/pages/Approvals.tsx ui/src/pages/Inbox.tsx`
  passed.

## DM-183BR DM-051/058 Approval Surface Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-051 through DM-058 as
  current-head approval/error surface absorption work, not fresh replay
  targets.
- Recorded exact-head reviewed absorptions for DM-051, DM-052, DM-053,
  DM-054, DM-055, DM-056, DM-057, and DM-058 in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Mapped DM-051 and DM-052 to the live shared DearMe approval helper,
  product-owned ApprovalDetail breadcrumbs, structured approval payloads, and
  DearMe-owned approval card decision routing.
- Mapped DM-053 through DM-057 to the current inbox, activity, issue-detail,
  approvals-list, and approval-detail action paths, all of which route DearMe
  approval decisions back to the DearMe surface while leaving generic approval
  flows unchanged.
- Closed the residual DM-053 inbox-search gap: DearMe approval rows now match
  product labels but not raw DearMe approval type identifiers, while generic
  approval type search remains available.
- Mapped DM-058 to the current DearMe-only internal error sanitizer and tests
  for inherited substrate names, model/token wording, execution routes, API key
  wording, and decision routes.
- Left the active DEA-11 Symphony workspace untouched; it remains a separate
  daemon-owned lane.

Verification:

- `rg -n "approvalDetailHref|approvalResolvedHref|approvalActionErrorMessage|approvalListActionErrorMessage|DearMe team|Decision approved|Decision sent back|execution route|decision route|api[-_ ]?key|token" ui/src/lib/dearmeApprovals.ts ui/src/pages/ApprovalDetail.tsx ui/src/pages/Approvals.tsx ui/src/pages/Inbox.tsx ui/src/pages/IssueDetail.tsx ui/src/components/ActivityRow.tsx ui/src/components/ApprovalCard.tsx ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  confirmed the current shared approval helper, approval surfaces, and DearMe
  sanitizer evidence are already present.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm exec vitest run ui/src/pages/Inbox.test.tsx --maxWorkers=1 -t "matchesInboxApprovalSearch"`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=105`
  showed the exact DM-051 through DM-058 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 78`, `not_in_current: 35`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json ui/src/pages/Inbox.tsx ui/src/pages/Inbox.test.tsx`
  passed.

## DM-183BQ DM-048/050 Route/Profile Boundary Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-048 through DM-050 as
  current-head absorption work, not fresh replay targets.
- Recorded exact-head reviewed absorptions for DM-048, DM-049, and DM-050 in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Mapped DM-048 to the live DearMe route error boundary, which converts shared
  auth, access, and validation failures into DearMe-owned messages before they
  reach the customer.
- Mapped DM-049 to the live Brand OS approval preflight path, which validates
  DearMe approval payloads before mutation and keeps malformed approvals
  pending with a refresh message.
- Mapped DM-050 to the current onboarding profile guard, where missing profile
  state says `Choose a DearMe profile first.` instead of inherited company
  selection copy.
- Left the active DEA-11 Symphony workspace untouched; it remains a separate
  daemon-owned lane.

Verification:

- `rg -n "dearMeRouteErrorBoundary|normalizeDearMeRouteError|This DearMe profile is not available|This DearMe approval needs to be refreshed|validateDearMeBrandBlueprintApplyPayload|Choose a DearMe profile first|Select a company first" server/src ui/src docs/dearme tests`
  confirmed the current route, approval, and onboarding boundaries are already
  present.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=95`
  showed the exact DM-048, DM-049, and DM-050 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 70`, `not_in_current: 43`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BP DM-043/047 Customer-Safe Projection Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and treated DM-043 through DM-047 as
  reviewed residue, not fresh implementation targets, because their useful
  customer-safe boundary value is already present on the current branch.
- Recorded exact-head reviewed absorptions for DM-043, DM-044, DM-045,
  DM-046, and DM-047 in `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Mapped DM-043 to the current Voice & Memory context normalization path
  instead of restoring the stale `dearme-voice-memory-grounding` service.
- Mapped DM-044 and DM-045 to the current Workbench memory/output projection
  tests and customer-safe projection helpers instead of adding a second
  customer-safe mapper.
- Mapped DM-046 and DM-047 to the current DearMe onboarding error boundary
  tests for source mutations, Brand OS preview/start, and focused review
  actions instead of replaying old UI error patches.
- Left the active DEA-11 Symphony workspace untouched; it remains a separate
  lane until closed or advanced by the daemon.

Verification:

- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=90`
  showed the exact DM-043, DM-044, DM-045, DM-046, and DM-047 heads as
  `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 67`, `not_in_current: 46`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/INDEX.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json tests/e2e/dearme-private-handoff.spec.ts`
  passed.

## DM-183BO / DEA-11 Private Launch Handoff Browser Proof - 2026-05-10

Product/architecture slice:

- Treated DEA-11 as a launch-handoff proof on the current DearMe coordination
  head, not as a blind merge from the stale Symphony workspace that started at
  `1712f83a`.
- Added a browser/API smoke test for the real approval sequence: prepared
  content draft review approval creates a pending `dearme_output_next_move`
  launch call, Workbench exposes the pending `approve_action`, final approval
  records the private handoff readiness receipt, and the DearMe decision route
  renders the customer-facing private handoff panel.
- Kept the value on the existing output handoff, approval, Workbench, and
  focused decision route. No new first-run contract, packet schema, runtime
  dashboard, or customer-visible queue was introduced.
- Locked the customer boundary: the private handoff panel stays on DearMe
  `work=` / `artifact=` navigation after opening the brief, does not fall back
  to raw issue URLs, and the tested customer-facing handoff copy excludes
  hidden substrate terms.

Verification:

- Initial E2E run failed before assertions because the local PostgreSQL test
  database `dearme_e2e_private_handoff` did not exist.
- `createdb dearme_e2e_private_handoff || true` prepared the throwaway local
  test database.
- `DATABASE_URL=postgres://peter@127.0.0.1:5432/dearme_e2e_private_handoff pnpm exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/dearme-private-handoff.spec.ts --project=chromium`
  passed: 1 browser test.

## DM-183BN DM-031/042 Symphony Absorption Cleanup - 2026-05-10

Product/architecture slice:

- Treated Symphony as the cooperation spine and confirmed the live daemon is
  active before touching coordinator docs. The current worker lane is DEA-11 in
  `/private/tmp/dearme-symphony-workspaces/DEA-11`, so this pass avoided its
  files and reduced stale worker ambiguity from the coordinator branch.
- Recorded exact-head reviewed absorptions for DM-031, DM-032, DM-033,
  DM-034, DM-035, DM-036, DM-037, DM-038, DM-040, DM-041, and DM-042 in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Kept the useful product value from those branches on the current DearMe
  surface: prepared-by team attribution, customer-safe `work=` and
  `artifact=` focused decision links, compact but specific work-card actions,
  customer-owned review/count copy, natural decision notes, missing-context
  guidance, and product-safe error boundaries.
- Replayed the still-useful DM-037 copy cleanup only where current customer UI
  still exposed stale loop wording: the operating policy panel now says
  `Stops repeat work` and counts repeated `path`s instead of stale loops.
- Did not import old worker schemas, route shapes, or donor/runtime vocabulary.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=80`
  showed the exact DM-031, DM-032, DM-033, DM-034, DM-035, DM-036, DM-037,
  DM-038, DM-040, DM-041, and DM-042 heads as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported
  `reviewed_absorbed: 62`, `not_in_current: 51`, and `dirty: 0`.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-11 worker and no retrying workers.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BM DM-028/039 Voice & Memory Assignment Brief Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and compared the exact DM-028 and
  DM-039 worker heads against the coordinator checkout before replaying code.
- Absorbed DM-028 source-reference-briefs head
  `dd3f3503b00793e2da8acedcf8bba8d87ee01baf` onto the current
  `dearme-memory-brief.ts` architecture. Hidden DearMe assignment briefs now
  carry valid http/https private source links as reference lines while dropping
  non-web links from the worker context.
- Absorbed DM-039 output-scoped-memory-brief head
  `ad7275f9c7362118594205bb761748933ba9e441` onto the current activity-log
  memory path. Heartbeat now maps DearMe issue origin fingerprints to output
  kinds so content drafts, weekly reports, opportunity drafts, and other
  private assignments receive the most relevant Voice & Memory first.
- Kept the change private to worker task context. No customer-facing UI,
  schema, route, or Symphony runtime surface changed.
- Recorded both exact heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony patrols
  close them as reviewed absorption candidates unless the branches advance.

Verification:

- `pnpm exec vitest server/src/__tests__/dearme-memory-context.test.ts server/src/__tests__/heartbeat-dearme-voice-memory.test.ts --run`
  passed: 2 files, 7 tests passed, 4 embedded-Postgres tests skipped because
  the host init script exited with code 1.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check` passed.

## DM-183BL DM-022/027/029/030 UI Worker Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and compared the exact DM-022,
  DM-027, DM-029, and DM-030 worker heads against the coordinator checkout
  before deciding whether to replay code.
- Reviewed DM-022 workstream-proof-feed head
  `86a3078d6b5079b5b228792f78a8257f72478f9f`. Current DearMe already carries
  the useful progress-proof value through the evolved `Live proof feed`,
  customer-safe action cards, proof-pack summaries, and inline review routing,
  so the older Team work stream UI was not restored.
- Reviewed DM-027 preserve-output-focus head
  `4aa7e0975b162421b69515d2935b77cc507bee44`. Current focused review routes
  preserve output identity through artifact-aware parsing and output-aware
  batch, report, live-feed, and prepared-work actions, so the old
  `output=`-only route patch is superseded.
- Reviewed DM-029 first-cycle-copy head
  `9b7994ccee1f641a32d95282be4a35e3b8573119`. Current first-cycle copy already
  uses `Working rhythm` and `First private work`, with tests guarding against
  stale machinery/operations language.
- Reviewed DM-030 review-boundary-cards head
  `11145f2d569c95e4035290d8ef2b83f3d5c672c2`. Current focused decision,
  batch, Work Ready, and output-detail surfaces already expose launch
  boundaries, review handoff cards, and in-place prepared-work review controls;
  the older compact Review boundary card would duplicate current UI.
- Recorded all four exact heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony patrols
  close them as reviewed absorption candidates unless the branches advance.

Verification:

- `pnpm run dearme:worktrees -- --ticket=DM-022 --skip-dirty --limit=20`
  reported the DM-022 worker branch as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --ticket=DM-027 --skip-dirty --limit=20`
  reported the DM-027 worker branch as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --ticket=DM-029 --skip-dirty --limit=20`
  reported the DM-029 worker branch as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --ticket=DM-030 --skip-dirty --limit=20`
  reported the DM-030 worker branch as `reviewed_absorbed`.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-9 worker in review and no retrying workers.
- `git diff --check` passed.
- `git diff --cached --check` passed.

Known gap:

- No product code changed in this slice. The current UI evidence was inspected
  directly, but UI tests were not rerun for this docs/ledger absorption pass.

## DM-183BK DM-026 Live Proof Feed Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and reviewed the exact DM-026 worker
  heads against the coordinator checkout before replaying code.
- Reviewed DM-026 team-proof-feed-refresh head
  `98fe35fdc00ed61a5dacab198af3276e34e77aa5`. Current DearMe already carries
  the durable product value through the `Live proof feed` panel, customer-safe
  action cards, proof-pack summaries, inline review controls, and `/dearme`
  review routing.
- Reviewed DM-026 unify-workstream-review head
  `8ad8eac6578e9fbf778ac0f081bfcb192d150e37`. The current BUILD-STATE,
  reuse ledger, absorption ledger, and Symphony worktree summary already make
  the integration state explicit without importing a stale merge-queue doc.
- Recorded both exact heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony patrols
  close them as reviewed absorption candidates unless the branches advance.

Verification:

- `pnpm run dearme:worktrees -- --ticket=DM-026 --skip-dirty --limit=20`
  reported both DM-026 worker branches as `reviewed_absorbed`.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  one active DEA-9 worker in review and no retrying workers.
- `git diff --check` passed.
- `git diff --cached --check` passed.

Known gap:

- No UI tests were rerun for this slice because no product code changed; this
  is a ledger/docs absorption of stale DM-026 worker heads.

## DEA-9 Repeatable Review-Memory Browser Smoke - 2026-05-10

Product/architecture slice:

- Reused the existing output handoff, focused prepared-work review controls,
  continue-output route, report document bridge, and feedback receipt path for
  the repeatable review-memory loop.
- Added a browser/API smoke proving a paid-beta customer can start the first
  private cycle, request another pass on the weekly report, update the same Dear
  me report document, and return to the focused Work Ready review path with
  `Feedback applied` receipts visible.
- Tightened output status derivation so stale `changes_requested` or
  `not_useful` work products no longer keep an output in revision-requested
  state after newer private work exists for the latest feedback.
- Kept the product surface DearMe-owned: no new first-run contract, review
  schema, runtime dashboard, agent admin UI, or customer-visible donor/runtime
  vocabulary.

Verification:

- `pnpm typecheck` passed.
- `DATABASE_URL=postgres://peter@127.0.0.1:5432/dearme_e2e_review_memory npx playwright test --config tests/e2e/playwright.config.ts tests/e2e/dearme-repeatable-review-memory.spec.ts --project=chromium`
  passed: 1 test.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts`
  was attempted earlier on this host and skipped the embedded Postgres suite
  because the Postgres init script exited with code 1; the external-Postgres
  browser smoke covers the same repeatable review-memory path end to end.

Known gap:

- This proves the current packet-backed review loop, not public send/deploy or
  paid external execution. Those remain behind the existing approval boundary.

## DM-183BJ DM-021/DM-023 Worker Absorption And Review Freshness - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and compared the exact DM-021 and
  DM-023 worker heads against the coordinator checkout instead of replaying
  stale branches.
- Reviewed DM-021 live-events head
  `71f954430914ac8682d830e27d615002afe29152`. Current
  `LiveUpdatesProvider` already carried the Workbench/output/Brand OS live
  invalidation path; Voice & Memory now lives inside the Workbench memory
  projection, so the stale standalone `voice-memory` query key was not revived.
- Tightened output review freshness so an old `changes_requested` work product
  no longer keeps prepared work in revision-requested state after newer private
  documents or updates exist.
- Reviewed DM-021 source-restore head
  `1b0309ae16d7687371637259a1d3ac08cdcb87da`. Current Voice & Memory already
  exposes customer-controlled restore through the activity-log
  `/memory-updates/:memoryId/restore` route, Workbench `memory.archived`
  projection, API client, onboarding UI, and tests.
- Reviewed DM-023 source-context head
  `0d8c71b9da2e57816696a813b93be3d23ec05adf`. Current prepared-work cards and
  focused review use the richer `OutputSourceEvidenceList` / `sourceEvidence`
  path, so the old compact source-context preview is superseded.
- Recorded all three exact heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony patrols stop
  reopening them as replay candidates unless the branches advance.

Verification:

- `pnpm exec vitest run src/context/LiveUpdatesProvider.test.ts --config
  vitest.config.ts` passed from `ui/`: 17 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts
  --maxWorkers=1` skipped 10 embedded Postgres tests because this host's
  Postgres init script exited with code 1.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed: 13 tests.
- `pnpm run dearme:worktrees -- --ticket=DM-021 --skip-dirty --limit=20`
  reported both DM-021 worker branches as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --ticket=DM-023 --skip-dirty --limit=20`
  reported the DM-023 source-context branch as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees with 43 `reviewed_absorbed`, 70 `not_in_current`, 16
  `subject_matched`, and dirty 0.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  no running or retrying workers.
- `git diff --check` passed.

Known gap:

- Browser websocket smoke is not part of this narrow review-freshness and
  ledger absorption slice.

## DM-183BI DM-020 Approved Brand OS Seed Brief Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and used the coordinator checkout as
  the integration surface rather than merging stale worker branches.
- Reviewed exact DM-020 seed-brief head
  `ac6eeecf6ab2634ef4b6667c6da79e7cb86b5eb6` and work-ready cockpit head
  `49762397fe4bada59266fb0d60c45e0bc5d02045`.
- Adapted the useful seed-brief intent onto the current Brand OS approval apply
  path: when `autoDraftEnabled` is true, approving Brand OS now seeds
  `starter-posts`, `opportunity-list`, `portfolio-update`, and
  `dear-me-report` issue documents from the existing first-cycle preview.
- Kept the disabled auto-draft path queue-only: it still creates the Brand OS,
  Voice Profile, Approval Gates, and weekly Dear me report documents without
  preparing content/opportunity/portfolio work for review.
- Reused the existing output handoff. The seeded documents now make content,
  opportunity, and portfolio outputs `ready_for_review` without adding another
  runtime, route, schema, or customer-facing Symphony surface.
- Recorded both exact DM-020 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony patrols stop
  treating them as unresolved replay candidates unless the branches advance.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts
  server/src/__tests__/dearme-brand-blueprint-apply.test.ts --maxWorkers=1`
  passed the shared validator file: 16 tests passed. The embedded Postgres
  Brand OS apply suite was skipped by Vitest because this host's embedded
  Postgres init script exited with code 1.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed: 13 tests passed.
- `pnpm run dearme:worktrees -- --ticket=DM-020 --skip-dirty --limit=20`
  reported both DM-020 worker branches as `reviewed_absorbed`, dirty 0.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed:
  DearMe worktrees 117 total, dirty 0, reviewed absorbed 40.
- `.symphony/bin/dearme-symphony status --json` reported Symphony running with
  no running or retrying workers.
- `git diff --check` passed.

Known gap:

- `pnpm exec prettier --write ...` was attempted before verification, but
  Prettier is not installed in this workspace. No dependency was added.
- Browser smoke is not part of this narrow backend/contract absorption unless a
  later UI change requires it.

## DM-183BH DM-019 Source-Grounded Draft Absorption - 2026-05-10

Product/architecture slice:

- Kept Symphony as the cooperation spine and used the coordinator checkout as
  the integration surface rather than starting a parallel runtime.
- Reviewed exact DM-019 worker head
  `5e7eb23bec5cfbea6db915ce629d30a4f955e1db`.
- Adapted the useful worker intent to the current DearMe memory architecture:
  active `dearme.memory_updated` rows are selected once, sanitized once, and
  reused for hidden assignment briefs plus output-card source evidence.
- Extracted the shared Voice & Memory renderer into
  `server/src/services/dearme-memory-brief.ts` instead of replaying the stale
  `dearme-voice-memory-grounding.ts` / `reviewContext` branch model.
- Hidden DearMe heartbeat assignments now query the current active Voice &
  Memory rows directly and render a sanitized brief through the shared helper,
  so future private drafts start from saved voice/proof/context without
  exposing runtime vocabulary or introducing a heartbeat/memory-context import
  cycle.
- DearMe output cards now prefer an active Voice & Memory source summary in
  `sourceEvidence` before falling back to document/work-product details, making
  prepared work feel grounded in the user's saved private sources.
- Recorded the exact DM-019 worker head in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony patrols stop
  reopening the stale branch as fresh work.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with daemon pid `89569`,
  dashboard `http://127.0.0.1:4100/`, and no running or retrying workers.
- `pnpm exec vitest run server/src/__tests__/heartbeat-task-markdown.test.ts server/src/__tests__/dearme-memory-context.test.ts server/src/__tests__/heartbeat-dearme-voice-memory.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed for non-embedded suites: 3 files passed, 1 embedded Postgres file
  skipped; 8 tests passed, 14 skipped.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed, 13 tests.
- `pnpm run dearme:worktrees -- --ticket=DM-019 --skip-dirty --limit=20`
  passed and showed both DM-019 worktrees as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 38`, `not_in_current: 75`, and `dirty: 0`.
- `git diff --check` passed.

Known gap:

- The embedded Postgres DearMe memory/output-handoff tests skipped on this
  host because the Postgres init script exited with code 1, matching the
  existing local test-environment limitation.

## DM-183BG Integrated Baseline Absorption Follow-Up - 2026-05-10

Coordination slice:

- Kept the live Symphony daemon idle and used the coordinator checkout as the
  integration surface instead of starting another worker.
- Reviewed the matching old DM-014 through DM-018 integration branch heads and
  recorded them as exact-head `reviewed_absorbed` baselines in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`.
- Recorded heads: DM-014 `75458d807fc7ff3e35a51a860b1d8d6171e814b9`,
  DM-015 `5a09b4d33cacad22648cbabe3ba1acd61989dfa8`, DM-016
  `16fa8fb804baae650f76da19792279761a4e8e7c`, DM-017
  `2029081240bd186841b5f0bd5b8440ade613712b`, and DM-018
  `94c3b4c6a011db105cbde28b2a01e448350e2804`.
- Kept those heads out of the replay lane because the current DearMe product
  already carries their useful mobile shell, output detail, source
  traceability, Brand OS apply-gate, and source archive behavior through newer
  surfaces.
- Updated `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` so future Symphony
  workers do not reopen those old integration baselines as fresh product work.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with daemon pid `89569`,
  dashboard `http://127.0.0.1:4100/`, and no running or retrying workers.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('ledger json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed, 13 tests.
- `pnpm run dearme:worktrees -- --status=not_in_current --skip-dirty --limit=20`
  passed and no longer lists DM-014 through DM-018 integration heads.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 37`, `not_in_current: 76`, and `dirty: 0`.
- `git diff --check` passed.

## DM-183BF DM-013 Private Handoff Readiness Absorption - 2026-05-10

Product/UI slice:

- Kept Symphony as the cooperation spine and verified the live daemon before
  closing the next handoff-surface worktree.
- Reviewed exact DM-013 heads `2673975d3d30d7ee11c2a8384b358b887e5f1d56`
  and `39480533a8a26db86858cc053edd0ec8f77ff04c`.
- Reused the current `execution_handoff_prepared` Workbench progress item and
  the existing DearMe decision/brief route instead of adding another execution
  route, queue, or runtime surface.
- Added shared schema coverage for `private_handoff_ready`, next-step copy,
  output/approval references, and customer-safe handoff progress.
- Kept the compact Workbench handoff panel on the current page surface: it
  shows the artifact, next step, private brief link, and `External action not
  run` boundary.
- Recorded both exact DM-013 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony patrols stop
  treating them as unresolved development candidates.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with daemon pid `89569`,
  dashboard `http://127.0.0.1:4100/`, and no running or retrying workers.
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed, 82 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed, 13 tests.
- `pnpm run dearme:worktrees -- --ticket=DM-013 --skip-dirty --limit=20`
  passed and showed both DM-013 worktrees as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 32`, `not_in_current: 81`, and `dirty: 0`.
- `git diff --check` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  was attempted, but both embedded Postgres suites skipped on this host because
  their Postgres init script exited with code 1.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

## DM-183BE DM-012 Private Handoff Surface Absorption - 2026-05-10

Product/UI slice:

- Kept Symphony as the cooperation spine and treated DM-012 as the next
  follow-on to the just-landed final-approval receipt path.
- Reviewed exact DM-012 heads `17f7581057b5c15f8fc7fb4cb4f3ba4f5182f6ad`
  and `b6bfffb45c558c852d27ce3b5f85d4801e0a7027`.
- Reused the current `execution_handoff_prepared` progress item instead of
  creating a separate execution queue, route, or runtime surface.
- Added a focused DearMe Workbench panel for the private handoff after final
  approval, showing the artifact, "external action not run" boundary, next
  step, and a DearMe-owned private brief link.
- Exported the shared handoff readiness constant through the shared package
  entry points so UI and future workers can consume the typed read model.
- Reused the receipt service's `DEARME_NEXT_MOVE_APPROVAL_TYPE` from output
  handoff code so the final-approval type stays owned by one service boundary.
- Recorded both exact DM-012 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony patrols stop
  treating them as unresolved development candidates.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "surfaces private handoff readiness"`
  passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run dearme:worktrees -- --ticket=DM-012 --skip-dirty --limit=20`
  passed and showed both DM-012 worktrees as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 30`, `not_in_current: 83`, and `dirty: 0`.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  was attempted, but the embedded Postgres suite skipped on this host because
  the Postgres init script exited with code 1.

## DM-183BD DM-011 Final Approval Receipt Absorption - 2026-05-10

Coordination slice:

- Kept Symphony as the cooperation spine and verified the live daemon before
  absorbing the next not-in-current approval branch.
- Reviewed exact DM-011 heads `3194402b69e489d053e03d2e82a511092cc45788`
  and `b04a2c1dc849e033c925f51a2a465c84a736f0e9`.
- Reused the current `dearme_output_next_move` approval gate instead of
  replaying the stale branch as another approval/runtime surface.
- Added a DearMe approval receipt service that records the final approval as
  customer-safe activity, writes issue comments for the private record, and
  prepares the internal execution handoff without claiming anything external
  has been published, sent, deployed, or spent.
- Projected the approval receipt and private handoff through the existing
  Workbench progress/work-stream read model, and suppressed the stale prepared
  work review decision once its final next-move approval is recorded.
- Recorded both exact DM-011 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony worktree patrols
  stop treating them as unresolved development candidates.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `pnpm exec vitest run server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
  passed the approval route suite; the embedded Postgres workbench suite
  skipped on this host because its Postgres init script exited with code 1.
- `pnpm exec vitest run server/src/__tests__/dearme-approval-receipts.test.ts --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 28`, `not_in_current: 85`, and `dirty: 0`.

## DM-183AS-A Review Receipt API/Cache Proof - 2026-05-10

Product proof slice:

- Kept Symphony healthy and idle before taking `DEA-10` back into the
  coordinator lane instead of spawning another high-token worker.
- Reused the current focused prepared-work review controls, output continuation
  API, shared DearMe output schema, and React Query output cache.
- Added regression coverage for the `prepare_another_pass` path so a returned
  private output carrying `reviewLoop.feedbackTrace.receipts` immediately
  replaces the cached output list while the next output refresh is still
  pending.
- Proved the focused Work Ready / review path keeps the customer-visible
  `Feedback applied` receipt visible and does not fall back to private issue
  routes.
- Kept `DEA-9` / `DM-183AS` as the broader browser/API smoke lane; this slice is
  the narrow API/cache proof under that product loop, not a second review
  surface.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "keeps review-memory receipts in the focused output cache"`
  passed.
- `pnpm exec vitest run ui/src/api/dearme.test.ts packages/shared/src/validators/dearme.test.ts --maxWorkers=1`
  passed.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "focused private output|review-memory receipts|review handoff|focused private work"`
  passed.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 26`, `not_in_current: 87`, and
  `dirty: 0`.
- `git diff --check`
  passed.
- Full `pnpm test:run`, full `pnpm -r typecheck`, and build were not rerun for
  this narrow test/docs proof slice.

## DM-183BC DM-010 Final Approval Baseline Absorption - 2026-05-10

Coordination slice:

- Kept Symphony as the cooperation spine and checked the live daemon before
  closing the next not-in-current integration candidate.
- Reviewed exact DM-010 heads `47b2c5815b968451a93b6c9f3eeb734f1f2406ba`
  and `732244956a8688cb8133b2ea31433186d386c241`.
- Confirmed current DearMe already carries the useful DM-010 product boundary:
  approving private work creates a separate `dearme_output_next_move` final
  approval before publish, send, deploy, spend, or next-cycle action.
- Matched that boundary to the current shared approval type, output handoff,
  workbench decision projection, approval payload, focused DearMe decision
  route, and regression coverage.
- Rejected replaying the stale DM-010 branch code because DM-183AJ and later
  review-loop hardening already cover the product behavior on the current
  server/UI spine.
- Recorded both exact DM-010 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so Symphony worktree patrols
  stop treating them as unresolved development candidates.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 26`, `not_in_current: 87`, and `dirty: 0`.
- `pnpm run test:dearme-worktrees` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.

## DM-183BB Review Feedback Regeneration Brief - 2026-05-10

Product/runtime slice:

- Kept Symphony as the active cooperation spine and verified the daemon before
  absorbing the next review-loop gap.
- Reused the current output-review decision comments instead of adding another
  review-feedback service, schema, or customer-facing queue.
- Exported the existing DearMe review-decision parser and artifact-title
  lookup so heartbeat runs can recognize the latest private-review decision.
- Added a regeneration brief to the hidden heartbeat task context when a
  DearMe brand-blueprint output has a latest `request_changes`, `regenerate`,
  or `not_useful` decision.
- Reused the output-review loop's stale-feedback and retry-cap semantics so
  heartbeat does not keep replaying old critique after a newer private draft
  exists or after the review path should pause for sharper direction.
- The next worker sees the user feedback, previous private draft context, and a
  product-safe next-draft direction before drafting again; approvals do not
  create regeneration briefs.
- Recorded the exact DM-008 heads as absorbed into this regeneration-brief
  path and the exact DM-009 heads as already absorbed by the existing applied
  feedback trace.

Verification:

- `.symphony/bin/dearme-symphony status --json` passed with the daemon healthy
  and no retrying workers.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees` passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and
  reported `reviewed_absorbed: 24`, `not_in_current: 89`, and `dirty: 0`.
- `pnpm exec vitest run server/src/__tests__/dearme-output-regeneration-brief.test.ts server/src/__tests__/heartbeat-task-markdown.test.ts --maxWorkers=1`
  passed with 9 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-output-handoff.ts server/src/services/heartbeat.ts server/src/__tests__/dearme-output-regeneration-brief.test.ts server/src/__tests__/heartbeat-task-markdown.test.ts docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/WORKTREE-ABSORPTION-LEDGER.json`
  passed.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  was attempted, but the embedded Postgres suite skipped on this host because
  the Postgres init script exited with code 1 before running the 9 DB-backed
  tests.

## DM-183BA Review Outcome Memory Baseline Absorption - 2026-05-10

Coordination slice:

- Kept Symphony as the active cooperation spine and checked the live daemon
  before absorbing another stale worker pair.
- Reviewed the exact DM-007 worker head
  `d1bf8431b0027747a9a384a307848324dc99741f` and integration head
  `3d419f55b6664f41ebb36452eb88fc6027f5d51a`.
- Matched DM-007's useful lesson to the current product path: output review
  now stores review decisions as `review_feedback` memory rows, attaches review
  handoff and feedback-trace context to private outputs, projects that context
  through the workbench, and renders learned Review preferences in Voice &
  Memory.
- Rejected replaying the stale `dearme-review-feedback.ts` /
  `dearme-voice-memory.ts` service path because current DearMe already owns the
  review-memory loop through the existing handoff, memory, and workbench
  projection surfaces.
- Recorded both exact DM-007 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony workers do
  not reopen the obsolete review-feedback baseline.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed with the daemon healthy and no retrying workers.
- `pnpm run dearme:worktrees -- --ticket=DM-007 --skip-dirty --limit=20`
  passed before the ledger update and showed the worker and integration heads
  as `not_in_current`.
- `git show --stat --oneline --no-renames d1bf8431b0027747a9a384a307848324dc99741f`
  and `git show --stat --oneline --no-renames 3d419f55b6664f41ebb36452eb88fc6027f5d51a`
  confirmed the old review-feedback memory scope before absorption.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current path carries `review_feedback` memory, feedback traces, review
  handoff, workbench projection, and Review preferences.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --ticket=DM-007 --skip-dirty --limit=20`
  passed after the ledger update and showed both DM-007 worktrees as
  `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 20`, `not_in_current: 93`, and
  `dirty: 0`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/BUILD-STATE.md`
  passed.

## DM-183AZ Output Review Workspace Baseline Absorption - 2026-05-10

Coordination slice:

- Kept Symphony as the active cooperation spine and checked the live daemon
  before absorbing another stale worker pair.
- Reviewed the exact DM-006 worker head
  `cc35837647b0213dfebc84a65a0e51148f48c3ec` and integration head
  `44b7bfd69f93465d206561506259ac62eed80784`.
- Matched DM-006's useful lesson to the current product path: output review now
  uses output `details`, `sourceEvidence`, work-product Voice Gate results,
  focused prepared-work controls, review-loop handoffs, and feedback traces.
- Rejected replaying the stale `reviewContext` schema because current DearMe
  already owns the richer packet-backed prepared-work review surface through the
  existing handoff and focused decision paths.
- Recorded both exact DM-006 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony workers do
  not reopen the obsolete decision-desk baseline.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed with the daemon healthy and no retrying workers.
- `git show --stat --oneline --no-renames cc35837647b0213dfebc84a65a0e51148f48c3ec`
  and `git show --stat --oneline --no-renames 44b7bfd69f93465d206561506259ac62eed80784`
  confirmed the old output-detail review workspace scope before absorption.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current prepared-work review path carries details, source evidence, Voice
  Gate, review handoff, focused review controls, and feedback traces.
- `node -e "JSON.parse(require('fs').readFileSync('docs/dearme/WORKTREE-ABSORPTION-LEDGER.json','utf8')); console.log('json ok')"`
  passed.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --ticket=DM-006 --skip-dirty --limit=20`
  passed and showed both DM-006 worktrees as `reviewed_absorbed`.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 18`, `not_in_current: 95`, and
  `dirty: 0`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md docs/dearme/BUILD-STATE.md`
  passed.

## DM-183AY Source Management Baseline Absorption - 2026-05-10

Coordination slice:

- Kept Symphony as the active cooperation spine and checked the live daemon
  before absorbing stale worker history.
- Reviewed the exact DM-005 worker head
  `acaa7842c05ffb4339f4f4739d1c6455204ce447` and integration head
  `77e7d403913ef4381c41e8aefcdd9bd16592f6d2`.
- Matched DM-005's useful lesson to the current product path: private Voice &
  Memory sources now save through the activity-log memory route, support guided
  source paths, source links, revision, retire, restore, work previews, and
  source-grounded surface refresh.
- Rejected replaying the stale `server/src/services/dearme-voice-memory.ts`
  endpoint because current DearMe already owns the richer source lifecycle
  through the existing workbench and memory-update routes.
- Recorded both exact DM-005 heads in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony workers do
  not reopen the obsolete baseline.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed and showed an active DEA worker running.
- `git show --stat --oneline --no-renames acaa7842` and
  `git show --stat --oneline --no-renames 77e7d403` confirmed the old source
  management scope before absorption.
- `rg` checks across current shared, server, UI, and test files confirmed the
  current activity-log Voice & Memory source path covers create, revise, retire,
  restore, source links, and refresh behavior.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 16`, `not_in_current: 97`, and
  `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=40`
  passed and listed both DM-005 heads.
- `pnpm run dearme:worktrees -- --ticket=DM-005 --skip-dirty --limit=20`
  passed and showed only the DM-005 worker and integration heads as
  `reviewed_absorbed`.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AX Voice & Memory Active Source State Labels - 2026-05-10

Product/UI slice:

- Used the Symphony-side design review as a bounded UI follow-up after the
  DM-022 source-refresh absorption.
- Kept the change inside `VoiceMemoryPanel`; no API, schema, runtime, or new
  source workflow was added.
- Changed saved Voice & Memory source cards from generic "Feeds work" language
  to active state labels: already-used sources say "Already in use" and the
  newly saved source names the DearMe role that will use it next.
- Added a visible "Selected for next pass" state to source-review cards after
  the user prepares a fact, so the review queue feels like live work instead of
  a static list.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed with the daemon healthy and no retrying workers.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AW Source Change Review Refresh Absorption - 2026-05-10

Coordination slice:

- Re-checked Symphony and kept the active DEA worker lane running while the
  coordinator absorbed the stale DM-022 source-refresh worker into the current
  branch.
- Compared `/private/tmp/dearme-dm-022-source-change-refresh` at
  `b6916166cc7bb716ae8c05af5bd386636cddcddc` against current Voice & Memory
  source mutations.
- Reused the still-valid DM-022 lesson by making Voice & Memory source create,
  revise, retire, and restore refresh Workbench, private output review, and
  activity together.
- Recorded the exact DM-022 worker head in
  `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` so future Symphony workers do
  not replay the obsolete panel-level patch.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed and showed an active DEA worker running.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 14`, `not_in_current: 99`, and
  `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=25`
  passed and listed DM-022 with the other reviewed entries.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AU Symphony First-Turn Guard - 2026-05-10

Coordination slice:

- Paused `DEA-9` after its first Symphony worker turn consumed roughly 2.5M
  tokens while the worker workspace remained clean.
- Kept the issue alive by moving it back to `Todo`, which let Symphony stop the
  single worker without stopping the daemon or canceling the product lane.
- Tuned `.symphony/WORKFLOW.md` so future workers use a standard execution
  model and must run shell evidence, current-branch status, and the DearMe
  worktree summary as the first assistant action before broad synthesis.
- Added an explicit one-ticket worker boundary: Symphony workers should not
  spawn their own subagents; the coordinator owns parallelization.
- Added a browser-smoke guard after the retried worker started `pnpm dev` as a
  foreground command: future workers must use bounded smoke scripts or
  background servers with PID cleanup.
- Paused `DEA-10` after the first narrow child lane still spent more than 500k
  tokens in reasoning before running its required bootstrap commands; the
  workflow now makes bootstrap evidence the hard first action, before docs.

Verification:

- `curl -fsS http://127.0.0.1:4100/api/v1/DEA-9` showed `DEA-9` running with
  `2511967` total tokens and a clean worker workspace before the pause.
- Moving `DEA-9` to `Todo` stopped tracking the issue; the issue API returned
  404 and `.symphony/bin/dearme-symphony status` reported `running: []`.
- `git -C /private/tmp/dearme-symphony-workspaces/DEA-9 status --short --branch`
  stayed clean after the worker was stopped.
- The retried worker reached terminal interaction and started the DearMe dev
  server; moving `DEA-9` back to `Todo` stopped the Codex worker and its dev
  server children, and Symphony returned to `running: []`.
- `DEA-10` reached `540779` tokens while still in reasoning with a clean
  workspace; moving it back to `Todo` stopped the worker and Symphony again
  reported `running: []`.

## DM-183AV Output Direction Cache Absorption - 2026-05-10

Coordination slice:

- Re-checked live Symphony and kept the output-review work as a coordinator
  absorption slice, not a new worker runtime.
- Extended `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with exact
  branch/head records for DM-024 and DM-025 after matching their output-review
  lessons to current DearMe code.
- Added regression coverage for the `choose_new_direction` / `not_useful`
  review path so focused private work writes the returned output into the
  existing React Query cache while the output refetch is still pending.
- Kept the Voice & Memory first-class source-management donor as a separate
  future Symphony ticket instead of mixing it into this output-review slice.

Verification:

- `.symphony/bin/dearme-symphony status --json`
  passed.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 13`, `not_in_current: 100`, and
  `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=25`
  passed and listed DM-024 and DM-025 with the other reviewed entries.
- `git diff --check -- ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AT Early Voice/Review Worktree Absorption - 2026-05-10

Coordination slice:

- Extended `docs/dearme/WORKTREE-ABSORPTION-LEDGER.json` with exact
  branch/head records for DM-014, DM-015, DM-016, DM-017, DM-018, and DM-019.
- Kept those old worker tips out of the fresh replay lane because the current
  DearMe product already carries the useful mobile shell, first-week output
  detail, private-source traceability, source revise, source retire/restore,
  and retire-confirmation behaviors through newer surfaces.
- Preserved the Symphony boundary: these records only mean the listed exact
  heads have been reviewed as absorbed; branch advances still need a new
  product review before closure or replay.

Verification:

- Manual source checks matched each old branch intent to current DearMe files
  before adding the ledger entries.
- `pnpm run test:dearme-worktrees`
  passed.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty`
  passed and reported `reviewed_absorbed: 11`, `not_in_current: 102`, and
  `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=20`
  passed and listed DM-014 through DM-019 plus the prior reviewed entries.
- `git diff --check -- docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AS Symphony Handoff - 2026-05-10

Coordination slice:

- Created Linear issue `DEA-9`, `DM-183AS: Repeatable packet review-memory
  browser smoke`, as the next bounded Symphony lane after DEA-8.
- Updated the canonical `INDEX.md` next-ticket handoff so workers no longer
  restart the completed DM-138E first-run smoke.
- Updated `.symphony/WORKFLOW.md` and the Symphony operating-loop plan so new
  workers extend the existing packet-backed output handoff, workbench
  projection, focused review controls, and `feedbackTrace.receipts` path.
- Kept the product boundary explicit: no second first-run contract, packet
  schema, report runtime, worker dashboard, or customer-visible substrate
  surface.

Verification:

- Linear search found no existing DM-183AS issue before `DEA-9` was created.
- `git diff --check -- docs/dearme/INDEX.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md .symphony/WORKFLOW.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
  passed.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` passed and reported
  117 DearMe worktrees with 0 dirty workers.

## DM-183AR Work Ready Inline Review Receipts - 2026-05-10

Implementation slice:

- Adapted the still-useful DM-093/DM-097 in-place review pattern onto the
  current Symphony integration branch without replaying the stale
  `OutputReviewActions` component.
- Reused the existing `FocusedPreparedWorkReviewControls` and
  output-review/continue mutation path so Work Ready cards can launch,
  request changes, prepare another pass, or choose a new direction without
  opening private issue UI.
- Preserved the focused decision route: focused work items still use the same
  review controls, while Work Ready cards now carry the same decision surface
  directly on the board.
- Kept review history visible by carrying private review receipts through the
  output handoff, workbench projection, shared schema, and DearMe UI.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/shared exec vitest run src/validators/dearme.test.ts --maxWorkers=1`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx packages/shared/src/validators/dearme.ts packages/shared/src/validators/dearme.test.ts server/src/services/dearme-output-handoff.ts server/src/services/dearme-workbench.ts server/src/__tests__/dearme-output-handoff.test.ts docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AQ Private Source Link Traceability - 2026-05-10

Implementation slice:

- Adapted the still-useful DM-016 private-source traceability intent onto the
  current Symphony integration branch instead of replaying the stale
  `referenceUrl` schema.
- Kept the current Voice & Memory contract intact: source links remain
  user-supplied `sourceInputMode: "link"` + `sourceLabel` values.
- Rendered valid `http(s)` source labels as `Open private source` shortcuts on
  saved Voice & Memory cards, source-review cards, and source-review detail.
- Preserved the trust boundary: DearMe does not fetch, scrape, ingest, or
  publish the link in this slice.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AP Reviewed Worktree Absorption Ledger - 2026-05-10

Implementation slice:

- Added a reviewed-absorption ledger for old worker branches that were already
  manually compared against the current product surface.
- Taught `dearme:worktrees` to mark exact branch/head matches as
  `reviewed_absorbed` so Symphony coordination can stop treating those tips as
  fresh replay candidates.
- Kept the safety boundary narrow: reviewed absorption only applies to
  `not_in_current` records whose branch and head match the ledger, and the
  action still says to close only after owner confirmation.

Verification:

- `pnpm run test:dearme-worktrees` passed: 13 node tests.
- `pnpm run dearme:worktrees -- --summary-only --skip-dirty` passed and now
  reports `reviewed_absorbed: 5`, `not_in_current: 108`, `subject_matched: 16`,
  `dirty: 0`.
- `pnpm run dearme:worktrees -- --status=reviewed-absorbed --skip-dirty --limit=20`
  passed and listed DM-096, DM-098, DM-099, DM-100, and DM-101 as reviewed.
- `git diff --check -- scripts/dearme-worktree-status.mjs scripts/dearme-worktree-status.test.mjs docs/dearme/WORKTREE-ABSORPTION-LEDGER.json docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AO Saved Source Work Paths - 2026-05-10

Implementation slice:

- Adapted the still-useful DM-092 source-to-work intent onto the current
  Symphony spine instead of replaying its stale saved-source card branch.
- Added a `Feeds work` callout to saved Voice & Memory source cards so each
  private source names the DearMe role that will use it and the visible work it
  improves.
- Kept the current memory kinds, source guide, source review queue, and memory
  mutation contract intact; this is a customer-facing explanation layer, not a
  new source workflow or worker runtime.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 62 tests.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AN Voice & Memory Team Preview - 2026-05-10

Implementation slice:

- Adapted the useful DM-091 source-team-preview intent onto the current
  Symphony spine instead of replaying the stale pre-source-plan form.
- Added a selected-source `Team preview` to the Voice & Memory source guide so
  writing samples, proof points, links, corrections, boundaries, audience notes,
  and offer notes immediately name the DearMe role that will use them.
- Kept the existing source guide/source path form, source plan, source review
  queue, and memory mutation contract intact; this is a product-surface
  explanation only, not a new worker/runtime.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 62 tests.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed the source-team preview changes for writing sample, source link,
  and forbidden phrase, with no horizontal overflow, no same-origin request
  failures, no console/page errors, and no hidden substrate terms. Screenshot:
  `/tmp/dearme-dm183an-team-preview.png`.

## DM-183AM Voice & Memory Source Guardrails - 2026-05-10

Implementation slice:

- Adapted the still-useful DM-089 form-guardrail idea onto the current Voice &
  Memory source guide form instead of replaying its stale input path.
- Kept weak private source drafts local when the memory body is too thin, too
  large, or when the title/reference exceeds the current customer-safe limits.
- Preserved the existing source guide, source path, source label, and memory
  mutation contract; the UI now explains the 20-character minimum before save.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 62 tests.
- `pnpm --filter @paperclipai/ui typecheck`
  passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed the short-source guard stays local with no mutation request, no
  horizontal overflow, and no console/page errors. Screenshot:
  `/tmp/dearme-dm183am-voice-memory-guardrails.png`.

## DM-183AL First Payoff CTA Rail - 2026-05-10

Implementation slice:

- Reused `DearMeFocusSurface`, `DearMeWorkbenchSectionHeader`,
  `DearMeMetricStrip`, and `DearMeWorkbenchCard` for the first payoff instead of
  keeping a bespoke strip layout.
- Tightened the first-screen path into a clearer rail: write one sentence,
  receive the private proof pack, then make one launch call before anything
  public or external moves.
- Preserved the existing first-cycle input, trial preview CTA, paid-beta start
  CTA, Brand OS preview/apply flow, and customer-safe proof-pack language.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 62 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx
  ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md
  docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`
  confirmed desktop and mobile render the first payoff as a focus surface with
  three cards, no horizontal overflow, no console/page errors, and no same-origin
  request failures. Screenshots: `/tmp/dearme-dm183al-desktop.png`,
  `/tmp/dearme-dm183al-mobile.png`, `/tmp/dearme-dm183al-mobile-viewport.png`.

## DM-183AK First Payoff Strip - 2026-05-10

Implementation slice:

- Reused the existing first-cycle preview/start contract instead of adding a
  second onboarding flow or runtime surface.
- Added a compact `First payoff` strip directly after the hero so the first
  screen explains the core loop: one known-for sentence becomes a private proof
  pack, then only the launch call waits on the user.
- Kept the existing team board, private work, 90-second first-cycle form, paid
  beta gate, and Brand OS seed flow intact; the new CTA simply focuses the
  existing first-cycle input.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/ui typecheck`
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`

## DM-183AJ Final Move Approval Gate - 2026-05-10

Implementation slice:

- Reused the existing `dearme_output_next_move` approval type instead of adding
  a second DearMe launch queue or runtime surface.
- When private prepared work is approved as useful, the output handoff now opens
  one pending final-action approval linked to the original issue/output before
  anything can publish, send, deploy, or start another spend-bearing cycle.
- The workbench projection now carries `outputId` through approval decisions,
  batches, work stream, and action graph, and suppresses the duplicate raw
  output-review decision while the final approval is pending.
- Focused DearMe routes can now match approval decisions by artifact id, so
  Symphony handoffs can route users back to the same customer decision surface.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
- `pnpm --filter @paperclipai/shared typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

## DM-183AI Stale Prepared Work Preview - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-014 stale-output lesson onto the current
  DearMe output contract instead of replaying its retired `reviewContext`
  fallback.
- Private Work cards now fall back to the prepared output summary when a live
  or older payload has not attached documents, latest updates, or work-product
  summaries yet.
- Kept the current DearMe mobile navigation exception unchanged because the
  active layout already uses `DearMeMobileNav` instead of the generic bottom
  nav on `/dearme`.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AH Review Feedback Preferences - 2026-05-10

Implementation slice:

- Reused the current `review_feedback` Voice & Memory records as a compact
  Review preferences section inside the Voice & Memory panel.
- Adapted the useful DM-085 preference lesson without restoring its old
  `reviewLearning` schema or adding a second preference store.
- Kept the latest source cards, revise/retire flow, and backend memory
  projection unchanged; the new section is derived from visible active memory.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AG Retire Source Confirmation - 2026-05-10

Implementation slice:

- Absorbed the useful DM-019 confirmation-boundary lesson onto the current
  Voice & Memory source projection instead of replaying its stale browser-dialog
  implementation.
- Retiring a saved private source now opens a DearMe-owned confirmation dialog
  before the existing archive mutation runs.
- Kept the current soft-retire and restore path intact, so retired sources stay
  in private history and can be restored without a new memory table or service.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AF Live Proof Feed and Prepared Work Ordering - 2026-05-10

Implementation slice:

- Absorbed the useful DM-022 workstream proof-feed language onto the current
  `LiveTeamFeedPanel` instead of replaying its stale service/API migration.
- Absorbed the durable DM-020 ordering lesson by keeping private prepared work
  ahead of the 90-second first-cycle form after the main team board.
- Preserved the current workbench stream, proof-pack continuity, Voice & Memory,
  review controls, and route/query contracts.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AE User-Facing Leadership Prompts - 2026-05-10

Implementation slice:

- Absorbed the current Symphony sidecar prompt audit by removing customer-facing
  CEO, board-update, and owner-email framing from the Chief of Staff and
  Reporting prompts.
- Kept the proven Polsia/Naive ordered reporting loop, queue rules, proxy tool
  names, and `ceo_*` report type identifiers unchanged for compatibility.
- Rebuilt the generated OpenClaw skills from prompt source so runtime workers
  receive the same DearMe Chief / Dear-me letter language as the source
  package.

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

## DM-183AD Workbench Projection Trace Coverage - 2026-05-10

Implementation slice:

- Absorbed the remaining useful DM-044/DM-045 projection residue onto the
  current workbench architecture instead of restoring the retired
  `dearme-voice-memory` service.
- Extended workbench output projection through review feedback traces, so
  feedback headline, summary, user direction, and change notes are normalized
  before the customer workbench response returns them.
- Added a fast projection regression that exercises Symphony/OpenClaw/Paperclip
  terms through helper text and nested output payloads without requiring
  embedded Postgres.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench-projection.test.ts --run`
  passed: 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-183AC Channel-Neutral Prompt Rails - 2026-05-10

Implementation slice:

- Absorbed the current Symphony sidecar language audit by removing X-first
  default channel wording from DearMe bootstrap/profile prompts.
- Content Producer now asks for the user's connected public surface instead of
  seeding a LinkedIn/X default, while public launch remains approval-gated.
- Rebuilt generated OpenClaw bootstrap and skill files from source; outbound
  tool names and payload fields stay unchanged.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed: 26 tests.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 18 tests.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `git diff --check -- packages/plugins/dearme-openclaw/src/bootstrap.ts packages/plugins/dearme-openclaw/generated/bootstrap/AGENTS.md packages/plugins/dearme-openclaw/generated/bootstrap/USER.md packages/plugins/dearme-openclaw/generated/bootstrap/SOUL.md packages/plugins/dearme-openclaw/generated/skills/dearme-content-producer/SKILL.md packages/plugins/dearme-openclaw/src/index.test.ts packages/plugins/dearme-agent-prompts/src/prompts/content-producer.ts packages/plugins/dearme-agent-prompts/src/index.test.ts docs/dearme/OPENCLAW-INTEGRATION-ARCHITECTURE.md docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AB Mutation Error Coverage - 2026-05-10

Implementation slice:

- Absorbed the useful DM-046/DM-047 customer-safe mutation error coverage onto
  the current DearMe page after confirming the production error boundary had
  already moved into the latest architecture.
- Added UI regressions for Voice & Memory save/retire/restore failures, Brand
  OS preview/start failures, and focused private-work review failures.
- Kept runtime code, route contracts, schema, query keys, and customer-facing
  success flows unchanged.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 58 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183AA Live Feed State Guidance - 2026-05-10

Implementation slice:

- Absorbed the useful DM-088 live-progress explanation idea onto the current
  `LiveTeamFeedPanel` instead of restoring the stale replacement card.
- Each live team item now pairs its next action with a short customer-safe state
  explanation, so review-ready, in-motion, and recorded updates make sense while
  scanning.
- Reused the existing `workStream` fields and `DearMeActionCard` shell; no
  schema, route, query-key, or runtime changes.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183Z Memory Context Term Safety - 2026-05-10

Implementation slice:

- Absorbed the useful DM-043 customer-safe memory-label direction onto the
  current `dearme-memory-context` service instead of importing the stale worker
  service shape.
- Voice & Memory titles, bodies, and source labels are now normalized before
  they are inserted into DearMe routine descriptions, keeping private worker
  guidance free of donor/runtime/provider terms.
- Added embedded Postgres coverage that seeds hidden substrate terms through a
  memory update and proves the refreshed routine receives only DearMe-safe
  wording.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
  passed: 4 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-memory-context.ts server/src/__tests__/dearme-memory-context.test.ts docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183Y Launch Boundary Cards - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-030 review-boundary card direction onto the
  current DearMe output contract instead of raw-merging the stale worker branch.
- Reused existing `approval_gate` and `deploy_gate` output details as the
  customer-facing launch boundary preview on private work cards; no schema,
  route, or query-key changes.
- Added UI coverage that checks a prepared content card exposes its launch
  boundary while users scan the ready-work surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183X Team Progress Map Copy - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-038 copy residue found during the Symphony
  worktree pass without raw-merging the stale worker branch.
- Replaced the remaining customer-visible `Team work stream` growth-map label
  with `Team progress map`, keeping the experience product-facing while the
  internal workbench/workStream contracts stay backstage.
- Added UI coverage that locks the new visible label and prevents the retired
  visible phrase from returning.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
  passed.

## DM-183W Retired Voice & Memory Restore - 2026-05-10

Implementation slice:

- Added a capped `archived` Voice & Memory projection to the existing DearMe
  workbench memory contract so retired private sources can still be reviewed.
- Reused the existing `activity_log` memory substrate: archive remains the
  state marker, and restore writes a fresh `dearme.memory_updated` event from
  the last saved source body.
- Added an owner-only restore route that reuses the current memory update result
  shape and routine refresh path instead of introducing a new table or memory
  runtime.
- The DearMe workbench now shows retired private sources with a restore action
  and keeps restored items out of the retired list immediately after the action.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 93 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md packages/shared/src/validators/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/routes/dearme.ts server/src/services/dearme-workbench.ts ui/src/api/dearme.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

## DM-183V Brand OS Preview Copy Cleanup - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-029 copy residue onto the current DearMe Brand OS
  preview instead of raw-merging the stale worker branch.
- The empty preview now frames the first pass as private work with budget,
  memory, and launch boundaries.
- The preview metrics and sections now use `Rhythm`, `Working rhythm`, and
  `First private work` instead of internal cycle/operation wording.
- Reused the existing preview payload and execution plan; no schema, route,
  server behavior, or runtime surface was changed.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 52 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

## DM-183U Artifact Links For Focused Private Work - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-033 route residue onto the current DearMe
  decision surface instead of raw-merging the stale worker branch.
- New focused prepared-work entrypoints now generate
  `/dearme?view=decisions&work=...&artifact=...`.
- Legacy `output=` decision links still parse, so old review handoffs keep
  opening the exact private work item.
- Reused `buildDearMeDecisionRoute`, `parseDearMeDecisionFocus`, and the current
  focused-work tests; no new schema, server route, or customer-facing runtime
  surface was added.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

## DM-183T Exact Output Focus From Review Entrypoints - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-027 output-focus residue onto the current
  DearMe decision surface instead of raw-merging the stale worker branch.
- Batch decisions and the Dear me letter now carry existing prepared-output ids
  into `/dearme?view=decisions&work=...&artifact=...`.
- Reviewable live-feed work now exposes the same in-place launch/change/another
  pass/new-direction controls used by focused prepared work, so the user can
  keep work moving without leaving DearMe.
- Reused `batchPreparedOutputId`, report `outputId`, live stream
  `relatedOutputId`, review-loop state, and `buildDearMeDecisionRoute`; no new
  schema, raw issue route, worker, or customer-facing runtime surface was added.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 51 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

## DM-183S Decision-First Live Team Feed - 2026-05-10

Implementation slice:

- Absorbed the still-useful DM-088 decision-first team progress idea onto the
  current DearMe workbench instead of raw-merging the stale worker branch.
- Kept the newer proof-pack continuity, growth map, run ledger, and action-card
  surfaces intact.
- Grouped the existing live team feed into `Needs your call`, `In motion`, and
  `Recent updates` so reviewable work and launch calls are visually first.
- Added live-feed counters for calls waiting and private work in motion.
- Reused the existing workbench stream item contract, action-card component,
  deep links, review-loop labels, and decision routing; no new route, schema,
  worker, or customer-facing runtime surface was added.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 49 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.

## DM-183R DearMe Live Refresh Invalidation - 2026-05-10

Implementation slice:

- Absorbed the parallel live-update invalidation slice for DearMe product
  activity instead of creating a separate polling or refresh path.
- Added DearMe activity detection for `dearme.` and `dearme_` live payloads and
  DearMe approval metadata.
- Refreshes DearMe workbench, brand blueprint, outputs, and paid-beta access
  queries when a DearMe product activity arrives.
- Refreshes only the DearMe workbench for broad issue comment/update events
  where the server-side workbench query remains the authority on whether the
  comment belongs in the customer surface.
- Reuses existing live update and query-key infrastructure; no new customer UI
  route, runtime surface, or dependency was added.

Verification:

- `pnpm exec vitest run ui/src/context/LiveUpdatesProvider.test.ts --maxWorkers=1`
  passed: 17 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.

## DM-183Q Review Feedback Memory Loop - 2026-05-10

Implementation slice:

- Absorbed the parallel review-feedback memory slice now that the first proof
  and approval-entry paths are stable.
- Added `review_feedback` as a first-class DearMe Voice & Memory update kind.
- When a customer asks for changes, asks DearMe to prepare another pass, or
  marks prepared work as not useful, the review route now records a
  customer-safe memory update and refreshes DearMe growth-cycle context.
- Kept approve-only decisions out of memory refresh so successful approvals do
  not add redundant feedback.
- Surfaced review feedback with the existing Voice & Memory labels in workbench
  and DearMe UI instead of adding a new panel or route.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 37 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts --maxWorkers=1`
  passed: 3 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed earlier in this integration
  pass and covered the DearMe UI label addition.

## DM-183P DearMe Approval Entry Routes - 2026-05-10

Implementation slice:

- Replayed the still-useful Symphony DM-054/DM-055/DM-060/DM-062 approval
  entry residue onto the current UI instead of merging stale worker branches.
- Centralized DearMe approval detail links and action-error filtering in the
  shared DearMe approval helper.
- Routed DearMe approval activity rows, linked comment-thread approvals,
  issue-detail linked approvals, approval list cards, inbox rows, and keyboard
  approval navigation back to `/dearme?view=decisions&approval=...`.
- Kept generic approvals on the shared approvals routes and preserved their raw
  error behavior.
- Kept reject/approve completion for DearMe decisions inside the DearMe
  decisions surface with short product-safe success/error language.

Verification:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ActivityRow.test.tsx ui/src/components/CommentThread.test.tsx ui/src/pages/Inbox.test.tsx ui/src/pages/IssueDetail.test.tsx --maxWorkers=1`
  passed: 36 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed for the touched UI approval-entry files.

## DEA-8 Live Proof Pack Handoff v0 - 2026-05-10

Implementation slice:

- Absorbed the useful docs-only Symphony handoff from Linear issue `DEA-8`
  without merging the worker checkout, because that checkout showed unrelated
  file deletions outside the issue scope.
- Verified from the worker evidence that the first-run DearMe aha path already
  reuses `DearMeFirstCyclePreviewResponse.proofSequence`,
  `prepareFirstCycleProofOutputs(...)`, `prepareCycleOutputPacket(...)`, output
  handoff, and workbench projection.
- Confirmed no second first-run packet, schema, or runtime surface is needed:
  first-cycle start prepares identity, audience, content, opportunity,
  private-site, and report proof through existing private output records.

Live proof evidence from DEA-8:

- Local API health at `http://127.0.0.1:3100/api/health` returned `status: ok`,
  `deploymentMode: local_trusted`, `deploymentExposure: private`, and
  `authReady: true`.
- API smoke against paid-beta company `39391bbc-ffc9-430b-bac5-171de2fbc57f`
  posted `/api/dearme/companies/:companyId/first-cycle/start` and returned the
  three prepared proof steps: `Brand OS dossier + Voice profile`,
  `Starter content drafts + Opportunity shortlist`, and
  `Private site proof draft + Dear me report note`.
- The same smoke returned three starter posts, an opportunity lead gated by
  `send_email`, and a portfolio proof card gated by `deploy_public_site`.
- `/outputs` projected six ready-for-review outputs: `brand_os`,
  `voice_profile`, `content_drafts`, `opportunity_drafts`, `portfolio_update`,
  and `weekly_report`.
- `/workbench` projected those records into the visible review experience:
  `workReady: 6`, `decisionsNeeded: 6`, `batchDecisions: 5`,
  `recentProgress: 4`, `workStream: 10`, `runLedger: 10`, and `outputs: 6`.
- Hidden runtime/donor terms checked in the first-cycle start response had no
  hits for Paperclip, OpenClaw, Symphony, adapter, provider, setup payload,
  model, or raw runtime language.

Verification:

- Linear `DEA-8` contains the Symphony worker completion comment with the live
  proof evidence above.
- The worker's focused test command exited 0: 2 test files passed, 3
  embedded-Postgres-backed server files skipped on this host, 82 tests passed,
  and 15 tests skipped.
- The skipped server files reported the known embedded Postgres data-directory
  init blocker.
- Current coordinator inventory after absorption:
  `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117 DearMe
  worktrees with 0 dirty workers.
- `git diff --check` passed after absorbing this docs-only handoff.

## DM-183O DearMe Approval/Profile UI Boundaries - 2026-05-10

Implementation slice:

- Replayed the still-useful Symphony DM-050/DM-051/DM-052/DM-058 residue onto
  the current UI instead of merging stale worker branches.
- Added a tiny DearMe approval helper so DearMe approval types route from the
  approval card, approval detail, approval list, and inbox back into the
  DearMe decisions surface.
- Registered `dearme_output_next_move` in the shared approval type contract so
  the UI and API validator agree that DearMe output decisions are first-class
  approvals.
- Hid raw approval IDs, requester identity, linked issue chrome, and full
  request payload controls for DearMe approvals while leaving generic approval
  behavior unchanged.
- Changed the DearMe missing-profile state from inherited company wording to a
  DearMe profile prompt.
- Expanded DearMe action-error sanitization for orchestration/model/key/token
  failure terms so private execution failures stay product-safe.

Verification:

- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx --maxWorkers=1`
  passed: 16 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 49 tests.
- `pnpm exec vitest run ui/src/pages/Inbox.test.tsx --maxWorkers=1`
  passed: 9 tests.
- `pnpm exec vitest run ui/src/lib/dearmeApprovals.test.ts ui/src/components/ApprovalCard.test.tsx ui/src/components/ApprovalPayload.test.tsx ui/src/pages/ApprovalDetail.test.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/Inbox.test.tsx --maxWorkers=1`
  passed: 74 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/`; `DEA-8` was running in an isolated Symphony
  workspace with 0 retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117 DearMe
  worktrees with 0 dirty workers.

## DM-183N Scannable First-Week Output Details - 2026-05-10

Implementation slice:

- Replayed the still-useful DM-015 first-week output detail idea onto the
  current packet-backed DearMe review surface instead of merging the stale
  branch.
- Reused the existing server `details` contract for content, opportunity,
  portfolio, Brand OS, voice profile, and weekly-report outputs, adding only a
  UI ordering helper so the most useful first-week fields stay visible.
- Expanded private-work cards from a raw first-three detail slice into a
  compact two-column detail grid, and made focused prepared-work review use the
  same ordered detail selection.
- Kept the change UI-only: no new schema, route, runtime, data model, or
  Symphony product surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 46 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/`; `DEA-8` was running in an isolated Symphony
  workspace.

## DM-183M DearMe Server Safe Boundaries - 2026-05-10

Implementation slice:

- Absorbed concurrent DearMe server boundary changes as one narrow
  customer-safety pass.
- Normalized DearMe route Zod failures and common auth/access failures into
  product-safe messages before the shared Express error handler serializes
  them.
- Added Brand OS approval preflight so malformed legacy approval payloads stay
  pending instead of being marked approved before apply fails.
- Added route regression assertions for company-access and owner-account
  failures, plus approval/apply coverage for stale payloads, so internal
  board/company/auth/setup wording stays backstage.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 37 tests.
- `pnpm exec vitest run server/src/__tests__/approvals-service.test.ts --maxWorkers=1`
  passed: 6 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts --maxWorkers=1`
  passed: 3 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  DearMe worktrees with 0 dirty workers.
- `git diff --check` passed.

## DM-183L Visible Learning Loop - 2026-05-10

Implementation slice:

- Replayed the still-useful DM-099 learning-loop idea as a narrow current-code
  UI pass instead of merging the stale worker branch.
- Made the Growth cycle panel show the Learn stage explicitly, deriving the
  signal from existing Voice & Memory sources, source review, action graph, and
  Dear me report learnings.
- Kept the slice UI-only: no new API, schema, route, runtime surface, or
  database object.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 45 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  DearMe worktrees with 0 dirty workers.
- `git diff --check` passed.

## DM-183K Feedback-Applied Review Trace - 2026-05-10

Implementation slice:

- Absorbed the useful Symphony worker residue for repeated review loops without
  introducing a new review surface or exposing the issue/work-product substrate.
- Added a typed `feedbackTrace` to DearMe output review loops so regenerated
  private work can show what changed after the user's last request.
- Built the trace from existing review comments, documents, work products, and
  latest updates, with customer-safe filtering for provider/runtime/agent/model
  and orchestration terms.
- Rendered the trace in the focused prepared-work panel as a compact
  "Feedback applied" card, and tightened live-pulse/team-board copy so
  customer UI does not substitute one internal word for another.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts --maxWorkers=1`
  passed: 16 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed: 9 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
  passed: 3 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 45 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  DearMe worktrees with 0 dirty workers.
- `git diff --check` passed.

## DM-183J Customer-Safe Review Copy and Error Boundaries - 2026-05-10

Implementation slice:

- Replayed the useful customer-facing residue from stale DM-035/DM-036/DM-041
  and DM-042 worker branches without merging their old histories wholesale.
- Changed the private-work review surface from generic "surfaces" and
  "Work ready / Decisions needed" language to review-owned copy that reads as
  prepared DearMe work waiting for the user.
- Updated default decision notes so approvals, rejections, revisions, and new
  direction requests read like natural DearMe review decisions instead of
  inherited route or platform comments.
- Added a customer-safe error boundary for DearMe panels and actions so
  OpenClaw/Paperclip/Symphony/provider/runtime/adapter failures collapse into
  plain product guidance on the customer path.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 45 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  DearMe worktrees with 0 dirty workers.
- `git diff --check` passed.

## DM-183I Output-Scoped Voice & Memory Task Context - 2026-05-10

Implementation slice:

- Replayed the useful `DM-039` idea onto the current DearMe apply path instead
  of merging the stale worker branch shape.
- Added an output-kind map for seeded DearMe draft operations so content,
  opportunity, portfolio, voice-profile, and weekly-report tasks receive the
  same Voice & Memory sections in the order most relevant to that output.
- Kept the change inside generated private task context: no customer UI,
  schema, route, or approval-boundary behavior changed.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts --maxWorkers=1`
  passed: 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-183H Focused Work Voice Context Guard - 2026-05-10

Implementation slice:

- Reused the existing Work Ready focused-review surface to explain when a
  prepared work item has no usable Voice & Memory evidence, instead of silently
  hiding the source section or rendering blank source cards.
- Sanitized source-evidence labels and summaries before display, filtered empty
  evidence rows, and added stable accessible labels to private work review
  actions so the same card remains reviewable in dense proof-pack surfaces.
- Aligned generated DearMe workspace bootstrap language with the Symphony team
  routing model by replacing proxy/runtime phrasing in the source template and
  regenerated bootstrap artifact.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 43 tests.
- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` regenerated
  12 skills and 4 bootstrap files.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 18 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `git diff --check` passed.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees and 0 dirty worker records.
- Browser plugin connection was unavailable for `iab`, so the rendered smoke
  used Playwright fallback against the already-running local app at
  `http://127.0.0.1:3100/DEAA/dearme?view=decisions`.
- Playwright desktop `1440x1100` and mobile `390x844` smokes passed: HTTP 200,
  non-blank DearMe surface, no framework overlay, no console/page errors, no
  horizontal overflow, and `Review Dear me report` opened the focused work URL.
  Screenshots: `/tmp/dearme-dm183h-desktop.png` and
  `/tmp/dearme-dm183h-mobile.png`.

## DM-183G Symphony Cooperation Spine - 2026-05-10

Implementation slice:

- Codified Symphony as the default DearMe cooperation spine now that the Linear
  queue and local daemon are usable.
- Made `.symphony/README.md` the operational entry point for future DearMe
  worker cooperation: Linear team `DEA`, `.symphony/WORKFLOW.md`, isolated
  Symphony workspaces, and coordinator-only integration in the main checkout.
- Updated the reuse ledger coordination rules so future product/code work
  starts from Symphony instead of ad hoc worker branches, while preserving the
  existing customer-safe language boundary.

Verification:

- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying workers.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees, 1 Symphony workspace, 3 `subject_matched` records, and 0 dirty
  records.
- `git diff --check` passed for the docs-only update.

## DM-183F Customer-Safe Work Route and Team Attribution - 2026-05-10

Implementation slice:

- Replayed the still-useful product pieces from stale DM-031 and DM-032 worker
  branches instead of merging their old histories wholesale.
- DearMe-generated decision links now use `work=` for prepared-work focus, while
  legacy `issue=` deep links continue to resolve for existing shared links.
- Private work cards now show the customer-safe team role that prepared each
  output, so Work Ready scans as a visible growth team rather than a generic
  artifact list.

Verification:

- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed: 42
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "search\.set\(\"issue\"|view=decisions&issue=|/issues/|/approvals/|Paperclip|OpenClaw|Symphony|Codex|MCP|setup-payload|setup_payload|provider|adapter|workspace" ui/src/pages/DearMeOnboarding.tsx`
  returned only the customer-safe internal projection helper, not rendered route
  generation.
- `git diff --check` passed.

## DM-183E Subject-Matched Worktree Triage - 2026-05-10

Implementation slice:

- Extended the DearMe worktree inventory with a conservative
  `subject_matched` signal for stale branches whose tip commit subject already
  appears in the current integration head.
- Kept the status as `not_in_current`; this does not mark old branches safe to
  close. It changes the coordinator action to inspect residual diff before
  replay or closure, which is the right path for branches like DM-101 where the
  core guardrail intent has already landed but old history still carries noisy
  deltas.
- Applied the same signal to real Symphony workspace repos so Linear worker
  lanes and local worker worktrees share one triage vocabulary.
Verification:

- `pnpm test:dearme-worktrees` passed: 11 tests.
- `pnpm dearme:worktrees -- --ticket=DM-101 --limit=20 --skip-dirty` reported
  2 DM-101 worktrees and 1 `subject_matched` worker action.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees, 3 `subject_matched` records, 1 Symphony workspace, and 0 dirty
  records.

## DM-183D Customer-Safe Workbench Projection - 2026-05-10

Implementation slice:

- Finished the service-level projection layer for DearMe workbench outputs so
  imported work products from OpenClaw, Symphony, Paperclip, adapter/provider
  runs, and model/runtime logs are rewritten into DearMe customer language
  before they shape work items, decisions, streams, run ledger, reports, and
  the action graph.
- Reused the existing Naive/Paperclip work-product, document, issue, cost, and
  routine data paths; this adds no new database table, endpoint, worker, or UI
  contract.
- Kept the architecture boundary explicit: substrate names can remain in
  internal compatibility records and donor-derived execution logs, but the
  DearMe workbench projects them as private teammates, prepared work, private
  checks, review notes, and team progress.
- Strengthened the embedded-postgres workbench regression by seeding a work
  product with hidden substrate vocabulary and asserting the complete
  customer-path JSON stays free of those terms.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts
  --maxWorkers=1` passed: 3 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-workbench.ts
  server/src/__tests__/dearme-workbench.test.ts docs/dearme/BUILD-STATE.md
  docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` passed.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees, 1 Symphony workspace, 0 patch-equivalent branches, and 0 dirty
  records.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying jobs.

## DM-183C Symphony Workspace Inventory - 2026-05-10

Implementation slice:

- Extended `pnpm dearme:worktrees` so the coordinator report includes real
  repos under `/private/tmp/dearme-symphony-workspaces/*/repo`, not only
  `git worktree list` entries attached to the source checkout.
- Added DEA ticket detection and a `symphony` purpose bucket, so active Linear
  worker lanes such as `DEA-7` are separated from stale worker branches and
  historical integration branches.
- Added `--no-symphony` and `--symphony-root` options for reproducible tests
  and emergency fallback when an operator needs the old git-worktree-only view.
- Kept the coordinator action conservative: Symphony workspaces must still be
  compared against current head and replayed only as issue-scoped slices.

Verification:

- `pnpm test:dearme-worktrees` passed: 10 tests.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 117
  worktrees including 1 Symphony workspace, 3 `in_current`, 113
  `not_in_current`, 0 `patch_equivalent`, and 0 dirty records.
- `pnpm dearme:worktrees -- --ticket=DEA-7 --limit=10 --skip-dirty`
  reported the real Symphony workspace as `in_current`, with the conservative
  action `absorbed Symphony lane; keep as audit trail or close after owner
  confirmation`.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty --no-symphony`
  preserved the legacy 116-worktree view.
- `.symphony/bin/dearme-symphony status` confirmed the daemon at
  `http://127.0.0.1:4100/` with no running or retrying jobs.
- `git diff --check` passed.

## DEA-7 Live Team Pulse - 2026-05-10

Implementation slice:

- Added a customer-facing `Live team pulse` surface to the DearMe workbench so
  the latest worker lifecycle event shows as active private team motion instead
  of only triggering a silent refresh.
- Reused the existing workbench EventSource, `dearmeWorkbenchRefreshEventTypes`,
  and React Query invalidation path; no new endpoint, schema, or first-run data
  shape was added.
- Kept hidden Symphony/OpenClaw/runtime/provider/model terms backstage by
  sanitizing live event payload copy before it reaches the paid-beta surface.
- Cleaned the opportunity workbench language from packet wording into lead
  batches, opportunity drafts, and launch calls so the customer surface stays
  aligned with proof-pack language.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx
  --maxWorkers=1` passed: 42 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- docs/dearme/BUILD-STATE.md
  docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md
  ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- Playwright smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme` found the
  workbench focus and proof-pack continuity surfaces, no console errors, and no
  hidden Symphony/OpenClaw/Paperclip/provider/runtime/model terms. Screenshot:
  `/tmp/dearme-live-team-pulse-smoke.png`.
- Playwright smoke on
  `http://127.0.0.1:3100/DEAAAAAAAAA/dearme?view=opportunities` found lead
  batches, current opportunity draft, and prepared opportunity drafts with no
  packet wording or console errors. Screenshot:
  `/tmp/dearme-opportunity-drafts-smoke.png`.
- `.symphony/bin/dearme-symphony status` confirmed the real Symphony daemon on
  `http://127.0.0.1:4100/` with no active agents or retries.
- Chrome DevTools opened `http://127.0.0.1:4174/DEAA/dearme`, confirmed
  the workbench and proof-pack continuity render, found no console errors or
  warnings, and saw 200s for the relevant workbench, outputs, paid-beta, and
  events requests.

## DEA-7 Proof Pack Continuity Ribbon - 2026-05-10

Implementation slice:

- Added a customer-facing `Proof pack continuity` ribbon to the DearMe
  workbench so the first screen shows how one private proof pack flows through
  Voice & Memory, Work Ready, the Dear me letter, and launch calls.
- Added the compact `Current proof pack -> Next move -> Launch call` row inside
  that ribbon so the aha is explicit before users inspect the four supporting
  cards.
- Reused the existing workbench projection, report status labels, source
  counts, decision queues, and packet-backed report detection instead of adding
  another packet/progress read model.
- Kept the copy on product language: proof pack, private until approved, launch
  calls, and team work. The test guards against leaking `cycle packet`,
  `shared packet`, OpenClaw, Paperclip, and other hidden runtime terms.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts
  server/src/__tests__/dearme-brand-blueprint-routes.test.ts
  ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 87 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Browser fallback smoke on `http://127.0.0.1:3100/DEAAAAAAAAA/dearme` passed
  for desktop and mobile: continuity ribbon present, no console errors, no
  hidden donor/runtime terms.

## DEA-7 Content Packet Rerun Key - 2026-05-10

Implementation slice:

- Made `packetId` required on `dearMeContentDraftPacketSchema`, turning it into
  the stable rerun key every Symphony content worker must send.
- Reused the existing output handoff `externalId` update path, so a retry with
  the same packet id updates one private review work product instead of stacking
  duplicate artifacts.
- Added route validation coverage that rejects packet saves without a stable
  packet id before any work product write runs.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts
  server/src/__tests__/dearme-brand-blueprint-routes.test.ts
  ui/src/api/dearme.test.ts --maxWorkers=1` passed: 58 tests.

## DM-170 Voice Gate Contract Route - 2026-05-10

Implementation slice:

- Added root `POST /v1/voice/score` as the DearMe cloud voice-check contract
  route, mounted outside `/api` so OpenClaw/Symphony workers can call the same
  path defined by `@paperclipai/dearme-ai-proxy`.
- Reused the existing `dearMeVoiceGateService` deterministic scorer instead of
  creating a second scoring path. The route accepts the shared
  `VoiceGateScoreRequest` shape and returns the shared score response.
- Added the initial contract-shape auth gate:
  `Authorization: Bearer dm_sk_*`. DM-170D later moved this route onto issued,
  unrevoked `agent_api_keys` rows; the trained voice fingerprint model remains
  the next production-hardening layer.

Verification:

- `pnpm exec vitest run server/src/services/dearme-voice-gate.test.ts
  server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1` passed
  the server voice-gate suite: 10 tests.
- `pnpm --filter @paperclipai/dearme-ai-proxy test` passed: 6 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-145A AI Proxy Runtime Skeleton - 2026-05-10

Implementation slice:

- Mounted the DearMe AI proxy router under the contract base path from
  `@paperclipai/dearme-ai-proxy`, so the server now answers
  `POST /api/proxy/ai/v1/chat/completions` and
  `POST /api/proxy/ai/v1/messages`.
- DM-145E extends the same route boundary with
  `POST /api/proxy/ai/agent/run`, using the same `dm_sk_*` auth,
  `resolveDearMeProxyModelRouting` tier selection, injected executor posture,
  and `cost_events` insertion into the existing schema shape.
- Kept the route boundary small: one bearer-key store, one company/agent
  resolver, one prompt-cache normalization path, and one cost ledger. No schema
  migration was needed in this slice.
- The mounted route now fails closed with `503` unless a provider execution
  function is injected. This prevents the runtime skeleton from returning
  synthetic output on a real product path, including `/agent/run`.
- Kept the existing root `POST /v1/voice/score` route unchanged.
- Remaining DM-145 follow-up is live provider execution wiring behind the
  injected executor hooks. Durable key issuance/revocation and stricter tenant
  binding were absorbed in earlier slices.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-ai-proxy-routes.test.ts
  server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck`
- `git diff --check`

## DEA-7 Content Packet Worker Save Route - 2026-05-10

Implementation slice:

- Added company-scoped `POST /api/dearme/companies/:companyId/outputs/:outputId/content-draft-packets`
  so Symphony content workers can persist private content packets through the
  existing DearMe output handoff instead of creating another content runtime.
- Reused `persistContentDraftPacket(...)`, validates that the target output is
  the `content_drafts` lane, logs `dearme.content_draft_packet_saved`, emits a
  customer-safe workbench completion event, and returns the existing
  `DearMeOutputWorkProduct` shape.
- Exported `DearMeContentDraftPacketInput` through shared validators and added
  `dearmeApi.saveContentDraftPacket(...)` for the UI/client surface.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts
  server/src/services/dearme-voice-gate.test.ts
  server/src/__tests__/dearme-voice-gate-routes.test.ts --maxWorkers=1`
  passed: 46 tests.
- `pnpm exec vitest run ui/src/api/dearme.test.ts
  server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 49 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DM-141 Opportunity Workbench and Team Skill Rails - 2026-05-10

Implementation slice:

- Integrated the Symphony opportunity scouting slice in `04e0a87b`, adding
  `?view=opportunities` as a focused opportunity command center on the existing
  DearMe workbench instead of creating another runtime or outreach product.
- Reused the current prepared-output review path for `opportunity_drafts`, so
  opportunity scouts produce private launch-call packets and the customer still
  approves before any outbound message or public action moves.
- Hardened generated DearMe team skill wrappers in `7b59a30d`: frontmatter and
  wrapper sections now use DearMe-facing capabilities, operating rails, and
  execution language while raw tool, package, runtime, and OpenClaw wrapper
  terms stay backstage.

Verification:

- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed: 26 tests.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` regenerated
  12 skills and 4 bootstrap files.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 18 tests.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw build` passed.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx
  --maxWorkers=1` passed: 42 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Shell Playwright opened
  `http://127.0.0.1:3100/DEAAAAAAAAA/dearme?view=opportunities` in desktop and
  390px mobile viewports, verified the opportunity command-center copy,
  verified no hidden runtime/donor terms in the live DOM, and reported no
  console messages, page errors, failed page requests, or horizontal overflow.
  Screenshots:
  `/tmp/dearme-ui-verification/opportunities-desktop.png` and
  `/tmp/dearme-ui-verification/opportunities-mobile.png`.
- `rg` against generated opportunity and browser skills found no stale
  OpenClaw/proxy/runtime wrapper terms.
- `git diff --check` passed for the generator, generated skills, and docs.

## DEA-7 Packet Aha Browser Proof - 2026-05-10

Implementation slice:

- Used the Symphony-aligned paid-beta local smoke company
  `DEAAAAAAAAA` (`39391bbc-ffc9-430b-bac5-171de2fbc57f`) as the live
  proof lane for the packet-backed DearMe aha loop.
- Generated real private first-cycle outputs through
  `/api/dearme/companies/:companyId/first-cycle/start`. This stayed local and
  private: no public posts, outreach, deploys, spend, or external launch action
  were performed.
- Proved the existing workbench, Dear me letter, and focused review route all
  consume the same proof-pack handoff. The `Review proof pack` action landed on
  `/DEAAAAAAAAA/dearme?view=decisions&issue=DEAAAAAAAAA-2&output=ab74192c-6291-4af8-8251-918ddfd1c545%3Acontent_drafts`.
- Confirmed the customer-facing surface says `First proof pack ready`,
  `Review proof pack`, `Dear me letter`, `Voice check`, `Voice 100/100`,
  `Private until approved`, and `Work Ready` while keeping runtime and donor
  machinery backstage.
- That same first-run surface also carries the DM-171B bridge: the onboarding
  page already opens with `Your team is ready to start` and keeps the proof-pack
  card visible without introducing a second setup flow or hidden-substrate
  language.

Verification:

- Browser plugin opened `http://127.0.0.1:3100/DEAAAAAAAAA/dearme`, verified
  the live DOM across workbench, letter, and focused review, and clicked
  `Review proof pack` into the focused review URL above.
- Hidden terms were absent from the live DOM: `cycle packet`,
  `dearme-cycle-output`, `Paperclip`, `OpenClaw`, `adapter`, `provider`,
  `model`, `setup_payload`, `setup-payload`, and `Voice Gate v0`.
- Browser plugin screenshot capture timed out at the CDP screenshot step, so
  screenshots were captured with shell Playwright against the same local page:
  `/tmp/dearme-ui-verification/packet-aha-desktop-home.png`,
  `/tmp/dearme-ui-verification/packet-aha-desktop-focused-review.png`,
  `/tmp/dearme-ui-verification/packet-aha-mobile-home-rerun.png`, and
  `/tmp/dearme-ui-verification/packet-aha-mobile-focused-review-rerun.png`.
- Playwright desktop and mobile checks reported no horizontal overflow and a
  clean diagnostic pass: no business console messages, no page errors, and no
  failed page requests after excluding long-lived live-channel shutdown noise.

## DEA-7 OpenClaw Content Skill Drift Correction - 2026-05-10

Implementation slice:

- Regenerated the OpenClaw DearMe skills from the current
  `@paperclipai/dearme-agent-prompts` registry instead of copying the older
  DEA-7 worktree over the newer parent branch.
- Brought the generated `dearme-content-producer` skill into the same contract
  as the product prompt: private review packets, Voice Gate evidence, and no
  publish/send/schedule/connect/spend/deploy actions.
- Updated the OpenClaw skill generator test so future registry drift catches the
  old Twitter rate-limit and character-limit contract before it ships again.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw run generate-skills` regenerated
  12 skills and 4 bootstrap files.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 16 tests.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `pnpm --filter @paperclipai/dearme-openclaw build` passed.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx
  --maxWorkers=1` passed: 41 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. Vite still reports the
  existing `MarkdownEditor.tsx` dynamic/static import and large chunk warnings.
- `git diff --check` passed.
- Browser smoke opened `http://127.0.0.1:3100/DEAA/dearme`, found
  `Voice check` once, found no `Voice Gate v0`, and reported zero console
  errors or warnings.

## DEA-7 Voice-Gated Draft Handoff - 2026-05-10

Implementation slice:

- Integrated the Symphony DEA-7 worktree into the current main branch instead
  of copying the older worktree over newer DearMe proof-pack changes.
- Extended the shared DearMe output work-product contract with an optional
  `voiceGate` result, allowing prepared drafts to carry the same review score,
  approval gate, checks, and blocked-action language already used by the first
  cycle preview.
- Updated the output handoff service to read Voice Gate results from
  `issue_work_products.metadata` (`voiceGate`, `dearmeVoiceGate`, or
  `dearme.voiceGate`) and expose the parsed result without leaking provider
  metadata.
- Added a typed `dearMeContentDraftPacketSchema` and
  `persistContentDraftPacket(...)` path so a content worker can save one private
  review packet into the existing output handoff tables, preserving cycle
  evidence, draft body, proof used, launch boundary, and the strictest Voice
  Gate result.
- Reworked the inherited content-producer prompt from a Twitter posting agent
  into a DearMe private-draft role: it reads Brand OS, voice profile, reports,
  and channel preferences, then stages reviewable draft packets without
  publishing, sending, scheduling, connecting accounts, spending, or deploying.
- Surfaced the parsed Voice Gate as a customer-safe "Voice check" on focused
  prepared work, private work cards, and first proof-pack content/report cards.
  The UI shows score, status, and clean check summaries only; blocked actions,
  provider metadata, and raw runtime terms stay backstage.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts
  server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1` passed: 2
  files, 23 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts typecheck` passed.
- `pnpm --filter @paperclipai/dearme-agent-prompts test` passed: 25 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx
  --maxWorkers=1` passed: 41 tests.
- `pnpm exec vitest run ui/src/components/Layout.test.tsx
  ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 2 files, 50
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DM-141 Frontstage Team Workstream Polish - 2026-05-10

Implementation slice:

- Re-centered the DearMe workbench first screen around the customer promise:
  "Dear me, your team is working." The hero and today's operating focus now
  describe a visible personal-brand team preparing private work, instead of
  reading like a backstage control panel.
- Kept the launch boundary frontstage: public posts, outbound messages, spend,
  and page changes are still returned as one launch call while private work
  keeps moving.
- Normalized inherited packet/workbench wording across Work Ready, Decisions,
  report digest, run ledger, live feed, Voice & Memory, and focused detail
  surfaces so customers see one private proof pack instead of internal packet
  language.
- Fixed two mobile layout regressions found during real-page smoke: the closed
  mobile drawer no longer remains offscreen in the DOM, and long sample proof
  badges wrap instead of widening first-cycle preview cards.

Verification:

- `pnpm exec vitest run ui/src/components/Layout.test.tsx
  ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 2 files, 50
  tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/components/Layout.tsx
  ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- Shell Playwright opened the real local page at
  `http://127.0.0.1:3100/DEAA/dearme` in desktop and 390px mobile viewports,
  verified the new team-working copy, verified no console/page errors, and
  verified no horizontal overflow. Screenshots:
  `/tmp/dearme-ui-verification/team-workstream-desktop.png` and
  `/tmp/dearme-ui-verification/team-workstream-mobile.png`.

## DM-139 / DM-140 Packet-Backed Dear Me Report UI - 2026-05-10

Implementation slice:

- Extended the existing DearMe letter panel to recognize packet-backed reports
  from the workbench projection and render them as one private proof pack
  review, not separate content/report loops.
- Kept the shared schema and API unchanged; the UI consumes the existing report
  digest fields and maps internal packet wording into customer-facing proof pack
  language.
- The report surface now makes the launch boundary explicit: review once,
  nothing public moves until approval.
- The weekly focus card and report digest copy now sanitize internal packet
  wording on this path, keeping the DearMe customer surface product-native.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 40 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts
  server/src/__tests__/dearme-output-handoff.test.ts
  server/src/__tests__/dearme-brand-blueprints.test.ts
  ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 4 files, 52
  tests.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx
  ui/src/pages/DearMeOnboarding.test.tsx server/src/services/dearme-workbench.ts
  server/src/__tests__/dearme-workbench.test.ts` passed.

## DM-139 / DM-140 Cycle Packet Workbench Projection - 2026-05-10

Implementation slice:

- Extended the existing DearMe workbench projection so the shared private cycle
  packet now appears as one customer-safe review surface across Work Ready,
  Decisions, report digest, work stream, run ledger, and action graph nodes.
- Reused the output handoff documents and work products already written by the
  packet bridge; no new shared schema, API route, runtime dashboard, or
  provider-facing customer copy was added.
- Packet-backed decisions now carry the voice-fit signal and private review
  boundary, so the user sees "review the shared packet once" instead of
  separate report/content loops.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts --maxWorkers=1`
  passed: 3 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 3 files, 12 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-workbench.ts
  server/src/__tests__/dearme-workbench.test.ts` passed.

## DM-139 / DM-140 Cycle Packet UI Spotlight - 2026-05-10

Implementation slice:

- Reused the existing DearMe outputs/workProducts projection from the cycle
  packet bridge; no new API, runtime, or customer-facing substrate surface was
  added.
- Added a private-work spotlight that appears only when the generated content
  draft/report work products are present, summarizes the content draft and Dear
  me report together, and keeps the launch boundary visible.
- Customer-facing copy translates the internal cycle packet into a first proof
  pack, so the backend bridge can keep its durable provider/work-product
  contract while the UI stays product-native.
- `Review proof pack` opens the content draft first when both packet artifacts are
  ready, preserving the existing review-route model and keeping the hidden
  `dearme-cycle-output` provider name out of UI copy.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 40 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx
  ui/src/pages/DearMeOnboarding.test.tsx` passed.
- Browser plugin opened the real local DearMe page at
  `http://127.0.0.1:3100/DEAA/dearme`; DOM loaded as DearMe and console had no
  errors/warnings. The plugin surface could not route-mock outputs and CDP
  screenshot timed out, so the packet-state check used shell Playwright.
- Shell Playwright route-mocked only the `/outputs` response, verified the
  spotlight text, verified no hidden provider-name or internal `cycle packet`
  wording leaked in the spotlight, clicked `Review proof pack`, and landed on
  `/DEAA/dearme?view=decisions&issue=PET-8&output=issue-2%3Acontent_drafts`.
  Component screenshot:
  `/tmp/dearme-ui-verification/first-proof-pack-spotlight.png`.

## DM-139 / DM-140 Cycle Output Packet Bridge - 2026-05-10

Implementation slice:

- Added a shared private cycle output packet to the existing DearMe output
  handoff service instead of introducing a second reporting/content runtime.
- `prepareCycleOutputPacket(...)` now reads the current prepared outputs,
  scores the content draft with the existing Voice Gate, writes a
  `content-drafts` document, writes/refreshes the `dear-me-report` document,
  marks both output issues back to `in_review`, and records primary
  `dearme-cycle-output` work products for the content draft and report.
- First-cycle start now calls the packet bridge after preparing the five known
  output-handoff issues, so the initial proof package can immediately produce a
  voice-scored draft plus a private Dear me report from the same evidence.
- The bridge deliberately reuses Paperclip/Naive substrate primitives that are
  already in the tree: issues, documents, issue documents, issue work products,
  and service-layer projections. It does not expose substrate, worker, provider,
  or Symphony vocabulary to the customer surface.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprints.test.ts --maxWorkers=1`
  passed: 2 files, 9 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  passed: 3 files, 43 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

Remaining:

- `DEA-6` and `DEA-7` are now the Linear/Symphony continuation tickets for
  deeper autonomous reporting and voice-gated content production. Future
  workers should extend this packet bridge and the existing workbench/output
  projection rather than adding another report/content surface.

## Symphony Browser Smoke Runtime Hardening - 2026-05-10

Implementation slice:

- Treat Symphony as the default DearMe coordination surface from this point
  forward: Linear issue work should run through the DearMe Symphony daemon and
  its isolated workspaces unless a task explicitly needs a direct local edit.
- Tightened the Symphony worker browser-smoke rule so workers stay shell-only
  and, when Playwright is installed but the managed Chromium binary is missing,
  install Chromium once with `pnpm exec playwright install chromium` before
  falling back to API/DOM evidence.
- Installed the local Playwright Chromium cache for this machine, including
  `chromium_headless_shell-1208`, so shell Playwright can launch for DearMe
  browser checks without using Chrome MCP/browser elicitation surfaces.

Verification:

- `pnpm exec playwright install chromium` downloaded Chromium, FFmpeg, and
  Chromium Headless Shell into `/Users/peter/Library/Caches/ms-playwright`.
- A direct shell Playwright probe launched Chromium and loaded
  `http://127.0.0.1:3100/api/health`, returning the DearMe health payload with
  `status: "ok"` and `deploymentMode: "local_trusted"`.
- The real Symphony API on `http://127.0.0.1:4100/api/v1/state` still reports
  `DEA-5` running in `/private/tmp/dearme-symphony-workspaces/DEA-5`.
- The `DEA-5` worker used shell commands only. It hit the missing Playwright
  Chromium cache, recorded the exact blocker, created a fresh smoke company
  `DEAAAAAAAA`, verified the first-cycle preview API payload, and then began a
  temporary `/private/tmp` Playwright Chromium install for the real browser
  smoke path.

Operational note:

- Symphony clones the committed source branch into isolated workspaces. Parent
  checkout changes that are still uncommitted are invisible to workers, so
  future cooperation needs branch/commit discipline before handing work to the
  queue.

## Symphony Team Queue Correction - 2026-05-10

Implementation slice:

- Updated the local Symphony tracker support so DearMe can route by Linear
  team `DEA` instead of requiring a Linear Project slug.
- Switched `.symphony/WORKFLOW.md` to `team_key: "DEA"` and `assignee: me`.
  The DearMe Linear workspace currently has the team/issue prefix `DEA` but no
  Project, so the old `project_slug: "dearme"` path could not see the real
  worker queue.
- Assigned `DEA-5` to Peter so the assignee filter picks up the intended live
  worker/browser smoke while leaving Linear's default onboarding issues
  unassigned and ignored.

Verification:

- Symphony targeted tests passed: `mix test test/symphony_elixir/core_test.exs
  test/symphony_elixir/workspace_and_config_test.exs` reported 86 tests, 0
  failures.
- `mix build` regenerated `/Users/peter/symphony/elixir/bin/symphony`.
- `.symphony/bin/dearme-symphony smoke` returned a valid state payload.
- The real daemon on `http://127.0.0.1:4100/` now reports one running issue:
  `DEA-5`, workspace `/private/tmp/dearme-symphony-workspaces/DEA-5`, and a
  live Codex session.

## DM-138E Trial First-Cycle Proof Smoke And Symphony Credential Check - 2026-05-10

Implementation slice:

- Trial users now call the existing first-cycle preview path from the
  90-second first-cycle CTA, while active paid-beta users still call the
  private start path.
- The CTA labels the distinction directly: `Preview first cycle` during trial,
  `Start first cycle` when `canStartPrivateWork` is true.
- Added UI regression coverage for both branches so trial preview cannot
  silently try to start paid private work again.
- Hardened the DearMe Symphony wrapper so it can read the Linear token from the
  existing Keychain `LINEAR_API_KEY` service when the default
  `dearme-linear-api-key` service is not present.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 38 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- .symphony/bin/dearme-symphony ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- Browser smoke on `http://127.0.0.1:3100/DEAA/dearme` in trial state posted
  to `/api/dearme/companies/:companyId/first-cycle/preview` with HTTP 200,
  removed `Sample team package`, and rendered `First-run proof sequence`,
  `From: Prepared from private Brand OS work and voice work`, and `Waits:`.
- Browser console had no `error` or `warn` messages during the smoke. Chrome
  still reports two pre-existing form-label accessibility issues on the page.
- `env -u LINEAR_API_KEY .symphony/bin/dearme-symphony start` read the Linear
  token from Keychain and returned a valid state payload.

Live closure update:

- Re-hardened `.symphony/bin/dearme-symphony` so status/start/stop recover
  from stale PID files by asking the live API for the actual listener process;
  current daemon status reports `pid=48151`, dashboard
  `http://127.0.0.1:4100/`, and `DEA-5` running in
  `/private/tmp/dearme-symphony-workspaces/DEA-5`.
- Fixed a stale-output bug found during the live smoke: first-cycle start now
  reopens the known proof-output issues to `in_review` when they already
  exist, and the output handoff keeps the newest issue per fingerprint instead
  of letting older cancelled history overwrite the current proof.
- Live API smoke for company `60334302-c360-4e9f-8e98-d6e42815217e` now
  returns `brand_os`, `voice_profile`, `content_drafts`,
  `opportunity_drafts`, `portfolio_update`, and `weekly_report` as
  `ready_for_review` with identifiers `DEAA-110`, `DEAA-112`, `DEAA-113`,
  `DEAA-114`, and `DEAA-115`; no output is `cancelled`.
- Browser smoke on `http://127.0.0.1:3100/DEAA/dearme` filled the first-cycle
  intent, clicked `Preview first cycle` and then `Start first cycle`, rendered
  `Prepared from private Brand OS work and voice work`, showed
  `Ready for review`, had zero console errors, and leaked none of
  `paperclip`, `naive`, `openclaw`, `polsia`, or `symphony` into the customer
  surface.
- Server regression coverage now passes:
  `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --maxWorkers=1`
  reported 3 files and 42 tests passing.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check` passed for the DM-138E service/test/docs/Symphony wrapper
  slice.

Remaining:

- The old zero-worker state was caused by Project-only routing against a
  Project-less Linear workspace. The daemon now routes by team `DEA` and is
  running `DEA-5`; the coordinator should treat the product path as locally
  smoke-passed and let the Symphony worker report any independent follow-up
  instead of duplicating the same first-cycle contract again.

## DM-138D Start-Route Proof Output Write - 2026-05-10

Implementation slice:

- `POST /api/dearme/companies/:companyId/first-cycle/start` now prepares the
  first proof package before returning the preview, instead of only echoing a
  mocked prepared sequence in route coverage.
- Reused the existing DearMe output handoff path by creating/updating private
  Brand Blueprint output issues with the known fingerprints:
  `brand-os-review`, `operation-draft_content_batch`,
  `operation-draft_opportunity_list`, `operation-prepare_portfolio_update`,
  and `operation-schedule_weekly_report`.
- Wrote the actual markdown artifacts through the existing document service:
  Brand OS, Voice Profile, approval gates, starter posts, opportunity list,
  portfolio update, and Dear me report. Re-running the start path updates the
  same five output issues rather than creating duplicates.
- Kept the customer contract singular: the route still returns the existing
  `DearMeFirstCyclePreviewResponse`, and prepared worker proof stays inside
  `proofSequence` rather than a second first-run payload.
- Kept route propagation covered: the prepared sequence still flows into the
  private first-cycle issue description, activity-log `artifactOrder`, and live
  `task_created` event payload.

Verification:

- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --maxWorkers=1`
  passed: 37 tests.

Remaining:

- `DEA-5` / `DM-138E` is now the Linear/Symphony ticket for the live
  worker/browser smoke. The local code path is covered; the next check should
  run the first-cycle aha path through Symphony where available, or record the
  exact daemon/token blocker and execute the same browser smoke locally.

## DM-138C First-Run Proof Hydration - 2026-05-10

Implementation slice:

- Hydrated the existing `DearMeFirstCyclePreviewResponse.proofSequence` from
  prepared DearMe output handoff records instead of adding a second first-run
  payload.
- `previewFirstCycle(...)` now maps prepared Brand OS / voice, content,
  opportunity, portfolio, and report documents or work products into the same
  three proof windows: 0-30s identity dossier, 60-120s audience map, and
  3-5min private site proof.
- The customer contract stays singular: UI, first-cycle start, and coordinator
  work order continue to speak through `proofSequence`.
- Tightened the proof signal so ordinary progress comments do not masquerade
  as first-run proof; only prepared `documents` or `workProducts` can override
  deterministic preview copy.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 36 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- `git diff --check` passed for the service/test/docs slice.

Next:

- DM-138D now writes proof artifacts on start. The remaining live check is the
  real Linear/Symphony worker/browser run tracked as `DEA-5`.

## DM-138B First-Run Proof Sequence Contract - 2026-05-10

Implementation slice:

- Added `proofSequence` to the existing `DearMeFirstCyclePreviewResponse`
  contract instead of creating a second first-run payload.
- The shared preview builder now emits the three product proof windows:
  0-30s identity dossier, 60-120s audience map, and 3-5min private site proof.
- The first-cycle start route now creates its private issue from the same
  `proofSequence`, so coordinator work order and UI proof cards stay aligned.
- The onboarding proof package renders `proofSequence` directly for both the
  sample package and the generated package while keeping donor/runtime terms
  out of the customer surface.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 86 tests.

## DM-183B Symphony Patch-Equivalent Worktree Guard - 2026-05-10

Implementation slice:

- Added `patch_equivalent` as a first-class DearMe worktree status for
  Symphony coordination.
- The classifier now checks cherry-pick equivalence after the ancestor test,
  so a worker branch whose patch is already present on the coordinator head no
  longer stays in the replay-candidate bucket just because its commit is not an
  ancestor.
- Coordinator actions now tell operators to close patch-equivalent worktrees
  only after owner confirmation, matching the existing `in_current` safety
  posture.

Verification:

- `pnpm test:dearme-worktrees` passed: 7 tests.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 116
  worktrees: 1 current, 2 `in_current`, 0 `patch_equivalent`, 113
  `not_in_current`, 19 integration branches, and 96 worker branches.
- `pnpm dearme:worktrees -- --status=patch-equivalent --skip-dirty --limit=20`
  returned zero records, so the current candidate pool still needs product
  review rather than automatic closure.
- `git log --right-only --cherry-pick --format=%H HEAD...codex/dearme-dm-087-work-event-contract`
  returned right-side commits,
  confirming DM-087 is not patch-equivalent to the current coordinator head.

## DM-183 Symphony Worktree Status Contract - 2026-05-10

Implementation slice:

- Promoted `scripts/dearme-worktree-status.mjs` from a raw worktree lister into
  a coordinator report for the Symphony-style DearMe development loop.
- The report now annotates each checkout with ticket id, purpose
  (`current`, `integration`, or `worker`), and an explicit coordinator action,
  so old worker branches become review candidates instead of automatic merge
  targets.
- Added filters for `--status`, `--not-in-current`, `--ticket`, `--dirty-only`,
  `--limit`, `--summary-only`, and `--skip-dirty`, while preserving the
  documented `pnpm dearme:worktrees -- --json` style argument separator.
- Added a focused Node test suite and `pnpm test:dearme-worktrees` so future
  coordinator edits do not break the shared worktree fact command.

Verification:

- `pnpm test:dearme-worktrees` passed: 6 tests.
- `pnpm dearme:worktrees -- --summary-only --skip-dirty` reported 116
  worktrees: 1 current, 2 `in_current`, 113 `not_in_current`, 19 integration
  branches, and 96 worker branches.
- `pnpm dearme:worktrees -- --not-in-current --ticket=DM-138 --limit=5
  --skip-dirty` returned zero records, so the active DM-138 slice should start
  from a fresh isolated worktree rather than reuse a stale DM-138 checkout.

## DM-180 Approval Resolver API Boundary - 2026-05-10

Implementation slice:

- Added shared request/result validators and
  `POST /api/dearme/companies/:companyId/approvals/resolve` over the existing
  approval resolver service.
- The route enforces company access, rejects cross-company issue references,
  normalizes issue identifiers before resolving, and logs the decision through
  the existing activity log.
- The resolver now preserves user/agent attribution on both `approvals` and
  `issue_approvals`, and the outbound tool wrapper calls the same service path.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/services/dearme-outbound-tool-wrapper.test.ts`
  passed: 41 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-182 OpenClaw Passthrough Workbench Refresh - 2026-05-10

Implementation slice:

- Folded `openclaw_lifecycle` and `openclaw_stream` into the existing DearMe
  workbench EventSource consumer instead of adding a second runtime view.
- The UI now treats execution lifecycle / stream passthroughs like other
  runtime movement: debounce the event and refetch the customer-safe workbench
  projection from the existing React Query cache key.
- Added regression coverage proving a lifecycle passthrough refreshes the
  rendered Team workbench while the customer surface stays free of donor /
  runtime vocabulary.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx` passed:
  37 tests.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`,
  `ui/src/api/dearme.ts`, and `packages/shared/src/validators/dearme.ts`
  returned no matches.

## DM-181 DearMe Live Workbench UI Consumer - 2026-05-09

Implementation slice:

- Added the DearMe workbench EventSource consumer to the existing onboarding /
  workbench page instead of creating another runtime dashboard.
- The UI opens the company-scoped workbench stream, applies `sync` payloads
  directly into the existing React Query workbench cache, and debounces the
  broader runtime event types into a normal workbench invalidation.
- Kept the customer surface simple: the page updates as the team moves, while
  runtime/provider/substrate names remain inside API and architecture layers.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx` passed:
  36 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DM-179 DearMe Live Workbench SSE Route - 2026-05-09

Implementation slice:

- Added `GET /api/dearme/companies/:companyId/events` as the first HTTP edge
  over `dearme-sse-bus`.
- The route enforces company access before opening the stream, sends an initial
  `sync` event with the existing DearMe workbench projection, then forwards
  typed runtime events scoped to that company only.
- Kept the product surface customer-safe: the stream exposes the live team /
  workbench state and runtime events without adding a donor/runtime dashboard or
  customer-visible substrate vocabulary.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 29 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.

## DM-136 First-Run Autopilot Plan Contract - 2026-05-09

Implementation slice:

- Added a typed first-cycle `autonomyPlan` to the shared preview response so
  the UI, server mocks, and OpenClaw-facing contract all describe the same
  private work loop.
- Kept the plan customer-safe: DearMe continues positioning capture, draft
  preparation, opportunity/proof staging, voice review, and the next private
  pass without asking, and waits only for public posts, outbound messages,
  public page changes, or spend.
- Rendered the plan inside the existing first-cycle proof package instead of
  adding a new setup screen, runtime dashboard, or donor-facing control plane.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts` passed:
  15 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx` passed:
  35 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 27 tests.
- `pnpm exec vitest run server/src/services/dearme-outbound-tool-wrapper.test.ts`
  passed: 9 tests.
- `pnpm --filter @paperclipai/shared typecheck`,
  `pnpm --filter @paperclipai/ui typecheck`, and
  `pnpm --filter @paperclipai/server typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  and `packages/shared/src/validators/dearme.ts` returned no donor/runtime
  term matches.
- Playwright browser check on `http://127.0.0.1:3100/DEAA/dearme` confirmed
  the Autopilot card renders, `ONLY WAITS HERE` is visible, no donor/runtime
  terms appear in body text, and screenshot evidence was saved to
  `/tmp/dearme-dm136-autopilot-plan.png`.

## DM-136 First-Run Sample Demo Proof - 2026-05-09

Implementation slice:

- Added a private sample first-cycle package to the DearMe onboarding surface so
  a visitor can feel the personal brand team already moving before typing their
  own positioning answer.
- Reused the existing shared first-cycle preview generator instead of adding a
  second demo route, backend fixture, or one-off UI data shape.
- Refactored the first-cycle result renderer into a shared proof-package
  component so the sample state and generated user state stay visually and
  contractually aligned.
- Recalibrated customer-facing copy toward Polsia-style aha-first autonomy:
  private work keeps moving automatically, while public posts, outbound
  messages, spend, and page changes come back as launch decisions.
- Added focused UI coverage that proves the sample appears without calling the
  preview API, carries the more aggressive launch-boundary language, and
  disappears after the user starts their own first cycle.
- Integrated the PM / product-architect donor analysis into the canonical
  provenance order through `POLSIA-NAIVE-PM-ANALYSIS.md` and
  `REBRAND-AND-PROVENANCE.md`.

Donor reuse:

- Polsia remains the choreography reference: first contact should show visible
  work and a prepared team package, not an empty dashboard.
- Naive/Paperclip remains the hidden implementation substrate: the sample uses
  the existing typed first-cycle contract while presenting public/send/deploy/
  spend control as a launch boundary instead of a concern-heavy first screen.
- Lindy remains the review grammar reference: the proof package is presented as
  ready private work plus one clear launch decision controlled by the user.
- Littlebird remains the web ergonomics reference: the sample is compact and
  readable in the existing DearMe web shell.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts
  ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 2 files,
  49 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches for donor/runtime terms.
- Browser plugin check on
  `http://127.0.0.1:3100/DEAA/dearme` confirmed the sample team package,
  Maya Chen sample, and launch boundary are visible.
- Playwright desktop/mobile check on
  `http://127.0.0.1:3100/DEAA/dearme` passed: the sample package renders on
  first load, the generated first-cycle package replaces it after the user
  starts a cycle, no checked donor/runtime terms appear, and horizontal
  overflow stays at `0`.
- Screenshots: `/tmp/dearme-dm136-desktop-sample-demo-proof.png` and
  `/tmp/dearme-dm136-mobile-sample-demo-proof.png`.
- `git diff --check` passed.

Product calibration:

- DearMe should bias harder toward Polsia's aha-first posture. Research,
  planning, sample output, private drafting, reports, and previews should run
  automatically and visibly; the user should feel a team already moved before
  they manage settings.
- Concern should not dominate the product surface. Keep gates for actions that
  actually affect reputation, spend, public pages, or outbound messages, but
  express them as launch boundaries after the product has shown momentum.

Next:

- After DM-136, the next useful product slice is a higher-polish aha-first
  landing/home composition around visible team motion, sample proof, and Work
  Ready decisions, not a new runtime or donor UI transplant.

## DM-135 First-Run Sample Team Proof - 2026-05-09

Implementation slice:

- Confirmed the existing first-cycle preview contract already generates a
  Voice Profile, three starter posts, one opportunity lead, one portfolio proof
  card, and one first growth plan from a single positioning answer.
- Added the missing customer proof in the DearMe first-run result: the generated
  package now renders its approval boundary and blocked public actions directly
  beside the sample work.
- Recorded the DM-135 plan in
  `doc/plans/2026-05-09-dearme-dm-135-first-run-sample-team-proof.md`.

Donor reuse:

- Polsia remains the choreography reference: the first run should feel like a
  small team is already moving across content, opportunity, portfolio, and
  planning lanes.
- Naive/Paperclip remains the hidden implementation substrate: this slice
  reused the existing shared contract, route, service, and UI API.
- Lindy remains the review grammar reference: the proof package now shows what
  is ready and what is approval-gated before external action.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm test:run` passed across the workspace after the DM-135 integration.
- `pnpm build` passed. Vite still reports the existing non-blocking
  `MarkdownEditor.tsx` mixed dynamic/static import warning and large chunk
  warnings, but the build completed successfully.
- `git diff --check` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser-plugin check on `http://127.0.0.1:3100/DEAA/dearme` exercised the
  first-cycle preview and showed the generated package plus approval boundary.
- Playwright desktop `1440x1000` and mobile `390x844` passed on
  `/DEAA/dearme`: all first-run package sections and approval-boundary actions
  visible, no horizontal overflow, no framework overlay, no relevant console
  error/warn logs, and no customer-visible donor/runtime terms.
- Screenshot evidence:
  `/tmp/dearme-dm135-desktop-first-run-proof.png` and
  `/tmp/dearme-dm135-mobile-first-run-proof.png`.

Next:

- DM-135 is committed and integrated on `dearme` at `2070951a`.
- Next product slice should be DM-136: make a polished sample/demo proof path so
  a visitor can understand the team package even before entering their own
  positioning answer.

## Donor Provenance Hardening - 2026-05-09

Current integrated state:

- `dearme` is clean through `b8600eb6`, which added
  `CODE-PROVENANCE-FACT-CHECK.md` and corrected the canonical interpretation of
  the Polsia / Naive comparison.
- The engineering truth is now explicit: DearMe code lineage is
  Paperclip/Naive, while Polsia remains a product-choreography and packaging
  reference.
- Historical Polsia comparison docs now carry top-level warnings, and the most
  misleading body-level clone/verbatim guidance has been rewritten as
  historical pre-pivot product-spec material.

Verification:

- Rechecked the local fork note, package name, remotes, branch topology, route
  count, schema count, server/shared/db LOC count, and local Polsia/Naive
  research path existence before hardening the docs.
- `git diff --check` passed for the follow-up doc corrections.

Next:

- Continue with DM-135: first-run sample team proof.

## Integration Wrap-Up - 2026-05-09

Current integrated state:

- Before this wrap-up pass, `dearme` was clean and pointed at `69f46e10`.
- `69f46e10` contains DM-134 and is also contained by
  `codex/dearme-dm-134-brand-team-run-ledger`.
- DM-134 has already been fast-forward merged into `dearme`.
- The current long-running goal remains active; the product is not complete.

Product judgment:

- DearMe has moved from a generic operator shell toward a customer-facing
  personal brand team surface.
- The most valuable reuse so far is not raw UI copying. It is the product
  division of labor: Polsia for visible team momentum, Naive/Paperclip for
  hidden execution substrate, Lindy for review/action-card grammar, and
  Littlebird for compact web ergonomics.
- The next missing product moment is still first-run proof: a new user should
  see a credible team output package before connecting real channels or
  trusting deeper automation.

Next:

- Continue with DM-135: first-run sample team proof, so a new user sees a
  credible Voice Profile, starter posts, opportunity lead, proof card, and
  first plan before connecting real channels.
- Keep DM-135 as a projection over existing preview/workbench data unless code
  evidence proves a shared contract change is needed.

## DM-134 Brand Team Run Ledger - 2026-05-09

Implementation slice:

- Added a customer-safe `Brand Team Run Ledger` panel to the DearMe workbench.
- The ledger shows what the brand team tried, prepared, learned, and needs
  from the user.
- Added a typed shared `runLedger` read model to the DearMe workbench contract.
- Derived every ledger entry on the server from the existing `workStream`, with
  latest Voice & Memory as a fallback when no learned item is already present.
- Kept backend routes, database tables, runtime services, action graph
  contracts, and provider integrations unchanged.

Donor reuse:

- Polsia supplies the visible team-motion rhythm: the user should see what
  happened while they were away.
- Naive/Paperclip supplies the hidden substrate: the ledger reads existing
  workbench, progress, memory, decision, and report data instead of adding a
  second runtime.
- Lindy supplies the action-card/review-surface grammar: compact cards, visible
  status, and customer-readable next calls.
- Littlebird supplies the mobile discipline: compact buckets that wrap without
  creating a separate phone UI.

Rejected:

- Rejected adding a new backend ledger table before proving the projection
  shape from existing data.
- Rejected importing donor UI wholesale; the DearMe shell already owns the
  customer-facing design language.
- Rejected exposing raw runtime events or donor names in the customer path.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed: 4 files, 77 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over `ui/src/pages/DearMeOnboarding.tsx`,
  `packages/shared/src/validators/dearme.ts`, and
  `server/src/services/dearme-workbench.ts` returned no matches.
- Browser-plugin check on `http://127.0.0.1:3100/dearme` passed with one
  `Brand team run ledger`, one run-ledger grid, all four buckets, and 6 ledger
  entries visible.
- Playwright desktop `1440x1000` and mobile `390x844` passed on
  `/DEAA/dearme`: all ledger copy and bucket markers visible, no horizontal
  overflow, no framework overlay, no app console error/warn logs, and no
  customer-visible donor/runtime terms.
- Screenshot evidence: `/tmp/dearme-dm134-desktop-run-ledger.png` and
  `/tmp/dearme-dm134-mobile-run-ledger.png`.

Next:

- DM-134 is committed and fast-forward merged into `dearme`.
- Continue with DM-135: first-run sample team proof, so a new user sees a
  credible team output before connecting real channels.

## DM-133 Mobile Decision Detail Polish - 2026-05-09

Implementation slice:

- Made focused decision and prepared-work review controls mobile-first.
- Added stable mobile action-group markers for approval review and prepared
  work review controls.
- Gave focused decision surfaces extra mobile bottom padding so primary review
  actions do not sit under the DearMe bottom nav.
- Kept the existing review, approval, continuation, route, API, and desktop
  behavior unchanged.

Donor reuse:

- Lindy supplies the detail-surface pattern: review actions should stay inside
  the focused item instead of sending users into a broad dashboard.
- Littlebird supplies the mobile ergonomics rule: primary actions become full
  width on phone and compact again on larger screens.
- Polsia supplies the decision rhythm: keep the user close to the few calls
  that matter.
- Naive/Paperclip remains the hidden output-review and approval substrate.

Rejected:

- Rejected adding a second mobile drawer or route; the focused decision surface
  already owns this flow.
- Rejected changing backend review contracts or approval semantics for a
  responsive layout problem.
- Rejected exposing raw work-state or donor runtime terms in the decision
  surface.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx ui/src/components/DearMeSidebar.test.tsx ui/src/components/Layout.test.tsx --maxWorkers=1`
  passed: 3 files, 48 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over the touched DearMe onboarding file
  returned no matches.
- Browser/Playwright mobile `390x844` and desktop `1440x1000` on a live focused
  approval decision passed with focused-surface bottom padding, an
  `approval-review` action group, phone-first button classes, no horizontal
  overflow, no framework overlay, no customer-visible donor/runtime terms, and
  empty console error/warn logs.
- Screenshot evidence: `/tmp/dearme-dm133-mobile-approval-review.png` and
  `/tmp/dearme-dm133-desktop-approval-review.png`.
- Prepared-work focused controls are covered by component tests. The current
  local runtime dataset has no `workReady` outputs, so the browser pass could
  not honestly exercise a live `prepared-work-review` detail without mutating
  seed data.

Next:

- Continue with Brand Team Run Ledger: turn Polsia-style live progress into a
  DearMe-safe record of what the team tried, prepared, learned, and needs from
  the user.

## DM-132 Mobile Shell Navigation Polish - 2026-05-09

Implementation slice:

- Added a DearMe-specific mobile bottom navigation for the customer route.
- The mobile nav leads with Home, Decisions, Work Ready, Voice, and More
  instead of inherited workspace navigation.
- Wired More to open the existing DearMe sidebar drawer, keeping secondary
  surfaces available without crowding the bottom bar.
- Kept the generic mobile bottom nav disabled on DearMe routes.
- Kept backend routes, database tables, runtime services, route contracts,
  dependencies, and desktop layout unchanged.

Donor reuse:

- Polsia supplies the routing priority: keep the user close to high-leverage
  decisions and ready work rather than exposing operations chrome.
- Naive/Paperclip remains the hidden substrate; this slice reuses the existing
  layout shell and sidebar drawer instead of creating a new runtime or route.
- Lindy supplies the compact app-navigation rhythm for returning to active
  work, decisions, and voice review.
- Littlebird supplies the mobile ergonomics target: short labels, stable tap
  targets, safe-area padding, and no first-viewport navigation collision.

Rejected:

- Rejected enabling the generic Paperclip mobile nav on DearMe because it
  exposes workspace-style destinations that do not match the personal-brand
  product.
- Rejected adding all DearMe surfaces to the bottom bar; the phone needs the
  few repeat actions first, with More opening the full menu.
- Rejected adding a backend route, new nav contract, or donor component import
  for a shell-only interaction.

Verification:

- `pnpm exec vitest run ui/src/components/Layout.test.tsx ui/src/components/DearMeSidebar.test.tsx ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 3 files, 48 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over the touched DearMe shell files
  returned no matches.
- Playwright mobile `390x844` on `/dearme` passed: title
  `Team · DearMe · DearMe`, redirected URL `/DEAA/dearme`, DearMe mobile nav
  count `1`, generic nav count `0`, console error/warn logs empty,
  `Decisions` navigated to `/DEAA/dearme?view=decisions`, and More opened the
  full DearMe menu.
- Playwright desktop `1440x1000` on `/dearme` passed: mobile nav count `0`,
  generic nav count `0`, and console error/warn logs empty.
- Screenshot evidence: `/tmp/dearme-dm132-mobile-after.png`,
  `/tmp/dearme-dm132-mobile-decisions-after.png`,
  `/tmp/dearme-dm132-mobile-menu-after.png`, and
  `/tmp/dearme-dm132-desktop-after.png`.

Next:

- Continue with a mobile action-detail polish pass: the bottom nav is now
  product-safe, but focused review/decision drawers should get a dedicated
  small-screen interaction check before paid-beta launch.

## DM-131 Browser Polish For The DearMe Team Workbench - 2026-05-09

Implementation slice:

- Browser-verified the DM-130 first-screen DearMe workbench on the live local
  app at `http://127.0.0.1:3100/dearme`.
- Fixed the first-screen focus grid so the "While you were away" work card
  stays top-aligned instead of being stretched to the full height of the right
  status column.
- Kept the slice to layout polish only: no backend route, database table,
  workbench contract, runtime service, dependency, or donor component import
  changed.

Donor reuse:

- Lindy supplies the dense home/workbench rhythm: compact current-work cards
  should scan as content, not empty containers.
- Littlebird supplies the mobile ergonomics target: the same first-screen
  hierarchy should wrap cleanly without horizontal overflow.
- Polsia supplies the visible-momentum requirement: "work happened while I was
  away" needs to read immediately in the first viewport.
- Naive/Paperclip remains the hidden substrate; this slice only changes how
  the existing workbench projection is arranged.

Rejected:

- Rejected adding another workbench endpoint or layout-specific data shape;
  the issue was a CSS grid stretch artifact.
- Rejected replacing the DearMe shell with a donor dashboard or adding a
  separate mobile view before the current responsive shell was proven.

Verification:

- Browser plugin path attempted first; current session exposed no in-app
  browser backend, so the rendered pass used the repo Playwright fallback.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Customer-surface hidden-term scan over the touched DearMe onboarding UI/test
  files returned no matches.
- Playwright desktop `1440x1000` on `/dearme` passed: title
  `Team · DearMe · DearMe`, redirected URL `/DEAA/dearme`, required focus
  copy present, Vite/Next/Webpack overlay selectors all `0`, console
  error/warn logs empty, horizontal overflow false, and the `Decisions` link
  navigated to `/DEAA/dearme?view=decisions`.
- Playwright mobile `390x844` passed: required focus copy present, overlay
  selectors all `0`, console error/warn logs empty, and horizontal overflow
  false.
- Screenshot evidence: `/tmp/dearme-dm131-desktop-fixed.png`,
  `/tmp/dearme-dm131-mobile-fixed.png`, and
  `/tmp/dearme-dm131-decisions-fixed.png`.

Next:

- Completed by DM-132; continue with mobile action-detail polish.

## DM-130 Web Shell Polish From Lindy And Littlebird - 2026-05-09

Implementation slice:

- Added a first-screen `Today's operating focus` surface to the DearMe
  workbench.
- The surface leads with "While you were away", the next private move, team
  focus, decisions waiting, work ready, weekly letter status, and voice-profile
  confidence.
- The panel derives entirely from the existing workbench response:
  `workStream`, `recentProgress`, `activeWork`, `workReady`,
  `decisionsNeeded`, `batchDecisions`, `memory`, `report`, and `team`.
- Kept backend routes, database tables, runtime services, and generated
  portfolio/site provisioning unchanged for this slice.

Donor reuse:

- Polsia supplies the customer choreography: users immediately see that work
  happened while they were away and only the highest-leverage calls need them.
- Naive/Paperclip supplies the hidden substrate through the existing workbench
  projection; no second runtime or API was added.
- Lindy supplies the premium two-rail home composition and compact assistant
  status-card pattern.
- Littlebird supplies the focused onboarding/task-row discipline: one clear
  current step, compact supporting rows, and trust-first copy.

Rejected:

- Rejected copying Polsia's visual style, public live-feed defaults, or
  company-factory framing.
- Rejected waiting for a complete Naive proprietary front-end source drop; the
  current DearMe/Paperclip workbench is already the reliable substrate.
- Rejected importing Lindy or Littlebird components wholesale because their
  routing, stores, product language, and brand surfaces do not match DearMe.
- Rejected adding a new backend shell endpoint before exhausting the existing
  workbench projection.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `git diff --check` passed.
- Customer-surface hidden-term scan passed for the touched DearMe onboarding
  UI/test files.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed across the workspace. Vite emitted the existing
  MarkdownEditor dynamic/static import notice and chunk-size warning; neither
  failed the build.

Next:

- Completed by DM-131; continue with mobile shell/navigation polish.

## DM-129 Automation Reliability And Cost Policy - 2026-05-09

Implementation slice:

- Added `docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md` as the accepted
  policy for can-run, ask-first, stop-trying, and spend-display behavior.
- Added a customer-facing `Team operating policy` panel to the DearMe
  workbench.
- The panel derives its state from existing paid-beta access, workbench
  decisions, review-loop attempts, and spend checkpoints rather than adding a
  new backend contract.
- Kept backend routes, database tables, budget services, model routing, and
  runtime services unchanged for this slice.

Donor reuse:

- Polsia supplies the pattern for async customer-visible execution and
  task/subscription-level cost attribution.
- Naive/Paperclip supplies the hidden pre-invocation budget block, cost-event
  ledger, and work/run/document review substrate.
- Lindy supplies the policy shape for effort routing, max-turn discipline,
  consecutive-failure circuit breaking, and recovery learning.

Rejected:

- Rejected importing Polsia scheduling code or relying on in-process timers as
  DearMe's reliability boundary.
- Rejected copying Naive/Paperclip admin language, raw cost ledger details, or
  provider/model controls into the DearMe customer surface.
- Rejected transplanting Lindy's Python executor or adding a new backend model
  router before the product policy was visible and test-covered.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed with the existing Vite dynamic/static import and chunk
  size warnings only.
- `git diff --check` passed.
- Customer-surface hidden-term scan over touched DearMe UI/shared paths found
  no new substrate terms after filtering code-only package/test identifiers.
- `pnpm check:tokens` remains blocked by existing historical tracked
  documentation/test hits outside this slice.

Next:

- Run `DM-130`: Web Shell Polish From Lindy And Littlebird, now that source
  detail, focused decisions, and team operating policy are visible in the
  workbench.

## DM-128 Focused Decision Review Drawer - 2026-05-09

Implementation slice:

- Added direct prepared-work review controls to the focused DearMe decision
  surface for Work Ready items and batch prepared work.
- The focused surface now supports approve, request changes, prepare another
  private pass, and choose a new direction without sending the user through a
  broad issue or approval route.
- Reused the existing DearMe output review and continue path; no new backend
  route, table, runtime, or drawer-specific API was added.
- Added focused card state to DearMe workbench/action cards so selected Work
  Ready, Private Work, and Decisions Needed items stay visually connected to
  the focused decision surface.
- Approval-only Brand OS decisions still use the existing approval review gate.

Donor reuse:

- Polsia supplies the product choreography: prepared work becomes a small set
  of high-leverage user calls instead of an operator dashboard.
- Naive/Paperclip supplies the hidden substrate: existing output ids, review
  loop state, continuation intents, and approval boundaries.
- Lindy supplies the interaction reference: compact action-card grammar,
  pending-review modal shape, and focused side/detail panel behavior adapted
  into DearMe-native UI.

Rejected:

- Rejected adding a second decision drawer backend or duplicating output review
  state.
- Rejected routing paid-beta users into raw issue, approval, runtime, or donor
  UI surfaces for prepared work review.
- Rejected importing Lindy Relay/GraphQL shell or donor brand language.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 34 tests.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed with the existing Vite dynamic/static import and chunk
  size warnings only.
- `git diff --check` passed.
- Customer-surface hidden-term scan over touched DearMe UI/shared paths found
  no new substrate terms after filtering code-only package/test identifiers.
- `pnpm test:run` was not rerun for this focused UI slice; DM-125 recorded an
  existing full-suite concurrency timeout around the standalone onboarding
  file, so this pass used targeted UI tests plus typecheck/build.

Next:

- Run `DM-129`: Automation Reliability And Cost Policy, adapting Lindy
  router/executor and Naive/Paperclip cost rails into a DearMe policy before
  adding deeper autonomous execution.

## DM-127 Voice & Memory Source Detail Drawer - 2026-05-09

Implementation slice:

- Added a selected source detail surface to `Voice & Memory` for pending source
  review items.
- Kept the current `sourceReviewQueue` projection and memory form as the only
  implementation path: no new backend route, table, crawler, importer, or
  workflow runtime.
- `Review source` from Decisions and `Prepare fact` from Voice & Memory now
  select the source, highlight the card, prefill the reviewed fact form, and
  open the detail surface.
- The detail surface lets the user edit in the existing form, save the reviewed
  fact, close the detail, or mark the source not useful through the existing
  source-retire path.
- Extended the DearMe onboarding UI tests from 30 to 31 tests to cover selected
  detail, save-from-detail, and dismiss behavior.

Donor reuse:

- Lindy `KnowledgeBaseEditor.tsx` supplied the source-list-plus-configure
  pattern.
- Lindy `ResizableSlideOutPanel.tsx` supplied the focused detail-panel shape,
  adapted as an inline DearMe detail surface rather than importing Lindy UI.
- Naive/Paperclip continues to supply the hidden memory substrate, update path,
  archive path, and workbench projection.
- Polsia continues to supply the product choreography: source review stays a
  small high-leverage user call inside the growth cycle.

Rejected:

- Rejected adding a source-review backend, crawler/import worker, new database
  table, or second memory runtime.
- Rejected copying Lindy Relay/GraphQL shell or Lindy brand language.
- Rejected leaving source review as a broad panel jump after the user chooses a
  specific source.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 1 file, 31 tests.
- `pnpm -r typecheck` passed across the workspace.
- `pnpm build` passed with the existing Vite dynamic/static import and chunk
  size warnings only.
- `git diff --check` passed.
- Customer-surface hidden-term scan over DearMe onboarding UI/shared paths
  found no substrate terms.

Next:

- Run `DM-128`: Focused Decision Review Drawer, reusing Lindy action-card,
  pending-approval modal, and slide-out panel patterns for Work Ready and
  Decisions Needed.

## DM-126 Reuse Architecture Ledger - 2026-05-09

Implementation slice:

- Added `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md` as the current
  coordinator artifact for Polsia, Naive/Paperclip, Lindy, Littlebird, and
  Symphony-style reuse.
- Updated `docs/dearme/INTEGRATED-ARCHITECTURE.md` so the current architecture
  points at DM-125 and the reuse ledger instead of the older DM-118 note.
- Updated `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` so future
  workers start from the current DM-127 through DM-130 queue instead of stale
  DM-001/DM-103/DM-104 history.
- Added `doc/plans/2026-05-09-dearme-dm-126-reuse-architecture-ledger.md` as
  the ticket receipt.
- Preserved the existing DM-125 verification-command correction to include the
  actual `--maxWorkers=1` flag used for the standalone onboarding test.

Donor reuse:

- Polsia remains the source for onboarding compression, visible team momentum,
  cycle/report choreography, approval rhythm, and personal-brand fork language.
- Naive/Paperclip remains the hidden substrate for auth, tenancy, agents,
  issues, routines, approvals, documents, work products, activity, cost events,
  and future app/site provisioning options.
- Lindy is now explicitly queued as the next interaction-pattern donor for
  focused review drawers, action cards, and reliability/circuit-breaker ideas;
  the first Voice & Memory source detail reuse slice landed in DM-127.
- Littlebird remains a later web-shell polish donor after the current detail
  interactions are useful.
- Symphony remains a development factory pattern, not the DearMe product
  runtime.

Rejected:

- Rejected importing a whole donor frontend or runtime before a bounded product
  slice needs it.
- Rejected restarting stale early worker tickets that the integrated branch has
  already absorbed.
- Rejected treating this docs-only coordination pass as product completion.

Verification:

- `git diff --check` passed.
- Key donor path existence checks passed for the Polsia, Naive, and Lindy paths
  cited by the ledger.
- No product-code tests were run because this slice only updates coordinator
  docs and preserves an existing verification-command correction.

Next:

- DM-127 has landed. Run `DM-128`: Focused Decision Review Drawer, reusing
  Lindy pending-action and slide-out panel patterns for prepared work and
  decisions.

## DM-125 Direct Source Review Focus - 2026-05-09

Implementation slice:

- Changed Decisions `Review source` from a broad panel jump into a direct
  source-review action.
- Reused the existing Voice & Memory source-review queue and fact form instead
  of adding a new API, source-review table, importer, crawler, or agent runtime.
- Clicking `Review source` now scrolls to the exact pending source card,
  highlights it, and pre-fills the proposed reviewed fact in the Voice &
  Memory form.
- Extended the existing DearMe onboarding UI test so the source-review decision
  must focus the exact card and prefill kind, title, source label, and body.

Donor reuse:

- Naive/Paperclip continues to supply the hidden workbench and memory substrate.
- Polsia supplies the product choreography: visible team work becomes a small
  number of concrete user calls.
- Lindy supplies the compact action-needed card behavior: the decision opens
  the prepared item directly.

Rejected:

- Rejected a new route, table, import pipeline, workflow builder, or separate
  source-review screen.
- Rejected leaving the user at a broad panel with no selected item.
- Rejected exposing donor/runtime/provider/adapter language in the customer UI.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1` passed:
  1 file, 30 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  and `ui/src/components/dearme` passed with no matches for Paperclip,
  OpenClaw, OK Partner, provider, adapter, setup payload, control-plane,
  workflow-builder, GraphQL, Relay, MCP, agent-runtime, routine, cost_event,
  anthropic, or claude language.
- `pnpm test:run` did not pass in this run: the UI project hit the existing
  5s timeout in `DearMeOnboarding.test.tsx` under full-suite concurrency, then
  the same file produced cascade failures from the timed-out React root. The
  DearMe onboarding file passed standalone with 30 tests, so this is recorded
  as a full-run stability gap to isolate next rather than a DM-125 behavior
  regression.
- Manual browser visual smoke was not run in this slice; the behavior is
  covered by the focused UI test and broader typecheck/build gates.

Next:

- If the source review queue grows beyond a few items, add a filtered source
  review drawer or selected-card detail view without changing the backend.

## DM-124 Source Evidence And Source Review Decisions - 2026-05-09

Implementation slice:

- Added typed `sourceEvidence` to DearMe outputs so prepared work can show the
  private sources, proof, and approval boundaries behind it without exposing
  runtime/provider internals.
- Projected source evidence from existing output details, documents, prepared
  work products, and latest team notes; no new table, API route, crawler,
  workflow builder, or importer was added.
- Rendered source evidence on focused output and private work cards as
  `Sources behind this work`.
- Promoted existing `sourceReviewQueue` candidates into the main Decisions
  surface as high-leverage source review cards.
- Counted source reviews in the team summary and growth-cycle review stage,
  and linked `Review source` back to the existing Voice & Memory review flow.

Donor reuse:

- Naive/Paperclip supplies the substrate: existing documents, work products,
  comments, output handoff, workbench memory projection, and shared validators.
- Polsia supplies the product choreography: hidden work becomes visible proof
  and a small number of high-leverage user calls.
- Lindy supplies the action-needed shape: compact source review cards that move
  the user into a focused memory review surface.

Rejected:

- Rejected a new source-review backend, separate output provenance table,
  crawler, importer, or workflow-builder engine.
- Rejected exposing donor/runtime/provider/adapter terms in customer-facing UI.
- Rejected auto-publishing or external action from source evidence; this stays
  private and review-first.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 5 files, 77 tests.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed with exit code 0. The concurrent shard reported
  162 files passed and 1021 passed / 1 skipped tests; the serialized server
  shard completed all 81 suites.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`,
  `ui/src/components/dearme`, and `packages/shared/src/validators/dearme.ts`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  agent-runtime, routine, cost_event, anthropic, or claude language.
- `git diff --check` passed.
- Manual browser visual smoke was not run in this slice; the new conditional
  surfaces are covered by focused UI tests, and the broader build/test gates
  passed before commit.

Next:

- If scroll-to-panel feels indirect, make `Review source` open the exact
  pending source review card with the proposed fact prefilled.
- Continue moving Polsia/Lindy-style prepared calls into Work Ready and
  Decisions before adding deeper automation.

## DM-123 Voice & Memory Source Review Queue - 2026-05-09

Implementation slice:

- Added a private `sourceReviewQueue` to the DearMe workbench memory contract
  for link and import-note sources that still need human review.
- Projected review candidates from existing DearMe memory activity rows instead
  of adding a crawler, upload queue, workflow builder, or new memory backend.
- Suppressed review candidates once an equivalent pasted/reviewed Voice &
  Memory fact exists.
- Added a Source review section to the Voice & Memory web panel with compact
  action cards and a `Prepare fact` action that pre-fills the existing
  Voice & Memory form.
- Kept reviewed facts as normal `paste` memory updates so future private work
  consumes a cleaned, user-approved memory surface rather than raw source
  references.

Donor reuse:

- Lindy supplies the interaction pattern: source cards wait in a compact review
  queue, then prefill a focused form for confirmation.
- Naive/Paperclip supplies the substrate: existing `activity_log` memory events,
  workbench projection, shared validators, and the DearMe REST/API test path.
- Polsia supplies the product rhythm: the visible growth team asks the user for
  a few high-leverage review decisions before the next cycle improves.

Rejected:

- Rejected fetching, crawling, or summarizing source links in this slice.
- Rejected a separate review-table backend while activity projection can produce
  the queue safely.
- Rejected importing a generic Lindy workflow-builder surface.
- Rejected exposing donor/runtime terms in customer-facing Voice & Memory UI.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 45 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts`
  passed after the review-candidate type narrowing fix: 1 file, 2 tests.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed with exit code 0. The concurrent shard reported
  162 files passed and 1021 passed / 1 skipped tests before the serialized
  server shard completed all 81 suites.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  agent-runtime, routine, cost_event, anthropic, or claude language.
- `curl -I --max-time 5 http://127.0.0.1:3100/DEAA/dearme` returned
  `HTTP/1.1 200 OK`.
- Browser smoke opened `/DEAA/dearme` at
  `http://127.0.0.1:3100/DEAA/dearme`. Verified page title
  `Team · DearMe · DearMe`, DearMe content present, no console warn/error logs,
  and no forbidden substrate terms in the visible body. The current local seed
  has no pending source-review candidates, so the live browser route does not
  show `Source review`; that conditional UI is covered by the focused DearMe
  onboarding test.
- Mobile visual browser smoke was not run in this slice because the in-app
  browser surface did not expose viewport control and standalone Playwright was
  not installed; no new dependency was introduced for verification.

Next:

- Add an output-level source review decision flow only if users need to compare
  source evidence side-by-side before saving facts.
- Keep deeper import automation private and approval-safe: no public post, send,
  deploy, or spend action should happen from source review.

## DM-122 Voice & Memory Source Import Paths - 2026-05-09

Implementation slice:

- Added typed Voice & Memory source paths: pasted source, private source link,
  and import note.
- Kept the source intake path backed by existing DearMe memory activity rows
  and workbench projection instead of introducing a separate knowledge-base
  backend.
- Validated private source links at the shared contract boundary so server and
  UI behavior stay aligned.
- Carried `sourceInputMode` through shared validators, server activity details,
  workbench memory cards, API tests, and the DearMe web panel.
- Added a Lindy-style compact source-path selector inside the existing
  Voice & Memory action-card surface while keeping donor/runtime machinery
  backstage.

Donor reuse:

- Lindy supplies the source-card/form pattern: short source path choices,
  validation before save, and source context shown as compact chips.
- Naive/Paperclip supplies the durable substrate through `activity_log`,
  routine memory context refresh, existing REST route patterns, and workbench
  projection.
- Polsia supplies the product interpretation: the visible personal-brand team
  learns from sources so the next growth cycle improves, rather than exposing a
  generic source manager.

Rejected:

- Rejected adding a new memory table, upload store, crawler, or workflow-builder
  engine in this slice.
- Rejected treating source links as external fetch/scrape jobs; they are private
  references plus user-approved memory.
- Rejected exposing donor/runtime terms in customer-facing Voice & Memory UI.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 6 files, 84 tests.
- `pnpm run typecheck` passed across the workspace.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  agent-runtime, routine, cost_event, anthropic, or claude language.
- Playwright rendered `/dearme` at
  `http://127.0.0.1:3100/DEAA/dearme` on desktop and 390px mobile. Verified
  Source path controls, `Source link` switching the source field to URL input,
  no Vite overlay, no console errors/warnings, no forbidden substrate terms in
  the body, and no 390px mobile horizontal overflow.

Next:

- Build a focused source-review/import queue that turns stored link/import
  notes into proposed Voice & Memory facts without crawling, publishing, or
  exposing donor/runtime language.

## DM-121 Voice & Memory Source Actions - 2026-05-09

Implementation slice:

- Added typed revise and retire actions for saved Voice & Memory sources.
- Kept Voice & Memory source history on existing company-scoped activity rows
  instead of adding a new DearMe memory table.
- Projected only the latest active source revision into the workbench and hid
  retired sources from the latest-memory cards.
- Refreshed DearMe routine memory context after every source revision or
  retirement so future private work uses the active source set.
- Added UI affordances on the existing DearMe action-card path: `Revise`,
  `Save source`, `Cancel revise`, and `Retire source`.

Donor reuse:

- Lindy supplies the editable memory/source-card pattern: inspect a source,
  revise it, save it, or retire it.
- Naive/Paperclip supplies the durable substrate through `activity_log`,
  routine context, existing API route/auth patterns, and workbench projection.
- Polsia supplies the product interpretation: the visible team is learning from
  the user and improving the next growth cycle, not exposing a technical memory
  manager.

Rejected:

- Rejected adding a separate DearMe memory table while activity projection is
  sufficient for source history and active-source filtering.
- Rejected adding external import/scrape/upload/publish/send/deploy behavior in
  this slice.
- Rejected approval-gating private source edits because no public or external
  action happens.
- Rejected exposing donor/runtime terms in customer-facing Voice & Memory UI.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 6 files, 82 tests.
- `pnpm -r typecheck` passed across the workspace.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  or agent-runtime language.
- Rendered `/dearme` at `http://127.0.0.1:3100/DEAA/dearme` with Playwright
  after the Browser plugin reported `Browser is not available: iab`.
  Verified page identity, nonblank Source coverage content, no framework error
  overlay, no console error/warn messages, `Add Boundaries` selecting
  `constraint`, `Revise` opening the saved source in edit mode, no source-card
  badge overlap, and no 390px mobile horizontal overflow.

Next:

- Add real source import paths, starting with typed paste/link/import actions
  that still land as DearMe Voice & Memory sources rather than donor-console
  or workflow-builder language.

## DM-120 Voice & Memory Source Coverage - 2026-05-09

Implementation slice:

- Added a typed `memory.sourcePlan` workbench contract so Voice & Memory now
  reports which core source categories are missing, partial, or ready.
- Projected that plan from existing `dearme.memory_updated` activity rows
  instead of adding a separate memory-source table, connector runner, sync
  engine, or generic knowledge-base backend.
- Rendered a Voice & Memory Source coverage section in `/dearme` with coverage tiles for
  writing samples, proof points, goals, audience notes, offer notes, and
  boundaries. Clicking a gap selects the matching source type in the existing
  add form.
- Kept the latest Voice & Memory cards on the DearMe action-card path and kept
  customer language focused on source coverage, voice, proof, and public-work
  safety.

Donor reuse:

- Lindy supplies the source coverage/tile lesson from its knowledge-base setup
  flow: show what exists, what is missing, and the next setup action.
- Naive/Paperclip supplies the durable truth through existing company-scoped
  activity rows; no parallel DearMe memory store was introduced.
- Polsia remains the product interpretation: source coverage exists so the
  user's visible growth team can keep learning and producing stronger weekly
  work.

Rejected:

- Rejected importing a generic knowledge-base modal, crawler, upload/sync
  state machine, or workflow-builder concepts into the P0 customer surface.
- Rejected adding a new table before the existing memory activity projection is
  too lossy to support source coverage.
- Rejected exposing donor/runtime terms in the UI; this stays Voice & Memory,
  not a substrate management page.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 40 tests.
- `git diff --check` passed.
- Customer-surface substrate scan over `ui/src/pages/DearMeOnboarding.tsx`
  passed with no matches for Paperclip, OpenClaw, OK Partner, provider,
  adapter, setup payload, control-plane, workflow-builder, GraphQL, Relay, MCP,
  or agent-runtime language.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.

Next:

- Add richer Voice & Memory source edit/archive/import affordances only where
  they preserve DearMe language and stay backed by a typed server contract.
- Consider a polished focused Voice & Memory view once the cockpit-level
  coverage model proves useful.

## DM-119 Weekly Report Evidence Digest - 2026-05-09

Implementation slice:

- Upgraded the weekly Dear me report from a single document preview into a
  structured private review digest with four customer-facing sections:
  `What changed`, `Needs your call`, `What we learned`, and `Next bets`.
- Reused existing Naive/Paperclip-backed workbench inputs instead of adding a
  report table, new runtime event stream, or separate DearMe job queue:
  ready work, decisions, memory updates, routine-derived cycle check-ins, and
  spend checkpoints.
- Adapted Polsia's cycle review shape into DearMe language: accomplished work,
  blocked/waiting decisions, learning signals, and tomorrow/next-cycle bets.
- Kept Lindy's web lesson at the interaction level: compact, scannable,
  action-card-adjacent sections inside the existing web cockpit rather than a
  workflow builder, graph editor, or raw agent console.
- Kept substrate words backstage. The report digest speaks in team/progress
  language and continues the UI guard against Paperclip, provider, routine, and
  raw cost-event leakage.

Donor reuse:

- Polsia supplies the product choreography for a visible weekly review loop.
- Naive/Paperclip supplies the execution truth: work items, approvals,
  documents, memory activity, routine cadence, and spend lineage.
- Lindy supplies the web grammar: small evidence blocks that guide the user to
  the next decision without exposing machinery.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 40 tests.
- `git diff --check` passed.
- Customer-surface substrate scan over the touched UI/server paths passed; the
  only matches are internal service/test fixtures and explicit no-leak
  assertions.
- `pnpm -r typecheck` passed.
- `pnpm test:run` passed.
- `pnpm build` passed with the existing Vite MarkdownEditor dynamic/static
  import and large-chunk warnings.

Next:

- Move the richer weekly report digest into a more polished visual treatment
  after the current cockpit surfaces settle.
- Continue the Lindy knowledge-base reuse pass for Voice & Memory source
  import/management without exposing workflow-builder machinery.

## DM-118 Routine And Spend Progress Projection - 2026-05-09

Implementation slice:

- Reused the existing Naive/Paperclip `routine_runs`, `routines`, and
  `cost_events` substrate instead of adding a DearMe-only progress table or a
  parallel runtime event stream.
- Added DearMe-safe `cycle_check_in` and `spend_checkpoint` progress kinds to
  the shared DearMe validator contract.
- Projected routine runs into the workbench as customer-facing cycle check-ins,
  with `Cycle cadence` as the source label and `Cycle check-in` as the artifact.
- Projected DearMe-agent cost events into a private spend checkpoint, with
  `Spend guardrail` as the source label and `Spend checkpoint` as the artifact.
- Filtered spend aggregation to DearMe blueprint-created agents so unrelated
  company/provider activity does not appear as DearMe team progress.
- Kept provider names, model names, raw routine terminology, and raw cost-event
  details backstage; the workbench speaks in DearMe team language.
- Preserved the existing web/API spine: no new route, UI shell, database table,
  worker lane, or execution primitive was introduced.

Donor reuse:

- Naive/Paperclip supplies the durable routine and spend lineage.
- Polsia supplies the product interpretation: visible growth-cycle motion and
  "my team worked while I was away" proof.
- Lindy remains the reusable web grammar for action cards and action-needed
  work-stream states; this slice feeds that grammar with richer substrate
  progress instead of inventing a separate interaction model.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts`
  passed: 2 files, 15 tests.
- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx` passed: 1
  file, 25 tests.
- The workbench test now asserts that customer JSON does not leak `routine`,
  `anthropic`, or `claude-sonnet` while still proving the seeded substrate rows
  are projected into DearMe progress cards.
- The DearMe onboarding test now renders the cycle/spend progress cards and
  keeps those same substrate terms out of visible UI text.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports the existing `MarkdownEditor.tsx`
  dynamic/static import warning plus chunk-size warnings.
- `git diff --check` passed.

Next:

- Use the same substrate-projection rule for the richer Polsia-style weekly
  report/progress loop.
- Move Voice & Memory source import toward the Lindy knowledge-base pattern
  without exposing workflow-builder machinery.

## DM-117 Normalized Retry Continue Entrypoint - 2026-05-09

Implementation slice:

- Added a DearMe review-entry intent to the existing `/dearme?view=decisions`
  route so review, continue, retry, direction, blocked, and progress states all
  land in the same customer-safe focus surface.
- Reused the Naive/Paperclip-backed DearMe output handoff service through a
  thin DearMe `/continue` wrapper: continue revision, another pass, and new
  direction intents normalize back into the existing review action, paid-beta
  guardrail, wakeup, and activity path.
- No new runtime control, database table, worker lane, or execution primitive
  was introduced.
- Adapted Polsia's visible-motion lesson by making Work Ready, Live Team Feed,
  and Private Work cards open the next useful decision state directly instead
  of sending the user to raw task machinery.
- Adapted the internal assistant baseline's retry/continue/action-needed
  grammar into DearMe-owned labels and focus guidance: continue revision, track
  next pass, give new direction, and add clearer direction.
- Added focused-output guidance for revision, regeneration, and not-useful
  states so the user understands what their team needs next before spending
  another attempt.
- Kept all risky actions behind the existing approval/review mutations.

Verification:

- Focused shared/server/API/UI coverage passed:
  `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts ui/src/api/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 5 files, 74 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports the existing
  `MarkdownEditor.tsx` dynamic/static import warning plus chunk-size warnings.
- `git diff --check` passed.
- Hidden-substrate language scan on the touched DearMe UI files returned only
  the benign opportunity-copy word `jobs`, not runtime job controls or
  provider/substrate language.

Next:

- Use routine/cost lineage as DearMe-safe progress context without exposing
  runtime or provider mechanics.

## DM-116 Action Card State Variants - 2026-05-09

Implementation slice:

- Added a DearMe-owned `attention` notice to `DearMeActionCard` with
  `decision_needed`, `paused`, `retry`, and `blocked` variants.
- Preserved the existing shared card API for badges, chips, callouts, footer,
  and action buttons so Live Team Feed, Decisions Needed, Work Ready, Private
  Work, and Voice & Memory source cards can keep converging on one primitive.
- Turned Lindy's paused/action-needed/retry lesson into product-safe DearMe
  language: the component can say a team is waiting, continuing, or taking
  another pass without exposing jobs, providers, adapters, or runtime controls.
- Wired existing review-loop and status projections into the shared attention
  grammar for Work Ready, Decisions Needed, Live Team Feed, and Private Work
  cards.
- Kept this slice inside the existing web projection path: no new route,
  mutation, runtime state, database table, workflow editor, or server contract
  was introduced.
- Added DOM-level coverage for paused and retry attention states plus a
  substrate-language guard in the component test, and extended onboarding
  coverage for the newly wired attention states.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 25 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports the existing
  `MarkdownEditor.tsx` dynamic/static import warning plus chunk-size warnings.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Add a normalized retry/continue entrypoint that uses the existing DearMe
  review routes and keeps raw job controls out of the customer surface.

## DM-115 Voice & Memory Action Card Reuse - 2026-05-09

Implementation slice:

- Reused `DearMeActionCard` for the latest Voice & Memory source cards so
  saved writing samples, proof points, source links, corrections, audience
  notes, and offer notes share the same DearMe action-card grammar as Live
  Team Feed, Decisions Needed, Work Ready, and Private Work.
- Preserved existing Naive/Paperclip-backed source projection and state:
  source kind, title, body preview, just-saved/source chips, and created-at
  timestamp remain the source of truth.
- Kept Voice & Memory display-only in this slice: no new action, route,
  mutation, source editing, archive, or runtime path was introduced.
- Preserved the Polsia product lesson: the user can see useful memory/proof
  accumulating as part of the team cockpit instead of staring at raw storage.
- Applied Lindy's reusable source/action card grammar without importing Lindy
  runtime, GraphQL, workflow-builder assumptions, or donor copy.
- Added DOM-level coverage that the Voice & Memory section now renders
  `data-dearme-surface="action-card"` cards.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 24 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports existing chunk-size/dynamic-import
  warnings around the broader app bundle, but no build failure.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Add paused/retry variants to `DearMeActionCard` before creating new review
  card primitives.

## DM-114 Private Work Action Card Reuse - 2026-05-09

Implementation slice:

- Reused `DearMeActionCard` for the Private Work output surface so generated
  private reports, drafts, voice guidance, opportunity work, and portfolio work
  now share the same customer-facing action card primitive as Live Team Feed,
  Decisions Needed, and Work Ready.
- Preserved existing Naive/Paperclip-backed routes and state:
  - `Review` and `Open` still call `onOpenOutput(output)` and route through the
    existing DearMe decision URL with issue/output focus.
  - output status, review loop state, output kind, preview, next step,
    details, private references, and updated-at projections remain the source
    of truth.
- Preserved the Polsia product lesson: Private Work still reads as prepared
  team output waiting for the user's next decision, not a raw issue queue.
- Applied Lindy's reusable action-card grammar without importing Lindy runtime,
  GraphQL, workflow builder assumptions, or donor copy.
- Added DOM-level coverage that the Private Work section now renders
  `data-dearme-surface="action-card"` cards while keeping the existing route
  assertion intact.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 24 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports existing chunk-size/dynamic-import
  warnings around the broader app bundle, but no build failure.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Reuse `DearMeActionCard` for Voice & Memory source cards before adding
  paused/retry variants.

## DM-113 Work Ready Action Card Reuse - 2026-05-09

Implementation slice:

- Reused `DearMeActionCard` for the Work Ready surface so prepared outputs now
  share the same customer-facing action card primitive as Live Team Feed and
  Decisions Needed.
- Preserved existing Naive/Paperclip-backed routes and state:
  - `Review prepared work` still opens the prepared output review surface
    through the existing work item target.
  - output status, review loop state, output kind, evidence, handoff, and
    updated-at projections remain the source of truth.
- Preserved the Polsia product lesson: Work Ready still reads as a short shelf
  of finished team work waiting for the user's next high-leverage decision.
- Applied Lindy's reusable action-card grammar without importing Lindy runtime,
  GraphQL, workflow builder assumptions, or donor copy.
- Added DOM-level coverage that the Work Ready section now renders
  `data-dearme-surface="action-card"` cards.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 24 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports existing chunk-size/dynamic-import
  warnings around the broader app bundle, but no build failure.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Reuse `DearMeActionCard` for private output cards and Voice & Memory source
  cards before adding paused/retry variants.

## DM-112 Decisions Needed Action Card Reuse - 2026-05-09

Implementation slice:

- Reused `DearMeActionCard` for the Decisions Needed surface so batch decisions
  and individual approval decisions now share the same customer-facing action
  card primitive as the live feed.
- Preserved existing Naive/Paperclip-backed routes and state:
  - `Approve` still opens the DearMe approval-focused decision route.
  - `Review posts` still opens the DearMe batch decision route.
  - existing approval, issue, batch, and review-loop projections remain the
    source of truth.
- Kept the Polsia product lesson intact: the surface still reads as a short set
  of high-leverage calls for the user, not a raw task queue.
- Added DOM-level coverage that the Decisions Needed section now renders
  `data-dearme-surface="action-card"` cards.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 24 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Reuse `DearMeActionCard` for Work Ready cards before adding paused/retry
  states or more review UI variants.

## DM-111 DearMe Action Card Primitive - 2026-05-09

Implementation slice:

- Added a DearMe-owned `DearMeActionCard` component as the first reusable
  customer-facing action-needed card primitive.
- Reused Lindy's strongest front-end pattern conceptually: a presentational
  action card with semantic status badges, compact context chips, a clear
  next-action callout, and a primary action zone. No Lindy runtime, client,
  copy, or domain model was imported.
- Rewired the live team feed to use the new component while preserving the
  existing review routing contract:
  - approval-backed feed item -> approval decision surface
  - prepared output feed item -> prepared-work review surface
  - private work feed item -> private work surface
- Marked the extracted card path with `data-dearme-surface="action-card"` so
  tests and future UI extractions can distinguish it from generic workbench
  cards.
- Preserved the Polsia/Naive product split: the feed still sells visible
  team momentum while routing into the existing issue/approval/output
  substrate behind the scenes.
- Added focused component coverage for action rendering and click behavior.

Verification:

- `pnpm exec vitest run ui/src/components/dearme/DearMeActionCard.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 24 tests.
- `pnpm -r typecheck` passed.
- `pnpm build` passed. Vite still reports existing chunk-size/dynamic-import
  warnings around the broader app bundle, but no build failure.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|setup_payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx ui/src/components/dearme/DearMeActionCard.tsx ui/src/components/dearme/DearMeActionCard.test.tsx`
  returned no matches.

Next:

- Reuse `DearMeActionCard` for Work Ready, Decisions Needed, and private
  output cards where it reduces duplication without disturbing focused review
  forms.
- Add retry/regenerate in-flight affordances after the current review routes
  are stable.

## DM-110 Donor Reuse Spine - 2026-05-09

Architecture integration slice:

- Refreshed the integrated DearMe architecture after DM-106 through DM-109 so
  the docs no longer describe output-level review/regeneration as missing.
- Reconciled fresh Polsia, Naive/Paperclip, and internal assistant baseline
  donor sweeps into one next-step spine:
  - Polsia remains the product choreography source for visible growth-cycle
    motion and "my team worked while I was away" proof.
  - Naive/Paperclip remains the execution substrate for issues, routines,
    approvals, documents, work products, activity, and cost events.
  - The internal assistant baseline is the strongest direct web-code donor for
    action cards, action-needed/paused states, retry, and knowledge source UX.
- Locked the next implementation ticket as `DM-111 DearMe ActionCard Primitive`
  instead of another broad architecture pass.
- Added a Symphony-style worker handoff under `doc/plans/` so concurrent agents
  can implement the next code slice without re-litigating the product direction.

Verification:

- `git diff --check` passed.
- Docs-only change; no runtime tests were needed for this slice.

Next:

- Extract a DearMe-owned action-card component from the current inline
  `DearMeOnboarding` feed/review rendering.
- Use Lindy action-card/action-needed/retry patterns as source material while
  preserving DearMe language and Naive/Paperclip execution truth.
- After the card primitive lands, add routine telemetry and cost lineage to the
  work stream where it improves trust.

## DM-109 Actionable Live Feed - 2026-05-09

Implementation slice:

- Made DearMe's live team feed directly actionable: a user can now open a
  feed item's corresponding DearMe review surface instead of hunting through
  the decisions or prepared-work panels.
- Reused the existing Naive/Paperclip substrate: stream items now carry the
  existing approval id, issue reference, and prepared-output id. This slice
  adds no new table, queue, worker, runtime, dependency, or external
  connector.
- Preserved Polsia's visible-autonomy lesson by keeping the live feed as the
  product proof surface: the user sees the team working, then moves straight
  from an action-needed card to the review decision.
- Adapted Lindy-style action-card behavior by giving feed cards a concise
  action button (`Review now`, `Open prepared work`, or `Open private work`)
  that lands in the focused inspector/review state already owned by DearMe.
- Kept the customer surface clean: buttons route to DearMe review views, not
  raw issues, approval admin pages, adapters, providers, Paperclip/OpenClaw,
  or runtime internals.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 4 files, 61 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|model-provider|setup-payload|control-plane|raw issue" ui/src/pages/DearMeOnboarding.tsx server/src/services/dearme-workbench.ts packages/shared/src/validators/dearme.ts`
  returned no matches.

## DM-108 Cycle Timeline Feed - 2026-05-09

Implementation slice:

- Turned DearMe's live team feed into a cycle-aware timeline that makes the
  personal-brand team visibly work through plan, work, review, learn, and report
  stages.
- Reused the existing Naive/Paperclip substrate: issues, prepared outputs,
  approvals, activity log, and Voice & Memory records remain the source of
  truth. This slice adds no database table, queue, worker, runtime, or
  dependency.
- Adapted Polsia's visible-autonomy product choreography into customer-safe
  stream kinds: cycle brief, work in motion, action needed, memory learned,
  progress, and report ready.
- Adapted Lindy-style action cards by adding source context, cost/guardrail
  context, and a concrete next-action panel to each live feed item.
- Kept the UI product-facing: no Paperclip, OpenClaw, adapter, provider,
  control-plane, or setup-payload language is introduced into the paid-beta
  feed.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-memory-context.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 6 files, 64 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- `rg -n "brand loop|team loop|Weekly growth loop|Review loop|work loop|current loop|growth loop|private loop|learning loop|progress loop|paused this loop|brand growth loop|operating loop" ui/src/pages/DearMeOnboarding.tsx server/src/services/dearme-workbench.ts server/src/services/dearme-output-handoff.ts packages/shared/src/validators/dearme.ts ui/src/pages/DearMeOnboarding.test.tsx server/src/__tests__ packages/shared/src/validators/dearme.test.ts`
  returned no matches.

## DM-107 Review Feedback Handoff - 2026-05-09

Implementation slice:

- Added a typed `reviewHandoff` contract to DearMe prepared-output review loops
  so a user's rejection, change request, or regeneration note stays attached to
  the next private draft.
- Reused the existing Naive/Paperclip substrate instead of adding a DearMe-only
  queue, table, worker, or runtime: review decisions are still issue comments,
  issue status changes, work products, and the existing output projection.
- Preserved the Polsia product lesson that momentum must remain visible after a
  decision: the UI now shows a customer-safe "Private handoff" card explaining
  what the team will do next with the user's feedback.
- Adapted the Lindy-style action-card pattern by adding a focused handoff card
  and a "Not useful" decision action in the prepared-work review surface.
- Kept the customer surface clean: no issue ids, raw handoff ids, adapters,
  providers, Paperclip/OpenClaw language, or runtime details are shown to the
  user.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 3 files, 39 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.

## DM-106 Review Loop State - 2026-05-09

Implementation slice:

- Projected accepted Chief of Staff briefs into the paid-beta workbench as
  visible active work, work-stream events, and action-graph work nodes.
- Reused the existing Naive/Paperclip issue substrate by selecting
  `dearme_chief_of_staff_message` origin issues instead of adding a DearMe-only
  table, queue, or runtime.
- Preserved Polsia-style visible autonomy by showing that Chief of Staff has
  turned the brief into private work, while keeping origin kinds, issue ids, and
  raw substrate language out of customer text.
- Added a shared review-loop contract to prepared outputs, workbench work items,
  decisions, and stream events so the UI can show attempts, current review
  state, next step, and the last decision note without inventing local UI state.
- Reused Lindy-style action-card grammar for the review loop badges and
  next-step surfaces, and reordered the action graph so work and decisions are
  visible before role background cards.
- Filtered the raw Chief of Staff message activity out of generic recent
  progress to avoid duplicate "progress recorded" entries for the same brief.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
  passed: 4 files, 37 tests.
- `pnpm -r typecheck` passed.
- `git diff --check` passed.
- Browser-plugin default in-app backend was unavailable in this Codex session,
  and the available Chrome backend opened the page but timed out while reading
  DOM/screenshot evidence. Playwright fallback passed on
  `http://127.0.0.1:3100/DEAAAAA/dearme` for desktop `1440x920` and mobile
  `390x844`: page title `Team · DearMe · DearMe`, DearMe / Chief of Staff /
  Review loop / Team work stream visible, no framework overlay, no console or
  page errors, and the `Prepare content batch` control updated the Chief brief
  textarea.

## Branch Integration Checkpoint - 2026-05-09

Integration slice:

- Confirmed `codex/dearme-baseline-2026-05-08` is clean and already includes
  the Polsia / Naive comparison commit `2411d125`.
- Confirmed the baseline branch and `codex/dearme-polsia-naive-comparison`
  point at the same head, so the comparison work is integrated into the local
  recoverable baseline.
- Confirmed the previously partial baseline spine is no longer missing the
  named DearMe source files: the web UI reuse doc, memory-context service/tests,
  and DearMe shell files are tracked by Git on the current baseline.
- Recorded the current merged-by-ancestry set as:
  `codex/dearme-baseline-2026-05-08`,
  `codex/dearme-chief-guardrail-integration`,
  `codex/dearme-dm-103-premium-work-stream`,
  `codex/dearme-dm-104-voice-memory-sources`,
  `codex/dearme-dm-105-cycle-controls`,
  `codex/dearme-polnaive-lindy-loop`,
  `codex/dearme-polsia-naive-comparison`, `dearme`, and `master`.
- Many older `codex/dearme-dm-*` branches remain not merged by Git ancestry.
  Do not blindly merge or delete them. Treat them as historical worker refs
  unless a content-equivalence check proves that a branch contains product code
  missing from the current baseline.
- Confirmed the only configured remote is `upstream` at
  `https://github.com/paperclipai/paperclip.git`; there is no safe DearMe-owned
  push target in this checkout.
- Added `doc/plans/2026-05-09-dearme-branch-integration-checkpoint.md` as the
  current branch hygiene handoff for future Symphony-style workers.

Verification:

- `git status --short --branch` showed a clean baseline at
  `codex/dearme-baseline-2026-05-08`.
- `git log --oneline --decorate -5` showed `2411d125` at both the baseline and
  Polsia / Naive comparison refs.
- `git branch --merged HEAD --format='%(refname:short)' | sort` produced the
  merged-by-ancestry set recorded above.
- `git ls-files` listed the previously missing DearMe spine files from the old
  partial-baseline warning.
- `rg -n "Branch Integration Checkpoint|RECOVERABLE BASELINE|BASELINE-SPINE-MANIFEST|dearme-branch-integration-checkpoint|DM-106" docs/dearme doc/plans/2026-05-09-dearme-branch-integration-checkpoint.md`
  found the new checkpoint, manifest status, README link, and next-slice
  pointer.
- `git diff --check` passed for this docs-only checkpoint.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 1 file, 19 tests.

## Polsia / Naive Comparison Lock - 2026-05-09

Docs slice:

- Added `POLSIA-NAIVE-COMPARISON.md` as the durable donor comparison: Polsia is
  the source for visible growth-team choreography, while Naive/Paperclip remains
  the backstage control plane for work, routines, approvals, costs, and
  execution.
- Linked the comparison from the DearMe docs entry point so future product
  slices start from the same donor split instead of re-litigating Polsia vs
  Naive.
- Captured the current DM-105 implication: cycle controls are customer-facing
  Chief of Staff briefs, not direct runtime controls; existing Work Ready and
  batch decision gates still own approval.
- Verification:
  - `rg -n "POLSIA-NAIVE-COMPARISON|Polsia / Naive Comparison Lock|DM-105 exposes" docs/dearme`
    found the new comparison doc, README links, and build-state entry.
  - `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
    passed: 1 file, 19 tests.
  - `git diff --check` passed.

## Premium Work Stream From Action Graph - 2026-05-09

Implementation slice:

- Rendered `workbench.actionGraph` directly in the DearMe Growth cycle panel as
  a premium Team work stream instead of leaving the graph as a mostly hidden
  read-model.
- Reused the Polsia/Naive/Lindy split already locked in the architecture:
  Polsia-style visible cycle and team momentum, Naive/Paperclip-derived
  workbench graph projection, and Lindy-style action-card presentation.
- Added customer-safe card mapping for cycle, role, work item, artifact,
  decision, guardrail, memory signal, and report nodes.
- Kept machinery hidden: cards display labels, summaries, roles, statuses,
  connection labels, and next moves without showing raw node ids, issue ids,
  approval ids, providers, adapters, or model/runtime language.
- Added UI coverage for the new stream, including absence checks for raw action
  graph ids.
- Verification:
  - `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
    passed: 1 file, 17 tests.
  - `pnpm --filter @paperclipai/ui typecheck` passed.
  - `git diff --check` passed.
  - Browser smoke passed against `http://127.0.0.1:3100/DEAA/dearme`:
    desktop and mobile both rendered `Team work stream` / `Team visible`; the
    mobile viewport had no horizontal overflow; no Paperclip/OpenClaw/provider/
    adapter language appeared in the visible page text.

## Action Graph Projection Bridge - 2026-05-09

Implementation slice:

- Added a shared DearMe `actionGraph` contract to the workbench response so the
  product can show a customer-safe growth-team graph without exposing raw
  Paperclip/Naive machinery.
- Reused Polsia's choreography as the graph vocabulary: growth cycle, visible
  roles, work lanes, artifacts, decisions, guardrails, memory signals, and
  weekly reports.
- Reused Naive/Paperclip substrate rows instead of adding new tables or a new
  runtime: agents, issues, approvals, output handoffs, memory updates, and
  report outputs are projected by `server/src/services/dearme-workbench.ts`.
- Adapted Lindy-style action-card behavior in the customer shell by clarifying
  Work Ready next steps, batch decision states, and after-approval outcomes.
- Rendered the graph in the existing Growth cycle panel as a customer-facing
  Growth map with connected roles, waiting decisions, and current graph
  highlights. The UI consumes the typed graph without exposing the substrate.
- Updated `ACTION-GRAPH-ARCHITECTURE.md` and the Symphony-style operating loop
  so worker tickets reuse Polsia/Naive/Lindy before adding DearMe-only runtime
  code.
- Verification:
  - `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1`
    passed: 3 files, 32 tests.
  - `pnpm -r typecheck` passed across the workspace.

## Polsia / Naive / Lindy Operating Loop - 2026-05-09

Implementation slice:

- Pattern-adapted the DM-099 operating-loop UI instead of merging the divergent
  worker branch wholesale.
- Made the paid-beta workbench expose a customer-visible growth cycle: Plan,
  Work, Review, plus the latest work-stream signal.
- Reused the existing Naive/Paperclip-derived workbench response fields:
  `team`, `workReady`, `activeWork`, `decisionsNeeded`, `batchDecisions`,
  `workStream`, and `report`. No new tables, routes, jobs, or providers were
  added for this slice.
- Kept Lindy-style decision/action-card language around batch decisions and the
  approval queue while keeping machinery names out of the paid-beta surface.
- Kept Polsia-style visible momentum without copying Polsia's company-factory
  framing or making reputation-risk actions automatic.
- Verification:
  - `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
    passed: 1 file, 16 tests.
  - `pnpm --filter @paperclipai/ui typecheck` passed.

## Chief of Staff Composer - 2026-05-09

Implementation slice:

- Turned the Polsia-vs-Naive comparison into a concrete DearMe product move:
  keep Polsia's visible Chief of Staff choreography in the customer shell while
  routing work through the inherited issue and wakeup substrate.
- Added a shared DearMe Chief of Staff message contract plus a DearMe-specific
  API wrapper so the UI does not call the generic work queue directly.
- Added a paid-beta-gated `/api/dearme/companies/:companyId/chief-of-staff/messages`
  route that records a private work item, assigns and wakes the Chief of Staff
  when the DearMe team exists, and saves the brief for later when Brand OS still
  needs approval.
- Added the paid-beta workbench composer before the existing work-ready panels,
  with intent selection, private-work copy, success/error states, and a
  DearMe decision route instead of exposing operator paths.
- Added route and UI coverage for queued briefs, saved briefs, trial-lock
  behavior, and customer-copy substrate boundaries.
- Verification:
  - `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
    passed: 2 files, 36 tests.
  - `pnpm typecheck` passed across the workspace.

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

Live Team Feed details:

- Added a shared `workStream` contract to the DearMe workbench read-model so the
  customer shell can show a Polsia-style visible team feed without introducing a
  new runtime, queue, or database table.
- `server/src/services/dearme-workbench.ts` now projects the feed from existing
  decisions, work products, issues, agents, and activity events.
- The feed turns existing Paperclip/Naive substrate state into DearMe-language
  role/action/artifact cards: Chief of Staff, Brand Strategist, Voice Editor,
  Content Producer, Opportunity Scout, Portfolio Builder, and Growth Analyst.
- Decision-ready work is lifted to the top of the stream with the underlying
  output, issue, and approval context preserved for the review loop.
- `ui/src/pages/DearMeOnboarding.tsx` now renders a `Live team feed` section in
  the Team Workbench instead of making the first screen feel like a generic
  dashboard or raw activity log.
- The slice reuses Polsia's product choreography, the existing
  Paperclip/Naive workbench primitives, and the Lindy-style action-card pattern
  while keeping provider, adapter, setup payload, and kernel language out of the
  customer-facing UI.

Verification:

- `rg -n "PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE|Current positioning|Product Positioning" docs/dearme/README.md docs/dearme/PRODUCT-ARCHITECTURE.md docs/dearme/PRODUCT-POSITIONING-ROADMAP-ARCHITECTURE.md`
  confirmed the README link and new plan heading.
- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed for the Live Team Feed slice: 4 test files, 42 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm dev` started the local full-stack app on `http://127.0.0.1:3100`
  using embedded Postgres and Vite dev middleware.
- Browser smoke check at `http://127.0.0.1:3100/dearme` rendered the DearMe
  customer shell, `Live team feed`, and `Decision ready` content. The visible
  body text did not contain `Paperclip`, `OpenClaw`, `setup_payload`,
  `adapter`, `provider`, or `MCP`.

## Team Role Projection Hygiene - 2026-05-08

Browser verification exposed a DearMe packaging bug after the Live Team Feed
slice: the local/smoke dataset had many substrate agent rows, so the customer
shell could say `112 team members are assigned` and show names such as
`Chief of Staff 9`.

Fix:

- `server/src/services/dearme-workbench.ts` now projects at most one public
  team member per DearMe role.
- The customer-facing name always comes from the canonical DearMe role label:
  Chief of Staff, Brand Strategist, Voice Editor, Content Producer,
  Opportunity Scout, Portfolio Builder, and Growth Analyst.
- Duplicate runtime/local/smoke agent rows still remain available to the
  Paperclip/Naive substrate, but DearMe presents the intended seven-person
  personal brand team.
- The slice did not add a database table, runtime, or new agent orchestration
  layer; it only corrected the customer read-model projection.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 test files, 14 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- Browser smoke at `http://127.0.0.1:3100/dearme` confirmed
  `112 team members` was absent, `7 team members` was present, numbered
  Chief of Staff variants were absent, and both `Live team feed` and
  `Decision ready` were visible.

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

## DearMe Voice & Memory Entrance - 2026-05-08

Thirtieth verified DearMe slice:

- Added a shared DearMe Voice & Memory contract for user-owned brand memory
  updates: voice samples, proof, goals, audience, offers, boundaries,
  relationships, and preferences.
- Reused the existing `activity_log` substrate for `dearme.memory_updated`
  persistence instead of adding a new memory database or runtime service.
- Extended the DearMe workbench projection so Voice & Memory updates produce
  counts, latest sources, a human-readable memory summary, and Voice Editor
  work-stream progress.
- Added a customer-facing Voice & Memory panel to the DearMe team workbench,
  positioned before the first-cycle generator so users can feed the team before
  asking for more output.
- Added `POST /api/dearme/companies/:companyId/memory-updates` with the
  existing company access and board-gate checks, then refreshed the workbench
  and activity views after submission.
- Kept the slice reuse-first: no new dependency, no new table, no new memory
  engine, and no exposure of Paperclip/OpenClaw/OK Partner/provider/adapter
  terminology in the customer surface.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx` passed: 4 files, 45 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed with the existing Vite chunking
  warnings.
- Local dev server check passed: `curl -I --max-time 5 http://127.0.0.1:3100/dearme` returned HTTP 200.
- Browser check on `/dearme` passed: landed on `/DEAA/dearme`, Voice & Memory,
  Add to Voice & Memory, Live team feed, and 90-second first cycle were visible;
  the team workbench appeared before the first-cycle generator; no
  Paperclip/OpenClaw/setup_payload/adapter/provider/MCP/OK Partner terms were
  visible.
- Browser interaction check passed: adding `Browser verification memory` through
  the Voice & Memory form persisted and re-rendered in the workbench with no
  visible substrate-name leaks.
- Mobile viewport check at 390px passed with Voice & Memory, Add to Voice &
  Memory, Live team feed, and first cycle visible, zero console errors, and no
  substrate-name leaks.

Remaining gaps:

- This is a recent-activity projection, not semantic memory retrieval.
- Voice scoring, imports, deduplication, memory editing, and richer Brand OS
  synthesis remain P1/P2.

## DearMe Draft Voice Profile Signal - 2026-05-08

Thirty-first verified DearMe slice:

- Added a shared DearMe workbench `voiceProfile` contract under Voice & Memory
  so the customer surface can show readiness, confidence, tone signals, and the
  next voice-improvement step.
- Reused saved `dearme.memory_updated` Voice & Memory activity as the source of
  truth; no new table, runtime, dependency, or separate voice engine was added.
- Derived a deterministic Draft Voice Profile from the current voice samples:
  no samples means `Needs samples`, one sample means `Learning`, and two or more
  samples means `Ready for voice review`.
- Rendered the Draft Voice Profile inside the DearMe Voice & Memory panel with
  customer-safe language, current tone badges, confidence, and sample count.
- Kept the profile as a review/readiness signal for private work; publish/send/
  deploy/spend actions remain approval-gated elsewhere in the DearMe flow.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx` passed: 3 files, 28 tests.
- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-routes.test.ts` passed: 1 file, 17 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed with the existing Vite
  MarkdownEditor/large-chunk warnings.
- Local dev server check passed: `curl -I --max-time 5 http://127.0.0.1:3100/dearme`
  returned HTTP 200.
- Desktop and mobile Playwright checks on `/dearme` passed: both landed on
  `/DEAA/dearme`, showed Draft Voice Profile, status, Confidence, and Samples,
  had zero console/page errors, and showed no Paperclip/OpenClaw/OK Partner/
  setup_payload/provider/adapter leaks.
- `git diff --check` passed for the shared/server/ui files touched by this
  slice.

Remaining gaps:

- This is still a deterministic readiness projection, not semantic voice
  extraction, clustering, or model-based style scoring.
- Voice Profile now feeds the first-cycle preview, but does not yet feed the
  deeper runtime task prompt contract used by long-running output agents.
- Connector/import ingestion and memory deduplication remain P1/P2.

## DearMe First Cycle Uses Voice & Memory - 2026-05-08

Thirty-second verified DearMe slice:

- Connected the first-cycle preview to the saved Voice & Memory activity stream
  so the 90-second onboarding/wow loop uses the user's current voice samples,
  proof, goals, audience, offer, and boundaries.
- Reused the existing `activity_log` substrate and `dearme.memory_updated`
  events; no new table, dependency, runtime, semantic memory engine, or
  generation service was added.
- Kept the customer-facing first-cycle route company-scoped and approval-safe:
  it still only prepares private posts, opportunity drafts, proof cards, and
  growth plan output.
- Added an embedded Postgres regression proving first-cycle preview ignores
  other companies' memory and unrelated activity actions while promoting saved
  voice/proof/audience/goal/offer context into the generated preview.
- Made the first-cycle route await the service path, preserving the existing
  validation/authz route contract while allowing memory-backed enrichment.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprints.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts packages/shared/src/validators/dearme.test.ts` passed: 3 files, 32 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `git diff --check -- server/src/services/dearme-brand-blueprints.ts server/src/routes/dearme.ts server/src/__tests__/dearme-brand-blueprints.test.ts` passed.

Remaining gaps:

- This is deterministic recent-activity enrichment, not semantic retrieval,
  ranking, clustering, or model-based voice/profile synthesis.
- Initial DearMe output tasks and recurring DearMe routines now receive
  explicit Voice & Memory context from the approved Brand OS, but still do not
  perform semantic retrieval, ranking, clustering, or model-based memory
  selection.
- Memory editing, deduplication, and connector/import ingestion remain P1/P2.

## DearMe Runtime Tasks Use Voice & Memory - 2026-05-08

Thirty-third verified DearMe slice:

- Added a reusable server-side Voice & Memory context renderer for DearMe Brand
  OS apply artifacts.
- Injected the approved Brand OS voice guidance, voice sample count, voice
  samples, goals, audiences, offers, and constraints into every seeded DearMe
  draft operation issue: voice profile, content batch, opportunity list,
  portfolio update, and weekly report.
- Added the same customer-safe Voice & Memory context to the initial weekly
  Dear me report document so the report lane starts from the user's actual
  audience, offer, voice samples, and boundaries.
- Reused existing issue descriptions and attached documents as the runtime
  context carrier; no schema, database, queue, route, dependency, or separate
  memory runtime was added.
- Kept public actions approval-gated: the task context still tells agents to
  prepare private artifacts and request approval before publish, send, deploy,
  spend, sensitive material, public claims, channel changes, or destructive
  work.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
  passed: 1 file, 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm exec prettier --check server/src/services/dearme-brand-blueprint-apply.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
  could not run because this workspace does not expose a `prettier` command.

Remaining gaps:

- This carries approved deterministic context into runtime prompts, but it is
  not semantic retrieval or long-term memory ranking.
- Voice/Profile context is injected at apply-time; future memory updates after
  Brand OS apply still need a refresh or retrieval path for already-created
  tasks.
- The deeper heartbeat context snapshot could eventually carry structured
  DearMe context, but that is a broader runtime contract change and was
  intentionally left untouched in this slice.

## DearMe Recurring Routines Use Voice & Memory - 2026-05-08

Thirty-fourth verified DearMe slice:

- Extended DearMe recurring routine descriptions with the same approved Voice &
  Memory context already used by seeded DearMe draft operation issues.
- Reused the existing `routines.description` -> routine dispatch -> execution
  issue path, so future scheduled DearMe cycles inherit Brand OS goals,
  audiences, offers, voice samples, voice guidance, and approval boundaries.
- Kept the existing routine operating boundary intact: routines may plan,
  research, and draft privately, but must request approval before publishing,
  sending, deploying, spending, changing channels, using sensitive material,
  making public claims, or deleting work.
- Added regression coverage proving all four applied DearMe routines carry the
  voice/memory context, saved sample language, target audience, and public-action
  boundary.
- No schema, database, queue, route, dependency, UI, or runtime contract changes
  were added.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-brand-blueprint-apply.test.ts`
  passed: 1 file, 2 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-brand-blueprint-apply.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts docs/dearme/BUILD-STATE.md`
  passed.

Remaining gaps:

- Routine descriptions now refresh after future Voice & Memory updates, but
  already in-flight routine execution issues still keep the description copied
  at dispatch time.
- This remains deterministic context injection, not semantic retrieval,
  ranking, clustering, or model-based memory selection.

## DearMe Memory Updates Refresh Recurring Routines - 2026-05-08

Thirty-fifth verified DearMe slice:

- Added a DearMe memory-context refresh service that reuses the existing
  `activity_log` Voice & Memory events and existing `routineService.update()`
  revision path.
- When a board user saves a Voice & Memory update, already-created DearMe
  recurring routines now receive a latest memory block before their
  `Operating boundary`.
- The refresh is company-scoped and only targets routines attached to the
  DearMe Brand OS apply parent issue, so generic/manual routines are left
  untouched.
- Reused existing routine descriptions as the execution-context carrier; no
  schema, table, dependency, queue, or runtime contract was added.
- The refresh is idempotent: repeated saves/rechecks replace the latest memory
  block instead of stacking duplicate context, and unchanged routines do not
  create extra revisions.
- Public/send/deploy/spend boundaries remain intact because the new block is
  inserted before the existing operating boundary rather than replacing it.

Verification:

- `pnpm exec vitest run server/src/__tests__/dearme-memory-context.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts`
  passed: 2 files, 18 tests.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check -- server/src/services/dearme-memory-context.ts server/src/services/index.ts server/src/routes/dearme.ts server/src/__tests__/dearme-memory-context.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts docs/dearme/BUILD-STATE.md`
  passed.

Remaining gaps:

- This still refreshes deterministic recent-memory context, not semantic
  retrieval, ranking, clustering, or model-based memory selection.
- Existing in-flight routine execution issues created before the refresh still
  carry their old copied descriptions; future routine dispatches inherit the
  refreshed routine description.
- Memory editing, deduplication, connector imports, and structured heartbeat
  context snapshots remain P1/P2.

## DearMe Voice & Memory Save Shows Growth Cycle Refresh - 2026-05-08

Thirty-sixth verified DearMe slice:

- Extended the Voice & Memory save response with DearMe-facing growth-cycle
  refresh counts instead of exposing routine internals.
- The memory update route now maps the backend routine refresh result into
  `growthCycles.checked`, `growthCycles.updated`,
  `growthCycles.unchanged`, and `growthCycles.memorySources`.
- The DearMe web shell now shows a short success message after saving memory,
  so the user sees whether existing growth cycles were refreshed or whether
  future cycles will inherit the memory after Brand OS starts.
- Kept the product language focused on Voice & Memory and growth cycles; no
  Paperclip, OpenClaw, adapter, provider, setup payload, or routine-management
  language was added to the customer UI.
- No schema table, dependency, queue, runtime contract, publish/send/deploy
  path, or automatic external action was added.

Verification:

- `pnpm exec vitest run packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 3 files, 44 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- packages/shared/src/validators/dearme.ts packages/shared/src/validators/dearme.test.ts server/src/routes/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.

Remaining gaps:

- The feedback is still deterministic count feedback, not a semantic memory
  quality score or retrieval explanation.
- The UI does not yet let users edit, delete, merge, or de-duplicate saved
  Voice & Memory items.
- Existing in-flight routine execution issues still keep the context copied
  when they were dispatched.

## DearMe Voice & Memory Immediate Save Visibility - 2026-05-08

Thirty-seventh verified DearMe slice:

- The Voice & Memory panel now immediately shows the saved memory item from the
  mutation response at the top of the latest-memory card list instead of waiting
  only for the workbench refetch.
- The just-saved item carries a `Just saved` badge, so the user gets a visible
  receipt that their voice sample, proof point, goal, or boundary entered the
  Brand OS memory surface.
- The panel displays the refreshed source count from the save response and
  locally increments voice/proof counts for newly saved voice samples or proof
  points while the workbench cache catches up.
- The UI still invalidates the DearMe workbench and activity queries after save,
  so the Paperclip/Naive substrate remains the source of truth; this is only a
  customer-facing immediacy polish over the existing route.
- Added API helper coverage for the Voice & Memory update endpoint.
- Kept the web copy DearMe-facing: no Paperclip, OpenClaw, adapter, provider,
  setup payload, MCP, model, or routine-management language was added to the
  customer UI.

Verification:

- `pnpm exec vitest run ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 21 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx ui/src/api/dearme.test.ts`
  passed.
- Focused leak scan for `Paperclip`, `OpenClaw`, `OK Partner`, `provider`,
  `adapter`, `setup_payload`, `setup payload`, `MCP`, `model`, and `routine`
  across the touched UI/API test files returned only negative test assertions.

Remaining gaps:

- Saved memories still cannot be edited, deleted, merged, or de-duplicated from
  the DearMe web shell.
- Voice/profile confidence remains deterministic and is not yet a semantic
  retrieval or voice-match score.
- The immediate card mirrors the saved API response; deeper memory ranking and
  clustering still belongs to a later memory-quality slice.

## DearMe Voice & Memory Empty State - 2026-05-08

Thirty-eighth verified DearMe slice:

- The Voice & Memory panel now shows a DearMe-owned empty state when the Brand OS
  has no saved memories yet instead of silently omitting the latest-memory area.
- The empty state tells the user to add a real sample, proof point, goal, or
  boundary and explains that DearMe will use it to protect their voice and
  prepare the next growth cycle.
- The empty state preserves the product direction: team and memory are visible,
  but provider, adapter, setup payload, model, MCP, routine, Paperclip, OpenClaw,
  and OK Partner language stay out of the customer UI.
- Added focused rendering coverage for the no-memory state so a new design
  partner does not start from a blank workbench section.
- The same test now covers the first-save transition: after a new user saves a
  voice sample, the empty state is replaced immediately by the saved memory
  card with a `Just saved` receipt.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 1 file, 14 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. Vite still emits the existing
  non-blocking `MarkdownEditor` mixed dynamic/static import warning and large
  chunk warnings.

Remaining gaps:

- The empty state is still a local panel affordance; it does not yet launch a
  guided import flow for LinkedIn, X, newsletter, resume, GitHub, or a portfolio.
- Saved memories still cannot be edited, deleted, merged, or de-duplicated from
  the DearMe web shell.

## DearMe Letter Packaging - 2026-05-08

Thirty-ninth verified DearMe slice:

- Reframed the report/approval card in the Team Workbench from `Approval gate`
  to `Dear me letter`, making the recurring letter ritual visible as a product
  surface instead of hiding it behind control-plane language.
- The card now explains that DearMe turns progress, decisions, and next bets
  into a private letter while approvals still control what represents the user
  publicly.
- The report action now reads `Open letter`, preserving the same issue/open
  behavior while changing the customer-facing packaging.
- This follows the Polsia packaging lesson of making progress feel watchable and
  ritualized, but keeps the personal-brand trust boundary approval-gated.

Verification:

- `pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 1 file, 14 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

Remaining gaps:

- The letter is still backed by the existing weekly report read-model; there is
  not yet a separate morning/evening daily-letter schedule or notification
  surface.
- The UI still needs a broader visual-design pass so the product feels premium
  rather than like a dense operational dashboard.

## DearMe Approval Payload Stable Team Keys - 2026-05-08

Fortieth verified DearMe slice:

- Browser verification found the DearMe web shell opening on the Team Workbench
  as intended, but the current page emitted React duplicate-key errors when old
  or smoke Brand OS approval payloads contained repeated DearMe team roles.
- The DearMe Brand OS approval team summary now keys rendered team rows with
  role plus position, so repeated `content_producer`, `opportunity_scout`, or
  similar legacy role entries do not destabilize the visible approval payload.
- Added regression coverage proving a repeated-role Brand OS payload renders the
  Growth team summary without React duplicate-key warnings.
- No customer-facing copy, route, schema, API contract, runtime loop, external
  action, approval policy, dependency, or billing behavior changed.

Verification:

- `pnpm exec vitest run ui/src/components/ApprovalPayload.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 21 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. Vite still emits the existing
  non-blocking `MarkdownEditor` mixed dynamic/static import warning and large
  chunk warnings.
- Fresh browser tab on `http://127.0.0.1:3100/dearme` redirected to
  `/DEAAAAA/dearme`, rendered the Team Workbench, and reported no console
  errors.

Remaining gaps:

- This hardens rendering for repeated payload rows; it does not de-duplicate
  stored legacy approvals or smoke data.
- The product surface is directionally right but still visually dense/dark; the
  premium web design pass should use Littlebird/Lindy front-end patterns and
  DearMe-specific brand packaging rather than copying Polsia's quirky visual
  style.

## DearMe Front-End Reuse Findings - 2026-05-08

Read-only subagent inventory:

- Highest-value front-end donor: `/Users/peter/research/littlebird-2026-04-23`,
  especially `recovered-source/src/components`, `features`, `stores`,
  `providers`, `components/ui`, `chat`, `todos`, `onboarding-v2`, `settings`,
  `subscription`, `RouterRoot`, and layout patterns.
- Secondary pattern donor: `/Users/peter/lindy-extraction/01_frontend_source/src`,
  especially `components`, `pages`, and `layouts`. This extraction is noisier
  and should be adapted selectively instead of migrated whole.
- Naive/Paperclip remains the technical substrate and workbench/runtime pattern
  source. Its front-end code is useful for workspace, command/panel, sidebar,
  and live-work surfaces, but it is domain-coupled to agents/workspaces and is
  not a direct DearMe web shell drop-in.
- DearMe should stay web-first. The next premium UI architecture pass should
  reuse Littlebird/Lindy web interaction and layout patterns where they reduce
  work, while keeping Polsia's product choreography and Naive/Paperclip's hidden
  runtime substrate.

Integration guidance:

- Copy/adapt Littlebird product-shell primitives first for the next large UI
  pass.
- Borrow Lindy patterns only where they improve assistant/chat/onboarding
  ergonomics without importing its API assumptions.
- Keep Naive/Paperclip machinery hidden behind DearMe language: Team visible,
  machinery hidden.

## DearMe Web UI Reuse Architecture - 2026-05-08

Forty-first DearMe slice:

- Added `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md` to lock the web-first UI
  reuse strategy before the next large design/code pass.
- The architecture decision is now explicit: DearMe should copy Polsia's
  product choreography, keep Naive/Paperclip as hidden runtime substrate, use
  Littlebird as the primary web product-shell donor, and use Lindy selectively
  for premium assistant, modal, drawer, transcript, and section-boundary
  patterns.
- The doc rejects three tempting wrong paths:
  - copying Polsia's quirky visual style,
  - waiting for a complete proprietary Naive UI source drop,
  - exposing raw Paperclip/Naive control-plane pages as DearMe's customer UI.
- It also explains why DearMe still needs both a frontend and API layer:
  the frontend owns the premium product experience, while the API owns auth,
  company scoping, persistence, approvals, Brand OS memory, runtime dispatch,
  usage, and provider isolation.
- A designer subagent independently confirmed the same direction: keep the
  current DearMe route/focus decision logic, borrow Littlebird onboarding and
  trust-gate patterns, adapt Lindy's section boundary, modal, drawer, and home
  layout primitives, and avoid donor marketplace/admin IA.
- The next implementation slice is now constrained to UI architecture
  extraction, not another product feature: create DearMe-owned shell primitives
  such as page shell, section boundary, header, inspector, decision card, work
  item card, and team feed before visually rebuilding the Team Workbench.

Verification:

- Read local donor evidence from:
  - `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/onboarding-v2/onboarding.tsx`
  - `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/hummingbird/hummingbird-chat.tsx`
  - `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/routes/team/join.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/transcript/Response.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/SectionBoundary.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/layouts/Home/HomeLayout.tsx`
- Read-only designer subagent completed with file-level reuse recommendations
  across current DearMe, Littlebird, and Lindy UI sources.

Remaining gaps:

- No UI code changed in this slice.
- The current DearMe workbench is still visually dense/dark and should not be
  treated as the final product shell.
- The next code slice should protect existing route/focus behavior with tests
  while extracting DearMe shell primitives from the monolithic
  `DearMeOnboarding.tsx` page.

## DearMe Shell Primitives - 2026-05-08

Forty-second DearMe slice:

- Added `ui/src/components/DearMeShell.tsx` as the first DearMe-owned web shell
  primitive set inspired by the Lindy section-boundary pattern and the current
  DearMe page structure.
- The new primitive set includes:
  - `DearMePageShell` for the stable page surface marker and spacing.
  - `DearMeHero` for the product-level header and action area.
  - `DearMePanel` for bounded DearMe product panels.
  - `DearMeSectionBoundary` for customer-safe section loading/failure handling.
- Wired `ui/src/pages/DearMeOnboarding.tsx` to use `DearMePageShell` and
  `DearMeHero` without changing the visible hero copy or the existing
  `Preview Brand OS` / `Request approval` actions.
- Added `ui/src/components/DearMeShell.test.tsx` to lock the shell markers,
  hero action rendering, panel rendering, and customer-safe section failure
  copy.
- Extended the shell test to guard the section fallback against visible
  substrate language: `Paperclip`, `OpenClaw`, `adapter`, `provider`,
  `setup_payload`, and `OK Partner`.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 16 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx docs/dearme/BUILD-STATE.md`
  passed.
- Browser smoke on `http://127.0.0.1:3100/dearme` redirected to
  `/DEAAAAA/dearme`, rendered title `Team · DearMe · DearMe`, found both
  `data-dearme-surface="page-shell"` and `data-dearme-surface="hero"`, and
  recorded no console errors or warnings.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.

Remaining gaps:

- This is a shell extraction slice, not the full premium workbench redesign.
- `DearMeOnboarding.tsx` is still monolithic and should be split into
  DearMe-owned decision/work/team/feed cards in the next UI architecture slice.
- The current route still runs on the Paperclip/Naive substrate; the customer
  page now hides those internals at the touched shell/page source boundary, but
  broad source still contains internal compatibility names.

## DearMe Panel Reuse Slice - 2026-05-08

Forty-third DearMe slice:

- Reused `DearMePanel` across the first large DearMe web surfaces in
  `ui/src/pages/DearMeOnboarding.tsx`.
- Converted the high-level first-cycle, team-workbench, decisions, work-ready,
  live-feed, paid-beta, private-work-ready, and Brand OS seed shells to the
  DearMe-owned panel primitive.
- Kept visible copy, actions, route behavior, API calls, and inner work cards
  unchanged. This slice is UI architecture consolidation, not a redesign.
- Preserved the current customer-facing rule: team/product surfaces are visible,
  while substrate implementation language stays out of the touched DearMe page
  and shell files.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 16 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx docs/dearme/BUILD-STATE.md`
  passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser smoke on `http://127.0.0.1:3100/dearme` redirected to
  `/DEAAAAA/dearme`, rendered title `Team · DearMe · DearMe`, found
  `data-dearme-surface="page-shell"`, `data-dearme-surface="hero"`, and 10
  `data-dearme-surface="panel"` instances, and recorded no console errors or
  warnings.

Remaining gaps:

- This still does not make the workbench visually premium. It only gives the
  next redesign slice a DearMe-owned panel substrate.
- The smaller repeated cards for team members, decisions, ready work, and live
  feed are still inline inside `DearMeOnboarding.tsx`.
- The workbench should next extract DearMe-owned cards and then move toward the
  Lindy-quality two-column home/cockpit layout.

## DearMe Workbench Chrome Slice - 2026-05-08

Forty-fourth DearMe slice:

- Added DearMe-owned workbench chrome primitives in
  `ui/src/components/DearMeShell.tsx`:
  - `DearMeWorkbenchSectionHeader` for role-led section headers.
  - `DearMeMetricStrip` for stable workbench metric rows.
  - `DearMeCockpitGrid` for balanced and primary two-column cockpit layouts.
- Extended `ui/src/components/DearMeShell.test.tsx` to lock the new surface
  markers and keep the primitives reusable outside the current onboarding page.
- Reused the new chrome primitives in `ui/src/pages/DearMeOnboarding.tsx` for
  the core team workbench:
  - My AI team today.
  - Voice & Memory.
  - Team at work.
  - Dear me letter.
  - Decisions needed.
  - Work ready.
  - Live team feed.
- Kept query/mutation/deep-link behavior, existing Voice & Memory save
  behavior, and inner decision/work/feed cards unchanged. This is a workbench
  shell consolidation slice, not a full visual redesign.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 17 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx docs/dearme/BUILD-STATE.md`
  passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` rendered title
  `Team · DearMe · DearMe`, found `page-shell`, `hero`, 11 `panel`
  instances, 7 `workbench-section-header` instances, 2 `cockpit-grid`
  instances, and 2 `metric-strip` instances, with no console errors or
  warnings.

Remaining gaps:

- The smaller repeated team, decision, work-ready, and live-feed cards are still
  inline inside `DearMeOnboarding.tsx`.
- The workbench now has DearMe-owned chrome, but still needs the premium visual
  pass that combines Naive-style polish, Lindy-style assistant layout, and
  DearMe-specific personal-brand packaging.
- The voice profile detail area and memory form still use local inline layout
  inside `VoiceMemoryPanel`; their outer chrome now matches the rest of the
  DearMe workbench.

## DearMe Focus Surface Slice - 2026-05-08

Forty-fifth DearMe slice:

- Added DearMe-owned decision-detail primitives in
  `ui/src/components/DearMeShell.tsx`:
  - `DearMeFocusSurface` for the high-priority decision/work review area.
  - `DearMeEvidenceGrid` for prepared-work, state, trust-boundary, and output
    evidence rows.
- Extended `ui/src/components/DearMeShell.test.tsx` to lock the new focus and
  evidence surface markers.
- Reused the new primitives in `ui/src/pages/DearMeOnboarding.tsx` for:
  - focused approval decisions,
  - focused batch decisions,
  - focused prepared work items,
  - focused output review.
- Kept approval review, output review, deep-link focus, query/mutation behavior,
  and visible customer copy unchanged. This slice turns the most important
  review area into a reusable DearMe product surface without touching the
  underlying runtime/API path.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 18 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx`
  passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.

Remaining gaps:

- The focused surfaces now have DearMe-owned structure, but still need a visual
  QA pass across desktop, tablet, and mobile after the next broader layout pass.
- The smaller repeated team, decision, work-ready, and live-feed cards are still
  inline inside `DearMeOnboarding.tsx`.
- The next high-value UI reuse slice should move the page toward a premium
  Home/Team Workbench frame inspired by Lindy layout discipline and Littlebird
  route containment, while keeping Paperclip/Naive runtime machinery hidden.

## DearMe Workbench Card Slice - 2026-05-08

Forty-sixth DearMe slice:

- Added `DearMeWorkbenchCard` in `ui/src/components/DearMeShell.tsx` as the
  reusable card primitive for prepared work, team activity, decision rows, and
  live-feed items.
- Extended `ui/src/components/DearMeShell.test.tsx` to lock the card marker,
  title, description, badge, footer, and action behavior.
- Reused `DearMeWorkbenchCard` in `ui/src/pages/DearMeOnboarding.tsx` across
  the customer-facing workbench:
  - initial personal-brand team workstream,
  - Team at work,
  - Dear me letter,
  - batch decisions,
  - individual decisions,
  - Work ready,
  - Live team feed.
- Kept query/mutation behavior, approval review behavior, output review
  behavior, and visible customer copy unchanged. This is a component reuse and
  product-surface consolidation slice, not a runtime/API change.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 19 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx`
  passed.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` rendered title
  `Team · DearMe · DearMe`, found 1 `page-shell`, 1 `hero`, 11 `panel`
  instances, 7 `workbench-section-header` instances, 2 `cockpit-grid`
  instances, 2 `metric-strip` instances, and 5 `workbench-card` instances, with
  no error/warning entries in the latest browser log window.

Remaining gaps:

- Focus surfaces are covered by unit tests, but the default local smoke company
  did not expose a focused decision route during this pass.
- Some preview, voice-gate, and private-work cards remain inline; those should
  move only after the primary workbench cards settle visually.
- Next high-value Web slice is a real visual QA/polish pass on the DearMe
  workbench frame using the new shell/card primitives.

## DearMe Empty State And Preview Card Slice - 2026-05-08

Forty-seventh DearMe slice:

- Added `DearMeEmptyState` in `ui/src/components/DearMeShell.tsx` as the
  reusable DearMe-owned empty-state primitive for customer-facing workbench
  sections.
- Extended `ui/src/components/DearMeShell.test.tsx` to lock the empty-state
  marker, title, description, icon, actions, and child content behavior.
- Reused `DearMeWorkbenchCard` in `ui/src/pages/DearMeOnboarding.tsx` for the
  first-cycle preview, Voice & Memory memory cards, and private-work output
  cards.
- Replaced scattered dashed empty blocks in the DearMe workbench with
  `DearMeEmptyState` for:
  - Voice & Memory,
  - Dear me letter,
  - Decisions needed,
  - Work ready,
  - Private work.
- Kept query/mutation behavior, approval review behavior, output review
  behavior, and visible customer copy unchanged. This slice is about reuse and
  product-surface consistency, not API/runtime behavior.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 20 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md`
  passed before this BUILD-STATE append.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Browser smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` rendered title
  `Team · DearMe · DearMe`, found 1 `page-shell`, 1 `hero`, 11 `panel`
  instances, 7 `workbench-section-header` instances, 2 `cockpit-grid`
  instances, 2 `metric-strip` instances, 5 `workbench-card` instances, and 5
  `empty-state` instances after a fresh reload, with no fresh error/warning
  entries.
- Browser interaction smoke clicked `Voice & Memory`, navigated to
  `http://127.0.0.1:3100/DEAAAAA/dearme?view=voice`, kept the Voice & Memory
  surface visible, and preserved the 5 `empty-state` plus 5 `workbench-card`
  markers with no fresh error/warning entries.

Remaining gaps:

- The workbench now has shared shell, panel, section, card, focused-surface, and
  empty-state primitives, but the visual hierarchy still needs a premium pass
  inspired by Lindy's front-end layout discipline rather than Paperclip's admin
  density.
- Browser DOM, URL, interaction, and console checks passed, but Browser
  screenshot capture timed out twice on the local tab. The next visual pass
  should either recover screenshot capture or use an allowed fallback before
  making pixel-level layout claims.
- The next Web slice should tighten the Home Cockpit visual layout without
  exposing runtime machinery.

## DearMe Checklist Surface Slice - 2026-05-08

Forty-eighth DearMe slice:

- Added `DearMeChecklist` in `ui/src/components/DearMeShell.tsx` as the
  reusable DearMe-owned checklist primitive for first-cycle artifacts,
  trust-boundary lists, and approval-ready work summaries.
- Extended `ui/src/components/DearMeShell.test.tsx` to lock the checklist and
  checklist-item markers.
- Reused `DearMeChecklist` in `ui/src/pages/DearMeOnboarding.tsx` for both
  first-cycle artifact lists:
  - the personal-brand team approval rail,
  - the prepared-private first-cycle panel.
- Kept first-cycle preview behavior, form behavior, approval behavior, and
  visible customer copy unchanged.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 21 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md`
  passed before this BUILD-STATE append.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Fresh Browser smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` rendered title
  `Team · DearMe · DearMe`, found 1 `page-shell`, 1 `hero`, 5
  `workbench-card` instances, 5 `empty-state` instances, 1 `checklist`, and 5
  `checklist-item` instances, with no fresh error/warning entries.
- Browser route-state check on
  `http://127.0.0.1:3100/DEAAAAA/dearme?view=voice` kept Voice & Memory
  visible and preserved the checklist/empty-state markers.

Remaining gaps:

- Browser click interaction on the reused old tab hit a CDP selector timeout;
  a fresh-tab DOM/console smoke passed. Continue using fresh Browser tabs if
  the in-app tab enters this state again.
- The next Web slice should replace the remaining inline preview and voice-gate
  microcards only where reuse clarifies the product surface.

## DearMe Preview Primitive Reuse Slice - 2026-05-08

Forty-ninth DearMe slice:

- Extended `DearMeEmptyState` with an `align="center"` option for large preview
  and waiting surfaces that need a calm, centered composition instead of a
  left-aligned row.
- Added component coverage for centered empty states in
  `ui/src/components/DearMeShell.test.tsx`.
- Reused `DearMeEvidenceGrid` and `DearMeWorkbenchCard` for Voice Gate checks
  in `ui/src/pages/DearMeOnboarding.tsx`.
- Reused `DearMeWorkbenchCard` in the Brand OS preview for team members, growth
  cycles, and planned operations.
- Replaced the preview empty block with `DearMeEmptyState` so the first-cycle
  preview uses the same DearMe-owned shell language as the rest of the
  workbench.
- Tightened static team, fallback team, and live team feed React keys to stable
  composite keys so repeated team roles cannot produce duplicate-key warnings
  when multiple items come from the same role.

Verification:

- `pnpm exec vitest run ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed: 2 files, 22 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `pnpm --filter @paperclipai/ui build` passed. It still emits the existing
  non-blocking Vite warnings for `MarkdownEditor` mixed static/dynamic import
  and large chunks.
- `git diff --check -- ui/src/components/DearMeShell.tsx ui/src/components/DearMeShell.test.tsx ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx docs/dearme/BUILD-STATE.md`
  passed before this BUILD-STATE append.
- `rg -n "Paperclip|OpenClaw|adapter|provider|setup_payload|OK Partner" ui/src/components/DearMeShell.tsx ui/src/pages/DearMeOnboarding.tsx`
  returned no matches.
- Fresh Browser smoke on `http://127.0.0.1:3100/DEAAAAA/dearme` rendered title
  `Team · DearMe · DearMe`, found 1 `page-shell`, 1 `hero`, 11 `panel`
  instances, 7 `workbench-section-header` instances, 2 `cockpit-grid`
  instances, 2 `metric-strip` instances, 5 `workbench-card` instances, 6
  `empty-state` instances, 1 `checklist`, and 5 `checklist-item` instances,
  with zero framework overlays and zero relevant console entries.
- Fresh Browser smoke on
  `http://127.0.0.1:3100/DEAAAAA/dearme?view=voice` preserved the same DearMe
  surface markers, rendered title `Team · DearMe · DearMe`, and recorded zero
  framework overlays plus zero relevant console entries.

Remaining gaps:

- This slice improves reuse and front-end cleanliness, but it is still working
  inside the current DearMe web shell. The larger visual direction still needs
  a dedicated premium design pass drawing from Lindy's front-end strengths and
  Naive's product feel where source evidence allows.
- Browser smoke now verifies DOM markers and console cleanliness on fresh tabs;
  a future visual QA slice should add reliable screenshot capture before making
  pixel-level layout claims.

## DearMe Architecture Integration And Worker Coordination - 2026-05-08

Fiftieth DearMe slice:

- Updated `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md` to make the reuse model
  source-honest:
  - Paperclip OSS and the current DearMe fork are the concrete reusable code
    base for auth/company/work/runtime/approval/document/output mechanics.
  - Naive private product findings are architecture and choreography evidence
    unless a specific local executable source file is verified.
  - Littlebird remains the primary web-shell/onboarding donor.
  - Lindy remains the premium assistant/drawer/modal/prompt-pattern donor.
  - Polsia remains the product choreography and proof-of-work packaging donor,
    not a visual-system donor.
- Added current implementation reality for `ui/src/components/DearMeShell.tsx`:
  existing DearMe-owned primitives include page shell, hero, panel, workbench
  section header, cockpit grid, metric strip, focus surface, evidence grid,
  workbench card, empty state, checklist, and section boundary.
- Reframed the next UI work away from recreating generic primitives and toward
  using the existing primitives to compose premium Home, Team Workbench, and
  Decision surfaces.
- Added worker-coordination guidance for the dirty integration tree:
  - keep one lead thread as architecture/integration owner,
  - use isolated worktrees for product-code workers after a recoverable DearMe
    baseline exists,
  - start worker execution with `DM-005A` before unblocking product-code tickets
    like `DM-001`,
  - do not let multiple agents freely edit the same files in the active mixed
    checkout.
- Updated `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  so the first worker ticket points at the current branch, includes
  `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md`, and records the source-honest
  Paperclip/Naive/Littlebird/Lindy/Polsia donor split.
- Incorporated the Naive/Paperclip verifier finding that
  `/Users/peter/naive-research-2026-05-05` contains concrete Paperclip OSS
  source plus Naive research artifacts, but not a complete directly reusable
  private Naive front-end/backend implementation.
- Ignored the failed Polsia/Symphony verifier subagent because it hit context
  limits; this pass used direct local inspection for the Symphony and Polsia
  coordination claims instead.

Verification:

- Donor path checks found:
  - `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/features/onboarding-v2/onboarding.tsx`
  - `/Users/peter/research/littlebird-2026-04-23/recovered-source/src/routes/team/join.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/SectionBoundary.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/layouts/ResizableSlideOutPanel.tsx`
  - `/Users/peter/lindy-extraction/01_frontend_source/src/components/prompt/PromptInput.tsx`
  - `/Users/peter/naive-research-2026-05-05/paperclipai/paperclip/ui/src`
  - `/Users/peter/naive-research-2026-05-05/session-fetches/extracted-setup_payload.json`
- `rg -n "export function DearMe|function DearMe|export const DearMe" ui/src/components/DearMeShell.tsx`
  confirmed the current shell primitive inventory.
- `rg -n "setupPayload|setup_payload|brand_blueprint|budget|cost|workbench|apply" packages/shared/src/validators/dearme.ts server/src/services/dearme-brand-blueprints.ts server/src/services/dearme-brand-blueprint-apply.ts server/src/services/dearme-workbench.ts server/src/routes/dearme.ts`
  confirmed the existing Brand OS/apply/workbench/budget-policy implementation
  surface.
- `command -v symphony` produced no path, so this pass treats Symphony as a
  documented development-loop pattern rather than an active local runtime.
- `git diff --check -- docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  passed.
- `awk '/[ \t]$/{print FILENAME ":" FNR ": trailing whitespace"; found=1} END{exit found ? 1 : 0}' docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  passed.
- `pnpm --filter @paperclipai/ui typecheck` passed earlier in this architecture
  pass after the stale `CrashingSection` report was checked against the current
  source.

Remaining gaps:

- The next architecture-to-code bridge should choose between:
  - `DM-005A` integration baseline/product spine for safe parallel worker use,
  - premium Home/Team Workbench composition using existing DearMe primitives,
  - internal setup-intent/brand_blueprint payload persistence with explicit
    budget gates.
- Naive private cloud parity still lacks verified local implementation for
  setup parser/orchestrator, private cloud billing/provisioning, per-tenant VM
  control, and full private DB schema.
- The active checkout remains highly dirty. Do not broad stage, broad cleanup,
  or assign concurrent workers against the same files without a scoped baseline.

## DM-005A Baseline Spine Manifest - 2026-05-08

Fifty-first DearMe slice:

- Added `docs/dearme/BASELINE-SPINE-MANIFEST.md` as the current handoff
  manifest for the minimum DearMe product spine.
- Confirmed live git state:
  - branch: `codex/dearme-baseline-2026-05-08`
  - head: `6b322408456318c237834a1ef5ceb08447ec7213`
  - head summary: `Establish a recoverable DearMe product baseline`
  - active checkout: still heavily dirty with tracked and untracked changes.
- Recorded the source-of-truth distinction:
  - `6b322408` is a recoverable baseline candidate,
  - the active checkout still contains newer DearMe spine files outside that
    commit,
  - future product-code workers must not use `/Users/peter/dearme` as their
    direct work base.
- Locked the minimum spine categories:
  - DearMe source-of-truth docs,
  - shared DearMe validators and exports,
  - `/api/dearme` route and DearMe server services,
  - DearMe-focused server tests,
  - `/dearme` UI shell, API client, route, page, and focused UI tests.
- Incorporated the subagent findings:
  - focused DM-005A tests pass,
  - `docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md`,
    `server/src/services/dearme-memory-context.ts`, and
    `ui/src/components/DearMeShell.tsx` remain untracked in the active checkout,
  - DM-001 through DM-010 overlap on the same shared/server/UI spine and must
    be integrated sequentially by the lead thread, not blindly merged in
    parallel.
- Updated `doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  so its starting evidence reflects the live `6b322408` baseline candidate
  instead of the older pre-baseline state.

Verification:

- `git status --short --branch` confirmed the current branch and mixed dirty
  tree.
- `git rev-parse --abbrev-ref HEAD && git rev-parse HEAD && git log --oneline -5`
  confirmed `6b322408456318c237834a1ef5ceb08447ec7213`.
- `git worktree list` confirmed active DM worktrees under `/private/tmp`,
  including `dearme-dm-001` through `dearme-dm-010`.
- Candidate spine status inspection confirmed the tracked/untracked split used
  in `BASELINE-SPINE-MANIFEST.md`.
- Subagent verifier evidence reported:
  - `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
    passed, 14 tests.
  - `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
    passed, 20 tests.
  - `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
    passed, 22 tests.
- Lead verification after writing the manifest reran the same focused checks:
  - `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
    passed, 14 tests.
  - `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
    passed, 20 tests.
  - `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
    passed, 22 tests.
- `git diff --check -- docs/dearme/BASELINE-SPINE-MANIFEST.md docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  passed.
- `awk '/[ \t]$/{print FILENAME ":" FNR ": trailing whitespace"; found=1} END{exit found ? 1 : 0}' docs/dearme/BASELINE-SPINE-MANIFEST.md docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md`
  passed.

Remaining gaps:

- This manifest is not a commit and does not make untracked files recoverable
  by itself.
- DM-001 should not start from the shared checkout. It needs either a new
  explicit baseline ref containing the selected untracked spine files or a
  disposable worktree from `6b322408` with only the manifest-selected files
  applied as a reviewable patch.

## DearMe DM Merge Queue Scan - 2026-05-08

Fifty-second DearMe slice:

- Added `doc/plans/2026-05-08-dearme-dm-merge-queue.md` to make the current
  worker-branch integration order explicit.
- Read-only scanned `/private/tmp/dearme-dm-*` worktrees against
  `6b322408456318c237834a1ef5ceb08447ec7213`.
- Confirmed DM-001 through DM-009 are a linear cumulative stack, not independent
  branches:
  - DM-001: `29b87bd8`, clean worktree, 11 changed files.
  - DM-002: `7b95a2d5`, clean worktree, 16 changed files.
  - DM-003: `876ec6b3`, clean worktree, 24 changed files.
  - DM-004: `f402d94e`, clean worktree, 26 changed files.
  - DM-005: `acaa7842`, clean worktree, 27 changed files.
  - DM-006: `cc358376`, clean worktree, 28 changed files.
  - DM-007: `d1bf8431`, clean worktree, 30 changed files.
  - DM-008: `9b1d1f3f`, clean worktree, 34 changed files.
  - DM-009: `aeac3696`, clean worktree, 35 changed files.
- Confirmed DM-010 points at `aeac3696` but has 8 uncommitted files, so it is
  not merge-ready.
- Locked the merge rule: integrate sequentially from DM-001 in a clean
  disposable integration worktree. Do not merge these branches blindly in
  parallel, and do not use the dirty `/Users/peter/dearme` checkout as the
  product-code worker base.

Verification:

- `git worktree list` confirmed active DM worktrees.
- Read-only branch scan recorded branch, head, dirty count, and diff-file count
  for each `/private/tmp/dearme-dm-*` worktree.
- `git log --oneline --decorate --graph --all --simplify-by-decoration --branches='codex/dearme-dm-*' --branches='codex/dearme-baseline-2026-05-08'`
  confirmed the stacked branch shape.
- `git -C /private/tmp/dearme-dm-001-output-review-regeneration log --oneline 6b322408..HEAD`
  confirmed DM-001 is one commit over the baseline.
- `git -C /private/tmp/dearme-dm-010-approval-ready-handoff status --short --branch`
  confirmed DM-010 has uncommitted files.

Next integration candidate:

- DM-001, after running its focused tests inside
  `/private/tmp/dearme-dm-001-output-review-regeneration` and verifying that the
  review loop stays inside `/dearme`.

## DM-001 Worktree Readiness Verification - 2026-05-08

Fifty-third DearMe slice:

- Verified `/private/tmp/dearme-dm-001-output-review-regeneration` as the first
  clean integration candidate from the DM worker stack.
- Confirmed the worktree is clean on branch `codex/dearme-dm-001-output-review`
  and head `29b87bd8`.
- Confirmed the branch is one commit over
  `6b322408456318c237834a1ef5ceb08447ec7213` and changes 11 scoped DearMe spine
  files.
- Confirmed the product behavior of DM-001:
  - output review stays inside `/dearme`,
  - private prepared work can be marked `Useful`, `Needs changes`,
    `Regenerate`, or `Not useful`,
  - regeneration/not-useful feedback can wake the existing assignee internally,
    but the route response strips that wake detail from the customer payload,
  - provider/setup/Paperclip/OpenClaw internals are tested as stripped from
    customer-visible output payloads.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-001 is marked
  as verified first integration candidate, while DM-010 remains held because it
  has uncommitted files.

Verification:

- `git diff --check -- docs/dearme/BASELINE-SPINE-MANIFEST.md docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md doc/plans/2026-05-08-dearme-dm-merge-queue.md`
  passed before this readiness note.
- `awk '/[ \t]$/{print FILENAME ":" FNR ": trailing whitespace"; found=1} END{exit found ? 1 : 0}' docs/dearme/BASELINE-SPINE-MANIFEST.md docs/dearme/WEB-UI-REUSE-ARCHITECTURE.md docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-dm-005a-integration-baseline-ticket.md doc/plans/2026-05-08-dearme-dm-merge-queue.md`
  passed before this readiness note.
- In `/private/tmp/dearme-dm-001-output-review-regeneration`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 13 tests.
- In `/private/tmp/dearme-dm-001-output-review-regeneration`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 20 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/private/tmp/dearme-dm-001-output-review-regeneration`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 22 tests.
- `rg -n "Useful|Needs changes|Regenerate|Not useful|Paperclip|OpenClaw|provider|wake|heartbeat|issue|approval" ...`
  showed expected internal-only substrate matches in server/service code and
  product-native customer action labels in `ui/src/pages/DearMeOnboarding.tsx`.
- Test assertions confirm user-visible payloads and UI do not expose provider,
  setup payload, Paperclip, OpenClaw, wake internals, or raw issue/approval
  navigation for the output-review loop.

Next integration step:

- Replay DM-001 onto a clean disposable integration worktree from the approved
  baseline, preserving the newer lead-owned `BUILD-STATE.md` notes from the main
  checkout instead of blindly accepting the worker's older state hunk.

## DM-001 Clean Integration Commit - 2026-05-08

Fifty-fourth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-001-integrate`
  from baseline `6b322408456318c237834a1ef5ceb08447ec7213`.
- Created integration branch `codex/dearme-dm-001-integrated`.
- Replayed worker commit `29b87bd8` with `git cherry-pick --no-commit`.
- Dropped the worker's older `docs/dearme/BUILD-STATE.md` hunk so this main
  checkout remains the lead-owned build-state surface.
- Committed the integrated product-code slice as
  `d53b6115 Keep DearMe output review inside the product surface`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-001 is no
  longer merely ready; it is now integrated into the disposable branch.

Product behavior now carried by the integration branch:

- Private prepared DearMe work can be reviewed from the DearMe surface.
- The user can choose `Useful`, `Needs changes`, `Regenerate`, or `Not useful`.
- Regeneration and not-useful feedback reuse the existing issue/comment/work
  product substrate and internal assignee wakeups.
- Customer-visible responses and UI keep wake/issue/provider/setup/Paperclip/
  OpenClaw details backstage.

Verification:

- In `/tmp/dearme-dm-001-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded after the disposable
  worktree initially lacked `node_modules`. It reused the lockfile cache and
  emitted the existing `paperclip-plugin-dev-server` bin warning from the local
  plugin SDK build artifact state.
- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 13 tests.
- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 20 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-001-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 22 tests.
- In `/tmp/dearme-dm-001-integrate`,
  `git diff --check -- doc/plans/2026-05-08-dearme-dm-001-output-review-regeneration-ticket.md packages/shared/src/validators/dearme.test.ts packages/shared/src/validators/dearme.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/routes/dearme.ts server/src/services/dearme-output-handoff.ts ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx ui/src/pages/DearMeOnboarding.tsx`
  passed.

Not run:

- Full `pnpm test:run`.
- Full `pnpm -r typecheck`.
- Full `pnpm build`.

Next integration step:

- Treat `d53b6115` as the next candidate baseline for DM-002.
- Replay DM-002 onto `d53b6115` in a new clean disposable worktree; do not merge
  directly into the dirty `/Users/peter/dearme` checkout.
- Keep resolving product copy toward the locked rule: team visible, machinery
  hidden.

## DM-002 Clean Integration Commit - 2026-05-08

Fifty-fifth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-002-integrate`
  from integrated DM-001 baseline `d53b6115`.
- Created integration branch `codex/dearme-dm-002-integrated`.
- Replayed worker commit `7b95a2d5` with `git cherry-pick --no-commit`.
- Resolved the only conflict by dropping the worker's older
  `docs/dearme/BUILD-STATE.md` hunk and keeping state lead-owned.
- Committed the integrated product-code slice as
  `80128431 Show DearMe team updates in the customer work stream`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-002 is now an
  integrated queue item and `80128431` is the next candidate baseline.

Product behavior now carried by the integration branch:

- The DearMe work stream can show `team_update` cards from DearMe-origin agent
  comments.
- Shared work stream schema now requires explicit product-facing item kinds:
  `decision`, `prepared_work`, `team_update`, or `progress`.
- The UI presents the stream as a customer-facing team work stream while the
  issue/comment/work-product substrate remains backstage.

Verification:

- In `/tmp/dearme-dm-002-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded after the disposable
  worktree initially lacked `node_modules`. It reused the lockfile cache and
  emitted the existing `paperclip-plugin-dev-server` bin warning from the local
  plugin SDK build artifact state.
- In `/tmp/dearme-dm-002-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 28 tests.
- In `/tmp/dearme-dm-002-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/api/dearme.test.ts --run`
  passed, 28 tests. The server tests emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-002-integrate`, `pnpm -r typecheck` passed.
- In `/tmp/dearme-dm-002-integrate`, `git diff --check` passed across the 9
  integrated files.
- A targeted forbidden-copy scan over touched runtime/test paths showed
  substrate terms only in fixtures and negative assertions, not in the changed
  runtime service/UI path.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Completed next integration step:

- Treat `80128431` as the next candidate baseline for DM-003.
- Replay DM-003 onto `80128431` in a new clean disposable worktree; do not merge
  directly into the dirty `/Users/peter/dearme` checkout.
- Keep watching `team_update` content because agent comments are now projected
  into customer-visible cards.
- Completed below as DM-003 integration commit `c5b11039`.

## DM-003 Clean Integration Commit - 2026-05-08

Fifty-sixth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-003-integrate`
  from integrated DM-002 baseline `80128431`.
- Created integration branch `codex/dearme-dm-003-integrated`.
- Replayed worker commit `876ec6b3` with `git cherry-pick --no-commit`.
- Resolved the only conflict by dropping the worker's older
  `docs/dearme/BUILD-STATE.md` hunk and keeping this file lead-owned.
- Added an extra safety patch so customer-visible Voice & Memory summaries
  redact Paperclip/OpenClaw/provider/adapter/setup/runtime/issue language from
  projected team updates.
- Committed the integrated product-code slice as
  `c5b11039 Show DearMe voice and memory sources from existing work`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-003 is now an
  integrated queue item and `c5b11039` is the next candidate baseline.

Product behavior now carried by the integration branch:

- DearMe can show a Voice & Memory panel sourced from existing Brand OS
  documents, voice samples, proof sources, approval boundaries, team updates,
  and agents.
- The slice reuses the current document/comment/agent substrate; it does not
  introduce a new voice-memory table.
- The customer sees private source cards, counts, owner roles, and freshness
  timestamps without seeing raw issue ids, provider mechanics, setup payloads,
  adapters, or runtime language.
- The DearMe UI refreshes the Voice & Memory view after Brand OS apply, output
  review, and approval decisions so the user can see what the team has learned.

Verification:

- In `/tmp/dearme-dm-003-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-003-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-voice-memory.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 29 tests.
- In `/tmp/dearme-dm-003-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts ui/src/api/dearme.test.ts --run`
  passed, 31 tests.
- In `/tmp/dearme-dm-003-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` passed across the integrated DM-003 file set.
- Targeted forbidden-copy scan showed substrate words only in tests, redaction
  constants, and internal route code that strips `wakeIssue`, not in the changed
  customer UI path.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `c5b11039` as the next candidate baseline for DM-004.
- Replay DM-004 onto `c5b11039` in a new clean disposable worktree; do not merge
  directly into the dirty `/Users/peter/dearme` checkout.
- Keep resolving UI copy toward the locked rule: team visible, machinery
  hidden.

Completed next integration step:

- Treat `c5b11039` as the candidate baseline for DM-004.
- Replayed DM-004 onto `c5b11039` in a new clean disposable worktree.
- Completed below as DM-004 integration commit `484fe995`.

## DM-004 Clean Integration Commit - 2026-05-08

Fifty-seventh DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-004-integrate`
  from integrated DM-003 baseline `c5b11039`.
- Created integration branch `codex/dearme-dm-004-integrated`.
- Replayed worker commit `f402d94e` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk.
- Resolved the route-test overlap while preserving the DM-003 stronger Voice &
  Memory source fixture and source-kind assertion.
- Preserved the DM-003 Voice & Memory redaction service unchanged.
- Committed the integrated product-code slice as
  `484fe995 Keep DearMe paid-beta language on the product surface`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-004 is now an
  integrated queue item and `484fe995` is the next candidate baseline.

Product behavior now carried by the integration branch:

- DearMe customer copy now prefers private work, private drafts, Brand OS,
  Voice Profile, approval boundaries, and team updates.
- The `/dearme` onboarding and private work surfaces no longer show `doc`
  counts, first-cycle `artifact` framing, or raw workspace/document wording.
- Workbench decisions and progress summaries now describe reviewable private
  work instead of private artifacts or Brand OS documents.
- Generated DearMe operation instructions now avoid visible workspace,
  attached-document, issue-comment, and issue-identifier language where the
  customer may later read the work.
- Internal route, schema, database, issue, document, and Paperclip-compatible
  contracts were intentionally preserved.

Verification:

- In `/tmp/dearme-dm-004-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-004-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 14 tests.
- In `/tmp/dearme-dm-004-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 18 tests.
- In `/tmp/dearme-dm-004-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- In `/tmp/dearme-dm-004-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 1 test and confirmed the internal-token redaction assertions still
  hold.
- In `/tmp/dearme-dm-004-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 14
  tests.
- In `/tmp/dearme-dm-004-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-path forbidden-copy scan returned no matches for old visible
  document/artifact/workspace/issue-comment phrases across the touched files.
- Redaction scan matched only the intended Voice & Memory redaction constants
  and negative test fixtures.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `484fe995` as the candidate baseline for DM-005.
- Replayed DM-005 onto `484fe995` in a new clean disposable worktree.
- Completed below as DM-005 integration commit `77e7d403`.

## DM-005 Clean Integration Commit - 2026-05-08

Fifty-eighth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-005-integrate`
  from integrated DM-004 baseline `484fe995`.
- Created integration branch `codex/dearme-dm-005-integrated`.
- Replayed worker commit `acaa7842` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk.
- Committed the integrated product-code slice as
  `77e7d403 Let DearMe learn from private sources without exposing the substrate`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-005 is now an
  integrated queue item and `77e7d403` is the next candidate baseline.

Product behavior now carried by the integration branch:

- DearMe paid-beta users can add private Voice & Memory sources from `/dearme`
  as voice samples, proof sources, or approval boundaries.
- The route is board-gated:
  `/api/dearme/companies/:companyId/voice-memory/sources`.
- The response returns the customer-safe source card and refreshed Voice &
  Memory read-model while intentionally omitting `documentId`.
- Managed sources persist through the existing Brand OS issue document
  substrate with generated source keys, avoiding a new Voice & Memory table.
- The Voice & Memory UI adds a compact source-intake form and refreshes the
  panel after each successful save.

Integration hardening:

- Managed-source key classification now requires exact generated key patterns
  such as `voice-sample-<8hex>` so legacy prefix collisions do not leak into the
  customer read-model.
- Shared validation rejects whitespace-only source bodies.
- The Voice & Memory service test asserts legacy-prefix documents are ignored
  by customer Voice & Memory JSON.

Verification:

- In `/tmp/dearme-dm-005-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-005-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-005-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 21 tests.
- In `/tmp/dearme-dm-005-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- In `/tmp/dearme-dm-005-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 25 tests.
- In `/tmp/dearme-dm-005-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-copy forbidden-term scan returned no matches for stale private
  draft/document/workspace/issue language in the targeted product surface.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `77e7d403` as the candidate baseline for DM-006.
- Replayed DM-006 onto `77e7d403` in a new clean disposable worktree.
- Completed below as DM-006 integration commit `44b7bfd6`.

## DM-006 Clean Integration Commit - 2026-05-08

Fifty-ninth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-006-integrate`
  from integrated DM-005 baseline `77e7d403`.
- Created integration branch `codex/dearme-dm-006-integrated`.
- Replayed worker commit `cc358376` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk.
- Committed the integrated product-code slice as
  `44b7bfd6 Make output review feel like a DearMe decision desk`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-006 is now an
  integrated queue item and `44b7bfd6` is the next candidate baseline.

Product behavior now carried by the integration branch:

- DearMe outputs now include a strict `reviewContext` with draft preview, Voice
  Gate, Voice & Memory context, approval boundary, and review prompt.
- The focused output panel now feels like a DearMe decision desk instead of a
  raw output card.
- The review context is derived from existing output details, prepared work,
  private source documents, and team updates; no new review table, route family,
  or dependency was added.
- Customer-facing review UI keeps issue, document, work-product, provider,
  adapter, model, route, and runtime mechanics backstage.

Verification:

- In `/tmp/dearme-dm-006-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 21 tests.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts --run` passed, 10 tests.
- In `/tmp/dearme-dm-006-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- In `/tmp/dearme-dm-006-integrate`, `pnpm -r typecheck` passed.
- `git diff --check` and `git diff --cached --check` passed.
- Customer-copy forbidden-term scan returned matches only in negative test
  assertions, not in touched production DearMe surfaces.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Next integration step:

- Treat `44b7bfd6` as the next candidate baseline for DM-007.
- Replay DM-007 onto `44b7bfd6` in a new clean disposable worktree; do not merge
  directly into the dirty `/Users/peter/dearme` checkout.
- Keep the same rule: make the team and product outputs visible while keeping
  machinery, provider, adapter, workspace, issue, document, and approval-route
  mechanics backstage.

## DM-007 Clean Integration Commit - 2026-05-08

Sixtieth DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-007-integrate`
  from integrated DM-006 baseline `44b7bfd6`.
- Created integration branch `codex/dearme-dm-007-integrated`.
- Replayed worker commit `d1bf8431` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk.
- Committed the integrated product-code slice as
  `3d419f55 Make review decisions feed DearMe memory`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-007 is now an
  integrated queue item and `3d419f55` is the next candidate baseline.

Product behavior now carried by the integration branch:

- Customer review outcomes feed the Workbench work stream and Voice & Memory as
  customer-safe learning updates.
- The slice reuses existing issue comments and DearMe read models; no new
  table, route family, migration, or dependency was added.
- Only explicit `DearMe decision:` comments with known DearMe phrases are
  projected into product memory.
- Ordinary user scratch notes stay hidden.
- Review notes are redacted for substrate, provider, runtime, setup, route, and
  issue identifiers before they reach customer-facing Workbench or Voice &
  Memory surfaces.

Integration hardening:

- `server/src/services/dearme-review-feedback.ts` only parses the first line
  beginning with exact `DearMe decision:`.
- Accepted phrases are constrained to approved, requested-changes, regenerate,
  and not-useful review outcomes.
- Internal-note redaction covers Paperclip, OpenClaw, Codex/codex-local, MCP,
  model provider, provider, adapter, setup payload/blueprint, runtime,
  heartbeat, wakeup, issue/approval ids, route-like issue/approval paths, ticket
  ids, and UUIDs.
- Workbench and Voice & Memory regressions assert these internal terms do not
  appear in customer JSON when embedded in a review note.

Verification:

- In `/tmp/dearme-dm-007-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-007-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 3 tests.
- In `/tmp/dearme-dm-007-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- In `/tmp/dearme-dm-007-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests.
- In `/tmp/dearme-dm-007-integrate`, `pnpm -r typecheck` passed.
- `git diff --cached --check && git diff --check` passed.
- Customer-copy forbidden substrate scan returned no matches in staged
  Workbench and Voice & Memory service additions.
- Verifier subagent returned PASS.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- Review-note redaction is heuristic; new internal labels or ID formats need to
  be added as they appear.
- Workbench items still carry existing response fields such as `issueId` and
  `relatedOutputId`. If these are considered customer-visible forbidden IDs,
  that is a broader API contract cleanup, not a DM-007 regression.

Next integration step:

- Treat `3d419f55` as the next candidate baseline for DM-008.
- Replay DM-008 onto `3d419f55` in a clean disposable worktree.
- Continue using Polsia for visible iteration choreography, Lindy for
  action-card/revision grammar, and the Naive/Paperclip substrate for hidden
  persistence and wakeups.

## DM-008 Clean Integration Commit - 2026-05-08

Sixty-first DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-008-integrate`
  from integrated DM-007 baseline `3d419f55`.
- Created integration branch `codex/dearme-dm-008-integrated`.
- Replayed worker commit `9b1d1f3f` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk.
- Resolved `server/src/services/dearme-review-feedback.ts` toward the DearMe
  product boundary: reuse DM-007's decision parsing and strengthen redaction
  before generating the new regeneration brief.
- Committed the integrated product-code slice as
  `b58827c2 Carry review feedback into DearMe regeneration briefs`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-008 is now an
  integrated queue item and `b58827c2` is the next candidate baseline.

Product behavior now carried by the integration branch:

- Customer requests for changes, regeneration, or not-useful decisions now
  become a compact DearMe regeneration brief for the next private assignment.
- Approved work does not create a regeneration brief.
- The brief is synthesized from the existing DearMe decision comment, latest
  issue document, and latest prepared work summary.
- The slice reuses existing issue comments, issue documents, prepared work
  summaries, and heartbeat assignment markdown; no new table, route family,
  migration, UI surface, or dependency was added.

Integration hardening:

- Regeneration briefs redact substrate, provider, model, runtime, setup,
  route, ticket, issue, approval, and UUID-shaped details from user notes and
  previous draft context.
- The new regression test embeds provider/model/setup/runtime/wakeup/route
  identifiers in both user feedback and previous draft context, then asserts
  the resulting brief contains only a private-detail placeholder.
- Raw review comment bodies are not passed through as worker assignment text;
  the brief is rebuilt from DearMe-owned phrases and sanitized context.
- The only forbidden-substrate scan match in staged production additions was
  the intended `MCP` redaction pattern.

Verification:

- In `/tmp/dearme-dm-008-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-008-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- In `/tmp/dearme-dm-008-integrate`,
  `pnpm exec vitest server/src/__tests__/heartbeat-comment-wake-batching.test.ts --run`
  passed, 9 tests.
- In `/tmp/dearme-dm-008-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 4 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-008-integrate`, `pnpm -r typecheck` passed.
- `git diff --cached --check && git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- Regeneration-brief redaction is heuristic; new internal labels or ID formats
  need to be added as they appear.
- The worker assignment markdown still uses the inherited internal
  `Paperclip task context` wrapper for the hidden kernel. That is not a
  customer-facing surface, but it remains a future substrate-cleanup target if
  the worker protocol itself is rebranded.

Next integration step:

- Treat `b58827c2` as the next candidate baseline for DM-009.
- Replay DM-009 onto `b58827c2` in a clean disposable worktree.
- Continue using Polsia for visible iteration choreography, Lindy for
  action-card/result traces, and the Naive/Paperclip substrate for hidden
  persistence, prepared work, and wakeups.

## DM-009 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-009-integrate`
  from integrated DM-008 baseline `b58827c2`.
- Created integration branch `codex/dearme-dm-009-integrated`.
- Replayed worker commit `aeac3696` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Committed the integrated product-code slice as
  `52190ed3 Show applied feedback in DearMe review decisions`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-009 is now an
  integrated queue item and `52190ed3` is the next candidate baseline.

Product behavior now carried by the integration branch:

- The DearMe decision desk can show a `Feedback applied` trace after refreshed
  private work lands in response to a customer's previous review decision.
- The trace summarizes what the user asked for, what changed, and that the
  draft remains private until approval.
- The path reuses existing DearMe decision comments, private documents, latest
  work updates, and output handoff projections; no new table, route family,
  migration, workflow, or dependency was added.
- The UI renders the trace in the focused output panel so the review loop feels
  visible and product-native instead of like raw task/comment history.

Integration hardening:

- `server/src/services/dearme-review-feedback.ts` now exports a shared
  private-detail redaction helper so output handoff traces and regeneration
  briefs use the same substrate-hiding vocabulary.
- Feedback traces redact substrate, provider, model, runtime, setup, route,
  ticket, issue, approval, and UUID-shaped details before they reach customer
  JSON.
- The new regression embeds Paperclip, OpenClaw, MCP, model/provider,
  setup-payload, codex-local, issue/approval routes, wakeup, and agent-wakeup
  terms in review feedback, then asserts the final `feedbackTrace` contains
  only customer-safe product language.

Verification:

- In `/tmp/dearme-dm-009-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-009-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-009-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-009-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 5 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-009-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- In `/tmp/dearme-dm-009-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 1 test.
- In `/tmp/dearme-dm-009-integrate`, `pnpm -r typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`, so
  the clean integration commit did not absorb the worker's state-file hunk.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- Feedback-trace redaction is still heuristic; new internal labels or ID
  formats need to be added as they appear.
- DM-010 remains a dirty handoff branch. It must be inspected and normalized
  before any approval-ready handoff behavior is integrated.

Next integration step:

- Treat `52190ed3` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-010-approval-ready-handoff` and turn its
  uncommitted edits into a clean, bounded patch or commit before replaying it.
- Continue using Polsia for decision ceremony, Lindy for approval/action-card
  grammar, and the Naive/Paperclip approval substrate for hidden persistence.

## DM-010 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Normalized `/private/tmp/dearme-dm-010-approval-ready-handoff` from a dirty
  handoff into committed worker patch `47b2c581`.
- Created clean disposable integration worktree `/tmp/dearme-dm-010-integrate`
  from integrated DM-009 baseline `52190ed3`.
- Created integration branch `codex/dearme-dm-010-integrated`.
- Replayed worker commit `47b2c581` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Committed the integrated product-code slice as
  `73224495 Make approved DearMe outputs wait for final approval`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-010 is now an
  integrated queue item and `73224495` is the next candidate baseline.

Product behavior now carried by the integration branch:

- When a customer marks a private DearMe output as useful, DearMe creates an
  idempotent `dearme_output_next_move` approval for the downstream move.
- The downstream move is projected as an explicit final gate before publish,
  send, deploy, or spend/start-next-cycle behavior.
- The Workbench shows that pending next move as the focused final decision and
  suppresses the duplicate private-output review decision while final approval
  is pending.
- The UI labels the decision `Ready for final approval` with `Give final
  approval`, so the customer sees a clear ceremony instead of raw approval
  mechanics.

Integration hardening:

- The slice reuses existing approvals, issue-approval links, output handoff
  review state, Work Ready projection, batch grouping, and approval payload
  rendering.
- No new table, migration, route family, dependency, connector, or real
  publishing/sending/deploying/spending path was added.
- DM-009's `feedbackTrace` and shared private-detail redaction path stayed
  intact after the replay.
- A staged leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/provider/
  adapter/runtime/setup route-language matches in the changed runtime
  service/UI paths.

Verification:

- In `/tmp/dearme-dm-010-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 16
  tests.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-output-handoff.test.ts --run`
  passed, 5 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-workbench.test.ts --run`
  passed, 2 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 4 tests.
- In `/tmp/dearme-dm-010-integrate`,
  `pnpm exec vitest ui/src/components/ApprovalPayload.test.tsx --run` passed,
  3 tests.
- In `/tmp/dearme-dm-010-integrate`, `pnpm -r typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`, so
  the clean integration commit did not absorb the worker's state-file hunk.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- Next-move approvals currently prepare the final decision boundary; they do
  not execute real publishing, email sending, deployment, or spend automation.
- `dearme_output_next_move` remains an internal approval type and must continue
  to be rendered through DearMe-native labels before reaching customer UI.

Next integration step:

- Treat `73224495` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-011-execution-receipt` before replaying
  anything.
- Keep real external execution out of scope until its adapter and approval
  boundary are separately reviewed.

## DM-011 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-011-integrate`
  from integrated DM-010 baseline `73224495`.
- Created integration branch `codex/dearme-dm-011-integrated`.
- Replayed worker commit `3194402b` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Committed the integrated product-code slice as
  `b04a2c1d Keep DearMe final approvals visible`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-011 is now an
  integrated queue item and `b04a2c1d` is the next candidate baseline.

Product behavior now carried by the integration branch:

- After a customer gives final approval on a DearMe next move, DearMe records a
  customer-safe execution receipt through the existing approval route.
- The receipt logs `dearme.next_move_approved` activity and a DearMe-native
  issue comment.
- The receipt states that external execution is `not_run_yet`, so the customer
  can see what was approved without implying that publishing, sending,
  deployment, or spend already happened.
- The Workbench projects the receipt as `next_move_approved` progress and a
  work-stream item.
- Approved next-move outputs no longer reappear as duplicate private-output
  review decisions after final approval.
- No real publish, send, deploy, or spend path was added.

Integration hardening:

- `server/src/services/dearme-output-handoff.ts` now imports the shared
  `DEARME_NEXT_MOVE_APPROVAL_TYPE` constant from the receipt helper instead of
  carrying a duplicate private constant.
- Receipt comments prefer linked issue ids over a possibly stale issue id
  embedded in the approval payload.
- The slice reuses existing approval, activity, issue comment, approval-link,
  output handoff, and Workbench projection surfaces.
- No new table, migration, route family, dependency, connector, or real
  external execution path was added.
- A staged leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/provider/
  adapter/runtime/setup route-language matches in the changed runtime
  service/UI paths.

Verification:

- In `/tmp/dearme-dm-011-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm exec vitest server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 21 tests. The Workbench and output-handoff tests emitted existing
  Postgres truncate cascade `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 16
  tests.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-011-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`, so
  the clean integration commit did not absorb the worker's state-file hunk.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- This receipt records final approval and blocks duplicate decisions, but it
  does not execute real external actions.
- Workbench suppression is bounded by the latest approval and activity query
  windows; revisit if old approved outputs reappear in long-running accounts.
- `dearme_output_next_move` must continue to render through DearMe-native
  labels before reaching customer UI.

Next integration step:

- Treat `b04a2c1d` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-012-private-execution-handoff` before
  replaying anything.
- Keep real external execution out of scope until adapter and trust boundaries
  are separately reviewed.

## DM-012 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-012-integrate`
  from integrated DM-011 baseline `b04a2c1d`.
- Created integration branch `codex/dearme-dm-012-integrated`.
- Replayed worker commit `17f75810` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Resolved `server/src/services/dearme-approval-receipts.ts` by preserving the
  DM-011 linked-issue-id hardening while adding the private handoff behavior.
- Dropped a duplicate output-handoff import-order hunk because DM-011 already
  centralized the approval type import.
- Committed the integrated product-code slice as
  `b6bfffb4 Show private DearMe execution handoffs`.
- Full integration commit:
  `b6bfffb45c558c852d27ce3b5f85d4801e0a7027`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-012 is now an
  integrated queue item and `b6bfffb4` is the next candidate baseline.

Product behavior now carried by the integration branch:

- After a customer gives final approval on a DearMe next move, DearMe now also
  records a private execution handoff.
- The approval route logs `dearme.private_execution_handoff_prepared` activity
  and writes a DearMe-native issue comment.
- The Workbench projects that activity as `execution_handoff_prepared`
  progress and a work-stream item.
- The private handoff has `needsApproval: false`; it is an internal/team
  readiness receipt, not a second customer gate.
- No real publish, send, deploy, or spend path was added.

Integration hardening:

- The slice reuses existing approvals, activity logs, issue comments,
  Workbench projection, and DearMe receipt surfaces.
- No new table, migration, route family, dependency, connector, or real
  external execution path was added.
- The linked issue id preference from DM-011 stayed intact.
- A staged leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/provider/
  adapter/runtime/setup route-language matches in the changed runtime paths.

Verification:

- In `/tmp/dearme-dm-012-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm exec vitest server/src/__tests__/approval-routes-idempotency.test.ts server/src/__tests__/dearme-workbench.test.ts server/src/__tests__/dearme-output-handoff.test.ts server/src/__tests__/dearme-regeneration-brief.test.ts --run`
  passed, 21 tests. The Workbench and output-handoff tests emitted existing
  Postgres truncate cascade `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-012-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`, so
  the clean integration commit did not absorb the worker's state-file hunk.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- This handoff makes private execution readiness visible, but it still does not
  execute real external actions.
- Handoff copy is currently risk-gate based; new risk gates need mapped
  DearMe-native copy.
- Workbench projection depends on recent activity query windows.

Next integration step:

- Treat `b6bfffb4` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-013-handoff-brief-surface` before replaying
  anything.
- Keep real external execution out of scope until adapter and trust boundaries
  are separately reviewed.

## DM-013 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-013-integrate`
  from integrated DM-012 baseline `b6bfffb4`.
- Created integration branch `codex/dearme-dm-013-integrated`.
- Replayed worker commit `2673975d` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Committed the integrated product-code slice as
  `39480533 Surface private handoff readiness in DearMe`.
- Full integration commit:
  `39480533a8a26db86858cc053edd0ec8f77ff04c`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-013 is now an
  integrated queue item and `39480533` is the next candidate baseline.

Product behavior now carried by the integration branch:

- Workbench progress can now carry `private_handoff_ready` readiness and a
  customer-safe next step for private execution handoffs.
- DearMe renders a compact private handoff panel when recent progress includes
  a ready execution handoff.
- The panel shows what is ready, the handoff summary, the next step, the
  artifact type, and an `External action not run` badge.
- The panel opens the existing DearMe decision/brief view instead of adding a
  new route or operator surface.
- No real publish, send, deploy, or spend path was added.

Integration hardening:

- The slice reuses the DM-012 private handoff activity and existing Workbench
  projection.
- No new table, migration, route family, dependency, connector, or real
  external execution path was added.
- A staged runtime leak scan found no added Paperclip/OpenClaw/OK Partner/MCP/
  provider/adapter/runtime/setup route-language matches in changed runtime
  paths.

Verification:

- In `/tmp/dearme-dm-013-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts server/src/__tests__/dearme-workbench.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 35 tests.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-013-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser smoke.

Known residual risks:

- `nextStep` must remain customer-safe at its source before display in the
  Workbench panel.
- The phrase "execution handoff" is still more mechanical than launch-quality
  DearMe product language and should be polished before paid-beta release.
- This slice surfaces readiness; it still does not execute real external
  actions.

Next integration step:

- Treat `39480533` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-014-mobile-nav-safe-area` before replaying
  anything.
- DM-016 has since diverged from DM-015 and must be inspected as its own queue
  item after DM-015.

## DM-014 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-014-integrate`
  from integrated DM-013 baseline `39480533`.
- Created integration branch `codex/dearme-dm-014-integrated`.
- Replayed worker commit `65d7a599` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Committed the integrated product-code slice as
  `75458d80 Keep DearMe mobile work unobstructed`.
- Full integration commit:
  `75458d807fc7ff3e35a51a860b1d8d6171e814b9`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-014 is now an
  integrated queue item and `75458d80` is the next candidate baseline.

Product behavior now carried by the integration branch:

- `/dearme` mobile routes no longer render the inherited fixed mobile bottom
  navigation that can cross through customer review work.
- Standard non-DearMe mobile company routes still render the existing mobile
  bottom navigation.
- DearMe mobile content now reserves only the smaller safe-area bottom padding.
- Stale prepared outputs without `reviewContext` still render as private work
  needing review through a conservative customer-safe fallback.

Integration hardening:

- The slice stays inside the existing Layout shell and DearMe output review
  surface.
- No new route, table, backend path, dependency, connector, or real external
  execution path was added.
- A staged runtime UI leak scan found no added Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/runtime/setup route-language matches in changed
  runtime UI paths.

Verification:

- In `/tmp/dearme-dm-014-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm exec vitest ui/src/components/Layout.test.tsx --run` passed, 8 tests.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 18
  tests.
- In `/tmp/dearme-dm-014-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" .` returned no conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md | wc -l` returned `0`.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Known residual risks:

- This is unit/typecheck verified but not browser screenshot verified in the
  clean worktree.
- The route detector keys off the final path segment `dearme`; keep this simple
  unless route structure changes.
- Stale output fallback copy is intentionally conservative and should stay
  private/review-first.

Next integration step:

- Treat `75458d80` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-015-first-week-output-details` before
  replaying anything.
- DM-016 has since diverged from DM-015 and must be inspected as its own queue
  item after DM-015.

## DM-015 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-015-integrate`
  from integrated DM-014 baseline `75458d80`.
- Created integration branch `codex/dearme-dm-015-integrated`.
- Replayed worker commit `f9267e58` with `git cherry-pick --no-commit`.
- Resolved the `docs/dearme/BUILD-STATE.md` conflict by keeping this file
  lead-owned and dropping the worker's older state hunk from the clean commit.
- Excluded the worker's architecture-plan and Symphony-plan hunks from the clean
  commit so lead-owned planning docs remain coherent.
- Committed the integrated product-code slice as
  `5a09b4d3 Make first-week DearMe outputs scannable`.
- Full integration commit:
  `5a09b4d34612bc69aa950c4ad97b4ff9c4e1194c`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-015 is now an
  integrated queue item and `5a09b4d3` is the next candidate baseline.

Product behavior now carried by the integration branch:

- First-week Work Ready cards now show value-specific details before the user
  opens focused review.
- Content drafts surface channel, audience, hook, draft body, proof used, and
  approval gate.
- Opportunity drafts surface target, why relevant, relevance score, outreach
  angle, draft message, and approval gate.
- Portfolio updates surface page/section, proof source, proposed copy, and
  deploy gate.
- Weekly reports surface completed work, decisions needed, next bets, and report
  reference.
- Focused review uses the same detail ordering as the cards.

Integration hardening:

- The slice stays inside the existing DearMe output detail contract and Work
  Ready card surface.
- No backend route, table, migration, connector, dependency, scraper, external
  fetch, or real external execution path was added.
- A staged runtime UI leak scan found no added Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/runtime/setup route-language matches in changed
  runtime UI paths.

Verification:

- In `/tmp/dearme-dm-015-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-015-integrate`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 19
  tests.
- In `/tmp/dearme-dm-015-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" doc ui packages server docs` returned no
  conflict markers.
- `git diff --cached --check && git diff --check` passed.
- `git diff --cached -- docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
  returned no staged lead-owned doc hunks.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Known residual risks:

- This is unit/typecheck verified but not browser screenshot verified in the
  clean worktree.
- The detail list is capped at six fields; future output kinds need deliberate
  priority ordering.
- Upstream output generators still need to provide useful detail payloads.

Next integration step:

- Treat `5a09b4d3` as the next candidate baseline.
- Inspect `/private/tmp/dearme-dm-016-voice-memory-reference-links`; it now has
  distinct head `ae4fef73` and should not be skipped.

## DM-016 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-016-integrate`
  from integrated DM-015 baseline `5a09b4d3`.
- Created integration branch `codex/dearme-dm-016-integrated`.
- Replayed worker commit `ae4fef73` with `git cherry-pick --no-commit`.
- Resolved conflicts in `docs/dearme/BUILD-STATE.md`,
  `doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md`, and
  `doc/plans/2026-05-08-dearme-symphony-operating-loop.md` by keeping those
  documents lead-owned and dropping the worker's older state hunks from the
  clean commit.
- Committed the integrated product-code slice as
  `16fa8fb8 Keep DearMe source references private and traceable`.
- Full integration commit:
  `16fa8fb804baae650f76da19792279761a4e8e7c`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-016 is now an
  integrated queue item and `16fa8fb8` is the next candidate baseline.

Product behavior now carried by the integration branch:

- Voice & Memory source entries can carry an optional private `referenceUrl`.
- The shared DearMe contract accepts trimmed `http://` and `https://` reference
  links, treats an empty input as absent, and rejects non-HTTP schemes.
- The server stores the reference link in the existing managed-source document,
  projects it back to the source response, and removes the literal reference
  metadata line from the summary body.
- The `/dearme` Voice & Memory source form now submits the reference link, and
  source cards render it as a private `Reference` link.

Integration hardening:

- The slice stays inside existing shared validators, DearMe voice-memory
  document storage, route projection, UI API payload, and `/dearme` UI.
- No table, migration, dependency, connector, background worker, uploader,
  scraper, external fetch, public publishing path, or real external action was
  added.
- Staged diff leak scan found no added user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/runtime/setup route-language matches. A broader
  source scan only matched existing sanitizer patterns that intentionally filter
  those terms.

Verification:

- In `/tmp/dearme-dm-016-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 29 tests.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 24 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-016-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --cached --check` and `git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" doc ui packages server docs` returned no
  conflict markers.
- `git diff --cached -- docs/dearme/BUILD-STATE.md doc/plans/2026-05-08-dearme-architecture-first-reuse-execution-plan.md doc/plans/2026-05-08-dearme-symphony-operating-loop.md`
  returned no staged lead-owned doc hunks.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Known residual risks:

- Reference links are private provenance only. They must not become fetch,
  summarize, publish, or external-action inputs without a separate
  trust-boundary review.
- Historical note: `/private/tmp/dearme-dm-017-voice-memory-source-editing`
  shared DM-016's source head (`ae4fef73`), but later proved to contain a
  12-file dirty worker diff. See `DM-017 Clean Integration Commit - 2026-05-08`.

## DM-017 Clean Integration Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-017-integrate`
  from integrated DM-016 baseline `16fa8fb8`.
- Created integration branch `codex/dearme-dm-017-integrated`.
- Inspected `/private/tmp/dearme-dm-017-voice-memory-source-editing` and found
  source head `ae4fef73` with a 12-file dirty implementation diff rather than a
  distinct source commit.
- Applied that dirty diff to the clean integration worktree with
  `git apply --index`.
- Committed the integrated product-code slice as
  `feaaa66a Let DearMe users revise private voice memory sources`.
- Full integration commit:
  `feaaa66a391520dbb96b5cd9ac116b3c15480485`.
- Updated `doc/plans/2026-05-08-dearme-dm-merge-queue.md` so DM-017 became an
  integrated queue item. This initial `feaaa66a` candidate baseline was later
  superseded by the `20290812` hardening commit recorded below.

Product behavior now carried by the integration branch:

- Editable managed Voice & Memory sources expose their private body for review
  and correction in the `/dearme` surface.
- The Voice & Memory source form now supports add, edit, save changes, and
  cancel states while keeping the interaction inside DearMe product language.
- The API client can update a source through the shared DearMe request/result
  contract.
- The server updates managed private sources through the existing
  document-revision path, logs `dearme.voice_memory_source_updated`, and
  returns the refreshed source list.

Integration hardening:

- The slice reuses existing shared validators, the company-scoped DearMe route,
  document-backed Voice & Memory storage, the UI API client, and the `/dearme`
  source-management panel.
- No migration, table, dependency, upload system, scraper, external fetch,
  connector, public publishing path, or real external action was added.
- Staged diff leak checks found no added user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/setup route-language matches. A broader runtime
  scan only matched existing sanitizer patterns that intentionally filter those
  words.

Verification:

- In `/tmp/dearme-dm-017-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 31 tests.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed, 26 tests. The command emitted existing Postgres truncate cascade
  `NOTICE` logs and exited 0.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --cached --check` and `git diff --check` passed.
- `rg -n "^<<<<<<<|^=======|^>>>>>>>" packages server ui` returned no conflict
  markers.
- `git diff --cached -- package.json pnpm-lock.yaml '**/package.json'`
  returned no dependency changes.

Not run:

- Full `pnpm test:run`.
- Full `pnpm build`.
- Browser mobile smoke.

Known residual risks:

- Source edits are audited through document revisions, but the UI only exposes
  the current editable body. Add explicit revision history only if design
  partners need it.
- Source edits remain private memory maintenance. Do not wire edited source
  bodies to public publishing or external actions without a separate
  approval-boundary review.

## DM-017 Approval Apply Hardening Commit - 2026-05-08

Sixty-second DearMe slice:

- Continued in clean disposable integration worktree
  `/tmp/dearme-dm-017-integrate`.
- Kept branch `codex/dearme-dm-017-integrated`.
- Found a real post-DM017 product bug: approving a DearMe Brand OS apply
  request marked the approval approved but did not invoke the existing Brand OS
  apply service, so the private team, cycles, draft lanes, issues, and
  documents were not created from that approval path.
- Committed the hardening slice as
  `20290812 Apply DearMe Brand OS approvals through the gate`.
- `20290812` is now the current clean candidate baseline for the next DearMe
  integration slice.

Product behavior now carried by the integration branch:

- `approvalService.approve()` centrally invokes the existing DearMe Brand OS
  apply service when a `dearme_brand_blueprint_apply` approval is actually
  applied, so route callers and direct service callers share the same gate.
- Generated first-operation briefs now explicitly tell the team to update the
  attached `dear-me-report` document as the durable report surface, not only a
  standalone workspace file.
- DearMe operation briefs now explicitly forbid modifying repository source,
  app configuration, or local runtime files during customer brand work.
- CLI Tailnet fallback tests are isolated from host-installed `tailscale`
  binaries so local developer networking does not make the fallback assertions
  flaky.

Verification:

- In `/tmp/dearme-dm-017-integrate`,
  `pnpm exec vitest cli/src/__tests__/network-bind.test.ts cli/src/__tests__/onboard.test.ts server/src/__tests__/dearme-brand-blueprint-apply.test.ts --run`
  passed, 3 files and 13 tests.
- In `/tmp/dearme-dm-017-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-017-integrate`, full `pnpm test:run` passed. The run
  reached the final serialized server shard and exited 0.
- `git diff --check` and `git diff --cached --check` passed.
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" cli/src/__tests__ server/src/services`
  returned no conflict markers.
- `git diff -- package.json pnpm-lock.yaml` returned no dependency changes.

Not run:

- Browser visual pass for DearMe UI after this backend/test hardening commit.

## DM-018 Voice & Memory Source Archive Commit - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable integration worktree `/tmp/dearme-dm-018-integrate`
  from hardened DM-017 baseline `20290812`.
- Created integration branch `codex/dearme-dm-018-integrated`.
- Inspected `/private/tmp/dearme-dm-018-voice-memory-source-archive` and found
  source head `c151fe69` with a 12-file dirty implementation/test diff.
- Applied that dirty diff to the clean integration worktree with
  `git apply --index`.
- Committed the integrated product-code slice as
  `94c3b4c6 Archive stale DearMe Voice & Memory sources without deleting history`.
- `94c3b4c6` became the clean candidate baseline for the follow-up DM-019
  polish slice.

Product behavior now carried by the integration branch:

- Paid-beta users can archive editable managed private Voice & Memory sources
  from `/dearme`.
- Archiving writes a hidden document revision with `Status: archived` instead
  of hard-deleting source history.
- Archived sources disappear from the active Voice & Memory projection, source
  counts, and the customer source card list.
- The archive API response returns only `archivedSourceId` plus the refreshed
  Voice & Memory projection, keeping internal document ids and bodies out of
  the customer response.
- The UI adds an archive affordance and confirmation copy before removing a
  source from active memory.

Integration hardening:

- The slice reuses existing shared DearMe validators, company-scoped DearMe
  route, document-backed Voice & Memory storage, UI API client, and the
  `/dearme` source-management panel.
- No migration, table, dependency, upload system, scraper, external fetch,
  connector, public publishing path, or real external action was added.
- The archive path remains private memory maintenance. It does not publish,
  send, deploy, spend, or alter any external channel.
- Added-line leak checks found no new user-facing Paperclip/OpenClaw/OK
  Partner/MCP/provider/adapter/setup route-language matches.

Verification:

- In `/tmp/dearme-dm-018-integrate`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest packages/shared/src/validators/dearme.test.ts --run`
  passed, 15 tests.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest ui/src/api/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run`
  passed, 33 tests.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run`
  passed after a targeted rerun of the Voice & Memory suite cleared a transient
  embedded Postgres setup failure.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm exec vitest server/src/__tests__/dearme-voice-memory.test.ts --run`
  passed, 5 tests.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm --filter @paperclipai/shared typecheck` passed.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm --filter @paperclipai/server typecheck` passed.
- In `/tmp/dearme-dm-018-integrate`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- In `/tmp/dearme-dm-018-integrate`, full `pnpm test:run` passed. The run
  reached the final serialized server shard and exited 0.
- `git diff --check` and `git diff --cached --check` passed.
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" packages/shared/src/validators server/src ui/src`
  returned no conflict markers.
- `git diff --cached -- package.json pnpm-lock.yaml '**/package.json'`
  returned no dependency changes.

Not run:

- Browser visual pass for the archive confirmation UI.

Known residual risks:

- The original archive affordance used browser `confirm()`. This was resolved
  in the follow-up DM-019 polish slice.
- Archived sources are hidden from active projection. A separate recovery UI
  should be designed before exposing archived source history to customers.

## DM-019 Voice & Memory Archive Confirmation Dialog - 2026-05-08

Sixty-second DearMe slice:

- Created clean disposable worktree
  `/tmp/dearme-dm-019-archive-confirm-dialog` from DM-018 baseline
  `94c3b4c6`.
- Created branch `codex/dearme-dm-019-archive-confirm-dialog`.
- Replaced the customer-facing browser `confirm()` archive ceremony with the
  shared DearMe/Radix dialog primitives already used by the web app.
- Committed the UI-only polish slice as
  `98fa9796c3e8 Make Voice Memory archiving feel native to DearMe`.
- `98fa9796c3e8` is now the current clean candidate baseline for the next
  DearMe implementation slice.

Product behavior now carried by the branch:

- Paid-beta users archiving a private Voice & Memory source now see a
  DearMe-native confirmation dialog titled `Archive private source?`.
- The dialog explains that DearMe will stop using the source for future drafts
  while keeping it in private history instead of deleting it.
- `Keep source` closes the dialog and leaves the source active.
- `Archive source` runs the existing document-backed archive mutation and
  removes the source from the active Voice & Memory projection.
- No backend, database, API, dependency, external action, connector, publish,
  send, deploy, or spend path changed.

Verification:

- In `/tmp/dearme-dm-019-archive-confirm-dialog`,
  `pnpm install --frozen-lockfile --offline` succeeded with the existing local
  plugin SDK dev-bin warnings.
- In `/tmp/dearme-dm-019-archive-confirm-dialog`,
  `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run` passed, 21
  tests.
- In `/tmp/dearme-dm-019-archive-confirm-dialog`,
  `pnpm --filter @paperclipai/ui typecheck` passed.
- In `/tmp/dearme-dm-019-archive-confirm-dialog`,
  `pnpm --filter @paperclipai/ui build` passed with existing non-blocking Vite
  chunking warnings.
- Browser verification on `http://127.0.0.1:3101/DEAAAAAAA/dearme` passed:
  the page opened, a temporary `Browser archive source` was added, the
  DearMe-native archive dialog opened, `Keep source` preserved the source,
  `Archive source` removed it from the page, and the Voice & Memory API then
  returned `privateSourceCount: 5` with no `Browser archive source`.
- `git diff --check -- ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  passed.
- `rg -n "window\\.confirm"` on the touched DearMe page/test files returned no
  matches.

Not run:

- Full `pnpm test:run` for this UI-only polish slice.

## DearMe Cycle Guardrails - 2026-05-09

Thirty-first verified DearMe slice:

- Reused the existing Paperclip/Naive finance, cost, and budget substrate for
  DearMe paid-beta cycle guardrails instead of adding a new billing or usage
  system.
- Extended the paid-beta access contract with `cycleGuardrail`, derived from
  paid-beta finance events plus `costService.summary(companyId)`.
- Subtracted current-month private spend from remaining paid-beta credit and exposed
  customer-safe ready, warning, and hard-stop states.
- Added first enforcement at the Brand OS approval request boundary: if
  current-month private spend exhausts credit or reaches the guardrail, private
  work pauses with a DearMe-safe message.
- Updated the DearMe Paid beta panel to show `Cycle guardrail`,
  current-month private spend,
  monthly guardrail, remaining credit, and decision-needed copy without exposing
  model/provider/adapter cost plumbing.

Verification:

- `pnpm exec vitest server/src/__tests__/dearme-paid-beta-access.test.ts packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 3 files, 64 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DearMe Cycle Guardrail Enforcement - 2026-05-09

Thirty-second verified DearMe slice:

- Extended the DM-100 paid-beta guardrail from Brand OS apply requests to output
  review actions that start another private cycle.
- Hardened the newer Chief of Staff composer to use the same private-cycle
  blocker, so Brand OS apply requests, output regeneration/revision, and Chief
  of Staff briefs all share one finance/cost guardrail.
- Reused the existing Naive/Paperclip finance, cost summary, output review,
  activity log, and issue wakeup rails instead of introducing a new DearMe
  usage ledger or workflow gate.
- Preserved the Polsia-style high-automation loop: users can still review work
  and send the team back into motion, but regeneration now respects the same
  monthly private-spend guardrail.
- Preserved the Lindy-style action-needed pattern: `approve` remains available
  for prepared work, while `request_changes`, `regenerate`, and `not_useful`
  are guarded before they wake more private work.
- Added a reusable `describeDearMePrivateCycleBlocker(access)` helper so future
  private-cycle entry points can share the same paid-beta blocker logic.

Verification:

- `pnpm exec vitest server/src/__tests__/dearme-paid-beta-access.test.ts server/src/__tests__/dearme-brand-blueprint-routes.test.ts --run --maxWorkers=1`
  passed: 2 files, 30 tests.
- `pnpm exec vitest packages/shared/src/validators/dearme.test.ts ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 2 files, 30 tests.
- `pnpm --filter @paperclipai/shared typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/ui typecheck` passed.

## DearMe Customer Copy Hygiene - 2026-05-09

Thirty-third verified DearMe slice:

- Continued the Polsia/Naive reuse boundary: keep Polsia's customer-visible
  personal-team choreography, keep the Naive/Paperclip document/output substrate
  inside the implementation, and do not rename internal compatibility fields for
  a copy-only pass.
- Reworded the focused output and private work card reference counts from
  `doc(s)` to `private reference(s)` so paid-beta users see DearMe work language
  instead of implementation shorthand.
- Tightened the Decisions Needed copy from "the user" to "you", and adjusted
  Voice & Memory / Chief of Staff placeholders so the page speaks to the
  customer rather than an operator.
- Updated the DearMe onboarding regression fixture and assertions to keep the
  customer-surface copy contract aligned with the new wording.

Verification:

- `rg -n "doc\\(s\\)|docs prepared|Operator note|operator note|represent the user|Tell Chief of Staff" ui/src/pages/DearMeOnboarding.tsx ui/src/pages/DearMeOnboarding.test.tsx`
  returned no matches.
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 1 file, 16 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.

Not run:

- Full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build`; this was a
  narrow UI copy contract slice with focused regression and UI typecheck
  coverage.

## DM-104 Voice & Memory Source Surface - 2026-05-09

Thirty-fourth verified DearMe slice:

- Continued the Polsia/Naive reuse boundary: Polsia informs the customer-visible
  team choreography, while the inherited memory update contract remains the
  hidden storage path for private source material.
- Added a Lindy-style source guide to the Voice & Memory panel with entry paths
  for writing samples, proof points, source links, corrections, forbidden
  phrases, audience notes, and offer notes.
- Kept the surface compact and workbench-native instead of turning Voice &
  Memory into a settings page.
- Source links are recorded as private source/provenance labels through the
  existing Voice & Memory update path; this slice does not fetch, scrape, upload,
  publish, or execute any external link.
- Added regression coverage proving a guided forbidden-phrase entry records as
  a `constraint` memory update and keeps customer-visible substrate terms off
  the page.

Verification:

- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 1 file, 18 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Playwright fallback smoke on `http://127.0.0.1:3100/DEAA/dearme` passed
  for desktop `1440x1100` and mobile `390x844`: Source guide and all seven
  source paths rendered, the forbidden-phrase interaction selected the
  `constraint` memory type, horizontal overflow was `0`, console/page errors
  were empty, and visible page text did not include Paperclip/OpenClaw/provider/
  adapter/setup-payload language.

Not run:

- Full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build`; this was a
  narrow Voice & Memory source-entry slice over an already-rendered workbench
  shell.

## DM-105 Cycle Controls - 2026-05-09

Thirty-fifth verified DearMe slice:

- Reused Polsia's visible cycle ritual by making the next private growth loop
  selectable from the Chief of Staff composer instead of hiding it behind a
  blank chat box or agent console.
- Reused the existing Naive/Paperclip-backed Chief of Staff message route,
  issue creation, activity log, assignee lookup, and wakeup path. This slice
  adds no server route, database schema, scheduler, worker, or runtime API.
- Reused Lindy-style preset action cards and bounded review-loop framing:
  users pick a prepared private action, DearMe drafts reviewable work, and
  public moves remain approval-gated.
- Added five customer-facing controls: Focus the week, Prepare content batch,
  Scout opportunities, Refresh public proof, and Write weekly letter.
- Kept the UI customer-safe: the controls do not expose Paperclip, OpenClaw,
  provider, adapter, issue queue, or setup-payload language, and they do not
  claim hard pause/resume semantics.

Verification:

- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  passed: 1 file, 19 tests.
- `pnpm --filter @paperclipai/ui typecheck` passed.
- `git diff --check` passed.
- Playwright smoke on `http://127.0.0.1:3100/DEAA/dearme` passed for desktop
  `1440x1100` and mobile `390x844`: cycle controls rendered, horizontal
  overflow was `0`, console/page errors were empty, and the Chief of Staff
  composer did not expose Paperclip/OpenClaw/provider/adapter/setup_payload
  language. Screenshots: `/tmp/dearme-dm105-desktop.png` and
  `/tmp/dearme-dm105-mobile.png`.

Not run:

- Full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build`; this was a
  narrow customer-facing UI slice that reuses the existing private-work route.

## DM-CH-02A OpenClaw Aha Message Tool Registry - 2026-05-11

Thirty-sixth verified DearMe slice:

- Updated the OpenClaw outbound tool registry from 5 tools to 7 by adding
  `send_telegram_message` and `send_imessage` as voice-gated `send` tools.
- Reused the existing approved-next-move handoff, outbound wrapper, and
  `openclaw_gateway` dispatch map instead of adding a parallel
  `dearme-channel-send.ts` service.
- Added `direct-message` as the shared voice-gate artifact kind for
  Telegram/iMessage/other short-message sends.
- Extended `channel_connections` channel ids with `telegram` and `imessage`,
  while keeping the wrapper from requiring OAuth rows for these OpenClaw gateway
  channels until a concrete per-user credential flow exists.
- Updated the stale OpenClaw aha-shot architecture doc to reflect the shipped
  launch handoff -> wrapper -> OpenClaw gateway path.

Verification:

- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 1 file, 19 tests.
- `pnpm --filter @paperclipai/dearme-ai-proxy test` passed: 1 file, 10 tests.
- `pnpm exec vitest run server/src/services/dearme-outbound-tool-wrapper.test.ts server/src/services/dearme-openclaw-gateway-dispatch.test.ts server/src/services/dearme-approved-launch-handoff.test.ts --maxWorkers=1` passed: 3 files, 30 tests.
- `pnpm --filter @paperclipai/dearme-openclaw typecheck` passed.
- `pnpm --filter @paperclipai/dearme-ai-proxy typecheck` passed.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `pnpm --filter @paperclipai/db typecheck` passed.

## DM-CH-02B OpenClaw Message Provider Smoke - 2026-05-11

Thirty-seventh verified DearMe slice:

- Extended `pnpm dearme:provider-smoke` from site/LinkedIn/Meta proof to the
  two OpenClaw gateway message paths: `telegram_message` and
  `imessage_message`.
- Reused `createDearMeOpenClawGatewayDispatchMap` plus the existing
  `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` /
  `OPENCLAW_WEBHOOK_AUTH` config resolver instead of adding a parallel send
  service.
- Kept Telegram/iMessage live sends behind the same explicit live guard:
  `--live` plus `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1`.
- Updated the current DearMe architecture docs so the North Star index,
  tri-substrate contract, product architecture, and OpenClaw integration note
  all describe the shipped 7-tool outbound surface.

Verification:

- `pnpm test:dearme-provider-smoke` passed: 18 node:test tests.
- `pnpm --filter @paperclipai/dearme-openclaw test` passed: 1 file, 19
  tests.
- `pnpm --filter @paperclipai/dearme-ai-proxy test` passed: 1 file, 10
  tests.
- `pnpm --silent dearme:provider-smoke -- --check` passed and reports
  Telegram/iMessage as blocked until OpenClaw gateway URL, gateway token/auth,
  recipient, body, and explicit live confirmation are configured.
- `pnpm --filter @paperclipai/server typecheck` passed.
- `git diff --check` passed.
- `pnpm dearme:symphony-preflight -- .` passed.

## Coordinator Entrypoint Cleanup - 2026-05-11

Thirty-eighth verified DearMe slice:

- Kept the inherited root README content intact, but added a top-level
  DearMe checkout notice so humans and workers start product, architecture,
  reuse, and Symphony coordination from the canonical DearMe docs instead of
  treating the Paperclip substrate README as current product direction.
- Left the active DEA-60 provider proof lane untouched; the current coordinator
  summary still reports its latest handoff as reviewed/absorbed and not
  replayable.

Verification:

- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs --ticket DEA-60`
  passed and reported the latest DEA-60 handoff as `committed_patch` with the
  worktree already `reviewed_absorbed`.

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
- DEA-35 closed the sparse first-cycle opportunity shortlist gap by reusing
  the existing first-cycle preview contract, shared validator, proof renderers,
  and output-handoff document shapes to surface verification status, contact
  records, source signals, fit reasons, and first messages without a schema
  migration or new send path. The shared schema now refuses `verified` contact
  evidence on reserved demo domains, so the default first-cycle proof can show
  contact evidence without pretending sample `.example` records are reachable.
  The remaining gap is only richer real contact-source enrichment, not a new
  dashboard or persistence layer.
- Visible-label passes removed `Paperclip` from the main entry surfaces and the targeted runtime/admin/plugin/adapter/routine/workspace surfaces audited so far; the latest pass also removed OpenClaw labels from the teammate invite/gateway display surfaces and raw adapter ids from hire-agent approval payloads. Broad source still contains internal compatibility identifiers, package names, storage keys, CSS names, Lucide icon identifiers, `.paperclip.yaml`, exact gateway contract keys, and real `pnpm paperclipai ...` commands, so do not treat the whole codebase as product-copy clean yet.
- Browser smokes used available fallbacks rather than the Browser Use plugin because the required browser execution tool was not exposed after tool discovery. The latest paid-beta fake-customer, weekly report reviewer, and generated-output handoff passes used Playwright.
- The previous full-suite blocker from host Tailscale detection is fixed in `cli/src/__tests__/network-bind.test.ts` and `cli/src/__tests__/onboard.test.ts`; `pnpm test:run` is now green.
- Full `pnpm -r typecheck` and `pnpm build` are now green for the current tree. The build still emits existing non-blocking Vite warnings for `MarkdownEditor` chunking and large chunks.
- Paid-beta access now has focused contract/route/UI verification, full test/typecheck/build coverage, a desktop/mobile fake-customer browser/API journey, and clean-install/local-app verification against an isolated local home. The initial fully isolated `pnpm` onboarding attempt exposed only a pnpm tool-cache harness issue; the app first-run path and actual `pnpm paperclipai run` path both verified against the same isolated Paperclip home.
- The isolated `/tmp/dearme-clean-local.CNG6u6` home contains one smoke company/payment and can be deleted after the evidence is no longer needed.
- The clean mobile full-page screenshot shows the fixed bottom nav crossing through content at the captured viewport fold. The paid-beta panel itself rendered and functioned correctly, but this remains a visual polish risk for mobile full-page capture.
- The local dev database now contains smoke approvals `b9d605b6-4c62-40d5-bac2-960d25d9ffc1`, `84e4dcea-a30d-419c-a83b-9fc4c70c1d5a`, `915a7866-e53d-432f-bea7-d4587663850e`, `840cd202-540c-4a2c-a376-d2ea78eed338`, `4cbd056f-3f9d-47a4-a9d3-b4a76d737563`, `2df0e229-5caa-441b-90e9-4e7a1dc60d62`, `519caeef-3252-41b9-a11d-753b33ecf444`, `a3e02ffa-4230-4e05-9977-66ab79327642`, `d40f9acf-3fac-4be5-a660-6fb946b8db69`, `8398a7e3-cb33-4ce9-ba10-f4e9522a6f29`, `bc3f2eab-e675-4b2c-960a-54ca7bd3b5c7`, `36e61ca3-0a28-4599-804f-fe45420ea376`, `a1229131-632d-49ce-a29f-453e640481e6`, `df7a1333-c14a-4369-b395-110ca68a0680`, `b2bb8a9d-649c-48dc-b398-afac8efaeb62`, `2ca6835f-7b46-4f19-99e5-dfa9abae3c63`, `338871e5-ee1b-4f6e-be14-a05cc6bc7884`, `6c370c67-4fe1-422d-a243-832f289003dd`, and `0481af14-6da5-414a-ae32-1da7f10d4f05`.
## Next Slice

Make the runtime loop paid-beta credible now that Codex receives task context, produces content, updates the attached weekly report document, has live-verified review handoffs for content and report output, only auto-starts the content lane by default, has live-verified weekly report reviewer decisions, now shows generated work on `/dearme`, and Voice & Memory source add/edit/archive/dialog behavior is integrated through `98fa9796c3e8`:

1. Continue reducing remaining product-copy leakage while preserving internal
   compatibility identifiers and real CLI/package names.
2. Choose the next paid-beta runtime credibility slice: make the Work Ready /
   Decisions Needed cockpit more explicit, or deepen the Voice Profile scoring
   and review loop.
3. Re-run full `pnpm test:run`, `pnpm -r typecheck`, and `pnpm build` after the
   next implementation slice; the latest DM-019 worktree is green for focused
   UI test/typecheck/build plus browser verification.
