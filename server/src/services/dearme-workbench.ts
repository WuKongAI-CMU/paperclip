import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  activityLog,
  agents,
  approvals,
  costEvents,
  issues,
  routineRuns,
  routines,
} from "@paperclipai/db";
import {
  DEARME_MEMORY_UPDATE_KINDS,
  DEARME_TEAM_ROLES,
  dearMeWorkbenchResponseSchema,
  type DearMeActionGraph,
  type DearMeActionGraphEdge,
  type DearMeActionGraphNode,
  type DearMeMemoryUpdateItem,
  type DearMeMemoryUpdateKind,
  type DearMeOutputItem,
  type DearMeOutputKind,
  type DearMeWorkbenchBatchDecision,
  type DearMeWorkbenchDecision,
  type DearMeWorkbenchMemory,
  type DearMeWorkbenchProgressItem,
  type DearMeWorkbenchReport,
  type DearMeWorkbenchRunLedgerEntry,
  type DearMeWorkbenchStreamItem,
  type DearMeWorkbenchTeamMember,
  type DearMeWorkbenchVoiceProfile,
  type DearMeWorkbenchWorkItem,
} from "@paperclipai/shared";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import { dearmeOutputHandoffService } from "./dearme-output-handoff.js";

type DearMeTeamRole = DearMeWorkbenchTeamMember["role"];
type DearMeRiskGate = DearMeWorkbenchDecision["riskGate"];
type DearMeBatchAction = DearMeWorkbenchBatchDecision["action"];
type DearMeBatchKey = NonNullable<DearMeRiskGate> | "review";
type DearMeReportDigest = Pick<DearMeWorkbenchReport, "accomplished" | "decisions" | "learnings" | "nextBets">;
type DearMeRunLedgerKind = DearMeWorkbenchRunLedgerEntry["kind"];
type DearMeWorkbenchMemorySourcePlan = DearMeWorkbenchMemory["sourcePlan"];
type DearMeWorkbenchMemorySourceRequirement = DearMeWorkbenchMemorySourcePlan["required"][number];
type DearMeWorkbenchMemorySourceReviewItem = DearMeWorkbenchMemory["sourceReviewQueue"][number];
type DearMeMemorySourceReviewCandidate = DearMeMemoryUpdateItem & {
  sourceInputMode: DearMeWorkbenchMemorySourceReviewItem["sourceInputMode"];
};
type DearMeStreamKind = DearMeWorkbenchStreamItem["kind"];
type DearMeCycleStage = DearMeWorkbenchStreamItem["cycleStage"];
type DearMeCyclePacketEvidence = {
  voiceFit: string | null;
  summary: string;
  reportSummary: string;
  nextAction: string;
};

type DearMeRoutineRunRow = {
  id: string;
  routineTitle: string;
  status: string;
  triggeredAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  linkedIssueId: string | null;
};

type DearMeSpendCheckpointRow = {
  eventCount: number;
  totalCents: number;
  latestAt: Date | string | null;
};

const TEAM_ROLE_ORDER = new Map(DEARME_TEAM_ROLES.map((role, index) => [role, index]));
const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);
const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const DEARME_MEMORY_ARCHIVED_ACTION = "dearme.memory_archived";
const DEARME_MEMORY_ACTIONS = [DEARME_MEMORY_UPDATED_ACTION, DEARME_MEMORY_ARCHIVED_ACTION] as const;
const DEARME_CHIEF_OF_STAFF_MESSAGE_ACTION = "dearme.chief_of_staff_message";
const DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND = "dearme_chief_of_staff_message";
const DEARME_ACTION_GRAPH_CYCLE_NODE_ID = "cycle:weekly-growth-loop";
const DEARME_ACTION_GRAPH_FALLBACK_UPDATED_AT = "1970-01-01T00:00:00.000Z";

const TEAM_ROLE_FOCUS: Record<DearMeTeamRole, string> = {
  chief_of_staff: "Coordinating today's brand growth plan and the next decisions.",
  brand_strategist: "Keeping positioning, audience, proof, and offers aligned.",
  voice_editor: "Checking that private drafts sound like the user before review.",
  content_producer: "Turning proof and point of view into reviewable content drafts.",
  opportunity_scout: "Looking for relevant leads, collaborations, and outreach angles.",
  portfolio_builder: "Preparing portfolio and proof-card updates for review.",
  growth_analyst: "Summarizing progress, signals, decisions, and next bets.",
};

const OUTPUT_OWNER_ROLE: Record<DearMeOutputKind, DearMeTeamRole> = {
  brand_os: "brand_strategist",
  voice_profile: "voice_editor",
  content_drafts: "content_producer",
  opportunity_drafts: "opportunity_scout",
  portfolio_update: "portfolio_builder",
  weekly_report: "growth_analyst",
};

const OUTPUT_DECISION_GATE: Record<DearMeOutputKind, DearMeRiskGate | null> = {
  brand_os: null,
  voice_profile: "sensitive_material",
  content_drafts: "publish_social",
  opportunity_drafts: "send_email",
  portfolio_update: "deploy_public_site",
  weekly_report: null,
};

const OUTPUT_KIND_ARTIFACT_LABELS: Record<DearMeOutputKind, string> = {
  brand_os: "Brand OS",
  voice_profile: "Voice profile",
  content_drafts: "Content drafts",
  opportunity_drafts: "Opportunity leads",
  portfolio_update: "Portfolio update",
  weekly_report: "Dear me report",
};

const TEAM_ROLE_PUBLIC_LABELS: Record<DearMeTeamRole, string> = {
  chief_of_staff: "Chief of Staff",
  brand_strategist: "Brand Strategist",
  voice_editor: "Voice Editor",
  content_producer: "Content Producer",
  opportunity_scout: "Opportunity Scout",
  portfolio_builder: "Portfolio Builder",
  growth_analyst: "Growth Analyst",
};

const MEMORY_KIND_LABELS: Record<DearMeMemoryUpdateKind, string> = {
  voice_sample: "Voice sample",
  proof_point: "Proof point",
  goal: "Goal",
  audience: "Audience",
  offer: "Offer",
  constraint: "Boundary",
  relationship: "Relationship",
  preference: "Preference",
  review_feedback: "Review feedback",
};

const MEMORY_SOURCE_REVIEW_MODE_LABELS: Record<
  DearMeWorkbenchMemorySourceReviewItem["sourceInputMode"],
  string
> = {
  link: "Private link",
  import_note: "Import note",
};

const MEMORY_SOURCE_REQUIREMENTS: Array<Pick<
  DearMeWorkbenchMemorySourceRequirement,
  "kind" | "label" | "target" | "nextAction"
>> = [
  {
    kind: "voice_sample",
    label: "Writing samples",
    target: 2,
    nextAction: "Add real posts, notes, transcripts, or approved drafts that already sound like the user.",
  },
  {
    kind: "proof_point",
    label: "Proof points",
    target: 2,
    nextAction: "Add shipped work, results, receipts, metrics, or customer proof future drafts can cite.",
  },
  {
    kind: "goal",
    label: "Goals",
    target: 1,
    nextAction: "Add the growth goal this cycle should serve before producing more work.",
  },
  {
    kind: "audience",
    label: "Audience notes",
    target: 1,
    nextAction: "Add who the work should speak to and what that audience cares about.",
  },
  {
    kind: "offer",
    label: "Offer notes",
    target: 1,
    nextAction: "Add what the user can sell, invite, pitch, or ask for.",
  },
  {
    kind: "constraint",
    label: "Boundaries",
    target: 1,
    nextAction: "Add forbidden wording, claim limits, sensitive topics, or positioning corrections.",
  },
];

const BATCH_DECISION_COPY: Record<DearMeBatchKey, {
  title: string;
  actionLabel: string;
  action: DearMeBatchAction;
}> = {
  publish_social: {
    title: "Review content batch",
    actionLabel: "Review posts",
    action: "review_posts",
  },
  send_email: {
    title: "Review outreach batch",
    actionLabel: "Review outreach",
    action: "review_outreach",
  },
  deploy_public_site: {
    title: "Review portfolio batch",
    actionLabel: "Review site updates",
    action: "review_site_updates",
  },
  sensitive_material: {
    title: "Review voice-sensitive work",
    actionLabel: "Review sensitive items",
    action: "review_sensitive_items",
  },
  spend_money: {
    title: "Review spending decisions",
    actionLabel: "Review spend",
    action: "review_work",
  },
  public_claim: {
    title: "Review public claims",
    actionLabel: "Review claims",
    action: "approve_claims",
  },
  connect_channel: {
    title: "Review channel connections",
    actionLabel: "Review connections",
    action: "review_work",
  },
  destructive_change: {
    title: "Review replacement decisions",
    actionLabel: "Review changes",
    action: "review_work",
  },
  review: {
    title: "Review prepared work",
    actionLabel: "Review work",
    action: "review_work",
  },
};

function toIso(value: Date) {
  return value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDearMeRole(value: unknown): value is DearMeTeamRole {
  return typeof value === "string" && TEAM_ROLE_ORDER.has(value as DearMeTeamRole);
}

function isDearMeMemoryKind(value: unknown): value is DearMeMemoryUpdateKind {
  return typeof value === "string" && MEMORY_KIND_SET.has(value);
}

function optionalStringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function previewText(value: string, maxLength = 700) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function compactProjectionText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dearMeWorkbenchProjectionText(
  value: string | null | undefined,
  fallback: string,
  maxLength = 1_000,
) {
  let safe = compactProjectionText(value);
  for (const [pattern, replacement] of [
    [/\bOpenClaw\b/gi, "DearMe"],
    [/\bSymphony\b/gi, "DearMe"],
    [/\bPaperclip\b/gi, "DearMe"],
    [/\bOK Partner\b/gi, "DearMe"],
    [/\bsetup[_ -]?payload\b/gi, "setup details"],
    [/\badapter[_ -]?type\b|\badapterType\b/gi, "connector type"],
    [/\bmodel[- ]providers?\b/gi, "services"],
    [/\bmodels?\b/gi, "private checks"],
    [/\badapters?\b/gi, "connectors"],
    [/\bproviders?\b/gi, "services"],
    [/\bruntimes?\b/gi, "private work area"],
    [/\broutines?\b/gi, "cycle checks"],
    [/\bworkbench\b/gi, "team progress"],
    [/\bworkstreams?\b/gi, "team updates"],
    [/\bwork streams?\b/gi, "team updates"],
    [/\bissue comments?\b/gi, "review notes"],
    [/\bissue routes?\b/gi, "private review links"],
    [/\bapproval routes?\b/gi, "review links"],
    [/\bwork products?\b/gi, "prepared work"],
    [/\bworkspaces?\b/gi, "private work areas"],
    [/\bagents?\b/gi, "teammates"],
  ] as const) {
    safe = safe.replace(pattern, replacement);
  }

  safe = safe.replace(/\s+/g, " ").trim();
  return previewText(safe || fallback, maxLength);
}

function dearMeWorkbenchProjectionTitle(
  value: string | null | undefined,
  fallback: string,
) {
  return dearMeWorkbenchProjectionText(value, fallback, 160);
}

function dearMeWorkbenchProjectionOptionalText(
  value: string | null | undefined,
  maxLength = 1_000,
) {
  const compact = compactProjectionText(value);
  return compact ? dearMeWorkbenchProjectionText(compact, compact, maxLength) : null;
}

function projectDearMeReviewLoop(
  reviewLoop: DearMeOutputItem["reviewLoop"],
): DearMeOutputItem["reviewLoop"] {
  return {
    ...reviewLoop,
    lastDecisionNotePreview: dearMeWorkbenchProjectionOptionalText(
      reviewLoop.lastDecisionNotePreview,
      1_000,
    ),
    nextStep: dearMeWorkbenchProjectionText(
      reviewLoop.nextStep,
      "Review the private work and choose the next move.",
    ),
    reviewHandoff: reviewLoop.reviewHandoff
      ? {
          ...reviewLoop.reviewHandoff,
          title: dearMeWorkbenchProjectionTitle(reviewLoop.reviewHandoff.title, "Review handoff"),
          summary: dearMeWorkbenchProjectionText(
            reviewLoop.reviewHandoff.summary,
            "DearMe captured the review direction for the next private draft.",
          ),
          userDirection: dearMeWorkbenchProjectionOptionalText(reviewLoop.reviewHandoff.userDirection),
          nextDraftDirection: dearMeWorkbenchProjectionText(
            reviewLoop.reviewHandoff.nextDraftDirection,
            "Prepare a stronger private draft before asking for approval again.",
          ),
        }
      : null,
    feedbackTrace: reviewLoop.feedbackTrace
      ? {
          ...reviewLoop.feedbackTrace,
          headline: dearMeWorkbenchProjectionTitle(reviewLoop.feedbackTrace.headline, "Review feedback"),
          summary: dearMeWorkbenchProjectionText(
            reviewLoop.feedbackTrace.summary,
            "DearMe captured the review feedback for the next private draft.",
          ),
          userFeedback: dearMeWorkbenchProjectionOptionalText(reviewLoop.feedbackTrace.userFeedback),
          changes: reviewLoop.feedbackTrace.changes.map((change) =>
            dearMeWorkbenchProjectionText(change, "Private revision recorded."),
          ),
        }
      : null,
  };
}

function projectDearMeVoiceGate(
  voiceGate: NonNullable<DearMeOutputItem["workProducts"][number]["voiceGate"]>,
): NonNullable<DearMeOutputItem["workProducts"][number]["voiceGate"]> {
  return {
    ...voiceGate,
    summary: dearMeWorkbenchProjectionText(
      voiceGate.summary,
      "DearMe checked this draft before review.",
    ),
    checks: voiceGate.checks.map((check) => ({
      ...check,
      label: dearMeWorkbenchProjectionTitle(check.label, "Voice check"),
      summary: dearMeWorkbenchProjectionText(check.summary, "DearMe checked this draft."),
      evidence: check.evidence.map((item) =>
        dearMeWorkbenchProjectionTitle(item, "Private evidence"),
      ),
      recommendation: dearMeWorkbenchProjectionText(
        check.recommendation,
        "Review the private draft before any external action.",
      ),
    })),
    blockedActions: voiceGate.blockedActions.map((item) =>
      dearMeWorkbenchProjectionTitle(item, "External action"),
    ),
  };
}

export function dearMeWorkbenchProjectionOutput(output: DearMeOutputItem): DearMeOutputItem {
  const artifact = OUTPUT_KIND_ARTIFACT_LABELS[output.kind];

  return {
    ...output,
    title: dearMeWorkbenchProjectionTitle(output.title, artifact),
    summary: dearMeWorkbenchProjectionText(output.summary, "The team prepared private work for review."),
    issueTitle: dearMeWorkbenchProjectionTitle(output.issueTitle, artifact),
    documents: output.documents.map((document) => ({
      ...document,
      title: document.title
        ? dearMeWorkbenchProjectionTitle(document.title, "Private draft")
        : document.title,
      bodyPreview: dearMeWorkbenchProjectionText(
        document.bodyPreview,
        "Private draft ready for review.",
        2_000,
      ),
    })),
    workProducts: output.workProducts.map((workProduct) => ({
      ...workProduct,
      title: dearMeWorkbenchProjectionTitle(workProduct.title, artifact),
      summary: dearMeWorkbenchProjectionOptionalText(workProduct.summary),
      voiceGate: workProduct.voiceGate
        ? projectDearMeVoiceGate(workProduct.voiceGate)
        : workProduct.voiceGate,
    })),
    latestUpdate: output.latestUpdate
      ? {
          ...output.latestUpdate,
          bodyPreview: dearMeWorkbenchProjectionText(
            output.latestUpdate.bodyPreview,
            "The team recorded a private update.",
            2_000,
          ),
        }
      : null,
    reviewLoop: projectDearMeReviewLoop(output.reviewLoop),
    details: output.details.map((detail) => ({
      ...detail,
      label: dearMeWorkbenchProjectionTitle(detail.label, "Private detail"),
      value: dearMeWorkbenchProjectionText(detail.value, "Private detail recorded.", 1_500),
    })),
    sourceEvidence: output.sourceEvidence.map((item) => ({
      ...item,
      label: dearMeWorkbenchProjectionTitle(item.label, "Private evidence"),
      summary: dearMeWorkbenchProjectionText(item.summary, "DearMe recorded private evidence."),
    })),
  };
}

function outputEvidenceText(output: DearMeOutputItem) {
  return [
    output.summary,
    ...output.documents.map((document) => document.bodyPreview),
    ...output.workProducts.flatMap((workProduct) => [workProduct.title, workProduct.summary ?? ""]),
    output.latestUpdate?.bodyPreview ?? "",
    ...output.details.flatMap((detail) => [detail.label, detail.value]),
    ...output.sourceEvidence.flatMap((item) => [item.label, item.summary]),
  ].join(" ");
}

function voiceFitFromOutputText(value: string) {
  const match = value.match(/\bvoice fit(?: score)?\s*:?\s*([0-9]{1,3}\/100(?:\s+(?:ready for review|needs revision before launch))?)/i);
  return match?.[1] ? `Voice fit ${match[1].replace(/\s+/g, " ").trim()}` : null;
}

function cyclePacketEvidence(output: DearMeOutputItem): DearMeCyclePacketEvidence | null {
  const evidenceText = outputEvidenceText(output);
  const isCyclePacket =
    /\bcycle output packet\b/i.test(evidenceText) ||
    /\bsame private evidence packet\b/i.test(evidenceText) ||
    /\bsame private cycle packet\b/i.test(evidenceText) ||
    /\bcycle content packet\b/i.test(evidenceText) ||
    /\bDear me report packet\b/i.test(evidenceText) ||
    /\bprivate content packet ready for review with voice fit\b/i.test(evidenceText);
  if (!isCyclePacket) return null;

  const voiceFit = voiceFitFromOutputText(evidenceText);
  const voiceClause = voiceFit ? ` ${voiceFit}.` : "";
  const reviewBoundary = "Publishing, sending, spending, and deployment still wait for your launch call.";

  return {
    voiceFit,
    summary: previewText(
      `Prepared from the same private cycle packet as the Dear me report.${voiceClause} ${reviewBoundary}`,
      900,
    ),
    reportSummary: previewText(
      `DearMe prepared the report and content drafts from the same private cycle packet.${voiceClause} Review once, then launch, revise, or regenerate.`,
      900,
    ),
    nextAction: "Review the shared packet once; DearMe can launch, revise, or regenerate without letting any public move happen by accident.",
  };
}

function outputSummaryForWorkbench(output: DearMeOutputItem) {
  const packet = cyclePacketEvidence(output);
  if (!packet) return output.summary;
  return output.kind === "weekly_report" ? packet.reportSummary : packet.summary;
}

function decisionHasCyclePacketEvidence(decision: Pick<DearMeWorkbenchDecision, "summary">) {
  return /\bsame private cycle packet\b/i.test(decision.summary) ||
    /\bsame private evidence packet\b/i.test(decision.summary) ||
    /\bshared packet\b/i.test(decision.summary);
}

function moneyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function isoFromDbTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cleanCycleTitle(value: string) {
  return value.replace(/^DearMe:\s*/i, "").trim() || "Growth cycle";
}

function teamStatus(value: string) {
  if (value === "idle") return "Standing by";
  if (value === "paused") return "Paused";
  if (value === "error") return "Needs attention";
  return "Working";
}

function outputPreview(output: DearMeOutputItem) {
  return (
    output.documents[0]?.bodyPreview ||
    output.latestUpdate?.bodyPreview ||
    output.workProducts[0]?.summary ||
    output.summary
  );
}

function workItemFromOutput(output: DearMeOutputItem): DearMeWorkbenchWorkItem {
  return {
    id: output.id,
    title: output.title,
    summary: outputSummaryForWorkbench(output),
    status: output.status,
    ownerRole: OUTPUT_OWNER_ROLE[output.kind],
    outputKind: output.kind,
    issueId: output.issueId,
    issueIdentifier: output.issueIdentifier,
    updatedAt: output.updatedAt,
    reviewLoop: output.reviewLoop,
  };
}

function statusFromChiefBriefIssue(status: string): DearMeWorkbenchWorkItem["status"] {
  if (status === "done") return "complete";
  if (status === "cancelled") return "cancelled";
  if (status === "blocked") return "blocked";
  if (status === "in_review") return "ready_for_review";
  if (status === "in_progress") return "working";
  return "queued";
}

function reviewLoopFromChiefBriefStatus(
  status: DearMeWorkbenchWorkItem["status"],
): DearMeWorkbenchWorkItem["reviewLoop"] {
  const needsReview = status === "ready_for_review" || status === "complete";
  return {
    state: needsReview ? "needs_user_review" : "fresh",
    attemptCount: 0,
    maxAttempts: 3,
    isRetriable: !["blocked", "cancelled"].includes(status),
    lastAction: null,
    lastDecisionAt: null,
    lastDecisionNotePreview: null,
    reviewHandoff: null,
    feedbackTrace: null,
    nextStep: needsReview
      ? "Review the prepared private move, then launch, request changes, ask for another pass, or mark it not useful."
      : "Chief of Staff is preparing this privately before it asks for a public or external move.",
  };
}

function titleFromChiefBriefIssue(title: string) {
  const briefTitle = title.replace(/^DearMe:\s*/i, "").trim() || "Private growth brief";
  return dearMeWorkbenchProjectionTitle(`Chief of Staff brief: ${briefTitle}`, "Chief of Staff brief");
}

function workItemFromChiefBriefIssue(input: {
  id: string;
  title: string;
  status: string;
  identifier: string | null;
  updatedAt: Date;
}): DearMeWorkbenchWorkItem {
  const status = statusFromChiefBriefIssue(input.status);
  return {
    id: input.id,
    title: titleFromChiefBriefIssue(input.title),
    summary: "Chief of Staff accepted this private brief and is turning it into the next launch-ready move. Public moves wait for the launch call.",
    status,
    ownerRole: "chief_of_staff",
    outputKind: null,
    issueId: input.id,
    issueIdentifier: input.identifier,
    updatedAt: toIso(input.updatedAt),
    reviewLoop: reviewLoopFromChiefBriefStatus(status),
  };
}

function roleForDecision(decision: DearMeWorkbenchDecision): DearMeTeamRole {
  if (decision.outputKind) return OUTPUT_OWNER_ROLE[decision.outputKind];
  if (decision.kind === "approve_brand_os") return "brand_strategist";
  return "chief_of_staff";
}

function artifactForDecision(decision: DearMeWorkbenchDecision) {
  if (decision.outputKind) return OUTPUT_KIND_ARTIFACT_LABELS[decision.outputKind];
  if (decision.kind === "approve_brand_os") return "Brand OS";
  return "Approval";
}

function cycleStageForOutputKind(outputKind: DearMeOutputKind | null): DearMeCycleStage {
  if (outputKind === "brand_os") return "plan";
  if (outputKind === "voice_profile") return "learn";
  if (outputKind === "weekly_report") return "report";
  return "work";
}

function streamKindForWork(item: DearMeWorkbenchWorkItem): DearMeStreamKind {
  if (!item.outputKind && item.ownerRole === "chief_of_staff") return "cycle_brief";
  if (item.outputKind === "weekly_report" && item.status === "ready_for_review") return "report_ready";
  if (item.status === "ready_for_review") return "decision_needed";
  return "work_in_motion";
}

function cycleStageForWork(item: DearMeWorkbenchWorkItem): DearMeCycleStage {
  if (!item.outputKind && item.ownerRole === "chief_of_staff") return "plan";
  if (item.status === "ready_for_review") {
    return item.outputKind === "weekly_report" ? "report" : "review";
  }
  return cycleStageForOutputKind(item.outputKind);
}

function nextActionForWork(input: {
  item: DearMeWorkbenchWorkItem;
  isChiefBrief: boolean;
  isReady: boolean;
}) {
  if (input.item.reviewLoop?.nextStep) return input.item.reviewLoop.nextStep;
  if (input.isChiefBrief) {
    return "Let Chief of Staff turn the brief into private work before asking for a public move.";
  }
  if (input.isReady) {
    return "Open the prepared work and decide whether it represents you.";
  }
  return "Let the team keep preparing this privately; public moves remain approval-gated.";
}

function sourceLabelForWork(input: {
  item: DearMeWorkbenchWorkItem;
  isChiefBrief: boolean;
}) {
  if (input.isChiefBrief) return "Chief of Staff brief";
  if (input.item.outputKind === "voice_profile") return "Voice & Memory";
  if (input.item.outputKind === "weekly_report") return "Weekly report";
  return "Prepared output";
}

function nextActionForDecision(decision: DearMeWorkbenchDecision) {
  if (decision.kind === "approve_brand_os") {
    return "Launch Brand OS when the first cycle and launch boundaries match how you want to be represented.";
  }
  if (decisionHasCyclePacketEvidence(decision)) {
    return "Review the shared packet once; DearMe can launch, revise, or regenerate without letting any public move happen by accident.";
  }
  if (decision.reviewLoop?.nextStep) return decision.reviewLoop.nextStep;
  return "Review this call so the team can continue the private growth cycle.";
}

function sourceLabelForDecision(decision: DearMeWorkbenchDecision) {
  if (decision.approvalId) return "Launch queue";
  if (decisionHasCyclePacketEvidence(decision)) return "Private cycle packet";
  return "Prepared output";
}

function streamKindForProgress(item: DearMeWorkbenchProgressItem): DearMeStreamKind {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") return "memory_recorded";
  return "progress_recorded";
}

function cycleStageForProgress(item: DearMeWorkbenchProgressItem): DearMeCycleStage {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") return "learn";
  if (item.kind === "brand_os_requested" || item.kind === "brand_os_applied") return "plan";
  if (item.kind === "paid_beta") return "plan";
  if (item.kind === "spend_checkpoint") return "work";
  return "work";
}

function sourceLabelForProgress(item: DearMeWorkbenchProgressItem) {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") return "Voice & Memory";
  if (item.kind === "brand_os_requested" || item.kind === "brand_os_applied") return "Brand OS";
  if (item.kind === "paid_beta") return "Paid beta access";
  if (item.kind === "cycle_check_in") return "Cycle cadence";
  if (item.kind === "spend_checkpoint") return "Spend guardrail";
  return "Team activity";
}

function costImpactForProgress(item: DearMeWorkbenchProgressItem) {
  if (item.kind === "paid_beta") return "Paid-beta credit recorded";
  if (item.kind === "brand_os_applied") return "Work stays inside paid-beta guardrails";
  if (item.kind === "spend_checkpoint") return "Private spend recorded";
  return null;
}

function roleForProgress(item: DearMeWorkbenchProgressItem): DearMeTeamRole {
  if (item.kind === "brand_os_applied" || item.kind === "cycle_check_in") return "chief_of_staff";
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") return "voice_editor";
  return "growth_analyst";
}

function artifactForProgress(item: DearMeWorkbenchProgressItem) {
  if (item.kind === "brand_os_applied") return "Growth team";
  if (item.kind === "cycle_check_in") return "Cycle check-in";
  if (item.kind === "spend_checkpoint") return "Spend checkpoint";
  return "Progress";
}

function nextActionForProgress(item: DearMeWorkbenchProgressItem) {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") {
    return "No approval needed; DearMe will use this source in the next private cycle.";
  }
  if (item.kind === "brand_os_requested") {
    return "Review the Brand OS request before private work starts.";
  }
  if (item.kind === "brand_os_applied") {
    return "Start or steer the first private growth cycle from the Chief of Staff.";
  }
  if (item.kind === "paid_beta") {
    return "Use the paid-beta guardrail before starting private work.";
  }
  if (item.kind === "cycle_check_in") {
    return "Open prepared work only when a teammate asks for the launch call.";
  }
  if (item.kind === "spend_checkpoint") {
    return "No action needed unless a future move asks to spend money.";
  }
  return "Use this signal to decide what the team should prepare next.";
}

function streamItemFromWork(item: DearMeWorkbenchWorkItem): DearMeWorkbenchStreamItem {
  const role = item.ownerRole;
  const isChiefBrief = !item.outputKind && role === "chief_of_staff";
  const artifact = item.outputKind
    ? OUTPUT_KIND_ARTIFACT_LABELS[item.outputKind]
    : isChiefBrief
      ? "Cycle brief"
      : "Prepared work";
  const isReady = item.status === "ready_for_review";

  return {
    id: `work:${item.id}`,
    kind: streamKindForWork(item),
    cycleStage: cycleStageForWork(item),
    role,
    title: isChiefBrief
      ? "Chief of Staff is turning your brief into private work"
      : isReady
        ? `${TEAM_ROLE_PUBLIC_LABELS[role]} prepared ${item.title}`
        : `${TEAM_ROLE_PUBLIC_LABELS[role]} is working on ${item.title}`,
    summary: item.summary,
    artifact,
    status: item.status === "queued" ? "working" : item.status,
    needsApproval: isReady,
    sourceLabel: sourceLabelForWork({ item, isChiefBrief }),
    costImpact: null,
    nextAction: nextActionForWork({ item, isChiefBrief, isReady }),
    relatedOutputId: item.outputKind ? item.id : null,
    issueId: item.issueId,
    issueIdentifier: item.issueIdentifier,
    approvalId: null,
    createdAt: item.updatedAt,
    reviewLoop: item.reviewLoop,
  };
}

function streamItemFromDecision(decision: DearMeWorkbenchDecision): DearMeWorkbenchStreamItem {
  const role = roleForDecision(decision);

  return {
    id: `decision:${decision.id}`,
    kind: decision.outputKind === "weekly_report" ? "report_ready" : "decision_needed",
    cycleStage: decision.outputKind === "weekly_report" ? "report" : "review",
    role,
    title: `Your call: ${decision.title}`,
    summary: decision.summary,
    artifact: artifactForDecision(decision),
    status: "decision_needed",
    needsApproval: true,
    sourceLabel: sourceLabelForDecision(decision),
    costImpact: decision.riskGate === "spend_money" ? "Spend waits for the launch call" : null,
    nextAction: nextActionForDecision(decision),
    relatedOutputId: decision.outputKind ? decision.id.replace(/^output:/, "") : null,
    issueId: decision.issueId,
    issueIdentifier: decision.issueIdentifier,
    approvalId: decision.approvalId,
    createdAt: decision.updatedAt,
    reviewLoop: decision.reviewLoop,
  };
}

function streamItemFromProgress(item: DearMeWorkbenchProgressItem): DearMeWorkbenchStreamItem {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") {
    return {
      id: `progress:${item.id}`,
      kind: streamKindForProgress(item),
      cycleStage: cycleStageForProgress(item),
      role: "voice_editor",
      title: item.title,
      summary: item.summary,
      artifact: "Voice & Memory",
      status: "recorded",
      needsApproval: false,
      sourceLabel: sourceLabelForProgress(item),
      costImpact: costImpactForProgress(item),
      nextAction: nextActionForProgress(item),
      relatedOutputId: null,
      issueId: null,
      issueIdentifier: null,
      approvalId: null,
      createdAt: item.createdAt,
      reviewLoop: null,
    };
  }

  return {
    id: `progress:${item.id}`,
    kind: streamKindForProgress(item),
    cycleStage: cycleStageForProgress(item),
    role: roleForProgress(item),
    title: item.title,
    summary: item.summary,
    artifact: artifactForProgress(item),
    status: "recorded",
    needsApproval: false,
    sourceLabel: sourceLabelForProgress(item),
    costImpact: costImpactForProgress(item),
    nextAction: nextActionForProgress(item),
    relatedOutputId: null,
    issueId: null,
    issueIdentifier: null,
    approvalId: null,
    createdAt: item.createdAt,
    reviewLoop: null,
  };
}

function memoryFromActivity(input: {
  id: string;
  entityId: string;
  details: unknown;
  createdAt: Date;
}): DearMeMemoryUpdateItem | null {
  if (!isRecord(input.details) || !isDearMeMemoryKind(input.details.kind)) {
    return null;
  }

  const body = optionalStringFromRecord(input.details, "body");
  if (!body) return null;

  return {
    id: input.entityId || input.id,
    kind: input.details.kind,
    sourceInputMode:
      input.details.sourceInputMode === "link" || input.details.sourceInputMode === "import_note"
        ? input.details.sourceInputMode
        : "paste",
    title: dearMeWorkbenchProjectionOptionalText(optionalStringFromRecord(input.details, "title"), 160),
    body: dearMeWorkbenchProjectionText(body, "Private memory source recorded.", 4_000),
    bodyPreview: dearMeWorkbenchProjectionText(body, "Private memory source recorded."),
    sourceLabel: dearMeWorkbenchProjectionOptionalText(optionalStringFromRecord(input.details, "sourceLabel")),
    createdAt: toIso(input.createdAt),
  };
}

function activeMemoryFromActivityRows(
  rows: Array<{
    id: string;
    action: string;
    entityId: string | null;
    details: unknown;
    createdAt: Date;
  }>,
) {
  const retiredIds = new Set<string>();
  const seenIds = new Set<string>();
  const items: DearMeMemoryUpdateItem[] = [];

  for (const row of rows) {
    const memoryId = row.entityId || row.id;
    if (row.action === DEARME_MEMORY_ARCHIVED_ACTION) {
      retiredIds.add(memoryId);
      continue;
    }
    if (row.action !== DEARME_MEMORY_UPDATED_ACTION || retiredIds.has(memoryId) || seenIds.has(memoryId)) {
      continue;
    }

    const item = memoryFromActivity({
      id: row.id,
      entityId: memoryId,
      details: row.details,
      createdAt: row.createdAt,
    });
    if (!item) continue;

    seenIds.add(memoryId);
    items.push(item);
    if (items.length >= 12) break;
  }

  return items;
}

function archivedMemoryFromActivityRows(
  rows: Array<{
    id: string;
    action: string;
    entityId: string | null;
    details: unknown;
    createdAt: Date;
  }>,
) {
  const latestState = new Map<string, "active" | "archived">();
  const seenIds = new Set<string>();
  const items: DearMeMemoryUpdateItem[] = [];

  for (const row of rows) {
    const memoryId = row.entityId || row.id;
    if (!latestState.has(memoryId)) {
      if (row.action === DEARME_MEMORY_ARCHIVED_ACTION) {
        latestState.set(memoryId, "archived");
      } else if (row.action === DEARME_MEMORY_UPDATED_ACTION) {
        latestState.set(memoryId, "active");
      }
      continue;
    }

    if (latestState.get(memoryId) !== "archived" || row.action !== DEARME_MEMORY_UPDATED_ACTION || seenIds.has(memoryId)) {
      continue;
    }

    const item = memoryFromActivity({
      id: row.id,
      entityId: memoryId,
      details: row.details,
      createdAt: row.createdAt,
    });
    if (!item) continue;

    seenIds.add(memoryId);
    items.push(item);
    if (items.length >= 6) break;
  }

  return items;
}

function buildMemorySummary(items: DearMeMemoryUpdateItem[]) {
  if (items.length === 0) {
    return "Add voice samples, proof, goals, and boundaries so DearMe can make better private work.";
  }

  const latest = items[0]!;
  const sourceLabel = items.length === 1 ? "source is" : "sources are";
  return `${items.length} recent Voice & Memory ${sourceLabel} available. Latest: ${MEMORY_KIND_LABELS[latest.kind]}.`;
}

function buildDraftTone(samples: DearMeMemoryUpdateItem[]) {
  const joined = samples.map((sample) => sample.bodyPreview).join(" ").toLocaleLowerCase();
  const tones = ["Proof-first", "Plain language"];

  if (joined.includes("direct") || joined.includes("short") || joined.includes("plain")) {
    tones.push("Direct");
  }
  if (joined.includes("proof") || joined.includes("verified") || joined.includes("shipped")) {
    tones.push("Evidence-backed");
  }
  if (joined.includes("concrete") || joined.includes("specific")) {
    tones.push("Concrete");
  }
  if (tones.length < 4) {
    tones.push("Approval-ready");
  }

  return Array.from(new Set(tones)).slice(0, 6);
}

function buildMemoryVoiceProfile(items: DearMeMemoryUpdateItem[]): DearMeWorkbenchVoiceProfile {
  const voiceSamples = items.filter((item) => item.kind === "voice_sample");
  const sampleCount = voiceSamples.length;

  if (sampleCount === 0) {
    return {
      title: "Draft Voice Profile",
      status: "needs_samples",
      sampleCount,
      confidence: 20,
      guidance: "Voice Editor needs real samples before treating draft tone as reliable.",
      draftTone: ["Plain language", "Proof-first"],
      nextStep: "Add two real writing samples, notes, or approved posts before reviewing public-facing drafts.",
    };
  }

  if (sampleCount === 1) {
    return {
      title: "Draft Voice Profile",
      status: "learning",
      sampleCount,
      confidence: 55,
      guidance: "Voice Editor has one sample and can start drafting, but public output should stay under close review.",
      draftTone: buildDraftTone(voiceSamples),
      nextStep: "Add one more real sample to make voice review stronger before publishing or sending anything.",
    };
  }

  return {
    title: "Draft Voice Profile",
    status: "ready_for_review",
    sampleCount,
    confidence: 80,
    guidance: "Voice Editor has enough samples to use this as a draft voice profile for private work.",
    draftTone: buildDraftTone(voiceSamples),
    nextStep: "Use voice review on prepared posts, outreach, and portfolio copy before approving external moves.",
  };
}

function buildMemorySourcePlan(items: DearMeMemoryUpdateItem[]): DearMeWorkbenchMemorySourcePlan {
  const counts = new Map<DearMeMemoryUpdateKind, number>();
  for (const item of items) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }

  const required = MEMORY_SOURCE_REQUIREMENTS.map((requirement) => {
    const count = counts.get(requirement.kind) ?? 0;
    const status: DearMeWorkbenchMemorySourceRequirement["status"] =
      count === 0 ? "missing" : count >= requirement.target ? "ready" : "partial";
    return {
      ...requirement,
      count,
      status,
    };
  });
  const nextRequirement = required.find((requirement) => requirement.status !== "ready") ?? null;
  const status: DearMeWorkbenchMemorySourcePlan["status"] =
    items.length === 0
      ? "needs_sources"
      : nextRequirement
        ? "building"
        : "ready_for_review";

  let summary = "Voice & Memory has the core coverage needed for stronger private drafts and review-ready public work.";
  if (status === "needs_sources") {
    summary = "Start Voice & Memory with real samples, proof, goals, audience, offer, and boundaries before trusting public-facing work.";
  } else if (nextRequirement) {
    summary = `Voice & Memory is building coverage. Next: ${nextRequirement.nextAction}`;
  }

  return {
    status,
    summary,
    nextSourceKind: nextRequirement?.kind ?? null,
    required,
  };
}

function sourceReviewKey(item: Pick<DearMeMemoryUpdateItem, "kind" | "sourceLabel" | "title" | "bodyPreview">) {
  const sourceIdentity = item.sourceLabel ?? item.title ?? item.bodyPreview;
  return `${item.kind}:${sourceIdentity.replace(/\s+/g, " ").trim().toLocaleLowerCase()}`;
}

function isMemorySourceReviewCandidate(item: DearMeMemoryUpdateItem): item is DearMeMemorySourceReviewCandidate {
  return item.sourceInputMode === "link" || item.sourceInputMode === "import_note";
}

function buildMemorySourceReviewQueue(items: DearMeMemoryUpdateItem[]): DearMeWorkbenchMemorySourceReviewItem[] {
  const reviewedSourceKeys = new Set(
    items
      .filter((item) => item.sourceInputMode === "paste")
      .map(sourceReviewKey),
  );

  return items
    .filter(isMemorySourceReviewCandidate)
    .filter((item) => !reviewedSourceKeys.has(sourceReviewKey(item)))
    .slice(0, 6)
    .map((item) => {
      const sourceTitle = item.title ?? `${MEMORY_KIND_LABELS[item.kind]} source`;
      const projectedSourceTitle = dearMeWorkbenchProjectionTitle(
        sourceTitle,
        `${MEMORY_KIND_LABELS[item.kind]} source`,
      );
      const modeLabel = MEMORY_SOURCE_REVIEW_MODE_LABELS[item.sourceInputMode];
      const kindLabel = MEMORY_KIND_LABELS[item.kind].toLocaleLowerCase();
      return {
        id: `source-review:${item.id}`,
        sourceMemoryId: item.id,
        sourceInputMode: item.sourceInputMode,
        sourceTitle: projectedSourceTitle,
        sourceLabel: dearMeWorkbenchProjectionOptionalText(item.sourceLabel),
        summary: dearMeWorkbenchProjectionText(
          `${modeLabel} saved for ${kindLabel}: ${item.bodyPreview}`,
          `${modeLabel} saved for ${kindLabel}.`,
          900,
        ),
        proposedKind: item.kind,
        proposedTitle: projectedSourceTitle,
        proposedBody: item.body,
        nextAction: `Review this ${kindLabel} and save the fact once it is ready for future private work.`,
        createdAt: item.createdAt,
      };
    });
}

function digestItems(items: Array<string | null | undefined>, fallback: string) {
  const cleaned = items
    .map((item) => item?.replace(/\s+/g, " ").trim())
    .filter((item): item is string => Boolean(item))
    .map((item) => previewText(item, 240));

  const unique = Array.from(new Set(cleaned)).slice(0, 6);
  return unique.length > 0 ? unique : [fallback];
}

function artifactLabelForWork(item: DearMeWorkbenchWorkItem) {
  return item.outputKind ? OUTPUT_KIND_ARTIFACT_LABELS[item.outputKind] : "Private growth brief";
}

function movingLabelForWork(item: DearMeWorkbenchWorkItem) {
  return item.outputKind ? OUTPUT_KIND_ARTIFACT_LABELS[item.outputKind] : "the next private growth brief";
}

function buildReportDigest(input: {
  activeWork: DearMeWorkbenchWorkItem[];
  workReady: DearMeWorkbenchWorkItem[];
  decisionsNeeded: DearMeWorkbenchDecision[];
  recentProgress: DearMeWorkbenchProgressItem[];
  memory: DearMeWorkbenchMemory;
  cyclePacket: DearMeCyclePacketEvidence | null;
}): DearMeReportDigest {
  const accomplished = digestItems(
    [
      input.cyclePacket?.reportSummary,
      ...input.recentProgress.map((item) => `${item.title}: ${item.summary}`),
      ...input.workReady.map((item) =>
        `${artifactLabelForWork(item)} is ready for your review: ${item.summary}`),
    ],
    "Your team is preparing the first private growth cycle so the weekly letter has real work to close.",
  );
  const decisions = digestItems(
    [
      input.cyclePacket
        ? `Shared packet review: ${input.cyclePacket.nextAction}`
        : null,
      ...input.decisionsNeeded.map((decision) => `${decision.title}: ${decision.summary}`),
    ],
    "No public, send, deploy, or spend move needs your call right now.",
  );
  const learnings = digestItems(
    [
      input.memory.voiceProfile.guidance,
      ...input.memory.latest.map((item) =>
        `${MEMORY_KIND_LABELS[item.kind]} added: ${item.bodyPreview}`),
    ],
    "Add voice samples, proof, and boundaries so the next cycle can sound more like you.",
  );
  const nextBets = digestItems(
    [
      ...input.activeWork.map((item) =>
        `${TEAM_ROLE_PUBLIC_LABELS[item.ownerRole]} is moving ${movingLabelForWork(item)} forward.`),
      input.workReady.length > 0
        ? "Review the prepared work and decide what can represent you publicly."
        : null,
      input.cyclePacket
        ? "Use the shared packet as the single review surface before the next cycle starts."
        : null,
      input.decisionsNeeded.length > 0
        ? "Make the waiting high-leverage calls so the team can continue the cycle."
        : null,
    ],
    "Start the next private cycle with one sharper goal, one proof source, and one audience bet.",
  );

  return { accomplished, decisions, learnings, nextBets };
}

function buildWorkStream(input: {
  activeWork: DearMeWorkbenchWorkItem[];
  workReady: DearMeWorkbenchWorkItem[];
  decisionsNeeded: DearMeWorkbenchDecision[];
  recentProgress: DearMeWorkbenchProgressItem[];
}) {
  const items = [
    ...input.decisionsNeeded.map(streamItemFromDecision),
    ...input.activeWork.map(streamItemFromWork),
    ...input.workReady.map(streamItemFromWork),
    ...input.recentProgress.map(streamItemFromProgress),
  ];

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.relatedOutputId ?? item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
}

function runLedgerKindForStreamItem(item: DearMeWorkbenchStreamItem): DearMeRunLedgerKind {
  if (item.kind === "memory_recorded" || item.cycleStage === "learn") return "learned";
  if (item.kind === "report_ready" || item.status === "ready_for_review" || item.status === "complete") {
    return "prepared";
  }
  if (item.needsApproval || item.kind === "decision_needed") return "needs_decision";
  return "tried";
}

function runLedgerEvidenceLabel(item: DearMeWorkbenchStreamItem) {
  const labels = [item.sourceLabel, item.artifact].filter(Boolean);
  const base = Array.from(new Set(labels)).join(" / ") || "Team signal";
  return previewText(item.costImpact ? `${base}: ${item.costImpact}` : base, 220);
}

function runLedgerEntryFromStream(item: DearMeWorkbenchStreamItem): DearMeWorkbenchRunLedgerEntry {
  return {
    id: `ledger:${item.id}`,
    kind: runLedgerKindForStreamItem(item),
    role: item.role,
    title: item.title,
    summary: item.summary,
    evidenceLabel: runLedgerEvidenceLabel(item),
    status: item.status,
    needsApproval: item.needsApproval,
    nextAction: item.nextAction,
    relatedOutputId: item.relatedOutputId,
    issueId: item.issueId,
    issueIdentifier: item.issueIdentifier,
    approvalId: item.approvalId,
    createdAt: item.createdAt,
  };
}

function runLedgerEntryFromMemory(item: DearMeMemoryUpdateItem): DearMeWorkbenchRunLedgerEntry {
  return {
    id: `ledger:memory:${item.id}`,
    kind: "learned",
    role: "voice_editor",
    title: item.title ?? `${MEMORY_KIND_LABELS[item.kind]} saved`,
    summary: item.bodyPreview,
    evidenceLabel: previewText(item.sourceLabel ?? MEMORY_KIND_LABELS[item.kind], 220),
    status: "recorded",
    needsApproval: false,
    nextAction: "Use this Voice & Memory signal to make the next private cycle more accurate.",
    relatedOutputId: null,
    issueId: null,
    issueIdentifier: null,
    approvalId: null,
    createdAt: item.createdAt,
  };
}

function buildRunLedger(input: {
  workStream: DearMeWorkbenchStreamItem[];
  memory: DearMeWorkbenchMemory;
}): DearMeWorkbenchRunLedgerEntry[] {
  const entries = input.workStream.map(runLedgerEntryFromStream);

  if (!entries.some((entry) => entry.kind === "learned")) {
    const latestMemory = input.memory.latest[0] ?? null;
    if (latestMemory) {
      entries.push(runLedgerEntryFromMemory(latestMemory));
    }
  }

  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      const key = entry.relatedOutputId ?? entry.approvalId ?? entry.issueId ?? entry.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);
}

function latestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? DEARME_ACTION_GRAPH_FALLBACK_UPDATED_AT;
}

function graphEdgeId(
  kind: DearMeActionGraphEdge["kind"],
  fromNodeId: string,
  toNodeId: string,
) {
  return `${kind}:${fromNodeId}->${toNodeId}`;
}

function relatedOutputIdForDecision(decision: DearMeWorkbenchDecision) {
  return decision.outputKind ? decision.id.replace(/^output:/, "") : null;
}

function buildActionGraph(input: {
  team: DearMeWorkbenchTeamMember[];
  activeWork: DearMeWorkbenchWorkItem[];
  workReady: DearMeWorkbenchWorkItem[];
  decisionsNeeded: DearMeWorkbenchDecision[];
  batchDecisions: DearMeWorkbenchBatchDecision[];
  memory: DearMeWorkbenchMemory;
  report: DearMeWorkbenchReport | null;
  outputs: DearMeOutputItem[];
}): DearMeActionGraph {
  const nodes = new Map<string, DearMeActionGraphNode>();
  const edges = new Map<string, DearMeActionGraphEdge>();
  const allWork = [...input.activeWork, ...input.workReady];
  const teamByRole = new Map(input.team.map((member) => [member.role, member]));
  const latestUpdatedAt = latestTimestamp([
    ...input.team.map((member) => member.lastActiveAt),
    ...allWork.map((item) => item.updatedAt),
    ...input.decisionsNeeded.map((decision) => decision.updatedAt),
    ...input.batchDecisions.map((batch) => batch.updatedAt),
    ...input.memory.latest.map((memory) => memory.createdAt),
    input.report?.updatedAt,
    ...input.outputs.map((output) => output.updatedAt),
  ]);
  const cycleStatus = input.decisionsNeeded.length > 0
    ? "decisions_needed"
    : input.activeWork.length > 0
      ? "working"
      : input.workReady.length > 0
        ? "ready_for_review"
        : "standing_by";

  function addNode(node: DearMeActionGraphNode) {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  }

  function addEdge(edge: Omit<DearMeActionGraphEdge, "id">) {
    if (!nodes.has(edge.fromNodeId) || !nodes.has(edge.toNodeId)) {
      return;
    }
    const id = graphEdgeId(edge.kind, edge.fromNodeId, edge.toNodeId);
    if (!edges.has(id)) {
      edges.set(id, { id, ...edge });
    }
  }

  function roleNodeId(role: DearMeTeamRole) {
    return `role:${role}`;
  }

  function ensureRoleNode(role: DearMeTeamRole, updatedAt: string) {
    const member = teamByRole.get(role);
    addNode({
      id: roleNodeId(role),
      kind: "role",
      label: member?.name ?? TEAM_ROLE_PUBLIC_LABELS[role],
      summary: member?.currentFocus ?? TEAM_ROLE_FOCUS[role],
      role,
      status: member?.status ?? "Assigned",
      source: "team",
      relatedOutputId: null,
      issueId: null,
      approvalId: null,
      updatedAt: member?.lastActiveAt ?? updatedAt,
    });
  }

  addNode({
    id: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
    kind: "cycle",
    label: "Weekly growth cycle",
    summary: [
      "Plan, work, review, learn, and report across",
      `${input.team.length} roles,`,
      `${allWork.length} work lanes,`,
      `and ${input.decisionsNeeded.length} decisions.`,
    ].join(" "),
    role: "chief_of_staff",
    status: cycleStatus,
    source: "cycle",
    relatedOutputId: null,
    issueId: null,
    approvalId: null,
    updatedAt: latestUpdatedAt,
  });

  for (const member of input.team) {
    ensureRoleNode(member.role, member.lastActiveAt ?? latestUpdatedAt);
    addEdge({
      kind: "owns",
      fromNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
      toNodeId: roleNodeId(member.role),
      label: "coordinates",
    });
  }

  for (const item of allWork) {
    ensureRoleNode(item.ownerRole, item.updatedAt);
    const nodeId = `work:${item.id}`;
    addNode({
      id: nodeId,
      kind: "work_item",
      label: item.title,
      summary: item.summary,
      role: item.ownerRole,
      status: item.status,
      source: "work",
      relatedOutputId: item.outputKind ? item.id : null,
      issueId: item.issueId,
      approvalId: null,
      updatedAt: item.updatedAt,
    });
    addEdge({
      kind: "owns",
      fromNodeId: roleNodeId(item.ownerRole),
      toNodeId: nodeId,
      label: "owns",
    });
  }

  for (const output of input.outputs) {
    const ownerRole = OUTPUT_OWNER_ROLE[output.kind];
    ensureRoleNode(ownerRole, output.updatedAt);
    const nodeId = `artifact:${output.id}`;
    const workNodeId = `work:${output.id}`;
    addNode({
      id: nodeId,
      kind: "artifact",
      label: output.title,
      summary: outputSummaryForWorkbench(output),
      role: ownerRole,
      status: output.status,
      source: "artifact",
      relatedOutputId: output.id,
      issueId: output.issueId,
      approvalId: null,
      updatedAt: output.updatedAt,
    });
    addEdge({
      kind: "produces",
      fromNodeId: nodes.has(workNodeId) ? workNodeId : roleNodeId(ownerRole),
      toNodeId: nodeId,
      label: "produces",
    });
  }

  for (const decision of input.decisionsNeeded) {
    const role = roleForDecision(decision);
    ensureRoleNode(role, decision.updatedAt);
    const outputId = relatedOutputIdForDecision(decision);
    const nodeId = `decision:${decision.id}`;
    const artifactNodeId = outputId ? `artifact:${outputId}` : null;
    const workNodeId = outputId ? `work:${outputId}` : null;
    addNode({
      id: nodeId,
      kind: "decision",
      label: decision.title,
      summary: decision.summary,
      role,
      status: decision.status,
      source: "decision",
      relatedOutputId: outputId,
      issueId: decision.issueId,
      approvalId: decision.approvalId,
      updatedAt: decision.updatedAt,
    });
    addEdge({
      kind: "requires_decision",
      fromNodeId: artifactNodeId && nodes.has(artifactNodeId)
        ? artifactNodeId
        : workNodeId && nodes.has(workNodeId)
          ? workNodeId
          : DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
      toNodeId: nodeId,
      label: "needs your decision",
    });
  }

  for (const batch of input.batchDecisions) {
    const nodeId = `guardrail:${batch.id}`;
    addNode({
      id: nodeId,
      kind: "guardrail",
      label: batch.title,
      summary: batch.summary,
      role: "chief_of_staff",
      status: "needs review",
      source: "guardrail",
      relatedOutputId: null,
      issueId: null,
      approvalId: null,
      updatedAt: batch.updatedAt,
    });
    addEdge({
      kind: "blocks",
      fromNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
      toNodeId: nodeId,
      label: "keeps risky moves gated",
    });
    for (const decisionId of batch.decisionIds) {
      const decisionNodeId = `decision:${decisionId}`;
      addEdge({
        kind: "blocks",
        fromNodeId: nodeId,
        toNodeId: decisionNodeId,
        label: "collects decision",
      });
    }
  }

  for (const memory of input.memory.latest.slice(0, 8)) {
    const nodeId = `memory:${memory.id}`;
    addNode({
      id: nodeId,
      kind: "memory_signal",
      label: memory.title ?? MEMORY_KIND_LABELS[memory.kind],
      summary: memory.bodyPreview,
      role: "voice_editor",
      status: "recorded",
      source: "memory",
      relatedOutputId: null,
      issueId: null,
      approvalId: null,
      updatedAt: memory.createdAt,
    });
    addEdge({
      kind: "learns_from",
      fromNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
      toNodeId: nodeId,
      label: "learns from",
    });
  }

  if (input.report) {
    const nodeId = `report:${input.report.outputId}`;
    ensureRoleNode("growth_analyst", input.report.updatedAt);
    addNode({
      id: nodeId,
      kind: "report",
      label: input.report.title,
      summary: input.report.summary,
      role: "growth_analyst",
      status: input.report.status,
      source: "report",
      relatedOutputId: input.report.outputId,
      issueId: input.report.issueId,
      approvalId: null,
      updatedAt: input.report.updatedAt,
    });
    addEdge({
      kind: "reports",
      fromNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
      toNodeId: nodeId,
      label: "reports",
    });
  }

  return {
    summary: "DearMe projects the current growth cycle into a customer-safe graph of roles, work, artifacts, decisions, memory, and reports.",
    cycleNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
    nodes: Array.from(nodes.values()).slice(0, 80),
    edges: Array.from(edges.values()).slice(0, 160),
  };
}

function decisionFromOutput(output: DearMeOutputItem): DearMeWorkbenchDecision {
  const packet = cyclePacketEvidence(output);
  return {
    id: `output:${output.id}`,
    kind: "review_output",
    title: `Review ${output.title}`,
    summary: packet?.summary ?? "Your team prepared this private artifact. Approve the next move only if it represents you.",
    riskGate: OUTPUT_DECISION_GATE[output.kind],
    status: "needed",
    outputKind: output.kind,
    approvalId: null,
    issueId: output.issueId,
    issueIdentifier: output.issueIdentifier,
    updatedAt: output.updatedAt,
    reviewLoop: output.reviewLoop,
  };
}

function decisionFromApproval(input: {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  updatedAt: Date;
}): DearMeWorkbenchDecision {
  const rawTitle = typeof input.payload.title === "string"
    ? input.payload.title
    : "Approve DearMe action";
  const rawSummary = typeof input.payload.summary === "string"
    ? input.payload.summary
    : "Review the pending DearMe action before the team moves forward.";

  return {
    id: `approval:${input.id}`,
    kind: input.type === "dearme_brand_blueprint_apply" ? "approve_brand_os" : "approve_action",
    title: dearMeWorkbenchProjectionTitle(rawTitle, "Approve DearMe action"),
    summary: dearMeWorkbenchProjectionText(
      rawSummary,
      "Review the pending DearMe action before the team moves forward.",
    ),
    riskGate: null,
    status: "pending",
    outputKind: null,
    approvalId: input.id,
    issueId: null,
    issueIdentifier: null,
    updatedAt: toIso(input.updatedAt),
    reviewLoop: null,
  };
}

function batchKeyForDecision(decision: DearMeWorkbenchDecision): DearMeBatchKey {
  return decision.riskGate ?? "review";
}

function buildBatchSummary(count: number) {
  const subject = count === 1 ? "item is" : "items are";
  return `${count} ${subject} ready. DearMe prepared the work; the launch boundary controls the external move.`;
}

function buildBatchDecisions(decisions: DearMeWorkbenchDecision[]): DearMeWorkbenchBatchDecision[] {
  const groups = new Map<DearMeBatchKey, DearMeWorkbenchDecision[]>();

  for (const decision of decisions) {
    const key = batchKeyForDecision(decision);
    const group = groups.get(key) ?? [];
    group.push(decision);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([key, group]): DearMeWorkbenchBatchDecision => {
      const copy = BATCH_DECISION_COPY[key];
      const issueIds = group
        .map((decision) => decision.issueId)
        .filter((id): id is string => Boolean(id));
      const approvalIds = group
        .map((decision) => decision.approvalId)
        .filter((id): id is string => Boolean(id));

      return {
        id: `batch:${key}`,
        title: copy.title,
        summary: buildBatchSummary(group.length),
        actionLabel: copy.actionLabel,
        action: copy.action,
        riskGate: key === "review" ? null : key,
        itemCount: group.length,
        decisionIds: group.map((decision) => decision.id),
        issueIds,
        approvalIds,
        updatedAt: group[0]!.updatedAt,
      };
    })
    .slice(0, 8);
}

function progressFromActivity(input: {
  id: string;
  action: string;
  createdAt: Date;
}): DearMeWorkbenchProgressItem {
  if (input.action === "dearme.paid_beta_payment_recorded") {
    return {
      id: input.id,
      kind: "paid_beta",
      title: "Paid beta access recorded",
      summary: "Paid access is active for private DearMe work.",
      createdAt: toIso(input.createdAt),
    };
  }

  if (input.action === "dearme.brand_blueprint_apply_requested") {
    return {
      id: input.id,
      kind: "brand_os_requested",
      title: "Brand OS launch requested",
      summary: "The first growth-team plan is waiting for the launch call.",
      createdAt: toIso(input.createdAt),
    };
  }

  if (input.action === "dearme.brand_blueprint_applied") {
    return {
      id: input.id,
      kind: "brand_os_applied",
      title: "Growth team created",
      summary: "DearMe created the team, cycles, Brand OS documents, and first private work lanes.",
      createdAt: toIso(input.createdAt),
    };
  }

  if (input.action === DEARME_MEMORY_UPDATED_ACTION) {
    return {
      id: input.id,
      kind: "team_progress",
      title: "Voice & Memory updated",
      summary: "Voice Editor recorded a new voice or memory source for future private work.",
      createdAt: toIso(input.createdAt),
    };
  }

  if (input.action === DEARME_MEMORY_ARCHIVED_ACTION) {
    return {
      id: input.id,
      kind: "team_progress",
      title: "Voice & Memory source retired",
      summary: "Voice Editor stopped using an outdated source in future private work.",
      createdAt: toIso(input.createdAt),
    };
  }

  return {
    id: input.id,
    kind: "team_progress",
    title: "Team progress recorded",
    summary: "DearMe recorded new private progress in the brand growth cycle.",
    createdAt: toIso(input.createdAt),
  };
}

function progressFromRoutineRun(input: DearMeRoutineRunRow): DearMeWorkbenchProgressItem {
  const title = dearMeWorkbenchProjectionTitle(cleanCycleTitle(input.routineTitle), "Growth cycle");
  const createdAt = input.completedAt ?? input.updatedAt ?? input.triggeredAt;

  if (input.status === "completed") {
    return {
      id: `cycle:${input.id}`,
      kind: "cycle_check_in",
      title: "Cycle check-in completed",
      summary: `${title} checked in and kept the private growth cycle moving. DearMe will surface only prepared work or decisions that need your call.`,
      createdAt: toIso(createdAt),
    };
  }

  if (input.status === "failed") {
    return {
      id: `cycle:${input.id}`,
      kind: "cycle_check_in",
      title: "Cycle check-in needs attention",
      summary: `${title} hit a private execution snag. DearMe will keep public moves gated until the next usable decision is ready.`,
      createdAt: toIso(createdAt),
    };
  }

  if (input.status === "skipped" || input.status === "coalesced") {
    return {
      id: `cycle:${input.id}`,
      kind: "cycle_check_in",
      title: "Cycle check-in consolidated",
      summary: `${title} was folded into existing private work so the team does not create duplicate decisions.`,
      createdAt: toIso(createdAt),
    };
  }

  if (input.status === "issue_created") {
    return {
      id: `cycle:${input.id}`,
      kind: "cycle_check_in",
      title: "Cycle check-in opened work",
      summary: `${title} opened the next private work lane. It will ask for your approval only when a public, send, deploy, or spend move is ready.`,
      createdAt: toIso(createdAt),
    };
  }

  return {
    id: `cycle:${input.id}`,
    kind: "cycle_check_in",
    title: "Cycle check-in received",
    summary: `${title} is queued for private team work. No public move happens without approval.`,
    createdAt: toIso(createdAt),
  };
}

function progressFromSpendCheckpoint(input: DearMeSpendCheckpointRow): DearMeWorkbenchProgressItem | null {
  const eventCount = Number(input.eventCount ?? 0);
  const totalCents = Number(input.totalCents ?? 0);
  if (eventCount <= 0 || !input.latestAt) return null;
  const latestAt = isoFromDbTimestamp(input.latestAt);

  return {
    id: `spend:${latestAt}`,
    kind: "spend_checkpoint",
    title: "Spend checkpoint recorded",
    summary: `DearMe recorded ${moneyFromCents(totalCents)} of private team work across ${eventCount} checkpoint${eventCount === 1 ? "" : "s"}. Billing details stay backstage; spend-sensitive moves wait for the launch call.`,
    createdAt: latestAt,
  };
}

function buildHeadline(input: {
  teamCount: number;
  outputCount: number;
  activeWorkCount: number;
  workReadyCount: number;
  decisionCount: number;
}) {
  if (input.teamCount === 0 && input.outputCount === 0) {
    return "Your DearMe team is ready to start";
  }

  if (input.decisionCount > 0) {
    return "Dear me, your team has decisions ready";
  }

  if (input.workReadyCount > 0) {
    return "Dear me, your team prepared work for review";
  }

  if (input.activeWorkCount > 0) {
    return "Dear me, your team is working on today's brand cycle";
  }

  return "Dear me, your team is standing by";
}

function buildSummary(input: {
  teamCount: number;
  activeWorkCount: number;
  workReadyCount: number;
  decisionCount: number;
}) {
  if (input.teamCount === 0) {
    return "Preview Brand OS, record paid beta access, and approve the first private growth cycle to create the team.";
  }

  return [
    `${input.teamCount} team members are assigned to your brand cycle.`,
    `${input.workReadyCount} item${input.workReadyCount === 1 ? "" : "s"} ready.`,
    `${input.decisionCount} decision${input.decisionCount === 1 ? "" : "s"} needed.`,
    `${input.activeWorkCount} lane${input.activeWorkCount === 1 ? "" : "s"} in motion.`,
  ].join(" ");
}

export function dearmeWorkbenchService(db: Db) {
  const outputHandoff = dearmeOutputHandoffService(db);

  return {
    getWorkbench: async (companyId: string) => {
      const outputsResponse = await outputHandoff.listOutputs(companyId);
      const [agentRows, approvalRows, activityRows, memoryRows, chiefBriefRows] = await Promise.all([
        db
          .select({
            id: agents.id,
            name: agents.name,
            role: agents.role,
            status: agents.status,
            metadata: agents.metadata,
            lastHeartbeatAt: agents.lastHeartbeatAt,
            updatedAt: agents.updatedAt,
          })
          .from(agents)
          .where(eq(agents.companyId, companyId))
          .orderBy(desc(agents.updatedAt)),
        db
          .select({
            id: approvals.id,
            type: approvals.type,
            payload: approvals.payload,
            updatedAt: approvals.updatedAt,
          })
          .from(approvals)
          .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
          .orderBy(desc(approvals.updatedAt))
          .limit(25),
        db
          .select({
            id: activityLog.id,
            action: activityLog.action,
            createdAt: activityLog.createdAt,
          })
          .from(activityLog)
          .where(eq(activityLog.companyId, companyId))
          .orderBy(desc(activityLog.createdAt))
          .limit(25),
        db
          .select({
            id: activityLog.id,
            action: activityLog.action,
            entityId: activityLog.entityId,
            details: activityLog.details,
            createdAt: activityLog.createdAt,
          })
          .from(activityLog)
          .where(and(eq(activityLog.companyId, companyId), inArray(activityLog.action, [...DEARME_MEMORY_ACTIONS])))
          .orderBy(desc(activityLog.createdAt))
          .limit(80),
        db
          .select({
            id: issues.id,
            title: issues.title,
            status: issues.status,
            identifier: issues.identifier,
            updatedAt: issues.updatedAt,
          })
          .from(issues)
          .where(and(
            eq(issues.companyId, companyId),
            eq(issues.originKind, DEARME_CHIEF_OF_STAFF_MESSAGE_ORIGIN_KIND),
            isNull(issues.hiddenAt),
          ))
          .orderBy(desc(issues.updatedAt))
          .limit(12),
      ]);

      const teamByRole = new Map<DearMeTeamRole, DearMeWorkbenchTeamMember>();

      for (const agent of agentRows) {
        const metadata = agent.metadata;
        if (
          !isRecord(metadata) ||
          metadata.source !== DEARME_BRAND_BLUEPRINT_ORIGIN_KIND ||
          !isDearMeRole(metadata.dearmeRole) ||
          teamByRole.has(metadata.dearmeRole)
        ) {
          continue;
        }

        teamByRole.set(metadata.dearmeRole, {
          role: metadata.dearmeRole,
          name: TEAM_ROLE_PUBLIC_LABELS[metadata.dearmeRole],
          status: teamStatus(agent.status),
          currentFocus: TEAM_ROLE_FOCUS[metadata.dearmeRole],
          lastActiveAt: toIso(agent.lastHeartbeatAt ?? agent.updatedAt),
        });
      }

      const team = Array.from(teamByRole.values())
        .sort((a, b) => TEAM_ROLE_ORDER.get(a.role)! - TEAM_ROLE_ORDER.get(b.role)!);
      const dearMeAgentIds = agentRows
        .filter((agent) => {
          const metadata = agent.metadata;
          return isRecord(metadata) &&
            metadata.source === DEARME_BRAND_BLUEPRINT_ORIGIN_KIND &&
            isDearMeRole(metadata.dearmeRole);
        })
        .map((agent) => agent.id);
      const [routineRunRows, spendCheckpointRows] = await Promise.all([
        db
          .select({
            id: routineRuns.id,
            routineTitle: routines.title,
            status: routineRuns.status,
            triggeredAt: routineRuns.triggeredAt,
            completedAt: routineRuns.completedAt,
            updatedAt: routineRuns.updatedAt,
            linkedIssueId: routineRuns.linkedIssueId,
          })
          .from(routineRuns)
          .innerJoin(routines, eq(routineRuns.routineId, routines.id))
          .innerJoin(issues, eq(routines.parentIssueId, issues.id))
          .where(and(
            eq(routineRuns.companyId, companyId),
            eq(routines.companyId, companyId),
            eq(issues.companyId, companyId),
            eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
          ))
          .orderBy(desc(routineRuns.updatedAt))
          .limit(5),
        dearMeAgentIds.length > 0
          ? db
              .select({
                eventCount: sql<number>`count(*)::int`,
                totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
                latestAt: sql<Date | null>`max(${costEvents.occurredAt})`,
              })
              .from(costEvents)
              .where(and(
                eq(costEvents.companyId, companyId),
                inArray(costEvents.agentId, dearMeAgentIds),
              ))
          : Promise.resolve([{ eventCount: 0, totalCents: 0, latestAt: null }]),
      ]);

      const outputs = outputsResponse.outputs.map(dearMeWorkbenchProjectionOutput);
      const activeOutputWork = outputs
        .filter((output) => !output.isReviewable && !["complete", "cancelled"].includes(output.status))
        .map(workItemFromOutput);
      const chiefBriefWork = chiefBriefRows
        .map(workItemFromChiefBriefIssue)
        .filter((item) => !["complete", "cancelled"].includes(item.status));
      const activeWork = [...chiefBriefWork, ...activeOutputWork]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 20);
      const workReady = outputs
        .filter((output) => output.isReviewable)
        .map(workItemFromOutput);
      const approvalDecisions = approvalRows
        .filter((approval) => approval.type.startsWith("dearme_"))
        .filter((approval) => isRecord(approval.payload))
        .map((approval) => decisionFromApproval({
          id: approval.id,
          type: approval.type,
          payload: approval.payload,
          updatedAt: approval.updatedAt,
        }));
      const outputDecisions = workReady
        .map((item) => outputs.find((output) => output.id === item.id))
        .filter((output): output is DearMeOutputItem => Boolean(output))
        .map(decisionFromOutput);
      const decisionsNeeded = [...approvalDecisions, ...outputDecisions]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 12);
      const batchDecisions = buildBatchDecisions(decisionsNeeded);
      const activityProgress = activityRows
        .filter((activity) =>
          activity.action.startsWith("dearme.") &&
          activity.action !== DEARME_CHIEF_OF_STAFF_MESSAGE_ACTION)
        .map(progressFromActivity);
      const spendProgress = progressFromSpendCheckpoint(spendCheckpointRows[0] ?? {
        eventCount: 0,
        totalCents: 0,
        latestAt: null,
      });
      const recentProgress = [
        ...activityProgress,
        ...routineRunRows.map(progressFromRoutineRun),
        ...(spendProgress ? [spendProgress] : []),
      ]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5);
      const latestMemory = activeMemoryFromActivityRows(memoryRows);
      const archivedMemory = archivedMemoryFromActivityRows(memoryRows);
      const memory = {
        summary: buildMemorySummary(latestMemory),
        sourceCount: latestMemory.length,
        voiceSampleCount: latestMemory.filter((item) => item.kind === "voice_sample").length,
        proofCount: latestMemory.filter((item) => item.kind === "proof_point").length,
        voiceProfile: buildMemoryVoiceProfile(latestMemory),
        sourcePlan: buildMemorySourcePlan(latestMemory),
        sourceReviewQueue: buildMemorySourceReviewQueue(latestMemory),
        latest: latestMemory,
        archived: archivedMemory,
      };
      const reportOutput = outputs.find((output) => output.kind === "weekly_report") ?? null;
      const reportPacket = reportOutput ? cyclePacketEvidence(reportOutput) : null;
      const reportDigest = buildReportDigest({
        activeWork,
        workReady,
        decisionsNeeded,
        recentProgress,
        memory,
        cyclePacket: reportPacket,
      });
      const report = reportOutput
        ? {
            title: reportOutput.title,
            summary: reportPacket?.reportSummary ?? reportOutput.summary,
            status: reportOutput.status,
            outputId: reportOutput.id,
            issueId: reportOutput.issueId,
            issueIdentifier: reportOutput.issueIdentifier,
            bodyPreview: outputPreview(reportOutput),
            ...reportDigest,
            updatedAt: reportOutput.updatedAt,
          }
        : null;
      const workStream = buildWorkStream({
        activeWork,
        workReady,
        decisionsNeeded,
        recentProgress,
      });
      const runLedger = buildRunLedger({ workStream, memory });
      const actionGraph = buildActionGraph({
        team,
        activeWork,
        workReady,
        decisionsNeeded,
        batchDecisions,
        memory,
        report,
        outputs,
      });

      return dearMeWorkbenchResponseSchema.parse({
        companyId,
        headline: buildHeadline({
          teamCount: team.length,
          outputCount: outputs.length,
          activeWorkCount: activeWork.length,
          workReadyCount: workReady.length,
          decisionCount: decisionsNeeded.length,
        }),
        summary: buildSummary({
          teamCount: team.length,
          activeWorkCount: activeWork.length,
          workReadyCount: workReady.length,
          decisionCount: decisionsNeeded.length,
        }),
        team,
        activeWork,
        workReady,
        decisionsNeeded,
        batchDecisions,
        recentProgress,
        workStream,
        runLedger,
        memory,
        report,
        actionGraph,
        outputs,
      });
    },
  };
}
