import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  activityLog,
  authUsers,
  channelConnections,
  companies,
  companyMemberships,
  dearmeVoiceProfiles,
  financeEvents,
  opportunities,
  type Db,
} from "@paperclipai/db";

const REDACTED = "<redacted>";
const DELETED = "<deleted>";
const PAID_BETA_BILLER = "dearme_paid_beta";

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DearMeGdprExport = {
  company: Record<string, unknown> | null;
  users: Record<string, unknown>[];
  voiceProfiles: Record<string, unknown>[];
  voiceSamples: Record<string, unknown>[];
  paidBetaReceipts: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  channelConnections: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
};

export type DearMeGdprDeletionResult = {
  rowsAffected: {
    company: number;
    users: number;
    voiceProfiles: number;
    voiceSamples: number;
    opportunities: number;
    channelConnections: number;
    auditLog: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyLooksSecret(key: string) {
  return /token|secret|credential|password|authorization|api[_-]?key|client[_-]?secret|webhook[_-]?secret|signature/i
    .test(key);
}

function redactSecretString(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, REDACTED)
    .replace(/\bdm_sk_[A-Za-z0-9._-]+/g, REDACTED)
    .replace(/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9._-]+/g, REDACTED)
    .replace(/\bsk-proj-[A-Za-z0-9._-]+/g, REDACTED)
    .replace(/\bsk-ant-[A-Za-z0-9._-]+/g, REDACTED)
    .replace(/\bphc_[A-Za-z0-9._-]+/g, REDACTED)
    .replace(/\b(?:loops|resend|posthog|voyage|openai|anthropic|linkedin|stripe)[_-]?(?:key|token|secret)[=:][^\s"',}]+/gi, REDACTED);
}

function redactProviderSecrets(value: unknown, parentKey = ""): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return keyLooksSecret(parentKey) ? REDACTED : redactSecretString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactProviderSecrets(item));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        keyLooksSecret(key) ? REDACTED : redactProviderSecrets(item, key),
      ]),
    );
  }
  return String(value);
}

function redactDeletedDetails(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return DELETED;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactDeletedDetails(item));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeletedDetails(item)]),
    );
  }
  return DELETED;
}

function asExportRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => redactProviderSecrets(row) as Record<string, unknown>);
}

export function dearmeGdprService(db: Db) {
  async function getCompanyUserIds(companyId: string) {
    const memberships = await db
      .select({ principalType: companyMemberships.principalType, principalId: companyMemberships.principalId })
      .from(companyMemberships)
      .where(eq(companyMemberships.companyId, companyId));

    const connectionUsers = await db
      .select({ userId: channelConnections.userId })
      .from(channelConnections)
      .where(eq(channelConnections.companyId, companyId));

    const profileUsers = await db
      .select({ userId: dearmeVoiceProfiles.userId })
      .from(dearmeVoiceProfiles)
      .where(eq(dearmeVoiceProfiles.companyId, companyId));

    return Array.from(new Set([
      ...memberships
        .filter((membership) => membership.principalType === "user")
        .map((membership) => membership.principalId),
      ...connectionUsers.map((row) => row.userId),
      ...profileUsers.map((row) => row.userId).filter((userId): userId is string => Boolean(userId)),
    ]));
  }

  async function exportCompanyData(companyId: string): Promise<DearMeGdprExport> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const userIds = await getCompanyUserIds(companyId);
    const [
      users,
      voiceProfiles,
      voiceSamples,
      paidBetaReceipts,
      opportunityRows,
      connectionRows,
      auditRows,
    ] = await Promise.all([
      userIds.length > 0
        ? db.select().from(authUsers).where(inArray(authUsers.id, userIds))
        : Promise.resolve([]),
      db.select().from(dearmeVoiceProfiles).where(eq(dearmeVoiceProfiles.companyId, companyId)),
      db
        .select()
        .from(activityLog)
        .where(and(
          eq(activityLog.companyId, companyId),
          eq(activityLog.entityType, "dearme_memory"),
          sql`${activityLog.details}->>'kind' = 'voice_sample'`,
        ))
        .orderBy(desc(activityLog.createdAt)),
      db
        .select()
        .from(financeEvents)
        .where(and(
          eq(financeEvents.companyId, companyId),
          eq(financeEvents.biller, PAID_BETA_BILLER),
        ))
        .orderBy(desc(financeEvents.occurredAt), desc(financeEvents.createdAt)),
      db.select().from(opportunities).where(eq(opportunities.companyId, companyId)),
      db.select().from(channelConnections).where(eq(channelConnections.companyId, companyId)),
      db
        .select()
        .from(activityLog)
        .where(eq(activityLog.companyId, companyId))
        .orderBy(desc(activityLog.createdAt)),
    ]);

    return {
      company: company ? redactProviderSecrets(company) as Record<string, unknown> : null,
      users: asExportRows(users),
      voiceProfiles: asExportRows(voiceProfiles),
      voiceSamples: asExportRows(voiceSamples),
      paidBetaReceipts: asExportRows(paidBetaReceipts),
      opportunities: asExportRows(opportunityRows),
      channelConnections: asExportRows(connectionRows.map((connection) => ({
        ...connection,
        encryptedCredential: REDACTED,
      }))),
      auditLog: asExportRows(auditRows),
    };
  }

  async function deleteCompanyData(companyId: string): Promise<DearMeGdprDeletionResult> {
    const deletedAt = new Date();
    const deletedAtIso = deletedAt.toISOString();
    const userIds = await getCompanyUserIds(companyId);

    const [companyRows, userRows, voiceProfileRows, opportunityRows, connectionRows] = await Promise.all([
      db
        .update(companies)
        .set({
          name: DELETED,
          description: DELETED,
          status: "deleted",
          pauseReason: DELETED,
          brandColor: null,
          updatedAt: sql`case when ${companies.deletedAt} is null then ${deletedAtIso}::timestamptz else ${companies.updatedAt} end`,
          deletedAt: sql`coalesce(${companies.deletedAt}, ${deletedAtIso}::timestamptz)`,
        })
        .where(eq(companies.id, companyId))
        .returning({ id: companies.id }),
      userIds.length > 0
        ? db
          .update(authUsers)
          .set({
            name: DELETED,
            email: DELETED,
            image: null,
            updatedAt: sql`case when ${authUsers.deletedAt} is null then ${deletedAtIso}::timestamptz else ${authUsers.updatedAt} end`,
            deletedAt: sql`coalesce(${authUsers.deletedAt}, ${deletedAtIso}::timestamptz)`,
          })
          .where(inArray(authUsers.id, userIds))
          .returning({ id: authUsers.id })
        : Promise.resolve([]),
      db
        .update(dearmeVoiceProfiles)
        .set({
          fingerprintId: DELETED,
          acceptedSamples: 0,
          profileSnapshot: { acceptedSamples: 0, tokenCounts: {} },
          updatedAt: sql`case when ${dearmeVoiceProfiles.deletedAt} is null then ${deletedAtIso}::timestamptz else ${dearmeVoiceProfiles.updatedAt} end`,
          deletedAt: sql`coalesce(${dearmeVoiceProfiles.deletedAt}, ${deletedAtIso}::timestamptz)`,
        })
        .where(eq(dearmeVoiceProfiles.companyId, companyId))
        .returning({ id: dearmeVoiceProfiles.id }),
      db
        .update(opportunities)
        .set({
          title: DELETED,
          contactHandle: DELETED,
          contactEmail: DELETED,
          contactUrl: DELETED,
          fitReason: DELETED,
          notes: { deleted: DELETED } as never,
          signals: { deleted: DELETED },
          updatedAt: sql`case when ${opportunities.deletedAt} is null then ${deletedAtIso}::timestamptz else ${opportunities.updatedAt} end`,
          deletedAt: sql`coalesce(${opportunities.deletedAt}, ${deletedAtIso}::timestamptz)`,
        })
        .where(eq(opportunities.companyId, companyId))
        .returning({ id: opportunities.id }),
      db
        .update(channelConnections)
        .set({
          externalAccountId: DELETED,
          externalDisplayName: DELETED,
          encryptedCredential: DELETED,
          scopes: [],
          lastError: DELETED,
          metadata: { deleted: DELETED },
          updatedAt: sql`case when ${channelConnections.deletedAt} is null then ${deletedAtIso}::timestamptz else ${channelConnections.updatedAt} end`,
          deletedAt: sql`coalesce(${channelConnections.deletedAt}, ${deletedAtIso}::timestamptz)`,
        })
        .where(eq(channelConnections.companyId, companyId))
        .returning({ id: channelConnections.id }),
    ]);

    const auditRows = await db
      .select({ id: activityLog.id, details: activityLog.details })
      .from(activityLog)
      .where(eq(activityLog.companyId, companyId));

    for (const row of auditRows) {
      const existingDetails = isRecord(row.details) && row.details.gdprDeleted === true
        ? row.details
        : {
            gdprDeleted: true,
            gdprOriginalKind: isRecord(row.details) && row.details.kind === "voice_sample"
              ? "voice_sample"
              : null,
            originalDetails: redactDeletedDetails(row.details),
          };
      await db
        .update(activityLog)
        .set({
          actorId: DELETED,
          details: existingDetails,
        })
        .where(eq(activityLog.id, row.id));
    }

    const voiceSampleRows = auditRows.filter((row) => {
      const details = row.details;
      return isRecord(details) && (
        details.kind === "voice_sample" ||
        details.gdprOriginalKind === "voice_sample"
      );
    });

    return {
      rowsAffected: {
        company: companyRows.length,
        users: userRows.length,
        voiceProfiles: voiceProfileRows.length,
        voiceSamples: voiceSampleRows.length,
        opportunities: opportunityRows.length,
        channelConnections: connectionRows.length,
        auditLog: auditRows.length,
      },
    };
  }

  return {
    exportCompanyData,
    deleteCompanyData,
  };
}
