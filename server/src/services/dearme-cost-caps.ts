import { sql } from "drizzle-orm";
import type { Db, DearMeCostCap, DearMeCostCapKind, NewDearMeCostCap } from "@paperclipai/db";
import { dearmeCostCaps } from "@paperclipai/db";

export type DearMeCostCapStatus = "ok" | "soft_warning" | "hard_blocked";
export type DearMeCostCapKindInput = DearMeCostCapKind;

export interface DearMeCostState {
  spent: number;
  cap: number;
  soft: number;
  remaining: number;
  status: DearMeCostCapStatus;
}

export interface DearMeCapEnforcementResult {
  allowed: boolean;
  reason?: "cost_cap_exceeded" | "cost_cap_soft_warning";
  kind?: DearMeCostCapKindInput;
  state?: DearMeCostState;
}

export interface CostCapWindow {
  start: Date;
  end: Date;
}

export interface DearMeCostCapRepository {
  upsertWindowRow(input: {
    companyId: string;
    kind: DearMeCostCapKindInput;
    window: CostCapWindow;
    capMicros: number;
    softCapMicros: number;
    now: Date;
  }): Promise<DearMeCostCap>;
  incrementWindowRow(input: {
    companyId: string;
    kind: DearMeCostCapKindInput;
    window: CostCapWindow;
    usdMicros: number;
    capMicros: number;
    softCapMicros: number;
    now: Date;
  }): Promise<DearMeCostCap>;
}

export interface DearMeCostCapsOptions {
  now?: () => Date;
  resolveTimeZone?: (companyId: string) => Promise<string | null> | string | null;
  defaultDailyCapMicros?: number;
  defaultMonthlyCapMicros?: number;
  softCapRatio?: number;
  repository?: DearMeCostCapRepository;
}

export interface DearMeCostCapsService {
  getCostState(companyId: string, kind: DearMeCostCapKindInput): Promise<DearMeCostState>;
  accrueCost(companyId: string, usdMicros: number, kind: DearMeCostCapKindInput): Promise<DearMeCostState>;
  enforceCap(
    companyId: string,
    estimatedCostMicros: number,
    overrides?: { dailyCapMicros?: number; monthlyCapMicros?: number },
  ): Promise<DearMeCapEnforcementResult>;
}

const MICROS_PER_USD = 1_000_000;
const DEFAULT_DAILY_CAP_MICROS = 25 * MICROS_PER_USD;
const DEFAULT_MONTHLY_CAP_MICROS = 750 * MICROS_PER_USD;
const DEFAULT_SOFT_CAP_RATIO = 0.8;

function assertValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour === "24" ? "0" : values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedLocalTimeToUtc(
  input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  const wanted = {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 0,
    minute: input.minute ?? 0,
    second: input.second ?? 0,
  };
  let utcMs = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute, wanted.second);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(utcMs), timeZone);
    const wantedAsUtc = Date.UTC(
      wanted.year,
      wanted.month - 1,
      wanted.day,
      wanted.hour,
      wanted.minute,
      wanted.second,
    );
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const delta = actualAsUtc - wantedAsUtc;
    if (delta === 0) break;
    utcMs -= delta;
  }
  return new Date(utcMs);
}

function resolveWindow(kind: DearMeCostCapKindInput, now: Date, timeZone: string): CostCapWindow {
  const parts = zonedParts(now, timeZone);
  const start = kind === "daily"
    ? zonedLocalTimeToUtc({ year: parts.year, month: parts.month, day: parts.day }, timeZone)
    : zonedLocalTimeToUtc({ year: parts.year, month: parts.month, day: 1 }, timeZone);
  const end = kind === "daily"
    ? zonedLocalTimeToUtc({ year: parts.year, month: parts.month, day: parts.day + 1 }, timeZone)
    : zonedLocalTimeToUtc({ year: parts.year, month: parts.month + 1, day: 1 }, timeZone);
  return { start, end };
}

function normalizeMicros(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function stateFromRow(row: DearMeCostCap): DearMeCostState {
  const spent = Number(row.usdSpentMicros);
  const cap = Number(row.usdCapMicros);
  const soft = Number(row.softCapMicros);
  const remaining = Math.max(0, cap - spent);
  const status: DearMeCostCapStatus =
    cap > 0 && spent >= cap ? "hard_blocked" : soft > 0 && spent >= soft ? "soft_warning" : "ok";
  return { spent, cap, soft, remaining, status };
}

function capForKind(kind: DearMeCostCapKindInput, options: DearMeCostCapsOptions) {
  return kind === "daily"
    ? options.defaultDailyCapMicros ?? DEFAULT_DAILY_CAP_MICROS
    : options.defaultMonthlyCapMicros ?? DEFAULT_MONTHLY_CAP_MICROS;
}

function softCapFor(capMicros: number, options: DearMeCostCapsOptions) {
  const ratio = options.softCapRatio ?? DEFAULT_SOFT_CAP_RATIO;
  return Math.max(0, Math.floor(capMicros * ratio));
}

function createDrizzleCostCapRepository(db: Db): DearMeCostCapRepository {
  return {
    async upsertWindowRow({ companyId, kind, window, capMicros, softCapMicros, now }) {
      const values: NewDearMeCostCap = {
        companyId,
        periodKind: kind,
        windowStart: window.start,
        windowEnd: window.end,
        usdSpentMicros: 0,
        usdCapMicros: capMicros,
        softCapMicros,
        lastUpdatedAt: now,
      };
      const [row] = await db
        .insert(dearmeCostCaps)
        .values(values)
        .onConflictDoUpdate({
          target: [
            dearmeCostCaps.companyId,
            dearmeCostCaps.periodKind,
            dearmeCostCaps.windowStart,
            dearmeCostCaps.windowEnd,
          ],
          set: {
            usdCapMicros: capMicros,
            softCapMicros,
            lastUpdatedAt: now,
          },
        })
        .returning();
      if (!row) throw new Error("dearme-cost-caps: upsert did not return row");
      return row;
    },
    async incrementWindowRow({ companyId, kind, window, usdMicros, capMicros, softCapMicros, now }) {
      const [row] = await db
        .insert(dearmeCostCaps)
        .values({
          companyId,
          periodKind: kind,
          windowStart: window.start,
          windowEnd: window.end,
          usdSpentMicros: usdMicros,
          usdCapMicros: capMicros,
          softCapMicros,
          lastUpdatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            dearmeCostCaps.companyId,
            dearmeCostCaps.periodKind,
            dearmeCostCaps.windowStart,
            dearmeCostCaps.windowEnd,
          ],
          set: {
            usdSpentMicros: sql`${dearmeCostCaps.usdSpentMicros} + ${usdMicros}`,
            usdCapMicros: capMicros,
            softCapMicros,
            lastUpdatedAt: now,
          },
        })
        .returning();
      if (!row) throw new Error("dearme-cost-caps: increment did not return row");
      return row;
    },
  };
}

export function dearMeCostCapsService(
  db: Db,
  options: DearMeCostCapsOptions = {},
): DearMeCostCapsService {
  const repository = options.repository ?? createDrizzleCostCapRepository(db);

  async function currentWindow(companyId: string, kind: DearMeCostCapKindInput) {
    const rawTimeZone = await options.resolveTimeZone?.(companyId);
    const timeZone = assertValidTimeZone(rawTimeZone ?? "UTC");
    return resolveWindow(kind, options.now?.() ?? new Date(), timeZone);
  }

  async function ensureRow(
    companyId: string,
    kind: DearMeCostCapKindInput,
    overrides: { dailyCapMicros?: number; monthlyCapMicros?: number } = {},
  ) {
    const now = options.now?.() ?? new Date();
    const window = await currentWindow(companyId, kind);
    const overrideCap = kind === "daily" ? overrides.dailyCapMicros : overrides.monthlyCapMicros;
    const capMicros = normalizeMicros(overrideCap ?? capForKind(kind, options));
    const softCapMicros = softCapFor(capMicros, options);
    return repository.upsertWindowRow({ companyId, kind, window, capMicros, softCapMicros, now });
  }

  return {
    async getCostState(companyId, kind) {
      const row = await ensureRow(companyId, kind);
      return stateFromRow(row);
    },

    async accrueCost(companyId, usdMicros, kind) {
      const now = options.now?.() ?? new Date();
      const window = await currentWindow(companyId, kind);
      const capMicros = normalizeMicros(capForKind(kind, options));
      const softCapMicros = softCapFor(capMicros, options);
      const row = await repository.incrementWindowRow({
        companyId,
        kind,
        window,
        usdMicros: normalizeMicros(usdMicros),
        capMicros,
        softCapMicros,
        now,
      });
      return stateFromRow(row);
    },

    async enforceCap(companyId, estimatedCostMicros, overrides = {}) {
      const estimate = normalizeMicros(estimatedCostMicros);
      let softWarning: DearMeCapEnforcementResult | null = null;
      for (const kind of ["daily", "monthly"] as const) {
        const state = stateFromRow(await ensureRow(companyId, kind, overrides));
        const spentAfterEstimate = state.spent + estimate;
        if (state.cap > 0 && spentAfterEstimate > state.cap) {
          return {
            allowed: false,
            reason: "cost_cap_exceeded",
            kind,
            state: { ...state, remaining: Math.max(0, state.cap - spentAfterEstimate), status: "hard_blocked" },
          };
        }
        if (!softWarning && state.soft > 0 && spentAfterEstimate >= state.soft) {
          softWarning = {
            allowed: true,
            reason: "cost_cap_soft_warning",
            kind,
            state: { ...state, remaining: Math.max(0, state.cap - spentAfterEstimate), status: "soft_warning" },
          };
        }
      }
      if (softWarning) return softWarning;
      return { allowed: true };
    },
  };
}
