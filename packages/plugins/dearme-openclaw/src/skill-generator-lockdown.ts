import {
  settingsForDearMeUser,
  settingsToJSON,
  skillForDearMeUser,
} from "./lockdown/index.js";

export interface LockdownBundleInput {
  userHandle?: string;
  dearMeProxyUrl?: string;
}

export interface LockdownBundleFile {
  relativePath: string;
  content: string;
}

export interface LockdownBundle {
  files: LockdownBundleFile[];
}

const DEFAULT_USER_HANDLE = "anonymous";
const DEFAULT_DEARME_PROXY_URL = "https://api.dearme.app";

/**
 * Generate the workspace-level OpenClaw lockdown bundle that accompanies the
 * role SKILL.md files. Pure function so the CLI can write atomically while
 * tests can inspect the emitted files without touching disk.
 */
export function generateLockdownBundle(
  input: LockdownBundleInput = {},
): LockdownBundle {
  const userHandle = input.userHandle ?? DEFAULT_USER_HANDLE;
  const dearMeProxyUrl = input.dearMeProxyUrl ?? DEFAULT_DEARME_PROXY_URL;
  const lockdownInput = { userHandle, dearMeProxyUrl };

  return {
    files: [
      {
        relativePath: ".claude/settings.json",
        content: settingsToJSON(settingsForDearMeUser(lockdownInput)),
      },
      {
        relativePath: "SKILL.md",
        content: skillForDearMeUser(lockdownInput),
      },
    ],
  };
}
