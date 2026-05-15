import { eq } from "drizzle-orm";
import type { Db, DearMeLinkedinThrottle, NewDearMeLinkedinThrottle } from "@paperclipai/db";
import { dearmeLinkedinThrottle } from "@paperclipai/db";

export type DearMeLinkedInThrottleStatus = "ok" | "daily_cap" | "weekly_cap" | "warming";

export interface DearMeLinkedInThrottleState {
  accountAgeDays: number;
  dmsSentToday: number;
  dmsSentThisWeek: number;
  dailyCap: number;
  weeklyCap: number;
  status: DearMeLinkedInThrottleStatus;
}

export interface DearMeLinkedInThrottleRepository {
  get(companyId: string): Promise<DearMeLinkedinThrottle | null>;
  upsert(row: NewDearMeLinkedinThrottle): Promise<DearMeLinkedinThrottle>;
  update(companyId: string, values: Partial<NewDearMeLinkedinThrottle>): Promise<DearMeLinkedinThrottle>;
}

export interface DearMeLinkedInThrottleOptions {
  now?: () => Date;
  repository?: DearMeLinkedInThrottleRepository;
}

export interface DearMeLinkedInThrottleService {
  getThrottleState(companyId: string): Promise<DearMeLinkedInThrottleState>;
  recordDispatch(companyId: string): Promise<DearMeLinkedInThrottleState>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcWeekKey(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return utcDayKey(start);
}

function accountAgeDays(accountConnectedAt: Date, now: Date) {
  const connectedDay = Date.UTC(
    accountConnectedAt.getUTCFullYear(),
    accountConnectedAt.getUTCMonth(),
    accountConnectedAt.getUTCDate(),
  );
  const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((currentDay - connectedDay) / MS_PER_DAY));
}

export function computeCaps(accountAgeDays: number) {
  if (accountAgeDays <= 3) return { dailyCap: 5, weeklyCap: 20 };
  if (accountAgeDays <= 7) return { dailyCap: 10, weeklyCap: 50 };
  if (accountAgeDays <= 14) return { dailyCap: 20, weeklyCap: 100 };
  return { dailyCap: 40, weeklyCap: 200 };
}

function normalizeRow(row: DearMeLinkedinThrottle, now: Date) {
  const dayKey = utcDayKey(now);
  const weekKey = utcWeekKey(now);
  return {
    ...row,
    dmsSentToday: row.lastResetDay === dayKey ? row.dmsSentToday : 0,
    dmsSentThisWeek: row.lastResetWeek === weekKey ? row.dmsSentThisWeek : 0,
    lastResetDay: dayKey,
    lastResetWeek: weekKey,
  };
}

function stateFromRow(row: DearMeLinkedinThrottle, now: Date): DearMeLinkedInThrottleState {
  const normalized = normalizeRow(row, now);
  const age = accountAgeDays(normalized.accountConnectedAt, now);
  const { dailyCap, weeklyCap } = computeCaps(age);
  const status: DearMeLinkedInThrottleStatus =
    normalized.dmsSentToday >= dailyCap
      ? "daily_cap"
      : normalized.dmsSentThisWeek >= weeklyCap
        ? "weekly_cap"
        : age <= 3
          ? "warming"
          : "ok";

  return {
    accountAgeDays: age,
    dmsSentToday: normalized.dmsSentToday,
    dmsSentThisWeek: normalized.dmsSentThisWeek,
    dailyCap,
    weeklyCap,
    status,
  };
}

function newThrottleRow(companyId: string, now: Date): NewDearMeLinkedinThrottle {
  return {
    companyId,
    accountConnectedAt: now,
    dmsSentToday: 0,
    dmsSentThisWeek: 0,
    lastResetDay: utcDayKey(now),
    lastResetWeek: utcWeekKey(now),
    lifetimeDmsSent: 0,
  };
}

function createDrizzleLinkedInThrottleRepository(db: Db): DearMeLinkedInThrottleRepository {
  return {
    async get(companyId) {
      const [row] = await db
        .select()
        .from(dearmeLinkedinThrottle)
        .where(eq(dearmeLinkedinThrottle.companyId, companyId))
        .limit(1);
      return row ?? null;
    },
    async upsert(row) {
      const [saved] = await db
        .insert(dearmeLinkedinThrottle)
        .values(row)
        .onConflictDoUpdate({
          target: dearmeLinkedinThrottle.companyId,
          set: {
            accountConnectedAt: dearmeLinkedinThrottle.accountConnectedAt,
            dmsSentToday: dearmeLinkedinThrottle.dmsSentToday,
            dmsSentThisWeek: dearmeLinkedinThrottle.dmsSentThisWeek,
            lastResetDay: dearmeLinkedinThrottle.lastResetDay,
            lastResetWeek: dearmeLinkedinThrottle.lastResetWeek,
            lifetimeDmsSent: dearmeLinkedinThrottle.lifetimeDmsSent,
          },
        })
        .returning();
      if (!saved) throw new Error("dearme-linkedin-throttle: upsert did not return row");
      return saved;
    },
    async update(companyId, values) {
      const [saved] = await db
        .update(dearmeLinkedinThrottle)
        .set(values)
        .where(eq(dearmeLinkedinThrottle.companyId, companyId))
        .returning();
      if (!saved) throw new Error("dearme-linkedin-throttle: update did not return row");
      return saved;
    },
  };
}

export function dearMeLinkedInThrottleService(
  db: Db,
  options: DearMeLinkedInThrottleOptions = {},
): DearMeLinkedInThrottleService {
  const repository = options.repository ?? createDrizzleLinkedInThrottleRepository(db);
  const currentTime = () => options.now?.() ?? new Date();

  async function getOrCreate(companyId: string, now: Date) {
    const existing = await repository.get(companyId);
    if (existing) return existing;
    return repository.upsert(newThrottleRow(companyId, now));
  }

  return {
    async getThrottleState(companyId) {
      const now = currentTime();
      const row = await getOrCreate(companyId, now);
      const normalized = normalizeRow(row, now);
      if (normalized.lastResetDay !== row.lastResetDay || normalized.lastResetWeek !== row.lastResetWeek) {
        const saved = await repository.update(companyId, {
          dmsSentToday: normalized.dmsSentToday,
          dmsSentThisWeek: normalized.dmsSentThisWeek,
          lastResetDay: normalized.lastResetDay,
          lastResetWeek: normalized.lastResetWeek,
        });
        return stateFromRow(saved, now);
      }
      return stateFromRow(row, now);
    },
    async recordDispatch(companyId) {
      const now = currentTime();
      const row = await getOrCreate(companyId, now);
      const normalized = normalizeRow(row, now);
      const saved = await repository.update(companyId, {
        dmsSentToday: normalized.dmsSentToday + 1,
        dmsSentThisWeek: normalized.dmsSentThisWeek + 1,
        lastResetDay: normalized.lastResetDay,
        lastResetWeek: normalized.lastResetWeek,
        lifetimeDmsSent: row.lifetimeDmsSent + 1,
      });
      return stateFromRow(saved, now);
    },
  };
}
