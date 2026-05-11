import { describe, expect, it } from "vitest";
import {
  createDearMeAiProxyRouteOptions,
  resolveDearMeAiProxyExecutorConfigFromEnv,
} from "./dearme-ai-proxy-executors.js";

describe("dearme-ai-proxy-executors", () => {
  it("leaves the proxy unconfigured unless the fixture executor is explicitly enabled", () => {
    expect(resolveDearMeAiProxyExecutorConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(createDearMeAiProxyRouteOptions(null)).toEqual({});
  });

  it("resolves fixture executor config from the environment", () => {
    expect(
      resolveDearMeAiProxyExecutorConfigFromEnv({
        DEARME_AI_PROXY_EXECUTOR: "fixture",
        DEARME_AI_PROXY_OPENAI_FIXTURE_CONTENT: "Prepared OpenAI proof",
        DEARME_AI_PROXY_ANTHROPIC_FIXTURE_FAIL: "true",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      openAiChat: {
        mode: "fixture",
        content: "Prepared OpenAI proof",
        fail: false,
      },
      anthropicMessages: {
        mode: "fixture",
        content: undefined,
        fail: true,
      },
    });
  });

  it("creates OpenAI and Anthropic route executors without live provider credentials", async () => {
    const opts = createDearMeAiProxyRouteOptions({
      openAiChat: {
        mode: "fixture",
        usage: {
          input_tokens: 3,
          cache_read_input_tokens: 2,
          output_tokens: 1,
        },
        blendedUsdMicros: 10_000,
      },
      anthropicMessages: {
        mode: "fixture",
        content: "Configured Anthropic proof",
      },
    });

    await expect(
      opts.executeOpenAiChat?.({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Stay concise." },
          { role: "user", content: [{ type: "text", text: "Prepare the proof." }] },
        ],
        routing: { tier: "fast", model: "gpt-4o-mini", complexity: 2 },
        correlationId: "corr-service-openai-1",
      }),
    ).resolves.toEqual({
      content: "DearMe prepared: Prepare the proof.",
      usage: {
        input_tokens: 3,
        cache_read_input_tokens: 2,
        output_tokens: 1,
      },
      blendedUsdMicros: 10_000,
    });

    await expect(
      opts.executeAnthropicMessages?.({
        model: "claude-3-5-sonnet",
        subscriptionId: "subscription-proof",
        messages: [{ role: "user", content: "Prepare the proof." }],
        routing: { tier: "deep", model: "claude-3-5-sonnet", complexity: 8 },
        correlationId: "corr-service-anthropic-1",
      }),
    ).resolves.toMatchObject({
      content: "Configured Anthropic proof",
      blendedUsdMicros: 12_345,
    });
  });
});
