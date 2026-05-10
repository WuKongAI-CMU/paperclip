import { describe, expect, it } from "vitest";
import {
  buildDearMeOutputRegenerationBriefForReviewLoop,
  buildDearMeOutputRegenerationBrief,
  dearMeOutputArtifactTitleForOriginFingerprint,
  parseDearMeOutputReviewDecisionComment,
  parseDearMeOutputReviewDecisionComments,
} from "../services/dearme-output-handoff.js";

describe("DearMe output regeneration brief", () => {
  it("turns a private review decision into the next draft brief", () => {
    const decision = parseDearMeOutputReviewDecisionComment({
      body: [
        "DearMe decision: requested changes before this represents me.",
        "Make the proof more concrete and less generic.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-10T13:00:00.000Z"),
    });

    expect(decision).toEqual(expect.objectContaining({
      action: "request_changes",
      notePreview: "Make the proof more concrete and less generic.",
    }));

    const brief = buildDearMeOutputRegenerationBrief({
      decision: decision!,
      artifactTitle: dearMeOutputArtifactTitleForOriginFingerprint("operation-draft_content_batch"),
      previousDraft: {
        title: "Proof-backed content drafts",
        summary: "Private drafts prepared for review.",
        bodyPreview: "Draft body: The first version reads too generic.",
      },
    });

    expect(brief).toContain("DearMe regeneration brief:");
    expect(brief).toContain("The user asked for changes to Content drafts.");
    expect(brief).toContain("Make the proof more concrete and less generic.");
    expect(brief).toContain("Proof backed content drafts");
    expect(brief).toContain("Revise the next private draft");
    expect(brief).toContain("Keep the next version private until the user reviews it.");

    const serialized = brief!.toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("does not build a regeneration brief for approvals", () => {
    const decision = parseDearMeOutputReviewDecisionComment({
      body: "DearMe decision: approved this prepared work.",
      createdAt: new Date("2026-05-10T13:05:00.000Z"),
    });

    expect(buildDearMeOutputRegenerationBrief({
      decision: decision!,
      artifactTitle: "Private work",
    })).toBeNull();
  });

  it("drops hidden worker terms from previous draft context", () => {
    const decision = parseDearMeOutputReviewDecisionComment({
      body: [
        "DearMe decision: regenerate this prepared work before review.",
        "Keep the proof but change the angle.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-10T13:08:00.000Z"),
    });

    const brief = buildDearMeOutputRegenerationBrief({
      decision: decision!,
      artifactTitle: "Content drafts",
      previousDraft: {
        title: "Paperclip provider draft",
        summary: "OpenClaw runtime summary",
        bodyPreview: "setup_payload from Symphony worker context",
      },
    });

    expect(brief).toContain("Keep the proof but change the angle.");
    expect(brief).not.toContain("Previous draft context:");

    const serialized = brief!.toLowerCase();
    for (const hiddenTerm of ["provider", "setup_payload", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("does not reuse stale critique after newer private work exists", () => {
    const decisions = parseDearMeOutputReviewDecisionComments([{
      body: [
        "DearMe decision: requested changes before this represents me.",
        "Make the example more concrete.",
      ].join("\n\n"),
      createdAt: new Date("2026-05-10T13:00:00.000Z"),
    }]);

    expect(buildDearMeOutputRegenerationBriefForReviewLoop({
      decisions,
      artifactTitle: "Content drafts",
      latestWorkUpdatedAt: new Date("2026-05-10T13:05:00.000Z"),
      previousDraft: {
        title: "Newer private draft",
        summary: "The critique has already been applied.",
      },
    })).toBeNull();
  });

  it("stops injecting regeneration context when the retry cap is reached", () => {
    const decisions = parseDearMeOutputReviewDecisionComments([
      {
        body: "DearMe decision: regenerate this prepared work before review.",
        createdAt: new Date("2026-05-10T13:02:00.000Z"),
      },
      {
        body: "DearMe decision: requested changes before this represents me.",
        createdAt: new Date("2026-05-10T13:01:00.000Z"),
      },
      {
        body: "DearMe decision: marked this prepared work as not useful.",
        createdAt: new Date("2026-05-10T13:00:00.000Z"),
      },
    ]);

    expect(buildDearMeOutputRegenerationBriefForReviewLoop({
      decisions,
      artifactTitle: "Content drafts",
      previousDraft: {
        title: "Third private attempt",
      },
    })).toBeNull();
  });

  it("uses stronger direction when prior work was not useful", () => {
    const decision = parseDearMeOutputReviewDecisionComment({
      body: [
        "DearMe decision: marked this prepared work as not useful.",
        "",
        "This misses the audience and sounds like a launch announcement.",
      ].join("\n"),
      createdAt: new Date("2026-05-10T13:10:00.000Z"),
    });

    const brief = buildDearMeOutputRegenerationBrief({
      decision: decision!,
      artifactTitle: "Opportunity drafts",
      previousDraft: null,
    });

    expect(brief).toContain("The user marked Opportunity drafts as not useful.");
    expect(brief).toContain("Change direction before drafting again");
  });

  it("maps DearMe work origins to customer-safe artifact labels", () => {
    expect(dearMeOutputArtifactTitleForOriginFingerprint("operation-draft_content_batch")).toBe("Content drafts");
    expect(dearMeOutputArtifactTitleForOriginFingerprint("operation-schedule_weekly_report")).toBe("Dear me report");
    expect(dearMeOutputArtifactTitleForOriginFingerprint("unknown-origin")).toBe("Private work");
  });
});
