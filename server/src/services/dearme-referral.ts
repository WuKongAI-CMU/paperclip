import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  dearmeReferralAttributions,
  dearmeReferralCodes,
  type DearMeReferralAttribution,
  type DearMeReferralCode,
} from "@paperclipai/db";

export type DearMeReferralCouponDescriptor = {
  percent_off: 20;
  duration: "forever";
  name: string;
  metadata: {
    product: "dearme";
    kind: "referral";
    referralCode: string;
    ownerCompanyId: string;
  };
};

export interface DearMeReferralStripeClient {
  coupons: {
    create(params: DearMeReferralCouponDescriptor): Promise<{ id: string }>;
  };
}

export interface DearMeReferralServiceOptions {
  stripeClient?: DearMeReferralStripeClient;
  now?: () => Date;
  randomSuffix?: () => string;
}

export interface DearMeReferralMintOptions {
  slugBase?: string;
  code?: string;
  stripeCouponId?: string;
}

export interface DearMeReferralLookupResult {
  ownerCompanyId: string;
  stripeCouponId: string;
  disabled: boolean;
}

export interface DearMeReferralRecordAttributionInput {
  code: string;
  referredEmail: string;
  referredCompanyId: string;
}

export interface DearMeReferralMarkFirstPaymentInput {
  referredCompanyId: string;
  stripeCouponId?: string | null;
}

export function referralCouponDescriptor(input: {
  code: string;
  ownerCompanyId: string;
}): DearMeReferralCouponDescriptor {
  return {
    percent_off: 20,
    duration: "forever",
    name: `DearMe referral ${input.code}`,
    metadata: {
      product: "dearme",
      kind: "referral",
      referralCode: input.code,
      ownerCompanyId: input.ownerCompanyId,
    },
  };
}

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugifyBase(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "dearme";
}

function defaultRandomSuffix() {
  return randomBytes(3).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4).padEnd(4, "0");
}

function requireStripeClient(stripeClient: DearMeReferralStripeClient | undefined): DearMeReferralStripeClient {
  if (!stripeClient) {
    throw new Error("DearMe referral Stripe client is not configured.");
  }
  return stripeClient;
}

export function dearMeReferralService(
  db: Db,
  options: DearMeReferralServiceOptions = {},
) {
  const now = options.now ?? (() => new Date());
  const randomSuffix = options.randomSuffix ?? defaultRandomSuffix;

  async function mintCode(
    ownerCompanyId: string,
    opts: DearMeReferralMintOptions = {},
  ): Promise<DearMeReferralCode> {
    const [existing] = await db
      .select()
      .from(dearmeReferralCodes)
      .where(and(
        eq(dearmeReferralCodes.ownerCompanyId, ownerCompanyId),
        isNull(dearmeReferralCodes.disabledAt),
      ))
      .limit(1);
    if (existing) return existing;

    const base = slugifyBase(opts.slugBase ?? ownerCompanyId);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = normalizeCode(opts.code ?? `${base}-${randomSuffix()}`);
      const [collision] = await db
        .select({ code: dearmeReferralCodes.code })
        .from(dearmeReferralCodes)
        .where(eq(dearmeReferralCodes.code, code))
        .limit(1);
      if (collision) {
        if (opts.code) throw new Error(`DearMe referral code already exists: ${code}`);
        continue;
      }

      const stripeCouponId = opts.stripeCouponId
        ?? (await requireStripeClient(options.stripeClient).coupons.create(
          referralCouponDescriptor({ code, ownerCompanyId }),
        )).id;
      const [created] = await db
        .insert(dearmeReferralCodes)
        .values({
          code,
          ownerCompanyId,
          stripeCouponId,
          createdAt: now(),
        })
        .returning();
      if (!created) throw new Error("Failed to create DearMe referral code.");
      return created;
    }

    throw new Error("Failed to generate a unique DearMe referral code.");
  }

  async function lookupCode(code: string): Promise<DearMeReferralLookupResult | null> {
    const [row] = await db
      .select({
        ownerCompanyId: dearmeReferralCodes.ownerCompanyId,
        stripeCouponId: dearmeReferralCodes.stripeCouponId,
        disabledAt: dearmeReferralCodes.disabledAt,
      })
      .from(dearmeReferralCodes)
      .where(eq(dearmeReferralCodes.code, normalizeCode(code)))
      .limit(1);
    if (!row) return null;
    return {
      ownerCompanyId: row.ownerCompanyId,
      stripeCouponId: row.stripeCouponId,
      disabled: row.disabledAt !== null,
    };
  }

  async function recordAttribution(
    input: DearMeReferralRecordAttributionInput,
  ): Promise<DearMeReferralAttribution> {
    const code = normalizeCode(input.code);
    const referredEmail = normalizeEmail(input.referredEmail);
    await db
      .insert(dearmeReferralAttributions)
      .values({
        code,
        referredEmail,
        referredCompanyId: input.referredCompanyId,
        attributedAt: now(),
      })
      .onConflictDoNothing({
        target: [
          dearmeReferralAttributions.code,
          dearmeReferralAttributions.referredEmail,
        ],
      });

    const [row] = await db
      .select()
      .from(dearmeReferralAttributions)
      .where(and(
        eq(dearmeReferralAttributions.code, code),
        eq(dearmeReferralAttributions.referredEmail, referredEmail),
      ))
      .limit(1);
    if (!row) throw new Error("Failed to record DearMe referral attribution.");
    return row;
  }

  async function markFirstPayment(
    input: DearMeReferralMarkFirstPaymentInput,
  ): Promise<number> {
    const couponId = input.stripeCouponId?.trim();
    const codeFilter = couponId
      ? inArray(
          dearmeReferralAttributions.code,
          db
            .select({ code: dearmeReferralCodes.code })
            .from(dearmeReferralCodes)
            .where(eq(dearmeReferralCodes.stripeCouponId, couponId)),
        )
      : undefined;

    const updated = await db
      .update(dearmeReferralAttributions)
      .set({ firstPaymentAt: now() })
      .where(and(
        eq(dearmeReferralAttributions.referredCompanyId, input.referredCompanyId),
        isNull(dearmeReferralAttributions.firstPaymentAt),
        codeFilter,
      ))
      .returning({ id: dearmeReferralAttributions.id });
    return updated.length;
  }

  async function getOwnerRewards(ownerCompanyId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dearmeReferralAttributions)
      .innerJoin(
        dearmeReferralCodes,
        eq(dearmeReferralCodes.code, dearmeReferralAttributions.code),
      )
      .where(and(
        eq(dearmeReferralCodes.ownerCompanyId, ownerCompanyId),
        isNotNull(dearmeReferralAttributions.firstPaymentAt),
      ));
    return row?.count ?? 0;
  }

  return {
    getOwnerRewards,
    lookupCode,
    markFirstPayment,
    mintCode,
    recordAttribution,
  };
}
