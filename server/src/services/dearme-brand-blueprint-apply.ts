import type { Db } from "@paperclipai/db";
import { approvals } from "@paperclipai/db";
import { DEFAULT_CODEX_LOCAL_MODEL } from "@paperclipai/adapter-codex-local";
import {
  DEARME_SIX_HOUR_CYCLE_KEY,
  DEARME_SIX_HOUR_GROWTH_ROUTINE,
  renderDearMeSixHourCycleIssue,
} from "@paperclipai/dearme-agent-prompts";
import {
  createDearMeFirstCyclePreview,
  dearMeBrandBlueprintApplyPayloadSchema,
  type DearMeBrandBlueprint,
  type DearMeBrandBlueprintApplyPayload,
  type DearMeFirstCyclePreviewResponse,
  type DearMeOutputKind,
} from "@paperclipai/shared";
import { unprocessable } from "../errors.js";
import { agentService } from "./agents.js";
import { documentService } from "./documents.js";
import { issueService } from "./issues.js";
import { logActivity } from "./activity-log.js";
import { routineService } from "./routines.js";

type ApprovalRecord = typeof approvals.$inferSelect;
type DearMeTeamMember = DearMeBrandBlueprint["team"][number];
type DearMeTeamRole = DearMeBrandBlueprint["team"][number]["role"];
type DearMeRiskGate = DearMeBrandBlueprint["gates"][number];
type DearMeMemorySeedKind = DearMeBrandBlueprint["memorySeeds"][number]["kind"];
type DearMeOperationId = DearMeBrandBlueprintApplyPayload["executionPlan"]["operations"][number]["id"];
type DearMeVoiceMemorySectionKey = "goals" | "audiences" | "offers" | "proof" | "voice" | "constraints";
type DearMeFirstWeekSeedDocument = {
  key: string;
  title: string;
  body: string;
  changeSummary: string;
};

export const DEARME_BRAND_BLUEPRINT_ORIGIN_KIND = "dearme_brand_blueprint_apply";
export const DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_TYPE = "codex_local";
export const DEARME_BRAND_BLUEPRINT_INVALID_APPROVAL_MESSAGE =
  "This DearMe approval needs to be refreshed before it can be approved.";
const DEARME_BRAND_BLUEPRINT_AUTO_START_OPERATION_ID = "draft_content_batch" satisfies DearMeOperationId;
const DEARME_WEEKLY_REPORT_DOCUMENT_KEY = "dear-me-report";
const DEARME_OUTPUT_KIND_BY_OPERATION_ID: Partial<Record<DearMeOperationId, DearMeOutputKind>> = {
  seed_voice_profile: "voice_profile",
  draft_content_batch: "content_drafts",
  draft_opportunity_list: "opportunity_drafts",
  prepare_portfolio_update: "portfolio_update",
  schedule_weekly_report: "weekly_report",
};

const DEARME_CHANNEL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  newsletter: "Newsletter",
  blog: "Blog",
  portfolio: "Portfolio",
  email: "Email",
  community: "Community",
  website: "Website",
};

const DEARME_VOICE_MEMORY_SECTION_ORDER_BY_OUTPUT_KIND: Record<DearMeOutputKind, DearMeVoiceMemorySectionKey[]> = {
  brand_os: ["goals", "audiences", "proof", "offers", "voice", "constraints"],
  voice_profile: ["voice", "constraints", "audiences", "goals", "proof", "offers"],
  content_drafts: ["voice", "proof", "audiences", "offers", "goals", "constraints"],
  opportunity_drafts: ["audiences", "offers", "proof", "goals", "voice", "constraints"],
  portfolio_update: ["proof", "voice", "goals", "offers", "audiences", "constraints"],
  weekly_report: ["goals", "proof", "offers", "audiences", "voice", "constraints"],
};

const DEARME_BRAND_BLUEPRINT_CODEX_SANDBOX_ARGS = [
  "--sandbox",
  "workspace-write",
  "-c",
  "sandbox_workspace_write.network_access=true",
  "--skip-git-repo-check",
] as const;

const DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_CONFIG = {
  model: DEFAULT_CODEX_LOCAL_MODEL,
  dangerouslyBypassApprovalsAndSandbox: false,
  extraArgs: DEARME_BRAND_BLUEPRINT_CODEX_SANDBOX_ARGS,
} as const;

function buildDearMeBrandBlueprintAgentAdapterConfig(member: DearMeTeamMember) {
  return {
    ...DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_CONFIG,
    dearmeExecutionTemplate: {
      role: member.role,
      executionLane: member.executionLane,
      workspaceMode: member.workspaceMode,
    },
  };
}

function buildDearMeBrandBlueprintAgentRuntimeConfig(member: DearMeTeamMember) {
  return {
    heartbeat: {
      enabled: true,
      cadenceHours: member.heartbeatCadenceHours,
      maxConcurrentRuns: 1,
      wakeOnDemand: true,
    },
    dearmeExecutionTemplate: {
      role: member.role,
      executionLane: member.executionLane,
      workspaceMode: member.workspaceMode,
      heartbeatCadenceHours: member.heartbeatCadenceHours,
    },
  };
}

const DEARME_BRAND_BLUEPRINT_ISSUE_ASSIGNEE_OVERRIDES = {
  modelProfile: "cheap",
  useProjectWorkspace: false,
  adapterConfig: {
    dangerouslyBypassApprovalsAndSandbox: false,
    extraArgs: DEARME_BRAND_BLUEPRINT_CODEX_SANDBOX_ARGS,
  },
} as const;

const DEARME_BRAND_BLUEPRINT_EXECUTION_WORKSPACE_SETTINGS = {
  mode: "agent_default",
} as const;

export interface DearMeBrandBlueprintApplyArtifacts {
  agents: Array<{ id: string; role: DearMeTeamRole; name: string }>;
  routines: Array<{ id: string; cycleId: string; title: string; triggerId: string | null }>;
  issues: Array<{ id: string; operationId: DearMeOperationId; title: string; status: "backlog" | "todo" }>;
  documents: Array<{ id: string; key: string; issueId: string }>;
  gatedOperations: Array<{ id: string; gate: DearMeRiskGate["kind"] }>;
}

function actorForApproval(approval: ApprovalRecord) {
  const userId = approval.decidedByUserId ?? approval.requestedByUserId ?? null;
  if (userId) {
    return {
      serviceActor: { userId, agentId: null },
      activityActor: { actorType: "user" as const, actorId: userId, agentId: null },
    };
  }

  const agentId = approval.requestedByAgentId ?? null;
  if (agentId) {
    return {
      serviceActor: { userId: null, agentId },
      activityActor: { actorType: "agent" as const, actorId: agentId, agentId },
    };
  }

  return {
    serviceActor: { userId: null, agentId: null },
    activityActor: { actorType: "system" as const, actorId: "dearme", agentId: null },
  };
}

export function validateDearMeBrandBlueprintApplyPayload(rawPayload: unknown): DearMeBrandBlueprintApplyPayload {
  const parsed = dearMeBrandBlueprintApplyPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw unprocessable(DEARME_BRAND_BLUEPRINT_INVALID_APPROVAL_MESSAGE);
  }
  return parsed.data;
}

function listLines(values: string[]) {
  if (values.length === 0) return "- None supplied yet.";
  return values.map((value) => `- ${value}`).join("\n");
}

function compactLine(value: string, maxLength = 360) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trimEnd()}...`;
}

function listPreviewLines(values: string[], maxItems = 6, maxLength = 360) {
  return listLines(values.slice(0, maxItems).map((value) => compactLine(value, maxLength)));
}

function memorySeedValues(blueprint: DearMeBrandBlueprint, kind: DearMeMemorySeedKind) {
  return blueprint.memorySeeds.filter((seed) => seed.kind === kind).map((seed) => seed.value);
}

function outputKindForOperation(operationId: DearMeOperationId) {
  return DEARME_OUTPUT_KIND_BY_OPERATION_ID[operationId] ?? null;
}

function voiceProfileStatusLabel(status: DearMeBrandBlueprint["voiceProfile"]["status"]) {
  return status === "ready_for_gate" ? "Ready for voice-gated drafts" : "Needs more voice samples";
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function gateByKind(blueprint: DearMeBrandBlueprint) {
  return new Map(blueprint.gates.map((gate) => [gate.kind, gate]));
}

function channelLabel(channel: string) {
  return DEARME_CHANNEL_LABELS[channel] ?? channel;
}

function firstCyclePreviewForPayload(
  companyId: string,
  payload: DearMeBrandBlueprintApplyPayload,
): DearMeFirstCyclePreviewResponse {
  const { brandBlueprint: blueprint } = payload;
  return createDearMeFirstCyclePreview(companyId, {
    brand: {
      displayName: blueprint.brand.displayName,
      positioning: blueprint.brand.positioning,
      goals: blueprint.brand.goals,
      audiences: blueprint.brand.audiences,
      proofPoints: blueprint.brand.proofPoints,
      offers: blueprint.brand.offers,
      voiceSamples: memorySeedValues(blueprint, "voice"),
      preferredChannels: blueprint.brand.preferredChannels,
      constraints: blueprint.brand.constraints,
      cadence: blueprint.cycles[0]?.cadence ?? "weekly",
      budgetMonthlyCents: blueprint.budgetPolicy.monthlyCents,
      autoDraftEnabled: payload.autoDraftEnabled,
    },
  });
}

function ownerAgentId(
  agentsByRole: Map<DearMeTeamRole, { id: string; name: string }>,
  role: DearMeTeamRole,
) {
  return agentsByRole.get(role)?.id ?? null;
}

function cronForCadence(cadence: DearMeBrandBlueprint["cycles"][number]["cadence"]) {
  if (cadence === "daily") return "0 14 * * 1-5";
  return "0 14 * * 1";
}

function renderBrandOsDocument(payload: DearMeBrandBlueprintApplyPayload) {
  const { brandBlueprint: blueprint } = payload;
  return [
    `# Brand OS: ${blueprint.brand.displayName}`,
    "",
    "## Positioning",
    blueprint.brand.positioning,
    "",
    "## Goals",
    listLines(blueprint.brand.goals),
    "",
    "## Audiences",
    listLines(blueprint.brand.audiences),
    "",
    "## Proof Points",
    listLines(blueprint.brand.proofPoints),
    "",
    "## Offers",
    listLines(blueprint.brand.offers),
    "",
    "## Content Pillars",
    listLines(blueprint.contentPillars),
    "",
    "## Preferred Channels",
    listLines(blueprint.brand.preferredChannels),
    "",
    "## Constraints",
    listLines(blueprint.brand.constraints),
    "",
    "## Budget Policy",
    `- Monthly budget: ${money(blueprint.budgetPolicy.monthlyCents)}`,
    `- Warn at: ${blueprint.budgetPolicy.warnPercent}%`,
    `- Hard stop: ${blueprint.budgetPolicy.hardStopEnabled ? "enabled" : "disabled"}`,
    "",
    "## Approval Note",
    payload.approvalNote ?? "None.",
  ].join("\n");
}

function renderVoiceProfileDocument(blueprint: DearMeBrandBlueprint) {
  const voiceSeeds = blueprint.memorySeeds.filter((seed) => seed.kind === "voice");
  return [
    `# Voice Profile: ${blueprint.brand.displayName}`,
    "",
    `Status: ${blueprint.voiceProfile.status}`,
    `Sample count: ${blueprint.voiceProfile.sampleCount}`,
    "",
    "## Guidance",
    blueprint.voiceProfile.guidance,
    "",
    "## Voice Samples",
    listLines(voiceSeeds.map((seed) => seed.value)),
    "",
    "## Boundary",
    "Voice drafts stay private until the relevant publish, send, sensitive-material, or public-claim approval is granted.",
  ].join("\n");
}

function renderApprovalGatesDocument(blueprint: DearMeBrandBlueprint) {
  return [
    `# Approval Gates: ${blueprint.brand.displayName}`,
    "",
    ...blueprint.gates.flatMap((gate) => [
      `## ${gate.label}`,
      `Kind: ${gate.kind}`,
      `Mode: ${gate.mode}`,
      gate.reason,
      "",
    ]),
  ].join("\n").trimEnd();
}

function approvalGateText(gate: DearMeRiskGate | null, fallback: string) {
  if (!gate) return fallback;
  return `${gate.label}: ${gate.reason}`;
}

function renderContentSeedDocument(input: {
  payload: DearMeBrandBlueprintApplyPayload;
  preview: DearMeFirstCyclePreviewResponse;
  gate: DearMeRiskGate | null;
}): DearMeFirstWeekSeedDocument {
  const { brandBlueprint: blueprint } = input.payload;
  return {
    key: "starter-posts",
    title: "Starter posts",
    changeSummary: "Seeded first-week content brief from DearMe Brand OS approval",
    body: [
      `# Starter content batch: ${blueprint.brand.displayName}`,
      "",
      "Status: Private first-week seed brief",
      `Approval gate: ${approvalGateText(input.gate, "Publish approval is required before any starter post moves public.")}`,
      "",
      "## Purpose",
      "Turn the approved Brand OS into starter posts the user can review before any public publishing.",
      "",
      "## Private starter posts",
      ...input.preview.starterPosts.flatMap((post, index) => [
        `### Starter post ${index + 1}: ${post.title}`,
        `- Channel: ${channelLabel(post.channel)}`,
        `- Audience: ${input.preview.opportunityLead.target}`,
        `- Hook: ${post.hook}`,
        `- Proof used: ${post.proofUsed}`,
        `- Approval gate: ${post.approvalGate}`,
        "",
        "Draft body:",
        post.body,
        "",
      ]),
      "## Voice check",
      `Voice fit score: ${input.preview.voiceGate.score}/100, ${input.preview.voiceGate.status}`,
      input.preview.voiceGate.summary,
      "",
      "## Review Notes",
      "- Keep every draft private until the user approves a public action.",
      "- Revise inside this document before asking for a launch decision.",
    ].join("\n").trimEnd(),
  };
}

function renderOpportunitySeedDocument(input: {
  payload: DearMeBrandBlueprintApplyPayload;
  preview: DearMeFirstCyclePreviewResponse;
  gate: DearMeRiskGate | null;
}): DearMeFirstWeekSeedDocument {
  const { brandBlueprint: blueprint } = input.payload;
  const { opportunityLead } = input.preview;
  const shortlistLines = input.preview.opportunityShortlist.flatMap((lead, index) => [
    `## Lead ${index + 1}: ${lead.title}`,
    `- Target: ${lead.target}`,
    `- Why relevant: ${lead.whyRelevant}`,
    `- Relevance score: ${lead.relevanceScore}/10 starter hypothesis`,
    `- Outreach angle: ${lead.outreachAngle}`,
    `- Approval gate: ${lead.approvalGate}`,
    "",
    "Draft message:",
    lead.draftMessage,
    "",
  ]);
  return {
    key: "opportunity-list",
    title: "Opportunity list",
    changeSummary: "Seeded first-week opportunity brief from DearMe Brand OS approval",
    body: [
      `# Opportunity shortlist: ${blueprint.brand.displayName}`,
      "",
      "Status: Private first-week seed brief",
      `Approval gate: ${approvalGateText(input.gate, "Send approval is required before any outreach leaves DearMe.")}`,
      "",
      "## Shortlist overview",
      `- First lead: ${opportunityLead.title} for ${opportunityLead.target}`,
      `- Total leads: ${input.preview.opportunityShortlist.length}`,
      "",
      ...shortlistLines,
      "",
      "## Recommendation",
      "- Confirm the relationship context, channel, and claim accuracy before sending.",
      "- Keep this private until the user approves outreach.",
    ].join("\n"),
  };
}

function renderPortfolioSeedDocument(input: {
  payload: DearMeBrandBlueprintApplyPayload;
  preview: DearMeFirstCyclePreviewResponse;
  gate: DearMeRiskGate | null;
}): DearMeFirstWeekSeedDocument {
  const { brandBlueprint: blueprint } = input.payload;
  const { portfolioProofCard } = input.preview;
  return {
    key: "portfolio-update",
    title: "Portfolio update",
    changeSummary: "Seeded first-week portfolio brief from DearMe Brand OS approval",
    body: [
      `# Portfolio proof update: ${blueprint.brand.displayName}`,
      "",
      "Status: Private first-week seed brief",
      `Deploy gate: ${approvalGateText(input.gate, "Deploy approval is required before any public site change.")}`,
      "",
      "## Proof Card",
      `- Title: ${portfolioProofCard.title}`,
      `- Placement: ${portfolioProofCard.placement}`,
      `- Proof source: ${portfolioProofCard.proofSource}`,
      `- Approval gate: ${portfolioProofCard.approvalGate}`,
      "",
      "Proposed copy:",
      portfolioProofCard.proposedCopy,
      "",
      "## Recommendation",
      "- Keep this as a private portfolio draft until the user approves deployment.",
      "- Review proof accuracy and voice fit before requesting the launch decision.",
    ].join("\n"),
  };
}

function firstWeekSeedDocumentForOperation(input: {
  operationId: DearMeOperationId;
  payload: DearMeBrandBlueprintApplyPayload;
  preview: DearMeFirstCyclePreviewResponse | null;
  gate: DearMeRiskGate | null;
}): DearMeFirstWeekSeedDocument | null {
  if (!input.preview) return null;
  const seedInput = {
    payload: input.payload,
    preview: input.preview,
    gate: input.gate,
  };
  switch (input.operationId) {
    case "draft_content_batch":
      return renderContentSeedDocument(seedInput);
    case "draft_opportunity_list":
      return renderOpportunitySeedDocument(seedInput);
    case "prepare_portfolio_update":
      return renderPortfolioSeedDocument(seedInput);
    default:
      return null;
  }
}

function renderDearMeReportDocument(
  payload: DearMeBrandBlueprintApplyPayload,
  preview: DearMeFirstCyclePreviewResponse | null,
) {
  const { brandBlueprint: blueprint } = payload;
  const voiceSamples = memorySeedValues(blueprint, "voice");
  const seededDrafts = preview
    ? [
        `- Content: ${preview.starterPosts.length} private starter posts seeded for review.`,
        `- Opportunity: five-target shortlist held for send approval, first lead for ${preview.opportunityLead.target}.`,
        `- Portfolio: ${preview.portfolioProofCard.placement} proof copy held for deploy approval.`,
      ]
    : ["- No reviewable drafts have been reported yet."];
  return [
    `# Dear me report: ${blueprint.brand.displayName}`,
    "",
    "Status: Private draft workspace",
    "Cadence: Weekly",
    "",
    "## Purpose",
    "Summarize what DearMe did this week, what changed for the brand, which decisions need review, and what should happen next.",
    "",
    "## Brand Goal This Week",
    listLines(blueprint.brand.goals.slice(0, 3)),
    "",
    "## Voice & Memory Context",
    `- Voice profile: ${voiceProfileStatusLabel(blueprint.voiceProfile.status)}`,
    `- Voice guidance: ${compactLine(blueprint.voiceProfile.guidance, 320)}`,
    `- Voice samples supplied: ${blueprint.voiceProfile.sampleCount}`,
    "",
    "### Audiences",
    listPreviewLines(blueprint.brand.audiences, 4, 240),
    "",
    "### Offers",
    listPreviewLines(blueprint.brand.offers, 4, 240),
    "",
    "### Voice Samples For Tone Review",
    listPreviewLines(voiceSamples, 4, 360),
    "",
    "### Constraints",
    listPreviewLines(blueprint.brand.constraints, 4, 240),
    "",
    "## Work Completed",
    preview
      ? "- Brand OS, Voice Profile, approval gates, recurring cycles, and private first-week work lanes were created."
      : "- No completed work has been reported yet.",
    "",
    "## Drafts and Assets Ready for Review",
    seededDrafts.join("\n"),
    "",
    "## Decisions Needed",
    preview
      ? "- Review the seeded content, opportunity, and portfolio briefs before approving any public, send, or deploy action."
      : "- Choose which private drafts should move toward the launch boundary.",
    "",
    "## Outcomes and Signals",
    "- No live channel or opportunity signals have been reported yet.",
    "",
    "## Budget and Credits",
    `- Monthly budget: ${money(blueprint.budgetPolicy.monthlyCents)}`,
    `- Warning threshold: ${blueprint.budgetPolicy.warnPercent}%`,
    `- Hard stop: ${blueprint.budgetPolicy.hardStopEnabled ? "enabled" : "disabled"}`,
    "",
    "## Next Bets",
    listLines(blueprint.contentPillars.slice(0, 3)),
    "",
    "## Private Notes",
    "- Keep this report private until the user approves any external sharing.",
  ].join("\n");
}

function renderVoiceAndMemoryTaskContext(blueprint: DearMeBrandBlueprint, outputKind?: DearMeOutputKind | null) {
  const voiceSamples = memorySeedValues(blueprint, "voice");
  const sections: Array<{ key: DearMeVoiceMemorySectionKey; lines: string[] }> = [
    {
      key: "goals",
      lines: ["Goals to serve:", listPreviewLines(blueprint.brand.goals, 6, 240)],
    },
    {
      key: "audiences",
      lines: ["Audiences to write for:", listPreviewLines(blueprint.brand.audiences, 6, 240)],
    },
    {
      key: "offers",
      lines: ["Offers to keep available:", listPreviewLines(blueprint.brand.offers, 6, 240)],
    },
    {
      key: "proof",
      lines: ["Proof to use:", listPreviewLines(blueprint.brand.proofPoints, 6, 240)],
    },
    {
      key: "voice",
      lines: ["Voice samples for tone review:", listPreviewLines(voiceSamples, 4, 360)],
    },
    {
      key: "constraints",
      lines: ["Constraints and boundaries:", listPreviewLines(blueprint.brand.constraints, 6, 240)],
    },
  ];
  const sectionOrder = outputKind
    ? DEARME_VOICE_MEMORY_SECTION_ORDER_BY_OUTPUT_KIND[outputKind]
    : (["goals", "audiences", "offers", "proof", "voice", "constraints"] as const);
  const sectionsByKey = new Map(sections.map((section) => [section.key, section]));

  return [
    "",
    "Voice & Memory context:",
    `- Voice profile: ${voiceProfileStatusLabel(blueprint.voiceProfile.status)}`,
    `- Voice guidance: ${compactLine(blueprint.voiceProfile.guidance, 320)}`,
    `- Voice samples supplied: ${blueprint.voiceProfile.sampleCount}`,
    ...sectionOrder.flatMap((key) => {
      const section = sectionsByKey.get(key);
      return section ? ["", ...section.lines] : [];
    }),
  ];
}

function renderBrandOsIssueDescription(payload: DearMeBrandBlueprintApplyPayload) {
  const { brandBlueprint: blueprint } = payload;
  return [
    payload.summary,
    "",
    "DearMe has persisted the Brand OS documents on this issue. Review these before enabling public output.",
    "",
    "Acceptance:",
    "- Brand OS document reflects identity, positioning, goals, audiences, proof, offers, channels, constraints, and budget.",
    "- Voice profile document records whether more samples are needed.",
    "- Launch boundaries document lists every public, outbound, spend, and channel action that still needs the user's launch call.",
    "",
    `Memory seeds created in document form: ${blueprint.memorySeeds.length}`,
  ].join("\n");
}

function renderRoutineDescription(cycle: DearMeBrandBlueprint["cycles"][number], payload: DearMeBrandBlueprintApplyPayload) {
  return [
    `${cycle.title} for ${payload.brandBlueprint.brand.displayName}.`,
    "",
    "Deliverables:",
    listLines(cycle.deliverables),
    ...renderVoiceAndMemoryTaskContext(payload.brandBlueprint),
    "",
    "Operating boundary:",
    "This routine may plan, research, and draft privately. It must create a follow-up launch decision before publishing, sending messages, deploying public pages, spending money, changing channel connections, using sensitive material, making public claims, or deleting existing work.",
  ].join("\n");
}

function sixHourCycleRecentSignals(blueprint: DearMeBrandBlueprint) {
  return [
    ...blueprint.brand.goals.slice(0, 2).map((goal) => `Goal: ${compactLine(goal, 240)}`),
    ...blueprint.brand.audiences.slice(0, 2).map((audience) => `Audience: ${compactLine(audience, 240)}`),
    ...blueprint.brand.proofPoints.slice(0, 2).map((proofPoint) => `Proof: ${compactLine(proofPoint, 240)}`),
  ];
}

function renderSixHourGrowthRoutineDescription(payload: DearMeBrandBlueprintApplyPayload) {
  const { brandBlueprint: blueprint } = payload;
  const primaryGoal = blueprint.brand.goals[0];
  return [
    renderDearMeSixHourCycleIssue({
      brandName: blueprint.brand.displayName,
      focus: primaryGoal
        ? `Advance "${compactLine(primaryGoal, 180)}" with private work ready for review.`
        : null,
      recentSignals: sixHourCycleRecentSignals(blueprint),
      budgetStatus: "inside_budget",
    }),
    ...renderVoiceAndMemoryTaskContext(blueprint),
  ].join("\n");
}

function renderDraftIssueDescription(
  operation: DearMeBrandBlueprintApplyPayload["executionPlan"]["operations"][number],
  payload: DearMeBrandBlueprintApplyPayload,
  gate: DearMeRiskGate | null,
) {
  const isPortfolioUpdate = operation.id === "prepare_portfolio_update";
  const isWeeklyReportScheduling = operation.id === "schedule_weekly_report";
  const isDraftOpportunityList = operation.id === "draft_opportunity_list";
  const isDraftContentBatch = operation.id === "draft_content_batch";
  const portfolioScope = isPortfolioUpdate
    ? [
        "",
        "Portfolio scope:",
        "- Update the 6-page personal portfolio draft structure (home, about, projects, writing, now, contact).",
        "- Refresh proof language, outcomes, and artifact links where evidence exists.",
        "- Keep tone and claims aligned with the brand voice guidance and constraints.",
        "- Produce recommendations and patch suggestions only; never edit live public pages.",
      ]
    : [];
  const reportScheduleScope = isWeeklyReportScheduling
    ? [
        "",
        "Weekly report scope:",
        `- Update the attached \`${DEARME_WEEKLY_REPORT_DOCUMENT_KEY}\` document with a private weekly Dear me report.`,
        "- Use the attached document as the durable report surface; do not satisfy this operation with only a standalone workspace file.",
        "- After updating the attached report document, leave only a short issue comment summarizing what changed.",
        "- Summarize completed work, draft deliverables, decisions needed, budget notes, outcomes, and next bets.",
        "- Reference issue identifiers, attached documents, or stated assumptions for every concrete claim.",
        "- If no work has completed yet, write a setup report that explains Brand OS status, queued first operations, and the next review path.",
        "- Keep the report private; do not publish, send, or share it externally.",
      ]
    : [];
  const opportunityScope = isDraftOpportunityList
    ? [
        "",
        "Opportunity scope:",
        "- Identify and prioritize outbound opportunities across channels aligned with the brand positioning and preferences.",
        "- Produce a shortlist with contact reasoning, outreach angle, relevance score (1-10), and a one-sentence recommendation.",
        "- Draft email/DM outreach templates for the top opportunities and stage them for the launch call.",
        "- Mark any assumptions and unknowns clearly, then propose the next launch-ready actions.",
      ]
    : [];
  const contentScope = isDraftContentBatch
    ? [
        "",
        "Content scope:",
        "- Draft personal-brand content for the preferred channels using the Brand OS goals, proof points, offers, and pillars.",
        "- Focus on audience value, proof-backed point of view, portfolio credibility, and approved offers.",
        "- Do not draft generic greeting-card, birthday, reminder, or app-marketing copy unless the Brand OS explicitly requests it.",
        "- Include channel, audience, hook, draft body, proof used, and required launch boundary for every item.",
      ]
    : [];
  const artifactBoundaryLine = isWeeklyReportScheduling
    ? "- Create the final private customer-facing artifact in the attached report document; issue comments should summarize the document update, and standalone workspace files are supporting scratch only."
    : "- Create private customer-facing artifacts in the issue thread, attached documents, or agent workspace.";

  return [
    operation.description,
    "",
    "Private draft scope:",
    "- Produce reviewable drafts or recommendations only.",
    "- Do not publish, send, deploy, spend, connect channels, use sensitive material, make public claims, or delete existing work.",
    gate
      ? `- Before executing the risky step, request a new approval for: ${gate.label} (${gate.reason})`
      : "- Keep output private until the user reviews the result.",
    "",
    "DearMe operation boundary:",
    "- This is a DearMe personal brand growth operation for the customer, not a product codebase maintenance task.",
    artifactBoundaryLine,
    "- Do not modify repository source, tests, package files, config, docs, or local product code while completing this operation.",
    "- Mark assumptions and approval needs in the output instead of changing product behavior.",
    "",
    "Brand context:",
    `- Name: ${payload.brandBlueprint.brand.displayName}`,
    `- Positioning: ${payload.brandBlueprint.brand.positioning}`,
    "",
    "Preferred channels:",
    listLines(payload.brandBlueprint.brand.preferredChannels.slice(0, 6)),
    "",
    "Content pillars:",
    listLines(payload.brandBlueprint.contentPillars.slice(0, 6)),
    ...renderVoiceAndMemoryTaskContext(payload.brandBlueprint, outputKindForOperation(operation.id)),
    ...contentScope,
    ...opportunityScope,
    ...portfolioScope,
    ...reportScheduleScope,
  ].join("\n");
}

function draftOperations(payload: DearMeBrandBlueprintApplyPayload) {
  const selected = new Set([
    "seed_voice_profile",
    "draft_content_batch",
    "draft_opportunity_list",
    "prepare_portfolio_update",
    "schedule_weekly_report",
  ]);
  return payload.executionPlan.operations.filter((operation) => selected.has(operation.id));
}

function initialOperationIssueStatus(payload: DearMeBrandBlueprintApplyPayload, operationId: DearMeOperationId) {
  return payload.autoDraftEnabled && operationId === DEARME_BRAND_BLUEPRINT_AUTO_START_OPERATION_ID
    ? "todo"
    : "backlog";
}

export function dearmeBrandBlueprintApplyService(db: Db) {
  const agentsSvc = agentService(db);
  const documentsSvc = documentService(db);
  const issuesSvc = issueService(db);
  const routinesSvc = routineService(db);

  async function applyApprovedBlueprint(approval: ApprovalRecord): Promise<DearMeBrandBlueprintApplyArtifacts> {
    const payload = validateDearMeBrandBlueprintApplyPayload(approval.payload);
    const { brandBlueprint: blueprint } = payload;
    const { serviceActor, activityActor } = actorForApproval(approval);
    const agentsByRole = new Map<DearMeTeamRole, { id: string; name: string }>();
    const firstCyclePreview = payload.autoDraftEnabled
      ? firstCyclePreviewForPayload(approval.companyId, payload)
      : null;
    const artifacts: DearMeBrandBlueprintApplyArtifacts = {
      agents: [],
      routines: [],
      issues: [],
      documents: [],
      gatedOperations: [],
    };

    for (const member of blueprint.team) {
      const created = await agentsSvc.create(approval.companyId, {
        name: `DearMe ${member.name}`,
        role: member.role,
        title: member.name,
        reportsTo: null,
        capabilities: `${member.mission}\n\nLaunch boundary: ${member.approvalBoundary}`,
        adapterType: DEARME_BRAND_BLUEPRINT_AGENT_ADAPTER_TYPE,
        adapterConfig: buildDearMeBrandBlueprintAgentAdapterConfig(member),
        runtimeConfig: buildDearMeBrandBlueprintAgentRuntimeConfig(member),
        budgetMonthlyCents: 0,
        metadata: {
          source: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
          approvalId: approval.id,
          dearmeRole: member.role,
          executionLane: member.executionLane,
          workspaceMode: member.workspaceMode,
          heartbeatCadenceHours: member.heartbeatCadenceHours,
          brandDisplayName: blueprint.brand.displayName,
          canDraftPrivately: true,
          externalActionsRequireApproval: true,
          approvalBoundary: member.approvalBoundary,
        },
        status: "idle",
        spentMonthlyCents: 0,
        permissions: { canCreateAgents: false },
        lastHeartbeatAt: null,
      });
      agentsByRole.set(member.role, { id: created.id, name: created.name });
      artifacts.agents.push({ id: created.id, role: member.role, name: created.name });
    }

    const brandOsIssue = await issuesSvc.create(approval.companyId, {
      title: `DearMe: Review Brand OS for ${blueprint.brand.displayName}`,
      description: renderBrandOsIssueDescription(payload),
      status: "backlog",
      priority: "high",
      assigneeAgentId: ownerAgentId(agentsByRole, "brand_strategist"),
      assigneeAdapterOverrides: DEARME_BRAND_BLUEPRINT_ISSUE_ASSIGNEE_OVERRIDES,
      executionWorkspaceSettings: DEARME_BRAND_BLUEPRINT_EXECUTION_WORKSPACE_SETTINGS,
      createdByAgentId: serviceActor.agentId,
      createdByUserId: serviceActor.userId,
      originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
      originId: approval.id,
      originFingerprint: "brand-os-review",
    });
    artifacts.issues.push({
      id: brandOsIssue.id,
      operationId: "create_brand_os",
      title: brandOsIssue.title,
      status: "backlog",
    });

    const documentInputs = [
      {
        key: "brand-os",
        title: "Brand OS",
        body: renderBrandOsDocument(payload),
      },
      {
        key: "voice-profile",
        title: "Voice Profile",
        body: renderVoiceProfileDocument(blueprint),
      },
      {
        key: "approval-gates",
        title: "Approval Gates",
        body: renderApprovalGatesDocument(blueprint),
      },
    ];

    for (const documentInput of documentInputs) {
      const created = await documentsSvc.upsertIssueDocument({
        issueId: brandOsIssue.id,
        key: documentInput.key,
        title: documentInput.title,
        format: "markdown",
        body: documentInput.body,
        changeSummary: "Created from DearMe brand blueprint approval",
        createdByAgentId: serviceActor.agentId,
        createdByUserId: serviceActor.userId,
      });
      artifacts.documents.push({
        id: created.document.id,
        key: created.document.key,
        issueId: brandOsIssue.id,
      });
    }

    const sixHourGrowthTrigger = DEARME_SIX_HOUR_GROWTH_ROUTINE.triggers[0];
    if (!sixHourGrowthTrigger) {
      throw unprocessable("DearMe six-hour growth routine seed is missing a trigger");
    }

    const sixHourGrowthRoutine = await routinesSvc.create(
      approval.companyId,
      {
        projectId: null,
        goalId: null,
        parentIssueId: brandOsIssue.id,
        title: DEARME_SIX_HOUR_GROWTH_ROUTINE.title,
        description: renderSixHourGrowthRoutineDescription(payload),
        assigneeAgentId: ownerAgentId(agentsByRole, "chief_of_staff"),
        priority: DEARME_SIX_HOUR_GROWTH_ROUTINE.priority,
        status: DEARME_SIX_HOUR_GROWTH_ROUTINE.status,
        concurrencyPolicy: DEARME_SIX_HOUR_GROWTH_ROUTINE.concurrencyPolicy,
        catchUpPolicy: DEARME_SIX_HOUR_GROWTH_ROUTINE.catchUpPolicy,
        variables: [],
      },
      serviceActor,
    );
    const { trigger: createdSixHourGrowthTrigger } = await routinesSvc.createTrigger(
      sixHourGrowthRoutine.id,
      {
        kind: sixHourGrowthTrigger.kind,
        label: sixHourGrowthTrigger.label,
        enabled: sixHourGrowthTrigger.enabled,
        cronExpression: sixHourGrowthTrigger.cronExpression,
        timezone: sixHourGrowthTrigger.timezone,
      },
      serviceActor,
    );
    artifacts.routines.push({
      id: sixHourGrowthRoutine.id,
      cycleId: DEARME_SIX_HOUR_CYCLE_KEY,
      title: sixHourGrowthRoutine.title,
      triggerId: createdSixHourGrowthTrigger.id,
    });

    for (const cycle of blueprint.cycles) {
      const routine = await routinesSvc.create(
        approval.companyId,
        {
          projectId: null,
          goalId: null,
          parentIssueId: brandOsIssue.id,
          title: `DearMe: ${cycle.title}`,
          description: renderRoutineDescription(cycle, payload),
          assigneeAgentId: ownerAgentId(agentsByRole, cycle.ownerRole),
          priority: "medium",
          status: "active",
          concurrencyPolicy: "coalesce_if_active",
          catchUpPolicy: "skip_missed",
          variables: [],
        },
        serviceActor,
      );
      const { trigger } = await routinesSvc.createTrigger(
        routine.id,
        {
          kind: "schedule",
          label: `${cycle.title} ${cycle.cadence} schedule`,
          enabled: true,
          cronExpression: cronForCadence(cycle.cadence),
          timezone: "America/New_York",
        },
        serviceActor,
      );
      artifacts.routines.push({
        id: routine.id,
        cycleId: cycle.id,
        title: routine.title,
        triggerId: trigger.id,
      });
    }

    const gates = gateByKind(blueprint);
    for (const operation of draftOperations(payload)) {
      const gate = operation.approvalGate ? gates.get(operation.approvalGate) ?? null : null;
      if (gate) artifacts.gatedOperations.push({ id: operation.id, gate: gate.kind });

      const issue = await issuesSvc.create(approval.companyId, {
        title: `DearMe Draft: ${operation.title}`,
        description: renderDraftIssueDescription(operation, payload, gate),
        status: initialOperationIssueStatus(payload, operation.id),
        priority: gate ? "high" : "medium",
        assigneeAgentId: ownerAgentId(agentsByRole, operation.ownerRole),
        assigneeAdapterOverrides: DEARME_BRAND_BLUEPRINT_ISSUE_ASSIGNEE_OVERRIDES,
        executionWorkspaceSettings: DEARME_BRAND_BLUEPRINT_EXECUTION_WORKSPACE_SETTINGS,
        createdByAgentId: serviceActor.agentId,
        createdByUserId: serviceActor.userId,
        originKind: DEARME_BRAND_BLUEPRINT_ORIGIN_KIND,
        originId: approval.id,
        originFingerprint: `operation-${operation.id}`,
      });
      artifacts.issues.push({
        id: issue.id,
        operationId: operation.id,
        title: issue.title,
        status: issue.status as "backlog" | "todo",
      });

      const seedDocument = firstWeekSeedDocumentForOperation({
        operationId: operation.id,
        payload,
        preview: firstCyclePreview,
        gate,
      });
      if (seedDocument) {
        const created = await documentsSvc.upsertIssueDocument({
          issueId: issue.id,
          key: seedDocument.key,
          title: seedDocument.title,
          format: "markdown",
          body: seedDocument.body,
          changeSummary: seedDocument.changeSummary,
          createdByAgentId: serviceActor.agentId,
          createdByUserId: serviceActor.userId,
        });
        artifacts.documents.push({
          id: created.document.id,
          key: created.document.key,
          issueId: issue.id,
        });
      }

      if (operation.id === "schedule_weekly_report") {
        const created = await documentsSvc.upsertIssueDocument({
          issueId: issue.id,
          key: DEARME_WEEKLY_REPORT_DOCUMENT_KEY,
          title: "Dear me report",
          format: "markdown",
          body: renderDearMeReportDocument(payload, firstCyclePreview),
          changeSummary: "Created from DearMe weekly report operation",
          createdByAgentId: serviceActor.agentId,
          createdByUserId: serviceActor.userId,
        });
        artifacts.documents.push({
          id: created.document.id,
          key: created.document.key,
          issueId: issue.id,
        });
      }
    }

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: activityActor.actorType,
      actorId: activityActor.actorId,
      agentId: activityActor.agentId,
      action: "dearme.brand_blueprint_applied",
      entityType: "approval",
      entityId: approval.id,
      details: {
        agents: artifacts.agents,
        routines: artifacts.routines,
        issues: artifacts.issues,
        documents: artifacts.documents,
        gatedOperations: artifacts.gatedOperations,
      },
    });

    return artifacts;
  }

  return {
    applyApprovedBlueprint,
  };
}
