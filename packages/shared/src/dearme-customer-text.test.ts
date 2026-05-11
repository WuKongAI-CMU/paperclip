import { describe, expect, it } from "vitest";
import {
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
  compactDearMeCustomerText,
  dearMeCustomerSafeText,
} from "./dearme-customer-text.js";

describe("DearMe customer text", () => {
  it("detects hidden implementation language without blocking product copy", () => {
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("OpenClaw provider token failed")).toBe(true);
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("Claude model-provider failed in the decision route")).toBe(true);
    expect(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test("Your Website preview is ready for review")).toBe(false);
  });

  it("compacts generated text before customer-safe rendering", () => {
    expect(compactDearMeCustomerText("Ready\n\n```raw trace```\n  for review")).toBe("Ready for review");
  });

  it("translates hidden machinery into customer-safe language", () => {
    const text =
      "OpenClaw Symphony adapter provider runtime model setup_payload queued worker with API key token in raw control plane.";
    const safe = dearMeCustomerSafeText(text, "DearMe is preparing the next update.");

    expect(safe).toContain("A private pass");
    expect(safe).not.toMatch(DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN);
  });

  it("uses the fallback when text is empty after compaction", () => {
    expect(dearMeCustomerSafeText("   ", "DearMe is preparing the next update.")).toBe(
      "DearMe is preparing the next update.",
    );
  });
});
