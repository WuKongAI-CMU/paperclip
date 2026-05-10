/**
 * Cloud-side approval-resolver service.
 *
 * Wraps the pure resolver in
 * `@paperclipai/dearme-agent-prompts/state-machines/approval-gates.ts`
 * with Naive `issue_approvals` lookup (past approved count) + Naive
 * `cost_events` lookup (today's spend) + SSE emit of `approval_pending`
 * or `approval_resolved`.
 *
 * Doctrine:
 *   - The pure `resolveApproval` is the only place that decides
 *     pending / approved / rejected. This service collects context.
 *   - Pending decisions write a row to `issue_approvals` so the workbench
 *     can render the queue.
 *   - Approved or auto-approved decisions also write the row (so audit is
 *     consistent) and emit `approval_resolved` immediately.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { approvals, costEvents, issueApprovals } from "@paperclipai/db";
import {
  resolveApproval,
  type ApprovalGate,
  type ApprovalRequest,
  type ApprovalResolution,
} from "@paperclipai/dearme-agent-prompts";
import type { DearMeSseBus } from "./dearme-sse-bus.js";

export interface DearMeApprovalResolverService {
  resolve(input: ResolveInput): Promise<ResolveResult>;
}

export interface ResolveInput {
  companyId: string;
  requestedByUserId: string | null;
  requestedByAgentId: string | null;
  issueId: string;
  toolName: string;
  channel: string;
  gate: ApprovalGate;
  estimatedUsd: number;
  voiceGateScore: number | null;
  reason: string;
  /** Per-tenant config: voice floor + daily $ cap. */
  config: {
    minVoiceGateScore: number;
    dailyUsdCap: number;
  };
}

export type ResolveResult = ApprovalResolution & {
  /** Naive issue_approvals.approvalId so the caller can poll/cancel. */
  approvalId: string;
};

export function dearMeApprovalResolverService(
  db: Db,
  sseBus: DearMeSseBus,
): DearMeApprovalResolverService {
  return {
    async resolve(input) {
      const [pastApprovedCount, dailyUsdSpent] = await Promise.all([
        getPastApprovedCount(db, input),
        getDailyUsdSpent(db, input.companyId),
      ]);

      const req: ApprovalRequest = {
        gate: input.gate,
        issueId: input.issueId,
        toolName: input.toolName,
        channel: input.channel,
        estimatedUsd: input.estimatedUsd,
        voiceGateScore: input.voiceGateScore,
        reason: input.reason,
        createdAt: new Date().toISOString(),
      };

      const decision = resolveApproval(req, {
        pastApprovedCount,
        dailyUsdSpent,
        dailyUsdCap: input.config.dailyUsdCap,
        minVoiceGateScore: input.config.minVoiceGateScore,
      });

      const [approvalRow] = await db
        .insert(approvals)
        .values({
          companyId: input.companyId,
          status: decision.decision,
          type: `dearme.gate.${input.gate}`,
          requestedByUserId: input.requestedByUserId,
          requestedByAgentId: input.requestedByAgentId,
          payload: {
            gate: input.gate,
            toolName: input.toolName,
            channel: input.channel,
            estimatedUsd: input.estimatedUsd,
            voiceGateScore: input.voiceGateScore,
            reason: input.reason,
            issueId: input.issueId,
          } as Record<string, unknown>,
        })
        .returning();
      if (!approvalRow) throw new Error("dearme-approval-resolver: approval insert returned no row");

      await db.insert(issueApprovals).values({
        companyId: input.companyId,
        issueId: input.issueId,
        approvalId: approvalRow.id,
        linkedByUserId: input.requestedByUserId,
        linkedByAgentId: input.requestedByAgentId,
      });

      const sseType =
        decision.decision === "pending" ? "approval_pending" : "approval_resolved";
      sseBus.emit({
        type: sseType,
        emittedAt: new Date().toISOString(),
        scope: {
          companyId: input.companyId,
          issueId: input.issueId,
        },
        payload: {
          gate: input.gate,
          decision: decision.decision,
          toolName: input.toolName,
          channel: input.channel,
          reason: decision.reason,
          voiceGateScore: input.voiceGateScore,
        },
      });

      return { ...decision, approvalId: approvalRow.id };
    },
  };
}

/**
 * Past approved count for the (channel, gate) pair — drives auto-approve.
 *
 * Implementation note: we count the number of `approvals` rows where the
 * payload's channel matches and status is "approved". This is a Postgres
 * JSONB query; cheap, indexed by `(companyId, status)` already.
 */
async function getPastApprovedCount(
  db: Db,
  input: ResolveInput,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(approvals)
    .where(
      and(
        eq(approvals.companyId, input.companyId),
        eq(approvals.status, "approved"),
        eq(approvals.type, `dearme.gate.${input.gate}`),
        sql`${approvals.payload}->>'channel' = ${input.channel}`,
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * Today's spend in USD across all cost_events for the tenant. The schema
 * stores integer cents; we convert to USD here.
 */
async function getDailyUsdSpent(
  db: Db,
  companyId: string,
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
    })
    .from(costEvents)
    .where(
      and(
        eq(costEvents.companyId, companyId),
        gte(costEvents.occurredAt, startOfDay),
      ),
    );
  const cents = rows[0]?.totalCents ?? 0;
  return cents / 100;
}
