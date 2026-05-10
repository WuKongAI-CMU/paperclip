import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, issues, routines } from "@paperclipai/db";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import {
  DEARME_MEMORY_ACTIONS,
  injectLatestMemoryBlock,
  renderLatestMemoryBlock,
  selectActiveDearMeMemoryRows,
  stripLatestMemoryBlock,
} from "./dearme-memory-brief.js";
import { routineService } from "./routines.js";

type RoutineActor = { agentId?: string | null; userId?: string | null; runId?: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConflict(error: unknown) {
  return isRecord(error) && error.status === 409;
}

export function dearmeMemoryContextService(db: Db) {
  const routinesSvc = routineService(db);

  async function loadLatestMemoryRows(companyId: string) {
    return db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityId: activityLog.entityId,
        details: activityLog.details,
      })
      .from(activityLog)
      .where(and(eq(activityLog.companyId, companyId), inArray(activityLog.action, [...DEARME_MEMORY_ACTIONS])))
      .orderBy(desc(activityLog.createdAt))
      .limit(80);
  }

  async function loadDearMeRoutines(companyId: string) {
    return db
      .select({
        id: routines.id,
        description: routines.description,
        latestRevisionId: routines.latestRevisionId,
      })
      .from(routines)
      .innerJoin(issues, eq(routines.parentIssueId, issues.id))
      .where(and(
        eq(routines.companyId, companyId),
        eq(issues.companyId, companyId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
      ));
  }

  return {
    async refreshRoutineMemoryContext(companyId: string, actor: RoutineActor = {}) {
      const memoryRows = selectActiveDearMeMemoryRows(await loadLatestMemoryRows(companyId));
      const memoryBlock = renderLatestMemoryBlock(memoryRows);
      const routineRows = await loadDearMeRoutines(companyId);
      let updated = 0;
      let skipped = 0;

      for (const routine of routineRows) {
        const currentDescription = routine.description ?? "";
        const description = memoryBlock
          ? injectLatestMemoryBlock(routine.description, memoryBlock)
          : stripLatestMemoryBlock(currentDescription).trimEnd();
        if (description === currentDescription) {
          skipped += 1;
          continue;
        }

        try {
          const result = await routinesSvc.update(
            routine.id,
            {
              description,
              ...(routine.latestRevisionId ? { baseRevisionId: routine.latestRevisionId } : {}),
            },
            actor,
          );
          if (result) updated += 1;
        } catch (error) {
          if (!isConflict(error)) throw error;
          skipped += 1;
        }
      }

      return {
        memoryCount: memoryRows.length,
        routineCount: routineRows.length,
        updated,
        skipped,
      };
    },
  };
}
