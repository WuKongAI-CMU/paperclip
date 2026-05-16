import { sendLifecycleEvent, type DearMeLifecycleResult } from "./dearme-lifecycle.js";

const PLAIN_GRAPHQL_URL = "https://core-api.uk.plain.com/graphql/v1";
const DEFAULT_SLA_HOURS = 24;
const DEFAULT_THREAD_LIMIT = 50;
const OVERDUE_EVENT = "dearme_support_overdue";

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

export interface DearMeSupportSlaOptions {
  fetch?: FetchLike;
  plainApiKey?: string | null;
  loopsApiKey?: string | null;
  alertEmail?: string | null;
  now?: Date;
  slaHours?: number;
  threadLimit?: number;
  sendEvent?: typeof sendLifecycleEvent;
}

export interface DearMeSupportSlaThread {
  id: string;
  waitingSince: string;
  lastResponseAt: string | null;
  status: string | null;
}

export type DearMeSupportSlaResult =
  | { skipped: true; reason: string }
  | {
    skipped: false;
    ok: boolean;
    checkedThreads: number;
    overdueThreads: DearMeSupportSlaThread[];
    event: DearMeLifecycleResult | null;
  };

function configuredValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function resolvePlainApiKey(options: DearMeSupportSlaOptions) {
  return configuredValue(options.plainApiKey) ?? configuredValue(process.env.DEARME_PLAIN_API_KEY);
}

function resolveLoopsApiKey(options: DearMeSupportSlaOptions) {
  return configuredValue(options.loopsApiKey) ?? configuredValue(process.env.DEARME_LOOPS_API_KEY);
}

function resolveAlertEmail(options: DearMeSupportSlaOptions) {
  return configuredValue(options.alertEmail) ?? configuredValue(process.env.DEARME_SUPPORT_SLA_ALERT_EMAIL);
}

function resolveFetch(options: DearMeSupportSlaOptions): FetchLike {
  return options.fetch ?? fetch;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function firstString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function firstRecord(...values: Array<unknown>) {
  for (const value of values) {
    const record = asRecord(value);
    if (record) return record;
  }
  return null;
}

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function threadNodesFromPayload(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const threads = firstRecord(data?.threads, data?.threadSearch, data?.customerThreads, data?.supportThreads);
  const nodes = asArray(threads?.nodes);
  const edges = asArray(threads?.edges)
    .map((edge) => asRecord(edge)?.node)
    .filter(Boolean);
  return [...nodes, ...edges];
}

function isClosedStatus(status: string | null) {
  if (!status) return false;
  return ["closed", "done", "resolved", "spam", "deleted"].includes(status.toLowerCase());
}

function normalizeThread(rawThread: unknown, now: Date, slaHours: number): DearMeSupportSlaThread | null {
  const thread = asRecord(rawThread);
  if (!thread) return null;

  const status = firstString(thread.status, thread.state, thread.statusLabel);
  if (isClosedStatus(status)) return null;

  const id = firstString(thread.id, thread.threadId);
  const lastMessage = firstRecord(thread.lastMessage, thread.lastMessagePreview, thread.latestMessage);
  const waitingSince = firstString(
    thread.waitingSince,
    thread.waitingSinceAt,
    thread.lastCustomerMessageAt,
    thread.lastInboundMessageAt,
    thread.lastReplyFromCustomerAt,
    stringField(lastMessage, "createdAt"),
  );
  const lastResponseAt = firstString(
    thread.lastAgentResponseAt,
    thread.lastSupportResponseAt,
    thread.lastOutboundMessageAt,
    thread.lastReplyFromAgentAt,
  );
  const waitingMs = parseTimestamp(waitingSince);
  const responseMs = parseTimestamp(lastResponseAt);
  if (!id || !waitingSince || waitingMs === null) return null;
  if (responseMs !== null && responseMs >= waitingMs) return null;

  const ageHours = (now.getTime() - waitingMs) / 3_600_000;
  if (ageHours < slaHours) return null;

  return {
    id,
    waitingSince,
    lastResponseAt: lastResponseAt ?? null,
    status,
  };
}

async function fetchPlainThreads(options: DearMeSupportSlaOptions) {
  const apiKey = resolvePlainApiKey(options);
  if (!apiKey) return { skipped: true as const, reason: "dearme_plain_api_key_unset" };

  const limit = Math.max(1, Math.min(options.threadLimit ?? DEFAULT_THREAD_LIMIT, 100));
  const response = await resolveFetch(options)(PLAIN_GRAPHQL_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query DearMeSupportSlaThreads($first: Int!) {
          threads(first: $first) {
            edges {
              node {
                id
                status
                waitingSince
                waitingSinceAt
                lastCustomerMessageAt
                lastInboundMessageAt
                lastAgentResponseAt
                lastSupportResponseAt
                updatedAt
              }
            }
          }
        }
      `,
      variables: { first: limit },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      skipped: false as const,
      ok: false as const,
      status: response.status,
      payload,
    };
  }

  return {
    skipped: false as const,
    ok: true as const,
    status: response.status,
    payload,
  };
}

export async function checkDearMeSupportResponseSla(
  options: DearMeSupportSlaOptions = {},
): Promise<DearMeSupportSlaResult> {
  const plainResult = await fetchPlainThreads(options);
  if (plainResult.skipped) return plainResult;
  if (!plainResult.ok) {
    return {
      skipped: false,
      ok: false,
      checkedThreads: 0,
      overdueThreads: [],
      event: null,
    };
  }

  const now = options.now ?? new Date();
  const slaHours = options.slaHours ?? DEFAULT_SLA_HOURS;
  const threads = threadNodesFromPayload(plainResult.payload);
  const overdueThreads = threads
    .map((thread) => normalizeThread(thread, now, slaHours))
    .filter((thread): thread is DearMeSupportSlaThread => thread !== null);

  if (overdueThreads.length === 0) {
    return {
      skipped: false,
      ok: true,
      checkedThreads: threads.length,
      overdueThreads,
      event: null,
    };
  }

  const alertEmail = resolveAlertEmail(options);
  if (!alertEmail) {
    return {
      skipped: false,
      ok: false,
      checkedThreads: threads.length,
      overdueThreads,
      event: { skipped: true, reason: "dearme_support_sla_alert_email_unset" },
    };
  }

  const oldestWaitingSince = overdueThreads
    .map((thread) => parseTimestamp(thread.waitingSince))
    .filter((timestamp): timestamp is number => timestamp !== null)
    .sort((left, right) => left - right)[0];
  const oldestWaitingHours = oldestWaitingSince === undefined
    ? null
    : Math.floor((now.getTime() - oldestWaitingSince) / 3_600_000);

  const event = await (options.sendEvent ?? sendLifecycleEvent)({
    email: alertEmail,
    eventName: OVERDUE_EVENT,
    properties: {
      overdueThreadCount: overdueThreads.length,
      overdueThreadIds: overdueThreads.map((thread) => thread.id).join(","),
      oldestWaitingHours,
      checkedAt: now.toISOString(),
    },
  }, {
    apiKey: resolveLoopsApiKey(options),
  });

  return {
    skipped: false,
    ok: !event.skipped && event.ok,
    checkedThreads: threads.length,
    overdueThreads,
    event,
  };
}
