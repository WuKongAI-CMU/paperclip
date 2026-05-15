// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DearMeErrorPage } from "./DearMeErrorPages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("DearMeErrorPage", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("renders DearMe-original 404 copy", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeErrorPage kind="404" />);
    });

    expect(container.textContent).toContain("This letter did not land.");
    expect(container.textContent).toContain("Open DearMe");
    expect(container.textContent).not.toContain("Paperclip");
    expect(container.textContent).not.toContain("OpenClaw");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders DearMe-original 500 copy", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeErrorPage kind="500" />);
    });

    expect(container.textContent).toContain("The workroom hit a snag.");
    expect(container.textContent).toContain("Return to DearMe");
    expect(container.textContent).not.toContain("Paperclip");
    expect(container.textContent).not.toContain("OpenClaw");

    await act(async () => {
      root.unmount();
    });
  });
});
