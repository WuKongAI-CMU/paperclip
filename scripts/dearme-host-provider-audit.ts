import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  inspectDearMeProviderSmokeReadiness,
} from "./dearme-provider-smoke.ts";
import {
  loadDearMeProofEnv,
} from "./dearme-proof.ts";

type Env = Record<string, string | undefined>;

export type DearMeHostProviderKey =
  | "configured_public_host"
  | "vercel"
  | "netlify"
  | "cloudflare";

export type DearMeHostProviderStatus =
  | "ready"
  | "blocked"
  | "not_installed"
  | "probe_failed";

export type DearMeHostProviderMissingCapability =
  | "host_provider_token_or_login"
  | "public_https_dearme_host";

export interface DearMeHostProviderCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface DearMeHostProviderProbe {
  commandExists(command: string): Promise<boolean>;
  run(command: string, args: readonly string[], timeoutMs: number): Promise<DearMeHostProviderCommandResult>;
}

export interface DearMeHostProviderAuditProvider {
  key: DearMeHostProviderKey;
  label: string;
  status: DearMeHostProviderStatus;
  ready: boolean;
  installed?: boolean;
  tokenPresent?: boolean;
  authenticated?: boolean;
  evidence: string;
  setupCommand?: string;
}

export interface DearMeHostProviderAudit {
  ready: boolean;
  verdict: string;
  providers: DearMeHostProviderAuditProvider[];
  missingCapabilities: DearMeHostProviderMissingCapability[];
  operatorCommands: string[];
}

export interface DearMeHostProviderAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  envFiles: string[];
}

const HOST_PROVIDER_AUDIT_COMMAND = "pnpm --silent dearme:host-provider-audit";
const COMMAND_TIMEOUT_MS = 5_000;

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasAnyEnv(env: Env, keys: readonly string[]) {
  return keys.some((key) => Boolean(nonEmpty(env[key])));
}

function hasAllEnv(env: Env, keys: readonly string[]) {
  return keys.every((key) => Boolean(nonEmpty(env[key])));
}

function defaultRun(
  command: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<DearMeHostProviderCommandResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      {
        encoding: "utf8",
        timeout: timeoutMs,
        maxBuffer: 64 * 1024,
      },
      (error, stdout, stderr) => {
        const maybeError = error as NodeJS.ErrnoException | null;
        const exitCode = typeof maybeError?.code === "number"
          ? maybeError.code
          : maybeError
            ? 1
            : 0;
        resolve({
          exitCode,
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
          timedOut: maybeError?.signal === "SIGTERM",
        });
      },
    );
  });
}

function defaultProbe(): DearMeHostProviderProbe {
  return {
    async commandExists(command: string) {
      const result = await defaultRun("which", [command], 1_000);
      return result.exitCode === 0 && Boolean(result.stdout.trim());
    },
    run: defaultRun,
  };
}

function deploySiteHostSetupBlockers(env: Env) {
  const [readiness] = inspectDearMeProviderSmokeReadiness(env, "deploy_site_production");
  const missing = readiness?.missing ?? [];
  return missing.filter((requirement) =>
    requirement.includes("DEARME_DEPLOY_SITE_ALLOW_PRODUCTION") ||
    requirement.includes("DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS") ||
    requirement.includes("DEARME_DEPLOY_SITE_BASE_URL") ||
    requirement.includes("DEARME_SITE_BASE_URL") ||
    requirement.includes("DEARME_PUBLIC_SITE_BASE_URL") ||
    requirement.includes("valid public https") ||
    requirement.includes("must use https") ||
    requirement.includes("phone-reachable public host")
  );
}

function configuredPublicHostProvider(env: Env): DearMeHostProviderAuditProvider {
  const blockers = deploySiteHostSetupBlockers(env);
  const ready = blockers.length === 0;
  return {
    key: "configured_public_host",
    label: "Configured public HTTPS DearMe host",
    status: ready ? "ready" : "blocked",
    ready,
    evidence: ready
      ? "Production host smoke already has the public host and opt-in needed to attempt the phone-reachable proof."
      : `No public production host is configured yet. Missing: ${blockers.join(", ")}.`,
    setupCommand: "pnpm --silent dearme:provider-smoke -- --print-env-template --target deploy_site_production",
  };
}

function outputText(result: DearMeHostProviderCommandResult) {
  return `${result.stdout}\n${result.stderr}`.toLowerCase();
}

async function vercelProvider(
  env: Env,
  probe: DearMeHostProviderProbe,
): Promise<DearMeHostProviderAuditProvider> {
  const tokenPresent = hasAnyEnv(env, ["VERCEL_TOKEN"]);
  const installed = await probe.commandExists("vercel");
  if (tokenPresent) {
    return {
      key: "vercel",
      label: "Vercel",
      status: "ready",
      ready: true,
      installed,
      tokenPresent,
      authenticated: true,
      evidence: installed
        ? "Vercel token env is present and the CLI is installed."
        : "Vercel token env is present.",
    };
  }
  if (!installed) {
    return {
      key: "vercel",
      label: "Vercel",
      status: "not_installed",
      ready: false,
      installed,
      tokenPresent,
      authenticated: false,
      evidence: "Vercel CLI is not installed and VERCEL_TOKEN is unset.",
      setupCommand: "vercel login",
    };
  }

  const result = await probe.run("vercel", ["whoami"], COMMAND_TIMEOUT_MS);
  const authenticated = result.exitCode === 0 && !outputText(result).includes("not authenticated");
  return {
    key: "vercel",
    label: "Vercel",
    status: authenticated ? "ready" : result.timedOut ? "probe_failed" : "blocked",
    ready: authenticated,
    installed,
    tokenPresent,
    authenticated,
    evidence: authenticated
      ? "Vercel CLI is installed and authenticated."
      : result.timedOut
        ? "Vercel CLI is installed but the auth probe timed out."
        : "Vercel CLI is installed but not authenticated; VERCEL_TOKEN is unset.",
    setupCommand: "vercel login",
  };
}

async function netlifyProvider(
  env: Env,
  probe: DearMeHostProviderProbe,
): Promise<DearMeHostProviderAuditProvider> {
  const tokenPresent = hasAnyEnv(env, ["NETLIFY_AUTH_TOKEN"]);
  const installed = await probe.commandExists("netlify");
  if (tokenPresent) {
    return {
      key: "netlify",
      label: "Netlify",
      status: "ready",
      ready: true,
      installed,
      tokenPresent,
      authenticated: true,
      evidence: installed
        ? "Netlify auth token env is present and the CLI is installed."
        : "Netlify auth token env is present.",
    };
  }
  if (!installed) {
    return {
      key: "netlify",
      label: "Netlify",
      status: "not_installed",
      ready: false,
      installed,
      tokenPresent,
      authenticated: false,
      evidence: "Netlify CLI is not installed and NETLIFY_AUTH_TOKEN is unset.",
      setupCommand: "netlify login",
    };
  }

  const result = await probe.run("netlify", ["status"], COMMAND_TIMEOUT_MS);
  const text = outputText(result);
  const authenticated = !text.includes("not logged in") && (
    text.includes("logged in") ||
    text.includes("current user") ||
    text.includes("account")
  );
  return {
    key: "netlify",
    label: "Netlify",
    status: authenticated ? "ready" : result.timedOut ? "probe_failed" : "blocked",
    ready: authenticated,
    installed,
    tokenPresent,
    authenticated,
    evidence: authenticated
      ? "Netlify CLI is installed and authenticated."
      : result.timedOut
        ? "Netlify CLI is installed but the auth probe timed out."
        : "Netlify CLI is installed but not authenticated; NETLIFY_AUTH_TOKEN is unset.",
    setupCommand: "netlify login",
  };
}

async function cloudflareProvider(
  env: Env,
  probe: DearMeHostProviderProbe,
): Promise<DearMeHostProviderAuditProvider> {
  const tokenPresent = hasAllEnv(env, ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]);
  const wranglerInstalled = await probe.commandExists("wrangler");
  const cloudflaredInstalled = await probe.commandExists("cloudflared");
  const installed = wranglerInstalled || cloudflaredInstalled;
  return {
    key: "cloudflare",
    label: "Cloudflare",
    status: tokenPresent ? "ready" : installed ? "blocked" : "not_installed",
    ready: tokenPresent,
    installed,
    tokenPresent,
    authenticated: tokenPresent,
    evidence: tokenPresent
      ? "Cloudflare token and account env are present."
      : installed
        ? "Cloudflare CLI tooling is installed, but token/account env is missing."
        : "Cloudflare CLI tooling is not installed and token/account env is missing.",
    setupCommand: "export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...",
  };
}

function providerSummary(provider: DearMeHostProviderAuditProvider) {
  return `${provider.label}: ${provider.evidence}`;
}

export async function inspectDearMeHostProviderAudit(
  env: Env = process.env,
  probe: DearMeHostProviderProbe = defaultProbe(),
): Promise<DearMeHostProviderAudit> {
  const configuredHost = configuredPublicHostProvider(env);
  const [vercel, netlify, cloudflare] = await Promise.all([
    vercelProvider(env, probe),
    netlifyProvider(env, probe),
    cloudflareProvider(env, probe),
  ]);
  const providers = [configuredHost, vercel, netlify, cloudflare];
  const providerAuthReady = providers
    .filter((provider) => provider.key !== "configured_public_host")
    .some((provider) => provider.ready);
  const ready = configuredHost.ready || providerAuthReady;
  const missingCapabilities: DearMeHostProviderMissingCapability[] = ready
    ? []
    : [
      "host_provider_token_or_login",
      "public_https_dearme_host",
    ];
  const operatorCommands = ready
    ? [HOST_PROVIDER_AUDIT_COMMAND]
    : [
      "vercel login",
      "netlify login",
      "export VERCEL_TOKEN=... # or NETLIFY_AUTH_TOKEN=...",
      "pnpm --silent dearme:provider-smoke -- --print-env-template --target deploy_site_production",
    ];

  return {
    ready,
    verdict: ready
      ? "Host provider authorization: ready."
      : "Host provider authorization: blocked. No authenticated host provider and no configured public HTTPS DearMe host were found.",
    providers,
    missingCapabilities,
    operatorCommands,
  };
}

export function formatDearMeHostProviderAudit(audit: DearMeHostProviderAudit): string[] {
  const lines = [
    "DearMe host provider authorization audit",
    audit.verdict,
    "",
    "Providers:",
  ];

  for (const provider of audit.providers) {
    const marker = provider.ready ? "[x]" : "[ ]";
    lines.push(`- ${marker} ${providerSummary(provider)}`);
  }

  if (!audit.ready) {
    lines.push("");
    lines.push(`Missing capabilities: ${audit.missingCapabilities.join(", ")}`);
  }

  lines.push("");
  lines.push("Next host setup:");
  for (const command of audit.operatorCommands) {
    lines.push(`- ${command}`);
  }
  return lines;
}

export function parseDearMeHostProviderAuditArgs(
  argv: readonly string[],
): DearMeHostProviderAuditArgs {
  const args: DearMeHostProviderAuditArgs = {
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
  console.log(`Usage: pnpm dearme:host-provider-audit -- [--check] [--json] [--env-file <path>]

Checks whether the current machine can create or use a public HTTPS DearMe host
without printing secret values. This is an operator-only readiness gate before
deploy_site_production can prove a Polsia-level phone-reachable private page.`);
}

async function main() {
  try {
    const parsed = parseDearMeHostProviderAuditArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const env = await loadDearMeProofEnv(parsed.envFiles, process.env);
    const audit = await inspectDearMeHostProviderAudit(env);
    if (parsed.json) {
      console.log(JSON.stringify({ audit }, null, 2));
    } else {
      for (const line of formatDearMeHostProviderAudit(audit)) {
        console.log(line);
      }
    }
    if (parsed.check && !audit.ready) {
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
