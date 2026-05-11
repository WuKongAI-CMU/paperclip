import type { Db } from "@paperclipai/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEARME_NEXT_MOVE_APPROVAL_TYPE,
  DEARME_NEXT_MOVE_APPROVED_ACTIVITY,
  DEARME_NEXT_MOVE_DELIVERY_ACTIVITY,
  DEARME_PRIVATE_EXECUTION_HANDOFF_ACTIVITY,
  recordDearMeNextMoveApprovalReceipt,
  recordDearMeNextMoveDeliveryReceipt,
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
      handoffTitle: "Launch-ready posting brief prepared",
      handoffNextStep: "Review the channel-ready posting brief before any post goes live.",
      nextActionOnApproval: "Review the channel-ready posting brief before any post goes live.",
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
        handoffTitle: "Launch-ready posting brief prepared",
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
        body: expect.stringContaining("DearMe next step: prepared the launch-ready brief."),
      }),
    ]);
    const serializedComments = commentRows.map((row) => row.body).join("\n").toLowerCase();
    expect(serializedComments).not.toContain("channel handoff");
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
      connectChannelNextStep: "Connect X before DearMe can continue this approved next step.",
      handoffTitle: "Launch-ready X brief prepared",
      handoffNextStep: "Connect X before DearMe can continue this approved next step.",
      nextActionOnApproval: "Connect X before DearMe can continue this approved next step.",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(2, db, expect.objectContaining({
      details: expect.objectContaining({
        launchChannel: "x",
        launchChannelLabel: "X",
        connectChannelState: "connect_channel_required",
        connectChannelNextStep: "Connect X before DearMe can continue this approved next step.",
      }),
    }));

    expect(insert).toHaveBeenCalledTimes(1);
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const serializedComments = commentRows.map((row) => row.body).join("\n");
    expect(serializedComments).toContain("Connect X before DearMe can continue this approved next step.");
    for (const hiddenTerm of ["launchHandoff", "connect_channel_required", "paperclip", "openclaw", "symphony"]) {
      expect(serializedComments).not.toContain(hiddenTerm);
    }
  });

  it("records a pause intent without dispatching a launch-ready handoff", async () => {
    const { db, insert, values } = makeDb();
    const approval = makeApproval({
      decisionNote: "Please hold and do not send this yet.",
    });

    const result = await recordDearMeNextMoveApprovalReceipt(db, {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });

    expect(result).toEqual(expect.objectContaining({
      paused: true,
      externalExecutionStatus: "paused",
      executionReadiness: "private_handoff_paused",
      handoffTitle: "Launch-ready next step paused",
      handoffNextStep: "DearMe is paused until you resume or approve a new direction.",
      nextActionOnApproval: "DearMe is paused until you resume or approve a new direction.",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(2, db, expect.objectContaining({
      details: expect.objectContaining({
        executionReadiness: "private_handoff_paused",
        paused: true,
      }),
    }));

    expect(insert).toHaveBeenCalledTimes(1);
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const serializedComments = commentRows.map((row) => row.body).join("\n");
    expect(serializedComments).toContain("DearMe final approval: recorded the pause before any external action.");
    expect(serializedComments).toContain("DearMe next step: paused before anything external.");
    for (const hiddenTerm of ["launchHandoff", "paperclip", "openclaw", "symphony"]) {
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

describe("recordDearMeNextMoveDeliveryReceipt", () => {
  beforeEach(() => {
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("records a delivered launch receipt with a stable external reference", async () => {
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

    const result = await recordDearMeNextMoveDeliveryReceipt(db, {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
      outcome: {
        kind: "delivered",
        voiceGateScore: 96,
        externalId: "tweet-1",
        externalUrl: "https://x.com/tester/status/tweet-1",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      deliveryStatus: "delivered",
      deliveryExternalId: "tweet-1",
      deliveryExternalUrl: "https://x.com/tester/status/tweet-1",
      deliveryTitle: "Approved next step delivered",
      nextStep: "Review the delivered X result or continue with the next approved step.",
    }));
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(db, expect.objectContaining({
      action: DEARME_NEXT_MOVE_DELIVERY_ACTIVITY,
      details: expect.objectContaining({
        deliveryStatus: "delivered",
        deliveryExternalId: "tweet-1",
        deliveryExternalUrl: "https://x.com/tester/status/tweet-1",
      }),
    }));

    expect(insert).toHaveBeenCalledTimes(1);
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(commentRows).toHaveLength(1);
    expect(commentRows[0]).toEqual(expect.objectContaining({
      body: expect.stringContaining("DearMe delivery receipt: approved next step delivered."),
    }));
  });

  it("records a safe needs-connection delivery receipt without leaking internal codes", async () => {
    const { db, values } = makeDb();
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

    const result = await recordDearMeNextMoveDeliveryReceipt(db, {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
      outcome: {
        kind: "needs_oauth",
        channel: "x",
        gate: "connect_channel",
        reason: "missing credential",
        message: "Connect X before DearMe can continue this approved next step.",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      deliveryStatus: "needs_channel_connection",
      deliveryExternalId: null,
      deliveryExternalUrl: null,
      deliveryTitle: "Approved next step needs connection",
      nextStep: "Connect X before DearMe can continue this approved next step.",
    }));
    const serializedResult = JSON.stringify(result).toLowerCase();
    const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const serializedComments = commentRows.map((row) => row.body).join("\n").toLowerCase();

    expect(serializedResult).not.toContain("needs_oauth");
    expect(serializedComments).not.toContain("needs_oauth");
    expect(serializedComments).not.toContain("needs_channel_connection");
    expect(serializedComments).not.toContain("connect_channel");
    expect(serializedComments).not.toContain("missing credential");
    expect(serializedComments).toContain("status: needs connection");
    expect(serializedComments).toContain("connect x before dearme can continue this approved next step.");
  });

  it("keeps pending, rejected, and failed delivery comments customer-safe", async () => {
    const cases = [
      {
        name: "pending",
        outcome: {
          kind: "pending",
          approvalId: "approval-1",
          reason: "openclaw_gateway queue pending inside provider runtime",
        },
        expectedStatus: "status: pending",
        expectedNext: "waiting for the channel to finish",
        hiddenTerms: ["openclaw_gateway", "provider", "runtime"],
      },
      {
        name: "rejected",
        outcome: {
          kind: "rejected",
          reason: "no-dispatcher-registered inside adapter route",
          gate: "internal_adapter_gate",
        },
        expectedStatus: "status: needs a new decision",
        expectedNext: "choose a new direction",
        hiddenTerms: ["no-dispatcher-registered", "adapter", "internal_adapter_gate"],
      },
      {
        name: "errored",
        outcome: {
          kind: "errored",
          error: "PAPERCLIP_API_URL missing for OpenClaw provider runtime",
        },
        expectedStatus: "status: failed safely",
        expectedNext: "review the safe failure",
        hiddenTerms: ["errored", "paperclip_api_url", "openclaw", "provider", "runtime"],
      },
    ] as const;

    for (const testCase of cases) {
      const { db, values } = makeDb();
      const approval = makeApproval({ id: `approval-${testCase.name}` });

      await recordDearMeNextMoveDeliveryReceipt(db, {
        approval,
        actorUserId: "user-1",
        linkedIssueIds: ["issue-1"],
        outcome: testCase.outcome,
      });

      const commentRows = values.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
      const serializedComments = commentRows.map((row) => row.body).join("\n").toLowerCase();
      expect(serializedComments).toContain(testCase.expectedStatus);
      expect(serializedComments).toContain(testCase.expectedNext);
      for (const hiddenTerm of testCase.hiddenTerms) {
        expect(serializedComments).not.toContain(hiddenTerm);
      }
    }
  });
});
