/**
 * Voice-gate scoring service (cloud-side).
 *
 * Implements the wire defined in
 * `@paperclipai/dearme-ai-proxy/voice-gate.ts`. Backs `POST /v1/voice/score`
 * (DM-170 — full route is the next ticket; this file is the scorer).
 *
 * Scoring policy:
 *   - The durable cloud scorer will eventually use the user's full public
 *     corpus. Until then, this file ships a deterministic scorer that can
 *     already enforce the product contract: concrete, first-person, private
 *     work should pass the default floor on the first try, while generic
 *     output and hidden process language get blocked before review.
 *   - A process-local accepted-sample profile gives follow-up drafts a small
 *     continuity boost for the same voice id. It is deliberately bounded and
 *     transparent so the route can be tested without external services.
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

type VoiceCorpusProfile = {
  acceptedSamples: number;
  tokenCounts: Map<string, number>;
};

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
    phrase: /\b(?:paperclip|openclaw|symphony|adapter|provider|runtime|model|token|setup payload|codex|workbench|queue|admin|fingerprint)\b/i,
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
  scoreVoice(req: VoiceGateScoreRequest): Promise<VoiceGateScoreResponse>;
}

/**
 * Construct the service. The default scorer is the deterministic stub;
 * tests and DM-170 swap in a real model by passing `{ scorer }`.
 */
export function dearMeVoiceGateService(options?: {
  scorer?: (req: VoiceGateScoreRequest) => Promise<VoiceGateScoreResponse>;
}): DearMeVoiceGateService {
  const profiles = new Map<string, VoiceCorpusProfile>();
  const scorer = options?.scorer ?? ((req: VoiceGateScoreRequest) => scoreWithCorpus(req, profiles));
  return {
    async scoreVoice(req) {
      return scorer(req);
    },
  };
}

async function scoreWithCorpus(
  req: VoiceGateScoreRequest,
  profiles: Map<string, VoiceCorpusProfile>,
): Promise<VoiceGateScoreResponse> {
  const floor = req.minScore ?? VOICE_GATE_DEFAULT_FLOOR;
  const tuning = ARTIFACT_KIND_TUNING[req.kind];
  const profile = profiles.get(req.fingerprintId) ?? { acceptedSamples: 0, tokenCounts: new Map() };
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

  score = Math.max(0, Math.min(100, score));
  const passed = score >= floor;
  if (passed) {
    rememberAcceptedSample(profile, signalTokens);
    profiles.set(req.fingerprintId, profile);
  }

  return {
    score,
    passed,
    floor,
    reasons: topReasons(reasons),
    rewrite: null,
  };
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

function rememberAcceptedSample(profile: VoiceCorpusProfile, tokens: ReadonlyArray<string>) {
  profile.acceptedSamples += 1;
  for (const token of tokens) {
    profile.tokenCounts.set(token, (profile.tokenCounts.get(token) ?? 0) + 1);
  }
}

function topReasons(reasons: ReadonlyArray<VoiceGateScoreReason>): VoiceGateScoreReason[] {
  return [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
}
