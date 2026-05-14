import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEARME_PAID_BETA_BILLER } from "../packages/shared/src/validators/dearme.ts";
import {
  describeDearMePrivateCycleBlocker,
  summarizeDearMePaidBetaAccess,
} from "../server/src/services/dearme-paid-beta-access.ts";

type FinanceEventRow = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];

export interface DearMePaidLoopProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  companyId: string;
  amountCents: number;
  currency: string;
  externalInvoiceId: string;
  occurredAt: string;
}

export interface DearMePaidLoopProofCheck {
  key:
    | "trial_blocks_first_cycle"
    | "receipt_activates_paid_access"
    | "paid_access_unblocks_first_cycle"
    | "receipt_reference_preserved";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMePaidLoopProof {
  status: "ready" | "blocked";
  companyId: string;
  receipt: {
    amountCents: number;
    currency: string;
    externalInvoiceId: string;
    description: string;
    biller: typeof DEARME_PAID_BETA_BILLER;
    source: "manual_paid_beta_access";
  };
  beforePayment: {
    accessStatus: "trial" | "active";
    firstCycleBlocker: string | null;
    canStartBrandTeam: boolean;
  };
  afterPayment: {
    accessStatus: "trial" | "active";
    netPaidCents: number;
    remainingCreditCents: number;
    latestExternalInvoiceId: string | null;
    firstCycleBlocker: string | null;
    canStartBrandTeam: boolean;
  };
  checks: DearMePaidLoopProofCheck[];
  noExternalActionGuarantee: string;
}

const DEFAULT_COMPANY_ID = "dearme-paid-loop-smoke";
const DEFAULT_AMOUNT_CENTS = 25_000;
const DEFAULT_CURRENCY = "USD";
const DEFAULT_EXTERNAL_INVOICE_ID = "manual-smoke-paid-loop";
const DEFAULT_OCCURRED_AT = "2026-05-14T12:00:00.000Z";

function money(amountCents: number, currency: string) {
  const dollars = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  }).format(dollars);
}

function financeEvent(options: {
  companyId: string;
  amountCents: number;
  currency: string;
  externalInvoiceId: string;
  occurredAt: string;
}): FinanceEventRow {
  return {
    id: "dearme-paid-loop-proof-event",
    companyId: options.companyId,
    agentId: null,
    issueId: null,
    projectId: null,
    goalId: null,
    heartbeatRunId: null,
    costEventId: null,
    billingCode: "dearme_paid_beta_access",
    description: "DearMe paid beta proof receipt",
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
    currency: options.currency,
    estimated: false,
    externalInvoiceId: options.externalInvoiceId,
    metadataJson: {
      product: "dearme",
      source: "manual_paid_beta_access",
      access: "paid_beta",
    },
    occurredAt: new Date(options.occurredAt),
    createdAt: new Date(options.occurredAt),
  };
}

function proofCheck(
  key: DearMePaidLoopProofCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMePaidLoopProofCheck {
  return { key, label, ready, summary };
}

export function runDearMePaidLoopProof(options: Partial<DearMePaidLoopProofArgs> = {}): DearMePaidLoopProof {
  const companyId = options.companyId ?? DEFAULT_COMPANY_ID;
  const amountCents = options.amountCents ?? DEFAULT_AMOUNT_CENTS;
  const currency = (options.currency ?? DEFAULT_CURRENCY).toUpperCase();
  const externalInvoiceId = options.externalInvoiceId ?? DEFAULT_EXTERNAL_INVOICE_ID;
  const occurredAt = options.occurredAt ?? DEFAULT_OCCURRED_AT;

  const beforeAccess = summarizeDearMePaidBetaAccess(companyId, []);
  const beforeBlocker = describeDearMePrivateCycleBlocker(beforeAccess);
  const receiptEvent = financeEvent({
    companyId,
    amountCents,
    currency,
    externalInvoiceId,
    occurredAt,
  });
  const afterAccess = summarizeDearMePaidBetaAccess(companyId, [receiptEvent]);
  const afterBlocker = describeDearMePrivateCycleBlocker(afterAccess);
  const checks = [
    proofCheck(
      "trial_blocks_first_cycle",
      "Trial account blocks first cycle",
      beforeAccess.status === "trial" && beforeBlocker !== null,
      beforeBlocker ?? "Trial account did not produce a blocker.",
    ),
    proofCheck(
      "receipt_activates_paid_access",
      "Receipt activates paid access",
      afterAccess.status === "active" && afterAccess.netPaidCents === amountCents,
      `${money(afterAccess.netPaidCents, currency)} net paid access is recorded.`,
    ),
    proofCheck(
      "paid_access_unblocks_first_cycle",
      "Paid access unblocks first cycle",
      afterAccess.entitlement.canStartPrivateWork && afterBlocker === null,
      afterBlocker ?? "First-cycle start has no paid-beta blocker after receipt.",
    ),
    proofCheck(
      "receipt_reference_preserved",
      "Receipt reference preserved",
      afterAccess.latestExternalInvoiceId === externalInvoiceId,
      afterAccess.latestExternalInvoiceId
        ? `Latest receipt reference is ${afterAccess.latestExternalInvoiceId}.`
        : "No receipt reference was preserved.",
    ),
  ];
  const status = checks.every((check) => check.ready) ? "ready" : "blocked";

  return {
    status,
    companyId,
    receipt: {
      amountCents,
      currency,
      externalInvoiceId,
      description: "DearMe paid beta proof receipt",
      biller: DEARME_PAID_BETA_BILLER,
      source: "manual_paid_beta_access",
    },
    beforePayment: {
      accessStatus: beforeAccess.status,
      firstCycleBlocker: beforeBlocker,
      canStartBrandTeam: beforeAccess.entitlement.canStartPrivateWork,
    },
    afterPayment: {
      accessStatus: afterAccess.status,
      netPaidCents: afterAccess.netPaidCents,
      remainingCreditCents: afterAccess.remainingCreditCents,
      latestExternalInvoiceId: afterAccess.latestExternalInvoiceId,
      firstCycleBlocker: afterBlocker,
      canStartBrandTeam: afterAccess.entitlement.canStartPrivateWork,
    },
    checks,
    noExternalActionGuarantee:
      "This proof uses the existing paid beta entitlement and first-cycle blocker logic only; it does not charge cards, call payment APIs, send messages, publish, deploy, or spend.",
  };
}

export function formatDearMePaidLoopProof(proof: DearMePaidLoopProof): string[] {
  const lines = ["DearMe paid loop proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(
    `- Before payment: ${proof.beforePayment.accessStatus}. First cycle ${
      proof.beforePayment.firstCycleBlocker ? `blocked: ${proof.beforePayment.firstCycleBlocker}` : "not blocked"
    }`,
  );
  lines.push(
    `- Receipt recorded: ${money(proof.receipt.amountCents, proof.receipt.currency)} ${proof.receipt.currency}; reference ${proof.receipt.externalInvoiceId}.`,
  );
  lines.push(
    `- After payment: ${proof.afterPayment.accessStatus}. Net paid ${money(
      proof.afterPayment.netPaidCents,
      proof.receipt.currency,
    )}; remaining credit ${money(proof.afterPayment.remainingCreditCents, proof.receipt.currency)}; first cycle ${
      proof.afterPayment.firstCycleBlocker ? `blocked: ${proof.afterPayment.firstCycleBlocker}` : "unblocked"
    }.`,
  );
  for (const check of proof.checks) {
    lines.push(`- ${check.label}: ${check.ready ? "ready" : "blocked"}. ${check.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMePaidLoopProofArgs(argv: readonly string[]): DearMePaidLoopProofArgs {
  const args: DearMePaidLoopProofArgs = {
    help: false,
    json: false,
    check: false,
    companyId: DEFAULT_COMPANY_ID,
    amountCents: DEFAULT_AMOUNT_CENTS,
    currency: DEFAULT_CURRENCY,
    externalInvoiceId: DEFAULT_EXTERNAL_INVOICE_ID,
    occurredAt: DEFAULT_OCCURRED_AT,
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index]!;
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--company-id") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--company-id requires a value");
      args.companyId = value;
      index += 1;
    } else if (arg.startsWith("--company-id=")) {
      args.companyId = arg.slice("--company-id=".length);
    } else if (arg === "--amount-cents") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--amount-cents requires a value");
      args.amountCents = parsePositiveInteger(value, "--amount-cents");
      index += 1;
    } else if (arg.startsWith("--amount-cents=")) {
      args.amountCents = parsePositiveInteger(arg.slice("--amount-cents=".length), "--amount-cents");
    } else if (arg === "--currency") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--currency requires a value");
      args.currency = parseCurrency(value);
      index += 1;
    } else if (arg.startsWith("--currency=")) {
      args.currency = parseCurrency(arg.slice("--currency=".length));
    } else if (arg === "--external-invoice-id") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--external-invoice-id requires a value");
      args.externalInvoiceId = value;
      index += 1;
    } else if (arg.startsWith("--external-invoice-id=")) {
      args.externalInvoiceId = arg.slice("--external-invoice-id=".length);
    } else if (arg === "--occurred-at") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--occurred-at requires a value");
      args.occurredAt = parseDateTime(value);
      index += 1;
    } else if (arg.startsWith("--occurred-at=")) {
      args.occurredAt = parseDateTime(arg.slice("--occurred-at=".length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("--currency must be a three-letter code");
  }
  return currency;
}

function parseDateTime(value: string): string {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error("--occurred-at must be a valid datetime");
  }
  return new Date(value).toISOString();
}

function printHelp() {
  console.log(`Usage: pnpm dearme:paid-loop-proof -- [--check] [--json]

Proves the local paid beta loop without real payment providers:
trial access blocks first-cycle work, a receipt activates paid beta access,
and active paid access removes the first-cycle paid-beta blocker.

Options:
  --company-id <id>
  --amount-cents <cents>
  --currency <USD>
  --external-invoice-id <id>
  --occurred-at <iso-date>
`);
}

async function main() {
  try {
    const args = parseDearMePaidLoopProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMePaidLoopProof(args);
    if (args.json) {
      console.log(JSON.stringify({ proof }, null, 2));
    } else {
      for (const line of formatDearMePaidLoopProof(proof)) {
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
