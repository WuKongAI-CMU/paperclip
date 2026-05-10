import { describe, expect, it } from "vitest";
import {
  approvalResolvedHref,
  dearMeApprovalDecisionHref,
  isDearMeApprovalType,
} from "./dearmeApprovals";

describe("dearmeApprovals", () => {
  it("recognizes DearMe approval types only", () => {
    expect(isDearMeApprovalType("dearme_brand_blueprint_apply")).toBe(true);
    expect(isDearMeApprovalType("dearme_output_next_move")).toBe(true);
    expect(isDearMeApprovalType("request_board_approval")).toBe(false);
    expect(isDearMeApprovalType(null)).toBe(false);
  });

  it("builds DearMe decision links for approval review", () => {
    expect(dearMeApprovalDecisionHref("approval-1")).toBe(
      "/dearme?view=decisions&approval=approval-1",
    );
    expect(dearMeApprovalDecisionHref()).toBe("/dearme?view=decisions");
  });

  it("keeps generic approvals on the shared approval route", () => {
    expect(approvalResolvedHref("dearme_output_next_move", "approval-1")).toBe(
      "/dearme?view=decisions&approval=approval-1",
    );
    expect(approvalResolvedHref("request_board_approval", "approval-1")).toBe(
      "/approvals/approval-1?resolved=approved",
    );
  });
});
