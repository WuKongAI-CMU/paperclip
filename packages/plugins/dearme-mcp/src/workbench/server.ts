/**
 * DearMe Workbench MCP server.
 *
 * DearMe-specific (no clawdbob equivalent). This ships the dm-cb-05 P1
 * workbench surface listed in the MCP catalog:
 *   - `workbench.list_work_ready`
 *   - `workbench.list_decisions`
 *   - `workbench.read_output`
 *
 * Auth: the server expects a DearMe `dm_sk_*` API key in env
 * (`DEARME_API_KEY`) and proxies to `DEARME_PROXY_URL`
 * (default `https://api.dearme.app`). Keys are never echoed back into tool
 * responses.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface DearMeWorkbenchServerConfig {
  /** DearMe API key (dm_sk_*). Required for live calls; tests stub via fetch. */
  apiKey?: string;
  /** DearMe API base URL, default https://api.dearme.app. */
  proxyUrl?: string;
  /** Injectable fetch — used by tests to stub network without polluting env. */
  fetchImpl?: typeof fetch;
}

interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const WORKBENCH_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "workbench.list_work_ready",
    description:
      "List DearMe work-ready items awaiting launch or operator attention. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Optional company scope.",
        },
        limit: {
          type: "number",
          description: "Optional maximum number of items to return.",
        },
      },
    },
  },
  {
    name: "workbench.list_decisions",
    description:
      "List DearMe launch decisions and decision requests. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Optional company scope.",
        },
        limit: {
          type: "number",
          description: "Optional maximum number of decisions to return.",
        },
      },
    },
  },
  {
    name: "workbench.read_output",
    description:
      "Read a specific DearMe workbench output by outputId. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        outputId: {
          type: "string",
          description: "Required output identifier.",
        },
      },
      required: ["outputId"],
    },
  },
];

type CallResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(text: string): CallResult {
  return { content: [{ type: "text", text }] };
}

function fail(text: string): CallResult {
  return { content: [{ type: "text", text }], isError: true };
}

function resolveConfig(
  config: DearMeWorkbenchServerConfig,
): Required<Omit<DearMeWorkbenchServerConfig, "fetchImpl">> & {
  fetchImpl: typeof fetch;
} {
  const apiKey = config.apiKey ?? process.env.DEARME_API_KEY ?? "";
  const proxyUrl =
    config.proxyUrl ?? process.env.DEARME_PROXY_URL ?? "https://api.dearme.app";
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  return { apiKey, proxyUrl, fetchImpl };
}

function addOptionalQuery(url: URL, args: Record<string, unknown>): void {
  if (typeof args.companyId === "string" && args.companyId) {
    url.searchParams.set("companyId", args.companyId);
  }
  if (
    (typeof args.limit === "number" && Number.isFinite(args.limit)) ||
    (typeof args.limit === "string" && args.limit)
  ) {
    url.searchParams.set("limit", String(args.limit));
  }
}

async function dispatchGet(
  toolName: string,
  url: URL,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  if (!config.apiKey) {
    return fail(
      `${toolName}: DEARME_API_KEY (dm_sk_*) is not configured for this MCP server.`,
    );
  }
  try {
    const response = await config.fetchImpl(String(url), {
      method: "GET",
      headers: { authorization: `Bearer ${config.apiKey}` },
    });
    if (!response.ok) {
      return fail(
        `${toolName}: upstream returned ${response.status} ${response.statusText}`,
      );
    }
    return ok(await response.text());
  } catch (e) {
    return fail(`${toolName}: ${(e as Error).message}`);
  }
}

async function dispatchListWorkReady(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const url = new URL("/v1/workbench/work-ready", config.proxyUrl);
  addOptionalQuery(url, args);
  return dispatchGet("workbench.list_work_ready", url, config);
}

async function dispatchListDecisions(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const url = new URL("/v1/workbench/decisions", config.proxyUrl);
  addOptionalQuery(url, args);
  return dispatchGet("workbench.list_decisions", url, config);
}

async function dispatchReadOutput(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const outputId = typeof args.outputId === "string" ? args.outputId : "";
  if (!outputId) return fail("workbench.read_output: `outputId` is required.");
  const url = new URL(
    `/v1/workbench/output/${encodeURIComponent(outputId)}`,
    config.proxyUrl,
  );
  return dispatchGet("workbench.read_output", url, config);
}

export function createWorkbenchServer(
  config: DearMeWorkbenchServerConfig = {},
): Server {
  const resolved = resolveConfig(config);

  const server = new Server(
    { name: "dearme-workbench", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: WORKBENCH_TOOL_DESCRIPTORS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "workbench.list_work_ready":
        return dispatchListWorkReady(args ?? {}, resolved);
      case "workbench.list_decisions":
        return dispatchListDecisions(args ?? {}, resolved);
      case "workbench.read_output":
        return dispatchReadOutput(args ?? {}, resolved);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export const WORKBENCH_TOOLS = WORKBENCH_TOOL_DESCRIPTORS.map((t) => t.name);

export const __testHelpers = {
  resolveConfig,
  dispatchListWorkReady,
  dispatchListDecisions,
  dispatchReadOutput,
};
