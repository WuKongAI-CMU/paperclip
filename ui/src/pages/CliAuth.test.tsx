// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CliAuthPage } from "./CliAuth";

const getSessionMock = vi.hoisted(() => vi.fn());
const getCliAuthChallengeMock = vi.hoisted(() => vi.fn());
const approveCliAuthChallengeMock = vi.hoisted(() => vi.fn());
const cancelCliAuthChallengeMock = vi.hoisted(() => vi.fn());

vi.mock("../api/auth", () => ({
  authApi: {
    getSession: () => getSessionMock(),
  },
}));

vi.mock("../api/access", () => ({
  accessApi: {
    getCliAuthChallenge: (id: string, token: string) => getCliAuthChallengeMock(id, token),
    approveCliAuthChallenge: (id: string, token: string) => approveCliAuthChallengeMock(id, token),
    cancelCliAuthChallenge: (id: string, token: string) => cancelCliAuthChallengeMock(id, token),
  },
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ id: "challenge-1" }),
  useSearchParams: () => [new URLSearchParams("token=token-1")],
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("CliAuthPage", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    getSessionMock.mockResolvedValue({
      session: { id: "session-1", userId: "user-1" },
      user: { id: "user-1", email: "admin@example.com", name: "Admin", image: null },
    });
    getCliAuthChallengeMock.mockResolvedValue({
      id: "challenge-1",
      status: "pending",
      command: "paperclipai auth login",
      clientName: null,
      requestedAccess: "board",
      requestedCompanyName: null,
      requiresSignIn: false,
      canApprove: true,
    });
    approveCliAuthChallengeMock.mockResolvedValue(undefined);
    cancelCliAuthChallengeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("uses DearMe product language for CLI approval", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CliAuthPage />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Approve DearMe CLI access");
    expect(container.textContent).toContain("A local DearMe CLI process is requesting board access");
    expect(container.textContent).toContain("DearMe CLI");
    expect(container.textContent).toContain("paperclipai auth login");
    expect(container.textContent).not.toContain("Paperclip");

    await act(async () => {
      root.unmount();
    });
  });

  it("uses DearMe product language after approval", async () => {
    getCliAuthChallengeMock.mockResolvedValue({
      id: "challenge-1",
      status: "approved",
      command: "paperclipai auth login",
      clientName: null,
      requestedAccess: "board",
      requestedCompanyName: null,
      requiresSignIn: false,
      canApprove: false,
    });

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CliAuthPage />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("The DearMe CLI can now finish authentication");
    expect(container.textContent).not.toContain("Paperclip");

    await act(async () => {
      root.unmount();
    });
  });
});
