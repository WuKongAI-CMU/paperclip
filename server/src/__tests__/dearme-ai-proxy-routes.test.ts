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

const openAiFastModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "fast")?.model;
const deepModel = DEARME_PROXY_MODEL_ROUTING_TABLE.find((row) => row.tier === "deep")?.model;

if (!openAiFastModel || !deepModel) {
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
});
