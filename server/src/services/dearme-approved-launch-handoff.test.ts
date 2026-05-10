import { describe, expect, it, vi } from "vitest";
import {
  callOutboundInputFromApprovedNextMove,
  dearMeApprovedLaunchHandoffService,
} from "./dearme-approved-launch-handoff.js";

const launchHandoff = {
  toolName: "post_x",
  channel: "x",
  gate: "publish",
  riskGate: "publish_social",
  voiceGateRequired: true,
  voiceGateArtifactKind: "x-tweet",
  voiceGateText: "A private proof packet is ready for owner-approved publishing.",
  voiceFingerprintId: "vf_1",
  payload: { text: "A private proof packet is ready for owner-approved publishing." },
};

function approval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "dearme_output_next_move",
    status: "approved",
    requestedByUserId: null,
    requestedByAgentId: "agent-1",
    decidedByUserId: "user-1",
    payload: {
      issueId: "issue-1",
      launchHandoff,
    },
    ...overrides,
  } as any;
}

describe("dearMeApprovedLaunchHandoffService", () => {
  it("maps an approved next-move launch handoff into one preapproved outbound call", async () => {
    const callOutbound = vi.fn(async () => ({
      kind: "delivered" as const,
      voiceGateScore: 96,
      externalId: "tweet-1",
    }));
    const svc = dearMeApprovedLaunchHandoffService({ callOutbound });

    const result = await svc.executeApprovedNextMove({
      approval: approval(),
      actorUserId: "user-1",
    });

    expect(result.kind).toBe("called");
    expect(callOutbound).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "post_x",
      companyId: "company-1",
      userId: "user-1",
      issueId: "issue-1",
      agentId: "agent-1",
      payload: launchHandoff.payload,
      voiceGateText: launchHandoff.voiceGateText,
      voiceGateArtifactKind: "x-tweet",
      voiceFingerprintId: "vf_1",
      preapprovedApprovalId: "approval-1",
      config: { minVoiceGateScore: 92, dailyUsdCap: 5 },
    }));
  });

  it("ignores approvals that do not carry a complete launch handoff", () => {
    expect(callOutboundInputFromApprovedNextMove({
      approval: approval({ payload: { issueId: "issue-1" } }),
      actorUserId: "user-1",
    })).toBeNull();
    expect(callOutboundInputFromApprovedNextMove({
      approval: approval({ status: "pending" }),
      actorUserId: "user-1",
    })).toBeNull();
  });
});
