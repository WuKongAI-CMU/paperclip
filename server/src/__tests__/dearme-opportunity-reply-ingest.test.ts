import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  companies,
  createDb,
  opportunities,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { dearmeWorkbenchService } from "../services/dearme-workbench.js";
import {
  DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION,
  dearMeOpportunityReplyIngestService,
} from "../services/dearme-opportunity-reply-ingest.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping DearMe opportunity reply ingest tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `OR${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

describeEmbeddedPostgres("DearMe opportunity reply ingest", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("dearme-opportunity-reply-");
    db = createDb(tempDb.connectionString);
  }, 30_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`));
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Beta",
      issuePrefix: issuePrefix(companyId),
      requireBoardApprovalForNewAgents: false,
    });
    return companyId;
  }

  async function seedOpportunity(companyId: string) {
    const [row] = await db
      .insert(opportunities)
      .values({
        companyId,
        state: "sent",
        kind: "partner",
        title: "Product founder podcast guest slot",
        contactEmail: "founder@example.com",
        contactHandle: "founder-host",
        notes: { research: "Relevant audience and useful timing." },
        signals: { source: "manual" },
        stateChangedAt: new Date("2026-05-15T12:00:00.000Z"),
        updatedAt: new Date("2026-05-15T12:00:00.000Z"),
      })
      .returning({ id: opportunities.id });
    return row.id;
  }

  it("marks a matched outbound opportunity as replied and records one inbound event", async () => {
    const companyId = await seedCompany();
    const opportunityId = await seedOpportunity(companyId);
    const service = dearMeOpportunityReplyIngestService(db);

    const result = await service.ingest({
      companyId,
      channel: "email",
      externalMessageId: "email-reply-1",
      contactEmail: "FOUNDER@example.com",
      senderName: "Podcast host",
      receivedAt: "2026-05-16T13:00:00.000Z",
      replyPreview: "Interested. Can you send two topic ideas for a founder-audience episode?",
    });

    expect(result).toMatchObject({
      status: "recorded",
      companyId,
      opportunityId,
      receivedAt: "2026-05-16T13:00:00.000Z",
    });

    const [updated] = await db
      .select({
        state: opportunities.state,
        notes: opportunities.notes,
        signals: opportunities.signals,
      })
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId));

    expect(updated.state).toBe("replied");
    expect(updated.notes).toMatchObject({ lastInboundAt: "2026-05-16T13:00:00.000Z" });
    expect(updated.signals).toMatchObject({
      lastReplyChannel: "email",
      lastReplyExternalId: "email-reply-1",
    });

    const activityRows = await db
      .select({
        action: activityLog.action,
        entityType: activityLog.entityType,
        details: activityLog.details,
      })
      .from(activityLog)
      .where(and(
        eq(activityLog.companyId, companyId),
        eq(activityLog.action, DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION),
      ));

    expect(activityRows).toHaveLength(1);
    expect(activityRows[0]).toMatchObject({
      action: DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION,
      entityType: "opportunity_reply",
    });
    expect(activityRows[0].details).toMatchObject({
      opportunityId,
      channel: "email",
      senderName: "Podcast host",
      replyPreview: "Interested. Can you send two topic ideas for a founder-audience episode?",
    });

    const duplicate = await service.ingest({
      companyId,
      channel: "email",
      externalMessageId: "email-reply-1",
      contactEmail: "founder@example.com",
      receivedAt: "2026-05-16T13:05:00.000Z",
      replyPreview: "Duplicate delivery.",
    });
    expect(duplicate.status).toBe("duplicate");

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLog)
      .where(and(
        eq(activityLog.companyId, companyId),
        eq(activityLog.action, DEARME_OPPORTUNITY_REPLY_RECEIVED_ACTION),
      ));
    expect(count).toBe(1);
  });

  it("surfaces replied opportunities as send-gated decisions in the workbench", async () => {
    const companyId = await seedCompany();
    await seedOpportunity(companyId);
    await dearMeOpportunityReplyIngestService(db).ingest({
      companyId,
      channel: "linkedin",
      externalMessageId: "li-reply-1",
      contactHandle: "founder-host",
      senderName: "Founder host",
      receivedAt: "2026-05-16T14:00:00.000Z",
      replyPreview: "Sounds useful. Send the short version and two dates.",
    });

    const workbench = await dearmeWorkbenchService(db).getWorkbench(companyId);
    const replyDecision = workbench.decisionsNeeded.find((decision) =>
      decision.id.startsWith("opportunity-reply:"));

    expect(replyDecision).toMatchObject({
      kind: "review_output",
      title: "Review reply from Founder host",
      riskGate: "send_email",
      status: "needed",
      outputKind: "opportunity_drafts",
      outputId: null,
      approvalId: null,
    });
    expect(replyDecision?.summary).toContain("Sounds useful");
    expect(workbench.batchDecisions.some((batch) => batch.riskGate === "send_email")).toBe(true);
  });

  it("does not record unmatched inbound replies", async () => {
    const companyId = await seedCompany();
    const result = await dearMeOpportunityReplyIngestService(db).ingest({
      companyId,
      channel: "email",
      externalMessageId: "missing-1",
      contactEmail: "unknown@example.com",
      receivedAt: "2026-05-16T15:00:00.000Z",
      replyPreview: "Checking in.",
    });

    expect(result.status).toBe("opportunity_not_found");
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLog)
      .where(eq(activityLog.companyId, companyId));
    expect(count).toBe(0);
  });
});
