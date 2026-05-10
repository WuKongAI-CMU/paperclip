import type { Db } from "@paperclipai/db";
import { approvals, issueComments } from "@paperclipai/db";
import { logActivity } from "./activity-log.js";
import { dearMeCustomerSafeText } from "./dearme-customer-text.js";

export const DEARME_NEXT_MOVE_APPROVAL_TYPE = "dearme_output_next_move";
export const DEARME_NEXT_MOVE_APPROVED_ACTIVITY = "dearme.next_move_approved";
export const DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY = "dearme.private_execution_handoff_prepared";
export const DEARME_PAUSE_NEXT_STEP = "DearMe is paused until you resume or approve a new direction.";

type ApprovalRecord = typeof approvals.$inferSelect;
type ReceiptDetails = ReturnType<typeof buildReceiptDetails>;
type PrivateExecutionHandoffDetails = ReturnType<typeof buildPrivateExecutionHandoffDetails>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function payloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function customerSafePayloadText(payload: Record<string, unknown>, key: string, fallback: string) {
  return dearMeCustomerSafeText(payloadText(payload, key), fallback);
}

export function hasDearMePauseIntent(decisionNote: string | null | undefined) {
  const note = decisionNote?.trim().toLowerCase();
  if (!note) return false;

  return (
    note.includes("do not send") ||
    note.includes("do not continue") ||
    note.includes("do not publish") ||
    note.includes("do not deploy") ||
    note.includes("do not spend") ||
    note.includes("don't send") ||
    note.includes("don't continue") ||
    note.includes("don't publish") ||
    note.includes("don't deploy") ||
    note.includes("don't spend") ||
    /\b(?:pause|paused|hold|stop)\b/.test(note) ||
    note.includes("not now")
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  newsletter: "Newsletter",
  blog: "Blog",
  portfolio: "Portfolio",
  email: "Email",
  community: "Community",
  website: "Website",
};

function channelLabel(value: string | null) {
  if (!value) return null;
  return CHANNEL_LABELS[value] ?? value.replace(/(^|-)([a-z])/g, (_match, _separator: string, letter: string) => letter.toUpperCase());
}

function launchHandoffFromPayload(payload: Record<string, unknown>) {
  const launchHandoff = recordField(payload, "launchHandoff");
  if (!launchHandoff) return null;

  const publishGate = recordField(launchHandoff, "publishGate");
  const connectChannelState = publishGate ? stringField(publishGate, "connectChannelState") : null;
  const channel = stringField(launchHandoff, "channel");
  const label = channelLabel(channel);

  if (connectChannelState !== "connect_channel_required" || !label) {
    return {
      channel,
      channelLabel: label,
      connectChannelState: connectChannelState ?? null,
      connectChannelNextStep: null,
    };
  }

  return {
    channel,
    channelLabel: label,
    connectChannelState: "connect_channel_required" as const,
    connectChannelNextStep: `Connect ${label} before DearMe can continue this approved next step.`,
  };
}

function clippedText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function verifiedLinkedIssueId(payloadIssueId: string | null, linkedIssueIds: string[]) {
  const linkedIds = linkedIssueIds.filter((issueId) => issueId.trim().length > 0);
  if (payloadIssueId && linkedIds.includes(payloadIssueId)) {
    return payloadIssueId;
  }
  return linkedIds[0] ?? null;
}

function launchReadyBriefCopyForRiskGate(riskGate: string | null) {
  if (riskGate === "publish_social") {
    return {
      title: "Launch-ready posting brief prepared",
      nextStep: "Review the channel-ready posting brief before any post goes live.",
    };
  }
  if (riskGate === "send_email") {
    return {
      title: "Launch-ready outreach brief prepared",
      nextStep: "Review the recipient-by-recipient outreach brief before any message is sent.",
    };
  }
  if (riskGate === "deploy_public_site") {
    return {
      title: "Launch-ready portfolio brief prepared",
      nextStep: "Review the site-update brief before anything is published publicly.",
    };
  }
  if (riskGate === "spend_money") {
    return {
      title: "Budget-ready next step prepared",
      nextStep: "Review the budget brief before any spend happens.",
    };
  }
  return null;
}

function buildReceiptDetails(approval: ApprovalRecord) {
  const payload = isRecord(approval.payload) ? approval.payload : {};
  const launchHandoff = launchHandoffFromPayload(payload);
  const paused = hasDearMePauseIntent(approval.decisionNote);
  const riskGate = payloadText(payload, "riskGate");
  const launchReadyBriefCopy = launchReadyBriefCopyForRiskGate(riskGate);
  const recommendedAction =
    customerSafePayloadText(payload, "recommendedAction", "") ||
    customerSafePayloadText(payload, "title", "") ||
    "Continue with the approved DearMe next move.";
  const payloadNextAction = customerSafePayloadText(
    payload,
    "nextActionOnApproval",
    "DearMe will prepare the next governed brief before anything external runs.",
  );
  const nextActionOnApproval =
    paused
      ? DEARME_PAUSE_NEXT_STEP
      : launchHandoff?.connectChannelNextStep ??
        launchReadyBriefCopy?.nextStep ??
        payloadNextAction ??
        "DearMe will prepare the next governed brief before anything external runs.";
  const receiptStatus = paused ? "paused" : "not_run_yet";
  const receiptSummary = [
    `Approved: ${recommendedAction}`,
    paused
      ? `Paused: ${DEARME_PAUSE_NEXT_STEP}`
      : "External action: nothing has run outside DearMe yet.",
    `Next: ${nextActionOnApproval}`,
  ].join(" ");

  return {
    approvalId: approval.id,
    outputId: payloadText(payload, "outputId"),
    outputKind: payloadText(payload, "outputKind"),
    issueId: payloadText(payload, "issueId"),
    issueIdentifier: payloadText(payload, "issueIdentifier"),
    riskGate,
    preparedTitle: customerSafePayloadText(payload, "preparedTitle", ""),
    preparedSummary: customerSafePayloadText(payload, "preparedSummary", ""),
    recommendedAction,
    nextActionOnApproval,
    launchChannel: launchHandoff?.channel ?? null,
    launchChannelLabel: launchHandoff?.channelLabel ?? null,
    connectChannelState: launchHandoff?.connectChannelState ?? null,
    connectChannelNextStep: launchHandoff?.connectChannelNextStep ?? null,
    paused,
    externalExecutionStatus: receiptStatus,
    receiptTitle: "Final approval recorded",
    receiptSummary: clippedText(receiptSummary, 1_000),
  };
}

function handoffCopyFor(details: ReceiptDetails) {
  if (details.paused) {
    return {
      title: details.launchChannelLabel
        ? `Launch-ready ${details.launchChannelLabel} step paused`
        : "Launch-ready next step paused",
      nextStep: DEARME_PAUSE_NEXT_STEP,
    };
  }
  if (details.connectChannelState === "connect_channel_required" && details.launchChannelLabel) {
    return {
      title: `Launch-ready ${details.launchChannelLabel} brief prepared`,
      nextStep:
        details.connectChannelNextStep ??
        `Connect ${details.launchChannelLabel} before DearMe can continue this approved next step.`,
    };
  }
  const riskCopy = launchReadyBriefCopyForRiskGate(details.riskGate);
  if (riskCopy) return riskCopy;
  return {
    title: "Launch-ready next step prepared",
    nextStep: "Review the governed brief before any external action happens.",
  };
}

function buildPrivateExecutionHandoffDetails(receiptDetails: ReceiptDetails) {
  const copy = handoffCopyFor(receiptDetails);
  const handoffSummary = [
    receiptDetails.paused
      ? "The final approval is recorded and DearMe paused the next launch step."
      : "The final approval is recorded and DearMe prepared the launch-ready brief.",
    "External action: still not run.",
    `Next: ${copy.nextStep}`,
  ].join(" ");

  return {
    ...receiptDetails,
    executionReadiness: receiptDetails.paused ? "private_handoff_paused" : "private_handoff_ready",
    handoffTitle: copy.title,
    handoffSummary: clippedText(handoffSummary, 1_000),
    handoffNextStep: copy.nextStep,
  };
}

function buildReceiptComment(details: ReceiptDetails) {
  return [
    details.paused
      ? "DearMe final approval: recorded the pause before any external action."
      : "DearMe final approval: recorded the next move.",
    "",
    `Approved: ${details.recommendedAction}`,
    details.paused
      ? `Paused: ${DEARME_PAUSE_NEXT_STEP}`
      : "External action: nothing has run outside DearMe yet.",
    `Next: ${details.nextActionOnApproval}`,
  ].join("\n");
}

function buildPrivateExecutionHandoffComment(details: PrivateExecutionHandoffDetails) {
  return [
    details.paused
      ? "DearMe next step: paused before anything external."
      : "DearMe next step: prepared the launch-ready brief.",
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

  const rawReceiptDetails = buildReceiptDetails(input.approval);
  const issueId = verifiedLinkedIssueId(rawReceiptDetails.issueId, input.linkedIssueIds);
  const receiptDetails = {
    ...rawReceiptDetails,
    issueId,
  };
  const handoffDetails = buildPrivateExecutionHandoffDetails(receiptDetails);

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
