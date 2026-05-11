import { SECRET_PROVIDERS, type SecretProvider } from "@paperclipai/shared";
import { getSecretProvider } from "../secrets/provider-registry.js";
import type { StoredSecretVersionMaterial } from "../secrets/types.js";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const DEFAULT_X_TWEETS_URL = "https://api.x.com/2/tweets";
const X_POST_TEXT_LIMIT = 280;

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export interface DearMeXPostDispatchConfig {
  tweetsUrl?: string;
  fetch?: FetchLike;
  now?: () => Date;
  resolveCredential?: (encryptedCredential: string) => Promise<string>;
}

interface DearMeXCredential {
  provider: "x";
  tokenType: "Bearer";
  accessToken: string;
  scopes: readonly string[];
  expiresAt: Date | null;
}

interface XPostPayload {
  text: string;
  replyToTweetId?: string;
  mediaIds?: readonly string[];
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

function stringArrayField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value)) return null;
  const strings = value
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter(Boolean);
  return strings.length === value.length ? strings : null;
}

function hasField(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function textLength(value: string) {
  return Array.from(value).length;
}

function error(message: string): Awaited<ReturnType<ChannelDispatch>> {
  return { kind: "errored", error: message };
}

function authError(reason: string): Awaited<ReturnType<ChannelDispatch>> {
  return { kind: "auth-error", reason };
}

function isSecretProvider(value: string): value is SecretProvider {
  return SECRET_PROVIDERS.includes(value as SecretProvider);
}

async function safeJson(response: FetchResponseLike) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parsePostPayload(payload: unknown): { ok: true; value: XPostPayload } | { ok: false; error: string } {
  const record = asRecord(payload);
  if (!record) return { ok: false, error: "x-post-payload-invalid" };

  const text = stringField(record, "text");
  const mediaIds = stringArrayField(record, "mediaIds");
  if (!text) return { ok: false, error: "x-post-payload-missing-text" };
  if (hasField(record, "mediaIds") && !mediaIds) {
    return { ok: false, error: "x-post-media-ids-invalid" };
  }
  if (textLength(text) > X_POST_TEXT_LIMIT) {
    return { ok: false, error: "x-post-text-too-long" };
  }

  const replyToTweetId = stringField(record, "replyToTweetId");
  if (hasField(record, "replyToTweetId") && !replyToTweetId) {
    return { ok: false, error: "x-post-reply-id-invalid" };
  }
  return {
    ok: true,
    value: {
      text,
      ...(replyToTweetId ? { replyToTweetId } : {}),
      ...(mediaIds && mediaIds.length > 0 ? { mediaIds } : {}),
    },
  };
}

function parseCredentialPayload(plaintext: string, now: Date) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return authError("x-credential-invalid-json");
  }

  const record = asRecord(parsed);
  if (!record || stringField(record, "provider") !== "x") {
    return authError("x-credential-invalid-provider");
  }

  const accessToken = stringField(record, "accessToken");
  if (!accessToken) return authError("x-credential-missing-access-token");

  const scopes = stringArrayField(record, "scopes") ?? [];
  if (!scopes.includes("tweet.write")) {
    return authError("x-credential-missing-tweet-write-scope");
  }

  const expiresAtRaw = record.expiresAt;
  let expiresAt: Date | null = null;
  if (typeof expiresAtRaw === "string" && expiresAtRaw.trim().length > 0) {
    expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) return authError("x-credential-invalid-expiry");
    if (expiresAt.getTime() <= now.getTime()) return authError("x-credential-expired");
  }

  const tokenType = stringField(record, "tokenType") ?? "bearer";
  if (tokenType.toLowerCase() !== "bearer") return authError("x-credential-unsupported-token-type");
  return {
    kind: "credential" as const,
    credential: {
      provider: "x",
      tokenType: "Bearer",
      accessToken,
      scopes,
      expiresAt,
    } satisfies DearMeXCredential,
  };
}

export async function resolveDearMeXPostCredential(encryptedCredential: string) {
  let envelope: unknown;
  try {
    envelope = JSON.parse(encryptedCredential);
  } catch {
    throw new Error("x-credential-envelope-invalid-json");
  }

  const record = asRecord(envelope);
  const material = asRecord(record?.material);
  const providerId = record ? stringField(record, "provider") : null;
  if (!record || !providerId || !isSecretProvider(providerId) || !material) {
    throw new Error("x-credential-envelope-invalid");
  }

  const provider = getSecretProvider(providerId);
  return provider.resolveVersion({
    material: material as StoredSecretVersionMaterial,
    externalRef:
      typeof record.externalRef === "string" && record.externalRef.trim().length > 0
        ? record.externalRef
        : null,
  });
}

function buildXPostRequest(payload: XPostPayload) {
  const body: Record<string, unknown> = {};
  if (payload.text) body.text = payload.text;
  if (payload.replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: payload.replyToTweetId };
  }
  if (payload.mediaIds && payload.mediaIds.length > 0) {
    body.media = { media_ids: payload.mediaIds };
  }
  return body;
}

function buildTweetUrl(tweetId: string) {
  return `https://x.com/i/web/status/${encodeURIComponent(tweetId)}`;
}

export function createDearMeXPostDispatch(
  config: DearMeXPostDispatchConfig = {},
): ChannelDispatch {
  const tweetsUrl = config.tweetsUrl ?? DEFAULT_X_TWEETS_URL;
  const fetchImpl: FetchLike =
    config.fetch ?? ((url, init) => fetch(url, init as RequestInit));
  const now = config.now ?? (() => new Date());
  const resolveCredential = config.resolveCredential ?? resolveDearMeXPostCredential;

  return async (input) => {
    if (input.toolName !== "post_x") return error(`x-post-dispatch-binding-mismatch:${input.toolName}`);

    const payload = parsePostPayload(input.payload);
    if (!payload.ok) return error(payload.error);

    let plaintextCredential: string;
    try {
      plaintextCredential = await resolveCredential(input.encryptedCredential);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "x-credential-resolve-failed";
      return authError(message);
    }

    const parsedCredential = parseCredentialPayload(plaintextCredential, now());
    if (parsedCredential.kind !== "credential") return parsedCredential;

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(tweetsUrl, {
        method: "POST",
        headers: {
          Authorization: `${parsedCredential.credential.tokenType} ${parsedCredential.credential.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildXPostRequest(payload.value)),
      });
    } catch (caught) {
      const message = caught instanceof Error && caught.message.trim().length > 0
        ? caught.message.trim()
        : "request-failed";
      return error(`x-post-request-failed:${message}`);
    }

    if (!response.ok) {
      const suffix = response.statusText && response.statusText.trim().length > 0
        ? `:${response.statusText.trim()}`
        : "";
      if (response.status === 401 || response.status === 403) {
        return authError(`x-post-auth-failed:${response.status}${suffix}`);
      }
      return error(`x-post-failed:${response.status}${suffix}`);
    }

    const responseBody = asRecord(await safeJson(response));
    const data = responseBody ? asRecord(responseBody.data) : null;
    const tweetId = data ? stringField(data, "id") : null;
    if (!tweetId) return error("x-post-returned-incomplete-data");

    return {
      kind: "delivered",
      externalId: tweetId,
      externalUrl: buildTweetUrl(tweetId),
      paid: false,
    };
  };
}
