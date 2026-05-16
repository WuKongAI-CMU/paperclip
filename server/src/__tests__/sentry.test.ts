import { describe, expect, it } from "vitest";
import {
  resolveDearMeSentryServerConfig,
  scrubDearMeSentryEvent,
} from "../sentry.js";

describe("DearMe server Sentry", () => {
  it("stays disabled without a DSN", () => {
    expect(resolveDearMeSentryServerConfig({})).toMatchObject({
      enabled: false,
      tracesSampleRate: 0,
    });
  });

  it("uses env-gated config when a DSN is present", () => {
    expect(resolveDearMeSentryServerConfig({
      DEARME_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
      DEARME_SENTRY_ENVIRONMENT: "production",
      DEARME_SENTRY_RELEASE: "release-1",
      DEARME_SENTRY_TRACES_SAMPLE_RATE: "0.2",
    })).toEqual({
      enabled: true,
      dsn: "https://public@example.ingest.sentry.io/1",
      environment: "production",
      release: "release-1",
      tracesSampleRate: 0.2,
    });
  });

  it("scrubs PII and secret-shaped values before sending events", () => {
    const event = scrubDearMeSentryEvent({
      message: "failed for founder@example.com with sk_live_abc123",
      user: {
        id: "user_123",
        email: "founder@example.com",
        username: "founder@example.com",
        ip_address: "203.0.113.10",
      },
      request: {
        headers: {
          authorization: "Bearer re_1234567890",
          cookie: "session=dm_sk_abcdef",
        },
      },
      extra: {
        nested: {
          email: "customer@example.com",
          webhook: "whsec_abcdef",
        },
      },
    });

    expect(event.message).toBe("failed for ***REDACTED*** with ***REDACTED***");
    expect(event.user).toEqual({ id: "user_123" });
    expect(event.request?.headers).toEqual({
      authorization: "***REDACTED***",
      cookie: "***REDACTED***",
    });
    expect(event.extra).toEqual({
      nested: {
        email: "***REDACTED***",
        webhook: "***REDACTED***",
      },
    });
  });
});
