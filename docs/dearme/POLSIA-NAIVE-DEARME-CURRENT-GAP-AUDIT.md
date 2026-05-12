# Polsia / Naive / DearMe Current Gap Audit

Date: 2026-05-11

Purpose: answer the product question "how far has DearMe actually gotten?" by
comparing the current repo against the two strongest donor references.

This audit is not a new strategy. It is the current product-readiness judgment
after checking the live DearMe branch, Symphony state, proof commands, existing
DearMe architecture docs, and the local Polsia / Naive research artifacts.

## Latest Coordinator Update

As of the latest coordinator proof run on 2026-05-11, the live-provider gap is
narrower than the original audit text: production host proof, Telegram
readiness through local OpenClaw config, and Meta campaign smoke setup are
ready on the coordinator machine. The remaining public-launch blockers are:

- an explicit owned iMessage smoke recipient for the shared OpenClaw message
  lane
- the LinkedIn partner endpoint and smoke recipient

This does not change the launch verdict. It changes the next action: stop
treating Meta as a current setup blocker, and stop routing more UI/setup work.
The next product-validating work is real recipient/endpoint collection followed
by no-send readiness checks and guarded live smokes.

## Current Coordinator Verdict

DearMe is now **internal-demo ready** for the private first-five-minute loop:
the local no-send proof is ready, the browser can show the customer-safe
progress stream and the actual private first-wow packet, the aha proof can
export a phone-ready static private-site artifact, and the voice-fit lane can
pass against a customer-like local corpus. The branch/worktree integration
question is also now answered by the product status path: the current
coordinator head has no replay candidates or latest dirty Symphony handoffs.

DearMe is **not paid-beta launch ready** yet. The missing part is no longer a
planning/permission problem; it is live customer proof:

- at least one real external channel/provider smoke
- a phone-reachable recurring proof that shows DearMe keeps improving the next
  private draft, opportunity, and proof page without the coordinator manually
  stitching evidence together

In product terms: DearMe has reached the Naive/Paperclip substrate bar for a
real team system, and the sample private proof is now phone-reachable through
GitHub Pages. It is still short of Polsia's full live first-wow bar because no
real external channel has delivered yet.
The unified product status now encodes that judgment as an execution order:
production host smoke is ready, shared OpenClaw message smoke is next, LinkedIn
DM follows, and Meta campaign is structurally ready but stays last if a
spend-bearing distribution proof is needed.
That status now also names the remaining blocker class in safe
product/coordination language instead of leaking provider env names: the shared
message gap is now explicit iMessage recipient proof when local OpenClaw config
reuse and Telegram self-smoke defaults are enabled.
The current machine-level host check is explicit too: Vercel and Netlify CLIs
exist but neither is authenticated; the configured GitHub Pages public HTTPS
host is the equivalent host path for this sample proof packet.
The shared OpenClaw message contract is now locally rehearsed: Telegram and
iMessage both flow through the same injected gateway contract without network
access or credentials. That raises the OpenClaw reuse bar, but it still does
not replace the live recipient/provider smoke. The local OpenClaw gateway itself is
already reusable through the ignored `.dearme-proof.env` opt-in, which derives
URL/auth from `~/.openclaw/openclaw.json` without duplicating or printing the
token.
Telegram can now also reuse the host-local OpenClaw allow-list as an explicit
self-smoke default. That removes another manual setup step without making
readiness send anything. iMessage now has a safe default smoke body too, so the
remaining shared-message proof is explicit recipient/provider intent plus
`--live` and `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1`; LinkedIn remains the other
current live-provider gap.

## Evidence Checked

Current DearMe branch:

- `git status --short --branch`
  - branch: `codex/dearme-dm-136-sample-demo-proof`
  - branch carries the first-five-minute aha proof gate, the DEA-60 handoff
    alias absorption, the customer-corpus voice proof hardening, and the
    recurring private-work status integration
- `.symphony/bin/dearme-symphony status`
  - Symphony is running on `http://127.0.0.1:4100/`
  - no active or retrying worker lanes are currently running
- `pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs`
  - 122 DearMe worktrees tracked
  - 118 reviewed as already absorbed
  - 3 already in the current head
  - 0 dirty or not-in-current replay candidates
  - 417 Symphony handoff records; latest handoffs by issue are all committed
    patches, 28/28 committed
  - latest DEA-60 handoff is a committed patch at head `88f8483a9f84`
- `pnpm --silent dearme:worktrees -- --summary-json --skip-dirty --handoffs`
  - compact status JSON carries the same integration counts without serializing
    full worktree rows or handoff artifacts
  - `latestIssueCount` is 28 and `latestByMode.committed_patch` is 28
- `pnpm --silent dearme:aha-proof -- --check`
  - local private first-five-minute aha proof is ready
  - recurring private work is ready in the first proof pack
  - phone-ready static private site artifact is ready for host smoke
  - no sends, public deploys, spend, or live model calls are performed
- `pnpm --silent dearme:aha-proof -- --export-site /tmp/dearme-private-proof-smoke.*`
  - writes `peter-studio/index.html`, `peter-studio/proof.json`, and
    `peter-studio/host-smoke.json`
  - host-smoke manifest carries the expected phone-check text plus checksums for
    the HTML and proof JSON
  - host-smoke manifest also carries concrete recurring-work detail: the
    continuation title, next private review, prepared next-cycle artifacts,
    owner roles, and approval boundaries
  - exported HTML has no customer-hidden substrate, provider, credential, token,
    or workbench language
- `pnpm --silent dearme:provider-smoke -- --print-env-template --target deploy_site_production`
  - now points the production host smoke at the same exported private-site
    artifact path
  - reads the exported `host-smoke.json` manifest for expected proof text and
    validates the HTML/proof JSON checksums before dispatch/fetch
  - keeps production disabled by default until a real host serves that artifact
  - the production smoke readiness gate now blocks `smoke:*` placeholders and
    handle-only text checks, so it cannot confuse a dispatch receipt with
    phone-reachable proof
- `pnpm --silent dearme:proof -- --status --json`
  - first-wow aha proof is now part of the unified product status
  - integration absorption proof is now part of the unified product status
    with 122 tracked worktrees, 118 reviewed absorptions, 3 in current head,
    0 replay candidates, 0 dirty lanes, and latest Symphony handoffs 28/28
    committed
  - OpenClaw message contract proof is now part of the unified product status:
    Telegram and iMessage share the local injected gateway contract, while the
    live recipient/provider proof remains blocked separately
  - local no-send proof is ready
  - voice semantic proof is ready on the coordinator Mac through the local
    profile-token scorer and customer-like custom corpus
  - blocked live-provider setup now prints the private-site export command
    before provider smoke, so the phone-ready artifact is part of the operator
    path instead of a separate remembered step
  - live-provider focus is now machine-readable, with Polsia phone-reachable
    host proof ready, OpenClaw shared-message proof next, and spend-bearing
    Meta smoke last
  - live-provider blockers now carry safe capability labels, so Symphony and
    Linear can distinguish shared message gateway, iMessage recipient proof,
    and provider credentials without parsing raw env names
  - live provider proof is still the remaining external proof gap
- `pnpm --silent dearme:goal-audit`
  - active objective is not complete yet
  - architecture/status spine, Naive/Paperclip absorption, Symphony
    coordination, private first-wow, no-secret loopback host rehearsal, DearMe
    voice autonomy, and OpenClaw message contract rehearsal are met
  - host-provider authorization is met through the configured public HTTPS
    GitHub Pages host for this sample proof packet
  - remaining gaps are OpenClaw shared message proof and the complete live
    provider set
- `pnpm --silent dearme:host-provider-audit`
  - Vercel CLI is installed but not authenticated
  - Netlify CLI is installed but not authenticated
  - the configured public HTTPS DearMe host is ready through GitHub Pages
- `pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target deploy_site_production --json`
  - fetches `https://wukongai-cmu.github.io/dearme-private-proof/peter-studio`
  - verifies the exported private proof page and `host-smoke.json` manifest
  - returns HTTP 200 for the production host smoke
- `pnpm --silent dearme:openclaw-message-rehearsal`
  - Telegram and iMessage both deliver through the injected local OpenClaw
    gateway executor
  - captured contract metadata includes tool name, channel, payload keys, and
    wake tool only; no token or message body is serialized
  - live `openclaw_messages` proof remains required
- `pnpm --silent dearme:proof -- --run-safe --lane voice`
  - deterministic local gate passes
  - profile-token semantic proof passes with custom corpus evidence, including
    profile sample/token counts and drift blocking
- `pnpm --silent dearme:provider-smoke -- --check --target openclaw_messages`
  - Telegram and iMessage share the OpenClaw gateway proof path
  - with `.dearme-proof.env`, the gateway URL/auth are derived from the
    host-local OpenClaw config without printing the token
  - with the local Telegram self-smoke opt-in, Telegram derives its smoke
    recipient from the existing OpenClaw allow-list and supplies a safe DearMe
    smoke body without printing either value
  - iMessage supplies a safe default smoke body and still requires an explicit
    recipient plus the live-send confirmation guard
- local env scan
  - only `LINEAR_API_KEY` is present for the relevant DearMe/OpenClaw/provider
    prefix set
  - `.dearme-proof.env` exists for local proof/voice calibration, production
    host smoke, OpenClaw gateway-config reuse, and explicit Telegram
    self-smoke default reuse; it still does not contain live provider
    recipients, channel secrets, or send bodies
- `pnpm exec vitest ui/src/pages/DearMeOnboarding.test.tsx --run --maxWorkers=1`
  - the browser onboarding surface now renders the customer-safe first-five-minute
    progress stream and top-focus live private-pass pulse without hidden
    substrate/provider language
- `pnpm exec playwright test --config tests/e2e/playwright.config.ts tests/e2e/dearme-private-handoff.spec.ts -g "turns final approval of prepared work into a private launch brief"`
  - the paid-beta first-cycle browser path now proves the private preview route
    contains a prepared starter draft and opportunity lead before review and
    launch-brief handoff continue
- `pnpm --filter @paperclipai/ui typecheck`
  - the DearMe onboarding surface typechecks after the watchable-progress slice

DearMe docs and code surfaces checked:

- `docs/dearme/PRODUCT-ARCHITECTURE.md`
- `docs/dearme/POLSIA-NAIVE-COMPARISON.md`
- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/INDEX.md`
- `ui/src/pages/DearMeOnboarding.tsx`
- `ui/src/components/DearMeSidebar.tsx`
- `server/src/routes/dearme.ts`
- `packages/plugins/dearme-agent-prompts/src/registry.ts`

Donor references checked:

- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/02-ONBOARDING-FLOW.md`
- `/Users/peter/Desktop/polsia-recon-2026-05-05/final-summary/12-REAL-SOURCE-CODE-DEEP-DIVE.md`
- `/Users/peter/naive-research-2026-05-05/ARCHITECTURE.md`
- `/Users/peter/naive-research-2026-05-05/DEEP-CODE-PATHS.md`

## Bottom Line

DearMe is no longer an empty product shell. It has a real product spine:
onboarding, Brand OS, first-cycle preview, workbench, output handoff, review
memory, channel dispatch wrappers, proof commands, and Symphony coordination.
The first screen now puts the one-sentence first cycle ahead of setup-heavy
Brand OS configuration, and governed external moves now pass through a
DearMe-native employee handoff primitive whitelist before they can execute or
render as launch-ready work.

But DearMe is not yet at Polsia's full customer-visible product maturity.
Polsia's advantage is the first five minutes: near-zero friction, immediate
dashboard, visible thinking stream, mood/progress updates, first report, starter
tasks, and a live asset. DearMe now has the browser-visible first-five-minute
progress stream, a browser-verified private first-wow packet, a first-screen
one-sentence start, and a static private-site export over its private proof
contract. The sample artifact is now served from a public HTTPS GitHub Pages
host; what still keeps DearMe behind Polsia is provider-backed execution and a
recurring proof loop the user can inspect without coordinator stitching.
The next proof is now narrower: Telegram can be self-smoked from the existing
OpenClaw allow-list once the live-send guard is deliberately enabled, while
iMessage still needs an explicit recipient and LinkedIn/Meta still need their
own provider credentials.

DearMe is closer to Naive/Paperclip on substrate than it is to Polsia on
first-wow. The control-plane reuse is strong. The first-five-minute private
contract is runnable, visible in the browser, locked by an e2e path, and
exportable as a host-smoke artifact, and the local voice proof now requires
customer-like corpus evidence.
The Symphony/worktree absorption lane is clean. The external/live provider lane
is not yet strong enough.

## Current Maturity

| Area | Current score | Judgment |
| --- | ---: | --- |
| Substrate/control plane reuse | 82 / 100 | Strong. DearMe is using the Paperclip-style company, issue, approval, route, service, dispatch, handoff, and proof machinery instead of rebuilding it. |
| DearMe product semantics | 79 / 100 | Good. Brand OS, voice, portfolio, opportunity, reports, Work Ready, launch gates, review memory, employee handoff primitives, and customer-corpus voice proof are now DearMe-owned concepts. |
| UX simplicity | 72 / 100 | Improving. The hero now has one primary one-sentence action, the first payoff and 90-second cycle appear before the team/workbench surfaces, and the browser verifies the private starter draft plus first lead on the real preview route; deeper setup still exists below the fold. |
| Autonomous runtime proof | 76 / 100 | Real and partly externally proven. Local safe proof, private aha proof, browser-visible progress, static private-site export, GitHub Pages production host smoke, customer-corpus voice proof, recurring private-work contract, clean integration absorption, fail-closed host-smoke readiness, and local Telegram self-smoke defaults are ready; live channel/provider proof remains open. |
| Polsia-style first-wow | 85 / 100 | Private proof is runnable, watchable, browser-verified on the real preview route, first-screened through one sentence, exportable as a phone-ready artifact, deep enough to show five private drafts, and now reachable on a public HTTPS host for the sample packet. Telegram is close to a real self-smoke; the missing main moment is provider-backed execution and recurring phone-visible proof. |
| Naive-style durable team runtime | 83 / 100 | Solid substrate fit. Symphony/worktree coordination is clean, latest handoffs are committed, absorption proof appears in `dearme:status`, employee handoff primitives bridge DearMe semantics to the existing outbound bindings, and Telegram can reuse local OpenClaw config/allow-list; live provider smoke is still missing. |

## What DearMe Has Actually Done

DearMe has already built the product/kernel split correctly:

- Customer shell: DearMe sidebar, mobile nav, onboarding surface, Brand OS
  payload, Work Ready, Voice & Memory, reports, content, opportunities, and
  portfolio views.
- Product semantics: `brand_blueprint`, proof sequence, first-cycle preview,
  private site preview, launch-ready handoff, review memory, paid beta access,
  and customer-safe copy scrubbing.
- Runtime reuse: company-scoped API routes, issues, activity, approval receipts,
  output handoff, workbench projection, channel connections, Voice Gate, and
  outbound tool wrappers.
- Channel dispatch shape: X, email, LinkedIn partner dispatch, deploy-site
  preview, and Meta paused-campaign receipt paths have DearMe-owned wrappers.
- Operator proof: `pnpm dearme:aha-proof`, `pnpm dearme:proof`,
  `pnpm dearme:status`, `pnpm dearme:provider-smoke`, and
  `pnpm dearme:voice-smoke` now give the coordinator a private-first-wow,
  no-send / voice / live-provider readiness map. The voice lane can require a
  customer-like local corpus and now reports profile sample/token evidence.
  `pnpm dearme:aha-proof -- --export-site dist/dearme-private-proof` gives the
  host lane a concrete artifact and host-smoke manifest without claiming
  production hosting until `deploy_site_production` fetches a public HTTPS
  page. The sample proof now passes that smoke through GitHub Pages.
- Coordination: Symphony is the active worker lane, and current worktree status
  is visible through `pnpm dearme:worktrees`; the same absorption signal is now
  also part of `pnpm dearme:status`.

That is enough to call the architecture real. It is not enough to call the
product launch-ready.

## Polsia Comparison

Polsia's strongest product move is not code volume. It is choreography:

- one input
- instant dashboard
- visible "AI is working" signal while the user is still typing
- live progress stream
- mood/state changes
- first report
- starter tasks
- live proof asset
- short trial pressure

DearMe has copied the doctrine, but not the full watchable moment.

| Polsia capability | DearMe current state | Product verdict |
| --- | --- | --- |
| Zero-friction signup and one-input start | DearMe now makes `Start with one sentence` the only primary hero CTA and moves the first payoff plus 90-second cycle before the heavier Brand OS/team surfaces. | Much closer. Continue compressing setup below the first private result. |
| Work starts immediately | DearMe has first-cycle start routes, proof sequence contracts, and a browser-visible first-five-minute progress stream. | Better. Next proof is real live/provider progress, not another dashboard. |
| 90-second wow | `pnpm dearme:aha-proof -- --check` proves the local private sequence, the browser shows the customer-safe progress sequence, the private preview e2e proves a starter draft plus opportunity lead, and `--export-site` renders the same packet as a static private site. The sample packet now passes production host smoke on GitHub Pages. | Host proof is proven for the sample packet. The remaining gap is backing it with live provider proof. |
| 5-minute complete dashboard | DearMe has many dashboard surfaces. | The pieces exist; the activation sequence does not feel as compressed. |
| Mood/thinking/tool stream | DearMe has SSE/event contracts, workbench events, and a top-focus customer-safe private-pass pulse. | Projection exists. It still needs a richer live asset and recurring loop. |
| Public/live proof | DearMe intentionally gates public deploy/send/spend and now has a static private-site export for the host lane. | Correct for reputation safety; the substitute must be private proof that is phone-reachable and feels live. |

Polsia should still be the model for user feeling. DearMe should not copy
Polsia's company-factory frame or direct external action posture.

## Naive Comparison

Naive's strongest move is durable execution infrastructure:

- Better Auth / company-scoped cloud shell
- issue-centered work ownership
- CEO/worker split
- per-tenant OpenClaw runtime
- heartbeats
- cost tracking
- activity logs
- approvals
- app/workspace outputs

DearMe is much closer here. The current repo already carries the Paperclip-style
control plane and a DearMe overlay. The gap is not "build another runtime." The
gap is proving the DearMe-specific team runs continuously and produces
customer-visible work.

| Naive capability | DearMe current state | Product verdict |
| --- | --- | --- |
| Company/workspace substrate | Present through the inherited control plane. | Reuse is strong. |
| CEO/worker team topology | Product roles exist, generated skills exist, and governed external moves now carry DearMe employee handoff primitives; the registry still contains planned states. | Do not claim a full 12-role team yet; claim the proven handoff-capable employees. |
| Issue/run/activity backbone | Present and heavily reused. | Keep it backstage. |
| Heartbeat/recurring work | The first-cycle proof now carries a visible next private pass: draft, opportunity, and proof-page improvements. | Local product proof exists; phone-reachable/live recurrence is still the next gate. |
| Provider/runtime isolation | DearMe has wrappers, proof lanes, and a DearMe primitive whitelist over outbound bindings. | Live smoke is the next gate, not new settings UI or another dispatch layer. |
| Cost/budget truth | Substrate exists. | Customer credits should stay boring and visible later. |

Naive should remain the model for backstage truth. DearMe should not expose a
generic agent marketplace, raw setup payloads, provider setup, or runtime
dashboard.

## Why Authorization Is Not The Blocker

The remaining gaps are not permission gaps. They are proof and product-shaping
gaps.

The operator can run tools, merge slices, configure lanes, and add Codex agents.
That removes coordination hesitation; it does not fabricate provider
credentials, real recipients, or a product moment that a user can feel.
A customer will judge DearMe by whether it produces a personal-brand result in
minutes, not by whether the repo has a correct proof command or a strong control
plane.

So the correct posture is:

- Hide concerns from the user.
- Keep concerns in the coordinator/proof lane.
- Convert every concern into either a first-wow product output or a live proof
  command.
- Stop adding generic settings/admin surfaces unless they directly unblock the
  first customer result.

## Architecture Verdict

The architecture is directionally right.

DearMe should keep the current split:

- DearMe owns product meaning, customer shell, copy, Brand OS, voice, portfolio,
  opportunities, reports, launch decisions, and first-wow.
- Naive/Paperclip owns company-scoped work, issues, approvals, runs, activity,
  cost, adapters, and durable execution.
- Polsia owns the reference pattern for visible momentum, onboarding rhythm,
  live progress, daily/weekly reporting, and watchable autonomy.
- Symphony/Linear owns the backstage worker coordination loop.

The mistake would be to rebuild substrate again. The other mistake would be to
declare the product done just because the substrate is strong.

## Next Product Priorities

### DM-WOW-1 First Five-Minute Private Wow Loop

The local proof gate now exists through `pnpm dearme:aha-proof -- --check`, and
the host-smoke artifact plus manifest exist through
`pnpm dearme:aha-proof -- --export-site dist/dearme-private-proof`. The
provider smoke can read that manifest directly, so the remaining setup concern
is live channel credentials rather than copying expected proof text by hand;
stale or hand-edited proof packets now fail before the host smoke can claim
delivery. The coordinator can also reuse the existing local OpenClaw gateway
config without copying its token into DearMe. The no-credential packet is now
deepened into a five-draft private result and the sample packet is served from
GitHub Pages; the next product proof is making the recurring loop and outbound
channels real:

- voice profile
- audience map
- five starter drafts
- opportunity shortlist
- private site/proof card
- one clear launch call

No live external sends are required for the five-draft packet. The result can be
private. The user must feel the team started. The next gate is live
OpenClaw/channel proof before adding another dashboard.

### DM-WOW-2 Customer-Safe Live Work Stream

Status: first browser slice shipped as DM-WOW-2A in
`ui/src/pages/DearMeOnboarding.tsx`.

Use the existing DearMe event/workbench contracts to show progress without
leaking runtime machinery:

- "Studying your voice"
- "Finding likely audiences"
- "Drafting first moves"
- "Preparing your private proof"
- "Ready for your launch call"

This is the Polsia live-stream lesson translated into DearMe language. The
remaining work is deeper live/provider evidence and recurring phone-visible
proof, not a new settings dashboard.

### DM-WOW-3 Minimum Runnable Team

Do not sell 12 roles as fully running until the registry truth supports it.
Ship the smallest real team first:

- Chief of Staff
- Content Producer
- Opportunity Scout

Brand Strategist, Voice Editor, Portfolio Builder, and Growth Analyst can appear
as prepared outputs or internal lanes until they are genuinely runnable.

### DM-WOW-4 Live Proof Lane, Not Settings UI

Voice proof now has a local customer-corpus check. Live provider credentials
should enter the operator proof lane:

- `pnpm dearme:status`
- `pnpm dearme:proof -- --check`
- `pnpm dearme:provider-smoke -- --check`
- `pnpm dearme:voice-smoke -- --check`

Do not build a new connector/settings surface before the first-wow loop is
watchable.

### DM-WOW-5 Role Registry Status Audit

Make the agent registry reflect product truth:

- `shipped`: invokable in the current product loop
- `preview`: creates product-visible outputs but may not run autonomously
- `planned`: prompt/skill exists but is not a product claim

This prevents DearMe from overclaiming while still letting the backstage system
reuse generated skills and role prompts.

## Product Answer

DearMe is architecturally ahead of a normal prototype and now has a local
private first-wow proof gate, five private starter drafts, a browser-visible
first-five-minute progress stream, a browser-verified private preview packet,
and a static private-site export that passes production host smoke on GitHub
Pages. It is still behind Polsia as a live customer demo.

It is strongest where Naive is strongest: typed work, approvals, route/service
shape, dispatch boundaries, and durable coordination. It is weakest where
Polsia is strongest: instant emotional proof that a team is working for the
customer right now, backed by a live asset the user can inspect from outside the
app.

The next correct move is not another architecture layer. It is to put live
provider evidence on top of the phone-reachable five-draft private proof packet
that now exists. The provider-smoke production lane requires that concrete
artifact plus its exported host-smoke manifest or an explicit expected-text
override before it will run; the remaining work is OpenClaw/channel/provider
proof with real recipient/credential evidence and live-send confirmation, not
another local proof command, host setup path, or branch replay pass.
