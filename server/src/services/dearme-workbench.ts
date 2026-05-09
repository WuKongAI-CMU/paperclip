import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, agents, approvals, issues } from "@paperclipai/db";
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

const TEAM_ROLE_ORDER = new Map(DEARME_TEAM_ROLES.map((role, index) => [role, index]));
const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);
const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
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
};

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
    summary: output.summary,
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
    nextStep: needsReview
      ? "Review the prepared private move, then approve, request changes, regenerate, or mark it not useful."
      : "Chief of Staff is preparing this privately before it asks for a public or external move.",
  };
}

function titleFromChiefBriefIssue(title: string) {
  const briefTitle = title.replace(/^DearMe:\s*/i, "").trim() || "Private growth brief";
  return previewText(`Chief of Staff brief: ${briefTitle}`, 180);
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
    summary: "Chief of Staff accepted this private brief and is turning it into the next reviewable move. Public moves still wait for approval.",
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
    relatedOutputId: item.outputKind ? item.id : null,
    issueId: item.issueId,
    issueIdentifier: item.issueIdentifier,
    createdAt: item.updatedAt,
    reviewLoop: item.reviewLoop,
  };
}

function streamItemFromDecision(decision: DearMeWorkbenchDecision): DearMeWorkbenchStreamItem {
  const role = roleForDecision(decision);

  return {
    id: `decision:${decision.id}`,
    role,
    title: `Your call: ${decision.title}`,
    summary: decision.summary,
    artifact: artifactForDecision(decision),
    status: "decision_needed",
    needsApproval: true,
    relatedOutputId: decision.outputKind ? decision.id.replace(/^output:/, "") : null,
    issueId: decision.issueId,
    issueIdentifier: decision.issueIdentifier,
    createdAt: decision.updatedAt,
    reviewLoop: decision.reviewLoop,
  };
}

function streamItemFromProgress(item: DearMeWorkbenchProgressItem): DearMeWorkbenchStreamItem {
  if (item.kind === "team_progress" && item.title === "Voice & Memory updated") {
    return {
      id: `progress:${item.id}`,
      role: "voice_editor",
      title: item.title,
      summary: item.summary,
      artifact: "Voice & Memory",
      status: "recorded",
      needsApproval: false,
      relatedOutputId: null,
      issueId: null,
      issueIdentifier: null,
      createdAt: item.createdAt,
      reviewLoop: null,
    };
  }

  return {
    id: `progress:${item.id}`,
    role: item.kind === "brand_os_applied" ? "chief_of_staff" : "growth_analyst",
    title: item.title,
    summary: item.summary,
    artifact: item.kind === "brand_os_applied" ? "Growth team" : "Progress",
    status: "recorded",
    needsApproval: false,
    relatedOutputId: null,
    issueId: null,
    issueIdentifier: null,
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
    title: optionalStringFromRecord(input.details, "title"),
    bodyPreview: previewText(body),
    sourceLabel: optionalStringFromRecord(input.details, "sourceLabel"),
    createdAt: toIso(input.createdAt),
  };
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
    label: "Weekly growth loop",
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
      summary: output.summary,
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
    summary: "DearMe projects the current team loop into a customer-safe graph of roles, work, artifacts, decisions, memory, and reports.",
    cycleNodeId: DEARME_ACTION_GRAPH_CYCLE_NODE_ID,
    nodes: Array.from(nodes.values()).slice(0, 80),
    edges: Array.from(edges.values()).slice(0, 160),
  };
}

function decisionFromOutput(output: DearMeOutputItem): DearMeWorkbenchDecision {
  return {
    id: `output:${output.id}`,
    kind: "review_output",
    title: `Review ${output.title}`,
    summary: "Your team prepared this private artifact. Approve the next move only if it represents you.",
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
  const title = typeof input.payload.title === "string"
    ? input.payload.title
    : "Approve DearMe action";
  const summary = typeof input.payload.summary === "string"
    ? input.payload.summary
    : "Review the pending DearMe action before the team moves forward.";

  return {
    id: `approval:${input.id}`,
    kind: input.type === "dearme_brand_blueprint_apply" ? "approve_brand_os" : "approve_action",
    title,
    summary,
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
  return `${count} ${subject} ready. DearMe prepared the work; approval still controls the external move.`;
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
      title: "Brand OS approval requested",
      summary: "The first growth-team plan is waiting for review.",
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

  return {
    id: input.id,
    kind: "team_progress",
    title: "Team progress recorded",
    summary: "DearMe recorded new private progress in the brand growth loop.",
    createdAt: toIso(input.createdAt),
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
    return "Dear me, your team is working on today's brand loop";
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
    return "Preview Brand OS, record paid beta access, and approve the first private work loop to create the team.";
  }

  return [
    `${input.teamCount} team members are assigned to your brand loop.`,
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
            entityId: activityLog.entityId,
            details: activityLog.details,
            createdAt: activityLog.createdAt,
          })
          .from(activityLog)
          .where(and(eq(activityLog.companyId, companyId), eq(activityLog.action, DEARME_MEMORY_UPDATED_ACTION)))
          .orderBy(desc(activityLog.createdAt))
          .limit(12),
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

      const outputs = outputsResponse.outputs;
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
      const recentProgress = activityRows
        .filter((activity) =>
          activity.action.startsWith("dearme.") &&
          activity.action !== DEARME_CHIEF_OF_STAFF_MESSAGE_ACTION)
        .map(progressFromActivity)
        .slice(0, 5);
      const latestMemory = memoryRows
        .map(memoryFromActivity)
        .filter((item): item is DearMeMemoryUpdateItem => Boolean(item));
      const memory = {
        summary: buildMemorySummary(latestMemory),
        sourceCount: latestMemory.length,
        voiceSampleCount: latestMemory.filter((item) => item.kind === "voice_sample").length,
        proofCount: latestMemory.filter((item) => item.kind === "proof_point").length,
        voiceProfile: buildMemoryVoiceProfile(latestMemory),
        latest: latestMemory,
      };
      const reportOutput = outputs.find((output) => output.kind === "weekly_report") ?? null;
      const report = reportOutput
        ? {
            title: reportOutput.title,
            summary: reportOutput.summary,
            status: reportOutput.status,
            outputId: reportOutput.id,
            issueId: reportOutput.issueId,
            issueIdentifier: reportOutput.issueIdentifier,
            bodyPreview: outputPreview(reportOutput),
            updatedAt: reportOutput.updatedAt,
          }
        : null;
      const workStream = buildWorkStream({
        activeWork,
        workReady,
        decisionsNeeded,
        recentProgress,
      });
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
        memory,
        report,
        actionGraph,
        outputs,
      });
    },
  };
}
