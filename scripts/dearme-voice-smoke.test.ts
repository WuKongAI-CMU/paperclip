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
    "profile_token_review_loop",
  ]);
  assert.equal(readiness[0]?.ready, true);
  assert.equal(readiness[1]?.ready, false);
  assert.deepEqual(readiness[1]?.missing, [
    "DEARME_VOICE_SEMANTIC_SCORER=profile-token",
  ]);
  assert.equal(readiness[2]?.ready, false);
  assert.deepEqual(readiness[2]?.missing, [
    "DEARME_VOICE_SEMANTIC_SCORER=profile-token",
  ]);

  const lines = formatDearMeVoiceSmokeReadiness(readiness);
  assert.match(lines.join("\n"), /Next voice-smoke setup:/);
  assert.match(lines.join("\n"), /--target profile_token_semantic/);
  assert.match(lines.join("\n"), /--target profile_token_review_loop/);
});

test("voice smoke readiness is scoped by target and accepts aliases", () => {
  assert.equal(parseDearMeVoiceSmokeArgs(["--target", "deterministic"]).target, "deterministic_gate");
  assert.equal(parseDearMeVoiceSmokeArgs(["semantic"]).target, "profile_token_semantic");
  assert.equal(parseDearMeVoiceSmokeArgs(["profile-token"]).target, "profile_token_semantic");
  assert.equal(parseDearMeVoiceSmokeArgs(["review-loop"]).target, "profile_token_review_loop");
  assert.equal(parseDearMeVoiceSmokeArgs(["soft-reject"]).target, "profile_token_review_loop");
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
  assert.match(template, /DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS=1/);
  assert.match(template, /DEARME_VOICE_SMOKE_PROFILE_SEEDS=/);
  assert.match(template, /DEARME_VOICE_SMOKE_REWRITE_TEXT=/);
  assert.match(template, /does not send, deploy, spend, or call a live model/);
  assert.match(template, /--target profile_token_semantic/);
  assert.match(template, /--target profile_token_review_loop/);
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

test("voice smoke can require custom profile corpus before semantic readiness", () => {
  const missingCorpus = inspectDearMeVoiceSmokeReadiness({
    DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS: "1",
  }, "profile_token_semantic");

  assert.equal(missingCorpus[0]?.ready, false);
  assert.deepEqual(missingCorpus[0]?.missing, [
    "DEARME_VOICE_SMOKE_PROFILE_SEEDS with at least 2 entries",
    "DEARME_VOICE_SMOKE_MATCH_TEXT",
    "DEARME_VOICE_SMOKE_DRIFT_TEXT",
  ]);

  const ready = inspectDearMeVoiceSmokeReadiness({
    DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS: "1",
    DEARME_VOICE_SMOKE_PROFILE_SEEDS: [
      "I turn rough positioning notes into buyer proof before the launch call.",
      "I prefer inspectable proof over broad claims because one concrete next yes is easier to trust.",
    ].join("|||"),
    DEARME_VOICE_SMOKE_MATCH_TEXT:
      "I turn rough positioning notes into buyer proof before the launch call because inspectable proof makes one concrete next yes easier to trust.",
    DEARME_VOICE_SMOKE_DRIFT_TEXT:
      "Amazing platform synergy unlocks automated marketing workflows for everyone at scale.",
  }, "profile_token_semantic");

  assert.equal(ready[0]?.ready, true);

  const missingReviewRewrite = inspectDearMeVoiceSmokeReadiness({
    DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS: "1",
    DEARME_VOICE_SMOKE_PROFILE_SEEDS: [
      "I turn rough positioning notes into buyer proof before the launch call.",
      "I prefer inspectable proof over broad claims because one concrete next yes is easier to trust.",
    ].join("|||"),
    DEARME_VOICE_SMOKE_MATCH_TEXT:
      "I turn rough positioning notes into buyer proof before the launch call because inspectable proof makes one concrete next yes easier to trust.",
    DEARME_VOICE_SMOKE_DRIFT_TEXT:
      "Amazing platform synergy unlocks automated marketing workflows for everyone at scale.",
  }, "profile_token_review_loop");

  assert.deepEqual(missingReviewRewrite[0]?.missing, [
    "DEARME_VOICE_SMOKE_REWRITE_TEXT",
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
  assert.equal(result.profileAcceptedSamples, 4);
  assert.equal(typeof result.profileTokenCount, "number");
});

test("voice smoke proves profile-token review loop accepts the safe rewrite", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "profile_token_review_loop",
    env: {
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    },
  });

  assert.deepEqual(results.map((result) => result.status), ["passed"]);
  const result = results[0];
  if (result?.status !== "passed") throw new Error("Expected profile-token review-loop smoke to pass");
  assert.equal(result.target, "profile_token_review_loop");
  assert.equal(result.driftBlocked, true);
  assert.equal(result.rewriteSuggested, true);
  assert.equal(result.rewritePassed, true);
  assert.equal(result.reviewLoopProven, true);
  assert.equal((result.driftScore ?? 100) < result.floor, true);
  assert.equal((result.rewriteScore ?? 0) >= result.floor, true);
  assert.equal(result.profileAcceptedSamples, 4);
});

test("voice smoke proves profile-token match and drift block with custom corpus", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "profile_token_semantic",
    env: {
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
      DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS: "1",
      DEARME_VOICE_SMOKE_PROFILE_SEEDS: [
        "I turn rough positioning notes into buyer proof before the launch call.",
        "I prefer inspectable proof over broad claims because one concrete next yes is easier to trust.",
        "I keep every launch move grounded in a proof the buyer can read before we ask for more.",
      ].join("|||"),
      DEARME_VOICE_SMOKE_MATCH_TEXT:
        "I turn rough positioning notes into buyer proof before the launch call because inspectable proof makes one concrete next yes easier to trust.",
      DEARME_VOICE_SMOKE_DRIFT_TEXT:
        "Amazing platform synergy unlocks automated marketing workflows for everyone at scale.",
    },
  });

  assert.deepEqual(results.map((result) => result.status), ["passed"]);
  const result = results[0];
  if (result?.status !== "passed") throw new Error("Expected custom-corpus profile-token smoke to pass");
  assert.equal(result.customCorpus, true);
  assert.equal(result.profileAcceptedSamples, 4);
  assert.equal((result.profileTokenCount ?? 0) >= 8, true);
  assert.equal(result.driftBlocked, true);
  assert.equal(result.reasons.includes("semantic_voice_match"), true);
});

test("voice smoke proves review-loop rewrite with custom corpus", async () => {
  const results = await runDearMeVoiceSmoke({
    target: "profile_token_review_loop",
    env: {
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
      DEARME_VOICE_SMOKE_REQUIRE_CUSTOM_CORPUS: "1",
      DEARME_VOICE_SMOKE_PROFILE_SEEDS: [
        "I turn rough positioning notes into buyer proof before the launch call.",
        "I prefer inspectable proof over broad claims because one concrete next yes is easier to trust.",
        "I keep every launch move grounded in a proof the buyer can read before we ask for more.",
      ].join("|||"),
      DEARME_VOICE_SMOKE_MATCH_TEXT:
        "I turn rough positioning notes into buyer proof before the launch call because inspectable proof makes one concrete next yes easier to trust.",
      DEARME_VOICE_SMOKE_DRIFT_TEXT:
        "Amazing platform synergy unlocks automated marketing workflows for everyone at scale.",
      DEARME_VOICE_SMOKE_REWRITE_TEXT:
        "I turn rough positioning notes into buyer proof before the launch call because one concrete next yes is easier to trust.",
    },
  });

  assert.deepEqual(results.map((result) => result.status), ["passed"]);
  const result = results[0];
  if (result?.status !== "passed") throw new Error("Expected custom review-loop smoke to pass");
  assert.equal(result.customCorpus, true);
  assert.equal(result.reviewLoopProven, true);
  assert.equal(result.rewritePassed, true);
  assert.equal(result.profileAcceptedSamples, 4);
  assert.equal(result.reasons.includes("semantic_voice_match"), true);
});
