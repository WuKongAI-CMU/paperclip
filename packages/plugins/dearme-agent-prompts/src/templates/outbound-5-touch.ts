/**
 * 5-touch outbound sequence template used by the Opportunity Hunter role.
 *
 * Adapted from DearMe internal outbound-research into the personal-brand
 * domain. Each touch carries a distinct angle so the recipient never reads
 * two consecutive messages of the same shape.
 */

export interface OutboundTouch {
  /** Day of the sequence this touch is sent on. */
  dayOffset: number;
  /** Subject-line pattern (uses {{handle}}, {{signal}}, etc. placeholders). */
  subjectPattern: string;
  /** Body length budget in words. */
  wordBudgetMin: number;
  wordBudgetMax: number;
  /** What this touch is supposed to do for the recipient. */
  intent: string;
  /** What to NOT do (anti-pattern guard). */
  donts: ReadonlyArray<string>;
}

export const OUTBOUND_5_TOUCH: ReadonlyArray<OutboundTouch> = [
  {
    dayOffset: 1,
    subjectPattern: "{{user_brand}} + {{recipient_workflow}}",
    wordBudgetMin: 60,
    wordBudgetMax: 110,
    intent:
      "Open with one specific public signal about the recipient (job post, " +
      "fundraise, recent thread). Bridge to the pain it implies. One-line " +
      "pitch. One soft ask: 15-min call?",
    donts: [
      "Do not list features.",
      "Do not include attachments.",
      "Do not ask for an intro to anyone else yet.",
    ],
  },
  {
    dayOffset: 3,
    subjectPattern: "Re: {{previous_subject}}",
    wordBudgetMin: 50,
    wordBudgetMax: 90,
    intent:
      "Acknowledge no reply non-needily. Drop ONE concrete proof point: " +
      "a peer outcome with a specific number (time saved / revenue / " +
      "follower delta). Same ask as touch 1.",
    donts: [
      "Do not apologize for emailing.",
      "Do not over-personalize a second time.",
    ],
  },
  {
    dayOffset: 6,
    subjectPattern: "A different angle for {{recipient_workflow}}",
    wordBudgetMin: 70,
    wordBudgetMax: 120,
    intent:
      "Reframe with a different pain angle than touch 1. If touch 1 hit " +
      "ops, touch 3 hits revenue or hiring. Soft ask: 'Happy to share how " +
      "we approached this with {{peer_company}}.'",
    donts: [
      "Do not repeat the touch-1 hook.",
      "Do not push hard.",
    ],
  },
  {
    dayOffset: 10,
    subjectPattern: "Quick resource for {{recipient_brand}}",
    wordBudgetMin: 30,
    wordBudgetMax: 70,
    intent:
      "Drop a specific asset (case study link, 3-min demo, thread). " +
      "Frame as 'thought it'd be useful' with no ask attached. Goal is " +
      "to keep DearMe top-of-mind without pressure.",
    donts: [
      "Do not include a CTA.",
      "Do not ask for a meeting.",
    ],
  },
  {
    dayOffset: 14,
    subjectPattern: "Closing the loop",
    wordBudgetMin: 30,
    wordBudgetMax: 70,
    intent:
      "Last touch. Acknowledge it's the last email. Leave the door open " +
      "for them to reach back when timing is better. Mark the lead " +
      "\`dead\` after this is sent if no reply within 7 days.",
    donts: [
      "Do not include a hard ask.",
      "Do not be passive-aggressive.",
    ],
  },
];

export const OUTBOUND_5_TOUCH_DAYS = OUTBOUND_5_TOUCH.map((t) => t.dayOffset);
