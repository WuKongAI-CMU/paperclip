// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DearMeFaq } from "./DearMeFaq";

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
  });

  it("renders 12 beta FAQ items from product and legal posture", () => {
    const sections = Array.from(container.querySelectorAll("section"));
    const text = container.textContent ?? "";

    expect(sections).toHaveLength(12);
    expect(text).toContain("What is DearMe?");
    expect(text).toContain("What happens during the private beta?");
    expect(text).toContain("How much does it cost?");
    expect(text).toContain("Can I cancel?");
    expect(text).toContain("What is the voice gate?");
    expect(text).toContain("Are there cost caps?");
  });

  it("keeps the beta in request-invite mode", () => {
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));

    expect(links.some((link) => link.href.endsWith("/about"))).toBe(true);
    expect(links.some((link) => link.href.endsWith("/pricing"))).toBe(true);
    expect(links.some((link) => link.href.startsWith("mailto:peter@dearme.app"))).toBe(true);
    expect(container.textContent).toContain("any future paid change is shown before purchase");
  });

  it("does not leak internal or vendor wording", () => {
    const text = container.textContent ?? "";

    for (const forbidden of forbiddenCustomerTerms) {
      expect(text).not.toMatch(new RegExp(forbidden, "i"));
    }
  });
});
