// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DearMePricing } from "./DearMePricing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
  });

  it("renders the invite-only beta plan", () => {
    expect(container.textContent).toContain("Private beta pricing");
    expect(container.textContent).toContain("Beta");
    expect(container.textContent).toContain("$29");
    expect(container.textContent).toContain("per month");
    expect(container.textContent).toContain("Three-day free trial");
    expect(container.textContent).toContain("Request access");
  });

  it("keeps the page in request-access mode", () => {
    const accessLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))
      .filter((link) => link.textContent?.includes("Request access"));

    expect(accessLinks.length).toBeGreaterThan(0);
    expect(accessLinks.every((link) => link.href.startsWith("mailto:peter@dearme.app"))).toBe(true);
    expect(container.textContent).toContain("Hosted payment opens after the invite gate lifts.");
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
