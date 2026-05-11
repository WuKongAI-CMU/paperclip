import type { DearMeProxyUsageLike } from "@paperclipai/dearme-ai-proxy";
import type {
  DearMeProxyExecutionResult,
  DearMeProxyRoutesOptions,
} from "../routes/dearme-ai-proxy.js";

interface TextProxyInput {
  model: string;
  messages: ReadonlyArray<{ role: string; content?: unknown }>;
  routing: { model: string };
  task?: string;
  subscriptionId?: string;
  system?: unknown;
}

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

type FetchLike = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<FetchResponseLike>;

export interface DearMeFixtureTextExecutorConfig {
  mode: "fixture";
  content?: string;
  fail?: boolean;
  usage?: DearMeProxyUsageLike;
  blendedUsdMicros?: number;
}

export interface DearMeFetchTextExecutorConfig {
  mode: "fetch";
  endpoint?: string;
  apiKey?: string;
  fetch?: FetchLike;
  blendedUsdMicros?: number;
}

export type DearMeTextExecutorConfig =
  | DearMeFixtureTextExecutorConfig
  | DearMeFetchTextExecutorConfig;

export interface DearMeAiProxyExecutorConfig {
  openAiChat?: DearMeTextExecutorConfig | null;
  anthropicMessages?: DearMeTextExecutorConfig | null;
}

const DEFAULT_FIXTURE_USAGE = {
  input_tokens: 18,
  cache_creation_input_tokens: 4,
  cache_read_input_tokens: 12,
  output_tokens: 7,
} satisfies DearMeProxyUsageLike;

function truthy(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function textFromMessageContent(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null;
  if (!Array.isArray(content)) return null;

  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const text = (block as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) return text.trim();
  }

  return null;
}

function lastUserText(input: Pick<TextProxyInput, "messages">): string | null {
  for (const message of [...input.messages].reverse()) {
    if (message.role !== "user") continue;
    const text = textFromMessageContent(message.content);
    if (text) return text;
  }

  return null;
}

function createFixtureTextExecutor(config: DearMeFixtureTextExecutorConfig) {
  return async (input: TextProxyInput): Promise<DearMeProxyExecutionResult> => {
    if (config.fail) {
      throw new Error("DearMe proxy executor failed");
    }

    const requestedText = lastUserText(input);
    return {
      content:
        config.content ??
        `DearMe prepared: ${requestedText ?? input.task ?? input.subscriptionId ?? "request"}`,
      usage: config.usage ?? DEFAULT_FIXTURE_USAGE,
      blendedUsdMicros: config.blendedUsdMicros ?? 12_345,
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireUsage(value: unknown): DearMeProxyUsageLike {
  if (!isRecord(value)) {
    throw new Error("DearMe proxy provider returned malformed usage");
  }
  return value as DearMeProxyUsageLike;
}

function optionalUsdMicros(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.floor(value));
}

function providerRequestBody(input: TextProxyInput) {
  const raw = input as unknown as Record<string, unknown>;
  const {
    routing: _routing,
    correlationId: _correlationId,
    complexity: _complexity,
    tier: _tier,
    task: _task,
    subscriptionId: _subscriptionId,
    ...rest
  } = raw;

  return {
    ...rest,
    model: input.routing.model,
    messages: input.messages,
  };
}

function parseOpenAiChatPayload(payload: unknown): DearMeProxyExecutionResult {
  if (!isRecord(payload)) {
    throw new Error("DearMe proxy provider returned malformed OpenAI payload");
  }

  const firstChoice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const message = isRecord(firstChoice) && isRecord(firstChoice.message)
    ? firstChoice.message
    : null;
  const content = message?.content;
  if (typeof content !== "string") {
    throw new Error("DearMe proxy provider returned malformed OpenAI content");
  }

  return {
    content,
    usage: requireUsage(payload.usage),
    blendedUsdMicros: optionalUsdMicros(payload.blendedUsdMicros),
  };
}

function parseAnthropicMessagesPayload(payload: unknown): DearMeProxyExecutionResult {
  if (!isRecord(payload)) {
    throw new Error("DearMe proxy provider returned malformed Anthropic payload");
  }

  let content: string | undefined;
  if (typeof payload.content === "string") {
    content = payload.content;
  } else if (Array.isArray(payload.content)) {
    const textBlock = payload.content.find(
      (block): block is { text: string } =>
        isRecord(block) && typeof block.text === "string",
    );
    content = textBlock?.text;
  }

  if (typeof content !== "string") {
    throw new Error("DearMe proxy provider returned malformed Anthropic content");
  }

  return {
    content,
    usage: requireUsage(payload.usage),
    blendedUsdMicros: optionalUsdMicros(payload.blendedUsdMicros),
  };
}

function createFetchTextExecutor(
  protocol: "openai" | "anthropic",
  config: DearMeFetchTextExecutorConfig,
) {
  const endpoint = config.endpoint?.trim();
  const apiKey = config.apiKey?.trim();
  if (!endpoint || !apiKey) return undefined;

  return async (input: TextProxyInput): Promise<DearMeProxyExecutionResult> => {
    const fetchImpl =
      config.fetch ??
      (globalThis as typeof globalThis & { fetch?: FetchLike }).fetch;
    if (!fetchImpl) {
      throw new Error("DearMe proxy fetch transport is unavailable");
    }

    const headers: Record<string, string> =
      protocol === "openai"
        ? {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          }
        : {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          };
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(providerRequestBody(input)),
    });

    if (!response.ok) {
      const statusText = response.statusText ? ` ${response.statusText}` : "";
      throw new Error(`DearMe proxy provider request failed: ${response.status}${statusText}`);
    }

    const parsed =
      protocol === "openai"
        ? parseOpenAiChatPayload(await response.json())
        : parseAnthropicMessagesPayload(await response.json());

    return {
      ...parsed,
      blendedUsdMicros: config.blendedUsdMicros ?? parsed.blendedUsdMicros,
    };
  };
}

function createTextExecutor(
  protocol: "openai" | "anthropic",
  config: DearMeTextExecutorConfig,
) {
  if (config.mode === "fixture") {
    return createFixtureTextExecutor(config);
  }
  if (config.mode === "fetch") {
    return createFetchTextExecutor(protocol, config);
  }

  return undefined;
}

function fixtureConfigFromEnv(
  env: NodeJS.ProcessEnv,
  prefix: "OPENAI" | "ANTHROPIC",
): DearMeTextExecutorConfig {
  const content = env[`DEARME_AI_PROXY_${prefix}_FIXTURE_CONTENT`]?.trim();
  return {
    mode: "fixture",
    content: content || undefined,
    fail: truthy(env[`DEARME_AI_PROXY_${prefix}_FIXTURE_FAIL`]),
  };
}

function fetchConfigFromEnv(
  env: NodeJS.ProcessEnv,
  prefix: "OPENAI" | "ANTHROPIC",
): DearMeFetchTextExecutorConfig | null {
  const endpoint = env[`DEARME_AI_PROXY_${prefix}_ENDPOINT`]?.trim();
  const apiKey = env[`DEARME_AI_PROXY_${prefix}_API_KEY`]?.trim();
  if (!endpoint || !apiKey) return null;

  return {
    mode: "fetch",
    endpoint,
    apiKey,
  };
}

export function resolveDearMeAiProxyExecutorConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeAiProxyExecutorConfig | null {
  const mode = env.DEARME_AI_PROXY_EXECUTOR?.trim().toLowerCase();
  if (mode === "fixture") {
    return {
      openAiChat: fixtureConfigFromEnv(env, "OPENAI"),
      anthropicMessages: fixtureConfigFromEnv(env, "ANTHROPIC"),
    };
  }
  if (mode === "fetch") {
    return {
      openAiChat: fetchConfigFromEnv(env, "OPENAI"),
      anthropicMessages: fetchConfigFromEnv(env, "ANTHROPIC"),
    };
  }

  if (mode) {
    return null;
  }

  return null;
}

export function createDearMeAiProxyRouteOptions(
  config: DearMeAiProxyExecutorConfig | null = resolveDearMeAiProxyExecutorConfigFromEnv(),
): DearMeProxyRoutesOptions {
  if (!config) return {};

  return {
    executeOpenAiChat: config.openAiChat
      ? createTextExecutor("openai", config.openAiChat)
      : undefined,
    executeAnthropicMessages: config.anthropicMessages
      ? createTextExecutor("anthropic", config.anthropicMessages)
      : undefined,
  };
}
