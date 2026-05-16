// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeDangerSettings } from "./DearMeDangerSettings";

const exportGdprDataMock = vi.hoisted(() => vi.fn());
const deleteGdprDataMock = vi.hoisted(() => vi.fn());
const setBreadcrumbsMock = vi.hoisted(() => vi.fn());

vi.mock("../api/dearme", () => ({
  dearmeApi: {
    exportGdprData: (companyId: string) => exportGdprDataMock(companyId),
    deleteGdprData: (companyId: string) => deleteGdprDataMock(companyId),
  },
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Acme Robotics" },
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: setBreadcrumbsMock }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("DearMeDangerSettings", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    exportGdprDataMock.mockResolvedValue({
      company: { id: "company-1", name: "Acme Robotics" },
      users: [{ id: "user-1" }],
      voiceProfiles: [{ id: "voice-1" }],
      voiceSamples: [{ id: "sample-1" }],
      paidBetaReceipts: [{ id: "receipt-1" }],
      opportunities: [{ id: "opportunity-1" }],
      channelConnections: [{ id: "connection-1" }],
      auditLog: [{ id: "audit-1" }, { id: "audit-2" }],
    });
    deleteGdprDataMock.mockResolvedValue({
      rowsAffected: {
        company: 1,
        users: 1,
        voiceProfiles: 1,
        voiceSamples: 1,
        opportunities: 1,
        channelConnections: 1,
        auditLog: 2,
      },
    });
  });

  afterEach(async () => {
    const currentRoot = root;
    if (currentRoot) {
      await act(async () => {
        currentRoot.unmount();
      });
    }
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders deletion scope from the privacy export service", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeDangerSettings />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(exportGdprDataMock).toHaveBeenCalledWith("company-1");
    expect(setBreadcrumbsMock).toHaveBeenCalledWith([
      { label: "DearMe" },
      { label: "Danger Zone" },
    ]);
    expect(container.textContent).toContain("What DearMe will scrub");
    expect(container.textContent).toContain("People");
    expect(container.textContent).toContain("Voice memory");
    expect(container.textContent).toContain("Audit rows");
    expect(container.textContent).toContain("7 days");
  });

  it("requires grace acknowledgement and exact confirmation before deleting", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeDangerSettings />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const deleteButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Request deletion")) as HTMLButtonElement | undefined;
    expect(deleteButton).toBeTruthy();
    expect(deleteButton?.disabled).toBe(true);

    const checkbox = container.querySelector("button[role='checkbox']") as HTMLButtonElement | null;
    const input = container.querySelector("#dearme-delete-confirmation") as HTMLInputElement | null;
    expect(checkbox).toBeTruthy();
    expect(input).toBeTruthy();

    await act(async () => {
      checkbox!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      setInputValue(input!, "DELETE DEARME");
    });
    await flushReact();

    expect(deleteButton?.disabled).toBe(false);

    await act(async () => {
      deleteButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushReact();

    expect(deleteGdprDataMock).toHaveBeenCalledWith("company-1");
    expect(container.textContent).toContain("Delete request recorded");
    expect(container.textContent).toContain("scrubbed 2 audit rows");
  });
});
