import type { RequestHandler } from "express";

const DEARME_PROD_ORIGINS = new Set([
  "https://dearme.app",
  "https://www.dearme.app",
]);

const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/i;
const ALLOWED_METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization";

export function isDearMeAllowedProdCorsOrigin(origin: string): boolean {
  return DEARME_PROD_ORIGINS.has(origin) || VERCEL_PREVIEW_ORIGIN.test(origin);
}

export function dearMeCors(options: { production: boolean }): RequestHandler {
  return (req, res, next) => {
    const origin = req.get("origin");
    if (!origin) {
      next();
      return;
    }

    res.vary("Origin");

    if (options.production) {
      if (isDearMeAllowedProdCorsOrigin(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.get("access-control-request-headers") ?? DEFAULT_ALLOWED_HEADERS,
    );

    if (req.method === "OPTIONS") {
      res.status(options.production && !isDearMeAllowedProdCorsOrigin(origin) ? 403 : 204).end();
      return;
    }

    next();
  };
}
