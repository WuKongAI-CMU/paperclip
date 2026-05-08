import type { Db } from "@paperclipai/db";
import {
  buildDearMeBrandBlueprintExecutionPlan,
  collectDearMeBrandBlueprintWarnings,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  dearMeBrandBlueprintApplyPayloadSchema,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
  type DearMeBrandBlueprintApplyRequest,
  type DearMeBrandBlueprintPreview,
  type DearMeFirstCyclePreview,
} from "@paperclipai/shared";
import { approvalService } from "./approvals.js";

export interface DearMeBrandBlueprintActor {
  actorType: "agent" | "user";
  actorId: string;
  agentId: string | null;
  runId?: string | null;
}

export function dearmeBrandBlueprintService(db: Db) {
  const approvals = approvalService(db);

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

  function previewFirstCycle(companyId: string, input: DearMeFirstCyclePreview) {
    return createDearMeFirstCyclePreview(companyId, input);
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
