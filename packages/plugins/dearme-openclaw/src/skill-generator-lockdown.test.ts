import { describe, expect, it } from "vitest";

import {
  DEARME_DENY_BASH_PATTERNS,
  DEARME_LOCKDOWN_MOAT_CLAUSE,
  generateLockdownBundle,
  type DearMeSettingsFile,
} from "./index.js";

function settingsFromBundle(input?: Parameters<typeof generateLockdownBundle>[0]): DearMeSettingsFile {
  const settingsFile = generateLockdownBundle(input).files.find(
    (file) => file.relativePath === ".claude/settings.json",
  );
  expect(settingsFile).toBeDefined();
  return JSON.parse(settingsFile!.content) as DearMeSettingsFile;
}

describe("dearme-openclaw lockdown bundle generation", () => {
  it("returns settings.json and SKILL.md at workspace-relative paths", () => {
    const bundle = generateLockdownBundle();
    expect(bundle.files.map((file) => file.relativePath)).toEqual([
      ".claude/settings.json",
      "SKILL.md",
    ]);
  });

  it("settings.json parses and carries the full deny-list", () => {
    const settings = settingsFromBundle();
    expect(settings.permissions.deny).toEqual(DEARME_DENY_BASH_PATTERNS);
  });

  it("SKILL.md contains the moat clause and configured proxy URL", () => {
    const bundle = generateLockdownBundle({
      userHandle: "peter-studio",
      dearMeProxyUrl: "https://proxy.example.test",
    });
    const skill = bundle.files.find((file) => file.relativePath === "SKILL.md");
    expect(skill).toBeDefined();
    expect(skill!.content).toContain(DEARME_LOCKDOWN_MOAT_CLAUSE);
    expect(skill!.content).toContain("https://proxy.example.test");
  });

  it("defaults the user handle to anonymous", () => {
    const settings = settingsFromBundle({ dearMeProxyUrl: "https://proxy.example.test" });
    expect(settings.env.DEARME_USER_HANDLE).toBe("anonymous");
  });

  it("defaults the proxy URL to https://api.dearme.app", () => {
    const settings = settingsFromBundle({ userHandle: "peter-studio" });
    expect(settings.env.DEARME_PROXY_URL).toBe("https://api.dearme.app");
  });
});
