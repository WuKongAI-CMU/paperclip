// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdapterManager } from "./AdapterManager";

const mockAdaptersApi = vi.hoisted(() => ({
  list: vi.fn(),
  install: vi.fn(),
  remove: vi.fn(),
  setDisabled: vi.fn(),
  setOverridePaused: vi.fn(),
  reload: vi.fn(),
  reinstall: vi.fn(),
}));

const breadcrumbState = vi.hoisted(() => ({
  setBreadcrumbs: vi.fn(),
}));

const toastState = vi.hoisted(() => ({
  pushToast: vi.fn(),
}));

vi.mock("@/api/adapters", () => ({
  adaptersApi: mockAdaptersApi,
}));

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompany: { name: "Acme Robotics" } }),
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => breadcrumbState,
}));

vi.mock("@/context/ToastContext", () => ({
  useToastActions: () => toastState,
}));

vi.mock("@/components/PathInstructionsModal", () => ({
  ChoosePathButton: () => <button type="button">Choose path</button>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function waitForAssertion(assertion: () => void, attempts = 20) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flush();
    }
  }

  throw lastError;
}

function renderManager(container: HTMLDivElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const root = createRoot(container);

  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <AdapterManager />
      </QueryClientProvider>,
    );
  });

  return { root, queryClient };
}

describe("AdapterManager", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockAdaptersApi.list.mockResolvedValue([]);
    breadcrumbState.setBreadcrumbs.mockReset();
    toastState.pushToast.mockReset();
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it("labels the admin runner settings without adapter copy", async () => {
    const { root } = renderManager(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Run methods");
    });

    expect(container.textContent).toContain("Install runner");
    expect(container.textContent).toContain("External runners are alpha.");
    expect(container.textContent).toContain("No external runners installed");
    expect(container.textContent).toContain("No built-in runners found.");
    expect(container.textContent).not.toContain("Adapters");
    expect(container.textContent).not.toContain("Install Adapter");
    expect(container.textContent).not.toContain("External Adapters");
    expect(container.textContent).not.toContain("Built-in Adapters");
    expect(container.textContent).not.toContain("No external adapters installed");
    expect(breadcrumbState.setBreadcrumbs).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ label: "Run methods" })]),
    );

    act(() => {
      root.unmount();
    });
  });
});
