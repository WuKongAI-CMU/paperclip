import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDearMePaidEventSourceProof } from "./dearme-paid-event-source-proof.ts";
import { runDearMePaidOpsProof } from "./dearme-paid-ops-proof.ts";
import { runDearMeSupportRecoveryProof } from "./dearme-support-recovery-proof.ts";

export interface DearMeCohortRetentionProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export type DearMeRetentionAccountState =
  | "renewal_ready"
  | "recovered"
  | "at_risk_support";

export type DearMeRetentionArtifact =
  | "content"
  | "opportunity"
  | "portfolio"
  | "report"
  | "voice_memory"
  | "launch_decision";

export interface DearMeRetentionWeek {
  week: string;
  visibleUsefulOutputs: number;
  artifacts: DearMeRetentionArtifact[];
  feedbackItemsLearned: number;
  recoveryTriggered: boolean;
  supportHandoffPrivate: boolean;
  launchDecisionPending: boolean;
}

export interface DearMeRetentionAccount {
  companyId: string;
  plan: "paid_beta";
  ahaMinutes: number;
  state: DearMeRetentionAccountState;
  riskOwner: "autonomous_team" | "chief_of_staff";
  renewalSignal: string;
  nextAction: string;
  weeks: DearMeRetentionWeek[];
}

export interface DearMeCohortRetentionCheck {
  key:
    | "paid_cohort_has_measurable_weeks"
    | "weekly_value_covers_core_outputs"
    | "retention_risk_routes_to_recovery_or_support"
    | "feedback_becomes_next_cycle_learning"
    | "launch_boundary_preserved"
    | "paid_event_source_contract_ready"
    | "paid_ops_and_recovery_proofs_stay_green";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMeCohortRetentionProof {
  status: "ready" | "blocked";
  accounts: DearMeRetentionAccount[];
  cohort: {
    paidAccountCount: number;
    measuredWeekCount: number;
    visibleUsefulOutputCount: number;
    feedbackLearningCount: number;
    recoveryWeekCount: number;
    supportHandoffCount: number;
    renewalReadyCount: number;
    recoveredCount: number;
    atRiskSupportCount: number;
    artifactCoverage: DearMeRetentionArtifact[];
  };
  checks: DearMeCohortRetentionCheck[];
  noExternalActionGuarantee: string;
}

function retentionAccount(account: DearMeRetentionAccount): DearMeRetentionAccount {
  return account;
}

function check(
  key: DearMeCohortRetentionCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMeCohortRetentionCheck {
  return { key, label, ready, summary };
}

function uniqueArtifacts(accounts: readonly DearMeRetentionAccount[]): DearMeRetentionArtifact[] {
  const order: DearMeRetentionArtifact[] = [
    "content",
    "opportunity",
    "portfolio",
    "report",
    "voice_memory",
    "launch_decision",
  ];
  const seen = new Set(accounts.flatMap((account) => account.weeks.flatMap((week) => week.artifacts)));
  return order.filter((artifact) => seen.has(artifact));
}

function samplePaidCohort(): DearMeRetentionAccount[] {
  return [
    retentionAccount({
      companyId: "dearme-retention-founder",
      plan: "paid_beta",
      ahaMinutes: 4,
      state: "renewal_ready",
      riskOwner: "autonomous_team",
      renewalSignal: "Renewal-ready: weekly proof keeps compounding without launch risk.",
      nextAction: "Prepare next private proof pack and wait for the launch call.",
      weeks: [
        {
          week: "2026-W19",
          visibleUsefulOutputs: 6,
          artifacts: ["content", "opportunity", "portfolio", "report", "voice_memory", "launch_decision"],
          feedbackItemsLearned: 1,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: true,
        },
        {
          week: "2026-W20",
          visibleUsefulOutputs: 5,
          artifacts: ["content", "opportunity", "report", "voice_memory", "launch_decision"],
          feedbackItemsLearned: 1,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: true,
        },
        {
          week: "2026-W21",
          visibleUsefulOutputs: 5,
          artifacts: ["content", "portfolio", "report", "voice_memory"],
          feedbackItemsLearned: 0,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: false,
        },
      ],
    }),
    retentionAccount({
      companyId: "dearme-retention-recovered",
      plan: "paid_beta",
      ahaMinutes: 5,
      state: "recovered",
      riskOwner: "autonomous_team",
      renewalSignal: "Recovered: one empty week triggered a private make-good before the account went silent.",
      nextAction: "Ship the make-good privately, then keep the weekly proof cadence.",
      weeks: [
        {
          week: "2026-W19",
          visibleUsefulOutputs: 4,
          artifacts: ["content", "opportunity", "report", "launch_decision"],
          feedbackItemsLearned: 0,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: true,
        },
        {
          week: "2026-W20",
          visibleUsefulOutputs: 0,
          artifacts: [],
          feedbackItemsLearned: 1,
          recoveryTriggered: true,
          supportHandoffPrivate: false,
          launchDecisionPending: false,
        },
        {
          week: "2026-W21",
          visibleUsefulOutputs: 4,
          artifacts: ["content", "portfolio", "report", "voice_memory"],
          feedbackItemsLearned: 1,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: false,
        },
      ],
    }),
    retentionAccount({
      companyId: "dearme-retention-support",
      plan: "paid_beta",
      ahaMinutes: 4,
      state: "at_risk_support",
      riskOwner: "chief_of_staff",
      renewalSignal: "At-risk but owned: low output and stuck decisions are routed to private support.",
      nextAction: "Send the private support brief and prepare a smaller recovery cycle.",
      weeks: [
        {
          week: "2026-W19",
          visibleUsefulOutputs: 2,
          artifacts: ["content", "report", "launch_decision"],
          feedbackItemsLearned: 1,
          recoveryTriggered: false,
          supportHandoffPrivate: false,
          launchDecisionPending: true,
        },
        {
          week: "2026-W20",
          visibleUsefulOutputs: 1,
          artifacts: ["voice_memory"],
          feedbackItemsLearned: 1,
          recoveryTriggered: true,
          supportHandoffPrivate: true,
          launchDecisionPending: true,
        },
        {
          week: "2026-W21",
          visibleUsefulOutputs: 2,
          artifacts: ["opportunity", "launch_decision"],
          feedbackItemsLearned: 0,
          recoveryTriggered: true,
          supportHandoffPrivate: true,
          launchDecisionPending: true,
        },
      ],
    }),
  ];
}

export function runDearMeCohortRetentionProof(): DearMeCohortRetentionProof {
  const paidOpsProof = runDearMePaidOpsProof();
  const paidEventSourceProof = runDearMePaidEventSourceProof();
  const supportRecoveryProof = runDearMeSupportRecoveryProof();
  const accounts = samplePaidCohort();
  const weeks = accounts.flatMap((account) => account.weeks);
  const artifactCoverage = uniqueArtifacts(accounts);
  const visibleUsefulOutputCount = weeks.reduce((sum, week) => sum + week.visibleUsefulOutputs, 0);
  const feedbackLearningCount = weeks.reduce((sum, week) => sum + week.feedbackItemsLearned, 0);
  const recoveryWeekCount = weeks.filter((week) => week.recoveryTriggered).length;
  const supportHandoffCount = weeks.filter((week) => week.supportHandoffPrivate).length;
  const renewalReadyCount = accounts.filter((account) => account.state === "renewal_ready").length;
  const recoveredCount = accounts.filter((account) => account.state === "recovered").length;
  const atRiskSupportCount = accounts.filter((account) => account.state === "at_risk_support").length;
  const everyPaidAccountHasAha = accounts.every((account) => account.ahaMinutes <= 5);
  const everyZeroWeekRecovered = weeks
    .filter((week) => week.visibleUsefulOutputs === 0)
    .every((week) => week.recoveryTriggered);
  const everySupportRiskOwned = accounts
    .filter((account) => account.state === "at_risk_support")
    .every((account) => account.riskOwner === "chief_of_staff" &&
      account.weeks.some((week) => week.supportHandoffPrivate));
  const everyLaunchMovePending = weeks
    .filter((week) => week.launchDecisionPending)
    .every((week) => week.artifacts.includes("launch_decision") || week.supportHandoffPrivate);
  const eventSourceProjectionMatches = paidEventSourceProof.status === "ready" &&
    paidEventSourceProof.projection.paidAccountCount === accounts.length &&
    paidEventSourceProof.projection.activeAccountCount === accounts.length &&
    paidEventSourceProof.projection.measuredWeekCount === weeks.length &&
    paidEventSourceProof.projection.visibleUsefulOutputCount === visibleUsefulOutputCount &&
    paidEventSourceProof.projection.feedbackLearningCount === feedbackLearningCount &&
    paidEventSourceProof.projection.recoveryEventCount === recoveryWeekCount &&
    paidEventSourceProof.projection.privateSupportHandoffCount === supportHandoffCount &&
    paidEventSourceProof.projection.launchDecisionEventCount >= weeks.filter((week) => week.launchDecisionPending).length &&
    artifactCoverage.every((artifact) => paidEventSourceProof.projection.artifactCoverage.includes(artifact));
  const checks = [
    check(
      "paid_cohort_has_measurable_weeks",
      "Paid cohort has measurable weeks",
      accounts.length === 3 && weeks.length === 9 && everyPaidAccountHasAha,
      `${accounts.length} paid accounts, ${weeks.length} measured weeks, each with a five-minute-or-less aha receipt.`,
    ),
    check(
      "weekly_value_covers_core_outputs",
      "Weekly value covers core outputs",
      visibleUsefulOutputCount >= 20 && artifactCoverage.length === 6,
      `${visibleUsefulOutputCount} visible useful outputs cover ${artifactCoverage.join(", ")}.`,
    ),
    check(
      "retention_risk_routes_to_recovery_or_support",
      "Retention risk routes to recovery or support",
      everyZeroWeekRecovered && everySupportRiskOwned && recoveryWeekCount === 3 && supportHandoffCount === 2,
      `${recoveryWeekCount} recovery weeks and ${supportHandoffCount} private support handoffs keep at-risk accounts owned.`,
    ),
    check(
      "feedback_becomes_next_cycle_learning",
      "Feedback becomes next-cycle learning",
      feedbackLearningCount >= 5 && accounts.every((account) =>
        account.weeks.some((week) => week.feedbackItemsLearned > 0 || week.artifacts.includes("voice_memory"))
      ),
      `${feedbackLearningCount} feedback items become Voice & Memory or next-cycle work across the paid cohort.`,
    ),
    check(
      "launch_boundary_preserved",
      "Launch boundary is preserved",
      everyLaunchMovePending,
      "Public posts, outbound messages, page changes, and spend stay behind launch decisions or private support.",
    ),
    check(
      "paid_event_source_contract_ready",
      "Paid event source contract is ready",
      eventSourceProjectionMatches,
      "Paid-event proof maps finance, workbench, Voice & Memory, decision, and support receipts into the same retention analytics before real cohorts replace local fixtures.",
    ),
    check(
      "paid_ops_and_recovery_proofs_stay_green",
      "Paid ops and recovery proofs stay green",
      paidOpsProof.status === "ready" && paidEventSourceProof.status === "ready" && supportRecoveryProof.status === "ready",
      "Retention analytics sit on the existing paid-ops, paid-event-source, and support-recovery contracts.",
    ),
  ];
  const status = checks.every((item) => item.ready) ? "ready" : "blocked";

  return {
    status,
    accounts,
    cohort: {
      paidAccountCount: accounts.length,
      measuredWeekCount: weeks.length,
      visibleUsefulOutputCount,
      feedbackLearningCount,
      recoveryWeekCount,
      supportHandoffCount,
      renewalReadyCount,
      recoveredCount,
      atRiskSupportCount,
      artifactCoverage,
    },
    checks,
    noExternalActionGuarantee:
      "This proof uses local paid-cohort fixtures plus existing paid-ops, paid-event-source, and recovery contracts only; it does not charge cards, call payment APIs, send messages, publish, deploy, run live models, or spend.",
  };
}

export function formatDearMeCohortRetentionProof(proof: DearMeCohortRetentionProof): string[] {
  const lines = ["DearMe cohort retention proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(
    `- Cohort retention analytics: ${proof.cohort.paidAccountCount} paid accounts, ${proof.cohort.measuredWeekCount} measured weeks, ${proof.cohort.visibleUsefulOutputCount} visible useful outputs.`,
  );
  lines.push(
    `- Renewal states: ${proof.cohort.renewalReadyCount} renewal-ready, ${proof.cohort.recoveredCount} recovered, ${proof.cohort.atRiskSupportCount} at-risk with support owner.`,
  );
  lines.push(`- Artifact coverage: ${proof.cohort.artifactCoverage.join(", ")}.`);
  for (const account of proof.accounts) {
    lines.push(`- ${account.companyId}: ${account.state}. ${account.renewalSignal} Next: ${account.nextAction}`);
  }
  for (const item of proof.checks) {
    lines.push(`- ${item.label}: ${item.ready ? "ready" : "blocked"}. ${item.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMeCohortRetentionProofArgs(
  argv: readonly string[],
): DearMeCohortRetentionProofArgs {
  const args: DearMeCohortRetentionProofArgs = {
    help: false,
    json: false,
    check: false,
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (const arg of normalizedArgv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:cohort-retention-proof -- [--check] [--json]

Proves DearMe can operate a paid retention pulse from local cohort analytics:
weekly value, renewal states, empty-week recovery, support routing, feedback
learning, and launch boundaries are all checked without external providers.
`);
}

async function main() {
  try {
    const args = parseDearMeCohortRetentionProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMeCohortRetentionProof();
    if (args.json) {
      console.log(JSON.stringify(proof, null, 2));
    } else {
      console.log(formatDearMeCohortRetentionProof(proof).join("\n"));
    }
    if (args.check && proof.status !== "ready") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const currentPath = resolve(fileURLToPath(import.meta.url));
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";

if (currentPath === invokedPath) {
  await main();
}
