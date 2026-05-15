import { createHash } from "node:crypto";
import type {
  DearMeVoiceSemanticScorer,
  DearMeVoiceSemanticScore,
} from "./dearme-voice-gate.js";

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_VOYAGE_MODEL = "voyage-3-lite";
const MIN_ACCEPTED_SAMPLES = 2;
const MIN_PROFILE_TOKENS = 8;
const MAX_PROFILE_TEXT_TOKENS = 160;

type VoyageFetch = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  text(): Promise<string>;
}>;

export type DearMeVoyageScorerConfig = {
  apiKey: string;
  model?: string;
  fetchImpl?: VoyageFetch;
};

type VoyageEmbeddingsResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

export function createVoyageScorer(config: DearMeVoyageScorerConfig): DearMeVoiceSemanticScorer {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error("DEARME_VOICE_VOYAGE_API_KEY is required when DEARME_VOICE_SEMANTIC_SCORER=voyage");
  }

  const model = config.model?.trim() || DEFAULT_VOYAGE_MODEL;
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("Voyage voice scorer requires a fetch implementation");
  }

  const embeddingCache = new Map<string, number[]>();

  return async ({ request, profile }) => {
    if (profile.acceptedSamples < MIN_ACCEPTED_SAMPLES) return null;

    const profileText = profileTextFromTokenCounts(profile.tokenCounts);
    if (!profileText) return null;

    const [draftEmbedding, profileEmbedding] = await Promise.all([
      embedText({
        text: request.text,
        apiKey,
        model,
        fetchImpl,
        embeddingCache,
      }),
      embedText({
        text: profileText,
        apiKey,
        model,
        fetchImpl,
        embeddingCache,
      }),
    ]);

    return {
      similarity: cosineSimilarity(draftEmbedding, profileEmbedding),
      confidence: confidenceForVoyageProfile({
        acceptedSamples: profile.acceptedSamples,
        profileTokenCount: Object.keys(profile.tokenCounts).length,
      }),
      source: "voyage",
    };
  };
}

async function embedText(input: {
  text: string;
  apiKey: string;
  model: string;
  fetchImpl: VoyageFetch;
  embeddingCache: Map<string, number[]>;
}): Promise<number[]> {
  const cacheKey = `${input.model}:${hashText(input.text)}`;
  const cached = input.embeddingCache.get(cacheKey);
  if (cached) return cached;

  const response = await input.fetchImpl(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      input: [input.text],
      model: input.model,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Voyage voice scorer embedding request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`,
    );
  }

  const parsed = JSON.parse(responseText) as VoyageEmbeddingsResponse;
  const embedding = parsed.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0 || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Voyage voice scorer returned an invalid embedding response");
  }

  input.embeddingCache.set(cacheKey, embedding);
  return embedding;
}

function profileTextFromTokenCounts(tokenCounts: Record<string, number>): string | null {
  const tokens = Object.entries(tokenCounts)
    .filter(([token, count]) => token.length > 0 && Number.isFinite(count) && count > 0)
    .sort(([aToken, aCount], [bToken, bCount]) => bCount - aCount || aToken.localeCompare(bToken));

  if (tokens.length < MIN_PROFILE_TOKENS) return null;

  const weightedTokens: string[] = [];
  for (const [token, count] of tokens) {
    const repetitions = Math.max(1, Math.floor(count));
    for (let index = 0; index < repetitions && weightedTokens.length < MAX_PROFILE_TEXT_TOKENS; index += 1) {
      weightedTokens.push(token);
    }
    if (weightedTokens.length >= MAX_PROFILE_TEXT_TOKENS) break;
  }

  return weightedTokens.join(" ");
}

function cosineSimilarity(left: ReadonlyArray<number>, right: ReadonlyArray<number>): DearMeVoiceSemanticScore["similarity"] {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return clamp01(dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude)));
}

function confidenceForVoyageProfile(input: {
  acceptedSamples: number;
  profileTokenCount: number;
}): DearMeVoiceSemanticScore["confidence"] {
  const sampleConfidence = clamp01(input.acceptedSamples / 5);
  const profileConfidence = clamp01(input.profileTokenCount / 20);
  return clamp01((sampleConfidence * 0.6) + (profileConfidence * 0.4));
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
