# DearMe Symphony Setup

## Operating Contract

Symphony is the default cooperation spine for DearMe work from 2026-05-10
forward.

- Use Linear team `DEA` plus `.symphony/WORKFLOW.md` as the live worker queue.
- Use Symphony workspaces for parallel product/code execution.
- Keep the main DearMe checkout as the coordinator/integration surface.
- Direct Codex work in this checkout is for integration, docs, verification,
  and small fixes that do not need another worker lane.
- Keep customer-facing DearMe UI/copy free of Symphony, Paperclip, OpenClaw,
  provider, adapter, model, setup payload, and raw runtime language.

Local Symphony source:

- `/Users/peter/symphony`
- CLI wrapper: `/Users/peter/.local/bin/symphony`

Verified locally:

```sh
cd /Users/peter/symphony/elixir
mise trust -y
mise install
mise exec -- mix setup
mise exec -- mix build
mise exec -- mix test
mise exec -- mix specs.check
```

Run the DearMe coordinator after setting the Linear token. The DearMe Linear
workspace currently uses team `DEA` and has no Linear Project, so
`WORKFLOW.md` routes by `tracker.team_key: "DEA"` plus `tracker.assignee: me`.
If the daemon is already running, no extra user configuration is needed for
normal DearMe work.

```sh
security add-generic-password -a "$USER" -s dearme-linear-api-key -w '<LINEAR_API_KEY>' -U
/Users/peter/dearme/.symphony/bin/dearme-symphony start
```

The Codex App Linear plugin is useful for interactive inspection, but Symphony
owns agent execution. If Symphony is restarted outside the app, the daemon reads
`LINEAR_API_KEY` from the shell environment first, then from the
`dearme-linear-api-key` Keychain entry above.

Runtime commands:

```sh
/Users/peter/dearme/.symphony/bin/dearme-symphony smoke
/Users/peter/dearme/.symphony/bin/dearme-symphony start
/Users/peter/dearme/.symphony/bin/dearme-symphony status
/Users/peter/dearme/.symphony/bin/dearme-symphony stop
/Users/peter/dearme/.symphony/bin/dearme-symphony rotate-logs
```

`smoke` uses `WORKFLOW.local-smoke.md` to verify local boot without Linear.
`start` reads `LINEAR_API_KEY` from the environment first, then from the macOS
Keychain service `dearme-linear-api-key`. The real dashboard/API defaults to
`http://127.0.0.1:4100/`.

`rotate-logs` archives and truncates oversized launchd stdout/stderr logs
without restarting the daemon. Use `--max-bytes N` to override the default
100 MB threshold.

Only assign real worker tickets to Peter in Linear. The default onboarding
Linear issues remain unassigned and are filtered out by `assignee: me`.

## Terminal Handoff Guard

Worker issues are not coordinator-absorbable just because Linear says Done.
Before a Symphony lane reaches a terminal state, the worker final response must
leave one durable handoff path:

- a local commit hash plus the patch, bundle, and summary paths printed by
  `pnpm dearme:symphony-handoff -- --issue DEA-123 .` when files changed;
- explicit "No file changes" evidence for analysis-only or already-complete
  tickets;
- or a blocker/patch handoff with workspace path, touched paths, and the exact
  failed command if a commit could not be created.

Workers must not move their own Linear issue into `Done`, `Canceled`, or
`Duplicate`. Terminal state changes are coordinator-owned and happen only after
the coordinator verifies one of the durable evidence paths above. If a worker
believes the issue is already complete without code changes, it leaves Linear
non-terminal and provides explicit no-code evidence.

The handoff script writes outside the per-ticket worker checkout under
`/private/tmp/dearme-symphony-workspaces/_handoffs`, which is still inside the
Symphony writable root. This keeps the coordinator able to absorb a worker patch
even if Symphony cleans `/private/tmp/dearme-symphony-workspaces/DEA-123` before
the coordinator inspects it.

Before absorbing or closing a lane, use the coordinator summary instead of
manual `_handoffs` scans:

```sh
pnpm dearme:worktrees -- --summary-only --skip-dirty --handoffs --ticket DEA-123
```

This shows both the worktree verdict and the latest durable handoff artifact
for the issue, including patch path, mode, head, and touched-file count.

This keeps the main DearMe checkout as the integration truth and prevents stale
workspaces from being cleaned before the coordinator can absorb or reject the
actual change.

For first-cycle private-run or launch-handoff proof work, keep the product lane
effectively single-lane until the active worker leaves one of those absorbable
handoff artifacts. Extra Codex help is useful as read-only architecture or QA
review, not as another concurrent writer on the same customer surface.
`WORKFLOW.md` enforces this during the current proof phase by limiting
`In Progress` Symphony workers to one, while the coordinator can still use
native Codex subagents for read-only review.

## Worker Git Preflight

Worker workspaces must prove Git metadata is usable before implementation
starts:

```sh
pnpm dearme:symphony-preflight -- .
```

The Symphony workflow runs this during workspace creation and again in Codex
bootstrap evidence. A failure means the lane should stop with the workspace path
and exact command output instead of producing an uncommittable patch.

## Worker Proof Readiness

Worker bootstrap also runs the unified local proof map:

```sh
pnpm --silent dearme:proof -- --check
pnpm --silent dearme:proof -- --status --lane provider
pnpm --silent dearme:host-rehearsal -- --port 0 --json
pnpm --silent dearme:openclaw-message-rehearsal -- --json
pnpm --silent dearme:next-proof -- --target all --no-write --json
```

Use that output as the first proof triage surface. It composes provider dispatch
readiness and voice calibration readiness without sending, deploying to
production, spending, or calling a live model. The provider-lane status prints
the shared live proof focus order for workers: production host smoke first,
OpenClaw Telegram/iMessage smoke second, LinkedIn DM third, and Meta campaign
last. The host rehearsal exports the same private first-wow packet, serves it
on loopback, and fetches it through the deploy-site host rehearsal smoke, so
workers have a no-secret proof that the phone packet is real before the
remaining public HTTPS production host blocker. The OpenClaw message rehearsal
runs the shared Telegram/iMessage provider-smoke path through an injected local
gateway executor, so workers have a no-secret proof that both sends use one
OpenClaw contract before the remaining live gateway/auth/recipient blocker.
The next-proof JSON is the operator handoff source for exact `factsNeeded`; do
not copy stale setup lists when the coordinator env has already made a provider
lane ready.
Drop to
`pnpm dearme:provider-smoke` only for live provider credential work, or
`pnpm dearme:voice-smoke` only for scorer-specific calibration work.

## Worker Handoff Artifacts

Worker creation records the coordinator source head in the worker Git metadata.
At terminal handoff time, run:

```sh
pnpm dearme:symphony-handoff -- --issue DEA-123 .
```

If the worker has clean local commits after the recorded base, the command
writes a `format-patch` file, a `git bundle`, and a JSON summary. If the worker
has no file changes, it prints `No file changes`. If the worker is still dirty,
it writes a blocker patch summary and exits nonzero so the issue stays
non-terminal until a coordinator can inspect or recover it.

Once a worker has printed one of those absorbable handoff outcomes, the worker
should stop with that evidence as its final response. Continuing into another
analysis pass after a handoff risks replaying the same issue, burning context,
and creating duplicate coordinator work.
