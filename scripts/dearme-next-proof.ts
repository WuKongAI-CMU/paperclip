import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dearMeProviderSmokeEnvTemplate,
  inspectDearMeProviderSmokeReadiness,
  loadDearMeProviderSmokeEnv,
  parseDearMeProviderSmokeArgs,
  type DearMeProviderSmokeReadiness,
} from "./dearme-provider-smoke.ts";
import { buildDearMeGoalAudit } from "./dearme-goal-audit.ts";
import {
  dearMeProofFactsNeededFromReadiness,
  type DearMeProofFactNeed,
} from "./dearme-proof-facts.ts";
import {
  summarizeDearMeReleaseGate,
  type DearMeReleaseGate,
} from "./dearme-release-gate.ts";

type Env = Record<string, string | undefined>;
export type DearMeNextProofTarget = NonNullable<
  ReturnType<typeof parseDearMeProviderSmokeArgs>["target"]
>;

export interface DearMeNextProofArgs {
  help: boolean;
  json: boolean;
  force: boolean;
  noWrite: boolean;
  target: DearMeNextProofTarget | null;
  envFile: string;
  factCaptures: DearMeNextProofFactCapture[];
}

export type DearMeNextProofEnvStatus =
  | "augmented"
  | "created"
  | "overwritten"
  | "preserved"
  | "skipped";

export interface DearMeNextProofSetup {
  target: DearMeNextProofTarget;
  envFile: string;
  envStatus: DearMeNextProofEnvStatus;
  readiness: DearMeProviderSmokeReadiness[];
  factsNeeded: DearMeProofFactNeed[];
  capturedFacts: DearMeNextProofCapturedFact[];
  commands: {
    setup: string;
    check: string;
    liveOrRun: string;
  };
}

export type DearMeNextProofFactNeed = DearMeProofFactNeed;

export interface DearMeNextProofFactCapture {
  key: string;
  value: string;
}

export interface DearMeNextProofCapturedFact {
  key: string;
  label: string;
  sensitive: boolean;
}

interface PrepareDearMeNextProofSetupOptions {
  target?: DearMeNextProofTarget | null;
  envFile?: string;
  force?: boolean;
  noWrite?: boolean;
  cwd?: string;
  baseEnv?: Env;
  factCaptures?: DearMeNextProofFactCapture[];
}

const DEFAULT_PROOF_ENV_FILE = ".dearme-proof.env";
const FACT_CAPTURE_SPECS = {
  DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: {
    label: "iMessage/SMS approved smoke recipient",
    sensitive: false,
  },
  DEARME_LINKEDIN_DM_MESSAGES_URL: {
    label: "LinkedIn partner messages endpoint",
    sensitive: false,
  },
  DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: {
    label: "LinkedIn approved smoke recipient",
    sensitive: false,
  },
} as const satisfies Record<string, { label: string; sensitive: boolean }>;

type FactCaptureKey = keyof typeof FACT_CAPTURE_SPECS;

function envFileExists(path: string) {
  return access(path).then(
    () => true,
    () => false,
  );
}

function parseProviderTarget(value: string): DearMeNextProofTarget {
  const parsed = parseDearMeProviderSmokeArgs(["--target", value]).target;
  if (!parsed) throw new Error(`unknown provider smoke target: ${value}`);
  return parsed;
}

function envFileFlag(envFile: string) {
  return envFile === DEFAULT_PROOF_ENV_FILE ? "" : ` --env-file ${envFile}`;
}

function providerTargetFlag(target: DearMeNextProofTarget) {
  return ` --target ${target}`;
}

function providerCheckCommand(target: DearMeNextProofTarget, envFile: string) {
  return `pnpm --silent dearme:provider-smoke -- --env-file ${envFile} --check${providerTargetFlag(target)}`;
}

function providerRunCommand(
  target: DearMeNextProofTarget,
  envFile: string,
  readiness: readonly DearMeProviderSmokeReadiness[],
) {
  const command =
    `pnpm --silent dearme:provider-smoke -- --env-file ${envFile}${providerTargetFlag(target)}`;
  return readiness.some((item) => item.liveConfirmationRequired)
    ? `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 ${command} --live`
    : command;
}

function nextProofEnvTemplate(target: DearMeNextProofTarget, envFile: string) {
  return dearMeProviderSmokeEnvTemplate(target)
    .replaceAll(".dearme-provider-smoke.env", envFile);
}

function isFactCaptureKey(key: string): key is FactCaptureKey {
  return Object.prototype.hasOwnProperty.call(FACT_CAPTURE_SPECS, key);
}

function assertFactCaptureValue(key: FactCaptureKey, value: string): DearMeNextProofFactCapture {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${key} requires a non-empty value`);
  return { key, value: trimmed };
}

function capturedFactMetadata(capture: DearMeNextProofFactCapture): DearMeNextProofCapturedFact {
  const spec = isFactCaptureKey(capture.key)
    ? FACT_CAPTURE_SPECS[capture.key]
    : { label: capture.key, sensitive: /TOKEN|AUTH|CREDENTIAL|SECRET|PASSWORD/.test(capture.key) };
  return {
    key: capture.key,
    label: spec.label,
    sensitive: spec.sensitive,
  };
}

function envQuotedValue(value: string) {
  return JSON.stringify(value);
}

function upsertEnvFacts(existing: string, captures: readonly DearMeNextProofFactCapture[]) {
  if (captures.length === 0) return existing;

  const remaining = new Map(captures.map((capture) => [capture.key, capture]));
  const lines = existing.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) return line;
    const [, prefix, key] = match;
    const capture = remaining.get(key);
    if (!capture) return line;
    remaining.delete(key);
    return `${prefix}${key}=${envQuotedValue(capture.value)}`;
  });

  if (remaining.size === 0) return `${lines.join("\n").trimEnd()}\n`;

  lines.push("");
  lines.push("# Captured by dearme:next-proof. Keep this file local.");
  for (const capture of remaining.values()) {
    lines.push(`${capture.key}=${envQuotedValue(capture.value)}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function envKeysFromText(text: string) {
  const keys = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function missingTemplateAssignments(existing: string, template: string) {
  const existingKeys = envKeysFromText(existing);
  return template
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
      return match ? !existingKeys.has(match[1]) : false;
    });
}

function augmentEnvTemplate(
  existing: string,
  target: DearMeNextProofTarget,
  template: string,
) {
  const missing = missingTemplateAssignments(existing, template);
  if (missing.length === 0) return null;
  return `${existing.trimEnd()}\n\n# Added by dearme:next-proof for ${target}\n${missing.join("\n")}\n`;
}

export function parseDearMeNextProofArgs(argv: readonly string[]): DearMeNextProofArgs {
  const args: DearMeNextProofArgs = {
    help: false,
    json: false,
    force: false,
    noWrite: false,
    target: null,
    envFile: DEFAULT_PROOF_ENV_FILE,
    factCaptures: [],
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--no-write") {
      args.noWrite = true;
    } else if (arg === "--target") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--target requires a value");
      args.target = parseProviderTarget(next);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      args.target = parseProviderTarget(arg.slice("--target=".length));
    } else if (arg === "--env-file") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--env-file requires a value");
      args.envFile = next;
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      const envFile = arg.slice("--env-file=".length);
      if (!envFile) throw new Error("--env-file requires a value");
      args.envFile = envFile;
    } else if (arg === "--imessage-recipient") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--imessage-recipient requires a value");
      args.factCaptures.push(assertFactCaptureValue(
        "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        next,
      ));
      index += 1;
    } else if (arg.startsWith("--imessage-recipient=")) {
      args.factCaptures.push(assertFactCaptureValue(
        "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
        arg.slice("--imessage-recipient=".length),
      ));
    } else if (arg === "--linkedin-messages-url") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--linkedin-messages-url requires a value");
      args.factCaptures.push(assertFactCaptureValue("DEARME_LINKEDIN_DM_MESSAGES_URL", next));
      index += 1;
    } else if (arg.startsWith("--linkedin-messages-url=")) {
      args.factCaptures.push(assertFactCaptureValue(
        "DEARME_LINKEDIN_DM_MESSAGES_URL",
        arg.slice("--linkedin-messages-url=".length),
      ));
    } else if (arg === "--linkedin-recipient-urn") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--linkedin-recipient-urn requires a value");
      args.factCaptures.push(assertFactCaptureValue(
        "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
        next,
      ));
      index += 1;
    } else if (arg.startsWith("--linkedin-recipient-urn=")) {
      args.factCaptures.push(assertFactCaptureValue(
        "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
        arg.slice("--linkedin-recipient-urn=".length),
      ));
    } else if (!arg.startsWith("--") && !args.target) {
      args.target = parseProviderTarget(arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

export function targetFromDearMeReleaseGate(
  gate: Pick<DearMeReleaseGate, "nextAction">,
): DearMeNextProofTarget | null {
  const command = gate.nextAction.command ?? "";
  const text = `${gate.nextAction.label} ${gate.nextAction.reason} ${command}`
    .toLowerCase()
    .replace(/-/g, "_");
  if (text.includes("openclaw_messages") || text.includes("openclaw")) {
    return "openclaw_messages";
  }
  if (text.includes("linkedin_dm") || text.includes("linkedin")) {
    return "linkedin_dm";
  }
  if (text.includes("meta_campaign") || text.includes("meta")) {
    return "meta_campaign";
  }
  if (text.includes("telegram_message") || text.includes("telegram")) {
    return "telegram_message";
  }
  if (text.includes("imessage_message") || text.includes("imessage")) {
    return "imessage_message";
  }
  if (
    text.includes("deploy_site_production") ||
    text.includes("phone_reachable") ||
    text.includes("production_host") ||
    text.includes("production")
  ) {
    return "deploy_site_production";
  }
  return null;
}

async function inferNextProofTarget(
  envFile: string,
  cwd: string,
  baseEnv: Env,
): Promise<DearMeNextProofTarget> {
  const resolvedEnvFile = resolve(cwd, envFile);
  const envFiles = await envFileExists(resolvedEnvFile) ? [resolvedEnvFile] : [];
  const gate = summarizeDearMeReleaseGate(await buildDearMeGoalAudit(envFiles, baseEnv));
  const target = targetFromDearMeReleaseGate(gate);
  if (target) return target;
  throw new Error(
    "could not infer next proof target from the release gate; pass --target explicitly",
  );
}

export async function prepareDearMeNextProofSetup(
  options: PrepareDearMeNextProofSetupOptions = {},
): Promise<DearMeNextProofSetup> {
  const cwd = options.cwd ?? process.cwd();
  const envFile = options.envFile ?? DEFAULT_PROOF_ENV_FILE;
  const resolvedEnvFile = resolve(cwd, envFile);
  const factCaptures = options.factCaptures ?? [];
  if (options.noWrite && factCaptures.length > 0) {
    throw new Error("--no-write cannot be used with fact capture flags");
  }
  const target =
    options.target ?? await inferNextProofTarget(envFile, cwd, options.baseEnv ?? process.env);
  const existed = await envFileExists(resolvedEnvFile);
  let envStatus: DearMeNextProofEnvStatus;
  const template = `${nextProofEnvTemplate(target, envFile)}\n`;

  if (options.noWrite) {
    envStatus = "skipped";
  } else if (existed && !options.force) {
    const existing = await readFile(resolvedEnvFile, "utf8");
    const augmented = augmentEnvTemplate(existing, target, template);
    if (augmented) {
      await writeFile(resolvedEnvFile, augmented);
      envStatus = "augmented";
    } else {
      envStatus = "preserved";
    }
  } else {
    const parentDir = dirname(resolvedEnvFile);
    await mkdir(parentDir, { recursive: true });
    await writeFile(resolvedEnvFile, template);
    envStatus = existed ? "overwritten" : "created";
  }

  if (factCaptures.length > 0) {
    const existing = await readFile(resolvedEnvFile, "utf8");
    await writeFile(resolvedEnvFile, upsertEnvFacts(existing, factCaptures));
  }

  const envFiles = await envFileExists(resolvedEnvFile) ? [resolvedEnvFile] : [];
  const env = await loadDearMeProviderSmokeEnv(envFiles, options.baseEnv ?? process.env);
  const readiness = inspectDearMeProviderSmokeReadiness(env, target);
  const factsNeeded = dearMeProofFactsNeededFromReadiness(readiness);
  const capturedFacts = factCaptures.map(capturedFactMetadata);

  return {
    target,
    envFile,
    envStatus,
    readiness,
    factsNeeded,
    capturedFacts,
    commands: {
      setup: `pnpm --silent dearme:next-proof --${envFileFlag(envFile)}${providerTargetFlag(target)}`,
      check: providerCheckCommand(target, envFile),
      liveOrRun: providerRunCommand(target, envFile, readiness),
    },
  };
}

export function formatDearMeNextProofSetup(setup: DearMeNextProofSetup): string[] {
  const lines = [
    "DearMe next proof setup",
    `- target: ${setup.target}`,
    `- env file: ${setup.envFile}`,
    `- env status: ${setup.envStatus}`,
    "",
    "Readiness:",
  ];

  for (const item of setup.readiness) {
    const state = item.ready ? "ready" : `blocked: ${item.missing.join(", ")}`;
    const live = item.liveConfirmationRequired
      ? " Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1."
      : "";
    lines.push(`- ${item.target}: ${state}. ${item.description}.${live}`);
  }

  if (setup.factsNeeded.length > 0) {
    lines.push("");
    lines.push("Facts needed before any live run:");
    for (const fact of setup.factsNeeded) {
      const targetList = fact.targets.length > 1
        ? ` for ${fact.targets.join(", ")}`
        : ` for ${fact.targets[0]}`;
      const redaction = fact.sensitive ? " (keep value local; do not paste secrets)" : "";
      lines.push(`- ${fact.label}: provide ${fact.provideAs}${targetList}${redaction}`);
    }
  }

  if (setup.capturedFacts.length > 0) {
    lines.push("");
    lines.push("Captured local facts:");
    for (const fact of setup.capturedFacts) {
      const redaction = fact.sensitive ? " (value kept local)" : " (value hidden)";
      lines.push(`- ${fact.label}: ${fact.key}${redaction}`);
    }
  }

  lines.push("");
  lines.push("Next commands:");
  lines.push(`- ${setup.commands.check}`);
  lines.push(`- ${setup.commands.liveOrRun}`);
  return lines;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:next-proof -- [--target <target>] [--env-file <path>] [--force] [--no-write] [--json]
       [--imessage-recipient <recipient>] [--linkedin-messages-url <url>] [--linkedin-recipient-urn <urn>]

Creates or preserves the local DearMe proof env file, then prints no-send
readiness plus the guarded live/run command for the next blocked provider proof.

Optional fact-capture flags write non-secret launch facts into the local env file
and never print captured values.

Targets use the same aliases as dearme:provider-smoke, including openclaw,
linkedin, meta, telegram, imessage, production, and all.`);
}

async function main() {
  try {
    const args = parseDearMeNextProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const setup = await prepareDearMeNextProofSetup({
      target: args.target,
      envFile: args.envFile,
      force: args.force,
      noWrite: args.noWrite,
      baseEnv: process.env,
      factCaptures: args.factCaptures,
    });

    if (args.json) {
      console.log(JSON.stringify({ setup }, null, 2));
      return;
    }

    for (const line of formatDearMeNextProofSetup(setup)) {
      console.log(line);
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
