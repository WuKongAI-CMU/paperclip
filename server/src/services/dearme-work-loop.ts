/**
 * Cloud-side work-loop transition service.
 *
 * Wraps the pure state machine in
 * `@paperclipai/dearme-agent-prompts/state-machines/work-loop.ts` with
 * Naive `issues` writes, `activity_log` writes, and a unified SSE emit
 * (`work_loop_transition` event).
 *
 * Doctrine:
 *   - The pure transition validator (`canTransitionWorkLoop`) is the only
 *     place that decides if a state move is legal. This service is a wire,
 *     not a re-implementation.
 *   - Every transition is also written to `activity_log` so the workbench's
 *     existing activity feed shows it without a separate query.
 *   - Every transition emits the `work_loop_transition` SSE event so live
 *     subscribers see the move immediately.
 */

import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, issues } from "@paperclipai/db";
import {
  WORK_LOOP_STATES,
  canTransitionWorkLoop,
  type WorkLoopState,
} from "@paperclipai/dearme-agent-prompts";
import { logger } from "../middleware/logger.js";
import {
  dearMeAutoPauseService,
  type DearMeAutoPauseService,
} from "./dearme-auto-pause.js";
import type { DearMeSseBus } from "./dearme-sse-bus.js";

export interface DearMeWorkLoopService {
  transition(input: TransitionInput): Promise<TransitionResult>;
  /** Top-of-tick guard: paused companies should not run autonomous work. */
  shouldSkipTick?(companyId: string): Promise<boolean>;
  /** Read-only: list every legal next state for `from`. Used by chief-of-staff. */
  legalNext(from: WorkLoopState): ReadonlyArray<WorkLoopState>;
}

export interface TransitionInput {
  companyId: string;
  issueId: string;
  from: WorkLoopState;
  to: WorkLoopState;
  /** Role slug from `DEARME_ROLE_REGISTRY` driving the transition. */
  role: string;
  /** Free-text reason ("auto-approved", "user-rejected", "voice-gate-below-floor", etc). */
  reason: string;
  /** Optional OpenClaw correlation for cross-substrate tracing. */
  openclawSessionId?: string;
  agentId?: string;
}

export type TransitionResult =
  | { ok: true }
  | { ok: false; error: "illegal-transition" | "issue-not-found" };

export function dearMeWorkLoopService(
  db: Db,
  sseBus: DearMeSseBus,
  options: { autoPause?: DearMeAutoPauseService } = {},
): DearMeWorkLoopService {
  const autoPause = options.autoPause ?? dearMeAutoPauseService(db);

  return {
    async shouldSkipTick(companyId) {
      return autoPause.isPaused(companyId);
    },

    async transition(input) {
      if (!canTransitionWorkLoop(input.from, input.to)) {
        logger.warn(
          { from: input.from, to: input.to, issueId: input.issueId },
          "dearme-work-loop: illegal transition rejected",
        );
        return { ok: false, error: "illegal-transition" };
      }

      const issueRow = await db
        .select({ id: issues.id })
        .from(issues)
        .where(eq(issues.id, input.issueId))
        .limit(1);
      if (!issueRow[0]) return { ok: false, error: "issue-not-found" };

      // Naive convention: keep `issues.status` in step with the work-loop
      // state. We don't change the existing status taxonomy; we mirror it.
      const naiveStatus = NAIVE_STATUS_FOR_WORK_LOOP[input.to];
      if (naiveStatus) {
        await db
          .update(issues)
          .set({ status: naiveStatus, updatedAt: new Date() })
          .where(eq(issues.id, input.issueId));
      }

      await db.insert(activityLog).values({
        companyId: input.companyId,
        agentId: input.agentId ?? null,
        actorType: input.agentId ? "agent" : "system",
        actorId: input.agentId ?? "dearme.work_loop",
        action: "dearme.work_loop.transition",
        entityType: "issue",
        entityId: input.issueId,
        details: {
          from: input.from,
          to: input.to,
          role: input.role,
          reason: input.reason,
          openclawSessionId: input.openclawSessionId ?? null,
        },
      });

      sseBus.emit({
        type: "work_loop_transition",
        emittedAt: new Date().toISOString(),
        scope: {
          companyId: input.companyId,
          issueId: input.issueId,
          agentId: input.agentId,
          openclawSessionId: input.openclawSessionId,
          workLoopState: input.to,
        },
        payload: {
          from: input.from,
          to: input.to,
          role: input.role,
          reason: input.reason,
        },
      });

      return { ok: true };
    },

    legalNext(from) {
      return WORK_LOOP_STATES.filter((s) => canTransitionWorkLoop(from, s));
    },
  };
}

/**
 * Mapping from the 8 work-loop states to the existing Naive `issues.status`
 * taxonomy. Naive uses free-text status; the values picked here match
 * Paperclip's existing conventions so workbench filters keep working.
 */
const NAIVE_STATUS_FOR_WORK_LOOP: Readonly<
  Record<WorkLoopState, string | null>
> = {
  intake: "queued",
  triage: "in-progress",
  work: "in-progress",
  gate: "in-review",
  deliver: "in-progress",
  audit: "in-progress",
  review: "in-review",
  archive: "closed",
};
