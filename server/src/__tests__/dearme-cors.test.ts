import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { dearMeCors } from "../middleware/dearme-cors.js";

function createApp(options: { production: boolean }) {
  const app = express();
  app.use(dearMeCors(options));
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.post("/v1/dearme/checkout/start", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("dearMeCors", () => {
  it("allows only DearMe production origins and preview URLs in prod", async () => {
    const app = createApp({ production: true });

    await request(app)
      .get("/healthz")
      .set("Origin", "https://dearme.app")
      .expect("Access-Control-Allow-Origin", "https://dearme.app")
      .expect("Access-Control-Allow-Credentials", "true")
      .expect(200);

    await request(app)
      .get("/healthz")
      .set("Origin", "https://www.dearme.app")
      .expect("Access-Control-Allow-Origin", "https://www.dearme.app")
      .expect("Access-Control-Allow-Credentials", "true")
      .expect(200);

    await request(app)
      .get("/healthz")
      .set("Origin", "https://dearme-git-main-paperclipai.vercel.app")
      .expect("Access-Control-Allow-Origin", "https://dearme-git-main-paperclipai.vercel.app")
      .expect("Access-Control-Allow-Credentials", "true")
      .expect(200);

    const blocked = await request(app)
      .get("/healthz")
      .set("Origin", "https://evil.example")
      .expect(200);

    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
    expect(blocked.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("rejects disallowed production preflight requests", async () => {
    await request(createApp({ production: true }))
      .options("/v1/dearme/checkout/start")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Headers", "content-type,x-requested-with")
      .expect("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
      .expect("Access-Control-Allow-Headers", "content-type,x-requested-with")
      .expect(403);
  });

  it("uses wildcard CORS in dev", async () => {
    await request(createApp({ production: false }))
      .options("/v1/dearme/checkout/start")
      .set("Origin", "http://localhost:5173")
      .expect("Access-Control-Allow-Origin", "*")
      .expect(204);
  });
});
