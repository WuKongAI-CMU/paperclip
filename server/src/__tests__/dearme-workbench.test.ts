import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  approvals,
  companies,
  costEvents,
  createDb,
  documents,
  issueComments,
  issueDocuments,
  issues,
  issueWorkProducts,
  routineRuns,
  routines,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "../services/dearme-brand-blueprint-apply.js";
import { dearmeWorkbenchService } from "../services/dearme-workbench.js";

const DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND = "dearme_chief_of_staff_message";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe workbench tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `WB${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

describeEmbeddedPostgres("DearMe workbench service", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-workbench-");
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

  async function seedDearMeAgent(input: {
    companyId: string;
    name: string;
    role: string;
    updatedAt: Date;
  }) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId: input.companyId,
      name: input.name,
      role: input.role,
      title: input.name,
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: { provider: "codex-local" },
      runtimeConfig: {},
      permissions: {},
      metadata: {
        source: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
        dearmeRole: input.role,
      },
      updatedAt: input.updatedAt,
    });
    return agentId;
  }

  async function seedIssue(input: {
    companyId: string;
    title: string;
    identifier: string;
    originFingerprint: string;
    status: string;
    updatedAt: Date;
    originKind?: string;
    assigneeAgentId?: string | null;
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
      updatedAt: input.updatedAt,
      assigneeAgentId: input.assigneeAgentId ?? null,
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
  }

  it("projects the team, ready work, decisions, report, and progress without runtime internals", async () => {
    const companyId = await seedCompany();
    const chiefOfStaffId = await seedDearMeAgent({
      companyId,
      name: "DearMe Chief of Staff",
      role: "chief_of_staff",
      updatedAt: new Date("2026-05-07T13:00:00.000Z"),
    });
    await seedDearMeAgent({
      companyId,
      name: "DearMe Chief of Staff 9",
      role: "chief_of_staff",
      updatedAt: new Date("2026-05-07T13:10:00.000Z"),
    });
    await seedDearMeAgent({
      companyId,
      name: "DearMe Content Producer",
      role: "content_producer",
      updatedAt: new Date("2026-05-07T13:05:00.000Z"),
    });

    const brandIssueId = await seedIssue({
      companyId,
      title: "DearMe: Review Brand OS for Peter",
      identifier: "WB-1",
      originFingerprint: "brand-os-review",
      status: "done",
      updatedAt: new Date("2026-05-07T14:00:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "WB-2",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      updatedAt: new Date("2026-05-07T15:00:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    await seedIssue({
      companyId,
      title: "DearMe Draft: Draft opportunity list",
      identifier: "WB-3",
      originFingerprint: "operation-draft_opportunity_list",
      status: "todo",
      updatedAt: new Date("2026-05-07T15:20:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const reportIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft weekly Dear me report",
      identifier: "WB-4",
      originFingerprint: "operation-schedule_weekly_report",
      status: "done",
      updatedAt: new Date("2026-05-07T16:00:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const chiefBriefIssueId = await seedIssue({
      companyId,
      title: "DearMe: Find opportunities - Find practical opportunities this week",
      identifier: "WB-5",
      originKind: DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND,
      originFingerprint: "chief-brief-1",
      status: "todo",
      updatedAt: new Date("2026-05-07T16:30:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });

    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "brand-os",
      title: "Brand OS",
      body: "# Brand OS\n\nPositioning and proof are ready.",
      updatedAt: new Date("2026-05-07T14:05:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: brandIssueId,
      key: "voice-profile",
      title: "Voice Profile",
      body: "# Voice Profile\n\nDirect, proof-backed, and concise.",
      updatedAt: new Date("2026-05-07T14:06:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: reportIssueId,
      key: "dear-me-report",
      title: "Dear me report",
      body: "# Dear me report\n\nWork ready: three posts and one proof-card update.",
      updatedAt: new Date("2026-05-07T16:05:00.000Z"),
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
      summary: "Three proof-backed posts prepared for review.",
      updatedAt: new Date("2026-05-07T15:05:00.000Z"),
    });
    await db.insert(issueComments).values({
      id: randomUUID(),
      companyId,
      issueId: contentIssueId,
      authorAgentId: chiefOfStaffId,
      body: "Prepared three private posts and held publishing for approval.",
      createdAt: new Date("2026-05-07T15:10:00.000Z"),
      updatedAt: new Date("2026-05-07T15:10:00.000Z"),
    });
    const weeklyCycleRoutineId = randomUUID();
    await db.insert(routines).values({
      id: weeklyCycleRoutineId,
      companyId,
      parentIssueId: brandIssueId,
      title: "DearMe: Weekly content cycle",
      description: "Keep the private brand growth cycle moving.",
      assigneeAgentId: chiefOfStaffId,
      status: "active",
      lastTriggeredAt: new Date("2026-05-07T16:50:00.000Z"),
      lastEnqueuedAt: new Date("2026-05-07T16:51:00.000Z"),
      createdAt: new Date("2026-05-07T14:20:00.000Z"),
      updatedAt: new Date("2026-05-07T16:50:00.000Z"),
    });
    await db.insert(routineRuns).values({
      id: randomUUID(),
      companyId,
      routineId: weeklyCycleRoutineId,
      source: "scheduler",
      status: "completed",
      triggeredAt: new Date("2026-05-07T16:50:00.000Z"),
      linkedIssueId: contentIssueId,
      completedAt: new Date("2026-05-07T16:52:00.000Z"),
      createdAt: new Date("2026-05-07T16:50:00.000Z"),
      updatedAt: new Date("2026-05-07T16:52:00.000Z"),
    });
    await db.insert(costEvents).values({
      id: randomUUID(),
      companyId,
      agentId: chiefOfStaffId,
      issueId: contentIssueId,
      provider: "anthropic",
      biller: "anthropic",
      billingType: "llm_tokens",
      model: "claude-sonnet",
      inputTokens: 1200,
      cachedInputTokens: 200,
      outputTokens: 300,
      costCents: 237,
      occurredAt: new Date("2026-05-07T16:53:00.000Z"),
    });
    await db.insert(approvals).values([
      {
        id: randomUUID(),
        companyId,
        type: "dearme_brand_blueprint_apply",
        status: "pending",
        payload: {
          title: "Create Brand OS for Peter",
          summary: "DearMe will create the first private growth team.",
        },
        requestedByUserId: "user-1",
        updatedAt: new Date("2026-05-07T16:20:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        type: "dearme_brand_blueprint_apply",
        status: "approved",
        payload: {
          title: "Old Brand OS approval",
          summary: "This handled approval should not stay in the decision queue.",
        },
        requestedByUserId: "user-1",
        updatedAt: new Date("2026-05-07T16:40:00.000Z"),
      },
    ]);
    await db.insert(activityLog).values([
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.chief_of_staff_message",
        entityType: "issue",
        entityId: chiefBriefIssueId,
        createdAt: new Date("2026-05-07T16:45:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_archived",
        entityType: "dearme_memory",
        entityId: "memory-retired-1",
        details: {
          memoryId: "memory-retired-1",
          reason: "user_retired_source",
        },
        createdAt: new Date("2026-05-07T16:24:00.000Z"),
      },
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
          title: "Operator note",
          body: "Short, direct writing sample with concrete proof.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-07T16:35:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-retired-1",
        details: {
          kind: "goal",
          title: "Retired goal",
          body: "This old source should no longer shape the growth cycle.",
          sourceLabel: "Old note",
        },
        createdAt: new Date("2026-05-07T16:23:00.000Z"),
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
          title: "Shipped proof",
          body: "Shipped a working local product and verified the first private growth cycle.",
          sourceLabel: "Build log",
        },
        createdAt: new Date("2026-05-07T16:33:00.000Z"),
      },
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
          title: "Old operator note",
          body: "An older voice note should not beat the latest revision.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-07T16:20:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.brand_blueprint_applied",
        entityType: "approval",
        entityId: "approval-1",
        createdAt: new Date("2026-05-07T16:25:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        actorType: "system",
        actorId: "dearme",
        action: "paperclip.internal_event",
        entityType: "issue",
        entityId: "issue-1",
        createdAt: new Date("2026-05-07T16:30:00.000Z"),
      },
    ]);

    const result = await dearmeWorkbenchService(db).getWorkbench(companyId);

    expect(result.headline).toBe("Dear me, your team has decisions ready");
    expect(result.team).toHaveLength(2);
    expect(result.team.map((member) => member.name)).toEqual([
      "Chief of Staff",
      "Content Producer",
    ]);
    expect(result.team[0]).toEqual(expect.objectContaining({
      role: "chief_of_staff",
      status: "Standing by",
    }));
    expect(result.activeWork.map((item) => item.outputKind)).toContain("opportunity_drafts");
    expect(result.activeWork).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: chiefBriefIssueId,
          title: expect.stringContaining("Chief of Staff brief: Find opportunities"),
          status: "queued",
          ownerRole: "chief_of_staff",
          outputKind: null,
          issueId: chiefBriefIssueId,
          issueIdentifier: "WB-5",
          reviewLoop: expect.objectContaining({
            state: "fresh",
            nextStep: expect.stringContaining("Chief of Staff is preparing this privately"),
          }),
        }),
      ]),
    );
    expect(result.workReady.map((item) => item.outputKind)).toEqual(
      expect.arrayContaining(["brand_os", "voice_profile", "content_drafts", "weekly_report"]),
    );
    expect(result.decisionsNeeded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "approve_brand_os", approvalId: expect.any(String) }),
        expect.objectContaining({ kind: "review_output", outputKind: "content_drafts", riskGate: "publish_social" }),
      ]),
    );
    expect(result.batchDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Review content batch",
          actionLabel: "Review posts",
          riskGate: "publish_social",
          issueIds: [contentIssueId],
        }),
        expect.objectContaining({
          title: "Review prepared work",
          actionLabel: "Review work",
          approvalIds: [expect.any(String)],
        }),
      ]),
    );
    expect(result.decisionsNeeded.map((decision) => decision.title)).not.toContain("Old Brand OS approval");
    expect(result.report).toEqual(expect.objectContaining({
      title: "Dear me report",
      bodyPreview: expect.stringContaining("Work ready"),
      accomplished: expect.arrayContaining([
        expect.stringContaining("Cycle check-in completed"),
        expect.stringContaining("Spend checkpoint recorded"),
      ]),
      decisions: expect.arrayContaining([
        expect.stringContaining("Review Content drafts"),
      ]),
      learnings: expect.arrayContaining([
        expect.stringContaining("Voice sample added"),
      ]),
      nextBets: expect.arrayContaining([
        expect.stringContaining("Opportunity Scout"),
      ]),
    }));
    expect(result.recentProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "brand_os_applied",
          title: "Growth team created",
        }),
        expect.objectContaining({
          kind: "team_progress",
          title: "Voice & Memory updated",
        }),
        expect.objectContaining({
          kind: "cycle_check_in",
          title: "Cycle check-in completed",
        }),
        expect.objectContaining({
          kind: "spend_checkpoint",
          title: "Spend checkpoint recorded",
        }),
      ]),
    );
    expect(result.recentProgress.map((item) => item.title)).not.toContain("Team progress recorded");
    expect(result.memory).toEqual(expect.objectContaining({
      sourceCount: 2,
      voiceSampleCount: 1,
      proofCount: 1,
      voiceProfile: expect.objectContaining({
        title: "Draft Voice Profile",
        status: "learning",
        sampleCount: 1,
        confidence: 55,
        draftTone: expect.arrayContaining(["Direct", "Evidence-backed"]),
      }),
      sourcePlan: expect.objectContaining({
        status: "building",
        nextSourceKind: "voice_sample",
        required: expect.arrayContaining([
          expect.objectContaining({
            kind: "voice_sample",
            label: "Writing samples",
            status: "partial",
            count: 1,
            target: 2,
          }),
          expect.objectContaining({
            kind: "proof_point",
            label: "Proof points",
            status: "partial",
            count: 1,
            target: 2,
          }),
          expect.objectContaining({
            kind: "goal",
            label: "Goals",
            status: "missing",
            count: 0,
          }),
        ]),
      }),
      latest: expect.arrayContaining([
        expect.objectContaining({
          id: "memory-voice-1",
          kind: "voice_sample",
          title: "Operator note",
          body: "Short, direct writing sample with concrete proof.",
          sourceLabel: "Manual note",
        }),
      ]),
    }));
    expect(result.memory.latest.map((item) => item.title)).not.toContain("Retired goal");
    expect(result.memory.latest.map((item) => item.title)).not.toContain("Old operator note");
    expect(result.workStream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "cycle_brief",
          cycleStage: "plan",
          role: "chief_of_staff",
          title: "Chief of Staff is turning your brief into private work",
          artifact: "Cycle brief",
          status: "working",
          needsApproval: false,
          sourceLabel: "Chief of Staff brief",
          costImpact: null,
          nextAction: expect.stringContaining("Chief of Staff is preparing this privately"),
          relatedOutputId: null,
          issueId: chiefBriefIssueId,
          issueIdentifier: "WB-5",
          reviewLoop: expect.objectContaining({
            state: "fresh",
            nextStep: expect.stringContaining("Chief of Staff is preparing this privately"),
          }),
        }),
        expect.objectContaining({
          kind: "decision_needed",
          cycleStage: "review",
          role: "content_producer",
          artifact: "Content drafts",
          status: "decision_needed",
          needsApproval: true,
          sourceLabel: "Prepared output",
          costImpact: null,
          nextAction: expect.any(String),
          issueId: contentIssueId,
        }),
        expect.objectContaining({
          kind: "work_in_motion",
          cycleStage: "work",
          role: "opportunity_scout",
          artifact: "Opportunity leads",
          status: "working",
          needsApproval: false,
          sourceLabel: "Prepared output",
          costImpact: null,
          nextAction: expect.any(String),
        }),
        expect.objectContaining({
          kind: "progress_recorded",
          cycleStage: "plan",
          role: "chief_of_staff",
          artifact: "Growth team",
          status: "recorded",
          sourceLabel: "Brand OS",
          costImpact: "Work stays inside paid-beta guardrails",
          nextAction: expect.stringContaining("Start or steer"),
        }),
        expect.objectContaining({
          kind: "memory_recorded",
          cycleStage: "learn",
          role: "voice_editor",
          artifact: "Voice & Memory",
          status: "recorded",
          sourceLabel: "Voice & Memory",
          costImpact: null,
          nextAction: expect.stringContaining("next private cycle"),
        }),
        expect.objectContaining({
          kind: "progress_recorded",
          cycleStage: "work",
          role: "chief_of_staff",
          title: "Cycle check-in completed",
          artifact: "Cycle check-in",
          status: "recorded",
          needsApproval: false,
          sourceLabel: "Cycle cadence",
          costImpact: null,
          nextAction: expect.stringContaining("prepared work"),
        }),
        expect.objectContaining({
          kind: "progress_recorded",
          cycleStage: "work",
          role: "growth_analyst",
          title: "Spend checkpoint recorded",
          artifact: "Spend checkpoint",
          status: "recorded",
          needsApproval: false,
          sourceLabel: "Spend guardrail",
          costImpact: "Private spend recorded",
          nextAction: expect.stringContaining("spend money"),
        }),
      ]),
    );
    expect(result.actionGraph.cycleNodeId).toBe("cycle:weekly-growth-loop");
    expect(result.actionGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cycle:weekly-growth-loop", kind: "cycle", status: "decisions_needed" }),
        expect.objectContaining({ kind: "role", role: "content_producer", label: "Content Producer" }),
        expect.objectContaining({
          kind: "work_item",
          role: "chief_of_staff",
          relatedOutputId: null,
          issueId: chiefBriefIssueId,
          label: expect.stringContaining("Chief of Staff brief"),
        }),
        expect.objectContaining({ kind: "artifact", role: "content_producer", relatedOutputId: `${contentIssueId}:content_drafts` }),
        expect.objectContaining({ kind: "decision", role: "content_producer", issueId: contentIssueId }),
        expect.objectContaining({ kind: "guardrail", label: "Review content batch" }),
        expect.objectContaining({ kind: "memory_signal", label: "Operator note", role: "voice_editor" }),
        expect.objectContaining({ kind: "report", role: "growth_analyst", issueId: reportIssueId }),
      ]),
    );
    expect(result.actionGraph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "owns", fromNodeId: "cycle:weekly-growth-loop" }),
        expect.objectContaining({ kind: "produces", toNodeId: `artifact:${contentIssueId}:content_drafts` }),
        expect.objectContaining({ kind: "requires_decision", label: "needs your decision" }),
        expect.objectContaining({ kind: "learns_from", toNodeId: "memory:memory-voice-1" }),
        expect.objectContaining({ kind: "reports", toNodeId: `report:${reportIssueId}:weekly_report` }),
      ]),
    );

    const customerPathJson = JSON.stringify(result);
    expect(customerPathJson).not.toContain("codex-local");
    expect(customerPathJson).not.toContain("adapterType");
    expect(customerPathJson).not.toContain("provider");
    expect(customerPathJson).not.toContain("setup_payload");
    expect(customerPathJson).not.toContain("Paperclip");
    expect(customerPathJson).not.toContain("routine");
    expect(customerPathJson).not.toContain("anthropic");
    expect(customerPathJson).not.toContain("claude-sonnet");
    expect(customerPathJson).not.toContain(DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND);
  });

  it("projects only active Voice & Memory sources after revisions and retirements", async () => {
    const companyId = await seedCompany();

    await db.insert(activityLog).values([
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-active",
        details: {
          kind: "voice_sample",
          title: "Original voice note",
          body: "Original voice sample that should be superseded.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-08T14:00:00.000Z"),
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
          title: "Old proof",
          body: "A proof point that should no longer guide private work.",
          sourceLabel: "Old log",
        },
        createdAt: new Date("2026-05-08T14:01:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_archived",
        entityType: "dearme_memory",
        entityId: "memory-retired",
        details: {
          memoryId: "memory-retired",
          reason: "user_retired_source",
        },
        createdAt: new Date("2026-05-08T14:03:00.000Z"),
      },
      {
        companyId,
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-active",
        details: {
          kind: "voice_sample",
          sourceInputMode: "import_note",
          title: "Revised voice note",
          body: "Sharper revised voice sample for future private drafts.",
          sourceLabel: "Manual note",
          revisionOf: "memory-active",
        },
        createdAt: new Date("2026-05-08T14:04:00.000Z"),
      },
    ]);

    const result = await dearmeWorkbenchService(db).getWorkbench(companyId);

    expect(result.memory).toEqual(expect.objectContaining({
      sourceCount: 1,
      voiceSampleCount: 1,
      proofCount: 0,
      latest: [
        expect.objectContaining({
          id: "memory-active",
          kind: "voice_sample",
          sourceInputMode: "import_note",
          title: "Revised voice note",
          body: "Sharper revised voice sample for future private drafts.",
        }),
      ],
    }));
    expect(result.memory.latest.map((item) => item.id)).not.toContain("memory-retired");
    expect(result.recentProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "team_progress",
          title: "Voice & Memory source retired",
        }),
      ]),
    );
  });
});
