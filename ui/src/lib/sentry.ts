import type { Event } from "@sentry/react";

type DearMeSentryBrowserEnv = Record<string, string | boolean | undefined>;

type DearMeSentryBrowserConfig = {
  enabled: boolean;
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate: number;
};

const LOG_REDACTION_TOKEN = "***REDACTED***";
const SENSITIVE_EVENT_KEY_RE =
  /^(authorization|password|passwd|secret|token|api[-_]?key|cookie|set-cookie)$/i;
const SENSITIVE_EVENT_VALUE_RE =
  /\b(?:dm_sk_[A-Za-z0-9_-]+|re_[A-Za-z0-9_-]{8,}|sk_live_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+|phc_[A-Za-z0-9_-]+)\b/g;
const EMAIL_EVENT_VALUE_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function readTrimmed(value: string | boolean | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseSampleRate(value: string | boolean | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0;
  return parsed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function scrubText(value: string): string {
  return value
    .replace(SENSITIVE_EVENT_VALUE_RE, LOG_REDACTION_TOKEN)
    .replace(EMAIL_EVENT_VALUE_RE, LOG_REDACTION_TOKEN);
}

function scrubValue<T>(value: T): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map((entry) => scrubValue(entry)) as T;
  if (!isPlainObject(value)) return value;

  const scrubbed: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    scrubbed[key] = SENSITIVE_EVENT_KEY_RE.test(key) ? LOG_REDACTION_TOKEN : scrubValue(entry);
  }
  return scrubbed as T;
}

export function resolveDearMeSentryBrowserConfig(
  env: DearMeSentryBrowserEnv = import.meta.env,
): DearMeSentryBrowserConfig {
  const dsn = readTrimmed(env.VITE_DEARME_SENTRY_DSN) ?? readTrimmed(env.VITE_SENTRY_DSN);
  const enabledFlag = readTrimmed(env.VITE_DEARME_SENTRY_ENABLED)?.toLowerCase();
  const explicitlyDisabled = enabledFlag === "0" || enabledFlag === "false" || enabledFlag === "off";
  return {
    enabled: Boolean(dsn) && !explicitlyDisabled,
    dsn,
    environment: readTrimmed(env.VITE_DEARME_SENTRY_ENVIRONMENT) ?? readTrimmed(env.MODE),
    release: readTrimmed(env.VITE_DEARME_SENTRY_RELEASE),
    tracesSampleRate: parseSampleRate(env.VITE_DEARME_SENTRY_TRACES_SAMPLE_RATE),
  };
}

export function scrubDearMeSentryBrowserEvent<T extends Event>(event: T): T {
  const scrubbed = scrubValue(event);
  if (scrubbed.user) {
    scrubbed.user = scrubbed.user.id ? { id: String(scrubbed.user.id) } : {};
  }
  return scrubbed;
}

export async function initDearMeSentry(config = resolveDearMeSentryBrowserConfig()): Promise<boolean> {
  if (!config.enabled || !config.dsn) return false;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubDearMeSentryBrowserEvent(event);
    },
  });
  return true;
}
