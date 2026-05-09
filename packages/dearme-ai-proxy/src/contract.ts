/**
 * DearMe AI proxy wire contract.
 *
 * Two HTTP surfaces sit behind the same API key family `dm_sk_*`:
 *
 *   POST {baseURL}/v1/chat/completions   OpenAI-compatible
 *   POST {baseURL}/v1/messages           Anthropic-compatible
 *   POST {baseURL}/agent/run             Tool-using agent runner
 *
 * Cost attribution rides as side-channel headers / non-standard fields:
 *   - `task` field on OpenAI requests (logged into the cost ledger)
 *   - `X-Subscription-ID` header on Anthropic requests
 *
 * Complexity is set by the caller (1-10). The proxy enforces routing.
 *
 * Lineage: dual-protocol shape and cost-attribution side-channels
 * adapted from research-captured production behavior in
 * `lib/dearme-ai.js` of the engine starter template.
 */

export const DM_API_KEY_PREFIX = "dm_sk_";

export const DM_PROXY_BASE_URL_DEFAULT = "https://dearme.app/api/proxy/ai";

export const DM_PROXY_HEADERS = {
  /** Cost-attribution side channel for Anthropic-compat calls. */
  subscriptionId: "X-Subscription-ID",
  /** Per-request cost-attribution side channel for OpenAI-compat calls. */
  task: "X-DearMe-Task",
  /** API key auth (Bearer). */
  authorization: "Authorization",
  /** Forces a specific routing tier instead of complexity-derived routing. */
  modelTier: "X-DearMe-Model-Tier",
  /** Anonymous correlation id (for cost-ledger replay & cache stats). */
  correlationId: "X-DearMe-Correlation-Id",
} as const;

export interface OpenAiChatRequestExtensions {
  /** Cost-attribution string ("daily-cycle", "first-run", etc.). */
  task?: string;
  /** Complexity 1-10. Maps to fast/balanced/deep tier in the proxy. */
  complexity?: number;
  /** Override tier directly. */
  tier?: "fast" | "balanced" | "deep";
}

export interface AnthropicMessagesRequestExtensions {
  /** Required for cost attribution per cycle / per company. */
  subscriptionId?: string;
  complexity?: number;
  tier?: "fast" | "balanced" | "deep";
}

export interface AgentRunRequest {
  prompt: string;
  /** Subset of MCP server names this agent run may invoke. */
  mcpServers?: ReadonlyArray<string>;
  /** Cost attribution. */
  task?: string;
  subscriptionId?: string;
  /** 1-10. Maps to fast/balanced/deep. */
  complexity?: number;
  /** Hard upper bound on agent loop turns. Default 25. */
  maxTurns?: number;
}

export interface AgentRunResponse {
  /** Concatenated final text output. */
  output: string;
  /** Tool calls the agent emitted, in order. */
  toolCalls: ReadonlyArray<{
    name: string;
    arguments: unknown;
    result?: unknown;
  }>;
  /** Tokens charged to the cost ledger for this run. */
  tokensUsed: {
    input: number;
    output: number;
    cacheCreate: number;
    cacheRead: number;
  };
  /** Tier the proxy picked for this run. */
  tier: "fast" | "balanced" | "deep";
  /** Underlying provider model id used. */
  model: string;
  /** Correlation id for cost-ledger cross-reference. */
  correlationId: string;
}

/** Cost-ledger event the proxy emits per terminal call. */
export interface CostLedgerEvent {
  correlationId: string;
  occurredAt: string;
  companyId: string;
  task: string;
  tier: "fast" | "balanced" | "deep";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  blendedUsdMicros: number;
  /** True when the request hit Anthropic prompt cache. */
  cacheHit: boolean;
}

/** Validates that a key string starts with the dm_sk_ prefix. */
export function isDearMeApiKey(value: string): boolean {
  return typeof value === "string" && value.startsWith(DM_API_KEY_PREFIX);
}
