import { describe, expect, it } from "vitest";
import {
  updateCompanyGovernanceSchema,
  updateCompanySchema,
} from "./company.js";

describe("company validators", () => {
  it("keeps the general company update schema to product-facing fields", () => {
    const parsed = updateCompanySchema.parse({
      name: "DearMe",
      description: null,
      feedbackDataSharingEnabled: true,
      feedbackDataSharingTermsVersion: "2026-05-09",
      brandColor: "#123456",
      logoAssetId: null,
    });

    expect(parsed).toEqual({
      name: "DearMe",
      description: null,
      feedbackDataSharingEnabled: true,
      feedbackDataSharingTermsVersion: "2026-05-09",
      brandColor: "#123456",
      logoAssetId: null,
    });
  });

  it.each([
    "status",
    "budgetMonthlyCents",
    "spentMonthlyCents",
    "requireBoardApprovalForNewAgents",
    "attachmentMaxBytes",
    "tier",
    "feedbackDataSharingConsentAt",
    "feedbackDataSharingConsentByUserId",
  ])("rejects %s on the general company update schema", (field) => {
    const parsed = updateCompanySchema.safeParse({
      name: "DearMe",
      [field]: field === "status" ? "archived" : 1,
    });

    expect(parsed.success).toBe(false);
  });

  it("keeps governed company fields on their board-only schema", () => {
    const parsed = updateCompanyGovernanceSchema.parse({
      status: "paused",
      budgetMonthlyCents: 5000,
      attachmentMaxBytes: 1024 * 1024,
      requireBoardApprovalForNewAgents: true,
    });

    expect(parsed).toEqual({
      status: "paused",
      budgetMonthlyCents: 5000,
      attachmentMaxBytes: 1024 * 1024,
      requireBoardApprovalForNewAgents: true,
    });
  });

  it.each([
    "spentMonthlyCents",
    "tier",
    "name",
    "description",
    "brandColor",
    "logoAssetId",
    "feedbackDataSharingEnabled",
  ])("rejects %s on the governance schema", (field) => {
    const parsed = updateCompanyGovernanceSchema.safeParse({
      requireBoardApprovalForNewAgents: true,
      [field]: field === "brandColor" ? "#123456" : "value",
    });

    expect(parsed.success).toBe(false);
  });
});
