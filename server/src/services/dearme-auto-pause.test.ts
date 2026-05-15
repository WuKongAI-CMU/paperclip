import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  createDb,
  dearmePauses,
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "@paperclipai/db";
import { dearMeAutoPauseService } from "./dearme-auto-pause.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe auto-pause tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("dearMeAutoPauseService", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-auto-pause-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(dearmePauses);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Auto Pause Test",
      issuePrefix: `D${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
    });
    return companyId;
  }

  it("pause then isPaused is true", async () => {
    const companyId = await seedCompany();
    const service = dearMeAutoPauseService(db);

    await service.pause({
      companyId,
      by: "hard_cap",
      reason: "Daily USD cap exceeded.",
    });

    expect(await service.isPaused(companyId)).toBe(true);
    expect(await service.getActivePause(companyId)).toMatchObject({
      companyId,
      pausedBy: "hard_cap",
      reason: "Daily USD cap exceeded.",
      resumedAt: null,
    });
  });

  it("pause is idempotent with one active row", async () => {
    const companyId = await seedCompany();
    const service = dearMeAutoPauseService(db);

    await service.pause({
      companyId,
      by: "hard_cap",
      reason: "Daily USD cap exceeded.",
    });
    await service.pause({
      companyId,
      by: "hard_cap",
      reason: "Daily USD cap exceeded.",
    });

    const rows = await db.select().from(dearmePauses);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ companyId, resumedAt: null });
  });

  it("resume clears the active pause", async () => {
    const companyId = await seedCompany();
    const service = dearMeAutoPauseService(db);

    await service.pause({
      companyId,
      by: "hard_cap",
      reason: "Monthly USD cap exceeded.",
    });
    await service.resume({ companyId });

    expect(await service.isPaused(companyId)).toBe(false);
    expect(await service.getActivePause(companyId)).toBeNull();
  });
});
