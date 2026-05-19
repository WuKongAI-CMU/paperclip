import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDearMeDailyPlainHumanHelpMarkdown,
  buildDearMeDailyPlainSummary,
  formatDearMeDailyLocalDate,
  parseDearMeDailyLedgerEntries,
  parseDearMeDailyPlainSummaryArgs,
  runDearMeDailyPlainSummary,
} from "./dearme-daily-plain-summary.ts";
import { inspectDearMePaymentReadiness } from "./dearme-payment-readiness.ts";
import type { DearMeStandingLoopAudit } from "./dearme-standing-loop-audit.ts";

const ledgerMarkdown = [
  "2026-05-15 22:10  DM-OLDER  abc12345  PR #10  Standing  Older slice shipped; CI green.",
  "2026-05-16 14:44  DM-NEXT-PROOF-HUMAN-HELP-LIVE-LANES  1e23f6d1  PR #69  Standing  Next-proof handoff split guarded live proof commands; CI green.",
  "2026-05-16 15:16  DM-OWNER-PROOF-FACT-LABELS  335f0bad  PR #70  Standing  Status and shared checklist text now use exact owner-proof labels; CI green.",
].join("\n");

function standingLoopAudit(): DearMeStandingLoopAudit {
  return {
    state: "owner-blocked",
    checkClear: true,
    backlog: {
      complete: true,
      required: { total: 37, shipped: 37, missing: [] },
      standingOpen: [],
      ledgerIds: ["DM-OWNER-PROOF-FACT-LABELS"],
      nextAction: {
        label: "Continue standing loop",
        reason: "Every P0/P1/P2 handoff backlog item has a run-ledger entry.",
      },
    },
    docFreshness: {
      complete: true,
      latestLedgerEntry: {
        date: "2026-05-16",
        time: "15:16",
        id: "DM-OWNER-PROOF-FACT-LABELS",
        sha: "335f0bad",
        pr: "PR #70",
        summary: "Status and shared checklist text now use exact owner-proof labels; CI green.",
      },
      indexShippedDate: "2026-05-16",
      indexEntryPresent: true,
      nextAction: {
        label: "Continue standing loop",
        reason: "INDEX.md records the latest non-doc-freshness run-ledger slice.",
      },
    },
    humanHelpQueueFreshness: {
      complete: true,
      operatingDate: "2026-05-16",
      staleSections: [],
      missingSections: [],
      nextAction: {
        label: "Continue standing loop",
        reason: "Human help queue is verified for the current DearMe operating day.",
        command: "pnpm --silent dearme:standing-loop-audit -- --check",
      },
    },
    dependency: {
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
    },
    goal: {
      complete: false,
      verdict: "not complete",
      promptToArtifactChecklist: [],
      items: [
        {
          key: "openclaw_message_reuse",
          label: "OpenClaw shared Telegram/iMessage message proof",
          status: "blocked",
          requiredForGoal: true,
          evidence: "OpenClaw message proof waits for the iMessage/SMS smoke recipient.",
          blockers: ["imessage_message"],
          commands: ["pnpm --silent dearme:next-proof -- --target openclaw_messages"],
        },
        {
          key: "live_provider_set",
          label: "Live provider proof set",
          status: "blocked",
          requiredForGoal: true,
          evidence: "Live provider proof waits for approved professional-network and iMessage facts.",
          blockers: ["linkedin_dm", "imessage_message"],
          commands: ["pnpm --silent dearme:provider-smoke -- --check --target all"],
        },
        {
          key: "first_payment_hosted_checkout",
          label: "First-$29 hosted checkout path",
          status: "blocked",
          requiredForGoal: true,
          evidence: "Hosted checkout remains blocked until payment setup facts are configured.",
          blockers: [
            "DEARME_PAYMENT_LINK_URL is missing.",
            "DEARME_PAYMENT_RECEIPT_SYNC_SECRET or STRIPE_WEBHOOK_SECRET is missing (sensitive; value hidden).",
          ],
          commands: ["pnpm --silent dearme:payment-readiness"],
        },
      ],
      ownerProofFactsNeeded: [
        "Professional-network partner messages endpoint: provide DEARME_LINKEDIN_DM_MESSAGES_URL",
      ],
      hostedCheckoutFactsNeeded: [
        "DEARME_PAYMENT_LINK_URL is missing.",
      ],
      dailyPlainSummaryFactsNeeded: [
        "DEARME_PLAIN_API_KEY is missing.",
        "DEARME_CODEX_DAILY_PLAIN_EMAIL or DEARME_PLAIN_DAILY_EMAIL is missing.",
      ],
      nextAction: {
        label: "OpenClaw shared Telegram/iMessage message proof",
        reason: "Blocked by imessage_message.",
        command: "pnpm --silent dearme:next-proof -- --target openclaw_messages",
        ownerFacts: [
          "Professional-network partner messages endpoint: provide DEARME_LINKEDIN_DM_MESSAGES_URL",
        ],
      },
    },
    dailyPlainSummaryFacts: [
      "DEARME_PLAIN_API_KEY is missing.",
      "DEARME_CODEX_DAILY_PLAIN_EMAIL or DEARME_PLAIN_DAILY_EMAIL is missing.",
    ],
    nextAction: {
      label: "OpenClaw shared Telegram/iMessage message proof",
      reason: "Blocked by imessage_message.",
      command: "pnpm --silent dearme:next-proof -- --target openclaw_messages",
      ownerFacts: [
        "Professional-network partner messages endpoint: provide DEARME_LINKEDIN_DM_MESSAGES_URL",
      ],
      hostedCheckoutFacts: [
        "DEARME_PAYMENT_LINK_URL is missing.",
      ],
    },
  };
}

test("parses DearMe run-ledger entries for the daily summary", () => {
  const entries = parseDearMeDailyLedgerEntries(ledgerMarkdown);
  assert.equal(entries.length, 3);
  assert.equal(entries[1]?.id, "DM-NEXT-PROOF-HUMAN-HELP-LIVE-LANES");
  assert.equal(entries[2]?.pr, "PR #70");
});

test("builds the required daily Plain summary from ledger and standing-loop evidence", () => {
  const summary = buildDearMeDailyPlainSummary({
    date: "2026-05-16",
    ledgerEntries: parseDearMeDailyLedgerEntries(ledgerMarkdown),
    standingLoopAudit: standingLoopAudit(),
    paymentReadiness: inspectDearMePaymentReadiness({}),
  });

  assert.equal(summary.subject, "Codex daily — 2026-05-16");
  assert.match(summary.body, /Shipped today:/);
  assert.match(summary.body, /DM-NEXT-PROOF-HUMAN-HELP-LIVE-LANES \(PR #69, 1e23f6d1\)/);
  assert.match(summary.body, /DM-OWNER-PROOF-FACT-LABELS \(PR #70, 335f0bad\)/);
  assert.match(summary.body, /Standing loop: owner-blocked/);
  assert.match(summary.body, /Doc freshness: clear/);
  assert.match(summary.body, /Human help queue freshness: clear \(2026-05-16\)/);
  assert.match(summary.body, /Autonomous dependency updates: 0/);
  assert.match(summary.body, /Review-required dependency updates: 1/);
  assert.match(summary.body, /First-\$29 path:/);
  assert.match(summary.body, /Private beta sales: ready now\. Manual receipt recording can unlock paid beta access/);
  assert.match(summary.body, /Self-serve checkout claim: blocked\. Self-serve checkout is not claimable until the \$29\/month DearMe offer payment link and receipt sync are configured\./);
  assert.match(summary.body, /Keep selling private beta through recorded receipts/);
  assert.match(summary.body, /does not create checkout sessions, charge cards, call payment APIs/);
  assert.match(summary.body, /Goal completion blockers:/);
  assert.match(summary.body, /Shared Telegram\/iMessage message proof: blocked \(blocked by iMessage\/SMS approved smoke recipient\)/);
  assert.match(summary.body, /Live provider proof set: blocked \(blocked by professional-network approved endpoint and recipient; iMessage\/SMS approved smoke recipient\)/);
  assert.match(summary.body, /First-\$29 hosted checkout path: blocked \(blocked by DEARME_PAYMENT_LINK_URL is missing; DEARME_PAYMENT_RECEIPT_SYNC_SECRET or STRIPE_WEBHOOK_SECRET is missing \(sensitive; value hidden\)\)/);
  assert.match(summary.body, /typescript: 5\.9\.3 -> 6\.0\.3 \(major\) - Major dependency updates wait for human review\./);
  assert.match(summary.body, /DEARME_LINKEDIN_DM_MESSAGES_URL/);
  assert.match(summary.body, /DEARME_PAYMENT_LINK_URL is missing/);
  assert.match(summary.body, /Daily Plain summary facts needed:/);
  assert.match(summary.body, /DEARME_PLAIN_API_KEY is missing/);
  assert.match(summary.body, /DEARME_CODEX_DAILY_PLAIN_EMAIL or DEARME_PLAIN_DAILY_EMAIL is missing/);
  assert.match(summary.body, /Human help queue: docs\/NEEDS_HUMAN_HELP\.md has the reply templates and safe follow-up commands for these blockers\./);
  assert.match(summary.body, /Next command: See docs\/NEEDS_HUMAN_HELP\.md for the current safe no-send shared-message proof command\./);
  assert.doesNotMatch(summary.body, /\bOpenClaw\b/);
  assert.doesNotMatch(summary.body, /\bpaperclip\b/i);
  assert.doesNotMatch(summary.body, /\bimessage_message\b/);
  assert.doesNotMatch(summary.body, /\blinkedin_dm\b/);
});

test("points dependency-only daily summaries at the human help queue", () => {
  const audit = standingLoopAudit();
  audit.goal.ownerProofFactsNeeded = [];
  audit.goal.hostedCheckoutFactsNeeded = [];
  audit.goal.dailyPlainSummaryFactsNeeded = [];
  audit.goal.nextAction.ownerFacts = [];
  audit.dailyPlainSummaryFacts = [];
  audit.nextAction = {
    label: "Continue standing loop",
    reason: "Only review-required dependency updates are available.",
    command: "pnpm --silent dearme:dependency-loop-audit -- --check",
  };

  const summary = buildDearMeDailyPlainSummary({
    date: "2026-05-16",
    ledgerEntries: parseDearMeDailyLedgerEntries(ledgerMarkdown),
    standingLoopAudit: audit,
    paymentReadiness: inspectDearMePaymentReadiness({}),
  });

  assert.match(summary.body, /Review-required dependency updates:/);
  assert.match(summary.body, /typescript: 5\.9\.3 -> 6\.0\.3 \(major\) - Major dependency updates wait for human review\./);
  assert.match(summary.body, /Human help queue: docs\/NEEDS_HUMAN_HELP\.md has the reply templates and safe follow-up commands for these blockers\./);
  assert.doesNotMatch(summary.body, /Owner proof facts needed:/);
  assert.doesNotMatch(summary.body, /Daily Plain summary facts needed:/);
});

test("defaults daily summary dates to the DearMe operating day instead of UTC", () => {
  assert.equal(
    formatDearMeDailyLocalDate(new Date("2026-05-17T00:32:00.000Z"), "America/New_York"),
    "2026-05-16",
  );
  assert.equal(
    formatDearMeDailyLocalDate(new Date("2026-05-17T04:32:00.000Z"), "America/New_York"),
    "2026-05-17",
  );
});

test("skips without live network when Plain is not configured", async () => {
  let called = false;
  const result = await runDearMeDailyPlainSummary(parseDearMeDailyPlainSummaryArgs([
    "--date",
    "2026-05-16",
  ]), {
    env: {},
    readLedger: async () => ledgerMarkdown,
    runStandingLoopAudit: async () => standingLoopAudit(),
    inspectPaymentReadiness: () => inspectDearMePaymentReadiness({}),
    createThread: async () => {
      called = true;
      return { ok: true, skipped: false, status: 200, threadId: "thread_123" };
    },
  });

  assert.equal(called, false);
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "dearme_plain_api_key_unset");
});

test("builds Peter-facing human-help markdown for daily Plain configuration", () => {
  const markdown = buildDearMeDailyPlainHumanHelpMarkdown({
    date: "2026-05-16",
    apiKeyConfigured: false,
    recipientEmailConfigured: false,
  });

  assert.match(markdown, /Daily Plain summary delivery configuration/);
  assert.match(markdown, /DEARME_PLAIN_API_KEY/);
  assert.match(markdown, /DEARME_CODEX_DAILY_PLAIN_EMAIL/);
  assert.match(markdown, /Blocking: no for product development or private-beta operations; yes for delivering the required daily Plain summary automatically/);
  assert.match(markdown, /Last verified: 2026-05-16 with `pnpm --silent dearme:daily-plain-summary -- --json`/);
  assert.match(markdown, /pnpm --silent dearme:daily-plain-summary -- --json/);
  assert.doesNotMatch(markdown, /plain-key|peter@example\.com/);
});

test("parses daily Plain human-help markdown flag", () => {
  const args = parseDearMeDailyPlainSummaryArgs([
    "--date",
    "2026-05-16",
    "--human-help-markdown",
  ]);

  assert.equal(args.humanHelpMarkdown, true);
  assert.equal(args.date, "2026-05-16");
});

test("posts a low-severity Plain thread when configured", async () => {
  const result = await runDearMeDailyPlainSummary(parseDearMeDailyPlainSummaryArgs([
    "--date",
    "2026-05-16",
  ]), {
    env: {
      DEARME_PLAIN_API_KEY: "plain-key",
      DEARME_CODEX_DAILY_PLAIN_EMAIL: "peter@example.com",
    },
    readLedger: async () => ledgerMarkdown,
    runStandingLoopAudit: async () => standingLoopAudit(),
    inspectPaymentReadiness: () => inspectDearMePaymentReadiness({}),
    createThread: async (input, options) => {
      assert.equal(options.apiKey, "plain-key");
      assert.equal(input.email, "peter@example.com");
      assert.equal(input.name, "Peter");
      assert.equal(input.subject, "Codex daily — 2026-05-16");
      assert.equal(input.severity, "low");
      assert.match(input.body, /DM-OWNER-PROOF-FACT-LABELS/);
      return { ok: true, skipped: false, status: 200, threadId: "thread_123" };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.threadId, "thread_123");
});
