import { describe, expect, it, vi } from "vitest";
import { createDearMeOpenClawGatewayDispatchMap } from "./dearme-openclaw-gateway-dispatch.js";

const dispatchContext = {
  companyId: "company-1",
  userId: "user-1",
  issueId: "issue-1",
  channel: "x",
  openclawRunId: "run-123",
  openclawSessionId: "session-123",
  agentId: "agent-123",
  approvalId: "approval-123",
  idempotencyKey: "run-123",
  originalPayload: { text: "ready to ship" },
} as const;

describe("dearme openclaw gateway dispatch", () => {
  it("fails closed when gateway config is missing", async () => {
    const execute = vi.fn();
    const dispatchMap = createDearMeOpenClawGatewayDispatchMap(null, { execute });
    const result = await dispatchMap.post_x?.({
      toolName: "post_x",
      encryptedCredential: "enc:secret",
      payload: { text: "ready to ship" },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "errored",
      error: "dearme_openclaw_gateway_dispatch_missing_config:OpenClaw gateway dispatch is not configured.",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps the approved next-move trace into the gateway adapter execution context", async () => {
    const execute = vi.fn(async (ctx) => {
      expect(ctx.runId).toBe("run-123");
      expect(ctx.agent).toMatchObject({
        id: "agent-123",
        companyId: "company-1",
        name: "DearMe x gateway dispatch",
        adapterType: "openclaw_gateway",
      });
      expect(ctx.config).toMatchObject({
        url: "wss://gateway.example/",
        headers: {
          "x-openclaw-token": "gateway-token",
        },
        payloadTemplate: {
          paperclip: {
            dearme: {
              toolName: "post_x",
              channel: "x",
              companyId: "company-1",
              userId: "user-1",
              issueId: "issue-1",
              openclawRunId: "run-123",
              openclawSessionId: "session-123",
              agentId: "agent-123",
              approvalId: "approval-123",
              idempotencyKey: "run-123",
              originalOutboundPayload: { text: "ready to ship" },
            },
          },
        },
      });
      expect(ctx.context).toMatchObject({
        companyId: "company-1",
        issueId: "issue-1",
        taskId: "issue-1",
        approvalId: "approval-123",
        approvalStatus: "approved",
        wakeReason: "dearme_next_move_approved",
        issueIds: ["issue-1"],
        paperclipWake: {
          toolName: "post_x",
          channel: "x",
          companyId: "company-1",
          userId: "user-1",
          issueId: "issue-1",
          openclawRunId: "run-123",
          openclawSessionId: "session-123",
          agentId: "agent-123",
          approvalId: "approval-123",
          idempotencyKey: "run-123",
          originalOutboundPayload: { text: "ready to ship" },
        },
      });
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        sessionId: "session-accepted",
        sessionDisplayId: "display-accepted",
        provider: "openclaw_gateway",
        biller: "openclaw_gateway",
        resultJson: { runId: "run-123" },
      };
    });

    const dispatchMap = createDearMeOpenClawGatewayDispatchMap(
      {
        url: "wss://gateway.example",
        headers: { "x-openclaw-token": "gateway-token" },
      },
      { execute },
    );
    const result = await dispatchMap.post_x?.({
      toolName: "post_x",
      encryptedCredential: "enc:secret",
      payload: { text: "ready to ship" },
      dispatchContext,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      kind: "delivered",
      externalId: "session-accepted",
      externalUrl: "display-accepted",
      paid: false,
      paidUsd: undefined,
    });
  });
});
