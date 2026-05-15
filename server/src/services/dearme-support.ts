import { createHmac, timingSafeEqual } from "node:crypto";

const PLAIN_GRAPHQL_URL = "https://core-api.uk.plain.com/graphql/v1";
const DEFAULT_SUPPORT_SEVERITY = "normal";

export type DearMeSupportSeverity = "low" | "normal" | "high" | "urgent";

interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

export interface CreateSupportThreadInput {
  email: string;
  name: string;
  subject: string;
  body: string;
  severity?: DearMeSupportSeverity;
}

export interface SendThreadReplyInput {
  threadId: string;
  body: string;
}

export interface DearMeSupportOptions {
  fetch?: FetchLike;
  apiKey?: string | null;
  webhookSecret?: string | null;
}

export interface DearMeInboundSupportMessage {
  threadId: string;
  fromEmail: string;
  body: string;
  kind: string;
}

function configuredValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function resolveApiKey(options: DearMeSupportOptions) {
  return configuredValue(options.apiKey) ?? configuredValue(process.env.DEARME_PLAIN_API_KEY);
}

function resolveWebhookSecret(options: DearMeSupportOptions) {
  return configuredValue(options.webhookSecret) ?? configuredValue(process.env.DEARME_PLAIN_WEBHOOK_SECRET);
}

function resolveFetch(options: DearMeSupportOptions): FetchLike {
  return options.fetch ?? fetch;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function nestedRecord(record: Record<string, unknown> | null, ...keys: string[]) {
  let current: Record<string, unknown> | null = record;
  for (const key of keys) {
    current = asRecord(current?.[key]);
    if (!current) return null;
  }
  return current;
}

function normalizeSeverity(severity: DearMeSupportSeverity | undefined): DearMeSupportSeverity {
  return severity ?? DEFAULT_SUPPORT_SEVERITY;
}

function plainThreadId(payload: unknown) {
  const root = asRecord(payload);
  return stringField(nestedRecord(root, "data", "createThread", "thread"), "id")
    ?? stringField(nestedRecord(root, "data", "createThread"), "threadId")
    ?? stringField(nestedRecord(root, "data", "createThread"), "id")
    ?? stringField(nestedRecord(root, "data", "replyToThread", "thread"), "id")
    ?? stringField(nestedRecord(root, "data", "replyToThread"), "threadId")
    ?? stringField(nestedRecord(root, "data", "replyToThread"), "id")
    ?? null;
}

async function postPlainGraphql(
  body: Record<string, unknown>,
  options: DearMeSupportOptions,
) {
  const apiKey = resolveApiKey(options);
  if (!apiKey) return { skipped: true as const };

  const response = await resolveFetch(options)(PLAIN_GRAPHQL_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    threadId: plainThreadId(payload),
    status: response.status,
  };
}

export async function createSupportThread(
  input: CreateSupportThreadInput,
  options: DearMeSupportOptions = {},
) {
  const severity = normalizeSeverity(input.severity);
  return postPlainGraphql({
    query: `
      mutation DearMeCreateSupportThread($input: CreateThreadInput!) {
        createThread(input: $input) {
          thread {
            id
          }
        }
      }
    `,
    variables: {
      input: {
        customer: {
          email: input.email,
          name: input.name,
        },
        title: input.subject,
        components: [
          {
            componentText: {
              text: input.body,
            },
          },
        ],
        labelTypeIds: [`dearme-severity-${severity}`],
      },
    },
  }, options);
}

export async function sendThreadReply(
  input: SendThreadReplyInput,
  options: DearMeSupportOptions = {},
) {
  return postPlainGraphql({
    query: `
      mutation DearMeSendThreadReply($input: ReplyToThreadInput!) {
        replyToThread(input: $input) {
          thread {
            id
          }
        }
      }
    `,
    variables: {
      input: {
        threadId: input.threadId,
        components: [
          {
            componentText: {
              text: input.body,
            },
          },
        ],
      },
    },
  }, options);
}

function payloadBytes(payload: unknown) {
  if (Buffer.isBuffer(payload)) return payload;
  if (typeof payload === "string") return Buffer.from(payload, "utf8");
  return Buffer.from(JSON.stringify(payload), "utf8");
}

function extractSignatureDigest(signature: string) {
  const trimmed = signature.trim();
  const parts = trimmed.split(",");
  for (const part of parts) {
    const candidate = part.trim();
    if (candidate.startsWith("sha256=")) return candidate.slice("sha256=".length);
    if (candidate.startsWith("v1=")) return candidate.slice("v1=".length);
  }
  return trimmed;
}

function verifySignature(payload: unknown, signature: string | null | undefined, secret: string) {
  const digest = extractSignatureDigest(signature ?? "");
  if (!/^[a-f0-9]{64}$/i.test(digest)) return false;

  const expected = createHmac("sha256", secret)
    .update(payloadBytes(payload))
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(digest, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function parsePayload(payload: unknown) {
  if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString("utf8")) as unknown;
  if (typeof payload === "string") return JSON.parse(payload) as unknown;
  return payload;
}

function firstString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

export function handleInboundWebhook(
  payload: unknown,
  signature: string | null | undefined,
  options: DearMeSupportOptions = {},
): DearMeInboundSupportMessage {
  const secret = resolveWebhookSecret(options);
  if (!secret) {
    throw new Error("DearMe Plain webhook secret is not configured.");
  }
  if (!verifySignature(payload, signature, secret)) {
    throw new Error("Invalid DearMe Plain webhook signature.");
  }

  const parsed = parsePayload(payload);
  const root = asRecord(parsed);
  const data = asRecord(root?.data) ?? root;
  const thread = asRecord(data?.thread) ?? asRecord(data?.conversation);
  const message = asRecord(data?.message) ?? asRecord(data?.reply) ?? data;
  const customer = asRecord(data?.customer)
    ?? asRecord(message?.customer)
    ?? asRecord(message?.from)
    ?? asRecord(thread?.customer);

  const body = firstString(
    message?.body,
    message?.text,
    message?.content,
    stringField(asRecord(message?.componentText), "text"),
  );
  const threadId = firstString(
    data?.threadId,
    thread?.id,
    message?.threadId,
    message?.conversationId,
  );
  const fromEmail = firstString(
    data?.fromEmail,
    message?.fromEmail,
    customer?.email,
    asRecord(message?.sender)?.email,
  );
  const kind = firstString(root?.type, data?.type, data?.kind, message?.kind) || "plain_webhook";

  if (!threadId || !fromEmail || !body) {
    throw new Error("DearMe Plain webhook payload is missing required message fields.");
  }

  return {
    threadId,
    fromEmail,
    body,
    kind,
  };
}
