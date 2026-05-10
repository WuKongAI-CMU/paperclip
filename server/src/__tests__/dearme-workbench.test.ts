import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
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
import { recordDearMeNextMoveApprovalReceipt } from "../services/dearme-approval-receipts.js";
import { approvalService } from "../services/approvals.js";
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
      title: "OpenClaw Symphony content agent batch",
      url: null,
      status: "ready",
      reviewState: "pending",
      summary: [
        "OpenClaw provider runtime model adapter Paperclip Symphony agents prepared",
        "three proof-backed posts for review.",
      ].join(" "),
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
      title: "DearMe: Weekly OpenClaw runtime routine",
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
          title: "Create OpenClaw Paperclip Brand OS for Peter",
          summary: "Symphony provider runtime setup_payload model should stay backstage.",
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
          sourceInputMode: "link",
          title: "Shipped proof",
          body: "Shipped a working local product and verified the first private growth cycle.",
          sourceLabel: "https://example.com/build-log",
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
      sourceReviewQueue: expect.arrayContaining([
        expect.objectContaining({
          sourceMemoryId: "memory-proof-1",
          sourceInputMode: "link",
          sourceTitle: "Shipped proof",
          sourceLabel: "https://example.com/build-log",
          proposedKind: "proof_point",
          proposedBody: "Shipped a working local product and verified the first private growth cycle.",
        }),
      ]),
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
    expect(result.runLedger).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "needs_decision",
          role: "content_producer",
          evidenceLabel: "Prepared output / Content drafts",
          status: "decision_needed",
          needsApproval: true,
          issueId: contentIssueId,
        }),
        expect.objectContaining({
          kind: "prepared",
          role: "growth_analyst",
          evidenceLabel: expect.stringContaining("Dear me report"),
          relatedOutputId: `${reportIssueId}:weekly_report`,
        }),
        expect.objectContaining({
          kind: "learned",
          role: "voice_editor",
          evidenceLabel: expect.stringContaining("Voice"),
          status: "recorded",
        }),
        expect.objectContaining({
          kind: "tried",
          role: "opportunity_scout",
          status: "working",
          needsApproval: false,
        }),
      ]),
    );
    expect(result.runLedger.length).toBeLessThanOrEqual(12);
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
    expect(customerPathJson).not.toContain("adapter");
    expect(customerPathJson).not.toContain("provider");
    expect(customerPathJson).not.toContain("runtime");
    expect(customerPathJson).not.toContain("model");
    expect(customerPathJson).not.toContain("setup_payload");
    expect(customerPathJson).not.toContain("OpenClaw");
    expect(customerPathJson).not.toContain("Symphony");
    expect(customerPathJson).not.toContain("Paperclip");
    expect(customerPathJson).not.toContain("agents");
    expect(customerPathJson).not.toContain("routine");
    expect(customerPathJson).not.toContain("anthropic");
    expect(customerPathJson).not.toContain("claude-sonnet");
    expect(customerPathJson).not.toContain(DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND);
  });

  it("projects shared cycle packets as one private review surface", async () => {
    const companyId = await seedCompany();
    const chiefOfStaffId = await seedDearMeAgent({
      companyId,
      name: "DearMe Chief of Staff",
      role: "chief_of_staff",
      updatedAt: new Date("2026-05-08T11:00:00.000Z"),
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "WB-20",
      originFingerprint: "operation-draft_content_batch",
      status: "in_review",
      updatedAt: new Date("2026-05-08T11:10:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const reportIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft weekly Dear me report",
      identifier: "WB-21",
      originFingerprint: "operation-schedule_weekly_report",
      status: "in_review",
      updatedAt: new Date("2026-05-08T11:12:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });

    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "content-drafts",
      title: "Content drafts",
      body: [
        "Channel: LinkedIn",
        "Hook: Turn the private build into proof.",
        "Draft body: A proof-backed post is ready for review.",
        "Voice fit score: 97/100 ready for review",
        "Cycle packet: The content draft and Dear me report now use the same private evidence packet.",
      ].join("\n"),
      updatedAt: new Date("2026-05-08T11:13:00.000Z"),
    });
    await attachDocument({
      companyId,
      issueId: reportIssueId,
      key: "dear-me-report",
      title: "Dear me report",
      body: [
        "Completed work: content draft packet and private report are ready in the review queue.",
        "Drafts and Assets Ready for Review: content draft packet; voice fit 97/100 ready for review.",
        "Decisions needed: Review, request changes, or regenerate the prepared work.",
        "Next bets: Pick the strongest draft and revise once from feedback.",
        "Report reference: Cycle output packet",
      ].join("\n"),
      updatedAt: new Date("2026-05-08T11:14:00.000Z"),
    });
    await db.insert(issueWorkProducts).values([
      {
        id: randomUUID(),
        companyId,
        issueId: contentIssueId,
        type: "draft",
        provider: "dearme-cycle-output",
        title: "Cycle content packet",
        url: null,
        status: "ready",
        reviewState: "pending",
        summary: "Private content packet ready for review with voice fit 97/100 ready for review.",
        updatedAt: new Date("2026-05-08T11:15:00.000Z"),
      },
      {
        id: randomUUID(),
        companyId,
        issueId: reportIssueId,
        type: "report",
        provider: "dearme-cycle-output",
        title: "Dear me report packet",
        url: null,
        status: "ready",
        reviewState: "pending",
        summary: "Private Dear me report prepared from the same cycle packet; next decision is review or revision.",
        updatedAt: new Date("2026-05-08T11:16:00.000Z"),
      },
    ]);

    const result = await dearmeWorkbenchService(db).getWorkbench(companyId);
    const contentOutputId = `${contentIssueId}:content_drafts`;
    const reportOutputId = `${reportIssueId}:weekly_report`;
    const contentDecision = result.decisionsNeeded.find((decision) => decision.outputKind === "content_drafts");
    const reportDecision = result.decisionsNeeded.find((decision) => decision.outputKind === "weekly_report");
    const contentStreamItem = result.workStream.find((item) => item.relatedOutputId === contentOutputId);
    const contentLedgerEntry = result.runLedger.find((entry) => entry.relatedOutputId === contentOutputId);

    expect(result.workReady).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contentOutputId,
          summary: expect.stringContaining("same private cycle packet"),
        }),
        expect.objectContaining({
          id: reportOutputId,
          summary: expect.stringContaining("same private cycle packet"),
        }),
      ]),
    );
    expect(contentDecision).toEqual(expect.objectContaining({
      summary: expect.stringContaining("Voice fit 97/100 ready for review"),
    }));
    expect(reportDecision).toEqual(expect.objectContaining({
      summary: expect.stringContaining("same private cycle packet"),
    }));
    expect(result.report).toEqual(expect.objectContaining({
      summary: expect.stringContaining("same private cycle packet"),
      bodyPreview: expect.stringContaining("voice fit 97/100"),
      accomplished: expect.arrayContaining([
        expect.stringContaining("same private cycle packet"),
      ]),
      decisions: expect.arrayContaining([
        expect.stringContaining("Launch-ready next step"),
      ]),
      nextBets: expect.arrayContaining([
        expect.stringContaining("single review surface"),
      ]),
    }));
    expect(contentStreamItem).toEqual(expect.objectContaining({
      sourceLabel: "Private cycle packet",
      nextAction: expect.stringContaining("proof pack"),
    }));
    expect(contentLedgerEntry).toEqual(expect.objectContaining({
      evidenceLabel: "Private cycle packet / Content drafts",
      nextAction: expect.stringContaining("public move"),
    }));
    expect(result.actionGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `artifact:${contentOutputId}`,
          summary: expect.stringContaining("same private cycle packet"),
        }),
        expect.objectContaining({
          id: `report:${reportOutputId}`,
          summary: expect.stringContaining("same private cycle packet"),
        }),
      ]),
    );

    const customerPathJson = JSON.stringify(result);
    expect(customerPathJson).not.toContain("dearme-cycle-output");
    expect(customerPathJson).not.toContain("provider");
    expect(customerPathJson).not.toContain("Paperclip");
  });

  it("projects approved private output as the next final approval handoff", async () => {
    const companyId = await seedCompany();
    const chiefOfStaffId = await seedDearMeAgent({
      companyId,
      name: "DearMe Chief of Staff",
      role: "chief_of_staff",
      updatedAt: new Date("2026-05-09T09:00:00.000Z"),
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "WB-42",
      originFingerprint: "operation-draft_content_batch",
      status: "done",
      updatedAt: new Date("2026-05-09T09:20:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const outputId = `${contentIssueId}:content_drafts`;

    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "starter-posts",
      title: "Starter posts",
      body: "Draft body: Three proof-backed posts.\nApproval gate: publish social posts.",
      updatedAt: new Date("2026-05-09T09:18:00.000Z"),
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
      reviewState: "approved",
      summary: "Three private posts are approved as useful and waiting for launch approval.",
      updatedAt: new Date("2026-05-09T09:19:00.000Z"),
    });
    const approvalId = randomUUID();
    await db.insert(approvals).values({
      id: approvalId,
      companyId,
      type: "dearme_output_next_move",
      requestedByAgentId: chiefOfStaffId,
      requestedByUserId: null,
      status: "pending",
      payload: {
        title: "Approve posts for publishing",
        summary: "DearMe marked the private drafts useful. The posts are ready for your final approval before anything public happens.",
        recommendedAction: "Publish the approved posts from this content batch.",
        nextActionOnApproval: "DearMe may publish the prepared posts through the selected channel. Nothing publishes before this approval.",
        riskGate: "publish_social",
        outputKind: "content_drafts",
        outputId,
        issueId: contentIssueId,
        issueIdentifier: "WB-42",
      },
      updatedAt: new Date("2026-05-09T09:21:00.000Z"),
    });

    const result = await dearmeWorkbenchService(db).getWorkbench(companyId);

    expect(result.decisionsNeeded).toEqual([
      expect.objectContaining({
        id: `approval:${approvalId}`,
        kind: "approve_action",
        title: "Approve posts for publishing",
        summary: expect.stringContaining("final approval"),
        riskGate: "publish_social",
        outputKind: "content_drafts",
        outputId,
        approvalId,
        issueId: contentIssueId,
        issueIdentifier: "WB-42",
        reviewLoop: null,
      }),
    ]);
    expect(result.decisionsNeeded).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `output:${outputId}`, kind: "review_output" }),
      ]),
    );
    expect(result.batchDecisions).toEqual([
      expect.objectContaining({
        id: "batch:publish_social",
        title: "Review content batch",
        riskGate: "publish_social",
        decisionIds: [`approval:${approvalId}`],
        issueIds: [contentIssueId],
        approvalIds: [approvalId],
      }),
    ]);
    expect(result.workStream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `decision:approval:${approvalId}`,
          relatedOutputId: outputId,
          issueId: contentIssueId,
          approvalId,
        }),
      ]),
    );
    expect(result.actionGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `decision:approval:${approvalId}`,
          relatedOutputId: outputId,
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("codex-local");
    expect(JSON.stringify(result)).not.toContain("provider");
    expect(JSON.stringify(result)).not.toContain("Paperclip");
    expect(JSON.stringify(result)).not.toContain("OpenClaw");
  });

  it("projects final next-move approval as a customer-safe execution receipt", async () => {
    const companyId = await seedCompany();
    const chiefOfStaffId = await seedDearMeAgent({
      companyId,
      name: "DearMe Chief of Staff",
      role: "chief_of_staff",
      updatedAt: new Date("2026-05-09T10:00:00.000Z"),
    });
    const contentIssueId = await seedIssue({
      companyId,
      title: "DearMe Draft: Draft first content batch",
      identifier: "WB-43",
      originFingerprint: "operation-draft_content_batch",
      status: "done",
      updatedAt: new Date("2026-05-09T10:20:00.000Z"),
      assigneeAgentId: chiefOfStaffId,
    });
    const outputId = `${contentIssueId}:content_drafts`;

    await attachDocument({
      companyId,
      issueId: contentIssueId,
      key: "starter-posts",
      title: "Starter posts",
      body: "Draft body: Three proof-backed posts.\nApproval gate: publish social posts.",
      updatedAt: new Date("2026-05-09T10:18:00.000Z"),
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
      reviewState: "approved",
      summary: "Three private posts are approved as useful and waiting for launch approval.",
      updatedAt: new Date("2026-05-09T10:19:00.000Z"),
    });
    const approvalId = randomUUID();
    await db.insert(approvals).values({
      id: approvalId,
      companyId,
      type: "dearme_output_next_move",
      requestedByAgentId: chiefOfStaffId,
      requestedByUserId: null,
      status: "pending",
      payload: {
        title: "Approve posts for publishing",
        summary: "The private posts are ready for final approval.",
        recommendedAction: "Publish the approved posts from this content batch.",
        nextActionOnApproval: "DearMe will prepare the channel handoff before any post goes live.",
        riskGate: "publish_social",
        outputKind: "content_drafts",
        outputId,
        issueId: contentIssueId,
        issueIdentifier: "WB-43",
        preparedTitle: "Content draft batch",
        preparedSummary: "Three private posts are approved as useful and waiting for launch approval.",
      },
      updatedAt: new Date("2026-05-09T10:21:00.000Z"),
    });

    const approvalResult = await approvalService(db).approve(approvalId, "user-1", "Final approval.");
    const receipt = await recordDearMeNextMoveApprovalReceipt(db, {
      approval: approvalResult.approval,
      actorUserId: "user-1",
      linkedIssueIds: [contentIssueId],
    });

    expect(approvalResult.applied).toBe(true);
    expect(receipt).toEqual(expect.objectContaining({
      approvalId,
      outputId,
      externalExecutionStatus: "not_run_yet",
      receiptTitle: "Final approval recorded",
      receiptSummary: expect.stringContaining("nothing has run outside DearMe yet"),
      executionReadiness: "private_handoff_ready",
      handoffTitle: "Launch-ready posting brief prepared",
      handoffSummary: expect.stringContaining("launch-ready brief"),
      handoffNextStep: expect.stringContaining("channel-ready posting brief"),
    }));

    const result = await dearmeWorkbenchService(db).getWorkbench(companyId);

    expect(result.decisionsNeeded).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ approvalId }),
        expect.objectContaining({ id: `output:${outputId}`, kind: "review_output" }),
      ]),
    );
    expect(result.recentProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "next_move_approved",
          title: "Final approval recorded",
          summary: expect.stringContaining("nothing has run outside DearMe yet"),
          outputKind: "content_drafts",
          outputId,
          riskGate: "publish_social",
          approvalId,
          issueId: contentIssueId,
          issueIdentifier: "WB-43",
        }),
        expect.objectContaining({
          kind: "execution_handoff_prepared",
          title: "Launch-ready posting brief prepared",
          summary: expect.stringContaining("launch-ready brief"),
          outputKind: "content_drafts",
          outputId,
          riskGate: "publish_social",
          approvalId,
          issueId: contentIssueId,
          issueIdentifier: "WB-43",
          executionReadiness: "private_handoff_ready",
          nextStep: expect.stringContaining("channel-ready posting brief"),
        }),
      ]),
    );
    expect(result.workStream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^progress:/),
          kind: "progress_recorded",
          cycleStage: "review",
          role: "content_producer",
          title: "Final approval recorded",
          summary: expect.stringContaining("nothing has run outside DearMe yet"),
          artifact: "Content drafts",
          status: "recorded",
          needsApproval: false,
          relatedOutputId: outputId,
          issueId: contentIssueId,
          issueIdentifier: "WB-43",
          approvalId,
        }),
        expect.objectContaining({
          id: expect.stringMatching(/^progress:/),
          kind: "progress_recorded",
          cycleStage: "work",
          role: "content_producer",
          title: "Launch-ready posting brief prepared",
          summary: expect.stringContaining("launch-ready brief"),
          artifact: "Content drafts",
          status: "recorded",
          needsApproval: false,
          sourceLabel: "Launch brief",
          costImpact: "No external action has run",
          nextAction: expect.stringContaining("channel-ready posting brief"),
          relatedOutputId: outputId,
          issueId: contentIssueId,
          issueIdentifier: "WB-43",
          approvalId,
        }),
      ]),
    );
    const receiptComments = await db
      .select({ body: issueComments.body })
      .from(issueComments)
      .where(eq(issueComments.issueId, contentIssueId));
    expect(receiptComments.map((comment) => comment.body).join("\n")).toContain(
      "DearMe final approval: recorded the next move.",
    );
    expect(receiptComments.map((comment) => comment.body).join("\n")).toContain(
      "DearMe next step: prepared the launch-ready brief.",
    );

    const customerPathJson = JSON.stringify(result);
    expect(customerPathJson).not.toContain("codex-local");
    expect(customerPathJson).not.toContain("provider");
    expect(customerPathJson).not.toContain("Paperclip");
    expect(customerPathJson).not.toContain("OpenClaw");
    expect(customerPathJson).not.toContain("setup_payload");
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
      archived: [
        expect.objectContaining({
          id: "memory-retired",
          kind: "proof_point",
          title: "Old proof",
          body: "A proof point that should no longer guide private work.",
        }),
      ],
      sourceReviewQueue: [
        expect.objectContaining({
          sourceMemoryId: "memory-active",
          sourceInputMode: "import_note",
          proposedKind: "voice_sample",
          proposedBody: "Sharper revised voice sample for future private drafts.",
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
