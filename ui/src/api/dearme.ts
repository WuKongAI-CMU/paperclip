import type {
  Approval,
  DearMeBrandBlueprint,
  DearMeBrandBlueprintApplyRequest,
  DearMeBrandBlueprintExecutionPlan,
  DearMeBrandBlueprintPreview,
  DearMeBrandBlueprintSummary,
  DearMeChiefOfStaffMessage,
  DearMeChiefOfStaffMessageResult,
  DearMeFirstCyclePreview,
  DearMeFirstCyclePreviewResponse,
  DearMeMemoryArchiveResult,
  DearMeMemoryUpdate,
  DearMeMemoryUpdateResult,
  DearMeOutputContinuationRequest,
  DearMeOutputsResponse,
  DearMeOutputReviewRequest,
  DearMeOutputReviewResult,
  DearMePaidBetaRecord,
  DearMePaidBetaStatus,
  DearMeVoiceGateResult,
  DearMeWorkbenchResponse,
} from "@paperclipai/shared";
import { api } from "./client";

export const dearmeWorkbenchRefreshEventTypes = [
  "work_loop_transition",
  "approval_pending",
  "approval_resolved",
  "voice_gate_scored",
  "channel_action_fired",
  "cost_recorded",
  "openclaw_lifecycle",
  "openclaw_stream",
  "agent_completed",
  "task_created",
  "task_updated",
] as const;

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
  openWorkbenchEvents: (companyId: string) =>
    new EventSource(`/api/dearme/companies/${encodeURIComponent(companyId)}/events`, {
      withCredentials: true,
    }),
  sendChiefOfStaffMessage: (companyId: string, data: DearMeChiefOfStaffMessage) =>
    api.post<DearMeChiefOfStaffMessageResult>(
      `/dearme/companies/${companyId}/chief-of-staff/messages`,
      data,
    ),
  getOutputs: (companyId: string) =>
    api.get<DearMeOutputsResponse>(`/dearme/companies/${companyId}/outputs`),
  reviewOutput: (companyId: string, outputId: string, data: DearMeOutputReviewRequest) =>
    api.post<DearMeOutputReviewResult>(
      `/dearme/companies/${companyId}/outputs/${encodeURIComponent(outputId)}/reviews`,
      data,
    ),
  continueOutput: (companyId: string, outputId: string, data: DearMeOutputContinuationRequest) =>
    api.post<DearMeOutputReviewResult>(
      `/dearme/companies/${companyId}/outputs/${encodeURIComponent(outputId)}/continue`,
      data,
    ),
  recordMemoryUpdate: (companyId: string, data: DearMeMemoryUpdate) =>
    api.post<DearMeMemoryUpdateResult>(
      `/dearme/companies/${companyId}/memory-updates`,
      data,
    ),
  updateMemorySource: (companyId: string, memoryId: string, data: DearMeMemoryUpdate) =>
    api.patch<DearMeMemoryUpdateResult>(
      `/dearme/companies/${companyId}/memory-updates/${encodeURIComponent(memoryId)}`,
      data,
    ),
  archiveMemorySource: (companyId: string, memoryId: string) =>
    api.delete<DearMeMemoryArchiveResult>(
      `/dearme/companies/${companyId}/memory-updates/${encodeURIComponent(memoryId)}`,
    ),
  getPaidBetaAccess: (companyId: string) =>
    api.get<DearMePaidBetaStatus>(`/dearme/companies/${companyId}/paid-beta/access`),
  previewFirstCycle: (companyId: string, data: DearMeFirstCyclePreview) =>
    api.post<DearMeFirstCyclePreviewResponse>(
      `/dearme/companies/${companyId}/first-cycle/preview`,
      data,
    ),
  startFirstCycle: (companyId: string, data: DearMeFirstCyclePreview) =>
    api.post<DearMeFirstCyclePreviewResponse>(
      `/dearme/companies/${companyId}/first-cycle/start`,
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
