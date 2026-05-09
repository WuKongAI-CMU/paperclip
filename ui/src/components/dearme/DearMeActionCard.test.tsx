// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeActionCard } from "./DearMeActionCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("DearMeActionCard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders a team action summary with review controls", async () => {
    const root = createRoot(container);
    const onClick = vi.fn();

    await act(async () => {
      root.render(
        <DearMeActionCard
          eyebrow="Review · Voice Editor"
          title="LinkedIn draft is ready"
          summary="The team prepared a post from yesterday's shipped work."
          statusBadges={[
            { label: "Content draft", variant: "outline" },
            { label: "Needs your call", variant: "secondary" },
          ]}
          chips={[
            { label: "Draft post", variant: "outline" },
            { label: "Decision ready", variant: "default" },
          ]}
          calloutLabel="Next action"
          callout="Approve, request changes, or ask the team to regenerate it."
          action={{
            label: "Review now",
            ariaLabel: "Review now: LinkedIn draft is ready",
            onClick,
            variant: "default",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Review · Voice Editor");
    expect(container.textContent).toContain("LinkedIn draft is ready");
    expect(container.textContent).toContain("Needs your call");
    expect(container.textContent).toContain(
      "Approve, request changes, or ask the team to regenerate it.",
    );
    expect(container.querySelector('[data-dearme-surface="action-card"]')).not.toBeNull();

    const actionButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Review now: LinkedIn draft is ready"]',
    );
    expect(actionButton).not.toBeNull();

    await act(async () => {
      actionButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it("renders paused and retry attention states without substrate language", async () => {
    const root = createRoot(container);
    const onContinue = vi.fn();
    const onRetry = vi.fn();

    await act(async () => {
      root.render(
        <div>
          <DearMeActionCard
            title="Audience choice is paused"
            summary="The team has two viable directions and needs your call before continuing."
            attention={{
              kind: "paused",
              label: "Waiting on your decision",
              detail: "Pick the audience angle so the team can continue the draft.",
            }}
            action={{
              label: "Continue",
              ariaLabel: "Continue: audience choice is paused",
              onClick: onContinue,
            }}
          />
          <DearMeActionCard
            title="Draft needs another pass"
            summary="The latest version missed your positioning rule."
            attention={{
              kind: "retry",
              label: "Another pass is ready",
              detail: "Ask the team to revise the draft using the saved voice guidance.",
            }}
            action={{
              label: "Try again",
              ariaLabel: "Try again: draft needs another pass",
              onClick: onRetry,
            }}
          />
        </div>,
      );
    });

    expect(container.querySelector('[data-dearme-action-attention="paused"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-action-attention="retry"]')).not.toBeNull();
    expect(container.textContent).toContain("Waiting on your decision");
    expect(container.textContent).toContain("Another pass is ready");
    const renderedText = container.textContent?.toLowerCase() ?? "";
    const hiddenTerms = [
      ["Paper", "clip"].join(""),
      ["Open", "Claw"].join(""),
      ["adap", "ter"].join(""),
      ["pro", "vider"].join(""),
      ["model", ["pro", "vider"].join("")].join("-"),
      ["setup", "payload"].join("-"),
      ["control", "plane"].join("-"),
      ["raw", "issue"].join(" "),
    ];
    hiddenTerms.forEach((term) => {
      expect(renderedText).not.toContain(term.toLowerCase());
    });

    const continueButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Continue: audience choice is paused"]',
    );
    const retryButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Try again: draft needs another pass"]',
    );

    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
