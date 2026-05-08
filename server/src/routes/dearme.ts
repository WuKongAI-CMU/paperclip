import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  dearMeBrandBlueprintApplyRequestSchema,
  dearMeBrandBlueprintPreviewSchema,
  dearMeFirstCyclePreviewSchema,
  dearMeOutputReviewRequestSchema,
  dearMePaidBetaRecordSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
  dearmeBrandBlueprintService,
  dearmeOutputHandoffService,
  dearmePaidBetaAccessService,
  dearmeWorkbenchService,
  logActivity,
} from "../services/index.js";
import { forbidden } from "../errors.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { heartbeatService } from "../services/heartbeat.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";

export function dearmeRoutes(db: Db) {
  const router = Router();
  const brandBlueprints = dearmeBrandBlueprintService(db);
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
    (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(brandBlueprints.previewFirstCycle(companyId, req.body));
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
