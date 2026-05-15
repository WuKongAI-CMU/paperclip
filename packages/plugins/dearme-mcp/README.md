# @paperclipai/dearme-mcp

DearMe MCP servers — exposes the 12-role tool surface (voice gate, runtime
files) as in-process MCP servers consumable by OpenClaw, Claude Desktop,
Claude Code, and any MCP-aware client.

## Provenance

This package absorbs two slices from clawdbob's MCP layer (see
[`docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md`](../../../docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md)):

- **dm-cb-02** — DearMe voice MCP server. DearMe-specific; no clawdbob
  equivalent. Proxies `voice.score` and `voice.profile.get` to the cloud
  `/v1/voice/*` endpoints so an external agent can stay in the loop.
- **dm-cb-03** — DearMe runtime-files MCP server. Ported from
  `clawdbob/src/mcp/runtime-files/` — Bash/Read/Edit/Write/Glob/Grep/
  TodoWrite/NotebookEdit. The Bash dispatcher refuses any command matching
  `DEARME_RUNTIME_DENY_BASH_PATTERNS`, which mirrors the lockdown layer in
  `dearme-openclaw`.

## Servers

| Key | Server | Tools | Priority |
|---|---|---|---|
| `dearme_voice` | `createVoiceServer` | `voice.score`, `voice.profile.get` | P0 |
| `dearme_runtime_files` | `createRuntimeFilesServer` | `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `TodoWrite`, `NotebookEdit` | P0 |

The catalog is exported via `DEARME_MCP_CATALOG` from `./catalog.js`. It also
includes future-tier entries (`dearme_workbench`, `dearme_memory`,
`dearme_research`, `dearme_opportunities`) listed for stable allow-list
pattern generation; their server modules ship in later slices.

## Usage

```ts
import { createVoiceServer, createRuntimeFilesServer } from "@paperclipai/dearme-mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const voice = createVoiceServer({
  apiKey: process.env.DEARME_API_KEY,
  proxyUrl: "https://api.dearme.app",
  userHandle: "peter-studio",
});
await voice.connect(new StdioServerTransport());
```

## Lockdown coupling

The runtime-files Bash dispatcher denies the same command patterns the
OpenClaw lockdown layer denies. A test in `dearme-mcp.test.ts` enforces the
mirror between `DEARME_RUNTIME_DENY_BASH_PATTERNS` (this package) and
`DEARME_DENY_BASH_PATTERNS` (`dearme-openclaw/src/lockdown/`). Change one,
change the other.
