import type { Db, DearMeCostCap, DearMeCostCapKind } from "@paperclipai/db";
import { describe, expect, it, vi } from "vitest";
import {
  dearMeCostCapsService,
  type CostCapWindow,
  type DearMeCostCapRepository,
} from "./dearme-cost-caps.js";
import {
  dearMeOutboundToolWrapper,
  type ChannelDispatch,
  type DearMeOutboundToolDeps,
} from "./dearme-outbound-tool-wrapper.js";

const USD_MICROS = 1_000_000;

function row(input: {
  companyId: string;
  kind: DearMeCostCapKind;
  window: CostCapWindow;
  spent: number;
  cap: number;
  soft: number;
  now: Date;
}): DearMeCostCap {
  return {
    companyId: input.companyId,
    periodKind: input.kind,
    windowStart: input.window.start,
    windowEnd: input.window.end,
    usdSpentMicros: input.spent,
    usdCapMicros: input.cap,
    softCapMicros: input.soft,
    lastUpdatedAt: input.now,
  };
}

function makeRepository(initial: DearMeCostCap[] = []) {
  const rows = [...initial];
  const key = (companyId: string, kind: DearMeCostCapKind, window: CostCapWindow) =>
    `${companyId}:${kind}:${window.start.toISOString()}:${window.end.toISOString()}`;
  const find = (companyId: string, kind: DearMeCostCapKind, window: CostCapWindow) =>
    rows.findIndex((existing) =>
      key(existing.companyId, existing.periodKind, {
        start: existing.windowStart,
        end: existing.windowEnd,
      }) === key(companyId, kind, window));

  const repository: DearMeCostCapRepository = {
    async upsertWindowRow({ companyId, kind, window, capMicros, softCapMicros, now }) {
      const index = find(companyId, kind, window);
      if (index >= 0) {
        rows[index] = {
          ...rows[index]!,
          usdCapMicros: capMicros,
          softCapMicros,
          lastUpdatedAt: now,
        };
        return rows[index]!;
      }
      const created = row({
        companyId,
        kind,
        window,
        spent: 0,
        cap: capMicros,
        soft: softCapMicros,
        now,
      });
      rows.push(created);
      return created;
    },
    async incrementWindowRow({ companyId, kind, window, usdMicros, capMicros, softCapMicros, now }) {
      const index = find(companyId, kind, window);
      if (index >= 0) {
        rows[index] = {
          ...rows[index]!,
          usdSpentMicros: rows[index]!.usdSpentMicros + usdMicros,
          usdCapMicros: capMicros,
          softCapMicros,
          lastUpdatedAt: now,
        };
        return rows[index]!;
      }
      const created = row({
        companyId,
        kind,
        window,
        spent: usdMicros,
        cap: capMicros,
        soft: softCapMicros,
        now,
      });
      rows.push(created);
      return created;
    },
  };

  return { repository, rows };
}

function makeWrapperDeps(overrides?: Partial<DearMeOutboundToolDeps>): DearMeOutboundToolDeps {
  const dbStub = {
    insert: () => ({
      values: () => Promise.resolve(),
    }),
  };
  return {
    db: dbStub as unknown as Db,
    voiceGate: {
      scoreVoice: async () => ({
        score: 95,
        passed: true,
        floor: 70,
        reasons: [],
        rewrite: null,
      }),
    },
    approvalResolver: {
      resolve: async () => ({
        decision: "approved",
        reason: "approved-test",
        approvalId: "ap_1",
      }),
    },
    channelConnections: {
      getActive: async () => ({
        id: "cc_1",
        companyId: "co_test",
        userId: "u_test",
        channel: "meta_ads",
        externalAccountId: "act_1",
        externalDisplayName: "ads",
        encryptedCredential: "enc:meta",
        scopes: [],
        expiresAt: null,
        status: "active",
        lastUsedAt: null,
        lastRefreshedAt: null,
        lastError: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as never,
      markUsed: async () => undefined,
      markNeedsReauth: async () => undefined,
      upsertActive: async () => {
        throw new Error("not used");
      },
    },
    workLoop: {
      transition: async () => ({ ok: true }) as const,
      legalNext: () => [],
    },
    autoPause: {
      isPaused: async () => false,
      pause: async () => ({
        companyId: "co_test",
        pausedAt: new Date("2026-05-15T00:00:00.000Z"),
        pausedBy: "hard_cap",
        reason: "daily_cost_cap_exceeded",
        resumedAt: null,
      }),
      resume: async () => undefined,
      getActivePause: async () => null,
    },
    sseBus: {
      emit: () => undefined,
      subscribe: () => () => undefined,
      reset: () => undefined,
      listenerCount: () => 0,
    },
    channelDispatch: {
      create_meta_campaign: (async () => ({
        kind: "delivered",
        externalId: "camp_1",
        paid: true,
        paidUsd: 20,
      })) as ChannelDispatch,
    },
    ...overrides,
  };
}

describe("dearMeCostCapsService", () => {
  it("enforceCap allows under cap", async () => {
    const { repository } = makeRepository();
    const service = dearMeCostCapsService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
      defaultDailyCapMicros: 25 * USD_MICROS,
      defaultMonthlyCapMicros: 750 * USD_MICROS,
    });

    await service.accrueCost("co_1", 5 * USD_MICROS, "daily");
    const result = await service.enforceCap("co_1", 10 * USD_MICROS);

    expect(result).toEqual({ allowed: true });
  });

  it("enforceCap blocks over hard cap", async () => {
    const { repository } = makeRepository();
    const service = dearMeCostCapsService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
      defaultDailyCapMicros: 25 * USD_MICROS,
      defaultMonthlyCapMicros: 750 * USD_MICROS,
    });

    await service.accrueCost("co_1", 20 * USD_MICROS, "daily");
    const result = await service.enforceCap("co_1", 6 * USD_MICROS);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("cost_cap_exceeded");
    expect(result.kind).toBe("daily");
  });

  it("enforceCap warns over soft cap", async () => {
    const { repository } = makeRepository();
    const service = dearMeCostCapsService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
      defaultDailyCapMicros: 25 * USD_MICROS,
      defaultMonthlyCapMicros: 750 * USD_MICROS,
    });

    await service.accrueCost("co_1", 18 * USD_MICROS, "daily");
    const result = await service.enforceCap("co_1", 3 * USD_MICROS);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("cost_cap_soft_warning");
    expect(result.kind).toBe("daily");
  });

  it("accrueCost increments correctly", async () => {
    const { repository } = makeRepository();
    const service = dearMeCostCapsService({} as Db, {
      repository,
      now: () => new Date("2026-05-14T12:00:00.000Z"),
      defaultDailyCapMicros: 25 * USD_MICROS,
    });

    await service.accrueCost("co_1", 2 * USD_MICROS, "daily");
    const state = await service.accrueCost("co_1", 3 * USD_MICROS, "daily");

    expect(state.spent).toBe(5 * USD_MICROS);
    expect(state.remaining).toBe(20 * USD_MICROS);
  });

  it("resets the daily window at midnight in the resolved timezone", async () => {
    const { repository } = makeRepository();
    let now = new Date("2026-05-14T23:59:00.000Z");
    const service = dearMeCostCapsService({} as Db, {
      repository,
      now: () => now,
      resolveTimeZone: () => "UTC",
      defaultDailyCapMicros: 25 * USD_MICROS,
    });

    const before = await service.accrueCost("co_1", 9 * USD_MICROS, "daily");
    now = new Date("2026-05-15T00:01:00.000Z");
    const after = await service.getCostState("co_1", "daily");

    expect(before.spent).toBe(9 * USD_MICROS);
    expect(after.spent).toBe(0);
  });

  it("wrapper records delivered spend and blocks the next over-cap dispatch", async () => {
    const accrueCost = vi.fn(async () => ({
      spent: 20 * USD_MICROS,
      cap: 25 * USD_MICROS,
      soft: 20 * USD_MICROS,
      remaining: 5 * USD_MICROS,
      status: "soft_warning" as const,
    }));
    const enforceCap = vi
      .fn()
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false, reason: "cost_cap_exceeded" });
    const dispatch = vi.fn(async () => ({
      kind: "delivered" as const,
      externalId: "camp_1",
      paid: true,
      paidUsd: 20,
    }));

    const wrapper = dearMeOutboundToolWrapper(makeWrapperDeps({
      costCaps: {
        getCostState: async () => ({
          spent: 0,
          cap: 25 * USD_MICROS,
          soft: 20 * USD_MICROS,
          remaining: 25 * USD_MICROS,
          status: "ok",
        }),
        accrueCost,
        enforceCap,
      },
      channelDispatch: { create_meta_campaign: dispatch as ChannelDispatch },
    }));
    const input = {
      toolName: "create_meta_campaign" as const,
      companyId: "co_test",
      userId: "u_test",
      issueId: "is_test",
      openclawRunId: "run_1",
      agentId: "ag_test",
      payload: { campaign: { name: "test", dailyBudgetUsd: 20 } },
      voiceGateText: null,
      voiceGateArtifactKind: null,
      voiceFingerprintId: null,
      estimatedUsd: 20,
      config: { minVoiceGateScore: 70, dailyUsdCap: 25 },
    };

    const delivered = await wrapper.callOutbound(input);
    const blocked = await wrapper.callOutbound({ ...input, openclawRunId: "run_2", estimatedUsd: 10 });

    expect(delivered.kind).toBe("delivered");
    expect(accrueCost).toHaveBeenCalledWith("co_test", 20 * USD_MICROS, "daily");
    expect(accrueCost).toHaveBeenCalledWith("co_test", 20 * USD_MICROS, "monthly");
    expect(blocked).toEqual({ kind: "rejected", reason: "cost_cap_exceeded", gate: "spend" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
