import type { Db } from "@paperclipai/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueDearMeProxyCredentialForChiefOfStaff } from "../services/dearme-brand-blueprint-apply.js";

const mockAgentService = {
  createApiKey: vi.fn(),
  revokeKey: vi.fn(),
  update: vi.fn(),
};

const mockSecretService = {
  create: vi.fn(),
  getByName: vi.fn(),
  normalizeAdapterConfigForPersistence: vi.fn(),
  remove: vi.fn(),
};

vi.mock("../services/agents.js", () => ({
  agentService: vi.fn(() => mockAgentService),
}));

vi.mock("../services/secrets.js", () => ({
  secretService: vi.fn(() => mockSecretService),
}));

describe("issueDearMeProxyCredentialForChiefOfStaff", () => {
  beforeEach(() => {
    mockAgentService.createApiKey.mockReset();
    mockAgentService.revokeKey.mockReset();
    mockAgentService.update.mockReset();
    mockSecretService.create.mockReset();
    mockSecretService.getByName.mockReset();
    mockSecretService.normalizeAdapterConfigForPersistence.mockReset();
    mockSecretService.remove.mockReset();
  });

  function mockSuccessfulUpdate(secretId: string) {
    mockSecretService.normalizeAdapterConfigForPersistence.mockImplementation(async (_companyId, adapterConfig) => ({
      ...(adapterConfig as Record<string, unknown>),
      env: {
        ...((adapterConfig as any).env ?? {}),
        DEARME_PROXY_API_KEY: {
          type: "secret_ref",
          secretId,
          version: "latest",
        },
      },
    }));
    mockAgentService.update.mockResolvedValue({
      id: "agent-1",
    });
  }

  it("creates a dedicated dm_sk_ key, stores it backstage, and binds the chief of staff agent", async () => {
    mockSecretService.getByName.mockResolvedValue(null);
    mockAgentService.createApiKey.mockResolvedValue({
      id: "key-1",
      name: "dearme-proxy",
      token: "dm_sk_test_token",
      createdAt: new Date("2026-05-10T00:00:00.000Z"),
    });
    mockSecretService.create.mockResolvedValue({
      id: "secret-1",
    });
    mockSuccessfulUpdate("secret-1");

    await issueDearMeProxyCredentialForChiefOfStaff({
      db: {} as Db,
      companyId: "company-1",
      agent: {
        id: "agent-1",
        adapterConfig: {
          model: "gpt-3.5",
          env: {
            EXISTING_SETTING: "keep",
          },
        },
      },
      actor: {
        userId: "user-1",
        agentId: null,
      },
    });

    expect(mockAgentService.createApiKey).toHaveBeenCalledWith("agent-1", "dearme-proxy", {
      prefix: "dm_sk_",
    });
    expect(mockSecretService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        name: "dearme-chief-of-staff-proxy-key",
        provider: "local_encrypted",
        value: "dm_sk_test_token",
        description: "Backstage DearMe team access for the Chief of Staff agent.",
      }),
      { userId: "user-1", agentId: null },
    );
    expect(mockSecretService.normalizeAdapterConfigForPersistence).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        model: "gpt-3.5",
        env: expect.objectContaining({
          EXISTING_SETTING: "keep",
          DEARME_PROXY_API_KEY: expect.objectContaining({
            type: "secret_ref",
            secretId: "secret-1",
            version: "latest",
          }),
        }),
      }),
      { strictMode: false },
    );
    expect(mockAgentService.update).toHaveBeenCalledWith(
      "agent-1",
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          env: expect.objectContaining({
            DEARME_PROXY_API_KEY: expect.objectContaining({
              type: "secret_ref",
              secretId: "secret-1",
              version: "latest",
            }),
          }),
        }),
      }),
      {
        recordRevision: {
          createdByAgentId: null,
          createdByUserId: "user-1",
          source: "patch",
        },
      },
    );
    expect(mockAgentService.revokeKey).not.toHaveBeenCalled();
    expect(mockSecretService.remove).not.toHaveBeenCalled();
  });

  it("reuses an existing adapter secret binding without minting another key", async () => {
    mockSuccessfulUpdate("secret-existing");

    await issueDearMeProxyCredentialForChiefOfStaff({
      db: {} as Db,
      companyId: "company-1",
      agent: {
        id: "agent-1",
        adapterConfig: {
          model: "gpt-3.5",
          env: {
            DEARME_PROXY_API_KEY: {
              type: "secret_ref",
              secretId: "secret-existing",
              version: "latest",
            },
          },
        },
      },
      actor: {
        userId: "user-1",
        agentId: null,
      },
    });

    expect(mockSecretService.getByName).not.toHaveBeenCalled();
    expect(mockAgentService.createApiKey).not.toHaveBeenCalled();
    expect(mockSecretService.create).not.toHaveBeenCalled();
    expect(mockSecretService.normalizeAdapterConfigForPersistence).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        env: expect.objectContaining({
          DEARME_PROXY_API_KEY: expect.objectContaining({
            secretId: "secret-existing",
          }),
        }),
      }),
      { strictMode: false },
    );
  });

  it("reuses the fixed company secret when setup is retried after the secret already exists", async () => {
    mockSecretService.getByName.mockResolvedValue({
      id: "secret-existing",
    });
    mockSuccessfulUpdate("secret-existing");

    await issueDearMeProxyCredentialForChiefOfStaff({
      db: {} as Db,
      companyId: "company-1",
      agent: {
        id: "agent-1",
        adapterConfig: {
          model: "gpt-3.5",
          env: {
            EXISTING_SETTING: "keep",
          },
        },
      },
      actor: {
        userId: "user-1",
        agentId: null,
      },
    });

    expect(mockAgentService.createApiKey).not.toHaveBeenCalled();
    expect(mockSecretService.create).not.toHaveBeenCalled();
    expect(mockAgentService.update).toHaveBeenCalled();
    expect(mockSecretService.normalizeAdapterConfigForPersistence).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        env: expect.objectContaining({
          EXISTING_SETTING: "keep",
          DEARME_PROXY_API_KEY: expect.objectContaining({
            secretId: "secret-existing",
          }),
        }),
      }),
      { strictMode: false },
    );
  });

  it("recovers from a concurrent fixed-secret create and revokes the unused issued key", async () => {
    mockSecretService.getByName
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "secret-race-winner",
      });
    mockAgentService.createApiKey.mockResolvedValue({
      id: "key-unused",
      name: "dearme-proxy",
      token: "dm_sk_unused_token",
      createdAt: new Date("2026-05-10T00:00:00.000Z"),
    });
    mockSecretService.create.mockRejectedValue(new Error("Secret already exists"));
    mockAgentService.revokeKey.mockResolvedValue({
      id: "key-unused",
    });
    mockSuccessfulUpdate("secret-race-winner");

    await issueDearMeProxyCredentialForChiefOfStaff({
      db: {} as Db,
      companyId: "company-1",
      agent: {
        id: "agent-1",
        adapterConfig: {
          model: "gpt-3.5",
        },
      },
      actor: {
        userId: "user-1",
        agentId: null,
      },
    });

    expect(mockAgentService.revokeKey).toHaveBeenCalledWith("agent-1", "key-unused");
    expect(mockSecretService.remove).not.toHaveBeenCalled();
    expect(mockSecretService.normalizeAdapterConfigForPersistence).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        env: expect.objectContaining({
          DEARME_PROXY_API_KEY: expect.objectContaining({
            secretId: "secret-race-winner",
          }),
        }),
      }),
      { strictMode: false },
    );
  });

  it("revokes the newly issued key and removes its secret when adapter binding fails", async () => {
    const failure = new Error("normalize failed");
    mockSecretService.getByName.mockResolvedValue(null);
    mockAgentService.createApiKey.mockResolvedValue({
      id: "key-1",
      name: "dearme-proxy",
      token: "dm_sk_test_token",
      createdAt: new Date("2026-05-10T00:00:00.000Z"),
    });
    mockSecretService.create.mockResolvedValue({
      id: "secret-1",
    });
    mockSecretService.normalizeAdapterConfigForPersistence.mockRejectedValue(failure);
    mockAgentService.revokeKey.mockResolvedValue({
      id: "key-1",
    });
    mockSecretService.remove.mockResolvedValue({
      id: "secret-1",
    });

    await expect(
      issueDearMeProxyCredentialForChiefOfStaff({
        db: {} as Db,
        companyId: "company-1",
        agent: {
          id: "agent-1",
          adapterConfig: {
            model: "gpt-3.5",
          },
        },
        actor: {
          userId: "user-1",
          agentId: null,
        },
      }),
    ).rejects.toThrow("normalize failed");

    expect(mockAgentService.revokeKey).toHaveBeenCalledWith("agent-1", "key-1");
    expect(mockSecretService.remove).toHaveBeenCalledWith("secret-1");
    expect(mockAgentService.update).not.toHaveBeenCalled();
  });
});
