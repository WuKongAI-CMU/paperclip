// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  buildDearMeBrandBlueprintExecutionPlan,
  createDearMeBrandBlueprint,
  summarizeDearMeBrandBlueprint,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalDetail } from "./ApprovalDetail";

const mockApprovalsApi = vi.hoisted(() => ({
  get: vi.fn(),
  listComments: vi.fn(),
  listIssues: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  requestRevision: vi.fn(),
  resubmit: vi.fn(),
  addComment: vi.fn(),
}));

const mockAgentsApi = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());

vi.mock("../api/approvals", () => ({
  approvalsApi: mockApprovalsApi,
}));

vi.mock("../api/agents", () => ({
  agentsApi: mockAgentsApi,
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useParams: () => ({ approvalId: "approval-1" }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", issuePrefix: "PET", name: "Peter Studio" },
    setSelectedCompanyId: mockSetSelectedCompanyId,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createDearMeApproval() {
  const blueprint = createDearMeBrandBlueprint({
    displayName: "Peter Studio",
    positioning: "A useful operating system for Peter's public work.",
    goals: ["Grow owned audience"],
    audiences: ["Founders"],
    proofPoints: ["Shipped a working local agent product"],
    offers: ["Paid beta"],
    voiceSamples: ["Short, direct operator note.", "Plain language with concrete proof."],
    preferredChannels: ["linkedin", "newsletter", "portfolio"],
    constraints: ["Ask before publishing"],
    cadence: "weekly",
    budgetMonthlyCents: 25_000,
    autoDraftEnabled: true,
  });
  const summary = summarizeDearMeBrandBlueprint(blueprint);

  return {
    id: "approval-1",
    companyId: "company-1",
    type: "dearme_brand_blueprint_apply",
    requestedByAgentId: null,
    requestedByUserId: "user-1",
    status: "pending",
    payload: {
      title: summary.title,
      summary: summary.summary,
      recommendedAction: summary.recommendedAction,
      nextActionOnApproval: summary.nextActionOnApproval,
      risks: blueprint.gates.map((gate) => `${gate.label}: ${gate.reason}`),
      approvalNote: "Only draft privately until I review the first batch.",
      brandBlueprint: blueprint,
      executionPlan: buildDearMeBrandBlueprintExecutionPlan(blueprint),
    },
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
  };
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("ApprovalDetail", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockApprovalsApi.get.mockResolvedValue(createDearMeApproval());
    mockApprovalsApi.listComments.mockResolvedValue([]);
    mockApprovalsApi.listIssues.mockResolvedValue([]);
    mockAgentsApi.list.mockResolvedValue([]);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("shows the DearMe Brand OS approval ceremony without exposing raw JSON controls", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ApprovalDetail />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Brand OS: Create Brand OS for Peter Studio");
    expect(container.textContent).toContain("DearMe will create");
    expect(container.textContent).toContain("Review before approving");
    expect(container.textContent).toContain("First operations");
    expect(container.textContent).toContain("Approve");
    expect(container.textContent).not.toContain("See full request");
    expect(container.textContent).not.toContain("\"brandBlueprint\"");
    expect(container.textContent).not.toContain("setup_payload");
    expect(container.textContent).not.toContain("Paperclip");

    await act(async () => {
      root.unmount();
    });
  });
});
