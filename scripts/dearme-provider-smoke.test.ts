import assert from "node:assert/strict";
import test from "node:test";
import {
  inspectDearMeProviderSmokeReadiness,
  parseDearMeProviderSmokeArgs,
  runDearMeProviderSmoke,
} from "./dearme-provider-smoke.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

test("provider smoke readiness reports missing live provider config without secrets", () => {
  const readiness = inspectDearMeProviderSmokeReadiness({});
  const linkedin = readiness.find((item) => item.target === "linkedin_dm");
  const meta = readiness.find((item) => item.target === "meta_campaign");

  assert.deepEqual(linkedin?.missing, [
    "DEARME_LINKEDIN_DM_MESSAGES_URL",
    "DEARME_LINKEDIN_DM_CREDENTIAL_JSON or DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE",
    "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    "DEARME_LINKEDIN_DM_SMOKE_BODY",
  ]);
  assert.deepEqual(meta?.missing, [
    "DEARME_META_CAMPAIGN_CREDENTIAL_JSON or DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE",
  ]);
  assert.equal(JSON.stringify(readiness).includes("accessToken"), false);
});

test("provider smoke parses target aliases", () => {
  assert.equal(parseDearMeProviderSmokeArgs(["--target", "linkedin"]).target, "linkedin_dm");
  assert.equal(parseDearMeProviderSmokeArgs(["site-production"]).target, "deploy_site_production");
  assert.equal(parseDearMeProviderSmokeArgs(["--live", "--json"]).live, true);
  assert.equal(parseDearMeProviderSmokeArgs(["--", "--check"]).check, true);
});

test("provider smoke delivers a safe deploy_site preview receipt", async () => {
  const [result] = await runDearMeProviderSmoke({
    target: "deploy_site_preview",
    env: {
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.example.test/dearme/",
      DEARME_DEPLOY_SITE_SMOKE_HANDLE: "peter-studio",
      DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "smoke:proof",
    },
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(result.target, "deploy_site_preview");
  assert.match(result.externalId, /^dearme_preview_/);
  assert.match(
    result.externalUrl ?? "",
    /^https:\/\/sites\.example\.test\/dearme\/peter-studio\?preview=dearme_preview_/,
  );
});

test("provider smoke keeps production deploy receipts blocked until host gate is enabled", async () => {
  const [result] = await runDearMeProviderSmoke({
    target: "deploy_site_production",
    env: {
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.example.test",
    },
    now,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missing, ["DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1"]);
});

test("provider smoke verifies the production site host before claiming delivery", async () => {
  let capturedUrl = "";
  let capturedInit: { headers?: Record<string, string>; method?: string } = {};
  const fetch = async (url: string, init?: { headers?: Record<string, string>; method?: string }) => {
    capturedUrl = url;
    capturedInit = init ?? {};
    return {
      ok: true,
      status: 200,
      async text() {
        return "<html><body>DearMe private site smoke for peter-studio</body></html>";
      },
      async json() {
        return {};
      },
    };
  };

  const [result] = await runDearMeProviderSmoke({
    target: "deploy_site_production",
    env: {
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
      DEARME_DEPLOY_SITE_BASE_URL: "https://dearme.example.test",
      DEARME_DEPLOY_SITE_SMOKE_HANDLE: "peter-studio",
      DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "smoke:proof",
    },
    fetch,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(result.target, "deploy_site_production");
  assert.equal(result.hostStatus, 200);
  assert.equal(capturedUrl, "https://dearme.example.test/peter-studio");
  assert.equal(capturedInit.method, "GET");
  assert.match(result.externalId, /^dearme_production_/);
  assert.equal(result.externalUrl, "https://dearme.example.test/peter-studio");
});

test("provider smoke refuses production delivery when host content lacks the expected proof text", async () => {
  const fetch = async () => ({
    ok: true,
    status: 200,
    async text() {
      return "<html><body>unrelated site</body></html>";
    },
    async json() {
      return {};
    },
  });

  const [result] = await runDearMeProviderSmoke({
    target: "deploy_site_production",
    env: {
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
      DEARME_DEPLOY_SITE_BASE_URL: "https://dearme.example.test",
      DEARME_DEPLOY_SITE_SMOKE_HANDLE: "peter-studio",
    },
    fetch,
    now,
  });

  assert.equal(result.status, "errored");
  assert.equal(result.reason, "deploy-site-host-content-mismatch");
});

test("provider smoke refuses live LinkedIn sends without the explicit live guard", async () => {
  const [result] = await runDearMeProviderSmoke({
    target: "linkedin_dm",
    env: {
      DEARME_LINKEDIN_DM_MESSAGES_URL: "https://partner.example.test/messages",
      DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
        provider: "linkedin_partner",
        accessToken: "li-token",
        capabilities: ["send_dm"],
      }),
      DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:lead-1",
      DEARME_LINKEDIN_DM_SMOKE_BODY: "Private proof packet is ready.",
    },
    now,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missing, ["--live", "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1"]);
});

test("provider smoke sends LinkedIn live target through injected partner fetch", async () => {
  let capturedUrl = "";
  let capturedInit: { headers?: Record<string, string>; body?: string } = {};
  const fetch = async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    capturedUrl = url;
    capturedInit = init ?? {};
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          conversationUrn: "urn:li:conversation:1",
          messageUrn: "urn:li:message:1",
          conversationUrl: "https://linkedin.example.test/messages/1",
        };
      },
    };
  };

  const [result] = await runDearMeProviderSmoke({
    target: "linkedin_dm",
    live: true,
    env: {
      DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "1",
      DEARME_LINKEDIN_DM_MESSAGES_URL: "https://partner.example.test/messages",
      DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
        provider: "linkedin_partner",
        accessToken: "li-token",
        capabilities: ["send_dm"],
      }),
      DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:lead-1",
      DEARME_LINKEDIN_DM_SMOKE_BODY: "Private proof packet is ready.",
      DEARME_LINKEDIN_DM_SMOKE_SUBJECT: "Private proof",
    },
    fetch,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(capturedUrl, "https://partner.example.test/messages");
  assert.equal(capturedInit.headers?.Authorization, "Bearer li-token");
  assert.equal(JSON.parse(capturedInit.body ?? "{}").recipientUrn, "urn:li:person:lead-1");
  assert.equal(JSON.stringify(result).includes("li-token"), false);
});

test("provider smoke creates Meta live target through injected Graph fetch", async () => {
  let capturedUrl = "";
  let capturedInit: { headers?: Record<string, string>; body?: string } = {};
  const fetch = async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    capturedUrl = url;
    capturedInit = init ?? {};
    return {
      ok: true,
      status: 200,
      async json() {
        return { id: "120000000000000001" };
      },
    };
  };

  const [result] = await runDearMeProviderSmoke({
    target: "meta_campaign",
    live: true,
    env: {
      DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "yes",
      DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL: "https://graph.example.test/v25.0",
      DEARME_META_CAMPAIGN_CREDENTIAL_JSON: JSON.stringify({
        provider: "meta_ads",
        accessToken: "meta-token",
        adAccountId: "1234567890",
        scopes: ["ads_management"],
      }),
      DEARME_META_CAMPAIGN_SMOKE_NAME: "DearMe smoke",
      DEARME_META_CAMPAIGN_SMOKE_CREATIVE_REFS: "asset:one,asset:two",
      DEARME_META_CAMPAIGN_SMOKE_AUDIENCE_REF: "audience:founders",
    },
    fetch,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(capturedUrl, "https://graph.example.test/v25.0/act_1234567890/campaigns");
  assert.equal(capturedInit.headers?.Authorization, "Bearer meta-token");
  assert.match(capturedInit.body ?? "", /status=PAUSED/);
  assert.equal(JSON.stringify(result).includes("meta-token"), false);
});
