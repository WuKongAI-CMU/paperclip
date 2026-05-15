/**
 * DearMe MCP — public barrel.
 *
 * See docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md (dm-cb-02 + dm-cb-03 + dm-cb-04
 * + dm-cb-05) for absorption provenance from clawdbob/src/mcp/.
 *
 * Test helpers (`__testHelpers` exports from each server module) are NOT
 * re-exported here to avoid name collisions; tests import them directly from
 * the relevant `./<server>/server.js` files.
 */

export {
  DEARME_MCP_CATALOG,
  catalogEntryByKey,
  mcpAllowPatterns,
  type DearMeMcpCatalogEntry,
} from "./catalog.js";

export {
  createVoiceServer,
  VOICE_TOOLS,
  VOICE_TOOL_DESCRIPTORS,
  type DearMeVoiceServerConfig,
} from "./voice/server.js";

export {
  createRuntimeFilesServer,
  RUNTIME_FILES_TOOLS,
  RUNTIME_FILES_TOOL_DESCRIPTORS,
} from "./runtime-files/server.js";

export {
  createWebSearchServer,
  WEB_SEARCH_TOOLS,
  WEB_SEARCH_TOOL_DESCRIPTORS,
  type DearMeWebSearchServerConfig,
} from "./web-search/server.js";

export {
  createWorkbenchServer,
  WORKBENCH_TOOLS,
  WORKBENCH_TOOL_DESCRIPTORS,
  type DearMeWorkbenchServerConfig,
} from "./workbench/server.js";

export {
  DEARME_RUNTIME_DENY_BASH_PATTERNS,
  findBashDenyMatch,
} from "./runtime-files/denyPatterns.js";
