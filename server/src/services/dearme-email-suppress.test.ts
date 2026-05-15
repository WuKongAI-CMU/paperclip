import { describe, expect, it } from "vitest";
import type { DearMeEmailSuppress, DearMeEmailSuppressReason } from "@paperclipai/db";
import {
  dearMeEmailSuppressService,
  type DearMeEmailSuppressRepository,
} from "./dearme-email-suppress.js";

function makeRepository(initial: DearMeEmailSuppress[] = []) {
  const rows = new Map(initial.map((row) => [row.email, row]));
  const repository: DearMeEmailSuppressRepository = {
    async find(email) {
      return rows.get(email) ?? null;
    },
    async upsert(email, reason: DearMeEmailSuppressReason, now) {
      rows.set(email, { email, reason, createdAt: now });
    },
    async delete(email) {
      rows.delete(email);
    },
  };
  return { repository, rows };
}

describe("dearMeEmailSuppressService", () => {
  it("isSuppressed reads normalized emails", async () => {
    const { repository } = makeRepository([
      {
        email: "lead@example.com",
        reason: "unsubscribe",
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
      },
    ]);
    const service = dearMeEmailSuppressService({} as never, { repository });

    await expect(service.isSuppressed(" Lead@Example.com ")).resolves.toBe(true);
    await expect(service.isSuppressed("other@example.com")).resolves.toBe(false);
  });

  it("suppress upserts a normalized suppress-list row", async () => {
    const { repository, rows } = makeRepository([
      {
        email: "lead@example.com",
        reason: "bounce",
        createdAt: new Date("2026-05-14T12:00:00.000Z"),
      },
    ]);
    const now = new Date("2026-05-15T12:00:00.000Z");
    const service = dearMeEmailSuppressService({} as never, {
      repository,
      now: () => now,
    });

    await service.suppress(" Lead@Example.com ", "manual");

    expect(rows.get("lead@example.com")).toEqual({
      email: "lead@example.com",
      reason: "manual",
      createdAt: now,
    });
    expect(rows.size).toBe(1);
  });

  it("unsuppress deletes normalized rows", async () => {
    const { repository, rows } = makeRepository([
      {
        email: "lead@example.com",
        reason: "complaint",
        createdAt: new Date("2026-05-15T12:00:00.000Z"),
      },
    ]);
    const service = dearMeEmailSuppressService({} as never, { repository });

    await service.unsuppress(" Lead@Example.com ");

    expect(rows.has("lead@example.com")).toBe(false);
  });
});
