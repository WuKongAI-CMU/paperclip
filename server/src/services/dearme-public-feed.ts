import { Buffer } from "node:buffer";
import { and, desc, eq, ilike, isNull, lt, not, or } from "drizzle-orm";
import {
  DEARME_PUBLIC_FEED_ITEM_KINDS,
  dearmePublicFeedItems,
  dearmePublicFeedOptin,
  type Db,
  type DearMePublicFeedItemKind,
} from "@paperclipai/db";
import { badRequest, conflict } from "../errors.js";

const FORBIDDEN_PUBLIC_FEED_TERMS = [
  "Paperclip",
  "OpenClaw",
  "Symphony",
  "Bedrock",
  "Claude",
  "GPT",
  "Voyage",
  "dm_sk_",
] as const;
const publicFeedKindSet = new Set<string>(DEARME_PUBLIC_FEED_ITEM_KINDS);
const DEFAULT_PUBLIC_FEED_LIMIT = 20;
const MAX_PUBLIC_FEED_LIMIT = 100;

export type DearMePublicFeedItemInput = {
  companyId: string;
  kind: DearMePublicFeedItemKind;
  summary: string;
  linkUrl: string;
  publishedAt: Date;
};

export type DearMePublicFeedPublicItem = {
  id: string;
  kind: DearMePublicFeedItemKind;
  summary: string;
  linkUrl: string;
  publishedAt: string;
};

export type DearMePublicFeedListResult = {
  items: DearMePublicFeedPublicItem[];
  nextCursor: string | null;
};

function clampPublicFeedLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return DEFAULT_PUBLIC_FEED_LIMIT;
  const integerLimit = Math.trunc(limit as number);
  if (integerLimit < 1) return DEFAULT_PUBLIC_FEED_LIMIT;
  return Math.min(integerLimit, MAX_PUBLIC_FEED_LIMIT);
}

function containsForbiddenPublicFeedTerm(value: string) {
  const normalized = value.toLowerCase();
  return FORBIDDEN_PUBLIC_FEED_TERMS.some((term) => normalized.includes(term.toLowerCase()));
}

function assertPublicSafeField(field: "summary" | "linkUrl", value: string) {
  if (containsForbiddenPublicFeedTerm(value)) {
    throw badRequest(`DearMe public feed ${field} contains non-public language.`);
  }
}

function encodeCursor(item: { id: string; publishedAt: string }) {
  return Buffer.from(JSON.stringify({ id: item.id, publishedAt: item.publishedAt }), "utf8")
    .toString("base64url");
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object"
      && parsed !== null
      && "id" in parsed
      && "publishedAt" in parsed
      && typeof parsed.id === "string"
      && typeof parsed.publishedAt === "string"
    ) {
      const publishedAt = new Date(parsed.publishedAt);
      if (!Number.isNaN(publishedAt.getTime())) {
        return { id: parsed.id, publishedAt };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function safeReadConditions() {
  return FORBIDDEN_PUBLIC_FEED_TERMS.flatMap((term) => [
    not(ilike(dearmePublicFeedItems.summary, `%${term}%`)),
    not(ilike(dearmePublicFeedItems.linkUrl, `%${term}%`)),
  ]);
}

export function dearMePublicFeedService(db: Db) {
  async function optIn(companyId: string) {
    const now = new Date();
    await db
      .insert(dearmePublicFeedOptin)
      .values({ companyId, enabledAt: now, disabledAt: null })
      .onConflictDoUpdate({
        target: dearmePublicFeedOptin.companyId,
        set: { enabledAt: now, disabledAt: null },
      });

    return { companyId, enabledAt: now.toISOString(), disabledAt: null };
  }

  async function optOut(companyId: string) {
    const now = new Date();
    await db
      .insert(dearmePublicFeedOptin)
      .values({ companyId, enabledAt: now, disabledAt: now })
      .onConflictDoUpdate({
        target: dearmePublicFeedOptin.companyId,
        set: { disabledAt: now },
      });

    return { companyId, disabledAt: now.toISOString() };
  }

  async function isOptedIn(companyId: string) {
    const [row] = await db
      .select({ companyId: dearmePublicFeedOptin.companyId })
      .from(dearmePublicFeedOptin)
      .where(and(
        eq(dearmePublicFeedOptin.companyId, companyId),
        isNull(dearmePublicFeedOptin.disabledAt),
      ))
      .limit(1);

    return Boolean(row);
  }

  async function recordItem(input: DearMePublicFeedItemInput) {
    if (!publicFeedKindSet.has(input.kind)) {
      throw badRequest("Invalid DearMe public feed item kind.");
    }
    const summary = input.summary.trim();
    const linkUrl = input.linkUrl.trim();
    if (!summary) throw badRequest("DearMe public feed summary is required.");
    if (!linkUrl) throw badRequest("DearMe public feed linkUrl is required.");
    assertPublicSafeField("summary", summary);
    assertPublicSafeField("linkUrl", linkUrl);

    if (!(await isOptedIn(input.companyId))) {
      throw conflict("DearMe public feed is not enabled for this company.");
    }

    const values = {
      companyId: input.companyId,
      kind: input.kind,
      summary,
      linkUrl,
      publishedAt: input.publishedAt,
    };
    const [inserted] = await db
      .insert(dearmePublicFeedItems)
      .values(values)
      .onConflictDoNothing({
        target: [
          dearmePublicFeedItems.companyId,
          dearmePublicFeedItems.kind,
          dearmePublicFeedItems.linkUrl,
        ],
      })
      .returning();

    if (inserted) return inserted;

    const [existing] = await db
      .select()
      .from(dearmePublicFeedItems)
      .where(and(
        eq(dearmePublicFeedItems.companyId, input.companyId),
        eq(dearmePublicFeedItems.kind, input.kind),
        eq(dearmePublicFeedItems.linkUrl, linkUrl),
      ))
      .limit(1);

    return existing;
  }

  async function listRecentItems(input: { limit?: number; cursor?: string } = {}): Promise<DearMePublicFeedListResult> {
    const limit = clampPublicFeedLimit(input.limit);
    const cursor = decodeCursor(input.cursor);
    const rows = await db
      .select({
        id: dearmePublicFeedItems.id,
        kind: dearmePublicFeedItems.kind,
        summary: dearmePublicFeedItems.summary,
        linkUrl: dearmePublicFeedItems.linkUrl,
        publishedAt: dearmePublicFeedItems.publishedAt,
      })
      .from(dearmePublicFeedItems)
      .innerJoin(
        dearmePublicFeedOptin,
        eq(dearmePublicFeedOptin.companyId, dearmePublicFeedItems.companyId),
      )
      .where(and(
        isNull(dearmePublicFeedOptin.disabledAt),
        ...(cursor
          ? [
              or(
                lt(dearmePublicFeedItems.publishedAt, cursor.publishedAt),
                and(
                  eq(dearmePublicFeedItems.publishedAt, cursor.publishedAt),
                  lt(dearmePublicFeedItems.id, cursor.id),
                ),
              ),
            ]
          : []),
        ...safeReadConditions(),
      ))
      .orderBy(desc(dearmePublicFeedItems.publishedAt), desc(dearmePublicFeedItems.id))
      .limit(limit + 1);

    const items = rows.slice(0, limit).map((row) => ({
      id: row.id,
      kind: row.kind,
      summary: row.summary,
      linkUrl: row.linkUrl,
      publishedAt: row.publishedAt.toISOString(),
    }));
    const hasMore = rows.length > limit;

    return {
      items,
      nextCursor: hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  return {
    optIn,
    optOut,
    isOptedIn,
    recordItem,
    listRecentItems,
  };
}
