import posthog from "posthog-js";

let analyticsInitialized = false;

function analyticsFallback(fallback?: boolean) {
  return fallback ?? false;
}

export function initAnalytics() {
  if (analyticsInitialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  try {
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || undefined,
    });
    analyticsInitialized = true;
  } catch {
    // Product analytics must never block application startup.
  }
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!analyticsInitialized) return;

  try {
    posthog.capture(event, properties);
  } catch {
    // Product analytics must never break a render path.
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (!analyticsInitialized) return;

  try {
    posthog.identify(userId, traits);
  } catch {
    // Product analytics must never break a render path.
  }
}

export function featureFlag(name: string, fallback?: boolean) {
  if (!analyticsInitialized) return analyticsFallback(fallback);

  try {
    const value = posthog.isFeatureEnabled(name);
    return typeof value === "boolean" ? value : analyticsFallback(fallback);
  } catch {
    return analyticsFallback(fallback);
  }
}
