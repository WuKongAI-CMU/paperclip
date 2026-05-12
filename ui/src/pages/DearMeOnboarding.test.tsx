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
  type DearMeWorkbenchResponse,
  type DearMeWorkbenchStreamItem,
  type DearMeOutputReviewLoop,
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
const mockLocation = vi.hoisted(() => ({
  pathname: "/PET/dearme",
  search: "",
}));
const mockCompanyContext = vi.hoisted(() => ({
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
    selectedCompanyId: mockCompanyContext.selectedCompanyId,
    selectedCompany: mockCompanyContext.selectedCompany,
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
        sourceLabel: "Prepared from private profile work",
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
      proofPoints: ["Private proof from the first cycle"],
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
      text: "Starter post from private proof for founders who need practical AI product evidence.",
      proofUsed: "Private proof from the first cycle",
    },
  });
}

function paidBetaStatus(status: "trial" | "active") {
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
        ? "Private cycles can run within guardrails"
        : "Private cycles wait for paid beta access",
      summary: active
        ? "DearMe checks monthly private spend before work runs so prepared moves stay predictable."
        : "Preview the plan for free. DearMe records paid beta access before it spends budget on private cycles.",
      spendCents: 0,
      budgetCents: 25_000,
      utilizationPercent: 0,
      remainingCreditCents: active ? 25_000 : 0,
      decisionRequired: !active,
      decisionLabel: active ? null : "Record paid beta access",
    },
  };
}

function reviewLoopFixture(
  state: DearMeOutputReviewLoop["state"] = "fresh",
  nextStep = state === "needs_user_review"
    ? "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval."
    : "Your team is preparing this privately.",
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
    nextStep,
    reviewHandoff: null,
    feedbackTrace: null,
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
      nextAction: "Add real posts, notes, transcripts, or approved drafts that already sound like the user.",
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
        currentFocus: "Checking that private drafts sound like the user before review.",
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
        title: "Start private team for Peter Studio",
        summary: "Review the first growth-team plan before DearMe starts private work.",
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
        summary: "DearMe created the team, cycles, and first private work lanes.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "cycle:run-1",
        kind: "cycle_check_in",
        title: "Cycle check-in completed",
        summary: "Weekly content cycle checked in and kept the private growth cycle moving.",
        createdAt: "2026-05-07T14:01:00.000Z",
      },
      {
        id: "spend:2026-05-07T14:02:00.000Z",
        kind: "spend_checkpoint",
        title: "Spend checkpoint recorded",
        summary: "DearMe recorded $2.37 of private team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
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
          nextAction: "Review this proof point and save the fact once it is ready for future private work.",
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
          body: "Keep future drafts shorter, proof-led, and direct before asking for approval.",
          bodyPreview: "Keep future drafts shorter, proof-led, and direct before asking for approval.",
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
          reason: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
          riskGate: "publish_social",
        },
        sourceLabel: "Prepared output",
        costImpact: null,
        nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
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
        nextAction: "Your team is preparing this privately.",
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
        id: "progress:activity-1",
        kind: "progress_recorded",
        cycleStage: "plan",
        action: "plan",
        role: "chief_of_staff",
        title: "Growth team created",
        summary: "DearMe created the team, cycles, and first private work lanes.",
        customerSummary: "DearMe created the team, cycles, and first private work lanes.",
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
        sourceLabel: "Private team profile",
        costImpact: "Work stays inside paid-beta guardrails",
        nextAction: "Start or steer the first private growth cycle from the Chief of Staff.",
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
        summary: "Weekly content cycle checked in and kept the private growth cycle moving.",
        customerSummary: "Weekly content cycle checked in and kept the private growth cycle moving.",
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
        summary: "DearMe recorded $2.37 of private team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
        customerSummary: "DearMe recorded $2.37 of private team work across 1 checkpoint. Billing details stay backstage; spend-sensitive moves wait for the launch call.",
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
        nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
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
        nextAction: "Your team is preparing this privately.",
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
        summary: "DearMe created the team, cycles, and first private work lanes.",
        evidenceLabel: "Private team profile / Growth team: Work stays inside paid-beta guardrails",
        status: "recorded",
        needsApproval: false,
        nextAction: "Start or steer the first private growth cycle from the Chief of Staff.",
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
        nextAction: "Use this Voice & Memory signal to make the next private cycle more accurate.",
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
        approvalId: null,
        createdAt: "2026-05-07T14:00:00.000Z",
      },
    ],
    report: {
      title: "Dear me report",
      summary: "The private weekly report with completed work, decisions, and next bets.",
      status: "ready_for_review",
      outputId: "issue-1:weekly_report",
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      bodyPreview: "Completed work: refreshed positioning and prepared next bets.",
      accomplished: [
        "Cycle check-in completed: Weekly content cycle checked in and kept the private growth cycle moving.",
        "Spend checkpoint recorded: DearMe recorded $2.37 of private team work across 1 checkpoint.",
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
          summary: "Content Producer is shaping five private drafts before review.",
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
        "DearMe prepared the report and content drafts from the same private cycle packet. Voice fit 97/100. Review once, then launch, revise, or regenerate.",
      bodyPreview: "Completed work: the same private cycle packet has a draft and report ready.",
      accomplished: [
        "Content draft and Dear me report came from the same private cycle packet.",
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
    "DearMe prepared this draft, report, and decision from the same private cycle packet. Review the shared proof pack once before public moves.";
  const packetNextStep = "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.";
  const packetLoop = reviewLoopFixture("needs_user_review", packetNextStep, {
    reviewHandoff: {
      action: "request_changes",
      title: "Shared packet handoff",
      summary: "The same private cycle packet carries the next private revision.",
      userDirection: null,
      nextDraftDirection: "Revise the shared packet before asking for approval again.",
    },
  });

  return {
    ...response,
    summary: "The same private cycle packet is ready across work, decisions, reports, and the live feed.",
    activeWork: [
      {
        ...response.activeWork[0]!,
        title: "Private cycle packet lane",
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
        artifact: "Private cycle packet",
        sourceLabel: "Private cycle packet",
        costImpact: "Shared packet prepared privately",
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
        evidenceLabel: "Private cycle packet / Shared packet report",
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
    ["role:voice_editor", "Voice Editor", "Checking that private drafts sound like the user before review."],
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
        title: "Chief of Staff is turning your brief into private work",
        summary: chiefSummary,
        artifact: "Cycle brief",
        status: "working",
        needsApproval: false,
        sourceLabel: "Chief of Staff brief",
        costImpact: null,
        nextAction: "Your team is preparing this privately.",
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
        title: "Chief of Staff is turning your brief into private work",
        summary: chiefSummary,
        evidenceLabel: "Chief of Staff brief / Cycle brief",
        status: "working",
        needsApproval: false,
        nextAction: "Your team is preparing this privately.",
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
        summary: "The private weekly report with completed work, decisions, and next bets.",
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
            label: "Private references",
            summary: "1 private reference used for this review.",
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
            summary: "No outbound message sends until Peter approves the target, angle, and draft.",
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
        summary: "A private proof-backed starter draft is ready for review.",
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
            bodyPreview: "Voice fit score: 95. Cycle packet: starter post from private proof.",
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
            value: "Starter post from private proof.",
            source: "document",
          },
        ],
        sourceEvidence: [
          {
            kind: "proof",
            label: "Proof used",
            summary: "Private proof from the first cycle.",
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
    mockDearmeApi.sendChiefOfStaffMessage.mockResolvedValue({
      companyId: "company-1",
      status: "queued",
      issueId: "issue-chief-1",
      issueIdentifier: "PET-22",
      title: "DearMe: Plan next moves - Launch positioning changed",
      nextStep: "Chief of Staff has the brief and will prepare the next private move for review.",
    });
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
        bodyPreview: "DearMe decision: prepare another private pass before review.",
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
    mockLocation.search = "";
  });

  afterEach(() => {
    window.sessionStorage.clear();
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

  it("uses the content view as a public first-run landing before the dense team surface", async () => {
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

    expect(container.textContent).toContain("DearMe grows your personal brand while you work.");
    expect(container.textContent).toContain(
      "It runs private research, drafts, opportunities, proof, and weekly direction, then brings you the launch calls that need your judgment.",
    );
    expect(container.textContent).toContain("What do you want to be known for?");
    expect(container.textContent).toContain("Start my first brand cycle");
    expect(container.textContent).toContain("See the first proof pack");
    expect(container.textContent).toContain("Studying your voice");
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("5 starter drafts");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain(
      "Private. Public only with approval.",
    );
    expect(container.textContent).toContain("Your workroom opens with");
    expect(container.textContent).toContain("What moved while you were away");
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("Prepared but blocked");
    expect(container.textContent).toContain("Proof used");
    expect(container.textContent).toContain("Next private cycle");
    expect(container.querySelector('[aria-label="DearMe public first run"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="First proof pack"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="First-run workroom queues"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Today's brand team focus");
    expect(container.textContent).not.toContain("90-second first cycle");
    expect(mockDearmeApi.getWorkbench).not.toHaveBeenCalled();
    expect(mockDearmeApi.getOutputs).not.toHaveBeenCalled();

    await act(async () => {
      setInputValue(
        container.querySelector("#dearme-first-cycle-intent") as HTMLInputElement,
        "Known for turning operator work into trusted public proof",
      );
    });

    await act(async () => {
      buttonByText(container, "Start my first brand cycle")?.click();
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

  it("previews a full profile and creates an approval request", async () => {
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
    expect(container.textContent).toContain("Private team profile");
    expect(container.textContent).toContain("DearMe grows your personal brand while you work.");
    expect(container.textContent).toContain("Dear me, your brand team worked while you were away");
    expect(container.textContent).toContain("Team working");
    expect(container.textContent).toContain("Launch boundary");
    expect(container.textContent).toContain("DearMe keeps the private brand cycle moving: drafts, reports, opportunities");
    expect(container.textContent).toContain("Public posts, outbound messages, spend, and page changes become launch calls under your rules.");
    expect(container.textContent).toContain("Ready for your review");
    expect(container.textContent).toContain("Today's operating focus");
    expect(container.textContent).toContain("It shows the work it did and brings you only the launch calls that matter.");
    expect(container.textContent).toContain("Today's brand cycle");
    expect(container.textContent).toContain("Next decision");
    expect(container.textContent).toContain("Teammate focus");
    expect(container.textContent).toContain("Open next decision");
    expect(buttonByText(container, "Start with one sentence")?.getAttribute("data-variant")).toBe("default");
    expect(buttonByText(container, "View private proof")?.getAttribute("data-variant")).toBe("outline");
    expect(buttonByText(container, "Open full profile controls")?.getAttribute("data-variant")).toBe("outline");
    expect(readDearMeFirstCyclePreview("company-1", "maya-chen")).toBeNull();
    await act(async () => {
      buttonByText(container, "View private proof")?.click();
    });
    expect(readDearMeFirstCyclePreview("company-1", "maya-chen")).not.toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/dearme/site-preview/maya-chen");
    mockNavigate.mockClear();
    expect(buttonByText(container, "Open full profile controls")?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[data-dearme-profile-controls="collapsed"]')).not.toBeNull();
    expect(container.querySelector("#dearme-display-name")).toBeNull();
    expect(buttonByText(container, "Preview profile")).toBeUndefined();
    expect(buttonByText(container, "Start private team")).toBeUndefined();
    expect(container.textContent).toContain("The first brand cycle can run from the sentence above.");
    await openFullProfileControls(container);
    expect(buttonByText(container, "Hide full profile controls")?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-dearme-profile-controls="open"]')).not.toBeNull();
    expect(buttonByText(container, "Preview profile")?.getAttribute("data-variant")).toBe("outline");
    expect(buttonByText(container, "Start private team")?.getAttribute("data-variant")).toBe("secondary");
    expect(container.textContent).toContain("Full profile controls");
    expect(container.textContent).not.toContain("Preview Brand OS");
    expect(container.textContent).not.toContain("Start Brand OS");
    const topFocus = surfaceByLabel(container, "Today's brand team focus");
    expect(topFocus.textContent).toContain("Today's brand cycle");
    const reviewPath = surfaceByLabel(topFocus, "Today's review path");
    expect(topFocus.textContent).toContain("Ready from the cycle");
    expect(topFocus.textContent).toContain("Launch call");
    expect(topFocus.textContent).toContain("Autonomous lane");
    expect(reviewPath.textContent).toContain("4 calls");
    expect(reviewPath.textContent).toContain("Private work moving");
    expect(topFocus.textContent).toContain("Next decision");
    expect(topFocus.textContent).toContain("Open next decision");
    expect(topFocus.textContent).toContain("Start with one sentence");
    expect(topFocus.textContent).not.toContain("Live team pulse");
    expectSurfacesInOrder(container, ["First payoff", "90-second first cycle", "Today's brand team focus"]);
    const firstPayoff = surfaceByLabel(container, "First payoff");
    expect(firstPayoff.getAttribute("data-dearme-surface")).toBe("focus-surface");
    expect(firstPayoff.querySelectorAll('[data-dearme-surface="workbench-card"]').length).toBe(3);
    expect(firstPayoff.textContent).toContain("One sentence starts your private brand cycle.");
    expect(firstPayoff.textContent).toContain("No setup tour. One sentence starts the private cycle.");
    expect(firstPayoff.textContent).toContain(
      "Voice Profile, starter posts, one opportunity, proof card, first plan",
    );
    expect(firstPayoff.textContent).toContain("One launch call before anything public or external");
    expect(firstPayoff.textContent).toContain("Approve, revise, or redirect the team from one place.");
    expect(firstPayoff.textContent).toContain("Start with one sentence");
    expect(container.textContent).toContain("See the first five minutes before you start.");
    expect(container.querySelector('[aria-label="First five minutes progress"]')).not.toBeNull();
    expect(container.textContent).toContain("Studying your voice");
    expect(container.textContent).toContain("Finding likely audiences");
    expect(container.textContent).toContain("Drafting first moves");
    expect(container.textContent).toContain("Preparing your private proof");
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("Your brand team today");
    expect(container.textContent).toContain("Dear me, your team has decisions ready");
    expect(container.textContent).toContain("Team operating policy");
    expect(container.textContent).toContain("Private work can continue, but external moves wait for you.");
    const launchReadiness = surfaceByLabel(container, "Launch readiness");
    expect(launchReadiness.textContent).toContain("Private cycle runs; public launch follows your rules.");
    expect(launchReadiness.textContent).toContain("Private cycle");
    expect(launchReadiness.textContent).toContain("Usable now");
    expect(launchReadiness.textContent).toContain("Public launch");
    expect(launchReadiness.textContent).toContain("Not ready yet");
    expect(launchReadiness.textContent).toContain("live channel receipts plus your launch call");
    expect(launchReadiness.textContent).toContain("Next best step");
    expect(launchReadiness.textContent).toContain("Review call");
    expectNoHiddenProductTerms(launchReadiness.textContent, Object.values(HIDDEN_PRODUCT_TERMS));
    expect(container.textContent).toContain("Can work privately");
    expect(container.textContent).toContain("Must ask first");
    expect(container.textContent).toContain("Stops repeat work");
    expect(container.textContent).toContain("Spend is visible");
    expect(container.textContent).toContain("Public posts, outbound messages, site changes, new spend");
    expect(container.textContent).toContain("Private spend appears as plain checkpoints and monthly guardrails");
    expect(container.textContent).toContain("Brand team run ledger");
    expect(container.textContent).toContain("What your team moved while you were away.");
    expect(container.textContent).toContain(
      "A compact record of what the brand team tried, prepared, learned, and now needs from you.",
    );
    expect(container.textContent).toContain("Tried");
    expect(container.textContent).toContain("Prepared");
    expect(container.textContent).toContain("Learned");
    expect(container.textContent).toContain("Needs your call");
    expect(container.textContent).toContain("Evidence");
    expect(container.textContent).toContain("Next");
    expect(container.textContent).toContain("Waiting on you");
    expect(container.textContent).toContain("Voice memory updated");
    expect(container.querySelector('[aria-label="Brand team run ledger"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger="brand-team"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="tried"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="prepared"]')).not.toBeNull();
    expect(container.querySelector('[data-dearme-run-ledger-bucket="learned"]')).not.toBeNull();
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
      "Feedback, proof sources, and report learnings shape the next private cycle automatically.",
    );
    expect(container.textContent).toContain("5 learning signals");
    expect(container.textContent).toContain(
      "Private work keeps moving. Public posts, outbound messages, page changes, and spend come back as one launch call.",
    );
    expect(container.textContent).toContain("Growth map");
    expect(container.textContent).toContain("Your team turns private work into launch-ready moves");
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
    expect(container.textContent).toContain("This waits for your launch call before it can represent you publicly or externally.");
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
      "Private work ready",
    ]);
    await act(async () => {
      buttonByText(firstPayoff, "Start with one sentence")?.click();
    });
    expect(document.activeElement).toBe(container.querySelector("#dearme-first-cycle-intent"));
    expect(container.textContent).toContain("Start private team for Peter Studio");
    expect(container.textContent).toContain("Batch decisions");
    expect(container.textContent).toContain("Review content batch");
    expect(container.textContent).toContain("Review posts");
    expect(container.textContent).toContain("Waiting on you");
    expect(container.textContent).toContain("After your call");
    expect(container.textContent).toContain("Launched work moves forward inside the boundary");
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
      "A live proof feed for the work your team prepared, updated, or held for your call.",
    );
    expect(container.textContent).toContain("1 needs your call");
    expect(container.textContent).toContain("1 in motion");
    expect(container.textContent).toContain("Reviewable work and launch calls stay first.");
    expect(container.textContent).toContain("Private work the team is preparing before it asks for a decision.");
    expect(container.textContent).toContain("Recent updates");
    expect(container.textContent).toContain("Completed setup, spend checkpoints, and cycle notes from the team.");
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
    expect(container.textContent).toContain("The team is preparing this privately before it asks for your call.");
    expect(container.textContent).toContain("This update is recorded for the next private cycle.");
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
    expect(container.textContent).toContain("Manual note");
    expect(container.textContent).toContain("Review preferences");
    expect(container.textContent).toContain("Shorter proof-led drafts");
    expect(container.textContent).toContain(
      "Keep future drafts shorter, proof-led, and direct before asking for approval.",
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
    expect(container.textContent).toContain("Keeps drafts, outreach, and reports inside your approved voice.");
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
    expect(container.textContent).toContain("Private cycles can run within guardrails");
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
    expect(container.textContent).toContain("Create private team profile for Peter Studio");
    expect(container.textContent).toContain("Voice check");
    expect(container.textContent).toContain("Voice 100/100");
    expect(container.textContent).toContain("Ready for review");
    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("Working rhythm");
    expect(container.textContent).toContain("First private work");
    expect(container.textContent).not.toContain("machinery hidden");
    expect(container.textContent).not.toContain("First operations");

    await act(async () => {
      buttonByText(container, "Start private team")?.click();
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

  it("reviews live proof feed work without leaving DearMe", async () => {
    const contentOutput = outputsWithFirstCyclePacket().outputs[1]!;
    mockDearmeApi.continueOutput.mockResolvedValueOnce({
      companyId: "company-1",
      outputId: "issue-2:content_drafts",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-live-feed-1",
        bodyPreview: "DearMe decision: prepare another private pass before review.",
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
    expect(liveFeed.textContent).toContain("Review this private work here.");
    expect(liveFeed.textContent).toContain("Launch this work");
    expect(liveFeed.textContent).toContain("Request changes");
    expect(liveFeed.textContent).toContain("Prepare another pass");
    expect(liveFeed.textContent).toContain("Choose new direction");

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
    expect(text).toContain("DearMe team progress needs attention. Try again before reviewing private work.");
    expect(text).toContain("Prepared work needs attention. Try again before reviewing private drafts.");
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
      "DearMe prepared the draft and this report from one private proof pack.",
    );
    expect(letter.textContent).toContain("Review once");
    expect(letter.textContent).toContain("Voice fit 97/100");
    expect(letter.textContent).toContain("same private proof pack");
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
    expect(document.body.textContent).toContain("Retire private source?");
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
    expect(text).toContain("Voice & Memory needs attention. Try again before adding or editing private sources.");
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

    expect(document.body.textContent).toContain("Retire private source?");

    await act(async () => {
      buttonByLabel(document.body, "Confirm retire Voice note")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Voice & Memory needs attention. Try again before retiring a private source.");
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
    expect(text).toContain("Voice & Memory needs attention. Try again before restoring a private source.");
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
    expect(container.textContent).toContain("Private preview");
    expect(container.textContent).toContain("Maya's team prepared private posts");
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
    expect(container.textContent).toContain("Private site proof");
    expect(container.textContent).toContain("Voice profile and known-for line");
    expect(container.textContent).toContain("Audience shortlist and first opportunity");
    expect(container.textContent).toContain("Private proof page move");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("Autopilot until launch");
    expect(container.textContent).toContain("Capture the positioning");
    expect(container.textContent).toContain("Only waits here");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next private review");
    expect(container.textContent).toContain("Sharpen the next draft");
    expect(container.textContent).toContain("Next proof-backed draft");
    expect(container.textContent).toContain("Updated opportunity angle");
    expect(container.textContent).toContain("Updated private proof card");
    expect(container.textContent).toContain("Starter post: point of view");
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Five private targets");
    expect(container.textContent).toContain("Direct customer lead");
    expect(container.textContent).toContain("9/10");
    expect(container.textContent).toContain("Warm intro lead");
    expect(container.textContent).toContain("Portfolio proof card");
    expect(container.textContent).toContain("First growth plan");
    expect(container.textContent).toContain("Ready to launch, with you in control");
    expect(container.textContent).toContain("Source proof: Ran 42 customer interviews that changed a pricing launch");
    expect(container.textContent).toContain("Delivery receipts");
    expect(container.textContent).toContain("Approved work comes back with a result");
    expect(container.textContent).toContain("Approved X post delivered");
    expect(container.textContent).toContain("DearMe recorded the delivery receipt for the approved next step.");
    expect(container.textContent).toContain("Reference x-post-42");
    expect(container.textContent).toContain("Review the delivered post, then let DearMe prepare the next proof-backed opportunity.");
    expect(container.textContent).toContain("Approved X post needs connection");
    expect(container.textContent).toContain("Needs connection");
    expect(container.textContent).toContain("Connect X before DearMe can continue this approved next step.");
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
    expect(container.textContent).toContain("Ready for your launch call");
    expect(container.textContent).toContain("0-30s");
    expect(container.textContent).toContain("60-120s");
    expect(container.textContent).toContain("3-5min");
    expect(container.textContent).toContain("Identity dossier");
    expect(container.textContent).toContain("Audience map");
    expect(container.textContent).toContain("Private site proof");
    expect(container.textContent).toContain("Voice profile and known-for line");
    expect(container.textContent).toContain("Prepared from private profile work");
    expect(container.textContent).toContain("Audience shortlist and first opportunity");
    expect(container.textContent).toContain("Private proof page move");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("Voice check");
    expect(container.textContent).toContain("Voice 100/100");
    expect(container.textContent).toContain("Autopilot until launch");
    expect(container.textContent).toContain("Prepare the next private pass");
    expect(container.textContent).toContain("Only waits here");
    expect(container.textContent).toContain("Keeps working after the first proof");
    expect(container.textContent).toContain("Next private review");
    expect(container.textContent).toContain("Sharpen the next draft");
    expect(container.textContent).toContain("Updated opportunity angle");
    expect(container.textContent).toContain("Updated private proof card");
    expect(container.textContent).toContain("Starter post: point of view");
    expect(container.textContent).toContain("Starter post: proof of work");
    expect(container.textContent).toContain("Starter post: useful opening");
    expect(container.textContent).toContain("Opportunity shortlist");
    expect(container.textContent).toContain("Five private targets");
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
    expect(text).toContain("First cycle needs attention. Try again before starting private work.");
    expect(text).not.toContain("Codex");
    expect(text).not.toContain("Symphony");
    expect(text).not.toContain("token");
    expect(text).not.toContain("execution route");

    await act(async () => {
      root.unmount();
    });
  });

  it("previews the first cycle during trial without starting private work", async () => {
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
    expect(container.textContent).toContain("Prepared from private profile work");
    expect(container.textContent).toContain("dearme.app/peter-studio");
    expect(container.textContent).toContain("Ready for approval");
    expect(container.textContent).not.toContain("Sample team package");
    expect(readDearMeFirstCyclePreview("company-1", "peter-studio")).not.toBeNull();

    await act(async () => {
      buttonByText(container, "Open private preview")?.click();
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
    expect(container.textContent).toContain("Private cycles wait for paid beta access");
    expect(container.textContent).toContain("Decision needed: Record paid beta access");

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

    const requestButton = buttonByText(container, "Start private team");
    expect(requestButton?.disabled).toBe(true);
    expect(container.textContent).toContain("unlock the private team cycle");
    expect(mockDearmeApi.createBrandBlueprintApplyRequest).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
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
    expect(text).toContain("Profile preview needs attention. Try again before starting private work.");
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
      buttonByText(container, "Start private team")?.click();
    });
    await flushReact();

    const text = container.textContent ?? "";
    expect(text).toContain("Approval request needs attention. Try again before moving the private team forward.");
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
    expect(container.textContent).toContain("Improves approval notes, review notes, and safe next actions.");

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
      "Add at least 20 characters. DearMe uses this as private memory, not public copy.",
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

    expect(container.textContent).toContain("Keep private sources under 4,000 characters for now.");
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
      "will extract the useful private fact before it shapes the next private pass.",
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
    const savedSourceLink = linkByText(surfaceByLabel(container, "Voice & Memory"), "Open private source");
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

  it("renders valid source review links as private source shortcuts", async () => {
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
    const cardLink = linkByText(sourceReviewCard, "Open private source");
    expect(cardLink?.href).toBe("https://example.com/build-log");

    await act(async () => {
      buttonByText(voiceMemorySurface, "Prepare fact")?.click();
    });
    await flushReact();

    const sourceDetail = surfaceByLabel(container, "Source review detail");
    expect(surfaceByLabel(container, "Voice & Memory source review").textContent).toContain("Selected for next pass");
    const detailLink = linkByText(sourceDetail, "Open private source");
    expect(sourceDetail.textContent).toContain("Private source");
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

  it("prefills reviewed facts from private source review items", async () => {
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
    expect(container.textContent).toContain("Private links and import notes wait here");

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
    liveWorkbench.summary = "The private cycle just refreshed with new prepared work.";

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
    expect(container.textContent).toContain("The private cycle just refreshed with new prepared work.");

    await act(async () => {
      root.unmount();
    });
    expect(stream?.close).toHaveBeenCalledTimes(1);
  });

  it("refreshes the team workbench when execution lifecycle events arrive", async () => {
    mockDearmeApi.getPaidBetaAccess.mockResolvedValue(paidBetaStatus("active"));
    const initialWorkbench = workbenchResponse();
    const refreshedWorkbench = workbenchResponse();
    refreshedWorkbench.headline = "Dear me, your team has fresh runner progress";
    refreshedWorkbench.summary = "The private cycle pulled in new execution progress for review.";
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
    expect(container.textContent).toContain("The private cycle pulled in new execution progress for review.");
    const topFocus = surfaceByLabel(container, "Today's brand team focus");
    expect(topFocus.textContent).toContain("Private work moving");
    expect(topFocus.textContent).toContain("Working now");
    expect(topFocus.textContent).toContain("Team started a private pass");
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
    expect(container.textContent).toContain("Private work ready");
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.setupRecord,
    ]);

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-chief-of-staff-message") as HTMLTextAreaElement,
        "Launch positioning changed. Prepare the next three moves before I publish anything.",
      );
      buttonByText(container, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "plan_next",
      message: "Launch positioning changed. Prepare the next three moves before I publish anything.",
    });
    expect(container.textContent).toContain("Brief sent");
    expect(container.textContent).toContain("will prepare the next private move for review");
    expect(container.textContent).toContain("Open private work");
    await flushReact();
    expect(container.textContent).toContain("Chief of Staff is turning your brief into private work");
    expect(container.textContent).toContain("Cycle brief");
    expect(container.textContent).toContain("Chief of Staff brief: Plan next moves");
    expect(container.textContent).not.toContain("dearme_chief_of_staff_message");
    expect(container.textContent).not.toContain("issue-chief-1");

    await act(async () => {
      buttonByText(container, "Open private work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&work=PET-22");
    expect(container.textContent).not.toContain("/issues/");

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
    expectNoHiddenProductTerms(container.textContent, [
      HIDDEN_PRODUCT_TERMS.localKernel,
      HIDDEN_PRODUCT_TERMS.bridgeName,
      HIDDEN_PRODUCT_TERMS.vendorName,
    ]);

    await act(async () => {
      buttonByText(container, "Scout opportunities")?.click();
    });

    const textarea = container.querySelector("#dearme-chief-of-staff-message") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Find practical opportunities");
    expect(textarea.value).toContain("Prepare outreach drafts and stage them behind the launch boundary.");

    await act(async () => {
      buttonByText(container, "Send to Chief of Staff")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.sendChiefOfStaffMessage).toHaveBeenCalledWith("company-1", {
      intent: "find_opportunities",
      message:
        "Find practical opportunities I can act on this week: customers, collaborators, podcasts, jobs, or warm introductions. Prepare outreach drafts and stage them behind the launch boundary.",
    });

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
      "Private proof is usable. Public launch still needs live receipts.",
    );
    expect(decisionsSurface.textContent).toContain("Professional-network delivery route");
    expect(decisionsSurface.textContent).toContain("Approved professional-network recipient");
    expect(decisionsSurface.textContent).toContain("Approved phone-message proof recipient");
    expect(decisionsSurface.textContent).toContain("collect the approved live-proof details");
    expectNoHiddenProductTerms(decisionsSurface.textContent, Object.values(HIDDEN_PRODUCT_TERMS));

    await act(async () => {
      root.unmount();
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
        `This private work kept moving with a default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10.`,
        {
          isRetriable: false,
          lastAction: "approve",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview:
            `No response came in, so DearMe kept this private work moving with a default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10.`,
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
    expect(text).toContain(`Private score ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10`);
    expect(text).toContain(`default review score of ${DEARME_SILENCE_DEFAULT_REVIEW_SCORE}/10`);
    expect(text).toContain("Public posts, sends, deploys, and spend still wait for your approval.");
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

    const privateWork = surfaceByLabel(container, "Private work ready");
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
        decisionNote: "Approved in DearMe. This prepared work represents me.",
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
      title: "Your call: Start private team for Peter Studio",
      summary: "Review the first growth-team plan before private work starts.",
      artifact: "Private team profile",
      sourceLabel: "Launch call",
      nextAction: "Start the private team when the first cycle and launch boundaries match your brand.",
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
        nextStep: "DearMe is paused until you resume or approve a new direction.",
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
    expect(handoffPanel.textContent).toContain("DearMe is paused until you resume or approve a new direction.");
    expect(handoffPanel.textContent).toContain("External action not run");
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
        summary: "The final approval is recorded and DearMe prepared the launch-ready X brief. External action: still not run. Next: Connect X before DearMe can continue this approved next step.",
        outputKind: "content_drafts",
        outputId: "issue-2:content_drafts",
        riskGate: "publish_social",
        approvalId: "approval-publish",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        executionReadiness: "private_handoff_ready",
        nextStep: "Connect X before DearMe can continue this approved next step.",
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
    expect(handoffPanel.textContent).toContain("Connect X before DearMe can continue this approved next step.");
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
    expect(container.textContent).toContain("Start private team for Peter Studio");
    expect(container.textContent).toContain("Review the first growth-team plan");
    expect(container.textContent).toContain("The team keeps preparing; public launch waits for your boundary");
    expect(container.textContent).toContain("Launch prepared move");
    expect(container.textContent).toContain("Request changes");
    expect(container.textContent).toContain("Reject");
    expectMobileSafeFocusedDecision(surfaceByLabel(container, "Focused decision"), "approval-review");
    expect(container.textContent).not.toContain("/approvals/");
    expect(focusedCardsInSurface(container, "Decisions needed").some((card) =>
      card.textContent?.includes("Start private team for Peter Studio"),
    )).toBe(true);

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
      "Approved in DearMe. This represents me.",
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
      "/dearme?view=decisions&work=issue-2&artifact=issue-2%3Acontent_drafts",
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
    expect(focusedDecision.textContent).toContain("Prepared privately. You choose what ships.");
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
    expect(container.textContent).toContain("Waiting on you");
    expect(container.textContent).toContain("Launch, request changes, pause, or ask for another private pass.");
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
        "Review this updated private work; your last feedback is reflected below before anything goes public.",
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
              "Revised the private draft around your requested change.",
              "Current draft focus: Refreshed positioning and prepared next bets.",
              "Still private until you approve it.",
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
    expect(focusedWork.textContent).toContain("Public moves still wait for your launch call.");
    expect(focusedWork.textContent).toContain("Review pass 1/3");
    expect(container.textContent).toContain("Needs your review");
    expect(container.textContent).toContain("Feedback applied");
    expect(container.textContent).toContain("You asked: Make the proof more concrete and less generic.");
    expect(container.textContent).toContain("Still private until you approve it.");
    expect(container.textContent).toContain("Review path");
    expect(container.textContent).toContain("Another pass requested: Try a stronger proof-led opening before the launch call.");
    expect(container.textContent).toContain("1 private reference prepared");
    expect(container.textContent).not.toContain("/issues/");
    expect(focusedCardsInSurface(container, "Work ready").some((card) =>
      card.textContent?.includes("Dear me report"),
    )).toBe(true);
    expect(focusedCardsInSurface(container, "Private work ready").some((card) =>
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

  it("keeps stale prepared work readable while private artifacts sync", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
    const response = outputsResponse();
    mockDearmeApi.getOutputs.mockResolvedValue({
      ...response,
      outputs: [
        {
          ...response.outputs[0]!,
          summary: "A private report is ready for review while the full artifact finishes syncing.",
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
      "A private report is ready for review while the full artifact finishes syncing.",
    );
    const privateWork = surfaceByLabel(container, "Private work ready");
    expect(privateWork.textContent).toContain(
      "A private report is ready for review while the full artifact finishes syncing.",
    );
    expect(privateWork.textContent).not.toContain("Waiting for the first private draft.");
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

  it("renders review handoff context for the next private draft", async () => {
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
                summary: "DearMe will keep your note attached to the next private revision.",
                userDirection: "Make the proof more concrete.",
                nextDraftDirection: "Revise the current draft around this note before asking for approval again.",
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

    expect(container.textContent).toContain("Private handoff");
    expect(container.textContent).toContain("Change request captured");
    expect(container.textContent).toContain("Your note: Make the proof more concrete.");
    expect(container.textContent).toContain("Revise the current draft around this note");
    expect(container.querySelector('[data-dearme-action-attention="retry"]')).not.toBeNull();
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("requests another private pass from focused private output without exposing issue route", async () => {
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
        bodyPreview: "DearMe decision: prepare another private pass before review.",
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
        "Review this updated private work; your last feedback is reflected below before anything goes public.",
        {
          attemptCount: 1,
          lastAction: "regenerate",
          lastDecisionAt: "2026-05-07T14:05:00.000Z",
          lastDecisionNotePreview: "Try a stronger proof-led opening before the launch call.",
          feedbackTrace: {
            headline: "Feedback applied",
            summary: "DearMe prepared a new private version instead of lightly editing the previous one.",
            userFeedback: "Try a stronger proof-led opening before the launch call.",
            changes: [
              "Prepared a replacement version from your direction.",
              "Current draft focus: Refreshed positioning and prepared next bets.",
              "Still private until you approve it.",
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
        bodyPreview: "DearMe decision: prepare another private pass before review.",
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

  it("keeps focused private work review errors customer-safe", async () => {
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
      { action: "approve", decisionNote: "Approved in DearMe. This prepared work represents me." },
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

  it("shows generated private work and opens the customer-safe work route", async () => {
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
    expect(container.textContent).toContain("Private work ready");
    expect(container.textContent).toContain("Ready for your review");
    expect(container.textContent).toContain("1 private item ready");
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
        '[aria-label="Private work ready"] [data-dearme-surface="action-card"]',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelector(
        '[aria-label="Private work ready"] [data-dearme-action-attention="decision_needed"]',
      ),
    ).not.toBeNull();

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
    expect(commandCenter.textContent).toContain("No outbound message sends until you approve.");
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
    expect(opportunitySurface.textContent).toContain("No outbound message sends until Peter approves");
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
    expect(packetSurface.textContent).toContain("First proof pack ready");
    expect(packetSurface.textContent).toContain("One launch-ready next step is ready for your call.");
    expect(packetSurface.textContent).toContain("2 ready");
    expect(packetSurface.textContent).toContain("Work Ready path");
    expect(packetSurface.textContent).toContain("Proof lane");
    expect(packetSurface.textContent).toContain("Private until approved");
    expect(packetSurface.textContent).toContain("Starter post draft prepared from the first proof pack");
    expect(container.textContent).toContain("Prepared by Content Producer");
    expect(packetSurface.textContent).toContain("Report prepared from the same first proof pack");
    expect(packetSurface.textContent).toContain("Work Ready and Decisions");
    expect(packetSurface.textContent).toContain("Review it in Work Ready. Decisions keeps the launch boundary in one place.");
    expect(packetSurface.textContent).toContain("Voice check");
    expect(packetSurface.textContent).toContain("Voice ");
    expect(packetSurface.textContent).toContain("/100");
    expect(packetSurface.textContent).not.toContain("cycle packet");
    expect(packetSurface.textContent).not.toMatch(/Paperclip|OpenClaw|provider|setup_payload/i);
    expect(container.textContent).not.toContain("dearme-cycle-output");
    expect(container.querySelector('button[aria-label="Review Dear me report"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Review Starter post batch"]')).not.toBeNull();

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
                bodyPreview: "Private starter content prepared from the first cycle.",
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
    expect(packetSurface.textContent).toContain("Work Ready path");
    expect(packetSurface.textContent).toContain("Private until approved");
    expect(packetSurface.textContent).toContain("Private starter content prepared from the first cycle.");
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
        "Approved next step delivered",
        "DearMe delivered the approved X step and recorded the receipt.",
        "Review the delivered X result or continue with the next approved step.",
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
    expect(handoffPanel.textContent).toContain("Approved next step delivered");
    expect(handoffPanel.textContent).toContain("Delivered");
    expect(handoffPanel.textContent).toContain("Receipt recorded");
    expect(handoffPanel.textContent).toContain("Reference tweet-1");
    expect(handoffPanel.textContent).toContain("Open result");
    expect(handoffPanel.textContent).toContain("Review the delivered X result or continue with the next approved step.");
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
        "Approved Website preview delivered",
        "DearMe delivered the approved Website preview and recorded the receipt.",
        "Open the delivered Website preview, then continue with the next approved step.",
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
    expect(handoffPanel.textContent).toContain("Approved Website preview delivered");
    expect(handoffPanel.textContent).toContain("Delivered");
    expect(handoffPanel.textContent).toContain("Receipt recorded");
    expect(handoffPanel.textContent).toContain("Reference dearme_preview_abc123");
    expect(handoffPanel.textContent).toContain("Open Website preview");
    expect(handoffPanel.textContent).toContain(
      "Open the delivered Website preview, then continue with the next approved step.",
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

  it("surfaces a delivery receipt that still needs channel connection", async () => {
    mockDearmeApi.getWorkbench.mockResolvedValue(
      workbenchResponseWithDeliveryReceipt(
        "needs_channel_connection",
        "Approved next step needs connection",
        "DearMe recorded the receipt but the connection is not ready yet.",
        "Connect the channel before DearMe can retry the approved step.",
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
    expect(handoffPanel.textContent).toContain("Approved next step needs connection");
    expect(handoffPanel.textContent).toContain("Needs connection");
    expect(handoffPanel.textContent).toContain("Connection needed");
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
        "Approved next step failed safely",
        "DearMe recorded the receipt but the delivery failed safely.",
        "Review the safe failure and choose the next approved step.",
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
    expect(handoffPanel.textContent).toContain("Approved next step failed safely");
    expect(handoffPanel.textContent).toContain("Failed safely");
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
