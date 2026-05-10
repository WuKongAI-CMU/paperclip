/**
 * Voice-gate wire contract.
 *
 * The voice gate is DearMe IP. OpenClaw provides voice CAPTURE (Whisper /
 * Deepgram / ElevenLabs skills); Naive provides the work_products table
 * to attach scores to; this contract is the SCORING wire.
 *
 * Scoring lives at `${baseURL}/v1/voice/score` on the DearMe cloud.
 * Authenticated by `dm_sk_*`. Per-call cost is folded into the AI proxy
 * cost ledger.
 *
 * Pipeline (top to bottom):
 *
 *   1. User signs up. Cloud crawls public corpus (LinkedIn / GitHub /
 *      personal site / X) and trains a fingerprint, storing the model id
 *      against `users.voiceFingerprintId`.
 *
 *   2. A Content Producer or Opportunity Hunter or Brand Site Builder
 *      drafts text (prompt → string).
 *
 *   3. Before approval gating, the cloud's outbound-tool wrapper calls
 *      `scoreVoiceFingerprint({ fingerprintId, text, kind })` and gets
 *      back `{ score, passed, floor, reasons }`.
 *
 *   4. Score persists on `issue_work_products.metadata.voiceGateScore`
 *      and on the SSE event stream as a `voice_gate_scored` event.
 *
 *   5. Approval resolution (`approval-gates.ts::resolveApproval`) checks
 *      `voiceGateRequired` for the gate; rejects below floor.
 *
 * No real-time scoring is required for non-publish artifacts (research
 * reports, internal notes); those skip this entirely.
 */

import { DM_PROXY_BASE_URL_DEFAULT } from "./contract.js";

export const VOICE_GATE_PATH = "/v1/voice/score";

/** Default minimum score the cloud floors to if config is omitted. */
export const VOICE_GATE_DEFAULT_FLOOR = 92;

/**
 * Scorable artifact kinds. `kind` lets the cloud pick the right
 * heuristics (a 280-char tweet is not scored the same as a 1500-word
 * newsletter).
 */
export const VOICE_GATE_ARTIFACT_KINDS = [
  "x-tweet",
  "x-thread",
  "linkedin-post",
  "linkedin-dm",
  "newsletter-issue",
  "site-bio",
  "site-page",
  "outbound-email",
] as const;
export type VoiceGateArtifactKind = (typeof VOICE_GATE_ARTIFACT_KINDS)[number];

export interface VoiceGateScoreRequest {
  /** From `users.voiceFingerprintId`. */
  fingerprintId: string;
  /** Free text to score. */
  text: string;
  /** Per-artifact-kind scoring profile. */
  kind: VoiceGateArtifactKind;
  /**
   * Optional explicit floor override. If unset, the cloud uses the
   * user's `defaults.voiceGate.minScore` from the OpenClaw plugin
   * config.
   */
  minScore?: number;
}

export interface VoiceGateScoreReason {
  /** Short slug of the rule that fired. */
  rule: string;
  /** -10..+10 points contributed to the score. */
  delta: number;
  /** Human-readable note for the work-product card. */
  note: string;
}

export interface VoiceGateScoreResponse {
  /** Score 0-100. */
  score: number;
  /** Whether `score >= floor`. */
  passed: boolean;
  /** The floor used at scoring time. */
  floor: number;
  /** Top contributing rules (positive + negative). Cap at ~5 for UX. */
  reasons: ReadonlyArray<VoiceGateScoreReason>;
  /**
   * Optional revised draft if the cloud auto-rewrote the input to lift
   * it above the floor (Polsia "soft reject" pattern). `null` when the
   * input passed and no rewrite is needed.
   */
  rewrite: string | null;
}

/**
 * Helper for building the URL the OpenClaw plugin tool wrapper hits.
 * Pure; no I/O. Plugin code adds Authorization + tracing headers.
 */
export function buildVoiceGateUrl(
  baseUrl: string = DM_PROXY_BASE_URL_DEFAULT,
): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}${VOICE_GATE_PATH}`;
}
