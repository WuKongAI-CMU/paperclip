import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  dearMeBrandBlueprintApplyRequestSchema,
  dearMeBrandBlueprintPreviewSchema,
  dearMeChiefOfStaffMessageResultSchema,
  dearMeChiefOfStaffMessageSchema,
  dearMeFirstCyclePreviewSchema,
  dearMeMemoryUpdateResultSchema,
  dearMeMemoryUpdateSchema,
  dearMeOutputReviewRequestSchema,
  dearMePaidBetaRecordSchema,
  type DearMeChiefOfStaffMessage,
  type DearMeChiefOfStaffMessageIntent,
  type DearMeMemoryUpdate,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
  agentService,
  dearmeBrandBlueprintService,
  dearmeMemoryContextService,
  dearmeOutputHandoffService,
  dearmePaidBetaAccessService,
  dearmeWorkbenchService,
  issueService,
  logActivity,
} from "../services/index.js";
import { forbidden } from "../errors.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { heartbeatService } from "../services/heartbeat.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";

function memoryBodyPreview(body: string) {
  return body.length > 700 ? `${body.slice(0, 697)}...` : body;
}

const CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND = "dearme_chief_of_staff_message";
const CHIEF_OF_STAFF_INTENT_LABELS: Record<DearMeChiefOfStaffMessageIntent, string> = {
  plan_next: "Plan next moves",
  draft_content: "Draft content",
  find_opportunities: "Find opportunities",
  refresh_portfolio: "Refresh portfolio",
  prepare_report: "Prepare report",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimTitleFragment(value: string) {
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "New DearMe request";
  return firstLine.length > 88 ? `${firstLine.slice(0, 85)}...` : firstLine;
}

function renderChiefOfStaffIssueDescription(input: DearMeChiefOfStaffMessage) {
  const intentLabel = CHIEF_OF_STAFF_INTENT_LABELS[input.intent];
  return [
    "DearMe Chief of Staff request",
    `Intent: ${intentLabel}`,
    "User brief:",
    input.message,
    "Private-work boundary:",
    "Prepare the next useful move privately. Drafts, outreach, public claims, spend, publishing, or site changes still need explicit user approval before leaving DearMe.",
  ].join("\n\n");
}

export function dearmeRoutes(db: Db) {
  const router = Router();
  const agents = agentService(db);
  const brandBlueprints = dearmeBrandBlueprintService(db);
  const memoryContext = dearmeMemoryContextService(db);
  const issues = issueService(db);
  const outputHandoff = dearmeOutputHandoffService(db);
  const paidBetaAccess = dearmePaidBetaAccessService(db);
  const workbench = dearmeWorkbenchService(db);
  const heartbeat = heartbeatService(db);

  router.get(
    "/companies/:companyId/workbench",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await workbench.getWorkbench(companyId));
    },
  );

  router.get(
    "/companies/:companyId/outputs",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await outputHandoff.listOutputs(companyId));
    },
  );

  router.post(
    "/companies/:companyId/outputs/:outputId/reviews",
    validate(dearMeOutputReviewRequestSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const outputId = req.params.outputId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const result = await outputHandoff.reviewOutput(companyId, outputId, req.body, actor);

      if (result.wakeIssue) {
        void queueIssueAssignmentWakeup({
          heartbeat,
          issue: result.wakeIssue,
          reason: result.action === "regenerate"
            ? "dearme_output_regeneration_requested"
            : "dearme_output_changes_requested",
          mutation: "dearme.output_review",
          contextSource: "dearme.output_review",
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
        });
      }

      const activityAction = result.action === "approve"
        ? "dearme.output_approved"
        : result.action === "regenerate"
          ? "dearme.output_regeneration_requested"
          : "dearme.output_changes_requested";

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: activityAction,
        entityType: "issue_comment",
        entityId: result.comment.id,
        details: {
          outputId: result.outputId,
          outputKind: result.output.kind,
          issueId: result.output.issueId,
          issueIdentifier: result.output.issueIdentifier,
          status: result.status,
          reviewAction: result.action,
        },
      });

      const { wakeIssue: _wakeIssue, ...responseBody } = result;
      res.status(responseBody.status === "queued" ? 202 : 200).json(responseBody);
    },
  );

  router.post(
    "/companies/:companyId/chief-of-staff/messages",
    validate(dearMeChiefOfStaffMessageSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const input = req.body as DearMeChiefOfStaffMessage;
      const access = await paidBetaAccess.getAccess(companyId);
      if (!access.entitlement.canStartPrivateWork) {
        throw forbidden(access.entitlement.nextActionDescription);
      }
      const agentRows = await agents.list(companyId);
      const chiefOfStaff = agentRows.find((agent) => {
        const metadata = agent.metadata;
        return isRecord(metadata) && metadata.dearmeRole === "chief_of_staff";
      }) ?? null;
      const intentLabel = CHIEF_OF_STAFF_INTENT_LABELS[input.intent];
      const issue = await issues.create(companyId, {
        title: `DearMe: ${intentLabel} - ${trimTitleFragment(input.message)}`,
        description: renderChiefOfStaffIssueDescription(input),
        status: chiefOfStaff ? "todo" : "backlog",
        priority: "high",
        assigneeAgentId: chiefOfStaff?.id ?? null,
        createdByAgentId: actor.agentId,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        originKind: CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND,
        originId: randomUUID(),
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.chief_of_staff_message",
        entityType: "issue",
        entityId: issue.id,
        details: {
          intent: input.intent,
          title: issue.title,
          identifier: issue.identifier,
          assigned: Boolean(chiefOfStaff),
        },
      });

      if (chiefOfStaff) {
        void queueIssueAssignmentWakeup({
          heartbeat,
          issue,
          reason: "dearme_chief_of_staff_message",
          mutation: "dearme.chief_of_staff_message",
          contextSource: "dearme.chief_of_staff_message",
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
        });
      }

      const responseBody = dearMeChiefOfStaffMessageResultSchema.parse({
        companyId,
        status: chiefOfStaff ? "queued" : "recorded",
        issueId: issue.id,
        issueIdentifier: issue.identifier ?? null,
        title: issue.title,
        nextStep: chiefOfStaff
          ? "Chief of Staff has the brief and will prepare the next private move for review."
          : "The brief was saved. Approve Brand OS to create the DearMe team and start private work.",
      });
      res.status(201).json(responseBody);
    },
  );

  router.post(
    "/companies/:companyId/memory-updates",
    validate(dearMeMemoryUpdateSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const input = req.body as DearMeMemoryUpdate;
      const memoryId = randomUUID();
      const createdAt = new Date().toISOString();

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: memoryId,
        details: {
          kind: input.kind,
          title: input.title,
          body: input.body,
          sourceLabel: input.sourceLabel,
        },
      });

      const cycleRefresh = await memoryContext.refreshRoutineMemoryContext(companyId, {
        userId: actor.actorType === "user" ? actor.actorId : null,
        agentId: actor.agentId,
        runId: actor.runId,
      });

      res.status(201).json(dearMeMemoryUpdateResultSchema.parse({
        companyId,
        status: "recorded",
        memory: {
          id: memoryId,
          kind: input.kind,
          title: input.title,
          bodyPreview: memoryBodyPreview(input.body),
          sourceLabel: input.sourceLabel,
          createdAt,
        },
        growthCycles: {
          checked: cycleRefresh.routineCount,
          updated: cycleRefresh.updated,
          unchanged: cycleRefresh.skipped,
          memorySources: cycleRefresh.memoryCount,
        },
      }));
    },
  );

  router.get(
    "/companies/:companyId/paid-beta/access",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await paidBetaAccess.getAccess(companyId));
    },
  );

  router.post(
    "/companies/:companyId/paid-beta/access-events",
    validate(dearMePaidBetaRecordSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const result = await paidBetaAccess.recordPayment(companyId, req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.paid_beta_payment_recorded",
        entityType: "finance_event",
        entityId: result.event.id,
        details: {
          amountCents: result.event.amountCents,
          currency: result.event.currency,
          status: result.access.status,
          netPaidCents: result.access.netPaidCents,
        },
      });

      res.status(201).json(result);
    },
  );

  router.post(
    "/companies/:companyId/first-cycle/preview",
    validate(dearMeFirstCyclePreviewSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await brandBlueprints.previewFirstCycle(companyId, req.body));
    },
  );

  router.post(
    "/companies/:companyId/brand-blueprints/preview",
    validate(dearMeBrandBlueprintPreviewSchema),
    (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(brandBlueprints.preview(companyId, req.body));
    },
  );

  router.post(
    "/companies/:companyId/brand-blueprints/apply-requests",
    validate(dearMeBrandBlueprintApplyRequestSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const access = await paidBetaAccess.getAccess(companyId);
      if (!access.entitlement.canRequestBrandOsApproval) {
        throw forbidden(access.entitlement.nextActionDescription);
      }
      const result = await brandBlueprints.createApplyRequest(companyId, req.body, actor);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.brand_blueprint_apply_requested",
        entityType: "approval",
        entityId: result.approval.id,
        details: {
          riskGateCount: result.summary.riskGateCount,
          teamMemberCount: result.summary.teamMemberCount,
          warningCount: result.warnings.length,
        },
      });

      res.status(201).json(result);
    },
  );

  return router;
}
