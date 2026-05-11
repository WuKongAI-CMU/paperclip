/**
 * Voice-gate scorer coverage.
 *
 * The scorer is deterministic and is the contract surface every other layer
 * sees. Lock down product behavior, not private implementation details.
 */

import { describe, expect, it } from "vitest";
import {
  createInMemoryDearMeVoiceProfileStore,
  dearMeVoiceGateService,
  type DearMeVoiceCorpusProfileSnapshot,
  type DearMeVoiceProfileStore,
} from "./dearme-voice-gate.js";

const svc = dearMeVoiceGateService();
const hiddenCustomerTerms = [
  "paperclip",
  "openclaw",
  "symphony",
  "adapter",
  "provider",
  "runtime",
  "model",
  "api key",
  "credential",
  "token",
  "setup payload",
  "codex",
  "workbench",
  "queue",
  "worker",
  "run id",
  "raw control plane",
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

  it("can keep voice continuity across service instances through an injected profile store", async () => {
    const profileStore = createInMemoryDearMeVoiceProfileStore();
    const firstSvc = dearMeVoiceGateService({ profileStore });
    await firstSvc.scoreVoice({
      fingerprintId: "vf_recreated_service",
      text: "I keep coming back to the same lesson from launch calls: proof beats polish when a buyer can inspect the work before we ask.",
      kind: "linkedin-post",
    });

    const recreatedSvc = dearMeVoiceGateService({ profileStore });
    const r = await recreatedSvc.scoreVoice({
      fingerprintId: "vf_recreated_service",
      text: "I keep coming back to that proof beats polish lesson because buyers trust the work faster when they can inspect it first.",
      kind: "linkedin-post",
    });

    expect(r.reasons.some((reason) => reason.rule === "voice_continuity")).toBe(true);
  });

  it("does not store drafts that fail the voice gate", async () => {
    const writes: DearMeVoiceCorpusProfileSnapshot[] = [];
    const profileStore: DearMeVoiceProfileStore = {
      async readProfile() {
        return null;
      },
      async writeProfile(_fingerprintId, profile) {
        writes.push(profile);
      },
    };
    const freshSvc = dearMeVoiceGateService({ profileStore });

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_rejects",
      text: "As an AI, I think you should consider this.",
      kind: "x-tweet",
      minScore: 100,
    });

    expect(r.passed).toBe(false);
    expect(writes).toEqual([]);
  });

  it("writes serializable bounded profile snapshots", async () => {
    const profileState: { storedProfile: DearMeVoiceCorpusProfileSnapshot | null } = { storedProfile: null };
    const profileStore: DearMeVoiceProfileStore = {
      async readProfile() {
        return profileState.storedProfile;
      },
      async writeProfile(_fingerprintId, profile) {
        profileState.storedProfile = profile;
      },
    };
    const freshSvc = dearMeVoiceGateService({ profileStore });

    for (let pass = 0; pass < 3; pass += 1) {
      const tokens = Array.from({ length: 90 }, (_value, index) => `signal${pass}-${index}`).join(" ");
      await freshSvc.scoreVoice({
        fingerprintId: "vf_bounded",
        text: `I shipped a concrete proof because the launch call needed one inspectable decision before the next yes. ${tokens}`,
        kind: "x-thread",
      });
    }

    const storedProfile = profileState.storedProfile;
    if (!storedProfile) throw new Error("Expected a stored voice profile");
    expect(storedProfile.acceptedSamples).toBe(3);
    expect(Object.keys(storedProfile.tokenCounts)).toHaveLength(160);
    expect(JSON.parse(JSON.stringify(storedProfile))).toEqual(storedProfile);
  });

  it("caps accepted sample counts loaded from a profile store", async () => {
    const profileState: { storedProfile: DearMeVoiceCorpusProfileSnapshot | null } = { storedProfile: null };
    const profileStore: DearMeVoiceProfileStore = {
      async readProfile() {
        return {
          acceptedSamples: 10_000,
          tokenCounts: {},
        };
      },
      async writeProfile(_fingerprintId, profile) {
        profileState.storedProfile = profile;
      },
    };
    const freshSvc = dearMeVoiceGateService({ profileStore });

    await freshSvc.scoreVoice({
      fingerprintId: "vf_capped",
      text: "I shipped a concrete proof because the launch call needed one inspectable decision before the next yes.",
      kind: "linkedin-post",
      minScore: 70,
    });

    const storedProfile = profileState.storedProfile;
    if (!storedProfile) throw new Error("Expected a stored voice profile");
    expect(storedProfile.acceptedSamples).toBe(1_000);
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

  it("can apply an injected semantic voice scorer without changing the route contract", async () => {
    const scorerCalls: Array<{
      profile: DearMeVoiceCorpusProfileSnapshot;
      signalTokens: ReadonlyArray<string>;
    }> = [];
    const freshSvc = dearMeVoiceGateService({
      async semanticScorer({ profile, signalTokens }) {
        scorerCalls.push({ profile, signalTokens });
        return { similarity: 0.86, confidence: 0.91, source: "test" };
      },
    });

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_semantic_match",
      text: "The launch note became a private proof because buyers could inspect the work before the next yes.",
      kind: "linkedin-post",
      minScore: 90,
    });

    expect(r.passed).toBe(true);
    expect(r.reasons.some((reason) => reason.rule === "semantic_voice_match")).toBe(true);
    expect(scorerCalls).toHaveLength(1);
    expect(scorerCalls[0].profile).toEqual({ acceptedSamples: 0, tokenCounts: {} });
    expect(scorerCalls[0].signalTokens).toContain("launch");
  });

  it("lets the injected semantic scorer block confident voice drift before learning it", async () => {
    const writes: DearMeVoiceCorpusProfileSnapshot[] = [];
    const profileStore: DearMeVoiceProfileStore = {
      async readProfile() {
        return null;
      },
      async writeProfile(_fingerprintId, profile) {
        writes.push(profile);
      },
    };
    const freshSvc = dearMeVoiceGateService({
      profileStore,
      async semanticScorer() {
        return { similarity: 0.12, confidence: 0.9, source: "test" };
      },
    });

    const r = await freshSvc.scoreVoice({
      fingerprintId: "vf_semantic_drift",
      text: "I shipped a concrete proof because the launch call needed one inspectable decision before the next yes.",
      kind: "linkedin-post",
      minScore: 98,
    });

    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(r.floor);
    expect(r.reasons.some((reason) => reason.rule === "semantic_voice_drift")).toBe(true);
    expect(writes).toEqual([]);
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
      text: "As an AI, the OpenClaw model runtime queue used a provider adapter token in the Paperclip workbench with an API key credential worker run id raw control plane.",
      kind: "linkedin-post",
      minScore: 70,
    });
    const reasonText = r.reasons.map((reason) => reason.note).join(" ").toLowerCase();

    expect(r.reasons.some((reason) => reason.rule === "hidden_process_language")).toBe(true);
    for (const term of hiddenCustomerTerms) {
      expect(reasonText).not.toContain(term);
    }
  });

  it("flags backstage access language even when donor names are absent", async () => {
    const r = await svc.scoreVoice({
      fingerprintId: "vf_access_language",
      text: "The API key credential worker run id raw control plane should be visible in the launch note.",
      kind: "linkedin-post",
      minScore: 70,
    });

    expect(r.reasons.some((reason) => reason.rule === "hidden_process_language")).toBe(true);
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
