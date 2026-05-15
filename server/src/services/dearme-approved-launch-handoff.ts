import type { Db } from "@paperclipai/db";
import { approvals } from "@paperclipai/db";
import {
  VOICE_GATE_ARTIFACT_KINDS,
  type VoiceGateArtifactKind,
} from "@paperclipai/dearme-ai-proxy";
import {
  dearMeEmployeeHandoffPrimitiveForTool,
  type DearMeOutboundToolName,
} from "@paperclipai/dearme-openclaw";
import {
  dearMeOutboundToolWrapper,
  type CallOutboundInput,
  type CallOutboundOutcome,
  type ChannelDispatch,
} from "./dearme-outbound-tool-wrapper.js";
import {
  createDearMeOpenClawGatewayDispatchMap,
  type DearMeOpenClawGatewayDispatchConfig,
} from "./dearme-openclaw-gateway-dispatch.js";
import {
  createDearMeDeploySiteDispatch,
  type DearMeDeploySiteDispatchConfig,
} from "./dearme-deploy-site-dispatch.js";
import {
  createDearMeLinkedInDmDispatch,
  type DearMeLinkedInDmDispatchConfig,
} from "./dearme-linkedin-dm-dispatch.js";
import { dearMeLinkedInThrottleService } from "./dearme-linkedin-throttle.js";
import {
  createDearMeMetaCampaignDispatch,
  type DearMeMetaCampaignDispatchConfig,
} from "./dearme-meta-campaign-dispatch.js";
import { createDearMeSendEmailDispatch } from "./dearme-send-email-dispatch.js";
import { createDearMeXPostDispatch } from "./dearme-x-post-dispatch.js";
import { dearMeApprovalResolverService } from "./dearme-approval-resolver.js";
import { dearMeChannelConnectionsService } from "./dearme-channel-connections.js";
import {
  DEARME_NEXT_MOVE_APPROVAL_TYPE,
  hasDearMePauseIntent,
} from "./dearme-approval-receipts.js";
import { getDearMeSseBus } from "./dearme-sse-bus.js";
import {
  dearMeVoiceGateService,
  type DearMeVoiceProfileStore,
  type DearMeVoiceSemanticScorer,
} from "./dearme-voice-gate.js";
import { createDbDearMeVoiceProfileStore } from "./dearme-voice-profile-store.js";
import { dearMeWorkLoopService } from "./dearme-work-loop.js";

type ApprovalRecord = typeof approvals.$inferSelect;

const DEFAULT_APPROVAL_CONFIG = {
  minVoiceGateScore: 92,
  dailyUsdCap: 5,
};

const VOICE_GATE_KINDS = new Set<string>(VOICE_GATE_ARTIFACT_KINDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function voiceGateArtifactKind(value: string | null): VoiceGateArtifactKind | null {
  return value && VOICE_GATE_KINDS.has(value) ? value as VoiceGateArtifactKind : null;
}

function approvalConfig(record: Record<string, unknown> | null) {
  if (!record) return DEFAULT_APPROVAL_CONFIG;
  const minVoiceGateScore = numberField(record, "minVoiceGateScore");
  const dailyUsdCap = numberField(record, "dailyUsdCap");
  return {
    minVoiceGateScore:
      minVoiceGateScore !== null && minVoiceGateScore >= 0 && minVoiceGateScore <= 100
        ? minVoiceGateScore
        : DEFAULT_APPROVAL_CONFIG.minVoiceGateScore,
    dailyUsdCap:
      dailyUsdCap !== null && dailyUsdCap >= 0
        ? dailyUsdCap
        : DEFAULT_APPROVAL_CONFIG.dailyUsdCap,
  };
}

export function callOutboundInputFromApprovedNextMove(input: {
  approval: ApprovalRecord;
  actorUserId: string;
}): CallOutboundInput | null {
  const { approval, actorUserId } = input;
  if (approval.type !== DEARME_NEXT_MOVE_APPROVAL_TYPE || approval.status !== "approved") {
    return null;
  }
  if (hasDearMePauseIntent(approval.decisionNote)) {
    return null;
  }

  const approvalPayload = isRecord(approval.payload) ? approval.payload : null;
  const launchHandoff = approvalPayload ? recordField(approvalPayload, "launchHandoff") : null;
  if (!approvalPayload || !launchHandoff) return null;

  const toolName = stringField(launchHandoff, "toolName");
  const handoffPrimitive = dearMeEmployeeHandoffPrimitiveForTool(toolName);
  if (!handoffPrimitive) return null;

  const issueId = stringField(approvalPayload, "issueId") ?? stringField(launchHandoff, "issueId");
  const userId =
    actorUserId ||
    approval.decidedByUserId ||
    approval.requestedByUserId ||
    null;
  const payload = recordField(launchHandoff, "payload");
  if (!issueId || !userId || !payload) return null;

  const voiceGateRequired = launchHandoff.voiceGateRequired === true || handoffPrimitive.voiceGateRequired;
  const voiceGateText = voiceGateRequired ? stringField(launchHandoff, "voiceGateText") : null;
  const artifactKind = voiceGateRequired
    ? voiceGateArtifactKind(stringField(launchHandoff, "voiceGateArtifactKind"))
    : null;
  const voiceFingerprintId = voiceGateRequired
    ? stringField(launchHandoff, "voiceFingerprintId")
    : null;
  if (voiceGateRequired && (!voiceGateText || !artifactKind || !voiceFingerprintId)) {
    return null;
  }

  return {
    toolName: handoffPrimitive.toolName,
    companyId: approval.companyId,
    userId,
    issueId,
    openclawRunId:
      stringField(launchHandoff, "openclawRunId") ?? `dearme-next-move:${approval.id}`,
    openclawSessionId: stringField(launchHandoff, "openclawSessionId") ?? undefined,
    agentId: approval.requestedByAgentId ?? undefined,
    payload,
    voiceGateText,
    voiceGateArtifactKind: artifactKind,
    voiceFingerprintId,
    estimatedUsd: numberField(launchHandoff, "estimatedUsd") ?? 0,
    preapprovedApprovalId: approval.id,
    config: approvalConfig(recordField(launchHandoff, "config")),
  };
}

export type ApprovedLaunchHandoffOutcome =
  | { kind: "not_applicable" }
  | { kind: "called"; input: CallOutboundInput; outcome: CallOutboundOutcome };

export interface ApprovedLaunchHandoffService {
  executeApprovedNextMove(input: {
    approval: ApprovalRecord;
    actorUserId: string;
  }): Promise<ApprovedLaunchHandoffOutcome>;
}

export function dearMeApprovedLaunchHandoffService(deps: {
  callOutbound: (input: CallOutboundInput) => Promise<CallOutboundOutcome>;
}): ApprovedLaunchHandoffService {
  return {
    async executeApprovedNextMove(input) {
      const callInput = callOutboundInputFromApprovedNextMove(input);
      if (!callInput) return { kind: "not_applicable" };
      const outcome = await deps.callOutbound(callInput);
      return { kind: "called", input: callInput, outcome };
    },
  };
}

export function defaultDearMeApprovedLaunchHandoffService(
  db: Db,
  channelDispatch: Partial<Record<DearMeOutboundToolName, ChannelDispatch>> = {},
  dearMeOpenClawGatewayDispatchConfig: DearMeOpenClawGatewayDispatchConfig | null = null,
  dearMeLinkedInDmDispatchConfig: DearMeLinkedInDmDispatchConfig | null = null,
  dearMeMetaCampaignDispatchConfig: DearMeMetaCampaignDispatchConfig | null = null,
  dearMeDeploySiteDispatchConfig: DearMeDeploySiteDispatchConfig | null = null,
  options: {
    voiceProfileStore?: DearMeVoiceProfileStore;
    voiceSemanticScorer?: DearMeVoiceSemanticScorer | null;
  } = {},
): ApprovedLaunchHandoffService {
  const sseBus = getDearMeSseBus();
  const defaultGatewayDispatch = createDearMeOpenClawGatewayDispatchMap(
    dearMeOpenClawGatewayDispatchConfig,
  );
  const defaultDeploySiteDispatch = createDearMeDeploySiteDispatch(
    dearMeDeploySiteDispatchConfig ?? {},
  );
  const defaultLinkedInDmDispatch = dearMeLinkedInDmDispatchConfig?.messagesUrl
    ? createDearMeLinkedInDmDispatch({
        ...dearMeLinkedInDmDispatchConfig,
        throttle: dearMeLinkedInDmDispatchConfig.throttle ?? dearMeLinkedInThrottleService(db),
      })
    : null;
  const defaultMetaCampaignDispatch = createDearMeMetaCampaignDispatch(
    dearMeMetaCampaignDispatchConfig ?? {},
  );
  const defaultSendEmailDispatch = createDearMeSendEmailDispatch();
  const defaultXPostDispatch = createDearMeXPostDispatch();
  const voiceGate = dearMeVoiceGateService({
    profileStore: options.voiceProfileStore ?? createDbDearMeVoiceProfileStore(db),
    semanticScorer: options.voiceSemanticScorer ?? undefined,
  });
  const wrapper = dearMeOutboundToolWrapper({
    db,
    voiceGate,
    approvalResolver: dearMeApprovalResolverService(db, sseBus),
    channelConnections: dearMeChannelConnectionsService(db),
    workLoop: dearMeWorkLoopService(db, sseBus),
    sseBus,
    channelDispatch: {
      ...defaultGatewayDispatch,
      deploy_site: defaultDeploySiteDispatch,
      create_meta_campaign: defaultMetaCampaignDispatch,
      ...(defaultLinkedInDmDispatch ? { send_linkedin_dm: defaultLinkedInDmDispatch } : {}),
      post_x: defaultXPostDispatch,
      send_email: defaultSendEmailDispatch,
      ...channelDispatch,
    },
  });
  return dearMeApprovedLaunchHandoffService({
    callOutbound: wrapper.callOutbound,
  });
}
