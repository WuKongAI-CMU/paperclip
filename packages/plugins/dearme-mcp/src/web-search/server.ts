/**
 * DearMe Web Search MCP server.
 *
 * DearMe-specific wrapper for the Research role's web tools promised in
 * `docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md` (dm-cb-04).
 *
 * Exposes two tools to MCP-aware clients:
 *   - `web_search` — search the web through DearMe's research proxy.
 *   - `web_fetch`  — fetch and optionally prompt over a URL through DearMe's
 *                    research proxy.
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

export interface DearMeWebSearchServerConfig {
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

export const WEB_SEARCH_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "web_search",
    description:
      "Search the web through DearMe's research proxy. Use for source-backed personal-brand research, market scans, and current facts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
        depth: {
          type: "string",
          description: "Optional research depth hint for the proxy.",
        },
        limit: {
          type: "number",
          description: "Optional maximum number of results to return.",
        },
        includeDomains: {
          type: "array",
          items: { type: "string" },
          description: "Optional domains to include.",
        },
        excludeDomains: {
          type: "array",
          items: { type: "string" },
          description: "Optional domains to exclude.",
        },
        recencyDays: {
          type: "number",
          description: "Optional recency window in days.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description:
      "Fetch a URL through DearMe's research proxy and optionally apply a prompt over the fetched page.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch." },
        prompt: {
          type: "string",
          description: "Optional instruction for extracting or summarizing the page.",
        },
      },
      required: ["url"],
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
  config: DearMeWebSearchServerConfig,
): Required<Omit<DearMeWebSearchServerConfig, "fetchImpl">> & {
  fetchImpl: typeof fetch;
} {
  const apiKey = config.apiKey ?? process.env.DEARME_API_KEY ?? "";
  const proxyUrl =
    config.proxyUrl ?? process.env.DEARME_PROXY_URL ?? "https://api.dearme.app";
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  return { apiKey, proxyUrl, fetchImpl };
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

async function dispatchWebSearch(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const query = typeof args.query === "string" ? args.query : "";
  if (!query) return fail("web_search: `query` is required.");
  if (!config.apiKey) {
    return fail(
      "web_search: DEARME_API_KEY (dm_sk_*) is not configured for this MCP server.",
    );
  }

  const body: Record<string, unknown> = { query };
  if (typeof args.depth === "string") body.depth = args.depth;
  if (typeof args.limit === "number") body.limit = args.limit;
  const includeDomains = optionalStringArray(args.includeDomains);
  if (includeDomains) body.includeDomains = includeDomains;
  const excludeDomains = optionalStringArray(args.excludeDomains);
  if (excludeDomains) body.excludeDomains = excludeDomains;
  if (typeof args.recencyDays === "number") body.recencyDays = args.recencyDays;

  try {
    const response = await config.fetchImpl(
      `${config.proxyUrl}/v1/research/search`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      return fail(
        `web_search: upstream returned ${response.status} ${response.statusText}`,
      );
    }
    const responseBody = await response.json();
    return ok(JSON.stringify(responseBody, null, 2));
  } catch (e) {
    return fail(`web_search: ${(e as Error).message}`);
  }
}

async function dispatchWebFetch(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const url = typeof args.url === "string" ? args.url : "";
  if (!url) return fail("web_fetch: `url` is required.");
  if (!config.apiKey) {
    return fail(
      "web_fetch: DEARME_API_KEY (dm_sk_*) is not configured for this MCP server.",
    );
  }

  const body: Record<string, unknown> = { url };
  if (typeof args.prompt === "string") body.prompt = args.prompt;

  try {
    const response = await config.fetchImpl(
      `${config.proxyUrl}/v1/research/fetch`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      return fail(
        `web_fetch: upstream returned ${response.status} ${response.statusText}`,
      );
    }
    const responseBody = await response.json();
    return ok(JSON.stringify(responseBody, null, 2));
  } catch (e) {
    return fail(`web_fetch: ${(e as Error).message}`);
  }
}

export function createWebSearchServer(
  config: DearMeWebSearchServerConfig = {},
): Server {
  const resolved = resolveConfig(config);

  const server = new Server(
    { name: "dearme-web-search", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: WEB_SEARCH_TOOL_DESCRIPTORS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "web_search":
        return dispatchWebSearch(args ?? {}, resolved);
      case "web_fetch":
        return dispatchWebFetch(args ?? {}, resolved);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export const WEB_SEARCH_TOOLS = WEB_SEARCH_TOOL_DESCRIPTORS.map((t) => t.name);

export const __testHelpers = {
  resolveConfig,
  dispatchWebSearch,
  dispatchWebFetch,
};
