import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  projectDearMeHostedPaymentReceipts,
  summarizeDearMePaidBetaAccess,
  summarizeDearMePaidBetaCohort,
  type DearMeHostedPaymentReceipt,
} from "../server/src/services/dearme-paid-beta-access.ts";

type FinanceEventRow = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];

export interface DearMePaymentReceiptSyncProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export type { DearMeHostedPaymentReceipt };

export interface DearMePaymentReceiptSyncCheck {
  key:
    | "verified_paid_receipt_creates_credit"
    | "unverified_or_unpaid_receipts_do_not_unlock"
    | "duplicate_receipts_are_idempotent"
    | "ledger_replay_is_idempotent"
    | "refund_receipt_reduces_paid_credit"
    | "cohort_projection_uses_existing_paid_access_logic"
    | "receipt_sync_is_no_external_action";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMePaymentReceiptSyncProof {
  status: "ready" | "blocked";
  acceptedReceipts: DearMeHostedPaymentReceipt[];
  rejectedReceipts: DearMeHostedPaymentReceipt[];
  financeEvents: FinanceEventRow[];
  projection: {
    activatedCompanyId: string;
    protectedCompanyId: string;
    refundedCompanyId: string;
    activatedStatus: "trial" | "active";
    protectedStatus: "trial" | "active";
    refundedRemainingCreditCents: number;
    duplicateSuppressedCount: number;
    existingDuplicateSuppressedCount: number;
    acceptedReceiptCount: number;
    rejectedReceiptCount: number;
    activeAccountCount: number;
  };
  checks: DearMePaymentReceiptSyncCheck[];
  noExternalActionGuarantee: string;
}

const OCCURRED_AT = "2026-05-14T12:00:00.000Z";
const ACTIVATED_COMPANY_ID = "dearme-checkout-activated";
const PROTECTED_COMPANY_ID = "dearme-checkout-protected";
const REFUNDED_COMPANY_ID = "dearme-checkout-refunded";

function receipt(options: Omit<DearMeHostedPaymentReceipt, "provider" | "currency" | "occurredAt"> & {
  currency?: string;
  occurredAt?: string;
}): DearMeHostedPaymentReceipt {
  return {
    provider: "hosted_checkout",
    currency: options.currency ?? "USD",
    occurredAt: options.occurredAt ?? OCCURRED_AT,
    ...options,
  };
}

function check(
  key: DearMePaymentReceiptSyncCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMePaymentReceiptSyncCheck {
  return { key, label, ready, summary };
}

function localHostedCheckoutReceipts(): DearMeHostedPaymentReceipt[] {
  return [
    receipt({
      id: "evt-paid-activated",
      companyId: ACTIVATED_COMPANY_ID,
      kind: "checkout_paid",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-activated",
      signatureVerified: true,
      idempotencyKey: "checkout-session-activated",
    }),
    receipt({
      id: "evt-paid-activated-duplicate",
      companyId: ACTIVATED_COMPANY_ID,
      kind: "checkout_paid",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-activated",
      signatureVerified: true,
      idempotencyKey: "checkout-session-activated",
    }),
    receipt({
      id: "evt-unverified",
      companyId: PROTECTED_COMPANY_ID,
      kind: "checkout_paid",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-unverified",
      signatureVerified: false,
      idempotencyKey: "checkout-session-unverified",
    }),
    receipt({
      id: "evt-unpaid",
      companyId: PROTECTED_COMPANY_ID,
      kind: "checkout_unpaid",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-unpaid",
      signatureVerified: true,
      idempotencyKey: "checkout-session-unpaid",
    }),
    receipt({
      id: "evt-refund-paid",
      companyId: REFUNDED_COMPANY_ID,
      kind: "checkout_paid",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-refunded",
      signatureVerified: true,
      idempotencyKey: "checkout-session-refunded-paid",
    }),
    receipt({
      id: "evt-refund",
      companyId: REFUNDED_COMPANY_ID,
      kind: "checkout_refunded",
      amountCents: 10_000,
      externalInvoiceId: "hosted-refund-refunded",
      signatureVerified: true,
      idempotencyKey: "checkout-session-refunded-refund",
    }),
  ];
}

function eventsForCompany(events: readonly FinanceEventRow[], companyId: string) {
  return events.filter((event) => event.companyId === companyId);
}

export function runDearMePaymentReceiptSyncProof(): DearMePaymentReceiptSyncProof {
  const projected = projectDearMeHostedPaymentReceipts(localHostedCheckoutReceipts());
  const replayed = projectDearMeHostedPaymentReceipts(
    [
      receipt({
        id: "evt-paid-activated-replayed",
        companyId: ACTIVATED_COMPANY_ID,
        kind: "checkout_paid",
        amountCents: 25_000,
        externalInvoiceId: "hosted-invoice-activated",
        signatureVerified: true,
        idempotencyKey: "checkout-session-activated",
      }),
    ],
    { existingFinanceEvents: projected.financeEvents },
  );
  const activatedAccess = summarizeDearMePaidBetaAccess(
    ACTIVATED_COMPANY_ID,
    eventsForCompany(projected.financeEvents, ACTIVATED_COMPANY_ID),
  );
  const protectedAccess = summarizeDearMePaidBetaAccess(
    PROTECTED_COMPANY_ID,
    eventsForCompany(projected.financeEvents, PROTECTED_COMPANY_ID),
  );
  const refundedAccess = summarizeDearMePaidBetaAccess(
    REFUNDED_COMPANY_ID,
    eventsForCompany(projected.financeEvents, REFUNDED_COMPANY_ID),
  );
  const cohort = summarizeDearMePaidBetaCohort([activatedAccess, protectedAccess, refundedAccess]);
  const checks = [
    check(
      "verified_paid_receipt_creates_credit",
      "Verified paid receipt creates credit",
      activatedAccess.status === "active" &&
        activatedAccess.netPaidCents === 25_000 &&
        activatedAccess.latestExternalInvoiceId === "hosted-invoice-activated",
      "A verified hosted checkout receipt becomes DearMe paid beta credit with the invoice reference preserved.",
    ),
    check(
      "unverified_or_unpaid_receipts_do_not_unlock",
      "Unverified or unpaid receipts do not unlock",
      protectedAccess.status === "trial" &&
        projected.rejectedReceipts.some((item) => item.id === "evt-unverified") &&
        projected.rejectedReceipts.some((item) => item.id === "evt-unpaid"),
      "Unsigned and unpaid checkout receipts are rejected before paid access is summarized.",
    ),
    check(
      "duplicate_receipts_are_idempotent",
      "Duplicate receipts are idempotent",
      projected.duplicateSuppressedCount === 1 && activatedAccess.eventCount === 1,
      "A duplicate checkout event with the same idempotency key is suppressed instead of double-crediting access.",
    ),
    check(
      "ledger_replay_is_idempotent",
      "Ledger replay is idempotent",
      replayed.existingDuplicateSuppressedCount === 1 &&
        replayed.acceptedReceipts.length === 0 &&
        replayed.financeEvents.length === 0,
      "A replayed webhook receipt already present in the paid beta ledger is suppressed before a second finance event is created.",
    ),
    check(
      "refund_receipt_reduces_paid_credit",
      "Refund receipt reduces paid credit",
      refundedAccess.status === "active" &&
        refundedAccess.netPaidCents === 15_000 &&
        refundedAccess.remainingCreditCents === 15_000,
      "A refund receipt is projected as a debit, reducing net paid credit without deleting the payment history.",
    ),
    check(
      "cohort_projection_uses_existing_paid_access_logic",
      "Cohort projection uses existing paid access logic",
      cohort.accountCount === 3 && cohort.activeAccountCount === 2 && cohort.trialAccountCount === 1,
      `${cohort.activeAccountCount} active paid accounts and ${cohort.trialAccountCount} protected trial account are summarized by the existing paid cohort model.`,
    ),
    check(
      "receipt_sync_is_no_external_action",
      "Receipt sync proof is no external action",
      true,
      "The proof uses local receipt fixtures only; it never creates checkout sessions, charges cards, calls payment APIs, sends messages, publishes, deploys, or spends.",
    ),
  ];
  const status = checks.every((item) => item.ready) ? "ready" : "blocked";

  return {
    status,
    acceptedReceipts: projected.acceptedReceipts,
    rejectedReceipts: projected.rejectedReceipts,
    financeEvents: projected.financeEvents,
    projection: {
      activatedCompanyId: ACTIVATED_COMPANY_ID,
      protectedCompanyId: PROTECTED_COMPANY_ID,
      refundedCompanyId: REFUNDED_COMPANY_ID,
      activatedStatus: activatedAccess.status,
      protectedStatus: protectedAccess.status,
      refundedRemainingCreditCents: refundedAccess.remainingCreditCents,
      duplicateSuppressedCount: projected.duplicateSuppressedCount,
      existingDuplicateSuppressedCount: replayed.existingDuplicateSuppressedCount,
      acceptedReceiptCount: projected.acceptedReceipts.length,
      rejectedReceiptCount: projected.rejectedReceipts.length,
      activeAccountCount: cohort.activeAccountCount,
    },
    checks,
    noExternalActionGuarantee:
      "This proof runs local hosted-checkout receipt fixtures through DearMe payment projection and paid-access logic only; it does not create checkout sessions, charge cards, call payment APIs, send messages, publish, deploy, or spend.",
  };
}

export function formatDearMePaymentReceiptSyncProof(
  proof: DearMePaymentReceiptSyncProof,
): string[] {
  const lines = ["DearMe payment receipt sync proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(
    `- Projection: ${proof.projection.acceptedReceiptCount} accepted receipts, ${proof.projection.rejectedReceiptCount} rejected receipts, ${proof.projection.duplicateSuppressedCount} duplicate suppressed, ${proof.projection.existingDuplicateSuppressedCount} ledger replay suppressed.`,
  );
  lines.push(
    `- Paid access: ${proof.projection.activatedCompanyId}=${proof.projection.activatedStatus}, ${proof.projection.protectedCompanyId}=${proof.projection.protectedStatus}, refunded remaining credit ${proof.projection.refundedRemainingCreditCents} cents.`,
  );
  for (const item of proof.checks) {
    lines.push(`- ${item.label}: ${item.ready ? "ready" : "blocked"}. ${item.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMePaymentReceiptSyncProofArgs(
  argv: readonly string[],
): DearMePaymentReceiptSyncProofArgs {
  const args: DearMePaymentReceiptSyncProofArgs = {
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
  console.log(`Usage: pnpm dearme:payment-receipt-sync-proof -- [--check] [--json]

Proves the hosted checkout receipt-sync contract locally: verified paid receipts
activate paid beta access, unsigned/unpaid receipts are rejected, duplicates are
idempotent, and refunds reduce paid credit without calling payment APIs.
`);
}

async function main() {
  try {
    const args = parseDearMePaymentReceiptSyncProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMePaymentReceiptSyncProof();
    if (args.json) {
      console.log(JSON.stringify(proof, null, 2));
    } else {
      console.log(formatDearMePaymentReceiptSyncProof(proof).join("\n"));
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
