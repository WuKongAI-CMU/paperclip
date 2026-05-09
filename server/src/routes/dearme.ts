import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  dearMeBrandBlueprintApplyRequestSchema,
  dearMeBrandBlueprintPreviewSchema,
  dearMeChiefOfStaffMessageResultSchema,
  dearMeChiefOfStaffMessageSchema,
  dearMeFirstCyclePreviewSchema,
  dearMeMemoryArchiveResultSchema,
  dearMeMemoryUpdateResultSchema,
  dearMeMemoryUpdateSchema,
  dearMeOutputContinuationRequestSchema,
  dearMeOutputReviewRequestSchema,
  dearMePaidBetaRecordSchema,
  type DearMeChiefOfStaffMessage,
  type DearMeChiefOfStaffMessageIntent,
  type DearMeMemoryUpdate,
  type DearMeOutputContinuationIntent,
  type DearMeOutputReviewAction,
  type DearMeOutputReviewRequest,
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
import { describeDearMePrivateCycleBlocker } from "../services/dearme-paid-beta-access.js";
import { forbidden } from "../errors.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { heartbeatService } from "../services/heartbeat.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";

function memoryBodyPreview(body: string) {
  return body.length > 700 ? `${body.slice(0, 697)}...` : body;
}

const CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND = "dearme_chief_of_staff_message";
const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const DEARME_MEMORY_ARCHIVED_ACTION = "dearme.memory_archived";
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

function startsDearMePrivateCycle(action: DearMeOutputReviewAction) {
  return action !== "approve";
}

function dearMeOutputReviewActionForContinuation(
  intent: DearMeOutputContinuationIntent,
): Exclude<DearMeOutputReviewAction, "approve"> {
  if (intent === "continue_revision") return "request_changes";
  if (intent === "prepare_another_pass") return "regenerate";
  return "not_useful";
}

function defaultDearMeContinuationNote(intent: DearMeOutputContinuationIntent) {
  if (intent === "continue_revision") {
    return "Continue with these changes and prepare the next private version.";
  }
  if (intent === "prepare_another_pass") {
    return "Prepare another private pass for review.";
  }
  return "Use this feedback to choose a clearer direction before the next private version.";
}

function dearMeOutputWakeReason(action: DearMeOutputReviewAction) {
  if (action === "regenerate") return "dearme_output_regeneration_requested";
  if (action === "not_useful") return "dearme_output_marked_not_useful";
  return "dearme_output_changes_requested";
}

function dearMeOutputActivityAction(action: DearMeOutputReviewAction) {
  if (action === "approve") return "dearme.output_approved";
  if (action === "regenerate") return "dearme.output_regeneration_requested";
  if (action === "not_useful") return "dearme.output_marked_not_useful";
  return "dearme.output_changes_requested";
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

  async function recordDearMeOutputReview(input: {
    companyId: string;
    outputId: string;
    request: DearMeOutputReviewRequest;
    actor: ReturnType<typeof getActorInfo>;
    mutation: "dearme.output_review" | "dearme.output_continue";
    contextSource: "dearme.output_review" | "dearme.output_continue";
    continuationIntent?: DearMeOutputContinuationIntent;
  }) {
    if (startsDearMePrivateCycle(input.request.action)) {
      const access = await paidBetaAccess.getAccess(input.companyId);
      const privateCycleBlocker = describeDearMePrivateCycleBlocker(access);
      if (privateCycleBlocker) {
        throw forbidden(privateCycleBlocker);
      }
    }

    const result = await outputHandoff.reviewOutput(
      input.companyId,
      input.outputId,
      input.request,
      input.actor,
    );

    if (result.wakeIssue) {
      void queueIssueAssignmentWakeup({
        heartbeat,
        issue: result.wakeIssue,
        reason: dearMeOutputWakeReason(result.action),
        mutation: input.mutation,
        contextSource: input.contextSource,
        requestedByActorType: input.actor.actorType,
        requestedByActorId: input.actor.actorId,
      });
    }

    await logActivity(db, {
      companyId: input.companyId,
      actorType: input.actor.actorType,
      actorId: input.actor.actorId,
      agentId: input.actor.agentId,
      runId: input.actor.runId,
      action: dearMeOutputActivityAction(result.action),
      entityType: "issue_comment",
      entityId: result.comment.id,
      details: {
        outputId: result.outputId,
        outputKind: result.output.kind,
        issueId: result.output.issueId,
        issueIdentifier: result.output.issueIdentifier,
        status: result.status,
        reviewAction: result.action,
        continuationIntent: input.continuationIntent ?? null,
      },
    });

    return result;
  }

  async function refreshDearMeMemoryCycles(
    companyId: string,
    actor: ReturnType<typeof getActorInfo>,
  ) {
    const cycleRefresh = await memoryContext.refreshRoutineMemoryContext(companyId, {
      userId: actor.actorType === "user" ? actor.actorId : null,
      agentId: actor.agentId,
      runId: actor.runId,
    });

    return {
      checked: cycleRefresh.routineCount,
      updated: cycleRefresh.updated,
      unchanged: cycleRefresh.skipped,
      memorySources: cycleRefresh.memoryCount,
    };
  }

  function memoryUpdateResponseItem(input: {
    memoryId: string;
    update: DearMeMemoryUpdate;
    createdAt: string;
  }) {
    return {
      id: input.memoryId,
      kind: input.update.kind,
      sourceInputMode: input.update.sourceInputMode,
      title: input.update.title,
      body: input.update.body,
      bodyPreview: memoryBodyPreview(input.update.body),
      sourceLabel: input.update.sourceLabel,
      createdAt: input.createdAt,
    };
  }

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
      const result = await recordDearMeOutputReview({
        companyId,
        outputId,
        request: req.body,
        actor,
        mutation: "dearme.output_review",
        contextSource: "dearme.output_review",
      });

      const { wakeIssue: _wakeIssue, ...responseBody } = result;
      res.status(responseBody.status === "queued" ? 202 : 200).json(responseBody);
    },
  );

  router.post(
    "/companies/:companyId/outputs/:outputId/continue",
    validate(dearMeOutputContinuationRequestSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const outputId = req.params.outputId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const action = dearMeOutputReviewActionForContinuation(req.body.intent);
      const request: DearMeOutputReviewRequest = {
        action,
        decisionNote: req.body.decisionNote ?? defaultDearMeContinuationNote(req.body.intent),
      };
      const result = await recordDearMeOutputReview({
        companyId,
        outputId,
        request,
        actor,
        mutation: "dearme.output_continue",
        contextSource: "dearme.output_continue",
        continuationIntent: req.body.intent,
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
      const privateCycleBlocker = describeDearMePrivateCycleBlocker(access);
      if (privateCycleBlocker) {
        throw forbidden(privateCycleBlocker);
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
          : "The brief was saved. Launch Brand OS to create the DearMe team and start private work.",
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
        action: DEARME_MEMORY_UPDATED_ACTION,
        entityType: "dearme_memory",
        entityId: memoryId,
        details: {
          kind: input.kind,
          sourceInputMode: input.sourceInputMode,
          title: input.title,
          body: input.body,
          sourceLabel: input.sourceLabel,
        },
      });

      const growthCycles = await refreshDearMeMemoryCycles(companyId, actor);

      res.status(201).json(dearMeMemoryUpdateResultSchema.parse({
        companyId,
        status: "recorded",
        memory: memoryUpdateResponseItem({ memoryId, update: input, createdAt }),
        growthCycles,
      }));
    },
  );

  router.patch(
    "/companies/:companyId/memory-updates/:memoryId",
    validate(dearMeMemoryUpdateSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const memoryId = req.params.memoryId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const input = req.body as DearMeMemoryUpdate;
      const createdAt = new Date().toISOString();

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: DEARME_MEMORY_UPDATED_ACTION,
        entityType: "dearme_memory",
        entityId: memoryId,
        details: {
          kind: input.kind,
          sourceInputMode: input.sourceInputMode,
          title: input.title,
          body: input.body,
          sourceLabel: input.sourceLabel,
          revisionOf: memoryId,
        },
      });

      const growthCycles = await refreshDearMeMemoryCycles(companyId, actor);

      res.status(200).json(dearMeMemoryUpdateResultSchema.parse({
        companyId,
        status: "recorded",
        memory: memoryUpdateResponseItem({ memoryId, update: input, createdAt }),
        growthCycles,
      }));
    },
  );

  router.delete(
    "/companies/:companyId/memory-updates/:memoryId",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const memoryId = req.params.memoryId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const archivedAt = new Date().toISOString();

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: DEARME_MEMORY_ARCHIVED_ACTION,
        entityType: "dearme_memory",
        entityId: memoryId,
        details: {
          memoryId,
          reason: "user_retired_source",
        },
      });

      const growthCycles = await refreshDearMeMemoryCycles(companyId, actor);

      res.status(200).json(dearMeMemoryArchiveResultSchema.parse({
        companyId,
        status: "archived",
        memoryId,
        archivedAt,
        growthCycles,
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
      const privateCycleBlocker = describeDearMePrivateCycleBlocker(access);
      if (privateCycleBlocker) {
        throw forbidden(privateCycleBlocker);
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
