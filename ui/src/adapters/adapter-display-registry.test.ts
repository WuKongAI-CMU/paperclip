import { describe, expect, it } from "vitest";
import { getAdapterDisplay } from "./adapter-display-registry";

describe("adapter display registry", () => {
  it("keeps visible OpenCode copy model-focused", () => {
    const display = getAdapterDisplay("opencode_local");

    expect(display.description).toBe("Local agent with broad model support");
    expect(display.description).not.toMatch(/\bproviders?\b/i);
  });

  it("keeps picker descriptions off adapter terminology", () => {
    const descriptions = [
      getAdapterDisplay("acpx_local").description,
      getAdapterDisplay("process").description,
      getAdapterDisplay("http").description,
      getAdapterDisplay("external_local").description,
      getAdapterDisplay("external").description,
    ].join("\n");

    expect(descriptions).not.toMatch(/\badapters?\b/i);
  });
});
