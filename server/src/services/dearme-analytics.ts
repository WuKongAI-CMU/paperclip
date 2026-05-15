type DearMeAnalyticsFetch = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number }>;

export type DearMeServerCaptureInput = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  fetchImpl?: DearMeAnalyticsFetch;
};

export type DearMeServerCaptureResult =
  | { skipped: true }
  | { skipped: false; ok: boolean; status: number };

export async function serverCapture({
  distinctId,
  event,
  properties,
  fetchImpl = fetch,
}: DearMeServerCaptureInput): Promise<DearMeServerCaptureResult> {
  const apiKey = process.env.DEARME_POSTHOG_KEY;
  if (!apiKey) return { skipped: true };

  try {
    const host = process.env.DEARME_POSTHOG_HOST || "https://app.posthog.com";
    const response = await fetchImpl(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
        event,
        properties: properties ?? {},
      }),
    });

    return { skipped: false, ok: response.ok, status: response.status };
  } catch {
    return { skipped: true };
  }
}
