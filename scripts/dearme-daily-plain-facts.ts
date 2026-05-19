export const DAILY_PLAIN_API_KEY_ENV = "DEARME_PLAIN_API_KEY";
export const DAILY_PLAIN_PRIMARY_EMAIL_ENV = "DEARME_CODEX_DAILY_PLAIN_EMAIL";
export const DAILY_PLAIN_FALLBACK_EMAIL_ENV = "DEARME_PLAIN_DAILY_EMAIL";

type Env = Record<string, string | undefined>;

function configuredValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function dailyPlainSummaryFactsNeeded(env: Env = process.env): string[] {
  const facts: string[] = [];
  if (!configuredValue(env[DAILY_PLAIN_API_KEY_ENV])) {
    facts.push(`${DAILY_PLAIN_API_KEY_ENV} is missing.`);
  }
  if (
    !configuredValue(env[DAILY_PLAIN_PRIMARY_EMAIL_ENV])
    && !configuredValue(env[DAILY_PLAIN_FALLBACK_EMAIL_ENV])
  ) {
    facts.push(`${DAILY_PLAIN_PRIMARY_EMAIL_ENV} or ${DAILY_PLAIN_FALLBACK_EMAIL_ENV} is missing.`);
  }
  return facts;
}
