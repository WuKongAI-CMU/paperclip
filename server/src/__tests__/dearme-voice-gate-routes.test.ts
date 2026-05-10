import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { VOICE_GATE_PATH } from "@paperclipai/dearme-ai-proxy";
import { errorHandler } from "../middleware/error-handler.js";
import { dearMeVoiceGateRoutes } from "../routes/dearme-voice-gate.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(dearMeVoiceGateRoutes());
  app.use(errorHandler);
  return app;
}

const validBody = {
  fingerprintId: "voice-fingerprint-1",
  text: "We shipped DM-170 today with one route, four checks, and no new runtime surface.",
  kind: "linkedin-post",
  minScore: 92,
};

describe("dearMeVoiceGateRoutes", () => {
  it("scores voice through the shared cloud contract path", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send(validBody)
      .expect(200);

    expect(res.body).toMatchObject({
      score: expect.any(Number),
      passed: expect.any(Boolean),
      floor: 92,
      rewrite: null,
    });
    expect(res.body.reasons).toEqual(expect.any(Array));
  });

  it("rejects missing DearMe API key auth before body validation", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .send({ kind: "not-a-kind" })
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
  });

  it("rejects non-DearMe bearer tokens", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer sk_test_123")
      .send(validBody)
      .expect(401);

    expect(res.body).toEqual({ error: "DearMe API key required" });
  });

  it("validates the scoring payload against the shared artifact kinds", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        ...validBody,
        kind: "press-release",
      })
      .expect(400);

    expect(res.body.error).toBe("Validation error");
    expect(JSON.stringify(res.body.details)).toContain("Invalid enum value");
  });
});
