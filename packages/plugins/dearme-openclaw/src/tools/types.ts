/**
 * Outbound tool TypeScript interfaces — the wire shape OpenClaw plugin tools
 * use to call into DearMe cloud + the user's own per-channel OAuth.
 *
 * These are NOT implementations. They are the contract every cloud route
 * (`server/`) and every plugin tool wrapper (`packages/plugins/dearme-openclaw/`)
 * must conform to. Implementations land per ticket (DM-172/DM-174/DM-176/etc).
 *
 * Doctrine:
 *   1. Voice gate first.   For `publish` and `send` tools, the cloud first
 *      scores the staged content via `dearme-ai-proxy` voice-gate. The score
 *      is attached to the input by the cloud-side wrapper before approval
 *      resolution; tools never compute it locally.
 *   2. Approval resolution.  The cloud's approval resolver
 *      (`approval-gates.ts::resolveApproval`) decides pending / approved /
 *      rejected. A `pending` decision pauses the tool until the user
 *      responds via OpenClaw chat (or the workbench).
 *   3. Per-user OAuth.  The cloud looks up `channel_connections` by
 *      (companyId, userId, channel). If status != "active", the tool
 *      returns a `needs_oauth` result with the OAuth start URL.
 *   4. Audit.  On success, the cloud writes `cost_events` +
 *      `issue_work_products` and emits the `channel_action_fired` SSE.
 */

import type { ApprovalDecision } from "@paperclipai/dearme-agent-prompts";

/**
 * Common envelope all outbound tools share. Tools return one of three
 * outcomes: `delivered`, `pending` (awaiting user), `needs_oauth`,
 * `rejected`, or `errored`.
 */
export interface OutboundToolEnvelope {
  /** Naive issue id this tool call is part of. */
  issueId: string;
  /** OpenClaw runId so the cloud can correlate stream events. */
  openclawRunId: string;
  /** Idempotency key — replayed identical calls are deduped at the cloud. */
  idempotencyKey: string;
}

export type OutboundToolResult<TDelivered> =
  | { kind: "delivered"; data: TDelivered; voiceGateScore: number | null }
  | { kind: "pending"; approvalId: string; reason: string }
  | {
      kind: "needs_oauth";
      channel: string;
      oauthStartUrl: string;
      reason: string;
    }
  | { kind: "rejected"; reason: string; gate: string }
  | { kind: "errored"; error: string };

/** Re-export so plugin code only imports from one place. */
export type { ApprovalDecision };

/* ───────── post_x — write a tweet to the user's X account ───────── */

export interface PostXInput extends OutboundToolEnvelope {
  /** ≤ 280 chars after URL shortening. Voice-gated. */
  text: string;
  /**
   * Optional reply context. Polsia rule (Content Producer): mandatory
   * attribution link for any external claim — reply parents are exempted.
   */
  replyToTweetId?: string;
  /** Optional pre-uploaded media attachment ids. */
  mediaIds?: readonly string[];
  /** Soft-cap reminder (Content Producer prompt: 2/day). */
  postingCadenceCheck?: { tweetsTodayBeforeThis: number };
}

export interface PostXDelivered {
  tweetId: string;
  url: string;
  postedAt: string;
}

export type PostXResult = OutboundToolResult<PostXDelivered>;

/* ───────── send_linkedin_dm — 1:1 DM via the user's own LI ───────── */

export interface SendLinkedInDmInput extends OutboundToolEnvelope {
  recipientUrn: string;
  /** Voice-gated. */
  body: string;
  /** Required if `recipientUrn` is a 1st-degree connection only. */
  subject?: string;
}

export interface SendLinkedInDmDelivered {
  conversationUrn: string;
  messageUrn: string;
  sentAt: string;
}

export type SendLinkedInDmResult = OutboundToolResult<SendLinkedInDmDelivered>;

/* ───────── send_email — Resend (default) or SES (alt) ───────── */

export interface SendEmailInput extends OutboundToolEnvelope {
  /** Hunter.io-verified. Verification must happen before this call. */
  toEmail: string;
  fromHandle: string;
  /** Voice-gated. Plain-text default; HTML only if explicitly requested. */
  subject: string;
  body: string;
  bodyHtml?: string;
  /**
   * Which provider to use. Default: "resend". Cloud picks based on
   * `channel_connections` for the company.
   */
  provider?: "resend" | "ses";
  /** Email thread id for follow-ups in the 5-touch outbound sequence. */
  threadId?: string;
}

export interface SendEmailDelivered {
  providerMessageId: string;
  sentAt: string;
  threadId: string;
}

export type SendEmailResult = OutboundToolResult<SendEmailDelivered>;

/* ───────── deploy_site — push dearme.app/<handle> ───────── */

export interface DeploySiteInput extends OutboundToolEnvelope {
  handle: string;
  /** Build artifact ref (commit sha, content hash, or signed URL). */
  artifactRef: string;
  /** Optional custom domain change (triggers a deploy gate). */
  customDomain?: string | null;
  /**
   * Whether this is a production push or a preview. Previews bypass the
   * deploy gate and are auto-approved.
   */
  target: "preview" | "production";
}

export interface DeploySiteDelivered {
  deploymentId: string;
  url: string;
  deployedAt: string;
}

export type DeploySiteResult = OutboundToolResult<DeploySiteDelivered>;

/* ───────── create_meta_campaign — paid Meta ads ───────── */

export interface CreateMetaCampaignInput extends OutboundToolEnvelope {
  /** Meta Ads campaign config (subset; full schema in dearme-agent-prompts/state-machines/meta-ads.ts). */
  campaign: {
    name: string;
    objective: string;
    dailyBudgetUsd: number;
    creativeRefs: readonly string[];
    audienceRef: string;
  };
  /** Required: this hits the spend gate even if the user pre-approved. */
  budgetTier: "test" | "ramp" | "scale";
  /** Hours of expected runtime before learning-phase finishes. */
  learningWindowHours: number;
}

export interface CreateMetaCampaignDelivered {
  metaCampaignId: string;
  metaAdSetIds: readonly string[];
  status: "active" | "paused" | "in_review";
  createdAt: string;
}

export type CreateMetaCampaignResult =
  OutboundToolResult<CreateMetaCampaignDelivered>;

/**
 * Tool registry — the canonical name → input/output binding. Used by the
 * OpenClaw plugin's tool registration code and by the cloud-side wrapper
 * that resolves approvals and OAuth.
 */
export const DEARME_OUTBOUND_TOOLS = [
  "post_x",
  "send_linkedin_dm",
  "send_email",
  "deploy_site",
  "create_meta_campaign",
] as const;
export type DearMeOutboundToolName = (typeof DEARME_OUTBOUND_TOOLS)[number];

/**
 * Maps each tool to its default (gate, channel) — used by the work-loop
 * adapter to know which approval gate fires and which channel_connections
 * row to look up. `send_email` defaults to Resend, and the cloud wrapper
 * resolves payload `provider: "ses"` to the SES channel before lookup.
 */
export const DEARME_OUTBOUND_TOOL_BINDINGS: Readonly<
  Record<
    DearMeOutboundToolName,
    {
      gate: "publish" | "send" | "deploy" | "spend";
      channel: string;
      voiceGateRequired: boolean;
    }
  >
> = {
  post_x: { gate: "publish", channel: "x", voiceGateRequired: true },
  send_linkedin_dm: {
    gate: "send",
    channel: "linkedin",
    voiceGateRequired: true,
  },
  send_email: { gate: "send", channel: "resend", voiceGateRequired: true },
  deploy_site: { gate: "deploy", channel: "dearme-cloud", voiceGateRequired: false },
  create_meta_campaign: {
    gate: "spend",
    channel: "meta_ads",
    voiceGateRequired: false,
  },
};
