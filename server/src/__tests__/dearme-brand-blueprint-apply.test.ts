import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agentApiKeys,
  agents,
  approvals,
  companies,
  createDb,
  companySecrets,
  issueDocuments,
  issues,
  routineTriggers,
  routines,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import {
  DEARME_SIX_HOUR_CYCLE_CRON,
  DEARME_SIX_HOUR_CYCLE_TIMEZONE,
  DEARME_SIX_HOUR_GROWTH_ROUTINE,
} from "@paperclipai/dearme-agent-prompts";
import { approvalService } from "../services/approvals.js";
import {
  DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_TYPE,
  DEARME_BRAND_BLUEPRINT_INVALID_APPROVAL_MESSAGE,
  DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
} from "../services/dearme-brand-blueprint-apply.js";
import { dearmeBrandBlueprintService } from "../services/dearme-brand-blueprints.js";
import { documentService } from "../services/documents.js";
import { dearmeOutputHandoffService } from "../services/dearme-output-handoff.js";
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

function expectTextBefore(text: string | null | undefined, first: string, second: string) {
  const body = text ?? "";
  expect(body).toContain(first);
  expect(body).toContain(second);
  expect(body.indexOf(first)).toBeLessThan(body.indexOf(second));
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
    const [
      agentRows,
      routineRows,
      triggerRows,
      issueRows,
      issueDocumentRows,
      activityRows,
      secretRows,
      keyRows,
    ] =
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
        db.select().from(companySecrets).where(eq(companySecrets.companyId, companyId)),
        db.select().from(agentApiKeys).where(eq(agentApiKeys.companyId, companyId)),
      ]);
    return {
      agents: agentRows,
      routines: routineRows,
      triggers: triggerRows,
      issues: issueRows,
      issueDocuments: issueDocumentRows,
      activity: activityRows,
      secrets: secretRows,
      keys: keyRows,
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
    const agentsByRole = new Map(artifacts.agents.map((agent) => [agent.role, agent]));
    const chiefOfStaff = agentsByRole.get("chief_of_staff");
    expect(chiefOfStaff).toBeTruthy();
    expect((chiefOfStaff?.adapterConfig as any).dearmeExecutionTemplate).toEqual(
      expect.objectContaining({
        role: "chief_of_staff",
        executionLane: "direct",
        workspaceMode: "local",
      }),
    );
    expect((chiefOfStaff?.runtimeConfig as any).heartbeat).toEqual(
      expect.objectContaining({
        enabled: true,
        cadenceHours: 2,
        maxConcurrentRuns: 1,
        wakeOnDemand: true,
      }),
    );
    expect((chiefOfStaff?.runtimeConfig as any).dearmeExecutionTemplate).toEqual(
      expect.objectContaining({
        role: "chief_of_staff",
        executionLane: "direct",
        workspaceMode: "local",
        heartbeatCadenceHours: 2,
      }),
    );
    expect((chiefOfStaff?.adapterConfig as any).env).toEqual(
      expect.objectContaining({
        DEARME_PROXY_API_KEY: expect.objectContaining({
          type: "secret_ref",
          version: "latest",
        }),
      }),
    );
    expect(chiefOfStaff?.metadata).toEqual(
      expect.objectContaining({
        dearmeRole: "chief_of_staff",
        executionLane: "direct",
        workspaceMode: "local",
        heartbeatCadenceHours: 2,
      }),
    );
    const workerAgents = artifacts.agents.filter((agent) => agent.role !== "chief_of_staff");
    expect(workerAgents).toHaveLength(6);
    expect(
      workerAgents.every(
        (agent) =>
          (agent.adapterConfig as any).dearmeExecutionTemplate?.executionLane === "worker" &&
          (agent.adapterConfig as any).dearmeExecutionTemplate?.workspaceMode === "remote" &&
          (agent.runtimeConfig as any).heartbeat?.cadenceHours === 8 &&
          (agent.runtimeConfig as any).dearmeExecutionTemplate?.heartbeatCadenceHours === 8 &&
          (agent.metadata as any).executionLane === "worker" &&
          (agent.metadata as any).workspaceMode === "remote" &&
          (agent.metadata as any).heartbeatCadenceHours === 8,
      ),
    ).toBe(true);
    expect(artifacts.agents.every((agent) => (agent.permissions as any).canCreateAgents === false)).toBe(true);
    expect(
      artifacts.agents.every((agent) => (agent.metadata as any).externalActionsRequireApproval === true),
    ).toBe(true);
    expect(artifacts.secrets).toHaveLength(1);
    expect(artifacts.secrets[0]).toEqual(
      expect.objectContaining({
        name: "dearme-chief-of-staff-proxy-key",
        provider: "local_encrypted",
        description: "Backstage DearMe team access for the Chief of Staff agent.",
      }),
    );
    expect(artifacts.keys).toHaveLength(1);
    expect(artifacts.keys[0]).toEqual(
      expect.objectContaining({
        name: "dearme-proxy",
        agentId: chiefOfStaff?.id,
      }),
    );

    expect(artifacts.routines).toHaveLength(5);
    expect(artifacts.triggers).toHaveLength(5);
    expect(artifacts.triggers.every((trigger) => trigger.enabled)).toBe(true);
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
    const sixHourRoutine = artifacts.routines.find(
      (routine) => routine.title === DEARME_SIX_HOUR_GROWTH_ROUTINE.title,
    );
    expect(sixHourRoutine).toBeTruthy();
    expect(sixHourRoutine?.priority).toBe("high");
    expect(sixHourRoutine?.assigneeAgentId).toBeTruthy();
    expect(sixHourRoutine?.description).toContain("Run the six-hour DearMe growth cycle for Peter.");
    expect(sixHourRoutine?.description).toContain("- plan:");
    expect(sixHourRoutine?.description).toContain("- work:");
    expect(sixHourRoutine?.description).toContain("- review:");
    expect(sixHourRoutine?.description).toContain("- learn:");
    expect(sixHourRoutine?.description).toContain("- report:");
    expect(sixHourRoutine?.description).toContain('short "Dear me" report under 200 words');
    expect(sixHourRoutine?.description).not.toContain("Paperclip");
    const sixHourTrigger = artifacts.triggers.find((trigger) => trigger.routineId === sixHourRoutine?.id);
    expect(sixHourTrigger).toEqual(
      expect.objectContaining({
        label: DEARME_SIX_HOUR_GROWTH_ROUTINE.triggers[0]?.label,
        cronExpression: DEARME_SIX_HOUR_CYCLE_CRON,
        timezone: DEARME_SIX_HOUR_CYCLE_TIMEZONE,
      }),
    );
    const weeklyTriggers = artifacts.triggers.filter((trigger) => trigger.id !== sixHourTrigger?.id);
    expect(weeklyTriggers).toHaveLength(4);
    expect(weeklyTriggers.map((trigger) => trigger.cronExpression)).toEqual(Array(4).fill("0 14 * * 1"));

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
        "DearMe: Review private team profile for Peter",
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
    expect(draftIssues.every((issue) => issue.description?.includes("Proof to use:") ?? false)).toBe(true);
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
    expectTextBefore(contentIssue?.description, "Voice samples for tone review:", "Proof to use:");
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
    expectTextBefore(portfolioIssue?.description, "Proof to use:", "Voice samples for tone review:");
    const opportunityIssue = artifacts.issues.find((issue) => issue.title === "DearMe Draft: Draft opportunity list");
    expect(opportunityIssue?.description).toContain("Opportunity scope:");
    expect(opportunityIssue?.description).toContain("Identify and prioritize outbound opportunities");
    expectTextBefore(opportunityIssue?.description, "Audiences to write for:", "Offers to keep available:");
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
    expectTextBefore(reportIssue?.description, "Goals to serve:", "Proof to use:");

    const brandOsIssue = artifacts.issues.find((issue) => issue.title === "DearMe: Review private team profile for Peter");
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
    expect(reportDocuments[0]?.body).toContain("private first-week work lanes were created");
    expect(reportDocuments[0]?.body).toContain("Content: 5 private starter posts seeded for review.");
    expect(reportDocuments[0]?.body).toContain(
      "Opportunity: five-target shortlist held for send approval, first lead for founders evaluating local AI workflows.",
    );
    expect(reportDocuments[0]?.body).toContain(
      "Portfolio: Homepage proof section proof copy held for deploy approval.",
    );
    expect(reportDocuments[0]?.body).toContain("## Decisions Needed");
    expect(reportDocuments[0]?.body).toContain(
      "Review the seeded content, opportunity, and portfolio briefs before approving any public, send, or deploy action.",
    );
    expect(reportDocuments[0]?.body).not.toContain("No reviewable drafts have been reported yet.");

    const contentDocuments = await documentService(db).listIssueDocuments(contentIssue!.id);
    expect(contentDocuments.map((document) => document.key)).toEqual(["starter-posts"]);
    expect(contentDocuments[0]?.title).toBe("Starter posts");
    expect(contentDocuments[0]?.body).toContain("Status: Private first-week seed brief");
    expect(contentDocuments[0]?.body).toContain("The positioning to test this week");
    expect(contentDocuments[0]?.body).toContain("Publish social post");
    expect(contentDocuments[0]?.body).not.toContain("A private draft");
    expect(contentDocuments[0]?.body).toContain("Voice fit score:");
    const opportunityDocuments = await documentService(db).listIssueDocuments(opportunityIssue!.id);
    expect(opportunityDocuments.map((document) => document.key)).toEqual(["opportunity-list"]);
    expect(opportunityDocuments[0]?.title).toBe("Opportunity list");
    expect(opportunityDocuments[0]?.body).toContain("## Shortlist overview");
    expect(opportunityDocuments[0]?.body).toContain("Lead 5: Warm intro lead");
    expect(opportunityDocuments[0]?.body).toContain("Trusted Operator Intro List");
    expect(opportunityDocuments[0]?.body).toContain("Verification status: unavailable");
    expect(opportunityDocuments[0]?.body).toContain("Contact record: No direct contact record yet");
    expect(opportunityDocuments[0]?.body).toContain("Source signal:");
    expect(opportunityDocuments[0]?.body).toContain("Fit reason:");
    expect(opportunityDocuments[0]?.body).toContain("Relevance score: 8/10 starter hypothesis");
    expect(opportunityDocuments[0]?.body).toContain("First message:");
    expect(opportunityDocuments[0]?.body).toContain("I am reaching out because");
    expect(opportunityDocuments[0]?.body).toContain("Approval gate: Send approval required");
    const portfolioDocuments = await documentService(db).listIssueDocuments(portfolioIssue!.id);
    expect(portfolioDocuments.map((document) => document.key)).toEqual(["portfolio-update"]);
    expect(portfolioDocuments[0]?.title).toBe("Portfolio update");
    expect(portfolioDocuments[0]?.body).toContain("Portfolio proof update");
    expect(portfolioDocuments[0]?.body).toContain("Deploy public site update");
    expect(portfolioDocuments[0]?.body).toContain("Recent proof:");

    const outputs = await dearmeOutputHandoffService(db).listOutputs(companyId);
    const outputByKind = new Map(outputs.outputs.map((output) => [output.kind, output]));
    expect(outputByKind.get("content_drafts")).toEqual(
      expect.objectContaining({
        status: "ready_for_review",
        isReviewable: true,
      }),
    );
    expect(outputByKind.get("content_drafts")?.documents.map((document) => document.key)).toEqual(["starter-posts"]);
    expect(outputByKind.get("content_drafts")?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "draft_body", value: expect.stringContaining("positioning to test") }),
        expect.objectContaining({ kind: "proof_used", value: expect.stringContaining("approval gates") }),
        expect.objectContaining({ kind: "approval_gate", value: expect.stringContaining("Publish") }),
      ]),
    );
    expect(outputByKind.get("opportunity_drafts")).toEqual(
      expect.objectContaining({
        status: "ready_for_review",
        isReviewable: true,
      }),
    );
    expect(outputByKind.get("opportunity_drafts")?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "draft_message",
          value: expect.stringContaining("I am reaching out because"),
        }),
      ]),
    );
    expect(outputByKind.get("portfolio_update")).toEqual(
      expect.objectContaining({
        status: "ready_for_review",
        isReviewable: true,
      }),
    );
    expect(outputByKind.get("portfolio_update")?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "proposed_copy",
          value: expect.stringContaining("Recent proof"),
        }),
      ]),
    );

    expect(artifacts.issueDocuments).toHaveLength(7);
    expect(artifacts.activity).toHaveLength(1);
    expect(artifacts.activity[0]?.details).toEqual(
      expect.objectContaining({
        agents: expect.arrayContaining([expect.objectContaining({ role: "chief_of_staff" })]),
        routines: expect.arrayContaining([
          expect.objectContaining({ title: DEARME_SIX_HOUR_GROWTH_ROUTINE.title }),
        ]),
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
    expect(artifacts.issueDocuments).toHaveLength(4);
    expect(artifacts.issues.every((issue) => issue.status === "backlog")).toBe(true);
    expect(artifacts.issues.every((issue) => Boolean(issue.assigneeAgentId))).toBe(true);
    const reportIssue = artifacts.issues.find((issue) => issue.title === "DearMe Draft: Draft weekly Dear me report");
    expect(reportIssue).toBeTruthy();
    const reportDocuments = await documentService(db).listIssueDocuments(reportIssue!.id);
    expect(reportDocuments.map((document) => document.key)).toEqual(["dear-me-report"]);
    expect(reportDocuments[0]?.body).toContain("No reviewable drafts have been reported yet.");
  });

  it("keeps invalid Brand OS approvals pending with customer-safe preflight errors", async () => {
    const companyId = await seedCompany();
    const approvalId = randomUUID();
    const approvalsSvc = approvalService(db);

    await db.insert(approvals).values({
      id: approvalId,
      companyId,
      type: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      requestedByUserId: "user-1",
      requestedByAgentId: null,
      status: "pending",
      payload: {
        summary: "Legacy malformed payload",
        setup_payload: { adapterType: "codex_local" },
      },
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    let caught: unknown;
    try {
      await approvalsSvc.approve(approvalId, "user-1", "approved");
    } catch (err) {
      caught = err;
    }

    expect(caught).toMatchObject({
      status: 422,
      message: DEARME_BRAND_BLUEPRINT_INVALID_APPROVAL_MESSAGE,
    });
    expect((caught as { details?: unknown }).details).toBeUndefined();

    const [approval] = await db.select().from(approvals).where(eq(approvals.id, approvalId));
    expect(approval?.status).toBe("pending");
    expect(approval?.decisionNote).toBeNull();
    expect(approval?.decidedByUserId).toBeNull();
    expect(approval?.decidedAt).toBeNull();

    const artifacts = await countAppliedArtifacts(companyId);
    expect(artifacts.agents).toHaveLength(0);
    expect(artifacts.routines).toHaveLength(0);
    expect(artifacts.triggers).toHaveLength(0);
    expect(artifacts.issues).toHaveLength(0);
    expect(artifacts.issueDocuments).toHaveLength(0);
    expect(artifacts.activity).toHaveLength(0);
  });
});
