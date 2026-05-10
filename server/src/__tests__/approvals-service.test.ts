import { beforeEach, describe, expect, it, vi } from "vitest";
import { approvalService } from "../services/approvals.ts";

const mockAgentService = vi.hoisted(() => ({
  activatePendingApproval: vi.fn(),
  create: vi.fn(),
  terminate: vi.fn(),
}));

const mockDearMeBrandBlueprintApplyService = vi.hoisted(() => ({
  applyApprovedBlueprint: vi.fn(),
}));

const mockValidateDearMeBrandBlueprintApplyPayload = vi.hoisted(() =>
  vi.fn((payload: unknown) => {
    if (payload && typeof payload === "object" && "setup_payload" in payload) {
      throw Object.assign(
        new Error("This DearMe approval needs to be refreshed before it can be approved."),
        { status: 422 },
      );
    }
    return payload;
  }),
);

const mockNotifyHireApproved = vi.hoisted(() => vi.fn());

vi.mock("../services/agents.js", () => ({
  agentService: vi.fn(() => mockAgentService),
}));

vi.mock("../services/hire-hook.js", () => ({
  notifyHireApproved: mockNotifyHireApproved,
}));

vi.mock("../services/dearme-brand-blueprint-apply.js", () => ({
  DEARME_BRAND_BLUEPRINT_ORIGIN_KIND: "dearme_brand_blueprint_apply",
  DEARME_BRAND_BLUEPRINT_INVALID_APPROVAL_MESSAGE:
    "This DearMe approval needs to be refreshed before it can be approved.",
  validateDearMeBrandBlueprintApplyPayload: mockValidateDearMeBrandBlueprintApplyPayload,
  dearmeBrandBlueprintApplyService: vi.fn(() => mockDearMeBrandBlueprintApplyService),
}));

type ApprovalRecord = {
  id: string;
  companyId: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  requestedByAgentId: string | null;
};

function createApproval(status: string): ApprovalRecord {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "hire_agent",
    status,
    payload: { agentId: "agent-1" },
    requestedByAgentId: "requester-1",
  };
}

function createDearMeApproval(status: string): ApprovalRecord {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "dearme_brand_blueprint_apply",
    status,
    payload: {},
    requestedByAgentId: null,
  };
}

function createDbStub(selectResults: ApprovalRecord[][], updateResults: ApprovalRecord[]) {
  const pendingSelectResults = [...selectResults];
  const selectWhere = vi.fn(async () => pendingSelectResults.shift() ?? []);
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));

  const returning = vi.fn(async () => updateResults);
  const updateWhere = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, update },
    update,
    selectWhere,
    returning,
  };
}

describe("approvalService resolution idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.activatePendingApproval.mockResolvedValue(undefined);
    mockAgentService.create.mockResolvedValue({ id: "agent-1" });
    mockAgentService.terminate.mockResolvedValue(undefined);
    mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint.mockResolvedValue({});
    mockNotifyHireApproved.mockResolvedValue(undefined);
  });

  it("treats repeated approve retries as no-ops after another worker resolves the approval", async () => {
    const dbStub = createDbStub(
      [[createApproval("pending")], [createApproval("approved")]],
      [],
    );

    const svc = approvalService(dbStub.db as any);
    const result = await svc.approve("approval-1", "board", "ship it");

    expect(result.applied).toBe(false);
    expect(result.approval.status).toBe("approved");
    expect(mockAgentService.activatePendingApproval).not.toHaveBeenCalled();
    expect(mockNotifyHireApproved).not.toHaveBeenCalled();
    expect(mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint).not.toHaveBeenCalled();
  });

  it("treats repeated reject retries as no-ops after another worker resolves the approval", async () => {
    const dbStub = createDbStub(
      [[createApproval("pending")], [createApproval("rejected")]],
      [],
    );

    const svc = approvalService(dbStub.db as any);
    const result = await svc.reject("approval-1", "board", "not now");

    expect(result.applied).toBe(false);
    expect(result.approval.status).toBe("rejected");
    expect(mockAgentService.terminate).not.toHaveBeenCalled();
  });

  it("still performs side effects when the resolution update is newly applied", async () => {
    const approved = createApproval("approved");
    const dbStub = createDbStub([[createApproval("pending")]], [approved]);

    const svc = approvalService(dbStub.db as any);
    const result = await svc.approve("approval-1", "board", "ship it");

    expect(result.applied).toBe(true);
    expect(mockAgentService.activatePendingApproval).toHaveBeenCalledWith("agent-1");
    expect(mockNotifyHireApproved).toHaveBeenCalledTimes(1);
    expect(mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint).not.toHaveBeenCalled();
  });

  it("applies a DearMe brand blueprint only when approval is newly approved", async () => {
    const approved = createDearMeApproval("approved");
    const dbStub = createDbStub([[createDearMeApproval("pending")]], [approved]);

    const svc = approvalService(dbStub.db as any);
    const result = await svc.approve("approval-1", "board", "create it");

    expect(result.applied).toBe(true);
    expect(mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint).toHaveBeenCalledWith(approved);
  });

  it("does not reapply DearMe brand blueprint approvals on repeated approve retries", async () => {
    const dbStub = createDbStub([[createDearMeApproval("approved")]], []);

    const svc = approvalService(dbStub.db as any);
    const result = await svc.approve("approval-1", "board", "retry");

    expect(result.applied).toBe(false);
    expect(mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint).not.toHaveBeenCalled();
  });

  it("preflights DearMe Brand OS payloads before approving them", async () => {
    const dbStub = createDbStub(
      [[{
        ...createDearMeApproval("pending"),
        payload: {
          summary: "Legacy malformed payload",
          setup_payload: { adapterType: "codex_local" },
        },
      }]],
      [],
    );

    const svc = approvalService(dbStub.db as any);
    let caught: unknown;
    try {
      await svc.approve("approval-1", "board", "ship it");
    } catch (err) {
      caught = err;
    }

    expect(caught).toMatchObject({
      status: 422,
      message: "This DearMe approval needs to be refreshed before it can be approved.",
    });
    expect((caught as { details?: unknown }).details).toBeUndefined();
    expect(dbStub.update).not.toHaveBeenCalled();
    expect(dbStub.returning).not.toHaveBeenCalled();
    expect(mockDearMeBrandBlueprintApplyService.applyApprovedBlueprint).not.toHaveBeenCalled();
  });
});
