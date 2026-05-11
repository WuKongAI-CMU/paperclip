import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import {
  dearMeProviderSmokeEnvTemplate,
  dearMeProviderSmokeOperatorCommands,
  formatDearMeProviderSmokeReadiness,
  inspectDearMeProviderSmokeReadiness,
  loadDearMeProviderSmokeEnv,
  parseDearMeProviderSmokeArgs,
  parseDearMeProviderSmokeEnvFile,
  runDearMeProviderSmoke,
} from "./dearme-provider-smoke.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

test("provider smoke readiness reports missing live provider config without secrets", () => {
  const readiness = inspectDearMeProviderSmokeReadiness({});
  const linkedin = readiness.find((item) => item.target === "linkedin_dm");
  const telegram = readiness.find((item) => item.target === "telegram_message");
  const imessage = readiness.find((item) => item.target === "imessage_message");
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
  assert.deepEqual(telegram?.missing, [
    "OPENCLAW_GATEWAY_URL",
    "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
    "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT",
    "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY",
  ]);
  assert.deepEqual(imessage?.missing, [
    "OPENCLAW_GATEWAY_URL",
    "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
    "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
    "DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY",
  ]);
  assert.equal(JSON.stringify(readiness).includes("accessToken"), false);

  const telegramOnly = inspectDearMeProviderSmokeReadiness({}, "telegram_message");
  assert.deepEqual(telegramOnly.map((item) => item.target), ["telegram_message"]);
  assert.deepEqual(telegramOnly[0]?.missing, telegram?.missing);

  const openClawMessages = inspectDearMeProviderSmokeReadiness({}, "openclaw_messages");
  assert.deepEqual(openClawMessages.map((item) => item.target), [
    "telegram_message",
    "imessage_message",
  ]);
  assert.deepEqual(openClawMessages[0]?.missing, telegram?.missing);
  assert.deepEqual(openClawMessages[1]?.missing, imessage?.missing);
});

test("provider smoke readiness formatting deduplicates shared OpenClaw blockers", () => {
  const readiness = inspectDearMeProviderSmokeReadiness({}, "openclaw_messages");
  const lines = formatDearMeProviderSmokeReadiness(readiness, "openclaw_messages");
  const allLines = formatDearMeProviderSmokeReadiness(
    inspectDearMeProviderSmokeReadiness({}),
    "all",
  );
  const telegramLine = lines.find((line) => line.startsWith("- telegram_message:"));
  const imessageLine = lines.find((line) => line.startsWith("- imessage_message:"));

  assert.equal(
    lines[1],
    "Shared missing config: OPENCLAW_GATEWAY_URL, OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
  );
  assert.doesNotMatch(telegramLine ?? "", /OPENCLAW_GATEWAY_URL/);
  assert.doesNotMatch(imessageLine ?? "", /OPENCLAW_GATEWAY_TOKEN/);
  assert.match(telegramLine ?? "", /DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT/);
  assert.match(telegramLine ?? "", /DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY/);
  assert.match(imessageLine ?? "", /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT/);
  assert.match(imessageLine ?? "", /DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY/);
  assert.match(lines.join("\n"), /--check --target openclaw_messages/);
  assert.match(lines.join("\n"), /--target openclaw_messages --live/);
  assert.doesNotMatch(lines.join("\n"), /--target telegram_message --live/);
  assert.doesNotMatch(lines.join("\n"), /--target imessage_message --live/);
  assert.equal(
    allLines.some((line) => line.startsWith("Shared missing config:")),
    false,
  );
  assert.match(allLines.join("\n"), /--target openclaw_messages --live/);
  assert.doesNotMatch(allLines.join("\n"), /--target telegram_message --live/);
  assert.doesNotMatch(allLines.join("\n"), /--target imessage_message --live/);
});

test("provider smoke parses target aliases", () => {
  assert.equal(parseDearMeProviderSmokeArgs(["--target", "linkedin"]).target, "linkedin_dm");
  assert.equal(parseDearMeProviderSmokeArgs(["site-production"]).target, "deploy_site_production");
  assert.equal(parseDearMeProviderSmokeArgs(["telegram"]).target, "telegram_message");
  assert.equal(parseDearMeProviderSmokeArgs(["send-imessage"]).target, "imessage_message");
  assert.equal(parseDearMeProviderSmokeArgs(["--target", "openclaw"]).target, "openclaw_messages");
  assert.equal(parseDearMeProviderSmokeArgs(["gateway-messages"]).target, "openclaw_messages");
  assert.equal(parseDearMeProviderSmokeArgs(["--live", "--json"]).live, true);
  assert.equal(parseDearMeProviderSmokeArgs(["--", "--check"]).check, true);
  assert.deepEqual(
    parseDearMeProviderSmokeArgs(["--env-file", ".dearme-provider-smoke.env"]).envFiles,
    [".dearme-provider-smoke.env"],
  );
  assert.deepEqual(
    parseDearMeProviderSmokeArgs(["--env-file=.one.env", "--env-file", ".two.env"]).envFiles,
    [".one.env", ".two.env"],
  );
  assert.equal(
    parseDearMeProviderSmokeArgs(["--print-env-template"]).printEnvTemplate,
    true,
  );
});

test("provider smoke parses local env files without leaking secret values into readiness", () => {
  const env = parseDearMeProviderSmokeEnvFile(`
    # Local provider smoke configuration.
    DEARME_LINKEDIN_DM_MESSAGES_URL=https://partner.example.test/messages
    DEARME_LINKEDIN_DM_CREDENTIAL_JSON='{"provider":"linkedin_partner","accessToken":"li-token","capabilities":["send_dm"]}'
    export DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=urn:li:person:lead-1
    DEARME_LINKEDIN_DM_SMOKE_BODY="Private proof packet is ready."
  `);

  const readiness = inspectDearMeProviderSmokeReadiness(env);
  const linkedin = readiness.find((item) => item.target === "linkedin_dm");

  assert.equal(linkedin?.ready, true);
  assert.equal(env.DEARME_LINKEDIN_DM_CREDENTIAL_JSON?.includes("li-token"), true);
  assert.equal(JSON.stringify(readiness).includes("li-token"), false);
});

test("provider smoke env files override base env and merge in order", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-provider-smoke-"));
  const first = join(dir, "first.env");
  const second = join(dir, "second.env");

  try {
    await writeFile(first, "DEARME_DEPLOY_SITE_BASE_URL=https://first.example.test\n", "utf8");
    await writeFile(second, "DEARME_DEPLOY_SITE_BASE_URL=https://second.example.test\n", "utf8");
    const env = await loadDearMeProviderSmokeEnv([first, second], {
      DEARME_DEPLOY_SITE_BASE_URL: "https://base.example.test",
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "0",
    });

    assert.equal(env.DEARME_DEPLOY_SITE_BASE_URL, "https://second.example.test");
    assert.equal(env.DEARME_DEPLOY_SITE_ALLOW_PRODUCTION, "0");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("provider smoke env template is local-only and keeps live actions disabled", () => {
  const template = dearMeProviderSmokeEnvTemplate();
  const previewTemplate = dearMeProviderSmokeEnvTemplate("deploy_site_preview");
  const productionTemplate = dearMeProviderSmokeEnvTemplate("deploy_site_production");
  const telegramTemplate = dearMeProviderSmokeEnvTemplate("telegram_message");
  const openClawTemplate = dearMeProviderSmokeEnvTemplate("openclaw_messages");

  assert.match(template, /DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=0/);
  assert.match(template, /DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=0/);
  assert.match(template, /DEARME_DEPLOY_SITE_SMOKE_HANDLE=peter-studio/);
  assert.match(template, /pnpm --silent dearme:aha-proof -- --export-site dist\/dearme-private-proof/);
  assert.match(
    template,
    /DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=dist\/dearme-private-proof\/peter-studio\/index\.html/,
  );
  assert.match(
    template,
    /DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=Peter Studio has a private growth team already working/,
  );
  assert.match(template, /DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN=/);
  assert.match(template, /DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=peter-studio/);
  assert.match(template, /DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=0/);
  assert.match(template, /DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE=/);
  assert.match(template, /OPENCLAW_GATEWAY_URL=/);
  assert.match(template, /OPENCLAW_GATEWAY_TOKEN=/);
  assert.match(template, /DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=/);
  assert.match(template, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=/);
  assert.match(template, /DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE=/);
  assert.equal(template.includes("accessToken"), false);
  assert.equal(template.includes("li-token"), false);
  assert.equal(template.includes("meta-token"), false);

  assert.match(previewTemplate, /--check --target deploy_site_preview/);
  assert.match(previewTemplate, /DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=smoke:provider-dispatch/);
  assert.doesNotMatch(previewTemplate, /dearme:aha-proof -- --export-site/);

  assert.match(productionTemplate, /--check --target deploy_site_production/);
  assert.match(productionTemplate, /dearme:aha-proof -- --export-site dist\/dearme-private-proof/);
  assert.match(
    productionTemplate,
    /Host dist\/dearme-private-proof\/peter-studio\/index\.html at the production URL/,
  );

  assert.match(telegramTemplate, /--check --target telegram_message/);
  assert.match(telegramTemplate, /--target telegram_message --live/);
  assert.match(telegramTemplate, /OPENCLAW_GATEWAY_URL=/);
  assert.match(telegramTemplate, /DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=/);
  assert.doesNotMatch(telegramTemplate, /DEARME_LINKEDIN_DM_MESSAGES_URL=/);
  assert.doesNotMatch(telegramTemplate, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=/);
  assert.doesNotMatch(telegramTemplate, /DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE=/);
  assert.doesNotMatch(telegramTemplate, /DEARME_DEPLOY_SITE_BASE_URL=/);

  assert.match(openClawTemplate, /--check --target openclaw_messages/);
  assert.match(openClawTemplate, /--target openclaw_messages --live/);
  assert.doesNotMatch(openClawTemplate, /--target telegram_message --live/);
  assert.doesNotMatch(openClawTemplate, /--target imessage_message --live/);
  assert.match(openClawTemplate, /OPENCLAW_GATEWAY_URL=/);
  assert.match(openClawTemplate, /OPENCLAW_GATEWAY_TOKEN=/);
  assert.match(openClawTemplate, /DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=/);
  assert.match(openClawTemplate, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=/);
  assert.doesNotMatch(openClawTemplate, /DEARME_LINKEDIN_DM_MESSAGES_URL=/);
  assert.doesNotMatch(openClawTemplate, /DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE=/);
  assert.doesNotMatch(openClawTemplate, /DEARME_DEPLOY_SITE_BASE_URL=/);
});

test("provider smoke operator commands give local-only setup and live guards", () => {
  const commands = dearMeProviderSmokeOperatorCommands([
    "deploy_site_production",
    "telegram_message",
  ]);

  assert.deepEqual(commands, [
    "pnpm --silent dearme:provider-smoke -- --print-env-template > .dearme-provider-smoke.env",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target deploy_site_production",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target telegram_message --live",
  ]);
  assert.equal(commands.join("\n").includes("accessToken"), false);
  assert.equal(commands.join("\n").includes("OPENCLAW_GATEWAY_TOKEN="), false);

  assert.deepEqual(dearMeProviderSmokeOperatorCommands(["telegram_message"]), [
    "pnpm --silent dearme:provider-smoke -- --print-env-template --target telegram_message > .dearme-provider-smoke.env",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check --target telegram_message",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target telegram_message --live",
  ]);

  assert.deepEqual(
    dearMeProviderSmokeOperatorCommands(
      ["telegram_message", "imessage_message"],
      "openclaw_messages",
    ),
    [
      "pnpm --silent dearme:provider-smoke -- --print-env-template --target openclaw_messages > .dearme-provider-smoke.env",
      "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check --target openclaw_messages",
      "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target openclaw_messages --live",
    ],
  );

  assert.deepEqual(
    dearMeProviderSmokeOperatorCommands([
      "deploy_site_production",
      "telegram_message",
      "imessage_message",
      "meta_campaign",
    ]),
    [
      "pnpm --silent dearme:provider-smoke -- --print-env-template > .dearme-provider-smoke.env",
      "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check",
      "pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target deploy_site_production",
      "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target openclaw_messages --live",
      "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target meta_campaign --live",
    ],
  );
});

test("provider smoke expands the OpenClaw message group to both gateway smokes", async () => {
  const results = await runDearMeProviderSmoke({
    target: "openclaw_messages",
    env: {},
    now,
  });

  assert.deepEqual(results.map((result) => result.target), [
    "telegram_message",
    "imessage_message",
  ]);
  assert.deepEqual(results.map((result) => result.status), ["blocked", "blocked"]);
  assert.deepEqual(results[0]?.status === "blocked" ? results[0].missing : [], [
    "OPENCLAW_GATEWAY_URL",
    "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
    "DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT",
    "DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY",
    "--live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1",
  ]);
  assert.deepEqual(results[1]?.status === "blocked" ? results[1].missing : [], [
    "OPENCLAW_GATEWAY_URL",
    "OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH",
    "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
    "DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY",
    "--live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1",
  ]);
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

test("provider smoke blocks custom-domain receipts until that path is enabled", async () => {
  const [result] = await runDearMeProviderSmoke({
    target: "deploy_site_production",
    env: {
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
      DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN: "peter.example.test",
    },
    now,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missing, ["DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1"]);
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

test("provider smoke verifies a configured custom-domain host", async () => {
  let capturedUrl = "";
  const fetch = async (url: string) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      async text() {
        return "<html><body>DearMe private site smoke for custom domain</body></html>";
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
      DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS: "1",
      DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN: "Peter.Example.test",
      DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT: "custom domain",
    },
    fetch,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(capturedUrl, "https://peter.example.test");
  assert.equal(result.externalUrl, "https://peter.example.test");
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
  assert.equal(result.hostStatus, 200);
  assert.equal(result.externalUrl, "https://dearme.example.test/peter-studio");
});

test("provider smoke includes the production URL when host fetch fails", async () => {
  const fetch = async () => {
    const error = new Error("fetch failed") as Error & { cause?: { code: string } };
    error.cause = { code: "UND_ERR_CONNECT_TIMEOUT" };
    throw error;
  };

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
  assert.equal(result.reason, "deploy-site-host-fetch-failed:fetch failed:UND_ERR_CONNECT_TIMEOUT");
  assert.equal(result.externalUrl, "https://dearme.example.test/peter-studio");
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

test("provider smoke refuses live OpenClaw message sends without the explicit live guard", async () => {
  const [result] = await runDearMeProviderSmoke({
    target: "telegram_message",
    env: {
      OPENCLAW_GATEWAY_URL: "wss://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "@founder",
      DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Private proof packet is ready.",
    },
    now,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missing, ["--live", "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1"]);
});

test("provider smoke sends Telegram live target through injected OpenClaw gateway", async () => {
  let capturedContext: AdapterExecutionContext | null = null;
  const openClawGatewayExecute = async (ctx: AdapterExecutionContext) => {
    capturedContext = ctx;
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      sessionId: "telegram-message-1",
      sessionDisplayId: "tg://message/telegram-message-1",
      provider: "openclaw_gateway",
      biller: "openclaw_gateway",
      resultJson: { messageId: "telegram-message-1" },
    };
  };

  const [result] = await runDearMeProviderSmoke({
    target: "telegram_message",
    live: true,
    env: {
      DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "1",
      OPENCLAW_GATEWAY_URL: "wss://gateway.example",
      OPENCLAW_GATEWAY_TOKEN: "gateway-token",
      DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "@founder",
      DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Private proof packet is ready.",
    },
    openClawGatewayExecute,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(result.target, "telegram_message");
  assert.equal(result.externalId, "telegram-message-1");
  assert.equal(capturedContext?.config.headers?.["x-openclaw-token"], "gateway-token");
  assert.equal(capturedContext?.config.payloadTemplate.paperclip.dearme.toolName, "send_telegram_message");
  assert.deepEqual(
    capturedContext?.config.payloadTemplate.paperclip.dearme.originalOutboundPayload,
    {
      recipient: "@founder",
      body: "Private proof packet is ready.",
    },
  );
  assert.equal(JSON.stringify(result).includes("gateway-token"), false);
});

test("provider smoke sends iMessage live target through injected OpenClaw gateway", async () => {
  let capturedContext: AdapterExecutionContext | null = null;
  const openClawGatewayExecute = async (ctx: AdapterExecutionContext) => {
    capturedContext = ctx;
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      sessionId: "imessage-1",
      provider: "openclaw_gateway",
      biller: "openclaw_gateway",
      resultJson: { messageId: "imessage-1" },
    };
  };

  const [result] = await runDearMeProviderSmoke({
    target: "imessage_message",
    live: true,
    env: {
      DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "yes",
      OPENCLAW_GATEWAY_URL: "wss://gateway.example",
      OPENCLAW_WEBHOOK_AUTH: "Bearer gateway-token",
      DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15555550123",
      DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY: "Dear me, day 1 - the team is ready.",
      DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE: "sms",
    },
    openClawGatewayExecute,
    now,
  });

  assert.equal(result.status, "delivered");
  assert.equal(result.target, "imessage_message");
  assert.equal(capturedContext?.config.headers?.["x-openclaw-token"], "gateway-token");
  assert.equal(capturedContext?.config.payloadTemplate.paperclip.dearme.toolName, "send_imessage");
  assert.deepEqual(
    capturedContext?.config.payloadTemplate.paperclip.dearme.originalOutboundPayload,
    {
      to: "+15555550123",
      body: "Dear me, day 1 - the team is ready.",
      service: "sms",
    },
  );
  assert.equal(JSON.stringify(result).includes("gateway-token"), false);
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
