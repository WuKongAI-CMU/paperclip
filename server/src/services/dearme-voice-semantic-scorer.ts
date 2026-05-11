import type {
  DearMeVoiceSemanticScorer,
  DearMeVoiceSemanticScore,
} from "./dearme-voice-gate.js";

const PROFILE_TOKEN_SCORER_MODES = new Set([
  "1",
  "true",
  "on",
  "profile",
  "profile-token",
  "token-profile",
]);

const DISABLED_SCORER_MODES = new Set([
  "0",
  "false",
  "off",
  "none",
  "disabled",
]);

export type DearMeProfileTokenSemanticScorerConfig = {
  minAcceptedSamples?: number;
  minProfileTokens?: number;
};

export function resolveDearMeVoiceSemanticScorerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DearMeVoiceSemanticScorer | null {
  const mode = env.DEARME_VOICE_SEMANTIC_SCORER?.trim().toLowerCase();
  if (!mode || DISABLED_SCORER_MODES.has(mode)) return null;
  if (!PROFILE_TOKEN_SCORER_MODES.has(mode)) return null;

  return createDearMeProfileTokenSemanticScorer({
    minAcceptedSamples: parsePositiveInt(env.DEARME_VOICE_SEMANTIC_MIN_ACCEPTED_SAMPLES),
    minProfileTokens: parsePositiveInt(env.DEARME_VOICE_SEMANTIC_MIN_PROFILE_TOKENS),
  });
}

export function createDearMeProfileTokenSemanticScorer(
  config: DearMeProfileTokenSemanticScorerConfig = {},
): DearMeVoiceSemanticScorer {
  const minAcceptedSamples = config.minAcceptedSamples ?? 2;
  const minProfileTokens = config.minProfileTokens ?? 8;

  return async ({ profile, signalTokens }) => {
    if (profile.acceptedSamples < minAcceptedSamples) return null;

    const profileVector = vectorFromProfile(profile.tokenCounts);
    if (profileVector.size < minProfileTokens) return null;

    const signalVector = vectorFromTokens(signalTokens);
    if (signalVector.size === 0) return null;

    return {
      similarity: cosineSimilarity(profileVector, signalVector),
      confidence: confidenceForProfile({
        acceptedSamples: profile.acceptedSamples,
        profileTokenCount: profileVector.size,
        signalTokenCount: signalVector.size,
        minAcceptedSamples,
        minProfileTokens,
      }),
      source: "profile-token",
    };
  };
}

function vectorFromProfile(tokenCounts: Record<string, number>) {
  const vector = new Map<string, number>();
  for (const [token, count] of Object.entries(tokenCounts)) {
    if (!token || !Number.isFinite(count) || count <= 0) continue;
    vector.set(token, Math.floor(count));
  }
  return vector;
}

function vectorFromTokens(tokens: ReadonlyArray<string>) {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    if (!token) continue;
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(
  profileVector: ReadonlyMap<string, number>,
  signalVector: ReadonlyMap<string, number>,
) {
  const profileMagnitude = magnitude(profileVector);
  const signalMagnitude = magnitude(signalVector);
  if (profileMagnitude === 0 || signalMagnitude === 0) return 0;

  let dotProduct = 0;
  for (const [token, signalWeight] of signalVector.entries()) {
    dotProduct += signalWeight * (profileVector.get(token) ?? 0);
  }

  return clamp01(dotProduct / (profileMagnitude * signalMagnitude));
}

function magnitude(vector: ReadonlyMap<string, number>) {
  let sum = 0;
  for (const weight of vector.values()) {
    sum += weight * weight;
  }
  return Math.sqrt(sum);
}

function confidenceForProfile(input: {
  acceptedSamples: number;
  profileTokenCount: number;
  signalTokenCount: number;
  minAcceptedSamples: number;
  minProfileTokens: number;
}): DearMeVoiceSemanticScore["confidence"] {
  const sampleConfidence = clamp01(input.acceptedSamples / Math.max(input.minAcceptedSamples + 3, 1));
  const profileConfidence = clamp01(input.profileTokenCount / Math.max(input.minProfileTokens + 12, 1));
  const signalConfidence = clamp01(input.signalTokenCount / 12);
  return clamp01((sampleConfidence * 0.45) + (profileConfidence * 0.35) + (signalConfidence * 0.2));
}

function parsePositiveInt(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
