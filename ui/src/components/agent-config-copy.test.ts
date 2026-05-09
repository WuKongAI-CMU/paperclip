import { describe, expect, it } from "vitest";
import { help } from "./agent-config-primitives";

describe("agent config copy", () => {
  it("keeps visible run-method help text off adapter terminology", () => {
    const visibleHelpText = [
      help.cwd,
      help.model,
      help.thinkingEffort,
      help.dangerouslySkipPermissions,
      help.extraArgs,
      help.envVars,
      help.payloadTemplateJson,
      help.maxTurnContinuationEnabled,
    ].join("\n");

    expect(visibleHelpText).not.toMatch(/\badapters?\b/i);
  });
});
