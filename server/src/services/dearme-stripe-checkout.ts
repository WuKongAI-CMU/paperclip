import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers, companyMemberships } from "@paperclipai/db";
import { z } from "zod";
import {
  dearmePaidBetaAccessService,
  projectDearMeStripeCheckoutCompletedEvents,
  verifyDearMeStripeWebhookSignature,
  type DearMeHostedPaymentReceiptRecordResult,
  type DearMeStripeCheckoutCompletedEvent,
} from "./dearme-paid-beta-access.js";
import { sendLifecycleEvent } from "./dearme-lifecycle.js";
import { dearMeReferralService } from "./dearme-referral.js";

export interface DearMeCheckoutSessionInput {
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode?: "subscription" | "payment";
}

export interface DearMeCheckoutWebhookInput {
  rawBody: Buffer;
  signatureHeader: string | null | undefined;
  webhookSecret: string;
}

export interface DearMeCheckoutSessionResult {
  checkoutUrl: string;
  checkoutSessionId: string;
  companyId: string;
}

export interface DearMeCheckoutWebhookResult {
  received: true;
  status: "recorded" | "duplicate" | "ignored";
  provider: "stripe";
  companyId: string | null;
  checkoutSessionId: string | null;
  stripeEventId?: string;
  recordedEventCount: number;
  access?: DearMeHostedPaymentReceiptRecordResult["access"];
  reason?: string;
}

export class DearMeStripeCheckoutError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface DearMeStripeCheckoutSessionCreateParams {
  mode: "subscription" | "payment";
  customer_email: string;
  client_reference_id: string;
  line_items: Array<{ price: string; quantity: number }>;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
}

export interface DearMeStripePortalSessionCreateParams {
  customer: string;
  return_url: string;
}

export interface DearMeStripeClient {
  checkout: {
    sessions: {
      create(params: DearMeStripeCheckoutSessionCreateParams): Promise<{
        id: string;
        url: string | null;
      }>;
    };
  };
  billingPortal: {
    sessions: {
      create(params: DearMeStripePortalSessionCreateParams): Promise<{
        id: string;
        url: string | null;
      }>;
    };
  };
  webhooks: {
    constructEvent(rawBody: Buffer, signatureHeader: string, webhookSecret: string): unknown;
  };
}

type PaidBetaAccessGranter = Pick<
  ReturnType<typeof dearmePaidBetaAccessService>,
  "recordHostedPaymentReceipts" | "recordSubscriptionCancellation"
>;

export interface DearMeStripeCheckoutServiceOptions {
  stripeClient?: DearMeStripeClient;
  paidBetaAccess?: PaidBetaAccessGranter;
  resolveCompanyIdForEmail?: (email: string) => Promise<string | null>;
}

const stripeCheckoutCompletedEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("checkout.session.completed"),
  livemode: z.boolean(),
  data: z.object({
    object: z.object({
      id: z.string().trim().min(1),
      object: z.literal("checkout.session"),
      status: z.enum(["open", "complete", "expired"]),
      payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
      amount_total: z.number().int().nonnegative().nullable(),
      currency: z.string().trim().min(1).nullable(),
      client_reference_id: z.string().trim().min(1).nullable(),
      payment_intent: z.string().trim().min(1).nullable(),
      invoice: z.string().trim().min(1).nullable(),
      metadata: z.record(z.string(), z.string().nullable().optional()).nullable().optional(),
      created: z.number().int().nonnegative(),
    }).passthrough().transform((session) => ({
      ...session,
      metadata: session.metadata ?? undefined,
    })),
  }).passthrough(),
}).passthrough();

const stripeInvoicePaidEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("invoice.paid"),
  livemode: z.boolean(),
  data: z.object({
    object: z.object({
      id: z.string().trim().min(1),
      object: z.literal("invoice"),
      amount_paid: z.number().int().nonnegative(),
      currency: z.string().trim().min(1).nullable(),
      customer: z.string().trim().min(1).nullable().optional(),
      customer_email: z.string().trim().email().nullable().optional(),
      subscription: z.string().trim().min(1).nullable().optional(),
      metadata: z.record(z.string(), z.string().nullable().optional()).nullable().optional(),
      subscription_details: z.object({
        metadata: z.record(z.string(), z.string().nullable().optional()).nullable().optional(),
      }).nullable().optional(),
      created: z.number().int().nonnegative(),
    }).passthrough().transform((invoice) => ({
      ...invoice,
      metadata: invoice.metadata ?? undefined,
      subscription_details: invoice.subscription_details ?? undefined,
    })),
  }).passthrough(),
}).passthrough();

const stripeSubscriptionDeletedEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("customer.subscription.deleted"),
  livemode: z.boolean(),
  data: z.object({
    object: z.object({
      id: z.string().trim().min(1),
      object: z.literal("subscription"),
      customer: z.string().trim().min(1).nullable().optional(),
      metadata: z.record(z.string(), z.string().nullable().optional()).nullable().optional(),
      canceled_at: z.number().int().nonnegative().nullable().optional(),
      ended_at: z.number().int().nonnegative().nullable().optional(),
      created: z.number().int().nonnegative(),
    }).passthrough().transform((subscription) => ({
      ...subscription,
      metadata: subscription.metadata ?? undefined,
    })),
  }).passthrough(),
}).passthrough();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requireConfiguredValue(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new DearMeStripeCheckoutError(503, `${label} is not configured.`);
  }
  return trimmed;
}

function parseCheckoutCompletedEvent(event: unknown): DearMeStripeCheckoutCompletedEvent | null {
  const parsed = stripeCheckoutCompletedEventSchema.safeParse(event);
  return parsed.success ? parsed.data : null;
}

type DearMeStripeInvoicePaidEvent = z.infer<typeof stripeInvoicePaidEventSchema>;
type DearMeStripeSubscriptionDeletedEvent = z.infer<typeof stripeSubscriptionDeletedEventSchema>;

function parseInvoicePaidEvent(event: unknown): DearMeStripeInvoicePaidEvent | null {
  const parsed = stripeInvoicePaidEventSchema.safeParse(event);
  return parsed.success ? parsed.data : null;
}

function parseSubscriptionDeletedEvent(event: unknown): DearMeStripeSubscriptionDeletedEvent | null {
  const parsed = stripeSubscriptionDeletedEventSchema.safeParse(event);
  return parsed.success ? parsed.data : null;
}

function checkoutSessionCompanyId(event: DearMeStripeCheckoutCompletedEvent) {
  const session = event.data.object;
  return session.client_reference_id?.trim() || session.metadata?.dearmeCompanyId?.trim() || "";
}

function checkoutSessionEmail(event: DearMeStripeCheckoutCompletedEvent) {
  const session = event.data.object as DearMeStripeCheckoutCompletedEvent["data"]["object"] & {
    customer_email?: unknown;
    customer_details?: { email?: unknown } | null;
  };
  const directEmail = typeof session.customer_email === "string" ? session.customer_email : "";
  const customerDetailsEmail = typeof session.customer_details?.email === "string" ? session.customer_details.email : "";
  return normalizeEmail(directEmail || customerDetailsEmail);
}

function invoiceCompanyId(event: DearMeStripeInvoicePaidEvent) {
  const invoice = event.data.object;
  return invoice.metadata?.dearmeCompanyId?.trim() ||
    invoice.subscription_details?.metadata?.dearmeCompanyId?.trim() ||
    "";
}

function subscriptionCompanyId(event: DearMeStripeSubscriptionDeletedEvent) {
  return event.data.object.metadata?.dearmeCompanyId?.trim() || "";
}

function invoiceEmail(event: DearMeStripeInvoicePaidEvent) {
  const email = event.data.object.customer_email;
  return typeof email === "string" ? normalizeEmail(email) : "";
}

function subscriptionDeletedEmail(eventPayload: unknown) {
  const subscription = (eventPayload as { data?: { object?: unknown } }).data?.object as {
    customer_email?: unknown;
    customer_details?: { email?: unknown } | null;
    metadata?: Record<string, unknown> | null;
  } | null | undefined;
  const directEmail = typeof subscription?.customer_email === "string" ? subscription.customer_email : "";
  const customerDetailsEmail = typeof subscription?.customer_details?.email === "string"
    ? subscription.customer_details.email
    : "";
  const metadataEmail = typeof subscription?.metadata?.customerEmail === "string"
    ? subscription.metadata.customerEmail
    : "";
  return normalizeEmail(directEmail || customerDetailsEmail || metadataEmail);
}

function checkoutSessionCouponId(event: DearMeStripeCheckoutCompletedEvent) {
  const session = event.data.object as DearMeStripeCheckoutCompletedEvent["data"]["object"] & {
    discounts?: Array<{
      coupon?: string | { id?: unknown } | null;
      discount?: { coupon?: string | { id?: unknown } | null } | null;
    }> | null;
    total_details?: {
      breakdown?: {
        discounts?: Array<{
          discount?: { coupon?: string | { id?: unknown } | null } | null;
        }> | null;
      } | null;
    } | null;
  };
  const coupon =
    session.discounts?.[0]?.coupon
    ?? session.discounts?.[0]?.discount?.coupon
    ?? session.total_details?.breakdown?.discounts?.[0]?.discount?.coupon;
  if (typeof coupon === "string") return coupon.trim() || null;
  if (coupon && typeof coupon.id === "string") return coupon.id.trim() || null;
  return null;
}

function formValue(value: string | number) {
  return typeof value === "number" ? String(value) : value;
}

function encodeStripeForm(params: DearMeStripeCheckoutSessionCreateParams) {
  const body = new URLSearchParams();
  body.set("mode", params.mode);
  body.set("customer_email", params.customer_email);
  body.set("client_reference_id", params.client_reference_id);
  body.set("success_url", params.success_url);
  body.set("cancel_url", params.cancel_url);
  params.line_items.forEach((item, index) => {
    body.set(`line_items[${index}][price]`, item.price);
    body.set(`line_items[${index}][quantity]`, formValue(item.quantity));
  });
  for (const [key, value] of Object.entries(params.metadata)) {
    body.set(`metadata[${key}]`, value);
  }
  return body;
}

function encodeStripePortalForm(params: DearMeStripePortalSessionCreateParams) {
  const body = new URLSearchParams();
  body.set("customer", params.customer);
  body.set("return_url", params.return_url);
  return body;
}

export function createDearMeStripeClient(secretKey: string): DearMeStripeClient {
  return {
    checkout: {
      sessions: {
        async create(params) {
          const configuredSecretKey = requireConfiguredValue(secretKey, "DearMe Stripe secret key");
          const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              authorization: `Bearer ${configuredSecretKey}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: encodeStripeForm(params),
          });
          const payload = await response.json().catch(() => null) as { id?: unknown; url?: unknown; error?: { message?: string } } | null;
          if (!response.ok) {
            throw new DearMeStripeCheckoutError(
              502,
              payload?.error?.message ?? "Stripe Checkout session creation failed.",
            );
          }
          if (typeof payload?.id !== "string" || typeof payload.url !== "string") {
            throw new DearMeStripeCheckoutError(502, "Stripe Checkout did not return a hosted URL.");
          }
          return {
            id: payload.id,
            url: payload.url,
          };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          const configuredSecretKey = requireConfiguredValue(secretKey, "DearMe Stripe secret key");
          const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
            method: "POST",
            headers: {
              authorization: `Bearer ${configuredSecretKey}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: encodeStripePortalForm(params),
          });
          const payload = await response.json().catch(() => null) as { id?: unknown; url?: unknown; error?: { message?: string } } | null;
          if (!response.ok) {
            throw new DearMeStripeCheckoutError(
              502,
              payload?.error?.message ?? "Stripe Customer Portal session creation failed.",
            );
          }
          if (typeof payload?.id !== "string" || typeof payload.url !== "string") {
            throw new DearMeStripeCheckoutError(502, "Stripe Customer Portal did not return a hosted URL.");
          }
          return {
            id: payload.id,
            url: payload.url,
          };
        },
      },
    },
    webhooks: {
      constructEvent(rawBody, signatureHeader, webhookSecret) {
        const valid = verifyDearMeStripeWebhookSignature({
          rawBody,
          signatureHeader,
          webhookSecret,
        });
        if (!valid) {
          throw new DearMeStripeCheckoutError(400, "Invalid DearMe Stripe Checkout webhook signature.");
        }
        return JSON.parse(rawBody.toString("utf-8")) as unknown;
      },
    },
  };
}

async function resolveCompanyIdForEmail(db: Db, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [row] = await db
    .select({ companyId: companyMemberships.companyId })
    .from(authUsers)
    .innerJoin(
      companyMemberships,
      and(
        eq(companyMemberships.principalType, "user"),
        eq(companyMemberships.principalId, authUsers.id),
        eq(companyMemberships.status, "active"),
      ),
    )
    .where(sql`lower(${authUsers.email}) = ${normalizedEmail}`)
    .limit(1);
  return row?.companyId ?? null;
}

export function dearMeStripeCheckoutService(
  db: Db,
  options: DearMeStripeCheckoutServiceOptions = {},
) {
  const paidBetaAccess = options.paidBetaAccess ?? dearmePaidBetaAccessService(db);
  const stripeClient = options.stripeClient ?? createDearMeStripeClient(process.env.DEARME_STRIPE_SECRET_KEY ?? "");
  const resolveCompany = options.resolveCompanyIdForEmail ?? ((email: string) => resolveCompanyIdForEmail(db, email));
  const processedStripeEventIds = new Set<string>();

  async function createCheckoutSession(input: DearMeCheckoutSessionInput): Promise<DearMeCheckoutSessionResult> {
    const email = normalizeEmail(input.email);
    const priceId = requireConfiguredValue(input.priceId, "DearMe Stripe beta price");
    const successUrl = requireConfiguredValue(input.successUrl, "DearMe Stripe Checkout success URL");
    const cancelUrl = requireConfiguredValue(input.cancelUrl, "DearMe Stripe Checkout cancel URL");
    const companyId = await resolveCompany(email);

    if (!companyId) {
      throw new DearMeStripeCheckoutError(404, "No DearMe company found for that email.");
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: input.mode ?? "subscription",
      customer_email: email,
      client_reference_id: companyId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product: "dearme",
        access: "paid_beta",
        dearmeCompanyId: companyId,
        customerEmail: email,
      },
    });

    if (!session.url) {
      throw new DearMeStripeCheckoutError(502, "Stripe Checkout did not return a hosted URL.");
    }

    return {
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
      companyId,
    };
  }

  async function createPortalSession(input: { customerId: string; returnUrl: string }) {
    const customerId = requireConfiguredValue(input.customerId, "DearMe Stripe customer ID");
    const returnUrl = requireConfiguredValue(input.returnUrl, "DearMe Stripe Customer Portal return URL");
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      throw new DearMeStripeCheckoutError(502, "Stripe Customer Portal did not return a hosted URL.");
    }

    return {
      portalUrl: session.url,
      portalSessionId: session.id,
    };
  }

  async function handleCheckoutWebhook(input: DearMeCheckoutWebhookInput): Promise<DearMeCheckoutWebhookResult> {
    const webhookSecret = requireConfiguredValue(input.webhookSecret, "DearMe Stripe webhook secret");
    const signatureHeader = input.signatureHeader?.trim();
    if (!signatureHeader) {
      throw new DearMeStripeCheckoutError(400, "Missing DearMe Stripe Checkout webhook signature.");
    }

    let eventPayload: unknown;
    try {
      eventPayload = stripeClient.webhooks.constructEvent(input.rawBody, signatureHeader, webhookSecret);
    } catch (err) {
      if (err instanceof DearMeStripeCheckoutError) throw err;
      throw new DearMeStripeCheckoutError(400, "Invalid DearMe Stripe Checkout webhook signature.");
    }

    const eventType = eventPayload && typeof eventPayload === "object"
      ? (eventPayload as { type?: unknown }).type
      : null;
    // Lifecycle event hook: fire cancellation lifecycle email at the boundary of
    // handling. DM-SUBSCRIPTIONS keeps full event-routing authority below.
    if (eventType === "customer.subscription.deleted") {
      const lifecycleEmail = subscriptionDeletedEmail(eventPayload);
      if (lifecycleEmail) {
        void sendLifecycleEvent({ email: lifecycleEmail, eventName: "dearme_cancelled" });
      }
    }
    if (
      eventType !== "checkout.session.completed" &&
      eventType !== "invoice.paid" &&
      eventType !== "customer.subscription.deleted"
    ) {
      return {
        received: true,
        status: "ignored",
        provider: "stripe",
        companyId: null,
        checkoutSessionId: null,
        recordedEventCount: 0,
        reason: "unsupported_event_type",
      };
    }

    const stripeEventId = typeof (eventPayload as { id?: unknown }).id === "string"
      ? (eventPayload as { id: string }).id
      : "";
    if (stripeEventId && processedStripeEventIds.has(stripeEventId)) {
      const duplicateCheckoutEvent = eventType === "checkout.session.completed"
        ? parseCheckoutCompletedEvent(eventPayload)
        : null;
      const duplicateInvoiceEvent = eventType === "invoice.paid"
        ? parseInvoicePaidEvent(eventPayload)
        : null;
      const duplicateSubscriptionEvent = eventType === "customer.subscription.deleted"
        ? parseSubscriptionDeletedEvent(eventPayload)
        : null;
      return {
        received: true,
        status: "duplicate",
        provider: "stripe",
        companyId: duplicateCheckoutEvent
          ? duplicateCheckoutEvent.data.object.client_reference_id ?? duplicateCheckoutEvent.data.object.metadata?.dearmeCompanyId ?? null
          : duplicateInvoiceEvent
            ? invoiceCompanyId(duplicateInvoiceEvent) || null
            : duplicateSubscriptionEvent
              ? subscriptionCompanyId(duplicateSubscriptionEvent) || null
              : null,
        checkoutSessionId: duplicateCheckoutEvent?.data.object.id ?? null,
        stripeEventId,
        recordedEventCount: 0,
      };
    }

    if (eventType === "invoice.paid") {
      const event = parseInvoicePaidEvent(eventPayload);
      if (!event) {
        return {
          received: true,
          status: "ignored",
          provider: "stripe",
          companyId: null,
          checkoutSessionId: null,
          recordedEventCount: 0,
          reason: "invalid_invoice_paid_payload",
        };
      }

      const companyId = invoiceCompanyId(event) || await resolveCompany(invoiceEmail(event));
      if (!companyId) {
        return {
          received: true,
          status: "ignored",
          provider: "stripe",
          companyId: null,
          checkoutSessionId: null,
          stripeEventId: event.id,
          recordedEventCount: 0,
          reason: "invoice_paid_missing_company",
        };
      }

      const invoice = event.data.object;
      const result = await paidBetaAccess.recordHostedPaymentReceipts(
        companyId,
        [{
          id: event.id,
          companyId,
          provider: "hosted_checkout",
          kind: "checkout_paid",
          amountCents: invoice.amount_paid,
          currency: invoice.currency?.toUpperCase() ?? "USD",
          externalInvoiceId: invoice.id,
          signatureVerified: true,
          idempotencyKey: event.id,
          occurredAt: new Date(invoice.created * 1000).toISOString(),
        }],
        { reason: "renewal" },
      );
      processedStripeEventIds.add(event.id);

      return {
        received: true,
        status: result.recordedEvents.length > 0 ? "recorded" : "duplicate",
        provider: "stripe",
        companyId,
        checkoutSessionId: null,
        stripeEventId: event.id,
        recordedEventCount: result.recordedEvents.length,
        access: result.access,
      };
    }

    if (eventType === "customer.subscription.deleted") {
      const event = parseSubscriptionDeletedEvent(eventPayload);
      if (!event) {
        return {
          received: true,
          status: "ignored",
          provider: "stripe",
          companyId: null,
          checkoutSessionId: null,
          recordedEventCount: 0,
          reason: "invalid_subscription_deleted_payload",
        };
      }

      const companyId = subscriptionCompanyId(event);
      if (!companyId) {
        return {
          received: true,
          status: "ignored",
          provider: "stripe",
          companyId: null,
          checkoutSessionId: null,
          stripeEventId: event.id,
          recordedEventCount: 0,
          reason: "subscription_deleted_missing_company",
        };
      }

      const subscription = event.data.object;
      const occurredAt = subscription.ended_at ?? subscription.canceled_at ?? subscription.created;
      const result = await paidBetaAccess.recordSubscriptionCancellation(companyId, {
        externalSubscriptionId: subscription.id,
        externalCustomerId: subscription.customer ?? null,
        idempotencyKey: event.id,
        occurredAt: new Date(occurredAt * 1000).toISOString(),
      });
      processedStripeEventIds.add(event.id);

      return {
        received: true,
        status: result.recordedEvent ? "recorded" : "duplicate",
        provider: "stripe",
        companyId,
        checkoutSessionId: null,
        stripeEventId: event.id,
        recordedEventCount: result.recordedEvent ? 1 : 0,
        access: result.access,
      };
    }

    const event = parseCheckoutCompletedEvent(eventPayload);
    if (!event) {
      return {
        received: true,
        status: "ignored",
        provider: "stripe",
        companyId: null,
        checkoutSessionId: null,
        recordedEventCount: 0,
        reason: "invalid_checkout_session_completed_payload",
      };
    }

    const checkoutSessionId = event.data.object.id;
    if (processedStripeEventIds.has(event.id)) {
      return {
        received: true,
        status: "duplicate",
        provider: "stripe",
        companyId: event.data.object.client_reference_id ?? event.data.object.metadata?.dearmeCompanyId ?? null,
        checkoutSessionId,
        stripeEventId: event.id,
        recordedEventCount: 0,
      };
    }

    const companyId = checkoutSessionCompanyId(event);
    const resolvedCompanyId = companyId || await resolveCompany(checkoutSessionEmail(event));
    const eventWithCompany = resolvedCompanyId && !companyId
      ? {
          ...event,
          data: {
            ...event.data,
            object: {
              ...event.data.object,
              client_reference_id: resolvedCompanyId,
            },
          },
        }
      : event;

    const providerProjection = projectDearMeStripeCheckoutCompletedEvents([eventWithCompany], {
      signatureVerified: true,
    });
    const [receipt] = providerProjection.hostedReceipts;
    if (!receipt) {
      return {
        received: true,
        status: "ignored",
        provider: "stripe",
        companyId: null,
        checkoutSessionId,
        recordedEventCount: 0,
        reason: "checkout_did_not_unlock_paid_access",
      };
    }

    const result = await paidBetaAccess.recordHostedPaymentReceipts(receipt.companyId, [receipt]);
    processedStripeEventIds.add(event.id);
    const lifecycleEmail = checkoutSessionEmail(event);
    if (lifecycleEmail) {
      const tier = event.data.object.metadata?.tier ?? event.data.object.metadata?.access ?? "paid_beta";
      void sendLifecycleEvent({
        email: lifecycleEmail,
        eventName: "dearme_first_payment",
        properties: { tier },
      });
    }
    try {
      const stripeCouponId = checkoutSessionCouponId(eventWithCompany);
      if (stripeCouponId) {
        await dearMeReferralService(db).markFirstPayment({
          referredCompanyId: receipt.companyId,
          stripeCouponId,
        });
      }
    } catch {
      // Referral attribution must not block paid-beta access.
    }

    return {
      received: true,
      status: result.recordedEvents.length > 0 ? "recorded" : "duplicate",
      provider: "stripe",
      companyId: receipt.companyId,
      checkoutSessionId,
      stripeEventId: event.id,
      recordedEventCount: result.recordedEvents.length,
      access: result.access,
    };
  }

  return {
    createCheckoutSession,
    createPortalSession,
    handleCheckoutWebhook,
  };
}
