import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { execute as openClawGatewayExecute } from "@paperclipai/adapter-openclaw-gateway/server";
import {
  DEARME_OUTBOUND_TOOL_BINDINGS,
  type DearMeOutboundToolName,
} from "@paperclipai/dearme-openclaw";
import type {
  ChannelDispatch,
  DearMeOutboundDispatchContext,
} from "./dearme-outbound-tool-wrapper.js";

export interface DearMeOpenClawGatewayDispatchConfig {
  url: string | null;
  headers?: Record<string, string> | null;
  paperclipApiUrl?: string | null;
  waitTimeoutMs?: number | null;
  sessionKeyStrategy?: "fixed" | "issue" | "run" | null;
  sessionKey?: string | null;
  disableDeviceAuth?: boolean | null;
  devicePrivateKeyPem?: string | null;
  deviceToken?: string | null;
}

export interface DearMeOpenClawGatewayDispatchError {
  code:
    | "dearme_openclaw_gateway_dispatch_missing_config"
    | "dearme_openclaw_gateway_dispatch_invalid_config"
    | "dearme_openclaw_gateway_dispatch_execution_failed";
  message: string;
}

type OpenClawGatewayExecute = typeof openClawGatewayExecute;

export interface DearMeOpenClawGatewayDispatchDeps {
  execute?: OpenClawGatewayExecute;
}

function formatDispatchError(error: DearMeOpenClawGatewayDispatchError): string {
  return `${error.code}:${error.message}`;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildDispatchError(
  code: DearMeOpenClawGatewayDispatchError["code"],
  message: string,
): DearMeOpenClawGatewayDispatchError {
  return { code, message };
}

function normalizeConfig(
  config: DearMeOpenClawGatewayDispatchConfig | null | undefined,
): { ok: true; value: Required<Pick<DearMeOpenClawGatewayDispatchConfig, "url">> & DearMeOpenClawGatewayDispatchConfig } | { ok: false; error: DearMeOpenClawGatewayDispatchError } {
  const url = nonEmpty(config?.url);
  if (!url) {
    return {
      ok: false,
      error: buildDispatchError(
        "dearme_openclaw_gateway_dispatch_missing_config",
        "OpenClaw gateway dispatch is not configured.",
      ),
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      ok: false,
      error: buildDispatchError(
        "dearme_openclaw_gateway_dispatch_invalid_config",
        "OpenClaw gateway dispatch URL is invalid.",
      ),
    };
  }

  if (parsedUrl.protocol !== "ws:" && parsedUrl.protocol !== "wss:") {
    return {
      ok: false,
      error: buildDispatchError(
        "dearme_openclaw_gateway_dispatch_invalid_config",
        "OpenClaw gateway dispatch URL must use ws:// or wss://.",
      ),
    };
  }

  const headers = config?.headers ?? {};
  const gatewayToken =
    nonEmpty(headers["x-openclaw-token"]) ?? nonEmpty(headers["x-openclaw-auth"]) ?? nonEmpty(headers.authorization);
  if (!gatewayToken) {
    return {
      ok: false,
      error: buildDispatchError(
        "dearme_openclaw_gateway_dispatch_missing_config",
        "OpenClaw gateway dispatch credentials are not configured.",
      ),
    };
  }

  return {
    ok: true,
    value: {
      ...config,
      url: parsedUrl.toString(),
      headers: {
        ...headers,
        "x-openclaw-token": nonEmpty(headers["x-openclaw-token"]) ?? gatewayToken,
      },
    },
  };
}

function buildGatewayAdapterContext(input: {
  toolName: DearMeOutboundToolName;
  encryptedCredential: string;
  payload: unknown;
  dispatchContext: DearMeOutboundDispatchContext;
  config: Required<Pick<DearMeOpenClawGatewayDispatchConfig, "url">> & DearMeOpenClawGatewayDispatchConfig;
}): AdapterExecutionContext {
  const { dispatchContext } = input;
  const toolBinding = DEARME_OUTBOUND_TOOL_BINDINGS[input.toolName];
  return {
    runId: dispatchContext.openclawRunId,
    agent: {
      id: dispatchContext.agentId ?? `dearme:${dispatchContext.userId}`,
      companyId: dispatchContext.companyId,
      name: `DearMe ${toolBinding.channel} gateway dispatch`,
      adapterType: "openclaw_gateway",
      adapterConfig: {},
    },
    runtime: {
      sessionId: dispatchContext.openclawSessionId ?? null,
      sessionParams: null,
      sessionDisplayId: dispatchContext.openclawSessionId ?? null,
      taskKey: dispatchContext.issueId,
    },
    config: {
      url: input.config.url,
      headers: input.config.headers ?? {},
      paperclipApiUrl: input.config.paperclipApiUrl ?? null,
      waitTimeoutMs: input.config.waitTimeoutMs ?? null,
      sessionKeyStrategy: input.config.sessionKeyStrategy ?? "issue",
      sessionKey: input.config.sessionKey ?? null,
      disableDeviceAuth: input.config.disableDeviceAuth ?? null,
      devicePrivateKeyPem: input.config.devicePrivateKeyPem ?? null,
      deviceToken: input.config.deviceToken ?? null,
      payloadTemplate: {
        paperclip: {
          dearme: {
            toolName: input.toolName,
            channel: dispatchContext.channel,
            companyId: dispatchContext.companyId,
            userId: dispatchContext.userId,
            issueId: dispatchContext.issueId,
            openclawRunId: dispatchContext.openclawRunId,
            openclawSessionId: dispatchContext.openclawSessionId ?? null,
            agentId: dispatchContext.agentId ?? null,
            approvalId: dispatchContext.approvalId ?? null,
            idempotencyKey: dispatchContext.idempotencyKey,
            originalOutboundPayload: dispatchContext.originalPayload,
          },
        },
      },
    },
    context: {
      companyId: dispatchContext.companyId,
      issueId: dispatchContext.issueId,
      taskId: dispatchContext.issueId,
      approvalId: dispatchContext.approvalId ?? null,
      approvalStatus: dispatchContext.approvalId ? "approved" : null,
      wakeReason: "dearme_next_move_approved",
      issueIds: [dispatchContext.issueId],
      paperclipWake: {
        toolName: input.toolName,
        channel: dispatchContext.channel,
        companyId: dispatchContext.companyId,
        userId: dispatchContext.userId,
        issueId: dispatchContext.issueId,
        openclawRunId: dispatchContext.openclawRunId,
        openclawSessionId: dispatchContext.openclawSessionId ?? null,
        agentId: dispatchContext.agentId ?? null,
        approvalId: dispatchContext.approvalId ?? null,
        idempotencyKey: dispatchContext.idempotencyKey,
        originalOutboundPayload: dispatchContext.originalPayload,
      },
    },
    onLog: async () => {},
  };
}

type ChannelDispatchResult = Awaited<ReturnType<ChannelDispatch>>;

function mapGatewayResult(
  result: AdapterExecutionResult,
  input: {
    dispatchContext: DearMeOutboundDispatchContext;
  },
): ChannelDispatchResult {
  if (result.exitCode === 0 && !result.errorCode) {
    return {
      kind: "delivered",
      externalId: result.sessionId ?? input.dispatchContext.openclawRunId,
      externalUrl: result.sessionDisplayId ?? undefined,
      paid: Boolean(result.costUsd && result.costUsd > 0),
      paidUsd: typeof result.costUsd === "number" && result.costUsd > 0 ? result.costUsd : undefined,
    };
  }

  const error = result.errorCode ?? result.errorMessage ?? "openclaw_gateway_dispatch_failed";
  return {
    kind: "errored",
    error: formatDispatchError(
      buildDispatchError(
        "dearme_openclaw_gateway_dispatch_execution_failed",
        error,
      ),
    ),
  };
}

function buildToolDispatch(
  toolName: DearMeOutboundToolName,
  config: DearMeOpenClawGatewayDispatchConfig | null | undefined,
  deps: DearMeOpenClawGatewayDispatchDeps,
): ChannelDispatch {
  const execute = deps.execute ?? openClawGatewayExecute;
  return async (input) => {
    const normalized = normalizeConfig(config);
    if (!normalized.ok) {
      return {
        kind: "errored",
        error: formatDispatchError(normalized.error),
      };
    }

    if (input.toolName !== toolName) {
      return {
        kind: "errored",
        error: formatDispatchError(
          buildDispatchError(
            "dearme_openclaw_gateway_dispatch_invalid_config",
            `Dispatch binding mismatch for ${input.toolName}.`,
          ),
        ),
      };
    }

    const execution = await execute(
      buildGatewayAdapterContext({
        ...input,
        config: normalized.value,
      }),
    );

    return mapGatewayResult(execution, { dispatchContext: input.dispatchContext });
  };
}

export function createDearMeOpenClawGatewayDispatchMap(
  config: DearMeOpenClawGatewayDispatchConfig | null | undefined,
  deps: DearMeOpenClawGatewayDispatchDeps = {},
): Partial<Record<DearMeOutboundToolName, ChannelDispatch>> {
  return Object.fromEntries(
    Object.keys(DEARME_OUTBOUND_TOOL_BINDINGS).map((toolName) => [
      toolName,
      buildToolDispatch(toolName as DearMeOutboundToolName, config, deps),
    ]),
  ) as Partial<Record<DearMeOutboundToolName, ChannelDispatch>>;
}
