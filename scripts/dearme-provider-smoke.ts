import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDearMeDeploySiteDispatch,
} from "../server/src/services/dearme-deploy-site-dispatch.js";
import {
  resolveDearMeDeploySiteDispatchConfigFromEnv,
} from "../server/src/services/dearme-deploy-site-dispatch-config.js";
import {
  createDearMeLinkedInDmDispatch,
} from "../server/src/services/dearme-linkedin-dm-dispatch.js";
import {
  resolveDearMeLinkedInDmDispatchConfigFromEnv,
} from "../server/src/services/dearme-linkedin-dm-dispatch-config.js";
import {
  createDearMeMetaCampaignDispatch,
} from "../server/src/services/dearme-meta-campaign-dispatch.js";
import {
  resolveDearMeMetaCampaignDispatchConfigFromEnv,
} from "../server/src/services/dearme-meta-campaign-dispatch-config.js";
import type {
  ChannelDispatch,
} from "../server/src/services/dearme-outbound-tool-wrapper.js";

type Env = Record<string, string | undefined>;
type DispatchInput = Parameters<ChannelDispatch>[0];

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  text?: () => Promise<string>;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export const DEARME_PROVIDER_SMOKE_TARGETS = [
  "deploy_site_preview",
  "deploy_site_production",
  "linkedin_dm",
  "meta_campaign",
] as const;

export type DearMeProviderSmokeTarget = (typeof DEARME_PROVIDER_SMOKE_TARGETS)[number];
type TargetArg = DearMeProviderSmokeTarget | "all";

export interface DearMeProviderSmokeReadiness {
  target: DearMeProviderSmokeTarget;
  ready: boolean;
  missing: string[];
  liveConfirmationRequired: boolean;
  description: string;
}

export type DearMeProviderSmokeResult =
  | {
      target: DearMeProviderSmokeTarget;
      status: "blocked";
      reason: string;
      missing: string[];
    }
  | {
      target: DearMeProviderSmokeTarget;
      status: "delivered";
      externalId: string;
      externalUrl?: string;
      hostStatus?: number;
    }
  | {
      target: DearMeProviderSmokeTarget;
      status: "errored";
      reason: string;
    };

export interface DearMeProviderSmokeOptions {
  target: TargetArg;
  live?: boolean;
  env?: Env;
  fetch?: FetchLike;
  now?: () => Date;
}

type DeliveredProviderSmokeResult = Extract<DearMeProviderSmokeResult, { status: "delivered" }>;

export interface ParsedDearMeProviderSmokeArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  live: boolean;
  target: TargetArg | null;
  envFiles: string[];
  printEnvTemplate: boolean;
}

const LIVE_TARGETS = new Set<DearMeProviderSmokeTarget>([
  "linkedin_dm",
  "meta_campaign",
]);

export function dearMeProviderSmokeEnvTemplate(): string {
  return `# DearMe provider smoke local env.
# Keep this file local. The repository ignores .dearme-provider-smoke.env.
#
# Check readiness:
# pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check
#
# Run a safe preview receipt smoke:
# pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --target deploy_site_preview
#
# Run live provider smokes only after setting DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1
# and passing --live on the command line.

DEARME_DEPLOY_SITE_BASE_URL=https://dearme.example.test
DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=0
DEARME_DEPLOY_SITE_SMOKE_HANDLE=dearme-smoke
DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=smoke:provider-dispatch
DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=dearme-smoke

DEARME_LINKEDIN_DM_MESSAGES_URL=
DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE=/absolute/path/to/linkedin-credential.json
DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=
DEARME_LINKEDIN_DM_SMOKE_SUBJECT=Private proof
DEARME_LINKEDIN_DM_SMOKE_BODY=Your private DearMe proof packet is ready.

DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL=https://graph.facebook.com/v25.0
DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE=/absolute/path/to/meta-credential.json
DEARME_META_CAMPAIGN_SMOKE_NAME=DearMe provider smoke
DEARME_META_CAMPAIGN_SMOKE_OBJECTIVE=OUTCOME_LEADS
DEARME_META_CAMPAIGN_SMOKE_DAILY_BUDGET_USD=1
DEARME_META_CAMPAIGN_SMOKE_CREATIVE_REFS=smoke:creative
DEARME_META_CAMPAIGN_SMOKE_AUDIENCE_REF=smoke:audience
DEARME_META_CAMPAIGN_SMOKE_BUDGET_TIER=test
DEARME_META_CAMPAIGN_SMOKE_LEARNING_WINDOW_HOURS=168

DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=0`;
}

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function boolFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function firstEnv(env: Env, keys: readonly string[]) {
  for (const key of keys) {
    const value = nonEmpty(env[key]);
    if (value) return value;
  }
  return null;
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined, fallback: readonly string[]) {
  const parsed = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed && parsed.length > 0 ? parsed : [...fallback];
}

function targetDescription(target: DearMeProviderSmokeTarget) {
  switch (target) {
    case "deploy_site_preview":
      return "emit a private preview receipt through the deploy_site dispatcher";
    case "deploy_site_production":
      return "prove the configured production DearMe site host serves the smoke page";
    case "linkedin_dm":
      return "send one LinkedIn DM through the configured partner endpoint";
    case "meta_campaign":
      return "create one paused Meta campaign through the Marketing API";
  }
}

function credentialRequirement(env: Env, jsonKey: string, fileKey: string) {
  return firstEnv(env, [jsonKey, fileKey]) ? [] : [`${jsonKey} or ${fileKey}`];
}

function targetMissingRequirements(target: DearMeProviderSmokeTarget, env: Env) {
  switch (target) {
    case "deploy_site_preview":
      return [];
    case "deploy_site_production": {
      const config = resolveDearMeDeploySiteDispatchConfigFromEnv(env as NodeJS.ProcessEnv);
      return config?.allowProduction ? [] : ["DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1"];
    }
    case "linkedin_dm": {
      const config = resolveDearMeLinkedInDmDispatchConfigFromEnv(env as NodeJS.ProcessEnv);
      return [
        ...(config?.messagesUrl ? [] : ["DEARME_LINKEDIN_DM_MESSAGES_URL"]),
        ...credentialRequirement(
          env,
          "DEARME_LINKEDIN_DM_CREDENTIAL_JSON",
          "DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE",
        ),
        ...(nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN)
          ? []
          : ["DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN"]),
        ...(nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_BODY)
          ? []
          : ["DEARME_LINKEDIN_DM_SMOKE_BODY"]),
      ];
    }
    case "meta_campaign":
      return credentialRequirement(
        env,
        "DEARME_META_CAMPAIGN_CREDENTIAL_JSON",
        "DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE",
      );
  }
}

export function inspectDearMeProviderSmokeReadiness(
  env: Env = process.env,
): DearMeProviderSmokeReadiness[] {
  return DEARME_PROVIDER_SMOKE_TARGETS.map((target) => {
    const missing = targetMissingRequirements(target, env);
    return {
      target,
      ready: missing.length === 0,
      missing,
      liveConfirmationRequired: LIVE_TARGETS.has(target),
      description: targetDescription(target),
    };
  });
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

export function parseDearMeProviderSmokeEnvFile(contents: string): Env {
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

export async function loadDearMeProviderSmokeEnv(
  envFiles: readonly string[],
  baseEnv: Env = process.env,
): Promise<Env> {
  let env: Env = { ...baseEnv };
  for (const envFile of envFiles) {
    const contents = await readFile(resolve(envFile), "utf8");
    env = { ...env, ...parseDearMeProviderSmokeEnvFile(contents) };
  }
  return env;
}

function normalizeTarget(value: string): TargetArg {
  const normalized = value.trim().toLowerCase().replace(/-/g, "_");
  const aliases: Record<string, TargetArg> = {
    all: "all",
    deploy_preview: "deploy_site_preview",
    site_preview: "deploy_site_preview",
    preview: "deploy_site_preview",
    deploy_production: "deploy_site_production",
    site_production: "deploy_site_production",
    production: "deploy_site_production",
    linkedin: "linkedin_dm",
    linkedin_dm: "linkedin_dm",
    meta: "meta_campaign",
    meta_ads: "meta_campaign",
    meta_campaign: "meta_campaign",
  };
  const target = aliases[normalized] ?? normalized;
  if (target === "all" || DEARME_PROVIDER_SMOKE_TARGETS.includes(target as DearMeProviderSmokeTarget)) {
    return target as TargetArg;
  }
  throw new Error(`unknown provider smoke target: ${value}`);
}

export function parseDearMeProviderSmokeArgs(argv: readonly string[]): ParsedDearMeProviderSmokeArgs {
  const parsed: ParsedDearMeProviderSmokeArgs = {
    help: false,
    json: false,
    check: false,
    live: false,
    target: null,
    envFiles: [],
    printEnvTemplate: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--check") {
      parsed.check = true;
    } else if (arg === "--live") {
      parsed.live = true;
    } else if (arg === "--print-env-template") {
      parsed.printEnvTemplate = true;
    } else if (arg === "--env-file") {
      const next = argv[index + 1];
      if (!next) throw new Error("--env-file requires a value");
      parsed.envFiles.push(next);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      const envFile = arg.slice("--env-file=".length);
      if (!envFile) throw new Error("--env-file requires a value");
      parsed.envFiles.push(envFile);
    } else if (arg === "--target") {
      const next = argv[index + 1];
      if (!next) throw new Error("--target requires a value");
      parsed.target = normalizeTarget(next);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      parsed.target = normalizeTarget(arg.slice("--target=".length));
    } else if (!arg.startsWith("--") && !parsed.target) {
      parsed.target = normalizeTarget(arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function smokeDispatchInput(input: {
  target: DearMeProviderSmokeTarget;
  toolName: DispatchInput["toolName"];
  channel: string;
  payload: unknown;
  encryptedCredential?: string;
  now: Date;
}): DispatchInput {
  return {
    toolName: input.toolName,
    encryptedCredential: input.encryptedCredential ?? "",
    payload: input.payload,
    dispatchContext: {
      companyId: "dearme-provider-smoke-company",
      userId: "dearme-provider-smoke-user",
      issueId: "dearme-provider-smoke-issue",
      channel: input.channel,
      openclawRunId: `dearme-provider-smoke:${input.target}`,
      approvalId: "dearme-provider-smoke-approval",
      idempotencyKey: `dearme-provider-smoke:${input.target}:${input.now.toISOString()}`,
      originalPayload: input.payload,
    },
  };
}

function fromDispatchResult(
  target: DearMeProviderSmokeTarget,
  result: Awaited<ReturnType<ChannelDispatch>>,
): DearMeProviderSmokeResult {
  if (result.kind === "delivered") {
    return {
      target,
      status: "delivered",
      externalId: result.externalId,
      ...(result.externalUrl ? { externalUrl: result.externalUrl } : {}),
    };
  }
  if (result.kind === "auth-error") {
    return { target, status: "errored", reason: result.reason };
  }
  return { target, status: "errored", reason: result.error };
}

function blockedResult(target: DearMeProviderSmokeTarget, reason: string, missing: string[]) {
  return { target, status: "blocked" as const, reason, missing };
}

function currentFetch(options: DearMeProviderSmokeOptions): FetchLike | null {
  return options.fetch ?? ((globalThis as { fetch?: FetchLike }).fetch ?? null);
}

async function verifyDeploySiteProductionHost(params: {
  result: DeliveredProviderSmokeResult;
  env: Env;
  expectedText: string;
  options: DearMeProviderSmokeOptions;
}): Promise<DearMeProviderSmokeResult> {
  const { result, env, expectedText, options } = params;
  if (!result.externalUrl) {
    return { target: result.target, status: "errored", reason: "deploy-site-production-url-missing" };
  }

  const fetcher = currentFetch(options);
  if (!fetcher) {
    return { target: result.target, status: "errored", reason: "deploy-site-host-fetch-unavailable" };
  }

  let response: FetchResponseLike;
  try {
    response = await fetcher(result.externalUrl, {
      method: "GET",
      headers: { accept: "text/html,application/json;q=0.9,*/*;q=0.1" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { target: result.target, status: "errored", reason: `deploy-site-host-fetch-failed:${message}` };
  }

  if (!response.ok) {
    return { target: result.target, status: "errored", reason: `deploy-site-host-unreachable:${response.status}` };
  }

  const body = response.text ? await response.text() : "";
  const expected = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT) ?? expectedText;
  if (!body.trim()) {
    return { target: result.target, status: "errored", reason: "deploy-site-host-empty-response" };
  }
  if (expected && !body.toLowerCase().includes(expected.toLowerCase())) {
    return { target: result.target, status: "errored", reason: "deploy-site-host-content-mismatch" };
  }

  return { ...result, hostStatus: response.status };
}

function requireLiveConfirmation(
  target: DearMeProviderSmokeTarget,
  options: DearMeProviderSmokeOptions,
) {
  if (!LIVE_TARGETS.has(target)) return [];
  const env = options.env ?? process.env;
  return options.live && boolFlag(env.DEARME_PROVIDER_SMOKE_CONFIRM_LIVE)
    ? []
    : ["--live", "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1"];
}

async function credentialJson(env: Env, jsonKey: string, fileKey: string) {
  const direct = nonEmpty(env[jsonKey]);
  if (direct) return direct;
  const filePath = nonEmpty(env[fileKey]);
  if (!filePath) return null;
  return (await readFile(filePath, "utf8")).trim();
}

async function runDeploySiteSmoke(
  target: "deploy_site_preview" | "deploy_site_production",
  options: DearMeProviderSmokeOptions,
) {
  const env = options.env ?? process.env;
  const missing = targetMissingRequirements(target, env);
  if (missing.length > 0) {
    return blockedResult(target, "missing-provider-smoke-config", missing);
  }

  const dispatch = createDearMeDeploySiteDispatch(
    resolveDearMeDeploySiteDispatchConfigFromEnv(env as NodeJS.ProcessEnv) ?? {},
  );
  const now = options.now?.() ?? new Date();
  const payload = {
    handle: nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke",
    artifactRef: nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF) ?? "smoke:provider-dispatch",
    customDomain: null,
    target: target === "deploy_site_production" ? "production" : "preview",
  };

  const dispatchResult = fromDispatchResult(
    target,
    await dispatch(smokeDispatchInput({
      target,
      toolName: "deploy_site",
      channel: "dearme-cloud",
      payload,
      now,
    })),
  );

  if (target !== "deploy_site_production" || dispatchResult.status !== "delivered") {
    return dispatchResult;
  }

  return verifyDeploySiteProductionHost({
    result: dispatchResult,
    env,
    expectedText: payload.handle,
    options,
  });
}

async function runLinkedInDmSmoke(options: DearMeProviderSmokeOptions) {
  const target = "linkedin_dm";
  const env = options.env ?? process.env;
  const missing = [
    ...targetMissingRequirements(target, env),
    ...requireLiveConfirmation(target, options),
  ];
  if (missing.length > 0) {
    return blockedResult(target, "missing-live-provider-smoke-config", missing);
  }

  const config = resolveDearMeLinkedInDmDispatchConfigFromEnv(env as NodeJS.ProcessEnv);
  assert(config?.messagesUrl);
  const plaintextCredential = await credentialJson(
    env,
    "DEARME_LINKEDIN_DM_CREDENTIAL_JSON",
    "DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE",
  );
  assert(plaintextCredential);
  const now = options.now?.() ?? new Date();
  const dispatch = createDearMeLinkedInDmDispatch({
    ...config,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    now: () => now,
    resolveCredential: async () => plaintextCredential,
  });

  return fromDispatchResult(
    target,
    await dispatch(smokeDispatchInput({
      target,
      toolName: "send_linkedin_dm",
      channel: "linkedin",
      payload: {
        recipientUrn: nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN),
        body: nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_BODY),
        ...(nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_SUBJECT)
          ? { subject: nonEmpty(env.DEARME_LINKEDIN_DM_SMOKE_SUBJECT) }
          : {}),
      },
      encryptedCredential: "dearme-provider-smoke",
      now,
    })),
  );
}

async function runMetaCampaignSmoke(options: DearMeProviderSmokeOptions) {
  const target = "meta_campaign";
  const env = options.env ?? process.env;
  const missing = [
    ...targetMissingRequirements(target, env),
    ...requireLiveConfirmation(target, options),
  ];
  if (missing.length > 0) {
    return blockedResult(target, "missing-live-provider-smoke-config", missing);
  }

  const plaintextCredential = await credentialJson(
    env,
    "DEARME_META_CAMPAIGN_CREDENTIAL_JSON",
    "DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE",
  );
  assert(plaintextCredential);
  const config = resolveDearMeMetaCampaignDispatchConfigFromEnv(env as NodeJS.ProcessEnv) ?? {};
  const now = options.now?.() ?? new Date();
  const dispatch = createDearMeMetaCampaignDispatch({
    ...config,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    now: () => now,
    resolveCredential: async () => plaintextCredential,
  });
  const dailyBudgetUsd = parseNumber(env.DEARME_META_CAMPAIGN_SMOKE_DAILY_BUDGET_USD, 1);

  return fromDispatchResult(
    target,
    await dispatch(smokeDispatchInput({
      target,
      toolName: "create_meta_campaign",
      channel: "meta_ads",
      payload: {
        campaign: {
          name:
            nonEmpty(env.DEARME_META_CAMPAIGN_SMOKE_NAME) ??
            `DearMe provider smoke ${now.toISOString().slice(0, 10)}`,
          objective: nonEmpty(env.DEARME_META_CAMPAIGN_SMOKE_OBJECTIVE) ?? "OUTCOME_LEADS",
          dailyBudgetUsd,
          creativeRefs: parseList(
            env.DEARME_META_CAMPAIGN_SMOKE_CREATIVE_REFS,
            ["smoke:creative"],
          ),
          audienceRef:
            nonEmpty(env.DEARME_META_CAMPAIGN_SMOKE_AUDIENCE_REF) ?? "smoke:audience",
        },
        budgetTier: nonEmpty(env.DEARME_META_CAMPAIGN_SMOKE_BUDGET_TIER) ?? "test",
        learningWindowHours: parseNumber(
          env.DEARME_META_CAMPAIGN_SMOKE_LEARNING_WINDOW_HOURS,
          168,
        ),
      },
      encryptedCredential: "dearme-provider-smoke",
      now,
    })),
  );
}

async function runTarget(
  target: DearMeProviderSmokeTarget,
  options: DearMeProviderSmokeOptions,
): Promise<DearMeProviderSmokeResult> {
  switch (target) {
    case "deploy_site_preview":
    case "deploy_site_production":
      return runDeploySiteSmoke(target, options);
    case "linkedin_dm":
      return runLinkedInDmSmoke(options);
    case "meta_campaign":
      return runMetaCampaignSmoke(options);
  }
}

export async function runDearMeProviderSmoke(
  options: DearMeProviderSmokeOptions,
): Promise<DearMeProviderSmokeResult[]> {
  const targets = options.target === "all"
    ? DEARME_PROVIDER_SMOKE_TARGETS
    : [options.target];
  const results: DearMeProviderSmokeResult[] = [];
  for (const target of targets) {
    results.push(await runTarget(target, options));
  }
  return results;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:provider-smoke -- [--check] [--target <target>] [--live] [--json] [--env-file <path>]

Targets:
  deploy_site_preview       Safe receipt smoke for the private preview path.
  deploy_site_production    Production host smoke; verifies the returned URL serves expected page text.
  linkedin_dm               Live partner endpoint smoke. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  meta_campaign             Live Meta Marketing API smoke. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  all                       Run every target.

Setup:
  pnpm --silent dearme:provider-smoke -- --print-env-template > .dearme-provider-smoke.env
  pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check

Default with no target is --check. Secret JSON can be passed directly or by file:
  DEARME_LINKEDIN_DM_CREDENTIAL_JSON(_FILE)
  DEARME_META_CAMPAIGN_CREDENTIAL_JSON(_FILE)`);
}

function printReadiness(readiness: readonly DearMeProviderSmokeReadiness[]) {
  console.log("DearMe provider smoke readiness");
  for (const item of readiness) {
    const state = item.ready ? "ready" : `blocked: ${item.missing.join(", ")}`;
    const live = item.liveConfirmationRequired
      ? " Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 to run."
      : "";
    console.log(`- ${item.target}: ${state}. ${item.description}.${live}`);
  }
}

function printResults(results: readonly DearMeProviderSmokeResult[]) {
  console.log("DearMe provider smoke result");
  for (const result of results) {
    if (result.status === "delivered") {
      const host = typeof result.hostStatus === "number" ? ` host=${result.hostStatus}` : "";
      console.log(
        `- ${result.target}: delivered ${result.externalId}${host}${result.externalUrl ? ` ${result.externalUrl}` : ""}`,
      );
    } else if (result.status === "blocked") {
      console.log(`- ${result.target}: blocked ${result.reason}; missing ${result.missing.join(", ")}`);
    } else {
      console.log(`- ${result.target}: errored ${result.reason}`);
    }
  }
}

async function main() {
  try {
    const parsed = parseDearMeProviderSmokeArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    if (parsed.printEnvTemplate) {
      console.log(dearMeProviderSmokeEnvTemplate());
      return;
    }

    const env = await loadDearMeProviderSmokeEnv(parsed.envFiles, process.env);

    if (!parsed.target || parsed.check) {
      const readiness = inspectDearMeProviderSmokeReadiness(env);
      if (parsed.json) {
        console.log(JSON.stringify({ readiness }, null, 2));
      } else {
        printReadiness(readiness);
      }
      return;
    }

    const results = await runDearMeProviderSmoke({
      target: parsed.target,
      live: parsed.live,
      env,
    });
    if (parsed.json) {
      console.log(JSON.stringify({ results }, null, 2));
    } else {
      printResults(results);
    }
    if (results.some((result) => result.status !== "delivered")) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `DearMe provider smoke failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  void main();
}
