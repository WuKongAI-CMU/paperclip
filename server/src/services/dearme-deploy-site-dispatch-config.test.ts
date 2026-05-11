import { describe, expect, it } from "vitest";
import { resolveDearMeDeploySiteDispatchConfigFromEnv } from "./dearme-deploy-site-dispatch-config.js";

describe("resolveDearMeDeploySiteDispatchConfigFromEnv", () => {
  it("returns null when deploy-site host config is absent", () => {
    expect(resolveDearMeDeploySiteDispatchConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("maps the preferred DearMe deploy-site env into dispatch config", () => {
    const config = resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_DEPLOY_SITE_BASE_URL: " https://sites.dearme.example/ ",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      siteBaseUrl: "https://sites.dearme.example/",
      allowProduction: false,
      allowCustomDomains: false,
    });
  });

  it("accepts legacy site host aliases and explicit production opt-in", () => {
    const config = resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_SITE_BASE_URL: "https://dearme.example.test",
      DEARME_SITE_ALLOW_PRODUCTION: "yes",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      siteBaseUrl: "https://dearme.example.test",
      allowProduction: true,
      allowCustomDomains: false,
    });
  });

  it("can enable production receipts on the default DearMe host", () => {
    const config = resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "1",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      allowProduction: true,
      allowCustomDomains: false,
    });
  });

  it("can enable custom-domain receipts without changing the default host", () => {
    const config = resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_DEPLOY_SITE_ALLOW_CUSTOM_DOMAINS: "true",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      allowProduction: false,
      allowCustomDomains: true,
    });
  });

  it("keeps production disabled for false or malformed flags", () => {
    expect(resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.dearme.example",
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "off",
    } as NodeJS.ProcessEnv)).toEqual({
      siteBaseUrl: "https://sites.dearme.example",
      allowProduction: false,
      allowCustomDomains: false,
    });

    expect(resolveDearMeDeploySiteDispatchConfigFromEnv({
      DEARME_DEPLOY_SITE_BASE_URL: "https://sites.dearme.example",
      DEARME_DEPLOY_SITE_ALLOW_PRODUCTION: "sure",
    } as NodeJS.ProcessEnv)).toEqual({
      siteBaseUrl: "https://sites.dearme.example",
      allowProduction: false,
      allowCustomDomains: false,
    });
  });
});
