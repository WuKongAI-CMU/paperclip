import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const DEARME_COST_CAP_KINDS = ["daily", "monthly"] as const;
export type DearMeCostCapKind = typeof DEARME_COST_CAP_KINDS[number];

export const dearmeCostCaps = pgTable(
  "dearme_cost_caps",
  {
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    periodKind: text("period_kind").$type<DearMeCostCapKind>().notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    usdSpentMicros: bigint("usd_spent_micros", { mode: "number" }).notNull().default(0),
    usdCapMicros: bigint("usd_cap_micros", { mode: "number" }).notNull().default(0),
    softCapMicros: bigint("soft_cap_micros", { mode: "number" }).notNull().default(0),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyKindWindowUniqueIdx: uniqueIndex("dearme_cost_caps_company_kind_window_idx").on(
      table.companyId,
      table.periodKind,
      table.windowStart,
      table.windowEnd,
    ),
    companyKindUpdatedIdx: index("dearme_cost_caps_company_kind_updated_idx").on(
      table.companyId,
      table.periodKind,
      table.lastUpdatedAt,
    ),
  }),
);

export type DearMeCostCap = typeof dearmeCostCaps.$inferSelect;
export type NewDearMeCostCap = typeof dearmeCostCaps.$inferInsert;
