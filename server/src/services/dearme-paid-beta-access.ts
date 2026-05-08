import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { financeEvents } from "@paperclipai/db";
import {
  DEARME_PAID_BETA_BILLER,
  dearMePaidBetaStatusSchema,
  describeDearMePaidBetaEntitlement,
  type DearMePaidBetaRecord,
  type DearMePaidBetaStatus,
} from "@paperclipai/shared";
import { financeService } from "./finance.js";

type FinanceEventRow = typeof financeEvents.$inferSelect;

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function summarizeDearMePaidBetaAccess(
  companyId: string,
  events: FinanceEventRow[],
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
  const latestPayment = events.find((event) => event.direction === "credit" && event.amountCents > 0);
  const status = netPaidCents > 0 ? "active" : "trial";

  return dearMePaidBetaStatusSchema.parse({
    companyId,
    status,
    lifetimePaidCents,
    refundedCents,
    netPaidCents,
    remainingCreditCents: netPaidCents,
    eventCount: events.length,
    latestPaymentAt: latestPayment ? toIso(latestPayment.occurredAt) : null,
    latestPaymentDescription: latestPayment?.description ?? null,
    latestExternalInvoiceId: latestPayment?.externalInvoiceId ?? null,
    entitlement: describeDearMePaidBetaEntitlement(status),
  });
}

export function dearmePaidBetaAccessService(db: Db) {
  const finance = financeService(db);

  async function getAccess(companyId: string) {
    const events = await db
      .select()
      .from(financeEvents)
      .where(and(
        eq(financeEvents.companyId, companyId),
        eq(financeEvents.biller, DEARME_PAID_BETA_BILLER),
      ))
      .orderBy(desc(financeEvents.occurredAt), desc(financeEvents.createdAt));

    return summarizeDearMePaidBetaAccess(companyId, events);
  }

  return {
    getAccess,

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
