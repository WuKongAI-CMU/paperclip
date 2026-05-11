import { describe, expect, it, vi } from "vitest";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import {
  createDearMeXPostDispatch,
  resolveDearMeXPostCredential,
} from "./dearme-x-post-dispatch.js";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText,
    async json() {
      return body;
    },
  };
}

const dispatchContext = {
  companyId: "company-1",
  userId: "user-1",
  issueId: "issue-1",
  channel: "x",
  openclawRunId: "run-1",
  approvalId: "approval-1",
  idempotencyKey: "run-1",
  originalPayload: { text: "A private proof packet is ready." },
};

function credential(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    provider: "x",
    tokenType: "bearer",
    accessToken: "x-access-token",
    scopes: ["tweet.read", "tweet.write", "users.read"],
    expiresAt: "2026-05-11T14:00:00.000Z",
    ...overrides,
  });
}

describe("createDearMeXPostDispatch", () => {
  it("resolves local-encrypted channel credential envelopes", async () => {
    const previousMasterKey = process.env.PAPERCLIP_SECRETS_MASTER_KEY;
    process.env.PAPERCLIP_SECRETS_MASTER_KEY = "0".repeat(64);
    try {
      const plaintext = credential();
      const prepared = await localEncryptedProvider.createVersion({
        value: plaintext,
        externalRef: null,
      });
      const encryptedCredential = JSON.stringify({
        provider: "local_encrypted",
        material: prepared.material,
        valueSha256: prepared.valueSha256,
        externalRef: prepared.externalRef,
      });

      await expect(resolveDearMeXPostCredential(encryptedCredential)).resolves.toBe(plaintext);
    } finally {
      if (previousMasterKey === undefined) {
        delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
      } else {
        process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
      }
    }
  });

  it("posts approved X payloads with the stored user credential", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      data: {
        id: "1780000000000000000",
        text: "A private proof packet is ready.",
      },
    }));
    const dispatch = createDearMeXPostDispatch({
      tweetsUrl: "https://x.example.test/2/tweets",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: {
        issueId: "issue-1",
        openclawRunId: "run-1",
        idempotencyKey: "run-1",
        text: "A private proof packet is ready.",
        replyToTweetId: "1770000000000000000",
        mediaIds: ["media-1"],
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "delivered",
      externalId: "1780000000000000000",
      externalUrl: "https://x.com/i/web/status/1780000000000000000",
      paid: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://x.example.test/2/tweets", {
      method: "POST",
      headers: {
        Authorization: "Bearer x-access-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "A private proof packet is ready.",
        reply: { in_reply_to_tweet_id: "1770000000000000000" },
        media: { media_ids: ["media-1"] },
      }),
    });
  });

  it("maps X auth failures back to the wrapper reauth path without exposing the token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { title: "Unauthorized" },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ));
    const dispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready." },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "auth-error",
      reason: "x-post-auth-failed:401:Unauthorized",
    });
    expect(JSON.stringify(result)).not.toContain("x-access-token");
  });

  it("rejects expired or underscoped X credentials before posting", async () => {
    const fetchMock = vi.fn();
    const expiredDispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T15:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(expiredDispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready." },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "x-credential-expired",
    });

    const underscopedDispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ scopes: ["tweet.read", "users.read"] }),
    });

    await expect(underscopedDispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready." },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "x-credential-missing-tweet-write-scope",
    });

    const noScopesDispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ scopes: [] }),
    });

    await expect(noScopesDispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready." },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "x-credential-missing-tweet-write-scope",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid tweet payloads before credential resolution", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      resolveCredential,
    });

    const result = await dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "x".repeat(281) },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "errored",
      error: "x-post-text-too-long",
    });
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed optional tweet fields", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeXPostDispatch({
      fetch: fetchMock,
      resolveCredential,
    });

    await expect(dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready.", mediaIds: ["media-1", ""] },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "x-post-media-ids-invalid",
    });
    await expect(dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready.", replyToTweetId: "" },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "x-post-reply-id-invalid",
    });
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps provider network failures inside the dispatch result", async () => {
    const dispatch = createDearMeXPostDispatch({
      fetch: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "post_x",
      encryptedCredential: "opaque",
      payload: { text: "A private proof packet is ready." },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "x-post-request-failed:network unavailable",
    });
  });
});
