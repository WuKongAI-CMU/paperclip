// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevRestartBanner } from "./DevRestartBanner";
import type { DevServerHealthStatus } from "../api/health";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(ui);
  });

  return container;
}

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

function devServerStatus(overrides: Partial<DevServerHealthStatus> = {}): DevServerHealthStatus {
  return {
    enabled: true,
    restartRequired: true,
    reason: "backend_changes",
    changedPathCount: 1,
    changedPathsSample: ["scripts/dearme-provider-smoke.ts"],
    pendingMigrations: [],
    autoRestartEnabled: false,
    activeRunCount: 0,
    waitingForIdle: false,
    lastChangedAt: new Date().toISOString(),
    lastRestartAt: null,
    ...overrides,
  };
}

describe("DevRestartBanner", () => {
  it("summarizes changed files without rendering backend paths", () => {
    const page = render(<DevRestartBanner devServer={devServerStatus()} />);

    expect(page.textContent).toContain("1 changed file");
    expect(page.textContent).not.toContain("scripts/dearme-provider-smoke.ts");
    expect(page.textContent).not.toContain("provider");
  });
});
