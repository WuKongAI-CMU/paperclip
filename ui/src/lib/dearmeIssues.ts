import type { Issue } from "@paperclipai/shared";

export function isDearMeIssueOriginKind(originKind: string | null | undefined) {
  return typeof originKind === "string" && originKind.startsWith("dearme_");
}

export function isDearMeIssue(issue: Pick<Issue, "originKind"> | null | undefined) {
  return isDearMeIssueOriginKind(issue?.originKind);
}
