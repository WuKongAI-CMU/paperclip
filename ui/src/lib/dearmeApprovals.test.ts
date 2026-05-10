import { describe, expect, it } from "vitest";
import {
  approvalActionErrorMessage,
  approvalDetailHref,
  approvalListActionErrorMessage,
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
    expect(approvalDetailHref("dearme_output_next_move", "approval-1")).toBe(
      "/dearme?view=decisions&approval=approval-1",
    );
    expect(approvalDetailHref("request_board_approval", "approval-1")).toBe(
      "/approvals/approval-1",
    );
    expect(approvalResolvedHref("dearme_output_next_move", "approval-1")).toBe(
      "/dearme?view=decisions&approval=approval-1",
    );
    expect(approvalResolvedHref("request_board_approval", "approval-1")).toBe(
      "/approvals/approval-1?resolved=approved",
    );
  });

  it("sanitizes internal approval errors only for DearMe decisions", () => {
    const internalError = new Error("Provider token rejected in /approvals/approval-1");

    expect(
      approvalActionErrorMessage(
        internalError,
        "Failed to approve",
        "dearme_output_next_move",
        "Failed to approve the DearMe decision.",
      ),
    ).toBe("Failed to approve the DearMe decision.");
    expect(
      approvalActionErrorMessage(
        internalError,
        "Failed to approve",
        "request_board_approval",
      ),
    ).toBe("Provider token rejected in /approvals/approval-1");
    expect(
      approvalListActionErrorMessage(
        internalError,
        "Failed to reject",
        [{ id: "approval-1", type: "dearme_brand_blueprint_apply" }],
        "approval-1",
        "Failed to send the DearMe decision back.",
      ),
    ).toBe("Failed to send the DearMe decision back.");
  });
});
