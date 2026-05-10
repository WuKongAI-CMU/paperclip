import { describe, expect, it, vi } from "vitest";
import { agentService } from "../services/agents.ts";

function createDb() {
  const createdAt = new Date("2026-05-10T00:00:00.000Z");
  let lastInserted: Record<string, unknown> | null = null;
  const agentRow = {
    id: "agent-1",
    companyId: "company-1",
    name: "Builder",
    role: "engineer",
    title: null,
    reportsTo: null,
    capabilities: null,
    adapterType: "process",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    metadata: null,
    permissions: null,
    status: "idle",
    pauseReason: null,
    pausedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
  let selectCallCount = 0;
  const insert = vi.fn(() => ({
    values(values: Record<string, unknown>) {
      lastInserted = values;
      return {
        returning() {
          return Promise.resolve([
            {
              id: "key-1",
              name: values.name,
              createdAt,
            },
          ]);
        },
      };
    },
  }));

  return {
    db: {
      select: vi.fn(() => {
        const callIndex = selectCallCount++;
        if (callIndex % 2 === 0) {
          return {
            from() {
              return {
                where() {
                  return Promise.resolve([agentRow]);
                },
              };
            },
          };
        }

        return {
          from() {
            return {
              where() {
                return {
                  groupBy() {
                    return Promise.resolve([]);
                  },
                };
              },
            };
          },
        };
      }),
      insert,
    } as any,
    insert,
    getLastInserted: () => lastInserted,
  };
}

describe("agent api key issuance", () => {
  it("keeps pcp_* as the default token family and allows an explicit dm_sk_* prefix", async () => {
    const { db, getLastInserted } = createDb();
    const service = agentService(db);

    const defaultKey = await service.createApiKey("agent-1", "default");
    expect(defaultKey.token).toMatch(/^pcp_/);
    expect(defaultKey.name).toBe("default");
    expect(getLastInserted()).toMatchObject({
      agentId: "agent-1",
      companyId: "company-1",
      name: "default",
    });

    const dmKey = await service.createApiKey("agent-1", "dearme-proxy", { prefix: "dm_sk_" });
    expect(dmKey.token).toMatch(/^dm_sk_/);
    expect(dmKey.name).toBe("dearme-proxy");
    expect(getLastInserted()).toMatchObject({
      agentId: "agent-1",
      companyId: "company-1",
      name: "dearme-proxy",
      keyHash: expect.any(String),
    });
  });
});
