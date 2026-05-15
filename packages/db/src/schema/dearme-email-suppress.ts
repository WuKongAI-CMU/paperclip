import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const DEARME_EMAIL_SUPPRESS_REASONS = [
  "unsubscribe",
  "bounce",
  "complaint",
  "manual",
] as const;
export type DearMeEmailSuppressReason = typeof DEARME_EMAIL_SUPPRESS_REASONS[number];

export const dearmeEmailSuppress = pgTable("dearme_email_suppress", {
  email: text("email").primaryKey(),
  reason: text("reason").$type<DearMeEmailSuppressReason>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DearMeEmailSuppress = typeof dearmeEmailSuppress.$inferSelect;
export type NewDearMeEmailSuppress = typeof dearmeEmailSuppress.$inferInsert;
