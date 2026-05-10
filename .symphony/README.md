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
```

`smoke` uses `WORKFLOW.local-smoke.md` to verify local boot without Linear.
`start` reads `LINEAR_API_KEY` from the environment first, then from the macOS
Keychain service `dearme-linear-api-key`. The real dashboard/API defaults to
`http://127.0.0.1:4100/`.

Only assign real worker tickets to Peter in Linear. The default onboarding
Linear issues remain unassigned and are filtered out by `assignee: me`.

## Terminal Handoff Guard

Worker issues are not coordinator-absorbable just because Linear says Done.
Before a Symphony lane reaches a terminal state, the worker final response must
leave one durable handoff path:

- a local commit hash in the worker workspace when files changed;
- explicit "No file changes" evidence for analysis-only or already-complete
  tickets;
- or a blocker/patch handoff with workspace path, touched paths, and the exact
  failed command if a commit could not be created.

This keeps the main DearMe checkout as the integration truth and prevents stale
workspaces from being cleaned before the coordinator can absorb or reject the
actual change.
