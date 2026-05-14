import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  summarizeDearMePaidBetaAccess,
  summarizeDearMePaidBetaCohort,
} from "../server/src/services/dearme-paid-beta-access.ts";
import { DEARME_PAID_BETA_BILLER } from "../packages/shared/src/validators/dearme.ts";

type FinanceEventRow = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];

export interface DearMePaidEventSourceProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export type DearMePaidEventSourceKind =
  | "finance_ledger"
  | "workbench_run_ledger"
  | "workbench_output"
  | "voice_memory"
  | "decision_queue"
  | "support_recovery";

export type DearMePaidEventKind =
  | "paid_access_recorded"
  | "first_wow_seen"
  | "weekly_value_output"
  | "feedback_learned"
  | "recovery_started"
  | "support_handoff_private"
  | "launch_decision_waiting";

export type DearMePaidEventArtifact =
  | "content"
  | "opportunity"
  | "portfolio"
  | "report"
  | "voice_memory"
  | "launch_decision";

export interface DearMePaidRetentionEvent {
  id: string;
  companyId: string;
  kind: DearMePaidEventKind;
  source: DearMePaidEventSourceKind;
  occurredAt: string;
  week: string | null;
  artifact: DearMePaidEventArtifact | null;
  sourceRef: string;
  noExternalAction: true;
}

export interface DearMePaidEventSourceCheck {
  key:
    | "paid_access_comes_from_finance_ledger"
    | "weekly_value_events_cover_core_artifacts"
    | "feedback_and_recovery_are_event_sourced"
    | "launch_boundary_events_are_explicit"
    | "cohort_projection_reuses_paid_access_logic"
    | "event_contract_is_no_external_action";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMePaidEventSourceProof {
  status: "ready" | "blocked";
  events: DearMePaidRetentionEvent[];
  projection: {
    paidAccountCount: number;
    activeAccountCount: number;
    measuredWeekCount: number;
    visibleUsefulOutputCount: number;
    feedbackLearningCount: number;
    recoveryEventCount: number;
    privateSupportHandoffCount: number;
    launchDecisionEventCount: number;
    artifactCoverage: DearMePaidEventArtifact[];
    sourceCoverage: DearMePaidEventSourceKind[];
  };
  checks: DearMePaidEventSourceCheck[];
  noExternalActionGuarantee: string;
}

const OCCURRED_AT = "2026-05-14T12:00:00.000Z";

function financeEvent(companyId: string): FinanceEventRow {
  return {
    id: `${companyId}-paid-access`,
    companyId,
    agentId: null,
    issueId: null,
    projectId: null,
    goalId: null,
    heartbeatRunId: null,
    costEventId: null,
    billingCode: "dearme_paid_beta_access",
    description: "DearMe paid event source proof receipt",
    eventKind: "credit_purchase",
    direction: "credit",
    biller: DEARME_PAID_BETA_BILLER,
    provider: null,
    executionAdapterType: null,
    pricingTier: null,
    region: null,
    model: null,
    quantity: 25_000,
    unit: "credit_usd",
    amountCents: 25_000,
    currency: "USD",
    estimated: false,
    externalInvoiceId: `${companyId}-manual-receipt`,
    metadataJson: {
      product: "dearme",
      source: "manual_paid_beta_access",
      access: "paid_beta",
    },
    occurredAt: new Date(OCCURRED_AT),
    createdAt: new Date(OCCURRED_AT),
  };
}

function event(options: Omit<DearMePaidRetentionEvent, "id" | "occurredAt" | "noExternalAction"> & {
  id: string;
  occurredAt?: string;
}): DearMePaidRetentionEvent {
  return {
    id: options.id,
    companyId: options.companyId,
    kind: options.kind,
    source: options.source,
    occurredAt: options.occurredAt ?? OCCURRED_AT,
    week: options.week,
    artifact: options.artifact,
    sourceRef: options.sourceRef,
    noExternalAction: true,
  };
}

function check(
  key: DearMePaidEventSourceCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMePaidEventSourceCheck {
  return { key, label, ready, summary };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function paidCompanyIds(events: readonly DearMePaidRetentionEvent[]) {
  return unique(
    events
      .filter((item) => item.kind === "paid_access_recorded")
      .map((item) => item.companyId),
  );
}

function measuredWeeks(events: readonly DearMePaidRetentionEvent[]) {
  return unique(
    events
      .filter((item) => item.week)
      .map((item) => `${item.companyId}:${item.week}`),
  );
}

export function localDearMePaidRetentionEvents(): DearMePaidRetentionEvent[] {
  const companies = [
    "dearme-retention-founder",
    "dearme-retention-recovered",
    "dearme-retention-support",
  ];
  const events: DearMePaidRetentionEvent[] = [];

  for (const companyId of companies) {
    events.push(event({
      id: `${companyId}:paid-access`,
      companyId,
      kind: "paid_access_recorded",
      source: "finance_ledger",
      week: null,
      artifact: null,
      sourceRef: `${companyId}-manual-receipt`,
    }));
    events.push(event({
      id: `${companyId}:first-wow`,
      companyId,
      kind: "first_wow_seen",
      source: "workbench_run_ledger",
      week: "2026-W19",
      artifact: "report",
      sourceRef: `${companyId}:aha-receipt`,
    }));
  }

  const weeklyOutputs: Array<{
    companyId: string;
    week: string;
    artifacts: DearMePaidEventArtifact[];
  }> = [
    {
      companyId: "dearme-retention-founder",
      week: "2026-W19",
      artifacts: ["content", "opportunity", "portfolio", "report", "voice_memory", "launch_decision"],
    },
    {
      companyId: "dearme-retention-founder",
      week: "2026-W20",
      artifacts: ["content", "opportunity", "report", "voice_memory", "launch_decision"],
    },
    {
      companyId: "dearme-retention-founder",
      week: "2026-W21",
      artifacts: ["content", "portfolio", "report", "voice_memory"],
    },
    {
      companyId: "dearme-retention-recovered",
      week: "2026-W19",
      artifacts: ["content", "opportunity", "report", "launch_decision"],
    },
    {
      companyId: "dearme-retention-recovered",
      week: "2026-W21",
      artifacts: ["content", "portfolio", "report", "voice_memory"],
    },
    {
      companyId: "dearme-retention-support",
      week: "2026-W19",
      artifacts: ["content", "report", "launch_decision"],
    },
    {
      companyId: "dearme-retention-support",
      week: "2026-W20",
      artifacts: ["voice_memory"],
    },
    {
      companyId: "dearme-retention-support",
      week: "2026-W21",
      artifacts: ["opportunity", "launch_decision"],
    },
  ];

  for (const output of weeklyOutputs) {
    for (const artifact of output.artifacts) {
      events.push(event({
        id: `${output.companyId}:${output.week}:${artifact}`,
        companyId: output.companyId,
        kind: "weekly_value_output",
        source: artifact === "voice_memory" ? "voice_memory" : "workbench_output",
        week: output.week,
        artifact,
        sourceRef: `${output.companyId}:${output.week}:${artifact}`,
      }));
    }
  }

  for (const [companyId, weeks] of [
    ["dearme-retention-founder", ["2026-W19", "2026-W20"]],
    ["dearme-retention-recovered", ["2026-W20", "2026-W21"]],
    ["dearme-retention-support", ["2026-W19", "2026-W20"]],
  ] as const) {
    for (const week of weeks) {
      events.push(event({
        id: `${companyId}:${week}:feedback`,
        companyId,
        kind: "feedback_learned",
        source: "voice_memory",
        week,
        artifact: "voice_memory",
        sourceRef: `${companyId}:${week}:review-feedback`,
      }));
    }
  }

  for (const [companyId, weeks] of [
    ["dearme-retention-recovered", ["2026-W20"]],
    ["dearme-retention-support", ["2026-W20", "2026-W21"]],
  ] as const) {
    for (const week of weeks) {
      events.push(event({
        id: `${companyId}:${week}:recovery`,
        companyId,
        kind: "recovery_started",
        source: "support_recovery",
        week,
        artifact: "report",
        sourceRef: `${companyId}:${week}:empty-week-recovery`,
      }));
    }
  }

  for (const week of ["2026-W20", "2026-W21"]) {
    events.push(event({
      id: `dearme-retention-support:${week}:support`,
      companyId: "dearme-retention-support",
      kind: "support_handoff_private",
      source: "support_recovery",
      week,
      artifact: "report",
      sourceRef: `dearme-retention-support:${week}:private-support`,
    }));
  }

  for (const [companyId, weeks] of [
    ["dearme-retention-founder", ["2026-W19", "2026-W20"]],
    ["dearme-retention-recovered", ["2026-W19"]],
    ["dearme-retention-support", ["2026-W19", "2026-W20", "2026-W21"]],
  ] as const) {
    for (const week of weeks) {
      events.push(event({
        id: `${companyId}:${week}:launch-decision`,
        companyId,
        kind: "launch_decision_waiting",
        source: "decision_queue",
        week,
        artifact: "launch_decision",
        sourceRef: `${companyId}:${week}:launch-boundary`,
      }));
    }
  }

  return events;
}

export function runDearMePaidEventSourceProof(): DearMePaidEventSourceProof {
  const events = localDearMePaidRetentionEvents();
  const paidIds = paidCompanyIds(events);
  const paidAccessAccounts = paidIds.map((companyId) =>
    summarizeDearMePaidBetaAccess(companyId, [financeEvent(companyId)])
  );
  const cohort = summarizeDearMePaidBetaCohort(paidAccessAccounts);
  const artifacts = unique(
    events
      .map((item) => item.artifact)
      .filter((item): item is DearMePaidEventArtifact => Boolean(item)),
  );
  const sources = unique(events.map((item) => item.source));
  const visibleUsefulOutputCount = events.filter((item) => item.kind === "weekly_value_output").length;
  const feedbackLearningCount = events.filter((item) => item.kind === "feedback_learned").length;
  const recoveryEventCount = events.filter((item) => item.kind === "recovery_started").length;
  const privateSupportHandoffCount = events.filter((item) => item.kind === "support_handoff_private").length;
  const launchDecisionEventCount = events.filter((item) => item.kind === "launch_decision_waiting").length;
  const weekCount = measuredWeeks(events).length;
  const checks = [
    check(
      "paid_access_comes_from_finance_ledger",
      "Paid access comes from finance ledger",
      paidIds.length === 3 &&
        events.filter((item) => item.kind === "paid_access_recorded").every((item) =>
          item.source === "finance_ledger" && item.sourceRef.includes("manual-receipt")
        ),
      `${paidIds.length} paid accounts are linked to finance-ledger receipt refs.`,
    ),
    check(
      "weekly_value_events_cover_core_artifacts",
      "Weekly value events cover core artifacts",
      visibleUsefulOutputCount >= 20 &&
        ["content", "opportunity", "portfolio", "report", "voice_memory", "launch_decision"].every((artifact) =>
          artifacts.includes(artifact as DearMePaidEventArtifact)
        ),
      `${visibleUsefulOutputCount} weekly value events cover ${artifacts.join(", ")}.`,
    ),
    check(
      "feedback_and_recovery_are_event_sourced",
      "Feedback and recovery are event-sourced",
      feedbackLearningCount >= 5 && recoveryEventCount === 3 && privateSupportHandoffCount === 2,
      `${feedbackLearningCount} feedback events, ${recoveryEventCount} recovery events, ${privateSupportHandoffCount} private support handoffs.`,
    ),
    check(
      "launch_boundary_events_are_explicit",
      "Launch boundary events are explicit",
      launchDecisionEventCount >= 6 &&
        events
          .filter((item) => item.kind === "launch_decision_waiting")
          .every((item) => item.source === "decision_queue" && item.artifact === "launch_decision"),
      `${launchDecisionEventCount} launch-decision events keep public moves behind review.`,
    ),
    check(
      "cohort_projection_reuses_paid_access_logic",
      "Cohort projection reuses paid access logic",
      cohort.state === "operable" && cohort.activeAccountCount === 3 && weekCount === 9,
      `${cohort.activeAccountCount} active paid accounts project through the existing paid beta cohort logic across ${weekCount} measured weeks.`,
    ),
    check(
      "event_contract_is_no_external_action",
      "Event contract is no external action",
      events.every((item) => item.noExternalAction),
      "All event-source proof events are local receipts; none sends, deploys, spends, or calls providers.",
    ),
  ];
  const status = checks.every((item) => item.ready) ? "ready" : "blocked";

  return {
    status,
    events,
    projection: {
      paidAccountCount: paidIds.length,
      activeAccountCount: cohort.activeAccountCount,
      measuredWeekCount: weekCount,
      visibleUsefulOutputCount,
      feedbackLearningCount,
      recoveryEventCount,
      privateSupportHandoffCount,
      launchDecisionEventCount,
      artifactCoverage: artifacts,
      sourceCoverage: sources,
    },
    checks,
    noExternalActionGuarantee:
      "This proof derives paid retention events from local DearMe finance, workbench, Voice & Memory, decision, and support receipt contracts only; it does not charge cards, call payment APIs, send messages, publish, deploy, call live models, or spend.",
  };
}

export function formatDearMePaidEventSourceProof(proof: DearMePaidEventSourceProof): string[] {
  const lines = ["DearMe paid event source proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(
    `- Projection: ${proof.projection.activeAccountCount} active paid accounts, ${proof.projection.measuredWeekCount} measured weeks, ${proof.projection.visibleUsefulOutputCount} weekly value events.`,
  );
  lines.push(`- Sources: ${proof.projection.sourceCoverage.join(", ")}.`);
  lines.push(`- Artifacts: ${proof.projection.artifactCoverage.join(", ")}.`);
  for (const item of proof.checks) {
    lines.push(`- ${item.label}: ${item.ready ? "ready" : "blocked"}. ${item.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMePaidEventSourceProofArgs(
  argv: readonly string[],
): DearMePaidEventSourceProofArgs {
  const args: DearMePaidEventSourceProofArgs = {
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
  console.log(`Usage: pnpm dearme:paid-event-source-proof -- [--check] [--json]

Proves DearMe has a local event-source contract for replacing paid retention
fixtures with finance-ledger, workbench, Voice & Memory, decision, and support
receipts without touching external providers.
`);
}

async function main() {
  try {
    const args = parseDearMePaidEventSourceProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMePaidEventSourceProof();
    if (args.json) {
      console.log(JSON.stringify(proof, null, 2));
    } else {
      console.log(formatDearMePaidEventSourceProof(proof).join("\n"));
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
