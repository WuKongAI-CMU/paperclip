import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Env = Record<string, string | undefined>;
export type DearMeProdReadyStatus = "ok" | "missing" | "malformed" | "warn";

export interface DearMeProdReadyCheck {
  name: string;
  provider: string;
  required: boolean;
  status: DearMeProdReadyStatus;
  explanation: string;
  whereToGetUrl: string;
}

export interface DearMeProdReadyReport {
  ready: boolean;
  exitCode: 0 | 1;
  checked: number;
  required: number;
  optional: number;
  ok: number;
  missing: number;
  malformed: number;
  warnings: number;
  checks: DearMeProdReadyCheck[];
}

export interface DearMeProdReadyArgs {
  help: boolean;
  json: boolean;
  envFiles: string[];
}

type Validator = (value: string) => true | string;

interface EnvRequirement {
  name: string;
  provider: string;
  required: boolean;
  explanation: string;
  whereToGetUrl: string;
  validate?: Validator;
}

const DEFAULT_ENV_FILES = [".env", ".env.production"] as const;

const startsWith = (prefixes: readonly string[], message: string): Validator => {
  return (value) => prefixes.some((prefix) => value.startsWith(prefix)) || message;
};

const equalsValue = (expected: string, message: string): Validator => {
  return (value) => value === expected || message;
};

const httpsUrl = (expected: string): Validator => {
  return (value) => {
    if (value !== expected) return `must be ${expected}`;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname.length > 0 || `must be ${expected}`;
    } catch {
      return `must be ${expected}`;
    }
  };
};

const postgresUrl: Validator = (value) =>
  value.startsWith("postgres://") || value.startsWith("postgresql://")
    || "must start with postgres:// or postgresql://";

const REQUIREMENTS: readonly EnvRequirement[] = [
  {
    name: "DEARME_STRIPE_SECRET_KEY",
    provider: "Stripe",
    required: true,
    explanation: "Server-side Stripe API key for creating checkout and reconciling paid beta receipts.",
    whereToGetUrl: "https://dashboard.stripe.com/apikeys",
    validate: startsWith(["sk_live_", "sk_test_"], "must start with sk_live_ or sk_test_"),
  },
  {
    name: "DEARME_STRIPE_WEBHOOK_SECRET",
    provider: "Stripe",
    required: true,
    explanation: "Stripe webhook signing secret used to verify checkout completion events.",
    whereToGetUrl: "https://dashboard.stripe.com/webhooks",
    validate: startsWith(["whsec_"], "must start with whsec_"),
  },
  {
    name: "DEARME_STRIPE_PRICE_BETA",
    provider: "Stripe",
    required: true,
    explanation: "Stripe recurring price ID for the DearMe paid beta offer.",
    whereToGetUrl: "https://dashboard.stripe.com/products",
    validate: startsWith(["price_"], "must start with price_"),
  },
  {
    name: "DEARME_VOICE_VOYAGE_API_KEY",
    provider: "Voyage AI",
    required: true,
    explanation: "Voyage API key used by DearMe voice scoring.",
    whereToGetUrl: "https://www.voyageai.com/",
  },
  {
    name: "DEARME_VOICE_SEMANTIC_SCORER",
    provider: "Voyage AI",
    required: true,
    explanation: "Selects the production semantic scorer for voice matching.",
    whereToGetUrl: "https://docs.voyageai.com/",
    validate: equalsValue("voyage", "must equal voyage"),
  },
  {
    name: "DEARME_EMAIL_RESEND_API_KEY",
    provider: "Resend",
    required: true,
    explanation: "Resend API key for transactional lifecycle email.",
    whereToGetUrl: "https://resend.com/api-keys",
    validate: startsWith(["re_"], "must start with re_"),
  },
  {
    name: "DEARME_LOOPS_API_KEY",
    provider: "Loops",
    required: true,
    explanation: "Loops API key for customer lifecycle events and email automation.",
    whereToGetUrl: "https://loops.so/docs/api-reference/intro",
  },
  {
    name: "VITE_POSTHOG_KEY",
    provider: "PostHog",
    required: true,
    explanation: "Browser PostHog project key for product funnel analytics.",
    whereToGetUrl: "https://posthog.com/docs/getting-started/install",
  },
  {
    name: "VITE_POSTHOG_HOST",
    provider: "PostHog",
    required: true,
    explanation: "Browser PostHog host for event capture.",
    whereToGetUrl: "https://posthog.com/docs/getting-started/install",
  },
  {
    name: "DEARME_POSTHOG_KEY",
    provider: "PostHog",
    required: true,
    explanation: "Server-side PostHog key for backend product events.",
    whereToGetUrl: "https://posthog.com/docs/getting-started/install",
  },
  {
    name: "DEARME_GOOGLE_OAUTH_CLIENT_ID",
    provider: "Google OAuth",
    required: true,
    explanation: "Google OAuth client ID for self-serve sign-in.",
    whereToGetUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    name: "DEARME_GOOGLE_OAUTH_CLIENT_SECRET",
    provider: "Google OAuth",
    required: true,
    explanation: "Google OAuth client secret for the DearMe sign-in flow.",
    whereToGetUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    name: "DEARME_PLAIN_API_KEY",
    provider: "Plain",
    required: true,
    explanation: "Plain API key for the DearMe support inbox.",
    whereToGetUrl: "https://www.plain.com/docs/api-reference/introduction",
  },
  {
    name: "DEARME_PLAIN_WEBHOOK_SECRET",
    provider: "Plain",
    required: true,
    explanation: "Plain webhook secret for verifying support inbox events.",
    whereToGetUrl: "https://www.plain.com/docs/api-reference/webhooks",
  },
  {
    name: "DATABASE_URL",
    provider: "Postgres",
    required: true,
    explanation: "Production Postgres connection string for DearMe data and migrations.",
    whereToGetUrl: "https://neon.com/docs/connect/connect-from-any-app",
    validate: postgresUrl,
  },
  {
    name: "DEARME_PUBLIC_URL",
    provider: "DearMe host",
    required: true,
    explanation: "Canonical customer-facing HTTPS URL for production redirects and links.",
    whereToGetUrl: "https://docs.render.com/configure-environment-variables",
    validate: httpsUrl("https://dearme.app"),
  },
  {
    name: "DEARME_LINKEDIN_DM_MESSAGES_URL",
    provider: "LinkedIn",
    required: false,
    explanation: "Optional live professional-network message endpoint for guarded provider smoke tests.",
    whereToGetUrl: "https://learn.microsoft.com/en-us/linkedin/",
  },
  {
    name: "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN",
    provider: "LinkedIn",
    required: false,
    explanation: "Optional approved professional-network smoke recipient for live delivery verification.",
    whereToGetUrl: "https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/urns",
  },
  {
    name: "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT",
    provider: "OpenClaw",
    required: false,
    explanation: "Optional approved iMessage or SMS smoke recipient for live message verification.",
    whereToGetUrl: "https://github.com/hasura/openclaw",
  },
];

function envValue(env: Env, key: string): string {
  return env[key]?.trim() ?? "";
}

function validateRequirement(requirement: EnvRequirement, env: Env): DearMeProdReadyCheck {
  const value = envValue(env, requirement.name);
  if (!value) {
    return {
      name: requirement.name,
      provider: requirement.provider,
      required: requirement.required,
      status: requirement.required ? "missing" : "warn",
      explanation: requirement.required
        ? `${requirement.explanation} Configure this before production start.`
        : `${requirement.explanation} Missing optional value; live channel smoke coverage will be narrower.`,
      whereToGetUrl: requirement.whereToGetUrl,
    };
  }

  const validation = requirement.validate?.(value) ?? true;
  if (validation !== true) {
    return {
      name: requirement.name,
      provider: requirement.provider,
      required: requirement.required,
      status: requirement.required ? "malformed" : "warn",
      explanation: `${requirement.explanation} Current value is invalid: ${validation}.`,
      whereToGetUrl: requirement.whereToGetUrl,
    };
  }

  return {
    name: requirement.name,
    provider: requirement.provider,
    required: requirement.required,
    status: "ok",
    explanation: requirement.explanation,
    whereToGetUrl: requirement.whereToGetUrl,
  };
}

export function validateEnv(env: Env): DearMeProdReadyReport {
  const checks = REQUIREMENTS.map((requirement) => validateRequirement(requirement, env));
  const required = checks.filter((check) => check.required).length;
  const optional = checks.length - required;
  const missing = checks.filter((check) => check.status === "missing").length;
  const malformed = checks.filter((check) => check.status === "malformed").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  const ok = checks.filter((check) => check.status === "ok").length;
  const ready = missing === 0 && malformed === 0;

  return {
    ready,
    exitCode: ready ? 0 : 1,
    checked: checks.length,
    required,
    optional,
    ok,
    missing,
    malformed,
    warnings,
    checks,
  };
}

function parseEnvFile(content: string): Env {
  const parsed: Env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalizedLine = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equalsIndex = normalizedLine.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = normalizedLine.slice(0, equalsIndex).trim();
    let value = normalizedLine.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadDearMeProdReadyEnv(
  envFiles: readonly string[] = DEFAULT_ENV_FILES,
  baseEnv: Env = process.env,
): Promise<Env> {
  const env: Env = {};
  for (const envFile of envFiles) {
    const resolved = resolve(envFile);
    if (!(await fileExists(resolved))) continue;
    Object.assign(env, parseEnvFile(await readFile(resolved, "utf8")));
  }
  Object.assign(env, baseEnv);
  return env;
}

export function formatDearMeProdReady(report: DearMeProdReadyReport): string[] {
  const lines = ["DearMe production env readiness"];
  lines.push(`- Status: ${report.ready ? "ready" : "blocked"}`);
  lines.push(
    `- Checked: ${report.checked} vars (${report.required} required, ${report.optional} optional). ${report.ok} ok, ${report.missing} missing, ${report.malformed} malformed, ${report.warnings} warnings.`,
  );
  for (const check of report.checks) {
    const requirement = check.required ? "required" : "optional";
    lines.push(`- ${check.status.toUpperCase()} ${check.name} (${check.provider}, ${requirement})`);
    lines.push(`  ${check.explanation}`);
    lines.push(`  Where to get it: ${check.whereToGetUrl}`);
  }
  lines.push("No network calls were made.");
  return lines;
}

export function parseDearMeProdReadyArgs(argv: readonly string[]): DearMeProdReadyArgs {
  const args: DearMeProdReadyArgs = {
    help: false,
    json: false,
    envFiles: [...DEFAULT_ENV_FILES],
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index]!;
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--env-file") {
      const value = normalizedArgv[index + 1];
      if (!value) throw new Error("--env-file requires a path");
      args.envFiles.push(value);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      args.envFiles.push(arg.slice("--env-file=".length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:prod-ready -- [--json] [--env-file <path>]

Checks production DearMe environment variables without calling provider APIs.

Defaults:
  Reads .env, .env.production, then process.env. Later values override earlier values.
`);
}

export async function runDearMeProdReady(argv: readonly string[], baseEnv: Env = process.env) {
  const args = parseDearMeProdReadyArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  const env = await loadDearMeProdReadyEnv(args.envFiles, baseEnv);
  const report = validateEnv(env);
  if (args.json) {
    console.log(JSON.stringify({ report }, null, 2));
  } else {
    for (const line of formatDearMeProdReady(report)) {
      console.log(line);
    }
  }
  return report.exitCode;
}

async function main() {
  try {
    process.exitCode = await runDearMeProdReady(process.argv.slice(2), process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  void main();
}
