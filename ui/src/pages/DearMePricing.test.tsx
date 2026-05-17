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

  it("links trial and product preview without starting payment from the page", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => (
      link.textContent?.includes("Start the 3-day trial") && link.href.endsWith("/dearme")
    ))).toBe(true);
    expect(links.some((link) => (
      link.textContent?.includes("See the product first") && link.href.endsWith("/landing")
    ))).toBe(true);
    expect(container.textContent).toContain("Hosted payment opens after the invite gate lifts.");
  });

  it("collects a waitlist email and fires the pricing event", async () => {
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

    expect(container.textContent).toContain("You are on the beta waitlist.");
    expect(analyticsMock.capture).toHaveBeenCalledWith("pricing_waitlist_joined", {
      source: "pricing",
      plan: "beta_29",
    });
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
    expect(analyticsMock.capture).not.toHaveBeenCalled();
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
