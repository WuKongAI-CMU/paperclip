import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { securityHeaders } from "../middleware/security-headers.js";

function createApp(options: { viteDev?: boolean } = {}) {
  const app = express();
  app.use(securityHeaders(options));
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

function getCspDirectives(header: string | undefined) {
  expect(header).toBeDefined();
  return new Map(
    header!.split(";").map((directive) => {
      const [name, ...values] = directive.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

describe("securityHeaders", () => {
  it("sets prod-grade security headers", async () => {
    const res = await request(createApp()).get("/healthz").expect(200);
    const csp = getCspDirectives(res.headers["content-security-policy"]);

    expect(res.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("script-src")).toEqual([
      "'self'",
      "https://posthog.com",
      "https://*.posthog.com",
      "https://api.posthog.com",
      "https://us.i.posthog.com",
    ]);
    const disallowedEvalSource = "'unsafe-" + "eval'";
    expect(csp.get("script-src")).not.toContain(disallowedEvalSource);
  });

  it("allows required production connection targets", async () => {
    const res = await request(createApp()).get("/healthz").expect(200);
    const connectSrc = getCspDirectives(res.headers["content-security-policy"]).get("connect-src");

    expect(connectSrc).toEqual(expect.arrayContaining([
      "'self'",
      "https://posthog.com",
      "https://*.posthog.com",
      "https://api.voyageai.com",
      "https://api.stripe.com",
      "https://*.stripe.com",
      "https://app.loops.so",
      "https://*.loops.so",
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
    ]));
    expect(connectSrc).not.toContain("*");
  });

  it("keeps Vite websocket allowances scoped to dev mode", async () => {
    const prodRes = await request(createApp()).get("/healthz").expect(200);
    const devRes = await request(createApp({ viteDev: true })).get("/healthz").expect(200);

    const prodConnectSrc = getCspDirectives(prodRes.headers["content-security-policy"])
      .get("connect-src");
    const devCsp = getCspDirectives(devRes.headers["content-security-policy"]);
    const devConnectSrc = devCsp.get("connect-src");
    const prodScriptSrc = getCspDirectives(prodRes.headers["content-security-policy"])
      .get("script-src");
    const devScriptSrc = devCsp.get("script-src");

    expect(prodConnectSrc).not.toContain("ws://localhost:*");
    expect(prodScriptSrc).not.toContain("'unsafe-inline'");
    expect(devConnectSrc).toEqual(expect.arrayContaining([
      "http://localhost:*",
      "http://127.0.0.1:*",
      "ws://localhost:*",
      "ws://127.0.0.1:*",
    ]));
    expect(devScriptSrc).toContain("'unsafe-inline'");
  });
});
