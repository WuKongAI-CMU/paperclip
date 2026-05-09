/**
 * UGC selfie-style video prompt template for the Ads Manager role.
 *
 * Used to fill creative briefs sent to a generative video model. The
 * template's job is to keep the result flatly authentic — no text overlays,
 * no music, no transitions, no screen shots — so the ad reads like a
 * person's real talking-to-camera moment.
 *
 * Lineage: structure adapted from DearMe internal ad-creative-research.
 */

export interface SoraUgcVideoVars {
  age: number | string;
  gender: string;
  personalityTrait: string;
  setting: string;
  /** 2-3 sentences of natural pitch + a clear call to action. */
  dialogue: string;
}

export function renderSoraUgcVideoPrompt(vars: SoraUgcVideoVars): string {
  return [
    `Vertical iPhone selfie video.`,
    `A ${vars.age}-year-old ${vars.gender}, ${vars.personalityTrait}.`,
    `${vars.setting}. Soft daylight, neutral background.`,
    `No subtitles. No text. No transitions. No animations. No music. No screens visible.`,
    `Dialogue: "${vars.dialogue}"`,
  ].join(" ");
}

export const SORA_UGC_VIDEO_TEMPLATE = String.raw`
Vertical iPhone selfie video. A {{age}}-year-old {{gender}}, {{personalityTrait}}.
{{setting}}. Soft daylight, neutral background.
No subtitles. No text. No transitions. No animations. No music. No screens visible.
Dialogue: "{{dialogue}}"
`.trim();
