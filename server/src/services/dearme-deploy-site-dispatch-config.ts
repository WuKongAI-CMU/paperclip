import type { DearMeDeploySiteDispatchConfig } from "./dearme-deploy-site-dispatch.js";

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function booleanFlag(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function resolveDearMeDeploySiteDispatchConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeDeploySiteDispatchConfig | null {
  const siteBaseUrl =
    nonEmpty(env.DEARME_DEPLOY_SITE_BASE_URL) ??
    nonEmpty(env.DEARME_SITE_BASE_URL) ??
    nonEmpty(env.DEARME_PUBLIC_SITE_BASE_URL);
  const allowProduction =
    booleanFlag(env.DEARME_DEPLOY_SITE_ALLOW_PRODUCTION) ??
    booleanFlag(env.DEARME_SITE_ALLOW_PRODUCTION) ??
    false;
  const allowCustomDomains =
    booleanFlag(env.DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS) ??
    booleanFlag(env.DEARME_SITE_ALLOW_CUSTOM_DOMAINS) ??
    false;

  if (!siteBaseUrl && !allowProduction && !allowCustomDomains) return null;

  return {
    ...(siteBaseUrl ? { siteBaseUrl } : {}),
    allowProduction,
    allowCustomDomains,
  };
}
