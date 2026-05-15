import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSupportThread,
  handleInboundWebhook,
  sendThreadReply,
} from "./dearme-support.js";

function signature(payload: unknown, secret = "plain_webhook_secret") {
  const bytes = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload), "utf8");
  return `sha256=${createHmac("sha256", secret).update(bytes).digest("hex")}`;
}

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

function capturedJsonBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls[0] as [string, { body?: string }] | undefined;
  return JSON.parse(call?.[1].body ?? "{}") as Record<string, any>;
}

describe("dearme support Plain integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("createSupportThread POSTs to Plain with bearer auth and the support thread body", async () => {
    vi.stubEnv("DEARME_PLAIN_API_KEY", "plain_api_key");
    const fetchMock = vi.fn(async () => jsonResponse({
      data: {
        createThread: {
          thread: {
            id: "thread-123",
          },
        },
      },
    }));

    await expect(createSupportThread({
      email: "customer@example.com",
      name: "Customer",
      subject: "Need help",
      body: "The weekly report did not arrive.",
      severity: "high",
    }, { fetch: fetchMock })).resolves.toMatchObject({
      ok: true,
      threadId: "thread-123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://core-api.uk.plain.com/graphql/v1",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer plain_api_key",
          "content-type": "application/json",
        },
      }),
    );
    const body = capturedJsonBody(fetchMock);
    expect(body.query).toContain("createThread");
    expect(body.variables.input).toEqual({
      customer: {
        email: "customer@example.com",
        name: "Customer",
      },
      title: "Need help",
      components: [
        {
          componentText: {
            text: "The weekly report did not arrive.",
          },
        },
      ],
      labelTypeIds: ["dearme-severity-high"],
    });
  });

  it("missing API key returns skipped without calling Plain", async () => {
    vi.stubEnv("DEARME_PLAIN_API_KEY", "");
    const fetchMock = vi.fn();

    await expect(createSupportThread({
      email: "customer@example.com",
      name: "Customer",
      subject: "Need help",
      body: "Help me.",
    }, { fetch: fetchMock })).resolves.toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handleInboundWebhook rejects a bad HMAC signature", () => {
    vi.stubEnv("DEARME_PLAIN_WEBHOOK_SECRET", "plain_webhook_secret");
    const payload = {
      type: "thread.reply_created",
      data: {
        threadId: "thread-123",
        fromEmail: "customer@example.com",
        body: "Thanks.",
      },
    };

    expect(() => handleInboundWebhook(payload, "sha256=bad")).toThrow(
      "Invalid DearMe Plain webhook signature.",
    );
  });

  it("handleInboundWebhook accepts a valid signature and extracts thread, body, email, and kind", () => {
    vi.stubEnv("DEARME_PLAIN_WEBHOOK_SECRET", "plain_webhook_secret");
    const rawPayload = JSON.stringify({
      type: "thread.reply_created",
      data: {
        thread: {
          id: "thread-123",
        },
        message: {
          body: "I still need help.",
          from: {
            email: "customer@example.com",
          },
        },
      },
    });

    expect(handleInboundWebhook(rawPayload, signature(rawPayload))).toEqual({
      threadId: "thread-123",
      fromEmail: "customer@example.com",
      body: "I still need help.",
      kind: "thread.reply_created",
    });
  });

  it("sendThreadReply POSTs a Plain reply with the expected shape", async () => {
    vi.stubEnv("DEARME_PLAIN_API_KEY", "plain_api_key");
    const fetchMock = vi.fn(async () => jsonResponse({
      data: {
        replyToThread: {
          thread: {
            id: "thread-123",
          },
        },
      },
    }));

    await expect(sendThreadReply({
      threadId: "thread-123",
      body: "We are looking into this.",
    }, { fetch: fetchMock })).resolves.toMatchObject({
      ok: true,
      threadId: "thread-123",
    });

    const body = capturedJsonBody(fetchMock);
    expect(body.query).toContain("replyToThread");
    expect(body.variables.input).toEqual({
      threadId: "thread-123",
      components: [
        {
          componentText: {
            text: "We are looking into this.",
          },
        },
      ],
    });
  });
});
