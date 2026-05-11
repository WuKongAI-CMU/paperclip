import { fileURLToPath } from "node:url";
import {
  dearMeProviderSmokeEnvTemplate,
  dearMeProviderSmokeOperatorCommands,
  formatDearMeProviderSmokeReadiness,
  inspectDearMeProviderSmokeReadiness,
  loadDearMeProviderSmokeEnv,
  runDearMeProviderSmoke,
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

type Env = Record<string, string | undefined>;

export type DearMeProofLane = "provider" | "voice" | "all";

export interface DearMeProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
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
  now?: () => Date;
}

const PROOF_ENV_FILE = ".dearme-proof.env";

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
): Promise<Env> {
  return loadDearMeProviderSmokeEnv(envFiles, baseEnv);
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

export function dearMeProofOperatorCommands(
  readiness: DearMeProofReadiness,
  lane: DearMeProofLane = "all",
): string[] {
  const commands = [
    `pnpm --silent dearme:proof -- --print-env-template${laneFlag(lane)} > ${PROOF_ENV_FILE}`,
    `pnpm --silent dearme:proof -- --env-file ${PROOF_ENV_FILE} --check${laneFlag(lane)}`,
  ];

  for (const laneReadiness of readiness.lanes) {
    const blockedTargets = laneReadiness.readiness
      .filter((item) => !item.ready)
      .map((item) => item.target);
    if (blockedTargets.length === 0) continue;

    if (laneReadiness.lane === "provider") {
      commands.push(
        ...childRunCommands(dearMeProviderSmokeOperatorCommands(blockedTargets)),
      );
    } else {
      commands.push(
        ...childRunCommands(dearMeVoiceSmokeOperatorCommands(
          blockedTargets as DearMeVoiceSmokeTarget[],
        )),
      );
    }
  }

  return commands;
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
#
# Check readiness:
# pnpm --silent dearme:proof -- --env-file ${PROOF_ENV_FILE} --check${laneFlag(lane)}
#
# Run local safe proof:
# pnpm --silent dearme:proof -- --env-file ${PROOF_ENV_FILE} --run-safe${laneFlag(lane)}
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
    lanes.push({
      lane: "provider",
      results: await runDearMeProviderSmoke({
        target: "deploy_site_preview",
        env,
        now: options.now,
      }),
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
          lines.push(
            `- ${item.target}: passed score=${item.score} floor=${item.floor}${match}${drift} reasons=${item.reasons.join(",")}`,
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
  console.log(`Usage: pnpm dearme:proof -- [--check] [--run-safe] [--lane <lane>] [--json] [--env-file <path>]

Lanes:
  provider    Provider/dispatch readiness and safe preview proof.
  voice       Voice Gate readiness and local calibration proof.
  all         Provider + voice lanes.

Setup:
  pnpm --silent dearme:proof -- --print-env-template > ${PROOF_ENV_FILE}
  pnpm --silent dearme:proof -- --env-file ${PROOF_ENV_FILE} --check
  pnpm --silent dearme:proof -- --env-file ${PROOF_ENV_FILE} --run-safe

Default with no action is --check. The safe run does not send, deploy to
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
