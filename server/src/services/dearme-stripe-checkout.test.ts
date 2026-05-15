import { describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import {
  DearMeStripeCheckoutError,
  dearMeStripeCheckoutService,
  type DearMeStripeClient,
} from "./dearme-stripe-checkout.js";

function checkoutCompletedEvent(sessionId = "cs_dearme_paid") {
  return {
    id: "evt_dearme_checkout_completed",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        amount_total: 25000,
        currency: "usd",
        client_reference_id: "company-1",
        payment_intent: "pi_dearme_paid",
        invoice: null,
        metadata: {
          dearmeCompanyId: "company-1",
        },
        created: 1_768_389_600,
      },
    },
  };
}

function fakeAccessGranter(): any {
  return {
    recordHostedPaymentReceipts: vi.fn(async () => ({
      acceptedReceipts: [],
      rejectedReceipts: [],
      duplicateSuppressedCount: 0,
      existingDuplicateSuppressedCount: 0,
      recordedEvents: [{ id: "finance-event-1" }],
      access: {
        companyId: "company-1",
        status: "active",
        lifetimePaidCents: 25000,
        refundedCents: 0,
        netPaidCents: 25000,
        remainingCreditCents: 25000,
        eventCount: 1,
        latestPaymentAt: "2026-01-01T00:00:00.000Z",
        latestPaymentDescription: "DearMe hosted checkout paid receipt",
        latestExternalInvoiceId: "pi_dearme_paid",
        entitlement: {
          state: "paid_beta_active",
          label: "Paid beta active",
          headline: "Paid beta access is active",
          summary: "Paid beta access is active.",
          canRequestBrandOsApproval: true,
          canRunPrivateCycles: true,
          nextActionLabel: "Keep going",
          nextActionDescription: "Keep going.",
        },
        cycleGuardrail: {
          state: "ready",
          label: "Guardrails ready",
          headline: "Private cycles can run within guardrails",
          summary: "Ready.",
          spendCents: 0,
          budgetCents: 0,
          utilizationPercent: 0,
          remainingCreditCents: 25000,
          decisionRequired: false,
          decisionLabel: null,
        },
      },
    })),
  };
}

function fakeStripeClient(event: unknown = checkoutCompletedEvent()): DearMeStripeClient {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          id: "cs_dearme_checkout",
          url: "https://checkout.stripe.com/c/pay/cs_dearme_checkout",
        })),
      },
    },
    webhooks: {
      constructEvent: vi.fn(() => event),
    },
  };
}

describe("dearMeStripeCheckoutService", () => {
  it("creates Stripe Checkout sessions with DearMe paid beta args", async () => {
    const stripeClient = fakeStripeClient();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient,
      paidBetaAccess: fakeAccessGranter(),
      resolveCompanyIdForEmail: async () => "company-1",
    });

    await expect(service.createCheckoutSession({
      email: "Buyer@Example.com",
      priceId: "price_dearme_beta",
      successUrl: "https://app.example.com/dearme/checkout/success",
      cancelUrl: "https://app.example.com/dearme/checkout/cancel",
    })).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_dearme_checkout",
      checkoutSessionId: "cs_dearme_checkout",
      companyId: "company-1",
    });

    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "payment",
      customer_email: "buyer@example.com",
      client_reference_id: "company-1",
      line_items: [{ price: "price_dearme_beta", quantity: 1 }],
      success_url: "https://app.example.com/dearme/checkout/success",
      cancel_url: "https://app.example.com/dearme/checkout/cancel",
      metadata: {
        product: "dearme",
        access: "paid_beta",
        dearmeCompanyId: "company-1",
        customerEmail: "buyer@example.com",
      },
    });
  });

  it("returns 400 on a bad webhook signature", async () => {
    const stripeClient = fakeStripeClient();
    vi.mocked(stripeClient.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("bad signature");
    });
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient,
      paidBetaAccess: fakeAccessGranter(),
    });

    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from("{}"),
      signatureHeader: "t=1,v1=bad",
      webhookSecret: "whsec_test",
    })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("records paid-beta access once for a valid checkout.session.completed webhook", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(),
      paidBetaAccess,
    });

    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from(JSON.stringify(checkoutCompletedEvent())),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    })).resolves.toMatchObject({
      received: true,
      status: "recorded",
      provider: "stripe",
      companyId: "company-1",
      checkoutSessionId: "cs_dearme_paid",
      recordedEventCount: 1,
    });

    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(1);
    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledWith(
      "company-1",
      [expect.objectContaining({
        companyId: "company-1",
        idempotencyKey: "cs_dearme_paid",
        kind: "checkout_paid",
      })],
    );
  });

  it("does not double-grant the same Stripe session id", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(checkoutCompletedEvent("cs_dearme_repeat")),
      paidBetaAccess,
    });
    const input = {
      rawBody: Buffer.from(JSON.stringify(checkoutCompletedEvent("cs_dearme_repeat"))),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    };

    await service.handleCheckoutWebhook(input);
    await expect(service.handleCheckoutWebhook(input)).resolves.toMatchObject({
      status: "duplicate",
      checkoutSessionId: "cs_dearme_repeat",
      recordedEventCount: 0,
    });

    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when required checkout env is missing", async () => {
    const originalSecretKey = process.env.DEARME_STRIPE_SECRET_KEY;
    delete process.env.DEARME_STRIPE_SECRET_KEY;
    const service = dearMeStripeCheckoutService({} as Db, {
      paidBetaAccess: fakeAccessGranter(),
      resolveCompanyIdForEmail: async () => "company-1",
    });

    try {
      await expect(service.createCheckoutSession({
        email: "buyer@example.com",
        priceId: "price_dearme_beta",
        successUrl: "https://app.example.com/dearme/checkout/success",
        cancelUrl: "https://app.example.com/dearme/checkout/cancel",
      })).rejects.toBeInstanceOf(DearMeStripeCheckoutError);
      await expect(service.createCheckoutSession({
        email: "buyer@example.com",
        priceId: "price_dearme_beta",
        successUrl: "https://app.example.com/dearme/checkout/success",
        cancelUrl: "https://app.example.com/dearme/checkout/cancel",
      })).rejects.toMatchObject({
        status: 503,
      });
    } finally {
      if (originalSecretKey === undefined) delete process.env.DEARME_STRIPE_SECRET_KEY;
      else process.env.DEARME_STRIPE_SECRET_KEY = originalSecretKey;
    }
  });
});
