import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  dearMeVoiceSmokeEnvTemplate,
  dearMeVoiceSmokeOperatorCommands,
  formatDearMeVoiceSmokeReadiness,
  inspectDearMeVoiceSmokeReadiness,
  loadDearMeVoiceSmokeEnv,
  parseDearMeVoiceSmokeArgs,
  parseDearMeVoiceSmokeEnvFile,
  runDearMeVoiceSmoke,
} from "./dearme-voice-smoke.ts";

test("voice smoke readiness reports local gate ready and semantic config gap", () => {
  const readiness = inspectDearMeVoiceSmokeReadiness({});

  assert.deepEqual(readiness.map((item) => item.target), [
    "deterministic_gate",
    "profile_token_semantic",
  ]);
  assert.equal(readiness[0]?.ready, true);
  assert.equal(readiness[1]?.ready, false);
  assert.deepEqual(readiness[1]?.missing, [
    "DEARME_VOICE_SEMANTIC_SCORER=profile-token",
  ]);

  const lines = formatDearMeVoiceSmokeReadiness(readiness);
  assert.match(lines.join("\n"), /Next voice-smoke setup:/);
  assert.match(lines.join("\n"), /--target profile_token_semantic/);
});

test("voice smoke readiness is scoped by target and accepts aliases", () => {
  assert.equal(parseDearMeVoiceSmokeArgs(["--target", "deterministic"]).target, "deterministic_gate");
  assert.equal(parseDearMeVoiceSmokeArgs(["semantic"]).target, "profile_token_semantic");
  assert.equal(parseDearMeVoiceSmokeArgs(["profile-token"]).target, "profile_token_semantic");
  assert.deepEqual(
    parseDearMeVoiceSmokeArgs(["--env-file", ".dearme-voice-smoke.env"]).envFiles,
    [".dearme-voice-smoke.env"],
  );
  assert.deepEqual(
    parseDearMeVoiceSmokeArgs(["--env-file=.one.env", "--env-file", ".two.env"]).envFiles,
    [".one.env", ".two.env"],
  );
  assert.equal(parseDearMeVoiceSmokeArgs(["--print-env-template"]).printEnvTemplate, true);

  const scoped = inspectDearMeVoiceSmokeReadiness({}, "profile_token_semantic");
  assert.deepEqual(scoped.map((item) => item.target), ["profile_token_semantic"]);
});

test("voice smoke parses local env files", () => {
  const env = parseDearMeVoiceSmokeEnvFile(`
    # Local voice smoke configuration.
    export DEARME_VOICE_SEMANTIC_SCORER='profile-token'
    DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES=2
    DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS="8"
  `);

  assert.deepEqual(env, {
    DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES: "2",
    DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS: "8",
  });
  assert.equal(
    inspectDearMeVoiceSmokeReadiness(env, "profile_token_semantic")[0]?.ready,
    true,
  );
});

test("voice smoke env files override base env and merge in order", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-voice-smoke-"));
  const first = join(dir, "first.env");
  const second = join(dir, "second.env");

  try {
    await writeFile(first, "DEARME_VOICE_SEMANTIC_SCORER=off\n", "utf8");
    await writeFile(second, "DEARME_VOICE_SEMANTIC_SCORER=profile-token\n", "utf8");
    const env = await loadDearMeVoiceSmokeEnv([first, second], {
      DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS: "10",
    });

    assert.equal(env.DEARME_VOICE_SEMANTIC_SCORER, "profile-token");
    assert.equal(env.DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS, "10");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("voice smoke env template is local scorer proof only", () => {
  const template = dearMeVoiceSmokeEnvTemplate();
  const scoped = dearMeVoiceSmokeEnvTemplate("profile_token_semantic");

  assert.match(template, /DEARME_VOICE_SEMANTIC_SCORER=profile-token/);
  assert.match(template, /DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES=2/);
  assert.match(template, /DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS=8/);
  assert.match(template, /does not send, deploy, spend, or call a live model/);
  assert.match(template, /--target profile_token_semantic/);
  assert.match(scoped, /--check --target profile_token_semantic/);
});

test("voice smoke operator commands stay on local env setup", () => {
  assert.deepEqual(dearMeVoiceSmokeOperatorCommands(["profile_token_semantic"]), [
    "pnpm --silent dearme:voice-smoke -- --print-env-template --target profile_token_semantic > .dearme-voice-smoke.env",
    "pnpm --silent dearme:voice-smoke -- --env-file .dearme-voice-smoke.env --check --target profile_token_semantic",
    "pnpm --silent dearme:voice-smoke -- --env-file .dearme-voice-smoke.env --target profile_token_semantic",
  ]);
});

test("voice smoke runs deterministic local gate without env", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "deterministic_gate",
    env: {},
  });

  assert.deepEqual(results.map((result) => result.status), ["passed"]);
  assert.equal(results[0]?.target, "deterministic_gate");
  if (results[0]?.status !== "passed") throw new Error("Expected deterministic gate to pass");
  assert.equal(results[0].score >= results[0].floor, true);
  assert.deepEqual(
    ["concrete_evidence", "lived_in_voice"].every((reason) =>
      results[0].reasons.includes(reason),
    ),
    true,
  );
});

test("voice smoke blocks semantic target until profile-token scorer is enabled", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "profile_token_semantic",
    env: {},
  });

  assert.deepEqual(results, [
    {
      target: "profile_token_semantic",
      status: "blocked",
      reason: "missing-voice-semantic-scorer-config",
      missing: ["DEARME_VOICE_SEMANTIC_SCORER=profile-token"],
    },
  ]);
});

test("voice smoke proves profile-token match and drift block when enabled", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "profile_token_semantic",
    env: {
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    },
  });

  assert.deepEqual(results.map((result) => result.status), ["passed"]);
  const result = results[0];
  if (result?.status !== "passed") throw new Error("Expected profile-token smoke to pass");
  assert.equal(result.target, "profile_token_semantic");
  assert.equal(result.score >= result.floor, true);
  assert.equal(result.driftBlocked, true);
  assert.equal((result.driftScore ?? 100) < result.floor, true);
  assert.equal(result.reasons.includes("semantic_voice_match"), true);
});
