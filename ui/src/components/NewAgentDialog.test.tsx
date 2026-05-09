// @vitest-environment jsdom

import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewAgentDialog } from "./NewAgentDialog";

const mockCloseNewAgent = vi.hoisted(() => vi.fn());
const mockOpenNewIssue = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());
const mockAgentsApi = vi.hoisted(() => ({
  list: vi.fn(),
}));
const mockAdaptersApi = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    newAgentOpen: true,
    closeNewAgent: mockCloseNewAgent,
    openNewIssue: mockOpenNewIssue,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
  }),
}));

vi.mock("@/lib/router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api/agents", () => ({
  agentsApi: mockAgentsApi,
}));

vi.mock("../api/adapters", () => ({
  adaptersApi: mockAdaptersApi,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ComponentProps<"button">) => <button {...props}>{children}</button>,
}));

vi.mock("../adapters", () => ({
  listUIAdapters: () => [{ type: "claude_local" }, { type: "codex_local" }],
}));

vi.mock("../adapters/metadata", () => ({
  isVisualAdapterChoice: () => true,
}));

vi.mock("../adapters/adapter-display-registry", () => ({
  getAdapterDisplay: (type: string) => ({
    label: type === "claude_local" ? "Claude Code (local)" : "Codex (local)",
    description: type === "claude_local" ? "Local Claude runner" : "Local Codex runner",
    icon: () => null,
    recommended: type === "claude_local",
    comingSoon: false,
    disabledLabel: undefined,
  }),
}));

vi.mock("../adapters/use-disabled-adapters", () => ({
  useDisabledAdaptersSync: () => new Set<string>(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("NewAgentDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockAgentsApi.list.mockResolvedValue([]);
    mockAdaptersApi.list.mockResolvedValue([]);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("uses run-method copy for advanced agent setup", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <NewAgentDialog />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("execution settings");
    expect(container.textContent).not.toContain("and adapters");

    const advancedButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("advanced configuration"),
    );
    expect(advancedButton).toBeTruthy();

    await act(async () => {
      advancedButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Choose a run method for advanced setup.");
    expect(container.textContent).not.toContain("Choose your adapter type for advanced setup.");
  });
});
