import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  authUsers,
  channelConnections,
  companies,
  companyMemberships,
  createDb,
  dearmeVoiceProfiles,
  financeEvents,
  getEmbeddedPostgresTestSupport,
  opportunities,
  startEmbeddedPostgresTestDatabase,
} from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { dearmeGdprService } from "./dearme-gdpr.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres GDPR tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix() {
  return `D${randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

function expectNoSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("dm_sk_");
  expect(serialized).not.toContain("Bearer ");
  expect(serialized).not.toContain("sk_live_");
  expect(serialized).not.toContain("sk_test_");
  expect(serialized).not.toContain("sk-proj-");
  expect(serialized).not.toContain("sk-ant-");
  expect(serialized).not.toContain("resend_token=");
}

describeEmbeddedPostgres("dearmeGdprService", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-gdpr-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(financeEvents);
    await db.delete(channelConnections);
    await db.delete(opportunities);
    await db.delete(dearmeVoiceProfiles);
    await db.delete(companyMemberships);
    await db.delete(authUsers);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompanyData() {
    const companyId = randomUUID();
    const userId = `user-${randomUUID()}`;
    const now = new Date("2026-05-14T12:00:00.000Z");

    await db.insert(companies).values({
      id: companyId,
      name: "Peter Personal Brand",
      description: "Peter's private brand plan",
      issuePrefix: issuePrefix(),
      brandColor: "#123456",
    });
    await db.insert(authUsers).values({
      id: userId,
      name: "Peter",
      email: "peter@example.com",
      emailVerified: true,
      image: "https://example.com/peter.png",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(companyMemberships).values({
      companyId,
      principalType: "user",
      principalId: userId,
      status: "active",
      membershipRole: "owner",
    });
    await db.insert(dearmeVoiceProfiles).values({
      companyId,
      userId,
      scopeKey: `company:${companyId}:user:${userId}`,
      fingerprintId: "vf_peter",
      acceptedSamples: 2,
      profileSnapshot: { acceptedSamples: 2, tokenCounts: { crisp: 3 } },
    });
    await db.insert(opportunities).values({
      companyId,
      title: "Lenny podcast intro",
      contactHandle: "@lenny",
      contactEmail: "lenny@example.com",
      contactUrl: "https://example.com/lenny",
      fitReason: "Peter has a relevant founder story.",
      notes: { research: "Peter's personal notes", voiceCheckedDraft: "Hi Lenny" },
      signals: { source: "linkedin" },
    });
    await db.insert(channelConnections).values({
      companyId,
      userId,
      channel: "linkedin",
      externalAccountId: "urn:li:person:123",
      externalDisplayName: "Peter on LinkedIn",
      encryptedCredential: "dm_sk_secret Bearer linkedin-access-token sk_live_stripe",
      scopes: ["w_member_social"],
      metadata: {
        accessToken: "dm_sk_metadata",
        stripeSecret: "sk_test_metadata",
        providerProfileUrl: "https://linkedin.example/peter",
      },
      status: "active",
    });
    await db.insert(financeEvents).values({
      companyId,
      billingCode: "dearme_paid_beta_access",
      description: "DearMe paid beta access",
      eventKind: "credit_purchase",
      direction: "credit",
      biller: "dearme_paid_beta",
      provider: "stripe",
      amountCents: 25000,
      currency: "USD",
      estimated: false,
      externalInvoiceId: "pi_test",
      metadataJson: { stripeKey: "sk_live_receipt", authorization: "Bearer receipt-token" },
      occurredAt: now,
    });
    await db.insert(activityLog).values([
      {
        companyId,
        actorType: "user",
        actorId: userId,
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice",
        details: {
          kind: "voice_sample",
          body: "Peter's exact writing sample",
          sourceLabel: "LinkedIn",
          authorization: "Bearer activity-token",
        },
      },
      {
        companyId,
        actorType: "system",
        actorId: "system",
        action: "dearme.paid_beta_payment_recorded",
        entityType: "finance_event",
        entityId: "finance-event",
        details: { amountCents: 25000, note: "manual receipt" },
      },
    ]);

    return { companyId, userId };
  }

  it("exports the expected company data shape and redacts provider tokens", async () => {
    const { companyId } = await seedCompanyData();
    const exported = await dearmeGdprService(db).exportCompanyData(companyId);

    expect(exported.company).toMatchObject({ id: companyId, name: "Peter Personal Brand" });
    expect(exported.users).toHaveLength(1);
    expect(exported.voiceProfiles).toHaveLength(1);
    expect(exported.voiceSamples).toHaveLength(1);
    expect(exported.paidBetaReceipts).toHaveLength(1);
    expect(exported.opportunities).toHaveLength(1);
    expect(exported.channelConnections).toHaveLength(1);
    expect(exported.auditLog).toHaveLength(2);
    expect(exported.channelConnections[0]?.encryptedCredential).toBe("<redacted>");
    expectNoSecrets(exported);
  });

  it("scrubs PII, tombstones rows, and keeps redacted audit log rows", async () => {
    const { companyId, userId } = await seedCompanyData();
    const result = await dearmeGdprService(db).deleteCompanyData(companyId);

    expect(result.rowsAffected).toMatchObject({
      company: 1,
      users: 1,
      voiceProfiles: 1,
      voiceSamples: 1,
      opportunities: 1,
      channelConnections: 1,
      auditLog: 2,
    });

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, userId));
    const [profile] = await db.select().from(dearmeVoiceProfiles).where(eq(dearmeVoiceProfiles.companyId, companyId));
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.companyId, companyId));
    const [connection] = await db.select().from(channelConnections).where(eq(channelConnections.companyId, companyId));
    const auditRows = await db.select().from(activityLog).where(eq(activityLog.companyId, companyId));

    expect(company).toMatchObject({ name: "<deleted>", description: "<deleted>", status: "deleted" });
    expect(company?.deletedAt).toBeInstanceOf(Date);
    expect(user).toMatchObject({ name: "<deleted>", email: "<deleted>", image: null });
    expect(user?.deletedAt).toBeInstanceOf(Date);
    expect(profile).toMatchObject({ fingerprintId: "<deleted>", acceptedSamples: 0 });
    expect(profile?.deletedAt).toBeInstanceOf(Date);
    expect(opportunity).toMatchObject({
      title: "<deleted>",
      contactEmail: "<deleted>",
      fitReason: "<deleted>",
    });
    expect(opportunity?.deletedAt).toBeInstanceOf(Date);
    expect(connection).toMatchObject({
      externalAccountId: "<deleted>",
      externalDisplayName: "<deleted>",
      encryptedCredential: "<deleted>",
    });
    expect(connection?.deletedAt).toBeInstanceOf(Date);
    expect(auditRows).toHaveLength(2);
    expect(auditRows.every((row) => row.actorId === "<deleted>")).toBe(true);
    expect(JSON.stringify(auditRows)).not.toContain("Peter's exact writing sample");
    expect(JSON.stringify(auditRows)).toContain("gdprDeleted");
  });

  it("is idempotent when deletion runs twice", async () => {
    const { companyId } = await seedCompanyData();
    const service = dearmeGdprService(db);

    const first = await service.deleteCompanyData(companyId);
    const afterFirst = await service.exportCompanyData(companyId);
    const second = await service.deleteCompanyData(companyId);
    const afterSecond = await service.exportCompanyData(companyId);

    expect(second.rowsAffected).toEqual(first.rowsAffected);
    expect(afterSecond).toEqual(afterFirst);
  });

  it("returns an empty export for a non-existent company", async () => {
    const exported = await dearmeGdprService(db).exportCompanyData(randomUUID());

    expect(exported).toEqual({
      company: null,
      users: [],
      voiceProfiles: [],
      voiceSamples: [],
      paidBetaReceipts: [],
      opportunities: [],
      channelConnections: [],
      auditLog: [],
    });
  });
});
