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
});
