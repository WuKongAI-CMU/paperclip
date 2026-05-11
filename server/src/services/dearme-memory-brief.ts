import {
  dearMeCustomerSafeText,
  DEARME_MEMORY_UPDATE_KINDS,
  type DearMeOutputKind,
  type DearMeMemoryUpdateKind,
} from "@paperclipai/shared";

export const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
export const DEARME_MEMORY_ARCHIVED_ACTION = "dearme.memory_archived";
export const DEARME_MEMORY_ACTIONS = [DEARME_MEMORY_UPDATED_ACTION, DEARME_MEMORY_ARCHIVED_ACTION] as const;
export const LATEST_MEMORY_HEADING = "Latest saved Voice & Memory updates:";
export const OPERATING_BOUNDARY_HEADING = "Operating boundary:";

const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);

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

const GLOBAL_MEMORY_KIND_PRIORITY: readonly DearMeMemoryUpdateKind[] = [
  "voice_sample",
  "proof_point",
  "constraint",
  "goal",
  "audience",
  "offer",
  "review_feedback",
  "preference",
  "relationship",
];

const OUTPUT_MEMORY_KIND_PRIORITY: Record<DearMeOutputKind, readonly DearMeMemoryUpdateKind[]> = {
  brand_os: [
    "goal",
    "audience",
    "proof_point",
    "offer",
    "voice_sample",
    "constraint",
    "preference",
    "relationship",
    "review_feedback",
  ],
  voice_profile: [
    "voice_sample",
    "preference",
    "constraint",
    "review_feedback",
    "audience",
    "proof_point",
    "goal",
    "offer",
    "relationship",
  ],
  content_drafts: [
    "voice_sample",
    "proof_point",
    "audience",
    "offer",
    "constraint",
    "goal",
    "review_feedback",
    "preference",
    "relationship",
  ],
  opportunity_drafts: [
    "audience",
    "offer",
    "proof_point",
    "relationship",
    "voice_sample",
    "constraint",
    "goal",
    "preference",
    "review_feedback",
  ],
  portfolio_update: [
    "proof_point",
    "voice_sample",
    "goal",
    "offer",
    "audience",
    "constraint",
    "preference",
    "relationship",
    "review_feedback",
  ],
  weekly_report: [
    "goal",
    "proof_point",
    "offer",
    "audience",
    "voice_sample",
    "review_feedback",
    "constraint",
    "preference",
    "relationship",
  ],
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

function customerSafeMemoryText(value: string, maxLength = 320) {
  const memoryText = value.replace(/\bdocuments?\b/gi, "drafts");
  return dearMeCustomerSafeText(memoryText, "", maxLength);
}

function memoryKind(details: unknown) {
  if (!isRecord(details) || !isDearMeMemoryKind(details.kind)) return null;
  return details.kind;
}

function memoryKindPriority(kind: DearMeMemoryUpdateKind, outputKind: DearMeOutputKind | null | undefined) {
  const priority = outputKind ? OUTPUT_MEMORY_KIND_PRIORITY[outputKind] : GLOBAL_MEMORY_KIND_PRIORITY;
  const index = priority.indexOf(kind);
  return index === -1 ? priority.length : index;
}

function orderMemoryRowsForAssignment(
  memoryRows: Array<{ details: unknown }>,
  outputKind: DearMeOutputKind | null | undefined,
) {
  return memoryRows
    .map((row, index) => ({ row, index, kind: memoryKind(row.details) }))
    .sort((a, b) => {
      const leftPriority = a.kind ? memoryKindPriority(a.kind, outputKind) : Number.MAX_SAFE_INTEGER;
      const rightPriority = b.kind ? memoryKindPriority(b.kind, outputKind) : Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

function referenceLink(details: Record<string, unknown>) {
  const sourceLabel = optionalStringFromRecord(details, "sourceLabel");
  if (!sourceLabel) return null;

  try {
    const url = new URL(sourceLabel);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function displaySourceLabel(details: Record<string, unknown>) {
  const sourceLabel = optionalStringFromRecord(details, "sourceLabel");
  if (!sourceLabel) return null;

  try {
    const url = new URL(sourceLabel);
    return url.protocol === "http:" || url.protocol === "https:" ? sourceLabel : null;
  } catch {
    return sourceLabel;
  }
}

function memoryLine(details: unknown, options?: { includeReferenceLink?: boolean }) {
  if (!isRecord(details) || !isDearMeMemoryKind(details.kind)) return null;
  const body = optionalStringFromRecord(details, "body");
  if (!body) return null;

  const title = optionalStringFromRecord(details, "title");
  const sourceLabel = displaySourceLabel(details);
  const label = MEMORY_KIND_LABELS[details.kind];
  const titlePrefix = title ? `${customerSafeMemoryText(title, 120)}: ` : "";
  const sourceSuffix = sourceLabel ? ` Source: ${customerSafeMemoryText(sourceLabel, 120)}.` : "";
  const line = `- ${label}: ${titlePrefix}${customerSafeMemoryText(body)}${sourceSuffix}`;
  const link = options?.includeReferenceLink ? referenceLink(details) : null;
  return link ? `${line}\n  Reference link: ${link}` : line;
}

export function renderLatestMemoryBlock(memoryRows: Array<{ details: unknown }>) {
  const lines = memoryRows.map((row) => memoryLine(row.details)).filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return [LATEST_MEMORY_HEADING, ...lines].join("\n");
}

export function buildDearMeVoiceMemoryAssignmentBrief(
  memoryRows: Array<{ details: unknown }>,
  options?: { outputKind?: DearMeOutputKind | null },
) {
  const lines = orderMemoryRowsForAssignment(memoryRows, options?.outputKind)
    .map((row) => memoryLine(row.details, { includeReferenceLink: true }))
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;

  return [
    "DearMe Voice & Memory brief:",
    "- Use these active private sources before drafting or revising.",
    ...lines.slice(0, 8),
    "- Keep the next version private until the user reviews it.",
  ].join("\n");
}

export function buildDearMeVoiceMemoryEvidenceSummary(memoryRows: Array<{ details: unknown }>) {
  const lines = memoryRows
    .map((row) => memoryLine(row.details)?.replace(/^- /, "") ?? null)
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);
  if (lines.length === 0) return null;
  return compactText(lines.join("; "), 700);
}

export function selectActiveDearMeMemoryRows(
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

export function stripLatestMemoryBlock(description: string) {
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

export function injectLatestMemoryBlock(description: string | null, memoryBlock: string) {
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
