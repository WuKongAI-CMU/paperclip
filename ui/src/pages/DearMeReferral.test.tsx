// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeReferral } from "./DearMeReferral";

const getReferralCodeMock = vi.hoisted(() => vi.fn());
const mintReferralCodeMock = vi.hoisted(() => vi.fn());
const setBreadcrumbsMock = vi.hoisted(() => vi.fn());

vi.mock("../api/dearme", () => ({
  dearmeApi: {
    getReferralCode: (companyId: string) => getReferralCodeMock(companyId),
    mintReferralCode: (companyId: string) => mintReferralCodeMock(companyId),
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

describe("DearMeReferral", () => {
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
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
    getReferralCodeMock.mockResolvedValue({
      companyId: "company-1",
      status: "ready",
      code: "acme-beta",
      referralUrl: "https://dearme.app/landing?ref=acme-beta",
      rewardCount: 2,
      disabled: false,
      createdAt: "2026-05-16T01:00:00.000Z",
    });
    mintReferralCodeMock.mockResolvedValue({
      companyId: "company-1",
      status: "ready",
      code: "acme-new",
      referralUrl: "https://dearme.app/landing?ref=acme-new",
      rewardCount: 0,
      disabled: false,
      createdAt: "2026-05-16T01:05:00.000Z",
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

  it("renders the referral code, reward count, and share links", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeReferral />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(getReferralCodeMock).toHaveBeenCalledWith("company-1");
    expect(container.textContent).toContain("Your referral link is ready.");
    expect(container.textContent).toContain("acme-beta");
    expect(container.textContent).toContain("Paid referrals");
    expect(container.textContent).toContain("2");
    const anchors = [...container.querySelectorAll("a")].map((anchor) => anchor.href);
    expect(anchors).toContain(
      "https://twitter.com/intent/tweet?text=I+am+using+DearMe+to+keep+my+private+brand+work+moving+every+week.&url=https%3A%2F%2Fdearme.app%2Flanding%3Fref%3Dacme-beta",
    );
    expect(anchors).toContain(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fdearme.app%2Flanding%3Fref%3Dacme-beta",
    );
  });

  it("copies the referral link", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeReferral />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const copyButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Copy invite link"));
    expect(copyButton).toBeTruthy();
    await act(async () => {
      copyButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://dearme.app/landing?ref=acme-beta",
    );
  });

  it("mints a code when none exists yet", async () => {
    getReferralCodeMock.mockResolvedValueOnce({
      companyId: "company-1",
      status: "not_minted",
      code: null,
      referralUrl: null,
      rewardCount: 0,
      disabled: false,
      createdAt: null,
    });

    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <DearMeReferral />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const createButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Create code"));
    expect(createButton).toBeTruthy();
    await act(async () => {
      createButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushReact();

    expect(mintReferralCodeMock).toHaveBeenCalledWith("company-1");
    expect(container.textContent).toContain("acme-new");
  });
});
