/**
 * Unified tri-substrate SSE event bus.
 *
 * Process-local typed emitter that backs the cloud's `/v1/sse` route.
 * Every substrate-crossing event flows through this bus so the workbench,
 * an OpenClaw client, and any cloud subscriber see the same shape
 * (TRI-SUBSTRATE-ARCHITECTURE.md §5).
 *
 * Lineage: emitter shape is DearMe-original; the event union is fixed by
 * `@paperclipai/dearme-agent-prompts/state-machines/sse-events.ts` and
 * lives in code, not docs.
 *
 * Doctrine:
 *   - The bus is process-local. Multi-process fanout (Redis pub/sub etc)
 *     is plugged in by replacing the listener registration; the public
 *     emit/subscribe API doesn't change.
 *   - Listeners must not throw. Anything that throws inside a listener
 *     gets swallowed and logged so a buggy subscriber can't take down
 *     the route's request loop.
 *   - Every event carries `scope.companyId`. The bus enforces that on
 *     emit so a missing tenant scope can't accidentally bleed across
 *     companies.
 */

import { EventEmitter } from "node:events";
import type {
  ApprovalEventPayload,
  ChannelActionFiredPayload,
  CostRecordedPayload,
  OpenClawLifecyclePayload,
  OpenClawStreamPayload,
  SseEventBase,
  SseEventType,
  VoiceGateScoredPayload,
  WorkLoopTransitionPayload,
} from "@paperclipai/dearme-agent-prompts";
import { logger } from "../middleware/logger.js";

/**
 * Discriminated union of every event the bus can carry. New event types
 * are added by extending the registry in `sse-events.ts` first.
 */
export type DearMeSseEvent =
  | (SseEventBase & { type: "work_loop_transition"; payload: WorkLoopTransitionPayload })
  | (SseEventBase & { type: "approval_pending"; payload: ApprovalEventPayload })
  | (SseEventBase & { type: "approval_resolved"; payload: ApprovalEventPayload })
  | (SseEventBase & { type: "voice_gate_scored"; payload: VoiceGateScoredPayload })
  | (SseEventBase & { type: "channel_action_fired"; payload: ChannelActionFiredPayload })
  | (SseEventBase & { type: "cost_recorded"; payload: CostRecordedPayload })
  | (SseEventBase & { type: "openclaw_lifecycle"; payload: OpenClawLifecyclePayload })
  | (SseEventBase & { type: "openclaw_stream"; payload: OpenClawStreamPayload })
  // V1 event types kept untyped at the payload level; route already validates.
  | (SseEventBase & {
      type: Exclude<
        SseEventType,
        | "work_loop_transition"
        | "approval_pending"
        | "approval_resolved"
        | "voice_gate_scored"
        | "channel_action_fired"
        | "cost_recorded"
        | "openclaw_lifecycle"
        | "openclaw_stream"
      >;
      payload: unknown;
    });

export type DearMeSseListener = (event: DearMeSseEvent) => void;

export interface DearMeSseBus {
  /**
   * Emit an event. Validates `companyId` is set; logs and drops anything
   * that throws inside a listener.
   */
  emit(event: DearMeSseEvent): void;
  /**
   * Subscribe to all events scoped to a single company. Returns an
   * unsubscribe function.
   */
  subscribe(companyId: string, listener: DearMeSseListener): () => void;
  /** Test-only / shutdown: drop all listeners. */
  reset(): void;
  /** Diagnostic: how many listeners across all companies. */
  listenerCount(): number;
}

const ALL_EVENTS = "dearme.sse";

export function createDearMeSseBus(): DearMeSseBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0); // workbench, OpenClaw clients, audit replay etc

  const wrappedListeners = new WeakMap<DearMeSseListener, DearMeSseListener>();

  return {
    emit(event) {
      if (!event.scope?.companyId) {
        logger.warn(
          { type: event.type },
          "dearme-sse-bus: refusing to emit event with no companyId scope",
        );
        return;
      }
      try {
        emitter.emit(ALL_EVENTS, event);
      } catch (err) {
        logger.error({ err, type: event.type }, "dearme-sse-bus: emit failed");
      }
    },

    subscribe(companyId, listener) {
      const wrapped: DearMeSseListener = (event) => {
        if (event.scope.companyId !== companyId) return;
        try {
          listener(event);
        } catch (err) {
          logger.error(
            { err, companyId, type: event.type },
            "dearme-sse-bus: listener threw, swallowed",
          );
        }
      };
      wrappedListeners.set(listener, wrapped);
      emitter.on(ALL_EVENTS, wrapped);
      return () => {
        const stored = wrappedListeners.get(listener);
        if (stored) emitter.off(ALL_EVENTS, stored);
      };
    },

    reset() {
      emitter.removeAllListeners();
    },

    listenerCount() {
      return emitter.listenerCount(ALL_EVENTS);
    },
  };
}

/** Singleton — the cloud has one bus per process. */
let SINGLETON: DearMeSseBus | null = null;
export function getDearMeSseBus(): DearMeSseBus {
  if (!SINGLETON) SINGLETON = createDearMeSseBus();
  return SINGLETON;
}

/** Test-only: replace the singleton (called from setup). */
export function setDearMeSseBusForTest(bus: DearMeSseBus | null): void {
  SINGLETON = bus;
}
