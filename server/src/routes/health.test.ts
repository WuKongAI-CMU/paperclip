import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { healthProbeRoutes } from "./health.js";

const ORIGINAL_DEARME_PUBLIC_URL = process.env.DEARME_PUBLIC_URL;
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

function createApp(
  db: { execute: ReturnType<typeof vi.fn> } | undefined,
  opts: Parameters<typeof healthProbeRoutes>[1] = {},
) {
  const app = express();
  app.use(healthProbeRoutes(db as any, opts));
  return app;
}

describe("health probe routes", () => {
  beforeEach(() => {
    process.env.DEARME_PUBLIC_URL = "https://example.test";
    process.env.DATABASE_URL = "postgres://example";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_DEARME_PUBLIC_URL === undefined) {
      delete process.env.DEARME_PUBLIC_URL;
    } else {
      process.env.DEARME_PUBLIC_URL = ORIGINAL_DEARME_PUBLIC_URL;
    }
    if (ORIGINAL_DATABASE_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
    }
  });

  it("returns liveness metadata from /healthz", async () => {
    const app = createApp(undefined, {
      now: () => new Date("2026-05-15T12:00:00.000Z"),
      uptimeSeconds: () => 42.8,
      version: "9.8.7",
    });

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      version: "9.8.7",
      uptimeSeconds: 42,
      now: "2026-05-15T12:00:00.000Z",
    });
  });

  it("returns ready when the database check and required env checks pass", async () => {
    const db = { execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const app = createApp(db);

    const res = await request(app).get("/readyz");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks).toHaveLength(3);
    expect(res.body.checks.map((check: { name: string }) => check.name).sort()).toEqual([
      "database",
      "database_url",
      "dearme_public_url",
    ]);
    expect(res.body.checks.every((check: { status: string }) => check.status === "ok")).toBe(true);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it("returns not ready when the database query throws", async () => {
    const db = { execute: vi.fn().mockRejectedValue(new Error("connection failed")) };
    const app = createApp(db);

    const res = await request(app).get("/readyz");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not_ready");
    expect(res.body.failedChecks).toEqual(["database"]);
    expect(res.body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "database",
          status: "failed",
          error: "failed",
        }),
      ]),
    );
  });

  it("returns not ready within two seconds when the database query hangs", async () => {
    const db = { execute: vi.fn().mockReturnValue(new Promise(() => {})) };
    const app = createApp(db, { checkTimeoutMs: 25 });
    const startedAt = performance.now();

    const res = await request(app).get("/readyz");

    expect(performance.now() - startedAt).toBeLessThan(2_000);
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not_ready");
    expect(res.body.failedChecks).toEqual(["database"]);
    expect(res.body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "database",
          status: "failed",
          error: "timeout",
        }),
      ]),
    );
  });

  it("keeps both routes from surfacing thrown internal errors", async () => {
    const app = createApp(undefined, {
      now: () => {
        throw new Error("clock failed");
      },
      uptimeSeconds: () => {
        throw new Error("uptime failed");
      },
    });

    const healthRes = await request(app).get("/healthz");
    const readyRes = await request(app).get("/readyz");

    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe("ok");
    expect(readyRes.status).toBe(503);
    expect(readyRes.body.status).toBe("not_ready");
  });
});
