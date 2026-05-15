/**
 * DearMe MCP catalog.
 *
 * Provenance: structurally lifted from `clawdbob/src/mcp/catalog.js`, but
 * the entries are tuned to DearMe's 12-role personal-brand team surface.
 * Polsia/clawdbob expose ~27 MCP servers because the Polsia agent is a
 * generic business-runner; DearMe exposes far fewer because its surface is
 * deliberately bounded (one user, one voice, one growth team).
 *
 * Each entry names: the MCP server `key`, a stable human-readable `name`,
 * the priority tier, and the tool surface. The priority tiers match
 * clawdbob's:
 *   P0 — required for the autonomous loop
 *   P1 — required for paid-beta external delivery
 *   P2 — nice-to-have, can stay stub
 *
 * This catalog drives:
 *   - external MCP allow-list in `.claude/settings.json` (see
 *     dearme-openclaw lockdown layer)
 *   - which servers a workspace bootstrap script starts up
 *   - operator status output ("which DearMe MCP servers are up?")
 */

export interface DearMeMcpCatalogEntry {
  /** Stable key used in MCP allow-list patterns (`mcp__<key>__*`). */
  key: string;
  /** Human-readable name surfaced to operators. */
  name: string;
  /** Priority tier: P0 required, P1 paid-beta, P2 stretch. */
  priority: "P0" | "P1" | "P2";
  /** Names of the tools the server advertises via tools/list. */
  tools: readonly string[];
}

export const DEARME_MCP_CATALOG: readonly DearMeMcpCatalogEntry[] = [
  {
    key: "dearme_voice",
    name: "DearMe Voice Gate",
    priority: "P0",
    tools: ["voice.score", "voice.profile.get"],
  },
  {
    key: "dearme_runtime_files",
    name: "DearMe Runtime Files",
    priority: "P0",
    tools: [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
      "TodoWrite",
      "NotebookEdit",
    ],
  },
  {
    key: "dearme_workbench",
    name: "DearMe Workbench",
    priority: "P1",
    tools: [
      "workbench.list_work_ready",
      "workbench.list_decisions",
      "workbench.read_output",
    ],
  },
  {
    key: "dearme_memory",
    name: "DearMe Voice & Memory",
    priority: "P1",
    tools: [
      "memory.search",
      "memory.read",
      "memory.append_sample",
    ],
  },
  {
    key: "dearme_research",
    name: "DearMe Research",
    priority: "P1",
    tools: ["web_search", "web_fetch"],
  },
  {
    key: "dearme_opportunities",
    name: "DearMe Opportunities",
    priority: "P1",
    tools: [
      "opportunities.list",
      "opportunities.read",
      "opportunities.draft_outreach",
    ],
  },
] as const;

export function catalogEntryByKey(
  key: string,
): DearMeMcpCatalogEntry | undefined {
  return DEARME_MCP_CATALOG.find((entry) => entry.key === key);
}

export function mcpAllowPatterns(): readonly string[] {
  return DEARME_MCP_CATALOG.map((entry) => `mcp__${entry.key}__*`);
}
