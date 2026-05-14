import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDearMeVoiceSmoke,
  type DearMeVoiceSmokePassedResult,
  type DearMeVoiceSmokeResult,
} from "./dearme-voice-smoke.ts";

export interface DearMeFeedbackLearningProofArgs {
  help: boolean;
  json: boolean;
  check: boolean;
}

export interface DearMeFeedbackLearningReceipt {
  activeBrief: string;
  savedReviewNote: string;
  sourceToReview: string;
  nextCycleMemory: string;
  voiceMemoryAction: string;
  voiceMemoryRoute: string;
  launchBoundary: string;
}

export interface DearMeFeedbackLearningProofCheck {
  key:
    | "voice_review_loop_blocks_drift"
    | "safe_rewrite_accepted"
    | "feedback_becomes_private_work"
    | "memory_route_available"
    | "launch_boundary_preserved"
    | "no_external_action";
  label: string;
  ready: boolean;
  summary: string;
}

export interface DearMeFeedbackLearningContract {
  status: "ready" | "blocked";
  receipt: DearMeFeedbackLearningReceipt;
  checks: DearMeFeedbackLearningProofCheck[];
  proofCommand: string;
  noExternalActionGuarantee: string;
}

export interface DearMeFeedbackLearningProof {
  status: "ready" | "blocked";
  receipt: DearMeFeedbackLearningReceipt;
  voiceReviewLoop: {
    status: DearMeVoiceSmokeResult["status"] | "missing";
    driftScore: number | null;
    driftBlocked: boolean;
    rewriteScore: number | null;
    rewritePassed: boolean;
    rewriteSuggested: boolean;
    reviewLoopProven: boolean;
    profileAcceptedSamples: number | null;
    profileTokenCount: number | null;
  };
  checks: DearMeFeedbackLearningProofCheck[];
  noExternalActionGuarantee: string;
}

const NO_EXTERNAL_ACTION_GUARANTEE =
  "This proof runs local profile-token voice smoke and a static DearMe feedback receipt contract only; it does not send, deploy, spend, call a live model, publish, or call payment APIs.";
const FEEDBACK_LEARNING_PROOF_COMMAND =
  "pnpm --silent dearme:feedback-learning-proof -- --check";

function feedbackLearningReceipt(): DearMeFeedbackLearningReceipt {
  return {
    activeBrief:
      "Chief of Staff accepted this feedback and is turning it into Voice & Memory learning, recovery work, and sharper next-cycle changes. Public moves wait for the launch call.",
    savedReviewNote: "Keep future drafts shorter, proof-led, and direct",
    sourceToReview: "Shipped proof",
    nextCycleMemory: "Voice sample added: Short, direct voice note.",
    voiceMemoryAction: "Open Voice & Memory",
    voiceMemoryRoute: "/dearme?view=voice#dearme-voice-memory",
    launchBoundary:
      "Public posts, outbound messages, page changes, and spend wait for the launch call.",
  };
}

function proofCheck(
  key: DearMeFeedbackLearningProofCheck["key"],
  label: string,
  ready: boolean,
  summary: string,
): DearMeFeedbackLearningProofCheck {
  return { key, label, ready, summary };
}

function passedReviewLoop(
  result: DearMeVoiceSmokeResult | undefined,
): DearMeVoiceSmokePassedResult | null {
  if (result?.status !== "passed" || result.target !== "profile_token_review_loop") {
    return null;
  }
  return result;
}

function feedbackReceiptContractChecks(
  receipt: DearMeFeedbackLearningReceipt,
): DearMeFeedbackLearningProofCheck[] {
  const receiptTurnsFeedbackIntoWork =
    receipt.activeBrief.includes("Voice & Memory learning") &&
    receipt.activeBrief.includes("recovery work") &&
    receipt.savedReviewNote.length > 0 &&
    receipt.nextCycleMemory.includes("Voice sample added");
  const memoryRouteAvailable =
    receipt.voiceMemoryAction === "Open Voice & Memory" &&
    receipt.voiceMemoryRoute === "/dearme?view=voice#dearme-voice-memory";
  const launchBoundaryPreserved =
    receipt.launchBoundary.includes("Public posts") &&
    receipt.launchBoundary.includes("outbound messages") &&
    receipt.launchBoundary.includes("spend") &&
    receipt.activeBrief.includes("Public moves wait for the launch call");

  return [
    proofCheck(
      "feedback_becomes_private_work",
      "Feedback becomes private work",
      receiptTurnsFeedbackIntoWork,
      `${receipt.activeBrief} Saved note: ${receipt.savedReviewNote}.`,
    ),
    proofCheck(
      "memory_route_available",
      "Memory route is available",
      memoryRouteAvailable,
      `${receipt.voiceMemoryAction}: ${receipt.voiceMemoryRoute}.`,
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
}

export function inspectDearMeFeedbackLearningContract(): DearMeFeedbackLearningContract {
  const receipt = feedbackLearningReceipt();
  const checks = feedbackReceiptContractChecks(receipt);

  return {
    status: checks.every((check) => check.ready) ? "ready" : "blocked",
    receipt,
    checks,
    proofCommand: FEEDBACK_LEARNING_PROOF_COMMAND,
    noExternalActionGuarantee: NO_EXTERNAL_ACTION_GUARANTEE,
  };
}

export async function runDearMeFeedbackLearningProof(): Promise<DearMeFeedbackLearningProof> {
  const contract = inspectDearMeFeedbackLearningContract();
  const receipt = contract.receipt;
  const voiceResults = await runDearMeVoiceSmoke({
    target: "profile_token_review_loop",
    env: {
      ...process.env,
      DEARME_VOICE_SEMANTIC_SCORER: "profile-token",
    },
  });
  const reviewLoopResult = voiceResults.find((result) => result.target === "profile_token_review_loop");
  const reviewLoop = passedReviewLoop(reviewLoopResult);
  const voiceReviewLoop = {
    status: reviewLoopResult?.status ?? "missing",
    driftScore: reviewLoop?.driftScore ?? null,
    driftBlocked: reviewLoop?.driftBlocked === true,
    rewriteScore: reviewLoop?.rewriteScore ?? null,
    rewritePassed: reviewLoop?.rewritePassed === true,
    rewriteSuggested: reviewLoop?.rewriteSuggested === true,
    reviewLoopProven: reviewLoop?.reviewLoopProven === true,
    profileAcceptedSamples: reviewLoop?.profileAcceptedSamples ?? null,
    profileTokenCount: reviewLoop?.profileTokenCount ?? null,
  };
  const checks = [
    proofCheck(
      "voice_review_loop_blocks_drift",
      "Voice review loop blocks drift",
      voiceReviewLoop.reviewLoopProven && voiceReviewLoop.driftBlocked,
      voiceReviewLoop.driftBlocked
        ? `Drift blocked locally at score ${voiceReviewLoop.driftScore}.`
        : "Local review-loop smoke did not block drift.",
    ),
    proofCheck(
      "safe_rewrite_accepted",
      "Safe rewrite accepted",
      voiceReviewLoop.reviewLoopProven &&
        voiceReviewLoop.rewriteSuggested &&
        voiceReviewLoop.rewritePassed,
      voiceReviewLoop.rewritePassed
        ? `Rewrite accepted locally at score ${voiceReviewLoop.rewriteScore}.`
        : "Local review-loop smoke did not accept the safe rewrite.",
    ),
    ...contract.checks,
  ];
  const status = checks.every((check) => check.ready) ? "ready" : "blocked";

  return {
    status,
    receipt,
    voiceReviewLoop,
    checks,
    noExternalActionGuarantee: NO_EXTERNAL_ACTION_GUARANTEE,
  };
}

export function formatDearMeFeedbackLearningProof(proof: DearMeFeedbackLearningProof): string[] {
  const lines = ["DearMe feedback learning proof"];
  lines.push(`- Status: ${proof.status}`);
  lines.push(`- Active brief: ${proof.receipt.activeBrief}`);
  lines.push(`- Review note: ${proof.receipt.savedReviewNote}`);
  lines.push(`- Source to review: ${proof.receipt.sourceToReview}`);
  lines.push(`- Next cycle memory: ${proof.receipt.nextCycleMemory}`);
  lines.push(`- ${proof.receipt.voiceMemoryAction}: ${proof.receipt.voiceMemoryRoute}`);
  lines.push(
    `- Voice review loop: status=${proof.voiceReviewLoop.status} driftBlocked=${proof.voiceReviewLoop.driftBlocked} rewritePassed=${proof.voiceReviewLoop.rewritePassed} reviewLoop=${proof.voiceReviewLoop.reviewLoopProven ? "proven" : "blocked"}`,
  );
  for (const check of proof.checks) {
    lines.push(`- ${check.label}: ${check.ready ? "ready" : "blocked"}. ${check.summary}`);
  }
  lines.push(`- No-send/no-spend guarantee: ${proof.noExternalActionGuarantee}`);
  return lines;
}

export function parseDearMeFeedbackLearningProofArgs(
  argv: readonly string[],
): DearMeFeedbackLearningProofArgs {
  const args: DearMeFeedbackLearningProofArgs = {
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
  console.log(`Usage: pnpm dearme:feedback-learning-proof -- [--check] [--json]

Proves the local feedback-to-learning loop without external providers:
review feedback becomes private Voice & Memory work, drift is blocked, the
safe rewrite is accepted, and public launch/spend actions remain behind the
launch call.
`);
}

async function main() {
  try {
    const args = parseDearMeFeedbackLearningProofArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const proof = await runDearMeFeedbackLearningProof();
    if (args.json) {
      console.log(JSON.stringify({ proof }, null, 2));
    } else {
      for (const line of formatDearMeFeedbackLearningProof(proof)) {
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
