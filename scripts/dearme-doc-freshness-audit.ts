import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface DearMeLedgerEntry {
  date: string;
  time: string;
  id: string;
  sha: string;
  pr: string;
  summary: string;
}

export interface DearMeDocFreshnessAudit {
  complete: boolean;
  latestLedgerEntry?: DearMeLedgerEntry;
  indexShippedDate?: string;
  indexEntryPresent: boolean;
  nextAction: {
    label: string;
    reason: string;
  };
}

export interface DearMeDocFreshnessAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  ledgerPath: string;
  indexPath: string;
}

const DEFAULT_LEDGER_PATH = "docs/dearme/CODEX-RUN-LEDGER.md";
const DEFAULT_INDEX_PATH = "docs/dearme/INDEX.md";
const LEDGER_ENTRY_PATTERN =
  /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([A-Z0-9-]+)\s+(\S+)\s+(PR #\d+|-)\s+(.+)$/gm;
const SHIPPED_DATE_PATTERN = /^### Shipped \(as of (\d{4}-\d{2}-\d{2})\)$/m;
const DOC_FRESHNESS_ID_PATTERN = /^DM-DOC-FRESHNESS-/;

export function parseDearMeLedgerEntries(ledgerMarkdown: string): DearMeLedgerEntry[] {
  return Array.from(ledgerMarkdown.matchAll(LEDGER_ENTRY_PATTERN), (match) => ({
    date: match[1],
    time: match[2],
    id: match[3],
    sha: match[4],
    pr: match[5],
    summary: match[6].trim(),
  }));
}

export function latestIndexTrackedLedgerEntry(entries: DearMeLedgerEntry[]): DearMeLedgerEntry | undefined {
  return entries
    .filter((entry) => entry.pr !== "-")
    .filter((entry) => !DOC_FRESHNESS_ID_PATTERN.test(entry.id))
    .at(-1);
}

export function parseIndexShippedDate(indexMarkdown: string): string | undefined {
  return SHIPPED_DATE_PATTERN.exec(indexMarkdown)?.[1];
}

export function summarizeDearMeDocFreshnessAudit(
  ledgerEntries: DearMeLedgerEntry[],
  indexMarkdown: string,
): DearMeDocFreshnessAudit {
  const latestLedgerEntry = latestIndexTrackedLedgerEntry(ledgerEntries);
  const indexShippedDate = parseIndexShippedDate(indexMarkdown);
  const indexEntryPresent = latestLedgerEntry
    ? indexMarkdown.includes(`**${latestLedgerEntry.id}**`)
    : false;
  const shippedDateCurrent = Boolean(
    latestLedgerEntry
      && indexShippedDate
      && indexShippedDate >= latestLedgerEntry.date,
  );
  const complete = Boolean(latestLedgerEntry && indexEntryPresent && shippedDateCurrent);

  return {
    complete,
    latestLedgerEntry,
    indexShippedDate,
    indexEntryPresent,
    nextAction: complete
      ? {
        label: "Continue standing loop",
        reason: "INDEX.md records the latest non-doc-freshness run-ledger slice.",
      }
      : {
        label: "Update docs/dearme/INDEX.md",
        reason: latestLedgerEntry
          ? `Record ${latestLedgerEntry.id} and advance the shipped date to at least ${latestLedgerEntry.date}.`
          : "No PR-backed run-ledger entry was found to compare with INDEX.md.",
      },
  };
}

export function formatDearMeDocFreshnessAudit(audit: DearMeDocFreshnessAudit): string[] {
  const lines = [
    `DearMe doc freshness audit: ${audit.complete ? "clear" : "stale"}`,
  ];

  if (audit.latestLedgerEntry) {
    lines.push(
      `- Latest tracked ledger slice: ${audit.latestLedgerEntry.id} (${audit.latestLedgerEntry.date}, ${audit.latestLedgerEntry.pr})`,
    );
  } else {
    lines.push("- Latest tracked ledger slice: none");
  }
  lines.push(`- INDEX shipped date: ${audit.indexShippedDate ?? "missing"}`);
  lines.push(`- INDEX entry present: ${audit.indexEntryPresent ? "yes" : "no"}`);
  lines.push(`- Next action: ${audit.nextAction.label} - ${audit.nextAction.reason}`);
  return lines;
}

export function parseDearMeDocFreshnessAuditArgs(argv: string[]): DearMeDocFreshnessAuditArgs {
  const args: DearMeDocFreshnessAuditArgs = {
    help: false,
    json: false,
    check: false,
    ledgerPath: DEFAULT_LEDGER_PATH,
    indexPath: DEFAULT_INDEX_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--ledger") {
      args.ledgerPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--index") {
      args.indexPath = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.ledgerPath) {
    throw new Error("--ledger requires a path.");
  }
  if (!args.indexPath) {
    throw new Error("--index requires a path.");
  }

  return args;
}

export async function runDearMeDocFreshnessAudit(
  args: DearMeDocFreshnessAuditArgs,
): Promise<DearMeDocFreshnessAudit> {
  const [ledgerMarkdown, indexMarkdown] = await Promise.all([
    readFile(args.ledgerPath, "utf8"),
    readFile(args.indexPath, "utf8"),
  ]);
  return summarizeDearMeDocFreshnessAudit(
    parseDearMeLedgerEntries(ledgerMarkdown),
    indexMarkdown,
  );
}

function usage(): string {
  return [
    "Usage: pnpm --silent dearme:doc-freshness-audit [--check] [--json]",
    "",
    "Verifies that docs/dearme/INDEX.md records the latest non-doc-freshness run-ledger slice.",
    "",
    "Options:",
    "  --check           Exit 1 when INDEX.md is missing the latest tracked ledger slice.",
    "  --json            Print machine-readable JSON.",
    "  --ledger <path>   Run ledger path.",
    "  --index <path>    DearMe index path.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseDearMeDocFreshnessAuditArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const audit = await runDearMeDocFreshnessAudit(args);
  if (args.json) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(formatDearMeDocFreshnessAudit(audit).join("\n"));
  }

  if (args.check && !audit.complete) {
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
