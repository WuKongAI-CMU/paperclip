import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog, issues, routines } from "@paperclipai/db";
import {
  DEARME_MEMORY_UPDATE_KINDS,
  type DearMeMemoryUpdateKind,
} from "@paperclipai/shared";
import { DEARME_BRAND_BLUEPRINT_ORIGIN_KIND } from "./dearme-brand-blueprint-apply.js";
import { routineService } from "./routines.js";

type RoutineActor = { agentId?: string | null; userId?: string | null; runId?: string | null };

const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const DEARME_MEMORY_ARCHIVED_ACTION = "dearme.memory_archived";
const DEARME_MEMORY_ACTIONS = [DEARME_MEMORY_UPDATED_ACTION, DEARME_MEMORY_ARCHIVED_ACTION] as const;
const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);
const LATEST_MEMORY_HEADING = "Latest saved Voice & Memory updates:";
const OPERATING_BOUNDARY_HEADING = "Operating boundary:";

const MEMORY_KIND_LABELS: Record<DearMeMemoryUpdateKind, string> = {
  voice_sample: "Voice sample",
  proof_point: "Proof point",
  goal: "Goal",
  audience: "Audience",
  offer: "Offer",
  constraint: "Boundary",
  relationship: "Relationship",
  preference: "Preference",
  review_feedback: "Review feedback",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDearMeMemoryKind(value: unknown): value is DearMeMemoryUpdateKind {
  return typeof value === "string" && MEMORY_KIND_SET.has(value);
}

function optionalStringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function compactText(value: string, maxLength = 320) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trimEnd()}...`;
}

function memoryLine(details: unknown) {
  if (!isRecord(details) || !isDearMeMemoryKind(details.kind)) return null;
  const body = optionalStringFromRecord(details, "body");
  if (!body) return null;

  const title = optionalStringFromRecord(details, "title");
  const sourceLabel = optionalStringFromRecord(details, "sourceLabel");
  const label = MEMORY_KIND_LABELS[details.kind];
  const titlePrefix = title ? `${title}: ` : "";
  const sourceSuffix = sourceLabel ? ` Source: ${sourceLabel}.` : "";
  return `- ${label}: ${titlePrefix}${compactText(body)}${sourceSuffix}`;
}

function renderLatestMemoryBlock(memoryRows: Array<{ details: unknown }>) {
  const lines = memoryRows.map((row) => memoryLine(row.details)).filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return [LATEST_MEMORY_HEADING, ...lines].join("\n");
}

function activeMemoryRows(
  rows: Array<{
    id: string;
    action: string;
    entityId: string | null;
    details: unknown;
  }>,
) {
  const retiredIds = new Set<string>();
  const seenIds = new Set<string>();
  const active: Array<{ details: unknown }> = [];

  for (const row of rows) {
    const memoryId = row.entityId || row.id;
    if (row.action === DEARME_MEMORY_ARCHIVED_ACTION) {
      retiredIds.add(memoryId);
      continue;
    }
    if (row.action !== DEARME_MEMORY_UPDATED_ACTION || retiredIds.has(memoryId) || seenIds.has(memoryId)) {
      continue;
    }

    seenIds.add(memoryId);
    active.push({ details: row.details });
    if (active.length >= 8) break;
  }

  return active;
}

function stripLatestMemoryBlock(description: string) {
  const headingIndex = description.indexOf(LATEST_MEMORY_HEADING);
  if (headingIndex < 0) return description;

  const prefix = description.slice(0, headingIndex).trimEnd();
  const afterHeading = description.slice(headingIndex);
  const doubleBoundaryIndex = afterHeading.indexOf(`\n\n${OPERATING_BOUNDARY_HEADING}`);
  const boundaryIndex = doubleBoundaryIndex >= 0
    ? doubleBoundaryIndex
    : afterHeading.indexOf(`\n${OPERATING_BOUNDARY_HEADING}`);
  if (boundaryIndex < 0) return prefix;

  return `${prefix}${afterHeading.slice(boundaryIndex)}`;
}

function injectLatestMemoryBlock(description: string | null, memoryBlock: string) {
  const base = stripLatestMemoryBlock(description ?? "").trimEnd();
  const boundaryMarker = `\n\n${OPERATING_BOUNDARY_HEADING}`;
  const boundaryIndex = base.indexOf(boundaryMarker);

  if (boundaryIndex < 0) {
    return `${base}\n\n${memoryBlock}`.trimStart();
  }

  return [
    base.slice(0, boundaryIndex).trimEnd(),
    "",
    memoryBlock,
    "",
    base.slice(boundaryIndex).trimStart(),
  ].join("\n");
}

function isConflict(error: unknown) {
  return isRecord(error) && error.status === 409;
}

export function dearmeMemoryContextService(db: Db) {
  const routinesSvc = routineService(db);

  async function loadLatestMemoryRows(companyId: string) {
    return db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityId: activityLog.entityId,
        details: activityLog.details,
      })
      .from(activityLog)
      .where(and(eq(activityLog.companyId, companyId), inArray(activityLog.action, [...DEARME_MEMORY_ACTIONS])))
      .orderBy(desc(activityLog.createdAt))
      .limit(80);
  }

  async function loadDearMeRoutines(companyId: string) {
    return db
      .select({
        id: routines.id,
        description: routines.description,
        latestRevisionId: routines.latestRevisionId,
      })
      .from(routines)
      .innerJoin(issues, eq(routines.parentIssueId, issues.id))
      .where(and(
        eq(routines.companyId, companyId),
        eq(issues.companyId, companyId),
        eq(issues.originKind, DEARME_BRAND_BLUEPRINT_ORIGIN_KIND),
      ));
  }

  return {
    async refreshRoutineMemoryContext(companyId: string, actor: RoutineActor = {}) {
      const memoryRows = activeMemoryRows(await loadLatestMemoryRows(companyId));
      const memoryBlock = renderLatestMemoryBlock(memoryRows);
      const routineRows = await loadDearMeRoutines(companyId);
      let updated = 0;
      let skipped = 0;

      for (const routine of routineRows) {
        const currentDescription = routine.description ?? "";
        const description = memoryBlock
          ? injectLatestMemoryBlock(routine.description, memoryBlock)
          : stripLatestMemoryBlock(currentDescription).trimEnd();
        if (description === currentDescription) {
          skipped += 1;
          continue;
        }

        try {
          const result = await routinesSvc.update(
            routine.id,
            {
              description,
              ...(routine.latestRevisionId ? { baseRevisionId: routine.latestRevisionId } : {}),
            },
            actor,
          );
          if (result) updated += 1;
        } catch (error) {
          if (!isConflict(error)) throw error;
          skipped += 1;
        }
      }

      return {
        memoryCount: memoryRows.length,
        routineCount: routineRows.length,
        updated,
        skipped,
      };
    },
  };
}
