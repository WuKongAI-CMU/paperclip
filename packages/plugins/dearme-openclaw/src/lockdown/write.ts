/**
 * DearMe lockdown layer — write `.claude/settings.json` + SKILL.md into the
 * user's OpenClaw workspace.
 *
 * Provenance: ported from `clawdbob/src/lockdown/write.js`. Idempotent.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  settingsForDearMeUser,
  settingsToJSON,
  type DearMeLockdownInput,
} from "./settings-template.js";
import { skillForDearMeUser } from "./skill-template.js";

export interface WriteDearMeLockdownInput extends DearMeLockdownInput {
  /** Absolute path to the OpenClaw agent workspace root for this user. */
  workspacePath: string;
}

export interface WriteDearMeLockdownResult {
  settingsPath: string;
  skillPath: string;
}

export function writeDearMeLockdown(
  input: WriteDearMeLockdownInput,
): WriteDearMeLockdownResult {
  const claudeDir = join(input.workspacePath, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  const settings = settingsForDearMeUser(input);
  const settingsPath = join(claudeDir, "settings.json");
  writeFileSync(settingsPath, settingsToJSON(settings));
  const skillPath = join(input.workspacePath, "SKILL.md");
  writeFileSync(skillPath, skillForDearMeUser(input));
  return { settingsPath, skillPath };
}
