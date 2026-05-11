import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, join, resolve } from "node:path";
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
import {
  createDearMeOpenClawGatewayDispatchMap,
  type DearMeOpenClawGatewayDispatchDeps,
} from "../server/src/services/dearme-openclaw-gateway-dispatch.js";
import {
  resolveDearMeOpenClawGatewayDispatchConfigFromEnv,
} from "../server/src/services/dearme-openclaw-gateway-dispatch-config.js";
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
  "deploy_site_host_rehearsal",
  "deploy_site_production",
  "linkedin_dm",
  "telegram_message",
  "imessage_message",
  "meta_campaign",
] as const;

export type DearMeProviderSmokeTarget = (typeof DEARME_PROVIDER_SMOKE_TARGETS)[number];
const DEARME_PROVIDER_SMOKE_DEFAULT_TARGETS = DEARME_PROVIDER_SMOKE_TARGETS.filter(
  (target) => target !== "deploy_site_host_rehearsal",
) as Exclude<DearMeProviderSmokeTarget, "deploy_site_host_rehearsal">[];

const DEARME_PROVIDER_SMOKE_TARGET_GROUPS = {
  openclaw_messages: ["telegram_message", "imessage_message"],
} as const satisfies Record<string, readonly DearMeProviderSmokeTarget[]>;

type DearMeProviderSmokeTargetGroup = keyof typeof DEARME_PROVIDER_SMOKE_TARGET_GROUPS;
type TargetArg = DearMeProviderSmokeTarget | DearMeProviderSmokeTargetGroup | "all";
type ProviderSmokeRunnableTarget = Exclude<TargetArg, "all">;

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
      externalUrl?: string;
      hostStatus?: number;
    };

export interface DearMeProviderSmokeOptions {
  target: TargetArg;
  live?: boolean;
  env?: Env;
  fetch?: FetchLike;
  openClawGatewayExecute?: NonNullable<DearMeOpenClawGatewayDispatchDeps["execute"]>;
  now?: () => Date;
}

type DeliveredProviderSmokeResult = Extract<DearMeProviderSmokeResult, { status: "delivered" }>;

interface DeploySiteHostSmokeManifest {
  version: 1;
  handle: string;
  route: string;
  files: {
    html: "index.html";
    proof: "proof.json";
  };
  expectedText: string;
  checks: {
    viewport: boolean;
    customerSafeLanguage: boolean;
    approvalBoundary: string;
    waitsFor: string[];
    starterDraftCount: number;
    opportunityCount: number;
    continuationCount: number;
    continuation: {
      title: string;
      nextReview: string;
      preparedArtifacts: string[];
      ownerRoles: string[];
      approvalBoundaries: string[];
    };
  };
  checksums: {
    htmlSha256: string;
    proofSha256: string;
  };
}

interface DeploySiteHostSmokeProof {
  expectedText: string;
  manifestRef?: string;
}

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
  "telegram_message",
  "imessage_message",
  "meta_campaign",
]);

const PROVIDER_SMOKE_ENV_FILE = ".dearme-provider-smoke.env";
const PRIVATE_SITE_EXPORT_COMMAND =
  "pnpm --silent dearme:aha-proof -- --export-site dist/dearme-private-proof";
const PROVIDER_SMOKE_BASE_COMMAND =
  `pnpm --silent dearme:provider-smoke -- --env-file ${PROVIDER_SMOKE_ENV_FILE}`;
const LOCAL_TELEGRAM_SMOKE_BODY =
  "DearMe live proof smoke: private proof packet is reachable and OpenClaw Telegram delivery is being verified.";
const DEFAULT_IMESSAGE_SMOKE_BODY =
  "DearMe live proof smoke: private proof packet is ready and OpenClaw iMessage delivery is being verified.";

function providerSmokeRunCommand(target: ProviderSmokeRunnableTarget): string {
  const command = `${PROVIDER_SMOKE_BASE_COMMAND} --target ${target}`;
  return expandProviderSmokeTargets(target).some((expandedTarget) =>
    LIVE_TARGETS.has(expandedTarget),
  )
    ? `DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 ${command} --live`
    : command;
}

function providerSmokeRunTargetsForCommands(
  blockedTargets: readonly DearMeProviderSmokeTarget[],
  targetArg: TargetArg,
): ProviderSmokeRunnableTarget[] {
  const blockedTargetSet = new Set(blockedTargets);
  const shouldGroupOpenClawMessages =
    (targetArg === "all" || targetArg === "openclaw_messages")
    && blockedTargetSet.has("telegram_message")
    && blockedTargetSet.has("imessage_message");

  const runTargets: ProviderSmokeRunnableTarget[] = [];
  for (const target of blockedTargets) {
    if (shouldGroupOpenClawMessages && target === "telegram_message") {
      runTargets.push("openclaw_messages");
    } else if (shouldGroupOpenClawMessages && target === "imessage_message") {
      continue;
    } else {
      runTargets.push(target);
    }
  }
  return runTargets;
}

function includesTemplateTarget(targetArg: TargetArg, ...targets: DearMeProviderSmokeTarget[]) {
  return expandProviderSmokeTargets(targetArg).some((target) => targets.includes(target));
}

export function dearMeProviderSmokeEnvTemplate(targetArg: TargetArg = "all"): string {
  const targetFlag = targetArg === "all" ? "" : ` --target ${targetArg}`;
  const selectedRunCommands = targetArg === "all"
    ? [`${PROVIDER_SMOKE_BASE_COMMAND} --target deploy_site_preview`]
    : [providerSmokeRunCommand(targetArg)];
  const includesProductionHostSmoke = includesTemplateTarget(targetArg, "deploy_site_production");
  const includesHostRehearsalSmoke = includesTemplateTarget(targetArg, "deploy_site_host_rehearsal");
  const includesHostSmoke = includesProductionHostSmoke || includesHostRehearsalSmoke;
  const siteSmokeArtifactRef = includesHostSmoke
    ? "dist/dearme-private-proof/peter-studio/index.html"
    : "smoke:provider-dispatch";
  const siteSmokeManifestRef = includesHostSmoke
    ? "dist/dearme-private-proof/peter-studio/host-smoke.json"
    : "";
  const siteSmokeExpectedText = includesHostSmoke
    ? ""
    : "peter-studio";
  const siteBaseUrl = includesHostRehearsalSmoke && !includesProductionHostSmoke
    ? "http://127.0.0.1:8787"
    : "https://dearme.example.test";
  const sections = [`# DearMe provider smoke local env.
# Keep this file local. The repository ignores .dearme-provider-smoke.env.
#
# Check readiness:
# ${PROVIDER_SMOKE_BASE_COMMAND} --check${targetFlag}
#
# Run the selected smoke${selectedRunCommands.length > 1 ? "s" : ""}:
${selectedRunCommands.map((command) => `# ${command}`).join("\n")}
#
# Run live provider smokes only after setting DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1
# and passing --live on the command line.
`];

  if (includesTemplateTarget(
    targetArg,
    "deploy_site_preview",
    "deploy_site_host_rehearsal",
    "deploy_site_production",
  )) {
    const hostSmokeArtifactHelp = includesHostSmoke
      ? `#
# Host smoke artifact:
# pnpm --silent dearme:aha-proof -- --export-site dist/dearme-private-proof
${includesHostRehearsalSmoke ? "# For deploy_site_host_rehearsal, serve dist/dearme-private-proof at the loopback URL.\n" : ""}${includesProductionHostSmoke ? "# For deploy_site_production, host dist/dearme-private-proof at the production URL.\n# The production URL must be public HTTPS; localhost/private-network URLs are not phone-reachable proof.\n" : ""}# The host smoke reads dist/dearme-private-proof/peter-studio/host-smoke.json for expected text/checksums.
# DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT is only needed as a manual override.
# DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=dist/dearme-private-proof/peter-studio/index.html
# DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF=dist/dearme-private-proof/peter-studio/host-smoke.json
`
      : "";
    sections.push(`
DEARME_DEPLOY_SITE_BASE_URL=${siteBaseUrl}
DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=0
DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=0
DEARME_DEPLOY_SITE_SMOKE_HANDLE=peter-studio
DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=${siteSmokeArtifactRef}
DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF=${siteSmokeManifestRef}
DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN=
DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=${siteSmokeExpectedText}
${hostSmokeArtifactHelp}`);
  }

  if (includesTemplateTarget(targetArg, "linkedin_dm")) {
    sections.push(`
DEARME_LINKEDIN_DM_MESSAGES_URL=
DEARME_LINKEDIN_DM_CREDENTIAL_JSON_FILE=/absolute/path/to/linkedin-credential.json
DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN=
DEARME_LINKEDIN_DM_SMOKE_SUBJECT=Private proof
DEARME_LINKEDIN_DM_SMOKE_BODY=Your private DearMe proof packet is ready.
`);
  }

  if (includesTemplateTarget(targetArg, "telegram_message", "imessage_message")) {
    sections.push(`
OPENCLAW_GATEWAY_URL=
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_WEBHOOK_AUTH=
PAPERCLIP_API_URL=

# Optional local OpenClaw reuse. These do not send unless --live and
# DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 are both set.
DEARME_USE_LOCAL_OPENCLAW_CONFIG=0
DEARME_OPENCLAW_USE_LOCAL_TELEGRAM_SMOKE=0
DEARME_OPENCLAW_TELEGRAM_ALLOW_FROM_FILE=
`);
  }

  if (includesTemplateTarget(targetArg, "telegram_message")) {
    sections.push(`
DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT=
DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY=Your private DearMe proof packet is ready.
`);
  }

  if (includesTemplateTarget(targetArg, "imessage_message")) {
    sections.push(`
DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT=
DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE=imessage
`);
  }

  if (includesTemplateTarget(targetArg, "meta_campaign")) {
    sections.push(`
DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL=https://graph.facebook.com/v25.0
DEARME_META_CAMPAIGN_CREDENTIAL_JSON_FILE=/absolute/path/to/meta-credential.json
DEARME_META_CAMPAIGN_SMOKE_NAME=DearMe provider smoke
DEARME_META_CAMPAIGN_SMOKE_OBJECTIVE=OUTCOME_LEADS
DEARME_META_CAMPAIGN_SMOKE_DAILY_BUDGET_USD=1
DEARME_META_CAMPAIGN_SMOKE_CREATIVE_REFS=smoke:creative
DEARME_META_CAMPAIGN_SMOKE_AUDIENCE_REF=smoke:audience
DEARME_META_CAMPAIGN_SMOKE_BUDGET_TIER=test
DEARME_META_CAMPAIGN_SMOKE_LEARNING_WINDOW_HOURS=168
`);
  }

  sections.push(`
DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=0`);
  return sections.join("").trimEnd();
}

export function dearMeProviderSmokeOperatorCommands(
  blockedTargets: readonly DearMeProviderSmokeTarget[] = [],
  targetArg: TargetArg = "all",
): string[] {
  const scopedTarget = targetArg !== "all"
    ? targetArg
    : blockedTargets.length === 1
      ? blockedTargets[0]
      : null;
  const targetFlag = scopedTarget ? ` --target ${scopedTarget}` : "";
  const commands = [
    `pnpm --silent dearme:provider-smoke -- --print-env-template${targetFlag} > ${PROVIDER_SMOKE_ENV_FILE}`,
    `${PROVIDER_SMOKE_BASE_COMMAND} --check${targetFlag}`,
  ];
  if (
    blockedTargets.includes("deploy_site_production") ||
    blockedTargets.includes("deploy_site_host_rehearsal")
  ) {
    commands.unshift(PRIVATE_SITE_EXPORT_COMMAND);
  }
  for (const target of providerSmokeRunTargetsForCommands(blockedTargets, targetArg)) {
    commands.push(providerSmokeRunCommand(target));
  }
  return commands;
}

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function boolFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function localOpenClawConfigPath(env: Env) {
  const explicitPath = nonEmpty(env.DEARME_OPENCLAW_CONFIG_FILE);
  if (explicitPath) return explicitPath;

  const explicitDir =
    nonEmpty(env.DEARME_OPENCLAW_CONFIG_DIR) ?? nonEmpty(env.OPENCLAW_CONFIG_DIR);
  if (explicitDir) return join(explicitDir, "openclaw.json");

  const home = nonEmpty(env.HOME) ?? nonEmpty(process.env.HOME);
  return home ? join(home, ".openclaw", "openclaw.json") : null;
}

function localOpenClawConfigDir(env: Env) {
  const explicitDir =
    nonEmpty(env.DEARME_OPENCLAW_CONFIG_DIR) ?? nonEmpty(env.OPENCLAW_CONFIG_DIR);
  if (explicitDir) return explicitDir;

  const configPath = localOpenClawConfigPath(env);
  return configPath ? dirname(configPath) : null;
}

function openClawGatewayDefaultsFromLocalConfig(env: Env): Env {
  if (!boolFlag(env.DEARME_USE_LOCAL_OPENCLAW_CONFIG)) return {};

  const configPath = localOpenClawConfigPath(env);
  if (!configPath) return {};

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
      gateway?: {
        port?: unknown;
        auth?: { token?: unknown };
      };
    };
    const port = typeof parsed.gateway?.port === "number"
      ? parsed.gateway.port
      : Number(parsed.gateway?.port);
    const token = typeof parsed.gateway?.auth?.token === "string"
      ? parsed.gateway.auth.token.trim()
      : "";

    return {
      ...(Number.isInteger(port) && port > 0
        ? { OPENCLAW_GATEWAY_URL: `ws://127.0.0.1:${port}` }
        : {}),
      ...(token ? { OPENCLAW_GATEWAY_TOKEN: token } : {}),
    };
  } catch {
    return {};
  }
}

function localOpenClawTelegramAllowFromPath(env: Env) {
  const explicitPath = nonEmpty(env.DEARME_OPENCLAW_TELEGRAM_ALLOW_FROM_FILE);
  if (explicitPath) return explicitPath;

  const configDir = localOpenClawConfigDir(env);
  return configDir ? join(configDir, "credentials", "telegram-default-allowFrom.json") : null;
}

function recipientFromScalar(value: unknown) {
  if (typeof value === "string") return nonEmpty(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function recipientFromObject(value: Record<string, unknown>) {
  for (const key of ["recipient", "chatId", "userId", "id", "username"]) {
    const recipient = recipientFromScalar(value[key]);
    if (recipient) return recipient;
  }
  return null;
}

function firstTelegramAllowFromRecipient(value: unknown) {
  const allowFrom = value && typeof value === "object" && !Array.isArray(value)
    ? (value as { allowFrom?: unknown }).allowFrom
    : null;
  if (!Array.isArray(allowFrom)) return null;

  for (const item of allowFrom) {
    const scalar = recipientFromScalar(item);
    if (scalar) return scalar;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const objectRecipient = recipientFromObject(item as Record<string, unknown>);
      if (objectRecipient) return objectRecipient;
    }
  }
  return null;
}

function telegramSmokeDefaultsFromLocalOpenClaw(env: Env): Env {
  if (
    !boolFlag(env.DEARME_USE_LOCAL_OPENCLAW_CONFIG) ||
    !boolFlag(env.DEARME_OPENCLAW_USE_LOCAL_TELEGRAM_SMOKE)
  ) {
    return {};
  }

  const allowFromPath = localOpenClawTelegramAllowFromPath(env);
  if (!allowFromPath) return {};

  try {
    const recipient = firstTelegramAllowFromRecipient(
      JSON.parse(readFileSync(allowFromPath, "utf8")),
    );
    return {
      ...(recipient ? { DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: recipient } : {}),
      DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: LOCAL_TELEGRAM_SMOKE_BODY,
    };
  } catch {
    return {};
  }
}

function providerSmokeEnvWithLocalOpenClawDefaults(env: Env): Env {
  const explicitEnv = Object.fromEntries(
    Object.entries(env).filter(([, value]) => nonEmpty(value)),
  );
  const resolvedEnv = {
    ...openClawGatewayDefaultsFromLocalConfig(env),
    ...telegramSmokeDefaultsFromLocalOpenClaw(env),
    ...explicitEnv,
  };
  return {
    ...resolvedEnv,
    DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY:
      nonEmpty(resolvedEnv.DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY) ?? DEFAULT_IMESSAGE_SMOKE_BODY,
  };
}

function firstEnv(env: Env, keys: readonly string[]) {
  for (const key of keys) {
    const value = nonEmpty(env[key]);
    if (value) return value;
  }
  return null;
}

function deploySiteBaseUrl(env: Env) {
  return firstEnv(env, [
    "DEARME_DEPLOY_SITE_BASE_URL",
    "DEARME_SITE_BASE_URL",
    "DEARME_PUBLIC_SITE_BASE_URL",
  ]);
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
    case "deploy_site_host_rehearsal":
      return "prove the exported private site packet can be served from a loopback host";
    case "deploy_site_production":
      return "prove the configured production DearMe site host serves the smoke page";
    case "linkedin_dm":
      return "send one LinkedIn DM through the configured partner endpoint";
    case "telegram_message":
      return "send one Telegram message through the configured OpenClaw gateway";
    case "imessage_message":
      return "send one iMessage/SMS through the configured OpenClaw gateway";
    case "meta_campaign":
      return "create one paused Meta campaign through the Marketing API";
  }
}

function credentialRequirement(env: Env, jsonKey: string, fileKey: string) {
  return firstEnv(env, [jsonKey, fileKey]) ? [] : [`${jsonKey} or ${fileKey}`];
}

function expandProviderSmokeTargets(targetArg: TargetArg): readonly DearMeProviderSmokeTarget[] {
  if (targetArg === "all") return DEARME_PROVIDER_SMOKE_DEFAULT_TARGETS;
  const group = DEARME_PROVIDER_SMOKE_TARGET_GROUPS[targetArg as DearMeProviderSmokeTargetGroup];
  if (group) return group;
  return [targetArg as DearMeProviderSmokeTarget];
}

function openClawGatewayRequirement(env: Env) {
  const resolvedEnv = providerSmokeEnvWithLocalOpenClawDefaults(env);
  const config = resolveDearMeOpenClawGatewayDispatchConfigFromEnv(resolvedEnv as NodeJS.ProcessEnv);
  return [
    ...(config?.url ? [] : ["OPENCLAW_GATEWAY_URL"]),
    ...(firstEnv(resolvedEnv, ["OPENCLAW_GATEWAY_TOKEN", "OPENCLAW_WEBHOOK_AUTH"])
      ? []
      : ["OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH"]),
  ];
}

function deploySiteBaseUrlRequirement(env: Env) {
  if (nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN)) return [];
  return deploySiteBaseUrl(env)
    ? []
    : ["DEARME_DEPLOY_SITE_BASE_URL or DEARME_SITE_BASE_URL or DEARME_PUBLIC_SITE_BASE_URL"];
}

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function ipv4MappedToIpv4(hostname: string) {
  if (!hostname.startsWith("::ffff:")) return null;
  const mapped = hostname.slice("::ffff:".length);
  if (isIP(mapped) === 4) return mapped;
  const match = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(mapped);
  if (!match) return null;
  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);
  if (!Number.isInteger(high) || !Number.isInteger(low)) return null;
  return [
    (high >> 8) & 255,
    high & 255,
    (low >> 8) & 255,
    low & 255,
  ].join(".");
}

function isLocalProductionHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1"
  ) {
    return true;
  }
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) {
    const mappedIpv4 = ipv4MappedToIpv4(normalized);
    if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
    return (
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }
  return false;
}

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1"
  ) {
    return true;
  }
  if (isIP(normalized) === 4) {
    return normalized.split(".")[0] === "127";
  }
  if (isIP(normalized) === 6) {
    const mappedIpv4 = ipv4MappedToIpv4(normalized);
    return mappedIpv4 ? mappedIpv4.split(".")[0] === "127" : false;
  }
  return false;
}

function deploySiteProductionHostRequirement(env: Env) {
  if (nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN)) return [];
  const baseUrl = deploySiteBaseUrl(env);
  if (!baseUrl) return [];

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return ["DEARME_DEPLOY_SITE_BASE_URL must be a valid public https URL"];
  }

  const missing: string[] = [];
  if (parsed.protocol !== "https:") {
    missing.push("DEARME_DEPLOY_SITE_BASE_URL must use https for phone-reachable proof");
  }
  if (isLocalProductionHost(parsed.hostname)) {
    missing.push("DEARME_DEPLOY_SITE_BASE_URL must be a phone-reachable public host, not localhost or a private network");
  }
  return missing;
}

function deploySiteHostRehearsalBaseUrlRequirement(env: Env) {
  const baseUrl = deploySiteBaseUrl(env);
  if (!baseUrl) return [];

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return ["DEARME_DEPLOY_SITE_BASE_URL must be a valid loopback http(s) URL"];
  }

  const missing: string[] = [];
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    missing.push("DEARME_DEPLOY_SITE_BASE_URL must use http or https for loopback host rehearsal");
  }
  if (!isLoopbackHost(parsed.hostname)) {
    missing.push("DEARME_DEPLOY_SITE_BASE_URL must be loopback for host rehearsal");
  }
  return missing;
}

function deploySiteHostSmokeUrl(env: Env) {
  const baseUrl = deploySiteBaseUrl(env);
  if (!baseUrl) return null;
  const parsed = new URL(baseUrl);
  const handle = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke";
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/${encodeURIComponent(handle)}/index.html`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function deploySiteProductionArtifactRequirement(env: Env) {
  const artifactRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF);
  if (
    artifactRef
    && !artifactRef.startsWith("smoke:")
    && !/^[a-z][a-z0-9+.-]*:/i.test(artifactRef)
    && artifactRef.endsWith("/index.html")
  ) {
    return [];
  }
  return ["DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF=dist/dearme-private-proof/<handle>/index.html"];
}

function deploySiteHostSmokeManifestRef(env: Env) {
  const explicitManifestRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF);
  if (explicitManifestRef) return explicitManifestRef;

  const artifactRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF);
  if (!artifactRef || artifactRef.startsWith("smoke:")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(artifactRef)) return null;
  return artifactRef.endsWith("/index.html")
    ? `${artifactRef.slice(0, -"/index.html".length)}/host-smoke.json`
    : null;
}

function readDeploySiteHostSmokeExpectedText(env: Env) {
  const manifestRef = deploySiteHostSmokeManifestRef(env);
  if (!manifestRef) return null;
  try {
    const parsed = JSON.parse(readFileSync(resolve(manifestRef), "utf8")) as { expectedText?: unknown };
    return typeof parsed.expectedText === "string" ? nonEmpty(parsed.expectedText) : null;
  } catch {
    return null;
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && Boolean(nonEmpty(item)));
}

function parseDeploySiteHostSmokeManifest(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { manifest: null, errors: ["host-smoke.json must be valid JSON"] };
  }

  const errors: string[] = [];
  if (!isObject(parsed)) {
    return { manifest: null, errors: ["host-smoke.json must be a JSON object"] };
  }

  const files = isObject(parsed.files) ? parsed.files : {};
  const checks = isObject(parsed.checks) ? parsed.checks : {};
  const continuation = isObject(checks.continuation) ? checks.continuation : {};
  const checksums = isObject(parsed.checksums) ? parsed.checksums : {};
  if (parsed.version !== 1) errors.push("host-smoke.json version must be 1");
  if (!nonEmpty(typeof parsed.handle === "string" ? parsed.handle : undefined)) {
    errors.push("host-smoke.json handle must be present");
  }
  if (!nonEmpty(typeof parsed.route === "string" ? parsed.route : undefined)) {
    errors.push("host-smoke.json route must be present");
  }
  if (files.html !== "index.html") errors.push("host-smoke.json files.html must be index.html");
  if (files.proof !== "proof.json") errors.push("host-smoke.json files.proof must be proof.json");
  if (!nonEmpty(typeof parsed.expectedText === "string" ? parsed.expectedText : undefined)) {
    errors.push("host-smoke.json expectedText must be present");
  }
  if (checks.viewport !== true) errors.push("host-smoke.json checks.viewport must be true");
  if (checks.customerSafeLanguage !== true) {
    errors.push("host-smoke.json checks.customerSafeLanguage must be true");
  }
  if (!nonEmpty(typeof checks.approvalBoundary === "string" ? checks.approvalBoundary : undefined)) {
    errors.push("host-smoke.json checks.approvalBoundary must be present");
  }
  if (!Array.isArray(checks.waitsFor) || checks.waitsFor.length === 0) {
    errors.push("host-smoke.json checks.waitsFor must be non-empty");
  }
  if (typeof checks.starterDraftCount !== "number" || checks.starterDraftCount < 5) {
    errors.push("host-smoke.json checks.starterDraftCount must be at least 5");
  }
  if (typeof checks.opportunityCount !== "number" || checks.opportunityCount < 1) {
    errors.push("host-smoke.json checks.opportunityCount must be at least 1");
  }
  if (typeof checks.continuationCount !== "number" || checks.continuationCount < 1) {
    errors.push("host-smoke.json checks.continuationCount must be at least 1");
  }
  if (!nonEmpty(typeof continuation.title === "string" ? continuation.title : undefined)) {
    errors.push("host-smoke.json checks.continuation.title must be present");
  }
  if (!nonEmpty(typeof continuation.nextReview === "string" ? continuation.nextReview : undefined)) {
    errors.push("host-smoke.json checks.continuation.nextReview must be present");
  }
  if (!nonEmptyStringArray(continuation.preparedArtifacts)) {
    errors.push("host-smoke.json checks.continuation.preparedArtifacts must be non-empty");
  }
  if (!nonEmptyStringArray(continuation.ownerRoles)) {
    errors.push("host-smoke.json checks.continuation.ownerRoles must be non-empty");
  }
  if (!nonEmptyStringArray(continuation.approvalBoundaries)) {
    errors.push("host-smoke.json checks.continuation.approvalBoundaries must be non-empty");
  }
  if (!isSha256(checksums.htmlSha256)) {
    errors.push("host-smoke.json checksums.htmlSha256 must be a SHA-256 hex digest");
  }
  if (!isSha256(checksums.proofSha256)) {
    errors.push("host-smoke.json checksums.proofSha256 must be a SHA-256 hex digest");
  }

  return {
    manifest: errors.length === 0 ? parsed as unknown as DeploySiteHostSmokeManifest : null,
    errors,
  };
}

async function resolveDeploySiteHostSmokeProof(env: Env): Promise<{
  proof: DeploySiteHostSmokeProof | null;
  errors: string[];
}> {
  const handle = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke";
  const directExpectedText = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT);
  const directProofText = directExpectedText
    && directExpectedText.toLowerCase() !== handle.toLowerCase()
    ? directExpectedText
    : null;
  const manifestRef = deploySiteHostSmokeManifestRef(env);
  const explicitManifestRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF);
  const shouldReadManifest = Boolean(manifestRef && (explicitManifestRef || !directProofText));

  if (!manifestRef || !shouldReadManifest) {
    return directProofText
      ? { proof: { expectedText: directProofText }, errors: [] }
      : { proof: null, errors: ["DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=<private proof page text>"] };
  }

  const resolvedManifestRef = resolve(manifestRef);
  let rawManifest: string;
  try {
    rawManifest = await readFile(resolvedManifestRef, "utf8");
  } catch {
    return {
      proof: null,
      errors: [`DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF is not readable: ${manifestRef}`],
    };
  }

  const parsed = parseDeploySiteHostSmokeManifest(rawManifest);
  if (!parsed.manifest) return { proof: null, errors: parsed.errors };
  const manifest = parsed.manifest;
  const manifestDir = dirname(resolvedManifestRef);
  const errors: string[] = [];

  if (manifest.handle !== handle) {
    errors.push(`host-smoke.json handle ${manifest.handle} does not match ${handle}`);
  }

  const artifactRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF);
  const resolvedArtifactRef = artifactRef ? resolve(artifactRef) : null;
  const htmlPath = join(manifestDir, manifest.files.html);
  const proofPath = join(manifestDir, manifest.files.proof);
  if (resolvedArtifactRef && resolvedArtifactRef !== htmlPath) {
    errors.push("DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF must point at host-smoke files.html");
  }

  let html: string | null = null;
  let proofJson: string | null = null;
  try {
    html = await readFile(htmlPath, "utf8");
  } catch {
    errors.push(`host-smoke html file is not readable: ${manifest.files.html}`);
  }
  try {
    proofJson = await readFile(proofPath, "utf8");
  } catch {
    errors.push(`host-smoke proof file is not readable: ${manifest.files.proof}`);
  }
  if (html !== null && sha256(html) !== manifest.checksums.htmlSha256) {
    errors.push("host-smoke html checksum mismatch");
  }
  if (proofJson !== null && sha256(proofJson) !== manifest.checksums.proofSha256) {
    errors.push("host-smoke proof checksum mismatch");
  }

  const expectedText = directProofText ?? nonEmpty(manifest.expectedText);
  if (!expectedText || expectedText.toLowerCase() === handle.toLowerCase()) {
    errors.push("host-smoke expectedText must be richer than the handle");
  }

  return {
    proof: errors.length === 0 ? { expectedText, manifestRef } : null,
    errors,
  };
}

function deploySiteExpectedProofText(env: Env) {
  const handle = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke";
  const direct = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT);
  if (direct && direct.toLowerCase() !== handle.toLowerCase()) return direct;

  const manifestText = readDeploySiteHostSmokeExpectedText(env);
  if (manifestText && manifestText.toLowerCase() !== handle.toLowerCase()) return manifestText;

  return direct ?? manifestText;
}

function deploySiteExpectedTextRequirement(env: Env) {
  const expectedText = deploySiteExpectedProofText(env);
  const handle = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke";
  if (expectedText && expectedText.toLowerCase() !== handle.toLowerCase()) return [];
  const manifestRef =
    deploySiteHostSmokeManifestRef(env) ??
    "dist/dearme-private-proof/<handle>/host-smoke.json";
  return [
    `DEARME_DEPLOY_SITE_SMOKE_EXPECT_TEXT=<private proof page text> or readable DEARME_DEPLOY_SITE_SMOKE_MANIFEST_REF=${manifestRef}`,
  ];
}

function targetMissingRequirements(target: DearMeProviderSmokeTarget, env: Env) {
  switch (target) {
    case "deploy_site_preview":
      return nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN)
        && !resolveDearMeDeploySiteDispatchConfigFromEnv(env as NodeJS.ProcessEnv)?.allowCustomDomains
        ? ["DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1"]
        : [];
    case "deploy_site_host_rehearsal":
      return [
        ...deploySiteBaseUrlRequirement(env),
        ...deploySiteHostRehearsalBaseUrlRequirement(env),
        ...deploySiteProductionArtifactRequirement(env),
        ...deploySiteExpectedTextRequirement(env),
      ];
    case "deploy_site_production": {
      const config = resolveDearMeDeploySiteDispatchConfigFromEnv(env as NodeJS.ProcessEnv);
      return [
        ...(config?.allowProduction ? [] : ["DEARME_DEPLOY_SITE_ALLOW_PRODUCTION=1"]),
        ...(nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN) && !config?.allowCustomDomains
          ? ["DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS=1"]
          : []),
        ...deploySiteBaseUrlRequirement(env),
        ...deploySiteProductionHostRequirement(env),
        ...deploySiteProductionArtifactRequirement(env),
        ...deploySiteExpectedTextRequirement(env),
      ];
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
    case "telegram_message":
      return [
        ...openClawGatewayRequirement(env),
        ...(nonEmpty(env.DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT)
          ? []
          : ["DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT"]),
        ...(nonEmpty(env.DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY)
          ? []
          : ["DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY"]),
      ];
    case "imessage_message":
      return [
        ...openClawGatewayRequirement(env),
        ...(nonEmpty(env.DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT)
          ? []
          : ["DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT"]),
        ...(nonEmpty(env.DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY)
          ? []
          : ["DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY"]),
      ];
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
  targetArg: TargetArg = "all",
): DearMeProviderSmokeReadiness[] {
  const resolvedEnv = providerSmokeEnvWithLocalOpenClawDefaults(env);
  return expandProviderSmokeTargets(targetArg).map((target) => {
    const missing = targetMissingRequirements(target, resolvedEnv);
    return {
      target,
      ready: missing.length === 0,
      missing,
      liveConfirmationRequired: LIVE_TARGETS.has(target),
      description: targetDescription(target),
    };
  });
}

function sharedBlockedRequirements(
  readiness: readonly DearMeProviderSmokeReadiness[],
  targetArg: TargetArg,
) {
  if (targetArg === "all") return [];
  const blocked = readiness.filter((item) => !item.ready);
  if (blocked.length < 2) return [];
  const [first, ...rest] = blocked;
  return first.missing.filter((requirement) =>
    rest.every((item) => item.missing.includes(requirement)),
  );
}

export function formatDearMeProviderSmokeReadiness(
  readiness: readonly DearMeProviderSmokeReadiness[],
  targetArg: TargetArg = "all",
): string[] {
  const lines = ["DearMe provider smoke readiness"];
  const sharedMissing = sharedBlockedRequirements(readiness, targetArg);
  const sharedMissingSet = new Set(sharedMissing);

  if (sharedMissing.length > 0) {
    lines.push(`Shared missing config: ${sharedMissing.join(", ")}`);
  }

  for (const item of readiness) {
    const itemMissing = item.missing.filter((requirement) =>
      !sharedMissingSet.has(requirement),
    );
    const blocked = itemMissing.length > 0 ? itemMissing.join(", ") : "shared config above";
    const state = item.ready ? "ready" : `blocked: ${blocked}`;
    const live = item.liveConfirmationRequired
      ? " Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 to run."
      : "";
    lines.push(`- ${item.target}: ${state}. ${item.description}.${live}`);
  }

  const blockedTargets = readiness
    .filter((item) => !item.ready)
    .map((item) => item.target);
  if (blockedTargets.length === 0) return lines;

  lines.push("");
  lines.push("Next provider-smoke setup:");
  for (const command of dearMeProviderSmokeOperatorCommands(blockedTargets, targetArg)) {
    lines.push(`- ${command}`);
  }
  return lines;
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
    host_rehearsal: "deploy_site_host_rehearsal",
    site_rehearsal: "deploy_site_host_rehearsal",
    loopback_host: "deploy_site_host_rehearsal",
    loopback_rehearsal: "deploy_site_host_rehearsal",
    deploy_site_host_rehearsal: "deploy_site_host_rehearsal",
    deploy_production: "deploy_site_production",
    site_production: "deploy_site_production",
    production: "deploy_site_production",
    linkedin: "linkedin_dm",
    linkedin_dm: "linkedin_dm",
    telegram: "telegram_message",
    telegram_message: "telegram_message",
    send_telegram_message: "telegram_message",
    imessage: "imessage_message",
    imessage_message: "imessage_message",
    send_imessage: "imessage_message",
    openclaw: "openclaw_messages",
    openclaw_message: "openclaw_messages",
    openclaw_messages: "openclaw_messages",
    gateway_messages: "openclaw_messages",
    meta: "meta_campaign",
    meta_ads: "meta_campaign",
    meta_campaign: "meta_campaign",
  };
  const target = aliases[normalized] ?? normalized;
  if (
    target === "all"
    || DEARME_PROVIDER_SMOKE_TARGETS.includes(target as DearMeProviderSmokeTarget)
    || Object.prototype.hasOwnProperty.call(DEARME_PROVIDER_SMOKE_TARGET_GROUPS, target)
  ) {
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

function fetchFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error && typeof error === "object"
    ? (error as { cause?: unknown }).cause
    : null;
  const causeCode = cause && typeof cause === "object"
    ? (cause as { code?: unknown }).code
    : null;
  if (typeof causeCode === "string" && causeCode.trim()) {
    return `${message}:${causeCode.trim()}`;
  }
  return message;
}

async function verifyDeploySiteHost(params: {
  result: DeliveredProviderSmokeResult;
  expectedText: string;
  options: DearMeProviderSmokeOptions;
}): Promise<DearMeProviderSmokeResult> {
  const { result, expectedText, options } = params;
  if (!result.externalUrl) {
    return { target: result.target, status: "errored", reason: "deploy-site-host-url-missing" };
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
    return {
      target: result.target,
      status: "errored",
      reason: `deploy-site-host-fetch-failed:${fetchFailureMessage(error)}`,
      externalUrl: result.externalUrl,
    };
  }

  if (!response.ok) {
    return {
      target: result.target,
      status: "errored",
      reason: `deploy-site-host-unreachable:${response.status}`,
      externalUrl: result.externalUrl,
      hostStatus: response.status,
    };
  }

  const body = response.text ? await response.text() : "";
  const expected = expectedText;
  if (!body.trim()) {
    return {
      target: result.target,
      status: "errored",
      reason: "deploy-site-host-empty-response",
      externalUrl: result.externalUrl,
      hostStatus: response.status,
    };
  }
  if (expected && !body.toLowerCase().includes(expected.toLowerCase())) {
    return {
      target: result.target,
      status: "errored",
      reason: "deploy-site-host-content-mismatch",
      externalUrl: result.externalUrl,
      hostStatus: response.status,
    };
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

  const hostSmokeProof = target === "deploy_site_production"
    ? await resolveDeploySiteHostSmokeProof(env)
    : { proof: null, errors: [] };
  if (hostSmokeProof.errors.length > 0) {
    return blockedResult(target, "invalid-host-smoke-manifest", hostSmokeProof.errors);
  }

  const dispatch = createDearMeDeploySiteDispatch(
    resolveDearMeDeploySiteDispatchConfigFromEnv(env as NodeJS.ProcessEnv) ?? {},
  );
  const now = options.now?.() ?? new Date();
  const payload = {
    handle: nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ?? "dearme-smoke",
    artifactRef: nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF) ?? "smoke:provider-dispatch",
    customDomain: nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_CUSTOM_DOMAIN),
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

  return verifyDeploySiteHost({
    result: dispatchResult,
    expectedText: hostSmokeProof.proof?.expectedText ?? payload.handle,
    options,
  });
}

async function runDeploySiteHostRehearsalSmoke(
  options: DearMeProviderSmokeOptions,
) {
  const target = "deploy_site_host_rehearsal";
  const env = options.env ?? process.env;
  const missing = targetMissingRequirements(target, env);
  if (missing.length > 0) {
    return blockedResult(target, "missing-provider-smoke-config", missing);
  }

  const hostSmokeProof = await resolveDeploySiteHostSmokeProof(env);
  if (hostSmokeProof.errors.length > 0) {
    return blockedResult(target, "invalid-host-smoke-manifest", hostSmokeProof.errors);
  }

  const externalUrl = deploySiteHostSmokeUrl(env);
  if (!externalUrl) {
    return blockedResult(target, "missing-provider-smoke-config", [
      "DEARME_DEPLOY_SITE_BASE_URL or DEARME_SITE_BASE_URL or DEARME_PUBLIC_SITE_BASE_URL",
    ]);
  }

  const artifactRef = nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_ARTIFACT_REF) ?? "";
  return verifyDeploySiteHost({
    result: {
      target,
      status: "delivered",
      externalId: `dearme_host_rehearsal_${sha256(`${externalUrl}:${artifactRef}`).slice(0, 16)}`,
      externalUrl,
    },
    expectedText:
      hostSmokeProof.proof?.expectedText ??
      nonEmpty(env.DEARME_DEPLOY_SITE_SMOKE_HANDLE) ??
      "dearme-smoke",
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

async function runOpenClawGatewayMessageSmoke(
  target: "telegram_message" | "imessage_message",
  options: DearMeProviderSmokeOptions,
) {
  const env = providerSmokeEnvWithLocalOpenClawDefaults(options.env ?? process.env);
  const missing = [
    ...targetMissingRequirements(target, env),
    ...requireLiveConfirmation(target, options),
  ];
  if (missing.length > 0) {
    return blockedResult(target, "missing-live-provider-smoke-config", missing);
  }

  const config = resolveDearMeOpenClawGatewayDispatchConfigFromEnv(env as NodeJS.ProcessEnv);
  assert(config);
  const dispatchMap = createDearMeOpenClawGatewayDispatchMap(config, {
    ...(options.openClawGatewayExecute ? { execute: options.openClawGatewayExecute } : {}),
  });
  const now = options.now?.() ?? new Date();
  const isTelegram = target === "telegram_message";
  const toolName = isTelegram ? "send_telegram_message" : "send_imessage";
  const dispatch = dispatchMap[toolName];
  assert(dispatch);

  return fromDispatchResult(
    target,
    await dispatch(smokeDispatchInput({
      target,
      toolName,
      channel: isTelegram ? "telegram" : "imessage",
      payload: isTelegram
        ? {
            recipient: nonEmpty(env.DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT),
            body: nonEmpty(env.DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY),
          }
        : {
            to: nonEmpty(env.DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT),
            body: nonEmpty(env.DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY),
            service: nonEmpty(env.DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE) ?? "imessage",
          },
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
    case "deploy_site_host_rehearsal":
      return runDeploySiteHostRehearsalSmoke(options);
    case "linkedin_dm":
      return runLinkedInDmSmoke(options);
    case "telegram_message":
    case "imessage_message":
      return runOpenClawGatewayMessageSmoke(target, options);
    case "meta_campaign":
      return runMetaCampaignSmoke(options);
  }
}

export async function runDearMeProviderSmoke(
  options: DearMeProviderSmokeOptions,
): Promise<DearMeProviderSmokeResult[]> {
  const results: DearMeProviderSmokeResult[] = [];
  for (const target of expandProviderSmokeTargets(options.target)) {
    results.push(await runTarget(target, options));
  }
  return results;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:provider-smoke -- [--check] [--target <target>] [--live] [--json] [--env-file <path>]

Targets:
  deploy_site_preview       Safe receipt smoke for the private preview path.
  deploy_site_host_rehearsal Optional loopback host smoke for the exported private site packet.
  deploy_site_production    Production host smoke; verifies the returned URL serves expected page text.
  linkedin_dm               Live partner endpoint smoke. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  telegram_message          Live Telegram smoke through OpenClaw gateway. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  imessage_message          Live iMessage/SMS smoke through OpenClaw gateway. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  openclaw_messages         Group: Telegram + iMessage through the shared OpenClaw gateway config.
  meta_campaign             Live Meta Marketing API smoke. Requires --live and DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1.
  all                       Run default readiness targets. Host rehearsal is opt-in.

Setup:
  pnpm --silent dearme:provider-smoke -- --print-env-template > .dearme-provider-smoke.env
  pnpm --silent dearme:provider-smoke -- --print-env-template --target telegram > .dearme-provider-smoke.env
  pnpm --silent dearme:provider-smoke -- --print-env-template --target openclaw > .dearme-provider-smoke.env
  pnpm --silent dearme:provider-smoke -- --env-file .dearme-provider-smoke.env --check

Default with no target is --check. Secret JSON can be passed directly or by file:
  DEARME_LINKEDIN_DM_CREDENTIAL_JSON(_FILE)
  OPENCLAW_GATEWAY_URL + OPENCLAW_GATEWAY_TOKEN or OPENCLAW_WEBHOOK_AUTH
  DEARME_META_CAMPAIGN_CREDENTIAL_JSON(_FILE)`);
}

function printReadiness(readiness: readonly DearMeProviderSmokeReadiness[], targetArg: TargetArg = "all") {
  for (const line of formatDearMeProviderSmokeReadiness(readiness, targetArg)) {
    console.log(line);
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
      const host = typeof result.hostStatus === "number" ? ` host=${result.hostStatus}` : "";
      console.log(`- ${result.target}: errored ${result.reason}${host}${result.externalUrl ? ` ${result.externalUrl}` : ""}`);
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
      console.log(dearMeProviderSmokeEnvTemplate(parsed.target ?? "all"));
      return;
    }

    const env = await loadDearMeProviderSmokeEnv(parsed.envFiles, process.env);

    if (!parsed.target || parsed.check) {
      const readiness = inspectDearMeProviderSmokeReadiness(env, parsed.target ?? "all");
      if (parsed.json) {
        console.log(JSON.stringify({ readiness }, null, 2));
      } else {
        printReadiness(readiness, parsed.target ?? "all");
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
