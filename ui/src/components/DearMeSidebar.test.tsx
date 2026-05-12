// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeMobileNav, DearMeSidebar } from "./DearMeSidebar";

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

    expect(container.textContent).toContain("Brand workroom");
    expect(container.textContent).toContain("Private proof ready");
    expect(container.textContent).toContain("Work is usable for private review.");
    expect(container.textContent).toContain("Launch calls");
    expect(container.textContent).toContain("Public moves wait for your rules.");
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

    const readiness = container.querySelector('[aria-label="DearMe readiness status"]');
    expect(readiness?.querySelector('a[href="/dearme?view=work-ready"]')?.textContent).toContain(
      "Private proof ready",
    );
    expect(readiness?.querySelector('a[href="/dearme?view=decisions"]')?.textContent).toContain(
      "Launch calls",
    );

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

  it("shows a compact DearMe mobile navigation without generic workspace links", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeMobileNav visible onOpenMenu={vi.fn()} />);
    });

    expect(container.querySelector("nav[aria-label='DearMe mobile navigation']")).not.toBeNull();
    expect(container.textContent).toContain("Workroom");
    expect(container.textContent).toContain("Decisions");
    expect(container.textContent).toContain("Work Ready");
    expect(container.textContent).toContain("Voice");
    expect(container.textContent).toContain("More");
    expect(container.textContent).not.toContain("Issues");
    expect(container.textContent).not.toContain("Agents");
    expect(container.textContent).not.toContain("Inbox");
    expect(container.textContent).not.toContain("Plugins");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens the full DearMe menu from mobile navigation", async () => {
    const onOpenMenu = vi.fn();
    const root = createRoot(container);

    await act(async () => {
      root.render(<DearMeMobileNav visible onOpenMenu={onOpenMenu} />);
    });

    const menuButton = container.querySelector<HTMLButtonElement>("button[aria-label='Open DearMe menu']");
    expect(menuButton).not.toBeNull();
    await act(async () => {
      menuButton?.click();
    });
    expect(onOpenMenu).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
