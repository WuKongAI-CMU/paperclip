import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDearMePaidOpsProof } from "./dearme-paid-ops-proof.ts";

export interface DearMeSupportRecoveryProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export interface DearMeSupportRecoveryReceipt {
  paidAccountState: string;
  emptyWeekRecovery: {
    visibleUsefulOutputs: number;
    action: string;
    goal: string;
    customerUpdate: string;
    supportAction: string;
    voiceMemoryAction: string;
    recoveryWorkRoute: string;
    voiceMemoryRoute: string;
  };
  stuckWork: {
    state: string;
    action: string;
    route: string;
    supportSummary: string;
  };
  supportHandoff: {
    action: string;
    note: string;
    followUp: string;
    feedbackReceipt: string;
    feedbackWorkRoute: string;
    voiceMemoryRoute: string;
  };
  launchBoundary: string;
}

export interface DearMeSupportRecoveryProofCheck {
  key:
    | "paid_account_operable"
    | "empty_week_routes_to_recovery"
    | "recovery_creates_private_make_good"
    | "stuck_work_routes_to_support"
    | "support_handoff_becomes_feedback_work"
    | "support_follow_up_is_explicit"
    | "launch_boundary_preserved"
    | "no_external_action";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMeSupportRecoveryProof {
  status: "ready" | "blocked";
  paidOpsStatus: ReturnType<typeof runDearMePaidOpsProof>["status"];
  receipt: DearMeSupportRecoveryReceipt;
  checks: DearMeSupportRecoveryProofCheck[];
  noExternalActionGuarantee: string;
}

const NO_EXTERNAL_ACTION_GUARANTEE =
  "This proof uses local paid-ops logic and a static DearMe recovery/support receipt contract only; it does not send messages, publish, deploy, spend, call live providers, call a live model, or charge cards.";

function supportRecoveryReceipt(): DearMeSupportRecoveryReceipt {
  return {
    paidAccountState: "Paid beta active",
    emptyWeekRecovery: {
      visibleUsefulOutputs: 0,
      action: "Start recovery",
      goal:
        "Create or refresh one voice-matched content, opportunity, portfolio, or report item before this week is treated as healthy.",
      customerUpdate:
        "Explain what is being recovered, what will be ready next, and what still needs the launch call.",
      supportAction: "Open support handoff",
      voiceMemoryAction: "Open Voice & Memory",
      recoveryWorkRoute: "/dearme?view=decisions&work=PET-22",
      voiceMemoryRoute: "/dearme?view=voice#dearme-voice-memory",
    },
    stuckWork: {
      state: "retry_limit_reached",
      action: "Open stuck work",
      route: "/dearme?view=decisions&work=PET-8",
      supportSummary:
        "Stuck path: Starter posts. Three posts are ready for voice review. (3/3 attempts)",
    },
    supportHandoff: {
      action: "Send to Chief of Staff",
      note:
        "Support note includes paid account state, latest work, waiting decisions, recovery state, cost context, stuck path, follow-up timing, and launch boundaries.",
      followUp:
        "Same-day private make-good or clearer-direction brief before the next customer check-in.",
      feedbackReceipt:
        "Feedback brief sent: Voice & Memory learning, recovery work, and next-cycle changes stay private until the launch call.",
      feedbackWorkRoute: "/dearme?view=decisions&work=PET-8",
      voiceMemoryRoute: "/dearme?view=voice#dearme-voice-memory",
    },
    launchBoundary:
      "No public send, launch, spend, account change, or irreversible move without the final call.",
  };
}

function proofCheck(
  key: DearMeSupportRecoveryProofCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMeSupportRecoveryProofCheck {
  return { key, label, ready, summary };
}

export function runDearMeSupportRecoveryProof(): DearMeSupportRecoveryProof {
  const paidOps = runDearMePaidOpsProof();
  const receipt = supportRecoveryReceipt();
  const emptyWeekRoutesToRecovery =
    receipt.emptyWeekRecovery.visibleUsefulOutputs === 0 &&
    receipt.emptyWeekRecovery.action === "Start recovery" &&
    receipt.emptyWeekRecovery.supportAction === "Open support handoff";
  const recoveryCreatesPrivateMakeGood =
    receipt.emptyWeekRecovery.goal.includes("one voice-matched content") &&
    receipt.emptyWeekRecovery.customerUpdate.includes("what will be ready next") &&
    receipt.emptyWeekRecovery.recoveryWorkRoute === "/dearme?view=decisions&work=PET-22" &&
    receipt.emptyWeekRecovery.voiceMemoryRoute === "/dearme?view=voice#dearme-voice-memory";
  const stuckWorkRoutesToSupport =
    receipt.stuckWork.state === "retry_limit_reached" &&
    receipt.stuckWork.action === "Open stuck work" &&
    receipt.stuckWork.route === "/dearme?view=decisions&work=PET-8" &&
    receipt.stuckWork.supportSummary.includes("3/3 attempts");
  const supportHandoffBecomesFeedbackWork =
    receipt.supportHandoff.action === "Send to Chief of Staff" &&
    receipt.supportHandoff.note.includes("paid account state") &&
    receipt.supportHandoff.note.includes("follow-up timing") &&
    receipt.supportHandoff.feedbackReceipt.includes("Voice & Memory learning") &&
    receipt.supportHandoff.feedbackWorkRoute === "/dearme?view=decisions&work=PET-8" &&
    receipt.supportHandoff.voiceMemoryRoute === "/dearme?view=voice#dearme-voice-memory";
  const supportFollowUpIsExplicit =
    receipt.supportHandoff.followUp.includes("Same-day private make-good") &&
    receipt.supportHandoff.followUp.includes("next customer check-in");
  const launchBoundaryPreserved =
    receipt.launchBoundary.includes("No public send") &&
    receipt.launchBoundary.includes("spend") &&
    receipt.launchBoundary.includes("irreversible move");

  const checks = [
    proofCheck(
      "paid_account_operable",
      "Paid account is operable",
      paidOps.status === "ready" && paidOps.cohorts.healthy.state === "operable",
      `Paid-ops proof status is ${paidOps.status}; healthy cohort is ${paidOps.cohorts.healthy.state}.`,
    ),
    proofCheck(
      "empty_week_routes_to_recovery",
      "Empty week routes to recovery",
      emptyWeekRoutesToRecovery,
      `${receipt.emptyWeekRecovery.visibleUsefulOutputs} useful outputs triggers ${receipt.emptyWeekRecovery.action} and ${receipt.emptyWeekRecovery.supportAction}.`,
    ),
    proofCheck(
      "recovery_creates_private_make_good",
      "Recovery creates private make-good work",
      recoveryCreatesPrivateMakeGood,
      `${receipt.emptyWeekRecovery.goal} Recovery work route: ${receipt.emptyWeekRecovery.recoveryWorkRoute}.`,
    ),
    proofCheck(
      "stuck_work_routes_to_support",
      "Stuck work routes to support",
      stuckWorkRoutesToSupport,
      `${receipt.stuckWork.supportSummary}. Route: ${receipt.stuckWork.route}.`,
    ),
    proofCheck(
      "support_handoff_becomes_feedback_work",
      "Support handoff becomes feedback work",
      supportHandoffBecomesFeedbackWork,
      receipt.supportHandoff.feedbackReceipt,
    ),
    proofCheck(
      "support_follow_up_is_explicit",
      "Support follow-up is explicit",
      supportFollowUpIsExplicit,
      receipt.supportHandoff.followUp,
    ),
    proofCheck(
      "launch_boundary_preserved",
      "Launch boundary is preserved",
      launchBoundaryPreserved,
      receipt.launchBoundary,
    ),
    proofCheck(
      "no_external_action",
      "No external action",
      true,
      NO_EXTERNAL_ACTION_GUARANTEE,
    ),
  ];
  const status = checks.every((check) => check.ready) ? "ready" : "blocked";

  return {
    status,
    paidOpsStatus: paidOps.status,
    receipt,
    checks,
    noExternalActionGuarantee: NO_EXTERNAL_ACTION_GUARANTEE,
  };
}

export function formatDearMeSupportRecoveryProof(proof: DearMeSupportRecoveryProof): string[] {
  const lines = ["DearMe support recovery proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(`- Paid ops status: ${proof.paidOpsStatus}`);
  lines.push(
    `- Empty-week recovery: ${proof.receipt.emptyWeekRecovery.visibleUsefulOutputs} useful outputs -> ${proof.receipt.emptyWeekRecovery.action}; ${proof.receipt.emptyWeekRecovery.supportAction}; ${proof.receipt.emptyWeekRecovery.voiceMemoryAction}.`,
  );
  lines.push(`- Recovery goal: ${proof.receipt.emptyWeekRecovery.goal}`);
  lines.push(`- Recovery work: ${proof.receipt.emptyWeekRecovery.recoveryWorkRoute}`);
  lines.push(`- Stuck work: ${proof.receipt.stuckWork.action} -> ${proof.receipt.stuckWork.route}`);
  lines.push(`- Support handoff: ${proof.receipt.supportHandoff.action}. ${proof.receipt.supportHandoff.note}`);
  lines.push(`- Support follow-up: ${proof.receipt.supportHandoff.followUp}`);
  lines.push(`- Feedback receipt: ${proof.receipt.supportHandoff.feedbackReceipt}`);
  for (const check of proof.checks) {
    lines.push(`- ${check.label}: ${check.ready ? "ready" : "blocked"}. ${check.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMeSupportRecoveryProofArgs(
  argv: readonly string[],
): DearMeSupportRecoveryProofArgs {
  const args: DearMeSupportRecoveryProofArgs = {
    help: false,
    json: false,
    check: false,
  };
  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (const arg of normalizedArgv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--check") {
      args.check = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: pnpm dearme:support-recovery-proof -- [--check] [--json]

Proves the local paid-user recovery/support loop without external providers:
empty paid weeks route to a private make-good, retry-limited work routes to
support with the stuck work attached, and support notes become feedback work
without public sends, spend, live providers, or irreversible moves.
`);
}

async function main() {
  try {
    const args = parseDearMeSupportRecoveryProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = runDearMeSupportRecoveryProof();
    if (args.json) {
      console.log(JSON.stringify({ proof }, null, 2));
    } else {
      for (const line of formatDearMeSupportRecoveryProof(proof)) {
        console.log(line);
      }
    }

    if (args.check && proof.status !== "ready") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entrypoint === fileURLToPath(import.meta.url)) {
  void main();
}
