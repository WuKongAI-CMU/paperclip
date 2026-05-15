import type { Db, DearMeTier, DearMeTierLimit, NewDearMeTierLimit } from "@paperclipai/db";
import { describe, expect, it } from "vitest";
import {
  dearMeTiersService,
  defaultLimitsForTier,
  type DearMeTierRepository,
} from "./dearme-tiers.js";

const USD_MICROS = 1_000_000;

function row(input: {
  companyId: string;
  tier: DearMeTier;
  dailyContentPostsCap?: number;
  weeklyOutreachCap?: number;
  monthlyAdSpendUsdCap?: number;
  voiceSampleCap?: number | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}): DearMeTierLimit {
  const limits = defaultLimitsForTier(input.tier);
  return {
    companyId: input.companyId,
    tier: input.tier,
    dailyContentPostsCap: input.dailyContentPostsCap ?? limits.dailyContentPostsCap,
    weeklyOutreachCap: input.weeklyOutreachCap ?? limits.weeklyOutreachCap,
    monthlyAdSpendUsdCap: input.monthlyAdSpendUsdCap ?? limits.monthlyAdSpendUsdCap,
    voiceSampleCap: input.voiceSampleCap ?? limits.voiceSampleCap,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
  };
}

function makeRepository(initialRows: DearMeTierLimit[] = []) {
  const rows = [...initialRows];
  const repository: DearMeTierRepository = {
    async getActiveRow(companyId, now) {
      return rows
        .filter((existing) =>
          existing.companyId === companyId &&
          existing.effectiveFrom <= now &&
          (existing.effectiveTo === null || existing.effectiveTo > now))
        .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null;
    },

    async expireCurrentRows(companyId, effectiveTo) {
      for (const existing of rows) {
        if (existing.companyId === companyId && existing.effectiveTo === null) {
          existing.effectiveTo = effectiveTo;
        }
      }
    },

    async insertRow(insert: NewDearMeTierLimit) {
      const inserted = {
        companyId: insert.companyId,
        tier: insert.tier,
        dailyContentPostsCap: insert.dailyContentPostsCap,
        weeklyOutreachCap: insert.weeklyOutreachCap,
        monthlyAdSpendUsdCap: insert.monthlyAdSpendUsdCap,
        voiceSampleCap: insert.voiceSampleCap ?? null,
        effectiveFrom: insert.effectiveFrom ?? new Date(),
        effectiveTo: insert.effectiveTo ?? null,
      };
      rows.push(inserted);
      return inserted;
    },
  };
  return { repository, rows };
}

describe("defaultLimitsForTier", () => {
  it("returns free trial, beta, and pro constants", () => {
    expect(defaultLimitsForTier("free_trial")).toEqual({
      dailyContentPostsCap: 1,
      weeklyOutreachCap: 5,
      monthlyAdSpendUsdCap: 0,
      voiceSampleCap: 3,
    });
    expect(defaultLimitsForTier("beta")).toEqual({
      dailyContentPostsCap: 3,
      weeklyOutreachCap: 25,
      monthlyAdSpendUsdCap: 50 * USD_MICROS,
      voiceSampleCap: 20,
    });
    expect(defaultLimitsForTier("pro")).toEqual({
      dailyContentPostsCap: 10,
      weeklyOutreachCap: 100,
      monthlyAdSpendUsdCap: 500 * USD_MICROS,
      voiceSampleCap: null,
    });
  });

  it("represents pro voice samples as unlimited", () => {
    expect(defaultLimitsForTier("pro").voiceSampleCap).toBeNull();
  });
});

describe("dearMeTiersService", () => {
  it("getActiveTier returns the latest row and ignores expired rows", async () => {
    const now = new Date("2026-05-14T12:00:00.000Z");
    const { repository } = makeRepository([
      row({
        companyId: "co_1",
        tier: "pro",
        effectiveFrom: new Date("2026-05-01T00:00:00.000Z"),
        effectiveTo: new Date("2026-05-10T00:00:00.000Z"),
      }),
      row({
        companyId: "co_1",
        tier: "beta",
        effectiveFrom: new Date("2026-05-10T00:00:00.000Z"),
      }),
      row({
        companyId: "co_1",
        tier: "free_trial",
        effectiveFrom: new Date("2026-04-01T00:00:00.000Z"),
      }),
    ]);
    const service = dearMeTiersService({} as Db, { repository, now: () => now });

    await expect(service.getActiveTier("co_1")).resolves.toEqual({
      tier: "beta",
      limits: defaultLimitsForTier("beta"),
    });
  });

  it("getActiveTier returns free_trial defaults when no row exists", async () => {
    const { repository } = makeRepository();
    const service = dearMeTiersService({} as Db, { repository });

    await expect(service.getActiveTier("co_1")).resolves.toEqual({
      tier: "free_trial",
      limits: defaultLimitsForTier("free_trial"),
    });
  });

  it("setTier expires the previous current row and inserts the new row", async () => {
    const effectiveFrom = new Date("2026-05-14T12:00:00.000Z");
    const previous = row({
      companyId: "co_1",
      tier: "free_trial",
      effectiveFrom: new Date("2026-05-01T00:00:00.000Z"),
    });
    const { repository, rows } = makeRepository([previous]);
    const service = dearMeTiersService({} as Db, { repository, now: () => effectiveFrom });

    await expect(service.setTier("co_1", "pro")).resolves.toEqual({
      tier: "pro",
      limits: defaultLimitsForTier("pro"),
    });

    expect(previous.effectiveTo).toEqual(effectiveFrom);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      companyId: "co_1",
      tier: "pro",
      effectiveFrom,
      effectiveTo: null,
      voiceSampleCap: null,
    });
  });
});
