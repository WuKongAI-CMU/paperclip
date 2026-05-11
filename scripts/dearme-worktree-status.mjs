#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 0;
const DEFAULT_SYMPHONY_ROOT = "/private/tmp/dearme-symphony-workspaces";
const DEFAULT_SYMPHONY_HANDOFF_ROOT = join(DEFAULT_SYMPHONY_ROOT, "_handoffs");
const DEFAULT_REVIEWED_ABSORPTION_LEDGER = "docs/dearme/WORKTREE-ABSORPTION-LEDGER.json";
const WORKTREE_STATUSES = new Set([
  "current",
  "in_current",
  "patch_equivalent",
  "reviewed_absorbed",
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
  const pathMatch = matchTicket(path);
  const branchMatch = matchTicket(branch);
  const match =
    /dearme-symphony-workspaces|symphony/i.test(path) && pathMatch ? pathMatch : (branchMatch ?? pathMatch);
  if (!match?.groups) return null;
  return `${match.groups.prefix.toUpperCase()}-${match.groups.number.toUpperCase()}`;
}

function matchTicket(value) {
  return value.match(
    /(?:^|[-_/\s])(?<prefix>dm|dea)[-_]?(?<number>\d{1,4}[a-z]?)(?:[-_/\s]|$)/i,
  );
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

  if (status === "reviewed_absorbed") {
    return "reviewed as already absorbed in current head; close only after owner confirmation, do not replay";
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

function shortSha(value) {
  return typeof value === "string" && value.length > 12 ? value.slice(0, 12) : value;
}

function handoffIssueFromName(name) {
  const match = matchTicket(name);
  if (!match?.groups) return null;
  return `${match.groups.prefix.toUpperCase()}-${match.groups.number.toUpperCase()}`;
}

function collectCurrentSubjects(currentHead, repoRoot) {
  return new Set(runGit(["log", "--format=%s", currentHead], repoRoot).split("\n").filter(Boolean));
}

export function loadReviewedAbsorptions(
  repoRoot = process.cwd(),
  ledgerPath = DEFAULT_REVIEWED_ABSORPTION_LEDGER,
) {
  const fullPath = join(repoRoot, ledgerPath);
  if (!existsSync(fullPath)) return [];

  const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.reviewedAbsorptions)) return parsed.reviewedAbsorptions;
  return [];
}

function matchesReviewedAbsorption(record, absorption) {
  if (!absorption?.branch || absorption.branch !== record.branch) return false;
  if (!record.head) return false;
  if (absorption.head && record.head === absorption.head) return true;
  if (absorption.headPrefix && record.head.startsWith(absorption.headPrefix)) return true;
  return false;
}

export function markReviewedAbsorption(record, reviewedAbsorptions = []) {
  if (record.status !== "not_in_current") return record;

  const reviewedAbsorption = reviewedAbsorptions.find((absorption) =>
    matchesReviewedAbsorption(record, absorption),
  );
  if (!reviewedAbsorption) return record;

  return {
    ...record,
    status: "reviewed_absorbed",
    reviewedAbsorption: {
      ticket: reviewedAbsorption.ticket ?? deriveWorktreeTicket(record),
      reviewedAt: reviewedAbsorption.reviewedAt ?? null,
      reason: reviewedAbsorption.reason ?? "",
      evidence: reviewedAbsorption.evidence ?? [],
    },
  };
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

export function enrichWorktreeRecord(record, reviewedAbsorptions = []) {
  const reviewedRecord = markReviewedAbsorption(record, reviewedAbsorptions);
  const ticket = deriveWorktreeTicket(record);
  const purpose = classifyWorktreePurpose(reviewedRecord);

  return {
    ...reviewedRecord,
    ticket,
    purpose,
    nextAction: recommendWorktreeAction({ ...reviewedRecord, purpose }),
  };
}

export function listSymphonyWorkspacePaths(root = DEFAULT_SYMPHONY_ROOT) {
  if (!existsSync(root)) return [];

  const paths = new Set();

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const workspacePath = join(root, entry.name);
    const candidates = [workspacePath, join(workspacePath, "repo")];

    for (const candidate of candidates) {
      if (existsSync(join(candidate, ".git"))) {
        paths.add(candidate);
      }
    }
  }

  return [...paths].sort();
}

export function collectSymphonyHandoffs({
  handoffRoot = DEFAULT_SYMPHONY_HANDOFF_ROOT,
} = {}) {
  if (!existsSync(handoffRoot)) return [];

  return readdirSync(handoffRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const summaryPath = join(handoffRoot, entry.name);
      const stat = statSync(summaryPath);
      const base = {
        issue: handoffIssueFromName(entry.name),
        summaryPath,
        updatedAt: stat.mtime.toISOString(),
        updatedAtMs: stat.mtimeMs,
      };

      try {
        const parsed = JSON.parse(readFileSync(summaryPath, "utf8"));
        const status = Array.isArray(parsed.status) ? parsed.status : [];
        const changedFiles = Array.isArray(parsed.changedFiles) && parsed.changedFiles.length > 0
          ? parsed.changedFiles
          : changedFilesFromStatus(status);
        return {
          ...base,
          mode: parsed.mode ?? "unknown",
          issue: parsed.issue ?? base.issue,
          workspace: parsed.workspace ?? null,
          baseHead: parsed.baseHead ?? null,
          head: parsed.head ?? null,
          commits: Array.isArray(parsed.commits) ? parsed.commits : [],
          changedFiles,
          status,
          patchPath: parsed.patchPath ?? null,
          bundlePath: parsed.bundlePath ?? null,
        };
      } catch (error) {
        return {
          ...base,
          mode: "unreadable_summary",
          workspace: null,
          baseHead: null,
          head: null,
          commits: [],
          changedFiles: [],
          patchPath: null,
          bundlePath: null,
          readError: error instanceof Error ? error.message : String(error),
        };
      }
    })
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs || a.summaryPath.localeCompare(b.summaryPath));
}

function changedFilesFromStatus(status) {
  return [
    ...new Set(
      status
        .map(changedFileFromStatusLine)
        .filter(Boolean),
    ),
  ];
}

function changedFileFromStatusLine(line) {
  const match = line.match(/^[ MADRCU?!]{1,2}\s+(.+)$/);
  const file = (match?.[1] ?? line).trim();
  const renameTarget = file.split(" -> ").pop()?.trim();
  return renameTarget || file;
}

function formatChangedFiles(changedFiles = []) {
  if (changedFiles.length === 0) return "";
  const visible = changedFiles.slice(0, 3).join(",");
  const remaining = changedFiles.length > 3 ? `,+${changedFiles.length - 3} more` : "";
  return ` changes=${visible}${remaining}`;
}

export function formatSymphonyHandoffSummaryLine(issue, handoff) {
  const changedFiles = Array.isArray(handoff.changedFiles) ? handoff.changedFiles : [];
  return [
    `- ${issue}: ${handoff.mode}`,
    `head=${shortSha(handoff.head) ?? "-"}`,
    `files=${changedFiles.length}${formatChangedFiles(changedFiles)}`,
    `updated=${handoff.updatedAt}`,
    `patch=${handoff.patchPath ?? "-"}`,
  ].join(" ");
}

export function filterSymphonyHandoffs(handoffs, options) {
  if (!options?.tickets || options.tickets.size === 0) return handoffs;
  return handoffs.filter((handoff) => handoff.issue && options.tickets.has(handoff.issue));
}

export function summarizeSymphonyHandoffs(handoffs) {
  const latestByIssue = {};
  const summary = {
    total: 0,
    byMode: {},
    historicalByMode: {},
    latestByMode: {},
    latestByIssue,
  };

  for (const handoff of handoffs) {
    summary.total += 1;
    summary.byMode[handoff.mode] = (summary.byMode[handoff.mode] ?? 0) + 1;

    if (handoff.mode === "unreadable_summary") {
      continue;
    }

    if (handoff.issue && !latestByIssue[handoff.issue]) {
      latestByIssue[handoff.issue] = {
        mode: handoff.mode,
        head: handoff.head,
        baseHead: handoff.baseHead,
        commits: handoff.commits,
        changedFiles: handoff.changedFiles,
        patchPath: handoff.patchPath,
        bundlePath: handoff.bundlePath,
        summaryPath: handoff.summaryPath,
        updatedAt: handoff.updatedAt,
      };
    }
  }

  for (const handoff of Object.values(latestByIssue)) {
    summary.latestByMode[handoff.mode] = (summary.latestByMode[handoff.mode] ?? 0) + 1;
  }

  const latestSummaryPaths = new Set(
    Object.values(latestByIssue)
      .map((handoff) => handoff.summaryPath)
      .filter(Boolean),
  );
  for (const handoff of handoffs) {
    if (handoff.mode === "unreadable_summary") continue;
    if (handoff.summaryPath && latestSummaryPaths.has(handoff.summaryPath)) continue;
    summary.historicalByMode[handoff.mode] = (summary.historicalByMode[handoff.mode] ?? 0) + 1;
  }

  return summary;
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
  reviewedAbsorptions,
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
      reviewedAbsorptions,
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
  const reviewedAbsorptions = loadReviewedAbsorptions(repoRoot);
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
      reviewedAbsorptions,
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
    reviewedAbsorptions,
  }).filter((record) => !seen.has(record.path));

  return [...records, ...symphonyRecords];
}

export function parseArgs(argv) {
  const options = {
    json: false,
    summaryJson: false,
    summaryOnly: false,
    skipDirty: false,
    dirtyOnly: false,
    statuses: new Set(),
    tickets: new Set(),
    limit: DEFAULT_LIMIT,
    includeSymphony: true,
    symphonyRoot: DEFAULT_SYMPHONY_ROOT,
    includeHandoffs: false,
    handoffRoot: null,
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

    if (arg === "--summary-json") {
      options.summaryJson = true;
      options.summaryOnly = true;
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

    if (arg === "--handoffs") {
      options.includeHandoffs = true;
      options.summaryOnly = true;
      continue;
    }

    if (arg === "--handoff-root") {
      i += 1;
      if (!argv[i]) throw new Error("--handoff-root requires a value");
      options.handoffRoot = argv[i];
      continue;
    }

    if (arg.startsWith("--handoff-root=")) {
      options.handoffRoot = arg.slice("--handoff-root=".length);
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
    `${"status".padEnd(18)} ${"dirty".padStart(5)} ${"ticket".padEnd(8)} ${"purpose".padEnd(11)} ${"branch".padEnd(54)} path`,
  );
  console.log(
    `${"-".repeat(18)} ${"-".repeat(5)} ${"-".repeat(8)} ${"-".repeat(11)} ${"-".repeat(54)} ${"-".repeat(20)}`,
  );

  for (const record of rows) {
    const dirty = record.dirtyFiles === null ? "-" : String(record.dirtyFiles);
    const ticket = record.ticket ?? "-";
    const branch = record.branch.length > 54 ? `${record.branch.slice(0, 51)}...` : record.branch;
    console.log(
      `${record.status.padEnd(18)} ${dirty.padStart(5)} ${ticket.padEnd(8)} ${record.purpose.padEnd(11)} ${branch.padEnd(54)} ${record.path}`,
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
      `reviewed_absorbed: ${summary.reviewed_absorbed ?? 0}`,
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

function printHandoffSummary(summary) {
  console.log("");
  console.log(
    [
      `Symphony handoffs: ${summary.total}`,
      `committed_patch: ${summary.byMode.committed_patch ?? 0}`,
      `dirty_patch_handoff: ${summary.byMode.dirty_patch_handoff ?? 0}`,
      `no_file_changes: ${summary.byMode.no_file_changes ?? 0}`,
      `unreadable_summary: ${summary.byMode.unreadable_summary ?? 0}`,
    ].join(" | "),
  );

  console.log(
    [
      `Latest handoffs by issue: ${Object.keys(summary.latestByIssue).length}`,
      `committed_patch: ${summary.latestByMode.committed_patch ?? 0}`,
      `dirty_patch_handoff: ${summary.latestByMode.dirty_patch_handoff ?? 0}`,
      `no_file_changes: ${summary.latestByMode.no_file_changes ?? 0}`,
    ].join(" | "),
  );

  const historicalTotal = Object.values(summary.historicalByMode).reduce(
    (total, count) => total + count,
    0,
  );
  if (historicalTotal > 0) {
    console.log(
      [
        `Historical non-latest handoffs: ${historicalTotal}`,
        `committed_patch: ${summary.historicalByMode.committed_patch ?? 0}`,
        `dirty_patch_handoff: ${summary.historicalByMode.dirty_patch_handoff ?? 0}`,
        `no_file_changes: ${summary.historicalByMode.no_file_changes ?? 0}`,
      ].join(" | "),
    );
  }

  const latest = Object.entries(summary.latestByIssue).sort(([a], [b]) => a.localeCompare(b));
  if (latest.length === 0) return;

  console.log("Latest Symphony handoffs:");
  for (const [issue, handoff] of latest) {
    console.log(formatSymphonyHandoffSummaryLine(issue, handoff));
  }
}

function compactWorktreeSummary(summary) {
  return {
    total: summary.total,
    dirty: summary.dirty,
    current: summary.current ?? 0,
    in_current: summary.in_current ?? 0,
    patch_equivalent: summary.patch_equivalent ?? 0,
    reviewed_absorbed: summary.reviewed_absorbed ?? 0,
    not_in_current: summary.not_in_current ?? 0,
    subject_matched: summary.subject_matched ?? 0,
    detached: summary.detached ?? 0,
    prunable: summary.prunable ?? 0,
    byPurpose: summary.byPurpose,
  };
}

function compactHandoffSummary(summary) {
  return {
    total: summary.total,
    byMode: summary.byMode,
    historicalByMode: summary.historicalByMode,
    latestByMode: summary.latestByMode,
    latestIssueCount: Object.keys(summary.latestByIssue).length,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const handoffRoot = options.handoffRoot ?? join(options.symphonyRoot, "_handoffs");
  const records = filterWorktreeRecords(
    collectWorktreeStatus({
      skipDirty: options.skipDirty,
      includeSymphony: options.includeSymphony,
      symphonyRoot: options.symphonyRoot,
    }),
    options,
  );
  const handoffs = options.includeHandoffs
    ? filterSymphonyHandoffs(collectSymphonyHandoffs({ handoffRoot }), options)
    : [];
  const summary = summarize(records);
  const handoffSummary = options.includeHandoffs
    ? summarizeSymphonyHandoffs(handoffs)
    : null;

  if (options.summaryJson) {
    console.log(JSON.stringify({
      summary: compactWorktreeSummary(summary),
      ...(handoffSummary ? { handoffSummary: compactHandoffSummary(handoffSummary) } : {}),
    }, null, 2));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({
      summary,
      worktrees: records,
      ...(options.includeHandoffs
        ? {
            handoffSummary,
            handoffs,
          }
        : {}),
    }, null, 2));
    return;
  }

  if (options.summaryOnly) {
    printSummary(summary);
    printActionSummary(records);
    if (handoffSummary) {
      printHandoffSummary(handoffSummary);
    }
    return;
  }

  printTable(records);
  printActionSummary(records);
  if (options.includeHandoffs) {
    printHandoffSummary(summarizeSymphonyHandoffs(handoffs));
  }
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  main();
}
