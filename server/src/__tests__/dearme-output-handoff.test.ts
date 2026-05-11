import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  activityLog,
  approvals,
  companies,
  createDb,
  documents,
  issueApprovals,
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
import {
  buildDearMeOutputRegenerationBrief,
  dearmeOutputHandoffService,
  parseDearMeOutputReviewDecisionComment,
} from "../services/dearme-output-handoff.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe output handoff tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describe("DearMe output review decision parsing", () => {
  it("treats silence default score receipts as private approvals", () => {
    const decision = parseDearMeOutputReviewDecisionComment({
      body: [
        "DearMe decision: kept this private work moving after no response.",
        "No response came in, so DearMe kept this private work moving with a default review score of 7/10. You can still revise the direction later.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-08T09:03:00.000Z"),
    });

    expect(decision).toEqual({
      action: "approve",
      createdAt: new Date("2026-05-08T09:03:00.000Z"),
      defaultApprovalScore: 7,
      defaultedBySilence: true,
      notePreview: expect.stringContaining("default review score of 7/10"),
    });
  });

  it("keeps regeneration briefs useful while translating hidden process language", () => {
    const brief = buildDearMeOutputRegenerationBrief({
      artifactTitle: "Content drafts",
      decision: {
        action: "request_changes",
        createdAt: new Date("2026-05-08T09:10:00.000Z"),
        notePreview:
          "Remove the OpenClaw gateway API key, credential, worker queue, run id, and raw control plane language.",
        defaultApprovalScore: null,
        defaultedBySilence: false,
      },
      previousDraft: {
        title: "Paperclip provider draft",
        summary: "Codex runtime model provider note with a fingerprint.",
        bodyPreview: "DearMe decision issue comment exposed setup_payload and work product details.",
      },
    });

    expect(brief).toContain("team access");
    expect(brief).toContain("connection details");
    expect(brief).toContain("private operations");
    expect(brief).not.toMatch(
      /\b(openclaw|gateway|api key|credential|worker|queue|run id|raw control plane|paperclip|provider|codex|runtime|model|fingerprint|setup_payload|work product)\b/i,
    );
  });
});

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

  it("persists a voice-gated content packet as private review work", async () => {
    const companyId = await seedCompany();
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-0",
      originFingerprint: "operation-draft_content_batch",
      status: "in_progress",
      updatedAt: new Date("2026-05-07T13:00:00.000Z"),
    });
    const voiceGate = evaluateDearMeVoiceGate({
      brand: {
        displayName: "Peter",
        positioning: "Practical AI operator for local-first products.",
        preferredChannels: ["x"],
        goals: ["Build visible proof."],
        audiences: ["founders evaluating local-first workflows"],
        offers: [],
        proofPoints: ["shipped a local-first product launch"],
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
        channel: "x",
        title: "Proof-backed post",
        text: "A short proof-backed post about turning private work into public receipts.",
        proofUsed: "shipped a local-first product launch",
      },
    });

    const product = await dearmeOutputHandoffService(db).persistContentDraftPacket(
      companyId,
      issueId,
      {
        packetId: "cycle-2026-05-07-content",
        title: "Proof-backed content drafts",
        summary: "One private post is ready for review from this cycle's proof.",
        voiceFingerprintId: "vf_content_packet",
        cycleEvidence: [
          {
            label: "Proof",
            source: "proof",
            summary: "The launch note showed concrete receipts from the latest private work.",
          },
          {
            label: "Voice",
            source: "voice_profile",
            summary: "Use short, direct, evidence-first language.",
          },
        ],
        drafts: [
          {
            id: "proof-post",
            title: "Proof-backed post",
            channel: "x",
            audience: "Founders evaluating local-first workflows",
            hook: "Your personal brand should show proof while you keep building.",
            body: "A short proof-backed post about turning private work into public receipts.",
            proofUsed: "shipped a local-first product launch",
            voiceGate,
            launchBoundary: "publish social posts",
          },
        ],
      },
    );

    expect(product).toEqual(expect.objectContaining({
      type: "artifact",
      title: "Proof-backed content drafts",
      status: "ready_for_review",
      reviewState: "needs_board_review",
      summary: expect.stringContaining("Draft body: A short proof-backed post"),
      voiceGate: expect.objectContaining({
        status: "ready_for_review",
        score: 100,
        approvalGate: "publish_social",
      }),
    }));

    const [issueRow] = await db
      .select({ status: issues.status })
      .from(issues)
      .where(eq(issues.id, issueId));
    expect(issueRow?.status).toBe("in_review");

    const [workProductRow] = await db
      .select({
        provider: issueWorkProducts.provider,
        externalId: issueWorkProducts.externalId,
        metadata: issueWorkProducts.metadata,
      })
      .from(issueWorkProducts)
      .where(eq(issueWorkProducts.issueId, issueId));
    expect(workProductRow?.provider).toBe("dearme");
    expect(workProductRow?.externalId).toBe("content-drafts:cycle-2026-05-07-content");
    expect(workProductRow?.metadata).toEqual(expect.objectContaining({
      voiceGate: expect.objectContaining({ approvalGate: "publish_social" }),
      dearme: expect.objectContaining({
        outputKind: "content_drafts",
        draftCount: 1,
        launchHandoff: expect.objectContaining({
          toolName: "post_x",
          channel: "x",
          gate: "publish",
          riskGate: "publish_social",
          voiceGateArtifactKind: "x-tweet",
          voiceGateText: "A short proof-backed post about turning private work into public receipts.",
          voiceFingerprintId: "vf_content_packet",
          payload: {
            text: "A short proof-backed post about turning private work into public receipts.",
          },
          publishGate: expect.objectContaining({
            connectChannelState: "connect_channel_required",
            externalExecutionStatus: "not_run_yet",
          }),
        }),
        cycleEvidence: expect.arrayContaining([
          expect.objectContaining({ label: "Proof" }),
        ]),
      }),
    }));

    const result = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const contentOutput = result.outputs.find((output) => output.kind === "content_drafts")!;
    expect(contentOutput.status).toBe("ready_for_review");
    expect(contentOutput.isReviewable).toBe(true);
    expect(contentOutput.workProducts[0]).toEqual(expect.objectContaining({
      title: "Proof-backed content drafts",
      voiceGate: expect.objectContaining({ score: 100 }),
    }));
    expect(contentOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "channel", value: "x" }),
      expect.objectContaining({ kind: "draft_body", value: expect.stringContaining("public receipts") }),
      expect.objectContaining({ kind: "proof_used", value: "shipped a local first product launch" }),
    ]));

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("updates the same content packet when a worker retries with the same rerun key", async () => {
    const companyId = await seedCompany();
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "DME-0",
      originFingerprint: "operation-draft_content_batch",
      status: "in_progress",
      updatedAt: new Date("2026-05-10T13:00:00.000Z"),
    });
    const voiceGate = evaluateDearMeVoiceGate({
      brand: {
        displayName: "Peter",
        positioning: "Practical AI operator for local-first products.",
        preferredChannels: ["linkedin"],
        goals: ["Build visible proof."],
        audiences: ["founders evaluating local-first workflows"],
        offers: [],
        proofPoints: ["shipped a local-first product launch"],
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
        title: "Proof-backed post",
        text: "A short proof-backed post about turning private work into public receipts.",
        proofUsed: "shipped a local-first product launch",
      },
    });

    const first = await dearmeOutputHandoffService(db).persistContentDraftPacket(
      companyId,
      issueId,
      {
        packetId: "cycle-2026-05-10-content",
        title: "Proof-backed content drafts",
        summary: "First private review packet from this cycle's proof.",
        cycleEvidence: [
          {
            label: "Proof",
            source: "proof",
            summary: "The launch note showed concrete receipts from the latest private work.",
          },
        ],
        drafts: [
          {
            id: "proof-post",
            title: "Proof-backed post",
            channel: "linkedin",
            audience: "Founders evaluating local-first workflows",
            hook: "Your personal brand should show proof while you keep building.",
            body: "First body about turning private work into public receipts.",
            proofUsed: "shipped a local-first product launch",
            voiceGate,
            launchBoundary: "publish social posts",
          },
        ],
      },
    );

    const second = await dearmeOutputHandoffService(db).persistContentDraftPacket(
      companyId,
      issueId,
      {
        packetId: "cycle-2026-05-10-content",
        title: "Proof-backed content drafts updated",
        summary: "Second private review packet from the same worker retry.",
        cycleEvidence: [
          {
            label: "Proof",
            source: "proof",
            summary: "The launch note showed concrete receipts from the latest private work.",
          },
        ],
        drafts: [
          {
            id: "proof-post",
            title: "Proof-backed post",
            channel: "linkedin",
            audience: "Founders evaluating local-first workflows",
            hook: "Your personal brand should show proof while you keep building.",
            body: "Second body after the worker retried with refined copy.",
            proofUsed: "shipped a local-first product launch",
            voiceGate,
            launchBoundary: "publish social posts",
          },
        ],
      },
    );

    expect(second.id).toBe(first.id);
    expect(second.title).toBe("Proof-backed content drafts updated");
    expect(second.summary).toContain("Second body after the worker retried");

    const rows = await db
      .select({
        id: issueWorkProducts.id,
        title: issueWorkProducts.title,
        summary: issueWorkProducts.summary,
        externalId: issueWorkProducts.externalId,
        isPrimary: issueWorkProducts.isPrimary,
        metadata: issueWorkProducts.metadata,
      })
      .from(issueWorkProducts)
      .where(and(
        eq(issueWorkProducts.companyId, companyId),
        eq(issueWorkProducts.issueId, issueId),
        eq(issueWorkProducts.provider, "dearme"),
        eq(issueWorkProducts.externalId, "content-drafts:cycle-2026-05-10-content"),
      ));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      id: first.id,
      title: "Proof-backed content drafts updated",
      externalId: "content-drafts:cycle-2026-05-10-content",
      isPrimary: true,
      summary: expect.stringContaining("Second body after the worker retried"),
    }));
    expect(rows[0]?.metadata).toEqual(expect.objectContaining({
      dearme: expect.objectContaining({
        packetId: "cycle-2026-05-10-content",
        drafts: expect.arrayContaining([
          expect.objectContaining({
            body: "Second body after the worker retried with refined copy.",
          }),
        ]),
      }),
    }));
  });

  it("returns customer-visible DearMe outputs and strips system/provider internals", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const brandIssueId = await seedIssue({
      companyId,
      title: "DearMe: Review private team profile for Peter",
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
      title: "Private team profile",
      body: [
        "# Brand OS",
        "## Positioning",
        "Practical AI operator for local-first products.",
        "## Goals",
        "Build visible proof.",
        "## Proof Points",
        "Shipped a local-first product launch.",
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
        "Proof used: shipped a local-first product launch",
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
        proofPoints: ["shipped a local-first product launch"],
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
        proofUsed: "shipped a local-first product launch",
      },
    });
    await attachDocument({
      companyId,
      issueId: opportunityIssueId,
      key: "opportunity-list",
      title: "Opportunity list",
      body: [
        "Target: host of a practical AI operators podcast",
        "Verification status: pending",
        "Contact record: bookings@practicalaibuilders.example · https://practicalaibuilders.example/podcast",
        "Source signal: Guest submission page publishes a dedicated booking inbox and intake form.",
        "Fit reason: their audience buys local-first AI workflow tools",
        "Relevance score: 8/10",
        "Outreach angle: offer a teardown of a real local-agent workflow",
        "First message: I can share concrete operator notes from a shipped local AI product.",
        "Approval gate: Send approval required",
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
        "Proof source: local-first product launch notes",
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
        value: "Shipped a local first product launch.",
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
        summary: "Shipped a local first product launch.",
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
        summary: "shipped a local first product launch",
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
        evidence: ["shipped a local-first product launch"],
      }),
    ]));
    expect(contentOutput.workProducts[0]).not.toHaveProperty("provider");
    expect(opportunityOutput.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "target", value: expect.stringContaining("podcast") }),
      expect.objectContaining({ kind: "verification_status", value: "pending" }),
      expect.objectContaining({ kind: "contact_record", value: expect.stringContaining("bookings@practicalaibuilders.example") }),
      expect.objectContaining({ kind: "source_signal", value: expect.stringContaining("Guest submission page") }),
      expect.objectContaining({ kind: "why_relevant", value: expect.stringContaining("local-first AI workflow tools") }),
      expect.objectContaining({ kind: "outreach_angle", value: expect.stringContaining("teardown") }),
      expect.objectContaining({ kind: "draft_message", value: expect.stringContaining("operator notes") }),
      expect.objectContaining({ kind: "approval_gate", value: expect.stringContaining("Send approval") }),
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
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }

    const allIssueRows = await db.select().from(issues).where(eq(issues.companyId, companyId));
    expect(allIssueRows).toHaveLength(7);
  });

  it("grounds output source evidence in active Voice & Memory rows", async () => {
    const companyId = await seedCompany();
    await seedIssue({
      companyId,
      title: "DearMe Draft: Content batch",
      identifier: "DME-19",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      updatedAt: new Date("2026-05-09T12:00:00.000Z"),
    });

    await db.insert(activityLog).values([
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-active-voice",
        details: {
          kind: "voice_sample",
          title: "Operator note",
          body: "Short, direct notes for founder-facing AI product updates.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-09T11:00:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-hidden-terms",
        details: {
          kind: "proof_point",
          title: "Paperclip provider setup_payload",
          body: "OpenClaw runtime workspace proof should stay private.",
          sourceLabel: "Symphony issue route token",
        },
        createdAt: new Date("2026-05-09T11:01:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-retired",
        details: {
          kind: "proof_point",
          title: "Retired proof",
          body: "This retired claim should not appear.",
        },
        createdAt: new Date("2026-05-09T11:02:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_archived",
        entityType: "dearme_memory",
        entityId: "memory-retired",
        details: { kind: "proof_point" },
        createdAt: new Date("2026-05-09T11:03:00.000Z"),
      },
    ]);

    const result = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const contentOutput = result.outputs.find((output) => output.kind === "content_drafts")!;

    expect(contentOutput.sourceEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "voice_memory",
        label: "Voice & Memory",
        source: "derived",
        summary: expect.stringContaining("Short, direct notes"),
      }),
    ]));
    const serialized = JSON.stringify(contentOutput).toLowerCase();
    expect(serialized).toContain("dearme services setup details");
    expect(serialized).not.toContain("retired claim");
    for (const hiddenTerm of ["paperclip", "openclaw", "symphony", "provider", "setup_payload", "runtime", "workspace", "issue route", "token"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
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
      title: "DearMe: Review private team profile for Peter",
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
      title: "Private team profile",
      body: [
        "Positioning: practical AI operator for local-first builders",
        "Proof Points: shipped a local-first product launch with approval gates",
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
        "Proof used: shipped a local-first product launch",
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
      body: "Proof source: local-first product launch notes\nProposed copy: Built a local-first AI operating layer.",
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
    expect(contentOutput.documents[0]?.bodyPreview).toContain("Next step: One launch-ready next step is ready");
    expect(contentOutput.workProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "Cycle content packet",
        summary: expect.stringContaining("launch-ready next step"),
        reviewState: "pending",
      }),
    ]));
    expect(reportOutput.documents[0]?.key).toBe("dear-me-report");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Completed work");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Next step: One launch-ready next step is ready");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Why it matters");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("Approval boundary");
    expect(reportOutput.documents[0]?.bodyPreview).toContain("No outbound spend");
    expect(reportOutput.workProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "Dear me report packet",
        summary: expect.stringContaining("launch-ready next step"),
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
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
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
    const launchHandoff = {
      toolName: "post_x",
      channel: "x",
      gate: "publish",
      riskGate: "publish_social",
      voiceGateRequired: true,
      voiceGateArtifactKind: "x-tweet",
      voiceGateText: "Three proof-backed starter posts.",
      voiceFingerprintId: "vf_content_packet",
      payload: { text: "Three proof-backed starter posts." },
      publishGate: {
        gate: "publish",
        riskGate: "publish_social",
        requiresApproval: true,
        requiresActiveConnection: true,
        connectChannelState: "connect_channel_required",
        externalExecutionStatus: "not_run_yet",
      },
      sourceDraftId: "proof-post",
      sourceDraftTitle: "Starter posts",
      launchBoundary: "publish social posts",
    };
    await db.insert(issueWorkProducts).values({
      id: workProductId,
      companyId,
      issueId,
      type: "draft",
      provider: "dearme",
      title: "Content draft batch",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: "Three private posts prepared for review.",
      metadata: {
        dearme: {
          outputKind: "content_drafts",
          launchHandoff,
        },
      },
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

    const nextMoveApprovals = await db
      .select({
        id: approvals.id,
        type: approvals.type,
        status: approvals.status,
        requestedByAgentId: approvals.requestedByAgentId,
        requestedByUserId: approvals.requestedByUserId,
        payload: approvals.payload,
      })
      .from(approvals)
      .where(eq(approvals.companyId, companyId));
    expect(nextMoveApprovals).toHaveLength(1);
    expect(nextMoveApprovals[0]).toEqual(expect.objectContaining({
      type: "dearme_output_next_move",
      status: "pending",
      requestedByAgentId: agentId,
      requestedByUserId: null,
    }));
    expect(nextMoveApprovals[0]?.payload).toEqual(expect.objectContaining({
      title: "Approve posts for publishing",
      summary: expect.stringContaining("final approval"),
      recommendedAction: expect.stringContaining("Publish"),
      nextActionOnApproval: expect.stringContaining("Nothing publishes before this approval"),
      riskGate: "publish_social",
      outputId: `${issueId}:content_drafts`,
      outputKind: "content_drafts",
      issueId,
      issueIdentifier: "DME-8",
      preparedTitle: "Content drafts",
      reviewNote: "This sounds like me.",
      launchHandoff: expect.objectContaining({
        toolName: "post_x",
        channel: "x",
        gate: "publish",
        voiceGateText: "Three proof-backed starter posts.",
        voiceFingerprintId: "vf_content_packet",
        payload: { text: "Three proof-backed starter posts." },
        publishGate: expect.objectContaining({
          connectChannelState: "connect_channel_required",
          externalExecutionStatus: "not_run_yet",
        }),
      }),
    }));

    const linkedApprovals = await db
      .select({ issueId: issueApprovals.issueId, approvalId: issueApprovals.approvalId })
      .from(issueApprovals)
      .where(eq(issueApprovals.companyId, companyId));
    expect(linkedApprovals).toEqual([
      { issueId, approvalId: nextMoveApprovals[0]!.id },
    ]);

    await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:content_drafts`,
      { action: "approve", decisionNote: "Still good." },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );
    const approvalCountAfterRepeat = await db
      .select({ id: approvals.id })
      .from(approvals)
      .where(eq(approvals.companyId, companyId));
    expect(approvalCountAfterRepeat).toHaveLength(1);

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("attaches a deploy-site launch handoff for an approved private site proof and keeps approval idempotent", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare portfolio update",
      identifier: "DME-29",
      originFingerprint: "operation-prepare_portfolio_update",
      status: "in_review",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-07T16:30:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId,
      key: "portfolio-update",
      title: "Portfolio update",
      body: [
        "Page section: proof cards",
        "Proof source: local-first product launch notes",
        "Private preview route: dearme.app/peter-studio",
        "Proposed copy: Built a local-first AI operating layer with approval gates.",
        "Deploy boundary: The public site update waits for one launch decision.",
      ].join("\n"),
      updatedAt: new Date("2026-05-07T16:31:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:portfolio_update`,
      { action: "approve", decisionNote: "This is the right proof path." },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );

    expect(result.status).toBe("recorded");
    expect(result.output.reviewLoop).toEqual(expect.objectContaining({
      state: "approved",
      lastAction: "approve",
    }));
    expect(result.comment.bodyPreview).toContain("approved");

    const nextMoveApprovals = await db
      .select({
        id: approvals.id,
        type: approvals.type,
        status: approvals.status,
        requestedByAgentId: approvals.requestedByAgentId,
        requestedByUserId: approvals.requestedByUserId,
        payload: approvals.payload,
      })
      .from(approvals)
      .where(eq(approvals.companyId, companyId));
    expect(nextMoveApprovals).toHaveLength(1);
    expect(nextMoveApprovals[0]).toEqual(expect.objectContaining({
      type: "dearme_output_next_move",
      status: "pending",
      requestedByAgentId: agentId,
      requestedByUserId: null,
    }));
    expect(nextMoveApprovals[0]?.payload).toEqual(expect.objectContaining({
      title: "Approve portfolio update to publish",
      summary: expect.stringContaining("final approval"),
      recommendedAction: expect.stringContaining("Publish"),
      nextActionOnApproval: expect.stringContaining("Nothing deploys before this approval"),
      riskGate: "deploy_public_site",
      outputId: `${issueId}:portfolio_update`,
      outputKind: "portfolio_update",
      issueId,
      issueIdentifier: "DME-29",
      preparedTitle: "Portfolio updates",
      reviewNote: "This is the right proof path.",
      launchHandoff: expect.objectContaining({
        toolName: "deploy_site",
        channel: "dearme-cloud",
        gate: "deploy",
        riskGate: "deploy_public_site",
        payload: {
          handle: "peter-studio",
          artifactRef: expect.stringMatching(/^document:/),
          customDomain: null,
          target: "preview",
        },
      }),
    }));

    await dearmeOutputHandoffService(db).reviewOutput(
      companyId,
      `${issueId}:portfolio_update`,
      { action: "approve", decisionNote: "Still good." },
      { actorType: "user", actorId: "user-1", agentId: null, runId: null },
    );
    const approvalCountAfterRepeat = await db
      .select({ id: approvals.id })
      .from(approvals)
      .where(eq(approvals.companyId, companyId));
    expect(approvalCountAfterRepeat).toHaveLength(1);

    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("records a private default score on silence without creating launch approval", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare content batch",
      identifier: "DME-28",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-08T09:00:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId,
      key: "content-drafts",
      title: "Content drafts",
      body: "Hook: Build in public from real proof.\nDraft body: A private draft ready for review.",
      updatedAt: new Date("2026-05-08T09:01:00.000Z"),
    });
    const workProductId = randomUUID();
    await db.insert(issueWorkProducts).values({
      id: workProductId,
      companyId,
      issueId,
      type: "draft",
      provider: "dearme",
      title: "Content draft batch",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: "Three private posts prepared for review.",
      metadata: {
        dearme: {
          outputKind: "content_drafts",
          launchHandoff: {
            toolName: "post_x",
            channel: "x",
            gate: "publish",
            payload: { text: "A private post." },
          },
        },
      },
      updatedAt: new Date("2026-05-08T09:02:00.000Z"),
    });

    const result = await dearmeOutputHandoffService(db).defaultScoreOnSilence(
      companyId,
      `${issueId}:content_drafts`,
      { actorType: "agent", actorId: agentId, agentId, runId: null },
    );

    expect(result.status).toBe("recorded");
    expect(result.action).toBe("approve");
    expect(result.wakeIssue).toBeNull();
    expect(result.comment.bodyPreview).toContain("kept this private work moving");
    expect(result.output.reviewLoop).toEqual(expect.objectContaining({
      state: "approved",
      lastAction: "approve",
      defaultApprovalScore: 7,
      defaultedBySilence: true,
      lastDecisionNotePreview: expect.stringContaining("default review score of 7/10"),
      nextStep: expect.stringContaining("default review score of 7/10"),
    }));

    const nextMoveApprovals = await db
      .select({ id: approvals.id })
      .from(approvals)
      .where(eq(approvals.companyId, companyId));
    expect(nextMoveApprovals).toHaveLength(0);

    const linkedApprovals = await db
      .select({ approvalId: issueApprovals.approvalId })
      .from(issueApprovals)
      .where(eq(issueApprovals.companyId, companyId));
    expect(linkedApprovals).toHaveLength(0);

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
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
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
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
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
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("shows applied review feedback only after newer private work exists", async () => {
    const companyId = await seedCompany();
    const agentId = await seedAgent(companyId);
    const issueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Prepare content batch",
      identifier: "DME-13",
      originFingerprint: "operation-draft_content_batch",
      status: "todo",
      assigneeAgentId: agentId,
      updatedAt: new Date("2026-05-07T19:00:00.000Z"),
    });
    const documentId = await attachDocument({
      companyId,
      issueId,
      key: "content-drafts",
      title: "Content drafts",
      body: "Hook: From messy work to public proof.\nDraft body: Here is the first private draft.",
      updatedAt: new Date("2026-05-07T19:01:00.000Z"),
    });
    await db.insert(issueWorkProducts).values({
      id: randomUUID(),
      companyId,
      issueId,
      type: "draft",
      provider: "dearme-cycle-output",
      externalId: "cycle-output-packet:content_drafts",
      title: "Content draft packet",
      url: null,
      status: "ready",
      reviewState: "changes_requested",
      summary: "The previous private draft was waiting on user feedback.",
      updatedAt: new Date("2026-05-07T19:02:10.000Z"),
    });
    await db.insert(issueComments).values({
      id: randomUUID(),
      companyId,
      issueId,
      authorUserId: randomUUID(),
      body: [
        "DearMe decision: regenerate this prepared work before review.",
        "Try a stronger proof-led opening before the launch call.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-07T19:01:30.000Z"),
      updatedAt: new Date("2026-05-07T19:01:30.000Z"),
    });
    await db.insert(issueComments).values({
      id: randomUUID(),
      companyId,
      issueId,
      authorUserId: randomUUID(),
      body: [
        "DearMe decision: requested changes before this represents me.",
        "Make the proof more concrete and less generic.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-07T19:02:00.000Z"),
      updatedAt: new Date("2026-05-07T19:02:00.000Z"),
    });

    const before = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const beforeOutput = before.outputs.find((output) => output.kind === "content_drafts")!;
    expect(beforeOutput.reviewLoop).toEqual(expect.objectContaining({
      state: "revision_requested",
      feedbackTrace: null,
      reviewHandoff: expect.objectContaining({
        userDirection: "Make the proof more concrete and less generic.",
      }),
    }));

    await db
      .update(documents)
      .set({
        latestBody: [
          "Hook: Proof first, then the less generic post.",
          "Draft body: A sharper private draft now opens with the concrete proof.",
          "Proof used: The live DearMe review loop now carries customer feedback forward.",
        ].join("\n"),
        latestRevisionNumber: 3,
        updatedAt: new Date("2026-05-07T19:10:00.000Z"),
      })
      .where(eq(documents.id, documentId));
    await db.insert(issueComments).values({
      id: randomUUID(),
      companyId,
      issueId,
      authorAgentId: agentId,
      body: "Prepared the revised private draft around the less generic post.",
      createdAt: new Date("2026-05-07T19:11:00.000Z"),
      updatedAt: new Date("2026-05-07T19:11:00.000Z"),
    });

    const after = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const afterOutput = after.outputs.find((output) => output.kind === "content_drafts")!;

    expect(afterOutput.reviewLoop).toEqual(expect.objectContaining({
      state: "needs_user_review",
      attemptCount: 2,
      lastAction: "request_changes",
      lastDecisionNotePreview: "Make the proof more concrete and less generic.",
      reviewHandoff: null,
      feedbackTrace: expect.objectContaining({
        headline: "Feedback applied",
        userFeedback: "Make the proof more concrete and less generic.",
        changes: expect.arrayContaining([
          "Revised the private draft around your requested change.",
          "Still private until you approve it.",
        ]),
        receipts: expect.arrayContaining([
          "Change requested: Make the proof more concrete and less generic.",
          "Another pass requested: Try a stronger proof led opening before the launch call.",
        ]),
      }),
    }));
    expect(afterOutput.reviewLoop.nextStep).toContain("last feedback");
    expect(afterOutput.details.some((detail) => detail.value.includes("less generic post"))).toBe(true);

    const traceSerialized = JSON.stringify(afterOutput.reviewLoop.feedbackTrace).toLowerCase();
    for (const hiddenTerm of [
      "dearme decision",
      "provider",
      "adapter",
      "setup_payload",
      "paperclip",
      "openclaw",
      "symphony",
      "issue comment",
      "work product",
      "runtime",
    ]) {
      expect(traceSerialized).not.toContain(hiddenTerm);
    }
  });
});
