// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DEARME_SILENCE_DEFAULT_REVIEW_SCORE,
  buildDearMeBrandBlueprintExecutionPlan,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  describeDearMePaidBetaEntitlement,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
  type DearMeMemoryUpdateKind,
  type DearMeOutputsResponse,
  type DearMePaidBetaCohortSummary,
  type DearMePaidBetaStatus,
  type DearMeWorkbenchResponse,
  type DearMeWorkbenchStreamItem,
  type DearMeOutputReviewLoop,
  type Company,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeOnboarding } from "./DearMeOnboarding";
import { queryKeys } from "../lib/queryKeys";
import { readDearMeFirstCyclePreview } from "../lib/dearme-site-preview";

const mockDearmeApi = vi.hoisted(() => ({
  getWorkbench: vi.fn(),
  openWorkbenchEvents: vi.fn(),
  getOutputs: vi.fn(),
  getPaidBetaAccess: vi.fn(),
  getPaidBetaCohort: vi.fn(),
  sendChiefOfStaffMessage: vi.fn(),
  recordMemoryUpdate: vi.fn(),
  updateMemorySource: vi.fn(),
  archiveMemorySource: vi.fn(),
  restoreMemorySource: vi.fn(),
  recordPaidBetaPayment: vi.fn(),
  previewFirstCycle: vi.fn(),
  startFirstCycle: vi.fn(),
  previewBrandBlueprint: vi.fn(),
  createBrandBlueprintApplyRequest: vi.fn(),
  reviewOutput: vi.fn(),
  continueOutput: vi.fn(),
}));

const mockApprovalsApi = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  requestRevision: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());
const mockLocation = vi.hoisted(() => ({
  pathname: "/PET/dearme",
  search: "?view=brand-os",
  hash: "",
}));
const mockCompanyContext = vi.hoisted(() => ({
  companies: [
    {
      id: "company-1",
      issuePrefix: "PET",
      name: "Peter Studio",
      status: "active",
    },
  ] as Array<Pick<Company, "id" | "issuePrefix" | "name" | "status">>,
  selectedCompanyId: "company-1" as string | null,
  selectedCompany: {
    id: "company-1",
    issuePrefix: "PET",
    name: "Peter Studio",
  } as { id: string; issuePrefix: string; name: string } | null,
}));

vi.mock("../api/dearme", () => ({
  dearmeApi: mockDearmeApi,
  dearmeWorkbenchRefreshEventTypes: [
    "work_loop_transition",
    "approval_pending",
    "approval_resolved",
    "voice_gate_scored",
    "channel_action_fired",
    "cost_recorded",
    "openclaw_lifecycle",
    "openclaw_stream",
    "agent_completed",
    "task_created",
    "task_updated",
  ],
}));

vi.mock("../api/approvals", () => ({
  approvalsApi: mockApprovalsApi,
}));

vi.mock("@/lib/router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: mockCompanyContext.companies,
    selectedCompanyId: mockCompanyContext.selectedCompanyId,
    selectedCompany: mockCompanyContext.selectedCompany,
    setSelectedCompanyId: mockSetSelectedCompanyId,
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

class FakeDearMeEventSource {
  static instances: FakeDearMeEventSource[] = [];

  readonly listeners = new Map<string, Set<EventListener>>();
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor() {
    FakeDearMeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, payload: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(payload) });
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  open() {
    this.onopen?.(new Event("open"));
  }

  fail() {
    this.onerror?.(new Event("error"));
  }
}

function hiddenTerm(parts: string[], separator = "") {
  return parts.join(separator);
}

const HIDDEN_PRODUCT_TERMS = {
  localKernel: hiddenTerm(["Paper", "clip"]),
  orchestrationName: hiddenTerm(["Sym", "phony"]),
  bridgeName: hiddenTerm(["adap", "ter"]),
  vendorName: hiddenTerm(["pro", "vider"]),
  modelName: "model",
  setupRecord: hiddenTerm(["setup", "payload"], "_"),
  workbenchName: hiddenTerm(["work", "bench"]),
  workspaceName: hiddenTerm(["work", "space"]),
};

function expectNoHiddenProductTerms(
  text: string | null | undefined,
  terms: string[],
) {
  const renderedText = text ?? "";
  terms.forEach((term) => {
    expect(renderedText).not.toContain(term);
  });
}

function createPreview() {
  const seed: Parameters<typeof createDearMeBrandBlueprint>[0] = {
    displayName: "Peter Studio",
    goals: ["Grow owned audience"],
    audiences: ["Founders"],
    proofPoints: ["Shipped a working local product"],
    offers: ["Paid beta"],
    voiceSamples: ["Short, direct voice note.", "Plain language with concrete proof."],
    preferredChannels: ["linkedin", "newsletter", "portfolio"],
    constraints: ["Ask before publishing"],
    cadence: "weekly",
    budgetMonthlyCents: 25_000,
    autoDraftEnabled: true,
  };
  const blueprint = createDearMeBrandBlueprint(seed);

  return {
    companyId: "company-1",
    status: "preview" as const,
    blueprint,
    summary: summarizeDearMeBrandBlueprint(blueprint),
    executionPlan: buildDearMeBrandBlueprintExecutionPlan(blueprint),
    voiceGate: evaluateDearMeVoiceGate({
      brand: seed,
      artifact: {
        kind: "brand_positioning",
        channel: "linkedin",
        title: "Profile positioning",
        text: blueprint.brand.positioning,
        proofUsed: seed.proofPoints[0],
      },
    }),
    warnings: [],
  };
}

function createFirstCyclePreview() {
  const preview = createDearMeFirstCyclePreview("company-1", {
    brand: {
      displayName: "Peter Studio",
      positioning: "Known for turning research into practical AI products",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Shipped a working local product"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct voice note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    },
  });
  return {
    ...preview,
    proofSequence: [
      {
        ...preview.proofSequence[0]!,
        sourceLabel: "Prepared from profile work",
      },
      preview.proofSequence[1]!,
      preview.proofSequence[2]!,
    ],
  };
}

function weeklyReportVoiceGate() {
  return evaluateDearMeVoiceGate({
    brand: {
      displayName: "Peter Studio",
      positioning: "Known for turning research into practical AI products",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Refreshed positioning and prepared next bets"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct voice note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    },
    artifact: {
      kind: "weekly_report",
      channel: "newsletter",
      title: "Dear me report",
      text: "Completed work: refreshed positioning and prepared next bets for founders.",
      proofUsed: "Refreshed positioning and prepared next bets",
    },
  });
}

function contentDraftVoiceGate() {
  return evaluateDearMeVoiceGate({
    brand: {
      displayName: "Peter Studio",
      positioning: "Known for turning research into practical AI products",
      goals: ["Grow owned audience"],
      audiences: ["Founders"],
      proofPoints: ["Proof from the first cycle"],
      offers: ["Paid beta"],
      voiceSamples: ["Short, direct voice note.", "Plain language with concrete proof."],
      preferredChannels: ["linkedin", "newsletter", "portfolio"],
      constraints: ["Ask before publishing"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    },
    artifact: {
      kind: "content_draft",
      channel: "linkedin",
      title: "Starter post batch",
      text: "Starter post from proof for founders who need practical AI product evidence.",
      proofUsed: "Proof from the first cycle",
    },
  });
}

function paidBetaStatus(
  status: "trial" | "active",
  overrides: Partial<DearMePaidBetaStatus> = {},
): DearMePaidBetaStatus {
  const active = status === "active";
  return {
    companyId: "company-1",
    status,
    lifetimePaidCents: active ? 25_000 : 0,
    refundedCents: 0,
    netPaidCents: active ? 25_000 : 0,
    remainingCreditCents: active ? 25_000 : 0,
    eventCount: active ? 1 : 0,
    latestPaymentAt: active ? "2026-05-07T14:00:00.000Z" : null,
    latestPaymentDescription: active ? "Founding beta payment" : null,
    latestExternalInvoiceId: active ? "manual-invoice-1" : null,
    entitlement: describeDearMePaidBetaEntitlement(status),
    cycleGuardrail: {
      state: active ? "ready" : "trial_preview",
      label: active ? "Guardrails ready" : "Trial preview",
      headline: active
        ? "Brand cycles can run within guardrails"
        : "Brand cycles wait for paid beta access",
      summary: active
        ? "DearMe checks monthly spend before work runs so prepared moves stay predictable."
        : "Preview the plan for free. DearMe records paid beta access before it spends budget on brand cycles.",
      spendCents: 0,
      budgetCents: 25_000,
      utilizationPercent: 0,
      remainingCreditCents: active ? 25_000 : 0,
      decisionRequired: !active,
      decisionLabel: active ? null : "Record paid beta access",
    },
    ...overrides,
  };
}

function paidBetaCohortSummary(
  overrides: Partial<DearMePaidBetaCohortSummary> = {},
): DearMePaidBetaCohortSummary {
  return {
    accountCount: 1,
    activeAccountCount: 1,
    trialAccountCount: 0,
    readyAccountCount: 1,
    warningAccountCount: 0,
    hardStopAccountCount: 0,
    decisionRequiredAccountCount: 0,
    lifetimePaidCents: 25_000,
    refundedCents: 0,
    netPaidCents: 25_000,
    remainingCreditCents: 25_000,
    cycleSpendCents: 0,
    cycleBudgetCents: 25_000,
    state: "operable",
    label: "Cohort operable",
    summary: "Paid beta accounts can keep receiving private DearMe cycles within current guardrails.",
    nextAction: "Keep the weekly value loop moving and review account health before the next paid check-in.",
    attentionAccounts: [],
    ...overrides,
  };
}

function reviewLoopFixture(
  state: DearMeOutputReviewLoop["state"] = "fresh",
  nextStep = state === "needs_user_review"
    ? "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move stays behind your launch call."
    : "Your team is preparing this for the next launch call.",
  overrides: Partial<DearMeOutputReviewLoop> = {},
): DearMeOutputReviewLoop {
  return {
    state,
    attemptCount: 0,
    maxAttempts: 3,
    isRetriable: true,
    lastAction: null,
    lastDecisionAt: null,
    lastDecisionNotePreview: null,
    defaultApprovalScore: null,
    defaultedBySilence: false,
    nextStep,
    reviewHandoff: null,
    feedbackTrace: null,
    voiceCalibration: null,
    ...overrides,
  };
}

function memorySourcePlanFixture(
  counts: Partial<Record<DearMeMemoryUpdateKind, number>> = {
    voice_sample: 1,
    proof_point: 1,
  },
): DearMeWorkbenchResponse["memory"]["sourcePlan"] {
  const requirements: Array<Pick<
    DearMeWorkbenchResponse["memory"]["sourcePlan"]["required"][number],
    "kind" | "label" | "target" | "nextAction"
  >> = [
    {
      kind: "voice_sample",
      label: "Writing samples",
      target: 2,
      nextAction: "Add real posts, notes, transcripts, or chosen drafts that already sound like the user.",
    },
    {
      kind: "proof_point",
      label: "Proof points",
      target: 2,
      nextAction: "Add shipped work, results, receipts, metrics, or customer proof future drafts can cite.",
    },
    {
      kind: "goal",
      label: "Goals",
      target: 1,
      nextAction: "Add the growth goal this cycle should serve before producing more work.",
    },
    {
      kind: "audience",
      label: "Audience notes",
      target: 1,
      nextAction: "Add who the work should speak to and what that audience cares about.",
    },
    {
      kind: "offer",
      label: "Offer notes",
      target: 1,
      nextAction: "Add what the user can sell, invite, pitch, or ask for.",
    },
    {
      kind: "constraint",
      label: "Boundaries",
      target: 1,
      nextAction: "Add forbidden wording, claim limits, sensitive topics, or positioning corrections.",
    },
  ];
  const required = requirements.map((requirement) => {
    const count = counts[requirement.kind] ?? 0;
    const status: DearMeWorkbenchResponse["memory"]["sourcePlan"]["required"][number]["status"] =
      count === 0 ? "missing" : count >= requirement.target ? "ready" : "partial";
    return {
      ...requirement,
      count,
      status,
    };
  });
  const nextRequirement = required.find((requirement) => requirement.status !== "ready") ?? null;
  const hasAnySource = required.some((requirement) => requirement.count > 0);

  return {
    status: hasAnySource ? (nextRequirement ? "building" : "ready_for_review") : "needs_sources",
    summary: hasAnySource
      ? "Voice & Memory is building coverage. Next: add one more real writing sample."
      : "Start Voice & Memory with real samples, proof, goals, audience, offer, and boundaries before trusting public-facing work.",
    nextSourceKind: nextRequirement?.kind ?? null,
    required,
  };
}

function workbenchResponse(): DearMeWorkbenchResponse {
  return {
    companyId: "company-1",
    headline: "Dear me, your team has decisions ready",
    summary: "7 team members are assigned to your brand cycle. 2 items ready. 1 decision needed. 1 lane in motion.",
    team: [
      {
        role: "chief_of_staff",
        name: "Chief of Staff",
        status: "Working",
        currentFocus: "Coordinating today's brand growth plan and the next decisions.",
        lastActiveAt: "2026-05-07T14:00:00.000Z",
      },
      {
        role: "voice_editor",
        name: "Voice Editor",
        status: "Working",
        currentFocus: "Checking that drafts sound like the user before review.",
        lastActiveAt: "2026-05-07T14:00:00.000Z",
      },
    ],
    activeWork: [
      {
        id: "issue-3:opportunity_drafts",
        title: "Opportunity leads",
        summary: "Warm collaboration and customer leads are being prepared.",
        status: "working",
        ownerRole: "opportunity_scout",
        outputKind: "opportunity_drafts",
        issueId: "issue-3",
        issueIdentifier: "PET-9",
        updatedAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: reviewLoopFixture(),
      },
    ],
    workReady: [
      {
        id: "issue-1:weekly_report",
        title: "Dear me report",
        summary: "Completed work, decisions, and next bets.",
        status: "ready_for_review",
        ownerRole: "growth_analyst",
        outputKind: "weekly_report",
        issueId: "issue-1",
        issueIdentifier: "PET-7",
        updatedAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: reviewLoopFixture("needs_user_review"),
      },
      {
        id: "issue-2:content_drafts",
        title: "Starter posts",
        summary: "Three posts are ready for voice review.",
        status: "ready_for_review",
        ownerRole: "content_producer",
        outputKind: "content_drafts",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        updatedAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: reviewLoopFixture("needs_user_review"),
      },
    ],
    decisionsNeeded: [
      {
        id: "approval:approval-ready",
        kind: "approve_brand_os",
        title: "Start brand team for Peter Studio",
        summary: "Review the first growth-team plan before DearMe starts brand work.",
        riskGate: null,
        status: "pending",
        outputKind: null,
        outputId: null,
        approvalId: "approval-ready",
        issueId: null,
        issueIdentifier: null,
        updatedAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: null,
      },
    ],
    batchDecisions: [
      {
        id: "batch:publish_social",
        title: "Review content batch",
        summary: "1 item is ready. DearMe prepared the work; the launch boundary controls the external move.",
        actionLabel: "Review posts",
        action: "review_posts",
        riskGate: "publish_social",
        itemCount: 1,
        decisionIds: ["output:issue-2:content_drafts"],
        issueIds: ["issue-2"],
        approvalIds: [],
        updatedAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "batch:review",
        title: "Review prepared work",
        summary: "1 item is ready. DearMe prepared the work; the launch boundary controls the external move.",
        actionLabel: "Review work",
        action: "review_work",
        riskGate: null,
        itemCount: 1,
        decisionIds: ["approval:approval-ready"],
        issueIds: [],
        approvalIds: ["approval-ready"],
        updatedAt: "2026-05-07T14:00:00.000Z",
      },
    ],
    recentProgress: [
      {
        id: "activity-1",
        kind: "brand_os_applied",
        title: "Growth team created",
        summary: "DearMe created the team, cycles, and first brand work lanes.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "cycle:run-1",
        kind: "cycle_check_in",
        title: "Cycle check-in completed",
        summary: "Weekly content cycle checked in and kept the brand cycle moving.",
        createdAt: "2026-05-07T14:01:00.000Z",
      },
      {
        id: "spend:2026-05-07T14:02:00.000Z",
        kind: "spend_checkpoint",
        title: "Spend checkpoint recorded",
        summary: "DearMe recorded $2.37 of brand team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
        createdAt: "2026-05-07T14:02:00.000Z",
      },
    ],
    memory: {
      summary: "3 recent Voice & Memory sources are available. Latest: Voice sample.",
      sourceCount: 3,
      voiceSampleCount: 1,
      proofCount: 1,
      voiceProfile: {
        title: "Draft Voice Profile",
        status: "learning",
        sampleCount: 1,
        confidence: 55,
        guidance: "Voice Editor has one sample and can start drafting, but public output should stay under close review.",
        draftTone: ["Proof-first", "Plain language", "Direct", "Evidence-backed"],
        nextStep: "Add one more real sample to make voice review stronger before publishing or sending anything.",
      },
      sourcePlan: memorySourcePlanFixture(),
      sourceReviewQueue: [
        {
          id: "source-review:memory-2",
          sourceMemoryId: "memory-2",
          sourceInputMode: "link",
          sourceTitle: "Shipped proof",
          sourceLabel: "Build log",
          summary: "Private link saved for proof point: Shipped a working local product.",
          proposedKind: "proof_point",
          proposedTitle: "Shipped proof",
          proposedBody: "Shipped a working local product.",
          nextAction: "Review this proof point and save the fact once it is ready for future brand work.",
          createdAt: "2026-05-07T13:00:00.000Z",
        },
      ],
      latest: [
        {
          id: "memory-1",
          kind: "voice_sample",
          sourceInputMode: "paste",
          title: "Voice note",
          body: "Short, direct voice note.",
          bodyPreview: "Short, direct voice note.",
          sourceLabel: "Manual note",
          createdAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "memory-2",
          kind: "proof_point",
          sourceInputMode: "link",
          title: "Shipped proof",
          body: "Shipped a working local product.",
          bodyPreview: "Shipped a working local product.",
          sourceLabel: "Build log",
          createdAt: "2026-05-07T13:00:00.000Z",
        },
        {
          id: "memory-review-1",
          kind: "review_feedback",
          sourceInputMode: "paste",
          title: "Shorter proof-led drafts",
          body: "Keep future drafts shorter, proof-led, and direct before the next launch call.",
          bodyPreview: "Keep future drafts shorter, proof-led, and direct before the next launch call.",
          sourceLabel: "Last review",
          createdAt: "2026-05-07T12:30:00.000Z",
        },
      ],
      archived: [],
    },
    workStream: [
      {
        id: "decision:output:issue-2:content_drafts",
        kind: "decision_needed",
        cycleStage: "review",
        action: "review",
        role: "content_producer",
        title: "Your call: Review Starter posts",
        summary: "Three posts are ready for voice review.",
        customerSummary: "Three posts are ready for voice review.",
        artifact: "Content drafts",
        artifactTarget: "Content drafts",
        status: "decision_needed",
        needsApproval: true,
        decisionNeed: {
          needed: true,
          label: "Review needed",
          reason: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move stays behind your launch call.",
          riskGate: "publish_social",
        },
        sourceLabel: "Prepared output",
        costImpact: null,
        nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move stays behind your launch call.",
        relatedOutputId: "issue-2:content_drafts",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        approvalId: null,
        traceRefs: [
          { kind: "output", id: "issue-2:content_drafts", identifier: null },
          { kind: "issue", id: "issue-2", identifier: "PET-8" },
        ],
        createdAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: reviewLoopFixture("needs_user_review"),
      },
      {
        id: "work:issue-3:opportunity_drafts",
        kind: "work_in_motion",
        cycleStage: "work",
        action: "research",
        role: "opportunity_scout",
        title: "Opportunity Scout is working on Opportunity leads",
        summary: "Warm collaboration and customer leads are being prepared.",
        customerSummary: "Warm collaboration and customer leads are being prepared.",
        artifact: "Opportunity leads",
        artifactTarget: "Opportunity leads",
        status: "working",
        needsApproval: false,
        decisionNeed: {
          needed: false,
          label: null,
          reason: null,
          riskGate: null,
        },
        sourceLabel: "Prepared output",
        costImpact: null,
        nextAction: "Your team is preparing this work.",
        relatedOutputId: "issue-3:opportunity_drafts",
        issueId: "issue-3",
        issueIdentifier: "PET-9",
        approvalId: null,
        traceRefs: [
          { kind: "output", id: "issue-3:opportunity_drafts", identifier: null },
          { kind: "issue", id: "issue-3", identifier: "PET-9" },
        ],
        createdAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: reviewLoopFixture(),
      },
      {
        id: "work:issue-feedback",
        kind: "cycle_brief",
        cycleStage: "learn",
        action: "learn",
        role: "chief_of_staff",
        title: "Chief of Staff is turning feedback into the next pass",
        summary: "Chief of Staff accepted this feedback and is turning it into Voice & Memory learning, recovery work, and sharper next-cycle changes. Public moves wait for the launch call.",
        customerSummary: "Chief of Staff accepted this feedback and is turning it into Voice & Memory learning, recovery work, and sharper next-cycle changes. Public moves wait for the launch call.",
        artifact: "Feedback brief",
        artifactTarget: "Feedback brief",
        status: "working",
        needsApproval: false,
        decisionNeed: {
          needed: false,
          label: null,
          reason: null,
          riskGate: null,
        },
        sourceLabel: "Feedback brief",
        costImpact: null,
        nextAction: "Chief of Staff is turning this feedback into Voice & Memory learning, recovery work, and next-cycle changes before any public move.",
        relatedOutputId: null,
        issueId: "issue-feedback",
        issueIdentifier: "PET-12",
        approvalId: null,
        traceRefs: [
          { kind: "issue", id: "issue-feedback", identifier: "PET-12" },
        ],
        createdAt: "2026-05-07T14:00:30.000Z",
        reviewLoop: reviewLoopFixture(),
      },
      {
        id: "progress:activity-1",
        kind: "progress_recorded",
        cycleStage: "plan",
        action: "plan",
        role: "chief_of_staff",
        title: "Growth team created",
        summary: "DearMe created the team, cycles, and first brand work lanes.",
        customerSummary: "DearMe created the team, cycles, and first brand work lanes.",
        artifact: "Growth team",
        artifactTarget: "Growth team",
        status: "recorded",
        needsApproval: false,
        decisionNeed: {
          needed: false,
          label: null,
          reason: null,
          riskGate: null,
        },
        sourceLabel: "Brand team profile",
        costImpact: "Work stays inside paid-beta guardrails",
        nextAction: "Start or steer the first brand cycle from the Chief of Staff.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        traceRefs: [
          { kind: "activity", id: "activity-1", identifier: null },
        ],
        createdAt: "2026-05-07T14:00:00.000Z",
        reviewLoop: null,
      },
      {
        id: "progress:cycle:run-1",
        kind: "progress_recorded",
        cycleStage: "work",
        action: "report",
        role: "chief_of_staff",
        title: "Cycle check-in completed",
        summary: "Weekly content cycle checked in and kept the brand cycle moving.",
        customerSummary: "Weekly content cycle checked in and kept the brand cycle moving.",
        artifact: "Cycle check-in",
        artifactTarget: "Cycle check-in",
        status: "recorded",
        needsApproval: false,
        decisionNeed: {
          needed: false,
          label: null,
          reason: null,
          riskGate: null,
        },
        sourceLabel: "Cycle cadence",
        costImpact: null,
        nextAction: "Open prepared work only when a teammate asks for the launch call.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        traceRefs: [
          { kind: "activity", id: "cycle:run-1", identifier: null },
        ],
        createdAt: "2026-05-07T14:01:00.000Z",
        reviewLoop: null,
      },
      {
        id: "progress:spend:2026-05-07T14:02:00.000Z",
        kind: "progress_recorded",
        cycleStage: "work",
        action: "report",
        role: "growth_analyst",
        title: "Spend checkpoint recorded",
        summary: "DearMe recorded $2.37 of brand team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
        customerSummary: "DearMe recorded $2.37 of brand team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
        artifact: "Spend checkpoint",
        artifactTarget: "Spend checkpoint",
        status: "recorded",
        needsApproval: false,
        decisionNeed: {
          needed: false,
          label: null,
          reason: null,
          riskGate: null,
        },
        sourceLabel: "Spend guardrail",
        costImpact: "Private spend recorded",
        nextAction: "No action needed unless a future move asks to spend money.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        traceRefs: [
          { kind: "activity", id: "spend:2026-05-07T14:02:00.000Z", identifier: null },
        ],
        createdAt: "2026-05-07T14:02:00.000Z",
        reviewLoop: null,
      },
    ],
    runLedger: [
      {
        id: "ledger:decision:output:issue-2:content_drafts",
        kind: "needs_decision",
        role: "content_producer",
        title: "Your call: Review Starter posts",
        summary: "Three posts are ready for voice review.",
        evidenceLabel: "Prepared output / Content drafts",
        status: "decision_needed",
        needsApproval: true,
        nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move stays behind your launch call.",
        relatedOutputId: "issue-2:content_drafts",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        approvalId: null,
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "ledger:work:issue-3:opportunity_drafts",
        kind: "tried",
        role: "opportunity_scout",
        title: "Opportunity Scout is working on Opportunity leads",
        summary: "Warm collaboration and customer leads are being prepared.",
        evidenceLabel: "Prepared output / Opportunity leads",
        status: "working",
        needsApproval: false,
        nextAction: "Your team is preparing this work.",
        relatedOutputId: "issue-3:opportunity_drafts",
        issueId: "issue-3",
        issueIdentifier: "PET-9",
        approvalId: null,
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "ledger:progress:activity-1",
        kind: "prepared",
        role: "chief_of_staff",
        title: "Growth team created",
        summary: "DearMe created the team, cycles, and first brand work lanes.",
        evidenceLabel: "Brand team profile / Growth team: Work stays inside paid-beta guardrails",
        status: "recorded",
        needsApproval: false,
        nextAction: "Start or steer the first brand cycle from the Chief of Staff.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "ledger:memory:voice-sample",
        kind: "learned",
        role: "voice_editor",
        title: "Voice memory updated",
        summary: "Voice Editor learned from one new sample before preparing public-facing drafts.",
        evidenceLabel: "Voice & Memory / Voice & Memory",
        status: "recorded",
        needsApproval: false,
        nextAction: "Use this Voice & Memory signal to make the next brand cycle more accurate.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        createdAt: "2026-05-07T14:00:00.000Z",
      },
    ],
    report: {
      title: "Dear me report",
      summary: "The weekly report with completed work, decisions, and next bets.",
      status: "ready_for_review",
      outputId: "issue-1:weekly_report",
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      bodyPreview: "Completed work: refreshed positioning and prepared next bets.",
      accomplished: [
        "Cycle check-in completed: Weekly content cycle checked in and kept the brand cycle moving.",
        "Spend checkpoint recorded: DearMe recorded $2.37 of brand team work across 1 checkpoint.",
      ],
      decisions: ["Review Starter posts: Five posts are ready for voice review."],
      learnings: ["Voice sample added: Short, direct voice note."],
      nextBets: ["Content Producer is moving Content drafts forward."],
      updatedAt: "2026-05-07T14:00:00.000Z",
    },
    actionGraph: {
      summary: "DearMe projects the current growth cycle into a customer-safe graph of roles, work, artifacts, decisions, memory, and reports.",
      cycleNodeId: "cycle:weekly-growth-loop",
      nodes: [
        {
          id: "cycle:weekly-growth-loop",
          kind: "cycle",
          label: "Weekly growth cycle",
          summary: "Plan, work, review, learn, and report across 2 roles, 3 work lanes, and 1 decisions.",
          role: "chief_of_staff",
          status: "decisions_needed",
          source: "cycle",
          relatedOutputId: null,
          issueId: null,
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "role:content_producer",
          kind: "role",
          label: "Content Producer",
          summary: "Turning proof and point of view into reviewable content drafts.",
          role: "content_producer",
          status: "Working",
          source: "team",
          relatedOutputId: null,
          issueId: null,
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "work:issue-2:content_drafts",
          kind: "work_item",
          label: "Starter posts",
          summary: "Content Producer is shaping five drafts before review.",
          role: "content_producer",
          status: "ready_for_review",
          source: "work",
          relatedOutputId: "issue-2:content_drafts",
          issueId: "issue-2",
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "decision:output:issue-2:content_drafts",
          kind: "decision",
          label: "Review Starter posts",
          summary: "Three posts are ready for voice review.",
          role: "content_producer",
          status: "needed",
          source: "decision",
          relatedOutputId: "issue-2:content_drafts",
          issueId: "issue-2",
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "guardrail:batch:publish_social",
          kind: "guardrail",
          label: "Review content batch",
          summary: "External publishing stays gated until Peter approves the batch.",
          role: "chief_of_staff",
          status: "needs review",
          source: "guardrail",
          relatedOutputId: null,
          issueId: null,
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "artifact:issue-2:content_drafts",
          kind: "artifact",
          label: "Starter posts are ready",
          summary: "Three proof-backed posts are prepared for voice review.",
          role: "content_producer",
          status: "ready_for_review",
          source: "artifact",
          relatedOutputId: "issue-2:content_drafts",
          issueId: "issue-2",
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "memory:voice-sample",
          kind: "memory_signal",
          label: "Voice memory updated",
          summary: "Voice Editor learned from one new sample before preparing public-facing drafts.",
          role: "voice_editor",
          status: "learning",
          source: "memory",
          relatedOutputId: null,
          issueId: null,
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "report:issue-1:weekly_report",
          kind: "report",
          label: "Weekly Dear me report",
          summary: "The closing letter captures completed work, decisions, and next bets.",
          role: "growth_analyst",
          status: "ready_for_review",
          source: "report",
          relatedOutputId: "issue-1:weekly_report",
          issueId: "issue-1",
          approvalId: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      edges: [
        {
          id: "owns:role:content_producer->work:issue-2:content_drafts",
          kind: "owns",
          fromNodeId: "role:content_producer",
          toNodeId: "work:issue-2:content_drafts",
          label: "owns",
        },
        {
          id: "requires_decision:cycle:weekly-growth-loop->decision:output:issue-2:content_drafts",
          kind: "requires_decision",
          fromNodeId: "cycle:weekly-growth-loop",
          toNodeId: "decision:output:issue-2:content_drafts",
          label: "needs your decision",
        },
        {
          id: "blocks:guardrail:batch:publish_social->decision:output:issue-2:content_drafts",
          kind: "blocks",
          fromNodeId: "guardrail:batch:publish_social",
          toNodeId: "decision:output:issue-2:content_drafts",
          label: "collects decision",
        },
        {
          id: "produces:work:issue-2:content_drafts->artifact:issue-2:content_drafts",
          kind: "produces",
          fromNodeId: "work:issue-2:content_drafts",
          toNodeId: "artifact:issue-2:content_drafts",
          label: "produces prepared work",
        },
        {
          id: "reports:cycle:weekly-growth-loop->report:issue-1:weekly_report",
          kind: "reports",
          fromNodeId: "cycle:weekly-growth-loop",
          toNodeId: "report:issue-1:weekly_report",
          label: "reports progress",
        },
      ],
    },
    outputs: [],
  };
}

function workbenchResponseWithPacketReport(): DearMeWorkbenchResponse {
  const response = workbenchResponse();
  if (!response.report) {
    return response;
  }

  return {
    ...response,
    report: {
      ...response.report,
      summary:
        "DearMe prepared the report and content drafts from the same proof pack. Voice fit 97/100. Review once, then launch, revise, or regenerate.",
      bodyPreview: "Completed work: the same proof pack has a draft and report ready.",
      accomplished: [
        "Content draft and Dear me report came from the same proof pack.",
      ],
      decisions: ["Launch-ready next step: review once before public moves."],
      learnings: ["Voice fit 97/100 ready for review."],
      nextBets: ["Pick one launch move from the single review surface."],
    },
  };
}

function workbenchResponseWithPacketWorkbench(): DearMeWorkbenchResponse {
  const response = workbenchResponseWithPacketReport();
  const packetSummary =
    "DearMe prepared this draft, report, and decision from the same proof pack. Review the shared proof pack once before public moves.";
  const packetNextStep = "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move stays behind your launch call.";
  const packetLoop = reviewLoopFixture("needs_user_review", packetNextStep, {
    reviewHandoff: {
      action: "request_changes",
      title: "Shared packet handoff",
      summary: "The same proof pack carries the next revision.",
      userDirection: null,
      nextDraftDirection: "Revise the shared packet before the next launch call.",
    },
  });

  return {
    ...response,
    summary: "The same proof pack is ready across work, decisions, reports, and the live feed.",
    activeWork: [
      {
        ...response.activeWork[0]!,
        title: "Proof pack lane",
        summary: packetSummary,
        reviewLoop: packetLoop,
      },
      ...response.activeWork.slice(1),
    ],
    workReady: [
      {
        ...response.workReady[0]!,
        title: "Shared packet report",
        summary: packetSummary,
        reviewLoop: packetLoop,
      },
      ...response.workReady.slice(1),
    ],
    decisionsNeeded: [
      {
        ...response.decisionsNeeded[0]!,
        title: "Shared packet launch call",
        summary: packetSummary,
        reviewLoop: packetLoop,
      },
      ...response.decisionsNeeded.slice(1),
    ],
    batchDecisions: [
      {
        ...response.batchDecisions[0]!,
        title: "Shared packet batch",
        summary: packetSummary,
        actionLabel: "Review shared packet",
      },
      ...response.batchDecisions.slice(1),
    ],
    workStream: [
      {
        ...response.workStream[0]!,
        title: "Shared packet ready",
        summary: packetSummary,
        artifact: "Proof pack",
        sourceLabel: "Proof pack",
        costImpact: "Shared proof pack prepared",
        nextAction: packetNextStep,
        reviewLoop: packetLoop,
      },
      ...response.workStream.slice(1),
    ],
    runLedger: [
      {
        ...response.runLedger[0]!,
        title: "Shared packet run",
        summary: packetSummary,
        evidenceLabel: "Proof pack / Shared proof pack report",
        nextAction: packetNextStep,
      },
      ...response.runLedger.slice(1),
    ],
    actionGraph: {
      ...response.actionGraph,
      nodes: response.actionGraph.nodes.map((node, index) => (
        index === 0
          ? {
              ...node,
              label: "Shared packet cycle",
              summary: packetSummary,
            }
          : node
      )),
      edges: response.actionGraph.edges.map((edge, index) => (
        index === 0 ? { ...edge, label: "shared packet link" } : edge
      )),
    },
  };
}

type DearMeDeliveryStatus = "delivered" | "needs_channel_connection" | "pending" | "rejected" | "errored";

function workbenchResponseWithDeliveryReceipt(
  deliveryStatus: DearMeDeliveryStatus,
  title: string,
  summary: string,
  nextStep: string,
  deliveryExternalId?: string,
  deliveryExternalUrl?: string,
): DearMeWorkbenchResponse {
  const response = workbenchResponse();
  response.recentProgress = [
    {
      id: "activity-delivery",
      kind: "next_move_delivery_recorded",
      title,
      summary,
      outputKind: "content_drafts",
      outputId: "issue-2:content_drafts",
      riskGate: "publish_social",
      approvalId: "approval-publish",
      issueId: "issue-2",
      issueIdentifier: "PET-8",
      deliveryStatus,
      deliveryExternalId,
      deliveryExternalUrl,
      nextStep,
      createdAt: "2026-05-07T14:06:00.000Z",
    },
    ...response.recentProgress,
  ];
  return response;
}

function workbenchResponseWithChiefBrief() {
  const response = workbenchResponse();
  const chiefUpdatedAt = "2026-05-07T16:30:00.000Z";
  const chiefSummary =
    "Chief of Staff accepted this private brief and is turning it into the next launch-ready move. Public moves wait for the launch call.";
  const roleNodes = [
    ["role:chief_of_staff", "Chief of Staff", "Coordinating today's brand growth plan and the next decisions."],
    ["role:brand_strategist", "Brand Strategist", "Keeping positioning, audience, proof, and offers aligned."],
    ["role:voice_editor", "Voice Editor", "Checking that drafts sound like the user before review."],
    ["role:opportunity_scout", "Opportunity Scout", "Looking for relevant leads, collaborations, and outreach angles."],
    ["role:portfolio_builder", "Portfolio Builder", "Preparing portfolio and proof-card updates for review."],
    ["role:growth_analyst", "Growth Analyst", "Summarizing progress, signals, decisions, and next bets."],
  ].map(([id, label, summary]) => ({
    id,
    kind: "role",
    label,
    summary,
    role: id.replace("role:", ""),
    status: "Working",
    source: "team",
    relatedOutputId: null,
    issueId: null,
    approvalId: null,
    updatedAt: chiefUpdatedAt,
  }));

  return {
    ...response,
    activeWork: [
      {
        id: "issue-chief-1",
        title: "Chief of Staff brief: Plan next moves - Launch positioning changed",
        summary: chiefSummary,
        status: "queued",
        ownerRole: "chief_of_staff",
        outputKind: null,
        issueId: "issue-chief-1",
        issueIdentifier: "PET-22",
        updatedAt: chiefUpdatedAt,
        reviewLoop: reviewLoopFixture(),
      },
      ...response.activeWork,
    ],
    workStream: [
      {
        id: "work:issue-chief-1",
        kind: "cycle_brief",
        cycleStage: "plan",
        role: "chief_of_staff",
        title: "Chief of Staff is turning your brief into brand work",
        summary: chiefSummary,
        artifact: "Cycle brief",
        status: "working",
        needsApproval: false,
        sourceLabel: "Chief of Staff brief",
        costImpact: null,
        nextAction: "Your team is preparing this work.",
        relatedOutputId: null,
        issueId: "issue-chief-1",
        issueIdentifier: "PET-22",
        approvalId: null,
        createdAt: chiefUpdatedAt,
        reviewLoop: reviewLoopFixture(),
      },
      ...response.workStream,
    ],
    runLedger: [
      {
        id: "ledger:work:issue-chief-1",
        kind: "tried",
        role: "chief_of_staff",
        title: "Chief of Staff is turning your brief into brand work",
        summary: chiefSummary,
        evidenceLabel: "Chief of Staff brief / Cycle brief",
        status: "working",
        needsApproval: false,
        nextAction: "Your team is preparing this work.",
        relatedOutputId: null,
        issueId: "issue-chief-1",
        issueIdentifier: "PET-22",
        approvalId: null,
        createdAt: chiefUpdatedAt,
      },
      ...response.runLedger,
    ],
    actionGraph: {
      ...response.actionGraph,
      nodes: [
        ...roleNodes,
        {
          id: "work:issue-chief-1",
          kind: "work_item",
          label: "Chief of Staff brief: Plan next moves - Launch positioning changed",
          summary: chiefSummary,
          role: "chief_of_staff",
          status: "queued",
          source: "work",
          relatedOutputId: null,
          issueId: "issue-chief-1",
          approvalId: null,
          updatedAt: chiefUpdatedAt,
        },
        ...response.actionGraph.nodes,
      ],
      edges: [
        {
          id: "owns:role:chief_of_staff->work:issue-chief-1",
          kind: "owns",
          fromNodeId: "role:chief_of_staff",
          toNodeId: "work:issue-chief-1",
          label: "owns",
        },
        ...response.actionGraph.edges,
      ],
    },
  };
}

function outputsResponse(overrides: {
  reviewLoop?: DearMeOutputReviewLoop;
} = {}) {
  return {
    companyId: "company-1",
    outputs: [
      {
        id: "issue-1:weekly_report",
        companyId: "company-1",
        kind: "weekly_report",
        title: "Dear me report",
      summary: "The weekly report with completed work, decisions, and next bets.",
        status: "ready_for_review",
        isReviewable: true,
        issueId: "issue-1",
        issueIdentifier: "PET-7",
        issueTitle: "DearMe Draft: Draft weekly Dear me report",
        updatedAt: "2026-05-07T14:00:00.000Z",
        documents: [
          {
            id: "doc-1",
            key: "dear-me-report",
            title: "Dear me report",
            format: "markdown",
            revisionNumber: 4,
            bodyPreview: "Completed work: refreshed positioning and prepared next bets.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        workProducts: [
          {
            id: "work-product-weekly-report",
            type: "report",
            title: "Weekly report voice check",
            url: null,
            status: "ready_for_review",
            reviewState: "pending",
            summary: "Dear me report passed the voice check before review.",
            voiceGate: weeklyReportVoiceGate(),
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        latestUpdate: null,
        reviewLoop: overrides.reviewLoop ?? reviewLoopFixture("needs_user_review"),
        details: [
          {
            kind: "completed_work",
            label: "Completed work",
            value: "Refreshed positioning and prepared next bets.",
            source: "document",
          },
          {
            kind: "decisions_needed",
            label: "Decisions needed",
            value: "Review one public claim before publishing.",
            source: "derived",
          },
        ],
        sourceEvidence: [
          {
            kind: "proof",
            label: "Proof used",
            summary: "Refreshed positioning and prepared next bets.",
            source: "document",
          },
          {
            kind: "approval_boundary",
            label: "Launch boundary",
            summary: "Review one public claim before publishing.",
            source: "derived",
          },
          {
            kind: "private_reference",
            label: "Proof references",
            summary: "1 proof reference used for this review.",
            source: "document",
          },
        ],
      },
    ],
  };
}

function outputsWithOpportunityDraft() {
  const reportOutput = outputsResponse().outputs[0];
  return {
    companyId: "company-1",
    outputs: [
      reportOutput,
      {
        ...reportOutput,
        id: "issue-3:opportunity_drafts",
        kind: "opportunity_drafts",
        title: "Warm collaboration lead",
        summary: "A relevant podcast host and customer intro are prepared for review.",
        issueId: "issue-3",
        issueIdentifier: "PET-9",
        issueTitle: "DearMe Draft: Prepare opportunity leads",
        documents: [
          {
            id: "doc-3",
            key: "opportunity-leads",
            title: "Opportunity leads",
            format: "markdown",
            revisionNumber: 1,
            bodyPreview:
              "Target: Practical AI Builders podcast. Verification status: pending. Contact record: bookings@practicalaibuilders.example · https://practicalaibuilders.example/podcast. Source signal: Guest submission page publishes a dedicated booking inbox and intake form. First message: Saw your workflow episode and have a concrete follow-up.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        workProducts: [
          {
            id: "work-product-opportunity",
            type: "draft",
            title: "Opportunity packet",
            url: null,
            status: "ready_for_review",
            reviewState: "pending",
            summary: "Target, fit reason, outreach angle, and first message are staged behind the launch call.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        details: [
          {
            kind: "target",
            label: "Target",
            value: "Practical AI Builders podcast",
            source: "document",
          },
          {
            kind: "verification_status",
            label: "Verification status",
            value: "pending",
            source: "document",
          },
          {
            kind: "contact_record",
            label: "Contact record",
            value: "bookings@practicalaibuilders.example · https://practicalaibuilders.example/podcast",
            source: "document",
          },
          {
            kind: "source_signal",
            label: "Source signal",
            value: "Guest submission page publishes a dedicated booking inbox and intake form.",
            source: "document",
          },
          {
            kind: "why_relevant",
            label: "Fit reason",
            value: "Audience matches Peter's proof and current positioning.",
            source: "document",
          },
          {
            kind: "outreach_angle",
            label: "Outreach angle",
            value: "Share a local AI operator story with one useful takeaway.",
            source: "document",
          },
          {
            kind: "draft_message",
            label: "First message",
            value: "Saw your workflow episode and have a concrete follow-up.",
            source: "document",
          },
          {
            kind: "approval_gate",
            label: "Approval gate",
            value: "send_email",
            source: "derived",
          },
        ],
        sourceEvidence: [
          {
            kind: "proof",
            label: "Proof used",
            summary: "Shipped a working local product.",
            source: "document",
          },
          {
            kind: "approval_boundary",
            label: "Launch boundary",
            summary: "Outbound sends stay behind Peter's launch call for the target, angle, and draft.",
            source: "derived",
          },
        ],
      },
    ],
  };
}

function outputsWithFirstCyclePacket() {
  const reportOutput = outputsResponse().outputs[0];
  return {
    companyId: "company-1",
    outputs: [
      {
        ...reportOutput,
        workProducts: [
          {
            id: "work-product-report",
            type: "report",
            title: "Dear me report packet",
            url: null,
            status: "ready_for_review",
            reviewState: "pending",
            summary: "Report prepared from the same cycle packet, including decisions and next bets.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
      },
      {
        ...reportOutput,
        id: "issue-2:content_drafts",
        kind: "content_drafts",
        title: "Starter post batch",
        summary: "A proof-backed starter draft is ready for review.",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        issueTitle: "DearMe Draft: Prepare starter posts",
        documents: [
          {
            id: "doc-2",
            key: "content-drafts",
            title: "Content drafts",
            format: "markdown",
            revisionNumber: 2,
            bodyPreview: "Voice fit score: 95. Cycle packet: starter post from proof.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        workProducts: [
          {
            id: "work-product-content",
            type: "draft",
            title: "Cycle content packet",
            url: null,
            status: "ready_for_review",
            reviewState: "pending",
            summary: "Starter post draft prepared from the cycle packet with voice fit 95.",
            voiceGate: contentDraftVoiceGate(),
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        details: [
          {
            kind: "draft_body",
            label: "Draft body",
            value: "Starter post from proof.",
            source: "document",
          },
        ],
        sourceEvidence: [
          {
            kind: "proof",
            label: "Proof used",
            summary: "Proof from the first cycle.",
            source: "document",
          },
        ],
      },
    ],
  };
}

function outputsWithScannableFirstWeekDetails() {
  const reportOutput = outputsResponse().outputs[0];
  return {
    companyId: "company-1",
    outputs: [
      {
        ...reportOutput,
        id: "issue-2:content_drafts",
        kind: "content_drafts",
        title: "LinkedIn starter post",
        summary: "A first private post grounded in shipped proof.",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        issueTitle: "DearMe Draft: Starter content batch",
        documents: [
          {
            id: "doc-content-1",
            key: "linkedin-starter-post",
            title: "LinkedIn starter post",
            format: "markdown",
            revisionNumber: 1,
            bodyPreview: "Draft body: I turned a messy private tool loop into a working product rhythm.",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        details: [
          {
            kind: "approval_gate",
            label: "Launch boundary",
            value: "Approve before publishing.",
            source: "derived",
          },
          {
            kind: "proof_used",
            label: "Proof used",
            value: "Shipped a working local product.",
            source: "document",
          },
          {
            kind: "draft_body",
            label: "Draft body",
            value: "I turned a messy private tool loop into a working product rhythm.",
            source: "document",
          },
          {
            kind: "channel",
            label: "Channel",
            value: "LinkedIn",
            source: "document",
          },
          {
            kind: "audience",
            label: "Audience",
            value: "Founder-operators",
            source: "document",
          },
          {
            kind: "hook",
            label: "Hook",
            value: "The clearest operator stories start with shipped proof.",
            source: "document",
          },
        ],
      },
    ],
  };
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  valueSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function buttonByText(container: HTMLElement, text: string) {
  return [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

async function openFullProfileControls(container: HTMLElement) {
  const button = buttonByText(container, "Open full profile controls");
  if (!button) throw new Error("Expected full profile controls disclosure to exist.");

  await act(async () => {
    button.click();
  });
  await flushReact();
}

function buttonByLabel(container: HTMLElement, label: string) {
  return [...container.querySelectorAll("button")].find((button) =>
    button.getAttribute("aria-label") === label,
  ) as HTMLButtonElement | undefined;
}

function linkByText(container: HTMLElement, text: string) {
  return [...container.querySelectorAll("a")].find((link) =>
    link.textContent?.includes(text),
  ) as HTMLAnchorElement | undefined;
}

function surfaceByLabel(container: HTMLElement, label: string) {
  const surface =
    [...container.querySelectorAll<HTMLElement>("[aria-label]")].find(
      (node) => node.getAttribute("aria-label") === label,
    ) ?? null;
  if (!surface) {
    const availableLabels = [...container.querySelectorAll("[aria-label]")]
      .map((node) => node.getAttribute("aria-label"))
      .filter(Boolean)
      .join(", ");
    throw new Error(`Expected surface "${label}" to exist. Available labels: ${availableLabels}`);
  }
  return surface as HTMLElement;
}

function expectSurfacesInOrder(container: HTMLElement, labels: string[]) {
  const surfaces = labels.map((label) => surfaceByLabel(container, label));

  surfaces.slice(0, -1).forEach((surface, index) => {
    const nextSurface = surfaces[index + 1];
    expect(
      Boolean(surface.compareDocumentPosition(nextSurface) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });
}

function focusedCardsInSurface(container: HTMLElement, label: string) {
  return [
    ...surfaceByLabel(container, label).querySelectorAll('[data-dearme-card-focused="true"]'),
  ] as HTMLElement[];
}

function expectMobileSafeFocusedDecision(surface: HTMLElement, actionGroupName: string) {
  expect(surface.className).toContain("pb-24");
  expect(surface.className).toContain("sm:pb-5");

  const actionGroup = surface.querySelector(
    `[data-dearme-mobile-action-group="${actionGroupName}"]`,
  ) as HTMLElement | null;
  expect(actionGroup).not.toBeNull();
  expect(actionGroup?.className).toContain("grid");

  const actionButtons = [...(actionGroup?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];
  expect(actionButtons.length).toBeGreaterThan(1);
  actionButtons.forEach((button) => {
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("min-w-0");
    expect(button.className).toContain("whitespace-normal");
    expect(button.className).toContain("h-auto");
  });
}

describe("DearMeOnboarding", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockCompanyContext.companies = [
      {
        id: "company-1",
        issuePrefix: "PET",
        name: "Peter Studio",
        status: "active",
      },
    ];
    mockCompanyContext.selectedCompanyId = "company-1";
    mockCompanyContext.selectedCompany = { id: "company-1", issuePrefix: "PET", name: "Peter Studio" };
    FakeDearMeEventSource.instances = [];
    mockDearmeApi.getWorkbench.mockResolvedValue(workbenchResponse());
    mockDearmeApi.openWorkbenchEvents.mockImplementation(
      () => new FakeDearMeEventSource() as unknown as EventSource,
    );
    mockDearmeApi.getOutputs.mockResolvedValue({
      companyId: "company-1",
      outputs: [],
    });
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("trial"));
    mockDearmeApi.getPaidBetaCohort.mockResolvedValue(paidBetaCohortSummary());
    mockDearmeApi.sendChiefOfStaffMessage.mockImplementation((_companyId, input) =>
      Promise.resolve({
        companyId: "company-1",
        status: "queued",
        issueId: "issue-chief-1",
        issueIdentifier: "PET-22",
        title: input.intent === "handle_feedback"
          ? "DearMe: Handle feedback - First report felt generic"
          : "DearMe: Plan next moves - Launch positioning changed",
        nextStep: input.intent === "handle_feedback"
          ? "Chief of Staff has the feedback brief and will turn it into Voice & Memory learning, recovery work, and next-cycle changes before any public move."
          : "Chief of Staff has the brief and will prepare the next private move for review.",
      }),
    );
    mockDearmeApi.recordMemoryUpdate.mockResolvedValue({
      companyId: "company-1",
      status: "recorded",
      memory: {
        id: "memory-3",
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Fresh voice note",
        body: "Fresh direct voice note from today's work.",
        bodyPreview: "Fresh direct voice note from today's work.",
        sourceLabel: null,
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 3,
      },
    });
    mockDearmeApi.updateMemorySource.mockResolvedValue({
      companyId: "company-1",
      status: "recorded",
      memory: {
        id: "memory-1",
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Voice note",
        body: "Short, direct revised voice note.",
        bodyPreview: "Short, direct revised voice note.",
        sourceLabel: "Manual note",
        createdAt: "2026-05-07T14:06:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 2,
      },
    });
    mockDearmeApi.archiveMemorySource.mockResolvedValue({
      companyId: "company-1",
      status: "archived",
      memoryId: "memory-1",
      archivedAt: "2026-05-07T14:07:00.000Z",
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 1,
      },
    });
    mockDearmeApi.restoreMemorySource.mockResolvedValue({
      companyId: "company-1",
      status: "recorded",
      memory: {
        id: "memory-1",
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Voice note",
        body: "Short, direct voice note.",
        bodyPreview: "Short, direct voice note.",
        sourceLabel: "Manual note",
        createdAt: "2026-05-07T14:08:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 2,
      },
    });
    mockDearmeApi.recordPaidBetaPayment.mockResolvedValue({
      event: { id: "finance-event-1", amountCents: 25_000, currency: "USD" },
      access: paidBetaStatus("active"),
    });
    mockDearmeApi.previewFirstCycle.mockResolvedValue(createFirstCyclePreview());
    mockDearmeApi.startFirstCycle.mockResolvedValue(createFirstCyclePreview());
    mockDearmeApi.previewBrandBlueprint.mockResolvedValue(createPreview());
    mockDearmeApi.createBrandBlueprintApplyRequest.mockResolvedValue({
      ...createPreview(),
      status: "apply_request",
      approval: { id: "approval-1", status: "pending" },
    });
    mockDearmeApi.reviewOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-2",
        bodyPreview: "DearMe decision: regenerate this prepared work before review.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: {
        ...outputsResponse().outputs[0],
        reviewLoop: reviewLoopFixture(
          "regeneration_requested",
          "Your team has your direction and should prepare another version.",
          {
            attemptCount: 1,
            lastAction: "regenerate",
            lastDecisionAt: "2026-05-07T14:05:00.000Z",
            lastDecisionNotePreview: "Make it sharper before review.",
          },
        ),
      },
    });
    mockDearmeApi.continueOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-2",
        bodyPreview: "DearMe decision: prepare another pass before review.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: {
        ...outputsResponse().outputs[0],
        reviewLoop: reviewLoopFixture(
          "regeneration_requested",
          "Your team has your direction and should prepare another version.",
          {
            attemptCount: 1,
            lastAction: "regenerate",
            lastDecisionAt: "2026-05-07T14:05:00.000Z",
            lastDecisionNotePreview: "Make it sharper before review.",
          },
        ),
      },
    });
    mockApprovalsApi.approve.mockResolvedValue({
      id: "approval-ready",
      companyId: "company-1",
      status: "approved",
    });
    mockApprovalsApi.reject.mockResolvedValue({
      id: "approval-ready",
      companyId: "company-1",
      status: "rejected",
    });
    mockApprovalsApi.requestRevision.mockResolvedValue({
      id: "approval-ready",
      companyId: "company-1",
      status: "revision_requested",
    });
    mockLocation.pathname = "/PET/dearme";
    mockLocation.search = "?view=brand-os";
    mockLocation.hash = "";
  });

  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("asks for a DearMe profile before loading the team surface", async () => {
    mockCompanyContext.selectedCompanyId = null;
    mockCompanyContext.selectedCompany = null;
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Choose a DearMe profile first.");
    expect(container.textContent).not.toContain("Select a company first.");
    expect(mockDearmeApi.getWorkbench).not.toHaveBeenCalled();
    expect(mockDearmeApi.getOutputs).not.toHaveBeenCalled();
    expect(mockDearmeApi.getPaidBetaAccess).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("renders named skeleton loaders while the workroom and Decisions panel are loading", async () => {
    mockDearmeApi.getWorkbench.mockReturnValue(new Promise(() => {}));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.querySelector('[data-testid="dearme-workbench-loading-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dearme-decisions-loading-skeleton"]')).not.toBeNull();
    expect(surfaceByLabel(container, "Decisions loading")).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it("renders a named skeleton while the first-cycle preview is being prepared", async () => {
    mockDearmeApi.previewFirstCycle.mockReturnValue(new Promise(() => {}));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const intentInput = surfaceByLabel(container, "90-second first cycle").querySelector(
      "#dearme-first-cycle-intent",
    ) as HTMLTextAreaElement;
    await act(async () => {
      setTextareaValue(intentInput, "Known for shipping practical AI workflows from real customer support work.");
    });

    await act(async () => {
      buttonByText(container, "Preview first cycle")?.click();
    });
    await flushReact();

    expect(container.querySelector('[data-testid="dearme-first-cycle-preview-skeleton"]')).not.toBeNull();
    expect(surfaceByLabel(container, "First-cycle preview loading").textContent).toContain(
      "Preparing first-cycle preview",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("uses the default route as a public first-run landing before the dense team surface", async () => {
    mockLocation.pathname = "/DEAA/dearme";
    mockLocation.search = "";
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("DearMe grows your personal brand while you work.");
    expect(container.textContent).toContain(
      "It runs research, drafts, opportunities, proof, and weekly direction, then brings you the launch calls that need your judgment.",
    );
    expect(container.textContent).toContain("What do you want to be known for?");
    expect(container.textContent).toContain("Start my first proof pack");
    expect(container.textContent).toContain("One sentence starts the cycle without a tour.");
    expect(container.textContent).toContain("Ready when you are");
    expect(container.textContent).toContain("Studying the outcome you want people to remember.");
    expect(container.textContent).toContain("Watch the team work live");
    expect(container.textContent).toContain("Studying your voice");
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("5 starter drafts");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain(
      "The team keeps preparing work; public moves stay behind your launch call.",
    );
    expect(container.querySelector('[aria-label="Public launch proof summary"]')).not.toBeNull();
    expect(container.textContent).toContain(
      "Public launch is one final call on route, recipient, and move.",
    );
    expect(container.textContent).toContain(
      "DearMe can prepare the proof now. Anything public stays behind your launch call.",
    );
    expect(container.textContent).toContain("Professional route");
    expect(container.textContent).toContain("Selected recipient");
    expect(container.textContent).toContain("Phone-message proof");
    expect(container.textContent).toContain("Review launch details");
    expect(container.textContent).not.toContain("LinkedIn partner messages endpoint");
    expect(container.textContent).toContain("Watch DearMe prepare brand work live");
    expect(container.textContent).toContain("5 work receipts");
    expect(container.textContent).toContain("5 opportunity leads");
    expect(container.textContent).toContain("Autopilot until launch");
    expect(container.textContent).not.toContain("0 public actions without approval");
    expect(container.textContent).not.toContain("Nothing launches without approval");
    expect(container.textContent).toContain("Your workroom opens with");
    expect(container.textContent).toContain("What moved while you were away");
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("Prepared but blocked");
    expect(container.textContent).toContain("Next proof cycle");
    expect(container.textContent).toContain("First-cycle report");
    expect(container.textContent).toContain("First value report");
    expect(container.textContent).toContain("Reviewable assets prepared");
    expect(container.textContent).toContain("5 drafts + 1 proof card");
    expect(container.querySelector('[aria-label="First-cycle value report"]')).not.toBeNull();
    expect(container.textContent).toContain("Proof pack");
    expect(container.textContent).toContain("DearMe keeps working");
    expect(container.querySelector('[aria-label="DearMe public first run"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Live proof receipts"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="First proof pack"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="First-run workroom queues"]')).not.toBeNull();
    expectNoHiddenProductTerms(container.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expect(container.textContent).not.toContain("Today's brand team focus");
    expect(container.textContent).not.toContain("90-second first cycle");
    expect(mockDearmeApi.getWorkbench).not.toHaveBeenCalled();
    expect(mockDearmeApi.getOutputs).not.toHaveBeenCalled();

    await act(async () => {
      buttonByText(container, "Review launch details")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions");

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLInputElement,
        "Known for turning operator work into trusted public proof",
      );
    });

    expect(container.textContent).toContain("Preparing from your sentence");
    expect(container.textContent).toContain("Studying the outcome you want people to remember.");

    await act(async () => {
      buttonByText(container, "Start my first proof pack")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.startFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          positioning: "Known for turning operator work into trusted public proof",
        }),
      }),
    );
    expect(container.textContent).toContain("90-second first cycle");
    expect(container.textContent).toContain("Today's operating focus");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps the content view on the public first-run landing path", async () => {
    mockLocation.pathname = "/DEAA/dearme";
    mockLocation.search = "?view=content";
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.querySelector('[aria-label="DearMe public first run"]')).not.toBeNull();
    expect(container.textContent).toContain("What do you want to be known for?");
    expect(container.textContent).toContain("Start my first proof pack");
    expect(mockDearmeApi.getWorkbench).not.toHaveBeenCalled();
    expect(mockDearmeApi.getOutputs).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("previews a full profile and creates an approval request", async () => {
    mockLocation.search = "?view=brand-os";
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(mockDearmeApi.getWorkbench).toHaveBeenCalledWith("company-1");
    expect(container.textContent).toContain("Brand team profile");
    expect(container.textContent).toContain("DearMe grows your personal brand while you work.");
    expect(container.textContent).toContain("Dear me, your brand team worked while you were away");
    expect(container.textContent).toContain("Team working");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain("DearMe keeps the brand cycle moving: drafts, reports, opportunities");
    expect(container.textContent).toContain("Public posts, outbound messages, spend, and page changes become launch calls under your rules.");
    expect(container.textContent).toContain("Ready for your review");
    expect(container.textContent).toContain("Today's operating focus");
    expect(container.textContent).toContain("It shows the work it did and brings you only the launch calls that matter.");
    expect(container.textContent).toContain("Today's brand cycle");
    expect(container.textContent).toContain("Next decision");
    expect(container.textContent).toContain("Teammate focus");
    expect(container.textContent).toContain("Open next decision");
    expect(buttonByText(container, "Start with one sentence")?.getAttribute("data-variant")).toBe("default");
    expect(buttonByText(container, "View proof")?.getAttribute("data-variant")).toBe("outline");
    expect(buttonByText(container, "Open full profile controls")?.getAttribute("data-variant")).toBe("outline");
    expect(readDearMeFirstCyclePreview("company-1", "maya-chen")).toBeNull();
    await act(async () => {
      buttonByText(container, "View proof")?.click();
    });
    expect(readDearMeFirstCyclePreview("company-1", "maya-chen")).not.toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/dearme/site-preview/maya-chen");
    mockNavigate.mockClear();
    expect(buttonByText(container, "Open full profile controls")?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[data-dearme-profile-controls="collapsed"]')).not.toBeNull();
    expect(container.querySelector("#dearme-display-name")).toBeNull();
    expect(buttonByText(container, "Preview profile")).toBeUndefined();
    expect(buttonByText(container, "Start brand team")).toBeUndefined();
    expect(container.textContent).toContain("The first brand cycle can run from the sentence above.");
    await openFullProfileControls(container);
    expect(buttonByText(container, "Hide full profile controls")?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-dearme-profile-controls="open"]')).not.toBeNull();
    expect(buttonByText(container, "Preview profile")?.getAttribute("data-variant")).toBe("outline");
    expect(buttonByText(container, "Start brand team")?.getAttribute("data-variant")).toBe("secondary");
    expect(container.textContent).toContain("Full profile controls");
    expect(container.textContent).not.toContain("Preview Brand OS");
    expect(container.textContent).not.toContain("Start Brand OS");
    const topFocus = surfaceByLabel(container, "Today's brand team focus");
    expect(topFocus.textContent).toContain("Today's brand cycle");
    const returnHandoff = surfaceByLabel(topFocus, "When you come back");
    expect(returnHandoff.textContent).toContain("When you come back");
    expect(returnHandoff.textContent).toContain("What moved");
    expect(returnHandoff.textContent).toContain("What needs you");
    expect(returnHandoff.textContent).toContain("What continues");
    expect(returnHandoff.textContent).toContain("Proof saved");
    expect(returnHandoff.textContent).toContain("launch call");
    expect(returnHandoff.textContent).toContain("brand lane");
    expectNoHiddenProductTerms(returnHandoff.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const reviewPath = surfaceByLabel(topFocus, "Today's review path");
    expect(topFocus.textContent).toContain("Ready from the cycle");
    expect(topFocus.textContent).toContain("Launch call");
    expect(topFocus.textContent).toContain("Autonomous lane");
    expect(reviewPath.textContent).toContain("4 calls");
    expect(reviewPath.textContent).toContain("Brand work moving");
    expect(topFocus.textContent).toContain("Next decision");
    expect(topFocus.textContent).toContain("Open next decision");
    expect(topFocus.textContent).toContain("Start with one sentence");
    expect(topFocus.textContent).not.toContain("Live team pulse");
    expectSurfacesInOrder(container, ["First payoff", "90-second first cycle", "Today's brand team focus"]);
    const firstPayoff = surfaceByLabel(container, "First payoff");
    expect(firstPayoff.getAttribute("data-dearme-surface")).toBe("focus-surface");
    expect(firstPayoff.querySelectorAll('[data-dearme-surface="workbench-card"]').length).toBe(3);
    expect(firstPayoff.textContent).toContain("One sentence starts your brand cycle.");
    expect(firstPayoff.textContent).toContain("One sentence starts the cycle without a tour.");
    expect(firstPayoff.textContent).toContain(
      "Voice Profile, starter posts, one opportunity, proof card, first plan",
    );
    expect(firstPayoff.textContent).toContain("One launch call before anything public or external");
    expect(firstPayoff.textContent).toContain("Launch, revise, or redirect the team from one place.");
    expect(firstPayoff.textContent).toContain("Start with one sentence");
    expect(container.textContent).toContain("See the first five minutes before you start.");
    expect(container.querySelector('[aria-label="First five minutes progress"]')).not.toBeNull();
    expect(container.textContent).toContain("Studying your voice");
    expect(container.textContent).toContain("Finding likely audiences");
    expect(container.textContent).toContain("Drafting first moves");
    expect(container.textContent).toContain("Preparing your proof page");
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("Your brand team today");
    expect(container.textContent).toContain("Dear me, your team has decisions ready");
    expect(container.textContent).toContain("Team operating policy");
    expect(container.textContent).toContain("The team can continue, and external moves stay behind your call.");
    const launchReadiness = surfaceByLabel(container, "Launch readiness");
    expect(launchReadiness.textContent).toContain("Brand cycle runs; public launch follows your rules.");
    expect(launchReadiness.textContent).toContain("Brand cycle");
    expect(launchReadiness.textContent).toContain("Usable now");
    expect(launchReadiness.textContent).toContain("Public launch");
    expect(launchReadiness.textContent).toContain("Not ready yet");
    expect(launchReadiness.textContent).toContain("live channel receipts plus your launch call");
    expect(launchReadiness.textContent).toContain("Next best step");
    expect(launchReadiness.textContent).toContain("Review call");
    expect(launchReadiness.textContent).toContain("Download receipt");
    const launchReadinessNote = surfaceByLabel(
      launchReadiness,
      "Launch readiness receipt note",
    ) as HTMLTextAreaElement;
    expect(launchReadinessNote.value).toContain("DearMe launch readiness receipt");
    expect(launchReadinessNote.value).toContain("Status: Private brand cycle can run");
    expect(launchReadinessNote.value).toContain("Waiting launch calls: 4");
    expect(launchReadinessNote.value).toContain("Can keep moving now: private drafts");
    expect(launchReadinessNote.value).toContain("Must wait: public posts");
    expectNoHiddenProductTerms(launchReadiness.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const commercialReadiness = surfaceByLabel(container, "Commercial readiness");
    expect(commercialReadiness.textContent).toContain("Private beta can be sold; public launch still needs proof.");
    expect(commercialReadiness.textContent).toContain("Paid user operating");
    expect(commercialReadiness.textContent).toContain("Private beta sale");
    expect(commercialReadiness.textContent).toContain("Paid user active");
    expect(commercialReadiness.textContent).toContain("Paid user support");
    expect(commercialReadiness.textContent).toContain("Operating");
    expect(commercialReadiness.textContent).toContain("Public launch proof");
    expect(commercialReadiness.textContent).toContain("Receipts needed");
    expect(commercialReadiness.textContent).toContain("Download receipt");
    const commercialReadinessNote = surfaceByLabel(
      commercialReadiness,
      "Commercial readiness receipt note",
    ) as HTMLTextAreaElement;
    expect(commercialReadinessNote.value).toContain("DearMe commercial readiness receipt");
    expect(commercialReadinessNote.value).toContain("Status: Paid private beta operating");
    expect(commercialReadinessNote.value).toContain("Can sell now: private beta");
    expect(commercialReadinessNote.value).toContain("Cannot claim yet: broad public launch");
    expect(commercialReadinessNote.value).toContain("Next support step: Keep operating the paid beta account");
    const publicLaunchProofAction = surfaceByLabel(container, "Public launch proof action");
    expect(publicLaunchProofAction.textContent).toContain("Next public-launch blocker: live receipt details.");
    expect(publicLaunchProofAction.textContent).toContain("Keep selling and operating private beta");
    expect(publicLaunchProofAction.textContent).toContain("Open launch proof");
    await act(async () => {
      buttonByText(publicLaunchProofAction, "Open launch proof")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions#dearme-decisions-needed");
    mockNavigate.mockClear();
    expectNoHiddenProductTerms(commercialReadiness.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    await flushReact();
    const paidCohortHealthReceipt = surfaceByLabel(container, "Paid cohort health receipt");
    expect(paidCohortHealthReceipt.textContent).toContain("Paid cohort");
    expect(paidCohortHealthReceipt.textContent).toContain("Paid accounts roll up into one operating view.");
    expect(paidCohortHealthReceipt.textContent).toContain("Cohort operable");
    expect(paidCohortHealthReceipt.textContent).toContain("Accounts");
    expect(paidCohortHealthReceipt.textContent).toContain("1/1 active");
    expect(paidCohortHealthReceipt.textContent).toContain("Credit");
    expect(paidCohortHealthReceipt.textContent).toContain("$250");
    expect(paidCohortHealthReceipt.textContent).toContain("Guardrails");
    expect(paidCohortHealthReceipt.textContent).toContain("Clear");
    expect(paidCohortHealthReceipt.textContent).toContain("Attention");
    expect(paidCohortHealthReceipt.textContent).toContain("None");
    expect(paidCohortHealthReceipt.textContent).toContain("No paid account needs activation or spend review right now.");
    expectNoHiddenProductTerms(paidCohortHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expect(mockDearmeApi.getPaidBetaCohort).toHaveBeenCalledWith(["company-1"]);
    const weeklyValueReceipt = surfaceByLabel(container, "Weekly value receipt");
    expect(weeklyValueReceipt.textContent).toContain("Seven-day value");
    expect(weeklyValueReceipt.textContent).toContain("A paid week should show useful work, not activity.");
    expect(weeklyValueReceipt.textContent).toContain("On track");
    expect(weeklyValueReceipt.textContent).toContain("Useful outputs");
    expect(weeklyValueReceipt.textContent).toContain("4 visible");
    expect(weeklyValueReceipt.textContent).toContain("Weekly report");
    expect(weeklyValueReceipt.textContent).toContain("Briefing ready");
    expect(weeklyValueReceipt.textContent).toContain("Opportunity and proof");
    expect(weeklyValueReceipt.textContent).toContain("1 path");
    expect(weeklyValueReceipt.textContent).toContain("Empty-week recovery");
    expect(weeklyValueReceipt.textContent).toContain("Covered");
    expectNoHiddenProductTerms(weeklyValueReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidAccountHealthReceipt = surfaceByLabel(container, "Paid account health receipt");
    expect(paidAccountHealthReceipt.textContent).toContain("Account health");
    expect(paidAccountHealthReceipt.textContent).toContain("Renewal health is based on outcomes, not busywork.");
    expect(paidAccountHealthReceipt.textContent).toContain("Healthy enough to retain");
    expect(paidAccountHealthReceipt.textContent).toContain("Outcome target");
    expect(paidAccountHealthReceipt.textContent).toContain("Useful work visible");
    expect(paidAccountHealthReceipt.textContent).toContain("at least one voice-matched growth output");
    expect(paidAccountHealthReceipt.textContent).toContain("Voice fit");
    expect(paidAccountHealthReceipt.textContent).toContain("Voice 55%");
    expect(paidAccountHealthReceipt.textContent).toContain("Voice Editor has one sample");
    expect(paidAccountHealthReceipt.textContent).toContain("Launch progress");
    expect(paidAccountHealthReceipt.textContent).toContain("4 calls");
    expect(paidAccountHealthReceipt.textContent).toContain("Cost clarity");
    expect(paidAccountHealthReceipt.textContent).toContain("Spend visible");
    expectNoHiddenProductTerms(paidAccountHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidRetentionPulse = surfaceByLabel(container, "Paid retention pulse");
    expect(paidRetentionPulse.textContent).toContain("Retention pulse");
    expect(paidRetentionPulse.textContent).toContain("This account has a weekly renewal signal.");
    expect(paidRetentionPulse.textContent).toContain("Retainable this week");
    expect(paidRetentionPulse.textContent).toContain("Customer value");
    expect(paidRetentionPulse.textContent).toContain("4 visible");
    expect(paidRetentionPulse.textContent).toContain("Voice risk");
    expect(paidRetentionPulse.textContent).toContain("Voice 55%");
    expect(paidRetentionPulse.textContent).toContain("Review risk");
    expect(paidRetentionPulse.textContent).toContain("4 calls");
    expect(paidRetentionPulse.textContent).toContain("Risk owner");
    expect(paidRetentionPulse.textContent).toContain("Customer call");
    expect(paidRetentionPulse.textContent).toContain("Download receipt");
    const paidRetentionPulseNote = surfaceByLabel(paidRetentionPulse, "Paid retention pulse note") as HTMLTextAreaElement;
    expect(paidRetentionPulseNote.value).toContain("DearMe paid retention pulse");
    expect(paidRetentionPulseNote.value).toContain("Status: Retainable this week");
    expect(paidRetentionPulseNote.value).toContain("Customer value: 4 visible");
    expect(paidRetentionPulseNote.value).toContain("Voice risk: Voice 55%");
    expect(paidRetentionPulseNote.value).toContain("Review risk: 4 calls");
    expect(paidRetentionPulseNote.value).toContain("Retention owner: Customer call");
    expect(paidRetentionPulseNote.value).toContain("Next support step: Before the launch call");
    expectNoHiddenProductTerms(paidRetentionPulse.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const emptyWeekRecoveryReceipt = surfaceByLabel(container, "Empty week recovery receipt");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Recovery");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("If a paid week is empty, DearMe has to recover visibly.");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("No empty week");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Useful deliverable");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Covered");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Fastest path");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Opportunity leads");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Customer update");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("No miss");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Escalation");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Autonomous");
    expectNoHiddenProductTerms(emptyWeekRecoveryReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidUserOperationsReceipt = surfaceByLabel(container, "Paid user operations receipt");
    expect(paidUserOperationsReceipt.textContent).toContain("Operations receipt");
    expect(paidUserOperationsReceipt.textContent).toContain("Paid users get recovery, cost, and support clarity.");
    expect(paidUserOperationsReceipt.textContent).toContain("Supportable account");
    expect(paidUserOperationsReceipt.textContent).toContain("Operating log");
    expect(paidUserOperationsReceipt.textContent).toContain("4 entries");
    expect(paidUserOperationsReceipt.textContent).toContain("Your call: Review Starter posts");
    expect(paidUserOperationsReceipt.textContent).toContain("Recovery path");
    expect(paidUserOperationsReceipt.textContent).toContain("Self-correcting");
    expect(paidUserOperationsReceipt.textContent).toContain("Cost guardrail");
    expect(paidUserOperationsReceipt.textContent).toContain("1 checkpoint");
    expect(paidUserOperationsReceipt.textContent).toContain("DearMe recorded $2.37 of brand team work");
    expect(paidUserOperationsReceipt.textContent).toContain("Human support");
    expect(paidUserOperationsReceipt.textContent).toContain("Hard calls only");
    expect(paidUserOperationsReceipt.textContent).toContain("real sends, public launches");
    expect(paidUserOperationsReceipt.textContent).toContain("Download receipt");
    const paidUserOperationsNote = surfaceByLabel(
      paidUserOperationsReceipt,
      "Paid user operations receipt note",
    ) as HTMLTextAreaElement;
    expect(paidUserOperationsNote.value).toContain("DearMe paid user operations receipt");
    expect(paidUserOperationsNote.value).toContain("Account: Supportable account");
    expect(paidUserOperationsNote.value).toContain("Operating log: 4 entries");
    expect(paidUserOperationsNote.value).toContain("Recovery path: Self-correcting");
    expect(paidUserOperationsNote.value).toContain("Cost guardrail: 1 checkpoint");
    expect(paidUserOperationsNote.value).toContain("Human support: Hard calls only");
    expect(paidUserOperationsNote.value).toContain("Next support step: Keep the weekly operating loop moving");
    expectNoHiddenProductTerms(
      `${paidUserOperationsReceipt.textContent ?? ""} ${paidUserOperationsNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const autonomyContractReceipt = surfaceByLabel(container, "Autonomy contract receipt");
    expect(autonomyContractReceipt.textContent).toContain("Autonomy contract");
    expect(autonomyContractReceipt.textContent).toContain("DearMe can keep working until a move would represent you.");
    expect(autonomyContractReceipt.textContent).toContain("External calls held");
    expect(autonomyContractReceipt.textContent).toContain("Read-only research");
    expect(autonomyContractReceipt.textContent).toContain("Runs freely");
    expect(autonomyContractReceipt.textContent).toContain("Team preparation");
    expect(autonomyContractReceipt.textContent).toContain("Can run together");
    expect(autonomyContractReceipt.textContent).toContain("Launch actions");
    expect(autonomyContractReceipt.textContent).toContain("4 calls");
    expect(autonomyContractReceipt.textContent).toContain("Recovery and support");
    expect(autonomyContractReceipt.textContent).toContain("Escalates only when needed");
    const autonomyContractNote = surfaceByLabel(container, "Autonomy contract note") as HTMLTextAreaElement;
    expect(autonomyContractNote.value).toContain("DearMe autonomy contract");
    expect(autonomyContractNote.value).toContain("Account: paid beta active");
    expect(autonomyContractNote.value).toContain("Can keep moving: research, drafts, opportunity prep");
    expect(autonomyContractNote.value).toContain("Can run at the same time: independent research");
    expect(autonomyContractNote.value).toContain("Must ask first: public posts, outreach, page changes");
    expect(autonomyContractNote.value).toContain("Recovery: if a path repeats failures");
    expectNoHiddenProductTerms(
      `${autonomyContractReceipt.textContent ?? ""} ${autonomyContractNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidUserSupportHandoff = surfaceByLabel(container, "Paid user support handoff");
    expect(paidUserSupportHandoff.textContent).toContain("Support handoff");
    expect(paidUserSupportHandoff.textContent).toContain("Customer help starts with the account context already attached.");
    expect(paidUserSupportHandoff.textContent).toContain("Ready for paid support");
    expect(paidUserSupportHandoff.textContent).toContain("Account state");
    expect(paidUserSupportHandoff.textContent).toContain("Paid beta active");
    expect(paidUserSupportHandoff.textContent).toContain("Latest context");
    expect(paidUserSupportHandoff.textContent).toContain("Attached");
    expect(paidUserSupportHandoff.textContent).toContain("Decision state");
    expect(paidUserSupportHandoff.textContent).toContain("4 waiting decisions");
    expect(paidUserSupportHandoff.textContent).toContain("Follow-up");
    expect(paidUserSupportHandoff.textContent).toContain("Before launch call");
    expect(paidUserSupportHandoff.textContent).toContain("Support notes become feedback work and a next check-in");
    expect(buttonByText(paidUserSupportHandoff, "Send to Chief of Staff")?.disabled).toBe(false);
    const paidUserSupportNote = surfaceByLabel(container, "Support handoff note") as HTMLTextAreaElement;
    expect(paidUserSupportNote.value).toContain("DearMe support handoff");
    expect(paidUserSupportNote.value).toContain("Account: Paid beta active");
    expect(paidUserSupportNote.value).toContain("Latest work: Your call: Review Starter posts");
    expect(paidUserSupportNote.value).toContain("Decisions: 4 waiting decisions");
    expect(paidUserSupportNote.value).toContain("Cost: DearMe recorded $2.37 of brand team work");
    expect(paidUserSupportNote.value).toContain("Follow-up: Before the launch call");
    expect(paidUserSupportNote.value).toContain("no public send, launch, spend");
    expectNoHiddenProductTerms(
      `${paidUserSupportHandoff.textContent ?? ""} ${paidUserSupportNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaReceipt = surfaceByLabel(container, "Paid beta operating receipt");
    expect(paidBetaReceipt.textContent).toContain("Operating receipt");
    expect(paidBetaReceipt.textContent).toContain("Paid access is active; the team can operate.");
    expect(paidBetaReceipt.textContent).toContain("Paid user operating");
    expect(paidBetaReceipt.textContent).toContain("Access receipt");
    expect(paidBetaReceipt.textContent).toContain("manual-invoice-1");
    expect(paidBetaReceipt.textContent).toContain("$250 net paid access is recorded for this account.");
    expect(paidBetaReceipt.textContent).toContain("Brand work");
    expect(paidBetaReceipt.textContent).toContain("Unlocked");
    expect(paidBetaReceipt.textContent).toContain("Support boundary");
    expect(paidBetaReceipt.textContent).toContain("Human support is only needed");
    expect(paidBetaReceipt.textContent).toContain("hosted checkout setup");
    expect(paidBetaReceipt.textContent).toContain("Public launch proof");
    expect(paidBetaReceipt.textContent).toContain("Receipts needed");
    expect(paidBetaReceipt.textContent).toContain("Download receipt");
    const paidBetaOperatingNote = surfaceByLabel(
      paidBetaReceipt,
      "Paid beta operating receipt note",
    ) as HTMLTextAreaElement;
    expect(paidBetaOperatingNote.value).toContain("DearMe paid beta operating receipt");
    expect(paidBetaOperatingNote.value).toContain("Account: Paid user operating");
    expect(paidBetaOperatingNote.value).toContain("Access receipt: manual-invoice-1");
    expect(paidBetaOperatingNote.value).toContain("Brand work: Unlocked");
    expect(paidBetaOperatingNote.value).toContain("Support boundary: Operating");
    expect(paidBetaOperatingNote.value).toContain("Payment reference: manual-invoice-1");
    expect(paidBetaOperatingNote.value).toContain("Next support step: Start the first brand cycle");
    expectNoHiddenProductTerms(
      `${paidBetaReceipt.textContent ?? ""} ${paidBetaOperatingNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaCustomerReceipt = surfaceByLabel(container, "Paid beta customer receipt");
    expect(paidBetaCustomerReceipt.textContent).toContain("Customer receipt");
    expect(paidBetaCustomerReceipt.textContent).toContain("Paid beta account is open.");
    expect(paidBetaCustomerReceipt.textContent).toContain("Account open");
    expect(paidBetaCustomerReceipt.textContent).toContain("Access");
    expect(paidBetaCustomerReceipt.textContent).toContain("Open");
    expect(paidBetaCustomerReceipt.textContent).toContain("Paid");
    expect(paidBetaCustomerReceipt.textContent).toContain("$250");
    expect(paidBetaCustomerReceipt.textContent).toContain("Remaining credit");
    expect(paidBetaCustomerReceipt.textContent).toContain("Receipt note");
    expect(paidBetaCustomerReceipt.textContent).toContain("Founding beta payment");
    expect(paidBetaCustomerReceipt.textContent).toContain("Reference");
    expect(paidBetaCustomerReceipt.textContent).toContain("manual-invoice-1");
    expect(paidBetaCustomerReceipt.textContent).toContain("Start first cycle now");
    expect(paidBetaCustomerReceipt.textContent).toContain("Start brand team");
    expect(paidBetaCustomerReceipt.textContent).toContain("Keep credit visible");
    expect(paidBetaCustomerReceipt.textContent).toContain("Hold public moves");
    expect(paidBetaCustomerReceipt.textContent).toContain("Download receipt");
    const paidBetaCustomerReceiptNote = surfaceByLabel(
      container,
      "Paid beta customer receipt note",
    ) as HTMLTextAreaElement;
    expect(paidBetaCustomerReceiptNote.value).toContain("DearMe paid beta customer receipt");
    expect(paidBetaCustomerReceiptNote.value).toContain("Status: Paid beta account open");
    expect(paidBetaCustomerReceiptNote.value).toContain("Access: Open");
    expect(paidBetaCustomerReceiptNote.value).toContain("Reference: manual-invoice-1");
    expect(paidBetaCustomerReceiptNote.value).toContain("First cycle: start the brand team");
    expectNoHiddenProductTerms(paidBetaCustomerReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidBetaWelcomePlan = surfaceByLabel(container, "Paid beta welcome plan");
    expect(paidBetaWelcomePlan.textContent).toContain("Welcome plan");
    expect(paidBetaWelcomePlan.textContent).toContain("The first paid week has a clear promise.");
    expect(paidBetaWelcomePlan.textContent).toContain("Welcome ready");
    expect(paidBetaWelcomePlan.textContent).toContain("First 5 minutes");
    expect(paidBetaWelcomePlan.textContent).toContain("Proof fast");
    expect(paidBetaWelcomePlan.textContent).toContain("First week");
    expect(paidBetaWelcomePlan.textContent).toContain("Useful work");
    expect(paidBetaWelcomePlan.textContent).toContain("Support follow-up");
    expect(paidBetaWelcomePlan.textContent).toContain("Check-in ready");
    expect(paidBetaWelcomePlan.textContent).toContain("Launch boundary");
    const paidBetaWelcomePlanNote = surfaceByLabel(
      container,
      "Paid beta welcome plan note",
    ) as HTMLTextAreaElement;
    expect(paidBetaWelcomePlanNote.value).toContain("DearMe paid beta welcome plan");
    expect(paidBetaWelcomePlanNote.value).toContain("Account: paid beta open");
    expect(paidBetaWelcomePlanNote.value).toContain("Receipt: manual-invoice-1");
    expect(paidBetaWelcomePlanNote.value).toContain("First 5 minutes: start from one sentence");
    expect(paidBetaWelcomePlanNote.value).toContain("First week: keep useful content, opportunities");
    expect(paidBetaWelcomePlanNote.value).toContain("Support: empty weeks or stuck paths get a make-good");
    expectNoHiddenProductTerms(
      `${paidBetaWelcomePlan.textContent ?? ""} ${paidBetaWelcomePlanNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaCloseKit = surfaceByLabel(container, "Paid beta close kit");
    expect(paidBetaCloseKit.textContent).toContain("Close kit");
    expect(paidBetaCloseKit.textContent).toContain("Paid beta account is ready to start.");
    expect(paidBetaCloseKit.textContent).toContain("Ready to start");
    expect(paidBetaCloseKit.textContent).toContain("Confirm access");
    expect(paidBetaCloseKit.textContent).toContain("Account open");
    expect(paidBetaCloseKit.textContent).toContain("Start first cycle");
    expect(paidBetaCloseKit.textContent).toContain("Keep launch boundary");
    expect(paidBetaCloseKit.textContent).toContain("manual-invoice-1");
    const paidBetaCloseKitNote = surfaceByLabel(container, "Paid beta close kit note") as HTMLTextAreaElement;
    expect(paidBetaCloseKitNote.value).toContain("DearMe paid beta start kit");
    expect(paidBetaCloseKitNote.value).toContain("Account: paid beta open");
    expect(paidBetaCloseKitNote.value).toContain("Receipt: manual-invoice-1");
    expect(paidBetaCloseKitNote.value).toContain("Paid: $250");
    expect(paidBetaCloseKitNote.value).toContain("Receipt note: Founding beta payment");
    expect(paidBetaCloseKitNote.value).toContain(
      "Boundary: public posts, outreach, page changes, and spend wait for the launch call.",
    );
    expectNoHiddenProductTerms(
      `${paidBetaCloseKit.textContent ?? ""} ${paidBetaCloseKitNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaPaymentPath = surfaceByLabel(container, "Paid beta payment path receipt");
    expect(paidBetaPaymentPath.textContent).toContain("Payment path");
    expect(paidBetaPaymentPath.textContent).toContain("Payment is recorded; paid work can start.");
    expect(paidBetaPaymentPath.textContent).toContain("Receipt-backed access");
    expect(paidBetaPaymentPath.textContent).toContain("Receipt recorded");
    expect(paidBetaPaymentPath.textContent).toContain("Activation");
    expect(paidBetaPaymentPath.textContent).toContain("Open");
    expect(paidBetaPaymentPath.textContent).toContain("Self-serve upgrade");
    expect(paidBetaPaymentPath.textContent).toContain("Hosted checkout can replace manual recording");
    const paidBetaPaymentPathNote = surfaceByLabel(
      container,
      "Paid beta payment path note",
    ) as HTMLTextAreaElement;
    expect(paidBetaPaymentPathNote.value).toContain("DearMe payment path receipt");
    expect(paidBetaPaymentPathNote.value).toContain("Mode: paid beta access recorded");
    expect(paidBetaPaymentPathNote.value).toContain("Receipt: manual-invoice-1");
    expect(paidBetaPaymentPathNote.value).toContain("Paid: $250");
    expect(paidBetaPaymentPathNote.value).toContain("Activation: paid access is open for this account.");
    expect(paidBetaPaymentPathNote.value).toContain("Upgrade path: hosted checkout setup can replace manual recording");
    expectNoHiddenProductTerms(
      `${paidBetaPaymentPath.textContent ?? ""} ${paidBetaPaymentPathNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    expect(container.textContent).toContain("Can keep moving");
    expect(container.textContent).toContain("Must ask first");
    expect(container.textContent).toContain("Stops repeat work");
    expect(container.textContent).toContain("Spend is visible");
    expect(container.textContent).toContain("Public posts, outbound messages, site changes, new spend");
    expect(container.textContent).toContain("Spend appears as plain checkpoints and monthly guardrails");
    expect(container.textContent).toContain("Brand team run ledger");
    expect(container.textContent).toContain("What your team moved while you were away.");
    expect(container.textContent).toContain(
      "A compact record of what the brand team moved, prepared, learned, staged at the boundary, skipped, and now needs from you.",
    );
    expect(container.textContent).toContain("Moved");
    expect(container.textContent).toContain("Prepared");
    expect(container.textContent).toContain("Learned");
    expect(container.textContent).toContain("Queued at boundary");
    expect(container.textContent).toContain("Skipped");
    expect(container.textContent).toContain("Needs your call");
    expect(container.textContent).toContain("Evidence");
    expect(container.textContent).toContain("Next");
    expect(container.textContent).toContain("Launch call ready");
    expect(container.textContent).toContain("Voice memory updated");
    expect(container.querySelector('[aria-label="Brand team run ledger"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger="brand-team"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="tried"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="prepared"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="learned"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="blocked"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="skipped"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="needs_call"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-entry="tried"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-entry="prepared"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-entry="learned"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-entry="needs_decision"]')).not.toBeNull();
    expect(container.textContent).toContain("Growth cycle");
    expect(container.textContent).toContain("Plan, work, review, then learn.");
    expect(container.textContent).toContain("Chief of Staff sets the cycle");
    expect(container.textContent).toContain("The team prepares assets");
    expect(container.textContent).toContain("You make the high-leverage calls");
    expect(container.textContent).toContain("Voice & Memory improves the next pass");
    expect(container.textContent).toContain(
      "Feedback, proof sources, and report learnings shape the next brand cycle automatically.",
    );
    expect(container.textContent).toContain("6 learning signals");
    const autonomousNextMoveQueue = surfaceByLabel(container, "Autonomous next moves");
    expect(autonomousNextMoveQueue.textContent).toContain("Next moves");
    expect(autonomousNextMoveQueue.textContent).toContain("DearMe has next moves ready before it needs you again.");
    expect(autonomousNextMoveQueue.textContent).toContain("Handle launch calls");
    expect(autonomousNextMoveQueue.textContent).toContain("4 calls");
    expect(autonomousNextMoveQueue.textContent).toContain("Review sources for memory");
    expect(autonomousNextMoveQueue.textContent).toContain("1 source");
    expect(autonomousNextMoveQueue.textContent).toContain("Keep ready work visible");
    expect(autonomousNextMoveQueue.textContent).toContain("3 items");
    expect(autonomousNextMoveQueue.textContent).toContain("Open next decision");
    expect(autonomousNextMoveQueue.textContent).toContain("Open Voice & Memory");
    expect(autonomousNextMoveQueue.textContent).toContain("Open work ready");
    expectNoHiddenProductTerms(autonomousNextMoveQueue.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    await act(async () => {
      buttonByText(autonomousNextMoveQueue, "Open next decision")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=issue-2&artifact=issue-2%3Acontent_drafts");
    mockNavigate.mockClear();
    await act(async () => {
      buttonByText(autonomousNextMoveQueue, "Open Voice & Memory")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");
    mockNavigate.mockClear();
    await act(async () => {
      buttonByText(autonomousNextMoveQueue, "Open work ready")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=brand-os#dearme-work-ready");
    mockNavigate.mockClear();
    const nextCycleRetentionReceipt = surfaceByLabel(container, "Next cycle retention receipt");
    expect(nextCycleRetentionReceipt.textContent).toContain("Next check-in");
    expect(nextCycleRetentionReceipt.textContent).toContain("You can leave and know what DearMe will do next.");
    expect(nextCycleRetentionReceipt.textContent).toContain("Retention loop active");
    expect(nextCycleRetentionReceipt.textContent).toContain("Download receipt");
    expect(nextCycleRetentionReceipt.textContent).toContain("Next briefing");
    expect(nextCycleRetentionReceipt.textContent).toContain("Briefing ready");
    expect(nextCycleRetentionReceipt.textContent).toContain("Content Producer is moving Content drafts forward.");
    expect(nextCycleRetentionReceipt.textContent).toContain("Work continues");
    expect(nextCycleRetentionReceipt.textContent).toContain("3 work items");
    expect(nextCycleRetentionReceipt.textContent).toContain("Decision rhythm");
    expect(nextCycleRetentionReceipt.textContent).toContain("4 calls");
    expect(nextCycleRetentionReceipt.textContent).toContain("Memory to reuse");
    expect(nextCycleRetentionReceipt.textContent).toContain("Voice sample added: Short, direct voice note.");
    const nextCycleRetentionNote = surfaceByLabel(
      nextCycleRetentionReceipt,
      "Next cycle retention receipt note",
    ) as HTMLTextAreaElement;
    expect(nextCycleRetentionNote.value).toContain("DearMe next cycle retention receipt");
    expect(nextCycleRetentionNote.value).toContain("Account: Retention loop active");
    expect(nextCycleRetentionNote.value).toContain("Next briefing: Briefing ready");
    expect(nextCycleRetentionNote.value).toContain("Work continues: 3 work items");
    expect(nextCycleRetentionNote.value).toContain("Decision rhythm: 4 calls");
    expect(nextCycleRetentionNote.value).toContain("Memory to reuse:");
    expect(nextCycleRetentionNote.value).toContain("Latest signal:");
    expect(nextCycleRetentionNote.value).toContain("Next support step: Start with the waiting launch calls");
    expectNoHiddenProductTerms(
      `${nextCycleRetentionReceipt.textContent ?? ""} ${nextCycleRetentionNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const feedbackLearningReceipt = surfaceByLabel(container, "Feedback learning receipt");
    expect(feedbackLearningReceipt.textContent).toContain("Learning receipt");
    expect(feedbackLearningReceipt.textContent).toContain("Your corrections become the next pass.");
    expect(feedbackLearningReceipt.textContent).toContain("Learning while operating");
    expect(feedbackLearningReceipt.textContent).toContain("Open Voice & Memory");
    expect(feedbackLearningReceipt.textContent).toContain("Feedback in progress");
    expect(feedbackLearningReceipt.textContent).toContain("1 active brief");
    expect(feedbackLearningReceipt.textContent).toContain("Voice & Memory learning, recovery work");
    expect(feedbackLearningReceipt.textContent).toContain("Review feedback");
    expect(feedbackLearningReceipt.textContent).toContain("1 saved note");
    expect(feedbackLearningReceipt.textContent).toContain("Keep future drafts shorter, proof-led, and direct");
    expect(feedbackLearningReceipt.textContent).toContain("Applied changes");
    expect(feedbackLearningReceipt.textContent).toContain("Waiting on first revision");
    expect(feedbackLearningReceipt.textContent).toContain("Sources to learn");
    expect(feedbackLearningReceipt.textContent).toContain("1 to review");
    expect(feedbackLearningReceipt.textContent).toContain("Next cycle memory");
    expect(feedbackLearningReceipt.textContent).toContain("Voice sample added: Short, direct voice note.");
    expectNoHiddenProductTerms(feedbackLearningReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    await act(async () => {
      buttonByText(feedbackLearningReceipt, "Open Voice & Memory")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");
    mockNavigate.mockClear();
    expect(container.textContent).toContain(
      "Brand work keeps moving. Public posts, outbound messages, page changes, and spend come back as one launch call.",
    );
    expect(container.textContent).toContain("Growth map");
    expect(container.textContent).toContain("Your team turns brand work into launch-ready moves");
    expect(container.textContent).toContain("1 role connected");
    expect(container.textContent).toContain("1 lane");
    expect(container.textContent).toContain("2 assets");
    expect(container.textContent).toContain("1 signal");
    expect(container.textContent).toContain("1 guardrail");
    expect(container.textContent).toContain("Team progress map");
    expect(container.textContent).not.toContain("Team work stream");
    expect(container.textContent).toContain("The current cycle, shown as the moves, memories, and guardrails that matter to you.");
    expect(container.textContent).toContain("Team visible");
    expect(container.textContent).toContain("Weekly growth cycle");
    expect(container.textContent).toContain("Starter posts");
    expect(container.textContent).toContain("Content Producer");
    expect(container.textContent).toContain("Review Starter posts");
    expect(container.textContent).toContain("Starter posts are ready");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain("Voice memory updated");
    expect(container.textContent).toContain("Weekly Dear me report");
    expect(container.textContent).toContain("This is ready for your launch call before it represents you publicly or externally.");
    expect(container.textContent).not.toContain("cycle:weekly-growth-loop");
    expect(container.textContent).not.toContain("decision:output:issue-2:content_drafts");
    expect(container.textContent).toContain("Prepared work waiting for review");
    expect(container.textContent).toContain("Why it matters");
    expect(container.textContent).toContain("Your next step");
    expect(container.textContent).toContain("Review pass 0/3");
    expect(container.textContent).toContain("Needs your review");
    expect(container.textContent).toContain(
      "Open it, then launch, request changes, ask for another pass, or choose a new direction.",
    );
    expect(
      container.querySelectorAll(
        '[aria-label="Work ready"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(
        '[aria-label="Work ready"] [data-dearme-action-attention="decision_needed"]',
      ),
    ).not.toBeNull();
    expectSurfacesInOrder(container, [
      "Today's brand team focus",
      "Your brand team today",
      "Team operating policy",
      "Commercial readiness",
      "Brand team run ledger",
      "Growth cycle plan",
      "Work ready",
      "Decisions needed",
      "Dear me letter",
      "Voice & Memory",
      "Live proof feed",
    ]);
    expectSurfacesInOrder(container, [
      "First payoff",
      "90-second first cycle",
      "DearMe brand workroom",
      "Brand work ready",
    ]);
    await act(async () => {
      buttonByText(firstPayoff, "Start with one sentence")?.click();
    });
    expect(document.activeElement).toBe(container.querySelector("#dearme-first-cycle-intent"));
    expect(container.textContent).toContain("Start brand team for Peter Studio");
    expect(container.textContent).toContain("Batch decisions");
    expect(container.textContent).toContain("Review content batch");
    expect(container.textContent).toContain("Review posts");
    expect(container.textContent).toContain("Launch call ready");
    const decisionsSurface = surfaceByLabel(container, "Decisions needed");
    expect(decisionsSurface.textContent).toContain("Review Work Ready");
    await act(async () => {
      buttonByText(decisionsSurface, "Review Work Ready")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=brand-os#dearme-work-ready");
    mockNavigate.mockClear();
    const launchCallChoices = surfaceByLabel(container, "Launch call choices");
    expect(launchCallChoices.textContent).toContain("One call can launch, revise, pause, or keep the team working.");
    expect(launchCallChoices.textContent).toContain("Launch inside boundary");
    expect(launchCallChoices.textContent).toContain("Request changes");
    expect(launchCallChoices.textContent).toContain("Pause the lane");
    expect(launchCallChoices.textContent).toContain("Another pass");
    expect(launchCallChoices.textContent).toContain("4 waiting calls");
    expect(launchCallChoices.textContent).toContain("Download receipt");
    const afterCallOutcomeNote = surfaceByLabel(
      launchCallChoices,
      "After-call outcome receipt note",
    ) as HTMLTextAreaElement;
    expect(afterCallOutcomeNote.value).toContain("DearMe after-call outcome receipt");
    expect(afterCallOutcomeNote.value).toContain("Waiting launch calls: 4");
    expect(afterCallOutcomeNote.value).toContain(
      "Launch inside boundary: approved work moves forward only inside the launch rule you just chose.",
    );
    expect(afterCallOutcomeNote.value).toContain("Request changes: DearMe keeps the context");
    expect(afterCallOutcomeNote.value).toContain("Pause the lane: DearMe stops this path");
    expect(afterCallOutcomeNote.value).toContain("Another pass: DearMe keeps working privately");
    expect(afterCallOutcomeNote.value).toContain("Must wait: public posts");
    expectNoHiddenProductTerms(launchCallChoices.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const beforeApproveChecks = surfaceByLabel(container, "Before launch checks");
    expect(beforeApproveChecks.textContent).toContain(
      "Check voice, proof, and boundary before anything represents you.",
    );
    expect(beforeApproveChecks.textContent).toContain("Voice fit");
    expect(beforeApproveChecks.textContent).toContain("Proof attached");
    expect(beforeApproveChecks.textContent).toContain("Boundary clear");
    expect(beforeApproveChecks.textContent).toContain("Quality gate");
    expect(beforeApproveChecks.textContent).toContain("Download receipt");
    const beforeLaunchChecksNote = surfaceByLabel(
      beforeApproveChecks,
      "Before launch checks receipt note",
    ) as HTMLTextAreaElement;
    expect(beforeLaunchChecksNote.value).toContain("DearMe before-launch checks receipt");
    expect(beforeLaunchChecksNote.value).toContain("Waiting launch calls: 4");
    expect(beforeLaunchChecksNote.value).toContain("Call choices: Launch inside boundary; Request changes; Pause the lane; Another pass");
    expect(beforeLaunchChecksNote.value).toContain("Next support step: open the waiting call");
    expect(beforeLaunchChecksNote.value).toContain("Must wait: public posts");
    expectNoHiddenProductTerms(beforeApproveChecks.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expect(container.textContent).toContain("After your call");
    expect(container.textContent).toContain("Your call updates the review path");
    expect(
      container.querySelectorAll(
        '[aria-label="Decisions needed"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(
        '[aria-label="Decisions needed"] [data-dearme-action-attention="decision_needed"]',
      ),
    ).not.toBeNull();
    expect(container.textContent).toContain("Live proof feed");
    expect(container.textContent).toContain(
      "A live proof feed for the work your team prepared, updated, or staged for your call.",
    );
    expect(container.textContent).toContain("1 needs your call");
    expect(container.textContent).toContain("2 in motion");
    expect(container.textContent).toContain("Reviewable work and launch calls stay first.");
    expect(container.textContent).toContain("Work the team keeps preparing before the next launch call.");
    expect(container.textContent).toContain("Recent updates");
    expect(container.textContent).toContain("Completed cycle checkpoints, spend pauses, and team notes.");
    expect(container.textContent).toContain("Latest");
    expect(container.textContent).toContain("Your call: Review Starter posts");
    expect(container.textContent).toContain("Cycle check-in completed");
    expect(container.textContent).toContain("Weekly content cycle checked in");
    expect(container.textContent).toContain("Spend checkpoint recorded");
    expect(container.textContent).toContain("$2.37");
    expect(container.textContent).toContain("Billing details stay backstage");
    expect(container.textContent).toContain("Spend guardrail");
    expect(container.textContent).toContain("Action needed");
    expect(container.textContent).toContain("Prepared output");
    expect(container.textContent).toContain("Next action");
    expect(container.textContent).toContain("A launch call is ready before anything represents you.");
    expect(container.textContent).toContain("The team keeps preparing before the next launch call.");
    expect(container.textContent).toContain("This update is recorded for the next brand cycle.");
    expect(container.textContent).toContain("Decision ready");
    expect(
      container.querySelectorAll(
        '[aria-label="Live proof feed"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(
        '[aria-label="Live proof feed"] [data-dearme-action-attention="decision_needed"]',
      ),
    ).not.toBeNull();
    expect(container.textContent).toContain("Weekly Dear me");
    expect(container.textContent).toContain("Open letter");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("What changed");
    expect(container.textContent).toContain("Visible work your team moved forward.");
    expect(container.textContent).toContain("Needs your call");
    expect(container.textContent).toContain("Review Starter posts: Five posts are ready for voice review.");
    expect(container.textContent).toContain("What we learned");
    expect(container.textContent).toContain("Voice sample added: Short, direct voice note.");
    expect(container.textContent).toContain("Next bets");
    expect(container.textContent).toContain("Content Producer is moving Content drafts forward.");
    expect(container.textContent).toContain("Voice & Memory");
    expect(container.textContent).toContain("Learning");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("55%");
    expect(container.textContent).toContain("Add one more real sample");
    const voiceMemorySurface = surfaceByLabel(container, "Voice & Memory");
    expect(voiceMemorySurface.textContent).toContain("Review Work Ready");
    await act(async () => {
      buttonByText(voiceMemorySurface, "Review Work Ready")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=brand-os#dearme-work-ready");
    mockNavigate.mockClear();
    expect(container.textContent).toContain("Manual note");
    expect(container.textContent).toContain("Review preferences");
    expect(container.textContent).toContain("Shorter proof-led drafts");
    expect(container.textContent).toContain(
      "Keep future drafts shorter, proof-led, and direct before the next launch call.",
    );
    expect(container.textContent).toContain("Last review");
    expect(container.textContent).toContain("Source coverage");
    expect(container.textContent).toContain("Building");
    expect(container.textContent).toContain("Writing samples");
    expect(container.textContent).toContain("1 of 2 saved");
    expect(container.textContent).toContain("Next source");
    expect(container.textContent).toContain("Boundaries");
    expect(
      container.querySelectorAll(
        '[aria-label="Voice & Memory"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("Already in use");
    expect(container.textContent).toContain("Keeps drafts, outreach, and reports inside your chosen voice.");
    expect(container.textContent).toContain("Portfolio Builder");
    expect(container.textContent).toContain("Feeds proof cards, stronger claims, and launch-call notes.");
    expect(container.textContent).toContain("Applies this correction to the next draft before it reaches you.");
    expect(container.textContent).toContain("Source guide");
    expect(container.textContent).toContain("Writing sample");
    expect(container.textContent).toContain("Source link");
    expect(container.textContent).toContain("Correction");
    expect(container.textContent).toContain("Forbidden phrase");
    expect(container.textContent).toContain("Audience note");
    expect(container.textContent).toContain("Offer note");
    expect(container.textContent).toContain("Team preview");
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("will compare future drafts against this sample");
    expect(container.textContent).toContain("Improves content drafts, outreach tone, and weekly reports.");
    expect(container.textContent).toContain("What do you want to become known for?");
    expect(container.textContent).toContain("Paid beta");
    expect(container.textContent).toContain("Cycle guardrail");
    expect(container.textContent).toContain("Brand cycles can run within guardrails");
    expect(container.textContent).toContain("Monthly guardrail");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);
    expect(container.textContent).not.toContain("routine");
    expect(container.textContent).not.toContain("cost_event");
    expect(container.textContent).not.toContain("anthropic");
    expect((container.querySelector("#dearme-display-name") as HTMLInputElement | null)?.value).toBe("Peter Studio");

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-title") as HTMLInputElement,
        "Voice note",
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "Short, direct voice note.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Voice note",
        body: "Short, direct voice note.",
        sourceLabel: null,
      }),
    );
    expect(container.textContent).toContain(
      "Saved. 1 growth cycle refreshed with your latest Voice & Memory.",
    );
    expect(container.textContent).toContain("Fresh voice note");
    expect(container.textContent).toContain("Fresh direct voice note from today's work.");
    expect(container.textContent).toContain("Just saved");
    const voiceMemorySaveReceipt = surfaceByLabel(container, "Voice & Memory save receipt");
    expect(voiceMemorySaveReceipt.textContent).toContain("Review refreshed work");
    await act(async () => {
      buttonByText(voiceMemorySaveReceipt, "Review refreshed work")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=brand-os#dearme-work-ready");
    mockNavigate.mockClear();

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-goals") as HTMLTextAreaElement,
        "Grow owned audience",
      );
      setTextareaValue(
        container.querySelector("#dearme-proof") as HTMLTextAreaElement,
        "Shipped a working local product",
      );
      setInputValue(
        container.querySelector("#dearme-budget") as HTMLInputElement,
        "250",
      );
    });

    await act(async () => {
      buttonByText(container, "Preview profile")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.previewBrandBlueprint).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          goals: ["Grow owned audience"],
          proofPoints: ["Shipped a working local product"],
          budgetMonthlyCents: 25_000,
        }),
      }),
    );
    expect(container.textContent).toContain("Create brand team profile for Peter Studio");
    expect(container.textContent).toContain("Voice check");
    expect(container.textContent).toContain("Voice 100/100");
    expect(container.textContent).toContain("Ready for review");
    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("Working rhythm");
    expect(container.textContent).toContain("First brand work");
    expect(container.textContent).not.toContain("machinery hidden");
    expect(container.textContent).not.toContain("First operations");

    await act(async () => {
      buttonByText(container, "Start brand team")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.createBrandBlueprintApplyRequest).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          goals: ["Grow owned audience"],
        }),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&approval=approval-1");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows paid cohort accounts that need spend or activation attention", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.getPaidBetaCohort.mockResolvedValue(paidBetaCohortSummary({
      readyAccountCount: 0,
      hardStopAccountCount: 1,
      decisionRequiredAccountCount: 1,
      remainingCreditCents: 0,
      cycleSpendCents: 25_000,
      state: "attention",
      label: "Spend review needed",
      summary: "At least one paid beta account is paused before more private-cycle spend.",
      nextAction: "Review paused accounts and refresh paid credit before the next cycle.",
      attentionAccounts: [
        {
          companyId: "company-1",
          state: "hard_stop",
          status: "active",
          label: "Monthly guardrail reached",
          nextAction: "Review monthly spend before more private work runs.",
        },
      ],
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    const paidCohortHealthReceipt = surfaceByLabel(container, "Paid cohort health receipt");
    expect(paidCohortHealthReceipt.textContent).toContain("Spend review needed");
    expect(paidCohortHealthReceipt.textContent).toContain("Accounts");
    expect(paidCohortHealthReceipt.textContent).toContain("1/1 active");
    expect(paidCohortHealthReceipt.textContent).toContain("Credit");
    expect(paidCohortHealthReceipt.textContent).toContain("$0");
    expect(paidCohortHealthReceipt.textContent).toContain("Guardrails");
    expect(paidCohortHealthReceipt.textContent).toContain("1 paused account");
    expect(paidCohortHealthReceipt.textContent).toContain("Review paused accounts");
    expect(paidCohortHealthReceipt.textContent).toContain("Attention");
    expect(paidCohortHealthReceipt.textContent).toContain("1 attention");
    expect(paidCohortHealthReceipt.textContent).toContain("Review monthly spend before more brand work runs.");
    expectNoHiddenProductTerms(paidCohortHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      root.unmount();
    });
  });

  it("rolls visible paid accounts into one operations list", async () => {
    mockCompanyContext.companies = [
      {
        id: "company-2",
        issuePrefix: "ACL",
        name: "Acme Founder Lab",
        status: "active",
      },
      {
        id: "company-1",
        issuePrefix: "PET",
        name: "Peter Studio",
        status: "active",
      },
    ];
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.getPaidBetaCohort.mockResolvedValue(paidBetaCohortSummary({
      accountCount: 2,
      activeAccountCount: 1,
      trialAccountCount: 1,
      readyAccountCount: 1,
      decisionRequiredAccountCount: 1,
      state: "watch",
      label: "Activation watch",
      summary: "Some accounts are still previewing DearMe without recorded paid beta access.",
      nextAction: "Record paid access or keep those accounts in preview before running private cycles.",
      attentionAccounts: [
        {
          companyId: "company-2",
          state: "trial_preview",
          status: "trial",
          label: "Trial preview",
          nextAction: "Record paid access before private cycles run.",
        },
      ],
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(mockDearmeApi.getPaidBetaCohort).toHaveBeenCalledWith(["company-1", "company-2"]);
    const paidCohortHealthReceipt = surfaceByLabel(container, "Paid cohort health receipt");
    expect(paidCohortHealthReceipt.textContent).toContain("Activation watch");
    expect(paidCohortHealthReceipt.textContent).toContain("1/2 active");
    const paidOperationsList = surfaceByLabel(container, "Paid operations attention list");
    expect(paidOperationsList.textContent).toContain("Fix paid-account blockers before the next cycle.");
    expect(paidOperationsList.textContent).toContain("Acme Founder Lab");
    expect(paidOperationsList.textContent).toContain("Record paid access before brand cycles run.");
    expect(paidOperationsList.textContent).toContain("Trial preview");
    await act(async () => {
      buttonByText(paidOperationsList, "Open account")?.click();
    });
    expect(mockSetSelectedCompanyId).toHaveBeenCalledWith("company-2", { source: "route_sync" });
    expect(mockNavigate).toHaveBeenCalledWith("/ACL/dearme?view=brand-os#dearme-paid-beta-access");
    expectNoHiddenProductTerms(paidOperationsList.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a concrete recovery path when a paid week has no useful deliverables", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const emptyWeekWorkbench = workbenchResponse();
    emptyWeekWorkbench.workReady = [];
    emptyWeekWorkbench.activeWork = [];
    emptyWeekWorkbench.report = null;
    mockDearmeApi.getWorkbench.mockResolvedValue(emptyWeekWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const weeklyValueReceipt = surfaceByLabel(container, "Weekly value receipt");
    expect(weeklyValueReceipt.textContent).toContain("Needs recovery");
    expect(weeklyValueReceipt.textContent).toContain("Useful outputs");
    expect(weeklyValueReceipt.textContent).toContain("No output yet");
    expect(weeklyValueReceipt.textContent).toContain("Empty-week recovery");
    expect(weeklyValueReceipt.textContent).toContain("Needs support");
    expect(weeklyValueReceipt.textContent).toContain("Recover this week before it feels empty.");
    expect(weeklyValueReceipt.textContent).toContain("Open recovery");
    expectNoHiddenProductTerms(weeklyValueReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    const paidAccountHealthReceipt = surfaceByLabel(container, "Paid account health receipt");
    expect(paidAccountHealthReceipt.textContent).toContain("Needs recovery");
    expect(paidAccountHealthReceipt.textContent).toContain("Outcome target");
    expect(paidAccountHealthReceipt.textContent).toContain("Needs useful work");
    expect(paidAccountHealthReceipt.textContent).toContain("Recovery is the next account-health action.");
    expect(paidAccountHealthReceipt.textContent).toContain("Open recovery");
    expectNoHiddenProductTerms(paidAccountHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    const paidRetentionPulse = surfaceByLabel(container, "Paid retention pulse");
    expect(paidRetentionPulse.textContent).toContain("At risk");
    expect(paidRetentionPulse.textContent).toContain("Customer value");
    expect(paidRetentionPulse.textContent).toContain("No output yet");
    expect(paidRetentionPulse.textContent).toContain("Risk owner");
    expect(paidRetentionPulse.textContent).toContain("Recovery");
    expect(paidRetentionPulse.textContent).toContain("Retention risk is recovery-owned now.");
    expect(paidRetentionPulse.textContent).toContain("Open recovery");
    expect(paidRetentionPulse.textContent).toContain("Open support handoff");
    const paidRetentionPulseNote = surfaceByLabel(paidRetentionPulse, "Paid retention pulse note") as HTMLTextAreaElement;
    expect(paidRetentionPulseNote.value).toContain("DearMe paid retention pulse");
    expect(paidRetentionPulseNote.value).toContain("Status: At risk");
    expect(paidRetentionPulseNote.value).toContain("Customer value: No output yet");
    expect(paidRetentionPulseNote.value).toContain("Retention owner: Recovery");
    expect(paidRetentionPulseNote.value).toContain("Risk reason: No useful customer-visible output is ready this week.");
    expect(paidRetentionPulseNote.value).toContain("Action: open same-day recovery");
    expectNoHiddenProductTerms(paidRetentionPulse.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    const paidUserOperationsReceipt = surfaceByLabel(container, "Paid user operations receipt");
    expect(paidUserOperationsReceipt.textContent).toContain("Paid users get recovery, cost, and support clarity.");
    expect(paidUserOperationsReceipt.textContent).toContain("Operations risk needs an owner now.");
    expect(paidUserOperationsReceipt.textContent).toContain("Open the recovery pass");
    expect(paidUserOperationsReceipt.textContent).toContain("Open recovery");
    expect(paidUserOperationsReceipt.textContent).toContain("Open support handoff");
    expect(paidUserOperationsReceipt.textContent).toContain("Download receipt");
    const paidUserOperationsNote = surfaceByLabel(
      paidUserOperationsReceipt,
      "Paid user operations receipt note",
    ) as HTMLTextAreaElement;
    expect(paidUserOperationsNote.value).toContain("DearMe paid user operations receipt");
    expect(paidUserOperationsNote.value).toContain("Account: Supportable account");
    expect(paidUserOperationsNote.value).toContain("Recovery path: Self-correcting");
    expect(paidUserOperationsNote.value).toContain("Next support step: Open same-day recovery");
    expectNoHiddenProductTerms(
      `${paidUserOperationsReceipt.textContent ?? ""} ${paidUserOperationsNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );

    const autonomyContractReceipt = surfaceByLabel(container, "Autonomy contract receipt");
    const autonomyContractAction = surfaceByLabel(autonomyContractReceipt, "Autonomy contract action");
    expect(autonomyContractAction.textContent).toContain("Autonomy has a next step, not just a boundary.");
    expect(autonomyContractAction.textContent).toContain("no useful output should move into recovery");
    expect(autonomyContractAction.textContent).toContain("Open recovery");
    expect(autonomyContractAction.textContent).toContain("Open support handoff");
    expectNoHiddenProductTerms(autonomyContractAction.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      buttonByText(autonomyContractAction, "Open recovery")?.click();
    });
    expect(window.location.hash).toBe("#dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(autonomyContractAction, "Open support handoff")?.click();
    });
    expect(window.location.hash).toBe("#dearme-support-handoff");

    const emptyWeekRecoveryReceipt = surfaceByLabel(container, "Empty week recovery receipt");
    expect(emptyWeekRecoveryReceipt.id).toBe("dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(paidUserOperationsReceipt, "Open recovery")?.click();
    });
    expect(window.location.hash).toBe("#dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(paidUserOperationsReceipt, "Open support handoff")?.click();
    });
    expect(window.location.hash).toBe("#dearme-support-handoff");
    await act(async () => {
      buttonByText(weeklyValueReceipt, "Open recovery")?.click();
    });
    expect(window.location.hash).toBe("#dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(paidAccountHealthReceipt, "Open recovery")?.click();
    });
    expect(window.location.hash).toBe("#dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(paidRetentionPulse, "Open recovery")?.click();
    });
    expect(window.location.hash).toBe("#dearme-empty-week-recovery");
    await act(async () => {
      buttonByText(paidRetentionPulse, "Open support handoff")?.click();
    });
    expect(window.location.hash).toBe("#dearme-support-handoff");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("If a paid week is empty, DearMe has to recover visibly.");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Zero useful deliverables in seven days is treated as a retention issue");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Recovery needed");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Useful deliverable");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Start recovery");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("one voice-matched content, opportunity, portfolio, or report item");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Fastest path");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Opportunity Scout is working on Opportunity leads");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Warm collaboration and customer leads are being prepared.");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Customer update");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Explain the miss");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("what will be ready next");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Escalation");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Human support");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("support steps in with a plain account handoff");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Make-good brief");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Start one private recovery pass now.");
    expect(emptyWeekRecoveryReceipt.textContent).toContain("Open support handoff");
    const emptyWeekRecoveryNote = surfaceByLabel(
      emptyWeekRecoveryReceipt,
      "Empty week recovery brief note",
    ) as HTMLTextAreaElement;
    expect(emptyWeekRecoveryNote.value).toContain("DearMe empty-week recovery brief");
    expect(emptyWeekRecoveryNote.value).toContain("Visible useful outputs: 0");
    expect(emptyWeekRecoveryNote.value).toContain("Goal: create or refresh one voice-matched content");
    expect(emptyWeekRecoveryNote.value).toContain("Follow-up: Same-day make-good before the next customer check-in.");
    expectNoHiddenProductTerms(emptyWeekRecoveryReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    const paidUserSupportHandoff = surfaceByLabel(container, "Paid user support handoff");
    expect(paidUserSupportHandoff.id).toBe("dearme-support-handoff");
    expect(paidUserSupportHandoff.textContent).toContain("Follow-up");
    expect(paidUserSupportHandoff.textContent).toContain("Same-day make-good");
    await act(async () => {
      buttonByText(emptyWeekRecoveryReceipt, "Open support handoff")?.click();
    });
    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      buttonByText(emptyWeekRecoveryReceipt, "Start recovery")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "handle_feedback",
      message: emptyWeekRecoveryNote.value,
    });
    const emptyWeekRecoveryStartReceipt = surfaceByLabel(
      emptyWeekRecoveryReceipt,
      "Empty week recovery start receipt",
    );
    expect(emptyWeekRecoveryStartReceipt.textContent).toContain("Recovery brief sent");
    expect(emptyWeekRecoveryStartReceipt.textContent).toContain("Voice & Memory learning, recovery work");
    expect(emptyWeekRecoveryStartReceipt.textContent).toContain("Open recovery work");
    expect(emptyWeekRecoveryStartReceipt.textContent).toContain("Open Voice & Memory");

    await act(async () => {
      buttonByText(emptyWeekRecoveryStartReceipt, "Open recovery work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-22");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(emptyWeekRecoveryStartReceipt, "Open Voice & Memory")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");

    await act(async () => {
      root.unmount();
    });
  });

  it("carries repeated-path context into paid support handoff", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const stuckWorkbench = workbenchResponse();
    stuckWorkbench.workReady[1] = {
      ...stuckWorkbench.workReady[1],
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "This path has reached the retry limit and needs clearer direction before another pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Still does not sound like me.",
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(stuckWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const paidUserOperationsReceipt = surfaceByLabel(container, "Paid user operations receipt");
    expect(paidUserOperationsReceipt.textContent).toContain("Recovery path");
    expect(paidUserOperationsReceipt.textContent).toContain("Needs direction");
    expect(paidUserOperationsReceipt.textContent).toContain("Operations risk needs an owner now.");
    expect(paidUserOperationsReceipt.textContent).toContain("Open the support handoff before another repeated path");
    expect(paidUserOperationsReceipt.textContent).toContain("Starter posts");
    expect(buttonByText(paidUserOperationsReceipt, "Open recovery")).toBeUndefined();
    expect(buttonByText(paidUserOperationsReceipt, "Open stuck work")).not.toBeNull();
    expect(buttonByText(paidUserOperationsReceipt, "Open support handoff")).not.toBeNull();
    const paidUserOperationsNote = surfaceByLabel(
      paidUserOperationsReceipt,
      "Paid user operations receipt note",
    ) as HTMLTextAreaElement;
    expect(paidUserOperationsNote.value).toContain("DearMe paid user operations receipt");
    expect(paidUserOperationsNote.value).toContain("Recovery path: Needs direction");
    expect(paidUserOperationsNote.value).toContain("Next support step: Open the support handoff before another repeated path");
    expectNoHiddenProductTerms(
      `${paidUserOperationsReceipt.textContent ?? ""} ${paidUserOperationsNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );

    const paidRetentionPulse = surfaceByLabel(container, "Paid retention pulse");
    expect(paidRetentionPulse.textContent).toContain("Needs direction");
    expect(paidRetentionPulse.textContent).toContain("Risk owner");
    expect(paidRetentionPulse.textContent).toContain("Support");
    expect(paidRetentionPulse.textContent).toContain("Retention risk is support-owned now.");
    expect(paidRetentionPulse.textContent).toContain("Open stuck work");
    expect(paidRetentionPulse.textContent).toContain("Open support handoff");
    const paidRetentionPulseNote = surfaceByLabel(paidRetentionPulse, "Paid retention pulse note") as HTMLTextAreaElement;
    expect(paidRetentionPulseNote.value).toContain("DearMe paid retention pulse");
    expect(paidRetentionPulseNote.value).toContain("Status: Needs direction");
    expect(paidRetentionPulseNote.value).toContain("Retention owner: Support");
    expect(paidRetentionPulseNote.value).toContain("Risk reason: A repeated path needs clearer direction");
    expect(paidRetentionPulseNote.value).toContain("Action: open the stuck work or support handoff");
    expectNoHiddenProductTerms(paidRetentionPulse.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    const autonomyContractReceipt = surfaceByLabel(container, "Autonomy contract receipt");
    const autonomyContractAction = surfaceByLabel(autonomyContractReceipt, "Autonomy contract action");
    expect(autonomyContractAction.textContent).toContain("Autonomy has a next step, not just a boundary.");
    expect(autonomyContractAction.textContent).toContain("A repeated path is stopped");
    expect(autonomyContractAction.textContent).toContain("Starter posts");
    expect(autonomyContractAction.textContent).toContain("Open stuck work");
    expect(autonomyContractAction.textContent).toContain("Open support handoff");
    expectNoHiddenProductTerms(autonomyContractAction.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      buttonByText(autonomyContractAction, "Open stuck work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-8");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(autonomyContractAction, "Open support handoff")?.click();
    });

    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      buttonByText(paidRetentionPulse, "Open stuck work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-8");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(paidRetentionPulse, "Open support handoff")?.click();
    });

    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      buttonByText(paidUserOperationsReceipt, "Open stuck work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-8");
    mockNavigate.mockClear();

    const paidUserSupportHandoff = surfaceByLabel(container, "Paid user support handoff");
    const paidUserSupportNote = surfaceByLabel(paidUserSupportHandoff, "Support handoff note") as HTMLTextAreaElement;
    expect(paidUserSupportNote.value).toContain("Recovery: Needs clearer direction before another pass");
    expect(paidUserSupportNote.value).toContain("Stuck path: Starter posts");
    expect(paidUserSupportNote.value).toContain("Three posts are ready for voice review. (3/3 attempts)");
    expect(paidUserSupportNote.value).toContain("Follow-up: Before another pass");
    expect(paidUserSupportHandoff.textContent).toContain("Before another pass");
    expect(paidUserSupportHandoff.textContent).toContain("Open stuck work");

    await act(async () => {
      buttonByText(paidUserOperationsReceipt, "Open support handoff")?.click();
    });

    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      buttonByText(paidUserSupportHandoff, "Open stuck work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-8");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(paidUserSupportHandoff, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "handle_feedback",
      message: paidUserSupportNote.value,
    });
    const supportFeedbackReceipt = surfaceByLabel(
      paidUserSupportHandoff,
      "Support handoff feedback receipt",
    );
    expect(supportFeedbackReceipt.textContent).toContain("Feedback brief sent");
    expect(supportFeedbackReceipt.textContent).toContain("Open stuck work");
    expect(supportFeedbackReceipt.textContent).toContain("Open feedback work");

    await act(async () => {
      buttonByText(supportFeedbackReceipt, "Open stuck work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-8");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(supportFeedbackReceipt, "Open feedback work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-22");

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews a Work Ready card inline without opening a private issue", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const workReady = surfaceByLabel(container, "Work ready");
    expect(workReady.textContent).toContain("Launch this work");
    expect(workReady.textContent).toContain("Request changes");
    expect(workReady.textContent).toContain("Prepare another pass");
    expect(workReady.textContent).toContain("Choose new direction");
    const workReadyOutcomeMap = surfaceByLabel(workReady, "Decision outcome map");
    expect(workReadyOutcomeMap.textContent).toContain("After your call");
    expect(workReadyOutcomeMap.textContent).toContain("DearMe records approval, prepares the handoff");
    expect(workReadyOutcomeMap.textContent).toContain("Your note becomes the next brief");
    expect(workReadyOutcomeMap.textContent).toContain("stops spending cycles on this angle");

    await act(async () => {
      setTextareaValue(
        workReady.querySelector("#dearme-work-ready-output-note-0") as HTMLTextAreaElement,
        "Keep the proof concrete before this represents me.",
      );
      buttonByText(workReady, "Request changes")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      {
        intent: "continue_revision",
        decisionNote: "Keep the proof concrete before this represents me.",
      },
    );
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));

    await act(async () => {
      root.unmount();
    });
  });

  it("locks inline Work Ready review controls when a path is capped", async () => {
    const response = workbenchResponse();
    response.workReady[0] = {
      ...response.workReady[0]!,
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "This path hit the retry limit. Improve direction before another pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          isRetriable: false,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Still too generic.",
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const workReady = surfaceByLabel(container, "Work ready");
    const cappedCard = [...workReady.querySelectorAll<HTMLElement>('[data-dearme-surface="action-card"]')]
      .find((card) => card.textContent?.includes("Dear me report"));
    if (!cappedCard) throw new Error("Expected capped Work Ready card.");

    expect(cappedCard.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );
    expect(buttonByText(cappedCard, "Launch this work")?.disabled).toBe(true);
    expect(buttonByText(cappedCard, "Request changes")?.disabled).toBe(true);
    expect(buttonByText(cappedCard, "Prepare another pass")?.disabled).toBe(true);

    await act(async () => {
      buttonByText(cappedCard, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews live proof feed work without leaving DearMe", async () => {
    const contentOutput = outputsWithFirstCyclePacket().outputs[1]!;
    mockDearmeApi.continueOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: "issue-2:content_drafts",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-live-feed-1",
        bodyPreview: "DearMe decision: prepare another pass before review.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: {
        ...contentOutput,
        status: "working",
        isReviewable: false,
        reviewLoop: reviewLoopFixture(
          "regeneration_requested",
          "Your team has your direction and should prepare another version.",
          {
            attemptCount: 1,
            lastAction: "regenerate",
            lastDecisionAt: "2026-05-07T14:05:00.000Z",
            lastDecisionNotePreview: "Try a proof-led version before I review it.",
          },
        ),
      },
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const liveFeed = surfaceByLabel(container, "Live proof feed");
    expect(liveFeed.textContent).toContain("Review this brand work here.");
    expect(liveFeed.textContent).toContain("Launch this work");
    expect(liveFeed.textContent).toContain("Request changes");
    expect(liveFeed.textContent).toContain("Prepare another pass");
    expect(liveFeed.textContent).toContain("Choose new direction");
    const liveFeedOutcomeMap = surfaceByLabel(liveFeed, "Decision outcome map");
    expect(liveFeedOutcomeMap.textContent).toContain("After your call");
    expect(liveFeedOutcomeMap.textContent).toContain("Your note becomes the next brief");
    expect(liveFeedOutcomeMap.textContent).toContain("DearMe keeps the goal, reuses the proof");
    expect(liveFeedOutcomeMap.textContent).toContain("stops spending cycles on this angle");

    await act(async () => {
      setTextareaValue(
        liveFeed.querySelector("#dearme-live-feed-output-note-needs_call-0") as HTMLTextAreaElement,
        "Try a proof-led version before I review it.",
      );
      buttonByText(liveFeed, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-2:content_drafts",
      {
        intent: "prepare_another_pass",
        decisionNote: "Try a proof-led version before I review it.",
      },
    );
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("locks inline live proof feed controls when a path is capped", async () => {
    const response = workbenchResponse();
    response.workStream[0] = {
      ...response.workStream[0]!,
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "This path hit the retry limit. Improve direction before another pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          isRetriable: false,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Still too generic.",
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const liveFeed = surfaceByLabel(container, "Live proof feed");
    expect(liveFeed.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );
    expect(buttonByText(liveFeed, "Launch this work")?.disabled).toBe(true);
    expect(buttonByText(liveFeed, "Request changes")?.disabled).toBe(true);
    expect(buttonByText(liveFeed, "Prepare another pass")?.disabled).toBe(true);

    await act(async () => {
      buttonByText(liveFeed, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps DearMe panel load errors customer-safe", async () => {
    mockDearmeApi.getWorkbench.mockRejectedValueOnce(
      new Error("Codex model token failed inside Symphony execution route."),
    );
    mockDearmeApi.getOutputs.mockRejectedValueOnce(new Error("Gemini provider failed inside issue route"));
    mockDearmeApi.getPaidBetaAccess.mockRejectedValueOnce(new Error("Claude API key failed inside OMX runtime"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("DearMe team progress needs attention. Try again before reviewing brand work.");
    expect(text).toContain("Prepared work needs attention. Try again before reviewing drafts.");
    expect(text).toContain("Paid beta status needs attention. Try again before recording a payment.");
    expect(text).not.toContain("Codex");
    expect(text).not.toContain("Symphony");
    expect(text).not.toContain("Claude");
    expect(text).not.toContain("Gemini");
    expect(text).not.toContain("API key");
    expect(text).not.toContain("token");
    expect(text).not.toContain("provider");
    expect(text).not.toContain("runtime");
    expect(text).not.toContain("execution route");
    expect(text).not.toMatch(/issue route/i);

    await act(async () => {
      root.unmount();
    });
  });

  it("renders packet-backed Dear me reports as one proof pack review", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(workbenchResponseWithPacketReport());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const letter = surfaceByLabel(container, "Dear me letter");
    expect(letter.textContent).toContain("Proof pack review");
    expect(letter.textContent).toContain(
      "DearMe prepared the draft and this report from one proof pack.",
    );
    expect(letter.textContent).toContain("Review once");
    expect(letter.textContent).toContain("Voice fit 97/100");
    expect(letter.textContent).toContain("same proof pack");
    expect(letter.textContent).not.toContain("cycle packet");
    expect(letter.textContent).not.toContain("shared packet");

    const continuity = surfaceByLabel(container, "Daily brand cycle");
    expect(continuity.textContent).toContain("Daily brand cycle");
    expect(continuity.textContent).toContain("today's briefing");
    expect(continuity.textContent).toContain("Launch call");
    expect(continuity.textContent).toContain("Current proof pack");
    expect(continuity.textContent).toContain("Next move");
    expect(continuity.textContent).toContain("Briefing updated");
    expect(continuity.textContent).toContain("Launch rules active");
    expect(continuity.textContent).toContain("Ready for review weekly letter");
    expect(continuity.textContent).not.toMatch(/cycle packet|shared packet/i);
    expectNoHiddenProductTerms(continuity.textContent, [
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      "OpenClaw",
      "Paperclip",
    ]);
    expectNoHiddenProductTerms(letter.textContent, [
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      "OpenClaw",
      "Paperclip",
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("sanitizes packet-backed workbench cards outside the Dear me letter", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(workbenchResponseWithPacketWorkbench());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    [
      "Your brand team today",
      "Today's brand team focus",
      "Daily brand cycle",
      "Brand team run ledger",
      "Growth cycle plan",
      "Work ready",
      "Decisions needed",
      "Live proof feed",
    ].forEach((label) => {
      const surfaceText = surfaceByLabel(container, label).textContent ?? "";
      expect(surfaceText).toContain("proof pack");
      expect(surfaceText).not.toMatch(/cycle packet|shared packet/i);
    });
    expect(container.textContent ?? "").not.toMatch(/cycle packet|shared packet/i);

    await act(async () => {
      root.unmount();
    });
  });

  it("revises saved Voice & Memory sources without creating a new source table", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Revise")?.click();
    });

    expect(container.textContent).toContain("Revising a saved source");
    expect(
      (container.querySelector("#dearme-memory-kind") as HTMLSelectElement | null)?.value,
    ).toBe("voice_sample");
    expect(
      (container.querySelector("#dearme-memory-title") as HTMLInputElement | null)?.value,
    ).toBe("Voice note");
    expect(
      (container.querySelector("#dearme-memory-source") as HTMLInputElement | null)?.value,
    ).toBe("Manual note");
    expect((container.querySelector("#dearme-memory-body") as HTMLTextAreaElement | null)?.value).toBe(
      "Short, direct voice note.",
    );

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "Short, direct revised voice note.",
      );
    });

    await act(async () => {
      buttonByText(container, "Save source")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.updateMemorySource).toHaveBeenCalledWith(
      "company-1",
      "memory-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Voice note",
        body: "Short, direct revised voice note.",
        sourceLabel: "Manual note",
      }),
    );
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Short, direct revised voice note.");
    expect(container.textContent).toContain("Just saved");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("retires saved Voice & Memory sources from the visible memory list", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Voice note");

    await act(async () => {
      buttonByText(container, "Retire source")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.archiveMemorySource).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Retire saved source?");
    expect(document.body.textContent).toContain(
      "DearMe will stop using Voice note for future drafts.",
    );
    expect(container.textContent).toContain("Voice note");

    await act(async () => {
      buttonByLabel(document.body, "Confirm retire Voice note")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.archiveMemorySource).toHaveBeenCalledWith("company-1", "memory-1");
    expect(container.textContent).not.toContain("Voice note");
    expect(container.textContent).toContain("Shipped proof");
    expect(container.textContent).toContain("Retire source");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps Voice & Memory source save errors customer-safe", async () => {
    mockDearmeApi.recordMemoryUpdate.mockRejectedValueOnce(
      new Error("Provider workspace runtime rejected setup_payload for Paperclip adapter source."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "A short private writing sample.",
      );
      buttonByText(container, "Add to Voice & Memory")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Voice & Memory needs attention. Try again before adding or editing saved sources.");
    expect(text).not.toContain("Provider workspace runtime");
    expect(text).not.toContain("setup_payload");
    expect(text).not.toContain("Paperclip adapter");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps Voice & Memory source retire errors customer-safe", async () => {
    mockDearmeApi.archiveMemorySource.mockRejectedValueOnce(
      new Error("Runtime workbench provider failed to archive adapter workspace source."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Retire source")?.click();
    });
    await flushReact();

    expect(document.body.textContent).toContain("Retire saved source?");

    await act(async () => {
      buttonByLabel(document.body, "Confirm retire Voice note")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Voice & Memory needs attention. Try again before retiring a saved source.");
    expect(text).not.toContain("Runtime workbench provider");
    expect(text).not.toContain("adapter workspace source");
    expect(text).toContain("Voice note");

    await act(async () => {
      root.unmount();
    });
  });

  it("restores retired Voice & Memory sources from the private memory list", async () => {
    const response = workbenchResponse();
    const retiredSource = {
      ...response.memory.latest[0]!,
      id: "memory-retired",
      title: "Retired voice note",
      body: "Short retired voice note.",
      bodyPreview: "Short retired voice note.",
      createdAt: "2026-05-07T13:30:00.000Z",
    };
    mockDearmeApi.getWorkbench.mockResolvedValue({
      ...response,
      memory: {
        ...response.memory,
        archived: [retiredSource],
      },
    });
    mockDearmeApi.restoreMemorySource.mockResolvedValue({
      companyId: "company-1",
      status: "recorded",
      memory: {
        ...retiredSource,
        createdAt: "2026-05-07T14:08:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 3,
      },
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Retired sources");
    expect(container.textContent).toContain("Retired voice note");

    await act(async () => {
      buttonByText(container, "Restore")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.restoreMemorySource).toHaveBeenCalledWith("company-1", "memory-retired");
    expect(container.textContent).toContain("Just saved");
    expect(container.textContent).not.toContain("Retired sources");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps Voice & Memory source restore errors customer-safe", async () => {
    const response = workbenchResponse();
    const retiredSource = {
      ...response.memory.latest[0]!,
      id: "memory-retired",
      title: "Retired voice note",
      body: "Short retired voice note.",
      bodyPreview: "Short retired voice note.",
      createdAt: "2026-05-07T13:30:00.000Z",
    };
    mockDearmeApi.getWorkbench.mockResolvedValue({
      ...response,
      memory: {
        ...response.memory,
        archived: [retiredSource],
      },
    });
    mockDearmeApi.restoreMemorySource.mockRejectedValueOnce(
      new Error("OpenClaw provider runtime could not restore workspace source."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Restore")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Voice & Memory needs attention. Try again before restoring a saved source.");
    expect(text).not.toContain("OpenClaw provider runtime");
    expect(text).not.toContain("workspace source");
    expect(text).toContain("Retired voice note");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows a private sample team package before the user enters positioning", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Sample team package");
    expect(container.textContent).toContain("Proof preview");
    expect(container.textContent).toContain("Maya's team prepared posts");
    const sampleProofPackage = surfaceByLabel(container, "Sample first-cycle proof package");
    const firstCycleIntent = container.querySelector("#dearme-first-cycle-intent");
    expect(firstCycleIntent).not.toBeNull();
    expect(
      Boolean(sampleProofPackage.compareDocumentPosition(firstCycleIntent as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(container.textContent).toContain("Maya Chen");
    expect(container.textContent).toContain(
      "Known for turning messy customer research into calm B2B product decisions",
    );
    expect(container.textContent).toContain("First-run proof sequence");
    expect(container.textContent).toContain("Live work receipts");
    expect(container.querySelector('[aria-label="First-run live work receipts"]')).not.toBeNull();
    expect(container.textContent).toContain("Studying your voice");
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("5 starter drafts");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain("Identity dossier");
    expect(container.textContent).toContain("Audience map");
    expect(container.textContent).toContain("Proof page");
    expect(container.textContent).toContain("Voice profile and known-for line");
    expect(container.textContent).toContain("Audience shortlist and first opportunity");
    expect(container.textContent).toContain("Proof page move");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("Autopilot until launch");
    expect(container.textContent).toContain("Capture the positioning");
    expect(container.textContent).toContain("Launch calls only");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next proof review");
    expect(container.textContent).toContain("First value report");
    expect(container.textContent).toContain("First five minutes");
    expect(container.textContent).toContain("Opportunity coverage staged");
    expect(container.textContent).toContain("Launch risk kept behind the launch call");
    expect(container.querySelector('[aria-label="First-cycle value report"]')).not.toBeNull();
    expect(container.textContent).toContain("Sharpen the next draft");
    expect(container.textContent).toContain("Next proof-backed draft");
    expect(container.textContent).toContain("Updated opportunity angle");
    expect(container.textContent).toContain("Updated proof card");
    expect(container.textContent).toContain("Starter post: point of view");
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Five launch-ready targets");
    expect(container.textContent).toContain("Direct customer lead");
    expect(container.textContent).toContain("9/10");
    expect(container.textContent).toContain("Warm intro lead");
    expect(container.textContent).toContain("Portfolio proof card");
    expect(container.textContent).toContain("First growth plan");
    expect(container.textContent).toContain("Ready to launch, with you in control");
    expect(container.textContent).toContain("Source proof: Ran 42 customer interviews that changed a pricing launch");
    expect(container.textContent).toContain("Delivery receipts");
    expect(container.textContent).toContain("Launched work comes back with a result");
    expect(container.textContent).toContain("X post delivered");
    expect(container.textContent).toContain("DearMe recorded the delivery receipt for the launched next step.");
    expect(container.textContent).toContain("Reference x-post-42");
    expect(container.textContent).toContain("Review the delivered post, then let DearMe prepare the next proof-backed opportunity.");
    expect(container.textContent).toContain("X post needs connection");
    expect(container.textContent).toContain("Needs connection");
    expect(container.textContent).toContain("Add the selected X account before DearMe can continue this next step.");
    expect(container.textContent).not.toContain("needs_channel_connection");
    expect(container.textContent).not.toContain("Approval-gated by default");
    expect(mockDearmeApi.previewFirstCycle).not.toHaveBeenCalled();
    expect(mockDearmeApi.startFirstCycle).not.toHaveBeenCalled();
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("starts a 90-second first cycle from one positioning answer", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const {
      valueReport: omittedValueReport,
      opportunityRoiReport: omittedOpportunityRoiReport,
      cycleReport: omittedCycleReport,
      voiceProfile: omittedVoiceProfile,
      autonomyPlan: omittedAutonomyPlan,
      continuationPlan: omittedContinuationPlan,
      ...legacyFirstCyclePreview
    } =
      createFirstCyclePreview();
    void omittedValueReport;
    void omittedOpportunityRoiReport;
    void omittedCycleReport;
    void omittedVoiceProfile;
    void omittedAutonomyPlan;
    void omittedContinuationPlan;
    mockDearmeApi.startFirstCycle.mockResolvedValueOnce(legacyFirstCyclePreview);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("90-second first cycle");
    expect(container.textContent).toContain("What do you want to become known for?");
    expect(container.textContent).toContain("Sample team package");

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLTextAreaElement,
        "Known for turning research into practical AI products",
      );
    });

    await act(async () => {
      buttonByText(container, "Start first cycle")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.startFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          positioning: "Known for turning research into practical AI products",
          preferredChannels: ["linkedin", "newsletter", "portfolio"],
        }),
      }),
    );
    expect(mockDearmeApi.previewFirstCycle).not.toHaveBeenCalled();
    expect(container.textContent).toContain("First-run proof sequence");
    expect(container.textContent).toContain("Live work receipts");
    expect(container.querySelector('[aria-label="First-run live work receipts"]')).not.toBeNull();
    expect(container.textContent).toContain("Drafting first moves");
    expect(container.textContent).toContain("Content Producer");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain("Your first five minutes are ready.");
    expect(container.textContent).toContain("DearMe prepared the visible first pass");
    const firstCycleStartReceipt = surfaceByLabel(container, "First cycle start receipt");
    expect(firstCycleStartReceipt.textContent).toContain("First brand cycle started");
    expect(firstCycleStartReceipt.textContent).toContain("Work Ready will update");
    expect(firstCycleStartReceipt.textContent).toContain("Launch call gated");
    expect(firstCycleStartReceipt.textContent).toContain("Target: 5 minutes");
    expect(firstCycleStartReceipt.textContent).toContain("Draft package");
    expect(firstCycleStartReceipt.textContent).toContain("5 drafts");
    expect(firstCycleStartReceipt.textContent).toContain("Opportunity shortlist");
    expect(firstCycleStartReceipt.textContent).toContain("5 opportunities");
    expect(firstCycleStartReceipt.textContent).toContain("Value report");
    expect(firstCycleStartReceipt.textContent).toContain("4 receipts");
    expect(firstCycleStartReceipt.textContent).toContain("ROI-ranked opportunities");
    expect(firstCycleStartReceipt.textContent).toContain("5 ranked");
    expect(firstCycleStartReceipt.textContent).toContain("Call gated");
    expect(firstCycleStartReceipt.textContent).toContain("Review Work Ready");
    expect(firstCycleStartReceipt.textContent).toContain("Download receipt");
    expect(firstCycleStartReceipt.textContent).toContain("Open proof page");
    const firstCycleStartReceiptNote = surfaceByLabel(
      firstCycleStartReceipt,
      "First cycle start receipt note",
    ) as HTMLTextAreaElement;
    expect(firstCycleStartReceiptNote.value).toContain("DearMe first cycle start receipt");
    expect(firstCycleStartReceiptNote.value).toContain(
      "Known-for sentence: Known for turning research into practical AI products",
    );
    expect(firstCycleStartReceiptNote.value).toContain("Draft package: 5 drafts");
    expect(firstCycleStartReceiptNote.value).toContain("Opportunity shortlist: 5 opportunities");
    expect(firstCycleStartReceiptNote.value).toContain("Value report: 4 receipts");
    expect(firstCycleStartReceiptNote.value).toContain("ROI-ranked opportunities: 5 ranked");
    expect(firstCycleStartReceiptNote.value).toContain("Launch boundary:");
    expectNoHiddenProductTerms(firstCycleStartReceiptNote.value, Object.values(HIDDEN_PRODUCT_TERMS));
    await act(async () => {
      buttonByText(firstCycleStartReceipt, "Review Work Ready")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=brand-os#dearme-work-ready");
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("0-30s");
    expect(container.textContent).toContain("60-120s");
    expect(container.textContent).toContain("3-5min");
    expect(container.textContent).toContain("Identity dossier");
    expect(container.textContent).toContain("Audience map");
    expect(container.textContent).toContain("Proof page");
    expect(container.textContent).toContain("Voice profile and known-for line");
    expect(container.textContent).toContain("Prepared from profile work");
    expect(container.textContent).toContain("Audience shortlist and first opportunity");
    expect(container.textContent).toContain("Proof page move");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("Voice check");
    expect(container.textContent).toContain("Voice 100/100");
    expect(container.textContent).toContain("Autopilot until launch");
    expect(container.textContent).toContain("Prepare the next pass");
    expect(container.textContent).toContain("Launch calls only");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next proof review");
    expect(container.textContent).toContain("First value report");
    expect(container.textContent).toContain("Reviewable assets prepared");
    expect(container.textContent).toContain("Proof loop opened");
    expect(container.querySelector('[aria-label="First-cycle value report"]')).not.toBeNull();
    const storedFirstCyclePreview = readDearMeFirstCyclePreview("company-1", "peter-studio");
    expect(storedFirstCyclePreview?.valueReport.title).toBe("First value report");
    expect(storedFirstCyclePreview?.opportunityRoiReport.title).toBe("Opportunity ROI report");
    expect(storedFirstCyclePreview?.cycleReport.title).toBe("First-cycle report");
    expect(container.textContent).toContain("Sharpen the next draft");
    expect(container.textContent).toContain("Updated opportunity angle");
    expect(container.textContent).toContain("Updated proof card");
    expect(container.textContent).toContain("Starter post: point of view");
    expect(container.textContent).toContain("Starter post: proof of work");
    expect(container.textContent).toContain("Starter post: useful opening");
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Opportunity ROI report");
    expect(container.querySelector('[aria-label="Opportunity ROI report"]')).not.toBeNull();
    expect(container.textContent).toContain("Launch-call candidate");
    expect(container.textContent).toContain("Warm intro path");
    expect(container.textContent).toContain("Five launch-ready targets");
    expect(container.textContent).toContain("Podcast guest lead");
    expect(container.textContent).toContain("7/10");
    expect(container.textContent).toContain("Portfolio proof card");
    expect(container.textContent).toContain("First growth plan");
    expect(container.textContent).toContain("Ready to launch, with you in control");
    expect(container.textContent).toContain("Source proof: Shipped a working local product");
    expect(container.textContent).toContain("Post publicly");
    expect(container.textContent).toContain("Update the public page");
    expect(container.textContent).not.toContain("Approval-gated by default");
    expect(container.textContent).not.toContain("Sample team package");
    expect(container.querySelector("#dearme-positioning")).toBeNull();
    await openFullProfileControls(container);
    expect((container.querySelector("#dearme-positioning") as HTMLTextAreaElement | null)?.value).toBe(
      "Known for turning research into practical AI products",
    );
    expect(container.textContent).not.toMatch(/\bqueue\b/i);
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("downloads the first cycle start receipt after private work starts", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLTextAreaElement,
        "Known for turning research into practical AI products",
      );
      buttonByText(container, "Start first cycle")?.click();
    });
    await flushReact();

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:dearme-first-cycle-start";
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    try {
      await act(async () => {
        buttonByLabel(container, "Download first-cycle-start-receipt.txt")?.click();
      });

      expect(clickedDownloads).toEqual(["first-cycle-start-receipt.txt"]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-first-cycle-start");
      await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe first cycle start receipt");
      await expect(createdBlobs[0]?.text()).resolves.toContain(
        "Known-for sentence: Known for turning research into practical AI products",
      );
      await expect(createdBlobs[0]?.text()).resolves.toContain("Draft package: 5 drafts");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Opportunity shortlist: 5 opportunities");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Value report: 4 receipts");
      await expect(createdBlobs[0]?.text()).resolves.toContain("ROI-ranked opportunities: 5 ranked");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Next: review Work Ready");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps first-cycle action errors customer-safe", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.startFirstCycle.mockRejectedValueOnce(
      new Error("Codex model token failed inside Symphony execution route."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLTextAreaElement,
        "Known for turning research into practical AI products",
      );
      buttonByText(container, "Start first cycle")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("First cycle needs attention. Try again before starting brand work.");
    expect(text).not.toContain("Codex");
    expect(text).not.toContain("Symphony");
    expect(text).not.toContain("token");
    expect(text).not.toContain("execution route");

    await act(async () => {
      root.unmount();
    });
  });

  it("previews the first cycle during trial without starting brand work", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("90-second first cycle");
    expect(container.textContent).toContain("Preview first cycle");
    expect(container.textContent).toContain("Sample team package");
    expect(surfaceByLabel(container, "First payoff").textContent).toContain("Preview the first brand cycle");

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLTextAreaElement,
        "Known for turning private agent work into clear public proof",
      );
    });

    await act(async () => {
      buttonByText(container, "Preview first cycle")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.previewFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          positioning: "Known for turning private agent work into clear public proof",
          preferredChannels: ["linkedin", "newsletter", "portfolio"],
        }),
      }),
    );
    expect(mockDearmeApi.startFirstCycle).not.toHaveBeenCalled();
    expect(container.textContent).toContain("First-run proof sequence");
    expect(container.textContent).toContain("Live work receipts");
    expect(container.textContent).toContain("Finding likely audiences");
    expect(container.textContent).toContain("Opportunity Scout");
    expect(container.textContent).toContain("Your first five minutes are ready.");
    expect(container.textContent).toContain("Prepared from profile work");
    expect(container.querySelector('[aria-label="First cycle start receipt"]')).toBeNull();
    expect(container.textContent).toContain("dearme.app/peter-studio");
    expect(container.textContent).toContain("Ready when you choose to launch");
    expect(container.textContent).not.toContain("Ready for approval");
    expect(container.textContent).not.toContain("Sample team package");
    expect(readDearMeFirstCyclePreview("company-1", "peter-studio")).not.toBeNull();

    await act(async () => {
      buttonByText(container, "Open proof preview")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme/site-preview/peter-studio");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps private team start locked during trial preview", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Trial preview");
    expect(container.textContent).toContain("Record paid beta payment");
    expect(container.textContent).toContain("Cycle guardrail");
    expect(container.textContent).toContain("Brand cycles wait for paid beta access");
    expect(container.textContent).toContain("Decision needed: Record paid beta access");
    const launchReadiness = surfaceByLabel(container, "Launch readiness");
    expect(launchReadiness.textContent).toContain("Setup needed");
    expect(launchReadiness.textContent).toContain("Paid beta needed");
    const launchReadinessNote = surfaceByLabel(
      launchReadiness,
      "Launch readiness receipt note",
    ) as HTMLTextAreaElement;
    expect(launchReadinessNote.value).toContain("DearMe launch readiness receipt");
    expect(launchReadinessNote.value).toContain("Status: Paid beta access needed");
    expect(launchReadinessNote.value).toContain("Next support step: Open paid beta access");
    expect(launchReadinessNote.value).toContain("Must wait: public posts");
    expectNoHiddenProductTerms(launchReadiness.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const commercialReadiness = surfaceByLabel(container, "Commercial readiness");
    expect(commercialReadiness.textContent).toContain("Sell private beta");
    expect(commercialReadiness.textContent).toContain("Private beta sale");
    expect(commercialReadiness.textContent).toContain("Ready to sell");
    expect(commercialReadiness.textContent).toContain("Paid user support");
    expect(commercialReadiness.textContent).toContain("Access first");
    expect(commercialReadiness.textContent).toContain("Public launch proof");
    expect(commercialReadiness.textContent).toContain("Receipts needed");
    const commercialReadinessNote = surfaceByLabel(
      commercialReadiness,
      "Commercial readiness receipt note",
    ) as HTMLTextAreaElement;
    expect(commercialReadinessNote.value).toContain("DearMe commercial readiness receipt");
    expect(commercialReadinessNote.value).toContain("Status: Private beta ready to sell");
    expect(commercialReadinessNote.value).toContain("Next support step: Sell private beta");
    expect(commercialReadinessNote.value).toContain("Cannot claim yet: broad public launch");
    expectNoHiddenProductTerms(commercialReadiness.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidCohortHealthReceipt = surfaceByLabel(container, "Paid cohort health receipt");
    expect(paidCohortHealthReceipt.textContent).toContain("Paid cohort");
    expect(paidCohortHealthReceipt.textContent).toContain("Ready after access");
    expect(paidCohortHealthReceipt.textContent).toContain("Accounts");
    expect(paidCohortHealthReceipt.textContent).toContain("Access first");
    expect(paidCohortHealthReceipt.textContent).toContain("Credit");
    expect(paidCohortHealthReceipt.textContent).toContain("Guardrails");
    expect(paidCohortHealthReceipt.textContent).toContain("Attention");
    expectNoHiddenProductTerms(paidCohortHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expect(mockDearmeApi.getPaidBetaCohort).not.toHaveBeenCalled();
    const weeklyValueReceipt = surfaceByLabel(container, "Weekly value receipt");
    expect(weeklyValueReceipt.textContent).toContain("Seven-day value");
    expect(weeklyValueReceipt.textContent).toContain("Ready after access");
    expect(weeklyValueReceipt.textContent).toContain("Useful outputs");
    expect(weeklyValueReceipt.textContent).toContain("Opens after access");
    expect(weeklyValueReceipt.textContent).toContain("The weekly value loop is shaped");
    expect(weeklyValueReceipt.textContent).toContain("Weekly report");
    expect(weeklyValueReceipt.textContent).toContain("Briefing ready");
    expect(weeklyValueReceipt.textContent).toContain("Empty-week recovery");
    expect(weeklyValueReceipt.textContent).toContain("Covered");
    expect(weeklyValueReceipt.textContent).toContain("Download receipt");
    const weeklyValueNote = surfaceByLabel(container, "Weekly value receipt note") as HTMLTextAreaElement;
    expect(weeklyValueNote.value).toContain("DearMe weekly value receipt");
    expect(weeklyValueNote.value).toContain("Report: Dear me report");
    expect(weeklyValueNote.value).toContain("Ready work: Dear me report");
    expect(weeklyValueNote.value).toContain("Voice & Memory:");
    expect(weeklyValueNote.value).toContain("Voice 55%");
    expectNoHiddenProductTerms(weeklyValueReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidAccountHealthReceipt = surfaceByLabel(container, "Paid account health receipt");
    expect(paidAccountHealthReceipt.textContent).toContain("Account health");
    expect(paidAccountHealthReceipt.textContent).toContain("Ready after access");
    expect(paidAccountHealthReceipt.textContent).toContain("Outcome target");
    expect(paidAccountHealthReceipt.textContent).toContain("Opens after access");
    expect(paidAccountHealthReceipt.textContent).toContain("Voice fit");
    expect(paidAccountHealthReceipt.textContent).toContain("Voice 55%");
    expect(paidAccountHealthReceipt.textContent).toContain("Launch progress");
    expect(paidAccountHealthReceipt.textContent).toContain("4 calls");
    expect(paidAccountHealthReceipt.textContent).toContain("Cost clarity");
    expect(paidAccountHealthReceipt.textContent).toContain("Spend visible");
    expectNoHiddenProductTerms(paidAccountHealthReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidRetentionPulse = surfaceByLabel(container, "Paid retention pulse");
    expect(paidRetentionPulse.textContent).toContain("Retention pulse");
    expect(paidRetentionPulse.textContent).toContain("Ready after access");
    expect(paidRetentionPulse.textContent).toContain("Customer value");
    expect(paidRetentionPulse.textContent).toContain("Access first");
    expect(paidRetentionPulse.textContent).toContain("Download receipt");
    const unpaidRetentionPulseNote = surfaceByLabel(paidRetentionPulse, "Paid retention pulse note") as HTMLTextAreaElement;
    expect(unpaidRetentionPulseNote.value).toContain("DearMe paid retention pulse");
    expect(unpaidRetentionPulseNote.value).toContain("Status: Ready after access");
    expect(unpaidRetentionPulseNote.value).toContain("Retention owner: Sales");
    expect(unpaidRetentionPulseNote.value).toContain("Next support step: Follow up after paid beta access is recorded.");
    expectNoHiddenProductTerms(paidRetentionPulse.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const autonomyContractReceipt = surfaceByLabel(container, "Autonomy contract receipt");
    expect(autonomyContractReceipt.textContent).toContain("Autonomy contract");
    expect(autonomyContractReceipt.textContent).toContain("Ready after access");
    expect(autonomyContractReceipt.textContent).toContain("Read-only research");
    expect(autonomyContractReceipt.textContent).toContain("Starts after access");
    expect(autonomyContractReceipt.textContent).toContain("Team preparation");
    expect(autonomyContractReceipt.textContent).toContain("Access first");
    expect(autonomyContractReceipt.textContent).toContain("Launch actions");
    expect(autonomyContractReceipt.textContent).toContain("4 calls");
    const autonomyContractNote = surfaceByLabel(container, "Autonomy contract note") as HTMLTextAreaElement;
    expect(autonomyContractNote.value).toContain("DearMe autonomy contract");
    expect(autonomyContractNote.value).toContain("Account: waiting for paid beta access");
    expect(autonomyContractNote.value).toContain("Must ask first: public posts, outreach, page changes");
    expectNoHiddenProductTerms(
      `${autonomyContractReceipt.textContent ?? ""} ${autonomyContractNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidUserSupportHandoff = surfaceByLabel(container, "Paid user support handoff");
    expect(paidUserSupportHandoff.textContent).toContain("Support handoff");
    expect(paidUserSupportHandoff.textContent).toContain("Use after access");
    expect(paidUserSupportHandoff.textContent).toContain("Account state");
    expect(paidUserSupportHandoff.textContent).toContain("Access first");
    expect(paidUserSupportHandoff.textContent).toContain("Take payment and record access");
    expect(paidUserSupportHandoff.textContent).toContain("Latest context");
    expect(paidUserSupportHandoff.textContent).toContain("Starter context");
    expect(paidUserSupportHandoff.textContent).toContain("Support notes become feedback work");
    const lockedSupportHandoffButton = buttonByText(paidUserSupportHandoff, "Send to Chief of Staff");
    expect(lockedSupportHandoffButton?.disabled).toBe(true);
    const paidUserSupportNote = surfaceByLabel(container, "Support handoff note") as HTMLTextAreaElement;
    expect(paidUserSupportNote.value).toContain("DearMe support handoff");
    expect(paidUserSupportNote.value).toContain("Account: Waiting for paid beta access");
    expect(paidUserSupportNote.value).toContain("Latest work: Trial preview only");
    expect(paidUserSupportNote.value).toContain("Decisions: 4 waiting decisions");
    expect(paidUserSupportNote.value).toContain("Cost: DearMe recorded $2.37 of brand team work");
    expectNoHiddenProductTerms(
      `${paidUserSupportHandoff.textContent ?? ""} ${paidUserSupportNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    expect(mockDearmeApi.sendChiefOfStaffMessage).not.toHaveBeenCalled();
    const paidBetaReceipt = surfaceByLabel(container, "Paid beta operating receipt");
    expect(paidBetaReceipt.textContent).toContain("Private beta sale is ready when access is recorded.");
    expect(paidBetaReceipt.textContent).toContain("Awaiting paid access");
    expect(paidBetaReceipt.textContent).toContain("Access receipt");
    expect(paidBetaReceipt.textContent).toContain("Record access");
    expect(paidBetaReceipt.textContent).toContain("Brand work");
    expect(paidBetaReceipt.textContent).toContain("Locked");
    expect(paidBetaReceipt.textContent).toContain("Support boundary");
    expect(paidBetaReceipt.textContent).toContain("Ready after access");
    expect(paidBetaReceipt.textContent).toContain("hosted checkout setup");
    expect(paidBetaReceipt.textContent).toContain("Download receipt");
    const unpaidPaidBetaOperatingNote = surfaceByLabel(
      paidBetaReceipt,
      "Paid beta operating receipt note",
    ) as HTMLTextAreaElement;
    expect(unpaidPaidBetaOperatingNote.value).toContain("DearMe paid beta operating receipt");
    expect(unpaidPaidBetaOperatingNote.value).toContain("Account: Awaiting paid access");
    expect(unpaidPaidBetaOperatingNote.value).toContain("Access receipt: Record access");
    expect(unpaidPaidBetaOperatingNote.value).toContain("Brand work: Locked");
    expect(unpaidPaidBetaOperatingNote.value).toContain("Payment reference: Record after payment");
    expect(unpaidPaidBetaOperatingNote.value).toContain("Next support step: Collect the private-beta payment");
    expectNoHiddenProductTerms(
      `${paidBetaReceipt.textContent ?? ""} ${unpaidPaidBetaOperatingNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaCustomerReceipt = surfaceByLabel(container, "Paid beta customer receipt");
    expect(paidBetaCustomerReceipt.textContent).toContain("Customer receipt");
    expect(paidBetaCustomerReceipt.textContent).toContain("Receipt appears after paid access is recorded.");
    expect(paidBetaCustomerReceipt.textContent).toContain("Waiting for payment");
    expect(paidBetaCustomerReceipt.textContent).toContain("Access");
    expect(paidBetaCustomerReceipt.textContent).toContain("Not open yet");
    expect(paidBetaCustomerReceipt.textContent).toContain("Receipt note");
    expect(paidBetaCustomerReceipt.textContent).toContain("Waiting for payment");
    expect(paidBetaCustomerReceipt.textContent).toContain("Reference");
    expect(paidBetaCustomerReceipt.textContent).toContain("Add after payment");
    expect(paidBetaCustomerReceipt.textContent).toContain("Take payment first");
    expect(paidBetaCustomerReceipt.textContent).toContain("Save a reference");
    expect(paidBetaCustomerReceipt.textContent).toContain("Then start work");
    const unpaidPaidBetaCustomerReceiptNote = surfaceByLabel(
      container,
      "Paid beta customer receipt note",
    ) as HTMLTextAreaElement;
    expect(unpaidPaidBetaCustomerReceiptNote.value).toContain("DearMe paid beta customer receipt");
    expect(unpaidPaidBetaCustomerReceiptNote.value).toContain("Status: Waiting for payment");
    expect(unpaidPaidBetaCustomerReceiptNote.value).toContain("Access: Not open yet");
    expect(unpaidPaidBetaCustomerReceiptNote.value).toContain("First cycle: starts after paid access is open.");
    expectNoHiddenProductTerms(paidBetaCustomerReceipt.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    const paidBetaCloseKit = surfaceByLabel(container, "Paid beta close kit");
    expect(paidBetaCloseKit.textContent).toContain("Close kit");
    expect(paidBetaCloseKit.textContent).toContain("Private beta is ready to sell from this account.");
    expect(paidBetaCloseKit.textContent).toContain("Ready to close");
    expect(paidBetaCloseKit.textContent).toContain("Close the sale");
    expect(paidBetaCloseKit.textContent).toContain("Open the account");
    expect(paidBetaCloseKit.textContent).toContain("Keep launch boundary");
    expect(paidBetaCloseKit.textContent).toContain("Private beta can be sold at $250");
    const paidBetaCloseKitNote = surfaceByLabel(container, "Paid beta close kit note") as HTMLTextAreaElement;
    expect(paidBetaCloseKitNote.value).toContain("DearMe private beta close kit");
    expect(paidBetaCloseKitNote.value).toContain("Offer: personal brand growth team");
    expect(paidBetaCloseKitNote.value).toContain("Status: ready to sell after payment");
    expect(paidBetaCloseKitNote.value).toContain("Price: $250");
    expect(paidBetaCloseKitNote.value).toContain(
      "What opens: first brand cycle, Voice & Memory, weekly receipt, and launch-call boundary.",
    );
    expect(paidBetaCloseKitNote.value).toContain(
      "After payment: record access with the receipt reference, then start the first brand cycle.",
    );
    expect(paidBetaCloseKitNote.value).toContain(
      "Not included yet: public launch proof waits for approved live delivery receipts.",
    );
    expectNoHiddenProductTerms(
      `${paidBetaCloseKit.textContent ?? ""} ${paidBetaCloseKitNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const paidBetaPaymentPath = surfaceByLabel(container, "Paid beta payment path receipt");
    expect(paidBetaPaymentPath.textContent).toContain("Payment path");
    expect(paidBetaPaymentPath.textContent).toContain("Payment can be taken now; access opens from the receipt.");
    expect(paidBetaPaymentPath.textContent).toContain("Manual payment path");
    expect(paidBetaPaymentPath.textContent).toContain("Manual private beta");
    expect(paidBetaPaymentPath.textContent).toContain("Record receipt");
    expect(paidBetaPaymentPath.textContent).toContain("Self-serve upgrade");
    expect(paidBetaPaymentPath.textContent).toContain("Hosted checkout can replace manual recording");
    const paidBetaPaymentPathNote = surfaceByLabel(
      container,
      "Paid beta payment path note",
    ) as HTMLTextAreaElement;
    expect(paidBetaPaymentPathNote.value).toContain("DearMe payment path receipt");
    expect(paidBetaPaymentPathNote.value).toContain("Mode: private beta manual payment");
    expect(paidBetaPaymentPathNote.value).toContain("Target amount: $250");
    expect(paidBetaPaymentPathNote.value).toContain("Collect: payment reference from the current private-beta channel.");
    expect(paidBetaPaymentPathNote.value).toContain(
      "Activation: record amount, receipt note, and reference to open paid access.",
    );
    expect(paidBetaPaymentPathNote.value).toContain("Upgrade path: hosted checkout setup can replace manual recording");
    expectNoHiddenProductTerms(
      `${paidBetaPaymentPath.textContent ?? ""} ${paidBetaPaymentPathNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );
    const nextCycleRetentionReceipt = surfaceByLabel(container, "Next cycle retention receipt");
    expect(nextCycleRetentionReceipt.textContent).toContain("Next check-in");
    expect(nextCycleRetentionReceipt.textContent).toContain("Ready after access");
    expect(nextCycleRetentionReceipt.textContent).toContain("Download receipt");
    expect(nextCycleRetentionReceipt.textContent).toContain("Next briefing");
    expect(nextCycleRetentionReceipt.textContent).toContain("Briefing ready");
    expect(nextCycleRetentionReceipt.textContent).toContain("Work continues");
    expect(nextCycleRetentionReceipt.textContent).toContain("Starts after access");
    expect(nextCycleRetentionReceipt.textContent).toContain("The loop is ready, but new operating work waits for paid beta access.");
    expect(nextCycleRetentionReceipt.textContent).toContain("Decision rhythm");
    expect(nextCycleRetentionReceipt.textContent).toContain("4 calls");
    expect(nextCycleRetentionReceipt.textContent).toContain("Memory to reuse");
    const unpaidNextCycleRetentionNote = surfaceByLabel(
      nextCycleRetentionReceipt,
      "Next cycle retention receipt note",
    ) as HTMLTextAreaElement;
    expect(unpaidNextCycleRetentionNote.value).toContain("DearMe next cycle retention receipt");
    expect(unpaidNextCycleRetentionNote.value).toContain("Account: Ready after access");
    expect(unpaidNextCycleRetentionNote.value).toContain("Work continues: Starts after access");
    expect(unpaidNextCycleRetentionNote.value).toContain(
      "Next support step: Start with the waiting launch calls before another public move.",
    );
    expectNoHiddenProductTerms(
      `${nextCycleRetentionReceipt.textContent ?? ""} ${unpaidNextCycleRetentionNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );

    await openFullProfileControls(container);

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-goals") as HTMLTextAreaElement,
        "Grow owned audience",
      );
      setTextareaValue(
        container.querySelector("#dearme-proof") as HTMLTextAreaElement,
        "Shipped a working local product",
      );
    });

    await act(async () => {
      buttonByText(container, "Preview profile")?.click();
    });
    await flushReact();

    const requestButton = buttonByText(container, "Start brand team");
    expect(requestButton?.disabled).toBe(true);
    expect(container.textContent).toContain("unlock the brand team cycle");
    expect(mockDearmeApi.createBrandBlueprintApplyRequest).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("shows self-serve checkout when hosted payment and receipt sync are ready", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("trial", {
      hostedCheckout: {
        configured: true,
        paymentLinkConfigured: true,
        receiptSyncConfigured: true,
        paymentUrl: "https://pay.example.com/dearme?client_reference_id=company-1",
        providerLabel: "Hosted checkout",
        label: "Self-serve checkout ready",
        summary: "A hosted payment link and signed receipt sync are ready for this account.",
        nextActionLabel: "Open hosted checkout",
        nextActionDescription: "Send the customer through checkout; DearMe opens paid access after the signed receipt arrives.",
      },
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const paidBetaCloseKit = surfaceByLabel(container, "Paid beta close kit");
    expect(paidBetaCloseKit.textContent).toContain("Checkout ready");
    expect(paidBetaCloseKit.textContent).toContain("Automatic receipt");
    expect((surfaceByLabel(container, "Paid beta close kit note") as HTMLTextAreaElement).value).toContain(
      "signed checkout receipt opens access automatically",
    );

    const paidBetaPaymentPath = surfaceByLabel(container, "Paid beta payment path receipt");
    expect(paidBetaPaymentPath.textContent).toContain("Self-serve checkout is ready for this account.");
    expect(paidBetaPaymentPath.textContent).toContain("Self-serve checkout");
    expect(paidBetaPaymentPath.textContent).toContain("Receipt sync");
    const checkoutCustomerReceiptNote = surfaceByLabel(
      container,
      "Paid beta customer receipt note",
    ) as HTMLTextAreaElement;
    expect(checkoutCustomerReceiptNote.value).toContain("Status: Checkout ready; account opens after signed receipt");
    expect(checkoutCustomerReceiptNote.value).toContain("Checkout: https://pay.example.com/dearme?client_reference_id=company-1");
    expect((surfaceByLabel(container, "Paid beta payment path note") as HTMLTextAreaElement).value).toContain(
      "Mode: self-serve hosted checkout",
    );
    const checkoutLinks = [...container.querySelectorAll("a")]
      .filter((link) => link.textContent?.includes("Open checkout"));
    expect(checkoutLinks.length).toBeGreaterThan(0);
    checkoutLinks.forEach((link) => {
      expect(link.href).toBe("https://pay.example.com/dearme?client_reference_id=company-1");
    });
    expectNoHiddenProductTerms(container.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      root.unmount();
    });
  });

  it("downloads paid beta receipts for customer and operator handoff", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:dearme-paid-beta-${createdBlobs.length}`;
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    try {
      await act(async () => {
        buttonByLabel(container, "Download paid-beta-operating-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-beta-customer-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-beta-welcome-plan-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-beta-close-kit-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-beta-payment-path-receipt.txt")?.click();
      });

      expect(clickedDownloads).toEqual([
        "paid-beta-operating-receipt.txt",
        "paid-beta-customer-receipt.txt",
        "paid-beta-welcome-plan-receipt.txt",
        "paid-beta-close-kit-receipt.txt",
        "paid-beta-payment-path-receipt.txt",
      ]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-beta-1");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-beta-2");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-beta-3");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-beta-4");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-beta-5");
      await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe paid beta operating receipt");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Account: Paid user operating");
      await expect(createdBlobs[1]?.text()).resolves.toContain("DearMe paid beta customer receipt");
      await expect(createdBlobs[2]?.text()).resolves.toContain("DearMe paid beta welcome plan");
      await expect(createdBlobs[3]?.text()).resolves.toContain("DearMe paid beta start kit");
      await expect(createdBlobs[4]?.text()).resolves.toContain("DearMe payment path receipt");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    await act(async () => {
      root.unmount();
    });
  });

  it("downloads paid operations receipts for retention, recovery, autonomy, and support", async () => {
    const emptyWeekWorkbench = workbenchResponse();
    emptyWeekWorkbench.activeWork = [];
    emptyWeekWorkbench.workReady = [];
    emptyWeekWorkbench.report = null;
    emptyWeekWorkbench.decisionsNeeded = [];
    emptyWeekWorkbench.batchDecisions = [];
    mockDearmeApi.getWorkbench.mockResolvedValue(emptyWeekWorkbench);
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:dearme-paid-ops-${createdBlobs.length}`;
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    try {
      await act(async () => {
        buttonByLabel(container, "Download launch-readiness-receipt.txt")?.click();
        buttonByLabel(container, "Download commercial-readiness-receipt.txt")?.click();
        buttonByLabel(container, "Download weekly-value-receipt.txt")?.click();
        buttonByLabel(container, "Download next-cycle-retention-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-cohort-health-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-account-health-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-retention-pulse-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-user-operations-receipt.txt")?.click();
        buttonByLabel(container, "Download empty-week-recovery-receipt.txt")?.click();
        buttonByLabel(container, "Download autonomy-contract-receipt.txt")?.click();
        buttonByLabel(container, "Download paid-user-support-handoff-receipt.txt")?.click();
      });

      expect(clickedDownloads).toEqual([
        "launch-readiness-receipt.txt",
        "commercial-readiness-receipt.txt",
        "weekly-value-receipt.txt",
        "next-cycle-retention-receipt.txt",
        "paid-cohort-health-receipt.txt",
        "paid-account-health-receipt.txt",
        "paid-retention-pulse-receipt.txt",
        "paid-user-operations-receipt.txt",
        "empty-week-recovery-receipt.txt",
        "autonomy-contract-receipt.txt",
        "paid-user-support-handoff-receipt.txt",
      ]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-1");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-2");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-3");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-4");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-5");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-6");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-7");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-8");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-9");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-10");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-paid-ops-11");
      await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe launch readiness receipt");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Can keep moving now: private drafts");
      await expect(createdBlobs[1]?.text()).resolves.toContain("DearMe commercial readiness receipt");
      await expect(createdBlobs[1]?.text()).resolves.toContain("Cannot claim yet: broad public launch");
      await expect(createdBlobs[2]?.text()).resolves.toContain("DearMe weekly value receipt");
      await expect(createdBlobs[3]?.text()).resolves.toContain("DearMe next cycle retention receipt");
      await expect(createdBlobs[3]?.text()).resolves.toContain("Account: Retention loop active");
      await expect(createdBlobs[3]?.text()).resolves.toContain("Work continues: Queue ready");
      await expect(createdBlobs[4]?.text()).resolves.toContain("DearMe paid cohort health receipt");
      await expect(createdBlobs[5]?.text()).resolves.toContain("DearMe paid account health receipt");
      await expect(createdBlobs[6]?.text()).resolves.toContain("DearMe paid retention pulse");
      await expect(createdBlobs[6]?.text()).resolves.toContain("Status: At risk");
      await expect(createdBlobs[7]?.text()).resolves.toContain("DearMe paid user operations receipt");
      await expect(createdBlobs[7]?.text()).resolves.toContain("Next support step: Open same-day recovery");
      await expect(createdBlobs[8]?.text()).resolves.toContain("DearMe empty-week recovery brief");
      await expect(createdBlobs[9]?.text()).resolves.toContain("DearMe autonomy contract");
      await expect(createdBlobs[10]?.text()).resolves.toContain("DearMe support handoff");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    await act(async () => {
      root.unmount();
    });
  });

  it("downloads the feedback learning receipt for support handoff", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:dearme-feedback-learning";
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    try {
      await act(async () => {
        buttonByLabel(container, "Download feedback-learning-receipt.txt")?.click();
      });

      expect(clickedDownloads).toEqual(["feedback-learning-receipt.txt"]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-feedback-learning");
      await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe feedback learning receipt");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Keep future drafts shorter, proof-led, and direct");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Voice sample added: Short, direct voice note.");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    await act(async () => {
      root.unmount();
    });
  });

  it("downloads the Voice & Memory receipt for account handoff", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const voiceMemoryReceipt = surfaceByLabel(container, "Voice & Memory receipt");
    expect(voiceMemoryReceipt.textContent).toContain("Memory receipt");
    expect(voiceMemoryReceipt.textContent).toContain("What DearMe will remember next");
    const voiceMemoryReceiptNote = surfaceByLabel(container, "Voice & Memory receipt note") as HTMLTextAreaElement;
    expect(voiceMemoryReceiptNote.value).toContain("DearMe Voice & Memory receipt");
    expect(voiceMemoryReceiptNote.value).toContain("Draft Voice Profile");
    expect(voiceMemoryReceiptNote.value).toContain("Keep future drafts shorter, proof-led, and direct");
    expect(voiceMemoryReceiptNote.value).toContain("Short, direct voice note.");
    expect(voiceMemoryReceiptNote.value).toContain("public sends, page changes, and spend still wait");

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:dearme-voice-memory";
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    try {
      await act(async () => {
        buttonByLabel(container, "Download voice-memory-receipt.txt")?.click();
      });

      expect(clickedDownloads).toEqual(["voice-memory-receipt.txt"]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-voice-memory");
      await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe Voice & Memory receipt");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Draft Voice Profile");
      await expect(createdBlobs[0]?.text()).resolves.toContain("Short, direct voice note.");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    await act(async () => {
      root.unmount();
    });
  });

  it("focuses paid beta access from the proof page start handoff", async () => {
    mockLocation.hash = "#dearme-paid-beta-access";
    const scrollIntoView = vi.fn();
    const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <DearMeOnboarding />
          </QueryClientProvider>,
        );
      });
      await flushReact();

      const paidBetaAccess = surfaceByLabel(container, "Paid beta access");
      expect(paidBetaAccess.id).toBe("dearme-paid-beta-access");
      expect(paidBetaAccess.textContent).toContain("Record paid beta payment");
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    } finally {
      await act(async () => {
        root.unmount();
      });
      if (scrollIntoViewDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollIntoViewDescriptor);
      } else {
        delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      }
    }
  });

  it("keeps profile preview errors customer-safe", async () => {
    mockDearmeApi.previewBrandBlueprint.mockRejectedValueOnce(
      new Error("Paperclip adapter provider could not prepare setup_payload."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await openFullProfileControls(container);

    await act(async () => {
      buttonByText(container, "Preview profile")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Profile preview needs attention. Try again before starting brand work.");
    expect(text).not.toContain("Paperclip adapter provider");
    expect(text).not.toContain("setup_payload");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps private team start errors customer-safe", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.createBrandBlueprintApplyRequest.mockRejectedValueOnce(
      new Error("Approval route provider failed inside Paperclip workspace."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await openFullProfileControls(container);

    await act(async () => {
      buttonByText(container, "Preview profile")?.click();
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Start brand team")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Launch request needs attention. Try again before moving the brand team forward.");
    expect(text).not.toContain("Approval route provider");
    expect(text).not.toContain("Paperclip workspace");
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("approval-1"));

    await act(async () => {
      root.unmount();
    });
  });

  it("shows a DearMe empty state when Voice & Memory has not started", async () => {
    const emptyWorkbench = workbenchResponse();
    emptyWorkbench.memory = {
      ...emptyWorkbench.memory,
      summary: "Voice & Memory is ready for the first real sample.",
      sourceCount: 0,
      voiceSampleCount: 0,
      proofCount: 0,
      voiceProfile: {
        ...emptyWorkbench.memory.voiceProfile,
        sampleCount: 0,
        confidence: 0,
        guidance: "Voice Editor is ready for the first real sample.",
        nextStep: "Add one real sample so DearMe can protect your tone before public work.",
      },
      sourcePlan: memorySourcePlanFixture({}),
      sourceReviewQueue: [],
      latest: [],
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(emptyWorkbench);

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("No Voice & Memory saved yet");
    expect(container.textContent).toContain(
      "Add one writing sample, proof point, source link, correction, audience note, or offer note.",
    );
    expect(container.textContent).toContain("DearMe will use it to protect your voice");
    expect(container.querySelector('[data-dearme-surface="empty-state"]')).not.toBeNull();
    expect(container.textContent).toContain("Writing sample");
    expect(container.textContent).toContain("Proof point");
    expect(container.textContent).toContain("Source link");
    expect(container.textContent).toContain("Correction");
    expect(container.textContent).toContain("Audience note");
    expect(container.textContent).toContain("Offer note");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "First real voice sample from a new design partner.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        body: "First real voice sample from a new design partner.",
      }),
    );
    expect(container.textContent).not.toContain("No Voice & Memory saved yet");
    expect(container.textContent).toContain("Fresh voice note");
    expect(container.textContent).toContain("Just saved");

    await act(async () => {
      root.unmount();
    });
  });

  it("records first-cycle writing samples as Voice & Memory samples", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const voiceSamples = surfaceByLabel(container, "First-cycle voice samples");
    expect(voiceSamples.textContent).toContain("Paste 1-10 examples that sound like you");
    expect(buttonByText(voiceSamples, "Save voice samples")?.disabled).toBe(true);

    await act(async () => {
      setTextareaValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-sample-0") as HTMLTextAreaElement,
        "I write in short, specific notes that make the next move obvious.",
      );
      setTextareaValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-sample-1") as HTMLTextAreaElement,
        "The useful proof is the part a customer would repeat without prompting.",
      );
      setTextareaValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-sample-2") as HTMLTextAreaElement,
        "Keep the sentence practical, then point at the shipped result.",
      );
      setInputValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-source-link") as HTMLInputElement,
        "https://example.com/writing-samples",
      );
    });

    await act(async () => {
      buttonByText(voiceSamples, "Save voice samples")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledTimes(3);
    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenNthCalledWith(
      1,
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Writing sample 1",
        body: "I write in short, specific notes that make the next move obvious.",
        sourceLabel: "https://example.com/writing-samples",
      }),
    );
    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenNthCalledWith(
      2,
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Writing sample 2",
        body: "The useful proof is the part a customer would repeat without prompting.",
        sourceLabel: "https://example.com/writing-samples",
      }),
    );
    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenNthCalledWith(
      3,
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Writing sample 3",
        body: "Keep the sentence practical, then point at the shipped result.",
        sourceLabel: "https://example.com/writing-samples",
      }),
    );
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("queues a first-cycle voice source URL for extraction when no text sample is pasted", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const voiceSamples = surfaceByLabel(container, "First-cycle voice samples");

    await act(async () => {
      setInputValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-source-link") as HTMLInputElement,
        "ftp://example.com/writing-samples",
      );
    });

    await act(async () => {
      buttonByText(voiceSamples, "Save voice samples")?.click();
    });

    expect(voiceSamples.textContent).toContain("Use a valid http or https link for voice source links.");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      setInputValue(
        voiceSamples.querySelector("#dearme-first-cycle-voice-source-link") as HTMLInputElement,
        "https://example.com/writing-samples",
      );
    });

    await act(async () => {
      buttonByText(voiceSamples, "Save voice samples")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "voice_sample",
        sourceInputMode: "link",
        title: "Writing sample source link",
        body: expect.stringContaining("Source link saved for voice extraction"),
        sourceLabel: "https://example.com/writing-samples",
      }),
    );
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("renders customer-safe empty states with next actions across core workroom areas", async () => {
    const emptyWorkbench = workbenchResponse();
    emptyWorkbench.workReady = [];
    emptyWorkbench.activeWork = [];
    emptyWorkbench.decisionsNeeded = [];
    emptyWorkbench.batchDecisions = [];
    emptyWorkbench.memory = {
      ...emptyWorkbench.memory,
      summary: "Voice & Memory is ready for the first real sample.",
      sourceCount: 0,
      voiceSampleCount: 0,
      proofCount: 0,
      voiceProfile: {
        ...emptyWorkbench.memory.voiceProfile,
        sampleCount: 0,
        confidence: 0,
        guidance: "Voice Editor is ready for the first real sample.",
        nextStep: "Add one real sample so DearMe can protect your tone before public work.",
      },
      sourcePlan: memorySourcePlanFixture({}),
      sourceReviewQueue: [],
      latest: [],
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(emptyWorkbench);
    mockDearmeApi.getOutputs.mockResolvedValue({ companyId: "company-1", outputs: [] });

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const workReady = surfaceByLabel(container, "Work ready");
    expect(workReady.textContent).toContain("Nothing is ready for review yet");
    expect(workReady.textContent).toContain("Open Voice & Memory");
    expect(buttonByText(workReady, "Open Voice & Memory")).not.toBeNull();

    const decisions = surfaceByLabel(container, "Decisions needed");
    expect(decisions.textContent).toContain("No high-leverage decision is waiting right now");
    expect(decisions.textContent).toContain("Review Work Ready");
    expect(buttonByText(decisions, "Review Work Ready")).not.toBeNull();

    const voiceMemory = surfaceByLabel(container, "Voice & Memory");
    expect(voiceMemory.textContent).toContain("No Voice & Memory saved yet");
    expect(voiceMemory.textContent).toContain("Add first source");
    expect(buttonByText(voiceMemory, "Add first source")).not.toBeNull();

    const brandWork = surfaceByLabel(container, "Brand work ready");
    expect(brandWork.textContent).toContain("Brand work has not started yet");
    expect(brandWork.textContent).toContain("Open Voice & Memory");
    expect(buttonByText(brandWork, "Open Voice & Memory")).not.toBeNull();
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);

    await act(async () => {
      root.unmount();
    });
    container.textContent = "";

    mockLocation.search = "?view=opportunities";
    const opportunitiesRoot = createRoot(container);
    const opportunitiesQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      opportunitiesRoot.render(
        <QueryClientProvider client={opportunitiesQueryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const opportunities = surfaceByLabel(container, "Opportunity work ready");
    expect(opportunities.textContent).toContain("Opportunity scouting has not produced reviewable leads yet");
    expect(opportunities.textContent).toContain("Open Voice & Memory");
    expect(buttonByText(opportunities, "Open Voice & Memory")).not.toBeNull();

    await act(async () => {
      opportunitiesRoot.unmount();
    });
    container.textContent = "";

    mockLocation.search = "?view=portfolio";
    const portfolioRoot = createRoot(container);
    const portfolioQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      portfolioRoot.render(
        <QueryClientProvider client={portfolioQueryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const portfolio = surfaceByLabel(container, "Portfolio work ready");
    expect(portfolio.textContent).toContain("No portfolio proof is ready yet");
    expect(portfolio.textContent).toContain("Open Voice & Memory");
    expect(buttonByText(portfolio, "Open Voice & Memory")).not.toBeNull();
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);

    await act(async () => {
      portfolioRoot.unmount();
    });
  });

  it("records guided Voice & Memory source material without exposing substrate terms", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const workbenchFetchesBeforeSave = mockDearmeApi.getWorkbench.mock.calls.length;
    const outputFetchesBeforeSave = mockDearmeApi.getOutputs.mock.calls.length;
    expect(buttonByText(container, "Add to Voice & Memory")?.disabled).toBe(true);

    await act(async () => {
      buttonByText(container, "Boundaries")?.click();
    });

    expect((container.querySelector("#dearme-memory-kind") as HTMLSelectElement | null)?.value).toBe("constraint");

    await act(async () => {
      buttonByText(container, "Forbidden phrase")?.click();
    });

    expect((container.querySelector("#dearme-memory-kind") as HTMLSelectElement | null)?.value).toBe("constraint");
    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("will hold sensitive wording and claims");
    expect(container.textContent).toContain("Improves launch notes, review notes, and next actions.");

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-source") as HTMLInputElement,
        "Voice review note",
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "Never describe the product as effortless magic.",
      );
    });
    expect(buttonByText(container, "Add to Voice & Memory")?.disabled).toBe(false);

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });
    await flushReact();
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "constraint",
        sourceInputMode: "paste",
        title: "Forbidden phrase",
        body: "Never describe the product as effortless magic.",
        sourceLabel: "Voice review note",
      }),
    );
    expect(mockDearmeApi.getWorkbench.mock.calls.length).toBeGreaterThan(workbenchFetchesBeforeSave);
    expect(mockDearmeApi.getOutputs.mock.calls.length).toBeGreaterThan(outputFetchesBeforeSave);
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps short private Voice & Memory sources local until they have enough context", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain(
      "Add at least 20 characters. DearMe uses this as saved memory, not public copy.",
    );

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "Too short.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });

    expect(container.textContent).toContain(
      "Add a little more context so DearMe can learn from this source.",
    );
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps oversized private source references local before saving", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Source link")?.click();
    });

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-source") as HTMLInputElement,
        `https://example.com/${"private-proof-".repeat(40)}`,
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "This source proves the launch narrative should mention the shipped local workflow.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });

    expect(container.textContent).toContain("Keep the source reference under 500 characters.");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps oversized private source titles and bodies local before saving", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-title") as HTMLInputElement,
        "A".repeat(161),
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "This source has enough private context for DearMe to learn from it.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });

    expect(container.textContent).toContain("Keep the source title under 160 characters.");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-title") as HTMLInputElement,
        "Launch note",
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "A".repeat(4001),
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });

    expect(container.textContent).toContain("Keep saved sources under 4,000 characters for now.");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("records source links as a typed Voice & Memory source path", async () => {
    mockDearmeApi.recordMemoryUpdate.mockResolvedValueOnce({
      companyId: "company-1",
      status: "recorded",
      memory: {
        id: "memory-3",
        kind: "proof_point",
        sourceInputMode: "link",
        title: "Source link",
        body: "This source proves the launch narrative should mention the shipped local workflow.",
        bodyPreview: "This source proves the launch narrative should mention the shipped local workflow.",
        sourceLabel: "https://example.com/proof-note",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 3,
      },
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Source link")?.click();
    });

    expect(container.textContent).toContain("Growth Analyst");
    expect(container.textContent).toContain(
      "will extract the useful fact before it shapes the next proof pass.",
    );
    expect(container.textContent).toContain(
      "Improves source review, report notes, and proof-backed recommendations.",
    );

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-source") as HTMLInputElement,
        "ftp://example.com/proof-note",
      );
      setTextareaValue(
        container.querySelector("#dearme-memory-body") as HTMLTextAreaElement,
        "This source proves the launch narrative should mention the shipped local workflow.",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });

    expect(container.textContent).toContain("Use an http or https link for source links.");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-memory-source") as HTMLInputElement,
        "https://example.com/proof-note",
      );
    });

    await act(async () => {
      buttonByText(container, "Add to Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "proof_point",
        sourceInputMode: "link",
        title: "Source link",
        body: "This source proves the launch narrative should mention the shipped local workflow.",
        sourceLabel: "https://example.com/proof-note",
      }),
    );
    const savedSourceLink = linkByText(surfaceByLabel(container, "Voice & Memory"), "Open source");
    expect(surfaceByLabel(container, "Voice & Memory").textContent).toContain(
      "Portfolio Builder will use this next",
    );
    expect(savedSourceLink?.href).toBe("https://example.com/proof-note");
    expect(savedSourceLink?.target).toBe("_blank");
    expect(savedSourceLink?.rel).toContain("noreferrer");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("renders valid source review links as source shortcuts", async () => {
    const sourceReviewWorkbench = workbenchResponse();
    sourceReviewWorkbench.memory = {
      ...sourceReviewWorkbench.memory,
      sourceReviewQueue: sourceReviewWorkbench.memory.sourceReviewQueue.map((item) => ({
        ...item,
        sourceLabel: "https://example.com/build-log",
      })),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(sourceReviewWorkbench);

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const voiceMemorySurface = surfaceByLabel(container, "Voice & Memory");
    const sourceReviewCard = surfaceByLabel(container, "Voice & Memory source review");
    const cardLink = linkByText(sourceReviewCard, "Open source");
    expect(cardLink?.href).toBe("https://example.com/build-log");

    await act(async () => {
      buttonByText(voiceMemorySurface, "Prepare fact")?.click();
    });
    await flushReact();

    const sourceDetail = surfaceByLabel(container, "Source review detail");
    expect(surfaceByLabel(container, "Voice & Memory source review").textContent).toContain("Selected for next pass");
    const detailLink = linkByText(sourceDetail, "Open source");
    expect(sourceDetail.textContent).toContain("Source");
    expect(detailLink?.href).toBe("https://example.com/build-log");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("prefills reviewed facts from source review items", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Source review");
    expect(container.textContent).toContain("Source links and import notes wait here");

    await act(async () => {
      buttonByText(container, "Prepare fact")?.click();
    });

    const sourceDetail = surfaceByLabel(container, "Source review detail");
    expect(sourceDetail.textContent).toContain("Source detail");
    expect(sourceDetail.textContent).toContain("Shipped proof");
    expect(sourceDetail.textContent).toContain("Shipped a working local product.");

    expect((container.querySelector("#dearme-memory-kind") as HTMLSelectElement).value).toBe("proof_point");
    expect((container.querySelector("#dearme-memory-title") as HTMLInputElement).value).toBe("Shipped proof");
    expect((container.querySelector("#dearme-memory-source") as HTMLInputElement).value).toBe("Build log");
    expect((container.querySelector("#dearme-memory-body") as HTMLTextAreaElement).value).toBe(
      "Shipped a working local product.",
    );

    await act(async () => {
      buttonByText(sourceDetail, "Save reviewed fact")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "proof_point",
        sourceInputMode: "paste",
        title: "Shipped proof",
        body: "Shipped a working local product.",
        sourceLabel: "Build log",
      }),
    );
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("dismisses source review items from the detail drawer without adding a fact", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Prepare fact")?.click();
    });

    const sourceDetail = surfaceByLabel(container, "Source review detail");

    await act(async () => {
      buttonByText(sourceDetail, "Not useful")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.archiveMemorySource).toHaveBeenCalledWith("company-1", "memory-2");
    expect(mockDearmeApi.recordMemoryUpdate).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Source review detail"]')).toBeNull();
    expect((container.querySelector("#dearme-memory-body") as HTMLTextAreaElement).value).toBe("");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("renders live workbench sync updates from the DearMe event stream", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(mockDearmeApi.openWorkbenchEvents).toHaveBeenCalledWith("company-1");
    const stream = FakeDearMeEventSource.instances[0];
    expect(stream).toBeDefined();

    const liveWorkbench = workbenchResponse();
    liveWorkbench.headline = "Dear me, your team moved again";
    liveWorkbench.summary = "The brand cycle just refreshed with new prepared work.";

    await act(async () => {
      stream?.emit("sync", {
        type: "sync",
        emittedAt: "2026-05-09T12:00:00.000Z",
        scope: { companyId: "company-1" },
        payload: { workbench: liveWorkbench },
      });
    });
    await flushReact();

    expect(container.textContent).toContain("Dear me, your team moved again");
    expect(container.textContent).toContain("The brand cycle just refreshed with new prepared work.");

    await act(async () => {
      root.unmount();
    });
    expect(stream?.close).toHaveBeenCalledTimes(1);
  });

  it("reconnects the DearMe event stream after a dropped connection", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const firstStream = FakeDearMeEventSource.instances[0];
    expect(firstStream).toBeDefined();

    await act(async () => {
      firstStream?.fail();
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    await flushReact();

    expect(firstStream?.close).toHaveBeenCalledTimes(1);
    expect(mockDearmeApi.openWorkbenchEvents).toHaveBeenCalledTimes(2);
    const reconnectedStream = FakeDearMeEventSource.instances[1];
    expect(reconnectedStream).toBeDefined();

    const liveWorkbench = workbenchResponse();
    liveWorkbench.headline = "Dear me, your team reconnected";
    liveWorkbench.summary = "The private work stream recovered after a dropped connection.";

    await act(async () => {
      reconnectedStream?.emit("sync", {
        type: "sync",
        emittedAt: "2026-05-09T12:03:00.000Z",
        scope: { companyId: "company-1" },
        payload: { workbench: liveWorkbench },
      });
    });
    await flushReact();

    expect(container.textContent).toContain("Dear me, your team reconnected");

    await act(async () => {
      root.unmount();
    });
    expect(reconnectedStream?.close).toHaveBeenCalledTimes(1);
  });

  it("refreshes the team workbench when execution lifecycle events arrive", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const initialWorkbench = workbenchResponse();
    const refreshedWorkbench = workbenchResponse();
    refreshedWorkbench.headline = "Dear me, your team has fresh runner progress";
    refreshedWorkbench.summary = "The brand cycle pulled in new execution progress for review.";
    mockDearmeApi.getWorkbench
      .mockResolvedValueOnce(initialWorkbench)
      .mockResolvedValue(refreshedWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const stream = FakeDearMeEventSource.instances[0];
    expect(stream).toBeDefined();
    expect(container.textContent).toContain("Dear me, your team has decisions ready");

    await act(async () => {
      stream?.emit("openclaw_lifecycle", {
        type: "openclaw_lifecycle",
        emittedAt: "2026-05-10T12:00:00.000Z",
        scope: { companyId: "company-1" },
        payload: {
          phase: "running",
          runId: "run-1",
          message: "OpenClaw Symphony adapter provider runtime model setup_payload advanced.",
        },
      });
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    await flushReact();

    expect(mockDearmeApi.getWorkbench).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Dear me, your team has fresh runner progress");
    expect(container.textContent).toContain("The brand cycle pulled in new execution progress for review.");
    const topFocus = surfaceByLabel(container, "Today's brand team focus");
    expect(topFocus.textContent).toContain("Brand work moving");
    expect(topFocus.textContent).toContain("Working now");
    expect(topFocus.textContent).toContain("Team started a proof pass");
    expect(topFocus.textContent).not.toContain("Live team pulse");
    expectNoHiddenProductTerms(topFocus.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
      "OpenClaw",
      "Paperclip",
    ]);

    await act(async () => {
      root.unmount();
    });
    expect(stream?.close).toHaveBeenCalledTimes(1);
  });

  it("sends a Chief of Staff brief without exposing the work queue substrate", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.getWorkbench
      .mockResolvedValueOnce(workbenchResponse())
      .mockResolvedValueOnce(workbenchResponseWithChiefBrief());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("Brief the team");
    expect(container.textContent).toContain("Brand work ready");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);
    const chiefOfStaffComposer = surfaceByLabel(container, "Chief of Staff composer");

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-chief-of-staff-message") as HTMLTextAreaElement,
        "Launch positioning changed. Prepare the next three moves before I publish anything.",
      );
      buttonByText(chiefOfStaffComposer, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "plan_next",
      message: "Launch positioning changed. Prepare the next three moves before I publish anything.",
    });
    expect(container.textContent).toContain("Brief sent");
    expect(container.textContent).toContain("will prepare the next private move for review");
    expect(chiefOfStaffComposer.textContent).toContain("Download receipt");
    expect(container.textContent).toContain("Open brand work");
    await flushReact();
    expect(container.textContent).toContain("Chief of Staff is turning your brief into brand work");
    expect(container.textContent).toContain("Cycle brief");
    expect(container.textContent).toContain("Chief of Staff brief: Plan next moves");
    expect(container.textContent).not.toContain("dearme_chief_of_staff_message");
    expect(container.textContent).not.toContain("issue-chief-1");

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:dearme-chief-brief-${createdBlobs.length}`;
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    await act(async () => {
      buttonByText(chiefOfStaffComposer, "Download receipt")?.click();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    await expect(createdBlobs[0]?.text()).resolves.toContain("DearMe Chief of Staff brief receipt");
    await expect(createdBlobs[0]?.text()).resolves.toContain("Status: Brief accepted");
    await expect(createdBlobs[0]?.text()).resolves.toContain("Next: Chief of Staff has the brief");
    await expect(createdBlobs[0]?.text()).resolves.toContain("publishing, sending, spending");
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }

    await act(async () => {
      buttonByText(container, "Open brand work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-22");
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("sends paid support handoff notes as private feedback handling work", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const supportHandoff = surfaceByLabel(container, "Paid user support handoff");
    const supportNote = surfaceByLabel(container, "Support handoff note") as HTMLTextAreaElement;
    expect(supportHandoff.textContent).toContain("Ready for paid support");
    expect(supportNote.value).toContain("DearMe support handoff");
    expect(supportNote.value).toContain("Account: Paid beta active");

    await act(async () => {
      buttonByText(supportHandoff, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "handle_feedback",
      message: supportNote.value,
    });
    const supportFeedbackReceipt = surfaceByLabel(container, "Support handoff feedback receipt");
    expect(supportFeedbackReceipt.textContent).toContain("Feedback brief sent");
    expect(supportFeedbackReceipt.textContent).toContain("Voice & Memory learning, recovery work, and next-cycle changes");
    expect(supportFeedbackReceipt.textContent).toContain("Open feedback work");
    expect(supportFeedbackReceipt.textContent).toContain("Open Voice & Memory");
    expectNoHiddenProductTerms(supportHandoff.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);

    await act(async () => {
      buttonByText(supportFeedbackReceipt, "Open feedback work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-22");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(supportFeedbackReceipt, "Open Voice & Memory")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");

    await act(async () => {
      root.unmount();
    });
  });

  it("turns cycle controls into private Chief of Staff briefs", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Cycle controls");
    expect(container.textContent).toContain("Focus the week");
    expect(container.textContent).toContain("Scout opportunities");
    expect(container.textContent).toContain("Handle feedback");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);
    const chiefOfStaffComposer = surfaceByLabel(container, "Chief of Staff composer");

    await act(async () => {
      buttonByText(container, "Handle feedback")?.click();
    });

    const textarea = container.querySelector("#dearme-chief-of-staff-message") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Triage this feedback or support note.");
    expect(textarea.value).toContain("what DearMe should learn");
    const recentBriefs = surfaceByLabel(chiefOfStaffComposer, "Recent Chief of Staff briefs");
    expect(recentBriefs.textContent).toContain("Recent briefs");
    expect(recentBriefs.textContent).toContain("Handle feedback");
    let storedRecentBriefs = JSON.parse(
      window.localStorage.getItem("dearme:chief-of-staff-recent-controls:company-1") ?? "[]",
    ) as Array<{ id: string; label: string; intent: string; message: string }>;
    expect(storedRecentBriefs[0]).toMatchObject({
      id: "handle_feedback",
      label: "Handle feedback",
      intent: "handle_feedback",
    });
    expect(window.localStorage.getItem("dearme:chief-of-staff-recent-controls")).toBeNull();

    await act(async () => {
      buttonByText(chiefOfStaffComposer, "Scout opportunities")?.click();
    });

    expect(textarea.value).toContain("Find practical opportunities I can act on this week");
    const updatedRecentBriefs = surfaceByLabel(chiefOfStaffComposer, "Recent Chief of Staff briefs");
    expect(updatedRecentBriefs.textContent).toContain("Scout opportunities");
    expect(updatedRecentBriefs.textContent).toContain("Handle feedback");
    storedRecentBriefs = JSON.parse(
      window.localStorage.getItem("dearme:chief-of-staff-recent-controls:company-1") ?? "[]",
    ) as Array<{ id: string; label: string; intent: string; message: string }>;
    expect(storedRecentBriefs.map((brief) => brief.id)).toEqual(["scout_opportunities", "handle_feedback"]);

    await act(async () => {
      buttonByText(updatedRecentBriefs, "Handle feedback")?.click();
    });

    expect(textarea.value).toContain("Triage this feedback or support note.");

    await act(async () => {
      buttonByText(chiefOfStaffComposer, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "handle_feedback",
      message:
        "Triage this feedback or support note. Decide what DearMe should learn, what should change in the next brand cycle, and what recovery or follow-up move should be prepared for review.",
    });
    expect(chiefOfStaffComposer.textContent).toContain("Feedback brief sent");
    expect(chiefOfStaffComposer.textContent).toContain("Voice & Memory learning, recovery work, and next-cycle changes");
    expect(chiefOfStaffComposer.textContent).toContain("Open feedback work");
    expect(chiefOfStaffComposer.textContent).toContain("Open Voice & Memory");
    expect(chiefOfStaffComposer.textContent).not.toContain("Open brand work");

    await act(async () => {
      buttonByText(chiefOfStaffComposer, "Open Voice & Memory")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");

    await act(async () => {
      root.unmount();
    });
  });

  it("replays custom Chief of Staff briefs from recent briefs", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const chiefOfStaffComposer = surfaceByLabel(container, "Chief of Staff composer");
    const textarea = container.querySelector("#dearme-chief-of-staff-message") as HTMLTextAreaElement;
    const customBrief =
      "Prepare a founder story from the beta customer feedback and bring back the strongest launch boundary.";

    await act(async () => {
      setTextareaValue(textarea, customBrief);
      buttonByText(chiefOfStaffComposer, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "plan_next",
      message: customBrief,
    });
    const recentBriefs = surfaceByLabel(chiefOfStaffComposer, "Recent Chief of Staff briefs");
    expect(recentBriefs.textContent).toContain("Plan next moves: Prepare a founder story");
    const storedRecentBriefs = JSON.parse(
      window.localStorage.getItem("dearme:chief-of-staff-recent-controls:company-1") ?? "[]",
    ) as Array<{ id: string; label: string; intent: string; message: string }>;
    expect(storedRecentBriefs[0]).toMatchObject({
      intent: "plan_next",
      message: customBrief,
    });
    expect(storedRecentBriefs[0]?.label).toContain("Plan next moves: Prepare a founder story");

    await act(async () => {
      buttonByText(recentBriefs, "Plan next moves: Prepare a founder story")?.click();
    });

    expect(textarea.value).toBe(customBrief);

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps Chief of Staff recent briefs scoped to the current account", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    window.localStorage.setItem(
      "dearme:chief-of-staff-recent-controls:company-2",
      JSON.stringify([
        {
          id: "plan_next:Prepare the other account launch plan.",
          intent: "plan_next",
          label: "Plan next moves: Prepare the other account",
          message: "Prepare the other account launch plan.",
        },
      ]),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const chiefOfStaffComposer = surfaceByLabel(container, "Chief of Staff composer");
    expect(chiefOfStaffComposer.textContent).not.toContain("Prepare the other account");

    await act(async () => {
      buttonByText(chiefOfStaffComposer, "Focus the week")?.click();
    });

    const companyOneRecentBriefs = JSON.parse(
      window.localStorage.getItem("dearme:chief-of-staff-recent-controls:company-1") ?? "[]",
    ) as Array<{ id: string; label: string; intent: string; message: string }>;
    const companyTwoRecentBriefs = JSON.parse(
      window.localStorage.getItem("dearme:chief-of-staff-recent-controls:company-2") ?? "[]",
    ) as Array<{ id: string; label: string; intent: string; message: string }>;
    expect(companyOneRecentBriefs[0]?.id).toBe("focus_week");
    expect(companyTwoRecentBriefs[0]?.label).toContain("Prepare the other account");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens a team workbench approval decision", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const decisionsSurface = surfaceByLabel(container, "Decisions needed");

    await act(async () => {
      buttonByText(decisionsSurface, "Launch")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&approval=approval-ready");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows the launch-proof gap inside decisions without exposing backstage terms", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const decisionsSurface = surfaceByLabel(container, "Decisions needed");
    expect(decisionsSurface.textContent).toContain("Launch proof");
    expect(decisionsSurface.textContent).toContain(
      "Proof is usable. Live launch receipts need three details.",
    );
    expect(decisionsSurface.textContent).toContain("Professional-network delivery route");
    expect(decisionsSurface.textContent).toContain("Approved professional-network recipient");
    expect(decisionsSurface.textContent).toContain("Approved phone-message proof recipient");
    expect(decisionsSurface.querySelector('[aria-label="Public launch proof handoff"]')).not.toBeNull();
    expect(decisionsSurface.textContent).toContain("Use proof now");
    expect(decisionsSurface.textContent).toContain("Capture live details");
    expect(decisionsSurface.textContent).toContain("Return with receipts before launch");
    expect(decisionsSurface.querySelector('[aria-label="Owner live-proof details to provide"]')).not.toBeNull();
    expect(decisionsSurface.textContent).toContain("What I need from you");
    expect(decisionsSurface.textContent).toContain("Three launch details unlock the guarded receipt.");
    expect(decisionsSurface.textContent).toContain("Paste the delivery-route link");
    expect(decisionsSurface.textContent).toContain("Choose one real professional-network recipient");
    expect(decisionsSurface.textContent).toContain("Choose one phone-message recipient");
    expect(decisionsSurface.textContent).toContain("DearMe checks this in no-send mode");
    expect(decisionsSurface.textContent).toContain("Only this selected recipient is used");
    expect(decisionsSurface.textContent).toContain("The receipt stays behind the final launch call");
    expect(decisionsSurface.querySelector('[aria-label="Launch proof detail readiness"]')?.textContent).toContain(
      "3 details left before no-send check.",
    );
    expect(decisionsSurface.querySelectorAll("input").length).toBeGreaterThanOrEqual(3);
    expect(decisionsSurface.textContent).toContain("Captured here: 0/3 details.");
    expect(decisionsSurface.textContent).toContain("Needed");
    expect(decisionsSurface.querySelector('[aria-label="Owner proof reply template"]')).not.toBeNull();
    expect(decisionsSurface.textContent).toContain("Send these launch details to unlock the proof pass.");
    expect(decisionsSurface.textContent).toContain("Delivery route: delivery-route link");
    expect(decisionsSurface.textContent).toContain("Professional-network recipient: selected recipient");
    expect(decisionsSurface.textContent).toContain("Phone-message recipient: phone number or contact");
    expect(decisionsSurface.textContent).toContain(
      "DearMe checks the route first; the live receipt remains behind the final launch call.",
    );
    const launchProofHandoffReceipt = surfaceByLabel(
      decisionsSurface,
      "Launch proof handoff receipt",
    );
    expect(launchProofHandoffReceipt.textContent).toContain("Handoff receipt");
    expect(launchProofHandoffReceipt.textContent).toContain("One private note carries the setup into the no-send check.");
    expect(launchProofHandoffReceipt.textContent).toContain("3 left");
    const launchProofHandoffReceiptDownload = buttonByText(
      launchProofHandoffReceipt,
      "Download receipt",
    );
    expect(launchProofHandoffReceiptDownload).not.toBeUndefined();
    const launchProofHandoffReceiptNote = surfaceByLabel(
      decisionsSurface,
      "Launch proof handoff receipt note",
    ) as HTMLTextAreaElement;
    expect(launchProofHandoffReceiptNote.value).toContain("DearMe launch-proof handoff");
    expect(launchProofHandoffReceiptNote.value).toContain("0/3 details captured");
    expect(launchProofHandoffReceiptNote.value).toContain("Professional-network delivery route: Needed");
    expect(launchProofHandoffReceiptNote.value).toContain("Approved phone-message proof recipient: Needed");
    expect(launchProofHandoffReceiptNote.value).toContain(
      "Capture command: fill the missing details above, then run dearme:next-proof with the approved values.",
    );
    expect(launchProofHandoffReceiptNote.value).toContain("no public message, page change, spend, or broad launch");
    expect(decisionsSurface.querySelector('[aria-label="Owner proof checklist"]')).not.toBeNull();
    expect(decisionsSurface.textContent).toContain("Only three facts are missing");
    expect(decisionsSurface.textContent).toContain("No-send check comes first");
    expect(decisionsSurface.textContent).toContain("Live receipt needs launch call");
    expect(decisionsSurface.querySelector('[aria-label="Launch proof safety boundary"]')).not.toBeNull();
    expect(decisionsSurface.textContent).toContain("No public message, page change, spend, or broad launch");
    expect(decisionsSurface.textContent).toContain("guarded live receipt runs only after you choose the exact details");
    expect(decisionsSurface.textContent).toContain("collect the live-proof details");

    const deliveryRouteInput = decisionsSurface.querySelector(
      'input[aria-label="Provide Professional-network delivery route"]',
    ) as HTMLInputElement | null;
    const networkRecipientInput = decisionsSurface.querySelector(
      'input[aria-label="Provide Approved professional-network recipient"]',
    ) as HTMLInputElement | null;
    const phoneRecipientInput = decisionsSurface.querySelector(
      'input[aria-label="Provide Approved phone-message proof recipient"]',
    ) as HTMLInputElement | null;
    expect(deliveryRouteInput).not.toBeNull();
    expect(networkRecipientInput).not.toBeNull();
    expect(phoneRecipientInput).not.toBeNull();

    await act(async () => {
      setInputValue(deliveryRouteInput!, "https://www.linkedin.com/messaging/thread/example");
      setInputValue(networkRecipientInput!, "selected launch-proof recipient");
      setInputValue(phoneRecipientInput!, "+15551234567");
    });
    await flushReact();

    expect(decisionsSurface.querySelector('[aria-label="Launch proof detail readiness"]')?.textContent).toContain(
      "Ready for no-send check.",
    );
    expect(launchProofHandoffReceipt.textContent).toContain("Ready for check");
    expect(launchProofHandoffReceiptNote.value).toContain("3/3 details captured");
    expect(launchProofHandoffReceiptNote.value).toContain("ready for the no-send setup check");
    expect(launchProofHandoffReceiptNote.value).toContain(
      "Professional-network delivery route: Captured - https://www.linkedin.com/messaging/thread/example",
    );
    expect(launchProofHandoffReceiptNote.value).toContain(
      "Approved professional-network recipient: Captured - selected launch-proof recipient",
    );
    expect(launchProofHandoffReceiptNote.value).toContain(
      "Approved phone-message proof recipient: Captured - +15551234567",
    );
    expect(launchProofHandoffReceiptNote.value).toContain(
      "Capture command: pnpm --silent dearme:next-proof -- --target all --linkedin-messages-url 'https://www.linkedin.com/messaging/thread/example' --linkedin-recipient-urn 'selected launch-proof recipient' --imessage-recipient '+15551234567'",
    );
    expect(decisionsSurface.textContent).toContain("Captured here: 3/3 details.");
    expect(decisionsSurface.textContent).toContain("Captured");
    expect(decisionsSurface.textContent).toContain(
      "it does not launch anything",
    );
    const afterCallOutcomeReceiptNote = surfaceByLabel(
      decisionsSurface,
      "After-call outcome receipt note",
    ) as HTMLTextAreaElement;
    expect(afterCallOutcomeReceiptNote.value).toContain("DearMe after-call outcome receipt");
    expect(afterCallOutcomeReceiptNote.value).toContain("Waiting launch calls: 4");
    expect(afterCallOutcomeReceiptNote.value).toContain("Request changes: DearMe keeps the context");
    expect(afterCallOutcomeReceiptNote.value).toContain("Must wait: public posts");
    const beforeLaunchChecksReceiptNote = surfaceByLabel(
      decisionsSurface,
      "Before launch checks receipt note",
    ) as HTMLTextAreaElement;
    expect(beforeLaunchChecksReceiptNote.value).toContain("DearMe before-launch checks receipt");
    expect(beforeLaunchChecksReceiptNote.value).toContain("Waiting launch calls: 4");
    expect(beforeLaunchChecksReceiptNote.value).toContain("Boundary: launch only when the work sounds right");

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:dearme-launch-receipt-${createdBlobs.length}`;
    });
    const revokeObjectURL = vi.fn();
    const clickedDownloads: string[] = [];
    const clickedHrefs: string[] = [];
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownloads.push(this.download);
      clickedHrefs.push(this.href);
    });

    try {
      await act(async () => {
        buttonByLabel(decisionsSurface, "Download after-call-outcome-receipt.txt")?.click();
        buttonByLabel(decisionsSurface, "Download before-launch-checks-receipt.txt")?.click();
        launchProofHandoffReceiptDownload?.click();
      });

      expect(createObjectURL).toHaveBeenCalledTimes(3);
      const outcomeReceiptBlob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
      expect(outcomeReceiptBlob).not.toBeUndefined();
      expect(outcomeReceiptBlob?.type).toBe("text/plain;charset=utf-8");
      const outcomeReceiptText = await outcomeReceiptBlob!.text();
      expect(outcomeReceiptText).toContain("DearMe after-call outcome receipt");
      expect(outcomeReceiptText).toContain("Launch inside boundary: approved work moves forward");
      expect(outcomeReceiptText).toContain("Another pass: DearMe keeps working privately");
      const receiptBlob = createObjectURL.mock.calls[1]?.[0] as Blob | undefined;
      expect(receiptBlob).not.toBeUndefined();
      expect(receiptBlob?.type).toBe("text/plain;charset=utf-8");
      const receiptText = await receiptBlob!.text();
      expect(receiptText).toContain("DearMe before-launch checks receipt");
      expect(receiptText).toContain("Call choices: Launch inside boundary; Request changes; Pause the lane; Another pass");
      expect(receiptText).toContain("Must wait: public posts");
      const proofReceiptText = await createdBlobs[2]!.text();
      expect(proofReceiptText).toContain("DearMe launch-proof handoff");
      expect(proofReceiptText).toContain(
        "Approved phone-message proof recipient: Captured - +15551234567",
      );
      expect(proofReceiptText).toContain(
        "Capture command: pnpm --silent dearme:next-proof -- --target all --linkedin-messages-url 'https://www.linkedin.com/messaging/thread/example' --linkedin-recipient-urn 'selected launch-proof recipient' --imessage-recipient '+15551234567'",
      );
      expect(clickedDownloads).toEqual([
        "after-call-outcome-receipt.txt",
        "before-launch-checks-receipt.txt",
        "launch-proof-handoff-receipt.txt",
      ]);
      expect(clickedHrefs).toEqual([
        "blob:dearme-launch-receipt-1",
        "blob:dearme-launch-receipt-2",
        "blob:dearme-launch-receipt-3",
      ]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-launch-receipt-1");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-launch-receipt-2");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:dearme-launch-receipt-3");
    } finally {
      clickSpy.mockRestore();
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, "createObjectURL", {
          configurable: true,
          value: originalCreateObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, "revokeObjectURL", {
          configurable: true,
          value: originalRevokeObjectURL,
        });
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }

    expectNoHiddenProductTerms(
      `${decisionsSurface.textContent ?? ""} ${launchProofHandoffReceiptNote.value} ${afterCallOutcomeReceiptNote.value} ${beforeLaunchChecksReceiptNote.value}`,
      Object.values(HIDDEN_PRODUCT_TERMS),
    );

    await act(async () => {
      root.unmount();
    });

    const restoredRoot = createRoot(container);
    const restoredQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      restoredRoot.render(
        <QueryClientProvider client={restoredQueryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const restoredDecisionsSurface = surfaceByLabel(container, "Decisions needed");
    expect(restoredDecisionsSurface.querySelector('[aria-label="Launch proof detail readiness"]')?.textContent)
      .toContain("Ready for no-send check.");
    expect(
      (restoredDecisionsSurface.querySelector(
        '[aria-label="Launch proof handoff receipt note"]',
      ) as HTMLTextAreaElement | null)?.value,
    ).toContain("3/3 details captured");
    expect(
      (restoredDecisionsSurface.querySelector(
        'input[aria-label="Provide Professional-network delivery route"]',
      ) as HTMLInputElement | null)?.value,
    ).toBe("https://www.linkedin.com/messaging/thread/example");

    await act(async () => {
      restoredRoot.unmount();
    });
  });

  it("opens work-ready output with DearMe decision focus", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Review prepared work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-7&artifact=issue-1%3Aweekly_report",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces quiet private review progress without weakening launch boundaries", async () => {
    const response = workbenchResponse();
    response.workReady[0] = {
      ...response.workReady[0]!,
      status: "complete",
      reviewLoop: reviewLoopFixture(
        "approved",
        `This brand work kept moving with a default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10.`,
        {
          isRetriable: false,
          lastAction: "approve",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview:
            `No response came in, so DearMe kept this brand work moving with a default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10.`,
          defaultApprovalScore: DEARME_SILENCE_DEFAULT_REVIEW_SCORE,
          defaultedBySilence: true,
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const workReady = surfaceByLabel(container, "Work ready");
    const text = workReady.textContent ?? "";
    expect(text).toContain(`Proof score ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10`);
    expect(text).toContain(`default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10`);
    expect(text).toContain("Public posts, sends, deploys, and spend stay behind your launch call.");
    expect(text).not.toContain("Launched");
    expectNoHiddenProductTerms(text, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces first-week value fields on private output cards", async () => {
    mockDearmeApi.getOutputs.mockResolvedValue(outputsWithScannableFirstWeekDetails());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const privateWork = surfaceByLabel(container, "Brand work ready");
    const text = privateWork.textContent ?? "";
    expect(text).toContain("LinkedIn starter post");
    expect(text).toContain("Channel");
    expect(text).toContain("LinkedIn");
    expect(text).toContain("Audience");
    expect(text).toContain("Founder-operators");
    expect(text).toContain("Hook");
    expect(text).toContain("Draft body");
    expect(text).toContain("Proof used");
    expect(text).toContain("Launch boundary");
    expect(text).toContain("Approve before publishing.");
    expect(surfaceByLabel(container, "LinkedIn starter post launch boundary").textContent).toContain(
      "Approve before publishing.",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews a focused work-ready item from the customer-safe work route", async () => {
    mockLocation.search = "?view=decisions&work=PET-7";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    expect(focusedDecision.textContent).toContain("Work focused");
    expect(focusedDecision.textContent).toContain("Dear me report");
    expect(focusedDecision.textContent).toContain("Launch this work");
    expect(focusedDecision.textContent).toContain("Request changes");
    expect(focusedDecision.textContent).toContain("Prepare another pass");
    expect(focusedDecision.textContent).toContain("Choose new direction");
    const focusedOutcomeMap = surfaceByLabel(focusedDecision, "Decision outcome map");
    expect(focusedOutcomeMap.textContent).toContain("After your call");
    expect(focusedOutcomeMap.textContent).toContain("DearMe records approval, prepares the handoff");
    expect(focusedOutcomeMap.textContent).toContain("Your note becomes the next brief");
    expect(focusedOutcomeMap.textContent).toContain("DearMe keeps the goal, reuses the proof");
    expect(focusedOutcomeMap.textContent).toContain("stops spending cycles on this angle");
    expectMobileSafeFocusedDecision(focusedDecision, "prepared-work-review");

    await act(async () => {
      setTextareaValue(
        focusedDecision.querySelector("#dearme-focused-work-output-note") as HTMLTextAreaElement,
        "Make the proof sharper before I approve it.",
      );
      buttonByText(focusedDecision, "Request changes")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      { intent: "continue_revision", decisionNote: "Make the proof sharper before I approve it." },
    );
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens recovery actions for focused stuck work-ready items", async () => {
    mockLocation.search = "?view=decisions&work=PET-7";
    const response = workbenchResponse();
    response.workReady[0] = {
      ...response.workReady[0]!,
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "This path hit the retry limit. Improve direction before another pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          isRetriable: false,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Still too generic.",
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    const stuckRecovery = surfaceByLabel(focusedDecision, "Focused stuck work recovery");
    expect(stuckRecovery.textContent).toContain("This path is capped until direction improves.");
    expect(stuckRecovery.textContent).toContain("Do not spend another blind pass");
    expect(buttonByText(focusedDecision, "Launch this work")?.disabled).toBe(true);
    expect(buttonByText(focusedDecision, "Request changes")?.disabled).toBe(true);
    expect(buttonByText(focusedDecision, "Prepare another pass")?.disabled).toBe(true);
    expect(focusedDecision.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );

    await act(async () => {
      buttonByText(focusedDecision, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();

    await act(async () => {
      buttonByText(stuckRecovery, "Open Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("view=voice"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("#dearme-voice-memory"));
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(stuckRecovery, "Open support handoff")?.click();
    });
    await flushReact();

    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews a focused work-ready item from the DearMe decision drawer", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&artifact=issue-1%3Aweekly_report";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    expect(focusedDecision.textContent).toContain("Work focused");
    expect(focusedDecision.textContent).toContain("Dear me report");
    expect(focusedDecision.textContent).toContain("What should your team do next?");
    expectMobileSafeFocusedDecision(focusedDecision, "prepared-work-review");
    expect(focusedCardsInSurface(container, "Work ready").some((card) =>
      card.textContent?.includes("Dear me report"),
    )).toBe(true);

    await act(async () => {
      setTextareaValue(
        focusedDecision.querySelector("#dearme-focused-work-output-note") as HTMLTextAreaElement,
        "This is ready to represent me.",
      );
      buttonByText(focusedDecision, "Launch this work")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      {
        action: "approve",
        decisionNote: "This is ready to represent me.",
      },
    );
    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens a requested revision through the DearMe continue entrypoint", async () => {
    const response = workbenchResponse();
    response.workReady[0] = {
      ...response.workReady[0]!,
      reviewLoop: reviewLoopFixture(
        "revision_requested",
        "Your team has your note and should prepare a revised version.",
        {
          attemptCount: 1,
          lastAction: "request_changes",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Make the proof more concrete.",
        },
      ),
    };
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Continue revision");

    await act(async () => {
      buttonByText(container, "Continue revision")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-7&artifact=issue-1%3Aweekly_report&intent=continue",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews live feed output decisions in place", async () => {
    const contentOutput = outputsWithFirstCyclePacket().outputs[1]!;
    mockDearmeApi.reviewOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: "issue-2:content_drafts",
      action: "approve",
      status: "approved",
      comment: {
        id: "comment-live-feed-approve",
        bodyPreview: "DearMe decision: launch this prepared work.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: {
        ...contentOutput,
        status: "approved",
        isReviewable: false,
        reviewLoop: reviewLoopFixture("approved"),
      },
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const liveFeed = surfaceByLabel(container, "Live proof feed");
    const launchButton = buttonByText(liveFeed, "Launch this work");
    expect(launchButton).toBeTruthy();

    await act(async () => {
      launchButton?.click();
    });
    await flushReact();

    expect(mockDearmeApi.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-2:content_drafts",
      {
        action: "approve",
        decisionNote: "Launched in DearMe. This prepared work represents me.",
      },
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens live feed approval decisions in the DearMe approval surface", async () => {
    const response = workbenchResponse();
    const approvalFeedItem: DearMeWorkbenchStreamItem = {
      ...response.workStream[0]!,
      id: "decision:approval:approval-ready",
      role: "brand_strategist",
      title: "Your call: Start brand team for Peter Studio",
      summary: "Review the first growth-team plan before brand work starts.",
      artifact: "Brand team profile",
      sourceLabel: "Launch call",
      nextAction: "Start the brand team when the first cycle and launch boundaries match your brand.",
      relatedOutputId: null,
      issueId: null,
      issueIdentifier: null,
      approvalId: "approval-ready",
      reviewLoop: null,
    };
    response.workStream = [
      approvalFeedItem,
      ...response.workStream.slice(1),
    ];
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const reviewButton = buttonByText(container, "Review now");
    expect(reviewButton).toBeTruthy();

    await act(async () => {
      reviewButton?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&approval=approval-ready");

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces private handoff readiness after final approval", async () => {
    const response = workbenchResponse();
    response.recentProgress = [
      {
        id: "activity-private-handoff",
        kind: "execution_handoff_prepared",
        title: "Launch-ready posting brief prepared",
        summary: "DearMe prepared the launch-ready brief. Nothing external has run yet.",
        outputKind: "content_drafts",
        outputId: "issue-2:content_drafts",
        riskGate: "publish_social",
        approvalId: "approval-publish",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        executionReadiness: "private_handoff_ready",
        nextStep: "Review the channel-ready posting brief before any post goes live.",
        createdAt: "2026-05-07T14:06:00.000Z",
      },
      ...response.recentProgress,
    ];
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Launch-ready next step ready");
    expect(handoffPanel.textContent).toContain("Launch-ready next step");
    expect(handoffPanel.textContent).toContain("Launch-ready posting brief prepared");
    expect(handoffPanel.textContent).toContain("External action not run");
    expect(handoffPanel.textContent).toContain("channel-ready posting brief");
    expect(handoffPanel.textContent).toContain("Content drafts");
    expect(handoffPanel.querySelector('[aria-label="Launch handoff checklist"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("Ready to review: Content drafts.");
    expect(handoffPanel.textContent).toContain("Open the brief to check voice, proof, and boundary before launch.");
    expect(handoffPanel.textContent).toContain("Nothing public or external runs until you make the next call.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("What changed");
    expect(handoffPanel.textContent).toContain("Launch boundary");
    expect(handoffPanel.textContent).toContain("Your next step");
    expect(handoffPanel.textContent).toContain("DearMe prepared Content drafts for your review.");
    expect(handoffPanel.textContent).toContain("Open the brief to check voice, proof, and boundary.");
    expect(handoffPanel.textContent).not.toMatch(/execution handoff|launch queue/i);
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      buttonByText(handoffPanel, "Open brief")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-8&artifact=issue-2%3Acontent_drafts",
    );
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces paused private handoff readiness after a stop intent", async () => {
    const response = workbenchResponse();
    response.recentProgress = [
      {
        id: "activity-private-handoff-paused",
        kind: "execution_handoff_prepared",
        title: "Launch-ready posting step paused",
        summary: "DearMe paused the next launch step. Nothing external has run yet.",
        outputKind: "content_drafts",
        outputId: "issue-2:content_drafts",
        riskGate: "publish_social",
        approvalId: "approval-publish",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        executionReadiness: "private_handoff_paused",
        nextStep: "DearMe is paused until you resume or choose a new direction.",
        createdAt: "2026-05-07T14:06:00.000Z",
      },
      ...response.recentProgress,
    ];
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Launch-ready next step paused");
    expect(handoffPanel.textContent).toContain("Launch-ready posting step paused");
    expect(handoffPanel.textContent).toContain("Paused");
    expect(handoffPanel.textContent).toContain("DearMe is paused until you resume or choose a new direction.");
    expect(handoffPanel.textContent).toContain("External action not run");
    expect(handoffPanel.textContent).toContain("Saved for later: Content drafts.");
    expect(handoffPanel.textContent).toContain("Nothing public or external runs while paused.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("DearMe saved Content drafts instead of pushing it forward.");
    expect(handoffPanel.textContent).toContain(
      "Your brand team stays paused until you resume or choose a new direction.",
    );
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      buttonByText(handoffPanel, "Open brief")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-8&artifact=issue-2%3Acontent_drafts",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces connect-channel readiness without raw substrate terms", async () => {
    const response = workbenchResponse();
    response.recentProgress = [
      {
        id: "activity-private-handoff-connect",
        kind: "execution_handoff_prepared",
        title: "Launch-ready X brief prepared",
        summary: "The final launch call is recorded and DearMe prepared the launch-ready X brief. External action: still not run. Next: Add the selected X account before DearMe can continue this next step.",
        outputKind: "content_drafts",
        outputId: "issue-2:content_drafts",
        riskGate: "publish_social",
        approvalId: "approval-publish",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        executionReadiness: "private_handoff_ready",
        nextStep: "Add the selected X account before DearMe can continue this next step.",
        createdAt: "2026-05-07T14:06:00.000Z",
      },
      ...response.recentProgress,
    ];
    mockDearmeApi.getWorkbench.mockResolvedValue(response);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Launch-ready next step ready");
    expect(handoffPanel.textContent).toContain("Launch-ready X brief prepared");
    expect(handoffPanel.textContent).toContain("Add the selected X account before DearMe can continue this next step.");
    expect(handoffPanel.textContent).toContain("External action not run");
    expect(handoffPanel.textContent).not.toContain("connect_channel_required");
    expect(handoffPanel.textContent).not.toContain("launchHandoff");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      buttonByText(handoffPanel, "Open brief")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-8&artifact=issue-2%3Acontent_drafts",
    );
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders a DearMe-owned approval decision detail from URL params", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Decision focused");
    expect(container.textContent).toContain("Start brand team for Peter Studio");
    expect(container.textContent).toContain("Review the first growth-team plan");
    expect(container.textContent).toContain("The team keeps preparing; public launch stays behind your boundary");
    expect(container.textContent).toContain("Launch prepared move");
    expect(container.textContent).toContain("Request changes");
    expect(container.textContent).toContain("Reject");
    const focusedDecision = surfaceByLabel(container, "Focused decision");
    const outcomeMap = surfaceByLabel(focusedDecision, "Decision outcome map");
    expect(outcomeMap.textContent).toContain("After your call");
    expect(outcomeMap.textContent).toContain("DearMe records the launch call");
    expect(outcomeMap.textContent).toContain("external action still waits for the approved channel or account");
    expect(outcomeMap.textContent).toContain("The move goes back to the team with your note");
    expect(outcomeMap.textContent).toContain("DearMe stops this move");
    expect(focusedDecision.textContent).toContain("Fast feedback");
    expect(focusedDecision.textContent).toContain("Voice feels off");
    expect(focusedDecision.textContent).toContain("Need stronger proof");
    expect(focusedDecision.textContent).toContain("Keep it staged");
    expectNoHiddenProductTerms(focusedDecision.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expectMobileSafeFocusedDecision(surfaceByLabel(container, "Focused decision"), "approval-review");
    expect(container.textContent).not.toContain("/approvals/");
    expect(focusedCardsInSurface(container, "Decisions needed").some((card) =>
      card.textContent?.includes("Start brand team for Peter Studio"),
    )).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it("uses a fast feedback note on a focused DearMe decision", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    await act(async () => {
      buttonByText(focusedDecision, "Need stronger proof")?.click();
    });
    await flushReact();

    expect((focusedDecision.querySelector("#dearme-focused-decision-note") as HTMLTextAreaElement).value).toBe(
      "Attach stronger proof for the claim before moving forward.",
    );

    await act(async () => {
      buttonByText(focusedDecision, "Request changes")?.click();
    });
    await flushReact();

    expect(mockApprovalsApi.requestRevision).toHaveBeenCalledWith(
      "approval-ready",
      "Attach stronger proof for the claim before moving forward.",
    );
    expect(mockApprovalsApi.approve).not.toHaveBeenCalled();
    expect(mockApprovalsApi.reject).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("approves a focused DearMe decision through the existing approval gate", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Launch prepared move")?.click();
    });
    await flushReact();

    expect(mockApprovalsApi.approve).toHaveBeenCalledWith(
      "approval-ready",
      "Launched in DearMe. This represents me.",
    );
    expect(mockApprovalsApi.requestRevision).not.toHaveBeenCalled();
    expect(mockApprovalsApi.reject).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/approvals/"));
    expect(container.textContent).not.toContain("/approvals/");

    await act(async () => {
      root.unmount();
    });
  });

  it("requests changes on a focused DearMe decision with the user's note", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-focused-decision-note") as HTMLTextAreaElement,
        "Make the positioning sharper before this represents me.",
      );
      buttonByText(container, "Request changes")?.click();
    });
    await flushReact();

    expect(mockApprovalsApi.requestRevision).toHaveBeenCalledWith(
      "approval-ready",
      "Make the positioning sharper before this represents me.",
    );
    expect(mockApprovalsApi.approve).not.toHaveBeenCalled();
    expect(mockApprovalsApi.reject).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/approvals/"));
    expect(container.textContent).not.toContain("/approvals/");

    await act(async () => {
      root.unmount();
    });
  });

  it("rejects a focused DearMe decision without leaking the approval route", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Reject")?.click();
    });
    await flushReact();

    expect(mockApprovalsApi.reject).toHaveBeenCalledWith(
      "approval-ready",
      "Rejected in DearMe. Do not move this forward.",
    );
    expect(mockApprovalsApi.approve).not.toHaveBeenCalled();
    expect(mockApprovalsApi.requestRevision).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/approvals/"));
    expect(container.textContent).not.toContain("/approvals/");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps focused DearMe decision errors customer-safe", async () => {
    mockLocation.search = "?view=decisions&approval=approval-ready";
    mockApprovalsApi.reject.mockRejectedValueOnce(
      new Error("Claude API key token failed inside OMX decision route."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Reject")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("DearMe decision needs attention. Try again before moving this forward.");
    expect(text).not.toContain("Claude");
    expect(text).not.toContain("API key");
    expect(text).not.toContain("token");
    expect(text).not.toContain("OMX");
    expect(text).not.toContain("decision route");
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/approvals/"));

    await act(async () => {
      root.unmount();
    });
  });

  it("opens a team workbench batch decision", async () => {
    mockLocation.search = "?codexProductQa=20260512n-owner-proof-details&view=brand-os";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Review posts")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?codexProductQa=20260512n-owner-proof-details&view=decisions&work=issue-2&artifact=issue-2%3Acontent_drafts",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("opens the Dear me letter with exact output focus", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Open letter")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-7&artifact=issue-1%3Aweekly_report",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("reviews a focused batch prepared item from the batch decision surface", async () => {
    mockLocation.search = "?view=decisions&issue=issue-2";
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    expect(focusedDecision.textContent).toContain("Review content batch");
    expect(focusedDecision.textContent).toContain("Launch this work");
    expect(focusedDecision.textContent).toContain("Request changes");
    expect(focusedDecision.textContent).toContain("Prepare another pass");
    expect(focusedDecision.textContent).toContain("Choose new direction");
    expect(focusedDecision.textContent).toContain("DearMe prepared the work; the launch boundary controls the external move.");
    const outcomeMap = surfaceByLabel(focusedDecision, "Decision outcome map");
    expect(outcomeMap.textContent).toContain("After your call");
    expect(outcomeMap.textContent).toContain("DearMe records approval, prepares the handoff");
    expect(outcomeMap.textContent).toContain("Your note becomes the next brief");
    expectMobileSafeFocusedDecision(focusedDecision, "prepared-work-review");
    expect(focusedCardsInSurface(container, "Work ready").some((card) =>
      card.textContent?.includes("Starter posts"),
    )).toBe(true);
    expect(focusedCardsInSurface(container, "Decisions needed").some((card) =>
      card.textContent?.includes("Review content batch"),
    )).toBe(true);

    await act(async () => {
      setTextareaValue(
        focusedDecision.querySelector("#dearme-focused-batch-output-note") as HTMLTextAreaElement,
        "This angle is not useful for the audience.",
      );
      buttonByText(focusedDecision, "Choose new direction")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-2:content_drafts",
      { intent: "choose_new_direction", decisionNote: "This angle is not useful for the audience." },
    );
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/issues/"));
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("locks focused batch review controls when the batched path is capped", async () => {
    mockLocation.search = "?view=decisions&issue=issue-2";
    const cappedWorkbench = workbenchResponse();
    cappedWorkbench.workReady[1]!.reviewLoop = reviewLoopFixture(
      "retry_limit_reached",
      "Review the repeated path with Voice & Memory before spending another pass.",
      {
        attemptCount: 3,
        maxAttempts: 3,
        isRetriable: false,
        lastAction: "not_useful",
      },
    );
    mockDearmeApi.getWorkbench.mockResolvedValue(cappedWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedDecision = surfaceByLabel(container, "Focused decision");
    expect(focusedDecision.textContent).toContain("Review content batch");
    expect(focusedDecision.textContent).toContain("This path is capped until direction improves.");
    expect(focusedDecision.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );
    expect(buttonByText(focusedDecision, "Launch this work")?.disabled).toBe(true);
    expect(buttonByText(focusedDecision, "Request changes")?.disabled).toBe(true);
    expect(buttonByText(focusedDecision, "Prepare another pass")?.disabled).toBe(true);
    expect(buttonByText(focusedDecision, "Choose new direction")?.disabled).toBe(true);

    await act(async () => {
      buttonByText(focusedDecision, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("marks capped batch decision cards as direction-needed before opening", async () => {
    const cappedWorkbench = workbenchResponse();
    cappedWorkbench.workReady[1]!.reviewLoop = reviewLoopFixture(
      "retry_limit_reached",
      "Review the repeated path with Voice & Memory before spending another pass.",
      {
        attemptCount: 3,
        maxAttempts: 3,
        isRetriable: false,
        lastAction: "not_useful",
      },
    );
    mockDearmeApi.getWorkbench.mockResolvedValue(cappedWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const decisionsPanel = surfaceByLabel(container, "Decisions needed");
    const cappedBatchCard = [...decisionsPanel.querySelectorAll<HTMLElement>('[data-dearme-surface="action-card"]')]
      .find((card) => card.textContent?.includes("Review content batch"));

    expect(cappedBatchCard).toBeTruthy();
    expect(cappedBatchCard!.textContent).toContain("Direction needed");
    expect(cappedBatchCard!.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );
    expect(cappedBatchCard!.textContent).toContain(
      "Add Voice & Memory context or use support before another pass.",
    );
    expect(buttonByText(cappedBatchCard!, "Review posts")?.disabled).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });

  it("does not show the empty decision state when batch decisions are waiting", async () => {
    const batchOnlyWorkbench = workbenchResponse();
    batchOnlyWorkbench.decisionsNeeded = [];
    mockDearmeApi.getWorkbench.mockResolvedValue(batchOnlyWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Review content batch");
    expect(container.textContent).toContain("Launch call ready");
    expect(container.textContent).toContain("Launch, request changes, pause, or ask for another pass.");
    expect(container.textContent).not.toContain("No high-leverage decision is waiting right now");

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces private source reviews as high-leverage decisions", async () => {
    const sourceReviewWorkbench = workbenchResponse();
    sourceReviewWorkbench.decisionsNeeded = [];
    sourceReviewWorkbench.batchDecisions = [];
    mockDearmeApi.getWorkbench.mockResolvedValue(sourceReviewWorkbench);
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const decisionsSurface = surfaceByLabel(container, "Decisions needed");
    expect(decisionsSurface.textContent).toContain("Source reviews");
    expect(decisionsSurface.textContent).toContain("Shipped proof");
    expect(decisionsSurface.textContent).toContain("Review this proof point");
    expect(decisionsSurface.textContent).toContain("Review source");
    expect(decisionsSurface.textContent).not.toContain("No high-leverage decision is waiting right now");
    expectNoHiddenProductTerms(decisionsSurface.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    const sourceReviewTarget = document.getElementById(
      "dearme-source-review-source-review-memory-2",
    ) as HTMLElement;
    const scrollIntoView = vi.fn();
    Object.defineProperty(sourceReviewTarget, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    await act(async () => {
      buttonByText(decisionsSurface, "Review source")?.click();
    });
    await flushReact();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(container.querySelector('[data-dearme-source-review-focus="true"]')?.textContent).toContain("Shipped proof");
    expect(surfaceByLabel(container, "Source review detail").textContent).toContain("Shipped proof");
    expect((container.querySelector("#dearme-memory-kind") as HTMLSelectElement).value).toBe("proof_point");
    expect((container.querySelector("#dearme-memory-title") as HTMLInputElement).value).toBe("Shipped proof");
    expect((container.querySelector("#dearme-memory-source") as HTMLInputElement).value).toBe("Build log");
    expect((container.querySelector("#dearme-memory-body") as HTMLTextAreaElement).value).toBe(
      "Shipped a working local product.",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("renders a focused private output from DearMe URL params", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&artifact=issue-1%3Aweekly_report";
    mockDearmeApi.getOutputs.mockResolvedValue(outputsResponse({
      reviewLoop: reviewLoopFixture(
        "needs_user_review",
        "Review this updated brand work; your last feedback is reflected below before anything goes public.",
        {
          attemptCount: 1,
          lastAction: "request_changes",
          lastDecisionAt: "2026-05-07T13:40:00.000Z",
          lastDecisionNotePreview: "Make the proof more concrete and less generic.",
          feedbackTrace: {
            headline: "Feedback applied",
            summary: "DearMe used your change request before preparing this version.",
            userFeedback: "Make the proof more concrete and less generic.",
            changes: [
              "Revised the draft around your requested change.",
              "Current draft focus: Refreshed positioning and prepared next bets.",
              "Staged until you launch it.",
            ],
            receipts: [
              "Change requested: Make the proof more concrete and less generic.",
              "Another pass requested: Try a stronger proof-led opening before the launch call.",
            ],
          },
        },
      ),
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Focused work");
    expect(container.textContent).toContain("Dear me report");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("Review one public claim before publishing");
    expect(container.textContent).toContain("Sources behind this work");
    expect(container.textContent).toContain("Proof used");
    const focusedWork = surfaceByLabel(container, "Focused work");
    expect(focusedWork.textContent).toContain("Voice check");
    expect(focusedWork.textContent).toContain("Voice ");
    expect(focusedWork.textContent).toContain("/100");
    expect(focusedWork.textContent).toContain("Public moves stay behind your launch call.");
    expect(focusedWork.textContent).toContain("Review pass 1/3");
    const focusedWorkOutcomeMap = surfaceByLabel(focusedWork, "Decision outcome map");
    expect(focusedWorkOutcomeMap.textContent).toContain("After your call");
    expect(focusedWorkOutcomeMap.textContent).toContain("DearMe records approval, prepares the handoff");
    expect(focusedWorkOutcomeMap.textContent).toContain("DearMe keeps the goal, reuses the proof");
    expect(container.textContent).toContain("Needs your review");
    expect(container.textContent).toContain("Feedback applied");
    expect(container.textContent).toContain("You asked: Make the proof more concrete and less generic.");
    expect(container.textContent).toContain("Staged until you launch it.");
    expect(container.textContent).toContain("Review path");
    expect(container.textContent).toContain("Another pass requested: Try a stronger proof-led opening before the launch call.");
    expect(container.textContent).toContain("1 proof reference prepared");
    expect(container.textContent).not.toContain("/issues/");
    expect(focusedCardsInSurface(container, "Work ready").some((card) =>
      card.textContent?.includes("Dear me report"),
    )).toBe(true);
    expect(focusedCardsInSurface(container, "Brand work ready").some((card) =>
      card.textContent?.includes("Dear me report"),
    )).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it("explains missing Voice & Memory context on focused prepared work", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const response = outputsResponse();
    const blankEvidence = {
      ...response.outputs[0]!.sourceEvidence[0]!,
      label: " ",
      summary: " ",
    };
    mockDearmeApi.getOutputs.mockResolvedValue({
      ...response,
      outputs: [
        {
          ...response.outputs[0]!,
          sourceEvidence: [blankEvidence],
        },
      ],
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    expect(focusedWork.textContent).toContain("No Voice & Memory context yet");
    expect(focusedWork.textContent).toContain("Add one real voice sample, proof point, or launch boundary");
    expect(focusedWork.textContent).not.toContain("Sources behind this work");

    await act(async () => {
      root.unmount();
    });
  });

  it("opens recovery actions for focused stuck prepared work", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report&intent=blocked";
    mockDearmeApi.getOutputs.mockResolvedValue(outputsResponse({
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "This path hit the retry limit. Improve direction before another pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          isRetriable: false,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Still too generic.",
        },
      ),
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    const stuckRecovery = surfaceByLabel(focusedWork, "Focused stuck work recovery");
    expect(stuckRecovery.textContent).toContain("This path is capped until direction improves.");
    expect(stuckRecovery.textContent).toContain("Open Voice & Memory");
    expect(stuckRecovery.textContent).toContain("Open support handoff");
    expect(buttonByText(focusedWork, "Launch this work")?.disabled).toBe(true);
    expect(buttonByText(focusedWork, "Request changes")?.disabled).toBe(true);
    expect(buttonByText(focusedWork, "Prepare another pass")?.disabled).toBe(true);
    expect(focusedWork.textContent).toContain(
      "This path is capped. Add Voice & Memory context or use the support handoff before another pass.",
    );

    await act(async () => {
      buttonByText(focusedWork, "Prepare another pass")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).not.toHaveBeenCalled();

    await act(async () => {
      buttonByText(stuckRecovery, "Open Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("view=voice"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("#dearme-voice-memory"));
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(stuckRecovery, "Open support handoff")?.click();
    });
    await flushReact();

    expect(window.location.hash).toBe("#dearme-support-handoff");

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces voice calibration when repeated rejected work needs more samples", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report&intent=blocked";
    mockDearmeApi.getOutputs.mockResolvedValue(outputsResponse({
      reviewLoop: reviewLoopFixture(
        "retry_limit_reached",
        "Open Voice & Memory, add the samples, then describe what did not sound like you before the next private pass.",
        {
          attemptCount: 3,
          maxAttempts: 3,
          isRetriable: false,
          lastAction: "not_useful",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "This still does not sound like me.",
          voiceCalibration: {
            active: true,
            sampleTarget: 5,
            title: "Voice calibration needed",
            prompt: "Add 5 more real writing samples so DearMe can recalibrate before preparing another private pass.",
            clarificationPrompt:
              "Add one note about what felt off in the rejected drafts: tone, pacing, specificity, confidence, or audience fit.",
            nextAction:
              "Open Voice & Memory, add the samples, then describe what did not sound like you before the next private pass.",
          },
        },
      ),
    }));
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    const stuckRecovery = surfaceByLabel(focusedWork, "Focused stuck work recovery");
    expect(stuckRecovery.textContent).toContain("Voice calibration needed");
    expect(stuckRecovery.textContent).toContain("Add 5 more real writing samples");
    expect(stuckRecovery.textContent).toContain("what felt off");
    expect(stuckRecovery.textContent).toContain("Open Voice & Memory");

    await act(async () => {
      buttonByText(stuckRecovery, "Open Voice & Memory")?.click();
    });
    await flushReact();

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("view=voice"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("#dearme-voice-memory"));

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps stale prepared work readable while artifacts sync", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const response = outputsResponse();
    mockDearmeApi.getOutputs.mockResolvedValue({
      ...response,
      outputs: [
        {
          ...response.outputs[0]!,
          summary: "A report is ready for review while the full artifact finishes syncing.",
          documents: [],
          workProducts: [],
          latestUpdate: null,
        },
      ],
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(surfaceByLabel(container, "Focused work").textContent).toContain(
      "A report is ready for review while the full artifact finishes syncing.",
    );
    const privateWork = surfaceByLabel(container, "Brand work ready");
    expect(privateWork.textContent).toContain(
      "A report is ready for review while the full artifact finishes syncing.",
    );
    expect(privateWork.textContent).not.toContain("Waiting for the first draft.");
    expect(container.textContent).not.toContain("Paperclip");

    await act(async () => {
      root.unmount();
    });
  });

  it("explains new direction entrypoint for not-useful prepared work", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report&intent=direction";
    mockDearmeApi.getOutputs.mockResolvedValue({
      companyId: "company-1",
      outputs: [
        {
          ...outputsResponse().outputs[0],
          reviewLoop: reviewLoopFixture(
            "not_useful",
            "Your team should avoid this angle and try a different route next.",
            {
              attemptCount: 1,
              lastAction: "not_useful",
              lastDecisionAt: "2026-05-07T14:05:00.000Z",
              lastDecisionNotePreview: "This angle is not useful for the audience.",
            },
          ),
        },
      ],
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain(
      "Give one clear instruction so DearMe does not keep trying the wrong angle.",
    );
    expect(container.textContent).toContain("Give new direction");
    expect(container.querySelector('[data-dearme-action-attention="paused"]')).not.toBeNull();
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders review handoff context for the next draft", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    mockDearmeApi.getOutputs.mockResolvedValue({
      companyId: "company-1",
      outputs: [
        {
          ...outputsResponse().outputs[0],
          reviewLoop: reviewLoopFixture(
            "revision_requested",
            "Your team has your note and should prepare a revised version.",
            {
              attemptCount: 1,
              lastAction: "request_changes",
              lastDecisionAt: "2026-05-07T14:05:00.000Z",
              lastDecisionNotePreview: "Make the proof more concrete.",
              reviewHandoff: {
                action: "request_changes",
                title: "Change request captured",
                summary: "DearMe will keep your note attached to the next revision.",
                userDirection: "Make the proof more concrete.",
                nextDraftDirection: "Revise the current draft around this note before the next launch call.",
              },
            },
          ),
        },
      ],
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("Review handoff");
    expect(container.textContent).toContain("Change request captured");
    expect(container.textContent).toContain("Your note: Make the proof more concrete.");
    expect(container.textContent).toContain("Revise the current draft around this note");
    expect(container.querySelector('[data-dearme-action-attention="retry"]')).not.toBeNull();
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("requests another pass from focused output without exposing issue route", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const initialOutputs = outputsResponse() as DearMeOutputsResponse;
    const reviewedOutput: DearMeOutputsResponse["outputs"][number] = {
      ...initialOutputs.outputs[0],
      status: "working",
      isReviewable: false,
      updatedAt: "2026-05-07T14:05:00.000Z",
    };
    mockDearmeApi.getOutputs.mockResolvedValueOnce(initialOutputs);
    mockDearmeApi.continueOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: reviewedOutput.id,
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-2",
        bodyPreview: "DearMe decision: prepare another pass before review.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: reviewedOutput,
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(container.textContent).toContain("What should your team do next?");
    const focusedWork = surfaceByLabel(container, "Focused work");
    const prepareAnotherPassButton = buttonByText(focusedWork, "Prepare another pass");
    expect(prepareAnotherPassButton).toBeDefined();
    expect(prepareAnotherPassButton?.disabled).toBe(false);

    mockDearmeApi.getOutputs.mockImplementation(
      () => new Promise<DearMeOutputsResponse>(() => {}),
    );

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-focused-output-note") as HTMLTextAreaElement,
        "Make it sharper before review.",
      );
      prepareAnotherPassButton?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      { intent: "prepare_another_pass", decisionNote: "Make it sharper before review." },
    );
    expect(mockDearmeApi.reviewOutput).not.toHaveBeenCalled();
    const cachedOutputs = queryClient.getQueryData<DearMeOutputsResponse>(
      queryKeys.dearme.outputs("company-1"),
    );
    expect(cachedOutputs?.outputs[0]).toEqual(
      expect.objectContaining({
        id: "issue-1:weekly_report",
        status: "working",
        isReviewable: false,
      }),
    );
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps review-memory receipts in the focused output cache while the next refresh is pending", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const initialOutputs = outputsResponse() as DearMeOutputsResponse;
    const reviewedOutput: DearMeOutputsResponse["outputs"][number] = {
      ...initialOutputs.outputs[0],
      updatedAt: "2026-05-07T14:08:00.000Z",
      reviewLoop: reviewLoopFixture(
        "needs_user_review",
        "Review this updated brand work; your last feedback is reflected below before anything goes public.",
        {
          attemptCount: 1,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Try a stronger proof-led opening before the launch call.",
          feedbackTrace: {
            headline: "Feedback applied",
            summary: "DearMe prepared a new version instead of lightly editing the previous one.",
            userFeedback: "Try a stronger proof-led opening before the launch call.",
            changes: [
              "Prepared a replacement version from your direction.",
              "Current draft focus: Refreshed positioning and prepared next bets.",
              "Staged until you launch it.",
            ],
            receipts: [
              "Another pass requested: Try a stronger proof-led opening before the launch call.",
            ],
          },
        },
      ),
    };
    mockDearmeApi.getOutputs.mockResolvedValueOnce(initialOutputs);
    mockDearmeApi.continueOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: reviewedOutput.id,
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-2",
        bodyPreview: "DearMe decision: prepare another pass before review.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: reviewedOutput,
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    const prepareAnotherPassButton = buttonByText(focusedWork, "Prepare another pass");
    expect(prepareAnotherPassButton).toBeDefined();

    mockDearmeApi.getOutputs.mockImplementation(
      () => new Promise<DearMeOutputsResponse>(() => {}),
    );

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-focused-output-note") as HTMLTextAreaElement,
        "Try a stronger proof-led opening before the launch call.",
      );
      prepareAnotherPassButton?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      {
        intent: "prepare_another_pass",
        decisionNote: "Try a stronger proof-led opening before the launch call.",
      },
    );
    const cachedOutputs = queryClient.getQueryData<DearMeOutputsResponse>(
      queryKeys.dearme.outputs("company-1"),
    );
    expect(cachedOutputs?.outputs[0]?.reviewLoop.feedbackTrace?.receipts).toEqual([
      "Another pass requested: Try a stronger proof-led opening before the launch call.",
    ]);
    expect(container.textContent).toContain("Feedback applied");
    expect(container.textContent).toContain(
      "Another pass requested: Try a stronger proof-led opening before the launch call.",
    );
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps focused brand work review errors customer-safe", async () => {
    mockLocation.search = "?view=decisions&work=PET-7&artifact=issue-1%3Aweekly_report";
    mockDearmeApi.getOutputs.mockResolvedValue(outputsResponse());
    mockDearmeApi.reviewOutput.mockRejectedValueOnce(
      new Error("Provider runtime could not update the workbench output."),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    expect(focusedWork.textContent).toContain("What should your team do next?");

    await act(async () => {
      buttonByText(focusedWork, "Launch this work")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(mockDearmeApi.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      { action: "approve", decisionNote: "Launched in DearMe. This prepared work represents me." },
    );
    expect(text).toContain("DearMe work needs attention. Try again before moving this forward.");
    expect(text).not.toContain("Provider runtime");
    expect(text).not.toContain("workbench output");

    await act(async () => {
      root.unmount();
    });
  });

  it("lets users choose a new direction from the focused output", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const initialOutputs = outputsResponse() as DearMeOutputsResponse;
    const reviewedOutput: DearMeOutputsResponse["outputs"][number] = {
      ...initialOutputs.outputs[0],
      status: "working",
      isReviewable: false,
      updatedAt: "2026-05-07T14:05:00.000Z",
      reviewLoop: reviewLoopFixture(
        "not_useful",
        "Your team should avoid this angle and choose a clearer direction.",
        {
          attemptCount: 1,
          lastAction: "not_useful",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "This angle is not useful for the audience.",
        },
      ),
    };
    mockDearmeApi.getOutputs.mockResolvedValueOnce(initialOutputs);
    mockDearmeApi.continueOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: reviewedOutput.id,
      action: "not_useful",
      status: "queued",
      comment: {
        id: "comment-3",
        bodyPreview: "DearMe decision: marked this prepared work as not useful.",
        createdAt: "2026-05-07T14:05:00.000Z",
      },
      output: reviewedOutput,
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const focusedWork = surfaceByLabel(container, "Focused work");
    const chooseNewDirectionButton = buttonByText(focusedWork, "Choose new direction");
    expect(chooseNewDirectionButton).toBeDefined();
    expect(chooseNewDirectionButton?.disabled).toBe(false);

    mockDearmeApi.getOutputs.mockImplementation(
      () => new Promise<DearMeOutputsResponse>(() => {}),
    );

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-focused-output-note") as HTMLTextAreaElement,
        "This angle is not useful for the audience.",
      );
      chooseNewDirectionButton?.click();
    });
    await flushReact();

    expect(mockDearmeApi.continueOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      { intent: "choose_new_direction", decisionNote: "This angle is not useful for the audience." },
    );
    const cachedOutputs = queryClient.getQueryData<DearMeOutputsResponse>(
      queryKeys.dearme.outputs("company-1"),
    );
    expect(cachedOutputs?.outputs[0]).toEqual(
      expect.objectContaining({
        id: "issue-1:weekly_report",
        status: "working",
        isReviewable: false,
        reviewLoop: expect.objectContaining({
          state: "not_useful",
          lastAction: "not_useful",
        }),
      }),
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("records a paid beta payment from the onboarding surface", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-paid-beta-amount") as HTMLInputElement,
        "500",
      );
      setInputValue(
        container.querySelector("#dearme-paid-beta-invoice") as HTMLInputElement,
        "manual-invoice-1",
      );
    });

    await act(async () => {
      buttonByText(container, "Record payment")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.recordPaidBetaPayment).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        amountCents: 50_000,
        currency: "USD",
        description: "Founding beta payment",
        externalInvoiceId: "manual-invoice-1",
      }),
    );
    expect(queryClient.getQueryData(queryKeys.dearme.paidBetaAccess("company-1"))).toEqual(
      expect.objectContaining({
        status: "active",
        latestExternalInvoiceId: "manual-invoice-1",
      }),
    );
    const paidBetaCustomerReceipt = surfaceByLabel(container, "Paid beta customer receipt");
    expect(paidBetaCustomerReceipt.textContent).toContain(
      "Paid beta account is open.",
    );
    expect(paidBetaCustomerReceipt.textContent).toContain(
      "manual-invoice-1",
    );
    expect(paidBetaCustomerReceipt.textContent).toContain("Start first cycle now");
    expect(surfaceByLabel(container, "Paid beta close kit").textContent).toContain(
      "Paid beta account is ready to start.",
    );
    expect((surfaceByLabel(container, "Paid beta close kit note") as HTMLTextAreaElement).value).toContain(
      "Receipt: manual-invoice-1",
    );
    expect(surfaceByLabel(container, "Paid beta payment path receipt").textContent).toContain(
      "Payment is recorded; paid work can start.",
    );
    expect((surfaceByLabel(container, "Paid beta payment path note") as HTMLTextAreaElement).value).toContain(
      "Mode: paid beta access recorded",
    );
    expect(surfaceByLabel(container, "Paid beta welcome plan").textContent).toContain(
      "The first paid week has a clear promise.",
    );
    expect((surfaceByLabel(container, "Paid beta welcome plan note") as HTMLTextAreaElement).value).toContain(
      "Receipt: manual-invoice-1",
    );
    expect(surfaceByLabel(container, "Paid beta payment recorded").textContent).toContain(
      "Payment recorded. Paid beta access is open for this account",
    );
    expect(surfaceByLabel(container, "Paid beta payment recorded").textContent).toContain(
      "Start first cycle now",
    );

    await act(async () => {
      buttonByText(paidBetaCustomerReceipt, "Start first cycle now")?.click();
    });
    expect(document.activeElement).toBe(container.querySelector("#dearme-first-cycle-intent"));

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps paid beta payment failures customer-safe", async () => {
    mockDearmeApi.recordPaidBetaPayment.mockRejectedValueOnce(
      new Error("OpenClaw adapter runtime failed"),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    await act(async () => {
      buttonByText(container, "Record payment")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Payment could not be recorded. Try again before counting paid beta access.");
    expect(text).not.toContain("OpenClaw");
    expect(text).not.toContain("adapter");
    expect(text).not.toContain("runtime");

    await act(async () => {
      root.unmount();
    });
  });

  it("shows generated brand work and opens the customer-safe work route", async () => {
    mockDearmeApi.getOutputs.mockResolvedValue(outputsResponse());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    expect(mockDearmeApi.getOutputs).toHaveBeenCalledWith("company-1");
    expect(container.textContent).toContain("Ready for your review");
    expect(container.textContent).toContain(
      "Review first in Work Ready, make launch calls in Decisions, and let the brand lane keep moving between your calls.",
    );
    expect(container.textContent).toContain("1 item ready");
    const privateWork = surfaceByLabel(container, "Brand work ready");
    expect(privateWork.textContent).toContain("Open Decisions");
    expect(privateWork.textContent).toContain("Open Voice & Memory");
    expect(container.textContent).toContain("Dear me report");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("Decisions needed");
    expect(container.textContent).toContain("Review one public claim");
    expect(container.textContent).toContain("Sources behind this work");
    expect(container.textContent).toContain("Proof used");
    expect(container.textContent).toContain("Prepared by Growth Analyst");
    expect(container.textContent).toContain("Ready for review");
    expect(container.textContent).not.toContain("Work ready / Decisions needed");
    expect(container.textContent).not.toContain("1 surfaces");
    expect(
      container.querySelectorAll(
        '[aria-label="Brand work ready"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(
        '[aria-label="Brand work ready"] [data-dearme-action-attention="decision_needed"]',
      ),
    ).not.toBeNull();

    await act(async () => {
      buttonByText(privateWork, "Open Decisions")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions#dearme-decisions-needed");
    mockNavigate.mockClear();

    await act(async () => {
      buttonByText(privateWork, "Open Voice & Memory")?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=voice#dearme-voice-memory");
    mockNavigate.mockClear();

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent?.trim() === "Review")
        ?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-7&artifact=issue-1%3Aweekly_report",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("scrubs runtime-smoke wording from customer-facing prepared work", async () => {
    const response = outputsResponse();
    const unsafeOutput = response.outputs[0]!;
    mockDearmeApi.getOutputs.mockResolvedValue({
      ...response,
      outputs: [
        {
          ...unsafeOutput,
          title: "DearMe Runtime Smoke 1778131117797",
          summary:
            "Proof preview route: dearme.app/dearme proof check 1778131117797. Proposed copy: DearMe Proof Check 1778131117797 helps potential customers.",
          documents: unsafeOutput.documents.map((document) => ({
            ...document,
            bodyPreview:
              "Proposed copy: DearMe Runtime Smoke 1778131117797 helps potential customers make the work public.",
          })),
          details: unsafeOutput.details.map((detail) => ({
            ...detail,
            value: "Proposed copy: DearMe Runtime Smoke 1778131117797 helps potential customers.",
          })),
          sourceEvidence: unsafeOutput.sourceEvidence.map((evidence) => ({
            ...evidence,
            summary: "Proof preview route: dearme.app/dearme proof check 1778131117797.",
          })),
        },
      ],
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const privateWork = surfaceByLabel(container, "Brand work ready");
    expect(privateWork.textContent).toContain("DearMe Proof Check 1778131117797");
    expect(privateWork.textContent).toContain("dearme.app/dearme proof check 1778131117797");
    expect(privateWork.textContent).not.toMatch(/runtime smoke/i);

    await act(async () => {
      root.unmount();
    });
  });

  it("focuses the opportunities view on reviewable leads and the launch boundary", async () => {
    mockLocation.search = "?view=opportunities";
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    mockDearmeApi.getOutputs.mockResolvedValue(outputsWithOpportunityDraft());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const commandCenter = surfaceByLabel(container, "Opportunity command center");
    expect(commandCenter.textContent).toContain("Opportunities, ready before outreach.");
    expect(commandCenter.textContent).toContain("Outbound sends stay behind your launch call.");
    expect(commandCenter.textContent).toContain("Lead batches");
    expect(commandCenter.textContent).toContain("Current opportunity draft");
    expect(commandCenter.textContent).toContain("Opportunity Scout is working on Opportunity leads");
    expect(commandCenter.textContent).toContain(
      "Target, contact evidence, fit reason, outreach angle, first message, and follow-up plan.",
    );
    expect(commandCenter.textContent).not.toMatch(/lead packets|opportunity packet/i);

    const opportunitySurface = surfaceByLabel(container, "Opportunity work ready");
    expect(opportunitySurface.textContent).toContain("Opportunities ready / Launch calls");
    expect(opportunitySurface.textContent).toContain("Prepared opportunity drafts");
    expect(opportunitySurface.textContent).toContain("Warm collaboration lead");
    expect(opportunitySurface.textContent).toContain("Prepared by Opportunity Scout");
    expect(opportunitySurface.textContent).toContain("Practical AI Builders podcast");
    expect(opportunitySurface.textContent).toContain("Verification status");
    expect(opportunitySurface.textContent).toContain("Contact record");
    expect(opportunitySurface.textContent).toContain("Outreach angle");
    expect(opportunitySurface.textContent).toContain("Outbound sends stay behind Peter's launch call");
    expect(opportunitySurface.textContent).not.toContain("send_email");
    expect(opportunitySurface.textContent).not.toContain("Dear me report");
    expect(opportunitySurface.textContent).not.toMatch(/opportunity packet|prepared opportunity packets/i);
    expect(
      opportunitySurface.querySelectorAll('[data-dearme-surface="action-card"]').length,
    ).toBe(1);
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      [...opportunitySurface.querySelectorAll("button")]
        .find((button) => button.textContent?.trim() === "Review")
        ?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-9&artifact=issue-3%3Aopportunity_drafts",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("spotlights the first proof pack when generated draft and report artifacts are ready", async () => {
    mockLocation.search = "?view=work-ready&codexProductQa=20260512n-owner-proof-details";
    mockDearmeApi.getOutputs.mockResolvedValue(outputsWithFirstCyclePacket());
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const packetSurface = surfaceByLabel(container, "First proof pack");
    const liveFeed = surfaceByLabel(container, "Live proof feed");
    const scrollIntoView = vi.fn();
    Object.defineProperty(liveFeed, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    expect(packetSurface.textContent).toContain("First proof pack ready");
    expect(packetSurface.textContent).toContain(
      "One review path: check the proof pack in Work Ready, make the launch call in Decisions, then keep the live proof feed in view",
    );
    expect(packetSurface.textContent).toContain("2 ready");
    expect(packetSurface.textContent).toContain("Review first");
    expect(packetSurface.textContent).toContain("Work Ready");
    expect(packetSurface.textContent).toContain("Decisions");
    expect(packetSurface.textContent).toContain("Brand lane");
    expect(packetSurface.textContent).toContain("Starter post draft prepared from the first proof pack");
    expect(container.textContent).toContain("Prepared by Content Producer");
    expect(packetSurface.textContent).toContain("Report prepared from the same first proof pack");
    expect(packetSurface.textContent).toContain("Review first in Work Ready; Decisions holds the launch call.");
    expect(packetSurface.textContent).toContain("Voice check");
    expect(packetSurface.textContent).toContain("Voice ");
    expect(packetSurface.textContent).toContain("/100");
    expect(packetSurface.textContent).not.toContain("cycle packet");
    expect(packetSurface.textContent).not.toMatch(/Paperclip|OpenClaw|provider|setup_payload/i);
    expect(container.textContent).not.toContain("dearme-cycle-output");
    expect(container.querySelector('button[aria-label="Review Dear me report"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Review Starter post batch"]')).not.toBeNull();
    expect(packetSurface.textContent).toContain("See live proof feed");
    expect(liveFeed.id).toBe("dearme-live-proof-feed");

    await act(async () => {
      buttonByText(packetSurface, "See live proof feed")?.click();
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    await act(async () => {
      buttonByText(packetSurface, "Review proof pack")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&codexProductQa=20260512n-owner-proof-details&work=PET-8&artifact=issue-2%3Acontent_drafts",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("spotlights the first proof pack from first-cycle documents when work products are absent", async () => {
    const firstCycleOutputs = outputsWithFirstCyclePacket();
    mockDearmeApi.getOutputs.mockResolvedValue({
      ...firstCycleOutputs,
      outputs: firstCycleOutputs.outputs.map((output) => {
        if (output.kind === "content_drafts") {
          return {
            ...output,
            issueTitle: "DearMe Draft: First-cycle starter content",
            documents: [
              {
                ...output.documents[0]!,
                title: "Starter posts",
                bodyPreview: "Starter content prepared from the first cycle.",
              },
            ],
            workProducts: [],
          };
        }
        if (output.kind === "weekly_report") {
          return {
            ...output,
            issueTitle: "DearMe Draft: First-cycle Dear me report",
            documents: [
              {
                ...output.documents[0]!,
                title: "Dear me report",
                bodyPreview: "Report reference: First 5 minute proof package",
              },
            ],
            workProducts: [],
          };
        }
        return { ...output, workProducts: [] };
      }),
    });
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const packetSurface = surfaceByLabel(container, "First proof pack");
    expect(packetSurface.textContent).toContain("First proof pack ready");
    expect(packetSurface.textContent).toContain("2 ready");
    expect(packetSurface.textContent).toContain("Review first");
    expect(packetSurface.textContent).toContain("Work Ready");
    expect(packetSurface.textContent).toContain("Decisions");
    expect(packetSurface.textContent).toContain("Brand lane");
    expect(packetSurface.textContent).toContain("Starter content prepared from the first cycle.");
    expect(packetSurface.textContent).toContain("Report reference: First 5 minute proof package");
    expect(packetSurface.textContent).toContain("Review proof pack");

    await act(async () => {
      buttonByText(packetSurface, "Review proof pack")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&work=PET-8&artifact=issue-2%3Acontent_drafts",
    );

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a delivered next-move receipt with a safe external reference", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "delivered",
        "Launch move delivered",
        "DearMe delivered the X step and recorded the receipt.",
        "Review the delivered X result or continue with the next launched step.",
        "tweet-1",
        "https://x.com/tester/status/tweet-1",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt delivered");
    expect(handoffPanel.textContent).toContain("Launch move delivered");
    expect(handoffPanel.textContent).toContain("Delivered");
    expect(handoffPanel.textContent).toContain("Receipt recorded");
    expect(handoffPanel.textContent).toContain("Reference tweet-1");
    expect(handoffPanel.textContent).toContain("Open result");
    expect(handoffPanel.textContent).toContain("Review the delivered X result or continue with the next launched step.");
    expect(handoffPanel.textContent).toContain("Result is recorded for the launched move.");
    expect(handoffPanel.textContent).toContain("Open the result or brief to review what changed.");
    expect(handoffPanel.textContent).toContain("The next proof pass can keep moving under your launch boundary.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("The launched move has a recorded result.");
    expect(handoffPanel.textContent).toContain(
      "Open the result or brief, then let DearMe prepare the next proof-backed move.",
    );
    expect(handoffPanel.textContent).not.toContain("External action not run");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a delivered Website preview receipt with a safe preview link", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "delivered",
        "Website preview delivered",
        "DearMe delivered the Website preview and recorded the receipt.",
        "Open the delivered Website preview, then continue with the next launched step.",
        "dearme_preview_abc123",
        "https://dearme.app/peter-studio?preview=dearme_preview_abc123",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt delivered");
    expect(handoffPanel.textContent).toContain("Website preview delivered");
    expect(handoffPanel.textContent).toContain("Delivered");
    expect(handoffPanel.textContent).toContain("Receipt recorded");
    expect(handoffPanel.textContent).toContain("Reference dearme_preview_abc123");
    expect(handoffPanel.textContent).toContain("Open Website preview");
    expect(handoffPanel.textContent).toContain(
      "Open the delivered Website preview, then continue with the next launched step.",
    );
    expect(handoffPanel.textContent).not.toContain("Open result");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);
    const previewLink = handoffPanel.querySelector(
      'a[href="https://dearme.app/peter-studio?preview=dearme_preview_abc123"]',
    );
    expect(previewLink?.textContent).toBe("Open Website preview");

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a pending delivery receipt without losing the launch boundary", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "pending",
        "Launch move waiting on result",
        "DearMe is waiting for the launch result.",
        "Keep the brief open until DearMe records the receipt.",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt pending");
    expect(handoffPanel.textContent).toContain("Launch move waiting on result");
    expect(handoffPanel.textContent).toContain("Pending");
    expect(handoffPanel.textContent).toContain("Waiting to send");
    expect(handoffPanel.textContent).toContain("Launch move is waiting on its result.");
    expect(handoffPanel.textContent).toContain("Keep the brief open until DearMe records the receipt.");
    expect(handoffPanel.textContent).toContain("The boundary stays visible while the result is pending.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("The launch move is staged with its boundary still visible.");
    expect(handoffPanel.textContent).toContain("DearMe is watching for the receipt before continuing this move.");
    expect(handoffPanel.textContent).not.toContain("External action not run");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a rejected delivery receipt as a new owner decision", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "rejected",
        "Launch move needs a new decision",
        "DearMe recorded that the launch move needs a safer direction.",
        "Open the brief to choose the next launched step.",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt needs new decision");
    expect(handoffPanel.textContent).toContain("Launch move needs a new decision");
    expect(handoffPanel.textContent).toContain("Needs new decision");
    expect(handoffPanel.textContent).toContain("Needs a new decision");
    expect(handoffPanel.textContent).toContain("The move needs a new direction.");
    expect(handoffPanel.textContent).toContain("Open the brief to choose a safer direction.");
    expect(handoffPanel.textContent).toContain("No new external action runs until you choose the next direction.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("DearMe brought the move back instead of forcing it through.");
    expect(handoffPanel.textContent).toContain("Open the brief and choose the safer next step.");
    expect(handoffPanel.textContent).not.toContain("External action not run");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a delivery receipt that still needs a selected account or recipient", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "needs_channel_connection",
        "Launch move needs connection",
        "DearMe recorded the receipt but the connection is not ready yet.",
        "Connect the channel before DearMe can retry the launched step.",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt needs connection");
    expect(handoffPanel.textContent).toContain("Launch move needs connection");
    expect(handoffPanel.textContent).toContain("Needs connection");
    expect(handoffPanel.textContent).toContain("Connection needed");
    expect(handoffPanel.textContent).toContain(
      "Move is ready, but DearMe is missing the selected account or recipient.",
    );
    expect(handoffPanel.textContent).toContain(
      "Add the selected account or recipient before DearMe can continue this move.",
    );
    expect(handoffPanel.textContent).toContain("No external action ran without the connection.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain(
      "The move stayed staged instead of using a missing connection.",
    );
    expect(handoffPanel.textContent).toContain(
      "DearMe needs the selected account or recipient before this move can continue.",
    );
    expect(handoffPanel.querySelector('[aria-label="Before DearMe continues"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain(
      "Choose the exact account or recipient DearMe is allowed to use for this move.",
    );
    expect(handoffPanel.textContent).toContain(
      "Keep the final send, post, page change, or spend behind your launch call.",
    );
    expect(handoffPanel.textContent).not.toContain("External action not run");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it("surfaces a safely failed delivery receipt without claiming it was not run", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "errored",
        "Launch move failed safely",
        "DearMe recorded the receipt but the delivery failed safely.",
        "Review the safe failure and choose the next launched step.",
      ),
    );
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DearMeOnboarding />
        </QueryClientProvider>,
      );
    });
    await flushReact();

    const handoffPanel = surfaceByLabel(container, "Delivery receipt failed safely");
    expect(handoffPanel.textContent).toContain("Launch move failed safely");
    expect(handoffPanel.textContent).toContain("Failed safely");
    expect(handoffPanel.textContent).toContain("DearMe failed safely before representing you again.");
    expect(handoffPanel.textContent).toContain("Open the brief to inspect the prepared move.");
    expect(handoffPanel.textContent).toContain("Choose a new direction before any public move continues.");
    expect(handoffPanel.querySelector('[aria-label="Return cue"]')).not.toBeNull();
    expect(handoffPanel.textContent).toContain("DearMe stopped the move safely before representing you again.");
    expect(handoffPanel.textContent).toContain(
      "Open the brief, inspect the prepared move, and choose a new direction.",
    );
    expect(handoffPanel.textContent).not.toContain("External action not run");
    expectNoHiddenProductTerms(handoffPanel.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.orchestrationName,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
      HIDDEN_PRODUCT_TERMS.modelName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
      HIDDEN_PRODUCT_TERMS.workbenchName,
      HIDDEN_PRODUCT_TERMS.workspaceName,
    ]);

    await act(async () => {
      root.unmount();
    });
  });
});
