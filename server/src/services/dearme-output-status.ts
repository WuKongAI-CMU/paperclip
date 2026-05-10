import type { DearMeOutputStatus } from "@paperclipai/shared";

export function deriveDearMeOutputStatus(input: {
  issueStatus: string;
  hasProducedArtifact: boolean;
  hasRevisionRequest: boolean;
}): DearMeOutputStatus {
  const { issueStatus, hasProducedArtifact, hasRevisionRequest } = input;
  if (issueStatus === "cancelled") return "cancelled";
  if (issueStatus === "blocked") return "blocked";
  if (issueStatus === "done") return "complete";
  if ((issueStatus === "todo" || issueStatus === "in_progress") && hasRevisionRequest) {
    return "working";
  }
  if (issueStatus === "in_review" || hasProducedArtifact) return "ready_for_review";
  if (issueStatus === "todo" || issueStatus === "in_progress") return "working";
  return "queued";
}
