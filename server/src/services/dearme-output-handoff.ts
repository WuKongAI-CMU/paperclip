import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  approvals,
  documents,
  issueApprovals,
  issueComments,
  issueDocuments,
  issues,
  issueWorkProducts,
} from "@paperclipai/db";
import {
  DEARME_OUTPUT_KINDS,
  dearMeContentDraftPacketSchema,
  dearMeVoiceGateResultSchema,
  dearMeOutputReviewResultSchema,
  dearMeOutputWorkProductSchema,
  dearMeOutputsResponseSchema,
  isSystemIssueDocumentKey,
  type DearMeContentDraftPacket,
  type DearMeOutputDetail,
  type DearMeOutputDocument,
  type DearMeOutputItem,
  type DearMeOutputKind,
  type DearMeOutputReviewAction,
  type DearMeOutputReviewLoop,
  type DearMeOutputReviewRequest,
  type DearMeOutputReviewResult,
  type DearMeOutputStatus,
  type DearMeOutputUpdate,
  type DearMeOutputWorkProduct,
  type DearMeVoiceGateResult,
} from "@paperclipai/shared";
import { notFound } from "../errors.js";
import { DEARME_NEXT_MOVE_APPROVAL_TYPE } from "./dearme-approval-receipts.js";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import { deriveDearMeOutputStatus } from "./dearme-output-status.js";
import { dearMeVoiceGateService } from "./dearme-voice-gate.js";
import { documentService } from "./documents.js";

type DearMeIssueRow = {
  id: string;
  companyId: string;
  title: string;
  status: string;
  identifier: string | null;
  originFingerprint: string;
  assigneeAgentId: string | null;
  updatedAt: Date;
};

type DearMeOutputReviewActor = {
  actorType: "user" | "agent";
  actorId: string;
  agentId: string | null;
  runId: string | null;
};

type DearMeOutputPacketActor = {
  actorType: "user" | "agent";
  actorId: string;
  agentId: string | null;
  runId?: string | null;
};

type DearMeOutputReviewServiceResult = DearMeOutputReviewResult & {
  wakeIssue: { id: string; assigneeAgentId: string | null; status: string } | null;
};

type OutputDescriptor = {
  kind: DearMeOutputKind;
  title: string;
  summary: string;
  order: number;
  documentKeys?: readonly string[];
};

type OutputDetailText = {
  value: string;
  source: DearMeOutputDetail["source"];
};

type DearMeOutputSourceEvidence = DearMeOutputItem["sourceEvidence"][number];

export type DearMeReviewComment = {
  body: string;
  createdAt: Date;
};

export type DearMeParsedReviewDecision = {
  action: DearMeOutputReviewAction;
  createdAt: Date;
  notePreview: string | null;
};

export type DearMeOutputReviewFeedback = DearMeParsedReviewDecision & {
  action: Exclude<DearMeOutputReviewAction, "approve">;
};

type DearMeOutputPreviousDraftContext = {
  title?: string | null;
  summary?: string | null;
  bodyPreview?: string | null;
};

const BRAND_OS_FINGERPRINT = "brand-os-review";
const VOICE_OPERATION_FINGERPRINT = "operation-seed_voice_profile";
const CONTENT_OPERATION_FINGERPRINT = "operation-draft_content_batch";
const CONTENT_DRAFT_WORK_PRODUCT_PROVIDER = "dearme";
const CYCLE_OUTPUT_WORK_PRODUCT_PROVIDER = "dearme-cycle-output";
const DEARME_OUTPUT_REVIEW_LOOP_MAX_ATTEMPTS = 3;
const DEARME_FEEDBACK_TRACE_HIDDEN_TERMS =
  /\b(dearme decision|issue comment|work product|provider|adapter|setup[-_ ]?payload|paperclip|openclaw|symphony|runtime|agent|model-provider|model provider|codex)\b/i;
const outputKindSet = new Set<string>(DEARME_OUTPUT_KINDS);

const NEXT_MOVE_APPROVAL_COPY: Partial<Record<DearMeOutputKind, {
  title: string;
  summary: string;
  recommendedAction: string;
  nextActionOnApproval: string;
  riskGate: string | null;
  risks: readonly string[];
}>> = {
  content_drafts: {
    title: "Approve posts for publishing",
    summary: "DearMe marked the private drafts useful. The posts are ready for your final approval before anything public happens.",
    recommendedAction: "Publish the approved posts from this content batch.",
    nextActionOnApproval: "DearMe may publish the prepared posts through the selected channel. Nothing publishes before this approval.",
    riskGate: "publish_social",
    risks: [
      "The posts will represent the customer publicly.",
      "Any claim should match the approved private draft and proof.",
    ],
  },
  opportunity_drafts: {
    title: "Approve outreach to send",
    summary: "DearMe marked the private outreach useful. The messages are ready for your final approval before anyone is contacted.",
    recommendedAction: "Send the approved outreach drafts to the selected opportunity targets.",
    nextActionOnApproval: "DearMe may send the prepared outreach. Nothing is sent before this approval.",
    riskGate: "send_email",
    risks: [
      "The message will be received by another person.",
      "The outreach should match the customer's voice, offer, and relationship context.",
    ],
  },
  portfolio_update: {
    title: "Approve portfolio update to publish",
    summary: "DearMe marked the private portfolio update useful. The site change is ready for your final approval before deployment.",
    recommendedAction: "Publish the approved portfolio proof update.",
    nextActionOnApproval: "DearMe may deploy the prepared public site update. Nothing deploys before this approval.",
    riskGate: "deploy_public_site",
    risks: [
      "The update changes public proof and positioning.",
      "Claims should stay aligned with the approved proof source.",
    ],
  },
  weekly_report: {
    title: "Approve the next private cycle",
    summary: "DearMe marked the private report useful. The next brand-growth cycle is ready for your final approval before more work starts.",
    recommendedAction: "Start the next private cycle from the report's next bets.",
    nextActionOnApproval: "DearMe may schedule the next private cycle. Nothing public is published, sent, or deployed from this approval.",
    riskGate: "spend_money",
    risks: [
      "Starting the next cycle can spend credits or budget.",
      "The next cycle should follow the approved private report and boundaries.",
    ],
  },
};

const OPERATION_DESCRIPTORS: Record<string, OutputDescriptor> = {
  [CONTENT_OPERATION_FINGERPRINT]: {
    kind: "content_drafts",
    title: "Content drafts",
    summary: "Private posts, essays, and newsletter drafts prepared for review.",
    order: 30,
  },
  "operation-draft_opportunity_list": {
    kind: "opportunity_drafts",
    title: "Opportunity drafts",
    summary: "Relevant opportunities and outreach drafts prepared without sending.",
    order: 40,
  },
  "operation-prepare_portfolio_update": {
    kind: "portfolio_update",
    title: "Portfolio updates",
    summary: "Proof, case-study, and site-update drafts held for approval.",
    order: 50,
  },
  "operation-schedule_weekly_report": {
    kind: "weekly_report",
    title: "Dear me report",
    summary: "The private weekly report with completed work, decisions, and next bets.",
    order: 60,
  },
};

const BRAND_OS_DESCRIPTOR: OutputDescriptor = {
  kind: "brand_os",
  title: "Brand OS",
  summary: "Private positioning, goals, proof, offers, and launch boundaries.",
  order: 10,
  documentKeys: ["brand-os", "approval-gates"],
};

const VOICE_DESCRIPTOR: OutputDescriptor = {
  kind: "voice_profile",
  title: "Voice profile",
  summary: "Voice guidance and samples used to keep drafts aligned before publication approval.",
  order: 20,
  documentKeys: ["voice-profile"],
};

const DETAIL_EXTRACTION_LABELS = [
  "Positioning",
  "Known for",
  "Goals",
  "Audiences",
  "Proof Points",
  "Offers",
  "Content Pillars",
  "Voice guidance",
  "Guidance",
  "Voice",
  "Status",
  "Sample count",
  "Voice Samples",
  "Boundary",
  "Channel",
  "Audience",
  "Hook",
  "Draft body",
  "Draft",
  "Body",
  "Proof used",
  "Proof",
  "Launch boundary",
  "Launch boundaries",
  "Approval gate",
  "Approval boundaries",
  "Boundaries",
  "Voice Gate",
  "Voice fit score",
  "Voice fit",
  "Cycle evidence",
  "Target",
  "Contact",
  "Opportunity",
  "Why relevant",
  "Relevance",
  "Relevance score",
  "Score",
  "Outreach angle",
  "Angle",
  "Draft message",
  "Message",
  "Page section",
  "Section",
  "Page",
  "Proof source",
  "Proposed copy",
  "Copy",
  "Recommendation",
  "Completed work",
  "Work Completed",
  "Drafts and Assets Ready for Review",
  "Decisions needed",
  "Next bets",
  "Next bet",
  "Outcomes and Signals",
  "Budget",
  "Cycle packet",
  "Report reference",
] as const;

function toIso(value: Date) {
  return value.toISOString();
}

function plainPreview(value: string | null | undefined, maxLength = 700) {
  if (!value) return "";
  const compact = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trimEnd()}...`;
}

function optionalUuid(value: string | null | undefined) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function groupPayloadByIssue<T>(rows: Array<{ issueId: string; payload: T }>) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(row.issueId) ?? [];
    group.push(row.payload);
    grouped.set(row.issueId, group);
  }
  return grouped;
}

function latestUpdateByIssue(rows: Array<DearMeOutputUpdate & { issueId: string }>) {
  const grouped = new Map<string, DearMeOutputUpdate>();
  for (const row of rows) {
    if (!grouped.has(row.issueId)) {
      grouped.set(row.issueId, {
        id: row.id,
        bodyPreview: row.bodyPreview,
        createdAt: row.createdAt,
      });
    }
  }
  return grouped;
}

function shouldReplaceIssueForOutput(candidate: DearMeIssueRow, current: DearMeIssueRow | undefined) {
  if (!current) return true;
  const candidateActive = candidate.status !== "cancelled";
  const currentActive = current.status !== "cancelled";
  if (candidateActive !== currentActive) return candidateActive;
  return candidate.updatedAt.getTime() > current.updatedAt.getTime();
}

function issueByOutputFingerprint(issueRows: DearMeIssueRow[]) {
  const byFingerprint = new Map<string, DearMeIssueRow>();
  for (const issue of issueRows) {
    const current = byFingerprint.get(issue.originFingerprint);
    if (shouldReplaceIssueForOutput(issue, current)) {
      byFingerprint.set(issue.originFingerprint, issue);
    }
  }
  return byFingerprint;
}

function parseReviewAction(body: string): DearMeOutputReviewAction | null {
  const normalized = body.toLowerCase();
  if (normalized.startsWith("dearme decision: approved this prepared work.")) return "approve";
  if (normalized.startsWith("dearme decision: requested changes before this represents me.")) return "request_changes";
  if (normalized.startsWith("dearme decision: regenerate this prepared work before review.")) return "regenerate";
  if (normalized.startsWith("dearme decision: marked this prepared work as not useful.")) return "not_useful";
  return null;
}

function reviewDecisionNotePreview(body: string) {
  const [, ...parts] = body.split(/\n\n/);
  return plainPreview(parts.join("\n\n"), 240) || null;
}

export function parseDearMeOutputReviewDecisionComment(input: {
  body: string;
  createdAt: Date;
}): DearMeParsedReviewDecision | null {
  const action = parseReviewAction(input.body);
  if (!action) return null;
  return {
    action,
    createdAt: input.createdAt,
    notePreview: reviewDecisionNotePreview(input.body),
  };
}

export function parseDearMeOutputReviewDecisionComments(reviewComments: DearMeReviewComment[]) {
  return reviewComments
    .map((comment) => parseDearMeOutputReviewDecisionComment(comment))
    .filter((decision): decision is DearMeParsedReviewDecision => Boolean(decision))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function parseReviewDecisions(reviewComments: DearMeReviewComment[]) {
  return parseDearMeOutputReviewDecisionComments(reviewComments);
}

function latestReviewFeedback(decisions: DearMeParsedReviewDecision[]): DearMeOutputReviewFeedback | null {
  const latestDecision = decisions[0] ?? null;
  if (!latestDecision || latestDecision.action === "approve") return null;
  return latestDecision as DearMeOutputReviewFeedback;
}

function isReviewFeedbackDecision(decision: DearMeParsedReviewDecision): decision is DearMeOutputReviewFeedback {
  return decision.action !== "approve";
}

function customerSafeFeedbackText(value: string | null | undefined, maxLength = 260) {
  const preview = plainPreview(value, maxLength);
  if (!preview || DEARME_FEEDBACK_TRACE_HIDDEN_TERMS.test(preview)) return null;
  return preview;
}

function hasFreshWorkAfterFeedback(input: {
  reviewFeedback: DearMeOutputReviewFeedback;
  documents: DearMeOutputDocument[];
  latestUpdate: DearMeOutputUpdate | null;
}) {
  const feedbackAt = input.reviewFeedback.createdAt.getTime();
  return input.documents.some((document) => Date.parse(document.updatedAt) > feedbackAt) ||
    (input.latestUpdate ? Date.parse(input.latestUpdate.createdAt) > feedbackAt : false);
}

function updatedAtTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function hasUpdatedWorkAfterFeedback(input: {
  reviewFeedback: DearMeOutputReviewFeedback;
  latestWorkUpdatedAt?: Date | string | null;
}) {
  const latestWorkUpdatedAt = updatedAtTime(input.latestWorkUpdatedAt);
  return latestWorkUpdatedAt !== null && latestWorkUpdatedAt > input.reviewFeedback.createdAt.getTime();
}

function detailTextFromDetails(
  details: DearMeOutputDetail[],
  kinds: DearMeOutputDetail["kind"][],
  maxLength = 220,
) {
  for (const kind of kinds) {
    const detail = details.find((candidate) => candidate.kind === kind);
    const value = customerSafeFeedbackText(detail?.value, maxLength);
    if (value) return value;
  }
  return null;
}

function feedbackTraceSummary(action: DearMeOutputReviewFeedback["action"]) {
  if (action === "request_changes") {
    return "DearMe used your change request before preparing this version.";
  }
  if (action === "not_useful") {
    return "DearMe changed direction before bringing this back for review.";
  }
  return "DearMe prepared a new private version instead of lightly editing the previous one.";
}

function feedbackTraceLead(action: DearMeOutputReviewFeedback["action"]) {
  if (action === "request_changes") {
    return "Revised the private draft around your requested change.";
  }
  if (action === "not_useful") {
    return "Changed the angle before asking for another launch call.";
  }
  return "Prepared a replacement version from your direction.";
}

function reviewReceiptLabel(action: DearMeOutputReviewFeedback["action"]) {
  if (action === "request_changes") return "Change requested";
  if (action === "not_useful") return "New direction requested";
  return "Another pass requested";
}

export function dearMeOutputArtifactTitleForOriginFingerprint(originFingerprint: string | null | undefined) {
  if (!originFingerprint) return "Private work";
  if (originFingerprint === BRAND_OS_FINGERPRINT) return BRAND_OS_DESCRIPTOR.title;
  if (originFingerprint === VOICE_OPERATION_FINGERPRINT) return VOICE_DESCRIPTOR.title;
  return OPERATION_DESCRIPTORS[originFingerprint]?.title ?? "Private work";
}

function regenerationReviewSignal(decision: DearMeOutputReviewFeedback, artifactTitle: string) {
  if (decision.action === "request_changes") {
    return `The user asked for changes to ${artifactTitle}.`;
  }
  if (decision.action === "not_useful") {
    return `The user marked ${artifactTitle} as not useful.`;
  }
  return `The user asked for a new version of ${artifactTitle}.`;
}

function regenerationNextDraftDirection(decision: DearMeOutputReviewFeedback) {
  if (decision.action === "request_changes") {
    return "Revise the next private draft around the requested changes while preserving any voice, proof, or audience choices that still fit.";
  }
  if (decision.action === "not_useful") {
    return "Change direction before drafting again; avoid repeating the angle, structure, or proof choices that made the last version unhelpful.";
  }
  return "Prepare a substantially new private draft instead of lightly editing the last version.";
}

export function buildDearMeOutputRegenerationBrief(input: {
  decision: DearMeParsedReviewDecision;
  artifactTitle: string;
  previousDraft?: DearMeOutputPreviousDraftContext | null;
}) {
  if (input.decision.action === "approve") return null;

  const decision = input.decision as DearMeOutputReviewFeedback;
  const note = customerSafeFeedbackText(decision.notePreview, 700);
  const previousTitle = customerSafeFeedbackText(input.previousDraft?.title, 160);
  const previousSummary = customerSafeFeedbackText(input.previousDraft?.summary, 420);
  const previousBody = customerSafeFeedbackText(input.previousDraft?.bodyPreview, 900);
  const previousDraftParts = [
    previousTitle ? `title: ${previousTitle}` : null,
    previousSummary ? `summary: ${previousSummary}` : null,
    previousBody ? `draft context: ${previousBody}` : null,
  ].filter((part): part is string => Boolean(part));

  const lines = [
    "DearMe regeneration brief:",
    `- Review signal: ${regenerationReviewSignal(decision, input.artifactTitle)}`,
  ];

  if (note) {
    lines.push(`- User feedback: ${JSON.stringify(note)}`);
  }

  if (previousDraftParts.length > 0) {
    lines.push(`- Previous draft context: ${previousDraftParts.join("; ")}.`);
  }

  lines.push(
    `- Next draft direction: ${regenerationNextDraftDirection(decision)}`,
    "- Keep the next version private until the user reviews it.",
  );

  return lines.join("\n");
}

export function selectDearMeOutputRegenerationDecision(input: {
  decisions: DearMeParsedReviewDecision[];
  latestWorkUpdatedAt?: Date | string | null;
}) {
  const decisions = [...input.decisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latestDecision = decisions[0] ?? null;
  if (!latestDecision || latestDecision.action === "approve") return null;

  const reviewFeedback = latestDecision as DearMeOutputReviewFeedback;
  if (hasUpdatedWorkAfterFeedback({
    reviewFeedback,
    latestWorkUpdatedAt: input.latestWorkUpdatedAt,
  })) {
    return null;
  }

  const attemptCount = decisions.filter(isReviewFeedbackDecision).length;
  if (attemptCount >= DEARME_OUTPUT_REVIEW_LOOP_MAX_ATTEMPTS) return null;

  return reviewFeedback;
}

export function buildDearMeOutputRegenerationBriefForReviewLoop(input: {
  decisions: DearMeParsedReviewDecision[];
  artifactTitle: string;
  previousDraft?: DearMeOutputPreviousDraftContext | null;
  latestWorkUpdatedAt?: Date | string | null;
}) {
  const decision = selectDearMeOutputRegenerationDecision({
    decisions: input.decisions,
    latestWorkUpdatedAt: input.latestWorkUpdatedAt,
  });
  if (!decision) return null;
  return buildDearMeOutputRegenerationBrief({
    decision,
    artifactTitle: input.artifactTitle,
    previousDraft: input.previousDraft,
  });
}

function buildReviewReceipts(decisions: DearMeParsedReviewDecision[]) {
  const receipts = decisions
    .filter(isReviewFeedbackDecision)
    .map((decision) => {
      const label = reviewReceiptLabel(decision.action);
      const note = customerSafeFeedbackText(decision.notePreview, 180);
      return note ? `${label}: ${note}` : label;
    });
  return Array.from(new Set(receipts)).slice(0, 4);
}

function buildFeedbackTrace(input: {
  reviewFeedback: DearMeOutputReviewFeedback | null;
  decisions: DearMeParsedReviewDecision[];
  details: DearMeOutputDetail[];
  documents: DearMeOutputDocument[];
  latestUpdate: DearMeOutputUpdate | null;
}): DearMeOutputReviewLoop["feedbackTrace"] {
  if (!input.reviewFeedback) return null;
  if (!hasFreshWorkAfterFeedback({
    reviewFeedback: input.reviewFeedback,
    documents: input.documents,
    latestUpdate: input.latestUpdate,
  })) {
    return null;
  }

  const currentFocus = detailTextFromDetails(input.details, [
    "hook",
    "draft_body",
    "completed_work",
    "decisions_needed",
    "next_bets",
    "proposed_copy",
    "target",
    "why_relevant",
  ]);
  const proof = detailTextFromDetails(input.details, [
    "proof_used",
    "proof_source",
    "report_reference",
  ]);
  const changes = [
    feedbackTraceLead(input.reviewFeedback.action),
    currentFocus ? `Current draft focus: ${currentFocus}` : null,
    proof ? `Proof now in view: ${proof}` : null,
    "Still private until you approve it.",
  ].filter((change): change is string => Boolean(change));
  const receipts = buildReviewReceipts(input.decisions);

  return {
    headline: "Feedback applied",
    summary: feedbackTraceSummary(input.reviewFeedback.action),
    userFeedback: customerSafeFeedbackText(input.reviewFeedback.notePreview),
    changes: changes.slice(0, 4),
    ...(receipts.length > 0 ? { receipts } : {}),
  };
}

function reviewLoopNextStep(state: DearMeOutputReviewLoop["state"]) {
  switch (state) {
    case "fresh":
      return "Your team is preparing this privately.";
    case "needs_user_review":
      return "Review it, then launch, request changes, ask for another pass, or mark it not useful.";
    case "revision_requested":
      return "Your team has your note and should prepare a revised version.";
    case "regeneration_requested":
      return "Your team has your direction and should prepare another version.";
    case "not_useful":
      return "Your team should avoid this angle and try a different route next.";
    case "approved":
      return "Launched work is recorded as something that can represent you.";
    case "retry_limit_reached":
      return "Pause regeneration and give a clearer direction before spending another attempt.";
  }
}

function buildReviewHandoff(
  decision: DearMeParsedReviewDecision | null,
  state: DearMeOutputReviewLoop["state"],
): DearMeOutputReviewLoop["reviewHandoff"] {
  if (!decision || decision.action === "approve") return null;
  if (state === "retry_limit_reached") {
    return {
      action: decision.action,
      title: "Clearer direction needed",
      summary: "DearMe has paused this review path so your team does not keep spending attempts on the wrong direction.",
      userDirection: decision.notePreview,
      nextDraftDirection: "Give one sharper instruction before the team prepares another private attempt.",
    };
  }
  if (decision.action === "request_changes") {
    return {
      action: decision.action,
      title: "Change request captured",
      summary: "DearMe will keep your note attached to the next private revision.",
      userDirection: decision.notePreview,
      nextDraftDirection: "Revise the current draft around this note before asking for approval again.",
    };
  }
  if (decision.action === "not_useful") {
    return {
      action: decision.action,
      title: "New route requested",
      summary: "DearMe should avoid this angle and prepare a different route for your brand work.",
      userDirection: decision.notePreview,
      nextDraftDirection: "Drop this angle, choose a better one, and bring back a more useful private draft.",
    };
  }
  return {
    action: decision.action,
    title: "Regeneration brief captured",
    summary: "DearMe will keep this direction attached to the next private draft.",
    userDirection: decision.notePreview,
    nextDraftDirection: "Prepare a stronger replacement before asking for approval again.",
  };
}

function buildReviewLoop(input: {
  status: DearMeOutputStatus;
  decisions: DearMeParsedReviewDecision[];
  feedbackTrace: DearMeOutputReviewLoop["feedbackTrace"];
}): DearMeOutputReviewLoop {
  const lastDecision = input.decisions[0] ?? null;
  const attemptCount = input.decisions.filter((decision) => decision.action !== "approve").length;
  const feedbackApplied =
    Boolean(input.feedbackTrace) &&
    lastDecision?.action !== "approve" &&
    (input.status === "ready_for_review" || input.status === "complete");
  let state: DearMeOutputReviewLoop["state"];

  if (!lastDecision) {
    state = input.status === "ready_for_review" || input.status === "complete"
      ? "needs_user_review"
      : "fresh";
  } else if (lastDecision.action === "approve") {
    state = "approved";
  } else if (feedbackApplied) {
    state = "needs_user_review";
  } else if (attemptCount >= DEARME_OUTPUT_REVIEW_LOOP_MAX_ATTEMPTS) {
    state = "retry_limit_reached";
  } else if (lastDecision.action === "request_changes") {
    state = "revision_requested";
  } else if (lastDecision.action === "regenerate") {
    state = "regeneration_requested";
  } else {
    state = "not_useful";
  }

  return {
    state,
    attemptCount,
    maxAttempts: DEARME_OUTPUT_REVIEW_LOOP_MAX_ATTEMPTS,
    isRetriable: !["blocked", "cancelled"].includes(input.status) &&
      state !== "approved" &&
      state !== "retry_limit_reached",
    lastAction: lastDecision?.action ?? null,
    lastDecisionAt: lastDecision ? toIso(lastDecision.createdAt) : null,
    lastDecisionNotePreview: lastDecision?.notePreview ?? null,
    nextStep: feedbackApplied
      ? "Review this updated private work; your last feedback is reflected below before anything goes public."
      : reviewLoopNextStep(state),
    reviewHandoff: feedbackApplied ? null : buildReviewHandoff(lastDecision, state),
    feedbackTrace: input.feedbackTrace,
  };
}

function filterDocuments(
  documentsForIssue: DearMeOutputDocument[],
  descriptor: OutputDescriptor,
) {
  if (!descriptor.documentKeys) return documentsForIssue;
  const allowed = new Set(descriptor.documentKeys);
  const order = new Map(descriptor.documentKeys.map((key, index) => [key, index]));
  return documentsForIssue
    .filter((document) => allowed.has(document.key))
    .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLabeledValue(value: string, labels: readonly string[]) {
  const stops = DETAIL_EXTRACTION_LABELS.map(escapeRegExp).join("|");
  const keys = labels.map(escapeRegExp).join("|");
  const colonMatch = value.match(
    new RegExp(`(?:^|\\s)(?:${keys})\\s*:\\s*(.*?)(?=\\s(?:${stops})\\s*:|$)`, "i"),
  );
  if (colonMatch?.[1]) return plainPreview(colonMatch[1], 1_500);
  const headingMatch = value.match(
    new RegExp(`(?:^|\\s)(?:${keys})\\s+(.*?)(?=\\s(?:${stops})(?:\\s|:)|$)`),
  );
  return plainPreview(headingMatch?.[1], 1_500);
}

function outputTextSegments(input: {
  documents: DearMeOutputDocument[];
  workProducts: DearMeOutputWorkProduct[];
  latestUpdate: DearMeOutputUpdate | null;
}) {
  const segments: OutputDetailText[] = [];
  for (const document of input.documents) {
    if (document.bodyPreview.trim().length > 0) {
      segments.push({ value: document.bodyPreview, source: "document" });
    }
  }
  for (const workProduct of input.workProducts) {
    const summary = plainPreview(workProduct.summary);
    if (summary) {
      segments.push({ value: summary, source: "prepared_work" });
    }
  }
  if (input.latestUpdate?.bodyPreview.trim()) {
    segments.push({ value: input.latestUpdate.bodyPreview, source: "progress" });
  }
  return segments;
}

function primaryOutputText(input: {
  documents: DearMeOutputDocument[];
  workProducts: DearMeOutputWorkProduct[];
  latestUpdate: DearMeOutputUpdate | null;
}) {
  return outputTextSegments(input)[0] ?? null;
}

function extractOutputText(
  input: {
    documents: DearMeOutputDocument[];
    workProducts: DearMeOutputWorkProduct[];
    latestUpdate: DearMeOutputUpdate | null;
  },
  labels: readonly string[],
) {
  for (const segment of outputTextSegments(input)) {
    const value = extractLabeledValue(segment.value, labels);
    if (value) {
      return { value, source: segment.source } satisfies OutputDetailText;
    }
  }
  return null;
}

function firstSentenceText(text: OutputDetailText | null) {
  if (!text) return null;
  const value = plainPreview(text.value, 260);
  if (!value) return null;
  const match = value.match(/^(.{1,260}?)(?:[.!?](?:\s|$)|$)/);
  return {
    value: plainPreview(match?.[1] ?? value, 260),
    source: text.source,
  } satisfies OutputDetailText;
}

function derivedText(value: string) {
  return { value, source: "derived" } satisfies OutputDetailText;
}

function outputByKind(outputs: DearMeOutputItem[], kind: DearMeOutputKind) {
  return outputs.find((output) => output.kind === kind) ?? null;
}

function detailValue(
  output: DearMeOutputItem | null,
  kinds: DearMeOutputDetail["kind"][],
  maxLength = 500,
) {
  if (!output) return null;
  for (const kind of kinds) {
    const detail = output.details.find((candidate) => candidate.kind === kind);
    if (detail?.value) return plainPreview(detail.value, maxLength);
  }
  return null;
}

function evidenceSummary(
  output: DearMeOutputItem | null,
  kinds: DearMeOutputSourceEvidence["kind"][],
  maxLength = 500,
) {
  if (!output) return null;
  for (const kind of kinds) {
    const evidence = output.sourceEvidence.find((candidate) => candidate.kind === kind);
    if (evidence?.summary) return plainPreview(evidence.summary, maxLength);
  }
  return null;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => Boolean(value && value.trim().length > 0)) ?? null;
}

function compactList(values: Array<string | null | undefined>, fallback: string) {
  const normalized = values
    .map((value) => plainPreview(value, 220))
    .filter((value): value is string => Boolean(value));
  return normalized.length > 0 ? normalized.join("; ") : fallback;
}

function packetLines(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line && line.trim().length > 0)).join("\n");
}

function voiceGateKindForChannel(channel: string | null) {
  const normalized = channel?.toLowerCase() ?? "";
  if (normalized.includes("linkedin")) return "linkedin-post" as const;
  if (normalized.includes("newsletter")) return "newsletter-issue" as const;
  if (normalized.includes("email")) return "outbound-email" as const;
  return "x-tweet" as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function voiceGateFromMetadata(metadata: unknown): DearMeVoiceGateResult | null {
  if (!isRecord(metadata)) return null;

  const nestedDearMe = isRecord(metadata.dearme) ? metadata.dearme.voiceGate : undefined;
  for (const candidate of [metadata.voiceGate, metadata.dearmeVoiceGate, nestedDearMe]) {
    const parsed = dearMeVoiceGateResultSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }

  return null;
}

function voiceGateStatusRank(status: DearMeVoiceGateResult["status"]) {
  switch (status) {
    case "blocked_before_public":
      return 0;
    case "needs_voice_review":
      return 1;
    case "ready_for_review":
    default:
      return 2;
  }
}

function strictestVoiceGate(packet: DearMeContentDraftPacket) {
  return [...packet.drafts]
    .map((draft) => draft.voiceGate)
    .sort((left, right) =>
      voiceGateStatusRank(left.status) - voiceGateStatusRank(right.status) ||
      left.score - right.score
    )[0]!;
}

function contentDraftPacketExternalId(packet: DearMeContentDraftPacket) {
  return `content-drafts:${packet.packetId}`;
}

function formatContentDraftPacket(packet: DearMeContentDraftPacket) {
  const parts = [
    `Drafts and Assets Ready for Review: ${packet.title}`,
    packet.summary ? `Summary: ${packet.summary}` : null,
    ...packet.drafts.flatMap((draft, index) => [
      `Draft ${index + 1}: ${draft.title}`,
      `Channel: ${draft.channel}`,
      `Audience: ${draft.audience}`,
      `Hook: ${draft.hook}`,
      `Draft body: ${draft.body}`,
      `Proof used: ${draft.proofUsed}`,
      `Voice Gate: ${draft.voiceGate.score}/100, ${draft.voiceGate.status}`,
      `Launch boundary: ${draft.launchBoundary}`,
    ]),
    "Cycle evidence:",
    ...packet.cycleEvidence.map((item) => `${item.label}: ${item.summary}`),
  ].filter((part): part is string => Boolean(part));

  return parts.join("\n");
}

function outputWorkProductFromRow(row: typeof issueWorkProducts.$inferSelect): DearMeOutputWorkProduct {
  return dearMeOutputWorkProductSchema.parse({
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url ?? null,
    status: row.status,
    reviewState: row.reviewState,
    summary: row.summary ?? null,
    voiceGate: voiceGateFromMetadata(row.metadata),
    updatedAt: toIso(row.updatedAt),
  });
}

function renderCycleOutputPacket(input: {
  outputs: DearMeOutputItem[];
  voiceFitScore: number;
  voiceFitPassed: boolean;
}) {
  const brandOs = outputByKind(input.outputs, "brand_os");
  const voiceProfile = outputByKind(input.outputs, "voice_profile");
  const contentDrafts = outputByKind(input.outputs, "content_drafts");
  const opportunityDrafts = outputByKind(input.outputs, "opportunity_drafts");
  const portfolioUpdate = outputByKind(input.outputs, "portfolio_update");
  const weeklyReport = outputByKind(input.outputs, "weekly_report");

  const channel = detailValue(contentDrafts, ["channel"], 120) ?? "LinkedIn";
  const audience = firstNonEmpty(
    detailValue(contentDrafts, ["audience"], 260),
    detailValue(opportunityDrafts, ["target"], 260),
    detailValue(brandOs, ["positioning"], 260),
    "the first audience lane selected from private brand work",
  );
  const hook = firstNonEmpty(
    detailValue(contentDrafts, ["hook"], 260),
    detailValue(brandOs, ["positioning"], 260),
    "Turn private work into visible proof without publishing before review.",
  );
  const draftBody = firstNonEmpty(
    detailValue(contentDrafts, ["draft_body"], 700),
    hook,
    "A private proof-backed starter post is ready for review.",
  );
  const proofUsed = firstNonEmpty(
    detailValue(contentDrafts, ["proof_used"], 500),
    detailValue(portfolioUpdate, ["proof_source"], 500),
    detailValue(brandOs, ["proof_used"], 500),
    evidenceSummary(brandOs, ["proof"], 500),
    "the strongest private proof captured so far",
  );
  const launchBoundary = firstNonEmpty(
    detailValue(contentDrafts, ["approval_gate"], 360),
    evidenceSummary(contentDrafts, ["approval_boundary"], 360),
    "This stays private until the user approves publish.",
  );
  const contentReady = compactList([
    contentDrafts ? "content draft packet" : null,
    opportunityDrafts ? "opportunity angle" : null,
    portfolioUpdate ? "site proof draft" : null,
  ], "private draft packet");
  const completedWork = compactList([
    brandOs ? "Brand OS" : null,
    voiceProfile ? "voice profile" : null,
    contentDrafts ? "starter content" : null,
    opportunityDrafts ? "opportunity angle" : null,
    portfolioUpdate ? "private site proof" : null,
  ], "private brand work");
  const nextBets = firstNonEmpty(
    detailValue(weeklyReport, ["next_bets"], 500),
    detailValue(portfolioUpdate, ["proposed_copy"], 500),
    "Pick the strongest draft, revise once from feedback, then prepare the next private proof.",
  );

  const voiceFit = `${input.voiceFitScore}/100 ${input.voiceFitPassed ? "ready for review" : "needs revision before launch"}`;
  const contentBody = packetLines([
    `Channel: ${channel}`,
    `Audience: ${audience}`,
    `Hook: ${hook}`,
    `Draft body: ${draftBody}`,
    `Proof used: ${proofUsed}`,
    `Voice fit score: ${voiceFit}`,
    `Drafts and Assets Ready for Review: ${contentReady}`,
    `Launch boundary: ${launchBoundary}`,
    "Cycle packet: The content draft and Dear me report now use the same private evidence packet.",
  ]);
  const reportBody = packetLines([
    `Completed work: ${completedWork} are ready in the private review queue.`,
    `Drafts and Assets Ready for Review: ${contentReady}; voice fit ${voiceFit}.`,
    `Decisions needed: Review, request changes, or regenerate the prepared work. Publishing, sending, and deployment still wait for explicit approval.`,
    `Next bets: ${nextBets}`,
    "Outcomes and Signals: The first cycle has a proof-backed draft, a reviewable report, and a clear next decision.",
    "Budget: No outbound spend, send, publish, or deploy action was triggered by this private packet.",
    "Report reference: Cycle output packet",
  ]);

  return {
    contentBody,
    reportBody,
    contentSummary: `Private content packet ready for review with voice fit ${voiceFit}.`,
    reportSummary: `Private Dear me report prepared from the same cycle packet; next decision is review or revision.`,
  };
}

function addOutputDetail(
  details: DearMeOutputDetail[],
  kind: DearMeOutputDetail["kind"],
  label: string,
  text: OutputDetailText | null,
) {
  const value = plainPreview(text?.value, 1_500);
  if (!value || details.some((detail) => detail.kind === kind)) return;
  details.push({
    kind,
    label,
    value,
    source: text?.source ?? "derived",
  });
}

function buildOutputDetails(input: {
  descriptor: OutputDescriptor;
  documents: DearMeOutputDocument[];
  workProducts: DearMeOutputWorkProduct[];
  latestUpdate: DearMeOutputUpdate | null;
}) {
  const details: DearMeOutputDetail[] = [];
  const primary = primaryOutputText(input);

  switch (input.descriptor.kind) {
    case "brand_os":
      addOutputDetail(details, "positioning", "Positioning", extractOutputText(input, ["Positioning", "Known for"]) ?? primary);
      addOutputDetail(details, "proof_used", "Proof", extractOutputText(input, ["Proof Points", "Proof", "Proof used"]));
      addOutputDetail(details, "approval_gate", "Launch boundary", extractOutputText(input, ["Launch boundaries", "Boundaries", "Approval boundaries", "Approval gate"]) ?? derivedText("Use these boundaries before public claims, outreach, or site updates."));
      break;
    case "voice_profile":
      addOutputDetail(details, "voice_guidance", "Voice guidance", extractOutputText(input, ["Voice guidance", "Guidance"]) ?? primary);
      addOutputDetail(details, "approval_gate", "Launch boundary", extractOutputText(input, ["Launch boundary", "Approval gate"]) ?? derivedText("Use this profile before any public copy represents you."));
      break;
    case "content_drafts":
      addOutputDetail(details, "channel", "Channel", extractOutputText(input, ["Channel"]));
      addOutputDetail(details, "audience", "Audience", extractOutputText(input, ["Audience"]));
      addOutputDetail(details, "hook", "Hook", extractOutputText(input, ["Hook"]) ?? firstSentenceText(primary));
      addOutputDetail(details, "draft_body", "Draft body", extractOutputText(input, ["Draft body", "Draft", "Body"]) ?? primary);
      addOutputDetail(details, "proof_used", "Proof used", extractOutputText(input, ["Proof used", "Proof"]));
      addOutputDetail(details, "approval_gate", "Launch boundary", extractOutputText(input, ["Launch boundary", "Approval gate"]) ?? derivedText("The post waits for one launch call before publishing."));
      break;
    case "opportunity_drafts":
      addOutputDetail(details, "target", "Target", extractOutputText(input, ["Target", "Contact", "Opportunity"]) ?? primary);
      addOutputDetail(details, "why_relevant", "Why relevant", extractOutputText(input, ["Why relevant", "Relevance"]) ?? firstSentenceText(primary));
      addOutputDetail(details, "relevance_score", "Relevance score", extractOutputText(input, ["Relevance score", "Score"]));
      addOutputDetail(details, "outreach_angle", "Outreach angle", extractOutputText(input, ["Outreach angle", "Angle"]));
      addOutputDetail(details, "draft_message", "Draft message", extractOutputText(input, ["Draft message", "Message"]));
      addOutputDetail(details, "approval_gate", "Launch boundary", extractOutputText(input, ["Launch boundary", "Approval gate"]) ?? derivedText("The outreach waits for one launch call before sending."));
      break;
    case "portfolio_update":
      addOutputDetail(details, "page_section", "Page or section", extractOutputText(input, ["Page section", "Section", "Page"]));
      addOutputDetail(details, "proof_source", "Proof source", extractOutputText(input, ["Proof source", "Proof"]));
      addOutputDetail(details, "proposed_copy", "Proposed copy", extractOutputText(input, ["Proposed copy", "Copy", "Recommendation"]) ?? primary);
      addOutputDetail(details, "deploy_gate", "Deploy boundary", extractOutputText(input, ["Deploy boundary", "Deploy gate", "Approval gate"]) ?? derivedText("The public site update waits for one launch call before going live."));
      break;
    case "weekly_report":
      addOutputDetail(details, "completed_work", "Completed work", extractOutputText(input, ["Completed work", "Work Completed"]) ?? primary);
      addOutputDetail(details, "decisions_needed", "Decisions needed", extractOutputText(input, ["Decisions needed"]) ?? derivedText("Review the Work Ready queue before DearMe prepares the next moves."));
      addOutputDetail(details, "next_bets", "Next bets", extractOutputText(input, ["Next bets", "Next bet"]) ?? firstSentenceText(primary));
      addOutputDetail(details, "report_reference", "Report reference", extractOutputText(input, ["Report reference"]) ?? derivedText(input.documents[0]?.title ?? input.descriptor.title));
      break;
  }

  return details.slice(0, 12);
}

function addSourceEvidenceFromDetail(
  items: DearMeOutputSourceEvidence[],
  kind: DearMeOutputSourceEvidence["kind"],
  label: string,
  details: DearMeOutputDetail[],
  detailKinds: DearMeOutputDetail["kind"][],
) {
  const detail = detailKinds
    .map((detailKind) => details.find((candidate) => candidate.kind === detailKind))
    .find((candidate): candidate is DearMeOutputDetail => Boolean(candidate));
  const summary = plainPreview(detail?.value, 700);
  if (!detail || !summary || items.some((item) => item.kind === kind)) return;
  items.push({
    kind,
    label,
    summary,
    source: detail.source,
  });
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function addPrivateReferenceEvidence(
  items: DearMeOutputSourceEvidence[],
  documents: DearMeOutputDocument[],
  workProducts: DearMeOutputWorkProduct[],
  latestUpdate: DearMeOutputUpdate | null,
) {
  const parts = [
    documents.length > 0 ? countLabel(documents.length, "private reference") : null,
    workProducts.length > 0 ? countLabel(workProducts.length, "prepared artifact") : null,
    latestUpdate ? "latest team note" : null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return;
  items.push({
    kind: "private_reference",
    label: "Private references",
    summary: `${parts.join(", ")} used for this review.`,
    source: documents.length > 0 ? "document" : workProducts.length > 0 ? "prepared_work" : "progress",
  });
}

function buildOutputSourceEvidence(input: {
  details: DearMeOutputDetail[];
  documents: DearMeOutputDocument[];
  workProducts: DearMeOutputWorkProduct[];
  latestUpdate: DearMeOutputUpdate | null;
}) {
  const items: DearMeOutputSourceEvidence[] = [];

  addSourceEvidenceFromDetail(items, "voice_memory", "Voice & Memory", input.details, [
    "voice_guidance",
    "audience",
    "positioning",
    "why_relevant",
    "hook",
  ]);
  addSourceEvidenceFromDetail(items, "proof", "Proof used", input.details, [
    "proof_used",
    "proof_source",
    "completed_work",
    "report_reference",
  ]);
  addSourceEvidenceFromDetail(items, "approval_boundary", "Launch boundary", input.details, [
    "approval_gate",
    "deploy_gate",
    "decisions_needed",
  ]);
  addPrivateReferenceEvidence(items, input.documents, input.workProducts, input.latestUpdate);

  return items.slice(0, 6);
}

function buildOutputItem(input: {
  issue: DearMeIssueRow;
  descriptor: OutputDescriptor;
  documents: DearMeOutputDocument[];
  workProducts: DearMeOutputWorkProduct[];
  latestUpdate: DearMeOutputUpdate | null;
  reviewComments: DearMeReviewComment[];
}) {
  const hasProducedArtifact =
    input.documents.length > 0 ||
    input.workProducts.length > 0 ||
    !!input.latestUpdate;
  const hasRevisionRequest = input.workProducts.some((workProduct) =>
    workProduct.reviewState === "changes_requested" || workProduct.reviewState === "not_useful"
  );
  const status = deriveDearMeOutputStatus({
    issueStatus: input.issue.status,
    hasProducedArtifact,
    hasRevisionRequest,
  });
  const details = buildOutputDetails({
    descriptor: input.descriptor,
    documents: input.documents,
    workProducts: input.workProducts,
    latestUpdate: input.latestUpdate,
  });
  const reviewDecisions = parseReviewDecisions(input.reviewComments);
  const feedbackTrace = buildFeedbackTrace({
    reviewFeedback: latestReviewFeedback(reviewDecisions),
    decisions: reviewDecisions,
    details,
    documents: input.documents,
    latestUpdate: input.latestUpdate,
  });

  return {
    id: `${input.issue.id}:${input.descriptor.kind}`,
    companyId: input.issue.companyId,
    kind: input.descriptor.kind,
    title: input.descriptor.title,
    summary: input.descriptor.summary,
    status,
    isReviewable: status === "ready_for_review" || status === "complete",
    issueId: input.issue.id,
    issueIdentifier: input.issue.identifier,
    issueTitle: input.issue.title,
    updatedAt: toIso(input.issue.updatedAt),
    documents: input.documents,
    workProducts: input.workProducts,
    latestUpdate: input.latestUpdate,
    reviewLoop: buildReviewLoop({
      status,
      decisions: reviewDecisions,
      feedbackTrace,
    }),
    details,
    sourceEvidence: buildOutputSourceEvidence({
      details,
      documents: input.documents,
      workProducts: input.workProducts,
      latestUpdate: input.latestUpdate,
    }),
  } satisfies DearMeOutputItem;
}

function buildOutputItems(input: {
  issues: DearMeIssueRow[];
  documentsByIssue: Map<string, DearMeOutputDocument[]>;
  workProductsByIssue: Map<string, DearMeOutputWorkProduct[]>;
  latestUpdateByIssue: Map<string, DearMeOutputUpdate>;
  reviewCommentsByIssue: Map<string, DearMeReviewComment[]>;
}) {
  const byFingerprint = issueByOutputFingerprint(input.issues);
  const items: Array<DearMeOutputItem & { order: number }> = [];

  const brandOsIssue = byFingerprint.get(BRAND_OS_FINGERPRINT);
  if (brandOsIssue) {
    for (const descriptor of [BRAND_OS_DESCRIPTOR, VOICE_DESCRIPTOR]) {
      const documentsForIssue = filterDocuments(
        input.documentsByIssue.get(brandOsIssue.id) ?? [],
        descriptor,
      );
      items.push({
        ...buildOutputItem({
          issue: brandOsIssue,
          descriptor,
          documents: documentsForIssue,
          workProducts: input.workProductsByIssue.get(brandOsIssue.id) ?? [],
          latestUpdate: input.latestUpdateByIssue.get(brandOsIssue.id) ?? null,
          reviewComments: input.reviewCommentsByIssue.get(brandOsIssue.id) ?? [],
        }),
        order: descriptor.order,
      });
    }
  } else {
    const voiceIssue = byFingerprint.get(VOICE_OPERATION_FINGERPRINT);
    if (voiceIssue) {
      items.push({
        ...buildOutputItem({
          issue: voiceIssue,
          descriptor: VOICE_DESCRIPTOR,
          documents: input.documentsByIssue.get(voiceIssue.id) ?? [],
          workProducts: input.workProductsByIssue.get(voiceIssue.id) ?? [],
          latestUpdate: input.latestUpdateByIssue.get(voiceIssue.id) ?? null,
          reviewComments: input.reviewCommentsByIssue.get(voiceIssue.id) ?? [],
        }),
        order: VOICE_DESCRIPTOR.order,
      });
    }
  }

  for (const [fingerprint, descriptor] of Object.entries(OPERATION_DESCRIPTORS)) {
    const issue = byFingerprint.get(fingerprint);
    if (!issue) continue;
    items.push({
      ...buildOutputItem({
        issue,
        descriptor,
        documents: input.documentsByIssue.get(issue.id) ?? [],
        workProducts: input.workProductsByIssue.get(issue.id) ?? [],
        latestUpdate: input.latestUpdateByIssue.get(issue.id) ?? null,
        reviewComments: input.reviewCommentsByIssue.get(issue.id) ?? [],
      }),
      order: descriptor.order,
    });
  }

  return items
    .sort((a, b) => a.order - b.order || b.updatedAt.localeCompare(a.updatedAt))
    .map(({ order: _order, ...item }) => item);
}

function parseOutputId(outputId: string) {
  const separatorIndex = outputId.lastIndexOf(":");
  if (separatorIndex <= 0 || separatorIndex === outputId.length - 1) {
    throw notFound("DearMe output not found");
  }
  const issueId = outputId.slice(0, separatorIndex);
  const kind = outputId.slice(separatorIndex + 1);
  if (!outputKindSet.has(kind)) {
    throw notFound("DearMe output not found");
  }
  return { issueId, kind: kind as DearMeOutputKind };
}

function outputDecisionCopy(action: DearMeOutputReviewAction, decisionNote: string | null | undefined) {
  const note = decisionNote?.trim();
  if (action === "approve") {
    return [
      "DearMe decision: approved this prepared work.",
      note || "This represents me.",
    ].join("\n\n");
  }
  if (action === "request_changes") {
    return [
      "DearMe decision: requested changes before this represents me.",
      note || "Please revise this before review.",
    ].join("\n\n");
  }
  if (action === "not_useful") {
    return [
      "DearMe decision: marked this prepared work as not useful.",
      note || "This does not help right now.",
    ].join("\n\n");
  }
  return [
    "DearMe decision: regenerate this prepared work before review.",
    note || "Please prepare a new version for review.",
  ].join("\n\n");
}

function outputWorkProductReviewState(action: DearMeOutputReviewAction) {
  if (action === "approve") return "approved";
  if (action === "not_useful") return "not_useful";
  return "changes_requested";
}

function pendingNextMoveMatchesOutput(input: { payload: unknown; outputId: string }) {
  return isRecord(input.payload) && input.payload.outputId === input.outputId;
}

export function dearmeOutputHandoffService(db: Db) {
  const documentsSvc = documentService(db);
  const voiceGate = dearMeVoiceGateService();

  async function ensureNextMoveApproval(input: {
    companyId: string;
    output: DearMeOutputItem;
    issue: { assigneeAgentId: string | null };
    actor: DearMeOutputReviewActor;
    decisionNote: string | null | undefined;
    now: Date;
  }) {
    const copy = NEXT_MOVE_APPROVAL_COPY[input.output.kind];
    if (!copy) return null;

    const existing = await db
      .select({
        id: approvals.id,
        payload: approvals.payload,
      })
      .from(approvals)
      .where(and(
        eq(approvals.companyId, input.companyId),
        eq(approvals.type, DEARME_NEXT_MOVE_APPROVAL_TYPE),
        eq(approvals.status, "pending"),
      ))
      .then((rows) => rows.find((row) =>
        pendingNextMoveMatchesOutput({ payload: row.payload, outputId: input.output.id })
      ) ?? null);
    if (existing) return existing;

    const requestedByAgentId =
      input.issue.assigneeAgentId ?? (input.actor.actorType === "agent" ? input.actor.agentId : null);
    const [approval] = await db
      .insert(approvals)
      .values({
        companyId: input.companyId,
        type: DEARME_NEXT_MOVE_APPROVAL_TYPE,
        requestedByAgentId,
        requestedByUserId: null,
        status: "pending",
        payload: {
          title: copy.title,
          summary: copy.summary,
          recommendedAction: copy.recommendedAction,
          nextActionOnApproval: copy.nextActionOnApproval,
          risks: [...copy.risks],
          riskGate: copy.riskGate,
          outputId: input.output.id,
          outputKind: input.output.kind,
          issueId: input.output.issueId,
          issueIdentifier: input.output.issueIdentifier,
          preparedTitle: input.output.title,
          preparedSummary: input.output.summary,
          reviewNote: input.decisionNote?.trim() || null,
        },
        decisionNote: null,
        decidedByUserId: null,
        decidedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning({
        id: approvals.id,
        payload: approvals.payload,
      });

    if (!approval) {
      throw new Error("Failed to create DearMe next move approval");
    }

    await db
      .insert(issueApprovals)
      .values({
        companyId: input.companyId,
        issueId: input.output.issueId,
        approvalId: approval.id,
        linkedByAgentId: requestedByAgentId,
        linkedByUserId: input.actor.actorType === "user" ? input.actor.actorId : null,
        createdAt: input.now,
      })
      .onConflictDoNothing();

    return approval;
  }

  async function latestIssueDocumentRevisionId(issueId: string, key: string) {
    return db
      .select({ latestRevisionId: documents.latestRevisionId })
      .from(issueDocuments)
      .innerJoin(documents, eq(issueDocuments.documentId, documents.id))
      .where(and(eq(issueDocuments.issueId, issueId), eq(issueDocuments.key, key)))
      .limit(1)
      .then((rows) => rows[0]?.latestRevisionId ?? null);
  }

  async function upsertPacketDocument(input: {
    issueId: string;
    key: string;
    title: string;
    body: string;
    actor: DearMeOutputPacketActor;
  }) {
    const baseRevisionId = await latestIssueDocumentRevisionId(input.issueId, input.key);
    await documentsSvc.upsertIssueDocument({
      issueId: input.issueId,
      key: input.key,
      title: input.title,
      format: "markdown",
      body: input.body,
      changeSummary: "Prepared from DearMe cycle output packet",
      createdByAgentId: input.actor.agentId,
      createdByUserId: input.actor.actorType === "user" ? input.actor.actorId : null,
      createdByRunId: optionalUuid(input.actor.runId),
      ...(baseRevisionId ? { baseRevisionId } : {}),
    });
  }

  async function markOutputIssueReady(companyId: string, issueId: string, now: Date) {
    await db
      .update(issues)
      .set({
        status: "in_review",
        completedAt: null,
        cancelledAt: null,
        updatedAt: now,
      })
      .where(and(
        eq(issues.companyId, companyId),
        eq(issues.id, issueId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
        isNull(issues.hiddenAt),
      ));
  }

  async function upsertCycleWorkProduct(input: {
    companyId: string;
    issueId: string;
    type: string;
    externalId: string;
    title: string;
    summary: string;
    metadata: Record<string, unknown>;
    actor: DearMeOutputPacketActor;
    now: Date;
  }) {
    const existing = await db
      .select({ id: issueWorkProducts.id })
      .from(issueWorkProducts)
      .where(and(
        eq(issueWorkProducts.companyId, input.companyId),
        eq(issueWorkProducts.issueId, input.issueId),
        eq(issueWorkProducts.provider, CYCLE_OUTPUT_WORK_PRODUCT_PROVIDER),
        eq(issueWorkProducts.externalId, input.externalId),
      ))
      .orderBy(desc(issueWorkProducts.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    await db
      .update(issueWorkProducts)
      .set({ isPrimary: false, updatedAt: input.now })
      .where(and(
        eq(issueWorkProducts.companyId, input.companyId),
        eq(issueWorkProducts.issueId, input.issueId),
        eq(issueWorkProducts.type, input.type),
      ));

    const values = {
      type: input.type,
      provider: CYCLE_OUTPUT_WORK_PRODUCT_PROVIDER,
      externalId: input.externalId,
      title: input.title,
      url: null,
      status: "ready",
      reviewState: "pending",
      isPrimary: true,
      healthStatus: "healthy",
      summary: input.summary,
      metadata: input.metadata,
      createdByRunId: optionalUuid(input.actor.runId),
      updatedAt: input.now,
    };

    if (existing) {
      await db
        .update(issueWorkProducts)
        .set(values)
        .where(and(
          eq(issueWorkProducts.companyId, input.companyId),
          eq(issueWorkProducts.id, existing.id),
        ));
      return;
    }

    await db.insert(issueWorkProducts).values({
      ...values,
      companyId: input.companyId,
      issueId: input.issueId,
      createdAt: input.now,
    });
  }

  const service = {
    listOutputs: async (companyId: string) => {
      const issueRows = await db
        .select({
          id: issues.id,
          companyId: issues.companyId,
          title: issues.title,
          status: issues.status,
          identifier: issues.identifier,
          originFingerprint: issues.originFingerprint,
          assigneeAgentId: issues.assigneeAgentId,
          updatedAt: issues.updatedAt,
        })
        .from(issues)
        .where(and(
          eq(issues.companyId, companyId),
          eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
          isNull(issues.hiddenAt),
        ))
        .orderBy(desc(issues.updatedAt))
        .limit(50);

      if (issueRows.length === 0) {
        return dearMeOutputsResponseSchema.parse({ companyId, outputs: [] });
      }

      const issueIds = issueRows.map((issue) => issue.id);
      const [documentRows, workProductRows, commentRows, reviewCommentRows] = await Promise.all([
        db
          .select({
            id: documents.id,
            issueId: issueDocuments.issueId,
            key: issueDocuments.key,
            title: documents.title,
            format: documents.format,
            revisionNumber: documents.latestRevisionNumber,
            body: documents.latestBody,
            updatedAt: documents.updatedAt,
          })
          .from(issueDocuments)
          .innerJoin(documents, eq(issueDocuments.documentId, documents.id))
          .where(and(
            eq(issueDocuments.companyId, companyId),
            inArray(issueDocuments.issueId, issueIds),
          ))
          .orderBy(asc(issueDocuments.key), desc(documents.updatedAt)),
        db
          .select({
            id: issueWorkProducts.id,
            issueId: issueWorkProducts.issueId,
            type: issueWorkProducts.type,
            title: issueWorkProducts.title,
            url: issueWorkProducts.url,
            status: issueWorkProducts.status,
            reviewState: issueWorkProducts.reviewState,
            summary: issueWorkProducts.summary,
            metadata: issueWorkProducts.metadata,
            updatedAt: issueWorkProducts.updatedAt,
          })
          .from(issueWorkProducts)
          .where(and(
            eq(issueWorkProducts.companyId, companyId),
            inArray(issueWorkProducts.issueId, issueIds),
          ))
          .orderBy(desc(issueWorkProducts.updatedAt)),
        db
          .select({
            id: issueComments.id,
            issueId: issueComments.issueId,
            body: issueComments.body,
            createdAt: issueComments.createdAt,
          })
          .from(issueComments)
          .where(and(
            eq(issueComments.companyId, companyId),
            inArray(issueComments.issueId, issueIds),
            isNotNull(issueComments.authorAgentId),
          ))
          .orderBy(desc(issueComments.createdAt)),
        db
          .select({
            issueId: issueComments.issueId,
            body: issueComments.body,
            createdAt: issueComments.createdAt,
          })
          .from(issueComments)
          .where(and(
            eq(issueComments.companyId, companyId),
            inArray(issueComments.issueId, issueIds),
          ))
          .orderBy(desc(issueComments.createdAt)),
      ]);

      const documentsByIssue = groupPayloadByIssue(
        documentRows
          .filter((document) => !isSystemIssueDocumentKey(document.key))
          .map((document) => ({
            issueId: document.issueId,
            payload: {
              id: document.id,
              key: document.key,
              title: document.title,
              format: document.format,
              revisionNumber: document.revisionNumber,
              bodyPreview: plainPreview(document.body),
              updatedAt: toIso(document.updatedAt),
            },
          })),
      );
      const workProductsByIssue = groupPayloadByIssue(
        workProductRows.map((workProduct) => ({
          issueId: workProduct.issueId,
          payload: {
            id: workProduct.id,
            type: workProduct.type,
            title: workProduct.title,
            url: workProduct.url,
            status: workProduct.status,
            reviewState: workProduct.reviewState,
            summary: workProduct.summary,
            voiceGate: voiceGateFromMetadata(workProduct.metadata),
            updatedAt: toIso(workProduct.updatedAt),
          },
        })),
      );
      const updatesByIssue = latestUpdateByIssue(
        commentRows.map((comment) => ({
          id: comment.id,
          issueId: comment.issueId,
          bodyPreview: plainPreview(comment.body),
          createdAt: toIso(comment.createdAt),
        })),
      );
      const reviewCommentsByIssue = groupPayloadByIssue(
        reviewCommentRows
          .filter((comment) => parseReviewAction(comment.body))
          .map((comment) => ({
            issueId: comment.issueId,
            payload: {
              body: comment.body,
              createdAt: comment.createdAt,
            },
          })),
      );

      return dearMeOutputsResponseSchema.parse({
        companyId,
        outputs: buildOutputItems({
          issues: issueRows,
          documentsByIssue,
          workProductsByIssue,
          latestUpdateByIssue: updatesByIssue,
          reviewCommentsByIssue,
        }),
      });
    },

    persistContentDraftPacket: async (
      companyId: string,
      issueId: string,
      input: unknown,
    ): Promise<DearMeOutputWorkProduct> => {
      const packet = dearMeContentDraftPacketSchema.parse(input);
      const [issue] = await db
        .select({
          id: issues.id,
          companyId: issues.companyId,
          projectId: issues.projectId,
          originFingerprint: issues.originFingerprint,
        })
        .from(issues)
        .where(and(
          eq(issues.id, issueId),
          eq(issues.companyId, companyId),
          eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
          eq(issues.originFingerprint, CONTENT_OPERATION_FINGERPRINT),
          isNull(issues.hiddenAt),
        ))
        .limit(1);

      if (!issue) {
        throw notFound("DearMe content drafts output not found");
      }

      const now = new Date();
      const voiceGate = strictestVoiceGate(packet);
      const externalId = contentDraftPacketExternalId(packet);
      const summary = formatContentDraftPacket(packet);
      const metadata = {
        voiceGate,
        dearme: {
          outputKind: "content_drafts",
          packetId: packet.packetId,
          draftCount: packet.drafts.length,
          cycleEvidence: packet.cycleEvidence,
          drafts: packet.drafts.map((draft) => ({
            id: draft.id ?? null,
            title: draft.title,
            channel: draft.channel,
            audience: draft.audience,
            hook: draft.hook,
            body: draft.body,
            proofUsed: draft.proofUsed,
            launchBoundary: draft.launchBoundary,
            voiceGate: draft.voiceGate,
          })),
          voiceGate,
        },
      };

      const row = await db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: issueWorkProducts.id })
          .from(issueWorkProducts)
          .where(and(
            eq(issueWorkProducts.companyId, companyId),
            eq(issueWorkProducts.issueId, issueId),
            eq(issueWorkProducts.provider, CONTENT_DRAFT_WORK_PRODUCT_PROVIDER),
            eq(issueWorkProducts.externalId, externalId),
          ))
          .limit(1)
          .then((rows) => rows[0] ?? null);

        const values = {
          projectId: issue.projectId ?? null,
          type: "artifact",
          provider: CONTENT_DRAFT_WORK_PRODUCT_PROVIDER,
          externalId,
          title: packet.title,
          url: null,
          status: "ready_for_review",
          reviewState: "needs_board_review",
          isPrimary: true,
          healthStatus: "healthy",
          summary,
          metadata,
          createdByRunId: packet.createdByRunId,
          updatedAt: now,
        } satisfies Partial<typeof issueWorkProducts.$inferInsert>;

        await tx
          .update(issueWorkProducts)
          .set({ isPrimary: false, updatedAt: now })
          .where(and(
            eq(issueWorkProducts.companyId, companyId),
            eq(issueWorkProducts.issueId, issueId),
            eq(issueWorkProducts.type, values.type),
          ));

        const saved = existing
          ? await tx
            .update(issueWorkProducts)
            .set(values)
            .where(eq(issueWorkProducts.id, existing.id))
            .returning()
            .then((rows) => rows[0] ?? null)
          : await tx
            .insert(issueWorkProducts)
            .values({
              ...values,
              companyId,
              issueId,
              createdAt: now,
            })
            .returning()
            .then((rows) => rows[0] ?? null);

        await tx
          .update(issues)
          .set({
            status: "in_review",
            completedAt: null,
            cancelledAt: null,
            updatedAt: now,
          })
          .where(and(
            eq(issues.id, issueId),
            eq(issues.companyId, companyId),
          ));

        return saved;
      });

      if (!row) {
        throw new Error("Failed to persist DearMe content drafts");
      }

      return outputWorkProductFromRow(row);
    },

    prepareCycleOutputPacket: async (
      companyId: string,
      actor: DearMeOutputPacketActor,
    ) => {
      const current = await service.listOutputs(companyId);
      const contentOutput = outputByKind(current.outputs, "content_drafts");
      const reportOutput = outputByKind(current.outputs, "weekly_report");
      if (!contentOutput || !reportOutput) return current;

      const draftText = firstNonEmpty(
        detailValue(contentOutput, ["draft_body"], 3_000),
        detailValue(contentOutput, ["hook"], 1_000),
        contentOutput.documents[0]?.bodyPreview,
        contentOutput.latestUpdate?.bodyPreview,
        "A private proof-backed starter draft is ready for review.",
      )!;
      const channel = detailValue(contentOutput, ["channel"], 120);
      const voiceFit = await voiceGate.scoreVoice({
        fingerprintId: `company:${companyId}:cycle-output`,
        text: draftText,
        kind: voiceGateKindForChannel(channel),
        minScore: 92,
      });
      const packet = renderCycleOutputPacket({
        outputs: current.outputs,
        voiceFitScore: voiceFit.score,
        voiceFitPassed: voiceFit.passed,
      });
      const now = new Date();
      const sharedMetadata = {
        kind: "cycle_output_packet",
        voiceFitScore: voiceFit.score,
        voiceFitPassed: voiceFit.passed,
        voiceFitFloor: voiceFit.floor,
        generatedAt: now.toISOString(),
      };

      await markOutputIssueReady(companyId, contentOutput.issueId, now);
      await markOutputIssueReady(companyId, reportOutput.issueId, now);
      await upsertPacketDocument({
        issueId: contentOutput.issueId,
        key: "content-drafts",
        title: "Content drafts",
        body: packet.contentBody,
        actor,
      });
      await upsertPacketDocument({
        issueId: reportOutput.issueId,
        key: "dear-me-report",
        title: "Dear me report",
        body: packet.reportBody,
        actor,
      });
      await upsertCycleWorkProduct({
        companyId,
        issueId: contentOutput.issueId,
        type: "draft",
        externalId: "cycle-output-packet:content_drafts",
        title: "Cycle content packet",
        summary: packet.contentSummary,
        metadata: {
          ...sharedMetadata,
          outputKind: "content_drafts",
          voiceFitReasons: voiceFit.reasons.slice(0, 5),
        },
        actor,
        now,
      });
      await upsertCycleWorkProduct({
        companyId,
        issueId: reportOutput.issueId,
        type: "report",
        externalId: "cycle-output-packet:weekly_report",
        title: "Dear me report packet",
        summary: packet.reportSummary,
        metadata: {
          ...sharedMetadata,
          outputKind: "weekly_report",
        },
        actor,
        now,
      });

      return service.listOutputs(companyId);
    },

    reviewOutput: async (
      companyId: string,
      outputId: string,
      request: DearMeOutputReviewRequest,
      actor: DearMeOutputReviewActor,
    ): Promise<DearMeOutputReviewServiceResult> => {
      const { issueId, kind } = parseOutputId(outputId);
      const outputs = await service.listOutputs(companyId);
      const output = outputs.outputs.find((item) =>
        item.id === outputId &&
        item.issueId === issueId &&
        item.kind === kind
      );
      if (!output) {
        throw notFound("DearMe output not found");
      }

      const [issue] = await db
        .select({
          id: issues.id,
          status: issues.status,
          assigneeAgentId: issues.assigneeAgentId,
        })
        .from(issues)
        .where(and(
          eq(issues.id, issueId),
          eq(issues.companyId, companyId),
          eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
          isNull(issues.hiddenAt),
        ))
        .limit(1);
      if (!issue) {
        throw notFound("DearMe output not found");
      }

      const now = new Date();
      const body = outputDecisionCopy(request.action, request.decisionNote);
      const [comment] = await db
        .insert(issueComments)
        .values({
          companyId,
          issueId,
          authorAgentId: actor.actorType === "agent" ? actor.agentId : null,
          authorUserId: actor.actorType === "user" ? actor.actorId : null,
          createdByRunId: actor.runId ?? null,
          body,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: issueComments.id,
          body: issueComments.body,
          createdAt: issueComments.createdAt,
        });

      if (!comment) {
        throw new Error("Failed to record DearMe output decision");
      }

      await db
        .update(issues)
        .set(request.action === "approve"
          ? {
              status: "done",
              completedAt: now,
              cancelledAt: null,
              updatedAt: now,
            }
          : {
              status: "todo",
              completedAt: null,
              cancelledAt: null,
              updatedAt: now,
            })
        .where(and(
          eq(issues.id, issueId),
          eq(issues.companyId, companyId),
        ));

      await db
        .update(issueWorkProducts)
        .set({
          reviewState: outputWorkProductReviewState(request.action),
          updatedAt: now,
        })
        .where(and(
          eq(issueWorkProducts.companyId, companyId),
          eq(issueWorkProducts.issueId, issueId),
        ));

      if (request.action === "approve") {
        await ensureNextMoveApproval({
          companyId,
          output,
          issue,
          actor,
          decisionNote: request.decisionNote,
          now,
        });
      }

      const refreshed = await service.listOutputs(companyId);
      const updatedOutput = refreshed.outputs.find((item) =>
        item.id === outputId &&
        item.issueId === issueId &&
        item.kind === kind
      ) ?? output;
      const parsed = dearMeOutputReviewResultSchema.parse({
        companyId,
        outputId,
        action: request.action,
        status: request.action === "approve" ? "recorded" : "queued",
        comment: {
          id: comment.id,
          bodyPreview: plainPreview(comment.body),
          createdAt: toIso(comment.createdAt),
        },
        output: updatedOutput,
      });

      return {
        ...parsed,
        wakeIssue: request.action === "approve"
          ? null
          : {
              id: issue.id,
              assigneeAgentId: issue.assigneeAgentId,
              status: "todo",
            },
      };
    },
  };

  return service;
}
