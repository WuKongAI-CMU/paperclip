import { describe, expect, it } from "vitest";
import type { DearMeVoiceProfileStore } from "./dearme-voice-gate.js";
import { dearMeVoiceGateService } from "./dearme-voice-gate.js";
import { resolveDearMeVoiceSemanticScorerFromEnv } from "./dearme-voice-semantic-scorer.js";
import { createVoyageScorer } from "./dearme-voice-voyage-scorer.js";

const onVoiceDraft = "I shipped proof from the launch call because the buyer needed one inspectable next yes.";
const offVoiceDraft = "I shipped one concrete proof because the launch call needed an inspectable next yes.";

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

function createProfileStore(): DearMeVoiceProfileStore {
  return {
    async readProfile() {
      return trainedProfile;
    },
    async writeProfile() {
      return;
    },
  };
}

function createFetchStub() {
  const calls: Array<{
    url: string | URL;
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    };
    input: string;
  }> = [];

  const fetchImpl = async (
    url: string | URL,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ) => {
    const body = JSON.parse(init?.body ?? "{}") as { input?: string[] };
    const text = body.input?.[0] ?? "";
    calls.push({ url, init, input: text });

    const embedding = embeddingForText(text);
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ data: [{ embedding }] });
      },
    };
  };

  return { calls, fetchImpl };
}

function embeddingForText(text: string): number[] {
  if (text === offVoiceDraft) return [0, 1, 0];
  if (text.includes("buyer")) return [1, 0, 0];
  return [0.8, 0.2, 0];
}

describe("DearMe Voyage semantic scorer", () => {
  it("POSTs embeddings to Voyage with bearer auth", async () => {
    const { calls, fetchImpl } = createFetchStub();
    const scorer = createVoyageScorer({
      apiKey: "voyage_test_key",
      fetchImpl,
    });

    const score = await scorer({
      request: {
        fingerprintId: "vf_voyage",
        text: onVoiceDraft,
        kind: "linkedin-post",
      },
      profile: trainedProfile,
      signalTokens: ["launch", "proof"],
    });

    expect(score).toMatchObject({
      source: "voyage",
      similarity: expect.any(Number),
    });
    expect(calls[0].url).toBe("https://api.voyageai.com/v1/embeddings");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.headers?.Authorization).toBe("Bearer voyage_test_key");
    expect(calls[0].init?.headers?.["content-type"]).toBe("application/json");
    expect(JSON.parse(calls[0].init?.body ?? "{}")).toMatchObject({
      input: [onVoiceDraft],
      model: "voyage-3-lite",
    });
  });

  it("accepts an on-voice draft through the existing gate threshold", async () => {
    const { fetchImpl } = createFetchStub();
    const service = dearMeVoiceGateService({
      profileStore: createProfileStore(),
      semanticScorer: createVoyageScorer({
        apiKey: "voyage_test_key",
        fetchImpl,
      }),
    });

    const result = await service.scoreVoice({
      fingerprintId: "vf_voyage_on_voice",
      text: onVoiceDraft,
      kind: "linkedin-post",
      minScore: 98,
    });

    expect(result.passed).toBe(true);
    expect(result.reasons.some((reason) => reason.rule === "semantic_voice_match")).toBe(true);
  });

  it("rejects an off-voice draft through the existing gate threshold", async () => {
    const { fetchImpl } = createFetchStub();
    const service = dearMeVoiceGateService({
      profileStore: createProfileStore(),
      semanticScorer: createVoyageScorer({
        apiKey: "voyage_test_key",
        fetchImpl,
      }),
    });

    const result = await service.scoreVoice({
      fingerprintId: "vf_voyage_off_voice",
      text: offVoiceDraft,
      kind: "linkedin-post",
      minScore: 98,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.some((reason) => reason.rule === "semantic_voice_drift")).toBe(true);
  });

  it("caches embeddings so the same draft is embedded once", async () => {
    const { calls, fetchImpl } = createFetchStub();
    const scorer = createVoyageScorer({
      apiKey: "voyage_test_key",
      fetchImpl,
    });

    const input = {
      request: {
        fingerprintId: "vf_voyage_cache",
        text: onVoiceDraft,
        kind: "linkedin-post" as const,
      },
      profile: trainedProfile,
      signalTokens: ["launch", "proof"],
    };

    await scorer(input);
    await scorer(input);

    expect(calls.filter((call) => call.input === onVoiceDraft)).toHaveLength(1);
  });

  it("fails closed when Voyage is selected without an API key", () => {
    expect(() => resolveDearMeVoiceSemanticScorerFromEnv({
      DEARME_VOICE_SEMANTIC_SCORER: "voyage",
    } as NodeJS.ProcessEnv)).toThrow("DEARME_VOICE_VOYAGE_API_KEY is required");
  });
});
