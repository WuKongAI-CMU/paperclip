import { describe, expect, it } from "vitest";
import {
  DEARME_TOOL_DEFINITIONS,
  DEARME_TOOL_NAMES,
  DEARME_PROXY_MODEL_ROUTING_TABLE,
  DM_API_KEY_PREFIX,
  DM_PROXY_HEADERS,
  pickDearMeProxyModelForComplexity,
  resolveDearMeProxyModelRouting,
  VOICE_GATE_ARTIFACT_KINDS,
  VOICE_GATE_DEFAULT_FLOOR,
  VOICE_GATE_PATH,
  buildVoiceGateUrl,
  getFunctionDefinition,
  isDearMeApiKey,
} from "./index.js";
import {
  DEARME_PROXY_MODEL_ROUTING_TABLE as DEARME_PROXY_MODEL_ROUTING_TABLE_SUBPATH,
  pickDearMeProxyModelForComplexity as pickDearMeProxyModelForComplexitySubpath,
  resolveDearMeProxyModelRouting as resolveDearMeProxyModelRoutingSubpath,
} from "@paperclipai/dearme-ai-proxy/model-routing";

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

  it("voice-gate path / floor / artifact kinds are stable", () => {
    expect(VOICE_GATE_PATH).toBe("/v1/voice/score");
    expect(VOICE_GATE_DEFAULT_FLOOR).toBe(92);
    expect(VOICE_GATE_ARTIFACT_KINDS).toEqual([
      "x-tweet",
      "x-thread",
      "linkedin-post",
      "linkedin-dm",
      "newsletter-issue",
      "site-bio",
      "site-page",
      "outbound-email",
    ]);
  });

  it("re-exports the canonical routing table and proxy helper at the package boundary", () => {
    expect(DEARME_PROXY_MODEL_ROUTING_TABLE).toBe(DEARME_PROXY_MODEL_ROUTING_TABLE_SUBPATH);
    expect(DEARME_PROXY_MODEL_ROUTING_TABLE).toEqual([
      {
        tier: "fast",
        complexityMin: 1,
        complexityMax: 3,
        model: "gemini-2.0-flash-lite",
        approxBlendedUsdPerMTokens: 0.18,
      },
      {
        tier: "balanced",
        complexityMin: 4,
        complexityMax: 6,
        model: "claude-haiku-4-5",
        approxBlendedUsdPerMTokens: 3,
      },
      {
        tier: "deep",
        complexityMin: 7,
        complexityMax: 10,
        model: "claude-sonnet-4-6",
        approxBlendedUsdPerMTokens: 9,
      },
    ]);
    expect(pickDearMeProxyModelForComplexity).toBe(pickDearMeProxyModelForComplexitySubpath);
    expect(resolveDearMeProxyModelRouting).toBe(resolveDearMeProxyModelRoutingSubpath);
  });

  it("resolves the same 1-10 complexity routing contract as the prompt package", () => {
    expect(resolveDearMeProxyModelRouting(1)).toMatchObject({
      complexity: 1,
      tier: "fast",
      model: "gemini-2.0-flash-lite",
    });
    expect(resolveDearMeProxyModelRouting(3)).toMatchObject({
      complexity: 3,
      tier: "fast",
      model: "gemini-2.0-flash-lite",
    });
    expect(resolveDearMeProxyModelRouting(4)).toMatchObject({
      complexity: 4,
      tier: "balanced",
      model: "claude-haiku-4-5",
    });
    expect(resolveDearMeProxyModelRouting(6)).toMatchObject({
      complexity: 6,
      tier: "balanced",
      model: "claude-haiku-4-5",
    });
    expect(resolveDearMeProxyModelRouting(7)).toMatchObject({
      complexity: 7,
      tier: "deep",
      model: "claude-sonnet-4-6",
    });
    expect(resolveDearMeProxyModelRouting(10)).toMatchObject({
      complexity: 10,
      tier: "deep",
      model: "claude-sonnet-4-6",
    });
    expect(resolveDearMeProxyModelRouting(99)).toMatchObject({
      complexity: 10,
      tier: "deep",
      model: "claude-sonnet-4-6",
    });
    expect(resolveDearMeProxyModelRouting(-5)).toMatchObject({
      complexity: 1,
      tier: "fast",
      model: "gemini-2.0-flash-lite",
    });
  });

  it("buildVoiceGateUrl trims trailing slashes and appends the path", () => {
    expect(buildVoiceGateUrl("https://api.dearme.app")).toBe(
      "https://api.dearme.app/v1/voice/score",
    );
    expect(buildVoiceGateUrl("https://api.dearme.app/")).toBe(
      "https://api.dearme.app/v1/voice/score",
    );
    expect(buildVoiceGateUrl("https://api.dearme.app///")).toBe(
      "https://api.dearme.app/v1/voice/score",
    );
  });
});
