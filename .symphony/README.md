# DearMe Symphony Setup

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

```sh
security add-generic-password -a "$USER" -s dearme-linear-api-key -w '<LINEAR_API_KEY>' -U
/Users/peter/dearme/.symphony/bin/dearme-symphony start
```

The Codex App Linear plugin is useful for this thread: it can read and mutate
the Linear workspace through Codex tools. That plugin credential is not exposed
as a raw shell token, so external processes such as the Symphony daemon still
need `LINEAR_API_KEY` in the environment or the `dearme-linear-api-key` Keychain
entry above.

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
