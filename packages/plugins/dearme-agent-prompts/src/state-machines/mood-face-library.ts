/**
 * Mood face library used by the chief-of-staff and worker agents to push
 * `mood_update` SSE events to the DearMe live surface.
 *
 * face_slug is a stable identifier; face_name is the display label;
 * accent_color is a 7-character hex used by the UI to tint the avatar tile.
 *
 * Lineage: face slug naming convention adapted from DearMe internal mood
 * research into the personal-brand-team domain. Original donor faces are
 * not shipped here; this is a curated DearMe-personal-brand subset.
 */

export interface MoodFace {
  slug: string;
  displayName: string;
  /** 7-character hex accent color the UI tints around this face. */
  accentColor: string;
  /** Plain-text description used in agent reasoning prompts. */
  vibe: string;
}

export const MOOD_FACE_LIBRARY: ReadonlyArray<MoodFace> = [
  {
    slug: "expr-curious",
    displayName: "Curious",
    accentColor: "#ff8c00",
    vibe: "Picking up a new signal — researching before acting.",
  },
  {
    slug: "expr-investigating",
    displayName: "Investigating",
    accentColor: "#ffb147",
    vibe: "Deep in source material — pulling threads together.",
  },
  {
    slug: "expr-thoughtful",
    displayName: "Thoughtful",
    accentColor: "#a86bff",
    vibe: "Holding two options and choosing the better one.",
  },
  {
    slug: "expr-focused",
    displayName: "Focused",
    accentColor: "#3399ff",
    vibe: "Heads-down on the next concrete artifact.",
  },
  {
    slug: "expr-coding",
    displayName: "Coding",
    accentColor: "#0bd6a4",
    vibe: "Building or fixing the brand site.",
  },
  {
    slug: "expr-debugging",
    displayName: "Debugging",
    accentColor: "#ff5b78",
    vibe: "Found a problem — narrowing down the cause.",
  },
  {
    slug: "expr-stuck",
    displayName: "Stuck",
    accentColor: "#cc5566",
    vibe: "Blocked, escalating to user or surfacing the gap.",
  },
  {
    slug: "expr-frustrated",
    displayName: "Frustrated",
    accentColor: "#a04050",
    vibe: "Same blocker twice — flagging for a different approach.",
  },
  {
    slug: "expr-pumped",
    displayName: "Pumped & Ready",
    accentColor: "#ff8c00",
    vibe: "Plan looks great — about to ship.",
  },
  {
    slug: "expr-launching",
    displayName: "Launching",
    accentColor: "#ffd166",
    vibe: "Pushing the artifact live to the brand site / channel.",
  },
  {
    slug: "expr-celebrating",
    displayName: "Celebrating",
    accentColor: "#ffce00",
    vibe: "Shipped real proof — pausing to mark the win.",
  },
  {
    slug: "expr-listening",
    displayName: "Listening",
    accentColor: "#88aabb",
    vibe: "Reading inbound replies / DM / comments.",
  },
  {
    slug: "expr-drafting",
    displayName: "Drafting",
    accentColor: "#7090b0",
    vibe: "Composing copy in the user's voice profile.",
  },
  {
    slug: "expr-reviewing",
    displayName: "Reviewing",
    accentColor: "#6080a0",
    vibe: "Voice-gating drafts before publish.",
  },
  {
    slug: "expr-reporting",
    displayName: "Reporting",
    accentColor: "#506070",
    vibe: "Writing the daily / weekly Dear me report.",
  },
  {
    slug: "expr-hunting",
    displayName: "Hunting",
    accentColor: "#22aa88",
    vibe: "Scanning for sponsorship / podcast / paid-client opportunities.",
  },
];

const slugIndex = new Map<string, MoodFace>(
  MOOD_FACE_LIBRARY.map((face) => [face.slug, face]),
);

export function getMoodFace(slug: string): MoodFace | undefined {
  return slugIndex.get(slug);
}
