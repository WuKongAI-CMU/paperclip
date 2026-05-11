import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeGoalAudit,
  parseDearMeGoalAuditArgs,
  summarizeDearMeGoalAudit,
} from "./dearme-goal-audit.ts";
import {
  inspectDearMeProofReadiness,
  parseDearMeIntegrationAuditStatus,
  summarizeDearMeProofStatus,
  type DearMeProofStatus,
} from "./dearme-proof.ts";

function deliveredHostRehearsalEvidence() {
  return {
    report: {
      exportSiteDir: "dist/dearme-private-proof",
      baseUrl: "http://127.0.0.1:12345",
      handle: "peter-studio",
      htmlPath: "dist/dearme-private-proof/peter-studio/index.html",
      hostSmokePath: "dist/dearme-private-proof/peter-studio/host-smoke.json",
      results: [{
        target: "deploy_site_host_rehearsal" as const,
        status: "delivered" as const,
        externalId: "dearme_host_rehearsal_123",
        externalUrl: "http://127.0.0.1:12345/peter-studio/index.html",
        hostStatus: 200,
      }],
    },
  };
}

function readyStatus(): DearMeProofStatus {
  return {
    lane: "all",
    sections: [
      {
        key: "first_wow_aha_proof",
        label: "First-wow aha proof",
        ready: true,
        description: "Local private first-wow is ready.",
        targets: ["one_sentence_start"],
        blockedTargets: [],
      },
      {
        key: "integration_absorption_proof",
        label: "Integration absorption proof",
        ready: true,
        description: "Worktree audit shows 122 tracked worktrees and latest Symphony handoffs 28/28 committed.",
        targets: ["worktree_absorption", "latest_symphony_handoffs"],
        blockedTargets: [],
      },
      {
        key: "local_safe_proof",
        label: "Local no-send proof",
        ready: true,
        description: "Runs without sends, production deploy, spend, or live model calls.",
        targets: ["deploy_site_preview", "deterministic_gate"],
        blockedTargets: [],
      },
      {
        key: "voice_semantic_proof",
        label: "Voice semantic proof",
        ready: true,
        description: "Profile-token scorer is ready.",
        targets: ["profile_token_semantic"],
        blockedTargets: [],
      },
      {
        key: "live_provider_proof",
        label: "Live provider proof",
        ready: true,
        description: "Real production host and external channels are proven.",
        targets: [
          "deploy_site_production",
          "linkedin_dm",
          "telegram_message",
          "imessage_message",
          "meta_campaign",
        ],
        blockedTargets: [],
      },
    ],
    liveProviderFocus: [
      {
        key: "production_host",
        label: "Production host smoke",
        ready: true,
        targets: ["deploy_site_production"],
        blockedTargets: [],
        missingCapabilities: [],
        reason: "Phone-reachable private proof page is live.",
        operatorCommand: "pnpm --silent dearme:provider-smoke -- --target deploy_site_production",
      },
      {
        key: "openclaw_messages",
        label: "OpenClaw message smoke",
        ready: true,
        targets: ["telegram_message", "imessage_message"],
        blockedTargets: [],
        missingCapabilities: [],
        reason: "Telegram and iMessage share the OpenClaw gateway proof.",
        operatorCommand: "pnpm --silent dearme:provider-smoke -- --target openclaw_messages --live",
      },
      {
        key: "linkedin_dm",
        label: "LinkedIn DM smoke",
        ready: true,
        targets: ["linkedin_dm"],
        blockedTargets: [],
        missingCapabilities: [],
        reason: "LinkedIn partner proof is live.",
        operatorCommand: "pnpm --silent dearme:provider-smoke -- --target linkedin_dm --live",
      },
      {
        key: "meta_campaign",
        label: "Meta campaign smoke",
        ready: true,
        targets: ["meta_campaign"],
        blockedTargets: [],
        missingCapabilities: [],
        reason: "Spend-bearing Meta proof is live.",
        operatorCommand: "pnpm --silent dearme:provider-smoke -- --target meta_campaign --live",
      },
    ],
    commands: {
      ahaProof: "pnpm --silent dearme:aha-proof -- --check",
      integrationAudit: "pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs",
      printEnvTemplate: "pnpm --silent dearme:proof -- --print-env-template > .dearme-proof.env",
      runSafe: "pnpm --silent dearme:proof -- --run-safe",
      check: "pnpm --silent dearme:proof -- --check",
      liveProviderSetup: [],
    },
  };
}

test("DearMe goal audit blocks completion on live production host proof", () => {
  const integrationAudit = parseDearMeIntegrationAuditStatus(JSON.stringify({
    summary: {
      total: 122,
      reviewed_absorbed: 118,
      in_current: 3,
      not_in_current: 0,
      dirty: 0,
    },
    handoffSummary: {
      latestIssueCount: 28,
      latestByMode: {
        committed_patch: 28,
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
  const audit = summarizeDearMeGoalAudit(status, deliveredHostRehearsalEvidence());
  const formatted = formatDearMeGoalAudit(audit).join("\n");

  assert.equal(audit.complete, false);
  assert.match(audit.verdict, /not complete/);
  assert.equal(audit.nextAction.label, "Polsia-level phone-reachable private proof page");
  assert.equal(
    audit.items.find((item) => item.key === "private_first_wow")?.status,
    "met",
  );
  assert.equal(
    audit.items.find((item) => item.key === "loopback_host_rehearsal")?.status,
    "met",
  );
  assert.equal(
    audit.items.find((item) => item.key === "production_host_live_wow")?.status,
    "blocked",
  );
  assert.deepEqual(
    audit.items.find((item) => item.key === "production_host_live_wow")?.blockers,
    ["deploy_site_production"],
  );
  assert.match(formatted, /DearMe active goal completion audit/);
  assert.match(formatted, /\[x\] Naive\/Paperclip reuse and worktree absorption: met/);
  assert.match(formatted, /\[ \] Polsia-level phone-reachable private proof page: blocked/);
  assert.match(formatted, /Missing capabilities: enable production host smoke; public HTTPS DearMe host; exported private proof artifact; proof-page text or host-smoke manifest/);
  assert.match(formatted, /Run: pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env --target deploy_site_production/);
});

test("DearMe goal audit passes only when every required proof item is ready", () => {
  const audit = summarizeDearMeGoalAudit(readyStatus(), deliveredHostRehearsalEvidence());
  const formatted = formatDearMeGoalAudit(audit).join("\n");

  assert.equal(audit.complete, true);
  assert.match(audit.verdict, /Goal audit: complete/);
  assert.equal(
    audit.items.every((item) => item.status === "met"),
    true,
  );
  assert.equal(audit.nextAction.label, "Mark the active goal complete");
  assert.match(formatted, /pnpm --silent dearme:goal-audit -- --check/);
});

test("DearMe goal audit does not silently skip the host rehearsal proof", () => {
  const audit = summarizeDearMeGoalAudit(readyStatus());

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "No-secret loopback host rehearsal");
  assert.deepEqual(
    audit.items.find((item) => item.key === "loopback_host_rehearsal")?.blockers,
    ["host_rehearsal_not_run"],
  );
});

test("DearMe goal audit parses check, json, and env files", () => {
  assert.deepEqual(parseDearMeGoalAuditArgs([
    "--check",
    "--json",
    "--env-file",
    ".one.env",
    "--env-file=.two.env",
  ]), {
    help: false,
    json: true,
    check: true,
    envFiles: [".one.env", ".two.env"],
  });
  assert.throws(
    () => parseDearMeGoalAuditArgs(["--env-file"]),
    /--env-file requires a value/,
  );
  assert.throws(
    () => parseDearMeGoalAuditArgs(["--lane", "provider"]),
    /unknown argument/,
  );
});
