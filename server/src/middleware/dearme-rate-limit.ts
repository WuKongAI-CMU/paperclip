import type { Express, Router } from "express";
import {
  ipKeyGenerator,
  rateLimit,
  type Options as RateLimitOptions,
} from "express-rate-limit";

export const DEARME_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEARME_RATE_LIMIT_MESSAGE = "Too many requests. Please try again soon.";

export const DEARME_RATE_LIMITS = {
  checkoutStart: 5,
  authSignIn: 10,
  emailUnsubscribe: 30,
} as const;

type DearMeRateLimitOptions = {
  windowMs?: number;
  checkoutStartLimit?: number;
  authSignInLimit?: number;
  emailUnsubscribeLimit?: number;
};

function createDearMeRateLimiter(
  identifier: string,
  limit: number,
  options: Pick<RateLimitOptions, "windowMs">,
) {
  return rateLimit({
    windowMs: options.windowMs,
    limit,
    identifier,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? ""),
    handler: (_req, res) => {
      res.status(429).json({ error: DEARME_RATE_LIMIT_MESSAGE });
    },
  });
}

export function installDearMeRateLimits(
  app: Express,
  api: Router,
  options: DearMeRateLimitOptions = {},
) {
  const windowMs = options.windowMs ?? DEARME_RATE_LIMIT_WINDOW_MS;

  app.use(
    "/api/auth/signin",
    createDearMeRateLimiter(
      "dearme-auth-signin",
      options.authSignInLimit ?? DEARME_RATE_LIMITS.authSignIn,
      { windowMs },
    ),
  );
  api.use(
    "/dearme/checkout/start",
    createDearMeRateLimiter(
      "dearme-checkout-start",
      options.checkoutStartLimit ?? DEARME_RATE_LIMITS.checkoutStart,
      { windowMs },
    ),
  );
  api.use(
    "/dearme/v1/email/unsubscribe",
    createDearMeRateLimiter(
      "dearme-email-unsubscribe",
      options.emailUnsubscribeLimit ?? DEARME_RATE_LIMITS.emailUnsubscribe,
      { windowMs },
    ),
  );
}
