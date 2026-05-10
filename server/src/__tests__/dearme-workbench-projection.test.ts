import { describe, expect, it } from "vitest";
import { dearMeOutputItemSchema, type DearMeOutputItem } from "@paperclipai/shared";
import {
  dearMeWorkbenchProjectionOutput,
  dearMeWorkbenchProjectionText,
} from "../services/dearme-workbench.js";

const HIDDEN_SUBSTRATE_PATTERN =
  /\b(?:Symphony|Paperclip|OpenClaw|OK Partner|adapter|provider|workspace|runtime|setup_payload|workbench|workstream|model)\b/i;

describe("DearMe workbench projection helpers", () => {
  it("keeps projected workbench text customer-safe", () => {
    const projected = dearMeWorkbenchProjectionText(
      "Symphony routed OpenClaw runtime output through a Paperclip provider workbench from setup_payload.",
      "The team recorded a private update.",
    );

    expect(projected).toContain("DearMe");
    expect(projected).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
  });

  it("projects nested output payloads before the workbench response returns them", () => {
    const output: DearMeOutputItem = {
      id: "output-1",
      companyId: "company-1",
      kind: "content_drafts",
      title: "Symphony Paperclip adapter provider workspace runtime draft",
      summary: "OpenClaw runtime prepared a provider workbench output from setup_payload workspace.",
      status: "ready_for_review",
      isReviewable: true,
      issueId: "issue-1",
      issueIdentifier: "DM-45",
      issueTitle: "Paperclip workspace issue route",
      updatedAt: "2026-05-08T12:00:00.000Z",
      documents: [{
        id: "document-1",
        key: "draft",
        title: "Paperclip document",
        format: "markdown",
        revisionNumber: 1,
        bodyPreview: "OpenClaw runtime wrote a Symphony provider draft from setup_payload.",
        updatedAt: "2026-05-08T12:00:00.000Z",
      }],
      workProducts: [{
        id: "work-product-1",
        type: "draft",
        title: "Paperclip work product",
        url: null,
        status: "ready",
        reviewState: "pending",
        summary: "Provider workspace workbench summary.",
        updatedAt: "2026-05-08T12:00:00.000Z",
      }],
      latestUpdate: {
        id: "update-1",
        bodyPreview: "Paperclip adapter runtime posted a workstream update.",
        createdAt: "2026-05-08T12:00:00.000Z",
      },
      reviewLoop: {
        state: "needs_user_review",
        attemptCount: 1,
        maxAttempts: 3,
        isRetriable: true,
        lastAction: null,
        lastDecisionAt: null,
        lastDecisionNotePreview: "OpenClaw provider decision note.",
        nextStep: "Review Paperclip workbench output.",
        reviewHandoff: {
          action: "request_changes",
          title: "Paperclip handoff",
          summary: "Provider workbench handoff summary.",
          userDirection: "OpenClaw runtime user direction.",
          nextDraftDirection: "Remove provider workspace detail.",
        },
        feedbackTrace: {
          headline: "Paperclip feedback",
          summary: "Provider feedback summary.",
          userFeedback: "OpenClaw runtime feedback.",
          changes: ["Removed provider workbench detail."],
        },
      },
      details: [{
        kind: "draft_body",
        label: "Paperclip provider detail",
        value: "OpenClaw runtime detail from setup_payload workspace.",
        source: "derived",
      }],
      sourceEvidence: [{
        kind: "voice_memory",
        label: "Paperclip memory",
        summary: "Symphony provider memory summary.",
        source: "derived",
      }],
    };

    const projected = dearMeWorkbenchProjectionOutput(output);

    expect(() => dearMeOutputItemSchema.parse(projected)).not.toThrow();
    expect(JSON.stringify(projected)).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
    expect(projected.title).toContain("DearMe");
    expect(projected.reviewLoop.feedbackTrace?.summary).toContain("services feedback summary");
    expect(projected.sourceEvidence[0]?.summary).toContain("DearMe");
  });
});
