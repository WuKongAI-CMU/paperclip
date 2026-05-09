import type {
  Approval,
  DearMeBrandBlueprint,
  DearMeBrandBlueprintApplyRequest,
  DearMeBrandBlueprintExecutionPlan,
  DearMeBrandBlueprintPreview,
  DearMeBrandBlueprintSummary,
  DearMeFirstCyclePreview,
  DearMeFirstCyclePreviewResponse,
  DearMeMemoryUpdate,
  DearMeMemoryUpdateResult,
  DearMeOutputsResponse,
  DearMeOutputReviewRequest,
  DearMeOutputReviewResult,
  DearMePaidBetaRecord,
  DearMePaidBetaStatus,
  DearMeVoiceGateResult,
  DearMeWorkbenchResponse,
} from "@paperclipai/shared";
import { api } from "./client";

export interface DearMeBrandBlueprintPreviewResult {
  companyId: string;
  status: "preview";
  blueprint: DearMeBrandBlueprint;
  summary: DearMeBrandBlueprintSummary;
  executionPlan: DearMeBrandBlueprintExecutionPlan;
  voiceGate: DearMeVoiceGateResult;
  warnings: string[];
}

export interface DearMeBrandBlueprintApplyRequestResult
  extends Omit<DearMeBrandBlueprintPreviewResult, "status"> {
  status: "apply_request";
  approval: Approval;
}

export interface DearMePaidBetaRecordResult {
  event: {
    id: string;
    amountCents: number;
    currency: string;
  };
  access: DearMePaidBetaStatus;
}

export const dearmeApi = {
  getWorkbench: (companyId: string) =>
    api.get<DearMeWorkbenchResponse>(`/dearme/companies/${companyId}/workbench`),
  getOutputs: (companyId: string) =>
    api.get<DearMeOutputsResponse>(`/dearme/companies/${companyId}/outputs`),
  reviewOutput: (companyId: string, outputId: string, data: DearMeOutputReviewRequest) =>
    api.post<DearMeOutputReviewResult>(
      `/dearme/companies/${companyId}/outputs/${encodeURIComponent(outputId)}/reviews`,
      data,
    ),
  recordMemoryUpdate: (companyId: string, data: DearMeMemoryUpdate) =>
    api.post<DearMeMemoryUpdateResult>(
      `/dearme/companies/${companyId}/memory-updates`,
      data,
    ),
  getPaidBetaAccess: (companyId: string) =>
    api.get<DearMePaidBetaStatus>(`/dearme/companies/${companyId}/paid-beta/access`),
  previewFirstCycle: (companyId: string, data: DearMeFirstCyclePreview) =>
    api.post<DearMeFirstCyclePreviewResponse>(
      `/dearme/companies/${companyId}/first-cycle/preview`,
      data,
    ),
  recordPaidBetaPayment: (companyId: string, data: DearMePaidBetaRecord) =>
    api.post<DearMePaidBetaRecordResult>(
      `/dearme/companies/${companyId}/paid-beta/access-events`,
      data,
    ),
  previewBrandBlueprint: (companyId: string, data: DearMeBrandBlueprintPreview) =>
    api.post<DearMeBrandBlueprintPreviewResult>(
      `/dearme/companies/${companyId}/brand-blueprints/preview`,
      data,
    ),
  createBrandBlueprintApplyRequest: (
    companyId: string,
    data: DearMeBrandBlueprintApplyRequest,
  ) =>
    api.post<DearMeBrandBlueprintApplyRequestResult>(
      `/dearme/companies/${companyId}/brand-blueprints/apply-requests`,
      data,
    ),
};
