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
  | "private_first_wow"
  | "loopback_host_rehearsal"
  | "voice_autonomy"
  | "production_host_provider_auth"
  | "production_host_live_wow"
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
}

export interface DearMeGoalAudit {
  complete: boolean;
  verdict: string;
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

export interface DearMeGoalAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  envFiles: string[];
}

const GOAL_AUDIT_CHECK_COMMAND = "pnpm --silent dearme:goal-audit -- --check";
const REQUIRED_STATUS_SECTIONS: DearMeProofStatusSection["key"][] = [
  "first_wow_aha_proof",
  "integration_absorption_proof",
  "local_safe_proof",
  "voice_semantic_proof",
  "live_provider_proof",
];

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
    commands: options.focus?.operatorCommand ? [options.focus.operatorCommand] : [],
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

export function summarizeDearMeGoalAudit(
  status: DearMeProofStatus,
  hostRehearsal?: DearMeGoalAuditHostRehearsalEvidence,
  hostProvider?: DearMeGoalAuditHostProviderEvidence,
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
    combinedPrivateFirstWowItem(status),
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
    focusItem({
      key: "openclaw_message_reuse",
      label: "OpenClaw shared Telegram/iMessage message proof",
      focus: openclawMessages,
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
  const complete = !incompleteItem;
  return {
    complete,
    verdict: complete
      ? "Goal audit: complete. DearMe has proven architecture, reuse, private aha, Symphony absorption, OpenClaw message proof, and live provider proof."
      : `Goal audit: not complete. ${incompleteItem?.label ?? "A required item"} is still ${incompleteItem?.status ?? "unverified"}.`,
    items,
    nextAction: incompleteItem
      ? {
        label: incompleteItem.label,
        reason: incompleteItem.blockers.length > 0
          ? `Blocked by ${incompleteItem.blockers.join(", ")}.`
          : "Evidence is missing from the unified proof status.",
        command: incompleteItem.commands[0],
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
  try {
    hostRehearsal = {
      report: await runDearMeHostRehearsal({ port: 0 }),
    };
  } catch (error) {
    hostRehearsal = {
      error: error instanceof Error ? error.message : String(error),
    };
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
  return summarizeDearMeGoalAudit(status, hostRehearsal, hostProvider);
}

export function formatDearMeGoalAudit(audit: DearMeGoalAudit): string[] {
  const lines = [
    "DearMe active goal completion audit",
    audit.verdict,
    "",
    "Checklist:",
  ];

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
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

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
