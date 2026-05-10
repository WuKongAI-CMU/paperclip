/**
 * Voice-gate scoring service (cloud-side).
 *
 * Implements the wire defined in
 * `@paperclipai/dearme-ai-proxy/voice-gate.ts`. Backs `POST /v1/voice/score`
 * (DM-170 — full route is the next ticket; this file is the scorer).
 *
 * Stub policy:
 *   - The real scorer is a small ML model trained on the user's public
 *     corpus during onboarding (DM-138). That ships as DM-170-impl.
 *   - Until then, this file ships a *deterministic, transparent stub*
 *     scorer that catches the obvious tells (sycophancy markers, AI
 *     disclaimers, marketing fluff) so the integration end-to-end pipe
 *     can be exercised without a real model.
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

/**
 * Sycophancy / AI-disclaimer / hype phrase lexicon. These knock points off
 * the score; they are the same red flags the SOUL.md bootstrap warns
 * against (`packages/plugins/dearme-openclaw/src/bootstrap.ts`).
 */
const NEGATIVE_PHRASES: ReadonlyArray<{ phrase: RegExp; weight: number; rule: string; note: string }> = [
  {
    phrase: /\b(?:as an ai|i'm just an ai|i am an ai)\b/i,
    weight: 30,
    rule: "ai_disclaimer",
    note: "Remove the 'as an AI' framing — DearMe never breaks the fourth wall.",
  },
  {
    phrase: /\b(?:absolutely!|amazing!|incredible!|fantastic!|let's go!)/i,
    weight: 12,
    rule: "hype_word",
    note: "Cut the hype word — sounds like a marketing email, not the user.",
  },
  {
    phrase: /\b(?:i hope this (?:email|message) finds you well)\b/i,
    weight: 10,
    rule: "stale_template",
    note: "Stale outreach opener — flagged as low-effort cold-email template.",
  },
  {
    phrase: /\b(?:thrilled|delighted|honored) to (?:announce|share|invite)\b/i,
    weight: 8,
    rule: "press_release_voice",
    note: "Press-release voice — too formal for the user's actual tone.",
  },
  {
    phrase: /[!]{2,}|[?]{2,}/,
    weight: 5,
    rule: "punctuation_storm",
    note: "Repeated !! or ?? reads desperate.",
  },
];

/**
 * Per-artifact-kind ceiling. A 280-char tweet can't carry the same depth
 * as a newsletter, so the floor heuristics differ slightly.
 */
const ARTIFACT_KIND_TUNING: Readonly<
  Record<VoiceGateArtifactKind, { lengthMin: number; lengthMax: number }>
> = {
  "x-tweet": { lengthMin: 8, lengthMax: 280 },
  "x-thread": { lengthMin: 50, lengthMax: 5000 },
  "linkedin-post": { lengthMin: 80, lengthMax: 3000 },
  "linkedin-dm": { lengthMin: 30, lengthMax: 1000 },
  "newsletter-issue": { lengthMin: 200, lengthMax: 12000 },
  "site-bio": { lengthMin: 30, lengthMax: 600 },
  "site-page": { lengthMin: 80, lengthMax: 5000 },
  "outbound-email": { lengthMin: 30, lengthMax: 1500 },
};

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
  const scorer = options?.scorer ?? stubScore;
  return {
    async scoreVoice(req) {
      return scorer(req);
    },
  };
}

async function stubScore(
  req: VoiceGateScoreRequest,
): Promise<VoiceGateScoreResponse> {
  const floor = req.minScore ?? VOICE_GATE_DEFAULT_FLOOR;
  const tuning = ARTIFACT_KIND_TUNING[req.kind];

  const reasons: VoiceGateScoreReason[] = [];
  let score = 100;

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
      note: `Below the ${req.kind} floor (${tuning.lengthMin} chars). Reads thin.`,
    });
  }
  if (req.text.length > tuning.lengthMax) {
    const delta = -6;
    score += delta;
    reasons.push({
      rule: "above_max_length",
      delta,
      note: `Above the ${req.kind} ceiling (${tuning.lengthMax} chars). Trim.`,
    });
  }

  // Reward signs of specific evidence (numbers, named entities).
  if (/\b\d{1,4}(?:,\d{3})*\b|https?:\/\//.test(req.text)) {
    const delta = +4;
    score += delta;
    reasons.push({
      rule: "concrete_evidence",
      delta,
      note: "Includes a number or link — concrete enough to feel earned.",
    });
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    passed: score >= floor,
    floor,
    reasons,
    rewrite: null,
  };
}
