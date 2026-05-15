/**
 * DearMe voice profile snapshots.
 *
 * Stores the compact, serializable Voice Gate corpus profile used to keep
 * accepted writing consistent across process restarts. The trained scorer and
 * richer voice model can build on this table later; this slice persists the
 * existing bounded token profile behind the current scoring contract.
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";
import { companies } from "./companies.js";

export type DearMeVoiceProfileSnapshot = {
  acceptedSamples: number;
  tokenCounts: Record<string, number>;
};

export const dearmeVoiceProfiles = pgTable(
  "dearme_voice_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    scopeKey: text("scope_key").notNull().default("global"),
    fingerprintId: text("fingerprint_id").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    acceptedSamples: integer("accepted_samples").notNull().default(0),
    profileSnapshot: jsonb("profile_snapshot").$type<DearMeVoiceProfileSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    scopeFingerprintIdx: uniqueIndex("dearme_voice_profiles_scope_fingerprint_idx").on(
      table.scopeKey,
      table.fingerprintId,
    ),
    fingerprintIdIdx: index("dearme_voice_profiles_fingerprint_id_idx").on(table.fingerprintId),
    companyUserIdx: index("dearme_voice_profiles_company_user_idx").on(
      table.companyId,
      table.userId,
    ),
    updatedAtIdx: index("dearme_voice_profiles_updated_at_idx").on(table.updatedAt),
  }),
);

export type DearMeVoiceProfile = typeof dearmeVoiceProfiles.$inferSelect;
export type NewDearMeVoiceProfile = typeof dearmeVoiceProfiles.$inferInsert;
