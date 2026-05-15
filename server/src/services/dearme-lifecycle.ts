const LOOPS_API_BASE_URL = "https://app.loops.so/api/v1";

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText?: string;
  text?: () => Promise<string>;
}

interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

type LifecyclePropertyValue = string | number | boolean | Date | null;
type LifecycleProperties = Record<string, LifecyclePropertyValue>;

export interface DearMeLifecycleOptions {
  apiKey?: string | null;
  fetchImpl?: FetchLike;
}

export interface DearMeLifecycleEventInput {
  email: string;
  eventName: `dearme_${string}`;
  properties?: LifecycleProperties;
}

export interface DearMeLifecycleContactInput {
  email: string;
  properties: LifecycleProperties;
}

export type DearMeLifecycleResult =
  | { skipped: true; reason: string }
  | { skipped: false; ok: true; status: number }
  | { skipped: false; ok: false; status: number; reason: string };

function resolveApiKey(options: DearMeLifecycleOptions) {
  return options.apiKey ?? process.env.DEARME_LOOPS_API_KEY?.trim() ?? "";
}

function resolveFetch(options: DearMeLifecycleOptions): FetchLike {
  return options.fetchImpl ?? fetch;
}

async function responseReason(response: FetchResponseLike) {
  const body = await response.text?.().catch(() => "");
  return body?.trim() || response.statusText || "loops_request_failed";
}

async function postToLoops(
  path: string,
  body: Record<string, unknown>,
  options: DearMeLifecycleOptions,
): Promise<DearMeLifecycleResult> {
  const apiKey = resolveApiKey(options);
  if (!apiKey) {
    return { skipped: true, reason: "dearme_loops_api_key_unset" };
  }

  try {
    const response = await resolveFetch(options)(`${LOOPS_API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        skipped: false,
        ok: false,
        status: response.status,
        reason: await responseReason(response),
      };
    }

    return { skipped: false, ok: true, status: response.status };
  } catch (err) {
    return {
      skipped: false,
      ok: false,
      status: 0,
      reason: err instanceof Error ? err.message : "loops_request_failed",
    };
  }
}

export function sendLifecycleEvent(
  input: DearMeLifecycleEventInput,
  options: DearMeLifecycleOptions = {},
): Promise<DearMeLifecycleResult> {
  return postToLoops(
    "/events/send",
    {
      email: input.email,
      eventName: input.eventName,
      ...(input.properties ? { eventProperties: input.properties } : {}),
    },
    options,
  );
}

export function updateContact(
  input: DearMeLifecycleContactInput,
  options: DearMeLifecycleOptions = {},
): Promise<DearMeLifecycleResult> {
  return postToLoops(
    "/contacts/update",
    {
      email: input.email,
      ...input.properties,
    },
    options,
  );
}
