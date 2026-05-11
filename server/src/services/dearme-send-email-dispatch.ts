import { resolveDearMeChannelCredential } from "./dearme-channel-credential.js";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const DEFAULT_RESEND_EMAILS_URL = "https://api.resend.com/emails";
const RESEND_USER_AGENT = "DearMe/0.1";
const EMAIL_SUBJECT_LIMIT = 998;
const EMAIL_BODY_LIMIT = 200_000;

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

export interface DearMeSendEmailDispatchConfig {
  emailsUrl?: string;
  fetch?: FetchLike;
  now?: () => Date;
  resolveCredential?: (encryptedCredential: string) => Promise<string>;
}

interface DearMeResendCredential {
  provider: "resend";
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  expiresAt: Date | null;
}

interface SendEmailPayload {
  toEmail: string;
  fromHandle: string;
  subject: string;
  body: string;
  threadId?: string;
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

function hasField(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
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

function isEmailAddress(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
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

function parseSendEmailPayload(
  payload: unknown,
): { ok: true; value: SendEmailPayload } | { ok: false; error: string } {
  const record = asRecord(payload);
  if (!record) return { ok: false, error: "email-payload-invalid" };

  const provider = optionalStringField(record, "provider", "email-provider-invalid");
  if (!provider.ok) return provider;
  const providerName = provider.value ?? "resend";
  if (providerName !== "resend") {
    return { ok: false, error: "email-provider-unsupported" };
  }

  const toEmail = stringField(record, "toEmail");
  if (!toEmail) return { ok: false, error: "email-payload-missing-to-email" };
  if (!isEmailAddress(toEmail)) return { ok: false, error: "email-payload-invalid-to-email" };

  const fromHandle = stringField(record, "fromHandle");
  if (!fromHandle) return { ok: false, error: "email-payload-missing-from-handle" };

  const subject = stringField(record, "subject");
  if (!subject) return { ok: false, error: "email-payload-missing-subject" };
  if (textLength(subject) > EMAIL_SUBJECT_LIMIT) {
    return { ok: false, error: "email-subject-too-long" };
  }

  const body = stringField(record, "body");
  if (!body) return { ok: false, error: "email-payload-missing-body" };
  if (textLength(body) > EMAIL_BODY_LIMIT) {
    return { ok: false, error: "email-body-too-long" };
  }

  if (hasField(record, "bodyHtml")) {
    return { ok: false, error: "email-body-html-unsupported" };
  }

  const threadId = optionalStringField(record, "threadId", "email-thread-id-invalid");
  if (!threadId.ok) return threadId;

  return {
    ok: true,
    value: {
      toEmail,
      fromHandle,
      subject,
      body,
      ...(threadId.value ? { threadId: threadId.value } : {}),
    },
  };
}

function parseCredentialPayload(plaintext: string, now: Date) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return authError("email-credential-invalid-json");
  }

  const record = asRecord(parsed);
  if (!record || stringField(record, "provider") !== "resend") {
    return authError("email-credential-invalid-provider");
  }

  const apiKey = stringField(record, "apiKey");
  if (!apiKey) return authError("email-credential-missing-api-key");

  const fromEmail = stringField(record, "fromEmail");
  if (!fromEmail) return authError("email-credential-missing-from-email");
  if (!isEmailAddress(fromEmail)) return authError("email-credential-invalid-from-email");

  const fromName = stringField(record, "fromName") ?? undefined;

  const expiresAtRaw = record.expiresAt;
  let expiresAt: Date | null = null;
  if (typeof expiresAtRaw === "string" && expiresAtRaw.trim().length > 0) {
    expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) return authError("email-credential-invalid-expiry");
    if (expiresAt.getTime() <= now.getTime()) return authError("email-credential-expired");
  }

  return {
    kind: "credential" as const,
    credential: {
      provider: "resend",
      apiKey,
      fromEmail,
      ...(fromName ? { fromName } : {}),
      expiresAt,
    } satisfies DearMeResendCredential,
  };
}

export async function resolveDearMeSendEmailCredential(encryptedCredential: string) {
  return resolveDearMeChannelCredential(encryptedCredential, "email");
}

function sanitizeDisplayName(value: string) {
  const sanitized = value.replace(/[<>\r\n"]/g, " ").replace(/\s+/g, " ").trim();
  return sanitized.length > 0 ? sanitized : null;
}

function buildFromAddress(payload: SendEmailPayload, credential: DearMeResendCredential) {
  const displayName = sanitizeDisplayName(credential.fromName ?? payload.fromHandle);
  return displayName ? `${displayName} <${credential.fromEmail}>` : credential.fromEmail;
}

function buildResendEmailRequest(payload: SendEmailPayload, credential: DearMeResendCredential) {
  return {
    from: buildFromAddress(payload, credential),
    to: [payload.toEmail],
    subject: payload.subject,
    text: payload.body,
  };
}

export function createDearMeSendEmailDispatch(
  config: DearMeSendEmailDispatchConfig = {},
): ChannelDispatch {
  const emailsUrl = config.emailsUrl ?? DEFAULT_RESEND_EMAILS_URL;
  const fetchImpl: FetchLike =
    config.fetch ?? ((url, init) => fetch(url, init as RequestInit));
  const now = config.now ?? (() => new Date());
  const resolveCredential = config.resolveCredential ?? resolveDearMeSendEmailCredential;

  return async (input) => {
    if (input.toolName !== "send_email") {
      return error(`email-dispatch-binding-mismatch:${input.toolName}`);
    }

    const payload = parseSendEmailPayload(input.payload);
    if (!payload.ok) return error(payload.error);

    let plaintextCredential: string;
    try {
      plaintextCredential = await resolveCredential(input.encryptedCredential);
    } catch {
      return authError("email-credential-resolve-failed");
    }

    const parsedCredential = parseCredentialPayload(plaintextCredential, now());
    if (parsedCredential.kind !== "credential") return parsedCredential;

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(emailsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${parsedCredential.credential.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.dispatchContext.idempotencyKey.slice(0, 256),
          "User-Agent": RESEND_USER_AGENT,
        },
        body: JSON.stringify(buildResendEmailRequest(payload.value, parsedCredential.credential)),
      });
    } catch {
      return error("email-send-request-failed");
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return authError(`email-send-auth-failed:${response.status}`);
      }
      return error(`email-send-failed:${response.status}`);
    }

    const responseBody = asRecord(await safeJson(response));
    const providerMessageId = responseBody ? stringField(responseBody, "id") : null;
    if (!providerMessageId) return error("email-send-returned-incomplete-data");

    return {
      kind: "delivered",
      externalId: providerMessageId,
      paid: false,
    };
  };
}
