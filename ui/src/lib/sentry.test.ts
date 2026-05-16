import { describe, expect, it, vi } from "vitest";
import {
  initDearMeSentry,
  resolveDearMeSentryBrowserConfig,
  scrubDearMeSentryBrowserEvent,
} from "./sentry";

const sentryInit = vi.hoisted(() => vi.fn());

vi.mock("@sentry/react", () => ({
  init: sentryInit,
}));

describe("DearMe browser Sentry", () => {
  it("stays disabled without a DSN", () => {
    expect(resolveDearMeSentryBrowserConfig({ MODE: "production" })).toMatchObject({
      enabled: false,
      tracesSampleRate: 0,
    });
  });

  it("initializes only when browser env provides a DSN", async () => {
    sentryInit.mockReset();

    const initialized = await initDearMeSentry(resolveDearMeSentryBrowserConfig({
      VITE_DEARME_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
      VITE_DEARME_SENTRY_ENVIRONMENT: "production",
      VITE_DEARME_SENTRY_RELEASE: "release-1",
      VITE_DEARME_SENTRY_TRACES_SAMPLE_RATE: "0.1",
    }));

    expect(initialized).toBe(true);
    expect(sentryInit).toHaveBeenCalledWith(expect.objectContaining({
      dsn: "https://public@example.ingest.sentry.io/1",
      environment: "production",
      release: "release-1",
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    }));
  });

  it("scrubs PII and secret-shaped values before sending events", () => {
    const event = scrubDearMeSentryBrowserEvent({
      message: "failed for founder@example.com with phc_abcdef",
      user: {
        id: "user_123",
        email: "founder@example.com",
        username: "founder@example.com",
        ip_address: "203.0.113.10",
      },
      request: {
        headers: {
          authorization: "Bearer dm_sk_abcdef",
          cookie: "session=re_1234567890",
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
