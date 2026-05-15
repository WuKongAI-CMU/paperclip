export type DearMeProdSmokeCheckName =
  | "landing"
  | "healthz"
  | "readyz"
  | "stripe_checkout"
  | "voice_score";

export interface DearMeProdSmokeCheck {
  name: DearMeProdSmokeCheckName;
  status: "pass" | "fail";
  url: string;
  statusCode?: number;
  durationMs: number;
  message: string;
}

export interface DearMeProdSmokeConfig {
  targetUrl: string;
  heroText: string;
  checkoutEmail: string;
  apiKey: string;
  voiceFingerprintId: string;
  timeoutMs: number;
}

export interface DearMeProdSmokeReport {
  ok: boolean;
  targetUrl: string;
  checked: number;
  passed: number;
  failed: number;
  checks: DearMeProdSmokeCheck[];
}

export interface ParsedDearMeProdSmokeArgs {
  help: boolean;
  json: boolean;
  config: DearMeProdSmokeConfig | null;
  error?: string;
}

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

const DEFAULT_HERO_TEXT = "DearMe is a private AI growth team for one person.";
const DEFAULT_TIMEOUT_MS = 8_000;

function usage() {
  return [
    "Usage: pnpm dearme:prod-smoke -- --url https://preview.example --api-key <key>",
    "",
    "Checks landing, /healthz, /readyz, sample checkout creation, and voice scoring.",
    "",
    "Options:",
    "  --url <url>                 Base URL. Defaults to DEARME_PROD_SMOKE_URL or DEARME_PUBLIC_URL.",
    "  --api-key <key>             DearMe API key for voice scoring. Defaults to DEARME_PROD_SMOKE_API_KEY or DEARME_API_KEY.",
    "  --checkout-email <email>    Email used for the sample Checkout Session.",
    "  --hero-text <text>          Landing text to require.",
    "  --voice-fingerprint-id <id> Fingerprint id used for the voice check.",
    "  --timeout-ms <ms>           Per-request timeout. Default: 8000.",
    "  --json                      Print JSON report.",
    "  --help                      Show this help.",
  ].join("\n");
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function normalizeBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Target URL must use http or https");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function smokeUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function nowMs() {
  return Date.now();
}

function durationSince(startedAt: number) {
  return Math.max(0, nowMs() - startedAt);
}

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function timeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function checkLanding(
  config: DearMeProdSmokeConfig,
  fetchImpl: FetchLike,
): Promise<DearMeProdSmokeCheck> {
  const url = smokeUrl(config.targetUrl, "/");
  const startedAt = nowMs();
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "text/html" },
      signal: timeoutSignal(config.timeoutMs),
    });
    const body = await readResponseText(response);
    const pass = response.status === 200 && body.includes(config.heroText);
    return {
      name: "landing",
      status: pass ? "pass" : "fail",
      url,
      statusCode: response.status,
      durationMs: durationSince(startedAt),
      message: pass
        ? "Landing returned 200 and included expected hero text."
        : "Landing did not return 200 with the expected hero text.",
    };
  } catch (error) {
    return {
      name: "landing",
      status: "fail",
      url,
      durationMs: durationSince(startedAt),
      message: safeMessage(error),
    };
  }
}

async function checkJsonOk(
  name: "healthz" | "readyz",
  path: string,
  config: DearMeProdSmokeConfig,
  fetchImpl: FetchLike,
): Promise<DearMeProdSmokeCheck> {
  const url = smokeUrl(config.targetUrl, path);
  const startedAt = nowMs();
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: timeoutSignal(config.timeoutMs),
    });
    const pass = response.status === 200;
    return {
      name,
      status: pass ? "pass" : "fail",
      url,
      statusCode: response.status,
      durationMs: durationSince(startedAt),
      message: pass ? `${path} returned 200.` : `${path} did not return 200.`,
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      url,
      durationMs: durationSince(startedAt),
      message: safeMessage(error),
    };
  }
}

function checkoutUrlFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = (body as { checkoutUrl?: unknown }).checkoutUrl;
  return typeof value === "string" && /^https?:\/\//.test(value) ? value : null;
}

async function checkStripeCheckout(
  config: DearMeProdSmokeConfig,
  fetchImpl: FetchLike,
): Promise<DearMeProdSmokeCheck> {
  const url = smokeUrl(config.targetUrl, "/api/dearme/checkout/start");
  const startedAt = nowMs();
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: config.checkoutEmail,
        plan: "beta",
      }),
      signal: timeoutSignal(config.timeoutMs),
    });
    const body = await readResponseJson(response);
    const pass = response.status === 200 && checkoutUrlFromBody(body) !== null;
    return {
      name: "stripe_checkout",
      status: pass ? "pass" : "fail",
      url,
      statusCode: response.status,
      durationMs: durationSince(startedAt),
      message: pass
        ? "Sample Checkout Session returned a checkout URL."
        : "Sample Checkout Session did not return a valid checkout URL.",
    };
  } catch (error) {
    return {
      name: "stripe_checkout",
      status: "fail",
      url,
      durationMs: durationSince(startedAt),
      message: safeMessage(error),
    };
  }
}

function voiceScoreResponded(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return "score" in body || "passed" in body || "reasons" in body;
}

async function checkVoiceScore(
  config: DearMeProdSmokeConfig,
  fetchImpl: FetchLike,
): Promise<DearMeProdSmokeCheck> {
  const url = smokeUrl(config.targetUrl, "/v1/voice/score");
  const startedAt = nowMs();
  if (!config.apiKey.trim()) {
    return {
      name: "voice_score",
      status: "fail",
      url,
      durationMs: durationSince(startedAt),
      message: "Missing DearMe prod-smoke API key for voice scoring.",
    };
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fingerprintId: config.voiceFingerprintId,
        text: "DearMe keeps private work useful until the owner approves the next public step.",
        kind: "outbound-email",
      }),
      signal: timeoutSignal(config.timeoutMs),
    });
    const body = await readResponseJson(response);
    const pass = response.status === 200 && voiceScoreResponded(body);
    return {
      name: "voice_score",
      status: pass ? "pass" : "fail",
      url,
      statusCode: response.status,
      durationMs: durationSince(startedAt),
      message: pass
        ? "Voice scoring endpoint returned a scoring response."
        : "Voice scoring endpoint did not return a scoring response.",
    };
  } catch (error) {
    return {
      name: "voice_score",
      status: "fail",
      url,
      durationMs: durationSince(startedAt),
      message: safeMessage(error),
    };
  }
}

export function parseDearMeProdSmokeArgs(
  argv: string[],
  env: Env = process.env,
): ParsedDearMeProdSmokeArgs {
  let json = false;
  let help = false;
  let targetUrl = env.DEARME_PROD_SMOKE_URL ?? env.DEARME_PUBLIC_URL ?? "";
  let apiKey = env.DEARME_PROD_SMOKE_API_KEY ?? env.DEARME_API_KEY ?? "";
  let heroText = env.DEARME_PROD_SMOKE_HERO_TEXT ?? DEFAULT_HERO_TEXT;
  let checkoutEmail =
    env.DEARME_PROD_SMOKE_CHECKOUT_EMAIL
    ?? `prod-smoke+${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}@dearme.app`;
  let voiceFingerprintId = env.DEARME_PROD_SMOKE_VOICE_FINGERPRINT_ID ?? "prod-smoke";
  let timeoutMs = Number(env.DEARME_PROD_SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  try {
    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      switch (arg) {
        case "--":
          break;
        case "--json":
          json = true;
          break;
        case "--help":
        case "-h":
          help = true;
          break;
        case "--url":
          targetUrl = readFlagValue(argv, index, arg);
          index += 1;
          break;
        case "--api-key":
          apiKey = readFlagValue(argv, index, arg);
          index += 1;
          break;
        case "--hero-text":
          heroText = readFlagValue(argv, index, arg);
          index += 1;
          break;
        case "--checkout-email":
          checkoutEmail = readFlagValue(argv, index, arg);
          index += 1;
          break;
        case "--voice-fingerprint-id":
          voiceFingerprintId = readFlagValue(argv, index, arg);
          index += 1;
          break;
        case "--timeout-ms":
          timeoutMs = Number(readFlagValue(argv, index, arg));
          index += 1;
          break;
        default:
          throw new Error(`Unknown argument: ${arg}`);
      }
    }

    if (help) return { help, json, config: null };
    if (!targetUrl.trim()) {
      throw new Error("Missing target URL. Set DEARME_PROD_SMOKE_URL or pass --url.");
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("--timeout-ms must be a positive number");
    }

    return {
      help,
      json,
      config: {
        targetUrl: normalizeBaseUrl(targetUrl),
        heroText,
        checkoutEmail,
        apiKey,
        voiceFingerprintId,
        timeoutMs: Math.floor(timeoutMs),
      },
    };
  } catch (error) {
    return { help, json, config: null, error: safeMessage(error) };
  }
}

export async function runDearMeProdSmoke(
  config: DearMeProdSmokeConfig,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<DearMeProdSmokeReport> {
  const checks: DearMeProdSmokeCheck[] = [];

  checks.push(await checkLanding(config, fetchImpl));
  checks.push(await checkJsonOk("healthz", "/healthz", config, fetchImpl));
  checks.push(await checkJsonOk("readyz", "/readyz", config, fetchImpl));
  checks.push(await checkStripeCheckout(config, fetchImpl));
  checks.push(await checkVoiceScore(config, fetchImpl));

  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.length - passed;
  return {
    ok: failed === 0,
    targetUrl: config.targetUrl,
    checked: checks.length,
    passed,
    failed,
    checks,
  };
}

function formatReport(report: DearMeProdSmokeReport): string {
  const lines = [
    `DearMe prod smoke ${report.ok ? "passed" : "failed"} for ${report.targetUrl}`,
  ];
  for (const check of report.checks) {
    const status = check.status === "pass" ? "PASS" : "FAIL";
    const statusCode = check.statusCode ? ` ${check.statusCode}` : "";
    lines.push(`${status} ${check.name}${statusCode} ${check.durationMs}ms - ${check.message}`);
  }
  return lines.join("\n");
}

async function main() {
  const parsed = parseDearMeProdSmokeArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage());
    return;
  }

  if (!parsed.config) {
    if (parsed.json) {
      console.log(JSON.stringify({ ok: false, error: parsed.error }, null, 2));
    } else {
      console.error(parsed.error);
      console.error("");
      console.error(usage());
    }
    process.exitCode = 1;
    return;
  }

  const report = await runDearMeProdSmoke(parsed.config);
  if (parsed.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }
  process.exitCode = report.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
