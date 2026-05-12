import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeReleaseGate,
  parseDearMeReleaseGateArgs,
  summarizeDearMeReleaseGate,
  type DearMeReleaseGateTarget,
} from "./dearme-release-gate.ts";
import type { DearMeProviderSmokeReadiness } from "./dearme-provider-smoke.ts";
import type {
  DearMeGoalAudit,
  DearMeGoalAuditItem,
  DearMeGoalAuditItemKey,
  DearMeGoalAuditItemStatus,
} from "./dearme-goal-audit.ts";

function readiness(
  target: DearMeProviderSmokeReadiness["target"],
  missing: string[] = [],
): DearMeProviderSmokeReadiness {
  return {
    target,
    ready: missing.length === 0,
    missing,
    liveConfirmationRequired: true,
    description: `${target} readiness`,
  };
}

function item(
  key: DearMeGoalAuditItemKey,
  label: string,
  status: DearMeGoalAuditItemStatus = "met",
  blockers: string[] = [],
  commands: string[] = [],
): DearMeGoalAuditItem {
  return {
    key,
    label,
    status,
    requiredForGoal: true,
    evidence: `${label} evidence`,
    blockers,
    commands,
  };
}

function goalAudit(
  overrides: Partial<Record<DearMeGoalAuditItemKey, DearMeGoalAuditItem>> = {},
  complete = false,
): DearMeGoalAudit {
  const items: DearMeGoalAuditItem[] = [
    item("architecture_status_spine", "Architecture-first proof spine"),
    item("donor_reuse_absorption", "Naive/Paperclip reuse and worktree absorption"),
    item("symphony_coordination", "Symphony/worktree coordination is absorbed, not forked"),
    item("public_first_run_landing", "Polsia-style public first-run landing"),
    item("private_first_wow", "Polsia-style private first-wow without unsafe live actions"),
    item("loopback_host_rehearsal", "No-secret loopback host rehearsal"),
    item("voice_autonomy", "DearMe voice autonomy proof"),
    item("production_host_provider_auth", "Production host provider authorization"),
    item("production_host_live_wow", "Polsia-level phone-reachable private proof page"),
    item("openclaw_message_contract_rehearsal", "OpenClaw Telegram/iMessage contract rehearsal"),
    item(
      "openclaw_message_reuse",
      "OpenClaw shared Telegram/iMessage message proof",
      complete ? "met" : "blocked",
      complete ? [] : ["imessage_message"],
      complete ? [] : [
        "pnpm --silent dearme:next-proof -- --target openclaw_messages",
        "pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check --target openclaw_messages",
        "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live",
      ],
    ),
    item(
      "live_provider_set",
      "Live provider proof set",
      complete ? "met" : "blocked",
      complete ? [] : ["linkedin_dm", "imessage_message", "meta_campaign"],
      complete ? [] : ["pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --check"],
    ),
  ].map((base) => overrides[base.key] ?? base);

  return {
    complete,
    verdict: complete ? "Goal audit: complete." : "Goal audit: not complete.",
    promptToArtifactChecklist: [],
    items,
    nextAction: complete
      ? {
        label: "Mark the active goal complete",
        reason: "Every required audit item is met by the current proof status.",
        command: "pnpm --silent dearme:goal-audit -- --check",
      }
      : {
        label: "OpenClaw shared Telegram/iMessage message proof",
        reason: "Blocked by imessage_message.",
        command: "pnpm --silent dearme:next-proof -- --target openclaw_messages",
      },
  };
}

test("DearMe release gate allows private proof while blocking public launch", () => {
  const gate = summarizeDearMeReleaseGate(goalAudit(), [
    readiness("deploy_site_preview"),
    readiness("deploy_site_production"),
    readiness("linkedin_dm", [
      "DEARME_LINKEDIN_DM_MESSAGES_URL",
      "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    ]),
    readiness("telegram_message"),
    readiness("imessage_message", ["DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT"]),
    readiness("meta_campaign"),
  ]);
  const formatted = formatDearMeReleaseGate(gate).join("\n");

  assert.equal(gate.overall, "private-proof-ready");
  assert.equal(gate.canUse, true);
  assert.equal(gate.canPublish, false);
  assert.equal(gate.privateProof.ready, true);
  assert.equal(gate.publicLaunch.ready, false);
  assert.deepEqual(gate.publicLaunch.blockers, [
    "OpenClaw shared Telegram/iMessage message proof: imessage_message",
    "Live provider proof set: linkedin_dm",
    "Live provider proof set: imessage_message",
    "Live provider proof set: meta_campaign",
  ]);
  assert.deepEqual(gate.factsNeeded.map((fact) => fact.provideAs), [
    "DEARME_LINKEDIN_DM_MESSAGES_URL",
    "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
  ]);
  assert.equal(gate.productReadiness.headline, "Private proof is usable");
  assert.deepEqual(gate.productReadiness.publicLaunchNeeds, [
    "Professional-network delivery route",
    "Approved professional-network recipient",
    "Approved phone-message proof recipient",
  ]);
  assert.equal(gate.productReadiness.nextAction.label, "Supply approved live-proof details");
  assert.equal(
    gate.productComparison.verdict,
    "DearMe has matched the Naive/Paperclip reuse layer and reached a private Polsia-style wow; the remaining benchmark gap is live external channel proof.",
  );
  assert.deepEqual(
    gate.productComparison.items.map((item) => [item.benchmark, item.status]),
    [
      ["Polsia", "partial"],
      ["Naive/Paperclip", "matched"],
      ["OpenClaw", "partial"],
      ["DearMe architecture", "matched"],
    ],
  );
  const openClawComparison = gate.productComparison.items.find((item) => item.benchmark === "OpenClaw");
  assert.ok(openClawComparison);
  assert.match(openClawComparison.summary, /Telegram setup is ready/);
  assert.ok(
    openClawComparison.evidence.includes("Telegram message readiness has no missing setup facts."),
  );
  assert.ok(
    openClawComparison.evidence.includes(
      "iMessage/SMS readiness is missing DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT.",
    ),
  );
  assert.match(openClawComparison.remainingGap, /Telegram setup is already ready/);
  assert.doesNotMatch(
    JSON.stringify(gate.productReadiness),
    /DEARME_|OPENCLAW_|OpenClaw|LinkedIn|Telegram|iMessage/,
  );
  assert.match(formatted, /usable for private\/internal proof, not ready for public launch/);
  assert.match(formatted, /Private proof: ready/);
  assert.match(formatted, /Public launch: blocked/);
  assert.match(formatted, /OpenClaw shared Telegram\/iMessage message proof: imessage_message/);
  assert.match(formatted, /Facts needed before live proof:/);
  assert.match(formatted, /LinkedIn approved smoke recipient: provide DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN/);
  assert.match(formatted, /Product readiness needs:/);
  assert.match(formatted, /Professional-network delivery route/);
  assert.match(formatted, /Approved professional-network recipient/);
  assert.match(formatted, /Approved phone-message proof recipient/);
  assert.match(formatted, /Benchmark comparison:/);
  assert.match(formatted, /Naive\/Paperclip: matched/);
  assert.match(formatted, /Polsia: partial/);
  assert.match(formatted, /OpenClaw: partial\. The shared message gateway contract is proven locally and Telegram setup is ready/);
  assert.match(formatted, /Supply approved live-proof details/);
  assert.match(
    formatted,
    /Do not run live provider proof until those facts are present and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 is set/,
  );
  assert.match(formatted, /Underlying goal audit \(debug detail\):/);
  assert.ok(
    formatted.indexOf("Supply approved live-proof details") <
      formatted.indexOf("Run: pnpm --silent dearme:next-proof -- --target openclaw_messages"),
  );
});

test("DearMe release gate passes public launch only when the goal audit is complete", () => {
  const gate = summarizeDearMeReleaseGate(goalAudit({}, true));

  assert.equal(gate.overall, "public-launch-ready");
  assert.equal(gate.canUse, true);
  assert.equal(gate.canPublish, true);
  assert.equal(gate.privateProof.ready, true);
  assert.equal(gate.publicLaunch.ready, true);
  assert.deepEqual(gate.publicLaunch.blockers, []);
  assert.deepEqual(
    gate.productComparison.items.map((item) => [item.benchmark, item.status]),
    [
      ["Polsia", "matched"],
      ["Naive/Paperclip", "matched"],
      ["OpenClaw", "matched"],
      ["DearMe architecture", "matched"],
    ],
  );
});

test("DearMe release gate blocks private proof when the phone-reachable wow proof is missing", () => {
  const gate = summarizeDearMeReleaseGate(goalAudit({
    production_host_live_wow: item(
      "production_host_live_wow",
      "Polsia-level phone-reachable private proof page",
      "blocked",
      ["deploy_site_production"],
      ["pnpm --silent dearme:provider-smoke -- --target deploy_site_production"],
    ),
  }));

  assert.equal(gate.overall, "blocked");
  assert.equal(gate.canUse, false);
  assert.equal(gate.canPublish, false);
  assert.deepEqual(gate.privateProof.blockers, [
    "Polsia-level phone-reachable private proof page: deploy_site_production",
  ]);
});

test("DearMe release gate blocks private proof when the public first-run landing proof is missing", () => {
  const gate = summarizeDearMeReleaseGate(goalAudit({
    public_first_run_landing: item(
      "public_first_run_landing",
      "Polsia-style public first-run landing",
      "blocked",
      ["public_first_run_landing_not_checked"],
      ['pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "public first-run landing"'],
    ),
  }));

  assert.equal(gate.overall, "blocked");
  assert.equal(gate.canUse, false);
  assert.equal(gate.canPublish, false);
  assert.deepEqual(gate.privateProof.blockers, [
    "Polsia-style public first-run landing: public_first_run_landing_not_checked",
  ]);
  assert.equal(
    gate.productComparison.items.find((item) => item.benchmark === "Polsia")?.status,
    "behind",
  );
});

test("DearMe release gate parses check target, json, and env files", () => {
  assert.deepEqual(parseDearMeReleaseGateArgs([
    "--check",
    "--json",
    "--target",
    "private-proof",
    "--env-file",
    ".one.env",
    "--env-file=.two.env",
  ]), {
    help: false,
    json: true,
    check: true,
    target: "private-proof" satisfies DearMeReleaseGateTarget,
    envFiles: [".one.env", ".two.env"],
  });
  assert.equal(parseDearMeReleaseGateArgs(["--target=public-launch"]).target, "public-launch");
  assert.throws(
    () => parseDearMeReleaseGateArgs(["--target"]),
    /--target requires a value/,
  );
  assert.throws(
    () => parseDearMeReleaseGateArgs(["--target=beta"]),
    /--target must be private-proof or public-launch/,
  );
  assert.throws(
    () => parseDearMeReleaseGateArgs(["--lane", "provider"]),
    /unknown argument/,
  );
});
