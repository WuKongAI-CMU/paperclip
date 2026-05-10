const DEARME_APPROVAL_TYPES = new Set([
  "dearme_brand_blueprint_apply",
  "dearme_output_next_move",
]);

export function isDearMeApprovalType(type?: string | null) {
  return typeof type === "string" && DEARME_APPROVAL_TYPES.has(type);
}

export function dearMeApprovalDecisionHref(approvalId?: string | null) {
  const params = new URLSearchParams({ view: "decisions" });
  if (approvalId) params.set("approval", approvalId);
  return `/dearme?${params.toString()}`;
}

export function approvalResolvedHref(type: string | null | undefined, approvalId: string) {
  if (isDearMeApprovalType(type)) return dearMeApprovalDecisionHref(approvalId);
  return `/approvals/${approvalId}?resolved=approved`;
}
