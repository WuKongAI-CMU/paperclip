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

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
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
    vi.unstubAllGlobals();
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
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_cta_blocked", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
      reason: "missing_positioning_answer",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "landing_cta_blocked",
      expect.objectContaining({
        knownFor: expect.any(String),
        positioning_answer: expect.any(String),
      }),
    );
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

  it("opens a soft exit-intent waitlist modal and sends the Loops-backed request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ status: "accepted" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mouseleave", { clientY: -1 }));
    });
    await flushReact();

    expect(container.textContent).toContain("Want a 5-minute preview emailed to you?");
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_exit_intent_seen", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
    });

    const input = container.querySelector<HTMLInputElement>("#dearme-exit-email");
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "reader@example.com");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(fetchMock).toHaveBeenCalledWith("/api/dearme/landing-exit-waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "reader@example.com",
        landingCopyVariant: "control",
        landingHeroTheme: "private_growth_team",
      }),
    });
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_exit_waitlist_submitted", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
      source: "exit_intent",
    });
    expect(container.textContent).toContain("Preview requested");
  });

  it("dismisses the exit-intent modal without capturing an email", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mouseleave", { clientY: -1 }));
    });
    await flushReact();

    const dismissButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Not now"),
    );
    expect(dismissButton).toBeDefined();

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushReact();

    expect(container.textContent).not.toContain("Want a 5-minute preview emailed to you?");
    expect(window.sessionStorage.getItem("dearme:landing-exit-waitlist-dismissed")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks invalid exit-intent emails without sending the waitlist request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mouseleave", { clientY: -1 }));
    });
    await flushReact();

    const input = container.querySelector<HTMLInputElement>("#dearme-exit-email");
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "not-email");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(container.textContent).toContain("Enter a work email for the preview.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_exit_waitlist_blocked", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
      source: "exit_intent",
      reason: "invalid_email",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "landing_exit_waitlist_blocked",
      expect.objectContaining({
        email: expect.any(String),
      }),
    );
  });

  it("tracks failed exit-intent waitlist requests without capturing the email", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "request_failed" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mouseleave", { clientY: -1 }));
    });
    await flushReact();

    const input = container.querySelector<HTMLInputElement>("#dearme-exit-email");
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      setInputValue(input!, "reader@example.com");
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await flushReact();

    expect(container.textContent).toContain(
      "We could not save that. Email peter@dearme.app and we will send it manually.",
    );
    expect(analyticsMock.capture).toHaveBeenCalledWith("landing_exit_waitlist_failed", {
      landing_copy_variant: "control",
      landing_hero_theme: "private_growth_team",
      source: "exit_intent",
      reason: "request_failed",
    });
    expect(analyticsMock.capture).not.toHaveBeenCalledWith("landing_exit_waitlist_submitted", expect.any(Object));
    expect(analyticsMock.capture).not.toHaveBeenCalledWith(
      "landing_exit_waitlist_failed",
      expect.objectContaining({
        email: expect.any(String),
      }),
    );
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
