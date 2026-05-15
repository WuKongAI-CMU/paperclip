import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const dearmeReferralCodes = pgTable(
  "dearme_referral_codes",
  {
    code: text("code").primaryKey(),
    ownerCompanyId: uuid("owner_company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    stripeCouponId: text("stripe_coupon_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => ({
    ownerCompanyIdx: index("dearme_referral_codes_owner_company_idx").on(table.ownerCompanyId),
    stripeCouponIdx: index("dearme_referral_codes_stripe_coupon_idx").on(table.stripeCouponId),
  }),
);

export const dearmeReferralAttributions = pgTable(
  "dearme_referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().references(() => dearmeReferralCodes.code, { onDelete: "restrict" }),
    referredEmail: text("referred_email").notNull(),
    referredCompanyId: uuid("referred_company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    attributedAt: timestamp("attributed_at", { withTimezone: true }).notNull().defaultNow(),
    firstPaymentAt: timestamp("first_payment_at", { withTimezone: true }),
  },
  (table) => ({
    codeEmailUniqueIdx: uniqueIndex("dearme_referral_attributions_code_email_idx").on(
      table.code,
      table.referredEmail,
    ),
    ownerRewardIdx: index("dearme_referral_attributions_code_first_payment_idx").on(
      table.code,
      table.firstPaymentAt,
    ),
    referredCompanyIdx: index("dearme_referral_attributions_referred_company_idx").on(table.referredCompanyId),
  }),
);

export type DearMeReferralCode = typeof dearmeReferralCodes.$inferSelect;
export type NewDearMeReferralCode = typeof dearmeReferralCodes.$inferInsert;
export type DearMeReferralAttribution = typeof dearmeReferralAttributions.$inferSelect;
export type NewDearMeReferralAttribution = typeof dearmeReferralAttributions.$inferInsert;
