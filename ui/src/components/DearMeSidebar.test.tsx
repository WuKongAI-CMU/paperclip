// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeSidebar } from "./DearMeSidebar";

const mockLocation = vi.hoisted(() => ({
  pathname: "/PET/dearme",
  search: "",
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => mockLocation,
}));

vi.mock("./SidebarCompanyMenu", () => ({
  SidebarCompanyMenu: () => <div>Peter Studio</div>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("DearMeSidebar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockLocation.pathname = "/PET/dearme";
    mockLocation.search = "";
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("shows customer-facing personal brand navigation without substrate links", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeSidebar />);
    });

    expect(container.textContent).toContain("Personal brand team");
    expect(container.textContent).toContain("Work Ready");
    expect(container.textContent).toContain("Voice & Memory");
    expect(container.textContent).toContain("Opportunities");
    expect(container.textContent).toContain("Portfolio");
    expect(container.textContent).toContain("Reports");
    expect(container.textContent).not.toContain("Issues");
    expect(container.textContent).not.toContain("Routines");
    expect(container.textContent).not.toContain("Agents");
    expect(container.textContent).not.toContain("Workspaces");
    expect(container.textContent).not.toContain("Plugins");
    expect(container.textContent).not.toContain("Costs");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps decisions active for the decisions view", async () => {
    mockLocation.search = "?view=decisions";
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeSidebar />);
    });

    const activeLink = container.querySelector("a[aria-current='page']");
    expect(activeLink?.textContent).toContain("Decisions");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps decisions active for focused decision URLs", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeSidebar />);
    });

    const activeLink = container.querySelector("a[aria-current='page']");
    expect(activeLink?.textContent).toContain("Decisions");

    await act(async () => {
      root.unmount();
    });
  });
});
