import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  parseDearMeIntegrationAuditStatus,
  parseDearMeProofArgs,
  resolveDearMeProofEnvFiles,
  runDearMeProofSafe,
  summarizeDearMeProofStatus,
} from "./dearme-proof.ts";

const now = () => new Date("2026-05-11T12:00:00.000Z");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeHostSmokePacket(dir: string, options: {
  expectedText?: string;
  handle?: string;
} = {}) {
  const handle = options.handle ?? "peter-studio";
  const expectedText = options.expectedText ?? "Peter Studio has a private growth team already working";
  const handleDir = join(dir, handle);
  const html = `<html><body>${expectedText}</body></html>`;
  const proofJson = JSON.stringify({ handle, status: "ready" }, null, 2);
  const manifest = {
    version: 1,
    handle,
    route: `https://dearme.app/${handle}`,
    files: {
      html: "index.html",
      proof: "proof.json",
    },
    expectedText,
    checks: {
      viewport: true,
      customerSafeLanguage: true,
      approvalBoundary: "Launch stays private until approved",
      waitsFor: ["publish", "send", "deploy", "spend"],
      starterDraftCount: 5,
      opportunityCount: 3,
      continuationCount: 3,
      continuation: {
        title: "Keeps working after the first proof",
        nextReview: "Next private review",
        preparedArtifacts: [
          "Next proof-backed draft",
          "Updated opportunity angle",
          "Updated private proof card",
        ],
        ownerRoles: ["content_producer", "opportunity_scout", "portfolio_builder"],
        approvalBoundaries: [
          "The draft can improve privately; posting waits for approval.",
          "The outreach can be prepared privately; sending waits for approval.",
          "The page can be staged privately; public changes wait for approval.",
        ],
      },
    },
    checksums: {
      htmlSha256: sha256(html),
      proofSha256: sha256(proofJson),
    },
  };

  await mkdir(handleDir, { recursive: true });
  await writeFile(join(handleDir, "index.html"), html, "utf8");
  await writeFile(join(handleDir, "proof.json"), proofJson, "utf8");
  await writeFile(join(handleDir, "host-smoke.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    artifactRef: join(handleDir, "index.html"),
    handle,
    manifestPath: join(handleDir, "host-smoke.json"),
    expectedText,
  };
}

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
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --export-site dist\/dearme-private-proof/);
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
  const aha = status.sections.find((section) => section.key === "first_wow_aha_proof");

  assert.equal(aha?.ready, true);
  assert.deepEqual(aha?.targets, [
    "one_sentence_start",
    "five_minute_sequence",
    "private_outputs",
    "recurring_private_work",
    "phone_ready_private_site",
    "minimum_team",
    "approval_boundaries",
    "customer_language",
  ]);
  assert.equal(local?.ready, true);
  assert.equal(semantic?.ready, false);
  assert.equal(live?.ready, false);
  assert.equal(status.commands.ahaProof, "pnpm --silent dearme:aha-proof -- --check");
  assert.deepEqual(live?.blockedTargets.map((item) => item.target), [
    "deploy_site_production",
    "linkedin_dm",
    "telegram_message",
    "imessage_message",
    "meta_campaign",
  ]);
  assert.deepEqual(status.commands.liveProviderSetup, [
    "pnpm --silent dearme:proof -- --print-env-template > .dearme-proof.env",
    "pnpm --silent dearme:aha-proof -- --export-site dist/dearme-private-proof",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target deploy_site_production",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target linkedin_dm --live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target meta_campaign --live",
  ]);
  assert.match(formatted, /DearMe product proof status/);
  assert.match(formatted, /Product verdict: private first-wow proof exists/);
  assert.match(formatted, /First-wow aha proof: ready/);
  assert.match(formatted, /recurring private work/);
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --check/);
  assert.match(formatted, /pnpm --silent dearme:aha-proof -- --export-site dist\/dearme-private-proof/);
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

test("DearMe proof status carries current integration absorption evidence", () => {
  const integrationAudit = parseDearMeIntegrationAuditStatus(JSON.stringify({
    summary: {
      total: 122,
      reviewed_absorbed: 118,
      in_current: 3,
      not_in_current: 0,
      dirty: 0,
    },
    handoffSummary: {
      latestIssueCount: 2,
      latestByMode: {
        committed_patch: 2,
        dirty_patch_handoff: 0,
        no_file_changes: 0,
      },
    },
  }));
  const status = summarizeDearMeProofStatus(
    inspectDearMeProofReadiness({ DEARME_VOICE_SEMANTIC_SCORER: "profile-token" }),
    "all",
    integrationAudit,
  );
  const formatted = formatDearMeProofStatus(status).join("\n");
  const integration = status.sections.find((section) =>
    section.key === "integration_absorption_proof"
  );

  assert.equal(integration?.ready, true);
  assert.deepEqual(integration?.blockedTargets, []);
  assert.match(integration?.description ?? "", /122 tracked worktrees/);
  assert.match(integration?.description ?? "", /118 reviewed absorptions/);
  assert.match(integration?.description ?? "", /latest Symphony handoffs 2\/2 committed/);
  assert.equal(status.commands.integrationAudit, "pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs");
  assert.match(formatted, /Product verdict: Naive\/Paperclip substrate proof is strong, integration absorption is clean/);
  assert.match(formatted, /Integration absorption proof: ready/);
  assert.match(formatted, /pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs/);
  assert.equal(formatted.includes("integration audit could not run"), false);
});

test("DearMe proof integration audit blocks on replay candidates or dirty handoffs", () => {
  const integrationAudit = parseDearMeIntegrationAuditStatus(JSON.stringify({
    summary: {
      total: 4,
      reviewed_absorbed: 1,
      in_current: 1,
      not_in_current: 1,
      dirty: 1,
    },
    handoffSummary: {
      latestIssueCount: 2,
      latestByMode: {
        committed_patch: 1,
        dirty_patch_handoff: 1,
        no_file_changes: 0,
      },
    },
  }));
  const status = summarizeDearMeProofStatus(
    inspectDearMeProofReadiness({ DEARME_VOICE_SEMANTIC_SCORER: "profile-token" }),
    "all",
    integrationAudit,
  );
  const integration = status.sections.find((section) =>
    section.key === "integration_absorption_proof"
  );

  assert.equal(integration?.ready, false);
  assert.deepEqual(integration?.blockedTargets.map((item) => item.target), [
    "not_in_current_worktrees",
    "dirty_worktrees",
    "latest_dirty_handoffs",
    "latest_uncommitted_handoffs",
  ]);
  assert.match(formatDearMeProofStatus(status).join("\n"), /integration audit still has replay or handoff blockers/);
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
  assert.equal(status.commands.ahaProof, "pnpm --silent dearme:aha-proof -- --check");
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

test("DearMe proof safe run includes loopback host rehearsal when configured", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dearme-proof-host-rehearsal-"));
  try {
    const packet = await writeHostSmokePacket(dir);
    const fetch = async (url: string) => ({
      ok: true,
      status: 200,
      async text() {
        assert.equal(url, "http://127.0.0.1:8787/peter-studio/index.html");
        return `<html><body>${packet.expectedText}</body></html>`;
      },
      async json() {
        return {};
      },
    });

    const result = await runDearMeProofSafe({
      lane: "provider",
      env: {
        DEARME_DEPLOY_SITE_BASE_URL: "http://127.0.0.1:8787",
        DEARME_DEPLOY_SITE_SMOKE_HANDLE: packet.handle,
        DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF: packet.artifactRef,
        DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF: packet.manifestPath,
      },
      fetch,
      now,
    });

    const provider = result.lanes.find((lane) => lane.lane === "provider");
    assert.deepEqual(provider?.results.map((item) => item.target), [
      "deploy_site_preview",
      "deploy_site_host_rehearsal",
    ]);
    assert.deepEqual(provider?.results.map((item) => item.status), [
      "delivered",
      "delivered",
    ]);
    assert.equal(provider?.results[1]?.hostStatus, 200);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
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
