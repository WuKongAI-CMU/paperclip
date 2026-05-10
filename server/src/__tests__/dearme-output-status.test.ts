import { describe, expect, it } from "vitest";
import { deriveDearMeOutputStatus } from "../services/dearme-output-status.js";

describe("deriveDearMeOutputStatus", () => {
  it("keeps seeded private artifacts reviewable before any revision request", () => {
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "todo",
        hasProducedArtifact: true,
        hasRevisionRequest: false,
      }),
    ).toBe("ready_for_review");
  });

  it("moves revision-requested private work back into working state", () => {
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "todo",
        hasProducedArtifact: true,
        hasRevisionRequest: true,
      }),
    ).toBe("working");
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "in_progress",
        hasProducedArtifact: true,
        hasRevisionRequest: true,
      }),
    ).toBe("working");
  });

  it("preserves terminal and blocked customer statuses", () => {
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "done",
        hasProducedArtifact: true,
        hasRevisionRequest: true,
      }),
    ).toBe("complete");
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "blocked",
        hasProducedArtifact: true,
        hasRevisionRequest: true,
      }),
    ).toBe("blocked");
    expect(
      deriveDearMeOutputStatus({
        issueStatus: "cancelled",
        hasProducedArtifact: true,
        hasRevisionRequest: true,
      }),
    ).toBe("cancelled");
  });
});
