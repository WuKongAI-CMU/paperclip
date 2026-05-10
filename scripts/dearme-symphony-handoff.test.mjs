import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createSymphonyHandoff } from "./dearme-symphony-handoff.mjs";

const SCRIPT = resolve("scripts/dearme-symphony-handoff.mjs");

function git(repo, args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function commit(repo, message) {
  git(repo, ["add", "."]);
  git(repo, [
    "-c",
    "user.name=DearMe Test",
    "-c",
    "user.email=dearme-test@example.com",
    "commit",
    "-q",
    "-m",
    message,
  ]);
}

function makeRepo() {
  const repo = mkdtempSync(join(tmpdir(), "dearme-symphony-handoff-"));
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, "README.md"), "# Test\n");
  commit(repo, "init");
  const baseHead = git(repo, ["rev-parse", "HEAD"]);
  writeFileSync(join(repo, ".git", "dearme-symphony-base-head"), `${baseHead}\n`);
  return { repo, baseHead };
}

function makeOutputRoot() {
  return mkdtempSync(join(tmpdir(), "dearme-symphony-handoff-artifacts-"));
}

function cleanup(...paths) {
  for (const path of paths) {
    rmSync(path, { recursive: true, force: true });
  }
}

test("reports no file changes when the worker head equals the base marker", () => {
  const { repo, baseHead } = makeRepo();
  const outputRoot = makeOutputRoot();
  try {
    const result = createSymphonyHandoff({
      workspace: repo,
      issue: "DEA-23",
      outputRoot,
    });

    assert.equal(result.mode, "no_file_changes");
    assert.equal(result.baseHead, baseHead);
    assert.equal(result.head, baseHead);

    const cli = execFileSync(process.execPath, [
      SCRIPT,
      "--issue",
      "DEA-23",
      "--output-root",
      outputRoot,
      repo,
    ], { encoding: "utf8" });
    assert.match(cli, /DearMe Symphony handoff: NO_FILE_CHANGES/);
    assert.match(cli, /No file changes/);
  } finally {
    cleanup(repo, outputRoot);
  }
});

test("writes patch, bundle, and summary artifacts for committed worker changes", () => {
  const { repo, baseHead } = makeRepo();
  const outputRoot = makeOutputRoot();
  try {
    writeFileSync(join(repo, "README.md"), "# Test\n\nCommitted handoff\n");
    commit(repo, "worker change");
    const head = git(repo, ["rev-parse", "HEAD"]);

    const result = createSymphonyHandoff({
      workspace: repo,
      issue: "DEA-23",
      outputRoot,
    });

    assert.equal(result.mode, "committed_patch");
    assert.equal(result.baseHead, baseHead);
    assert.equal(result.head, head);
    assert.ok(existsSync(result.patchPath));
    assert.ok(existsSync(result.bundlePath));
    assert.ok(existsSync(result.summaryPath));
    assert.deepEqual(result.changedFiles, ["README.md"]);
    assert.match(readFileSync(result.patchPath, "utf8"), /Committed handoff/);

    const summary = JSON.parse(readFileSync(result.summaryPath, "utf8"));
    assert.equal(summary.mode, "committed_patch");
    assert.deepEqual(summary.changedFiles, ["README.md"]);
  } finally {
    cleanup(repo, outputRoot);
  }
});

test("writes a dirty patch handoff and exits nonzero for uncommitted work", () => {
  const { repo, baseHead } = makeRepo();
  const outputRoot = makeOutputRoot();
  try {
    writeFileSync(join(repo, "README.md"), "# Test\n\nDirty handoff\n");

    const result = createSymphonyHandoff({
      workspace: repo,
      issue: "DEA-23",
      outputRoot,
    });

    assert.equal(result.mode, "dirty_patch_handoff");
    assert.equal(result.baseHead, baseHead);
    assert.ok(existsSync(result.patchPath));
    assert.match(readFileSync(result.patchPath, "utf8"), /Dirty handoff/);

    const cli = spawnSync(process.execPath, [
      SCRIPT,
      "--issue",
      "DEA-23",
      "--output-root",
      outputRoot,
      repo,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.equal(cli.status, 2);
    assert.match(cli.stdout, /DearMe Symphony handoff: DIRTY_PATCH_HANDOFF/);
  } finally {
    cleanup(repo, outputRoot);
  }
});

test("fails when the base marker is missing", () => {
  const { repo } = makeRepo();
  const outputRoot = makeOutputRoot();
  try {
    rmSync(join(repo, ".git", "dearme-symphony-base-head"));

    assert.throws(
      () =>
        createSymphonyHandoff({
          workspace: repo,
          issue: "DEA-23",
          outputRoot,
        }),
      /missing Symphony base head marker/,
    );
  } finally {
    cleanup(repo, outputRoot);
  }
});
