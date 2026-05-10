/**
 * Drizzle service for `channel_connections` (DM-175).
 *
 * Every outbound tool calls into here to find an active OAuth grant for
 * the user × channel pair, mark it used after a successful delivery, or
 * mark it `needs_reauth` after a 401/403 from the channel API.
 *
 * Doctrine:
 *   - Per-user OAuth, never shared accounts. Lookup by (companyId, userId,
 *     channel) returns at most one active row.
 *   - The encrypted credential blob is opaque to this service; runtime
 *     decrypt happens in the channel-specific adapter.
 *   - This service never writes the blob in plaintext anywhere.
 */

import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { channelConnections } from "@paperclipai/db";
import type {
  ChannelConnection,
  ChannelConnectionChannel,
  ChannelConnectionStatus,
  NewChannelConnection,
} from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

export interface DearMeChannelConnectionsService {
  /**
   * Find the most recently used active connection for (company, user,
   * channel). Returns null if none, or if status != "active".
   */
  getActive(input: {
    companyId: string;
    userId: string;
    channel: ChannelConnectionChannel;
  }): Promise<ChannelConnection | null>;

  /** Stamp `lastUsedAt` after a successful delivery. */
  markUsed(connectionId: string): Promise<void>;

  /** Flip a connection to `needs_reauth` with a captured error string. */
  markNeedsReauth(input: {
    connectionId: string;
    error: string;
  }): Promise<void>;

  /**
   * Upsert path used by the OAuth callback after a fresh grant. Treats
   * (companyId, userId, channel, externalAccountId) as the key — if an
   * existing row matches and is `revoked`, it's promoted to `active`.
   */
  upsertActive(input: NewChannelConnection): Promise<ChannelConnection>;
}

export function dearMeChannelConnectionsService(
  db: Db,
): DearMeChannelConnectionsService {
  return {
    async getActive({ companyId, userId, channel }) {
      const rows = await db
        .select()
        .from(channelConnections)
        .where(
          and(
            eq(channelConnections.companyId, companyId),
            eq(channelConnections.userId, userId),
            eq(channelConnections.channel, channel),
            eq(channelConnections.status, "active" as ChannelConnectionStatus),
          ),
        )
        .orderBy(desc(channelConnections.lastUsedAt))
        .limit(1);
      return rows[0] ?? null;
    },

    async markUsed(connectionId) {
      await db
        .update(channelConnections)
        .set({ lastUsedAt: new Date(), updatedAt: new Date() })
        .where(eq(channelConnections.id, connectionId));
    },

    async markNeedsReauth({ connectionId, error }) {
      logger.warn(
        { connectionId, error },
        "dearme-channel-connections: marking connection as needs_reauth",
      );
      await db
        .update(channelConnections)
        .set({
          status: "needs_reauth" as ChannelConnectionStatus,
          lastError: error.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(channelConnections.id, connectionId));
    },

    async upsertActive(input) {
      const existing = await db
        .select()
        .from(channelConnections)
        .where(
          and(
            eq(channelConnections.companyId, input.companyId),
            eq(channelConnections.userId, input.userId),
            eq(channelConnections.channel, input.channel),
            input.externalAccountId
              ? eq(
                  channelConnections.externalAccountId,
                  input.externalAccountId,
                )
              : eq(channelConnections.externalAccountId, ""),
          ),
        )
        .limit(1);
      const prev = existing[0];
      if (prev) {
        const [updated] = await db
          .update(channelConnections)
          .set({
            ...input,
            status: "active" as ChannelConnectionStatus,
            updatedAt: new Date(),
          })
          .where(eq(channelConnections.id, prev.id))
          .returning();
        if (!updated) throw new Error("dearme-channel-connections: update did not return row");
        return updated;
      }
      const [inserted] = await db
        .insert(channelConnections)
        .values({ ...input, status: "active" as ChannelConnectionStatus })
        .returning();
      if (!inserted) throw new Error("dearme-channel-connections: insert did not return row");
      return inserted;
    },
  };
}
