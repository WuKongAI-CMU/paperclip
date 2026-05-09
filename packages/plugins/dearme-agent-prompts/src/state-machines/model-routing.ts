/**
 * Complexity → model routing table used by the DearMe AI proxy.
 *
 * Roles emit a `complexity` integer (1-10) on each LLM call; the proxy maps
 * that to a concrete model. No client-side model picker — DearMe is a
 * cost-aware product, not a model-selector UI.
 *
 * Lineage: routing table shape adapted from DearMe internal cost-research.
 */

export type ModelRoutingTier = "fast" | "balanced" | "deep";

export interface ModelRoutingRow {
  tier: ModelRoutingTier;
  complexityMin: number;
  complexityMax: number;
  /** Anthropic / OpenAI / Google model identifier. */
  model: string;
  /** Approx blended USD per million tokens at typical prompt:completion ratio. */
  approxBlendedUsdPerMTokens: number;
}

/**
 * Default DearMe routing table. Plugins must not override; the proxy may
 * however substitute a cheaper model when the user is on a tighter monthly
 * budget tier.
 */
export const MODEL_ROUTING_TABLE: ReadonlyArray<ModelRoutingRow> = [
  {
    tier: "fast",
    complexityMin: 1,
    complexityMax: 3,
    model: "gemini-2.0-flash-lite",
    approxBlendedUsdPerMTokens: 0.18,
  },
  {
    tier: "balanced",
    complexityMin: 4,
    complexityMax: 6,
    model: "claude-haiku-4-5",
    approxBlendedUsdPerMTokens: 3.0,
  },
  {
    tier: "deep",
    complexityMin: 7,
    complexityMax: 10,
    model: "claude-sonnet-4-6",
    approxBlendedUsdPerMTokens: 9.0,
  },
];

export function pickModelForComplexity(
  complexity: number,
): ModelRoutingRow {
  const clamped = Math.max(1, Math.min(10, Math.round(complexity)));
  for (const row of MODEL_ROUTING_TABLE) {
    if (clamped >= row.complexityMin && clamped <= row.complexityMax) {
      return row;
    }
  }
  return MODEL_ROUTING_TABLE[0];
}
