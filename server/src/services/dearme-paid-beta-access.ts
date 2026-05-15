import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { financeEvents } from "@paperclipai/db";
import {
  DEARME_PAID_BETA_BILLER,
  dearMePaidBetaCohortSummarySchema,
  dearMePaidBetaStatusSchema,
  describeDearMePaidBetaEntitlement,
  type DearMeCycleGuardrail,
  type DearMeHostedCheckoutStatus,
  type DearMePaidBetaCohortAttention,
  type DearMePaidBetaCohortSummary,
  type DearMePaidBetaRecord,
  type DearMePaidBetaStatus,
} from "@paperclipai/shared";
import { costService } from "./costs.js";
import { financeService } from "./finance.js";

type FinanceEventRow = typeof financeEvents.$inferSelect;
type CycleSpendSummary = {
  spendCents: number;
  budgetCents: number;
  utilizationPercent: number;
};

export type DearMeHostedPaymentReceiptKind =
  | "checkout_paid"
  | "checkout_unpaid"
  | "checkout_refunded";

export interface DearMeHostedPaymentReceipt {
  id: string;
  companyId: string;
  provider: "hosted_checkout";
  kind: DearMeHostedPaymentReceiptKind;
  amountCents: number;
  currency: string;
  externalInvoiceId: string;
  signatureVerified: boolean;
  idempotencyKey: string;
  occurredAt: string;
}

export interface DearMeHostedPaymentReceiptProjection {
  acceptedReceipts: DearMeHostedPaymentReceipt[];
  rejectedReceipts: DearMeHostedPaymentReceipt[];
  duplicateSuppressedCount: number;
  existingDuplicateSuppressedCount: number;
  financeEvents: FinanceEventRow[];
}

export interface DearMeHostedPaymentReceiptProjectionOptions {
  existingFinanceEvents?: readonly FinanceEventRow[];
  reason?: DearMeHostedPaymentReceiptRecordOptions["reason"];
}

export interface DearMeHostedPaymentReceiptRecordResult {
  acceptedReceipts: DearMeHostedPaymentReceipt[];
  rejectedReceipts: DearMeHostedPaymentReceipt[];
  duplicateSuppressedCount: number;
  existingDuplicateSuppressedCount: number;
  recordedEvents: FinanceEventRow[];
  access: DearMePaidBetaStatus;
}

export interface DearMeHostedPaymentReceiptRecordOptions {
  reason?: "checkout" | "renewal";
}

export interface DearMePaidBetaCancellationInput {
  externalSubscriptionId: string;
  externalCustomerId?: string | null;
  idempotencyKey: string;
  occurredAt: string;
}

export interface DearMePaidBetaCancellationResult {
  recordedEvent: FinanceEventRow | null;
  access: DearMePaidBetaStatus;
}

export interface DearMeStripeCheckoutSessionObject {
  id: string;
  object: "checkout.session";
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  payment_intent: string | null;
  invoice: string | null;
  metadata?: Record<string, string | null | undefined>;
  created: number;
}

export interface DearMeStripeCheckoutCompletedEvent {
  id: string;
  type: "checkout.session.completed";
  livemode: boolean;
  data: {
    object: DearMeStripeCheckoutSessionObject;
  };
}

export interface DearMeStripeCheckoutReceiptProjection {
  acceptedProviderEvents: DearMeStripeCheckoutCompletedEvent[];
  rejectedProviderEvents: DearMeStripeCheckoutCompletedEvent[];
  hostedReceipts: DearMeHostedPaymentReceipt[];
}

export interface DearMeStripeWebhookSignatureVerificationInput {
  rawBody: Buffer;
  signatureHeader: string | null | undefined;
  webhookSecret: string | null | undefined;
  now?: Date;
  toleranceSeconds?: number;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function currentUtcMonthWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)),
  };
}

function describeDearMeCycleGuardrail(
  status: DearMePaidBetaStatus["status"],
  remainingCreditCents: number,
  cycleSpend: CycleSpendSummary = { spendCents: 0, budgetCents: 0, utilizationPercent: 0 },
): DearMeCycleGuardrail {
  if (status === "trial") {
    return {
      state: "trial_preview",
      label: "Trial preview",
      headline: "Private cycles wait for paid beta access",
      summary: "Preview the plan for free. DearMe records paid beta access before it spends budget on private cycles.",
      spendCents: cycleSpend.spendCents,
      budgetCents: cycleSpend.budgetCents,
      utilizationPercent: cycleSpend.utilizationPercent,
      remainingCreditCents,
      decisionRequired: true,
      decisionLabel: "Record paid beta access",
    };
  }

  if (remainingCreditCents <= 0 || (cycleSpend.budgetCents > 0 && cycleSpend.utilizationPercent >= 100)) {
    return {
      state: "hard_stop",
      label: "Review before more spend",
      headline: "Private cycles pause before more spend",
      summary: "DearMe can keep preparing low-risk drafts, but spending cycles should pause until the guardrail is reviewed.",
      spendCents: cycleSpend.spendCents,
      budgetCents: cycleSpend.budgetCents,
      utilizationPercent: cycleSpend.utilizationPercent,
      remainingCreditCents,
      decisionRequired: true,
      decisionLabel: "Review monthly spend",
    };
  }

  if (cycleSpend.budgetCents > 0 && cycleSpend.utilizationPercent >= 80) {
    return {
      state: "warning",
      label: "Close to guardrail",
      headline: "Monthly private spend is close to your guardrail",
      summary: "Your team can keep preparing work, but expensive moves should stay visible before the next private cycle runs.",
      spendCents: cycleSpend.spendCents,
      budgetCents: cycleSpend.budgetCents,
      utilizationPercent: cycleSpend.utilizationPercent,
      remainingCreditCents,
      decisionRequired: false,
      decisionLabel: null,
    };
  }

  return {
    state: "ready",
    label: "Guardrails ready",
    headline: "Private cycles can run within guardrails",
    summary: "DearMe checks monthly private spend before work runs so prepared moves stay predictable.",
    spendCents: cycleSpend.spendCents,
    budgetCents: cycleSpend.budgetCents,
    utilizationPercent: cycleSpend.utilizationPercent,
    remainingCreditCents,
    decisionRequired: false,
    decisionLabel: null,
  };
}

export function summarizeDearMePaidBetaAccess(
  companyId: string,
  events: FinanceEventRow[],
  cycleSpend?: CycleSpendSummary,
): DearMePaidBetaStatus {
  const lifetimePaidCents = events.reduce(
    (sum, event) => sum + (event.direction === "credit" ? event.amountCents : 0),
    0,
  );
  const refundedCents = events.reduce(
    (sum, event) => sum + (event.direction === "debit" ? event.amountCents : 0),
    0,
  );
  const netPaidCents = Math.max(0, lifetimePaidCents - refundedCents);
  const spendCents = cycleSpend?.spendCents ?? 0;
  const remainingCreditCents = Math.max(0, netPaidCents - spendCents);
  const latestPayment = events.find((event) => event.direction === "credit" && event.amountCents > 0);
  const status = netPaidCents > 0 ? "active" : "trial";

  return dearMePaidBetaStatusSchema.parse({
    companyId,
    status,
    lifetimePaidCents,
    refundedCents,
    netPaidCents,
    remainingCreditCents,
    eventCount: events.length,
    latestPaymentAt: latestPayment ? toIso(latestPayment.occurredAt) : null,
    latestPaymentDescription: latestPayment?.description ?? null,
    latestExternalInvoiceId: latestPayment?.externalInvoiceId ?? null,
    entitlement: describeDearMePaidBetaEntitlement(status),
    cycleGuardrail: describeDearMeCycleGuardrail(status, remainingCreditCents, cycleSpend),
  });
}

type DearMeHostedCheckoutEnvironment = Record<string, string | undefined>;

function configuredHttpsUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function describeDearMeHostedCheckoutStatus(
  companyId: string,
  env: DearMeHostedCheckoutEnvironment = process.env,
): DearMeHostedCheckoutStatus {
  const paymentLink = configuredHttpsUrl(env.DEARME_PAYMENT_LINK_URL);
  const paymentLinkConfigured = Boolean(paymentLink);
  const receiptSyncConfigured = Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
  const configured = Boolean(paymentLink && receiptSyncConfigured);
  const companyReference = companyId.trim();
  const paymentUrl = configured && companyReference && paymentLink
    ? (() => {
        const url = new URL(paymentLink.toString());
        if (!url.searchParams.has("client_reference_id")) {
          url.searchParams.set("client_reference_id", companyReference);
        }
        return url.toString();
      })()
    : null;

  if (configured && paymentUrl) {
    return {
      configured: true,
      paymentLinkConfigured,
      receiptSyncConfigured,
      paymentUrl,
      providerLabel: "Hosted checkout",
      label: "Self-serve checkout ready",
      summary: "A hosted payment link and signed receipt sync are ready for this account.",
      nextActionLabel: "Open hosted checkout",
      nextActionDescription: "Send the customer through checkout; DearMe opens paid access after the signed receipt arrives.",
    };
  }

  if (paymentLinkConfigured && !receiptSyncConfigured) {
    return {
      configured: false,
      paymentLinkConfigured,
      receiptSyncConfigured,
      paymentUrl: null,
      providerLabel: "Hosted checkout",
      label: "Receipt sync needed",
      summary: "Hosted checkout stays hidden until signed payment receipts can open access automatically.",
      nextActionLabel: "Keep manual close path",
      nextActionDescription: "Use the private-beta payment path, then record the receipt before starting brand work.",
    };
  }

  return {
    configured: false,
    paymentLinkConfigured,
    receiptSyncConfigured,
    paymentUrl: null,
    providerLabel: "Hosted checkout",
    label: "Manual private beta",
    summary: "Manual payment recording remains the active path until hosted checkout is configured.",
    nextActionLabel: "Record paid beta payment",
    nextActionDescription: "Take payment through the current private-beta channel, then record the receipt to open access.",
  };
}

function comparePaidBetaAttention(
  first: DearMePaidBetaCohortAttention,
  second: DearMePaidBetaCohortAttention,
) {
  const rank = {
    hard_stop: 0,
    trial_preview: 1,
    warning: 2,
    ready: 3,
  } satisfies Record<DearMePaidBetaStatus["cycleGuardrail"]["state"], number>;

  return rank[first.state] - rank[second.state] || first.companyId.localeCompare(second.companyId);
}

export function summarizeDearMePaidBetaCohort(
  accounts: DearMePaidBetaStatus[],
): DearMePaidBetaCohortSummary {
  const activeAccountCount = accounts.filter((account) => account.status === "active").length;
  const trialAccountCount = accounts.filter((account) => account.status === "trial").length;
  const readyAccountCount = accounts.filter((account) => account.cycleGuardrail.state === "ready").length;
  const warningAccountCount = accounts.filter((account) => account.cycleGuardrail.state === "warning").length;
  const hardStopAccountCount = accounts.filter((account) => account.cycleGuardrail.state === "hard_stop").length;
  const decisionRequiredAccountCount = accounts.filter((account) => (
    !account.entitlement.canRequestBrandOsApproval || account.cycleGuardrail.decisionRequired
  )).length;
  const attentionAccounts = accounts
    .filter((account) => (
      account.status === "trial"
      || account.cycleGuardrail.state === "warning"
      || account.cycleGuardrail.state === "hard_stop"
    ))
    .map((account) => {
      const guardrail = account.cycleGuardrail;
      const nextAction = guardrail.decisionRequired
        ? guardrail.decisionLabel ?? guardrail.summary
        : !account.entitlement.canRequestBrandOsApproval
          ? account.entitlement.nextActionLabel
          : guardrail.summary;

      return {
        companyId: account.companyId,
        state: guardrail.state,
        status: account.status,
        label: guardrail.label,
        nextAction,
      };
    })
    .sort(comparePaidBetaAttention);
  const totals = accounts.reduce(
    (sum, account) => ({
      lifetimePaidCents: sum.lifetimePaidCents + account.lifetimePaidCents,
      refundedCents: sum.refundedCents + account.refundedCents,
      netPaidCents: sum.netPaidCents + account.netPaidCents,
      remainingCreditCents: sum.remainingCreditCents + account.remainingCreditCents,
      cycleSpendCents: sum.cycleSpendCents + account.cycleGuardrail.spendCents,
      cycleBudgetCents: sum.cycleBudgetCents + account.cycleGuardrail.budgetCents,
    }),
    {
      lifetimePaidCents: 0,
      refundedCents: 0,
      netPaidCents: 0,
      remainingCreditCents: 0,
      cycleSpendCents: 0,
      cycleBudgetCents: 0,
    },
  );
  let state: DearMePaidBetaCohortSummary["state"] = "operable";
  let label = "Cohort operable";
  let summary = "Paid beta accounts can keep receiving private DearMe cycles within current guardrails.";
  let nextAction = "Keep the weekly value loop moving and review cohort health before the next paid check-in.";

  if (accounts.length === 0) {
    state = "empty";
    label = "No paid accounts yet";
    summary = "DearMe has no paid beta accounts in this cohort yet.";
    nextAction = "Sell or record the first paid beta account before treating this cohort as live operations.";
  } else if (hardStopAccountCount > 0) {
    state = "attention";
    label = "Spend review needed";
    summary = "At least one paid beta account is paused before more private-cycle spend.";
    nextAction = "Review paused accounts and refresh paid credit or monthly spend guardrails before the next cycle.";
  } else if (warningAccountCount > 0) {
    state = "watch";
    label = "Guardrail watch";
    summary = "At least one paid beta account is close to its monthly private-cycle guardrail.";
    nextAction = "Review near-guardrail accounts before scheduling expensive new private work.";
  } else if (trialAccountCount > 0) {
    state = "watch";
    label = "Activation watch";
    summary = "Some accounts are still previewing DearMe without recorded paid beta access.";
    nextAction = "Record paid access or keep those accounts in preview before running private cycles.";
  }

  return dearMePaidBetaCohortSummarySchema.parse({
    accountCount: accounts.length,
    activeAccountCount,
    trialAccountCount,
    readyAccountCount,
    warningAccountCount,
    hardStopAccountCount,
    decisionRequiredAccountCount,
    ...totals,
    state,
    label,
    summary,
    nextAction,
    attentionAccounts,
  });
}

export function describeDearMePrivateCycleBlocker(access: DearMePaidBetaStatus) {
  if (!access.entitlement.canRequestBrandOsApproval) {
    return access.entitlement.nextActionDescription;
  }
  if (access.cycleGuardrail.state === "hard_stop") {
    return access.cycleGuardrail.summary;
  }
  return null;
}

function toHostedCheckoutFinanceEvent(
  receipt: DearMeHostedPaymentReceipt,
  options: DearMeHostedPaymentReceiptRecordOptions = {},
): FinanceEventRow {
  const isRefund = receipt.kind === "checkout_refunded";
  const reason = options.reason ?? "checkout";
  const paidDescription = reason === "renewal"
    ? "DearMe hosted checkout renewal receipt"
    : "DearMe hosted checkout paid receipt";
  return {
    id: `dearme-payment-sync-${receipt.id}`,
    companyId: receipt.companyId,
    agentId: null,
    issueId: null,
    projectId: null,
    goalId: null,
    heartbeatRunId: null,
    costEventId: null,
    billingCode: "dearme_paid_beta_access",
    description: isRefund ? "DearMe hosted checkout refund receipt" : paidDescription,
    eventKind: isRefund ? "credit_refund" : "credit_purchase",
    direction: isRefund ? "debit" : "credit",
    biller: DEARME_PAID_BETA_BILLER,
    provider: receipt.provider,
    executionAdapterType: null,
    pricingTier: null,
    region: null,
    model: null,
    quantity: receipt.amountCents,
    unit: "credit_usd",
    amountCents: receipt.amountCents,
    currency: receipt.currency,
    estimated: false,
    externalInvoiceId: receipt.externalInvoiceId,
    metadataJson: {
      product: "dearme",
      source: "hosted_checkout_receipt_sync",
      access: "paid_beta",
      reason,
      receiptId: receipt.id,
      idempotencyKey: receipt.idempotencyKey,
      signatureVerified: receipt.signatureVerified,
    },
    occurredAt: new Date(receipt.occurredAt),
    createdAt: new Date(receipt.occurredAt),
  };
}

function hostedPaymentReceiptDedupKey(receipt: DearMeHostedPaymentReceipt) {
  return `${receipt.provider}:${receipt.companyId}:${receipt.idempotencyKey}:${receipt.kind}`;
}

function hostedPaymentEventDedupKey(event: FinanceEventRow) {
  const metadata = event.metadataJson;
  if (
    event.biller !== DEARME_PAID_BETA_BILLER ||
    event.provider !== "hosted_checkout" ||
    !metadata ||
    metadata.source !== "hosted_checkout_receipt_sync" ||
    typeof metadata.idempotencyKey !== "string"
  ) {
    return null;
  }

  const kind = event.direction === "debit" ? "checkout_refunded" : "checkout_paid";
  return `${event.provider}:${event.companyId}:${metadata.idempotencyKey}:${kind}`;
}

export function projectDearMeHostedPaymentReceipts(
  receipts: readonly DearMeHostedPaymentReceipt[],
  options: DearMeHostedPaymentReceiptProjectionOptions = {},
): DearMeHostedPaymentReceiptProjection {
  const seen = new Set<string>();
  const existing = new Set(
    (options.existingFinanceEvents ?? [])
      .map(hostedPaymentEventDedupKey)
      .filter((key): key is string => Boolean(key)),
  );
  const acceptedReceipts: DearMeHostedPaymentReceipt[] = [];
  const rejectedReceipts: DearMeHostedPaymentReceipt[] = [];
  let duplicateSuppressedCount = 0;
  let existingDuplicateSuppressedCount = 0;

  for (const receipt of receipts) {
    const acceptableKind = receipt.kind === "checkout_paid" || receipt.kind === "checkout_refunded";
    const idempotencyKey = hostedPaymentReceiptDedupKey(receipt);
    if (!receipt.signatureVerified || !acceptableKind || receipt.amountCents <= 0) {
      rejectedReceipts.push(receipt);
      continue;
    }
    if (existing.has(idempotencyKey)) {
      existingDuplicateSuppressedCount += 1;
      continue;
    }
    if (seen.has(idempotencyKey)) {
      duplicateSuppressedCount += 1;
      continue;
    }
    seen.add(idempotencyKey);
    acceptedReceipts.push(receipt);
  }

  return {
    acceptedReceipts,
    rejectedReceipts,
    duplicateSuppressedCount,
    existingDuplicateSuppressedCount,
    financeEvents: acceptedReceipts.map((receipt) => toHostedCheckoutFinanceEvent(receipt, options)),
  };
}

function companyIdFromStripeCheckoutSession(session: DearMeStripeCheckoutSessionObject) {
  return session.client_reference_id?.trim() || session.metadata?.dearmeCompanyId?.trim() || "";
}

export function dearMeHostedPaymentReceiptFromStripeCheckoutCompletedEvent(
  event: DearMeStripeCheckoutCompletedEvent,
  options: { signatureVerified?: boolean } = {},
): DearMeHostedPaymentReceipt | null {
  const session = event.data.object;
  const companyId = companyIdFromStripeCheckoutSession(session);
  const amountCents = session.amount_total ?? 0;
  const currency = session.currency?.toUpperCase() ?? "USD";

  if (
    event.type !== "checkout.session.completed" ||
    session.status !== "complete" ||
    session.payment_status !== "paid" ||
    !companyId ||
    amountCents <= 0
  ) {
    return null;
  }

  return {
    id: event.id,
    companyId,
    provider: "hosted_checkout",
    kind: "checkout_paid",
    amountCents,
    currency,
    externalInvoiceId: session.invoice ?? session.payment_intent ?? session.id,
    signatureVerified: options.signatureVerified ?? true,
    idempotencyKey: session.id,
    occurredAt: new Date(session.created * 1000).toISOString(),
  };
}

export function projectDearMeStripeCheckoutCompletedEvents(
  events: readonly DearMeStripeCheckoutCompletedEvent[],
  options: { signatureVerified?: boolean } = {},
): DearMeStripeCheckoutReceiptProjection {
  const acceptedProviderEvents: DearMeStripeCheckoutCompletedEvent[] = [];
  const rejectedProviderEvents: DearMeStripeCheckoutCompletedEvent[] = [];
  const hostedReceipts: DearMeHostedPaymentReceipt[] = [];

  for (const event of events) {
    const receipt = dearMeHostedPaymentReceiptFromStripeCheckoutCompletedEvent(event, options);
    if (receipt) {
      acceptedProviderEvents.push(event);
      hostedReceipts.push(receipt);
    } else {
      rejectedProviderEvents.push(event);
    }
  }

  return {
    acceptedProviderEvents,
    rejectedProviderEvents,
    hostedReceipts,
  };
}

function parseStripeSignatureHeader(signatureHeader: string) {
  const parts = signatureHeader.split(",").map((part) => part.trim()).filter(Boolean);
  const timestamp = parts
    .map((part) => part.match(/^t=(\d+)$/)?.[1] ?? null)
    .find((value): value is string => Boolean(value));
  const signatures = parts
    .map((part) => part.match(/^v1=([0-9a-fA-F]+)$/)?.[1] ?? null)
    .filter((value): value is string => Boolean(value));

  return {
    timestamp,
    signatures,
  };
}

export function verifyDearMeStripeWebhookSignature(
  input: DearMeStripeWebhookSignatureVerificationInput,
) {
  const signatureHeader = input.signatureHeader?.trim();
  const webhookSecret = input.webhookSecret?.trim();
  if (!signatureHeader || !webhookSecret) return false;

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  const timestampSeconds = timestamp ? Number.parseInt(timestamp, 10) : Number.NaN;
  if (!Number.isFinite(timestampSeconds) || signatures.length === 0) return false;

  const toleranceSeconds = input.toleranceSeconds ?? 300;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.`)
    .update(input.rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature);
    return signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

export function dearmePaidBetaAccessService(db: Db) {
  const finance = financeService(db);
  const costs = costService(db);

  async function getAccess(companyId: string) {
    const [events, cycleSpend] = await Promise.all([
      getPaidBetaEvents(companyId),
      costs.summary(companyId, currentUtcMonthWindow()),
    ]);

    const access = summarizeDearMePaidBetaAccess(companyId, events, cycleSpend);
    return dearMePaidBetaStatusSchema.parse({
      ...access,
      hostedCheckout: describeDearMeHostedCheckoutStatus(companyId),
    });
  }

  async function getPaidBetaEvents(companyId: string) {
    return db
      .select()
      .from(financeEvents)
      .where(and(
        eq(financeEvents.companyId, companyId),
        eq(financeEvents.biller, DEARME_PAID_BETA_BILLER),
      ))
      .orderBy(desc(financeEvents.occurredAt), desc(financeEvents.createdAt));
  }

  async function recordHostedPaymentReceipts(
    companyId: string,
    receipts: readonly DearMeHostedPaymentReceipt[],
    options: DearMeHostedPaymentReceiptRecordOptions = {},
  ): Promise<DearMeHostedPaymentReceiptRecordResult> {
    const companyReceipts = receipts.filter((receipt) => receipt.companyId === companyId);
    const rejectedCompanyMismatchReceipts = receipts.filter((receipt) => receipt.companyId !== companyId);
    const existingEvents = await getPaidBetaEvents(companyId);
    const projection = projectDearMeHostedPaymentReceipts(companyReceipts, {
      existingFinanceEvents: existingEvents,
      reason: options.reason,
    });
    const recordedEvents: FinanceEventRow[] = [];

    for (const event of projection.financeEvents) {
      const {
        id: _id,
        companyId: _companyId,
        createdAt: _createdAt,
        ...insertableEvent
      } = event;
      recordedEvents.push(await finance.createEvent(companyId, insertableEvent));
    }

    return {
      acceptedReceipts: projection.acceptedReceipts,
      rejectedReceipts: [
        ...projection.rejectedReceipts,
        ...rejectedCompanyMismatchReceipts,
      ],
      duplicateSuppressedCount: projection.duplicateSuppressedCount,
      existingDuplicateSuppressedCount: projection.existingDuplicateSuppressedCount,
      recordedEvents,
      access: await getAccess(companyId),
    };
  }

  async function recordSubscriptionCancellation(
    companyId: string,
    input: DearMePaidBetaCancellationInput,
  ): Promise<DearMePaidBetaCancellationResult> {
    const idempotencyKey = input.idempotencyKey.trim();
    const externalSubscriptionId = input.externalSubscriptionId.trim();
    if (!idempotencyKey || !externalSubscriptionId) {
      return {
        recordedEvent: null,
        access: await getAccess(companyId),
      };
    }

    const existingEvents = await getPaidBetaEvents(companyId);
    const existingCancellation = existingEvents.find((event) => (
      event.provider === "hosted_checkout" &&
      event.metadataJson?.source === "stripe_subscription_cancellation" &&
      event.metadataJson.idempotencyKey === idempotencyKey
    ));
    if (existingCancellation) {
      return {
        recordedEvent: null,
        access: await getAccess(companyId),
      };
    }

    const currentAccess = summarizeDearMePaidBetaAccess(companyId, existingEvents);
    const amountCents = currentAccess.netPaidCents;
    const recordedEvent = await finance.createEvent(companyId, {
      billingCode: "dearme_paid_beta_access",
      description: "DearMe Stripe subscription cancelled",
      eventKind: "credit_cancelled",
      direction: "debit",
      biller: DEARME_PAID_BETA_BILLER,
      provider: "hosted_checkout",
      amountCents,
      currency: "USD",
      estimated: false,
      externalInvoiceId: externalSubscriptionId,
      metadataJson: {
        product: "dearme",
        source: "stripe_subscription_cancellation",
        access: "paid_beta",
        externalSubscriptionId,
        externalCustomerId: input.externalCustomerId ?? null,
        idempotencyKey,
      },
      occurredAt: new Date(input.occurredAt),
      quantity: amountCents,
      unit: "credit_usd",
    });

    return {
      recordedEvent,
      access: await getAccess(companyId),
    };
  }

  async function getCohort(companyIds: string[]) {
    const uniqueCompanyIds = Array.from(new Set(companyIds.map((companyId) => companyId.trim()).filter(Boolean)));
    const accounts = await Promise.all(uniqueCompanyIds.map((companyId) => getAccess(companyId)));

    return summarizeDearMePaidBetaCohort(accounts);
  }

  return {
    getAccess,
    getCohort,
    recordHostedPaymentReceipts,
    recordSubscriptionCancellation,

    recordPayment: async (companyId: string, record: DearMePaidBetaRecord) => {
      const event = await finance.createEvent(companyId, {
        billingCode: "dearme_paid_beta_access",
        description: record.description ?? "DearMe paid beta access",
        eventKind: "credit_purchase",
        direction: "credit",
        biller: DEARME_PAID_BETA_BILLER,
        provider: null,
        amountCents: record.amountCents,
        currency: record.currency,
        estimated: false,
        externalInvoiceId: record.externalInvoiceId,
        metadataJson: {
          product: "dearme",
          source: "manual_paid_beta_access",
          access: "paid_beta",
        },
        occurredAt: record.occurredAt ? new Date(record.occurredAt) : new Date(),
        quantity: record.amountCents,
        unit: "credit_usd",
      });

      return {
        event,
        access: await getAccess(companyId),
      };
    },
  };
}
