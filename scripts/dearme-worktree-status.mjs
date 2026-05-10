#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 0;
const DEFAULT_SYMPHONY_ROOT = "/private/tmp/dearme-symphony-workspaces";
const WORKTREE_STATUSES = new Set([
  "current",
  "in_current",
  "patch_equivalent",
  "not_in_current",
  "detached",
  "prunable",
  "unknown",
]);

function runGit(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitSucceeds(args, cwd = process.cwd()) {
  try {
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

export function parseWorktrees(output) {
  const worktrees = [];
  let current = {};

  function flush() {
    if (current.path) worktrees.push(current);
    current = {};
  }

  for (const line of output.split("\n")) {
    if (!line.trim()) {
      flush();
      continue;
    }

    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ");

    if (key === "worktree") current.path = value;
    if (key === "HEAD") current.head = value;
    if (key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
    if (key === "detached") current.detached = true;
    if (key === "prunable") current.prunable = value || true;
  }

  flush();
  return worktrees;
}

export function deriveWorktreeTicket({ branch = "", path = "" }) {
  const source = `${branch} ${path}`;
  const match = source.match(
    /(?:^|[-_/\s])(?<prefix>dm|dea)[-_]?(?<number>\d{1,4}[a-z]?)(?:[-_/\s]|$)/i,
  );
  if (!match?.groups) return null;
  return `${match.groups.prefix.toUpperCase()}-${match.groups.number.toUpperCase()}`;
}

export function classifyWorktreePurpose({ branch = "", path = "", status }) {
  if (status === "current") return "current";

  const source = `${branch} ${path}`;
  const ticket = deriveWorktreeTicket({ branch, path });
  if (ticket?.startsWith("DEA-") || /dearme-symphony-workspaces|symphony/i.test(source)) {
    return "symphony";
  }

  if (/\b(baseline|integrate|integrated|integration)\b/i.test(source)) {
    return "integration";
  }

  return "worker";
}

export function recommendWorktreeAction({ status, purpose, dirtyFiles, headSubjectInCurrent }) {
  if ((dirtyFiles ?? 0) > 0 && status !== "current") {
    return "preserve dirty work before any close or replay";
  }

  if (status === "current") {
    return "coordination head; keep as the integration truth";
  }

  if (status === "in_current" && purpose === "symphony") {
    return "absorbed Symphony lane; keep as audit trail or close after owner confirmation";
  }

  if (status === "in_current") {
    return "absorbed by current head; close only after owner confirmation";
  }

  if (status === "patch_equivalent") {
    return "patch-equivalent to current head; close only after owner confirmation";
  }

  if (status === "not_in_current" && headSubjectInCurrent) {
    return "tip subject already exists in current head; inspect residual diff before replay or close";
  }

  if (status === "not_in_current" && purpose === "integration") {
    return "historical integration branch; compare before replay, do not merge blindly";
  }

  if (status === "not_in_current" && purpose === "symphony") {
    return "active Symphony lane; compare against current head and replay only issue-scoped slices";
  }

  if (status === "not_in_current") {
    return "candidate worker result; inspect diff and replay only still-valuable product slices";
  }

  if (status === "prunable") {
    return "stale metadata; prune only after confirming the checkout is intentionally gone";
  }

  if (status === "detached") {
    return "detached checkout; inspect manually before reuse";
  }

  return "unknown metadata; inspect git worktree record";
}

function countDirtyFiles(worktreePath, skipDirty) {
  if (skipDirty || !existsSync(worktreePath)) return null;
  const status = runGit(["status", "--short"], worktreePath);
  return status ? status.split("\n").length : 0;
}

function hasUnabsorbedPatchCommits(head, currentHead, repoRoot) {
  try {
    return (
      runGit(
        ["log", "--right-only", "--cherry-pick", "--format=%H", `${currentHead}...${head}`],
        repoRoot,
      ).length > 0
    );
  } catch {
    return true;
  }
}

function commitSubject(revision, cwd) {
  if (!revision) return null;
  try {
    return runGit(["show", "-s", "--format=%s", revision], cwd);
  } catch {
    return null;
  }
}

function collectCurrentSubjects(currentHead, repoRoot) {
  return new Set(runGit(["log", "--format=%s", currentHead], repoRoot).split("\n").filter(Boolean));
}

export function classifyWorktree({ head, detached, prunable }, currentHead, repoRoot) {
  if (prunable) return "prunable";
  if (detached) return "detached";
  if (!head) return "unknown";
  if (head === currentHead) return "current";
  if (gitSucceeds(["merge-base", "--is-ancestor", head, currentHead], repoRoot)) {
    return "in_current";
  }
  if (!hasUnabsorbedPatchCommits(head, currentHead, repoRoot)) {
    return "patch_equivalent";
  }
  return "not_in_current";
}

function annotateWorktreeSubject(record, currentHead, currentSubjects, objectCwd) {
  const headSubject = commitSubject(record.head, objectCwd);

  return {
    ...record,
    headSubject,
    headSubjectInCurrent:
      Boolean(headSubject) && record.head !== currentHead && currentSubjects.has(headSubject),
  };
}

export function enrichWorktreeRecord(record) {
  const ticket = deriveWorktreeTicket(record);
  const purpose = classifyWorktreePurpose(record);

  return {
    ...record,
    ticket,
    purpose,
    nextAction: recommendWorktreeAction({ ...record, purpose }),
  };
}

export function listSymphonyWorkspacePaths(root = DEFAULT_SYMPHONY_ROOT) {
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, "repo"))
    .filter((repoPath) => existsSync(join(repoPath, ".git")));
}

export function summarize(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      summary[record.status] = (summary[record.status] ?? 0) + 1;
      if (record.status === "not_in_current" && record.headSubjectInCurrent) {
        summary.subject_matched = (summary.subject_matched ?? 0) + 1;
      }
      if ((record.dirtyFiles ?? 0) > 0) summary.dirty += 1;
      summary.byPurpose[record.purpose] = (summary.byPurpose[record.purpose] ?? 0) + 1;
      if (record.ticket) {
        summary.byTicket[record.ticket] = (summary.byTicket[record.ticket] ?? 0) + 1;
      }
      return summary;
    },
    { total: 0, dirty: 0, byPurpose: {}, byTicket: {} },
  );
}

function collectSymphonyWorkspaceStatus({
  repoRoot,
  currentHead,
  currentSubjects,
  skipDirty,
  symphonyRoot,
}) {
  return listSymphonyWorkspacePaths(symphonyRoot).map((workspacePath) => {
    const head = runGit(["rev-parse", "HEAD"], workspacePath);
    const branch = runGit(["branch", "--show-current"], workspacePath) || "(detached)";

    return enrichWorktreeRecord(
      annotateWorktreeSubject(
        {
          path: workspacePath,
          branch,
          head,
          source: "symphony",
          status: classifyWorktree({ head, detached: branch === "(detached)" }, currentHead, repoRoot),
          dirtyFiles: countDirtyFiles(workspacePath, skipDirty),
          prunable: false,
        },
        currentHead,
        currentSubjects,
        workspacePath,
      ),
    );
  });
}

export function collectWorktreeStatus({
  cwd = process.cwd(),
  skipDirty = false,
  includeSymphony = true,
  symphonyRoot = DEFAULT_SYMPHONY_ROOT,
} = {}) {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"], cwd);
  const currentHead = runGit(["rev-parse", "HEAD"], repoRoot);
  const currentSubjects = collectCurrentSubjects(currentHead, repoRoot);
  const worktrees = parseWorktrees(runGit(["worktree", "list", "--porcelain"], repoRoot));

  const records = worktrees.map((worktree) =>
    enrichWorktreeRecord(
      annotateWorktreeSubject(
        {
          path: worktree.path,
          branch: worktree.branch ?? (worktree.detached ? "(detached)" : "(unknown)"),
          head: worktree.head ?? null,
          status: classifyWorktree(worktree, currentHead, repoRoot),
          dirtyFiles: countDirtyFiles(worktree.path, skipDirty),
          prunable: Boolean(worktree.prunable),
        },
        currentHead,
        currentSubjects,
        existsSync(worktree.path) ? worktree.path : repoRoot,
      ),
    ),
  );

  if (!includeSymphony) return records;

  const seen = new Set(records.map((record) => record.path));
  const symphonyRecords = collectSymphonyWorkspaceStatus({
    repoRoot,
    currentHead,
    currentSubjects,
    skipDirty,
    symphonyRoot,
  }).filter((record) => !seen.has(record.path));

  return [...records, ...symphonyRecords];
}

export function parseArgs(argv) {
  const options = {
    json: false,
    summaryOnly: false,
    skipDirty: false,
    dirtyOnly: false,
    statuses: new Set(),
    tickets: new Set(),
    limit: DEFAULT_LIMIT,
    includeSymphony: true,
    symphonyRoot: DEFAULT_SYMPHONY_ROOT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--summary-only") {
      options.summaryOnly = true;
      continue;
    }

    if (arg === "--skip-dirty") {
      options.skipDirty = true;
      continue;
    }

    if (arg === "--dirty-only") {
      options.dirtyOnly = true;
      continue;
    }

    if (arg === "--no-symphony") {
      options.includeSymphony = false;
      continue;
    }

    if (arg === "--symphony-root") {
      i += 1;
      if (!argv[i]) throw new Error("--symphony-root requires a value");
      options.symphonyRoot = argv[i];
      continue;
    }

    if (arg.startsWith("--symphony-root=")) {
      options.symphonyRoot = arg.slice("--symphony-root=".length);
      continue;
    }

    if (arg === "--not-in-current") {
      options.statuses.add("not_in_current");
      continue;
    }

    if (arg === "--status") {
      i += 1;
      addStatusFilter(options, argv[i]);
      continue;
    }

    if (arg.startsWith("--status=")) {
      addStatusFilter(options, arg.slice("--status=".length));
      continue;
    }

    if (arg === "--ticket") {
      i += 1;
      addTicketFilter(options, argv[i]);
      continue;
    }

    if (arg.startsWith("--ticket=")) {
      addTicketFilter(options, arg.slice("--ticket=".length));
      continue;
    }

    if (arg === "--limit") {
      i += 1;
      options.limit = parseLimit(argv[i]);
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parseLimit(arg.slice("--limit=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function addStatusFilter(options, value) {
  if (!value) throw new Error("--status requires a value");
  const status = value.replaceAll("-", "_");
  if (!WORKTREE_STATUSES.has(status)) {
    throw new Error(`Unknown status: ${value}`);
  }
  options.statuses.add(status);
}

function addTicketFilter(options, value) {
  if (!value) throw new Error("--ticket requires a value");
  const match = value.match(/^(?:(?<prefix>dm|dea)[-_]?)?(?<number>\d{1,4}[a-z]?)$/i);
  if (!match?.groups) throw new Error(`Ticket must look like DM-138 or DEA-7, got: ${value}`);
  const prefix = (match.groups.prefix ?? "DM").toUpperCase();
  options.tickets.add(`${prefix}-${match.groups.number.toUpperCase()}`);
}

function parseLimit(value) {
  const limit = Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error(`--limit must be a non-negative integer, got: ${value}`);
  }
  return limit;
}

export function filterWorktreeRecords(records, options) {
  let filtered = records;

  if (options.statuses.size > 0) {
    filtered = filtered.filter((record) => options.statuses.has(record.status));
  }

  if (options.tickets.size > 0) {
    filtered = filtered.filter((record) => record.ticket && options.tickets.has(record.ticket));
  }

  if (options.dirtyOnly) {
    filtered = filtered.filter((record) => (record.dirtyFiles ?? 0) > 0);
  }

  if (options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

function printTable(records) {
  const summary = summarize(records);
  const rows = records
    .slice()
    .sort((a, b) =>
      `${a.status}\t${a.ticket ?? ""}\t${a.purpose}\t${a.branch}\t${a.path}`.localeCompare(
        `${b.status}\t${b.ticket ?? ""}\t${b.purpose}\t${b.branch}\t${b.path}`,
      ),
    );

  printSummary(summary);
  console.log("");
  console.log(
    `${"status".padEnd(16)} ${"dirty".padStart(5)} ${"ticket".padEnd(8)} ${"purpose".padEnd(11)} ${"branch".padEnd(54)} path`,
  );
  console.log(
    `${"-".repeat(16)} ${"-".repeat(5)} ${"-".repeat(8)} ${"-".repeat(11)} ${"-".repeat(54)} ${"-".repeat(20)}`,
  );

  for (const record of rows) {
    const dirty = record.dirtyFiles === null ? "-" : String(record.dirtyFiles);
    const ticket = record.ticket ?? "-";
    const branch = record.branch.length > 54 ? `${record.branch.slice(0, 51)}...` : record.branch;
    console.log(
      `${record.status.padEnd(16)} ${dirty.padStart(5)} ${ticket.padEnd(8)} ${record.purpose.padEnd(11)} ${branch.padEnd(54)} ${record.path}`,
    );
  }
}

function printSummary(summary) {
  console.log(
    [
      `DearMe worktrees: ${summary.total}`,
      `current: ${summary.current ?? 0}`,
      `in_current: ${summary.in_current ?? 0}`,
      `patch_equivalent: ${summary.patch_equivalent ?? 0}`,
      `not_in_current: ${summary.not_in_current ?? 0}`,
      `subject_matched: ${summary.subject_matched ?? 0}`,
      `detached: ${summary.detached ?? 0}`,
      `prunable: ${summary.prunable ?? 0}`,
      `dirty: ${summary.dirty}`,
    ].join(" | "),
  );
  console.log(
    [
      `purpose current: ${summary.byPurpose.current ?? 0}`,
      `integration: ${summary.byPurpose.integration ?? 0}`,
      `symphony: ${summary.byPurpose.symphony ?? 0}`,
      `worker: ${summary.byPurpose.worker ?? 0}`,
    ].join(" | "),
  );
}

function printActionSummary(records) {
  const counts = records.reduce((actions, record) => {
    actions[record.nextAction] = (actions[record.nextAction] ?? 0) + 1;
    return actions;
  }, {});

  console.log("");
  console.log("Coordinator actions:");
  for (const [action, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${count}: ${action}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const records = filterWorktreeRecords(
    collectWorktreeStatus({
      skipDirty: options.skipDirty,
      includeSymphony: options.includeSymphony,
      symphonyRoot: options.symphonyRoot,
    }),
    options,
  );

  if (options.json) {
    console.log(JSON.stringify({ summary: summarize(records), worktrees: records }, null, 2));
    return;
  }

  if (options.summaryOnly) {
    printSummary(summarize(records));
    printActionSummary(records);
    return;
  }

  printTable(records);
  printActionSummary(records);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  main();
}
