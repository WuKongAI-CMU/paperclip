/**
 * DearMe Voice MCP server.
 *
 * DearMe-specific (no clawdbob equivalent). This is the minimum-viable
 * server promised in `docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md` (dm-cb-02).
 *
 * Exposes two tools to MCP-aware clients (OpenClaw, Claude Desktop, Claude
 * Code, any IDE plugin):
 *   - `voice.score`        — score a candidate draft against the user's
 *                            voice fingerprint via DearMe's `/v1/voice/score`
 *                            HTTPS endpoint. Equivalent to what the cloud
 *                            Voice Gate uses today; surfaced here so an
 *                            external agent can stay in the loop without
 *                            re-implementing the scorer.
 *   - `voice.profile.get`  — return the current voice profile snapshot for
 *                            the user (handle, sample count, drift signal),
 *                            sourced from `/v1/voice/profile`.
 *
 * Auth: the server expects a DearMe `dm_sk_*` API key in env
 * (`DEARME_API_KEY`) and proxies to `DEARME_PROXY_URL`
 * (default `https://api.dearme.app`). Keys are never echoed back into tool
 * responses.
 *
 * This server is intentionally small. Heavier integration (Workbench MCP,
 * Memory MCP) is a separate slice — see CLAWDBOB-ABSORPTION-PLAN.md
 * §"dm-cb-04 onward".
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export interface DearMeVoiceServerConfig {
  /** DearMe API key (dm_sk_*). Required for live calls; tests stub via fetch. */
  apiKey?: string;
  /** DearMe API base URL, default https://api.dearme.app. */
  proxyUrl?: string;
  /** User handle, default derived from DEARME_USER_HANDLE env. */
  userHandle?: string;
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

export const VOICE_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "voice.score",
    description:
      "Score a candidate draft against the user's voice fingerprint. Returns score, status (accept/revise/reject), and reasons. Use BEFORE publishing or sending any content the user did not write themselves.",
    inputSchema: {
      type: "object",
      properties: {
        draft: { type: "string", description: "The candidate text to score." },
        channel: {
          type: "string",
          description: "Optional channel context (x_post, linkedin_dm, email, etc.).",
        },
      },
      required: ["draft"],
    },
  },
  {
    name: "voice.profile.get",
    description:
      "Return a snapshot of the current voice profile (sample count, drift indicator). Read-only.",
    inputSchema: {
      type: "object",
      properties: {},
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
  config: DearMeVoiceServerConfig,
): Required<Omit<DearMeVoiceServerConfig, "fetchImpl">> & {
  fetchImpl: typeof fetch;
} {
  const apiKey = config.apiKey ?? process.env.DEARME_API_KEY ?? "";
  const proxyUrl =
    config.proxyUrl ?? process.env.DEARME_PROXY_URL ?? "https://api.dearme.app";
  const userHandle =
    config.userHandle ?? process.env.DEARME_USER_HANDLE ?? "anonymous";
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  return { apiKey, proxyUrl, userHandle, fetchImpl };
}

async function dispatchVoiceScore(
  args: Record<string, unknown>,
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  const draft = typeof args.draft === "string" ? args.draft : "";
  if (!draft) return fail("voice.score: `draft` is required.");
  const channel =
    typeof args.channel === "string" ? args.channel : "unspecified";
  if (!config.apiKey) {
    return fail(
      "voice.score: DEARME_API_KEY (dm_sk_*) is not configured for this MCP server.",
    );
  }
  try {
    const response = await config.fetchImpl(
      `${config.proxyUrl}/v1/voice/score`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          draft,
          channel,
          userHandle: config.userHandle,
        }),
      },
    );
    if (!response.ok) {
      return fail(
        `voice.score: upstream returned ${response.status} ${response.statusText}`,
      );
    }
    const body = await response.json();
    return ok(JSON.stringify(body, null, 2));
  } catch (e) {
    return fail(`voice.score: ${(e as Error).message}`);
  }
}

async function dispatchVoiceProfileGet(
  config: ReturnType<typeof resolveConfig>,
): Promise<CallResult> {
  if (!config.apiKey) {
    return fail(
      "voice.profile.get: DEARME_API_KEY (dm_sk_*) is not configured for this MCP server.",
    );
  }
  try {
    const response = await config.fetchImpl(
      `${config.proxyUrl}/v1/voice/profile?handle=${encodeURIComponent(config.userHandle)}`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${config.apiKey}` },
      },
    );
    if (!response.ok) {
      return fail(
        `voice.profile.get: upstream returned ${response.status} ${response.statusText}`,
      );
    }
    const body = await response.json();
    return ok(JSON.stringify(body, null, 2));
  } catch (e) {
    return fail(`voice.profile.get: ${(e as Error).message}`);
  }
}

export function createVoiceServer(
  config: DearMeVoiceServerConfig = {},
): Server {
  const resolved = resolveConfig(config);

  const server = new Server(
    { name: "dearme-voice", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: VOICE_TOOL_DESCRIPTORS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "voice.score":
        return dispatchVoiceScore(args ?? {}, resolved);
      case "voice.profile.get":
        return dispatchVoiceProfileGet(resolved);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export const VOICE_TOOLS = VOICE_TOOL_DESCRIPTORS.map((t) => t.name);

export const __testHelpers = {
  resolveConfig,
  dispatchVoiceScore,
  dispatchVoiceProfileGet,
};
