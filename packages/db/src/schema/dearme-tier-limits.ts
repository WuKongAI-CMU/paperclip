import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const DEARME_TIERS = ["free_trial", "beta", "pro"] as const;
export type DearMeTier = typeof DEARME_TIERS[number];

export const dearmeTierLimits = pgTable(
  "dearme_tier_limits",
  {
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    tier: text("tier").$type<DearMeTier>().notNull(),
    dailyContentPostsCap: integer("daily_content_posts_cap").notNull(),
    weeklyOutreachCap: integer("weekly_outreach_cap").notNull(),
    monthlyAdSpendUsdCap: bigint("monthly_ad_spend_usd_cap", { mode: "number" }).notNull(),
    voiceSampleCap: integer("voice_sample_cap"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
  },
  (table) => ({
    companyEffectiveFromUniqueIdx: uniqueIndex("dearme_tier_limits_company_effective_from_idx").on(
      table.companyId,
      table.effectiveFrom,
    ),
    companyCurrentIdx: index("dearme_tier_limits_company_current_idx").on(
      table.companyId,
      table.effectiveTo,
      table.effectiveFrom,
    ),
  }),
);

export type DearMeTierLimit = typeof dearmeTierLimits.$inferSelect;
export type NewDearMeTierLimit = typeof dearmeTierLimits.$inferInsert;
