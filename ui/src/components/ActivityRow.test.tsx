// @vitest-environment jsdom

import { act } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import type { ActivityEvent, Agent } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityRow } from "./ActivityRow";

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock("./Identity", () => ({
  Identity: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("./IssueReferenceActivitySummary", () => ({
  IssueReferenceActivitySummary: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createActivityEvent(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "activity-1",
    companyId: "company-1",
    actorType: "system",
    actorId: "system",
    action: "approval.requested",
    entityType: "approval",
    entityId: "approval-1",
    agentId: null,
    runId: null,
    details: null,
    createdAt: new Date("2026-03-11T12:00:00.000Z"),
    ...overrides,
  };
}

describe("ActivityRow", () => {
  let container: HTMLDivElement;
  const agentMap = new Map<string, Agent>();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T12:05:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it("routes DearMe approval activity into the DearMe decisions surface", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ActivityRow
          event={createActivityEvent({
            entityId: "approval-dearme-1",
            details: { type: "dearme_output_next_move" },
          })}
          agentMap={agentMap}
          entityNameMap={new Map([["approval:approval-dearme-1", "Approve next move"]])}
        />,
      );
    });

    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/dearme?view=decisions&approval=approval-dearme-1",
    );

    act(() => {
      root.unmount();
    });
  });

  it("routes DearMe product approval events without leaking the shared approval route", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ActivityRow
          event={createActivityEvent({
            action: "dearme.brand_blueprint_apply_requested",
            entityId: "approval-dearme-2",
          })}
          agentMap={agentMap}
          entityNameMap={new Map()}
        />,
      );
    });

    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/dearme?view=decisions&approval=approval-dearme-2",
    );

    act(() => {
      root.unmount();
    });
  });

  it("keeps generic approval activity on the shared approval route", () => {
    const root = createRoot(container);

    act(() => {
      root.render(
        <ActivityRow
          event={createActivityEvent({
            entityId: "approval-generic-1",
            details: { type: "request_board_approval" },
          })}
          agentMap={agentMap}
          entityNameMap={new Map()}
        />,
      );
    });

    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/approvals/approval-generic-1",
    );

    act(() => {
      root.unmount();
    });
  });
});
