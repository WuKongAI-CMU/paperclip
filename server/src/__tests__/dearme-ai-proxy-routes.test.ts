import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@paperclipai/db";
import { costEvents } from "@paperclipai/db";
import {
  DEARME_PROXY_BASE_PATH,
  dearMeAiProxyRoutes,
} from "../routes/dearme-ai-proxy.js";
import { errorHandler } from "../middleware/index.js";
import { createDearMeAiProxyRouteOptions } from "../services/dearme-ai-proxy-executors.js";
import {
  DEARME_PROXY_MODEL_ROUTING_TABLE,
  resolveDearMeProxyModelRouting,
} from "@paperclipai/dearme-ai-proxy";

function makeDb(keyRow: Record<string, unknown> | null = null) {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  const select = vi.fn(() => ({
    from() {
      return {
        where() {
          return Promise.resolve(keyRow ? [keyRow] : []);
        },
      };
    },
  }));
  return {
    db: { select, insert } as unknown as Db,
    insert,
    values,
  };
}

function createApp(
  opts: Parameters<typeof dearMeAiProxyRoutes>[1] = {},
  keyRow: Record<string, unknown> | null = {
    id: "key-1",
    agentId: "agent-1",
    companyId: "company-1",
  },
) {
  const { db, insert, values } = makeDb(keyRow);
  const app = express();
  app.use(express.json());
  app.use(DEARME_PROXY_BASE_PATH, dearMeAiProxyRoutes(db, opts));
  app.use(errorHandler);
  return { app, insert, values };
}

function jsonResponse(payload: unknown, status = 200, statusText = "OK") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn(async () => payload),
  };
}

const openAiFastModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "fast")?.model;
const balancedModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "balanced")?.model;
const deepModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "deep")?.model;

if (!openAiFastModel || !balancedModel || !deepModel) {
  throw new Error("Expected DearMe proxy routing tiers to exist");
}

describe("dearMeAiProxyRoutes", () => {
  it("rejects missing DearMe API key auth before body validation", async () => {
    const { app } = createApp(undefined, null);

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .send({ model: "gpt-4o-mini", messages: [] })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
  });

  it("rejects non-DearMe bearer tokens before proxy routing", async () => {
    const { app } = createApp(undefined, null);

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer pcp_test_token")
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
  });

  it("resolves a dm_sk_* bearer token to the authenticated company and agent while ignoring spoofed headers", async () => {
    const executeOpenAiChat = vi.fn(async (input: any) => {
      expect(input.routing).toEqual(resolveDearMeProxyModelRouting(2));
      return {
        content: "OpenAI-compatible proof",
        usage: {
          input_tokens: 10,
          cache_creation_input_tokens: 4,
          cache_read_input_tokens: 6,
          output_tokens: 7,
        },
        blendedUsdMicros: 123_456,
      };
    });

    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T12:00:00.000Z"),
        executeOpenAiChat,
      },
      {
        id: "dm-key-1",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Company-ID", "company-spoofed")
      .set("X-DearMe-Agent-ID", "agent-spoofed")
      .set("X-DearMe-Correlation-Id", "corr-openai-1")
      .send({
        model: "gpt-4o-mini",
        task: "first-run-proof",
        complexity: 2,
        messages: [
          {
            role: "user",
            content: "Summarize the first proof artifact.",
          },
        ],
      })
      .expect(200);

    expect(executeOpenAiChat).toHaveBeenCalledTimes(1);
    expect(res.headers["x-dearme-correlation-id"]).toBe("corr-openai-1");
    expect(res.headers["x-dearme-model-tier"]).toBe(resolveDearMeProxyModelRouting(2).tier);
    expect(res.body).toMatchObject({
      id: "chatcmpl_corr-openai-1",
      object: "chat.completion",
      model: openAiFastModel,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "OpenAI-compatible proof",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 7,
        total_tokens: 27,
      },
    });

    expect(insert).toHaveBeenCalledWith(costEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "first-run-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        billingType: "metered_api",
        model: openAiFastModel,
        inputTokens: 10,
        cachedInputTokens: 6,
        outputTokens: 7,
        costCents: 12,
        occurredAt: expect.any(Date),
      }),
    );
    expect(values).not.toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-spoofed",
        agentId: "agent-spoofed",
      }),
    );
  });

  it("routes OpenAI-compatible requests through the configured fixture executor and writes one normalized cost event", async () => {
    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T12:10:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          openAiChat: {
            mode: "fixture",
            content: "Factory OpenAI proof",
            usage: {
              input_tokens: 5,
              cache_creation_input_tokens: 1,
              cache_read_input_tokens: 3,
              output_tokens: 2,
            },
            blendedUsdMicros: 44_000,
          },
        }),
      },
      {
        id: "dm-key-factory-openai",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Correlation-Id", "corr-factory-openai-1")
      .send({
        model: "gpt-4o-mini",
        task: "factory-openai-proof",
        complexity: 2,
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      id: "chatcmpl_corr-factory-openai-1",
      model: openAiFastModel,
      choices: [
        {
          message: {
            role: "assistant",
            content: "Factory OpenAI proof",
          },
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 2,
        total_tokens: 11,
      },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "factory-openai-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        model: openAiFastModel,
        inputTokens: 5,
        cachedInputTokens: 3,
        outputTokens: 2,
        costCents: 4,
      }),
    );
  });

  it("routes OpenAI-compatible fetch transport through normalization and cost rails", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: "Fetch route OpenAI proof" } }],
        usage: {
          prompt_tokens: 8,
          prompt_tokens_details: { cached_tokens: 3 },
          completion_tokens: 4,
        },
        blendedUsdMicros: 20_000,
      }),
    );
    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T12:15:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          openAiChat: {
            mode: "fetch",
            endpoint: "https://llm.example/v1/chat/completions",
            apiKey: "sk-openai",
            fetch,
          },
        }),
      },
      {
        id: "dm-key-fetch-route-openai",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Correlation-Id", "corr-fetch-route-openai-1")
      .send({
        model: "gpt-4o-mini",
        task: "fetch-route-openai-proof",
        complexity: 2,
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(200);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      id: "chatcmpl_corr-fetch-route-openai-1",
      model: openAiFastModel,
      choices: [
        {
          message: {
            role: "assistant",
            content: "Fetch route OpenAI proof",
          },
        },
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 4,
        total_tokens: 15,
      },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "fetch-route-openai-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        model: openAiFastModel,
        inputTokens: 8,
        cachedInputTokens: 3,
        outputTokens: 4,
        costCents: 2,
      }),
    );
  });

  it("returns 503 and writes no cost event when the OpenAI-compatible executor is not configured", async () => {
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T12:20:00.000Z"),
        ...createDearMeAiProxyRouteOptions(null),
      },
      {
        id: "dm-key-missing-openai",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(503);

    expect(res.body).toEqual({ error: "DearMe AI proxy executor is not configured" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 503 and makes no outbound call when fetch executor config is incomplete", async () => {
    const fetch = vi.fn();
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T12:25:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          openAiChat: {
            mode: "fetch",
            endpoint: "",
            apiKey: "sk-openai",
            fetch,
          },
        }),
      },
      {
        id: "dm-key-missing-fetch-openai",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(503);

    expect(res.body).toEqual({ error: "DearMe AI proxy executor is not configured" });
    expect(fetch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 500 and writes no cost event when the configured OpenAI executor fails", async () => {
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T12:30:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          openAiChat: {
            mode: "fixture",
            fail: true,
          },
        }),
      },
      {
        id: "dm-key-failure",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(500);

    expect(res.body).toEqual({ error: "Internal server error" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 500 and writes no cost event when the OpenAI fetch transport fails", async () => {
    const fetch = vi.fn(async () => jsonResponse({ error: "provider unavailable" }, 503, "Unavailable"));
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T12:35:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          openAiChat: {
            mode: "fetch",
            endpoint: "https://llm.example/v1/chat/completions",
            apiKey: "sk-openai",
            fetch,
          },
        }),
      },
      {
        id: "dm-key-fetch-failure",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(500);

    expect(res.body).toEqual({ error: "Internal server error" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("routes agent runs through the injected executor, normalizes tokens, and attributes cost to the resolved key owner", async () => {
    const executeAgentRun = vi.fn(async (input: any) => {
      expect(input).toMatchObject({
        prompt: "Prepare the proof artifact.",
        mcpServers: ["memory", "skills"],
        task: "agent-run-proof",
        complexity: 2,
        maxTurns: 25,
        routing: {
          tier: "balanced",
          model: balancedModel,
          complexity: 2,
        },
        correlationId: "corr-agent-1",
      });
      return {
        output: "Agent-run proof",
        toolCalls: [
          {
            name: "search_memory",
            arguments: { query: "proof" },
            result: { matches: 1 },
          },
        ],
        tokensUsed: {
          input: 14.9,
          output: 6.4,
          cacheCreate: 2.2,
          cacheRead: 11.8,
        },
        blendedUsdMicros: 234_567,
      };
    });

    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T14:00:00.000Z"),
        executeAgentRun,
      },
      {
        id: "dm-key-3",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/agent/run`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Company-ID", "company-spoofed")
      .set("X-DearMe-Agent-ID", "agent-spoofed")
      .set("X-DearMe-Correlation-Id", "corr-agent-1")
      .set("X-DearMe-Model-Tier", "balanced")
      .send({
        prompt: "Prepare the proof artifact.",
        mcpServers: ["memory", "skills"],
        task: "agent-run-proof",
        complexity: 2,
      })
      .expect(200);

    expect(executeAgentRun).toHaveBeenCalledTimes(1);
    expect(res.headers["x-dearme-correlation-id"]).toBe("corr-agent-1");
    expect(res.headers["x-dearme-model-tier"]).toBe("balanced");
    expect(res.body).toMatchObject({
      output: "Agent-run proof",
      toolCalls: [
        {
          name: "search_memory",
          arguments: { query: "proof" },
          result: { matches: 1 },
        },
      ],
      tokensUsed: {
        input: 14,
        output: 6,
        cacheCreate: 2,
        cacheRead: 11,
      },
      tier: "balanced",
      model: balancedModel,
      correlationId: "corr-agent-1",
    });

    expect(insert).toHaveBeenCalledWith(costEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "agent-run-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        billingType: "metered_api",
        model: balancedModel,
        inputTokens: 14,
        cachedInputTokens: 11,
        outputTokens: 6,
        costCents: 23,
        occurredAt: expect.any(Date),
      }),
    );
    expect(values).not.toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-spoofed",
        agentId: "agent-spoofed",
      }),
    );
  });

  it("rejects revoked DearMe keys", async () => {
    const { app, insert } = createApp(undefined, null);

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set("Authorization", "Bearer dm_sk_revoked_123")
      .send({
        model: "claude-3-5-sonnet",
        messages: [{ role: "user", content: "Summarize the proof artifact." }],
      })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects malformed DearMe bearer tokens before agent-run executor or cost writes", async () => {
    const executeAgentRun = vi.fn();
    const { app, insert } = createApp({ executeAgentRun }, null);

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/agent/run`)
      .set("Authorization", "Bearer dm_sk_test_123 extra")
      .send({
        prompt: "Prepare the proof artifact.",
        mcpServers: ["memory"],
      })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
    expect(executeAgentRun).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 503 and writes no cost event when the agent-run executor is not configured", async () => {
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T15:00:00.000Z"),
      },
      {
        id: "dm-key-4",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/agent/run`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        prompt: "Prepare the proof artifact.",
        mcpServers: ["memory"],
      })
      .expect(503);

    expect(res.body).toEqual({ error: "DearMe AI proxy executor is not configured" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("routes Anthropic-compatible messages through explicit tier selection and cache normalization", async () => {
    const executeAnthropicMessages = vi.fn(async (input: any) => {
      expect(input.routing).toEqual({
        tier: "deep",
        model: deepModel,
        complexity: 1,
      });
      return {
        content: "Anthropic-compatible proof",
        usage: {
          input_tokens: 11,
          cache_creation: {
            ephemeral_5m_input_tokens: 9,
            ephemeral_1h_input_tokens: 3,
          },
          cache_read_input_tokens: 5,
          output_tokens: 4,
        },
        blendedUsdMicros: 987_654,
      };
    });

    const { app, values } = createApp(
      {
        now: () => new Date("2026-05-10T13:00:00.000Z"),
        executeAnthropicMessages,
      },
      {
        id: "dm-key-2",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Company-ID", "company-spoofed")
      .set("X-DearMe-Agent-ID", "agent-spoofed")
      .set("X-DearMe-Model-Tier", "deep")
      .set("X-DearMe-Correlation-Id", "corr-anthropic-1")
      .send({
        model: "claude-3-5-sonnet",
        subscriptionId: "billing-cycle-1",
        complexity: 1,
        tier: "deep",
        system: "Keep the output short.",
        messages: [
          {
            role: "user",
            content: "Summarize the proof artifact.",
          },
        ],
      })
      .expect(200);

    expect(executeAnthropicMessages).toHaveBeenCalledTimes(1);
    expect(res.headers["x-dearme-correlation-id"]).toBe("corr-anthropic-1");
    expect(res.headers["x-dearme-model-tier"]).toBe("deep");
    expect(res.body).toMatchObject({
      id: "msg_corr-anthropic-1",
      type: "message",
      role: "assistant",
      model: deepModel,
      content: [
        {
          type: "text",
          text: "Anthropic-compatible proof",
        },
      ],
      stop_reason: "end_turn",
      usage: {
        input_tokens: 28,
        output_tokens: 4,
      },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "billing-cycle-1",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        billingType: "metered_api",
        model: deepModel,
        inputTokens: 11,
        cachedInputTokens: 5,
        outputTokens: 4,
        costCents: 99,
        occurredAt: expect.any(Date),
      }),
    );
    expect(values).not.toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-spoofed",
        agentId: "agent-spoofed",
      }),
    );
  });

  it("returns 500 and writes no cost event when Anthropic fetch payloads are malformed", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "Missing usage proof" }],
      }),
    );
    const { app, insert } = createApp(
      {
        now: () => new Date("2026-05-10T13:20:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          anthropicMessages: {
            mode: "fetch",
            endpoint: "https://llm.example/v1/messages",
            apiKey: "sk-anthropic",
            fetch,
          },
        }),
      },
      {
        id: "dm-key-fetch-malformed",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Model-Tier", "deep")
      .send({
        model: "claude-3-5-sonnet",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(500);

    expect(res.body).toEqual({ error: "Internal server error" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("routes Anthropic-compatible fetch transport through normalization and cost rails", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "Fetch route Anthropic proof" }],
        usage: {
          input_tokens: 11,
          cache_read_input_tokens: 5,
          output_tokens: 4,
        },
        blendedUsdMicros: 987_654,
      }),
    );
    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T13:15:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          anthropicMessages: {
            mode: "fetch",
            endpoint: "https://llm.example/v1/messages",
            apiKey: "sk-anthropic",
            fetch,
          },
        }),
      },
      {
        id: "dm-key-fetch-route-anthropic",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Correlation-Id", "corr-fetch-route-anthropic-1")
      .set("X-DearMe-Model-Tier", "deep")
      .send({
        model: "claude-3-5-sonnet",
        subscriptionId: "fetch-route-anthropic-proof",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(200);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      id: "msg_corr-fetch-route-anthropic-1",
      model: deepModel,
      content: [
        {
          type: "text",
          text: "Fetch route Anthropic proof",
        },
      ],
      usage: {
        input_tokens: 16,
        output_tokens: 4,
      },
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "fetch-route-anthropic-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        model: deepModel,
        inputTokens: 11,
        cachedInputTokens: 5,
        outputTokens: 4,
        costCents: 99,
      }),
    );
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("routes Anthropic-compatible requests through the configured fixture executor and writes one normalized cost event", async () => {
    const { app, insert, values } = createApp(
      {
        now: () => new Date("2026-05-10T13:10:00.000Z"),
        ...createDearMeAiProxyRouteOptions({
          anthropicMessages: {
            mode: "fixture",
            content: "Factory Anthropic proof",
            usage: {
              input_tokens: 6,
              cache_read_input_tokens: 4,
              output_tokens: 3,
            },
            blendedUsdMicros: 51_000,
          },
        }),
      },
      {
        id: "dm-key-factory-anthropic",
        agentId: "agent-real",
        companyId: "company-real",
      },
    );

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set("Authorization", "Bearer dm_sk_test_123")
      .set("X-DearMe-Correlation-Id", "corr-factory-anthropic-1")
      .set("X-DearMe-Model-Tier", "deep")
      .send({
        model: "claude-3-5-sonnet",
        subscriptionId: "factory-anthropic-proof",
        complexity: 1,
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(200);

    expect(res.body).toMatchObject({
      id: "msg_corr-factory-anthropic-1",
      model: deepModel,
      content: [
        {
          type: "text",
          text: "Factory Anthropic proof",
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 3,
      },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-real",
        agentId: "agent-real",
        billingCode: "factory-anthropic-proof",
        provider: "dearme_proxy",
        biller: "dearme_proxy",
        model: deepModel,
        inputTokens: 6,
        cachedInputTokens: 4,
        outputTokens: 3,
        costCents: 5,
      }),
    );
  });
});
