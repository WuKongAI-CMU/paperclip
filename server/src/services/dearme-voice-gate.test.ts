/**
 * Voice-gate stub scorer coverage.
 *
 * The stub is deterministic and is the contract surface every other layer
 * sees until DM-170-impl swaps in the real fingerprint model. Lock down
 * the rules so the integration pipe behaves identically across runs.
 */

import { describe, expect, it } from "vitest";
import { dearMeVoiceGateService } from "./dearme-voice-gate.js";

const svc = dearMeVoiceGateService();

describe("dearMeVoiceGateService stub scorer", () => {
  it("passes a normal-length, in-voice tweet", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "Shipped tri-substrate runtime today. Voice gate now blocks slop at the cloud edge: https://dearme.app/log/12.",
      kind: "x-tweet",
      minScore: 70,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("flags 'as an AI' disclaimers", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "As an AI, I think you should consider this.",
      kind: "x-tweet",
      minScore: 70,
    });
    expect(r.score).toBeLessThan(75);
    expect(r.reasons.some((reason) => reason.rule === "ai_disclaimer")).toBe(true);
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
    const a = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "I hope this email finds you well.",
      kind: "outbound-email",
      minScore: 70,
    });
    const b = await svc.scoreVoice({
      fingerprintId: "vf_test",
      text: "I hope this email finds you well.",
      kind: "outbound-email",
      minScore: 70,
    });
    expect(a.score).toBe(b.score);
    expect(a.reasons).toEqual(b.reasons);
  });
});
