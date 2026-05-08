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
  dearMeOutputReviewRequestSchema,
  dearMeOutputReviewResultSchema,
  dearMeOutputsResponseSchema,
  dearMePaidBetaRecordSchema,
  dearMePaidBetaStatusSchema,
  dearMeWorkbenchResponseSchema,
  describeDearMePaidBetaEntitlement,
  evaluateDearMeVoiceGate,
  summarizeDearMeBrandBlueprint,
} from "./dearme.js";

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
    expect(firstCycle.approvalBoundary.summary).toContain("Nothing publishes");

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
    });
    const trialEntitlement = describeDearMePaidBetaEntitlement("trial");

    expect(status.status).toBe("active");
    expect(status.remainingCreditCents).toBe(25_000);
    expect(status.entitlement.canRequestBrandOsApproval).toBe(true);
    expect(trialEntitlement.canRequestBrandOsApproval).toBe(false);
    expect(trialEntitlement.nextActionLabel).toBe("Record paid beta payment");
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
          details: [],
        },
      ],
    }).outputs[0]!;
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
      summary: "7 team members are assigned to your brand loop. 2 items ready. 1 decision needed. 1 lane in motion.",
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
      workStream: [
        {
          id: "decision:approval:approval-1",
          role: "brand_strategist",
          title: "Your call: Approve Brand OS for Peter",
          summary: "Review the first growth-team plan before private work starts.",
          artifact: "Brand OS",
          status: "decision_needed",
          needsApproval: true,
          relatedOutputId: null,
          issueId: null,
          issueIdentifier: null,
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
        updatedAt: "2026-05-07T14:00:00.000Z",
      },
      outputs: [],
    });

    expect(response.team[0]!.role).toBe("chief_of_staff");
    expect(response.decisionsNeeded[0]!.approvalId).toBe("approval-1");
    expect(response.batchDecisions[0]).toEqual(expect.objectContaining({
      actionLabel: "Review work",
      approvalIds: ["approval-1"],
    }));
    expect(response.workStream[0]).toEqual(expect.objectContaining({
      role: "brand_strategist",
      status: "decision_needed",
      needsApproval: true,
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
