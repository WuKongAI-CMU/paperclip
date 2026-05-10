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
import {
  DEARME_PROXY_MODEL_ROUTING_TABLE,
  resolveDearMeProxyModelRouting,
} from "@paperclipai/dearme-ai-proxy";

function makeDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  return {
    db: { insert } as unknown as Db,
    insert,
    values,
  };
}

function createApp(
  opts: Parameters<typeof dearMeAiProxyRoutes>[1] = {},
) {
  const { db, insert, values } = makeDb();
  const app = express();
  app.use(express.json());
  app.use(DEARME_PROXY_BASE_PATH, dearMeAiProxyRoutes(db, opts));
  app.use(errorHandler);
  return { app, insert, values };
}

const authHeaders = {
  Authorization: "Bearer dm_sk_test_123",
  "X-DearMe-Company-ID": "company-123",
  "X-DearMe-Agent-ID": "agent-456",
};

const openAiFastModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "fast")?.model;
const deepModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "deep")?.model;

if (!openAiFastModel || !deepModel) {
  throw new Error("Expected DearMe proxy routing tiers to exist");
}

describe("dearMeAiProxyRoutes", () => {
  it("rejects missing DearMe API key auth before body validation", async () => {
    const { app } = createApp();

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .send({ model: "gpt-4o-mini", messages: [] })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
  });

  it("fails closed when no provider execution function is configured", async () => {
    const { app, insert } = createApp();

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set(authHeaders)
      .send({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Prepare the proof." }],
      })
      .expect(503);

    expect(res.body).toEqual({ error: "DearMe AI proxy executor is not configured" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("routes OpenAI-compatible completions through complexity-based tier selection and writes the cost event", async () => {
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

    const { app, insert, values } = createApp({
      now: () => new Date("2026-05-10T12:00:00.000Z"),
      executeOpenAiChat,
    });

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/chat/completions`)
      .set(authHeaders)
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
        companyId: "company-123",
        agentId: "agent-456",
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

    const { app, values } = createApp({
      now: () => new Date("2026-05-10T13:00:00.000Z"),
      executeAnthropicMessages,
    });

    const res = await request(app)
      .post(`${DEARME_PROXY_BASE_PATH}/v1/messages`)
      .set(authHeaders)
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
        companyId: "company-123",
        agentId: "agent-456",
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
  });
});
