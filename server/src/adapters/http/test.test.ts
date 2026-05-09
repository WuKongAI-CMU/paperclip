import { afterEach, describe, expect, it, vi } from "vitest";
import { testEnvironment } from "./test.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http adapter testEnvironment", () => {
  it("uses DearMe-facing host language for endpoint reachability hints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "http",
      config: {
        url: "https://example.test/webhook",
      },
    });

    const probeWarning = result.checks.find(
      (check) => check.code === "http_endpoint_probe_unexpected_status",
    );

    expect(probeWarning?.hint).toBe("Verify the endpoint is reachable from the DearMe server host.");
    expect(probeWarning?.hint).not.toContain("Paperclip");
  });
});
