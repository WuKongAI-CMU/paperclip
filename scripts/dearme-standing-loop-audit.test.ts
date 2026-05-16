import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDearMeStandingLoopAudit,
  parseDearMeStandingLoopAuditArgs,
  summarizeDearMeStandingLoopAudit,
} from "./dearme-standing-loop-audit.ts";
import type { DearMeBacklogAudit } from "./dearme-backlog-audit.ts";
import type { DearMeDependencyLoopAudit } from "./dearme-dependency-loop-audit.ts";
import type { DearMeGoalAudit } from "./dearme-goal-audit.ts";

function backlogAudit(overrides: Partial<DearMeBacklogAudit> = {}): DearMeBacklogAudit {
  return {
    complete: true,
    required: {
      total: 37,
      shipped: 37,
      missing: [],
    },
    standingOpen: [],
    ledgerIds: ["DM-FOUNDER-DOGFOOD-PROOF"],
    nextAction: {
      label: "Continue standing loop",
      reason: "Every P0/P1/P2 handoff backlog item has a run-ledger entry.",
    },
    ...overrides,
  };
}

function dependencyAudit(overrides: Partial<DearMeDependencyLoopAudit> = {}): DearMeDependencyLoopAudit {
  return {
    complete: true,
    autonomousUpdates: [],
    reviewRequiredUpdates: [{
      name: "typescript",
      current: "5.9.3",
      latest: "6.0.3",
      kind: "major",
      decision: "review-required",
      reason: "Major dependency updates wait for human review.",
    }],
    nextAction: {
      label: "Continue standing loop",
      reason: "Only review-required dependency updates are available.",
    },
    ...overrides,
  };
}

function goalAudit(overrides: Partial<DearMeGoalAudit> = {}): DearMeGoalAudit {
  return {
    complete: false,
    verdict: "DearMe active goal completion audit",
    promptToArtifactChecklist: [],
    items: [],
    nextAction: {
      label: "OpenClaw shared Telegram/iMessage message proof",
      reason: "Blocked by imessage_message.",
      command: "pnpm --silent dearme:next-proof -- --target openclaw_messages",
      ownerFacts: [
        "iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
      ],
    },
    ...overrides,
  };
}

test("treats owner-blocked goal state as clear for autonomous standing loop", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    dependencyAudit(),
    goalAudit(),
  );

  assert.equal(audit.state, "owner-blocked");
  assert.equal(audit.checkClear, true);
  assert.deepEqual(audit.nextAction.ownerFacts, [
    "iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
  ]);
  assert.match(formatDearMeStandingLoopAudit(audit).join("\n"), /Owner facts needed/);
});

test("prioritizes missing backlog ledger entries before dependency or goal work", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit({
      complete: false,
      required: {
        total: 37,
        shipped: 36,
        missing: [{
          id: "DM-MOBILE-QA",
          title: "mobile QA",
          priority: "P1",
          requiredForNamedBacklog: true,
        }],
      },
      nextAction: {
        label: "DM-MOBILE-QA",
        reason: "At least one P0/P1/P2 item is missing.",
      },
    }),
    dependencyAudit({
      complete: false,
      autonomousUpdates: [{
        name: "tsx",
        current: "4.20.0",
        latest: "4.20.1",
        kind: "patch",
        decision: "autonomous",
        reason: "Patch dependency update is eligible.",
      }],
    }),
    goalAudit(),
  );

  assert.equal(audit.state, "backlog-ledger-needed");
  assert.equal(audit.checkClear, false);
  assert.equal(audit.nextAction.label, "DM-MOBILE-QA");
});

test("surfaces autonomous dependency bumps after backlog is complete", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    dependencyAudit({
      complete: false,
      autonomousUpdates: [{
        name: "tsx",
        current: "4.20.0",
        latest: "4.20.1",
        kind: "patch",
        decision: "autonomous",
        reason: "Patch dependency update is eligible.",
      }],
      nextAction: {
        label: "Bump tsx",
        reason: "At least one patch dependency update is available.",
      },
    }),
    goalAudit({
      complete: true,
      nextAction: {
        label: "Goal complete",
        reason: "All requirements are met.",
      },
    }),
  );

  assert.equal(audit.state, "dependency-bump-needed");
  assert.equal(audit.checkClear, false);
  assert.equal(audit.nextAction.label, "Bump tsx");
});

test("surfaces code-owned goal regressions when owner facts are not the blocker", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    dependencyAudit(),
    goalAudit({
      nextAction: {
        label: "Restore private first wow",
        reason: "The first-wow proof is blocked.",
        command: "pnpm --silent dearme:aha-proof -- --check",
      },
    }),
  );

  assert.equal(audit.state, "autonomous-fix-needed");
  assert.equal(audit.checkClear, false);
  assert.equal(audit.nextAction.command, "pnpm --silent dearme:aha-proof -- --check");
});

test("parses command arguments", () => {
  assert.deepEqual(
    parseDearMeStandingLoopAuditArgs([
      "--check",
      "--json",
      "--backlog-handoff",
      "handoff.md",
      "--backlog-ledger",
      "ledger.md",
      "--dependency-outdated-json",
      "outdated.json",
      "--env-file",
      ".proof.env",
    ]),
    {
      help: false,
      json: true,
      check: true,
      backlogHandoffPath: "handoff.md",
      backlogLedgerPath: "ledger.md",
      dependencyOutdatedJsonPath: "outdated.json",
      envFiles: [".proof.env"],
    },
  );
});
