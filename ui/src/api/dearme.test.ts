import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./client", () => ({
  api: mockApi,
}));

import { dearmeApi } from "./dearme";

const brand = {
  goals: ["Grow useful reach"],
  audiences: [],
  proofPoints: [],
  offers: [],
  voiceSamples: [],
  preferredChannels: [],
  constraints: [],
  cadence: "weekly" as const,
  budgetMonthlyCents: 25_000,
  autoDraftEnabled: true,
};

describe("dearmeApi", () => {
  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.get.mockResolvedValue({});
    mockApi.post.mockReset();
    mockApi.post.mockResolvedValue({});
  });

  it("gets paid beta access status through the DearMe company endpoint", async () => {
    await dearmeApi.getPaidBetaAccess("company-1");

    expect(mockApi.get).toHaveBeenCalledWith(
      "/dearme/companies/company-1/paid-beta/access",
    );
  });

  it("gets generated outputs through the DearMe company endpoint", async () => {
    await dearmeApi.getOutputs("company-1");

    expect(mockApi.get).toHaveBeenCalledWith(
      "/dearme/companies/company-1/outputs",
    );
  });

  it("posts output continuation through the DearMe company endpoint", async () => {
    const payload = {
      intent: "prepare_another_pass" as const,
      decisionNote: "Make it sharper before review.",
    };

    await dearmeApi.continueOutput("company-1", "issue-1:weekly_report", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/continue",
      payload,
    );
  });

  it("gets the team workbench through the DearMe company endpoint", async () => {
    await dearmeApi.getWorkbench("company-1");

    expect(mockApi.get).toHaveBeenCalledWith(
      "/dearme/companies/company-1/workbench",
    );
  });

  it("posts Voice & Memory updates through the DearMe company endpoint", async () => {
    const payload = {
      kind: "voice_sample" as const,
      title: "Operator note",
      body: "Short, direct operator note.",
      sourceLabel: null,
    };

    await dearmeApi.recordMemoryUpdate("company-1", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/memory-updates",
      payload,
    );
  });

  it("posts paid beta payment records through the DearMe company endpoint", async () => {
    const payload = {
      amountCents: 25_000,
      currency: "USD",
      description: "Founding beta payment",
      externalInvoiceId: "manual-invoice-1",
      occurredAt: "2026-05-07T14:00:00.000Z",
    };

    await dearmeApi.recordPaidBetaPayment("company-1", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/paid-beta/access-events",
      payload,
    );
  });

  it("posts Brand OS previews through the DearMe company endpoint", async () => {
    const payload = { brand };

    await dearmeApi.previewBrandBlueprint("company-1", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/brand-blueprints/preview",
      payload,
    );
  });

  it("posts first cycle previews through the DearMe company endpoint", async () => {
    const payload = { brand };

    await dearmeApi.previewFirstCycle("company-1", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/first-cycle/preview",
      payload,
    );
  });

  it("posts Brand OS apply requests through the DearMe company endpoint", async () => {
    const payload = {
      brand,
      approvalNote: "Start once approved.",
    };

    await dearmeApi.createBrandBlueprintApplyRequest("company-1", payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      "/dearme/companies/company-1/brand-blueprints/apply-requests",
      payload,
    );
  });
});
