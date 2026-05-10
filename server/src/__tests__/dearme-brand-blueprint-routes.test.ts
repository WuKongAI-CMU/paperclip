import express from "express";
import request from "supertest";
import { describeDearMePaidBetaEntitlement } from "@paperclipai/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDearMeBrandBlueprintService = vi.hoisted(() => ({
  preview: vi.fn(),
  previewFirstCycle: vi.fn(),
  prepareFirstCycleProofOutputs: vi.fn(),
  createApplyRequest: vi.fn(),
}));

const mockDearMePaidBetaAccessService = vi.hoisted(() => ({
  getAccess: vi.fn(),
  recordPayment: vi.fn(),
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

async function createApp(actorOverrides: Record<string, unknown> = {}) {
  const [{ errorHandler }, { dearmeRoutes }] = await Promise.all([
    import("../middleware/index.js"),
    import("../routes/dearme.js"),
  ]);
  const app = express();
  app.use(express.json());
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
  app.use("/api/dearme", dearmeRoutes({} as any));
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
      title: "Create Brand OS for Peter",
      summary: "DearMe will prepare the first Brand OS.",
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
    ],
    proofSequence: [
      {
        window: "0-30s",
        title: "Identity dossier",
        summary: "Peter is positioned around practical AI products.",
        preparedArtifact: "Voice profile and known-for line",
        sourceLabel: "Prepared from private Brand OS work",
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
      title: "First opportunity lead",
      target: "Founders",
      whyRelevant: "Founders care about the first goal.",
      outreachAngle: "Lead with proof.",
      draftMessage: "Private outreach draft.",
      ownerRole: "opportunity_scout",
      approvalGate: "send_email",
    },
    portfolioProofCard: {
      title: "Portfolio proof card",
      proofSource: "The first verified work example",
      proposedCopy: "Private proof card copy.",
      placement: "Homepage proof section",
      ownerRole: "portfolio_builder",
      approvalGate: "deploy_public_site",
    },
    growthPlan: {
      title: "First growth plan",
      summary: "Start with one positioning decision.",
      priorities: ["Approve positioning", "Review starter posts", "Decide on outreach"],
      nextActions: ["Check tone", "Prepare posts", "Keep outreach private"],
      ownerRole: "chief_of_staff",
      approvalGate: "public_claim",
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
          id: "queue-next-private-pass",
          title: "Queue the next private pass",
          phase: "report",
          ownerRole: "chief_of_staff",
          summary: "Write the first plan and next actions so the team can continue privately after the preview.",
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
    mockDearMePaidBetaAccessService.recordPayment.mockReset();
    mockDearMePaidBetaAccessService.getAccess.mockResolvedValue(makePaidBetaStatus("active"));
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
          nextAction: "Review it, then launch, request changes, ask for another pass, or mark it not useful.",
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
          nextAction: "Review it, then launch, request changes, ask for another pass, or mark it not useful.",
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
    expect(res.body.nextStep).toContain("Launch Brand OS");
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
    expect(res.body.error).toBe("Add a paid beta credit purchase to unlock the private Brand OS cycle.");
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
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.output_approved",
        entityType: "issue_comment",
        entityId: "comment-1",
      }),
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
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "dearme.output_marked_not_useful",
        entityType: "issue_comment",
        entityId: "comment-2",
      }),
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
    expect(mockLogActivity).toHaveBeenCalledWith(
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
    expect(mockDearMePaidBetaAccessService.recordPayment).not.toHaveBeenCalled();
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
    expect(res.body.summary.title).toBe("Create Brand OS for Peter");
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
    expect(res.body.starterPosts).toHaveLength(3);
    expect(res.body.proofSequence.map((step: { title: string }) => step.title)).toEqual([
      "Identity dossier",
      "Audience map",
      "Private site proof",
    ]);
    expect(res.body.opportunityLead.approvalGate).toBe("send_email");
    expect(res.body.voiceGate.approvalGate).toBe("publish_social");
    expect(mockDearMeBrandBlueprintService.previewFirstCycle).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
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
          summary: "Prepared Brand OS and voice evidence are ready for review.",
          preparedArtifact: "Brand OS dossier + Voice profile",
          sourceLabel: "Prepared from private Brand OS work",
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
      "0-30s Identity dossier: Brand OS dossier + Voice profile (Prepared from private Brand OS work)",
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
    expect(res.body.error).toBe("Add a paid beta credit purchase to unlock the private Brand OS cycle.");
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
    expect(mockDearMeBrandBlueprintService.createApplyRequest).not.toHaveBeenCalled();
  });
});
