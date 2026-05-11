import type { DearMeMetaCampaignDispatchConfig } from "./dearme-meta-campaign-dispatch.js";

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function resolveDearMeMetaCampaignDispatchConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeMetaCampaignDispatchConfig | null {
  const graphApiBaseUrl =
    nonEmpty(env.DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL) ??
    nonEmpty(env.DEARME_META_GRAPH_API_BASE_URL) ??
    nonEmpty(env.META_GRAPH_API_BASE_URL);

  if (!graphApiBaseUrl) return null;

  return { graphApiBaseUrl };
}
