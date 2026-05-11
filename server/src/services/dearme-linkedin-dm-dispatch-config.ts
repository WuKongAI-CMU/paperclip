import type { DearMeLinkedInDmDispatchConfig } from "./dearme-linkedin-dm-dispatch.js";

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function resolveDearMeLinkedInDmDispatchConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeLinkedInDmDispatchConfig | null {
  const messagesUrl =
    nonEmpty(env.DEARME_LINKEDIN_DM_MESSAGES_URL) ??
    nonEmpty(env.DEARME_LINKEDIN_PARTNER_MESSAGES_URL) ??
    nonEmpty(env.LINKEDIN_DM_MESSAGES_URL);

  if (!messagesUrl) return null;

  return { messagesUrl };
}
