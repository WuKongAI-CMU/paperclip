import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

export type DearMeDependencyUpdateKind = "patch" | "minor" | "major" | "unknown";
export type DearMeDependencyUpdateDecision = "autonomous" | "review-required";

export interface DearMeOutdatedPackage {
  current: string;
  latest: string;
  wanted?: string;
  isDeprecated?: boolean;
  dependencyType?: string;
}

export type DearMeOutdatedJson = Record<string, DearMeOutdatedPackage>;

export interface DearMeDependencyUpdate {
  name: string;
  current: string;
  latest: string;
  wanted?: string;
  dependencyType?: string;
  kind: DearMeDependencyUpdateKind;
  decision: DearMeDependencyUpdateDecision;
  reason: string;
}

export interface DearMeDependencyLoopAudit {
  complete: boolean;
  autonomousUpdates: DearMeDependencyUpdate[];
  reviewRequiredUpdates: DearMeDependencyUpdate[];
  nextAction: {
    label: string;
    reason: string;
  };
}

export interface DearMeDependencyLoopAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  outdatedJsonPath?: string;
}

const STABLE_SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

function parseVersion(version: string): [number, number, number] | undefined {
  const match = STABLE_SEMVER_PATTERN.exec(version);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function classifyDearMeDependencyUpdate(
  name: string,
  outdatedPackage: DearMeOutdatedPackage,
): DearMeDependencyUpdate {
  const current = parseVersion(outdatedPackage.current);
  const latest = parseVersion(outdatedPackage.latest);
  let kind: DearMeDependencyUpdateKind = "unknown";
  let decision: DearMeDependencyUpdateDecision = "review-required";
  let reason = "Non-semver or prerelease dependency update requires human review.";

  if (current && latest) {
    if (latest[0] > current[0]) {
      kind = "major";
      reason = "Major dependency updates wait for human review.";
    } else if (latest[1] > current[1]) {
      kind = "minor";
      if (current[0] === 0) {
        reason = "0.x minor dependency updates can be breaking and wait for human review.";
      } else {
        decision = "autonomous";
        reason = "Minor dependency update is eligible for the autonomous dependency-bump loop.";
      }
    } else if (latest[2] > current[2]) {
      kind = "patch";
      decision = "autonomous";
      reason = "Patch dependency update is eligible for the autonomous dependency-bump loop.";
    } else {
      kind = "unknown";
      reason = "Latest version is not newer than the installed version.";
    }
  }

  return {
    name,
    current: outdatedPackage.current,
    latest: outdatedPackage.latest,
    wanted: outdatedPackage.wanted,
    dependencyType: outdatedPackage.dependencyType,
    kind,
    decision,
    reason,
  };
}

export function summarizeDearMeDependencyLoopAudit(
  outdatedJson: DearMeOutdatedJson,
): DearMeDependencyLoopAudit {
  const updates = Object.entries(outdatedJson)
    .map(([name, outdatedPackage]) => classifyDearMeDependencyUpdate(name, outdatedPackage))
    .sort((left, right) => left.name.localeCompare(right.name));
  const autonomousUpdates = updates.filter((update) => update.decision === "autonomous");
  const reviewRequiredUpdates = updates.filter((update) => update.decision === "review-required");
  const complete = autonomousUpdates.length === 0;

  return {
    complete,
    autonomousUpdates,
    reviewRequiredUpdates,
    nextAction: complete
      ? {
        label: "Continue standing loop",
        reason: reviewRequiredUpdates.length === 0
          ? "No dependency updates are currently available."
          : "Only review-required dependency updates are available; do not bump them autonomously.",
      }
      : {
        label: `Bump ${autonomousUpdates[0]?.name ?? "safe dependency"}`,
        reason: "At least one patch or safe minor dependency update is available for an autonomous PR.",
      },
  };
}

export function formatDearMeDependencyLoopAudit(audit: DearMeDependencyLoopAudit): string[] {
  const lines = [
    `DearMe dependency loop audit: ${audit.complete ? "clear" : "actionable"}`,
    `- Autonomous updates: ${audit.autonomousUpdates.length}`,
  ];

  for (const update of audit.autonomousUpdates) {
    lines.push(`  - ${update.name}: ${update.current} -> ${update.latest} (${update.kind})`);
  }

  lines.push(`- Review-required updates: ${audit.reviewRequiredUpdates.length}`);
  for (const update of audit.reviewRequiredUpdates) {
    lines.push(`  - ${update.name}: ${update.current} -> ${update.latest} (${update.kind}) - ${update.reason}`);
  }

  lines.push(`- Next action: ${audit.nextAction.label} - ${audit.nextAction.reason}`);
  return lines;
}

export function parseDearMeDependencyLoopAuditArgs(argv: string[]): DearMeDependencyLoopAuditArgs {
  const args: DearMeDependencyLoopAuditArgs = {
    help: false,
    json: false,
    check: false,
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
    } else if (arg === "--outdated-json") {
      args.outdatedJsonPath = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.outdatedJsonPath === "") {
    throw new Error("--outdated-json requires a path.");
  }

  return args;
}

async function loadOutdatedJsonFromPnpm(): Promise<DearMeOutdatedJson> {
  try {
    const { stdout } = await execFileAsync("pnpm", ["outdated", "--format", "json"], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return parseOutdatedJson(stdout);
  } catch (error: unknown) {
    const stdout = typeof error === "object" && error && "stdout" in error
      ? String((error as { stdout?: string }).stdout ?? "")
      : "";
    if (stdout.trim()) {
      return parseOutdatedJson(stdout);
    }
    throw error;
  }
}

export function parseOutdatedJson(rawJson: string): DearMeOutdatedJson {
  const parsed = JSON.parse(rawJson || "{}") as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("pnpm outdated JSON must be an object.");
  }
  return parsed as DearMeOutdatedJson;
}

export async function runDearMeDependencyLoopAudit(
  args: DearMeDependencyLoopAuditArgs,
): Promise<DearMeDependencyLoopAudit> {
  const outdatedJson = args.outdatedJsonPath
    ? parseOutdatedJson(await readFile(args.outdatedJsonPath, "utf8"))
    : await loadOutdatedJsonFromPnpm();
  return summarizeDearMeDependencyLoopAudit(outdatedJson);
}

function usage(): string {
  return [
    "Usage: pnpm --silent dearme:dependency-loop-audit [--check] [--json]",
    "",
    "Classifies pnpm outdated results for the DearMe dependency-bump standing loop.",
    "",
    "Options:",
    "  --check                  Exit 1 when an autonomous patch/safe-minor update exists.",
    "  --json                   Print machine-readable JSON.",
    "  --outdated-json <path>   Read a saved pnpm outdated JSON payload.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseDearMeDependencyLoopAuditArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const audit = await runDearMeDependencyLoopAudit(args);
  if (args.json) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(formatDearMeDependencyLoopAudit(audit).join("\n"));
  }

  if (args.check && !audit.complete) {
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
