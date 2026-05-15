import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Db, DearMeTier, DearMeTierLimit, NewDearMeTierLimit } from "@paperclipai/db";
import { dearmeTierLimits } from "@paperclipai/db";

export type { DearMeTier } from "@paperclipai/db";

const MICROS_PER_USD = 1_000_000;

export interface DearMeTierLimits {
  dailyContentPostsCap: number;
  weeklyOutreachCap: number;
  monthlyAdSpendUsdCap: number;
  voiceSampleCap: number | null;
}

export interface DearMeActiveTier {
  tier: DearMeTier;
  limits: DearMeTierLimits;
}

export interface DearMeSetTierOptions {
  effectiveFrom?: Date;
  limits?: Partial<DearMeTierLimits>;
}

export interface DearMeTierRepository {
  getActiveRow(companyId: string, now: Date): Promise<DearMeTierLimit | null>;
  expireCurrentRows(companyId: string, effectiveTo: Date): Promise<void>;
  insertRow(row: NewDearMeTierLimit): Promise<DearMeTierLimit>;
}

export interface DearMeTiersServiceOptions {
  now?: () => Date;
  repository?: DearMeTierRepository;
}

export interface DearMeTiersService {
  getActiveTier(companyId: string): Promise<DearMeActiveTier>;
  setTier(companyId: string, tier: DearMeTier, options?: DearMeSetTierOptions): Promise<DearMeActiveTier>;
}

export function defaultLimitsForTier(tier: DearMeTier): DearMeTierLimits {
  switch (tier) {
    case "free_trial":
      return {
        dailyContentPostsCap: 1,
        weeklyOutreachCap: 5,
        monthlyAdSpendUsdCap: 0,
        voiceSampleCap: 3,
      };
    case "beta":
      return {
        dailyContentPostsCap: 3,
        weeklyOutreachCap: 25,
        monthlyAdSpendUsdCap: 50 * MICROS_PER_USD,
        voiceSampleCap: 20,
      };
    case "pro":
      return {
        dailyContentPostsCap: 10,
        weeklyOutreachCap: 100,
        monthlyAdSpendUsdCap: 500 * MICROS_PER_USD,
        voiceSampleCap: null,
      };
  }
}

function limitsFromRow(row: DearMeTierLimit): DearMeTierLimits {
  return {
    dailyContentPostsCap: row.dailyContentPostsCap,
    weeklyOutreachCap: row.weeklyOutreachCap,
    monthlyAdSpendUsdCap: Number(row.monthlyAdSpendUsdCap),
    voiceSampleCap: row.voiceSampleCap,
  };
}

function mergeLimits(tier: DearMeTier, overrides?: Partial<DearMeTierLimits>): DearMeTierLimits {
  return {
    ...defaultLimitsForTier(tier),
    ...overrides,
  };
}

function createDrizzleDearMeTierRepository(db: Db): DearMeTierRepository {
  return {
    async getActiveRow(companyId, now) {
      const [row] = await db
        .select()
        .from(dearmeTierLimits)
        .where(
          and(
            eq(dearmeTierLimits.companyId, companyId),
            lte(dearmeTierLimits.effectiveFrom, now),
            or(isNull(dearmeTierLimits.effectiveTo), gt(dearmeTierLimits.effectiveTo, now)),
          ),
        )
        .orderBy(desc(dearmeTierLimits.effectiveFrom))
        .limit(1);
      return row ?? null;
    },

    async expireCurrentRows(companyId, effectiveTo) {
      await db
        .update(dearmeTierLimits)
        .set({ effectiveTo })
        .where(and(eq(dearmeTierLimits.companyId, companyId), isNull(dearmeTierLimits.effectiveTo)));
    },

    async insertRow(row) {
      const [inserted] = await db.insert(dearmeTierLimits).values(row).returning();
      if (!inserted) throw new Error("dearme-tiers: insert did not return row");
      return inserted;
    },
  };
}

export function dearMeTiersService(
  db: Db,
  options: DearMeTiersServiceOptions = {},
): DearMeTiersService {
  const repository = options.repository ?? createDrizzleDearMeTierRepository(db);

  return {
    async getActiveTier(companyId) {
      const now = options.now?.() ?? new Date();
      const row = await repository.getActiveRow(companyId, now);
      if (!row) {
        return {
          tier: "free_trial",
          limits: defaultLimitsForTier("free_trial"),
        };
      }
      return {
        tier: row.tier,
        limits: limitsFromRow(row),
      };
    },

    async setTier(companyId, tier, setOptions = {}) {
      const effectiveFrom = setOptions.effectiveFrom ?? options.now?.() ?? new Date();
      const limits = mergeLimits(tier, setOptions.limits);
      await repository.expireCurrentRows(companyId, effectiveFrom);
      const row = await repository.insertRow({
        companyId,
        tier,
        dailyContentPostsCap: limits.dailyContentPostsCap,
        weeklyOutreachCap: limits.weeklyOutreachCap,
        monthlyAdSpendUsdCap: limits.monthlyAdSpendUsdCap,
        voiceSampleCap: limits.voiceSampleCap,
        effectiveFrom,
        effectiveTo: null,
      });
      return {
        tier: row.tier,
        limits: limitsFromRow(row),
      };
    },
  };
}
