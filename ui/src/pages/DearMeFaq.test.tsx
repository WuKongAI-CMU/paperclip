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
