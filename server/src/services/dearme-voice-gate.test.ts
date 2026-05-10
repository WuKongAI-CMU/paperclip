/**
 * Voice-gate scorer coverage.
 *
 * The scorer is deterministic and is the contract surface every other layer
 * sees. Lock down product behavior, not private implementation details.
 */

import { describe, expect, it } from "vitest";
import { dearMeVoiceGateService } from "./dearme-voice-gate.js";

const svc = dearMeVoiceGateService();
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

describe("dearMeVoiceGateService scorer", () => {
  it("passes a concrete first draft at the default floor without prior samples", async () => {
    const freshSvc = dearMeVoiceGateService();

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_test",
      text: "I spent the morning turning three rough launch notes into one decision: lead with the proof people can inspect, then ask for the next safe yes.",
      kind: "linkedin-post",
    });

    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(r.floor);
  });

  it("remembers accepted writing for later voice-continuity scoring", async () => {
    const freshSvc = dearMeVoiceGateService();
    await freshSvc.scoreVoice({
      fingerprintId: "vf_repeat",
      text: "I keep coming back to the same lesson from launch calls: proof beats polish when a buyer can inspect the work before we ask.",
      kind: "linkedin-post",
    });

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_repeat",
      text: "I keep coming back to that proof beats polish lesson because buyers trust the work faster when they can inspect it first.",
      kind: "linkedin-post",
    });

    expect(r.reasons.some((reason) => reason.rule === "voice_continuity")).toBe(true);
  });

  it("keeps accepted writing isolated by fingerprint id", async () => {
    const freshSvc = dearMeVoiceGateService();
    await freshSvc.scoreVoice({
      fingerprintId: "vf_seed",
      text: "I keep coming back to the same lesson from launch calls: proof beats polish when a buyer can inspect the work before we ask.",
      kind: "linkedin-post",
    });

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_other",
      text: "I keep coming back to that proof beats polish lesson because buyers trust the work faster when they can inspect it first.",
      kind: "linkedin-post",
    });

    expect(r.reasons.some((reason) => reason.rule === "voice_continuity")).toBe(false);
  });

  it("flags disclaimers", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "As an AI, I think you should consider this.",
      kind: "x-tweet",
      minScore: 70,
    });
    expect(r.score).toBeLessThan(75);
    expect(r.reasons.some((reason) => reason.rule === "ai_disclaimer")).toBe(true);
  });

  it("flags hidden process language without echoing it in customer-facing notes", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "As an AI, the OpenClaw model runtime queue used a provider adapter token in the Paperclip workbench.",
      kind: "linkedin-post",
      minScore: 70,
    });
    const reasonText = r.reasons.map((reason) => reason.note).join(" ").toLowerCase();

    expect(r.reasons.some((reason) => reason.rule === "hidden_process_language")).toBe(true);
    for (const term of hiddenCustomerTerms) {
      expect(reasonText).not.toContain(term);
    }
  });

  it("flags hype words on tweets", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "Absolutely! Amazing! Let's go!",
      kind: "x-tweet",
      minScore: 70,
    });
    expect(r.reasons.some((reason) => reason.rule === "hype_word")).toBe(true);
  });

  it("flags below-min-length artifacts", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "hi",
      kind: "newsletter-issue",
      minScore: 70,
    });
    expect(r.reasons.some((reason) => reason.rule === "below_min_length")).toBe(true);
  });

  it("respects per-call minScore floor", async () => {
    const r1 = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "As an AI, I'm thrilled to announce that I am an AI.",
      kind: "x-tweet",
      minScore: 90,
    });
    expect(r1.floor).toBe(90);
    expect(r1.passed).toBe(false);
  });

  it("returns deterministic output for identical inputs", async () => {
    const freshSvc = dearMeVoiceGateService();
    const a = await freshSvc.scoreVoice({
      fingerprintId: "vf_test",
      text: "I hope this email finds you well.",
      kind: "outbound-email",
      minScore: 90,
    });
    const b = await freshSvc.scoreVoice({
      fingerprintId: "vf_test",
      text: "I hope this email finds you well.",
      kind: "outbound-email",
      minScore: 90,
    });
    expect(a.score).toBe(b.score);
    expect(a.reasons).toEqual(b.reasons);
  });
});
