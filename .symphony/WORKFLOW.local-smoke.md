---
tracker:
  kind: memory
polling:
  interval_ms: 5000
workspace:
  root: /private/tmp/dearme-symphony-smoke-workspaces
agent:
  max_concurrent_agents: 1
  max_turns: 1
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
    writableRoots:
      - /private/tmp/dearme-symphony-smoke-workspaces
    readOnlyAccess:
      type: fullAccess
    networkAccess: true
    excludeTmpdirEnvVar: false
    excludeSlashTmp: false
server:
  host: 127.0.0.1
---

Local DearMe Symphony smoke workflow.

This workflow intentionally uses the in-memory tracker, so it can boot without
Linear credentials and without launching implementation agents.
