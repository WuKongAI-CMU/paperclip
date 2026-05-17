// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DearMeCheckoutReturn,
  type DearMeCheckoutReturnKind,
} from "./DearMeCheckoutReturn";

const analyticsMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analyticsMock);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const forbiddenCustomerTerms = [
  ["Paper", "clip"],
  ["Open", "Claw"],
  ["Sym", "phony"],
  ["Bed", "rock"],
  ["dm", "_sk_"],
  ["Clau", "de"],
  ["G", "PT"],
  ["Voy", "age"],
].map((parts) => parts.join(""));

async function renderReturnPage(kind: DearMeCheckoutReturnKind) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<DearMeCheckoutReturn kind={kind} />);
  });

  return { container, root };
}

describe("DearMeCheckoutReturn", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
  });

  it("sends successful checkout returns back to paid access", async () => {
    window.history.replaceState(null, "", "/dearme/checkout/success?session_id=checkout-session-1");
    const { container, root } = await renderReturnPage("success");
    const text = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(text).toContain("Payment received");
    expect(text).toContain("private cycle is being confirmed");
    expect(text).toContain("Receipt match");
    expect(
      links.some(
        (link) =>
          link.getAttribute("href") ===
          "/dearme?checkout_return=success#dearme-paid-beta-access",
      ),
    ).toBe(true);
    expect(links.some((link) => link.getAttribute("href") === "/dearme?checkout_return=success"))
      .toBe(true);
    expect(analyticsMock.capture).toHaveBeenCalledWith("checkout_return_viewed", {
      status: "success",
      source: "direct",
      has_session_marker: true,
      has_cancel_marker: false,
    });

    await act(async () => {
      root.unmount();
    });
  });

  it("sends cancelled checkout returns to the close kit or pricing", async () => {
    window.history.replaceState(null, "", "/dearme/checkout/cancel?checkout=cancelled");
    const { container, root } = await renderReturnPage("cancel");
    const text = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(text).toContain("No payment was recorded");
    expect(text).toContain("Return to close kit");
    expect(text).toContain("Review the offer");
    expect(
      links.some(
        (link) =>
          link.getAttribute("href") === "/dearme?checkout_return=cancel#dearme-paid-beta-access",
      ),
    ).toBe(true);
    expect(links.some((link) => link.getAttribute("href") === "/pricing")).toBe(true);
    expect(analyticsMock.capture).toHaveBeenCalledWith("checkout_return_viewed", {
      status: "cancel",
      source: "direct",
      has_session_marker: false,
      has_cancel_marker: true,
    });

    await act(async () => {
      root.unmount();
    });
  });

  it("does not leak internal or vendor wording", async () => {
    const success = await renderReturnPage("success");
    const cancel = await renderReturnPage("cancel");
    const text = document.body.textContent ?? "";

    for (const forbidden of forbiddenCustomerTerms) {
      expect(text).not.toMatch(new RegExp(forbidden, "i"));
    }

    await act(async () => {
      success.root.unmount();
      cancel.root.unmount();
    });
  });

  it("records an allowlisted checkout return source without leaking arbitrary query text", async () => {
    window.history.replaceState(
      null,
      "",
      "/dearme/checkout/success?source=pricing&session_id=checkout-session-1&knownFor=Private%20brief",
    );
    const { root } = await renderReturnPage("success");

    expect(analyticsMock.capture).toHaveBeenCalledWith("checkout_return_viewed", {
      status: "success",
      source: "pricing",
      has_session_marker: true,
      has_cancel_marker: false,
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "checkout_return_viewed",
      expect.objectContaining({
        knownFor: expect.any(String),
      }),
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("falls back to direct for unknown checkout return sources", async () => {
    window.history.replaceState(
      null,
      "",
      "/dearme/checkout/cancel?source=private-note&checkout=cancelled",
    );
    const { root } = await renderReturnPage("cancel");

    expect(analyticsMock.capture).toHaveBeenCalledWith("checkout_return_viewed", {
      status: "cancel",
      source: "direct",
      has_session_marker: false,
      has_cancel_marker: true,
    });

    await act(async () => {
      root.unmount();
    });
  });
});
