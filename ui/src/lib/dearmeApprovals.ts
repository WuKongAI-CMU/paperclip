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

export function approvalDetailHref(type: string | null | undefined, approvalId: string) {
  if (isDearMeApprovalType(type)) return dearMeApprovalDecisionHref(approvalId);
  return `/approvals/${approvalId}`;
}

export function approvalResolvedHref(type: string | null | undefined, approvalId: string) {
  if (isDearMeApprovalType(type)) return dearMeApprovalDecisionHref(approvalId);
  return `/approvals/${approvalId}?resolved=approved`;
}

const INTERNAL_APPROVAL_ERROR_PATTERN =
  /\b(paperclip|openclaw|symphony|codex|provider|adapter|runtime|model|token|setup[_ -]?payload|workspace|workbench)\b|\/approvals?\//i;

function fallbackErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function approvalActionErrorMessage(
  error: unknown,
  fallback: string,
  approvalType?: string | null,
  dearMeFallback = "Failed to update the DearMe decision.",
) {
  const message = fallbackErrorMessage(error, fallback);
  if (!isDearMeApprovalType(approvalType)) return message;
  return INTERNAL_APPROVAL_ERROR_PATTERN.test(message) ? dearMeFallback : message;
}

export function approvalListActionErrorMessage(
  error: unknown,
  fallback: string,
  approvals: Array<{ id: string; type?: string | null }>,
  approvalId: string,
  dearMeFallback?: string,
) {
  const approvalType = approvals.find((approval) => approval.id === approvalId)?.type;
  return approvalActionErrorMessage(error, fallback, approvalType, dearMeFallback);
}
