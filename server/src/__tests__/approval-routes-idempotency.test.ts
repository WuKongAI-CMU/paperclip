import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApprovalService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  requestRevision: vi.fn(),
  resubmit: vi.fn(),
  listComments: vi.fn(),
  addComment: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  listIssuesForApproval: vi.fn(),
  linkManyForApproval: vi.fn(),
}));

const mockSecretService = vi.hoisted(() => ({
  normalizeHireApprovalPayloadForPersistence: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());
const mockRecordDearMeNextMoveApprovalReceipt = vi.hoisted(() => vi.fn());
const mockRecordDearMeNextMoveDeliveryReceipt = vi.hoisted(() => vi.fn());

function registerModuleMocks() {
  vi.doMock("../services/index.js", () => ({
    approvalService: () => mockApprovalService,
    heartbeatService: () => mockHeartbeatService,
    issueApprovalService: () => mockIssueApprovalService,
    logActivity: mockLogActivity,
    secretService: () => mockSecretService,
  }));
  vi.doMock("../services/dearme-approval-receipts.js", () => ({
    DEARME_NEXT_MOVE_APPROVAL_TYPE: "dearme_output_next_move",
    hasDearMePauseIntent: vi.fn(() => false),
    recordDearMeNextMoveApprovalReceipt: mockRecordDearMeNextMoveApprovalReceipt,
    recordDearMeNextMoveDeliveryReceipt: mockRecordDearMeNextMoveDeliveryReceipt,
  }));
}

async function createApp(
  actorOverrides: Record<string, unknown> = {},
  routeOptions: Record<string, unknown> = {},
) {
  const [{ errorHandler }, { approvalRoutes }] = await Promise.all([
    import("../middleware/index.js"),
    import("../routes/approvals.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "session",
      isInstanceAdmin: false,
      ...actorOverrides,
    };
    next();
  });
  app.use("/api", approvalRoutes({} as any, routeOptions as any));
  app.use(errorHandler);
  return app;
}

async function createAgentApp() {
  const [{ errorHandler }, { approvalRoutes }] = await Promise.all([
    import("../middleware/index.js"),
    import("../routes/approvals.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId: "agent-1",
      companyId: "company-1",
      source: "api_key",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", approvalRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("approval routes idempotent retries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../services/index.js");
    vi.doUnmock("../services/dearme-approval-receipts.js");
    vi.doUnmock("../routes/approvals.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    registerModuleMocks();
    vi.clearAllMocks();
    mockApprovalService.list.mockReset();
    mockApprovalService.getById.mockReset();
    mockApprovalService.create.mockReset();
    mockApprovalService.approve.mockReset();
    mockApprovalService.reject.mockReset();
    mockApprovalService.requestRevision.mockReset();
    mockApprovalService.resubmit.mockReset();
    mockApprovalService.listComments.mockReset();
    mockApprovalService.addComment.mockReset();
    mockHeartbeatService.wakeup.mockReset();
    mockIssueApprovalService.listIssuesForApproval.mockReset();
    mockIssueApprovalService.linkManyForApproval.mockReset();
    mockSecretService.normalizeHireApprovalPayloadForPersistence.mockReset();
    mockLogActivity.mockReset();
    mockRecordDearMeNextMoveApprovalReceipt.mockReset();
    mockRecordDearMeNextMoveDeliveryReceipt.mockReset();
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "wake-1" });
    mockIssueApprovalService.listIssuesForApproval.mockResolvedValue([{ id: "issue-1" }]);
    mockLogActivity.mockResolvedValue(undefined);
    mockRecordDearMeNextMoveApprovalReceipt.mockResolvedValue({ paused: false });
    mockRecordDearMeNextMoveDeliveryReceipt.mockResolvedValue({ deliveryStatus: "delivered" });
  });

  it("does not emit duplicate approval side effects when approve is already resolved", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-1",
      companyId: "company-1",
      type: "hire_agent",
      status: "approved",
      payload: {},
      requestedByAgentId: "agent-1",
    });
    mockApprovalService.approve.mockResolvedValue({
      approval: {
        id: "approval-1",
        companyId: "company-1",
        type: "hire_agent",
        status: "approved",
        payload: {},
        requestedByAgentId: "agent-1",
      },
      applied: false,
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-1/approve")
      .send({});

    expect(res.status).toBe(200);
    expect(mockIssueApprovalService.listIssuesForApproval).not.toHaveBeenCalled();
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(mockRecordDearMeNextMoveApprovalReceipt).not.toHaveBeenCalled();
  });

  it("records DearMe final approval receipts only when a next-move approval is newly applied", async () => {
    const approval = {
      id: "approval-2",
      companyId: "company-1",
      type: "dearme_output_next_move",
      status: "approved",
      payload: {
        outputId: "issue-1:content_drafts",
        issueId: "issue-1",
        riskGate: "publish_social",
      },
      requestedByAgentId: "agent-1",
    };
    mockApprovalService.getById.mockResolvedValue({
      ...approval,
      status: "pending",
    });
    mockApprovalService.approve.mockResolvedValue({ approval, applied: true });

    const res = await request(await createApp())
      .post("/api/approvals/approval-2/approve")
      .send({});

    expect(res.status).toBe(200);
    expect(mockRecordDearMeNextMoveApprovalReceipt).toHaveBeenCalledTimes(1);
    expect(mockRecordDearMeNextMoveApprovalReceipt).toHaveBeenCalledWith(expect.anything(), {
      approval,
      actorUserId: "user-1",
      linkedIssueIds: ["issue-1"],
    });
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith("agent-1", expect.objectContaining({
      reason: "approval_approved",
    }));
  });

  it("executes an approved DearMe launch handoff only when a next-move approval is newly applied", async () => {
    const launchService = {
      executeApprovedNextMove: vi.fn(async () => ({
        kind: "called" as const,
        outcome: { kind: "delivered" as const, voiceGateScore: 96, externalId: "tweet-1" },
      })),
    };
    const approval = {
      id: "approval-8",
      companyId: "company-1",
      type: "dearme_output_next_move",
      status: "approved",
      payload: {
        outputId: "issue-1:content_drafts",
        issueId: "issue-1",
        launchHandoff: {
          toolName: "post_x",
          payload: { text: "Ready to publish." },
        },
      },
      requestedByAgentId: "agent-1",
    };
    mockApprovalService.getById.mockResolvedValue({
      ...approval,
      status: "pending",
    });
    mockApprovalService.approve.mockResolvedValue({ approval, applied: true });

    const res = await request(await createApp({}, {
      dearMeLaunchHandoffService: launchService,
    }))
      .post("/api/approvals/approval-8/approve")
      .send({});

    expect(res.status).toBe(200);
    expect(launchService.executeApprovedNextMove).toHaveBeenCalledWith({
      approval,
      actorUserId: "user-1",
    });
    expect(mockRecordDearMeNextMoveDeliveryReceipt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        approval,
        actorUserId: "user-1",
        linkedIssueIds: ["issue-1"],
        outcome: expect.objectContaining({
          kind: "delivered",
          externalId: "tweet-1",
        }),
      }),
    );
  });

  it("skips downstream launch and requester wakeup when a DearMe next move is paused", async () => {
    const launchService = {
      executeApprovedNextMove: vi.fn(),
    };
    const approval = {
      id: "approval-9",
      companyId: "company-1",
      type: "dearme_output_next_move",
      status: "approved",
      payload: {
        outputId: "issue-1:content_drafts",
        issueId: "issue-1",
        launchHandoff: {
          toolName: "post_x",
          payload: { text: "Hold this for now." },
        },
      },
      requestedByAgentId: "agent-1",
    };
    mockApprovalService.getById.mockResolvedValue({
      ...approval,
      status: "pending",
    });
    mockApprovalService.approve.mockResolvedValue({ approval, applied: true });
    mockRecordDearMeNextMoveApprovalReceipt.mockResolvedValue({
      paused: true,
    });

    const res = await request(await createApp({}, {
      dearMeLaunchHandoffService: launchService,
    }))
      .post("/api/approvals/approval-9/approve")
      .send({ decisionNote: "Please pause and do not send." });

    expect(res.status).toBe(200);
    expect(mockRecordDearMeNextMoveApprovalReceipt).toHaveBeenCalledTimes(1);
    expect(launchService.executeApprovedNextMove).not.toHaveBeenCalled();
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
  });

  it("does not emit duplicate rejection logs when reject is already resolved", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-1",
      companyId: "company-1",
      type: "hire_agent",
      status: "rejected",
      payload: {},
    });
    mockApprovalService.reject.mockResolvedValue({
      approval: {
        id: "approval-1",
        companyId: "company-1",
        type: "hire_agent",
        status: "rejected",
        payload: {},
      },
      applied: false,
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-1/reject")
      .send({});

    expect(res.status).toBe(200);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("rejects approval decisions for companies outside the caller scope", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-2",
      companyId: "company-2",
      type: "hire_agent",
      status: "pending",
      payload: {},
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-2/approve")
      .send({});

    expect(res.status).toBe(403);
    expect(mockApprovalService.approve).not.toHaveBeenCalled();
  });

  it("rejects approval revision requests for companies outside the caller scope", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-3",
      companyId: "company-2",
      type: "hire_agent",
      status: "pending",
      payload: {},
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-3/request-revision")
      .send({ decisionNote: "Need changes" });

    expect(res.status).toBe(403);
    expect(mockApprovalService.requestRevision).not.toHaveBeenCalled();
  });

  it("derives approval attribution from the authenticated actor on approve", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-4",
      companyId: "company-1",
      type: "hire_agent",
      status: "pending",
      payload: {},
      requestedByAgentId: null,
    });
    mockApprovalService.approve.mockResolvedValue({
      approval: {
        id: "approval-4",
        companyId: "company-1",
        type: "hire_agent",
        status: "approved",
        payload: {},
        requestedByAgentId: null,
      },
      applied: true,
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-4/approve")
      .send({ decidedByUserId: "forged-user", decisionNote: "ship it" });

    expect(res.status).toBe(200);
    expect(mockApprovalService.approve).toHaveBeenCalledWith("approval-4", "user-1", "ship it");
    expect(mockRecordDearMeNextMoveApprovalReceipt).not.toHaveBeenCalled();
  });

  it("records a DearMe next-move receipt only when the approval is newly applied", async () => {
    const approval = {
      id: "approval-7",
      companyId: "company-1",
      type: "dearme_output_next_move",
      status: "approved",
      payload: {
        outputId: "issue-1:content_drafts",
        outputKind: "content_drafts",
      },
      requestedByAgentId: "agent-1",
    };
    mockApprovalService.getById.mockResolvedValue({
      ...approval,
      status: "pending",
    });
    mockApprovalService.approve.mockResolvedValue({
      approval,
      applied: true,
    });
    mockIssueApprovalService.listIssuesForApproval.mockResolvedValue([
      { id: "issue-1" },
      { id: "issue-2" },
    ]);

    const res = await request(await createApp())
      .post("/api/approvals/approval-7/approve")
      .send({ decisionNote: "approved" });

    expect(res.status).toBe(200);
    expect(mockRecordDearMeNextMoveApprovalReceipt).toHaveBeenCalledWith(
      expect.anything(),
      {
        approval,
        actorUserId: "user-1",
        linkedIssueIds: ["issue-1", "issue-2"],
      },
    );
  });

  it("derives approval attribution from the authenticated actor on reject", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-5",
      companyId: "company-1",
      type: "hire_agent",
      status: "pending",
      payload: {},
    });
    mockApprovalService.reject.mockResolvedValue({
      approval: {
        id: "approval-5",
        companyId: "company-1",
        type: "hire_agent",
        status: "rejected",
        payload: {},
      },
      applied: true,
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-5/reject")
      .send({ decidedByUserId: "forged-user", decisionNote: "not now" });

    expect(res.status).toBe(200);
    expect(mockApprovalService.reject).toHaveBeenCalledWith("approval-5", "user-1", "not now");
  });

  it("derives approval attribution from the authenticated actor on request revision", async () => {
    mockApprovalService.getById.mockResolvedValue({
      id: "approval-6",
      companyId: "company-1",
      type: "hire_agent",
      status: "pending",
      payload: {},
    });
    mockApprovalService.requestRevision.mockResolvedValue({
      id: "approval-6",
      companyId: "company-1",
      type: "hire_agent",
      status: "revision_requested",
      payload: {},
    });

    const res = await request(await createApp())
      .post("/api/approvals/approval-6/request-revision")
      .send({ decidedByUserId: "forged-user", decisionNote: "Need changes" });

    expect(res.status).toBe(200);
    expect(mockApprovalService.requestRevision).toHaveBeenCalledWith(
      "approval-6",
      "user-1",
      "Need changes",
    );
  });

  it("lets agents create generic issue-linked board approval requests", async () => {
    mockApprovalService.create.mockResolvedValue({
      id: "approval-1",
      companyId: "company-1",
      type: "request_board_approval",
      requestedByAgentId: "agent-1",
      requestedByUserId: null,
      status: "pending",
      payload: { title: "Approve hosting spend" },
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      createdAt: new Date("2026-04-06T00:00:00.000Z"),
      updatedAt: new Date("2026-04-06T00:00:00.000Z"),
    });

    const res = await request(await createAgentApp())
      .post("/api/companies/company-1/approvals")
      .send({
        type: "request_board_approval",
        issueIds: ["00000000-0000-0000-0000-000000000001"],
        payload: { title: "Approve hosting spend" },
      });

    expect([200, 201], JSON.stringify(res.body)).toContain(res.status);
    expect(res.body).toMatchObject({
      companyId: "company-1",
      type: "request_board_approval",
      requestedByAgentId: "agent-1",
      requestedByUserId: null,
      status: "pending",
    });
    expect(mockSecretService.normalizeHireApprovalPayloadForPersistence).not.toHaveBeenCalled();
    expect(mockIssueApprovalService.linkManyForApproval).toHaveBeenCalledWith(
      "approval-1",
      ["00000000-0000-0000-0000-000000000001"],
      { agentId: "agent-1", userId: null },
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "agent",
        actorId: "agent-1",
        action: "approval.created",
      }),
    );
  });
});
