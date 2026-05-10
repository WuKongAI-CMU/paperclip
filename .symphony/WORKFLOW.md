---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  # Verified against Linear on 2026-05-10: this workspace has team DEA and no Project.
  team_key: "DEA"
  assignee: me
  active_states:
    - In Progress
    - In Review
  terminal_states:
    - Done
    - Canceled
    - Duplicate
polling:
  interval_ms: 10000
workspace:
  root: /private/tmp/dearme-symphony-workspaces
hooks:
  after_create: |
    set -euo pipefail
    SOURCE_REPO="${DEARME_SYMPHONY_SOURCE_REPO:-/Users/peter/dearme}"
    # Coordinator target as of 2026-05-10: DM-139/DM-140 should extend the
    # shared cycle output packet path through output handoff and the existing
    # workbench/report projection plus Dear me letter proof-pack review, not
    # fork a second reporting/content runtime.
    # Override this after the next reviewed integration branch lands.
    SOURCE_BRANCH="${DEARME_SYMPHONY_SOURCE_BRANCH:-codex/dearme-dm-136-sample-demo-proof}"
    git clone --no-hardlinks "$SOURCE_REPO" .
    git checkout "$SOURCE_BRANCH"
    corepack enable
    pnpm install --frozen-lockfile
agent:
  max_concurrent_agents: 4
  max_turns: 12
  max_concurrent_agents_by_state:
    Backlog: 1
    Todo: 2
    In Progress: 4
    In Review: 2
codex:
  command: codex --config shell_environment_policy.inherit=all --config 'model="gpt-5.5"' --config model_reasoning_effort=high app-server
  approval_policy: never
  thread_sandbox: workspace-write
  # Workers need localhost access for DearMe dev-server and Playwright smokes.
  # Keep writes confined to Symphony workspaces instead of granting broad
  # filesystem write access.
  turn_sandbox_policy:
    type: workspaceWrite
    writableRoots:
      - /private/tmp/dearme-symphony-workspaces
    readOnlyAccess:
      type: fullAccess
    networkAccess: true
    excludeTmpdirEnvVar: false
    excludeSlashTmp: false
server:
  host: 127.0.0.1
---

You are a Symphony worker on DearMe issue `{{ issue.identifier }}`.

DearMe is the customer-facing personal brand growth team. Keep the team visible
and the machinery hidden: do not expose Paperclip, OpenClaw, Symphony, adapter,
provider, setup payload, model, or raw runtime language in paid-beta UI/copy.

Start every run by reading:

- `AGENTS.md`
- `docs/dearme/README.md`
- `docs/dearme/BUILD-STATE.md`
- `docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`
- `docs/dearme/PRODUCT-ARCHITECTURE.md`
- `doc/plans/2026-05-08-dearme-symphony-operating-loop.md`

Issue context:

- Identifier: `{{ issue.identifier }}`
- Title: `{{ issue.title }}`
- State: `{{ issue.state }}`
- Labels: `{{ issue.labels }}`
- URL: `{{ issue.url }}`

Description:

{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Operating rules:

1. Treat the Linear issue scope as authoritative. Do not expand into broad
   product redesign unless the issue explicitly says to.
2. Use existing DearMe, Polsia, Naive, Lindy, Littlebird, Cofounder, and
   OpenClaw patterns where they fit. Record donor paths used, adapted, or
   rejected.
3. Before new worktree decisions, run
   `pnpm dearme:worktrees -- --summary-only --skip-dirty` when available. If
   that root script is missing on the selected branch, record the exact failure
   and use `pnpm paperclipai worktree:list --json` instead. Do not block the
   issue on this compatibility gap.
4. Keep code edits scoped to the issue. Stage explicit paths only; never use
   `git add -A` or broad cleanup commands.
5. Preserve approval boundaries: public send/deploy/spend/sensitive actions
   require approval.
6. For UI work, ship a real product surface, not internal substrate controls.
   The experience should be simple, beautiful, autonomous, and show a concrete
   first proof artifact whenever the issue touches onboarding or first-run.
7. Verify with the narrowest meaningful command first, then broader checks if
   the touched surface warrants it. Report exact commands and outcomes.
8. If blocked by missing credentials or permissions, stop with a concise blocker
   brief. Do not fabricate external access.
9. For rendered/browser smoke work, use repo-local headless verification from
   the shell (Playwright, Vitest, or an existing script). Do not call
   `tool_search` for browser tools, `chrome-devtools`, `browser-use`, or
   `computer-use`: those MCP/browser surfaces can trigger interactive
   elicitation that Symphony workers cannot answer. If Playwright is installed
   but its managed Chromium binary is missing, run
   `pnpm exec playwright install chromium` once and retry the same shell smoke
   before falling back to API/DOM evidence. If Playwright is otherwise
   unavailable, record the exact shell blocker and fall back to API/DOM evidence.

Final response contract:

- Completed actions
- Files changed
- Validation evidence
- Blockers only if real
