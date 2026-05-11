import type { DearMeProxyUsageLike } from "@paperclipai/dearme-ai-proxy";
import type {
  DearMeProxyExecutionResult,
  DearMeProxyRoutesOptions,
} from "../routes/dearme-ai-proxy.js";

interface TextProxyInput {
  messages: ReadonlyArray<{ role: string; content?: unknown }>;
  task?: string;
  subscriptionId?: string;
}

type DearMeTextExecutorMode = "fixture";

export interface DearMeTextExecutorConfig {
  mode: DearMeTextExecutorMode;
  content?: string;
  fail?: boolean;
  usage?: DearMeProxyUsageLike;
  blendedUsdMicros?: number;
}

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

function createFixtureTextExecutor(config: DearMeTextExecutorConfig) {
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

export function resolveDearMeAiProxyExecutorConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeAiProxyExecutorConfig | null {
  if (env.DEARME_AI_PROXY_EXECUTOR?.trim().toLowerCase() !== "fixture") {
    return null;
  }

  return {
    openAiChat: fixtureConfigFromEnv(env, "OPENAI"),
    anthropicMessages: fixtureConfigFromEnv(env, "ANTHROPIC"),
  };
}

export function createDearMeAiProxyRouteOptions(
  config: DearMeAiProxyExecutorConfig | null = resolveDearMeAiProxyExecutorConfigFromEnv(),
): DearMeProxyRoutesOptions {
  if (!config) return {};

  return {
    executeOpenAiChat: config.openAiChat
      ? createFixtureTextExecutor(config.openAiChat)
      : undefined,
    executeAnthropicMessages: config.anthropicMessages
      ? createFixtureTextExecutor(config.anthropicMessages)
      : undefined,
  };
}
