import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEARME_DENY_BASH_PATTERNS,
  DEARME_LOCKDOWN_MOAT_CLAUSE,
  DEARME_LOCKDOWN_VERSION,
  settingsForDearMeUser,
  settingsToJSON,
  skillForDearMeUser,
  verifyDearMeWorkspace,
  writeDearMeLockdown,
} from "./index.js";

const FIXED_NOW = () => new Date("2026-05-14T00:00:00.000Z");
const FIXTURE = {
  userHandle: "peter-studio",
  dearMeProxyUrl: "https://api.dearme.app",
  now: FIXED_NOW,
};

describe("DearMe lockdown — settings template", () => {
  it("uses bypassPermissions defaultMode and sandbox enabled", () => {
    const settings = settingsForDearMeUser(FIXTURE);
    expect(settings.permissions.defaultMode).toBe("bypassPermissions");
    expect(settings.sandbox.enabled).toBe(true);
  });

  it("denies every required bash pattern (no drift from source-of-truth list)", () => {
    const settings = settingsForDearMeUser(FIXTURE);
    const deny = new Set(settings.permissions.deny);
    for (const pattern of DEARME_DENY_BASH_PATTERNS) {
      expect(deny.has(pattern)).toBe(true);
    }
  });

  it("denies direct LLM provider calls (the AI proxy moat)", () => {
    const settings = settingsForDearMeUser(FIXTURE);
    const deny = settings.permissions.deny.join("\n");
    expect(deny).toContain("api.openai.com");
    expect(deny).toContain("api.anthropic.com");
    expect(deny).toContain("bedrock-runtime");
  });

  it("stamps the lockdown_version + user + proxy in the env block", () => {
    const settings = settingsForDearMeUser(FIXTURE);
    expect(settings._dearme.lockdown_version).toBe(DEARME_LOCKDOWN_VERSION);
    expect(settings.env.DEARME_USER_HANDLE).toBe("peter-studio");
    expect(settings.env.DEARME_PROXY_URL).toBe("https://api.dearme.app");
  });

  it("settingsToJSON is stable and newline-terminated", () => {
    const json = settingsToJSON(settingsForDearMeUser(FIXTURE));
    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json).permissions.defaultMode).toBe("bypassPermissions");
  });
});

describe("DearMe lockdown — SKILL template", () => {
  it("contains the moat clause", () => {
    const skill = skillForDearMeUser(FIXTURE);
    expect(skill).toContain(DEARME_LOCKDOWN_MOAT_CLAUSE);
  });

  it("references the configured proxy URL on every channel", () => {
    const skill = skillForDearMeUser(FIXTURE);
    expect(skill).toContain("https://api.dearme.app/ai/openai/v1/chat/completions");
    expect(skill).toContain("https://api.dearme.app/api/proxy/ai/v1/messages");
    expect(skill).toContain("https://api.dearme.app/v1/voice/score");
  });

  it("references the user handle", () => {
    const skill = skillForDearMeUser(FIXTURE);
    expect(skill).toContain("peter-studio");
  });
});

describe("DearMe lockdown — write + verify (filesystem)", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "dearme-lockdown-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("writes settings.json and SKILL.md, verify returns ok", () => {
    const result = writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    expect(result.settingsPath.endsWith(".claude/settings.json")).toBe(true);
    expect(result.skillPath.endsWith("SKILL.md")).toBe(true);

    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.missing).toEqual([]);
  });

  it("verify fails when settings file is missing", () => {
    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.missing).toContain(".claude/settings.json");
    expect(verdict.missing).toContain("SKILL.md");
  });

  it("verify fails when sandbox is tampered off", () => {
    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const settingsPath = join(workspace, ".claude", "settings.json");
    const tampered = JSON.parse(readFileSync(settingsPath, "utf8"));
    tampered.sandbox.enabled = false;
    writeFileSync(settingsPath, JSON.stringify(tampered, null, 2));

    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toContain("sandbox.enabled must be true");
  });

  it("verify fails when defaultMode is tampered off bypassPermissions", () => {
    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const settingsPath = join(workspace, ".claude", "settings.json");
    const tampered = JSON.parse(readFileSync(settingsPath, "utf8"));
    tampered.permissions.defaultMode = "default";
    writeFileSync(settingsPath, JSON.stringify(tampered, null, 2));

    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toContain(
      "defaultMode must be bypassPermissions",
    );
  });

  it("verify fails when a deny pattern is removed", () => {
    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const settingsPath = join(workspace, ".claude", "settings.json");
    const tampered = JSON.parse(readFileSync(settingsPath, "utf8"));
    tampered.permissions.deny = tampered.permissions.deny.filter(
      (p: string) => !p.includes("api.openai.com"),
    );
    writeFileSync(settingsPath, JSON.stringify(tampered, null, 2));

    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toContain("missing deny patterns");
  });

  it("verify fails when SKILL.md moat clause is removed", () => {
    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const skillPath = join(workspace, "SKILL.md");
    writeFileSync(skillPath, "# DearMe — friendly notes only\n");

    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toContain("missing moat clause");
  });

  it("write is idempotent (second write produces identical content)", () => {
    const first = writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const beforeSettings = readFileSync(first.settingsPath, "utf8");
    const beforeSkill = readFileSync(first.skillPath, "utf8");

    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    expect(readFileSync(first.settingsPath, "utf8")).toBe(beforeSettings);
    expect(readFileSync(first.skillPath, "utf8")).toBe(beforeSkill);
  });

  it("verify fails when settings.json is unparseable", () => {
    writeDearMeLockdown({ ...FIXTURE, workspacePath: workspace });
    const settingsPath = join(workspace, ".claude", "settings.json");
    writeFileSync(settingsPath, "{ broken json");
    const verdict = verifyDearMeWorkspace({
      ...FIXTURE,
      workspacePath: workspace,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.join("\n")).toContain("parse failed");
  });
});
