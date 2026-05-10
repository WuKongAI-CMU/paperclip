import type { CostLedgerEvent } from "./contract.js";
import type { DearMeProxyModelRoutingTier } from "./model-routing.js";

export const DEARME_PROMPT_CACHE_READ_RATIO_TARGET = 0.9;

export const DEARME_PROXY_CACHE_READ_TARGET_RATIO =
  DEARME_PROMPT_CACHE_READ_RATIO_TARGET;

export type DearMePromptCacheTtl = "5m" | "1h";

export interface DearMePromptCacheControl {
  type: "ephemeral";
  /**
   * Anthropic defaults to 5 minutes when ttl is omitted. Keep the omitted form
   * as the normal 5m marker so requests stay compatible with older callers.
   */
  ttl?: DearMePromptCacheTtl;
}

export const DEARME_PROMPT_CACHE_CONTROL_5M = {
  type: "ephemeral",
} as const satisfies DearMePromptCacheControl;

export const DEARME_PROMPT_CACHE_CONTROL_1H = {
  type: "ephemeral",
  ttl: "1h",
} as const satisfies DearMePromptCacheControl;

export interface DearMeCacheableBlock {
  cache_control?: DearMePromptCacheControl;
  [key: string]: unknown;
}

export function markDearMePromptCacheBreakpoint<T extends DearMeCacheableBlock>(
  block: T,
  options: { ttl?: DearMePromptCacheTtl } = {},
): T & { cache_control: DearMePromptCacheControl } {
  const cacheControl =
    options.ttl === "1h"
      ? DEARME_PROMPT_CACHE_CONTROL_1H
      : DEARME_PROMPT_CACHE_CONTROL_5M;
  return {
    ...block,
    cache_control: cacheControl,
  };
}

export interface DearMeProxyUsageLike {
  input_tokens?: number;
  inputTokens?: number;
  prompt_tokens?: number;
  promptTokens?: number;
  output_tokens?: number;
  outputTokens?: number;
  completion_tokens?: number;
  completionTokens?: number;
  cache_creation_input_tokens?: number;
  cacheCreationInputTokens?: number;
  cache_read_input_tokens?: number;
  cacheReadInputTokens?: number;
  cached_input_tokens?: number;
  cachedInputTokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    cachedTokens?: number;
  };
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

export interface DearMeProxyNormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheCreate5mTokens: number;
  cacheCreate1hTokens: number;
  cacheReadTokens: number;
  totalInputTokens: number;
  cacheHit: boolean;
  cacheReadRatio: number;
  cacheWriteRatio: number;
}

export interface DearMeProxyCacheAccounting {
  cacheCreateTokens: number;
  cacheReadTokens: number;
}

export interface DearMeProxyCacheEconomicsSummary extends DearMeProxyCacheAccounting {
  cacheReadRatio: number;
  cacheSavingsTokens: number;
}

function asTokenCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function ratio(part: number, total: number): number {
  if (total <= 0) return 0;
  return Number((part / total).toFixed(4));
}

export function normalizeDearMeProxyUsage(
  usage: DearMeProxyUsageLike,
): DearMeProxyNormalizedUsage {
  const cacheCreate5mTokens = asTokenCount(
    usage.cache_creation?.ephemeral_5m_input_tokens,
  );
  const cacheCreate1hTokens = asTokenCount(
    usage.cache_creation?.ephemeral_1h_input_tokens,
  );
  const cacheCreateFromBreakdown = cacheCreate5mTokens + cacheCreate1hTokens;
  const cacheCreateTokens = asTokenCount(
    usage.cache_creation_input_tokens ?? usage.cacheCreationInputTokens,
  ) || cacheCreateFromBreakdown;
  const cacheReadTokens = asTokenCount(
    usage.cache_read_input_tokens ??
      usage.cacheReadInputTokens ??
      usage.cached_input_tokens ??
      usage.cachedInputTokens ??
      usage.prompt_tokens_details?.cached_tokens ??
      usage.prompt_tokens_details?.cachedTokens,
  );
  const inputTokens = asTokenCount(
    usage.input_tokens ??
      usage.inputTokens ??
      usage.prompt_tokens ??
      usage.promptTokens,
  );
  const outputTokens = asTokenCount(
    usage.output_tokens ??
      usage.outputTokens ??
      usage.completion_tokens ??
      usage.completionTokens,
  );
  const totalInputTokens = inputTokens + cacheCreateTokens + cacheReadTokens;

  return {
    inputTokens,
    outputTokens,
    cacheCreateTokens,
    cacheCreate5mTokens,
    cacheCreate1hTokens,
    cacheReadTokens,
    totalInputTokens,
    cacheHit: cacheReadTokens > 0,
    cacheReadRatio: ratio(cacheReadTokens, totalInputTokens),
    cacheWriteRatio: ratio(cacheCreateTokens, totalInputTokens),
  };
}

export function buildDearMeProxyCacheAccounting(
  input: Pick<CostLedgerEvent, "cacheCreateTokens" | "cacheReadTokens">,
): DearMeProxyCacheAccounting {
  return {
    cacheCreateTokens: asTokenCount(input.cacheCreateTokens),
    cacheReadTokens: asTokenCount(input.cacheReadTokens),
  };
}

export function summarizeDearMeProxyCacheEconomics(
  input: DearMeProxyCacheAccounting,
): DearMeProxyCacheEconomicsSummary {
  const accounting = buildDearMeProxyCacheAccounting(input);
  const cacheTrafficTokens = accounting.cacheCreateTokens + accounting.cacheReadTokens;
  return {
    ...accounting,
    cacheReadRatio: ratio(accounting.cacheReadTokens, cacheTrafficTokens),
    cacheSavingsTokens: accounting.cacheReadTokens,
  };
}

export interface DearMeCostLedgerEventInput {
  correlationId: string;
  occurredAt: string;
  companyId: string;
  task: string;
  tier: DearMeProxyModelRoutingTier;
  model: string;
  usage: DearMeProxyUsageLike;
  blendedUsdMicros: number;
}

export function buildDearMeCostLedgerEvent(
  input: DearMeCostLedgerEventInput,
): CostLedgerEvent {
  const usage = normalizeDearMeProxyUsage(input.usage);
  return {
    correlationId: input.correlationId,
    occurredAt: input.occurredAt,
    companyId: input.companyId,
    task: input.task,
    tier: input.tier,
    model: input.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreateTokens: usage.cacheCreateTokens,
    cacheReadTokens: usage.cacheReadTokens,
    blendedUsdMicros: Math.max(0, Math.floor(input.blendedUsdMicros)),
    cacheHit: usage.cacheHit,
  };
}
