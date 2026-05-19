// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMePricing } from "./DearMePricing";

const analyticsMock = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analyticsMock);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("DearMePricing", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DearMePricing />);
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container?.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the invite-only beta plan", () => {
    expect(container.textContent).toContain("Private beta pricing");
    expect(container.textContent).toContain("Beta");
    expect(container.textContent).toContain("$29");
    expect(container.textContent).toContain("per month");
    expect(container.textContent).toContain("Three-day free trial");
    expect(container.textContent).toContain("Start the 3-day trial");
    expect(container.textContent).toContain("See the product first");
  });

  it("tracks pricing page views without customer identifiers", () => {
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_viewed", {
      source: "pricing",
      plan: "beta_29",
      checkout_ready: false,
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_viewed",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("links trial and product preview without starting payment from the page", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => (
      link.textContent?.includes("Start the 3-day trial") &&
      link.href.endsWith("/dearme?signup_source=pricing")
    ))).toBe(true);
    expect(links.some((link) => (
      link.textContent?.includes("See the product first") && link.href.endsWith("/landing")
    ))).toBe(true);
    expect(container.textContent).toContain("Hosted payment opens after the invite gate lifts.");
  });

  it("tracks pricing trial starts without starting payment", async () => {
    const trialLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .filter((link) => link.textContent?.includes("Start the 3-day trial"));
    expect(trialLinks).toHaveLength(2);
    trialLinks.forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault(), { capture: true });
    });

    await act(async () => {
      trialLinks[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      trialLinks[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_trial_started", {
      source: "hero",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_trial_started", {
      source: "plan",
      plan: "beta_29",
    });
    expect(container.textContent).toContain("Until then, no payment starts from this page.");
  });

  it("tracks manual beta access requests without customer identifiers", async () => {
    const accessLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("Request access"));
    expect(accessLink).toBeDefined();
    accessLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      accessLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_access_requested", {
      source: "pricing_nav",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_access_requested",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("tracks product preview clicks without customer identifiers", async () => {
    const previewLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("See the product first"));
    expect(previewLink).toBeDefined();
    previewLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      previewLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_product_preview_clicked", {
      source: "hero",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_product_preview_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("tracks proof clicks without customer identifiers", async () => {
    const proofLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.trim() === "Proof");
    expect(proofLink).toBeDefined();
    proofLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      proofLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_proof_clicked", {
      page: "pricing",
      source: "nav",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_proof_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("tracks feed clicks without customer identifiers", async () => {
    const feedLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.trim() === "Feed");
    expect(feedLink).toBeDefined();
    feedLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      feedLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_feed_clicked", {
      page: "pricing",
      source: "nav",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_feed_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("renders a pricing proof rail with feed and proof handoffs", () => {
    const text = container.textContent ?? "";
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(text).toContain("Customer-zero proof");
    expect(text).toContain("Inspect the dogfood trail before you ask for a seat.");
    expect(links.some((link) => (
      link.textContent?.includes("View the dogfood feed") && link.href.endsWith("/feed")
    ))).toBe(true);
    expect(links.some((link) => (
      link.textContent?.includes("Open proof archive") && link.href.endsWith("/proof")
    ))).toBe(true);
  });

  it("tracks pricing proof rail handoffs without customer identifiers", async () => {
    const feedLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("View the dogfood feed"));
    const proofLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("Open proof archive"));
    expect(feedLink).toBeDefined();
    expect(proofLink).toBeDefined();
    feedLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });
    proofLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      feedLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      proofLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_feed_clicked", {
      page: "pricing",
      source: "proof_rail",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).toHaveBeenCalledWith("static_proof_clicked", {
      page: "pricing",
      source: "proof_rail",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_feed_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_proof_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("collects a waitlist email and fires the pricing event", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ status: "accepted" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const input = container.querySelector<HTMLInputElement>("#dearme-pricing-email");
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "founder@example.com");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/dearme/pricing-waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "founder@example.com",
        plan: "beta_29",
      }),
    });
    expect(container.textContent).toContain("You are on the beta waitlist.");
    expect(container.textContent).toContain("Start trial preview");
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_waitlist_joined", {
      source: "pricing",
      plan: "beta_29",
    });
  });

  it("sends captured waitlist users into the trial preview without customer identifiers", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ status: "accepted" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const input = container.querySelector<HTMLInputElement>("#dearme-pricing-email");
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "founder@example.com");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const trialLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("Start trial preview"));
    expect(trialLink?.href).toMatch(/\/dearme\?signup_source=pricing$/);
    trialLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      trialLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_trial_started", {
      source: "waitlist_success",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_trial_started",
      expect.objectContaining({
        email: expect.any(String),
      }),
    );
  });

  it("shows a manual fallback when pricing waitlist delivery fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ status: "lifecycle_failed" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const input = container.querySelector<HTMLInputElement>("#dearme-pricing-email");
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "founder@example.com");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain("Email peter@dearme.app and we will add you manually.");
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_waitlist_failed", {
      source: "pricing",
      plan: "beta_29",
      reason: "request_failed",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_waitlist_joined",
      expect.anything(),
    );
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_waitlist_failed",
      expect.objectContaining({
        email: expect.any(String),
      }),
    );
  });

  it("blocks invalid waitlist emails without tracking", async () => {
    const input = container.querySelector<HTMLInputElement>("#dearme-pricing-email");
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "founder");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain("Enter a work email to join the private beta waitlist.");
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_waitlist_blocked", {
      source: "pricing",
      plan: "beta_29",
      reason: "invalid_email",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "pricing_waitlist_blocked",
      expect.objectContaining({
        email: expect.any(String),
      }),
    );
  });

  it("renders five objection-handling FAQ items", () => {
    const faqItems = Array.from(container.querySelectorAll("details"));
    const text = container.textContent ?? "";

    expect(faqItems).toHaveLength(5);
    expect(text).toContain("What happens during the three-day trial?");
    expect(text).toContain("Do public posts or messages go out automatically?");
    expect(text).toContain("Can I see the product before joining?");
    expect(text).toContain("Why is the beta invite-only?");
    expect(text).toContain("Can I cancel before paying?");
  });

  it("does not leak internal or vendor wording", () => {
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

    for (const forbidden of forbiddenCustomerTerms) {
      expect(container.textContent).not.toMatch(new RegExp(forbidden, "i"));
    }
  });
});
