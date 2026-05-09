import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("execution workspace close-readiness copy", () => {
  it("keeps generated close and cleanup guidance DearMe-facing", () => {
    const source = readRepoFile("server/src/services/execution-workspaces.ts");

    for (const stalePhrase of [
      "Workspace has no local path, so Paperclip cannot inspect git status before close.",
      "so Paperclip cannot inspect git status before close.",
      "Paperclip will run git worktree cleanup",
      "Paperclip will try to delete the runtime-created branch",
      "Paperclip will archive this workspace but keep",
      "Paperclip will remove the runtime-created directory",
    ]) {
      expect(source).not.toContain(stalePhrase);
    }

    expect(source).toContain("Workspace has no local path, so DearMe cannot inspect git status before close.");
    expect(source).toContain("DearMe will run git worktree cleanup");
    expect(source).toContain("DearMe will remove the runtime-created directory");
  });
});
