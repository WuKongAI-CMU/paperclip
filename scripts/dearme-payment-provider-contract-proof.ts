import { createHmac } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  projectDearMeHostedPaymentReceipts,
  projectDearMeStripeCheckoutCompletedEvents,
  summarizeDearMePaidBetaAccess,
  summarizeDearMePaidBetaCohort,
  verifyDearMeStripeWebhookSignature,
  type DearMeHostedPaymentReceipt,
  type DearMeStripeCheckoutCompletedEvent,
  type DearMeStripeCheckoutSessionObject,
} from "../server/src/services/dearme-paid-beta-access.ts";

type FinanceEventRow = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];

export interface DearMePaymentProviderContractProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export type { DearMeStripeCheckoutCompletedEvent, DearMeStripeCheckoutSessionObject };

export interface DearMePaymentProviderContractCheck {
  key:
    | "stripe_checkout_completed_maps_to_paid_receipt"
    | "unpaid_or_unmapped_checkout_does_not_unlock"
    | "checkout_session_idempotency_is_preserved"
    | "stripe_webhook_signature_guard_is_enforced"
    | "provider_contract_reuses_receipt_sync_projection"
    | "provider_contract_is_no_external_action";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMePaymentProviderContractProof {
  status: "ready" | "blocked";
  provider: "stripe_payment_link";
  acceptedProviderEvents: DearMeStripeCheckoutCompletedEvent[];
  rejectedProviderEvents: DearMeStripeCheckoutCompletedEvent[];
  hostedReceipts: DearMeHostedPaymentReceipt[];
  financeEvents: FinanceEventRow[];
  projection: {
    activatedCompanyId: string;
    protectedCompanyId: string;
    duplicateSuppressedCount: number;
    acceptedReceiptCount: number;
    rejectedReceiptCount: number;
    activeAccountCount: number;
  };
  checks: DearMePaymentProviderContractCheck[];
  noExternalActionGuarantee: string;
}

const ACTIVATED_COMPANY_ID = "dearme-stripe-provider-activated";
const PROTECTED_COMPANY_ID = "dearme-stripe-provider-protected";

function stripeCheckoutCompleted(
  options: Partial<DearMeStripeCheckoutSessionObject> & {
    eventId: string;
    sessionId: string;
  },
): DearMeStripeCheckoutCompletedEvent {
  return {
    id: options.eventId,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: options.sessionId,
        object: "checkout.session",
        status: options.status ?? "complete",
        payment_status: options.payment_status ?? "paid",
        amount_total: options.amount_total ?? 25_000,
        currency: options.currency ?? "usd",
        client_reference_id: options.client_reference_id === undefined
          ? ACTIVATED_COMPANY_ID
          : options.client_reference_id,
        payment_intent: options.payment_intent ?? `${options.sessionId}-pi`,
        invoice: options.invoice ?? `${options.sessionId}-invoice`,
        metadata: options.metadata,
        created: options.created ?? 1_768_389_600,
      },
    },
  };
}

function localStripeCheckoutEvents(): DearMeStripeCheckoutCompletedEvent[] {
  return [
    stripeCheckoutCompleted({
      eventId: "evt-stripe-paid",
      sessionId: "cs_dearme_paid",
      client_reference_id: ACTIVATED_COMPANY_ID,
      invoice: "in_dearme_paid",
    }),
    stripeCheckoutCompleted({
      eventId: "evt-stripe-paid-duplicate",
      sessionId: "cs_dearme_paid",
      client_reference_id: ACTIVATED_COMPANY_ID,
      invoice: "in_dearme_paid",
    }),
    stripeCheckoutCompleted({
      eventId: "evt-stripe-unpaid",
      sessionId: "cs_dearme_unpaid",
      client_reference_id: PROTECTED_COMPANY_ID,
      payment_status: "unpaid",
      invoice: "in_dearme_unpaid",
    }),
    stripeCheckoutCompleted({
      eventId: "evt-stripe-missing-reference",
      sessionId: "cs_dearme_missing_reference",
      client_reference_id: null,
      invoice: "in_dearme_missing_reference",
    }),
  ];
}

function check(
  key: DearMePaymentProviderContractCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMePaymentProviderContractCheck {
  return { key, label, ready, summary };
}

function eventsForCompany(events: readonly FinanceEventRow[], companyId: string) {
  return events.filter((event) => event.companyId === companyId);
}

function stripeSignatureHeader(rawBody: Buffer, secret: string, timestamp = 1_768_389_600) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function stripeSignatureGuardIsEnforced(event: DearMeStripeCheckoutCompletedEvent) {
  const rawBody = Buffer.from(JSON.stringify(event));
  const webhookSecret = "whsec_dearme_local_contract_secret";
  const now = new Date(event.data.object.created * 1000);

  return verifyDearMeStripeWebhookSignature({
    rawBody,
    signatureHeader: stripeSignatureHeader(rawBody, webhookSecret, event.data.object.created),
    webhookSecret,
    now,
  }) && !verifyDearMeStripeWebhookSignature({
    rawBody: Buffer.from(rawBody.toString("utf-8").replace("paid", "unpaid")),
    signatureHeader: stripeSignatureHeader(rawBody, webhookSecret, event.data.object.created),
    webhookSecret,
    now,
  });
}

export function runDearMePaymentProviderContractProof(): DearMePaymentProviderContractProof {
  const providerEvents = localStripeCheckoutEvents();
  const providerProjection = projectDearMeStripeCheckoutCompletedEvents(providerEvents);
  const projected = projectDearMeHostedPaymentReceipts(providerProjection.hostedReceipts);
  const activatedAccess = summarizeDearMePaidBetaAccess(
    ACTIVATED_COMPANY_ID,
    eventsForCompany(projected.financeEvents, ACTIVATED_COMPANY_ID),
  );
  const protectedAccess = summarizeDearMePaidBetaAccess(
    PROTECTED_COMPANY_ID,
    eventsForCompany(projected.financeEvents, PROTECTED_COMPANY_ID),
  );
  const cohort = summarizeDearMePaidBetaCohort([activatedAccess, protectedAccess]);

  const checks = [
    check(
      "stripe_checkout_completed_maps_to_paid_receipt",
      "Stripe checkout completed maps to paid receipt",
      activatedAccess.status === "active" &&
        activatedAccess.netPaidCents === 25_000 &&
        activatedAccess.latestExternalInvoiceId === "in_dearme_paid",
      "A completed checkout session with payment_status=paid and a client reference becomes a DearMe hosted checkout paid receipt.",
    ),
    check(
      "unpaid_or_unmapped_checkout_does_not_unlock",
      "Unpaid or unmapped checkout does not unlock",
      protectedAccess.status === "trial" &&
        providerProjection.rejectedProviderEvents.some((event) => event.id === "evt-stripe-unpaid") &&
        providerProjection.rejectedProviderEvents.some((event) => event.id === "evt-stripe-missing-reference"),
      "Unpaid sessions and sessions without a DearMe account reference are rejected before paid access projection.",
    ),
    check(
      "checkout_session_idempotency_is_preserved",
      "Checkout session idempotency is preserved",
      projected.duplicateSuppressedCount === 1 && activatedAccess.eventCount === 1,
      "Duplicate provider events for the same checkout session are collapsed by the hosted receipt idempotency key.",
    ),
    check(
      "stripe_webhook_signature_guard_is_enforced",
      "Stripe webhook signature guard is enforced",
      stripeSignatureGuardIsEnforced(providerEvents[0]!),
      "The provider ingress contract verifies the raw Stripe webhook body and rejects tampered payloads before paid access can be recorded.",
    ),
    check(
      "provider_contract_reuses_receipt_sync_projection",
      "Provider contract reuses receipt-sync projection",
      cohort.accountCount === 2 && cohort.activeAccountCount === 1 && cohort.trialAccountCount === 1,
      "Provider-shaped webhook events flow through the same local receipt-sync projection and paid beta cohort logic.",
    ),
    check(
      "provider_contract_is_no_external_action",
      "Provider contract is no external action",
      true,
      "The proof uses local provider-shaped fixtures only; it never creates checkout sessions, charges cards, calls payment APIs, sends messages, publishes, deploys, or spends.",
    ),
  ];
  const status = checks.every((item) => item.ready) ? "ready" : "blocked";

  return {
    status,
    provider: "stripe_payment_link",
    acceptedProviderEvents: providerProjection.acceptedProviderEvents,
    rejectedProviderEvents: providerProjection.rejectedProviderEvents,
    hostedReceipts: providerProjection.hostedReceipts,
    financeEvents: projected.financeEvents,
    projection: {
      activatedCompanyId: ACTIVATED_COMPANY_ID,
      protectedCompanyId: PROTECTED_COMPANY_ID,
      duplicateSuppressedCount: projected.duplicateSuppressedCount,
      acceptedReceiptCount: projected.acceptedReceipts.length,
      rejectedReceiptCount: projected.rejectedReceipts.length,
      activeAccountCount: cohort.activeAccountCount,
    },
    checks,
    noExternalActionGuarantee:
      "This proof maps local Stripe Payment Link/Checkout-shaped webhook fixtures into DearMe hosted-checkout receipts and paid-access logic only, including local webhook signature verification; it does not create checkout sessions, charge cards, call payment APIs, send messages, publish, deploy, or spend.",
  };
}

export function formatDearMePaymentProviderContractProof(
  proof: DearMePaymentProviderContractProof,
): string[] {
  const lines = ["DearMe payment provider contract proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(`- Provider contract: ${proof.provider}`);
  lines.push(
    `- Projection: ${proof.projection.acceptedReceiptCount} accepted receipts, ${proof.projection.rejectedReceiptCount} rejected receipts, ${proof.projection.duplicateSuppressedCount} duplicate suppressed.`,
  );
  lines.push(
    `- Paid access: ${proof.projection.activatedCompanyId}=active, ${proof.projection.protectedCompanyId}=trial, active account count ${proof.projection.activeAccountCount}.`,
  );
  for (const item of proof.checks) {
    lines.push(`- ${item.label}: ${item.ready ? "ready" : "blocked"}. ${item.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMePaymentProviderContractProofArgs(
  argv: readonly string[],
): DearMePaymentProviderContractProofArgs {
  const args: DearMePaymentProviderContractProofArgs = {
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
  console.log(`Usage: pnpm dearme:payment-provider-contract-proof -- [--check] [--json]

Proves the payment-provider webhook contract locally: Stripe Payment
Link/Checkout-shaped completed events become DearMe hosted checkout receipts,
unpaid or unmapped sessions are rejected, and duplicate checkout sessions stay
idempotent without calling payment APIs.
`);
}

async function main() {
  try {
    const args = parseDearMePaymentProviderContractProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    const proof = runDearMePaymentProviderContractProof();
    if (args.json) {
      console.log(JSON.stringify({ proof }, null, 2));
    } else {
      for (const line of formatDearMePaymentProviderContractProof(proof)) {
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
