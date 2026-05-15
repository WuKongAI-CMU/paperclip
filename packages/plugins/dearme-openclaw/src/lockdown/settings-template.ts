/**
 * DearMe lockdown layer — `.claude/settings.json` generator.
 *
 * Provenance: ported from `clawdbob/src/lockdown/settings-template.js`,
 * which itself ports verified Polsia production lockdown. See
 * `docs/dearme/CLAWDBOB-ABSORPTION-PLAN.md` (dm-cb-01) for the absorption
 * doctrine. Vendored claude-code permission grammar; license preserved.
 *
 * Why this matters: when DearMe runs as an OpenClaw plugin on the user's
 * device, the AI proxy (`api.dearme.app`) is what attributes per-task cost
 * and enforces the voice gate. A user that bypasses the proxy by curling
 * OpenAI/Anthropic directly breaks both. Lockdown denies the bypass paths.
 */

export const DEARME_DENY_BASH_PATTERNS = [
  "Bash(rm:-rf /*)",
  "Bash(rm:-rf /)",
  "Bash(sudo:*)",
  "Bash(git push:*)",
  "Bash(git remote add:*)",
  "Bash(git remote set-url:*)",
  "Bash(*curl*api.github.com*)",
  "Bash(*curl*api.openai.com*)",
  "Bash(*curl*api.anthropic.com*)",
  "Bash(*curl*bedrock-runtime.*amazonaws.com*)",
  "Bash(*wget*api.openai.com*)",
  "Bash(*wget*api.anthropic.com*)",
  "Bash(*wget*bedrock-runtime.*amazonaws.com*)",
  "Bash(npm publish:*)",
  "Bash(yarn publish:*)",
  "Bash(pip install:*)",
] as const;

export const DEARME_LOCKDOWN_VERSION = 1;

export interface DearMeLockdownInput {
  /** Stable per-user handle, e.g. `peter-studio`. Used in the env block and audit. */
  userHandle: string;
  /** DearMe AI proxy base URL, e.g. `https://api.dearme.app`. */
  dearMeProxyUrl: string;
  /** Optional override for the now() function — used by tests. */
  now?: () => Date;
}

export interface DearMeSettingsFile {
  permissions: {
    defaultMode: "bypassPermissions";
    deny: readonly string[];
    allow: readonly string[];
  };
  sandbox: { enabled: true };
  env: {
    DEARME_PROXY_URL: string;
    DEARME_USER_HANDLE: string;
  };
  _dearme: {
    lockdown_version: number;
    generated_at: string;
    purpose: string;
  };
}

export function settingsForDearMeUser(
  input: DearMeLockdownInput,
): DearMeSettingsFile {
  const now = (input.now ?? (() => new Date()))();
  return {
    permissions: {
      defaultMode: "bypassPermissions",
      deny: DEARME_DENY_BASH_PATTERNS,
      allow: [
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "TodoWrite",
        "NotebookEdit",
        "mcp__dearme_voice__*",
        "mcp__dearme_workbench__*",
        "mcp__dearme_memory__*",
        "mcp__dearme_research__*",
      ],
    },
    sandbox: { enabled: true },
    env: {
      DEARME_PROXY_URL: input.dearMeProxyUrl,
      DEARME_USER_HANDLE: input.userHandle,
    },
    _dearme: {
      lockdown_version: DEARME_LOCKDOWN_VERSION,
      generated_at: now.toISOString(),
      purpose:
        "DearMe OpenClaw lockdown — DO NOT EDIT. Regenerated per user.",
    },
  };
}

export function settingsToJSON(settings: DearMeSettingsFile): string {
  return JSON.stringify(settings, null, 2) + "\n";
}
