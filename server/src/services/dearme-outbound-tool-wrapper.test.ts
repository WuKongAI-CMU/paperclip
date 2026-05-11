/**
 * Lynchpin coverage: every observable behaviour of `callOutbound` is
 * exercised here against the typed contracts from
 * `@paperclipai/dearme-openclaw` and `@paperclipai/dearme-agent-prompts`.
 *
 * The wrapper depends on a Db, but for the happy/sad paths we mock all 5
 * service deps (voiceGate, approvalResolver, channelConnections, workLoop,
 * sseBus). The Db is touched only on the `cost_events` insert path, so we
 * stub `db.insert(...).values(...)` to a chainable noop.
 */

import { describe, expect, it, vi } from "vitest";
import {
  dearMeOutboundToolWrapper,
  type ChannelDispatch,
  type DearMeOutboundToolDeps,
} from "./dearme-outbound-tool-wrapper.js";
import type { DearMeSseEvent } from "./dearme-sse-bus.js";

function makeDeps(overrides?: Partial<DearMeOutboundToolDeps>): {
  deps: DearMeOutboundToolDeps;
  emitted: DearMeSseEvent[];
  resolveCalls: Array<unknown>;
  scoreCalls: Array<unknown>;
  workLoopCalls: Array<unknown>;
  costEventsValues: Array<unknown>;
} {
  const emitted: DearMeSseEvent[] = [];
  const resolveCalls: Array<unknown> = [];
  const scoreCalls: Array<unknown> = [];
  const workLoopCalls: Array<unknown> = [];
  const costEventsValues: Array<unknown> = [];

  const dbStub = {
    insert: () => ({
      values: (v: unknown) => {
        costEventsValues.push(v);
        return Promise.resolve();
      },
    }),
  };

  const deps: DearMeOutboundToolDeps = {
    db: dbStub as unknown as DearMeOutboundToolDeps["db"],
    voiceGate: {
      scoreVoice: async (req) => {
        scoreCalls.push(req);
        return {
          score: 92,
          passed: true,
          floor: 70,
          reasons: [],
          rewrite: null,
        };
      },
    },
    approvalResolver: {
      resolve: async (req) => {
        resolveCalls.push(req);
        return {
          decision: "approved",
          reason: "auto-approved-test",
          approvalId: "ap_test_1",
        };
      },
    },
    channelConnections: {
      getActive: async () =>
        ({
          id: "cc_test_1",
          companyId: "co_test",
          userId: "u_test",
          channel: "x",
          externalAccountId: "x_acc_1",
          externalDisplayName: "tester",
          encryptedCredential: "enc:secret",
          scopes: [],
          expiresAt: null,
          status: "active",
          lastUsedAt: null,
          lastRefreshedAt: null,
          lastError: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) satisfies Awaited<ReturnType<DearMeOutboundToolDeps["channelConnections"]["getActive"]>>,
      markUsed: async () => undefined,
      markNeedsReauth: async () => undefined,
      upsertActive: async () => {
        throw new Error("upsertActive not used in wrapper tests");
      },
    },
    workLoop: {
      transition: async (req) => {
        workLoopCalls.push(req);
        return { ok: true } as const;
      },
      legalNext: () => [],
    },
    sseBus: {
      emit: (e) => emitted.push(e),
      subscribe: () => () => undefined,
      reset: () => undefined,
      listenerCount: () => 0,
    },
    channelDispatch: {
      post_x: vi.fn(async () => ({
        kind: "delivered",
        externalId: "tweet_1",
        externalUrl: "https://x.com/tester/status/tweet_1",
        paid: false,
      })) as ChannelDispatch,
    },
    ...overrides,
  };

  return { deps, emitted, resolveCalls, scoreCalls, workLoopCalls, costEventsValues };
}

const baseInput = {
  toolName: "post_x" as const,
  companyId: "co_test",
  userId: "u_test",
  issueId: "is_test",
  openclawRunId: "oc_run_1",
  agentId: "ag_test",
  payload: { text: "A private proof packet is ready for owner-approved publishing." },
  voiceGateText: "A private proof packet is ready for owner-approved publishing.",
  voiceGateArtifactKind: "x-tweet" as const,
  voiceFingerprintId: "vf_test",
  estimatedUsd: 0,
  config: { minVoiceGateScore: 70, dailyUsdCap: 25 },
};

describe("dearMeOutboundToolWrapper.callOutbound", () => {
  it("delivers via channel dispatch on the happy path", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "tweet_1",
      externalUrl: "https://x.com/tester/status/tweet_1",
      paid: false,
    }));
    const { deps, emitted, scoreCalls, resolveCalls, workLoopCalls } = makeDeps({
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("delivered");
    if (result.kind !== "delivered") return;
    expect(result.externalId).toBe("tweet_1");
    expect(result.voiceGateScore).toBe(92);
    expect(scoreCalls).toHaveLength(1);
    expect(scoreCalls[0]).toMatchObject({
      fingerprintId: "vf_test",
      text: baseInput.voiceGateText,
      kind: "x-tweet",
      minScore: 70,
    });
    expect(resolveCalls).toHaveLength(1);
    expect(resolveCalls[0]).toMatchObject({
      requestedByUserId: "u_test",
      requestedByAgentId: "ag_test",
      toolName: "post_x",
      channel: "x",
      gate: "publish",
      voiceGateScore: 92,
      reason: "outbound-tool-call-voice-gated",
    });
    expect(dispatch).toHaveBeenCalledWith({
      toolName: "post_x",
      encryptedCredential: "enc:secret",
      payload: baseInput.payload,
      dispatchContext: {
        companyId: "co_test",
        userId: "u_test",
        issueId: "is_test",
        channel: "x",
        openclawRunId: "oc_run_1",
        openclawSessionId: undefined,
        agentId: "ag_test",
        approvalId: "ap_test_1",
        idempotencyKey: expect.stringMatching(/^post_x:ap_test_1:[a-f0-9]{24}$/),
        originalPayload: baseInput.payload,
      },
    });
    expect(workLoopCalls).toHaveLength(1);
    const transition = workLoopCalls[0] as { from: string; to: string };
    expect(transition).toMatchObject({ from: "deliver", to: "audit" });
    // Wrapper itself emits `voice_gate_scored` and `channel_action_fired`.
    // The `work_loop_transition` SSE comes from the real workLoop service
    // (here mocked), so the contract we verify is "transition was called".
    const types = emitted.map((e) => e.type);
    expect(types).toContain("voice_gate_scored");
    expect(types).toContain("channel_action_fired");
    expect(emitted.find((event) => event.type === "channel_action_fired")?.payload).toMatchObject({
      toolName: "post_x",
      channel: "x",
      externalId: "tweet_1",
    });
  });

  it("delivers a preapproved next-move handoff without opening a second gate", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "tweet_1",
      externalUrl: "https://x.com/tester/status/tweet_1",
      paid: false,
    }));
    const { deps, resolveCalls } = makeDeps({
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      preapprovedApprovalId: "approval-final-1",
    });

    expect(result.kind).toBe("delivered");
    expect(resolveCalls).toHaveLength(0);
    expect(dispatch).toHaveBeenCalledWith({
      toolName: "post_x",
      encryptedCredential: "enc:secret",
      payload: baseInput.payload,
      dispatchContext: {
        companyId: "co_test",
        userId: "u_test",
        issueId: "is_test",
        channel: "x",
        openclawRunId: "oc_run_1",
        openclawSessionId: undefined,
        agentId: "ag_test",
        approvalId: "approval-final-1",
        idempotencyKey: expect.stringMatching(/^post_x:approval-final-1:[a-f0-9]{24}$/),
        originalPayload: baseInput.payload,
      },
    });
  });

  it("derives stable idempotency keys from tool, approval/run, and payload", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "tweet_1",
      externalUrl: "https://x.com/tester/status/tweet_1",
      paid: false,
    }));
    const { deps } = makeDeps({
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);

    await wrapper.callOutbound({
      ...baseInput,
      payload: { text: "First approved proof packet." },
      voiceGateText: "First approved proof packet.",
    });
    await wrapper.callOutbound({
      ...baseInput,
      payload: { text: "Second approved proof packet." },
      voiceGateText: "Second approved proof packet.",
    });

    const dispatchCalls = dispatch.mock.calls as unknown as Array<[
      { dispatchContext: { idempotencyKey: string } },
    ]>;
    const firstKey = dispatchCalls[0]![0].dispatchContext.idempotencyKey;
    const secondKey = dispatchCalls[1]![0].dispatchContext.idempotencyKey;
    expect(firstKey).toMatch(/^post_x:ap_test_1:[a-f0-9]{24}$/);
    expect(secondKey).toMatch(/^post_x:ap_test_1:[a-f0-9]{24}$/);
    expect(firstKey).not.toBe(secondKey);

    dispatch.mockClear();
    await wrapper.callOutbound({
      ...baseInput,
      preapprovedApprovalId: "approval-final-1",
    });
    await wrapper.callOutbound({
      ...baseInput,
      preapprovedApprovalId: "approval-final-1",
    });

    const retryCalls = dispatch.mock.calls as unknown as Array<[
      { dispatchContext: { idempotencyKey: string } },
    ]>;
    expect(retryCalls[0]![0].dispatchContext.idempotencyKey).toBe(
      retryCalls[1]![0].dispatchContext.idempotencyKey,
    );
  });

  it("returns rejected and moves work loop gate->review on rejected approval", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "should_not_run",
      paid: false,
    }));
    const { deps, workLoopCalls } = makeDeps({
      approvalResolver: {
        resolve: async () => ({
          decision: "rejected",
          reason: "voice-gate-below-floor",
          approvalId: "ap_rej",
        }),
      },
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("rejected");
    expect(dispatch).not.toHaveBeenCalled();
    expect(workLoopCalls).toHaveLength(1);
    expect(workLoopCalls[0]).toMatchObject({ from: "gate", to: "review" });
  });

  it("returns pending without dispatching when approval is pending", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "should_not_run",
      paid: false,
    }));
    const { deps } = makeDeps({
      approvalResolver: {
        resolve: async () => ({
          decision: "pending",
          reason: "first-time-channel",
          approvalId: "ap_pending",
        }),
      },
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("pending");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns needs_oauth when no active channel connection exists", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "should_not_run",
      paid: false,
    }));
    const { deps } = makeDeps({
      channelConnections: {
        getActive: async () => null,
        markUsed: async () => undefined,
        markNeedsReauth: async () => undefined,
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
      channelDispatch: { post_x: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("needs_oauth");
    if (result.kind !== "needs_oauth") return;
    expect(result.channel).toBe("x");
    expect(result.reason).toBe("no-active-channel-connection");
    expect(result.gate).toBe("connect_channel");
    expect(result.oauthStartUrl).toBe(
      "/v1/channels/co_test/x/start?issueId=is_test&runId=oc_run_1",
    );
    expect(result.message).toBe("Connect X before DearMe can continue this approved next step.");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("labels missing email connections without exposing the provider", async () => {
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "email_1",
      paid: false,
    }));
    const { deps } = makeDeps({
      channelConnections: {
        getActive: async () => null,
        markUsed: async () => undefined,
        markNeedsReauth: async () => undefined,
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
      channelDispatch: { send_email: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "send_email",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Proof packet",
        body: "Thought this would be useful.",
      },
      voiceGateText: "Thought this would be useful.",
      voiceGateArtifactKind: "outbound-email",
    });

    expect(result.kind).toBe("needs_oauth");
    if (result.kind !== "needs_oauth") return;
    expect(result.channel).toBe("resend");
    expect(result.message).toBe("Connect email before DearMe can continue this approved next step.");
    expect(result.message?.toLowerCase()).not.toContain("resend");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("routes SES email payloads through the SES channel connection", async () => {
    const getActiveCalls: Array<unknown> = [];
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "ses_message_1",
      paid: false,
    }));
    const { deps, resolveCalls, emitted } = makeDeps({
      channelConnections: {
        getActive: async (req) => {
          getActiveCalls.push(req);
          return {
            id: "cc_ses_1",
            companyId: "co_test",
            userId: "u_test",
            channel: "ses",
            externalAccountId: "ses_acc_1",
            externalDisplayName: "Peter Studio",
            encryptedCredential: "enc:ses",
            scopes: [],
            expiresAt: null,
            status: "active",
            lastUsedAt: null,
            lastRefreshedAt: null,
            lastError: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as never;
        },
        markUsed: async () => undefined,
        markNeedsReauth: async () => undefined,
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
      channelDispatch: { send_email: dispatch as ChannelDispatch },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const payload = {
      provider: "ses",
      toEmail: "lead@example.com",
      fromHandle: "Peter",
      subject: "Proof packet",
      body: "Thought this would be useful.",
    };
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "send_email",
      payload,
      voiceGateText: "Thought this would be useful.",
      voiceGateArtifactKind: "outbound-email",
    });

    expect(result.kind).toBe("delivered");
    expect(resolveCalls[0]).toMatchObject({ toolName: "send_email", channel: "ses" });
    expect(getActiveCalls).toEqual([{
      companyId: "co_test",
      userId: "u_test",
      channel: "ses",
    }]);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "send_email",
      encryptedCredential: "enc:ses",
      payload,
      dispatchContext: expect.objectContaining({
        channel: "ses",
      }),
    }));
    expect(emitted.find((event) => event.type === "channel_action_fired")?.payload)
      .toMatchObject({ toolName: "send_email", channel: "ses", externalId: "ses_message_1" });
  });

  it("rejects unsupported email providers before gate or channel lookup", async () => {
    const getActive = vi.fn();
    const { deps, resolveCalls, scoreCalls } = makeDeps({
      channelConnections: {
        getActive,
        markUsed: async () => undefined,
        markNeedsReauth: async () => undefined,
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "send_email",
      payload: {
        provider: "mailgun",
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Proof packet",
        body: "Thought this would be useful.",
      },
      voiceGateText: "Thought this would be useful.",
      voiceGateArtifactKind: "outbound-email",
    });

    expect(result).toEqual({
      kind: "errored",
      error: "email-provider-unsupported",
    });
    expect(scoreCalls).toHaveLength(0);
    expect(resolveCalls).toHaveLength(0);
    expect(getActive).not.toHaveBeenCalled();
  });

  it("carries the approval id into the channel connect start URL for preapproved retries", async () => {
    const { deps } = makeDeps({
      channelConnections: {
        getActive: async () => null,
        markUsed: async () => undefined,
        markNeedsReauth: async () => undefined,
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      preapprovedApprovalId: "ap_final_1",
    });
    expect(result.kind).toBe("needs_oauth");
    if (result.kind !== "needs_oauth") return;
    expect(result.oauthStartUrl).toBe(
      "/v1/channels/co_test/x/start?issueId=is_test&runId=oc_run_1&approvalId=ap_final_1",
    );
  });

  it("flips connection to needs_reauth when channel reports auth-error", async () => {
    let markCalls = 0;
    const { deps } = makeDeps({
      channelConnections: {
        getActive: async () => ({
          id: "cc_revoked",
          companyId: "co_test",
          userId: "u_test",
          channel: "x",
          externalAccountId: "x_acc_1",
          externalDisplayName: "tester",
          encryptedCredential: "enc:expired",
          scopes: [],
          expiresAt: null,
          status: "active",
          lastUsedAt: null,
          lastRefreshedAt: null,
          lastError: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as never,
        markUsed: async () => undefined,
        markNeedsReauth: async () => {
          markCalls += 1;
        },
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
      channelDispatch: {
        post_x: (async () => ({
          kind: "auth-error",
          reason: "401 from X API",
        })) as ChannelDispatch,
      },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("needs_oauth");
    if (result.kind !== "needs_oauth") return;
    expect(result.oauthStartUrl).toBe(
      "/v1/channels/co_test/x/start?issueId=is_test&runId=oc_run_1",
    );
    expect(result.message).toBe("Connect X before DearMe can continue this approved next step.");
    expect(markCalls).toBe(1);
  });

  it("sanitizes email auth errors before storing or showing reauth reasons", async () => {
    const markedReasons: string[] = [];
    const { deps } = makeDeps({
      channelConnections: {
        getActive: async () => ({
          id: "cc_resend_revoked",
          companyId: "co_test",
          userId: "u_test",
          channel: "resend",
          externalAccountId: "resend_acc_1",
          externalDisplayName: "Peter Studio",
          encryptedCredential: "enc:expired",
          scopes: [],
          expiresAt: null,
          status: "active",
          lastUsedAt: null,
          lastRefreshedAt: null,
          lastError: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as never,
        markUsed: async () => undefined,
        markNeedsReauth: async ({ error }) => {
          markedReasons.push(error);
        },
        upsertActive: async () => {
          throw new Error("not used");
        },
      },
      channelDispatch: {
        send_email: (async () => ({
          kind: "auth-error",
          reason: "Resend bearer token expired",
        })) as ChannelDispatch,
      },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "send_email",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Proof packet",
        body: "Thought this would be useful.",
      },
      voiceGateText: "Thought this would be useful.",
      voiceGateArtifactKind: "outbound-email",
    });

    expect(result.kind).toBe("needs_oauth");
    if (result.kind !== "needs_oauth") return;
    expect(result.message).toBe("Connect email before DearMe can continue this approved next step.");
    expect(result.reason).toBe("channel-auth-refresh-required");
    expect(markedReasons).toEqual(["channel-auth-refresh-required"]);
  });

  it("errors immediately when voice-gate input is missing for a voice-gated tool", async () => {
    const { deps } = makeDeps();
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      voiceGateText: null,
    });
    expect(result.kind).toBe("errored");
    if (result.kind !== "errored") return;
    expect(result.error).toBe("voice-gate-input-missing-for-required-tool");
  });

  it("skips voice-gate for non-voice-gated tools (deploy_site)", async () => {
    const { deps, scoreCalls } = makeDeps({
      channelDispatch: {
        deploy_site: (async () => ({
          kind: "delivered",
          externalId: "deploy_1",
          externalUrl: "https://dearme.app/tester",
          paid: false,
        })) as ChannelDispatch,
      },
      // deploy_site channel is "dearme-cloud" — not in the OAuth list, so
      // getActive will be skipped naturally.
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "deploy_site",
      payload: {
        handle: "tester",
        artifactRef: "sha:abc",
        target: "preview",
      },
      voiceGateText: null,
      voiceGateArtifactKind: null,
      voiceFingerprintId: null,
    });
    expect(result.kind).toBe("delivered");
    expect(scoreCalls).toHaveLength(0);
  });

  it("records cost_events when dispatch returns paid=true and agentId is set", async () => {
    const { deps, costEventsValues } = makeDeps({
      channelDispatch: {
        create_meta_campaign: (async () => ({
          kind: "delivered",
          externalId: "camp_1",
          paid: true,
          paidUsd: 12.5,
        })) as ChannelDispatch,
      },
    });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "create_meta_campaign",
      payload: { campaign: { name: "test" } },
      voiceGateText: null,
      voiceGateArtifactKind: null,
      voiceFingerprintId: null,
      estimatedUsd: 12.5,
    });
    expect(result.kind).toBe("delivered");
    expect(costEventsValues).toHaveLength(1);
    expect(costEventsValues[0]).toMatchObject({
      costCents: 1250,
      provider: "meta_ads",
      billingType: "outbound_tool",
      model: "create_meta_campaign",
    });
  });

  it("returns errored when dispatcher is missing for the tool", async () => {
    const { deps } = makeDeps({ channelDispatch: {} });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound(baseInput);
    expect(result.kind).toBe("errored");
    if (result.kind !== "errored") return;
    expect(result.error).toBe("no-dispatcher-registered:post_x");
  });

  it("returns errored when dispatcher is missing for deploy_site", async () => {
    const { deps } = makeDeps({ channelDispatch: {} });
    const wrapper = dearMeOutboundToolWrapper(deps);
    const result = await wrapper.callOutbound({
      ...baseInput,
      toolName: "deploy_site",
      payload: {
        handle: "peter-studio",
        artifactRef: "document:portfolio-update:r2",
        target: "preview",
      },
      voiceGateText: null,
      voiceGateArtifactKind: null,
      voiceFingerprintId: null,
    });
    expect(result.kind).toBe("errored");
    if (result.kind !== "errored") return;
    expect(result.error).toBe("no-dispatcher-registered:deploy_site");
  });
});
