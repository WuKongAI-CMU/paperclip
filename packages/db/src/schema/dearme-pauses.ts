import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const DEARME_PAUSED_BY_VALUES = ["hard_cap", "customer", "support"] as const;
export type DearMePausedBy = typeof DEARME_PAUSED_BY_VALUES[number];

export const dearmePauses = pgTable(
  "dearme_pauses",
  {
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    pausedAt: timestamp("paused_at", { withTimezone: true }).notNull().defaultNow(),
    pausedBy: text("paused_by").$type<DearMePausedBy>().notNull(),
    reason: text("reason").notNull(),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
  },
  (table) => ({
    activeCompanyUniqueIdx: uniqueIndex("dearme_pauses_active_company_idx")
      .on(table.companyId)
      .where(sql`${table.resumedAt} IS NULL`),
    companyPausedAtIdx: index("dearme_pauses_company_paused_at_idx").on(
      table.companyId,
      table.pausedAt,
    ),
  }),
);

export type DearMePause = typeof dearmePauses.$inferSelect;
export type NewDearMePause = typeof dearmePauses.$inferInsert;
