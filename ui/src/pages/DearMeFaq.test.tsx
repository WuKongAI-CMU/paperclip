// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeFaq } from "./DearMeFaq";

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

describe("DearMeFaq", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DearMeFaq />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders 12 customer-objection FAQ items for beta conversion", () => {
    const sections = Array.from(container.querySelectorAll("section"));
    const text = container.textContent ?? "";

    expect(sections).toHaveLength(12);
    expect(text).toContain("What does DearMe actually do for me?");
    expect(text).toContain("Who is the $29 beta for?");
    expect(text).toContain("What happens in the first three days?");
    expect(text).toContain("Will it post or message from my account automatically?");
    expect(text).toContain("Is this safe to use with LinkedIn?");
    expect(text).toContain("How do you keep it from sounding unlike me?");
    expect(text).toContain("Can I take my work with me?");
    expect(text).toContain("Can I cancel?");
  });

  it("keeps the beta in request-invite mode", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => link.href.endsWith("/about"))).toBe(true);
    expect(links.some((link) => link.href.endsWith("/pricing"))).toBe(true);
    expect(links.some((link) => link.href.startsWith("mailto:peter@dearme.app"))).toBe(true);
    expect(container.textContent).toContain("Any paid continuation is shown before purchase");
  });

  it("tracks invite and beta question clicks without customer identifiers", async () => {
    const mailtoLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .filter((link) => link.href.startsWith("mailto:peter@dearme.app"));
    expect(mailtoLinks).toHaveLength(2);
    mailtoLinks.forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault(), { capture: true });
    });

    await act(async () => {
      mailtoLinks[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      mailtoLinks[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_invite_requested", {
      page: "faq",
      source: "nav",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).toHaveBeenCalledWith("static_invite_requested", {
      page: "faq",
      source: "question",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_invite_requested",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("tracks pricing clicks without customer identifiers", async () => {
    const pricingLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .filter((link) => link.textContent?.includes("Pricing") || link.textContent?.includes("See beta pricing"));
    expect(pricingLinks).toHaveLength(2);
    pricingLinks.forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault(), { capture: true });
    });

    await act(async () => {
      pricingLinks[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      pricingLinks[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_pricing_clicked", {
      page: "faq",
      source: "nav",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).toHaveBeenCalledWith("static_pricing_clicked", {
      page: "faq",
      source: "question",
      plan: "beta_29",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "static_pricing_clicked",
      expect.objectContaining({
        email: expect.any(String),
        href: expect.any(String),
      }),
    );
  });

  it("handles the hard objections without promising unsafe automation", () => {
    const text = container.textContent ?? "";

    expect(text).toContain("Public posts, direct messages, deploys, and paid spend require your explicit approval");
    expect(text).toContain("low-volume, relationship-based, and approved by you before it is sent");
    expect(text).toContain("If a draft drifts, it should come back for another pass");
    expect(text).toContain("proof pages, drafts, weekly letters, opportunity notes, and review decisions");
    expect(text).toContain("Do not use it for spam, deception, scraped lists, harassment");
  });

  it("does not leak internal or vendor wording", () => {
    const text = container.textContent ?? "";

    for (const forbidden of forbiddenCustomerTerms) {
      expect(text).not.toMatch(new RegExp(forbidden, "i"));
    }
  });
});
