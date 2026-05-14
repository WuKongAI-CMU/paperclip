import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { DEARME_FIRST_CYCLE_STARTER_POST_COUNT, describeDearMePaidBetaEntitlement } from "@paperclipai/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDearMeBrandBlueprintService = vi.hoisted(() => ({
  preview: vi.fn(),
  previewFirstCycle: vi.fn(),
  prepareFirstCycleProofOutputs: vi.fn(),
  createApplyRequest: vi.fn(),
}));

const mockDearMePaidBetaAccessService = vi.hoisted(() => ({
  getAccess: vi.fn(),
  getCohort: vi.fn(),
  recordPayment: vi.fn(),
  recordHostedPaymentReceipts: vi.fn(),
}));

const mockDearMeOutputHandoffService = vi.hoisted(() => ({
  listOutputs: vi.fn(),
  persistContentDraftPacket: vi.fn(),
  reviewOutput: vi.fn(),
}));

const mockDearMeApprovalResolverService = vi.hoisted(() => ({
  resolve: vi.fn(),
}));

const mockDearMeMemoryContextService = vi.hoisted(() => ({
  refreshRoutineMemoryContext: vi.fn(),
}));

const mockDearMeWorkbenchService = vi.hoisted(() => ({
  getWorkbench: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockIssueService = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());
const mockQueueIssueAssignmentWakeup = vi.hoisted(() => vi.fn());

const DEARME_ROUTE_INTERNAL_ERROR_PATTERN =
  /agent key|board access|company|workspace|provider|adapter|paperclip|openclaw|setup[_ -]?payload/i;

function expectDearMeRouteErrorBodySafe(body: unknown) {
  expect(JSON.stringify(body)).not.toMatch(DEARME_ROUTE_INTERNAL_ERROR_PATTERN);
}

function registerModuleMocks() {
  vi.doMock("../services/index.js", () => ({
    agentService: () => mockAgentService,
    dearMeApprovalResolverService: () => mockDearMeApprovalResolverService,
    dearmeBrandBlueprintService: () => mockDearMeBrandBlueprintService,
    dearmeMemoryContextService: () => mockDearMeMemoryContextService,
    dearmeOutputHandoffService: () => mockDearMeOutputHandoffService,
    dearmePaidBetaAccessService: () => mockDearMePaidBetaAccessService,
    dearmeWorkbenchService: () => mockDearMeWorkbenchService,
    issueService: () => mockIssueService,
    logActivity: mockLogActivity,
  }));
  vi.doMock("../services/heartbeat.js", () => ({
    heartbeatService: () => ({ wakeup: vi.fn() }),
  }));
  vi.doMock("../services/issue-assignment-wakeup.js", () => ({
    queueIssueAssignmentWakeup: mockQueueIssueAssignmentWakeup,
  }));
}

function createMemoryActivityDb(rows: Array<{ action: string; details: unknown; createdAt: Date }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select };
}

async function createApp(actorOverrides: Record<string, unknown> = {}, db: Record<string, unknown> = {}) {
  const [{ errorHandler }, { dearmeRoutes }] = await Promise.all([
    import("../middleware/index.js"),
    import("../routes/dearme.js"),
  ]);
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    },
  }));
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "session",
      isInstanceAdmin: false,
      ...actorOverrides,
    };
    next();
  });
  app.use("/api/dearme", dearmeRoutes(db as any));
  app.use(errorHandler);
  return app;
}

async function collectDearMeSseText(input: {
  app: express.Express;
  path: string;
  afterOpen?: () => void;
  done: (text: string) => boolean;
}) {
  const { createServer } = await vi.importActual<typeof import("node:http")>("node:http");
  const server = createServer(input.app);
  const controller = new AbortController();
  let reader: any = null;

  try {
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected HTTP server to listen on a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${input.path}`, {
      headers: { accept: "text/event-stream" },
      signal: controller.signal,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    reader = response.body?.getReader();
    if (!reader) throw new Error("Expected SSE response body");

    input.afterOpen?.();

    const decoder = new TextDecoder();
    let text = "";
    while (!input.done(text)) {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timed out waiting for SSE frame: ${text}`)), 1_000);
        }),
      ]);
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text;
  } finally {
    controller.abort();
    if (reader) await reader.cancel().catch(() => undefined);
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
}

function makeWorkLoopSseEvent(companyId: string) {
  return {
    type: "work_loop_transition",
    emittedAt: "2026-05-09T12:00:00.000Z",
    scope: {
      companyId,
      issueId: "issue-1",
      workLoopState: "work",
    },
    payload: {
      from: "triage",
      to: "work",
      role: "chief_of_staff",
      reason: "private-cycle-started",
    },
  } as const;
}

function makeVoiceGateResult() {
  return {
    status: "needs_voice_review",
    score: 88,
    summary: "Needs voice review. The draft stays private until the user approves what represents them.",
    approvalGate: "publish_social",
    checks: [
      {
        kind: "voice_samples",
        label: "Voice samples",
        status: "warn",
        summary: "Voice review needs at least two samples before tone should be trusted.",
        evidence: ["0 samples"],
        recommendation: "Add one or two real writing samples before approving public language.",
      },
      {
        kind: "forbidden_phrases",
        label: "Banned phrasing",
        status: "pass",
        summary: "No banned phrasing was found.",
        evidence: [],
        recommendation: "Keep the direct language and review the substance before approval.",
      },
      {
        kind: "generic_launch_copy",
        label: "Generic launch copy",
        status: "pass",
        summary: "No generic launch copy was found.",
        evidence: [],
        recommendation: "Keep the hook grounded in the user's work and audience.",
      },
      {
        kind: "proof_claim",
        label: "Proof claim",
        status: "pass",
        summary: "A proof point is attached to the draft.",
        evidence: ["shipped private proof"],
        recommendation: "Check that the proof is accurate before approving the public move.",
      },
      {
        kind: "channel_length",
        label: "Channel length",
        status: "pass",
        summary: "Draft length is 120 characters for linkedin.",
        evidence: ["warn 1800", "block 3000"],
        recommendation: "Length is within the first-pass range for review.",
      },
    ],
    blockedActions: ["Publish social posts"],
  };
}

function makeContentDraftPacket() {
  return {
    packetId: "cycle-2026-05-10-content",
    title: "Proof-backed content drafts",
    summary: "One private post is ready for review from this cycle's proof.",
    cycleEvidence: [
      {
        label: "Proof",
        source: "proof" as const,
        summary: "The latest work showed concrete receipts from the private cycle.",
      },
      {
        label: "Voice",
        source: "voice_profile" as const,
        summary: "Use short, direct, evidence-first language.",
      },
    ],
    drafts: [
      {
        id: "proof-post",
        title: "Proof-backed post",
        channel: "linkedin" as const,
        audience: "Founders evaluating local-first workflows",
        hook: "Your personal brand should show proof while you keep building.",
        body: "A short proof-backed post about turning private work into public receipts.",
        proofUsed: "shipped a local-first product launch",
        voiceGate: makeVoiceGateResult(),
        launchBoundary: "publish social posts",
      },
    ],
  };
}

function makePreviewResult() {
  return {
    companyId: "company-1",
    status: "preview",
    blueprint: {
      version: 1,
      brand: { displayName: "Peter" },
    },
    summary: {
      title: "Create private team profile for Peter",
      summary: "DearMe will prepare the first private team profile.",
      recommendedAction: "Approve after review.",
      nextActionOnApproval: "Prepare private drafts.",
      teamMemberCount: 7,
      cycleCount: 4,
      riskGateCount: 8,
    },
    executionPlan: {
      operations: [],
      riskGates: [],
      creates: {
        teamMembers: 7,
        cycles: 4,
        assets: 6,
        memorySeeds: 4,
      },
    },
    voiceGate: makeVoiceGateResult(),
    warnings: [],
  };
}

function makeFirstCycleResult() {
  return {
    companyId: "company-1",
    status: "first_cycle_preview",
    prompt: "What do you want to become known for?",
    positioning: "Known for practical AI products",
    voiceProfile: {
      title: "Draft Voice Profile",
      status: "needs_samples",
      sampleCount: 0,
      guidance: "Start with clear, proof-first drafts.",
      draftTone: ["Clear and plain", "Proof-first", "Held for voice review"],
      ownerRole: "voice_editor",
      approvalGate: "sensitive_material",
    },
    starterPosts: [
      {
        id: "starter-post-positioning",
        channel: "linkedin",
        title: "Starter post: point of view",
        hook: "What Peter wants to become known for.",
        body: "A private draft.",
        proofUsed: "The first verified work example",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
      {
        id: "starter-post-proof",
        channel: "x",
        title: "Starter post: proof of work",
        hook: "The proof behind this positioning.",
        body: "A private draft.",
        proofUsed: "The first verified work example",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
      {
        id: "starter-post-opening",
        channel: "newsletter",
        title: "Starter post: useful opening",
        hook: "A useful opening.",
        body: "A private draft.",
        proofUsed: "The first verified work example",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
      {
        id: "starter-post-lesson",
        channel: "blog",
        title: "Starter post: lesson learned",
        hook: "The lesson from the proof.",
        body: "A private draft.",
        proofUsed: "The first verified work example",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
      {
        id: "starter-post-next-step",
        channel: "community",
        title: "Starter post: next useful step",
        hook: "The next useful step.",
        body: "A private draft.",
        proofUsed: "The first verified work example",
        ownerRole: "content_producer",
        approvalGate: "publish_social",
      },
    ],
    proofSequence: [
      {
        window: "0-30s",
        title: "Identity dossier",
        summary: "Peter is positioned around practical AI products.",
        preparedArtifact: "Voice profile and known-for line",
        sourceLabel: "Prepared from private profile work",
        approvalBoundary: "Sensitive or public claims wait for review.",
      },
      {
        window: "60-120s",
        title: "Audience map",
        summary: "Founders are the first audience to map.",
        preparedArtifact: "Audience shortlist and first opportunity",
        approvalBoundary: "Outreach drafts stay private until approval.",
      },
      {
        window: "3-5min",
        title: "Private site proof",
        summary: "The first proof page move packages the strongest proof.",
        preparedArtifact: "Private proof page move",
        approvalBoundary: "Page changes wait for one launch decision.",
      },
    ],
    opportunityLead: {
      title: "Direct customer lead",
      target: "Founders",
      whyRelevant: "Founders care about the first goal.",
      relevanceScore: 9,
      contactEvidence: {
        status: "verified",
        contactEmail: "hello@founders.ai",
        contactUrl: "https://founders.ai/contact",
        sourceSignal: "Public contact page lists a direct inbox and contact form.",
      },
      outreachAngle: "Lead with proof.",
      draftMessage: "Private outreach draft.",
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    opportunityShortlist: [
      {
        title: "Direct customer lead",
        target: "Founders",
        whyRelevant: "Founders care about the first goal.",
        relevanceScore: 9,
        contactEvidence: {
          status: "verified",
          contactEmail: "hello@founders.ai",
          contactUrl: "https://founders.ai/contact",
          sourceSignal: "Public contact page lists a direct inbox and contact form.",
        },
        outreachAngle: "Lead with proof.",
        draftMessage: "Private outreach draft.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
      {
        title: "Warm collaboration lead",
        target: "Practical AI Product Operators Circle",
        whyRelevant: "Operators value visible proof and specific outcomes.",
        relevanceScore: 8,
        contactEvidence: {
          status: "pending",
          contactHandle: "@practicalaioperators",
          sourceSignal: "Community profile points to a shared inbox but the direct owner contact still needs confirmation.",
        },
        outreachAngle: "Open with the proof.",
        draftMessage: "Private collaboration draft.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
      {
        title: "Podcast guest lead",
        target: "Practical AI Builders Podcast Desk",
        whyRelevant: "Hosts want a proof-backed story.",
        relevanceScore: 7,
        contactEvidence: {
          status: "verified",
          contactEmail: "bookings@practicalaibuilders.fm",
          contactUrl: "https://practicalaibuilders.fm/podcast",
          sourceSignal: "Guest submission page publishes a dedicated booking inbox and intake form.",
        },
        outreachAngle: "Pitch the concrete story.",
        draftMessage: "Private guest pitch draft.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
      {
        title: "Hiring lead",
        target: "Local AI Workflow Hiring Teams",
        whyRelevant: "Teams need proof they can trust.",
        relevanceScore: 7,
        contactEvidence: {
          status: "pending",
          contactEmail: "jobs@localaiworkflow.example",
          sourceSignal: "Hiring page names a recruiting inbox and the role page points to the team lead.",
        },
        outreachAngle: "Lead with the outcome.",
        draftMessage: "Private hiring draft.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
      {
        title: "Warm intro lead",
        target: "Trusted Operator Intro List",
        whyRelevant: "Trusted operators can make the right introduction.",
        relevanceScore: 8,
        contactEvidence: {
          status: "unavailable",
          sourceSignal: "No direct public contact surfaced yet; a warm intro is the safest path for this lane.",
        },
        outreachAngle: "Ask for a thoughtful introduction.",
        draftMessage: "Private intro draft.",
        ownerRole: "opportunity_scout",
        approvalGate: "send_email",
      },
    ],
    portfolioProofCard: {
      title: "Portfolio proof card",
      proofSource: "The first verified work example",
      proposedCopy: "Private proof card copy.",
      placement: "Homepage proof section",
      ownerRole: "portfolio_builder",
      approvalGate: "deploy_public_site",
    },
    sitePreview: {
      handle: "peter-studio",
      route: "dearme.app/peter-studio",
      status: "private_preview",
      approvalBoundary: "Private preview stays live only in DearMe until one deploy decision is approved.",
    },
    growthPlan: {
      title: "First growth plan",
      summary: "Start with one positioning decision.",
      priorities: ["Approve positioning", "Review starter posts", "Decide on outreach"],
      nextActions: ["Check tone", "Prepare posts", "Keep outreach private"],
      ownerRole: "chief_of_staff",
      approvalGate: "public_claim",
    },
    valueReport: {
      title: "First value report",
      summary: "DearMe turned the first positioning answer into reviewable assets and launch decisions.",
      period: "First five minutes",
      items: [
        {
          id: "reviewable-assets-prepared",
          label: "Reviewable assets prepared",
          ownerRole: "growth_analyst",
          metric: "5 drafts + 1 proof card",
          count: 6,
          unit: "reviewable assets",
          summary: "Five drafts and one proof card are ready to review without publishing.",
          source: "Proof pack",
        },
        {
          id: "opportunity-coverage-staged",
          label: "Opportunity coverage staged",
          ownerRole: "opportunity_scout",
          metric: "5 leads",
          count: 5,
          unit: "qualified leads",
          summary: "Five opportunity leads are staged with relevance, angle, and contact evidence status.",
          source: "Opportunity shortlist",
        },
        {
          id: "proof-loop-opened",
          label: "Proof loop opened",
          ownerRole: "portfolio_builder",
          metric: "1 private route + 3 next-pass improvements",
          count: 4,
          unit: "proof moves",
          summary: "The private proof page is ready with improvements lined up for the next pass.",
          source: "Private proof page",
        },
        {
          id: "launch-risk-held",
          label: "Launch risk held back",
          ownerRole: "chief_of_staff",
          metric: "4 approval boundaries",
          count: 4,
          unit: "protected actions",
          summary: "Posting, sending, page changes, and spend stay behind one launch call.",
          source: "Launch boundary",
        },
      ],
      closingLine: "Use this report to decide whether to launch, revise, or let DearMe keep preparing.",
    },
    opportunityRoiReport: {
      title: "Opportunity ROI report",
      summary: "DearMe ranks prepared leads by likely return before any outreach is sent.",
      items: [
        {
          id: "opportunity-roi-1",
          leadTitle: "Direct customer lead",
          target: "Founders",
          priority: "launch_first",
          score: 97,
          expectedReturn: "Likely return: a relevant conversation with Founders tied to visible proof.",
          effort: "Low effort",
          confidence: "High confidence",
          nextAction: "Review the draft message for Founders in the launch call.",
          source: "Public contact page lists a direct inbox and contact form.",
        },
        {
          id: "opportunity-roi-2",
          leadTitle: "Warm collaboration lead",
          target: "Practical AI Product Operators Circle",
          priority: "launch_first",
          score: 82,
          expectedReturn: "Likely return: a relevant conversation with operators tied to visible proof.",
          effort: "Medium effort",
          confidence: "Medium-high confidence",
          nextAction: "Review the collaboration draft in the launch call.",
          source: "Community profile points to a shared inbox.",
        },
        {
          id: "opportunity-roi-3",
          leadTitle: "Podcast guest lead",
          target: "Practical AI Builders Podcast Desk",
          priority: "verify_contact",
          score: 79,
          expectedReturn: "Likely return: a proof-backed guest pitch.",
          effort: "Low effort",
          confidence: "Needs one more proof check",
          nextAction: "Confirm the contact path, then decide whether to send.",
          source: "Guest submission page publishes a booking inbox.",
        },
        {
          id: "opportunity-roi-4",
          leadTitle: "Hiring lead",
          target: "Local AI Workflow Hiring Teams",
          priority: "verify_contact",
          score: 73,
          expectedReturn: "Likely return: a hiring conversation tied to trusted proof.",
          effort: "Medium effort",
          confidence: "Needs one more proof check",
          nextAction: "Confirm the contact path, then decide whether to send.",
          source: "Hiring page names a recruiting inbox.",
        },
        {
          id: "opportunity-roi-5",
          leadTitle: "Warm intro lead",
          target: "Trusted Operator Intro List",
          priority: "warm_intro",
          score: 72,
          expectedReturn: "Likely return: a warm introduction into the right operator.",
          effort: "Warm intro effort",
          confidence: "Medium-high confidence",
          nextAction: "Ask for one trusted introduction before sending anything.",
          source: "No direct public contact surfaced yet.",
        },
      ],
      closingLine: "Start with the highest-return safe lead, or keep verifying contacts while DearMe prepares the next pass.",
    },
    autonomyPlan: {
      label: "Autopilot until launch",
      summary:
        "DearMe keeps researching, drafting, staging, checking voice, recording memory, and preparing the next private pass without asking. It only waits before publishing, sending, deploying, or spending.",
      autonomousSteps: [
        {
          id: "capture-positioning",
          title: "Capture the positioning",
          phase: "plan",
          ownerRole: "chief_of_staff",
          summary: "Turn the user's one-line intent into a private first-cycle brief.",
        },
        {
          id: "prepare-private-drafts",
          title: "Prepare private drafts",
          phase: "work",
          ownerRole: "content_producer",
          summary: "Draft starter posts from the positioning, audience, proof, and offer signals.",
        },
        {
          id: "stage-opportunity-and-proof",
          title: "Stage opportunity and proof work",
          phase: "work",
          ownerRole: "opportunity_scout",
          summary: "Prepare one outreach angle and one portfolio proof card without contacting anyone or changing the public site.",
        },
        {
          id: "check-voice-and-boundary",
          title: "Check voice and boundary",
          phase: "review",
          ownerRole: "voice_editor",
          summary: "Score the starter drafts and keep anything public behind the launch decision.",
        },
        {
          id: "prepare-next-private-pass",
          title: "Prepare the next private pass",
          phase: "report",
          ownerRole: "chief_of_staff",
          summary: "Write the first plan and next actions so the team can keep moving privately after the preview.",
        },
      ],
      waitsFor: ["publish_social", "send_email", "deploy_public_site", "spend_money"],
    },
    voiceGate: makeVoiceGateResult(),
    approvalBoundary: {
      label: "Launch boundary",
      summary: "Public posts, sends, page changes, and spend wait for one launch call.",
      blockedActions: ["Publish social posts", "Send outreach messages", "Deploy public page changes", "Spend budget"],
    },
    warnings: [],
  };
}

function makePaidBetaStatus(
  status: "trial" | "active",
  cycleState: "trial_preview" | "ready" | "hard_stop" = status === "trial" ? "trial_preview" : "ready",
) {
  const active = status === "active";
  const guardrailReady = cycleState === "ready";
  const guardrailHardStop = cycleState === "hard_stop";
  return {
    companyId: "company-1",
    status,
    lifetimePaidCents: active ? 25_000 : 0,
    refundedCents: 0,
    netPaidCents: active ? 25_000 : 0,
    remainingCreditCents: active && !guardrailHardStop ? 25_000 : 0,
    eventCount: active ? 1 : 0,
    latestPaymentAt: active ? "2026-05-07T14:00:00.000Z" : null,
    latestPaymentDescription: active ? "Founding beta payment" : null,
    latestExternalInvoiceId: active ? "manual-invoice-1" : null,
    entitlement: describeDearMePaidBetaEntitlement(status),
    cycleGuardrail: {
      state: cycleState,
      label: guardrailHardStop
        ? "Review before more spend"
        : guardrailReady
          ? "Guardrails ready"
          : "Trial preview",
      headline: guardrailHardStop
        ? "Private cycles pause before more spend"
        : guardrailReady
          ? "Private cycles can run within guardrails"
          : "Private cycles wait for paid beta access",
      summary: guardrailHardStop
        ? "DearMe can keep preparing low-risk drafts, but spending cycles should pause until the guardrail is reviewed."
        : guardrailReady
          ? "DearMe checks monthly private spend before work runs so prepared moves stay predictable."
          : "Preview the plan for free. DearMe records paid beta access before it spends budget on private cycles.",
      spendCents: guardrailHardStop ? 25_000 : 0,
      budgetCents: active ? 25_000 : 0,
      utilizationPercent: guardrailHardStop ? 100 : 0,
      remainingCreditCents: active && !guardrailHardStop ? 25_000 : 0,
      decisionRequired: !guardrailReady,
      decisionLabel: guardrailHardStop
        ? "Review monthly spend"
        : guardrailReady
          ? null
          : "Record paid beta access",
    },
  };
}

function makeStripeCheckoutCompletedPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-dearme-paid",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_dearme_paid",
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        amount_total: 25_000,
        currency: "usd",
        client_reference_id: "company-1",
        payment_intent: "pi_dearme_paid",
        invoice: "in_dearme_paid",
        metadata: {},
        created: 1_768_389_600,
        ...overrides,
      },
    },
  };
}

function signStripePayload(rawPayload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(Buffer.from(rawPayload))
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("DearMe brand blueprint routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/dearme.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    registerModuleMocks();
    vi.clearAllMocks();
    mockDearMeBrandBlueprintService.preview.mockReset();
    mockDearMeBrandBlueprintService.previewFirstCycle.mockReset();
    mockDearMeBrandBlueprintService.prepareFirstCycleProofOutputs.mockReset();
    mockDearMeBrandBlueprintService.createApplyRequest.mockReset();
    mockDearMePaidBetaAccessService.getAccess.mockReset();
    mockDearMePaidBetaAccessService.getCohort.mockReset();
    mockDearMePaidBetaAccessService.recordPayment.mockReset();
    mockDearMePaidBetaAccessService.recordHostedPaymentReceipts.mockReset();
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active"));
    mockDearMePaidBetaAccessService.getCohort.mockResolvedValue({
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
      nextAction: "Keep the weekly value loop moving and review cohort health before the next paid check-in.",
      attentionAccounts: [],
    });
    mockDearMeOutputHandoffService.listOutputs.mockReset();
    mockDearMeOutputHandoffService.persistContentDraftPacket.mockReset();
    mockDearMeOutputHandoffService.reviewOutput.mockReset();
    mockDearMeApprovalResolverService.resolve.mockReset();
    mockDearMeMemoryContextService.refreshRoutineMemoryContext.mockReset();
    mockDearMeMemoryContextService.refreshRoutineMemoryContext.mockResolvedValue({
      memoryCount: 2,
      routineCount: 2,
      updated: 1,
      skipped: 1,
    });
    mockDearMeWorkbenchService.getWorkbench.mockReset();
    mockAgentService.list.mockReset();
    mockIssueService.create.mockReset();
    mockIssueService.getById.mockReset();
    mockIssueService.getById.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "PET-1",
    });
    mockAgentService.list.mockResolvedValue([
      {
        id: "agent-chief-1",
        metadata: {
          source: "dearme_brand_blueprint_apply",
          dearmeRole: "chief_of_staff",
        },
      },
    ]);
    mockIssueService.create.mockResolvedValue({
      id: "issue-chief-1",
      identifier: "PET-22",
      title: "DearMe: Plan next moves - Launch positioning changed",
      assigneeAgentId: "agent-chief-1",
    });
    mockQueueIssueAssignmentWakeup.mockReset();
    mockLogActivity.mockReset();
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("returns the DearMe team workbench for a caller with company access", async () => {
    mockDearMeWorkbenchService.getWorkbench.mockResolvedValue({
      companyId: "company-1",
      headline: "Dear me, your team has decisions ready",
      summary: "7 team members are assigned to your brand cycle. 1 item ready. 1 decision needed. 1 lane in motion.",
      team: [
        {
          role: "chief_of_staff",
          name: "Chief of Staff",
          status: "Standing by",
          currentFocus: "Coordinating today's brand growth plan and the next decisions.",
          lastActiveAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      activeWork: [],
      workReady: [
        {
          id: "issue-1:content_drafts",
          title: "Content drafts",
          summary: "Private posts prepared for review.",
          status: "ready_for_review",
          ownerRole: "content_producer",
          outputKind: "content_drafts",
          issueId: "issue-1",
          issueIdentifier: "PET-1",
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      decisionsNeeded: [
        {
          id: "output:issue-1:content_drafts",
          kind: "review_output",
          title: "Review Content drafts",
          summary: "Your team prepared this private artifact. Launch the next move only if it represents you.",
          riskGate: "publish_social",
          status: "needed",
          outputKind: "content_drafts",
          approvalId: null,
          issueId: "issue-1",
          issueIdentifier: "PET-1",
          updatedAt: "2026-05-07T14:00:00.000Z",
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
          decisionIds: ["output:issue-1:content_drafts"],
          issueIds: ["issue-1"],
          approvalIds: [],
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      recentProgress: [],
      memory: {
        summary: "1 recent Voice & Memory source is available. Latest: Voice sample.",
        sourceCount: 1,
        voiceSampleCount: 1,
        proofCount: 0,
        latest: [
          {
            id: "memory-1",
            kind: "voice_sample",
            title: "Operator note",
            bodyPreview: "Short, direct writing sample.",
            sourceLabel: "Manual note",
            createdAt: "2026-05-07T14:00:00.000Z",
          },
        ],
      },
      workStream: [
        {
          id: "decision:output:issue-1:content_drafts",
          kind: "decision_needed",
          cycleStage: "review",
          role: "content_producer",
          title: "Your call: Review Content drafts",
          summary: "Your team prepared this private artifact. Approve the next move only if it represents you.",
          artifact: "Content drafts",
          status: "decision_needed",
          needsApproval: true,
          sourceLabel: "Prepared output",
          costImpact: null,
          nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
          relatedOutputId: "issue-1:content_drafts",
          issueId: "issue-1",
          issueIdentifier: "PET-1",
          approvalId: null,
          createdAt: "2026-05-07T14:00:00.000Z",
          reviewLoop: null,
        },
      ],
      runLedger: [
        {
          id: "ledger:decision:output:issue-1:content_drafts",
          kind: "needs_decision",
          role: "content_producer",
          title: "Your call: Review Content drafts",
          summary: "Your team prepared this private artifact. Launch the next move only if it represents you.",
          evidenceLabel: "Prepared output / Content drafts",
          status: "decision_needed",
          needsApproval: true,
          nextAction: "One launch-ready next step is ready: review the shared proof pack, then launch, request changes, or regenerate. Every public move still waits for your launch approval.",
          relatedOutputId: "issue-1:content_drafts",
          issueId: "issue-1",
          issueIdentifier: "PET-1",
          approvalId: null,
          createdAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      report: null,
      outputs: [],
    });

    const res = await request(await createApp())
      .get("/api/dearme/companies/company-1/workbench");

    expect(res.status).toBe(200);
    expect(res.body.headline).toContain("team");
    expect(res.body.team[0].role).toBe("chief_of_staff");
    expect(res.body.batchDecisions[0].actionLabel).toBe("Review posts");
    expect(res.body.workStream[0].artifact).toBe("Content drafts");
    expect(res.body.runLedger[0].kind).toBe("needs_decision");
    expect(mockDearMeWorkbenchService.getWorkbench).toHaveBeenCalledWith("company-1");
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("streams the scoped DearMe live workbench snapshot and runtime events", async () => {
    const { createDearMeSseBus, setDearMeSseBusForTest } = await import("../services/dearme-sse-bus.js");
    const bus = createDearMeSseBus();
    setDearMeSseBusForTest(bus);
    mockDearMeWorkbenchService.getWorkbench.mockResolvedValue({
      companyId: "company-1",
      headline: "Your team is preparing the next private move.",
      team: [{ role: "chief_of_staff", name: "Chief of Staff" }],
      workStream: [],
      batchDecisions: [],
      runLedger: [],
      report: null,
      outputs: [],
    });

    const text = await collectDearMeSseText({
      app: await createApp(),
      path: "/api/dearme/companies/company-1/events",
      afterOpen: () => {
        bus.emit(makeWorkLoopSseEvent("company-2") as any);
        bus.emit(makeWorkLoopSseEvent("company-1") as any);
      },
      done: (body) => body.includes("event: sync") && body.includes("private-cycle-started"),
    });

    expect(text).toContain("event: sync");
    expect(text).toContain("event: work_loop_transition");
    expect(text).toContain('"companyId":"company-1"');
    expect(text).not.toContain("company-2");
    expect(text).not.toContain("OpenClaw");
    expect(text).not.toContain("Paperclip");
    expect(mockDearMeWorkbenchService.getWorkbench).toHaveBeenCalledWith("company-1");
  });

  it("rejects live workbench streams for callers without company access", async () => {
    const res = await request(await createApp({ companyIds: ["company-2"] }))
      .get("/api/dearme/companies/company-1/events");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe profile is not available to your account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMeWorkbenchService.getWorkbench).not.toHaveBeenCalled();
  });

  it("records a Chief of Staff brief as private DearMe work and wakes the team member", async () => {
    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/chief-of-staff/messages")
      .send({
        intent: "plan_next",
        message: "Launch positioning changed. Prepare the next three moves before I publish anything.",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      companyId: "company-1",
      status: "queued",
      issueId: "issue-chief-1",
      issueIdentifier: "PET-22",
      title: "DearMe: Plan next moves - Launch positioning changed",
      nextStep: "Chief of Staff has the brief and will prepare the next private move for review.",
    });
    expect(mockIssueService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        title: expect.stringContaining("Plan next moves"),
        status: "todo",
        priority: "high",
        assigneeAgentId: "agent-chief-1",
        originKind: "dearme_chief_of_staff_message",
      }),
    );
    expect(mockIssueService.create.mock.calls[0][1].description).toContain(
      "Prepare the next useful move privately",
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.chief_of_staff_message",
        entityType: "issue",
        entityId: "issue-chief-1",
      }),
    );
    expect(mockQueueIssueAssignmentWakeup).toHaveBeenCalledWith(
      expect.objectContaining({
        issue: expect.objectContaining({ id: "issue-chief-1" }),
        reason: "dearme_chief_of_staff_message",
      }),
    );
  });

  it("records feedback handling as Chief of Staff learning and support work", async () => {
    mockIssueService.create.mockResolvedValue({
      id: "issue-chief-feedback",
      identifier: "PET-24",
      title: "DearMe: Handle feedback - First report felt generic",
      assigneeAgentId: "agent-chief-1",
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/chief-of-staff/messages")
      .send({
        intent: "handle_feedback",
        message: "First report felt generic. Prepare a recovery note and make the next cycle sharper.",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      companyId: "company-1",
      status: "queued",
      issueId: "issue-chief-feedback",
      issueIdentifier: "PET-24",
      title: "DearMe: Handle feedback - First report felt generic",
      nextStep: "Chief of Staff has the feedback brief and will turn it into Voice & Memory learning, recovery work, and next-cycle changes before any public move.",
    }));
    expect(mockIssueService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        title: expect.stringContaining("Handle feedback"),
        status: "todo",
        assigneeAgentId: "agent-chief-1",
      }),
    );
    const description = mockIssueService.create.mock.calls[0][1].description;
    expect(description).toContain("Feedback learning:");
    expect(description).toContain("capture Voice & Memory learnings");
    expect(description).toContain("recovery or follow-up move");
  });

  it("saves a Chief of Staff brief before the team member exists", async () => {
    mockAgentService.list.mockResolvedValue([]);
    mockIssueService.create.mockResolvedValue({
      id: "issue-chief-2",
      identifier: "PET-23",
      title: "DearMe: Prepare report - Friday recap",
      assigneeAgentId: null,
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/chief-of-staff/messages")
      .send({
        intent: "prepare_report",
        message: "Friday recap",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("recorded");
    expect(res.body.nextStep).toContain("Start the private team");
    expect(mockIssueService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        status: "backlog",
        assigneeAgentId: null,
      }),
    );
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
  });

  it("keeps Chief of Staff briefs locked during trial preview", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("trial"));

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/chief-of-staff/messages")
      .send({
        intent: "plan_next",
        message: "Prepare the next brand move.",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Add a paid beta credit purchase to unlock the brand team cycle.");
    expect(mockIssueService.create).not.toHaveBeenCalled();
    expect(mockAgentService.list).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
  });

  it("blocks Chief of Staff private cycles when paid-beta spend reaches the guardrail", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active", "hard_stop"));

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/chief-of-staff/messages")
      .send({
        intent: "plan_next",
        message: "Prepare another paid private cycle.",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(
      "DearMe can keep preparing low-risk drafts, but spending cycles should pause until the guardrail is reviewed.",
    );
    expect(mockIssueService.create).not.toHaveBeenCalled();
    expect(mockAgentService.list).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
  });

  it("rejects DearMe workbench reads outside the caller scope", async () => {
    const res = await request(await createApp({ companyIds: ["company-2"] }))
      .get("/api/dearme/companies/company-1/workbench");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe profile is not available to your account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMeWorkbenchService.getWorkbench).not.toHaveBeenCalled();
  });

  it("resolves a pending approval request through the normalized issue boundary", async () => {
    mockDearMeApprovalResolverService.resolve.mockResolvedValue({
      approvalId: "approval-1",
      decision: "pending",
      reason: "first_n_publishes_user_approved",
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/approvals/resolve")
      .send({
        issueId: "PET-1",
        toolName: "post_x",
        channel: "x",
        gate: "publish",
        estimatedUsd: 0,
        voiceGateScore: 96,
        reason: "first publish to x",
        config: {
          minVoiceGateScore: 92,
          dailyUsdCap: 5,
        },
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({
      companyId: "company-1",
      issueId: "issue-1",
      issueIdentifier: "PET-1",
      approvalId: "approval-1",
      decision: "pending",
      reason: "first_n_publishes_user_approved",
    });
    expect(mockIssueService.getById).toHaveBeenCalledWith("PET-1");
    expect(mockDearMeApprovalResolverService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        requestedByUserId: "user-1",
        requestedByAgentId: null,
        issueId: "issue-1",
        toolName: "post_x",
        channel: "x",
        gate: "publish",
        estimatedUsd: 0,
        voiceGateScore: 96,
        reason: "first publish to x",
        config: {
          minVoiceGateScore: 92,
          dailyUsdCap: 5,
        },
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.approval_resolved",
        entityType: "approval",
        entityId: "approval-1",
      }),
    );
  });

  it("rejects approval resolution for an issue outside the company", async () => {
    mockIssueService.getById.mockResolvedValue({
      id: "issue-2",
      companyId: "company-2",
      identifier: "OTH-2",
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/approvals/resolve")
      .send({
        issueId: "OTH-2",
        toolName: "post_x",
        channel: "x",
        gate: "publish",
        estimatedUsd: 0,
        voiceGateScore: 96,
        reason: "cross company attempt",
        config: {
          minVoiceGateScore: 92,
          dailyUsdCap: 5,
        },
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Issue not found");
    expect(mockDearMeApprovalResolverService.resolve).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("preserves agent attribution when an agent resolves an approval", async () => {
    const agentId = "00000000-0000-4000-8000-000000000001";
    mockDearMeApprovalResolverService.resolve.mockResolvedValue({
      approvalId: "approval-2",
      decision: "approved",
      reason: "auto_approved_after_prior_review",
    });

    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId,
      runId: "run-1",
    }))
      .post("/api/dearme/companies/company-1/approvals/resolve")
      .send({
        issueId: "issue-1",
        toolName: "post_x",
        channel: "x",
        gate: "publish",
        estimatedUsd: 0,
        voiceGateScore: 98,
        reason: "approved repeat publish",
        config: {
          minVoiceGateScore: 92,
          dailyUsdCap: 5,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.decision).toBe("approved");
    expect(mockDearMeApprovalResolverService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedByUserId: null,
        requestedByAgentId: agentId,
        issueId: "issue-1",
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorType: "agent",
        actorId: agentId,
        agentId,
        runId: "run-1",
        action: "dearme.approval_resolved",
      }),
    );
  });

  it("records a Voice & Memory update through the activity log", async () => {
    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/memory-updates")
      .send({
        kind: "voice_sample",
        sourceInputMode: "paste",
        title: "Operator note",
        body: "Short, direct note.",
        sourceLabel: "Manual note",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("recorded");
    expect(res.body.memory).toEqual(expect.objectContaining({
      kind: "voice_sample",
      sourceInputMode: "paste",
      title: "Operator note",
      body: "Short, direct note.",
      bodyPreview: "Short, direct note.",
      sourceLabel: "Manual note",
    }));
    expect(res.body.growthCycles).toEqual({
      checked: 2,
      updated: 1,
      unchanged: 1,
      memorySources: 2,
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: expect.any(String),
        details: expect.objectContaining({
          kind: "voice_sample",
          sourceInputMode: "paste",
          title: "Operator note",
          body: "Short, direct note.",
          sourceLabel: "Manual note",
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("rejects invalid Voice & Memory source links before writing activity", async () => {
    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/memory-updates")
      .send({
        kind: "proof_point",
        sourceInputMode: "link",
        body: "Launch proof for the next growth cycle.",
        sourceLabel: "ftp://example.com/proof",
      });

    expect(res.status).toBe(400);
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).not.toHaveBeenCalled();
  });

  it("revises a Voice & Memory source through the activity log", async () => {
    const res = await request(await createApp())
      .patch("/api/dearme/companies/company-1/memory-updates/memory-voice-1")
      .send({
        kind: "voice_sample",
        sourceInputMode: "link",
        title: "Revised operator note",
        body: "Sharper direct note for future drafts.",
        sourceLabel: "https://example.com/manual-note",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("recorded");
    expect(res.body.memory).toEqual(expect.objectContaining({
      id: "memory-voice-1",
      kind: "voice_sample",
      sourceInputMode: "link",
      title: "Revised operator note",
      body: "Sharper direct note for future drafts.",
      bodyPreview: "Sharper direct note for future drafts.",
      sourceLabel: "https://example.com/manual-note",
    }));
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice-1",
        details: expect.objectContaining({
          kind: "voice_sample",
          sourceInputMode: "link",
          title: "Revised operator note",
          body: "Sharper direct note for future drafts.",
          sourceLabel: "https://example.com/manual-note",
          revisionOf: "memory-voice-1",
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("retires a Voice & Memory source through the activity log", async () => {
    const res = await request(await createApp())
      .delete("/api/dearme/companies/company-1/memory-updates/memory-voice-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      companyId: "company-1",
      status: "archived",
      memoryId: "memory-voice-1",
      archivedAt: expect.any(String),
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 2,
      },
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_archived",
        entityType: "dearme_memory",
        entityId: "memory-voice-1",
        details: {
          memoryId: "memory-voice-1",
          reason: "user_retired_source",
        },
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("restores a retired Voice & Memory source through the activity log", async () => {
    const memoryDb = createMemoryActivityDb([
      {
        action: "dearme.memory_archived",
        details: {
          memoryId: "memory-voice-1",
          reason: "user_retired_source",
        },
        createdAt: new Date("2026-05-07T14:07:00.000Z"),
      },
      {
        action: "dearme.memory_updated",
        details: {
          kind: "voice_sample",
          sourceInputMode: "paste",
          title: "Operator note",
          body: "Short, direct note.",
          sourceLabel: "Manual note",
        },
        createdAt: new Date("2026-05-07T14:00:00.000Z"),
      },
    ]);

    const res = await request(await createApp({}, memoryDb))
      .post("/api/dearme/companies/company-1/memory-updates/memory-voice-1/restore");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("recorded");
    expect(res.body.memory).toEqual(expect.objectContaining({
      id: "memory-voice-1",
      kind: "voice_sample",
      sourceInputMode: "paste",
      title: "Operator note",
      body: "Short, direct note.",
      bodyPreview: "Short, direct note.",
      sourceLabel: "Manual note",
    }));
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "memory-voice-1",
        details: expect.objectContaining({
          kind: "voice_sample",
          sourceInputMode: "paste",
          title: "Operator note",
          body: "Short, direct note.",
          sourceLabel: "Manual note",
          restoredFromArchive: true,
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("requires board access before recording Voice & Memory updates", async () => {
    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-1",
    }))
      .post("/api/dearme/companies/company-1/memory-updates")
      .send({
        kind: "voice_sample",
        body: "Short, direct note.",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe action needs an owner account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).not.toHaveBeenCalled();
  });

  it("returns generated output handoffs for a caller with company access", async () => {
    mockDearMeOutputHandoffService.listOutputs.mockResolvedValue({
      companyId: "company-1",
      outputs: [
        {
          id: "issue-1:weekly_report",
          companyId: "company-1",
          kind: "weekly_report",
          title: "Dear me report",
          summary: "Private weekly report.",
          status: "ready_for_review",
          isReviewable: true,
          issueId: "issue-1",
          issueIdentifier: "PET-7",
          issueTitle: "DearMe Draft: Draft weekly Dear me report",
          updatedAt: "2026-05-07T14:00:00.000Z",
          documents: [],
          workProducts: [],
          latestUpdate: null,
          details: [],
          sourceEvidence: [],
        },
      ],
    });

    const res = await request(await createApp())
      .get("/api/dearme/companies/company-1/outputs");

    expect(res.status).toBe(200);
    expect(res.body.outputs[0].kind).toBe("weekly_report");
    expect(mockDearMeOutputHandoffService.listOutputs).toHaveBeenCalledWith("company-1");
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("records a DearMe output review and hides wake internals", async () => {
    const output = {
      id: "issue-1:weekly_report",
      companyId: "company-1",
      kind: "weekly_report",
      title: "Dear me report",
      summary: "Private weekly report.",
      status: "complete",
      isReviewable: true,
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      issueTitle: "DearMe Draft: Draft weekly Dear me report",
      updatedAt: "2026-05-07T14:00:00.000Z",
      documents: [],
      workProducts: [],
      latestUpdate: null,
      details: [],
      sourceEvidence: [],
    };
    mockDearMeOutputHandoffService.reviewOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "approve",
      status: "recorded",
      comment: {
        id: "comment-1",
        bodyPreview: "DearMe decision: approved this prepared work.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      output,
      wakeIssue: null,
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/reviews")
      .send({ action: "approve", decisionNote: "This represents me." });

    expect(res.status).toBe(200);
    expect(res.body.action).toBe("approve");
    expect(res.body.wakeIssue).toBeUndefined();
    expect(mockDearMeOutputHandoffService.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      expect.objectContaining({ action: "approve", decisionNote: "This represents me." }),
      expect.objectContaining({ actorType: "user", actorId: "user-1", agentId: null }),
    );
    expect(mockDearMePaidBetaAccessService.getAccess).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.output_approved",
        entityType: "issue_comment",
        entityId: "comment-1",
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).not.toHaveBeenCalled();
  });

  it("records silence-default private approval as feedback without waking work or hard gates", async () => {
    const output = {
      id: "issue-1:weekly_report",
      companyId: "company-1",
      kind: "weekly_report",
      title: "Dear me report",
      summary: "Private weekly report.",
      status: "complete",
      isReviewable: true,
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      issueTitle: "DearMe Draft: Draft weekly Dear me report",
      updatedAt: "2026-05-07T14:00:00.000Z",
      documents: [],
      workProducts: [],
      latestUpdate: null,
      details: [],
      sourceEvidence: [],
    };
    mockDearMeOutputHandoffService.reviewOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "approve",
      status: "recorded",
      comment: {
        id: "comment-silence-1",
        bodyPreview: "DearMe decision: approved this prepared work.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      output,
      wakeIssue: null,
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/reviews")
      .send({
        action: "approve",
        silenceDefault: { reason: "review window elapsed" },
      });

    expect(res.status).toBe(200);
    expect(res.body.action).toBe("approve");
    expect(res.body.wakeIssue).toBeUndefined();
    expect(mockDearMeOutputHandoffService.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      expect.objectContaining({
        action: "approve",
        decisionNote: null,
        silenceDefault: {
          score: 7,
          reason: "review window elapsed",
        },
      }),
      expect.objectContaining({ actorType: "user", actorId: "user-1", agentId: null }),
    );
    expect(mockDearMePaidBetaAccessService.getAccess).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledTimes(2);
    expect(mockLogActivity).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "review-feedback:comment-silence-1",
        details: expect.objectContaining({
          kind: "review_feedback",
          body: expect.stringContaining("neutral-positive 7/10 signal"),
          reviewAction: "approve",
          defaultApprovalScore: 7,
          defaultedBySilence: true,
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("queues not-useful output feedback without exposing wake internals", async () => {
    const output = {
      id: "issue-1:weekly_report",
      companyId: "company-1",
      kind: "weekly_report",
      title: "Dear me report",
      summary: "Private weekly report.",
      status: "ready_for_review",
      isReviewable: true,
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      issueTitle: "DearMe Draft: Draft weekly Dear me report",
      updatedAt: "2026-05-07T14:00:00.000Z",
      documents: [],
      workProducts: [],
      latestUpdate: null,
      details: [],
      sourceEvidence: [],
    };
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active"));
    mockDearMeOutputHandoffService.reviewOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "not_useful",
      status: "queued",
      comment: {
        id: "comment-2",
        bodyPreview: "DearMe decision: marked this prepared work as not useful.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      output,
      wakeIssue: { id: "issue-1", assigneeAgentId: "agent-1", status: "todo" },
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/reviews")
      .send({ action: "not_useful", decisionNote: "This does not help." });

    expect(res.status).toBe(202);
    expect(res.body.action).toBe("not_useful");
    expect(res.body.wakeIssue).toBeUndefined();
    expect(mockDearMePaidBetaAccessService.getAccess).toHaveBeenCalledWith("company-1");
    expect(mockQueueIssueAssignmentWakeup).toHaveBeenCalledWith(expect.objectContaining({
      issue: { id: "issue-1", assigneeAgentId: "agent-1", status: "todo" },
      reason: "dearme_output_marked_not_useful",
      mutation: "dearme.output_review",
      contextSource: "dearme.output_review",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        action: "dearme.output_marked_not_useful",
        entityType: "issue_comment",
        entityId: "comment-2",
      }),
    );
    expect(mockLogActivity).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "review-feedback:comment-2",
        details: expect.objectContaining({
          kind: "review_feedback",
          sourceInputMode: "paste",
          title: "Review feedback for Dear me report",
          body: "For Dear me report, the owner said this prepared work was not useful yet. Feedback: This does not help.",
          sourceLabel: "Dear me report",
          outputId: "issue-1:weekly_report",
          reviewAction: "not_useful",
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("normalizes DearMe continuation intent before waking the private team", async () => {
    const output = {
      id: "issue-1:weekly_report",
      companyId: "company-1",
      kind: "weekly_report",
      title: "Dear me report",
      summary: "Private weekly report.",
      status: "ready_for_review",
      isReviewable: true,
      issueId: "issue-1",
      issueIdentifier: "PET-7",
      issueTitle: "DearMe Draft: Draft weekly Dear me report",
      updatedAt: "2026-05-07T14:00:00.000Z",
      documents: [],
      workProducts: [],
      latestUpdate: null,
      details: [],
      sourceEvidence: [],
    };
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active"));
    mockDearMeOutputHandoffService.reviewOutput.mockResolvedValue({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-3",
        bodyPreview: "DearMe decision: prepare another private pass before review.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      output,
      wakeIssue: { id: "issue-1", assigneeAgentId: "agent-1", status: "todo" },
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/continue")
      .send({ intent: "prepare_another_pass", decisionNote: "Try a sharper angle." });

    expect(res.status).toBe(202);
    expect(res.body.action).toBe("regenerate");
    expect(res.body.wakeIssue).toBeUndefined();
    expect(mockDearMeOutputHandoffService.reviewOutput).toHaveBeenCalledWith(
      "company-1",
      "issue-1:weekly_report",
      expect.objectContaining({ action: "regenerate", decisionNote: "Try a sharper angle." }),
      expect.objectContaining({ actorType: "user", actorId: "user-1", agentId: null }),
    );
    expect(mockQueueIssueAssignmentWakeup).toHaveBeenCalledWith(expect.objectContaining({
      issue: { id: "issue-1", assigneeAgentId: "agent-1", status: "todo" },
      reason: "dearme_output_regeneration_requested",
      mutation: "dearme.output_continue",
      contextSource: "dearme.output_continue",
    }));
    expect(mockLogActivity).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        action: "dearme.output_regeneration_requested",
        details: expect.objectContaining({
          outputId: "issue-1:weekly_report",
          reviewAction: "regenerate",
          continuationIntent: "prepare_another_pass",
        }),
      }),
    );
    expect(mockLogActivity).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        action: "dearme.memory_updated",
        entityType: "dearme_memory",
        entityId: "review-feedback:comment-3",
        details: expect.objectContaining({
          kind: "review_feedback",
          body: [
            "For Dear me report, the owner asked DearMe to prepare another private pass.",
            "Feedback: Try a sharper angle.",
            "Next move: Prepare another private pass for review.",
          ].join(" "),
          reviewAction: "regenerate",
          continuationIntent: "prepare_another_pass",
        }),
      }),
    );
    expect(mockDearMeMemoryContextService.refreshRoutineMemoryContext).toHaveBeenCalledWith(
      "company-1",
      {
        userId: "user-1",
        agentId: null,
        runId: null,
      },
    );
  });

  it("lets an assigned DearMe worker save a private content packet into output handoff", async () => {
    const packet = makeContentDraftPacket();
    mockDearMeOutputHandoffService.persistContentDraftPacket.mockResolvedValue({
      id: "work-product-1",
      type: "artifact",
      title: "Proof-backed content drafts",
      url: null,
      status: "ready_for_review",
      reviewState: "needs_board_review",
      summary: "Draft body: A short proof-backed post about turning private work into public receipts.",
      voiceGate: makeVoiceGateResult(),
      updatedAt: "2026-05-10T14:00:00.000Z",
    });

    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-1",
      runId: "11111111-1111-4111-8111-111111111111",
    }))
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Acontent_drafts/content-draft-packets")
      .send(packet);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      id: "work-product-1",
      title: "Proof-backed content drafts",
      voiceGate: expect.objectContaining({
        score: 88,
        approvalGate: "publish_social",
      }),
    }));
    expect(mockDearMeOutputHandoffService.persistContentDraftPacket).toHaveBeenCalledWith(
      "company-1",
      "issue-1",
      expect.objectContaining({
        packetId: "cycle-2026-05-10-content",
        title: "Proof-backed content drafts",
        createdByRunId: null,
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.content_draft_packet_saved",
        actorType: "agent",
        actorId: "agent-1",
        entityType: "issue_work_product",
        entityId: "work-product-1",
        details: expect.objectContaining({
          outputId: "issue-1:content_drafts",
          outputKind: "content_drafts",
          issueId: "issue-1",
          voiceGateScore: 88,
        }),
      }),
    );
    const serialized = JSON.stringify(res.body).toLowerCase();
    for (const hiddenTerm of ["provider", "adapter", "paperclip", "openclaw", "symphony", "runtime"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("does not let content packet saves target another DearMe output lane", async () => {
    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-1",
    }))
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/content-draft-packets")
      .send(makeContentDraftPacket());

    expect(res.status).toBe(404);
    expect(mockDearMeOutputHandoffService.persistContentDraftPacket).not.toHaveBeenCalled();
  });

  it("requires content packet saves to include a stable packet id", async () => {
    const { packetId: _packetId, ...packet } = makeContentDraftPacket();

    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-1",
    }))
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Acontent_drafts/content-draft-packets")
      .send(packet);

    expect(res.status).toBe(400);
    expect(mockDearMeOutputHandoffService.persistContentDraftPacket).not.toHaveBeenCalled();
  });

  it("blocks output regeneration cycles when paid-beta spend reaches the guardrail", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active", "hard_stop"));

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/outputs/issue-1%3Aweekly_report/reviews")
      .send({ action: "regenerate", decisionNote: "Try a sharper angle." });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(
      "DearMe can keep preparing low-risk drafts, but spending cycles should pause until the guardrail is reviewed.",
    );
    expect(mockDearMePaidBetaAccessService.getAccess).toHaveBeenCalledWith("company-1");
    expect(mockDearMeOutputHandoffService.reviewOutput).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "dearme.output_regeneration_requested" }),
    );
  });

  it("rejects generated output handoffs outside the caller scope", async () => {
    const res = await request(await createApp({ companyIds: ["company-2"] }))
      .get("/api/dearme/companies/company-1/outputs");

    expect(res.status).toBe(403);
    expect(mockDearMeOutputHandoffService.listOutputs).not.toHaveBeenCalled();
  });

  it("returns paid beta access status for a caller with company access", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("trial"));

    const res = await request(await createApp())
      .get("/api/dearme/companies/company-1/paid-beta/access");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("trial");
    expect(mockDearMePaidBetaAccessService.getAccess).toHaveBeenCalledWith("company-1");
  });

  it("returns paid beta cohort health for explicitly accessible companies", async () => {
    const res = await request(await createApp({ companyIds: ["company-1", "company-2"] }))
      .post("/api/dearme/paid-beta/cohort")
      .send({ companyIds: ["company-1", "company-2", "company-1"] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      state: "operable",
      accountCount: 1,
      activeAccountCount: 1,
      label: "Cohort operable",
    });
    expect(mockDearMePaidBetaAccessService.getCohort).toHaveBeenCalledWith([
      "company-1",
      "company-2",
    ]);
  });

  it("rejects paid beta cohort health when any requested company is outside the caller scope", async () => {
    const res = await request(await createApp({ companyIds: ["company-1"] }))
      .post("/api/dearme/paid-beta/cohort")
      .send({ companyIds: ["company-1", "company-2"] });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe profile is not available to your account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMePaidBetaAccessService.getCohort).not.toHaveBeenCalled();
  });

  it("records a manual paid beta payment and logs the finance event", async () => {
    mockDearMePaidBetaAccessService.recordPayment.mockResolvedValue({
      event: {
        id: "finance-event-1",
        amountCents: 25_000,
        currency: "USD",
      },
      access: makePaidBetaStatus("active"),
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/paid-beta/access-events")
      .send({
        amountCents: 25_000,
        currency: "usd",
        description: "Founding beta payment",
        externalInvoiceId: "manual-invoice-1",
        occurredAt: "2026-05-07T14:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.access.status).toBe("active");
    expect(mockDearMePaidBetaAccessService.recordPayment).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        amountCents: 25_000,
        currency: "USD",
        description: "Founding beta payment",
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.paid_beta_payment_recorded",
        entityType: "finance_event",
        entityId: "finance-event-1",
        details: expect.objectContaining({
          amountCents: 25_000,
          currency: "USD",
          status: "active",
          netPaidCents: 25_000,
        }),
      }),
    );
  });

  it("requires board access before recording paid beta payments", async () => {
    const res = await request(await createApp({
      type: "agent",
      companyId: "company-1",
      agentId: "agent-1",
    }))
      .post("/api/dearme/companies/company-1/paid-beta/access-events")
      .send({
        amountCents: 25_000,
        currency: "USD",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe action needs an owner account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMePaidBetaAccessService.recordPayment).not.toHaveBeenCalled();
  });

  it("records a signed Stripe checkout webhook into paid beta access", async () => {
    const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dearme_test_secret";
    mockDearMePaidBetaAccessService.recordHostedPaymentReceipts.mockResolvedValue({
      acceptedReceipts: [{
        id: "evt-dearme-paid",
        companyId: "company-1",
        provider: "hosted_checkout",
        kind: "checkout_paid",
        amountCents: 25_000,
        currency: "USD",
        externalInvoiceId: "in_dearme_paid",
        signatureVerified: true,
        idempotencyKey: "cs_dearme_paid",
        occurredAt: "2026-01-14T11:20:00.000Z",
      }],
      rejectedReceipts: [],
      duplicateSuppressedCount: 0,
      existingDuplicateSuppressedCount: 0,
      recordedEvents: [{
        id: "finance-event-stripe-1",
        amountCents: 25_000,
        currency: "USD",
      }],
      access: makePaidBetaStatus("active"),
    });

    try {
      const rawPayload = JSON.stringify(makeStripeCheckoutCompletedPayload());
      const res = await request(await createApp())
        .post("/api/dearme/payments/stripe/webhook")
        .set("content-type", "application/json")
        .set("stripe-signature", signStripePayload(rawPayload, process.env.STRIPE_WEBHOOK_SECRET))
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        received: true,
        status: "recorded",
        provider: "stripe",
        companyId: "company-1",
        acceptedReceiptCount: 1,
        recordedEventCount: 1,
        access: { status: "active" },
      });
      expect(mockDearMePaidBetaAccessService.recordHostedPaymentReceipts).toHaveBeenCalledWith(
        "company-1",
        [expect.objectContaining({
          companyId: "company-1",
          provider: "hosted_checkout",
          kind: "checkout_paid",
          amountCents: 25_000,
          currency: "USD",
          externalInvoiceId: "in_dearme_paid",
          signatureVerified: true,
          idempotencyKey: "cs_dearme_paid",
        })],
      );
      expect(mockLogActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          companyId: "company-1",
          actorType: "system",
          actorId: "stripe-webhook",
          action: "dearme.stripe_payment_webhook_recorded",
          entityType: "finance_event",
          entityId: "finance-event-stripe-1",
          details: expect.objectContaining({
            providerEventId: "evt-dearme-paid",
            checkoutSessionId: "cs_dearme_paid",
            amountCents: 25_000,
            currency: "USD",
            status: "active",
            netPaidCents: 25_000,
          }),
        }),
      );
    } finally {
      if (previousSecret === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
      }
    }
  });

  it("rejects unsigned Stripe checkout webhooks before paid access is recorded", async () => {
    const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dearme_test_secret";

    try {
      const rawPayload = JSON.stringify(makeStripeCheckoutCompletedPayload());
      const res = await request(await createApp())
        .post("/api/dearme/payments/stripe/webhook")
        .set("content-type", "application/json")
        .set("stripe-signature", "t=1768389600,v1=bad")
        .send(rawPayload);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid DearMe payment webhook signature.");
      expect(mockDearMePaidBetaAccessService.recordHostedPaymentReceipts).not.toHaveBeenCalled();
      expect(mockLogActivity).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: "dearme.stripe_payment_webhook_recorded" }),
      );
    } finally {
      if (previousSecret === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
      }
    }
  });

  it("acknowledges signed unpaid Stripe checkout webhooks without unlocking access", async () => {
    const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dearme_test_secret";

    try {
      const rawPayload = JSON.stringify(makeStripeCheckoutCompletedPayload({
        payment_status: "unpaid",
      }));
      const res = await request(await createApp())
        .post("/api/dearme/payments/stripe/webhook")
        .set("content-type", "application/json")
        .set("stripe-signature", signStripePayload(rawPayload, process.env.STRIPE_WEBHOOK_SECRET))
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        received: true,
        status: "ignored",
        reason: "checkout_did_not_unlock_paid_access",
        acceptedProviderEventCount: 0,
        rejectedProviderEventCount: 1,
      });
      expect(mockDearMePaidBetaAccessService.recordHostedPaymentReceipts).not.toHaveBeenCalled();
    } finally {
      if (previousSecret === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
      }
    }
  });

  it("returns a read-only preview for a caller with company access", async () => {
    const previewResult = makePreviewResult();
    mockDearMeBrandBlueprintService.preview.mockReturnValue(previewResult);

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/brand-blueprints/preview")
      .send({
        brand: {
          displayName: "Peter",
          goals: ["Build visible proof"],
          audiences: ["founders"],
          proofPoints: ["shipped local runtime"],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.summary.title).toBe("Create private team profile for Peter");
    expect(res.body.voiceGate.status).toBe("needs_voice_review");
    expect(mockDearMeBrandBlueprintService.preview).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          displayName: "Peter",
          cadence: "weekly",
          budgetMonthlyCents: 25_000,
        }),
      }),
    );
    expect(mockDearMeBrandBlueprintService.createApplyRequest).not.toHaveBeenCalled();
  });

  it("returns a 90-second first cycle preview for a caller with company access", async () => {
    mockDearMeBrandBlueprintService.previewFirstCycle.mockReturnValue(makeFirstCycleResult());

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/first-cycle/preview")
      .send({
        handle: "Peter Studio",
        brand: {
          displayName: "Peter",
          positioning: "Known for practical AI products",
          goals: ["Build visible proof"],
          audiences: ["founders"],
          proofPoints: ["shipped local runtime"],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.prompt).toBe("What do you want to become known for?");
    expect(res.body.starterPosts).toHaveLength(DEARME_FIRST_CYCLE_STARTER_POST_COUNT);
    expect(res.body.proofSequence.map((step: { title: string }) => step.title)).toEqual([
      "Identity dossier",
      "Audience map",
      "Private site proof",
    ]);
    expect(res.body.opportunityLead.approvalGate).toBe("send_email");
    expect(res.body.opportunityShortlist).toHaveLength(5);
    expect(res.body.opportunityShortlist[0]?.target).toBe("Founders");
    expect(res.body.opportunityShortlist.every((lead: { contactEvidence: { sourceSignal: string } }) => lead.contactEvidence.sourceSignal.length > 0)).toBe(true);
    expect(res.body.opportunityShortlist.filter((lead: { contactEvidence: { status: string } }) => lead.contactEvidence.status === "verified")).toHaveLength(2);
    expect(res.body.opportunityShortlist[4]?.relevanceScore).toBe(8);
    expect(res.body.sitePreview.route).toBe("dearme.app/peter-studio");
    expect(res.body.sitePreview.status).toBe("private_preview");
    expect(res.body.voiceGate.approvalGate).toBe("publish_social");
    expect(mockDearMeBrandBlueprintService.previewFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        handle: "Peter Studio",
        brand: expect.objectContaining({
          displayName: "Peter",
          positioning: "Known for practical AI products",
          cadence: "weekly",
          budgetMonthlyCents: 25_000,
        }),
      }),
    );
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("starts first cycle work from prepared proof sequence by creating a private issue and emitting live events", async () => {
    const { createDearMeSseBus, setDearMeSseBusForTest } = await import("../services/dearme-sse-bus.js");
    const bus = createDearMeSseBus();
    setDearMeSseBusForTest(bus);
    const events: Array<{ type: string; payload: unknown }> = [];
    bus.subscribe("company-1", (event) => events.push(event));
    const basePreview = makeFirstCycleResult();
    const preparedPreview = {
      ...basePreview,
      proofSequence: [
        {
          ...basePreview.proofSequence[0],
          summary: "Prepared profile and voice evidence are ready for review.",
          preparedArtifact: "Profile dossier + Voice profile",
          sourceLabel: "Prepared from private profile work",
        },
        {
          ...basePreview.proofSequence[1],
          summary: "Prepared audience research points at founder operators first.",
          preparedArtifact: "Audience shortlist + opportunity brief",
          sourceLabel: "Prepared from audience research",
        },
        {
          ...basePreview.proofSequence[2],
          summary: "Prepared proof packaging can become the private page review.",
          preparedArtifact: "Portfolio proof card + launch boundary",
          sourceLabel: "Prepared from portfolio proof work",
        },
      ],
    };
    const artifactOrder = [
      "0-30s Identity dossier: Profile dossier + Voice profile (Prepared from private profile work)",
      "60-120s Audience map: Audience shortlist + opportunity brief (Prepared from audience research)",
      "3-5min Private site proof: Portfolio proof card + launch boundary (Prepared from portfolio proof work)",
    ];
    mockDearMeBrandBlueprintService.prepareFirstCycleProofOutputs.mockResolvedValue(preparedPreview);
    mockIssueService.create.mockResolvedValue({
      id: "issue-first-cycle-1",
      identifier: "PET-31",
      title: "DearMe: First 5-minute proof - Known for practical AI products",
      assigneeAgentId: "agent-chief-1",
    });

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/first-cycle/start")
      .send({
        brand: {
          displayName: "Peter",
          positioning: "Known for practical AI products",
          goals: ["Build visible proof"],
          audiences: ["founders"],
          proofPoints: ["shipped local runtime"],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("first_cycle_preview");
    expect(res.body.proofSequence).toMatchObject(preparedPreview.proofSequence);
    expect(mockDearMeBrandBlueprintService.prepareFirstCycleProofOutputs).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        brand: expect.objectContaining({
          positioning: "Known for practical AI products",
          budgetMonthlyCents: 25_000,
        }),
      }),
      expect.objectContaining({
        actorType: "user",
        actorId: "user-1",
      }),
    );
    expect(mockDearMeBrandBlueprintService.previewFirstCycle).not.toHaveBeenCalled();
    expect(mockIssueService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        title: "DearMe: First 5-minute proof - Known for practical AI products",
        status: "todo",
        priority: "high",
        assigneeAgentId: "agent-chief-1",
        originKind: "dearme_first_cycle_start",
      }),
    );
    artifactOrder.forEach((artifact) => {
      expect(mockIssueService.create.mock.calls[0][1].description).toContain(artifact);
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.first_cycle_started",
        entityType: "issue",
        entityId: "issue-first-cycle-1",
        details: expect.objectContaining({
          artifactOrder,
          ahaTargetSeconds: 300,
          ahaWindow: "3-5min",
          starterDraftCount: preparedPreview.starterPosts.length,
          opportunityCount: preparedPreview.opportunityShortlist.length,
          valueReportCount: preparedPreview.valueReport.items.length,
          opportunityRoiReportCount: preparedPreview.opportunityRoiReport.items.length,
          firstOpportunityTarget: preparedPreview.opportunityShortlist[0]?.target,
          nextStep: "Review Work Ready or open the proof page; public moves still wait for the launch call.",
        }),
      }),
    );
    expect(mockQueueIssueAssignmentWakeup).toHaveBeenCalledWith(
      expect.objectContaining({
        issue: expect.objectContaining({ id: "issue-first-cycle-1" }),
        reason: "dearme_first_cycle_start",
      }),
    );
    expect(events.map((event) => event.type)).toEqual([
      "task_created",
      "thinking_stream",
      "agent_completed",
    ]);
    expect(events[0]).toMatchObject({
      type: "task_created",
      payload: expect.objectContaining({
        artifactOrder,
      }),
    });
    expect(JSON.stringify(events)).not.toContain("Paperclip");
  });

  it("keeps first cycle starts locked during trial preview", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("trial"));

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/first-cycle/start")
      .send({
        brand: {
          displayName: "Peter",
          positioning: "Known for practical AI products",
          goals: [],
          audiences: [],
          proofPoints: [],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
      });

    expect(res.status).toBe(403);
    expect(mockDearMeBrandBlueprintService.previewFirstCycle).not.toHaveBeenCalled();
    expect(mockDearMeBrandBlueprintService.prepareFirstCycleProofOutputs).not.toHaveBeenCalled();
    expect(mockIssueService.create).not.toHaveBeenCalled();
    expect(mockQueueIssueAssignmentWakeup).not.toHaveBeenCalled();
  });

  it("rejects first cycle previews outside the caller scope", async () => {
    const res = await request(await createApp({ companyIds: ["company-2"] }))
      .post("/api/dearme/companies/company-1/first-cycle/preview")
      .send({
        brand: {
          displayName: "Peter",
          positioning: "Known for practical AI products",
          goals: [],
          audiences: [],
          proofPoints: [],
          offers: [],
          voiceSamples: [],
          preferredChannels: [],
          constraints: [],
        },
      });

    expect(res.status).toBe(403);
    expect(mockDearMeBrandBlueprintService.previewFirstCycle).not.toHaveBeenCalled();
  });

  it("creates an approval-gated apply request and logs the request", async () => {
    const applyResult = {
      ...makePreviewResult(),
      status: "apply_request",
      approval: {
        id: "approval-1",
        companyId: "company-1",
        type: "dearme_brand_blueprint_apply",
        status: "pending",
        payload: {},
      },
    };
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active"));
    mockDearMeBrandBlueprintService.createApplyRequest.mockResolvedValue(applyResult);

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/brand-blueprints/apply-requests")
      .send({
        brand: {
          displayName: "Peter",
          goals: ["Build visible proof"],
          audiences: ["founders"],
          proofPoints: ["shipped local runtime"],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
        approvalNote: "Use private drafts only first.",
      });

    expect(res.status).toBe(201);
    expect(res.body.approval.id).toBe("approval-1");
    expect(mockDearMeBrandBlueprintService.createApplyRequest).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ approvalNote: "Use private drafts only first." }),
      expect.objectContaining({
        actorType: "user",
        actorId: "user-1",
        agentId: null,
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "user",
        actorId: "user-1",
        action: "dearme.brand_blueprint_apply_requested",
        entityType: "approval",
        entityId: "approval-1",
      }),
    );
  });

  it("keeps Brand OS apply requests locked during trial preview", async () => {
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("trial"));

    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/brand-blueprints/apply-requests")
      .send({
        brand: {
          displayName: "Peter",
          goals: ["Build visible proof"],
          audiences: ["founders"],
          proofPoints: ["shipped local runtime"],
          offers: [],
          voiceSamples: [],
          preferredChannels: ["linkedin"],
          constraints: [],
        },
        approvalNote: "Use private drafts only first.",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Add a paid beta credit purchase to unlock the brand team cycle.");
    expect(mockDearMeBrandBlueprintService.createApplyRequest).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "dearme.brand_blueprint_apply_requested" }),
    );
  });

  it("rejects companies outside the caller scope", async () => {
    const res = await request(await createApp({ companyIds: ["company-2"] }))
      .post("/api/dearme/companies/company-1/brand-blueprints/preview")
      .send({
        brand: {
          displayName: "Peter",
          goals: [],
          audiences: [],
          proofPoints: [],
          offers: [],
          voiceSamples: [],
          preferredChannels: [],
          constraints: [],
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This DearMe profile is not available to your account.");
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMeBrandBlueprintService.preview).not.toHaveBeenCalled();
  });

  it("rejects legacy setup payload request bodies", async () => {
    const res = await request(await createApp())
      .post("/api/dearme/companies/company-1/brand-blueprints/apply-requests")
      .send({
        setup_payload: {
          company: { name: "Legacy" },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(res.body.details).toBeUndefined();
    expectDearMeRouteErrorBodySafe(res.body);
    expect(mockDearMeBrandBlueprintService.createApplyRequest).not.toHaveBeenCalled();
  });
});
