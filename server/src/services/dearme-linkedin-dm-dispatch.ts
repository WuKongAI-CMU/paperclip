import { resolveDearMeChannelCredential } from "./dearme-channel-credential.js";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const LINKEDIN_DM_USER_AGENT = "DearMe/0.1";
const LINKEDIN_DM_BODY_LIMIT = 1000;
const LINKEDIN_DM_SUBJECT_LIMIT = 200;
const LINKEDIN_DM_RECIPIENT_URN_LIMIT = 512;

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

export interface DearMeLinkedInDmDispatchConfig {
  /**
   * DearMe-owned or official partner endpoint that sends a LinkedIn DM after
   * the wrapper has completed voice gate, approval, and active-channel lookup.
   */
  messagesUrl?: string | null;
  fetch?: FetchLike;
  now?: () => Date;
  resolveCredential?: (encryptedCredential: string) => Promise<string>;
}

type DearMeLinkedInProvider = "linkedin_partner" | "hootsuite";

interface DearMeLinkedInDmCredential {
  provider: DearMeLinkedInProvider;
  tokenType: "Bearer";
  accessToken: string;
  capabilities: readonly string[];
  expiresAt: Date | null;
}

interface SendLinkedInDmPayload {
  recipientUrn: string;
  body: string;
  subject?: string;
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

async function safeJson(response: FetchResponseLike) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function optionalStringField(
  record: Record<string, unknown>,
  key: string,
  errorMessage: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (!hasField(record, key)) return { ok: true, value: null };
  const value = stringField(record, key);
  return value ? { ok: true, value } : { ok: false, error: errorMessage };
}

function parseSendLinkedInDmPayload(
  payload: unknown,
): { ok: true; value: SendLinkedInDmPayload } | { ok: false; error: string } {
  const record = asRecord(payload);
  if (!record) return { ok: false, error: "linkedin-dm-payload-invalid" };

  const recipientUrn = stringField(record, "recipientUrn");
  if (!recipientUrn) return { ok: false, error: "linkedin-dm-payload-missing-recipient-urn" };
  if (textLength(recipientUrn) > LINKEDIN_DM_RECIPIENT_URN_LIMIT) {
    return { ok: false, error: "linkedin-dm-recipient-urn-too-long" };
  }

  const body = stringField(record, "body");
  if (!body) return { ok: false, error: "linkedin-dm-payload-missing-body" };
  if (textLength(body) > LINKEDIN_DM_BODY_LIMIT) {
    return { ok: false, error: "linkedin-dm-body-too-long" };
  }

  const subject = optionalStringField(record, "subject", "linkedin-dm-subject-invalid");
  if (!subject.ok) return subject;
  if (subject.value && textLength(subject.value) > LINKEDIN_DM_SUBJECT_LIMIT) {
    return { ok: false, error: "linkedin-dm-subject-too-long" };
  }

  return {
    ok: true,
    value: {
      recipientUrn,
      body,
      ...(subject.value ? { subject: subject.value } : {}),
    },
  };
}

function isSupportedProvider(value: string | null): value is DearMeLinkedInProvider {
  return value === "linkedin_partner" || value === "hootsuite";
}

function parseCredentialPayload(plaintext: string, now: Date) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return authError("linkedin-dm-credential-invalid-json");
  }

  const record = asRecord(parsed);
  const provider = record ? stringField(record, "provider") : null;
  if (!record || !isSupportedProvider(provider)) {
    return authError("linkedin-dm-credential-invalid-provider");
  }

  const accessToken = stringField(record, "accessToken");
  if (!accessToken) return authError("linkedin-dm-credential-missing-access-token");

  const capabilities = stringArrayField(record, "capabilities") ?? [];
  if (!capabilities.includes("send_dm")) {
    return authError("linkedin-dm-credential-missing-send-dm-capability");
  }

  const expiresAtRaw = record.expiresAt;
  let expiresAt: Date | null = null;
  if (typeof expiresAtRaw === "string" && expiresAtRaw.trim().length > 0) {
    expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) return authError("linkedin-dm-credential-invalid-expiry");
    if (expiresAt.getTime() <= now.getTime()) return authError("linkedin-dm-credential-expired");
  }

  const tokenType = stringField(record, "tokenType") ?? "bearer";
  if (tokenType.toLowerCase() !== "bearer") {
    return authError("linkedin-dm-credential-unsupported-token-type");
  }

  return {
    kind: "credential" as const,
    credential: {
      provider,
      tokenType: "Bearer",
      accessToken,
      capabilities,
      expiresAt,
    } satisfies DearMeLinkedInDmCredential,
  };
}

export async function resolveDearMeLinkedInDmCredential(encryptedCredential: string) {
  return resolveDearMeChannelCredential(encryptedCredential, "linkedin-dm");
}

function normalizeMessagesUrl(messagesUrl: string | null | undefined) {
  const trimmed = typeof messagesUrl === "string" ? messagesUrl.trim() : "";
  if (!trimmed) return { ok: false as const, error: "linkedin-dm-provider-unconfigured" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false as const, error: "linkedin-dm-provider-url-invalid" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false as const, error: "linkedin-dm-provider-url-invalid" };
  }
  return { ok: true as const, value: parsed.toString() };
}

function buildLinkedInDmRequest(payload: SendLinkedInDmPayload, dispatchContext: Parameters<ChannelDispatch>[0]["dispatchContext"]) {
  return {
    recipientUrn: payload.recipientUrn,
    body: payload.body,
    ...(payload.subject ? { subject: payload.subject } : {}),
    context: {
      companyId: dispatchContext.companyId,
      issueId: dispatchContext.issueId,
      openclawRunId: dispatchContext.openclawRunId,
      approvalId: dispatchContext.approvalId ?? null,
    },
  };
}

function responseRecord(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.data) ?? record;
}

export function createDearMeLinkedInDmDispatch(
  config: DearMeLinkedInDmDispatchConfig = {},
): ChannelDispatch {
  const fetchImpl: FetchLike =
    config.fetch ?? ((url, init) => fetch(url, init as RequestInit));
  const now = config.now ?? (() => new Date());
  const resolveCredential = config.resolveCredential ?? resolveDearMeLinkedInDmCredential;

  return async (input) => {
    if (input.toolName !== "send_linkedin_dm") {
      return error(`linkedin-dm-dispatch-binding-mismatch:${input.toolName}`);
    }

    const payload = parseSendLinkedInDmPayload(input.payload);
    if (!payload.ok) return error(payload.error);

    const messagesUrl = normalizeMessagesUrl(config.messagesUrl);
    if (!messagesUrl.ok) return error(messagesUrl.error);

    let plaintextCredential: string;
    try {
      plaintextCredential = await resolveCredential(input.encryptedCredential);
    } catch (caught) {
      const message = caught instanceof Error && caught.message.trim().length > 0
        ? caught.message.trim()
        : "linkedin-dm-credential-resolve-failed";
      return authError(message);
    }

    const parsedCredential = parseCredentialPayload(plaintextCredential, now());
    if (parsedCredential.kind !== "credential") return parsedCredential;

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(messagesUrl.value, {
        method: "POST",
        headers: {
          Authorization: `${parsedCredential.credential.tokenType} ${parsedCredential.credential.accessToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.dispatchContext.idempotencyKey.slice(0, 256),
          "User-Agent": LINKEDIN_DM_USER_AGENT,
        },
        body: JSON.stringify(buildLinkedInDmRequest(payload.value, input.dispatchContext)),
      });
    } catch (caught) {
      const message = caught instanceof Error && caught.message.trim().length > 0
        ? caught.message.trim()
        : "request-failed";
      return error(`linkedin-dm-request-failed:${message}`);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return authError(`linkedin-dm-send-auth-failed:${response.status}`);
      }
      return error(`linkedin-dm-send-failed:${response.status}`);
    }

    const body = responseRecord(await safeJson(response));
    const conversationUrn = body ? stringField(body, "conversationUrn") : null;
    const messageUrn = body ? stringField(body, "messageUrn") : null;
    if (!conversationUrn || !messageUrn) {
      return error("linkedin-dm-returned-incomplete-data");
    }

    return {
      kind: "delivered",
      externalId: messageUrn,
      externalUrl:
        body
          ? stringField(body, "conversationUrl") ?? stringField(body, "url") ?? undefined
          : undefined,
      paid: false,
    };
  };
}
