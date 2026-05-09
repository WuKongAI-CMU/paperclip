/**
 * DearMe six-hour growth cycle seed.
 *
 * Domain: personal-brand growth-team loops that plan, draft, review, learn,
 * and report without exposing donor product names or runtime implementation.
 */

export const DEARME_SIX_HOUR_CYCLE_KEY = "dearme.growth-cycle.six-hour";
export const DEARME_SIX_HOUR_CYCLE_CRON = "0 */6 * * *";
export const DEARME_SIX_HOUR_CYCLE_TIMEZONE = "America/New_York";

export const DEARME_CYCLE_STAGE_IDS = [
  "plan",
  "work",
  "review",
  "learn",
  "report",
] as const;

export type DearMeCycleStageId = (typeof DEARME_CYCLE_STAGE_IDS)[number];
export type DearMeCycleRole =
  | "chief-of-staff"
  | "content-producer"
  | "opportunity-hunter"
  | "brand-site-builder"
  | "growth-analyst";

export interface DearMeCycleStage {
  id: DearMeCycleStageId;
  ownerRole: DearMeCycleRole;
  objective: string;
  acceptance: string;
}

export const DEARME_SIX_HOUR_CYCLE_STAGES: ReadonlyArray<DearMeCycleStage> = [
  {
    id: "plan",
    ownerRole: "chief-of-staff",
    objective: "Pick the highest-leverage private move for this cycle from current goals, replies, budget, and memory.",
    acceptance: "One concrete work lane is selected with owner, artifact, risk boundary, and proof requirement.",
  },
  {
    id: "work",
    ownerRole: "content-producer",
    objective: "Produce reviewable private work instead of another plan.",
    acceptance: "At least one draft, shortlist, portfolio update, or research artifact exists in a reviewable surface.",
  },
  {
    id: "review",
    ownerRole: "chief-of-staff",
    objective: "Separate what can continue privately from what needs the user's launch call.",
    acceptance: "Every publish, send, spend, deploy, public-claim, sensitive-material, or deletion step is held behind review.",
  },
  {
    id: "learn",
    ownerRole: "growth-analyst",
    objective: "Update the next cycle from voice, proof, reply, audience, and budget signals.",
    acceptance: "A learning note names the signal, source, and how it changes the next private bet.",
  },
  {
    id: "report",
    ownerRole: "chief-of-staff",
    objective: "Write the short Dear me update for the user.",
    acceptance: "The update states what shipped this cycle, what decision is needed, and tomorrow's first move.",
  },
] as const;

export interface DearMeManagedRoutineDeclaration {
  routineKey: typeof DEARME_SIX_HOUR_CYCLE_KEY;
  title: string;
  description: string;
  assigneeRef: { resourceKind: "agent"; resourceKey: "chief-of-staff" };
  status: "active";
  priority: "high";
  concurrencyPolicy: "coalesce_if_active";
  catchUpPolicy: "skip_missed";
  triggers: ReadonlyArray<{
    kind: "schedule";
    label: string;
    enabled: true;
    cronExpression: typeof DEARME_SIX_HOUR_CYCLE_CRON;
    timezone: typeof DEARME_SIX_HOUR_CYCLE_TIMEZONE;
  }>;
  issueTemplate: {
    surfaceVisibility: "default";
    originId: string;
    billingCode: string;
  };
}

export const DEARME_SIX_HOUR_GROWTH_ROUTINE: DearMeManagedRoutineDeclaration = {
  routineKey: DEARME_SIX_HOUR_CYCLE_KEY,
  title: "DearMe six-hour growth cycle",
  description: [
    "Run the private DearMe growth cycle: plan, work, review, learn, and report.",
    "The cycle should keep useful private work moving while holding public, outbound, spend, deploy, sensitive-material, public-claim, and deletion steps behind review.",
  ].join(" "),
  assigneeRef: { resourceKind: "agent", resourceKey: "chief-of-staff" },
  status: "active",
  priority: "high",
  concurrencyPolicy: "coalesce_if_active",
  catchUpPolicy: "skip_missed",
  triggers: [
    {
      kind: "schedule",
      label: "Every six hours",
      enabled: true,
      cronExpression: DEARME_SIX_HOUR_CYCLE_CRON,
      timezone: DEARME_SIX_HOUR_CYCLE_TIMEZONE,
    },
  ],
  issueTemplate: {
    surfaceVisibility: "default",
    originId: "dearme:growth-cycle:six-hour",
    billingCode: "dearme:growth-cycle:six-hour",
  },
};

export interface DearMeCycleIssueContext {
  brandName: string;
  dayNumber?: number;
  focus?: string | null;
  recentSignals?: ReadonlyArray<string>;
  budgetStatus?: "inside_budget" | "warn" | "hard_stop";
}

function bulletLines(values: ReadonlyArray<string>) {
  if (values.length === 0) return "- No new signal supplied.";
  return values.map((value) => `- ${value}`).join("\n");
}

export function renderDearMeSixHourCycleIssue(input: DearMeCycleIssueContext): string {
  const budgetInstruction =
    input.budgetStatus === "hard_stop"
      ? "Budget status: hard stop. Pause spend-positive work first, then report what is paused."
      : input.budgetStatus === "warn"
        ? "Budget status: warning. Keep private work moving, but avoid new spend until review."
        : "Budget status: inside budget. Continue private planning, drafting, review, learning, and reporting.";

  return [
    `Run the six-hour DearMe growth cycle for ${input.brandName}.`,
    "",
    input.dayNumber ? `Dear me day: ${input.dayNumber}` : "Dear me day: not assigned yet.",
    `Focus: ${input.focus?.trim() || "Pick the highest-leverage private move from current goals and memory."}`,
    budgetInstruction,
    "",
    "Cycle stages:",
    ...DEARME_SIX_HOUR_CYCLE_STAGES.map(
      (stage) => `- ${stage.id}: ${stage.objective} Acceptance: ${stage.acceptance}`,
    ),
    "",
    "Recent signals:",
    bulletLines(input.recentSignals ?? []),
    "",
    "Operating boundary:",
    "- Create reviewable private work, not another abstract plan.",
    "- Do not publish, send, deploy, spend, connect channels, use sensitive material, make public claims, or delete existing work.",
    "- If one of those moves is the right next step, prepare the launch decision and keep the risky action paused.",
    "",
    "Output:",
    '- A private artifact or decision queue update, plus a short "Dear me" report under 200 words.',
  ].join("\n");
}
