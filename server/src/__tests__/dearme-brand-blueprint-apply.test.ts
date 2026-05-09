import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  approvals,
  companies,
  createDb,
  issueDocuments,
  issues,
  routineTriggers,
  routines,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { approvalService } from "../services/approvals.js";
import { DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_TYPE } from "../services/dearme-brand-blueprint-apply.js";
import { dearmeBrandBlueprintService } from "../services/dearme-brand-blueprints.js";
import { documentService } from "../services/documents.js";
import { instanceSettingsService } from "../services/instance-settings.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;
const expectedDearMeCodexExtraArgs = [
  "--sandbox",
  "workspace-write",
  "-c",
  "sandbox_workspace_write.network_access=true",
  "--skip-git-repo-check",
];

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe brand blueprint apply tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `DM${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

describeEmbeddedPostgres("DearMe brand blueprint approved apply", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-brand-blueprint-apply-");
    db = createDb(tempDb.connectionString);
  }, 30_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies", "instance_settings" CASCADE`));
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

  async function countAppliedArtifacts(companyId: string) {
    const [agentRows, routineRows, triggerRows, issueRows, issueDocumentRows, activityRows] =
      await Promise.all([
        db.select().from(agents).where(eq(agents.companyId, companyId)),
        db.select().from(routines).where(eq(routines.companyId, companyId)),
        db.select().from(routineTriggers).where(eq(routineTriggers.companyId, companyId)),
        db
          .select()
          .from(issues)
          .where(and(eq(issues.companyId, companyId), eq(issues.originKind, "dearme_brand_blueprint_apply"))),
        db.select().from(issueDocuments).where(eq(issueDocuments.companyId, companyId)),
        db
          .select()
          .from(activityLog)
          .where(and(eq(activityLog.companyId, companyId), eq(activityLog.action, "dearme.brand_blueprint_applied"))),
      ]);
    return {
      agents: agentRows,
      routines: routineRows,
      triggers: triggerRows,
      issues: issueRows,
      issueDocuments: issueDocumentRows,
      activity: activityRows,
    };
  }

  it("creates private Brand OS artifacts and does not reapply on approval retries", async () => {
    await instanceSettingsService(db).updateExperimental({ enableIsolatedWorkspaces: true });
    const companyId = await seedCompany();
    const requestSvc = dearmeBrandBlueprintService(db);
    const approvalsSvc = approvalService(db);

    const applyRequest = await requestSvc.createApplyRequest(
      companyId,
      {
        brand: {
          displayName: "Peter",
          goals: ["Build visible proof"],
          audiences: ["founders evaluating local AI workflows"],
          proofPoints: ["Launched a local runtime with approval gates"],
          offers: ["paid beta personal brand growth"],
          voiceSamples: ["Direct and precise.", "Evidence first."],
          preferredChannels: ["linkedin", "portfolio"],
          constraints: ["No public posts without approval"],
          cadence: "weekly",
          budgetMonthlyCents: 25_000,
          autoDraftEnabled: true,
        },
        approvalNote: "Private drafts first.",
      },
      { actorType: "user", actorId: "user-1", agentId: null },
    );

    const result = await approvalsSvc.approve(applyRequest.approval.id, "user-1", "approved");

    expect(result.applied).toBe(true);
    expect(result.approval.status).toBe("approved");

    const artifacts = await countAppliedArtifacts(companyId);
    expect(artifacts.agents).toHaveLength(7);
    expect(artifacts.agents.map((agent) => agent.status)).toEqual(Array(7).fill("idle"));
    expect(artifacts.agents.every((agent) => agent.name.startsWith("DearMe "))).toBe(true);
    expect(
      artifacts.agents.every((agent) => agent.adapterType === DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_TYPE),
    ).toBe(true);
    expect(
      artifacts.agents.every((agent) => (agent.adapterConfig as any).model === "gpt-5.3-codex"),
    ).toBe(true);
    expect(
      artifacts.agents.every((agent) => (agent.adapterConfig as any).dangerouslyBypassApprovalsAndSandbox === false),
    ).toBe(true);
    expect(
      artifacts.agents.every(
        (agent) =>
          JSON.stringify((agent.adapterConfig as any).extraArgs) ===
          JSON.stringify(expectedDearMeCodexExtraArgs),
      ),
    ).toBe(true);
    expect(
      artifacts.agents.every((agent) => (agent.runtimeConfig as any).heartbeat?.maxConcurrentRuns === 1),
    ).toBe(true);
    expect(artifacts.agents.every((agent) => (agent.permissions as any).canCreateAgents === false)).toBe(true);
    expect(
      artifacts.agents.every((agent) => (agent.metadata as any).externalActionsRequireApproval === true),
    ).toBe(true);

    expect(artifacts.routines).toHaveLength(4);
    expect(artifacts.triggers).toHaveLength(4);
    expect(artifacts.triggers.every((trigger) => trigger.enabled)).toBe(true);
    expect(artifacts.triggers.map((trigger) => trigger.cronExpression)).toEqual(Array(4).fill("0 14 * * 1"));
    expect(artifacts.routines.every((routine) => routine.description?.includes("Voice & Memory context:") ?? false))
      .toBe(true);
    expect(artifacts.routines.every((routine) => routine.description?.includes("Direct and precise.") ?? false)).toBe(
      true,
    );
    expect(
      artifacts.routines.every(
        (routine) => routine.description?.includes("founders evaluating local AI workflows") ?? false,
      ),
    ).toBe(true);
    expect(
      artifacts.routines.every((routine) => routine.description?.includes("No public posts without approval") ?? false),
    ).toBe(true);
    expect(artifacts.routines.every((routine) => routine.description?.includes("Operating boundary:") ?? false)).toBe(
      true,
    );

    expect(artifacts.issues).toHaveLength(6);
    expect(
      artifacts.issues.every((issue) => (issue.assigneeAdapterOverrides as any)?.modelProfile === "cheap"),
    ).toBe(true);
    expect(
      artifacts.issues.every((issue) => (issue.assigneeAdapterOverrides as any)?.useProjectWorkspace === false),
    ).toBe(true);
    expect(
      artifacts.issues.every(
        (issue) =>
          (issue.assigneeAdapterOverrides as any)?.adapterConfig?.dangerouslyBypassApprovalsAndSandbox === false,
      ),
    ).toBe(true);
    expect(
      artifacts.issues.every(
        (issue) =>
          JSON.stringify((issue.assigneeAdapterOverrides as any)?.adapterConfig?.extraArgs) ===
          JSON.stringify(expectedDearMeCodexExtraArgs),
      ),
    ).toBe(true);
    expect(
      artifacts.issues.every((issue) => (issue.executionWorkspaceSettings as any)?.mode === "agent_default"),
    ).toBe(true);
    expect(artifacts.issues.map((issue) => issue.title)).toEqual(
      expect.arrayContaining([
        "DearMe: Review Brand OS for Peter",
        "DearMe Draft: Seed voice profile",
        "DearMe Draft: Draft first content batch",
        "DearMe Draft: Draft opportunity list",
        "DearMe Draft: Prepare portfolio update",
        "DearMe Draft: Draft weekly Dear me report",
      ]),
    );
    expect(
      artifacts.issues.find((issue) => issue.title === "DearMe Draft: Seed voice profile")?.assigneeAgentId,
    ).toBeTruthy();
    expect(artifacts.issues.find((issue) => issue.title === "DearMe Draft: Seed voice profile")?.status).toBe(
      "backlog",
    );
    const contentIssue = artifacts.issues.find(
      (issue) => issue.title === "DearMe Draft: Draft first content batch",
    );
    expect(contentIssue?.status).toBe("todo");
    expect(contentIssue?.assigneeAgentId).toBeTruthy();
    expect(
      artifacts.issues
        .filter((issue) => issue.id !== contentIssue?.id)
        .every((issue) => issue.status === "backlog"),
    ).toBe(true);
    expect(
      artifacts.issues
        .filter((issue) => issue.id !== contentIssue?.id)
        .every((issue) => Boolean(issue.assigneeAgentId)),
    ).toBe(true);
    const draftIssues = artifacts.issues.filter((issue) => issue.title.startsWith("DearMe Draft:"));
    expect(draftIssues.every((issue) => issue.description?.includes("Voice & Memory context:") ?? false)).toBe(
      true,
    );
    expect(draftIssues.every((issue) => issue.description?.includes("Voice guidance:") ?? false)).toBe(true);
    expect(draftIssues.every((issue) => issue.description?.includes("Goals to serve:") ?? false)).toBe(true);
    expect(draftIssues.every((issue) => issue.description?.includes("Audiences to write for:") ?? false)).toBe(
      true,
    );
    expect(draftIssues.every((issue) => issue.description?.includes("Offers to keep available:") ?? false)).toBe(
      true,
    );
    expect(draftIssues.every((issue) => issue.description?.includes("Voice samples for tone review:") ?? false)).toBe(
      true,
    );
    expect(draftIssues.every((issue) => issue.description?.includes("Constraints and boundaries:") ?? false)).toBe(
      true,
    );
    expect(contentIssue?.description).toContain("Build visible proof");
    expect(contentIssue?.description).toContain("founders evaluating local AI workflows");
    expect(contentIssue?.description).toContain("paid beta personal brand growth");
    expect(contentIssue?.description).toContain("Direct and precise.");
    expect(contentIssue?.description).toContain("Evidence first.");
    expect(contentIssue?.description).toContain("No public posts without approval");
    expect(
      artifacts.issues
        .filter((issue) => issue.title.startsWith("DearMe Draft:"))
        .every((issue) => issue.description?.includes("Do not publish, send, deploy, spend") ?? false),
    ).toBe(true);
    expect(
      artifacts.issues
        .filter((issue) => issue.title.startsWith("DearMe Draft:"))
        .every(
          (issue) =>
            issue.description?.includes(
              "not a product codebase maintenance task",
            ) ?? false,
        ),
    ).toBe(true);
    expect(
      artifacts.issues
        .filter((issue) => issue.title.startsWith("DearMe Draft:"))
        .every((issue) => !(issue.description?.includes("not a Paperclip") ?? false)),
    ).toBe(true);
    expect(
      artifacts.issues
        .filter((issue) => issue.title.startsWith("DearMe Draft:"))
        .every((issue) => issue.description?.includes("Do not modify repository source") ?? false),
    ).toBe(true);
    expect(contentIssue?.description).toContain("Content scope:");
    expect(contentIssue?.description).toContain("personal-brand content");
    expect(contentIssue?.description).toContain("Do not draft generic greeting-card");
    const portfolioIssue = artifacts.issues.find((issue) => issue.title === "DearMe Draft: Prepare portfolio update");
    expect(portfolioIssue?.description).toContain("Portfolio scope:");
    expect(portfolioIssue?.description).toContain("6-page personal portfolio draft structure");
    expect(portfolioIssue?.description).toContain("Keep tone and claims aligned with the brand voice guidance");
    const opportunityIssue = artifacts.issues.find((issue) => issue.title === "DearMe Draft: Draft opportunity list");
    expect(opportunityIssue?.description).toContain("Opportunity scope:");
    expect(opportunityIssue?.description).toContain("Identify and prioritize outbound opportunities");
    const reportIssue = artifacts.issues.find((issue) => issue.title === "DearMe Draft: Draft weekly Dear me report");
    expect(reportIssue).toBeTruthy();
    expect(reportIssue?.description).toContain("Weekly report scope:");
    expect(reportIssue?.description).toContain("attached `dear-me-report` document");
    expect(reportIssue?.description).toContain("durable report surface");
    expect(reportIssue?.description).toContain(
      "do not satisfy this operation with only a standalone workspace file",
    );
    expect(reportIssue?.description).toContain("standalone workspace files are supporting scratch only");
    expect(reportIssue?.description).not.toContain(
      "issue thread, attached documents, or agent workspace",
    );
    expect(reportIssue?.description).toContain("completed work, draft deliverables, decisions needed");

    const brandOsIssue = artifacts.issues.find((issue) => issue.title === "DearMe: Review Brand OS for Peter");
    expect(brandOsIssue).toBeTruthy();
    const brandOsDocuments = await documentService(db).listIssueDocuments(brandOsIssue!.id);
    expect(brandOsDocuments.map((document) => document.key).sort()).toEqual([
      "approval-gates",
      "brand-os",
      "voice-profile",
    ]);
    expect(brandOsDocuments.find((document) => document.key === "brand-os")?.body).toContain(
      "No public posts without approval",
    );

    const reportDocuments = await documentService(db).listIssueDocuments(reportIssue!.id);
    expect(reportDocuments.map((document) => document.key)).toEqual(["dear-me-report"]);
    expect(reportDocuments[0]?.title).toBe("Dear me report");
    expect(reportDocuments[0]?.body).toContain("# Dear me report: Peter");
    expect(reportDocuments[0]?.body).toContain("## Voice & Memory Context");
    expect(reportDocuments[0]?.body).toContain("Direct and precise.");
    expect(reportDocuments[0]?.body).toContain("paid beta personal brand growth");
    expect(reportDocuments[0]?.body).toContain("## Work Completed");
    expect(reportDocuments[0]?.body).toContain("## Decisions Needed");

    expect(artifacts.issueDocuments).toHaveLength(4);
    expect(artifacts.activity).toHaveLength(1);
    expect(artifacts.activity[0]?.details).toEqual(
      expect.objectContaining({
        agents: expect.arrayContaining([expect.objectContaining({ role: "chief_of_staff" })]),
        issues: expect.arrayContaining([
          expect.objectContaining({ operationId: "draft_content_batch", status: "todo" }),
          expect.objectContaining({ operationId: "seed_voice_profile", status: "backlog" }),
        ]),
        gatedOperations: expect.arrayContaining([
          expect.objectContaining({ id: "seed_voice_profile", gate: "sensitive_material" }),
          expect.objectContaining({ id: "draft_content_batch", gate: "publish_social" }),
          expect.objectContaining({ id: "draft_opportunity_list", gate: "send_email" }),
        ]),
      }),
    );

    const retryResult = await approvalsSvc.approve(applyRequest.approval.id, "user-1", "retry");
    expect(retryResult.applied).toBe(false);

    const afterRetry = await countAppliedArtifacts(companyId);
    expect(afterRetry.agents).toHaveLength(artifacts.agents.length);
    expect(afterRetry.routines).toHaveLength(artifacts.routines.length);
    expect(afterRetry.triggers).toHaveLength(artifacts.triggers.length);
    expect(afterRetry.issues).toHaveLength(artifacts.issues.length);
    expect(afterRetry.issueDocuments).toHaveLength(artifacts.issueDocuments.length);
    expect(afterRetry.activity).toHaveLength(artifacts.activity.length);

    const approvalRows = await db.select().from(approvals).where(eq(approvals.id, applyRequest.approval.id));
    expect(approvalRows[0]?.status).toBe("approved");
  });

  it("keeps every seeded first-operation issue queued when auto drafts are disabled", async () => {
    const companyId = await seedCompany();
    const requestSvc = dearmeBrandBlueprintService(db);
    const approvalsSvc = approvalService(db);

    const applyRequest = await requestSvc.createApplyRequest(
      companyId,
      {
        brand: {
          displayName: "Peter",
          goals: ["Build visible proof"],
          audiences: ["founders evaluating local AI workflows"],
          proofPoints: ["Launched a local runtime with approval gates"],
          offers: ["paid beta personal brand growth"],
          voiceSamples: ["Direct and precise.", "Evidence first."],
          preferredChannels: ["linkedin", "portfolio"],
          constraints: ["No public posts without approval"],
          cadence: "weekly",
          budgetMonthlyCents: 25_000,
          autoDraftEnabled: false,
        },
        approvalNote: "Queue drafts until I choose a lane.",
      },
      { actorType: "user", actorId: "user-1", agentId: null },
    );

    expect((applyRequest.approval.payload as any).autoDraftEnabled).toBe(false);

    const result = await approvalsSvc.approve(applyRequest.approval.id, "user-1", "approved");
    expect(result.applied).toBe(true);

    const artifacts = await countAppliedArtifacts(companyId);
    expect(artifacts.issues).toHaveLength(6);
    expect(artifacts.issues.every((issue) => issue.status === "backlog")).toBe(true);
    expect(artifacts.issues.every((issue) => Boolean(issue.assigneeAgentId))).toBe(true);
  });
});
