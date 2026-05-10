import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { costEvents } from "@paperclipai/db";
import {
  buildDearMeCostLedgerEvent,
  DM_PROXY_BASE_URL_DEFAULT,
  DM_PROXY_HEADERS,
  DEARME_PROXY_MODEL_ROUTING_TABLE,
  isDearMeApiKey,
  normalizeDearMeProxyUsage,
  resolveDearMeProxyModelRouting,
  type AnthropicMessagesRequestExtensions,
  type CostLedgerEvent,
  type OpenAiChatRequestExtensions,
  type DearMeProxyModelRoutingTier,
  type DearMeProxyUsageLike,
} from "@paperclipai/dearme-ai-proxy";
import { HttpError, unauthorized, unprocessable } from "../errors.js";
import { validate } from "../middleware/validate.js";

const DEARME_PROXY_BASE_PATH = new URL(DM_PROXY_BASE_URL_DEFAULT).pathname;
const DEARME_PROXY_PROVIDER = "dearme_proxy";
const DEARME_PROXY_BILLING_TYPE = "metered_api";
const PROXY_TIER_VALUES = [
  "fast",
  "balanced",
  "deep",
] as const;

const proxyMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.unknown().optional(),
}).passthrough();

const openAiChatRequestSchema = z.object({
  model: z.string().trim().min(1).max(256),
  messages: z.array(proxyMessageSchema).min(1),
  task: z.string().trim().min(1).max(256).optional(),
  complexity: z.number().optional(),
  tier: z.enum(PROXY_TIER_VALUES).optional(),
}).passthrough();

const anthropicMessagesRequestSchema = z.object({
  model: z.string().trim().min(1).max(256),
  messages: z.array(proxyMessageSchema).min(1),
  system: z.union([z.string(), z.array(z.unknown())]).optional(),
  subscriptionId: z.string().trim().min(1).max(256).optional(),
  complexity: z.number().optional(),
  tier: z.enum(PROXY_TIER_VALUES).optional(),
}).passthrough();

export interface DearMeProxyContext {
  companyId: string;
  agentId: string;
}

export interface DearMeProxyExecutionResult {
  content: string;
  usage: DearMeProxyUsageLike;
  blendedUsdMicros?: number;
}

export interface DearMeProxyRoutesOptions {
  now?: () => Date;
  correlationId?: () => string;
  resolveProxyContext?: (req: Request) => Promise<DearMeProxyContext> | DearMeProxyContext;
  executeOpenAiChat?: (
    input: OpenAiChatRequestExtensions & {
      model: string;
      messages: ReadonlyArray<{ role: string; content?: unknown }>;
      routing: { tier: DearMeProxyModelRoutingTier; model: string; complexity: number };
      correlationId: string;
    },
  ) => Promise<DearMeProxyExecutionResult>;
  executeAnthropicMessages?: (
    input: AnthropicMessagesRequestExtensions & {
      model: string;
      messages: ReadonlyArray<{ role: string; content?: unknown }>;
      routing: { tier: DearMeProxyModelRoutingTier; model: string; complexity: number };
      correlationId: string;
    },
  ) => Promise<DearMeProxyExecutionResult>;
  persistCostEvent?: (event: typeof costEvents.$inferInsert) => Promise<void>;
}

function bearerTokenFromAuthorizationHeader(rawHeader: string | undefined): string | null {
  if (!rawHeader) return null;
  const [scheme, token, extra] = rawHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token;
}

function requireDearMeApiKey(req: Request, _res: Response, next: NextFunction) {
  const token = bearerTokenFromAuthorizationHeader(req.get(DM_PROXY_HEADERS.authorization));
  if (!token || !isDearMeApiKey(token)) {
    throw unauthorized("DearMe API key required");
  }
  next();
}

function pickTier(input: { tier?: string | null; complexity?: number | null }): {
  tier: DearMeProxyModelRoutingTier;
  model: string;
  complexity: number;
} {
  const complexityRouting = resolveDearMeProxyModelRouting(
    typeof input.complexity === "number" ? input.complexity : 5,
  );
  if (input.tier === "fast" || input.tier === "balanced" || input.tier === "deep") {
    const row = DEARME_PROXY_MODEL_ROUTING_TABLE.find((entry) => entry.tier === input.tier);
    if (row) {
      return {
        tier: row.tier,
        model: row.model,
        complexity: complexityRouting.complexity,
      };
    }
  }

  return complexityRouting;
}

function resolveTaskBillingCode(
  request: OpenAiChatRequestExtensions | AnthropicMessagesRequestExtensions,
  protocolBillingCode?: string | null,
): string | null {
  const task = "task" in request ? request.task?.trim() : null;
  const subscriptionId = "subscriptionId" in request ? request.subscriptionId?.trim() : null;
  return protocolBillingCode?.trim() || task || subscriptionId || null;
}

function buildOpenAiResponse(input: {
  model: string;
  content: string;
  usage: DearMeProxyExecutionResult["usage"];
  correlationId: string;
  now: Date;
}) {
  const normalized = normalizeDearMeProxyUsage(input.usage);
  return {
    id: `chatcmpl_${input.correlationId}`,
    object: "chat.completion",
    created: Math.floor(input.now.getTime() / 1000),
    model: input.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: input.content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: normalized.totalInputTokens,
      completion_tokens: normalized.outputTokens,
      total_tokens: normalized.totalInputTokens + normalized.outputTokens,
    },
  };
}

function buildAnthropicResponse(input: {
  model: string;
  content: string;
  usage: DearMeProxyExecutionResult["usage"];
  correlationId: string;
  now: Date;
}) {
  const normalized = normalizeDearMeProxyUsage(input.usage);
  return {
    id: `msg_${input.correlationId}`,
    type: "message",
    role: "assistant",
    model: input.model,
    content: [{ type: "text", text: input.content }],
    stop_reason: "end_turn",
    usage: {
      input_tokens: normalized.totalInputTokens,
      output_tokens: normalized.outputTokens,
    },
  };
}

async function persistProxyCostEvent(
  db: Db,
  event: typeof costEvents.$inferInsert,
  persistCostEvent?: (event: typeof costEvents.$inferInsert) => Promise<void>,
) {
  if (persistCostEvent) {
    await persistCostEvent(event);
    return;
  }

  await db.insert(costEvents).values(event);
}

async function resolveProxyContext(
  req: Request,
  resolveProxyContextOverride?: DearMeProxyRoutesOptions["resolveProxyContext"],
): Promise<DearMeProxyContext> {
  if (resolveProxyContextOverride) {
    return resolveProxyContextOverride(req);
  }

  const companyIdHeader = req.get("X-DearMe-Company-ID")?.trim();
  const agentIdHeader = req.get("X-DearMe-Agent-ID")?.trim();
  const actor = req.actor;

  const companyId =
    (actor?.type === "agent" ? actor.companyId : null) ||
    (actor?.type === "board" ? actor.companyIds?.[0] ?? null : null) ||
    companyIdHeader ||
    null;
  const agentId =
    (actor?.type === "agent" ? actor.agentId ?? null : null) ||
    agentIdHeader ||
    null;

  if (!companyId || !agentId) {
    throw unprocessable("DearMe proxy company and agent context required");
  }

  return { companyId, agentId };
}

function routeCostEvent(input: {
  companyId: string;
  agentId: string;
  billingCode: string | null;
  protocol: "openai" | "anthropic";
  correlationId: string;
  tier: DearMeProxyModelRoutingTier;
  model: string;
  usage: DearMeProxyExecutionResult["usage"];
  blendedUsdMicros: number;
  now: Date;
}) {
  const ledgerEvent: CostLedgerEvent = buildDearMeCostLedgerEvent({
    correlationId: input.correlationId,
    occurredAt: input.now.toISOString(),
    companyId: input.companyId,
    task: input.billingCode ?? input.protocol,
    tier: input.tier,
    model: input.model,
    usage: input.usage,
    blendedUsdMicros: input.blendedUsdMicros,
  });

  return {
    companyId: input.companyId,
    agentId: input.agentId,
    billingCode: input.billingCode,
    provider: DEARME_PROXY_PROVIDER,
    biller: DEARME_PROXY_PROVIDER,
    billingType: DEARME_PROXY_BILLING_TYPE,
    model: input.model,
    inputTokens: ledgerEvent.inputTokens,
    cachedInputTokens: ledgerEvent.cacheReadTokens,
    outputTokens: ledgerEvent.outputTokens,
    costCents: Math.max(0, Math.round(ledgerEvent.blendedUsdMicros / 10_000)),
    occurredAt: input.now,
  } satisfies typeof costEvents.$inferInsert;
}

async function handleOpenAiChat(
  req: Request,
  res: Response,
  db: Db,
  opts: DearMeProxyRoutesOptions,
) {
  const body = openAiChatRequestSchema.parse(req.body) as OpenAiChatRequestExtensions & {
    model: string;
    messages: ReadonlyArray<{ role: string; content?: unknown }>;
  };
  const routing = pickTier({
    tier: req.get(DM_PROXY_HEADERS.modelTier)?.trim() || body.tier || null,
    complexity: body.complexity ?? null,
  });
  const correlationId = req.get(DM_PROXY_HEADERS.correlationId)?.trim() || opts.correlationId?.() || randomUUID();
  const now = opts.now?.() ?? new Date();
  const execute = opts.executeOpenAiChat;
  if (!execute) {
    throw new HttpError(503, "DearMe AI proxy executor is not configured");
  }
  const result = await execute({
    ...body,
    routing,
    correlationId,
  });
  const context = await resolveProxyContext(req, opts.resolveProxyContext);
  const billingCode = resolveTaskBillingCode(body, req.get(DM_PROXY_HEADERS.task));
  const costEvent = routeCostEvent({
    companyId: context.companyId,
    agentId: context.agentId,
    billingCode,
    protocol: "openai",
    correlationId,
    tier: routing.tier,
    model: routing.model,
    usage: result.usage,
    blendedUsdMicros: result.blendedUsdMicros ?? 0,
    now,
  });

  await persistProxyCostEvent(db, costEvent, opts.persistCostEvent);
  res.set(DM_PROXY_HEADERS.correlationId, correlationId);
  res.set(DM_PROXY_HEADERS.modelTier, routing.tier);
  res.json(
    buildOpenAiResponse({
      model: routing.model,
      content: result.content,
      usage: result.usage,
      correlationId,
      now,
    }),
  );
}

async function handleAnthropicMessages(
  req: Request,
  res: Response,
  db: Db,
  opts: DearMeProxyRoutesOptions,
) {
  const body = anthropicMessagesRequestSchema.parse(req.body) as AnthropicMessagesRequestExtensions & {
    model: string;
    messages: ReadonlyArray<{ role: string; content?: unknown }>;
  };
  const routing = pickTier({
    tier: req.get(DM_PROXY_HEADERS.modelTier)?.trim() || body.tier || null,
    complexity: body.complexity ?? null,
  });
  const correlationId = req.get(DM_PROXY_HEADERS.correlationId)?.trim() || opts.correlationId?.() || randomUUID();
  const now = opts.now?.() ?? new Date();
  const execute = opts.executeAnthropicMessages;
  if (!execute) {
    throw new HttpError(503, "DearMe AI proxy executor is not configured");
  }
  const result = await execute({
    ...body,
    routing,
    correlationId,
  });
  const context = await resolveProxyContext(req, opts.resolveProxyContext);
  const billingCode = resolveTaskBillingCode(body, req.get(DM_PROXY_HEADERS.subscriptionId));
  const costEvent = routeCostEvent({
    companyId: context.companyId,
    agentId: context.agentId,
    billingCode,
    protocol: "anthropic",
    correlationId,
    tier: routing.tier,
    model: routing.model,
    usage: result.usage,
    blendedUsdMicros: result.blendedUsdMicros ?? 0,
    now,
  });

  await persistProxyCostEvent(db, costEvent, opts.persistCostEvent);
  res.set(DM_PROXY_HEADERS.correlationId, correlationId);
  res.set(DM_PROXY_HEADERS.modelTier, routing.tier);
  res.json(
    buildAnthropicResponse({
      model: routing.model,
      content: result.content,
      usage: result.usage,
      correlationId,
      now,
    }),
  );
}

export function dearMeAiProxyRoutes(db: Db, opts: DearMeProxyRoutesOptions = {}) {
  const router = Router();

  router.post(
    "/v1/chat/completions",
    requireDearMeApiKey,
    validate(openAiChatRequestSchema),
    async (req, res) => {
      await handleOpenAiChat(req, res, db, opts);
    },
  );

  router.post(
    "/v1/messages",
    requireDearMeApiKey,
    validate(anthropicMessagesRequestSchema),
    async (req, res) => {
      await handleAnthropicMessages(req, res, db, opts);
    },
  );

  return router;
}

export { DEARME_PROXY_BASE_PATH };
