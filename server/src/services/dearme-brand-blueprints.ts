import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { activityLog } from "@paperclipai/db";
import {
  DEARME_MEMORY_UPDATE_KINDS,
  buildDearMeBrandBlueprintExecutionPlan,
  collectDearMeBrandBlueprintWarnings,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  dearMeBrandBlueprintApplyPayloadSchema,
  dearMeFirstCyclePreviewSchema,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
  type DearMeBrandBlueprintApplyRequest,
  type DearMeBrandBlueprintPreview,
  type DearMeBrandBlueprintSeed,
  type DearMeFirstCyclePreview,
  type DearMeMemoryUpdateKind,
} from "@paperclipai/shared";
import { approvalService } from "./approvals.js";

export interface DearMeBrandBlueprintActor {
  actorType: "agent" | "user";
  actorId: string;
  agentId: string | null;
  runId?: string | null;
}

type FirstCycleMemorySeed = Pick<
  DearMeBrandBlueprintSeed,
  "audiences" | "constraints" | "goals" | "offers" | "proofPoints" | "voiceSamples"
>;

const DEARME_MEMORY_UPDATED_ACTION = "dearme.memory_updated";
const MEMORY_KIND_SET = new Set<string>(DEARME_MEMORY_UPDATE_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyFirstCycleMemorySeed(): FirstCycleMemorySeed {
  return {
    audiences: [],
    constraints: [],
    goals: [],
    offers: [],
    proofPoints: [],
    voiceSamples: [],
  };
}

function isDearMeMemoryKind(value: unknown): value is DearMeMemoryUpdateKind {
  return typeof value === "string" && MEMORY_KIND_SET.has(value);
}

function optionalStringFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function mergeUniqueText(existing: string[], additions: string[], maxItems: number) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const value of [...existing, ...additions]) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(normalized);
    if (values.length >= maxItems) break;
  }

  return values;
}

export function dearmeBrandBlueprintService(db: Db) {
  const approvals = approvalService(db);

  function firstCycleMemorySeedFromDetails(details: unknown): FirstCycleMemorySeed | null {
    if (!isRecord(details) || !isDearMeMemoryKind(details.kind)) return null;

    const body = optionalStringFromRecord(details, "body");
    if (!body) return null;

    const seed = emptyFirstCycleMemorySeed();

    switch (details.kind) {
      case "voice_sample":
        seed.voiceSamples.push(clampText(body, 4_000));
        break;
      case "proof_point":
        seed.proofPoints.push(clampText(body, 1_000));
        break;
      case "goal":
        seed.goals.push(clampText(body, 240));
        break;
      case "audience":
        seed.audiences.push(clampText(body, 240));
        break;
      case "offer":
        seed.offers.push(clampText(body, 240));
        break;
      case "constraint":
        seed.constraints.push(clampText(body, 500));
        break;
      case "relationship":
        seed.constraints.push(clampText(`Relationship context: ${body}`, 500));
        break;
      case "preference":
        seed.constraints.push(clampText(`Preference: ${body}`, 500));
        break;
    }

    return seed;
  }

  async function loadFirstCycleMemorySeed(companyId: string): Promise<FirstCycleMemorySeed> {
    const rows = await db
      .select({ details: activityLog.details })
      .from(activityLog)
      .where(and(eq(activityLog.companyId, companyId), eq(activityLog.action, DEARME_MEMORY_UPDATED_ACTION)))
      .orderBy(desc(activityLog.createdAt))
      .limit(32);

    return rows.reduce<FirstCycleMemorySeed>((accumulator, row) => {
      const seed = firstCycleMemorySeedFromDetails(row.details);
      if (!seed) return accumulator;

      accumulator.audiences.push(...seed.audiences);
      accumulator.constraints.push(...seed.constraints);
      accumulator.goals.push(...seed.goals);
      accumulator.offers.push(...seed.offers);
      accumulator.proofPoints.push(...seed.proofPoints);
      accumulator.voiceSamples.push(...seed.voiceSamples);

      return accumulator;
    }, emptyFirstCycleMemorySeed());
  }

  async function enrichFirstCycleWithMemory(
    companyId: string,
    input: DearMeFirstCyclePreview,
  ): Promise<DearMeFirstCyclePreview> {
    const parsed = dearMeFirstCyclePreviewSchema.parse(input);
    const memory = await loadFirstCycleMemorySeed(companyId);

    return {
      brand: {
        ...parsed.brand,
        audiences: mergeUniqueText(parsed.brand.audiences, memory.audiences, 8),
        constraints: mergeUniqueText(parsed.brand.constraints, memory.constraints, 10),
        goals: mergeUniqueText(parsed.brand.goals, memory.goals, 8),
        offers: mergeUniqueText(parsed.brand.offers, memory.offers, 8),
        proofPoints: mergeUniqueText(parsed.brand.proofPoints, memory.proofPoints, 16),
        voiceSamples: mergeUniqueText(parsed.brand.voiceSamples, memory.voiceSamples, 8),
      },
    };
  }

  function preview(companyId: string, input: DearMeBrandBlueprintPreview) {
    const blueprint = createDearMeBrandBlueprint(input.brand);
    const summary = summarizeDearMeBrandBlueprint(blueprint);
    const executionPlan = buildDearMeBrandBlueprintExecutionPlan(blueprint);
    const warnings = collectDearMeBrandBlueprintWarnings(blueprint);
    const voiceGate = evaluateDearMeVoiceGate({
      brand: input.brand,
      artifact: {
        kind: "brand_positioning",
        channel: blueprint.brand.preferredChannels[0] ?? null,
        title: "Brand OS positioning",
        text: blueprint.brand.positioning,
        ...(blueprint.brand.proofPoints[0] ? { proofUsed: blueprint.brand.proofPoints[0] } : {}),
      },
    });

    return {
      companyId,
      status: "preview" as const,
      blueprint,
      summary,
      executionPlan,
      voiceGate,
      warnings,
    };
  }

  async function previewFirstCycle(companyId: string, input: DearMeFirstCyclePreview) {
    const enrichedInput = await enrichFirstCycleWithMemory(companyId, input);
    return createDearMeFirstCyclePreview(companyId, enrichedInput);
  }

  async function createApplyRequest(
    companyId: string,
    input: DearMeBrandBlueprintApplyRequest,
    actor: DearMeBrandBlueprintActor,
  ) {
    const previewResult = preview(companyId, input);
    const payload = dearMeBrandBlueprintApplyPayloadSchema.parse({
      title: previewResult.summary.title,
      summary: previewResult.summary.summary,
      recommendedAction: previewResult.summary.recommendedAction,
      nextActionOnApproval: previewResult.summary.nextActionOnApproval,
      risks: [
        ...previewResult.warnings,
        ...previewResult.blueprint.gates.map((gate) => `${gate.label}: ${gate.reason}`),
      ],
      approvalNote: input.approvalNote ?? null,
      autoDraftEnabled: input.brand.autoDraftEnabled ?? true,
      brandBlueprint: previewResult.blueprint,
      executionPlan: previewResult.executionPlan,
    });

    const approval = await approvals.create(companyId, {
      type: "dearme_brand_blueprint_apply",
      requestedByAgentId: actor.agentId,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      status: "pending",
      payload,
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    return {
      ...previewResult,
      status: "apply_request" as const,
      approval,
    };
  }

  return {
    preview,
    previewFirstCycle,
    createApplyRequest,
  };
}
