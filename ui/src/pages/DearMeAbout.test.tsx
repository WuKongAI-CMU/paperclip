// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeAbout } from "./DearMeAbout";

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

describe("DearMeAbout", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DearMeAbout />);
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

  it("renders the founder story and beta posture", () => {
    const text = container.textContent ?? "";

    expect(text).toContain("Founder story");
    expect(text).toContain("Peter is using DearMe as customer zero");
    expect(text).toContain("public proof");
    expect(text).toContain("writing cadence");
    expect(text).toContain("opportunity follow-up");
    expect(text).toContain("Dogfood first");
    expect(text).toContain("Owner keeps the call");
    expect(text).toContain("$29/month");
    expect(text).toContain("three-day free trial");
  });

  it("sets clear trust boundaries for the beta", () => {
    const text = container.textContent ?? "";

    expect(text).toContain("one private cycle");
    expect(text).toContain("review step before anything leaves the room");
    expect(text).toContain("Not for bulk outreach");
    expect(text).toContain("Not for hands-off posting");
    expect(text).toContain("Not for invented authority");
    expect(text).toContain("Not for people who do not want to review public claims");
  });

  it("links to the public beta pages and request invite email", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => link.href.endsWith("/pricing"))).toBe(true);
    expect(links.some((link) => link.href.endsWith("/faq"))).toBe(true);
    expect(links.some((link) => link.href.startsWith("mailto:peter@dearme.app"))).toBe(true);
  });

  it("tracks request invite clicks without customer identifiers", async () => {
    const inviteLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.includes("Request invite"));
    expect(inviteLink).toBeDefined();
    inviteLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      inviteLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_invite_requested", {
      page: "about",
      source: "nav",
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
    const pricingLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.trim() === "Pricing");
    expect(pricingLink).toBeDefined();
    pricingLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      pricingLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_pricing_clicked", {
      page: "about",
      source: "nav",
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

  it("tracks proof clicks without customer identifiers", async () => {
    const proofLink = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .find((link) => link.textContent?.trim() === "Proof");
    expect(proofLink).toBeDefined();
    proofLink?.addEventListener("click", (event) => event.preventDefault(), { capture: true });

    await act(async () => {
      proofLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(analyticsMock.capture).toHaveBeenCalledWith("static_proof_clicked", {
      page: "about",
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

  it("does not leak internal or vendor wording", () => {
    const text = container.textContent ?? "";

    for (const forbidden of forbiddenCustomerTerms) {
      expect(text).not.toMatch(new RegExp(forbidden, "i"));
    }
  });
});
