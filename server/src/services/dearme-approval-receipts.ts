import type { Db } from "@paperclipai/db";
import { approvals, issueComments } from "@paperclipai/db";
import { logActivity } from "./activity-log.js";

export const DEARME_NEXT_MOVE_APPROVAL_TYPE = "dearme_output_next_move";
export const DEARME_NEXT_MOVE_APPROVED_ACTIVITY = "dearme.next_move_approved";
export const DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY = "dearme.private_execution_handoff_prepared";

type ApprovalRecord = typeof approvals.$inferSelect;
type ReceiptDetails = ReturnType<typeof buildReceiptDetails>;
type PrivateExecutionHandoffDetails = ReturnType<typeof buildPrivateExecutionHandoffDetails>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function payloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function clippedText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildReceiptDetails(approval: ApprovalRecord) {
  const payload = isRecord(approval.payload) ? approval.payload : {};
  const recommendedAction =
    payloadText(payload, "recommendedAction") ??
    payloadText(payload, "title") ??
    "Continue with the approved DearMe next move.";
  const nextActionOnApproval =
    payloadText(payload, "nextActionOnApproval") ??
    "DearMe will prepare the next governed handoff before anything external runs.";
  const receiptSummary = [
    `Approved: ${recommendedAction}`,
    "External action: nothing has run outside DearMe yet.",
    `Next: ${nextActionOnApproval}`,
  ].join(" ");

  return {
    approvalId: approval.id,
    outputId: payloadText(payload, "outputId"),
    outputKind: payloadText(payload, "outputKind"),
    issueId: payloadText(payload, "issueId"),
    issueIdentifier: payloadText(payload, "issueIdentifier"),
    riskGate: payloadText(payload, "riskGate"),
    preparedTitle: payloadText(payload, "preparedTitle"),
    preparedSummary: payloadText(payload, "preparedSummary"),
    recommendedAction,
    nextActionOnApproval,
    externalExecutionStatus: "not_run_yet",
    receiptTitle: "Final approval recorded",
    receiptSummary: clippedText(receiptSummary, 1_000),
  };
}

function handoffCopyFor(details: ReceiptDetails) {
  if (details.riskGate === "publish_social") {
    return {
      title: "Private publishing handoff prepared",
      nextStep: "DearMe will prepare the channel-ready posting brief before any post goes live.",
    };
  }
  if (details.riskGate === "send_email") {
    return {
      title: "Private outreach handoff prepared",
      nextStep: "DearMe will prepare the recipient-by-recipient outreach brief before any message is sent.",
    };
  }
  if (details.riskGate === "deploy_public_site") {
    return {
      title: "Private portfolio handoff prepared",
      nextStep: "DearMe will prepare the site-update brief before anything is published publicly.",
    };
  }
  if (details.riskGate === "spend_money") {
    return {
      title: "Private spending handoff prepared",
      nextStep: "DearMe will prepare the budget and execution brief before any spend happens.",
    };
  }
  return {
    title: "Private execution handoff prepared",
    nextStep: "DearMe will prepare the governed execution brief before any external action happens.",
  };
}

function buildPrivateExecutionHandoffDetails(receiptDetails: ReceiptDetails) {
  const copy = handoffCopyFor(receiptDetails);
  const handoffSummary = [
    "The final approval is recorded and DearMe prepared the private execution brief.",
    "External action: still not run.",
    `Next: ${copy.nextStep}`,
  ].join(" ");

  return {
    ...receiptDetails,
    executionReadiness: "private_handoff_ready",
    handoffTitle: copy.title,
    handoffSummary: clippedText(handoffSummary, 1_000),
    handoffNextStep: copy.nextStep,
  };
}

function buildReceiptComment(details: ReceiptDetails) {
  return [
    "DearMe final approval: recorded the next move.",
    "",
    `Approved: ${details.recommendedAction}`,
    "External action: nothing has run outside DearMe yet.",
    `Next: ${details.nextActionOnApproval}`,
  ].join("\n");
}

function buildPrivateExecutionHandoffComment(details: PrivateExecutionHandoffDetails) {
  return [
    "DearMe private handoff: prepared the execution brief.",
    "",
    `Ready: ${details.handoffTitle}`,
    "External action: still nothing has been published, sent, deployed, or spent.",
    `Next: ${details.handoffNextStep}`,
  ].join("\n");
}

export async function recordDearMeNextMoveApprovalReceipt(
  db: Db,
  input: {
    approval: ApprovalRecord;
    actorUserId: string;
    linkedIssueIds: string[];
  },
) {
  if (input.approval.type !== DEARME_NEXT_MOVE_APPROVAL_TYPE) {
    return null;
  }

  const receiptDetails = buildReceiptDetails(input.approval);
  const handoffDetails = buildPrivateExecutionHandoffDetails(receiptDetails);
  const issueId = receiptDetails.issueId ?? input.linkedIssueIds[0] ?? null;

  await logActivity(db, {
    companyId: input.approval.companyId,
    actorType: "user",
    actorId: input.actorUserId,
    action: DEARME_NEXT_MOVE_APPROVED_ACTIVITY,
    entityType: "approval",
    entityId: input.approval.id,
    details: receiptDetails,
  });

  await logActivity(db, {
    companyId: input.approval.companyId,
    actorType: "user",
    actorId: input.actorUserId,
    action: DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY,
    entityType: "approval",
    entityId: input.approval.id,
    details: handoffDetails,
  });

  if (issueId) {
    await db.insert(issueComments).values([
      {
        companyId: input.approval.companyId,
        issueId,
        authorUserId: input.actorUserId,
        body: buildReceiptComment(receiptDetails),
      },
      {
        companyId: input.approval.companyId,
        issueId,
        authorUserId: input.actorUserId,
        body: buildPrivateExecutionHandoffComment(handoffDetails),
      },
    ]);
  }

  return handoffDetails;
}
