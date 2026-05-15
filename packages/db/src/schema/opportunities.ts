/**
 * DearMe opportunities table — DM-141 schema slice.
 *
 * Tracks personal-brand growth opportunities through the 8-state lifecycle
 * defined in `@paperclipai/dearme-agent-prompts/state-machines`. Each row is
 * one named target (a podcast, sponsor, prospect, recruiter, partner, etc.)
 * the Opportunity Hunter role is working.
 *
 * Lineage: schema shape adapted from DearMe internal outbound-research into
 * the personal-brand domain.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /**
     * Lifecycle state. Allowed values, enforced by the Opportunity Hunter
     * role and validators (see `@paperclipai/dearme-agent-prompts`):
     *   pending | drafted | sent | replied | confirmed |
     *   completed | declined | dead
     */
    state: text("state").notNull().default("pending"),
    /** Opportunity kind — see OPPORTUNITY_KINDS in agent-prompts package. */
    kind: text("kind").notNull().default("other"),
    /** Display title — e.g. "Lenny's Newsletter — AI/Product writer". */
    title: text("title").notNull(),
    /** External handle / contact / link if known. */
    contactHandle: text("contact_handle"),
    contactEmail: text("contact_email"),
    contactUrl: text("contact_url"),
    /** Why this opportunity fits the user — 1-2 sentences. */
    fitReason: text("fit_reason"),
    /** Free-form research notes accumulated by the Opportunity Hunter. */
    notes: jsonb("notes").$type<{
      research?: string;
      voiceCheckedDraft?: string;
      lastInboundAt?: string;
      followUpsSent?: number;
    }>(),
    /** ISO-3166 etc. signals captured at discovery time. */
    signals: jsonb("signals").$type<{
      source?: string;
      jobPostingUrl?: string;
      podcastFormUrl?: string;
      audienceSize?: number;
      [key: string]: unknown;
    }>(),
    /** Linked back to the issue that owns the work product (drafts, replies). */
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    /** Last assigned worker. */
    assigneeAgentId: uuid("assignee_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    /** Counter used to enforce 2-cold-sends-per-day-per-kind cap. */
    sendsToday: integer("sends_today").notNull().default(0),
    sendsTodayDay: text("sends_today_day"), // YYYY-MM-DD UTC
    /** Last forward transition timestamp for SLA / follow-up cron. */
    stateChangedAt: timestamp("state_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    companyStateIdx: index("opportunities_company_state_idx").on(
      table.companyId,
      table.state,
    ),
    companyKindIdx: index("opportunities_company_kind_idx").on(
      table.companyId,
      table.kind,
    ),
    companyContactEmailIdx: uniqueIndex(
      "opportunities_company_contact_email_idx",
    ).on(table.companyId, table.contactEmail),
  }),
);

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
