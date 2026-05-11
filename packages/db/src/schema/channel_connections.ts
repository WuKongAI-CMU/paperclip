/**
 * DearMe channel_connections table — DM-175 schema slice.
 *
 * Stores per-user OAuth tokens or channel credentials for outbound channels
 * (X, LinkedIn, Resend for email, Meta Ads, Telegram/iMessage gateway
 * bindings, Buffer/Hootsuite when used). DearMe never publishes from a shared
 * social account; governed sends use the user's connected channel.
 *
 * Substrate role:
 *   - Naive table-of-record. Drizzle-managed. The encrypted token blobs
 *     are at-rest only; runtime decrypt happens in `dearme-ai-proxy` /
 *     server outbound services.
 *   - Polsia choreography: gates the "deliver" stage of the work loop —
 *     a `deliver` transition cannot fire without a row matching
 *     (companyId, userId, channel, status="active").
 *   - OpenClaw: when a DearMe outbound tool is invoked from the user's
 *     OpenClaw plugin and finds no active row, the tool surfaces a
 *     just-in-time OAuth prompt back to the channel where the user is.
 *
 * Lineage: schema shape is DearMe-original, designed for the
 * just-in-time per-user OAuth pattern documented in
 * `docs/dearme/PRODUCT-ARCHITECTURE.md` §10.
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth.js";
import { companies } from "./companies.js";

/**
 * Allowed `channel` values. Keep tight; new channels need a ticket and a
 * matching outbound tool implementation in `@paperclipai/dearme-openclaw`.
 */
export const CHANNEL_CONNECTION_CHANNELS = [
  "x", // X / Twitter — write_tweet
  "linkedin", // LinkedIn — write_post + send_dm
  "resend", // Email outbound via Resend (avoids Gmail CASA cost)
  "ses", // Email outbound via Amazon SES (alt to Resend)
  "telegram", // Telegram via OpenClaw gateway
  "imessage", // iMessage/SMS via OpenClaw gateway
  "meta_ads", // Meta Ads Manager — campaign + ad lifecycle
  "buffer", // Cross-poster (when needed for IG/threads/etc)
  "stripe", // Stripe Connect for revenue attribution (future)
] as const;
export type ChannelConnectionChannel =
  (typeof CHANNEL_CONNECTION_CHANNELS)[number];

/**
 * Connection lifecycle:
 *   pending      → user kicked off OAuth but hasn't completed
 *   active       → tokens valid, channel usable
 *   needs_reauth → refresh failed; user must re-OAuth
 *   revoked      → user explicitly disconnected
 *   suspended    → DearMe paused this channel (rate-limit, ToS warning, etc)
 */
export const CHANNEL_CONNECTION_STATUSES = [
  "pending",
  "active",
  "needs_reauth",
  "revoked",
  "suspended",
] as const;
export type ChannelConnectionStatus =
  (typeof CHANNEL_CONNECTION_STATUSES)[number];

export const channelConnections = pgTable(
  "channel_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Tenant scope — channel rows are per-company. */
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** The human who owns the OAuth grant. Personal-brand product = always 1:1. */
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** See CHANNEL_CONNECTION_CHANNELS. */
    channel: text("channel").notNull(),
    /**
     * Channel-specific external account id (e.g. X user id, LinkedIn URN).
     * Used to detect if the user re-connected a different account.
     */
    externalAccountId: text("external_account_id"),
    /** Display handle ("@peterc", "Peter Chen", "peter@dearme.app"). */
    externalDisplayName: text("external_display_name"),
    /**
     * Encrypted OAuth credential blob. Encrypted at-rest with the per-tenant
     * key from `company_secrets`. Runtime services decrypt right before the
     * outbound call and never persist the plaintext.
     *
     * Shape varies per channel (access_token, refresh_token, expiry, scope,
     * provider-specific extras). The wire schema is owned by the outbound
     * tool that consumes it (see `dearme-openclaw/src/tools/types.ts`).
     */
    encryptedCredential: text("encrypted_credential").notNull(),
    /** OAuth scope granted (denormalized for fast policy checks). */
    scopes: jsonb("scopes").$type<readonly string[]>(),
    /** Tokens expire at (UTC). NULL = no known expiry. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    /** Last time this connection was used to deliver a work product. */
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Last time we successfully refreshed the access token. */
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    /** Last error string (truncated) if status went needs_reauth/suspended. */
    lastError: text("last_error"),
    /** Free-form metadata: provider id, app id used, etc. */
    metadata: jsonb("metadata").$type<{
      providerAppId?: string;
      providerProfileUrl?: string;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /**
     * Each (company, user, channel, externalAccountId) is unique. A user
     * can connect their personal X and a brand X; differentiated by
     * externalAccountId.
     */
    companyUserChannelExternalIdx: uniqueIndex(
      "channel_connections_company_user_channel_external_idx",
    ).on(table.companyId, table.userId, table.channel, table.externalAccountId),
    companyChannelStatusIdx: index(
      "channel_connections_company_channel_status_idx",
    ).on(table.companyId, table.channel, table.status),
    expiresAtIdx: index("channel_connections_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);

export type ChannelConnection = typeof channelConnections.$inferSelect;
export type NewChannelConnection = typeof channelConnections.$inferInsert;
