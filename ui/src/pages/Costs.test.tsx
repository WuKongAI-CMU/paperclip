// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Costs } from "./Costs";

const setBreadcrumbsMock = vi.hoisted(() => vi.fn());
const budgetsOverviewMock = vi.hoisted(() => vi.fn());
const costsSummaryMock = vi.hoisted(() => vi.fn());
const costsByAgentMock = vi.hoisted(() => vi.fn());
const costsByProjectMock = vi.hoisted(() => vi.fn());
const costsByAgentModelMock = vi.hoisted(() => vi.fn());
const costsByProviderMock = vi.hoisted(() => vi.fn());
const costsByBillerMock = vi.hoisted(() => vi.fn());
const financeSummaryMock = vi.hoisted(() => vi.fn());
const financeByBillerMock = vi.hoisted(() => vi.fn());
const financeByKindMock = vi.hoisted(() => vi.fn());
const financeEventsMock = vi.hoisted(() => vi.fn());
const windowSpendMock = vi.hoisted(() => vi.fn());
const quotaWindowsMock = vi.hoisted(() => vi.fn());

vi.mock("../api/budgets", () => ({
  budgetsApi: {
    overview: (companyId: string) => budgetsOverviewMock(companyId),
    upsertPolicy: vi.fn(),
    resolveIncident: vi.fn(),
  },
}));

vi.mock("../api/costs", () => ({
  costsApi: {
    summary: (companyId: string, from?: string, to?: string) => costsSummaryMock(companyId, from, to),
    byAgent: (companyId: string, from?: string, to?: string) => costsByAgentMock(companyId, from, to),
    byProject: (companyId: string, from?: string, to?: string) => costsByProjectMock(companyId, from, to),
    byAgentModel: (companyId: string, from?: string, to?: string) => costsByAgentModelMock(companyId, from, to),
    byProvider: (companyId: string, from?: string, to?: string) => costsByProviderMock(companyId, from, to),
    byBiller: (companyId: string, from?: string, to?: string) => costsByBillerMock(companyId, from, to),
    financeSummary: (companyId: string, from?: string, to?: string) => financeSummaryMock(companyId, from, to),
    financeByBiller: (companyId: string, from?: string, to?: string) => financeByBillerMock(companyId, from, to),
    financeByKind: (companyId: string, from?: string, to?: string) => financeByKindMock(companyId, from, to),
    financeEvents: (companyId: string, from?: string, to?: string, limit?: number) => financeEventsMock(companyId, from, to, limit),
    windowSpend: (companyId: string) => windowSpendMock(companyId),
    quotaWindows: (companyId: string) => quotaWindowsMock(companyId),
  },
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "DearMe", issuePrefix: "DEAR" },
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: setBreadcrumbsMock }),
}));

vi.mock("../context/SidebarContext", () => ({
  useSidebar: () => ({ isMobile: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (!globalThis.PointerEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = MouseEvent;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function flushUntil(assertion: () => boolean, attempts = 8) {
  for (let index = 0; index < attempts; index += 1) {
    if (assertion()) return;
    await flushReact();
  }
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  );
}

async function clickButton(container: HTMLElement, label: string) {
  const button = findButton(container, label);
  expect(button).toBeTruthy();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushReact();
}

describe("Costs", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    budgetsOverviewMock.mockResolvedValue({
      companyId: "company-1",
      policies: [],
      activeIncidents: [],
      pausedAgentCount: 0,
      pausedProjectCount: 0,
      pendingApprovalCount: 0,
    });
    costsSummaryMock.mockResolvedValue({
      companyId: "company-1",
      spendCents: 375,
      budgetCents: 5000,
      utilizationPercent: 8,
    });
    costsByAgentMock.mockResolvedValue([]);
    costsByProjectMock.mockResolvedValue([]);
    costsByAgentModelMock.mockResolvedValue([]);
    costsByProviderMock.mockResolvedValue([
      {
        provider: "openai",
        biller: "openrouter",
        billingType: "api",
        model: "gpt-5-mini",
        costCents: 375,
        inputTokens: 1200,
        cachedInputTokens: 100,
        outputTokens: 250,
        apiRunCount: 2,
        subscriptionRunCount: 0,
        subscriptionCachedInputTokens: 0,
        subscriptionInputTokens: 0,
        subscriptionOutputTokens: 0,
      },
    ]);
    costsByBillerMock.mockResolvedValue([
      {
        biller: "openrouter",
        costCents: 375,
        inputTokens: 1200,
        cachedInputTokens: 100,
        outputTokens: 250,
        apiRunCount: 2,
        subscriptionRunCount: 0,
        subscriptionCachedInputTokens: 0,
        subscriptionInputTokens: 0,
        subscriptionOutputTokens: 0,
        providerCount: 1,
        modelCount: 1,
      },
    ]);
    financeSummaryMock.mockResolvedValue({
      companyId: "company-1",
      debitCents: 375,
      creditCents: 0,
      netCents: 375,
      estimatedDebitCents: 0,
      eventCount: 1,
    });
    financeByBillerMock.mockResolvedValue([]);
    financeByKindMock.mockResolvedValue([]);
    financeEventsMock.mockResolvedValue([]);
    windowSpendMock.mockResolvedValue([]);
    quotaWindowsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("uses product-safe model-source language instead of provider wording", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Costs />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Model spend");
    expect(container.textContent).not.toMatch(/\bproviders?\b/i);

    await clickButton(container, "Model spend");
    await flushUntil(() => container.textContent?.includes("OpenAI") ?? false);

    expect(container.textContent).toContain("All model sources");
    expect(container.textContent).toContain("OpenAI");
    expect(container.innerHTML).toContain("model-source tokens");
    expect(container.innerHTML).toContain("model-source cost");
    expect(container.textContent).not.toMatch(/\bproviders?\b/i);
    expect(container.innerHTML).not.toContain("provider tokens");
    expect(container.innerHTML).not.toContain("provider cost");
    expect(container.innerHTML).not.toContain("All providers");

    await clickButton(container, "Billers");
    await flushUntil(() => container.textContent?.includes("1 model source") ?? false);

    expect(container.textContent).toContain("1 model source");
    expect(container.textContent).toContain("Model sources");
    expect(container.textContent).not.toMatch(/\bproviders?\b/i);
    expect(container.innerHTML).not.toContain("Upstream providers");

    await act(async () => {
      root.unmount();
    });
  });
});
