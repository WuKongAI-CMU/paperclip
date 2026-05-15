// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DearMeAbout } from "./DearMeAbout";

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
  });

  it("renders the founder story and beta posture", () => {
    const text = container.textContent ?? "";

    expect(text).toContain("Founder story");
    expect(text).toContain("Peter started DearMe");
    expect(text).toContain("Private before public");
    expect(text).toContain("Approvals stay human");
    expect(text).toContain("$29/month");
    expect(text).toContain("three-day free trial");
  });

  it("links to the public beta pages and request invite email", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => link.href.endsWith("/pricing"))).toBe(true);
    expect(links.some((link) => link.href.endsWith("/faq"))).toBe(true);
    expect(links.some((link) => link.href.startsWith("mailto:peter@dearme.app"))).toBe(true);
  });

  it("does not leak internal or vendor wording", () => {
    const text = container.textContent ?? "";

    for (const forbidden of forbiddenCustomerTerms) {
      expect(text).not.toMatch(new RegExp(forbidden, "i"));
    }
  });
});
