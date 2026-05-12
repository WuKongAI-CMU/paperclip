import { fileURLToPath } from "node:url";
import {
  runDearMeProviderSmoke,
  type DearMeProviderSmokeResult,
} from "./dearme-provider-smoke.ts";

type Env = Record<string, string | undefined>;

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export interface DearMeLinkedInDmRehearsalArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export interface DearMeLinkedInDmRehearsalCapture {
  target: "linkedin_dm";
  toolName: "send_linkedin_dm";
  method: string | null;
  payloadKeys: string[];
  contextKeys: string[];
  headerKeys: string[];
  authorizationScheme: "Bearer" | "missing" | "unexpected";
  idempotencyKeyPresent: boolean;
  subjectPresent: boolean;
}

export interface DearMeLinkedInDmRehearsalReport {
  status: "ready" | "blocked";
  verdict: string;
  summary: string;
  results: DearMeProviderSmokeResult[];
  captured: DearMeLinkedInDmRehearsalCapture[];
  liveProofStillRequired: true;
  missingCapabilities: string[];
  commands: {
    rehearsal: string;
    liveProof: string;
  };
}

const REHEARSAL_ENV: Env = {
  DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "1",
  DEARME_LINKEDIN_DM_MESSAGES_URL: "https://linkedin-partner.example.test/messages",
  DEARME_LINKEDIN_DM_CREDENTIAL_JSON: JSON.stringify({
    provider: "linkedin_partner",
    tokenType: "bearer",
    accessToken: "dearme-linkedin-dm-rehearsal-token",
    capabilities: ["send_dm"],
    expiresAt: "2027-01-01T00:00:00.000Z",
  }),
  DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "urn:li:person:dearme-rehearsal",
  DEARME_LINKEDIN_DM_SMOKE_SUBJECT: "Private proof",
  DEARME_LINKEDIN_DM_SMOKE_BODY: "Your private DearMe proof packet is ready.",
};

const REHEARSAL_COMMAND =
  "pnpm --silent dearme:linkedin-dm-rehearsal -- --json";
const LIVE_PROOF_COMMAND =
  "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target linkedin_dm --live";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildRehearsalEnv(baseEnv: Env): Env {
  return {
    ...baseEnv,
    ...REHEARSAL_ENV,
  };
}

function authorizationScheme(headers: Record<string, string> | undefined) {
  const authorization = headers?.Authorization ?? headers?.authorization;
  if (!authorization) return "missing";
  if (authorization.startsWith("Bearer ")) return "Bearer";
  return "unexpected";
}

function hasHeader(headers: Record<string, string> | undefined, name: string) {
  if (!headers) return false;
  const expected = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === expected);
}

function captureLinkedInDmRequest(init: FetchInitLike | undefined) {
  const parsedBody = init?.body ? JSON.parse(init.body) : {};
  const requestBody = isRecord(parsedBody) ? parsedBody : {};
  const context = isRecord(requestBody.context) ? requestBody.context : {};
  return {
    target: "linkedin_dm" as const,
    toolName: "send_linkedin_dm" as const,
    method: stringValue(init?.method),
    payloadKeys: Object.keys(requestBody).sort(),
    contextKeys: Object.keys(context).sort(),
    headerKeys: Object.keys(init?.headers ?? {}).sort(),
    authorizationScheme: authorizationScheme(init?.headers),
    idempotencyKeyPresent: hasHeader(init?.headers, "Idempotency-Key"),
    subjectPresent: Object.prototype.hasOwnProperty.call(requestBody, "subject"),
  };
}

function captureIsReady(capture: DearMeLinkedInDmRehearsalCapture | undefined) {
  if (!capture) return false;
  return capture.method === "POST" &&
    capture.authorizationScheme === "Bearer" &&
    capture.idempotencyKeyPresent &&
    capture.subjectPresent &&
    ["Authorization", "Content-Type", "Idempotency-Key", "User-Agent"].every((key) =>
      capture.headerKeys.includes(key)
    ) &&
    ["body", "context", "recipientUrn", "subject"].every((key) =>
      capture.payloadKeys.includes(key)
    ) &&
    ["approvalId", "companyId", "issueId", "openclawRunId"].every((key) =>
      capture.contextKeys.includes(key)
    );
}

export async function runDearMeLinkedInDmRehearsal(options: {
  env?: Env;
  now?: () => Date;
} = {}): Promise<DearMeLinkedInDmRehearsalReport> {
  const captured: DearMeLinkedInDmRehearsalCapture[] = [];
  const env = buildRehearsalEnv(options.env ?? process.env);
  const fetch: FetchLike = async (_url, init) => {
    captured.push(captureLinkedInDmRequest(init));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          conversationUrn: "urn:li:conversation:dearme-rehearsal",
          messageUrn: "urn:li:message:dearme-rehearsal",
          conversationUrl: "https://www.linkedin.com/messaging/thread/dearme-rehearsal/",
        };
      },
    };
  };

  const results = await runDearMeProviderSmoke({
    target: "linkedin_dm",
    live: true,
    env,
    fetch,
    now: options.now,
  });
  const delivered = results.some((result) =>
    result.target === "linkedin_dm" && result.status === "delivered"
  );
  const ready = delivered && captured.length === 1 && captureIsReady(captured[0]);

  return {
    status: ready ? "ready" : "blocked",
    verdict: ready
      ? "LinkedIn DM contract rehearsal: ready."
      : "LinkedIn DM contract rehearsal: blocked.",
    summary: ready
      ? "DearMe can form the approved LinkedIn DM partner request contract without network access, external recipients, or live credentials."
      : "DearMe could not prove the approved LinkedIn DM partner request contract locally.",
    results,
    captured,
    liveProofStillRequired: true,
    missingCapabilities: ready ? [] : ["linkedin_dm_contract_rehearsal_failed"],
    commands: {
      rehearsal: REHEARSAL_COMMAND,
      liveProof: LIVE_PROOF_COMMAND,
    },
  };
}

export function formatDearMeLinkedInDmRehearsal(
  report: DearMeLinkedInDmRehearsalReport,
): string[] {
  const lines = [
    "DearMe LinkedIn DM contract rehearsal",
    report.verdict,
    report.summary,
    "",
    "Provider-smoke results:",
  ];

  for (const result of report.results) {
    const marker = result.status === "delivered" ? "[x]" : "[ ]";
    const detail = result.status === "delivered"
      ? result.externalId
      : result.status === "blocked"
        ? result.missing.join(", ")
        : result.reason;
    lines.push(`- ${marker} ${result.target}: ${result.status} (${detail})`);
  }

  lines.push("");
  lines.push("Captured LinkedIn DM contract:");
  for (const item of report.captured) {
    lines.push(
      `- ${item.toolName}: method ${item.method ?? "missing"}; headers ${item.headerKeys.join(", ")}; payload keys ${item.payloadKeys.join(", ")}; context keys ${item.contextKeys.join(", ")}; subject ${item.subjectPresent ? "present" : "missing"}; idempotency ${item.idempotencyKeyPresent ? "present" : "missing"}`,
    );
  }

  lines.push("");
  lines.push("Live proof still required:");
  lines.push(`- ${report.commands.liveProof}`);
  return lines;
}

export function parseDearMeLinkedInDmRehearsalArgs(
  argv: readonly string[],
): DearMeLinkedInDmRehearsalArgs {
  const args: DearMeLinkedInDmRehearsalArgs = {
    help: false,
    json: false,
    check: false,
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (const arg of normalizedArgv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:linkedin-dm-rehearsal -- [--check] [--json]

Runs the LinkedIn DM provider-smoke path through an injected partner endpoint.
It does not connect to LinkedIn, send messages, print credentials, deploy,
spend money, or replace the required live smoke.`);
}

async function main() {
  try {
    const parsed = parseDearMeLinkedInDmRehearsalArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const rehearsal = await runDearMeLinkedInDmRehearsal();
    if (parsed.json) {
      console.log(JSON.stringify({ rehearsal }, null, 2));
    } else {
      for (const line of formatDearMeLinkedInDmRehearsal(rehearsal)) {
        console.log(line);
      }
    }
    if (parsed.check && rehearsal.status !== "ready") {
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
