import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDearMeProdSmokeArgs,
  runDearMeProdSmoke,
  type DearMeProdSmokeConfig,
} from "./dearme-prod-smoke.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html" },
  });
}

const baseConfig: DearMeProdSmokeConfig = {
  targetUrl: "https://preview.dearme.app",
  heroText: "DearMe is a private AI growth team for one person.",
  checkoutEmail: "prod-smoke@example.test",
  apiKey: "test-key",
  voiceFingerprintId: "prod-smoke",
  timeoutMs: 5_000,
};

test("prod smoke passes when every deployed endpoint returns the expected contract", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const requestUrl = String(url);
    calls.push({ url: requestUrl, init });
    if (requestUrl === "https://preview.dearme.app/") {
      return textResponse(`<h1>${baseConfig.heroText}</h1>`);
    }
    if (requestUrl === "https://preview.dearme.app/healthz") {
      return jsonResponse({ status: "ok" });
    }
    if (requestUrl === "https://preview.dearme.app/readyz") {
      return jsonResponse({ status: "ready" });
    }
    if (requestUrl === "https://preview.dearme.app/api/dearme/checkout/start") {
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "prod-smoke@example.test",
        plan: "beta",
      });
      return jsonResponse({ checkoutUrl: "https://checkout.stripe.test/session" });
    }
    if (requestUrl === "https://preview.dearme.app/v1/voice/score") {
      assert.equal((init?.headers as Record<string, string>).authorization, "Bearer test-key");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        fingerprintId: "prod-smoke",
        text: "DearMe keeps private work useful until the owner approves the next public step.",
        kind: "outbound-email",
      });
      return jsonResponse({ score: 96, passed: true, reasons: [] });
    }
    return jsonResponse({ error: "unexpected" }, 404);
  }) as typeof fetch;

  const report = await runDearMeProdSmoke(baseConfig, fetchImpl);

  assert.equal(report.ok, true);
  assert.equal(report.checked, 5);
  assert.equal(report.passed, 5);
  assert.deepEqual(report.checks.map((check) => check.name), [
    "landing",
    "healthz",
    "readyz",
    "stripe_checkout",
    "voice_score",
  ]);
  assert.equal(calls.length, 5);
});

test("prod smoke fails closed when a required deployed contract is broken", async () => {
  const fetchImpl = (async (url: string | URL | Request) => {
    const requestUrl = String(url);
    if (requestUrl.endsWith("/")) {
      return textResponse("<h1>Almost DearMe</h1>");
    }
    if (requestUrl.endsWith("/healthz")) return jsonResponse({ status: "ok" });
    if (requestUrl.endsWith("/readyz")) return jsonResponse({ status: "not_ready" }, 503);
    if (requestUrl.endsWith("/api/dearme/checkout/start")) {
      return jsonResponse({ checkoutUrl: "not-a-url" });
    }
    return jsonResponse({ error: "missing scoring response" }, 200);
  }) as typeof fetch;

  const report = await runDearMeProdSmoke(baseConfig, fetchImpl);

  assert.equal(report.ok, false);
  assert.equal(report.passed, 1);
  assert.deepEqual(
    report.checks.filter((check) => check.status === "fail").map((check) => check.name),
    ["landing", "readyz", "stripe_checkout", "voice_score"],
  );
});

test("prod smoke reports a missing voice key without calling the voice endpoint", async () => {
  const calledUrls: string[] = [];
  const fetchImpl = (async (url: string | URL | Request) => {
    const requestUrl = String(url);
    calledUrls.push(requestUrl);
    if (requestUrl.endsWith("/")) return textResponse(baseConfig.heroText);
    if (requestUrl.endsWith("/healthz")) return jsonResponse({ status: "ok" });
    if (requestUrl.endsWith("/readyz")) return jsonResponse({ status: "ready" });
    if (requestUrl.endsWith("/api/dearme/checkout/start")) {
      return jsonResponse({ checkoutUrl: "https://checkout.stripe.test/session" });
    }
    throw new Error(`unexpected call to ${requestUrl}`);
  }) as typeof fetch;

  const report = await runDearMeProdSmoke({ ...baseConfig, apiKey: "" }, fetchImpl);

  assert.equal(report.ok, false);
  assert.equal(report.checks.find((check) => check.name === "voice_score")?.status, "fail");
  assert.equal(calledUrls.some((url) => url.endsWith("/v1/voice/score")), false);
});

test("prod smoke args normalize env config and reject invalid input", () => {
  const parsed = parseDearMeProdSmokeArgs(["--", "--json", "--timeout-ms", "1500"], {
    DEARME_PROD_SMOKE_URL: "https://preview.dearme.app/",
    DEARME_PROD_SMOKE_API_KEY: "test-key",
  });

  assert.equal(parsed.json, true);
  assert.equal(parsed.config?.targetUrl, "https://preview.dearme.app");
  assert.equal(parsed.config?.apiKey, "test-key");
  assert.equal(parsed.config?.timeoutMs, 1500);

  const missingUrl = parseDearMeProdSmokeArgs([], {});
  assert.equal(missingUrl.config, null);
  assert.match(missingUrl.error ?? "", /Missing target URL/);

  const invalidProtocol = parseDearMeProdSmokeArgs(["--url", "ftp://preview.dearme.app"], {});
  assert.equal(invalidProtocol.config, null);
  assert.match(invalidProtocol.error ?? "", /http or https/);
});
