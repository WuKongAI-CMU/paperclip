/**
 * Voice-gate scoring service (cloud-side).
 *
 * Implements the wire defined in
 * `@paperclipai/dearme-ai-proxy/voice-gate.ts`. Backs `POST /v1/voice/score`
 * (DM-170).
 *
 * Scoring policy:
 *   - The durable cloud scorer can accept a trained semantic signal when it
 *     is configured. Until then, this file ships a deterministic scorer that
 *     can already enforce the product contract: concrete, first-person,
 *     private work should pass the default floor on the first try, while
 *     generic output and hidden process language get blocked before review.
 *   - An accepted-sample profile gives follow-up drafts a small continuity
 *     boost for the same voice id. The default store is in-memory, but the
 *     service accepts a serializable store so the route is not tied to one
 *     process when DM-170 moves to durable storage.
 *
 * This is the only place the scoring logic lives — every other layer
 * calls `scoreVoice()` and gets the typed `VoiceGateScoreResponse`.
 */

import {
  VOICE_GATE_DEFAULT_FLOOR,
  type VoiceGateArtifactKind,
  type VoiceGateScoreReason,
  type VoiceGateScoreRequest,
  type VoiceGateScoreResponse,
} from "@paperclipai/dearme-ai-proxy";
import { DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN } from "./dearme-customer-text.js";

type VoiceCorpusProfile = {
  acceptedSamples: number;
  tokenCounts: Map<string, number>;
};

export type DearMeVoiceProfileScope = {
  companyId?: string | null;
  userId?: string | null;
};

export type DearMeVoiceGateScoreInput = VoiceGateScoreRequest & DearMeVoiceProfileScope;

export type DearMeVoiceCorpusProfileSnapshot = {
  acceptedSamples: number;
  tokenCounts: Record<string, number>;
};

export type DearMeVoiceSemanticScore = {
  /** Normalized 0..1 match against the trained voice profile. */
  similarity: number;
  /** Optional 0..1 confidence from the semantic scorer. Defaults to 1. */
  confidence?: number;
  /** Internal provenance for logs/tests. This is never returned to customers. */
  source?: string;
};

export type DearMeVoiceSemanticScorer = (input: {
  request: DearMeVoiceGateScoreInput;
  profile: DearMeVoiceCorpusProfileSnapshot;
  signalTokens: ReadonlyArray<string>;
}) => Promise<DearMeVoiceSemanticScore | null>;

export interface DearMeVoiceProfileStore {
  readProfile(
    fingerprintId: string,
    scope?: DearMeVoiceProfileScope,
  ): Promise<DearMeVoiceCorpusProfileSnapshot | null>;
  writeProfile(
    fingerprintId: string,
    profile: DearMeVoiceCorpusProfileSnapshot,
    scope?: DearMeVoiceProfileScope,
  ): Promise<void>;
}

const MAX_PROFILE_TOKENS = 160;
const MAX_ACCEPTED_SAMPLES = 1_000;

/**
 * Sycophancy / disclaimer / hype phrase lexicon. These knock points off the
 * score; they are the same red flags the DearMe bootstrap warns against.
 */
const NEGATIVE_PHRASES: ReadonlyArray<{ phrase: RegExp; weight: number; rule: string; note: string }> = [
  {
    phrase: /\b(?:as an ai|i'm just an ai|i am an ai)\b/i,
    weight: 30,
    rule: "ai_disclaimer",
    note: "Remove the disclaimer so the draft stays in your own voice.",
  },
  {
    phrase: /\b(?:absolutely!|amazing!|incredible!|fantastic!|let's go!)/i,
    weight: 12,
    rule: "hype_word",
    note: "Cut the hype word. It sounds polished in the wrong way.",
  },
  {
    phrase: /\b(?:i hope this (?:email|message) finds you well)\b/i,
    weight: 10,
    rule: "stale_template",
    note: "Replace the stale opener with a more specific first line.",
  },
  {
    phrase: /\b(?:thrilled|delighted|honored) to (?:announce|share|invite)\b/i,
    weight: 8,
    rule: "press_release_voice",
    note: "This sounds too formal for the user's actual tone.",
  },
  {
    phrase: /[!]{2,}|[?]{2,}/,
    weight: 5,
    rule: "punctuation_storm",
    note: "Repeated punctuation makes the draft feel less grounded.",
  },
  {
    phrase: DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
    weight: 16,
    rule: "hidden_process_language",
    note: "Translate behind-the-scenes wording into plain customer language.",
  },
];

/**
 * Per-artifact-kind ceiling. A 280-char tweet can't carry the same depth
 * as a newsletter, so the floor heuristics differ slightly.
 */
const ARTIFACT_KIND_TUNING: Readonly<
  Record<VoiceGateArtifactKind, { lengthMin: number; lengthMax: number; idealMin: number; idealMax: number }>
> = {
  "x-tweet": { lengthMin: 8, lengthMax: 280, idealMin: 70, idealMax: 270 },
  "x-thread": { lengthMin: 50, lengthMax: 5000, idealMin: 180, idealMax: 1600 },
  "linkedin-post": { lengthMin: 80, lengthMax: 3000, idealMin: 120, idealMax: 1200 },
  "linkedin-dm": { lengthMin: 30, lengthMax: 1000, idealMin: 60, idealMax: 400 },
  "direct-message": { lengthMin: 12, lengthMax: 1200, idealMin: 40, idealMax: 420 },
  "newsletter-issue": { lengthMin: 200, lengthMax: 12000, idealMin: 600, idealMax: 3500 },
  "site-bio": { lengthMin: 30, lengthMax: 600, idealMin: 80, idealMax: 260 },
  "site-page": { lengthMin: 80, lengthMax: 5000, idealMin: 300, idealMax: 1800 },
  "outbound-email": { lengthMin: 30, lengthMax: 1500, idealMin: 90, idealMax: 700 },
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "before",
  "being",
  "between",
  "could",
  "draft",
  "every",
  "from",
  "have",
  "into",
  "more",
  "only",
  "people",
  "private",
  "same",
  "should",
  "that",
  "their",
  "there",
  "this",
  "through",
  "today",
  "turn",
  "when",
  "with",
  "work",
  "your",
]);

export interface DearMeVoiceGateService {
  scoreVoice(req: DearMeVoiceGateScoreInput): Promise<VoiceGateScoreResponse>;
}

/**
 * Construct the service. The default scorer is the deterministic stub;
 * tests and DM-170 can either replace it with `{ scorer }` or add a trained
 * semantic signal through `{ semanticScorer }`.
 */
export function dearMeVoiceGateService(options?: {
  scorer?: (req: DearMeVoiceGateScoreInput) => Promise<VoiceGateScoreResponse>;
  profileStore?: DearMeVoiceProfileStore;
  semanticScorer?: DearMeVoiceSemanticScorer;
}): DearMeVoiceGateService {
  const profileStore = options?.profileStore ?? createInMemoryDearMeVoiceProfileStore();
  const scorer =
    options?.scorer ??
    ((req: DearMeVoiceGateScoreInput) => scoreWithCorpus(req, profileStore, options?.semanticScorer));
  return {
    async scoreVoice(req) {
      return scorer(req);
    },
  };
}

export function createInMemoryDearMeVoiceProfileStore(): DearMeVoiceProfileStore {
  const profiles = new Map<string, DearMeVoiceCorpusProfileSnapshot>();
  return {
    async readProfile(fingerprintId) {
      const profile = profiles.get(fingerprintId);
      return profile ? normalizeDearMeVoiceProfileSnapshot(profile) : null;
    },
    async writeProfile(fingerprintId, profile) {
      profiles.set(fingerprintId, normalizeDearMeVoiceProfileSnapshot(profile));
    },
  };
}

async function scoreWithCorpus(
  req: DearMeVoiceGateScoreInput,
  profileStore: DearMeVoiceProfileStore,
  semanticScorer?: DearMeVoiceSemanticScorer,
): Promise<VoiceGateScoreResponse> {
  const floor = req.minScore ?? VOICE_GATE_DEFAULT_FLOOR;
  const tuning = ARTIFACT_KIND_TUNING[req.kind];
  const profileSnapshot = normalizeDearMeVoiceProfileSnapshot(
    (await profileStore.readProfile(req.fingerprintId, req)) ?? { acceptedSamples: 0, tokenCounts: {} },
  );
  const profile = profileFromSnapshot(profileSnapshot);
  const signalTokens = extractSignalTokens(req.text);

  const reasons: VoiceGateScoreReason[] = [];
  let score = 82;

  for (const { phrase, weight, rule, note } of NEGATIVE_PHRASES) {
    if (phrase.test(req.text)) {
      score -= weight;
      reasons.push({ rule, delta: -weight, note });
    }
  }

  if (req.text.length < tuning.lengthMin) {
    const delta = -8;
    score += delta;
    reasons.push({
      rule: "below_min_length",
      delta,
      note: "Add one or two concrete details so this does not read thin.",
    });
  }
  if (req.text.length > tuning.lengthMax) {
    const delta = -6;
    score += delta;
    reasons.push({
      rule: "above_max_length",
      delta,
      note: "Trim the draft before review.",
    });
  }

  if (req.text.length >= tuning.idealMin && req.text.length <= tuning.idealMax) {
    const delta = +4;
    score += delta;
    reasons.push({
      rule: "artifact_fit",
      delta,
      note: "Length fits the artifact and gives the idea room to land.",
    });
  }

  if (hasConcreteEvidence(req.text)) {
    const delta = +8;
    score += delta;
    reasons.push({
      rule: "concrete_evidence",
      delta,
      note: "Concrete details make the point feel earned.",
    });
  }

  if (hasLivedInVoice(req.text)) {
    const delta = +6;
    score += delta;
    reasons.push({
      rule: "lived_in_voice",
      delta,
      note: "The draft carries a first-person point of view.",
    });
  }

  if (hasUsefulShape(req.text)) {
    const delta = +4;
    score += delta;
    reasons.push({
      rule: "useful_shape",
      delta,
      note: "It moves from observation to a clear point.",
    });
  }

  const similarity = profileSimilarity(signalTokens, profile);
  if (similarity >= 0.18) {
    const delta = +5;
    score += delta;
    reasons.push({
      rule: "voice_continuity",
      delta,
      note: "This is close to writing that already passed review.",
    });
  } else if (similarity >= 0.08) {
    const delta = +3;
    score += delta;
    reasons.push({
      rule: "voice_continuity",
      delta,
      note: "This has a few details that match prior approved writing.",
    });
  }

  if (semanticScorer) {
    const semanticReason = semanticVoiceReason(
      await semanticScorer({
        request: req,
        profile: profileSnapshot,
        signalTokens,
      }),
    );
    if (semanticReason) {
      score += semanticReason.delta;
      reasons.push(semanticReason);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= floor;
  if (passed) {
    rememberAcceptedSample(profile, signalTokens);
    await profileStore.writeProfile(req.fingerprintId, snapshotFromProfile(profile), req);
  }

  return {
    score,
    passed,
    floor,
    reasons: topReasons(reasons),
    rewrite: passed ? null : buildSoftRejectRewrite(req.kind),
  };
}

function buildSoftRejectRewrite(kind: VoiceGateArtifactKind): string {
  if (kind === "site-bio") {
    return "I turn scattered proof into a sharper public story: what changed, why it matters, and the one next step worth asking for.";
  }

  if (kind === "linkedin-dm" || kind === "direct-message" || kind === "outbound-email") {
    return "I shipped one inspectable launch proof because the next conversation needed a clearer yes. If it is useful, I can send the short version and one concrete next step.";
  }

  return "I shipped the private proof after the launch call because the buyer needed one inspectable next yes before we asked for more. I would rather show the work than over-explain it.";
}

function profileFromSnapshot(snapshot: DearMeVoiceCorpusProfileSnapshot | null): VoiceCorpusProfile {
  if (!snapshot) return { acceptedSamples: 0, tokenCounts: new Map() };
  const tokenCounts = new Map<string, number>();
  for (const [token, count] of Object.entries(snapshot.tokenCounts)) {
    if (!token || !Number.isFinite(count) || count <= 0) continue;
    tokenCounts.set(token, Math.floor(count));
  }
  return {
    acceptedSamples: normalizeAcceptedSamples(snapshot.acceptedSamples),
    tokenCounts,
  };
}

function snapshotFromProfile(profile: VoiceCorpusProfile): DearMeVoiceCorpusProfileSnapshot {
  const tokenCounts = [...profile.tokenCounts.entries()]
    .filter(([token, count]) => token.length > 0 && Number.isFinite(count) && count > 0)
    .sort(([aToken, aCount], [bToken, bCount]) => bCount - aCount || aToken.localeCompare(bToken))
    .slice(0, MAX_PROFILE_TOKENS);

  return {
    acceptedSamples: normalizeAcceptedSamples(profile.acceptedSamples),
    tokenCounts: Object.fromEntries(tokenCounts),
  };
}

export function normalizeDearMeVoiceProfileSnapshot(
  snapshot: DearMeVoiceCorpusProfileSnapshot,
): DearMeVoiceCorpusProfileSnapshot {
  return snapshotFromProfile(profileFromSnapshot(snapshot));
}

function hasConcreteEvidence(text: string): boolean {
  return (
    /\b\d{1,4}(?:,\d{3})*\b|https?:\/\//.test(text) ||
    /\b(?:because|learned|measured|shipped|published|reviewed|customer|launch|call|demo|proof)\b/i.test(text)
  );
}

function hasLivedInVoice(text: string): boolean {
  return /\b(?:i|i'm|i've|i'll|my|we|we're|we've|our)\b/i.test(text);
}

function hasUsefulShape(text: string): boolean {
  return /\b(?:because|so|but|then|before|after|instead|while|without)\b/i.test(text);
}

function extractSignalTokens(text: string): string[] {
  const normalized = text.toLowerCase();
  const matches = normalized.match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? [];
  const tokens = matches.filter((token) => token.length > 3 && !STOP_WORDS.has(token));
  return [...new Set(tokens)].slice(0, 80);
}

function profileSimilarity(tokens: ReadonlyArray<string>, profile: VoiceCorpusProfile): number {
  if (profile.acceptedSamples === 0 || tokens.length === 0) return 0;
  let hits = 0;
  for (const token of tokens) {
    if (profile.tokenCounts.has(token)) hits += 1;
  }
  return hits / tokens.length;
}

function semanticVoiceReason(result: DearMeVoiceSemanticScore | null): VoiceGateScoreReason | null {
  if (!result) return null;
  const similarity = clampUnit(result.similarity);
  if (similarity === null) return null;
  const confidence = result.confidence === undefined ? 1 : clampUnit(result.confidence);
  if (confidence === null || confidence < 0.5) return null;

  if (similarity >= 0.82) {
    return {
      rule: "semantic_voice_match",
      delta: +7,
      note: "The draft matches the approved voice profile.",
    };
  }
  if (similarity >= 0.68) {
    return {
      rule: "semantic_voice_match",
      delta: +4,
      note: "The draft mostly matches the approved voice profile.",
    };
  }
  if (similarity <= 0.22 && confidence >= 0.7) {
    return {
      rule: "semantic_voice_drift",
      delta: -10,
      note: "The draft departs from the approved voice profile; revise before public use.",
    };
  }
  if (similarity <= 0.35 && confidence >= 0.7) {
    return {
      rule: "semantic_voice_drift",
      delta: -6,
      note: "The draft is weaker against the approved voice profile.",
    };
  }
  return null;
}

function clampUnit(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function rememberAcceptedSample(profile: VoiceCorpusProfile, tokens: ReadonlyArray<string>) {
  profile.acceptedSamples = Math.min(MAX_ACCEPTED_SAMPLES, profile.acceptedSamples + 1);
  for (const token of tokens) {
    profile.tokenCounts.set(token, (profile.tokenCounts.get(token) ?? 0) + 1);
  }
}

function normalizeAcceptedSamples(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_ACCEPTED_SAMPLES, Math.floor(value)));
}

function topReasons(reasons: ReadonlyArray<VoiceGateScoreReason>): VoiceGateScoreReason[] {
  return [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
}
