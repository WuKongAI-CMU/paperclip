import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.basename(process.cwd()) === "server"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

const runtimeCopySources = [
  "packages/adapters/acpx-local/src/server/config-schema.ts",
  "packages/adapters/acpx-local/src/server/execute.ts",
  "packages/adapters/codex-local/src/server/codex-home.ts",
  "packages/adapters/codex-local/src/server/execute.ts",
  "packages/adapters/pi-local/src/server/execute.ts",
];

const staleRuntimeCopy = [
  "Using Paperclip-managed Codex home",
  "Using Paperclip-managed ACPX Codex home",
  "Paperclip-managed",
  "Paperclip execution workspaces",
  "Paperclip has materialized selected runtime skills",
  "Paperclip skill(s)",
  "Selected Paperclip skills are tracked only",
  "Defaults to Paperclip-managed company/agent scoped storage.",
  "ACPX runtime embedded in Paperclip",
  "Paperclip will start a fresh session",
  "Paperclip session handoff:",
];

describe("adapter runtime user-facing copy", () => {
  it("keeps runtime logs, hints, prompts, and command notes DearMe-facing", async () => {
    const sources = await Promise.all(
      runtimeCopySources.map(async (sourcePath) => ({
        sourcePath,
        source: await fs.readFile(path.join(repoRoot, sourcePath), "utf8"),
      })),
    );

    for (const { sourcePath, source } of sources) {
      for (const stalePhrase of staleRuntimeCopy) {
        expect(source, `${sourcePath} should not expose "${stalePhrase}"`).not.toContain(stalePhrase);
      }
    }

    const combinedSource = sources.map(({ source }) => source).join("\n");
    expect(combinedSource).toContain("DearMe-managed");
    expect(combinedSource).toContain("Using DearMe-managed ACPX Codex home");
    expect(combinedSource).toContain("DearMe execution workspaces");
    expect(combinedSource).toContain("DearMe has materialized selected runtime skills");
    expect(combinedSource).toContain("DearMe skill(s)");
    expect(combinedSource).toContain("Selected DearMe skills are tracked only");
    expect(combinedSource).toContain("Defaults to DearMe-managed company/agent scoped storage.");
    expect(combinedSource).toContain("ACPX runtime embedded in DearMe");
    expect(combinedSource).toContain("DearMe will start a fresh session");
    expect(combinedSource).toContain("DearMe session handoff:");
  });
});
