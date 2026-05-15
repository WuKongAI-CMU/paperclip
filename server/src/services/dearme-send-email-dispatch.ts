import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { resolveDearMeChannelCredential } from "./dearme-channel-credential.js";
import type { ChannelDispatch } from "./dearme-outbound-tool-wrapper.js";

const DEFAULT_RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_SES_PATH = "/v2/email/outbound-emails";
const AWS_ALGORITHM = "AWS4-HMAC-SHA256";
const AWS_TERMINATOR = "aws4_request";
const AWS_SES_SERVICE = "ses";
const RESEND_USER_AGENT = "DearMe/0.1";
const SES_USER_AGENT = "DearMe/0.1 aws-sigv4";
const EMAIL_SUBJECT_LIMIT = 998;
const EMAIL_BODY_LIMIT = 200_000;
const DEFAULT_UNSUBSCRIBE_BASE_URL = "https://api.dearme.app/v1/email/unsubscribe";
const UNSUBSCRIBE_TOKEN_VERSION = "v1";

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
type EmailProvider = "resend" | "ses";

export interface DearMeSendEmailDispatchConfig {
  emailsUrl?: string;
  unsubscribeBaseUrl?: string;
  unsubscribeSecret?: string;
  physicalAddress?: string;
  isSuppressed?: (email: string) => Promise<boolean> | boolean;
  sesEndpointForRegion?: (region: string) => string;
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

interface DearMeSesCredential {
  provider: "ses";
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  fromEmail: string;
  configurationSetName?: string;
  expiresAt: Date | null;
}

interface SendEmailPayload {
  provider: EmailProvider;
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

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function textLength(value: string) {
  return Array.from(value).length;
}

function isAwsRegion(value: string) {
  return /^[a-z0-9-]{3,32}$/.test(value);
}

function isProvider(value: string): value is EmailProvider {
  return value === "resend" || value === "ses";
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
  if (!isProvider(providerName)) {
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
      provider: providerName,
      toEmail,
      fromHandle,
      subject,
      body,
      ...(threadId.value ? { threadId: threadId.value } : {}),
    },
  };
}

function parseOptionalExpiry(record: Record<string, unknown>, now: Date) {
  const expiresAtRaw = record.expiresAt;
  if (typeof expiresAtRaw !== "string" || expiresAtRaw.trim().length === 0) {
    return { ok: true as const, expiresAt: null };
  }
  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime())) {
    return { ok: false as const, reason: "email-credential-invalid-expiry" };
  }
  if (expiresAt.getTime() <= now.getTime()) {
    return { ok: false as const, reason: "email-credential-expired" };
  }
  return { ok: true as const, expiresAt };
}

function parseCredentialPayload(plaintext: string, provider: EmailProvider, now: Date) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return authError("email-credential-invalid-json");
  }

  const record = asRecord(parsed);
  if (!record || stringField(record, "provider") !== provider) {
    return authError("email-credential-invalid-provider");
  }

  const fromEmail = stringField(record, "fromEmail");
  if (!fromEmail) return authError("email-credential-missing-from-email");
  if (!isEmailAddress(fromEmail)) return authError("email-credential-invalid-from-email");

  const expires = parseOptionalExpiry(record, now);
  if (!expires.ok) return authError(expires.reason);

  if (provider === "resend") {
    const apiKey = stringField(record, "apiKey");
    if (!apiKey) return authError("email-credential-missing-api-key");

    const fromName = stringField(record, "fromName") ?? undefined;

    return {
      kind: "credential" as const,
      credential: {
        provider: "resend",
        apiKey,
        fromEmail,
        ...(fromName ? { fromName } : {}),
        expiresAt: expires.expiresAt,
      } satisfies DearMeResendCredential,
    };
  }

  const accessKeyId = stringField(record, "accessKeyId");
  if (!accessKeyId) return authError("email-credential-missing-access-key-id");
  const secretAccessKey = stringField(record, "secretAccessKey");
  if (!secretAccessKey) return authError("email-credential-missing-secret-access-key");
  const region = stringField(record, "region");
  if (!region) return authError("email-credential-missing-region");
  if (!isAwsRegion(region)) return authError("email-credential-invalid-region");
  const sessionToken = stringField(record, "sessionToken") ?? undefined;
  const configurationSetName = stringField(record, "configurationSetName") ?? undefined;

  return {
    kind: "credential" as const,
    credential: {
      provider: "ses",
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
      region,
      fromEmail,
      ...(configurationSetName ? { configurationSetName } : {}),
      expiresAt: expires.expiresAt,
    } satisfies DearMeSesCredential,
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

function buildSesEmailRequest(payload: SendEmailPayload, credential: DearMeSesCredential) {
  return {
    ...(credential.configurationSetName
      ? { ConfigurationSetName: credential.configurationSetName }
      : {}),
    FromEmailAddress: credential.fromEmail,
    Destination: {
      ToAddresses: [payload.toEmail],
    },
    Content: {
      Simple: {
        Subject: {
          Charset: "UTF-8",
          Data: payload.subject,
        },
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: payload.body,
          },
        },
      },
    },
  };
}

function defaultSesEndpointForRegion(region: string) {
  return `https://email.${region}.amazonaws.com${DEFAULT_SES_PATH}`;
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function resolveUnsubscribeSecret(explicitSecret?: string) {
  return (
    explicitSecret?.trim() ||
    process.env.DEARME_EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim() ||
    "dearme-local-unsubscribe-secret"
  );
}

export function createDearMeUnsubscribeToken(email: string, secret?: string) {
  const normalizedEmail = normalizeEmailAddress(email);
  const resolvedSecret = resolveUnsubscribeSecret(secret);
  const payload = `${UNSUBSCRIBE_TOKEN_VERSION}:${normalizedEmail}`;
  const signature = hmacHex(resolvedSecret, payload);
  return `${base64UrlEncode(payload)}.${signature}`;
}

export function verifyDearMeUnsubscribeToken(
  token: string,
  secret?: string,
): { ok: true; email: string } | { ok: false } {
  const [encodedPayload, signature, ...extra] = token.split(".");
  if (!encodedPayload || !signature || extra.length > 0) return { ok: false };
  if (!/^[a-f0-9]{64}$/.test(signature)) return { ok: false };

  const payload = base64UrlDecode(encodedPayload);
  if (!payload) return { ok: false };
  const [version, email, ...rest] = payload.split(":");
  if (version !== UNSUBSCRIBE_TOKEN_VERSION || rest.length > 0 || !email || !isEmailAddress(email)) {
    return { ok: false };
  }

  const expected = hmacHex(resolveUnsubscribeSecret(secret), payload);
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return { ok: false };
  }

  return { ok: true, email: normalizeEmailAddress(email) };
}

function unsubscribeUrl(baseUrl: string, email: string, secret?: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", createDearMeUnsubscribeToken(email, secret));
  return url.toString();
}

function appendUnsubscribeFooter(input: {
  body: string;
  email: string;
  baseUrl: string;
  secret?: string;
  physicalAddress: string;
}) {
  return [
    input.body.trimEnd(),
    "",
    "---",
    "You're receiving this because you opted into DearMe outreach.",
    `Unsubscribe: ${unsubscribeUrl(input.baseUrl, input.email, input.secret)}`,
    `DearMe · ${input.physicalAddress}`,
  ].join("\n");
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQueryString(url: URL) {
  return Array.from(url.searchParams.entries())
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function canonicalHeaderValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function signedSesHeaders(input: {
  url: URL;
  body: string;
  credential: DearMeSesCredential;
  signingDate: Date;
}) {
  const amzDate = formatAmzDate(input.signingDate);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(input.body);
  const credentialScope = [
    dateStamp,
    input.credential.region,
    AWS_SES_SERVICE,
    AWS_TERMINATOR,
  ].join("/");
  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    ...(input.credential.sessionToken ? ["x-amz-security-token"] : []),
  ];
  const headerValues: Record<string, string> = {
    "content-type": "application/json",
    host: input.url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(input.credential.sessionToken
      ? { "x-amz-security-token": input.credential.sessionToken }
      : {}),
  };
  const canonicalHeaders = signedHeaders
    .map((header) => `${header}:${canonicalHeaderValue(headerValues[header] ?? "")}\n`)
    .join("");
  const canonicalRequest = [
    "POST",
    input.url.pathname || "/",
    canonicalQueryString(input.url),
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");
  const stringToSign = [
    AWS_ALGORITHM,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${input.credential.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, input.credential.region);
  const serviceKey = hmac(regionKey, AWS_SES_SERVICE);
  const signingKey = hmac(serviceKey, AWS_TERMINATOR);
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = [
    `${AWS_ALGORITHM} Credential=${input.credential.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders.join(";")}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    Authorization: authorization,
    "Content-Type": "application/json",
    "User-Agent": SES_USER_AGENT,
    "X-Amz-Content-Sha256": payloadHash,
    "X-Amz-Date": amzDate,
    ...(input.credential.sessionToken
      ? { "X-Amz-Security-Token": input.credential.sessionToken }
      : {}),
  };
}

export function createDearMeSendEmailDispatch(
  config: DearMeSendEmailDispatchConfig = {},
): ChannelDispatch {
  const emailsUrl = config.emailsUrl ?? DEFAULT_RESEND_EMAILS_URL;
  const unsubscribeBaseUrl = config.unsubscribeBaseUrl ?? DEFAULT_UNSUBSCRIBE_BASE_URL;
  const unsubscribeSecret = config.unsubscribeSecret;
  const physicalAddress = config.physicalAddress ?? "[physical address placeholder]";
  const isSuppressed = config.isSuppressed ?? (async () => false);
  const sesEndpointForRegion = config.sesEndpointForRegion ?? defaultSesEndpointForRegion;
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
    const normalizedRecipient = normalizeEmailAddress(payload.value.toEmail);

    let recipientSuppressed = true;
    try {
      recipientSuppressed = await isSuppressed(normalizedRecipient);
    } catch {
      return error("recipient_suppression_check_failed");
    }
    if (recipientSuppressed) {
      return error("recipient_suppressed");
    }

    const payloadWithFooter: SendEmailPayload = {
      ...payload.value,
      toEmail: normalizedRecipient,
      body: appendUnsubscribeFooter({
        body: payload.value.body,
        email: normalizedRecipient,
        baseUrl: unsubscribeBaseUrl,
        secret: unsubscribeSecret,
        physicalAddress,
      }),
    };

    let plaintextCredential: string;
    try {
      plaintextCredential = await resolveCredential(input.encryptedCredential);
    } catch {
      return authError("email-credential-resolve-failed");
    }

    const signingDate = now();
    const parsedCredential = parseCredentialPayload(
      plaintextCredential,
      payloadWithFooter.provider,
      signingDate,
    );
    if (parsedCredential.kind !== "credential") return parsedCredential;

    if (parsedCredential.credential.provider === "ses") {
      const url = new URL(sesEndpointForRegion(parsedCredential.credential.region));
      const body = JSON.stringify(buildSesEmailRequest(
        payloadWithFooter,
        parsedCredential.credential,
      ));
      let response: FetchResponseLike;
      try {
        response = await fetchImpl(url.toString(), {
          method: "POST",
          headers: signedSesHeaders({
            url,
            body,
            credential: parsedCredential.credential,
            signingDate,
          }),
          body,
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
      const providerMessageId = responseBody ? stringField(responseBody, "MessageId") : null;
      if (!providerMessageId) return error("email-send-returned-incomplete-data");

      return {
        kind: "delivered",
        externalId: providerMessageId,
        paid: false,
      };
    }

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
        body: JSON.stringify(buildResendEmailRequest(payloadWithFooter, parsedCredential.credential)),
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
