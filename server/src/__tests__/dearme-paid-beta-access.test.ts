import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { describeDearMePaidBetaEntitlement } from "@paperclipai/shared";
import {
  describeDearMeHostedCheckoutStatus,
  dearMeHostedPaymentReceiptFromStripeCheckoutCompletedEvent,
  describeDearMePrivateCycleBlocker,
  projectDearMeHostedPaymentReceipts,
  projectDearMeStripeCheckoutCompletedEvents,
  summarizeDearMePaidBetaAccess,
  summarizeDearMePaidBetaCohort,
  verifyDearMeStripeWebhookSignature,
  type DearMeStripeCheckoutCompletedEvent,
  type DearMeStripeCheckoutSessionObject,
  type DearMeHostedPaymentReceipt,
} from "../services/dearme-paid-beta-access.js";

type DearMeFinanceEvent = Parameters<typeof summarizeDearMePaidBetaAccess>[1][number];

function financeEvent(overrides: Partial<DearMeFinanceEvent>): DearMeFinanceEvent {
  return {
    id: "event-1",
    companyId: "company-1",
    agentId: null,
    issueId: null,
    projectId: null,
    goalId: null,
    heartbeatRunId: null,
    costEventId: null,
    billingCode: "dearme_paid_beta_access",
    description: null,
    eventKind: "credit_purchase",
    direction: "credit",
    biller: "dearme_paid_beta",
    provider: null,
    executionAdapterType: null,
    pricingTier: null,
    region: null,
    model: null,
    quantity: null,
    unit: "credit_usd",
    amountCents: 0,
    currency: "USD",
    estimated: false,
    externalInvoiceId: null,
    metadataJson: null,
    occurredAt: new Date("2026-05-07T14:00:00.000Z"),
    createdAt: new Date("2026-05-07T14:00:00.000Z"),
    ...overrides,
  };
}

function hostedReceipt(
  overrides: Omit<Partial<DearMeHostedPaymentReceipt>, "provider" | "currency" | "occurredAt"> & {
    id: string;
    companyId: string;
    kind: DearMeHostedPaymentReceipt["kind"];
    idempotencyKey: string;
    currency?: string;
    occurredAt?: string;
  },
): DearMeHostedPaymentReceipt {
  return {
    provider: "hosted_checkout",
    amountCents: 25_000,
    currency: overrides.currency ?? "USD",
    externalInvoiceId: `invoice-${overrides.id}`,
    signatureVerified: true,
    occurredAt: overrides.occurredAt ?? "2026-05-14T12:00:00.000Z",
    ...overrides,
  };
}

function stripeCheckoutCompleted(
  overrides: Partial<DearMeStripeCheckoutSessionObject> & {
    eventId: string;
    sessionId: string;
  },
): DearMeStripeCheckoutCompletedEvent {
  return {
    id: overrides.eventId,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: overrides.sessionId,
        object: "checkout.session",
        status: overrides.status ?? "complete",
        payment_status: overrides.payment_status ?? "paid",
        amount_total: overrides.amount_total ?? 25_000,
        currency: overrides.currency ?? "usd",
        client_reference_id: overrides.client_reference_id === undefined
          ? "company-stripe"
          : overrides.client_reference_id,
        payment_intent: overrides.payment_intent ?? `${overrides.sessionId}-pi`,
        invoice: overrides.invoice ?? `${overrides.sessionId}-invoice`,
        metadata: overrides.metadata,
        created: overrides.created ?? 1_768_389_600,
      },
    },
  };
}

function stripeSignatureHeader(rawBody: Buffer, secret: string, timestamp = 1_768_389_600) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("DearMe paid beta access service", () => {
  it("derives trial status when no paid beta ledger events exist", () => {
    expect(summarizeDearMePaidBetaAccess("company-1", [])).toEqual({
      companyId: "company-1",
      status: "trial",
      lifetimePaidCents: 0,
      refundedCents: 0,
      netPaidCents: 0,
      remainingCreditCents: 0,
      eventCount: 0,
      latestPaymentAt: null,
      latestPaymentDescription: null,
      latestExternalInvoiceId: null,
      entitlement: describeDearMePaidBetaEntitlement("trial"),
      cycleGuardrail: {
        state: "trial_preview",
        label: "Trial preview",
        headline: "Private cycles wait for paid beta access",
        summary: "Preview the plan for free. DearMe records paid beta access before it spends budget on private cycles.",
        spendCents: 0,
        budgetCents: 0,
        utilizationPercent: 0,
        remainingCreditCents: 0,
        decisionRequired: true,
        decisionLabel: "Record paid beta access",
      },
    });
  });

  it("derives active status and remaining credit from paid beta ledger events", () => {
    const status = summarizeDearMePaidBetaAccess("company-1", [
      financeEvent({
        direction: "credit",
        amountCents: 25_000,
        description: "Founding beta payment",
        externalInvoiceId: "manual-invoice-1",
        occurredAt: new Date("2026-05-07T14:00:00.000Z"),
      }),
      financeEvent({
        id: "event-2",
        eventKind: "credit_refund",
        direction: "debit",
        amountCents: 5_000,
        description: "Refund",
        externalInvoiceId: null,
        occurredAt: new Date("2026-05-08T14:00:00.000Z"),
      }),
    ]);

    expect(status).toEqual({
      companyId: "company-1",
      status: "active",
      lifetimePaidCents: 25_000,
      refundedCents: 5_000,
      netPaidCents: 20_000,
      remainingCreditCents: 20_000,
      eventCount: 2,
      latestPaymentAt: "2026-05-07T14:00:00.000Z",
      latestPaymentDescription: "Founding beta payment",
      latestExternalInvoiceId: "manual-invoice-1",
      entitlement: describeDearMePaidBetaEntitlement("active"),
      cycleGuardrail: {
        state: "ready",
        label: "Guardrails ready",
        headline: "Private cycles can run within guardrails",
        summary: "DearMe checks monthly private spend before work runs so prepared moves stay predictable.",
        spendCents: 0,
        budgetCents: 0,
        utilizationPercent: 0,
        remainingCreditCents: 20_000,
        decisionRequired: false,
        decisionLabel: null,
      },
    });
  });

  it("subtracts monthly private spend from paid credit and warns near the monthly guardrail", () => {
    const status = summarizeDearMePaidBetaAccess(
      "company-1",
      [
        financeEvent({
          direction: "credit",
          amountCents: 25_000,
          description: "Founding beta payment",
        }),
      ],
      {
        spendCents: 20_000,
        budgetCents: 25_000,
        utilizationPercent: 80,
      },
    );

    expect(status.remainingCreditCents).toBe(5_000);
    expect(status.cycleGuardrail).toMatchObject({
      state: "warning",
      label: "Close to guardrail",
      spendCents: 20_000,
      budgetCents: 25_000,
      utilizationPercent: 80,
      remainingCreditCents: 5_000,
      decisionRequired: false,
    });
  });

  it("hard-stops paid beta work when monthly private spend exhausts available credit", () => {
    const status = summarizeDearMePaidBetaAccess(
      "company-1",
      [
        financeEvent({
          direction: "credit",
          amountCents: 25_000,
          description: "Founding beta payment",
        }),
      ],
      {
        spendCents: 25_000,
        budgetCents: 25_000,
        utilizationPercent: 100,
      },
    );

    expect(status.remainingCreditCents).toBe(0);
    expect(status.cycleGuardrail).toMatchObject({
      state: "hard_stop",
      label: "Review before more spend",
      decisionRequired: true,
      decisionLabel: "Review monthly spend",
    });
  });

  it("blocks private cycles during trial preview", () => {
    const status = summarizeDearMePaidBetaAccess("company-1", []);

    expect(describeDearMePrivateCycleBlocker(status)).toBe(
      status.entitlement.nextActionDescription,
    );
  });

  it("exposes hosted checkout only when link and signed receipt sync are ready", () => {
    const ready = describeDearMeHostedCheckoutStatus("company-1", {
      DEARME_PAYMENT_LINK_URL: "https://pay.example.com/dearme",
      STRIPE_WEBHOOK_SECRET: "whsec_hidden",
      DEARME_PAYMENT_PROVIDER: "stripe",
    });

    expect(ready).toMatchObject({
      configured: true,
      paymentLinkConfigured: true,
      receiptSyncConfigured: true,
      providerLabel: "Hosted checkout",
      label: "Self-serve checkout ready",
    });
    expect(ready.paymentUrl).toBe("https://pay.example.com/dearme?client_reference_id=company-1");
    expect(JSON.stringify(ready)).not.toContain("whsec_hidden");
    expect(JSON.stringify(ready)).not.toContain("stripe");

    const missingReceiptSync = describeDearMeHostedCheckoutStatus("company-1", {
      DEARME_PAYMENT_LINK_URL: "https://pay.example.com/dearme",
    });

    expect(missingReceiptSync).toMatchObject({
      configured: false,
      paymentLinkConfigured: true,
      receiptSyncConfigured: false,
      paymentUrl: null,
      label: "Receipt sync needed",
    });
  });

  it("keeps hosted checkout hidden for invalid or non-https payment links", () => {
    expect(describeDearMeHostedCheckoutStatus("company-1", {
      DEARME_PAYMENT_LINK_URL: "http://pay.example.com/dearme",
      STRIPE_WEBHOOK_SECRET: "whsec_hidden",
    })).toMatchObject({
      configured: false,
      paymentLinkConfigured: false,
      receiptSyncConfigured: true,
      paymentUrl: null,
      label: "Manual private beta",
    });
  });

  it("blocks private cycles at the monthly hard-stop", () => {
    const status = summarizeDearMePaidBetaAccess(
      "company-1",
      [
        financeEvent({
          direction: "credit",
          amountCents: 25_000,
          description: "Founding beta payment",
        }),
      ],
      {
        spendCents: 25_000,
        budgetCents: 25_000,
        utilizationPercent: 100,
      },
    );

    expect(describeDearMePrivateCycleBlocker(status)).toBe(status.cycleGuardrail.summary);
  });

  it("allows private cycles when paid beta access is active and below guardrail", () => {
    const status = summarizeDearMePaidBetaAccess(
      "company-1",
      [
        financeEvent({
          direction: "credit",
          amountCents: 25_000,
          description: "Founding beta payment",
        }),
      ],
      {
        spendCents: 5_000,
        budgetCents: 25_000,
        utilizationPercent: 20,
      },
    );

    expect(describeDearMePrivateCycleBlocker(status)).toBeNull();
  });

  it("projects verified hosted checkout receipts into paid beta finance events", () => {
    const projection = projectDearMeHostedPaymentReceipts([
      hostedReceipt({
        id: "evt-paid",
        companyId: "company-checkout",
        kind: "checkout_paid",
        idempotencyKey: "checkout-session-paid",
        externalInvoiceId: "hosted-invoice-paid",
      }),
    ]);
    const access = summarizeDearMePaidBetaAccess("company-checkout", projection.financeEvents);

    expect(projection.acceptedReceipts).toHaveLength(1);
    expect(projection.financeEvents[0]).toMatchObject({
      billingCode: "dearme_paid_beta_access",
      biller: "dearme_paid_beta",
      provider: "hosted_checkout",
      direction: "credit",
      eventKind: "credit_purchase",
      amountCents: 25_000,
      externalInvoiceId: "hosted-invoice-paid",
      metadataJson: {
        product: "dearme",
        source: "hosted_checkout_receipt_sync",
        access: "paid_beta",
        receiptId: "evt-paid",
        idempotencyKey: "checkout-session-paid",
        signatureVerified: true,
      },
    });
    expect(access.status).toBe("active");
    expect(access.latestExternalInvoiceId).toBe("hosted-invoice-paid");
  });

  it("rejects unverified, unpaid, and zero-value hosted checkout receipts", () => {
    const projection = projectDearMeHostedPaymentReceipts([
      hostedReceipt({
        id: "evt-unverified",
        companyId: "company-protected",
        kind: "checkout_paid",
        idempotencyKey: "checkout-session-unverified",
        signatureVerified: false,
      }),
      hostedReceipt({
        id: "evt-unpaid",
        companyId: "company-protected",
        kind: "checkout_unpaid",
        idempotencyKey: "checkout-session-unpaid",
      }),
      hostedReceipt({
        id: "evt-zero",
        companyId: "company-protected",
        kind: "checkout_paid",
        idempotencyKey: "checkout-session-zero",
        amountCents: 0,
      }),
    ]);
    const access = summarizeDearMePaidBetaAccess("company-protected", projection.financeEvents);

    expect(projection.acceptedReceipts).toHaveLength(0);
    expect(projection.rejectedReceipts.map((receipt) => receipt.id)).toEqual([
      "evt-unverified",
      "evt-unpaid",
      "evt-zero",
    ]);
    expect(access.status).toBe("trial");
  });

  it("suppresses duplicate hosted checkout receipts and projects refunds as paid credit debits", () => {
    const projection = projectDearMeHostedPaymentReceipts([
      hostedReceipt({
        id: "evt-paid",
        companyId: "company-refunded",
        kind: "checkout_paid",
        idempotencyKey: "checkout-session-paid",
      }),
      hostedReceipt({
        id: "evt-paid-duplicate",
        companyId: "company-refunded",
        kind: "checkout_paid",
        idempotencyKey: "checkout-session-paid",
      }),
      hostedReceipt({
        id: "evt-refund",
        companyId: "company-refunded",
        kind: "checkout_refunded",
        idempotencyKey: "checkout-session-refund",
        amountCents: 10_000,
        externalInvoiceId: "hosted-refund",
      }),
    ]);
    const access = summarizeDearMePaidBetaAccess("company-refunded", projection.financeEvents);

    expect(projection.duplicateSuppressedCount).toBe(1);
    expect(projection.financeEvents).toHaveLength(2);
    expect(projection.financeEvents[1]).toMatchObject({
      direction: "debit",
      eventKind: "credit_refund",
      amountCents: 10_000,
      externalInvoiceId: "hosted-refund",
    });
    expect(access.status).toBe("active");
    expect(access.netPaidCents).toBe(15_000);
    expect(access.remainingCreditCents).toBe(15_000);
  });

  it("suppresses hosted checkout receipts that already exist in the paid beta ledger", () => {
    const existingEvent = financeEvent({
      id: "existing-hosted-payment",
      companyId: "company-replayed",
      provider: "hosted_checkout",
      direction: "credit",
      amountCents: 25_000,
      metadataJson: {
        product: "dearme",
        source: "hosted_checkout_receipt_sync",
        access: "paid_beta",
        receiptId: "evt-original",
        idempotencyKey: "checkout-session-replayed",
        signatureVerified: true,
      },
    });
    const projection = projectDearMeHostedPaymentReceipts(
      [
        hostedReceipt({
          id: "evt-replayed",
          companyId: "company-replayed",
          kind: "checkout_paid",
          idempotencyKey: "checkout-session-replayed",
        }),
        hostedReceipt({
          id: "evt-new",
          companyId: "company-replayed",
          kind: "checkout_paid",
          idempotencyKey: "checkout-session-new",
        }),
      ],
      { existingFinanceEvents: [existingEvent] },
    );

    expect(projection.existingDuplicateSuppressedCount).toBe(1);
    expect(projection.duplicateSuppressedCount).toBe(0);
    expect(projection.acceptedReceipts.map((receipt) => receipt.id)).toEqual(["evt-new"]);
    expect(projection.financeEvents).toHaveLength(1);
  });

  it("maps Stripe checkout completed events into hosted payment receipts", () => {
    const receipt = dearMeHostedPaymentReceiptFromStripeCheckoutCompletedEvent(
      stripeCheckoutCompleted({
        eventId: "evt-stripe-paid",
        sessionId: "cs_dearme_paid",
        client_reference_id: "company-stripe",
        invoice: "in_dearme_paid",
      }),
    );

    expect(receipt).toEqual({
      id: "evt-stripe-paid",
      companyId: "company-stripe",
      provider: "hosted_checkout",
      kind: "checkout_paid",
      amountCents: 25_000,
      currency: "USD",
      externalInvoiceId: "in_dearme_paid",
      signatureVerified: true,
      idempotencyKey: "cs_dearme_paid",
      occurredAt: "2026-01-14T11:20:00.000Z",
    });
  });

  it("maps Stripe checkout metadata account references and rejects unpaid or unmapped sessions", () => {
    const projection = projectDearMeStripeCheckoutCompletedEvents([
      stripeCheckoutCompleted({
        eventId: "evt-stripe-metadata",
        sessionId: "cs_dearme_metadata",
        client_reference_id: null,
        metadata: { dearmeCompanyId: "company-from-metadata" },
      }),
      stripeCheckoutCompleted({
        eventId: "evt-stripe-unpaid",
        sessionId: "cs_dearme_unpaid",
        payment_status: "unpaid",
      }),
      stripeCheckoutCompleted({
        eventId: "evt-stripe-missing-reference",
        sessionId: "cs_dearme_missing_reference",
        client_reference_id: null,
        metadata: {},
      }),
    ]);

    expect(projection.acceptedProviderEvents.map((event) => event.id)).toEqual(["evt-stripe-metadata"]);
    expect(projection.rejectedProviderEvents.map((event) => event.id)).toEqual([
      "evt-stripe-unpaid",
      "evt-stripe-missing-reference",
    ]);
    expect(projection.hostedReceipts).toMatchObject([
      {
        id: "evt-stripe-metadata",
        companyId: "company-from-metadata",
        idempotencyKey: "cs_dearme_metadata",
      },
    ]);
  });

  it("verifies Stripe webhook signatures against the raw request body", () => {
    const rawBody = Buffer.from(JSON.stringify(stripeCheckoutCompleted({
      eventId: "evt-stripe-paid",
      sessionId: "cs_dearme_paid",
    })));
    const webhookSecret = "whsec_dearme_test_secret";
    const now = new Date(1_768_389_600 * 1000);

    expect(verifyDearMeStripeWebhookSignature({
      rawBody,
      signatureHeader: stripeSignatureHeader(rawBody, webhookSecret),
      webhookSecret,
      now,
    })).toBe(true);
    expect(verifyDearMeStripeWebhookSignature({
      rawBody: Buffer.from(rawBody.toString("utf-8").replace("paid", "unpaid")),
      signatureHeader: stripeSignatureHeader(rawBody, webhookSecret),
      webhookSecret,
      now,
    })).toBe(false);
    expect(verifyDearMeStripeWebhookSignature({
      rawBody,
      signatureHeader: stripeSignatureHeader(rawBody, webhookSecret, 1_768_388_000),
      webhookSecret,
      now,
    })).toBe(false);
  });

  it("summarizes an empty paid beta cohort as not yet operational", () => {
    expect(summarizeDearMePaidBetaCohort([])).toEqual({
      accountCount: 0,
      activeAccountCount: 0,
      trialAccountCount: 0,
      readyAccountCount: 0,
      warningAccountCount: 0,
      hardStopAccountCount: 0,
      decisionRequiredAccountCount: 0,
      lifetimePaidCents: 0,
      refundedCents: 0,
      netPaidCents: 0,
      remainingCreditCents: 0,
      cycleSpendCents: 0,
      cycleBudgetCents: 0,
      state: "empty",
      label: "No paid accounts yet",
      summary: "DearMe has no paid beta accounts in this cohort yet.",
      nextAction: "Sell or record the first paid beta account before treating this cohort as live operations.",
      attentionAccounts: [],
    });
  });

  it("summarizes a healthy paid beta cohort as operable", () => {
    const cohort = summarizeDearMePaidBetaCohort([
      summarizeDearMePaidBetaAccess(
        "company-a",
        [
          financeEvent({
            companyId: "company-a",
            amountCents: 25_000,
          }),
        ],
        {
          spendCents: 5_000,
          budgetCents: 25_000,
          utilizationPercent: 20,
        },
      ),
      summarizeDearMePaidBetaAccess(
        "company-b",
        [
          financeEvent({
            companyId: "company-b",
            amountCents: 50_000,
          }),
        ],
        {
          spendCents: 10_000,
          budgetCents: 50_000,
          utilizationPercent: 20,
        },
      ),
    ]);

    expect(cohort).toMatchObject({
      accountCount: 2,
      activeAccountCount: 2,
      trialAccountCount: 0,
      readyAccountCount: 2,
      warningAccountCount: 0,
      hardStopAccountCount: 0,
      decisionRequiredAccountCount: 0,
      lifetimePaidCents: 75_000,
      netPaidCents: 75_000,
      remainingCreditCents: 60_000,
      cycleSpendCents: 15_000,
      cycleBudgetCents: 75_000,
      state: "operable",
      label: "Cohort operable",
      attentionAccounts: [],
    });
  });

  it("prioritizes paid beta cohort accounts that need operator attention", () => {
    const cohort = summarizeDearMePaidBetaCohort([
      summarizeDearMePaidBetaAccess("company-trial", []),
      summarizeDearMePaidBetaAccess(
        "company-warning",
        [
          financeEvent({
            companyId: "company-warning",
            amountCents: 50_000,
          }),
        ],
        {
          spendCents: 40_000,
          budgetCents: 50_000,
          utilizationPercent: 80,
        },
      ),
      summarizeDearMePaidBetaAccess(
        "company-hard-stop",
        [
          financeEvent({
            companyId: "company-hard-stop",
            amountCents: 25_000,
          }),
        ],
        {
          spendCents: 25_000,
          budgetCents: 25_000,
          utilizationPercent: 100,
        },
      ),
    ]);

    expect(cohort).toMatchObject({
      accountCount: 3,
      activeAccountCount: 2,
      trialAccountCount: 1,
      readyAccountCount: 0,
      warningAccountCount: 1,
      hardStopAccountCount: 1,
      decisionRequiredAccountCount: 2,
      lifetimePaidCents: 75_000,
      netPaidCents: 75_000,
      remainingCreditCents: 10_000,
      cycleSpendCents: 65_000,
      cycleBudgetCents: 75_000,
      state: "attention",
      label: "Spend review needed",
      nextAction: "Review paused accounts and refresh paid credit or monthly spend guardrails before the next cycle.",
    });
    expect(cohort.attentionAccounts).toEqual([
      {
        companyId: "company-hard-stop",
        state: "hard_stop",
        status: "active",
        label: "Review before more spend",
        nextAction: "Review monthly spend",
      },
      {
        companyId: "company-trial",
        state: "trial_preview",
        status: "trial",
        label: "Trial preview",
        nextAction: "Record paid beta access",
      },
      {
        companyId: "company-warning",
        state: "warning",
        status: "active",
        label: "Close to guardrail",
        nextAction: "Your team can keep preparing work, but expensive moves should stay visible before the next private cycle runs.",
      },
    ]);
  });
});
