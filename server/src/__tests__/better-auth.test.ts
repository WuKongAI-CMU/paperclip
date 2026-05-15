import { afterEach, describe, expect, it } from "vitest";
import type { BetterAuthOptions } from "better-auth";
import { getCookies } from "better-auth/cookies";
import {
  buildBetterAuthAdvancedOptions,
  deriveAuthCookiePrefix,
  deriveAuthTrustedOrigins,
} from "../auth/better-auth.js";

const ORIGINAL_INSTANCE_ID = process.env.PAPERCLIP_INSTANCE_ID;

afterEach(() => {
  if (ORIGINAL_INSTANCE_ID === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
  else process.env.PAPERCLIP_INSTANCE_ID = ORIGINAL_INSTANCE_ID;
});

describe("Better Auth cookie scoping", () => {
  it("derives an instance-scoped cookie prefix", () => {
    expect(deriveAuthCookiePrefix("default")).toBe("paperclip-default");
    expect(deriveAuthCookiePrefix("PAP-1601-worktree")).toBe("paperclip-PAP-1601-worktree");
  });

  it("uses PAPERCLIP_INSTANCE_ID for the Better Auth cookie prefix", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "sat-worktree";

    const advanced = buildBetterAuthAdvancedOptions({ secureCookies: true });

    expect(advanced).toEqual({
      cookiePrefix: "paperclip-sat-worktree",
      useSecureCookies: true,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
      },
    });
    expect(getCookies({ advanced } as BetterAuthOptions).sessionToken.name).toBe(
      "__Secure-paperclip-sat-worktree.session_token",
    );
  });

  it("hardens production session cookie attributes", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "prod";

    const cookies = getCookies({
      advanced: buildBetterAuthAdvancedOptions({ secureCookies: true }),
    } as BetterAuthOptions);

    expect(cookies.sessionToken.attributes).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("keeps local http auth cookies non-secure while preserving the scoped prefix", () => {
    process.env.PAPERCLIP_INSTANCE_ID = "pap-worktree";

    const advanced = buildBetterAuthAdvancedOptions({ secureCookies: false });

    expect(advanced).toEqual({
      cookiePrefix: "paperclip-pap-worktree",
      useSecureCookies: false,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
      },
    });
    expect(getCookies({ advanced } as BetterAuthOptions).sessionToken).toMatchObject({
      name: "paperclip-pap-worktree.session_token",
      attributes: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    });
  });

  it("adds hostname port variants for authenticated mode on non-default ports", () => {
    const trustedOrigins = deriveAuthTrustedOrigins({
      deploymentMode: "authenticated",
      authBaseUrlMode: "auto",
      authPublicBaseUrl: undefined,
      allowedHostnames: ["Board.Example.Test"],
      port: 3101,
    } as Parameters<typeof deriveAuthTrustedOrigins>[0]);

    expect(trustedOrigins).toEqual(expect.arrayContaining([
      "https://board.example.test",
      "http://board.example.test",
      "https://board.example.test:3101",
      "http://board.example.test:3101",
    ]));
  });

  it("prefers an explicit resolved listen port over the configured port", () => {
    const trustedOrigins = deriveAuthTrustedOrigins({
      deploymentMode: "authenticated",
      authBaseUrlMode: "auto",
      authPublicBaseUrl: undefined,
      allowedHostnames: ["board.example.test"],
      port: 3100,
    } as Parameters<typeof deriveAuthTrustedOrigins>[0], { listenPort: 3101 });

    expect(trustedOrigins).toEqual(expect.arrayContaining([
      "https://board.example.test:3101",
      "http://board.example.test:3101",
    ]));
    expect(trustedOrigins).not.toContain("https://board.example.test:3100");
    expect(trustedOrigins).not.toContain("http://board.example.test:3100");
  });
});
