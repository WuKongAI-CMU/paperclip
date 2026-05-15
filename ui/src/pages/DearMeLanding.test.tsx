// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeLanding } from "./DearMeLanding";

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompany: null,
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
  });
}

function setTextareaValue(input: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function installIndexHead() {
  const html = readFileSync("index.html", "utf8");
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
  if (!headMatch) {
    throw new Error("ui/index.html is missing a <head> section");
  }
  document.head.innerHTML = headMatch[1];
}

describe("DearMeLanding", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    installIndexHead();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <DearMeLanding />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/dearme" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await flushReact();
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container?.remove();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders the hero positioning sentence", () => {
    expect(container.textContent).toContain("DearMe is a private AI growth team for one person.");
  });

  it("renders the single-question input", () => {
    const input = container.querySelector<HTMLTextAreaElement>("#dearme-known-for");

    expect(container.textContent).toContain("What do you want to be known for?");
    expect(input).not.toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
  });

  it("blocks submit with an empty input", async () => {
    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(container.textContent).toContain("Answer the question to start your first cycle.");
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/");
  });

  it("navigates to onboarding with the positioning answer in search params", async () => {
    const input = container.querySelector<HTMLTextAreaElement>("#dearme-known-for");
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setTextareaValue(input!, "Known for practical AI product launches");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/dearme?knownFor=Known+for+practical+AI+product+launches",
    );
  });

  it("does not expose hidden substrate or secret strings", () => {
    const renderedText = container.textContent ?? "";

    expect(renderedText).not.toContain("Paperclip");
    expect(renderedText).not.toContain("OpenClaw");
    expect(renderedText).not.toContain("Symphony");
    expect(renderedText).not.toContain("dm_sk_");
  });

  it("serves canonical and Open Graph metadata from the document head", () => {
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');

    expect(canonical?.href).toBe("https://dearme.app/");
    expect(ogTitle?.content).toBe("DearMe — your private AI growth team");
    expect(ogDescription?.content).toContain("DearMe is a private AI growth team for one person.");
  });
});
