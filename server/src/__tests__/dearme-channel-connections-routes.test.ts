import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import { errorHandler } from "../middleware/index.js";
import {
  dearmeChannelConnectionRoutes,
  type DearMeXConnectionCallbackExchangeInput,
  type DearMeXConnectionCallbackExchangeResult,
} from "../routes/dearme-channel-connections.js";

function createApp(
  opts: {
    actor?: Express.Request["actor"];
    exchangeXConnection?: (
      input: DearMeXConnectionCallbackExchangeInput,
    ) => Promise<DearMeXConnectionCallbackExchangeResult>;
    upsertActive?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    now?: () => Date;
  } = {},
) {
  const actor = opts.actor ?? ({
    type: "board",
    userId: "user-1",
    companyIds: ["company-1"],
    source: "local_implicit",
  } as Express.Request["actor"]);
  const exchangeXConnection =
    opts.exchangeXConnection ??
    vi.fn(async () => ({
      encryptedCredential: "enc:x:credential",
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-11T12:00:00.000Z"),
      metadata: {
        providerAppId: "app-1",
        providerProfileUrl: "https://x.com/peter",
      },
    }));
  const upsertActive =
    opts.upsertActive ??
    vi.fn(async (input: Record<string, unknown>) => ({
      id: "connection-1",
      status: "active",
      createdAt: new Date("2026-05-10T12:00:00.000Z"),
      updatedAt: new Date("2026-05-10T12:00:00.000Z"),
      lastUsedAt: null,
      lastError: null,
      lastRefreshedAt: input.lastRefreshedAt,
      metadata: input.metadata ?? null,
      ...input,
    }));
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use(
    "/v1/channels",
    dearmeChannelConnectionRoutes({} as Db, {
      now: opts.now,
      exchangeXConnection,
      channelConnections: {
        upsertActive,
      },
    }),
  );
  app.use(errorHandler);
  return { app, exchangeXConnection, upsertActive };
}

describe("dearmeChannelConnectionRoutes", () => {
  it("stores an active X connection after the callback exchange succeeds", async () => {
    const now = new Date("2026-05-10T12:34:56.000Z");
    const { app, exchangeXConnection, upsertActive } = createApp({
      now: () => now,
    });

    const res = await request(app)
      .post("/v1/channels/company-1/x/callback")
      .send({
        code: "code-123",
        state: "state-abc",
        redirectUri: "https://app.dearme.test/x/callback",
      })
      .expect(200);

    expect(exchangeXConnection).toHaveBeenCalledWith({
      companyId: "company-1",
      userId: "user-1",
      code: "code-123",
      state: "state-abc",
      redirectUri: "https://app.dearme.test/x/callback",
    });
    expect(upsertActive).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        userId: "user-1",
        channel: "x",
        encryptedCredential: "enc:x:credential",
        externalAccountId: "x-account-1",
        externalDisplayName: "@peter",
        scopes: ["tweet.read", "tweet.write"],
        expiresAt: new Date("2026-05-11T12:00:00.000Z"),
        lastRefreshedAt: now,
        metadata: {
          providerAppId: "app-1",
          providerProfileUrl: "https://x.com/peter",
        },
      }),
    );
    expect(res.body).toEqual({
      connected: true,
      channel: "x",
      companyId: "company-1",
      userId: "user-1",
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: "2026-05-11T12:00:00.000Z",
    });
  });

  it("rejects invalid callback input without creating a connection", async () => {
    const { app, exchangeXConnection, upsertActive } = createApp();

    const res = await request(app)
      .post("/v1/channels/company-1/x/callback")
      .send({
        code: "code-123",
        state: "state-abc",
        redirectUri: "not-a-url",
      })
      .expect(400);

    expect(res.body).toMatchObject({
      error: expect.any(String),
    });
    expect(exchangeXConnection).not.toHaveBeenCalled();
    expect(upsertActive).not.toHaveBeenCalled();
  });
});
