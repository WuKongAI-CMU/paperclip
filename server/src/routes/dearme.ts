import { randomUUID } from "node:crypto";
import { Router, type ErrorRequestHandler, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";
import { activityLog, type Db } from "@paperclipai/db";
import {
  dearMeApprovalResolveRequestSchema,
  dearMeApprovalResolveResultSchema,
  dearMeBrandBlueprintApplyRequestSchema,
  dearMeBrandBlueprintPreviewSchema,
  dearMeChiefOfStaffMessageResultSchema,
  dearMeChiefOfStaffMessageSchema,
  dearMeContentDraftPacketSchema,
  dearMeFirstCyclePreviewSchema,
  dearMeMemoryArchiveResultSchema,
  dearMeMemoryUpdateResultSchema,
  dearMeMemoryUpdateSchema,
  dearMeOutputContinuationRequestSchema,
  dearMeOutputWorkProductSchema,
  dearMeOutputReviewRequestSchema,
  dearMePaidBetaCohortRequestSchema,
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
  dearMeApprovalResolverService,
  dearmeBrandBlueprintService,
  dearmeMemoryContextService,
  dearmeOutputHandoffService,
  dearmePaidBetaAccessService,
  dearmeWorkbenchService,
  issueService,
  logActivity,
} from "../services/index.js";
import { describeDearMePrivateCycleBlocker } from "../services/dearme-paid-beta-access.js";
import {
  dearMeStripeCheckoutService,
  DearMeStripeCheckoutError,
} from "../services/dearme-stripe-checkout.js";
import {
  getDearMeSseBus,
  type DearMeSseEvent,
} from "../services/dearme-sse-bus.js";
import type {
  DearMeVoiceProfileStore,
  DearMeVoiceSemanticScorer,
} from "../services/dearme-voice-gate.js";
import { forbidden, HttpError, notFound } from "../errors.js";
import { assertAuthenticated, assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { heartbeatService } from "../services/heartbeat.js";
import { queueIssueAssignmentWakeup } from "../services/issue-assignment-wakeup.js";
import {
  projectDearMeStripeCheckoutCompletedEvents,
  verifyDearMeStripeWebhookSignature,
  type DearMeStripeCheckoutCompletedEvent,
} from "../services/dearme-paid-beta-access.js";
import { dearMeEmailSuppressService } from "../services/dearme-email-suppress.js";
import { verifyDearMeUnsubscribeToken } from "../services/dearme-send-email-dispatch.js";

function memoryBodyPreview(body: string) {
  return body.length > 700 ? `${body.slice(0, 697)}...` : body;
}

function memoryUpdateFromActivityDetails(details: unknown): DearMeMemoryUpdate | null {
  if (!isRecord(details)) return null;
  const parsed = dearMeMemoryUpdateSchema.safeParse({
    kind: details.kind,
    sourceInputMode: details.sourceInputMode,
    title: details.title,
    body: details.body,
    sourceLabel: details.sourceLabel,
  });
  return parsed.success ? parsed.data : null;
}

const dearMeAuthErrorMessages = new Map<string, string>([
  ["Unauthorized", "Sign in to continue with DearMe."],
  ["Board access required", "This DearMe action needs an owner account."],
  [
    "Company membership or instance admin access required",
    "This DearMe profile is not available to your account.",
  ],
  ["Instance admin access required", "This DearMe action needs an owner account."],
  [
    "Agent key cannot access another company",
    "This DearMe profile is not available to your account.",
  ],
  [
    "User does not have access to this company",
    "This DearMe profile is not available to your account.",
  ],
  ["User does not have active company access", "Your DearMe access is not active."],
  ["Viewer access is read-only", "Your DearMe access is read-only."],
]);

const CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND = "dearme_chief_of_staff_message";
const FIRST_CYCLE_START_ORIGIN_KIND = "dearme_first_cycle_start";
const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const DEARME_MEMORY_ARCHIVED_ACTION = "dearme.memory_archived";
const DEARME_STRIPE_WEBHOOK_RECORDED_ACTION = "dearme.stripe_payment_webhook_recorded";
const dearMeCheckoutStartRequestSchema = z.object({
  email: z.string().trim().email(),
  plan: z.literal("beta"),
});
const dearMeBillingPortalRequestSchema = z.object({
  customerId: z.string().trim().min(1),
});
const CHIEF_OF_STAFF_INTENT_LABELS: Record<DearMeChiefOfStaffMessageIntent, string> = {
  plan_next: "Plan next moves",
  draft_content: "Draft content",
  find_opportunities: "Find opportunities",
  refresh_portfolio: "Refresh portfolio",
  prepare_report: "Prepare report",
  handle_feedback: "Handle feedback",
};

function writeDearMeSseEvent(res: Response, event: DearMeSseEvent) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const dearMeStripeCheckoutCompletedEventSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("checkout.session.completed"),
  livemode: z.boolean(),
  data: z.object({
    object: z.object({
      id: z.string().trim().min(1),
      object: z.literal("checkout.session"),
      status: z.enum(["open", "complete", "expired"]),
      payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
      amount_total: z.number().int().nonnegative().nullable(),
      currency: z.string().trim().min(1).nullable(),
      client_reference_id: z.string().trim().min(1).nullable(),
      payment_intent: z.string().trim().min(1).nullable(),
      invoice: z.string().trim().min(1).nullable(),
      metadata: z.record(z.string(), z.string().nullable().optional()).nullable().optional(),
      created: z.number().int().nonnegative(),
    }).passthrough().transform((session) => ({
      ...session,
      metadata: session.metadata ?? undefined,
    })),
  }).passthrough(),
}).passthrough();

function parseDearMeStripeCheckoutCompletedEvent(payload: unknown): DearMeStripeCheckoutCompletedEvent | null {
  const parsed = dearMeStripeCheckoutCompletedEventSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function normalizeDearMeRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return new HttpError(400, "Validation error");
  }
  if (err instanceof DearMeStripeCheckoutError) {
    return new HttpError(err.status, err.message);
  }
  if (!(err instanceof HttpError)) {
    return err;
  }
  const safeMessage = dearMeAuthErrorMessages.get(err.message);
  if (!safeMessage) {
    return err;
  }
  return new HttpError(err.status, safeMessage);
}

const dearMeRouteErrorBoundary: ErrorRequestHandler = (err, _req, _res, next) => {
  next(normalizeDearMeRouteError(err));
};

function trimTitleFragment(value: string) {
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "New DearMe request";
  return firstLine.length > 88 ? `${firstLine.slice(0, 85)}...` : firstLine;
}

function renderChiefOfStaffIssueDescription(input: DearMeChiefOfStaffMessage) {
  const intentLabel = CHIEF_OF_STAFF_INTENT_LABELS[input.intent];
  const feedbackLearningBoundary = input.intent === "handle_feedback"
    ? [
        "Feedback learning:",
        "Triage the user feedback or support note, identify what should change, capture Voice & Memory learnings, and prepare the next private recovery or follow-up move for review.",
      ]
    : [];
  return [
    "DearMe Chief of Staff request",
    `Intent: ${intentLabel}`,
    "User brief:",
    input.message,
    ...feedbackLearningBoundary,
    "Private-work boundary:",
    "Prepare the next useful move privately. Drafts, outreach, public claims, spend, publishing, or site changes still need explicit user approval before leaving DearMe.",
  ].join("\n\n");
}

function chiefOfStaffMessageNextStep(input: DearMeChiefOfStaffMessage, assigned: boolean) {
  if (input.intent === "handle_feedback") {
    return assigned
      ? "Chief of Staff has the feedback brief and will turn it into Voice & Memory learning, recovery work, and next-cycle changes before any public move."
      : "The feedback brief was saved. Start the private team to turn it into Voice & Memory learning, recovery work, and next-cycle changes.";
  }
  return assigned
    ? "Chief of Staff has the brief and will prepare the next private move for review."
    : "The brief was saved. Start the private team to create the DearMe team and start private work.";
}

function renderFirstCycleIssueDescription(input: {
  positioning: string;
  artifacts: string[];
}) {
  return [
    "DearMe first-cycle start",
    "User positioning:",
    input.positioning,
    "Private proof order:",
    ...input.artifacts.map((artifact, index) => `${index + 1}. ${artifact}`),
    "Launch boundary:",
    "Prepare the private proof package first. Public posts, outbound messages, spend, and site changes still need explicit user approval.",
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

function compactDearMeMemoryTitle(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 160) return compact;
  return `${compact.slice(0, 157).trimEnd()}...`;
}

function configuredEnvValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function publicRequestBaseUrl(req: { protocol: string; get(name: string): string | undefined }) {
  const configuredPublicUrl = configuredEnvValue("PAPERCLIP_PUBLIC_URL");
  if (configuredPublicUrl) return configuredPublicUrl.replace(/\/+$/, "");
  const origin = req.get("origin")?.trim();
  if (origin) return origin.replace(/\/+$/, "");
  const host = req.get("host")?.trim();
  return host ? `${req.protocol}://${host}` : "";
}

function dearMeReviewFeedbackMemoryTitle(outputTitle: string) {
  return compactDearMeMemoryTitle(`Review feedback for ${outputTitle}`);
}

function dearMeReviewFeedbackActionText(action: Exclude<DearMeOutputReviewAction, "approve">) {
  if (action === "request_changes") return "asked for changes before approving this prepared work";
  if (action === "regenerate") return "asked DearMe to prepare another private pass";
  return "said this prepared work was not useful yet";
}

function dearMeReviewFeedbackMemoryBody(input: {
  action: Exclude<DearMeOutputReviewAction, "approve">;
  outputTitle: string;
  decisionNote: string | null;
  continuationIntent?: DearMeOutputContinuationIntent;
}) {
  const note = input.decisionNote?.trim();
  const actionText = dearMeReviewFeedbackActionText(input.action);
  const feedback = note && note.length > 0
    ? ` Feedback: ${note}`
    : " Treat this as a signal to sharpen the next private version before review.";
  const continuation = input.continuationIntent
    ? ` Next move: ${defaultDearMeContinuationNote(input.continuationIntent)}`
    : "";

  return `For ${input.outputTitle}, the owner ${actionText}.${feedback}${continuation}`;
}

function dearMeSilenceDefaultReviewMemoryBody(input: {
  outputTitle: string;
  score: number;
  reason: string | null;
}) {
  const reason = input.reason?.trim().replace(/_/g, " ");
  const reasonSentence = reason ? ` Reason: ${reason}.` : "";
  return `For ${input.outputTitle}, no review response arrived, so DearMe treated the private review as a neutral-positive ${input.score}/10 signal and approved the work for private learning.${reasonSentence} Public posts, outbound messages, deployment, and spend still need explicit approval.`;
}

function contentDraftIssueIdFromOutputId(outputId: string) {
  const separatorIndex = outputId.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex === outputId.length - 1) {
    throw notFound("DearMe content drafts output not found");
  }
  const issueId = outputId.slice(0, separatorIndex);
  const outputKind = outputId.slice(separatorIndex + 1);
  if (outputKind !== "content_drafts") {
    throw notFound("DearMe content drafts output not found");
  }
  return issueId;
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

export function dearmeRoutes(
  db: Db,
  options: {
    voiceProfileStore?: DearMeVoiceProfileStore;
    voiceSemanticScorer?: DearMeVoiceSemanticScorer | null;
  } = {},
) {
  const router = Router();
  const agents = agentService(db);
  const brandBlueprints = dearmeBrandBlueprintService(db, {
    voiceProfileStore: options.voiceProfileStore,
    voiceSemanticScorer: options.voiceSemanticScorer,
  });
  const memoryContext = dearmeMemoryContextService(db);
  const issues = issueService(db);
  const outputHandoff = dearmeOutputHandoffService(db, {
    voiceProfileStore: options.voiceProfileStore,
    voiceSemanticScorer: options.voiceSemanticScorer,
  });
  const paidBetaAccess = dearmePaidBetaAccessService(db);
  const stripeCheckout = dearMeStripeCheckoutService(db, { paidBetaAccess });
  const workbench = dearmeWorkbenchService(db, {
    voiceProfileStore: options.voiceProfileStore,
    voiceSemanticScorer: options.voiceSemanticScorer,
  });
  const heartbeat = heartbeatService(db);
  const sseBus = getDearMeSseBus();
  const approvalResolver = dearMeApprovalResolverService(db, sseBus);
  const emailSuppress = dearMeEmailSuppressService(db);

  router.get("/v1/email/unsubscribe", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const verified = verifyDearMeUnsubscribeToken(token);
    if (!verified.ok) {
      res.status(400).type("html").send("<!doctype html><title>Invalid unsubscribe link</title><p>Invalid unsubscribe link.</p>");
      return;
    }

    await emailSuppress.suppress(verified.email, "unsubscribe");
    res
      .status(200)
      .type("html")
      .send("<!doctype html><title>Unsubscribed</title><p>You've been unsubscribed.</p>");
  });

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

    const silenceDefault = input.request.action === "approve" ? input.request.silenceDefault : null;
    if (result.action !== "approve" || silenceDefault) {
      const memoryBody = silenceDefault
        ? dearMeSilenceDefaultReviewMemoryBody({
            outputTitle: result.output.title,
            score: silenceDefault.score,
            reason: silenceDefault.reason,
          })
        : dearMeReviewFeedbackMemoryBody({
            action: result.action as Exclude<DearMeOutputReviewAction, "approve">,
            outputTitle: result.output.title,
            decisionNote: input.request.decisionNote,
            continuationIntent: input.continuationIntent,
          });
      await logActivity(db, {
        companyId: input.companyId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        agentId: input.actor.agentId,
        runId: input.actor.runId,
        action: DEARME_MEMORY_UPDATED_ACTION,
        entityType: "dearme_memory",
        entityId: `review-feedback:${result.comment.id}`,
        details: {
          kind: "review_feedback",
          sourceInputMode: "paste",
          title: dearMeReviewFeedbackMemoryTitle(result.output.title),
          body: memoryBody,
          sourceLabel: result.output.title,
          outputId: result.outputId,
          outputKind: result.output.kind,
          issueId: result.output.issueId,
          issueIdentifier: result.output.issueIdentifier,
          reviewAction: result.action,
          defaultApprovalScore: silenceDefault?.score ?? null,
          defaultedBySilence: Boolean(silenceDefault),
          continuationIntent: input.continuationIntent ?? null,
          commentId: result.comment.id,
        },
      });

      await refreshDearMeMemoryCycles(input.companyId, input.actor);
    }

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
    "/companies/:companyId/events",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const snapshot = await workbench.getWorkbench(companyId);

      let unsubscribed = false;
      let unsubscribe = () => {};
      const safeUnsubscribe = () => {
        if (unsubscribed) return;
        unsubscribed = true;
        unsubscribe();
      };

      unsubscribe = sseBus.subscribe(companyId, (event) => {
        if (unsubscribed || !res.writable) return;
        try {
          writeDearMeSseEvent(res, event);
        } catch {
          safeUnsubscribe();
        }
      });

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      res.write(":ok\n\n");

      writeDearMeSseEvent(res, {
        type: "sync",
        emittedAt: new Date().toISOString(),
        scope: { companyId },
        payload: {
          workbench: snapshot,
        },
      } as DearMeSseEvent);

      req.on("close", safeUnsubscribe);
      res.on("error", safeUnsubscribe);
    },
  );

  router.get(
    "/companies/:companyId/workbench",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await workbench.getWorkbench(companyId));
    },
  );

  router.post(
    "/companies/:companyId/approvals/resolve",
    validate(dearMeApprovalResolveRequestSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const issue = await issues.getById(req.body.issueId);
      if (!issue || issue.companyId !== companyId) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }

      const actor = getActorInfo(req);
      const result = await approvalResolver.resolve({
        companyId,
        requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
        requestedByAgentId: actor.actorType === "agent" ? actor.agentId : null,
        issueId: issue.id,
        toolName: req.body.toolName,
        channel: req.body.channel,
        gate: req.body.gate,
        estimatedUsd: req.body.estimatedUsd,
        voiceGateScore: req.body.voiceGateScore,
        reason: req.body.reason,
        config: req.body.config,
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.approval_resolved",
        entityType: "approval",
        entityId: result.approvalId,
        details: {
          issueId: issue.id,
          issueIdentifier: issue.identifier ?? null,
          gate: req.body.gate,
          decision: result.decision,
          channel: req.body.channel,
          toolName: req.body.toolName,
        },
      });

      const responseBody = dearMeApprovalResolveResultSchema.parse({
        companyId,
        issueId: issue.id,
        issueIdentifier: issue.identifier ?? null,
        approvalId: result.approvalId,
        decision: result.decision,
        reason: result.reason,
      });
      res.status(result.decision === "pending" ? 202 : 200).json(responseBody);
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
        silenceDefault: null,
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
    "/companies/:companyId/outputs/:outputId/content-draft-packets",
    validate(dearMeContentDraftPacketSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const outputId = req.params.outputId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const issueId = contentDraftIssueIdFromOutputId(outputId);
      const product = await outputHandoff.persistContentDraftPacket(companyId, issueId, req.body);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.content_draft_packet_saved",
        entityType: "issue_work_product",
        entityId: product.id,
        details: {
          outputId,
          outputKind: "content_drafts",
          issueId,
          workProductId: product.id,
          voiceGateScore: product.voiceGate?.score ?? null,
          voiceGateStatus: product.voiceGate?.status ?? null,
        },
      });

      const emittedAt = new Date().toISOString();
      sseBus.emit({
        type: "agent_completed",
        emittedAt,
        scope: {
          companyId,
          issueId,
          ...(actor.agentId ? { agentId: actor.agentId } : {}),
          workLoopState: "review",
        },
        payload: {
          role: "content_producer",
          artifact: "content_draft_packet",
          outputId,
          workProductId: product.id,
          status: "ready_for_private_review",
        },
      });

      res.status(201).json(dearMeOutputWorkProductSchema.parse(product));
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
        nextStep: chiefOfStaffMessageNextStep(input, Boolean(chiefOfStaff)),
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

  router.post(
    "/companies/:companyId/memory-updates/:memoryId/restore",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const memoryId = req.params.memoryId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const createdAt = new Date().toISOString();
      const memoryRows = await db
        .select({
          action: activityLog.action,
          details: activityLog.details,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .where(and(
          eq(activityLog.companyId, companyId),
          eq(activityLog.entityType, "dearme_memory"),
          eq(activityLog.entityId, memoryId),
          inArray(activityLog.action, [DEARME_MEMORY_UPDATED_ACTION, DEARME_MEMORY_ARCHIVED_ACTION]),
        ))
        .orderBy(desc(activityLog.createdAt))
        .limit(25);

      if (memoryRows[0]?.action !== DEARME_MEMORY_ARCHIVED_ACTION) {
        throw notFound("Memory source not found");
      }

      const sourceRow = memoryRows.find((row) => row.action === DEARME_MEMORY_UPDATED_ACTION);
      const input = sourceRow ? memoryUpdateFromActivityDetails(sourceRow.details) : null;
      if (!input) {
        throw notFound("Memory source not found");
      }

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
          restoredFromArchive: true,
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

  router.get(
    "/companies/:companyId/paid-beta/access",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      res.json(await paidBetaAccess.getAccess(companyId));
    },
  );

  router.post(
    "/paid-beta/cohort",
    validate(dearMePaidBetaCohortRequestSchema),
    async (req, res) => {
      for (const companyId of req.body.companyIds) {
        assertCompanyAccess(req, companyId);
      }

      res.json(await paidBetaAccess.getCohort(req.body.companyIds));
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
    "/checkout/start",
    validate(dearMeCheckoutStartRequestSchema),
    async (req, res) => {
      const secretKey = configuredEnvValue("DEARME_STRIPE_SECRET_KEY");
      const priceId = configuredEnvValue("DEARME_STRIPE_PRICE_BETA");
      if (!secretKey || !priceId) {
        throw new HttpError(503, "DearMe Stripe Checkout is not configured.");
      }

      const baseUrl = publicRequestBaseUrl(req);
      if (!baseUrl) {
        throw new HttpError(503, "DearMe Stripe Checkout return URLs are not configured.");
      }

      const result = await stripeCheckout.createCheckoutSession({
        email: req.body.email,
        priceId,
        successUrl: `${baseUrl}/dearme/checkout/success`,
        cancelUrl: `${baseUrl}/dearme/checkout/cancel`,
      });

      res.status(200).json({ checkoutUrl: result.checkoutUrl });
    },
  );

  router.post(
    "/checkout/webhook",
    async (req, res) => {
      const webhookSecret = configuredEnvValue("DEARME_STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        throw new HttpError(503, "DearMe Stripe Checkout webhook is not configured.");
      }

      const rawBody = (req as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        throw new HttpError(400, "DearMe Stripe Checkout webhook requires a raw body.");
      }

      const result = await stripeCheckout.handleCheckoutWebhook({
        rawBody,
        signatureHeader: req.header("stripe-signature"),
        webhookSecret,
      });

      res.status(200).json(result);
    },
  );

  router.post(
    "/billing/portal",
    validate(dearMeBillingPortalRequestSchema),
    async (req, res) => {
      assertAuthenticated(req);
      const secretKey = configuredEnvValue("DEARME_STRIPE_SECRET_KEY");
      if (!secretKey) {
        throw new HttpError(503, "DearMe Stripe Customer Portal is not configured.");
      }

      const baseUrl = publicRequestBaseUrl(req);
      if (!baseUrl) {
        throw new HttpError(503, "DearMe Stripe Customer Portal return URL is not configured.");
      }

      const result = await stripeCheckout.createPortalSession({
        customerId: req.body.customerId,
        returnUrl: `${baseUrl}/dearme/billing`,
      });

      res.status(200).json({ portalUrl: result.portalUrl });
    },
  );

  router.post(
    "/payments/stripe/webhook",
    async (req, res) => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!webhookSecret) {
        throw new HttpError(503, "DearMe Stripe payment webhook is not configured.");
      }

      const rawBody = (req as { rawBody?: Buffer }).rawBody;
      const signatureValid = rawBody
        ? verifyDearMeStripeWebhookSignature({
            rawBody,
            signatureHeader: req.header("stripe-signature"),
            webhookSecret,
          })
        : false;
      if (!signatureValid) {
        throw new HttpError(401, "Invalid DearMe payment webhook signature.");
      }

      if (!isRecord(req.body) || req.body.type !== "checkout.session.completed") {
        res.status(200).json({
          received: true,
          status: "ignored",
          reason: "unsupported_event_type",
        });
        return;
      }

      const event = parseDearMeStripeCheckoutCompletedEvent(req.body);
      if (!event) {
        res.status(200).json({
          received: true,
          status: "ignored",
          reason: "invalid_checkout_session_completed_payload",
        });
        return;
      }

      const providerProjection = projectDearMeStripeCheckoutCompletedEvents([event], {
        signatureVerified: true,
      });
      const [receipt] = providerProjection.hostedReceipts;
      if (!receipt) {
        res.status(200).json({
          received: true,
          status: "ignored",
          reason: "checkout_did_not_unlock_paid_access",
          acceptedProviderEventCount: providerProjection.acceptedProviderEvents.length,
          rejectedProviderEventCount: providerProjection.rejectedProviderEvents.length,
        });
        return;
      }

      const result = await paidBetaAccess.recordHostedPaymentReceipts(receipt.companyId, [receipt]);
      const recordedEvent = result.recordedEvents[0] ?? null;

      if (recordedEvent) {
        await logActivity(db, {
          companyId: receipt.companyId,
          actorType: "system",
          actorId: "stripe-webhook",
          action: DEARME_STRIPE_WEBHOOK_RECORDED_ACTION,
          entityType: "finance_event",
          entityId: recordedEvent.id,
          details: {
            providerEventId: event.id,
            checkoutSessionId: event.data.object.id,
            amountCents: recordedEvent.amountCents,
            currency: recordedEvent.currency,
            status: result.access.status,
            netPaidCents: result.access.netPaidCents,
            duplicateSuppressedCount: result.duplicateSuppressedCount,
            existingDuplicateSuppressedCount: result.existingDuplicateSuppressedCount,
          },
        });
      }

      res.status(200).json({
        received: true,
        status: recordedEvent ? "recorded" : "duplicate",
        provider: "stripe",
        companyId: receipt.companyId,
        acceptedProviderEventCount: providerProjection.acceptedProviderEvents.length,
        rejectedProviderEventCount: providerProjection.rejectedProviderEvents.length,
        acceptedReceiptCount: result.acceptedReceipts.length,
        rejectedReceiptCount: result.rejectedReceipts.length,
        duplicateSuppressedCount: result.duplicateSuppressedCount,
        existingDuplicateSuppressedCount: result.existingDuplicateSuppressedCount,
        recordedEventCount: result.recordedEvents.length,
        access: result.access,
      });
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
    "/companies/:companyId/first-cycle/start",
    validate(dearMeFirstCyclePreviewSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      assertBoard(req);
      const actor = getActorInfo(req);
      const access = await paidBetaAccess.getAccess(companyId);
      const privateCycleBlocker = describeDearMePrivateCycleBlocker(access);
      if (privateCycleBlocker) {
        throw forbidden(privateCycleBlocker);
      }

      const preview = await brandBlueprints.prepareFirstCycleProofOutputs(companyId, req.body, actor);
      const agentRows = await agents.list(companyId);
      const chiefOfStaff = agentRows.find((agent) => {
        const metadata = agent.metadata;
        return isRecord(metadata) && metadata.dearmeRole === "chief_of_staff";
      }) ?? null;
      const artifacts = preview.proofSequence.map((step) => {
        const source = step.sourceLabel ? ` (${step.sourceLabel})` : "";
        return `${step.window} ${step.title}: ${step.preparedArtifact}${source}`;
      });
      const issue = await issues.create(companyId, {
        title: `DearMe: First 5-minute proof - ${trimTitleFragment(preview.positioning)}`,
        description: renderFirstCycleIssueDescription({
          positioning: preview.positioning,
          artifacts,
        }),
        status: chiefOfStaff ? "todo" : "backlog",
        priority: "high",
        assigneeAgentId: chiefOfStaff?.id ?? null,
        createdByAgentId: actor.agentId,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        originKind: FIRST_CYCLE_START_ORIGIN_KIND,
        originId: randomUUID(),
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "dearme.first_cycle_started",
        entityType: "issue",
        entityId: issue.id,
        details: {
          positioning: preview.positioning,
          title: issue.title,
          identifier: issue.identifier,
          assigned: Boolean(chiefOfStaff),
          artifactOrder: artifacts,
          ahaTargetSeconds: 300,
          ahaWindow: preview.proofSequence.at(-1)?.window ?? "3-5min",
          starterDraftCount: preview.starterPosts.length,
          opportunityCount: preview.opportunityShortlist.length,
          valueReportCount: preview.valueReport.items.length,
          opportunityRoiReportCount: preview.opportunityRoiReport.items.length,
          firstOpportunityTarget: preview.opportunityShortlist[0]?.target ?? null,
          nextStep: "Review Work Ready or open the proof page; public moves still wait for the launch call.",
        },
      });

      const emittedAt = new Date().toISOString();
      sseBus.emit({
        type: "task_created",
        emittedAt,
        scope: {
          companyId,
          issueId: issue.id,
          agentId: chiefOfStaff?.id,
          workLoopState: "intake",
        },
        payload: {
          kind: "first_cycle_started",
          title: issue.title,
          issueIdentifier: issue.identifier ?? null,
          artifactOrder: artifacts,
        },
      });
      sseBus.emit({
        type: "thinking_stream",
        emittedAt,
        scope: {
          companyId,
          issueId: issue.id,
          agentId: chiefOfStaff?.id,
          workLoopState: "triage",
        },
        payload: {
          role: "chief_of_staff",
          message: "Shaping the private dossier, audience shortlist, starter posts, proof card, and launch boundary.",
        },
      });
      sseBus.emit({
        type: "agent_completed",
        emittedAt,
        scope: {
          companyId,
          issueId: issue.id,
          agentId: chiefOfStaff?.id,
          workLoopState: "review",
        },
        payload: {
          role: "chief_of_staff",
          artifact: "first_cycle_proof_package",
          status: "ready_for_private_review",
        },
      });

      if (chiefOfStaff) {
        void queueIssueAssignmentWakeup({
          heartbeat,
          issue,
          reason: "dearme_first_cycle_start",
          mutation: "dearme.first_cycle_started",
          contextSource: "dearme.first_cycle_started",
          requestedByActorType: actor.actorType,
          requestedByActorId: actor.actorId,
        });
      }

      res.status(201).json(preview);
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

  router.use(dearMeRouteErrorBoundary);

  return router;
}
