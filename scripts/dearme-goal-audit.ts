import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDearMeHostRehearsal,
  type DearMeHostRehearsalReport,
} from "./dearme-host-rehearsal.ts";
import {
  inspectDearMeHostProviderAudit,
  type DearMeHostProviderAudit,
} from "./dearme-host-provider-audit.ts";
import {
  runDearMeOpenClawMessageRehearsal,
  type DearMeOpenClawMessageRehearsalReport,
} from "./dearme-openclaw-message-rehearsal.ts";
import {
  inspectDearMeIntegrationAuditStatus,
  inspectDearMeProofReadiness,
  loadDearMeProofEnv,
  summarizeDearMeProofStatus,
  type DearMeProofLiveProviderFocus,
  type DearMeProofStatus,
  type DearMeProofStatusBlocker,
  type DearMeProofStatusSection,
} from "./dearme-proof.ts";

type Env = Record<string, string | undefined>;

export type DearMeGoalAuditItemKey =
  | "architecture_status_spine"
  | "donor_reuse_absorption"
  | "symphony_coordination"
  | "public_first_run_landing"
  | "private_first_wow"
  | "commercial_private_beta_loop"
  | "paid_user_operations_loop"
  | "weekly_retention_loop"
  | "feedback_support_learning_loop"
  | "loopback_host_rehearsal"
  | "voice_autonomy"
  | "production_host_provider_auth"
  | "production_host_live_wow"
  | "openclaw_message_contract_rehearsal"
  | "openclaw_message_reuse"
  | "live_provider_set";

export type DearMeGoalAuditItemStatus = "met" | "blocked" | "unverified";

export interface DearMeGoalAuditItem {
  key: DearMeGoalAuditItemKey;
  label: string;
  status: DearMeGoalAuditItemStatus;
  requiredForGoal: boolean;
  evidence: string;
  blockers: string[];
  commands: string[];
}

export interface DearMeGoalAuditNextAction {
  label: string;
  reason: string;
  command?: string;
  ownerFacts?: string[];
  captureCommands?: string[];
  receiptPreviewCommand?: string;
  receiptImportCommand?: string;
  noSendCheckCommand?: string;
  guardedLiveCommands?: string[];
}

export type DearMeGoalAuditPromptChecklistItemKey =
  | "reuse_existing_substrates"
  | "integrate_worktrees"
  | "symphony_coordination"
  | "architecture_first"
  | "polsia_style_aha"
  | "commercial_user_system"
  | "retention_learning_operations"
  | "autonomous_good_product"
  | "live_provider_truth";

export interface DearMeGoalAuditPromptChecklistItem {
  key: DearMeGoalAuditPromptChecklistItemKey;
  promptRequirement: string;
  artifactItems: DearMeGoalAuditItemKey[];
  status: DearMeGoalAuditItemStatus;
  evidence: string;
  missing: string[];
}

export interface DearMeGoalAudit {
  complete: boolean;
  verdict: string;
  promptToArtifactChecklist: DearMeGoalAuditPromptChecklistItem[];
  items: DearMeGoalAuditItem[];
  nextAction: DearMeGoalAuditNextAction;
}

export interface DearMeGoalAuditHostRehearsalEvidence {
  report?: DearMeHostRehearsalReport;
  error?: string;
}

export interface DearMeGoalAuditHostProviderEvidence {
  audit?: DearMeHostProviderAudit;
  error?: string;
}

export interface DearMeGoalAuditOpenClawMessageRehearsalEvidence {
  report?: DearMeOpenClawMessageRehearsalReport;
  error?: string;
}

export interface DearMeGoalAuditPublicFirstRunLandingEvidence {
  ready: boolean;
  evidence: string;
  missing: string[];
  error?: string;
}

export interface DearMeGoalAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  envFiles: string[];
}

const GOAL_AUDIT_CHECK_COMMAND = "pnpm --silent dearme:goal-audit -- --check";
const GOAL_AUDIT_HOST_REHEARSAL_TMP_PREFIX = "dearme-goal-host-rehearsal-";
const PROOF_ENV_FILE = ".dearme-proof.env";
const OPENCLAW_MESSAGES_TARGET = "openclaw_messages";
const PUBLIC_FIRST_RUN_LANDING_SOURCE = "ui/src/pages/DearMeOnboarding.tsx";
const PUBLIC_FIRST_RUN_LANDING_TEST = "ui/src/pages/DearMeOnboarding.test.tsx";
const PUBLIC_FIRST_RUN_LANDING_TEST_COMMAND =
  'pnpm exec vitest run ui/src/pages/DearMeOnboarding.test.tsx --maxWorkers=1 -t "public first-run landing"';
const REQUIRED_STATUS_SECTIONS: DearMeProofStatusSection["key"][] = [
  "first_wow_aha_proof",
  "integration_absorption_proof",
  "local_safe_proof",
  "voice_semantic_proof",
  "live_provider_proof",
];
const PROMPT_TO_ARTIFACT_REQUIREMENTS: readonly {
  key: DearMeGoalAuditPromptChecklistItemKey;
  promptRequirement: string;
  artifactItems: readonly DearMeGoalAuditItemKey[];
}[] = [
  {
    key: "reuse_existing_substrates",
    promptRequirement: "Maximize reuse of Polsia, Naive/Paperclip, and OpenClaw instead of rebuilding substrate",
    artifactItems: [
      "donor_reuse_absorption",
      "openclaw_message_contract_rehearsal",
      "openclaw_message_reuse",
    ],
  },
  {
    key: "integrate_worktrees",
    promptRequirement: "Integrate and update all relevant worktrees; do not leave active replay candidates behind",
    artifactItems: [
      "donor_reuse_absorption",
      "symphony_coordination",
    ],
  },
  {
    key: "symphony_coordination",
    promptRequirement: "Use Symphony as the collaboration center so concurrent agents converge on the same head",
    artifactItems: ["symphony_coordination"],
  },
  {
    key: "architecture_first",
    promptRequirement: "Work as product architect first: keep a durable status spine before more implementation",
    artifactItems: ["architecture_status_spine"],
  },
  {
    key: "polsia_style_aha",
    promptRequirement: "Deliver a simple Polsia-style first wow that is phone-reachable and feels real",
    artifactItems: [
      "public_first_run_landing",
      "private_first_wow",
      "production_host_live_wow",
    ],
  },
  {
    key: "commercial_user_system",
    promptRequirement: "Cover the commercial user system: paid access, payment path, account health, cost guardrails, and launch boundaries",
    artifactItems: [
      "commercial_private_beta_loop",
      "paid_user_operations_loop",
    ],
  },
  {
    key: "retention_learning_operations",
    promptRequirement: "Keep paid users receiving weekly value, retention recovery, feedback learning, and support handoff",
    artifactItems: [
      "weekly_retention_loop",
      "feedback_support_learning_loop",
    ],
  },
  {
    key: "autonomous_good_product",
    promptRequirement: "Make the product autonomous and useful without exposing too many setup concerns",
    artifactItems: [
      "private_first_wow",
      "commercial_private_beta_loop",
      "paid_user_operations_loop",
      "weekly_retention_loop",
      "feedback_support_learning_loop",
      "voice_autonomy",
      "live_provider_set",
    ],
  },
  {
    key: "live_provider_truth",
    promptRequirement: "Do not mark completion from proxy proof; require real live OpenClaw/channel/provider evidence",
    artifactItems: [
      "openclaw_message_reuse",
      "live_provider_set",
    ],
  },
];

const PUBLIC_FIRST_RUN_LANDING_MARKERS: readonly {
  key: string;
  file: typeof PUBLIC_FIRST_RUN_LANDING_SOURCE | typeof PUBLIC_FIRST_RUN_LANDING_TEST;
  snippet: string;
}[] = [
  {
    key: "source_public_surface",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: 'aria-label="DearMe public first run"',
  },
  {
    key: "source_one_sentence_positioning",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "DearMe grows your personal brand while you work.",
  },
  {
    key: "source_known_for_input",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "What do you want to be known for?",
  },
  {
    key: "source_proof_pack_cta",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "Start my first proof pack",
  },
  {
    key: "source_first_proof_pack_hook",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "Watch the team work live",
  },
  {
    key: "source_live_receipt_hook",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "Watch DearMe prepare brand work live",
  },
  {
    key: "source_live_receipt_stats",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: 'aria-label="Live proof receipts"',
  },
  {
    key: "source_live_work_trail_contract",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "SAMPLE_FIRST_CYCLE_PREVIEW.liveWorkTrail",
  },
  {
    key: "source_cycle_report_contract",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "SAMPLE_FIRST_CYCLE_PREVIEW.cycleReport",
  },
  {
    key: "source_launch_boundary",
    file: PUBLIC_FIRST_RUN_LANDING_SOURCE,
    snippet: "Anything public stays behind your launch call.",
  },
  {
    key: "test_public_first_run_landing",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "uses the default route as a public first-run landing before the dense team surface",
  },
  {
    key: "test_content_view_public_first_run_landing",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "keeps the content view on the public first-run landing path",
  },
  {
    key: "test_live_work_receipts",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "First-run live work receipts",
  },
  {
    key: "test_live_receipt_hook",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "Watch DearMe prepare brand work live",
  },
  {
    key: "test_workroom_queues",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "First-run workroom queues",
  },
  {
    key: "test_dense_workbench_hidden_before_start",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "expect(mockDearmeApi.getWorkbench).not.toHaveBeenCalled();",
  },
  {
    key: "test_outputs_hidden_before_start",
    file: PUBLIC_FIRST_RUN_LANDING_TEST,
    snippet: "expect(mockDearmeApi.getOutputs).not.toHaveBeenCalled();",
  },
];

const COMMERCIAL_PROOF_COMMANDS = {
  releaseGate: "pnpm --silent dearme:release-gate -- --target private-proof",
  paidLoop: "pnpm --silent dearme:paid-loop-proof -- --check",
  paymentReadiness: "pnpm --silent dearme:payment-readiness",
  paidOps: "pnpm --silent dearme:paid-ops-proof -- --check",
  supportRecovery: "pnpm --silent dearme:support-recovery-proof -- --check",
  cohortRetention: "pnpm --silent dearme:cohort-retention-proof -- --check",
  feedbackLearning: "pnpm --silent dearme:feedback-learning-proof -- --check",
} as const;

type CommercialReadiness = NonNullable<DearMeProofStatus["commercialReadiness"]>;
type CommercialItem = CommercialReadiness["items"][number];
type CommercialItemKey = CommercialItem["key"];

function repoFile(relativePath: string): string {
  return join(fileURLToPath(new URL("..", import.meta.url)), relativePath);
}

function section(
  status: DearMeProofStatus,
  key: DearMeProofStatusSection["key"],
): DearMeProofStatusSection | undefined {
  return status.sections.find((item) => item.key === key);
}

function focus(
  status: DearMeProofStatus,
  key: DearMeProofLiveProviderFocus["key"],
): DearMeProofLiveProviderFocus | undefined {
  return status.liveProviderFocus.find((item) => item.key === key);
}

function blockerNames(blockers: readonly DearMeProofStatusBlocker[]) {
  return blockers.map((item) => item.target);
}

function capabilityLabels(blockers: readonly DearMeProofStatusBlocker[]) {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const blocker of blockers) {
    for (const capability of blocker.capabilities) {
      if (seen.has(capability.key)) continue;
      seen.add(capability.key);
      labels.push(capability.label);
    }
  }
  return labels;
}

function capabilityEvidence(blockers: readonly DearMeProofStatusBlocker[]) {
  const labels = capabilityLabels(blockers);
  return labels.length > 0
    ? ` Missing capabilities: ${labels.join("; ")}.`
    : "";
}

function targetedProviderSetupCommands(
  target: string,
  liveCommand?: string,
): string[] {
  return [
    `pnpm --silent dearme:next-proof -- --target ${target}`,
    `pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --check --target ${target}`,
    ...(liveCommand ? [liveCommand] : []),
  ];
}

function liveCommand(command: string): boolean {
  return command.includes(" --live") ||
    command.includes("DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1");
}

function preferredNextCommand(commands: readonly string[]): string | undefined {
  return commands.find((command) => !liveCommand(command)) ?? commands[0];
}

function checkCommand(command: string): boolean {
  return command.includes("dearme:provider-smoke") && command.includes(" --check");
}

function captureCommand(command: string): boolean {
  return command.includes("dearme:next-proof");
}

function ownerFactLine(
  fact: DearMeProofStatus["ownerProofChecklist"]["factsNeeded"][number],
): string {
  const sensitivity = fact.sensitive ? " (sensitive; value hidden)" : "";
  return `${fact.label}: provide ${fact.provideAs}${sensitivity}`;
}

function liveProviderTargetsForItem(
  item: DearMeGoalAuditItem,
): Set<string> | "all" | null {
  if (item.key === "live_provider_set") return "all";
  if (item.key === "openclaw_message_reuse") {
    return new Set(["telegram_message", "imessage_message"]);
  }
  if (item.key === "production_host_live_wow") {
    return new Set(["deploy_site_host_rehearsal", "deploy_site_production"]);
  }
  return null;
}

function ownerProofNextActionDetails(
  item: DearMeGoalAuditItem,
  status: DearMeProofStatus,
): Partial<DearMeGoalAuditNextAction> {
  const targetFilter = liveProviderTargetsForItem(item);
  if (!targetFilter || status.ownerProofChecklist.factsNeededCount === 0) {
    return {};
  }

  const facts = targetFilter === "all"
    ? status.ownerProofChecklist.factsNeeded
    : status.ownerProofChecklist.factsNeeded.filter((fact) =>
      fact.targets.some((target) => targetFilter.has(target))
    );
  if (facts.length === 0) return {};

  const captureCommands = item.commands.filter(captureCommand);
  return {
    ownerFacts: facts.map(ownerFactLine),
    captureCommands: captureCommands.length > 0
      ? captureCommands
      : status.ownerProofChecklist.captureCommands,
    receiptPreviewCommand:
      status.ownerProofChecklist.handoffReceiptPreviewCommand ?? undefined,
    receiptImportCommand:
      status.ownerProofChecklist.handoffReceiptCommand ?? undefined,
    noSendCheckCommand:
      item.commands.find(checkCommand) ?? status.ownerProofChecklist.checkCommand,
    guardedLiveCommands: item.commands.filter(liveCommand),
  };
}

function focusCommands(
  focusItem: DearMeProofLiveProviderFocus | undefined,
  setupTarget?: string,
): string[] {
  if (!focusItem?.operatorCommand) return [];
  if (!focusItem.ready && setupTarget) {
    return targetedProviderSetupCommands(setupTarget, focusItem.operatorCommand);
  }
  return [focusItem.operatorCommand];
}

function sectionItem(
  options: {
    key: DearMeGoalAuditItemKey;
    label: string;
    section?: DearMeProofStatusSection;
    commands?: string[];
    evidencePrefix?: string;
  },
): DearMeGoalAuditItem {
  const blockers = options.section ? blockerNames(options.section.blockedTargets) : [
    "missing_status_section",
  ];
  return {
    key: options.key,
    label: options.label,
    status: options.section ? (options.section.ready ? "met" : "blocked") : "unverified",
    requiredForGoal: true,
    evidence: options.section
      ? `${options.evidencePrefix ?? options.section.label}: ${options.section.description}${
        capabilityEvidence(options.section.blockedTargets)
      }`
      : "The unified proof status did not include this required section.",
    blockers,
    commands: options.commands ?? [],
  };
}

function combinedPrivateFirstWowItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  const aha = section(status, "first_wow_aha_proof");
  const local = section(status, "local_safe_proof");
  const blockers = [
    ...(!aha ? ["missing_first_wow_aha_proof"] : blockerNames(aha.blockedTargets)),
    ...(!local ? ["missing_local_safe_proof"] : blockerNames(local.blockedTargets)),
  ];
  const ready = Boolean(aha?.ready && local?.ready);

  return {
    key: "private_first_wow",
    label: "Polsia-style private first-wow without unsafe live actions",
    status: ready ? "met" : blockers.length > 0 ? "blocked" : "unverified",
    requiredForGoal: true,
    evidence: [
      aha?.description ?? "First-wow aha proof is missing.",
      local?.description ?? "Local no-send proof is missing.",
      capabilityEvidence([
        ...(aha?.blockedTargets ?? []),
        ...(local?.blockedTargets ?? []),
      ]),
    ].join(" ").trim(),
    blockers,
    commands: [
      status.commands.ahaProof,
      status.commands.runSafe,
    ],
  };
}

function loopbackHostRehearsalItem(
  evidence?: DearMeGoalAuditHostRehearsalEvidence,
): DearMeGoalAuditItem {
  if (!evidence) {
    return {
      key: "loopback_host_rehearsal",
      label: "No-secret loopback host rehearsal",
      status: "unverified",
      requiredForGoal: true,
      evidence: "The loopback host rehearsal was not run inside this audit.",
      blockers: ["host_rehearsal_not_run"],
      commands: ["pnpm --silent dearme:host-rehearsal -- --port 0 --json"],
    };
  }
  if (evidence.error) {
    return {
      key: "loopback_host_rehearsal",
      label: "No-secret loopback host rehearsal",
      status: "blocked",
      requiredForGoal: true,
      evidence: `The loopback host rehearsal failed before it could prove the exported private proof packet: ${evidence.error}`,
      blockers: ["host_rehearsal_failed"],
      commands: ["pnpm --silent dearme:host-rehearsal -- --port 0 --json"],
    };
  }

  const report = evidence.report;
  const failed = report?.results.filter((result) => result.status !== "delivered") ?? [];
  return {
    key: "loopback_host_rehearsal",
    label: "No-secret loopback host rehearsal",
    status: failed.length === 0 && report ? "met" : "blocked",
    requiredForGoal: true,
    evidence: report
      ? `Exported ${report.htmlPath}, served ${report.baseUrl}, and checked ${report.hostSmokePath} through deploy_site_host_rehearsal.`
      : "The loopback host rehearsal report is missing.",
    blockers: failed.length > 0
      ? failed.map((result) => `${result.target}_${result.status}`)
      : report ? [] : ["host_rehearsal_missing_report"],
    commands: ["pnpm --silent dearme:host-rehearsal -- --port 0 --json"],
  };
}

function focusItem(
  options: {
    key: DearMeGoalAuditItemKey;
    label: string;
    focus?: DearMeProofLiveProviderFocus;
    commands?: string[];
  },
): DearMeGoalAuditItem {
  return {
    key: options.key,
    label: options.label,
    status: options.focus ? (options.focus.ready ? "met" : "blocked") : "unverified",
    requiredForGoal: true,
    evidence: options.focus
      ? `${options.focus.reason}${capabilityEvidence(options.focus.blockedTargets)}`
      : "The live-provider focus plan is missing this item.",
    blockers: options.focus ? blockerNames(options.focus.blockedTargets) : [
      "missing_live_provider_focus",
    ],
    commands: options.commands ?? focusCommands(options.focus),
  };
}

function hostProviderAuthItem(
  evidence?: DearMeGoalAuditHostProviderEvidence,
): DearMeGoalAuditItem {
  const command = "pnpm --silent dearme:host-provider-audit";
  if (!evidence) {
    return {
      key: "production_host_provider_auth",
      label: "Production host provider authorization",
      status: "unverified",
      requiredForGoal: true,
      evidence: "The current machine has not checked host-provider login/token state or equivalent public host config.",
      blockers: ["host_provider_audit_not_run"],
      commands: [command],
    };
  }
  if (evidence.error) {
    return {
      key: "production_host_provider_auth",
      label: "Production host provider authorization",
      status: "blocked",
      requiredForGoal: true,
      evidence: `The host-provider audit failed before it could prove authorization state: ${evidence.error}`,
      blockers: ["host_provider_audit_failed"],
      commands: [command],
    };
  }

  const audit = evidence.audit;
  return {
    key: "production_host_provider_auth",
    label: "Production host provider authorization",
    status: audit?.ready ? "met" : "blocked",
    requiredForGoal: true,
    evidence: audit
      ? `${audit.verdict} ${audit.providers.map((provider) => provider.evidence).join(" ")}`
      : "The host-provider audit report is missing.",
    blockers: audit?.ready
      ? []
      : audit?.missingCapabilities ?? ["host_provider_audit_missing_report"],
    commands: audit?.operatorCommands.length
      ? audit.operatorCommands
      : [command],
  };
}

function openClawMessageRehearsalItem(
  evidence?: DearMeGoalAuditOpenClawMessageRehearsalEvidence,
): DearMeGoalAuditItem {
  const command = "pnpm --silent dearme:openclaw-message-rehearsal -- --json";
  if (!evidence) {
    return {
      key: "openclaw_message_contract_rehearsal",
      label: "OpenClaw Telegram/iMessage contract rehearsal",
      status: "unverified",
      requiredForGoal: true,
      evidence: "The shared OpenClaw Telegram/iMessage contract rehearsal has not run inside this audit.",
      blockers: ["openclaw_message_rehearsal_not_run"],
      commands: [command],
    };
  }
  if (evidence.error) {
    return {
      key: "openclaw_message_contract_rehearsal",
      label: "OpenClaw Telegram/iMessage contract rehearsal",
      status: "blocked",
      requiredForGoal: true,
      evidence: `The OpenClaw message rehearsal failed before it could prove the local gateway contract: ${evidence.error}`,
      blockers: ["openclaw_message_rehearsal_failed"],
      commands: [command],
    };
  }

  const report = evidence.report;
  const capturedTools = report?.captured.map((item) => item.toolName).join(", ");
  return {
    key: "openclaw_message_contract_rehearsal",
    label: "OpenClaw Telegram/iMessage contract rehearsal",
    status: report?.status === "ready" ? "met" : "blocked",
    requiredForGoal: true,
    evidence: report
      ? `${report.summary} Captured tools: ${capturedTools || "none"}. Live proof still required: ${report.liveProofStillRequired}.`
      : "The OpenClaw message rehearsal report is missing.",
    blockers: report?.status === "ready"
      ? []
      : report?.missingCapabilities ?? ["openclaw_message_rehearsal_missing_report"],
    commands: report?.commands.rehearsal
      ? [report.commands.rehearsal]
      : [command],
  };
}

function architectureSpineItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  const missing = REQUIRED_STATUS_SECTIONS.filter((key) => !section(status, key));
  return {
    key: "architecture_status_spine",
    label: "Architecture-first proof spine",
    status: missing.length === 0 ? "met" : "unverified",
    requiredForGoal: true,
    evidence: missing.length === 0
      ? "Unified status separates first-wow, integration absorption, local safety, voice fit, and live provider proof."
      : "Unified status is missing required proof sections.",
    blockers: missing,
    commands: ["pnpm --silent dearme:status"],
  };
}

function symphonyCoordinationItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  const integration = section(status, "integration_absorption_proof");
  const usesHandoffs = status.commands.integrationAudit.includes("--handoffs");
  const blockers = [
    ...(!integration ? ["missing_integration_absorption_proof"] : blockerNames(integration.blockedTargets)),
    ...(!usesHandoffs ? ["missing_handoff_audit_command"] : []),
  ];
  const ready = Boolean(integration?.ready && usesHandoffs);

  return {
    key: "symphony_coordination",
    label: "Symphony/worktree coordination is absorbed, not forked",
    status: ready ? "met" : blockers.length > 0 ? "blocked" : "unverified",
    requiredForGoal: true,
    evidence: integration
      ? `${integration.description} Command includes latest handoff audit: ${usesHandoffs}.`
      : "The integration absorption section is missing.",
    blockers,
    commands: [status.commands.integrationAudit],
  };
}

export async function inspectDearMePublicFirstRunLandingEvidence(): Promise<
  DearMeGoalAuditPublicFirstRunLandingEvidence
> {
  try {
    const source = await readFile(repoFile(PUBLIC_FIRST_RUN_LANDING_SOURCE), "utf8");
    const testSource = await readFile(repoFile(PUBLIC_FIRST_RUN_LANDING_TEST), "utf8");
    const contentsByFile = new Map([
      [PUBLIC_FIRST_RUN_LANDING_SOURCE, source],
      [PUBLIC_FIRST_RUN_LANDING_TEST, testSource],
    ]);
    const missing = PUBLIC_FIRST_RUN_LANDING_MARKERS
      .filter((marker) => !contentsByFile.get(marker.file)?.includes(marker.snippet))
      .map((marker) => marker.key);

    return {
      ready: missing.length === 0,
      evidence: missing.length === 0
        ? "Default and content routes start with one positioning sentence, a known-for input, private proof-pack CTA, live private-work receipts, a generated first-cycle report, and an approval-boundary promise; the regression test keeps dense workbench fetches behind user intent."
        : `Public first-run landing proof is missing ${missing.length} required source/test marker(s): ${missing.join(", ")}.`,
      missing,
    };
  } catch (error) {
    return {
      ready: false,
      evidence: "Public first-run landing proof could not read the product source or regression test.",
      missing: ["public_first_run_landing_files"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function publicFirstRunLandingItem(
  evidence?: DearMeGoalAuditPublicFirstRunLandingEvidence,
): DearMeGoalAuditItem {
  if (!evidence) {
    return {
      key: "public_first_run_landing",
      label: "Polsia-style public first-run landing",
      status: "unverified",
      requiredForGoal: true,
      evidence: "The default route has not been checked for the cold-start landing before the dense workbench.",
      blockers: ["public_first_run_landing_not_checked"],
      commands: [PUBLIC_FIRST_RUN_LANDING_TEST_COMMAND],
    };
  }

  return {
    key: "public_first_run_landing",
    label: "Polsia-style public first-run landing",
    status: evidence.ready ? "met" : "blocked",
    requiredForGoal: true,
    evidence: evidence.error ? `${evidence.evidence} ${evidence.error}` : evidence.evidence,
    blockers: evidence.ready ? [] : evidence.missing,
    commands: [PUBLIC_FIRST_RUN_LANDING_TEST_COMMAND],
  };
}

function commercialLoopItem(options: {
  key: DearMeGoalAuditItemKey;
  label: string;
  status: DearMeProofStatus;
  requiredKeys: readonly CommercialItemKey[];
  ready: (commercial: CommercialReadiness) => boolean;
  readyEvidence: string;
  commands: readonly string[];
}): DearMeGoalAuditItem {
  const commercial = options.status.commercialReadiness;
  if (!commercial) {
    return {
      key: options.key,
      label: options.label,
      status: "unverified",
      requiredForGoal: true,
      evidence: "The unified proof status did not include commercial readiness.",
      blockers: ["missing_commercial_readiness"],
      commands: [COMMERCIAL_PROOF_COMMANDS.releaseGate],
    };
  }

  const byKey = new Map(commercial.items.map((item) => [item.key, item]));
  const requiredItems = options.requiredKeys
    .map((key) => byKey.get(key))
    .filter((item): item is CommercialItem => Boolean(item));
  const missingKeys = options.requiredKeys.filter((key) => !byKey.has(key));
  const blockedItems = requiredItems.filter((item) => item.status !== "ready");
  const ready = missingKeys.length === 0 && blockedItems.length === 0 && options.ready(commercial);

  return {
    key: options.key,
    label: options.label,
    status: ready ? "met" : missingKeys.length > 0 ? "unverified" : "blocked",
    requiredForGoal: true,
    evidence: ready
      ? options.readyEvidence
      : [
        commercial.summary,
        ...blockedItems.map((item) => `${item.label}: ${item.remainingGap}`),
        ...missingKeys.map((key) => `Missing commercial readiness item: ${key}.`),
      ].join(" "),
    blockers: [
      ...blockedItems.map((item) => item.key),
      ...missingKeys.map((key) => `missing_${key}`),
      ...(!options.ready(commercial) && blockedItems.length === 0 && missingKeys.length === 0
        ? [commercial.status]
        : []),
    ],
    commands: [...options.commands],
  };
}

function commercialPrivateBetaLoopItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  return commercialLoopItem({
    key: "commercial_private_beta_loop",
    label: "Sellable private-beta paid access loop",
    status,
    requiredKeys: ["paid_access", "payment_path", "first_wow"],
    ready: (commercial) => commercial.canSellPrivateBeta,
    readyEvidence:
      "Paid access, private-beta payment path, and five-minute first-wow are ready from local commercial proofs.",
    commands: [
      COMMERCIAL_PROOF_COMMANDS.paidLoop,
      COMMERCIAL_PROOF_COMMANDS.paymentReadiness,
      COMMERCIAL_PROOF_COMMANDS.releaseGate,
    ],
  });
}

function paidUserOperationsLoopItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  return commercialLoopItem({
    key: "paid_user_operations_loop",
    label: "Paid-user operations and guardrail loop",
    status,
    requiredKeys: [
      "account_health_receipt",
      "autonomy_contract",
      "launch_boundary",
      "cost_guardrail",
    ],
    ready: (commercial) => commercial.canOperatePaidUsers,
    readyEvidence:
      "Paid account health, autonomous private operation, launch boundary, and cost guardrails are ready for paid users.",
    commands: [
      COMMERCIAL_PROOF_COMMANDS.paidOps,
      COMMERCIAL_PROOF_COMMANDS.supportRecovery,
      COMMERCIAL_PROOF_COMMANDS.releaseGate,
    ],
  });
}

function weeklyRetentionLoopItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  return commercialLoopItem({
    key: "weekly_retention_loop",
    label: "Weekly value and paid-retention loop",
    status,
    requiredKeys: [
      "weekly_value_receipt",
      "paid_retention_pulse",
      "empty_week_recovery",
    ],
    ready: (commercial) => commercial.canOperatePaidUsers,
    readyEvidence:
      "Weekly value receipts, paid retention pulse, and empty-week recovery are ready from the cohort-retention/support proofs.",
    commands: [
      COMMERCIAL_PROOF_COMMANDS.cohortRetention,
      COMMERCIAL_PROOF_COMMANDS.supportRecovery,
      COMMERCIAL_PROOF_COMMANDS.paidOps,
      COMMERCIAL_PROOF_COMMANDS.releaseGate,
    ],
  });
}

function feedbackSupportLearningLoopItem(status: DearMeProofStatus): DearMeGoalAuditItem {
  return commercialLoopItem({
    key: "feedback_support_learning_loop",
    label: "Feedback learning and support handoff loop",
    status,
    requiredKeys: [
      "feedback_learning",
      "support_handoff",
    ],
    ready: (commercial) => commercial.canOperatePaidUsers,
    readyEvidence:
      "Private feedback learning, Voice & Memory carry-forward, and support handoff are ready for paid-user operations.",
    commands: [
      COMMERCIAL_PROOF_COMMANDS.feedbackLearning,
      COMMERCIAL_PROOF_COMMANDS.cohortRetention,
      COMMERCIAL_PROOF_COMMANDS.supportRecovery,
      COMMERCIAL_PROOF_COMMANDS.releaseGate,
    ],
  });
}

function promptToArtifactChecklist(
  items: readonly DearMeGoalAuditItem[],
): DearMeGoalAuditPromptChecklistItem[] {
  const byKey = new Map(items.map((item) => [item.key, item]));
  return PROMPT_TO_ARTIFACT_REQUIREMENTS.map((requirement) => {
    const artifactItems = requirement.artifactItems
      .map((key) => byKey.get(key))
      .filter((item): item is DearMeGoalAuditItem => Boolean(item));
    const missing = artifactItems
      .filter((item) => item.status !== "met")
      .map((item) => item.label);
    const status: DearMeGoalAuditItemStatus = artifactItems.length === 0
      ? "unverified"
      : artifactItems.some((item) => item.status === "blocked")
        ? "blocked"
        : artifactItems.some((item) => item.status === "unverified")
          ? "unverified"
          : "met";

    return {
      key: requirement.key,
      promptRequirement: requirement.promptRequirement,
      artifactItems: [...requirement.artifactItems],
      status,
      evidence: artifactItems.length > 0
        ? artifactItems.map((item) => `${item.label}: ${item.status}`).join("; ")
        : "No audit artifact currently maps to this prompt requirement.",
      missing,
    };
  });
}

export function summarizeDearMeGoalAudit(
  status: DearMeProofStatus,
  hostRehearsal?: DearMeGoalAuditHostRehearsalEvidence,
  hostProvider?: DearMeGoalAuditHostProviderEvidence,
  openClawMessageRehearsal?: DearMeGoalAuditOpenClawMessageRehearsalEvidence,
  publicFirstRunLanding?: DearMeGoalAuditPublicFirstRunLandingEvidence,
): DearMeGoalAudit {
  const productionHost = focus(status, "production_host");
  const openclawMessages = focus(status, "openclaw_messages");
  const liveProvider = section(status, "live_provider_proof");
  const items: DearMeGoalAuditItem[] = [
    architectureSpineItem(status),
    sectionItem({
      key: "donor_reuse_absorption",
      label: "Naive/Paperclip reuse and worktree absorption",
      section: section(status, "integration_absorption_proof"),
      commands: [status.commands.integrationAudit],
      evidencePrefix: "Naive/Paperclip substrate evidence",
    }),
    symphonyCoordinationItem(status),
    publicFirstRunLandingItem(publicFirstRunLanding),
    combinedPrivateFirstWowItem(status),
    commercialPrivateBetaLoopItem(status),
    paidUserOperationsLoopItem(status),
    weeklyRetentionLoopItem(status),
    feedbackSupportLearningLoopItem(status),
    loopbackHostRehearsalItem(hostRehearsal),
    sectionItem({
      key: "voice_autonomy",
      label: "DearMe voice autonomy proof",
      section: section(status, "voice_semantic_proof"),
      commands: [status.commands.check],
    }),
    hostProviderAuthItem(hostProvider),
    focusItem({
      key: "production_host_live_wow",
      label: "Polsia-level phone-reachable private proof page",
      focus: productionHost,
    }),
    openClawMessageRehearsalItem(openClawMessageRehearsal),
    focusItem({
      key: "openclaw_message_reuse",
      label: "OpenClaw shared Telegram/iMessage message proof",
      focus: openclawMessages,
      commands: focusCommands(openclawMessages, OPENCLAW_MESSAGES_TARGET),
    }),
    sectionItem({
      key: "live_provider_set",
      label: "Live provider proof set",
      section: liveProvider,
      commands: status.commands.liveProviderSetup,
    }),
  ];

  const incompleteItem = items.find((item) =>
    item.requiredForGoal && item.status !== "met"
  );
  const promptChecklist = promptToArtifactChecklist(items);
  const complete = !incompleteItem;
  return {
    complete,
    verdict: complete
      ? "Goal audit: complete. DearMe has proven architecture, reuse, public first-run, private aha, commercial paid-user operations, Symphony absorption, OpenClaw message proof, and live provider proof."
      : `Goal audit: not complete. ${incompleteItem?.label ?? "A required item"} is still ${incompleteItem?.status ?? "unverified"}.`,
    promptToArtifactChecklist: promptChecklist,
    items,
    nextAction: incompleteItem
      ? {
        label: incompleteItem.label,
        reason: incompleteItem.blockers.length > 0
          ? `Blocked by ${incompleteItem.blockers.join(", ")}.`
          : "Evidence is missing from the unified proof status.",
        command: preferredNextCommand(incompleteItem.commands),
        ...ownerProofNextActionDetails(incompleteItem, status),
      }
      : {
        label: "Mark the active goal complete",
        reason: "Every required audit item is met by the current proof status.",
        command: GOAL_AUDIT_CHECK_COMMAND,
      },
  };
}

export async function buildDearMeGoalAudit(
  envFiles: readonly string[] = [],
  baseEnv: Env = process.env,
): Promise<DearMeGoalAudit> {
  const env = await loadDearMeProofEnv(envFiles, baseEnv);
  const status = summarizeDearMeProofStatus(
    inspectDearMeProofReadiness(env, "all"),
    "all",
    inspectDearMeIntegrationAuditStatus(),
  );
  let hostRehearsal: DearMeGoalAuditHostRehearsalEvidence;
  let hostRehearsalExportSiteDir: string | undefined;
  try {
    hostRehearsalExportSiteDir = await mkdtemp(
      join(tmpdir(), GOAL_AUDIT_HOST_REHEARSAL_TMP_PREFIX),
    );
    hostRehearsal = {
      report: await runDearMeHostRehearsal({
        port: 0,
        exportSiteDir: hostRehearsalExportSiteDir,
      }),
    };
  } catch (error) {
    hostRehearsal = {
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (hostRehearsalExportSiteDir) {
      await rm(hostRehearsalExportSiteDir, { recursive: true, force: true });
    }
  }
  let hostProvider: DearMeGoalAuditHostProviderEvidence;
  try {
    hostProvider = {
      audit: await inspectDearMeHostProviderAudit(env),
    };
  } catch (error) {
    hostProvider = {
      error: error instanceof Error ? error.message : String(error),
    };
  }
  let openClawMessageRehearsal: DearMeGoalAuditOpenClawMessageRehearsalEvidence;
  try {
    openClawMessageRehearsal = {
      report: await runDearMeOpenClawMessageRehearsal(),
    };
  } catch (error) {
    openClawMessageRehearsal = {
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const publicFirstRunLanding = await inspectDearMePublicFirstRunLandingEvidence();
  return summarizeDearMeGoalAudit(
    status,
    hostRehearsal,
    hostProvider,
    openClawMessageRehearsal,
    publicFirstRunLanding,
  );
}

export function formatDearMeGoalAudit(audit: DearMeGoalAudit): string[] {
  const lines = [
    "DearMe active goal completion audit",
    audit.verdict,
    "",
    "Prompt-to-artifact checklist:",
  ];

  for (const item of audit.promptToArtifactChecklist) {
    const marker = item.status === "met" ? "[x]" : "[ ]";
    const missing = item.missing.length > 0
      ? ` Missing: ${item.missing.join(", ")}.`
      : "";
    lines.push(`- ${marker} ${item.promptRequirement}: ${item.status}. ${item.evidence}.${missing}`);
  }

  lines.push("");
  lines.push(
    "Checklist:",
  );

  for (const item of audit.items) {
    const marker = item.status === "met" ? "[x]" : "[ ]";
    const blockers = item.blockers.length > 0
      ? ` Blockers: ${item.blockers.join(", ")}.`
      : "";
    lines.push(`- ${marker} ${item.label}: ${item.status}. ${item.evidence}${blockers}`);
  }

  lines.push("");
  lines.push("Next action:");
  lines.push(`- ${audit.nextAction.label}: ${audit.nextAction.reason}`);
  if (audit.nextAction.ownerFacts?.length) {
    lines.push("- Owner facts needed:");
    for (const fact of audit.nextAction.ownerFacts) {
      lines.push(`  - ${fact}`);
    }
  }
  if (audit.nextAction.captureCommands?.length) {
    lines.push("- Capture setup:");
    for (const command of audit.nextAction.captureCommands) {
      lines.push(`  - ${command}`);
    }
  }
  if (audit.nextAction.receiptPreviewCommand) {
    lines.push(`- Receipt preview: ${audit.nextAction.receiptPreviewCommand}`);
  }
  if (audit.nextAction.receiptImportCommand) {
    lines.push(`- Receipt import: ${audit.nextAction.receiptImportCommand}`);
  }
  if (audit.nextAction.noSendCheckCommand) {
    lines.push(`- No-send check: ${audit.nextAction.noSendCheckCommand}`);
  }
  if (audit.nextAction.guardedLiveCommands?.length) {
    lines.push("- Guarded live proof:");
    for (const command of audit.nextAction.guardedLiveCommands) {
      lines.push(`  - ${command}`);
    }
  }
  if (audit.nextAction.command) {
    lines.push(`- Run: ${audit.nextAction.command}`);
  }
  return lines;
}

export function parseDearMeGoalAuditArgs(argv: readonly string[]): DearMeGoalAuditArgs {
  const args: DearMeGoalAuditArgs = {
    help: false,
    json: false,
    check: false,
    envFiles: [],
  };
  const normalizedArgv = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--env-file") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--env-file requires a value");
      args.envFiles.push(next);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      const envFile = arg.slice("--env-file=".length);
      if (!envFile) throw new Error("--env-file requires a value");
      args.envFiles.push(envFile);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:goal-audit -- [--check] [--json] [--env-file <path>]

Runs the active DearMe goal completion audit from the same proof/status evidence
used by the coordinator. Default output is informational. Use --check to fail
when any required product/architecture/reuse/live-proof criterion is incomplete.`);
}

async function main() {
  try {
    const parsed = parseDearMeGoalAuditArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const audit = await buildDearMeGoalAudit(parsed.envFiles, process.env);
    if (parsed.json) {
      console.log(JSON.stringify({ audit }, null, 2));
    } else {
      for (const line of formatDearMeGoalAudit(audit)) {
        console.log(line);
      }
    }
    if (parsed.check && !audit.complete) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entrypoint) {
  void main();
}
