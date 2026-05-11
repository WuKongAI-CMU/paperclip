import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  dearMeProviderSmokeEnvTemplate,
  dearMeProviderSmokeOperatorCommands,
  formatDearMeProviderSmokeReadiness,
  inspectDearMeProviderSmokeReadiness,
  loadDearMeProviderSmokeEnv,
  runDearMeProviderSmoke,
  type DearMeProviderSmokeOptions,
  type DearMeProviderSmokeReadiness,
  type DearMeProviderSmokeResult,
} from "./dearme-provider-smoke.ts";
import {
  dearMeVoiceSmokeEnvTemplate,
  dearMeVoiceSmokeOperatorCommands,
  formatDearMeVoiceSmokeReadiness,
  inspectDearMeVoiceSmokeReadiness,
  runDearMeVoiceSmoke,
  type DearMeVoiceSmokeReadiness,
  type DearMeVoiceSmokeResult,
  type DearMeVoiceSmokeTarget,
} from "./dearme-voice-smoke.ts";
import {
  runDearMeAhaProof,
  type DearMeAhaProofReport,
} from "./dearme-aha-proof.ts";
import {
  runDearMeOpenClawMessageRehearsal,
  type DearMeOpenClawMessageRehearsalReport,
} from "./dearme-openclaw-message-rehearsal.ts";

type Env = Record<string, string | undefined>;

export type DearMeProofLane = "provider" | "voice" | "all";

export interface DearMeProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  status: boolean;
  printEnvTemplate: boolean;
  runSafe: boolean;
  lane: DearMeProofLane;
  envFiles: string[];
}

export type DearMeProofLaneReadiness =
  | {
      lane: "provider";
      readiness: DearMeProviderSmokeReadiness[];
    }
  | {
      lane: "voice";
      readiness: DearMeVoiceSmokeReadiness[];
    };

export interface DearMeProofReadiness {
  lanes: DearMeProofLaneReadiness[];
}

const DEARME_PROOF_CAPABILITY_LABELS = {
  production_host_opt_in: "enable production host smoke",
  production_custom_domain_opt_in: "enable custom-domain host smoke",
  public_https_host: "public HTTPS DearMe host",
  hosted_private_proof_artifact: "exported private proof artifact",
  proof_page_text_or_manifest: "proof-page text or host-smoke manifest",
  host_smoke_manifest_valid: "valid host-smoke manifest",
  host_smoke_checksums: "matching host-smoke checksums",
  linkedin_partner_endpoint: "LinkedIn partner endpoint",
  linkedin_credential: "LinkedIn partner credential",
  linkedin_recipient: "LinkedIn smoke recipient",
  linkedin_message_body: "LinkedIn smoke body",
  openclaw_gateway_endpoint: "shared message gateway endpoint",
  openclaw_gateway_auth: "shared message gateway auth",
  openclaw_message_contract: "local OpenClaw message contract rehearsal",
  telegram_recipient: "Telegram smoke recipient",
  telegram_message_body: "Telegram smoke body",
  imessage_recipient: "iMessage smoke recipient",
  meta_credential: "Meta campaign credential",
  live_confirmation: "live confirmation guard",
  unknown: "provider smoke setup",
} as const;

export type DearMeProofCapabilityKey = keyof typeof DEARME_PROOF_CAPABILITY_LABELS;

export interface DearMeProofCapabilityBlocker {
  key: DearMeProofCapabilityKey;
  label: string;
}

export interface DearMeProofStatusBlocker {
  lane: Exclude<DearMeProofLane, "all"> | "integration";
  target: string;
  missingCount: number;
  capabilities: DearMeProofCapabilityBlocker[];
  liveConfirmationRequired?: boolean;
}

export interface DearMeProofStatusSection {
  key:
    | "first_wow_aha_proof"
    | "integration_absorption_proof"
    | "openclaw_message_contract_proof"
    | "local_safe_proof"
    | "voice_semantic_proof"
    | "live_provider_proof";
  label: string;
  ready: boolean;
  description: string;
  targets: string[];
  blockedTargets: DearMeProofStatusBlocker[];
}

export type DearMeProofLiveProviderFocusKey =
  | "production_host"
  | "openclaw_messages"
  | "linkedin_dm"
  | "meta_campaign";

export interface DearMeProofLiveProviderFocus {
  key: DearMeProofLiveProviderFocusKey;
  label: string;
  ready: boolean;
  targets: DearMeProviderSmokeReadiness["target"][];
  blockedTargets: DearMeProofStatusBlocker[];
  missingCapabilities: DearMeProofCapabilityBlocker[];
  reason: string;
  operatorCommand: string;
}

export interface DearMeProofStatus {
  lane: DearMeProofLane;
  sections: DearMeProofStatusSection[];
  liveProviderFocus: DearMeProofLiveProviderFocus[];
  commands: {
    ahaProof: string;
    integrationAudit: string;
    openClawMessageRehearsal: string;
    printEnvTemplate: string;
    runSafe: string;
    check: string;
    liveProviderSetup: string[];
  };
}

export type DearMeProofSafeLaneResult =
  | {
      lane: "provider";
      results: DearMeProviderSmokeResult[];
    }
  | {
      lane: "voice";
      results: DearMeVoiceSmokeResult[];
    };

export interface DearMeProofSafeResult {
  lanes: DearMeProofSafeLaneResult[];
}

export interface DearMeProofSafeOptions {
  lane?: DearMeProofLane;
  env?: Env;
  fetch?: DearMeProviderSmokeOptions["fetch"];
  now?: () => Date;
}

export interface DearMeIntegrationAuditStatus {
  ready: boolean;
  command: string;
  worktrees: number | null;
  reviewedAbsorbed: number | null;
  inCurrent: number | null;
  notInCurrent: number | null;
  dirty: number | null;
  latestHandoffs: number | null;
  latestCommittedHandoffs: number | null;
  latestDirtyHandoffs: number | null;
  latestNoFileChangesHandoffs: number | null;
  unavailableReason?: string;
}

export type DearMeOpenClawMessageContractTarget =
  | "telegram_message"
  | "imessage_message";

export interface DearMeOpenClawMessageContractStatus {
  ready: boolean;
  command: string;
  targets: DearMeOpenClawMessageContractTarget[];
  capturedTools: string[];
  summary: string;
  unavailableReason?: string;
}

interface DearMeWorktreeSummaryJson {
  summary?: {
    total?: number;
    reviewed_absorbed?: number;
    in_current?: number;
    not_in_current?: number;
    dirty?: number;
  };
  handoffSummary?: {
    latestIssueCount?: number;
    latestByIssue?: Record<string, unknown>;
    latestByMode?: {
      committed_patch?: number;
      dirty_patch_handoff?: number;
      no_file_changes?: number;
    };
  };
}

const PROOF_ENV_FILE = ".dearme-proof.env";
const PRIVATE_SITE_EXPORT_COMMAND =
  "pnpm --silent dearme:aha-proof -- --export-site dist/dearme-private-proof";
const INTEGRATION_AUDIT_COMMAND =
  "pnpm --silent dearme:worktrees -- --summary-only --skip-dirty --handoffs";
const OPENCLAW_MESSAGE_REHEARSAL_COMMAND =
  "pnpm --silent dearme:openclaw-message-rehearsal -- --json";
const OPENCLAW_MESSAGE_CONTRACT_TARGETS = [
  "telegram_message",
  "imessage_message",
] as const satisfies readonly DearMeOpenClawMessageContractTarget[];
const INTEGRATION_AUDIT_SCRIPT_ARGS = [
  "--summary-json",
  "--skip-dirty",
  "--handoffs",
] as const;
const INTEGRATION_AUDIT_TIMEOUT_MS = 60_000;
const LIVE_PROVIDER_FOCUS_PLAN = [
  {
    key: "production_host",
    label: "Production host smoke",
    targets: ["deploy_site_production"],
    reason:
      "Polsia-level first wow starts with a phone-reachable private proof page before live sends.",
    operatorCommand:
      `pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --target deploy_site_production`,
  },
  {
    key: "openclaw_messages",
    label: "OpenClaw message smoke",
    targets: ["telegram_message", "imessage_message"],
    reason:
      "Naive-style substrate reuse is strongest when one OpenClaw gateway proves Telegram and iMessage together.",
    operatorCommand:
      `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --target openclaw_messages --live`,
  },
  {
    key: "linkedin_dm",
    label: "LinkedIn DM smoke",
    targets: ["linkedin_dm"],
    reason:
      "Use targeted outreach only after the private page can be opened from a phone.",
    operatorCommand:
      `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --target linkedin_dm --live`,
  },
  {
    key: "meta_campaign",
    label: "Meta campaign smoke",
    targets: ["meta_campaign"],
    reason:
      "Spend-bearing proof stays last; it should validate distribution after host and message lanes are proven.",
    operatorCommand:
      `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --target meta_campaign --live`,
  },
] as const satisfies readonly {
  key: DearMeProofLiveProviderFocusKey;
  label: string;
  targets: readonly DearMeProviderSmokeReadiness["target"][];
  reason: string;
  operatorCommand: string;
}[];

function includesLane(selected: DearMeProofLane, lane: Exclude<DearMeProofLane, "all">) {
  return selected === "all" || selected === lane;
}

function normalizeLane(value: string): DearMeProofLane {
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  switch (normalized) {
    case "all":
    case "proof":
      return "all";
    case "provider":
    case "providers":
    case "channel":
    case "channels":
    case "dispatch":
      return "provider";
    case "voice":
    case "voice_gate":
    case "voice_smoke":
      return "voice";
    default:
      throw new Error(`unknown DearMe proof lane: ${value}`);
  }
}

export function parseDearMeProofArgs(argv: readonly string[]): DearMeProofArgs {
  const args: DearMeProofArgs = {
    help: false,
    json: false,
    check: false,
    status: false,
    printEnvTemplate: false,
    runSafe: false,
    lane: "all",
    envFiles: [],
  };

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--status") {
      args.status = true;
    } else if (arg === "--print-env-template") {
      args.printEnvTemplate = true;
    } else if (arg === "--run-safe" || arg === "--safe") {
      args.runSafe = true;
    } else if (arg === "--env-file") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--env-file requires a value");
      args.envFiles.push(next);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      const envFile = arg.slice("--env-file=".length);
      if (!envFile) throw new Error("--env-file requires a value");
      args.envFiles.push(envFile);
    } else if (arg === "--lane") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--lane requires a value");
      args.lane = normalizeLane(next);
      index += 1;
    } else if (arg.startsWith("--lane=")) {
      args.lane = normalizeLane(arg.slice("--lane=".length));
    } else if (!arg.startsWith("-")) {
      args.lane = normalizeLane(arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

export async function loadDearMeProofEnv(
  envFiles: readonly string[] = [],
  baseEnv: Env = process.env,
  defaultEnvFile = PROOF_ENV_FILE,
): Promise<Env> {
  return loadDearMeProviderSmokeEnv(
    await resolveDearMeProofEnvFiles(envFiles, defaultEnvFile),
    baseEnv,
  );
}

export async function resolveDearMeProofEnvFiles(
  envFiles: readonly string[] = [],
  defaultEnvFile = PROOF_ENV_FILE,
): Promise<string[]> {
  if (envFiles.length > 0) return [...envFiles];

  try {
    await access(defaultEnvFile);
    return [defaultEnvFile];
  } catch {
    return [];
  }
}

export function inspectDearMeProofReadiness(
  env: Env = process.env,
  lane: DearMeProofLane = "all",
): DearMeProofReadiness {
  const lanes: DearMeProofLaneReadiness[] = [];

  if (includesLane(lane, "provider")) {
    lanes.push({
      lane: "provider",
      readiness: inspectDearMeProviderSmokeReadiness(env, "all"),
    });
  }

  if (includesLane(lane, "voice")) {
    lanes.push({
      lane: "voice",
      readiness: inspectDearMeVoiceSmokeReadiness(env, "all"),
    });
  }

  return { lanes };
}

function hasBlockedReadiness(readiness: DearMeProofReadiness) {
  return readiness.lanes.some((lane) =>
    lane.readiness.some((item) => !item.ready),
  );
}

function laneFlag(lane: DearMeProofLane) {
  return lane === "all" ? "" : ` --lane ${lane}`;
}

function proofCommand(action: "--check" | "--run-safe", lane: DearMeProofLane) {
  return `pnpm --silent dearme:proof -- ${action}${laneFlag(lane)}`;
}

function replaceChildEnvFile(command: string) {
  return command
    .replaceAll(".dearme-provider-smoke.env", PROOF_ENV_FILE)
    .replaceAll(".dearme-voice-smoke.env", PROOF_ENV_FILE);
}

function childRunCommands(commands: readonly string[]) {
  return commands
    .filter((command) =>
      !command.includes("--print-env-template") && !command.includes(" --check"),
    )
    .map(replaceChildEnvFile);
}

function uniqueCommands(commands: readonly string[]) {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

function needsPrivateSiteExport(
  blockedTargets: readonly DearMeProviderSmokeReadiness["target"][],
) {
  return blockedTargets.includes("deploy_site_production") ||
    blockedTargets.includes("deploy_site_host_rehearsal");
}

export function dearMeProofOperatorCommands(
  readiness: DearMeProofReadiness,
  lane: DearMeProofLane = "all",
): string[] {
  const printEnvCommand =
    `pnpm --silent dearme:proof -- --print-env-template${laneFlag(lane)} > ${PROOF_ENV_FILE}`;
  const precheckCommands: string[] = [];
  const setupCommands: string[] = [];

  for (const laneReadiness of readiness.lanes) {
    const blockedTargets = laneReadiness.readiness
      .filter((item) => !item.ready)
      .map((item) => item.target);
    if (blockedTargets.length === 0) continue;

    if (laneReadiness.lane === "provider") {
      if (needsPrivateSiteExport(blockedTargets)) {
        precheckCommands.push(PRIVATE_SITE_EXPORT_COMMAND);
      }
      setupCommands.push(
        ...childRunCommands(dearMeProviderSmokeOperatorCommands(blockedTargets)),
      );
    } else {
      setupCommands.push(
        ...childRunCommands(dearMeVoiceSmokeOperatorCommands(
          blockedTargets as DearMeVoiceSmokeTarget[],
        )),
      );
    }
  }

  return uniqueCommands([
    printEnvCommand,
    ...precheckCommands,
    `pnpm --silent dearme:proof -- --check${laneFlag(lane)}`,
    ...setupCommands,
  ]);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseDearMeIntegrationAuditStatus(
  jsonText: string,
): DearMeIntegrationAuditStatus {
  const parsed = JSON.parse(jsonText) as DearMeWorktreeSummaryJson;
  const summary = parsed.summary ?? {};
  const handoffSummary = parsed.handoffSummary;
  const latestHandoffs = numberOrNull(handoffSummary?.latestIssueCount)
    ?? (handoffSummary?.latestByIssue
      ? Object.keys(handoffSummary.latestByIssue).length
      : null);
  const latestCommittedHandoffs = numberOrNull(
    handoffSummary?.latestByMode?.committed_patch,
  ) ?? 0;
  const latestDirtyHandoffs = numberOrNull(
    handoffSummary?.latestByMode?.dirty_patch_handoff,
  ) ?? 0;
  const latestNoFileChangesHandoffs = numberOrNull(
    handoffSummary?.latestByMode?.no_file_changes,
  ) ?? 0;
  const notInCurrent = numberOrNull(summary.not_in_current) ?? 0;
  const dirty = numberOrNull(summary.dirty) ?? 0;
  const latestHandoffBlocked = latestHandoffs !== null
    && (latestCommittedHandoffs !== latestHandoffs
      || latestDirtyHandoffs > 0
      || latestNoFileChangesHandoffs > 0);

  return {
    ready: notInCurrent === 0 && dirty === 0 && !latestHandoffBlocked,
    command: INTEGRATION_AUDIT_COMMAND,
    worktrees: numberOrNull(summary.total),
    reviewedAbsorbed: numberOrNull(summary.reviewed_absorbed),
    inCurrent: numberOrNull(summary.in_current),
    notInCurrent,
    dirty,
    latestHandoffs,
    latestCommittedHandoffs,
    latestDirtyHandoffs,
    latestNoFileChangesHandoffs,
  };
}

export function inspectDearMeIntegrationAuditStatus(): DearMeIntegrationAuditStatus {
  const scriptPath = fileURLToPath(new URL("./dearme-worktree-status.mjs", import.meta.url));

  try {
    return parseDearMeIntegrationAuditStatus(
      execFileSync("node", [scriptPath, ...INTEGRATION_AUDIT_SCRIPT_ARGS], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: INTEGRATION_AUDIT_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      }),
    );
  } catch (error) {
    return {
      ready: false,
      command: INTEGRATION_AUDIT_COMMAND,
      worktrees: null,
      reviewedAbsorbed: null,
      inCurrent: null,
      notInCurrent: null,
      dirty: null,
      latestHandoffs: null,
      latestCommittedHandoffs: null,
      latestDirtyHandoffs: null,
      latestNoFileChangesHandoffs: null,
      unavailableReason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function parseDearMeOpenClawMessageContractStatus(
  report: DearMeOpenClawMessageRehearsalReport,
): DearMeOpenClawMessageContractStatus {
  const capturedTargets = new Set(
    report.captured.map((item) => item.target),
  );
  const deliveredTargets = new Set(
    report.results
      .filter((item) => item.status === "delivered")
      .map((item) => item.target),
  );
  const ready = report.status === "ready"
    && OPENCLAW_MESSAGE_CONTRACT_TARGETS.every((target) =>
      capturedTargets.has(target) && deliveredTargets.has(target)
    );

  return {
    ready,
    command: OPENCLAW_MESSAGE_REHEARSAL_COMMAND,
    targets: [...OPENCLAW_MESSAGE_CONTRACT_TARGETS],
    capturedTools: report.captured.map((item) => item.toolName),
    summary: report.summary,
  };
}

export async function inspectDearMeOpenClawMessageContractStatus(): Promise<
  DearMeOpenClawMessageContractStatus
> {
  try {
    return parseDearMeOpenClawMessageContractStatus(
      await runDearMeOpenClawMessageRehearsal(),
    );
  } catch (error) {
    return {
      ready: false,
      command: OPENCLAW_MESSAGE_REHEARSAL_COMMAND,
      targets: [...OPENCLAW_MESSAGE_CONTRACT_TARGETS],
      capturedTools: [],
      summary:
        "DearMe could not run the shared OpenClaw Telegram and iMessage contract rehearsal locally.",
      unavailableReason: error instanceof Error ? error.message : String(error),
    };
  }
}

function providerLane(readiness: DearMeProofReadiness) {
  return readiness.lanes.find((lane) => lane.lane === "provider");
}

function voiceLane(readiness: DearMeProofReadiness) {
  return readiness.lanes.find((lane) => lane.lane === "voice");
}

function capabilityBlocker(key: DearMeProofCapabilityKey): DearMeProofCapabilityBlocker {
  return {
    key,
    label: DEARME_PROOF_CAPABILITY_LABELS[key],
  };
}

function uniqueCapabilityBlockers(
  blockers: readonly DearMeProofCapabilityBlocker[],
): DearMeProofCapabilityBlocker[] {
  const seen = new Set<DearMeProofCapabilityKey>();
  return blockers.filter((blocker) => {
    if (seen.has(blocker.key)) return false;
    seen.add(blocker.key);
    return true;
  });
}

function providerCapabilityForMissing(requirement: string): DearMeProofCapabilityBlocker {
  if (requirement.includes("DEARME_DEPLOY_SITE_ALLOW_PRODUCTION")) {
    return capabilityBlocker("production_host_opt_in");
  }
  if (requirement.includes("DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS")) {
    return capabilityBlocker("production_custom_domain_opt_in");
  }
  if (requirement.includes("DEARME_DEPLOY_SITE_BASE_URL")) {
    return capabilityBlocker("public_https_host");
  }
  if (requirement.includes("DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF")) {
    return capabilityBlocker("hosted_private_proof_artifact");
  }
  if (
    requirement.includes("DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT") ||
    requirement.includes("DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF") ||
    requirement.includes("expectedText")
  ) {
    return capabilityBlocker("proof_page_text_or_manifest");
  }
  if (requirement.includes("checksum")) {
    return capabilityBlocker("host_smoke_checksums");
  }
  if (
    requirement.includes("host-smoke.json") ||
    requirement.includes("host-smoke") ||
    requirement.includes("manifest")
  ) {
    return capabilityBlocker("host_smoke_manifest_valid");
  }
  if (requirement.includes("DEARME_LINKEDIN_DM_MESSAGES_URL")) {
    return capabilityBlocker("linkedin_partner_endpoint");
  }
  if (
    requirement.includes("DEARME_LINKEDIN_DM_CREDENTIAL_JSON") ||
    requirement.includes("DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE")
  ) {
    return capabilityBlocker("linkedin_credential");
  }
  if (requirement.includes("DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN")) {
    return capabilityBlocker("linkedin_recipient");
  }
  if (requirement.includes("DEARME_LINKEDIN_DM_SMOKE_BODY")) {
    return capabilityBlocker("linkedin_message_body");
  }
  if (requirement.includes("OPENCLAW_GATEWAY_URL")) {
    return capabilityBlocker("openclaw_gateway_endpoint");
  }
  if (
    requirement.includes("OPENCLAW_GATEWAY_TOKEN") ||
    requirement.includes("OPENCLAW_WEBHOOK_AUTH")
  ) {
    return capabilityBlocker("openclaw_gateway_auth");
  }
  if (requirement.includes("DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT")) {
    return capabilityBlocker("telegram_recipient");
  }
  if (requirement.includes("DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY")) {
    return capabilityBlocker("telegram_message_body");
  }
  if (requirement.includes("DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT")) {
    return capabilityBlocker("imessage_recipient");
  }
  if (
    requirement.includes("DEARME_META_CAMPAIGN_CREDENTIAL_JSON") ||
    requirement.includes("DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE")
  ) {
    return capabilityBlocker("meta_credential");
  }
  if (
    requirement.includes("DEARME_PROVIDER_SMOKE_CONFIRM_LIVE") ||
    requirement.includes("--live")
  ) {
    return capabilityBlocker("live_confirmation");
  }
  return capabilityBlocker("unknown");
}

function providerCapabilityBlockers(
  missing: readonly string[],
): DearMeProofCapabilityBlocker[] {
  return uniqueCapabilityBlockers(missing.map(providerCapabilityForMissing));
}

function missingCapabilitiesForBlockers(
  blockers: readonly DearMeProofStatusBlocker[],
): DearMeProofCapabilityBlocker[] {
  return uniqueCapabilityBlockers(blockers.flatMap((item) => item.capabilities));
}

function blockedProviderTargets(
  readiness: readonly DearMeProviderSmokeReadiness[],
  targets: readonly DearMeProviderSmokeReadiness["target"][],
): DearMeProofStatusBlocker[] {
  return readiness
    .filter((item) => targets.includes(item.target) && !item.ready)
    .map((item) => ({
      lane: "provider" as const,
      target: item.target,
      missingCount: item.missing.length,
      capabilities: providerCapabilityBlockers(item.missing),
      liveConfirmationRequired: item.liveConfirmationRequired,
    }));
}

function blockedVoiceTargets(
  readiness: readonly DearMeVoiceSmokeReadiness[],
  targets: readonly DearMeVoiceSmokeReadiness["target"][],
): DearMeProofStatusBlocker[] {
  return readiness
    .filter((item) => targets.includes(item.target) && !item.ready)
    .map((item) => ({
      lane: "voice" as const,
      target: item.target,
      missingCount: item.missing.length,
      capabilities: [],
    }));
}

function liveProviderSetupCommands(
  blockedTargets: readonly DearMeProviderSmokeReadiness["target"][],
  lane: DearMeProofLane,
): string[] {
  if (blockedTargets.length === 0) return [];
  const commands = [
    `pnpm --silent dearme:proof -- --print-env-template${laneFlag(lane)} > ${PROOF_ENV_FILE}`,
  ];
  if (needsPrivateSiteExport(blockedTargets)) {
    commands.push(PRIVATE_SITE_EXPORT_COMMAND);
  }
  commands.push(
    `pnpm --silent dearme:provider-smoke -- --env-file ${PROOF_ENV_FILE} --check`,
    ...childRunCommands(dearMeProviderSmokeOperatorCommands(blockedTargets)),
  );
  return uniqueCommands(commands);
}

function liveProviderFocusPlan(
  provider: DearMeProofLaneReadiness & { lane: "provider" },
): DearMeProofLiveProviderFocus[] {
  return LIVE_PROVIDER_FOCUS_PLAN.map((item) => {
    const blockedTargets = blockedProviderTargets(provider.readiness, item.targets);
    return {
      key: item.key,
      label: item.label,
      ready: blockedTargets.length === 0,
      targets: [...item.targets],
      blockedTargets,
      missingCapabilities: missingCapabilitiesForBlockers(blockedTargets),
      reason: item.reason,
      operatorCommand: item.operatorCommand,
    };
  });
}

function liveProviderProofDescription(
  blockedTargets: readonly DearMeProofStatusBlocker[],
) {
  if (blockedTargets.length === 0) {
    return "Production host and live external channels are ready.";
  }
  const productionHostReady = !blockedTargets.some((item) =>
    item.target === "deploy_site_production"
  );
  if (productionHostReady) {
    return "Production host proof is ready; external channel recipient and credential proof is still required before live provider proof is complete.";
  }
  return "Requires the real production host and external channel credentials before live proof.";
}

function firstWowAhaSection(report: DearMeAhaProofReport): DearMeProofStatusSection {
  return {
    key: "first_wow_aha_proof",
    label: "First-wow aha proof",
    ready: report.status === "ready",
    description: `${report.summary} Includes one-sentence start, five-minute sequence, private outputs, recurring private work, phone-ready private site artifact, minimum team, launch boundaries, and customer-safe language.`,
    targets: report.checks.map((item) => item.key),
    blockedTargets: [],
  };
}

function integrationAuditDescription(audit: DearMeIntegrationAuditStatus) {
  if (audit.unavailableReason) {
    return `Coordinator integration audit could not run. Run ${audit.command} for the current worktree and handoff state.`;
  }

  const handoffText = audit.latestHandoffs === null
    ? "latest Symphony handoffs were not included"
    : `latest Symphony handoffs ${audit.latestCommittedHandoffs}/${audit.latestHandoffs} committed`;
  return [
    `Worktree audit shows ${audit.worktrees ?? "unknown"} tracked worktrees`,
    `${audit.reviewedAbsorbed ?? 0} reviewed absorptions`,
    `${audit.inCurrent ?? 0} already in current head`,
    `${audit.notInCurrent ?? 0} not-in-current replay candidates`,
    `${audit.dirty ?? 0} dirty lanes`,
    `${handoffText}`,
  ].join(", ") + ".";
}

function integrationAuditBlockers(
  audit: DearMeIntegrationAuditStatus,
): DearMeProofStatusBlocker[] {
  const blockers: DearMeProofStatusBlocker[] = [];
  if (audit.unavailableReason) {
    blockers.push({
      lane: "integration",
      target: "integration_audit_unavailable",
      missingCount: 1,
      capabilities: [],
    });
  }
  if ((audit.notInCurrent ?? 0) > 0) {
    blockers.push({
      lane: "integration",
      target: "not_in_current_worktrees",
      missingCount: audit.notInCurrent ?? 0,
      capabilities: [],
    });
  }
  if ((audit.dirty ?? 0) > 0) {
    blockers.push({
      lane: "integration",
      target: "dirty_worktrees",
      missingCount: audit.dirty ?? 0,
      capabilities: [],
    });
  }
  if ((audit.latestDirtyHandoffs ?? 0) > 0) {
    blockers.push({
      lane: "integration",
      target: "latest_dirty_handoffs",
      missingCount: audit.latestDirtyHandoffs ?? 0,
      capabilities: [],
    });
  }
  if ((audit.latestNoFileChangesHandoffs ?? 0) > 0) {
    blockers.push({
      lane: "integration",
      target: "latest_no_file_change_handoffs",
      missingCount: audit.latestNoFileChangesHandoffs ?? 0,
      capabilities: [],
    });
  }
  if (
    audit.latestHandoffs !== null
    && audit.latestCommittedHandoffs !== null
    && audit.latestCommittedHandoffs < audit.latestHandoffs
  ) {
    blockers.push({
      lane: "integration",
      target: "latest_uncommitted_handoffs",
      missingCount: audit.latestHandoffs - audit.latestCommittedHandoffs,
      capabilities: [],
    });
  }
  return blockers;
}

function integrationAuditSection(
  audit: DearMeIntegrationAuditStatus,
): DearMeProofStatusSection {
  return {
    key: "integration_absorption_proof",
    label: "Integration absorption proof",
    ready: audit.ready,
    description: integrationAuditDescription(audit),
    targets: ["worktree_absorption", "latest_symphony_handoffs"],
    blockedTargets: integrationAuditBlockers(audit),
  };
}

function openClawMessageContractBlockers(
  contract: DearMeOpenClawMessageContractStatus,
): DearMeProofStatusBlocker[] {
  if (contract.ready) return [];
  return [{
    lane: "provider",
    target: contract.unavailableReason
      ? "openclaw_message_contract_unavailable"
      : "openclaw_message_contract_rehearsal",
    missingCount: 1,
    capabilities: [capabilityBlocker("openclaw_message_contract")],
  }];
}

function openClawMessageContractDescription(
  contract: DearMeOpenClawMessageContractStatus,
) {
  if (contract.unavailableReason) {
    return `OpenClaw contract rehearsal could not run. Run ${contract.command} before attempting the live shared-message smoke.`;
  }

  const captured = contract.capturedTools.length > 0
    ? ` Captured tools: ${contract.capturedTools.join(", ")}.`
    : "";
  return `${contract.summary} Live provider proof still requires the provider readiness check, explicit recipient proof, and live-send confirmation.${captured}`;
}

function openClawMessageContractSection(
  contract: DearMeOpenClawMessageContractStatus,
): DearMeProofStatusSection {
  return {
    key: "openclaw_message_contract_proof",
    label: "OpenClaw message contract proof",
    ready: contract.ready,
    description: openClawMessageContractDescription(contract),
    targets: contract.targets,
    blockedTargets: openClawMessageContractBlockers(contract),
  };
}

export function summarizeDearMeProofStatus(
  readiness: DearMeProofReadiness,
  lane: DearMeProofLane = "all",
  integrationAudit?: DearMeIntegrationAuditStatus,
  openClawMessageContract?: DearMeOpenClawMessageContractStatus,
): DearMeProofStatus {
  const provider = providerLane(readiness);
  const voice = voiceLane(readiness);
  const sections: DearMeProofStatusSection[] = [];
  let liveProviderSetup: string[] = [];
  let liveProviderFocus: DearMeProofLiveProviderFocus[] = [];

  if (lane === "all") {
    sections.push(firstWowAhaSection(runDearMeAhaProof().report));
    if (integrationAudit) {
      sections.push(integrationAuditSection(integrationAudit));
    }
    if (openClawMessageContract) {
      sections.push(openClawMessageContractSection(openClawMessageContract));
    }
  }

  const localTargets: string[] = [];
  const localBlocked: DearMeProofStatusBlocker[] = [];
  if (provider) {
    localTargets.push("deploy_site_preview");
    localBlocked.push(...blockedProviderTargets(provider.readiness, ["deploy_site_preview"]));
  }
  if (voice) {
    localTargets.push("deterministic_gate");
    localBlocked.push(...blockedVoiceTargets(voice.readiness, ["deterministic_gate"]));
  }
  if (localTargets.length > 0) {
    sections.push({
      key: "local_safe_proof",
      label: "Local no-send proof",
      ready: localBlocked.length === 0,
      description: "Runs without sends, production deploy, spend, or live model calls.",
      targets: localTargets,
      blockedTargets: localBlocked,
    });
  }

  if (voice) {
    const targets = ["profile_token_semantic"] as const;
    const blockedTargets = blockedVoiceTargets(voice.readiness, targets);
    sections.push({
      key: "voice_semantic_proof",
      label: "Voice semantic proof",
      ready: blockedTargets.length === 0,
      description: "Uses the local profile-token scorer seam until a live embedding/model scorer is plugged in.",
      targets: [...targets],
      blockedTargets,
    });
  }

  if (provider) {
    const targets = [
      "deploy_site_production",
      "linkedin_dm",
      "telegram_message",
      "imessage_message",
      "meta_campaign",
    ] as const;
    const blockedTargets = blockedProviderTargets(provider.readiness, targets);
    liveProviderSetup = liveProviderSetupCommands(
      blockedTargets.map((item) => item.target as DearMeProviderSmokeReadiness["target"]),
      lane,
    );
    liveProviderFocus = liveProviderFocusPlan(provider);
    sections.push({
      key: "live_provider_proof",
      label: "Live provider proof",
      ready: blockedTargets.length === 0,
      description: liveProviderProofDescription(blockedTargets),
      targets: [...targets],
      blockedTargets,
    });
  }

  return {
    lane,
    sections,
    liveProviderFocus,
    commands: {
      ahaProof: "pnpm --silent dearme:aha-proof -- --check",
      integrationAudit: INTEGRATION_AUDIT_COMMAND,
      openClawMessageRehearsal: OPENCLAW_MESSAGE_REHEARSAL_COMMAND,
      printEnvTemplate: `pnpm --silent dearme:proof -- --print-env-template${laneFlag(lane)} > ${PROOF_ENV_FILE}`,
      runSafe: proofCommand("--run-safe", lane),
      check: proofCommand("--check", lane),
      liveProviderSetup,
    },
  };
}

function formatCapabilityBlockers(capabilities: readonly DearMeProofCapabilityBlocker[]) {
  if (capabilities.length === 0) return "";
  return ` Needs: ${capabilities.map((item) => item.label).join("; ")}.`;
}

function formatBlockedTargets(blockedTargets: readonly DearMeProofStatusBlocker[]) {
  if (blockedTargets.length === 0) return "";
  const targets = blockedTargets.map((item) => item.target).join(", ");
  return ` Blocked targets: ${targets}.${formatCapabilityBlockers(
    missingCapabilitiesForBlockers(blockedTargets),
  )}`;
}

function statusSection(
  status: DearMeProofStatus,
  key: DearMeProofStatusSection["key"],
): DearMeProofStatusSection | undefined {
  return status.sections.find((section) => section.key === key);
}

function hasBlockedTarget(
  section: DearMeProofStatusSection | undefined,
  target: DearMeProofStatusBlocker["target"],
) {
  return section?.blockedTargets.some((item) => item.target === target) ?? false;
}

function formatProductVerdict(status: DearMeProofStatus) {
  const aha = statusSection(status, "first_wow_aha_proof");
  const integration = statusSection(status, "integration_absorption_proof");
  const openClawContract = statusSection(status, "openclaw_message_contract_proof");
  const local = statusSection(status, "local_safe_proof");
  const voice = statusSection(status, "voice_semantic_proof");
  const live = statusSection(status, "live_provider_proof");

  if (integration && !integration.ready) {
    return "Product verdict: product proof exists, but the integration audit still has replay or handoff blockers.";
  }
  if ((integration?.ready ?? true) && aha?.ready && local?.ready && voice?.ready && live?.ready) {
    return "Product verdict: first-wow, local safe proof, voice fit, integration absorption, and live provider proof are ready.";
  }
  if (
    (integration?.ready ?? true)
    && (openClawContract?.ready ?? false)
    && (aha?.ready ?? true)
    && local?.ready
    && voice?.ready
    && live
    && !live.ready
  ) {
    if (!hasBlockedTarget(live, "deploy_site_production")) {
      return "Product verdict: Naive/Paperclip/OpenClaw substrate proof is strong, integration absorption is clean, and the private DearMe first-wow is phone-reachable; the remaining Polsia gap is live channel/provider proof.";
    }
    return "Product verdict: Naive/Paperclip/OpenClaw substrate proof is strong, integration absorption is clean, and the private DearMe first-wow now includes recurring work; Polsia-style live, phone-reachable wow is still blocked on live provider proof.";
  }
  if ((integration?.ready ?? true) && (aha?.ready ?? true) && local?.ready && voice?.ready && live && !live.ready) {
    if (!hasBlockedTarget(live, "deploy_site_production")) {
      return "Product verdict: Naive/Paperclip substrate proof is strong, integration absorption is clean, and the private DearMe first-wow is phone-reachable; the remaining Polsia gap is live channel/provider proof.";
    }
    return "Product verdict: Naive/Paperclip substrate proof is strong, integration absorption is clean, and the private DearMe first-wow now includes recurring work; Polsia-style live, phone-reachable wow is still blocked on live provider proof.";
  }
  if (aha && !aha.ready) {
    return "Product verdict: the product is not ready for a first-wow claim until the local aha proof passes.";
  }
  if (local?.ready && voice && !voice.ready) {
    return "Product verdict: private first-wow proof exists, but voice fit and live provider proof still need work before a launch-ready demo claim.";
  }
  if (local && !local.ready) {
    return "Product verdict: the product is not ready for a first-wow claim until local no-send proof passes.";
  }
  return "Product verdict: scoped proof status only; run the all-lane status before making a product-readiness claim.";
}

export function formatDearMeProofStatus(status: DearMeProofStatus): string[] {
  const lines = ["DearMe product proof status"];
  lines.push(formatProductVerdict(status));
  for (const section of status.sections) {
    lines.push(
      `- ${section.label}: ${section.ready ? "ready" : "blocked"}. ${section.description}${formatBlockedTargets(section.blockedTargets)}`,
    );
  }

  if (status.liveProviderFocus.length > 0) {
    lines.push("");
    lines.push("Next live proof focus:");
    for (const focus of status.liveProviderFocus) {
      const state = focus.ready
        ? "ready"
        : `blocked on ${focus.blockedTargets.map((item) => item.target).join(", ")}`;
      lines.push(
        `- ${focus.label}: ${state}.${formatCapabilityBlockers(focus.missingCapabilities)} ${focus.reason} Run: ${focus.operatorCommand}`,
      );
    }
  }

  lines.push("");
  lines.push("Commands:");
  if (status.lane === "all") {
    lines.push(`- ${status.commands.ahaProof}`);
    lines.push(`- ${status.commands.integrationAudit}`);
    lines.push(`- ${status.commands.openClawMessageRehearsal}`);
  }
  lines.push(`- ${status.commands.printEnvTemplate}`);
  lines.push(`- ${status.commands.runSafe}`);
  lines.push(`- ${status.commands.check}`);
  if (status.commands.liveProviderSetup.length > 0) {
    lines.push("");
    lines.push("Next live provider proof setup:");
    for (const command of status.commands.liveProviderSetup) {
      lines.push(`- ${command}`);
    }
  }
  return lines;
}

function proofTemplateSection(title: string, template: string) {
  return [
    `# ${title}`,
    template
      .replaceAll(".dearme-provider-smoke.env", PROOF_ENV_FILE)
      .replaceAll(".dearme-voice-smoke.env", PROOF_ENV_FILE),
  ].join("\n");
}

export function dearMeProofEnvTemplate(lane: DearMeProofLane = "all"): string {
  const sections = [`# DearMe proof local env.
# Keep this file local. The repository ignores ${PROOF_ENV_FILE}.
# pnpm dearme:status and pnpm dearme:proof auto-load this file when it exists.
#
# Check readiness:
# pnpm --silent dearme:proof -- --check${laneFlag(lane)}
#
# Run local safe proof:
# pnpm --silent dearme:proof -- --run-safe${laneFlag(lane)}
#
# Live provider sends/deploys/spend still require the provider smoke live guard.
`];

  if (includesLane(lane, "provider")) {
    sections.push(proofTemplateSection(
      "Provider dispatch proof",
      dearMeProviderSmokeEnvTemplate("all"),
    ));
  }

  if (includesLane(lane, "voice")) {
    sections.push(proofTemplateSection(
      "Voice calibration proof",
      dearMeVoiceSmokeEnvTemplate("all"),
    ));
  }

  return sections.join("\n\n").trimEnd();
}

function stripChildSetup(lines: readonly string[]): string[] {
  const setupIndex = lines.findIndex((line) =>
    line === "Next provider-smoke setup:" || line === "Next voice-smoke setup:",
  );
  const scopedLines = setupIndex === -1 ? [...lines] : lines.slice(0, setupIndex);

  while (scopedLines.at(-1) === "") {
    scopedLines.pop();
  }

  return scopedLines;
}

export function formatDearMeProofReadiness(
  readiness: DearMeProofReadiness,
  lane: DearMeProofLane = "all",
): string[] {
  const lines = ["DearMe proof readiness"];
  for (const laneReadiness of readiness.lanes) {
    lines.push("");
    if (laneReadiness.lane === "provider") {
      lines.push("Provider dispatch lane");
      lines.push(...stripChildSetup(
        formatDearMeProviderSmokeReadiness(laneReadiness.readiness, "all"),
      ));
    } else {
      lines.push("Voice calibration lane");
      lines.push(...stripChildSetup(
        formatDearMeVoiceSmokeReadiness(laneReadiness.readiness, "all"),
      ));
    }
  }

  if (!hasBlockedReadiness(readiness)) return lines;

  lines.push("");
  lines.push("Next DearMe proof setup:");
  for (const command of dearMeProofOperatorCommands(readiness, lane)) {
    lines.push(`- ${command}`);
  }
  return lines;
}

export async function runDearMeProofSafe(
  options: DearMeProofSafeOptions = {},
): Promise<DearMeProofSafeResult> {
  const lane = options.lane ?? "all";
  const env = options.env ?? process.env;
  const lanes: DearMeProofSafeLaneResult[] = [];

  if (includesLane(lane, "provider")) {
    const results: DearMeProviderSmokeResult[] = [];
    results.push(...await runDearMeProviderSmoke({
      target: "deploy_site_preview",
      env,
      fetch: options.fetch,
      now: options.now,
    }));

    const hostRehearsalReadiness =
      inspectDearMeProviderSmokeReadiness(env, "deploy_site_host_rehearsal")[0];
    if (hostRehearsalReadiness?.ready) {
      results.push(...await runDearMeProviderSmoke({
        target: "deploy_site_host_rehearsal",
        env,
        fetch: options.fetch,
        now: options.now,
      }));
    }

    lanes.push({
      lane: "provider",
      results,
    });
  }

  if (includesLane(lane, "voice")) {
    const voiceTargets: DearMeVoiceSmokeTarget[] = ["deterministic_gate"];
    const semanticReadiness =
      inspectDearMeVoiceSmokeReadiness(env, "profile_token_semantic")[0];
    if (semanticReadiness?.ready) {
      voiceTargets.push("profile_token_semantic");
    }

    const results: DearMeVoiceSmokeResult[] = [];
    for (const target of voiceTargets) {
      results.push(...await runDearMeVoiceSmoke({ target, env }));
    }
    lanes.push({ lane: "voice", results });
  }

  return { lanes };
}

function hasSafeFailure(result: DearMeProofSafeResult) {
  return result.lanes.some((lane) =>
    lane.results.some((item) =>
      lane.lane === "provider"
        ? item.status !== "delivered"
        : item.status !== "passed",
    ),
  );
}

function formatDearMeProofSafeResult(result: DearMeProofSafeResult): string[] {
  const lines = ["DearMe local proof result"];
  for (const lane of result.lanes) {
    lines.push("");
    if (lane.lane === "provider") {
      lines.push("Provider dispatch lane");
      for (const item of lane.results) {
        if (item.status === "delivered") {
          const host = typeof item.hostStatus === "number" ? ` host=${item.hostStatus}` : "";
          lines.push(
            `- ${item.target}: delivered ${item.externalId}${host}${item.externalUrl ? ` ${item.externalUrl}` : ""}`,
          );
        } else if (item.status === "blocked") {
          lines.push(`- ${item.target}: blocked ${item.reason}; missing ${item.missing.join(", ")}`);
        } else {
          const host = typeof item.hostStatus === "number" ? ` host=${item.hostStatus}` : "";
          lines.push(`- ${item.target}: errored ${item.reason}${host}${item.externalUrl ? ` ${item.externalUrl}` : ""}`);
        }
      }
    } else {
      lines.push("Voice calibration lane");
      for (const item of lane.results) {
        if (item.status === "passed") {
          const match = typeof item.matchScore === "number" ? ` match=${item.matchScore}` : "";
          const drift = typeof item.driftScore === "number" ? ` drift=${item.driftScore}` : "";
          const profile = typeof item.profileAcceptedSamples === "number" && typeof item.profileTokenCount === "number"
            ? ` profileSamples=${item.profileAcceptedSamples} profileTokens=${item.profileTokenCount}`
            : "";
          const corpus = item.customCorpus ? " corpus=custom" : "";
          lines.push(
            `- ${item.target}: passed score=${item.score} floor=${item.floor}${match}${drift}${profile}${corpus} reasons=${item.reasons.join(",")}`,
          );
        } else if (item.status === "blocked") {
          lines.push(`- ${item.target}: blocked ${item.reason}; missing ${item.missing.join(", ")}`);
        } else {
          const score = typeof item.score === "number" ? ` score=${item.score}` : "";
          const floor = typeof item.floor === "number" ? ` floor=${item.floor}` : "";
          const reasons = item.reasons?.length ? ` reasons=${item.reasons.join(",")}` : "";
          lines.push(`- ${item.target}: errored ${item.reason}${score}${floor}${reasons}`);
        }
      }
    }
  }
  return lines;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:proof -- [--status] [--check] [--run-safe] [--lane <lane>] [--json] [--env-file <path>]

Lanes:
  provider    Provider/dispatch readiness and safe preview proof.
  voice       Voice Gate readiness and local calibration proof.
  all         Provider + voice lanes.

Setup:
  pnpm --silent dearme:proof -- --print-env-template > ${PROOF_ENV_FILE}
  pnpm --silent dearme:proof -- --status
  pnpm --silent dearme:proof -- --check
  pnpm --silent dearme:proof -- --run-safe

Default with no action is --check. Use --status for a product/coordinator
summary. When ${PROOF_ENV_FILE} exists, it is loaded automatically unless
--env-file is passed explicitly. The safe run does not send, deploy to
production, spend, or call a live model; live provider actions stay behind
dearme:provider-smoke --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.`);
}

async function main() {
  try {
    const parsed = parseDearMeProofArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    if (parsed.printEnvTemplate) {
      console.log(dearMeProofEnvTemplate(parsed.lane));
      return;
    }

    const env = await loadDearMeProofEnv(parsed.envFiles, process.env);

    if (parsed.runSafe) {
      const results = await runDearMeProofSafe({ lane: parsed.lane, env });
      if (parsed.json) {
        console.log(JSON.stringify({ results }, null, 2));
      } else {
        for (const line of formatDearMeProofSafeResult(results)) {
          console.log(line);
        }
      }
      if (hasSafeFailure(results)) {
        process.exitCode = 1;
      }
      return;
    }

    const readiness = inspectDearMeProofReadiness(env, parsed.lane);
    if (parsed.status) {
      const status = summarizeDearMeProofStatus(
        readiness,
        parsed.lane,
        parsed.lane === "all" ? inspectDearMeIntegrationAuditStatus() : undefined,
        parsed.lane === "all" ? await inspectDearMeOpenClawMessageContractStatus() : undefined,
      );
      if (parsed.json) {
        console.log(JSON.stringify({ status }, null, 2));
      } else {
        for (const line of formatDearMeProofStatus(status)) {
          console.log(line);
        }
      }
      return;
    }

    if (parsed.json) {
      console.log(JSON.stringify({ readiness }, null, 2));
    } else {
      for (const line of formatDearMeProofReadiness(readiness, parsed.lane)) {
        console.log(line);
      }
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
