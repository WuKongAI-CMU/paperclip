import { describe, expect, it } from "vitest";
import { resolveDearMeMetaCampaignDispatchConfigFromEnv } from "./dearme-meta-campaign-dispatch-config.js";

describe("resolveDearMeMetaCampaignDispatchConfigFromEnv", () => {
  it("returns null when Meta Graph config is absent", () => {
    expect(resolveDearMeMetaCampaignDispatchConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("maps the preferred Meta campaign Graph API env into dispatch config", () => {
    const config = resolveDearMeMetaCampaignDispatchConfigFromEnv({
      DEARME_META_CAMPAIGN_GRAPH_API_BASE_URL: " https://graph.facebook.com/v25.0/ ",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      graphApiBaseUrl: "https://graph.facebook.com/v25.0/",
    });
  });

  it("accepts Meta Graph aliases used by smoke tooling", () => {
    expect(resolveDearMeMetaCampaignDispatchConfigFromEnv({
      DEARME_META_GRAPH_API_BASE_URL: "https://graph.example.test/v26.0",
    } as NodeJS.ProcessEnv)).toEqual({
      graphApiBaseUrl: "https://graph.example.test/v26.0",
    });

    expect(resolveDearMeMetaCampaignDispatchConfigFromEnv({
      META_GRAPH_API_BASE_URL: "https://graph.legacy.example.test/v25.0",
    } as NodeJS.ProcessEnv)).toEqual({
      graphApiBaseUrl: "https://graph.legacy.example.test/v25.0",
    });
  });
});
