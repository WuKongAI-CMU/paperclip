// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "./OnboardingWizard";

const mockCloseOnboarding = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());
const mockAgentsApi = vi.hoisted(() => ({
  adapterModels: vi.fn(),
  testEnvironment: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    onboardingOpen: true,
    onboardingOptions: { initialStep: 2, companyId: "company-1" },
    closeOnboarding: mockCloseOnboarding,
  }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", issuePrefix: "ACME" }],
    selectedCompanyId: "company-1",
    setSelectedCompanyId: mockSetSelectedCompanyId,
    loading: false,
  }),
}));

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: "/onboarding", search: "", hash: "", state: null }),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

vi.mock("../api/agents", () => ({
  agentsApi: mockAgentsApi,
}));

vi.mock("../api/companies", () => ({
  companiesApi: { create: vi.fn() },
}));

vi.mock("../api/goals", () => ({
  goalsApi: { create: vi.fn() },
}));

vi.mock("../api/approvals", () => ({
  approvalsApi: { request: vi.fn() },
}));

vi.mock("../api/issues", () => ({
  issuesApi: { create: vi.fn() },
}));

vi.mock("../api/projects", () => ({
  projectsApi: { create: vi.fn() },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
}));

vi.mock("../adapters/use-disabled-adapters", () => ({
  useDisabledAdaptersSync: () => new Set<string>(),
}));

vi.mock("../adapters/use-adapter-capabilities", () => ({
  useAdapterCapabilities: () => () => ({
    supportsInstructionsBundle: true,
    supportsSkills: true,
    supportsLocalAgentJwt: true,
  }),
}));

vi.mock("../adapters", () => ({
  getUIAdapter: () => ({
    label: "Claude Code (local)",
    buildAdapterConfig: () => ({}),
  }),
  listUIAdapters: () => [{ type: "claude_local" }, { type: "codex_local" }],
}));

vi.mock("./AsciiArtAnimation", () => ({
  AsciiArtAnimation: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("OnboardingWizard", () => {
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
    mockAgentsApi.adapterModels.mockResolvedValue([]);
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

  it("uses run-method copy for first-agent setup labels", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <OnboardingWizard />
        </QueryClientProvider>,
      );
    });

    const text = container.textContent ?? "";

    expect(text).toContain("Run method");
    expect(text).toContain("More run methods");
    expect(text).toContain("Runner check");
    expect(text).toContain("selected runner");
    expect(text).not.toContain("Adapter type");
    expect(text).not.toContain("More Agent Adapter Types");
    expect(text).not.toContain("Adapter environment check");
    expect(text).not.toContain("adapter CLI");
  });
});
