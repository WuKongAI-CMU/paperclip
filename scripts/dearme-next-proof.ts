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
  describeDearMeProofFactNeed,
  dearMeProofFactsNeededFromReadiness,
  type DearMeProofFactNeed,
} from "./dearme-proof-facts.ts";
import {
  summarizeDearMeReleaseGate,
  type DearMeReleaseGate,
} from "./dearme-release-gate.ts";
import {
  DEARME_OWNER_PROOF_FACT_SPECS,
  DEARME_OWNER_PROOF_REPLY_TEMPLATE,
  dearMeOwnerProofFactSpec,
} from "../packages/shared/src/dearme-customer-text.ts";

type Env = Record<string, string | undefined>;
export type DearMeNextProofTarget = NonNullable<
  ReturnType<typeof parseDearMeProviderSmokeArgs>["target"]
>;

export interface DearMeNextProofArgs {
  help: boolean;
  json: boolean;
  humanHelpMarkdown: boolean;
  force: boolean;
  noWrite: boolean;
  target: DearMeNextProofTarget | null;
  envFile: string;
  handoffReceiptFile: string | null;
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
  noSendCheck: DearMeNextProofNoSendCheck;
  ownerHandoff: DearMeNextProofOwnerHandoff;
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

export interface DearMeNextProofOwnerFact {
  label: string;
  provideAs: string;
  targets: DearMeNextProofTarget[];
  sensitive: boolean;
  placeholder: string;
  captureFlag: string | null;
}

export interface DearMeNextProofLaneSummary {
  target: DearMeProviderSmokeReadiness["target"];
  status: "ready" | "waiting";
  description: string;
  waitingOn: string[];
  liveGuardRequired: boolean;
  nextStep: string;
}

export interface DearMeNextProofNoSendCheck {
  status: "ready" | "blocked";
  command: string;
  checkedTargets: DearMeProviderSmokeReadiness["target"][];
  blockedTargets: Array<{
    target: DearMeProviderSmokeReadiness["target"];
    waitingOn: string[];
  }>;
  noSendGuarantee: true;
}

export interface DearMeNextProofOwnerHandoff {
  status: "blocked" | "ready";
  headline: string;
  summary: string;
  proofLanes: DearMeNextProofLaneSummary[];
  factsToProvide: DearMeNextProofOwnerFact[];
  captureCommand: string | null;
  handoffReceiptPreviewCommand: string | null;
  handoffReceiptCommand: string | null;
  checkCommand: string;
  liveOrRunCommand: string;
  noSendGuarantee: true;
  requiresLiveGuard: boolean;
  safety: string[];
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
type FactCaptureKey = typeof DEARME_OWNER_PROOF_FACT_SPECS[number]["provideAs"];
const FACT_CAPTURE_KEY_BY_FLAG = new Map(
  DEARME_OWNER_PROOF_FACT_SPECS.map((spec) => [spec.captureFlag, spec.provideAs] as const),
);

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
  return dearMeOwnerProofFactSpec(key) !== null;
}

function assertFactCaptureValue(key: FactCaptureKey, value: string): DearMeNextProofFactCapture {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${key} requires a non-empty value`);
  return { key, value: trimmed };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseDearMeOwnerProofHandoffReceipt(
  receipt: string,
): DearMeNextProofFactCapture[] {
  const captures: DearMeNextProofFactCapture[] = [];
  for (const fact of DEARME_OWNER_PROOF_FACT_SPECS) {
    const linePattern = new RegExp(
      `^\\s*-\\s*${escapeRegExp(fact.label)}:\\s*Captured\\s*-\\s*(.+?)\\s*$`,
      "im",
    );
    const match = receipt.match(linePattern);
    if (match?.[1]) {
      captures.push(assertFactCaptureValue(fact.provideAs, match[1]));
    }
  }
  return captures;
}

function mergeFactCaptures(captures: readonly DearMeNextProofFactCapture[]) {
  const byKey = new Map<string, DearMeNextProofFactCapture>();
  for (const capture of captures) {
    byKey.set(capture.key, capture);
  }
  return [...byKey.values()];
}

function factCaptureFlagParts(arg: string) {
  const separatorIndex = arg.indexOf("=");
  return separatorIndex === -1
    ? { flag: arg, value: null }
    : { flag: arg.slice(0, separatorIndex), value: arg.slice(separatorIndex + 1) };
}

function capturedFactMetadata(capture: DearMeNextProofFactCapture): DearMeNextProofCapturedFact {
  const spec = dearMeOwnerProofFactSpec(capture.key);
  return {
    key: capture.key,
    label: spec?.operatorLabel ?? capture.key,
    sensitive: spec?.sensitive ?? /TOKEN|AUTH|CREDENTIAL|SECRET|PASSWORD/.test(capture.key),
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

function envWithFactCaptures(env: Env, captures: readonly DearMeNextProofFactCapture[]) {
  if (captures.length === 0) return env;
  return {
    ...env,
    ...Object.fromEntries(captures.map((capture) => [capture.key, capture.value])),
  };
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

function placeholderForFact(fact: DearMeProofFactNeed) {
  const spec = dearMeOwnerProofFactSpec(fact.provideAs);
  if (spec) return spec.placeholder;
  if (fact.sensitive) return "<keep-local-secret>";
  return "<approved-value>";
}

function captureFlagForFact(fact: DearMeProofFactNeed) {
  return dearMeOwnerProofFactSpec(fact.provideAs)?.captureFlag ?? null;
}

function ownerHandoffTargetLabel(target: DearMeNextProofTarget) {
  return target === "all" ? "the selected public proof lanes" : target;
}

function buildDearMeProofLaneSummary(
  item: DearMeProviderSmokeReadiness,
): DearMeNextProofLaneSummary {
  const waitingOn = item.missing.map((requirement) =>
    describeDearMeProofFactNeed(requirement).label
  );

  return {
    target: item.target,
    status: item.ready ? "ready" : "waiting",
    description: item.description,
    waitingOn,
    liveGuardRequired: item.liveConfirmationRequired,
    nextStep: item.ready
      ? "Run the no-send check, then the guarded live proof."
      : `Provide ${waitingOn.join(", ")}, then run the no-send check.`,
  };
}

function buildDearMeNoSendCheck(
  readiness: readonly DearMeProviderSmokeReadiness[],
  command: string,
): DearMeNextProofNoSendCheck {
  const blockedTargets = readiness
    .filter((item) => !item.ready)
    .map((item) => ({
      target: item.target,
      waitingOn: item.missing.map((requirement) =>
        describeDearMeProofFactNeed(requirement).label
      ),
    }));

  return {
    status: blockedTargets.length === 0 ? "ready" : "blocked",
    command,
    checkedTargets: readiness.map((item) => item.target),
    blockedTargets,
    noSendGuarantee: true,
  };
}

function buildDearMeOwnerHandoff(
  target: DearMeNextProofTarget,
  readiness: readonly DearMeProviderSmokeReadiness[],
  factsNeeded: readonly DearMeProofFactNeed[],
  commands: DearMeNextProofSetup["commands"],
): DearMeNextProofOwnerHandoff {
  const factsToProvide = factsNeeded.map((fact): DearMeNextProofOwnerFact => ({
    label: fact.label,
    provideAs: fact.provideAs,
    targets: fact.targets,
    sensitive: fact.sensitive,
    placeholder: placeholderForFact(fact),
    captureFlag: captureFlagForFact(fact),
  }));
  const captureArgs = factsToProvide
    .filter((fact) => fact.captureFlag)
    .map((fact) => `${fact.captureFlag} ${fact.placeholder}`);
  const captureCommand = captureArgs.length > 0
    ? `${commands.setup} ${captureArgs.join(" ")}`
    : null;
  const handoffReceiptPreviewCommand = captureArgs.length > 0
    ? `${commands.setup} --no-write --handoff-receipt-file <launch-proof-handoff-receipt.txt>`
    : null;
  const handoffReceiptCommand = captureArgs.length > 0
    ? `${commands.setup} --handoff-receipt-file <launch-proof-handoff-receipt.txt>`
    : null;
  const blocked = factsToProvide.length > 0;
  const targetLabel = ownerHandoffTargetLabel(target);

  return {
    status: blocked ? "blocked" : "ready",
    headline: blocked
      ? "Owner facts needed before public launch proof"
      : "Ready for guarded live proof",
    summary: blocked
      ? `Supply the approved proof target(s) for ${targetLabel}, then run the no-send check before any guarded live proof.`
      : `No owner facts are missing for ${targetLabel}; run the no-send check before the guarded live proof.`,
    proofLanes: readiness.map(buildDearMeProofLaneSummary),
    factsToProvide,
    captureCommand,
    handoffReceiptPreviewCommand,
    handoffReceiptCommand,
    checkCommand: commands.check,
    liveOrRunCommand: commands.liveOrRun,
    noSendGuarantee: true,
    requiresLiveGuard: commands.liveOrRun.includes("DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1"),
    safety: [
      "The receipt preview command checks downloaded product facts in memory; it does not change the local env file.",
      "dearme:next-proof only prepares local proof setup; it does not send messages, publish, deploy, or spend.",
      "Run the no-send check command before the guarded live/run command.",
      "Any live external proof still requires the explicit DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 guard.",
    ],
  };
}

export function parseDearMeNextProofArgs(argv: readonly string[]): DearMeNextProofArgs {
  const args: DearMeNextProofArgs = {
    help: false,
    json: false,
    humanHelpMarkdown: false,
    force: false,
    noWrite: false,
    target: null,
    envFile: DEFAULT_PROOF_ENV_FILE,
    handoffReceiptFile: null,
    factCaptures: [],
  };
  const normalizedArgv = argv.filter((arg) => arg !== "--");

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--human-help-markdown") {
      args.humanHelpMarkdown = true;
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
    } else if (arg === "--handoff-receipt-file") {
      const next = normalizedArgv[index + 1];
      if (!next) throw new Error("--handoff-receipt-file requires a value");
      args.handoffReceiptFile = next;
      index += 1;
    } else if (arg.startsWith("--handoff-receipt-file=")) {
      const handoffReceiptFile = arg.slice("--handoff-receipt-file=".length);
      if (!handoffReceiptFile) throw new Error("--handoff-receipt-file requires a value");
      args.handoffReceiptFile = handoffReceiptFile;
    } else {
      const { flag, value } = factCaptureFlagParts(arg);
      const captureKey = FACT_CAPTURE_KEY_BY_FLAG.get(flag);
      if (captureKey) {
        const captureValue = value ?? normalizedArgv[index + 1];
        if (!captureValue) throw new Error(`${flag} requires a value`);
        args.factCaptures.push(assertFactCaptureValue(captureKey, captureValue));
        if (value === null) index += 1;
      } else if (!arg.startsWith("--") && !args.target) {
        args.target = parseProviderTarget(arg);
      } else {
        throw new Error(`unknown argument: ${arg}`);
      }
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
  const factCaptures = mergeFactCaptures(options.factCaptures ?? []);
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

  if (!options.noWrite && factCaptures.length > 0) {
    const existing = await readFile(resolvedEnvFile, "utf8");
    await writeFile(resolvedEnvFile, upsertEnvFacts(existing, factCaptures));
  }

  const envFiles = await envFileExists(resolvedEnvFile) ? [resolvedEnvFile] : [];
  const loadedEnv = await loadDearMeProviderSmokeEnv(envFiles, options.baseEnv ?? process.env);
  const env = options.noWrite ? envWithFactCaptures(loadedEnv, factCaptures) : loadedEnv;
  const readiness = inspectDearMeProviderSmokeReadiness(env, target);
  const factsNeeded = dearMeProofFactsNeededFromReadiness(readiness);
  const capturedFacts = factCaptures.map(capturedFactMetadata);
  const commands = {
    setup: `pnpm --silent dearme:next-proof --${envFileFlag(envFile)}${providerTargetFlag(target)}`,
    check: providerCheckCommand(target, envFile),
    liveOrRun: providerRunCommand(target, envFile, readiness),
  };
  const noSendCheck = buildDearMeNoSendCheck(readiness, commands.check);

  return {
    target,
    envFile,
    envStatus,
    readiness,
    factsNeeded,
    noSendCheck,
    ownerHandoff: buildDearMeOwnerHandoff(target, readiness, factsNeeded, commands),
    capturedFacts,
    commands,
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

  lines.push("");
  lines.push("Proof lane summary:");
  for (const lane of setup.ownerHandoff.proofLanes) {
    const state = lane.status === "ready"
      ? "ready"
      : `waiting on ${lane.waitingOn.join(", ")}`;
    const live = lane.liveGuardRequired ? " Guarded live proof required." : "";
    lines.push(`- ${lane.target}: ${state}. ${lane.nextStep}${live}`);
  }

  lines.push("");
  lines.push("No-send check result:");
  lines.push(`- status: ${setup.noSendCheck.status}`);
  lines.push(`- command: ${setup.noSendCheck.command}`);
  lines.push(`- checked: ${setup.noSendCheck.checkedTargets.join(", ")}`);
  if (setup.noSendCheck.blockedTargets.length > 0) {
    lines.push("- blocked:");
    for (const item of setup.noSendCheck.blockedTargets) {
      lines.push(`  - ${item.target}: waiting on ${item.waitingOn.join(", ")}`);
    }
  } else {
    lines.push("- blocked: none");
  }
  lines.push("- guarantee: local readiness only; no messages, publishes, deploys, spend, or live provider calls ran.");

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
    lines.push(setup.envStatus === "skipped"
      ? "Provided local facts for this no-write check:"
      : "Captured local facts:");
    for (const fact of setup.capturedFacts) {
      const redaction = fact.sensitive ? " (value kept local)" : " (value hidden)";
      lines.push(`- ${fact.label}: ${fact.key}${redaction}`);
    }
  }

  lines.push("");
  lines.push("Owner handoff:");
  lines.push(`- status: ${setup.ownerHandoff.status}`);
  lines.push(`- ${setup.ownerHandoff.headline}.`);
  lines.push(`- ${setup.ownerHandoff.summary}`);
  if (setup.ownerHandoff.factsToProvide.length > 0) {
    lines.push("- Provide:");
    for (const fact of setup.ownerHandoff.factsToProvide) {
      const targetList = fact.targets.length > 1
        ? ` for ${fact.targets.join(", ")}`
        : ` for ${fact.targets[0]}`;
      const redaction = fact.sensitive ? " (keep value local; do not paste secrets)" : "";
      lines.push(`  - ${fact.label}: ${fact.provideAs}=${fact.placeholder}${targetList}${redaction}`);
    }
  } else {
    lines.push("- Provide: no owner facts missing.");
  }
  if (setup.ownerHandoff.captureCommand) {
    lines.push(`- Capture command: ${setup.ownerHandoff.captureCommand}`);
  }
  if (setup.ownerHandoff.handoffReceiptCommand) {
    if (setup.ownerHandoff.handoffReceiptPreviewCommand) {
      lines.push(`- Preview receipt without writing: ${setup.ownerHandoff.handoffReceiptPreviewCommand}`);
    }
    lines.push(`- If preview passes, import receipt: ${setup.ownerHandoff.handoffReceiptCommand}`);
  }
  lines.push(`- Check first: ${setup.ownerHandoff.checkCommand}`);

  lines.push("");
  lines.push("Next commands:");
  lines.push(`- ${setup.commands.check}`);
  lines.push(`- ${setup.commands.liveOrRun}`);
  return lines;
}

function markdownCodeBlock(language: string, value: string) {
  return ["```" + language, value, "```"];
}

export function formatDearMeNextProofHumanHelp(
  setup: DearMeNextProofSetup,
  options: { date?: string } = {},
): string[] {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const facts = setup.ownerHandoff.factsToProvide;
  const factLabel = (fact: DearMeNextProofOwnerFact) =>
    dearMeOwnerProofFactSpec(fact.provideAs)?.label ?? fact.label;
  const missingSummary = facts.length === 0
    ? "no approved live-proof details are missing"
    : facts.map(factLabel).join(", ");
  const blocking = facts.length === 0
    ? "no for internal product work, private-beta operations, or the next no-send check."
    : "no for internal product work or private-beta operations; yes before public launch or live external receipt proof can be claimed.";
  const continueAfter = facts.length === 0
    ? "running the no-send provider check, then guarded live proof only after explicit live confirmation."
    : "capturing the approved values, running the no-send provider check first, then running guarded live proof only after explicit live confirmation.";

  const lines = [
    `### ${date} - External live-proof recipients`,
    "",
    "- Needs help from: Peter",
    `- What they need to do: provide ${missingSummary}.`,
    "- Why agents cannot do it: these choices authorize real external delivery targets and channel details.",
    `- Blocking: ${blocking}`,
    "- Estimated human time: 5-10 minutes once the desired test recipients are known.",
    `- Agents continue after result by: ${continueAfter}`,
    "",
    "Needed values:",
    "",
  ];

  if (facts.length === 0) {
    lines.push("- None. Run the no-send check before guarded live proof.");
  } else {
    for (const fact of facts) {
      lines.push(`- \`${fact.provideAs}\`: ${factLabel(fact)}.`);
    }
  }

  lines.push("");
  lines.push("Reply template for Peter:");
  lines.push("");
  lines.push(...markdownCodeBlock(
    "text",
    DEARME_OWNER_PROOF_REPLY_TEMPLATE.map((line) => `${line.label}:`).join("\n"),
  ));
  lines.push("");
  lines.push("Current generated proof handoff status:");
  lines.push("");
  lines.push(`- Status: ${setup.ownerHandoff.status}.`);
  lines.push(`- Captured details: ${setup.capturedFacts.length}/${DEARME_OWNER_PROOF_FACT_SPECS.length}.`);
  lines.push(`- No-send check: ${setup.noSendCheck.status}.`);
  lines.push("- No-send guarantee: this handoff only prepares local proof setup; it does not send, publish, deploy, or spend.");

  if (setup.ownerHandoff.captureCommand) {
    lines.push("");
    lines.push("Capture command after Peter provides approved values:");
    lines.push("");
    lines.push(...markdownCodeBlock("bash", setup.ownerHandoff.captureCommand));
  }

  if (setup.ownerHandoff.handoffReceiptPreviewCommand && setup.ownerHandoff.handoffReceiptCommand) {
    lines.push("");
    lines.push("Optional handoff receipt commands:");
    lines.push("");
    lines.push(...markdownCodeBlock(
      "bash",
      [
        setup.ownerHandoff.handoffReceiptPreviewCommand,
        setup.ownerHandoff.handoffReceiptCommand,
      ].join("\n"),
    ));
  }

  lines.push("");
  lines.push("Required no-send check before any live delivery:");
  lines.push("");
  lines.push(...markdownCodeBlock("bash", setup.ownerHandoff.checkCommand));
  lines.push("");
  lines.push("Guarded live proof command only after explicit live confirmation:");
  lines.push("");
  lines.push(...markdownCodeBlock("bash", setup.ownerHandoff.liveOrRunCommand));
  lines.push("");
  lines.push("Safety notes:");
  lines.push("");
  for (const item of setup.ownerHandoff.safety) {
    lines.push(`- ${item}`);
  }

  return lines;
}

export async function loadDearMeNextProofFactCaptures(args: DearMeNextProofArgs, cwd: string) {
  const receiptCaptures = args.handoffReceiptFile
    ? parseDearMeOwnerProofHandoffReceipt(
      await readFile(resolve(cwd, args.handoffReceiptFile), "utf8"),
    )
    : [];
  return mergeFactCaptures([...receiptCaptures, ...args.factCaptures]);
}

function printHelp() {
  console.log(`Usage: pnpm dearme:next-proof -- [--target <target>] [--env-file <path>] [--force] [--no-write] [--json]
       [--human-help-markdown]
       [--handoff-receipt-file <path>]
       [--imessage-recipient <recipient>] [--linkedin-messages-url <url>] [--linkedin-recipient-urn <urn>]

Creates or preserves the local DearMe proof env file, then prints no-send
readiness plus the guarded live/run command for the next blocked provider proof.
The output includes an owner handoff block that states which approved proof
targets are still needed and how to capture non-secret values locally.

Optional fact-capture flags and --handoff-receipt-file write non-secret launch
facts into the local env file and never print captured values. With --no-write,
those facts are used only for the local no-send check and the env file is not
changed.

Targets use the same aliases as dearme:provider-smoke, including openclaw,
linkedin, meta, telegram, imessage, production, and all.

Use --human-help-markdown to print the Peter-facing human-support queue entry
from the same generated proof handoff.`);
}

async function main() {
  try {
    const args = parseDearMeNextProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    const factCaptures = await loadDearMeNextProofFactCaptures(args, process.cwd());

    const setup = await prepareDearMeNextProofSetup({
      target: args.target,
      envFile: args.envFile,
      force: args.force,
      noWrite: args.noWrite,
      baseEnv: process.env,
      factCaptures,
    });

    if (args.json) {
      console.log(JSON.stringify({ setup }, null, 2));
      return;
    }

    const lines = args.humanHelpMarkdown
      ? formatDearMeNextProofHumanHelp(setup)
      : formatDearMeNextProofSetup(setup);

    for (const line of lines) {
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
