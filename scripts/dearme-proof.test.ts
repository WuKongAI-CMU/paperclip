import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  dearMeProofEnvTemplate,
  dearMeProofOperatorCommands,
  formatDearMeProofReadiness,
  formatDearMeProofStatus,
  inspectDearMeProofReadiness,
  loadDearMeProofEnv,
  parseDearMeProofArgs,
  resolveDearMeProofEnvFiles,
  runDearMeProofSafe,
  summarizeDearMeProofStatus,
} from "./dearme-proof.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

test("DearMe proof readiness combines provider and voice lanes without secrets", () => {
  const readiness = inspectDearMeProofReadiness({});

  assert.deepEqual(readiness.lanes.map((lane) => lane.lane), ["provider", "voice"]);
  const provider = readiness.lanes.find((lane) => lane.lane === "provider");
  const voice = readiness.lanes.find((lane) => lane.lane === "voice");

  assert.equal(provider?.readiness.some((item) => item.target === "deploy_site_preview"), true);
  assert.equal(voice?.readiness.some((item) => item.target === "deterministic_gate"), true);
  assert.equal(JSON.stringify(readiness).includes("accessToken"), false);
  assert.equal(JSON.stringify(readiness).includes("OPENCLAW_GATEWAY_TOKEN="), false);

  const formatted = formatDearMeProofReadiness(readiness).join("\n");
  assert.match(formatted, /Provider dispatch lane/);
  assert.match(formatted, /Voice calibration lane/);
  assert.match(formatted, /Next DearMe proof setup:/);
  assert.match(formatted, /pnpm --silent dearme:proof -- --print-env-template > \.dearme-proof\.env/);
  assert.match(formatted, /pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env/);
  assert.match(formatted, /pnpm --silent dearme:voice-smoke -- --env-file \.dearme-proof\.env/);
  assert.doesNotMatch(formatted, /\.dearme-provider-smoke\.env/);
  assert.doesNotMatch(formatted, /\.dearme-voice-smoke\.env/);
});

test("DearMe proof readiness can scope to one lane", () => {
  assert.deepEqual(
    inspectDearMeProofReadiness({}, "provider").lanes.map((lane) => lane.lane),
    ["provider"],
  );
  assert.deepEqual(
    inspectDearMeProofReadiness({}, "voice").lanes.map((lane) => lane.lane),
    ["voice"],
  );

  const commands = dearMeProofOperatorCommands(
    inspectDearMeProofReadiness({}, "voice"),
    "voice",
  );
  assert.deepEqual(commands.slice(0, 2), [
    "pnpm --silent dearme:proof -- --print-env-template --lane voice > .dearme-proof.env",
    "pnpm --silent dearme:proof -- --check --lane voice",
  ]);
  assert.equal(commands.some((command) => command.includes("dearme:provider-smoke")), false);
});

test("DearMe proof parses lane aliases and env files", () => {
  assert.equal(parseDearMeProofArgs(["--lane", "providers"]).lane, "provider");
  assert.equal(parseDearMeProofArgs(["voice-gate"]).lane, "voice");
  assert.equal(parseDearMeProofArgs(["--status"]).status, true);
  assert.equal(parseDearMeProofArgs(["--safe", "--json"]).runSafe, true);
  assert.deepEqual(
    parseDearMeProofArgs(["--env-file", ".one.env", "--env-file=.two.env"]).envFiles,
    [".one.env", ".two.env"],
  );
  assert.equal(parseDearMeProofArgs(["--print-env-template"]).printEnvTemplate, true);
});

test("DearMe proof status separates local proof from live provider setup", () => {
  const status = summarizeDearMeProofStatus(inspectDearMeProofReadiness({}));
  const formatted = formatDearMeProofStatus(status).join("\n");
  const local = status.sections.find((section) => section.key === "local_safe_proof");
  const semantic = status.sections.find((section) => section.key === "voice_semantic_proof");
  const live = status.sections.find((section) => section.key === "live_provider_proof");

  assert.equal(local?.ready, true);
  assert.equal(semantic?.ready, false);
  assert.equal(live?.ready, false);
  assert.deepEqual(live?.blockedTargets.map((item) => item.target), [
    "deploy_site_production",
    "linkedin_dm",
    "telegram_message",
    "imessage_message",
    "meta_campaign",
  ]);
  assert.deepEqual(status.commands.liveProviderSetup, [
    "pnpm --silent dearme:proof -- --print-env-template > .dearme-proof.env",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target deploy_site_production",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target linkedin_dm --live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target meta_campaign --live",
  ]);
  assert.match(formatted, /DearMe product proof status/);
  assert.match(formatted, /Product verdict: private first-wow proof exists/);
  assert.match(formatted, /Local no-send proof: ready/);
  assert.match(formatted, /Voice semantic proof: blocked/);
  assert.match(formatted, /Live provider proof: blocked/);
  assert.match(formatted, /Next live provider proof setup:/);
  assert.match(formatted, /--target openclaw_messages --live/);
  assert.match(formatted, /pnpm --silent dearme:proof -- --run-safe/);
  assert.doesNotMatch(formatted, /OPENCLAW_GATEWAY_URL/);
  assert.doesNotMatch(formatted, /DEARME_LINKEDIN_DM_CREDENTIAL_JSON/);
  assert.doesNotMatch(formatted, /\.dearme-provider-smoke\.env/);
  assert.equal(JSON.stringify(status).includes("OPENCLAW_GATEWAY_URL"), false);
  assert.equal(JSON.stringify(status).includes("DEARME_LINKEDIN_DM_CREDENTIAL_JSON"), false);
  assert.equal(live?.blockedTargets.every((item) => item.missingCount > 0), true);
});

test("DearMe proof status can be lane scoped", () => {
  const status = summarizeDearMeProofStatus(
    inspectDearMeProofReadiness({ DEARME_VOICE_SEMANTIC_SCORER: "profile-token" }, "voice"),
    "voice",
  );

  assert.deepEqual(status.sections.map((section) => section.key), [
    "local_safe_proof",
    "voice_semantic_proof",
  ]);
  assert.equal(status.sections.every((section) => section.ready), true);
  assert.equal(status.commands.printEnvTemplate, "pnpm --silent dearme:proof -- --print-env-template --lane voice > .dearme-proof.env");
  assert.equal(status.commands.runSafe, "pnpm --silent dearme:proof -- --run-safe --lane voice");
  assert.equal(status.commands.check, "pnpm --silent dearme:proof -- --check --lane voice");
  assert.deepEqual(status.commands.liveProviderSetup, []);
  assert.match(formatDearMeProofStatus(status).join("\n"), /scoped proof status only/);
});

test("DearMe proof env template is a single local file bootstrap", () => {
  const template = dearMeProofEnvTemplate();
  const voiceTemplate = dearMeProofEnvTemplate("voice");

  assert.match(template, /Keep this file local/);
  assert.match(template, /\.dearme-proof\.env/);
  assert.match(template, /Provider dispatch proof/);
  assert.match(template, /Voice calibration proof/);
  assert.match(template, /DEARME_DEPLOY_SITE_SMOKE_HANDLE=peter-studio/);
  assert.match(template, /DEARME_VOICE_SEMANTIC_SCORER=profile-token/);
  assert.match(template, /DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=0/);
  assert.doesNotMatch(template, /\.dearme-provider-smoke\.env/);
  assert.doesNotMatch(template, /\.dearme-voice-smoke\.env/);

  assert.doesNotMatch(voiceTemplate, /Provider dispatch proof/);
  assert.match(voiceTemplate, /Voice calibration proof/);
});

test("DearMe proof env files merge into both proof lanes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-proof-"));
  const first = join(dir, "first.env");
  const second = join(dir, "second.env");

  try {
    await writeFile(first, "DEARME_VOICE_SEMANTIC_SCORER=off\n", "utf8");
    await writeFile(second, "DEARME_VOICE_SEMANTIC_SCORER=profile-token\n", "utf8");
    const env = await loadDearMeProofEnv([first, second], {
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.example.test",
    });

    assert.equal(env.DEARME_VOICE_SEMANTIC_SCORER, "profile-token");
    assert.equal(env.DEARME_DEPLOY_SITE_BASE_URL, "https://sites.example.test");
    const voice = inspectDearMeProofReadiness(env, "voice").lanes[0];
    assert.equal(voice?.readiness.find((item) => item.target === "profile_token_semantic")?.ready, true);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("DearMe proof auto-loads the local proof env when present", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-proof-default-env-"));
  const envFile = join(dir, ".dearme-proof.env");
  const explicitEnvFile = join(dir, "explicit.env");

  try {
    await writeFile(envFile, "DEARME_VOICE_SEMANTIC_SCORER=profile-token\n", "utf8");
    await writeFile(explicitEnvFile, "DEARME_VOICE_SEMANTIC_SCORER=off\n", "utf8");

    assert.deepEqual(await resolveDearMeProofEnvFiles([], envFile), [envFile]);
    assert.deepEqual(
      await resolveDearMeProofEnvFiles([explicitEnvFile], envFile),
      [explicitEnvFile],
    );

    const env = await loadDearMeProofEnv([], {}, envFile);
    const voice = inspectDearMeProofReadiness(env, "voice").lanes[0];
    assert.equal(
      voice?.readiness.find((item) => item.target === "profile_token_semantic")?.ready,
      true,
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("DearMe proof safe run only executes non-live proof by default", async () => {
  const result = await runDearMeProofSafe({
    env: {
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.example.test/dearme/",
      DEARME_DEPLOY_SITE_SMOKE_HANDLE: "peter-studio",
      DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: "smoke:proof",
    },
    now,
  });

  const provider = result.lanes.find((lane) => lane.lane === "provider");
  const voice = result.lanes.find((lane) => lane.lane === "voice");
  assert.deepEqual(provider?.results.map((item) => item.target), ["deploy_site_preview"]);
  assert.deepEqual(provider?.results.map((item) => item.status), ["delivered"]);
  assert.deepEqual(voice?.results.map((item) => item.target), ["deterministic_gate"]);
  assert.deepEqual(voice?.results.map((item) => item.status), ["passed"]);
});

test("DearMe proof safe run includes semantic local scorer when configured", async () => {
  const result = await runDearMeProofSafe({
    lane: "voice",
    env: {
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    },
    now,
  });

  const voice = result.lanes.find((lane) => lane.lane === "voice");
  assert.deepEqual(voice?.results.map((item) => item.target), [
    "deterministic_gate",
    "profile_token_semantic",
  ]);
  assert.deepEqual(voice?.results.map((item) => item.status), ["passed", "passed"]);
});
