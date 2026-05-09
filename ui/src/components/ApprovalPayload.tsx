import { UserPlus, Lightbulb, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { formatCents } from "../lib/utils";
import type { ReactNode } from "react";
import type {
  DearMeBrandBlueprint,
  DearMeBrandBlueprintApplyPayload,
  DearMeBrandBlueprintExecutionPlan,
} from "@paperclipai/shared";

export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  budget_override_required: "Budget Override",
  request_board_approval: "Board Approval",
  dearme_brand_blueprint_apply: "Brand OS",
};

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function approvalSubject(payload?: Record<string, unknown> | null): string | null {
  return firstNonEmptyString(
    payload?.title,
    payload?.name,
    payload?.summary,
    payload?.recommendedAction,
  );
}

/** Build a contextual label for an approval, e.g. "Hire Agent: Designer" */
export function approvalLabel(type: string, payload?: Record<string, unknown> | null): string {
  const base = typeLabel[type] ?? type;
  const subject = approvalSubject(payload);
  if (subject) {
    return `${base}: ${subject}`;
  }
  return base;
}

export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  budget_override_required: ShieldAlert,
  request_board_approval: ShieldCheck,
  dearme_brand_blueprint_apply: Sparkles,
};

export const defaultTypeIcon = ShieldCheck;

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

function approvalRunMethodLabel(value: unknown): string {
  if (typeof value !== "string") return "Configured runtime";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Configured runtime";
  if (
    normalized === "claude_local" ||
    normalized === "codex_local" ||
    normalized === "cursor_local" ||
    normalized === "gemini_local" ||
    normalized === "opencode_local" ||
    normalized === "pi_local" ||
    normalized === "acpx_local"
  ) {
    return "Local workspace";
  }
  if (normalized === "openclaw_gateway") return "Remote gateway";
  if (normalized === "http") return "Webhook";
  if (normalized === "process") return "Local process";
  return "Configured runtime";
}

function SkillList({ values }: { values: unknown }) {
  if (!Array.isArray(values)) return null;
  const items = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Skills</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HireAgentPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Name</span>
        <span className="font-medium">{String(payload.name ?? "-")}</span>
      </div>
      <PayloadField label="Role" value={payload.role} />
      <PayloadField label="Title" value={payload.title} />
      <PayloadField label="Icon" value={payload.icon} />
      {!!payload.capabilities && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Capabilities</span>
          <span className="text-muted-foreground">{String(payload.capabilities)}</span>
        </div>
      )}
      {!!payload.adapterType && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Run method</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {approvalRunMethodLabel(payload.adapterType)}
          </span>
        </div>
      )}
      <SkillList values={payload.desiredSkills} />
    </div>
  );
}

export function CeoStrategyPayload({ payload }: { payload: Record<string, unknown> }) {
  const plan = payload.plan ?? payload.description ?? payload.strategy ?? payload.text;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <PayloadField label="Title" value={payload.title} />
      {!!plan && (
        <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
          {String(plan)}
        </div>
      )}
      {!plan && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function BudgetOverridePayload({ payload }: { payload: Record<string, unknown> }) {
  const budgetAmount = typeof payload.budgetAmount === "number" ? payload.budgetAmount : null;
  const observedAmount = typeof payload.observedAmount === "number" ? payload.observedAmount : null;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <PayloadField label="Scope" value={payload.scopeName ?? payload.scopeType} />
      <PayloadField label="Window" value={payload.windowKind} />
      <PayloadField label="Metric" value={payload.metric} />
      {(budgetAmount !== null || observedAmount !== null) ? (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Limit {budgetAmount !== null ? formatCents(budgetAmount) : "-"} - Observed {observedAmount !== null ? formatCents(observedAmount) : "-"}
        </div>
      ) : null}
      {!!payload.guidance && (
        <p className="text-muted-foreground">{String(payload.guidance)}</p>
      )}
    </div>
  );
}

export function BoardApprovalPayload({
  payload,
  hideTitle = false,
}: {
  payload: Record<string, unknown>;
  hideTitle?: boolean;
}) {
  const nextPayload = hideTitle ? { ...payload, title: undefined } : payload;
  return (
    <BoardApprovalPayloadContent payload={nextPayload} />
  );
}

function BoardApprovalPayloadContent({ payload }: { payload: Record<string, unknown> }) {
  const risks = Array.isArray(payload.risks)
    ? payload.risks
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const title = firstNonEmptyString(payload.title);
  const summary = firstNonEmptyString(payload.summary);
  const recommendedAction = firstNonEmptyString(payload.recommendedAction);
  const nextActionOnApproval = firstNonEmptyString(payload.nextActionOnApproval);
  const proposedComment = firstNonEmptyString(payload.proposedComment);

  return (
    <div className="mt-4 space-y-3.5 text-sm">
      {title && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Title</p>
          <p className="font-medium leading-6 text-foreground">{title}</p>
        </div>
      )}
      {summary && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Summary</p>
          <p className="leading-6 text-foreground/90">{summary}</p>
        </div>
      )}
      {recommendedAction && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
            Recommended action
          </p>
          <p className="mt-1 leading-6 text-foreground">{recommendedAction}</p>
        </div>
      )}
      {nextActionOnApproval && (
        <div className="rounded-lg border border-border/60 bg-background/60 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">On approval</p>
          <p className="mt-1 leading-6 text-foreground">{nextActionOnApproval}</p>
        </div>
      )}
      {risks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Risks</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {risks.map((risk) => (
              <li key={risk} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                <span className="leading-6">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {proposedComment && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Proposed comment
          </p>
          <pre className="max-h-48 overflow-auto rounded-lg border border-border/60 bg-muted/50 px-3.5 py-3 font-mono text-xs leading-5 text-muted-foreground whitespace-pre-wrap">
            {proposedComment}
          </pre>
        </div>
      )}
    </div>
  );
}

function stringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readableKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function DearMeMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DearMeSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function DearMeList({
  values,
  empty,
}: {
  values: string[];
  empty: string;
}) {
  if (values.length === 0) {
    return <p className="text-sm leading-6 text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-1 text-sm text-foreground/90">
      {values.map((value) => (
        <li key={value} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          <span className="leading-6">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function DearMeTagList({ values }: { values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
        >
          {readableKey(value)}
        </span>
      ))}
    </div>
  );
}

function voiceStatusLabel(status: DearMeBrandBlueprint["voiceProfile"]["status"]) {
  if (status === "ready_for_gate") return "Voice ready";
  return "Needs samples";
}

function DearMeBrandSummary({ blueprint }: { blueprint: DearMeBrandBlueprint }) {
  return (
    <div className="space-y-4">
      <DearMeSection title="Brand position">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-3">
          <p className="text-sm font-medium leading-6 text-foreground">{blueprint.brand.displayName}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{blueprint.brand.positioning}</p>
        </div>
      </DearMeSection>
      <div className="grid gap-4 md:grid-cols-2">
        <DearMeSection title="Goals">
          <DearMeList values={blueprint.brand.goals} empty="No goals supplied yet." />
        </DearMeSection>
        <DearMeSection title="Audiences">
          <DearMeList values={blueprint.brand.audiences} empty="No audiences supplied yet." />
        </DearMeSection>
        <DearMeSection title="Proof">
          <DearMeList values={blueprint.brand.proofPoints} empty="Proof collection is part of the first cycle." />
        </DearMeSection>
        <DearMeSection title="Offers">
          <DearMeList values={blueprint.brand.offers} empty="Offers can be added after Brand OS creation." />
        </DearMeSection>
      </div>
      <DearMeSection title="Channels and constraints">
        <div className="space-y-2">
          <DearMeTagList values={blueprint.brand.preferredChannels} />
          <DearMeList values={blueprint.brand.constraints} empty="No extra constraints supplied." />
        </div>
      </DearMeSection>
    </div>
  );
}

function DearMeTeamSummary({ team }: { team: DearMeBrandBlueprint["team"] }) {
  return (
    <div className="space-y-2">
      {team.map((member, index) => (
        <div key={`${member.role}:${index}`} className="rounded-lg border border-border/60 bg-background/60 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{member.name}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {readableKey(member.role)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{member.mission}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground/80">Boundary:</span> {member.approvalBoundary}
          </p>
        </div>
      ))}
    </div>
  );
}

function DearMeExecutionSummary({
  executionPlan,
}: {
  executionPlan: DearMeBrandBlueprintExecutionPlan;
}) {
  return (
    <div className="space-y-2">
      {executionPlan.operations.map((operation) => (
        <div key={operation.id} className="rounded-lg border border-border/60 bg-background/60 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{operation.title}</p>
            {operation.approvalGate ? (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                Approval: {readableKey(operation.approvalGate)}
              </span>
            ) : (
              <span className="rounded-full border border-green-500/25 bg-green-500/10 px-2 py-0.5 text-[11px] text-green-700 dark:text-green-300">
                Private setup
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{operation.description}</p>
        </div>
      ))}
    </div>
  );
}

export function DearMeBrandBlueprintPayload({
  payload,
  hideTitle = false,
}: {
  payload: Record<string, unknown>;
  hideTitle?: boolean;
}) {
  const typedPayload = payload as Partial<DearMeBrandBlueprintApplyPayload>;
  const blueprint = typedPayload.brandBlueprint;
  const executionPlan = typedPayload.executionPlan;

  if (!blueprint || !executionPlan) {
    return <BoardApprovalPayload payload={payload} hideTitle={hideTitle} />;
  }

  const risks = stringList(typedPayload.risks);
  const title = firstNonEmptyString(typedPayload.title);
  const summary = firstNonEmptyString(typedPayload.summary);
  const recommendedAction = firstNonEmptyString(typedPayload.recommendedAction);
  const nextActionOnApproval = firstNonEmptyString(typedPayload.nextActionOnApproval);
  const approvalNote = firstNonEmptyString(typedPayload.approvalNote);

  return (
    <div className="mt-4 space-y-5 text-sm">
      {!hideTitle && title && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Title</p>
          <p className="font-medium leading-6 text-foreground">{title}</p>
        </div>
      )}
      {summary && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
            DearMe will create
          </p>
          <p className="mt-1 leading-6 text-foreground">{summary}</p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <DearMeMetric label="Growth team" value={blueprint.team.length} />
        <DearMeMetric label="Cycles" value={blueprint.cycles.length} />
        <DearMeMetric label="Approval gates" value={blueprint.gates.length} />
        <DearMeMetric label="Memory seeds" value={blueprint.memorySeeds.length} />
        <DearMeMetric label="Monthly budget" value={formatCents(blueprint.budgetPolicy.monthlyCents)} />
        <DearMeMetric label="Voice" value={voiceStatusLabel(blueprint.voiceProfile.status)} />
      </div>
      {recommendedAction && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
            Review before approving
          </p>
          <p className="mt-1 leading-6 text-foreground">{recommendedAction}</p>
        </div>
      )}
      {nextActionOnApproval && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-green-700 dark:text-green-300">
            On approval
          </p>
          <p className="mt-1 leading-6 text-foreground">{nextActionOnApproval}</p>
        </div>
      )}
      {approvalNote && (
        <DearMeSection title="User note">
          <p className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-3 leading-6 text-foreground/90">
            {approvalNote}
          </p>
        </DearMeSection>
      )}
      <DearMeBrandSummary blueprint={blueprint} />
      <DearMeSection title="Growth team">
        <DearMeTeamSummary team={blueprint.team} />
      </DearMeSection>
      <DearMeSection title="First operations">
        <DearMeExecutionSummary executionPlan={executionPlan} />
      </DearMeSection>
      {risks.length > 0 && (
        <DearMeSection title="Approval gates that remain active">
          <DearMeList values={risks} empty="No risks supplied." />
        </DearMeSection>
      )}
    </div>
  );
}

export function ApprovalPayloadRenderer({
  type,
  payload,
  hidePrimaryTitle = false,
}: {
  type: string;
  payload: Record<string, unknown>;
  hidePrimaryTitle?: boolean;
}) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  if (type === "budget_override_required") return <BudgetOverridePayload payload={payload} />;
  if (type === "request_board_approval") {
    return <BoardApprovalPayload payload={payload} hideTitle={hidePrimaryTitle} />;
  }
  if (type === "dearme_brand_blueprint_apply") {
    return <DearMeBrandBlueprintPayload payload={payload} hideTitle={hidePrimaryTitle} />;
  }
  return <CeoStrategyPayload payload={payload} />;
}
