#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function resolveGitDir(workspace) {
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

function writeProbe(gitDir) {
  const probePath = join(
    gitDir,
    `.dearme-symphony-write-probe-${process.pid}-${Date.now()}`,
  );

  try {
    writeFileSync(probePath, "ok\n", { flag: "wx" });
  } finally {
    try {
      unlinkSync(probePath);
    } catch {
      // If creation failed there is nothing to remove; the caller will report
      // the original write error.
    }
  }
}

export function runGitPreflight(workspace = process.cwd()) {
  const resolved = resolveGitDir(workspace);
  const indexLock = join(resolved.gitDir, "index.lock");

  if (existsSync(indexLock)) {
    throw new Error(
      `Git index lock exists at ${indexLock}; remove the stale lock or stop the competing Git process before implementation.`,
    );
  }

  const refresh = runGit(["update-index", "--refresh", "--"], resolved.root);
  if (refresh.status !== 0) {
    const detail = [refresh.stderr, refresh.stdout, refresh.error?.message]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `git update-index --refresh failed in ${resolved.root}${detail ? `:\n${detail}` : ""}`,
    );
  }

  try {
    writeProbe(resolved.gitDir);
  } catch (error) {
    throw new Error(
      `Git metadata is not writable at ${resolved.gitDir}: ${error.message}`,
    );
  }

  const head = gitOrThrow(["log", "-1", "--oneline"], resolved.root);
  const branch = gitOrThrow(["status", "--short", "--branch"], resolved.root)
    .split("\n")[0]
    ?.trim();

  return { ...resolved, head, branch };
}

export function parseArgs(argv) {
  const args = [...argv];
  if (args[0] === "--") args.shift();
  if (args.includes("-h") || args.includes("--help")) {
    return { help: true };
  }

  if (args.length > 1) {
    throw new Error("Usage: dearme-symphony-git-preflight [workspace]");
  }

  return { workspace: args[0] ?? process.cwd() };
}

function printHelp() {
  console.log(`Usage: dearme-symphony-git-preflight [workspace]

Verifies that a Symphony worker workspace is ready to create commits before
implementation starts. The preflight checks for a stale Git index lock, refreshes
the index, and writes a temporary probe file under the Git metadata directory.`);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const result = runGitPreflight(args.workspace);
    console.log(`DearMe Symphony git preflight passed: ${result.root}`);
    console.log(`Git dir writable: ${result.gitDir}`);
    console.log(`HEAD: ${result.head}`);
    console.log(`Branch: ${result.branch}`);
  } catch (error) {
    console.error(`DearMe Symphony git preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  main();
}
