import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEARME_PAID_BETA_BILLER } from "../packages/shared/src/validators/dearme.ts";
import {
  describeDearMePrivateCycleBlocker,
  summarizeDearMePaidBetaAccess,
  summarizeDearMePaidBetaCohort,
} from "../server/src/services/dearme-paid-beta-access.ts";

type FinanceEventRow = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];
type PaidBetaAccess = ReturnType<typeof summarizeDearMePaidBetaAccess>;
type PaidBetaCohort = ReturnType<typeof summarizeDearMePaidBetaCohort>;

export interface DearMePaidOpsProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export interface DearMePaidOpsProofCheck {
  key:
    | "empty_cohort_not_live_operations"
    | "healthy_paid_accounts_operable"
    | "attention_accounts_prioritized"
    | "private_cycle_blockers_enforced"
    | "cohort_totals_preserve_paid_credit";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMePaidOpsProof {
  status: "ready" | "blocked";
  cohorts: {
    empty: PaidBetaCohort;
    healthy: PaidBetaCohort;
    attention: PaidBetaCohort;
  };
  accounts: {
    trial: PaidBetaAccess;
    healthy: PaidBetaAccess;
    warning: PaidBetaAccess;
    hardStop: PaidBetaAccess;
  };
  privateCycleBlockers: {
    trial: string | null;
    healthy: string | null;
    hardStop: string | null;
  };
  checks: DearMePaidOpsProofCheck[];
  noExternalActionGuarantee: string;
}

const DEFAULT_OCCURRED_AT = "2026-05-14T12:00:00.000Z";

function money(amountCents: number, currency = "USD") {
  const dollars = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  }).format(dollars);
}

function financeEvent(options: {
  id: string;
  companyId: string;
  amountCents: number;
  externalInvoiceId: string;
}): FinanceEventRow {
  return {
    id: options.id,
    companyId: options.companyId,
    agentId: null,
    issueId: null,
    projectId: null,
    goalId: null,
    heartbeatRunId: null,
    costEventId: null,
    billingCode: "dearme_paid_beta_access",
    description: "DearMe paid ops proof receipt",
    eventKind: "credit_purchase",
    direction: "credit",
    biller: DEARME_PAID_BETA_BILLER,
    provider: null,
    executionAdapterType: null,
    pricingTier: null,
    region: null,
    model: null,
    quantity: options.amountCents,
    unit: "credit_usd",
    amountCents: options.amountCents,
    currency: "USD",
    estimated: false,
    externalInvoiceId: options.externalInvoiceId,
    metadataJson: {
      product: "dearme",
      source: "manual_paid_beta_access",
      access: "paid_beta",
    },
    occurredAt: new Date(DEFAULT_OCCURRED_AT),
    createdAt: new Date(DEFAULT_OCCURRED_AT),
  };
}

function paidAccount(
  companyId: string,
  amountCents: number,
  spendCents: number,
  budgetCents: number,
  utilizationPercent: number,
) {
  return summarizeDearMePaidBetaAccess(
    companyId,
    [
      financeEvent({
        id: `${companyId}-receipt`,
        companyId,
        amountCents,
        externalInvoiceId: `${companyId}-manual-receipt`,
      }),
    ],
    {
      spendCents,
      budgetCents,
      utilizationPercent,
    },
  );
}

function proofCheck(
  key: DearMePaidOpsProofCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMePaidOpsProofCheck {
  return { key, label, ready, summary };
}

export function runDearMePaidOpsProof(): DearMePaidOpsProof {
  const trial = summarizeDearMePaidBetaAccess("dearme-ops-trial", []);
  const healthy = paidAccount("dearme-ops-healthy", 25_000, 5_000, 25_000, 20);
  const healthySecond = paidAccount("dearme-ops-healthy-2", 50_000, 10_000, 50_000, 20);
  const warning = paidAccount("dearme-ops-warning", 50_000, 40_000, 50_000, 80);
  const hardStop = paidAccount("dearme-ops-hard-stop", 25_000, 25_000, 25_000, 100);
  const empty = summarizeDearMePaidBetaCohort([]);
  const healthyCohort = summarizeDearMePaidBetaCohort([healthy, healthySecond]);
  const attentionCohort = summarizeDearMePaidBetaCohort([trial, warning, hardStop]);
  const trialBlocker = describeDearMePrivateCycleBlocker(trial);
  const healthyBlocker = describeDearMePrivateCycleBlocker(healthy);
  const hardStopBlocker = describeDearMePrivateCycleBlocker(hardStop);
  const attentionOrder = attentionCohort.attentionAccounts.map((account) => account.state).join(" > ");
  const checks = [
    proofCheck(
      "empty_cohort_not_live_operations",
      "Empty cohort is not treated as live operations",
      empty.state === "empty" && empty.activeAccountCount === 0 && empty.decisionRequiredAccountCount === 0,
      `${empty.label}. ${empty.nextAction}`,
    ),
    proofCheck(
      "healthy_paid_accounts_operable",
      "Healthy paid accounts stay operable",
      healthyCohort.state === "operable" &&
        healthyCohort.activeAccountCount === 2 &&
        healthyCohort.decisionRequiredAccountCount === 0 &&
        healthyBlocker === null,
      `${healthyCohort.label}. ${healthyCohort.summary}`,
    ),
    proofCheck(
      "attention_accounts_prioritized",
      "Attention accounts are prioritized",
      attentionCohort.state === "attention" &&
        attentionCohort.hardStopAccountCount === 1 &&
        attentionCohort.warningAccountCount === 1 &&
        attentionCohort.trialAccountCount === 1 &&
        attentionOrder === "hard_stop > trial_preview > warning",
      `Attention order: ${attentionOrder}.`,
    ),
    proofCheck(
      "private_cycle_blockers_enforced",
      "Private-cycle blockers are enforced",
      trialBlocker !== null && healthyBlocker === null && hardStopBlocker !== null,
      "Trial accounts and exhausted accounts block private cycles; healthy paid accounts do not.",
    ),
    proofCheck(
      "cohort_totals_preserve_paid_credit",
      "Cohort totals preserve paid credit",
      attentionCohort.netPaidCents === 75_000 &&
        attentionCohort.remainingCreditCents === 10_000 &&
        attentionCohort.cycleSpendCents === 65_000,
      `${money(attentionCohort.netPaidCents)} net paid, ${money(attentionCohort.remainingCreditCents)} remaining, ${money(attentionCohort.cycleSpendCents)} used this cycle.`,
    ),
  ];
  const status = checks.every((check) => check.ready) ? "ready" : "blocked";

  return {
    status,
    cohorts: {
      empty,
      healthy: healthyCohort,
      attention: attentionCohort,
    },
    accounts: {
      trial,
      healthy,
      warning,
      hardStop,
    },
    privateCycleBlockers: {
      trial: trialBlocker,
      healthy: healthyBlocker,
      hardStop: hardStopBlocker,
    },
    checks,
    noExternalActionGuarantee:
      "This proof uses local entitlement, cohort, and cycle-guardrail logic only; it does not charge cards, call payment APIs, send messages, publish, deploy, or spend.",
  };
}

export function formatDearMePaidOpsProof(proof: DearMePaidOpsProof): string[] {
  const lines = ["DearMe paid operations proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(`- Empty cohort: ${proof.cohorts.empty.label}. ${proof.cohorts.empty.nextAction}`);
  lines.push(
    `- Healthy cohort: ${proof.cohorts.healthy.label}. ${proof.cohorts.healthy.activeAccountCount} active accounts; ${money(proof.cohorts.healthy.remainingCreditCents)} remaining credit.`,
  );
  lines.push(
    `- Attention cohort: ${proof.cohorts.attention.label}. ${proof.cohorts.attention.hardStopAccountCount} paused, ${proof.cohorts.attention.warningAccountCount} near guardrail, ${proof.cohorts.attention.trialAccountCount} trial.`,
  );
  for (const account of proof.cohorts.attention.attentionAccounts) {
    lines.push(`  - ${account.companyId}: ${account.label}. Next: ${account.nextAction}`);
  }
  for (const check of proof.checks) {
    lines.push(`- ${check.label}: ${check.ready ? "ready" : "blocked"}. ${check.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMePaidOpsProofArgs(argv: readonly string[]): DearMePaidOpsProofArgs {
  const args: DearMePaidOpsProofArgs = {
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
  console.log(`Usage: pnpm dearme:paid-ops-proof -- [--check] [--json]

Proves local paid-user operations without external providers:
empty cohorts are not overclaimed, healthy paid accounts remain operable,
trial/near-guardrail/paused accounts are routed to the right next action,
and private-cycle blockers are enforced.
`);
}

async function main() {
  try {
    const args = parseDearMePaidOpsProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMePaidOpsProof();
    if (args.json) {
      console.log(JSON.stringify({ proof }, null, 2));
    } else {
      for (const line of formatDearMePaidOpsProof(proof)) {
        console.log(line);
      }
    }

    if (args.check && proof.status !== "ready") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  void main();
}
