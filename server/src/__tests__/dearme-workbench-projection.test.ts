import { describe, expect, it } from "vitest";
import { dearMeOutputItemSchema, type DearMeOutputItem } from "@paperclipai/shared";
import { DEARME_NEXT_MOVE_DELIVERY_ACTIVITY } from "../services/dearme-approval-receipts.js";
import {
  dearmeWorkbenchProgressFromActivity,
  dearMeWorkbenchProjectionOutput,
  dearMeWorkbenchProjectionText,
} from "../services/dearme-workbench.js";

const HIDDEN_SUBSTRATE_PATTERN =
  /\b(?:Symphony|Paperclip|OpenClaw|OK Partner|adapter|provider|workspace|runtime|setup_payload|workbench|workstream|model|api key|credential|token|queue|worker|run id|runId|raw control plane)\b/i;

describe("DearMe workbench projection helpers", () => {
  it("keeps projected workbench text customer-safe", () => {
    const projected = dearMeWorkbenchProjectionText(
      "Symphony routed OpenClaw runtime output through a Paperclip provider workbench from setup_payload. API key credential token queue worker run id raw control plane.",
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

  it("projects connect-channel readiness through the launch-ready progress item", () => {
    const projected = dearmeWorkbenchProgressFromActivity({
      id: "activity-private-handoff",
      action: "dearme.private_execution_handoff_prepared",
      entityId: "approval-1",
      details: {
        approvalId: "approval-1",
        issueId: "issue-1",
        issueIdentifier: "PET-8",
        outputId: "issue-1:content_drafts",
        outputKind: "content_drafts",
        riskGate: "publish_social",
        executionReadiness: "private_handoff_ready",
        handoffTitle: "Launch-ready X brief prepared",
        handoffSummary: "The final approval is recorded and DearMe prepared the launch-ready brief. External action: still not run. Next: Connect X before DearMe can continue this approved next step.",
        handoffNextStep: "Connect X before DearMe can continue this approved next step.",
      },
      createdAt: new Date("2026-05-08T12:00:00.000Z"),
    });

    expect(projected).toEqual(expect.objectContaining({
      kind: "execution_handoff_prepared",
      title: "Launch-ready X brief prepared",
      summary: expect.stringContaining("Connect X before DearMe can continue this approved next step."),
      nextStep: "Connect X before DearMe can continue this approved next step.",
    }));
    expect(JSON.stringify(projected)).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
    expect(JSON.stringify(projected)).not.toMatch(/execution handoff|launch queue/i);
  });

  it("projects pause readiness through the launch-ready progress item", () => {
    const projected = dearmeWorkbenchProgressFromActivity({
      id: "activity-private-handoff-paused",
      action: "dearme.private_execution_handoff_prepared",
      entityId: "approval-1",
      details: {
        approvalId: "approval-1",
        issueId: "issue-1",
        issueIdentifier: "PET-8",
        outputId: "issue-1:content_drafts",
        outputKind: "content_drafts",
        riskGate: "publish_social",
        executionReadiness: "private_handoff_paused",
        handoffTitle: "Launch-ready posting step paused",
        handoffSummary: "The final approval is recorded and DearMe paused the next launch step. External action: still not run. Next: DearMe is paused until you resume or approve a new direction.",
        handoffNextStep: "DearMe is paused until you resume or approve a new direction.",
      },
      createdAt: new Date("2026-05-08T12:05:00.000Z"),
    });

    expect(projected).toEqual(expect.objectContaining({
      kind: "execution_handoff_prepared",
      title: "Launch-ready posting step paused",
      summary: expect.stringContaining("DearMe is paused until you resume or approve a new direction."),
      executionReadiness: "private_handoff_paused",
      nextStep: "DearMe is paused until you resume or approve a new direction.",
    }));
    expect(JSON.stringify(projected)).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
    expect(JSON.stringify(projected)).not.toMatch(/execution handoff|launch queue/i);
  });

  it("projects delivered next-move receipts through the delivery progress item", () => {
    const projected = dearmeWorkbenchProgressFromActivity({
      id: "activity-delivery",
      action: DEARME_NEXT_MOVE_DELIVERY_ACTIVITY,
      entityId: "approval-1",
      details: {
        approvalId: "approval-1",
        issueId: "issue-1",
        issueIdentifier: "PET-8",
        outputId: "issue-1:content_drafts",
        outputKind: "content_drafts",
        riskGate: "publish_social",
        deliveryStatus: "delivered",
        deliveryExternalId: "tweet-1",
        deliveryExternalUrl: "https://x.com/tester/status/tweet-1",
        deliveryTitle: "Approved next step delivered",
        deliverySummary: "Delivery: delivered. External action: completed. Next: Review the delivered X result or continue with the next approved step.",
        nextStep: "Review the delivered X result or continue with the next approved step.",
      },
      createdAt: new Date("2026-05-08T12:10:00.000Z"),
    });

    expect(projected).toEqual(expect.objectContaining({
      kind: "next_move_delivery_recorded",
      title: "Approved next step delivered",
      summary: expect.stringContaining("Review the delivered X result or continue with the next approved step."),
      deliveryStatus: "delivered",
      deliveryExternalId: "tweet-1",
      deliveryExternalUrl: "https://x.com/tester/status/tweet-1",
      nextStep: "Review the delivered X result or continue with the next approved step.",
    }));
    expect(JSON.stringify(projected)).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
    expect(JSON.stringify(projected)).not.toMatch(/launch queue|needs_oauth/i);
  });

  it("projects delivered Website preview receipts with the preview URL intact", () => {
    const projected = dearmeWorkbenchProgressFromActivity({
      id: "activity-website-preview-delivery",
      action: DEARME_NEXT_MOVE_DELIVERY_ACTIVITY,
      entityId: "approval-1",
      details: {
        approvalId: "approval-1",
        issueId: "issue-1",
        issueIdentifier: "PET-8",
        outputId: "issue-1:portfolio_update",
        outputKind: "portfolio_update",
        riskGate: "deploy_public_site",
        deliveryStatus: "delivered",
        deliveryExternalId: "dearme_preview_abc123",
        deliveryExternalUrl: "https://dearme.app/peter-studio?preview=dearme_preview_abc123",
        deliveryTitle: "Approved Website preview delivered",
        deliverySummary: "Delivery: delivered. External action: completed. Next: Open the delivered Website preview, then continue with the next approved step.",
        nextStep: "Open the delivered Website preview, then continue with the next approved step.",
      },
      createdAt: new Date("2026-05-08T12:10:00.000Z"),
    });

    expect(projected).toEqual(expect.objectContaining({
      kind: "next_move_delivery_recorded",
      title: "Approved Website preview delivered",
      summary: expect.stringContaining("Open the delivered Website preview"),
      outputKind: "portfolio_update",
      deliveryStatus: "delivered",
      deliveryExternalId: "dearme_preview_abc123",
      deliveryExternalUrl: "https://dearme.app/peter-studio?preview=dearme_preview_abc123",
      nextStep: "Open the delivered Website preview, then continue with the next approved step.",
    }));
    expect(JSON.stringify(projected)).not.toMatch(HIDDEN_SUBSTRATE_PATTERN);
    expect(JSON.stringify(projected)).not.toMatch(/launch queue|needs_oauth|dearme-cloud/i);
  });

  it("projects connection-needed receipts without leaking the raw outcome code", () => {
    const projected = dearmeWorkbenchProgressFromActivity({
      id: "activity-delivery-connection",
      action: DEARME_NEXT_MOVE_DELIVERY_ACTIVITY,
      entityId: "approval-1",
      details: {
        approvalId: "approval-1",
        issueId: "issue-1",
        issueIdentifier: "PET-8",
        outputId: "issue-1:content_drafts",
        outputKind: "content_drafts",
        riskGate: "publish_social",
        deliveryStatus: "needs_channel_connection",
        deliveryTitle: "Approved next step needs connection",
        deliverySummary: "Delivery: needs connection. External action: not completed. Next: Connect X before DearMe can continue this approved next step.",
        nextStep: "Connect X before DearMe can continue this approved next step.",
      },
      createdAt: new Date("2026-05-08T12:12:00.000Z"),
    });

    expect(projected).toEqual(expect.objectContaining({
      kind: "next_move_delivery_recorded",
      title: "Approved next step needs connection",
      deliveryStatus: "needs_channel_connection",
      nextStep: "Connect X before DearMe can continue this approved next step.",
    }));
    expect(JSON.stringify(projected)).not.toMatch(/needs_oauth|connect_channel_required/i);
  });
});
