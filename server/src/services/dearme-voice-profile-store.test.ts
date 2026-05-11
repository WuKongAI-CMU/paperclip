import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  authUsers,
  companies,
  createDb,
  dearmeVoiceProfiles,
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "@paperclipai/db";
import {
  createDbDearMeVoiceProfileStore,
  dearMeVoiceProfileScopeAllowsRow,
  resolveDearMeVoiceProfileScope,
  resolveDearMeVoiceProfileScopeKey,
} from "./dearme-voice-profile-store.js";
import { dearMeVoiceGateService } from "./dearme-voice-gate.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres voice profile store tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describe("DearMe voice profile scope helpers", () => {
  it("derives company scope from internal company fingerprint ids", () => {
    const companyId = randomUUID();

    expect(resolveDearMeVoiceProfileScope(`company:${companyId}:cycle-output`)).toEqual({
      scopeKey: `company:${companyId}`,
      companyId,
      userId: null,
    });
  });

  it("does not allow scoped rows to satisfy unscoped reads", () => {
    const companyId = randomUUID();

    expect(
      dearMeVoiceProfileScopeAllowsRow(
        { scopeKey: `company:${companyId}`, companyId, userId: null },
        { scopeKey: "global", companyId: null, userId: null },
      ),
    ).toBe(false);
    expect(
      dearMeVoiceProfileScopeAllowsRow(
        { scopeKey: `company:${companyId}`, companyId, userId: null },
        { scopeKey: `company:${companyId}`, companyId, userId: null },
      ),
    ).toBe(true);
  });

  it("keeps company and user scopes distinct for the same fingerprint", () => {
    const companyId = randomUUID();
    const userId = `user-${randomUUID()}`;

    expect(resolveDearMeVoiceProfileScopeKey({ companyId, userId: null })).toBe(
      `company:${companyId}`,
    );
    expect(resolveDearMeVoiceProfileScopeKey({ companyId, userId })).toBe(
      `company:${companyId}:user:${userId}`,
    );
    expect(resolveDearMeVoiceProfileScopeKey({ companyId: null, userId })).toBe(`user:${userId}`);
  });
});

describeEmbeddedPostgres("createDbDearMeVoiceProfileStore", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-voice-profile-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(dearmeVoiceProfiles);
    await db.delete(authUsers);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("persists accepted voice profiles across service instances", async () => {
    const companyId = randomUUID();
    const userId = `user-${randomUUID()}`;
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Test",
      issuePrefix: `D${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
    });
    await db.insert(authUsers).values({
      id: userId,
      name: "Peter",
      email: "peter@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const firstService = dearMeVoiceGateService({
      profileStore: createDbDearMeVoiceProfileStore(db),
    });
    await firstService.scoreVoice({
      fingerprintId: "vf_db_persisted",
      companyId,
      userId,
      text: "I keep coming back to the same lesson from launch calls: proof beats polish when a buyer can inspect the work before we ask.",
      kind: "linkedin-post",
    });

    const [stored] = await db
      .select()
      .from(dearmeVoiceProfiles);
    expect(stored).toMatchObject({
      scopeKey: `company:${companyId}:user:${userId}`,
      companyId,
      userId,
      fingerprintId: "vf_db_persisted",
      acceptedSamples: 1,
    });

    const recreatedService = dearMeVoiceGateService({
      profileStore: createDbDearMeVoiceProfileStore(db),
    });
    const result = await recreatedService.scoreVoice({
      fingerprintId: "vf_db_persisted",
      companyId,
      userId,
      text: "I keep coming back to that proof beats polish lesson because buyers trust the work faster when they can inspect it first.",
      kind: "linkedin-post",
    });

    expect(result.reasons.some((reason) => reason.rule === "voice_continuity")).toBe(true);
  });

  it("derives company scope from internal company fingerprint ids", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Test",
      issuePrefix: `D${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
    });

    const store = createDbDearMeVoiceProfileStore(db);
    await store.writeProfile(`company:${companyId}:cycle-output`, {
      acceptedSamples: 1,
      tokenCounts: { proof: 2 },
    });

    const [stored] = await db
      .select()
      .from(dearmeVoiceProfiles);
    expect(stored).toMatchObject({
      scopeKey: `company:${companyId}`,
      companyId,
      userId: null,
      fingerprintId: `company:${companyId}:cycle-output`,
      acceptedSamples: 1,
    });
  });

  it("does not leak scoped profile snapshots to unscoped reads", async () => {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "DearMe Test",
      issuePrefix: `D${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
    });

    const store = createDbDearMeVoiceProfileStore(db);
    await store.writeProfile("vf_scoped_only", {
      acceptedSamples: 1,
      tokenCounts: { proof: 2 },
    }, { companyId });

    await expect(store.readProfile("vf_scoped_only")).resolves.toBeNull();
    await expect(store.readProfile("vf_scoped_only", { companyId })).resolves.toMatchObject({
      acceptedSamples: 1,
      tokenCounts: { proof: 2 },
    });
  });

  it("stores same fingerprint ids independently by scope", async () => {
    const firstCompanyId = randomUUID();
    const secondCompanyId = randomUUID();
    await db.insert(companies).values([
      {
        id: firstCompanyId,
        name: "DearMe First",
        issuePrefix: `D${firstCompanyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
      },
      {
        id: secondCompanyId,
        name: "DearMe Second",
        issuePrefix: `D${secondCompanyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
      },
    ]);

    const store = createDbDearMeVoiceProfileStore(db);
    await store.writeProfile("vf_shared", {
      acceptedSamples: 1,
      tokenCounts: { proof: 2 },
    }, { companyId: firstCompanyId });
    await store.writeProfile("vf_shared", {
      acceptedSamples: 2,
      tokenCounts: { trust: 3 },
    }, { companyId: secondCompanyId });

    await expect(store.readProfile("vf_shared", { companyId: firstCompanyId })).resolves.toEqual({
      acceptedSamples: 1,
      tokenCounts: { proof: 2 },
    });
    await expect(store.readProfile("vf_shared", { companyId: secondCompanyId })).resolves.toEqual({
      acceptedSamples: 2,
      tokenCounts: { trust: 3 },
    });
  });
});
