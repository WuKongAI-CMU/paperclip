import { describe, expect, it } from "vitest";
import {
  redactSqlFragment,
  type SlowQueryLogEvent,
  wrapSqlForSlowQueryLogging,
} from "./client.js";

type FakeSql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<string>) & {
  unsafe: (query: string) => Promise<string>;
};

function createFakeSql(): FakeSql {
  const sql = (async () => "ok") as unknown as FakeSql;
  sql.unsafe = async () => "unsafe";
  return sql;
}

function createClock(values: number[]): () => number {
  return () => {
    const value = values.shift();
    if (value === undefined) throw new Error("clock exhausted");
    return value;
  };
}

describe("wrapSqlForSlowQueryLogging", () => {
  it("logs awaited tagged queries that exceed the slow query threshold", async () => {
    const events: SlowQueryLogEvent[] = [];
    const sql = wrapSqlForSlowQueryLogging(createFakeSql(), {
      thresholdMs: 200,
      now: createClock([1_000, 1_251]),
      logger: (event) => events.push(event),
    });

    await sql`select * from users where email = ${"person@example.com"} and status = ${"active"}`;

    expect(events).toEqual([
      {
        durationMs: 251,
        sqlFragment: "select * from users where email = ? and status = ?",
      },
    ]);
  });

  it("does not log queries at the slow query threshold", async () => {
    const events: SlowQueryLogEvent[] = [];
    const sql = wrapSqlForSlowQueryLogging(createFakeSql(), {
      thresholdMs: 200,
      now: createClock([1_000, 1_200]),
      logger: (event) => events.push(event),
    });

    await sql`select 1`;

    expect(events).toEqual([]);
  });

  it("logs unsafe queries with redacted SQL fragments", async () => {
    const events: SlowQueryLogEvent[] = [];
    const sql = wrapSqlForSlowQueryLogging(createFakeSql(), {
      thresholdMs: 200,
      now: createClock([1_000, 1_350]),
      logger: (event) => events.push(event),
    });

    await sql.unsafe(`
      select *
      from api_keys
      where token = 'dm_sk_sensitive'
        and owner_email = 'owner@example.com'
    `);

    expect(events).toEqual([
      {
        durationMs: 350,
        sqlFragment: "select * from api_keys where token = '?' and owner_email = '?'",
      },
    ]);
  });

  it("redacts standalone secrets and emails before logging SQL fragments", () => {
    expect(redactSqlFragment("select dm_sk_sensitive, owner@example.com from users")).toBe(
      "select ***REDACTED***, ***REDACTED*** from users",
    );
  });
});
