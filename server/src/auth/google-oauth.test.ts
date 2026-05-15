import { describe, expect, it } from "vitest";
import { google } from "better-auth/social-providers";
import { buildBetterAuthSocialProvidersFromEnv } from "./better-auth.js";

describe("DearMe Google OAuth provider", () => {
  it("registers Google when both OAuth credentials are set", () => {
    const socialProviders = buildBetterAuthSocialProvidersFromEnv({
      DEARME_GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
      DEARME_GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    });

    expect(socialProviders?.google).toMatchObject({
      clientId: "google-client-id",
      clientSecret: "google-client-secret",
      disableDefaultScope: true,
      scope: ["openid", "email", "profile"],
    });
  });

  it("does not register Google when OAuth credentials are unset", () => {
    const socialProviders = buildBetterAuthSocialProvidersFromEnv({});

    expect(socialProviders?.google).toBeUndefined();
    expect(socialProviders).toBeUndefined();
  });

  it("renders a Google sign-in URL with the expected scopes", async () => {
    const socialProviders = buildBetterAuthSocialProvidersFromEnv({
      DEARME_GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
      DEARME_GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    });
    expect(socialProviders?.google).toBeDefined();

    const provider = google(socialProviders!.google!);
    const signInUrl = await provider.createAuthorizationURL({
      state: "state",
      codeVerifier: "code-verifier",
      redirectURI: "http://localhost:3100/api/auth/callback/google",
    });

    expect(signInUrl.origin).toBe("https://accounts.google.com");
    expect(signInUrl.searchParams.get("client_id")).toBe("google-client-id");
    expect(signInUrl.searchParams.get("scope")).toBe("openid email profile");
  });
});
