import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const DEARME_PUBLIC_FEED_ITEM_KINDS = [
  "published_post",
  "deployed_site",
  "proof_card",
] as const;
export type DearMePublicFeedItemKind = typeof DEARME_PUBLIC_FEED_ITEM_KINDS[number];

export const dearmePublicFeedOptin = pgTable("dearme_public_feed_optin", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  enabledAt: timestamp("enabled_at", { withTimezone: true }).notNull().defaultNow(),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
});

export const dearmePublicFeedItems = pgTable(
  "dearme_public_feed_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DearMePublicFeedItemKind>().notNull(),
    summary: text("summary").notNull(),
    linkUrl: text("link_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    companyKindLinkUniqueIdx: uniqueIndex("dearme_public_feed_items_company_kind_link_idx").on(
      table.companyId,
      table.kind,
      table.linkUrl,
    ),
    publishedAtIdx: index("dearme_public_feed_items_published_at_idx").on(table.publishedAt),
    companyPublishedAtIdx: index("dearme_public_feed_items_company_published_at_idx").on(
      table.companyId,
      table.publishedAt,
    ),
  }),
);

export type DearMePublicFeedOptin = typeof dearmePublicFeedOptin.$inferSelect;
export type NewDearMePublicFeedOptin = typeof dearmePublicFeedOptin.$inferInsert;
export type DearMePublicFeedItem = typeof dearmePublicFeedItems.$inferSelect;
export type NewDearMePublicFeedItem = typeof dearmePublicFeedItems.$inferInsert;
