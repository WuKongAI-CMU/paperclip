#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HANDOFF_ROOT =
  process.env.DEARME_SYMPHONY_HANDOFF_ROOT ??
  "/private/tmp/dearme-symphony-workspaces/_handoffs";
const BASE_MARKER = "dearme-symphony-base-head";

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error: result.error,
  };
}

function gitOrThrow(args, cwd) {
  const result = runGit(args, cwd);
  if (result.status === 0) return result.stdout;

  const detail = [result.stderr, result.stdout, result.error?.message]
    .filter(Boolean)
    .join("\n");
  throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
}

function resolveGitWorkspace(workspace) {
  const cwd = resolve(workspace);
  const inside = gitOrThrow(["rev-parse", "--is-inside-work-tree"], cwd);
  if (inside !== "true") {
    throw new Error(`not inside a Git work tree: ${cwd}`);
  }

  const root = gitOrThrow(["rev-parse", "--show-toplevel"], cwd);
  const gitDirRaw = gitOrThrow(["rev-parse", "--git-dir"], cwd);
  const gitDir = isAbsolute(gitDirRaw) ? gitDirRaw : resolve(root, gitDirRaw);

  return { cwd, root, gitDir };
}

function sanitizeName(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "issue";
}

function shortSha(value) {
  return value.slice(0, 12);
}

function readBaseHead(resolved, explicitBase) {
  if (explicitBase) return explicitBase;
  if (process.env.DEARME_SYMPHONY_BASE_HEAD) {
    return process.env.DEARME_SYMPHONY_BASE_HEAD;
  }

  const marker = join(resolved.gitDir, BASE_MARKER);
  if (!existsSync(marker)) return null;
  return readFileSync(marker, "utf8").trim() || null;
}

function getStatus(root) {
  const output = gitOrThrow(["status", "--porcelain=v1"], root);
  return output ? output.split("\n") : [];
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createArtifactPrefix(issue, baseHead, head) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const parts = [sanitizeName(issue)];
  if (baseHead) parts.push(`${shortSha(baseHead)}..${shortSha(head)}`);
  else parts.push(shortSha(head));
  parts.push(timestamp);
  return parts.join("-");
}

function writeCommittedArtifacts({ root, outputRoot, issue, baseHead, head }) {
  const prefix = createArtifactPrefix(issue, baseHead, head);
  const patchPath = join(outputRoot, `${prefix}.patch`);
  const bundlePath = join(outputRoot, `${prefix}.bundle`);
  const summaryPath = join(outputRoot, `${prefix}.json`);

  const patch = gitOrThrow(["format-patch", "--stdout", `${baseHead}..HEAD`], root);
  writeFileSync(patchPath, `${patch}\n`);
  gitOrThrow(["bundle", "create", bundlePath, `${baseHead}..HEAD`], root);

  const changedFiles =
    gitOrThrow(["diff", "--name-only", `${baseHead}..HEAD`], root)
      .split("\n")
      .filter(Boolean);
  const commits =
    gitOrThrow(["log", "--oneline", `${baseHead}..HEAD`], root)
      .split("\n")
      .filter(Boolean);

  const summary = {
    mode: "committed_patch",
    issue,
    workspace: realpathSync(root),
    baseHead,
    head,
    commits,
    changedFiles,
    patchPath,
    bundlePath,
  };
  writeJson(summaryPath, summary);

  return { ...summary, summaryPath };
}

function writeDirtyArtifacts({ root, outputRoot, issue, baseHead, head, status }) {
  const prefix = `${createArtifactPrefix(issue, baseHead, head)}-dirty`;
  const patchPath = join(outputRoot, `${prefix}.patch`);
  const summaryPath = join(outputRoot, `${prefix}.json`);
  const patch = gitOrThrow(["diff", "--binary", "HEAD", "--"], root);
  writeFileSync(patchPath, `${patch}\n`);

  const untracked = status
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3));
  const summary = {
    mode: "dirty_patch_handoff",
    issue,
    workspace: realpathSync(root),
    baseHead,
    head,
    status,
    untracked,
    patchPath,
    note:
      untracked.length > 0
        ? "Patch excludes untracked file contents; copy the listed files before cleaning the workspace."
        : "Patch contains tracked staged and unstaged changes against HEAD.",
  };
  writeJson(summaryPath, summary);

  return { ...summary, summaryPath };
}

export function createSymphonyHandoff({
  workspace = process.cwd(),
  issue = process.env.DEARME_SYMPHONY_ISSUE ?? "UNKNOWN",
  baseHead,
  outputRoot = DEFAULT_HANDOFF_ROOT,
} = {}) {
  const resolved = resolveGitWorkspace(workspace);
  const root = resolved.root;
  const head = gitOrThrow(["rev-parse", "HEAD"], root);
  const branch = gitOrThrow(["status", "--short", "--branch"], root)
    .split("\n")[0]
    ?.trim();
  const base = readBaseHead(resolved, baseHead);
  const status = getStatus(root);

  if (!base) {
    throw new Error(
      `missing Symphony base head marker; expected ${join(
        resolved.gitDir,
        BASE_MARKER,
      )} or pass --base <sha>`,
    );
  }

  mkdirSync(outputRoot, { recursive: true });

  if (status.length > 0) {
    return {
      ...writeDirtyArtifacts({ root, outputRoot, issue, baseHead: base, head, status }),
      branch,
    };
  }

  if (base === head) {
    return {
      mode: "no_file_changes",
      issue,
      workspace: realpathSync(root),
      baseHead: base,
      head,
      branch,
      status,
    };
  }

  return {
    ...writeCommittedArtifacts({ root, outputRoot, issue, baseHead: base, head }),
    branch,
  };
}

export function parseArgs(argv) {
  const args = [...argv];
  if (args[0] === "--") args.shift();
  if (args.includes("-h") || args.includes("--help")) {
    return { help: true };
  }

  const parsed = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--issue") {
      parsed.issue = args[++i];
    } else if (arg === "--base") {
      parsed.baseHead = args[++i];
    } else if (arg === "--output-root") {
      parsed.outputRoot = args[++i];
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    throw new Error(
      "Usage: dearme-symphony-handoff [--issue DEA-123] [--base SHA] [--output-root DIR] [workspace]",
    );
  }

  return { ...parsed, workspace: positional[0] ?? process.cwd() };
}

function printHelp() {
  console.log(`Usage: dearme-symphony-handoff [options] [workspace]

Options:
  --issue DEA-123        Linear issue identifier for artifact names.
  --base SHA            Base coordinator head. Defaults to the worker marker.
  --output-root DIR     Durable artifact root.

Writes Symphony terminal handoff artifacts outside the per-ticket worker
workspace. Clean local worker commits become format-patch and git-bundle files;
dirty work becomes a blocker patch summary.`);
}

function printResult(result) {
  if (result.mode === "no_file_changes") {
    console.log("DearMe Symphony handoff: NO_FILE_CHANGES");
    console.log("No file changes");
  } else if (result.mode === "committed_patch") {
    console.log("DearMe Symphony handoff: COMMITTED_PATCH");
    console.log(`Patch: ${result.patchPath}`);
    console.log(`Bundle: ${result.bundlePath}`);
    console.log(`Summary: ${result.summaryPath}`);
  } else {
    console.log("DearMe Symphony handoff: DIRTY_PATCH_HANDOFF");
    console.log(`Patch: ${result.patchPath}`);
    console.log(`Summary: ${result.summaryPath}`);
    if (result.untracked.length > 0) {
      console.log(`Untracked files: ${result.untracked.join(", ")}`);
    }
  }

  console.log(`Workspace: ${result.workspace}`);
  console.log(`Issue: ${result.issue}`);
  console.log(`Branch: ${result.branch ?? "(unknown)"}`);
  console.log(`Base: ${result.baseHead}`);
  console.log(`HEAD: ${result.head}`);
  if (result.changedFiles?.length) {
    console.log(`Files: ${result.changedFiles.join(", ")}`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const result = createSymphonyHandoff(args);
    printResult(result);
    if (result.mode === "dirty_patch_handoff") {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(`DearMe Symphony handoff failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  main();
}
