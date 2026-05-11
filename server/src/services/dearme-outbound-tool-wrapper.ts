/**
 * The lynchpin: cloud-side wrapper that runs every outbound tool call.
 *
 * One function (`callOutbound`) ties the tri-substrate integration together
 * end-to-end:
 *
 *   1. Voice-score the staged content (if the tool requires it)
 *   2. Resolve the approval gate (publish/send/deploy/spend)
 *   3. Look up the user's per-channel OAuth grant
 *   4. Dispatch to the channel-specific impl (or stub it out)
 *   5. Audit: cost_events + activity_log + work_loop transition + SSE
 *
 * Substrate mapping (see TRI-SUBSTRATE-ARCHITECTURE.md §4 + §7):
 *   - Polsia: "deliver" stage of the work loop. Voice gate. 4 approval gates.
 *   - Naive: issues, issue_approvals, channel_connections, cost_events,
 *     activity_log.
 *   - OpenClaw: outbound tool surface. The plugin tool wraps THIS function
 *     so every channel call flows through one place.
 *
 * Design rules:
 *   - This file never reaches into a channel API directly. It dispatches
 *     to per-channel impls (DM-172 / DM-174 / DM-176 / DM-177 / DM-178)
 *     via an injected `channelDispatch` map; tests pass stubs.
 *   - This file is the only place that decides the order of voice gate ->
 *     approval -> dispatch. Per-tool code never re-orders.
 *   - Every observable side effect (decision, dispatch attempt, cost,
 *     transition) emits a typed SSE event so the workbench renders
 *     real-time.
 */

import { createHash } from "node:crypto";
import type { ChannelConnectionChannel, Db } from "@paperclipai/db";
import { costEvents } from "@paperclipai/db";
import {
  DEARME_OUTBOUND_TOOL_BINDINGS,
  type DearMeOutboundToolName,
} from "@paperclipai/dearme-openclaw";
import type { VoiceGateArtifactKind } from "@paperclipai/dearme-ai-proxy";
import type { DearMeApprovalResolverService } from "./dearme-approval-resolver.js";
import type { DearMeChannelConnectionsService } from "./dearme-channel-connections.js";
import type { DearMeSseBus } from "./dearme-sse-bus.js";
import type { DearMeVoiceGateService } from "./dearme-voice-gate.js";
import type { DearMeWorkLoopService } from "./dearme-work-loop.js";
import { logger } from "../middleware/logger.js";

/**
 * Per-channel dispatch fn. Each impl is per-tool (DM-172 ships post_x,
 * DM-174 ships send_email, etc). Returns either a delivered envelope or
 * a typed error.
 */
export type ChannelDispatch = (input: {
  toolName: DearMeOutboundToolName;
  encryptedCredential: string;
  payload: unknown;
  dispatchContext: DearMeOutboundDispatchContext;
}) => Promise<
  | {
      kind: "delivered";
      externalId: string;
      externalUrl?: string;
      paid: boolean;
      paidUsd?: number;
    }
  | { kind: "auth-error"; reason: string }
  | { kind: "errored"; error: string }
>;

export interface DearMeOutboundDispatchContext {
  companyId: string;
  userId: string;
  issueId: string;
  channel: string;
  openclawRunId: string;
  openclawSessionId?: string;
  agentId?: string;
  approvalId?: string;
  idempotencyKey: string;
  originalPayload: unknown;
}

export interface DearMeOutboundToolDeps {
  db: Db;
  voiceGate: DearMeVoiceGateService;
  approvalResolver: DearMeApprovalResolverService;
  channelConnections: DearMeChannelConnectionsService;
  workLoop: DearMeWorkLoopService;
  sseBus: DearMeSseBus;
  /** Per-channel dispatchers; missing entries -> tool returns errored. */
  channelDispatch: Partial<Record<DearMeOutboundToolName, ChannelDispatch>>;
}

export interface CallOutboundInput {
  toolName: DearMeOutboundToolName;
  companyId: string;
  userId: string;
  issueId: string;
  /** OpenClaw runId for cross-substrate tracing. */
  openclawRunId: string;
  /** OpenClaw session id (optional but recommended). */
  openclawSessionId?: string;
  agentId?: string;
  /** Free-form payload — shape is per-tool, defined in dearme-openclaw/tools. */
  payload: unknown;
  /**
   * The text to score against the voice fingerprint. Tools that aren't
   * voice-gated (deploy, spend) pass `null`.
   */
  voiceGateText: string | null;
  voiceGateArtifactKind: VoiceGateArtifactKind | null;
  /**
   * The user's voice fingerprint id (from `users.voiceFingerprintId`).
   * Required if `voiceGateText` is non-null.
   */
  voiceFingerprintId: string | null;
  /** Money estimate for spend gates; 0 elsewhere. */
  estimatedUsd: number;
  /**
   * A final user approval that already governs this handoff. When present,
   * the wrapper reuses that approval instead of creating a second gate row.
   */
  preapprovedApprovalId?: string;
  /** Per-tenant config (cap + min-score). */
  config: {
    minVoiceGateScore: number;
    dailyUsdCap: number;
  };
}

export type CallOutboundOutcome =
  | {
      kind: "delivered";
      voiceGateScore: number | null;
      externalId: string;
      externalUrl?: string;
    }
  | { kind: "pending"; approvalId: string; reason: string }
  | {
      kind: "needs_oauth";
      channel: string;
      oauthStartUrl: string;
      reason: string;
      gate?: "connect_channel";
      message?: string;
    }
  | { kind: "rejected"; reason: string; gate: string }
  | { kind: "errored"; error: string };

function buildChannelOAuthStartUrl(input: CallOutboundInput, channel: string) {
  const params = new URLSearchParams({
    issueId: input.issueId,
    runId: input.openclawRunId,
  });
  if (input.preapprovedApprovalId) {
    params.set("approvalId", input.preapprovedApprovalId);
  }
  return `/v1/channels/${encodeURIComponent(input.companyId)}/${encodeURIComponent(channel)}/start?${params.toString()}`;
}

function customerChannelLabel(channel: string) {
  if (channel === "x") return "X";
  if (channel === "linkedin") return "LinkedIn";
  if (channel === "resend" || channel === "ses") return "email";
  if (channel === "meta_ads") return "ads";
  return "this channel";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveOutboundChannel(
  toolName: DearMeOutboundToolName,
  defaultChannel: string,
  payload: unknown,
): { ok: true; channel: string } | { ok: false; error: string } {
  if (toolName !== "send_email") return { ok: true, channel: defaultChannel };

  const record = asRecord(payload);
  const provider = record ? stringField(record, "provider") ?? "resend" : "resend";
  if (provider === "resend" || provider === "ses") {
    return { ok: true, channel: provider };
  }
  return { ok: false, error: "email-provider-unsupported" };
}

function isOauthChannel(channel: string): channel is ChannelConnectionChannel {
  return channel === "x" ||
    channel === "linkedin" ||
    channel === "resend" ||
    channel === "ses" ||
    channel === "meta_ads";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function buildOutboundIdempotencyKey(input: CallOutboundInput, approvalId: string | undefined) {
  const payloadHash = createHash("sha256")
    .update(stableStringify(input.payload))
    .digest("hex")
    .slice(0, 24);
  return [input.toolName, approvalId ?? input.openclawRunId, payloadHash].join(":").slice(0, 256);
}

function sanitizeReauthReason(reason: string) {
  const trimmed = reason.trim();
  if (
    /^[a-z0-9:-]+$/i.test(trimmed) &&
    !/(api[-_ ]?key|secret|token|bearer|resend|ses|aws|gcp|vault)/i.test(trimmed)
  ) {
    return trimmed;
  }
  return "channel-auth-refresh-required";
}

export function dearMeOutboundToolWrapper(deps: DearMeOutboundToolDeps) {
  return {
    async callOutbound(input: CallOutboundInput): Promise<CallOutboundOutcome> {
      const binding = DEARME_OUTBOUND_TOOL_BINDINGS[input.toolName];
      const channel = resolveOutboundChannel(input.toolName, binding.channel, input.payload);
      if (!channel.ok) return { kind: "errored", error: channel.error };
      const now = () => new Date().toISOString();
      const baseScope = {
        companyId: input.companyId,
        issueId: input.issueId,
        agentId: input.agentId,
        openclawSessionId: input.openclawSessionId,
      };

      // Step 1 — voice gate (only if tool requires)
      let voiceGateScore: number | null = null;
      if (binding.voiceGateRequired) {
        if (!input.voiceGateText || !input.voiceGateArtifactKind || !input.voiceFingerprintId) {
          return {
            kind: "errored",
            error: "voice-gate-input-missing-for-required-tool",
          };
        }
        const result = await deps.voiceGate.scoreVoice({
          fingerprintId: input.voiceFingerprintId,
          companyId: input.companyId,
          userId: input.userId,
          text: input.voiceGateText,
          kind: input.voiceGateArtifactKind,
          minScore: input.config.minVoiceGateScore,
        });
        voiceGateScore = result.score;
        deps.sseBus.emit({
          type: "voice_gate_scored",
          emittedAt: now(),
          scope: { ...baseScope, workLoopState: "gate" },
          payload: {
            score: result.score,
            fingerprintId: input.voiceFingerprintId,
            artifactKind: input.voiceGateArtifactKind,
            passed: result.passed,
            floor: result.floor,
          },
        });
      }

      // Step 2 — resolve approval
      const approval = input.preapprovedApprovalId
        ? {
            decision: "approved" as const,
            reason: "preapproved-next-move",
            approvalId: input.preapprovedApprovalId,
          }
        : await deps.approvalResolver.resolve({
            companyId: input.companyId,
            requestedByUserId: input.userId,
            requestedByAgentId: input.agentId ?? null,
            issueId: input.issueId,
            toolName: input.toolName,
            channel: channel.channel,
            gate: binding.gate,
            estimatedUsd: input.estimatedUsd,
            voiceGateScore,
            reason: binding.voiceGateRequired
              ? "outbound-tool-call-voice-gated"
              : "outbound-tool-call",
            config: input.config,
          });

      if (approval.decision === "rejected") {
        await deps.workLoop.transition({
          companyId: input.companyId,
          issueId: input.issueId,
          from: "gate",
          to: "review",
          role: input.toolName,
          reason: `rejected:${approval.reason}`,
          openclawSessionId: input.openclawSessionId,
          agentId: input.agentId,
        });
        return { kind: "rejected", reason: approval.reason, gate: binding.gate };
      }
      if (approval.decision === "pending") {
        return { kind: "pending", approvalId: approval.approvalId, reason: approval.reason };
      }

      // Step 3 — channel OAuth lookup. The deploy/spend channels are not
      // oauth-gated against `channel_connections` (deploy = our cloud,
      // spend = meta_ads which we treat the same way) but every other
      // tool does need an active row.
      let connection: Awaited<ReturnType<DearMeChannelConnectionsService["getActive"]>> = null;
      if (isOauthChannel(channel.channel)) {
        connection = await deps.channelConnections.getActive({
          companyId: input.companyId,
          userId: input.userId,
          channel: channel.channel,
        });
        if (!connection) {
          const channelLabel = customerChannelLabel(channel.channel);
          const oauthStartUrl = buildChannelOAuthStartUrl(input, channel.channel);
          return {
            kind: "needs_oauth",
            channel: channel.channel,
            oauthStartUrl,
            reason: "no-active-channel-connection",
            gate: "connect_channel",
            message: `Connect ${channelLabel} before DearMe can continue this approved next step.`,
          };
        }
      }

      // Step 4 — dispatch
      const dispatcher = deps.channelDispatch[input.toolName];
      if (!dispatcher) {
        return {
          kind: "errored",
          error: `no-dispatcher-registered:${input.toolName}`,
        };
      }
      const dispatchResult = await dispatcher({
        toolName: input.toolName,
        encryptedCredential: connection?.encryptedCredential ?? "",
        payload: input.payload,
        dispatchContext: {
          companyId: input.companyId,
          userId: input.userId,
          issueId: input.issueId,
          channel: channel.channel,
          openclawRunId: input.openclawRunId,
          openclawSessionId: input.openclawSessionId,
          agentId: input.agentId,
          approvalId: approval.approvalId,
          idempotencyKey: buildOutboundIdempotencyKey(input, approval.approvalId),
          originalPayload: input.payload,
        },
      });

      if (dispatchResult.kind === "auth-error") {
        const reauthReason = sanitizeReauthReason(dispatchResult.reason);
        if (connection) {
          await deps.channelConnections.markNeedsReauth({
            connectionId: connection.id,
            error: reauthReason,
          });
        }
        return {
          kind: "needs_oauth",
          channel: channel.channel,
          oauthStartUrl: buildChannelOAuthStartUrl(input, channel.channel),
          reason: reauthReason,
          gate: "connect_channel",
          message: `Connect ${customerChannelLabel(channel.channel)} before DearMe can continue this approved next step.`,
        };
      }
      if (dispatchResult.kind === "errored") {
        logger.error(
          { toolName: input.toolName, error: dispatchResult.error },
          "dearme-outbound-tool-wrapper: dispatch failed",
        );
        return { kind: "errored", error: dispatchResult.error };
      }

      // Step 5 — audit
      if (connection) {
        await deps.channelConnections.markUsed(connection.id);
      }

      if (
        dispatchResult.paid &&
        dispatchResult.paidUsd &&
        dispatchResult.paidUsd > 0 &&
        input.agentId
      ) {
        const costCents = Math.round(dispatchResult.paidUsd * 100);
        await deps.db.insert(costEvents).values({
          companyId: input.companyId,
          agentId: input.agentId,
          issueId: input.issueId,
          billingCode: `dearme.outbound.${input.toolName}`,
          provider: channel.channel,
          biller: "dearme",
          billingType: "outbound_tool",
          model: input.toolName,
          inputTokens: 0,
          outputTokens: 0,
          costCents,
          occurredAt: new Date(),
        });
        deps.sseBus.emit({
          type: "cost_recorded",
          emittedAt: now(),
          scope: { ...baseScope, workLoopState: "audit" },
          payload: {
            costEventId: dispatchResult.externalId,
            source: `dearme.outbound.${input.toolName}`,
            amountUsd: dispatchResult.paidUsd,
            dailyCapPctAfter: 0,
          },
        });
      }

      deps.sseBus.emit({
        type: "channel_action_fired",
        emittedAt: now(),
        scope: { ...baseScope, workLoopState: "deliver" },
        payload: {
          toolName: input.toolName,
          channel: channel.channel,
          externalId: dispatchResult.externalId,
          externalUrl: dispatchResult.externalUrl,
          paid: dispatchResult.paid,
        },
      });

      // Move the work loop to audit (we just delivered + recorded)
      await deps.workLoop.transition({
        companyId: input.companyId,
        issueId: input.issueId,
        from: "deliver",
        to: "audit",
        role: input.toolName,
        reason: "delivered-recorded",
        openclawSessionId: input.openclawSessionId,
        agentId: input.agentId,
      });

      return {
        kind: "delivered",
        voiceGateScore,
        externalId: dispatchResult.externalId,
        externalUrl: dispatchResult.externalUrl,
      };
    },
  };
}
