import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import {
  createDearMeStripeClient,
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

function invoicePaidEvent(eventId = "evt_dearme_invoice_paid") {
  return {
    id: eventId,
    type: "invoice.paid",
    livemode: false,
    data: {
      object: {
        id: "in_dearme_renewal",
        object: "invoice",
        amount_paid: 25000,
        currency: "usd",
        customer: "cus_dearme_customer",
        customer_email: "buyer@example.com",
        subscription: "sub_dearme_beta",
        metadata: {
          dearmeCompanyId: "company-1",
        },
        created: 1_768_389_600,
      },
    },
  };
}

function subscriptionDeletedEvent(eventId = "evt_dearme_subscription_deleted") {
  return {
    id: eventId,
    type: "customer.subscription.deleted",
    livemode: false,
    data: {
      object: {
        id: "sub_dearme_beta",
        object: "subscription",
        customer: "cus_dearme_customer",
        metadata: {
          dearmeCompanyId: "company-1",
        },
        canceled_at: 1_768_389_600,
        ended_at: 1_768_389_600,
        created: 1_768_300_000,
      },
    },
  };
}

function stripeSignatureHeader(rawBody: Buffer, secret: string, timestampSeconds: number) {
  const signature = createHmac("sha256", secret)
    .update(`${timestampSeconds}.`)
    .update(rawBody)
    .digest("hex");
  return `t=${timestampSeconds},v1=${signature}`;
}

function fakeAccessGranter(options: { recordDelayMs?: number } = {}): any {
  return {
    recordHostedPaymentReceipts: vi.fn(async () => {
      if (options.recordDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.recordDelayMs));
      }
      return {
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
      };
    }),
    recordSubscriptionCancellation: vi.fn(async () => ({
      recordedEvent: { id: "finance-event-cancelled" },
      access: {
        companyId: "company-1",
        status: "trial",
        lifetimePaidCents: 25000,
        refundedCents: 25000,
        netPaidCents: 0,
        remainingCreditCents: 0,
        eventCount: 2,
        latestPaymentAt: "2026-01-01T00:00:00.000Z",
        latestPaymentDescription: "DearMe hosted checkout paid receipt",
        latestExternalInvoiceId: "pi_dearme_paid",
        entitlement: {
          state: "trial_preview",
          label: "Trial preview",
          headline: "Private cycles wait for paid beta access",
          summary: "Trial preview.",
          canRequestBrandOsApproval: false,
          canRunPrivateCycles: false,
          nextActionLabel: "Record paid beta access",
          nextActionDescription: "Record paid beta access.",
        },
        cycleGuardrail: {
          state: "trial_preview",
          label: "Trial preview",
          headline: "Private cycles wait for paid beta access",
          summary: "Trial preview.",
          spendCents: 0,
          budgetCents: 0,
          utilizationPercent: 0,
          remainingCreditCents: 0,
          decisionRequired: true,
          decisionLabel: "Record paid beta access",
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
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({
          id: "bps_dearme_portal",
          url: "https://billing.stripe.com/p/session/bps_dearme_portal",
        })),
      },
    },
    webhooks: {
      constructEvent: vi.fn(() => event),
    },
  };
}

describe("dearMeStripeCheckoutService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates Stripe Checkout sessions with DearMe paid beta args and defaults to subscription mode", async () => {
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
      mode: "subscription",
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

  it("creates Stripe Customer Portal sessions with the right args", async () => {
    const stripeClient = fakeStripeClient();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient,
      paidBetaAccess: fakeAccessGranter(),
    });

    await expect(service.createPortalSession({
      customerId: "cus_dearme_customer",
      returnUrl: "https://app.example.com/dearme/billing",
    })).resolves.toEqual({
      portalUrl: "https://billing.stripe.com/p/session/bps_dearme_portal",
      portalSessionId: "bps_dearme_portal",
    });

    expect(stripeClient.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_dearme_customer",
      return_url: "https://app.example.com/dearme/billing",
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

  it("records one grant when 10 identical checkout webhooks arrive together", async () => {
    const paidBetaAccess = fakeAccessGranter({ recordDelayMs: 25 });
    const event = checkoutCompletedEvent("cs_dearme_stress");
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(event),
      paidBetaAccess,
    });
    const input = {
      rawBody: Buffer.from(JSON.stringify(event)),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.handleCheckoutWebhook(input)),
    );

    expect(results.filter((result) => result.status === "recorded")).toHaveLength(1);
    expect(results.filter((result) => result.status === "duplicate")).toHaveLength(9);
    expect(results.reduce((sum, result) => sum + result.recordedEventCount, 0)).toBe(1);
    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(1);
  });

  it("extends paid-beta access for invoice.paid renewals", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(invoicePaidEvent()),
      paidBetaAccess,
    });

    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from(JSON.stringify(invoicePaidEvent())),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    })).resolves.toMatchObject({
      received: true,
      status: "recorded",
      provider: "stripe",
      companyId: "company-1",
      checkoutSessionId: null,
      stripeEventId: "evt_dearme_invoice_paid",
      recordedEventCount: 1,
    });

    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(1);
    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledWith(
      "company-1",
      [expect.objectContaining({
        companyId: "company-1",
        id: "evt_dearme_invoice_paid",
        idempotencyKey: "evt_dearme_invoice_paid",
        externalInvoiceId: "in_dearme_renewal",
        kind: "checkout_paid",
      })],
      { reason: "renewal" },
    );
  });

  it("does not double-grant the same invoice.paid Stripe event id", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const event = invoicePaidEvent("evt_dearme_invoice_repeat");
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(event),
      paidBetaAccess,
    });
    const input = {
      rawBody: Buffer.from(JSON.stringify(event)),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    };

    await service.handleCheckoutWebhook(input);
    await expect(service.handleCheckoutWebhook(input)).resolves.toMatchObject({
      status: "duplicate",
      stripeEventId: "evt_dearme_invoice_repeat",
      recordedEventCount: 0,
    });

    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(1);
  });

  it("keeps out-of-order invoice.paid then checkout.session.completed as separate access records", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const invoiceEvent = invoicePaidEvent("evt_dearme_invoice_first");
    const checkoutEvent = checkoutCompletedEvent("cs_dearme_checkout_second");
    const stripeClient = fakeStripeClient(invoiceEvent);
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient,
      paidBetaAccess,
    });

    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from(JSON.stringify(invoiceEvent)),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    })).resolves.toMatchObject({
      status: "recorded",
      stripeEventId: "evt_dearme_invoice_first",
      recordedEventCount: 1,
    });

    vi.mocked(stripeClient.webhooks.constructEvent).mockReturnValue(checkoutEvent);
    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from(JSON.stringify(checkoutEvent)),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    })).resolves.toMatchObject({
      status: "recorded",
      checkoutSessionId: "cs_dearme_checkout_second",
      recordedEventCount: 1,
    });

    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenCalledTimes(2);
    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenNthCalledWith(
      1,
      "company-1",
      [expect.objectContaining({
        id: "evt_dearme_invoice_first",
        idempotencyKey: "evt_dearme_invoice_first",
        externalInvoiceId: "in_dearme_renewal",
      })],
      { reason: "renewal" },
    );
    expect(paidBetaAccess.recordHostedPaymentReceipts).toHaveBeenNthCalledWith(
      2,
      "company-1",
      [expect.objectContaining({
        id: "evt_dearme_checkout_completed",
        idempotencyKey: "cs_dearme_checkout_second",
        externalInvoiceId: "pi_dearme_paid",
      })],
    );
  });

  it("rejects Stripe webhook signature replays older than 5 minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:10:01.000Z"));
    const rawBody = Buffer.from(JSON.stringify(checkoutCompletedEvent()));
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: createDearMeStripeClient("sk_test_dearme"),
      paidBetaAccess: fakeAccessGranter(),
    });

    await expect(service.handleCheckoutWebhook({
      rawBody,
      signatureHeader: stripeSignatureHeader(rawBody, "whsec_test", 1_767_225_000),
      webhookSecret: "whsec_test",
    })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("cancels paid-beta access for customer.subscription.deleted", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(subscriptionDeletedEvent()),
      paidBetaAccess,
    });

    await expect(service.handleCheckoutWebhook({
      rawBody: Buffer.from(JSON.stringify(subscriptionDeletedEvent())),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    })).resolves.toMatchObject({
      received: true,
      status: "recorded",
      provider: "stripe",
      companyId: "company-1",
      checkoutSessionId: null,
      stripeEventId: "evt_dearme_subscription_deleted",
      recordedEventCount: 1,
    });

    expect(paidBetaAccess.recordSubscriptionCancellation).toHaveBeenCalledTimes(1);
    expect(paidBetaAccess.recordSubscriptionCancellation).toHaveBeenCalledWith(
      "company-1",
      {
        externalSubscriptionId: "sub_dearme_beta",
        externalCustomerId: "cus_dearme_customer",
        idempotencyKey: "evt_dearme_subscription_deleted",
        occurredAt: "2026-01-14T11:20:00.000Z",
      },
    );
  });

  it("does not double-cancel the same customer.subscription.deleted Stripe event id", async () => {
    const paidBetaAccess = fakeAccessGranter();
    const event = subscriptionDeletedEvent("evt_dearme_subscription_repeat");
    const service = dearMeStripeCheckoutService({} as Db, {
      stripeClient: fakeStripeClient(event),
      paidBetaAccess,
    });
    const input = {
      rawBody: Buffer.from(JSON.stringify(event)),
      signatureHeader: "t=1,v1=valid",
      webhookSecret: "whsec_test",
    };

    await service.handleCheckoutWebhook(input);
    await expect(service.handleCheckoutWebhook(input)).resolves.toMatchObject({
      status: "duplicate",
      stripeEventId: "evt_dearme_subscription_repeat",
      recordedEventCount: 0,
    });

    expect(paidBetaAccess.recordSubscriptionCancellation).toHaveBeenCalledTimes(1);
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
