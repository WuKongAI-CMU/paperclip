import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyDearMeDependencyUpdate,
  formatDearMeDependencyLoopAudit,
  formatDearMeDependencyReviewHumanHelp,
  parseDearMeDependencyLoopAuditArgs,
  parseOutdatedJson,
  summarizeDearMeDependencyLoopAudit,
} from "./dearme-dependency-loop-audit.ts";

test("classifies patch and safe minor updates as autonomous", () => {
  assert.deepEqual(
    classifyDearMeDependencyUpdate("sharp", {
      current: "1.2.3",
      latest: "1.2.4",
      dependencyType: "devDependencies",
    }),
    {
      name: "sharp",
      current: "1.2.3",
      latest: "1.2.4",
      wanted: undefined,
      dependencyType: "devDependencies",
      kind: "patch",
      decision: "autonomous",
      reason: "Patch dependency update is eligible for the autonomous dependency-bump loop.",
    },
  );

  assert.equal(
    classifyDearMeDependencyUpdate("lighthouse", {
      current: "13.3.0",
      latest: "13.4.0",
    }).decision,
    "autonomous",
  );
});

test("classifies majors and zero-major minors as review-required", () => {
  const audit = summarizeDearMeDependencyLoopAudit({
    typescript: {
      current: "5.9.3",
      latest: "6.0.3",
      wanted: "5.9.3",
      dependencyType: "devDependencies",
    },
    esbuild: {
      current: "0.27.3",
      latest: "0.28.0",
      wanted: "0.27.3",
      dependencyType: "devDependencies",
    },
  });

  assert.equal(audit.complete, true);
  assert.deepEqual(audit.autonomousUpdates, []);
  assert.deepEqual(audit.reviewRequiredUpdates.map((update) => [
    update.name,
    update.kind,
    update.decision,
  ]), [
    ["esbuild", "minor", "review-required"],
    ["typescript", "major", "review-required"],
  ]);
  assert.match(formatDearMeDependencyLoopAudit(audit).join("\n"), /Only review-required dependency updates/);
});

test("classifies prerelease updates as review-required", () => {
  assert.deepEqual(
    classifyDearMeDependencyUpdate("typescript", {
      current: "5.9.3",
      latest: "6.0.0-beta.1",
    }),
    {
      name: "typescript",
      current: "5.9.3",
      latest: "6.0.0-beta.1",
      wanted: undefined,
      dependencyType: undefined,
      kind: "unknown",
      decision: "review-required",
      reason: "Non-semver or prerelease dependency update requires human review.",
    },
  );
});

test("reports actionable autonomous updates first", () => {
  const audit = summarizeDearMeDependencyLoopAudit({
    vitest: {
      current: "3.2.4",
      latest: "4.1.6",
    },
    sharp: {
      current: "0.34.5",
      latest: "0.34.6",
    },
  });

  assert.equal(audit.complete, false);
  assert.deepEqual(audit.autonomousUpdates.map((update) => update.name), ["sharp"]);
  assert.equal(audit.nextAction.label, "Bump sharp");
});

test("parses command arguments and outdated JSON", () => {
  assert.deepEqual(
    parseDearMeDependencyLoopAuditArgs([
      "--check",
      "--json",
      "--human-help-markdown",
      "--outdated-json",
      "outdated.json",
    ]),
    {
      help: false,
      json: true,
      check: true,
      humanHelpMarkdown: true,
      outdatedJsonPath: "outdated.json",
    },
  );
  assert.deepEqual(parseOutdatedJson('{"tsx":{"current":"4.22.0","latest":"4.22.1"}}'), {
    tsx: {
      current: "4.22.0",
      latest: "4.22.1",
    },
  });
});

test("generates a Peter-facing dependency review support request", () => {
  const audit = summarizeDearMeDependencyLoopAudit({
    typescript: {
      current: "5.9.3",
      latest: "6.0.3",
      dependencyType: "devDependencies",
    },
    esbuild: {
      current: "0.27.3",
      latest: "0.28.0",
      dependencyType: "devDependencies",
    },
  });
  const markdown = formatDearMeDependencyReviewHumanHelp(audit, { date: "2026-05-18" }).join("\n");

  assert.match(markdown, /^### 2026-05-18 - Dependency review queue/);
  assert.match(markdown, /Dependency upgrades approved:/);
  assert.match(markdown, /Dependency upgrades defer:/);
  assert.match(markdown, /esbuild: 0\.27\.3 -> 0\.28\.0 \(minor\)/);
  assert.match(markdown, /typescript: 5\.9\.3 -> 6\.0\.3 \(major\)/);
  assert.match(markdown, /Review-required updates: 2/);
  assert.match(markdown, /pnpm --silent dearme:dependency-loop-audit -- --human-help-markdown/);
  assert.match(markdown, /pnpm --silent test:dearme-dependency-loop-audit/);
  assert.match(markdown, /pnpm --silent typecheck/);
  assert.match(markdown, /No credentials, live network calls, sends, deploys, or spending/);
});

test("dependency review support markdown uses the DearMe operating day", () => {
  const audit = summarizeDearMeDependencyLoopAudit({});
  const markdown = formatDearMeDependencyReviewHumanHelp(audit, {
    now: new Date("2026-05-19T03:30:00.000Z"),
  }).join("\n");

  assert.match(markdown, /^### 2026-05-18 - Dependency review queue/);
});

test("DearMe human support queue includes the dependency review request", async () => {
  const help = await readFile(
    new URL("../docs/NEEDS_HUMAN_HELP.md", import.meta.url),
    "utf8",
  );

  assert.match(help, /Dependency review queue/);
  assert.match(help, /Dependency upgrades approved:/);
  assert.match(help, /Dependency upgrades defer:/);
  assert.match(help, /pnpm --silent dearme:dependency-loop-audit -- --human-help-markdown/);
  assert.match(help, /pnpm --silent test:dearme-dependency-loop-audit/);
  assert.match(help, /pnpm --silent dearme:dependency-loop-audit -- --check/);
  assert.match(help, /pnpm --silent typecheck/);
  assert.match(help, /No credentials, live network calls, sends, deploys, or spending/);
});
