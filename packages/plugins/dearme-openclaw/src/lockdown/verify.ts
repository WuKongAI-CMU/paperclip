/**
 * DearMe lockdown layer — verify a user workspace has the required files.
 *
 * Provenance: ported from `clawdbob/src/lockdown/verify.js`.
 *
 * Called by the OpenClaw plugin's bootstrap path before launching the agent:
 * if `ok === false`, refuse the run, log reasons, and call `writeLockdown`
 * to re-provision. Idempotent — safe to call before every run.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEARME_DENY_BASH_PATTERNS,
  DEARME_LOCKDOWN_VERSION,
  type DearMeLockdownInput,
  type DearMeSettingsFile,
} from "./settings-template.js";
import { DEARME_LOCKDOWN_MOAT_CLAUSE } from "./skill-template.js";

export interface VerifyDearMeWorkspaceInput extends DearMeLockdownInput {
  /** Absolute path to the OpenClaw agent workspace root for this user. */
  workspacePath: string;
}

export interface VerifyDearMeWorkspaceResult {
  ok: boolean;
  missing: string[];
  stale: string[];
  reasons: string[];
}

export function verifyDearMeWorkspace(
  input: VerifyDearMeWorkspaceInput,
): VerifyDearMeWorkspaceResult {
  const reasons: string[] = [];
  const missing: string[] = [];
  const stale: string[] = [];

  const settingsPath = join(input.workspacePath, ".claude", "settings.json");
  const skillPath = join(input.workspacePath, "SKILL.md");

  if (!existsSync(settingsPath)) {
    missing.push(".claude/settings.json");
    reasons.push(
      "DearMe workspace missing .claude/settings.json — run writeDearMeLockdown() first.",
    );
  } else {
    try {
      const actual = JSON.parse(
        readFileSync(settingsPath, "utf8"),
      ) as Partial<DearMeSettingsFile>;
      if (actual.sandbox?.enabled !== true) {
        reasons.push(".claude/settings.json: sandbox.enabled must be true");
      }
      if (actual.permissions?.defaultMode !== "bypassPermissions") {
        reasons.push(
          ".claude/settings.json: permissions.defaultMode must be bypassPermissions",
        );
      }
      const denySet = new Set(actual.permissions?.deny ?? []);
      const missingDeny = DEARME_DENY_BASH_PATTERNS.filter(
        (p) => !denySet.has(p),
      );
      if (missingDeny.length) {
        reasons.push(
          `.claude/settings.json: missing deny patterns: ${missingDeny.join(", ")}`,
        );
      }
      const currentVersion = actual._dearme?.lockdown_version ?? 0;
      if (currentVersion < DEARME_LOCKDOWN_VERSION) {
        stale.push(".claude/settings.json");
        reasons.push(
          ".claude/settings.json: lockdown_version is older than required — regenerate.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      reasons.push(`.claude/settings.json: parse failed — ${message}`);
    }
  }

  if (!existsSync(skillPath)) {
    missing.push("SKILL.md");
    reasons.push(
      "DearMe workspace missing SKILL.md — run writeDearMeLockdown() first.",
    );
  } else {
    const skillContent = readFileSync(skillPath, "utf8");
    if (!skillContent.includes(DEARME_LOCKDOWN_MOAT_CLAUSE)) {
      reasons.push(
        `SKILL.md: missing moat clause "${DEARME_LOCKDOWN_MOAT_CLAUSE}" — regenerate.`,
      );
    }
    if (!skillContent.includes(input.dearMeProxyUrl)) {
      reasons.push(
        `SKILL.md: does not reference DearMe proxy URL ${input.dearMeProxyUrl} — regenerate.`,
      );
    }
  }

  return { ok: reasons.length === 0, missing, stale, reasons };
}
