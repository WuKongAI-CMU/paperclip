/**
 * Approval gates — the four binary checkpoints DearMe enforces before any
 * irreversible or money-positive action.
 *
 * Doctrine (PRODUCT-ARCHITECTURE §9.0): everywhere else, the team works.
 * At these four edges, the team waits.
 *
 *   publish — first time a piece of content reaches a public surface
 *             (X, LinkedIn post, public newsletter blast, public site copy).
 *   send    — first 1:1 message to a person who has not previously
 *             corresponded (cold outreach email, LinkedIn DM, SMS).
 *   deploy  — first prod push of dearme.app/<handle> and any subsequent
 *             custom-domain change. (Subsequent same-domain pushes are
 *             auto-approved.)
 *   spend   — any paid amount: ad spend, hardware, service, contractor.
 *             Hard cap from `defaults.budget.dailyUsdCap`.
 *
 * Substrate mapping:
 *   - Naive tables: `issue_approvals` (pending/approved/rejected) + `approval_comments`.
 *   - OpenClaw: outbound tool intercepts the tool call until cloud approval state flips.
 *   - Polsia: the "review" stage of every_6h cycle gates publish/send; spend is a Meta-ads-specific gate; deploy is a Brand Site Builder gate.
 */

export const APPROVAL_GATES = ["publish", "send", "deploy", "spend"] as const;
export type ApprovalGate = (typeof APPROVAL_GATES)[number];

export const APPROVAL_DECISIONS = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export interface ApprovalGateConfig {
  /** Default TTL after which a pending approval auto-expires. */
  defaultTtlMinutes: number;
  /**
   * Auto-approve threshold semantics:
   *   - For `publish` / `send`: number of past approved instances after which
   *     subsequent same-channel actions auto-approve. (E.g. after 5 approved
   *     X posts, auto-approve future X posts if voice-gate >= minScore.)
   *   - For `deploy`: 1 means "first deploy gated; subsequent same-domain
   *     deploys auto".
   *   - For `spend`: never auto-approves; a hard cap is the only relaxation.
   */
  autoApproveAfter: number;
  /**
   * Whether this gate's auto-approval requires a passing voice-gate score.
   * `publish` and `send` do; `deploy` and `spend` don't.
   */
  voiceGateRequired: boolean;
  /** Hint for the workbench/LLM when surfacing the approval card. */
  description: string;
}

export const APPROVAL_GATE_CONFIG: Readonly<
  Record<ApprovalGate, ApprovalGateConfig>
> = {
  publish: {
    defaultTtlMinutes: 60,
    autoApproveAfter: 5,
    voiceGateRequired: true,
    description:
      "Public-surface content: X, LinkedIn post, newsletter blast, public site copy.",
  },
  send: {
    defaultTtlMinutes: 60,
    autoApproveAfter: 5,
    voiceGateRequired: true,
    description: "Cold 1:1 message to a person who hasn't replied before.",
  },
  deploy: {
    defaultTtlMinutes: 30,
    autoApproveAfter: 1,
    voiceGateRequired: false,
    description: "First prod push or custom-domain change for the personal site.",
  },
  spend: {
    defaultTtlMinutes: 15,
    autoApproveAfter: Number.POSITIVE_INFINITY,
    voiceGateRequired: false,
    description:
      "Any paid action (ad spend, contractor, hardware). Never auto-approves.",
  },
};

export interface ApprovalRequest {
  gate: ApprovalGate;
  /** Naive `issues.id` this approval blocks. */
  issueId: string;
  /** OpenClaw outbound tool that will fire on approval. */
  toolName: string;
  /** Channel-specific identifier (e.g. "x", "linkedin", "resend", "meta-ads"). */
  channel: string;
  /** Ledger-anchored cost estimate in USD if approved (0 for non-spend gates). */
  estimatedUsd: number;
  /** Voice-gate score (0-100) attached to the staged content, if any. */
  voiceGateScore: number | null;
  /** Why the gate fired (e.g. "first publish to x", "domain change"). */
  reason: string;
  /** When the request was created (ISO). */
  createdAt: string;
}

/**
 * The runtime resolver: given a request, decide whether to auto-approve, gate
 * for the user, or hard-reject. Pure function of inputs.
 *
 * @param req           the approval request
 * @param ctx           runtime context (auto-approve counter + budget cap + voice-score floor)
 * @returns            decision and an explanation suitable for the work-product card
 */
export interface ApprovalContext {
  pastApprovedCount: number;
  dailyUsdSpent: number;
  dailyUsdCap: number;
  minVoiceGateScore: number;
}

export interface ApprovalResolution {
  decision: Extract<ApprovalDecision, "pending" | "approved" | "rejected">;
  reason: string;
}

export function resolveApproval(
  req: ApprovalRequest,
  ctx: ApprovalContext,
): ApprovalResolution {
  const config = APPROVAL_GATE_CONFIG[req.gate];

  // Spend gate: hard cap > pending; never auto-approves.
  if (req.gate === "spend") {
    if (ctx.dailyUsdSpent + req.estimatedUsd > ctx.dailyUsdCap) {
      return {
        decision: "rejected",
        reason: `daily_usd_cap_exceeded: ${(ctx.dailyUsdSpent + req.estimatedUsd).toFixed(2)} > ${ctx.dailyUsdCap.toFixed(2)}`,
      };
    }
    return { decision: "pending", reason: "spend_gate_always_user_approved" };
  }

  // Voice-gate-required gates: hard floor before any path forward.
  if (config.voiceGateRequired) {
    if (req.voiceGateScore === null) {
      return { decision: "pending", reason: "voice_gate_score_missing" };
    }
    if (req.voiceGateScore < ctx.minVoiceGateScore) {
      return {
        decision: "rejected",
        reason: `voice_gate_below_floor: ${req.voiceGateScore} < ${ctx.minVoiceGateScore}`,
      };
    }
  }

  // Auto-approve once the channel has earned trust.
  if (ctx.pastApprovedCount >= config.autoApproveAfter) {
    return {
      decision: "approved",
      reason: `auto_approved_after_${config.autoApproveAfter}`,
    };
  }

  return { decision: "pending", reason: "first_n_publishes_user_approved" };
}
