import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEARME_BRAND_CADENCES,
  DEARME_BRAND_CHANNELS,
  DEARME_MEMORY_SOURCE_INPUT_MODES,
  DEARME_MEMORY_UPDATE_KINDS,
  DEARME_PAID_BETA_MIN_PAYMENT_CENTS,
  type DearMeActionGraph,
  type DearMeActionGraphNode,
  type DearMeBrandBlueprintExecutionPlan,
  type DearMeChiefOfStaffMessageIntent,
  type DearMeChiefOfStaffMessageResult,
  type DearMeFirstCyclePreviewResponse,
  type DearMeMemoryArchiveResult,
  type DearMeMemorySourceInputMode,
  type DearMeMemoryUpdate,
  type DearMeMemoryUpdateItem,
  type DearMeMemoryUpdateKind,
  type DearMeMemoryUpdateResult,
  type DearMeOutputContinuationIntent,
  type DearMeOutputItem,
  type DearMeOutputReviewAction,
  type DearMeOutputReviewLoop,
  type DearMeOutputStatus,
  type DearMePaidBetaStatus,
  type DearMeVoiceGateResult,
  type DearMeWorkbenchBatchDecision,
  type DearMeWorkbenchDecision,
  type DearMeWorkbenchMemory,
  type DearMeWorkbenchReport,
  type DearMeWorkbenchResponse,
  type DearMeWorkbenchStreamItem,
  type DearMeWorkbenchTeamMember,
  type DearMeWorkbenchWorkItem,
} from "@paperclipai/shared";
import { useLocation, useNavigate } from "@/lib/router";
import { approvalsApi } from "../api/approvals";
import { dearmeApi, type DearMeBrandBlueprintPreviewResult } from "../api/dearme";
import {
  DearMeChecklist,
  DearMeCockpitGrid,
  DearMeEvidenceGrid,
  DearMeEmptyState,
  DearMeFocusSurface,
  DearMeHero,
  DearMeMetricStrip,
  DearMePageShell,
  DearMePanel,
  DearMeWorkbenchCard,
  DearMeWorkbenchSectionHeader,
} from "../components/DearMeShell";
import {
  DearMeActionCard,
  type DearMeActionCardAttention,
} from "../components/dearme/DearMeActionCard";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  DEFAULT_DEARME_BRAND_BLUEPRINT_FORM,
  buildDearMeBrandBlueprintApplyRequest,
  buildDearMeBrandBlueprintSeed,
  createDearMeBrandBlueprintSignature,
  type DearMeBrandCadence,
  type DearMeBrandChannel,
  type DearMeBrandBlueprintFormState,
} from "../lib/dearme-brand-blueprint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gauge,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const CHANNEL_LABELS: Record<DearMeBrandChannel, string> = {
  linkedin: "LinkedIn",
  x: "X",
  newsletter: "Newsletter",
  blog: "Blog",
  portfolio: "Portfolio",
  email: "Email",
  community: "Community",
  website: "Website",
};

const CADENCE_LABELS: Record<DearMeBrandCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
};

const FIELD_HELP = {
  goals: "One goal per line",
  audiences: "One audience per line",
  proofPoints: "Work, wins, receipts, or examples",
  offers: "Products, services, asks, or collaboration offers",
  voiceSamples: "Paste two short samples when available",
  constraints: "Boundaries DearMe must preserve",
};

const REPORT_DIGEST_SECTIONS: Array<{
  key: "accomplished" | "decisions" | "learnings" | "nextBets";
  label: string;
  helper: string;
}> = [
  {
    key: "accomplished",
    label: "What changed",
    helper: "Visible work your team moved forward.",
  },
  {
    key: "decisions",
    label: "Needs your call",
    helper: "High-leverage moves waiting on you.",
  },
  {
    key: "learnings",
    label: "What we learned",
    helper: "Voice, proof, and preference memory.",
  },
  {
    key: "nextBets",
    label: "Next bets",
    helper: "Where the next cycle should push.",
  },
];

const CHIEF_OF_STAFF_INTENT_OPTIONS: Array<{
  value: DearMeChiefOfStaffMessageIntent;
  label: string;
  helper: string;
}> = [
  {
    value: "plan_next",
    label: "Plan next moves",
    helper: "Prioritize the next brand cycle.",
  },
  {
    value: "draft_content",
    label: "Draft content",
    helper: "Turn proof and point of view into private drafts.",
  },
  {
    value: "find_opportunities",
    label: "Find opportunities",
    helper: "Prepare outreach angles and relevant leads.",
  },
  {
    value: "refresh_portfolio",
    label: "Refresh portfolio",
    helper: "Package proof into site-ready updates.",
  },
  {
    value: "prepare_report",
    label: "Prepare report",
    helper: "Summarize progress, decisions, and next bets.",
  },
];

const CHIEF_OF_STAFF_CYCLE_CONTROLS: Array<{
  id: string;
  intent: DearMeChiefOfStaffMessageIntent;
  label: string;
  helper: string;
  message: string;
  icon: LucideIcon;
}> = [
  {
    id: "focus_week",
    intent: "plan_next",
    label: "Focus the week",
    helper: "Pick the highest-leverage moves.",
    message:
      "Focus this week on the highest-leverage personal-brand move. Choose three private work items, explain why they matter, and hold external actions for approval.",
    icon: Gauge,
  },
  {
    id: "prepare_content_batch",
    intent: "draft_content",
    label: "Prepare content batch",
    helper: "Turn proof into reviewable drafts.",
    message:
      "Turn my latest proof and point of view into a small content batch for review. Keep it in my voice and flag anything that needs approval before publishing.",
    icon: FileText,
  },
  {
    id: "scout_opportunities",
    intent: "find_opportunities",
    label: "Scout opportunities",
    helper: "Find leads and draft outreach.",
    message:
      "Find practical opportunities I can act on this week: customers, collaborators, podcasts, jobs, or warm introductions. Prepare outreach drafts but do not send them.",
    icon: Sparkles,
  },
  {
    id: "refresh_public_proof",
    intent: "refresh_portfolio",
    label: "Refresh public proof",
    helper: "Package recent work privately.",
    message:
      "Turn recent work into a portfolio or bio update and a proof card. Keep it private until I approve the public wording.",
    icon: ShieldCheck,
  },
  {
    id: "write_weekly_letter",
    intent: "prepare_report",
    label: "Write weekly letter",
    helper: "Summarize work and decisions.",
    message:
      "Write this week's Dear me report: what changed, what is ready, which decisions matter, and what the team should do next.",
    icon: MessageSquare,
  },
];

const DEFAULT_CHIEF_OF_STAFF_INTENT: DearMeChiefOfStaffMessageIntent = "plan_next";

type DearMeReviewEntryIntent = "review" | "continue" | "retry" | "direction" | "blocked" | "progress";

const DEARME_REVIEW_ENTRY_INTENTS = new Set<DearMeReviewEntryIntent>([
  "review",
  "continue",
  "retry",
  "direction",
  "blocked",
  "progress",
]);

function buildDearMeDecisionRoute(params: {
  approvalId?: string;
  issueReference?: string;
  outputId?: string;
  intent?: DearMeReviewEntryIntent | null;
}): string {
  const search = new URLSearchParams({ view: "decisions" });
  if (params.approvalId) search.set("approval", params.approvalId);
  if (params.issueReference) search.set("issue", params.issueReference);
  if (params.outputId) search.set("output", params.outputId);
  if (params.intent && params.intent !== "review") search.set("intent", params.intent);
  return `/dearme?${search.toString()}`;
}

interface DearMeDecisionFocus {
  approvalId: string | null;
  issueReference: string | null;
  outputId: string | null;
  intent: DearMeReviewEntryIntent | null;
}

type DearMeApprovalReviewAction = "approve" | "reject" | "request_revision";

interface DearMeApprovalReviewState {
  approvalId: string | null;
  action: DearMeApprovalReviewAction | null;
  isPending: boolean;
}

interface DearMeOutputReviewState {
  outputId: string | null;
  action: DearMeOutputReviewAction | null;
  isPending: boolean;
}

function parseDearMeDecisionFocus(search: string): DearMeDecisionFocus | null {
  const params = new URLSearchParams(search);
  if (params.get("view") !== "decisions") return null;

  const focus = {
    approvalId: params.get("approval"),
    issueReference: params.get("issue"),
    outputId: params.get("output"),
    intent: parseDearMeReviewEntryIntent(params.get("intent")),
  };
  if (!focus.approvalId && !focus.issueReference && !focus.outputId) return null;
  return focus;
}

function parseDearMeReviewEntryIntent(value: string | null): DearMeReviewEntryIntent | null {
  if (!value || !DEARME_REVIEW_ENTRY_INTENTS.has(value as DearMeReviewEntryIntent)) return null;
  return value as DearMeReviewEntryIntent;
}

function defaultDearMeDecisionNote(action: DearMeApprovalReviewAction) {
  if (action === "approve") return "Approved from DearMe. This represents me.";
  if (action === "reject") return "Rejected from DearMe. Do not move this forward.";
  return "Please revise this from DearMe before moving forward.";
}

function defaultDearMeOutputReviewNote(action: DearMeOutputReviewAction) {
  if (action === "approve") return "Approved from DearMe. This prepared work represents me.";
  if (action === "request_changes") return "Please revise this from DearMe before review.";
  if (action === "regenerate") return "Please prepare another private pass of this DearMe work for review.";
  return "Please use a clearer direction before preparing the next private version.";
}

function outputContinuationIntentForAction(
  action: DearMeOutputReviewAction,
): DearMeOutputContinuationIntent | null {
  if (action === "request_changes") return "continue_revision";
  if (action === "regenerate") return "prepare_another_pass";
  if (action === "not_useful") return "choose_new_direction";
  return null;
}

function FieldLabel({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function TextAreaField({
  id,
  label,
  hint,
  value,
  rows = 3,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <Textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ChannelPicker({
  selected,
  onChange,
}: {
  selected: DearMeBrandChannel[];
  onChange: (selected: DearMeBrandChannel[]) => void;
}) {
  function toggle(channel: DearMeBrandChannel) {
    if (selected.includes(channel)) {
      onChange(selected.filter((item) => item !== channel));
      return;
    }
    onChange([...selected, channel]);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Channels</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {DEARME_BRAND_CHANNELS.map((channel) => {
          const checked = selected.includes(channel);
          return (
            <label
              key={channel}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                checked ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={checked}
                onChange={() => toggle(channel)}
              />
              <span className="truncate">{CHANNEL_LABELS[channel]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CadenceControl({
  value,
  onChange,
}: {
  value: DearMeBrandCadence;
  onChange: (value: DearMeBrandCadence) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Cadence</p>
      <div className="grid grid-cols-3 rounded-md border border-border p-1">
        {DEARME_BRAND_CADENCES.map((cadence) => (
          <button
            key={cadence}
            type="button"
            aria-pressed={value === cadence}
            className={cn(
              "min-h-8 rounded-sm px-2 text-sm transition-colors",
              value === cadence ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(cadence)}
          >
            {CADENCE_LABELS[cadence]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function paymentDate(value: string | null) {
  if (!value) return "No payment yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const OUTPUT_STATUS_LABELS: Record<DearMeOutputStatus, string> = {
  queued: "Queued",
  working: "Working",
  ready_for_review: "Ready for review",
  complete: "Complete",
  blocked: "Needs attention",
  cancelled: "Cancelled",
};

function outputStatusVariant(status: DearMeOutputStatus) {
  if (status === "ready_for_review" || status === "complete") return "default" as const;
  if (status === "blocked" || status === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

const REVIEW_LOOP_STATE_LABELS: Record<DearMeOutputReviewLoop["state"], string> = {
  fresh: "Preparing privately",
  needs_user_review: "Needs your review",
  revision_requested: "Changes requested",
  regeneration_requested: "Next pass in motion",
  not_useful: "New direction needed",
  approved: "Approved",
  retry_limit_reached: "Needs clearer direction",
};

function reviewLoopLabel(loop: DearMeOutputReviewLoop) {
  return `Review pass ${loop.attemptCount}/${loop.maxAttempts}`;
}

function reviewLoopStateLabel(loop: DearMeOutputReviewLoop) {
  return REVIEW_LOOP_STATE_LABELS[loop.state];
}

function reviewLoopVariant(loop: DearMeOutputReviewLoop) {
  if (loop.state === "approved") return "default" as const;
  if (loop.state === "retry_limit_reached" || loop.state === "not_useful") return "destructive" as const;
  if (loop.state === "fresh" || loop.state === "needs_user_review") return "outline" as const;
  return "secondary" as const;
}

function reviewLoopAttention(loop: DearMeOutputReviewLoop | null | undefined): DearMeActionCardAttention | null {
  if (!loop) return null;

  switch (loop.state) {
    case "needs_user_review":
      return {
        kind: "decision_needed",
        label: "Waiting on your decision",
        detail: loop.nextStep,
      };
    case "revision_requested":
      return {
        kind: "retry",
        label: "Changes requested",
        detail: loop.nextStep,
      };
    case "regeneration_requested":
      return {
        kind: "retry",
        label: "Another pass is in motion",
        detail: loop.nextStep,
      };
    case "not_useful":
      return {
        kind: "paused",
        label: "New direction needed",
        detail: loop.nextStep,
      };
    case "retry_limit_reached":
      return {
        kind: "blocked",
        label: "Needs clearer direction",
        detail: loop.nextStep,
      };
    case "approved":
    case "fresh":
      return null;
  }
}

function reviewLoopEntryIntent(loop: DearMeOutputReviewLoop | null | undefined): DearMeReviewEntryIntent | null {
  if (!loop) return null;

  switch (loop.state) {
    case "needs_user_review":
      return "review";
    case "revision_requested":
      return "continue";
    case "regeneration_requested":
      return "retry";
    case "not_useful":
      return "direction";
    case "retry_limit_reached":
      return "blocked";
    case "fresh":
      return "progress";
    case "approved":
      return null;
  }
}

function reviewLoopRouteIntent(loop: DearMeOutputReviewLoop | null | undefined): DearMeReviewEntryIntent | null {
  const intent = reviewLoopEntryIntent(loop);
  return intent && intent !== "review" ? intent : null;
}

function reviewLoopActionLabel(loop: DearMeOutputReviewLoop | null | undefined): string | null {
  const intent = reviewLoopEntryIntent(loop);
  if (!intent) return null;

  switch (intent) {
    case "review":
      return "Review prepared work";
    case "continue":
      return "Continue revision";
    case "retry":
      return "Track next pass";
    case "direction":
      return "Give new direction";
    case "blocked":
      return "Add clearer direction";
    case "progress":
      return "See progress";
  }
}

function reviewEntryGuidance(
  intent: DearMeReviewEntryIntent | null | undefined,
  loop: DearMeOutputReviewLoop,
) {
  const resolvedIntent = intent ?? reviewLoopEntryIntent(loop);
  if (!resolvedIntent) return null;

  switch (resolvedIntent) {
    case "review":
      return {
        label: "Decision ready",
        title: "Review prepared work",
        body: "Choose whether this represents you, needs changes, needs another pass, or should stop.",
      };
    case "continue":
      return {
        label: "Continue revision",
        title: "Your team is already revising",
        body: "Your team already has your change request. Add one sharper note if needed, then let DearMe prepare the next private version.",
      };
    case "retry":
      return {
        label: "Next pass in motion",
        title: "DearMe is taking another pass",
        body: "Your team is taking another pass. Use the note box only if the next version needs stronger direction.",
      };
    case "direction":
      return {
        label: "New direction needed",
        title: "Give clearer direction",
        body: "Give one clear instruction so DearMe does not keep trying the wrong angle.",
      };
    case "blocked":
      return {
        label: "Clearer direction needed",
        title: "Pause and redirect the team",
        body: "Add one specific instruction before spending another attempt on this prepared work.",
      };
    case "progress":
      return {
        label: "Private work in motion",
        title: "Track the next prepared version",
        body: "DearMe is still preparing this privately. Come back here when the team brings it to review.",
      };
  }
}

function outputActionAttention(
  status: DearMeOutputStatus,
  loop: DearMeOutputReviewLoop | null | undefined,
): DearMeActionCardAttention | null {
  const loopAttention = reviewLoopAttention(loop);
  if (loopAttention) return loopAttention;

  if (status === "ready_for_review") {
    return {
      kind: "decision_needed",
      label: "Ready for your review",
      detail: loop?.nextStep ?? "Open it, then approve, request changes, ask for another pass, or choose a new direction.",
    };
  }
  if (status === "blocked") {
    return {
      kind: "blocked",
      label: "Needs attention",
      detail: loop?.nextStep ?? "Give the team a clearer direction before this can continue.",
    };
  }
  if (status === "cancelled") {
    return {
      kind: "blocked",
      label: "Stopped",
      detail: "This prepared work is no longer moving forward.",
    };
  }

  return null;
}

function decisionActionAttention(decision: DearMeWorkbenchDecision): DearMeActionCardAttention {
  return reviewLoopAttention(decision.reviewLoop) ?? {
    kind: "decision_needed",
    label: "Waiting on your decision",
    detail: decision.reviewLoop?.nextStep ?? decisionAfterCallLabel(decision.riskGate),
  };
}

function streamActionAttention(item: DearMeWorkbenchStreamItem): DearMeActionCardAttention | null {
  const loopAttention = reviewLoopAttention(item.reviewLoop);
  if (loopAttention) return loopAttention;

  if (item.needsApproval) {
    return {
      kind: "decision_needed",
      label: "Waiting on your decision",
      detail: item.nextAction,
    };
  }

  const status = item.status.toLowerCase();
  if (status.includes("blocked") || status.includes("cancelled") || status.includes("failed")) {
    return {
      kind: "blocked",
      label: "Needs attention",
      detail: item.nextAction,
    };
  }
  if (status.includes("paused") || status.includes("waiting")) {
    return {
      kind: "paused",
      label: "Paused",
      detail: item.nextAction,
    };
  }

  return null;
}

function ReviewLoopBadges({ loop }: { loop: DearMeOutputReviewLoop }) {
  return (
    <>
      <Badge variant="outline">{reviewLoopLabel(loop)}</Badge>
      <Badge variant={reviewLoopVariant(loop)}>{reviewLoopStateLabel(loop)}</Badge>
    </>
  );
}

function ReviewLoopNextStep({
  loop,
  className,
}: {
  loop: DearMeOutputReviewLoop;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-background/80 p-3", className)}>
      <p className="text-xs font-medium text-muted-foreground">Team follow-through</p>
      <p className="mt-1 text-sm text-foreground/85">{loop.nextStep}</p>
      {loop.lastDecisionNotePreview ? (
        <p className="mt-2 text-xs text-muted-foreground">Last call: {loop.lastDecisionNotePreview}</p>
      ) : null}
    </div>
  );
}

function ReviewHandoffCard({
  loop,
  className,
}: {
  loop: DearMeOutputReviewLoop;
  className?: string;
}) {
  const handoff = loop.reviewHandoff;
  if (!handoff) return null;
  return (
    <div className={cn("rounded-md border border-border bg-background/80 p-3", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">Private handoff</p>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{handoff.title}</p>
      <p className="mt-1 text-sm text-foreground/85">{handoff.summary}</p>
      {handoff.userDirection ? (
        <p className="mt-2 text-xs text-muted-foreground">Your note: {handoff.userDirection}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{handoff.nextDraftDirection}</p>
    </div>
  );
}

const VOICE_GATE_STATUS_LABELS: Record<DearMeVoiceGateResult["status"], string> = {
  ready_for_review: "Ready for review",
  needs_voice_review: "Needs voice review",
  blocked_before_public: "Blocked before public",
};

function voiceGateVariant(status: DearMeVoiceGateResult["status"]) {
  if (status === "ready_for_review") return "default" as const;
  if (status === "blocked_before_public") return "destructive" as const;
  return "secondary" as const;
}

function voiceGateCheckVariant(status: DearMeVoiceGateResult["checks"][number]["status"]) {
  if (status === "pass") return "default" as const;
  if (status === "block") return "destructive" as const;
  return "secondary" as const;
}

const OUTPUT_KIND_LABELS: Record<DearMeOutputItem["kind"], string> = {
  brand_os: "Brand OS",
  voice_profile: "Voice Profile",
  content_drafts: "Content drafts",
  opportunity_drafts: "Opportunity leads",
  portfolio_update: "Portfolio update",
  weekly_report: "Dear me report",
};

const OUTPUT_KIND_VALUE_LABELS: Record<DearMeOutputItem["kind"], string> = {
  brand_os: "Keeps the team aligned on positioning, voice, proof, channels, and approval boundaries.",
  voice_profile: "Protects the user's tone before private drafts become public-facing work.",
  content_drafts: "Turns proof and point of view into material the user can approve, revise, or send back for another pass.",
  opportunity_drafts: "Turns relationships and market openings into prepared next moves.",
  portfolio_update: "Converts shipped work into proof that can strengthen the user's public surface.",
  weekly_report: "Shows what changed, what needs a decision, and what the team should try next.",
};

const WORKSTREAM_STATUS_LABELS = {
  working: "Working",
  ready_for_review: "Ready for review",
  complete: "Complete",
  blocked: "Needs attention",
  cancelled: "Cancelled",
  decision_needed: "Needs your call",
  recorded: "Recorded",
} as const;

const WORKSTREAM_KIND_LABELS: Record<DearMeWorkbenchStreamItem["kind"], string> = {
  cycle_brief: "Cycle brief",
  work_in_motion: "Work in motion",
  decision_needed: "Action needed",
  memory_recorded: "Memory learned",
  progress_recorded: "Progress",
  report_ready: "Report ready",
};

const WORKSTREAM_STAGE_LABELS: Record<DearMeWorkbenchStreamItem["cycleStage"], string> = {
  plan: "Plan",
  work: "Work",
  review: "Review",
  learn: "Learn",
  report: "Report",
};

const ACTION_GRAPH_KIND_LABELS: Record<DearMeActionGraphNode["kind"], string> = {
  cycle: "Growth cycle",
  role: "Team role",
  work_item: "Work in motion",
  artifact: "Prepared work",
  decision: "Decision needed",
  memory_signal: "Memory update",
  report: "Dear me report",
  guardrail: "Approval guardrail",
};

const ACTION_GRAPH_KIND_ICONS: Record<DearMeActionGraphNode["kind"], LucideIcon> = {
  cycle: Workflow,
  role: Users,
  work_item: Gauge,
  artifact: FileText,
  decision: ShieldCheck,
  memory_signal: Sparkles,
  report: FileText,
  guardrail: ShieldCheck,
};

const ACTION_GRAPH_KIND_ORDER: Record<DearMeActionGraphNode["kind"], number> = {
  cycle: 0,
  decision: 1,
  work_item: 2,
  artifact: 3,
  guardrail: 4,
  memory_signal: 5,
  report: 6,
  role: 7,
};

function titleizeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function selectActionGraphCards(graph: DearMeActionGraph) {
  const cycleNode = graph.nodes.find((node) => node.id === graph.cycleNodeId)
    ?? graph.nodes.find((node) => node.kind === "cycle")
    ?? null;
  const selected = new Set<string>();
  const cards: DearMeActionGraphNode[] = [];

  if (cycleNode) {
    cards.push(cycleNode);
    selected.add(cycleNode.id);
  }

  const remaining = graph.nodes
    .filter((node) => !selected.has(node.id))
    .sort((a, b) => {
      const kindOrder = ACTION_GRAPH_KIND_ORDER[a.kind] - ACTION_GRAPH_KIND_ORDER[b.kind];
      if (kindOrder !== 0) return kindOrder;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return [...cards, ...remaining].slice(0, 8);
}

function actionGraphStatusLabel(node: DearMeActionGraphNode) {
  if (node.kind === "decision") return "Waiting on you";
  if (node.kind === "guardrail") return "Approval protected";
  if (node.kind === "memory_signal") return "Learning";
  if (node.kind === "report") return "Report ready";
  if (node.status) return titleizeStatus(node.status);
  return ACTION_GRAPH_KIND_LABELS[node.kind];
}

function actionGraphStatusVariant(node: DearMeActionGraphNode) {
  const status = node.status?.toLowerCase() ?? "";
  if (status.includes("blocked") || status.includes("cancelled")) return "destructive" as const;
  if (node.kind === "decision" || status.includes("decision")) return "secondary" as const;
  if (node.kind === "artifact" || node.kind === "report" || status.includes("ready") || status.includes("complete")) {
    return "default" as const;
  }
  return "outline" as const;
}

function actionGraphNextMove(node: DearMeActionGraphNode) {
  switch (node.kind) {
    case "cycle":
      return "Your team keeps this cycle moving through plan, work, review, learning, and reporting.";
    case "role":
      return "This teammate owns a visible part of your personal-brand growth cycle.";
    case "work_item":
      return "The team keeps preparing this privately until it becomes reviewable.";
    case "artifact":
      return "Open the prepared work, then approve, request changes, ask for another pass, or choose a new direction.";
    case "decision":
      return "This waits for your call before it can represent you publicly or externally.";
    case "memory_signal":
      return "DearMe uses this signal to make future work more accurate to your voice and proof.";
    case "report":
      return "Use this as the closing letter for what changed, what needs a call, and what comes next.";
    case "guardrail":
      return "This keeps publishing, sending, deploying, spending, and sensitive moves behind approval.";
  }
}

function actionGraphConnectionLabels(graph: DearMeActionGraph, nodeId: string) {
  const labels = graph.edges
    .filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId)
    .map((edge) => edge.label)
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 2);
}

const RISK_GATE_LABELS: Record<NonNullable<DearMeWorkbenchDecision["riskGate"]>, string> = {
  publish_social: "Publish",
  send_email: "Send outreach",
  deploy_public_site: "Publish site",
  spend_money: "Spend",
  public_claim: "Public claim",
  sensitive_material: "Sensitive material",
  connect_channel: "Connect channel",
  destructive_change: "Replace work",
};

const MEMORY_KIND_LABELS: Record<DearMeMemoryUpdateKind, string> = {
  voice_sample: "Voice sample",
  proof_point: "Proof point",
  goal: "Goal",
  audience: "Audience",
  offer: "Offer",
  constraint: "Boundary",
  relationship: "Relationship",
  preference: "Preference",
};

const MEMORY_SOURCE_INPUT_MODE_LABELS: Record<DearMeMemorySourceInputMode, string> = {
  paste: "Pasted source",
  link: "Source link",
  import_note: "Import note",
};

const MEMORY_SOURCE_INPUT_MODE_HELPERS: Record<DearMeMemorySourceInputMode, string> = {
  paste: "Paste the source text directly.",
  link: "Save a private reference link and the useful memory from it.",
  import_note: "Describe a file, transcript, profile, or backlog item DearMe should fold in next.",
};

type MemorySourceGuideId =
  | "writing_sample"
  | "proof_point"
  | "source_link"
  | "correction"
  | "forbidden_phrase"
  | "audience_note"
  | "offer_note";

const MEMORY_SOURCE_GUIDES: Array<{
  id: MemorySourceGuideId;
  kind: DearMeMemoryUpdateKind;
  label: string;
  helper: string;
  titlePlaceholder: string;
  sourcePlaceholder: string;
  bodyPlaceholder: string;
  icon: LucideIcon;
}> = [
  {
    id: "writing_sample",
    kind: "voice_sample",
    label: "Writing sample",
    helper: "A paragraph that already sounds like you.",
    titlePlaceholder: "Founder note",
    sourcePlaceholder: "Newsletter, post, transcript, or manual note",
    bodyPlaceholder: "Paste the exact words DearMe should learn from.",
    icon: Sparkles,
  },
  {
    id: "proof_point",
    kind: "proof_point",
    label: "Proof point",
    helper: "Specific shipped work, result, metric, or receipt.",
    titlePlaceholder: "Shipped proof",
    sourcePlaceholder: "Project, customer, repo, deck, or receipt",
    bodyPlaceholder: "Record the concrete proof that future drafts can cite.",
    icon: CheckCircle2,
  },
  {
    id: "source_link",
    kind: "proof_point",
    label: "Source link",
    helper: "A private URL or reference note for provenance.",
    titlePlaceholder: "Reference link",
    sourcePlaceholder: "https://example.com/source",
    bodyPlaceholder: "Summarize what DearMe should remember from this source.",
    icon: FileText,
  },
  {
    id: "correction",
    kind: "constraint",
    label: "Correction",
    helper: "A fix for wording, claim, or positioning.",
    titlePlaceholder: "Voice correction",
    sourcePlaceholder: "Review note, customer comment, or manual note",
    bodyPlaceholder: "Write the correction DearMe should apply next time.",
    icon: RefreshCw,
  },
  {
    id: "forbidden_phrase",
    kind: "constraint",
    label: "Forbidden phrase",
    helper: "Words, claims, or angles that must not appear.",
    titlePlaceholder: "Forbidden phrase",
    sourcePlaceholder: "Style guide, review note, or manual note",
    bodyPlaceholder: "List the exact words, claims, or angles to avoid.",
    icon: ShieldCheck,
  },
  {
    id: "audience_note",
    kind: "audience",
    label: "Audience note",
    helper: "Who this should speak to and what they care about.",
    titlePlaceholder: "Audience note",
    sourcePlaceholder: "Customer call, segment, or manual note",
    bodyPlaceholder: "Describe the audience signal future work should honor.",
    icon: Users,
  },
  {
    id: "offer_note",
    kind: "offer",
    label: "Offer note",
    helper: "What you can sell, invite, or ask for.",
    titlePlaceholder: "Offer note",
    sourcePlaceholder: "Offer doc, pricing note, or manual note",
    bodyPlaceholder: "Describe the offer, ask, or collaboration shape.",
    icon: Send,
  },
];
const DEFAULT_MEMORY_SOURCE_GUIDE = MEMORY_SOURCE_GUIDES[0]!;

function defaultSourceInputModeForGuide(
  guide: (typeof MEMORY_SOURCE_GUIDES)[number],
): DearMeMemorySourceInputMode {
  return guide.id === "source_link" ? "link" : "paste";
}

function sourceLabelForChip(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}...` : value;
}

const MEMORY_SOURCE_PLAN_STATUS_LABELS: Record<DearMeWorkbenchMemory["sourcePlan"]["status"], string> = {
  needs_sources: "Needs sources",
  building: "Building",
  ready_for_review: "Ready for review",
};

const MEMORY_SOURCE_REQUIREMENT_STATUS_LABELS: Record<
  DearMeWorkbenchMemory["sourcePlan"]["required"][number]["status"],
  string
> = {
  missing: "Missing",
  partial: "In progress",
  ready: "Ready",
};

const VOICE_PROFILE_STATUS_LABELS: Record<DearMeWorkbenchMemory["voiceProfile"]["status"], string> = {
  needs_samples: "Needs samples",
  learning: "Learning",
  ready_for_review: "Ready for voice review",
};

function voiceProfileVariant(status: DearMeWorkbenchMemory["voiceProfile"]["status"]) {
  if (status === "ready_for_review") return "default" as const;
  if (status === "learning") return "secondary" as const;
  return "outline" as const;
}

function memorySourcePlanVariant(status: DearMeWorkbenchMemory["sourcePlan"]["status"]) {
  if (status === "ready_for_review") return "default" as const;
  if (status === "building") return "secondary" as const;
  return "outline" as const;
}

function memorySourceRequirementVariant(
  status: DearMeWorkbenchMemory["sourcePlan"]["required"][number]["status"],
) {
  if (status === "ready") return "default" as const;
  if (status === "partial") return "secondary" as const;
  return "outline" as const;
}

function memorySourceGuideForKind(kind: DearMeMemoryUpdateKind) {
  return MEMORY_SOURCE_GUIDES.find((guide) => guide.kind === kind) ?? DEFAULT_MEMORY_SOURCE_GUIDE;
}

function pluralizeGrowthCycle(count: number) {
  return `${count} growth cycle${count === 1 ? "" : "s"}`;
}

function pluralizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function memoryUpdateFeedback(result: DearMeMemoryUpdateResult | null) {
  if (!result) return null;
  const cycles = result.growthCycles;
  if (cycles.checked === 0) {
    return "Saved. Future growth cycles will use this after Brand OS starts.";
  }
  if (cycles.updated > 0) {
    return `Saved. ${pluralizeGrowthCycle(cycles.updated)} refreshed with your latest Voice & Memory.`;
  }
  return `Saved. ${pluralizeGrowthCycle(cycles.checked)} already had the latest Voice & Memory.`;
}

const TEAM_WORKSTREAM = [
  {
    role: "Chief of Staff",
    action: "Preparing today's brand growth plan",
    artifact: "Daily direction",
  },
  {
    role: "Voice Editor",
    action: "Studying your samples and protecting your tone",
    artifact: "Voice profile",
  },
  {
    role: "Content Producer",
    action: "Turning proof into starter posts and essays",
    artifact: "Drafts",
  },
  {
    role: "Opportunity Scout",
    action: "Looking for clients, collaborators, podcasts, and warm openings",
    artifact: "Opportunity leads",
  },
  {
    role: "Portfolio Builder",
    action: "Packaging shipped work into profile and proof updates",
    artifact: "Proof cards",
  },
  {
    role: "Growth Analyst",
    action: "Preparing the next Dear me report",
    artifact: "Weekly report",
  },
];

const FIRST_CYCLE_ARTIFACTS = [
  "Draft Voice Profile",
  "3 starter posts",
  "1 opportunity lead",
  "1 portfolio proof card",
  "First growth plan",
];

function outputPreview(output: DearMeOutputItem) {
  return (
    output.documents[0]?.bodyPreview ||
    output.latestUpdate?.bodyPreview ||
    output.workProducts[0]?.summary ||
    ""
  );
}

function VoiceGatePanel({ gate }: { gate: DearMeVoiceGateResult }) {
  return (
    <section className="rounded-md border border-border p-4" aria-label="Voice Gate v0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Voice Gate v0
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{gate.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={voiceGateVariant(gate.status)}>{VOICE_GATE_STATUS_LABELS[gate.status]}</Badge>
          <Badge variant="outline">{gate.score}/100</Badge>
        </div>
      </div>
      <DearMeEvidenceGrid className="mt-4 xl:grid-cols-5" columns="two">
        {gate.checks.map((check) => (
          <DearMeWorkbenchCard
            key={check.kind}
            title={check.label}
            description={check.summary}
            badge={<Badge variant={voiceGateCheckVariant(check.status)}>{roleLabel(check.status)}</Badge>}
          />
        ))}
      </DearMeEvidenceGrid>
    </section>
  );
}

function TeamWorkstreamPanel({
  previewReady,
  paidBetaActive,
}: {
  previewReady: boolean;
  paidBetaActive: boolean;
}) {
  const statusLabel = paidBetaActive ? "Working now" : previewReady ? "Ready to activate" : "Waiting for your brief";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
      <DearMePanel aria-label="Personal brand growth team">
        <DearMeWorkbenchSectionHeader
          icon={Users}
          eyebrow="Your personal brand growth team"
          description="Team visible, machinery hidden. DearMe prepares the moves; you approve what represents you."
          trailing={<Badge variant={paidBetaActive ? "default" : "secondary"}>{statusLabel}</Badge>}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {TEAM_WORKSTREAM.map((item, index) => (
            <DearMeWorkbenchCard
              key={`team-workstream:${item.role}:${index}`}
              title={item.role}
              description={item.action}
              badge={<Badge variant="outline">{item.artifact}</Badge>}
            />
          ))}
        </div>
      </DearMePanel>

      <aside className="rounded-lg border border-border p-5">
        <DearMeWorkbenchSectionHeader
          icon={ShieldCheck}
          eyebrow="Work ready / Decisions needed"
          description="No publishing, sending, deploying, or spending happens without approval by default."
        />
        <DearMeChecklist
          className="mt-4"
          icon={CheckCircle2}
          items={FIRST_CYCLE_ARTIFACTS}
          aria-label="First-cycle approval artifacts"
        />
      </aside>
    </section>
  );
}

function FirstCyclePanel({
  intent,
  preview,
  isPending,
  onIntentChange,
  onPreview,
}: {
  intent: string;
  preview: DearMeFirstCyclePreviewResponse | null;
  isPending: boolean;
  onIntentChange: (value: string) => void;
  onPreview: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPreview();
  }

  return (
    <DearMePanel aria-label="90-second first cycle">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <Badge variant="outline">90-second first cycle</Badge>
          <h2 className="mt-3 text-xl font-semibold">What do you want to become known for?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Give the team one sentence. DearMe prepares a Voice Profile, starter posts, one opportunity, one proof card, and a first plan.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <Textarea
              id="dearme-first-cycle-intent"
              value={intent}
              rows={4}
              placeholder="Known for turning hard-earned work into clear public proof..."
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onIntentChange(event.target.value)}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Start first cycle
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Prepared privately
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your team prepares the moves. Nothing publishes, sends, spends, or changes public pages without approval.
          </p>
          <DearMeChecklist
            className="mt-4 sm:grid-cols-2"
            icon={CheckCircle2}
            items={FIRST_CYCLE_ARTIFACTS}
            aria-label="Prepared first-cycle artifacts"
          />
        </div>
      </div>

      {preview ? (
        <div className="mt-5 space-y-4">
          <DearMeWorkbenchCard
            title={preview.voiceProfile.title}
            description={preview.voiceProfile.guidance}
            badge={
              <Badge variant={preview.voiceProfile.status === "ready_for_gate" ? "default" : "secondary"}>
                {preview.voiceProfile.status === "ready_for_gate" ? "Voice ready" : "Needs samples"}
              </Badge>
            }
          >
            <div className="flex flex-wrap gap-2">
              {preview.voiceProfile.draftTone.map((tone) => (
                <Badge key={tone} variant="outline">{tone}</Badge>
              ))}
            </div>
          </DearMeWorkbenchCard>

          <VoiceGatePanel gate={preview.voiceGate} />

          <section className="grid gap-3 lg:grid-cols-3">
            {preview.starterPosts.map((post) => (
              <DearMeWorkbenchCard
                key={post.id}
                title={post.title}
                description={post.body}
                badge={<Badge variant="outline">{CHANNEL_LABELS[post.channel]}</Badge>}
              >
                <p className="text-sm font-medium text-foreground/80">{post.hook}</p>
              </DearMeWorkbenchCard>
            ))}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <DearMeWorkbenchCard
              eyebrow="Opportunity lead"
              title={preview.opportunityLead.title}
              description={preview.opportunityLead.draftMessage}
              badge={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <DearMeWorkbenchCard
              eyebrow="Portfolio proof card"
              title={preview.portfolioProofCard.placement}
              description={preview.portfolioProofCard.proposedCopy}
              badge={<FileText className="h-4 w-4 text-muted-foreground" />}
            />
            <DearMeWorkbenchCard
              eyebrow="First growth plan"
              title="First growth plan"
              description={preview.growthPlan.summary}
              badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
            />
          </section>

          {preview.warnings.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              {preview.warnings[0]}
            </div>
          ) : null}
        </div>
      ) : null}
    </DearMePanel>
  );
}

function workItemTarget(item: DearMeWorkbenchWorkItem) {
  return item.issueIdentifier ?? item.issueId;
}

function streamItemIssueTarget(item: DearMeWorkbenchStreamItem) {
  return item.issueIdentifier ?? item.issueId;
}

function liveFeedActionLabel(item: DearMeWorkbenchStreamItem) {
  if (item.approvalId || item.needsApproval) return "Review now";
  if (item.relatedOutputId) return reviewLoopActionLabel(item.reviewLoop) ?? "Open prepared work";
  if (streamItemIssueTarget(item)) {
    return item.kind === "cycle_brief" ? "Open private work" : "Open work";
  }
  return null;
}

function matchesIssueReference(
  item: { issueId?: string | null; issueIdentifier?: string | null },
  issueReference: string | null,
) {
  return Boolean(
    issueReference &&
      (item.issueIdentifier === issueReference || item.issueId === issueReference),
  );
}

function matchesDecisionFocus(decision: DearMeWorkbenchDecision, focus: DearMeDecisionFocus) {
  return Boolean(
    (focus.approvalId && decision.approvalId === focus.approvalId) ||
      matchesIssueReference(decision, focus.issueReference),
  );
}

function matchesBatchFocus(batch: DearMeWorkbenchBatchDecision, focus: DearMeDecisionFocus) {
  return Boolean(
    (focus.approvalId && batch.approvalIds.includes(focus.approvalId)) ||
      (focus.issueReference && batch.issueIds.includes(focus.issueReference)) ||
      (focus.outputId && batch.decisionIds.includes(`output:${focus.outputId}`)),
  );
}

function matchesOutputFocus(output: DearMeOutputItem, focus: DearMeDecisionFocus) {
  return Boolean(
    (focus.outputId && output.id === focus.outputId) ||
      matchesIssueReference(output, focus.issueReference),
  );
}

function matchesWorkItemFocus(item: DearMeWorkbenchWorkItem, focus: DearMeDecisionFocus) {
  return Boolean(
    (focus.outputId && item.id === focus.outputId) ||
      matchesIssueReference(item, focus.issueReference),
  );
}

function FocusedDecisionPanel({
  decision,
  batch,
  workItem,
  onOpenDecision,
  onOpenBatch,
  onOpenWorkItem,
  onReviewApproval,
  reviewState,
}: {
  decision: DearMeWorkbenchDecision | null;
  batch: DearMeWorkbenchBatchDecision | null;
  workItem: DearMeWorkbenchWorkItem | null;
  onOpenDecision: (decision: DearMeWorkbenchDecision) => void;
  onOpenBatch: (batch: DearMeWorkbenchBatchDecision) => void;
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) => void;
  onReviewApproval: (
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) => void;
  reviewState: DearMeApprovalReviewState;
}) {
  const [decisionNote, setDecisionNote] = useState("");

  if (decision) {
    const isReviewingDecision = reviewState.isPending && reviewState.approvalId === decision.approvalId;
    return (
      <DearMeFocusSurface aria-label="Focused decision">
        <DearMeWorkbenchSectionHeader
          icon={ShieldCheck}
          eyebrow="Decision focused"
          title={decision.title}
          description={decision.summary}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={decision.riskGate ? "secondary" : "outline"}>
                {decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Approval"}
              </Badge>
              {decision.reviewLoop ? <ReviewLoopBadges loop={decision.reviewLoop} /> : null}
              <Badge variant="outline">Updated {shortDate(decision.updatedAt)}</Badge>
            </div>
          }
        />
        <DearMeEvidenceGrid className="mt-4">
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Prepared work</p>
            <p className="mt-1 text-sm">
              {decision.outputKind ? OUTPUT_KIND_LABELS[decision.outputKind] : "Brand OS approval"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">State</p>
            <p className="mt-1 text-sm">
              {decision.reviewLoop ? reviewLoopStateLabel(decision.reviewLoop) : decision.status === "pending" ? "Waiting for your call" : "Ready for review"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Trust boundary</p>
            <p className="mt-1 text-sm">Nothing public happens without approval.</p>
          </div>
        </DearMeEvidenceGrid>
        {decision.approvalId ? (
          <div className="mt-4 rounded-md border border-border bg-background/80 p-4">
            <FieldLabel htmlFor="dearme-focused-decision-note" label="Decision note" />
            <Textarea
              id="dearme-focused-decision-note"
              aria-label="DearMe decision note"
              rows={3}
              value={decisionNote}
              placeholder="Optional note for your team."
              onChange={(event) => setDecisionNote(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Your team prepared the move. These actions update the existing approval gate.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onReviewApproval(decision.approvalId!, "approve", decisionNote)}
                  disabled={isReviewingDecision}
                >
                  {isReviewingDecision && reviewState.action === "approve" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve prepared move
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onReviewApproval(decision.approvalId!, "request_revision", decisionNote)}
                  disabled={isReviewingDecision}
                >
                  {isReviewingDecision && reviewState.action === "request_revision" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Request changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onReviewApproval(decision.approvalId!, "reject", decisionNote)}
                  disabled={isReviewingDecision}
                >
                  {isReviewingDecision && reviewState.action === "reject" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" onClick={() => onOpenDecision(decision)}>
              Review in DearMe
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DearMeFocusSurface>
    );
  }

  if (batch) {
    return (
      <DearMeFocusSurface aria-label="Focused decision">
        <DearMeWorkbenchSectionHeader
          icon={ShieldCheck}
          eyebrow="Decision focused"
          title={batch.title}
          description={batch.summary}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={batch.riskGate ? "secondary" : "outline"}>
                {batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review"}
              </Badge>
              <Badge variant="outline">
                {batch.itemCount} item{batch.itemCount === 1 ? "" : "s"}
              </Badge>
            </div>
          }
        />
        <DearMeEvidenceGrid className="mt-4">
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Next move</p>
            <p className="mt-1 text-sm">{batch.actionLabel}</p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Updated</p>
            <p className="mt-1 text-sm">{shortDate(batch.updatedAt)}</p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Trust boundary</p>
            <p className="mt-1 text-sm">Prepared privately. You choose what ships.</p>
          </div>
        </DearMeEvidenceGrid>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => onOpenBatch(batch)}>
            {batch.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DearMeFocusSurface>
    );
  }

  if (workItem) {
    return (
      <DearMeFocusSurface aria-label="Focused decision">
        <DearMeWorkbenchSectionHeader
          icon={FileText}
          eyebrow="Work focused"
          title={workItem.title}
          description={workItem.summary}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={outputStatusVariant(workItem.status)}>
                {OUTPUT_STATUS_LABELS[workItem.status]}
              </Badge>
              <ReviewLoopBadges loop={workItem.reviewLoop} />
            </div>
          }
        />
        <ReviewLoopNextStep loop={workItem.reviewLoop} className="mt-4" />
        <ReviewHandoffCard loop={workItem.reviewLoop} className="mt-4" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Prepared by {roleLabel(workItem.ownerRole)}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenWorkItem(workItem, reviewLoopRouteIntent(workItem.reviewLoop))}
          >
            {reviewLoopActionLabel(workItem.reviewLoop) ?? "Review prepared work"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DearMeFocusSurface>
    );
  }

  return (
    <DearMeFocusSurface aria-label="Focused decision" tone="empty">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4" />
        Decision focus unavailable
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The selected item is no longer waiting here. The current decision queue is still below.
      </p>
    </DearMeFocusSurface>
  );
}

function FocusedOutputPanel({
  output,
  entryIntent,
  reviewState,
  onReviewOutput,
}: {
  output: DearMeOutputItem;
  entryIntent?: DearMeReviewEntryIntent | null;
  reviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const preview = outputPreview(output);
  const details = output.details.slice(0, 4);
  const entryGuidance = reviewEntryGuidance(entryIntent, output.reviewLoop);
  const [decisionNote, setDecisionNote] = useState("");
  const isReviewingOutput = reviewState.isPending && reviewState.outputId === output.id;
  const canReview = output.isReviewable && !isReviewingOutput;
  const pendingAction = isReviewingOutput ? reviewState.action : null;

  useEffect(() => {
    setDecisionNote("");
  }, [output.id]);

  function review(action: DearMeOutputReviewAction) {
    onReviewOutput(output.id, action, decisionNote);
  }

  return (
    <DearMeFocusSurface className="mt-4" aria-label="Focused work">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Focused work"
        title={output.title}
        description={output.summary}
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{OUTPUT_KIND_LABELS[output.kind]}</Badge>
            <Badge variant={outputStatusVariant(output.status)}>
              {OUTPUT_STATUS_LABELS[output.status]}
            </Badge>
            <ReviewLoopBadges loop={output.reviewLoop} />
          </div>
        }
      />

      {preview ? (
        <p className="mt-4 rounded-md border border-border bg-background/80 p-3 text-sm text-foreground/85">
          {preview}
        </p>
      ) : null}

      {details.length > 0 ? (
        <DearMeEvidenceGrid className="mt-4" columns="two">
          {details.map((detail) => (
            <div key={`${output.id}:focused:${detail.kind}`} className="rounded-md border border-border bg-background/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">{detail.label}</p>
              <p className="mt-1 text-sm text-foreground/85">{detail.value}</p>
            </div>
          ))}
        </DearMeEvidenceGrid>
      ) : null}

      <ReviewLoopNextStep loop={output.reviewLoop} className="mt-4" />
      <ReviewHandoffCard loop={output.reviewLoop} className="mt-4" />

      {entryGuidance ? (
        <div className="mt-4 rounded-md border border-border bg-background/80 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{entryGuidance.label}</Badge>
            <p className="text-sm font-medium">{entryGuidance.title}</p>
          </div>
          <p className="mt-2 text-sm text-foreground/85">{entryGuidance.body}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-border bg-background/80 p-3">
        <FieldLabel
          htmlFor="dearme-focused-output-note"
          label="What should your team do next?"
          hint={output.isReviewable ? "Approval gated" : "Waiting"}
        />
        <p className="text-xs text-muted-foreground">
          Your team prepares the moves. You approve what represents you.
        </p>
        <Textarea
          id="dearme-focused-output-note"
          rows={3}
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder="Optional note for the team"
          disabled={isReviewingOutput || !output.isReviewable}
          className="mt-3"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => review("approve")} disabled={!canReview}>
            {pendingAction === "approve" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve this work
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => review("request_changes")}
            disabled={!canReview}
          >
            {pendingAction === "request_changes" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Request changes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => review("regenerate")}
            disabled={!canReview}
          >
            <RefreshCw className={cn("h-4 w-4", pendingAction === "regenerate" ? "animate-spin" : "")} />
            Prepare another pass
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => review("not_useful")}
            disabled={!canReview}
          >
            {pendingAction === "not_useful" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Choose new direction
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Updated {shortDate(output.updatedAt)}</span>
        <span>
          {output.documents.length} private reference{output.documents.length === 1 ? "" : "s"} prepared
        </span>
      </div>
    </DearMeFocusSurface>
  );
}

function workReadyActionLabel(status: DearMeOutputStatus, loop?: DearMeOutputReviewLoop | null) {
  const loopLabel = reviewLoopActionLabel(loop);
  if (loopLabel) return loopLabel;
  if (status === "ready_for_review") return "Review prepared work";
  if (status === "blocked") return "See what needs attention";
  if (status === "working") return "See progress";
  return "Open work";
}

function privateWorkActionLabel(output: DearMeOutputItem) {
  const loopLabel = reviewLoopActionLabel(output.reviewLoop);
  if (loopLabel) return loopLabel === "Review prepared work" && output.isReviewable ? "Review" : loopLabel;
  return output.isReviewable ? "Review" : "Open";
}

function workReadyNextStepLabel(status: DearMeOutputStatus) {
  if (status === "ready_for_review") {
    return "Open it, then approve, request changes, ask for another pass, or choose a new direction.";
  }
  if (status === "complete") return "Use it as proof or keep it in your private history.";
  if (status === "blocked") return "Review what is blocking the team before more private work continues.";
  if (status === "working") return "Track the lane; DearMe will bring it back here when it is ready.";
  if (status === "queued") return "No action yet; the team will prepare this before asking for your call.";
  return "Open it to see what changed and decide whether DearMe should continue.";
}

function decisionAfterCallLabel(riskGate?: DearMeWorkbenchDecision["riskGate"] | DearMeWorkbenchBatchDecision["riskGate"]) {
  if (riskGate) {
    return "Approved work can move forward; changes go back to the private team before anything external happens.";
  }
  return "Your call updates the private review path so the team knows what to use, revise, or stop.";
}

function TeamSummaryPanel({
  workbench,
  paidBetaActive,
}: {
  workbench: {
    headline: string;
    summary: string;
    team: DearMeWorkbenchTeamMember[];
    workReady: DearMeWorkbenchWorkItem[];
    decisionsNeeded: DearMeWorkbenchDecision[];
    activeWork: DearMeWorkbenchWorkItem[];
  };
  paidBetaActive: boolean;
}) {
  return (
    <DearMePanel aria-label="Your brand team today">
      <DearMeWorkbenchSectionHeader
        icon={Users}
        eyebrow="Your brand team today"
        title={workbench.headline}
        description={workbench.summary}
        trailing={
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Working now" : "Private work locked"}
          </Badge>
        }
      />

      <DearMeMetricStrip className="mt-5">
        <Metric icon={FileText} label="Work ready" value={workbench.workReady.length} />
        <Metric icon={ShieldCheck} label="Decisions" value={workbench.decisionsNeeded.length} />
        <Metric icon={Workflow} label="In motion" value={workbench.activeWork.length} />
        <Metric icon={Users} label="Team" value={workbench.team.length} />
      </DearMeMetricStrip>
    </DearMePanel>
  );
}

function WorkReadyPanel({
  items,
  onOpenWorkItem,
}: {
  items: DearMeWorkbenchWorkItem[];
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) => void;
}) {
  return (
    <DearMePanel aria-label="Work ready">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Work ready"
        title="Prepared work waiting for review"
        description="The strongest finished drafts, proof assets, and reports are first so the next customer action is obvious."
        trailing={items.length > 0 ? <Badge variant="outline">{items.length} ready</Badge> : null}
      />
      {items.length === 0 ? (
        <DearMeEmptyState
          className="mt-4"
          icon={FileText}
          title="Nothing is ready for review yet"
          description="The active lanes below show what is moving."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const outputKind = item.outputKind ?? "brand_os";
            const issueReference = workItemTarget(item);
            const routeIntent = reviewLoopRouteIntent(item.reviewLoop);
            return (
              <DearMeActionCard
                key={item.id}
                className="p-4"
                eyebrow={roleLabel(item.ownerRole)}
                title={item.title}
                summary={item.summary}
                attention={outputActionAttention(item.status, item.reviewLoop)}
                statusBadges={[
                  {
                    label: OUTPUT_STATUS_LABELS[item.status],
                    variant: outputStatusVariant(item.status),
                  },
                  {
                    label: reviewLoopLabel(item.reviewLoop),
                    variant: "outline",
                  },
                  {
                    label: reviewLoopStateLabel(item.reviewLoop),
                    variant: reviewLoopVariant(item.reviewLoop),
                  },
                  {
                    label: OUTPUT_KIND_LABELS[outputKind],
                    variant: "outline",
                  },
                ]}
                footer={`Updated ${shortDate(item.updatedAt)}`}
                action={
                  {
                    label: workReadyActionLabel(item.status, item.reviewLoop),
                    onClick: () => onOpenWorkItem(item, routeIntent),
                    disabled: !issueReference,
                    variant: item.status === "ready_for_review" ? "default" : "outline",
                  }
                }
              >
                <DearMeEvidenceGrid>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Prepared by</p>
                    <p className="mt-1 text-sm">{roleLabel(item.ownerRole)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Why it matters</p>
                    <p className="mt-1 text-sm text-foreground/85">{OUTPUT_KIND_VALUE_LABELS[outputKind]}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Your next step</p>
                    <p className="mt-1 text-sm text-foreground/85">{item.reviewLoop.nextStep}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{workReadyNextStepLabel(item.status)}</p>
                  </div>
                </DearMeEvidenceGrid>
                <ReviewHandoffCard loop={item.reviewLoop} className="mt-3" />
              </DearMeActionCard>
            );
          })}
        </div>
      )}
    </DearMePanel>
  );
}

function DecisionsNeededPanel({
  batches,
  decisions,
  onOpenBatch,
  onOpenDecision,
}: {
  batches: DearMeWorkbenchBatchDecision[];
  decisions: DearMeWorkbenchDecision[];
  onOpenBatch: (batch: DearMeWorkbenchBatchDecision) => void;
  onOpenDecision: (decision: DearMeWorkbenchDecision) => void;
}) {
  return (
    <DearMePanel aria-label="Decisions needed">
      <DearMeWorkbenchSectionHeader
        icon={ShieldCheck}
        eyebrow="Decisions needed"
        title="High-leverage calls"
        description="Approve, request changes, reject, or ask for another private pass on the moves that would represent you."
        trailing={
          batches.length + decisions.length > 0 ? (
            <Badge variant="secondary">{batches.length + decisions.length} waiting</Badge>
          ) : null
        }
      />
      {batches.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Batch decisions</p>
          {batches.map((batch) => (
            <DearMeActionCard
              key={batch.id}
              className="p-4"
              title={batch.title}
              summary={batch.summary}
              attention={{
                kind: "decision_needed",
                label: "Waiting on your decision",
                detail: `Review ${batch.itemCount} prepared move${batch.itemCount === 1 ? "" : "s"} before anything public or external happens.`,
              }}
              statusBadges={[
                {
                  label: batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review",
                  variant: batch.riskGate ? "secondary" : "outline",
                },
              ]}
              chips={[
                {
                  label: `${batch.itemCount} item${batch.itemCount === 1 ? "" : "s"}`,
                  variant: "outline",
                },
              ]}
              footer={`Updated ${shortDate(batch.updatedAt)}`}
              action={
                {
                  label: batch.actionLabel,
                  onClick: () => onOpenBatch(batch),
                  disabled: batch.approvalIds.length === 0 && batch.issueIds.length === 0,
                  variant: "default",
                }
              }
            >
              <DearMeEvidenceGrid>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Waiting on you</p>
                  <p className="mt-1 text-sm">
                    Review {batch.itemCount} prepared move{batch.itemCount === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Choices</p>
                  <p className="mt-1 text-sm">Approve, request changes, or ask for another private pass.</p>
                </div>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">After your call</p>
                  <p className="mt-1 text-sm text-foreground/85">{decisionAfterCallLabel(batch.riskGate)}</p>
                </div>
              </DearMeEvidenceGrid>
            </DearMeActionCard>
          ))}
        </div>
      ) : null}
      {decisions.length === 0 && batches.length === 0 ? (
        <DearMeEmptyState
          className="mt-4"
          icon={ShieldCheck}
          title="No high-leverage decision is waiting right now"
          description="Your team will place prepared public moves here when they need your call."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {batches.length > 0 ? (
            <p className="text-xs font-medium text-muted-foreground">Individual decisions</p>
          ) : null}
          {decisions.map((decision) => (
            <DearMeActionCard
              key={decision.id}
              className="p-4"
              title={decision.title}
              summary={decision.summary}
              attention={decisionActionAttention(decision)}
              statusBadges={[
                {
                  label: decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Approval",
                  variant: decision.riskGate ? "secondary" : "outline",
                },
                ...(decision.reviewLoop
                  ? [
                      { label: reviewLoopLabel(decision.reviewLoop), variant: "outline" as const },
                      {
                        label: reviewLoopStateLabel(decision.reviewLoop),
                        variant: reviewLoopVariant(decision.reviewLoop),
                      },
                    ]
                  : []),
              ]}
              chips={[
                {
                  label: decision.outputKind
                    ? OUTPUT_KIND_LABELS[decision.outputKind]
                    : "Brand OS approval",
                  variant: "outline",
                },
              ]}
              footer={`Updated ${shortDate(decision.updatedAt)}`}
              action={
                {
                  label: decision.approvalId ? "Approve" : "Review",
                  onClick: () => onOpenDecision(decision),
                  disabled: !decision.approvalId && !decision.issueIdentifier && !decision.issueId,
                  variant: decision.approvalId ? "default" : "outline",
                }
              }
            >
              <DearMeEvidenceGrid>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Prepared artifact</p>
                  <p className="mt-1 text-sm">
                    {decision.outputKind ? OUTPUT_KIND_LABELS[decision.outputKind] : "Brand OS approval"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Available choices</p>
                  <p className="mt-1 text-sm">Approve, request changes, or reject before anything public happens.</p>
                </div>
                <div className="rounded-md border border-border bg-background/80 p-3">
                  <p className="text-xs font-medium text-muted-foreground">After your call</p>
                  <p className="mt-1 text-sm text-foreground/85">
                    {decision.reviewLoop?.nextStep ?? decisionAfterCallLabel(decision.riskGate)}
                  </p>
                  {decision.reviewLoop?.lastDecisionNotePreview ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last call: {decision.reviewLoop.lastDecisionNotePreview}
                    </p>
                  ) : null}
                </div>
              </DearMeEvidenceGrid>
            </DearMeActionCard>
          ))}
        </div>
      )}
    </DearMePanel>
  );
}

function OperatingLoopPanel({
  workbench,
  paidBetaActive,
}: {
  workbench: DearMeWorkbenchResponse;
  paidBetaActive: boolean;
}) {
  const decisionCount = workbench.decisionsNeeded.length + workbench.batchDecisions.length;
  const workCount = workbench.workReady.length + workbench.activeWork.length;
  const latestEvent = workbench.workStream[0] ?? null;
  const graph = workbench.actionGraph;
  const graphCards = selectActionGraphCards(graph);
  const roleNodeCount = graph.nodes.filter((node) => node.kind === "role").length;
  const decisionNodeCount = graph.nodes.filter((node) => node.kind === "decision").length;
  const workLaneNodeCount = graph.nodes.filter((node) => node.kind === "work_item").length;
  const assetNodeCount = graph.nodes.filter((node) => node.kind === "artifact" || node.kind === "report").length;
  const memorySignalCount = graph.nodes.filter((node) => node.kind === "memory_signal").length;
  const guardrailNodeCount = graph.nodes.filter((node) => node.kind === "guardrail").length;
  const loopStages = [
    {
      key: "plan",
      icon: Gauge,
      label: "Plan",
      title: "Chief of Staff sets the cycle",
      summary: "Turns your Brand OS into the few moves that should compound your public surface this week.",
      signal: pluralizeCount(workbench.team.length, "team role"),
    },
    {
      key: "work",
      icon: Workflow,
      label: "Work",
      title: "The team prepares assets",
      summary: "Content, opportunity, and proof lanes turn private sources into draft work before you step in.",
      signal: workCount > 0 ? pluralizeCount(workCount, "item") : "Ready after the first cycle",
    },
    {
      key: "review",
      icon: ShieldCheck,
      label: "Review",
      title: "You make the high-leverage calls",
      summary: "Prepared posts, outreach, pages, and claims wait for your decision before they represent you.",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "No call waiting",
    },
  ];

  return (
    <DearMePanel aria-label="Growth cycle plan">
      <DearMeWorkbenchSectionHeader
        icon={Workflow}
        eyebrow="Growth cycle"
        title="Plan, work, review, then learn."
        description="DearMe keeps the operating rhythm visible while the underlying work stays private and approval-gated."
        trailing={
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Cycle active" : "Preview mode"}
          </Badge>
        }
      />

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {loopStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <DearMeWorkbenchCard
              key={stage.key}
              className="p-4"
              eyebrow={<Badge variant="outline">{stage.label}</Badge>}
              title={stage.title}
              description={stage.summary}
              badge={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              }
            >
              <p className="mt-4 text-xs font-medium uppercase text-muted-foreground">{stage.signal}</p>
            </DearMeWorkbenchCard>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="rounded-md border border-border bg-background/80 p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Latest signal</p>
          {latestEvent ? (
            <>
              <p className="mt-2 text-sm font-medium">{latestEvent.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{latestEvent.summary}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Start the first growth cycle to see what the team is doing now.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-background/80 p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Safety boundary</p>
          <p className="mt-2 text-sm text-foreground/85">
            Nothing publishes, sends, deploys, or spends without your approval.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border bg-background/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Growth map</p>
            <p className="mt-2 text-sm text-foreground/85">
              Your team turns private work into reviewable moves, remembers what you correct, and keeps public actions gated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{pluralizeCount(roleNodeCount, "role")} connected</Badge>
            <Badge variant={decisionNodeCount > 0 ? "secondary" : "outline"}>
              {decisionNodeCount > 0 ? pluralizeCount(decisionNodeCount, "decision") : "No decision waiting"}
            </Badge>
            {guardrailNodeCount > 0 ? <Badge variant="outline">{pluralizeCount(guardrailNodeCount, "guardrail")}</Badge> : null}
          </div>
        </div>
        <DearMeEvidenceGrid className="mt-4">
          <div className="rounded-md border border-border bg-muted/15 p-3">
            <p className="text-xs font-medium text-muted-foreground">Work lanes</p>
            <p className="mt-1 text-sm font-medium">{pluralizeCount(workLaneNodeCount, "lane")}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/15 p-3">
            <p className="text-xs font-medium text-muted-foreground">Prepared assets</p>
            <p className="mt-1 text-sm font-medium">{pluralizeCount(assetNodeCount, "asset")}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/15 p-3">
            <p className="text-xs font-medium text-muted-foreground">Memory signals</p>
            <p className="mt-1 text-sm font-medium">{pluralizeCount(memorySignalCount, "signal")}</p>
          </div>
        </DearMeEvidenceGrid>
        {graphCards.length > 0 ? (
          <div className="mt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Team work stream</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The current cycle, shown as the moves, memories, and guardrails that matter to you.
                </p>
              </div>
              <Badge variant="outline">Team visible</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {graphCards.map((node) => {
                const connectionLabels = actionGraphConnectionLabels(graph, node.id);
                const Icon = ACTION_GRAPH_KIND_ICONS[node.kind];
                return (
                  <DearMeWorkbenchCard
                    key={node.id}
                    className="p-3"
                    eyebrow={
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{ACTION_GRAPH_KIND_LABELS[node.kind]}</Badge>
                        {node.role ? <span className="text-xs text-muted-foreground">{roleLabel(node.role)}</span> : null}
                      </span>
                    }
                    title={node.label}
                    description={node.summary}
                    badge={
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <Badge variant={actionGraphStatusVariant(node)}>{actionGraphStatusLabel(node)}</Badge>
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Next move</p>
                        <p className="mt-1 line-clamp-3 text-sm text-foreground/85">{actionGraphNextMove(node)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Updated {shortDate(node.updatedAt)}</Badge>
                        {connectionLabels.map((label) => (
                          <Badge key={`${node.id}:${label}`} variant="secondary">
                            {titleizeStatus(label)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </DearMeWorkbenchCard>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </DearMePanel>
  );
}

function DearMeLetterPanel({
  report,
  onOpenIssue,
}: {
  report: DearMeWorkbenchReport | null;
  onOpenIssue: (issueReference: string) => void;
}) {
  return (
    <DearMePanel aria-label="Dear me letter">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Weekly Dear me"
        title="Private progress letter"
        description="A weekly ritual for what changed, what needs a call, and what the team is learning."
      />
      {report ? (
        <DearMeWorkbenchCard
          className="mt-4"
          title={report.title}
          description={report.summary}
          badge={
            <Badge variant={outputStatusVariant(report.status)}>
              {OUTPUT_STATUS_LABELS[report.status]}
            </Badge>
          }
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenIssue(report.issueIdentifier ?? report.issueId)}
            >
              Open letter
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          <p className="line-clamp-3 text-sm text-foreground/80">{report.bodyPreview}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {REPORT_DIGEST_SECTIONS.map((section) => {
              const items = report[section.key];

              return (
                <section
                  key={section.key}
                  className="rounded-lg border border-border/70 bg-background/60 p-3"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
                    <p className="text-xs text-muted-foreground">{section.helper}</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                    {items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </DearMeWorkbenchCard>
      ) : (
        <DearMeEmptyState
          className="mt-4"
          icon={FileText}
          title="Dear me letter is not ready yet"
          description="The first Dear me letter appears here after the growth cycle starts."
        />
      )}
    </DearMePanel>
  );
}

function TeamAtWorkPanel({
  team,
}: {
  team: DearMeWorkbenchTeamMember[];
}) {
  const hasTeam = team.length > 0;

  return (
    <DearMePanel aria-label="Team at work">
      <DearMeWorkbenchSectionHeader
        icon={Users}
        eyebrow="Team at work"
        description="Role-based progress written in customer-safe language."
      />
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {hasTeam
          ? team.map((member, index) => (
              <DearMeWorkbenchCard
                key={`${member.role}:${index}`}
                title={member.name}
                description={member.currentFocus}
                badge={<Badge variant="outline">{member.status}</Badge>}
              />
            ))
          : TEAM_WORKSTREAM.slice(0, 4).map((item, index) => (
              <DearMeWorkbenchCard
                key={`fallback-team:${item.role}:${index}`}
                title={item.role}
                description={item.action}
                tone="empty"
              />
            ))}
      </div>
    </DearMePanel>
  );
}

function LiveTeamFeedPanel({
  liveStream,
  onOpenApproval,
  onOpenIssue,
  onOpenWorkItem,
}: {
  liveStream: DearMeWorkbenchStreamItem[];
  onOpenApproval: (approvalId: string) => void;
  onOpenIssue: (issueReference: string) => void;
  onOpenWorkItem: (
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) => void;
}) {
  if (liveStream.length === 0) return null;

  return (
    <DearMePanel aria-label="Live team feed">
      <DearMeWorkbenchSectionHeader
        icon={Workflow}
        eyebrow="Live team feed"
        description="Watch the team turn private work into reviewable moves. The machinery stays backstage."
        trailing={<Badge variant="outline">While you were away</Badge>}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {liveStream.map((item, index) => {
          const issueReference = streamItemIssueTarget(item);
          const canOpen = Boolean(item.approvalId || issueReference);
          const actionLabel = canOpen ? liveFeedActionLabel(item) : null;
          return (
            <DearMeActionCard
              key={`${item.id}:${item.role}:${item.createdAt}:${index}`}
              eyebrow={
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{WORKSTREAM_STAGE_LABELS[item.cycleStage]}</Badge>
                  <span>{roleLabel(item.role)}</span>
                </span>
              }
              title={item.title}
              summary={item.summary}
              attention={streamActionAttention(item)}
              statusBadges={[
                { label: WORKSTREAM_KIND_LABELS[item.kind], variant: "outline" },
                {
                  label: WORKSTREAM_STATUS_LABELS[item.status],
                  variant: item.needsApproval ? "secondary" : "outline",
                },
                ...(item.reviewLoop
                  ? [
                      { label: reviewLoopLabel(item.reviewLoop), variant: "outline" as const },
                      {
                        label: reviewLoopStateLabel(item.reviewLoop),
                        variant: reviewLoopVariant(item.reviewLoop),
                      },
                    ]
                  : []),
              ]}
              chips={[
                { label: item.artifact, variant: "outline" },
                { label: item.sourceLabel, variant: "outline" },
                ...(item.needsApproval
                  ? [{ label: "Decision ready", variant: "default" as const }]
                  : []),
                ...(item.costImpact
                  ? [{ label: item.costImpact, variant: "secondary" as const }]
                  : []),
                { label: shortDate(item.createdAt), variant: "outline" },
              ]}
              calloutLabel="Next action"
              callout={item.nextAction}
              action={
                actionLabel
                  ? {
                      label: actionLabel,
                      variant: item.needsApproval ? "default" : "outline",
                      ariaLabel: `${actionLabel}: ${item.title}`,
                      onClick: () => {
                        if (item.approvalId) {
                          onOpenApproval(item.approvalId);
                          return;
                        }
                        if (issueReference && item.relatedOutputId) {
                          onOpenWorkItem(issueReference, item.relatedOutputId, reviewLoopRouteIntent(item.reviewLoop));
                          return;
                        }
                        if (issueReference) onOpenIssue(issueReference);
                      },
                    }
                  : null
              }
            />
          );
        })}
      </div>
    </DearMePanel>
  );
}

function VoiceMemoryPanel({
  memory,
  isPending,
  error,
  result,
  archiveResult,
  onAdd,
  onUpdate,
  onArchive,
}: {
  memory: DearMeWorkbenchMemory;
  isPending: boolean;
  error: string | null;
  result: DearMeMemoryUpdateResult | null;
  archiveResult: DearMeMemoryArchiveResult | null;
  onAdd: (input: DearMeMemoryUpdate) => void;
  onUpdate: (memoryId: string, input: DearMeMemoryUpdate) => void;
  onArchive: (memoryId: string) => void;
}) {
  const [kind, setKind] = useState<DearMeMemoryUpdateKind>("voice_sample");
  const [sourceGuideId, setSourceGuideId] = useState<MemorySourceGuideId>("writing_sample");
  const [sourceInputMode, setSourceInputMode] = useState<DearMeMemorySourceInputMode>("paste");
  const [title, setTitle] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [body, setBody] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const voiceProfile = memory.voiceProfile;
  const sourcePlan = memory.sourcePlan;
  const selectedGuide =
    MEMORY_SOURCE_GUIDES.find((guide) => guide.id === sourceGuideId) ?? DEFAULT_MEMORY_SOURCE_GUIDE;
  const sourceLabelText =
    sourceInputMode === "link"
      ? "Private link"
      : sourceInputMode === "import_note"
        ? "Source to import"
        : "Source or note";
  const sourcePlaceholder =
    sourceInputMode === "link"
      ? "https://example.com/private-source"
      : sourceInputMode === "import_note"
        ? "Resume, transcript, portfolio, call notes, or backlog item"
        : selectedGuide.sourcePlaceholder;
  const feedback = memoryUpdateFeedback(result);
  const recordedMemory = result?.memory ?? null;
  const recordedMemoryAlreadyLoaded = recordedMemory
    ? memory.latest.some((item) => item.id === recordedMemory.id)
    : false;
  const latestMemory = recordedMemory
    ? [recordedMemory, ...memory.latest.filter((item) => item.id !== recordedMemory.id)]
    : memory.latest;
  const visibleLatestMemory = archiveResult
    ? latestMemory.filter((item) => item.id !== archiveResult.memoryId)
    : latestMemory;
  const displayedSourceCount = result
    ? Math.max(memory.sourceCount, result.growthCycles.memorySources)
    : memory.sourceCount;
  const displayedVoiceSampleCount =
    recordedMemory && !recordedMemoryAlreadyLoaded && recordedMemory.kind === "voice_sample"
      ? memory.voiceSampleCount + 1
      : memory.voiceSampleCount;
  const displayedProofCount =
    recordedMemory && !recordedMemoryAlreadyLoaded && recordedMemory.kind === "proof_point"
      ? memory.proofCount + 1
      : memory.proofCount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    const trimmedSourceLabel = sourceLabel.trim();
    if (!trimmedBody) {
      setLocalError("Add source material before saving.");
      return;
    }
    if (sourceInputMode === "link") {
      if (!trimmedSourceLabel) {
        setLocalError("Add the private link DearMe should remember.");
        return;
      }
      try {
        const parsedUrl = new URL(trimmedSourceLabel);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          setLocalError("Use an http or https link for source links.");
          return;
        }
      } catch {
        setLocalError("Use a valid http or https link for source links.");
        return;
      }
    }

    setLocalError(null);
    const update = {
      kind,
      sourceInputMode,
      title: title.trim() || selectedGuide.label,
      body: trimmedBody,
      sourceLabel: trimmedSourceLabel || null,
    };
    if (editingMemoryId) {
      onUpdate(editingMemoryId, update);
    } else {
      onAdd(update);
    }
    setEditingMemoryId(null);
    setSourceInputMode("paste");
    setTitle("");
    setSourceLabel("");
    setBody("");
  }

  function handleGuideSelect(guide: (typeof MEMORY_SOURCE_GUIDES)[number]) {
    setSourceGuideId(guide.id);
    setKind(guide.kind);
    setSourceInputMode(defaultSourceInputModeForGuide(guide));
    setLocalError(null);
  }

  function handleReviseSource(item: DearMeMemoryUpdateItem) {
    const guide = memorySourceGuideForKind(item.kind);
    setEditingMemoryId(item.id);
    setSourceGuideId(guide.id);
    setKind(item.kind);
    setSourceInputMode(item.sourceInputMode);
    setTitle(item.title ?? guide.label);
    setSourceLabel(item.sourceLabel ?? "");
    setBody(item.body);
    setLocalError(null);
  }

  function handleCancelRevise() {
    setEditingMemoryId(null);
    setSourceInputMode("paste");
    setTitle("");
    setSourceLabel("");
    setBody("");
    setLocalError(null);
  }

  function handleRetireSource(item: DearMeMemoryUpdateItem) {
    if (editingMemoryId === item.id) {
      handleCancelRevise();
    }
    onArchive(item.id);
  }

  function handleKindChange(nextKind: DearMeMemoryUpdateKind) {
    setKind(nextKind);
    const matchingGuide = MEMORY_SOURCE_GUIDES.find((guide) => guide.kind === nextKind);
    if (matchingGuide) {
      setSourceGuideId(matchingGuide.id);
      setSourceInputMode(defaultSourceInputModeForGuide(matchingGuide));
    }
  }

  function handleSourcePlanSelect(nextKind: DearMeMemoryUpdateKind) {
    const matchingGuide = memorySourceGuideForKind(nextKind);
    setSourceGuideId(matchingGuide.id);
    setKind(nextKind);
    setSourceInputMode(defaultSourceInputModeForGuide(matchingGuide));
    setLocalError(null);
  }

  function handleSourceReviewSelect(item: DearMeWorkbenchMemory["sourceReviewQueue"][number]) {
    const matchingGuide = memorySourceGuideForKind(item.proposedKind);
    setEditingMemoryId(null);
    setSourceGuideId(matchingGuide.id);
    setKind(item.proposedKind);
    setSourceInputMode("paste");
    setTitle(item.proposedTitle);
    setSourceLabel(item.sourceLabel ?? item.sourceTitle);
    setBody(item.proposedBody);
    setLocalError(null);
  }

  return (
    <DearMePanel aria-label="Voice & Memory">
      <DearMeWorkbenchSectionHeader
        icon={Sparkles}
        eyebrow="Voice & Memory"
        description={memory.summary}
      />

      <DearMeMetricStrip className="mt-5">
        <Metric icon={FileText} label="Sources" value={displayedSourceCount} />
        <Metric icon={Sparkles} label="Voice" value={displayedVoiceSampleCount} />
        <Metric icon={ShieldCheck} label="Proof" value={displayedProofCount} />
      </DearMeMetricStrip>

      <div className="mt-5 grid gap-4 border-t border-border pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(12rem,0.6fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{voiceProfile.title}</p>
            <Badge variant={voiceProfileVariant(voiceProfile.status)}>
              {VOICE_PROFILE_STATUS_LABELS[voiceProfile.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{voiceProfile.guidance}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Current tone signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {voiceProfile.draftTone.map((tone) => (
              <Badge key={tone} variant="outline">{tone}</Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{voiceProfile.nextStep}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center lg:grid-cols-1">
          <Metric icon={Gauge} label="Confidence" value={`${voiceProfile.confidence}%`} />
          <Metric icon={Sparkles} label="Samples" value={voiceProfile.sampleCount} />
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Source coverage</p>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{sourcePlan.summary}</p>
          </div>
          <Badge variant={memorySourcePlanVariant(sourcePlan.status)}>
            {MEMORY_SOURCE_PLAN_STATUS_LABELS[sourcePlan.status]}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sourcePlan.required.map((requirement) => {
            const guide = memorySourceGuideForKind(requirement.kind);
            const Icon = guide.icon;
            const selected = kind === requirement.kind;
            const isNext = sourcePlan.nextSourceKind === requirement.kind && requirement.status !== "ready";
            return (
              <button
                key={requirement.label}
                type="button"
                aria-pressed={selected}
                aria-label={`Add ${requirement.label}`}
                className={cn(
                  "min-h-28 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
                onClick={() => handleSourcePlanSelect(requirement.kind)}
              >
                <span className="flex flex-col items-start gap-2">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="break-words">{requirement.label}</span>
                  </span>
                  <Badge variant={memorySourceRequirementVariant(requirement.status)}>
                    {MEMORY_SOURCE_REQUIREMENT_STATUS_LABELS[requirement.status]}
                  </Badge>
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {requirement.count} of {requirement.target} saved
                </span>
                <span className="mt-2 block text-xs leading-5">{requirement.nextAction}</span>
                {isNext ? (
                  <span className="mt-2 inline-flex text-xs font-medium text-foreground">Next source</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {memory.sourceReviewQueue.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Source review</p>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Private links and import notes wait here until you turn them into reviewed Voice & Memory facts.
              </p>
            </div>
            <Badge variant="outline">{memory.sourceReviewQueue.length} to review</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {memory.sourceReviewQueue.map((item) => (
              <DearMeActionCard
                key={item.id}
                aria-label="Voice & Memory source review"
                eyebrow={MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode]}
                title={item.sourceTitle}
                summary={item.summary}
                chips={[
                  { label: MEMORY_KIND_LABELS[item.proposedKind], variant: "outline" },
                  ...(item.sourceLabel
                    ? [{ label: sourceLabelForChip(item.sourceLabel), variant: "outline" as const }]
                    : []),
                  { label: shortDate(item.createdAt), variant: "outline" },
                ]}
                calloutLabel="Prepare next"
                callout={item.nextAction}
                action={{
                  label: "Prepare fact",
                  ariaLabel: `Prepare fact from ${item.sourceTitle}`,
                  onClick: () => handleSourceReviewSelect(item),
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="dearme-memory-source-guide" label="Source guide" />
          {editingMemoryId ? (
            <div className="mt-2 flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>Revising a saved source. Future private work will use the revised version.</span>
              <Button type="button" size="sm" variant="outline" onClick={handleCancelRevise}>
                Cancel revise
              </Button>
            </div>
          ) : null}
          <div
            id="dearme-memory-source-guide"
            className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {MEMORY_SOURCE_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const selected = guide.id === sourceGuideId;
              return (
                <button
                  key={guide.id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "min-h-24 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                  )}
                  onClick={() => handleGuideSelect(guide)}
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="break-words">{guide.label}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5">{guide.helper}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="dearme-memory-source-mode" label="Source path" />
          <div
            id="dearme-memory-source-mode"
            className="mt-2 grid gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Voice & Memory source path"
          >
            {DEARME_MEMORY_SOURCE_INPUT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sourceInputMode === mode}
                className={cn(
                  "min-h-20 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                  sourceInputMode === mode
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
                onClick={() => {
                  setSourceInputMode(mode);
                  setLocalError(null);
                }}
              >
                <span className="font-medium text-foreground">
                  {MEMORY_SOURCE_INPUT_MODE_LABELS[mode]}
                </span>
                <span className="mt-1 block text-xs leading-5">
                  {MEMORY_SOURCE_INPUT_MODE_HELPERS[mode]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="grid gap-3">
            <div>
              <FieldLabel htmlFor="dearme-memory-kind" label="Source type" />
              <select
                id="dearme-memory-kind"
                value={kind}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  handleKindChange(event.target.value as DearMeMemoryUpdateKind);
                }}
              >
                {DEARME_MEMORY_UPDATE_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {MEMORY_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="dearme-memory-title" label="Title" />
              <Input
                id="dearme-memory-title"
                value={title}
                placeholder={selectedGuide.titlePlaceholder}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="dearme-memory-source" label={sourceLabelText} />
              <Input
                id="dearme-memory-source"
                value={sourceLabel}
                placeholder={sourcePlaceholder}
                type={sourceInputMode === "link" ? "url" : "text"}
                onChange={(event) => setSourceLabel(event.target.value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="dearme-memory-body" label="Memory" />
            <Textarea
              id="dearme-memory-body"
              value={body}
              rows={7}
              placeholder={selectedGuide.bodyPlaceholder}
              onChange={(event) => setBody(event.target.value)}
            />
            {localError || error ? (
              <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {localError ?? error}
              </div>
            ) : null}
            {feedback && !error ? (
              <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-foreground">
                {feedback}
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? editingMemoryId ? "Saving..." : "Adding..."
                  : editingMemoryId ? "Save source" : "Add to Voice & Memory"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {visibleLatestMemory.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleLatestMemory.slice(0, 6).map((item) => {
            const justSaved = recordedMemory?.id === item.id;
            const chips = [
              { label: MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode], variant: "outline" as const },
              ...(justSaved
                ? [{ label: "Just saved", variant: "secondary" as const }]
                : []),
              ...(item.sourceLabel
                ? [{ label: sourceLabelForChip(item.sourceLabel), variant: "outline" as const }]
                : []),
            ];
            return (
              <DearMeActionCard
                key={item.id}
                aria-label="Voice & Memory source"
                eyebrow={MEMORY_KIND_LABELS[item.kind]}
                title={item.title ?? "Untitled memory"}
                summary={item.bodyPreview}
                chips={chips}
                footer={shortDate(item.createdAt)}
                action={{
                  label: "Revise",
                  ariaLabel: `Revise ${item.title ?? MEMORY_KIND_LABELS[item.kind]}`,
                  icon: RefreshCw,
                  onClick: () => handleReviseSource(item),
                }}
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRetireSource(item)}
                  >
                    <XCircle className="h-4 w-4" />
                    Retire source
                  </Button>
                </div>
              </DearMeActionCard>
            );
          })}
        </div>
      ) : (
        <DearMeEmptyState
          className="mt-5"
          icon={Sparkles}
          title="No Voice & Memory saved yet"
          description="Add one writing sample, proof point, source link, correction, audience note, or offer note. DearMe will use it to protect your voice and prepare the next growth cycle."
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Writing sample</Badge>
            <Badge variant="outline">Proof point</Badge>
            <Badge variant="outline">Source link</Badge>
            <Badge variant="outline">Correction</Badge>
            <Badge variant="outline">Audience note</Badge>
            <Badge variant="outline">Offer note</Badge>
          </div>
        </DearMeEmptyState>
      )}
    </DearMePanel>
  );
}

function ChiefOfStaffComposerPanel({
  paidBetaActive,
  isPending,
  error,
  result,
  onSubmit,
  onOpenIssue,
}: {
  paidBetaActive: boolean;
  isPending: boolean;
  error: string | null;
  result: DearMeChiefOfStaffMessageResult | null;
  onSubmit: (input: { intent: DearMeChiefOfStaffMessageIntent; message: string }) => void;
  onOpenIssue: (issueReference: string) => void;
}) {
  const [intent, setIntent] = useState<DearMeChiefOfStaffMessageIntent>(DEFAULT_CHIEF_OF_STAFF_INTENT);
  const [message, setMessage] = useState("");
  const selectedIntent = CHIEF_OF_STAFF_INTENT_OPTIONS.find((option) => option.value === intent) ?? {
    value: DEFAULT_CHIEF_OF_STAFF_INTENT,
    label: "Plan next moves",
    helper: "Prioritize the next brand cycle.",
  };
  const trimmedMessage = message.trim();
  const disabled = !paidBetaActive || isPending || trimmedMessage.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    onSubmit({ intent, message: trimmedMessage });
    setMessage("");
  }

  function handleCycleControl(control: (typeof CHIEF_OF_STAFF_CYCLE_CONTROLS)[number]) {
    if (!paidBetaActive || isPending) return;
    setIntent(control.intent);
    setMessage(control.message);
  }

  return (
    <DearMePanel className="bg-muted/10" aria-label="Chief of Staff composer">
      <DearMeWorkbenchSectionHeader
        icon={MessageSquare}
        eyebrow="Chief of Staff"
        title="Brief the team"
        description="Ask for the next plan, a content batch, opportunity research, a portfolio update, or this week's direction. DearMe keeps the work private until you approve a move."
        trailing={
          <Badge variant={paidBetaActive ? "secondary" : "outline"}>
            {paidBetaActive ? "Private work ready" : "Paid beta needed"}
          </Badge>
        }
      />
      <div className="mt-5 rounded-md border border-border bg-background/70 p-3" aria-label="Cycle controls">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Cycle controls</p>
            <p className="mt-1 text-sm text-foreground/85">
              Pick the next private cycle; your team prepares reviewable moves and waits for approval.
            </p>
          </div>
          <Badge variant="outline">Review pass</Badge>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {CHIEF_OF_STAFF_CYCLE_CONTROLS.map((control) => {
            const Icon = control.icon;
            const isSelected = intent === control.intent && message === control.message;
            return (
              <Button
                key={control.label}
                type="button"
                variant={isSelected ? "secondary" : "outline"}
                className="h-auto justify-start px-3 py-3 text-left"
                disabled={!paidBetaActive || isPending}
                onClick={() => handleCycleControl(control)}
              >
                <span className="flex w-full items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug">{control.label}</span>
                    <span className="mt-1 block whitespace-normal text-xs font-normal leading-snug text-muted-foreground">
                      {control.helper}
                    </span>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>
      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div>
            <Select
              value={intent}
              onValueChange={(value) => setIntent(value as DearMeChiefOfStaffMessageIntent)}
              disabled={!paidBetaActive || isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHIEF_OF_STAFF_INTENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">{selectedIntent.helper}</p>
          </div>
          <div className="space-y-3">
            <Textarea
              id="dearme-chief-of-staff-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={!paidBetaActive || isPending}
              placeholder="Tell your Chief of Staff what changed, what you want, or what decision you need prepared."
              className="min-h-28 resize-y"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                External actions, spend, publishing, and public claims still come back for approval.
              </p>
              <Button type="submit" disabled={disabled}>
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to Chief of Staff
              </Button>
            </div>
          </div>
        </div>
      </form>
      {!paidBetaActive ? (
        <div className="mt-4 rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
          Activate paid beta and approve Brand OS before briefing the private team.
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {result ? (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">{result.status === "queued" ? "Brief sent" : "Brief saved"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.nextStep}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenIssue(result.issueIdentifier ?? result.issueId)}
          >
            <ArrowRight className="h-4 w-4" />
            Open private work
          </Button>
        </div>
      ) : null}
    </DearMePanel>
  );
}

function TeamWorkbenchPanel({
  companyId,
  paidBetaActive,
  decisionFocus,
  onOpenApproval,
  onOpenIssue,
  onOpenWorkItem,
  onReviewApproval,
  reviewState,
}: {
  companyId: string;
  paidBetaActive: boolean;
  decisionFocus: DearMeDecisionFocus | null;
  onOpenApproval: (approvalId: string) => void;
  onOpenIssue: (issueReference: string) => void;
  onOpenWorkItem: (
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) => void;
  onReviewApproval: (
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) => void;
  reviewState: DearMeApprovalReviewState;
}) {
  const queryClient = useQueryClient();
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [chiefOfStaffError, setChiefOfStaffError] = useState<string | null>(null);
  const [chiefOfStaffResult, setChiefOfStaffResult] = useState<DearMeChiefOfStaffMessageResult | null>(null);
  const workbenchQuery = useQuery({
    queryKey: queryKeys.dearme.workbench(companyId),
    queryFn: () => dearmeApi.getWorkbench(companyId),
  });
  const chiefOfStaffMutation = useMutation({
    mutationFn: (input: { intent: DearMeChiefOfStaffMessageIntent; message: string }) =>
      dearmeApi.sendChiefOfStaffMessage(companyId, input),
    onSuccess: (result) => {
      setChiefOfStaffError(null);
      setChiefOfStaffResult(result);
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setChiefOfStaffResult(null);
      setChiefOfStaffError(err instanceof Error ? err.message : "Could not send the Chief of Staff brief.");
    },
  });
  const memoryMutation = useMutation({
    mutationFn: (input: DearMeMemoryUpdate) => dearmeApi.recordMemoryUpdate(companyId, input),
    onSuccess: () => {
      setMemoryError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setMemoryError(err instanceof Error ? err.message : "Could not update Voice & Memory.");
    },
  });
  const memoryUpdateMutation = useMutation({
    mutationFn: (input: { memoryId: string; update: DearMeMemoryUpdate }) =>
      dearmeApi.updateMemorySource(companyId, input.memoryId, input.update),
    onSuccess: () => {
      setMemoryError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setMemoryError(err instanceof Error ? err.message : "Could not revise Voice & Memory.");
    },
  });
  const memoryArchiveMutation = useMutation({
    mutationFn: (memoryId: string) => dearmeApi.archiveMemorySource(companyId, memoryId),
    onSuccess: () => {
      setMemoryError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setMemoryError(err instanceof Error ? err.message : "Could not retire the source.");
    },
  });
  const workbench = workbenchQuery.data ?? null;

  if (workbenchQuery.isLoading) {
    return (
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]" aria-label="DearMe team workbench">
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" />
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" />
      </section>
    );
  }

  if (workbenchQuery.isError || !workbench) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {workbenchQuery.error instanceof Error
            ? workbenchQuery.error.message
            : "Failed to load the DearMe team workbench."}
        </div>
        <TeamWorkstreamPanel previewReady={false} paidBetaActive={paidBetaActive} />
      </div>
    );
  }

  const readyItems = workbench.workReady.slice(0, 3);
  const decisions = workbench.decisionsNeeded.slice(0, 3);
  const batches = workbench.batchDecisions.slice(0, 3);
  const liveStream = workbench.workStream.slice(0, 6);
  const focusedDecision = decisionFocus
    ? workbench.decisionsNeeded.find((decision) => matchesDecisionFocus(decision, decisionFocus)) ?? null
    : null;
  const focusedBatch = decisionFocus && !focusedDecision
    ? workbench.batchDecisions.find((batch) => matchesBatchFocus(batch, decisionFocus)) ?? null
    : null;
  const focusedWorkItem = decisionFocus && !focusedDecision && !focusedBatch
    ? [...workbench.workReady, ...workbench.activeWork].find((item) => matchesWorkItemFocus(item, decisionFocus)) ?? null
    : null;

  function openDecision(decision: DearMeWorkbenchDecision) {
    if (decision.approvalId) {
      onOpenApproval(decision.approvalId);
      return;
    }
    const issueReference = decision.issueIdentifier ?? decision.issueId;
    if (issueReference) onOpenIssue(issueReference);
  }

  function openBatch(batch: DearMeWorkbenchBatchDecision) {
    const approvalId = batch.approvalIds[0];
    if (approvalId) {
      onOpenApproval(approvalId);
      return;
    }
    const issueId = batch.issueIds[0];
    if (issueId) onOpenIssue(issueId);
  }

  function openWorkItem(item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) {
    const issueReference = workItemTarget(item);
    if (issueReference) onOpenWorkItem(issueReference, item.id, intent);
  }

  return (
    <section className="space-y-4" aria-label="DearMe team workbench">
      {decisionFocus ? (
        <FocusedDecisionPanel
          decision={focusedDecision}
          batch={focusedBatch}
          workItem={focusedWorkItem}
          onOpenDecision={openDecision}
          onOpenBatch={openBatch}
          onOpenWorkItem={openWorkItem}
          onReviewApproval={onReviewApproval}
          reviewState={reviewState}
        />
      ) : null}

      <TeamSummaryPanel workbench={workbench} paidBetaActive={paidBetaActive} />

      <OperatingLoopPanel workbench={workbench} paidBetaActive={paidBetaActive} />

      <ChiefOfStaffComposerPanel
        paidBetaActive={paidBetaActive}
        isPending={chiefOfStaffMutation.isPending}
        error={chiefOfStaffError}
        result={chiefOfStaffResult}
        onSubmit={(input) => chiefOfStaffMutation.mutate(input)}
        onOpenIssue={onOpenIssue}
      />

      <DearMeCockpitGrid variant="primary">
        <WorkReadyPanel items={readyItems} onOpenWorkItem={openWorkItem} />
        <DecisionsNeededPanel
          batches={batches}
          decisions={decisions}
          onOpenBatch={openBatch}
          onOpenDecision={openDecision}
        />
      </DearMeCockpitGrid>

      <DearMeCockpitGrid variant="primary">
        <DearMeLetterPanel report={workbench.report} onOpenIssue={onOpenIssue} />
        <VoiceMemoryPanel
          memory={workbench.memory}
          isPending={memoryMutation.isPending || memoryUpdateMutation.isPending || memoryArchiveMutation.isPending}
          error={memoryError}
          result={memoryUpdateMutation.data ?? memoryMutation.data ?? null}
          archiveResult={memoryArchiveMutation.data ?? null}
          onAdd={(input) => memoryMutation.mutate(input)}
          onUpdate={(memoryId, input) => memoryUpdateMutation.mutate({ memoryId, update: input })}
          onArchive={(memoryId) => memoryArchiveMutation.mutate(memoryId)}
        />
      </DearMeCockpitGrid>

      <DearMeCockpitGrid variant="primary">
        <TeamAtWorkPanel team={workbench.team} />
        <LiveTeamFeedPanel
          liveStream={liveStream}
          onOpenApproval={onOpenApproval}
          onOpenIssue={onOpenIssue}
          onOpenWorkItem={onOpenWorkItem}
        />
      </DearMeCockpitGrid>
    </section>
  );
}

function PreviewPanel({
  preview,
  executionPlan,
  warnings,
  previewMatchesForm,
}: {
  preview: DearMeBrandBlueprintPreviewResult | null;
  executionPlan: DearMeBrandBlueprintExecutionPlan | null;
  warnings: string[];
  previewMatchesForm: boolean;
}) {
  if (!preview || !executionPlan) {
    return (
      <DearMeEmptyState
        align="center"
        className="min-h-[360px] rounded-lg p-5"
        icon={Sparkles}
        title="First cycle preview"
        description="Preview shows the team, first-cycle artifacts, budget, memory seeds, and approval gates before anything is applied."
      />
    );
  }

  return (
    <section className="space-y-4" aria-label="Brand OS preview">
      {!previewMatchesForm ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Refresh the preview before requesting approval.
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-3">Preview</Badge>
            <h2 className="text-xl font-semibold">{preview.summary.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{preview.summary.summary}</p>
          </div>
          <Badge variant={preview.blueprint.voiceProfile.status === "ready_for_gate" ? "default" : "secondary"}>
            {preview.blueprint.voiceProfile.status === "ready_for_gate" ? "Voice ready" : "Needs voice"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Team" value={preview.summary.teamMemberCount} />
          <Metric icon={Workflow} label="Cycles" value={preview.summary.cycleCount} />
          <Metric icon={ShieldCheck} label="Approval gates" value={preview.summary.riskGateCount} />
          <Metric icon={CircleDollarSign} label="Monthly budget" value={money(preview.blueprint.budgetPolicy.monthlyCents)} />
        </div>
      </div>

      <VoiceGatePanel gate={preview.voiceGate} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Team
          </div>
          <div className="grid gap-2">
            {preview.blueprint.team.map((member, index) => (
              <DearMeWorkbenchCard
                key={`${member.role}:${index}`}
                title={member.name}
                description={member.mission}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4" />
            Cycles
          </div>
          <div className="grid gap-2">
            {preview.blueprint.cycles.map((cycle) => (
              <DearMeWorkbenchCard
                key={cycle.id}
                title={cycle.title}
                description={roleLabel(cycle.ownerRole)}
                badge={<Badge variant="outline">{CADENCE_LABELS[cycle.cadence]}</Badge>}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          First operations
        </div>
        <div className="grid gap-2">
          {executionPlan.operations.map((operation) => (
            <DearMeWorkbenchCard
              key={operation.id}
              title={operation.title}
              description={operation.description}
              badge={operation.approvalGate ? <Badge variant="secondary">{roleLabel(operation.approvalGate)}</Badge> : null}
            />
          ))}
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Warnings</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function PaidBetaAccessPanel({
  companyId,
  status,
  isLoading,
  isError,
  error,
}: {
  companyId: string;
  status: DearMePaidBetaStatus | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  const queryClient = useQueryClient();
  const [amountDollars, setAmountDollars] = useState("250");
  const [description, setDescription] = useState("Founding beta payment");
  const [externalInvoiceId, setExternalInvoiceId] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const entitlement = status?.entitlement ?? null;
  const cycleGuardrail = status?.cycleGuardrail ?? null;

  const recordPaymentMutation = useMutation({
    mutationFn: () => {
      const dollars = Number(amountDollars);
      const amountCents = Math.round(dollars * 100);
      if (!Number.isFinite(dollars) || amountCents < DEARME_PAID_BETA_MIN_PAYMENT_CENTS) {
        throw new Error("Enter a paid amount of at least $1.");
      }
      return dearmeApi.recordPaidBetaPayment(companyId, {
        amountCents,
        currency: "USD",
        description,
        externalInvoiceId,
        occurredAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setPaymentError(null);
      setExternalInvoiceId("");
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.paidBetaAccess(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeSummary(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeEvents(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setPaymentError(err instanceof Error ? err.message : "Failed to record paid beta payment.");
    },
  });

  function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);
    recordPaymentMutation.mutate();
  }

  return (
    <DearMePanel aria-label="Paid beta access">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4" />
            Paid beta
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {entitlement?.summary ?? "Checking paid beta access."}
          </p>
        </div>
        <Badge variant={status?.status === "active" ? "default" : "secondary"}>
          {entitlement?.label ?? (isLoading ? "Checking access" : "Trial preview")}
        </Badge>
      </div>

      {isError ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load paid beta status."}
        </div>
      ) : null}

      {entitlement ? (
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium">{entitlement.nextActionLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">{entitlement.nextActionDescription}</p>
        </div>
      ) : null}

      {cycleGuardrail ? (
        <div className="mt-4 rounded-md border border-border bg-background px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4" />
                Cycle guardrail
              </div>
              <p className="mt-1 text-sm font-medium">{cycleGuardrail.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{cycleGuardrail.summary}</p>
            </div>
            <Badge
              variant={
                cycleGuardrail.state === "hard_stop"
                  ? "destructive"
                  : cycleGuardrail.state === "warning"
                    ? "outline"
                    : "secondary"
              }
            >
              {cycleGuardrail.label}
            </Badge>
          </div>
          {cycleGuardrail.decisionRequired && cycleGuardrail.decisionLabel ? (
            <p className="mt-3 text-sm font-medium text-foreground">
              Decision needed: {cycleGuardrail.decisionLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={CircleDollarSign} label="Lifetime paid" value={money(status?.lifetimePaidCents ?? 0)} />
        <Metric icon={Gauge} label="Remaining credit" value={money(status?.remainingCreditCents ?? 0)} />
        <Metric icon={Workflow} label="Month spend" value={money(cycleGuardrail?.spendCents ?? 0)} />
        <Metric icon={ShieldCheck} label="Monthly guardrail" value={money(cycleGuardrail?.budgetCents ?? 0)} />
        <Metric icon={FileText} label="Payments" value={status?.eventCount ?? 0} />
        <Metric icon={CheckCircle2} label="Latest receipt" value={paymentDate(status?.latestPaymentAt ?? null)} />
      </div>

      <form className="mt-5 grid gap-3 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleRecordPayment}>
        <div>
          <FieldLabel htmlFor="dearme-paid-beta-amount" label="Amount" />
          <div className="flex items-center rounded-md border border-input px-3">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="dearme-paid-beta-amount"
              type="number"
              min={1}
              step={1}
              value={amountDollars}
              className="border-0 shadow-none focus-visible:ring-0"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAmountDollars(event.target.value)}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="dearme-paid-beta-description" label="Receipt note" />
          <Input
            id="dearme-paid-beta-description"
            value={description}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="dearme-paid-beta-invoice" label="Invoice" />
          <Input
            id="dearme-paid-beta-invoice"
            value={externalInvoiceId}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setExternalInvoiceId(event.target.value)}
          />
        </div>
        <Button type="submit" className="self-end" disabled={recordPaymentMutation.isPending}>
          {recordPaymentMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Record payment
        </Button>
      </form>

      {paymentError ? (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {paymentError}
        </div>
      ) : null}
    </DearMePanel>
  );
}

function PrivateWorkPanel({
  companyId,
  decisionFocus,
  onOpenOutput,
  outputReviewState,
  onReviewOutput,
}: {
  companyId: string;
  decisionFocus: DearMeDecisionFocus | null;
  onOpenOutput: (output: DearMeOutputItem, intent?: DearMeReviewEntryIntent | null) => void;
  outputReviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const outputsQuery = useQuery({
    queryKey: queryKeys.dearme.outputs(companyId),
    queryFn: () => dearmeApi.getOutputs(companyId),
  });
  const outputs = outputsQuery.data?.outputs ?? [];
  const focusedOutput = decisionFocus
    ? outputs.find((output) => matchesOutputFocus(output, decisionFocus)) ?? null
    : null;

  return (
    <DearMePanel aria-label="Private work ready">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Work ready / Decisions needed
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Private work ready for review: reports, drafts, voice guidance, and portfolio work DearMe has prepared.
          </p>
        </div>
        {outputs.length > 0 ? <Badge variant="outline">{outputs.length} surfaces</Badge> : null}
      </div>

      {outputsQuery.isError ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {outputsQuery.error instanceof Error ? outputsQuery.error.message : "Failed to load DearMe outputs."}
        </div>
      ) : null}

      {outputsQuery.isLoading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-md border border-border bg-muted/40" />
          ))}
        </div>
      ) : outputs.length === 0 ? (
        <DearMeEmptyState
          className="mt-4"
          icon={Workflow}
          title="Private work has not started yet"
          description="Approve Brand OS to start the private team cycle."
        />
      ) : (
        <>
          {focusedOutput ? (
            <FocusedOutputPanel
              output={focusedOutput}
              entryIntent={decisionFocus?.intent ?? null}
              reviewState={outputReviewState}
              onReviewOutput={onReviewOutput}
            />
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {outputs.map((output) => {
              const preview = outputPreview(output);
              const details = output.details.slice(0, 3);
              const routeIntent = reviewLoopRouteIntent(output.reviewLoop);
              const footer = `Updated ${shortDate(output.updatedAt)}${
                output.documents.length > 0
                  ? ` / ${output.documents.length} private reference${output.documents.length === 1 ? "" : "s"}`
                  : ""
              }`;
              return (
                <DearMeActionCard
                  key={output.id}
                  className="flex min-h-44 flex-col p-4"
                  title={output.title}
                  summary={output.summary}
                  attention={outputActionAttention(output.status, output.reviewLoop)}
                  statusBadges={[
                    {
                      label: OUTPUT_STATUS_LABELS[output.status],
                      variant: outputStatusVariant(output.status),
                    },
                    {
                      label: reviewLoopLabel(output.reviewLoop),
                      variant: "outline",
                    },
                    {
                      label: reviewLoopStateLabel(output.reviewLoop),
                      variant: reviewLoopVariant(output.reviewLoop),
                    },
                    {
                      label: OUTPUT_KIND_LABELS[output.kind],
                      variant: "outline",
                    },
                  ]}
                  footer={footer}
                  action={{
                    label: privateWorkActionLabel(output),
                    onClick: () => onOpenOutput(output, routeIntent),
                    variant: output.isReviewable || routeIntent ? "default" : "outline",
                  }}
                >
                  {preview ? (
                    <p className="line-clamp-3 text-sm text-foreground/80">{preview}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Waiting for the first private draft.</p>
                  )}

                  <p className="mt-3 rounded-md border border-border bg-background/80 p-2 text-xs text-muted-foreground">
                    {output.reviewLoop.nextStep}
                  </p>

                  {details.length > 0 ? (
                    <dl className="mt-3 space-y-2 border-t border-border pt-3">
                      {details.map((detail) => (
                        <div key={`${output.id}:${detail.kind}`} className="grid gap-1">
                          <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
                          <dd className="line-clamp-2 text-sm text-foreground/85">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </DearMeActionCard>
              );
            })}
          </div>
        </>
      )}
    </DearMePanel>
  );
}

export function DearMeOnboarding() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<DearMeBrandBlueprintFormState>({
    ...DEFAULT_DEARME_BRAND_BLUEPRINT_FORM,
    displayName: selectedCompany?.name ?? "",
  });
  const [previewResult, setPreviewResult] = useState<DearMeBrandBlueprintPreviewResult | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [firstCycleIntent, setFirstCycleIntent] = useState("");
  const [firstCyclePreview, setFirstCyclePreview] = useState<DearMeFirstCyclePreviewResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingApprovalReview, setPendingApprovalReview] = useState<{
    approvalId: string;
    action: DearMeApprovalReviewAction;
  } | null>(null);
  const [pendingOutputReview, setPendingOutputReview] = useState<{
    outputId: string;
    action: DearMeOutputReviewAction;
  } | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "DearMe" }, { label: "Team" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!selectedCompany?.name || form.displayName.trim()) return;
    setForm((current) => ({ ...current, displayName: selectedCompany.name }));
  }, [form.displayName, selectedCompany?.name]);

  const currentSignature = useMemo(
    () => createDearMeBrandBlueprintSignature(form, selectedCompany?.name),
    [form, selectedCompany?.name],
  );
  const decisionFocus = useMemo(
    () => parseDearMeDecisionFocus(location.search),
    [location.search],
  );
  const previewMatchesForm = previewSignature === currentSignature;
  const paidBetaAccessQuery = useQuery({
    queryKey: queryKeys.dearme.paidBetaAccess(selectedCompanyId ?? "__none__"),
    queryFn: () => {
      if (!selectedCompanyId) throw new Error("Select a company first.");
      return dearmeApi.getPaidBetaAccess(selectedCompanyId);
    },
    enabled: !!selectedCompanyId,
  });
  const paidBetaStatus = paidBetaAccessQuery.data ?? null;
  const paidBetaEntitlement = paidBetaStatus?.entitlement ?? null;
  const canRequestPaidBetaWork = paidBetaEntitlement?.canRequestBrandOsApproval === true;

  function updateField<K extends keyof DearMeBrandBlueprintFormState>(
    key: K,
    value: DearMeBrandBlueprintFormState[K],
  ) {
    setActionError(null);
    setFirstCyclePreview(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const firstCycleMutation = useMutation({
    mutationFn: (input: {
      brand: ReturnType<typeof buildDearMeBrandBlueprintSeed>;
      nextForm: DearMeBrandBlueprintFormState;
    }) => {
      if (!selectedCompanyId) throw new Error("Select a company first.");
      return dearmeApi.previewFirstCycle(selectedCompanyId, {
        brand: input.brand,
      });
    },
    onSuccess: (result, input) => {
      setForm(input.nextForm);
      setFirstCyclePreview(result);
      setPreviewResult(null);
      setPreviewSignature(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to start the first cycle.");
    },
  });

  const previewMutation = useMutation({
    mutationFn: (input: { signature: string }) => {
      if (!selectedCompanyId) throw new Error("Select a company first.");
      return dearmeApi.previewBrandBlueprint(selectedCompanyId, {
        brand: buildDearMeBrandBlueprintSeed(form, selectedCompany?.name),
      });
    },
    onSuccess: (result, input) => {
      setPreviewResult(result);
      setPreviewSignature(input.signature);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to preview Brand OS.");
    },
  });

  const applyRequestMutation = useMutation({
    mutationFn: () => {
      if (!selectedCompanyId) throw new Error("Select a company first.");
      return dearmeApi.createBrandBlueprintApplyRequest(
        selectedCompanyId,
        buildDearMeBrandBlueprintApplyRequest(form, selectedCompany?.name),
      );
    },
    onSuccess: (result) => {
      if (selectedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(result.approval.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(selectedCompanyId) });
      }
      navigate(buildDearMeDecisionRoute({ approvalId: result.approval.id }));
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to request approval.");
    },
  });

  const approvalReviewMutation = useMutation({
    mutationFn: (input: {
      approvalId: string;
      action: DearMeApprovalReviewAction;
      decisionNote: string;
    }) => {
      const decisionNote = input.decisionNote.trim() || defaultDearMeDecisionNote(input.action);
      if (input.action === "approve") return approvalsApi.approve(input.approvalId, decisionNote);
      if (input.action === "reject") return approvalsApi.reject(input.approvalId, decisionNote);
      return approvalsApi.requestRevision(input.approvalId, decisionNote);
    },
    onMutate: (input) => {
      setActionError(null);
      setPendingApprovalReview({
        approvalId: input.approvalId,
        action: input.action,
      });
    },
    onSuccess: (approval) => {
      setActionError(null);
      if (selectedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId, "pending") });
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(approval.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.outputs(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(selectedCompanyId) });
      }
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to update the DearMe decision.");
    },
    onSettled: () => {
      setPendingApprovalReview(null);
    },
  });

  const outputReviewMutation = useMutation({
    mutationFn: (input: {
      outputId: string;
      action: DearMeOutputReviewAction;
      decisionNote: string;
    }) => {
      const decisionNote = input.decisionNote.trim() || defaultDearMeOutputReviewNote(input.action);
      if (!selectedCompanyId) throw new Error("Select a company first.");
      const continuationIntent = outputContinuationIntentForAction(input.action);
      if (continuationIntent) {
        return dearmeApi.continueOutput(selectedCompanyId, input.outputId, {
          intent: continuationIntent,
          decisionNote,
        });
      }
      return dearmeApi.reviewOutput(selectedCompanyId, input.outputId, {
        action: input.action,
        decisionNote,
      });
    },
    onMutate: (input) => {
      setActionError(null);
      setPendingOutputReview({
        outputId: input.outputId,
        action: input.action,
      });
    },
    onSuccess: (result) => {
      setActionError(null);
      if (selectedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.outputs(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(selectedCompanyId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(result.output.issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.activity(result.output.issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.workProducts(result.output.issueId) });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Failed to update the DearMe work.");
    },
    onSettled: () => {
      setPendingOutputReview(null);
    },
  });

  function handlePreview() {
    previewMutation.mutate({ signature: currentSignature });
  }

  function handleFirstCyclePreview() {
    const positioning = firstCycleIntent.trim() || form.positioning.trim();
    if (!positioning) {
      setActionError("Answer what you want to become known for before starting the first cycle.");
      return;
    }

    const nextForm = {
      ...form,
      positioning,
      goals: form.goals.trim()
        ? form.goals
        : `Become known for ${positioning}\nTurn proof of work into consistent content`,
    };
    firstCycleMutation.mutate({
      brand: buildDearMeBrandBlueprintSeed(nextForm, selectedCompany?.name),
      nextForm,
    });
  }

  function handleApplyRequest() {
    if (!previewResult || !previewMatchesForm) {
      setActionError("Refresh the preview before requesting approval.");
      return;
    }
    if (!canRequestPaidBetaWork) {
      setActionError(
        paidBetaEntitlement?.nextActionDescription ??
          "Paid beta access is required before starting private Brand OS work.",
      );
      return;
    }
    applyRequestMutation.mutate();
  }

  function handleOpenOutput(output: DearMeOutputItem, intent?: DearMeReviewEntryIntent | null) {
    navigate(
      buildDearMeDecisionRoute({
        issueReference: output.issueIdentifier ?? output.issueId,
        outputId: output.id,
        intent,
      }),
    );
  }

  function handleOpenIssue(issueReference: string) {
    navigate(buildDearMeDecisionRoute({ issueReference }));
  }

  function handleOpenWorkbenchWorkItem(
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) {
    navigate(buildDearMeDecisionRoute({ issueReference, outputId, intent }));
  }

  function handleOpenApproval(approvalId: string) {
    navigate(buildDearMeDecisionRoute({ approvalId }));
  }

  function handleReviewApproval(
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) {
    approvalReviewMutation.mutate({ approvalId, action, decisionNote });
  }

  function handleReviewOutput(
    outputId: string,
    action: DearMeOutputReviewAction,
    decisionNote: string,
  ) {
    outputReviewMutation.mutate({ outputId, action, decisionNote });
  }

  if (!selectedCompanyId) {
    return <p className="text-sm text-muted-foreground">Select a company first.</p>;
  }

  const requestDisabled =
    !previewResult ||
    !previewMatchesForm ||
    !canRequestPaidBetaWork ||
    previewMutation.isPending ||
    applyRequestMutation.isPending;

  return (
    <DearMePageShell>
      <DearMeHero
        eyebrow={
          <>
            <Sparkles className="h-4 w-4" />
            DearMe / Team workbench
          </>
        }
        title="Your personal brand growth team"
        description={
          <>
            Your personal brand growth team turns work, voice, proof, and relationships into posts,
            opportunities, portfolio updates, and weekly direction. You approve what represents you.
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending || applyRequestMutation.isPending}
            >
              {previewMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Preview Brand OS
            </Button>
            <Button
              type="button"
              onClick={handleApplyRequest}
              disabled={requestDisabled}
            >
              {applyRequestMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Request approval
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {actionError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {previewResult && previewMatchesForm && paidBetaEntitlement && !canRequestPaidBetaWork ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {paidBetaEntitlement.nextActionDescription}
        </div>
      ) : null}

      <TeamWorkbenchPanel
        companyId={selectedCompanyId}
        paidBetaActive={canRequestPaidBetaWork}
        decisionFocus={decisionFocus}
        onOpenApproval={handleOpenApproval}
        onOpenIssue={handleOpenIssue}
        onOpenWorkItem={handleOpenWorkbenchWorkItem}
        onReviewApproval={handleReviewApproval}
        reviewState={{
          approvalId: pendingApprovalReview?.approvalId ?? null,
          action: pendingApprovalReview?.action ?? null,
          isPending: approvalReviewMutation.isPending,
        }}
      />

      <FirstCyclePanel
        intent={firstCycleIntent}
        preview={firstCyclePreview}
        isPending={firstCycleMutation.isPending}
        onIntentChange={(value) => {
          setActionError(null);
          setFirstCycleIntent(value);
          setFirstCyclePreview(null);
        }}
        onPreview={handleFirstCyclePreview}
      />

      <PrivateWorkPanel
        companyId={selectedCompanyId}
        decisionFocus={decisionFocus}
        onOpenOutput={handleOpenOutput}
        outputReviewState={{
          outputId: pendingOutputReview?.outputId ?? null,
          action: pendingOutputReview?.action ?? null,
          isPending: outputReviewMutation.isPending,
        }}
        onReviewOutput={handleReviewOutput}
      />

      <PaidBetaAccessPanel
        companyId={selectedCompanyId}
        status={paidBetaStatus}
        isLoading={paidBetaAccessQuery.isLoading}
        isError={paidBetaAccessQuery.isError}
        error={paidBetaAccessQuery.error}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DearMePanel className="space-y-5" aria-label="Brand OS seed">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Tell the team what to grow
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with one sentence. What do you want to become known for?
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="dearme-display-name" label="Name" />
              <Input
                id="dearme-display-name"
                value={form.displayName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateField("displayName", event.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="dearme-budget" label="Monthly budget" />
              <div className="flex items-center rounded-md border border-input px-3">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="dearme-budget"
                  type="number"
                  min={0}
                  step={1}
                  value={form.budgetMonthlyDollars}
                  className="border-0 shadow-none focus-visible:ring-0"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateField("budgetMonthlyDollars", event.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <TextAreaField
            id="dearme-positioning"
            label="Positioning"
            value={form.positioning}
            rows={3}
            onChange={(value) => updateField("positioning", value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField
              id="dearme-goals"
              label="Goals"
              hint={FIELD_HELP.goals}
              value={form.goals}
              onChange={(value) => updateField("goals", value)}
            />
            <TextAreaField
              id="dearme-audiences"
              label="Audience"
              hint={FIELD_HELP.audiences}
              value={form.audiences}
              onChange={(value) => updateField("audiences", value)}
            />
            <TextAreaField
              id="dearme-proof"
              label="Proof"
              hint={FIELD_HELP.proofPoints}
              value={form.proofPoints}
              onChange={(value) => updateField("proofPoints", value)}
            />
            <TextAreaField
              id="dearme-offers"
              label="Offers"
              hint={FIELD_HELP.offers}
              value={form.offers}
              onChange={(value) => updateField("offers", value)}
            />
          </div>

          <TextAreaField
            id="dearme-voice"
            label="Voice samples"
            hint={FIELD_HELP.voiceSamples}
            value={form.voiceSamples}
            rows={4}
            onChange={(value) => updateField("voiceSamples", value)}
          />

          <TextAreaField
            id="dearme-constraints"
            label="Approval boundaries"
            hint={FIELD_HELP.constraints}
            value={form.constraints}
            onChange={(value) => updateField("constraints", value)}
          />

          <ChannelPicker
            selected={form.preferredChannels}
            onChange={(selected) => updateField("preferredChannels", selected)}
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <CadenceControl value={form.cadence} onChange={(value) => updateField("cadence", value)} />
            <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Auto-draft</p>
                <p className="text-xs text-muted-foreground">Private drafts only</p>
              </div>
              <ToggleSwitch
                checked={form.autoDraftEnabled}
                onCheckedChange={(checked) => updateField("autoDraftEnabled", checked)}
              />
            </div>
          </div>

          <TextAreaField
            id="dearme-approval-note"
            label="Approval note"
            value={form.approvalNote}
            rows={3}
            onChange={(value) => updateField("approvalNote", value)}
          />
        </DearMePanel>

        <PreviewPanel
          preview={previewResult}
          executionPlan={previewResult?.executionPlan ?? null}
          warnings={previewResult?.warnings ?? []}
          previewMatchesForm={previewMatchesForm}
        />
      </div>
    </DearMePageShell>
  );
}
