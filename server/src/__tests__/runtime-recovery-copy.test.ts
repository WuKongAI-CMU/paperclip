import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("runtime recovery copy", () => {
  it("keeps generated recovery and liveness notices DearMe-facing", () => {
    const source = [
      "server/src/services/recovery/service.ts",
      "server/src/services/heartbeat.ts",
      "server/src/services/productivity-review.ts",
    ]
      .map(readRepoFile)
      .join("\n\n");

    for (const stalePhrase of [
      "Paperclip detected a harness-level issue graph liveness incident.",
      "Paperclip detected a harness-level liveness incident in this issue's dependency graph.",
      "Paperclip found this issue is blocking",
      "Paperclip detected critical output silence on this issue's active run.",
      "Paperclip exhausted automatic recovery for an assigned issue and created this explicit recovery task.",
      "Paperclip stopped automatic stranded-work recovery for this recovery issue.",
      "Paperclip stopped automatic continuation because the latest run produced reviewable output.",
      "Paperclip automatically retried dispatch for this assigned `todo` issue",
      "Paperclip automatically retried continuation for this assigned `in_progress` issue",
      "Paperclip could not find an invokable manager",
      "Paperclip cleared the scheduled external-service monitor",
      "Paperclip session handoff:",
      "Paperclip will wake the assignee when blockers resolve",
      "Paperclip detected an unusual productivity/progression pattern on an assigned issue.",
    ]) {
      expect(source).not.toContain(stalePhrase);
    }

    expect(source).toContain("DearMe detected a harness-level issue graph liveness incident.");
    expect(source).toContain("DearMe session handoff:");
    expect(source).toContain("DearMe stopped automatic continuation because the latest run produced reviewable output.");
  });
});
