import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCompanyService = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  remove: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  ensureMembership: vi.fn(),
}));

const mockBudgetService = vi.hoisted(() => ({
  upsertPolicy: vi.fn(),
}));

const mockCompanyPortabilityService = vi.hoisted(() => ({
  exportBundle: vi.fn(),
  previewExport: vi.fn(),
  previewImport: vi.fn(),
  importBundle: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());
const mockFeedbackService = vi.hoisted(() => ({
  listIssueVotesForUser: vi.fn(),
  listFeedbackTraces: vi.fn(),
  getFeedbackTraceById: vi.fn(),
  saveIssueVote: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  agentService: () => mockAgentService,
  budgetService: () => mockBudgetService,
  companyPortabilityService: () => mockCompanyPortabilityService,
  companyService: () => mockCompanyService,
  feedbackService: () => mockFeedbackService,
  logActivity: mockLogActivity,
}));

function createCompany() {
  const now = new Date("2026-03-19T02:00:00.000Z");
  return {
    id: "company-1",
    name: "Paperclip",
    description: null,
    status: "active",
    issuePrefix: "PAP",
    issueCounter: 568,
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    requireBoardApprovalForNewAgents: false,
    brandColor: "#123456",
    logoAssetId: "11111111-1111-4111-8111-111111111111",
    logoUrl: "/api/assets/11111111-1111-4111-8111-111111111111/content",
    createdAt: now,
    updatedAt: now,
  };
}

async function createApp(actor: Record<string, unknown>) {
  const [{ companyRoutes }, { errorHandler }] = await Promise.all([
    vi.importActual<typeof import("../routes/companies.js")>("../routes/companies.js"),
    vi.importActual<typeof import("../middleware/index.js")>("../middleware/index.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api/companies", companyRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("PATCH /api/companies/:companyId/branding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/companies.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    vi.clearAllMocks();
  });

  it("rejects non-CEO agent callers", async () => {
    mockAgentService.getById.mockResolvedValue({
      id: "agent-1",
      companyId: "company-1",
      role: "engineer",
    });
    const app = await createApp({
      type: "agent",
      agentId: "agent-1",
      companyId: "company-1",
      source: "agent_key",
      runId: "run-1",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/branding")
      .send({ logoAssetId: "11111111-1111-4111-8111-111111111111" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Only CEO agents");
    expect(mockCompanyService.update).not.toHaveBeenCalled();
  });

  it("allows CEO agent callers to update branding fields", async () => {
    const company = createCompany();
    mockAgentService.getById.mockResolvedValue({
      id: "agent-1",
      companyId: "company-1",
      role: "ceo",
    });
    mockCompanyService.update.mockResolvedValue(company);
    const app = await createApp({
      type: "agent",
      agentId: "agent-1",
      companyId: "company-1",
      source: "agent_key",
      runId: "run-1",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/branding")
      .send({
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        brandColor: "#123456",
      });

    expect(res.status).toBe(200);
    expect(res.body.logoAssetId).toBe(company.logoAssetId);
    expect(mockCompanyService.update).toHaveBeenCalledWith("company-1", {
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      brandColor: "#123456",
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "agent",
        actorId: "agent-1",
        agentId: "agent-1",
        runId: "run-1",
        action: "company.branding_updated",
        details: {
          logoAssetId: "11111111-1111-4111-8111-111111111111",
          brandColor: "#123456",
        },
      }),
    );
  });

  it("allows board callers to update branding fields", async () => {
    const company = createCompany();
    mockCompanyService.update.mockResolvedValue({
      ...company,
      brandColor: null,
      logoAssetId: null,
      logoUrl: null,
    });
    const app = await createApp({
      type: "board",
      userId: "user-1",
      source: "local_implicit",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/branding")
      .send({ brandColor: null, logoAssetId: null });

    expect(res.status).toBe(200);
    expect(res.body.brandColor ?? null).toBeNull();
    expect(res.body.logoAssetId ?? null).toBeNull();
  });

  it("rejects non-branding fields in the request body", async () => {
    const app = await createApp({
      type: "board",
      userId: "user-1",
      source: "local_implicit",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/branding")
      .send({
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        status: "archived",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(mockCompanyService.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/companies/:companyId", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/companies.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    vi.clearAllMocks();
  });

  it("rejects governance fields on the general company patch", async () => {
    mockCompanyService.getById.mockResolvedValue(createCompany());
    const app = await createApp({
      type: "board",
      userId: "user-1",
      companyId: "company-1",
      source: "local_implicit",
    });

    const res = await request(app)
      .patch("/api/companies/company-1")
      .send({
        name: "DearMe",
        budgetMonthlyCents: 5000,
        spentMonthlyCents: 1000,
        requireBoardApprovalForNewAgents: true,
        attachmentMaxBytes: 1024 * 1024,
        status: "archived",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(mockCompanyService.update).not.toHaveBeenCalled();
  });

  it("still accepts board-owned profile and brand fields", async () => {
    const company = { ...createCompany(), name: "DearMe", brandColor: null };
    mockCompanyService.getById.mockResolvedValue(createCompany());
    mockCompanyService.update.mockResolvedValue(company);
    const app = await createApp({
      type: "board",
      userId: "user-1",
      companyId: "company-1",
      source: "local_implicit",
    });

    const res = await request(app)
      .patch("/api/companies/company-1")
      .send({
        name: "DearMe",
        description: null,
        brandColor: null,
      });

    expect(res.status).toBe(200);
    expect(mockCompanyService.update).toHaveBeenCalledWith("company-1", {
      name: "DearMe",
      description: null,
      brandColor: null,
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "company.updated",
        details: {
          name: "DearMe",
          description: null,
          brandColor: null,
        },
      }),
    );
  });
});

describe("PATCH /api/companies/:companyId/governance", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/companies.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    vi.clearAllMocks();
  });

  it("lets board callers update governed company settings", async () => {
    const company = {
      ...createCompany(),
      budgetMonthlyCents: 5000,
      attachmentMaxBytes: 1024 * 1024,
      requireBoardApprovalForNewAgents: true,
    };
    mockBudgetService.upsertPolicy.mockResolvedValue({});
    mockCompanyService.update.mockResolvedValue(company);
    const app = await createApp({
      type: "board",
      userId: "user-1",
      companyId: "company-1",
      source: "local_implicit",
    });

    const body = {
      budgetMonthlyCents: 5000,
      attachmentMaxBytes: 1024 * 1024,
      requireBoardApprovalForNewAgents: true,
    };
    const res = await request(app)
      .patch("/api/companies/company-1/governance")
      .send(body);

    expect(res.status).toBe(200);
    expect(mockBudgetService.upsertPolicy).toHaveBeenCalledWith(
      "company-1",
      {
        scopeType: "company",
        scopeId: "company-1",
        amount: 5000,
        windowKind: "calendar_month_utc",
      },
      "user-1",
    );
    expect(mockCompanyService.update).toHaveBeenCalledWith("company-1", body);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "company.governance_updated",
        details: body,
      }),
    );
  });

  it("rejects spend, tier, and profile fields on the governance patch", async () => {
    const app = await createApp({
      type: "board",
      userId: "user-1",
      companyId: "company-1",
      source: "local_implicit",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/governance")
      .send({
        spentMonthlyCents: 1000,
        tier: "pro",
        name: "DearMe",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(mockBudgetService.upsertPolicy).not.toHaveBeenCalled();
    expect(mockCompanyService.update).not.toHaveBeenCalled();
  });

  it("rejects agent callers even when they are CEO agents", async () => {
    const app = await createApp({
      type: "agent",
      agentId: "agent-1",
      companyId: "company-1",
      source: "agent_key",
      runId: "run-1",
    });

    const res = await request(app)
      .patch("/api/companies/company-1/governance")
      .send({ requireBoardApprovalForNewAgents: true });

    expect(res.status).toBe(403);
    expect(mockBudgetService.upsertPolicy).not.toHaveBeenCalled();
    expect(mockCompanyService.update).not.toHaveBeenCalled();
  });
});
