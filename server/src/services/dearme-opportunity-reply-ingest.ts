import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { activityLog, opportunities, type Db, type Opportunity } from "@paperclipai/db";

export const DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION = "dearme.opportunity_reply_received";
const OPPORTUNITY_REPLY_ACTOR_ID = "dearme-opportunity-reply-ingest";

const channelSchema = z.enum(["linkedin", "email"]);

const dearMeOpportunityReplyIngestBaseSchema = z.object({
  companyId: z.string().trim().uuid(),
  channel: channelSchema,
  externalMessageId: z.string().trim().min(1).max(180),
  opportunityId: z.string().trim().uuid().optional(),
  contactEmail: z.string().trim().email().optional(),
  contactHandle: z.string().trim().min(1).max(180).optional(),
  contactUrl: z.string().trim().url().optional(),
  senderName: z.string().trim().min(1).max(180).optional(),
  sourceUrl: z.string().trim().url().optional(),
  receivedAt: z.string().datetime(),
  replyPreview: z.string().trim().min(1).max(1200),
}).strict();

export const dearMeOpportunityReplyIngestSchema = dearMeOpportunityReplyIngestBaseSchema.refine(
  (input) => input.opportunityId || input.contactEmail || input.contactHandle || input.contactUrl,
  "Provide opportunityId or a contact identifier.",
);

export const dearMeOpportunityReplyWebhookSchema = dearMeOpportunityReplyIngestBaseSchema.omit({
  companyId: true,
}).extend({
  companyId: z.string().trim().uuid(),
}).refine(
  (input) => input.opportunityId || input.contactEmail || input.contactHandle || input.contactUrl,
  "Provide opportunityId or a contact identifier.",
);

export type DearMeOpportunityReplyIngestInput = z.input<typeof dearMeOpportunityReplyIngestSchema>;
export type DearMeOpportunityReplyChannel = z.infer<typeof channelSchema>;

export type DearMeOpportunityReplyIngestResult = {
  status: "recorded" | "duplicate" | "opportunity_not_found";
  companyId: string;
  opportunityId: string | null;
  activityId: string | null;
  receivedAt: string;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEmail(value: string | undefined) {
  return normalizeOptionalText(value)?.toLocaleLowerCase();
}

function compactPreview(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 700 ? `${normalized.slice(0, 697)}...` : normalized;
}

function recordFromNotes(value: Opportunity["notes"]): NonNullable<Opportunity["notes"]> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function recordFromSignals(value: Opportunity["signals"]): NonNullable<Opportunity["signals"]> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function entityIdForReply(input: {
  companyId: string;
  channel: DearMeOpportunityReplyChannel;
  externalMessageId: string;
}) {
  return `${input.companyId}:${input.channel}:${input.externalMessageId}`;
}

export function dearMeOpportunityReplyIngestService(db: Db) {
  async function findOpportunity(input: z.infer<typeof dearMeOpportunityReplyIngestSchema>) {
    if (input.opportunityId) {
      const [row] = await db
        .select()
        .from(opportunities)
        .where(and(
          eq(opportunities.companyId, input.companyId),
          eq(opportunities.id, input.opportunityId),
          isNull(opportunities.deletedAt),
        ))
        .limit(1);
      return row ?? null;
    }

    const matchers = [];
    const contactEmail = normalizeEmail(input.contactEmail);
    const contactHandle = normalizeOptionalText(input.contactHandle);
    const contactUrl = normalizeOptionalText(input.contactUrl);

    if (contactEmail) {
      matchers.push(sql`lower(${opportunities.contactEmail}) = ${contactEmail}`);
    }
    if (contactHandle) {
      matchers.push(eq(opportunities.contactHandle, contactHandle));
    }
    if (contactUrl) {
      matchers.push(eq(opportunities.contactUrl, contactUrl));
    }
    if (matchers.length === 0) return null;

    const [row] = await db
      .select()
      .from(opportunities)
      .where(and(
        eq(opportunities.companyId, input.companyId),
        isNull(opportunities.deletedAt),
        or(...matchers),
      ))
      .orderBy(desc(opportunities.updatedAt))
      .limit(1);
    return row ?? null;
  }

  return {
    ingest: async (rawInput: DearMeOpportunityReplyIngestInput): Promise<DearMeOpportunityReplyIngestResult> => {
      const input = dearMeOpportunityReplyIngestSchema.parse({
        ...rawInput,
        externalMessageId: normalizeOptionalText(rawInput.externalMessageId),
        contactEmail: normalizeEmail(rawInput.contactEmail),
        contactHandle: normalizeOptionalText(rawInput.contactHandle),
        contactUrl: normalizeOptionalText(rawInput.contactUrl),
        senderName: normalizeOptionalText(rawInput.senderName),
        sourceUrl: normalizeOptionalText(rawInput.sourceUrl),
        replyPreview: compactPreview(rawInput.replyPreview),
      });
      const receivedAt = new Date(input.receivedAt);
      const entityId = entityIdForReply(input);

      const [existing] = await db
        .select({ id: activityLog.id })
        .from(activityLog)
        .where(and(
          eq(activityLog.companyId, input.companyId),
          eq(activityLog.action, DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION),
          eq(activityLog.entityType, "opportunity_reply"),
          eq(activityLog.entityId, entityId),
        ))
        .limit(1);
      if (existing) {
        return {
          status: "duplicate",
          companyId: input.companyId,
          opportunityId: null,
          activityId: existing.id,
          receivedAt: input.receivedAt,
        };
      }

      const opportunity = await findOpportunity(input);
      if (!opportunity) {
        return {
          status: "opportunity_not_found",
          companyId: input.companyId,
          opportunityId: null,
          activityId: null,
          receivedAt: input.receivedAt,
        };
      }

      await db
        .update(opportunities)
        .set({
          state: "replied",
          stateChangedAt: receivedAt,
          updatedAt: receivedAt,
          notes: {
            ...recordFromNotes(opportunity.notes),
            lastInboundAt: input.receivedAt,
          },
          signals: {
            ...recordFromSignals(opportunity.signals),
            lastReplyChannel: input.channel,
            lastReplyExternalId: input.externalMessageId,
            lastReplySourceUrl: input.sourceUrl,
          },
        })
        .where(and(
          eq(opportunities.companyId, input.companyId),
          eq(opportunities.id, opportunity.id),
          isNull(opportunities.deletedAt),
        ));

      const [activity] = await db
        .insert(activityLog)
        .values({
          companyId: input.companyId,
          actorType: "system",
          actorId: OPPORTUNITY_REPLY_ACTOR_ID,
          action: DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION,
          entityType: "opportunity_reply",
          entityId,
          details: {
            opportunityId: opportunity.id,
            issueId: opportunity.issueId,
            opportunityTitle: opportunity.title,
            channel: input.channel,
            receivedAt: input.receivedAt,
            senderName: input.senderName,
            sourceUrl: input.sourceUrl,
            replyPreview: input.replyPreview,
          },
          createdAt: receivedAt,
        })
        .returning({ id: activityLog.id });

      return {
        status: "recorded",
        companyId: input.companyId,
        opportunityId: opportunity.id,
        activityId: activity?.id ?? null,
        receivedAt: input.receivedAt,
      };
    },
  };
}
