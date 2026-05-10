import { describe, expect, it } from "vitest";
import {
  AD_ERROR_STATES,
  AD_PERFORMANCE_RULES,
  APPROVAL_GATES,
  APPROVAL_GATE_CONFIG,
  BRAND_SITE_BUILDER_PROMPT,
  BROWSER_AGENT_PROMPT,
  BUDGET_TIERS,
  CHIEF_OF_STAFF_PROMPT,
  CHIEF_OF_STAFF_ROLE,
  CONTENT_PRODUCER_PROMPT,
  DEARME_CYCLE_STAGE_IDS,
  DEARME_ROLE_REGISTRY,
  DEARME_ROLE_SEEDS,
  DEARME_SIX_HOUR_CYCLE_CRON,
  DEARME_SIX_HOUR_CYCLE_STAGES,
  DEARME_SIX_HOUR_GROWTH_ROUTINE,
  MODEL_ROUTING_TABLE,
  MOOD_FACE_LIBRARY,
  OPPORTUNITY_HUNTER_PROMPT,
  OPPORTUNITY_STATES,
  OUTBOUND_5_TOUCH,
  SORA_UGC_VIDEO_TEMPLATE,
  SSE_EVENT_TYPES,
  WORK_LOOP_STATES,
  WORK_LOOP_SUBSTRATE_BINDINGS,
  WORK_LOOP_TO_CYCLE_STAGE,
  canTransitionOpportunity,
  canTransitionWorkLoop,
  getMoodFace,
  getRoleSeed,
  getRoleSpec,
  getRolesByGroup,
  getShippedRoles,
  getSubstrateDistribution,
  pickBudgetTier,
  pickModelForComplexity,
  renderDearMeSixHourCycleIssue,
  renderSoraUgcVideoPrompt,
  resolveApproval,
  validateRegistry,
} from "./index.js";

describe("dearme-agent-prompts package", () => {
  it("opportunity state machine forbids backwards transitions", () => {
    expect(canTransitionOpportunity("pending", "drafted")).toBe(true);
    expect(canTransitionOpportunity("drafted", "sent")).toBe(true);
    expect(canTransitionOpportunity("completed", "drafted")).toBe(false);
    expect(canTransitionOpportunity("dead", "pending")).toBe(false);
    expect(canTransitionOpportunity("sent", "pending")).toBe(false);
  });

  it("opportunity state machine covers terminal states with no outgoing edges", () => {
    expect(canTransitionOpportunity("completed", "declined")).toBe(false);
    expect(canTransitionOpportunity("declined", "dead")).toBe(false);
  });

  it("opportunity state list is exactly the 8 documented states", () => {
    expect(OPPORTUNITY_STATES).toEqual([
      "pending",
      "drafted",
      "sent",
      "replied",
      "confirmed",
      "completed",
      "declined",
      "dead",
    ]);
  });

  it("ad error states cover the 5 documented values", () => {
    expect(AD_ERROR_STATES.length).toBe(5);
    expect(AD_ERROR_STATES).toContain("with_issues");
    expect(AD_ERROR_STATES).toContain("disapproved");
  });

  it("ad performance rules cover the 4 documented tiers", () => {
    expect(AD_PERFORMANCE_RULES.map((rule) => rule.tier)).toEqual([
      "healthy",
      "mediocre",
      "underperforming",
      "delivery_failed",
    ]);
  });

  it("budget tier picker honors thresholds at the boundaries", () => {
    expect(pickBudgetTier(5).id).toBe("starter");
    expect(pickBudgetTier(10).id).toBe("starter");
    expect(pickBudgetTier(11).id).toBe("growth");
    expect(pickBudgetTier(30).id).toBe("growth");
    expect(pickBudgetTier(31).id).toBe("scale");
    expect(pickBudgetTier(1_000).id).toBe("scale");
    expect(BUDGET_TIERS.length).toBe(3);
  });

  it("mood library has at least the curated 16 faces and lookup works", () => {
    expect(MOOD_FACE_LIBRARY.length).toBeGreaterThanOrEqual(16);
    expect(getMoodFace("expr-curious")?.displayName).toBe("Curious");
    expect(getMoodFace("not-a-real-slug")).toBeUndefined();
  });

  it("model routing covers 1-10 with three tiers", () => {
    expect(pickModelForComplexity(1).tier).toBe("fast");
    expect(pickModelForComplexity(3).tier).toBe("fast");
    expect(pickModelForComplexity(4).tier).toBe("balanced");
    expect(pickModelForComplexity(6).tier).toBe("balanced");
    expect(pickModelForComplexity(7).tier).toBe("deep");
    expect(pickModelForComplexity(10).tier).toBe("deep");
    expect(pickModelForComplexity(99).tier).toBe("deep");
    expect(pickModelForComplexity(-5).tier).toBe("fast");
    expect(MODEL_ROUTING_TABLE.length).toBe(3);
  });

  it("SSE event names are stable and include the 14 documented types (7 v1 + 7 tri-substrate v2)", () => {
    expect(SSE_EVENT_TYPES).toEqual([
      // v1 baseline (Polsia /live + Naive activity_log)
      "sync",
      "thinking_stream",
      "thinking_stream_delta",
      "dashboard_action",
      "task_created",
      "task_updated",
      "agent_completed",
      // v2 tri-substrate additions (DM-S06 — work-loop / approvals / OpenClaw passthrough)
      "work_loop_transition",
      "approval_pending",
      "approval_resolved",
      "voice_gate_scored",
      "channel_action_fired",
      "cost_recorded",
      "openclaw_lifecycle",
      "openclaw_stream",
    ]);
  });

  it("role seed registry exposes all 12 ported production roles", () => {
    expect(DEARME_ROLE_SEEDS.map((seed) => seed.role)).toEqual([
      "chief-of-staff",
      "reporting",
      "content-producer",
      "opportunity-hunter",
      "brand-site-builder",
      "research-agent",
      "audience-care",
      "data-analyst",
      "health-monitor",
      "chat",
      "browser-agent",
      "ads-manager",
    ]);
    expect(getRoleSeed(CHIEF_OF_STAFF_ROLE)?.prompt).toBe(
      CHIEF_OF_STAFF_PROMPT,
    );
    expect(DEARME_ROLE_SEEDS.length).toBe(12);
  });

  it("prompts preserve production-seeded hard rules and DearMe boundaries", () => {
    // Chief of Staff: 4-step workflow + 200-word email cap
    expect(CHIEF_OF_STAFF_PROMPT).toContain("WORKFLOW (Complete in Order)");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("MONITOR");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("REVIEW");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("QUEUE MANAGEMENT");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("REPORT");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("Under 200 words total");
    expect(CHIEF_OF_STAFF_PROMPT).toContain(
      "ALWAYS maintain queue ≥ 3 tasks",
    );

    // Content Producer: private review packet + Voice Gate + no public action.
    expect(CONTENT_PRODUCER_PROMPT).toContain("private review packet");
    expect(CONTENT_PRODUCER_PROMPT).toContain("Voice Gate score");
    expect(CONTENT_PRODUCER_PROMPT).toContain("Do not publish, send, schedule");
    expect(CONTENT_PRODUCER_PROMPT).toContain("If the packet is not saved");
    expect(CONTENT_PRODUCER_PROMPT).toContain(
      "NEVER reveal client relationships",
    );
    expect(CONTENT_PRODUCER_PROMPT).not.toMatch(/Paperclip|OpenClaw|Symphony|adapter|provider|setup payload|setup_payload|model|runtime/i);

    // Opportunity Hunter: private opportunity packets + 8-state machine.
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain("Your Daily Workflow");
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain(
      "pending → drafted → sent → replied → confirmed → completed",
    );
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain("draft only until the user approves the send");
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain("5 touches max");
    expect(OPPORTUNITY_HUNTER_PROMPT).not.toMatch(/Hunter\.io|get_leads|add_lead|contacted → responded → meeting/i);
  });

  it("Sora UGC template renders with vars", () => {
    const rendered = renderSoraUgcVideoPrompt({
      age: 32,
      gender: "woman",
      personalityTrait: "calm and curious",
      setting: "Coffee shop near the window",
      dialogue: "I built my brand site overnight with DearMe. Try it.",
    });
    expect(rendered).toContain("32-year-old woman");
    expect(rendered).toContain("Coffee shop near the window");
    expect(rendered).toContain("No subtitles");
    expect(SORA_UGC_VIDEO_TEMPLATE).toContain("{{dialogue}}");
  });

  it("5-touch outbound sequence has the 5 documented day offsets", () => {
    expect(OUTBOUND_5_TOUCH.map((t) => t.dayOffset)).toEqual([
      1, 3, 6, 10, 14,
    ]);
  });

  it("six-hour growth routine uses the inherited routine contract shape", () => {
    expect(DEARME_SIX_HOUR_GROWTH_ROUTINE).toMatchObject({
      routineKey: "dearme.growth-cycle.six-hour",
      assigneeRef: { resourceKind: "agent", resourceKey: "chief-of-staff" },
      status: "active",
      priority: "high",
      concurrencyPolicy: "coalesce_if_active",
      catchUpPolicy: "skip_missed",
      issueTemplate: { surfaceVisibility: "default" },
    });
    expect(DEARME_SIX_HOUR_GROWTH_ROUTINE.triggers).toEqual([
      {
        kind: "schedule",
        label: "Every six hours",
        enabled: true,
        cronExpression: DEARME_SIX_HOUR_CYCLE_CRON,
        timezone: "America/New_York",
      },
    ]);
  });

  it("six-hour cycle stages match the customer-visible work loop", () => {
    expect(DEARME_CYCLE_STAGE_IDS).toEqual([
      "plan",
      "work",
      "review",
      "learn",
      "report",
    ]);
    expect(DEARME_SIX_HOUR_CYCLE_STAGES.map((stage) => stage.ownerRole)).toEqual([
      "chief-of-staff",
      "content-producer",
      "chief-of-staff",
      "growth-analyst",
      "chief-of-staff",
    ]);
  });

  it("six-hour cycle issue renderer produces private customer-safe instructions", () => {
    const rendered = renderDearMeSixHourCycleIssue({
      brandName: "Peter",
      dayNumber: 3,
      focus: "Turn yesterday's proof into a LinkedIn draft and outreach shortlist.",
      recentSignals: ["Two voice samples are ready.", "Budget is 42% used."],
      budgetStatus: "warn",
    });

    expect(rendered).toContain("Run the six-hour DearMe growth cycle for Peter.");
    expect(rendered).toContain("Budget status: warning");
    expect(rendered).toContain("Turn yesterday's proof");
    expect(rendered).toContain("Do not publish, send, deploy, spend");
    expect(rendered).toContain('short "Dear me" report under 200 words');
    expect(rendered).not.toMatch(/Polsia|Naive|Paperclip|adapter|runtime/i);
  });

  it("DEARME_ROLE_REGISTRY contains the same 12 roles as DEARME_ROLE_SEEDS", () => {
    expect(DEARME_ROLE_REGISTRY.length).toBe(12);
    const registryRoles = DEARME_ROLE_REGISTRY.map((spec) => spec.role).sort();
    const seedRoles = DEARME_ROLE_SEEDS.map((seed) => seed.role).sort();
    expect(registryRoles).toEqual(seedRoles);
  });

  it("registry exposes well-formed metadata for every role", () => {
    const result = validateRegistry();
    expect(result).toEqual({ ok: true, problems: [] });
  });

  it("registry pins each prompt to a non-trivial char count", () => {
    for (const spec of DEARME_ROLE_REGISTRY) {
      expect(spec.promptSourceChars).toBeGreaterThan(800);
      expect(spec.promptSourceChars).toBe(spec.prompt.length);
    }
  });

  it("getRoleSpec / getRolesByGroup / getShippedRoles work as documented", () => {
    expect(getRoleSpec(CHIEF_OF_STAFF_ROLE)?.displayName).toBe("Chief of Staff");
    expect(getRoleSpec("not-a-real-role")).toBeUndefined();
    expect(getRolesByGroup("growth").map((s) => s.role)).toEqual([
      "content-producer",
      "opportunity-hunter",
      "ads-manager",
    ]);
    expect(getRolesByGroup("leadership").map((s) => s.role)).toEqual([
      "chief-of-staff",
      "reporting",
    ]);
    expect(getShippedRoles().length).toBe(0);
  });

  it("each role declares only state machines / templates / tools that exist", () => {
    const validStateMachines = new Set([
      "opportunity-state",
      "meta-ads",
      "budget-tier",
      "mood-face-library",
      "model-routing",
      "sse-events",
      "work-loop",
      "approval-gates",
    ]);
    const validTemplates = new Set(["sora-ugc-video", "outbound-5-touch"]);
    const validProxyTools = new Set([
      "create_task",
      "search_memory",
      "get_company_documents",
      "create_report",
      "web_search",
      "content_generate",
    ]);
    for (const spec of DEARME_ROLE_REGISTRY) {
      for (const sm of spec.stateMachines) {
        expect(validStateMachines.has(sm)).toBe(true);
      }
      for (const tpl of spec.templates) {
        expect(validTemplates.has(tpl)).toBe(true);
      }
      for (const tool of spec.proxyTools) {
        expect(validProxyTools.has(tool)).toBe(true);
      }
    }
  });

  it("keeps browser and chief prompts on DearMe channel rails", () => {
    expect(BROWSER_AGENT_PROMPT).not.toMatch(/Twitter|Twitter MCP|Twitter agent/i);
    expect(CHIEF_OF_STAFF_PROMPT).not.toMatch(/\btweets?\b|dearme_infra MCP|Twitter/i);
    expect(BRAND_SITE_BUILDER_PROMPT).not.toMatch(/dearme_infra/i);
    expect(BROWSER_AGENT_PROMPT).toContain("channel-specific publishing gate");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("social content");
    expect(BRAND_SITE_BUILDER_PROMPT).toContain("approved internal deployment logs");
  });

  it("work-loop has 8 states and Polsia-cycle rollup covers all of them", () => {
    expect(WORK_LOOP_STATES).toEqual([
      "intake",
      "triage",
      "work",
      "gate",
      "deliver",
      "audit",
      "review",
      "archive",
    ]);
    for (const state of WORK_LOOP_STATES) {
      expect(WORK_LOOP_TO_CYCLE_STAGE[state]).toBeDefined();
      expect(WORK_LOOP_SUBSTRATE_BINDINGS[state].openclaw.length).toBeGreaterThan(0);
      expect(WORK_LOOP_SUBSTRATE_BINDINGS[state].naive.length).toBeGreaterThan(0);
      expect(WORK_LOOP_SUBSTRATE_BINDINGS[state].polsia.length).toBeGreaterThan(0);
    }
  });

  it("work-loop transitions enforce no-reverse and shortcuts", () => {
    expect(canTransitionWorkLoop("intake", "triage")).toBe(true);
    expect(canTransitionWorkLoop("intake", "archive")).toBe(true);
    expect(canTransitionWorkLoop("triage", "work")).toBe(true);
    expect(canTransitionWorkLoop("work", "gate")).toBe(true);
    expect(canTransitionWorkLoop("work", "review")).toBe(true);
    expect(canTransitionWorkLoop("gate", "deliver")).toBe(true);
    expect(canTransitionWorkLoop("gate", "review")).toBe(true);
    expect(canTransitionWorkLoop("deliver", "audit")).toBe(true);
    expect(canTransitionWorkLoop("audit", "review")).toBe(true);
    expect(canTransitionWorkLoop("review", "archive")).toBe(true);
    // Reverse and bypass should be rejected
    expect(canTransitionWorkLoop("triage", "intake")).toBe(false);
    expect(canTransitionWorkLoop("archive", "triage")).toBe(false);
    expect(canTransitionWorkLoop("work", "deliver")).toBe(false);
    expect(canTransitionWorkLoop("intake", "work")).toBe(false);
  });

  it("approval gates: spend hard-rejects on cap, voice-gated rejects below floor, auto-approves after threshold", () => {
    expect(APPROVAL_GATES).toEqual(["publish", "send", "deploy", "spend"]);
    expect(APPROVAL_GATE_CONFIG.spend.autoApproveAfter).toBe(Number.POSITIVE_INFINITY);
    expect(APPROVAL_GATE_CONFIG.publish.voiceGateRequired).toBe(true);
    expect(APPROVAL_GATE_CONFIG.deploy.voiceGateRequired).toBe(false);

    const baseReq = {
      issueId: "iss_1",
      toolName: "post_x",
      channel: "x",
      estimatedUsd: 0,
      voiceGateScore: 95,
      reason: "first publish",
      createdAt: new Date().toISOString(),
    };

    // publish below voice floor -> rejected
    expect(
      resolveApproval(
        { ...baseReq, gate: "publish", voiceGateScore: 70 },
        { pastApprovedCount: 99, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("rejected");

    // publish above floor with > autoApproveAfter -> approved
    expect(
      resolveApproval(
        { ...baseReq, gate: "publish" },
        { pastApprovedCount: 99, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("approved");

    // first publish (count = 0) -> pending even if voice OK
    expect(
      resolveApproval(
        { ...baseReq, gate: "publish" },
        { pastApprovedCount: 0, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("pending");

    // spend over cap -> rejected
    expect(
      resolveApproval(
        { ...baseReq, gate: "spend", estimatedUsd: 10 },
        { pastApprovedCount: 99, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("rejected");

    // spend under cap -> always pending (never auto)
    expect(
      resolveApproval(
        { ...baseReq, gate: "spend", estimatedUsd: 1 },
        { pastApprovedCount: 99, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("pending");

    // deploy after autoApproveAfter:1 with no voice required -> approved
    expect(
      resolveApproval(
        { ...baseReq, gate: "deploy", voiceGateScore: null },
        { pastApprovedCount: 1, dailyUsdSpent: 0, dailyUsdCap: 5, minVoiceGateScore: 92 },
      ).decision,
    ).toBe("approved");
  });

  it("substrate distribution: 12 roles across 3 substrates with leadership shells + cron drivers", () => {
    const dist = getSubstrateDistribution();
    const totalOpenclaw = Object.values(dist.openclaw).reduce((a, b) => a + b, 0);
    const totalNaive = Object.values(dist.naive).reduce((a, b) => a + b, 0);
    const totalPolsia = Object.values(dist.polsia).reduce((a, b) => a + b, 0);
    expect(totalOpenclaw).toBe(12);
    expect(totalNaive).toBe(12);
    expect(totalPolsia).toBe(12);
    // Two session-shell roles (chief-of-staff + chat) own the user-facing surface
    expect(dist.openclaw["session-shell"]).toBe(2);
    // Two cron-driven roles (reporting + health-monitor)
    expect(dist.openclaw["cron-driven"]).toBe(2);
    // One sandbox-non-main role (browser-agent)
    expect(dist.openclaw["sandbox-non-main"]).toBe(1);
    // The remaining 7 are skill-call
    expect(dist.openclaw["skill-call"]).toBe(7);
  });
});
