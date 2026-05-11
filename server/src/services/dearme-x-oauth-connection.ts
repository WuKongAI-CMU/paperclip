import { createHash, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { HttpError } from "../errors.js";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import type {
  DearMeXConnectionCallbackExchangeInput,
  DearMeXConnectionCallbackExchangeResult,
  DearMeXConnectionStartInput,
  DearMeXConnectionStartResult,
} from "../routes/dearme-channel-connections.js";

const DEFAULT_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const DEFAULT_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const DEFAULT_USERS_ME_URL =
  "https://api.x.com/2/users/me?user.fields=username,name,profile_image_url";
const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"] as const;

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: URLSearchParams | string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

interface PendingXOAuthState {
  companyId: string;
  userId: string;
  issueId?: string;
  approvalId?: string;
  openclawRunId?: string;
  returnTo?: string;
  redirectUri: string;
  codeVerifier: string;
  scopes: readonly string[];
  createdAt: number;
  expiresAt: number;
}

export interface DearMeXOAuthConnectionConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: readonly string[];
  authorizeUrl?: string;
  tokenUrl?: string;
  usersMeUrl?: string;
  stateTtlMs?: number;
  fetch?: FetchLike;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
  encryptCredential?: (plaintext: string) => Promise<string>;
}

export interface DearMeXOAuthConnectionService {
  startXConnection(input: DearMeXConnectionStartInput): Promise<DearMeXConnectionStartResult>;
  exchangeXConnection(
    input: DearMeXConnectionCallbackExchangeInput,
  ): Promise<DearMeXConnectionCallbackExchangeResult>;
}

function nonEmpty(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function parseScopes(value: string | undefined): readonly string[] | null {
  const scopes = value
    ?.split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes && scopes.length > 0 ? scopes : null;
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function codeChallengeFromVerifier(verifier: string) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function splitScopeField(value: string | null, fallback: readonly string[]) {
  const scopes = value
    ?.split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes && scopes.length > 0 ? scopes : [...fallback];
}

function providerError(status: number, statusText: string | undefined, label: string) {
  const detail = statusText && statusText.trim().length > 0 ? `:${statusText.trim()}` : "";
  return new HttpError(502, `${label}-failed:${status}${detail}`);
}

function safeRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeReturnToUrl(value: string | undefined, allowedOrigin: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (url.origin !== allowedOrigin) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

async function defaultEncryptCredential(plaintext: string) {
  const prepared = await localEncryptedProvider.createVersion({
    value: plaintext,
    externalRef: null,
  });
  return JSON.stringify({
    provider: localEncryptedProvider.id,
    material: prepared.material,
    valueSha256: prepared.valueSha256,
    externalRef: prepared.externalRef,
  });
}

export function resolveDearMeXOAuthConnectionConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeXOAuthConnectionConfig | null {
  const clientId =
    nonEmpty(env.DEARME_X_OAUTH_CLIENT_ID) ??
    nonEmpty(env.DEARME_X_CLIENT_ID) ??
    nonEmpty(env.X_OAUTH_CLIENT_ID);
  const redirectUri =
    nonEmpty(env.DEARME_X_OAUTH_REDIRECT_URI) ??
    nonEmpty(env.DEARME_X_REDIRECT_URI) ??
    nonEmpty(env.X_OAUTH_REDIRECT_URI);
  if (!clientId || !redirectUri) return null;

  return {
    clientId,
    clientSecret:
      nonEmpty(env.DEARME_X_OAUTH_CLIENT_SECRET) ??
      nonEmpty(env.DEARME_X_CLIENT_SECRET) ??
      nonEmpty(env.X_OAUTH_CLIENT_SECRET) ??
      undefined,
    redirectUri,
    scopes: parseScopes(env.DEARME_X_OAUTH_SCOPES ?? env.DEARME_X_SCOPES) ?? DEFAULT_SCOPES,
    authorizeUrl:
      nonEmpty(env.DEARME_X_OAUTH_AUTHORIZE_URL) ??
      nonEmpty(env.DEARME_X_AUTHORIZE_URL) ??
      undefined,
    tokenUrl:
      nonEmpty(env.DEARME_X_OAUTH_TOKEN_URL) ??
      nonEmpty(env.DEARME_X_TOKEN_URL) ??
      undefined,
    usersMeUrl:
      nonEmpty(env.DEARME_X_API_ME_URL) ??
      nonEmpty(env.DEARME_X_USER_ENDPOINT) ??
      undefined,
  };
}

export function createDearMeXOAuthConnectionService(
  config: DearMeXOAuthConnectionConfig,
): DearMeXOAuthConnectionService {
  const authorizeUrl = config.authorizeUrl ?? DEFAULT_AUTHORIZE_URL;
  const tokenUrl = config.tokenUrl ?? DEFAULT_TOKEN_URL;
  const usersMeUrl = config.usersMeUrl ?? DEFAULT_USERS_ME_URL;
  const scopes = config.scopes && config.scopes.length > 0 ? config.scopes : DEFAULT_SCOPES;
  const stateTtlMs = Math.max(30_000, Math.floor(config.stateTtlMs ?? DEFAULT_STATE_TTL_MS));
  const now = config.now ?? (() => new Date());
  const getRandomBytes = config.randomBytes ?? randomBytes;
  const fetchImpl: FetchLike =
    config.fetch ?? ((url, init) => fetch(url, init as RequestInit));
  const encryptCredential = config.encryptCredential ?? defaultEncryptCredential;
  const pendingStates = new Map<string, PendingXOAuthState>();

  function consumeState(state: string) {
    const pending = pendingStates.get(state) ?? null;
    pendingStates.delete(state);
    if (!pending) return null;
    if (pending.expiresAt < now().getTime()) return null;
    return pending;
  }

  return {
    async startXConnection(input) {
      const redirectUri = safeRedirectUri(config.redirectUri);
      if (!redirectUri) {
        throw new HttpError(503, "X connection start is not configured.");
      }

      const allowedReturnOrigin = new URL(redirectUri).origin;
      const state = base64Url(getRandomBytes(32));
      const codeVerifier = base64Url(getRandomBytes(32));
      const createdAt = now().getTime();
      pendingStates.set(state, {
        companyId: input.companyId,
        userId: input.userId,
        issueId: input.issueId,
        approvalId: input.approvalId,
        openclawRunId: input.openclawRunId,
        returnTo: safeReturnToUrl(input.returnTo, allowedReturnOrigin),
        redirectUri,
        codeVerifier,
        scopes,
        createdAt,
        expiresAt: createdAt + stateTtlMs,
      });

      const url = new URL(authorizeUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallengeFromVerifier(codeVerifier));
      url.searchParams.set("code_challenge_method", "S256");
      return { oauthStartUrl: url.toString() };
    },

    async exchangeXConnection(input) {
      const pending = consumeState(input.state);
      if (!pending) {
        throw new HttpError(400, "X connection state expired. Start again.");
      }
      if (pending.companyId !== input.companyId || pending.userId !== input.userId) {
        throw new HttpError(403, "X connection state does not match this session.");
      }
      if (input.redirectUri && safeRedirectUri(input.redirectUri) !== pending.redirectUri) {
        throw new HttpError(400, "X connection redirect URI does not match this session.");
      }

      const body = new URLSearchParams({
        code: input.code,
        grant_type: "authorization_code",
        redirect_uri: pending.redirectUri,
        code_verifier: pending.codeVerifier,
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (config.clientSecret) {
        headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
      } else {
        body.set("client_id", config.clientId);
      }

      const tokenResponse = await fetchImpl(tokenUrl, {
        method: "POST",
        headers,
        body,
      });
      if (!tokenResponse.ok) {
        throw providerError(tokenResponse.status, tokenResponse.statusText, "x-oauth-token-exchange");
      }
      const tokenPayload = asRecord(await tokenResponse.json());
      const accessToken = tokenPayload ? stringField(tokenPayload, "access_token") : null;
      if (!tokenPayload || !accessToken) {
        throw new HttpError(502, "x-oauth-token-exchange-returned-incomplete-data");
      }

      const userResponse = await fetchImpl(usersMeUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!userResponse.ok) {
        throw providerError(userResponse.status, userResponse.statusText, "x-user-profile-lookup");
      }
      const userPayload = asRecord(await userResponse.json());
      const user = userPayload ? asRecord(userPayload.data) : null;
      const externalAccountId = user ? stringField(user, "id") : null;
      const username = user ? stringField(user, "username") : null;
      const name = user ? stringField(user, "name") : null;
      if (!externalAccountId || (!username && !name)) {
        throw new HttpError(502, "x-user-profile-lookup-returned-incomplete-data");
      }

      const grantedScopes = splitScopeField(stringField(tokenPayload, "scope"), pending.scopes);
      const expiresIn = numberField(tokenPayload, "expires_in");
      const expiresAt = expiresIn ? new Date(now().getTime() + expiresIn * 1000) : null;
      const externalDisplayName = username ? `@${username}` : name ?? externalAccountId;
      const credential = {
        provider: "x",
        tokenType: stringField(tokenPayload, "token_type") ?? "bearer",
        accessToken,
        refreshToken: stringField(tokenPayload, "refresh_token"),
        scopes: grantedScopes,
        expiresAt: expiresAt?.toISOString() ?? null,
        obtainedAt: now().toISOString(),
        externalAccountId,
        externalDisplayName,
      };

      return {
        encryptedCredential: await encryptCredential(JSON.stringify(credential)),
        externalAccountId,
        externalDisplayName,
        scopes: grantedScopes,
        expiresAt,
        returnTo: pending.returnTo,
        metadata: {
          providerAppId: config.clientId,
          providerProfileUrl: username ? `https://x.com/${username}` : undefined,
          issueId: pending.issueId,
          approvalId: pending.approvalId,
          runId: pending.openclawRunId,
        },
      };
    },
  };
}

export function createDearMeXOAuthConnectionServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeXOAuthConnectionService | null {
  const config = resolveDearMeXOAuthConnectionConfigFromEnv(env);
  return config ? createDearMeXOAuthConnectionService(config) : null;
}
