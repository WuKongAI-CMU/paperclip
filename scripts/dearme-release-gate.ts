import { fileURLToPath } from "node:url";
import {
  buildDearMeGoalAudit,
  formatDearMeGoalAudit,
  type DearMeGoalAudit,
  type DearMeGoalAuditItem,
  type DearMeGoalAuditItemKey,
} from "./dearme-goal-audit.ts";

export type DearMeReleaseGateTarget = "private-proof" | "public-launch";

export interface DearMeReleaseGateArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  target: DearMeReleaseGateTarget;
  envFiles: string[];
}

export interface DearMeReleaseGateDecision {
  target: DearMeReleaseGateTarget;
  ready: boolean;
  verdict: string;
  evidence: string[];
  blockers: string[];
  commands: string[];
}

export interface DearMeReleaseGate {
  overall: "blocked" | "private-proof-ready" | "public-launch-ready";
  canUse: boolean;
  canPublish: boolean;
  privateProof: DearMeReleaseGateDecision;
  publicLaunch: DearMeReleaseGateDecision;
  nextAction: DearMeGoalAudit["nextAction"];
  audit: DearMeGoalAudit;
}

const PRIVATE_PROOF_ITEMS: readonly DearMeGoalAuditItemKey[] = [
  "architecture_status_spine",
  "donor_reuse_absorption",
  "symphony_coordination",
  "private_first_wow",
  "loopback_host_rehearsal",
  "voice_autonomy",
  "production_host_provider_auth",
  "production_host_live_wow",
  "openclaw_message_contract_rehearsal",
];

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function requiredItemsFor(
  audit: DearMeGoalAudit,
  target: DearMeReleaseGateTarget,
): DearMeGoalAuditItem[] {
  if (target === "public-launch") {
    return audit.items.filter((item) => item.requiredForGoal);
  }
  const byKey = new Map(audit.items.map((item) => [item.key, item]));
  return PRIVATE_PROOF_ITEMS
    .map((key) => byKey.get(key))
    .filter((item): item is DearMeGoalAuditItem => Boolean(item));
}

function blockersFor(items: readonly DearMeGoalAuditItem[]): string[] {
  return items
    .filter((item) => item.status !== "met")
    .flatMap((item) =>
      item.blockers.length > 0
        ? item.blockers.map((blocker) => `${item.label}: ${blocker}`)
        : [item.label]
    );
}

function commandsFor(items: readonly DearMeGoalAuditItem[]): string[] {
  return unique(
    items
      .filter((item) => item.status !== "met")
      .flatMap((item) => item.commands),
  );
}

function decisionFor(
  audit: DearMeGoalAudit,
  target: DearMeReleaseGateTarget,
): DearMeReleaseGateDecision {
  const items = requiredItemsFor(audit, target);
  const missingRequiredAuditItems = target === "private-proof" &&
    items.length !== PRIVATE_PROOF_ITEMS.length;
  const blockers = blockersFor(items);
  const ready = !missingRequiredAuditItems && items.length > 0 &&
    items.every((item) => item.status === "met");

  const missing = missingRequiredAuditItems
    ? [
      `release gate is missing ${PRIVATE_PROOF_ITEMS.length - items.length} private-proof audit item(s)`,
      ...blockers,
    ]
    : blockers;
  const evidence = items
    .filter((item) => item.status === "met")
    .map((item) => item.label);

  if (target === "private-proof") {
    return {
      target,
      ready,
      verdict: ready
        ? "Private/internal proof is usable: DearMe can show the first wow, absorbed reuse, host proof, and OpenClaw message contract without unsafe live actions."
        : "Private/internal proof is blocked: the local product proof is missing required architecture, reuse, host, or safe-contract evidence.",
      evidence,
      blockers: missing,
      commands: commandsFor(items),
    };
  }

  return {
    target,
    ready: audit.complete && ready,
    verdict: audit.complete && ready
      ? "Public launch is ready: every required product, reuse, OpenClaw message, and live provider proof item is met."
      : "Public launch is blocked: DearMe still needs real live channel/provider proof before a formal release claim.",
    evidence,
    blockers: missing,
    commands: commandsFor(items),
  };
}

export function summarizeDearMeReleaseGate(audit: DearMeGoalAudit): DearMeReleaseGate {
  const privateProof = decisionFor(audit, "private-proof");
  const publicLaunch = decisionFor(audit, "public-launch");
  return {
    overall: publicLaunch.ready
      ? "public-launch-ready"
      : privateProof.ready
        ? "private-proof-ready"
        : "blocked",
    canUse: privateProof.ready,
    canPublish: publicLaunch.ready,
    privateProof,
    publicLaunch,
    nextAction: audit.nextAction,
    audit,
  };
}

export function formatDearMeReleaseGate(gate: DearMeReleaseGate): string[] {
  const lines = [
    "DearMe release gate",
    gate.canPublish
      ? "Verdict: usable and ready for public launch."
      : gate.canUse
        ? "Verdict: usable for private/internal proof, not ready for public launch."
        : "Verdict: not yet usable for private proof or public launch.",
    "",
    `Private proof: ${gate.privateProof.ready ? "ready" : "blocked"}. ${gate.privateProof.verdict}`,
    `Public launch: ${gate.publicLaunch.ready ? "ready" : "blocked"}. ${gate.publicLaunch.verdict}`,
  ];

  if (gate.privateProof.evidence.length > 0) {
    lines.push("");
    lines.push("Private proof evidence:");
    for (const item of gate.privateProof.evidence) {
      lines.push(`- ${item}`);
    }
  }

  if (gate.publicLaunch.blockers.length > 0) {
    lines.push("");
    lines.push("Public launch blockers:");
    for (const item of gate.publicLaunch.blockers) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("");
  lines.push("Next action:");
  lines.push(`- ${gate.nextAction.label}: ${gate.nextAction.reason}`);
  if (gate.nextAction.command) {
    lines.push(`- Run: ${gate.nextAction.command}`);
  }

  lines.push("");
  lines.push("Underlying goal audit:");
  lines.push(...formatDearMeGoalAudit(gate.audit));

  return lines;
}

export function parseDearMeReleaseGateArgs(argv: readonly string[]): DearMeReleaseGateArgs {
  const args: DearMeReleaseGateArgs = {
    help: false,
    json: false,
    check: false,
    target: "public-launch",
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
    } else if (arg === "--target") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--target requires a value");
      args.target = parseTarget(next);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      args.target = parseTarget(arg.slice("--target=".length));
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

function parseTarget(value: string): DearMeReleaseGateTarget {
  if (value === "private-proof" || value === "public-launch") return value;
  throw new Error("--target must be private-proof or public-launch");
}

function printHelp() {
  console.log(`Usage: pnpm dearme:release-gate -- [--check] [--json] [--target private-proof|public-launch] [--env-file <path>]

Answers the product question "can people use it?" separately from the release
question "can we publish it?". The private-proof target can pass without live
sends or spend. The public-launch target is the default and only passes when the
full DearMe goal audit is complete.`);
}

async function main() {
  try {
    const parsed = parseDearMeReleaseGateArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const gate = summarizeDearMeReleaseGate(
      await buildDearMeGoalAudit(parsed.envFiles, process.env),
    );
    if (parsed.json) {
      console.log(JSON.stringify({ gate }, null, 2));
    } else {
      for (const line of formatDearMeReleaseGate(gate)) {
        console.log(line);
      }
    }

    const targetDecision = parsed.target === "private-proof"
      ? gate.privateProof
      : gate.publicLaunch;
    if (parsed.check && !targetDecision.ready) {
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
