import type { RequestHandler } from "express";
import helmet from "helmet";

const POSTHOG_SOURCES = [
  "https://posthog.com",
  "https://*.posthog.com",
  "https://api.posthog.com",
  "https://us.i.posthog.com",
];

const STRIPE_SOURCES = [
  "https://api.stripe.com",
  "https://js.stripe.com",
  "https://*.stripe.com",
];

const LOOPS_SOURCES = [
  "https://app.loops.so",
  "https://*.loops.so",
];

const SENTRY_SOURCES = [
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
];

const VOYAGE_SOURCES = [
  "https://api.voyageai.com",
];

const VITE_DEV_CONNECT_SOURCES = [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "ws://localhost:*",
  "ws://127.0.0.1:*",
];

export function securityHeaders(options: { viteDev?: boolean } = {}): RequestHandler {
  const scriptSrc = [
    "'self'",
    ...POSTHOG_SOURCES,
    ...(options.viteDev ? ["'unsafe-inline'"] : []),
  ];
  const connectSrc = [
    "'self'",
    ...POSTHOG_SOURCES,
    ...VOYAGE_SOURCES,
    ...STRIPE_SOURCES,
    ...LOOPS_SOURCES,
    ...SENTRY_SOURCES,
    ...(options.viteDev ? VITE_DEV_CONNECT_SOURCES : []),
  ];

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": scriptSrc,
        "connect-src": connectSrc,
        "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
      },
    },
    frameguard: {
      action: "deny",
    },
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
  });
}
