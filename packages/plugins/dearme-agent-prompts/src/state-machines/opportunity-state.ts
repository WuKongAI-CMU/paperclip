/**
 * Opportunity lifecycle state machine for the DearMe Opportunity Hunter role.
 *
 * Domain: personal-brand growth-team (podcasts, sponsorships, paid clients,
 * job offers, partnerships, speaking slots, retainers).
 *
 * Lineage: adapted from DearMe internal outbound-research into the
 * personal-brand domain. Compliance: see `docs/dearme/REBRAND-AND-PROVENANCE.md`.
 */

export const OPPORTUNITY_STATES = [
  /** Newly discovered, not yet researched. */
  "pending",
  /** Researched + drafted, awaiting send. */
  "drafted",
  /** Outbound sent, awaiting first reply. */
  "sent",
  /** They replied — needs human review or follow-up. */
  "replied",
  /** Reply turned into a confirmed conversation / call / meeting. */
  "confirmed",
  /** Closed-won: deal / podcast / gig / hire actually happened. */
  "completed",
  /** Closed-declined: politely refused. */
  "declined",
  /** Closed-dead: bounced / hard-no / unresponsive after follow-ups. */
  "dead",
] as const;

export type OpportunityState = (typeof OPPORTUNITY_STATES)[number];

export const TERMINAL_OPPORTUNITY_STATES: ReadonlyArray<OpportunityState> = [
  "completed",
  "declined",
  "dead",
] as const;

/** Allowed forward transitions. Any other transition must be rejected. */
export const OPPORTUNITY_STATE_TRANSITIONS: Readonly<
  Record<OpportunityState, ReadonlyArray<OpportunityState>>
> = {
  pending: ["drafted", "dead"],
  drafted: ["sent", "dead"],
  sent: ["replied", "dead"],
  replied: ["confirmed", "declined", "dead"],
  confirmed: ["completed", "declined", "dead"],
  completed: [],
  declined: [],
  dead: [],
};

export function canTransitionOpportunity(
  from: OpportunityState,
  to: OpportunityState,
): boolean {
  return OPPORTUNITY_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Default kinds DearMe tracks. Plugins can extend in their own seed config. */
export const OPPORTUNITY_KINDS = [
  "podcast",
  "sponsorship",
  "paid_client",
  "job_offer",
  "partnership",
  "speaking",
  "retainer",
  "newsletter_collab",
  "other",
] as const;

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];
