import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  companies,
  createDb,
  documents,
  issueDocuments,
  issues,
  issueWorkProducts,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "../services/dearme-brand-blueprint-apply.js";
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

  async function seedDearMeIssue(input: {
    companyId: string;
    title: string;
    identifier: string;
    originFingerprint: string;
    status: string;
    updatedAt: Date;
  }) {
    const issueId = randomUUID();
    await db.insert(issues).values({
      id: issueId,
      companyId: input.companyId,
      title: input.title,
      identifier: input.identifier,
      originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      originFingerprint: input.originFingerprint,
      status: input.status,
      updatedAt: input.updatedAt,
    });
    return issueId;
  }

  async function attachDocument(input: {
    companyId: string;
    issueId: string;
    key: string;
    title: string;
    body: string;
    updatedAt: Date;
  }) {
    const documentId = randomUUID();
    await db.insert(documents).values({
      id: documentId,
      companyId: input.companyId,
      title: input.title,
      format: "markdown",
      latestBody: input.body,
      latestRevisionNumber: 1,
      updatedAt: input.updatedAt,
    });
    await db.insert(issueDocuments).values({
      companyId: input.companyId,
      issueId: input.issueId,
      documentId,
      key: input.key,
      updatedAt: input.updatedAt,
    });
    return documentId;
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
      handle: "Peter Studio",
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
    expect(result.opportunityShortlist).toHaveLength(5);
    expect(result.opportunityShortlist[0]?.target).toBe("solo founders who need their work to become visible proof");
    expect(result.opportunityShortlist.map((lead) => lead.relevanceScore)).toEqual([9, 8, 7, 7, 8]);
    expect(result.opportunityShortlist.every((lead) => lead.contactEvidence.sourceSignal.length > 0)).toBe(true);
    expect(result.opportunityShortlist.filter((lead) => lead.contactEvidence.status === "verified")).toHaveLength(0);
    expect(result.opportunityShortlist.filter((lead) =>
      Boolean(lead.contactEvidence.contactEmail || lead.contactEvidence.contactHandle || lead.contactEvidence.contactUrl),
    )).toHaveLength(4);
    expect(result.opportunityShortlist.every((lead) =>
      lead.contactEvidence.status !== "verified" ||
      Boolean(lead.contactEvidence.contactEmail || lead.contactEvidence.contactHandle || lead.contactEvidence.contactUrl),
    )).toBe(true);
    expect(result.opportunityShortlist[4]?.target).toBe("Trusted Operator Intro List");
    expect(result.voiceGate.status).not.toBe("blocked_before_public");
    expect(result.warnings).not.toContain("Voice profile needs at least two samples before tone should be trusted.");
    expect(result.warnings).not.toContain("No proof points were supplied; the first cycle should collect proof before public claims.");
    expect(JSON.stringify(result)).not.toContain("This other company's memory");
    expect(JSON.stringify(result)).not.toContain("ignored event");
  });

  it("hydrates first-cycle proof sequence from prepared worker outputs", async () => {
    const companyId = await seedCompany();
    const brandIssueId = await seedDearMeIssue({
      companyId,
      title: "DearMe: Review Brand OS for Peter",
      identifier: "DME-1",
      originFingerprint: "brand-os-review",
      status: "done",
      updatedAt: new Date("2026-05-09T10:00:00.000Z"),
    });
    const contentIssueId = await seedDearMeIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-2",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      updatedAt: new Date("2026-05-09T10:10:00.000Z"),
    });
    const opportunityIssueId = await seedDearMeIssue({
      companyId,
      title: "DearMe Draft: Draft opportunity list",
      identifier: "DME-3",
      originFingerprint: "operation-draft_opportunity_list",
      status: "in_review",
      updatedAt: new Date("2026-05-09T10:20:00.000Z"),
    });
    const portfolioIssueId = await seedDearMeIssue({
      companyId,
      title: "DearMe Draft: Prepare portfolio update",
      identifier: "DME-4",
      originFingerprint: "operation-prepare_portfolio_update",
      status: "in_review",
      updatedAt: new Date("2026-05-09T10:30:00.000Z"),
    });
    const reportIssueId = await seedDearMeIssue({
      companyId,
      title: "DearMe Draft: Prepare report",
      identifier: "DME-5",
      originFingerprint: "operation-schedule_weekly_report",
      status: "done",
      updatedAt: new Date("2026-05-09T10:40:00.000Z"),
    });

    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "brand-os",
      title: "Brand OS",
      body: [
        "Positioning: practical AI operator for local-first builders",
        "Proof Points: shipped a local agent runtime with approval gates",
        "Approval boundaries: no public claims without review.",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T10:01:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "voice-profile",
      title: "Voice profile",
      body: "Guidance: short, direct, evidence-first notes before any public copy.",
      updatedAt: new Date("2026-05-09T10:02:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "starter-posts",
      title: "Starter posts",
      body: [
        "Audience: founders evaluating local AI workflows",
        "Hook: Your personal brand should show proof while you keep building.",
        "Proof used: shipped a local agent runtime",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T10:11:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: opportunityIssueId,
      key: "opportunity-list",
      title: "Opportunity list",
      body: [
        "Target: practical AI operators podcast host",
        "Outreach angle: offer a teardown of a real local-agent workflow",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T10:21:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: portfolioIssueId,
      key: "portfolio-update",
      title: "Portfolio update",
      body: [
        "Proof source: local-agent runtime launch notes",
        "Proposed copy: Built a local-first AI operating layer with approval gates.",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T10:31:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: reportIssueId,
      key: "dear-me-report",
      title: "Dear me report",
      body: "Next bets: turn proof cards into one private site update.",
      updatedAt: new Date("2026-05-09T10:41:00.000Z"),
    });
    await db.insert(issueWorkProducts).values({
      id: randomUUID(),
      companyId,
      issueId: contentIssueId,
      type: "draft",
      provider: "dearme-local",
      title: "Starter content draft batch",
      status: "ready",
      reviewState: "pending",
      summary: "Five private starter posts prepared for review.",
      updatedAt: new Date("2026-05-09T10:12:00.000Z"),
    });

    const result = await dearmeBrandBlueprintService(db).previewFirstCycle(companyId, {
      brand: {
        displayName: "Peter",
        positioning: "Build local-first AI products with public proof.",
        goals: ["turn shipped work into paid beta conversations"],
        audiences: ["founders evaluating local AI workflows"],
        proofPoints: ["manual proof should be replaced by prepared output"],
        offers: ["a paid beta personal brand growth cycle"],
        voiceSamples: ["I write in short, concrete notes with proof first."],
        preferredChannels: ["linkedin"],
        constraints: [],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
    });

    expect(result.proofSequence.map((step) => step.window)).toEqual(["0-30s", "60-120s", "3-5min"]);
    expect(result.proofSequence[0]?.preparedArtifact).toBe("Brand OS dossier + Voice profile");
    expect(result.proofSequence[0]?.sourceLabel).toBe("Prepared from private Brand OS work and voice work");
    expect(result.proofSequence[0]?.summary).toContain("Identity Researcher turned the private Brand OS");
    expect(result.proofSequence[0]?.summary).toContain("Voice Editor attached voice guidance");
    expect(result.proofSequence[1]?.preparedArtifact).toBe("Starter content drafts + Opportunity shortlist");
    expect(result.proofSequence[1]?.sourceLabel).toBe(
      "Prepared from private content drafts and opportunity work",
    );
    expect(result.proofSequence[1]?.summary).toContain("Audience Mapper found the first lane");
    expect(result.proofSequence[1]?.summary).toContain("Opportunity Scout staged the first private angle");
    expect(result.proofSequence[2]?.preparedArtifact).toBe("Private site proof draft + Dear me report note");
    expect(result.proofSequence[2]?.sourceLabel).toBe("Prepared from private site proof and Dear me report");
    expect(result.proofSequence[2]?.summary).toContain("Brand Site Builder staged private site copy");
    expect(result.proofSequence[2]?.summary).toContain("turn proof cards into one private site update");
    expect(result.sitePreview.handle).toBe("peter-studio");
    expect(result.sitePreview.route).toBe("dearme.app/peter-studio");
    expect(JSON.stringify(result.proofSequence)).not.toContain("worker output");
  });

  it("falls back to a safe private site preview handle when the supplied handle is unusable", async () => {
    const companyId = await seedCompany();

    const result = await dearmeBrandBlueprintService(db).previewFirstCycle(companyId, {
      handle: "!!!",
      brand: {
        displayName: "Peter Studio",
        positioning: "Build local-first AI products with public proof.",
        goals: ["turn shipped work into paid beta conversations"],
        audiences: ["founders evaluating local AI workflows"],
        proofPoints: ["manual proof should be replaced by prepared output"],
        offers: ["a paid beta personal brand growth cycle"],
        voiceSamples: ["I write in short, concrete notes with proof first."],
        preferredChannels: ["linkedin"],
        constraints: [],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
    });

    expect(result.sitePreview.handle).toBe("peter-studio");
    expect(result.sitePreview.route).toBe("dearme.app/peter-studio");
  });

  it("prepares first-cycle proof outputs through the existing output handoff path", async () => {
    const companyId = await seedCompany();
    const service = dearmeBrandBlueprintService(db);
    const firstCycleInput = {
      brand: {
        displayName: "Peter",
        positioning: "Build local-first AI products with public proof.",
        goals: ["turn shipped work into paid beta conversations"],
        audiences: ["founders evaluating local AI workflows"],
        proofPoints: ["shipped a local agent runtime with approval gates"],
        offers: ["a paid beta personal brand growth cycle"],
        voiceSamples: ["I write in short, concrete notes with proof first."],
        preferredChannels: ["linkedin"],
        constraints: [],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
    };

    const result = await service.prepareFirstCycleProofOutputs(companyId, firstCycleInput, {
      actorType: "user",
      actorId: "user-1",
      agentId: null,
      runId: "run-first-cycle-1",
    });

    expect(result.proofSequence[0]?.preparedArtifact).toBe("Brand OS dossier + Voice profile");
    expect(result.proofSequence[0]?.sourceLabel).toBe("Prepared from private Brand OS work and voice work");
    expect(result.proofSequence[1]?.preparedArtifact).toBe("Starter content drafts + Opportunity shortlist");
    expect(result.proofSequence[1]?.sourceLabel).toBe(
      "Prepared from private content drafts and opportunity work",
    );
    expect(result.proofSequence[2]?.preparedArtifact).toBe("Private site proof draft + Dear me report note");
    expect(result.proofSequence[2]?.sourceLabel).toBe("Prepared from private site proof and Dear me report");

    const outputIssues = await db
      .select({
        id: issues.id,
        originFingerprint: issues.originFingerprint,
        originKind: issues.originKind,
        status: issues.status,
      })
      .from(issues)
      .where(and(
        eq(issues.companyId, companyId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
      ));
    expect(outputIssues.map((issue) => issue.originFingerprint).sort()).toEqual([
      "brand-os-review",
      "operation-draft_content_batch",
      "operation-draft_opportunity_list",
      "operation-prepare_portfolio_update",
      "operation-schedule_weekly_report",
    ]);
    expect(outputIssues.every((issue) => issue.status === "in_review")).toBe(true);

    const outputIssueIds = outputIssues.map((issue) => issue.id);
    const outputDocuments = await db
      .select({ key: issueDocuments.key })
      .from(issueDocuments)
      .where(inArray(issueDocuments.issueId, outputIssueIds));
    expect(outputDocuments.map((document) => document.key).sort()).toEqual([
      "approval-gates",
      "brand-os",
      "content-drafts",
      "dear-me-report",
      "opportunity-list",
      "portfolio-update",
      "starter-posts",
      "voice-profile",
    ]);

    await service.prepareFirstCycleProofOutputs(companyId, firstCycleInput, {
      actorType: "user",
      actorId: "user-1",
      agentId: null,
      runId: "run-first-cycle-2",
    });
    const issueCountAfterRetry = await db
      .select({ id: issues.id })
      .from(issues)
      .where(and(
        eq(issues.companyId, companyId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
      ));
    expect(issueCountAfterRetry).toHaveLength(5);
    const packetWorkProductsAfterRetry = await db
      .select({ id: issueWorkProducts.id })
      .from(issueWorkProducts)
      .where(and(
        eq(issueWorkProducts.companyId, companyId),
        eq(issueWorkProducts.provider, "dearme-cycle-output"),
      ));
    expect(packetWorkProductsAfterRetry).toHaveLength(2);

    await db
      .update(issues)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(inArray(issues.id, outputIssueIds));

    const restoredResult = await service.prepareFirstCycleProofOutputs(companyId, firstCycleInput, {
      actorType: "user",
      actorId: "user-1",
      agentId: null,
      runId: "run-first-cycle-3",
    });

    expect(restoredResult.proofSequence[0]?.sourceLabel).toBe(
      "Prepared from private Brand OS work and voice work",
    );
    const restoredOutputIssues = await db
      .select({ id: issues.id, status: issues.status, cancelledAt: issues.cancelledAt })
      .from(issues)
      .where(and(
        eq(issues.companyId, companyId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
      ));
    expect(restoredOutputIssues).toHaveLength(5);
    expect(restoredOutputIssues.every((issue) => issue.status === "in_review")).toBe(true);
    expect(restoredOutputIssues.every((issue) => issue.cancelledAt === null)).toBe(true);
  });
});
