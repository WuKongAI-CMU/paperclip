import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDearMeDependencyUpdate,
  formatDearMeDependencyLoopAudit,
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
    parseDearMeDependencyLoopAuditArgs(["--check", "--json", "--outdated-json", "outdated.json"]),
    {
      help: false,
      json: true,
      check: true,
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
