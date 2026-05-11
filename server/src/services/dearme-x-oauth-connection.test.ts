import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import {
  createDearMeXOAuthConnectionService,
  resolveDearMeXOAuthConnectionConfigFromEnv,
} from "./dearme-x-oauth-connection.js";

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

describe("resolveDearMeXOAuthConnectionConfigFromEnv", () => {
  it("returns null until the X client id and redirect URI are both present", () => {
    expect(resolveDearMeXOAuthConnectionConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveDearMeXOAuthConnectionConfigFromEnv({
      DEARME_X_OAUTH_CLIENT_ID: "client-id",
    } as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveDearMeXOAuthConnectionConfigFromEnv({
      DEARME_X_OAUTH_REDIRECT_URI: "https://app.dearme.test/v1/channels/company-1/x/callback",
    } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("maps DearMe X OAuth env into a config object", () => {
    expect(resolveDearMeXOAuthConnectionConfigFromEnv({
      DEARME_X_OAUTH_CLIENT_ID: " client-id ",
      DEARME_X_OAUTH_CLIENT_SECRET: " client-secret ",
      DEARME_X_OAUTH_REDIRECT_URI: " https://app.dearme.test/oauth/x ",
      DEARME_X_OAUTH_SCOPES: "tweet.read tweet.write users.read",
    } as NodeJS.ProcessEnv)).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://app.dearme.test/oauth/x",
      scopes: ["tweet.read", "tweet.write", "users.read"],
      authorizeUrl: undefined,
      tokenUrl: undefined,
      usersMeUrl: undefined,
    });
  });

  it("accepts the shorter DearMe X env aliases used by worker tickets", () => {
    expect(resolveDearMeXOAuthConnectionConfigFromEnv({
      DEARME_X_CLIENT_ID: "client-id",
      DEARME_X_CLIENT_SECRET: "client-secret",
      DEARME_X_REDIRECT_URI: "https://app.dearme.test/oauth/x",
      DEARME_X_SCOPES: "tweet.read users.read",
      DEARME_X_TOKEN_URL: "https://x.example.test/token",
      DEARME_X_USER_ENDPOINT: "https://x.example.test/me",
    } as NodeJS.ProcessEnv)).toMatchObject({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://app.dearme.test/oauth/x",
      scopes: ["tweet.read", "users.read"],
      tokenUrl: "https://x.example.test/token",
      usersMeUrl: "https://x.example.test/me",
    });
  });
});

describe("createDearMeXOAuthConnectionService", () => {
  it("builds an X OAuth authorize URL with PKCE and no verifier leak", async () => {
    const service = createDearMeXOAuthConnectionService({
      clientId: "client-id",
      redirectUri: "https://app.dearme.test/v1/channels/company-1/x/callback",
      randomBytes: () => Buffer.alloc(32, 7),
    });

    const started = await service.startXConnection({
      companyId: "company-1",
      userId: "user-1",
      issueId: "issue-1",
      approvalId: "approval-1",
      openclawRunId: "run-1",
      returnTo: "https://app.dearme.test/workbench",
    });

    const url = new URL(started.oauthStartUrl);
    expect(url.origin + url.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.dearme.test/v1/channels/company-1/x/callback",
    );
    expect(url.searchParams.get("scope")).toBe("tweet.read tweet.write users.read offline.access");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(started.oauthStartUrl).not.toContain("code_verifier");
  });

  it("exchanges the callback code, looks up the X profile, and returns an opaque credential", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        access_token: "x-access-token",
        refresh_token: "x-refresh-token",
        token_type: "bearer",
        expires_in: 7200,
        scope: "tweet.read tweet.write users.read offline.access",
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: "2244994945",
          username: "XDevelopers",
          name: "X Developers",
        },
      }));
    const encryptCredential = vi.fn(async () => "enc:x:opaque");
    const service = createDearMeXOAuthConnectionService({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://app.dearme.test/v1/channels/company-1/x/callback",
      now: () => new Date("2026-05-11T12:00:00.000Z"),
      randomBytes: () => Buffer.alloc(32, 11),
      fetch: fetchMock,
      encryptCredential,
    });
    const started = await service.startXConnection({
      companyId: "company-1",
      userId: "user-1",
      returnTo: "https://app.dearme.test/workbench",
    });
    const state = new URL(started.oauthStartUrl).searchParams.get("state");

    const exchanged = await service.exchangeXConnection({
      companyId: "company-1",
      userId: "user-1",
      code: "code-123",
      state: state ?? "",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: URLSearchParams }];
    expect(tokenUrl).toBe("https://api.x.com/2/oauth2/token");
    expect(tokenInit.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`,
    });
    expect(tokenInit.body.get("grant_type")).toBe("authorization_code");
    expect(tokenInit.body.get("code")).toBe("code-123");
    expect(tokenInit.body.get("redirect_uri")).toBe(
      "https://app.dearme.test/v1/channels/company-1/x/callback",
    );
    expect(tokenInit.body.get("code_verifier")).toBeTruthy();
    expect(tokenInit.body.get("client_id")).toBeNull();

    const [profileUrl, profileInit] = fetchMock.mock.calls[1] as [string, { headers: Record<string, string> }];
    expect(profileUrl).toBe("https://api.x.com/2/users/me?user.fields=username,name,profile_image_url");
    expect(profileInit.headers.Authorization).toBe("Bearer x-access-token");
    expect(encryptCredential).toHaveBeenCalledTimes(1);
    expect(encryptCredential).toHaveBeenCalledWith(expect.stringContaining("x-access-token"));
    expect(exchanged).toMatchObject({
      encryptedCredential: "enc:x:opaque",
      externalAccountId: "2244994945",
      externalDisplayName: "@XDevelopers",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      expiresAt: new Date("2026-05-11T14:00:00.000Z"),
      returnTo: "https://app.dearme.test/workbench",
      metadata: {
        providerAppId: "client-id",
        providerProfileUrl: "https://x.com/XDevelopers",
      },
    });
    expect(exchanged.encryptedCredential).not.toContain("x-access-token");
  });

  it("drops cross-origin return URLs before completing the callback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        access_token: "x-access-token",
        token_type: "bearer",
        expires_in: 7200,
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          id: "2244994945",
          username: "XDevelopers",
          name: "X Developers",
        },
      }));
    const service = createDearMeXOAuthConnectionService({
      clientId: "client-id",
      redirectUri: "https://app.dearme.test/v1/channels/company-1/x/callback",
      randomBytes: () => Buffer.alloc(32, 13),
      fetch: fetchMock,
      encryptCredential: async () => "enc:x:opaque",
    });
    const started = await service.startXConnection({
      companyId: "company-1",
      userId: "user-1",
      returnTo: "https://evil.test/workbench",
    });
    const state = new URL(started.oauthStartUrl).searchParams.get("state");

    const exchanged = await service.exchangeXConnection({
      companyId: "company-1",
      userId: "user-1",
      code: "code-123",
      state: state ?? "",
    });

    expect(exchanged.returnTo).toBeUndefined();
  });

  it("fails closed when the callback state is missing or already consumed", async () => {
    const service = createDearMeXOAuthConnectionService({
      clientId: "client-id",
      redirectUri: "https://app.dearme.test/v1/channels/company-1/x/callback",
    });

    await expect(service.exchangeXConnection({
      companyId: "company-1",
      userId: "user-1",
      code: "code-123",
      state: "missing-state",
    })).rejects.toMatchObject({
      status: 400,
      message: "X connection state expired. Start again.",
    });
  });
});
