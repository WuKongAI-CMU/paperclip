import type { Db } from "@paperclipai/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEARME_NEXT_MOVE_APPROVAL_TYPE,
  DEARME_NEXT_MOVE_APPROVED_ACTIVITY,
  DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY,
  recordDearMeNextMoveApprovalReceipt,
} from "../services/dearme-approval-receipts.js";

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/activity-log.js", () => ({
  logActivity: mockLogActivity,
}));

function makeDb() {
  const values = vi.fn(async (rows: unknown) => rows);
  const insert = vi.fn(() => ({ values }));
  return {
    db: { insert } as unknown as Db,
    insert,
    values,
  };
}

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: DEARME_NEXT_MOVE_APPROVAL_TYPE,
    status: "approved",
    payload: {
      recommendedAction: "Publish the approved posts from this content batch.",
      nextActionOnApproval: "DearMe will prepare the channel handoff before any post goes live.",
      outputId: "issue-1:content_drafts",
      outputKind: "content_drafts",
      issueId: "issue-1",
      issueIdentifier: "DEAR-7",
      riskGate: "publish_social",
      preparedTitle: "Content draft batch",
      preparedSummary: "Three private posts are approved as useful and waiting for launch approval.",
    },
    requestedByAgentId: null,
    requestedByUserId: null,
    decisionNote: null,
    decidedByUserId: "user-1",
    decidedAt: new Date("2026-05-10T14:00:00.000Z"),
    createdAt: new Date("2026-05-10T13:00:00.000Z"),
    updatedAt: new Date("2026-05-10T14:00:00.000Z"),
    ...overrides,
  };
}

describe("recordDearMeNextMoveApprovalReceipt", () => {
  beforeEach(() => {
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("records final approval and private handoff receipts without running external action", async () => {
    const { db, insert, values } = makeDb();
    const approval = makeApproval();

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });

    expect(result).toEqual(expect.objectContaining({
      approvalId: "approval-1",
      outputId: "issue-1:content_drafts",
      outputKind: "content_drafts",
      issueId: "issue-1",
      issueIdentifier: "DEAR-7",
      riskGate: "publish_social",
      externalExecutionStatus: "not_run_yet",
      receiptTitle: "Final approval recorded",
      executionReadiness: "private_handoff_ready",
      handoffTitle: "Private publishing handoff prepared",
      handoffNextStep: expect.stringContaining("channel-ready posting brief"),
    }));
    expect(mockLogActivity).toHaveBeenCalledTimes(2);
    expect(mockLogActivity).toHaveBeenNthCalledWith(1, db, expect.objectContaining({
      action: DEARME_NEXT_MOVE_APPROVED_ACTIVITY,
      actorType: "user",
      actorId: "user-1",
      entityType: "approval",
      entityId: "approval-1",
      details: expect.objectContaining({
        outputId: "issue-1:content_drafts",
        externalExecutionStatus: "not_run_yet",
      }),
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(2, db, expect.objectContaining({
      action: DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY,
      details: expect.objectContaining({
        executionReadiness: "private_handoff_ready",
        handoffTitle: "Private publishing handoff prepared",
      }),
    }));

    expect(insert).toHaveBeenCalledTimes(1);
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(commentRows).toHaveLength(2);
    expect(commentRows).toEqual([
      expect.objectContaining({
        companyId: "company-1",
        issueId: "issue-1",
        authorUserId: "user-1",
        body: expect.stringContaining("DearMe final approval: recorded the next move."),
      }),
      expect.objectContaining({
        companyId: "company-1",
        issueId: "issue-1",
        authorUserId: "user-1",
        body: expect.stringContaining("DearMe private handoff: prepared the execution brief."),
      }),
    ]);
    const serializedComments = commentRows.map((row) => row.body).join("\n").toLowerCase();
    for (const hiddenTerm of ["paperclip", "openclaw", "symphony", "setup_payload", "runtime", "provider"]) {
      expect(serializedComments).not.toContain(hiddenTerm);
    }
  });

  it("surfaces connect-channel readiness in the private handoff receipt", async () => {
    const { db, insert, values } = makeDb();
    const approval = makeApproval({
      payload: {
        ...makeApproval().payload,
        launchHandoff: {
          channel: "x",
          publishGate: {
            connectChannelState: "connect_channel_required",
          },
        },
      },
    });

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });

    expect(result).toEqual(expect.objectContaining({
      launchChannel: "x",
      launchChannelLabel: "X",
      connectChannelState: "connect_channel_required",
      connectChannelNextStep: "Connect X before DearMe can continue this approved handoff.",
      handoffTitle: "Private X handoff prepared",
      handoffNextStep: "Connect X before DearMe can continue this approved handoff.",
      nextActionOnApproval: "Connect X before DearMe can continue this approved handoff.",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(2, db, expect.objectContaining({
      details: expect.objectContaining({
        launchChannel: "x",
        launchChannelLabel: "X",
        connectChannelState: "connect_channel_required",
        connectChannelNextStep: "Connect X before DearMe can continue this approved handoff.",
      }),
    }));

    expect(insert).toHaveBeenCalledTimes(1);
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const serializedComments = commentRows.map((row) => row.body).join("\n");
    expect(serializedComments).toContain("Connect X before DearMe can continue this approved handoff.");
    for (const hiddenTerm of ["launchHandoff", "connect_channel_required", "paperclip", "openclaw", "symphony"]) {
      expect(serializedComments).not.toContain(hiddenTerm);
    }
  });

  it("uses only linked issues for receipt comments", async () => {
    const { db, values } = makeDb();

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval: makeApproval({
        payload: {
          ...makeApproval().payload,
          issueId: "issue-from-stale-payload",
        },
      }),
      actorUserId: "user-1",
      linkedIssueIds: ["issue-linked"],
    });

    expect(result).toEqual(expect.objectContaining({
      issueId: "issue-linked",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(1, db, expect.objectContaining({
      details: expect.objectContaining({
        issueId: "issue-linked",
      }),
    }));
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(commentRows.map((row) => row.issueId)).toEqual(["issue-linked", "issue-linked"]);
  });

  it("redacts customer-facing receipt copy from dirty approval payloads", async () => {
    const { db, values } = makeDb();

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval: makeApproval({
        payload: {
          ...makeApproval().payload,
          recommendedAction: "Run the Paperclip provider through codex-local runtime setup_payload.",
          nextActionOnApproval: "Let OpenClaw and Symphony adapters publish from the raw workbench.",
          preparedTitle: "Paperclip provider artifact",
          preparedSummary: "OpenClaw runtime details from setup_payload.",
        },
      }),
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });

    const serializedResult = JSON.stringify(result).toLowerCase();
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const serializedComments = commentRows.map((row) => row.body).join("\n").toLowerCase();
    const activityDetails = mockLogActivity.mock.calls
      .map((call) => call[1]?.details)
      .map((details) => JSON.stringify(details))
      .join("\n")
      .toLowerCase();

    for (const hiddenTerm of [
      "paperclip",
      "openclaw",
      "symphony",
      "codex-local",
      "setup_payload",
      "runtime",
      "provider",
      "adapter",
      "workbench",
    ]) {
      expect(serializedResult).not.toContain(hiddenTerm);
      expect(serializedComments).not.toContain(hiddenTerm);
      expect(activityDetails).not.toContain(hiddenTerm);
    }
  });

  it("ignores non-DearMe approval types", async () => {
    const { db, insert } = makeDb();

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval: makeApproval({ type: "request_board_approval" }),
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });

    expect(result).toBeNull();
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
