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

const deployLaunchHandoff = {
  toolName: "deploy_site",
  channel: "dearme-cloud",
  gate: "deploy",
  riskGate: "deploy_public_site",
  payload: {
    handle: "peter-studio",
    artifactRef: "document:portfolio-update:r2",
    customDomain: null,
    target: "preview",
  },
};

const emailLaunchHandoff = {
  toolName: "send_email",
  channel: "resend",
  gate: "send",
  riskGate: "send_email",
  voiceGateRequired: true,
  voiceGateArtifactKind: "outbound-email",
  voiceGateText: "Peter, here's the private proof packet I mentioned.",
  voiceFingerprintId: "vf_email_1",
  payload: {
    toEmail: "lead@example.com",
    fromHandle: "Peter",
    subject: "Private proof packet",
    body: "Peter, here's the private proof packet I mentioned.",
  },
};

const linkedInDmLaunchHandoff = {
  toolName: "send_linkedin_dm",
  channel: "linkedin",
  gate: "send",
  riskGate: "send_social_dm",
  voiceGateRequired: true,
  voiceGateArtifactKind: "linkedin-dm",
  voiceGateText: "Peter, this private proof packet is ready when you have a minute.",
  voiceFingerprintId: "vf_linkedin_1",
  payload: {
    recipientUrn: "urn:li:person:lead-1",
    body: "Peter, this private proof packet is ready when you have a minute.",
    subject: "Private proof packet",
  },
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

  it("maps an approved portfolio update into a deploy-site outbound call", async () => {
    const callOutbound = vi.fn(async () => ({
      kind: "delivered" as const,
      voiceGateScore: null,
      externalId: "deploy_1",
    }));
    const svc = dearMeApprovedLaunchHandoffService({ callOutbound });

    const result = await svc.executeApprovedNextMove({
      approval: approval({
        payload: {
          issueId: "issue-1",
          launchHandoff: deployLaunchHandoff,
        },
      }),
      actorUserId: "user-1",
    });

    expect(result.kind).toBe("called");
    expect(callOutbound).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "deploy_site",
      companyId: "company-1",
      userId: "user-1",
      issueId: "issue-1",
      agentId: "agent-1",
      payload: deployLaunchHandoff.payload,
      voiceGateText: null,
      voiceGateArtifactKind: null,
      voiceFingerprintId: null,
      preapprovedApprovalId: "approval-1",
      config: { minVoiceGateScore: 92, dailyUsdCap: 5 },
    }));
  });

  it("maps an approved email outreach handoff into a send-email outbound call", async () => {
    const callOutbound = vi.fn(async () => ({
      kind: "delivered" as const,
      voiceGateScore: 94,
      externalId: "email_1",
    }));
    const svc = dearMeApprovedLaunchHandoffService({ callOutbound });

    const result = await svc.executeApprovedNextMove({
      approval: approval({
        payload: {
          issueId: "issue-1",
          launchHandoff: emailLaunchHandoff,
        },
      }),
      actorUserId: "user-1",
    });

    expect(result.kind).toBe("called");
    expect(callOutbound).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "send_email",
      companyId: "company-1",
      userId: "user-1",
      issueId: "issue-1",
      agentId: "agent-1",
      payload: emailLaunchHandoff.payload,
      voiceGateText: emailLaunchHandoff.voiceGateText,
      voiceGateArtifactKind: "outbound-email",
      voiceFingerprintId: "vf_email_1",
      preapprovedApprovalId: "approval-1",
      config: { minVoiceGateScore: 92, dailyUsdCap: 5 },
    }));
  });

  it("maps an approved LinkedIn DM handoff into a send-linkedin-dm outbound call", async () => {
    const callOutbound = vi.fn(async () => ({
      kind: "delivered" as const,
      voiceGateScore: 95,
      externalId: "urn:li:message:def",
    }));
    const svc = dearMeApprovedLaunchHandoffService({ callOutbound });

    const result = await svc.executeApprovedNextMove({
      approval: approval({
        payload: {
          issueId: "issue-1",
          launchHandoff: linkedInDmLaunchHandoff,
        },
      }),
      actorUserId: "user-1",
    });

    expect(result.kind).toBe("called");
    expect(callOutbound).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "send_linkedin_dm",
      companyId: "company-1",
      userId: "user-1",
      issueId: "issue-1",
      agentId: "agent-1",
      payload: linkedInDmLaunchHandoff.payload,
      voiceGateText: linkedInDmLaunchHandoff.voiceGateText,
      voiceGateArtifactKind: "linkedin-dm",
      voiceFingerprintId: "vf_linkedin_1",
      preapprovedApprovalId: "approval-1",
      config: { minVoiceGateScore: 92, dailyUsdCap: 5 },
    }));
  });

  it("treats a pause intent as a no-dispatch approved next move", async () => {
    const svc = dearMeApprovedLaunchHandoffService({
      callOutbound: vi.fn(),
    });

    expect(callOutboundInputFromApprovedNextMove({
      approval: approval({ decisionNote: "Please hold this and do not send." }),
      actorUserId: "user-1",
    })).toBeNull();

    const result = await svc.executeApprovedNextMove({
      approval: approval({ decisionNote: "Please hold this and do not send." }),
      actorUserId: "user-1",
    });

    expect(result).toEqual({ kind: "not_applicable" });
  });
});
