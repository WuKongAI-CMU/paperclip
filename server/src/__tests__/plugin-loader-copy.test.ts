import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("plugin loader user-facing copy", () => {
  it("keeps plugin install and runtime errors DearMe-facing without renaming compatibility contracts", () => {
    const source = [
      "server/src/services/plugin-loader.ts",
      "server/src/services/plugin-event-bus.ts",
    ]
      .map(readRepoFile)
      .join("\n\n");

    for (const stalePhrase of [
      "Naming convention for npm-published Paperclip plugins.",
      "Packages matching this pattern are considered Paperclip plugins.",
      "Discover Paperclip plugins installed as npm packages",
      "Returns null if the package is not a Paperclip plugin.",
      "Throws if the package is a Paperclip plugin but the manifest is invalid.",
      "Check whether a package name matches the Paperclip plugin naming convention.",
      "does not appear to be a Paperclip plugin (no manifest found).",
      "no longer exposes a Paperclip manifest",
      "if the package is not a Paperclip plugin.",
      "Paperclip plugin system.",
    ]) {
      expect(source).not.toContain(stalePhrase);
    }

    expect(source).toContain("Naming convention for npm-published DearMe-compatible plugins.");
    expect(source).toContain("Packages matching this pattern are considered DearMe-compatible plugins.");
    expect(source).toContain("Discover DearMe-compatible plugins installed as npm packages");
    expect(source).toContain("Returns null if the package is not a DearMe-compatible plugin.");
    expect(source).toContain("Throws if the package is a DearMe-compatible plugin but the manifest is invalid.");
    expect(source).toContain("Check whether a package name matches the DearMe-compatible plugin naming convention.");
    expect(source).toContain("does not appear to be a DearMe-compatible plugin (no manifest found).");
    expect(source).toContain("no longer exposes a DearMe-compatible manifest");
    expect(source).toContain("DearMe-compatible plugin system.");

    expect(source).toContain("PaperclipPluginManifestV1");
    expect(source).toContain('"paperclipPlugin.manifest"');
    expect(source).toContain('"paperclip-plugin-"');
  });
});
