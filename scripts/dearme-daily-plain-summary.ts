import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSupportThread } from "../server/src/services/dearme-support.ts";
import {
  parseDearMeStandingLoopAuditArgs,
  runDearMeStandingLoopAudit,
  type DearMeStandingLoopAudit,
} from "./dearme-standing-loop-audit.ts";
import {
  inspectDearMePaymentReadiness,
  type DearMePaymentReadiness,
} from "./dearme-payment-readiness.ts";

const DEFAULT_LEDGER_PATH = "docs/dearme/CODEX-RUN-LEDGER.md";
const HUMAN_HELP_QUEUE_PATH = "docs/NEEDS_HUMAN_HELP.md";
const DEFAULT_RECIPIENT_NAME = "Peter";
const DEFAULT_SENDER_NAME = "Codex";
const DEFAULT_OPERATOR_TIME_ZONE = "America/New_York";

export interface DearMeDailyPlainSummaryArgs {
  help: boolean;
  json: boolean;
  dryRun: boolean;
  humanHelpMarkdown: boolean;
  date: string;
  ledgerPath: string;
  recipientEmail?: string;
  recipientName: string;
  senderName: string;
}

export interface DearMeDailyLedgerEntry {
  date: string;
  time: string;
  id: string;
  sha: string;
  pr: string;
  priority: string;
  summary: string;
}

export type DearMeDailyPlainSummaryResult =
  | {
    ok: true;
    skipped: true;
    reason: string;
    subject: string;
    body: string;
  }
  | {
    ok: boolean;
    skipped: false;
    subject: string;
    body: string;
    threadId?: string | null;
    status?: number;
  };

type CreateThread = typeof createSupportThread;

export interface DearMeDailyPlainSummaryOptions {
  env?: NodeJS.ProcessEnv;
  readLedger?: (path: string) => Promise<string>;
  runStandingLoopAudit?: () => Promise<DearMeStandingLoopAudit>;
  inspectPaymentReadiness?: (env?: NodeJS.ProcessEnv) => DearMePaymentReadiness;
  createThread?: CreateThread;
}

const LEDGER_LINE_PATTERN = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([A-Z0-9-]+)\s+([0-9a-f]{7,40})\s+(PR #[0-9]+|-)\s+(\S+)\s+(.+)$/;

export function formatDearMeDailyLocalDate(
  date = new Date(),
  timeZone = process.env.DEARME_DAILY_SUMMARY_TIME_ZONE?.trim()
    || process.env.TZ?.trim()
    || DEFAULT_OPERATOR_TIME_ZONE,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Could not format DearMe daily summary date for time zone ${timeZone}.`);
  }
  return `${year}-${month}-${day}`;
}

function configuredValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function parseDearMeDailyLedgerEntries(ledgerMarkdown: string): DearMeDailyLedgerEntry[] {
  return ledgerMarkdown
    .split(/\r?\n/)
    .map((line) => {
      const match = LEDGER_LINE_PATTERN.exec(line.trim());
      if (!match) return null;
      const [, date, time, id, sha, pr, priority, summary] = match;
      return { date, time, id, sha, pr, priority, summary };
    })
    .filter((entry): entry is DearMeDailyLedgerEntry => entry !== null);
}

function latestEntry(entries: DearMeDailyLedgerEntry[]) {
  return entries[entries.length - 1] ?? null;
}

function prLink(pr: string) {
  const match = /^PR #([0-9]+)$/.exec(pr);
  return match ? `https://github.com/WuKongAI-CMU/paperclip/pull/${match[1]}` : null;
}

function formatShippedEntries(entries: DearMeDailyLedgerEntry[], maxEntries = 5) {
  if (entries.length === 0) {
    return ["- No merged DearMe slices were recorded in the run ledger for this date."];
  }
  const visibleEntries = entries.slice(-maxEntries);
  const hiddenCount = entries.length - visibleEntries.length;
  const lines = visibleEntries.map((entry) => {
    const link = prLink(entry.pr);
    const prText = link ? `${entry.pr}, ${link}` : entry.pr;
    return `- ${entry.id} (${prText}, ${entry.sha.slice(0, 8)}): ${entry.summary}`;
  });
  if (hiddenCount > 0) {
    lines.unshift(`- ${hiddenCount} earlier ledger entries were also recorded for this date.`);
  }
  return lines;
}

function firstPaymentFacts(audit: DearMeStandingLoopAudit) {
  return audit.nextAction.hostedCheckoutFacts ?? [];
}

function ownerFacts(audit: DearMeStandingLoopAudit) {
  return audit.nextAction.ownerFacts ?? [];
}

function dailyPlainSummaryFacts(audit: DearMeStandingLoopAudit) {
  return audit.dailyPlainSummaryFacts;
}

function reviewRequiredDependencyLines(audit: DearMeStandingLoopAudit) {
  return audit.dependency.reviewRequiredUpdates.map((update) => {
    return `- ${update.name}: ${update.current} -> ${update.latest} (${update.kind}) - ${update.reason}`;
  });
}

function hasHumanHelpFacts(audit: DearMeStandingLoopAudit) {
  return ownerFacts(audit).length > 0
    || firstPaymentFacts(audit).length > 0
    || dailyPlainSummaryFacts(audit).length > 0
    || audit.dependency.reviewRequiredUpdates.length > 0;
}

export function buildDearMeDailyPlainSummary(input: {
  date: string;
  ledgerEntries: DearMeDailyLedgerEntry[];
  standingLoopAudit: DearMeStandingLoopAudit;
  paymentReadiness: DearMePaymentReadiness;
}) {
  const shippedToday = input.ledgerEntries.filter((entry) => entry.date === input.date);
  const latest = latestEntry(input.ledgerEntries);
  const subject = `Codex daily — ${input.date}`;
  const audit = input.standingLoopAudit;
  const ownerFactLines = ownerFacts(audit).map((fact) => `- ${fact}`);
  const paymentFactLines = firstPaymentFacts(audit).map((fact) => `- ${fact}`);
  const dailyPlainSummaryFactLines = dailyPlainSummaryFacts(audit).map((fact) => `- ${fact}`);
  const reviewRequiredLines = reviewRequiredDependencyLines(audit);
  const payment = input.paymentReadiness;
  const bodyLines = [
    subject,
    "",
    "Shipped today:",
    ...formatShippedEntries(shippedToday),
    "",
    "Current state:",
    `- Standing loop: ${audit.state}`,
    `- P0/P1/P2 ledger: ${audit.backlog.required.shipped}/${audit.backlog.required.total}`,
    `- Doc freshness: ${audit.docFreshness.complete ? "clear" : "stale"}`,
    `- Human help queue freshness: ${audit.humanHelpQueueFreshness.complete ? "clear" : "stale"} (${audit.humanHelpQueueFreshness.operatingDate})`,
    `- Autonomous dependency updates: ${audit.dependency.autonomousUpdates.length}`,
    `- Review-required dependency updates: ${audit.dependency.reviewRequiredUpdates.length}`,
    `- Goal complete: ${audit.goal.complete ? "yes" : "no"}`,
    `- Next action: ${audit.nextAction.label} - ${audit.nextAction.reason}`,
    "",
    "First-$29 path:",
    `- Private beta sales: ${payment.canSellPrivateBeta ? "ready now" : "blocked"}. ${payment.manualPaidBeta.summary}`,
    `- Self-serve checkout claim: ${payment.canClaimSelfServeCheckout ? "ready" : "blocked"}. ${payment.hostedCheckout.summary}`,
    `- Safe next step: ${payment.nextAction}`,
    `- Safety: ${payment.noExternalActionGuarantee}`,
  ];

  if (ownerFactLines.length > 0) {
    bodyLines.push("", "Owner proof facts needed:", ...ownerFactLines);
  }
  if (paymentFactLines.length > 0) {
    bodyLines.push("", "First-payment checkout facts needed:", ...paymentFactLines);
  }
  if (dailyPlainSummaryFactLines.length > 0) {
    bodyLines.push("", "Daily Plain summary facts needed:", ...dailyPlainSummaryFactLines);
  }
  if (reviewRequiredLines.length > 0) {
    bodyLines.push("", "Review-required dependency updates:", ...reviewRequiredLines);
  }
  if (hasHumanHelpFacts(audit)) {
    bodyLines.push(
      "",
      `Human help queue: ${HUMAN_HELP_QUEUE_PATH} has the reply templates and safe follow-up commands for these blockers.`,
    );
  }
  if (audit.nextAction.command) {
    bodyLines.push("", `Next command: ${audit.nextAction.command}`);
  }
  if (latest) {
    bodyLines.push("", `Latest ledger entry: ${latest.id} (${latest.pr}, ${latest.sha.slice(0, 8)}).`);
  }
  return { subject, body: bodyLines.join("\n") };
}

export function buildDearMeDailyPlainHumanHelpMarkdown(input: {
  date: string;
  apiKeyConfigured: boolean;
  recipientEmailConfigured: boolean;
}) {
  const missingItems = [
    input.apiKeyConfigured ? null : "`DEARME_PLAIN_API_KEY`",
    input.recipientEmailConfigured ? null : "`DEARME_CODEX_DAILY_PLAIN_EMAIL` or `DEARME_PLAIN_DAILY_EMAIL`",
  ].filter((item): item is string => item !== null);
  const blockerText = missingItems.length > 0
    ? missingItems.join(" and ")
    : "no missing Plain daily summary configuration";
  return [
    `### ${input.date} - Daily Plain summary delivery configuration`,
    "",
    "- Needs help from: Peter",
    "- What they need to do: provide the Plain API key plus the Peter recipient email for the required Codex daily support-thread summary.",
    "- Why agents cannot do it: Plain account ownership, API-key creation, and recipient routing are Peter-owned account configuration.",
    `- Blocking: no for product development or private-beta operations; yes for delivering the required daily Plain summary automatically. Current blocker: ${blockerText}.`,
    "- Estimated human time: 5-10 minutes once the Plain workspace exists.",
    "- Agents continue after result by: running `pnpm --silent dearme:daily-plain-summary -- --json` and confirming the low-severity Plain thread is created.",
    `- Last verified: ${input.date} with \`pnpm --silent dearme:daily-plain-summary -- --json\`.`,
    "",
    "Needed values:",
    "",
    "- `DEARME_PLAIN_API_KEY`: Plain API key for creating the daily support thread.",
    "- `DEARME_CODEX_DAILY_PLAIN_EMAIL` or `DEARME_PLAIN_DAILY_EMAIL`: recipient email for Peter's daily summary thread.",
    "",
    "Reply template for Peter:",
    "",
    "```text",
    "Plain daily summary API key configured:",
    "Plain daily summary recipient email:",
    "```",
    "",
    "Required local check after configuration:",
    "",
    "```bash",
    "pnpm --silent dearme:daily-plain-summary -- --json",
    "```",
    "",
    "Safety notes:",
    "",
    "- Do not paste the Plain API key into chat, docs, screenshots, or customer-facing copy.",
    "- The summary is low severity and contains run-ledger status plus owner-blocked facts; it does not include customer data or secrets.",
  ].join("\n");
}

export function parseDearMeDailyPlainSummaryArgs(argv: string[]): DearMeDailyPlainSummaryArgs {
  const args: DearMeDailyPlainSummaryArgs = {
    help: false,
    json: false,
    dryRun: false,
    humanHelpMarkdown: false,
    date: formatDearMeDailyLocalDate(),
    ledgerPath: DEFAULT_LEDGER_PATH,
    recipientName: DEFAULT_RECIPIENT_NAME,
    senderName: DEFAULT_SENDER_NAME,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--human-help-markdown") {
      args.humanHelpMarkdown = true;
    } else if (arg === "--date") {
      args.date = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--ledger") {
      args.ledgerPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--recipient-email") {
      args.recipientEmail = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--recipient-name") {
      args.recipientName = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--sender-name") {
      args.senderName = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error("--date must be YYYY-MM-DD.");
  }
  if (!args.ledgerPath) {
    throw new Error("--ledger requires a path.");
  }
  if (!args.recipientName.trim()) {
    throw new Error("--recipient-name requires a value.");
  }
  if (!args.senderName.trim()) {
    throw new Error("--sender-name requires a value.");
  }
  return args;
}

export async function runDearMeDailyPlainSummary(
  args: DearMeDailyPlainSummaryArgs,
  options: DearMeDailyPlainSummaryOptions = {},
): Promise<DearMeDailyPlainSummaryResult> {
  const env = options.env ?? process.env;
  const readLedger = options.readLedger ?? ((path: string) => readFile(path, "utf8"));
  const [ledgerMarkdown, standingLoopAudit] = await Promise.all([
    readLedger(args.ledgerPath),
    options.runStandingLoopAudit
      ? options.runStandingLoopAudit()
      : runDearMeStandingLoopAudit(parseDearMeStandingLoopAuditArgs([
        "--backlog-ledger",
        args.ledgerPath,
      ])),
  ]);
  const paymentReadiness = (options.inspectPaymentReadiness ?? inspectDearMePaymentReadiness)(env);
  const { subject, body } = buildDearMeDailyPlainSummary({
    date: args.date,
    ledgerEntries: parseDearMeDailyLedgerEntries(ledgerMarkdown),
    standingLoopAudit,
    paymentReadiness,
  });

  const recipientEmail = configuredValue(args.recipientEmail)
    ?? configuredValue(env.DEARME_CODEX_DAILY_PLAIN_EMAIL)
    ?? configuredValue(env.DEARME_PLAIN_DAILY_EMAIL);
  const apiKey = configuredValue(env.DEARME_PLAIN_API_KEY);
  if (args.dryRun) {
    return { ok: true, skipped: true, reason: "dry_run", subject, body };
  }
  if (!apiKey) {
    return { ok: true, skipped: true, reason: "dearme_plain_api_key_unset", subject, body };
  }
  if (!recipientEmail) {
    return { ok: true, skipped: true, reason: "dearme_codex_daily_plain_email_unset", subject, body };
  }

  const result = await (options.createThread ?? createSupportThread)({
    email: recipientEmail,
    name: args.recipientName,
    subject,
    body: `${body}\n\nSent by ${args.senderName}.`,
    severity: "low",
  }, {
    apiKey,
  });

  return {
    ok: Boolean(result.ok),
    skipped: false,
    subject,
    body,
    threadId: result.threadId,
    status: result.status,
  };
}

function usage(): string {
  return [
    "Usage: pnpm --silent dearme:daily-plain-summary [--dry-run] [--json]",
    "",
    "Builds the required daily Codex summary and posts it to Plain when configured.",
    "",
    "Options:",
    "  --dry-run                    Print/return the summary without posting to Plain.",
    "  --human-help-markdown        Print the Peter-facing Plain configuration request.",
    "  --json                       Print machine-readable JSON.",
    "  --date <YYYY-MM-DD>          Summary date. Defaults to today.",
    "  --ledger <path>              Run ledger path.",
    "  --recipient-email <email>    Plain customer email. Also reads DEARME_CODEX_DAILY_PLAIN_EMAIL.",
    "  --recipient-name <name>      Plain customer name. Defaults to Peter.",
    "  --sender-name <name>         Signature name. Defaults to Codex.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseDearMeDailyPlainSummaryArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const env = process.env;
  if (args.humanHelpMarkdown) {
    const recipientEmail = configuredValue(args.recipientEmail)
      ?? configuredValue(env.DEARME_CODEX_DAILY_PLAIN_EMAIL)
      ?? configuredValue(env.DEARME_PLAIN_DAILY_EMAIL);
    console.log(buildDearMeDailyPlainHumanHelpMarkdown({
      date: args.date,
      apiKeyConfigured: Boolean(configuredValue(env.DEARME_PLAIN_API_KEY)),
      recipientEmailConfigured: Boolean(recipientEmail),
    }));
    return;
  }

  const result = await runDearMeDailyPlainSummary(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.body);
    if (result.skipped) {
      console.log(`\nSkipped Plain send: ${result.reason}`);
    } else {
      console.log(`\nPlain send ${result.ok ? "succeeded" : "failed"}${result.threadId ? `: ${result.threadId}` : ""}`);
    }
  }
  if (!result.ok) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
