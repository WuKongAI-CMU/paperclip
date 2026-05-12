import type {
  DearMeProviderSmokeReadiness,
  DearMeProviderSmokeTarget,
} from "./dearme-provider-smoke.ts";

export interface DearMeProofFactNeed {
  label: string;
  provideAs: string;
  targets: DearMeProviderSmokeTarget[];
  sensitive: boolean;
}

export function describeDearMeProofFactNeed(
  requirement: string,
): Omit<DearMeProofFactNeed, "targets"> {
  switch (requirement) {
    case "DEARME_LINKEDIN_DM_MESSAGES_URL":
      return {
        label: "LinkedIn partner messages endpoint",
        provideAs: "DEARME_LINKEDIN_DM_MESSAGES_URL",
        sensitive: false,
      };
    case "DEARME_LINKEDIN_DM_CREDENTIAL_JSON or DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE":
      return {
        label: "LinkedIn send credential",
        provideAs: "DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE or DEARME_LINKEDIN_DM_CREDENTIAL_JSON",
        sensitive: true,
      };
    case "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN":
      return {
        label: "LinkedIn approved smoke recipient",
        provideAs: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
        sensitive: false,
      };
    case "DEARME_LINKEDIN_DM_SMOKE_BODY":
      return {
        label: "LinkedIn private-proof message body",
        provideAs: "DEARME_LINKEDIN_DM_SMOKE_BODY",
        sensitive: false,
      };
    case "OPENCLAW_GATEWAY_URL":
      return {
        label: "OpenClaw gateway URL",
        provideAs: "OPENCLAW_GATEWAY_URL or DEARME_USE_LOCAL_OPENCLAW_CONFIG=1",
        sensitive: false,
      };
    case "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH":
      return {
        label: "OpenClaw gateway auth",
        provideAs: "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
        sensitive: true,
      };
    case "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT":
      return {
        label: "Telegram approved smoke recipient",
        provideAs: "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT or local Telegram smoke config",
        sensitive: false,
      };
    case "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY":
      return {
        label: "Telegram private-proof message body",
        provideAs: "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY",
        sensitive: false,
      };
    case "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT":
      return {
        label: "iMessage/SMS approved smoke recipient",
        provideAs: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        sensitive: false,
      };
    case "DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY":
      return {
        label: "iMessage/SMS private-proof message body",
        provideAs: "DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY",
        sensitive: false,
      };
    case "DEARME_META_CAMPAIGN_CREDENTIAL_JSON or DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE":
      return {
        label: "Meta campaign credential",
        provideAs: "DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE or DEARME_META_CAMPAIGN_CREDENTIAL_JSON",
        sensitive: true,
      };
    case "DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1":
      return {
        label: "Production host opt-in",
        provideAs: "DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1",
        sensitive: false,
      };
    case "DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1":
      return {
        label: "Custom domain opt-in",
        provideAs: "DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1",
        sensitive: false,
      };
    case "DEARME_DEPLOY_SITE_BASE_URL":
      return {
        label: "Hosted private proof base URL",
        provideAs: "DEARME_DEPLOY_SITE_BASE_URL",
        sensitive: false,
      };
    case "DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=dist/dearme-private-proof/<handle>/index.html":
      return {
        label: "Exported private proof page artifact",
        provideAs: "DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF",
        sensitive: false,
      };
    default:
      return {
        label: requirement
          .replace(/^DEARME_/, "")
          .replace(/^OPENCLAW_/, "OpenClaw ")
          .replaceAll("_", " ")
          .toLowerCase(),
        provideAs: requirement,
        sensitive: /TOKEN|AUTH|CREDENTIAL|SECRET|PASSWORD/.test(requirement),
      };
  }
}

export function dearMeProofFactsNeededFromReadiness(
  readiness: readonly DearMeProviderSmokeReadiness[],
): DearMeProofFactNeed[] {
  const byRequirement = new Map<string, DearMeProofFactNeed>();
  for (const item of readiness) {
    if (item.ready) continue;
    for (const requirement of item.missing) {
      const existing = byRequirement.get(requirement);
      if (existing) {
        if (!existing.targets.includes(item.target)) existing.targets.push(item.target);
        continue;
      }
      byRequirement.set(requirement, {
        ...describeDearMeProofFactNeed(requirement),
        targets: [item.target],
      });
    }
  }
  return [...byRequirement.values()];
}
