import { describe, expect, it } from "vitest";
import { resolveDearMeLinkedInDmDispatchConfigFromEnv } from "./dearme-linkedin-dm-dispatch-config.js";

describe("resolveDearMeLinkedInDmDispatchConfigFromEnv", () => {
  it("returns null when LinkedIn partner config is absent", () => {
    expect(resolveDearMeLinkedInDmDispatchConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("maps the preferred LinkedIn DM endpoint env into dispatch config", () => {
    const config = resolveDearMeLinkedInDmDispatchConfigFromEnv({
      DEARME_LINKEDIN_DM_MESSAGES_URL: " https://linkedin-partner.example.test/messages ",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      messagesUrl: "https://linkedin-partner.example.test/messages",
    });
  });

  it("accepts partner endpoint aliases used by smoke tooling", () => {
    expect(resolveDearMeLinkedInDmDispatchConfigFromEnv({
      DEARME_LINKEDIN_PARTNER_MESSAGES_URL: "https://partner.example.test/linkedin/messages",
    } as NodeJS.ProcessEnv)).toEqual({
      messagesUrl: "https://partner.example.test/linkedin/messages",
    });

    expect(resolveDearMeLinkedInDmDispatchConfigFromEnv({
      LINKEDIN_DM_MESSAGES_URL: "https://legacy.example.test/messages",
    } as NodeJS.ProcessEnv)).toEqual({
      messagesUrl: "https://legacy.example.test/messages",
    });
  });
});
