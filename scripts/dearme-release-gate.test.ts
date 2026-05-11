import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeReleaseGate,
  parseDearMeReleaseGateArgs,
  summarizeDearMeReleaseGate,
  type DearMeReleaseGateTarget,
} from "./dearme-release-gate.ts";
import type {
  DearMeGoalAudit,
  DearMeGoalAuditItem,
  DearMeGoalAuditItemKey,
  DearMeGoalAuditItemStatus,
} from "./dearme-goal-audit.ts";

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
  const gate = summarizeDearMeReleaseGate(goalAudit());
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
  assert.match(formatted, /usable for private\/internal proof, not ready for public launch/);
  assert.match(formatted, /Private proof: ready/);
  assert.match(formatted, /Public launch: blocked/);
  assert.match(formatted, /OpenClaw shared Telegram\/iMessage message proof: imessage_message/);
  assert.match(
    formatted,
    /Run: pnpm --silent dearme:next-proof -- --target openclaw_messages/,
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
