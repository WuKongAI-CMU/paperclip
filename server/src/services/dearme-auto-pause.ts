import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db, DearMePause, DearMePausedBy, NewDearMePause } from "@paperclipai/db";
import { dearmePauses } from "@paperclipai/db";

export interface DearMeAutoPauseService {
  isPaused(companyId: string): Promise<boolean>;
  pause(input: { companyId: string; by: DearMePausedBy; reason: string }): Promise<DearMePause>;
  resume(input: { companyId: string }): Promise<void>;
  getActivePause(companyId: string): Promise<DearMePause | null>;
}

export interface DearMeAutoPauseOptions {
  now?: () => Date;
}

export function dearMeAutoPauseService(
  db: Db,
  options: DearMeAutoPauseOptions = {},
): DearMeAutoPauseService {
  const now = options.now ?? (() => new Date());

  async function getActivePause(companyId: string): Promise<DearMePause | null> {
    const rows = await db
      .select()
      .from(dearmePauses)
      .where(and(eq(dearmePauses.companyId, companyId), isNull(dearmePauses.resumedAt)))
      .orderBy(desc(dearmePauses.pausedAt))
      .limit(1);
    return rows[0] ?? null;
  }

  return {
    async isPaused(companyId) {
      return Boolean(await getActivePause(companyId));
    },

    async getActivePause(companyId) {
      return getActivePause(companyId);
    },

    async pause(input) {
      const existing = await getActivePause(input.companyId);
      if (existing) return existing;

      const values: NewDearMePause = {
        companyId: input.companyId,
        pausedAt: now(),
        pausedBy: input.by,
        reason: input.reason,
        resumedAt: null,
      };

      try {
        const [row] = await db.insert(dearmePauses).values(values).returning();
        if (!row) throw new Error("dearme-auto-pause: insert did not return row");
        return row;
      } catch (error) {
        const raced = await getActivePause(input.companyId);
        if (raced) return raced;
        throw error;
      }
    },

    async resume(input) {
      await db
        .update(dearmePauses)
        .set({ resumedAt: now() })
        .where(and(eq(dearmePauses.companyId, input.companyId), isNull(dearmePauses.resumedAt)));
    },
  };
}
