import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const skillSnapshotSources = [
  "packages/adapters/acpx-local/src/server/skills.ts",
  "packages/adapters/claude-local/src/server/skills.ts",
  "packages/adapters/codex-local/src/server/skills.ts",
  "packages/adapters/cursor-local/src/server/skills.ts",
  "packages/adapters/gemini-local/src/server/skills.ts",
  "packages/adapters/opencode-local/src/server/skills.ts",
  "packages/adapters/pi-local/src/server/skills.ts",
];

const staleSkillCopy = [
  "Required by Paperclip",
  "Managed by Paperclip",
  "Paperclip skills directory",
  "Paperclip cannot find this skill",
  "Paperclip management",
  "Paperclip-managed Claude prompt bundle",
  "stored in Paperclip only",
  "Paperclip skill integration contract",
];

describe("adapter skill user-facing copy", () => {
  it("keeps skill labels, warnings, and provenance details DearMe-facing", async () => {
    const sources = await Promise.all(
      skillSnapshotSources.map(async (sourcePath) => ({
        sourcePath,
        source: await fs.readFile(path.join(process.cwd(), sourcePath), "utf8"),
      })),
    );

    for (const { sourcePath, source } of sources) {
      for (const stalePhrase of staleSkillCopy) {
        expect(source, `${sourcePath} should not expose "${stalePhrase}"`).not.toContain(stalePhrase);
      }
    }

    const combinedSource = sources.map(({ source }) => source).join("\n");
    expect(combinedSource).toContain("Required by DearMe");
    expect(combinedSource).toContain("Managed by DearMe");
    expect(combinedSource).toContain("DearMe runtime skills directory");
    expect(combinedSource).toContain("DearMe cannot find this skill in the local runtime skills directory.");
    expect(combinedSource).toContain("Installed outside DearMe management.");
    expect(combinedSource).toContain("DearMe skill integration contract");
  });
});
