import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createInMemoryDearMeVoiceProfileStore,
  dearMeVoiceGateService,
} from "../server/src/services/dearme-voice-gate.js";
import { resolveDearMeVoiceSemanticScorerFromEnv } from "../server/src/services/dearme-voice-semantic-scorer.js";

type Env = Record<string, string | undefined>;
type VoiceGateScoreResponse = Awaited<ReturnType<ReturnType<typeof dearMeVoiceGateService>["scoreVoice"]>>;

export const DEARME_VOICE_SMOKE_TARGETS = [
  "deterministic_gate",
  "profile_token_semantic",
] as const;

export type DearMeVoiceSmokeTarget = typeof DEARME_VOICE_SMOKE_TARGETS[number];
export type DearMeVoiceSmokeTargetArg = DearMeVoiceSmokeTarget | "all";

export type DearMeVoiceSmokeArgs = {
  target?: DearMeVoiceSmokeTargetArg;
  check: boolean;
  json: boolean;
  envFiles: string[];
  printEnvTemplate: boolean;
  help: boolean;
};

export type DearMeVoiceSmokeReadiness = {
  target: DearMeVoiceSmokeTarget;
  ready: boolean;
  missing: string[];
  description: string;
};

export type DearMeVoiceSmokePassedResult = {
  target: DearMeVoiceSmokeTarget;
  status: "passed";
  score: number;
  floor: number;
  reasons: string[];
  matchScore?: number;
  driftScore?: number;
  driftBlocked?: boolean;
};

export type DearMeVoiceSmokeBlockedResult = {
  target: DearMeVoiceSmokeTarget;
  status: "blocked";
  reason: string;
  missing: string[];
};

export type DearMeVoiceSmokeErroredResult = {
  target: DearMeVoiceSmokeTarget;
  status: "errored";
  reason: string;
  score?: number;
  floor?: number;
  reasons?: string[];
};

export type DearMeVoiceSmokeResult =
  | DearMeVoiceSmokePassedResult
  | DearMeVoiceSmokeBlockedResult
  | DearMeVoiceSmokeErroredResult;

export type DearMeVoiceSmokeOptions = {
  target: DearMeVoiceSmokeTargetArg;
  env?: Env;
};

const VOICE_SMOKE_ENV_FILE = ".dearme-voice-smoke.env";
const VOICE_SMOKE_BASE_COMMAND =
  `pnpm --silent dearme:voice-smoke -- --env-file ${VOICE_SMOKE_ENV_FILE}`;
const PROFILE_TOKEN_MODE_REQUIREMENT = "DEARME_VOICE_SEMANTIC_SCORER=profile-token";
const VOICE_SMOKE_DEFAULT_FLOOR = 92;

const DETERMINISTIC_SMOKE_TEXT =
  "I shipped the private proof after the launch call because the buyer needed one inspectable next yes before we asked for more.";
const PROFILE_SEED_TEXTS = [
  DETERMINISTIC_SMOKE_TEXT,
  "I keep launch work honest by turning rough notes into proof a buyer can inspect before the next yes.",
  "I would rather show the work than over-explain it because a concrete proof makes the next launch call easier.",
] as const;
const PROFILE_MATCH_TEXT =
  "I shipped another inspectable launch proof because the buyer needed a clearer next yes before the call.";
const PROFILE_DRIFT_TEXT =
  "Amazing platform synergy unlocks automated marketing workflows for everyone at scale without a specific buyer proof.";

function expandVoiceSmokeTargets(targetArg: DearMeVoiceSmokeTargetArg): readonly DearMeVoiceSmokeTarget[] {
  return targetArg === "all" ? DEARME_VOICE_SMOKE_TARGETS : [targetArg];
}

function targetDescription(target: DearMeVoiceSmokeTarget) {
  switch (target) {
    case "deterministic_gate":
      return "score one concrete private draft through the local voice gate";
    case "profile_token_semantic":
      return "prove the opt-in profile-token scorer can match approved voice and block drift";
  }
}

function targetMissingRequirements(target: DearMeVoiceSmokeTarget, env: Env) {
  switch (target) {
    case "deterministic_gate":
      return [];
    case "profile_token_semantic":
      return resolveDearMeVoiceSemanticScorerFromEnv(env as NodeJS.ProcessEnv)
        ? []
        : [PROFILE_TOKEN_MODE_REQUIREMENT];
  }
}

export function inspectDearMeVoiceSmokeReadiness(
  env: Env = process.env,
  targetArg: DearMeVoiceSmokeTargetArg = "all",
): DearMeVoiceSmokeReadiness[] {
  return expandVoiceSmokeTargets(targetArg).map((target) => {
    const missing = targetMissingRequirements(target, env);
    return {
      target,
      ready: missing.length === 0,
      missing,
      description: targetDescription(target),
    };
  });
}

export function dearMeVoiceSmokeOperatorCommands(
  blockedTargets: readonly DearMeVoiceSmokeTarget[] = [],
  targetArg: DearMeVoiceSmokeTargetArg = "all",
): string[] {
  const scopedTarget = targetArg !== "all"
    ? targetArg
    : blockedTargets.length === 1
      ? blockedTargets[0]
      : null;
  const targetFlag = scopedTarget ? ` --target ${scopedTarget}` : "";
  const commands = [
    `pnpm --silent dearme:voice-smoke -- --print-env-template${targetFlag} > ${VOICE_SMOKE_ENV_FILE}`,
    `${VOICE_SMOKE_BASE_COMMAND} --check${targetFlag}`,
  ];

  for (const target of blockedTargets) {
    commands.push(`${VOICE_SMOKE_BASE_COMMAND} --target ${target}`);
  }
  return commands;
}

export function formatDearMeVoiceSmokeReadiness(
  readiness: readonly DearMeVoiceSmokeReadiness[],
  targetArg: DearMeVoiceSmokeTargetArg = "all",
): string[] {
  const lines = ["DearMe voice smoke readiness"];
  for (const item of readiness) {
    const state = item.ready ? "ready" : `blocked: ${item.missing.join(", ")}`;
    lines.push(`- ${item.target}: ${state}. ${item.description}.`);
  }

  const blockedTargets = readiness
    .filter((item) => !item.ready)
    .map((item) => item.target);
  if (blockedTargets.length === 0) return lines;

  lines.push("");
  lines.push("Next voice-smoke setup:");
  for (const command of dearMeVoiceSmokeOperatorCommands(blockedTargets, targetArg)) {
    lines.push(`- ${command}`);
  }
  return lines;
}

export function dearMeVoiceSmokeEnvTemplate(targetArg: DearMeVoiceSmokeTargetArg = "all"): string {
  const targetFlag = targetArg === "all" ? "" : ` --target ${targetArg}`;
  const selectedRunCommands = targetArg === "all"
    ? [`${VOICE_SMOKE_BASE_COMMAND} --target profile_token_semantic`]
    : [`${VOICE_SMOKE_BASE_COMMAND} --target ${targetArg}`];

  return `# DearMe voice smoke local env.
# Keep this file local. The repository ignores .dearme-voice-smoke.env.
#
# Check readiness:
# ${VOICE_SMOKE_BASE_COMMAND} --check${targetFlag}
#
# Run the selected smoke${selectedRunCommands.length > 1 ? "s" : ""}:
${selectedRunCommands.map((command) => `# ${command}`).join("\n")}
#
# This is local scorer proof only. It does not send, deploy, spend, or call a live model.

DEARME_VOICE_SEMANTIC_SCORER=profile-token
DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES=2
DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS=8`;
}

function parseEnvValue(rawValue: string, lineNumber: number): string {
  const raw = rawValue.trim();
  if (!raw) return "";

  if (raw.startsWith("'")) {
    if (!raw.endsWith("'") || raw.length === 1) {
      throw new Error(`invalid env file quoted value on line ${lineNumber}`);
    }
    return raw.slice(1, -1);
  }

  if (raw.startsWith('"')) {
    if (!raw.endsWith('"') || raw.length === 1) {
      throw new Error(`invalid env file quoted value on line ${lineNumber}`);
    }
    return raw
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  return raw.replace(/\s+#.*$/, "").trim();
}

export function parseDearMeVoiceSmokeEnvFile(contents: string): Env {
  const parsed: Env = {};
  const lines = contents.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].trim();
    const lineNumber = index + 1;
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) {
      line = line.slice("export ".length).trimStart();
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      throw new Error(`invalid env file entry on line ${lineNumber}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`invalid env file key on line ${lineNumber}`);
    }
    parsed[key] = parseEnvValue(line.slice(separatorIndex + 1), lineNumber);
  }
  return parsed;
}

export async function loadDearMeVoiceSmokeEnv(
  envFiles: readonly string[] = [],
  baseEnv: Env = process.env,
): Promise<Env> {
  const env: Env = { ...baseEnv };
  for (const envFile of envFiles) {
    const contents = await readFile(envFile, "utf8");
    Object.assign(env, parseDearMeVoiceSmokeEnvFile(contents));
  }
  return env;
}

export function parseDearMeVoiceSmokeArgs(argv: readonly string[]): DearMeVoiceSmokeArgs {
  const args: DearMeVoiceSmokeArgs = {
    check: false,
    json: false,
    envFiles: [],
    printEnvTemplate: false,
    help: false,
  };

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--print-env-template") {
      args.printEnvTemplate = true;
    } else if (arg === "--target") {
      const target = normalizedArgv[index + 1];
      if (!target) throw new Error("--target requires a value");
      args.target = normalizeTargetArg(target);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      args.target = normalizeTargetArg(arg.slice("--target=".length));
    } else if (arg === "--env-file") {
      const envFile = normalizedArgv[index + 1];
      if (!envFile) throw new Error("--env-file requires a value");
      args.envFiles.push(envFile);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      args.envFiles.push(arg.slice("--env-file=".length));
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.target = normalizeTargetArg(arg);
    }
  }

  return args;
}

function normalizeTargetArg(value: string): DearMeVoiceSmokeTargetArg {
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  switch (normalized) {
    case "all":
      return "all";
    case "deterministic":
    case "deterministic_gate":
    case "local":
    case "local_gate":
      return "deterministic_gate";
    case "profile":
    case "profile_token":
    case "profile_token_semantic":
    case "semantic":
    case "semantic_profile":
      return "profile_token_semantic";
    default:
      throw new Error(`Unknown voice smoke target: ${value}`);
  }
}

export async function runDearMeVoiceSmoke(
  options: DearMeVoiceSmokeOptions,
): Promise<DearMeVoiceSmokeResult[]> {
  const env = options.env ?? process.env;
  const results: DearMeVoiceSmokeResult[] = [];
  for (const target of expandVoiceSmokeTargets(options.target)) {
    results.push(await runTarget(target, env));
  }
  return results;
}

async function runTarget(
  target: DearMeVoiceSmokeTarget,
  env: Env,
): Promise<DearMeVoiceSmokeResult> {
  switch (target) {
    case "deterministic_gate":
      return runDeterministicGateSmoke();
    case "profile_token_semantic":
      return runProfileTokenSemanticSmoke(env);
  }
}

async function runDeterministicGateSmoke(): Promise<DearMeVoiceSmokeResult> {
  const result = await dearMeVoiceGateService().scoreVoice({
    fingerprintId: "vf_voice_smoke_local",
    text: DETERMINISTIC_SMOKE_TEXT,
    kind: "linkedin-post",
    minScore: VOICE_SMOKE_DEFAULT_FLOOR,
  });

  if (!result.passed) {
    return erroredResult(
      "deterministic_gate",
      "deterministic-gate-failed",
      result,
    );
  }

  return passedResult("deterministic_gate", result);
}

async function runProfileTokenSemanticSmoke(env: Env): Promise<DearMeVoiceSmokeResult> {
  const semanticScorer = resolveDearMeVoiceSemanticScorerFromEnv(env as NodeJS.ProcessEnv);
  if (!semanticScorer) {
    return {
      target: "profile_token_semantic",
      status: "blocked",
      reason: "missing-voice-semantic-scorer-config",
      missing: [PROFILE_TOKEN_MODE_REQUIREMENT],
    };
  }

  const profileStore = createInMemoryDearMeVoiceProfileStore();
  const service = dearMeVoiceGateService({ profileStore, semanticScorer });
  for (const text of PROFILE_SEED_TEXTS) {
    const seed = await service.scoreVoice({
      fingerprintId: "vf_voice_smoke_profile",
      text,
      kind: "linkedin-post",
      minScore: 70,
    });
    if (!seed.passed) {
      return erroredResult("profile_token_semantic", "profile-seed-failed", seed);
    }
  }

  const match = await service.scoreVoice({
    fingerprintId: "vf_voice_smoke_profile",
    text: PROFILE_MATCH_TEXT,
    kind: "linkedin-post",
    minScore: 90,
  });
  const semanticMatch = hasReason(match, "semantic_voice_match");
  if (!match.passed || !semanticMatch) {
    return erroredResult(
      "profile_token_semantic",
      "profile-token-match-not-proven",
      match,
    );
  }

  const drift = await service.scoreVoice({
    fingerprintId: "vf_voice_smoke_profile",
    text: PROFILE_DRIFT_TEXT,
    kind: "linkedin-post",
    minScore: VOICE_SMOKE_DEFAULT_FLOOR,
  });
  const driftBlocked = !drift.passed && hasReason(drift, "semantic_voice_drift");
  if (!driftBlocked) {
    return erroredResult(
      "profile_token_semantic",
      "profile-token-drift-not-blocked",
      drift,
    );
  }

  return {
    ...passedResult("profile_token_semantic", match),
    matchScore: match.score,
    driftScore: drift.score,
    driftBlocked,
  };
}

function passedResult(
  target: DearMeVoiceSmokeTarget,
  result: VoiceGateScoreResponse,
): DearMeVoiceSmokePassedResult {
  return {
    target,
    status: "passed",
    score: result.score,
    floor: result.floor,
    reasons: result.reasons.map((reason) => reason.rule),
  };
}

function erroredResult(
  target: DearMeVoiceSmokeTarget,
  reason: string,
  result: VoiceGateScoreResponse,
): DearMeVoiceSmokeErroredResult {
  return {
    target,
    status: "errored",
    reason,
    score: result.score,
    floor: result.floor,
    reasons: result.reasons.map((scoreReason) => scoreReason.rule),
  };
}

function hasReason(result: VoiceGateScoreResponse, rule: string) {
  return result.reasons.some((reason) => reason.rule === rule);
}

function printHelp() {
  console.log(`Usage: pnpm dearme:voice-smoke -- [--check] [--target <target>] [--json] [--env-file <path>]

Targets:
  deterministic_gate        Local deterministic gate smoke; no external config.
  profile_token_semantic    Local profile-token semantic scorer smoke.
  all                       Run every target.

Setup:
  pnpm --silent dearme:voice-smoke -- --print-env-template > .dearme-voice-smoke.env
  pnpm --silent dearme:voice-smoke -- --env-file .dearme-voice-smoke.env --check
  pnpm --silent dearme:voice-smoke -- --env-file .dearme-voice-smoke.env --target profile_token_semantic

Default with no target is --check. This command is local scorer proof only:
  DEARME_VOICE_SEMANTIC_SCORER=profile-token`);
}

function printReadiness(
  readiness: readonly DearMeVoiceSmokeReadiness[],
  targetArg: DearMeVoiceSmokeTargetArg = "all",
) {
  for (const line of formatDearMeVoiceSmokeReadiness(readiness, targetArg)) {
    console.log(line);
  }
}

function printResults(results: readonly DearMeVoiceSmokeResult[]) {
  console.log("DearMe voice smoke result");
  for (const result of results) {
    if (result.status === "passed") {
      const match = typeof result.matchScore === "number" ? ` match=${result.matchScore}` : "";
      const drift = typeof result.driftScore === "number" ? ` drift=${result.driftScore}` : "";
      console.log(
        `- ${result.target}: passed score=${result.score} floor=${result.floor}${match}${drift} reasons=${result.reasons.join(",")}`,
      );
    } else if (result.status === "blocked") {
      console.log(`- ${result.target}: blocked ${result.reason}; missing ${result.missing.join(", ")}`);
    } else {
      const score = typeof result.score === "number" ? ` score=${result.score}` : "";
      const floor = typeof result.floor === "number" ? ` floor=${result.floor}` : "";
      const reasons = result.reasons?.length ? ` reasons=${result.reasons.join(",")}` : "";
      console.log(`- ${result.target}: errored ${result.reason}${score}${floor}${reasons}`);
    }
  }
}

async function main() {
  try {
    const parsed = parseDearMeVoiceSmokeArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    if (parsed.printEnvTemplate) {
      console.log(dearMeVoiceSmokeEnvTemplate(parsed.target ?? "all"));
      return;
    }

    const env = await loadDearMeVoiceSmokeEnv(parsed.envFiles, process.env);

    if (!parsed.target || parsed.check) {
      const readiness = inspectDearMeVoiceSmokeReadiness(env, parsed.target ?? "all");
      if (parsed.json) {
        console.log(JSON.stringify({ readiness }, null, 2));
      } else {
        printReadiness(readiness, parsed.target ?? "all");
      }
      return;
    }

    const results = await runDearMeVoiceSmoke({
      target: parsed.target,
      env,
    });
    if (parsed.json) {
      console.log(JSON.stringify({ results }, null, 2));
    } else {
      printResults(results);
    }

    if (results.some((result) => result.status !== "passed")) {
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
