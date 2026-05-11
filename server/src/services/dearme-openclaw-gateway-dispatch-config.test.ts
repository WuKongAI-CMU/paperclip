import { describe, expect, it } from "vitest";
import { resolveDearMeOpenClawGatewayDispatchConfigFromEnv } from "./dearme-openclaw-gateway-dispatch-config.js";

describe("resolveDearMeOpenClawGatewayDispatchConfigFromEnv", () => {
  it("returns null when gateway config is absent", () => {
    expect(resolveDearMeOpenClawGatewayDispatchConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("maps the existing OpenClaw env convention into dispatch config", () => {
    const config = resolveDearMeOpenClawGatewayDispatchConfigFromEnv({
      OPENCLAW_GATEWAY_URL: " wss://gateway.example ",
      OPENCLAW_GATEWAY_TOKEN: " gateway-token ",
      PAPERCLIP_API_URL: "http://paperclip.local/api",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      url: "wss://gateway.example",
      headers: {
        "x-openclaw-token": "gateway-token",
      },
      paperclipApiUrl: "http://paperclip.local/api",
    });
  });

  it("accepts the legacy bearer-shaped auth env from smoke tooling", () => {
    const config = resolveDearMeOpenClawGatewayDispatchConfigFromEnv({
      OPENCLAW_GATEWAY_URL: "ws://gateway.example",
      OPENCLAW_WEBHOOK_AUTH: "Bearer gateway-token",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      url: "ws://gateway.example",
      headers: {
        "x-openclaw-token": "gateway-token",
      },
      paperclipApiUrl: null,
    });
  });
});
