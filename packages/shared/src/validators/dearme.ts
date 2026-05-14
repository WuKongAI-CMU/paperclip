import { z } from "zod";

export const DEARME_BRAND_BLUEPRINT_VERSION = 1;

export const DEARME_BRAND_CHANNELS = [
  "linkedin",
  "x",
  "newsletter",
  "blog",
  "portfolio",
  "email",
  "community",
  "website",
] as const;

export const DEARME_BRAND_CADENCES = ["daily", "weekly", "biweekly"] as const;

export const DEARME_TEAM_ROLES = [
  "chief_of_staff",
  "brand_strategist",
  "voice_editor",
  "content_producer",
  "opportunity_scout",
  "portfolio_builder",
  "growth_analyst",
] as const;

export const DEARME_TEAM_EXECUTION_LANES = ["direct", "worker"] as const;
export const DEARME_TEAM_WORKSPACE_MODES = ["local", "remote"] as const;
export const DEARME_DIRECT_HEARTBEAT_CADENCE_HOURS = 2;
export const DEARME_WORKER_HEARTBEAT_CADENCE_HOURS = 8;

export const DEARME_RISK_GATES = [
  "publish_social",
  "send_email",
  "deploy_public_site",
  "spend_money",
  "public_claim",
  "sensitive_material",
  "connect_channel",
  "destructive_change",
] as const;

export const DEARME_FIRST_CYCLE_CONCERN_GATES = [
  "publish_social",
  "send_email",
  "deploy_public_site",
  "spend_money",
] as const;

export const DEARME_FIRST_CYCLE_PROOF_WINDOWS = ["0-30s", "60-120s", "3-5min"] as const;
export const DEARME_FIRST_CYCLE_LIVE_WORK_STATUSES = ["ready", "working", "your_call"] as const;
export const DEARME_FIRST_CYCLE_STARTER_POST_COUNT = 5;

export const DEARME_APPROVAL_GATES = ["publish", "send", "deploy", "spend"] as const;
export const DEARME_APPROVAL_DECISIONS = ["pending", "approved", "rejected"] as const;
export const DEARME_SILENCE_DEFAULT_REVIEW_SCORE = 7;

export const DEARME_BRAND_BLUEPRINT_OPERATION_ORDER = [
  "create_brand_os",
  "create_growth_team",
  "seed_voice_profile",
  "start_weekly_growth_cycle",
  "draft_content_batch",
  "draft_opportunity_list",
  "prepare_portfolio_update",
  "schedule_weekly_report",
] as const;

export const DEARME_PAID_BETA_BILLER = "dearme_paid_beta";
export const DEARME_PAID_BETA_MIN_PAYMENT_CENTS = 100;
export const DEARME_PAID_BETA_ENTITLEMENT_STATES = ["trial_preview", "paid_beta_active"] as const;
export const DEARME_CYCLE_GUARDRAIL_STATES = ["trial_preview", "ready", "warning", "hard_stop"] as const;
export const DEARME_OUTPUT_KINDS = [
  "brand_os",
  "voice_profile",
  "content_drafts",
  "opportunity_drafts",
  "portfolio_update",
  "weekly_report",
] as const;
export const DEARME_OUTPUT_STATUSES = [
  "queued",
  "working",
  "ready_for_review",
  "complete",
  "blocked",
  "cancelled",
] as const;
export const DEARME_OUTPUT_REVIEW_ACTIONS = [
  "approve",
  "request_changes",
  "regenerate",
  "not_useful",
] as const;
export const DEARME_OUTPUT_CONTINUATION_INTENTS = [
  "continue_revision",
  "prepare_another_pass",
  "choose_new_direction",
] as const;
export const DEARME_OUTPUT_REVIEW_LOOP_STATES = [
  "fresh",
  "needs_user_review",
  "revision_requested",
  "regeneration_requested",
  "not_useful",
  "approved",
  "retry_limit_reached",
] as const;
export const DEARME_OUTPUT_REVIEW_RESULT_STATUSES = [
  "recorded",
  "queued",
] as const;
export const DEARME_OUTPUT_DETAIL_KINDS = [
  "positioning",
  "voice_guidance",
  "channel",
  "audience",
  "hook",
  "draft_body",
  "proof_used",
  "approval_gate",
  "target",
  "why_relevant",
  "verification_status",
  "contact_record",
  "source_signal",
  "relevance_score",
  "outreach_angle",
  "draft_message",
  "page_section",
  "proof_source",
  "proposed_copy",
  "deploy_gate",
  "completed_work",
  "decisions_needed",
  "next_bets",
  "report_reference",
] as const;
export const DEARME_OUTPUT_SOURCE_EVIDENCE_KINDS = [
  "voice_memory",
  "proof",
  "approval_boundary",
  "private_reference",
] as const;
export const DEARME_WORKBENCH_DECISION_KINDS = [
  "approve_brand_os",
  "review_output",
  "approve_action",
] as const;
export const DEARME_WORKBENCH_BATCH_ACTIONS = [
  "review_work",
  "review_posts",
  "review_outreach",
  "review_site_updates",
  "review_sensitive_items",
  "approve_claims",
] as const;
export const DEARME_WORKBENCH_PROGRESS_KINDS = [
  "paid_beta",
  "first_cycle_aha",
  "brand_os_requested",
  "brand_os_applied",
  "next_move_approved",
  "execution_handoff_prepared",
  "next_move_delivery_recorded",
  "team_progress",
  "cycle_check_in",
  "spend_checkpoint",
] as const;
export const DEARME_NEXT_MOVE_DELIVERY_STATUSES = [
  "delivered",
  "needs_channel_connection",
  "pending",
  "rejected",
  "errored",
] as const;
export const DEARME_WORKBENCH_EXECUTION_READINESS = [
  "private_handoff_ready",
  "private_handoff_paused",
] as const;
export const DEARME_WORKBENCH_STREAM_STATUSES = [
  "working",
  "ready_for_review",
  "complete",
  "blocked",
  "cancelled",
  "decision_needed",
  "recorded",
] as const;
export const DEARME_WORKBENCH_RUN_LEDGER_KINDS = [
  "tried",
  "prepared",
  "learned",
  "blocked",
  "skipped",
  "needs_decision",
] as const;
export const DEARME_WORKBENCH_STREAM_KINDS = [
  "cycle_brief",
  "work_in_motion",
  "decision_needed",
  "memory_recorded",
  "progress_recorded",
  "report_ready",
] as const;
export const DEARME_WORKBENCH_CYCLE_STAGES = [
  "plan",
  "work",
  "review",
  "learn",
  "report",
] as const;
export const DEARME_WORK_EVENT_ACTIONS = [
  "plan",
  "research",
  "draft",
  "review",
  "approve",
  "handoff",
  "report",
  "learn",
  "prepare",
] as const;
export const DEARME_WORK_EVENT_TRACE_KINDS = [
  "output",
  "issue",
  "approval",
  "activity",
  "comment",
] as const;
export const DEARME_ACTION_GRAPH_NODE_KINDS = [
  "cycle",
  "role",
  "work_item",
  "artifact",
  "decision",
  "memory_signal",
  "report",
  "guardrail",
] as const;
export const DEARME_ACTION_GRAPH_EDGE_KINDS = [
  "plans",
  "owns",
  "produces",
  "requires_decision",
  "revises",
  "learns_from",
  "blocks",
  "unblocks",
  "reports",
] as const;
export const DEARME_MEMORY_UPDATE_KINDS = [
  "voice_sample",
  "proof_point",
  "goal",
  "audience",
  "offer",
  "constraint",
  "relationship",
  "preference",
  "review_feedback",
] as const;
export const DEARME_MEMORY_SIGNAL_KINDS = [
  "profile",
  "voice",
  "proof",
  "audience",
  "relationship",
  "feedback",
  "reference",
] as const;
export const DEARME_MEMORY_REJECTED_SOURCE_KINDS = [
  "raw_tool_log",
  "file_path_snapshot",
  "task_transcript",
  "runtime_config",
  "git_history",
] as const;
export const DEARME_MEMORY_SOURCE_INPUT_MODES = [
  "paste",
  "link",
  "import_note",
] as const;
export const DEARME_CHIEF_OF_STAFF_MESSAGE_INTENTS = [
  "plan_next",
  "draft_content",
  "find_opportunities",
  "refresh_portfolio",
  "prepare_report",
  "handle_feedback",
] as const;
export const DEARME_VOICE_GATE_CHECK_KINDS = [
  "voice_samples",
  "forbidden_phrases",
  "generic_launch_copy",
  "proof_claim",
  "channel_length",
] as const;
export const DEARME_VOICE_GATE_CHECK_STATUSES = ["pass", "warn", "block"] as const;
export const DEARME_VOICE_GATE_STATUSES = [
  "ready_for_review",
  "needs_voice_review",
  "blocked_before_public",
] as const;
export const DEARME_VOICE_GATE_ARTIFACT_KINDS = [
  "brand_positioning",
  "content_draft",
  "opportunity_outreach",
  "portfolio_copy",
  "weekly_report",
] as const;

const shortTextSchema = z.string().trim().min(1).max(240);
const mediumTextSchema = z.string().trim().min(1).max(1_000);
const longTextSchema = z.string().trim().min(1).max(4_000);

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().trim().min(1).max(maxLength).optional(),
  );
}

function slugifyDearMeHandle(value: string) {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}

function resolveDearMeSiteHandle(handle: string | null | undefined, fallback: string) {
  return slugifyDearMeHandle(handle ?? "") ?? slugifyDearMeHandle(fallback) ?? "private-preview";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const RESERVED_CONTACT_HOSTS = new Set(["example.com", "example.net", "example.org", "localhost"]);
const RESERVED_CONTACT_TLDS = new Set(["example", "test", "invalid", "localhost"]);

function isReservedContactHostname(value: string) {
  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (!hostname || RESERVED_CONTACT_HOSTS.has(hostname)) return true;
  const labels = hostname.split(".").filter(Boolean);
  const tld = labels.at(-1);
  return Boolean(tld && RESERVED_CONTACT_TLDS.has(tld));
}

function contactEmailUsesReservedDomain(value: string | undefined) {
  if (!value) return false;
  const atIndex = value.lastIndexOf("@");
  if (atIndex < 0) return false;
  return isReservedContactHostname(value.slice(atIndex + 1));
}

function contactUrlUsesReservedDomain(value: string | undefined) {
  if (!value) return false;
  try {
    return isReservedContactHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}

function textList(maxItems: number, maxLength: number) {
  return z.array(z.string().trim().min(1).max(maxLength)).max(maxItems).default([]);
}

const dearMeFirstCycleOpportunityContactEvidenceSchema = z.object({
  status: z.enum(["verified", "pending", "unavailable"]),
  sourceSignal: mediumTextSchema,
  contactEmail: optionalText(320),
  contactHandle: optionalText(120),
  contactUrl: optionalText(500),
}).strict().superRefine((value, ctx) => {
  const hasContactRecord = Boolean(value.contactEmail || value.contactHandle || value.contactUrl);
  if (value.status === "unavailable") {
    if (hasContactRecord) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unavailable contact evidence should not include a direct contact record.",
      });
    }
    return;
  }
  if (!hasContactRecord) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Contact evidence marked pending or verified needs a direct contact record.",
    });
  }
  if (value.status !== "verified") return;
  if (value.contactUrl && !isHttpUrl(value.contactUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactUrl"],
      message: "Verified contact evidence needs an http(s) contact URL.",
    });
  }
  if (contactEmailUsesReservedDomain(value.contactEmail)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactEmail"],
      message: "Verified contact evidence cannot use a reserved demo email domain.",
    });
  }
  if (contactUrlUsesReservedDomain(value.contactUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contactUrl"],
      message: "Verified contact evidence cannot use a reserved demo URL domain.",
    });
  }
});

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const dearMeBrandBlueprintSeedSchema = z.object({
  displayName: optionalText(120),
  positioning: optionalText(1_000),
  goals: textList(8, 240),
  audiences: textList(8, 240),
  proofPoints: textList(16, 1_000),
  offers: textList(8, 240),
  voiceSamples: textList(8, 4_000),
  preferredChannels: z.array(z.enum(DEARME_BRAND_CHANNELS)).max(8).default([]),
  constraints: textList(10, 500),
  cadence: z.enum(DEARME_BRAND_CADENCES).default("weekly"),
  budgetMonthlyCents: z.number().int().min(0).max(500_000).default(25_000),
  autoDraftEnabled: z.boolean().default(true),
}).strict();

function defaultDearMeTeamExecutionTemplate(role: (typeof DEARME_TEAM_ROLES)[number]) {
  return role === "chief_of_staff"
    ? {
        executionLane: "direct" as const,
        workspaceMode: "local" as const,
        heartbeatCadenceHours: DEARME_DIRECT_HEARTBEAT_CADENCE_HOURS,
      }
    : {
        executionLane: "worker" as const,
        workspaceMode: "remote" as const,
        heartbeatCadenceHours: DEARME_WORKER_HEARTBEAT_CADENCE_HOURS,
      };
}

const dearMeTeamMemberSchema = z.object({
  role: z.enum(DEARME_TEAM_ROLES),
  name: shortTextSchema,
  mission: mediumTextSchema,
  approvalBoundary: mediumTextSchema,
  executionLane: z.enum(DEARME_TEAM_EXECUTION_LANES).optional(),
  workspaceMode: z.enum(DEARME_TEAM_WORKSPACE_MODES).optional(),
  heartbeatCadenceHours: z.number().int().min(1).max(24).optional(),
}).strict().transform((member) => {
  const defaults = defaultDearMeTeamExecutionTemplate(member.role);
  return {
    ...member,
    executionLane: member.executionLane ?? defaults.executionLane,
    workspaceMode: member.workspaceMode ?? defaults.workspaceMode,
    heartbeatCadenceHours: member.heartbeatCadenceHours ?? defaults.heartbeatCadenceHours,
  };
});

const dearMeRiskGateSchema = z.object({
  kind: z.enum(DEARME_RISK_GATES),
  label: shortTextSchema,
  mode: z.literal("approval_required"),
  reason: mediumTextSchema,
}).strict();

const dearMeBlueprintCycleSchema = z.object({
  id: shortTextSchema,
  title: shortTextSchema,
  cadence: z.enum(DEARME_BRAND_CADENCES),
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  deliverables: z.array(shortTextSchema).min(1).max(8),
}).strict();

const dearMeBlueprintAssetSchema = z.object({
  id: shortTextSchema,
  title: shortTextSchema,
  kind: z.enum([
    "brand_os",
    "voice_profile",
    "content_pipeline",
    "opportunity_pipeline",
    "portfolio_draft",
    "weekly_report",
  ]),
  ownerRole: z.enum(DEARME_TEAM_ROLES),
}).strict();

const dearMeMemorySeedSchema = z.object({
  kind: z.enum(["identity", "goal", "audience", "proof", "offer", "voice", "constraint"]),
  label: shortTextSchema,
  value: longTextSchema,
}).strict();

export const dearMeMemoryUpdateSchema = z.object({
  kind: z.enum(DEARME_MEMORY_UPDATE_KINDS),
  sourceInputMode: z.enum(DEARME_MEMORY_SOURCE_INPUT_MODES).default("paste"),
  title: optionalText(160),
  body: longTextSchema,
  sourceLabel: optionalText(1_000),
}).strict().superRefine((input, ctx) => {
  if (input.sourceInputMode !== "link") {
    return;
  }
  if (!input.sourceLabel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceLabel"],
      message: "Add the source link DearMe should remember.",
    });
    return;
  }
  if (!isHttpUrl(input.sourceLabel)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceLabel"],
      message: "Use an http or https source link.",
    });
  }
}).transform((input) => ({
  kind: input.kind,
  sourceInputMode: input.sourceInputMode,
  title: input.title ?? null,
  body: input.body,
  sourceLabel: input.sourceLabel ?? null,
}));

export const dearMeBrandBlueprintSchema = z.object({
  version: z.literal(DEARME_BRAND_BLUEPRINT_VERSION),
  brand: z.object({
    displayName: shortTextSchema,
    positioning: mediumTextSchema,
    goals: z.array(shortTextSchema).min(1).max(8),
    audiences: z.array(shortTextSchema).min(1).max(8),
    proofPoints: z.array(mediumTextSchema).max(16),
    offers: z.array(shortTextSchema).max(8),
    preferredChannels: z.array(z.enum(DEARME_BRAND_CHANNELS)).max(8),
    constraints: z.array(mediumTextSchema).max(10),
  }).strict(),
  voiceProfile: z.object({
    status: z.enum(["needs_samples", "ready_for_gate"]),
    sampleCount: z.number().int().min(0),
    guidance: mediumTextSchema,
  }).strict(),
  contentPillars: z.array(shortTextSchema).min(3).max(6),
  team: z.array(dearMeTeamMemberSchema).min(1).max(10),
  cycles: z.array(dearMeBlueprintCycleSchema).min(1).max(8),
  assets: z.array(dearMeBlueprintAssetSchema).min(1).max(8),
  gates: z.array(dearMeRiskGateSchema).min(1).max(DEARME_RISK_GATES.length),
  memorySeeds: z.array(dearMeMemorySeedSchema).min(1).max(40),
  budgetPolicy: z.object({
    monthlyCents: z.number().int().min(0).max(500_000),
    warnPercent: z.number().int().min(1).max(100),
    hardStopEnabled: z.boolean(),
  }).strict(),
}).strict();

export const dearMeBrandBlueprintPreviewSchema = z.object({
  brand: dearMeBrandBlueprintSeedSchema,
}).strict();

export const dearMeBrandBlueprintApplyRequestSchema = dearMeBrandBlueprintPreviewSchema.extend({
  approvalNote: optionalText(1_000).nullable(),
}).strict();

export const dearMeBrandBlueprintExecutionPlanSchema = z.object({
  operations: z.array(z.object({
    id: z.enum(DEARME_BRAND_BLUEPRINT_OPERATION_ORDER),
    title: shortTextSchema,
    description: mediumTextSchema,
    ownerRole: z.enum(DEARME_TEAM_ROLES),
    approvalGate: z.enum(DEARME_RISK_GATES).nullable(),
  }).strict()).length(DEARME_BRAND_BLUEPRINT_OPERATION_ORDER.length),
  riskGates: z.array(dearMeRiskGateSchema),
  creates: z.object({
    teamMembers: z.number().int().min(0),
    cycles: z.number().int().min(0),
    assets: z.number().int().min(0),
    memorySeeds: z.number().int().min(0),
  }).strict(),
}).strict();

export const dearMeBrandBlueprintApplyPayloadSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  recommendedAction: mediumTextSchema,
  nextActionOnApproval: mediumTextSchema,
  risks: z.array(mediumTextSchema).max(32),
  approvalNote: optionalText(1_000).nullable(),
  autoDraftEnabled: z.boolean().default(true),
  brandBlueprint: dearMeBrandBlueprintSchema,
  executionPlan: dearMeBrandBlueprintExecutionPlanSchema,
}).strict();

export const dearMeBrandBlueprintSummarySchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  recommendedAction: mediumTextSchema,
  nextActionOnApproval: mediumTextSchema,
  teamMemberCount: z.number().int().min(0),
  cycleCount: z.number().int().min(0),
  riskGateCount: z.number().int().min(0),
}).strict();

export const dearMeFirstCyclePreviewSchema = z.object({
  handle: optionalText(120),
  brand: dearMeBrandBlueprintSeedSchema,
}).strict();

const dearMeVoiceGateArtifactSchema = z.object({
  kind: z.enum(DEARME_VOICE_GATE_ARTIFACT_KINDS),
  channel: z.enum(DEARME_BRAND_CHANNELS).nullable().default(null),
  title: optionalText(240),
  text: z.string().trim().min(1).max(8_000),
  proofUsed: optionalText(1_000),
}).strict();

export const dearMeVoiceGateEvaluationSchema = z.object({
  brand: dearMeBrandBlueprintSeedSchema,
  artifact: dearMeVoiceGateArtifactSchema,
}).strict();

const dearMeVoiceGateCheckSchema = z.object({
  kind: z.enum(DEARME_VOICE_GATE_CHECK_KINDS),
  label: shortTextSchema,
  status: z.enum(DEARME_VOICE_GATE_CHECK_STATUSES),
  summary: mediumTextSchema,
  evidence: z.array(shortTextSchema).max(6),
  recommendation: mediumTextSchema,
}).strict();

export const dearMeVoiceGateResultSchema = z.object({
  status: z.enum(DEARME_VOICE_GATE_STATUSES),
  score: z.number().int().min(0).max(100),
  summary: mediumTextSchema,
  approvalGate: z.enum(DEARME_RISK_GATES),
  checks: z.array(dearMeVoiceGateCheckSchema).length(DEARME_VOICE_GATE_CHECK_KINDS.length),
  blockedActions: z.array(shortTextSchema).min(1).max(8),
}).strict();

const dearMeContentDraftPacketEvidenceSchema = z.object({
  label: shortTextSchema,
  summary: mediumTextSchema,
  source: z.enum(["brand_os", "voice_profile", "dear_me_report", "cycle_note", "proof", "user_direction"]).optional(),
}).strict();

const dearMeContentDraftPacketDraftSchema = z.object({
  id: shortTextSchema.optional(),
  title: shortTextSchema,
  channel: z.enum(DEARME_BRAND_CHANNELS),
  audience: mediumTextSchema,
  hook: mediumTextSchema,
  body: longTextSchema,
  proofUsed: mediumTextSchema,
  voiceGate: dearMeVoiceGateResultSchema,
  launchBoundary: shortTextSchema.default("publish social posts"),
}).strict();

export const dearMeContentDraftPacketSchema = z.object({
  packetId: shortTextSchema,
  title: shortTextSchema.optional().default("Content draft packet"),
  summary: mediumTextSchema.nullable().optional(),
  voiceFingerprintId: shortTextSchema.nullable().optional(),
  cycleEvidence: z.array(dearMeContentDraftPacketEvidenceSchema).min(1).max(12),
  drafts: z.array(dearMeContentDraftPacketDraftSchema).min(1).max(12),
  createdByRunId: z.string().uuid().optional().nullable(),
}).strict().transform((value) => ({
  ...value,
  summary: value.summary ?? null,
  voiceFingerprintId: value.voiceFingerprintId ?? null,
  createdByRunId: value.createdByRunId ?? null,
}));

const dearMeFirstCycleVoiceProfileSchema = z.object({
  title: shortTextSchema,
  status: z.enum(["needs_samples", "ready_for_gate"]),
  sampleCount: z.number().int().min(0),
  guidance: mediumTextSchema,
  draftTone: z.array(shortTextSchema).min(3).max(5),
  ownerRole: z.literal("voice_editor"),
  approvalGate: z.literal("sensitive_material"),
}).strict();

const dearMeFirstCycleStarterPostSchema = z.object({
  id: shortTextSchema,
  channel: z.enum(DEARME_BRAND_CHANNELS),
  title: shortTextSchema,
  hook: mediumTextSchema,
  body: mediumTextSchema,
  proofUsed: mediumTextSchema,
  ownerRole: z.literal("content_producer"),
  approvalGate: z.literal("publish_social"),
}).strict();

const dearMeFirstCycleProofSequenceItemSchema = z.object({
  window: z.enum(DEARME_FIRST_CYCLE_PROOF_WINDOWS),
  title: shortTextSchema,
  summary: mediumTextSchema,
  preparedArtifact: shortTextSchema,
  sourceLabel: optionalText(240),
  approvalBoundary: mediumTextSchema,
}).strict();

const dearMeFirstCycleLiveWorkItemSchema = z.object({
  id: shortTextSchema,
  window: shortTextSchema,
  status: z.enum(DEARME_FIRST_CYCLE_LIVE_WORK_STATUSES),
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  action: shortTextSchema,
  artifact: shortTextSchema,
  receipt: mediumTextSchema,
}).strict();

const dearMeFirstCycleOpportunityLeadSchema = z.object({
  title: shortTextSchema,
  target: shortTextSchema,
  whyRelevant: mediumTextSchema,
  relevanceScore: z.number().int().min(1).max(10),
  contactEvidence: dearMeFirstCycleOpportunityContactEvidenceSchema,
  outreachAngle: mediumTextSchema,
  draftMessage: mediumTextSchema,
  ownerRole: z.literal("opportunity_scout"),
  approvalGate: z.literal("send_email"),
}).strict();

const dearMeFirstCycleOpportunityShortlistItemSchema = dearMeFirstCycleOpportunityLeadSchema;

const dearMeFirstCyclePortfolioProofCardSchema = z.object({
  title: shortTextSchema,
  proofSource: mediumTextSchema,
  proposedCopy: mediumTextSchema,
  placement: shortTextSchema,
  ownerRole: z.literal("portfolio_builder"),
  approvalGate: z.literal("deploy_public_site"),
}).strict();

const dearMeFirstCycleSitePreviewSchema = z.object({
  handle: shortTextSchema,
  route: shortTextSchema,
  status: z.literal("private_preview"),
  approvalBoundary: mediumTextSchema,
}).strict();

const dearMeFirstCycleGrowthPlanSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  priorities: z.array(shortTextSchema).min(3).max(5),
  nextActions: z.array(shortTextSchema).min(3).max(6),
  ownerRole: z.literal("chief_of_staff"),
  approvalGate: z.literal("public_claim"),
}).strict();

const dearMeFirstCycleAutonomyStepSchema = z.object({
  id: shortTextSchema,
  title: shortTextSchema,
  phase: z.enum(DEARME_WORKBENCH_CYCLE_STAGES),
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  summary: mediumTextSchema,
}).strict();

const dearMeFirstCycleAutonomyPlanSchema = z.object({
  label: shortTextSchema,
  summary: mediumTextSchema,
  autonomousSteps: z.array(dearMeFirstCycleAutonomyStepSchema).min(4).max(8),
  waitsFor: z.array(z.enum(DEARME_FIRST_CYCLE_CONCERN_GATES)).length(4),
}).strict();

const dearMeFirstCycleContinuationItemSchema = z.object({
  id: shortTextSchema,
  title: shortTextSchema,
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  preparedArtifact: shortTextSchema,
  summary: mediumTextSchema,
  approvalBoundary: mediumTextSchema,
}).strict();

const dearMeFirstCycleContinuationPlanSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  cadence: z.enum(DEARME_BRAND_CADENCES),
  nextReview: shortTextSchema,
  items: z.array(dearMeFirstCycleContinuationItemSchema).length(3),
}).strict();

const dearMeFirstCycleReportItemSchema = z.object({
  id: shortTextSchema,
  label: shortTextSchema,
  status: z.enum(["moved", "ready", "blocked", "next"]),
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  summary: mediumTextSchema,
  source: shortTextSchema,
  nextCall: mediumTextSchema.optional(),
}).strict();

const dearMeFirstCycleReportSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  cadence: z.enum(DEARME_BRAND_CADENCES),
  items: z.array(dearMeFirstCycleReportItemSchema).length(4),
  closingLine: mediumTextSchema,
}).strict();

const dearMeFirstCycleValueReportItemSchema = z.object({
  id: shortTextSchema,
  label: shortTextSchema,
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  metric: shortTextSchema,
  count: z.number().int().nonnegative(),
  unit: shortTextSchema,
  summary: mediumTextSchema,
  source: shortTextSchema,
}).strict();

const dearMeFirstCycleValueReportSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  period: shortTextSchema,
  items: z.array(dearMeFirstCycleValueReportItemSchema).length(4),
  closingLine: mediumTextSchema,
}).strict();

const dearMeFirstCycleOpportunityRoiItemSchema = z.object({
  id: shortTextSchema,
  leadTitle: shortTextSchema,
  target: shortTextSchema,
  priority: z.enum(["launch_first", "verify_contact", "warm_intro"]),
  score: z.number().int().min(0).max(100),
  expectedReturn: mediumTextSchema,
  effort: shortTextSchema,
  confidence: shortTextSchema,
  nextAction: mediumTextSchema,
  source: shortTextSchema,
}).strict();

const dearMeFirstCycleOpportunityRoiReportSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  items: z.array(dearMeFirstCycleOpportunityRoiItemSchema).length(5),
  closingLine: mediumTextSchema,
}).strict();

const dearMeFirstCycleMemorySignalSchema = z.object({
  kind: z.enum(DEARME_MEMORY_SIGNAL_KINDS),
  label: shortTextSchema,
  summary: mediumTextSchema,
  source: shortTextSchema,
  howUsedNext: mediumTextSchema,
}).strict();

const dearMeFirstCycleMemoryPlanSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  savePolicy: z.array(shortTextSchema).length(3),
  rejectedSourceKinds: z.array(z.enum(DEARME_MEMORY_REJECTED_SOURCE_KINDS)).length(
    DEARME_MEMORY_REJECTED_SOURCE_KINDS.length,
  ),
  items: z.array(dearMeFirstCycleMemorySignalSchema).min(4).max(6),
}).strict();

export const dearMeFirstCyclePreviewResponseSchema = z.object({
  companyId: z.string().min(1),
  status: z.literal("first_cycle_preview"),
  prompt: z.literal("What do you want to become known for?"),
  positioning: mediumTextSchema,
  voiceProfile: dearMeFirstCycleVoiceProfileSchema,
  starterPosts: z.array(dearMeFirstCycleStarterPostSchema).length(DEARME_FIRST_CYCLE_STARTER_POST_COUNT),
  proofSequence: z.array(dearMeFirstCycleProofSequenceItemSchema).length(3),
  liveWorkTrail: z.array(dearMeFirstCycleLiveWorkItemSchema).length(5),
  cycleReport: dearMeFirstCycleReportSchema,
  valueReport: dearMeFirstCycleValueReportSchema,
  opportunityRoiReport: dearMeFirstCycleOpportunityRoiReportSchema,
  opportunityLead: dearMeFirstCycleOpportunityLeadSchema,
  opportunityShortlist: z.array(dearMeFirstCycleOpportunityShortlistItemSchema).length(5),
  portfolioProofCard: dearMeFirstCyclePortfolioProofCardSchema,
  sitePreview: dearMeFirstCycleSitePreviewSchema,
  growthPlan: dearMeFirstCycleGrowthPlanSchema,
  autonomyPlan: dearMeFirstCycleAutonomyPlanSchema,
  continuationPlan: dearMeFirstCycleContinuationPlanSchema,
  memoryPlan: dearMeFirstCycleMemoryPlanSchema,
  voiceGate: dearMeVoiceGateResultSchema,
  approvalBoundary: z.object({
    label: shortTextSchema,
    summary: mediumTextSchema,
    blockedActions: z.array(shortTextSchema).min(3).max(8),
  }).strict(),
  warnings: z.array(mediumTextSchema).max(8),
}).strict();

const dearMePaidBetaEntitlementSchema = z.object({
  state: z.enum(DEARME_PAID_BETA_ENTITLEMENT_STATES),
  label: shortTextSchema,
  summary: mediumTextSchema,
  canPreviewBrandOs: z.boolean(),
  canRequestBrandOsApproval: z.boolean(),
  canStartPrivateWork: z.boolean(),
  nextActionLabel: shortTextSchema,
  nextActionDescription: mediumTextSchema,
}).strict();

const dearMeHostedCheckoutStatusSchema = z.object({
  configured: z.boolean(),
  paymentLinkConfigured: z.boolean(),
  receiptSyncConfigured: z.boolean(),
  paymentUrl: z.string().url().nullable(),
  providerLabel: shortTextSchema,
  label: shortTextSchema,
  summary: mediumTextSchema,
  nextActionLabel: shortTextSchema,
  nextActionDescription: mediumTextSchema,
}).strict();

export const dearMeCycleGuardrailSchema = z.object({
  state: z.enum(DEARME_CYCLE_GUARDRAIL_STATES),
  label: shortTextSchema,
  headline: shortTextSchema,
  summary: mediumTextSchema,
  spendCents: z.number().int().nonnegative(),
  budgetCents: z.number().int().nonnegative(),
  utilizationPercent: z.number().nonnegative(),
  remainingCreditCents: z.number().int().nonnegative(),
  decisionRequired: z.boolean(),
  decisionLabel: shortTextSchema.nullable(),
}).strict();

export const dearMePaidBetaStatusSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["trial", "active"]),
  lifetimePaidCents: z.number().int().nonnegative(),
  refundedCents: z.number().int().nonnegative(),
  netPaidCents: z.number().int().nonnegative(),
  remainingCreditCents: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative(),
  latestPaymentAt: z.string().datetime().nullable(),
  latestPaymentDescription: z.string().nullable(),
  latestExternalInvoiceId: z.string().nullable(),
  entitlement: dearMePaidBetaEntitlementSchema,
  cycleGuardrail: dearMeCycleGuardrailSchema,
  hostedCheckout: dearMeHostedCheckoutStatusSchema.optional(),
}).strict();

export const dearMePaidBetaCohortRequestSchema = z.object({
  companyIds: z.array(z.string().trim().min(1)).min(1).max(50),
}).strict().transform((value) => ({
  companyIds: Array.from(new Set(value.companyIds)),
}));

export const dearMePaidBetaCohortAttentionSchema = z.object({
  companyId: z.string().min(1),
  state: z.enum(DEARME_CYCLE_GUARDRAIL_STATES),
  status: z.enum(["trial", "active"]),
  label: shortTextSchema,
  nextAction: mediumTextSchema,
}).strict();

export const dearMePaidBetaCohortSummarySchema = z.object({
  accountCount: z.number().int().nonnegative(),
  activeAccountCount: z.number().int().nonnegative(),
  trialAccountCount: z.number().int().nonnegative(),
  readyAccountCount: z.number().int().nonnegative(),
  warningAccountCount: z.number().int().nonnegative(),
  hardStopAccountCount: z.number().int().nonnegative(),
  decisionRequiredAccountCount: z.number().int().nonnegative(),
  lifetimePaidCents: z.number().int().nonnegative(),
  refundedCents: z.number().int().nonnegative(),
  netPaidCents: z.number().int().nonnegative(),
  remainingCreditCents: z.number().int().nonnegative(),
  cycleSpendCents: z.number().int().nonnegative(),
  cycleBudgetCents: z.number().int().nonnegative(),
  state: z.enum(["empty", "operable", "watch", "attention"]),
  label: shortTextSchema,
  summary: mediumTextSchema,
  nextAction: mediumTextSchema,
  attentionAccounts: z.array(dearMePaidBetaCohortAttentionSchema).max(50),
}).strict();

export const dearMePaidBetaRecordSchema = z.object({
  amountCents: z.number().int().min(DEARME_PAID_BETA_MIN_PAYMENT_CENTS).max(100_000_000),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("USD"),
  description: optionalText(500).nullable().optional(),
  externalInvoiceId: optionalText(200).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
}).strict().transform((value) => ({
  ...value,
  currency: value.currency.toUpperCase(),
  description: value.description ?? null,
  externalInvoiceId: value.externalInvoiceId ?? null,
}));

export const dearMeChiefOfStaffMessageSchema = z.object({
  intent: z.enum(DEARME_CHIEF_OF_STAFF_MESSAGE_INTENTS).default("plan_next"),
  message: longTextSchema,
}).strict();

export const dearMeChiefOfStaffMessageResultSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["queued", "recorded"]),
  issueId: z.string().min(1),
  issueIdentifier: z.string().nullable(),
  title: shortTextSchema,
  nextStep: mediumTextSchema,
}).strict();

const dearMeApprovalResolverConfigSchema = z.object({
  minVoiceGateScore: z.number().int().min(0).max(100).default(92),
  dailyUsdCap: z.number().min(0).max(100_000).default(5),
}).strict();

export const dearMeApprovalResolveRequestSchema = z.object({
  issueId: z.string().trim().min(1).max(120),
  toolName: z.string().trim().min(1).max(160),
  channel: z.string().trim().min(1).max(80),
  gate: z.enum(DEARME_APPROVAL_GATES),
  estimatedUsd: z.number().min(0).max(1_000_000).default(0),
  voiceGateScore: z.number().min(0).max(100).nullable().default(null),
  reason: optionalText(1_000),
  config: dearMeApprovalResolverConfigSchema.default({
    minVoiceGateScore: 92,
    dailyUsdCap: 5,
  }),
}).strict().transform((value) => ({
  ...value,
  reason: value.reason ?? "approval_requested",
}));

export const dearMeApprovalResolveResultSchema = z.object({
  companyId: z.string().min(1),
  issueId: z.string().min(1),
  issueIdentifier: z.string().nullable(),
  approvalId: z.string().min(1),
  decision: z.enum(DEARME_APPROVAL_DECISIONS),
  reason: z.string().min(1),
}).strict();

export const dearMeOutputDocumentSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  title: z.string().nullable(),
  format: z.string().min(1),
  revisionNumber: z.number().int().min(1),
  bodyPreview: z.string(),
  updatedAt: z.string().datetime(),
}).strict();

export const dearMeOutputStatusSchema = z.enum(DEARME_OUTPUT_STATUSES);

export const dearMeOutputWorkProductSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().nullable(),
  status: z.string().min(1),
  reviewState: z.string().min(1),
  summary: z.string().nullable(),
  voiceGate: dearMeVoiceGateResultSchema.nullable().optional(),
  updatedAt: z.string().datetime(),
}).strict();

export const dearMeOutputUpdateSchema = z.object({
  id: z.string().min(1),
  bodyPreview: z.string(),
  createdAt: z.string().datetime(),
}).strict();

const dearMeOutputReviewHandoffSchema = z.object({
  action: z.enum(DEARME_OUTPUT_REVIEW_ACTIONS),
  title: shortTextSchema,
  summary: mediumTextSchema,
  userDirection: mediumTextSchema.nullable(),
  nextDraftDirection: mediumTextSchema,
}).strict();

export const dearMeOutputFeedbackTraceSchema = z.object({
  headline: shortTextSchema,
  summary: mediumTextSchema,
  userFeedback: mediumTextSchema.nullable(),
  changes: z.array(mediumTextSchema).min(1).max(4),
  receipts: z.array(mediumTextSchema).max(4).optional(),
}).strict();

export const dearMeOutputReviewLoopSchema = z.object({
  state: z.enum(DEARME_OUTPUT_REVIEW_LOOP_STATES),
  attemptCount: z.number().int().min(0).max(99),
  maxAttempts: z.number().int().min(1).max(10),
  isRetriable: z.boolean(),
  lastAction: z.enum(DEARME_OUTPUT_REVIEW_ACTIONS).nullable(),
  lastDecisionAt: z.string().datetime().nullable(),
  lastDecisionNotePreview: mediumTextSchema.nullable(),
  defaultApprovalScore: z.literal(DEARME_SILENCE_DEFAULT_REVIEW_SCORE).nullable().optional(),
  defaultedBySilence: z.boolean().optional(),
  nextStep: mediumTextSchema,
  reviewHandoff: dearMeOutputReviewHandoffSchema.nullable(),
  feedbackTrace: dearMeOutputFeedbackTraceSchema.nullable().default(null),
}).strict();

export const dearMeOutputDetailSchema = z.object({
  kind: z.enum(DEARME_OUTPUT_DETAIL_KINDS),
  label: shortTextSchema,
  value: z.string().trim().min(1).max(1_500),
  source: z.enum(["document", "prepared_work", "progress", "derived"]),
}).strict();

export const dearMeOutputSourceEvidenceSchema = z.object({
  kind: z.enum(DEARME_OUTPUT_SOURCE_EVIDENCE_KINDS),
  label: shortTextSchema,
  summary: mediumTextSchema,
  source: z.enum(["document", "prepared_work", "progress", "derived"]),
}).strict();

export const dearMeOutputItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  kind: z.enum(DEARME_OUTPUT_KINDS),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: dearMeOutputStatusSchema,
  isReviewable: z.boolean(),
  issueId: z.string().min(1),
  issueIdentifier: z.string().nullable(),
  issueTitle: z.string().min(1),
  updatedAt: z.string().datetime(),
  documents: z.array(dearMeOutputDocumentSchema),
  workProducts: z.array(dearMeOutputWorkProductSchema),
  latestUpdate: dearMeOutputUpdateSchema.nullable(),
  reviewLoop: dearMeOutputReviewLoopSchema,
  details: z.array(dearMeOutputDetailSchema).max(12),
  sourceEvidence: z.array(dearMeOutputSourceEvidenceSchema).max(6),
}).strict();

export const dearMeOutputsResponseSchema = z.object({
  companyId: z.string().min(1),
  outputs: z.array(dearMeOutputItemSchema),
}).strict();

const dearMeOutputReviewSilenceDefaultSchema = z.object({
  score: z.literal(DEARME_SILENCE_DEFAULT_REVIEW_SCORE).optional(),
  reason: optionalText(500).nullable().optional(),
}).strict().transform((value) => ({
  score: value.score ?? DEARME_SILENCE_DEFAULT_REVIEW_SCORE,
  reason: value.reason ?? null,
}));

export const dearMeOutputReviewRequestSchema = z.object({
  action: z.enum(DEARME_OUTPUT_REVIEW_ACTIONS),
  decisionNote: optionalText(1_000).nullable().optional(),
  silenceDefault: dearMeOutputReviewSilenceDefaultSchema.nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.silenceDefault && value.action !== "approve") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["silenceDefault"],
      message: "Silence defaults can only launch a reviewed output.",
    });
  }
}).transform((value) => ({
  ...value,
  decisionNote: value.decisionNote ?? null,
}));

export const dearMeOutputContinuationRequestSchema = z.object({
  intent: z.enum(DEARME_OUTPUT_CONTINUATION_INTENTS),
  decisionNote: optionalText(1_000).nullable().optional(),
}).strict().transform((value) => ({
  ...value,
  decisionNote: value.decisionNote ?? null,
}));

export const dearMeOutputReviewResultSchema = z.object({
  companyId: z.string().min(1),
  outputId: z.string().min(1),
  action: z.enum(DEARME_OUTPUT_REVIEW_ACTIONS),
  status: z.enum(DEARME_OUTPUT_REVIEW_RESULT_STATUSES),
  comment: dearMeOutputUpdateSchema,
  output: dearMeOutputItemSchema,
}).strict();

export const dearMeWorkbenchTeamMemberSchema = z.object({
  role: z.enum(DEARME_TEAM_ROLES),
  name: shortTextSchema,
  status: shortTextSchema,
  currentFocus: mediumTextSchema,
  lastActiveAt: z.string().datetime().nullable(),
}).strict();

export const dearMeWorkbenchWorkItemSchema = z.object({
  id: z.string().min(1),
  title: shortTextSchema,
  summary: mediumTextSchema,
  status: dearMeOutputStatusSchema,
  ownerRole: z.enum(DEARME_TEAM_ROLES),
  outputKind: z.enum(DEARME_OUTPUT_KINDS).nullable(),
  issueId: z.string().min(1).nullable(),
  issueIdentifier: z.string().nullable(),
  updatedAt: z.string().datetime(),
  reviewLoop: dearMeOutputReviewLoopSchema,
}).strict();

export const dearMeWorkbenchDecisionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_WORKBENCH_DECISION_KINDS),
  title: shortTextSchema,
  summary: mediumTextSchema,
  riskGate: z.enum(DEARME_RISK_GATES).nullable(),
  status: z.enum(["needed", "pending"]),
  outputKind: z.enum(DEARME_OUTPUT_KINDS).nullable(),
  outputId: z.string().min(1).nullable(),
  approvalId: z.string().min(1).nullable(),
  issueId: z.string().min(1).nullable(),
  issueIdentifier: z.string().nullable(),
  updatedAt: z.string().datetime(),
  reviewLoop: dearMeOutputReviewLoopSchema.nullable(),
}).strict();

export const dearMeWorkbenchBatchDecisionSchema = z.object({
  id: z.string().min(1),
  title: shortTextSchema,
  summary: mediumTextSchema,
  actionLabel: shortTextSchema,
  action: z.enum(DEARME_WORKBENCH_BATCH_ACTIONS),
  riskGate: z.enum(DEARME_RISK_GATES).nullable(),
  itemCount: z.number().int().min(1).max(25),
  decisionIds: z.array(z.string().min(1)).min(1).max(25),
  issueIds: z.array(z.string().min(1)).max(25),
  approvalIds: z.array(z.string().min(1)).max(25),
  updatedAt: z.string().datetime(),
}).strict();

export const dearMeWorkbenchProgressItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_WORKBENCH_PROGRESS_KINDS),
  title: shortTextSchema,
  summary: mediumTextSchema,
  outputKind: z.enum(DEARME_OUTPUT_KINDS).nullable().optional(),
  outputId: z.string().min(1).nullable().optional(),
  riskGate: z.enum(DEARME_RISK_GATES).nullable().optional(),
  approvalId: z.string().min(1).nullable().optional(),
  issueId: z.string().min(1).nullable().optional(),
  issueIdentifier: z.string().nullable().optional(),
  executionReadiness: z.enum(DEARME_WORKBENCH_EXECUTION_READINESS).nullable().optional(),
  deliveryStatus: z.enum(DEARME_NEXT_MOVE_DELIVERY_STATUSES).nullable().optional(),
  deliveryExternalId: z.string().min(1).nullable().optional(),
  deliveryExternalUrl: z.string().url().nullable().optional(),
  nextStep: mediumTextSchema.nullable().optional(),
  createdAt: z.string().datetime(),
}).strict();

export const dearMeWorkbenchStreamItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_WORKBENCH_STREAM_KINDS),
  cycleStage: z.enum(DEARME_WORKBENCH_CYCLE_STAGES),
  action: z.enum(DEARME_WORK_EVENT_ACTIONS),
  role: z.enum(DEARME_TEAM_ROLES),
  title: shortTextSchema,
  summary: mediumTextSchema,
  customerSummary: mediumTextSchema,
  artifact: shortTextSchema,
  artifactTarget: shortTextSchema,
  status: z.enum(DEARME_WORKBENCH_STREAM_STATUSES),
  needsApproval: z.boolean(),
  decisionNeed: z.object({
    needed: z.boolean(),
    label: shortTextSchema.nullable(),
    reason: mediumTextSchema.nullable(),
    riskGate: z.enum(DEARME_RISK_GATES).nullable(),
  }).strict(),
  sourceLabel: shortTextSchema,
  costImpact: shortTextSchema.nullable(),
  nextAction: mediumTextSchema,
  relatedOutputId: z.string().min(1).nullable(),
  issueId: z.string().min(1).nullable(),
  issueIdentifier: z.string().nullable(),
  approvalId: z.string().min(1).nullable(),
  traceRefs: z.array(z.object({
    kind: z.enum(DEARME_WORK_EVENT_TRACE_KINDS),
    id: z.string().min(1),
    identifier: z.string().min(1).nullable(),
  }).strict()).max(8),
  createdAt: z.string().datetime(),
  reviewLoop: dearMeOutputReviewLoopSchema.nullable(),
}).strict();

export const dearMeWorkbenchRunLedgerEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_WORKBENCH_RUN_LEDGER_KINDS),
  role: z.enum(DEARME_TEAM_ROLES),
  title: shortTextSchema,
  summary: mediumTextSchema,
  evidenceLabel: shortTextSchema,
  status: z.enum(DEARME_WORKBENCH_STREAM_STATUSES),
  needsApproval: z.boolean(),
  nextAction: mediumTextSchema,
  relatedOutputId: z.string().min(1).nullable(),
  issueId: z.string().min(1).nullable(),
  issueIdentifier: z.string().nullable(),
  approvalId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
}).strict();

export const dearMeMemoryUpdateItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_MEMORY_UPDATE_KINDS),
  sourceInputMode: z.enum(DEARME_MEMORY_SOURCE_INPUT_MODES).default("paste"),
  title: shortTextSchema.nullable(),
  body: longTextSchema,
  bodyPreview: mediumTextSchema,
  sourceLabel: mediumTextSchema.nullable(),
  createdAt: z.string().datetime(),
}).strict();

const dearMeMemorySourceReviewItemSchema = z.object({
  id: z.string().min(1),
  sourceMemoryId: z.string().min(1),
  sourceInputMode: z.enum(["link", "import_note"]),
  sourceTitle: shortTextSchema,
  sourceLabel: mediumTextSchema.nullable(),
  summary: mediumTextSchema,
  proposedKind: z.enum(DEARME_MEMORY_UPDATE_KINDS),
  proposedTitle: shortTextSchema,
  proposedBody: longTextSchema,
  nextAction: mediumTextSchema,
  createdAt: z.string().datetime(),
}).strict();

const dearMeMemoryGrowthCyclesSchema = z.object({
  checked: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  memorySources: z.number().int().nonnegative(),
}).strict();

export const dearMeMemoryUpdateResultSchema = z.object({
  companyId: z.string().min(1),
  status: z.literal("recorded"),
  memory: dearMeMemoryUpdateItemSchema,
  growthCycles: dearMeMemoryGrowthCyclesSchema,
}).strict();

export const dearMeMemoryArchiveResultSchema = z.object({
  companyId: z.string().min(1),
  status: z.literal("archived"),
  memoryId: z.string().min(1),
  archivedAt: z.string().datetime(),
  growthCycles: dearMeMemoryGrowthCyclesSchema,
}).strict();

const dearMeWorkbenchVoiceProfileSchema = z.object({
  title: shortTextSchema,
  status: z.enum(["needs_samples", "learning", "ready_for_review"]),
  sampleCount: z.number().int().nonnegative(),
  confidence: z.number().int().min(0).max(100),
  guidance: mediumTextSchema,
  draftTone: z.array(shortTextSchema).min(2).max(6),
  nextStep: mediumTextSchema,
}).strict();

const dearMeWorkbenchMemorySourcePlanSchema = z.object({
  status: z.enum(["needs_sources", "building", "ready_for_review"]),
  summary: mediumTextSchema,
  nextSourceKind: z.enum(DEARME_MEMORY_UPDATE_KINDS).nullable(),
  required: z.array(z.object({
    kind: z.enum(DEARME_MEMORY_UPDATE_KINDS),
    label: shortTextSchema,
    status: z.enum(["missing", "partial", "ready"]),
    count: z.number().int().nonnegative(),
    target: z.number().int().min(1).max(5),
    nextAction: mediumTextSchema,
  }).strict()).min(1).max(8),
}).strict();

export const dearMeWorkbenchMemorySchema = z.object({
  summary: mediumTextSchema,
  sourceCount: z.number().int().nonnegative(),
  voiceSampleCount: z.number().int().nonnegative(),
  proofCount: z.number().int().nonnegative(),
  voiceProfile: dearMeWorkbenchVoiceProfileSchema,
  sourcePlan: dearMeWorkbenchMemorySourcePlanSchema,
  sourceReviewQueue: z.array(dearMeMemorySourceReviewItemSchema).max(6).default([]),
  latest: z.array(dearMeMemoryUpdateItemSchema).max(12),
  archived: z.array(dearMeMemoryUpdateItemSchema).max(6).default([]),
}).strict();

export const dearMeWorkbenchReportSchema = z.object({
  title: shortTextSchema,
  summary: mediumTextSchema,
  status: dearMeOutputStatusSchema,
  outputId: z.string().min(1),
  issueId: z.string().min(1),
  issueIdentifier: z.string().nullable(),
  bodyPreview: z.string(),
  accomplished: z.array(mediumTextSchema).max(6),
  decisions: z.array(mediumTextSchema).max(6),
  learnings: z.array(mediumTextSchema).max(6),
  nextBets: z.array(mediumTextSchema).max(6),
  updatedAt: z.string().datetime(),
}).strict();

export const dearMeActionGraphNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_ACTION_GRAPH_NODE_KINDS),
  label: shortTextSchema,
  summary: mediumTextSchema,
  role: z.enum(DEARME_TEAM_ROLES).nullable(),
  status: shortTextSchema.nullable(),
  source: z.enum(["cycle", "team", "work", "artifact", "decision", "memory", "report", "guardrail"]),
  relatedOutputId: z.string().min(1).nullable(),
  issueId: z.string().min(1).nullable(),
  approvalId: z.string().min(1).nullable(),
  updatedAt: z.string().datetime(),
}).strict();

export const dearMeActionGraphEdgeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(DEARME_ACTION_GRAPH_EDGE_KINDS),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  label: shortTextSchema,
}).strict();

export const dearMeActionGraphSchema = z.object({
  summary: mediumTextSchema,
  cycleNodeId: z.string().min(1),
  nodes: z.array(dearMeActionGraphNodeSchema).max(80),
  edges: z.array(dearMeActionGraphEdgeSchema).max(160),
}).strict();

export const dearMeWorkbenchResponseSchema = z.object({
  companyId: z.string().min(1),
  headline: shortTextSchema,
  summary: mediumTextSchema,
  team: z.array(dearMeWorkbenchTeamMemberSchema),
  activeWork: z.array(dearMeWorkbenchWorkItemSchema),
  workReady: z.array(dearMeWorkbenchWorkItemSchema),
  decisionsNeeded: z.array(dearMeWorkbenchDecisionSchema),
  batchDecisions: z.array(dearMeWorkbenchBatchDecisionSchema).max(8),
  recentProgress: z.array(dearMeWorkbenchProgressItemSchema),
  workStream: z.array(dearMeWorkbenchStreamItemSchema).max(20),
  runLedger: z.array(dearMeWorkbenchRunLedgerEntrySchema).max(12),
  memory: dearMeWorkbenchMemorySchema,
  report: dearMeWorkbenchReportSchema.nullable(),
  actionGraph: dearMeActionGraphSchema,
  outputs: z.array(dearMeOutputItemSchema),
}).strict();

export type DearMeBrandBlueprintSeed = z.infer<typeof dearMeBrandBlueprintSeedSchema>;
export type DearMeBrandBlueprintPreview = z.infer<typeof dearMeBrandBlueprintPreviewSchema>;
export type DearMeBrandBlueprintApplyRequest = z.infer<typeof dearMeBrandBlueprintApplyRequestSchema>;
export type DearMeBrandBlueprintApplyPayload = z.infer<typeof dearMeBrandBlueprintApplyPayloadSchema>;
export type DearMeBrandBlueprint = z.infer<typeof dearMeBrandBlueprintSchema>;
export type DearMeBrandBlueprintExecutionPlan = z.infer<typeof dearMeBrandBlueprintExecutionPlanSchema>;
export type DearMeBrandBlueprintSummary = z.infer<typeof dearMeBrandBlueprintSummarySchema>;
export type DearMeFirstCyclePreview = z.infer<typeof dearMeFirstCyclePreviewSchema>;
export type DearMeFirstCyclePreviewResponse = z.infer<typeof dearMeFirstCyclePreviewResponseSchema>;
export type DearMeVoiceGateEvaluation = z.infer<typeof dearMeVoiceGateEvaluationSchema>;
export type DearMeVoiceGateResult = z.infer<typeof dearMeVoiceGateResultSchema>;
export type DearMeContentDraftPacket = z.infer<typeof dearMeContentDraftPacketSchema>;
export type DearMeContentDraftPacketInput = z.input<typeof dearMeContentDraftPacketSchema>;
export type DearMeChiefOfStaffMessage = z.infer<typeof dearMeChiefOfStaffMessageSchema>;
export type DearMeChiefOfStaffMessageIntent = z.infer<typeof dearMeChiefOfStaffMessageSchema>["intent"];
export type DearMeChiefOfStaffMessageResult = z.infer<typeof dearMeChiefOfStaffMessageResultSchema>;
export type DearMeApprovalResolveRequest = z.infer<typeof dearMeApprovalResolveRequestSchema>;
export type DearMeApprovalResolveResult = z.infer<typeof dearMeApprovalResolveResultSchema>;
export type DearMeMemoryUpdate = z.infer<typeof dearMeMemoryUpdateSchema>;
export type DearMeMemoryUpdateItem = z.infer<typeof dearMeMemoryUpdateItemSchema>;
export type DearMeMemoryUpdateKind = z.infer<typeof dearMeMemoryUpdateSchema>["kind"];
export type DearMeMemorySourceInputMode = z.infer<typeof dearMeMemoryUpdateSchema>["sourceInputMode"];
export type DearMeMemoryUpdateResult = z.infer<typeof dearMeMemoryUpdateResultSchema>;
export type DearMeMemoryArchiveResult = z.infer<typeof dearMeMemoryArchiveResultSchema>;
export type DearMeOutputDetail = z.infer<typeof dearMeOutputDetailSchema>;
export type DearMeOutputDocument = z.infer<typeof dearMeOutputDocumentSchema>;
export type DearMeOutputFeedbackTrace = z.infer<typeof dearMeOutputFeedbackTraceSchema>;
export type DearMeOutputItem = z.infer<typeof dearMeOutputItemSchema>;
export type DearMeOutputSourceEvidence = z.infer<typeof dearMeOutputSourceEvidenceSchema>;
export type DearMeOutputKind = z.infer<typeof dearMeOutputItemSchema>["kind"];
export type DearMeOutputContinuationIntent = z.infer<typeof dearMeOutputContinuationRequestSchema>["intent"];
export type DearMeOutputContinuationRequest = z.infer<typeof dearMeOutputContinuationRequestSchema>;
export type DearMeOutputReviewAction = z.infer<typeof dearMeOutputReviewRequestSchema>["action"];
export type DearMeOutputReviewLoop = z.infer<typeof dearMeOutputReviewLoopSchema>;
export type DearMeOutputReviewRequest = z.infer<typeof dearMeOutputReviewRequestSchema>;
export type DearMeOutputReviewResult = z.infer<typeof dearMeOutputReviewResultSchema>;
export type DearMeOutputStatus = z.infer<typeof dearMeOutputItemSchema>["status"];
export type DearMeOutputUpdate = z.infer<typeof dearMeOutputUpdateSchema>;
export type DearMeOutputWorkProduct = z.infer<typeof dearMeOutputWorkProductSchema>;
export type DearMeOutputsResponse = z.infer<typeof dearMeOutputsResponseSchema>;
export type DearMeCycleGuardrail = z.infer<typeof dearMeCycleGuardrailSchema>;
export type DearMePaidBetaEntitlement = z.infer<typeof dearMePaidBetaEntitlementSchema>;
export type DearMePaidBetaCohortAttention = z.infer<typeof dearMePaidBetaCohortAttentionSchema>;
export type DearMePaidBetaCohortRequest = z.infer<typeof dearMePaidBetaCohortRequestSchema>;
export type DearMePaidBetaCohortSummary = z.infer<typeof dearMePaidBetaCohortSummarySchema>;
export type DearMePaidBetaRecord = z.infer<typeof dearMePaidBetaRecordSchema>;
export type DearMePaidBetaStatus = z.infer<typeof dearMePaidBetaStatusSchema>;
export type DearMeActionGraph = z.infer<typeof dearMeActionGraphSchema>;
export type DearMeActionGraphEdge = z.infer<typeof dearMeActionGraphEdgeSchema>;
export type DearMeActionGraphNode = z.infer<typeof dearMeActionGraphNodeSchema>;
export type DearMeWorkbenchBatchDecision = z.infer<typeof dearMeWorkbenchBatchDecisionSchema>;
export type DearMeWorkbenchDecision = z.infer<typeof dearMeWorkbenchDecisionSchema>;
export type DearMeWorkbenchProgressItem = z.infer<typeof dearMeWorkbenchProgressItemSchema>;
export type DearMeWorkbenchReport = z.infer<typeof dearMeWorkbenchReportSchema>;
export type DearMeWorkbenchMemory = z.infer<typeof dearMeWorkbenchMemorySchema>;
export type DearMeWorkbenchRunLedgerEntry = z.infer<typeof dearMeWorkbenchRunLedgerEntrySchema>;
export type DearMeWorkbenchVoiceProfile = z.infer<typeof dearMeWorkbenchVoiceProfileSchema>;
export type DearMeWorkbenchResponse = z.infer<typeof dearMeWorkbenchResponseSchema>;
export type DearMeWorkbenchStreamItem = z.infer<typeof dearMeWorkbenchStreamItemSchema>;
export type DearMeWorkbenchTeamMember = z.infer<typeof dearMeWorkbenchTeamMemberSchema>;
export type DearMeWorkbenchWorkItem = z.infer<typeof dearMeWorkbenchWorkItemSchema>;
export type DearMeHostedCheckoutStatus = z.infer<typeof dearMeHostedCheckoutStatusSchema>;

export function describeDearMePaidBetaEntitlement(
  status: DearMePaidBetaStatus["status"],
): DearMePaidBetaEntitlement {
  if (status === "active") {
    return dearMePaidBetaEntitlementSchema.parse({
      state: "paid_beta_active",
      label: "Paid beta active",
    summary: "Paid beta is active. DearMe can start the brand team cycle and prepare launch-ready work.",
      canPreviewBrandOs: true,
      canRequestBrandOsApproval: true,
      canStartPrivateWork: true,
      nextActionLabel: "Start brand team",
      nextActionDescription: "Start the brand team to create the growth team, cycles, and first launch-ready outputs.",
    });
  }

  return dearMePaidBetaEntitlementSchema.parse({
    state: "trial_preview",
    label: "Trial preview",
    summary: "Preview the brand team for free. Record paid beta access before starting DearMe brand work.",
    canPreviewBrandOs: true,
    canRequestBrandOsApproval: false,
    canStartPrivateWork: false,
    nextActionLabel: "Record paid beta payment",
    nextActionDescription: "Add a paid beta credit purchase to unlock the brand team cycle.",
  });
}

const defaultGoals = [
  "Build a clear public point of view",
  "Turn proof of work into consistent content",
  "Create useful opportunities from existing relationships",
];

const defaultAudiences = [
  "People who should understand the work",
  "Potential collaborators, customers, or supporters",
];

const defaultContentPillars = [
  "Point of view",
  "Proof from real work",
  "Useful lessons",
  "Offers and opportunities",
];

const teamTemplate: DearMeBrandBlueprint["team"] = [
  {
    role: "chief_of_staff",
    name: "Chief of Staff",
    mission: "Turn goals into weekly plans, live progress, and launch decisions.",
    approvalBoundary: "Can plan and draft automatically; external actions run inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("chief_of_staff"),
  },
  {
    role: "brand_strategist",
    name: "Brand Strategist",
    mission: "Shape positioning, audiences, proof points, and weekly growth themes.",
    approvalBoundary: "Can recommend strategy changes; public claims run inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("brand_strategist"),
  },
  {
    role: "voice_editor",
    name: "Voice Editor",
    mission: "Learn the user's voice and keep drafts consistent with the voice profile.",
    approvalBoundary: "Can edit drafts; publishing or sending runs inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("voice_editor"),
  },
  {
    role: "content_producer",
    name: "Content Producer",
    mission: "Create content drafts from proof, ideas, and weekly priorities.",
    approvalBoundary: "Can draft and prepare content; public posting runs inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("content_producer"),
  },
  {
    role: "opportunity_scout",
    name: "Opportunity Scout",
    mission: "Find relevant opportunities and prepare outreach drafts.",
    approvalBoundary: "Can research and draft outreach; sending messages run inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("opportunity_scout"),
  },
  {
    role: "portfolio_builder",
    name: "Portfolio Builder",
    mission: "Turn proof into portfolio, case study, and site updates.",
    approvalBoundary: "Can draft site changes; public page changes run inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("portfolio_builder"),
  },
  {
    role: "growth_analyst",
    name: "Growth Analyst",
    mission: "Summarize progress, gaps, and next week's growth bets.",
    approvalBoundary: "Can analyze and report; spend and channel changes run inside launch boundaries.",
    ...defaultDearMeTeamExecutionTemplate("growth_analyst"),
  },
];

const riskGateTemplate: DearMeBrandBlueprint["gates"] = [
  {
    kind: "publish_social",
    label: "Publish social post",
    mode: "approval_required",
    reason: "Public posts carry personal reputation risk.",
  },
  {
    kind: "send_email",
    label: "Send email or direct message",
    mode: "approval_required",
    reason: "Outbound messages affect relationships and cannot be silently sent.",
  },
  {
    kind: "deploy_public_site",
    label: "Deploy public site update",
    mode: "approval_required",
    reason: "Public portfolio changes should be reviewed before going live.",
  },
  {
    kind: "spend_money",
    label: "Spend money",
    mode: "approval_required",
    reason: "Paid actions stay inside the selected launch boundary.",
  },
  {
    kind: "public_claim",
    label: "Make public claim",
    mode: "approval_required",
    reason: "Claims about results, credentials, and customers must be verified.",
  },
  {
    kind: "sensitive_material",
    label: "Use sensitive material",
    mode: "approval_required",
    reason: "Personal or relationship-sensitive material stays behind a launch call.",
  },
  {
    kind: "connect_channel",
    label: "Change channel connection",
    mode: "approval_required",
    reason: "External channel access should never change silently.",
  },
  {
    kind: "destructive_change",
    label: "Delete or replace existing work",
    mode: "approval_required",
    reason: "Destructive changes need explicit confirmation.",
  },
];

function buildContentPillars(seed: DearMeBrandBlueprintSeed) {
  return uniqueStrings([
    ...(seed.goals.length > 0 ? seed.goals.slice(0, 2) : []),
    ...(seed.offers.length > 0 ? ["Offers and opportunities"] : []),
    ...(seed.proofPoints.length > 0 ? ["Proof from real work"] : []),
    ...defaultContentPillars,
  ]).slice(0, 6);
}

function buildMemorySeeds(seed: DearMeBrandBlueprintSeed, displayName: string, positioning: string) {
  return [
    { kind: "identity" as const, label: "Display name", value: displayName },
    { kind: "identity" as const, label: "Positioning", value: positioning },
    ...seed.goals.map((value) => ({ kind: "goal" as const, label: "Goal", value })),
    ...seed.audiences.map((value) => ({ kind: "audience" as const, label: "Audience", value })),
    ...seed.proofPoints.map((value) => ({ kind: "proof" as const, label: "Proof point", value })),
    ...seed.offers.map((value) => ({ kind: "offer" as const, label: "Offer", value })),
    ...seed.voiceSamples.map((value) => ({ kind: "voice" as const, label: "Voice sample", value })),
    ...seed.constraints.map((value) => ({ kind: "constraint" as const, label: "Constraint", value })),
  ].slice(0, 40);
}

type DearMeFirstCyclePostChannel = DearMeBrandBlueprintSeed["preferredChannels"][number];

const firstCyclePostChannelFallbacks = ["linkedin", "x", "newsletter", "blog", "community"] as const;
const firstCycleSocialChannels = new Set<DearMeBrandBlueprintSeed["preferredChannels"][number]>([
  "linkedin",
  "x",
  "newsletter",
  "blog",
  "community",
]);
const voiceGateForbiddenPhrases = [
  "as an ai",
  "i cannot",
  "unlock your potential",
  "leverage synergies",
  "seamless",
  "revolutionary",
] as const;
const voiceGateGenericPhrases = [
  "excited to announce",
  "thrilled to share",
  "game changer",
  "game-changing",
  "new era",
  "revolutionize",
  "transform your",
  "one-stop shop",
  "all-in-one",
] as const;
const voiceGateChannelLengthLimits: Partial<
  Record<DearMeBrandBlueprintSeed["preferredChannels"][number], { warn: number; block: number }>
> = {
  x: { warn: 240, block: 280 },
  linkedin: { warn: 1_800, block: 3_000 },
  newsletter: { warn: 3_500, block: 6_000 },
  blog: { warn: 5_000, block: 8_000 },
  portfolio: { warn: 700, block: 1_200 },
  email: { warn: 1_200, block: 2_500 },
  community: { warn: 1_200, block: 2_500 },
  website: { warn: 700, block: 1_200 },
};

function clampText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function firstPresent(values: string[], fallback: string, maxLength: number) {
  return clampText(values.find((value) => value.trim().length > 0) ?? fallback, maxLength);
}

function starterPostChannels(channels: DearMeBrandBlueprintSeed["preferredChannels"]) {
  const preferred = channels.filter((channel) => firstCycleSocialChannels.has(channel));
  return uniqueStrings([...preferred, ...firstCyclePostChannelFallbacks]).slice(
    0,
    DEARME_FIRST_CYCLE_STARTER_POST_COUNT,
  ) as [
    DearMeFirstCyclePostChannel,
    DearMeFirstCyclePostChannel,
    DearMeFirstCyclePostChannel,
    DearMeFirstCyclePostChannel,
    DearMeFirstCyclePostChannel,
  ];
}

function findVoiceGatePhraseHits(text: string, phrases: readonly string[]) {
  const lowerText = text.toLocaleLowerCase();
  return phrases
    .filter((phrase) => lowerText.includes(phrase))
    .map((phrase) => clampText(phrase, 120))
    .slice(0, 6);
}

function voiceGateApprovalGate(kind: DearMeVoiceGateEvaluation["artifact"]["kind"]): DearMeVoiceGateResult["approvalGate"] {
  switch (kind) {
    case "content_draft":
      return "publish_social";
    case "opportunity_outreach":
      return "send_email";
    case "portfolio_copy":
      return "deploy_public_site";
    case "weekly_report":
      return "sensitive_material";
    case "brand_positioning":
    default:
      return "public_claim";
  }
}

function voiceGateBlockedAction(gate: DearMeVoiceGateResult["approvalGate"]) {
  switch (gate) {
    case "publish_social":
      return "Publish social posts";
    case "send_email":
      return "Send outreach messages";
    case "deploy_public_site":
      return "Deploy public page changes";
    case "spend_money":
      return "Spend money";
    case "sensitive_material":
      return "Use sensitive material";
    case "connect_channel":
      return "Change channel connections";
    case "destructive_change":
      return "Delete or replace existing work";
    case "public_claim":
    default:
      return "Make public claims";
  }
}

export function evaluateDearMeVoiceGate(input: DearMeVoiceGateEvaluation): DearMeVoiceGateResult {
  const parsed = dearMeVoiceGateEvaluationSchema.parse(input);
  const { artifact, brand } = parsed;
  const combinedText = [artifact.title, artifact.text, artifact.proofUsed].filter(Boolean).join("\n");
  const proofSource = artifact.proofUsed ?? brand.proofPoints[0] ?? null;
  const forbiddenHits = findVoiceGatePhraseHits(combinedText, voiceGateForbiddenPhrases);
  const genericHits = findVoiceGatePhraseHits(combinedText, voiceGateGenericPhrases);
  const lengthLimits = artifact.channel ? voiceGateChannelLengthLimits[artifact.channel] : null;
  const length = artifact.text.length;
  const sampleCount = brand.voiceSamples.length;
  const approvalGate = voiceGateApprovalGate(artifact.kind);

  const checks: DearMeVoiceGateResult["checks"] = [
    {
      kind: "voice_samples",
      label: "Voice samples",
      status: sampleCount >= 2 ? "pass" : "warn",
      summary:
        sampleCount >= 2
          ? "At least two voice samples are available for tone review."
          : "Voice review needs at least two samples before tone should be trusted.",
      evidence: [`${sampleCount} sample${sampleCount === 1 ? "" : "s"}`],
      recommendation:
        sampleCount >= 2
          ? "Keep the current samples attached to the voice check."
          : "Add one or two real writing samples before launching public language.",
    },
    {
      kind: "forbidden_phrases",
      label: "Banned phrasing",
      status: forbiddenHits.length > 0 ? "block" : "pass",
      summary:
        forbiddenHits.length > 0
          ? "The draft contains phrases that make the writing feel generic or non-human."
          : "No banned phrasing was found.",
      evidence: forbiddenHits,
      recommendation:
        forbiddenHits.length > 0
          ? "Remove these phrases and replace them with concrete, first-person language."
          : "Keep the direct language and review the substance before launch.",
    },
    {
      kind: "generic_launch_copy",
      label: "Generic launch copy",
      status: genericHits.length > 0 ? "warn" : "pass",
      summary:
        genericHits.length > 0
          ? "The draft uses launch copy that can make the post feel interchangeable."
          : "No generic launch copy was found.",
      evidence: genericHits,
      recommendation:
        genericHits.length > 0
          ? "Rewrite the hook around the actual work, proof, or lesson."
          : "Keep the hook grounded in the user's work and audience.",
    },
    {
      kind: "proof_claim",
      label: "Proof claim",
      status: proofSource ? "pass" : "block",
      summary: proofSource
        ? "A proof point is attached to the draft."
        : "Public claims need a real proof point before launch.",
      evidence: proofSource ? [clampText(proofSource, 220)] : [],
      recommendation: proofSource
        ? "Check that the proof is accurate before launching the public move."
        : "Add a shipped work example, outcome, credential, or concrete receipt before public use.",
    },
    {
      kind: "channel_length",
      label: "Channel length",
      status:
        lengthLimits && length > lengthLimits.block
          ? "block"
          : lengthLimits && length > lengthLimits.warn
            ? "warn"
            : "pass",
      summary: lengthLimits
        ? `Draft length is ${length} characters for ${artifact.channel ?? "the selected channel"}.`
        : `Draft length is ${length} characters.`,
      evidence: lengthLimits ? [`warn ${lengthLimits.warn}`, `block ${lengthLimits.block}`] : [],
      recommendation:
        lengthLimits && length > lengthLimits.block
          ? "Shorten before review so the final draft fits the selected channel."
          : lengthLimits && length > lengthLimits.warn
            ? "Tighten the draft before launch if it needs to stay skimmable."
            : "Length is within the first-pass range for review.",
    },
  ];

  const blockCount = checks.filter((check) => check.status === "block").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const status: DearMeVoiceGateResult["status"] =
    blockCount > 0 ? "blocked_before_public" : warnCount > 0 ? "needs_voice_review" : "ready_for_review";
  const blockedActions = uniqueStrings([
    voiceGateBlockedAction(approvalGate),
    ...(blockCount > 0 ? ["Use draft publicly before fixing blocked checks"] : []),
  ]);

  return dearMeVoiceGateResultSchema.parse({
    status,
    score: Math.max(0, 100 - blockCount * 30 - warnCount * 12),
    summary:
      status === "blocked_before_public"
        ? "Blocked before public use. Fix the blocked checks, then review again before launch."
        : status === "needs_voice_review"
          ? "Needs voice review. The draft stays staged until the user chooses what represents them."
          : "Ready for launch once the user chooses the boundary.",
    approvalGate,
    checks,
    blockedActions,
  });
}

export function createDearMeBrandBlueprint(input: DearMeBrandBlueprintSeed): DearMeBrandBlueprint {
  const seed = dearMeBrandBlueprintSeedSchema.parse(input);
  const displayName = seed.displayName ?? "Personal brand";
  const positioning =
    seed.positioning ?? "A clear personal brand built from verified work, proof, ideas, and useful offers.";
  const goals = seed.goals.length > 0 ? seed.goals : defaultGoals;
  const audiences = seed.audiences.length > 0 ? seed.audiences : defaultAudiences;
  const proofPoints = seed.proofPoints;
  const offers = seed.offers;
  const preferredChannels = seed.preferredChannels;
  const constraints = seed.constraints;
  const voiceReady = seed.voiceSamples.length >= 2;

  return dearMeBrandBlueprintSchema.parse({
    version: DEARME_BRAND_BLUEPRINT_VERSION,
    brand: {
      displayName,
      positioning,
      goals,
      audiences,
      proofPoints,
      offers,
      preferredChannels,
      constraints,
    },
    voiceProfile: {
      status: voiceReady ? "ready_for_gate" : "needs_samples",
      sampleCount: seed.voiceSamples.length,
      guidance: voiceReady
        ? "Use the supplied samples to draft in the user's voice, then keep public output inside the launch boundary."
        : "Collect at least two voice samples before treating draft tone as reliable.",
    },
    contentPillars: buildContentPillars(seed),
    team: teamTemplate,
    cycles: [
      {
        id: "weekly_growth_plan",
        title: "Weekly growth plan",
        cadence: seed.cadence,
        ownerRole: "chief_of_staff",
        deliverables: ["Priorities", "content batch", "opportunity list", "launch boundary"],
      },
      {
        id: "content_pipeline",
        title: "Content pipeline",
        cadence: seed.cadence,
        ownerRole: "content_producer",
        deliverables: ["drafts", "voice edits", "launch-ready posts"],
      },
      {
        id: "portfolio_refresh",
        title: "Portfolio refresh",
        cadence: "weekly",
        ownerRole: "portfolio_builder",
        deliverables: ["proof updates", "case study notes", "site draft"],
      },
      {
        id: "dear_me_report",
        title: "Dear me report",
        cadence: "weekly",
        ownerRole: "growth_analyst",
        deliverables: ["progress summary", "learning summary", "next bets"],
      },
    ],
    assets: [
      { id: "brand_os", title: "Brand team profile", kind: "brand_os", ownerRole: "brand_strategist" },
      { id: "voice_profile", title: "Voice profile", kind: "voice_profile", ownerRole: "voice_editor" },
      { id: "content_pipeline", title: "Content pipeline", kind: "content_pipeline", ownerRole: "content_producer" },
      { id: "opportunity_pipeline", title: "Opportunity pipeline", kind: "opportunity_pipeline", ownerRole: "opportunity_scout" },
      { id: "portfolio_draft", title: "Portfolio draft", kind: "portfolio_draft", ownerRole: "portfolio_builder" },
      { id: "weekly_report", title: "Dear me report", kind: "weekly_report", ownerRole: "growth_analyst" },
    ],
    gates: riskGateTemplate,
    memorySeeds: buildMemorySeeds(seed, displayName, positioning),
    budgetPolicy: {
      monthlyCents: seed.budgetMonthlyCents,
      warnPercent: 80,
      hardStopEnabled: true,
    },
  });
}

export function summarizeDearMeBrandBlueprint(
  blueprint: DearMeBrandBlueprint,
): DearMeBrandBlueprintSummary {
  return dearMeBrandBlueprintSummarySchema.parse({
    title: `Create brand team profile for ${blueprint.brand.displayName}`,
    summary: `DearMe will create a ${blueprint.team.length}-member personal brand growth team, seed profile memory, start ${blueprint.cycles.length} recurring cycles, and keep public moves inside launch boundaries.`,
    recommendedAction: "Start the brand team once the goals, audience, channels, budget, and launch boundaries match the user's intent.",
    nextActionOnApproval: "DearMe will prepare the profile memory, voice profile, content pipeline, opportunity pipeline, portfolio draft, and weekly Dear me report.",
    teamMemberCount: blueprint.team.length,
    cycleCount: blueprint.cycles.length,
    riskGateCount: blueprint.gates.length,
  });
}

export function buildDearMeBrandBlueprintExecutionPlan(
  blueprint: DearMeBrandBlueprint,
): DearMeBrandBlueprintExecutionPlan {
  return dearMeBrandBlueprintExecutionPlanSchema.parse({
    operations: [
      {
        id: "create_brand_os",
        title: "Create profile memory",
        description: "Persist identity, positioning, goals, audience, proof, offers, constraints, and voice samples.",
        ownerRole: "brand_strategist",
        approvalGate: null,
      },
      {
        id: "create_growth_team",
        title: "Create growth team",
        description: "Create the DearMe team roles that own planning, voice, content, opportunities, portfolio, and reporting.",
        ownerRole: "chief_of_staff",
        approvalGate: null,
      },
      {
        id: "seed_voice_profile",
        title: "Seed voice profile",
        description: "Turn provided samples into a draft voice profile and keep public output inside the launch boundary.",
        ownerRole: "voice_editor",
        approvalGate: "sensitive_material",
      },
      {
        id: "start_weekly_growth_cycle",
        title: "Start weekly growth cycle",
        description: "Create the recurring weekly plan and live progress cycle.",
        ownerRole: "chief_of_staff",
        approvalGate: null,
      },
      {
        id: "draft_content_batch",
        title: "Draft first content batch",
        description: "Prepare the first launch-ready drafts from goals, proof, offers, and voice samples.",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
      {
        id: "draft_opportunity_list",
        title: "Draft opportunity list",
        description: "Prepare relevant opportunity and outreach drafts behind the launch boundary.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
      {
        id: "prepare_portfolio_update",
        title: "Prepare portfolio update",
        description: "Draft portfolio and proof updates without deploying them publicly.",
        ownerRole: "portfolio_builder",
        approvalGate: "deploy_public_site",
      },
      {
        id: "schedule_weekly_report",
        title: "Draft weekly Dear me report",
        description: "Draft the weekly report that summarizes work done, decisions needed, and next bets.",
        ownerRole: "growth_analyst",
        approvalGate: null,
      },
    ],
    riskGates: blueprint.gates,
    creates: {
      teamMembers: blueprint.team.length,
      cycles: blueprint.cycles.length,
      assets: blueprint.assets.length,
      memorySeeds: blueprint.memorySeeds.length,
    },
  });
}

export function collectDearMeBrandBlueprintWarnings(blueprint: DearMeBrandBlueprint): string[] {
  const warnings: string[] = [];
  if (blueprint.voiceProfile.status === "needs_samples") {
    warnings.push("Voice profile needs at least two samples before tone should be trusted.");
  }
  if (blueprint.brand.preferredChannels.length === 0) {
    warnings.push("No preferred channels were selected; DearMe will stage drafts until channels are chosen.");
  }
  if (blueprint.brand.proofPoints.length === 0) {
    warnings.push("No proof points were supplied; the first cycle should collect proof before public claims.");
  }
  return warnings;
}

export function createDearMeFirstCyclePreview(
  companyId: string,
  input: DearMeFirstCyclePreview,
): DearMeFirstCyclePreviewResponse {
  const preview = dearMeFirstCyclePreviewSchema.parse(input);
  const blueprint = createDearMeBrandBlueprint(preview.brand);
  const channels = starterPostChannels(blueprint.brand.preferredChannels);
  const displayName = clampText(blueprint.brand.displayName, 120);
  const positioning = clampText(blueprint.brand.positioning, 500);
  const primaryGoal = firstPresent(blueprint.brand.goals, defaultGoals[0]!, 160);
  const primaryAudience = firstPresent(blueprint.brand.audiences, defaultAudiences[0]!, 160);
  const primaryProof = firstPresent(blueprint.brand.proofPoints, "The first verified work example", 220);
  const primaryOffer = firstPresent(blueprint.brand.offers, "a useful next conversation", 160);
  const warnings = collectDearMeBrandBlueprintWarnings(blueprint);
  const suppliedProof = blueprint.brand.proofPoints[0];
  const siteHandle = resolveDearMeSiteHandle(preview.handle, displayName);
  const siteRoute = `dearme.app/${siteHandle}`;
  const opportunityShortlist: DearMeFirstCyclePreviewResponse["opportunityShortlist"] = [
    {
      title: "Direct customer lead",
      target: primaryAudience,
      whyRelevant: `${primaryAudience} are the first group likely to care about ${primaryGoal}.`,
      relevanceScore: 9,
      contactEvidence: {
        status: "pending",
        contactEmail: "hello@practicalaiproducts.example",
        contactUrl: "https://practicalaiproducts.example/contact",
        sourceSignal: "Contact page pattern identifies a likely direct inbox; owner confirmation is still needed before outreach.",
      },
      outreachAngle: `Lead with ${primaryProof}, then offer ${primaryOffer}.`,
      draftMessage: `I am reaching out because ${primaryAudience} are likely thinking about ${primaryGoal}. I can share a short practical note from ${primaryProof}; if useful, we can see whether ${primaryOffer} fits your current priorities.`,
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    {
      title: "Warm collaboration lead",
      target: "Practical AI Product Operators Circle",
      whyRelevant: "Practical AI Product Operators Circle already cares about visible proof, specific outcomes, and a clear next step.",
      relevanceScore: 8,
      contactEvidence: {
        status: "pending",
        contactHandle: "@practicalaioperators",
        contactUrl: "https://practicalaioperators.example/connect",
        sourceSignal: "Community profile points to a shared inbox, but the best direct owner contact still needs confirmation.",
      },
      outreachAngle: `Open with the proof, then offer a practical collaboration or referral conversation.`,
      draftMessage: `I am reaching out because you are already shipping practical AI work. I have a short proof-first note from ${primaryProof} and would be glad to share it if a useful collaboration or referral conversation would help.`,
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    {
      title: "Podcast guest lead",
      target: "Practical AI Builders Podcast Desk",
      whyRelevant: "Practical AI Builders Podcast Desk is a strong fit for a proof-backed, concrete story about turning brand work into public evidence.",
      relevanceScore: 7,
      contactEvidence: {
        status: "pending",
        contactEmail: "bookings@practicalaibuilders.example",
        contactUrl: "https://practicalaibuilders.example/podcast",
        sourceSignal: "Guest submission pattern identifies a likely booking inbox and intake form; confirm the owner before outreach.",
      },
      outreachAngle: `Pitch a short, evidence-first story that starts with ${primaryProof} and ends with a useful takeaway for their audience.`,
      draftMessage: `I am reaching out because your show focuses on practical AI builders and concrete stories. I can offer a short proof-backed angle rooted in ${primaryProof} if a guest conversation would be useful for your listeners.`,
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    {
      title: "Hiring lead",
      target: "Local AI Workflow Hiring Teams",
      whyRelevant: "Local AI Workflow Hiring Teams usually need someone who can show evidence, not just talk about tools.",
      relevanceScore: 7,
      contactEvidence: {
        status: "pending",
        contactEmail: "jobs@localaiworkflow.example",
        sourceSignal: "Hiring page names a recruiting inbox and the role page points to the team lead.",
      },
      outreachAngle: `Lead with the outcome from ${primaryProof}, then point to how ${primaryOffer} might support the team.`,
      draftMessage: `I am reaching out because teams hiring for local AI workflow expertise often want proof they can trust. I can share a short note on ${primaryProof} and, if useful, discuss whether ${primaryOffer} would help your team.`,
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    {
      title: "Warm intro lead",
      target: "Trusted Operator Intro List",
      whyRelevant: "Trusted Operator Intro List is often the best route to one strong introduction because these people already know how you work and what proof matters.",
      relevanceScore: 8,
      contactEvidence: {
        status: "unavailable",
        sourceSignal: "No direct public contact surfaced yet; a warm intro is the safest path for this lane.",
      },
      outreachAngle: "Ask for a single thoughtful introduction after leading with the specific proof and the concrete ask.",
      draftMessage: `I am reaching out because a trusted introduction can be the fastest way to connect the right people. I have a short practical note from ${primaryProof}, and if it seems relevant, I would appreciate a warm introduction to someone who cares about ${primaryGoal}.`,
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
  ];
  const proofSequence: DearMeFirstCyclePreviewResponse["proofSequence"] = [
    {
      window: "0-30s",
      title: "Identity dossier",
      summary: `${displayName} is positioned around ${positioning}. The first pass captures the known-for line, voice stance, proof, and launch constraints before any public move.`,
      preparedArtifact: "Voice profile and known-for line",
      approvalBoundary: "Research and drafting continue automatically; sensitive or public claims stay behind the launch call.",
    },
    {
      window: "60-120s",
      title: "Audience map",
      summary: `${primaryAudience} is the first audience to map because they are likely to care about ${primaryGoal}. DearMe prepares starter posts and a five-target opportunity shortlist for this lane.`,
      preparedArtifact: "Audience shortlist and first opportunity",
      approvalBoundary: "Outreach drafts stay staged until you choose the send path.",
    },
    {
      window: "3-5min",
      title: "Proof page",
      summary: `The first proof page move packages ${primaryProof} into a proof card for ${primaryAudience}, then ties it to ${primaryOffer}.`,
      preparedArtifact: "Proof page move",
      approvalBoundary: "Public page changes stay behind one launch decision.",
    },
  ];
  const starterPosts: DearMeFirstCyclePreviewResponse["starterPosts"] = [
    {
      id: "starter-post-positioning",
      channel: channels[0],
      title: "Starter post: point of view",
      hook: `What ${displayName} wants to become known for: ${positioning}`,
      body: [
        `The positioning to test this week: ${positioning}.`,
        `The first audience is ${primaryAudience}, and the useful promise is simple: ${primaryGoal}.`,
        `Before this goes public, I would anchor the claim in ${primaryProof} and keep the wording specific enough to review.`,
      ].join(" "),
      proofUsed: primaryProof,
      ownerRole: "content_producer",
      approvalGate: "publish_social",
    },
    {
      id: "starter-post-proof",
      channel: channels[1],
      title: "Starter post: proof of work",
      hook: `The proof behind this positioning: ${primaryProof}`,
      body: [
        `The strongest proof to use this week is ${primaryProof}.`,
        `The lesson for ${primaryAudience}: credible personal brand growth comes from showing the work, then connecting it back to ${positioning}.`,
        "This is staged for the launch call after the proof and public claim are clear.",
      ].join(" "),
      proofUsed: primaryProof,
      ownerRole: "content_producer",
      approvalGate: "publish_social",
    },
    {
      id: "starter-post-opening",
      channel: channels[2],
      title: "Starter post: useful opening",
      hook: `A useful opening for ${primaryAudience}`,
      body: [
        `If you are ${primaryAudience}, I can share ${primaryOffer} through the lens of ${primaryProof}.`,
        `The useful starting point is ${primaryGoal}, not a broad pitch.`,
        "I would stage this as the opening for the outreach or publish path.",
      ].join(" "),
      proofUsed: primaryProof,
      ownerRole: "content_producer",
      approvalGate: "publish_social",
    },
    {
      id: "starter-post-lesson",
      channel: channels[3],
      title: "Starter post: lesson learned",
      hook: `The lesson from ${primaryProof}`,
      body: [
        `The lesson to make visible: ${primaryProof} matters because it shows how ${displayName} can help ${primaryAudience}.`,
        `Tie that proof back to ${primaryGoal} and keep the post narrow enough for a real person to check.`,
        "This is staged for the launch call once the lesson, proof, and claim are clear.",
      ].join(" "),
      proofUsed: primaryProof,
      ownerRole: "content_producer",
      approvalGate: "publish_social",
    },
    {
      id: "starter-post-next-step",
      channel: channels[4],
      title: "Starter post: next useful step",
      hook: `The next useful step for ${primaryAudience}`,
      body: [
        `For ${primaryAudience}, the next useful step is to turn ${primaryOffer} into one concrete move tied to ${primaryProof}.`,
        `The draft should make ${primaryGoal} feel practical before asking for any public commitment.`,
        "Keep this as a launch-ready draft for the publish path.",
      ].join(" "),
      proofUsed: primaryProof,
      ownerRole: "content_producer",
      approvalGate: "publish_social",
    },
  ];
  const liveWorkTrail: DearMeFirstCyclePreviewResponse["liveWorkTrail"] = [
    {
      id: "identity-dossier-ready",
      window: proofSequence[0]?.window ?? "0-30s",
      status: "ready",
      ownerRole: "voice_editor",
      action: "Studying your voice",
      artifact: proofSequence[0]?.preparedArtifact ?? "Voice profile and known-for line",
      receipt: `${displayName}'s known-for line, voice stance, proof, and launch constraints are ready for review.`,
    },
    {
      id: "audience-map-ready",
      window: proofSequence[1]?.window ?? "60-120s",
      status: "ready",
      ownerRole: "opportunity_scout",
      action: "Finding likely audiences",
      artifact: proofSequence[1]?.preparedArtifact ?? "Audience shortlist and first opportunity",
      receipt: `${primaryAudience} is the first lane, with ${opportunityShortlist.length} launch-ready targets and ${opportunityShortlist[0]?.target ?? "one lead"} prepared.`,
    },
    {
      id: "starter-drafts-ready",
      window: "90s",
      status: "ready",
      ownerRole: "content_producer",
      action: "Drafting first moves",
      artifact: `${starterPosts.length} starter drafts`,
      receipt: `${starterPosts.length} proof-backed drafts are staged from ${primaryProof}.`,
    },
    {
      id: "private-proof-page-ready",
      window: proofSequence[2]?.window ?? "3-5min",
      status: "ready",
      ownerRole: "portfolio_builder",
      action: "Preparing your proof page",
      artifact: proofSequence[2]?.preparedArtifact ?? "Proof page move",
      receipt: `${siteRoute} is staged with a proof card tied to ${primaryOffer}.`,
    },
    {
      id: "launch-call-ready",
      window: "Launch call",
      status: "your_call",
      ownerRole: "chief_of_staff",
      action: "Ready for your launch call",
      artifact: "Launch boundary",
      receipt: "Public posts, outreach, page changes, and spend are ready for one launch decision.",
    },
  ];
  const cycleReport: DearMeFirstCyclePreviewResponse["cycleReport"] = {
    title: "First-cycle report",
    summary: `What moved for ${displayName}: voice, audience, drafts, proof, and the launch boundary are ready before anything public changes.`,
    cadence: blueprint.cycles[0]?.cadence ?? "weekly",
    items: [
      {
        id: "what-moved",
        label: "What moved while you were away",
        status: "moved",
        ownerRole: "chief_of_staff",
        summary: `${liveWorkTrail.length - 1} work receipts moved from positioning to proof without publishing, sending, deploying, or spending.`,
        source: "Live work receipts",
      },
      {
        id: "ready-for-launch-call",
        label: "Ready for your launch call",
        status: "ready",
        ownerRole: "chief_of_staff",
        summary: `${starterPosts.length} drafts, ${opportunityShortlist.length} opportunity leads, and one proof card are ready for review.`,
        source: "Proof pack",
        nextCall: "Launch, revise, or redirect from one place.",
      },
      {
        id: "prepared-but-blocked",
        label: "Prepared but blocked",
        status: "blocked",
        ownerRole: "voice_editor",
        summary: "Public posts, outreach, page changes, and spend stay behind one launch decision while the team keeps preparing.",
        source: "Launch boundary",
        nextCall: "Keep the team preparing; choose the public move when ready.",
      },
      {
        id: "next-proof-cycle",
        label: "Next proof cycle",
        status: "next",
        ownerRole: "portfolio_builder",
        summary: "The next pass sharpens one draft, refreshes one opportunity, and improves the proof card.",
        source: "Next pass",
      },
    ],
    closingLine: "DearMe keeps working; only public or costly moves come back for your call.",
  };
  const valueReport: DearMeFirstCyclePreviewResponse["valueReport"] = {
    title: "First value report",
    summary:
      `In the first private pass, DearMe turned ${displayName}'s positioning into reviewable assets, opportunity coverage, a proof page move, and protected launch decisions.`,
    period: "First five minutes",
    items: [
      {
        id: "reviewable-assets-prepared",
        label: "Reviewable assets prepared",
        ownerRole: "growth_analyst",
        metric: `${starterPosts.length} drafts + 1 proof card`,
        count: starterPosts.length + 1,
        unit: "reviewable assets",
        summary: `${starterPosts.length} drafts and one proof card are ready to review without publishing.`,
        source: "Proof pack",
      },
      {
        id: "opportunity-coverage-staged",
        label: "Opportunity coverage staged",
        ownerRole: "opportunity_scout",
        metric: `${opportunityShortlist.length} leads`,
        count: opportunityShortlist.length,
        unit: "qualified leads",
        summary: `${opportunityShortlist.length} opportunity leads are staged with relevance, angle, draft message, and contact evidence status.`,
        source: "Opportunity shortlist",
      },
      {
        id: "proof-loop-opened",
        label: "Proof loop opened",
        ownerRole: "portfolio_builder",
        metric: "1 private route + 3 next-pass improvements",
        count: 4,
        unit: "proof moves",
        summary: `${siteRoute} is ready privately, with three improvements lined up for the next pass.`,
        source: "Private proof page",
      },
      {
        id: "launch-risk-held",
        label: "Launch risk held back",
        ownerRole: "chief_of_staff",
        metric: `${DEARME_FIRST_CYCLE_CONCERN_GATES.length} approval boundaries`,
        count: DEARME_FIRST_CYCLE_CONCERN_GATES.length,
        unit: "protected actions",
        summary: "Posting, sending, page changes, and spend stay behind one launch call while work continues.",
        source: "Launch boundary",
      },
    ],
    closingLine: "Use this report to decide whether to launch, revise, or let DearMe keep preparing.",
  };
  const opportunityRoiReport: DearMeFirstCyclePreviewResponse["opportunityRoiReport"] = {
    title: "Opportunity ROI report",
    summary:
      "DearMe ranks the prepared leads by likely return, contact effort, confidence, and the next safe move before any outreach is sent.",
    items: opportunityShortlist.map((lead, index) => {
      const contactStatusBonus =
        lead.contactEvidence.status === "verified" ? 12 : lead.contactEvidence.status === "pending" ? 6 : 0;
      const hasContactRecord = Boolean(
        lead.contactEvidence.contactEmail ||
          lead.contactEvidence.contactHandle ||
          lead.contactEvidence.contactUrl,
      );
      const score = Math.min(100, lead.relevanceScore * 9 + contactStatusBonus + (hasContactRecord ? 4 : 0));
      const priority =
        lead.contactEvidence.status === "unavailable"
          ? "warm_intro"
          : index <= 1
            ? "launch_first"
            : "verify_contact";
      const effort =
        lead.contactEvidence.status === "verified"
          ? "Low effort"
          : lead.contactEvidence.status === "pending"
            ? "Medium effort"
            : "Warm intro effort";
      const confidence =
        lead.relevanceScore >= 9
          ? "High confidence"
          : lead.relevanceScore >= 8
            ? "Medium-high confidence"
            : "Needs one more proof check";
      const nextAction =
        priority === "warm_intro"
          ? `Ask for one trusted introduction before sending anything to ${lead.target}.`
          : priority === "launch_first"
            ? `Review the draft message for ${lead.target} in the launch call.`
            : `Confirm the contact path for ${lead.target}, then decide whether to send.`;

      return {
        id: `opportunity-roi-${index + 1}`,
        leadTitle: lead.title,
        target: lead.target,
        priority,
        score,
        expectedReturn: `Likely return: a relevant conversation with ${lead.target} tied to ${primaryGoal}.`,
        effort,
        confidence,
        nextAction,
        source: lead.contactEvidence.sourceSignal,
      };
    }),
    closingLine: "Start with the highest-return safe lead, or keep verifying contacts while DearMe prepares the next pass.",
  };
  const memoryPlan: DearMeFirstCyclePreviewResponse["memoryPlan"] = {
    title: "Voice & Memory plan",
    summary:
      "DearMe remembers durable brand signals from the first cycle and filters out temporary work notes before they can shape future drafts.",
    savePolicy: [
      "Save stable identity, voice, proof, audience, offer, boundary, relationship, and review-feedback signals.",
      "Use saved signals to improve the next draft, opportunity angle, proof card, and report.",
      "Recheck remembered facts against current sources before they support public claims.",
    ],
    rejectedSourceKinds: [...DEARME_MEMORY_REJECTED_SOURCE_KINDS],
    items: [
      {
        kind: "profile",
        label: "Known-for direction",
        summary: `${displayName} wants to become known for ${primaryGoal}.`,
        source: "First answer",
        howUsedNext: "Keeps future plans and drafts pointed at the same known-for direction.",
      },
      {
        kind: "voice",
        label: "Voice sample coverage",
        summary:
          blueprint.voiceProfile.sampleCount >= 2
            ? `${blueprint.voiceProfile.sampleCount} voice samples are ready to guide tone checks.`
            : `${blueprint.voiceProfile.sampleCount} voice samples are available; tone stays conservative until more samples arrive.`,
        source: "Voice samples",
        howUsedNext: "Guides the Voice Editor before any public wording is launched.",
      },
      {
        kind: "proof",
        label: "Primary proof",
        summary: primaryProof,
        source: suppliedProof ? "Supplied proof point" : "First-cycle placeholder",
        howUsedNext: "Anchors starter posts, opportunity messages, and the proof card in concrete evidence.",
      },
      {
        kind: "audience",
        label: "First audience lane",
        summary: primaryAudience,
        source: "Audience map",
        howUsedNext: "Ranks opportunities and keeps outreach drafts specific to the first lane.",
      },
      {
        kind: "feedback",
        label: "Review feedback slot",
        summary: "Future launch, revise, regenerate, or not-useful choices become memory only when they change durable direction.",
        source: "Launch review",
        howUsedNext: "Prevents repeated misses by carrying durable review feedback into the next pass.",
      },
    ],
  };
  const voiceGate = evaluateDearMeVoiceGate({
    brand: preview.brand,
    artifact: {
      kind: "content_draft",
      channel: "newsletter",
      title: "First starter post batch",
      text: starterPosts.map((post) => `${post.hook}\n${post.body}`).join("\n\n"),
      ...(suppliedProof ? { proofUsed: suppliedProof } : {}),
    },
  });

  return dearMeFirstCyclePreviewResponseSchema.parse({
    companyId,
    status: "first_cycle_preview",
    prompt: "What do you want to become known for?",
    positioning,
    voiceProfile: {
      title: "Draft Voice Profile",
      status: blueprint.voiceProfile.status,
      sampleCount: blueprint.voiceProfile.sampleCount,
      guidance:
        blueprint.voiceProfile.status === "ready_for_gate"
          ? "Use the supplied samples to make the first drafts direct, specific, and ready to launch."
          : "Start with clear, proof-first drafts and sharpen the tone as more samples arrive.",
      draftTone:
        blueprint.voiceProfile.status === "ready_for_gate"
          ? ["Direct and specific", "Proof-backed", "Concrete next steps"]
          : ["Clear and plain", "Proof-first", "Ready for voice check"],
      ownerRole: "voice_editor",
      approvalGate: "sensitive_material",
    },
    starterPosts,
    proofSequence,
    liveWorkTrail,
    cycleReport,
    valueReport,
    opportunityRoiReport,
    opportunityLead: {
      ...opportunityShortlist[0],
    },
    opportunityShortlist,
    portfolioProofCard: {
      title: "Portfolio proof card",
      proofSource: primaryProof,
      proposedCopy: `${displayName} helps ${primaryAudience} make ${primaryGoal} visible through ${positioning}. Recent proof: ${primaryProof}.`,
      placement: "Homepage proof section",
      ownerRole: "portfolio_builder",
      approvalGate: "deploy_public_site",
    },
    sitePreview: {
      handle: siteHandle,
      route: siteRoute,
      status: "private_preview",
      approvalBoundary: "Proof preview stays inside DearMe until you choose one deploy decision.",
    },
    growthPlan: {
      title: "First growth plan",
      summary: "Start with one sharp positioning decision, five drafts, a five-target opportunity shortlist, and one proof card so the first session already feels alive.",
      priorities: [
        "Lock the sharpest positioning line",
        "Pick the first proof-backed starter post",
        "Choose the best lane from the five-target opportunity shortlist",
      ],
      nextActions: [
        "Voice Editor sharpens tone against the current samples",
        "Content Producer turns the five starter drafts into launch-ready drafts",
        "Opportunity Scout prepares the five-target shortlist and first outreach angle",
        "Portfolio Builder assembles the proof card for the public site",
      ],
      ownerRole: "chief_of_staff",
      approvalGate: "public_claim",
    },
    autonomyPlan: {
      label: "Autopilot until launch",
      summary:
        "DearMe keeps researching, drafting, staging, checking voice, recording memory, and preparing the next pass without asking. It only stops before publishing, sending, deploying, or spending.",
      autonomousSteps: [
        {
          id: "capture-positioning",
          title: "Capture the positioning",
          phase: "plan",
          ownerRole: "chief_of_staff",
          summary: "Turn the user's one-line intent into a first-cycle brief.",
        },
        {
          id: "prepare-private-drafts",
          title: "Prepare drafts",
          phase: "work",
          ownerRole: "content_producer",
          summary: "Draft starter posts from the positioning, audience, proof, and offer signals.",
        },
        {
          id: "stage-opportunity-and-proof",
          title: "Stage opportunity and proof work",
          phase: "work",
          ownerRole: "opportunity_scout",
          summary: "Prepare one outreach angle and one portfolio proof card without contacting anyone or changing the public site.",
        },
        {
          id: "check-voice-and-boundary",
          title: "Check voice and boundary",
          phase: "review",
          ownerRole: "voice_editor",
          summary: "Score the starter drafts and keep anything public behind the launch decision.",
        },
        {
          id: "prepare-next-private-pass",
          title: "Prepare the next pass",
          phase: "report",
          ownerRole: "chief_of_staff",
          summary: "Write the first plan and next actions so the team can keep moving after the preview.",
        },
      ],
      waitsFor: [...DEARME_FIRST_CYCLE_CONCERN_GATES],
    },
    continuationPlan: {
      title: "Keeps working after the first proof",
      summary:
        "After the first proof pack, DearMe keeps the weekly cycle alive: sharpen one draft, refresh one opportunity, and improve the proof page before the next review.",
      cadence: blueprint.cycles[0]?.cadence ?? "weekly",
      nextReview: "Next proof review",
      items: [
        {
          id: "sharpen-next-draft",
          title: "Sharpen the next draft",
          ownerRole: "content_producer",
          preparedArtifact: "Next proof-backed draft",
          summary: `Turn the strongest starter post into the next draft for ${primaryAudience}.`,
          approvalBoundary: "Posting stays behind the launch call while the draft keeps improving.",
        },
        {
          id: "refresh-opportunity-lead",
          title: "Refresh the best opportunity",
          ownerRole: "opportunity_scout",
          preparedArtifact: "Updated opportunity angle",
          summary: `Recheck the strongest lead and tune the outreach angle around ${primaryProof}.`,
          approvalBoundary: "Sending stays behind the launch call while the outreach angle keeps improving.",
        },
        {
          id: "improve-proof-page",
          title: "Improve the proof page",
          ownerRole: "portfolio_builder",
          preparedArtifact: "Updated proof card",
          summary: `Improve the proof card so ${primaryOffer} is tied to one concrete result.`,
          approvalBoundary: "Public page changes stay behind the launch call while the proof card keeps improving.",
        },
      ],
    },
    memoryPlan,
    voiceGate,
    approvalBoundary: {
      label: "Ready to launch, with you in control",
      summary: "Your team keeps preparing the work automatically. Public posts, outreach, page changes, and spend stay behind one launch decision.",
      blockedActions: [
        "Post publicly",
        "Send outreach",
        "Update the public page",
        "Spend budget",
      ],
    },
    warnings,
  });
}
