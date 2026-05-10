/**
 * Realtime SSE event contract for the DearMe live workbench.
 *
 * The DearMe live surface mirrors a small set of well-known event types that
 * any role agent can emit. Agents must not invent new top-level event names
 * — extend the metadata payload or add a new `dashboard_action.action`
 * subtype instead.
 *
 * Lineage: this contract is the union of three substrate event streams,
 * unified at the cloud edge so the workbench AND any OpenClaw client can
 * subscribe to the same shape:
 *   - Polsia /live social-proof feed (publish/send/cycle events)
 *   - Naive activity_log + heartbeat_run_events (durable execution events)
 *   - OpenClaw stream lifecycle (assistant deltas, tool events, lifecycle
 *     start/end/error)
 *
 * Cross-substrate correlation: every event carries `scope.{companyId,
 * issueId, executionId, agentId}` and an optional `scope.workLoopState` (see
 * `./work-loop.ts`) so a single in-flight work item can be reconstructed
 * from the stream.
 */

export const SSE_EVENT_TYPES = [
  /** Initial state on connection — full snapshot of the live workbench. */
  "sync",
  /** Agent emitted a thinking step (already complete, single block). */
  "thinking_stream",
  /** Agent is streaming an extended-thinking block token-by-token. */
  "thinking_stream_delta",
  /** Workbench-level UI action (mood update, name change, link added). */
  "dashboard_action",
  /** A new task was queued. */
  "task_created",
  /** Existing task transitioned. */
  "task_updated",
  /** An agent execution finished. */
  "agent_completed",
  /** Work-loop state transition (intake → triage → … → archive). */
  "work_loop_transition",
  /** Approval gate fired (publish/send/deploy/spend). Awaiting user. */
  "approval_pending",
  /** Approval gate resolved — decision + reason. */
  "approval_resolved",
  /** Voice-gate score persisted on a draft. */
  "voice_gate_scored",
  /** Outbound tool fired on a verified channel. */
  "channel_action_fired",
  /** Cost ledger event recorded (cost_events row). */
  "cost_recorded",
  /** OpenClaw stream lifecycle event (start | end | error). */
  "openclaw_lifecycle",
  /** OpenClaw assistant or tool stream delta (passthrough). */
  "openclaw_stream",
] as const;

export type SseEventType = (typeof SSE_EVENT_TYPES)[number];

export const DASHBOARD_ACTIONS = [
  "mood_update",
  "name_changed",
  "link_added",
  "report_created",
  "trademark_post_build_review",
] as const;

export type DashboardActionType = (typeof DASHBOARD_ACTIONS)[number];

export interface SseEventBase {
  type: SseEventType;
  /** ISO timestamp the event was emitted. */
  emittedAt: string;
  /** Issue / execution / company id this event scopes to. */
  scope: {
    companyId: string;
    issueId?: string;
    executionId?: string;
    agentId?: string;
    /** Optional substrate correlation: which OpenClaw session emitted this. */
    openclawSessionId?: string;
    /**
     * Optional work-loop state (see `./work-loop.ts`). Set by the cloud
     * adapter so workbench widgets can pivot the same event stream by
     * lifecycle phase.
     */
    workLoopState?:
      | "intake"
      | "triage"
      | "work"
      | "gate"
      | "deliver"
      | "audit"
      | "review"
      | "archive";
  };
}

export interface MoodUpdatePayload {
  mood: string;
  faceSlug: string;
  faceName: string;
  accentColor: string;
  message: string;
  agentName: string;
}

/** Payload for a work-loop transition event. */
export interface WorkLoopTransitionPayload {
  from: NonNullable<SseEventBase["scope"]["workLoopState"]>;
  to: NonNullable<SseEventBase["scope"]["workLoopState"]>;
  /** Which role drove the transition. */
  role: string;
  /** Free-text reason (auto-approved, voice-gate-rejected, user-approved, etc). */
  reason: string;
}

/** Payload for an approval_pending or approval_resolved event. */
export interface ApprovalEventPayload {
  /** publish | send | deploy | spend (see ./approval-gates.ts). */
  gate: "publish" | "send" | "deploy" | "spend";
  decision: "pending" | "approved" | "rejected" | "expired";
  /** Outbound tool that will (or won't) fire. */
  toolName: string;
  /** Channel target ("x" / "linkedin" / "resend" / etc). */
  channel: string;
  /** Human-readable reason or auto-approval marker. */
  reason: string;
  /** Voice-gate score on the staged content if relevant (0-100, else null). */
  voiceGateScore: number | null;
}

/** Payload for a voice_gate_scored event. */
export interface VoiceGateScoredPayload {
  score: number;
  /** Cloud voice-fingerprint id used to score the draft. */
  fingerprintId: string;
  /** What kind of artifact was scored (e.g. "x-post", "linkedin-post"). */
  artifactKind: string;
  /** Whether the score passed the configured floor. */
  passed: boolean;
  /** The configured floor at scoring time. */
  floor: number;
}

/** Payload for a channel_action_fired event. */
export interface ChannelActionFiredPayload {
  toolName: string;
  channel: string;
  /** External id (X post id, LinkedIn URN, Resend message id, etc). */
  externalId: string;
  /** Public URL if applicable. */
  externalUrl?: string;
  /** Whether the action incurred billable cost. */
  paid: boolean;
}

/** Payload for a cost_recorded event. */
export interface CostRecordedPayload {
  /** Naive cost_events row id. */
  costEventId: string;
  /** Source: "ai-proxy" | "ad-spend" | "channel-fee" | "infra". */
  source: string;
  /** Decimal USD amount. */
  amountUsd: number;
  /** Daily-USD cap usage after this event (0-1). */
  dailyCapPctAfter: number;
}

/** Payload for an openclaw_lifecycle event (passthrough from OpenClaw). */
export interface OpenClawLifecyclePayload {
  /** OpenClaw runId. */
  runId: string;
  phase: "start" | "end" | "error";
  /** Error string if phase=error. */
  error?: string;
  /** OpenClaw status: ok | error | timeout. */
  status?: "ok" | "error" | "timeout";
  /** Duration ms if phase=end. */
  durationMs?: number;
}

/** Payload for an openclaw_stream event (passthrough). */
export interface OpenClawStreamPayload {
  /** OpenClaw runId. */
  runId: string;
  /** "assistant" delta or "tool" event. */
  stream: "assistant" | "tool";
  /** Raw JSON-serializable delta from OpenClaw. Schema is OpenClaw's, not ours. */
  delta: unknown;
}
