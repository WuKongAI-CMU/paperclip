import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const dearmeLinkedinThrottle = pgTable(
  "dearme_linkedin_throttle",
  {
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    accountConnectedAt: timestamp("account_connected_at", { withTimezone: true }).notNull().defaultNow(),
    dmsSentToday: integer("dms_sent_today").notNull().default(0),
    dmsSentThisWeek: integer("dms_sent_this_week").notNull().default(0),
    lastResetDay: text("last_reset_day").notNull(),
    lastResetWeek: text("last_reset_week").notNull(),
    lifetimeDmsSent: integer("lifetime_dms_sent").notNull().default(0),
  },
  (table) => ({
    companyUniqueIdx: uniqueIndex("dearme_linkedin_throttle_company_idx").on(table.companyId),
    lastResetDayIdx: index("dearme_linkedin_throttle_last_reset_day_idx").on(table.lastResetDay),
  }),
);

export type DearMeLinkedinThrottle = typeof dearmeLinkedinThrottle.$inferSelect;
export type NewDearMeLinkedinThrottle = typeof dearmeLinkedinThrottle.$inferInsert;
