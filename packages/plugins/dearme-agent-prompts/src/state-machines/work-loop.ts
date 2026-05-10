/**
 * Unified DearMe work-loop state machine.
 *
 * One canonical state machine that ties together what Polsia, Naive, and
 * OpenClaw each name differently. Until this file existed, each layer had
 * its own lifecycle and roles spent prompt budget translating between them.
 *
 * Mappings (this file is the contract):
 *
 *   DearMe state    Polsia choreography     Naive table/field            OpenClaw mechanism
 *   ─────────────   ─────────────────────   ──────────────────────────   ──────────────────────
 *   intake          inbound user message    issue.create (status=queued) channel inbound (ws frame)
 *   triage          ceo classify + route    chief-of-staff routine run   session-lane queue head
 *   work            specialist execute      heartbeat_run.start          agent loop run
 *   gate            approval gate           issue_approvals.pending      tool-call interception
 *   deliver         tool fires outbound     issue_work_products.write    plugin tool invocation
 *   audit           cost ledger + /live     cost_events + activity_log   stream lifecycle:end
 *   review          ceo decides next        issue.transition / next      session.followup
 *   archive         cycle close             issue.status=closed          session_history rotate
 *
 * Why a single state machine: Chief of Staff (the registry's leadership role)
 * sees ONE work item moving through 8 named states. The fact that "intake"
 * lands on OpenClaw, "work" runs on a Naive heartbeat_run, and "gate" hits
 * `issue_approvals` is integration-layer concern, not prompt-layer concern.
 *
 * Transitions enforced here are the same Polsia 4-step workflow ("plan → work
 * → review → report") expanded with Naive's gate stages and OpenClaw's
 * intake/audit endpoints.
 */

export const WORK_LOOP_STATES = [
  /** Inbound message accepted by OpenClaw channel; not yet classified. */
  "intake",
  /** Chief of Staff classified intent and selected a specialist role. */
  "triage",
  /** Specialist is executing on a Naive heartbeat_run. */
  "work",
  /** Output staged behind an approval gate (publish/send/deploy/spend). */
  "gate",
  /** User approved (or auto-approved); outbound tool fires. */
  "deliver",
  /** Cost + audit recorded; emitted to /live; voice-gate score persisted. */
  "audit",
  /** Chief of Staff reviewed the result and decided next move. */
  "review",
  /** Closed; rotated into session history; eligible for cycle learning. */
  "archive",
] as const;

export type WorkLoopState = (typeof WORK_LOOP_STATES)[number];

/**
 * Allowed forward transitions. Any transition not listed is a bug.
 *
 * Notable shortcuts:
 *  - intake → archive  (junk filter on inbound, e.g. spam DM)
 *  - triage → archive  (Chief decided "no work", e.g. duplicate inbound)
 *  - work → review     (no-gate work product, e.g. internal research; skips gate/deliver/audit)
 *  - gate → review     (user rejected; skip deliver and audit)
 */
export const WORK_LOOP_TRANSITIONS: Readonly<
  Record<WorkLoopState, ReadonlyArray<WorkLoopState>>
> = {
  intake: ["triage", "archive"],
  triage: ["work", "archive"],
  work: ["gate", "review"],
  gate: ["deliver", "review"],
  deliver: ["audit"],
  audit: ["review"],
  review: ["archive", "triage"],
  archive: [],
};

export const TERMINAL_WORK_LOOP_STATES: ReadonlyArray<WorkLoopState> = [
  "archive",
];

export function canTransitionWorkLoop(
  from: WorkLoopState,
  to: WorkLoopState,
): boolean {
  return WORK_LOOP_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Substrate bindings — read-only documentation of which substrate owns each
 * state's runtime. Plugin authors and route authors look this up to know
 * which table / channel / contract to integrate against.
 */
export interface SubstrateBinding {
  /** OpenClaw mechanism that drives or observes this state. */
  openclaw: string;
  /** Naive Drizzle table (or pseudo-table) where this state's record of truth lives. */
  naive: string;
  /** Polsia choreography step this state corresponds to. */
  polsia: string;
}

export const WORK_LOOP_SUBSTRATE_BINDINGS: Readonly<
  Record<WorkLoopState, SubstrateBinding>
> = {
  intake: {
    openclaw: "channel inbound (WhatsApp/iMessage/Telegram/etc) → Gateway WS frame",
    naive: "issues.create (status=queued, originId=channel:<id>)",
    polsia: "send_message inbound trigger",
  },
  triage: {
    openclaw: "session-lane head + chief-of-staff agent run",
    naive: "chief-of-staff routine wakeup; agent_runtime_state.lastRouted",
    polsia: "CEO 4-step workflow: classify → search_memory → choose specialist",
  },
  work: {
    openclaw: "agent.run on selected role's skill (sandbox if browser-agent)",
    naive: "heartbeat_runs.start + heartbeat_run_events stream",
    polsia: "specialist agent runtime (every_6h cycle in Polsia, on-demand here)",
  },
  gate: {
    openclaw: "tool-call interception: outbound tool blocks until approval signal",
    naive: "issue_approvals.create (kind=publish|send|deploy|spend, status=pending)",
    polsia: "4-gate review: publish, send, deploy, spend",
  },
  deliver: {
    openclaw: "outbound tool invocation (post_x / send_email / deploy_site / etc)",
    naive: "issue_work_products.create + channel_connections.lastUsedAt",
    polsia: "verified-channel publish/send action",
  },
  audit: {
    openclaw: "stream lifecycle:end event surfaces back to OpenClaw client",
    naive: "cost_events + activity_log + finance_events; voice gate score persisted on work_product",
    polsia: "cost ledger + /live social-proof feed entry",
  },
  review: {
    openclaw: "session.followup — chief-of-staff inspects result, picks next move",
    naive: "issue.transition (status=in-review → in-progress | done); decision recorded on issue_execution_decisions",
    polsia: "CEO post-execution review + queue refill (keep queue ≥ 3)",
  },
  archive: {
    openclaw: "session history rotate; skill snapshot refresh",
    naive: "issue.status=closed; cycle learning written to documents",
    polsia: "cycle close; learning fed to next every_6h cycle",
  },
};

/**
 * The 8 work-loop states, paired with the Polsia cycle stage they roll up
 * into. (Polsia ships 5 cycle stages: plan/work/review/learn/report.)
 *
 * This lets the Chief of Staff render any in-flight work in either vocabulary
 * — fine-grained 8-state for ops, coarse-grained 5-stage for the Dear-me letter.
 */
export const WORK_LOOP_TO_CYCLE_STAGE: Readonly<
  Record<WorkLoopState, "plan" | "work" | "review" | "learn" | "report">
> = {
  intake: "plan",
  triage: "plan",
  work: "work",
  gate: "review",
  deliver: "work",
  audit: "learn",
  review: "review",
  archive: "report",
};
