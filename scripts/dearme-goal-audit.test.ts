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

function readyHostProviderEvidence() {
  return {
    audit: {
      ready: true,
      verdict: "Host provider authorization: ready.",
      providers: [
        {
          key: "vercel" as const,
          label: "Vercel",
          status: "ready" as const,
          ready: true,
          installed: true,
          tokenPresent: true,
          authenticated: true,
          evidence: "Vercel token env is present and the CLI is installed.",
        },
      ],
      missingCapabilities: [],
      operatorCommands: ["pnpm --silent dearme:host-provider-audit"],
    },
  };
}

function blockedHostProviderEvidence() {
  return {
    audit: {
      ready: false,
      verdict: "Host provider authorization: blocked. No authenticated host provider and no configured public HTTPS DearMe host were found.",
      providers: [
        {
          key: "vercel" as const,
          label: "Vercel",
          status: "blocked" as const,
          ready: false,
          installed: true,
          tokenPresent: false,
          authenticated: false,
          evidence: "Vercel CLI is installed but not authenticated; VERCEL_TOKEN is unset.",
          setupCommand: "vercel login",
        },
        {
          key: "netlify" as const,
          label: "Netlify",
          status: "blocked" as const,
          ready: false,
          installed: true,
          tokenPresent: false,
          authenticated: false,
          evidence: "Netlify CLI is installed but not authenticated; NETLIFY_AUTH_TOKEN is unset.",
          setupCommand: "netlify login",
        },
      ],
      missingCapabilities: [
        "host_provider_token_or_login" as const,
        "public_https_dearme_host" as const,
      ],
      operatorCommands: [
        "vercel login",
        "netlify login",
      ],
    },
  };
}

function readyOpenClawMessageRehearsalEvidence() {
  return {
    report: {
      status: "ready" as const,
      verdict: "OpenClaw message contract rehearsal: ready.",
      summary: "DearMe can form the shared OpenClaw Telegram and iMessage gateway contract without network access, external recipients, or provider credentials.",
      results: [
        {
          target: "telegram_message" as const,
          status: "delivered" as const,
          externalId: "send_telegram_message-rehearsal",
          externalUrl: "openclaw://dearme/rehearsal/send_telegram_message",
        },
        {
          target: "imessage_message" as const,
          status: "delivered" as const,
          externalId: "send_imessage-rehearsal",
          externalUrl: "openclaw://dearme/rehearsal/send_imessage",
        },
      ],
      captured: [
        {
          target: "telegram_message" as const,
          toolName: "send_telegram_message" as const,
          channel: "telegram" as const,
          companyId: "dearme",
          issueId: "DEA-OPENCLAW",
          payloadKeys: ["body", "recipient"],
          paperclipWakeToolName: "send_telegram_message",
          sessionDisplayId: "openclaw://dearme/rehearsal/send_telegram_message",
        },
        {
          target: "imessage_message" as const,
          toolName: "send_imessage" as const,
          channel: "imessage" as const,
          companyId: "dearme",
          issueId: "DEA-OPENCLAW",
          payloadKeys: ["body", "service", "to"],
          paperclipWakeToolName: "send_imessage",
          sessionDisplayId: "openclaw://dearme/rehearsal/send_imessage",
        },
      ],
      liveProofStillRequired: true as const,
      missingCapabilities: [],
      commands: {
        rehearsal: "pnpm --silent dearme:openclaw-message-rehearsal -- --json",
        liveProof: "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
      },
    },
  };
}

function readyPublicFirstRunLandingEvidence() {
  return {
    ready: true,
    evidence: "Content view starts with one positioning sentence, known-for input, proof-pack CTA, live work receipts, and approval boundary.",
    missing: [],
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
        label: "Voice semantic/review-loop proof",
        ready: true,
        description: "Profile-token scorer and review loop are ready.",
        targets: ["profile_token_semantic", "profile_token_review_loop"],
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
        operatorCommand: "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
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

function blockedOpenClawMessageStatus(): DearMeProofStatus {
  const imessageRecipientBlocker = {
    lane: "provider" as const,
    target: "imessage_message",
    missingCount: 1,
    capabilities: [
      {
        key: "imessage_recipient" as const,
        label: "iMessage smoke recipient",
      },
    ],
  };
  const status = readyStatus();
  return {
    ...status,
    sections: status.sections.map((section) =>
      section.key === "live_provider_proof"
        ? {
          ...section,
          ready: false,
          description: "Real production host and external channels are proven except iMessage delivery.",
          blockedTargets: [imessageRecipientBlocker],
        }
        : section
    ),
    liveProviderFocus: status.liveProviderFocus.map((focus) =>
      focus.key === "openclaw_messages"
        ? {
          ...focus,
          ready: false,
          blockedTargets: [imessageRecipientBlocker],
          missingCapabilities: imessageRecipientBlocker.capabilities,
          reason: "Telegram and iMessage share the OpenClaw gateway proof, but iMessage still needs an explicit recipient.",
        }
        : focus
    ),
    commands: {
      ...status.commands,
      liveProviderSetup: [
        "pnpm --silent dearme:proof -- --print-env-template > .dearme-proof.env",
        "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check",
        "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
      ],
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
  const auditWithoutHostProvider = summarizeDearMeGoalAudit(
    status,
    deliveredHostRehearsalEvidence(),
    undefined,
    undefined,
    readyPublicFirstRunLandingEvidence(),
  );
  const auditWithHostProvider = summarizeDearMeGoalAudit(
    status,
    deliveredHostRehearsalEvidence(),
    readyHostProviderEvidence(),
    readyOpenClawMessageRehearsalEvidence(),
    readyPublicFirstRunLandingEvidence(),
  );
  const formatted = formatDearMeGoalAudit(auditWithHostProvider).join("\n");

  assert.equal(auditWithHostProvider.complete, false);
  assert.match(auditWithHostProvider.verdict, /not complete/);
  assert.equal(auditWithHostProvider.nextAction.label, "Polsia-level phone-reachable private proof page");
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "public_first_run_landing")?.status,
    "met",
  );
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "private_first_wow")?.status,
    "met",
  );
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "loopback_host_rehearsal")?.status,
    "met",
  );
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "production_host_provider_auth")?.status,
    "met",
  );
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "production_host_live_wow")?.status,
    "blocked",
  );
  assert.equal(
    auditWithHostProvider.items.find((item) => item.key === "openclaw_message_contract_rehearsal")?.status,
    "met",
  );
  assert.deepEqual(
    auditWithHostProvider.items.find((item) => item.key === "production_host_live_wow")?.blockers,
    ["deploy_site_production"],
  );
  assert.match(formatted, /DearMe active goal completion audit/);
  assert.match(formatted, /Prompt-to-artifact checklist:/);
  assert.match(formatted, /Maximize reuse of Polsia, Naive\/Paperclip, and OpenClaw instead of rebuilding substrate: blocked/);
  assert.match(formatted, /Do not mark completion from proxy proof; require real live OpenClaw\/channel\/provider evidence: blocked/);
  assert.match(formatted, /Missing: OpenClaw shared Telegram\/iMessage message proof, Live provider proof set/);
  assert.match(formatted, /\[x\] Naive\/Paperclip reuse and worktree absorption: met/);
  assert.match(formatted, /\[ \] Polsia-level phone-reachable private proof page: blocked/);
  assert.match(formatted, /Missing capabilities: enable production host smoke; public HTTPS DearMe host; exported private proof artifact; proof-page text or host-smoke manifest/);
  assert.match(formatted, /Run: pnpm --silent dearme:provider-smoke -- --env-file \.dearme-proof\.env --target deploy_site_production/);
  assert.equal(
    auditWithHostProvider.promptToArtifactChecklist.find((item) => item.key === "reuse_existing_substrates")?.status,
    "blocked",
  );
  assert.equal(
    auditWithHostProvider.promptToArtifactChecklist.find((item) => item.key === "live_provider_truth")?.status,
    "blocked",
  );
  assert.deepEqual(
    auditWithHostProvider.promptToArtifactChecklist.find((item) => item.key === "live_provider_truth")?.missing,
    ["OpenClaw shared Telegram/iMessage message proof", "Live provider proof set"],
  );
  assert.equal(
    auditWithoutHostProvider.items.find((item) => item.key === "production_host_provider_auth")?.status,
    "unverified",
  );
});

test("DearMe goal audit reports host provider authorization before production host smoke", () => {
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
  const audit = summarizeDearMeGoalAudit(
    status,
    deliveredHostRehearsalEvidence(),
    blockedHostProviderEvidence(),
    readyOpenClawMessageRehearsalEvidence(),
    readyPublicFirstRunLandingEvidence(),
  );
  const formatted = formatDearMeGoalAudit(audit).join("\n");

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "Production host provider authorization");
  assert.equal(
    audit.items.find((item) => item.key === "production_host_provider_auth")?.status,
    "blocked",
  );
  assert.deepEqual(
    audit.items.find((item) => item.key === "production_host_provider_auth")?.blockers,
    ["host_provider_token_or_login", "public_https_dearme_host"],
  );
  assert.match(formatted, /\[ \] Production host provider authorization: blocked/);
  assert.match(formatted, /Vercel CLI is installed but not authenticated/);
  assert.match(formatted, /Run: vercel login/);
});

test("DearMe goal audit routes blocked OpenClaw message proof through no-send setup first", () => {
  const audit = summarizeDearMeGoalAudit(
    blockedOpenClawMessageStatus(),
    deliveredHostRehearsalEvidence(),
    readyHostProviderEvidence(),
    readyOpenClawMessageRehearsalEvidence(),
    readyPublicFirstRunLandingEvidence(),
  );
  const formatted = formatDearMeGoalAudit(audit).join("\n");
  const openClawProof = audit.items.find((item) => item.key === "openclaw_message_reuse");

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "OpenClaw shared Telegram/iMessage message proof");
  assert.equal(
    audit.nextAction.command,
    "pnpm --silent dearme:next-proof -- --target openclaw_messages",
  );
  assert.deepEqual(openClawProof?.blockers, ["imessage_message"]);
  assert.deepEqual(openClawProof?.commands, [
    "pnpm --silent dearme:next-proof -- --target openclaw_messages",
    "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check --target openclaw_messages",
    "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
  ]);
  assert.match(formatted, /Run: pnpm --silent dearme:next-proof -- --target openclaw_messages/);
});

test("DearMe goal audit passes only when every required proof item is ready", () => {
  const audit = summarizeDearMeGoalAudit(
    readyStatus(),
    deliveredHostRehearsalEvidence(),
    readyHostProviderEvidence(),
    readyOpenClawMessageRehearsalEvidence(),
    readyPublicFirstRunLandingEvidence(),
  );
  const formatted = formatDearMeGoalAudit(audit).join("\n");

  assert.equal(audit.complete, true);
  assert.match(audit.verdict, /Goal audit: complete/);
  assert.equal(
    audit.items.every((item) => item.status === "met"),
    true,
  );
  assert.equal(
    audit.promptToArtifactChecklist.every((item) => item.status === "met"),
    true,
  );
  assert.equal(audit.nextAction.label, "Mark the active goal complete");
  assert.match(formatted, /Prompt-to-artifact checklist:/);
  assert.match(formatted, /Make the product autonomous and useful without exposing too many setup concerns: met/);
  assert.match(formatted, /pnpm --silent dearme:goal-audit -- --check/);
});

test("DearMe goal audit does not silently skip the public first-run landing proof", () => {
  const audit = summarizeDearMeGoalAudit(
    readyStatus(),
    deliveredHostRehearsalEvidence(),
    readyHostProviderEvidence(),
    readyOpenClawMessageRehearsalEvidence(),
  );

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "Polsia-style public first-run landing");
  assert.deepEqual(
    audit.items.find((item) => item.key === "public_first_run_landing")?.blockers,
    ["public_first_run_landing_not_checked"],
  );
});

test("DearMe goal audit does not silently skip the host rehearsal proof", () => {
  const audit = summarizeDearMeGoalAudit(
    readyStatus(),
    undefined,
    undefined,
    undefined,
    readyPublicFirstRunLandingEvidence(),
  );

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "No-secret loopback host rehearsal");
  assert.deepEqual(
    audit.items.find((item) => item.key === "loopback_host_rehearsal")?.blockers,
    ["host_rehearsal_not_run"],
  );
});

test("DearMe goal audit does not silently skip the OpenClaw message rehearsal", () => {
  const audit = summarizeDearMeGoalAudit(
    readyStatus(),
    deliveredHostRehearsalEvidence(),
    readyHostProviderEvidence(),
    undefined,
    readyPublicFirstRunLandingEvidence(),
  );

  assert.equal(audit.complete, false);
  assert.equal(audit.nextAction.label, "OpenClaw Telegram/iMessage contract rehearsal");
  assert.deepEqual(
    audit.items.find((item) => item.key === "openclaw_message_contract_rehearsal")?.blockers,
    ["openclaw_message_rehearsal_not_run"],
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
