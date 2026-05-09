import { describe, expect, it } from "vitest";
import {
  AD_ERROR_STATES,
  AD_PERFORMANCE_RULES,
  BUDGET_TIERS,
  CHIEF_OF_STAFF_PROMPT,
  CHIEF_OF_STAFF_ROLE,
  CONTENT_PRODUCER_PROMPT,
  DEARME_ROLE_SEEDS,
  MODEL_ROUTING_TABLE,
  MOOD_FACE_LIBRARY,
  OPPORTUNITY_HUNTER_PROMPT,
  OPPORTUNITY_STATES,
  OUTBOUND_5_TOUCH,
  SORA_UGC_VIDEO_TEMPLATE,
  SSE_EVENT_TYPES,
  canTransitionOpportunity,
  getMoodFace,
  getRoleSeed,
  pickBudgetTier,
  pickModelForComplexity,
  renderSoraUgcVideoPrompt,
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

  it("SSE event names are stable and include the 7 documented types", () => {
    expect(SSE_EVENT_TYPES).toEqual([
      "sync",
      "thinking_stream",
      "thinking_stream_delta",
      "dashboard_action",
      "task_created",
      "task_updated",
      "agent_completed",
    ]);
  });

  it("role seed registry exposes the 3 P0 roles", () => {
    expect(DEARME_ROLE_SEEDS.map((seed) => seed.role)).toEqual([
      "chief-of-staff",
      "content-producer",
      "opportunity-hunter",
    ]);
    expect(getRoleSeed(CHIEF_OF_STAFF_ROLE)?.prompt).toBe(
      CHIEF_OF_STAFF_PROMPT,
    );
  });

  it("prompts contain the documented hard rules", () => {
    expect(CHIEF_OF_STAFF_PROMPT).toContain("4-Step Workflow");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("Dear me, day [N]");
    expect(CHIEF_OF_STAFF_PROMPT).toContain("under 200 words");
    expect(CONTENT_PRODUCER_PROMPT).toContain("Voice Gate");
    expect(CONTENT_PRODUCER_PROMPT).toContain("match_score < 0.7");
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain("Daily Workflow");
    expect(OPPORTUNITY_HUNTER_PROMPT).toContain(
      "pending → drafted → sent → replied → confirmed → completed",
    );
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
});
