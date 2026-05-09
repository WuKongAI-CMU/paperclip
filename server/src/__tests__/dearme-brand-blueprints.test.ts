import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { activityLog, companies, createDb } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { dearmeBrandBlueprintService } from "../services/dearme-brand-blueprints.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe brand blueprint tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `BP${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

describeEmbeddedPostgres("DearMe brand blueprint service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-brand-blueprints-");
    db = createDb(tempDb.connectionString);
  }, 30_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`));
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany(name = "DearMe Beta") {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name,
      issuePrefix: issuePrefix(companyId),
      requireBoardApprovalForNewAgents: false,
    });
    return companyId;
  }

  it("uses saved Voice & Memory context in the first-cycle preview", async () => {
    const companyId = await seedCompany();
    const otherCompanyId = await seedCompany("Other Brand");

    await db.insert(activityLog).values([
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice-1",
        details: {
          kind: "voice_sample",
          title: "Founder note",
          body: "I write in short, evidence-first notes with direct asks and no vague hype.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-08T10:00:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice-2",
        details: {
          kind: "voice_sample",
          title: "Launch note",
          body: "I prefer concrete product evidence, precise tradeoffs, and one clear next decision.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-08T10:01:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-proof-1",
        details: {
          kind: "proof_point",
          title: "Built proof",
          body: "Shipped a local AI workbench that turns private work logs into reviewable product output.",
          sourceLabel: "Build log",
        },
        createdAt: new Date("2026-05-08T10:02:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-audience-1",
        details: {
          kind: "audience",
          title: "Audience",
          body: "solo founders who need their work to become visible proof",
          sourceLabel: "Onboarding",
        },
        createdAt: new Date("2026-05-08T10:03:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-goal-1",
        details: {
          kind: "goal",
          title: "Goal",
          body: "turn shipped work into paid beta conversations",
          sourceLabel: "Onboarding",
        },
        createdAt: new Date("2026-05-08T10:04:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-offer-1",
        details: {
          kind: "offer",
          title: "Offer",
          body: "a paid beta personal brand growth cycle",
          sourceLabel: "Onboarding",
        },
        createdAt: new Date("2026-05-08T10:05:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "system",
        actorId: "dearme",
        action: "dearme.memory_ignored",
        entityType: "dearme_memory",
        entityId: "memory-ignored-action",
        details: {
          kind: "proof_point",
          body: "This ignored event must not change the first cycle.",
        },
        createdAt: new Date("2026-05-08T10:06:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId: otherCompanyId,
        actorType: "user",
        actorId: "user-2",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-other-company",
        details: {
          kind: "proof_point",
          body: "This other company's memory must not leak into the preview.",
        },
        createdAt: new Date("2026-05-08T10:07:00.000Z"),
      },
    ]);

    const result = await dearmeBrandBlueprintService(db).previewFirstCycle(companyId, {
      brand: {
        displayName: "Peter",
        positioning: "Build local-first AI products with public proof.",
        goals: [],
        audiences: [],
        proofPoints: [],
        offers: [],
        voiceSamples: [],
        preferredChannels: ["linkedin"],
        constraints: [],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
    });

    expect(result.voiceProfile.status).toBe("ready_for_gate");
    expect(result.voiceProfile.sampleCount).toBe(2);
    expect(result.starterPosts[0]?.proofUsed).toBe(
      "Shipped a local AI workbench that turns private work logs into reviewable product output.",
    );
    expect(result.opportunityLead.target).toBe("solo founders who need their work to become visible proof");
    expect(result.opportunityLead.outreachAngle).toContain("a paid beta personal brand growth cycle");
    expect(result.voiceGate.status).not.toBe("blocked_before_public");
    expect(result.warnings).not.toContain("Voice profile needs at least two samples before tone should be trusted.");
    expect(result.warnings).not.toContain("No proof points were supplied; the first cycle should collect proof before public claims.");
    expect(JSON.stringify(result)).not.toContain("This other company's memory");
    expect(JSON.stringify(result)).not.toContain("ignored event");
  });
});
