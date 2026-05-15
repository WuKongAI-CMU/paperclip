// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Privacy } from "./Privacy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Privacy", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Privacy />);
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
      "Data we collect",
      "Purpose",
      "Retention",
      "Subprocessors",
      "DSR rights",
      "Contact",
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).not.toContain("Paperclip");
    expect(text).not.toContain("OpenClaw");
    expect(text).not.toContain("Polsia");
  });
});
