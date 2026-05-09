// @vitest-environment jsdom

import { act } from "react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstanceSidebar } from "./InstanceSidebar";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock("./SidebarNavItem", () => ({
  SidebarNavItem: ({
    label,
    icon: Icon,
  }: {
    label: string;
    icon: ComponentType<{ className?: string }>;
  }) => (
    <a>
      <Icon className="icon" />
      {label}
    </a>
  ),
}));

vi.mock("@/lib/router", () => ({
  NavLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("InstanceSidebar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it("labels runner settings as run methods", () => {
    const root = createRoot(container);

    act(() => {
      root.render(<InstanceSidebar />);
    });

    expect(container.textContent).toContain("Run methods");
    expect(container.textContent).not.toContain("Adapters");

    act(() => {
      root.unmount();
    });
  });
});
