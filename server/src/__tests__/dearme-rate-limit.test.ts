import express, { Router } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  DEARME_RATE_LIMIT_MESSAGE,
  installDearMeRateLimits,
} from "../middleware/dearme-rate-limit.js";

function buildRateLimitedApp() {
  const app = express();
  app.set("trust proxy", 1);
  const api = Router();

  installDearMeRateLimits(app, api, {
    windowMs: 60_000,
    checkoutStartLimit: 1,
    authSignInLimit: 1,
    emailUnsubscribeLimit: 1,
  });

  app.post("/api/auth/signin/email", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  api.post("/dearme/checkout/start", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  api.get("/dearme/v1/email/unsubscribe", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use("/api", api);

  return app;
}

describe("DearMe public endpoint rate limits", () => {
  it("limits checkout session starts per IP", async () => {
    const app = buildRateLimitedApp();

    await request(app).post("/api/dearme/checkout/start").expect(200);
    const res = await request(app).post("/api/dearme/checkout/start").expect(429);

    expect(res.body).toEqual({ error: DEARME_RATE_LIMIT_MESSAGE });
  });

  it("limits auth sign-in attempts per IP", async () => {
    const app = buildRateLimitedApp();

    await request(app).post("/api/auth/signin/email").expect(200);
    const res = await request(app).post("/api/auth/signin/email").expect(429);

    expect(res.body).toEqual({ error: DEARME_RATE_LIMIT_MESSAGE });
  });

  it("limits unsubscribe requests per IP", async () => {
    const app = buildRateLimitedApp();

    await request(app).get("/api/dearme/v1/email/unsubscribe").expect(200);
    const res = await request(app).get("/api/dearme/v1/email/unsubscribe").expect(429);

    expect(res.body).toEqual({ error: DEARME_RATE_LIMIT_MESSAGE });
  });
});
