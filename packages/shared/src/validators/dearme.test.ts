import { describe, expect, it } from "vitest";
import {
  DEARME_BRAND_BLUEPRINT_OPERATION_ORDER,
  buildDearMeBrandBlueprintExecutionPlan,
  collectDearMeBrandBlueprintWarnings,
  createDearMeBrandBlueprint,
  createDearMeFirstCyclePreview,
  dearMeBrandBlueprintApplyPayloadSchema,
  dearMeBrandBlueprintApplyRequestSchema,
  dearMeBrandBlueprintPreviewSchema,
  dearMeFirstCyclePreviewResponseSchema,
  dearMeFirstCyclePreviewSchema,
  dearMeMemoryArchiveResultSchema,
  dearMeMemoryUpdateResultSchema,
  dearMeMemoryUpdateSchema,
  dearMeOutputContinuationRequestSchema,
  dearMeOutputReviewRequestSchema,
  dearMeOutputReviewResultSchema,
  dearMeOutputsResponseSchema,
  dearMePaidBetaRecordSchema,
  dearMePaidBetaStatusSchema,
  dearMeWorkbenchResponseSchema,
  describeDearMePaidBetaEntitlement,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
  type DearMeOutputReviewLoop,
} from "./dearme.js";

function reviewLoop(overrides: Partial<DearMeOutputReviewLoop> = {}): DearMeOutputReviewLoop {
  return {
    state: "needs_user_review",
    attemptCount: 0,
    maxAttempts: 3,
    isRetriable: true,
    lastAction: null,
    lastDecisionAt: null,
    lastDecisionNotePreview: null,
    nextStep: "Review it, then approve, request changes, ask for another pass, or choose a new direction.",
    reviewHandoff: null,
    ...overrides,
  };
}

describe("DearMe brand blueprint contract", () => {
  it("creates a Brand OS blueprint with team roles, gates, and executable operations", () => {
    const preview = dearMeBrandBlueprintPreviewSchema.parse({
      brand: {
        displayName: "Peter",
        positioning: "Builder of local AI products",
        goals: ["Turn shipping proof into clear public content"],
        audiences: ["Founders evaluating local AI workflows"],
        proofPoints: ["Shipped an autonomous local agent runtime"],
        offers: ["Paid beta for personal brand growth"],
        voiceSamples: ["Direct, specific, evidence-backed writing.", "Short notes with concrete next steps."],
        preferredChannels: ["linkedin", "portfolio"],
      },
    });

    const blueprint = createDearMeBrandBlueprint(preview.brand);
    const summary = summarizeDearMeBrandBlueprint(blueprint);
    const executionPlan = buildDearMeBrandBlueprintExecutionPlan(blueprint);

    expect(blueprint.brand.displayName).toBe("Peter");
    expect(blueprint.voiceProfile.status).toBe("ready_for_gate");
    expect(blueprint.team.map((member) => member.role)).toEqual([
      "chief_of_staff",
      "brand_strategist",
      "voice_editor",
      "content_producer",
      "opportunity_scout",
      "portfolio_builder",
      "growth_analyst",
    ]);
    expect(blueprint.gates.map((gate) => gate.kind)).toContain("publish_social");
    expect(executionPlan.operations.map((operation) => operation.id)).toEqual(
      DEARME_BRAND_BLUEPRINT_OPERATION_ORDER,
    );
    expect(executionPlan.operations.find((operation) => operation.id === "schedule_weekly_report")).toEqual(
      expect.objectContaining({
        title: "Draft weekly Dear me report",
        description: expect.stringContaining("private weekly report"),
      }),
    );
    expect(summary.title).toBe("Create Brand OS for Peter");
  });

  it("creates a 90-second first cycle preview from one positioning answer", () => {
    const previewInput = dearMeFirstCyclePreviewSchema.parse({
      brand: {
        displayName: "Peter",
        positioning: "Known for turning AI research into practical local products",
        goals: ["Turn shipping proof into clear public content"],
        audiences: ["Founders evaluating local AI workflows"],
        proofPoints: ["Shipped an autonomous local product that customers can run"],
        offers: ["Paid beta for personal brand growth"],
        voiceSamples: ["Direct, specific, evidence-backed writing.", "Short notes with concrete next steps."],
        preferredChannels: ["linkedin", "portfolio"],
      },
    });

    const firstCycle = createDearMeFirstCyclePreview("company-1", previewInput);

    expect(firstCycle.status).toBe("first_cycle_preview");
    expect(firstCycle.prompt).toBe("What do you want to become known for?");
    expect(firstCycle.voiceProfile.title).toBe("Draft Voice Profile");
    expect(firstCycle.starterPosts).toHaveLength(3);
    expect(firstCycle.starterPosts.map((post) => post.approvalGate)).toEqual([
      "publish_social",
      "publish_social",
      "publish_social",
    ]);
    expect(firstCycle.opportunityLead.approvalGate).toBe("send_email");
    expect(firstCycle.portfolioProofCard.approvalGate).toBe("deploy_public_site");
    expect(firstCycle.growthPlan.approvalGate).toBe("public_claim");
    expect(firstCycle.voiceGate.status).toBe("ready_for_review");
    expect(firstCycle.voiceGate.approvalGate).toBe("publish_social");
    expect(firstCycle.approvalBoundary.label).toBe("Ready to launch, with you in control");
    expect(firstCycle.approvalBoundary.summary).toContain("one launch decision");

    const serialized = JSON.stringify(firstCycle).toLocaleLowerCase();
    for (const hiddenTerm of ["provider", "adapter", "setup_payload", "mcp", "paperclip", "openclaw"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
  });

  it("evaluates Voice Gate v0 before public content moves", () => {
    const result = evaluateDearMeVoiceGate({
      brand: {
        displayName: "Peter",
        positioning: "Known for practical AI products",
        goals: ["Build visible proof"],
        audiences: ["founders"],
        proofPoints: [],
        offers: [],
        voiceSamples: ["Short operator note."],
        preferredChannels: ["x"],
        constraints: [],
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
      artifact: {
        kind: "content_draft",
        channel: "x",
        title: "Launch draft",
        text: "Excited to announce a game-changing one-stop shop for personal brands. ".repeat(6),
      },
    });

    expect(result.status).toBe("blocked_before_public");
    expect(result.approvalGate).toBe("publish_social");
    expect(result.blockedActions).toContain("Publish social posts");
    expect(result.checks.find((check) => check.kind === "voice_samples")).toMatchObject({ status: "warn" });
    expect(result.checks.find((check) => check.kind === "generic_launch_copy")).toMatchObject({ status: "warn" });
    expect(result.checks.find((check) => check.kind === "proof_claim")).toMatchObject({ status: "block" });
    expect(result.checks.find((check) => check.kind === "channel_length")).toMatchObject({ status: "block" });
    expect(result.score).toBeLessThan(100);
  });

  it("rejects first cycle previews with substrate-shaped fields", () => {
    const firstCycle = createDearMeFirstCyclePreview("company-1", {
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
        cadence: "weekly",
        budgetMonthlyCents: 25_000,
        autoDraftEnabled: true,
      },
    });

    expect(() =>
      dearMeFirstCyclePreviewSchema.parse({
        brand: firstCycle,
        setup_payload: {},
      }),
    ).toThrow();
    expect(() =>
      dearMeFirstCyclePreviewResponseSchema.parse({
        ...firstCycle,
        starterPosts: [
          {
            ...firstCycle.starterPosts[0]!,
            provider: "codex-local",
          },
          firstCycle.starterPosts[1],
          firstCycle.starterPosts[2],
        ],
      }),
    ).toThrow();
  });

  it("accepts the approval payload needed to apply a generated Brand OS blueprint", () => {
    const blueprint = createDearMeBrandBlueprint({
      displayName: "Peter",
      goals: ["Build visible proof"],
      audiences: ["founders"],
      proofPoints: ["Shipped a local agent runtime"],
      offers: ["paid beta"],
      voiceSamples: ["Direct and precise.", "Evidence first."],
      preferredChannels: ["linkedin"],
      constraints: ["No public posts without approval"],
      cadence: "weekly",
      budgetMonthlyCents: 25_000,
      autoDraftEnabled: true,
    });
    const summary = summarizeDearMeBrandBlueprint(blueprint);
    const executionPlan = buildDearMeBrandBlueprintExecutionPlan(blueprint);

    const payload = dearMeBrandBlueprintApplyPayloadSchema.parse({
      title: summary.title,
      summary: summary.summary,
      recommendedAction: summary.recommendedAction,
      nextActionOnApproval: summary.nextActionOnApproval,
      risks: blueprint.gates.map((gate) => `${gate.label}: ${gate.reason}`),
      approvalNote: "Private drafts first.",
      brandBlueprint: blueprint,
      executionPlan,
    });

    expect(payload.brandBlueprint.team).toHaveLength(7);
    expect(payload.autoDraftEnabled).toBe(true);
    expect(payload.executionPlan.operations.map((operation) => operation.id)).toEqual(
      DEARME_BRAND_BLUEPRINT_OPERATION_ORDER,
    );
  });

  it("keeps risky external actions gated and warns when key inputs are missing", () => {
    const blueprint = createDearMeBrandBlueprint({
      goals: [],
      audiences: [],
      proofPoints: [],
      offers: [],
      voiceSamples: [],
      preferredChannels: [],
      constraints: [],
      cadence: "weekly",
      budgetMonthlyCents: 0,
      autoDraftEnabled: true,
    });

    expect(blueprint.gates.every((gate) => gate.mode === "approval_required")).toBe(true);
    expect(collectDearMeBrandBlueprintWarnings(blueprint)).toEqual([
      "Voice profile needs at least two samples before tone should be trusted.",
      "No preferred channels were selected; DearMe will draft privately until channels are chosen.",
      "No proof points were supplied; the first cycle should collect proof before public claims.",
    ]);
  });

  it("rejects legacy setup payload shapes", () => {
    expect(() =>
      dearMeBrandBlueprintApplyRequestSchema.parse({
        setup_payload: {
          company: { name: "Legacy" },
        },
      }),
    ).toThrow();
  });

  it("normalizes paid beta payment records for the finance ledger", () => {
    const record = dearMePaidBetaRecordSchema.parse({
      amountCents: 25_000,
      currency: "usd",
      description: "Founding beta payment",
      externalInvoiceId: "",
      occurredAt: "2026-05-07T14:00:00.000Z",
    });

    expect(record).toEqual({
      amountCents: 25_000,
      currency: "USD",
      description: "Founding beta payment",
      externalInvoiceId: null,
      occurredAt: "2026-05-07T14:00:00.000Z",
    });
  });

  it("rejects unpaid or non-credit paid beta records", () => {
    expect(() =>
      dearMePaidBetaRecordSchema.parse({
        amountCents: 0,
        currency: "USD",
      }),
    ).toThrow();
    expect(() =>
      dearMePaidBetaRecordSchema.parse({
        amountCents: 25_000,
        currency: "USDT",
      }),
    ).toThrow();
  });

  it("describes paid beta status without exposing billing infrastructure", () => {
    const status = dearMePaidBetaStatusSchema.parse({
      companyId: "company-1",
      status: "active",
      lifetimePaidCents: 25_000,
      refundedCents: 0,
      netPaidCents: 25_000,
      remainingCreditCents: 25_000,
      eventCount: 1,
      latestPaymentAt: "2026-05-07T14:00:00.000Z",
      latestPaymentDescription: "Founding beta payment",
      latestExternalInvoiceId: "stripe-invoice-manual",
      entitlement: describeDearMePaidBetaEntitlement("active"),
      cycleGuardrail: {
        state: "ready",
        label: "Guardrails ready",
        headline: "Private cycles can run within guardrails",
        summary: "DearMe checks monthly private spend before work runs so prepared moves stay predictable.",
        spendCents: 0,
        budgetCents: 25_000,
        utilizationPercent: 0,
        remainingCreditCents: 25_000,
        decisionRequired: false,
        decisionLabel: null,
      },
    });
    const trialEntitlement = describeDearMePaidBetaEntitlement("trial");

    expect(status.status).toBe("active");
    expect(status.remainingCreditCents).toBe(25_000);
    expect(status.entitlement.canRequestBrandOsApproval).toBe(true);
    expect(trialEntitlement.canRequestBrandOsApproval).toBe(false);
    expect(trialEntitlement.nextActionLabel).toBe("Record paid beta payment");
  });

  it("normalizes Voice & Memory updates for private brand memory", () => {
    const update = dearMeMemoryUpdateSchema.parse({
      kind: "voice_sample",
      title: " Operator note ",
      body: " Short, specific proof. ",
      sourceLabel: " Manual note ",
    });

    expect(update).toEqual({
      kind: "voice_sample",
      sourceInputMode: "paste",
      title: "Operator note",
      body: "Short, specific proof.",
      sourceLabel: "Manual note",
    });
    expect(dearMeMemoryUpdateSchema.parse({
      kind: "proof_point",
      sourceInputMode: "link",
      body: "Shipped the first private growth cycle.",
      sourceLabel: "https://example.com/proof",
    })).toEqual({
      kind: "proof_point",
      sourceInputMode: "link",
      title: null,
      body: "Shipped the first private growth cycle.",
      sourceLabel: "https://example.com/proof",
    });
    expect(dearMeMemoryUpdateSchema.safeParse({
      kind: "proof_point",
      sourceInputMode: "link",
      body: "Shipped the first private growth cycle.",
      sourceLabel: "ftp://example.com/proof",
    }).success).toBe(false);
    expect(dearMeMemoryUpdateSchema.safeParse({
      kind: "proof_point",
      sourceInputMode: "link",
      body: "Shipped the first private growth cycle.",
    }).success).toBe(false);
    expect(dearMeMemoryUpdateResultSchema.parse({
      companyId: "company-1",
      status: "recorded",
      memory: {
        id: "memory-1",
        kind: "voice_sample",
        sourceInputMode: "import_note",
        title: "Operator note",
        body: "Short, specific proof.",
        bodyPreview: "Short, specific proof.",
        sourceLabel: "Manual note",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 2,
      },
    }).memory.sourceInputMode).toBe("import_note");
    expect(dearMeMemoryArchiveResultSchema.parse({
      companyId: "company-1",
      status: "archived",
      memoryId: "memory-1",
      archivedAt: "2026-05-07T14:05:00.000Z",
      growthCycles: {
        checked: 2,
        updated: 1,
        unchanged: 1,
        memorySources: 1,
      },
    }).status).toBe("archived");
    expect(() => dearMeMemoryUpdateSchema.parse({
      kind: "agent_config",
      body: "Expose runtime internals",
    })).toThrow();
  });

  it("describes customer-visible DearMe outputs without provider internals", () => {
    const response = dearMeOutputsResponseSchema.parse({
      companyId: "company-1",
      outputs: [
        {
          id: "issue-1:weekly_report",
          companyId: "company-1",
          kind: "weekly_report",
          title: "Dear me report",
          summary: "The private weekly report.",
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
              bodyPreview: "Completed work and decisions needed.",
              updatedAt: "2026-05-07T14:00:00.000Z",
            },
          ],
          workProducts: [
            {
              id: "work-product-1",
              type: "draft",
              title: "Content draft batch",
              url: null,
              status: "ready",
              reviewState: "pending",
              summary: "Three private drafts prepared for review.",
              updatedAt: "2026-05-07T14:00:00.000Z",
            },
          ],
          latestUpdate: {
            id: "comment-1",
            bodyPreview: "Prepared the weekly report.",
            createdAt: "2026-05-07T14:00:00.000Z",
          },
          reviewLoop: reviewLoop(),
          details: [
            {
              kind: "completed_work",
              label: "Completed work",
              value: "Prepared the weekly report.",
              source: "document",
            },
            {
              kind: "decisions_needed",
              label: "Decisions needed",
              value: "Review the next public claims before publishing.",
              source: "derived",
            },
          ],
          sourceEvidence: [
            {
              kind: "proof",
              label: "Proof used",
              summary: "Prepared the weekly report.",
              source: "document",
            },
            {
              kind: "approval_boundary",
              label: "Approval boundary",
              summary: "Review the next public claims before publishing.",
              source: "derived",
            },
            {
              kind: "private_reference",
              label: "Private references",
              summary: "1 private reference and 1 prepared artifact used for this review.",
              source: "document",
            },
          ],
        },
      ],
    });

    const output = response.outputs[0]!;
    const workProduct = output.workProducts[0]!;

    expect(output.kind).toBe("weekly_report");
    expect(output.details[0]).toEqual(expect.objectContaining({
      kind: "completed_work",
      label: "Completed work",
    }));
    expect(workProduct).not.toHaveProperty("provider");
    expect(() =>
      dearMeOutputsResponseSchema.parse({
        ...response,
        outputs: [
          {
            ...output,
            workProducts: [
              {
                ...workProduct,
                provider: "codex-local",
              },
            ],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      dearMeOutputsResponseSchema.parse({
        ...response,
        outputs: [
          {
            ...output,
            details: [
              {
                kind: "completed_work",
                label: "Completed work",
                value: "Prepared the weekly report.",
                source: "provider",
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("describes output review decisions without substrate fields", () => {
    const request = dearMeOutputReviewRequestSchema.parse({
      action: "regenerate",
      decisionNote: "",
    });
    expect(request).toEqual({ action: "regenerate", decisionNote: null });

    const continuation = dearMeOutputContinuationRequestSchema.parse({
      intent: "prepare_another_pass",
      decisionNote: "  Make it sharper before review.  ",
    });
    expect(continuation).toEqual({
      intent: "prepare_another_pass",
      decisionNote: "Make it sharper before review.",
    });

    const output = dearMeOutputsResponseSchema.parse({
      companyId: "company-1",
      outputs: [
        {
          id: "issue-1:weekly_report",
          companyId: "company-1",
          kind: "weekly_report",
          title: "Dear me report",
          summary: "The private weekly report.",
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
              bodyPreview: "Completed work and decisions needed.",
              updatedAt: "2026-05-07T14:00:00.000Z",
            },
          ],
          workProducts: [
            {
              id: "work-product-1",
              type: "draft",
              title: "Content draft batch",
              url: null,
              status: "ready",
              reviewState: "pending",
              summary: "Three private drafts prepared for review.",
              updatedAt: "2026-05-07T14:00:00.000Z",
            },
          ],
          latestUpdate: null,
          reviewLoop: reviewLoop({
            state: "regeneration_requested",
            attemptCount: 1,
            lastAction: "regenerate",
            lastDecisionAt: "2026-05-07T14:00:00.000Z",
            lastDecisionNotePreview: "Make it sharper.",
            nextStep: "Your team has your direction and should prepare another version.",
            reviewHandoff: {
              action: "regenerate",
              title: "Regeneration brief captured",
              summary: "DearMe will keep this direction attached to the next private draft.",
              userDirection: "Make it sharper.",
              nextDraftDirection: "Prepare a stronger replacement before asking for approval again.",
            },
          }),
          details: [],
          sourceEvidence: [],
        },
      ],
    }).outputs[0]!;
    expect(output.reviewLoop.reviewHandoff).toEqual(expect.objectContaining({
      action: "regenerate",
      userDirection: "Make it sharper.",
      nextDraftDirection: expect.stringContaining("replacement"),
    }));
    const result = dearMeOutputReviewResultSchema.parse({
      companyId: "company-1",
      outputId: "issue-1:weekly_report",
      action: "regenerate",
      status: "queued",
      comment: {
        id: "comment-1",
        bodyPreview: "DearMe decision: regenerate this prepared work before review.",
        createdAt: "2026-05-07T14:00:00.000Z",
      },
      output,
    });

    expect(result.status).toBe("queued");
    const serialized = JSON.stringify(result).toLowerCase();
    for (const hiddenTerm of ["provider", "adapter", "paperclip", "openclaw", "setup_payload"]) {
      expect(serialized).not.toContain(hiddenTerm);
    }
    expect(() => dearMeOutputReviewRequestSchema.parse({ action: "publish" })).toThrow();
    expect(() =>
      dearMeOutputReviewResultSchema.parse({
        ...result,
        output: {
          ...output,
          workProducts: [
            {
              ...output.workProducts[0]!,
              provider: "codex-local",
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("describes the team workbench as approval-ready customer state", () => {
    const response = dearMeWorkbenchResponseSchema.parse({
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
      ],
      activeWork: [
        {
          id: "issue-2:opportunity_drafts",
          title: "Opportunity leads",
          summary: "Warm collaboration and customer leads are being prepared.",
          status: "working",
          ownerRole: "opportunity_scout",
          outputKind: "opportunity_drafts",
          issueId: "issue-2",
          issueIdentifier: "PET-8",
          updatedAt: "2026-05-07T14:00:00.000Z",
          reviewLoop: reviewLoop({ state: "fresh", nextStep: "Your team is preparing this privately." }),
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
          reviewLoop: reviewLoop(),
        },
      ],
      decisionsNeeded: [
        {
          id: "approval:approval-1",
          kind: "approve_brand_os",
          title: "Approve Brand OS for Peter",
          summary: "Review the first growth-team plan before private work starts.",
          riskGate: null,
          status: "pending",
          outputKind: null,
          approvalId: "approval-1",
          issueId: null,
          issueIdentifier: null,
          updatedAt: "2026-05-07T14:00:00.000Z",
          reviewLoop: null,
        },
      ],
      batchDecisions: [
        {
          id: "batch:review",
          title: "Review prepared work",
          summary: "1 item is ready. DearMe prepared the work; approval still controls the external move.",
          actionLabel: "Review work",
          action: "review_work",
          riskGate: null,
          itemCount: 1,
          decisionIds: ["approval:approval-1"],
          issueIds: [],
          approvalIds: ["approval-1"],
          updatedAt: "2026-05-07T14:00:00.000Z",
        },
      ],
      recentProgress: [
        {
          id: "activity-1",
          kind: "brand_os_applied",
          title: "Growth team created",
          summary: "DearMe created the team, cycles, Brand OS documents, and first private work lanes.",
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
        sourcePlan: {
          status: "building",
          summary: "Voice & Memory is building coverage. Next: add one more real writing sample.",
          nextSourceKind: "voice_sample",
          required: [
            {
              kind: "voice_sample",
              label: "Writing samples",
              status: "partial",
              count: 1,
              target: 2,
              nextAction: "Add real posts, notes, transcripts, or approved drafts that already sound like the user.",
            },
            {
              kind: "proof_point",
              label: "Proof points",
              status: "partial",
              count: 1,
              target: 2,
              nextAction: "Add shipped work, results, receipts, metrics, or customer proof future drafts can cite.",
            },
          ],
        },
        sourceReviewQueue: [
          {
            id: "source-review:memory-2",
            sourceMemoryId: "memory-2",
            sourceInputMode: "link",
            sourceTitle: "Shipped proof",
            sourceLabel: "https://example.com/proof",
            summary: "Private link saved for proof point: shipped work should support the launch narrative.",
            proposedKind: "proof_point",
            proposedTitle: "Shipped proof",
            proposedBody: "Shipped work should support the launch narrative.",
            nextAction: "Review this proof point and save the fact once it is ready for future private work.",
            createdAt: "2026-05-07T13:00:00.000Z",
          },
        ],
        latest: [
          {
            id: "memory-1",
            kind: "voice_sample",
            title: "Operator note",
            body: "Short, direct writing sample.",
            bodyPreview: "Short, direct writing sample.",
            sourceLabel: "Manual note",
            createdAt: "2026-05-07T14:00:00.000Z",
          },
          {
            id: "memory-2",
            kind: "proof_point",
            title: "Shipped proof",
            body: "Shipped a working local agent product.",
            bodyPreview: "Shipped a working local agent product.",
            sourceLabel: null,
            createdAt: "2026-05-07T13:00:00.000Z",
          },
        ],
      },
      workStream: [
        {
          id: "decision:approval:approval-1",
          kind: "decision_needed",
          cycleStage: "review",
          role: "brand_strategist",
          title: "Your call: Approve Brand OS for Peter",
          summary: "Review the first growth-team plan before private work starts.",
          artifact: "Brand OS",
          status: "decision_needed",
          needsApproval: true,
          sourceLabel: "Approval queue",
          costImpact: null,
          nextAction: "Approve Brand OS only if the first cycle and approval boundaries match how you want to be represented.",
          relatedOutputId: null,
          issueId: null,
          issueIdentifier: null,
          approvalId: "approval-1",
          createdAt: "2026-05-07T14:00:00.000Z",
          reviewLoop: null,
        },
      ],
      runLedger: [
        {
          id: "ledger:decision:approval:approval-1",
          kind: "needs_decision",
          role: "brand_strategist",
          title: "Your call: Approve Brand OS for Peter",
          summary: "Review the first growth-team plan before private work starts.",
          evidenceLabel: "Approval queue / Brand OS",
          status: "decision_needed",
          needsApproval: true,
          nextAction: "Approve Brand OS only if the first cycle and approval boundaries match how you want to be represented.",
          relatedOutputId: null,
          issueId: null,
          issueIdentifier: null,
          approvalId: "approval-1",
          createdAt: "2026-05-07T14:00:00.000Z",
        },
        {
          id: "ledger:memory:memory-1",
          kind: "learned",
          role: "voice_editor",
          title: "Operator note",
          summary: "Short, direct writing sample.",
          evidenceLabel: "Manual note",
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
        summary: "The private weekly report.",
        status: "ready_for_review",
        outputId: "issue-1:weekly_report",
        issueId: "issue-1",
        issueIdentifier: "PET-7",
        bodyPreview: "Completed work and decisions needed.",
        accomplished: ["Cycle check-in completed and prepared the first private work."],
        decisions: ["Approve Brand OS before any public-facing move starts."],
        learnings: ["Voice Editor has one direct writing sample to learn from."],
        nextBets: ["Review the prepared work and sharpen the next audience bet."],
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
            summary: "Plan, work, review, learn, and report across 1 roles, 2 work lanes, and 1 decisions.",
            role: "chief_of_staff",
            status: "decisions_needed",
            source: "cycle",
            relatedOutputId: null,
            issueId: null,
            approvalId: null,
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
          {
            id: "decision:approval:approval-1",
            kind: "decision",
            label: "Approve Brand OS for Peter",
            summary: "Review the first growth-team plan before private work starts.",
            role: "brand_strategist",
            status: "pending",
            source: "decision",
            relatedOutputId: null,
            issueId: null,
            approvalId: "approval-1",
            updatedAt: "2026-05-07T14:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "requires_decision:cycle:weekly-growth-loop->decision:approval:approval-1",
            kind: "requires_decision",
            fromNodeId: "cycle:weekly-growth-loop",
            toNodeId: "decision:approval:approval-1",
            label: "needs your decision",
          },
        ],
      },
      outputs: [],
    });

    expect(response.team[0]!.role).toBe("chief_of_staff");
    expect(response.decisionsNeeded[0]!.approvalId).toBe("approval-1");
    expect(response.batchDecisions[0]).toEqual(expect.objectContaining({
      actionLabel: "Review work",
      approvalIds: ["approval-1"],
    }));
    expect(response.memory).toEqual(expect.objectContaining({
      sourceCount: 2,
      voiceSampleCount: 1,
      proofCount: 1,
      sourcePlan: expect.objectContaining({
        status: "building",
        nextSourceKind: "voice_sample",
      }),
      sourceReviewQueue: [
        expect.objectContaining({
          sourceMemoryId: "memory-2",
          sourceInputMode: "link",
          proposedKind: "proof_point",
        }),
      ],
    }));
    expect(response.workStream[0]).toEqual(expect.objectContaining({
      kind: "decision_needed",
      cycleStage: "review",
      role: "brand_strategist",
      status: "decision_needed",
      needsApproval: true,
      sourceLabel: "Approval queue",
      nextAction: expect.stringContaining("Approve Brand OS"),
    }));
    expect(response.runLedger.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining(["needs_decision", "learned"]),
    );
    expect(response.runLedger[0]).toEqual(expect.objectContaining({
      evidenceLabel: "Approval queue / Brand OS",
      needsApproval: true,
    }));
    expect(response.actionGraph.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(["cycle", "decision"]),
    );
    expect(response.actionGraph.edges[0]).toEqual(expect.objectContaining({
      kind: "requires_decision",
      label: "needs your decision",
    }));
    expect(() =>
      dearMeWorkbenchResponseSchema.parse({
        ...response,
        team: [
          {
            ...response.team[0]!,
            provider: "codex-local",
          },
        ],
      }),
    ).toThrow();
  });
});
