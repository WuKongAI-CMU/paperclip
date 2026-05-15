import type { Db, DearMeLinkedinThrottle, NewDearMeLinkedinThrottle } from "@paperclipai/db";
import { describe, expect, it } from "vitest";
import {
  computeCaps,
  dearMeLinkedInThrottleService,
  type DearMeLinkedInThrottleRepository,
} from "./dearme-linkedin-throttle.js";

function row(input: Partial<DearMeLinkedinThrottle> & { companyId: string }): DearMeLinkedinThrottle {
  return {
    companyId: input.companyId,
    accountConnectedAt: input.accountConnectedAt ?? new Date("2026-04-14T12:00:00.000Z"),
    dmsSentToday: input.dmsSentToday ?? 0,
    dmsSentThisWeek: input.dmsSentThisWeek ?? 0,
    lastResetDay: input.lastResetDay ?? "2026-05-14",
    lastResetWeek: input.lastResetWeek ?? "2026-05-11",
    lifetimeDmsSent: input.lifetimeDmsSent ?? 0,
  };
}

function makeRepository(initial: DearMeLinkedinThrottle[] = []) {
  const rows = [...initial];
  const repository: DearMeLinkedInThrottleRepository = {
    async get(companyId) {
      return rows.find((existing) => existing.companyId === companyId) ?? null;
    },
    async upsert(input: NewDearMeLinkedinThrottle) {
      const existingIndex = rows.findIndex((existing) => existing.companyId === input.companyId);
      const saved = row({
        companyId: input.companyId,
        accountConnectedAt: input.accountConnectedAt ?? undefined,
        dmsSentToday: input.dmsSentToday ?? undefined,
        dmsSentThisWeek: input.dmsSentThisWeek ?? undefined,
        lastResetDay: input.lastResetDay ?? undefined,
        lastResetWeek: input.lastResetWeek ?? undefined,
        lifetimeDmsSent: input.lifetimeDmsSent ?? undefined,
      });
      if (existingIndex >= 0) {
        rows[existingIndex] = rows[existingIndex]!;
        return rows[existingIndex]!;
      }
      rows.push(saved);
      return saved;
    },
    async update(companyId, values) {
      const existingIndex = rows.findIndex((existing) => existing.companyId === companyId);
      if (existingIndex < 0) throw new Error(`missing row: ${companyId}`);
      rows[existingIndex] = {
        ...rows[existingIndex]!,
        ...values,
      };
      return rows[existingIndex]!;
    },
  };
  return { repository, rows };
}

describe("computeCaps", () => {
  it("returns warming caps for new accounts", () => {
    expect(computeCaps(0)).toEqual({ dailyCap: 5, weeklyCap: 20 });
  });

  it("returns mid-ramp caps for week-old accounts", () => {
    expect(computeCaps(7)).toEqual({ dailyCap: 10, weeklyCap: 50 });
  });

  it("returns steady caps for established accounts", () => {
    expect(computeCaps(30)).toEqual({ dailyCap: 40, weeklyCap: 200 });
  });
});

describe("dearMeLinkedInThrottleService", () => {
  it("returns daily_cap when at cap and ok when under cap", async () => {
    const { repository } = makeRepository([
      row({
        companyId: "co_daily",
        accountConnectedAt: new Date("2026-04-14T12:00:00.000Z"),
        dmsSentToday: 40,
        dmsSentThisWeek: 80,
      }),
      row({
        companyId: "co_ok",
        accountConnectedAt: new Date("2026-04-14T12:00:00.000Z"),
        dmsSentToday: 39,
        dmsSentThisWeek: 80,
      }),
    ]);
    const service = dearMeLinkedInThrottleService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });

    await expect(service.getThrottleState("co_daily")).resolves.toMatchObject({
      status: "daily_cap",
      dailyCap: 40,
      weeklyCap: 200,
    });
    await expect(service.getThrottleState("co_ok")).resolves.toMatchObject({
      status: "ok",
      dmsSentToday: 39,
    });
  });

  it("recordDispatch increments counters and resets on day boundary", async () => {
    const { repository, rows } = makeRepository([
      row({
        companyId: "co_1",
        accountConnectedAt: new Date("2026-04-14T12:00:00.000Z"),
        dmsSentToday: 4,
        dmsSentThisWeek: 10,
        lastResetDay: "2026-05-13",
        lastResetWeek: "2026-05-11",
        lifetimeDmsSent: 18,
      }),
    ]);
    const service = dearMeLinkedInThrottleService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });

    const state = await service.recordDispatch("co_1");

    expect(state).toMatchObject({
      dmsSentToday: 1,
      dmsSentThisWeek: 11,
      status: "ok",
    });
    expect(rows[0]).toMatchObject({
      dmsSentToday: 1,
      dmsSentThisWeek: 11,
      lastResetDay: "2026-05-14",
      lastResetWeek: "2026-05-11",
      lifetimeDmsSent: 19,
    });
  });
});
