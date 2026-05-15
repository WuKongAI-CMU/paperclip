import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  companies,
  createDb,
  dearmeReferralAttributions,
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
  type Db,
} from "@paperclipai/db";
import {
  dearMeReferralService,
  referralCouponDescriptor,
  type DearMeReferralStripeClient,
} from "./dearme-referral.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres DearMe referral tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

function issuePrefix(id: string) {
  return `RF${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

async function seedCompany(db: Db, name: string) {
  const companyId = randomUUID();
  await db.insert(companies).values({
    id: companyId,
    name,
    issuePrefix: issuePrefix(companyId),
  });
  return companyId;
}

function stripeClient(couponId = "coupon_referral_20"): DearMeReferralStripeClient {
  return {
    coupons: {
      create: vi.fn(async () => ({ id: couponId })),
    },
  };
}

describe("referralCouponDescriptor", () => {
  it("returns the Stripe 20% referral coupon shape without side effects", () => {
    expect(referralCouponDescriptor({
      code: "peter-fa3k",
      ownerCompanyId: "co_owner",
    })).toEqual({
      percent_off: 20,
      duration: "forever",
      name: "DearMe referral peter-fa3k",
      metadata: {
        product: "dearme",
        kind: "referral",
        referralCode: "peter-fa3k",
        ownerCompanyId: "co_owner",
      },
    });
  });
});

describeEmbeddedPostgres("dearMeReferralService", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-dearme-referral-");
    db = createDb(tempDb.connectionString);
  }, 30_000);

  afterEach(async () => {
    await db.execute(sql.raw(`TRUNCATE TABLE "companies" CASCADE`));
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  it("mintCode creates a unique slug and stores it with the Stripe coupon id", async () => {
    const ownerCompanyId = await seedCompany(db, "Owner");
    const stripe = stripeClient("coupon_peter_fa3k");
    const service = dearMeReferralService(db, {
      stripeClient: stripe,
      randomSuffix: () => "fa3k",
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });

    const row = await service.mintCode(ownerCompanyId, { slugBase: "Peter" });

    expect(row).toMatchObject({
      code: "peter-fa3k",
      ownerCompanyId,
      stripeCouponId: "coupon_peter_fa3k",
      disabledAt: null,
    });
    expect(stripe.coupons.create).toHaveBeenCalledWith(referralCouponDescriptor({
      code: "peter-fa3k",
      ownerCompanyId,
    }));
  });

  it("lookupCode returns the right record and null for unknown codes", async () => {
    const ownerCompanyId = await seedCompany(db, "Owner");
    const service = dearMeReferralService(db, {
      stripeClient: stripeClient("coupon_lookup"),
      randomSuffix: () => "lkp1",
    });
    await service.mintCode(ownerCompanyId, { slugBase: "Lookup" });

    await expect(service.lookupCode("LOOKUP-LKP1")).resolves.toEqual({
      ownerCompanyId,
      stripeCouponId: "coupon_lookup",
      disabled: false,
    });
    await expect(service.lookupCode("missing")).resolves.toBeNull();
  });

  it("recordAttribution is idempotent on code and referredEmail", async () => {
    const ownerCompanyId = await seedCompany(db, "Owner");
    const referredCompanyId = await seedCompany(db, "Referred");
    const service = dearMeReferralService(db, {
      stripeClient: stripeClient("coupon_attr"),
      randomSuffix: () => "attr",
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });
    await service.mintCode(ownerCompanyId, { slugBase: "Owner" });

    const first = await service.recordAttribution({
      code: "owner-attr",
      referredEmail: "Buyer@Example.com",
      referredCompanyId,
    });
    const second = await service.recordAttribution({
      code: "owner-attr",
      referredEmail: "buyer@example.com",
      referredCompanyId,
    });
    const rows = await db
      .select()
      .from(dearmeReferralAttributions)
      .where(eq(dearmeReferralAttributions.code, "owner-attr"));

    expect(second.id).toBe(first.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.referredEmail).toBe("buyer@example.com");
  });

  it("markFirstPayment is idempotent", async () => {
    const ownerCompanyId = await seedCompany(db, "Owner");
    const referredCompanyId = await seedCompany(db, "Referred");
    const service = dearMeReferralService(db, {
      stripeClient: stripeClient("coupon_payment"),
      randomSuffix: () => "pay1",
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });
    await service.mintCode(ownerCompanyId, { slugBase: "Owner" });
    await service.recordAttribution({
      code: "owner-pay1",
      referredEmail: "buyer@example.com",
      referredCompanyId,
    });

    await expect(service.markFirstPayment({ referredCompanyId })).resolves.toBe(1);
    await expect(service.markFirstPayment({ referredCompanyId })).resolves.toBe(0);
  });

  it("getOwnerRewards counts attributions that hit first payment", async () => {
    const ownerCompanyId = await seedCompany(db, "Owner");
    const otherOwnerCompanyId = await seedCompany(db, "Other Owner");
    const paidCompanyId = await seedCompany(db, "Paid");
    const unpaidCompanyId = await seedCompany(db, "Unpaid");
    const otherPaidCompanyId = await seedCompany(db, "Other Paid");
    const service = dearMeReferralService(db, {
      stripeClient: stripeClient("coupon_owner"),
      randomSuffix: () => "own1",
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });
    const otherService = dearMeReferralService(db, {
      stripeClient: stripeClient("coupon_other"),
      randomSuffix: () => "oth1",
      now: () => new Date("2026-05-14T12:00:00.000Z"),
    });
    await service.mintCode(ownerCompanyId, { slugBase: "Owner" });
    await otherService.mintCode(otherOwnerCompanyId, { slugBase: "Other" });
    await service.recordAttribution({
      code: "owner-own1",
      referredEmail: "paid@example.com",
      referredCompanyId: paidCompanyId,
    });
    await service.recordAttribution({
      code: "owner-own1",
      referredEmail: "unpaid@example.com",
      referredCompanyId: unpaidCompanyId,
    });
    await otherService.recordAttribution({
      code: "other-oth1",
      referredEmail: "other-paid@example.com",
      referredCompanyId: otherPaidCompanyId,
    });

    await service.markFirstPayment({ referredCompanyId: paidCompanyId });
    await otherService.markFirstPayment({ referredCompanyId: otherPaidCompanyId });

    await expect(service.getOwnerRewards(ownerCompanyId)).resolves.toBe(1);
  });
});
