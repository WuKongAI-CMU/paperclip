import { and, eq } from "drizzle-orm";
import {
  dearmeVoiceProfiles,
  type Db,
} from "@paperclipai/db";
import {
  normalizeDearMeVoiceProfileSnapshot,
  type DearMeVoiceCorpusProfileSnapshot,
  type DearMeVoiceProfileScope,
  type DearMeVoiceProfileStore,
} from "./dearme-voice-gate.js";

const COMPANY_FINGERPRINT_PREFIX = /^company:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?::|$)/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveDearMeVoiceProfileScope(
  fingerprintId: string,
  scope?: DearMeVoiceProfileScope,
) {
  const explicitCompanyId = typeof scope?.companyId === "string" && UUID_PATTERN.test(scope.companyId)
    ? scope.companyId
    : null;
  const companyFromFingerprint = fingerprintId.match(COMPANY_FINGERPRINT_PREFIX)?.[1] ?? null;
  const userId = typeof scope?.userId === "string" && scope.userId.trim().length > 0
    ? scope.userId.trim()
    : null;

  return {
    scopeKey: resolveDearMeVoiceProfileScopeKey({
      companyId: explicitCompanyId ?? companyFromFingerprint,
      userId,
    }),
    companyId: explicitCompanyId ?? companyFromFingerprint,
    userId,
  };
}

export function resolveDearMeVoiceProfileScopeKey(scope: {
  companyId: string | null;
  userId: string | null;
}) {
  if (scope.companyId && scope.userId) return `company:${scope.companyId}:user:${scope.userId}`;
  if (scope.companyId) return `company:${scope.companyId}`;
  if (scope.userId) return `user:${scope.userId}`;
  return "global";
}

export function dearMeVoiceProfileScopeAllowsRow(
  row: { scopeKey: string; companyId: string | null; userId: string | null },
  scope: { scopeKey: string; companyId: string | null; userId: string | null },
) {
  if (row.scopeKey !== scope.scopeKey) return false;
  if (row.companyId && row.companyId !== scope.companyId) return false;
  if (row.userId && row.userId !== scope.userId) return false;
  return true;
}

export function createDbDearMeVoiceProfileStore(db: Db): DearMeVoiceProfileStore {
  return {
    async readProfile(fingerprintId, scope) {
      const resolvedScope = resolveDearMeVoiceProfileScope(fingerprintId, scope);
      const [row] = await db
        .select({
          scopeKey: dearmeVoiceProfiles.scopeKey,
          companyId: dearmeVoiceProfiles.companyId,
          userId: dearmeVoiceProfiles.userId,
          profileSnapshot: dearmeVoiceProfiles.profileSnapshot,
        })
        .from(dearmeVoiceProfiles)
        .where(
          and(
            eq(dearmeVoiceProfiles.scopeKey, resolvedScope.scopeKey),
            eq(dearmeVoiceProfiles.fingerprintId, fingerprintId),
          ),
        )
        .limit(1);

      if (!row || !dearMeVoiceProfileScopeAllowsRow(row, resolvedScope)) return null;
      return normalizeDearMeVoiceProfileSnapshot(row.profileSnapshot);
    },

    async writeProfile(fingerprintId, profile, scope) {
      const resolvedScope = resolveDearMeVoiceProfileScope(fingerprintId, scope);
      const normalizedProfile: DearMeVoiceCorpusProfileSnapshot =
        normalizeDearMeVoiceProfileSnapshot(profile);
      const now = new Date();
      const values = {
        scopeKey: resolvedScope.scopeKey,
        fingerprintId,
        schemaVersion: 1,
        acceptedSamples: normalizedProfile.acceptedSamples,
        profileSnapshot: normalizedProfile,
        updatedAt: now,
        ...(resolvedScope.companyId ? { companyId: resolvedScope.companyId } : {}),
        ...(resolvedScope.userId ? { userId: resolvedScope.userId } : {}),
      };
      const set = {
        scopeKey: resolvedScope.scopeKey,
        schemaVersion: 1,
        acceptedSamples: normalizedProfile.acceptedSamples,
        profileSnapshot: normalizedProfile,
        updatedAt: now,
        ...(resolvedScope.companyId ? { companyId: resolvedScope.companyId } : {}),
        ...(resolvedScope.userId ? { userId: resolvedScope.userId } : {}),
      };

      await db
        .insert(dearmeVoiceProfiles)
        .values(values)
        .onConflictDoUpdate({
          target: [
            dearmeVoiceProfiles.scopeKey,
            dearmeVoiceProfiles.fingerprintId,
          ],
          set,
        });
    },
  };
}
