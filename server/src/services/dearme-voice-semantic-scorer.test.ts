import { describe, expect, it } from "vitest";
import {
  createDearMeProfileTokenSemanticScorer,
  resolveDearMeVoiceSemanticScorerFromEnv,
} from "./dearme-voice-semantic-scorer.js";

const request = {
  fingerprintId: "vf_semantic_profile",
  text: "I shipped proof from the launch call because the buyer needed one inspectable next yes.",
  kind: "linkedin-post",
} as const;

const trainedProfile = {
  acceptedSamples: 6,
  tokenCounts: {
    buyer: 2,
    call: 2,
    inspectable: 2,
    launch: 2,
    needed: 2,
    next: 2,
    proof: 2,
    shipped: 2,
    work: 2,
    yes: 2,
  },
};

describe("DearMe profile-token semantic scorer", () => {
  it("stays unconfigured unless explicitly enabled", () => {
    expect(resolveDearMeVoiceSemanticScorerFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveDearMeVoiceSemanticScorerFromEnv({
      DEARME_VOICE_SEMANTIC_SCORER: "off",
    } as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveDearMeVoiceSemanticScorerFromEnv({
      DEARME_VOICE_SEMANTIC_SCORER: "unknown",
    } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("resolves the profile-token scorer from env", () => {
    expect(resolveDearMeVoiceSemanticScorerFromEnv({
      DEARME_VOICE_SEMANTIC_SCORER: " profile-token ",
      DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES: "3",
      DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS: "6",
    } as NodeJS.ProcessEnv)).toEqual(expect.any(Function));
  });

  it("returns a confident match for text close to the accepted voice profile", async () => {
    const scorer = createDearMeProfileTokenSemanticScorer();

    const score = await scorer({
      request,
      profile: trainedProfile,
      signalTokens: [
        "buyer",
        "call",
        "inspectable",
        "launch",
        "needed",
        "next",
        "proof",
        "shipped",
        "work",
        "yes",
      ],
    });

    expect(score).toMatchObject({
      confidence: expect.any(Number),
      source: "profile-token",
    });
    expect(score?.similarity).toBeCloseTo(1, 10);
    expect(score?.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("returns a confident drift signal when a trained profile has no overlap", async () => {
    const scorer = createDearMeProfileTokenSemanticScorer();
    const score = await scorer({
      request,
      profile: trainedProfile,
      signalTokens: [
        "calendar",
        "generic",
        "platform",
        "synergy",
        "template",
        "workflow",
        "automation",
        "newsletter",
        "growth",
        "campaign",
      ],
    });

    expect(score).toMatchObject({
      similarity: 0,
      source: "profile-token",
    });
    expect(score?.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("does not score until the profile has enough accepted samples", async () => {
    const scorer = createDearMeProfileTokenSemanticScorer();

    await expect(scorer({
      request,
      profile: {
        acceptedSamples: 1,
        tokenCounts: trainedProfile.tokenCounts,
      },
      signalTokens: ["buyer", "call", "proof"],
    })).resolves.toBeNull();
  });
});
