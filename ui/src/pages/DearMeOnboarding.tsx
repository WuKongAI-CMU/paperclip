import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEARME_BRAND_CADENCES,
  DEARME_BRAND_CHANNELS,
  DEARME_PAID_BETA_MIN_PAYMENT_CENTS,
  type DearMeBrandBlueprintExecutionPlan,
  type DearMeFirstCyclePreviewResponse,
  type DearMeOutputItem,
  type DearMeOutputReviewAction,
  type DearMeOutputStatus,
  type DearMePaidBetaStatus,
  type DearMeVoiceGateResult,
  type DearMeWorkbenchBatchDecision,
  type DearMeWorkbenchDecision,
  type DearMeWorkbenchWorkItem,
} from "@paperclipai/shared";
import { useLocation, useNavigate } from "@/lib/router";
import { approvalsApi } from "../api/approvals";
import { dearmeApi, type DearMeBrandBlueprintPreviewResult } from "../api/dearme";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
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

function buildDearMeDecisionRoute(params: {
  approvalId?: string;
  issueReference?: string;
  outputId?: string;
}): string {
  const search = new URLSearchParams({ view: "decisions" });
  if (params.approvalId) search.set("approval", params.approvalId);
  if (params.issueReference) search.set("issue", params.issueReference);
  if (params.outputId) search.set("output", params.outputId);
  return `/dearme?${search.toString()}`;
}

interface DearMeDecisionFocus {
  approvalId: string | null;
  issueReference: string | null;
  outputId: string | null;
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
  };
  if (!focus.approvalId && !focus.issueReference && !focus.outputId) return null;
  return focus;
}

function defaultDearMeDecisionNote(action: DearMeApprovalReviewAction) {
  if (action === "approve") return "Approved from DearMe. This represents me.";
  if (action === "reject") return "Rejected from DearMe. Do not move this forward.";
  return "Please revise this from DearMe before moving forward.";
}

function defaultDearMeOutputReviewNote(action: DearMeOutputReviewAction) {
  if (action === "approve") return "Approved from DearMe. This prepared work represents me.";
  if (action === "request_changes") return "Please revise this from DearMe before review.";
  return "Please prepare a new version of this DearMe work for review.";
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

const WORKSTREAM_STATUS_LABELS = {
  working: "Working",
  ready_for_review: "Ready for review",
  complete: "Complete",
  blocked: "Needs attention",
  cancelled: "Cancelled",
  decision_needed: "Needs your call",
  recorded: "Recorded",
} as const;

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
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {gate.checks.map((check) => (
          <article key={check.kind} className="rounded-md border border-border px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{check.label}</p>
              <Badge variant={voiceGateCheckVariant(check.status)}>{roleLabel(check.status)}</Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{check.summary}</p>
          </article>
        ))}
      </div>
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
      <div className="rounded-lg border border-border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Your personal brand growth team
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Team visible, machinery hidden. DearMe prepares the moves; you approve what represents you.
            </p>
          </div>
          <Badge variant={paidBetaActive ? "default" : "secondary"}>{statusLabel}</Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {TEAM_WORKSTREAM.map((item) => (
            <article key={item.role} className="rounded-md border border-border px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.role}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.action}</p>
                </div>
                <Badge variant="outline">{item.artifact}</Badge>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4" />
          Work ready / Decisions needed
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No publishing, sending, deploying, or spending happens without approval by default.
        </p>
        <div className="mt-4 space-y-2">
          {FIRST_CYCLE_ARTIFACTS.map((artifact) => (
            <div key={artifact} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{artifact}</span>
            </div>
          ))}
        </div>
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
    <section className="rounded-lg border border-border p-5" aria-label="90-second first cycle">
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
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {FIRST_CYCLE_ARTIFACTS.map((artifact) => (
              <div key={artifact} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{artifact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {preview ? (
        <div className="mt-5 space-y-4">
          <section className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{preview.voiceProfile.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{preview.voiceProfile.guidance}</p>
              </div>
              <Badge variant={preview.voiceProfile.status === "ready_for_gate" ? "default" : "secondary"}>
                {preview.voiceProfile.status === "ready_for_gate" ? "Voice ready" : "Needs samples"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.voiceProfile.draftTone.map((tone) => (
                <Badge key={tone} variant="outline">{tone}</Badge>
              ))}
            </div>
          </section>

          <VoiceGatePanel gate={preview.voiceGate} />

          <section className="grid gap-3 lg:grid-cols-3">
            {preview.starterPosts.map((post) => (
              <article key={post.id} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{post.title}</p>
                  <Badge variant="outline">{CHANNEL_LABELS[post.channel]}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground/80">{post.hook}</p>
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{post.body}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Opportunity lead
              </div>
              <p className="mt-2 text-sm text-foreground/80">{preview.opportunityLead.title}</p>
              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{preview.opportunityLead.draftMessage}</p>
            </article>
            <article className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Portfolio proof card
              </div>
              <p className="mt-2 text-sm text-foreground/80">{preview.portfolioProofCard.placement}</p>
              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{preview.portfolioProofCard.proposedCopy}</p>
            </article>
            <article className="rounded-md border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gauge className="h-4 w-4" />
                First growth plan
              </div>
              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{preview.growthPlan.summary}</p>
            </article>
          </section>

          {preview.warnings.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              {preview.warnings[0]}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function workItemTarget(item: DearMeWorkbenchWorkItem) {
  return item.issueIdentifier ?? item.issueId;
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
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem) => void;
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
      <section className="rounded-lg border border-primary/30 bg-primary/5 p-5" aria-label="Focused decision">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Decision focused
            </div>
            <h2 className="mt-2 text-xl font-semibold">{decision.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{decision.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={decision.riskGate ? "secondary" : "outline"}>
              {decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Approval"}
            </Badge>
            <Badge variant="outline">Updated {shortDate(decision.updatedAt)}</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Prepared work</p>
            <p className="mt-1 text-sm">
              {decision.outputKind ? OUTPUT_KIND_LABELS[decision.outputKind] : "Brand OS approval"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">State</p>
            <p className="mt-1 text-sm">{decision.status === "pending" ? "Waiting for your call" : "Ready for review"}</p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Trust boundary</p>
            <p className="mt-1 text-sm">Nothing public happens without approval.</p>
          </div>
        </div>
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
      </section>
    );
  }

  if (batch) {
    return (
      <section className="rounded-lg border border-primary/30 bg-primary/5 p-5" aria-label="Focused decision">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Decision focused
            </div>
            <h2 className="mt-2 text-xl font-semibold">{batch.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{batch.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={batch.riskGate ? "secondary" : "outline"}>
              {batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review"}
            </Badge>
            <Badge variant="outline">
              {batch.itemCount} item{batch.itemCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
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
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => onOpenBatch(batch)}>
            {batch.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  if (workItem) {
    return (
      <section className="rounded-lg border border-primary/30 bg-primary/5 p-5" aria-label="Focused decision">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Work focused
            </div>
            <h2 className="mt-2 text-xl font-semibold">{workItem.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{workItem.summary}</p>
          </div>
          <Badge variant={outputStatusVariant(workItem.status)}>
            {OUTPUT_STATUS_LABELS[workItem.status]}
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Prepared by {roleLabel(workItem.ownerRole)}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenWorkItem(workItem)}>
            Review prepared work
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-dashed border-border p-5" aria-label="Focused decision">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4" />
        Decision focus unavailable
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The selected item is no longer waiting here. The current decision queue is still below.
      </p>
    </section>
  );
}

function FocusedOutputPanel({
  output,
  reviewState,
  onReviewOutput,
}: {
  output: DearMeOutputItem;
  reviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const preview = outputPreview(output);
  const details = output.details.slice(0, 4);
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
    <article className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-5" aria-label="Focused work">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Focused work
          </div>
          <h2 className="mt-2 text-xl font-semibold">{output.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{output.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{OUTPUT_KIND_LABELS[output.kind]}</Badge>
          <Badge variant={outputStatusVariant(output.status)}>
            {OUTPUT_STATUS_LABELS[output.status]}
          </Badge>
        </div>
      </div>

      {preview ? (
        <p className="mt-4 rounded-md border border-border bg-background/80 p-3 text-sm text-foreground/85">
          {preview}
        </p>
      ) : null}

      {details.length > 0 ? (
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <div key={`${output.id}:focused:${detail.kind}`} className="rounded-md border border-border bg-background/80 p-3">
              <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
              <dd className="mt-1 text-sm text-foreground/85">{detail.value}</dd>
            </div>
          ))}
        </dl>
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
            Regenerate
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Updated {shortDate(output.updatedAt)}</span>
        <span>
          {output.documents.length} doc{output.documents.length === 1 ? "" : "s"} prepared privately
        </span>
      </div>
    </article>
  );
}

function TeamWorkbenchPanel({
  companyId,
  paidBetaActive,
  decisionFocus,
  onOpenApproval,
  onOpenIssue,
  onReviewApproval,
  reviewState,
}: {
  companyId: string;
  paidBetaActive: boolean;
  decisionFocus: DearMeDecisionFocus | null;
  onOpenApproval: (approvalId: string) => void;
  onOpenIssue: (issueReference: string) => void;
  onReviewApproval: (
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) => void;
  reviewState: DearMeApprovalReviewState;
}) {
  const workbenchQuery = useQuery({
    queryKey: queryKeys.dearme.workbench(companyId),
    queryFn: () => dearmeApi.getWorkbench(companyId),
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
  const hasTeam = workbench.team.length > 0;
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

  function openWorkItem(item: DearMeWorkbenchWorkItem) {
    const issueReference = workItemTarget(item);
    if (issueReference) onOpenIssue(issueReference);
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

      <div className="rounded-lg border border-border p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              My AI team today
            </div>
            <h2 className="mt-2 text-xl font-semibold">{workbench.headline}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{workbench.summary}</p>
          </div>
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Working now" : "Private work locked"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Team" value={workbench.team.length} />
          <Metric icon={FileText} label="Work ready" value={workbench.workReady.length} />
          <Metric icon={ShieldCheck} label="Decisions" value={workbench.decisionsNeeded.length} />
          <Metric icon={Workflow} label="In motion" value={workbench.activeWork.length} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <section className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Team at work
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {hasTeam
              ? workbench.team.map((member, index) => (
                  <article key={`${member.role}:${index}`} className="rounded-md border border-border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{member.currentFocus}</p>
                      </div>
                      <Badge variant="outline">{member.status}</Badge>
                    </div>
                  </article>
                ))
              : TEAM_WORKSTREAM.slice(0, 4).map((item) => (
                  <article key={item.role} className="rounded-md border border-dashed border-border px-3 py-3">
                    <p className="text-sm font-medium">{item.role}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.action}</p>
                  </article>
                ))}
          </div>
        </section>

        <section className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Approval gate
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your team prepares posts, pages, outreach, and opportunity moves. You approve what represents you.
          </p>
          {workbench.report ? (
            <article className="mt-4 rounded-md border border-border px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{workbench.report.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{workbench.report.summary}</p>
                </div>
                <Badge variant={outputStatusVariant(workbench.report.status)}>
                  {OUTPUT_STATUS_LABELS[workbench.report.status]}
                </Badge>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{workbench.report.bodyPreview}</p>
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenIssue(workbench.report!.issueIdentifier ?? workbench.report!.issueId)}
                >
                  Open report
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              The first Dear me report appears here after the growth loop starts.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Decisions needed
          </div>
          {batches.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Batch decisions</p>
              {batches.map((batch) => (
                <article key={batch.id} className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{batch.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{batch.summary}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={batch.riskGate ? "secondary" : "outline"}>
                        {batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {batch.itemCount} item{batch.itemCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Updated {shortDate(batch.updatedAt)}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openBatch(batch)}
                      disabled={batch.approvalIds.length === 0 && batch.issueIds.length === 0}
                    >
                      {batch.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {decisions.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              No high-leverage decision is waiting right now.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {batches.length > 0 ? (
                <p className="text-xs font-medium text-muted-foreground">Individual decisions</p>
              ) : null}
              {decisions.map((decision) => (
                <article key={decision.id} className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{decision.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{decision.summary}</p>
                    </div>
                    <Badge variant={decision.riskGate ? "secondary" : "outline"}>
                      {decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Approval"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Updated {shortDate(decision.updatedAt)}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openDecision(decision)}
                      disabled={!decision.approvalId && !decision.issueIdentifier && !decision.issueId}
                    >
                      {decision.approvalId ? "Approve" : "Review"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Work ready
          </div>
          {readyItems.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              Nothing is ready for review yet. The active lanes below show what is moving.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {readyItems.map((item) => {
                const issueReference = workItemTarget(item);
                return (
                  <article key={item.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                      </div>
                      <Badge variant="outline">{OUTPUT_KIND_LABELS[item.outputKind ?? "brand_os"]}</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">Prepared by {roleLabel(item.ownerRole)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => issueReference && onOpenIssue(issueReference)}
                        disabled={!issueReference}
                      >
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {liveStream.length > 0 ? (
        <section className="rounded-lg border border-border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Workflow className="h-4 w-4" />
                Live team feed
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Watch the team turn private work into reviewable moves. The machinery stays backstage.
              </p>
            </div>
            <Badge variant="outline">While you were away</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {liveStream.map((item) => (
              <article key={item.id} className="rounded-md border border-border px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{roleLabel(item.role)}</p>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                  </div>
                  <Badge variant={item.needsApproval ? "secondary" : "outline"}>
                    {WORKSTREAM_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{item.artifact}</Badge>
                  {item.needsApproval ? <Badge variant="default">Decision ready</Badge> : null}
                  <span>{shortDate(item.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
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
      <section className="min-h-[360px] rounded-lg border border-dashed border-border p-5">
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">First cycle preview</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Preview shows the team, first-cycle artifacts, budget, memory seeds, and approval gates before anything is applied.
          </p>
        </div>
      </section>
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
              <div key={`${member.role}:${index}`} className="rounded-md border border-border px-3 py-3">
                <p className="text-sm font-medium">{member.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{member.mission}</p>
              </div>
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
              <div key={cycle.id} className="rounded-md border border-border px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{cycle.title}</p>
                  <Badge variant="outline">{CADENCE_LABELS[cycle.cadence]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{roleLabel(cycle.ownerRole)}</p>
              </div>
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
            <div
              key={operation.id}
              className="grid gap-2 rounded-md border border-border px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div>
                <p className="text-sm font-medium">{operation.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{operation.description}</p>
              </div>
              {operation.approvalGate ? <Badge variant="secondary">{roleLabel(operation.approvalGate)}</Badge> : null}
            </div>
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
    <section className="rounded-lg border border-border p-5" aria-label="Paid beta access">
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CircleDollarSign} label="Lifetime paid" value={money(status?.lifetimePaidCents ?? 0)} />
        <Metric icon={Gauge} label="Remaining credit" value={money(status?.remainingCreditCents ?? 0)} />
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
    </section>
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
  onOpenOutput: (output: DearMeOutputItem) => void;
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
    <section className="rounded-lg border border-border p-5" aria-label="Private work ready">
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
        <div className="mt-4 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          Approve Brand OS to start the private team loop.
        </div>
      ) : (
        <>
          {focusedOutput ? (
            <FocusedOutputPanel
              output={focusedOutput}
              reviewState={outputReviewState}
              onReviewOutput={onReviewOutput}
            />
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {outputs.map((output) => {
              const preview = outputPreview(output);
              const details = output.details.slice(0, 3);
              return (
                <article key={output.id} className="flex min-h-44 flex-col rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{output.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{output.summary}</p>
                    </div>
                    <Badge variant={outputStatusVariant(output.status)}>
                      {OUTPUT_STATUS_LABELS[output.status]}
                    </Badge>
                  </div>

                  {preview ? (
                    <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{preview}</p>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Waiting for the first private draft.</p>
                  )}

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

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div className="text-xs text-muted-foreground">
                      Updated {shortDate(output.updatedAt)}
                      {output.documents.length > 0 ? ` / ${output.documents.length} doc${output.documents.length === 1 ? "" : "s"}` : ""}
                    </div>
                    <Button
                      type="button"
                      variant={output.isReviewable ? "default" : "outline"}
                      size="sm"
                      onClick={() => onOpenOutput(output)}
                    >
                      {output.isReviewable ? "Review" : "Open"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
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

  function handleOpenOutput(output: DearMeOutputItem) {
    navigate(
      buildDearMeDecisionRoute({
        issueReference: output.issueIdentifier ?? output.issueId,
        outputId: output.id,
      }),
    );
  }

  function handleOpenIssue(issueReference: string) {
    navigate(buildDearMeDecisionRoute({ issueReference }));
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
    <div className="space-y-6">
      <header className="rounded-lg border border-border bg-muted/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              DearMe / Team workbench
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Your personal brand growth team</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your personal brand growth team turns work, voice, proof, and relationships into posts,
              opportunities, portfolio updates, and weekly direction. You approve what represents you.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </header>

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

      <TeamWorkbenchPanel
        companyId={selectedCompanyId}
        paidBetaActive={canRequestPaidBetaWork}
        decisionFocus={decisionFocus}
        onOpenApproval={handleOpenApproval}
        onOpenIssue={handleOpenIssue}
        onReviewApproval={handleReviewApproval}
        reviewState={{
          approvalId: pendingApprovalReview?.approvalId ?? null,
          action: pendingApprovalReview?.action ?? null,
          isPending: approvalReviewMutation.isPending,
        }}
      />

      <PaidBetaAccessPanel
        companyId={selectedCompanyId}
        status={paidBetaStatus}
        isLoading={paidBetaAccessQuery.isLoading}
        isError={paidBetaAccessQuery.isError}
        error={paidBetaAccessQuery.error}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-5 rounded-lg border border-border p-5" aria-label="Brand OS seed">
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
        </section>

        <PreviewPanel
          preview={previewResult}
          executionPlan={previewResult?.executionPlan ?? null}
          warnings={previewResult?.warnings ?? []}
          previewMatchesForm={previewMatchesForm}
        />
      </div>
    </div>
  );
}
