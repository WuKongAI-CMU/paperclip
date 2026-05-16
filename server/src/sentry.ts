import * as Sentry from "@sentry/node";
import type { Event, NodeClient } from "@sentry/node";
import type { Request } from "express";
import { redactLogValue } from "./middleware/logger.js";

type SentryEnv = Partial<Pick<
  NodeJS.ProcessEnv,
  | "DEARME_SENTRY_DSN"
  | "SENTRY_DSN"
  | "DEARME_SENTRY_ENABLED"
  | "DEARME_SENTRY_ENVIRONMENT"
  | "NODE_ENV"
  | "DEARME_SENTRY_RELEASE"
  | "SENTRY_RELEASE"
  | "GITHUB_SHA"
  | "DEARME_SENTRY_TRACES_SAMPLE_RATE"
>>;

export type DearMeSentryServerConfig = {
  enabled: boolean;
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate: number;
};

function readTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseSampleRate(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0;
  return parsed;
}

export function resolveDearMeSentryServerConfig(env: SentryEnv = process.env): DearMeSentryServerConfig {
  const dsn = readTrimmed(env.DEARME_SENTRY_DSN) ?? readTrimmed(env.SENTRY_DSN);
  const enabledFlag = readTrimmed(env.DEARME_SENTRY_ENABLED)?.toLowerCase();
  const explicitlyDisabled = enabledFlag === "0" || enabledFlag === "false" || enabledFlag === "off";
  return {
    enabled: Boolean(dsn) && !explicitlyDisabled,
    dsn,
    environment: readTrimmed(env.DEARME_SENTRY_ENVIRONMENT) ?? readTrimmed(env.NODE_ENV),
    release: readTrimmed(env.DEARME_SENTRY_RELEASE) ?? readTrimmed(env.SENTRY_RELEASE) ?? readTrimmed(env.GITHUB_SHA),
    tracesSampleRate: parseSampleRate(env.DEARME_SENTRY_TRACES_SAMPLE_RATE),
  };
}

export function scrubDearMeSentryEvent<T extends Event>(event: T): T {
  const scrubbed = redactLogValue(event) as T;
  if (scrubbed.user) {
    scrubbed.user = scrubbed.user.id ? { id: String(scrubbed.user.id) } : {};
  }
  return scrubbed;
}

export function initDearMeSentry(config = resolveDearMeSentryServerConfig()): NodeClient | undefined {
  if (!config.enabled || !config.dsn) return undefined;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubDearMeSentryEvent(event);
    },
  });
  return Sentry.getClient();
}

export function captureDearMeServerException(error: unknown, req?: Request): void {
  if (!Sentry.getClient()) return;
  Sentry.withScope((scope) => {
    const requestId = (req as (Request & { id?: unknown }) | undefined)?.id;
    if (requestId) scope.setTag("requestId", String(requestId));
    if (req?.actor?.userId) scope.setUser({ id: req.actor.userId });
    if (req?.actor?.companyId) scope.setTag("companyId", req.actor.companyId);
    Sentry.captureException(error);
  });
}
