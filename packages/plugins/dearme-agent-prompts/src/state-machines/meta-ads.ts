/**
 * Meta Ads state machines for the DearMe Ads Manager role.
 *
 * Domain: personal-brand promotion (boosting personal-brand sites, lead-magnet
 * landing pages, podcast appearances, paid-client funnels).
 *
 * Lineage: adapted from DearMe internal ads-research. Compliance:
 * `docs/dearme/REBRAND-AND-PROVENANCE.md`.
 */

/** 5 error states observable from Meta's ad management surface. */
export const AD_ERROR_STATES = [
  /**
   * Meta temporarily flagged the ad (policy review or billing). Auto-clears
   * within 48h. While in this state, do not call create_ad — wait.
   */
  "with_issues",
  /**
   * Meta permanently rejected the ad. Cannot retry the same creative — must
   * redo with a new angle.
   */
  "disapproved",
  /**
   * Meta's upload pipeline is retrying. Do not call create_ad until cleared
   * (avoids duplicate spend).
   */
  "pending_upload",
  /**
   * Local rolling-window quota for ad creation hit. Skip creating in this run.
   */
  "create_ad_rate_limit",
  /**
   * Content moderation blocked the ad. Cannot retry; must change the angle
   * completely.
   */
  "moderation_blocked",
] as const;

export type AdErrorState = (typeof AD_ERROR_STATES)[number];

/** 4-tier delivery health classification used to decide replace-vs-keep. */
export const AD_PERFORMANCE_TIERS = [
  "healthy",
  "mediocre",
  "underperforming",
  "delivery_failed",
] as const;

export type AdPerformanceTier = (typeof AD_PERFORMANCE_TIERS)[number];

export interface AdPerformanceRule {
  tier: AdPerformanceTier;
  ctrMin?: number;
  ctrMax?: number;
  cpcMin?: number;
  cpcMax?: number;
  /** Days an ad must be active before the rule applies. */
  minDaysActive: number;
  /** Min impressions before the rule applies. */
  minImpressions: number;
  action:
    | "keep"
    | "replace_after_window"
    | "replace_with_new_angle"
    | "replace_immediately";
}

export const AD_PERFORMANCE_RULES: ReadonlyArray<AdPerformanceRule> = [
  {
    tier: "healthy",
    ctrMin: 0.01, // > 1%
    cpcMax: 1.0, // < $1
    minDaysActive: 0,
    minImpressions: 0,
    action: "keep",
  },
  {
    tier: "mediocre",
    ctrMin: 0.005,
    ctrMax: 0.01, // 0.5-1%
    cpcMin: 1.0,
    cpcMax: 2.0, // $1-$2
    minDaysActive: 7,
    minImpressions: 500,
    action: "replace_after_window",
  },
  {
    tier: "underperforming",
    ctrMax: 0.005, // < 0.5%
    cpcMin: 2.0, // > $2
    minDaysActive: 7,
    minImpressions: 500,
    action: "replace_with_new_angle",
  },
  {
    tier: "delivery_failed",
    minDaysActive: 5,
    minImpressions: 200, // less than 200 after 5 days
    action: "replace_immediately",
  },
];

/**
 * Meta enforces a learning phase. Replacing an ad mid-learning resets the
 * algorithm and raises CPM. Respect this hard rule.
 */
export const AD_LEARNING_PHASE_DAYS = 7;
