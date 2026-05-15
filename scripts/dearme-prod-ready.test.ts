import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { validateEnv } from "./dearme-prod-ready.ts";

const allSetEnv = {
  DEARME_STRIPE_SECRET_KEY: "sk_test_ready",
  DEARME_STRIPE_WEBHOOK_SECRET: "whsec_ready",
  DEARME_STRIPE_PRICE_BETA: "price_ready",
  DEARME_VOICE_VOYAGE_API_KEY: "voyage-ready",
  DEARME_VOICE_SEMANTIC_SCORER: "voyage",
  DEARME_EMAIL_RESEND_API_KEY: "re_ready",
  DEARME_LOOPS_API_KEY: "loops-ready",
  VITE_POSTHOG_KEY: "phc_ready",
  VITE_POSTHOG_HOST: "https://us.i.posthog.com",
  DEARME_POSTHOG_KEY: "phx_ready",
  DEARME_GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
  DEARME_GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
  DEARME_PLAIN_API_KEY: "plain-ready",
  DEARME_PLAIN_WEBHOOK_SECRET: "plain-webhook-ready",
  DATABASE_URL: "postgresql://user:pass@example.com:5432/dearme",
  DEARME_PUBLIC_URL: "https://dearme.app",
  DEARME_LINKEDIN_DM_MESSAGES_URL: "https://linkedin.example.test/messages",
  DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:ready",
  DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15555550123",
};

test("all-set env returns ok status and exit 0", () => {
  const report = validateEnv(allSetEnv);

  assert.equal(report.ready, true);
  assert.equal(report.exitCode, 0);
  assert.equal(report.missing, 0);
  assert.equal(report.malformed, 0);
  assert.equal(report.warnings, 0);
  assert.equal(report.checks.every((check) => check.status === "ok"), true);
});

test("missing Stripe key returns missing for that var and exit 1", () => {
  const env = { ...allSetEnv, DEARME_STRIPE_SECRET_KEY: undefined };
  const report = validateEnv(env);
  const stripeKey = report.checks.find((check) => check.name === "DEARME_STRIPE_SECRET_KEY");

  assert.equal(report.ready, false);
  assert.equal(report.exitCode, 1);
  assert.equal(stripeKey?.status, "missing");
});

test("malformed Stripe key with wrong prefix returns malformed", () => {
  const env = { ...allSetEnv, DEARME_STRIPE_SECRET_KEY: "pk_live_not_server_side" };
  const report = validateEnv(env);
  const stripeKey = report.checks.find((check) => check.name === "DEARME_STRIPE_SECRET_KEY");

  assert.equal(report.ready, false);
  assert.equal(report.exitCode, 1);
  assert.equal(stripeKey?.status, "malformed");
  assert.match(stripeKey?.explanation ?? "", /sk_live_ or sk_test_/);
});

test("missing optional vars produce warn without failing", () => {
  const env = {
    ...allSetEnv,
    DEARME_LINKEDIN_DM_MESSAGES_URL: undefined,
    DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: undefined,
    DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: undefined,
  };
  const report = validateEnv(env);

  assert.equal(report.ready, true);
  assert.equal(report.exitCode, 0);
  assert.equal(report.warnings, 3);
  assert.deepEqual(
    report.checks
      .filter((check) => !check.required)
      .map((check) => check.status),
    ["warn", "warn", "warn"],
  );
});

test("--json flag returns valid JSON", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./cli/node_modules/tsx/dist/loader.mjs",
      "scripts/dearme-prod-ready.ts",
      "--",
      "--json",
      "--env-file",
      "does-not-exist.env",
    ],
    {
      cwd: new URL("..", import.meta.url),
      env: allSetEnv,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.report.ready, true);
  assert.equal(parsed.report.exitCode, 0);
  assert.equal(parsed.report.checks.length, 19);
});
