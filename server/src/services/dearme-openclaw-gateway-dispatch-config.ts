import type { DearMeOpenClawGatewayDispatchConfig } from "./dearme-openclaw-gateway-dispatch.js";

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function normalizeBearer(value: string): string {
  return value.replace(/^Bearer\s+/i, "").trim();
}

export function resolveDearMeOpenClawGatewayDispatchConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeOpenClawGatewayDispatchConfig | null {
  const url = nonEmpty(env.OPENCLAW_GATEWAY_URL);
  if (!url) return null;

  const webhookAuth = nonEmpty(env.OPENCLAW_WEBHOOK_AUTH);
  const token =
    nonEmpty(env.OPENCLAW_GATEWAY_TOKEN) ??
    (webhookAuth ? normalizeBearer(webhookAuth) : null);

  return {
    url,
    headers: token ? { "x-openclaw-token": token } : null,
    paperclipApiUrl: nonEmpty(env.PAPERCLIP_API_URL),
  };
}
