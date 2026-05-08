import { describe, expect, it } from "vitest";
import { describeDearMePaidBetaEntitlement } from "@paperclipai/shared";
import { summarizeDearMePaidBetaAccess } from "../services/dearme-paid-beta-access.js";

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
    });
  });
});
