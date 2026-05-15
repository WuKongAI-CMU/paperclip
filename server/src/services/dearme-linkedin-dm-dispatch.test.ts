import { describe, expect, it, vi } from "vitest";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import {
  createDearMeLinkedInDmDispatch,
  resolveDearMeLinkedInDmCredential,
} from "./dearme-linkedin-dm-dispatch.js";
import type { DearMeLinkedInThrottleService } from "./dearme-linkedin-throttle.js";

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
  channel: "linkedin",
  openclawRunId: "run-1",
  approvalId: "approval-1",
  idempotencyKey: "send_linkedin_dm:approval-1:payload-hash",
  originalPayload: {
    recipientUrn: "urn:li:person:lead-1",
    body: "Peter, this private proof packet is ready when you have a minute.",
    subject: "Private proof packet",
  },
};

function credential(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    provider: "linkedin_partner",
    tokenType: "bearer",
    accessToken: "li-access-token",
    capabilities: ["send_dm"],
    expiresAt: "2026-05-11T14:00:00.000Z",
    ...overrides,
  });
}

describe("createDearMeLinkedInDmDispatch", () => {
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

      await expect(resolveDearMeLinkedInDmCredential(encryptedCredential)).resolves.toBe(plaintext);
    } finally {
      if (previousMasterKey === undefined) {
        delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
      } else {
        process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
      }
    }
  });

  it("sends approved LinkedIn DM payloads through a configured partner endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      conversationUrn: "urn:li:conversation:abc",
      messageUrn: "urn:li:message:def",
      sentAt: "2026-05-11T12:00:01.000Z",
      conversationUrl: "https://www.linkedin.com/messaging/thread/abc/",
    }));
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        issueId: "issue-1",
        openclawRunId: "run-1",
        idempotencyKey: "run-1",
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
        subject: "Private proof packet",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "delivered",
      externalId: "urn:li:message:def",
      externalUrl: "https://www.linkedin.com/messaging/thread/abc/",
      paid: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://linkedin-partner.example.test/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer li-access-token",
        "Content-Type": "application/json",
        "Idempotency-Key": "send_linkedin_dm:approval-1:payload-hash",
        "User-Agent": "DearMe/0.1",
      },
      body: JSON.stringify({
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
        subject: "Private proof packet",
        context: {
          companyId: "company-1",
          issueId: "issue-1",
          openclawRunId: "run-1",
          approvalId: "approval-1",
        },
      }),
    });
  });

  it("blocks dispatch when the LinkedIn DM daily cap is reached", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const throttle: DearMeLinkedInThrottleService = {
      getThrottleState: vi.fn(async () => ({
        accountAgeDays: 30,
        dmsSentToday: 40,
        dmsSentThisWeek: 80,
        dailyCap: 40,
        weeklyCap: 200,
        status: "daily_cap" as const,
      })),
      recordDispatch: vi.fn(),
    };
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      resolveCredential,
      throttle,
    });

    const result = await dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "errored",
      error: "LinkedIn outreach rate limit reached for today. Daily cap: 40/40. Weekly cap: 80/200.",
    });
    expect(throttle.getThrottleState).toHaveBeenCalledWith("company-1");
    expect(throttle.recordDispatch).not.toHaveBeenCalled();
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records successful LinkedIn DM dispatches with the throttle service", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      conversationUrn: "urn:li:conversation:abc",
      messageUrn: "urn:li:message:def",
    }));
    const throttle: DearMeLinkedInThrottleService = {
      getThrottleState: vi.fn(async () => ({
        accountAgeDays: 30,
        dmsSentToday: 3,
        dmsSentThisWeek: 12,
        dailyCap: 40,
        weeklyCap: 200,
        status: "ok" as const,
      })),
      recordDispatch: vi.fn(async () => ({
        accountAgeDays: 30,
        dmsSentToday: 4,
        dmsSentThisWeek: 13,
        dailyCap: 40,
        weeklyCap: 200,
        status: "ok" as const,
      })),
    };
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
      throttle,
    });

    const result = await dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    });

    expect(result).toMatchObject({
      kind: "delivered",
      externalId: "urn:li:message:def",
    });
    expect(throttle.getThrottleState).toHaveBeenCalledWith("company-1");
    expect(throttle.recordDispatch).toHaveBeenCalledWith("company-1");
  });

  it("fails closed when no partner messages endpoint is configured", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeLinkedInDmDispatch({
      fetch: fetchMock,
      resolveCredential,
    });

    const result = await dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "errored",
      error: "linkedin-dm-provider-unconfigured",
    });
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps partner auth failures back to the wrapper reauth path without exposing the token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { message: "Unauthorized" },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ));
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "auth-error",
      reason: "linkedin-dm-send-auth-failed:401",
    });
    expect(JSON.stringify(result)).not.toContain("li-access-token");
    expect(JSON.stringify(result)).not.toContain("Unauthorized");
  });

  it("rejects expired or uncapable LinkedIn partner credentials before sending", async () => {
    const fetchMock = vi.fn();
    const expiredDispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T15:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(expiredDispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "linkedin-dm-credential-expired",
    });

    const missingCapabilityDispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ capabilities: ["read_profile"] }),
    });

    await expect(missingCapabilityDispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "linkedin-dm-credential-missing-send-dm-capability",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed LinkedIn DM payloads before credential resolution", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: fetchMock,
      resolveCredential,
    });

    await expect(dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "x".repeat(1001),
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "linkedin-dm-body-too-long",
    });
    await expect(dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
        subject: "",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "linkedin-dm-subject-invalid",
    });
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats successful partner responses without message ids as provider errors", async () => {
    const dispatch = createDearMeLinkedInDmDispatch({
      messagesUrl: "https://linkedin-partner.example.test/messages",
      fetch: vi.fn(async () => jsonResponse({ conversationUrn: "urn:li:conversation:abc" })),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "send_linkedin_dm",
      encryptedCredential: "opaque",
      payload: {
        recipientUrn: "urn:li:person:lead-1",
        body: "Peter, this private proof packet is ready when you have a minute.",
      },
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "linkedin-dm-returned-incomplete-data",
    });
  });
});
