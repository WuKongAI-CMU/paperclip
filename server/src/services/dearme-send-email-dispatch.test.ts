import { describe, expect, it, vi } from "vitest";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import {
  createDearMeSendEmailDispatch,
  resolveDearMeSendEmailCredential,
} from "./dearme-send-email-dispatch.js";

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
  channel: "resend",
  openclawRunId: "run-1",
  approvalId: "approval-1",
  idempotencyKey: "run-1",
  originalPayload: {
    toEmail: "lead@example.com",
    fromHandle: "Peter",
    subject: "Quick proof packet",
    body: "Thought this would be useful.",
  },
};

function credential(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    provider: "resend",
    apiKey: "re_secret",
    fromEmail: "peter@dearme.app",
    fromName: "Peter Studio",
    expiresAt: "2026-05-11T14:00:00.000Z",
    ...overrides,
  });
}

describe("createDearMeSendEmailDispatch", () => {
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

      await expect(resolveDearMeSendEmailCredential(encryptedCredential)).resolves.toBe(plaintext);
    } finally {
      if (previousMasterKey === undefined) {
        delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
      } else {
        process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
      }
    }
  });

  it("sends approved email payloads through Resend with the stored user credential", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));
    const dispatch = createDearMeSendEmailDispatch({
      emailsUrl: "https://resend.example.test/emails",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        issueId: "issue-1",
        openclawRunId: "run-1",
        idempotencyKey: "run-1",
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "delivered",
      externalId: "email_123",
      paid: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://resend.example.test/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_secret",
        "Content-Type": "application/json",
        "Idempotency-Key": "run-1",
        "User-Agent": "DearMe/0.1",
      },
      body: JSON.stringify({
        from: "Peter Studio <peter@dearme.app>",
        to: ["lead@example.com"],
        subject: "Quick proof packet",
        text: "Thought this would be useful.",
      }),
    });
  });

  it("maps Resend auth failures back to the wrapper reauth path without exposing the key", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { message: "Unauthorized" },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ));
    const dispatch = createDearMeSendEmailDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "auth-error",
      reason: "email-send-auth-failed:401",
    });
    expect(JSON.stringify(result)).not.toContain("re_secret");
    expect(JSON.stringify(result)).not.toContain("Unauthorized");
  });

  it("bounds Resend idempotency keys to the provider limit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "email_123" }));
    const dispatch = createDearMeSendEmailDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext: {
        ...dispatchContext,
        idempotencyKey: "k".repeat(300),
      },
    });

    expect(result.kind).toBe("delivered");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, fetchInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(fetchInit.headers["Idempotency-Key"]).toBe("k".repeat(256));
  });

  it("treats successful Resend responses without ids as provider errors", async () => {
    const dispatch = createDearMeSendEmailDispatch({
      fetch: vi.fn(async () => jsonResponse({})),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-send-returned-incomplete-data",
    });
  });

  it("rejects unsupported providers and malformed email payloads before credential resolution", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeSendEmailDispatch({
      fetch: fetchMock,
      resolveCredential,
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        provider: "ses",
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-provider-unsupported",
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "not-email",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-payload-invalid-to-email",
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
        bodyHtml: "",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-body-html-unsupported",
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
        bodyHtml: "<p>Thought this would be useful.</p>",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-body-html-unsupported",
    });

    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects expired or incomplete Resend credentials before sending", async () => {
    const fetchMock = vi.fn();
    const expiredDispatch = createDearMeSendEmailDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T15:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(expiredDispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "email-credential-expired",
    });

    const missingFromDispatch = createDearMeSendEmailDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ fromEmail: "" }),
    });

    await expect(missingFromDispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "email-credential-missing-from-email",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps provider network failures inside the dispatch result", async () => {
    const dispatch = createDearMeSendEmailDispatch({
      fetch: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "send_email",
      encryptedCredential: "opaque",
      payload: {
        toEmail: "lead@example.com",
        fromHandle: "Peter",
        subject: "Quick proof packet",
        body: "Thought this would be useful.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "email-send-request-failed",
    });
  });
});
