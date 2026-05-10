import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  documents,
  issueComments,
  issueDocuments,
  issues,
  issueWorkProducts,
} from "@paperclipai/db";
import {
  ISSUE_CONTINUATION_SUMMARY_DOCUMENT_KEY,
  evaluateDearMeVoiceGate,
} from "@paperclipai/shared";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "../services/dearme-brand-blueprint-apply.js";
import { dearmeOutputHandoffService } from "../services/dearme-output-handoff.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe output handoff tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `OH${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

describeEmbeddedPostgres("DearMe output handoff service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-output-handoff-");
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

  async function seedAgent(companyId: string) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "DearMe Analyst",
      role: "growth_analyst",
      adapterType: "process",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    return agentId;
  }

  async function seedIssue(input: {
    companyId: string;
    title: string;
    identifier: string;
    originKind?: string;
    originFingerprint: string;
    status: string;
    assigneeAgentId?: string | null;
    updatedAt: Date;
    hiddenAt?: Date | null;
  }) {
    const issueId = randomUUID();
    await db.insert(issues).values({
      id: issueId,
      companyId: input.companyId,
      title: input.title,
      status: input.status,
      identifier: input.identifier,
      originKind: input.originKind ?? DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      originFingerprint: input.originFingerprint,
      assigneeAgentId: input.assigneeAgentId ?? null,
      hiddenAt: input.hiddenAt ?? null,
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
      latestRevisionNumber: 2,
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

  it("returns customer-visible DearMe outputs and strips system/provider internals", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const brandIssueId = await seedIssue({
      companyId,
      title: "DearMe: Review Brand OS for Peter",
      identifier: "DME-1",
      originFingerprint: "brand-os-review",
      status: "done",
      updatedAt: new Date("2026-05-07T14:00:00.000Z"),
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-2",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      updatedAt: new Date("2026-05-07T15:00:00.000Z"),
    });
    const opportunityIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft opportunity list",
      identifier: "DME-3",
      originFingerprint: "operation-draft_opportunity_list",
      status: "in_review",
      updatedAt: new Date("2026-05-07T15:20:00.000Z"),
    });
    const portfolioIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare portfolio update",
      identifier: "DME-4",
      originFingerprint: "operation-prepare_portfolio_update",
      status: "in_review",
      updatedAt: new Date("2026-05-07T15:30:00.000Z"),
    });
    const reportIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft weekly Dear me report",
      identifier: "DME-5",
      originFingerprint: "operation-schedule_weekly_report",
      status: "done",
      updatedAt: new Date("2026-05-07T15:40:00.000Z"),
    });
    await seedIssue({
      companyId,
      title: "DearMe Draft: Hidden old report",
      identifier: "DME-6",
      originFingerprint: "operation-schedule_weekly_report",
      status: "done",
      updatedAt: new Date("2026-05-07T13:00:00.000Z"),
      hiddenAt: new Date("2026-05-07T13:30:00.000Z"),
    });
    await seedIssue({
      companyId,
      title: "Manual customer issue",
      identifier: "DME-7",
      originKind: "manual",
      originFingerprint: "operation-draft_opportunity_list",
      status: "done",
      updatedAt: new Date("2026-05-07T12:00:00.000Z"),
    });

    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "brand-os",
      title: "Brand OS",
      body: [
        "# Brand OS",
        "## Positioning",
        "Practical AI operator for local-first products.",
        "## Goals",
        "Build visible proof.",
        "## Proof Points",
        "Shipped a local agent runtime.",
      ].join("\n\n"),
      updatedAt: new Date("2026-05-07T14:01:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "approval-gates",
      title: "Approval Gates",
      body: "Approval boundaries: no public claims without review.",
      updatedAt: new Date("2026-05-07T14:01:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "voice-profile",
      title: "Voice profile",
      body: "# Voice profile\n\n## Guidance\nShort, direct, evidence-first notes.\n## Boundary\nCheck voice before any public copy.",
      updatedAt: new Date("2026-05-07T14:02:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: ISSUE_CONTINUATION_SUMMARY_DOCUMENT_KEY,
      title: "Continuation summary",
      body: "Internal continuation state should not appear.",
      updatedAt: new Date("2026-05-07T14:03:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "starter-posts",
      title: "Starter posts",
      body: [
        "Channel: LinkedIn",
        "Audience: founders evaluating local AI workflows",
        "Hook: Your personal brand should show proof while you keep building.",
        "Draft body: A short proof-backed post about shipping local AI products.",
        "Proof used: shipped a local agent runtime",
        "Launch boundary: publish social posts",
      ].join("\n"),
      updatedAt: new Date("2026-05-07T15:01:00.000Z"),
    });
    const contentVoiceGate = evaluateDearMeVoiceGate({
      brand: {
        displayName: "Peter",
        positioning: "Practical AI operator for local-first products.",
        preferredChannels: ["linkedin"],
        goals: ["Build visible proof."],
        audiences: ["founders evaluating local AI workflows"],
        offers: [],
        proofPoints: ["shipped a local agent runtime"],
        voiceSamples: [
          "Short, direct, evidence-first notes.",
          "Show the receipt before asking for trust.",
        ],
        constraints: ["No public claims without review."],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
      artifact: {
        kind: "content_draft",
        channel: "linkedin",
        title: "Starter posts",
        text: "A short proof-backed post about shipping local AI products.",
        proofUsed: "shipped a local agent runtime",
      },
    });
    await attachDocument({
      companyId,
      issueId: opportunityIssueId,
      key: "opportunity-list",
      title: "Opportunity list",
      body: [
        "Target: host of a practical AI operators podcast",
        "Why relevant: their audience buys local-first AI workflow tools",
        "Relevance score: 8/10",
        "Outreach angle: offer a teardown of a real local-agent workflow",
        "Draft message: I can share concrete operator notes from a shipped local AI product.",
      ].join("\n"),
      updatedAt: new Date("2026-05-07T15:21:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: portfolioIssueId,
      key: "portfolio-update",
      title: "Portfolio update",
      body: [
        "Page section: proof cards",
        "Proof source: local-agent runtime launch notes",
        "Proposed copy: Built a local-first AI operating layer with approval gates.",
        "Deploy gate: public site update requires approval.",
      ].join("\n"),
      updatedAt: new Date("2026-05-07T15:31:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: reportIssueId,
      key: "dear-me-report",
      title: "Dear me report",
      body: [
        "Work Completed: refreshed positioning and drafted private outputs.",
        "Decisions Needed: approve the content batch and opportunity outreach.",
        "Next bets: turn proof cards into one portfolio update.",
        "Report reference: week of May 7.",
      ].join("\n"),
      updatedAt: new Date("2026-05-07T15:41:00.000Z"),
    });
    await db.insert(issueWorkProducts).values({
      id: randomUUID(),
      companyId,
      issueId: contentIssueId,
      type: "draft",
      provider: "codex-local",
      title: "Content draft batch",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: "Three private posts prepared for review.",
      metadata: {
        voiceGate: contentVoiceGate,
      },
      updatedAt: new Date("2026-05-07T15:05:00.000Z"),
    });
    await db.insert(issueComments).values({
      id: randomUUID(),
      companyId,
      issueId: contentIssueId,
      authorAgentId: agentId,
      body: "Prepared a private content batch with three concrete drafts.",
      createdAt: new Date("2026-05-07T15:10:00.000Z"),
      updatedAt: new Date("2026-05-07T15:10:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).listOutputs(companyId);

    expect(result.outputs.map((output) => output.kind)).toEqual([
      "brand_os",
      "voice_profile",
      "content_drafts",
      "opportunity_drafts",
      "portfolio_update",
      "weekly_report",
    ]);
    const brandOutput = result.outputs.find((output) => output.kind === "brand_os")!;
    const voiceOutput = result.outputs.find((output) => output.kind === "voice_profile")!;
    const contentOutput = result.outputs.find((output) => output.kind === "content_drafts")!;
    const opportunityOutput = result.outputs.find((output) => output.kind === "opportunity_drafts")!;
    const portfolioOutput = result.outputs.find((output) => output.kind === "portfolio_update")!;
    const reportOutput = result.outputs.find((output) => output.kind === "weekly_report")!;

    expect(brandOutput.status).toBe("complete");
    expect(brandOutput.documents.map((document) => document.key)).toEqual(["brand-os", "approval-gates"]);
    expect(brandOutput.documents[0]?.bodyPreview).toContain("Practical AI operator");
    expect(brandOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "positioning",
        label: "Positioning",
        value: "Practical AI operator for local first products.",
      }),
      expect.objectContaining({
        kind: "proof_used",
        value: "Shipped a local agent runtime.",
      }),
      expect.objectContaining({
        kind: "approval_gate",
        label: "Launch boundary",
        value: "no public claims without review.",
      }),
    ]));
    expect(brandOutput.sourceEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "voice_memory",
        label: "Voice & Memory",
        summary: "Practical AI operator for local first products.",
      }),
      expect.objectContaining({
        kind: "proof",
        label: "Proof used",
        summary: "Shipped a local agent runtime.",
      }),
      expect.objectContaining({
        kind: "private_reference",
        label: "Private references",
        summary: "2 private references used for this review.",
      }),
    ]));
    expect(voiceOutput.documents.map((document) => document.key)).toEqual(["voice-profile"]);
    expect(voiceOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "voice_guidance", value: expect.stringContaining("Short, direct") }),
    ]));
    expect(contentOutput.status).toBe("ready_for_review");
    expect(contentOutput.isReviewable).toBe(true);
    expect(contentOutput.latestUpdate?.bodyPreview).toContain("Prepared a private content batch");
    expect(contentOutput.reviewLoop).toEqual(expect.objectContaining({
      state: "needs_user_review",
      attemptCount: 0,
      maxAttempts: 3,
      isRetriable: true,
      lastAction: null,
    }));
    expect(contentOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "channel", value: "LinkedIn" }),
      expect.objectContaining({ kind: "hook", value: expect.stringContaining("personal brand") }),
      expect.objectContaining({ kind: "approval_gate", value: expect.stringContaining("publish social") }),
    ]));
    expect(contentOutput.sourceEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "voice_memory",
        label: "Voice & Memory",
        summary: "founders evaluating local AI workflows",
      }),
      expect.objectContaining({
        kind: "proof",
        label: "Proof used",
        summary: "shipped a local agent runtime",
      }),
      expect.objectContaining({
        kind: "approval_boundary",
        label: "Launch boundary",
        summary: "publish social posts",
      }),
      expect.objectContaining({
        kind: "private_reference",
        summary: "1 private reference, 1 prepared artifact, latest team note used for this review.",
      }),
    ]));
    expect(contentOutput.workProducts[0]).toEqual(
      expect.objectContaining({
        title: "Content draft batch",
        summary: "Three private posts prepared for review.",
        voiceGate: expect.objectContaining({
          status: "ready_for_review",
          approvalGate: "publish_social",
          score: 100,
        }),
      }),
    );
    expect(contentOutput.workProducts[0]?.voiceGate?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "proof_claim",
        status: "pass",
        evidence: ["shipped a local agent runtime"],
      }),
    ]));
    expect(contentOutput.workProducts[0]).not.toHaveProperty("provider");
    expect(opportunityOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "target", value: expect.stringContaining("podcast") }),
      expect.objectContaining({ kind: "outreach_angle", value: expect.stringContaining("teardown") }),
      expect.objectContaining({ kind: "draft_message", value: expect.stringContaining("operator notes") }),
    ]));
    expect(portfolioOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "page_section", value: "proof cards" }),
      expect.objectContaining({ kind: "proposed_copy", value: expect.stringContaining("approval gates") }),
      expect.objectContaining({ kind: "deploy_gate", value: expect.stringContaining("approval") }),
    ]));
    expect(reportOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "completed_work", value: expect.stringContaining("refreshed positioning") }),
      expect.objectContaining({ kind: "decisions_needed", value: expect.stringContaining("approve the content") }),
      expect.objectContaining({ kind: "next_bets", value: expect.stringContaining("proof cards") }),
    ]));
    expect(reportOutput.sourceEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "proof",
        label: "Proof used",
        summary: expect.stringContaining("refreshed positioning"),
      }),
      expect.objectContaining({
        kind: "approval_boundary",
        label: "Launch boundary",
        summary: expect.stringContaining("approve the content"),
      }),
    ]));
    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }

    const allIssueRows = await db.select().from(issues).where(eq(issues.companyId, companyId));
    expect(allIssueRows).toHaveLength(7);
  });

  it("prefers the active output issue when a fingerprint has newer cancelled history", async () => {
    const companyId = await seedCompany();
    const staleIssueId = await seedIssue({
      companyId,
      title: "DearMe: Old cancelled Brand OS",
      identifier: "DME-OLD",
      originFingerprint: "brand-os-review",
      status: "cancelled",
      updatedAt: new Date("2026-05-09T08:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: staleIssueId,
      key: "brand-os",
      title: "Old Brand OS",
      body: "Positioning: Old cancelled proof.",
      updatedAt: new Date("2026-05-07T08:01:00.000Z"),
    });
    const freshIssueId = await seedIssue({
      companyId,
      title: "DearMe: Current first-cycle Brand OS",
      identifier: "DME-NEW",
      originFingerprint: "brand-os-review",
      status: "in_review",
      updatedAt: new Date("2026-05-08T08:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: freshIssueId,
      key: "brand-os",
      title: "Current Brand OS",
      body: "Positioning: Current private proof ready for review.",
      updatedAt: new Date("2026-05-08T08:01:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const brandOutput = result.outputs.find((output) => output.kind === "brand_os")!;

    expect(brandOutput.issueIdentifier).toBe("DME-NEW");
    expect(brandOutput.status).toBe("ready_for_review");
    expect(brandOutput.documents[0]?.bodyPreview).toContain("Current private proof");
    expect(JSON.stringify(brandOutput)).not.toContain("Old cancelled proof");
  });

  it("persists a shared private cycle packet for content drafts and the Dear me report", async () => {
    const companyId = await seedCompany();
    const brandIssueId = await seedIssue({
      companyId,
      title: "DearMe: Review Brand OS for Peter",
      identifier: "DME-20",
      originFingerprint: "brand-os-review",
      status: "in_review",
      updatedAt: new Date("2026-05-09T14:00:00.000Z"),
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-21",
      originFingerprint: "operation-draft_content_batch",
      status: "todo",
      updatedAt: new Date("2026-05-09T14:10:00.000Z"),
    });
    const opportunityIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft opportunity list",
      identifier: "DME-22",
      originFingerprint: "operation-draft_opportunity_list",
      status: "in_review",
      updatedAt: new Date("2026-05-09T14:20:00.000Z"),
    });
    const portfolioIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare portfolio update",
      identifier: "DME-23",
      originFingerprint: "operation-prepare_portfolio_update",
      status: "in_review",
      updatedAt: new Date("2026-05-09T14:30:00.000Z"),
    });
    const reportIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare report",
      identifier: "DME-24",
      originFingerprint: "operation-schedule_weekly_report",
      status: "todo",
      updatedAt: new Date("2026-05-09T14:40:00.000Z"),
    });

    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "brand-os",
      title: "Brand OS",
      body: [
        "Positioning: practical AI operator for local-first builders",
        "Proof Points: shipped a local agent runtime with approval gates",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T14:01:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "starter-posts",
      title: "Starter posts",
      body: [
        "Channel: LinkedIn",
        "Audience: founders evaluating local AI workflows",
        "Hook: Your personal brand should show proof while you keep building.",
        "Draft body: A short proof-backed post about shipping local AI products.",
        "Proof used: shipped a local agent runtime",
        "Launch boundary: publish social posts only after approval",
      ].join("\n"),
      updatedAt: new Date("2026-05-09T14:11:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: opportunityIssueId,
      key: "opportunity-list",
      title: "Opportunity list",
      body: "Target: founders evaluating local AI workflows\nOutreach angle: offer a teardown of a real workflow",
      updatedAt: new Date("2026-05-09T14:21:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: portfolioIssueId,
      key: "portfolio-update",
      title: "Portfolio update",
      body: "Proof source: local-agent runtime launch notes\nProposed copy: Built a local-first AI operating layer.",
      updatedAt: new Date("2026-05-09T14:31:00.000Z"),
    });

    const service = dearmeOutputHandoffService(db);
    const result = await service.prepareCycleOutputPacket(companyId, {
      actorType: "user",
      actorId: "user-1",
      agentId: null,
      runId: "not-a-uuid-run",
    });

    const contentOutput = result.outputs.find((output) => output.kind === "content_drafts")!;
    const reportOutput = result.outputs.find((output) => output.kind === "weekly_report")!;

    expect(contentOutput.status).toBe("ready_for_review");
    expect(reportOutput.status).toBe("ready_for_review");
    expect(contentOutput.documents.map((document) => document.key)).toEqual(["content-drafts", "starter-posts"]);
    expect(contentOutput.documents[0]?.bodyPreview).toContain("Voice fit score");
    expect(contentOutput.documents[0]?.bodyPreview).toContain("Cycle packet");
    expect(contentOutput.workProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "Cycle content packet",
        summary: expect.stringContaining("voice fit"),
        reviewState: "pending",
      }),
    ]));
    expect(reportOutput.documents[0]?.key).toBe("dear-me-report");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Completed work");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Decisions needed");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("No outbound spend");
    expect(reportOutput.workProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "Dear me report packet",
        summary: expect.stringContaining("same cycle packet"),
      }),
    ]));

    const readyIssues = await db
      .select({ id: issues.id, status: issues.status, completedAt: issues.completedAt, cancelledAt: issues.cancelledAt })
      .from(issues)
      .where(inArray(issues.id, [contentIssueId, reportIssueId]));
    expect(readyIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: contentIssueId, status: "in_review", completedAt: null, cancelledAt: null }),
      expect.objectContaining({ id: reportIssueId, status: "in_review", completedAt: null, cancelledAt: null }),
    ]));

    await service.prepareCycleOutputPacket(companyId, {
      actorType: "user",
      actorId: "user-1",
      agentId: null,
      runId: null,
    });
    const packetWorkProducts = await db
      .select({ id: issueWorkProducts.id })
      .from(issueWorkProducts)
      .where(and(
        eq(issueWorkProducts.companyId, companyId),
        eq(issueWorkProducts.provider, "dearme-cycle-output"),
      ));
    expect(packetWorkProducts).toHaveLength(2);

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("records an output approval on the existing issue and prepared work", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-8",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-07T16:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId,
      key: "starter-posts",
      title: "Starter posts",
      body: "Draft body: Three proof-backed starter posts.\nLaunch boundary: publish social posts",
      updatedAt: new Date("2026-05-07T16:01:00.000Z"),
    });
    const workProductId = randomUUID();
    await db.insert(issueWorkProducts).values({
      id: workProductId,
      companyId,
      issueId,
      type: "draft",
      provider: "codex-local",
      title: "Content draft batch",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: "Three private posts prepared for review.",
      updatedAt: new Date("2026-05-07T16:02:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:content_drafts`,
      { action: "approve", decisionNote: "This sounds like me." },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );

    expect(result.status).toBe("recorded");
    expect(result.action).toBe("approve");
    expect(result.output.status).toBe("complete");
    expect(result.output.reviewLoop).toEqual(expect.objectContaining({
      state: "approved",
      attemptCount: 0,
      maxAttempts: 3,
      isRetriable: false,
      lastAction: "approve",
      lastDecisionNotePreview: "This sounds like me.",
    }));
    expect(result.wakeIssue).toBeNull();
    expect(result.comment.bodyPreview).toContain("approved");

    const [issueRow] = await db
      .select({ status: issues.status, completedAt: issues.completedAt })
      .from(issues)
      .where(eq(issues.id, issueId));
    expect(issueRow?.status).toBe("done");
    expect(issueRow?.completedAt).toBeInstanceOf(Date);

    const [workProductRow] = await db
      .select({ reviewState: issueWorkProducts.reviewState })
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.id, workProductId));
    expect(workProductRow?.reviewState).toBe("approved");

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("queues regeneration on the existing assignee without exposing wake internals", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft weekly Dear me report",
      identifier: "DME-9",
      originFingerprint: "operation-schedule_weekly_report",
      status: "in_review",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-07T17:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId,
      key: "dear-me-report",
      title: "Dear me report",
      body: "Completed work: prepared the first report.\nNext bets: improve proof cards.",
      updatedAt: new Date("2026-05-07T17:01:00.000Z"),
    });
    const workProductId = randomUUID();
    await db.insert(issueWorkProducts).values({
      id: workProductId,
      companyId,
      issueId,
      type: "draft",
      provider: "codex-local",
      title: "Weekly Dear me report",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: "Private weekly report prepared for review.",
      updatedAt: new Date("2026-05-07T17:02:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:weekly_report`,
      { action: "regenerate", decisionNote: null },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );

    expect(result.status).toBe("queued");
    expect(result.action).toBe("regenerate");
    expect(result.output.reviewLoop).toEqual(expect.objectContaining({
      state: "regeneration_requested",
      attemptCount: 1,
      maxAttempts: 3,
      isRetriable: true,
      lastAction: "regenerate",
      lastDecisionNotePreview: "Please prepare a new version for review.",
    }));
    expect(result.output.reviewLoop.lastDecisionAt).toEqual(expect.any(String));
    expect(result.output.reviewLoop.nextStep).toContain("another version");
    expect(result.wakeIssue).toEqual({ id: issueId, assigneeAgentId: agentId, status: "todo" });
    expect(result.comment.bodyPreview).toContain("regenerate");

    const [issueRow] = await db
      .select({ status: issues.status, completedAt: issues.completedAt })
      .from(issues)
      .where(eq(issues.id, issueId));
    expect(issueRow?.status).toBe("todo");
    expect(issueRow?.completedAt).toBeNull();

    const [workProductRow] = await db
      .select({ reviewState: issueWorkProducts.reviewState })
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.id, workProductId));
    expect(workProductRow?.reviewState).toBe("changes_requested");

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("keeps user feedback attached as a private handoff for the next draft", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare content batch",
      identifier: "DME-12",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-07T18:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId,
      key: "content-drafts",
      title: "Content drafts",
      body: "Hook: From messy work to public proof.\nDraft body: Here is the first private draft.",
      updatedAt: new Date("2026-05-07T18:01:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:content_drafts`,
      { action: "request_changes", decisionNote: "Make the proof more concrete and less generic." },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );

    expect(result.status).toBe("queued");
    expect(result.output.reviewLoop).toEqual(expect.objectContaining({
      state: "revision_requested",
      attemptCount: 1,
      lastAction: "request_changes",
      lastDecisionNotePreview: "Make the proof more concrete and less generic.",
      reviewHandoff: expect.objectContaining({
        action: "request_changes",
        title: "Change request captured",
        userDirection: "Make the proof more concrete and less generic.",
        nextDraftDirection: expect.stringContaining("Revise"),
      }),
    }));
    expect(result.output.reviewLoop.reviewHandoff?.summary).toContain("next private revision");
    expect(result.wakeIssue).toEqual({ id: issueId, assigneeAgentId: agentId, status: "todo" });

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });
});
