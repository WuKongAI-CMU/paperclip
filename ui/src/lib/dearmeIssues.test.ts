import { describe, expect, it } from "vitest";
import { isDearMeIssue, isDearMeIssueOriginKind } from "./dearmeIssues";

describe("dearmeIssues", () => {
  it("recognizes DearMe issue origins", () => {
    expect(isDearMeIssueOriginKind("dearme_brand_blueprint_apply")).toBe(true);
    expect(isDearMeIssue({ originKind: "dearme_brand_blueprint_apply" })).toBe(true);
  });

  it("ignores generic issue origins", () => {
    expect(isDearMeIssueOriginKind("manual")).toBe(false);
    expect(isDearMeIssue({ originKind: "routine_execution" })).toBe(false);
    expect(isDearMeIssue(null)).toBe(false);
  });
});
