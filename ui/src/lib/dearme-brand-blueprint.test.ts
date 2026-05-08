import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEARME_BRAND_BLUEPRINT_FORM,
  buildDearMeBrandBlueprintApplyRequest,
  buildDearMeBrandBlueprintSeed,
  dollarsToMonthlyCents,
  splitBrandBlueprintLines,
} from "./dearme-brand-blueprint";

describe("DearMe Brand OS form helpers", () => {
  it("splits textarea lists, trims whitespace, and removes duplicates", () => {
    expect(splitBrandBlueprintLines("Proof A\n\n proof a \nProof B ")).toEqual(["Proof A", "Proof B"]);
  });

  it("normalizes monthly budget dollars into bounded cents", () => {
    expect(dollarsToMonthlyCents("250.25")).toBe(25_025);
    expect(dollarsToMonthlyCents("-4")).toBe(0);
    expect(dollarsToMonthlyCents("999999")).toBe(500_000);
  });

  it("builds a Brand OS seed with a company-name fallback", () => {
    const seed = buildDearMeBrandBlueprintSeed(
      {
        ...DEFAULT_DEARME_BRAND_BLUEPRINT_FORM,
        displayName: "",
        goals: "Grow owned audience",
        voiceSamples: "I write short operational notes.\nI prefer plain language.",
        budgetMonthlyDollars: "125",
      },
      "Peter Studio",
    );

    expect(seed.displayName).toBe("Peter Studio");
    expect(seed.goals).toEqual(["Grow owned audience"]);
    expect(seed.voiceSamples).toHaveLength(2);
    expect(seed.budgetMonthlyCents).toBe(12_500);
  });

  it("builds an apply request with a nullable approval note", () => {
    const request = buildDearMeBrandBlueprintApplyRequest(
      {
        ...DEFAULT_DEARME_BRAND_BLUEPRINT_FORM,
        approvalNote: "  ",
      },
      "Peter Studio",
    );

    expect(request.approvalNote).toBeNull();
    expect(request.brand.displayName).toBe("Peter Studio");
  });
});
