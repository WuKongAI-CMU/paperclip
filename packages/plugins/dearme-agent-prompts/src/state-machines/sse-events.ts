/**
 * Realtime SSE event contract for the DearMe live workbench.
 *
 * The DearMe live surface mirrors a small set of well-known event types that
 * any role agent can emit. Agents must not invent new top-level event names
 * — extend the metadata payload or add a new `dashboard_action.action`
 * subtype instead.
 *
 * Lineage: event-name shape adapted from DearMe internal live-stream
 * research; payloads narrowed to the personal-brand product surface.
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
