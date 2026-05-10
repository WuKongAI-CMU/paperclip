import type { Db } from "@paperclipai/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DearMeOutputItem } from "@paperclipai/shared";

const mockListOutputs = vi.hoisted(() => vi.fn());

vi.mock("../services/dearme-output-handoff.js", () => ({
  dearmeOutputHandoffService: () => ({
    listOutputs: mockListOutputs,
  }),
}));

function queryFor(rows: unknown[]) {
  const query: Record<string, unknown> = {};
  query.from = vi.fn(() => query);
  query.innerJoin = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.orderBy = vi.fn(() => query);
  query.groupBy = vi.fn(() => query);
  query.limit = vi.fn(() => Promise.resolve(rows));
  query.then = (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return query;
}

function makeDb(selectResponses: unknown[][]) {
  let index = 0;
  const select = vi.fn(() => queryFor(selectResponses[index++] ?? []));
  return { select } as unknown as Db;
}

function reviewableOutput(): DearMeOutputItem {
  return {
    id: "issue-1:content_drafts",
    companyId: "company-1",
    kind: "content_drafts",
    title: "Content drafts",
    summary: "Private posts ready for final review.",
    status: "ready_for_review",
    isReviewable: true,
    issueId: "issue-1",
    issueIdentifier: "DM-12",
    issueTitle: "Content draft lane",
    updatedAt: "2026-05-10T12:00:00.000Z",
    documents: [],
    workProducts: [],
    latestUpdate: null,
    reviewLoop: {
      state: "needs_user_review",
      attemptCount: 0,
      maxAttempts: 3,
      isRetriable: true,
      lastAction: null,
      lastDecisionAt: null,
      lastDecisionNotePreview: null,
      nextStep: "Review the private draft before any external move.",
      reviewHandoff: null,
      feedbackTrace: null,
    },
    details: [],
    sourceEvidence: [],
  };
}

describe("DearMe workbench approval receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListOutputs.mockResolvedValue({
      companyId: "company-1",
      outputs: [reviewableOutput()],
    });
  });

  it("keeps approved outputs suppressed even when the receipt is older than recent progress", async () => {
    const { dearmeWorkbenchService } = await import("../services/dearme-workbench.js");
    const recentActivityRows = Array.from({ length: 25 }, (_, index) => ({
      id: `activity-${index}`,
      action: "dearme.team_progress",
      entityId: `entity-${index}`,
      details: {},
      createdAt: new Date(`2026-05-10T13:${String(index).padStart(2, "0")}:00.000Z`),
    }));
    const oldApprovedReceiptRows = [{
      details: {
        outputId: "issue-1:content_drafts",
      },
    }];
    const db = makeDb([
      [],
      [],
      recentActivityRows,
      oldApprovedReceiptRows,
      [],
      [],
      [],
    ]);

    const result = await dearmeWorkbenchService(db).getWorkbench("company-1");

    expect(result.workReady).toEqual([
      expect.objectContaining({ id: "issue-1:content_drafts" }),
    ]);
    expect(result.decisionsNeeded).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "output:issue-1:content_drafts",
        kind: "review_output",
      }),
    ]));
  });
});
