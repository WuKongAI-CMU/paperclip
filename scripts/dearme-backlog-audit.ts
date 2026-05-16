import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DearMeBacklogPriority = "P0" | "P1" | "P2" | "Standing";

export interface DearMeBacklogItem {
  id: string;
  title: string;
  priority: DearMeBacklogPriority;
  requiredForNamedBacklog: boolean;
}

export interface DearMeBacklogAudit {
  complete: boolean;
  required: {
    total: number;
    shipped: number;
    missing: DearMeBacklogItem[];
  };
  standingOpen: DearMeBacklogItem[];
  ledgerIds: string[];
  nextAction: {
    label: string;
    reason: string;
  };
}

export interface DearMeBacklogAuditArgs {
  help: boolean;
  json: boolean;
  check: boolean;
  handoffPath: string;
  ledgerPath: string;
}

const DEFAULT_HANDOFF_PATH = "docs/dearme/CODEX-HANDOFF-TOKEN.md";
const DEFAULT_LEDGER_PATH = "docs/dearme/CODEX-RUN-LEDGER.md";
const BACKLOG_SECTION = "## 3. Autonomous backlog";
const NEXT_SECTION_PREFIX = "\n## 4.";
const HEADING_TO_PRIORITY: readonly [RegExp, DearMeBacklogPriority][] = [
  [/^### P0\b/, "P0"],
  [/^### P1\b/, "P1"],
  [/^### P2\b/, "P2"],
  [/^### Standing infinite work\b/, "Standing"],
];
const ITEM_PATTERN = /^- \[[ xX]\] \*\*([^*]+)\*\*\s*(?:[-:\u2014]\s*)?(.*)$/;
const LEDGER_ID_PATTERN = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+([A-Z0-9-]+)\b/gm;

export function parseDearMeBacklogItems(handoffMarkdown: string): DearMeBacklogItem[] {
  const sectionStart = handoffMarkdown.indexOf(BACKLOG_SECTION);
  if (sectionStart === -1) {
    throw new Error(`Missing ${BACKLOG_SECTION} section.`);
  }

  const afterBacklog = handoffMarkdown.slice(sectionStart);
  const nextSectionStart = afterBacklog.indexOf(NEXT_SECTION_PREFIX);
  const backlogSection = nextSectionStart === -1
    ? afterBacklog
    : afterBacklog.slice(0, nextSectionStart);

  let priority: DearMeBacklogPriority | undefined;
  const items: DearMeBacklogItem[] = [];

  for (const line of backlogSection.split(/\r?\n/)) {
    const headingMatch = HEADING_TO_PRIORITY.find(([pattern]) => pattern.test(line));
    if (headingMatch) {
      priority = headingMatch[1];
      continue;
    }

    const itemMatch = ITEM_PATTERN.exec(line);
    if (!itemMatch || !priority) {
      continue;
    }

    const [, rawId, title] = itemMatch;
    const id = rawId.replace(/:$/, "");
    items.push({
      id,
      title: title.trim(),
      priority,
      requiredForNamedBacklog: priority !== "Standing",
    });
  }

  return items;
}

export function parseDearMeLedgerIds(ledgerMarkdown: string): string[] {
  return Array.from(ledgerMarkdown.matchAll(LEDGER_ID_PATTERN), (match) => match[1]);
}

export function summarizeDearMeBacklogAudit(
  items: DearMeBacklogItem[],
  ledgerIds: string[],
): DearMeBacklogAudit {
  const ledgerIdSet = new Set(ledgerIds);
  const requiredItems = items.filter((item) => item.requiredForNamedBacklog);
  const missingRequired = requiredItems.filter((item) => !ledgerIdSet.has(item.id));
  const standingOpen = items.filter((item) => !item.requiredForNamedBacklog && !ledgerIdSet.has(item.id));
  const complete = missingRequired.length === 0;

  return {
    complete,
    required: {
      total: requiredItems.length,
      shipped: requiredItems.length - missingRequired.length,
      missing: missingRequired,
    },
    standingOpen,
    ledgerIds,
    nextAction: complete
      ? {
        label: "Continue standing loop",
        reason: "Every P0/P1/P2 handoff backlog item has a run-ledger entry; keep cycling standing checks until owner proof facts unblock public launch.",
      }
      : {
        label: missingRequired[0]?.id ?? "Missing backlog item",
        reason: "At least one P0/P1/P2 handoff backlog item is not present in the run ledger.",
      },
  };
}

export function formatDearMeBacklogAudit(audit: DearMeBacklogAudit): string[] {
  const lines = [
    `DearMe backlog ledger audit: ${audit.complete ? "complete" : "blocked"}`,
    `- Required P0/P1/P2 shipped: ${audit.required.shipped}/${audit.required.total}`,
  ];

  if (audit.required.missing.length > 0) {
    lines.push("- Missing required ledger entries:");
    for (const item of audit.required.missing) {
      lines.push(`  - ${item.priority} ${item.id}: ${item.title}`);
    }
  }

  lines.push(`- Standing loop items open: ${audit.standingOpen.length}`);
  for (const item of audit.standingOpen) {
    lines.push(`  - ${item.id}`);
  }

  lines.push(`- Next action: ${audit.nextAction.label} - ${audit.nextAction.reason}`);
  return lines;
}

export function parseDearMeBacklogAuditArgs(argv: string[]): DearMeBacklogAuditArgs {
  const args: DearMeBacklogAuditArgs = {
    help: false,
    json: false,
    check: false,
    handoffPath: DEFAULT_HANDOFF_PATH,
    ledgerPath: DEFAULT_LEDGER_PATH,
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
    } else if (arg === "--handoff") {
      args.handoffPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--ledger") {
      args.ledgerPath = argv[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.handoffPath) {
    throw new Error("--handoff requires a path.");
  }
  if (!args.ledgerPath) {
    throw new Error("--ledger requires a path.");
  }

  return args;
}

export async function runDearMeBacklogAudit(args: DearMeBacklogAuditArgs): Promise<DearMeBacklogAudit> {
  const [handoffMarkdown, ledgerMarkdown] = await Promise.all([
    readFile(args.handoffPath, "utf8"),
    readFile(args.ledgerPath, "utf8"),
  ]);
  return summarizeDearMeBacklogAudit(
    parseDearMeBacklogItems(handoffMarkdown),
    parseDearMeLedgerIds(ledgerMarkdown),
  );
}

function usage(): string {
  return [
    "Usage: pnpm --silent dearme:backlog-audit [--check] [--json]",
    "",
    "Verifies that the section 3 P0/P1/P2 handoff backlog is represented in docs/dearme/CODEX-RUN-LEDGER.md.",
    "",
    "Options:",
    "  --check              Exit 1 when any required backlog item is missing from the ledger.",
    "  --json               Print machine-readable JSON.",
    "  --handoff <path>     Handoff token path.",
    "  --ledger <path>      Run ledger path.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = parseDearMeBacklogAuditArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const audit = await runDearMeBacklogAudit(args);
  if (args.json) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    console.log(formatDearMeBacklogAudit(audit).join("\n"));
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
