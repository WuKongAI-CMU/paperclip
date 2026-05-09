// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "../context/ThemeContext";
import {
  RunInvocationCard,
  agentRunMethodLabel,
  agentUnsupportedSkillManagementMessage,
} from "../pages/AgentDetail";

describe("RunInvocationCard", () => {
  it("keeps verbose invocation details collapsed by default", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <RunInvocationCard
          payload={{
            adapterType: "claude_local",
            cwd: "/tmp/workspace",
            command: "claude",
            commandArgs: ["--dangerously-skip-permissions"],
            commandNotes: ["Prompt is piped to claude via stdin."],
            prompt: "very long prompt body",
            context: { triggeredBy: "board" },
            env: { ANTHROPIC_API_KEY: "***REDACTED***" },
          }}
          censorUsernameInLogs={false}
        />
      </ThemeProvider>,
    );

    expect(html).toContain("Invocation");
    expect(html).toContain("Run method:");
    expect(html).toContain("Claude Code (local)");
    expect(html).not.toContain("Adapter:");
    expect(html).not.toContain("claude_local");
    expect(html).toContain("Working dir:");
    expect(html).toContain("Details");
    expect(html).not.toContain("Command:");
    expect(html).not.toContain("Prompt is piped to claude via stdin.");
    expect(html).not.toContain("very long prompt body");
    expect(html).not.toContain("ANTHROPIC_API_KEY");
    expect(html).not.toContain("triggeredBy");
  });

  it("keeps Agent detail run-method copy off substrate labels", () => {
    const gatewayMessage = agentUnsupportedSkillManagementMessage({
      mode: "unsupported",
      adapterType: "openclaw_gateway",
      adapterConfigAgent: undefined,
    });
    const genericMessage = agentUnsupportedSkillManagementMessage({
      mode: "unsupported",
      adapterType: "external_local",
      adapterConfigAgent: undefined,
    });

    expect(agentRunMethodLabel("openclaw_gateway")).toBe("Remote Gateway (gateway)");
    expect(gatewayMessage).toContain("gateway skills");
    expect(gatewayMessage).toContain("connected gateway");
    expect(gatewayMessage).not.toContain("OpenClaw");
    expect(genericMessage).toContain("runner");
    expect(genericMessage).not.toContain("adapter");
  });
});
