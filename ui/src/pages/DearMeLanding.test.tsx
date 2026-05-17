// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeLanding, resolveLandingCopyVariant } from "./DearMeLanding";

const analyticsMock = vi.hoisted(() => ({
  capture: vi.fn(),
  resolveFeatureFlagValue: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analyticsMock);

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

describe("resolveLandingCopyVariant", () => {
  it("resolves only the three supported landing copy variants", () => {
    expect(resolveLandingCopyVariant("control").headline).toBe("DearMe is a private AI growth team for one person.");
    expect(resolveLandingCopyVariant("proof-first").headline).toBe(
      "Before: scattered proof. After: one private growth cycle ready to review.",
    );
    expect(resolveLandingCopyVariant("proof-first").question).toBe(
      "What proof should DearMe organize into a before-and-after?",
    );
    expect(resolveLandingCopyVariant("opportunity-first").headline).toBe(
      "Start with your weekly letter samples, then decide what should ship.",
    );
    expect(resolveLandingCopyVariant("opportunity-first").submitLabel).toBe("Preview my weekly letter");
    expect(resolveLandingCopyVariant("unknown").key).toBe("control");
    expect(resolveLandingCopyVariant(true).key).toBe("control");
  });
});

describe("DearMeLanding", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    analyticsMock.resolveFeatureFlagValue.mockResolvedValue("control");
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
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("renders the hero positioning sentence", () => {
    expect(container.textContent).toContain("DearMe is a private AI growth team for one person.");
  });

  it("renders reader-first copy and three concrete proof artifacts above the fold", () => {
    const renderedText = container.textContent ?? "";

    expect(renderedText).toContain("Give it the work you want to be known for.");
    expect(renderedText).toContain("Weekly letter excerpt");
    expect(renderedText).toContain("Voice profile excerpt");
    expect(renderedText).toContain("Opportunity card");
    expect(renderedText).toContain("turn that quote into the opening post");
    expect(renderedText).toContain("Short sentences land best");
    expect(renderedText).toContain("offer a 15-minute teardown");
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
    expect(document.activeElement).toBe(container.querySelector("#dearme-known-for"));
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
    expect(window.sessionStorage.getItem("dearme:landing-known-for")).toBe(
      "Known for practical AI product launches",
    );
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_cta_submitted", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
      positioning_length: 39,
    });
  });

  it("restores the positioning answer when users return from onboarding", async () => {
    window.sessionStorage.setItem("dearme:landing-known-for", "Known for onboarding loops");

    await act(async () => {
      root.unmount();
    });
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
          </Routes>
        </MemoryRouter>,
      );
    });
    await flushReact();

    expect(container.querySelector<HTMLTextAreaElement>("#dearme-known-for")?.value).toBe(
      "Known for onboarding loops",
    );
  });

  it("renders and tracks the selected feature-flagged landing copy variant", async () => {
    expect(analyticsMock.resolveFeatureFlagValue).toHaveBeenCalledWith("dearme_landing_copy", "control");
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_viewed", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
    });
  });

  it("renders the before-and-after hero variant", async () => {
    analyticsMock.resolveFeatureFlagValue.mockResolvedValue("proof-first");

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<DearMeLanding />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Before: scattered proof. After: one private growth cycle ready to review.");
    expect(container.textContent).toContain("organize into a before-and-after");
    expect(container.textContent).toContain("Show my before and after");
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_viewed", {
      landing_copy_variant: "proof-first",
      landing_hero_theme: "before_after",
    });
  });

  it("renders the weekly-letter-samples hero variant", async () => {
    analyticsMock.resolveFeatureFlagValue.mockResolvedValue("opportunity-first");

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<DearMeLanding />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Start with your weekly letter samples, then decide what should ship.");
    expect(container.textContent).toContain("What should this week's DearMe letter be about?");
    expect(container.textContent).toContain("Preview my weekly letter");
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_viewed", {
      landing_copy_variant: "opportunity-first",
      landing_hero_theme: "weekly_letter_samples",
    });
  });

  it("does not expose hidden substrate or secret strings", () => {
    const renderedText = container.textContent ?? "";

    expect(renderedText).not.toContain("Paperclip");
    expect(renderedText).not.toContain("OpenClaw");
    expect(renderedText).not.toContain("Symphony");
    expect(renderedText).not.toContain("Bedrock");
    expect(renderedText).not.toContain("Claude");
    expect(renderedText).not.toContain("GPT");
    expect(renderedText).not.toContain("Voyage");
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
