import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  runGitPreflight,
  resolveGitDir,
} from "./dearme-symphony-git-preflight.mjs";

const SCRIPT = resolve("scripts/dearme-symphony-git-preflight.mjs");

function git(repo, args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeRepo() {
  const repo = mkdtempSync(join(tmpdir(), "dearme-symphony-git-preflight-"));
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, "README.md"), "# Test\n");
  git(repo, ["add", "README.md"]);
  git(repo, [
    "-c",
    "user.name=DearMe Test",
    "-c",
    "user.email=dearme-test@example.com",
    "commit",
    "-q",
    "-m",
    "init",
  ]);
  return repo;
}

function cleanup(repo) {
  rmSync(repo, { recursive: true, force: true });
}

test("passes for a clean writable git repository", () => {
  const repo = makeRepo();
  try {
    const result = runGitPreflight(repo);
    assert.equal(result.root, realpathSync(repo));
    assert.match(result.gitDir, /\.git$/);
    assert.match(result.head, /init$/);

    const cli = execFileSync(process.execPath, [SCRIPT, repo], {
      encoding: "utf8",
    });
    assert.match(cli, /DearMe Symphony git preflight passed/);
    assert.match(cli, /Git dir writable/);
  } finally {
    cleanup(repo);
  }
});

test("fails early when the git index lock exists", () => {
  const repo = makeRepo();
  try {
    const { gitDir } = resolveGitDir(repo);
    writeFileSync(join(gitDir, "index.lock"), "locked\n");

    assert.throws(() => runGitPreflight(repo), /Git index lock exists/);

    const cli = spawnSync(process.execPath, [SCRIPT, repo], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(cli.status, 1);
    assert.match(cli.stderr, /Git index lock exists/);
  } finally {
    cleanup(repo);
  }
});

test("fails before implementation when tracked files are already dirty", () => {
  const repo = makeRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Dirty\n");

    assert.throws(
      () => runGitPreflight(repo),
      /git update-index --refresh failed/,
    );
  } finally {
    cleanup(repo);
  }
});

test("fails outside a git work tree", () => {
  const dir = mkdtempSync(join(tmpdir(), "dearme-symphony-git-preflight-empty-"));
  try {
    mkdirSync(join(dir, "nested"));
    assert.throws(() => runGitPreflight(join(dir, "nested")), /git rev-parse/);
  } finally {
    cleanup(dir);
  }
});
