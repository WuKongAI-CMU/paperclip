import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { financeEvents } from "@paperclipai/db";
import {
  DEARME_PAID_BETA_BILLER,
  dearMePaidBetaStatusSchema,
  describeDearMePaidBetaEntitlement,
  type DearMeCycleGuardrail,
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

export function describeDearMePrivateCycleBlocker(access: DearMePaidBetaStatus) {
  if (!access.entitlement.canRequestBrandOsApproval) {
    return access.entitlement.nextActionDescription;
  }
  if (access.cycleGuardrail.state === "hard_stop") {
    return access.cycleGuardrail.summary;
  }
  return null;
}

export function dearmePaidBetaAccessService(db: Db) {
  const finance = financeService(db);
  const costs = costService(db);

  async function getAccess(companyId: string) {
    const [events, cycleSpend] = await Promise.all([
      db
        .select()
        .from(financeEvents)
        .where(and(
          eq(financeEvents.companyId, companyId),
          eq(financeEvents.biller, DEARME_PAID_BETA_BILLER),
        ))
        .orderBy(desc(financeEvents.occurredAt), desc(financeEvents.createdAt)),
      costs.summary(companyId, currentUtcMonthWindow()),
    ]);

    return summarizeDearMePaidBetaAccess(companyId, events, cycleSpend);
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
