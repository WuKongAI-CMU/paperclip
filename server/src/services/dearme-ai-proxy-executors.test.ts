import { describe, expect, it, vi } from "vitest";
import {
  createDearMeAiProxyRouteOptions,
  resolveDearMeAiProxyExecutorConfigFromEnv,
} from "./dearme-ai-proxy-executors.js";

function jsonResponse(payload: unknown, status = 200, statusText = "OK") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn(async () => payload),
  };
}

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

  it("resolves fetch executor config from the environment only when endpoint and key are present", () => {
    expect(
      resolveDearMeAiProxyExecutorConfigFromEnv({
        DEARME_AI_PROXY_EXECUTOR: "fetch",
        DEARME_AI_PROXY_OPENAI_ENDPOINT: " https://llm.example/v1/chat/completions ",
        DEARME_AI_PROXY_OPENAI_API_KEY: " sk-openai ",
        DEARME_AI_PROXY_ANTHROPIC_ENDPOINT: "https://llm.example/v1/messages",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      openAiChat: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/chat/completions",
        apiKey: "sk-openai",
      },
      anthropicMessages: null,
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

  it("calls an OpenAI-compatible fetch transport and parses content plus usage", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "Fetched OpenAI proof" } }],
        usage: {
          prompt_tokens: 11,
          prompt_tokens_details: { cached_tokens: 4 },
          completion_tokens: 5,
        },
        blendedUsdMicros: 23_000,
      }),
    );
    const opts = createDearMeAiProxyRouteOptions({
      openAiChat: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/chat/completions",
        apiKey: "sk-openai",
        fetch,
      },
    });

    await expect(
      opts.executeOpenAiChat?.({
        model: "caller-model",
        task: "fetch-openai-proof",
        messages: [{ role: "user", content: "Prepare the proof." }],
        routing: { tier: "fast", model: "routed-openai-model", complexity: 2 },
        correlationId: "corr-fetch-openai-1",
      }),
    ).resolves.toEqual({
      content: "Fetched OpenAI proof",
      usage: {
        prompt_tokens: 11,
        prompt_tokens_details: { cached_tokens: 4 },
        completion_tokens: 5,
      },
      blendedUsdMicros: 23_000,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://llm.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          authorization: "Bearer sk-openai",
        }),
      }),
    );
    const [, requestInit] = fetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(requestInit.body)).toEqual({
      model: "routed-openai-model",
      messages: [{ role: "user", content: "Prepare the proof." }],
    });
  });

  it("calls an Anthropic-compatible fetch transport and parses text blocks plus usage", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "Fetched Anthropic proof" }],
        usage: {
          input_tokens: 7,
          cache_read_input_tokens: 3,
          output_tokens: 2,
        },
      }),
    );
    const opts = createDearMeAiProxyRouteOptions({
      anthropicMessages: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/messages",
        apiKey: "sk-anthropic",
        blendedUsdMicros: 31_000,
        fetch,
      },
    });

    await expect(
      opts.executeAnthropicMessages?.({
        model: "caller-model",
        subscriptionId: "fetch-anthropic-proof",
        system: [{ type: "text", text: "Stay concise." }],
        messages: [{ role: "user", content: "Prepare the proof." }],
        routing: { tier: "deep", model: "routed-anthropic-model", complexity: 8 },
        correlationId: "corr-fetch-anthropic-1",
      }),
    ).resolves.toEqual({
      content: "Fetched Anthropic proof",
      usage: {
        input_tokens: 7,
        cache_read_input_tokens: 3,
        output_tokens: 2,
      },
      blendedUsdMicros: 31_000,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://llm.example/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": "sk-anthropic",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );
    const [, requestInit] = fetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(requestInit.body)).toEqual({
      model: "routed-anthropic-model",
      system: [{ type: "text", text: "Stay concise." }],
      messages: [{ role: "user", content: "Prepare the proof." }],
    });
  });

  it("does not create a fetch executor when endpoint or key config is missing", () => {
    const fetch = vi.fn();
    const opts = createDearMeAiProxyRouteOptions({
      openAiChat: {
        mode: "fetch",
        endpoint: "",
        apiKey: "sk-openai",
        fetch,
      },
      anthropicMessages: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/messages",
        apiKey: "",
        fetch,
      },
    });

    expect(opts.executeOpenAiChat).toBeUndefined();
    expect(opts.executeAnthropicMessages).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when fetch transport returns non-2xx or malformed payloads", async () => {
    const failedFetch = vi.fn(async () => jsonResponse({ error: "down" }, 503, "Unavailable"));
    const malformedFetch = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "Missing usage" } }],
      }),
    );

    const failedOpts = createDearMeAiProxyRouteOptions({
      openAiChat: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/chat/completions",
        apiKey: "sk-openai",
        fetch: failedFetch,
      },
    });
    const malformedOpts = createDearMeAiProxyRouteOptions({
      openAiChat: {
        mode: "fetch",
        endpoint: "https://llm.example/v1/chat/completions",
        apiKey: "sk-openai",
        fetch: malformedFetch,
      },
    });
    const input = {
      model: "caller-model",
      messages: [{ role: "user", content: "Prepare the proof." }],
      routing: { tier: "fast" as const, model: "routed-openai-model", complexity: 2 },
      correlationId: "corr-fetch-failure-1",
    };

    await expect(failedOpts.executeOpenAiChat?.(input)).rejects.toThrow(
      "DearMe proxy provider request failed: 503 Unavailable",
    );
    await expect(malformedOpts.executeOpenAiChat?.(input)).rejects.toThrow(
      "DearMe proxy provider returned malformed usage",
    );
  });
});
