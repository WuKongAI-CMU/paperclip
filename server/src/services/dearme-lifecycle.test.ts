import { describe, expect, it, vi } from "vitest";
import { sendLifecycleEvent, updateContact } from "./dearme-lifecycle.js";

describe("DearMe lifecycle email", () => {
  it("sends lifecycle events to Loops with bearer auth", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
    }));

    await expect(sendLifecycleEvent({
      email: "buyer@example.com",
      eventName: "dearme_signup",
      properties: { tier: "paid_beta" },
    }, {
      apiKey: "loops_test_key",
      fetchImpl,
    })).resolves.toEqual({
      skipped: false,
      ok: true,
      status: 200,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://app.loops.so/api/v1/events/send",
      {
        method: "POST",
        headers: {
          authorization: "Bearer loops_test_key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "buyer@example.com",
          eventName: "dearme_signup",
          eventProperties: { tier: "paid_beta" },
        }),
      },
    );
  });

  it("skips lifecycle events when the Loops API key is missing", async () => {
    const fetchImpl = vi.fn();

    await expect(sendLifecycleEvent({
      email: "buyer@example.com",
      eventName: "dearme_signup",
    }, {
      apiKey: "",
      fetchImpl,
    })).resolves.toMatchObject({
      skipped: true,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns upstream failures without throwing", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "loops unavailable",
    }));

    await expect(sendLifecycleEvent({
      email: "buyer@example.com",
      eventName: "dearme_trial_ending",
    }, {
      apiKey: "loops_test_key",
      fetchImpl,
    })).resolves.toEqual({
      skipped: false,
      ok: false,
      status: 503,
      reason: "loops unavailable",
    });
  });

  it("updates Loops contacts", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
    }));

    await expect(updateContact({
      email: "buyer@example.com",
      properties: {
        firstName: "Buyer",
        handle: "@buyer",
        paidTier: "paid_beta",
      },
    }, {
      apiKey: "loops_test_key",
      fetchImpl,
    })).resolves.toMatchObject({
      skipped: false,
      ok: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://app.loops.so/api/v1/contacts/update",
      {
        method: "POST",
        headers: {
          authorization: "Bearer loops_test_key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "buyer@example.com",
          firstName: "Buyer",
          handle: "@buyer",
          paidTier: "paid_beta",
        }),
      },
    );
  });
});
