import assert from "node:assert/strict";
import test from "node:test";
import {
  dailyPlainSummaryFactsNeeded,
  formatDearMeStandingLoopAudit,
  inspectDearMeHumanHelpQueueFreshness,
  parseDearMeStandingLoopAuditArgs,
  summarizeDearMeStandingLoopAudit,
} from "./dearme-standing-loop-audit.ts";
import type { DearMeBacklogAudit } from "./dearme-backlog-audit.ts";
import type { DearMeDependencyLoopAudit } from "./dearme-dependency-loop-audit.ts";
import type { DearMeDocFreshnessAudit } from "./dearme-doc-freshness-audit.ts";
import type { DearMeGoalAudit } from "./dearme-goal-audit.ts";

function backlogAudit(overrides: Partial<DearMeBacklogAudit> = {}): DearMeBacklogAudit {
  return {
    complete: true,
    required: {
      total: 37,
      shipped: 37,
      missing: [],
      shippedUnchecked: [],
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

function docFreshnessAudit(overrides: Partial<DearMeDocFreshnessAudit> = {}): DearMeDocFreshnessAudit {
  return {
    complete: true,
    latestLedgerEntry: {
      date: "2026-05-18",
      time: "14:12",
      id: "DM-TSX-PATCH-BUMP-2",
      sha: "6ddf6b62",
      pr: "PR #164",
      summary: "Root tsx dev dependency bumped.",
    },
    indexShippedDate: "2026-05-18",
    indexEntryPresent: true,
    nextAction: {
      label: "Continue standing loop",
      reason: "INDEX.md records the latest non-doc-freshness run-ledger slice.",
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
    ownerProofFactsNeeded: [
      "LinkedIn partner messages endpoint: provide DEARME_LINKEDIN_DM_MESSAGES_URL",
      "LinkedIn approved smoke recipient: provide DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
      "iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
    ],
    hostedCheckoutFactsNeeded: [],
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
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit(),
  );

  assert.equal(audit.state, "owner-blocked");
  assert.equal(audit.checkClear, true);
  assert.deepEqual(audit.nextAction.ownerFacts, [
    "LinkedIn partner messages endpoint: provide DEARME_LINKEDIN_DM_MESSAGES_URL",
    "LinkedIn approved smoke recipient: provide DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    "iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
  ]);
  const formatted = formatDearMeStandingLoopAudit(audit).join("\n");
  assert.match(formatted, /Owner facts needed/);
  assert.match(formatted, /DEARME_LINKEDIN_DM_MESSAGES_URL/);
  assert.match(formatted, /DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN/);
  assert.match(formatted, /DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT/);
  assert.match(
    formatted,
    /Human help queue: docs\/NEEDS_HUMAN_HELP\.md has the reply templates and safe follow-up commands for these blockers\./,
  );
});

test("keeps handoff checklist drift visible without blocking owner-blocked loops", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit({
      required: {
        total: 37,
        shipped: 37,
        missing: [],
        shippedUnchecked: [{
          id: "DM-DOCKERFILE-SERVER",
          title: "Build the server image.",
          priority: "P0",
          checked: false,
          requiredForNamedBacklog: true,
        }],
      },
    }),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit(),
  );

  assert.equal(audit.state, "owner-blocked");
  assert.equal(audit.checkClear, true);
  assert.match(
    formatDearMeStandingLoopAudit(audit).join("\n"),
    /Handoff checklist drift: 1 shipped P0\/P1\/P2 items still unchecked/,
  );
});

test("keeps payment setup facts visible in owner-blocked standing-loop output", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit({
      ownerProofFactsNeeded: [],
      hostedCheckoutFactsNeeded: [
        "DEARME_PAYMENT_LINK_URL is missing.",
        "DEARME_PAYMENT_RECEIPT_SYNC_SECRET or STRIPE_WEBHOOK_SECRET is missing (sensitive; value hidden).",
      ],
      nextAction: {
        label: "Hosted checkout setup",
        reason: "Self-serve checkout needs owner-provided payment configuration.",
        command: "pnpm --silent dearme:payment-readiness",
      },
    }),
  );

  assert.equal(audit.state, "owner-blocked");
  assert.equal(audit.checkClear, true);
  assert.deepEqual(audit.nextAction.hostedCheckoutFacts, [
    "DEARME_PAYMENT_LINK_URL is missing.",
    "DEARME_PAYMENT_RECEIPT_SYNC_SECRET or STRIPE_WEBHOOK_SECRET is missing (sensitive; value hidden).",
  ]);
  const formatted = formatDearMeStandingLoopAudit(audit).join("\n");
  assert.match(formatted, /First-payment checkout facts needed/);
  assert.match(formatted, /DEARME_PAYMENT_LINK_URL is missing/);
  assert.match(formatted, /STRIPE_WEBHOOK_SECRET is missing \(sensitive; value hidden\)/);
  assert.match(
    formatted,
    /Human help queue: docs\/NEEDS_HUMAN_HELP\.md has the reply templates and safe follow-up commands for these blockers\./,
  );
});

test("reports missing daily Plain summary delivery configuration", () => {
  assert.deepEqual(dailyPlainSummaryFactsNeeded({}), [
    "DEARME_PLAIN_API_KEY is missing.",
    "DEARME_CODEX_DAILY_PLAIN_EMAIL or DEARME_PLAIN_DAILY_EMAIL is missing.",
  ]);

  assert.deepEqual(dailyPlainSummaryFactsNeeded({
    DEARME_PLAIN_API_KEY: "plain-key",
    DEARME_PLAIN_DAILY_EMAIL: "peter@example.com",
  }), []);
});

test("keeps daily Plain summary facts visible in standing-loop output", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit(),
    ["DEARME_PLAIN_API_KEY is missing."],
  );

  assert.equal(audit.state, "owner-blocked");
  assert.deepEqual(audit.dailyPlainSummaryFacts, [
    "DEARME_PLAIN_API_KEY is missing.",
  ]);
  const formatted = formatDearMeStandingLoopAudit(audit).join("\n");
  assert.match(formatted, /Daily Plain summary facts needed/);
  assert.match(formatted, /DEARME_PLAIN_API_KEY is missing/);
  assert.match(
    formatted,
    /Human help queue: docs\/NEEDS_HUMAN_HELP\.md has the reply templates and safe follow-up commands for these blockers\./,
  );
});

test("marks stale human help blocker queue as autonomous standing-loop work", () => {
  const humanHelpQueueFreshness = inspectDearMeHumanHelpQueueFreshness({
    content: [
      "### 2026-05-17 - External live-proof facts",
      "- Last verified: 2026-05-17 with",
      "  `pnpm --silent dearme:standing-loop-audit -- --check`.",
      "",
      "### 2026-05-17 - Self-serve checkout configuration",
      "- Last verified: 2026-05-17 with",
      "  `pnpm --silent dearme:payment-readiness`.",
    ].join("\n"),
    operatingDate: "2026-05-18",
    ownerProofFactsNeeded: ["iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT"],
    hostedCheckoutFactsNeeded: ["DEARME_PAYMENT_LINK_URL is missing."],
    reviewRequiredDependencyUpdates: 0,
  });
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit({
      hostedCheckoutFactsNeeded: ["DEARME_PAYMENT_LINK_URL is missing."],
    }),
    ["DEARME_PLAIN_API_KEY is missing."],
    humanHelpQueueFreshness,
  );

  assert.equal(humanHelpQueueFreshness.complete, false);
  assert.deepEqual(humanHelpQueueFreshness.staleSections, [
    "External live-proof facts",
    "Self-serve checkout configuration",
  ]);
  assert.equal(audit.state, "human-help-queue-freshness-needed");
  assert.equal(audit.checkClear, false);
  const formatted = formatDearMeStandingLoopAudit(audit).join("\n");
  assert.match(formatted, /Human help queue freshness: stale \(2026-05-18\)/);
  assert.match(formatted, /Stale human help queue sections/);
  assert.match(formatted, /External live-proof facts/);
  assert.match(formatted, /Self-serve checkout configuration/);
});

test("allows owner-blocked standing loop when human help queue is verified today", () => {
  const humanHelpQueueFreshness = inspectDearMeHumanHelpQueueFreshness({
    content: [
      "### 2026-05-17 - External live-proof facts",
      "- Last verified: 2026-05-18 with",
      "  `pnpm --silent dearme:standing-loop-audit -- --check`.",
      "",
      "### 2026-05-17 - Self-serve checkout configuration",
      "- Last verified: 2026-05-18 with",
      "  `pnpm --silent dearme:payment-readiness`.",
    ].join("\n"),
    operatingDate: "2026-05-18",
    ownerProofFactsNeeded: ["iMessage/SMS approved smoke recipient: provide DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT"],
    hostedCheckoutFactsNeeded: ["DEARME_PAYMENT_LINK_URL is missing."],
    reviewRequiredDependencyUpdates: 0,
  });
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit({
      hostedCheckoutFactsNeeded: ["DEARME_PAYMENT_LINK_URL is missing."],
    }),
    [],
    humanHelpQueueFreshness,
  );

  assert.equal(humanHelpQueueFreshness.complete, true);
  assert.equal(audit.state, "owner-blocked");
  assert.equal(audit.checkClear, true);
  assert.match(formatDearMeStandingLoopAudit(audit).join("\n"), /Human help queue freshness: clear \(2026-05-18\)/);
});

test("marks stale dependency review queue as autonomous standing-loop work", () => {
  const humanHelpQueueFreshness = inspectDearMeHumanHelpQueueFreshness({
    content: [
      "### 2026-05-18 - External live-proof facts",
      "- Last verified: 2026-05-19 with",
      "  `pnpm --silent dearme:standing-loop-audit -- --check`.",
      "",
      "### 2026-05-18 - Dependency review queue",
      "- Last verified: 2026-05-18 with",
      "  `pnpm --silent dearme:dependency-loop-audit -- --check`.",
    ].join("\n"),
    operatingDate: "2026-05-19",
    ownerProofFactsNeeded: [],
    hostedCheckoutFactsNeeded: [],
    reviewRequiredDependencyUpdates: 1,
  });
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit({
      ownerProofFactsNeeded: [],
      hostedCheckoutFactsNeeded: [],
    }),
    [],
    humanHelpQueueFreshness,
  );

  assert.equal(humanHelpQueueFreshness.complete, false);
  assert.deepEqual(humanHelpQueueFreshness.staleSections, ["Dependency review queue"]);
  assert.equal(audit.state, "human-help-queue-freshness-needed");
  assert.equal(audit.checkClear, false);
  assert.match(formatDearMeStandingLoopAudit(audit).join("\n"), /Dependency review queue/);
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
          checked: false,
          requiredForNamedBacklog: true,
        }],
      },
      nextAction: {
        label: "DM-MOBILE-QA",
        reason: "At least one P0/P1/P2 item is missing.",
      },
    }),
    docFreshnessAudit(),
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

test("surfaces stale INDEX coverage after backlog is complete", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit({
      complete: false,
      indexEntryPresent: false,
      nextAction: {
        label: "Update docs/dearme/INDEX.md",
        reason: "Record DM-TSX-PATCH-BUMP-2 and advance the shipped date.",
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

  assert.equal(audit.state, "doc-freshness-needed");
  assert.equal(audit.checkClear, false);
  assert.equal(audit.nextAction.command, "pnpm --silent dearme:doc-freshness-audit -- --check");
});

test("surfaces autonomous dependency bumps after backlog is complete", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
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
  assert.doesNotMatch(formatDearMeStandingLoopAudit(audit).join("\n"), /Human help queue:/);
});

test("surfaces code-owned goal regressions when owner facts are not the blocker", () => {
  const audit = summarizeDearMeStandingLoopAudit(
    backlogAudit(),
    docFreshnessAudit(),
    dependencyAudit(),
    goalAudit({
      nextAction: {
        label: "Restore private first wow",
        reason: "The first-wow proof is blocked.",
        command: "pnpm --silent dearme:aha-proof -- --check",
      },
      ownerProofFactsNeeded: [],
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
      "--index",
      "index.md",
      "--human-help-queue",
      "help.md",
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
      indexPath: "index.md",
      humanHelpQueuePath: "help.md",
      dependencyOutdatedJsonPath: "outdated.json",
      envFiles: [".proof.env"],
    },
  );
});
