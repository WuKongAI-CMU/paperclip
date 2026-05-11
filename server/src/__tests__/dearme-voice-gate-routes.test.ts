import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { VOICE_GATE_PATH } from "@paperclipai/dearme-ai-proxy";
import { errorHandler } from "../middleware/error-handler.js";
import { dearMeVoiceGateRoutes } from "../routes/dearme-voice-gate.js";
import { createInMemoryDearMeVoiceProfileStore } from "../services/dearme-voice-gate.js";

function createApp(options: Parameters<typeof dearMeVoiceGateRoutes>[0] = {}) {
  const app = express();
  app.use(express.json());
  app.use(dearMeVoiceGateRoutes(options));
  app.use(errorHandler);
  return app;
}

const validBody = {
  fingerprintId: "voice-fingerprint-1",
  text: "We turned three messy launch notes into one private proof because buyers need to inspect the work before they trust the next yes.",
  kind: "linkedin-post",
  minScore: 92,
};

const hiddenCustomerTerms = [
  "paperclip",
  "openclaw",
  "symphony",
  "adapter",
  "provider",
  "runtime",
  "model",
  "token",
  "setup payload",
  "codex",
  "workbench",
  "queue",
  "admin",
  "fingerprint",
] as const;

describe("dearMeVoiceGateRoutes", () => {
  it("scores voice through the shared cloud contract path", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send(validBody)
      .expect(200);

    expect(res.body).toMatchObject({
      score: expect.any(Number),
      passed: true,
      floor: 92,
      rewrite: null,
    });
    expect(res.body.reasons).toEqual(expect.any(Array));
  });

  it("uses the injected profile store behind the route contract", async () => {
    const profileStore = createInMemoryDearMeVoiceProfileStore();
    await request(createApp({ profileStore }))
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        ...validBody,
        fingerprintId: "vf_route_store",
        text: "I keep coming back to the same lesson from launch calls: proof beats polish when a buyer can inspect the work before we ask.",
      })
      .expect(200);

    const res = await request(createApp({ profileStore }))
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        ...validBody,
        fingerprintId: "vf_route_store",
        text: "I keep coming back to that proof beats polish lesson because buyers trust the work faster when they can inspect it first.",
      })
      .expect(200);

    expect(res.body.reasons.some((reason: { rule: string }) => reason.rule === "voice_continuity")).toBe(true);
  });

  it("does not echo hidden process terms in scoring reasons", async () => {
    const res = await request(createApp())
      .post(VOICE_GATE_PATH)
      .set("Authorization", "Bearer dm_sk_test_123")
      .send({
        ...validBody,
        text: "As an AI, the OpenClaw model runtime queue used a provider adapter token in the Paperclip workbench.",
      })
      .expect(200);
    const responseText = JSON.stringify(res.body).toLowerCase();

    for (const term of hiddenCustomerTerms) {
      expect(responseText).not.toContain(term);
    }
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
