import type { Db } from "@paperclipai/db";
import { describe, expect, it, vi } from "vitest";
import { dearMeChannelConnectionsService } from "./dearme-channel-connections.js";

function makeDb(existingRows: Record<string, unknown>[], updatedRow?: Record<string, unknown>) {
  const selectLimit = vi.fn(async () => existingRows);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updateSetValues: Array<Record<string, unknown>> = [];
  const updateReturning = vi.fn(async () => (updatedRow ? [updatedRow] : []));
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn((values: Record<string, unknown>) => {
    updateSetValues.push(values);
    return { where: updateWhere };
  });
  const update = vi.fn(() => ({ set: updateSet }));

  const insertValues: Array<Record<string, unknown>> = [];
  const insertReturning = vi.fn(async () => (updatedRow ? [updatedRow] : []));
  const insertValuesFn = vi.fn((values: Record<string, unknown>) => {
    insertValues.push(values);
    return { returning: insertReturning };
  });
  const insert = vi.fn(() => ({ values: insertValuesFn }));

  return {
    db: { select, update, insert } as unknown as Db,
    select,
    selectFrom,
    selectWhere,
    selectLimit,
    update,
    updateSet,
    updateSetValues,
    updateWhere,
    updateReturning,
    insert,
    insertValuesFn,
    insertValues,
    insertReturning,
  };
}

describe("dearMeChannelConnectionsService.upsertActive", () => {
  it("inserts a new active X connection with the persisted credential blob and profile details", async () => {
    const insertedRow = {
      id: "connection-1",
      companyId: "company-1",
      userId: "user-1",
      channel: "x",
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      encryptedCredential: "enc:x:credential",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-11T12:00:00.000Z"),
      status: "active",
      lastUsedAt: null,
      lastRefreshedAt: new Date("2026-05-10T12:34:56.000Z"),
      lastError: null,
      metadata: {
        providerAppId: "app-1",
        providerProfileUrl: "https://x.com/peter",
      },
      createdAt: new Date("2026-05-10T12:34:56.000Z"),
      updatedAt: new Date("2026-05-10T12:34:56.000Z"),
    };
    const { db, select, insert, insertValues } = makeDb([], insertedRow);
    const service = dearMeChannelConnectionsService(db);

    const input = {
      companyId: "company-1",
      userId: "user-1",
      channel: "x" as const,
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      encryptedCredential: "enc:x:credential",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-11T12:00:00.000Z"),
      lastRefreshedAt: new Date("2026-05-10T12:34:56.000Z"),
      metadata: {
        providerAppId: "app-1",
        providerProfileUrl: "https://x.com/peter",
      },
    };

    const result = await service.upsertActive(input);

    expect(select).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveLength(1);
    expect(insertValues[0]).toMatchObject({
      ...input,
      status: "active",
    });
    expect(result).toMatchObject({
      companyId: "company-1",
      userId: "user-1",
      channel: "x",
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      encryptedCredential: "enc:x:credential",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-11T12:00:00.000Z"),
      status: "active",
      metadata: {
        providerAppId: "app-1",
        providerProfileUrl: "https://x.com/peter",
      },
    });
  });

  it("updates an existing active X connection in place", async () => {
    const existingRow = {
      id: "connection-1",
      companyId: "company-1",
      userId: "user-1",
      channel: "x",
      externalAccountId: "x-account-1",
      externalDisplayName: "@old-handle",
      encryptedCredential: "enc:old",
      scopes: ["tweet.read"],
      expiresAt: new Date("2026-05-11T09:00:00.000Z"),
      status: "revoked",
      lastUsedAt: null,
      lastRefreshedAt: null,
      lastError: null,
      metadata: null,
      createdAt: new Date("2026-05-09T12:00:00.000Z"),
      updatedAt: new Date("2026-05-09T12:00:00.000Z"),
    };
    const updatedRow = {
      ...existingRow,
      externalDisplayName: "@peter",
      encryptedCredential: "enc:new",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-12T12:00:00.000Z"),
      status: "active",
      lastRefreshedAt: new Date("2026-05-10T13:00:00.000Z"),
      metadata: {
        providerAppId: "app-2",
      },
      updatedAt: new Date("2026-05-10T13:00:00.000Z"),
    };
    const { db, update, updateSetValues, insert } = makeDb([existingRow], updatedRow);
    const service = dearMeChannelConnectionsService(db);

    const input = {
      companyId: "company-1",
      userId: "user-1",
      channel: "x" as const,
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      encryptedCredential: "enc:new",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-12T12:00:00.000Z"),
      lastRefreshedAt: new Date("2026-05-10T13:00:00.000Z"),
      metadata: {
        providerAppId: "app-2",
      },
    };

    const result = await service.upsertActive(input);

    expect(update).toHaveBeenCalledTimes(1);
    expect(updateSetValues).toHaveLength(1);
    expect(updateSetValues[0]).toMatchObject({
      ...input,
      status: "active",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "connection-1",
      companyId: "company-1",
      userId: "user-1",
      channel: "x",
      externalAccountId: "x-account-1",
      externalDisplayName: "@peter",
      encryptedCredential: "enc:new",
      scopes: ["tweet.read", "tweet.write"],
      expiresAt: new Date("2026-05-12T12:00:00.000Z"),
      status: "active",
      metadata: {
        providerAppId: "app-2",
      },
    });
  });
});
