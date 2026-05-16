import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDearMeBacklogAudit,
  type DearMeBacklogAudit,
  type DearMeBacklogAuditArgs,
} from "./dearme-backlog-audit.ts";
import {
  runDearMeDependencyLoopAudit,
  type DearMeDependencyLoopAudit,
  type DearMeDependencyLoopAuditArgs,
} from "./dearme-dependency-loop-audit.ts";
import {
  buildDearMeGoalAudit,
  type DearMeGoalAudit,
} from "./dearme-goal-audit.ts";

export type DearMeStandingLoopState =
  | "goal-complete"
  | "owner-blocked"
  | "backlog-ledger-needed"
  | "dependency-bump-needed"
  | "autonomous-fix-needed";

export interface DearMeStandingLoopAudit {
  state: DearMeStandingLoopState;
  checkClear: boolean;
  backlog: DearMeBacklogAudit;
  dependency: DearMeDependencyLoopAudit;
  goal: DearMeGoalAudit;
  nextAction: {
    label: string;
    reason: string;
    command?: string;
    ownerFacts?: string[];
  };
}

export interface DearMeStandingLoopAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  backlogHandoffPath: string;
  backlogLedgerPath: string;
  dependencyOutdatedJsonPath?: string;
  envFiles: string[];
}

const DEFAULT_HANDOFF_PATH = "docs/dearme/CODEX-HANDOFF-TOKEN.md";
const DEFAULT_LEDGER_PATH = "docs/dearme/CODEX-RUN-LEDGER.md";

function ownerBlocked(goal: DearMeGoalAudit): boolean {
  return !goal.complete && (goal.nextAction.ownerFacts?.length ?? 0) > 0;
}

export function summarizeDearMeStandingLoopAudit(
  backlog: DearMeBacklogAudit,
  dependency: DearMeDependencyLoopAudit,
  goal: DearMeGoalAudit,
): DearMeStandingLoopAudit {
  if (!backlog.complete) {
    return {
      state: "backlog-ledger-needed",
      checkClear: false,
      backlog,
      dependency,
      goal,
      nextAction: {
        label: backlog.nextAction.label,
        reason: backlog.nextAction.reason,
        command: "pnpm --silent dearme:backlog-audit -- --check",
      },
    };
  }

  if (!dependency.complete) {
    return {
      state: "dependency-bump-needed",
      checkClear: false,
      backlog,
      dependency,
      goal,
      nextAction: {
        label: dependency.nextAction.label,
        reason: dependency.nextAction.reason,
        command: "pnpm --silent dearme:dependency-loop-audit -- --check",
      },
    };
  }

  if (goal.complete) {
    return {
      state: "goal-complete",
      checkClear: true,
      backlog,
      dependency,
      goal,
      nextAction: {
        label: "Goal complete",
        reason: "All DearMe goal-audit requirements are met.",
        command: "pnpm --silent dearme:goal-audit -- --check",
      },
    };
  }

  if (ownerBlocked(goal)) {
    return {
      state: "owner-blocked",
      checkClear: true,
      backlog,
      dependency,
      goal,
      nextAction: {
        label: goal.nextAction.label,
        reason: goal.nextAction.reason,
        command: goal.nextAction.command,
        ownerFacts: goal.nextAction.ownerFacts,
      },
    };
  }

  return {
    state: "autonomous-fix-needed",
    checkClear: false,
    backlog,
    dependency,
    goal,
    nextAction: {
      label: goal.nextAction.label,
      reason: goal.nextAction.reason,
      command: goal.nextAction.command ?? "pnpm --silent dearme:goal-audit -- --check",
    },
  };
}

export function formatDearMeStandingLoopAudit(audit: DearMeStandingLoopAudit): string[] {
  const lines = [
    `DearMe standing loop audit: ${audit.state}`,
    `- Check clear: ${audit.checkClear ? "yes" : "no"}`,
    `- P0/P1/P2 ledger: ${audit.backlog.required.shipped}/${audit.backlog.required.total}`,
    `- Autonomous dependency updates: ${audit.dependency.autonomousUpdates.length}`,
    `- Review-required dependency updates: ${audit.dependency.reviewRequiredUpdates.length}`,
    `- Goal complete: ${audit.goal.complete ? "yes" : "no"}`,
    `- Next action: ${audit.nextAction.label} - ${audit.nextAction.reason}`,
  ];

  if (audit.nextAction.ownerFacts?.length) {
    lines.push("- Owner facts needed:");
    for (const fact of audit.nextAction.ownerFacts) {
      lines.push(`  - ${fact}`);
    }
  }
  if (audit.nextAction.command) {
    lines.push(`- Run: ${audit.nextAction.command}`);
  }
  return lines;
}

export function parseDearMeStandingLoopAuditArgs(argv: string[]): DearMeStandingLoopAuditArgs {
  const args: DearMeStandingLoopAuditArgs = {
    help: false,
    json: false,
    check: false,
    backlogHandoffPath: DEFAULT_HANDOFF_PATH,
    backlogLedgerPath: DEFAULT_LEDGER_PATH,
    envFiles: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--backlog-handoff") {
      args.backlogHandoffPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--backlog-ledger") {
      args.backlogLedgerPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--dependency-outdated-json") {
      args.dependencyOutdatedJsonPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--env-file") {
      args.envFiles.push(argv[index + 1] ?? "");
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.backlogHandoffPath) {
    throw new Error("--backlog-handoff requires a path.");
  }
  if (!args.backlogLedgerPath) {
    throw new Error("--backlog-ledger requires a path.");
  }
  if (args.dependencyOutdatedJsonPath === "") {
    throw new Error("--dependency-outdated-json requires a path.");
  }
  if (args.envFiles.some((envFile) => envFile === "")) {
    throw new Error("--env-file requires a path.");
  }

  return args;
}

export async function runDearMeStandingLoopAudit(
  args: DearMeStandingLoopAuditArgs,
): Promise<DearMeStandingLoopAudit> {
  const backlogArgs: DearMeBacklogAuditArgs = {
    help: false,
    json: false,
    check: false,
    handoffPath: args.backlogHandoffPath,
    ledgerPath: args.backlogLedgerPath,
  };
  const dependencyArgs: DearMeDependencyLoopAuditArgs = {
    help: false,
    json: false,
    check: false,
    outdatedJsonPath: args.dependencyOutdatedJsonPath,
  };

  const [backlog, dependency, goal] = await Promise.all([
    runDearMeBacklogAudit(backlogArgs),
    runDearMeDependencyLoopAudit(dependencyArgs),
    buildDearMeGoalAudit(args.envFiles, process.env),
  ]);
  return summarizeDearMeStandingLoopAudit(backlog, dependency, goal);
}

function usage(): string {
  return [
    "Usage: pnpm --silent dearme:standing-loop-audit [--check] [--json]",
    "",
    "Combines backlog, dependency, and goal evidence into one standing-loop next-action decision.",
    "",
    "Options:",
    "  --check                         Exit 1 when an autonomous code-owned action is available.",
    "  --json                          Print machine-readable JSON.",
    "  --backlog-handoff <path>         Handoff token path.",
    "  --backlog-ledger <path>          Run ledger path.",
    "  --dependency-outdated-json <path> Read saved pnpm outdated JSON.",
    "  --env-file <path>                Proof env file passed through to the goal audit.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseDearMeStandingLoopAuditArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const audit = await runDearMeStandingLoopAudit(args);
  if (args.json) {
    console.log(JSON.stringify({ audit }, null, 2));
  } else {
    console.log(formatDearMeStandingLoopAudit(audit).join("\n"));
  }

  if (args.check && !audit.checkClear) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
