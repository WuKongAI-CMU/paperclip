import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { agentConfigurationDoc as acpxAgentConfigurationDoc } from "@paperclipai/adapter-acpx-local";
import { agentConfigurationDoc as claudeAgentConfigurationDoc } from "@paperclipai/adapter-claude-local";
import { agentConfigurationDoc as codexAgentConfigurationDoc } from "@paperclipai/adapter-codex-local";
import { agentConfigurationDoc as cursorAgentConfigurationDoc } from "@paperclipai/adapter-cursor-local";
import { agentConfigurationDoc as geminiAgentConfigurationDoc } from "@paperclipai/adapter-gemini-local";
import { agentConfigurationDoc as openCodeAgentConfigurationDoc } from "@paperclipai/adapter-opencode-local";
import {
  agentConfigurationDoc as gatewayAgentConfigurationDoc,
  label as gatewayLabel,
} from "@paperclipai/adapter-openclaw-gateway";
import { agentConfigurationDoc as piAgentConfigurationDoc } from "@paperclipai/adapter-pi-local";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("built-in adapter configuration copy", () => {
  it("keeps exported configuration docs DearMe-facing", () => {
    const docs = [
      acpxAgentConfigurationDoc,
      claudeAgentConfigurationDoc,
      codexAgentConfigurationDoc,
      cursorAgentConfigurationDoc,
      geminiAgentConfigurationDoc,
      openCodeAgentConfigurationDoc,
      gatewayAgentConfigurationDoc,
      piAgentConfigurationDoc,
    ].join("\n\n");

    expect(docs).not.toMatch(/\bPaperclip\b/);
    expect(docs).not.toMatch(/\bOpenClaw\b/);
    expect(docs).toContain("DearMe");
    expect(docs).toContain("runtime-managed");
    expect(docs).toContain("remote gateway WebSocket URL");
  });

  it("hides substrate names in the gateway adapter label", () => {
    expect(gatewayLabel).toBe("Remote Gateway");
    expect(gatewayLabel).not.toMatch(/\bOpenClaw\b/);
  });

  it("keeps remote gateway runtime guidance substrate-free", () => {
    const source = [
      "server/src/routes/access.ts",
      "packages/adapters/openclaw-gateway/src/server/execute.ts",
      "packages/adapters/openclaw-gateway/src/server/test.ts",
      "packages/adapters/openclaw-gateway/doc/ONBOARDING_AND_TEST_PLAN.md",
      "server/src/onboarding-assets/ceo/AGENTS.md",
    ]
      .map(readRepoFile)
      .join("\n\n");

    for (const stalePhrase of [
      "No OpenClaw gateway config was provided in agentDefaultsPayload.",
      "Include agentDefaultsPayload.url and headers.x-openclaw-token for OpenClaw gateway joins.",
      "OpenClaw gateway URL is missing.",
      "OpenClaw gateway URL must use ws:// or wss://",
      "Invalid OpenClaw gateway URL",
      "Only CEO agents can generate OpenClaw invite prompts",
      "invite accept normalized OpenClaw gateway defaults",
      "invite accept persisted OpenClaw gateway join request",
      "invite accept detected missing persisted OpenClaw gateway defaults",
      "OpenClaw gateway adapter missing url",
      "OpenClaw gateway agent request failed",
      "OpenClaw gateway run timed out",
      "OpenClaw gateway run failed",
      "Unexpected OpenClaw gateway agent.wait status",
      "Approve the pending device in OpenClaw",
      "OpenClaw gateway adapter requires a WebSocket URL.",
      "Paperclip wake event for a cloud adapter.",
      "Verify network reachability and gateway URL from the Paperclip server host.",
      "Generate OpenClaw Invite Prompt",
      "wait for Paperclip wake events",
    ]) {
      expect(source).not.toContain(stalePhrase);
    }

    expect(source).toContain("No remote gateway config was provided in agentDefaultsPayload.");
    expect(source).toContain("Remote gateway adapter missing url");
    expect(source).toContain("Remote gateway adapter requires a WebSocket URL.");
    expect(source).toContain("Approve the pending remote gateway device");
    expect(source).toContain("DearMe wake event for a remote gateway adapter.");
    expect(source).toContain("Verify network reachability and gateway URL from the DearMe server host.");
    expect(source).toContain("Generate Remote Gateway Invite Prompt");
    expect(source).toContain("wait for DearMe wake events");
  });
});
