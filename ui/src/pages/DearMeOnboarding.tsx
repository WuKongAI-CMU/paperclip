import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEARME_BRAND_CADENCES,
  DEARME_BRAND_CHANNELS,
  DEARME_FIRST_CYCLE_STARTER_POST_COUNT,
  DEARME_MEMORY_SOURCE_INPUT_MODES,
  DEARME_MEMORY_UPDATE_KINDS,
  DEARME_PAID_BETA_MIN_PAYMENT_CENTS,
  DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN,
  DEARME_LAUNCH_PROOF_GAP_ITEMS,
  DEARME_LAUNCH_PROOF_HANDOFF_STEPS,
  DEARME_OWNER_PROOF_CHECKLIST_ITEMS,
  DEARME_OWNER_PROOF_FACT_SPECS,
  DEARME_OWNER_PROOF_REPLY_TEMPLATE,
  buildDearMeOwnerProofHandoffReceipt,
  createDearMeFirstCyclePreview,
  dearMeCustomerSafeText,
  dearMeWorkbenchResponseSchema,
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
  type DearMeOutputDetail,
  type DearMeOutputItem,
  type DearMeOutputsResponse,
  type DearMeOutputReviewAction,
  type DearMeOutputReviewLoop,
  type DearMeOutputStatus,
  type DearMePaidBetaCohortSummary,
  type DearMePaidBetaStatus,
  type DearMeVoiceGateResult,
  type DearMeWorkbenchBatchDecision,
  type DearMeWorkbenchDecision,
  type DearMeWorkbenchMemory,
  type DearMeWorkbenchProgressItem,
  type DearMeWorkbenchReport,
  type DearMeWorkbenchResponse,
  type DearMeWorkbenchRunLedgerEntry,
  type DearMeWorkbenchStreamItem,
  type DearMeWorkbenchTeamMember,
  type DearMeWorkbenchWorkItem,
} from "@paperclipai/shared";
import { useLocation, useNavigate } from "@/lib/router";
import { approvalsApi } from "../api/approvals";
import {
  dearmeApi,
  dearmeWorkbenchRefreshEventTypes,
  type DearMeBrandBlueprintPreviewResult,
} from "../api/dearme";
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
import {
  DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME,
  downloadDearMeOwnerProofHandoffReceipt,
  downloadDearMeReceipt,
} from "../lib/dearme-receipt-download";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import {
  buildDearMeSitePreviewPath,
  withDearMeFirstCycleRuntimeDefaults,
  writeDearMeFirstCyclePreview,
} from "../lib/dearme-site-preview";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Download,
  ExternalLink,
  FileText,
  Gauge,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Telescope,
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

const DEARME_LIVE_PROOF_FEED_ID = "dearme-live-proof-feed";
const DEARME_EMPTY_WEEK_RECOVERY_ID = "dearme-empty-week-recovery";
const DEARME_SUPPORT_HANDOFF_ID = "dearme-support-handoff";
const DEARME_PAID_BETA_ACCESS_ID = "dearme-paid-beta-access";
const DEARME_CHIEF_OF_STAFF_RECENT_CONTROLS_STORAGE_PREFIX = "dearme:chief-of-staff-recent-controls";
const DEARME_CHIEF_OF_STAFF_RECENT_CONTROLS_MAX = 3;
const DEARME_LAUNCH_PROOF_DETAIL_STORAGE_PREFIX = "dearme:launch-proof-details";
const DEARME_CHIEF_OF_STAFF_BRIEF_RECEIPT_FILENAME = "chief-of-staff-brief-receipt.txt";
const DEARME_BEFORE_LAUNCH_CHECKS_RECEIPT_FILENAME = "before-launch-checks-receipt.txt";
const DEARME_AFTER_CALL_OUTCOME_RECEIPT_FILENAME = "after-call-outcome-receipt.txt";
const DEARME_LAUNCH_READINESS_RECEIPT_FILENAME = "launch-readiness-receipt.txt";
const DEARME_COMMERCIAL_READINESS_RECEIPT_FILENAME = "commercial-readiness-receipt.txt";
const DEARME_PAID_BETA_OPERATING_RECEIPT_FILENAME = "paid-beta-operating-receipt.txt";
const DEARME_PAID_BETA_CUSTOMER_RECEIPT_FILENAME = "paid-beta-customer-receipt.txt";
const DEARME_PAID_BETA_WELCOME_PLAN_RECEIPT_FILENAME = "paid-beta-welcome-plan-receipt.txt";
const DEARME_PAID_BETA_CLOSE_KIT_RECEIPT_FILENAME = "paid-beta-close-kit-receipt.txt";
const DEARME_PAID_BETA_PAYMENT_PATH_RECEIPT_FILENAME = "paid-beta-payment-path-receipt.txt";
const DEARME_EMPTY_WEEK_RECOVERY_RECEIPT_FILENAME = "empty-week-recovery-receipt.txt";
const DEARME_AUTONOMY_CONTRACT_RECEIPT_FILENAME = "autonomy-contract-receipt.txt";
const DEARME_PAID_USER_OPERATIONS_RECEIPT_FILENAME = "paid-user-operations-receipt.txt";
const DEARME_SUPPORT_HANDOFF_RECEIPT_FILENAME = "paid-user-support-handoff-receipt.txt";
const DEARME_FEEDBACK_LEARNING_RECEIPT_FILENAME = "feedback-learning-receipt.txt";
const DEARME_PAID_COHORT_HEALTH_RECEIPT_FILENAME = "paid-cohort-health-receipt.txt";
const DEARME_PAID_ACCOUNT_HEALTH_RECEIPT_FILENAME = "paid-account-health-receipt.txt";
const DEARME_PAID_RETENTION_PULSE_RECEIPT_FILENAME = "paid-retention-pulse-receipt.txt";
const DEARME_NEXT_CYCLE_RETENTION_RECEIPT_FILENAME = "next-cycle-retention-receipt.txt";
const DEARME_WEEKLY_VALUE_RECEIPT_FILENAME = "weekly-value-receipt.txt";
const DEARME_VOICE_MEMORY_RECEIPT_FILENAME = "voice-memory-receipt.txt";
const DEARME_FIRST_CYCLE_START_RECEIPT_FILENAME = "first-cycle-start-receipt.txt";

type DearMeChiefOfStaffRecentBrief = {
  id: string;
  intent: DearMeChiefOfStaffMessageIntent;
  label: string;
  message: string;
};

function chiefOfStaffBriefPreview(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 48) return normalized;
  return `${normalized.slice(0, 45).trim()}...`;
}

function chiefOfStaffRecentBriefFromControl(
  control: (typeof CHIEF_OF_STAFF_CYCLE_CONTROLS)[number],
): DearMeChiefOfStaffRecentBrief {
  return {
    id: control.id,
    intent: control.intent,
    label: control.label,
    message: control.message,
  };
}

function chiefOfStaffRecentBriefFromMessage(
  intent: DearMeChiefOfStaffMessageIntent,
  message: string,
): DearMeChiefOfStaffRecentBrief {
  const intentLabel =
    CHIEF_OF_STAFF_INTENT_OPTIONS.find((option) => option.value === intent)?.label ?? "Brief";

  return {
    id: `${intent}:${message}`,
    intent,
    label: `${intentLabel}: ${chiefOfStaffBriefPreview(message)}`,
    message,
  };
}

function isDearMeChiefOfStaffRecentBrief(value: unknown): value is DearMeChiefOfStaffRecentBrief {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DearMeChiefOfStaffRecentBrief>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.message === "string" &&
    CHIEF_OF_STAFF_INTENT_OPTIONS.some((option) => option.value === candidate.intent)
  );
}

function dearMeChiefOfStaffRecentControlsKey(companyId: string) {
  return `${DEARME_CHIEF_OF_STAFF_RECENT_CONTROLS_STORAGE_PREFIX}:${companyId}`;
}

function readDearMeChiefOfStaffRecentControls(companyId: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(dearMeChiefOfStaffRecentControlsKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(CHIEF_OF_STAFF_CYCLE_CONTROLS.map((control) => control.id));
    return parsed
      .map((item): DearMeChiefOfStaffRecentBrief | null => {
        if (typeof item === "string" && validIds.has(item)) {
          const control = CHIEF_OF_STAFF_CYCLE_CONTROLS.find((option) => option.id === item);
          return control ? chiefOfStaffRecentBriefFromControl(control) : null;
        }
        if (isDearMeChiefOfStaffRecentBrief(item)) {
          return {
            id: item.id,
            intent: item.intent,
            label: item.label,
            message: item.message,
          };
        }
        return null;
      })
      .filter((item): item is DearMeChiefOfStaffRecentBrief => Boolean(item))
      .slice(0, DEARME_CHIEF_OF_STAFF_RECENT_CONTROLS_MAX);
  } catch {
    return [];
  }
}

function writeDearMeChiefOfStaffRecentControls(companyId: string, items: DearMeChiefOfStaffRecentBrief[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(dearMeChiefOfStaffRecentControlsKey(companyId), JSON.stringify(items));
  } catch {
    // Recent shortcuts are a convenience only; the core brief still works.
  }
}

function scrollToDearMeLiveProofFeed() {
  if (typeof document === "undefined") return;

  document.getElementById(DEARME_LIVE_PROOF_FEED_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function scrollToDearMeEmptyWeekRecovery() {
  if (typeof document === "undefined") return;

  const target = document.getElementById(DEARME_EMPTY_WEEK_RECOVERY_ID);
  if (!target) return;

  if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
    const url = new URL(window.location.href);
    url.hash = DEARME_EMPTY_WEEK_RECOVERY_ID;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function scrollToDearMeSupportHandoff() {
  if (typeof document === "undefined") return;

  const target = document.getElementById(DEARME_SUPPORT_HANDOFF_ID);
  if (!target) return;

  if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
    const url = new URL(window.location.href);
    url.hash = DEARME_SUPPORT_HANDOFF_ID;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function canUseDearMeSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function buildDearMeLaunchProofDetailStorageKey(companyId: string) {
  return `${DEARME_LAUNCH_PROOF_DETAIL_STORAGE_PREFIX}:${companyId}`;
}

function chiefOfStaffBriefReceiptText(result: DearMeChiefOfStaffMessageResult) {
  return [
    "DearMe Chief of Staff brief receipt",
    "",
    `Status: ${result.status === "queued" ? "Brief accepted" : "Brief saved"}`,
    `Work: ${result.title}`,
    `Next: ${result.nextStep}`,
    "Boundary: DearMe can keep preparing brand work privately; publishing, sending, spending, and public claims still come back for a launch call.",
  ].join("\n");
}

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
    helper: "Turn proof and point of view into launch-ready drafts.",
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
  {
    value: "handle_feedback",
    label: "Handle feedback",
    helper: "Turn feedback or support notes into learning and the next move.",
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
      "Focus this week on the highest-leverage personal-brand move. Choose three work items, explain why they matter, and prepare the launch boundary for anything external.",
    icon: Gauge,
  },
  {
    id: "prepare_content_batch",
    intent: "draft_content",
    label: "Prepare content batch",
    helper: "Turn proof into reviewable drafts.",
    message:
      "Turn my latest proof and point of view into a small content batch. Keep it in my voice and separate the launch-ready pieces from anything that needs a boundary.",
    icon: FileText,
  },
  {
    id: "scout_opportunities",
    intent: "find_opportunities",
    label: "Scout opportunities",
    helper: "Find leads and draft outreach.",
    message:
      "Find practical opportunities I can act on this week: customers, collaborators, podcasts, jobs, or warm introductions. Prepare outreach drafts and stage them behind the launch boundary.",
    icon: Sparkles,
  },
  {
    id: "refresh_public_proof",
    intent: "refresh_portfolio",
    label: "Refresh public proof",
    helper: "Package recent work for launch.",
    message:
      "Turn recent work into a portfolio or bio update and a proof card. Make it launch-ready and call out the public wording boundary.",
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
  {
    id: "handle_feedback",
    intent: "handle_feedback",
    label: "Handle feedback",
    helper: "Triage support notes and learn.",
    message:
      "Triage this feedback or support note. Decide what DearMe should learn, what should change in the next brand cycle, and what recovery or follow-up move should be prepared for review.",
    icon: LifeBuoy,
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

type DearMePageView =
  | "home"
  | "decisions"
  | "work-ready"
  | "voice"
  | "brand-os"
  | "content"
  | "opportunities"
  | "portfolio"
  | "reports";

const DEARME_PAGE_VIEWS = new Set<DearMePageView>([
  "decisions",
  "work-ready",
  "voice",
  "brand-os",
  "content",
  "opportunities",
  "portfolio",
  "reports",
]);

function parseDearMePageView(search: string): DearMePageView {
  const view = new URLSearchParams(search).get("view");
  if (!view) return "home";
  return DEARME_PAGE_VIEWS.has(view as DearMePageView) ? (view as DearMePageView) : "home";
}

function buildDearMeDecisionRoute(params: {
  approvalId?: string;
  issueReference?: string;
  outputId?: string;
  intent?: DearMeReviewEntryIntent | null;
  preserveSearch?: string;
}): string {
  const search = new URLSearchParams(params.preserveSearch ?? "");
  search.set("view", "decisions");
  ["approval", "work", "artifact", "issue", "output", "intent"].forEach((key) => search.delete(key));
  if (params.approvalId) search.set("approval", params.approvalId);
  if (params.issueReference) search.set("work", params.issueReference);
  if (params.outputId) search.set("artifact", params.outputId);
  if (params.intent && params.intent !== "review") search.set("intent", params.intent);
  return `/dearme?${search.toString()}`;
}

function buildDearMeWorkReadyRoute(preserveSearch?: string): string {
  const search = new URLSearchParams(preserveSearch ?? "");
  search.set("view", "brand-os");
  ["approval", "work", "artifact", "issue", "output", "intent"].forEach((key) => search.delete(key));
  return `/dearme?${search.toString()}#dearme-work-ready`;
}

function buildDearMeDecisionsReadyRoute(preserveSearch?: string): string {
  return `${buildDearMeDecisionRoute({ preserveSearch })}#dearme-decisions-needed`;
}

function buildDearMeVoiceMemoryRoute(preserveSearch?: string): string {
  const search = new URLSearchParams(preserveSearch ?? "");
  search.set("view", "voice");
  ["approval", "work", "artifact", "issue", "output", "intent"].forEach((key) => search.delete(key));
  return `/dearme?${search.toString()}#dearme-voice-memory`;
}

function buildDearMePaidBetaAccessRoute(preserveSearch?: string, companyPrefix?: string | null): string {
  const search = new URLSearchParams(preserveSearch ?? "");
  search.set("view", "brand-os");
  ["approval", "work", "artifact", "issue", "output", "intent"].forEach((key) => search.delete(key));
  const basePath = companyPrefix ? `/${companyPrefix}/dearme` : "/dearme";
  return `${basePath}?${search.toString()}#${DEARME_PAID_BETA_ACCESS_ID}`;
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

interface DearMeLiveTeamPulse {
  title: string;
  description: string;
  emittedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordString(value: Record<string, unknown> | null, key: string): string | null {
  const text = value?.[key];
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

function livePulseText(text: string): string {
  return dearMeCustomerSafeText(
    customerProofPackSummary(text),
    "DearMe is preparing the next update.",
    260,
  );
}

const DEARME_PROFILE_REQUIRED_MESSAGE = "Choose a DearMe profile first.";

function dearMeCustomerErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (DEARME_CUSTOMER_HIDDEN_LANGUAGE_PATTERN.test(message)) return fallback;
  return message;
}

function firstPayloadText(payload: Record<string, unknown> | null, keys: string[]): string | null {
  for (const key of keys) {
    const text = recordString(payload, key);
    if (text) return livePulseText(text);
  }
  return null;
}

function parseDearMeWorkbenchSyncEvent(event: Event): DearMeWorkbenchResponse | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== "string") return null;

  try {
    const parsed = JSON.parse(event.data) as unknown;
    const payload = isRecord(parsed) ? parsed.payload : null;
    const workbench = isRecord(payload) ? payload.workbench : null;
    const result = dearMeWorkbenchResponseSchema.safeParse(workbench);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function parseDearMeLiveTeamPulseEvent(event: Event): DearMeLiveTeamPulse | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== "string") return null;

  try {
    const parsed = JSON.parse(event.data) as unknown;
    if (!isRecord(parsed) || typeof parsed.type !== "string") return null;
    const payload = isRecord(parsed.payload) ? parsed.payload : null;
    const emittedAt = recordString(parsed, "emittedAt");
    const description =
      firstPayloadText(payload, ["message", "summary", "reason", "description", "nextStep"]) ??
      "Your team is moving brand work forward.";

    switch (parsed.type) {
      case "task_created":
        return {
          title: "New brand work started",
          description,
          emittedAt,
        };
      case "task_updated":
        return {
          title: "Brand work moved forward",
          description,
          emittedAt,
        };
      case "agent_completed":
        return {
          title: "A teammate finished a proof pass",
          description,
          emittedAt,
        };
      case "work_loop_transition": {
        const to = recordString(payload, "to");
        return {
          title: to ? `Brand work moved to ${livePulseText(to)}` : "Brand work moved forward",
          description,
          emittedAt,
        };
      }
      case "approval_pending":
        return {
          title: "Launch call is ready",
          description,
          emittedAt,
        };
      case "approval_resolved":
        return {
          title: "Launch call recorded",
          description,
          emittedAt,
        };
      case "voice_gate_scored": {
        const passed = payload?.passed === true;
        const score = typeof payload?.score === "number" ? payload.score : null;
        return {
          title: passed ? "Voice check passed" : "Voice check needs another pass",
          description: score === null ? description : `Voice fit ${score}/100. ${description}`,
          emittedAt,
        };
      }
      case "channel_action_fired":
        return {
          title: "Launched action moved",
          description,
          emittedAt,
        };
      case "cost_recorded":
        return {
          title: "Spend checkpoint recorded",
          description,
          emittedAt,
        };
      case "openclaw_lifecycle": {
        const phase = recordString(payload, "phase");
        return {
          title:
            phase === "error"
              ? "Proof pass needs attention"
              : phase === "end" || phase === "completed"
                ? "Proof pass finished"
                : "Team started a proof pass",
          description,
          emittedAt,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function parseDearMeDecisionFocus(search: string): DearMeDecisionFocus | null {
  const params = new URLSearchParams(search);
  if (params.get("view") !== "decisions") return null;

  const focus = {
    approvalId: params.get("approval"),
    issueReference: params.get("work") ?? params.get("issue"),
    outputId: params.get("artifact") ?? params.get("output"),
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
  if (action === "approve") return "Launched in DearMe. This represents me.";
  if (action === "reject") return "Rejected in DearMe. Do not move this forward.";
  return "Please revise this before moving forward.";
}

function defaultDearMeOutputReviewNote(action: DearMeOutputReviewAction) {
  if (action === "approve") return "Launched in DearMe. This prepared work represents me.";
  if (action === "request_changes") return "Please revise this draft before the launch call.";
  if (action === "not_useful") return "This prepared work is not useful for my brand goals.";
  return "Please prepare a new version for review.";
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

function paidBetaReceiptLabel(status: DearMePaidBetaStatus | null) {
  if (!status || status.status !== "active") return "Waiting for paid access";
  if (status.latestExternalInvoiceId) return status.latestExternalInvoiceId;
  if (status.latestPaymentDescription) return status.latestPaymentDescription;
  return paymentDate(status.latestPaymentAt);
}

function normalizePaidBetaCohortCompanyIds(
  selectedCompanyId: string | null,
  companies: Array<{ id: string; status?: string | null }>,
) {
  const visibleCompanyIds = companies
    .filter((company) => company.status !== "archived")
    .map((company) => company.id);
  return Array.from(new Set([
    selectedCompanyId,
    ...visibleCompanyIds,
  ].filter((companyId): companyId is string => Boolean(companyId)))).sort();
}

function paidBetaCohortCompanyName(
  companyNames: Record<string, string>,
  companyId: string,
) {
  return companyNames[companyId] ?? "Current account";
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
  queued: "Staged",
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
  fresh: "Preparing work",
  needs_user_review: "Needs your review",
  revision_requested: "Changes requested",
  regeneration_requested: "Next pass in motion",
  not_useful: "New direction needed",
  approved: "Launched",
  retry_limit_reached: "Needs clearer direction",
};

function reviewLoopLabel(loop: DearMeOutputReviewLoop) {
  return `Review pass ${loop.attemptCount}/${loop.maxAttempts}`;
}

function reviewLoopStateLabel(loop: DearMeOutputReviewLoop) {
  const defaultScore = reviewLoopDefaultApprovalScore(loop);
  if (defaultScore !== null) return `Proof score ${defaultScore}/10`;
  return REVIEW_LOOP_STATE_LABELS[loop.state];
}

function reviewLoopDefaultApprovalScore(loop: DearMeOutputReviewLoop) {
  return loop.defaultedBySilence && typeof loop.defaultApprovalScore === "number"
    ? loop.defaultApprovalScore
    : null;
}

function reviewLoopDefaultBoundaryCopy(loop: DearMeOutputReviewLoop) {
  return reviewLoopDefaultApprovalScore(loop) !== null
    ? "Public posts, sends, deploys, and spend stay behind your launch call."
    : null;
}

function reviewLoopVariant(loop: DearMeOutputReviewLoop) {
  if (loop.state === "approved") return "default" as const;
  if (loop.state === "retry_limit_reached" || loop.state === "not_useful") return "destructive" as const;
  if (loop.state === "fresh" || loop.state === "needs_user_review") return "outline" as const;
  return "secondary" as const;
}

function isReviewLoopStuck(loop: DearMeOutputReviewLoop | null | undefined) {
  return Boolean(loop && (loop.state === "retry_limit_reached" || loop.attemptCount >= loop.maxAttempts));
}

const REVIEW_LOOP_STUCK_DISABLED_REASON =
  "This path is capped. Add Voice & Memory context or use the support handoff before another pass.";

function reviewLoopAttention(loop: DearMeOutputReviewLoop | null | undefined): DearMeActionCardAttention | null {
  if (!loop) return null;

  const nextStep = customerProofPackSummary(loop.nextStep);

  switch (loop.state) {
    case "needs_user_review":
      return {
        kind: "decision_needed",
        label: "Launch call ready",
        detail: nextStep,
      };
    case "revision_requested":
      return {
        kind: "retry",
        label: "Changes requested",
        detail: nextStep,
      };
    case "regeneration_requested":
      return {
        kind: "retry",
        label: "Another pass is in motion",
        detail: nextStep,
      };
    case "not_useful":
      return {
        kind: "paused",
        label: "New direction needed",
        detail: nextStep,
      };
    case "retry_limit_reached":
      return {
        kind: "blocked",
        label: "Needs clearer direction",
        detail: nextStep,
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
        body: "Your team already has your change request. Add one sharper note if needed, then let DearMe prepare the next version.",
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
        label: "Brand work in motion",
        title: "Track the next prepared version",
        body: "DearMe is still preparing this work. Come back here when the team brings it to review.",
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
      detail: loop?.nextStep
        ? customerProofPackSummary(loop.nextStep)
        : "Open it, then launch, request changes, ask for another pass, or choose a new direction.",
    };
  }
  if (status === "blocked") {
    return {
      kind: "blocked",
      label: "Needs attention",
      detail: loop?.nextStep
        ? customerProofPackSummary(loop.nextStep)
        : "Give the team a clearer direction before this can continue.",
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
    label: "Launch call ready",
    detail: decision.reviewLoop?.nextStep
      ? customerProofPackSummary(decision.reviewLoop.nextStep)
      : decisionAfterCallLabel(decision.riskGate),
  };
}

function streamActionAttention(item: DearMeWorkbenchStreamItem): DearMeActionCardAttention | null {
  const loopAttention = reviewLoopAttention(item.reviewLoop);
  if (loopAttention) return loopAttention;

  if (item.needsApproval) {
    return {
      kind: "decision_needed",
      label: "Launch call ready",
      detail: customerProofPackSummary(item.nextAction),
    };
  }

  const status = item.status.toLowerCase();
  if (status.includes("blocked") || status.includes("cancelled") || status.includes("failed")) {
    return {
      kind: "blocked",
      label: "Needs attention",
      detail: customerProofPackSummary(item.nextAction),
    };
  }
  if (status.includes("paused") || status.includes("waiting")) {
    return {
      kind: "paused",
      label: "Paused",
      detail: customerProofPackSummary(item.nextAction),
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
  const defaultBoundaryCopy = reviewLoopDefaultBoundaryCopy(loop);
  return (
    <div className={cn("rounded-md border border-border bg-background/80 p-3", className)}>
      <p className="text-xs font-medium text-muted-foreground">Team follow-through</p>
      <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(loop.nextStep)}</p>
      {defaultBoundaryCopy ? (
        <p className="mt-2 text-xs text-muted-foreground">{defaultBoundaryCopy}</p>
      ) : null}
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
        <p className="text-xs font-medium text-muted-foreground">Review handoff</p>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{customerProofPackSummary(handoff.title)}</p>
      <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(handoff.summary)}</p>
      {handoff.userDirection ? (
        <p className="mt-2 text-xs text-muted-foreground">Your note: {handoff.userDirection}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{customerProofPackSummary(handoff.nextDraftDirection)}</p>
    </div>
  );
}

function ReviewAppliedFeedbackCard({
  loop,
  className,
}: {
  loop: DearMeOutputReviewLoop;
  className?: string;
}) {
  const trace = loop.feedbackTrace;
  if (!trace) return null;
  const headline = customerProofPackSummary(trace.headline);
  const summary = customerProofPackSummary(trace.summary);
  const userFeedback = trace.userFeedback ? customerProofPackSummary(trace.userFeedback) : null;
  const changes = trace.changes
    .map((change) => customerProofPackSummary(change).trim())
    .filter(Boolean);
  const receipts = (trace.receipts ?? [])
    .map((receipt) => customerProofPackSummary(receipt).trim())
    .filter(Boolean);

  return (
    <div
      className={cn("rounded-md border border-border bg-background/80 p-3", className)}
      aria-label="Feedback applied"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{headline}</p>
      </div>
      <p className="mt-2 text-sm text-foreground/85">{summary}</p>
      {userFeedback ? (
        <p className="mt-2 text-xs text-muted-foreground">You asked: {userFeedback}</p>
      ) : null}
      {changes.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {changes.map((change) => (
            <li key={change} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{change}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {receipts.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Review path</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {receipts.map((receipt) => (
              <li key={receipt} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{receipt}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
  brand_os: "Brand team profile",
  voice_profile: "Voice Profile",
  content_drafts: "Content drafts",
  opportunity_drafts: "Opportunity leads",
  portfolio_update: "Portfolio update",
  weekly_report: "Dear me report",
};

const OUTPUT_DETAIL_DISPLAY_LIMIT = 8;

const OUTPUT_DETAIL_DISPLAY_ORDER: Record<
  DearMeOutputItem["kind"],
  DearMeOutputDetail["kind"][]
> = {
  brand_os: ["positioning", "proof_used", "approval_gate"],
  voice_profile: ["voice_guidance", "approval_gate"],
  content_drafts: ["channel", "audience", "hook", "draft_body", "proof_used", "approval_gate"],
  opportunity_drafts: [
    "target",
    "verification_status",
    "contact_record",
    "source_signal",
    "why_relevant",
    "outreach_angle",
    "draft_message",
    "approval_gate",
    "relevance_score",
  ],
  portfolio_update: ["page_section", "proof_source", "proposed_copy", "deploy_gate"],
  weekly_report: ["completed_work", "decisions_needed", "next_bets", "report_reference"],
};

function outputReviewDetails(output: DearMeOutputItem) {
  const detailsByKind = new Map(output.details.map((detail) => [detail.kind, detail]));
  const usedKinds = new Set<DearMeOutputDetail["kind"]>();
  const orderedDetails: DearMeOutputDetail[] = [];

  for (const kind of OUTPUT_DETAIL_DISPLAY_ORDER[output.kind]) {
    const detail = detailsByKind.get(kind);
    if (!detail) continue;
    usedKinds.add(kind);
    orderedDetails.push(detail);
  }

  for (const detail of output.details) {
    if (usedKinds.has(detail.kind)) continue;
    usedKinds.add(detail.kind);
    orderedDetails.push(detail);
  }

  return orderedDetails.slice(0, OUTPUT_DETAIL_DISPLAY_LIMIT);
}

function outputLaunchBoundaryPreview(output: DearMeOutputItem) {
  const boundaryDetail = output.details.find((detail) =>
    detail.kind === "approval_gate" || detail.kind === "deploy_gate",
  );
  return customerProofPackSummary(boundaryDetail?.value ?? "").trim();
}

const OUTPUT_KIND_OWNER_ROLE: Record<
  DearMeOutputItem["kind"],
  DearMeWorkbenchWorkItem["ownerRole"]
> = {
  brand_os: "brand_strategist",
  voice_profile: "voice_editor",
  content_drafts: "content_producer",
  opportunity_drafts: "opportunity_scout",
  portfolio_update: "portfolio_builder",
  weekly_report: "growth_analyst",
};

const OUTPUT_KIND_VALUE_LABELS: Record<DearMeOutputItem["kind"], string> = {
  brand_os: "Keeps the team aligned on positioning, voice, proof, channels, and launch boundaries.",
  voice_profile: "Protects the user's tone before drafts become public-facing work.",
  content_drafts: "Turns proof and point of view into material the user can launch, revise, or send back for another pass.",
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

type LiveFeedSectionId = "needs_call" | "in_motion" | "recent";

type LiveFeedSection = {
  id: LiveFeedSectionId;
  title: string;
  summary: string;
  items: DearMeWorkbenchStreamItem[];
};

const LIVE_FEED_SECTIONS: LiveFeedSection[] = [
  {
    id: "needs_call",
    title: "Needs your call",
    summary: "Reviewable work and launch calls stay first.",
    items: [],
  },
  {
    id: "in_motion",
    title: "In motion",
    summary: "Work the team keeps preparing before the next launch call.",
    items: [],
  },
  {
    id: "recent",
    title: "Recent updates",
    summary: "Completed cycle checkpoints, spend pauses, and team notes.",
    items: [],
  },
];

const ACTION_GRAPH_KIND_LABELS: Record<DearMeActionGraphNode["kind"], string> = {
  cycle: "Growth cycle",
  role: "Team role",
  work_item: "Work in motion",
  artifact: "Prepared work",
  decision: "Decision needed",
  memory_signal: "Memory update",
  report: "Dear me report",
  guardrail: "Launch boundary",
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

const RUN_LEDGER_KIND_ORDER: DearMeWorkbenchRunLedgerEntry["kind"][] = [
  "tried",
  "prepared",
  "learned",
  "blocked",
  "skipped",
  "needs_decision",
];

const RUN_LEDGER_KIND_LABELS: Record<DearMeWorkbenchRunLedgerEntry["kind"], string> = {
  tried: "Moved",
  prepared: "Prepared",
  learned: "Learned",
  blocked: "Queued at boundary",
  skipped: "Skipped",
  needs_decision: "Needs your call",
};

const RUN_LEDGER_KIND_DESCRIPTIONS: Record<DearMeWorkbenchRunLedgerEntry["kind"], string> = {
  tried: "Private moves the team completed or advanced in this cycle.",
  prepared: "Drafts, letters, proof, or reports ready enough to explain.",
  learned: "Voice, proof, and memory signals the next pass can use.",
  blocked: "Work paused at the launch boundary instead of interrupting the team.",
  skipped: "Duplicate or unnecessary moves DearMe avoided for you.",
  needs_decision: "Important calls ready before anything represents you.",
};

const RUN_LEDGER_KIND_ICONS: Record<DearMeWorkbenchRunLedgerEntry["kind"], LucideIcon> = {
  tried: Workflow,
  prepared: FileText,
  learned: Sparkles,
  blocked: ShieldCheck,
  skipped: RefreshCw,
  needs_decision: ShieldCheck,
};

function runLedgerKindVariant(kind: DearMeWorkbenchRunLedgerEntry["kind"]) {
  if (kind === "needs_decision" || kind === "blocked") return "secondary" as const;
  if (kind === "prepared") return "default" as const;
  return "outline" as const;
}

function runLedgerBucketMarker(kind: DearMeWorkbenchRunLedgerEntry["kind"]) {
  return kind === "needs_decision" ? "needs_call" : kind;
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
  if (node.kind === "decision") return "Launch call ready";
  if (node.kind === "guardrail") return "Boundary protected";
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
      return "The team keeps preparing this work until it becomes reviewable.";
    case "artifact":
      return "Open the prepared work, then launch it, request changes, ask for another pass, or choose a new direction.";
    case "decision":
      return "This is ready for your launch call before it represents you publicly or externally.";
    case "memory_signal":
      return "DearMe uses this signal to make future work more accurate to your voice and proof.";
    case "report":
      return "Use this as the closing letter for what changed, what needs a call, and what comes next.";
    case "guardrail":
      return "This keeps publishing, sending, deploying, spending, and sensitive moves inside the launch boundary.";
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
  review_feedback: "Review feedback",
};

const MEMORY_SOURCE_INPUT_MODE_LABELS: Record<DearMeMemorySourceInputMode, string> = {
  paste: "Pasted source",
  link: "Source link",
  import_note: "Import note",
};

const MEMORY_SOURCE_INPUT_MODE_HELPERS: Record<DearMeMemorySourceInputMode, string> = {
  paste: "Paste the source text directly.",
  link: "Save a source link and the useful memory from it.",
  import_note: "Describe a file, transcript, profile, or backlog item DearMe should fold in next.",
};

const VOICE_MEMORY_SOURCE_TITLE_MAX_LENGTH = 160;
const VOICE_MEMORY_SOURCE_REFERENCE_MAX_LENGTH = 500;
const VOICE_MEMORY_SOURCE_BODY_MIN_LENGTH = 20;
const VOICE_MEMORY_SOURCE_BODY_MAX_LENGTH = 4_000;

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

const MEMORY_SOURCE_TEAM_PREVIEWS: Record<
  MemorySourceGuideId,
  { role: string; action: string; outcome: string }
> = {
  writing_sample: {
    role: "Voice Editor",
    action: "will compare future drafts against this sample before they reach you.",
    outcome: "Improves content drafts, outreach tone, and weekly reports.",
  },
  proof_point: {
    role: "Portfolio Builder",
    action: "will turn this receipt into proof cards, stronger claims, and opportunity angles.",
    outcome: "Improves portfolio proof, first-cycle content, and launch calls.",
  },
  source_link: {
    role: "Growth Analyst",
    action: "will extract the useful fact before it shapes the next proof pass.",
    outcome: "Improves source review, report notes, and proof-backed recommendations.",
  },
  correction: {
    role: "Voice Editor",
    action: "will apply this fix before the team prepares another draft.",
    outcome: "Improves revisions, next-draft guidance, and voice checks.",
  },
  forbidden_phrase: {
    role: "Chief of Staff",
    action: "will hold sensitive wording and claims for your decision.",
    outcome: "Improves launch notes, review notes, and next actions.",
  },
  audience_note: {
    role: "Brand Strategist",
    action: "will use this audience signal to sharpen positioning and channel choices.",
    outcome: "Improves content angles, opportunity filters, and growth plans.",
  },
  offer_note: {
    role: "Opportunity Scout",
    action: "will turn this offer shape into prepared asks and collaboration angles.",
    outcome: "Improves outreach drafts, lead review, and launch opportunities.",
  },
};

const MEMORY_SOURCE_WORK_PATHS: Record<
  DearMeMemoryUpdateKind,
  { owner: string; destination: string }
> = {
  voice_sample: {
    owner: "Voice Editor",
    destination: "Keeps drafts, outreach, and reports inside your chosen voice.",
  },
  proof_point: {
    owner: "Portfolio Builder",
    destination: "Feeds proof cards, stronger claims, and launch-call notes.",
  },
  goal: {
    owner: "Chief of Staff",
    destination: "Turns this into the next brand plan and priority checks.",
  },
  audience: {
    owner: "Brand Strategist",
    destination: "Shapes audience angles, channel choices, and opportunity filters.",
  },
  offer: {
    owner: "Opportunity Scout",
    destination: "Shapes prepared asks, collaboration angles, and lead review.",
  },
  constraint: {
    owner: "Chief of Staff",
    destination: "Routes sensitive words, public claims, and launch calls into Decisions.",
  },
  relationship: {
    owner: "Opportunity Scout",
    destination: "Guides warm outreach, follow-ups, and relationship context.",
  },
  preference: {
    owner: "Chief of Staff",
    destination: "Keeps future review notes and prepared work aligned with your preferences.",
  },
  review_feedback: {
    owner: "Voice Editor",
    destination: "Applies this correction to the next draft before it reaches you.",
  },
};

function defaultSourceInputModeForGuide(
  guide: (typeof MEMORY_SOURCE_GUIDES)[number],
): DearMeMemorySourceInputMode {
  return guide.id === "source_link" ? "link" : "paste";
}

function sourceLabelForChip(value: string) {
  const customerLabel = customerProofPackSummary(value);
  return customerLabel.length > 42 ? `${customerLabel.slice(0, 39)}...` : customerLabel;
}

function privateSourceLink(
  sourceInputMode: DearMeMemorySourceInputMode,
  sourceLabel: string | null | undefined,
) {
  if (sourceInputMode !== "link" || !sourceLabel) return null;

  try {
    const url = new URL(sourceLabel);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function PrivateSourceLink({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className,
      )}
    >
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      Open source
    </a>
  );
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
    return "Saved. Future growth cycles will use this after the brand team starts.";
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
  `${DEARME_FIRST_CYCLE_STARTER_POST_COUNT} starter drafts`,
  "1 opportunity lead",
  "1 portfolio proof card",
  "First growth plan",
];

const FIRST_PAYOFF_STEPS = [
  {
    label: "You write",
    title: "One known-for sentence",
    description: "Start with the outcome you want people to remember.",
  },
  {
    label: "DearMe returns",
    title: "Voice Profile, starter posts, one opportunity, proof card, first plan",
    description: "A brand cycle starts before settings or public launch.",
  },
  {
    label: "You decide",
    title: "One launch call before anything public or external",
    description: "Launch, revise, or redirect the team from one place.",
  },
] as const;

const FIRST_CYCLE_LIVE_PROGRESS_LABELS = [
  "Studying your voice",
  "Finding likely audiences",
  "Drafting first moves",
  "Preparing your proof page",
  "Ready for your launch call",
] as const;

const FIRST_RUN_PREPARATION_CUES = [
  "Studying the outcome you want people to remember.",
  "Looking for the first proof, audience, and draft angles.",
  "Preparing the review path before any public move.",
  "Staging posts, outreach, page changes, and spend for your call.",
] as const;

const FIRST_RUN_PUBLIC_HOLD_LABELS: Record<
  (typeof DEARME_OWNER_PROOF_FACT_SPECS)[number]["provideAs"],
  string
> = {
  DEARME_LINKEDIN_DM_MESSAGES_URL: "Professional route",
  DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN: "Selected recipient",
  DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT: "Phone-message proof",
};

const FIRST_RUN_PUBLIC_HOLD_CUES = DEARME_OWNER_PROOF_FACT_SPECS.map(
  (fact) => FIRST_RUN_PUBLIC_HOLD_LABELS[fact.provideAs],
);

const FIRST_CYCLE_LIVE_WORK_STATUS_LABELS: Record<DearMeFirstCyclePreviewResponse["liveWorkTrail"][number]["status"], string> = {
  ready: "Ready",
  working: "Working",
  your_call: "Your call",
};

const FIRST_CYCLE_REPORT_STATUS_LABELS: Record<DearMeFirstCyclePreviewResponse["cycleReport"]["items"][number]["status"], string> = {
  moved: "Moved",
  ready: "Ready",
  blocked: "Blocked",
  next: "Next",
};

const SAMPLE_FIRST_CYCLE_PREVIEW = createDearMeFirstCyclePreview("sample-company", {
  brand: {
    displayName: "Maya Chen",
    positioning: "Known for turning messy customer research into calm B2B product decisions",
    goals: [
      "Become a trusted product strategy voice",
      "Turn weekly research into proof-backed content",
    ],
    audiences: ["B2B SaaS founders"],
    proofPoints: ["Ran 42 customer interviews that changed a pricing launch"],
    offers: ["a product positioning teardown"],
    voiceSamples: [
      "I prefer clear, practical writing that starts from what users actually did.",
      "My best posts use one concrete example, one decision, and one next step.",
    ],
    preferredChannels: ["linkedin", "newsletter", "portfolio"],
    constraints: ["No invented metrics", "Ask before public outreach"],
    cadence: "weekly",
    budgetMonthlyCents: 25_000,
    autoDraftEnabled: true,
  },
});

const SAMPLE_FIRST_CYCLE_DELIVERY_RECEIPTS: DearMeWorkbenchProgressItem[] = [
  {
    id: "sample-delivery-receipt-delivered",
    kind: "next_move_delivery_recorded",
    title: "X post delivered",
    summary: "DearMe recorded the delivery receipt for the launched next step.",
    outputKind: "content_drafts",
    outputId: "sample-content-drafts",
    riskGate: "publish_social",
    approvalId: "sample-approval-publish",
    issueIdentifier: "MAYA-8",
    deliveryStatus: "delivered",
    deliveryExternalId: "x-post-42",
    deliveryExternalUrl: "https://x.com/maya/status/42",
    nextStep: "Review the delivered post, then let DearMe prepare the next proof-backed opportunity.",
    createdAt: "2026-05-07T14:08:00.000Z",
  },
  {
    id: "sample-delivery-receipt-connection",
    kind: "next_move_delivery_recorded",
    title: "X post needs connection",
    summary: "DearMe kept the post staged because X still needs to be connected.",
    outputKind: "content_drafts",
    outputId: "sample-content-drafts",
    riskGate: "send_email",
    approvalId: "sample-approval-send",
    issueIdentifier: "MAYA-9",
    deliveryStatus: "needs_channel_connection",
    nextStep: "Add the selected X account before DearMe can continue this next step.",
    createdAt: "2026-05-07T14:09:00.000Z",
  },
];

function outputPreview(output: DearMeOutputItem) {
  const candidates = [
    ...output.documents.map((document) => document.bodyPreview),
    output.latestUpdate?.bodyPreview,
    ...output.workProducts.map((workProduct) => workProduct.summary),
    output.summary,
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim())?.trim() ?? "";
}

function outputSearchText(output: DearMeOutputItem) {
  return [
    output.title,
    output.summary,
    output.issueTitle,
    ...output.documents.flatMap((document) => [document.title, document.bodyPreview]),
    output.latestUpdate?.bodyPreview,
    ...output.workProducts.flatMap((workProduct) => [workProduct.title, workProduct.summary]),
    ...output.details.flatMap((detail) => [detail.label, detail.value]),
    ...output.sourceEvidence.flatMap((source) => [source.label, source.summary]),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function replaceDearMeOutputInResponse(
  current: DearMeOutputsResponse | undefined,
  nextOutput: DearMeOutputItem,
): DearMeOutputsResponse | undefined {
  if (!current) return current;
  let didReplace = false;
  const outputs = current.outputs.map((output) => {
    if (output.id !== nextOutput.id) return output;
    didReplace = true;
    return nextOutput;
  });
  if (!didReplace) return current;
  return { ...current, outputs };
}

function isCyclePacketWorkProduct(workProduct: DearMeOutputItem["workProducts"][number]) {
  const title = workProduct.title.toLowerCase();
  const summary = workProduct.summary?.toLowerCase() ?? "";
  return title.includes("cycle content packet") ||
    title.includes("dear me report packet") ||
    summary.includes("cycle packet");
}

function cyclePacketWorkProducts(output: DearMeOutputItem) {
  return output.workProducts.filter(isCyclePacketWorkProduct);
}

function isFirstCycleProofPackOutput(output: DearMeOutputItem) {
  if (output.status !== "ready_for_review") return false;
  if (output.kind !== "content_drafts" && output.kind !== "weekly_report") return false;
  const text = outputSearchText(output);
  return (
    text.includes("first-cycle") ||
    text.includes("first cycle") ||
    text.includes("first 5 minute proof package") ||
    text.includes("first 5-minute proof package") ||
    text.includes("starter content")
  );
}

function isProofPackOutput(output: DearMeOutputItem) {
  return cyclePacketWorkProducts(output).length > 0 || isFirstCycleProofPackOutput(output);
}

function customerProofPackSummary(text: string) {
  return text
    .replace(/\bPrivate site proof\b/g, "Proof page")
    .replace(/\bprivate site proof\b/gi, "proof page")
    .replace(/\bPrivate proof page move\b/g, "Proof page move")
    .replace(/\bprivate proof page move\b/gi, "proof page move")
    .replace(/\bUpdated private proof card\b/g, "Updated proof card")
    .replace(/\bupdated private proof card\b/gi, "updated proof card")
    .replace(/\bprivate proof page\b/gi, "proof page")
    .replace(/\bprivate proof pack\b/gi, "proof pack")
    .replace(/\bPrivate proof\b/g, "Proof")
    .replace(/\bprivate proof\b/gi, "proof")
    .replace(/\bPrivate starter content\b/g, "Starter content")
    .replace(/\bprivate starter content\b/gi, "starter content")
    .replace(/\bheld safely\b/gi, "staged at the boundary")
    .replace(/\bheld for your call\b/gi, "ready for your call")
    .replace(/\bheld back\b/gi, "kept behind the launch call")
    .replace(/\bbefore asking for approval\b/gi, "before the next launch call")
    .replace(/\bapproval notes\b/gi, "launch notes")
    .replace(/\bapproval boundaries\b/gi, "launch boundaries")
    .replace(/\bapproved voice\b/gi, "chosen voice")
    .replace(/\bApproved next step\b/g, "Launch move")
    .replace(/\bapproved next step\b/gi, "launched next step")
    .replace(/\bnext approved step\b/gi, "next launched step")
    .replace(/\bApproved move\b/g, "Launch move")
    .replace(/\bapproved move\b/gi, "launch move")
    .replace(/\bapproved step\b/gi, "launched step")
    .replace(/\bapproved account or recipient\b/gi, "selected account or recipient")
    .replace(/\bapproved account\b/gi, "selected account")
    .replace(/\bapproved recipient\b/gi, "selected recipient")
    .replace(/\bapproved X step\b/gi, "X step")
    .replace(/\bapproved X post\b/gi, "X post")
    .replace(/\bapproved Website preview\b/gi, "Website preview")
    .replace(/\bapproved result\b/gi, "launch result")
    .replace(/\bEvery public move still waits for your launch approval\./gi, "Every public move stays behind your launch call.")
    .replace(/\bstill waits for your launch approval\b/gi, "stays behind your launch call")
    .replace(/\bNo outbound message sends until you approve\./gi, "Outbound sends stay behind your launch call.")
    .replace(/\bNo outbound message sends until ([A-Z][A-Za-z0-9_-]*) approves?([^.]*)\./g, "Outbound sends stay behind $1's launch call$2.")
    .replace(/\bnothing public moves until you approve it\b/gi, "anything public stays behind your launch call")
    .replace(/\bNext private review\b/g, "Next proof review")
    .replace(/\bPrepare the next private pass\b/gi, "Prepare the next pass")
    .replace(/\banother private pass\b/gi, "another pass")
    .replace(/\bnext private pass\b/gi, "next pass")
    .replace(/\bprivate pass\b/gi, "proof pass")
    .replace(/\bprivate route\b/gi, "proof route")
    .replace(/\bprivate review\b/gi, "proof review")
    .replace(/\bprivate targets\b/gi, "launch-ready targets")
    .replace(/\bprivate drafts\b/gi, "draft work")
    .replace(/\bprivate brief\b/gi, "staged brief")
    .replace(/\bprivate profile work\b/gi, "profile work")
    .replace(/\bprivate preparation\b/gi, "team preparation")
    .replace(/\bprivate feedback work\b/gi, "feedback work")
    .replace(/\bprivate brand work\b/gi, "brand work")
    .replace(/\bprivate DearMe cycles\b/gi, "DearMe brand cycles")
    .replace(/\bprivate-cycle\b/gi, "brand-cycle")
    .replace(/\bprivate cycles\b/gi, "brand cycles")
    .replace(/\bprivate output\b/gi, "useful output")
    .replace(/\bprivate work\b/gi, "brand work")
    .replace(/\bprivate cycle\b/gi, "brand cycle")
    .replace(/\bprivate brand cycle\b/gi, "brand cycle")
    .replace(/\bprivate growth cycle\b/gi, "brand cycle")
    .replace(/\bprivate team work\b/gi, "brand team work")
    .replace(/\bprivate team\b/gi, "brand team")
    .replace(/\bprivate lane\b/gi, "brand lane")
    .replace(/\bprivate weekly report\b/gi, "weekly report")
    .replace(/\bprivate source\b/gi, "saved source")
    .replace(/\bprivate sources\b/gi, "saved sources")
    .replace(/\bStart private team\b/g, "Start brand team")
    .replace(/\bstart the private team\b/gi, "start the brand team")
    .replace(/\bKeep it private\b/g, "Keep it staged")
    .replace(/\bkeep it private\b/gi, "keep it staged")
    .replace(/\bdearme runtime smoke\b/g, "dearme proof check")
    .replace(/\bDearMe Runtime Smoke\b/g, "DearMe Proof Check")
    .replace(/\bruntime smoke\b/gi, "proof check")
    .replace(/\bsend_email\b/gi, "Send launch call required")
    .replace(/\blead packets\b/gi, "lead batches")
    .replace(/\bcurrent opportunity packet\b/gi, "current opportunity draft")
    .replace(/\bprepared opportunity packets\b/gi, "prepared opportunity drafts")
    .replace(/\bopportunity packets\b/gi, "opportunity drafts")
    .replace(/\bopportunity packet\b/gi, "opportunity draft")
    .replace(/\bsame private (?:cycle output|cycle|evidence) packet\b/gi, "same proof pack")
    .replace(/\bprivate (?:cycle output|cycle|evidence) packet\b/gi, "proof pack")
    .replace(/\bshared (?:cycle output|cycle|evidence) packet\b/gi, "shared proof pack")
    .replace(/\bshared packet\b/gi, "shared proof pack")
    .replace(/\bcycle output packet\b/gi, "proof pack")
    .replace(/\bcycle packet\b/gi, "first proof pack")
    .replace(/\bsource review queue verification\b/gi, "source review verification")
    .replace(/\bsource review queue\b/gi, "source review")
    .replace(/\bWork Ready queue\b/gi, "Work Ready list")
    .replace(/\bwork queue\b/gi, "prepared work")
    .replace(/\blaunch queue\b/gi, "launch calls")
    .replace(/\bqueue\b/gi, "list");
}

type OwnerProofFact = (typeof DEARME_OWNER_PROOF_FACT_SPECS)[number];

function ownerProofFactLabel(fact: OwnerProofFact) {
  if (fact.provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") return "Professional-network delivery route";
  if (fact.provideAs === "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN") return "Approved professional-network recipient";
  return "Approved phone-message proof recipient";
}

function ownerProofFactPrompt(fact: OwnerProofFact) {
  if (fact.provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") {
    return "Paste the delivery-route link for the first receipt check.";
  }
  if (fact.provideAs === "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN") {
    return "Choose one real professional-network recipient for the proof pass.";
  }
  return "Choose one phone-message recipient for the shared proof pass.";
}

function ownerProofFactBoundary(fact: OwnerProofFact) {
  if (fact.provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") {
    return "DearMe checks this in no-send mode before any live receipt moves.";
  }
  if (fact.provideAs === "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN") {
    return "Only this selected recipient is used for the first guarded receipt.";
  }
  return "The receipt stays behind the final launch call after the no-send check.";
}

function ownerProofFactExample(fact: OwnerProofFact) {
  if (fact.provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") {
    return "A delivery-route link from your professional-network message page.";
  }
  if (fact.provideAs === "DEARME_LINKEDIN_DM_SMOKE_RECIPIENT_URN") {
    return "One real professional-network recipient for the proof pass.";
  }
  return "One phone number or contact for the shared proof pass.";
}

function ownerProofFactInputType(fact: OwnerProofFact) {
  if (fact.provideAs === "DEARME_LINKEDIN_DM_MESSAGES_URL") return "url";
  if (fact.provideAs === "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT") return "tel";
  return "text";
}

function readDearMeLaunchProofDetailValues(companyId: string): Record<string, string> {
  if (!canUseDearMeSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(buildDearMeLaunchProofDetailStorageKey(companyId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return DEARME_OWNER_PROOF_FACT_SPECS.reduce<Record<string, string>>((values, fact) => {
      const value = (parsed as Record<string, unknown>)[fact.provideAs];
      if (typeof value === "string" && value.trim()) values[fact.provideAs] = value;
      return values;
    }, {});
  } catch {
    return {};
  }
}

function writeDearMeLaunchProofDetailValues(companyId: string, values: Record<string, string>) {
  if (!canUseDearMeSessionStorage()) return;

  try {
    const filteredValues = DEARME_OWNER_PROOF_FACT_SPECS.reduce<Record<string, string>>((nextValues, fact) => {
      const value = values[fact.provideAs]?.trim();
      if (value) nextValues[fact.provideAs] = value;
      return nextValues;
    }, {});
    window.sessionStorage.setItem(
      buildDearMeLaunchProofDetailStorageKey(companyId),
      JSON.stringify(filteredValues),
    );
  } catch {
    // Ignore storage failures; the in-page capture state still protects the launch boundary.
  }
}

function cyclePacketSummary(output: DearMeOutputItem) {
  return customerProofPackSummary(cyclePacketWorkProducts(output)[0]?.summary || outputPreview(output) || output.summary);
}

function reportEvidenceText(report: DearMeWorkbenchReport) {
  return [
    report.summary,
    report.bodyPreview,
    ...report.accomplished,
    ...report.decisions,
    ...report.learnings,
    ...report.nextBets,
  ].join(" ");
}

function isPacketBackedReport(report: DearMeWorkbenchReport) {
  const evidence = reportEvidenceText(report);
  return /\bproof pack\b/i.test(evidence) ||
    /\bcycle packet\b/i.test(evidence) ||
    /\bsame private evidence packet\b/i.test(evidence) ||
    /\bshared packet\b/i.test(evidence);
}

function VoiceGatePanel({ gate }: { gate: DearMeVoiceGateResult }) {
  return (
    <section className="rounded-md border border-border p-4" aria-label="Voice check">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" />
            Voice check
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{customerProofPackSummary(gate.summary)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={voiceGateVariant(gate.status)}>{VOICE_GATE_STATUS_LABELS[gate.status]}</Badge>
          <Badge variant="outline">Voice {gate.score}/100</Badge>
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

function outputVoiceGateResults(output: DearMeOutputItem) {
  return output.workProducts
    .map((workProduct) => workProduct.voiceGate)
    .filter((gate): gate is DearMeVoiceGateResult => Boolean(gate));
}

function primaryOutputVoiceGate(output: DearMeOutputItem) {
  const priority: Record<DearMeVoiceGateResult["status"], number> = {
    blocked_before_public: 3,
    needs_voice_review: 2,
    ready_for_review: 1,
  };
  return outputVoiceGateResults(output).sort((left, right) => priority[right.status] - priority[left.status])[0] ?? null;
}

function VoiceCheckPanel({
  gate,
  compact = false,
  className,
}: {
  gate: DearMeVoiceGateResult;
  compact?: boolean;
  className?: string;
}) {
  const attentionChecks = gate.checks.filter((check) => check.status !== "pass").slice(0, 2);
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-background/80",
        compact ? "p-2" : "p-3",
        className,
      )}
      aria-label="Voice check"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Voice check
          </div>
          <p className={cn("mt-1 text-foreground/85", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {customerProofPackSummary(gate.summary)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={voiceGateVariant(gate.status)}>{VOICE_GATE_STATUS_LABELS[gate.status]}</Badge>
          <Badge variant="outline">Voice {gate.score}/100</Badge>
        </div>
      </div>
      {!compact && attentionChecks.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {attentionChecks.map((check) => (
            <div key={check.label} className="rounded-md border border-border bg-muted/20 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={voiceGateCheckVariant(check.status)}>{roleLabel(check.status)}</Badge>
                <p className="text-xs font-medium text-foreground">{check.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{customerProofPackSummary(check.summary)}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!compact ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Public moves stay behind your launch call.
        </p>
      ) : null}
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
  const statusLabel = paidBetaActive ? "Team working" : previewReady ? "Ready to start" : "Needs one brief";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
      <DearMePanel aria-label="Brand workroom">
        <DearMeWorkbenchSectionHeader
          icon={Users}
          eyebrow="Your autonomous brand workroom"
          description="Dear me, your team is running the brand cycle: planning the week, drafting in your voice, scouting opportunities, and packaging proof before a launch call is needed."
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
          icon={Sparkles}
          eyebrow="Launch boundary"
          description="DearMe keeps the brand cycle moving. Public posts, outbound messages, spend, and page changes become launch calls under your rules."
        />
        <DearMeChecklist
          className="mt-4"
          icon={CheckCircle2}
          items={FIRST_CYCLE_ARTIFACTS}
          aria-label="First-cycle launch artifacts"
        />
      </aside>
    </section>
  );
}

function deliveryResultLinkLabel(handoff: DearMeWorkbenchProgressItem) {
  if (handoff.kind !== "next_move_delivery_recorded") return "Open result";

  const deliveryCopy = `${handoff.title} ${handoff.summary} ${handoff.nextStep ?? ""}`.toLowerCase();
  if (
    deliveryCopy.includes("website preview") ||
    handoff.deliveryExternalUrl?.startsWith("https://dearme.app/")
  ) {
    return "Open Website preview";
  }
  return "Open result";
}

function privateExecutionHandoffChecklist({
  artifact,
  isDeliveryReceipt,
  deliveryStatus,
  isPaused,
}: {
  artifact: string;
  isDeliveryReceipt: boolean;
  deliveryStatus?: DearMeWorkbenchProgressItem["deliveryStatus"];
  isPaused: boolean;
}) {
  if (!isDeliveryReceipt) {
    if (isPaused) {
      return [
        `Saved for later: ${artifact}.`,
        "DearMe is paused until you resume or choose a new direction.",
        "Nothing public or external runs while paused.",
      ];
    }
    return [
      `Ready to review: ${artifact}.`,
      "Open the brief to check voice, proof, and boundary before launch.",
      "Nothing public or external runs until you make the next call.",
    ];
  }

  if (deliveryStatus === "delivered") {
    return [
      "Result is recorded for the launched move.",
      "Open the result or brief to review what changed.",
      "The next proof pass can keep moving under your launch boundary.",
    ];
  }

  if (deliveryStatus === "needs_channel_connection") {
    return [
      "Move is ready, but DearMe is missing the selected account or recipient.",
      "Add the selected account or recipient before DearMe can continue this move.",
      "No external action ran without the connection.",
    ];
  }

  if (deliveryStatus === "pending") {
    return [
      "Launch move is waiting on its result.",
      "Keep the brief open until DearMe records the receipt.",
      "The boundary stays visible while the result is pending.",
    ];
  }

  if (deliveryStatus === "rejected") {
    return [
      "The move needs a new direction.",
      "Open the brief to choose a safer direction.",
      "No new external action runs until you choose the next direction.",
    ];
  }

  return [
    "DearMe failed safely before representing you again.",
    "Open the brief to inspect the prepared move.",
    "Choose a new direction before any public move continues.",
  ];
}

function privateExecutionReturnCue({
  artifact,
  isDeliveryReceipt,
  deliveryStatus,
  isPaused,
}: {
  artifact: string;
  isDeliveryReceipt: boolean;
  deliveryStatus?: DearMeWorkbenchProgressItem["deliveryStatus"];
  isPaused: boolean;
}) {
  if (!isDeliveryReceipt) {
    if (isPaused) {
      return [
        {
          label: "What changed",
          body: `DearMe saved ${artifact} instead of pushing it forward.`,
        },
        {
          label: "Launch boundary",
          body: "Your brand team stays paused until you resume or choose a new direction.",
        },
        {
          label: "Your next step",
          body: "Open the brief when you are ready to restart the brand cycle.",
        },
      ];
    }

    return [
      {
        label: "What changed",
        body: `DearMe prepared ${artifact} for your review.`,
      },
      {
        label: "Launch boundary",
        body: "Nothing public or external runs until you make the next governed call.",
      },
      {
        label: "Your next step",
        body: "Open the brief to check voice, proof, and boundary.",
      },
    ];
  }

  if (deliveryStatus === "delivered") {
    return [
      {
        label: "What changed",
        body: "The launched move has a recorded result.",
      },
      {
        label: "Next work",
        body: "The next pass can continue inside your launch boundary.",
      },
      {
        label: "Your next step",
        body: "Open the result or brief, then let DearMe prepare the next proof-backed move.",
      },
    ];
  }

  if (deliveryStatus === "needs_channel_connection") {
    return [
      {
        label: "What changed",
        body: "The move stayed staged instead of using a missing connection.",
      },
      {
        label: "Launch boundary",
        body: "DearMe needs the selected account or recipient before this move can continue.",
      },
      {
        label: "Your next step",
        body: "Add the account or recipient, or keep reviewing the staged brief.",
      },
    ];
  }

  if (deliveryStatus === "pending") {
    return [
      {
        label: "What changed",
        body: "The launch move is staged with its boundary still visible.",
      },
      {
        label: "Receipt status",
        body: "DearMe is watching for the receipt before continuing this move.",
      },
      {
        label: "Your next step",
        body: "Keep the brief open and review the receipt when it returns.",
      },
    ];
  }

  if (deliveryStatus === "rejected") {
    return [
      {
        label: "What changed",
        body: "DearMe brought the move back instead of forcing it through.",
      },
      {
        label: "Launch boundary",
        body: "A safer direction needs your decision before anything new runs.",
      },
      {
        label: "Your next step",
        body: "Open the brief and choose the safer next step.",
      },
    ];
  }

  return [
    {
      label: "What changed",
      body: "DearMe stopped the move safely before representing you again.",
    },
    {
      label: "Launch boundary",
      body: "A safer direction needs your decision before anything public continues.",
    },
    {
      label: "Your next step",
      body: "Open the brief, inspect the prepared move, and choose a new direction.",
    },
  ];
}

function privateExecutionConnectionReadiness(
  deliveryStatus?: DearMeWorkbenchProgressItem["deliveryStatus"],
) {
  if (deliveryStatus !== "needs_channel_connection") return [];

  return [
    "Choose the exact account or recipient DearMe is allowed to use for this move.",
    "Let DearMe check the connection before any live attempt.",
    "Keep the final send, post, page change, or spend behind your launch call.",
  ];
}

function PrivateExecutionHandoffPanel({
  handoff,
  onOpenIssue,
  ariaLabelPrefix,
}: {
  handoff: DearMeWorkbenchProgressItem;
  onOpenIssue: (issueReference: string, outputId?: string | null) => void;
  ariaLabelPrefix?: string;
}) {
  const issueReference = handoff.issueIdentifier ?? handoff.issueId ?? null;
  const artifact = handoff.outputKind ? OUTPUT_KIND_LABELS[handoff.outputKind] : "Prepared move";
  const summary = customerProofPackSummary(handoff.summary);
  const isDeliveryReceipt = handoff.kind === "next_move_delivery_recorded";
  const isPaused = handoff.executionReadiness === "private_handoff_paused";
  const deliveryStatus = isDeliveryReceipt ? handoff.deliveryStatus : null;
  const statusLabel = isDeliveryReceipt
    ? deliveryStatus === "delivered"
      ? "Delivered"
      : deliveryStatus === "needs_channel_connection"
        ? "Needs connection"
        : deliveryStatus === "pending"
          ? "Pending"
          : deliveryStatus === "rejected"
            ? "Needs new decision"
            : "Failed safely"
    : isPaused
      ? "Paused"
      : "Ready";
  const ariaLabel = isDeliveryReceipt
    ? `Delivery receipt ${statusLabel.toLowerCase()}`
    : isPaused
      ? "Launch-ready next step paused"
      : "Launch-ready next step ready";
  const surfaceLabel = ariaLabelPrefix ? `${ariaLabelPrefix} ${ariaLabel}` : ariaLabel;
  const nextStep = handoff.nextStep
    ? customerProofPackSummary(handoff.nextStep)
    : isDeliveryReceipt
      ? "DearMe recorded the delivery receipt for the launched next step."
      : "DearMe prepared the launch-ready brief. Nothing public or external runs until the next governed move is ready.";
  const externalUrl = isDeliveryReceipt && handoff.deliveryStatus === "delivered" ? handoff.deliveryExternalUrl ?? null : null;
  const externalId = isDeliveryReceipt && handoff.deliveryStatus === "delivered" ? handoff.deliveryExternalId ?? null : null;
  const deliveryReceiptSignalLabel = isDeliveryReceipt
    ? deliveryStatus === "delivered"
      ? "Receipt recorded"
      : deliveryStatus === "needs_channel_connection"
        ? "Connection needed"
        : deliveryStatus === "pending"
          ? "Waiting to send"
          : deliveryStatus === "rejected"
            ? "Needs a new decision"
            : "Failed safely"
    : "External action not run";
  const trailingVariant = isDeliveryReceipt
    ? deliveryStatus === "delivered"
      ? "default"
      : deliveryStatus === "rejected" || deliveryStatus === "errored"
        ? "destructive"
        : "secondary"
    : isPaused
      ? "destructive"
      : "secondary";
  const handoffChecklistItems = privateExecutionHandoffChecklist({
    artifact,
    isDeliveryReceipt,
    deliveryStatus: deliveryStatus ?? undefined,
    isPaused,
  });
  const returnCueItems = privateExecutionReturnCue({
    artifact,
    isDeliveryReceipt,
    deliveryStatus: deliveryStatus ?? undefined,
    isPaused,
  });
  const connectionReadinessItems = privateExecutionConnectionReadiness(deliveryStatus ?? undefined);

  return (
    <DearMeFocusSurface aria-label={surfaceLabel} className="space-y-4">
      <DearMeWorkbenchSectionHeader
        icon={ShieldCheck}
        eyebrow={isDeliveryReceipt ? "Delivery receipt" : "Launch-ready next step"}
        title={customerProofPackSummary(handoff.title)}
        description={summary}
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={trailingVariant}>{statusLabel}</Badge>
            <Badge variant="secondary">{deliveryReceiptSignalLabel}</Badge>
            <Badge variant="outline">{artifact}</Badge>
          </div>
        }
      />
      {isDeliveryReceipt && deliveryStatus === "delivered" && (externalId || externalUrl) ? (
        <div className="rounded-md border border-primary/20 bg-background/80 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Result</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {externalId ? <Badge variant="outline">Reference {externalId}</Badge> : null}
            {externalUrl ? (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {deliveryResultLinkLabel(handoff)}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      <DearMeChecklist
        className="grid gap-2 md:grid-cols-3"
        icon={CheckCircle2}
        itemClassName="items-start"
        items={handoffChecklistItems}
        aria-label="Launch handoff checklist"
      />
      <div aria-label="Return cue" className="grid gap-2 md:grid-cols-3">
        {returnCueItems.map((item) => (
          <div key={item.label} className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm text-foreground">{item.body}</p>
          </div>
        ))}
      </div>
      {connectionReadinessItems.length > 0 ? (
        <div aria-label="Before DearMe continues" className="rounded-md border border-border bg-background/80 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Before DearMe continues</p>
          <DearMeChecklist
            className="mt-2 grid gap-2 md:grid-cols-3"
            icon={ShieldCheck}
            itemClassName="items-start bg-muted/20"
            items={connectionReadinessItems}
          />
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="rounded-md border border-primary/20 bg-background/80 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Next</p>
          <p className="mt-1 text-sm text-foreground">{nextStep}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full lg:w-auto"
          onClick={() => issueReference && onOpenIssue(issueReference, handoff.outputId ?? null)}
          disabled={!issueReference}
        >
          Open brief
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Prepared {shortDate(handoff.createdAt)}</p>
    </DearMeFocusSurface>
  );
}

function FirstCycleLiveProgress({
  preview,
  isSample,
  isPending,
}: {
  preview: DearMeFirstCyclePreviewResponse;
  isSample: boolean;
  isPending: boolean;
}) {
  const identityMoment = preview.proofSequence[0];
  const audienceMoment = preview.proofSequence[1];
  const proofMoment = preview.proofSequence[2];
  const moments = preview.liveWorkTrail.length === FIRST_CYCLE_LIVE_PROGRESS_LABELS.length
    ? preview.liveWorkTrail
    : [
        {
          id: "identity-dossier-ready",
          action: FIRST_CYCLE_LIVE_PROGRESS_LABELS[0],
          window: identityMoment?.window ?? "0-30s",
          status: "ready" as const,
          ownerRole: "voice_editor" as const,
          artifact: identityMoment?.preparedArtifact ?? "Voice profile and known-for line",
          receipt: identityMoment?.summary ?? preview.voiceProfile.guidance,
        },
        {
          id: "audience-map-ready",
          action: FIRST_CYCLE_LIVE_PROGRESS_LABELS[1],
          window: audienceMoment?.window ?? "60-120s",
          status: "ready" as const,
          ownerRole: "opportunity_scout" as const,
          artifact: preview.opportunityLead.title,
          receipt: audienceMoment?.summary ?? `${preview.opportunityLead.target} is ready for review before any outreach.`,
        },
        {
          id: "starter-drafts-ready",
          action: FIRST_CYCLE_LIVE_PROGRESS_LABELS[2],
          window: "90s",
          status: "ready" as const,
          ownerRole: "content_producer" as const,
          artifact: preview.portfolioProofCard.title,
          receipt: `${preview.starterPosts.length} proof-backed drafts are staged with proof and voice checks.`,
        },
        {
          id: "private-proof-page-ready",
          action: FIRST_CYCLE_LIVE_PROGRESS_LABELS[3],
          window: proofMoment?.window ?? "3-5min",
          status: "ready" as const,
          ownerRole: "portfolio_builder" as const,
          artifact: proofMoment?.preparedArtifact ?? "Proof page move",
          receipt: proofMoment?.summary ?? preview.sitePreview.approvalBoundary,
        },
        {
          id: "launch-call-ready",
          action: FIRST_CYCLE_LIVE_PROGRESS_LABELS[4],
          window: "Launch call",
          status: "your_call" as const,
          ownerRole: "chief_of_staff" as const,
          artifact: "Launch boundary",
          receipt: preview.approvalBoundary.summary,
        },
      ];
  const headline = isPending
    ? "Your first proof is being prepared."
    : isSample
      ? "See the first five minutes before you start."
      : "Your first five minutes are ready.";
  const description = isPending
    ? "DearMe is turning your sentence into visible progress now. Public moves stay behind your call."
    : isSample
      ? "This sample replay shows the visible path from one sentence to a proof pack."
      : "DearMe prepared the visible first pass: voice, audience, drafts, proof, and the launch call.";
  const badgeLabel = isPending ? "Preparing now" : isSample ? "Sample replay" : "Proof ready";

  function statusLabel(index: number) {
    if (isPending) return index <= 2 ? "Preparing" : "Next";
    if (isSample) return "Sample";
    return FIRST_CYCLE_LIVE_WORK_STATUS_LABELS[moments[index]?.status ?? "ready"];
  }

  return (
    <DearMeWorkbenchCard
      className="mt-5 bg-background/75"
      title={headline}
      description={description}
      badge={<Badge variant={isSample ? "secondary" : "default"}>{badgeLabel}</Badge>}
    >
      <div className="grid gap-3 md:grid-cols-5" aria-label="First five minutes progress">
        {moments.map((moment, index) => (
          <div
            key={moment.id}
            className={cn(
              "flex min-h-52 flex-col rounded-md border p-3",
              isPending && index <= 2
                ? "border-primary/30 bg-primary/5"
                : isSample
                  ? "border-border bg-muted/20"
                  : "border-primary/25 bg-background",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{moment.window}</Badge>
              <Badge variant={isSample ? "secondary" : index === moments.length - 1 ? "outline" : "default"}>
                {statusLabel(index)}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-medium leading-snug">{moment.action}</p>
            <p className="mt-1 text-sm text-foreground/80">{roleLabel(moment.ownerRole)}</p>
            <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{moment.receipt}</p>
            <p className="mt-auto pt-3 text-xs font-medium text-muted-foreground">{moment.artifact}</p>
          </div>
        ))}
      </div>
    </DearMeWorkbenchCard>
  );
}

function FirstCyclePanel({
  intent,
  preview,
  isPending,
  canStartPrivateWork,
  privateWorkStarted,
  onOpenWorkReady,
  onOpenPreview,
  onIntentChange,
  onPreview,
}: {
  intent: string;
  preview: DearMeFirstCyclePreviewResponse | null;
  isPending: boolean;
  canStartPrivateWork: boolean;
  privateWorkStarted: boolean;
  onOpenWorkReady: () => void;
  onOpenPreview: (handle: string) => void;
  onIntentChange: (value: string) => void;
  onPreview: () => void;
}) {
  const firstCycleReceiptMetrics = preview
    ? {
        starterDrafts: preview.starterPosts.length,
        opportunities: preview.opportunityShortlist.length,
        valueReceipts: preview.valueReport.items.length,
        roiRankedOpportunities: preview.opportunityRoiReport.items.length,
      }
    : null;
  const firstCycleStartReceiptText = preview
    ? [
        "DearMe first cycle start receipt",
        `Known-for sentence: ${customerProofPackSummary(intent).trim() || "Not provided"}`,
        `Draft package: ${firstCycleReceiptMetrics?.starterDrafts ?? 0} drafts`,
        `Opportunity shortlist: ${firstCycleReceiptMetrics?.opportunities ?? 0} opportunities`,
        `Value report: ${firstCycleReceiptMetrics?.valueReceipts ?? 0} receipts`,
        `ROI-ranked opportunities: ${firstCycleReceiptMetrics?.roiRankedOpportunities ?? 0} ranked`,
        `Proof page: ${preview.sitePreview.route}`,
        `Voice profile: ${preview.voiceProfile.title} - ${customerProofPackSummary(preview.voiceProfile.guidance)}`,
        `Launch boundary: ${customerProofPackSummary(preview.approvalBoundary.summary)}`,
        "Next: review Work Ready, open the proof page, and make the launch call before anything represents you publicly.",
      ].join("\n")
    : "";
  const downloadFirstCycleStartReceipt = useCallback(() => {
    if (!firstCycleStartReceiptText) return;

    downloadDearMeReceipt(firstCycleStartReceiptText, DEARME_FIRST_CYCLE_START_RECEIPT_FILENAME);
  }, [firstCycleStartReceiptText]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPreview();
  }

  return (
    <DearMePanel aria-label="90-second first cycle">
      <FirstCycleProofPackage
        preview={preview ?? SAMPLE_FIRST_CYCLE_PREVIEW}
        isSample={!preview}
        onOpenPreview={onOpenPreview}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
              {canStartPrivateWork ? "Start first cycle" : "Preview first cycle"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Already preparing
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            DearMe starts with useful brand work: posts, opportunities, proof, and a plan. Public posts, outbound messages, spend, and page changes come back for your final call.
          </p>
          <DearMeChecklist
            className="mt-4 sm:grid-cols-2"
            icon={CheckCircle2}
            items={FIRST_CYCLE_ARTIFACTS}
            aria-label="Prepared first-cycle artifacts"
          />
        </div>
      </div>

      {privateWorkStarted && preview ? (
        <section
          aria-label="First cycle start receipt"
          className="mt-5 rounded-md border border-primary/30 bg-primary/5 p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                First brand cycle started
              </div>
              <p className="mt-1 max-w-3xl text-sm text-foreground/85">
                DearMe has started the first brand cycle from your sentence. Work Ready will update with
                reviewable drafts, the proof page, opportunity work, and the first report; public posts, outreach,
                page changes, and spend still wait for the launch call.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Work started</Badge>
              <Badge variant="outline">Launch call gated</Badge>
              <Badge variant="outline">Target: 5 minutes</Badge>
              <Button type="button" size="sm" variant="outline" onClick={onOpenWorkReady}>
                <FileText className="h-4 w-4" />
                Review Work Ready
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Download ${DEARME_FIRST_CYCLE_START_RECEIPT_FILENAME}`}
                onClick={downloadFirstCycleStartReceipt}
              >
                <Download className="h-4 w-4" />
                Download receipt
              </Button>
              <Button type="button" size="sm" onClick={() => onOpenPreview(preview.sitePreview.handle)}>
                <ExternalLink className="h-4 w-4" />
                Open proof page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {firstCycleReceiptMetrics ? (
            <DearMeMetricStrip className="mt-4 sm:grid-cols-2 lg:grid-cols-5">
              <Metric icon={FileText} label="Draft package" value={`${firstCycleReceiptMetrics.starterDrafts} drafts`} />
              <Metric
                icon={Telescope}
                label="Opportunity shortlist"
                value={`${firstCycleReceiptMetrics.opportunities} opportunities`}
              />
              <Metric
                icon={CheckCircle2}
                label="Value report"
                value={`${firstCycleReceiptMetrics.valueReceipts} receipts`}
              />
              <Metric
                icon={Gauge}
                label="ROI-ranked opportunities"
                value={`${firstCycleReceiptMetrics.roiRankedOpportunities} ranked`}
              />
              <Metric icon={ShieldCheck} label="Launch boundary" value="Call gated" />
            </DearMeMetricStrip>
          ) : null}
          <Textarea
            aria-label="First cycle start receipt note"
            className="mt-4 min-h-40 resize-none bg-background/85 font-mono text-xs leading-relaxed"
            readOnly
            value={firstCycleStartReceiptText}
          />
        </section>
      ) : null}

      <FirstCycleLiveProgress
        preview={preview ?? SAMPLE_FIRST_CYCLE_PREVIEW}
        isSample={!preview}
        isPending={isPending}
      />
    </DearMePanel>
  );
}

function FirstCyclePayoffStrip({
  canStartPrivateWork,
  onFocusFirstCycle,
}: {
  canStartPrivateWork: boolean;
  onFocusFirstCycle: () => void;
}) {
  const actionLabel = canStartPrivateWork ? "Start with one sentence" : "Preview the first brand cycle";

  return (
    <DearMeFocusSurface
      aria-label="First payoff"
      className="overflow-hidden p-0"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4 border-b border-primary/20 bg-background/55 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <DearMeWorkbenchSectionHeader
            icon={Sparkles}
            eyebrow="First payoff"
            title="One sentence starts your brand cycle."
            description="DearMe runs the first brand cycle, returns useful work, then brings back only the call that needs you."
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" className="w-full sm:w-auto" onClick={onFocusFirstCycle}>
              <Sparkles className="h-4 w-4" />
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs font-medium text-muted-foreground">
              One sentence starts the cycle without a tour.
            </p>
          </div>
        </div>
        <DearMeMetricStrip className="p-5 sm:grid-cols-3 sm:p-6 xl:grid-cols-3">
          {FIRST_PAYOFF_STEPS.map((step) => (
            <DearMeWorkbenchCard
              key={step.label}
              eyebrow={step.label}
              title={step.title}
              description={step.description}
              className="bg-background/75"
            />
          ))}
        </DearMeMetricStrip>
      </div>
    </DearMeFocusSurface>
  );
}

function DearMePublicFirstRunLanding({
  intent,
  isPending,
  onIntentChange,
  onOpenLaunchProof,
  onStart,
  onWatchLive,
}: {
  intent: string;
  isPending: boolean;
  onIntentChange: (value: string) => void;
  onOpenLaunchProof: () => void;
  onStart: () => void;
  onWatchLive: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onStart();
  }

  const [preparationCueIndex, setPreparationCueIndex] = useState(0);
  const preparationCue = FIRST_RUN_PREPARATION_CUES[preparationCueIndex] ?? FIRST_RUN_PREPARATION_CUES[0];
  const hasIntent = intent.trim().length > 0;

  useEffect(() => {
    if (import.meta.env.MODE === "test") return undefined;

    const timer = window.setInterval(() => {
      setPreparationCueIndex((index) => (index + 1) % FIRST_RUN_PREPARATION_CUES.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  const liveMoments = SAMPLE_FIRST_CYCLE_PREVIEW.liveWorkTrail;
  const cycleReport = SAMPLE_FIRST_CYCLE_PREVIEW.cycleReport;
  const valueReport = SAMPLE_FIRST_CYCLE_PREVIEW.valueReport;
  const proofReceiptStats = [
    {
      label: `${liveMoments.length} work receipts`,
      summary: "Voice, audience, drafts, proof, and the launch call are visible immediately.",
    },
    {
      label: `${DEARME_FIRST_CYCLE_STARTER_POST_COUNT} starter drafts`,
      summary: "The first packet opens with reviewable content instead of a tour.",
    },
    {
      label: `${SAMPLE_FIRST_CYCLE_PREVIEW.opportunityShortlist.length} opportunity leads`,
      summary: "DearMe prepares concrete next relationships before asking to send anything.",
    },
    {
      label: "Autopilot until launch",
      summary: "Posts, outreach, page changes, and spend wait for one final launch call.",
    },
  ];

  return (
    <section
      aria-label="DearMe public first run"
      className="overflow-hidden rounded-lg border border-primary/30 bg-background"
    >
      <div className="grid min-h-[500px] gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <div className="flex flex-col justify-start gap-5 p-5 sm:p-7 lg:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/25 px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Autonomous personal brand team
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              DearMe grows your personal brand while you work.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              It runs research, drafts, opportunities, proof, and weekly direction, then brings you the launch calls that need your judgment.
            </p>
          </div>

          <form className="max-w-2xl space-y-3" onSubmit={handleSubmit}>
            <FieldLabel htmlFor="dearme-first-cycle-intent" label="What do you want to be known for?" />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                id="dearme-first-cycle-intent"
                value={intent}
                placeholder="Known for turning real work into trusted public proof..."
                autoComplete="off"
                onChange={(event: ChangeEvent<HTMLInputElement>) => onIntentChange(event.target.value)}
              />
              <Button
                type="submit"
                className="h-auto min-h-10 w-full min-w-0 whitespace-normal sm:w-auto sm:max-w-xs"
                disabled={isPending}
              >
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Start my first proof pack
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              One sentence starts the cycle without a tour.
            </p>
            <div
              aria-label="First-run preparation cue"
              className="flex min-h-12 items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  {hasIntent ? "Preparing from your sentence" : "Ready when you are"}
                </p>
                <p className="text-muted-foreground">{preparationCue}</p>
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-10 w-full min-w-0 whitespace-normal sm:w-auto sm:max-w-sm"
              onClick={onWatchLive}
            >
              <Telescope className="h-4 w-4" />
              Watch the team work live
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              The team keeps preparing work; public moves stay behind your launch call.
            </div>
          </div>

          <section
            aria-label="Public launch proof summary"
            className="max-w-3xl rounded-md border border-amber-500/25 bg-amber-50/70 p-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    Public launch is one final call on route, recipient, and move.
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-85">
                  DearMe can prepare the proof now. Anything public stays behind your launch call.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FIRST_RUN_PUBLIC_HOLD_CUES.map((label) => (
                    <Badge key={label} variant="outline" className="bg-background/80">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-9 w-full min-w-0 whitespace-normal bg-background/80 sm:w-auto"
                onClick={onOpenLaunchProof}
              >
                Review launch details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <section
            aria-label="Live proof receipts"
            className="grid max-w-3xl gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="h-4 w-4 text-primary" />
                Watch DearMe prepare brand work live
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The first run shows visible receipts before anything represents you publicly.
              </p>
            </div>
            {proofReceiptStats.map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-background/80 px-3 py-2">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
              </div>
            ))}
          </section>
        </div>

        <aside className="border-t border-border bg-muted/20 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex h-full flex-col justify-center">
            <div className="rounded-lg border border-border bg-background/80 p-4" aria-label="First proof pack">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  First proof pack
                </div>
                <Badge variant="secondary">Working now</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Watch the team research, draft, package proof, and prepare the next launch call before anything represents you publicly.
              </p>
              <div className="mt-5 space-y-3">
                {liveMoments.map((moment, index) => (
                  <div
                    key={moment.id}
                    className="grid gap-3 rounded-md border border-border bg-background px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{customerProofPackSummary(moment.action)}</p>
                        <Badge variant="outline">{roleLabel(moment.ownerRole)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{customerProofPackSummary(moment.receipt)}</p>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">{customerProofPackSummary(moment.artifact)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-border pt-4" aria-label="First-run workroom queues">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your workroom opens with
                  </p>
                  <Badge variant="outline">{customerProofPackSummary(cycleReport.title)}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {cycleReport.items.map((item) => (
                    <div key={item.id} className="grid gap-1 rounded-md bg-muted/35 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{customerProofPackSummary(item.label)}</p>
                        <Badge variant="outline">{FIRST_CYCLE_REPORT_STATUS_LABELS[item.status]}</Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{customerProofPackSummary(item.summary)}</p>
                      <p className="text-xs font-medium text-foreground/75">{customerProofPackSummary(item.source)}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{customerProofPackSummary(cycleReport.closingLine)}</p>
              </div>
              <div className="mt-4 border-t border-border pt-4" aria-label="First-cycle value report">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Value visible in five minutes
                  </p>
                  <Badge variant="outline">{customerProofPackSummary(valueReport.title)}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {customerProofPackSummary(valueReport.summary)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{customerProofPackSummary(valueReport.period)}</Badge>
                  <Badge variant="outline">{customerProofPackSummary(valueReport.closingLine)}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {valueReport.items.map((item) => (
                    <div key={item.id} className="grid gap-1 rounded-md bg-muted/35 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{customerProofPackSummary(item.label)}</p>
                        <Badge variant="secondary">{customerProofPackSummary(item.metric)}</Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{customerProofPackSummary(item.summary)}</p>
                      <p className="text-xs font-medium text-foreground/75">{customerProofPackSummary(item.source)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function FirstCycleProofPackage({
  preview,
  isSample,
  onOpenPreview,
}: {
  preview: DearMeFirstCyclePreviewResponse;
  isSample: boolean;
  onOpenPreview: (handle: string) => void;
}) {
  const previewWithValueReport = withDearMeFirstCycleRuntimeDefaults(preview);
  const valueReport = previewWithValueReport.valueReport;

  return (
    <div className="space-y-4" aria-label={isSample ? "Sample first-cycle proof package" : "First-cycle proof package"}>
	      {isSample ? (
	        <div className="flex flex-col gap-2 rounded-md border border-border bg-background/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
	          <div>
	            <Badge variant="secondary">Sample team package</Badge>
	            <p className="mt-1 text-sm text-muted-foreground">
	              Maya's team prepared posts, one opportunity, a proof card, and a first plan.
	            </p>
	          </div>
	          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proof preview</span>
	        </div>
	      ) : null}

	      <DearMeWorkbenchCard
	        title="First-run proof sequence"
	        description="One sentence becomes an identity dossier, audience map, and proof page before DearMe asks for the next call."
	        badge={<Sparkles className="h-4 w-4 text-muted-foreground" />}
	      >
        <div className="grid gap-3 md:grid-cols-3">
          {previewWithValueReport.proofSequence.map((moment) => (
            <div key={moment.window} className="rounded-md border border-border bg-muted/20 p-3">
              <Badge variant="outline">{moment.window}</Badge>
	              <p className="mt-3 text-sm font-medium">{customerProofPackSummary(moment.title)}</p>
	              <p className="mt-1 text-sm text-muted-foreground">{customerProofPackSummary(moment.summary)}</p>
	              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
	                <p><span className="font-medium text-foreground/80">Prepared:</span> {customerProofPackSummary(moment.preparedArtifact)}</p>
	                {moment.sourceLabel ? (
	                  <p><span className="font-medium text-foreground/80">From:</span> {customerProofPackSummary(moment.sourceLabel)}</p>
	                ) : null}
	                <p><span className="font-medium text-foreground/80">Launch call:</span> {customerProofPackSummary(moment.approvalBoundary)}</p>
	              </div>
            </div>
          ))}
        </div>
      </DearMeWorkbenchCard>

      <DearMeWorkbenchCard
        title="Live work receipts"
        description="Each first-run step names who worked, what changed, and what artifact is ready."
        badge={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-3 lg:grid-cols-5" aria-label="First-run live work receipts">
          {previewWithValueReport.liveWorkTrail.map((item) => (
            <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.window}</Badge>
                <Badge variant={item.status === "your_call" ? "secondary" : "default"}>
                  {FIRST_CYCLE_LIVE_WORK_STATUS_LABELS[item.status]}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-medium">{customerProofPackSummary(item.action)}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{roleLabel(item.ownerRole)}</p>
	              <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{customerProofPackSummary(item.receipt)}</p>
	              <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{customerProofPackSummary(item.artifact)}</p>
            </div>
          ))}
        </div>
      </DearMeWorkbenchCard>

      <DearMeWorkbenchCard
        title={customerProofPackSummary(previewWithValueReport.cycleReport.title)}
        description={customerProofPackSummary(previewWithValueReport.cycleReport.summary)}
        badge={<FileText className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="First-cycle report">
          {previewWithValueReport.cycleReport.items.map((item) => (
            <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === "blocked" ? "secondary" : "outline"}>
                  {FIRST_CYCLE_REPORT_STATUS_LABELS[item.status]}
                </Badge>
                <Badge variant="outline">{roleLabel(item.ownerRole)}</Badge>
              </div>
	              <p className="mt-3 text-sm font-medium">{customerProofPackSummary(item.label)}</p>
	              <p className="mt-2 text-xs text-muted-foreground">{customerProofPackSummary(item.summary)}</p>
	              {item.nextCall ? (
	                <p className="mt-3 text-xs text-muted-foreground">{customerProofPackSummary(item.nextCall)}</p>
	              ) : null}
	              <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">{customerProofPackSummary(item.source)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{customerProofPackSummary(previewWithValueReport.cycleReport.closingLine)}</p>
      </DearMeWorkbenchCard>

      <DearMeWorkbenchCard
        title={customerProofPackSummary(valueReport.title)}
        description={customerProofPackSummary(valueReport.summary)}
        badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Measured window</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {customerProofPackSummary(valueReport.period)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customerProofPackSummary(valueReport.closingLine)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="First-cycle value report">
            {valueReport.items.map((item) => (
              <div key={item.id} className="flex min-h-44 flex-col rounded-md border border-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.count} {customerProofPackSummary(item.unit)}</Badge>
                  <Badge variant="outline">{roleLabel(item.ownerRole)}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{customerProofPackSummary(item.label)}</p>
                <p className="mt-1 text-xs font-medium text-foreground/80">{customerProofPackSummary(item.metric)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{customerProofPackSummary(item.summary)}</p>
                <p className="mt-auto pt-3 text-xs font-medium text-foreground/80">
                  {customerProofPackSummary(item.source)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DearMeWorkbenchCard>

      {isSample ? (
        <div className="space-y-3" aria-label="Sample delivery receipt replay">
          <DearMeWorkbenchSectionHeader
            icon={ShieldCheck}
            eyebrow="Delivery receipts"
	            title="Launched work comes back with a result"
	            description="The sample first run shows one post delivered and one staged send held until its channel is connected."
          />
          <div className="grid gap-3 xl:grid-cols-2">
            {SAMPLE_FIRST_CYCLE_DELIVERY_RECEIPTS.map((receipt) => (
              <PrivateExecutionHandoffPanel
                key={receipt.id}
                handoff={receipt}
                onOpenIssue={() => onOpenPreview(previewWithValueReport.sitePreview.handle)}
                ariaLabelPrefix="Sample"
              />
            ))}
          </div>
        </div>
      ) : null}

      <DearMeWorkbenchCard
        title={previewWithValueReport.voiceProfile.title}
        description={previewWithValueReport.voiceProfile.guidance}
        badge={
          <Badge variant={previewWithValueReport.voiceProfile.status === "ready_for_gate" ? "default" : "secondary"}>
            {previewWithValueReport.voiceProfile.status === "ready_for_gate" ? "Voice ready" : "Needs samples"}
          </Badge>
        }
      >
        <div className="flex flex-wrap gap-2">
          {previewWithValueReport.voiceProfile.draftTone.map((tone) => (
            <Badge key={tone} variant="outline">{tone}</Badge>
          ))}
        </div>
      </DearMeWorkbenchCard>

      <VoiceGatePanel gate={previewWithValueReport.voiceGate} />

      <DearMeWorkbenchCard
        title={customerProofPackSummary(previewWithValueReport.autonomyPlan.label)}
        description={customerProofPackSummary(previewWithValueReport.autonomyPlan.summary)}
        badge={<Workflow className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.5fr)]">
          <DearMeChecklist
            className="sm:grid-cols-2"
            icon={CheckCircle2}
            items={previewWithValueReport.autonomyPlan.autonomousSteps.map((step) => customerProofPackSummary(step.title))}
            itemClassName="bg-background/60"
            aria-label="Autonomous first-cycle steps"
          />
          <div className="rounded-md border border-border bg-muted/20 p-3">
	            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Launch calls only</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {previewWithValueReport.autonomyPlan.waitsFor.map((gate) => (
                <Badge key={gate} variant="outline">{RISK_GATE_LABELS[gate]}</Badge>
              ))}
            </div>
          </div>
        </div>
      </DearMeWorkbenchCard>

      <DearMeWorkbenchCard
        title={customerProofPackSummary(previewWithValueReport.continuationPlan.title)}
        description={customerProofPackSummary(previewWithValueReport.continuationPlan.summary)}
        badge={<Badge variant="outline">{CADENCE_LABELS[previewWithValueReport.continuationPlan.cadence]}</Badge>}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next review</p>
            <p className="mt-2 text-sm font-medium text-foreground">{customerProofPackSummary(previewWithValueReport.continuationPlan.nextReview)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              DearMe keeps the next pass warm before it asks for another launch call.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {previewWithValueReport.continuationPlan.items.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">{customerProofPackSummary(item.title)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{customerProofPackSummary(item.summary)}</p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
	                  <p><span className="font-medium text-foreground/80">Prepared:</span> {customerProofPackSummary(item.preparedArtifact)}</p>
	                  <p><span className="font-medium text-foreground/80">Launch call:</span> {customerProofPackSummary(item.approvalBoundary)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DearMeWorkbenchCard>

      <section className="grid gap-3 lg:grid-cols-3">
        {previewWithValueReport.starterPosts.map((post) => (
          <DearMeWorkbenchCard
            key={post.id}
            title={customerProofPackSummary(post.title)}
            description={customerProofPackSummary(post.body)}
            badge={<Badge variant="outline">{CHANNEL_LABELS[post.channel]}</Badge>}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground/80">{customerProofPackSummary(post.hook)}</p>
              <Badge variant="outline" className="h-auto max-w-full justify-start whitespace-normal text-left leading-snug">
                Source proof: {post.proofUsed}
              </Badge>
            </div>
          </DearMeWorkbenchCard>
        ))}
      </section>

      <DearMeWorkbenchCard
        eyebrow="Opportunity ROI"
        title={customerProofPackSummary(previewWithValueReport.opportunityRoiReport.title)}
        description={customerProofPackSummary(previewWithValueReport.opportunityRoiReport.summary)}
        badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
        aria-label="Opportunity ROI report"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {previewWithValueReport.opportunityRoiReport.items.map((item) => (
            <div key={item.id} className="flex min-h-52 flex-col rounded-md border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{item.score}/100</Badge>
                <Badge variant="outline">
                  {item.priority === "launch_first"
                    ? "Launch-call candidate"
                    : item.priority === "verify_contact"
                      ? "Verify contact"
                      : "Warm intro path"}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">{customerProofPackSummary(item.leadTitle)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{customerProofPackSummary(item.target)}</p>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground/80">Return:</span> {customerProofPackSummary(item.expectedReturn)}</p>
                <p><span className="font-medium text-foreground/80">Effort:</span> {customerProofPackSummary(item.effort)}</p>
                <p><span className="font-medium text-foreground/80">Confidence:</span> {customerProofPackSummary(item.confidence)}</p>
                <p><span className="font-medium text-foreground/80">Next:</span> {customerProofPackSummary(item.nextAction)}</p>
              </div>
              <p className="mt-auto pt-3 text-xs font-medium text-foreground/75">{customerProofPackSummary(item.source)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {customerProofPackSummary(previewWithValueReport.opportunityRoiReport.closingLine)}
        </p>
      </DearMeWorkbenchCard>

      <section className="grid gap-3 lg:grid-cols-3">
        <DearMeWorkbenchCard
          eyebrow="Opportunity shortlist"
	          title="Five launch-ready targets"
	          description="Contact evidence, fit reasons, outreach angles, and first messages are staged until you choose the send path."
          badge={<Users className="h-4 w-4 text-muted-foreground" />}
          className="lg:col-span-2"
          aria-label="Opportunity shortlist"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {previewWithValueReport.opportunityShortlist.map((lead, index) => (
              <div key={`${lead.title}-${lead.target}`} className="border-l border-border pl-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Lead {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{lead.title}</p>
                    <p className="text-xs text-muted-foreground">{lead.target}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="secondary" className="h-auto">
                      {lead.relevanceScore}/10
                    </Badge>
                    <Badge
                      variant={
                        lead.contactEvidence.status === "verified"
                          ? "default"
                          : lead.contactEvidence.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                      className="h-auto"
                    >
                      {lead.contactEvidence.status === "verified"
                        ? "Contact verified"
                        : lead.contactEvidence.status === "pending"
                          ? "Contact pending"
                          : "No direct contact"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Contact evidence</p>
                    <p className="mt-1 text-foreground/80">
                      {[
                        lead.contactEvidence.contactEmail,
                        lead.contactEvidence.contactHandle,
                        lead.contactEvidence.contactUrl,
                      ].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(" · ") ||
                        "No direct contact record yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Fit reason</p>
                    <p className="mt-1 text-foreground/80">{lead.whyRelevant}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Source signal</p>
                    <p className="mt-1 text-foreground/80">{lead.contactEvidence.sourceSignal}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Outreach angle</p>
                    <p className="mt-1 text-foreground/80">{lead.outreachAngle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">First message</p>
                    <p className="mt-1 text-foreground/80">{lead.draftMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DearMeWorkbenchCard>
        <DearMeWorkbenchCard
          eyebrow="Portfolio proof card"
          title={previewWithValueReport.portfolioProofCard.placement}
          description={customerProofPackSummary(previewWithValueReport.portfolioProofCard.proposedCopy)}
          badge={<FileText className="h-4 w-4 text-muted-foreground" />}
          action={
            !isSample ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenPreview(previewWithValueReport.sitePreview.handle)}
              >
                Open proof preview
              </Button>
            ) : null
          }
        >
          <div className="space-y-2">
            <Badge variant="outline" className="h-auto max-w-full justify-start whitespace-normal text-left leading-snug">
              Source proof: {previewWithValueReport.portfolioProofCard.proofSource}
            </Badge>
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proof preview</p>
              <p className="mt-1 text-sm text-foreground/80">{previewWithValueReport.sitePreview.route}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ready when you choose to launch. The preview stays internal until then.
              </p>
            </div>
          </div>
        </DearMeWorkbenchCard>
        <DearMeWorkbenchCard
          eyebrow="First growth plan"
          title="First growth plan"
          description={customerProofPackSummary(previewWithValueReport.growthPlan.summary)}
          badge={<Gauge className="h-4 w-4 text-muted-foreground" />}
        />
      </section>

      <DearMeWorkbenchCard
        title={previewWithValueReport.approvalBoundary.label}
        description={previewWithValueReport.approvalBoundary.summary}
        badge={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
      >
        <DearMeChecklist
          className="sm:grid-cols-2"
          icon={CheckCircle2}
          items={preview.approvalBoundary.blockedActions}
          itemClassName="bg-background/60"
          aria-label="Launch boundary actions"
        />
      </DearMeWorkbenchCard>

      {preview.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {preview.warnings[0]}
        </div>
      ) : null}
    </div>
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
    return item.kind === "cycle_brief" ? "Open brand work" : "Open work";
  }
  return null;
}

function liveFeedStateGuidance(item: DearMeWorkbenchStreamItem) {
  if (item.needsApproval || item.status === "decision_needed" || item.status === "ready_for_review") {
    return "A launch call is ready before anything represents you.";
  }
  if (item.status === "working" || item.kind === "work_in_motion") {
    return "The team keeps preparing before the next launch call.";
  }
  if (item.kind === "memory_recorded") {
    return "DearMe is saving what should guide future brand work.";
  }
  if (item.kind === "report_ready") {
    return "A concise update is ready to read.";
  }
  if (item.status === "recorded" || item.kind === "progress_recorded") {
    return "This update is recorded for the next brand cycle.";
  }
  if (item.status === "blocked") {
    return "The team needs a clearer path before this can continue.";
  }
  if (item.status === "cancelled") {
    return "This move has stopped and will not represent you.";
  }
  return "DearMe keeps working until a launch decision is needed.";
}

function liveFeedReviewableOutputId(item: DearMeWorkbenchStreamItem) {
  if (!item.relatedOutputId) return null;
  if (
    item.needsApproval ||
    item.status === "decision_needed" ||
    item.status === "ready_for_review" ||
    item.reviewLoop?.state === "needs_user_review"
  ) {
    return item.relatedOutputId;
  }
  return null;
}

function liveFeedSectionId(item: DearMeWorkbenchStreamItem): LiveFeedSectionId {
  if (item.needsApproval || item.status === "decision_needed" || item.status === "ready_for_review") {
    return "needs_call";
  }
  if (item.status === "working" || item.kind === "cycle_brief" || item.kind === "work_in_motion") {
    return "in_motion";
  }
  return "recent";
}

function buildLiveFeedSections(items: DearMeWorkbenchStreamItem[]): LiveFeedSection[] {
  const sections: LiveFeedSection[] = LIVE_FEED_SECTIONS.map((section) => ({ ...section, items: [] }));
  const sectionsById = new Map(sections.map((section) => [section.id, section]));

  for (const item of items) {
    sectionsById.get(liveFeedSectionId(item))?.items.push(item);
  }

  return sections.filter((section) => section.items.length > 0);
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
      (focus.outputId && decision.outputId === focus.outputId) ||
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

function batchPreparedOutputId(batch: DearMeWorkbenchBatchDecision): string | null {
  const outputDecision = batch.decisionIds.find((decisionId) => decisionId.startsWith("output:"));
  return outputDecision ? outputDecision.slice("output:".length) : null;
}

function batchPreparedOutputReviewLoop(
  batch: DearMeWorkbenchBatchDecision,
  workbench: DearMeWorkbenchResponse,
): DearMeOutputReviewLoop | null {
  const outputId = batchPreparedOutputId(batch);
  if (!outputId) return null;

  return (
    workbench.decisionsNeeded.find((decision) => decision.outputId === outputId)?.reviewLoop ??
    workbench.workReady.find((item) => item.id === outputId)?.reviewLoop ??
    workbench.activeWork.find((item) => item.id === outputId)?.reviewLoop ??
    workbench.workStream.find((item) => item.relatedOutputId === outputId)?.reviewLoop ??
    null
  );
}

const FOCUSED_DECISION_SURFACE_CLASSNAME = "scroll-mt-4 pb-24 sm:pb-5";
const FOCUSED_DECISION_ACTION_GROUP_CLASSNAME = "mt-4 grid grid-cols-1 gap-2";
const FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME = "h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left leading-snug";
const PREPARED_WORK_DECISION_OUTCOMES: Array<{
  key: string;
  icon: LucideIcon;
  label: string;
  summary: string;
}> = [
  {
    key: "launch",
    icon: CheckCircle2,
    label: "Launch",
    summary: "DearMe records approval, prepares the handoff, and keeps public posts, sends, page changes, and spend behind the boundary.",
  },
  {
    key: "changes",
    icon: MessageSquare,
    label: "Request changes",
    summary: "Your note becomes the next brief; the team revises without asking you to manage a task.",
  },
  {
    key: "pass",
    icon: RefreshCw,
    label: "Another pass",
    summary: "DearMe keeps the goal, reuses the proof, and prepares a fresh version for review.",
  },
  {
    key: "direction",
    icon: XCircle,
    label: "New direction",
    summary: "DearMe stops spending cycles on this angle and resets the next useful move.",
  },
];
const APPROVAL_DECISION_OUTCOMES: Array<{
  key: string;
  icon: LucideIcon;
  label: string;
  summary: string;
}> = [
  {
    key: "launch",
    icon: CheckCircle2,
    label: "Launch",
    summary: "DearMe records the launch call and prepares the private handoff; external action still waits for the approved channel or account.",
  },
  {
    key: "changes",
    icon: RefreshCw,
    label: "Request changes",
    summary: "The move goes back to the team with your note, proof, and launch boundary intact.",
  },
  {
    key: "reject",
    icon: XCircle,
    label: "Reject",
    summary: "DearMe stops this move and keeps the brand team pointed at a safer next option.",
  },
];
const FOCUSED_DECISION_NOTE_STARTERS: Array<{
  key: string;
  icon: LucideIcon;
  label: string;
  note: string;
}> = [
  {
    key: "voice",
    icon: Gauge,
    label: "Voice feels off",
    note: "Make this sound more like me before it represents me.",
  },
  {
    key: "proof",
    icon: FileText,
    label: "Need stronger proof",
    note: "Attach stronger proof for the claim before moving forward.",
  },
  {
    key: "private",
    icon: ShieldCheck,
    label: "Keep it staged",
    note: "Keep this staged and prepare another pass before launch.",
  },
];

function FocusedDecisionNoteStarters({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (note: string) => void;
}) {
  return (
    <div aria-label="Fast feedback notes" className="mt-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground">Fast feedback</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FOCUSED_DECISION_NOTE_STARTERS.map((starter) => {
          const StarterIcon = starter.icon;

          return (
            <Button
              key={starter.key}
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-8 min-w-0 whitespace-normal text-left text-xs"
              onClick={() => onSelect(starter.note)}
              disabled={disabled}
            >
              <StarterIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {starter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function DecisionOutcomeMap({
  outcomes,
  className,
  compact = false,
}: {
  outcomes: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    summary: string;
  }>;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      aria-label="Decision outcome map"
      className={cn("rounded-md border border-border bg-muted/20", compact ? "p-2" : "p-3", className)}
    >
      <p className="text-xs font-medium text-muted-foreground">After your call</p>
      <div className={cn("mt-2 grid sm:grid-cols-2", compact ? "gap-1.5" : "gap-2")}>
        {outcomes.map((outcome) => {
          const OutcomeIcon = outcome.icon;

          return (
            <div key={outcome.key} className="min-w-0 rounded-md border border-border bg-background/80 p-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <OutcomeIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {outcome.label}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{outcome.summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FocusedPreparedWorkReviewControls({
  outputId,
  noteId,
  description,
  disabledReason,
  compact = false,
  isReviewable = true,
  reviewState,
  onReviewOutput,
}: {
  outputId: string | null;
  noteId: string;
  description: string;
  disabledReason?: string;
  compact?: boolean;
  isReviewable?: boolean;
  reviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const [decisionNote, setDecisionNote] = useState("");
  const decisionNoteRef = useRef("");
  const isReviewingOutput = Boolean(outputId && reviewState.isPending && reviewState.outputId === outputId);
  const canReview = Boolean(outputId) && isReviewable && !isReviewingOutput;
  const pendingAction = isReviewingOutput ? reviewState.action : null;

  useEffect(() => {
    decisionNoteRef.current = "";
    setDecisionNote("");
  }, [outputId]);

  function updateDecisionNote(nextDecisionNote: string) {
    decisionNoteRef.current = nextDecisionNote;
    setDecisionNote(nextDecisionNote);
  }

  function review(action: DearMeOutputReviewAction) {
    if (!outputId) return;
    onReviewOutput(outputId, action, decisionNoteRef.current);
  }

  return (
    <div
      className={cn(
        "mt-4 rounded-md border border-border bg-background/80",
        compact ? "p-3" : "p-4",
      )}
    >
      <FieldLabel
        htmlFor={noteId}
        label="What should your team do next?"
        hint={canReview ? "Launch boundary" : "Waiting"}
      />
      <p className="text-xs text-muted-foreground">
        {canReview ? description : disabledReason ?? "This prepared work is not ready for a decision yet."}
      </p>
      <Textarea
        id={noteId}
        aria-label="DearMe prepared work review note"
        rows={compact ? 2 : 3}
        value={decisionNote}
        placeholder="Optional note for your team."
        onChange={(event) => updateDecisionNote(event.target.value)}
        disabled={!canReview}
        className="mt-3"
      />
      <FocusedDecisionNoteStarters disabled={!canReview} onSelect={updateDecisionNote} />
      <DecisionOutcomeMap outcomes={PREPARED_WORK_DECISION_OUTCOMES} compact={compact} className="mt-3" />
      <div
        className={FOCUSED_DECISION_ACTION_GROUP_CLASSNAME}
        data-dearme-mobile-action-group="prepared-work-review"
      >
        <Button
          type="button"
          size="sm"
          className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
          onClick={() => review("approve")}
          disabled={!canReview}
        >
          {pendingAction === "approve" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Launch this work
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
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
          className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
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
          className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
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
  );
}

function StuckWorkRecoveryCard({
  loop,
  onOpenVoiceMemory,
}: {
  loop: DearMeOutputReviewLoop;
  onOpenVoiceMemory: () => void;
}) {
  if (!isReviewLoopStuck(loop)) return null;

  return (
    <div
      aria-label="Focused stuck work recovery"
      className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">This path is capped until direction improves.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Do not spend another blind pass. Add better Voice & Memory context, or hand support the account context before the next attempt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onOpenVoiceMemory}>
            <Sparkles className="h-4 w-4" />
            Open Voice & Memory
          </Button>
          <Button type="button" variant="outline" onClick={scrollToDearMeSupportHandoff}>
            <LifeBuoy className="h-4 w-4" />
            Open support handoff
          </Button>
        </div>
      </div>
    </div>
  );
}

function FocusedDecisionPanel({
  decision,
  batch,
  batchReviewLoop,
  workItem,
  onOpenDecision,
  onOpenBatch,
  onOpenWorkItem,
  onOpenVoiceMemory,
  onReviewApproval,
  onReviewOutput,
  reviewState,
  outputReviewState,
}: {
  decision: DearMeWorkbenchDecision | null;
  batch: DearMeWorkbenchBatchDecision | null;
  batchReviewLoop: DearMeOutputReviewLoop | null;
  workItem: DearMeWorkbenchWorkItem | null;
  onOpenDecision: (decision: DearMeWorkbenchDecision) => void;
  onOpenBatch: (batch: DearMeWorkbenchBatchDecision) => void;
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) => void;
  onOpenVoiceMemory: () => void;
  onReviewApproval: (
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) => void;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
  reviewState: DearMeApprovalReviewState;
  outputReviewState: DearMeOutputReviewState;
}) {
  const [decisionNote, setDecisionNote] = useState("");
  const decisionNoteRef = useRef("");

  function updateDecisionNote(nextDecisionNote: string) {
    decisionNoteRef.current = nextDecisionNote;
    setDecisionNote(nextDecisionNote);
  }

  if (decision) {
    const isReviewingDecision = reviewState.isPending && reviewState.approvalId === decision.approvalId;
    return (
      <DearMeFocusSurface aria-label="Focused decision" className={FOCUSED_DECISION_SURFACE_CLASSNAME}>
        <DearMeWorkbenchSectionHeader
          icon={ShieldCheck}
          eyebrow="Decision focused"
          title={customerProofPackSummary(decision.title)}
          description={customerProofPackSummary(decision.summary)}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={decision.riskGate ? "secondary" : "outline"}>
                {decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Launch"}
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
              {decision.outputKind ? OUTPUT_KIND_LABELS[decision.outputKind] : "Brand team decision"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">State</p>
            <p className="mt-1 text-sm">
              {decision.reviewLoop ? reviewLoopStateLabel(decision.reviewLoop) : decision.status === "pending" ? "Waiting on launch call" : "Ready for review"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Launch boundary</p>
            <p className="mt-1 text-sm">The team keeps preparing; public launch stays behind your boundary.</p>
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
              onChange={(event) => updateDecisionNote(event.target.value)}
            />
            <FocusedDecisionNoteStarters
              disabled={isReviewingDecision}
              onSelect={updateDecisionNote}
            />
            <DecisionOutcomeMap outcomes={APPROVAL_DECISION_OUTCOMES} className="mt-3" />
            <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Your team prepared the move. Your call sets the launch boundary.
              </p>
              <div
                className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end"
                data-dearme-mobile-action-group="approval-review"
              >
                <Button
                  type="button"
                  size="sm"
                  className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
                  onClick={() => onReviewApproval(decision.approvalId!, "approve", decisionNoteRef.current)}
                  disabled={isReviewingDecision}
                >
                  {isReviewingDecision && reviewState.action === "approve" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Launch prepared move
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
                  onClick={() => onReviewApproval(decision.approvalId!, "request_revision", decisionNoteRef.current)}
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
                  className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
                  onClick={() => onReviewApproval(decision.approvalId!, "reject", decisionNoteRef.current)}
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
            <Button
              type="button"
              size="sm"
              className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
              onClick={() => onOpenDecision(decision)}
            >
              Review in DearMe
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DearMeFocusSurface>
    );
  }

  if (batch) {
    const outputId = batchPreparedOutputId(batch);
    const isStuck = isReviewLoopStuck(batchReviewLoop);
    return (
      <DearMeFocusSurface aria-label="Focused decision" className={FOCUSED_DECISION_SURFACE_CLASSNAME}>
        <DearMeWorkbenchSectionHeader
          icon={ShieldCheck}
          eyebrow="Decision focused"
          title={customerProofPackSummary(batch.title)}
          description={customerProofPackSummary(batch.summary)}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={batch.riskGate ? "secondary" : "outline"}>
                {batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review"}
              </Badge>
              <Badge variant="outline">
                {batch.itemCount} item{batch.itemCount === 1 ? "" : "s"}
              </Badge>
              {batchReviewLoop ? <ReviewLoopBadges loop={batchReviewLoop} /> : null}
            </div>
          }
        />
        <DearMeEvidenceGrid className="mt-4">
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Next move</p>
            <p className="mt-1 text-sm">{customerProofPackSummary(batch.actionLabel)}</p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Updated</p>
            <p className="mt-1 text-sm">{shortDate(batch.updatedAt)}</p>
          </div>
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Launch boundary</p>
            <p className="mt-1 text-sm">Prepared for your call. You choose what ships.</p>
          </div>
        </DearMeEvidenceGrid>
        {batchReviewLoop ? (
          <>
            <ReviewLoopNextStep loop={batchReviewLoop} className="mt-4" />
            <ReviewHandoffCard loop={batchReviewLoop} className="mt-4" />
            <StuckWorkRecoveryCard loop={batchReviewLoop} onOpenVoiceMemory={onOpenVoiceMemory} />
          </>
        ) : null}
        {outputId ? (
          <FocusedPreparedWorkReviewControls
            outputId={outputId}
            noteId="dearme-focused-batch-output-note"
            description="DearMe prepared the work for your call. Launch what represents you, send changes back to the team, ask for another pass, or choose a new direction."
            disabledReason={isStuck ? REVIEW_LOOP_STUCK_DISABLED_REASON : undefined}
            isReviewable={!isStuck}
            reviewState={outputReviewState}
            onReviewOutput={onReviewOutput}
          />
        ) : (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
              onClick={() => onOpenBatch(batch)}
            >
              {customerProofPackSummary(batch.actionLabel)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DearMeFocusSurface>
    );
  }

  if (workItem) {
    const isStuck = isReviewLoopStuck(workItem.reviewLoop);

    return (
      <DearMeFocusSurface aria-label="Focused decision" className={FOCUSED_DECISION_SURFACE_CLASSNAME}>
        <DearMeWorkbenchSectionHeader
          icon={FileText}
          eyebrow="Work focused"
          title={customerProofPackSummary(workItem.title)}
          description={customerProofPackSummary(workItem.summary)}
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
        <StuckWorkRecoveryCard loop={workItem.reviewLoop} onOpenVoiceMemory={onOpenVoiceMemory} />
        <div className="mt-4 grid gap-3 sm:flex sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">Prepared by {roleLabel(workItem.ownerRole)}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={FOCUSED_DECISION_ACTION_BUTTON_CLASSNAME}
            onClick={() => onOpenWorkItem(workItem, reviewLoopRouteIntent(workItem.reviewLoop))}
          >
            {reviewLoopActionLabel(workItem.reviewLoop) ?? "Review prepared work"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <FocusedPreparedWorkReviewControls
          outputId={workItem.id}
          noteId="dearme-focused-work-output-note"
          description="Review this launch-ready item in place. Keep it moving, request changes, or choose the boundary for what represents you."
          disabledReason={isStuck ? REVIEW_LOOP_STUCK_DISABLED_REASON : "This lane is still preparing; DearMe will bring it back when it needs your call."}
          isReviewable={!isStuck && (workItem.status === "ready_for_review" || workItem.reviewLoop.state === "needs_user_review")}
          reviewState={outputReviewState}
          onReviewOutput={onReviewOutput}
        />
      </DearMeFocusSurface>
    );
  }

  return (
    <DearMeFocusSurface
      aria-label="Focused decision"
      className={FOCUSED_DECISION_SURFACE_CLASSNAME}
      tone="empty"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4" />
        Decision focus unavailable
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The selected item is no longer waiting here. The current decision list is still below.
      </p>
    </DearMeFocusSurface>
  );
}

function OutputSourceEvidenceList({
  output,
  limit = 3,
  compact = false,
  showEmptyState = false,
  className,
}: {
  output: DearMeOutputItem;
  limit?: number;
  compact?: boolean;
  showEmptyState?: boolean;
  className?: string;
}) {
  const evidence = output.sourceEvidence
    .map((item) => ({
      ...item,
      label: customerProofPackSummary(item.label).trim(),
      summary: customerProofPackSummary(item.summary).trim(),
    }))
    .filter((item) => item.label.length > 0 || item.summary.length > 0)
    .slice(0, limit);

  if (evidence.length === 0) {
    if (!showEmptyState) return null;
    return (
      <DearMeEmptyState
        className={className}
        icon={FileText}
        title="No Voice & Memory context yet"
        description="Add one real voice sample, proof point, or launch boundary before trusting public-facing work."
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/80",
        compact ? "p-2" : "p-3",
        className,
      )}
      aria-label="Sources behind prepared work"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Sources behind this work
      </div>
      <div className={cn("mt-2 grid gap-2", !compact && evidence.length > 1 ? "sm:grid-cols-2" : "")}>
        {evidence.map((item) => (
          <div key={`${output.id}:source:${item.kind}`} className="min-w-0">
            <Badge variant="outline" className="max-w-full truncate">
              {item.label}
            </Badge>
            <p className={cn("mt-1 text-foreground/85", compact ? "line-clamp-2 text-xs" : "text-sm")}>
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FocusedOutputPanel({
  output,
  entryIntent,
  reviewState,
  onOpenVoiceMemory,
  onReviewOutput,
}: {
  output: DearMeOutputItem;
  entryIntent?: DearMeReviewEntryIntent | null;
  reviewState: DearMeOutputReviewState;
  onOpenVoiceMemory: () => void;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const preview = outputPreview(output);
  const details = outputReviewDetails(output);
  const voiceGate = primaryOutputVoiceGate(output);
  const entryGuidance = reviewEntryGuidance(entryIntent, output.reviewLoop);
  const [decisionNote, setDecisionNote] = useState("");
  const decisionNoteRef = useRef("");
  const isStuck = isReviewLoopStuck(output.reviewLoop);
  const isReviewingOutput = reviewState.isPending && reviewState.outputId === output.id;
  const canReview = output.isReviewable && !isStuck && !isReviewingOutput;
  const pendingAction = isReviewingOutput ? reviewState.action : null;

  useEffect(() => {
    decisionNoteRef.current = "";
    setDecisionNote("");
  }, [output.id]);

  function updateDecisionNote(nextDecisionNote: string) {
    decisionNoteRef.current = nextDecisionNote;
    setDecisionNote(nextDecisionNote);
  }

  function review(action: DearMeOutputReviewAction) {
    onReviewOutput(output.id, action, decisionNoteRef.current);
  }

  return (
    <DearMeFocusSurface className="mt-4" aria-label="Focused work">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Focused work"
        title={customerProofPackSummary(output.title)}
        description={customerProofPackSummary(output.summary)}
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
          {customerProofPackSummary(preview)}
        </p>
      ) : null}

      {details.length > 0 ? (
        <DearMeEvidenceGrid className="mt-4" columns="two">
          {details.map((detail) => (
            <div key={`${output.id}:focused:${detail.kind}`} className="rounded-md border border-border bg-background/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">{customerProofPackSummary(detail.label)}</p>
              <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(detail.value)}</p>
            </div>
          ))}
        </DearMeEvidenceGrid>
      ) : null}

      <OutputSourceEvidenceList output={output} showEmptyState className="mt-4" />

      {voiceGate ? <VoiceCheckPanel gate={voiceGate} className="mt-4" /> : null}

      <ReviewLoopNextStep loop={output.reviewLoop} className="mt-4" />
      <ReviewHandoffCard loop={output.reviewLoop} className="mt-4" />
      <ReviewAppliedFeedbackCard loop={output.reviewLoop} className="mt-4" />
      <StuckWorkRecoveryCard loop={output.reviewLoop} onOpenVoiceMemory={onOpenVoiceMemory} />

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
          hint={isStuck ? "Direction needed" : output.isReviewable ? "Launch boundary" : "Waiting"}
        />
        <p className="text-xs text-muted-foreground">
          {isStuck ? REVIEW_LOOP_STUCK_DISABLED_REASON : "Your team prepares the moves. You choose what represents you."}
        </p>
        <Textarea
          id="dearme-focused-output-note"
          rows={3}
          value={decisionNote}
          onChange={(event) => updateDecisionNote(event.target.value)}
          placeholder="Optional note for the team"
          disabled={!canReview}
          className="mt-3"
        />
        <FocusedDecisionNoteStarters disabled={!canReview} onSelect={updateDecisionNote} />
        <DecisionOutcomeMap outcomes={PREPARED_WORK_DECISION_OUTCOMES} className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => review("approve")} disabled={!canReview}>
            {pendingAction === "approve" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Launch this work
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
          {output.documents.length} proof reference{output.documents.length === 1 ? "" : "s"} prepared
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

function privateWorkActionAriaLabel(output: DearMeOutputItem) {
  const actionLabel = privateWorkActionLabel(output);
  const title = customerProofPackSummary(output.title).trim();
  return title ? `${actionLabel} ${title}` : actionLabel;
}

function workReadyNextStepLabel(status: DearMeOutputStatus) {
  if (status === "ready_for_review") {
    return "Open it, then launch, request changes, ask for another pass, or choose a new direction.";
  }
  if (status === "complete") return "Use it as proof or keep it in your history.";
  if (status === "blocked") return "Review what is blocking the team before more brand work continues.";
  if (status === "working") return "Track the lane; DearMe will bring it back here when it is ready.";
  if (status === "queued") return "No action yet; the team will prepare this before asking for the launch call.";
  return "Open it to see what changed and decide whether DearMe should continue.";
}

function decisionAfterCallLabel(riskGate?: DearMeWorkbenchDecision["riskGate"] | DearMeWorkbenchBatchDecision["riskGate"]) {
  if (riskGate) {
    return "Launched work moves forward inside the boundary; changes go back to the brand team.";
  }
  return "Your call updates the review path so the team knows what to use, revise, or stop.";
}

type DearMeSourceReviewItem = DearMeWorkbenchMemory["sourceReviewQueue"][number];
type DearMeSourceReviewFocus = {
  id: string;
  requestId: number;
};

const DEARME_MEMORY_FORM_ID = "dearme-memory-form";

function sourceReviewCardDomId(id: string) {
  return `dearme-source-review-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function SourceReviewDetailPanel({
  item,
  isPending,
  onEdit,
  onDismiss,
  onClose,
}: {
  item: DearMeSourceReviewItem;
  isPending: boolean;
  onEdit: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const sourceHref = privateSourceLink(item.sourceInputMode, item.sourceLabel);

  return (
    <aside
      aria-label="Source review detail"
      className="rounded-md border border-primary/30 bg-background p-4 shadow-sm lg:sticky lg:top-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Source detail</p>
          <h3 className="mt-1 text-base font-semibold leading-snug">
            {customerProofPackSummary(item.sourceTitle)}
          </h3>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode]}</Badge>
        <Badge variant="outline">{MEMORY_KIND_LABELS[item.proposedKind]}</Badge>
        {item.sourceLabel ? (
          <Badge variant="outline">{sourceLabelForChip(item.sourceLabel)}</Badge>
        ) : null}
        <Badge variant="outline">{shortDate(item.createdAt)}</Badge>
      </div>

      {sourceHref ? (
        <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Source</p>
          <PrivateSourceLink href={sourceHref} className="mt-1" />
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium text-muted-foreground">What DearMe found</p>
        <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(item.summary)}</p>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="rounded-md border border-border bg-background/80 p-3">
          <p className="text-xs font-medium text-muted-foreground">Prepared fact</p>
          <p className="mt-1 text-sm font-medium">{customerProofPackSummary(item.proposedTitle)}</p>
          <p className="mt-2 text-sm text-foreground/85">{customerProofPackSummary(item.proposedBody)}</p>
        </div>
        <div className="rounded-md border border-border bg-background/80 p-3">
          <p className="text-xs font-medium text-muted-foreground">Your call</p>
          <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(item.nextAction)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button type="submit" form={DEARME_MEMORY_FORM_ID} disabled={isPending}>
          {isPending ? "Saving..." : "Save reviewed fact"}
        </Button>
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit in form
        </Button>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDismiss}>
          <XCircle className="h-4 w-4" />
          Not useful
        </Button>
      </div>
    </aside>
  );
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
    batchDecisions: DearMeWorkbenchBatchDecision[];
    activeWork: DearMeWorkbenchWorkItem[];
    memory: DearMeWorkbenchMemory;
  };
  paidBetaActive: boolean;
}) {
  const decisionCount =
    workbench.decisionsNeeded.length +
    workbench.batchDecisions.length +
    workbench.memory.sourceReviewQueue.length;

  return (
    <DearMePanel aria-label="Your brand team today">
      <DearMeWorkbenchSectionHeader
        icon={Users}
        eyebrow="Your brand team today"
        title={workbench.headline}
        description={customerProofPackSummary(workbench.summary)}
        trailing={
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Working now" : "Brand work locked"}
          </Badge>
        }
      />

      <DearMeMetricStrip className="mt-5">
        <Metric icon={FileText} label="Ready now" value={workbench.workReady.length} />
        <Metric icon={ShieldCheck} label="Launch calls" value={decisionCount} />
        <Metric icon={Workflow} label="In motion" value={workbench.activeWork.length} />
        <Metric icon={Users} label="Teammates" value={workbench.team.length} />
      </DearMeMetricStrip>
    </DearMePanel>
  );
}

function TeamProofPackContinuityRibbon({ workbench }: { workbench: DearMeWorkbenchResponse }) {
  const nextWork = workbench.workReady[0] ?? workbench.activeWork[0] ?? null;
  const nextBatchDecision = workbench.batchDecisions[0] ?? null;
  const nextApprovalDecision = workbench.decisionsNeeded[0] ?? null;
  const nextSourceReview = workbench.memory.sourceReviewQueue[0] ?? null;
  const decisionCount =
    workbench.decisionsNeeded.length +
    workbench.batchDecisions.length +
    workbench.memory.sourceReviewQueue.length;
  const report = workbench.report;
  const reportIsPacketBacked = report ? isPacketBackedReport(report) : false;
  const continuitySummary = reportIsPacketBacked
    ? "One proof pack is feeding today's briefing, ready work, and your launch call."
    : "Voice & Memory, prepared work, and launch calls stay connected while the team keeps moving.";
  const decisionTitle =
    nextBatchDecision?.title ??
    nextApprovalDecision?.title ??
    nextSourceReview?.proposedTitle ??
    "No launch call waiting";
  const packetFocusTitle = nextWork
    ? customerProofPackSummary(nextWork.title)
    : report
      ? customerProofPackSummary(report.title)
      : "Proof pack";
  const packetNextMove = report
    ? `${OUTPUT_STATUS_LABELS[report.status]} weekly letter`
    : nextWork
      ? customerProofPackSummary(nextWork.summary)
      : "brand work";
  const packetLaunchCall = decisionCount > 0
    ? customerProofPackSummary(decisionTitle)
    : "clear until the next public move";

  return (
    <section
      aria-label="Daily brand cycle"
      className="rounded-md border border-primary/25 bg-background/80 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Daily brand cycle
          </div>
          <p className="mt-1 max-w-3xl text-sm text-foreground/85">
            {continuitySummary}
          </p>
          <div className="mt-3 grid gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <p className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">Current proof pack</span>
              <span className="block truncate font-medium text-foreground">{packetFocusTitle}</span>
            </p>
            <ArrowRight className="hidden h-4 w-4 text-primary/70 sm:block" aria-hidden="true" />
            <p className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">Next move</span>
              <span className="block truncate font-medium text-foreground">{packetNextMove}</span>
            </p>
            <ArrowRight className="hidden h-4 w-4 text-primary/70 sm:block" aria-hidden="true" />
            <p className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground">Launch call</span>
              <span className="block truncate font-medium text-foreground">{packetLaunchCall}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Briefing updated</Badge>
          <Badge variant="outline">Launch rules active</Badge>
        </div>
      </div>
    </section>
  );
}

function TeamFocusWorkbenchPanel({
  workbench,
  paidBetaActive,
  livePulse,
  canStartPrivateWork,
  onOpenNextDecision,
  onFocusFirstCycle,
}: {
  workbench: DearMeWorkbenchResponse;
  paidBetaActive: boolean;
  livePulse?: DearMeLiveTeamPulse | null;
  canStartPrivateWork: boolean;
  onOpenNextDecision: () => void;
  onFocusFirstCycle: () => void;
}) {
  const latestProof = workbench.workStream[0] ?? workbench.recentProgress[0] ?? null;
  const nextMove = workbench.activeWork[0] ?? workbench.workReady[0] ?? null;
  const nextBatchDecision = workbench.batchDecisions[0] ?? null;
  const nextApprovalDecision = workbench.decisionsNeeded[0] ?? null;
  const nextSourceReview = workbench.memory.sourceReviewQueue[0] ?? null;
  const primaryMember = workbench.team[0] ?? null;
  const nextDecision = nextBatchDecision ?? nextApprovalDecision ?? nextSourceReview ?? null;
  const nextDecisionTitle =
    customerProofPackSummary(
      nextBatchDecision?.title ??
        nextApprovalDecision?.title ??
        nextSourceReview?.proposedTitle ??
        "No decision waiting",
    );
  const nextDecisionSummary =
    customerProofPackSummary(
      nextBatchDecision?.summary ??
        nextApprovalDecision?.summary ??
        nextSourceReview?.nextAction ??
        "Your team can keep preparing brand work.",
    );
  const workCount = workbench.workReady.length + workbench.activeWork.length;
  const decisionCount =
    workbench.decisionsNeeded.length +
    workbench.batchDecisions.length +
    workbench.memory.sourceReviewQueue.length;
  const firstCycleActionLabel = canStartPrivateWork
    ? "Start with one sentence"
    : "Preview the first brand cycle";
  const reviewPath = [
    {
      icon: FileText,
      label: "Ready from the cycle",
      title: nextMove ? customerProofPackSummary(nextMove.title) : "Start the first brand cycle",
      detail: nextMove
        ? customerProofPackSummary(nextMove.summary)
        : "One sentence gives the team enough to prepare the first reviewable work.",
    },
    {
      icon: ShieldCheck,
      label: "Launch call",
      title: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "No call waiting",
      detail: decisionCount > 0
        ? nextDecisionSummary
        : "The team can keep moving until a public or external move needs you.",
    },
    {
      icon: Workflow,
      label: "Autonomous lane",
      title: livePulse ? "Working now" : workCount > 0 ? "Brand work moving" : "Ready to begin",
      detail: livePulse?.description ??
        (workCount > 0
          ? "Prepared assets stay in motion while public moves remain gated."
          : "The first brand cycle starts from one sentence."),
    },
  ];
  const returnHandoff: Array<{
    icon: LucideIcon;
    label: string;
    title: string;
    detail: string;
  }> = [
    {
      icon: Gauge,
      label: "What moved",
      title: latestProof
        ? customerProofPackSummary(latestProof.title)
        : workbench.report
          ? customerProofPackSummary(workbench.report.title)
          : "No proof move yet",
      detail: latestProof
        ? customerProofPackSummary(latestProof.summary)
        : workbench.report
          ? "The latest letter is ready as your proof receipt."
          : "Start with one sentence and DearMe will create the first proof receipts.",
    },
    {
      icon: ShieldCheck,
      label: "What needs you",
      title: decisionCount > 0 ? pluralizeCount(decisionCount, "launch call") : "Nothing public is waiting",
      detail: decisionCount > 0
        ? nextDecisionSummary
        : "Brand work can continue without asking you to launch a public move.",
    },
    {
      icon: Workflow,
      label: "What continues",
      title: livePulse
        ? livePulse.title
        : workCount > 0
          ? pluralizeCount(workCount, "brand lane")
          : "First cycle can start",
      detail: livePulse?.description ??
        (workCount > 0
          ? "Drafts, scouting, proof, and reporting keep moving until a launch call is ready."
          : "One sentence is enough to start the first brand cycle."),
    },
    {
      icon: FileText,
      label: "Proof saved",
      title: workbench.report
        ? customerProofPackSummary(workbench.report.title)
        : latestProof
          ? "Proof is being gathered"
          : "No proof pack yet",
      detail: workbench.report
        ? customerProofPackSummary(workbench.report.summary)
        : latestProof
          ? "The current work trail is already visible in your proof feed."
          : "The first report appears after DearMe has a brand cycle to summarize.",
    },
  ];

  return (
    <DearMeFocusSurface aria-label="Today's brand team focus" className="space-y-5">
      <DearMeWorkbenchSectionHeader
        icon={Sparkles}
        eyebrow="Today's operating focus"
        title="Dear me, your brand team worked while you were away."
        description="DearMe keeps the brand cycle moving: drafts, reports, opportunities, proof, and weekly direction. Public posts, outbound messages, spend, and page changes become launch calls under your rules."
        trailing={
          <div className="flex flex-col gap-2 sm:items-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {livePulse
                ? "Brand work moving"
                : paidBetaActive
                  ? "Team working"
                  : "Brand work locked"}
            </Badge>
            <Button type="button" size="sm" onClick={onFocusFirstCycle}>
              <Sparkles className="h-4 w-4" />
              {firstCycleActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <section aria-label="When you come back" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
          When you come back
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {returnHandoff.map((item) => {
            const ItemIcon = item.icon;

            return (
              <div key={item.label} className="rounded-md border border-border bg-background/75 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <ItemIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <TeamProofPackContinuityRibbon workbench={workbench} />

      <section aria-label="Today's review path" className="grid gap-3 md:grid-cols-3">
        {reviewPath.map((step) => {
          const StepIcon = step.icon;

          return (
            <div key={step.label} className="rounded-md border border-border bg-background/75 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <StepIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                {step.label}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
            </div>
          );
        })}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <DearMeWorkbenchCard
          eyebrow="Today's brand cycle"
          title={latestProof ? customerProofPackSummary(latestProof.title) : "Your team is ready to start"}
          description={
            latestProof
              ? customerProofPackSummary(latestProof.summary)
              : "Create the full profile and the first brand cycle will begin here."
          }
          badge={<Workflow className="h-4 w-4 text-muted-foreground" />}
          footer={
            <div className={cn("grid gap-3", livePulse ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2")}>
              {livePulse ? (
                <div className="rounded-md border border-primary/25 bg-primary/5 p-3 sm:col-span-2 xl:col-span-1">
                  <p className="text-xs font-medium text-muted-foreground">Working now</p>
                  <p className="mt-1 text-sm font-medium">{livePulse.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{livePulse.description}</p>
                </div>
              ) : null}
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Next prepared move</p>
                <p className="mt-1 text-sm font-medium">
                  {nextMove ? customerProofPackSummary(nextMove.title) : "Private growth cycle"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextMove
                    ? customerProofPackSummary(nextMove.summary)
                    : "Your team will prepare the first reviewable assets."}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Teammate focus</p>
                <p className="mt-1 text-sm font-medium">{primaryMember?.name ?? "Chief of Staff"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {primaryMember?.currentFocus ?? "Keeping the next brand cycle narrow and reviewable."}
                </p>
              </div>
            </div>
          }
        />

        <div className="grid gap-3">
          <DearMeWorkbenchCard
            eyebrow="Next decision"
            title={nextDecisionTitle}
            description={nextDecisionSummary}
            badge={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
            footer={
              nextDecision ? (
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="outline" onClick={onOpenNextDecision}>
                    Open next decision
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null
            }
          />
          <div className="rounded-md border border-border bg-background/70 p-3">
            <p className="text-xs font-medium text-muted-foreground">Work ready</p>
            <p className="mt-1 text-sm font-medium">
              {workCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prepared assets and active lanes your team can keep moving.
            </p>
          </div>
        </div>
      </div>
    </DearMeFocusSurface>
  );
}

function isOpportunityWorkItem(item: DearMeWorkbenchWorkItem): boolean {
  return item.outputKind === "opportunity_drafts" || item.ownerRole === "opportunity_scout";
}

function isOpportunityStreamItem(item: DearMeWorkbenchStreamItem): boolean {
  return item.role === "opportunity_scout" || item.relatedOutputId?.includes("opportunity_drafts") === true;
}

function OpportunityWorkbenchPanel({
  workbench,
  paidBetaActive,
  onOpenWorkItem,
}: {
  workbench: DearMeWorkbenchResponse;
  paidBetaActive: boolean;
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) => void;
}) {
  const opportunityItems = [...workbench.workReady, ...workbench.activeWork].filter(isOpportunityWorkItem);
  const currentItem = opportunityItems[0] ?? null;
  const readyItems = opportunityItems.filter((item) => item.status === "ready_for_review");
  const activeItems = opportunityItems.filter((item) => item.status !== "ready_for_review");
  const opportunityFeed = workbench.workStream.filter(isOpportunityStreamItem).slice(0, 3);
  const sendDecisions = [
    ...workbench.batchDecisions.filter((batch) => batch.riskGate === "send_email"),
    ...workbench.decisionsNeeded.filter((decision) => decision.riskGate === "send_email"),
  ];
  const canOpenCurrent = currentItem ? Boolean(workItemTarget(currentItem)) : false;
  const currentIntent = currentItem ? reviewLoopRouteIntent(currentItem.reviewLoop) : null;

  return (
    <DearMeFocusSurface aria-label="Opportunity command center" className="space-y-5">
	    <DearMeWorkbenchSectionHeader
	      icon={Telescope}
	      eyebrow="Opportunity Scout"
	      title="Opportunities, ready before outreach."
	      description="DearMe turns memory, proof, and public signals into prepared targets, angles, and first messages. Outbound sends stay behind your launch call."
	      trailing={
	        <Badge variant={paidBetaActive ? "default" : "secondary"}>
	          {paidBetaActive ? "Scouting now" : "Setup needed"}
	        </Badge>
	      }
      />

      <DearMeMetricStrip>
        <Metric icon={Telescope} label="Lead batches" value={opportunityItems.length} />
        <Metric icon={CheckCircle2} label="Ready" value={readyItems.length} />
        <Metric icon={Workflow} label="In motion" value={activeItems.length} />
        <Metric icon={ShieldCheck} label="Launch calls" value={sendDecisions.length} />
      </DearMeMetricStrip>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <DearMeWorkbenchCard
          eyebrow="Current opportunity draft"
          title={currentItem ? customerProofPackSummary(currentItem.title) : "Scout the next practical opening"}
          description={
            currentItem
              ? customerProofPackSummary(currentItem.summary)
              : "Ask the Chief of Staff to find customers, collaborators, podcasts, jobs, or warm introductions for this week."
          }
          badge={<Telescope className="h-4 w-4 text-muted-foreground" />}
          footer={
            currentItem ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {customerProofPackSummary(currentItem.reviewLoop.nextStep)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={currentItem.status === "ready_for_review" ? "default" : "outline"}
                  disabled={!canOpenCurrent}
                  onClick={() => onOpenWorkItem(currentItem, currentIntent)}
                >
                  {workReadyActionLabel(currentItem.status, currentItem.reviewLoop)}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null
          }
        >
          <DearMeEvidenceGrid>
            <div className="rounded-md border border-border bg-background/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">What the scout prepares</p>
              <p className="mt-1 text-sm text-foreground/85">
                Target, contact evidence, fit reason, outreach angle, first message, and follow-up plan.
              </p>
            </div>
	      <div className="rounded-md border border-border bg-background/80 p-3">
	        <p className="text-xs font-medium text-muted-foreground">Launch boundary</p>
	        <p className="mt-1 text-sm text-foreground/85">
	          Message sends stay behind the prepared target, angle, draft, and your launch call.
	        </p>
	      </div>
          </DearMeEvidenceGrid>
        </DearMeWorkbenchCard>

        <div className="grid gap-3">
          <DearMeWorkbenchCard
            eyebrow="Why it matters"
            title="Openings become next moves"
            description={OUTPUT_KIND_VALUE_LABELS.opportunity_drafts}
            badge={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <DearMeWorkbenchCard
            eyebrow="Default ask"
            title="One useful reason to talk"
            description="Each draft ties the recipient signal to your proof and leaves one small next step for review."
            badge={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {opportunityFeed.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {opportunityFeed.map((item) => (
            <DearMeWorkbenchCard
              key={item.id}
              eyebrow={roleLabel(item.role)}
              title={customerProofPackSummary(item.title)}
              description={customerProofPackSummary(item.summary)}
              badge={<Badge variant="outline">{WORKSTREAM_STATUS_LABELS[item.status]}</Badge>}
            >
              <p className="rounded-md border border-border bg-background/80 p-2 text-xs text-muted-foreground">
                {customerProofPackSummary(item.nextAction)}
              </p>
            </DearMeWorkbenchCard>
          ))}
        </div>
      ) : null}
    </DearMeFocusSurface>
  );
}

function TeamOperatingPolicyPanel({
  workbench,
  paidBetaActive,
  paidBetaCohort,
  paidBetaCohortCompanyNames,
  paidBetaCohortLoading,
  paidBetaCohortError,
  supportHandoffPending,
  supportHandoffResult,
  supportHandoffError,
  emptyWeekRecoveryPending,
  emptyWeekRecoveryResult,
  emptyWeekRecoveryError,
  onStartEmptyWeekRecovery,
  onHandleSupportHandoff,
  onOpenEmptyWeekRecoveryIssue,
  onOpenSupportHandoffIssue,
  onOpenVoiceMemory,
  onOpenLaunchProof,
  onOpenPaidBetaAccount,
}: {
  workbench: DearMeWorkbenchResponse;
  paidBetaActive: boolean;
  paidBetaCohort: DearMePaidBetaCohortSummary | null;
  paidBetaCohortCompanyNames: Record<string, string>;
  paidBetaCohortLoading: boolean;
  paidBetaCohortError: string | null;
  supportHandoffPending: boolean;
  supportHandoffResult: DearMeChiefOfStaffMessageResult | null;
  supportHandoffError: string | null;
  emptyWeekRecoveryPending: boolean;
  emptyWeekRecoveryResult: DearMeChiefOfStaffMessageResult | null;
  emptyWeekRecoveryError: string | null;
  onStartEmptyWeekRecovery: (message: string) => void;
  onHandleSupportHandoff: (message: string) => void;
  onOpenEmptyWeekRecoveryIssue: (issueReference: string) => void;
  onOpenSupportHandoffIssue: (issueReference: string) => void;
  onOpenVoiceMemory: () => void;
  onOpenLaunchProof: () => void;
  onOpenPaidBetaAccount: (companyId: string) => void;
}) {
  const decisionCount =
    workbench.decisionsNeeded.length +
    workbench.batchDecisions.length +
    workbench.memory.sourceReviewQueue.length;
  const reviewLoopContexts: Array<{
    title: string;
    summary: string;
    issueReference: string | null;
    reviewLoop: DearMeOutputReviewLoop | null;
  }> = [
    ...workbench.workReady.map((item) => ({
      title: item.title,
      summary: item.summary,
      issueReference: item.issueIdentifier ?? item.issueId,
      reviewLoop: item.reviewLoop,
    })),
    ...workbench.activeWork.map((item) => ({
      title: item.title,
      summary: item.summary,
      issueReference: item.issueIdentifier ?? item.issueId,
      reviewLoop: item.reviewLoop,
    })),
    ...workbench.decisionsNeeded.map((item) => ({
      title: item.title,
      summary: item.summary,
      issueReference: item.issueIdentifier ?? item.issueId,
      reviewLoop: item.reviewLoop,
    })),
    ...workbench.workStream.map((item) => ({
      title: item.title,
      summary: item.summary,
      issueReference: item.issueIdentifier ?? item.issueId,
      reviewLoop: item.reviewLoop,
    })),
  ];
  const activeReviewLoopContexts = reviewLoopContexts.filter(
    (context): context is {
      title: string;
      summary: string;
      issueReference: string | null;
      reviewLoop: DearMeOutputReviewLoop;
    } =>
      Boolean(context.reviewLoop),
  );
  const reviewLoops = activeReviewLoopContexts.map((context) => context.reviewLoop);
  const staleLoopContexts = activeReviewLoopContexts.filter(
    (context) =>
      context.reviewLoop.state === "retry_limit_reached" ||
      context.reviewLoop.attemptCount >= context.reviewLoop.maxAttempts,
  );
  const staleLoopCount = reviewLoops.filter(
    (loop) => loop.state === "retry_limit_reached" || loop.attemptCount >= loop.maxAttempts,
  ).length;
  const staleLoopSignal = staleLoopContexts.length > 0
    ? staleLoopContexts
      .slice(0, 2)
      .map((context) => {
        const path = `${customerProofPackSummary(context.title)}: ${customerProofPackSummary(context.summary)}`;
        return `${path} (${context.reviewLoop.attemptCount}/${context.reviewLoop.maxAttempts} attempts)`;
      })
      .join("; ")
    : "No stopped path";
  const staleLoopWorkReference = staleLoopContexts.find((context) => context.issueReference)?.issueReference ?? null;
  const maxAttempts = reviewLoops.reduce((largest, loop) => Math.max(largest, loop.maxAttempts), 3);
  const spendCheckpointCount = workbench.recentProgress.filter(
    (item) => item.kind === "spend_checkpoint",
  ).length;
  const latestSpendCheckpoint =
    workbench.recentProgress.find((item) => item.kind === "spend_checkpoint") ?? null;
  const latestLedgerEntry = workbench.runLedger[0] ?? null;
  const supportDecisionSignal = decisionCount > 0
    ? pluralizeCount(decisionCount, "waiting decision")
    : "No waiting decisions";
  const supportLatestContextReady = paidBetaActive && Boolean(latestLedgerEntry);
  const supportWorkSignal = supportLatestContextReady && latestLedgerEntry
    ? customerProofPackSummary(latestLedgerEntry.title)
    : paidBetaActive
      ? "First paid cycle ready"
      : "Trial preview only";
  const supportCostSignal = latestSpendCheckpoint
    ? customerProofPackSummary(latestSpendCheckpoint.summary)
    : "No spend checkpoint yet";
  const visibleOutputCount =
    workbench.workReady.length +
    workbench.activeWork.length +
    (workbench.report ? 1 : 0);
  const opportunityProofCount = [...workbench.workReady, ...workbench.activeWork]
    .filter(isOpportunityWorkItem).length;
  const weeklyValueStatus = !paidBetaActive
    ? "Ready after access"
    : visibleOutputCount > 0
      ? "On track"
      : "Needs recovery";
  const weeklyValueVariant: "default" | "secondary" = paidBetaActive && visibleOutputCount > 0
    ? "default"
    : "secondary";
  const voiceConfidence = Math.round(workbench.memory.voiceProfile.confidence);
  const accountHealthStatus = !paidBetaActive
    ? "Ready after access"
    : visibleOutputCount > 0 && voiceConfidence >= 50
      ? "Healthy enough to retain"
      : "Needs recovery";
  const accountHealthVariant: "default" | "secondary" = paidBetaActive && visibleOutputCount > 0 && voiceConfidence >= 50
    ? "default"
    : "secondary";
  const emptyWeekRecoveryActive = paidBetaActive && visibleOutputCount === 0;
  const recoveryCandidate =
    workbench.activeWork[0] ??
    workbench.workStream.find((item) => item.kind === "work_in_motion") ??
    workbench.workStream.find((item) => item.kind === "progress_recorded") ??
    null;
  const emptyWeekRecoveryStatus = !paidBetaActive
    ? "Ready after access"
    : emptyWeekRecoveryActive
      ? "Recovery needed"
      : "No empty week";
  const emptyWeekRecoveryVariant: "default" | "secondary" | "outline" = emptyWeekRecoveryActive
    ? "secondary"
    : paidBetaActive
      ? "outline"
      : "secondary";
  const retentionPulseStatus = !paidBetaActive
    ? "Ready after access"
    : emptyWeekRecoveryActive
      ? "At risk"
      : staleLoopCount > 0
        ? "Needs direction"
        : visibleOutputCount > 0 && voiceConfidence >= 50
          ? "Retainable this week"
          : "Watch closely";
  const retentionPulseVariant: "default" | "secondary" | "outline" =
    paidBetaActive && visibleOutputCount > 0 && voiceConfidence >= 50 && staleLoopCount === 0
      ? "default"
      : paidBetaActive
        ? "secondary"
        : "outline";
  const retentionRiskReason = !paidBetaActive
    ? "Paid beta access is not active yet."
    : emptyWeekRecoveryActive
      ? "No useful customer-visible output is ready this week."
      : staleLoopCount > 0
        ? "A repeated path needs clearer direction before more effort is spent."
        : voiceConfidence < 50
          ? "Voice confidence is below the paid-account health threshold."
          : decisionCount > 0
            ? "Launch calls are waiting, so customer value depends on the next review."
            : "Useful work, voice fit, and operating receipts are visible.";
  const retentionOwnerSignal = !paidBetaActive
    ? "Sales"
    : emptyWeekRecoveryActive
      ? "Recovery"
      : staleLoopCount > 0
        ? "Support"
        : decisionCount > 0
          ? "Customer call"
          : "DearMe";
  const supportFollowUpSignal = !paidBetaActive
    ? "After access"
    : emptyWeekRecoveryActive
      ? "Same-day make-good"
      : staleLoopCount > 0
        ? "Before another pass"
        : decisionCount > 0
          ? "Before launch call"
          : "Next check-in";
  const supportFollowUpText = !paidBetaActive
    ? "Follow up after paid beta access is recorded."
    : emptyWeekRecoveryActive
      ? "Same-day make-good before the next customer check-in."
      : staleLoopCount > 0
        ? "Before another pass, hand support the stuck path and clearer direction before more effort."
        : decisionCount > 0
          ? "Before the launch call, help the customer choose launch, revise, pause, or another pass."
          : "Keep a customer-safe note ready for the next paid-account check-in.";
  const retentionPulseItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "customer-value",
      icon: CheckCircle2,
      label: "Customer value",
      signal: paidBetaActive
        ? visibleOutputCount > 0
          ? `${visibleOutputCount} visible`
          : "No output yet"
        : "Access first",
      summary: visibleOutputCount > 0
        ? "The account has customer-visible drafts, work, or report value for the next check-in."
        : "Recovery should create one useful item before this account is treated as healthy.",
      variant: paidBetaActive && visibleOutputCount > 0 ? "default" : "secondary",
    },
    {
      key: "voice-risk",
      icon: Sparkles,
      label: "Voice risk",
      signal: `Voice ${voiceConfidence}%`,
      summary: voiceConfidence >= 50
        ? "Voice & Memory is strong enough for paid-account review, and still keeps learning from corrections."
        : "Add stronger Voice & Memory before this account relies on generated work.",
      variant: voiceConfidence >= 50 ? "default" : "secondary",
    },
    {
      key: "review-risk",
      icon: ShieldCheck,
      label: "Review risk",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "No call waiting",
      summary: decisionCount > 0
        ? "Customer value is prepared, but the launch boundary still needs a clear call."
        : "No public, outbound, spend, or page-changing move is waiting on the customer right now.",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "risk-owner",
      icon: LifeBuoy,
      label: "Risk owner",
      signal: retentionOwnerSignal,
      summary: retentionRiskReason,
      variant: emptyWeekRecoveryActive || staleLoopCount > 0 ? "secondary" : "outline",
    },
  ];
  const retentionPulseText = [
    "DearMe paid retention pulse",
    `Status: ${retentionPulseStatus}`,
    `Customer value: ${retentionPulseItems[0]?.signal ?? "Access first"} - ${retentionPulseItems[0]?.summary ?? "Recovery should create one useful item before this account is treated as healthy."}`,
    `Voice risk: ${retentionPulseItems[1]?.signal ?? `Voice ${voiceConfidence}%`} - ${retentionPulseItems[1]?.summary ?? "Add stronger Voice & Memory before this account relies on generated work."}`,
    `Review risk: ${retentionPulseItems[2]?.signal ?? "No call waiting"} - ${retentionPulseItems[2]?.summary ?? "No public, outbound, spend, or page-changing move is waiting on the customer right now."}`,
    `Retention owner: ${retentionOwnerSignal}`,
    `Risk reason: ${retentionRiskReason}`,
    `Next support step: ${supportFollowUpText}`,
    emptyWeekRecoveryActive
      ? "Action: open same-day recovery before the next customer check-in."
      : staleLoopCount > 0
        ? "Action: open the stuck work or support handoff before another repeated path spends more effort."
        : "Action: keep the next paid-account check-in note ready.",
    "Boundary: DearMe can keep preparing private work; public sends, launches, spend, account changes, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadRetentionPulseReceipt = useCallback(() => {
    downloadDearMeReceipt(retentionPulseText, DEARME_PAID_RETENTION_PULSE_RECEIPT_FILENAME);
  }, [retentionPulseText]);
  const supportHandoffLines = [
    "DearMe support handoff",
    `Account: ${paidBetaActive ? "Paid beta active" : "Waiting for paid beta access"}`,
    `Latest work: ${supportWorkSignal}`,
    `Decisions: ${supportDecisionSignal}`,
    `Recovery: ${staleLoopCount > 0 ? "Needs clearer direction before another pass" : "Self-correcting paths are within limits"}`,
    `Stuck path: ${staleLoopSignal}`,
    `Cost: ${supportCostSignal}`,
    `Follow-up: ${supportFollowUpText}`,
    "Boundary: no public send, launch, spend, account change, or irreversible move without the final call.",
  ];
  const supportHandoffText = supportHandoffLines.join("\n");
  const downloadSupportHandoffReceipt = useCallback(() => {
    downloadDearMeReceipt(supportHandoffText, DEARME_SUPPORT_HANDOFF_RECEIPT_FILENAME);
  }, [supportHandoffText]);
  const supportHandoffActionDisabled = !paidBetaActive || supportHandoffPending;
  const policyLabel = !paidBetaActive
    ? "Brand work locked"
    : decisionCount > 0
      ? "Launch call ready"
      : staleLoopCount > 0
        ? "Needs clearer direction"
        : "Team can continue";
  const policyTitle = !paidBetaActive
    ? "Brand work starts after paid beta access is active."
    : decisionCount > 0
      ? "The team can continue, and external moves stay behind your call."
      : staleLoopCount > 0
        ? "The team stops repeated paths and asks for better direction."
        : "The team can keep preparing brand work inside your guardrails.";
  const readinessItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "private-proof",
      icon: CheckCircle2,
      label: "Brand cycle",
      signal: paidBetaActive ? "Usable now" : "Paid beta needed",
      summary: paidBetaActive
        ? "DearMe can keep drafting, scouting, reporting, and packaging proof while you work."
        : "Activate paid beta before the brand team starts moving.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "public-launch",
      icon: XCircle,
      label: "Public launch",
      signal: "Not ready yet",
      summary:
        "Public posts, outbound messages, page changes, and spend still need live channel receipts plus your launch call.",
      variant: "secondary",
    },
    {
      key: "next-step",
      icon: ArrowRight,
      label: "Next best step",
      signal: decisionCount > 0 ? "Review call" : "Keep moving",
      summary: decisionCount > 0
        ? "Open the waiting launch call; launch, revise, pause, or ask for another pass from one place."
        : "Let the team prepare the next proof pack until a launch call is actually needed.",
      variant: decisionCount > 0 ? "default" : "outline",
    },
  ];
  const launchReadinessNextStep = !paidBetaActive
    ? "Open paid beta access before starting new brand-team cycles."
    : decisionCount > 0
      ? "Open the waiting launch call; choose launch, revise, pause, or another pass before anything represents the customer."
      : "Keep the brand team preparing the next proof pack until a real launch call is needed.";
  const launchReadinessText = [
    "DearMe launch readiness receipt",
    `Status: ${paidBetaActive ? "Private brand cycle can run" : "Paid beta access needed"}`,
    `Brand cycle: ${readinessItems[0]?.signal ?? "Paid beta needed"} - ${
      readinessItems[0]?.summary ?? "Activate paid beta before the brand team starts moving."
    }`,
    `Public launch: ${readinessItems[1]?.signal ?? "Not ready yet"} - ${
      readinessItems[1]?.summary ??
      "Public posts, outbound messages, page changes, and spend still need live channel receipts plus your launch call."
    }`,
    `Next best step: ${readinessItems[2]?.signal ?? "Keep moving"} - ${
      readinessItems[2]?.summary ??
      "Let the team prepare the next proof pack until a launch call is actually needed."
    }`,
    `Waiting launch calls: ${decisionCount}`,
    `Next support step: ${launchReadinessNextStep}`,
    "Can keep moving now: private drafts, opportunity research, proof packaging, reports, Voice & Memory, and review preparation.",
    "Must wait: public posts, outbound messages, page changes, spend, live proof, account authorization, and irreversible moves.",
    "Boundary: DearMe keeps private brand work moving; public launch remains a launch call backed by verified receipts.",
  ].join("\n");
  const downloadLaunchReadinessReceipt = useCallback(() => {
    downloadDearMeReceipt(launchReadinessText, DEARME_LAUNCH_READINESS_RECEIPT_FILENAME);
  }, [launchReadinessText]);
  const commercialItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "private-beta-sale",
      icon: CreditCard,
      label: "Private beta sale",
      signal: paidBetaActive ? "Paid user active" : "Ready to sell",
      summary: paidBetaActive
        ? "Paid access is recorded, so this user can receive brand-team work inside the current guardrails."
        : "DearMe can be sold as a manual private beta: record paid access, then start the first brand cycle.",
      variant: paidBetaActive ? "default" : "outline",
    },
    {
      key: "paid-user-ops",
      icon: Workflow,
      label: "Paid user support",
      signal: paidBetaActive ? "Operating" : "Access first",
      summary: paidBetaActive
        ? "Drafts, opportunities, reports, Voice & Memory, and launch calls can keep moving for this account."
        : "The operating path is ready, but this account waits for paid beta access before new work cycles run.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "public-launch-proof",
      icon: ShieldCheck,
      label: "Public launch proof",
      signal: "Receipts needed",
      summary:
        "Do not claim broad launch readiness until approved delivery details and guarded live receipts are verified.",
      variant: "secondary",
    },
  ];
  const commercialReadinessNextStep = paidBetaActive
    ? "Keep operating the paid beta account, then use the launch-proof handoff only after the route and recipients are approved."
    : "Sell private beta, record paid access from the receipt, then start the first brand cycle.";
  const commercialReadinessText = [
    "DearMe commercial readiness receipt",
    `Status: ${paidBetaActive ? "Paid private beta operating" : "Private beta ready to sell"}`,
    `Private beta sale: ${commercialItems[0]?.signal ?? "Ready to sell"} - ${
      commercialItems[0]?.summary ??
      "DearMe can be sold as a manual private beta: record paid access, then start the first brand cycle."
    }`,
    `Paid user support: ${commercialItems[1]?.signal ?? "Access first"} - ${
      commercialItems[1]?.summary ??
      "The operating path is ready, but this account waits for paid beta access before new work cycles run."
    }`,
    `Public launch proof: ${commercialItems[2]?.signal ?? "Receipts needed"} - ${
      commercialItems[2]?.summary ??
      "Do not claim broad launch readiness until approved delivery details and guarded live receipts are verified."
    }`,
    "Can sell now: private beta with manual access, visible guardrails, support handoff, and launch-call boundaries.",
    "Can operate now: paid-account work, weekly value, recovery, Voice & Memory, review calls, and private preparation after access opens.",
    "Cannot claim yet: broad public launch until live delivery receipts and approved first recipients are verified.",
    `Next support step: ${commercialReadinessNextStep}`,
    "Boundary: paid beta work can keep moving privately; public posts, outbound messages, page changes, spend, live proof, and irreversible moves wait for the launch call.",
  ].join("\n");
  const downloadCommercialReadinessReceipt = useCallback(() => {
    downloadDearMeReceipt(commercialReadinessText, DEARME_COMMERCIAL_READINESS_RECEIPT_FILENAME);
  }, [commercialReadinessText]);
  const paidCohortAttentionCount = paidBetaCohort?.attentionAccounts.length ?? 0;
  const paidCohortAttention = paidBetaCohort?.attentionAccounts[0] ?? null;
  const paidCohortAttentionAccounts = paidBetaCohort?.attentionAccounts.slice(0, 4) ?? [];
  const paidCohortStatus = !paidBetaActive
    ? "Ready after access"
    : paidBetaCohortLoading
      ? "Checking"
      : paidBetaCohortError
        ? "Needs refresh"
        : paidBetaCohort?.label ?? "Checking";
  const paidCohortVariant: "default" | "secondary" | "outline" =
    paidBetaActive && paidBetaCohort?.state === "operable"
      ? "default"
      : paidBetaActive
        ? "secondary"
        : "outline";
  const paidCohortGuardrailSignal = paidBetaCohort
    ? paidBetaCohort.hardStopAccountCount > 0
      ? pluralizeCount(paidBetaCohort.hardStopAccountCount, "paused account")
      : paidBetaCohort.warningAccountCount > 0
        ? pluralizeCount(paidBetaCohort.warningAccountCount, "watch account")
        : "Clear"
    : paidBetaActive
      ? "Checking"
      : "Access first";
  const paidCohortItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "accounts",
      icon: Users,
      label: "Accounts",
      signal: paidBetaCohort
        ? `${paidBetaCohort.activeAccountCount}/${paidBetaCohort.accountCount} active`
        : paidBetaActive
          ? "Checking"
          : "Access first",
      summary: paidBetaCohort
        ? customerProofPackSummary(paidBetaCohort.summary)
        : "Paid-account health appears here after access is active.",
      variant: paidBetaCohort && paidBetaCohort.activeAccountCount === paidBetaCohort.accountCount
        ? "default"
        : paidBetaActive
          ? "secondary"
          : "outline",
    },
    {
      key: "credit",
      icon: CircleDollarSign,
      label: "Credit",
      signal: paidBetaCohort
        ? money(paidBetaCohort.remainingCreditCents)
        : paidBetaActive
          ? "Checking"
          : "Access first",
      summary: paidBetaCohort
        ? `Current-cycle spend is ${money(paidBetaCohort.cycleSpendCents)} against ${money(paidBetaCohort.cycleBudgetCents)} in operating budget.`
        : "Remaining paid credit is checked before new paid cycles run.",
      variant: paidBetaCohort && paidBetaCohort.remainingCreditCents > 0 ? "default" : "outline",
    },
    {
      key: "guardrails",
      icon: Gauge,
      label: "Guardrails",
      signal: paidCohortGuardrailSignal,
      summary: paidBetaCohort
        ? customerProofPackSummary(paidBetaCohort.nextAction)
        : "DearMe checks paused, near-limit, and decision-needed accounts before more work runs.",
      variant: paidBetaCohort && paidBetaCohort.hardStopAccountCount + paidBetaCohort.warningAccountCount === 0
        ? "default"
        : paidBetaActive
          ? "secondary"
          : "outline",
    },
    {
      key: "attention",
      icon: LifeBuoy,
      label: "Attention",
      signal: paidCohortAttentionCount > 0 ? `${paidCohortAttentionCount} attention` : "None",
      summary: paidCohortAttention
        ? customerProofPackSummary(paidCohortAttention.nextAction)
        : paidBetaCohortError
          ? paidBetaCohortError
          : "No paid account needs activation or spend review right now.",
      variant: paidCohortAttentionCount > 0 || paidBetaCohortError ? "secondary" : "outline",
    },
  ];
  const paidCohortHealthText = [
    "DearMe paid cohort health receipt",
    `Status: ${paidCohortStatus}`,
    `Accounts: ${paidCohortItems[0]?.signal ?? "Access first"} - ${paidCohortItems[0]?.summary ?? "Paid-account health appears here after access is active."}`,
    `Credit: ${paidCohortItems[1]?.signal ?? "Access first"} - ${paidCohortItems[1]?.summary ?? "Remaining paid credit is checked before new paid cycles run."}`,
    `Guardrails: ${paidCohortItems[2]?.signal ?? "Access first"} - ${paidCohortItems[2]?.summary ?? "DearMe checks paused, near-limit, and decision-needed accounts before more work runs."}`,
    `Attention: ${paidCohortItems[3]?.signal ?? "None"} - ${paidCohortItems[3]?.summary ?? "No paid account needs activation or spend review right now."}`,
    ...paidCohortAttentionAccounts.map((account) =>
      `Attention account: ${paidBetaCohortCompanyName(paidBetaCohortCompanyNames, account.companyId)} - ${account.label}: ${customerProofPackSummary(account.nextAction)}`,
    ),
    "Boundary: paid operations can continue only while access, credit, guardrails, and attention accounts stay clear; public sends, launches, spend-sensitive moves, and irreversible changes still need the final call.",
  ].join("\n");
  const downloadPaidCohortHealthReceipt = useCallback(() => {
    downloadDearMeReceipt(paidCohortHealthText, DEARME_PAID_COHORT_HEALTH_RECEIPT_FILENAME);
  }, [paidCohortHealthText]);
  const weeklyValueItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "useful-outputs",
      icon: CheckCircle2,
      label: "Useful outputs",
      signal: paidBetaActive
        ? visibleOutputCount > 0
          ? `${visibleOutputCount} visible`
          : "No output yet"
        : "Opens after access",
      summary: paidBetaActive
        ? "Drafts, opportunities, proof, and reports stay visible so the week cannot feel empty."
        : "The weekly value loop is shaped, but new paid work starts after access is recorded.",
      variant: paidBetaActive && visibleOutputCount > 0 ? "default" : "secondary",
    },
    {
      key: "weekly-report",
      icon: FileText,
      label: "Weekly report",
      signal: workbench.report ? "Briefing ready" : "First briefing pending",
      summary: workbench.report
        ? customerProofPackSummary(workbench.report.summary)
        : "DearMe writes the next report once the brand team has useful work to recap.",
      variant: workbench.report ? "default" : "outline",
    },
    {
      key: "opportunity-proof",
      icon: Telescope,
      label: "Opportunity and proof",
      signal: opportunityProofCount > 0
        ? pluralizeCount(opportunityProofCount, "path")
        : pluralizeCount(workbench.memory.sourceCount, "source"),
      summary: workbench.memory.sourceCount > 0
        ? "Saved proof and opportunity work are available for the next launch-ready pass."
        : "DearMe needs proof sources before it can make stronger opportunity and portfolio moves.",
      variant: opportunityProofCount > 0 || workbench.memory.sourceCount > 0 ? "default" : "outline",
    },
    {
      key: "empty-week-recovery",
      icon: LifeBuoy,
      label: "Empty-week recovery",
      signal: paidBetaActive && visibleOutputCount === 0 ? "Needs support" : "Covered",
      summary:
        "If a paid week has no useful deliverable, DearMe should surface recovery instead of pretending the cycle worked.",
      variant: paidBetaActive && visibleOutputCount === 0 ? "secondary" : "outline",
    },
  ];
  const weeklyValueReadyWork = workbench.workReady
    .slice(0, 3)
    .map((item) => `${customerProofPackSummary(item.title)} - ${customerProofPackSummary(item.summary)}`);
  const weeklyValueActiveWork = workbench.activeWork
    .slice(0, 3)
    .map((item) => `${customerProofPackSummary(item.title)} - ${customerProofPackSummary(item.summary)}`);
  const weeklyValueReceiptText = [
    "DearMe weekly value receipt",
    `Status: ${weeklyValueStatus}`,
    `Visible useful outputs: ${visibleOutputCount}`,
    workbench.report
      ? `Report: ${customerProofPackSummary(workbench.report.title)} - ${customerProofPackSummary(workbench.report.summary)}`
      : "Report: The first Dear me report appears after the brand team has useful work to recap.",
    `Ready work: ${weeklyValueReadyWork.length > 0 ? weeklyValueReadyWork.join("; ") : "No review-ready work yet."}`,
    `Active work: ${weeklyValueActiveWork.length > 0 ? weeklyValueActiveWork.join("; ") : "No active work yet."}`,
    `Voice & Memory: ${customerProofPackSummary(workbench.memory.summary)} Voice ${voiceConfidence}%.`,
    `Decisions: ${supportDecisionSignal}`,
    emptyWeekRecoveryActive
      ? "Recovery: this paid week needs one useful output and a plain customer update before it is healthy."
      : "Recovery: the week has visible useful work; recovery stays ready if the next cycle goes quiet.",
    `Next support step: ${supportFollowUpText}`,
    "Boundary: DearMe can keep preparing private work; public sends, launches, spend, account changes, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadWeeklyValueReceipt = useCallback(() => {
    downloadDearMeReceipt(weeklyValueReceiptText, DEARME_WEEKLY_VALUE_RECEIPT_FILENAME);
  }, [weeklyValueReceiptText]);
  const accountHealthItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "outcome-target",
      icon: Gauge,
      label: "Outcome target",
      signal: paidBetaActive
        ? visibleOutputCount > 0
          ? "Useful work visible"
          : "Needs useful work"
        : "Opens after access",
      summary:
        "Target: at least one voice-matched growth output ready for the customer's call each week.",
      variant: paidBetaActive && visibleOutputCount > 0 ? "default" : "secondary",
    },
    {
      key: "voice-fit",
      icon: Sparkles,
      label: "Voice fit",
      signal: `Voice ${voiceConfidence}%`,
      summary: customerProofPackSummary(workbench.memory.voiceProfile.guidance),
      variant: voiceConfidence >= 50 ? "default" : "secondary",
    },
    {
      key: "launch-progress",
      icon: ShieldCheck,
      label: "Launch progress",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "No call waiting",
      summary:
        "Approved public moves still wait for the launch call; internal prep can continue.",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "cost-clarity",
      icon: CircleDollarSign,
      label: "Cost clarity",
      signal: latestSpendCheckpoint ? "Spend visible" : "No spend yet",
      summary: latestSpendCheckpoint
        ? customerProofPackSummary(latestSpendCheckpoint.summary)
        : "Brand work can continue until a move would spend money or cross the monthly guardrail.",
      variant: latestSpendCheckpoint ? "secondary" : "outline",
    },
  ];
  const paidAccountHealthText = [
    "DearMe paid account health receipt",
    `Status: ${accountHealthStatus}`,
    `Outcome target: ${accountHealthItems[0]?.signal ?? "Opens after access"} - ${accountHealthItems[0]?.summary ?? "Target: at least one voice-matched growth output ready for the customer's call each week."}`,
    `Voice fit: ${accountHealthItems[1]?.signal ?? `Voice ${voiceConfidence}%`} - ${accountHealthItems[1]?.summary ?? customerProofPackSummary(workbench.memory.voiceProfile.guidance)}`,
    `Launch progress: ${accountHealthItems[2]?.signal ?? "No call waiting"} - ${accountHealthItems[2]?.summary ?? "Approved public moves still wait for the launch call; internal prep can continue."}`,
    `Cost clarity: ${accountHealthItems[3]?.signal ?? "No spend yet"} - ${accountHealthItems[3]?.summary ?? "Brand work can continue until a move would spend money or cross the monthly guardrail."}`,
    `Retention owner: ${retentionOwnerSignal}`,
    `Next support step: ${supportFollowUpText}`,
    "Boundary: DearMe can prepare private growth work, but public sends, launches, spend, account changes, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadPaidAccountHealthReceipt = useCallback(() => {
    downloadDearMeReceipt(paidAccountHealthText, DEARME_PAID_ACCOUNT_HEALTH_RECEIPT_FILENAME);
  }, [paidAccountHealthText]);
  const emptyWeekRecoveryItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "useful-deliverable",
      icon: CheckCircle2,
      label: "Useful deliverable",
      signal: emptyWeekRecoveryActive
        ? "Start recovery"
        : paidBetaActive
          ? "Covered"
          : "Opens after access",
      summary: emptyWeekRecoveryActive
        ? "Create or refresh one voice-matched content, opportunity, portfolio, or report item before the week is treated as healthy."
        : "The account already has visible useful work, so empty-week recovery is standing by instead of interrupting the cycle.",
      variant: emptyWeekRecoveryActive ? "secondary" : "outline",
    },
    {
      key: "fastest-path",
      icon: ArrowRight,
      label: "Fastest path",
      signal: recoveryCandidate ? customerProofPackSummary(recoveryCandidate.title) : "Use saved proof",
      summary: recoveryCandidate
        ? customerProofPackSummary(recoveryCandidate.summary)
        : customerProofPackSummary(workbench.memory.sourcePlan.summary),
      variant: emptyWeekRecoveryActive ? "default" : "outline",
    },
    {
      key: "customer-update",
      icon: MessageSquare,
      label: "Customer update",
      signal: emptyWeekRecoveryActive ? "Explain the miss" : "No miss",
      summary: emptyWeekRecoveryActive
        ? "Tell the customer what is being recovered, what will be ready next, and what still needs their launch call."
        : "Keep the outcome receipt visible so the customer sees what changed before the next check-in.",
      variant: emptyWeekRecoveryActive ? "secondary" : "outline",
    },
    {
      key: "support-escalation",
      icon: LifeBuoy,
      label: "Escalation",
      signal: emptyWeekRecoveryActive ? "Human support" : "Autonomous",
      summary: emptyWeekRecoveryActive
        ? "If recovery cannot produce one useful item, support steps in with a plain account handoff."
        : "Human support stays reserved for account access, launch, spend, or irreversible calls.",
      variant: emptyWeekRecoveryActive ? "secondary" : "outline",
    },
  ];
  const emptyWeekRecoveryText = [
    "DearMe empty-week recovery brief",
    `Account: ${paidBetaActive ? "Paid beta active" : "Waiting for paid beta access"}`,
    `Visible useful outputs: ${visibleOutputCount}`,
    `Fastest recovery path: ${
      recoveryCandidate
        ? `${customerProofPackSummary(recoveryCandidate.title)} - ${customerProofPackSummary(recoveryCandidate.summary)}`
        : customerProofPackSummary(workbench.memory.sourcePlan.summary)
    }`,
    `Voice confidence: ${voiceConfidence}%`,
    "Goal: create or refresh one voice-matched content, opportunity, portfolio, or report item before this week is treated as healthy.",
    "Customer update: explain what is being recovered, what will be ready next, and what still needs the launch call.",
    "Follow-up: Same-day make-good before the next customer check-in.",
    "Boundary: no public send, launch, spend, account change, or irreversible move without the final call.",
  ].join("\n");
  const downloadEmptyWeekRecoveryReceipt = useCallback(() => {
    downloadDearMeReceipt(emptyWeekRecoveryText, DEARME_EMPTY_WEEK_RECOVERY_RECEIPT_FILENAME);
  }, [emptyWeekRecoveryText]);
  const emptyWeekRecoveryActionDisabled = !emptyWeekRecoveryActive || emptyWeekRecoveryPending;
  const operationsActionActive = paidBetaActive && (emptyWeekRecoveryActive || staleLoopCount > 0);
  const operationsReceiptItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "operating-log",
      icon: Gauge,
      label: "Operating log",
      signal: workbench.runLedger.length > 0
        ? pluralizeCount(workbench.runLedger.length, "entry", "entries")
        : "No entries yet",
      summary: latestLedgerEntry
        ? `${customerProofPackSummary(latestLedgerEntry.title)}: ${customerProofPackSummary(latestLedgerEntry.nextAction)}`
        : "DearMe will record moved work, prepared work, learning, skips, and launch calls here as cycles run.",
      variant: workbench.runLedger.length > 0 ? "default" : "outline",
    },
    {
      key: "recovery-path",
      icon: RefreshCw,
      label: "Recovery path",
      signal: staleLoopCount > 0 ? "Needs direction" : "Self-correcting",
      summary: staleLoopCount > 0
        ? "A repeated path is stopped and brought back for clearer direction before more effort is spent."
        : "Repeated paths stay capped; DearMe keeps preparing what it can and asks only when a better direction is needed.",
      variant: staleLoopCount > 0 ? "secondary" : "outline",
    },
    {
      key: "cost-recovery",
      icon: CircleDollarSign,
      label: "Cost guardrail",
      signal: spendCheckpointCount > 0 ? pluralizeCount(spendCheckpointCount, "checkpoint") : "No spend yet",
      summary: latestSpendCheckpoint
        ? customerProofPackSummary(latestSpendCheckpoint.summary)
        : "Brand work can continue until a move would spend money or cross the monthly guardrail.",
      variant: spendCheckpointCount > 0 ? "secondary" : "outline",
    },
    {
      key: "human-support",
      icon: LifeBuoy,
      label: "Human support",
      signal: paidBetaActive ? "Hard calls only" : "Ready after access",
      summary:
        "Human support steps in for real sends, public launches, account authorization, new spend, legal/privacy calls, brand judgment, or irreversible moves.",
      variant: paidBetaActive ? "default" : "secondary",
    },
  ];
  const paidUserOperationsNextStep = emptyWeekRecoveryActive
    ? "Open same-day recovery, then hand support the account context if one useful item cannot be prepared."
    : staleLoopCount > 0
      ? `Open the support handoff before another repeated path spends more effort: ${staleLoopSignal}.`
      : paidBetaActive
        ? "Keep the weekly operating loop moving and review account health before the next paid check-in."
        : "Record paid access before treating this as an operating paid account.";
  const paidUserOperationsReceiptText = [
    "DearMe paid user operations receipt",
    `Account: ${paidBetaActive ? "Supportable account" : "Ready after paid access"}`,
    `Operating log: ${operationsReceiptItems[0]?.signal ?? "No entries yet"} - ${
      operationsReceiptItems[0]?.summary ??
      "DearMe will record moved work, prepared work, learning, skips, and launch calls here as cycles run."
    }`,
    `Recovery path: ${operationsReceiptItems[1]?.signal ?? "Self-correcting"} - ${
      operationsReceiptItems[1]?.summary ??
      "Repeated paths stay capped; DearMe keeps preparing what it can and asks only when a better direction is needed."
    }`,
    `Cost guardrail: ${operationsReceiptItems[2]?.signal ?? "No spend yet"} - ${
      operationsReceiptItems[2]?.summary ??
      "Brand work can continue until a move would spend money or cross the monthly guardrail."
    }`,
    `Human support: ${operationsReceiptItems[3]?.signal ?? "Ready after access"} - ${
      operationsReceiptItems[3]?.summary ??
      "Human support steps in for real sends, public launches, account authorization, new spend, legal/privacy calls, brand judgment, or irreversible moves."
    }`,
    `Next support step: ${paidUserOperationsNextStep}`,
    "Boundary: DearMe can keep preparing, learning, reporting, recovering, and routing support privately; real sends, public launches, account authorization, new spend, legal/privacy calls, brand judgment, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadPaidUserOperationsReceipt = useCallback(() => {
    downloadDearMeReceipt(paidUserOperationsReceiptText, DEARME_PAID_USER_OPERATIONS_RECEIPT_FILENAME);
  }, [paidUserOperationsReceiptText]);
  const autonomyContractStatus = !paidBetaActive
    ? "Ready after access"
    : decisionCount > 0
      ? "External calls held"
      : "Team can work";
  const autonomyContractVariant: "default" | "secondary" | "outline" = paidBetaActive && decisionCount === 0
    ? "default"
    : paidBetaActive
      ? "secondary"
      : "outline";
  const autonomyContractItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "read-only-research",
      icon: Telescope,
      label: "Read-only research",
      signal: paidBetaActive ? "Runs freely" : "Starts after access",
      summary:
        "DearMe can inspect saved profile, proof, memory, reports, and account receipts without asking for another call.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "private-prep",
      icon: Workflow,
      label: "Team preparation",
      signal: paidBetaActive ? "Can run together" : "Access first",
      summary:
        "Drafts, opportunity research, portfolio updates, report prep, Voice & Memory, and review prep can move at the same time while they stay private.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "launch-actions",
      icon: ShieldCheck,
      label: "Launch actions",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "Needs your call",
      summary:
        "Posting, outreach, page changes, account authorization, spend, and public proof stay behind the launch call.",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "recovery-support",
      icon: LifeBuoy,
      label: "Recovery and support",
      signal: staleLoopCount > 0 ? "Needs support" : "Escalates only when needed",
      summary:
        "Repeated failures, account access, credentials, legal/privacy judgment, brand calls, and irreversible moves come back to human support.",
      variant: staleLoopCount > 0 ? "secondary" : "outline",
    },
  ];
  const autonomyContractText = [
    "DearMe autonomy contract",
    `Account: ${paidBetaActive ? "paid beta active" : "waiting for paid beta access"}`,
    "Can keep moving: research, drafts, opportunity prep, portfolio proof, reports, Voice & Memory, retry planning.",
    "Can run at the same time: independent research, review prep, proof packaging, and report preparation when they stay private.",
    "Must ask first: public posts, outreach, page changes, account authorization, new spend, legal/privacy judgment, brand calls, or irreversible moves.",
    "Recovery: if a path repeats failures or a paid week has no useful deliverable, DearMe surfaces recovery or support handoff.",
  ].join("\n");
  const downloadAutonomyContractReceipt = useCallback(() => {
    downloadDearMeReceipt(autonomyContractText, DEARME_AUTONOMY_CONTRACT_RECEIPT_FILENAME);
  }, [autonomyContractText]);
  const supportHandoffItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "account-state",
      icon: CreditCard,
      label: "Account state",
      signal: paidBetaActive ? "Paid beta active" : "Access first",
      summary: paidBetaActive
        ? "Support can treat this as an operating paid beta account."
        : "Take payment and record access before treating this as a paid support case.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "latest-context",
      icon: FileText,
      label: "Latest context",
      signal: supportLatestContextReady ? "Attached" : "Starter context",
      summary: supportLatestContextReady && latestLedgerEntry
        ? `${supportWorkSignal}: ${customerProofPackSummary(latestLedgerEntry.nextAction)}`
        : "DearMe will attach the first brand cycle once paid access starts.",
      variant: supportLatestContextReady ? "default" : "outline",
    },
    {
      key: "decision-state",
      icon: ShieldCheck,
      label: "Decision state",
      signal: supportDecisionSignal,
      summary: decisionCount > 0
        ? "Support should help the customer choose launch, revise, pause, or another pass."
        : "Support can focus on account access, direction, or the next brand-work request.",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "follow-up",
      icon: RefreshCw,
      label: "Follow-up",
      signal: supportFollowUpSignal,
      summary: supportFollowUpText,
      variant: emptyWeekRecoveryActive || staleLoopCount > 0 ? "secondary" : paidBetaActive ? "default" : "outline",
    },
  ];
  const rules: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    summary: string;
    signal: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }> = [
    {
      key: "private-work",
      icon: Workflow,
      label: "Can keep moving",
      summary: paidBetaActive
        ? "Drafts, lead research, proof packaging, and memory updates can move forward without changing your public surface."
        : "Paid beta access unlocks brand-team preparation before the team starts new cycles.",
      signal: paidBetaActive ? "Allowed" : "Locked",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "ask-first",
      icon: ShieldCheck,
      label: "Must ask first",
      summary:
        "Public posts, outbound messages, site changes, new spend, sensitive claims, and identity changes wait for your decision.",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "Gate clear",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "stale-loops",
      icon: RefreshCw,
      label: "Stops repeat work",
      summary: staleLoopCount > 0
        ? "A prepared path has reached its limit, so DearMe needs your direction before spending more effort there."
        : "If a path repeats without better proof, DearMe brings it back for a decision instead of burning attempts.",
      signal: staleLoopCount > 0 ? pluralizeCount(staleLoopCount, "path") : `${maxAttempts}-pass limit`,
      variant: staleLoopCount > 0 ? "secondary" : "outline",
    },
    {
      key: "spend-clarity",
      icon: CircleDollarSign,
      label: "Spend is visible",
      summary:
        "Spend appears as plain checkpoints and monthly guardrails; billing details stay backstage.",
      signal: spendCheckpointCount > 0 ? pluralizeCount(spendCheckpointCount, "checkpoint") : "No spend yet",
      variant: spendCheckpointCount > 0 ? "secondary" : "outline",
    },
  ];

  return (
    <DearMePanel aria-label="Team operating policy">
      <DearMeWorkbenchSectionHeader
        icon={ShieldCheck}
        eyebrow="Team operating policy"
        title={policyTitle}
        description="DearMe is meant to run, not wait: brand work keeps moving, while external moves become clear launch calls."
        trailing={<Badge variant={paidBetaActive ? "default" : "secondary"}>{policyLabel}</Badge>}
      />

      <section
        aria-label="Launch readiness"
        className="mt-5 rounded-md border border-primary/25 bg-primary/5 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Readiness</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Brand cycle runs; public launch follows your rules.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe keeps work moving, then turns any public, outbound, spend, or page-changing move into one reviewable call.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Proof ready" : "Setup needed"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_LAUNCH_READINESS_RECEIPT_FILENAME}`}
              onClick={downloadLaunchReadinessReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {readinessItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Launch readiness receipt note"
          className="mt-4 min-h-40 resize-none bg-background/80 font-mono text-xs leading-relaxed"
          readOnly
          value={launchReadinessText}
        />
      </section>

      <section
        aria-label="Commercial readiness"
        className="mt-4 rounded-md border border-border bg-background p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Commercial readiness</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Private beta can be sold; public launch still needs proof.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe can operate paid beta users with manual access and visible guardrails while broad launch waits for verified live receipts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "outline"}>
              {paidBetaActive ? "Paid user operating" : "Sell private beta"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_COMMERCIAL_READINESS_RECEIPT_FILENAME}`}
              onClick={downloadCommercialReadinessReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {commercialItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <div
          aria-label="Public launch proof action"
          className="mt-4 flex flex-col gap-3 rounded-md border border-amber-500/25 bg-amber-50/70 p-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium">Next public-launch blocker: live receipt details.</p>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
              Keep selling and operating private beta; open the proof handoff only when the launch route and first recipients are approved.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-auto min-h-9 w-full min-w-0 whitespace-normal bg-background/80 sm:w-auto"
            onClick={onOpenLaunchProof}
          >
            <ShieldCheck className="h-4 w-4" />
            Open launch proof
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Textarea
          aria-label="Commercial readiness receipt note"
          className="mt-4 min-h-40 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
          readOnly
          value={commercialReadinessText}
        />
      </section>

      <section
        aria-label="Paid cohort health receipt"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Paid cohort</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Paid accounts roll up into one operating view.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe checks access, credit, guardrails, and attention accounts before support treats paid operations as healthy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidCohortVariant}>{paidCohortStatus}</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_COHORT_HEALTH_RECEIPT_FILENAME}`}
              onClick={downloadPaidCohortHealthReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {paidCohortItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        {paidBetaCohortError ? (
          <div
            aria-label="Paid cohort health error"
            className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {paidBetaCohortError}
          </div>
        ) : null}
        <div
          aria-label="Paid operations attention list"
          className="mt-4 rounded-md border border-border bg-background/85 p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Operations list</p>
              <h4 className="mt-1 text-sm font-semibold text-foreground">
                {paidCohortAttentionCount > 0
                  ? "Fix paid-account blockers before the next cycle."
                  : "No paid-account blocker is waiting right now."}
              </h4>
            </div>
            <Badge variant={paidCohortAttentionCount > 0 ? "secondary" : "outline"}>
              {paidCohortAttentionCount > 0
                ? pluralizeCount(paidCohortAttentionCount, "account")
                : "List clear"}
            </Badge>
          </div>
          {paidCohortAttentionAccounts.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {paidCohortAttentionAccounts.map((account) => (
                <div
                  key={`${account.companyId}-${account.state}`}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {paidBetaCohortCompanyName(paidBetaCohortCompanyNames, account.companyId)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {customerProofPackSummary(account.nextAction)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant={account.state === "hard_stop" ? "secondary" : "outline"}>
                        {account.label}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenPaidBetaAccount(account.companyId)}
                      >
                        Open account
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              DearMe can keep the paid cohort moving until an account needs activation, credit, spend, or support attention.
            </p>
          )}
        </div>
      </section>

      <section
        aria-label="Weekly value receipt"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Seven-day value</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              A paid week should show useful work, not activity.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe keeps the customer-visible deliverables, report, proof, and recovery trigger in one receipt so a quiet week becomes obvious.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={weeklyValueVariant}>{weeklyValueStatus}</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_WEEKLY_VALUE_RECEIPT_FILENAME}`}
              onClick={downloadWeeklyValueReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {weeklyValueItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Weekly value receipt note"
          className="mt-4 min-h-36 resize-none bg-background/85 text-sm"
          value={weeklyValueReceiptText}
          readOnly
        />
        {emptyWeekRecoveryActive ? (
          <div
            aria-label="Weekly value recovery handoff"
            className="mt-4 flex flex-col gap-3 rounded-md border border-primary/25 bg-background/85 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Recover this week before it feels empty.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                DearMe should prepare one useful output and a plain customer update before the next check-in.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={scrollToDearMeEmptyWeekRecovery}>
              <LifeBuoy className="h-4 w-4" />
              Open recovery
            </Button>
          </div>
        ) : null}
      </section>

      <section
        aria-label="Paid account health receipt"
        className="mt-4 rounded-md border border-border bg-background p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Account health</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Renewal health is based on outcomes, not busywork.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe checks weekly useful work, voice fit, launch calls, and cost clarity before this account is treated as healthy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={accountHealthVariant}>{accountHealthStatus}</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_ACCOUNT_HEALTH_RECEIPT_FILENAME}`}
              onClick={downloadPaidAccountHealthReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {accountHealthItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        {emptyWeekRecoveryActive ? (
          <div
            aria-label="Paid account health recovery handoff"
            className="mt-4 flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Recovery is the next account-health action.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                DearMe should not call this account healthy again until one useful deliverable is prepared.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={scrollToDearMeEmptyWeekRecovery}>
              <LifeBuoy className="h-4 w-4" />
              Open recovery
            </Button>
          </div>
        ) : null}
      </section>

      <section
        aria-label="Paid retention pulse"
        className="mt-4 rounded-md border border-primary/20 bg-background p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Retention pulse</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              This account has a weekly renewal signal.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe combines visible value, voice fit, launch calls, and recovery ownership so paid support knows whether the account is healthy this week.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={retentionPulseVariant}>{retentionPulseStatus}</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_RETENTION_PULSE_RECEIPT_FILENAME}`}
              onClick={downloadRetentionPulseReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {retentionPulseItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Paid retention pulse note"
          className="mt-4 min-h-36 resize-none bg-background/85 text-sm"
          value={retentionPulseText}
          readOnly
        />

        {paidBetaActive && (emptyWeekRecoveryActive || staleLoopCount > 0) ? (
          <div
            aria-label="Paid retention pulse action"
            className="mt-4 flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {emptyWeekRecoveryActive
                  ? "Retention risk is recovery-owned now."
                  : "Retention risk is support-owned now."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyWeekRecoveryActive
                  ? "Open the make-good path before the next customer check-in."
                  : "Open the stuck work or support handoff before another repeated path spends more effort."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {emptyWeekRecoveryActive ? (
                <Button type="button" variant="outline" onClick={scrollToDearMeEmptyWeekRecovery}>
                  <LifeBuoy className="h-4 w-4" />
                  Open recovery
                </Button>
              ) : null}
              {!emptyWeekRecoveryActive && staleLoopWorkReference ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenSupportHandoffIssue(staleLoopWorkReference)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Open stuck work
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={scrollToDearMeSupportHandoff}>
                <LifeBuoy className="h-4 w-4" />
                Open support handoff
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id={DEARME_EMPTY_WEEK_RECOVERY_ID}
        aria-label="Empty week recovery receipt"
        className="mt-4 rounded-md border border-border bg-muted/20 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Recovery</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              If a paid week is empty, DearMe has to recover visibly.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              Zero useful deliverables in seven days is treated as a retention issue, with a concrete make-good path instead of silent activity.
            </p>
          </div>
          <Badge variant={emptyWeekRecoveryVariant}>{emptyWeekRecoveryStatus}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {emptyWeekRecoveryItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        {emptyWeekRecoveryActive ? (
          <div
            className="mt-4 rounded-md border border-primary/25 bg-background/85 p-3"
            aria-label="Empty week recovery action"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Make-good brief</p>
                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  Start one private recovery pass now.
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  DearMe will prepare a useful item and customer update before any public move.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Download ${DEARME_EMPTY_WEEK_RECOVERY_RECEIPT_FILENAME}`}
                  onClick={downloadEmptyWeekRecoveryReceipt}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Download receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={scrollToDearMeSupportHandoff}
                >
                  <LifeBuoy className="h-4 w-4" />
                  Open support handoff
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={emptyWeekRecoveryActionDisabled}
                  onClick={() => onStartEmptyWeekRecovery(emptyWeekRecoveryText)}
                >
                  {emptyWeekRecoveryPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LifeBuoy className="h-4 w-4" />
                  )}
                  Start recovery
                </Button>
              </div>
            </div>
            <Textarea
              aria-label="Empty week recovery brief note"
              className="mt-3 min-h-36 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
              readOnly
              value={emptyWeekRecoveryText}
            />
            {emptyWeekRecoveryError ? (
              <div
                aria-label="Empty week recovery error"
                className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {emptyWeekRecoveryError}
              </div>
            ) : null}
            {emptyWeekRecoveryResult ? (
              <div
                aria-label="Empty week recovery start receipt"
                className="mt-3 flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {emptyWeekRecoveryResult.status === "queued" ? "Recovery brief sent" : "Recovery brief saved"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {customerProofPackSummary(emptyWeekRecoveryResult.nextStep)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button type="button" variant="outline" onClick={onOpenVoiceMemory}>
                    <Sparkles className="h-4 w-4" />
                    Open Voice & Memory
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      onOpenEmptyWeekRecoveryIssue(
                        emptyWeekRecoveryResult.issueIdentifier ?? emptyWeekRecoveryResult.issueId,
                      )
                    }
                  >
                    <ArrowRight className="h-4 w-4" />
                    Open recovery work
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        aria-label="Paid user operations receipt"
        className="mt-4 rounded-md border border-border bg-muted/20 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Operations receipt</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Paid users get recovery, cost, and support clarity.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe keeps an operating log, caps repeated paths, shows spend checkpoints, and only escalates hard external calls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Supportable account" : "Ready after paid access"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_USER_OPERATIONS_RECEIPT_FILENAME}`}
              onClick={downloadPaidUserOperationsReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationsReceiptItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Paid user operations receipt note"
          className="mt-4 min-h-36 resize-none bg-background/85 font-mono text-xs leading-relaxed"
          readOnly
          value={paidUserOperationsReceiptText}
        />
        {operationsActionActive ? (
          <div
            aria-label="Paid user operations action"
            className="mt-4 flex flex-col gap-3 rounded-md border border-primary/25 bg-background/85 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Operations risk needs an owner now.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyWeekRecoveryActive
                  ? "Open the recovery pass, then hand support the account context if one useful item cannot be prepared."
                  : `Open the support handoff before another repeated path spends more effort: ${staleLoopSignal}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {emptyWeekRecoveryActive ? (
                <Button type="button" variant="outline" onClick={scrollToDearMeEmptyWeekRecovery}>
                  <LifeBuoy className="h-4 w-4" />
                  Open recovery
                </Button>
              ) : null}
              {!emptyWeekRecoveryActive && staleLoopWorkReference ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenSupportHandoffIssue(staleLoopWorkReference)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Open stuck work
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={scrollToDearMeSupportHandoff}>
                <LifeBuoy className="h-4 w-4" />
                Open support handoff
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section
        aria-label="Autonomy contract receipt"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Autonomy contract</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              DearMe can keep working until a move would represent you.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              The team has a plain operating boundary: team preparation moves forward, external action becomes one launch call.
            </p>
          </div>
          <Badge variant={autonomyContractVariant}>{autonomyContractStatus}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {autonomyContractItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>

        <Textarea
          aria-label="Autonomy contract note"
          className="mt-4 min-h-40 resize-none bg-background/85 font-mono text-xs leading-relaxed"
          readOnly
          value={autonomyContractText}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            aria-label={`Download ${DEARME_AUTONOMY_CONTRACT_RECEIPT_FILENAME}`}
            onClick={downloadAutonomyContractReceipt}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Download receipt
          </Button>
        </div>
        {operationsActionActive ? (
          <div
            aria-label="Autonomy contract action"
            className="mt-4 flex flex-col gap-3 rounded-md border border-primary/25 bg-background/85 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Autonomy has a next step, not just a boundary.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyWeekRecoveryActive
                  ? "A paid week with no useful output should move into recovery before the account is treated as healthy."
                  : `A repeated path is stopped; open the stuck work or hand support the context before another pass: ${staleLoopSignal}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {emptyWeekRecoveryActive ? (
                <Button type="button" variant="outline" onClick={scrollToDearMeEmptyWeekRecovery}>
                  <LifeBuoy className="h-4 w-4" />
                  Open recovery
                </Button>
              ) : null}
              {!emptyWeekRecoveryActive && staleLoopWorkReference ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenSupportHandoffIssue(staleLoopWorkReference)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Open stuck work
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={scrollToDearMeSupportHandoff}>
                <LifeBuoy className="h-4 w-4" />
                Open support handoff
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id={DEARME_SUPPORT_HANDOFF_ID}
        aria-label="Paid user support handoff"
        className="mt-4 rounded-md border border-border bg-background p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Support handoff</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Customer help starts with the account context already attached.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe keeps preparing brand work, then gives support a plain handoff when the customer needs account help, a launch call, or clearer direction.
            </p>
          </div>
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Ready for paid support" : "Use after access"}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {supportHandoffItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>

        <Textarea
          aria-label="Support handoff note"
          className="mt-4 min-h-36 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
          readOnly
          value={supportHandoffText}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Support notes become feedback work and a next check-in before the next public move.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              aria-label={`Download ${DEARME_SUPPORT_HANDOFF_RECEIPT_FILENAME}`}
              onClick={downloadSupportHandoffReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
            {paidBetaActive && staleLoopWorkReference ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenSupportHandoffIssue(staleLoopWorkReference)}
              >
                <ArrowRight className="h-4 w-4" />
                Open stuck work
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={supportHandoffActionDisabled}
              onClick={() => onHandleSupportHandoff(supportHandoffText)}
            >
              {supportHandoffPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to Chief of Staff
            </Button>
          </div>
        </div>
        {supportHandoffError ? (
          <div
            aria-label="Support handoff feedback error"
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {supportHandoffError}
          </div>
        ) : null}
        {supportHandoffResult ? (
          <div
            aria-label="Support handoff feedback receipt"
            className="mt-3 flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {supportHandoffResult.status === "queued" ? "Feedback brief sent" : "Feedback brief saved"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {customerProofPackSummary(supportHandoffResult.nextStep)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {paidBetaActive && staleLoopWorkReference ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenSupportHandoffIssue(staleLoopWorkReference)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Open stuck work
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={onOpenVoiceMemory}
              >
                <Sparkles className="h-4 w-4" />
                Open Voice & Memory
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onOpenSupportHandoffIssue(
                    supportHandoffResult.issueIdentifier ?? supportHandoffResult.issueId,
                  )
                }
              >
                <ArrowRight className="h-4 w-4" />
                Open feedback work
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return (
            <DearMeWorkbenchCard
              key={rule.key}
              className="p-4"
              eyebrow={<Badge variant={rule.variant}>{rule.signal}</Badge>}
              title={rule.label}
              description={rule.summary}
              badge={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              }
            />
          );
        })}
      </div>
    </DearMePanel>
  );
}

function WorkReadyPanel({
  items,
  decisionFocus,
  onOpenWorkItem,
  outputReviewState,
  onReviewOutput,
}: {
  items: DearMeWorkbenchWorkItem[];
  decisionFocus?: DearMeDecisionFocus | null;
  onOpenWorkItem: (item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) => void;
  outputReviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  return (
    <DearMePanel aria-label="Work ready">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Work ready"
        title="Prepared work waiting for review"
        description="The strongest finished drafts, proof assets, and reports are first so the next customer action and proof lane are obvious."
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
          {items.map((item, index) => {
            const outputKind = item.outputKind ?? "brand_os";
            const issueReference = workItemTarget(item);
            const routeIntent = reviewLoopRouteIntent(item.reviewLoop);
            const defaultBoundaryCopy = reviewLoopDefaultBoundaryCopy(item.reviewLoop);
            const focused = decisionFocus ? matchesWorkItemFocus(item, decisionFocus) : false;
            const isStuck = isReviewLoopStuck(item.reviewLoop);
            const isReviewable =
              !isStuck && (item.status === "ready_for_review" || item.reviewLoop.state === "needs_user_review");
            return (
              <DearMeActionCard
                key={item.id}
                className="p-4"
                focused={focused}
                eyebrow={roleLabel(item.ownerRole)}
                title={customerProofPackSummary(item.title)}
                summary={customerProofPackSummary(item.summary)}
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
                    <p className="mt-1 text-sm text-foreground/85">
                      {customerProofPackSummary(item.reviewLoop.nextStep)}
                    </p>
                    {defaultBoundaryCopy ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {defaultBoundaryCopy}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">{workReadyNextStepLabel(item.status)}</p>
                  </div>
                </DearMeEvidenceGrid>
                <ReviewHandoffCard loop={item.reviewLoop} className="mt-3" />
                <FocusedPreparedWorkReviewControls
                  outputId={item.id}
                  noteId={`dearme-work-ready-output-note-${index}`}
                  description="Review this launch-ready item without leaving the board. Launch it, send changes back, ask for another pass, or choose a new direction."
                  disabledReason={isStuck ? REVIEW_LOOP_STUCK_DISABLED_REASON : "This lane is still preparing; DearMe will bring it back when it needs your call."}
                  compact
                  isReviewable={isReviewable}
                  reviewState={outputReviewState}
                  onReviewOutput={onReviewOutput}
                />
              </DearMeActionCard>
            );
          })}
        </div>
      )}
    </DearMePanel>
  );
}

function LaunchProofGapPanel({ companyId }: { companyId: string }) {
  const [proofFactValues, setProofFactValues] = useState<Record<string, string>>(() =>
    readDearMeLaunchProofDetailValues(companyId),
  );
  const capturedFactCount = DEARME_OWNER_PROOF_FACT_SPECS.filter(
    (fact) => proofFactValues[fact.provideAs]?.trim(),
  ).length;
  const remainingFactCount = DEARME_OWNER_PROOF_FACT_SPECS.length - capturedFactCount;
  const allProofFactsCaptured = remainingFactCount === 0;
  const ownerProofHandoffReceipt = buildDearMeOwnerProofHandoffReceipt({
    values: proofFactValues,
  });

  useEffect(() => {
    writeDearMeLaunchProofDetailValues(companyId, proofFactValues);
  }, [companyId, proofFactValues]);

  const updateProofFactValue = useCallback((fact: OwnerProofFact, value: string) => {
    setProofFactValues((current) => ({
      ...current,
      [fact.provideAs]: value,
    }));
  }, []);
  const downloadOwnerProofHandoffReceipt = useCallback(() => {
    downloadDearMeOwnerProofHandoffReceipt(ownerProofHandoffReceipt);
  }, [ownerProofHandoffReceipt]);

  return (
    <section
      aria-label="Launch proof gap"
      className="mt-4 rounded-md border border-amber-500/30 bg-amber-50/70 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-amber-800 dark:text-amber-200">
            Launch proof
          </p>
	      <h3 className="mt-1 text-base font-semibold">
	        Proof is usable. Live launch receipts need three details.
	      </h3>
	      <p className="mt-1 max-w-3xl text-sm text-amber-900/80 dark:text-amber-100/80">
	        Keep using the proof here. Broad launch starts after the live delivery details are supplied and checked.
	      </p>
	    </div>
	    <Badge variant="secondary">Launch call</Badge>
      </div>

      <DearMeEvidenceGrid className="mt-4">
        {DEARME_LAUNCH_PROOF_GAP_ITEMS.map((item) => (
          <div key={item.label} className="rounded-md border border-amber-500/25 bg-background/85 p-3">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm text-foreground/85">{item.summary}</p>
          </div>
        ))}
      </DearMeEvidenceGrid>

      <DearMeChecklist
        className="mt-4 grid gap-2 md:grid-cols-3"
        icon={CheckCircle2}
        itemClassName="items-start border-amber-500/25 bg-background/85"
        items={DEARME_LAUNCH_PROOF_HANDOFF_STEPS.map((step) => (
          <span key={step.label}>
            <span className="block font-medium text-foreground">{step.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{step.summary}</span>
          </span>
        ))}
        aria-label="Public launch proof handoff"
      />

      <div
        className="mt-4 rounded-md border border-amber-500/25 bg-background/85 p-3"
        aria-label="Owner live-proof details to provide"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
	    <div>
	      <p className="text-xs font-medium uppercase text-muted-foreground">What I need from you</p>
	      <h4 className="mt-1 text-sm font-semibold text-foreground">
	        Three launch details unlock the guarded receipt.
	      </h4>
          </div>
          <Badge variant="outline">{DEARME_OWNER_PROOF_FACT_SPECS.length} details</Badge>
        </div>
        <div className="mt-3 grid gap-2">
          {DEARME_OWNER_PROOF_FACT_SPECS.map((fact, index) => (
            <div
              key={fact.provideAs}
              className="grid gap-3 rounded-md border border-border bg-background/70 p-3 sm:grid-cols-[2rem_minmax(0,1fr)]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-500/30 bg-amber-100 text-xs font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                {index + 1}
              </div>
	      <div className="min-w-0">
	        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
	          <p className="text-sm font-medium text-foreground">{ownerProofFactLabel(fact)}</p>
	          <Badge variant={proofFactValues[fact.provideAs]?.trim() ? "secondary" : "outline"}>
	            {proofFactValues[fact.provideAs]?.trim() ? "Captured" : "Needed"}
	          </Badge>
	        </div>
	        <p className="mt-1 text-sm text-foreground/80">{ownerProofFactPrompt(fact)}</p>
	        <p className="mt-2 text-xs text-muted-foreground">
	          <span className="font-medium text-foreground/80">How to provide it: </span>
	          {ownerProofFactExample(fact)}
	        </p>
	        <p className="mt-1 text-xs text-muted-foreground">{ownerProofFactBoundary(fact)}</p>
	        <div className="mt-3">
	          <Input
	            aria-label={`Provide ${ownerProofFactLabel(fact)}`}
	            type={ownerProofFactInputType(fact)}
	            inputMode={fact.provideAs === "DEARME_OPENCLAW_IMESSAGE_SMOKE_RECIPIENT" ? "tel" : undefined}
	            placeholder={ownerProofFactExample(fact)}
	            value={proofFactValues[fact.provideAs] ?? ""}
	            onChange={(event: ChangeEvent<HTMLInputElement>) => updateProofFactValue(fact, event.target.value)}
	          />
	        </div>
	      </div>
            </div>
          ))}
        </div>
        <div
          className="mt-3 rounded-md border border-amber-500/25 bg-amber-50/70 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
          aria-label="Launch proof detail readiness"
          aria-live="polite"
        >
          <p className="font-medium">
            {allProofFactsCaptured ? "Ready for no-send check." : `${remainingFactCount} details left before no-send check.`}
          </p>
          <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
            {allProofFactsCaptured
              ? "DearMe has the three approved details in this browser tab and still waits before sending, posting, changing the page, or spending."
              : "Fill the three details here first; DearMe keeps every external move behind the launch call."}
          </p>
          <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
            Saved for this browser tab so the no-send preparation survives refresh without creating a public move.
          </p>
        </div>
      </div>

      <div
        className="mt-4 rounded-md border border-amber-500/25 bg-background/85 p-3"
        aria-label="Owner proof reply template"
      >
	    <p className="text-xs font-medium uppercase text-muted-foreground">One reply</p>
	    <h4 className="mt-1 text-sm font-semibold text-foreground">
	      Send these launch details to unlock the proof pass.
	    </h4>
        <div className="mt-3 grid gap-2">
          {DEARME_OWNER_PROOF_REPLY_TEMPLATE.map((line) => (
            <p key={line.label} className="rounded-md border border-border bg-background/70 p-2 text-sm text-foreground/85">
              <span className="font-medium text-foreground">{line.label}: </span>
              {line.value}
            </p>
          ))}
        </div>
        <p className="mt-3 rounded-md border border-border bg-background/70 p-2 text-xs text-muted-foreground">
          Captured here: {capturedFactCount}/{DEARME_OWNER_PROOF_FACT_SPECS.length} details. This prepares the
          check only; it does not launch anything.
        </p>
	  <p className="mt-3 text-xs text-muted-foreground">
		    DearMe checks the route first; the live receipt remains behind the final launch call.
	  </p>
      </div>

      <div
        className="mt-4 rounded-md border border-amber-500/25 bg-background/85 p-3"
        aria-label="Launch proof handoff receipt"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Handoff receipt</p>
            <h4 className="mt-1 text-sm font-semibold text-foreground">
              One private note carries the setup into the no-send check.
            </h4>
          </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant={allProofFactsCaptured ? "secondary" : "outline"}>
            {allProofFactsCaptured ? "Ready for check" : `${remainingFactCount} left`}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            aria-label={`Download ${DEARME_OWNER_PROOF_HANDOFF_RECEIPT_FILENAME}`}
            onClick={downloadOwnerProofHandoffReceipt}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Download receipt</span>
          </Button>
        </div>
      </div>
      <Textarea
        aria-label="Launch proof handoff receipt note"
          className="mt-3 min-h-48 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
          readOnly
          value={ownerProofHandoffReceipt}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="rounded-md border border-amber-500/25 bg-background/85 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Owner proof checklist</p>
          <DearMeChecklist
            className="mt-3"
            icon={CheckCircle2}
            itemClassName="items-start border-amber-500/20 bg-transparent"
            items={DEARME_OWNER_PROOF_CHECKLIST_ITEMS.map((item) => (
              <span key={item.label}>
                <span className="block font-medium text-foreground">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.summary}</span>
              </span>
            ))}
            aria-label="Owner proof checklist"
          />
        </div>
        <div
          className="rounded-md border border-amber-500/25 bg-background/85 p-3"
          aria-label="Launch proof safety boundary"
        >
	  <p className="text-xs font-medium uppercase text-muted-foreground">Safety boundary</p>
	  <p className="mt-2 text-sm text-foreground/85">
	    No public message, page change, spend, or broad launch moves from this panel. The first pass is a no-send
	    check; the guarded live receipt runs only after you choose the exact details.
	  </p>
        </div>
      </div>

	  <p className="mt-3 rounded-md border border-amber-500/25 bg-background/80 p-3 text-sm text-foreground/85">
	    Next action: collect the live-proof details, run one guarded launch-proof pass, then bring the receipt
	    back as the launch call.
	  </p>
    </section>
  );
}

function DecisionsNeededPanel({
  companyId,
  batches,
  batchReviewLoops,
  decisions,
  sourceReviews,
  decisionFocus,
  onOpenBatch,
  onOpenDecision,
  onOpenSourceReview,
  onOpenWorkReady,
}: {
  companyId: string;
  batches: DearMeWorkbenchBatchDecision[];
  batchReviewLoops: ReadonlyMap<string, DearMeOutputReviewLoop | null>;
  decisions: DearMeWorkbenchDecision[];
  sourceReviews: DearMeSourceReviewItem[];
  decisionFocus?: DearMeDecisionFocus | null;
  onOpenBatch: (batch: DearMeWorkbenchBatchDecision) => void;
  onOpenDecision: (decision: DearMeWorkbenchDecision) => void;
  onOpenSourceReview: (sourceReview: DearMeSourceReviewItem) => void;
  onOpenWorkReady: () => void;
}) {
  const waitingCount = batches.length + decisions.length + sourceReviews.length;
  const launchQualityChecks: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    summary: string;
  }> = [
    {
      key: "voice-fit",
      icon: Gauge,
      label: "Voice fit",
      summary: "If it does not sound like you, request changes or another pass.",
    },
    {
      key: "proof-attached",
      icon: FileText,
      label: "Proof attached",
      summary: "Every public claim should point back to a saved source, result, or recent receipt.",
    },
    {
      key: "boundary-clear",
      icon: ShieldCheck,
      label: "Boundary clear",
      summary: "Posts, outbound, spend, and page changes wait for your call before they represent you.",
    },
  ];
  const launchCallChoices: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    title: string;
    summary: string;
  }> = [
    {
      key: "approve",
      icon: CheckCircle2,
      label: "Launch inside boundary",
      title: "Let the prepared move go forward when the proof is safe.",
      summary: "Useful when the draft, source, audience, and launch rule all match what you want represented.",
    },
    {
      key: "revise",
      icon: MessageSquare,
      label: "Request changes",
      title: "Send the work back with one plain note.",
      summary: "DearMe keeps the context, updates the draft, and returns with a cleaner pass.",
    },
    {
      key: "pause",
      icon: XCircle,
      label: "Pause the lane",
      title: "Stop this path before it spends more attention.",
      summary: "Use this when the angle, target, or timing is wrong and should not keep looping.",
    },
    {
      key: "private-pass",
      icon: RefreshCw,
      label: "Another pass",
      title: "Let the team keep working without public action.",
      summary: "Useful when the direction is right but the work needs more proof, voice, or options.",
    },
  ];
  const beforeLaunchChecksReceiptText = [
    "DearMe before-launch checks receipt",
    `Waiting launch calls: ${waitingCount}`,
    `Call choices: ${launchCallChoices.map((choice) => choice.label).join("; ")}`,
    ...launchQualityChecks.map((check) => `${check.label}: ${check.summary}`),
    waitingCount > 0
      ? "Next support step: open the waiting call, check voice, proof, and boundary, then choose launch, revise, pause, or another pass."
      : "Next support step: keep the team preparing privately until a real launch call appears.",
    "Can continue privately: another pass, proof gathering, Voice & Memory updates, report prep, and opportunity research.",
    "Must wait: public posts, outbound messages, page changes, spend, account authorization, live proof, and irreversible moves.",
    "Boundary: launch only when the work sounds right, cites real proof, and stays inside the launch rule.",
  ].join("\n");
  const afterCallOutcomeReceiptText = [
    "DearMe after-call outcome receipt",
    `Waiting launch calls: ${waitingCount}`,
    "Launch inside boundary: approved work moves forward only inside the launch rule you just chose.",
    "Request changes: DearMe keeps the context, applies your note, and returns with a cleaner pass.",
    "Pause the lane: DearMe stops this path, preserves the reason, and shifts attention to better work.",
    "Another pass: DearMe keeps working privately with more proof, voice fit, or options before asking again.",
    waitingCount > 0
      ? "Next support step: open a waiting call, make one clear choice, then let DearMe continue the right path."
      : "Next support step: no launch call is waiting; DearMe can keep preparing privately until one is ready.",
    "Can continue privately: revisions, research, proof gathering, Voice & Memory updates, reports, and next-cycle prep.",
    "Must wait: public posts, outbound messages, page changes, spend, account authorization, live proof, and irreversible moves.",
  ].join("\n");
  const downloadAfterCallOutcomeReceipt = useCallback(() => {
    downloadDearMeReceipt(afterCallOutcomeReceiptText, DEARME_AFTER_CALL_OUTCOME_RECEIPT_FILENAME);
  }, [afterCallOutcomeReceiptText]);
  const downloadBeforeLaunchChecksReceipt = useCallback(() => {
    downloadDearMeReceipt(beforeLaunchChecksReceiptText, DEARME_BEFORE_LAUNCH_CHECKS_RECEIPT_FILENAME);
  }, [beforeLaunchChecksReceiptText]);

  return (
    <DearMePanel id="dearme-decisions-needed" aria-label="Decisions needed">
      <DearMeWorkbenchSectionHeader
        icon={ShieldCheck}
        eyebrow="Decisions needed"
        title="High-leverage calls"
        description="After Work Ready, make the launch call here: launch, request changes, pause a lane, or ask for another pass."
        trailing={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {waitingCount > 0 ? (
              <Badge variant="secondary">{waitingCount} waiting</Badge>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onOpenWorkReady}>
              <FileText className="h-4 w-4" />
              Review Work Ready
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <LaunchProofGapPanel companyId={companyId} />
      <section
        aria-label="Launch call choices"
        className="mt-4 rounded-md border border-border bg-background/75 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Launch call choices</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              One call can launch, revise, pause, or keep the team working.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe keeps moving autonomously until a move would represent you. Then it gives you one clear call instead of a process to manage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={waitingCount > 0 ? "secondary" : "outline"}>
              {waitingCount > 0 ? pluralizeCount(waitingCount, "waiting call") : "No call waiting"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_AFTER_CALL_OUTCOME_RECEIPT_FILENAME}`}
              onClick={downloadAfterCallOutcomeReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {launchCallChoices.map((choice) => {
            const ChoiceIcon = choice.icon;

            return (
              <div key={choice.key} className="rounded-md border border-border bg-background/80 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <ChoiceIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {choice.label}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{choice.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{choice.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="After-call outcome receipt note"
          className="mt-4 min-h-40 resize-none bg-background/85 font-mono text-xs leading-relaxed"
          readOnly
          value={afterCallOutcomeReceiptText}
        />
      </section>
      <section
        aria-label="Before launch checks"
        className="mt-4 rounded-md border border-border bg-muted/20 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Before launch</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Check voice, proof, and boundary before anything represents you.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              Launch only when the work sounds right, cites real proof, and stays inside the launch rule.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant="outline">Quality gate</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_BEFORE_LAUNCH_CHECKS_RECEIPT_FILENAME}`}
              onClick={downloadBeforeLaunchChecksReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {launchQualityChecks.map((check) => {
            const CheckIcon = check.icon;

            return (
              <div key={check.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CheckIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {check.label}
                </div>
                <p className="mt-2 text-sm text-foreground/85">{check.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Before launch checks receipt note"
          className="mt-4 min-h-40 resize-none bg-background/85 font-mono text-xs leading-relaxed"
          readOnly
          value={beforeLaunchChecksReceiptText}
        />
      </section>
      {batches.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Batch decisions</p>
          {batches.map((batch) => {
            const focused = decisionFocus ? matchesBatchFocus(batch, decisionFocus) : false;
            const reviewLoop = batchReviewLoops.get(batch.id) ?? null;
            const isStuck = isReviewLoopStuck(reviewLoop);
            return (
              <DearMeActionCard
                key={batch.id}
                className="p-4"
                focused={focused}
                title={customerProofPackSummary(batch.title)}
                summary={customerProofPackSummary(batch.summary)}
                attention={isStuck
                  ? {
                      kind: "blocked",
                      label: "Direction needed",
                      detail: REVIEW_LOOP_STUCK_DISABLED_REASON,
                    }
                  : {
                      kind: "decision_needed",
                      label: "Launch call ready",
                      detail: `Choose the launch boundary for ${batch.itemCount} prepared move${batch.itemCount === 1 ? "" : "s"}.`,
                    }}
                statusBadges={[
                  {
                    label: batch.riskGate ? RISK_GATE_LABELS[batch.riskGate] : "Review",
                    variant: batch.riskGate ? "secondary" : "outline",
                  },
                  ...(reviewLoop
                    ? [
                        {
                          label: reviewLoopLabel(reviewLoop),
                          variant: "outline" as const,
                        },
                        {
                          label: reviewLoopStateLabel(reviewLoop),
                          variant: reviewLoopVariant(reviewLoop),
                        },
                      ]
                    : []),
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
                    label: customerProofPackSummary(batch.actionLabel),
                    onClick: () => onOpenBatch(batch),
                    disabled: batch.approvalIds.length === 0 && batch.issueIds.length === 0,
                    variant: "default",
                  }
                }
              >
                <DearMeEvidenceGrid>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {isStuck ? "Direction needed" : "Launch call ready"}
                    </p>
                    <p className="mt-1 text-sm">
                      {isStuck
                        ? "Review the capped path before spending another pass."
                        : `Review ${batch.itemCount} prepared move${batch.itemCount === 1 ? "" : "s"}.`}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Choices</p>
                    <p className="mt-1 text-sm">
                      {isStuck
                        ? "Add Voice & Memory context or use support before another pass."
                        : "Launch, request changes, pause, or ask for another pass."}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">After your call</p>
                    <p className="mt-1 text-sm text-foreground/85">
                      {reviewLoop
                        ? customerProofPackSummary(reviewLoop.nextStep)
                        : decisionAfterCallLabel(batch.riskGate)}
                    </p>
                  </div>
                </DearMeEvidenceGrid>
              </DearMeActionCard>
            );
          })}
        </div>
      ) : null}
      {sourceReviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Source reviews</p>
          {sourceReviews.map((item) => {
            const sourceHref = privateSourceLink(item.sourceInputMode, item.sourceLabel);

            return (
              <DearMeActionCard
                key={item.id}
                className="p-4"
                title={customerProofPackSummary(item.sourceTitle)}
                summary={customerProofPackSummary(item.summary)}
                attention={{
                  kind: "decision_needed",
	                  label: "Review ready",
                  detail: customerProofPackSummary(item.nextAction),
                }}
                statusBadges={[
                  {
                    label: MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode],
                    variant: "outline",
                  },
                  {
                    label: MEMORY_KIND_LABELS[item.proposedKind],
                    variant: "outline",
                  },
                ]}
                chips={[
                  ...(item.sourceLabel
                    ? [{ label: sourceLabelForChip(item.sourceLabel), variant: "outline" as const }]
                    : []),
                  { label: shortDate(item.createdAt), variant: "outline" },
                ]}
                calloutLabel="Why it matters"
                callout="Your team found a saved source it can use, but it should become reviewed memory before guiding future public work."
                action={{
                  label: "Review source",
                  ariaLabel: `Review source ${item.sourceTitle}`,
                  onClick: () => onOpenSourceReview(item),
                  variant: "default",
                }}
              >
                <div className="space-y-3">
                  {sourceHref ? <PrivateSourceLink href={sourceHref} /> : null}
                  <DearMeEvidenceGrid>
                    <div className="rounded-md border border-border bg-background/80 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Prepared source</p>
                      <p className="mt-1 text-sm">{customerProofPackSummary(item.sourceTitle)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background/80 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Suggested memory</p>
                      <p className="mt-1 text-sm text-foreground/85">
                        {customerProofPackSummary(item.proposedTitle)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background/80 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Your next step</p>
                      <p className="mt-1 text-sm text-foreground/85">{customerProofPackSummary(item.nextAction)}</p>
                    </div>
                  </DearMeEvidenceGrid>
                </div>
              </DearMeActionCard>
            );
          })}
        </div>
      ) : null}
      {waitingCount === 0 ? (
        <DearMeEmptyState
          className="mt-4"
          icon={ShieldCheck}
          title="No high-leverage decision is waiting right now"
          description="Your team will place prepared public moves here when they need your call."
        />
      ) : null}
      {decisions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {batches.length > 0 ? (
            <p className="text-xs font-medium text-muted-foreground">Individual decisions</p>
          ) : null}
          {decisions.map((decision) => {
            const focused = decisionFocus ? matchesDecisionFocus(decision, decisionFocus) : false;
            return (
              <DearMeActionCard
                key={decision.id}
                className="p-4"
                focused={focused}
                title={customerProofPackSummary(decision.title)}
                summary={customerProofPackSummary(decision.summary)}
                attention={decisionActionAttention(decision)}
                statusBadges={[
                  {
                    label: decision.riskGate ? RISK_GATE_LABELS[decision.riskGate] : "Launch",
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
                      : "Brand team decision",
                    variant: "outline",
                  },
                ]}
                footer={`Updated ${shortDate(decision.updatedAt)}`}
                action={
                  {
                    label: decision.approvalId ? "Launch" : "Review",
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
                      {decision.outputKind ? OUTPUT_KIND_LABELS[decision.outputKind] : "Brand team decision"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Available choices</p>
                    <p className="mt-1 text-sm">Launch, request changes, pause, or keep it staged.</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">After your call</p>
                    <p className="mt-1 text-sm text-foreground/85">
                      {decision.reviewLoop?.nextStep
                        ? customerProofPackSummary(decision.reviewLoop.nextStep)
                        : decisionAfterCallLabel(decision.riskGate)}
                    </p>
                    {decision.reviewLoop?.lastDecisionNotePreview ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last call: {decision.reviewLoop.lastDecisionNotePreview}
                      </p>
                    ) : null}
                  </div>
                </DearMeEvidenceGrid>
              </DearMeActionCard>
            );
          })}
        </div>
      ) : null}
    </DearMePanel>
  );
}

function OperatingLoopPanel({
  workbench,
  paidBetaActive,
  onOpenVoiceMemory,
  onOpenNextDecision,
  onOpenWorkReady,
}: {
  workbench: DearMeWorkbenchResponse;
  paidBetaActive: boolean;
  onOpenVoiceMemory: () => void;
  onOpenNextDecision: () => void;
  onOpenWorkReady: () => void;
}) {
  const reviewLoops = [
    ...workbench.workReady.map((item) => item.reviewLoop),
    ...workbench.activeWork.map((item) => item.reviewLoop),
    ...workbench.decisionsNeeded.map((item) => item.reviewLoop),
    ...workbench.workStream.map((item) => item.reviewLoop),
  ].filter((loop): loop is DearMeOutputReviewLoop => Boolean(loop));
  const feedbackTraces = reviewLoops
    .map((loop) => loop.feedbackTrace)
    .filter((trace): trace is NonNullable<DearMeOutputReviewLoop["feedbackTrace"]> => Boolean(trace));
  const appliedChangeCount = feedbackTraces.reduce((count, trace) => count + trace.changes.length, 0);
  const latestFeedbackTrace = feedbackTraces[0] ?? null;
  const reviewFeedbackItems = workbench.memory.latest.filter((item) => item.kind === "review_feedback");
  const latestReviewFeedback = reviewFeedbackItems[0] ?? null;
  const feedbackWorkItems = workbench.workStream.filter((item) =>
    item.sourceLabel === "Feedback brief" ||
    (item.role === "chief_of_staff" && item.cycleStage === "learn" && item.artifact === "Feedback brief")
  );
  const latestFeedbackWorkItem = feedbackWorkItems[0] ?? null;
  const decisionCount =
    workbench.decisionsNeeded.length +
    workbench.batchDecisions.length +
    workbench.memory.sourceReviewQueue.length;
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
  const learningSignalCount = Math.max(
    memorySignalCount,
    workbench.memory.latest.length +
      workbench.memory.sourceReviewQueue.length +
      feedbackWorkItems.length +
      (workbench.report?.learnings.length ?? 0),
  );
  const nextCycleWorkSignal = paidBetaActive
    ? workCount > 0
      ? pluralizeCount(workCount, "work item")
      : "Queue ready"
    : "Starts after access";
  const nextCycleDecisionSignal = decisionCount > 0
    ? pluralizeCount(decisionCount, "call")
    : "No call waiting";
  const nextCycleMemorySummary = workbench.report?.learnings[0]
    ? customerProofPackSummary(workbench.report.learnings[0])
    : latestReviewFeedback
      ? customerProofPackSummary(latestReviewFeedback.bodyPreview)
      : customerProofPackSummary(workbench.memory.voiceProfile.nextStep);
  const autonomousNextMoveItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    actionLabel: string;
    onAction: () => void;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "launch-calls",
      icon: ShieldCheck,
      label: decisionCount > 0 ? "Handle launch calls" : "Keep launch boundary clear",
      signal: decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "No call waiting",
      summary: decisionCount > 0
        ? "Start with the next waiting call, then launch, revise, pause, or keep the work staged."
        : "DearMe can keep preparing brand work until a public, outbound, spend, or page-changing move appears.",
      actionLabel: decisionCount > 0 ? "Open next decision" : "Review work ready",
      onAction: decisionCount > 0 ? onOpenNextDecision : onOpenWorkReady,
      variant: decisionCount > 0 ? "default" : "outline",
    },
    {
      key: "voice-memory",
      icon: Sparkles,
      label: workbench.memory.sourceReviewQueue.length > 0
        ? "Review sources for memory"
        : "Strengthen Voice & Memory",
      signal: workbench.memory.sourceReviewQueue.length > 0
        ? `${workbench.memory.sourceReviewQueue.length} source`
        : `Voice ${Math.round(workbench.memory.voiceProfile.confidence)}%`,
      summary: workbench.memory.sourceReviewQueue[0]
        ? customerProofPackSummary(workbench.memory.sourceReviewQueue[0].nextAction)
        : customerProofPackSummary(workbench.memory.voiceProfile.nextStep),
      actionLabel: "Open Voice & Memory",
      onAction: onOpenVoiceMemory,
      variant: workbench.memory.sourceReviewQueue.length > 0 ? "secondary" : "outline",
    },
    {
      key: "ready-work",
      icon: Workflow,
      label: workCount > 0 ? "Keep ready work visible" : "Prepare first useful output",
      signal: workCount > 0 ? pluralizeCount(workCount, "item") : paidBetaActive ? "Queue ready" : "Access first",
      summary: workCount > 0
        ? "Prepared work stays easy to find so the customer sees progress before another team pass runs."
        : paidBetaActive
          ? "DearMe should create one useful output before the next customer check-in."
          : "The brand work list opens after paid beta access is recorded.",
      actionLabel: "Open work ready",
      onAction: onOpenWorkReady,
      variant: workCount > 0 ? "default" : "secondary",
    },
  ];
  const nextCycleReceiptItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "next-briefing",
      icon: FileText,
      label: "Next briefing",
      signal: workbench.report ? "Briefing ready" : "First report pending",
      summary: workbench.report?.nextBets[0]
        ? customerProofPackSummary(workbench.report.nextBets[0])
        : "The first Dear me report appears after the brand cycle has useful work to recap.",
      variant: workbench.report ? "default" : "outline",
    },
    {
      key: "work-continues",
      icon: Workflow,
      label: "Work continues",
      signal: nextCycleWorkSignal,
      summary: paidBetaActive
        ? "DearMe keeps preparing drafts, opportunities, proof, and report updates until a launch call is needed."
        : "The loop is ready, but new operating work waits for paid beta access.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "decision-rhythm",
      icon: ShieldCheck,
      label: "Decision rhythm",
      signal: nextCycleDecisionSignal,
      summary: decisionCount > 0
        ? "Your next visit starts with the waiting launch calls, not with setup work."
        : "DearMe can keep moving internally until a public, outbound, spend, or page-changing move appears.",
      variant: decisionCount > 0 ? "secondary" : "outline",
    },
    {
      key: "memory-reuse",
      icon: Sparkles,
      label: "Memory to reuse",
      signal: learningSignalCount > 0 ? pluralizeCount(learningSignalCount, "signal") : "Learning ready",
      summary: nextCycleMemorySummary,
      variant: "outline",
    },
  ];
  const nextCycleRetentionReceiptText = [
    "DearMe next cycle retention receipt",
    `Account: ${paidBetaActive ? "Retention loop active" : "Ready after access"}`,
    `Next briefing: ${nextCycleReceiptItems[0]?.signal ?? "First report pending"} - ${
      nextCycleReceiptItems[0]?.summary ??
      "The first Dear me report appears after the brand cycle has useful work to recap."
    }`,
    `Work continues: ${nextCycleReceiptItems[1]?.signal ?? nextCycleWorkSignal} - ${
      nextCycleReceiptItems[1]?.summary ??
      "DearMe keeps preparing drafts, opportunities, proof, and report updates until a launch call is needed."
    }`,
    `Decision rhythm: ${nextCycleReceiptItems[2]?.signal ?? nextCycleDecisionSignal} - ${
      nextCycleReceiptItems[2]?.summary ??
      "DearMe can keep moving internally until a public, outbound, spend, or page-changing move appears."
    }`,
    `Memory to reuse: ${nextCycleReceiptItems[3]?.signal ?? "Learning ready"} - ${
      nextCycleReceiptItems[3]?.summary ?? nextCycleMemorySummary
    }`,
    latestEvent
      ? `Latest signal: ${customerProofPackSummary(latestEvent.title)} - ${customerProofPackSummary(latestEvent.summary)}`
      : "Latest signal: Start the first growth cycle to see what the team is doing now.",
    `Next support step: ${
      decisionCount > 0
        ? "Start with the waiting launch calls before another public move."
        : paidBetaActive
          ? "Keep preparing the next private proof pack until a launch call is needed."
          : "Record paid access before new operating work starts."
    }`,
    "Boundary: DearMe can keep planning, drafting, researching, reporting, and learning privately; public sends, launches, spend, account changes, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadNextCycleRetentionReceipt = useCallback(() => {
    downloadDearMeReceipt(nextCycleRetentionReceiptText, DEARME_NEXT_CYCLE_RETENTION_RECEIPT_FILENAME);
  }, [nextCycleRetentionReceiptText]);
  const feedbackLearningItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "feedback-brief",
      icon: LifeBuoy,
      label: "Feedback in progress",
      signal: feedbackWorkItems.length > 0 ? pluralizeCount(feedbackWorkItems.length, "active brief") : "Ready for support notes",
      summary: latestFeedbackWorkItem
        ? customerProofPackSummary(latestFeedbackWorkItem.summary)
        : "When feedback or support notes arrive, DearMe turns them into recovery work and next-cycle changes.",
      variant: feedbackWorkItems.length > 0 ? "default" : "outline",
    },
    {
      key: "review-feedback",
      icon: MessageSquare,
      label: "Review feedback",
      signal: reviewFeedbackItems.length > 0 ? pluralizeCount(reviewFeedbackItems.length, "saved note") : "Ready to learn",
      summary: latestReviewFeedback
        ? customerProofPackSummary(latestReviewFeedback.bodyPreview)
        : "When you request changes, DearMe saves the useful direction for the next pass.",
      variant: reviewFeedbackItems.length > 0 ? "default" : "outline",
    },
    {
      key: "applied-changes",
      icon: CheckCircle2,
      label: "Applied changes",
      signal: appliedChangeCount > 0 ? pluralizeCount(appliedChangeCount, "change") : "Waiting on first revision",
      summary: latestFeedbackTrace
        ? customerProofPackSummary(latestFeedbackTrace.summary)
        : "Revision receipts will show what changed before the work comes back to you.",
      variant: appliedChangeCount > 0 ? "default" : "outline",
    },
    {
      key: "source-learning",
      icon: FileText,
      label: "Sources to learn",
      signal: workbench.memory.sourceReviewQueue.length > 0
        ? `${workbench.memory.sourceReviewQueue.length} to review`
        : pluralizeCount(workbench.memory.sourceCount, "saved source"),
      summary: customerProofPackSummary(workbench.memory.sourcePlan.summary),
      variant: workbench.memory.sourceReviewQueue.length > 0 ? "secondary" : "outline",
    },
    {
      key: "next-cycle-memory",
      icon: Sparkles,
      label: "Next cycle memory",
      signal: workbench.report?.learnings.length
        ? pluralizeCount(workbench.report.learnings.length, "learning")
        : titleizeStatus(workbench.memory.voiceProfile.status),
      summary: workbench.report?.learnings[0]
        ? customerProofPackSummary(workbench.report.learnings[0])
        : customerProofPackSummary(workbench.memory.voiceProfile.nextStep),
      variant: "outline",
    },
  ];
  const feedbackLearningReceiptText = [
    "DearMe feedback learning receipt",
    `Account: ${paidBetaActive ? "Learning while operating" : "Ready after first review"}`,
    `Feedback in progress: ${feedbackLearningItems[0]?.signal ?? "Ready for support notes"}`,
    `Feedback brief: ${feedbackLearningItems[0]?.summary ?? "When feedback or support notes arrive, DearMe turns them into recovery work and next-cycle changes."}`,
    `Saved feedback: ${feedbackLearningItems[1]?.signal ?? "Ready to learn"}`,
    `Latest direction: ${feedbackLearningItems[1]?.summary ?? "When you request changes, DearMe saves the useful direction for the next pass."}`,
    `Applied changes: ${feedbackLearningItems[2]?.signal ?? "Waiting on first revision"}`,
    `Revision receipt: ${feedbackLearningItems[2]?.summary ?? "Revision receipts will show what changed before the work comes back to you."}`,
    `Sources to learn: ${feedbackLearningItems[3]?.signal ?? "No sources waiting"}`,
    `Source plan: ${feedbackLearningItems[3]?.summary ?? customerProofPackSummary(workbench.memory.sourcePlan.summary)}`,
    `Next cycle memory: ${feedbackLearningItems[4]?.summary ?? nextCycleMemorySummary}`,
    "Boundary: feedback updates private direction, memory, and next drafts; public sends, launches, spend, account changes, and irreversible moves still wait for the final call.",
  ].join("\n");
  const downloadFeedbackLearningReceipt = useCallback(() => {
    downloadDearMeReceipt(feedbackLearningReceiptText, DEARME_FEEDBACK_LEARNING_RECEIPT_FILENAME);
  }, [feedbackLearningReceiptText]);
  const loopStages = [
    {
      key: "plan",
      icon: Gauge,
      label: "Plan",
      title: "Chief of Staff sets the cycle",
      summary: "Turns your profile into the few moves that should compound your public surface this week.",
      signal: pluralizeCount(workbench.team.length, "team role"),
    },
    {
      key: "work",
      icon: Workflow,
      label: "Work",
      title: "The team prepares assets",
      summary: "Content, opportunity, and proof lanes turn saved sources into draft work before you step in.",
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
    {
      key: "learn",
      icon: Sparkles,
      label: "Learn",
      title: "Voice & Memory improves the next pass",
      summary: "Feedback, proof sources, and report learnings shape the next brand cycle automatically.",
      signal: learningSignalCount > 0 ? pluralizeCount(learningSignalCount, "learning signal") : "Ready after feedback",
    },
  ];

  return (
    <DearMePanel aria-label="Growth cycle plan">
      <DearMeWorkbenchSectionHeader
        icon={Workflow}
        eyebrow="Growth cycle"
        title="Plan, work, review, then learn."
        description="DearMe keeps the operating rhythm visible while the team moves, the work becomes reviewable, and the launch call stays separate from team motion."
        trailing={
          <Badge variant={paidBetaActive ? "default" : "secondary"}>
            {paidBetaActive ? "Cycle active" : "Preview mode"}
          </Badge>
        }
      />

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
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
              <p className="mt-2 text-sm font-medium">{customerProofPackSummary(latestEvent.title)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {customerProofPackSummary(latestEvent.summary)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Start the first growth cycle to see what the team is doing now.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-background/80 p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Launch boundary</p>
          <p className="mt-2 text-sm text-foreground/85">
            Brand work keeps moving. Public posts, outbound messages, page changes, and spend come back as one launch call.
          </p>
        </div>
      </div>

      <section
        aria-label="Autonomous next moves"
        className="mt-4 rounded-md border border-primary/20 bg-background p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Next moves</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              DearMe has next moves ready before it needs you again.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              The next actions stay explicit: clear the launch calls, improve memory, and keep ready work visible before another cycle spends effort.
            </p>
          </div>
          <Badge variant={decisionCount > 0 ? "secondary" : "default"}>
            {decisionCount > 0 ? pluralizeCount(decisionCount, "call") : "Self-moving"}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {autonomousNextMoveItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex min-h-full flex-col rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 flex-1 text-xs text-muted-foreground">{item.summary}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 h-auto min-h-9 w-full min-w-0 whitespace-normal"
                  onClick={item.onAction}
                >
                  {item.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Next cycle retention receipt"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Next check-in</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              You can leave and know what DearMe will do next.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              The brand team keeps the next briefing, work list, launch calls, and memory signals visible so returning does not feel like restarting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Retention loop active" : "Ready after access"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_NEXT_CYCLE_RETENTION_RECEIPT_FILENAME}`}
              onClick={downloadNextCycleRetentionReceipt}
            >
              <FileText className="h-4 w-4" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {nextCycleReceiptItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Next cycle retention receipt note"
          className="mt-4 min-h-36 resize-none bg-background/85 text-sm"
          value={nextCycleRetentionReceiptText}
          readOnly
        />
      </section>

      <section
        aria-label="Feedback learning receipt"
        className="mt-4 rounded-md border border-border bg-muted/20 p-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Learning receipt</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Your corrections become the next pass.
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              DearMe turns review notes, saved sources, and report learnings into the next brand cycle instead of making you repeat direction.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Learning while operating" : "Ready after first review"}
            </Badge>
            <Button type="button" size="sm" variant="outline" onClick={onOpenVoiceMemory}>
              <Sparkles className="h-4 w-4" />
              Open Voice & Memory
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_FEEDBACK_LEARNING_RECEIPT_FILENAME}`}
              onClick={downloadFeedbackLearningReceipt}
            >
              <FileText className="h-4 w-4" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {feedbackLearningItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-4 rounded-md border border-border bg-background/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Growth map</p>
            <p className="mt-2 text-sm text-foreground/85">
              Your team turns brand work into launch-ready moves, remembers what you change, and keeps public action inside one boundary.
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
                <p className="text-sm font-semibold">Team progress map</p>
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
                    title={customerProofPackSummary(node.label)}
                    description={customerProofPackSummary(node.summary)}
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
                        <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
                          {customerProofPackSummary(actionGraphNextMove(node))}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Updated {shortDate(node.updatedAt)}</Badge>
                        {connectionLabels.map((label) => (
                          <Badge key={`${node.id}:${label}`} variant="secondary">
                            {customerProofPackSummary(titleizeStatus(label))}
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

function BrandTeamRunLedgerPanel({ entries }: { entries: DearMeWorkbenchRunLedgerEntry[] }) {
  const visibleEntries = entries.slice(0, 8);
  const countsByKind = RUN_LEDGER_KIND_ORDER.reduce((counts, kind) => {
    counts[kind] = entries.filter((entry) => entry.kind === kind).length;
    return counts;
  }, {} as Record<DearMeWorkbenchRunLedgerEntry["kind"], number>);

  return (
    <DearMePanel aria-label="Brand team run ledger">
      <DearMeWorkbenchSectionHeader
        icon={Gauge}
        eyebrow="Brand team run ledger"
        title="What your team moved while you were away."
        description="A compact record of what the brand team moved, prepared, learned, staged at the boundary, skipped, and now needs from you."
        trailing={<Badge variant="outline">{pluralizeCount(entries.length, "entry")}</Badge>}
      />

      <DearMeEvidenceGrid className="mt-4 md:grid-cols-2 xl:grid-cols-4">
        {RUN_LEDGER_KIND_ORDER.map((kind) => {
          const Icon = RUN_LEDGER_KIND_ICONS[kind];

          return (
            <div key={kind} className="h-full" data-dearme-run-ledger-bucket={runLedgerBucketMarker(kind)}>
              <DearMeWorkbenchCard
                key={kind}
                className="h-full p-4"
                eyebrow={<Badge variant="outline">{pluralizeCount(countsByKind[kind], "entry")}</Badge>}
                title={RUN_LEDGER_KIND_LABELS[kind]}
                description={RUN_LEDGER_KIND_DESCRIPTIONS[kind]}
                badge={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                }
              />
            </div>
          );
        })}
      </DearMeEvidenceGrid>

      {visibleEntries.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2" data-dearme-run-ledger="brand-team">
          {visibleEntries.map((entry) => {
            const Icon = RUN_LEDGER_KIND_ICONS[entry.kind];

            return (
              <DearMeWorkbenchCard
                key={entry.id}
                className="p-4"
                eyebrow={
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={runLedgerKindVariant(entry.kind)}>
                      {RUN_LEDGER_KIND_LABELS[entry.kind]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{shortDate(entry.createdAt)}</span>
                  </span>
                }
                title={customerProofPackSummary(entry.title)}
                description={customerProofPackSummary(entry.summary)}
                badge={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                }
                footer={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{roleLabel(entry.role)}</Badge>
                    <Badge variant="outline">{WORKSTREAM_STATUS_LABELS[entry.status]}</Badge>
                    {entry.needsApproval ? <Badge variant="secondary">Launch call ready</Badge> : null}
                  </div>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2" data-dearme-run-ledger-entry={entry.kind}>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Evidence</p>
                    <p className="mt-1 text-sm text-foreground">
                      {customerProofPackSummary(entry.evidenceLabel)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Next</p>
                    <p className="mt-1 text-sm text-foreground">{customerProofPackSummary(entry.nextAction)}</p>
                  </div>
                </div>
              </DearMeWorkbenchCard>
            );
          })}
        </div>
      ) : (
        <DearMeEmptyState
          className="mt-4"
          icon={Workflow}
          title="The run ledger starts after brand work begins"
          description="Start the first cycle to see what the team moved, prepared, learned, staged at the boundary, skipped, and needs from you."
        />
      )}
    </DearMePanel>
  );
}

function DearMeLetterPanel({
  report,
  onOpenIssue,
}: {
  report: DearMeWorkbenchReport | null;
  onOpenIssue: (issueReference: string, outputId?: string | null) => void;
}) {
  const packetBackedReport = report ? isPacketBackedReport(report) : false;
  const reportSummary = report ? customerProofPackSummary(report.summary) : "";
  const reportBodyPreview = report ? customerProofPackSummary(report.bodyPreview) : "";

  return (
    <DearMePanel aria-label="Dear me letter">
      <DearMeWorkbenchSectionHeader
        icon={FileText}
        eyebrow="Weekly Dear me"
        title="Progress letter"
        description="A weekly ritual for what changed, what needs a call, and what the team is learning."
      />
      {report ? (
        <DearMeWorkbenchCard
          className="mt-4"
          title={report.title}
          description={reportSummary}
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
              onClick={() => onOpenIssue(report.issueIdentifier ?? report.issueId, report.outputId)}
            >
              Open letter
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        >
          <p className="line-clamp-3 text-sm text-foreground/80">{reportBodyPreview}</p>
          {packetBackedReport ? (
            <section
              className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3"
              aria-label="Proof pack report review"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Proof pack review
              </div>
              <p className="mt-1 text-sm text-foreground/80">
                DearMe prepared the draft and this report from one proof pack. Review once; anything public stays behind your launch call.
              </p>
            </section>
          ) : null}
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
                        <span>{customerProofPackSummary(item)}</span>
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
  outputReviewState,
  onReviewOutput,
}: {
  liveStream: DearMeWorkbenchStreamItem[];
  onOpenApproval: (approvalId: string) => void;
  onOpenIssue: (issueReference: string) => void;
  onOpenWorkItem: (
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) => void;
  outputReviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  if (liveStream.length === 0) return null;

  const liveFeedSections = buildLiveFeedSections(liveStream);
  const needsCallCount = liveFeedSections.find((section) => section.id === "needs_call")?.items.length ?? 0;
  const movingCount = liveFeedSections.find((section) => section.id === "in_motion")?.items.length ?? 0;

  return (
    <DearMePanel id={DEARME_LIVE_PROOF_FEED_ID} aria-label="Live proof feed">
      <DearMeWorkbenchSectionHeader
        icon={Workflow}
        eyebrow="Live proof feed"
        description="A live proof feed for the work your team prepared, updated, or staged for your call. The machinery stays backstage."
        trailing={
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge variant={needsCallCount > 0 ? "default" : "outline"}>
              {needsCallCount > 0 ? `${needsCallCount} needs your call` : "Review-ready first"}
            </Badge>
            <Badge variant={movingCount > 0 ? "secondary" : "outline"}>
              {movingCount > 0 ? `${movingCount} in motion` : "While you were away"}
            </Badge>
          </div>
        }
      />
      <div className="mt-4 space-y-5">
        {liveFeedSections.map((section) => (
          <section key={section.id} aria-label={`${section.title} live team items`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-medium">{section.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{section.summary}</p>
              </div>
              <Badge variant="outline" className="w-fit">
                {pluralizeCount(section.items.length, "item")}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item, index) => {
                const issueReference = streamItemIssueTarget(item);
                const canOpen = Boolean(item.approvalId || issueReference);
                const actionLabel = canOpen ? liveFeedActionLabel(item) : null;
                const reviewableOutputId = liveFeedReviewableOutputId(item);
                const isStuck = isReviewLoopStuck(item.reviewLoop);
                const isLatest = section.id === liveFeedSections[0]?.id && index === 0;

                return (
                  <DearMeActionCard
                    key={`${item.id}:${item.role}:${item.createdAt}:${index}`}
                    eyebrow={
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{WORKSTREAM_STAGE_LABELS[item.cycleStage]}</Badge>
                        <span>{roleLabel(item.role)}</span>
                      </span>
                    }
                    title={customerProofPackSummary(item.title)}
                    summary={customerProofPackSummary(item.summary)}
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
                      ...(isLatest ? [{ label: "Latest", variant: "secondary" as const }] : []),
                      { label: customerProofPackSummary(item.artifact), variant: "outline" },
                      { label: sourceLabelForChip(item.sourceLabel), variant: "outline" },
                      ...(item.needsApproval
                        ? [{ label: "Decision ready", variant: "default" as const }]
                        : []),
                      ...(item.costImpact
                        ? [{ label: customerProofPackSummary(item.costImpact), variant: "secondary" as const }]
                        : []),
                      { label: shortDate(item.createdAt), variant: "outline" },
                    ]}
                    calloutLabel="Next action"
                    callout={
                      <div className="space-y-2">
                        <p>{customerProofPackSummary(item.nextAction)}</p>
                        <p className="text-xs text-muted-foreground">{liveFeedStateGuidance(item)}</p>
                      </div>
                    }
                    action={
                      !reviewableOutputId && actionLabel
                        ? {
                            label: actionLabel,
                            variant: item.needsApproval ? "default" : "outline",
                            ariaLabel: `${actionLabel}: ${customerProofPackSummary(item.title)}`,
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
                  >
                    {reviewableOutputId ? (
                      <FocusedPreparedWorkReviewControls
                        outputId={reviewableOutputId}
                        noteId={`dearme-live-feed-output-note-${section.id}-${index}`}
                        description="Review this brand work here. Keep it moving, request changes, ask for another pass, or choose a new direction."
                        disabledReason={isStuck ? REVIEW_LOOP_STUCK_DISABLED_REASON : "This brand work is still moving; DearMe will bring it back when it needs your call."}
                        isReviewable={!isStuck}
                        reviewState={outputReviewState}
                        onReviewOutput={onReviewOutput}
                      />
                    ) : null}
                  </DearMeActionCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </DearMePanel>
  );
}

function VoiceMemoryPanel({
  memory,
  sourceReviewFocus,
  isPending,
  error,
  result,
  archiveResult,
  onAdd,
  onUpdate,
  onArchive,
  onRestore,
  onOpenWorkReady,
}: {
  memory: DearMeWorkbenchMemory;
  sourceReviewFocus: DearMeSourceReviewFocus | null;
  isPending: boolean;
  error: string | null;
  result: DearMeMemoryUpdateResult | null;
  archiveResult: DearMeMemoryArchiveResult | null;
  onAdd: (input: DearMeMemoryUpdate) => void;
  onUpdate: (memoryId: string, input: DearMeMemoryUpdate) => void;
  onArchive: (memoryId: string) => void;
  onRestore: (memoryId: string) => void;
  onOpenWorkReady: () => void;
}) {
  const [kind, setKind] = useState<DearMeMemoryUpdateKind>("voice_sample");
  const [sourceGuideId, setSourceGuideId] = useState<MemorySourceGuideId>("writing_sample");
  const [sourceInputMode, setSourceInputMode] = useState<DearMeMemorySourceInputMode>("paste");
  const [title, setTitle] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [body, setBody] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [selectedSourceReviewId, setSelectedSourceReviewId] = useState<string | null>(null);
  const [retireCandidate, setRetireCandidate] = useState<DearMeMemoryUpdateItem | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const voiceProfile = memory.voiceProfile;
  const sourcePlan = memory.sourcePlan;
  const selectedSourceReview = useMemo(
    () => memory.sourceReviewQueue.find((item) => item.id === selectedSourceReviewId) ?? null,
    [memory.sourceReviewQueue, selectedSourceReviewId],
  );
  const selectedGuide =
    MEMORY_SOURCE_GUIDES.find((guide) => guide.id === sourceGuideId) ?? DEFAULT_MEMORY_SOURCE_GUIDE;
  const sourceTeamPreview = MEMORY_SOURCE_TEAM_PREVIEWS[selectedGuide.id];
  const retireCandidateTitle = retireCandidate
    ? customerProofPackSummary(retireCandidate.title ?? MEMORY_KIND_LABELS[retireCandidate.kind])
    : "this source";
  const retireCandidateSummary = retireCandidate
    ? customerProofPackSummary(retireCandidate.bodyPreview)
    : null;
  const sourceLabelText =
    sourceInputMode === "link"
      ? "Source link"
      : sourceInputMode === "import_note"
        ? "Source to import"
        : "Source or note";
  const sourcePlaceholder =
    sourceInputMode === "link"
      ? "https://example.com/source"
      : sourceInputMode === "import_note"
        ? "Resume, transcript, portfolio, call notes, or backlog item"
        : selectedGuide.sourcePlaceholder;
  const feedback = memoryUpdateFeedback(result);
  const canSubmitMemorySource =
    body.trim().length > 0 && (sourceInputMode !== "link" || sourceLabel.trim().length > 0);
  const recordedMemory = result?.memory ?? null;
  const recordedMemoryAlreadyLoaded = recordedMemory
    ? memory.latest.some((item) => item.id === recordedMemory.id)
    : false;
  const latestMemory = recordedMemory
    ? [recordedMemory, ...memory.latest.filter((item) => item.id !== recordedMemory.id)]
    : memory.latest;
  const visibleLatestMemory = archiveResult
    ? latestMemory.filter((item) => item.id !== archiveResult.memoryId || item.id === recordedMemory?.id)
    : latestMemory;
  const reviewPreferences = visibleLatestMemory
    .filter((item) => item.kind === "review_feedback")
    .slice(0, 4);
  const visibleArchivedMemory = memory.archived.filter((item) => item.id !== recordedMemory?.id);
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
  const voiceMemoryReceiptText = [
    "DearMe Voice & Memory receipt",
    `Summary: ${customerProofPackSummary(memory.summary)}`,
    `Voice profile: ${customerProofPackSummary(voiceProfile.title)} / ${VOICE_PROFILE_STATUS_LABELS[voiceProfile.status]} / ${voiceProfile.confidence}% confidence / ${voiceProfile.sampleCount} samples`,
    `Guidance: ${customerProofPackSummary(voiceProfile.guidance)}`,
    `Next voice step: ${customerProofPackSummary(voiceProfile.nextStep)}`,
    `Tone signals: ${voiceProfile.draftTone.length > 0 ? voiceProfile.draftTone.join(", ") : "Waiting for real samples"}`,
    `Sources: ${displayedSourceCount} saved / ${displayedVoiceSampleCount} voice samples / ${displayedProofCount} proof sources`,
    `Source coverage: ${MEMORY_SOURCE_PLAN_STATUS_LABELS[sourcePlan.status]} - ${customerProofPackSummary(sourcePlan.summary)}`,
    ...sourcePlan.required.map((requirement) =>
      `Coverage - ${requirement.label}: ${MEMORY_SOURCE_REQUIREMENT_STATUS_LABELS[requirement.status]} (${requirement.count}/${requirement.target}). ${customerProofPackSummary(requirement.nextAction)}`,
    ),
    `Review preferences: ${reviewPreferences.length > 0 ? reviewPreferences.map((item) => customerProofPackSummary(item.bodyPreview)).join(" | ") : "No review preferences saved yet"}`,
    `Latest memory: ${visibleLatestMemory.length > 0 ? visibleLatestMemory.slice(0, 3).map((item) => `${MEMORY_KIND_LABELS[item.kind]} - ${customerProofPackSummary(item.title ?? MEMORY_KIND_LABELS[item.kind])}: ${customerProofPackSummary(item.bodyPreview)}`).join(" | ") : "No saved memory yet"}`,
    `Source review: ${memory.sourceReviewQueue.length > 0 ? `${memory.sourceReviewQueue.length} source${memory.sourceReviewQueue.length === 1 ? "" : "s"} waiting for review` : "No source review waiting"}`,
    "Boundary: DearMe can use this privately for drafts, opportunities, reports, portfolio proof, and review prep; public sends, page changes, and spend still wait for the launch call.",
    "Next support step: Save this receipt when handing the account to support or before the next brand cycle.",
  ].join("\n");
  const downloadVoiceMemoryReceipt = useCallback(() => {
    downloadDearMeReceipt(voiceMemoryReceiptText, DEARME_VOICE_MEMORY_RECEIPT_FILENAME);
  }, [voiceMemoryReceiptText]);
  const handledSourceReviewFocusRequest = useRef<number | null>(null);

  function resetMemoryDraft() {
    setEditingMemoryId(null);
    setSourceInputMode("paste");
    setTitle("");
    setSourceLabel("");
    setBody("");
    setLocalError(null);
  }

  const handleSourceReviewSelect = useCallback((item: DearMeWorkbenchMemory["sourceReviewQueue"][number]) => {
    const matchingGuide = memorySourceGuideForKind(item.proposedKind);
    setSelectedSourceReviewId(item.id);
    setEditingMemoryId(null);
    setSourceGuideId(matchingGuide.id);
    setKind(item.proposedKind);
    setSourceInputMode("paste");
    setTitle(item.proposedTitle);
    setSourceLabel(item.sourceLabel ?? item.sourceTitle);
    setBody(item.proposedBody);
    setLocalError(null);
  }, []);

  useEffect(() => {
    if (!selectedSourceReviewId) return;
    if (selectedSourceReview) return;
    setSelectedSourceReviewId(null);
  }, [selectedSourceReview, selectedSourceReviewId]);

  useEffect(() => {
    if (!archiveResult || !retireCandidate) return;
    if (archiveResult.memoryId === retireCandidate.id) {
      setRetireCandidate(null);
    }
  }, [archiveResult, retireCandidate]);

  useEffect(() => {
    if (!sourceReviewFocus) return;
    if (handledSourceReviewFocusRequest.current === sourceReviewFocus.requestId) return;
    const item = memory.sourceReviewQueue.find((candidate) => candidate.id === sourceReviewFocus.id);
    if (item) handleSourceReviewSelect(item);
    handledSourceReviewFocusRequest.current = sourceReviewFocus.requestId;
  }, [handleSourceReviewSelect, memory.sourceReviewQueue, sourceReviewFocus]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedSourceLabel = sourceLabel.trim();
    if (!trimmedBody) {
      setLocalError("Add source material before saving.");
      return;
    }
    if (trimmedBody.length < VOICE_MEMORY_SOURCE_BODY_MIN_LENGTH) {
      setLocalError("Add a little more context so DearMe can learn from this source.");
      return;
    }
    if (trimmedBody.length > VOICE_MEMORY_SOURCE_BODY_MAX_LENGTH) {
      setLocalError("Keep saved sources under 4,000 characters for now.");
      return;
    }
    if (trimmedTitle.length > VOICE_MEMORY_SOURCE_TITLE_MAX_LENGTH) {
      setLocalError("Keep the source title under 160 characters.");
      return;
    }
    if (trimmedSourceLabel.length > VOICE_MEMORY_SOURCE_REFERENCE_MAX_LENGTH) {
      setLocalError("Keep the source reference under 500 characters.");
      return;
    }
    if (sourceInputMode === "link") {
      if (!trimmedSourceLabel) {
        setLocalError("Add the source link DearMe should remember.");
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
      title: trimmedTitle || selectedGuide.label,
      body: trimmedBody,
      sourceLabel: trimmedSourceLabel || null,
    };
    if (editingMemoryId) {
      onUpdate(editingMemoryId, update);
    } else {
      onAdd(update);
    }
    setSelectedSourceReviewId(null);
    resetMemoryDraft();
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
    resetMemoryDraft();
  }

  function handleRetireSource(item: DearMeMemoryUpdateItem) {
    setLocalError(null);
    setRetireCandidate(item);
  }

  function handleRetireDialogOpenChange(open: boolean) {
    if (!open && !isPending) {
      setRetireCandidate(null);
    }
  }

  function handleConfirmRetireSource() {
    if (!retireCandidate) return;
    if (editingMemoryId === retireCandidate.id) {
      handleCancelRevise();
    }
    setLocalError(null);
    onArchive(retireCandidate.id);
  }

  function handleRestoreSource(item: DearMeMemoryUpdateItem) {
    if (editingMemoryId === item.id) {
      handleCancelRevise();
    }
    setLocalError(null);
    onRestore(item.id);
  }

  function handleDismissSourceReview(item: DearMeSourceReviewItem) {
    setSelectedSourceReviewId(null);
    resetMemoryDraft();
    onArchive(item.sourceMemoryId);
  }

  function handleScrollToMemoryForm() {
    if (typeof document === "undefined") return;
    const target = document.getElementById(DEARME_MEMORY_FORM_ID);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  return (
    <DearMePanel aria-label="Voice & Memory">
      <DearMeWorkbenchSectionHeader
        icon={Sparkles}
        eyebrow="Voice & Memory"
        description={memory.summary}
        trailing={
          <Button type="button" size="sm" variant="outline" onClick={onOpenWorkReady}>
            <FileText className="h-4 w-4" />
            Review Work Ready
          </Button>
        }
      />

      <DearMeMetricStrip className="mt-5">
        <Metric icon={FileText} label="Sources" value={displayedSourceCount} />
        <Metric icon={Sparkles} label="Voice" value={displayedVoiceSampleCount} />
        <Metric icon={ShieldCheck} label="Proof" value={displayedProofCount} />
      </DearMeMetricStrip>

      <section className="mt-5 rounded-md border border-border bg-muted/20 p-4" aria-label="Voice & Memory receipt">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Memory receipt</p>
            <p className="mt-1 text-sm font-medium text-foreground">What DearMe will remember next</p>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Save this before a support handoff or a new brand cycle so the account keeps its voice,
              proof, review preferences, and public-launch boundary.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Download ${DEARME_VOICE_MEMORY_RECEIPT_FILENAME}`}
            onClick={downloadVoiceMemoryReceipt}
          >
            <Download className="h-4 w-4" />
            Download receipt
          </Button>
        </div>
        <Textarea
          aria-label="Voice & Memory receipt note"
          className="mt-4 min-h-40 resize-none bg-background/80 font-mono text-xs leading-relaxed"
          readOnly
          value={voiceMemoryReceiptText}
        />
      </section>

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
                Source links and import notes wait here until you turn them into reviewed Voice & Memory facts.
              </p>
            </div>
            <Badge variant="outline">{memory.sourceReviewQueue.length} to review</Badge>
          </div>
          <div
            className={cn(
              "mt-3 grid gap-3",
              selectedSourceReview ? "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]" : undefined,
            )}
          >
            <div
              className={cn(
                "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
                selectedSourceReview ? "md:grid-cols-1 xl:grid-cols-2" : undefined,
              )}
            >
              {memory.sourceReviewQueue.map((item) => {
                const focused = sourceReviewFocus?.id === item.id;
                const selected = selectedSourceReviewId === item.id;
                const sourceHref = privateSourceLink(item.sourceInputMode, item.sourceLabel);
                return (
                  <div
                    key={item.id}
                    id={sourceReviewCardDomId(item.id)}
                    className={cn(
                      "rounded-md transition-shadow",
                      focused || selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : undefined,
                    )}
                    data-dearme-source-review-focus={focused ? "true" : undefined}
                    data-dearme-source-review-selected={selected ? "true" : undefined}
                  >
                    <DearMeActionCard
                      aria-label="Voice & Memory source review"
                      eyebrow={MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode]}
                      title={customerProofPackSummary(item.sourceTitle)}
                      summary={customerProofPackSummary(item.summary)}
                      chips={[
                        { label: MEMORY_KIND_LABELS[item.proposedKind], variant: "outline" },
                        ...(selected || focused
                          ? [{ label: "Selected for next pass", variant: "secondary" as const }]
                          : []),
                        ...(item.sourceLabel
                          ? [{ label: sourceLabelForChip(item.sourceLabel), variant: "outline" as const }]
                          : []),
                        { label: shortDate(item.createdAt), variant: "outline" },
                      ]}
                      calloutLabel="Prepare next"
                      callout={customerProofPackSummary(item.nextAction)}
                      action={{
                        label: "Prepare fact",
                        ariaLabel: `Prepare fact from ${customerProofPackSummary(item.sourceTitle)}`,
                        onClick: () => handleSourceReviewSelect(item),
                        variant: selected ? "default" : "outline",
                      }}
                    >
                      {sourceHref ? <PrivateSourceLink href={sourceHref} /> : null}
                    </DearMeActionCard>
                  </div>
                );
              })}
            </div>
            {selectedSourceReview ? (
              <SourceReviewDetailPanel
                item={selectedSourceReview}
                isPending={isPending}
                onEdit={handleScrollToMemoryForm}
                onDismiss={() => handleDismissSourceReview(selectedSourceReview)}
                onClose={() => setSelectedSourceReviewId(null)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {reviewPreferences.length > 0 ? (
        <section className="mt-5 border-t border-border pt-4" aria-label="Review preferences">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Review preferences
              </p>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                DearMe uses these review notes as next-draft guidance before future brand work.
              </p>
            </div>
            <Badge variant="outline">{reviewPreferences.length} learned</Badge>
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reviewPreferences.map((item) => (
              <li key={item.id} className="rounded-md border border-border bg-muted/20 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Review feedback</Badge>
                  <Badge variant="outline">{shortDate(item.createdAt)}</Badge>
                  {item.sourceLabel ? (
                    <Badge variant="outline">{sourceLabelForChip(item.sourceLabel)}</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium">
                  {customerProofPackSummary(item.title ?? "Review preference")}
                </p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {customerProofPackSummary(item.bodyPreview)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form id={DEARME_MEMORY_FORM_ID} className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="dearme-memory-source-guide" label="Source guide" />
          {editingMemoryId ? (
            <div className="mt-2 flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>Revising a saved source. Future brand work will use the revised version.</span>
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
          <div
            className="mt-3 rounded-md border border-primary/20 bg-muted/20 px-3 py-3 text-sm"
            aria-label="How DearMe will use this source"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Team preview</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">
              <span className="font-medium text-foreground">{sourceTeamPreview.role}</span>{" "}
              {sourceTeamPreview.action}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{sourceTeamPreview.outcome}</p>
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
            <p className="mt-2 text-xs text-muted-foreground">
              Add at least 20 characters. DearMe uses this as saved memory, not public copy.
            </p>
            {localError || error ? (
              <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {localError ?? error}
              </div>
            ) : null}
            {feedback && !error ? (
              <div
                className="mt-2 flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
                aria-label="Voice & Memory save receipt"
              >
                <span>{feedback}</span>
                <Button type="button" size="sm" variant="outline" onClick={onOpenWorkReady}>
                  <FileText className="h-4 w-4" />
                  Review refreshed work
                </Button>
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button type="submit" disabled={isPending || !canSubmitMemorySource}>
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
            const sourceWorkPath = MEMORY_SOURCE_WORK_PATHS[item.kind];
            const sourceHref = privateSourceLink(item.sourceInputMode, item.sourceLabel);
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
                title={customerProofPackSummary(item.title ?? "Untitled memory")}
                summary={customerProofPackSummary(item.bodyPreview)}
                chips={chips}
                calloutLabel={justSaved ? `${sourceWorkPath.owner} will use this next` : "Already in use"}
                callout={
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{sourceWorkPath.owner}</p>
                    <p>{sourceWorkPath.destination}</p>
                  </div>
                }
                footer={shortDate(item.createdAt)}
                action={{
                  label: "Revise",
                  ariaLabel: `Revise ${customerProofPackSummary(item.title ?? MEMORY_KIND_LABELS[item.kind])}`,
                  icon: RefreshCw,
                  onClick: () => handleReviseSource(item),
                }}
              >
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {sourceHref ? <PrivateSourceLink href={sourceHref} /> : null}
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

      <Dialog open={retireCandidate !== null} onOpenChange={handleRetireDialogOpenChange}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Retire saved source?</DialogTitle>
            <DialogDescription>
              DearMe will stop using {retireCandidateTitle} for future drafts. The source stays in
              saved history so you can restore it later.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {retireCandidateSummary ??
              "Use this when the source is stale, duplicated, or no longer matches how you want DearMe to write and decide."}
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              aria-label={`Keep ${retireCandidateTitle}`}
              onClick={() => setRetireCandidate(null)}
            >
              Keep source
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              aria-label={`Confirm retire ${retireCandidateTitle}`}
              onClick={handleConfirmRetireSource}
            >
              {isPending ? "Retiring..." : "Retire source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {visibleArchivedMemory.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Retired sources</p>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                These stay saved. Restore one if DearMe should use it again.
              </p>
            </div>
            <Badge variant="outline">{visibleArchivedMemory.length} retired</Badge>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleArchivedMemory.map((item) => (
              <DearMeActionCard
                key={item.id}
                aria-label="Retired Voice & Memory source"
                eyebrow={MEMORY_KIND_LABELS[item.kind]}
                title={customerProofPackSummary(item.title ?? "Untitled memory")}
                summary={customerProofPackSummary(item.bodyPreview)}
                chips={[
                  { label: MEMORY_SOURCE_INPUT_MODE_LABELS[item.sourceInputMode], variant: "outline" as const },
                  ...(item.sourceLabel
                    ? [{ label: sourceLabelForChip(item.sourceLabel), variant: "outline" as const }]
                    : []),
                  { label: "Retired", variant: "secondary" as const },
                ]}
                footer={shortDate(item.createdAt)}
                action={{
                  label: "Restore",
                  ariaLabel: `Restore ${customerProofPackSummary(item.title ?? MEMORY_KIND_LABELS[item.kind])}`,
                  icon: RefreshCw,
                  onClick: () => handleRestoreSource(item),
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </DearMePanel>
  );
}

function ChiefOfStaffComposerPanel({
  companyId,
  paidBetaActive,
  isPending,
  error,
  result,
  onSubmit,
  onOpenIssue,
  onOpenVoiceMemory,
}: {
  companyId: string;
  paidBetaActive: boolean;
  isPending: boolean;
  error: string | null;
  result: DearMeChiefOfStaffMessageResult | null;
  onSubmit: (input: { intent: DearMeChiefOfStaffMessageIntent; message: string }) => void;
  onOpenIssue: (issueReference: string) => void;
  onOpenVoiceMemory: () => void;
}) {
  const [intent, setIntent] = useState<DearMeChiefOfStaffMessageIntent>(DEFAULT_CHIEF_OF_STAFF_INTENT);
  const [message, setMessage] = useState("");
  const [recentBriefs, setRecentBriefs] = useState(() => readDearMeChiefOfStaffRecentControls(companyId));
  const selectedIntent = CHIEF_OF_STAFF_INTENT_OPTIONS.find((option) => option.value === intent) ?? {
    value: DEFAULT_CHIEF_OF_STAFF_INTENT,
    label: "Plan next moves",
    helper: "Prioritize the next brand cycle.",
  };
  const trimmedMessage = message.trim();
  const disabled = !paidBetaActive || isPending || trimmedMessage.length === 0;

  useEffect(() => {
    setRecentBriefs(readDearMeChiefOfStaffRecentControls(companyId));
  }, [companyId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    rememberRecentBrief(chiefOfStaffRecentBriefFromMessage(intent, trimmedMessage));
    onSubmit({ intent, message: trimmedMessage });
    setMessage("");
  }

  function rememberRecentBrief(brief: DearMeChiefOfStaffRecentBrief) {
    setRecentBriefs((current) => {
      const next = [brief, ...current.filter((item) => item.id !== brief.id)].slice(
        0,
        DEARME_CHIEF_OF_STAFF_RECENT_CONTROLS_MAX,
      );
      writeDearMeChiefOfStaffRecentControls(companyId, next);
      return next;
    });
  }

  function handleCycleControl(control: (typeof CHIEF_OF_STAFF_CYCLE_CONTROLS)[number]) {
    if (!paidBetaActive || isPending) return;
    setIntent(control.intent);
    setMessage(control.message);
    rememberRecentBrief(chiefOfStaffRecentBriefFromControl(control));
  }

  function handleRecentBrief(brief: DearMeChiefOfStaffRecentBrief) {
    if (!paidBetaActive || isPending) return;
    setIntent(brief.intent);
    setMessage(brief.message);
    rememberRecentBrief(brief);
  }

  const resultIsFeedbackBrief = result?.title.toLowerCase().includes("handle feedback") ?? false;
  const resultTitle = resultIsFeedbackBrief
    ? (result?.status === "queued" ? "Feedback brief sent" : "Feedback brief saved")
    : (result?.status === "queued" ? "Brief sent" : "Brief saved");
  const resultOpenLabel = resultIsFeedbackBrief ? "Open feedback work" : "Open brand work";
  const resultReceiptText = result ? chiefOfStaffBriefReceiptText(result) : "";
  const downloadResultReceipt = useCallback(() => {
    if (!resultReceiptText) return;
    downloadDearMeReceipt(resultReceiptText, DEARME_CHIEF_OF_STAFF_BRIEF_RECEIPT_FILENAME);
  }, [resultReceiptText]);

  return (
    <DearMePanel className="bg-muted/10" aria-label="Chief of Staff composer">
      <DearMeWorkbenchSectionHeader
        icon={MessageSquare}
        eyebrow="Chief of Staff"
        title="Brief the team"
        description="Ask for the next plan, a content batch, opportunity research, a portfolio update, customer feedback handling, or this week's direction. DearMe turns the ask into reviewable work automatically."
        trailing={
          <Badge variant={paidBetaActive ? "secondary" : "outline"}>
            {paidBetaActive ? "Brand work ready" : "Paid beta needed"}
          </Badge>
        }
      />
      <div className="mt-5 rounded-md border border-border bg-background/70 p-3" aria-label="Cycle controls">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Cycle controls</p>
            <p className="mt-1 text-sm text-foreground/85">
              Pick the next brand cycle; your team turns it into reviewable moves.
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
        {recentBriefs.length > 0 ? (
          <div className="mt-3 rounded-md border border-border bg-background/70 p-3" aria-label="Recent Chief of Staff briefs">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium uppercase text-muted-foreground">Recent briefs</p>
              <Badge variant="outline">One-click replay</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentBriefs.map((brief) => (
                <Button
                  key={brief.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto whitespace-normal text-left"
                  disabled={!paidBetaActive || isPending}
                  onClick={() => handleRecentBrief(brief)}
                >
                  {brief.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
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
                External actions, spend, publishing, and public claims come back as one launch call.
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
          Activate paid beta, then brief the brand team.
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
            <p className="text-sm font-medium">{resultTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.nextStep}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {resultIsFeedbackBrief ? (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenVoiceMemory}
              >
                <Sparkles className="h-4 w-4" />
                Open Voice & Memory
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={downloadResultReceipt}
            >
              <Download className="h-4 w-4" />
              Download receipt
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenIssue(result.issueIdentifier ?? result.issueId)}
            >
              <ArrowRight className="h-4 w-4" />
              {resultOpenLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </DearMePanel>
  );
}

function TeamWorkbenchPanel({
  companyId,
  paidBetaCohortCompanyIds,
  paidBetaCohortCompanyNames,
  paidBetaActive,
  selectedView,
  decisionFocus,
  canStartPrivateWork,
  onOpenPaidBetaAccount,
  onFocusFirstCycle,
  onOpenApproval,
  onOpenIssue,
  onOpenWorkItem,
  onOpenWorkReady,
  onOpenLaunchProof,
  onOpenVoiceMemory,
  onReviewApproval,
  onReviewOutput,
  reviewState,
  outputReviewState,
}: {
  companyId: string;
  paidBetaCohortCompanyIds: string[];
  paidBetaCohortCompanyNames: Record<string, string>;
  paidBetaActive: boolean;
  selectedView: DearMePageView;
  decisionFocus: DearMeDecisionFocus | null;
  canStartPrivateWork: boolean;
  onOpenPaidBetaAccount: (companyId: string) => void;
  onFocusFirstCycle: () => void;
  onOpenApproval: (approvalId: string) => void;
  onOpenIssue: (issueReference: string, outputId?: string | null) => void;
  onOpenWorkItem: (
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) => void;
  onOpenWorkReady: () => void;
  onOpenLaunchProof: () => void;
  onOpenVoiceMemory: () => void;
  onReviewApproval: (
    approvalId: string,
    action: DearMeApprovalReviewAction,
    decisionNote: string,
  ) => void;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
  reviewState: DearMeApprovalReviewState;
  outputReviewState: DearMeOutputReviewState;
}) {
  const queryClient = useQueryClient();
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [chiefOfStaffError, setChiefOfStaffError] = useState<string | null>(null);
  const [chiefOfStaffResult, setChiefOfStaffResult] = useState<DearMeChiefOfStaffMessageResult | null>(null);
  const [chiefOfStaffEntryPoint, setChiefOfStaffEntryPoint] = useState<
    "composer" | "support_handoff" | "empty_week_recovery" | null
  >(null);
  const [sourceReviewFocus, setSourceReviewFocus] = useState<DearMeSourceReviewFocus | null>(null);
  const [livePulse, setLivePulse] = useState<DearMeLiveTeamPulse | null>(null);
  const workbenchQuery = useQuery({
    queryKey: queryKeys.dearme.workbench(companyId),
    queryFn: () => dearmeApi.getWorkbench(companyId),
  });
  const paidBetaCohortQuery = useQuery({
    queryKey: queryKeys.dearme.paidBetaCohort(paidBetaCohortCompanyIds),
    queryFn: () => dearmeApi.getPaidBetaCohort(paidBetaCohortCompanyIds),
    enabled: paidBetaActive && paidBetaCohortCompanyIds.length > 0,
  });
  useEffect(() => {
    const workbenchKey = queryKeys.dearme.workbench(companyId);
    const stream = dearmeApi.openWorkbenchEvents(companyId);
    let refreshTimer: number | null = null;

    const handleSync: EventListener = (event) => {
      const nextWorkbench = parseDearMeWorkbenchSyncEvent(event);
      if (!nextWorkbench) return;
      queryClient.setQueryData(workbenchKey, nextWorkbench);
    };
    const scheduleWorkbenchRefresh: EventListener = () => {
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void queryClient.invalidateQueries({ queryKey: workbenchKey });
      }, 250);
    };
    const handleLivePulse: EventListener = (event) => {
      const pulse = parseDearMeLiveTeamPulseEvent(event);
      if (pulse) setLivePulse(pulse);
    };

    stream.addEventListener("sync", handleSync);
    dearmeWorkbenchRefreshEventTypes.forEach((eventType) => {
      stream.addEventListener(eventType, scheduleWorkbenchRefresh);
      stream.addEventListener(eventType, handleLivePulse);
    });

    return () => {
      stream.removeEventListener("sync", handleSync);
      dearmeWorkbenchRefreshEventTypes.forEach((eventType) => {
        stream.removeEventListener(eventType, scheduleWorkbenchRefresh);
        stream.removeEventListener(eventType, handleLivePulse);
      });
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      stream.close();
    };
  }, [companyId, queryClient]);
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
      setChiefOfStaffError(
        dearMeCustomerErrorMessage(
          err,
          "Chief of Staff brief needs attention. Try again before starting the next brand move.",
        ),
      );
    },
  });
  function refreshVoiceMemoryDependentSurfaces() {
    queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dearme.outputs(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
  }

  const memoryMutation = useMutation({
    mutationFn: (input: DearMeMemoryUpdate) => dearmeApi.recordMemoryUpdate(companyId, input),
    onSuccess: () => {
      setMemoryError(null);
      refreshVoiceMemoryDependentSurfaces();
    },
    onError: (err) => {
      setMemoryError(
        dearMeCustomerErrorMessage(
          err,
          "Voice & Memory needs attention. Try again before adding or editing saved sources.",
        ),
      );
    },
  });
  const memoryUpdateMutation = useMutation({
    mutationFn: (input: { memoryId: string; update: DearMeMemoryUpdate }) =>
      dearmeApi.updateMemorySource(companyId, input.memoryId, input.update),
    onSuccess: () => {
      setMemoryError(null);
      refreshVoiceMemoryDependentSurfaces();
    },
    onError: (err) => {
      setMemoryError(
        dearMeCustomerErrorMessage(
          err,
          "Voice & Memory needs attention. Try again before adding or editing saved sources.",
        ),
      );
    },
  });
  const memoryArchiveMutation = useMutation({
    mutationFn: (memoryId: string) => dearmeApi.archiveMemorySource(companyId, memoryId),
    onSuccess: () => {
      setMemoryError(null);
      refreshVoiceMemoryDependentSurfaces();
    },
    onError: (err) => {
      setMemoryError(
        dearMeCustomerErrorMessage(
          err,
          "Voice & Memory needs attention. Try again before retiring a saved source.",
        ),
      );
    },
  });
  const memoryRestoreMutation = useMutation({
    mutationFn: (memoryId: string) => dearmeApi.restoreMemorySource(companyId, memoryId),
    onSuccess: () => {
      setMemoryError(null);
      refreshVoiceMemoryDependentSurfaces();
    },
    onError: (err) => {
      setMemoryError(
        dearMeCustomerErrorMessage(
          err,
          "Voice & Memory needs attention. Try again before restoring a saved source.",
        ),
      );
    },
  });
  const workbench = workbenchQuery.data ?? null;

  if (workbenchQuery.isLoading) {
    return (
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]" aria-label="DearMe brand workroom">
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" />
        <div className="h-72 animate-pulse rounded-lg border border-border bg-muted/40" />
      </section>
    );
  }

  if (workbenchQuery.isError || !workbench) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {dearMeCustomerErrorMessage(
            workbenchQuery.error,
            "DearMe team progress needs attention. Try again before reviewing brand work.",
          )}
        </div>
        <TeamWorkstreamPanel previewReady={false} paidBetaActive={paidBetaActive} />
      </div>
    );
  }

  const readyItems = workbench.workReady.slice(0, 3);
  const decisions = workbench.decisionsNeeded.slice(0, 3);
  const batches = workbench.batchDecisions.slice(0, 3);
  const batchReviewLoops = new Map(
    batches.map((batch) => [batch.id, batchPreparedOutputReviewLoop(batch, workbench)]),
  );
  const sourceReviews = workbench.memory.sourceReviewQueue.slice(0, 3);
  const liveStream = workbench.workStream.slice(0, 6);
  const privateExecutionHandoff = workbench.recentProgress.find((item) =>
    item.kind === "next_move_delivery_recorded" ||
    (item.kind === "execution_handoff_prepared" &&
      (item.executionReadiness === "private_handoff_ready" ||
        item.executionReadiness === "private_handoff_paused")),
  ) ?? null;
  const visibleRunLedger = memoryArchiveMutation.data
    ? workbench.runLedger.filter((entry) => entry.id !== `ledger:memory:${memoryArchiveMutation.data.memoryId}`)
    : workbench.runLedger;
  const focusedDecision = decisionFocus
    ? workbench.decisionsNeeded.find((decision) => matchesDecisionFocus(decision, decisionFocus)) ?? null
    : null;
  const focusedBatch = decisionFocus && !focusedDecision
    ? workbench.batchDecisions.find((batch) => matchesBatchFocus(batch, decisionFocus)) ?? null
    : null;
  const focusedBatchReviewLoop = focusedBatch
    ? batchPreparedOutputReviewLoop(focusedBatch, workbench)
    : null;
  const focusedWorkItem = decisionFocus && !focusedDecision && !focusedBatch
    ? [...workbench.workReady, ...workbench.activeWork].find((item) => matchesWorkItemFocus(item, decisionFocus)) ?? null
    : null;
  const supportHandoffResult = chiefOfStaffEntryPoint === "support_handoff" ? chiefOfStaffResult : null;
  const supportHandoffError = chiefOfStaffEntryPoint === "support_handoff" ? chiefOfStaffError : null;
  const emptyWeekRecoveryResult = chiefOfStaffEntryPoint === "empty_week_recovery" ? chiefOfStaffResult : null;
  const emptyWeekRecoveryError = chiefOfStaffEntryPoint === "empty_week_recovery" ? chiefOfStaffError : null;
  const composerResult = chiefOfStaffEntryPoint === "composer" ? chiefOfStaffResult : null;
  const composerError = chiefOfStaffEntryPoint === "composer" ? chiefOfStaffError : null;
  const paidBetaCohortError = paidBetaCohortQuery.isError
    ? dearMeCustomerErrorMessage(
      paidBetaCohortQuery.error,
      "Paid cohort health needs attention. Try again before reviewing paid operations.",
    )
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
    const outputId = batchPreparedOutputId(batch);
    if (issueId && outputId) {
      onOpenWorkItem(issueId, outputId);
      return;
    }
    if (issueId) onOpenIssue(issueId);
  }

  function openWorkItem(item: DearMeWorkbenchWorkItem, intent?: DearMeReviewEntryIntent | null) {
    const issueReference = workItemTarget(item);
    if (issueReference) onOpenWorkItem(issueReference, item.id, intent);
  }

  function openSourceReview(item: DearMeSourceReviewItem) {
    setSourceReviewFocus((current) => ({
      id: item.id,
      requestId: (current?.requestId ?? 0) + 1,
    }));
    if (typeof document === "undefined") return;
    const target =
      document.getElementById(sourceReviewCardDomId(item.id)) ??
      document.getElementById("dearme-voice-memory");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function openNextDecision() {
    const currentWorkbench = workbenchQuery.data;
    if (!currentWorkbench) return;
    if (currentWorkbench.batchDecisions[0]) {
      openBatch(currentWorkbench.batchDecisions[0]);
      return;
    }
    if (currentWorkbench.decisionsNeeded[0]) {
      openDecision(currentWorkbench.decisionsNeeded[0]);
      return;
    }
    if (currentWorkbench.memory.sourceReviewQueue[0]) {
      openSourceReview(currentWorkbench.memory.sourceReviewQueue[0]);
    }
  }

  return (
    <section className="space-y-4" aria-label="DearMe brand workroom">
      {decisionFocus ? (
        <FocusedDecisionPanel
          decision={focusedDecision}
          batch={focusedBatch}
          batchReviewLoop={focusedBatchReviewLoop}
          workItem={focusedWorkItem}
          onOpenDecision={openDecision}
          onOpenBatch={openBatch}
          onOpenWorkItem={openWorkItem}
          onOpenVoiceMemory={onOpenVoiceMemory}
          onReviewApproval={onReviewApproval}
          onReviewOutput={onReviewOutput}
          reviewState={reviewState}
          outputReviewState={outputReviewState}
        />
      ) : null}

      <TeamFocusWorkbenchPanel
        workbench={workbench}
        paidBetaActive={paidBetaActive}
        livePulse={livePulse}
        canStartPrivateWork={canStartPrivateWork}
        onFocusFirstCycle={onFocusFirstCycle}
        onOpenNextDecision={openNextDecision}
      />

      {privateExecutionHandoff ? (
        <PrivateExecutionHandoffPanel
          handoff={privateExecutionHandoff}
          onOpenIssue={onOpenIssue}
        />
      ) : null}

      {selectedView === "opportunities" ? (
        <OpportunityWorkbenchPanel
          workbench={workbench}
          paidBetaActive={paidBetaActive}
          onOpenWorkItem={openWorkItem}
        />
      ) : null}

      <TeamSummaryPanel workbench={workbench} paidBetaActive={paidBetaActive} />

      <TeamOperatingPolicyPanel
        workbench={workbench}
        paidBetaActive={paidBetaActive}
        paidBetaCohort={paidBetaCohortQuery.data ?? null}
        paidBetaCohortCompanyNames={paidBetaCohortCompanyNames}
        paidBetaCohortLoading={paidBetaCohortQuery.isLoading}
        paidBetaCohortError={paidBetaCohortError}
        supportHandoffPending={chiefOfStaffMutation.isPending}
        supportHandoffResult={supportHandoffResult}
        supportHandoffError={supportHandoffError}
        emptyWeekRecoveryPending={chiefOfStaffMutation.isPending}
        emptyWeekRecoveryResult={emptyWeekRecoveryResult}
        emptyWeekRecoveryError={emptyWeekRecoveryError}
        onStartEmptyWeekRecovery={(message) => {
          setChiefOfStaffEntryPoint("empty_week_recovery");
          chiefOfStaffMutation.mutate({
            intent: "handle_feedback",
            message,
          });
        }}
        onHandleSupportHandoff={(message) => {
          setChiefOfStaffEntryPoint("support_handoff");
          chiefOfStaffMutation.mutate({
            intent: "handle_feedback",
            message,
          });
        }}
        onOpenEmptyWeekRecoveryIssue={onOpenIssue}
        onOpenSupportHandoffIssue={onOpenIssue}
        onOpenVoiceMemory={onOpenVoiceMemory}
        onOpenLaunchProof={onOpenLaunchProof}
        onOpenPaidBetaAccount={onOpenPaidBetaAccount}
      />

      <BrandTeamRunLedgerPanel entries={visibleRunLedger} />

      <OperatingLoopPanel
        workbench={workbench}
        paidBetaActive={paidBetaActive}
        onOpenVoiceMemory={onOpenVoiceMemory}
        onOpenNextDecision={openNextDecision}
        onOpenWorkReady={onOpenWorkReady}
      />

      <ChiefOfStaffComposerPanel
        companyId={companyId}
        paidBetaActive={paidBetaActive}
        isPending={chiefOfStaffMutation.isPending}
        error={composerError}
        result={composerResult}
        onSubmit={(input) => {
          setChiefOfStaffEntryPoint("composer");
          chiefOfStaffMutation.mutate(input);
        }}
        onOpenIssue={onOpenIssue}
        onOpenVoiceMemory={onOpenVoiceMemory}
      />

      <DearMeCockpitGrid variant="primary">
        <WorkReadyPanel
          items={readyItems}
          decisionFocus={decisionFocus}
          onOpenWorkItem={openWorkItem}
          outputReviewState={outputReviewState}
          onReviewOutput={onReviewOutput}
        />
        <DecisionsNeededPanel
          companyId={companyId}
          batches={batches}
          batchReviewLoops={batchReviewLoops}
          decisions={decisions}
          sourceReviews={sourceReviews}
          decisionFocus={decisionFocus}
          onOpenBatch={openBatch}
          onOpenDecision={openDecision}
          onOpenSourceReview={openSourceReview}
          onOpenWorkReady={onOpenWorkReady}
        />
      </DearMeCockpitGrid>

      <DearMeCockpitGrid variant="primary">
        <DearMeLetterPanel report={workbench.report} onOpenIssue={onOpenIssue} />
        <div id="dearme-voice-memory">
          <VoiceMemoryPanel
            memory={workbench.memory}
            sourceReviewFocus={sourceReviewFocus}
            isPending={
              memoryMutation.isPending ||
              memoryUpdateMutation.isPending ||
              memoryArchiveMutation.isPending ||
              memoryRestoreMutation.isPending
            }
            error={memoryError}
            result={memoryRestoreMutation.data ?? memoryUpdateMutation.data ?? memoryMutation.data ?? null}
            archiveResult={memoryArchiveMutation.data ?? null}
            onAdd={(input) => memoryMutation.mutate(input)}
            onUpdate={(memoryId, input) => memoryUpdateMutation.mutate({ memoryId, update: input })}
            onArchive={(memoryId) => memoryArchiveMutation.mutate(memoryId)}
            onRestore={(memoryId) => memoryRestoreMutation.mutate(memoryId)}
            onOpenWorkReady={onOpenWorkReady}
          />
        </div>
      </DearMeCockpitGrid>

      <DearMeCockpitGrid variant="primary">
        <TeamAtWorkPanel team={workbench.team} />
        <LiveTeamFeedPanel
          liveStream={liveStream}
          onOpenApproval={onOpenApproval}
          onOpenIssue={onOpenIssue}
          onOpenWorkItem={onOpenWorkItem}
          outputReviewState={outputReviewState}
          onReviewOutput={onReviewOutput}
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
        description="See the team, first brand work, budget, memory seeds, and launch boundaries before anything starts."
      />
    );
  }

  return (
    <section className="space-y-4" aria-label="Profile preview">
      {!previewMatchesForm ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Refresh the preview before starting the brand team.
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
          <Metric icon={Workflow} label="Rhythm" value={preview.summary.cycleCount} />
          <Metric icon={ShieldCheck} label="Launch boundaries" value={preview.summary.riskGateCount} />
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
            Working rhythm
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
          First brand work
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
  onFocusFirstCycle,
}: {
  companyId: string;
  status: DearMePaidBetaStatus | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onFocusFirstCycle: () => void;
}) {
  const queryClient = useQueryClient();
  const [amountDollars, setAmountDollars] = useState("250");
  const [description, setDescription] = useState("Founding beta payment");
  const [externalInvoiceId, setExternalInvoiceId] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const entitlement = status?.entitlement ?? null;
  const cycleGuardrail = status?.cycleGuardrail ?? null;
  const paidBetaActive = status?.status === "active";
  const hostedCheckout = status?.hostedCheckout ?? null;
  const hostedCheckoutUrl = hostedCheckout?.configured ? hostedCheckout.paymentUrl : null;
  const hostedCheckoutReady = Boolean(!paidBetaActive && hostedCheckoutUrl);
  const customerReceiptRows = [
    {
      label: "Access",
      value: paidBetaActive ? "Open" : "Not open yet",
    },
    {
      label: "Paid",
      value: money(status?.netPaidCents ?? 0),
    },
    {
      label: "Remaining credit",
      value: money(status?.remainingCreditCents ?? 0),
    },
    {
      label: "Payment date",
      value: paymentDate(status?.latestPaymentAt ?? null),
    },
    {
      label: "Receipt note",
      value: paidBetaActive ? status?.latestPaymentDescription || "Paid beta payment" : "Waiting for payment",
    },
    {
      label: "Reference",
      value: paidBetaActive ? status?.latestExternalInvoiceId || "No reference saved" : "Add after payment",
    },
  ];
  const customerReceiptNextSteps = paidBetaActive
    ? [
        {
          label: "Start brand team",
          summary: "Brief the team and create the first launch-ready brand assets.",
        },
        {
          label: "Keep credit visible",
          summary: "DearMe shows remaining credit and monthly spend before more brand work runs.",
        },
        {
          label: "Hold public moves",
          summary: "Posts, outreach, page changes, and new spend still wait for the launch call.",
        },
      ]
    : [
        {
          label: "Take payment first",
          summary: "Only record access after the customer has actually paid through the private-beta channel.",
        },
        {
          label: "Save a reference",
          summary: "Add the receipt or invoice reference so support can confirm the account later.",
        },
        {
          label: "Then start work",
          summary: "Once paid access is open, DearMe can start the first brand cycle.",
        },
      ];
  const customerReceiptText = [
    "DearMe paid beta customer receipt",
    `Status: ${
      paidBetaActive
        ? "Paid beta account open"
        : hostedCheckoutReady
          ? "Checkout ready; account opens after signed receipt"
          : "Waiting for payment"
    }`,
    ...customerReceiptRows.map((item) => `${item.label}: ${item.value}`),
    hostedCheckoutReady && !paidBetaActive ? `Checkout: ${hostedCheckoutUrl}` : null,
    `Next steps: ${customerReceiptNextSteps
      .map((item) => `${item.label} - ${item.summary}`)
      .join("; ")}`,
    paidBetaActive
      ? "First cycle: start the brand team from this account when the customer is ready."
      : "First cycle: starts after paid access is open.",
    "Boundary: public posts, outreach, page changes, and spend wait for the launch call.",
  ].filter(Boolean).join("\n");
  const downloadCustomerReceipt = useCallback(() => {
    downloadDearMeReceipt(customerReceiptText, DEARME_PAID_BETA_CUSTOMER_RECEIPT_FILENAME);
  }, [customerReceiptText]);
  const welcomePlanItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "first-five-minutes",
      icon: Sparkles,
      label: "First 5 minutes",
      signal: paidBetaActive ? "Proof fast" : "Opens after payment",
      summary: paidBetaActive
        ? "Start from one sentence; DearMe prepares the first proof pack, Voice & Memory, and launch boundary."
        : "After access opens, the first brand cycle starts from one sentence instead of a settings project.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "first-week",
      icon: Workflow,
      label: "First week",
      signal: paidBetaActive ? "Useful work" : "Ready to run",
      summary: "DearMe keeps content, opportunities, portfolio proof, reports, and review calls visible.",
      variant: paidBetaActive ? "default" : "outline",
    },
    {
      key: "support-follow-up",
      icon: LifeBuoy,
      label: "Support follow-up",
      signal: paidBetaActive ? "Check-in ready" : "After access",
      summary: "Empty weeks or stuck paths get a make-good or clearer-direction follow-up before the next check-in.",
      variant: paidBetaActive ? "default" : "outline",
    },
    {
      key: "launch-boundary",
      icon: ShieldCheck,
      label: "Launch boundary",
      signal: "Your call",
      summary: "Public posts, outreach, page changes, and spend wait for the launch call.",
      variant: "outline",
    },
  ];
  const welcomePlanText = [
    "DearMe paid beta welcome plan",
    `Account: ${paidBetaActive ? "paid beta open" : "waiting for paid beta access"}`,
    `Receipt: ${paidBetaActive ? status?.latestExternalInvoiceId || "No reference saved" : "record after payment"}`,
    "First 5 minutes: start from one sentence and show a proof pack, Voice & Memory, and launch boundary.",
    "First week: keep useful content, opportunities, portfolio proof, reports, and review calls visible.",
    "Support: empty weeks or stuck paths get a make-good or clearer-direction follow-up before the next check-in.",
    "Boundary: public posts, outreach, page changes, and spend wait for the launch call.",
  ].join("\n");
  const downloadWelcomePlanReceipt = useCallback(() => {
    downloadDearMeReceipt(welcomePlanText, DEARME_PAID_BETA_WELCOME_PLAN_RECEIPT_FILENAME);
  }, [welcomePlanText]);
  const parsedCloseKitAmountDollars = Number(amountDollars);
  const closeKitAmountCents = Number.isFinite(parsedCloseKitAmountDollars)
    ? Math.max(Math.round(parsedCloseKitAmountDollars * 100), DEARME_PAID_BETA_MIN_PAYMENT_CENTS)
    : DEARME_PAID_BETA_MIN_PAYMENT_CENTS;
  const closeKitPrice = paidBetaActive ? money(status?.netPaidCents ?? 0) : money(closeKitAmountCents);
  const closeKitReference = paidBetaActive
    ? status?.latestExternalInvoiceId || "No reference saved"
    : externalInvoiceId.trim() || "Add receipt reference after payment";
  const closeKitReceiptNote = paidBetaActive
    ? status?.latestPaymentDescription || "Paid beta payment"
    : description.trim() || "Private beta payment";
  const closeKitItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = paidBetaActive
    ? [
        {
          key: "confirm-access",
          icon: CreditCard,
          label: "Confirm access",
          signal: "Account open",
          summary: `Paid beta access is recorded with ${closeKitReference}.`,
          variant: "default",
        },
        {
          key: "start-first-cycle",
          icon: Workflow,
          label: "Start first cycle",
          signal: "Ready to start",
          summary: "Brief the brand team and create the first launch-ready brand assets.",
          variant: "default",
        },
        {
          key: "keep-launch-boundary",
          icon: ShieldCheck,
          label: "Keep launch boundary",
          signal: "Launch call",
          summary: "Public posts, outreach, page changes, and spend wait for the launch call.",
          variant: "outline",
        },
      ]
    : [
        {
          key: "close-sale",
          icon: CreditCard,
          label: "Close the sale",
          signal: hostedCheckoutReady ? "Checkout ready" : "Ready to close",
          summary: hostedCheckoutReady
            ? `Private beta can be sold at ${closeKitPrice}; checkout opens access after the signed receipt arrives.`
            : `Private beta can be sold at ${closeKitPrice}; open access only after payment.`,
          variant: "default",
        },
        {
          key: "open-account",
          icon: Workflow,
          label: "Open the account",
          signal: hostedCheckoutReady ? "Automatic receipt" : "After receipt",
          summary: hostedCheckoutReady
            ? "Signed checkout receipts open access automatically; keep manual recording as the fallback."
            : "Record the payment reference, then start the first brand cycle.",
          variant: "secondary",
        },
        {
          key: "keep-launch-boundary",
          icon: ShieldCheck,
          label: "Keep launch boundary",
          signal: "Receipts first",
          summary: "Public claims still wait for approved live delivery receipts.",
          variant: "outline",
        },
      ];
  const closeKitHandoffText = paidBetaActive
    ? [
        "DearMe paid beta start kit",
        "Account: paid beta open",
        `Receipt: ${closeKitReference}`,
        `Paid: ${closeKitPrice}`,
        `Remaining credit: ${money(status?.remainingCreditCents ?? 0)}`,
        `Receipt note: ${closeKitReceiptNote}`,
        "Start: brief the brand team and create the first launch-ready brand assets.",
        "Boundary: public posts, outreach, page changes, and spend wait for the launch call.",
      ].join("\n")
    : [
        "DearMe private beta close kit",
        "Offer: personal brand growth team",
        "Status: ready to sell after payment",
        `Price: ${closeKitPrice}`,
        `Receipt note: ${closeKitReceiptNote}`,
        "What opens: first brand cycle, Voice & Memory, weekly receipt, and launch-call boundary.",
        hostedCheckoutReady
          ? "After payment: signed checkout receipt opens access automatically; use manual recording only as fallback."
          : "After payment: record access with the receipt reference, then start the first brand cycle.",
        "Not included yet: public launch proof waits for approved live delivery receipts.",
      ].join("\n");
  const downloadCloseKitReceipt = useCallback(() => {
    downloadDearMeReceipt(closeKitHandoffText, DEARME_PAID_BETA_CLOSE_KIT_RECEIPT_FILENAME);
  }, [closeKitHandoffText]);
  const paymentPathItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = paidBetaActive
    ? [
        {
          key: "payment-path",
          icon: CreditCard,
          label: "Payment path",
          signal: "Receipt recorded",
          summary: "This account has a saved payment reference and paid beta access is open.",
          variant: "default",
        },
        {
          key: "access-activation",
          icon: CheckCircle2,
          label: "Activation",
          signal: "Open",
          summary: "Brand work can start from the same receipt without another approval loop.",
          variant: "default",
        },
        {
          key: "checkout-upgrade",
          icon: Workflow,
          label: "Self-serve upgrade",
          signal: "Ready to connect",
          summary: "Hosted checkout can replace manual recording once the payment link and receipt sync are configured.",
          variant: "outline",
        },
      ]
    : [
        {
          key: "payment-path",
          icon: CreditCard,
          label: "Payment path",
          signal: hostedCheckoutReady ? "Self-serve checkout" : "Manual private beta",
          summary: hostedCheckoutReady
            ? "Open the account checkout link; DearMe waits for the signed receipt before unlocking paid work."
            : "Take payment through the current private-beta channel before opening access.",
          variant: "secondary",
        },
        {
          key: "access-activation",
          icon: FileText,
          label: "Activation",
          signal: hostedCheckoutReady ? "Receipt sync" : "Record receipt",
          summary: hostedCheckoutReady
            ? "Signed checkout receipts are ready to unlock paid beta access for this account."
            : "Save the amount, receipt note, and reference; DearMe opens brand work from that record.",
          variant: "default",
        },
        {
          key: "checkout-upgrade",
          icon: Workflow,
          label: "Self-serve upgrade",
          signal: hostedCheckoutReady ? "Connected" : "Ready to connect",
          summary: hostedCheckout?.summary ??
            "Hosted checkout can replace manual recording once the payment link and receipt sync are configured.",
          variant: hostedCheckoutReady ? "default" : "outline",
        },
      ];
  const paymentPathReceiptText = paidBetaActive
    ? [
        "DearMe payment path receipt",
        "Mode: paid beta access recorded",
        `Receipt: ${closeKitReference}`,
        `Paid: ${closeKitPrice}`,
        `Receipt note: ${closeKitReceiptNote}`,
        "Activation: paid access is open for this account.",
        "Next: start the first brand cycle from the same account.",
        "Upgrade path: hosted checkout setup can replace manual recording after the payment link and receipt sync are configured.",
      ].join("\n")
    : [
        "DearMe payment path receipt",
        hostedCheckoutReady ? "Mode: self-serve hosted checkout" : "Mode: private beta manual payment",
        `Target amount: ${closeKitPrice}`,
        `Receipt note: ${closeKitReceiptNote}`,
        hostedCheckoutReady
          ? "Collect: send the hosted checkout link for this account."
          : "Collect: payment reference from the current private-beta channel.",
        hostedCheckoutReady
          ? "Activation: signed receipt sync opens paid access automatically."
          : "Activation: record amount, receipt note, and reference to open paid access.",
        "Next: start the first brand cycle once access is open.",
        hostedCheckoutReady
          ? "Manual fallback: record payment here only if checkout receipt sync needs support."
          : "Upgrade path: hosted checkout setup can replace manual recording after the payment link and receipt sync are configured.",
      ].join("\n");
  const downloadPaymentPathReceipt = useCallback(() => {
    downloadDearMeReceipt(paymentPathReceiptText, DEARME_PAID_BETA_PAYMENT_PATH_RECEIPT_FILENAME);
  }, [paymentPathReceiptText]);
  const operatingReceiptItems: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    signal: string;
    summary: string;
    variant: "default" | "secondary" | "outline";
  }> = [
    {
      key: "access-receipt",
      icon: CreditCard,
      label: "Access receipt",
      signal: paidBetaActive ? paidBetaReceiptLabel(status) : "Record access",
      summary: paidBetaActive
        ? `${money(status?.netPaidCents ?? 0)} net paid access is recorded for this account.`
        : "Record a paid beta payment after the customer has actually paid through the current private-beta channel.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "work-unlocked",
      icon: Workflow,
      label: "Brand work",
      signal: paidBetaActive ? "Unlocked" : "Locked",
      summary: paidBetaActive
        ? "DearMe can run brand cycles, prepare assets, update Voice & Memory, and prepare launch calls."
        : "Preview stays available, but new brand cycles wait for paid beta access.",
      variant: paidBetaActive ? "default" : "secondary",
    },
    {
      key: "support-boundary",
      icon: MessageSquare,
      label: "Support boundary",
      signal: paidBetaActive ? "Operating" : "Ready after access",
      summary: paidBetaActive
        ? "Human support is only needed for account access, hosted checkout setup, live external proof, public launch, or spend-sensitive moves."
        : "Once access is active, DearMe can keep preparing work; hosted checkout setup and real launch/support calls stay with Human Support.",
      variant: paidBetaActive ? "outline" : "secondary",
    },
    {
      key: "public-launch-proof",
      icon: ShieldCheck,
      label: "Public launch proof",
      signal: "Receipts needed",
      summary:
        "Paid beta work can continue, but broad launch claims still wait for approved live delivery receipts.",
      variant: "outline",
    },
  ];
  const paidBetaOperatingNextStep = paidBetaActive
    ? "Start the first brand cycle from this account and keep credit, support, and launch boundaries visible."
    : hostedCheckoutReady
      ? "Use the hosted checkout link, then open paid access when the signed receipt arrives."
      : "Collect the private-beta payment, save the receipt reference, then open paid access.";
  const paidBetaOperatingReceiptText = [
    "DearMe paid beta operating receipt",
    `Account: ${paidBetaActive ? "Paid user operating" : "Awaiting paid access"}`,
    `Access receipt: ${operatingReceiptItems[0]?.signal ?? "Record access"} - ${
      operatingReceiptItems[0]?.summary ??
      "Record a paid beta payment after the customer has actually paid through the current private-beta channel."
    }`,
    `Brand work: ${operatingReceiptItems[1]?.signal ?? "Locked"} - ${
      operatingReceiptItems[1]?.summary ?? "Preview stays available, but new brand cycles wait for paid beta access."
    }`,
    `Support boundary: ${operatingReceiptItems[2]?.signal ?? "Ready after access"} - ${
      operatingReceiptItems[2]?.summary ??
      "Once access is active, DearMe can keep preparing work; hosted checkout setup and real launch/support calls stay with Human Support."
    }`,
    `Public launch proof: ${operatingReceiptItems[3]?.signal ?? "Receipts needed"} - ${
      operatingReceiptItems[3]?.summary ??
      "Paid beta work can continue, but broad launch claims still wait for approved live delivery receipts."
    }`,
    `Paid: ${money(status?.netPaidCents ?? 0)}`,
    `Remaining credit: ${money(status?.remainingCreditCents ?? 0)}`,
    `Payment reference: ${paidBetaActive ? status?.latestExternalInvoiceId || "No reference saved" : "Record after payment"}`,
    `Next support step: ${paidBetaOperatingNextStep}`,
    "Boundary: paid beta work can run after access is open; public posts, outreach, page changes, new spend, live proof, and irreversible moves wait for the launch call.",
  ].join("\n");
  const downloadPaidBetaOperatingReceipt = useCallback(() => {
    downloadDearMeReceipt(paidBetaOperatingReceiptText, DEARME_PAID_BETA_OPERATING_RECEIPT_FILENAME);
  }, [paidBetaOperatingReceiptText]);

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
    onSuccess: (result) => {
      setPaymentError(null);
      setExternalInvoiceId("");
      queryClient.setQueryData(queryKeys.dearme.paidBetaAccess(companyId), result.access);
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dearme.paidBetaCohorts });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeSummary(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeEvents(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(companyId) });
    },
    onError: (err) => {
      setPaymentError(
        dearMeCustomerErrorMessage(
          err,
          "Payment could not be recorded. Try again before counting paid beta access.",
        ),
      );
    },
  });

  function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);
    recordPaymentMutation.mutate();
  }

  return (
    <DearMePanel id={DEARME_PAID_BETA_ACCESS_ID} aria-label="Paid beta access">
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
          {dearMeCustomerErrorMessage(
            error,
            "Paid beta status needs attention. Try again before recording a payment.",
          )}
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

      <section
        aria-label="Paid beta operating receipt"
        className="mt-4 rounded-md border border-border bg-background px-4 py-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Operating receipt</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              {paidBetaActive ? "Paid access is active; the team can operate." : "Private beta sale is ready when access is recorded."}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              {paidBetaActive
                ? "This account can receive private brand-team work with visible credit, support, and launch boundaries."
                : "Keep the preview free; record paid access only after a real private-beta payment exists."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Paid user operating" : "Awaiting paid access"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_BETA_OPERATING_RECEIPT_FILENAME}`}
              onClick={downloadPaidBetaOperatingReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operatingReceiptItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>
        <Textarea
          aria-label="Paid beta operating receipt note"
          className="mt-4 min-h-40 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
          readOnly
          value={paidBetaOperatingReceiptText}
        />
      </section>

      <section
        aria-label="Paid beta customer receipt"
        className="mt-4 rounded-md border border-border bg-muted/20 px-4 py-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Customer receipt</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              {paidBetaActive ? "Paid beta account is open." : "Receipt appears after paid access is recorded."}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              {paidBetaActive
                ? "Use this receipt to confirm access with the customer, then start the first brand cycle from the same account."
              : "DearMe keeps the preview free and only opens brand work after a real payment is recorded."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hostedCheckoutReady ? (
              <Button asChild size="sm">
                <a href={hostedCheckoutUrl ?? undefined} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open checkout
                </a>
              </Button>
            ) : null}
            {paidBetaActive ? (
              <Button type="button" size="sm" onClick={onFocusFirstCycle}>
                <Sparkles className="h-4 w-4" />
                Start first cycle now
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Download ${DEARME_PAID_BETA_CUSTOMER_RECEIPT_FILENAME}`}
              onClick={downloadCustomerReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download receipt
            </Button>
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Account open" : "Waiting for payment"}
            </Badge>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customerReceiptRows.map((item) => (
            <div key={item.label} className="rounded-md border border-border bg-background px-3 py-2">
              <dt className="text-xs font-medium uppercase text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {customerReceiptNextSteps.map((item) => (
            <div key={item.label} className="rounded-md border border-border bg-background px-3 py-3">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
            </div>
          ))}
        </div>
        <Textarea
          aria-label="Paid beta customer receipt note"
          className="mt-4 min-h-40 resize-none bg-background font-mono text-xs leading-relaxed"
          readOnly
          value={customerReceiptText}
        />
      </section>

      <section
        aria-label="Paid beta welcome plan"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Welcome plan</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              {paidBetaActive
                ? "The first paid week has a clear promise."
                : "The first paid week is ready once access opens."}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              {paidBetaActive
                ? "Use this as the customer-safe welcome note: first proof fast, weekly value visible, support follow-up owned, launch still under review."
                : "Before payment, this is the promise DearMe will fulfill after the account opens."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Welcome ready" : "Ready after payment"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              aria-label={`Download ${DEARME_PAID_BETA_WELCOME_PLAN_RECEIPT_FILENAME}`}
              onClick={downloadWelcomePlanReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Download receipt</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {welcomePlanItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background/85 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>

        <Textarea
          aria-label="Paid beta welcome plan note"
          className="mt-4 min-h-40 resize-none bg-background/85 font-mono text-xs leading-relaxed"
          readOnly
          value={welcomePlanText}
        />
      </section>

      <section
        aria-label="Paid beta close kit"
        className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Close kit</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              {paidBetaActive
                ? "Paid beta account is ready to start."
                : "Private beta is ready to sell from this account."}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              {paidBetaActive
                ? "Use this customer-safe handoff to confirm access and move directly into the first brand-team cycle."
                : "Use this customer-safe close note to take payment, record the receipt, and open brand work without extra setup."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hostedCheckoutReady ? (
              <Button asChild size="sm">
                <a href={hostedCheckoutUrl ?? undefined} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open checkout
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              aria-label={`Download ${DEARME_PAID_BETA_CLOSE_KIT_RECEIPT_FILENAME}`}
              onClick={downloadCloseKitReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Download receipt</span>
            </Button>
            <Badge variant={paidBetaActive ? "default" : "secondary"}>
              {paidBetaActive ? "Ready to start" : hostedCheckoutReady ? "Checkout ready" : "Ready to close"}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {closeKitItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>

        <Textarea
          aria-label="Paid beta close kit note"
          className="mt-4 min-h-40 resize-none bg-background/80 font-mono text-xs leading-relaxed"
          readOnly
          value={closeKitHandoffText}
        />
      </section>

      <section
        aria-label="Paid beta payment path receipt"
        className="mt-4 rounded-md border border-border bg-background px-4 py-4"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Payment path</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              {paidBetaActive
                ? "Payment is recorded; paid work can start."
                : hostedCheckoutReady
                  ? "Self-serve checkout is ready for this account."
                  : "Payment can be taken now; access opens from the receipt."}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-foreground/80">
              {paidBetaActive
                ? "This keeps the paid account, receipt, customer handoff, and first brand cycle tied to one account."
                : hostedCheckoutReady
                  ? "Open checkout from this account; DearMe will unlock paid beta access after the signed receipt arrives."
                  : "Use the current private-beta payment path today, then swap in hosted checkout when the link and receipt sync are ready."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hostedCheckoutReady ? (
              <Button asChild size="sm">
                <a href={hostedCheckoutUrl ?? undefined} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open checkout
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              aria-label={`Download ${DEARME_PAID_BETA_PAYMENT_PATH_RECEIPT_FILENAME}`}
              onClick={downloadPaymentPathReceipt}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Download receipt</span>
            </Button>
            <Badge variant={paidBetaActive || hostedCheckoutReady ? "default" : "secondary"}>
              {paidBetaActive
                ? "Receipt-backed access"
                : hostedCheckoutReady
                  ? "Self-serve checkout"
                  : "Manual payment path"}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {paymentPathItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-md border border-border bg-muted/20 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.variant}>{item.signal}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            );
          })}
        </div>

        <Textarea
          aria-label="Paid beta payment path note"
          className="mt-4 min-h-40 resize-none bg-muted/20 font-mono text-xs leading-relaxed"
          readOnly
          value={paymentPathReceiptText}
        />
      </section>

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

      {recordPaymentMutation.isSuccess ? (
        <div
          className="mt-3 flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
          aria-label="Paid beta payment recorded"
        >
          <span>
            Payment recorded. Paid beta access is open for this account; start the brand team when the
            customer is ready.
          </span>
          <Button type="button" size="sm" onClick={onFocusFirstCycle}>
            <Sparkles className="h-4 w-4" />
            Start first cycle now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </DearMePanel>
  );
}

function FirstCyclePacketSpotlight({
  outputs,
  onOpenOutput,
}: {
  outputs: DearMeOutputItem[];
  onOpenOutput: (output: DearMeOutputItem, intent?: DearMeReviewEntryIntent | null) => void;
}) {
  const packetOutputs = outputs.filter(isProofPackOutput);
  if (packetOutputs.length === 0) return null;

  const contentOutput = packetOutputs.find((output) => output.kind === "content_drafts");
  const reportOutput = packetOutputs.find((output) => output.kind === "weekly_report");
  const primaryOutput = contentOutput ?? reportOutput ?? packetOutputs[0];
  const contentVoiceGate = contentOutput ? primaryOutputVoiceGate(contentOutput) : null;
  const reportVoiceGate = reportOutput ? primaryOutputVoiceGate(reportOutput) : null;
  const readyCount = packetOutputs.filter((output) => output.status === "ready_for_review").length;

  return (
    <div
      className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4"
      aria-label="First proof pack"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            First proof pack ready
          </div>
          <p className="mt-1 text-sm text-foreground/85">
            One review path: check the proof pack in Work Ready, make the launch call in Decisions, then keep the
            live proof feed in view while the brand lane keeps moving.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {readyCount || packetOutputs.length} ready
          </Badge>
          <Badge variant="outline">Review first</Badge>
          <Badge variant="outline">Work Ready</Badge>
          <Badge variant="outline">Decisions</Badge>
          <Badge variant="outline">Brand lane</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {contentOutput ? (
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Content draft</p>
            <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
              {cyclePacketSummary(contentOutput)}
            </p>
            {contentVoiceGate ? <VoiceCheckPanel gate={contentVoiceGate} compact className="mt-3" /> : null}
          </div>
        ) : null}
        {reportOutput ? (
          <div className="rounded-md border border-border bg-background/80 p-3">
            <p className="text-xs font-medium text-muted-foreground">Dear me report</p>
            <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
              {cyclePacketSummary(reportOutput)}
            </p>
            {reportVoiceGate ? <VoiceCheckPanel gate={reportVoiceGate} compact className="mt-3" /> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Review first in Work Ready; Decisions holds the launch call.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={scrollToDearMeLiveProofFeed}
          >
            <Workflow className="h-4 w-4" />
            See live proof feed
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenOutput(primaryOutput, reviewLoopRouteIntent(primaryOutput.reviewLoop))}
          >
            Review proof pack
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrivateWorkPanel({
  companyId,
  outputKindFilter,
  decisionFocus,
  onOpenOutput,
  onOpenDecisions,
  onOpenVoiceMemory,
  outputReviewState,
  onReviewOutput,
}: {
  companyId: string;
  outputKindFilter?: DearMeOutputItem["kind"] | null;
  decisionFocus: DearMeDecisionFocus | null;
  onOpenOutput: (output: DearMeOutputItem, intent?: DearMeReviewEntryIntent | null) => void;
  onOpenDecisions: () => void;
  onOpenVoiceMemory: () => void;
  outputReviewState: DearMeOutputReviewState;
  onReviewOutput: (outputId: string, action: DearMeOutputReviewAction, decisionNote: string) => void;
}) {
  const outputsQuery = useQuery({
    queryKey: queryKeys.dearme.outputs(companyId),
    queryFn: () => dearmeApi.getOutputs(companyId),
  });
  const allOutputs = outputsQuery.data?.outputs ?? [];
  const outputs = outputKindFilter
    ? allOutputs.filter((output) => output.kind === outputKindFilter)
    : allOutputs;
  const isOpportunityView = outputKindFilter === "opportunity_drafts";
  const focusedOutput = decisionFocus
    ? outputs.find((output) => matchesOutputFocus(output, decisionFocus)) ?? null
    : null;

  return (
    <DearMePanel
      id={isOpportunityView ? "dearme-opportunities-ready" : "dearme-work-ready"}
      aria-label={isOpportunityView ? "Opportunity work ready" : "Brand work ready"}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {isOpportunityView ? <Telescope className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {isOpportunityView ? "Opportunities ready / Launch calls" : "Ready for your review"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOpportunityView
              ? "Prepared opportunity drafts: targets, contact evidence, fit reasons, outreach angles, draft messages, and launch boundaries."
              : "Review first in Work Ready, make launch calls in Decisions, and let the brand lane keep moving between your calls."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {outputs.length > 0 ? (
            <Badge variant="outline">
              {isOpportunityView
                ? `${outputs.length} opportunity${outputs.length === 1 ? "" : "ies"}`
                : pluralizeCount(outputs.length, "item ready", "items ready")}
            </Badge>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={onOpenDecisions}>
            <ShieldCheck className="h-4 w-4" />
            Open Decisions
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onOpenVoiceMemory}>
            <Sparkles className="h-4 w-4" />
            Open Voice & Memory
          </Button>
        </div>
      </div>

      {outputsQuery.isError ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {dearMeCustomerErrorMessage(
            outputsQuery.error,
            "Prepared work needs attention. Try again before reviewing drafts.",
          )}
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
          icon={isOpportunityView ? Telescope : Workflow}
          title={isOpportunityView ? "Opportunity scouting has not produced reviewable leads yet" : "Brand work has not started yet"}
          description={isOpportunityView ? "Ask the Chief of Staff to scout practical openings and stage outreach behind the launch boundary." : "Start your brand team."}
        />
      ) : (
        <>
          {isOpportunityView ? null : <FirstCyclePacketSpotlight outputs={outputs} onOpenOutput={onOpenOutput} />}
          {focusedOutput ? (
            <FocusedOutputPanel
              output={focusedOutput}
              entryIntent={decisionFocus?.intent ?? null}
              reviewState={outputReviewState}
              onOpenVoiceMemory={onOpenVoiceMemory}
              onReviewOutput={onReviewOutput}
            />
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {outputs.map((output) => {
              const preview = outputPreview(output);
              const details = outputReviewDetails(output);
              const voiceGate = primaryOutputVoiceGate(output);
              const routeIntent = reviewLoopRouteIntent(output.reviewLoop);
              const focused = decisionFocus ? matchesOutputFocus(output, decisionFocus) : false;
              const launchBoundary = outputLaunchBoundaryPreview(output);
              const footer = `Updated ${shortDate(output.updatedAt)}${
                output.documents.length > 0
                  ? ` / ${output.documents.length} proof reference${output.documents.length === 1 ? "" : "s"}`
                  : ""
              }`;
              return (
                <DearMeActionCard
                  key={output.id}
                  className="flex min-h-44 flex-col p-4"
                  focused={focused}
                  title={customerProofPackSummary(output.title)}
                  summary={customerProofPackSummary(output.summary)}
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
                    ...(voiceGate
                      ? [{
                          label: `Voice ${voiceGate.score}/100`,
                          variant: voiceGateVariant(voiceGate.status),
                        }]
                      : []),
                    {
                      label: OUTPUT_KIND_LABELS[output.kind],
                      variant: "outline",
                    },
                  ]}
                  chips={[
                    {
                      label: `Prepared by ${roleLabel(OUTPUT_KIND_OWNER_ROLE[output.kind])}`,
                      variant: "outline",
                    },
                  ]}
                  footer={footer}
                  action={{
                    label: privateWorkActionLabel(output),
                    ariaLabel: privateWorkActionAriaLabel(output),
                    onClick: () => onOpenOutput(output, routeIntent),
                    variant: output.isReviewable || routeIntent ? "default" : "outline",
                  }}
                >
                  {preview ? (
                    <p className="line-clamp-3 text-sm text-foreground/80">
                      {customerProofPackSummary(preview)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Waiting for the first draft.</p>
                  )}

                  <p className="mt-3 rounded-md border border-border bg-background/80 p-2 text-xs text-muted-foreground">
                    {customerProofPackSummary(output.reviewLoop.nextStep)}
                  </p>

                  {launchBoundary ? (
                    <div
                      className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                      aria-label={`${customerProofPackSummary(output.title)} launch boundary`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Launch boundary
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/85">{launchBoundary}</p>
                    </div>
                  ) : null}

                  <OutputSourceEvidenceList output={output} limit={2} compact className="mt-3" />

                  {voiceGate ? <VoiceCheckPanel gate={voiceGate} compact className="mt-3" /> : null}

                  {details.length > 0 ? (
                    <dl className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                      {details.map((detail) => (
                        <div key={`${output.id}:${detail.kind}`} className="grid gap-1">
                          <dt className="text-xs font-medium text-muted-foreground">
                            {customerProofPackSummary(detail.label)}
                          </dt>
                          <dd className="line-clamp-3 text-sm text-foreground/85">
                            {customerProofPackSummary(detail.value)}
                          </dd>
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
  const { companies, selectedCompanyId, selectedCompany, setSelectedCompanyId } = useCompany();
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
  const [firstCyclePrivateWorkStarted, setFirstCyclePrivateWorkStarted] = useState(false);
  const [publicFirstRunStarted, setPublicFirstRunStarted] = useState(false);
  const [fullProfileControlsOpen, setFullProfileControlsOpen] = useState(false);
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

  useEffect(() => {
    if (location.hash !== `#${DEARME_PAID_BETA_ACCESS_ID}`) return;
    document.getElementById(DEARME_PAID_BETA_ACCESS_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [location.hash]);

  const currentSignature = useMemo(
    () => createDearMeBrandBlueprintSignature(form, selectedCompany?.name),
    [form, selectedCompany?.name],
  );
  const decisionFocus = useMemo(
    () => parseDearMeDecisionFocus(location.search),
    [location.search],
  );
  const selectedView = useMemo(
    () => parseDearMePageView(location.search),
    [location.search],
  );
  const previewMatchesForm = previewSignature === currentSignature;
  const paidBetaAccessQuery = useQuery({
    queryKey: queryKeys.dearme.paidBetaAccess(selectedCompanyId ?? "__none__"),
    queryFn: () => {
      if (!selectedCompanyId) throw new Error(DEARME_PROFILE_REQUIRED_MESSAGE);
      return dearmeApi.getPaidBetaAccess(selectedCompanyId);
    },
    enabled: !!selectedCompanyId,
  });
  const paidBetaStatus = paidBetaAccessQuery.data ?? null;
  const paidBetaEntitlement = paidBetaStatus?.entitlement ?? null;
  const canRequestPaidBetaWork = paidBetaEntitlement?.canRequestBrandOsApproval === true;
  const canStartPrivateWork = paidBetaEntitlement?.canStartPrivateWork === true;
  const paidBetaCohortCompanyIds = useMemo(
    () => normalizePaidBetaCohortCompanyIds(selectedCompanyId, companies),
    [companies, selectedCompanyId],
  );
  const paidBetaCohortCompanyNames = useMemo(() => {
    const entries = companies
      .filter((company) => company.status !== "archived")
      .map((company) => [company.id, company.name] as const);
    if (selectedCompany && !entries.some(([companyId]) => companyId === selectedCompany.id)) {
      entries.push([selectedCompany.id, selectedCompany.name]);
    }
    return Object.fromEntries(entries);
  }, [companies, selectedCompany]);

  function updateField<K extends keyof DearMeBrandBlueprintFormState>(
    key: K,
    value: DearMeBrandBlueprintFormState[K],
  ) {
    setActionError(null);
    setFirstCyclePreview(null);
    setFirstCyclePrivateWorkStarted(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const firstCycleMutation = useMutation({
    mutationFn: (input: {
      brand: ReturnType<typeof buildDearMeBrandBlueprintSeed>;
      nextForm: DearMeBrandBlueprintFormState;
      startPrivateWork: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error(DEARME_PROFILE_REQUIRED_MESSAGE);
      const firstCycleRequest = { brand: input.brand };
      return input.startPrivateWork
        ? dearmeApi.startFirstCycle(selectedCompanyId, firstCycleRequest)
        : dearmeApi.previewFirstCycle(selectedCompanyId, firstCycleRequest);
    },
    onSuccess: (result, input) => {
      const nextPreview = withDearMeFirstCycleRuntimeDefaults(result);
      setForm(input.nextForm);
      setFirstCyclePreview(nextPreview);
      setFirstCyclePrivateWorkStarted(input.startPrivateWork);
      setPreviewResult(null);
      setPreviewSignature(null);
      setActionError(null);
      writeDearMeFirstCyclePreview(nextPreview);
      if (selectedCompanyId && input.startPrivateWork) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.outputs(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(selectedCompanyId) });
      }
    },
    onError: (err) => {
      setActionError(
        dearMeCustomerErrorMessage(
          err,
          "First cycle needs attention. Try again before starting brand work.",
        ),
      );
    },
  });

  const previewMutation = useMutation({
    mutationFn: (input: { signature: string }) => {
      if (!selectedCompanyId) throw new Error(DEARME_PROFILE_REQUIRED_MESSAGE);
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
      setActionError(
        dearMeCustomerErrorMessage(
          err,
          "Profile preview needs attention. Try again before starting brand work.",
        ),
      );
    },
  });

  const applyRequestMutation = useMutation({
    mutationFn: () => {
      if (!selectedCompanyId) throw new Error(DEARME_PROFILE_REQUIRED_MESSAGE);
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
      navigate(buildDearMeDecisionRoute({ approvalId: result.approval.id, preserveSearch: location.search }));
    },
    onError: (err) => {
      setActionError(
        dearMeCustomerErrorMessage(
          err,
          "Launch request needs attention. Try again before moving the brand team forward.",
        ),
      );
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
      setActionError(
        dearMeCustomerErrorMessage(
          err,
          "DearMe decision needs attention. Try again before moving this forward.",
        ),
      );
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
      if (!selectedCompanyId) throw new Error(DEARME_PROFILE_REQUIRED_MESSAGE);
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
        queryClient.setQueryData<DearMeOutputsResponse>(
          queryKeys.dearme.outputs(selectedCompanyId),
          (current) => replaceDearMeOutputInResponse(current, result.output),
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.workbench(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dearme.outputs(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(selectedCompanyId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(result.output.issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.activity(result.output.issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.workProducts(result.output.issueId) });
    },
    onError: (err) => {
      setActionError(
        dearMeCustomerErrorMessage(
          err,
          "DearMe work needs attention. Try again before moving this forward.",
        ),
      );
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
      startPrivateWork: canStartPrivateWork,
    });
  }

  function handleContentFirstRunStart() {
    const positioning = firstCycleIntent.trim() || form.positioning.trim();
    if (positioning) setPublicFirstRunStarted(true);
    handleFirstCyclePreview();
  }

  function handleContentFirstRunWatch() {
    setPublicFirstRunStarted(true);
    window.setTimeout(() => {
      const target = document.querySelector('[aria-label="90-second first cycle"]');
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function handleApplyRequest() {
    if (!previewResult || !previewMatchesForm) {
      setActionError("Refresh the preview before starting the brand team.");
      return;
    }
    if (!canRequestPaidBetaWork) {
      setActionError(
        paidBetaEntitlement?.nextActionDescription ??
          "Paid beta access is required before starting brand team work.",
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
        preserveSearch: location.search,
      }),
    );
  }

  function handleOpenIssue(issueReference: string, outputId?: string | null) {
    navigate(
      buildDearMeDecisionRoute({
        issueReference,
        outputId: outputId ?? undefined,
        preserveSearch: location.search,
      }),
    );
  }

  function handleOpenWorkbenchWorkItem(
    issueReference: string,
    outputId: string,
    intent?: DearMeReviewEntryIntent | null,
  ) {
    navigate(buildDearMeDecisionRoute({ issueReference, outputId, intent, preserveSearch: location.search }));
  }

  function handleOpenApproval(approvalId: string) {
    navigate(buildDearMeDecisionRoute({ approvalId, preserveSearch: location.search }));
  }

  function handleOpenFirstCyclePreview(handle: string) {
    const previewToOpen =
      firstCyclePreview?.sitePreview.handle === handle
        ? firstCyclePreview
        : selectedCompanyId && SAMPLE_FIRST_CYCLE_PREVIEW.sitePreview.handle === handle
          ? { ...SAMPLE_FIRST_CYCLE_PREVIEW, companyId: selectedCompanyId }
          : null;

    if (previewToOpen) {
      writeDearMeFirstCyclePreview(previewToOpen);
    }

    navigate(buildDearMeSitePreviewPath(handle));
  }

  function handleOpenWorkReady() {
    navigate(buildDearMeWorkReadyRoute(location.search));
  }

  function handleOpenDecisionsReady() {
    navigate(buildDearMeDecisionsReadyRoute(location.search));
  }

  function handleOpenVoiceMemory() {
    navigate(buildDearMeVoiceMemoryRoute(location.search));
  }

  function handleOpenPaidBetaAccount(companyId: string) {
    const targetCompany =
      companies.find((company) => company.id === companyId) ??
      (selectedCompany?.id === companyId ? selectedCompany : null);
    setSelectedCompanyId(companyId, { source: "route_sync" });
    navigate(buildDearMePaidBetaAccessRoute(location.search, targetCompany?.issuePrefix));
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

  const handleFocusFirstCycle = useCallback(() => {
    const input = document.getElementById("dearme-first-cycle-intent");
    input?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    if (input instanceof HTMLTextAreaElement) input.focus();
  }, []);

  if (!selectedCompanyId) {
    return <p className="text-sm text-muted-foreground">{DEARME_PROFILE_REQUIRED_MESSAGE}</p>;
  }

  const requestDisabled =
    !previewResult ||
    !previewMatchesForm ||
    !canRequestPaidBetaWork ||
    previewMutation.isPending ||
    applyRequestMutation.isPending;
  const showPublicFirstRunLanding =
    (selectedView === "home" || selectedView === "content") &&
    !decisionFocus &&
    !publicFirstRunStarted &&
    !firstCyclePreview;

  if (showPublicFirstRunLanding) {
    return (
      <DearMePageShell>
        <DearMePublicFirstRunLanding
          intent={firstCycleIntent}
          isPending={firstCycleMutation.isPending}
          onIntentChange={(value) => {
            setActionError(null);
            setFirstCycleIntent(value);
          }}
          onOpenLaunchProof={() => navigate(buildDearMeDecisionRoute({ preserveSearch: location.search }))}
          onStart={handleContentFirstRunStart}
          onWatchLive={handleContentFirstRunWatch}
        />

        {actionError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}
      </DearMePageShell>
    );
  }

  return (
    <DearMePageShell>
      <DearMeHero
        eyebrow={
          <>
            <Sparkles className="h-4 w-4" />
            DearMe / Brand workroom
          </>
        }
        title="DearMe grows your personal brand while you work."
        description={
          <>
            Dear me, your team is already running the brand cycle: planning, drafting, scouting,
            packaging proof, and preparing weekly direction. It shows the work it did and brings you only the launch calls that matter.
          </>
        }
        actions={
          <>
            <Button
              type="button"
              onClick={handleFocusFirstCycle}
              disabled={firstCycleMutation.isPending || previewMutation.isPending || applyRequestMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              Start with one sentence
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenFirstCyclePreview(
                (firstCyclePreview ?? SAMPLE_FIRST_CYCLE_PREVIEW).sitePreview.handle,
              )}
            >
              <ExternalLink className="h-4 w-4" />
              View proof
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

      <FirstCyclePayoffStrip
        canStartPrivateWork={canStartPrivateWork}
        onFocusFirstCycle={handleFocusFirstCycle}
      />

      <FirstCyclePanel
        intent={firstCycleIntent}
        preview={firstCyclePreview}
        isPending={firstCycleMutation.isPending}
        canStartPrivateWork={canStartPrivateWork}
        onOpenPreview={handleOpenFirstCyclePreview}
        onOpenWorkReady={handleOpenWorkReady}
        onIntentChange={(value) => {
          setActionError(null);
          setFirstCycleIntent(value);
          setFirstCyclePreview(null);
          setFirstCyclePrivateWorkStarted(false);
        }}
        onPreview={handleFirstCyclePreview}
        privateWorkStarted={firstCyclePrivateWorkStarted}
      />

      <TeamWorkbenchPanel
        companyId={selectedCompanyId}
        paidBetaCohortCompanyIds={paidBetaCohortCompanyIds}
        paidBetaCohortCompanyNames={paidBetaCohortCompanyNames}
        paidBetaActive={canRequestPaidBetaWork}
        selectedView={selectedView}
        decisionFocus={decisionFocus}
        canStartPrivateWork={canStartPrivateWork}
        onOpenPaidBetaAccount={handleOpenPaidBetaAccount}
        onFocusFirstCycle={handleFocusFirstCycle}
        onOpenApproval={handleOpenApproval}
        onOpenIssue={handleOpenIssue}
        onOpenWorkItem={handleOpenWorkbenchWorkItem}
        onOpenWorkReady={handleOpenWorkReady}
        onOpenLaunchProof={handleOpenDecisionsReady}
        onOpenVoiceMemory={handleOpenVoiceMemory}
        onReviewApproval={handleReviewApproval}
        onReviewOutput={handleReviewOutput}
        reviewState={{
          approvalId: pendingApprovalReview?.approvalId ?? null,
          action: pendingApprovalReview?.action ?? null,
          isPending: approvalReviewMutation.isPending,
        }}
        outputReviewState={{
          outputId: pendingOutputReview?.outputId ?? null,
          action: pendingOutputReview?.action ?? null,
          isPending: outputReviewMutation.isPending,
        }}
      />

      <PrivateWorkPanel
        companyId={selectedCompanyId}
        outputKindFilter={selectedView === "opportunities" ? "opportunity_drafts" : null}
        decisionFocus={decisionFocus}
        onOpenOutput={handleOpenOutput}
        onOpenDecisions={handleOpenDecisionsReady}
        onOpenVoiceMemory={handleOpenVoiceMemory}
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
        onFocusFirstCycle={handleFocusFirstCycle}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DearMePanel className="space-y-5" aria-label="Full profile controls">
          <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Tell the team what to grow
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with one sentence. What do you want to become known for?
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Full profile controls stay out of the first run until you want to tune budget,
                channels, voice samples, and launch boundaries.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              aria-expanded={fullProfileControlsOpen}
              aria-controls="dearme-full-profile-controls"
              onClick={() => setFullProfileControlsOpen((open) => !open)}
            >
              <Sparkles className="h-4 w-4" />
              {fullProfileControlsOpen ? "Hide full profile controls" : "Open full profile controls"}
            </Button>
          </div>

          {fullProfileControlsOpen ? (
            <div id="dearme-full-profile-controls" className="space-y-5" data-dearme-profile-controls="open">
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
                label="Launch boundaries"
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
	                    <p className="text-xs text-muted-foreground">Drafts start automatically</p>
                  </div>
                  <ToggleSwitch
                    checked={form.autoDraftEnabled}
                    onCheckedChange={(checked) => updateField("autoDraftEnabled", checked)}
                  />
                </div>
              </div>

              <TextAreaField
                id="dearme-approval-note"
                label="Team note"
                value={form.approvalNote}
                rows={3}
                onChange={(value) => updateField("approvalNote", value)}
              />

              <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Full profile controls</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use these after the first proof pack when the team needs a richer operating profile.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending || applyRequestMutation.isPending}
                  >
                    {previewMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Preview profile
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleApplyRequest}
                    disabled={requestDisabled}
                  >
                    {applyRequestMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Start brand team
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              id="dearme-full-profile-controls"
              className="rounded-md border border-border px-4 py-3"
              data-dearme-profile-controls="collapsed"
            >
              <p className="text-sm font-medium">Full profile controls are parked until you need them.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The first brand cycle can run from the sentence above. Open this only when you want
                to tune the brand team profile before starting a richer cycle.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">Smart defaults</Badge>
                <Badge variant="outline">Budget visible</Badge>
                <Badge variant="outline">Launch call required</Badge>
              </div>
            </div>
          )}
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
