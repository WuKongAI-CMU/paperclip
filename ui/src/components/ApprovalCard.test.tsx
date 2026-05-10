// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent, Approval } from "@paperclipai/shared";
import { ApprovalCard } from "./ApprovalCard";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function approval(overrides: Partial<Approval> = {}): Approval {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "request_board_approval",
    requestedByAgentId: "agent-1",
    requestedByUserId: null,
    status: "pending",
    payload: {
      title: "Review the weekly letter",
      summary: "A decision is ready.",
    },
    decisionNote: null,
    decidedByUserId: null,
    decidedAt: null,
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    ...overrides,
  };
}

const requesterAgent = {
  id: "agent-1",
  companyId: "company-1",
  name: "Ops Agent",
  urlKey: "ops-agent",
  role: "general",
  title: "Operator",
  icon: null,
  reportsTo: null,
  capabilities: null,
  adapterType: "process",
  adapterConfig: {},
  runtimeConfig: {},
  status: "active",
  budgetMonthlyCents: 0,
  spentMonthlyCents: 0,
  pauseReason: null,
  pausedAt: null,
  permissions: { canCreateAgents: false },
  lastHeartbeatAt: null,
  metadata: null,
  createdAt: new Date("2026-05-07T00:00:00.000Z"),
  updatedAt: new Date("2026-05-07T00:00:00.000Z"),
} satisfies Agent;

describe("ApprovalCard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("routes DearMe approval details back to DearMe without requester chrome", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalCard
          approval={approval({ type: "dearme_output_next_move" })}
          requesterAgent={requesterAgent}
          detailLink="/approvals/approval-1"
        />,
      );
    });

    const link = container.querySelector("a");
    expect(container.textContent).toContain("DearMe Decision");
    expect(container.textContent).toContain("Open in DearMe");
    expect(container.textContent).not.toContain("Requested by");
    expect(container.textContent).not.toContain("Ops Agent");
    expect(link?.getAttribute("href")).toBe("/dearme?view=decisions&approval=approval-1");

    act(() => {
      root.unmount();
    });
  });

  it("keeps generic approvals on the shared detail route", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ApprovalCard
          approval={approval()}
          requesterAgent={requesterAgent}
          detailLink="/approvals/approval-1"
        />,
      );
    });

    const link = container.querySelector("a");
    expect(container.textContent).toContain("View details");
    expect(container.textContent).toContain("Requested by");
    expect(container.textContent).toContain("Ops Agent");
    expect(link?.getAttribute("href")).toBe("/approvals/approval-1");

    act(() => {
      root.unmount();
    });
  });
});
