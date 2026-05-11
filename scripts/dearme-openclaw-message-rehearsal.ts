import { fileURLToPath } from "node:url";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import {
  runDearMeProviderSmoke,
  type DearMeProviderSmokeResult,
} from "./dearme-provider-smoke.ts";

type Env = Record<string, string | undefined>;

export interface DearMeOpenClawMessageRehearsalArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export interface DearMeOpenClawMessageRehearsalCapture {
  target: "telegram_message" | "imessage_message";
  toolName: "send_telegram_message" | "send_imessage";
  channel: "telegram" | "imessage";
  companyId: string | null;
  issueId: string | null;
  payloadKeys: string[];
  paperclipWakeToolName: string | null;
  sessionDisplayId: string;
}

export interface DearMeOpenClawMessageRehearsalReport {
  status: "ready" | "blocked";
  verdict: string;
  summary: string;
  results: DearMeProviderSmokeResult[];
  captured: DearMeOpenClawMessageRehearsalCapture[];
  liveProofStillRequired: true;
  missingCapabilities: string[];
  commands: {
    rehearsal: string;
    liveProof: string;
  };
}

const REHEARSAL_ENV: Env = {
  DEARME_PROVIDER_SMOKE_CONFIRM_LIVE: "1",
  OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:0/dearme-openclaw-message-rehearsal",
  OPENCLAW_GATEWAY_TOKEN: "dearme-openclaw-message-rehearsal-token",
  OPENCLAW_WEBHOOK_AUTH: "",
  PAPERCLIP_API_URL: "http://127.0.0.1:0",
  DEARME_OPENCLAW_TELEGRAM_SMOKE_RECIPIENT: "telegram:dearme-rehearsal",
  DEARME_OPENCLAW_TELEGRAM_SMOKE_BODY: "Your private DearMe proof packet is ready.",
  DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "+15555550123",
  DEARME_OPENCLAW_IMESSAGE_SMOKE_BODY: "Dear me, day 1 - the team has your first proof packet ready.",
  DEARME_OPENCLAW_IMESSAGE_SMOKE_SERVICE: "imessage",
};

const REHEARSAL_COMMAND =
  "pnpm --silent dearme:openclaw-message-rehearsal -- --json";
const LIVE_PROOF_COMMAND =
  "DEARME_PROVIDER_SMOKE_CONFIRM_LIVE=1 pnpm --silent dearme:provider-smoke -- --env-file .dearme-proof.env --target openclaw_messages --live";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function targetForToolName(toolName: string | null) {
  if (toolName === "send_telegram_message") return "telegram_message";
  if (toolName === "send_imessage") return "imessage_message";
  return null;
}

function buildRehearsalEnv(baseEnv: Env): Env {
  return {
    ...baseEnv,
    ...REHEARSAL_ENV,
  };
}

export async function runDearMeOpenClawMessageRehearsal(options: {
  env?: Env;
  now?: () => Date;
} = {}): Promise<DearMeOpenClawMessageRehearsalReport> {
  const captured: DearMeOpenClawMessageRehearsalCapture[] = [];
  const env = buildRehearsalEnv(options.env ?? process.env);

  const openClawGatewayExecute = async (ctx: AdapterExecutionContext) => {
    const payloadTemplate = isRecord(ctx.config.payloadTemplate)
      ? ctx.config.payloadTemplate
      : {};
    const paperclip = isRecord(payloadTemplate.paperclip)
      ? payloadTemplate.paperclip
      : {};
    const dearme = isRecord(paperclip.dearme) ? paperclip.dearme : {};
    const wake = isRecord(ctx.context.paperclipWake) ? ctx.context.paperclipWake : {};
    const toolName = stringValue(dearme.toolName);
    const channel = stringValue(dearme.channel);
    const target = targetForToolName(toolName);
    const originalPayload = isRecord(dearme.originalOutboundPayload)
      ? dearme.originalOutboundPayload
      : {};
    const payloadKeys = Object.keys(originalPayload).sort();

    if (!target || (channel !== "telegram" && channel !== "imessage")) {
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorCode: "dearme_openclaw_message_rehearsal_contract_mismatch",
        errorMessage: "OpenClaw message rehearsal received an unexpected tool contract.",
      };
    }

    const sessionDisplayId = `openclaw://dearme/rehearsal/${toolName}`;
    captured.push({
      target,
      toolName,
      channel,
      companyId: stringValue(dearme.companyId),
      issueId: stringValue(dearme.issueId),
      payloadKeys,
      paperclipWakeToolName: stringValue(wake.toolName),
      sessionDisplayId,
    });

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      sessionId: `${toolName}-rehearsal`,
      sessionDisplayId,
      provider: "openclaw_gateway",
      biller: "openclaw_gateway",
      resultJson: {
        rehearsal: true,
        target,
        toolName,
        channel,
        payloadKeys,
      },
    };
  };

  const results = await runDearMeProviderSmoke({
    target: "openclaw_messages",
    live: true,
    env,
    openClawGatewayExecute,
    now: options.now,
  });
  const deliveredTargets = new Set(
    results
      .filter((result) => result.status === "delivered")
      .map((result) => result.target),
  );
  const ready =
    deliveredTargets.has("telegram_message") &&
    deliveredTargets.has("imessage_message") &&
    captured.length === 2;

  return {
    status: ready ? "ready" : "blocked",
    verdict: ready
      ? "OpenClaw message contract rehearsal: ready."
      : "OpenClaw message contract rehearsal: blocked.",
    summary: ready
      ? "DearMe can form the shared OpenClaw Telegram and iMessage gateway contract without network access, external recipients, or provider credentials."
      : "DearMe could not prove the shared OpenClaw Telegram and iMessage gateway contract locally.",
    results,
    captured,
    liveProofStillRequired: true,
    missingCapabilities: ready ? [] : ["openclaw_message_contract_rehearsal_failed"],
    commands: {
      rehearsal: REHEARSAL_COMMAND,
      liveProof: LIVE_PROOF_COMMAND,
    },
  };
}

export function formatDearMeOpenClawMessageRehearsal(
  report: DearMeOpenClawMessageRehearsalReport,
): string[] {
  const lines = [
    "DearMe OpenClaw message contract rehearsal",
    report.verdict,
    report.summary,
    "",
    "Provider-smoke results:",
  ];

  for (const result of report.results) {
    const marker = result.status === "delivered" ? "[x]" : "[ ]";
    const detail = result.status === "delivered"
      ? result.externalUrl ?? result.externalId
      : result.status === "blocked"
        ? result.missing.join(", ")
        : result.reason;
    lines.push(`- ${marker} ${result.target}: ${result.status} (${detail})`);
  }

  lines.push("");
  lines.push("Captured OpenClaw contract:");
  for (const item of report.captured) {
    lines.push(
      `- ${item.toolName} via ${item.channel}: payload keys ${item.payloadKeys.join(", ")}; wake tool ${item.paperclipWakeToolName ?? "missing"}`,
    );
  }

  lines.push("");
  lines.push("Live proof still required:");
  lines.push(`- ${report.commands.liveProof}`);
  return lines;
}

export function parseDearMeOpenClawMessageRehearsalArgs(
  argv: readonly string[],
): DearMeOpenClawMessageRehearsalArgs {
  const args: DearMeOpenClawMessageRehearsalArgs = {
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
  console.log(`Usage: pnpm dearme:openclaw-message-rehearsal -- [--check] [--json]

Runs the shared Telegram/iMessage provider-smoke path through an injected
OpenClaw gateway executor. It does not connect to a gateway, send messages,
print credentials, spend money, deploy, or replace the required live smoke.`);
}

async function main() {
  try {
    const parsed = parseDearMeOpenClawMessageRehearsalArgs(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    const rehearsal = await runDearMeOpenClawMessageRehearsal();
    if (parsed.json) {
      console.log(JSON.stringify({ rehearsal }, null, 2));
    } else {
      for (const line of formatDearMeOpenClawMessageRehearsal(rehearsal)) {
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
