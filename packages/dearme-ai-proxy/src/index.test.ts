import { describe, expect, it } from "vitest";
import {
  DEARME_TOOL_DEFINITIONS,
  DEARME_TOOL_NAMES,
  DM_API_KEY_PREFIX,
  DM_PROXY_HEADERS,
  getFunctionDefinition,
  isDearMeApiKey,
} from "./index.js";

describe("dearme-ai-proxy contract", () => {
  it("exposes the 6 production-verified tool definitions", () => {
    expect(DEARME_TOOL_NAMES).toEqual([
      "create_task",
      "search_memory",
      "get_company_documents",
      "create_report",
      "web_search",
      "content_generate",
    ]);
    expect(DEARME_TOOL_DEFINITIONS.length).toBe(6);
  });

  it("preserves required-fields contracts on each tool", () => {
    expect(getFunctionDefinition("create_task")?.function.parameters.required).toEqual([
      "title",
      "description",
    ]);
    expect(getFunctionDefinition("search_memory")?.function.parameters.required).toEqual([
      "query",
    ]);
    expect(
      getFunctionDefinition("get_company_documents")?.function.parameters.required,
    ).toBeUndefined();
    expect(getFunctionDefinition("create_report")?.function.parameters.required).toEqual([
      "title",
      "content",
    ]);
    expect(getFunctionDefinition("web_search")?.function.parameters.required).toEqual([
      "query",
    ]);
    expect(getFunctionDefinition("content_generate")?.function.parameters.required).toEqual([
      "prompt",
    ]);
  });

  it("dm_sk_ prefix and key validation work as expected", () => {
    expect(DM_API_KEY_PREFIX).toBe("dm_sk_");
    expect(isDearMeApiKey("dm_sk_abc123")).toBe(true);
    expect(isDearMeApiKey("sk_test_abc123")).toBe(false);
    expect(isDearMeApiKey("dm_pk_abc123")).toBe(false);
  });

  it("exposes the 5 cost-attribution side-channel header names", () => {
    expect(DM_PROXY_HEADERS).toMatchObject({
      subscriptionId: "X-Subscription-ID",
      task: "X-DearMe-Task",
      authorization: "Authorization",
      modelTier: "X-DearMe-Model-Tier",
      correlationId: "X-DearMe-Correlation-Id",
    });
  });
});
