import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const WORKFLOW = resolve(".symphony/WORKFLOW.md");
const README = resolve(".symphony/README.md");

function assertOrdered(text, needles) {
  let previousIndex = -1;
  for (const needle of needles) {
    const index = text.indexOf(needle);
    assert.notEqual(index, -1, `missing ${needle}`);
    assert.ok(index > previousIndex, `${needle} should appear after previous command`);
    previousIndex = index;
  }
}

test("DearMe Symphony bootstrap exposes proof readiness before worktree triage", () => {
  const workflow = readFileSync(WORKFLOW, "utf8");

  assertOrdered(workflow, [
    "pnpm dearme:symphony-preflight -- .",
    "pnpm --silent dearme:proof -- --check",
    "pnpm dearme:worktrees -- --summary-only --skip-dirty --handoffs",
  ]);
  assert.match(workflow, /Proof readiness guard:/);
  assert.match(workflow, /first\s+proof map/);
  assert.match(workflow, /dearme:provider-smoke/);
  assert.match(workflow, /dearme:voice-smoke/);
});

test("DearMe Symphony README documents the unified proof readiness lane", () => {
  const readme = readFileSync(README, "utf8");

  assert.match(readme, /Worker Proof Readiness/);
  assert.match(readme, /pnpm --silent dearme:proof -- --check/);
  assert.match(readme, /without sending, deploying to\s+production, spending, or calling a live model/);
  assert.match(readme, /pnpm dearme:provider-smoke/);
  assert.match(readme, /pnpm dearme:voice-smoke/);
});
