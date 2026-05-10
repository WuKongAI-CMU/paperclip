import {
  MODEL_ROUTING_TABLE,
  pickModelForComplexity,
  type ModelRoutingRow,
  type ModelRoutingTier,
} from "@paperclipai/dearme-agent-prompts/state-machines";

export type DearMeProxyModelRoutingTier = ModelRoutingTier;
export type DearMeProxyModelRoutingRow = ModelRoutingRow;

export interface DearMeProxyModelRoutingResolution extends ModelRoutingRow {
  /** Caller-provided complexity after the current clamp-and-round rule. */
  complexity: number;
}

/**
 * Proxy-side alias for the canonical DearMe routing table.
 *
 * The proxy package owns the customer-facing contract, but the table itself
 * stays single-sourced in the prompt package to avoid threshold drift.
 */
export const DEARME_PROXY_MODEL_ROUTING_TABLE: ReadonlyArray<DearMeProxyModelRoutingRow> =
  MODEL_ROUTING_TABLE;

/**
 * Resolve the DearMe proxy routing contract for a caller-provided complexity.
 *
 * This is a thin adaptation over the canonical prompt-package router. It keeps
 * the clamp behavior and tier thresholds in one place while giving consumers a
 * proxy-owned helper name.
 */
export function resolveDearMeProxyModelRouting(
  complexity: number,
): DearMeProxyModelRoutingResolution {
  const route = pickModelForComplexity(complexity);
  return {
    ...route,
    complexity: Math.max(1, Math.min(10, Math.round(complexity))),
  };
}

/**
 * Proxy-owned alias for the canonical prompt-package picker.
 *
 * Kept for callers that want the row contract directly.
 */
export const pickDearMeProxyModelForComplexity = pickModelForComplexity;
