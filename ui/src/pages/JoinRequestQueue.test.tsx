// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinRequestQueue } from "./JoinRequestQueue";

const listJoinRequestsMock = vi.hoisted(() => vi.fn());
const approveJoinRequestMock = vi.hoisted(() => vi.fn());
const rejectJoinRequestMock = vi.hoisted(() => vi.fn());
const setBreadcrumbsMock = vi.hoisted(() => vi.fn());
const pushToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/access", () => ({
  accessApi: {
    listJoinRequests: (companyId: string, status: string, requestType?: string) =>
      listJoinRequestsMock(companyId, status, requestType),
    approveJoinRequest: (companyId: string, requestId: string) =>
      approveJoinRequestMock(companyId, requestId),
    rejectJoinRequest: (companyId: string, requestId: string) =>
      rejectJoinRequestMock(companyId, requestId),
  },
}));

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Acme Robotics" },
  }),
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: setBreadcrumbsMock }),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ pushToast: pushToastMock }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("JoinRequestQueue", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    listJoinRequestsMock.mockResolvedValue([
      {
        id: "join-1",
        inviteId: "invite-1",
        companyId: "company-1",
        requestType: "agent",
        status: "pending_approval",
        requestIp: "127.0.0.1",
        requestingUserId: null,
        requestEmailSnapshot: null,
        requesterUser: null,
        agentName: "Ops Helper",
        adapterType: "claude_local",
        capabilities: "Keeps the morning routine moving.",
        agentDefaultsPayload: null,
        claimSecretExpiresAt: null,
        claimSecretConsumedAt: null,
        createdAgentId: null,
        approvedByUserId: null,
        approvedByUser: null,
        approvedAt: null,
        rejectedByUserId: null,
        rejectedByUser: null,
        rejectedAt: null,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
        invite: {
          id: "invite-1",
          inviteType: "company_join",
          allowedJoinTypes: "agent",
          humanRole: null,
          inviteMessage: "Welcome aboard.",
          createdAt: "2026-04-10T00:00:00.000Z",
          expiresAt: "2026-04-20T00:00:00.000Z",
          revokedAt: null,
          acceptedAt: null,
          invitedByUser: null,
        },
      },
    ]);
    approveJoinRequestMock.mockResolvedValue(undefined);
    rejectJoinRequestMock.mockResolvedValue(undefined);
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

  it("shows agent request run methods as human labels instead of raw adapter ids", async () => {
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <JoinRequestQueue />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("Join Request Queue");
    expect(container.textContent).toContain("Ops Helper");
    expect(container.textContent).toContain("Claude Code (local)");
    expect(container.textContent).not.toContain("claude_local");
  });
});
