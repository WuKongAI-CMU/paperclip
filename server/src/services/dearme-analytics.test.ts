import { afterEach, describe, expect, it, vi } from "vitest";
import { serverCapture } from "./dearme-analytics.js";

describe("serverCapture", () => {
  afterEach(() => {
    delete process.env.DEARME_POSTHOG_KEY;
    delete process.env.DEARME_POSTHOG_HOST;
    vi.clearAllMocks();
  });

  it("POSTs capture events to PostHog with the expected body", async () => {
    process.env.DEARME_POSTHOG_KEY = "ph_server_key";
    process.env.DEARME_POSTHOG_HOST = "https://posthog.example/";
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));

    const result = await serverCapture({
      distinctId: "user-123",
      event: "first_cycle_started",
      properties: { companyId: "company-123" },
      fetchImpl,
    });

    expect(result).toEqual({ skipped: false, ok: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith("https://posthog.example/capture/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: "ph_server_key",
        distinct_id: "user-123",
        event: "first_cycle_started",
        properties: { companyId: "company-123" },
      }),
    });
  });

  it("returns skipped when the PostHog env key is missing", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));

    await expect(
      serverCapture({
        distinctId: "user-123",
        event: "first_cycle_started",
        fetchImpl,
      }),
    ).resolves.toEqual({ skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
