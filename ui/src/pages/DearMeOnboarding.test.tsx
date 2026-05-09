// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  buildDearMeBrandBlueprintExecutionPlan,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  describeDearMePaidBetaEntitlement,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DearMeOnboarding } from "./DearMeOnboarding";

const mockDearmeApi = vi.hoisted(() => ({
  getWorkbench: vi.fn(),
  getOutputs: vi.fn(),
  getPaidBetaAccess: vi.fn(),
  sendChiefOfStaffMessage: vi.fn(),
  recordMemoryUpdate: vi.fn(),
  recordPaidBetaPayment: vi.fn(),
  previewFirstCycle: vi.fn(),
  previewBrandBlueprint: vi.fn(),
  createBrandBlueprintApplyRequest: vi.fn(),
  reviewOutput: vi.fn(),
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

vi.mock("../api/dearme", () => ({
  dearmeApi: mockDearmeApi,
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
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", issuePrefix: "PET", name: "Peter Studio" },
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
        title: "Brand OS positioning",
        text: blueprint.brand.positioning,
        proofUsed: seed.proofPoints[0],
      },
    }),
    warnings: [],
  };
}

function createFirstCyclePreview() {
  return createDearMeFirstCyclePreview("company-1", {
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

function workbenchResponse() {
  return {
    companyId: "company-1",
    headline: "Dear me, your team has decisions ready",
    summary: "7 team members are assigned to your brand loop. 2 items ready. 1 decision needed. 1 lane in motion.",
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
      },
    ],
    decisionsNeeded: [
      {
        id: "approval:approval-ready",
        kind: "approve_brand_os",
        title: "Approve Brand OS for Peter Studio",
        summary: "Review the first growth-team plan before DearMe starts private work.",
        riskGate: null,
        status: "pending",
        outputKind: null,
        approvalId: "approval-ready",
        issueId: null,
        issueIdentifier: null,
        updatedAt: "2026-05-07T14:00:00.000Z",
      },
    ],
    batchDecisions: [
      {
        id: "batch:publish_social",
        title: "Review content batch",
        summary: "1 item is ready. DearMe prepared the work; approval still controls the external move.",
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
        summary: "1 item is ready. DearMe prepared the work; approval still controls the external move.",
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
    ],
    memory: {
      summary: "2 recent Voice & Memory sources are available. Latest: Voice sample.",
      sourceCount: 2,
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
      latest: [
        {
          id: "memory-1",
          kind: "voice_sample",
          title: "Voice note",
          bodyPreview: "Short, direct voice note.",
          sourceLabel: "Manual note",
          createdAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "memory-2",
          kind: "proof_point",
          title: "Shipped proof",
          bodyPreview: "Shipped a working local product.",
          sourceLabel: "Build log",
          createdAt: "2026-05-07T13:00:00.000Z",
        },
      ],
    },
    workStream: [
      {
        id: "decision:output:issue-2:content_drafts",
        role: "content_producer",
        title: "Your call: Review Starter posts",
        summary: "Three posts are ready for voice review.",
        artifact: "Content drafts",
        status: "decision_needed",
        needsApproval: true,
        relatedOutputId: "issue-2:content_drafts",
        issueId: "issue-2",
        issueIdentifier: "PET-8",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "work:issue-3:opportunity_drafts",
        role: "opportunity_scout",
        title: "Opportunity Scout is working on Opportunity leads",
        summary: "Warm collaboration and customer leads are being prepared.",
        artifact: "Opportunity leads",
        status: "working",
        needsApproval: false,
        relatedOutputId: "issue-3:opportunity_drafts",
        issueId: "issue-3",
        issueIdentifier: "PET-9",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      {
        id: "progress:activity-1",
        role: "chief_of_staff",
        title: "Growth team created",
        summary: "DearMe created the team, cycles, and first private work lanes.",
        artifact: "Growth team",
        status: "recorded",
        needsApproval: false,
        relatedOutputId: null,
        issueId: null,
        issueIdentifier: null,
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
      updatedAt: "2026-05-07T14:00:00.000Z",
    },
    actionGraph: {
      summary: "DearMe projects the current team loop into a customer-safe graph of roles, work, artifacts, decisions, memory, and reports.",
      cycleNodeId: "cycle:weekly-growth-loop",
      nodes: [
        {
          id: "cycle:weekly-growth-loop",
          kind: "cycle",
          label: "Weekly growth loop",
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
          summary: "Content Producer is shaping three private drafts before review.",
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

function outputsResponse() {
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
        workProducts: [],
        latestUpdate: null,
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

describe("DearMeOnboarding", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockDearmeApi.getWorkbench.mockResolvedValue(workbenchResponse());
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
        title: "Fresh voice note",
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
    mockDearmeApi.recordPaidBetaPayment.mockResolvedValue({
      event: { id: "finance-event-1", amountCents: 25_000, currency: "USD" },
      access: paidBetaStatus("active"),
    });
    mockDearmeApi.previewFirstCycle.mockResolvedValue(createFirstCyclePreview());
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
      output: outputsResponse().outputs[0],
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
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("previews a Brand OS seed and creates an approval request", async () => {
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
    const pageText = container.textContent ?? "";
    expect(container.textContent).toContain("Brand OS");
    expect(container.textContent).toContain("Your personal brand growth team");
    expect(container.textContent).toContain("Work ready / Decisions needed");
    expect(container.textContent).toContain("Your brand team today");
    expect(container.textContent).toContain("Dear me, your team has decisions ready");
    expect(container.textContent).toContain("Growth cycle");
    expect(container.textContent).toContain("Plan, work, review, then learn.");
    expect(container.textContent).toContain("Chief of Staff sets the cycle");
    expect(container.textContent).toContain("The team prepares assets");
    expect(container.textContent).toContain("You make the high-leverage calls");
    expect(container.textContent).toContain("Nothing publishes, sends, deploys, or spends without your approval.");
    expect(container.textContent).toContain("Growth map");
    expect(container.textContent).toContain("Your team turns private work into reviewable moves");
    expect(container.textContent).toContain("1 role connected");
    expect(container.textContent).toContain("1 lane");
    expect(container.textContent).toContain("2 assets");
    expect(container.textContent).toContain("1 signal");
    expect(container.textContent).toContain("1 guardrail");
    expect(container.textContent).toContain("Team work stream");
    expect(container.textContent).toContain("The current loop, shown as the moves, memories, and guardrails that matter to you.");
    expect(container.textContent).toContain("Team visible");
    expect(container.textContent).toContain("Weekly growth loop");
    expect(container.textContent).toContain("Starter posts");
    expect(container.textContent).toContain("Content Producer");
    expect(container.textContent).toContain("Review Starter posts");
    expect(container.textContent).toContain("Starter posts are ready");
    expect(container.textContent).toContain("Approval guardrail");
    expect(container.textContent).toContain("Voice memory updated");
    expect(container.textContent).toContain("Weekly Dear me report");
    expect(container.textContent).toContain("This waits for your call before it can represent you publicly or externally.");
    expect(container.textContent).not.toContain("cycle:weekly-growth-loop");
    expect(container.textContent).not.toContain("decision:output:issue-2:content_drafts");
    expect(container.textContent).toContain("Prepared work waiting for review");
    expect(container.textContent).toContain("Why it matters");
    expect(container.textContent).toContain("Your next step");
    expect(container.textContent).toContain("Open it, then approve, request changes, regenerate, or mark it not useful.");
    expect(pageText.indexOf("Dear me, your team has decisions ready")).toBeLessThan(
      pageText.indexOf("Growth cycle"),
    );
    expect(pageText.indexOf("Growth cycle")).toBeLessThan(
      pageText.indexOf("Prepared work waiting for review"),
    );
    expect(pageText.indexOf("Prepared work waiting for review")).toBeLessThan(
      pageText.indexOf("High-leverage calls"),
    );
    expect(pageText.indexOf("High-leverage calls")).toBeLessThan(
      pageText.indexOf("Private progress letter"),
    );
    expect(pageText.indexOf("Private progress letter")).toBeLessThan(
      pageText.indexOf("Voice & Memory"),
    );
    expect(container.textContent).toContain("Approve Brand OS for Peter Studio");
    expect(container.textContent).toContain("Batch decisions");
    expect(container.textContent).toContain("Review content batch");
    expect(container.textContent).toContain("Review posts");
    expect(container.textContent).toContain("Waiting on you");
    expect(container.textContent).toContain("After your call");
    expect(container.textContent).toContain("Approved work can move forward");
    expect(container.textContent).toContain("Live team feed");
    expect(container.textContent).toContain("Your call: Review Starter posts");
    expect(container.textContent).toContain("Decision ready");
    expect(container.textContent).toContain("Weekly Dear me");
    expect(container.textContent).toContain("Open letter");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("Voice & Memory");
    expect(container.textContent).toContain("Learning");
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("55%");
    expect(container.textContent).toContain("Add one more real sample");
    expect(container.textContent).toContain("Manual note");
    expect(container.textContent).toContain("Voice Editor");
    expect(container.textContent).toContain("Source guide");
    expect(container.textContent).toContain("Writing sample");
    expect(container.textContent).toContain("Source link");
    expect(container.textContent).toContain("Correction");
    expect(container.textContent).toContain("Forbidden phrase");
    expect(container.textContent).toContain("Audience note");
    expect(container.textContent).toContain("Offer note");
    expect(container.textContent).toContain("What do you want to become known for?");
    expect(container.textContent).toContain("Paid beta");
    expect(container.textContent).toContain("Cycle guardrail");
    expect(container.textContent).toContain("Private cycles can run within guardrails");
    expect(container.textContent).toContain("Monthly guardrail");
    expect(container.textContent).not.toContain("adapter");
    expect(container.textContent).not.toContain("provider");
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
      buttonByText(container, "Preview Brand OS")?.click();
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
    expect(container.textContent).toContain("Create Brand OS for Peter Studio");
    expect(container.textContent).toContain("Voice Gate v0");
    expect(container.textContent).toContain("Ready for review");
    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("First operations");

    await act(async () => {
      buttonByText(container, "Request approval")?.click();
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

  it("starts a 90-second first cycle from one positioning answer", async () => {
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

    expect(mockDearmeApi.previewFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter Studio",
          positioning: "Known for turning research into practical AI products",
          preferredChannels: ["linkedin", "newsletter", "portfolio"],
        }),
      }),
    );
    expect(container.textContent).toContain("Draft Voice Profile");
    expect(container.textContent).toContain("Voice Gate v0");
    expect(container.textContent).toContain("Starter post: point of view");
    expect(container.textContent).toContain("Starter post: proof of work");
    expect(container.textContent).toContain("Starter post: useful opening");
    expect(container.textContent).toContain("Opportunity lead");
    expect(container.textContent).toContain("Portfolio proof card");
    expect(container.textContent).toContain("First growth plan");
    expect((container.querySelector("#dearme-positioning") as HTMLTextAreaElement | null)?.value).toBe(
      "Known for turning research into practical AI products",
    );
    expect(container.textContent).not.toContain("setup_payload");
    expect(container.textContent).not.toContain("provider");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps Brand OS apply locked during trial preview", async () => {
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
      buttonByText(container, "Preview Brand OS")?.click();
    });
    await flushReact();

    const requestButton = buttonByText(container, "Request approval");
    expect(requestButton?.disabled).toBe(true);
    expect(container.textContent).toContain("unlock the private Brand OS work loop");
    expect(mockDearmeApi.createBrandBlueprintApplyRequest).not.toHaveBeenCalled();

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
    expect(container.textContent).not.toContain("adapter");
    expect(container.textContent).not.toContain("provider");
    expect(container.textContent).not.toContain("setup_payload");

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

    await act(async () => {
      buttonByText(container, "Forbidden phrase")?.click();
    });

    expect((container.querySelector("#dearme-memory-kind") as HTMLSelectElement | null)?.value).toBe("constraint");

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

    expect(mockDearmeApi.recordMemoryUpdate).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        kind: "constraint",
        title: "Forbidden phrase",
        body: "Never describe the product as effortless magic.",
        sourceLabel: "Voice review note",
      }),
    );
    expect(container.textContent).not.toContain("Paperclip");
    expect(container.textContent).not.toContain("adapter");
    expect(container.textContent).not.toContain("provider");

    await act(async () => {
      root.unmount();
    });
  });

  it("sends a Chief of Staff brief without exposing the work queue substrate", async () => {
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

    expect(container.textContent).toContain("Chief of Staff");
    expect(container.textContent).toContain("Brief the team");
    expect(container.textContent).toContain("Private work ready");
    expect(container.textContent).not.toContain("Paperclip");
    expect(container.textContent).not.toContain("adapter");
    expect(container.textContent).not.toContain("setup_payload");

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

    await act(async () => {
      buttonByText(container, "Open private work")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&issue=PET-22");
    expect(container.textContent).not.toContain("/issues/");

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

    await act(async () => {
      buttonByText(container, "Approve")?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&approval=approval-ready");

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
      "/dearme?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report",
    );

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
    expect(container.textContent).toContain("Approve Brand OS for Peter Studio");
    expect(container.textContent).toContain("Review the first growth-team plan");
    expect(container.textContent).toContain("Nothing public happens without approval");
    expect(container.textContent).toContain("Approve prepared move");
    expect(container.textContent).toContain("Request changes");
    expect(container.textContent).toContain("Reject");
    expect(container.textContent).not.toContain("/approvals/");

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
      buttonByText(container, "Approve prepared move")?.click();
    });
    await flushReact();

    expect(mockApprovalsApi.approve).toHaveBeenCalledWith(
      "approval-ready",
      "Approved from DearMe. This represents me.",
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
      "Rejected from DearMe. Do not move this forward.",
    );
    expect(mockApprovalsApi.approve).not.toHaveBeenCalled();
    expect(mockApprovalsApi.requestRevision).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/approvals/"));
    expect(container.textContent).not.toContain("/approvals/");

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

    expect(mockNavigate).toHaveBeenCalledWith("/dearme?view=decisions&issue=issue-2");

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
    expect(container.textContent).toContain("Approve, request changes, or regenerate privately.");
    expect(container.textContent).not.toContain("No high-leverage decision is waiting right now");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders a focused private output from DearMe URL params", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
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

    expect(container.textContent).toContain("Focused work");
    expect(container.textContent).toContain("Dear me report");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("Review one public claim before publishing");
    expect(container.textContent).toContain("1 private reference prepared");
    expect(container.textContent).not.toContain("/issues/");

    await act(async () => {
      root.unmount();
    });
  });

  it("requests regeneration from focused private output without exposing issue route", async () => {
    mockLocation.search = "?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report";
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

    expect(container.textContent).toContain("What should your team do next?");

    await act(async () => {
      setTextareaValue(
        container.querySelector("#dearme-focused-output-note") as HTMLTextAreaElement,
        "Make it sharper before review.",
      );
      buttonByText(container, "Regenerate")?.click();
    });
    await flushReact();

    expect(mockDearmeApi.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      { action: "regenerate", decisionNote: "Make it sharper before review." },
    );
    expect(container.textContent).not.toContain("/issues/");

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

  it("shows generated private work and opens the underlying issue", async () => {
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
    expect(container.textContent).toContain("Dear me report");
    expect(container.textContent).toContain("Completed work: refreshed positioning");
    expect(container.textContent).toContain("Decisions needed");
    expect(container.textContent).toContain("Review one public claim");
    expect(container.textContent).toContain("Ready for review");

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent?.trim() === "Review")
        ?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dearme?view=decisions&issue=PET-7&output=issue-1%3Aweekly_report",
    );

    await act(async () => {
      root.unmount();
    });
  });
});
