/**
 * DearMe runtime-files MCP — Bash deny patterns.
 *
 * Provenance: ported from `clawdbob/src/mcp/runtime-files/denyPatterns.ts`,
 * which itself mirrors clawdbob's lockdown layer. DearMe keeps the
 * dearme-openclaw `lockdown/settings-template.ts` DEARME_DENY_BASH_PATTERNS
 * as the source-of-truth list; this list intentionally duplicates it so the
 * MCP server can run as a standalone STDIO process without depending on the
 * dearme-openclaw plugin package.
 *
 * MIRROR of `packages/plugins/dearme-openclaw/src/lockdown/settings-template.ts`
 * `DEARME_DENY_BASH_PATTERNS`. If you change one, change the other. A test
 * enforces this mirror — see `denyPatterns.test.ts`.
 *
 * Pattern format follows Anthropic Claude Code's hook syntax:
 *   `Bash(<binary>:<args glob>)`
 * with `*` wildcards. We convert each pattern into a regex applied to the
 * trimmed command string before spawning bash.
 */

export const DEARME_RUNTIME_DENY_BASH_PATTERNS: readonly string[] = [
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
];

function patternToRegex(pattern: string): RegExp | null {
  const m = pattern.match(/^Bash\((.+)\)$/);
  if (!m) return null;
  const inside = m[1]!;
  const globExpr = inside.includes(":") ? inside.replace(":", " ") : inside;
  const escaped = globExpr
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$");
}

const COMPILED: Array<{ pattern: string; regex: RegExp }> =
  DEARME_RUNTIME_DENY_BASH_PATTERNS
    .map((pattern) => ({ pattern, regex: patternToRegex(pattern)! }))
    .filter((entry) => entry.regex !== null);

export function findBashDenyMatch(command: string): string | null {
  const trimmed = command.trim();
  for (const { pattern, regex } of COMPILED) {
    if (regex.test(trimmed)) return pattern;
  }
  return null;
}
