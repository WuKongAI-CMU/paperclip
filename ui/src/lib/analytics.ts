let analyticsInitialized = false;
let posthogClient: typeof import("posthog-js").default | null = null;
let posthogClientPromise: Promise<typeof import("posthog-js").default> | null = null;
let analyticsReadyPromise: Promise<typeof import("posthog-js").default | null> | null = null;

async function getPosthogClient() {
  if (posthogClient) return posthogClient;
  posthogClientPromise ??= import("posthog-js").then((module) => module.default);
  posthogClient = await posthogClientPromise;
  return posthogClient;
}

function analyticsFallback(fallback?: boolean) {
  return fallback ?? false;
}

function ensureAnalyticsReady() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return null;

  analyticsReadyPromise ??= getPosthogClient()
    .then((posthog) => {
      if (!analyticsInitialized) {
        posthog.init(key, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || undefined,
        });
        analyticsInitialized = true;
      }
      return posthog;
    })
    .catch(() => null);

  return analyticsReadyPromise;
}

export function initAnalytics() {
  void ensureAnalyticsReady();
}

export function capture(event: string, properties?: Record<string, unknown>) {
  void ensureAnalyticsReady()?.then((posthog) => {
    posthog?.capture(event, properties);
  }).catch(() => {
    // Product analytics must never break a render path.
  });
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  void ensureAnalyticsReady()?.then((posthog) => {
    posthog?.identify(userId, traits);
  }).catch(() => {
    // Product analytics must never break a render path.
  });
}

export function featureFlag(name: string, fallback?: boolean) {
  if (!analyticsInitialized) return analyticsFallback(fallback);
  if (!posthogClient) return analyticsFallback(fallback);

  try {
    const value = posthogClient.isFeatureEnabled(name);
    return typeof value === "boolean" ? value : analyticsFallback(fallback);
  } catch {
    return analyticsFallback(fallback);
  }
}
