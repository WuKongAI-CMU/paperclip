import { describe, expect, it, vi } from "vitest";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import {
  createDearMeMetaCampaignDispatch,
  resolveDearMeMetaCampaignCredential,
} from "./dearme-meta-campaign-dispatch.js";

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
  channel: "meta_ads",
  openclawRunId: "run-1",
  approvalId: "approval-1",
  idempotencyKey: "create_meta_campaign:approval-1:payload-hash",
  originalPayload: {
    campaign: {
      name: "Architecture review lead magnet",
      objective: "OUTCOME_LEADS",
      dailyBudgetUsd: 20,
      creativeRefs: ["asset:video:1"],
      audienceRef: "audience:founders",
    },
    budgetTier: "test",
    learningWindowHours: 168,
  },
};

function campaignPayload(overrides: Record<string, unknown> = {}) {
  return {
    issueId: "issue-1",
    openclawRunId: "run-1",
    idempotencyKey: "run-1",
    campaign: {
      name: "Architecture review lead magnet",
      objective: "OUTCOME_LEADS",
      dailyBudgetUsd: 20,
      creativeRefs: ["asset:video:1"],
      audienceRef: "audience:founders",
    },
    budgetTier: "test",
    learningWindowHours: 168,
    ...overrides,
  };
}

function credential(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    provider: "meta_ads",
    tokenType: "bearer",
    accessToken: "meta-access-token",
    adAccountId: "123456789",
    scopes: ["ads_read", "ads_management"],
    expiresAt: "2026-05-11T14:00:00.000Z",
    ...overrides,
  });
}

describe("createDearMeMetaCampaignDispatch", () => {
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

      await expect(resolveDearMeMetaCampaignCredential(encryptedCredential)).resolves.toBe(plaintext);
    } finally {
      if (previousMasterKey === undefined) {
        delete process.env.PAPERCLIP_SECRETS_MASTER_KEY;
      } else {
        process.env.PAPERCLIP_SECRETS_MASTER_KEY = previousMasterKey;
      }
    }
  });

  it("creates approved Meta campaign shells with the stored ads credential", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      id: "120000000000000001",
    }));
    const dispatch = createDearMeMetaCampaignDispatch({
      graphApiBaseUrl: "https://graph.example.test/v21.0/",
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "delivered",
      externalId: "120000000000000001",
      externalUrl:
        "https://business.facebook.com/adsmanager/manage/campaigns?act=123456789&selected_campaign_ids=120000000000000001",
      paid: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method?: string; headers?: Record<string, string>; body?: string },
    ];
    expect(url).toBe("https://graph.example.test/v21.0/act_123456789/campaigns");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer meta-access-token",
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": "create_meta_campaign:approval-1:payload-hash",
        "User-Agent": "DearMe/0.1",
      },
    });
    const body = new URLSearchParams(init?.body);
    expect(body.get("name")).toBe("Architecture review lead magnet");
    expect(body.get("objective")).toBe("OUTCOME_LEADS");
    expect(body.get("status")).toBe("PAUSED");
    expect(body.get("special_ad_categories")).toBe("[]");
    expect(body.get("buying_type")).toBe("AUCTION");
    expect(body.get("daily_budget")).toBe("2000");
  });

  it("rejects non-HTTPS Meta Graph API base URLs before credential resolution", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeMetaCampaignDispatch({
      graphApiBaseUrl: "http://graph.example.test/v25.0",
      fetch: fetchMock,
      resolveCredential,
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-graph-api-url-invalid",
    });
    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Meta auth failures back to the wrapper reauth path without exposing the token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(
      { error: { message: "Invalid OAuth access token." } },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ));
    const dispatch = createDearMeMetaCampaignDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    const result = await dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    });

    expect(result).toEqual({
      kind: "auth-error",
      reason: "meta-campaign-auth-failed:401",
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://graph.facebook.com/v25.0/act_123456789/campaigns");
    expect(JSON.stringify(result)).not.toContain("meta-access-token");
    expect(JSON.stringify(result)).not.toContain("Invalid OAuth");
  });

  it("rejects expired, underscoped, or malformed Meta ads credentials before sending", async () => {
    const fetchMock = vi.fn();
    const expiredDispatch = createDearMeMetaCampaignDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T15:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(expiredDispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "meta-campaign-credential-expired",
    });

    const underscopedDispatch = createDearMeMetaCampaignDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ scopes: ["ads_read"] }),
    });

    await expect(underscopedDispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "meta-campaign-credential-missing-ads-management-scope",
    });

    const invalidAccountDispatch = createDearMeMetaCampaignDispatch({
      fetch: fetchMock,
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential({ adAccountId: "not an account" }),
    });

    await expect(invalidAccountDispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "auth-error",
      reason: "meta-campaign-credential-invalid-ad-account-id",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed campaign payloads before credential resolution", async () => {
    const fetchMock = vi.fn();
    const resolveCredential = vi.fn(async () => credential());
    const dispatch = createDearMeMetaCampaignDispatch({
      fetch: fetchMock,
      resolveCredential,
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload({
        campaign: {
          name: "Architecture review lead magnet",
          objective: "OUTCOME_LEADS",
          dailyBudgetUsd: 26,
          creativeRefs: ["asset:video:1"],
          audienceRef: "audience:founders",
        },
      }),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-daily-budget-exceeds-test-tier",
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload({ learningWindowHours: 24 }),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-learning-window-invalid",
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload({
        campaign: {
          name: "Architecture review lead magnet",
          objective: "OUTCOME_LEADS",
          dailyBudgetUsd: 20,
          creativeRefs: ["asset:video:1", ""],
          audienceRef: "audience:founders",
        },
      }),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-creative-refs-invalid",
    });

    expect(resolveCredential).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when Meta returns incomplete campaign data", async () => {
    const dispatch = createDearMeMetaCampaignDispatch({
      fetch: vi.fn(async () => jsonResponse({ data: { status: "PAUSED" } })),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-returned-incomplete-data",
    });
  });

  it("keeps provider network failures inside the dispatch result", async () => {
    const dispatch = createDearMeMetaCampaignDispatch({
      fetch: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      resolveCredential: async () => credential(),
    });

    await expect(dispatch({
      toolName: "create_meta_campaign",
      encryptedCredential: "opaque",
      payload: campaignPayload(),
      dispatchContext,
    })).resolves.toEqual({
      kind: "errored",
      error: "meta-campaign-request-failed:network unavailable",
    });
  });
});
