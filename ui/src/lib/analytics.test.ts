import { afterEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlag: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

async function loadAnalytics(input: { key?: string; host?: string } = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("VITE_POSTHOG_KEY", input.key ?? "");
  vi.stubEnv("VITE_POSTHOG_HOST", input.host ?? "");
  return import("./analytics");
}

describe("analytics", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("keeps capture as a no-op when not initialized", async () => {
    const { capture } = await loadAnalytics();

    expect(() => capture("landing_viewed")).not.toThrow();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("returns the feature flag fallback when not initialized", async () => {
    const { featureFlag } = await loadAnalytics();

    expect(featureFlag("paid-beta-pricing", true)).toBe(true);
    expect(featureFlag("paid-beta-pricing")).toBe(false);
    expect(posthogMock.isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("returns multivariate feature flag values after analytics initializes", async () => {
    posthogMock.getFeatureFlag.mockReturnValue("proof-first");
    const { initAnalytics, resolveFeatureFlagValue } = await loadAnalytics({ key: "ph_test_key" });

    initAnalytics();

    await expect(resolveFeatureFlagValue("dearme_landing_copy", "control")).resolves.toBe("proof-first");
    expect(posthogMock.getFeatureFlag).toHaveBeenCalledWith("dearme_landing_copy");
  });

  it("returns the multivariate fallback when analytics is disabled", async () => {
    const { resolveFeatureFlagValue } = await loadAnalytics();

    await expect(resolveFeatureFlagValue("dearme_landing_copy", "control")).resolves.toBe("control");
    expect(posthogMock.getFeatureFlag).not.toHaveBeenCalled();
  });

  it("captures through PostHog after initAnalytics initializes the client", async () => {
    const { capture, initAnalytics } = await loadAnalytics({
      key: "ph_test_key",
      host: "https://posthog.example",
    });

    initAnalytics();
    capture("landing_cta_submitted", { positioning_length: 42 });

    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalledOnce());
    expect(posthogMock.init).toHaveBeenCalledWith("ph_test_key", {
      api_host: "https://posthog.example",
    });
    await vi.waitFor(() => expect(posthogMock.capture).toHaveBeenCalledOnce());
    expect(posthogMock.capture).toHaveBeenCalledWith("landing_cta_submitted", {
      positioning_length: 42,
    });
  });

  it("identifies through PostHog after initAnalytics initializes the client", async () => {
    const { identify, initAnalytics } = await loadAnalytics({ key: "ph_test_key" });

    initAnalytics();
    identify("user-123", { plan: "paid-beta" });

    await vi.waitFor(() => expect(posthogMock.identify).toHaveBeenCalledOnce());
    expect(posthogMock.identify).toHaveBeenCalledWith("user-123", { plan: "paid-beta" });
  });
});
