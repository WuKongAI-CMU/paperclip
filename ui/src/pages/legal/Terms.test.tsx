// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Terms } from "./Terms";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Terms", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Terms />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("renders expected sections without substrate language", () => {
    const text = container.textContent ?? "";

    for (const heading of [
      "Service",
      "Account",
      "Acceptable Use",
      "Payment",
      "Termination",
      "Liability cap",
      "Disputes",
      "Updates",
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).not.toContain("Paperclip");
    expect(text).not.toContain("OpenClaw");
    expect(text).not.toContain("Polsia");
  });
});
