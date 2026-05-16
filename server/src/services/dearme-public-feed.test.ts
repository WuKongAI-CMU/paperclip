import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  createDb,
  dearmePublicFeedItems,
  dearmePublicFeedOptin,
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "@paperclipai/db";
import { dearMePublicFeedService } from "./dearme-public-feed.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres public feed tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefixFor(companyId: string) {
  return `D${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

async function createCompany(db: ReturnType<typeof createDb>, name = "DearMe Test") {
  const companyId = randomUUID();
  await db.insert(companies).values({
    id: companyId,
    name,
    issuePrefix: issuePrefixFor(companyId),
  });
  return companyId;
}

describeEmbeddedPostgres("dearMePublicFeedService", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-public-feed-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(dearmePublicFeedItems);
    await db.delete(dearmePublicFeedOptin);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("optIn then isOptedIn is true", async () => {
    const companyId = await createCompany(db);
    const service = dearMePublicFeedService(db);

    await service.optIn(companyId);

    await expect(service.isOptedIn(companyId)).resolves.toBe(true);
  });

  it("recordItem is refused when opted-out", async () => {
    const companyId = await createCompany(db);
    const service = dearMePublicFeedService(db);

    await expect(service.recordItem({
      companyId,
      kind: "published_post",
      summary: "Published a customer-safe launch note.",
      linkUrl: "https://example.com/post",
      publishedAt: new Date("2026-05-10T12:00:00.000Z"),
    })).rejects.toThrow("not enabled");
  });

  it("recordItem is idempotent on kind and linkUrl", async () => {
    const companyId = await createCompany(db);
    const service = dearMePublicFeedService(db);
    await service.optIn(companyId);

    const first = await service.recordItem({
      companyId,
      kind: "proof_card",
      summary: "Published a proof card for the weekly campaign.",
      linkUrl: "https://example.com/proof",
      publishedAt: new Date("2026-05-10T12:00:00.000Z"),
    });
    const second = await service.recordItem({
      companyId,
      kind: "proof_card",
      summary: "Updated duplicate should not create a new item.",
      linkUrl: "https://example.com/proof",
      publishedAt: new Date("2026-05-11T12:00:00.000Z"),
    });

    const rows = await db.select().from(dearmePublicFeedItems);
    expect(second?.id).toBe(first?.id);
    expect(rows).toHaveLength(1);
  });

  it("recordItem refuses non-public language before it reaches the feed", async () => {
    const companyId = await createCompany(db);
    const service = dearMePublicFeedService(db);
    await service.optIn(companyId);

    await expect(service.recordItem({
      companyId,
      kind: "published_post",
      summary: "Voyage private internals should stay backstage.",
      linkUrl: "https://example.com/post",
      publishedAt: new Date("2026-05-10T12:00:00.000Z"),
    })).rejects.toThrow("non-public language");
  });

  it("listRecentItems returns items in desc order, limited, with no substrate language exposed", async () => {
    const companyId = await createCompany(db);
    const service = dearMePublicFeedService(db);
    await service.optIn(companyId);
    await service.recordItem({
      companyId,
      kind: "published_post",
      summary: "Published the newest post.",
      linkUrl: "https://example.com/new",
      publishedAt: new Date("2026-05-12T12:00:00.000Z"),
    });
    await service.recordItem({
      companyId,
      kind: "deployed_site",
      summary: "Deployed the proof page.",
      linkUrl: "https://example.com/site",
      publishedAt: new Date("2026-05-11T12:00:00.000Z"),
    });
    await db.insert(dearmePublicFeedItems).values({
      companyId,
      kind: "proof_card",
      summary: "Paperclip internal proof should never appear.",
      linkUrl: "https://example.com/dm_sk_hidden",
      publishedAt: new Date("2026-05-13T12:00:00.000Z"),
    });

    const result = await service.listRecentItems({ limit: 2 });

    expect(result.items.map((item) => item.linkUrl)).toEqual([
      "https://example.com/new",
      "https://example.com/site",
    ]);
    expect(JSON.stringify(result.items)).not.toMatch(/Paperclip|OpenClaw|Symphony|Bedrock|Claude|GPT|Voyage|dm_sk_/);
  });

  it("opted-out company's items are not returned by listRecentItems", async () => {
    const optedInCompanyId = await createCompany(db, "DearMe Active");
    const optedOutCompanyId = await createCompany(db, "DearMe Disabled");
    const service = dearMePublicFeedService(db);
    await service.optIn(optedInCompanyId);
    await service.optIn(optedOutCompanyId);
    await service.recordItem({
      companyId: optedInCompanyId,
      kind: "published_post",
      summary: "Published active proof.",
      linkUrl: "https://example.com/active",
      publishedAt: new Date("2026-05-10T12:00:00.000Z"),
    });
    await service.recordItem({
      companyId: optedOutCompanyId,
      kind: "published_post",
      summary: "Published disabled proof.",
      linkUrl: "https://example.com/disabled",
      publishedAt: new Date("2026-05-11T12:00:00.000Z"),
    });

    await service.optOut(optedOutCompanyId);
    const result = await service.listRecentItems({ limit: 10 });

    expect(result.items.map((item) => item.linkUrl)).toEqual(["https://example.com/active"]);
  });
});
